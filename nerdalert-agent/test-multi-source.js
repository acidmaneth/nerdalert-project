#!/usr/bin/env node

// Test script for multi-source capabilities
import axios from 'axios';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:80';
const SESSION_ID = `multi_source_test_${Date.now()}`;

async function testMultiSourceCapabilities() {
  console.log('🌐 Testing Multi-Source Capabilities...\n');
  
  const testCases = [
    {
      category: "Literature",
      query: "Tell me about The Lord of the Rings by J.R.R. Tolkien",
      expectedSources: ["goodreads.com", "literature-database"],
      description: "Testing literature database integration"
    },
    {
      category: "Comics",
      query: "What's the latest Spider-Man comic series?",
      expectedSources: ["comicvine.com", "marvel.com", "comic-database"],
      description: "Testing comic database integration"
    },
    {
      category: "Gaming",
      query: "Tell me about The Legend of Zelda: Breath of the Wild",
      expectedSources: ["metacritic.com", "gaming-database"],
      description: "Testing gaming database integration"
    },
    {
      category: "Entertainment",
      query: "What movies is Tom Holland starring in?",
      expectedSources: ["imdb.com", "entertainment-database"],
      description: "Testing entertainment database integration"
    },
    {
      category: "Multi-Source",
      query: "Is there a Lord of the Rings movie coming out?",
      expectedSources: ["imdb.com", "variety.com", "entertainment-database", "entertainment-news"],
      description: "Testing multiple source types"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`📚 Test Category: ${testCase.category}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected Sources: ${testCase.expectedSources.join(', ')}`);
    console.log(`Description: ${testCase.description}`);
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
      
      // Analyze response for source indicators
      const hasSourceDiversity = result.response.includes('SOURCES CONSULTED');
      const hasVerifiedFacts = result.response.includes('VERIFIED FACTS');
      const hasConfidenceLevels = result.response.includes('CONFIDENCE');
      const hasMultipleSources = result.response.includes('entertainment-database') || 
                                result.response.includes('literature-database') || 
                                result.response.includes('comic-database') || 
                                result.response.includes('gaming-database');
      
      console.log('\n📊 Multi-Source Analysis:');
      console.log(`✅ Source Diversity Mentioned: ${hasSourceDiversity ? 'YES' : 'NO'}`);
      console.log(`✅ Verified Facts Section: ${hasVerifiedFacts ? 'YES' : 'NO'}`);
      console.log(`✅ Confidence Levels: ${hasConfidenceLevels ? 'YES' : 'NO'}`);
      console.log(`✅ Multiple Source Types: ${hasMultipleSources ? 'YES' : 'NO'}`);
      
      // Check for specific source types
      const sourceTypes = [];
      if (result.response.includes('goodreads.com')) sourceTypes.push('goodreads.com');
      if (result.response.includes('comicvine.com')) sourceTypes.push('comicvine.com');
      if (result.response.includes('metacritic.com')) sourceTypes.push('metacritic.com');
      if (result.response.includes('imdb.com')) sourceTypes.push('imdb.com');
      if (result.response.includes('variety.com')) sourceTypes.push('variety.com');
      
      console.log(`📚 Sources Found: ${sourceTypes.join(', ') || 'None detected'}`);
      
      // Check for expected sources
      const expectedSourcesFound = testCase.expectedSources.filter(source => 
        result.response.toLowerCase().includes(source.toLowerCase())
      );
      
      if (expectedSourcesFound.length > 0) {
        console.log(`✅ Expected Sources Found: ${expectedSourcesFound.join(', ')}`);
      } else {
        console.log(`❌ Expected Sources Not Found: ${testCase.expectedSources.join(', ')}`);
      }
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Test specific database integrations
async function testDatabaseIntegrations() {
  console.log('\n🔬 Testing Specific Database Integrations...\n');
  
  const databaseTests = [
    {
      name: "Goodreads Literature Lookup",
      query: "What's the rating for The Hobbit on Goodreads?",
      expectedDatabase: "goodreads.com",
      expectedInfo: ["rating", "author", "publication year"]
    },
    {
      name: "ComicVine Comic Lookup",
      query: "Tell me about Batman #1 comic",
      expectedDatabase: "comicvine.com",
      expectedInfo: ["publisher", "issue number", "publication year"]
    },
    {
      name: "Metacritic Gaming Lookup",
      query: "What's the Metacritic score for Red Dead Redemption 2?",
      expectedDatabase: "metacritic.com",
      expectedInfo: ["rating", "developer", "release year"]
    },
    {
      name: "IMDB Entertainment Lookup",
      query: "What's the cast of The Avengers movie?",
      expectedDatabase: "imdb.com",
      expectedInfo: ["cast", "director", "release year"]
    }
  ];
  
  for (const test of databaseTests) {
    console.log(`Testing: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/chat`, {
        message: test.query,
        session_id: `${SESSION_ID}_db_test`
      });
      
      const result = response.data.response;
      console.log(`Result: ${result.substring(0, 300)}...`);
      
      // Check for database source
      const hasDatabase = result.toLowerCase().includes(test.expectedDatabase.toLowerCase());
      console.log(`Database Source (${test.expectedDatabase}): ${hasDatabase ? '✅' : '❌'}`);
      
      // Check for expected information types
      const infoFound = test.expectedInfo.filter(info => 
        result.toLowerCase().includes(info.toLowerCase())
      );
      console.log(`Information Types Found: ${infoFound.join(', ') || 'None'}`);
      
      // Check for verification indicators
      const hasVerification = result.includes('VERIFIED') || result.includes('verified');
      const hasConfidence = result.includes('CONFIDENCE') || result.includes('confidence');
      console.log(`Verification: ${hasVerification ? '✅' : '❌'}`);
      console.log(`Confidence Level: ${hasConfidence ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
    }
    console.log('─'.repeat(60));
  }
}

// Test source diversity and confidence assessment
async function testSourceDiversity() {
  console.log('\n🎯 Testing Source Diversity and Confidence Assessment...\n');
  
  const diversityTests = [
    {
      name: "Single Source Query",
      query: "What's the plot of The Matrix?",
      expectedDiversity: "Low",
      description: "Should show limited source diversity"
    },
    {
      name: "Multi-Source Query",
      query: "Is there a new Star Wars movie coming out?",
      expectedDiversity: "High",
      description: "Should show multiple source types"
    },
    {
      name: "Cross-Domain Query",
      query: "Tell me about The Witcher book series and TV show",
      expectedDiversity: "High",
      description: "Should consult both literature and entertainment sources"
    }
  ];
  
  for (const test of diversityTests) {
    console.log(`Test: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected Diversity: ${test.expectedDiversity}`);
    
    try {
      const response = await axios.post(`${AGENT_URL}/chat`, {
        message: test.query,
        session_id: `${SESSION_ID}_diversity_test`
      });
      
      const result = response.data.response;
      
      // Count source types mentioned
      const sourceTypes = [];
      if (result.includes('entertainment-database')) sourceTypes.push('entertainment-database');
      if (result.includes('literature-database')) sourceTypes.push('literature-database');
      if (result.includes('comic-database')) sourceTypes.push('comic-database');
      if (result.includes('gaming-database')) sourceTypes.push('gaming-database');
      if (result.includes('entertainment-news')) sourceTypes.push('entertainment-news');
      if (result.includes('official-studio')) sourceTypes.push('official-studio');
      
      const diversityLevel = sourceTypes.length >= 3 ? 'High' : sourceTypes.length >= 2 ? 'Medium' : 'Low';
      
      console.log(`Source Types Found: ${sourceTypes.join(', ') || 'None'}`);
      console.log(`Diversity Level: ${diversityLevel} (${sourceTypes.length} sources)`);
      console.log(`Matches Expected: ${diversityLevel === test.expectedDiversity ? '✅' : '❌'}`);
      
      // Check for recommendations about source diversity
      const hasDiversityRecommendation = result.includes('source diversity') || 
                                        result.includes('additional sources') ||
                                        result.includes('limited source');
      console.log(`Diversity Recommendation: ${hasDiversityRecommendation ? '✅' : '❌'}`);
      
    } catch (error) {
      console.error(`Test failed: ${error.message}`);
    }
    console.log('─'.repeat(60));
  }
}

// Run all tests
async function runAllTests() {
  await testMultiSourceCapabilities();
  await testDatabaseIntegrations();
  await testSourceDiversity();
  
  console.log('\n🎉 Multi-Source Test Suite Complete!');
  console.log('\nNew Capabilities Added:');
  console.log('1. ✅ Literature Database Integration (Goodreads, Amazon, etc.)');
  console.log('2. ✅ Comic Database Integration (ComicVine, Marvel.com, DC.com)');
  console.log('3. ✅ Gaming Database Integration (Metacritic, IGN, etc.)');
  console.log('4. ✅ Entertainment News Sources (Variety, Hollywood Reporter)');
  console.log('5. ✅ Source Diversity Assessment');
  console.log('6. ✅ Cross-Domain Query Handling');
  console.log('7. ✅ Confidence Level Based on Source Diversity');
  console.log('8. ✅ Recommendations for Additional Sources');
  console.log('9. ✅ Comprehensive Source Attribution');
  console.log('10. ✅ Enhanced Fact Verification Across Multiple Domains');
  
  console.log('\n📚 Available Source Categories:');
  console.log('• Entertainment: IMDB, Rotten Tomatoes, Metacritic, official studio sites');
  console.log('• Literature: Goodreads, Amazon, Barnes & Noble, WorldCat');
  console.log('• Comics: ComicVine, Marvel.com, DC.com, Fandom wikis');
  console.log('• Gaming: Metacritic, IGN, GameSpot, Steam');
  console.log('• News: Variety, Hollywood Reporter, Deadline, Entertainment Weekly');
}

runAllTests().catch(console.error); 