const llmService = require('./services/llmService');

async function testLLM() {
  console.log('🧪 Testing LLM Service...');
  
  // Test health check
  console.log('\n1. Testing health check...');
  const health = await llmService.healthCheck();
  console.log('Health result:', {
    success: health.success,
    status: health.status,
    modelsCount: health.models?.length || 0,
    warmedUp: health.warmedUp
  });
  
  if (!health.success) {
    console.log('❌ Ollama not available. Make sure it\'s running.');
    return;
  }
  
  // Test quick response
  console.log('\n2. Testing quick response (this may take 30-60 seconds for first request)...');
  const quickTest = await llmService.quickTest();
  console.log('Quick test result:', {
    success: quickTest.success,
    hasResponse: !!quickTest.response,
    responseLength: quickTest.response?.length || 0,
    error: quickTest.error
  });
  
  if (quickTest.success) {
    console.log('✅ LLM Service is working correctly!');
    
    // Test a real question
    console.log('\n3. Testing real question...');
    const realTest = await llmService.generateResponse('What features does Birthday Buddy have?');
    console.log('Real test result:', {
      success: realTest.success,
      response: realTest.response?.substring(0, 100) + '...',
      model: realTest.model
    });
  }
}

testLLM().catch(console.error);