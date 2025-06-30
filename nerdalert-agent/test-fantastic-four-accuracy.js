#!/usr/bin/env node

/**
 * Test Fantastic Four and Avengers: Doomsday Accuracy
 * 
 * This test script checks if the agent can provide accurate information about:
 * 1. Fantastic Four movie release date and cast
 * 2. Avengers: Doomsday movie release date and cast
 * 3. Latest Marvel announcements
 */

import axios from 'axios';

const AGENT_URL = 'http://localhost:80/prompt';

async function testFantasticFourAccuracy() {
  console.log('🧪 Testing Fantastic Four and Avengers: Doomsday Accuracy...\n');

  const testCases = [
    {
      name: 'Fantastic Four specific query',
      query: 'isnt there a new Fantastic Four movie coming out soon?',
      expectedKeywords: ['Fantastic Four', '2025', 'July', 'Pedro Pascal', 'confirmed']
    },
    {
      name: 'Avengers Doomsday query',
      query: 'Tell me about Avengers Doomsday',
      expectedKeywords: ['Avengers: Doomsday', '2026', 'May', 'Robert Downey Jr.', 'confirmed']
    },
    {
      name: 'Latest Marvel movies',
      query: 'Tell me about the latest Marvel movies',
      expectedKeywords: ['Fantastic Four', 'Avengers: Doomsday', 'confirmed', '2025', '2026']
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      const response = await axios.post(AGENT_URL, {
        messages: [
          {
            role: 'user',
            content: testCase.query
          }
        ],
        sessionId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        stream: false
      });

      // Handle the streaming response format
      let agentResponse = '';
      
      // Check if response.data is a string (streaming response)
      if (typeof response.data === 'string') {
        // Parse the streaming response
        const lines = response.data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                agentResponse += parsed.choices[0].delta.content;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      } else if (response.data.text) {
        agentResponse = response.data.text;
      } else if (response.data.response) {
        agentResponse = response.data.response;
      } else if (response.data.message) {
        agentResponse = response.data.message;
      } else if (response.data.content) {
        agentResponse = response.data.content;
      } else {
        agentResponse = 'No response found';
      }
      
      console.log(`\n🤖 Agent Response:`);
      console.log(agentResponse);
      
      // Check for expected keywords
      const responseLower = agentResponse.toLowerCase();
      const foundKeywords = testCase.expectedKeywords.filter(keyword => 
        responseLower.includes(keyword.toLowerCase())
      );
      
      console.log(`\n✅ Found Keywords: ${foundKeywords.join(', ')}`);
      console.log(`❌ Missing Keywords: ${testCase.expectedKeywords.filter(k => !foundKeywords.includes(k)).join(', ')}`);
      
      const accuracy = (foundKeywords.length / testCase.expectedKeywords.length) * 100;
      console.log(`📊 Accuracy: ${accuracy.toFixed(1)}%`);
      
      if (accuracy >= 80) {
        console.log('🎉 PASS: Agent provided accurate information!');
      } else {
        console.log('⚠️  PARTIAL: Agent missing some key information');
      }
      
    } catch (error) {
      console.error(`❌ Error testing "${testCase.name}":`, error.message);
    }
    
    console.log('\n' + '='.repeat(80));
  }
}

// Run the test
testFantasticFourAccuracy().catch(console.error); 