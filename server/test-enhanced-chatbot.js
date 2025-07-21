const axios = require('axios');

// Test configuration
const API_BASE = 'http://localhost:5000/api/chatbot';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjIsImVtYWlsIjoiZ2lvZXBjMTFAZ21haWwuY29tIiwiaWF0IjoxNzUzMDgwNzg4LCJleHAiOjE3NTMxNjcxODh9.ze6BrWcl-PazhWuYVOBFw7Qwskx06-9svbwX59JqI6c';

const headers = {
  'Authorization': `Bearer ${TEST_TOKEN}`,
  'Content-Type': 'application/json'
};

async function testEnhancedChatbot() {
  console.log('🧪 Testing Enhanced Chatbot Integration...\n');
  
  const testCases = [
    {
      name: '🎤 Voice Command - Add Birthday',
      endpoint: '/chat',
      data: { message: "Add my friend Sarah's birthday on March 15th, 1990. She loves chocolate cake and books." },
      expectedIntent: 'birthday_operation'
    },
    {
      name: '📊 Smart Data Query',
      endpoint: '/chat', 
      data: { message: "How many birthdays do I have next month?" },
      expectedIntent: 'data_query'
    },
    {
      name: '🧠 Technical Help',
      endpoint: '/chat',
      data: { message: "How do email reminders work in Birthday Buddy?" },
      expectedIntent: 'technical_help'
    },
    {
      name: '🔍 Search Operation',
      endpoint: '/chat',
      data: { message: "Show me all family birthdays" },
      expectedIntent: 'birthday_operation'
    },
    {
      name: '📈 Analytics Endpoint',
      endpoint: '/analytics?type=stats',
      method: 'GET'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n${testCase.name}`);
    console.log('=' .repeat(50));
    
    try {
      let response;
      
      if (testCase.method === 'GET') {
        response = await axios.get(`${API_BASE}${testCase.endpoint}`, { headers });
      } else {
        response = await axios.post(`${API_BASE}${testCase.endpoint}`, testCase.data, { headers });
      }
      
      if (response.data.success) {
        console.log('✅ Status: SUCCESS');
        
        if (testCase.expectedIntent) {
          console.log(`🎯 Intent: ${response.data.intentType || 'Not specified'} (expected: ${testCase.expectedIntent})`);
        }
        
        if (response.data.operationResult) {
          console.log(`🔧 Operation: ${response.data.operationResult.operation}`);
          console.log(`📋 Data:`, response.data.operationResult.data);
        }
        
        if (response.data.queryResult) {
          console.log(`📊 Query Type: ${response.data.queryResult.queryType}`);
          console.log(`📈 Data Available: ${!!response.data.queryResult.data}`);
        }
        
        console.log(`💬 Response: ${response.data.response?.substring(0, 100)}...`);
        
      } else {
        console.log('❌ Status: FAILED');
        console.log(`Error: ${response.data.error}`);
      }
      
    } catch (error) {
      console.log('❌ Status: ERROR');
      console.log(`Error: ${error.message}`);
      if (error.response?.data) {
        console.log(`Details: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }
  }
  
  console.log('\n🎯 Testing Complete!');
}

testEnhancedChatbot().catch(console.error);