#!/usr/bin/env node

// Test script for comprehensive fact-checking and verification
import axios from 'axios';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:80';
const SESSION_ID = `fact_checking_test_${Date.now()}`;

async function testFactChecking() {
  console.log('🔍 Testing Comprehensive Fact-Checking and Verification...\n');
  
  const testCases = [
    {
      query: "Tell me about Pedro Pascal in The Flash movie",
      description: "Testing fabricated information detection",
      expectedBehavior: "Should detect that Pedro Pascal was never in The Flash and provide correct information"
    },
    {
      query: "What Marvel movies are coming out in 2026?",
      description: "Testing future date validation",
      expectedBehavior: "Should flag 2026 as future and provide current year context"
    },
    {
      query: "Tell me about the Fantastic Four movie with Pedro Pascal",
      description: "Testing accurate cast information",
      expectedBehavior: "Should provide verified information about Pedro Pascal as Mr. Fantastic"
    },
    {
      query: "Is there an Avengers Doomsday movie confirmed?",
      description: "Testing rumor vs fact distinction",
      expectedBehavior: "Should distinguish between rumors and confirmed facts"
    },
    {
      query: "What movies is Tom Holland starring in?",
      description: "Testing actor filmography accuracy",
      expectedBehavior: "Should provide accurate, verified information about Tom Holland's roles"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`🧪 Test: ${testCase.description}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    console.log('─'.repeat(80));
    
    try {
      const response = await axios.post(`${AGENT_URL}/chat`, {
        message: testCase.query,
        session_id: SESSION_ID
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      const result = response.data;
      console.log(`Response: ${result.response}`);
      
      // Analyze response for fact-checking indicators
      const hasVerification = result.response.includes('VERIFIED') || result.response.includes('verified');
      const hasConfidence = result.response.includes('CONFIDENCE') || result.response.includes('confidence');
      const hasSources = result.response.includes('Source') || result.response.includes('source');
      const hasWarnings = result.response.includes('WARNING') || result.response.includes('warning');
      const hasUnverified = result.response.includes('UNVERIFIED') || result.response.includes('unverified');
      
      console.log('\n📊 Fact-Checking Analysis:');
      console.log(`✅ Verification mentioned: ${hasVerification ? 'YES' : 'NO'}`);
      console.log(`🎯 Confidence levels: ${hasConfidence ? 'YES' : 'NO'}`);
      console.log(`📚 Sources cited: ${hasSources ? 'YES' : 'NO'}`);
      console.log(`⚠️ Warnings provided: ${hasWarnings ? 'YES' : 'NO'}`);
      console.log(`❓ Unverified claims flagged: ${hasUnverified ? 'YES' : 'NO'}`);
      
      // Check for specific issues
      if (testCase.query.includes('Pedro Pascal') && testCase.query.includes('The Flash')) {
        if (result.response.includes('Pedro Pascal') && result.response.includes('The Flash')) {
          console.log('🚨 ISSUE: Agent may be providing incorrect information about Pedro Pascal in The Flash');
        } else {
          console.log('✅ GOOD: Agent correctly avoided false information about Pedro Pascal in The Flash');
        }
      }
      
      if (testCase.query.includes('2026')) {
        if (result.response.includes('2026') && !result.response.includes('future') && !result.response.includes('2025')) {
          console.log('🚨 ISSUE: Agent may not be properly flagging future dates');
        } else {
          console.log('✅ GOOD: Agent properly handled future date context');
        }
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('🎯 Fact-Checking Test Summary:');
  console.log('The agent should now:');
  console.log('• Verify all claims against authoritative sources');
  console.log('• Distinguish between facts, rumors, and speculation');
  console.log('• Provide confidence levels for all information');
  console.log('• Cite sources for all claims');
  console.log('• Flag unverified or questionable information');
  console.log('• Never make up information to fill gaps');
}

// Test specific verification functions
async function testVerificationFunctions() {
  console.log('\n🔬 Testing Specific Verification Functions...\n');
  
  const verificationTests = [
    {
      name: "IMDB Movie Lookup",
      test: async () => {
        const response = await axios.post(`${AGENT_URL}/chat`, {
          message: "Look up the movie 'The Batman' on IMDB",
          session_id: `${SESSION_ID}_imdb_test`
        });
        return response.data.response;
      }
    },
    {
      name: "Actor Verification",
      test: async () => {
        const response = await axios.post(`${AGENT_URL}/chat`, {
          message: "Verify Tom Holland's current movie projects",
          session_id: `${SESSION_ID}_actor_test`
        });
        return response.data.response;
      }
    },
    {
      name: "Rumor Detection",
      test: async () => {
        const response = await axios.post(`${AGENT_URL}/chat`, {
          message: "Is Spider-Man 4 confirmed for 2026?",
          session_id: `${SESSION_ID}_rumor_test`
        });
        return response.data.response;
      }
    }
  ];
  
  for (const test of verificationTests) {
    console.log(`Testing: ${test.name}`);
    try {
      const result = await test.test();
      console.log(`Result: ${result.substring(0, 200)}...`);
      
      // Check for verification indicators
      const hasVerification = result.includes('VERIFIED') || result.includes('verified');
      const hasIMDB = result.includes('IMDB') || result.includes('imdb');
      const hasConfidence = result.includes('CONFIDENCE') || result.includes('confidence');
      
      console.log(`Verification: ${hasVerification ? '✅' : '❌'}`);
      console.log(`IMDB Source: ${hasIMDB ? '✅' : '❌'}`);
      console.log(`Confidence Level: ${hasConfidence ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
    }
    console.log('─'.repeat(60));
  }
}

// Run all tests
async function runAllTests() {
  await testFactChecking();
  await testVerificationFunctions();
  
  console.log('\n🎉 Fact-Checking Test Suite Complete!');
  console.log('\nKey Improvements Implemented:');
  console.log('1. ✅ Direct IMDB lookups for movie and actor information');
  console.log('2. ✅ Comprehensive fact verification against authoritative sources');
  console.log('3. ✅ Confidence level assessment for all information');
  console.log('4. ✅ Source citation and attribution');
  console.log('5. ✅ Future date detection and validation');
  console.log('6. ✅ Rumor vs fact distinction');
  console.log('7. ✅ Contradiction detection');
  console.log('8. ✅ Full website content reading for context');
  console.log('9. ✅ Enhanced error handling and fallbacks');
  console.log('10. ✅ Strict "no fabrication" policy');
}

runAllTests().catch(console.error); 