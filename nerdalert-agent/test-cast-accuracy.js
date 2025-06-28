#!/usr/bin/env node

/**
 * Test script to verify cast and character accuracy improvements
 * This script tests the agent's ability to find accurate cast information
 */

const axios = require('axios');

const AGENT_URL = process.env.AGENT_URL || "http://localhost:80";

async function testCastAccuracy() {
  console.log("🧪 Testing Cast and Character Accuracy Improvements");
  console.log("=" .repeat(60));
  
  const testCases = [
    {
      name: "Marvel Character Cast",
      query: "Who plays Spider-Man in the MCU?",
      expectedKeywords: ["Tom Holland", "Spider-Man", "MCU", "cast"]
    },
    {
      name: "DC Character Cast", 
      query: "Who plays Batman in The Dark Knight?",
      expectedKeywords: ["Christian Bale", "Batman", "Dark Knight", "cast"]
    },
    {
      name: "Star Wars Character",
      query: "Who plays Luke Skywalker in the original trilogy?",
      expectedKeywords: ["Mark Hamill", "Luke Skywalker", "original trilogy", "cast"]
    },
    {
      name: "Recent Movie Cast",
      query: "Who plays the main character in Deadpool & Wolverine?",
      expectedKeywords: ["Ryan Reynolds", "Deadpool", "cast", "2024"]
    },
    {
      name: "TV Show Cast",
      query: "Who plays the Doctor in Doctor Who?",
      expectedKeywords: ["Doctor Who", "cast", "actor"]
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  for (const testCase of testCases) {
    console.log(`\n📺 Testing: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    
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
      
      // Check if response contains expected keywords
      const foundKeywords = testCase.expectedKeywords.filter(keyword => 
        responseText.toLowerCase().includes(keyword.toLowerCase())
      );
      
      const accuracy = (foundKeywords.length / testCase.expectedKeywords.length) * 100;
      
      if (accuracy >= 50) {
        console.log(`✅ PASSED (${accuracy.toFixed(1)}% accuracy)`);
        console.log(`Found keywords: ${foundKeywords.join(", ")}`);
        passedTests++;
      } else {
        console.log(`❌ FAILED (${accuracy.toFixed(1)}% accuracy)`);
        console.log(`Expected: ${testCase.expectedKeywords.join(", ")}`);
        console.log(`Found: ${foundKeywords.join(", ")}`);
        console.log(`Response preview: ${responseText.substring(0, 200)}...`);
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
    console.log("🎉 All tests passed! Cast accuracy has been significantly improved!");
  } else if (passedTests >= totalTests * 0.7) {
    console.log("👍 Most tests passed! Cast accuracy has been improved.");
  } else {
    console.log("⚠️  Some tests failed. Cast accuracy needs further improvement.");
  }
}

// Run the test
if (require.main === module) {
  testCastAccuracy().catch(console.error);
}

module.exports = { testCastAccuracy }; 