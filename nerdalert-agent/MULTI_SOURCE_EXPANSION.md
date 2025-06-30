# Multi-Source Expansion Guide - NerdAlert Agent v1.6.0

## 🚀 **Overview**

The NerdAlert agent now supports comprehensive multi-source research across multiple domains including entertainment, literature, comics, gaming, and news. This guide explains how to add more sources and leverage the new capabilities.

## 📚 **Available Source Categories**

### **1. Entertainment Sources**
```typescript
entertainment: {
  movies: [
    'imdb.com',
    'rottentomatoes.com',
    'metacritic.com',
    'boxofficemojo.com',
    'themoviedb.org'
  ],
  tv: [
    'imdb.com',
    'rottentomatoes.com',
    'tvguide.com',
    'tvmaze.com'
  ],
  actors: [
    'imdb.com',
    'wikipedia.org',
    'biography.com'
  ],
  studios: [
    'marvel.com',
    'dc.com',
    'disney.com',
    'warnerbros.com',
    'paramount.com',
    'universal.com'
  ]
}
```

### **2. Literature Sources**
```typescript
literature: {
  books: [
    'goodreads.com',
    'amazon.com',
    'barnesandnoble.com',
    'worldcat.org',
    'openlibrary.org'
  ],
  authors: [
    'wikipedia.org',
    'goodreads.com',
    'britannica.com'
  ],
  publishers: [
    'penguinrandomhouse.com',
    'simonandschuster.com',
    'harpercollins.com'
  ]
}
```

### **3. Comic Sources**
```typescript
comics: {
  marvel: [
    'marvel.com',
    'marvel.fandom.com',
    'comicvine.com',
    'dc.fandom.com'
  ],
  dc: [
    'dc.com',
    'dc.fandom.com',
    'comicvine.com'
  ],
  general: [
    'comicvine.com',
    'wikipedia.org',
    'goodreads.com'
  ]
}
```

### **4. Gaming Sources**
```typescript
gaming: {
  games: [
    'metacritic.com',
    'ign.com',
    'gamespot.com',
    'steam.com',
    'mobygames.com'
  ],
  developers: [
    'wikipedia.org',
    'mobygames.com'
  ]
}
```

### **5. News Sources**
```typescript
news: {
  entertainment: [
    'variety.com',
    'hollywoodreporter.com',
    'deadline.com',
    'entertainmentweekly.com'
  ],
  tech: [
    'techcrunch.com',
    'theverge.com',
    'arstechnica.com'
  ]
}
```

### **6. Wiki Sources (NEW)
- **Star Wars**: Wookieepedia (starwars.fandom.com), StarWars.com, StarWars Wikia
- **Star Trek**: Memory Alpha (memory-alpha.fandom.com), Memory Beta, StarTrek.com
- **Lord of the Rings**: The One Wiki to Rule Them All (lotr.fandom.com), Tolkien Gateway, Tolkien Estate
- **Harry Potter**: Harry Potter Wiki (harrypotter.fandom.com), Pottermore, Wizarding World
- **Marvel**: Marvel Database (marvel.fandom.com), Marvel.com
- **DC**: DC Database (dc.fandom.com), DC.com
- **Gaming Wikis**: Minecraft Wiki, Elder Scrolls Wiki (UESP), Fallout Wiki, WoWWiki, League of Legends Wiki
- **Anime**: MyAnimeList, Anime Wiki, Crunchyroll
- **General**: Wikipedia, Wikia, Fandom

### **7. Fandom Sources (NEW)
- **Doctor Who**: TARDIS Wiki (tardis.fandom.com), Doctor Who Wiki, BBC Doctor Who
- **Game of Thrones**: A Wiki of Ice and Fire (awoiaf.westeros.org), Game of Thrones Wiki, George R.R. Martin
- **Dune**: Dune Wiki (dune.fandom.com), Dune Novels
- **Discworld**: Discworld Wiki (discworld.fandom.com), L-Space
- **Hitchhiker's Guide**: Hitchhiker's Wiki (hitchhikers.fandom.com), Douglas Adams

