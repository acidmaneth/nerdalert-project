// Direct test of search functionality
import axios from 'axios';

const SERPER_API_KEY = '4d1982fb5c40dbd06aa445d490292575f60a8f91';

// Direct Serper search function
async function performSerperSearch(query) {
  try {
    console.log(`Searching for: ${query}`);
    const response = await axios.post('https://google.serper.dev/search', {
      q: query,
      num: 8,
      gl: 'us',
      hl: 'en',
      autocorrect: true,
      safe: 'active'
    }, {
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000,
    });
    
    return {
      success: true,
      results: response.data.organic || [],
      provider: 'serper'
    };
  } catch (error) {
    console.error(`Search failed for "${query}":`, error.message);
    return {
      success: false,
      results: [],
      provider: 'serper',
      error: error.message
    };
  }
}

// Test Marvel movie queries
async function testMarvelQueries() {
  console.log('\n=== Testing Marvel Movie Queries ===');
  
  const queries = [
    'Marvel Phase 6 confirmed movies 2025',
    'Fantastic Four movie 2025 cast',
    'Deadpool 3 release date 2025',
    'Avengers Doomsday movie 2025',
    'Marvel Studios latest announcements December 2025'
  ];
  
  let successCount = 0;
  
  for (const query of queries) {
    try {
      const result = await performSerperSearch(query);
      
      if (result.success && result.results.length > 0) {
        successCount++;
        console.log(`✓ "${query}" - ${result.results.length} results`);
        
        // Show first result
        const firstResult = result.results[0];
        console.log(`  Title: ${firstResult.title}`);
        console.log(`  Link: ${firstResult.link}`);
        console.log(`  Snippet: ${firstResult.snippet?.substring(0, 100)}...`);
      } else {
        console.log(`✗ "${query}" - No results`);
      }
    } catch (error) {
      console.error(`✗ "${query}" - Error: ${error.message}`);
    }
  }
  
  console.log(`\nMarvel queries success rate: ${successCount}/${queries.length}`);
  return successCount === queries.length;
}

// Test actor and cast queries
async function testActorQueries() {
  console.log('\n=== Testing Actor and Cast Queries ===');
  
  const queries = [
    'Ryan Reynolds Deadpool 3 cast',
    'Pedro Pascal Fantastic Four',
    'Hugh Jackman Wolverine 2025',
    'Tom Holland Spider-Man 2025'
  ];
  
  let successCount = 0;
  
  for (const query of queries) {
    try {
      const result = await performSerperSearch(query);
      
      if (result.success && result.results.length > 0) {
        successCount++;
        console.log(`✓ "${query}" - ${result.results.length} results`);
        
        // Check for official sources
        const hasOfficialSource = result.results.some(r => 
          r.link.includes('imdb.com') || 
          r.link.includes('marvel.com') || 
          r.link.includes('variety.com')
        );
        
        if (hasOfficialSource) {
          console.log(`  ✓ Found official sources`);
        } else {
          console.log(`  ⚠ No official sources found`);
        }
      } else {
        console.log(`✗ "${query}" - No results`);
      }
    } catch (error) {
      console.error(`✗ "${query}" - Error: ${error.message}`);
    }
  }
  
  console.log(`\nActor queries success rate: ${successCount}/${queries.length}`);
  return successCount === queries.length;
}

// Test latest news queries
async function testLatestNewsQueries() {
  console.log('\n=== Testing Latest News Queries ===');
  
  const queries = [
    'Marvel Studios latest news December 2025',
    'DC movies 2025 latest announcements',
    'Star Wars 2025 release schedule',
    'Disney movies 2025 confirmed'
  ];
  
  let successCount = 0;
  
  for (const query of queries) {
    try {
      const result = await performSerperSearch(query);
      
      if (result.success && result.results.length > 0) {
        successCount++;
        console.log(`✓ "${query}" - ${result.results.length} results`);
        
        // Check for recent content
        const hasRecentContent = result.results.some(r => 
          r.title.includes('2025') || 
          r.snippet.includes('2025') ||
          r.title.includes('latest') ||
          r.title.includes('new')
        );
        
        if (hasRecentContent) {
          console.log(`  ✓ Found recent content`);
        } else {
          console.log(`  ⚠ No recent content found`);
        }
      } else {
        console.log(`✗ "${query}" - No results`);
      }
    } catch (error) {
      console.error(`✗ "${query}" - Error: ${error.message}`);
    }
  }
  
  console.log(`\nLatest news queries success rate: ${successCount}/${queries.length}`);
  return successCount === queries.length;
}

// Test source quality
async function testSourceQuality() {
  console.log('\n=== Testing Source Quality ===');
  
  const query = 'Marvel movies 2025 confirmed release dates';
  const result = await performSerperSearch(query);
  
  if (!result.success || result.results.length === 0) {
    console.log('✗ No results to analyze');
    return false;
  }
  
  console.log(`Analyzing ${result.results.length} results for source quality...`);
  
  const sourceTypes = {
    official: 0,
    news: 0,
    wiki: 0,
    other: 0
  };
  
  result.results.forEach((r, index) => {
    const url = r.link.toLowerCase();
    
    if (url.includes('marvel.com') || url.includes('imdb.com') || url.includes('disney.com')) {
      sourceTypes.official++;
      console.log(`  ${index + 1}. ${r.title} (OFFICIAL)`);
    } else if (url.includes('variety.com') || url.includes('hollywoodreporter.com') || url.includes('deadline.com')) {
      sourceTypes.news++;
      console.log(`  ${index + 1}. ${r.title} (NEWS)`);
    } else if (url.includes('fandom.com') || url.includes('wikipedia.org')) {
      sourceTypes.wiki++;
      console.log(`  ${index + 1}. ${r.title} (WIKI)`);
    } else {
      sourceTypes.other++;
      console.log(`  ${index + 1}. ${r.title} (OTHER)`);
    }
  });
  
  console.log(`\nSource distribution:`);
  console.log(`  Official: ${sourceTypes.official}`);
  console.log(`  News: ${sourceTypes.news}`);
  console.log(`  Wiki: ${sourceTypes.wiki}`);
  console.log(`  Other: ${sourceTypes.other}`);
  
  const qualityScore = (sourceTypes.official * 3 + sourceTypes.news * 2 + sourceTypes.wiki * 1) / result.results.length;
  console.log(`\nQuality Score: ${qualityScore.toFixed(2)}/3.0`);
  
  return qualityScore >= 1.5;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Direct Search Tests...\n');
  
  const tests = [
    { name: 'Marvel Queries', func: testMarvelQueries },
    { name: 'Actor Queries', func: testActorQueries },
    { name: 'Latest News Queries', func: testLatestNewsQueries },
    { name: 'Source Quality', func: testSourceQuality }
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
    console.log('🎉 All tests passed! Serper search is working excellently.');
    console.log('✅ The enhanced search capabilities are ready for production use.');
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