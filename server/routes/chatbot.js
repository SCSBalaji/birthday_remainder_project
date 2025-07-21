const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const llmService = require('../services/llmService');
const BirthdayOperationService = require('../services/birthdayOperationService');
const DataQueryService = require('../services/dataQueryService');

const router = express.Router();

// All chatbot routes require authentication
router.use(authenticateToken);

// POST /api/chatbot/chat - Enhanced main chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    console.log(`💬 [CHATBOT] User ${req.user.userId} sent: ${message}`);
    
    // Get user context for personalized responses
    const [user] = await req.db.execute(
      'SELECT name, email FROM users WHERE id = ?',
      [req.user.userId]
    );
    
    const userContext = user[0] ? {
      userName: user[0].name,
      userEmail: user[0].email,
      userId: req.user.userId
    } : null;

    // 🎯 NEW: Analyze intent first
    const detectedIntent = await llmService.analyzeIntent(message);
    console.log(`🔍 [CHATBOT] Detected intent: ${detectedIntent}`);

    // Generate AI response with intent-specific prompting
    const llmResponse = await llmService.generateResponse(message, userContext, detectedIntent);
    
    if (!llmResponse.success) {
      return res.status(500).json({
        success: false,
        error: llmResponse.error,
        fallback: llmResponse.fallback
      });
    }

    let finalResponse = {
      success: true,
      response: llmResponse.response,
      model: llmResponse.model,
      intentType: detectedIntent,
      responseTime: llmResponse.responseTime,
      timestamp: new Date().toISOString()
    };

    // 🎯 NEW: Process intent-specific operations
    try {
      if (detectedIntent === 'birthday_operation') {
        console.log('🔧 [CHATBOT] Processing birthday operation...');
        
        const operationService = new BirthdayOperationService(req.db);
        const operationResult = await operationService.processOperation(llmResponse.response, req.user.userId);
        
        if (operationResult.success) {
          finalResponse.operationResult = operationResult;
          finalResponse.response = operationResult.message;
          finalResponse.actionPerformed = true;
          
          console.log(`✅ [CHATBOT] Operation successful: ${operationResult.operation}`);
        } else {
          finalResponse.operationResult = operationResult;
          finalResponse.response = `${operationResult.message}\n\nOriginal AI response: ${llmResponse.response}`;
          finalResponse.actionPerformed = false;
          
          console.log(`⚠️ [CHATBOT] Operation failed: ${operationResult.error}`);
        }
        
      } else if (detectedIntent === 'data_query') {
        console.log('📊 [CHATBOT] Processing data query...');
        
        const queryService = new DataQueryService(req.db);
        const queryResult = await queryService.processQuery(llmResponse.response, req.user.userId);
        
        if (queryResult.success) {
          finalResponse.queryResult = queryResult;
          finalResponse.response = queryResult.message;
          finalResponse.dataProvided = true;
          
          console.log(`✅ [CHATBOT] Query successful: ${queryResult.queryType}`);
        } else {
          finalResponse.queryResult = queryResult;
          finalResponse.response = `${queryResult.message}\n\nOriginal AI response: ${llmResponse.response}`;
          finalResponse.dataProvided = false;
          
          console.log(`⚠️ [CHATBOT] Query failed: ${queryResult.error}`);
        }
      }
      
      // For technical_help and general intents, use the AI response as-is
      
    } catch (operationError) {
      console.error('❌ [CHATBOT] Operation processing error:', operationError);
      // Don't fail the entire request, just use the AI response
      finalResponse.operationError = operationError.message;
    }

    res.json(finalResponse);

  } catch (error) {
    console.error('❌ [CHATBOT] Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      fallback: "I'm sorry, something went wrong. Please try again."
    });
  }
});

// POST /api/chatbot/birthday-operation - Specialized birthday operation endpoint
router.post('/birthday-operation', async (req, res) => {
  try {
    const { operation, name, date, relationship, bio } = req.body;
    
    console.log(`🔧 [CHATBOT] Direct birthday operation: ${operation}`);
    
    const operationService = new BirthdayOperationService(req.db);
    
    // Create a structured AI-like response for processing
    const structuredInput = `
OPERATION: ${operation.toUpperCase()}
NAME: ${name || ''}
DATE: ${date || ''}
RELATIONSHIP: ${relationship || ''}
DETAILS: ${bio || ''}
CONFIRMATION: Direct operation request
    `.trim();
    
    const result = await operationService.processOperation(structuredInput, req.user.userId);
    
    res.json({
      success: result.success,
      operation: result.operation,
      data: result.data,
      message: result.message,
      error: result.error
    });
    
  } catch (error) {
    console.error('❌ [CHATBOT] Birthday operation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to process birthday operation'
    });
  }
});

// GET /api/chatbot/analytics - Smart data analytics endpoint
router.get('/analytics', async (req, res) => {
  try {
    const { type = 'stats' } = req.query;
    
    console.log(`📊 [CHATBOT] Analytics request: ${type}`);
    
    const queryService = new DataQueryService(req.db);
    
    let result;
    switch (type) {
      case 'stats':
        result = await queryService.getBirthdayStats(req.user.userId);
        break;
      case 'upcoming':
        result = await queryService.getBirthdaysByMonth(req.user.userId);
        break;
      default:
        result = await queryService.getBirthdayStats(req.user.userId);
    }
    
    res.json({
      success: true,
      type: type,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ [CHATBOT] Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get analytics data'
    });
  }
});

// GET /api/chatbot/health - Check LLM health
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await llmService.healthCheck();
    res.json({
      ...healthStatus,
      services: {
        llm: healthStatus.status,
        birthdayOperations: 'Available',
        dataQueries: 'Available'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// POST /api/chatbot/warmup - Warm up the model
router.post('/warmup', async (req, res) => {
  try {
    console.log(`🔥 [CHATBOT] User ${req.user.userId} requested model warmup`);
    await llmService.warmUp();
    res.json({
      success: true,
      message: 'Model warmed up successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chatbot/info - Get enhanced chatbot information
router.get('/info', (req, res) => {
  res.json({
    success: true,
    chatbot: {
      name: 'Birthday Buddy AI Assistant',
      model: 'llama3.2:3b',
      version: '2.0.0', // Updated for Phase 4
      capabilities: [
        '🎤 Voice commands for birthday management',
        '📊 Smart data queries and analytics',
        '🧠 Enhanced project knowledge assistance',
        '🔧 Natural language CRUD operations',
        '📈 Real-time birthday statistics',
        '🎯 Intent-based response routing'
      ],
      supportedIntents: [
        'birthday_operation (ADD, EDIT, DELETE, SEARCH)',
        'data_query (STATISTICS, FILTER, ANALYSIS)',
        'technical_help (Feature explanations, troubleshooting)',
        'general (General assistance and questions)'
      ],
      supportedCommands: [
        '🎂 "Add Sarah\'s birthday on March 15th"',
        '📅 "How many birthdays do I have next month?"',
        '🔍 "Show me all family birthdays"',
        '❌ "Delete John\'s birthday"',
        '📊 "Give me birthday statistics"',
        '❓ "How do email reminders work?"'
      ]
    },
    services: {
      birthdayOperations: 'Enhanced CRUD with natural language',
      dataQueries: 'Smart analytics and insights',
      intentRecognition: 'AI-powered request classification'
    }
  });
});

module.exports = router;