## 🔧 **How to Add More Sources**

### **Step 1: Update Source Configuration**

Add new sources to the `SOURCE_CONFIG` object in `src/prompt/index.ts`:

```typescript
const SOURCE_CONFIG = {
  entertainment: {
    // Add new movie sources
    movies: [
      'imdb.com',
      'rottentomatoes.com',
      'metacritic.com',
      'boxofficemojo.com',
      'themoviedb.org',
      'your-new-source.com'  // Add here
    ],
    // Add new categories
    documentaries: [
      'documentaryheaven.com',
      'pbs.org'
    ]
  },
  // Add new categories
  science: {
    research: [
      'nature.com',
      'science.org',
      'arxiv.org'
    ],
    journals: [
      'cell.com',
      'thelancet.com'
    ]
  },
  wikis: {
    newfandom: [
      'newfandom.fandom.com',
      'official-site.com'
    ]
  },
  fandoms: {
    newfandom: [
      'newfandom.fandom.com',
      'official-site.com'
    ]
  }
};
```

### **Step 2: Update Source Selection Logic**

Modify the `selectSourcesForQuery` function to include your new sources:

```typescript
function selectSourcesForQuery(query: string, type: string = "general"): string[] {
  const lowerQuery = query.toLowerCase();
  const sources: string[] = [];
  
  // Add detection for your new category
  if (lowerQuery.includes('documentary')) {
    sources.push(...SOURCE_CONFIG.entertainment.documentaries);
  }
  
  if (lowerQuery.includes('research') || lowerQuery.includes('study')) {
    sources.push(...SOURCE_CONFIG.science.research);
  }
  
  // ... existing logic ...
  
  return [...new Set(sources)];
}
```

### **Step 3: Create Database Lookup Function**

For new content types, create a specialized lookup function:

```typescript
async function lookupDocumentaryDatabase(query: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    director: string;
    year?: string;
    rating?: string;
    description?: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up documentary: ${query}`);
    
    // Search your documentary source
    const searchQuery = `${query} site:documentaryheaven.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (searchResults.length === 0) {
      return { found: false, error: 'No documentary results found' };
    }
    
    // Get the first result
    const docUrl = searchResults[0].link;
    if (!docUrl.includes('documentaryheaven.com')) {
      return { found: false, error: 'No documentary URL found' };
    }
    
    // Read the page content
    const pageContent = await readWebsiteContent(docUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract documentary information
    const directorMatch = content.match(/director[:\s]+([a-z\s]+)/i);
    const director = directorMatch ? directorMatch[1].trim() : 'Unknown';
    
    const yearMatch = content.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : undefined;
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        director,
        year
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}
```

### **Step 4: Update Research Function**

Add your new lookup to the `researchWithFullContext` function:

```typescript
// Content-specific database lookups
const lowerQuery = query.toLowerCase();

// Add your new category
if (lowerQuery.includes('documentary')) {
  const docTitle = extractDocumentaryTitleFromQuery(query);
  if (docTitle) {
    const docData = await lookupDocumentaryDatabase(docTitle);
    if (docData.found && docData.data) {
      facts.push({
        claim: `${docTitle} directed by ${docData.data.director} (${docData.data.year || 'Unknown year'})`,
        verified: true,
        confidence: 'HIGH',
        sources: ['documentaryheaven.com'],
        sourceTypes: ['documentary-database']
      });
    }
  }
}
```

### **Step 5: Add Helper Functions**

Create extraction functions for your content type:

```typescript
function extractDocumentaryTitleFromQuery(query: string): string | null {
  const docMatches = query.match(/"([^"]+)"/g) || query.match(/([A-Z][A-Za-z\s&:]+)\s*documentary/g) || [];
  return docMatches.length > 0 && docMatches[0] ? docMatches[0].replace(/"/g, '').replace(/\s*documentary/, '') : null;
}
```

