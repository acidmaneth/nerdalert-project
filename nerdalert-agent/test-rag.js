#!/usr/bin/env node

// Test script for RAG (Retrieval-Augmented Generation) capabilities
import axios from 'axios';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:80';
const SESSION_ID = `rag_test_${Date.now()}`;

async function testRAGCapabilities() {
  console.log('🧠 Testing RAG (Retrieval-Augmented Generation) Capabilities...\n');
  
  const testCases = [
    {
      query: "What's the latest Marvel movie release date?",
      description: "RAG knowledge base test - should use cached data",
      expectedBehavior: "Should provide accurate release date from knowledge base"
    },
    {
      query: "Tell me about the Fantastic Four movie coming in 2025",
      description: "RAG with future date validation",
      expectedBehavior: "Should validate 2025 date and provide current information"
    },
    {
      query: "What's the current status of Deadpool & Wolverine?",
      description: "RAG status verification test",
      expectedBehavior: "Should provide current status from knowledge base"
    },
    {
      query: "Is there any conflicting information about Marvel release dates?",
      description: "RAG conflict detection test",
      expectedBehavior: "Should detect and report any conflicts in knowledge base"
    },
    {
      query: "What's the most recent Star Wars news?",
      description: "RAG fallback to web search test",
      expectedBehavior: "Should fall back to web search for latest news"
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
      
      // Check for RAG-related indicators in response
      const responseText = response.data.text || '';
      const hasRAGIndicators = responseText.includes('knowledge base') || 
                              responseText.includes('verified') ||
                              responseText.includes('confidence') ||
                              responseText.includes('canon') ||
                              responseText.includes('HIGH') ||
                              responseText.includes('MEDIUM') ||
                              responseText.includes('LOW');
      
      console.log('RAG indicators present:', hasRAGIndicators ? '✅' : '❌');
      console.log('---\n');
      
    } catch (error) {
      console.log('❌ Test failed:', error.response?.data?.error || error.message);
      console.log('---\n');
    }
  }
  
  // Test knowledge base accuracy
  console.log('📚 Testing Knowledge Base Accuracy...');
  try {
    const accuracyResponse = await axios.post(`${AGENT_URL}/prompt-sync`, {
      messages: [{ 
        role: 'user', 
        content: "What's the exact release date of Deadpool & Wolverine and how confident are you in this information?" 
      }],
      sessionId: SESSION_ID
    });
    
    console.log('Accuracy test response length:', accuracyResponse.data.text?.length || 0);
    const hasConfidenceLevel = accuracyResponse.data.text?.includes('HIGH') || 
                              accuracyResponse.data.text?.includes('MEDIUM') ||
                              accuracyResponse.data.text?.includes('LOW');
    console.log('Confidence level mentioned:', hasConfidenceLevel ? '✅' : '❌');
    
  } catch (error) {
    console.log('Accuracy test failed:', error.response?.data?.error || error.message);
  }
  
  console.log('🎯 RAG testing complete!');
}

// Run the test if this script is executed directly
testRAGCapabilities().catch(console.error); 