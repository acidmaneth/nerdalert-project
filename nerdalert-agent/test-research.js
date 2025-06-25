#!/usr/bin/env node

// Test script for enhanced research capabilities
import axios from 'axios';

async function testResearch() {
  console.log('🧪 Testing Enhanced Research Capabilities...\n');
  
  const testQueries = [
    {
      query: "Phineas and Ferb characters",
      type: "character",
      description: "Character research test"
    },
    {
      query: "Marvel Cinematic Universe timeline",
      type: "dates", 
      description: "Timeline research test"
    },
    {
      query: "Star Wars easter eggs",
      type: "trivia",
      description: "Trivia research test"
    }
  ];

  for (const test of testQueries) {
    console.log(`📋 Testing: ${test.description}`);
    console.log(`Query: "${test.query}" (${test.type})`);
    
    try {
      const response = await axios.post('http://localhost:80/prompt', {
        messages: [{
          role: "user",
          content: `Research ${test.query} using deep trivia search`
        }]
      });
      
      console.log('✅ Research test completed successfully');
      console.log('Response status:', response.status);
      console.log('---\n');
      
    } catch (error) {
      console.log('❌ Research test failed:', error.message);
      console.log('---\n');
    }
  }
  
  console.log('🎯 Research testing complete!');
}

// Run the test if this script is executed directly
testResearch().catch(console.error); 