## 🎯 **Adding Literature and Book Sources**

### **Literature Database Integration**

The agent now supports comprehensive literature research:

```typescript
// Example: Look up a book
const literatureData = await lookupLiteratureDatabase("The Lord of the Rings");
if (literatureData.found && literatureData.data) {
  console.log(`Book: ${literatureData.data.title}`);
  console.log(`Author: ${literatureData.data.author}`);
  console.log(`Year: ${literatureData.data.publicationYear}`);
  console.log(`Rating: ${literatureData.data.rating}/5`);
}
```

### **Available Literature Sources**

- **Goodreads**: Book ratings, reviews, and author information
- **Amazon**: Publication details and customer reviews
- **Barnes & Noble**: Book information and availability
- **WorldCat**: Library catalog information
- **OpenLibrary**: Free book information and digital copies

### **Adding More Literature Sources**

```typescript
literature: {
  books: [
    'goodreads.com',
    'amazon.com',
    'barnesandnoble.com',
    'worldcat.org',
    'openlibrary.org',
    'bookdepository.com',  // Add new source
    'audible.com'          // Add audiobook source
  ],
  academic: [
    'jstor.org',
    'scholar.google.com',
    'researchgate.net'
  ]
}
```

## 🎮 **Adding Gaming Sources**

### **Gaming Database Integration**

The agent supports comprehensive gaming research:

```typescript
// Example: Look up a game
const gameData = await lookupGamingDatabase("The Legend of Zelda: Breath of the Wild");
if (gameData.found && gameData.data) {
  console.log(`Game: ${gameData.data.title}`);
  console.log(`Developer: ${gameData.data.developer}`);
  console.log(`Publisher: ${gameData.data.publisher}`);
  console.log(`Year: ${gameData.data.releaseYear}`);
  console.log(`Metacritic Score: ${gameData.data.rating}/100`);
}
```

### **Available Gaming Sources**

- **Metacritic**: Game ratings and reviews
- **IGN**: Game reviews and news
- **GameSpot**: Game information and reviews
- **Steam**: PC game information and user reviews
- **MobyGames**: Comprehensive game database

### **Adding More Gaming Sources**

```typescript
gaming: {
  games: [
    'metacritic.com',
    'ign.com',
    'gamespot.com',
    'steam.com',
    'mobygames.com',
    'opencritic.com',      // Add new source
    'howlongtobeat.com'    // Add completion time source
  ],
  esports: [
    'liquipedia.net',
    'esports.com',
    'hltv.org'
  ]
}
```

## 📰 **Adding News and Media Sources**

### **News Source Integration**

The agent automatically includes news sources for current events:

```typescript
// News sources are always included for current events
news: {
  entertainment: [
    'variety.com',
    'hollywoodreporter.com',
    'deadline.com',
    'entertainmentweekly.com'
  ],
  tech: [
    'techcrunch.com',
    'theverge.com',
    'arstechnica.com'
  ],
  general: [
    'reuters.com',
    'ap.org',
    'bbc.com'
  ]
}
```

### **Adding Specialized News Sources**

```typescript
news: {
  // Add specialized categories
  science: [
    'sciencedaily.com',
    'phys.org',
    'eurekalert.org'
  ],
  business: [
    'bloomberg.com',
    'wsj.com',
    'ft.com'
  ],
  sports: [
    'espn.com',
    'sportsillustrated.com',
    'bleacherreport.com'
  ]
}
```

## 🔍 **Source Diversity and Confidence Assessment**

### **How Source Diversity Works**

The agent assesses confidence based on source diversity:

```typescript
// High confidence requires:
// - 2+ official sources (IMDB, Marvel.com, etc.)
// - 3+ total verifications
// - 2+ different source types

if (officialSourceCount >= 2 && verificationCount >= 3 && sourceTypes.length >= 2) {
  confidence = 'HIGH';
} else if (verificationCount >= 2) {
  confidence = 'MEDIUM';
}
```

