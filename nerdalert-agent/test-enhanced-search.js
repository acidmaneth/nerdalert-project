import { performWebSearch, performEnhancedSearch, searchForMovieInfo, searchForActorInfo, searchForLatestNews, searchForWikiInfo } from './src/search-service.js';

async function testBasicSearch() {
  console.log('\n=== Testing Basic Search ===');
  
  try {
    const result = await performWebSearch('Marvel movies 2025');
    console.log(`Search provider: ${result.provider}`);
    console.log(`Success: ${result.success}`);
    console.log(`Results count: ${result.results.length}`);
    
    if (result.results.length > 0) {
      console.log('First result:');
      console.log(`  Title: ${result.results[0].title}`);
      console.log(`  Link: ${result.results[0].link}`);
      console.log(`  Snippet: ${result.results[0].snippet?.substring(0, 100)}...`);
    }
    
    return result.success;
  } catch (error) {
    console.error('Basic search test failed:', error);
    return false;
  }
}

async function testEnhancedSearch() {
  console.log('\n=== Testing Enhanced Search ===');
  
  try {
    const result = await performEnhancedSearch('Fantastic Four movie 2025', {
      maxResults: 5,
      requireOfficialSources: true
    });
    
    console.log(`Search provider: ${result.provider}`);
    console.log(`Success: ${result.success}`);
    console.log(`Quality score: ${result.qualityScore.toFixed(2)}`);
    console.log(`Source diversity: ${result.sourceDiversity.join(', ')}`);
    console.log(`Results count: ${result.results.length}`);
    
    if (result.results.length > 0) {
      console.log('Top result:');
      console.log(`  Title: ${result.results[0].title}`);
      console.log(`  Link: ${result.results[0].link}`);
      console.log(`  Source: ${result.results[0].source}`);
    }
    
    return result.success;
  } catch (error) {
    console.error('Enhanced search test failed:', error);
    return false;
  }
}

async function testSpecializedSearches() {
  console.log('\n=== Testing Specialized Searches ===');
  
  const tests = [
    {
      name: 'Movie Info Search',
      func: () => searchForMovieInfo('Deadpool 3'),
      description: 'Searching for Deadpool 3 movie information'
    },
    {
      name: 'Actor Info Search',
      func: () => searchForActorInfo('Ryan Reynolds'),
      description: 'Searching for Ryan Reynolds filmography'
    },
    {
      name: 'Latest News Search',
      func: () => searchForLatestNews('Marvel Studios'),
      description: 'Searching for latest Marvel Studios news'
    },
    {
      name: 'Wiki Info Search',
      func: () => searchForWikiInfo('Luke Skywalker', 'Star Wars'),
      description: 'Searching for Luke Skywalker wiki information'
    }
  ];
  
  let successCount = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n--- ${test.name} ---`);
      console.log(test.description);
      
      const result = await test.func();
      
      console.log(`Provider: ${result.provider}`);
      console.log(`Success: ${result.success}`);
      console.log(`Quality Score: ${result.qualityScore.toFixed(2)}`);
      console.log(`Results: ${result.results.length}`);
      
      if (result.success && result.results.length > 0) {
        successCount++;
        console.log(`✓ ${test.name} passed`);
      } else {
        console.log(`✗ ${test.name} failed - no results`);
      }
    } catch (error) {
      console.error(`✗ ${test.name} failed with error:`, error.message);
    }
  }
  
  console.log(`\nSpecialized search success rate: ${successCount}/${tests.length}`);
  return successCount === tests.length;
}

async function testFallbackBehavior() {
  console.log('\n=== Testing Fallback Behavior ===');
  
  // Test with a query that might trigger fallback
  const queries = [
    'very specific obscure movie title that might not exist 2025',
    'latest breaking news about fictional character',
    'obscure actor name with no recent movies'
  ];
  
  let fallbackUsed = 0;
  
  for (const query of queries) {
    try {
      console.log(`\nTesting query: "${query}"`);
      const result = await performWebSearch(query);
      
      console.log(`Provider used: ${result.provider}`);
      console.log(`Success: ${result.success}`);
      console.log(`Results: ${result.results.length}`);
      
      if (result.provider === 'serper' && result.success) {
        fallbackUsed++;
        console.log('✓ Fallback to Serper was used successfully');
      } else if (result.success) {
        console.log('✓ Primary search provider worked');
      } else {
        console.log('✗ Both providers failed');
      }
    } catch (error) {
      console.error(`Query failed:`, error.message);
    }
  }
  
  console.log(`\nFallback behavior test: ${fallbackUsed} fallbacks used`);
  return true;
}

async function testSearchQuality() {
  console.log('\n=== Testing Search Quality ===');
  
  const qualityTests = [
    {
      query: 'Marvel Phase 6 confirmed movies',
      expectedSources: ['marvel.com', 'imdb.com', 'variety.com'],
      description: 'Should find official Marvel sources'
    },
    {
      query: 'Ryan Reynolds Deadpool 3 cast',
      expectedSources: ['imdb.com', 'marvel.com'],
      description: 'Should find casting information'
    },
    {
      query: 'Star Wars 2025 release schedule',
      expectedSources: ['starwars.com', 'imdb.com'],
      description: 'Should find Star Wars official sources'
    }
  ];
  
  let qualityPassed = 0;
  
  for (const test of qualityTests) {
    try {
      console.log(`\n--- ${test.description} ---`);
      console.log(`Query: "${test.query}"`);
      
      const result = await performEnhancedSearch(test.query, {
        maxResults: 8,
        requireOfficialSources: false
      });
      
      console.log(`Quality Score: ${result.qualityScore.toFixed(2)}`);
      console.log(`Sources found: ${result.sourceDiversity.join(', ')}`);
      
      // Check if expected sources are found
      const foundExpectedSources = test.expectedSources.some(expected => 
        result.sourceDiversity.some(source => source.includes(expected))
      );
      
      if (foundExpectedSources && result.qualityScore > 5) {
        qualityPassed++;
        console.log('✓ Quality test passed');
      } else {
        console.log('✗ Quality test failed');
      }
    } catch (error) {
      console.error(`Quality test failed:`, error.message);
    }
  }
  
  console.log(`\nSearch quality test: ${qualityPassed}/${qualityTests.length} passed`);
  return qualityPassed === qualityTests.length;
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced Search Tests...\n');
  
  const tests = [
    { name: 'Basic Search', func: testBasicSearch },
    { name: 'Enhanced Search', func: testEnhancedSearch },
    { name: 'Specialized Searches', func: testSpecializedSearches },
    { name: 'Fallback Behavior', func: testFallbackBehavior },
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
    console.log('🎉 All tests passed! Enhanced search is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  return passedTests === tests.length;
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}

export { runAllTests }; 