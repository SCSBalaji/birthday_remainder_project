const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const llmService = require('../services/llmService');

const router = express.Router();

// All chatbot routes require authentication
router.use(authenticateToken);

// POST /api/chatbot/chat - Main chat endpoint
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

    // Generate response using LLM
    const llmResponse = await llmService.generateResponse(message, userContext);
    
    if (llmResponse.success) {
      res.json({
        success: true,
        response: llmResponse.response,
        model: llmResponse.model,
        responseTime: llmResponse.responseTime,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: llmResponse.error,
        fallback: llmResponse.fallback
      });
    }

  } catch (error) {
    console.error('❌ [CHATBOT] Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      fallback: "I'm sorry, something went wrong. Please try again."
    });
  }
});

// GET /api/chatbot/health - Check LLM health
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await llmService.healthCheck();
    res.json(healthStatus);
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
      message: 'Model warmed up successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/chatbot/info - Get chatbot information
router.get('/info', (req, res) => {
  res.json({
    success: true,
    chatbot: {
      name: 'Birthday Buddy AI Assistant',
      model: 'llama3.2:3b',
      capabilities: [
        'Answer questions about Birthday Buddy features',
        'Help with application usage',
        'Explain technical functionality',
        'Provide birthday management guidance'
      ],
      version: '1.0.0',
      supportedCommands: [
        'What features does Birthday Buddy have?',
        'How do I add a birthday?',
        'How do email reminders work?',
        'What are the different relationship types?'
      ]
    }
  });
});

module.exports = router;