### **Source Type Categories**

- **entertainment-database**: IMDB, Rotten Tomatoes, Metacritic
- **official-studio**: Marvel.com, DC.com, Disney.com
- **literature-database**: Goodreads, Amazon, Barnes & Noble
- **comic-database**: ComicVine, Marvel.com, DC.com
- **gaming-database**: Metacritic, IGN, GameSpot
- **entertainment-news**: Variety, Hollywood Reporter
- **general**: Wikipedia, general web sources

## 🧪 **Testing New Sources**

### **Create Test Cases**

```javascript
// In test-multi-source.js
const newSourceTests = [
  {
    name: "New Documentary Source",
    query: "Tell me about the documentary Planet Earth",
    expectedDatabase: "documentaryheaven.com",
    expectedInfo: ["director", "year", "rating"]
  }
];
```

### **Run Source Tests**

```bash
# Test specific source integration
npm run test:multi-source

# Test fact-checking with new sources
npm run test:fact-checking
```

## 📊 **Performance Considerations**

### **Source Prioritization**

The agent prioritizes sources based on reliability:

1. **Official Sources**: Studio websites, official databases
2. **Authoritative Databases**: IMDB, Goodreads, Metacritic
3. **News Sources**: Variety, Hollywood Reporter
4. **General Sources**: Wikipedia, general web

### **Caching and Rate Limiting**

Consider implementing caching for frequently accessed sources:

```typescript
// Example caching implementation
const sourceCache = new Map();

async function getCachedSourceData(url: string, ttl: number = 3600000) {
  const cached = sourceCache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }
  
  const data = await readWebsiteContent(url);
  sourceCache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

## 🚀 **Advanced Source Integration**

### **API Integration**

For better performance, consider direct API integration:

```typescript
// Example: Direct IMDB API integration
async function lookupIMDBDirect(title: string) {
  const apiKey = process.env.IMDB_API_KEY;
  const response = await axios.get(`http://www.omdbapi.com/?t=${title}&apikey=${apiKey}`);
  return response.data;
}
```

### **Web Scraping Enhancement**

For better content extraction:

```typescript
// Enhanced content extraction
async function extractStructuredData(url: string) {
  const pageContent = await readWebsiteContent(url);
  
  // Use more sophisticated parsing
  const structuredData = {
    title: extractTitle(pageContent.content),
    metadata: extractMetadata(pageContent.content),
    ratings: extractRatings(pageContent.content),
    cast: extractCast(pageContent.content)
  };
  
  return structuredData;
}
```

## 📝 **Best Practices**

### **Source Selection**

1. **Choose authoritative sources** for your domain
2. **Include multiple source types** for better verification
3. **Consider source reliability** and update frequency
4. **Test source availability** and response times

### **Error Handling**

```typescript
// Robust error handling for sources
try {
  const data = await lookupSource(query);
  if (data.found) {
    return data;
  }
} catch (error) {
  console.error(`Source lookup failed: ${error.message}`);
  // Fallback to alternative sources
  return await fallbackLookup(query);
}
```

### **Source Validation**

```typescript
// Validate source reliability
function validateSource(source: string): boolean {
  const reliableSources = [
    'imdb.com', 'goodreads.com', 'metacritic.com',
    'marvel.com', 'dc.com', 'comicvine.com'
  ];
  
  return reliableSources.some(reliable => source.includes(reliable));
}
```

## 🎉 **Conclusion**

The multi-source expansion system provides:

- **Comprehensive coverage** across multiple domains
- **Flexible source addition** for new content types
- **Intelligent source selection** based on query type
- **Confidence assessment** based on source diversity
- **Robust error handling** and fallback mechanisms

This system makes the NerdAlert agent a powerful research tool that can handle queries across entertainment, literature, comics, gaming, and news domains while maintaining high accuracy and source transparency. 