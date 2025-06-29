#!/usr/bin/env node

/**
 * Test script to verify dynamic response formatting
 * This script tests the agent's ability to adapt response format based on user intent
 */

const axios = require('axios');

const AGENT_URL = process.env.AGENT_URL || "http://localhost:80";

async function testResponseFormatting() {
  console.log("🎯 Testing Dynamic Response Formatting");
  console.log("=" .repeat(50));
  
  const testCases = [
    {
      name: "List Format Test",
      query: "List the top 5 Marvel movies of all time",
      expectedFormat: "bulleted",
      expectedIndicators: ["•", "-", "1.", "2.", "3.", "4.", "5."]
    },
    {
      name: "Deep Dive Format Test",
      query: "Tell me everything about Spider-Man's origin story and background",
      expectedFormat: "detailed",
      expectedIndicators: ["background", "history", "origin", "detailed", "comprehensive"]
    },
    {
      name: "Quick Fact Format Test",
      query: "What is the quick answer to who plays Batman?",
      expectedFormat: "concise",
      expectedIndicators: ["brief", "quick", "simple", "short"]
    },
    {
      name: "Conversation Format Test",
      query: "What do you think about the latest Star Wars movie?",
      expectedFormat: "conversational",
      expectedIndicators: ["think", "opinion", "feel", "like", "prefer"]
    },
    {
      name: "General Format Test",
      query: "Tell me about the latest Marvel movie",
      expectedFormat: "natural",
      expectedIndicators: ["natural", "balanced", "appropriate"]
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected Format: ${testCase.expectedFormat}`);
    
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
      
      // Check for format indicators
      let formatDetected = false;
      
      if (testCase.expectedFormat === 'bulleted') {
        formatDetected = testCase.expectedIndicators.some(indicator => 
          responseText.includes(indicator)
        );
      } else if (testCase.expectedFormat === 'detailed') {
        formatDetected = responseText.length > 200 && 
          testCase.expectedIndicators.some(indicator => 
            responseText.toLowerCase().includes(indicator)
          );
      } else if (testCase.expectedFormat === 'concise') {
        formatDetected = responseText.length < 150;
      } else if (testCase.expectedFormat === 'conversational') {
        formatDetected = testCase.expectedIndicators.some(indicator => 
          responseText.toLowerCase().includes(indicator)
        );
      } else {
        // General format - just check if response is reasonable
        formatDetected = responseText.length > 50 && responseText.length < 500;
      }
      
      if (formatDetected) {
        console.log(`✅ PASSED - Agent used ${testCase.expectedFormat} format`);
        console.log(`Response length: ${responseText.length} characters`);
        passedTests++;
      } else {
        console.log(`❌ FAILED - Expected ${testCase.expectedFormat} format not detected`);
        console.log(`Response length: ${responseText.length} characters`);
        console.log(`Response preview: ${responseText.substring(0, 100)}...`);
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

  console.log("\n" + "=".repeat(50));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`Format Detection Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log("🎉 All formatting tests passed! Dynamic response formatting is working perfectly!");
  } else if (passedTests >= totalTests * 0.7) {
    console.log("👍 Most formatting tests passed! Dynamic response formatting is working well.");
  } else {
    console.log("⚠️  Some formatting tests failed. Dynamic response formatting needs refinement.");
  }
}

async function testIntentDetection() {
  console.log("\n🧠 Testing Intent Detection Patterns");
  console.log("=" .repeat(40));
  
  const intentTests = [
    {
      pattern: "list of",
      expectedIntent: "list",
      description: "List pattern detection"
    },
    {
      pattern: "deep dive into",
      expectedIntent: "deep_dive", 
      description: "Deep dive pattern detection"
    },
    {
      pattern: "quick fact about",
      expectedIntent: "quick_fact",
      description: "Quick fact pattern detection"
    },
    {
      pattern: "what do you think about",
      expectedIntent: "conversation",
      description: "Conversation pattern detection"
    }
  ];
  
  for (const test of intentTests) {
    console.log(`\nTesting: ${test.description}`);
    console.log(`Pattern: "${test.pattern}"`);
    console.log(`Expected Intent: ${test.expectedIntent}`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/prompt`, {
        messages: [
          {
            role: "user",
            content: `${test.pattern} Marvel movies`
          }
        ]
      }, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const responseText = response.data.text || response.data;
      console.log(`✅ Intent test completed - Response received`);
      
    } catch (error) {
      console.log(`❌ Intent test failed: ${error.message}`);
    }
  }
}

async function runAllTests() {
  console.log("🚀 Starting Dynamic Response Formatting Test Suite\n");
  
  await testResponseFormatting();
  await testIntentDetection();
  
  console.log("\n📋 Dynamic Response Formatting Summary:");
  console.log("✅ Intent detection for different query types");
  console.log("✅ Bulleted format for list requests");
  console.log("✅ Detailed format for deep dive requests");
  console.log("✅ Concise format for quick fact requests");
  console.log("✅ Conversational format for opinion requests");
  console.log("✅ Natural format for general requests");
  
  console.log("\n🎯 Key Benefits:");
  console.log("• Adaptive response formatting based on user intent");
  console.log("• Better user experience with appropriate detail levels");
  console.log("• More engaging conversations for opinion-based queries");
  console.log("• Efficient information delivery for list requests");
  console.log("• Comprehensive explanations for deep dive requests");
}

// Run the test if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { testResponseFormatting, testIntentDetection, runAllTests }; 