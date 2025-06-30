#!/usr/bin/env node

// Test script for enhanced date accuracy and cross-referencing
import axios from 'axios';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:80';
const SESSION_ID = `enhanced_date_test_${Date.now()}`;

async function testEnhancedDateAccuracy() {
  console.log('📅 Testing Enhanced Date Accuracy and Cross-Referencing...\n');
  
  const testCases = [
    {
      query: "What Marvel movies are coming out in 2026?",
      description: "Future date detection test",
      expectedBehavior: "Should flag 2026 as future and provide current year context"
    },
    {
      query: "Tell me about the Fantastic Four movie with Pedro Pascal",
      description: "Title-cast cross-reference test",
      expectedBehavior: "Should cross-reference title with cast information"
    },
    {
      query: "What's the latest on Captain America: Brave New World?",
      description: "Current status verification test",
      expectedBehavior: "Should search for current status and validate dates"
    },
    {
      query: "When is the next Star Wars movie coming out?",
      description: "Release date validation test",
      expectedBehavior: "Should validate release dates against current year"
    },
    {
      query: "What DC movies are scheduled for 2025?",
      description: "Current year validation test",
      expectedBehavior: "Should validate 2025 dates and provide current information"
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
      
      // Check for enhanced validation features
      const responseText = response.data.text || '';
      const hasCurrentYearContext = responseText.includes('2025') || 
                                   responseText.includes('current year') ||
                                   responseText.includes('CURRENT CONTEXT');
      const hasValidationWarnings = responseText.includes('VALIDATION WARNINGS') ||
                                   responseText.includes('FUTURE DATE WARNING') ||
                                   responseText.includes('⚠️');
      const hasConfidenceLevel = responseText.includes('CONFIDENCE:') ||
                                responseText.includes('confidence level');
      const hasCrossReference = responseText.includes('cross-reference') ||
                               responseText.includes('CROSS-REFERENCE');
      
      console.log('Current year context:', hasCurrentYearContext ? '✅' : '❌');
      console.log('Validation warnings:', hasValidationWarnings ? '✅' : '❌');
      console.log('Confidence levels:', hasConfidenceLevel ? '✅' : '❌');
      console.log('Cross-referencing:', hasCrossReference ? '✅' : '❌');
      
      // Check for specific validation patterns
      if (responseText.includes('2026') || responseText.includes('2027')) {
        console.log('⚠️  Future dates detected - should be flagged');
      }
      
      console.log('---\n');
      
    } catch (error) {
      console.log('❌ Test failed:', error.response?.data?.error || error.message);
      console.log('---\n');
    }
  }
  
  // Test specific validation scenarios
  console.log('🔍 Testing Specific Validation Scenarios...\n');
  
  const validationTests = [
    {
      query: "Is there a Spider-Man movie coming out in 2026?",
      description: "Future date flagging",
      expectedFlag: "Should flag 2026 as future date"
    },
    {
      query: "Who plays Batman in the 2025 movie?",
      description: "Cast-title validation",
      expectedFlag: "Should validate cast against movie title"
    },
    {
      query: "What's the release date for the new Avengers movie?",
      description: "Release date verification",
      expectedFlag: "Should verify release date against current year"
    }
  ];
  
  for (const test of validationTests) {
    console.log(`🔍 Validation Test: ${test.description}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.expectedFlag}`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/prompt-sync`, {
        messages: [{ role: 'user', content: test.query }],
        sessionId: SESSION_ID
      });
      
      const responseText = response.data.text || '';
      const hasWarnings = responseText.includes('WARNING') || 
                         responseText.includes('⚠️') ||
                         responseText.includes('validation');
      
      console.log('Validation warnings present:', hasWarnings ? '✅' : '❌');
      console.log('---\n');
      
    } catch (error) {
      console.log('❌ Validation test failed:', error.response?.data?.error || error.message);
      console.log('---\n');
    }
  }
  
  console.log('🎯 Enhanced date accuracy testing complete!');
  console.log('\n📊 Summary:');
  console.log('- Future date detection should flag dates beyond current year');
  console.log('- Cross-referencing should validate titles against cast information');
  console.log('- Confidence levels should be reported for all date information');
  console.log('- Validation warnings should appear for potentially incorrect information');
}

// Run the test
testEnhancedDateAccuracy().catch(console.error); 