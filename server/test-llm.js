const llmService = require('./services/llmService');

async function testAdvancedLLM() {
  console.log('🧪 Testing Advanced LLM Service...');
  
  // Test different types of requests
  const testCases = [
    {
      input: "Add my friend Sarah's birthday on March 15th",
      expectedIntent: 'birthday_operation'
    },
    {
      input: "How many birthdays do I have next month?",
      expectedIntent: 'data_query'
    },
    {
      input: "How do email reminders work?",
      expectedIntent: 'technical_help'
    },
    {
      input: "What is Birthday Buddy?",
      expectedIntent: 'general'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Testing: "${testCase.input}"`);
    
    // Test intent recognition
    const detectedIntent = await llmService.analyzeIntent(testCase.input);
    console.log(`Intent detected: ${detectedIntent} (expected: ${testCase.expectedIntent})`);
    
    // Test response generation
    const response = await llmService.generateResponse(testCase.input, null, detectedIntent);
    
    if (response.success) {
      console.log(`✅ Response (${response.intentType}):`, response.response.substring(0, 150) + '...');
    } else {
      console.log(`❌ Error:`, response.error);
    }
  }
}

testAdvancedLLM().catch(console.error);