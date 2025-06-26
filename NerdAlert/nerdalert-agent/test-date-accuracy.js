#!/usr/bin/env node

// Test script for date accuracy and information verification
import axios from 'axios';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:80';
const SESSION_ID = `date_test_${Date.now()}`;

async function testDateAccuracy() {
  console.log('📅 Testing Date Accuracy and Information Verification...\n');
  
  const testCases = [
    {
      query: "When is the next Marvel movie coming out?",
      description: "Future date verification test",
      expectedBehavior: "Should provide current year context and verify release dates"
    },
    {
      query: "What was the latest Star Wars movie released?",
      description: "Recent date verification test", 
      expectedBehavior: "Should provide accurate recent release information"
    },
    {
      query: "Tell me about the current state of the MCU in 2025",
      description: "Current year context test",
      expectedBehavior: "Should recognize current year and provide relevant information"
    },
    {
      query: "What are the upcoming DC movies for 2024?",
      description: "Past year reference test",
      expectedBehavior: "Should flag if 2024 is in the past and provide current information"
    },
    {
      query: "When did the first Iron Man movie come out?",
      description: "Historical date test",
      expectedBehavior: "Should provide accurate historical information without confusion"
    }
  ];

  for (const testCase of testCases) {
    console.log(`🧪 Testing: ${testCase.description}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/prompt-sync`, {
        messages: [{ role: 'user', content: testCase.query }],
        sessionId: SESSION_ID
      });
      
      console.log('✅ Response received');
      console.log('Response length:', response.data.text?.length || 0);
      
      // Check for date-related keywords in response
      const responseText = response.data.text || '';
      const hasDateValidation = responseText.includes('DATE VALIDATION') || 
                               responseText.includes('FACT VERIFICATION') ||
                               responseText.includes('current year') ||
                               responseText.includes('2025');
      
      console.log('Date validation present:', hasDateValidation ? '✅' : '❌');
      console.log('---\n');
      
    } catch (error) {
      console.log('❌ Test failed:', error.response?.data?.error || error.message);
      console.log('---\n');
    }
  }
  
  // Test memory tracking
  console.log('🧠 Testing Memory Tracking...');
  try {
    const memoryResponse = await axios.get(`${AGENT_URL}/memory/${SESSION_ID}`);
    console.log('Memory contents:', memoryResponse.data);
  } catch (error) {
    console.log('Memory test failed:', error.response?.data?.error || error.message);
  }
  
  console.log('🎯 Date accuracy testing complete!');
}

// Run the test if this script is executed directly
testDateAccuracy().catch(console.error); 