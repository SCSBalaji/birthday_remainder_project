const axios = require('axios');

class LLMService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434/api/generate';
    this.model = 'llama3.2:3b';
    this.isWarmedUp = false;
  }

  async generateResponse(prompt, context = null, intentType = 'general') {
    try {
      const timeout = this.isWarmedUp ? 45000 : 75000;
      
      const payload = {
        model: this.model,
        prompt: this.buildPrompt(prompt, context, intentType),
        stream: false,
        options: {
          temperature: intentType === 'birthday_operation' ? 0.3 : 0.7, // Lower temp for precise operations
          num_predict: intentType === 'birthday_operation' ? 200 : 400,
          top_k: 40,
          top_p: 0.9
        }
      };

      console.log(`🤖 [LLM] Processing ${intentType} request:`, prompt.substring(0, 50) + '...');
      if (!this.isWarmedUp) {
        console.log('🔥 [LLM] Warming up model...');
      }
      
      const response = await axios.post(this.ollamaUrl, payload, {
        timeout: timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.response) {
        console.log('✅ [LLM] Response received successfully');
        this.isWarmedUp = true;
        return {
          success: true,
          response: response.data.response.trim(),
          model: this.model,
          intentType: intentType,
          responseTime: response.data.total_duration || 'unknown'
        };
      } else {
        throw new Error('Invalid response format from Ollama');
      }

    } catch (error) {
      console.error('❌ [LLM] Error:', error.message);
      
      let errorMessage = error.message;
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The AI is thinking hard - please try again.';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Cannot connect to Ollama. Please ensure Ollama is running.';
      }
      
      return {
        success: false,
        error: errorMessage,
        fallback: "I'm sorry, I'm having trouble processing your request right now. Please try again."
      };
    }
  }

  buildPrompt(userInput, context, intentType) {
    const baseContext = `You are Birthday Buddy AI, an intelligent assistant for a birthday reminder application.

BIRTHDAY BUDDY FEATURES:
- User registration/login with JWT authentication
- Birthday CRUD operations (Create, Read, Update, Delete)
- Advanced email reminder system (1, 3, 7, 14 days before birthdays)
- Smart scheduling based on relationships (family, friends, colleagues, partner, other)
- Email preferences with timezone support
- User dashboard with calendar view and statistics
- MySQL database with users, birthdays, email_reminders, user_email_preferences tables

CURRENT USER CONTEXT:
${context ? `- User: ${context.userName} (${context.userEmail})` : '- User: Not specified'}
- Current Date: 2025-07-21
- System Status: Fully operational`;

    switch (intentType) {
      case 'birthday_operation':
        return `${baseContext}

BIRTHDAY MANAGEMENT INSTRUCTIONS:
You are processing a birthday management request. Analyze the user's input and provide a structured response.

SUPPORTED OPERATIONS:
1. ADD: "Add [name]'s birthday on [date]" or "Create birthday for [name] born [date]"
2. EDIT: "Change [name]'s birthday to [date]" or "Update [name]'s information"
3. DELETE: "Remove [name]'s birthday" or "Delete [name] from birthdays"
4. SEARCH: "Show me [criteria]" or "Find birthdays for [relationship/month/etc]"

RESPONSE FORMAT:
For birthday operations, respond with:
OPERATION: [ADD/EDIT/DELETE/SEARCH]
NAME: [extracted name]
DATE: [extracted date in YYYY-MM-DD format if applicable]
RELATIONSHIP: [extracted relationship if mentioned]
DETAILS: [any additional info like bio/notes]
CONFIRMATION: [human-friendly confirmation message]

USER REQUEST: ${userInput}

Analyze and respond:`;

      case 'data_query':
        return `${baseContext}

DATA ANALYSIS INSTRUCTIONS:
You are processing a data query about birthdays. Provide insights and suggestions for database queries.

QUERY TYPES:
1. Statistics: "How many birthdays..." 
2. Filters: "Show birthdays in [month/relationship/date range]"
3. Analysis: "Who has birthdays next month?"
4. Comparisons: "Compare family vs friends birthdays"

RESPONSE FORMAT:
QUERY_TYPE: [STATISTICS/FILTER/ANALYSIS/COMPARISON]
SQL_CONCEPT: [describe what database query would be needed]
INSIGHTS: [provide analysis or insights]
SUGGESTIONS: [helpful recommendations]

USER QUERY: ${userInput}

Analyze and respond:`;

      case 'technical_help':
        return `${baseContext}

TECHNICAL ASSISTANCE INSTRUCTIONS:
You are helping with Birthday Buddy technical questions or feature explanations.

TOPICS YOU CAN HELP WITH:
1. Feature explanations (how reminders work, relationship types, etc.)
2. Troubleshooting (login issues, email problems, etc.)
3. Technical architecture (React frontend, Node.js backend, MySQL database)
4. Usage instructions (how to add birthdays, set preferences, etc.)

USER QUESTION: ${userInput}

Provide a helpful, detailed technical response:`;

      default:
        return `${baseContext}

You are a helpful assistant for Birthday Buddy. Answer questions about the app, help with features, or provide general assistance.

USER INPUT: ${userInput}

Provide a helpful response:`;
    }
  }

  // Intent recognition method
  async analyzeIntent(userInput) {
    const input = userInput.toLowerCase();
    
    // Birthday operation keywords
    const operationKeywords = [
      'add', 'create', 'new birthday', 'born on', 'birthday on',
      'delete', 'remove', 'edit', 'change', 'update', 'modify'
    ];
    
    // Data query keywords
    const queryKeywords = [
      'how many', 'show me', 'list', 'find', 'search', 'count',
      'who has', 'next month', 'this month', 'between', 'statistics'
    ];
    
    // Technical help keywords
    const technicalKeywords = [
      'how does', 'how to', 'explain', 'what is', 'trouble', 'problem',
      'feature', 'remind', 'notification', 'email', 'login', 'register'
    ];
    
    if (operationKeywords.some(keyword => input.includes(keyword))) {
      return 'birthday_operation';
    } else if (queryKeywords.some(keyword => input.includes(keyword))) {
      return 'data_query';
    } else if (technicalKeywords.some(keyword => input.includes(keyword))) {
      return 'technical_help';
    } else {
      return 'general';
    }
  }

  // Method to warm up the model
  async warmUp() {
    if (!this.isWarmedUp) {
      console.log('🔥 [LLM] Warming up model...');
      try {
        await this.generateResponse('Hello', null, 'general');
        console.log('✅ [LLM] Model warmed up successfully');
      } catch (error) {
        console.log('⚠️ [LLM] Warmup failed, but continuing...');
      }
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const response = await axios.get('http://localhost:11434/api/tags', {
        timeout: 5000
      });
      return {
        success: true,
        models: response.data.models || [],
        status: 'Ollama is running',
        warmedUp: this.isWarmedUp
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: 'Ollama is not available',
        warmedUp: false
      };
    }
  }

  // Quick test method
  async quickTest() {
    console.log('🧪 [LLM] Running quick test...');
    return await this.generateResponse('Hi', null, 'general');
  }
}

module.exports = new LLMService();