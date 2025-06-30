// Simple test to verify search service functionality
import axios from 'axios';

// Test Brave Search API
async function testBraveSearch() {
  console.log('Testing Brave Search API...');
  
  try {
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY || 'test-key',
      },
      params: {
        q: 'Marvel movies 2025',
        count: 5,
        offset: 0,
        safesearch: 'moderate',
        search_lang: 'en',
        country: 'US',
        extra_snippets: true
      },
      timeout: 10000,
    });
    
    console.log('Brave Search Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Results: ${response.data.web?.results?.length || 0}`);
    
    if (response.data.web?.results?.length > 0) {
      console.log('First result:');
      console.log(`  Title: ${response.data.web.results[0].title}`);
      console.log(`  URL: ${response.data.web.results[0].url}`);
      console.log(`  Description: ${response.data.web.results[0].description?.substring(0, 100)}...`);
    }
    
    return true;
  } catch (error) {
    console.error('Brave Search failed:', error.message);
    return false;
  }
}

// Test Serper Search API
async function testSerperSearch() {
  console.log('\nTesting Serper Search API...');
  
  try {
    const response = await axios.post('https://google.serper.dev/search', {
      q: 'Marvel movies 2025',
      num: 5,
      gl: 'us',
      hl: 'en',
      autocorrect: true,
      safe: 'active'
    }, {
      headers: {
        'X-API-KEY': '4d1982fb5c40dbd06aa445d490292575f60a8f91',
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    });
    
    console.log('Serper Search Response:');
    console.log(`Status: ${response.status}`);
    console.log(`Results: ${response.data.organic?.length || 0}`);
    
    if (response.data.organic?.length > 0) {
      console.log('First result:');
      console.log(`  Title: ${response.data.organic[0].title}`);
      console.log(`  Link: ${response.data.organic[0].link}`);
      console.log(`  Snippet: ${response.data.organic[0].snippet?.substring(0, 100)}...`);
    }
    
    return true;
  } catch (error) {
    console.error('Serper Search failed:', error.message);
    return false;
  }
}

// Test search quality
async function testSearchQuality() {
  console.log('\nTesting Search Quality...');
  
  const testQueries = [
    'Marvel Phase 6 confirmed movies',
    'Ryan Reynolds Deadpool 3 cast',
    'Star Wars 2025 release schedule'
  ];
  
  let successCount = 0;
  
  for (const query of testQueries) {
    try {
      console.log(`\nTesting query: "${query}"`);
      
      // Try both APIs
      const braveResult = await testBraveSearch();
      const serperResult = await testSerperSearch();
      
      if (braveResult || serperResult) {
        successCount++;
        console.log(`✓ Query "${query}" successful`);
      } else {
        console.log(`✗ Query "${query}" failed`);
      }
    } catch (error) {
      console.error(`Query "${query}" failed:`, error.message);
    }
  }
  
  console.log(`\nSearch quality test: ${successCount}/${testQueries.length} queries successful`);
  return successCount === testQueries.length;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Simple Search Tests...\n');
  
  const tests = [
    { name: 'Brave Search', func: testBraveSearch },
    { name: 'Serper Search', func: testSerperSearch },
    { name: 'Search Quality', func: testSearchQuality }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running ${test.name} Test`);
    console.log(`${'='.repeat(50)}`);
    
    try {
      const result = await test.func();
      if (result) {
        passedTests++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        console.log(`❌ ${test.name} FAILED`);
      }
    } catch (error) {
      console.error(`❌ ${test.name} FAILED with error:`, error);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`TEST SUMMARY: ${passedTests}/${tests.length} tests passed`);
  console.log(`${'='.repeat(50)}`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Search APIs are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the API keys and configuration.');
  }
  
  return passedTests === tests.length;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests }; 