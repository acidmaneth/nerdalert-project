#!/usr/bin/env node

/**
 * Test Current Accuracy Issues
 * 
 * This test script checks for the specific accuracy problems identified:
 * 1. Outdated information about "Captain America: Brave New World" being in 2025
 * 2. "Latest" interpretation not including both recent and upcoming releases
 * 3. Fantastic Four having no official date when it actually does
 */

import axios from 'axios';

const AGENT_URL = 'http://localhost:80/prompt';

async function testCurrentAccuracy() {
  console.log('🧪 Testing Current Accuracy Issues...\n');

  const testCases = [
    {
      name: 'Latest Marvel Movies - Should include both recent and upcoming',
      query: 'Tell me about the latest Marvel movies',
      expectedIssues: [
        'Should not say Captain America: Brave New World is coming in 2025 (it was released in 2024)',
        'Should include Fantastic Four with actual release date',
        'Should include both recent releases and upcoming releases'
      ]
    },
    {
      name: 'Captain America: Brave New World Status',
      query: 'What is the current status of Captain America: Brave New World?',
      expectedIssues: [
        'Should say it was released in 2024, not coming in 2025',
        'Should provide actual release date and box office info'
      ]
    },
    {
      name: 'Fantastic Four Release Date',
      query: 'When is the Fantastic Four movie coming out?',
      expectedIssues: [
        'Should provide actual confirmed release date',
        'Should not say "no official date yet"'
      ]
    },
    {
      name: 'Current Year Awareness',
      query: 'What Marvel movies are coming out in 2025?',
      expectedIssues: [
        'Should be aware it is December 2025',
        'Should not mention movies already released in 2024 as "coming in 2025"'
      ]
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.name}`);
    console.log(`Query: "${testCase.query}"`);
    console.log('Expected Issues:');
    testCase.expectedIssues.forEach(issue => console.log(`  • ${issue}`));
    
    try {
      const response = await axios.post(AGENT_URL, {
        messages: [
          {
            role: 'user',
            content: testCase.query
          }
        ],
        sessionId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      console.log('\n🤖 Agent Response:');
      console.log(response.data);
      
      // Analyze response for issues
      const responseText = JSON.stringify(response.data).toLowerCase();
      
      console.log('\n🔍 Analysis:');
      
      // Check for specific issues
      if (responseText.includes('captain america: brave new world') && 
          responseText.includes('2025') && 
          !responseText.includes('2024')) {
        console.log('  ❌ ISSUE: Mentions Captain America: Brave New World in 2025 instead of 2024');
      }
      
      if (responseText.includes('fantastic four') && 
          (responseText.includes('no official date') || responseText.includes('no confirmed date'))) {
        console.log('  ❌ ISSUE: Says Fantastic Four has no official date when it should have one');
      }
      
      if (responseText.includes('latest') && 
          !responseText.includes('recent') && 
          !responseText.includes('upcoming') && 
          !responseText.includes('2024')) {
        console.log('  ❌ ISSUE: "Latest" interpretation may not include both recent and upcoming');
      }
      
      if (responseText.includes('2025') && 
          responseText.includes('coming out') && 
          !responseText.includes('december 2025')) {
        console.log('  ❌ ISSUE: May not be aware it is December 2025');
      }
      
      console.log('  ✅ Response received successfully');
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

async function testDateValidation() {
  console.log('📅 Testing Date Validation...\n');
  
  const currentDate = new Date();
  console.log(`Current Date: ${currentDate.toLocaleDateString()}`);
  console.log(`Current Year: ${currentDate.getFullYear()}`);
  console.log(`Current Month: ${currentDate.getMonth() + 1}`);
  
  // Test specific date validation
  const testDates = [
    { date: '2024', context: 'Captain America: Brave New World', shouldBePast: true },
    { date: '2025', context: 'Fantastic Four', shouldBePast: false },
    { date: '2026', context: 'Future Marvel movie', shouldBePast: false }
  ];
  
  for (const testDate of testDates) {
    const year = parseInt(testDate.date);
    const isPast = year < currentDate.getFullYear();
    const isCurrentYear = year === currentDate.getFullYear();
    
    console.log(`Date: ${testDate.date} (${testDate.context})`);
    console.log(`  Is Past: ${isPast}`);
    console.log(`  Is Current Year: ${isCurrentYear}`);
    console.log(`  Should Be Past: ${testDate.shouldBePast}`);
    
    if (isPast !== testDate.shouldBePast) {
      console.log(`  ❌ ISSUE: Date validation logic may be incorrect`);
    } else {
      console.log(`  ✅ Date validation correct`);
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting Current Accuracy Tests...\n');
  
  try {
    await testDateValidation();
    console.log('\n');
    await testCurrentAccuracy();
    
    console.log('✅ All tests completed!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testCurrentAccuracy, testDateValidation, runAllTests }; 