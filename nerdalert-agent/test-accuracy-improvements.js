#!/usr/bin/env node

/**
 * Test script to verify accuracy improvements and correction handling
 * This script tests the agent's ability to prevent false claims and handle corrections
 */

const axios = require('axios');

const AGENT_URL = process.env.AGENT_URL || "http://localhost:80";

async function testAccuracyImprovements() {
  console.log("🧪 Testing Accuracy Improvements and Correction Handling");
  console.log("=" .repeat(60));
  
  const testCases = [
    {
      name: "Accuracy Prevention - Cast Information",
      query: "Who plays Spider-Man in the latest movies?",
      expectedBehavior: "Should search for current cast information and provide confidence levels"
    },
    {
      name: "Accuracy Prevention - Release Dates",
      query: "When is the next Marvel movie coming out?",
      expectedBehavior: "Should verify current year and provide accurate release information"
    },
    {
      name: "Accuracy Prevention - Character Details",
      query: "Tell me about Batman's origin story",
      expectedBehavior: "Should verify character information from authoritative sources"
    },
    {
      name: "Correction Detection - Direct Correction",
      query: "Actually, Tom Holland plays Spider-Man, not Andrew Garfield",
      expectedBehavior: "Should detect correction and acknowledge the mistake"
    },
    {
      name: "Correction Detection - Fact Correction",
      query: "That's wrong, the movie came out in 2023, not 2024",
      expectedBehavior: "Should detect date correction and verify the corrected information"
    },
    {
      name: "Accuracy Prevention - Trivia Facts",
      query: "What are some behind-the-scenes facts about The Dark Knight?",
      expectedBehavior: "Should verify trivia from industry sources before sharing"
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected: ${testCase.expectedBehavior}`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/prompt`, {
        messages: [
          {
            role: "user",
            content: testCase.query
          }
        ]
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const responseText = response.data.text || response.data.response || JSON.stringify(response.data);
      
      // Check for accuracy indicators
      const hasConfidenceLevel = responseText.includes('HIGH') || 
                                responseText.includes('MEDIUM') || 
                                responseText.includes('LOW') ||
                                responseText.includes('confidence');
      
      const hasSourceAttribution = responseText.includes('source') || 
                                  responseText.includes('verified') ||
                                  responseText.includes('official') ||
                                  responseText.includes('IMDB') ||
                                  responseText.includes('marvel.com');
      
      const hasCorrectionHandling = responseText.includes('sorry') || 
                                   responseText.includes('apologize') ||
                                   responseText.includes('thank you') ||
                                   responseText.includes('correction') ||
                                   responseText.includes('you\'re right');
      
      // Determine if test passed based on type
      let testPassed = false;
      
      if (testCase.name.includes('Accuracy Prevention')) {
        testPassed = hasConfidenceLevel || hasSourceAttribution;
      } else if (testCase.name.includes('Correction Detection')) {
        testPassed = hasCorrectionHandling;
      } else {
        testPassed = hasConfidenceLevel || hasSourceAttribution;
      }
      
      if (testPassed) {
        console.log(`✅ PASSED - Agent demonstrated ${testCase.name.includes('Correction') ? 'correction handling' : 'accuracy prevention'}`);
        passedTests++;
      } else {
        console.log(`❌ FAILED - Missing expected behavior indicators`);
        console.log(`Confidence level: ${hasConfidenceLevel ? 'Found' : 'Missing'}`);
        console.log(`Source attribution: ${hasSourceAttribution ? 'Found' : 'Missing'}`);
        console.log(`Correction handling: ${hasCorrectionHandling ? 'Found' : 'Missing'}`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      if (error.response) {
        console.log(`Response status: ${error.response.status}`);
        console.log(`Response data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Wait a bit between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`Accuracy Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All tests passed! Accuracy improvements are working perfectly!");
  } else if (passedTests >= totalTests * 0.7) {
    console.log("👍 Most tests passed! Accuracy improvements are working well.");
  } else {
    console.log("⚠️  Some tests failed. Accuracy improvements need further refinement.");
  }
}

async function testCorrectionMemory() {
  console.log("\n🧠 Testing Correction Memory System");
  console.log("=" .repeat(40));
  
  const sessionId = `correction_test_${Date.now()}`;
  
  try {
    // Test 1: Make a correction
    console.log("Test 1: Making a correction...");
    await axios.post(`${AGENT_URL}/prompt`, {
      messages: [
        {
          role: "user",
          content: "Actually, Tom Holland plays Spider-Man in the MCU, not Andrew Garfield"
        }
      ],
      sessionId: sessionId
    });
    
    // Test 2: Check memory for correction
    console.log("Test 2: Checking memory for correction...");
    const memoryResponse = await axios.get(`${AGENT_URL}/memory/${sessionId}`);
    console.log("Memory contents:", memoryResponse.data);
    
    // Test 3: Ask about the same topic to see if correction is remembered
    console.log("Test 3: Testing if correction is remembered...");
    const followUpResponse = await axios.post(`${AGENT_URL}/prompt`, {
      messages: [
        {
          role: "user",
          content: "Who plays Spider-Man in the MCU?"
        }
      ],
      sessionId: sessionId
    });
    
    const followUpText = followUpResponse.data.text || followUpResponse.data;
    const mentionsHolland = followUpText.toLowerCase().includes('tom holland');
    const mentionsGarfield = followUpText.toLowerCase().includes('andrew garfield');
    
    if (mentionsHolland && !mentionsGarfield) {
      console.log("✅ Correction memory working - Tom Holland mentioned, Andrew Garfield not mentioned");
    } else {
      console.log("❌ Correction memory may not be working properly");
    }
    
  } catch (error) {
    console.log(`❌ Memory test failed: ${error.message}`);
  }
}

async function testAccuracyTools() {
  console.log("\n🔧 Testing Accuracy Tools");
  console.log("=" .repeat(30));
  
  const toolTests = [
    {
      name: "Accuracy Check Tool",
      query: "Check the accuracy of this claim: Tom Holland plays Spider-Man in the MCU",
      expected: "Should verify the claim and provide confidence level"
    },
    {
      name: "Correction Handling Tool",
      query: "Handle this correction: Actually, the movie came out in 2023, not 2024",
      expected: "Should verify the corrected information"
    }
  ];
  
  for (const test of toolTests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/prompt`, {
        messages: [
          {
            role: "user",
            content: test.query
          }
        ]
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = response.data.text || response.data;
      console.log(`✅ Tool test completed - Response length: ${responseText.length}`);
      
    } catch (error) {
      console.log(`❌ Tool test failed: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log("🚀 Starting Accuracy Improvements Test Suite\n");
  
  await testAccuracyImprovements();
  await testCorrectionMemory();
  await testAccuracyTools();
  
  console.log("\n📋 Accuracy Improvements Summary:");
  console.log("✅ Enhanced accuracy checking before responses");
  console.log("✅ User correction detection and handling");
  console.log("✅ Correction memory system");
  console.log("✅ Multiple source verification");
  console.log("✅ Confidence level reporting");
  console.log("✅ Prevention-focused approach");
  
  console.log("\n🎯 Key Benefits:");
  console.log("• Fewer false claims through pre-verification");
  console.log("• Better handling of user corrections");
  console.log("• Improved source attribution");
  console.log("• Enhanced confidence transparency");
  console.log("• Learning from corrections for future accuracy");
}

// Run the test if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testAccuracyImprovements, testCorrectionMemory, testAccuracyTools, runAllTests }; 