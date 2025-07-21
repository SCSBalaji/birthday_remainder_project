const axios = require('axios');

class LLMService {
  constructor() {
    this.ollamaUrl = 'http://localhost:11434/api/generate';
    this.model = 'llama3.2:3b';
    this.isWarmedUp = false;
  }

  async generateResponse(prompt, context = null) {
    try {
      // If this is the first request, use longer timeout for model warmup
      const timeout = this.isWarmedUp ? 30000 : 60000;
      
      const payload = {
        model: this.model,
        prompt: this.buildPrompt(prompt, context),
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 300, // Limit response length for faster generation
          top_k: 40,
          top_p: 0.9
        }
      };

      console.log('🤖 [LLM] Sending request to Ollama:', prompt.substring(0, 50) + '...');
      if (!this.isWarmedUp) {
        console.log('🔥 [LLM] Warming up model (first request may take longer)...');
      }
      
      const response = await axios.post(this.ollamaUrl, payload, {
        timeout: timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.response) {
        console.log('✅ [LLM] Response received successfully');
        this.isWarmedUp = true; // Mark as warmed up after first successful request
        return {
          success: true,
          response: response.data.response.trim(),
          model: this.model,
          responseTime: response.data.total_duration || 'unknown'
        };
      } else {
        throw new Error('Invalid response format from Ollama');
      }

    } catch (error) {
      console.error('❌ [LLM] Error:', error.message);
      
      // Provide more specific error messages
      let errorMessage = error.message;
      if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. The model might be loading - please try again.';
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

  buildPrompt(userInput, context) {
    // Simplified, more focused prompt for better performance
    const systemPrompt = `You are Birthday Buddy AI, an assistant for a birthday reminder app.

Birthday Buddy helps users:
- Manage birthdays (add, edit, delete)
- Set email reminders (1, 3, 7, 14 days before)
- Organize by relationships (family, friends, colleagues)
- Smart scheduling and notifications

Question: ${userInput}

Provide a helpful, concise answer about Birthday Buddy features or usage.`;

    return systemPrompt;
  }

  // Method to warm up the model
  async warmUp() {
    if (!this.isWarmedUp) {
      console.log('🔥 [LLM] Warming up model...');
      try {
        await this.generateResponse('Hello');
        console.log('✅ [LLM] Model warmed up successfully');
      } catch (error) {
        console.log('⚠️ [LLM] Warmup failed, but continuing...');
      }
    }
  }

  // Method to check if Ollama is available
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
    return await this.generateResponse('Hi');
  }
}

module.exports = new LLMService();