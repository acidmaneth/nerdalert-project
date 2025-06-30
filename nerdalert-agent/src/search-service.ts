import axios from "axios";
import {
  BRAVE_API_KEY,
  SERPER_API_KEY,
  SEARCH_FALLBACK_ENABLED,
  SEARCH_TIMEOUT,
  SEARCH_MAX_RETRIES,
} from "./constants.js";

export interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  position: number;
}

export interface SearchResponse {
  results: SearchResult[];
  provider: string;
  success: boolean;
  qualityScore: number;
  sourceDiversity: string[];
  error?: string;
}

export interface SearchOptions {
  maxResults?: number;
  requireOfficialSources?: boolean;
  includeNews?: boolean;
  includeWikis?: boolean;
}

// Enhanced multi-provider search function with fallback
export async function performWebSearch(query: string, retryCount: number = 0): Promise<{
  results: SearchResult[];
  provider: string;
  success: boolean;
  error?: string;
}> {
  console.log(`Performing web search for: ${query} (attempt ${retryCount + 1})`);
  
  // Try Brave Search first (if API key is available)
  if (BRAVE_API_KEY && BRAVE_API_KEY !== 'test-key') {
    try {
      console.log(`Attempting Brave search for: ${query}`);
      const braveResponse = await axios.get('https://api.search.brave.com/res/v1/web/search', {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': BRAVE_API_KEY,
        },
        params: {
          q: query,
          count: 10,
          offset: 0,
          safesearch: 'moderate',
          search_lang: 'en',
          country: 'US',
          extra_snippets: true
        },
        timeout: SEARCH_TIMEOUT,
      });
      
      const results = braveResponse.data.web?.results || [];
      if (results.length > 0) {
        console.log(`Brave search successful: ${results.length} results`);
        return {
          results: normalizeSearchResults(results, 'brave'),
          provider: 'brave',
          success: true
        };
      }
    } catch (error) {
      console.error(`Brave search failed:`, (error as Error).message);
    }
  }
  
  // Fallback to Serper (primary fallback)
  if (SERPER_API_KEY && SEARCH_FALLBACK_ENABLED) {
    try {
      console.log(`Attempting Serper search for: ${query}`);
      const serperResponse = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: 10,
        gl: 'us',
        hl: 'en',
        autocorrect: true,
        safe: 'active'
      }, {
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: SEARCH_TIMEOUT,
      });
      
      const results = serperResponse.data.organic || [];
      if (results.length > 0) {
        console.log(`Serper search successful: ${results.length} results`);
        return {
          results: normalizeSearchResults(results, 'serper'),
          provider: 'serper',
          success: true
        };
      }
    } catch (error) {
      console.error(`Serper search failed:`, (error as Error).message);
    }
  }
  
  // Retry logic for transient failures
  if (retryCount < SEARCH_MAX_RETRIES - 1) {
    console.log(`Search failed, retrying... (${retryCount + 1}/${SEARCH_MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
    return performWebSearch(query, retryCount + 1);
  }
  
  console.error(`All search providers failed for query: ${query}`);
  return {
    results: [],
    provider: 'none',
    success: false,
    error: 'All search providers failed'
  };
}

// Enhanced search result normalization
function normalizeSearchResults(results: any[], provider: string): SearchResult[] {
  if (provider === 'brave') {
    return results.map(result => ({
      title: result.title,
      link: result.url,
      snippet: result.description,
      source: 'brave',
      position: result.position || 0
    }));
  } else if (provider === 'serper') {
    return results.map(result => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      source: 'serper',
      position: result.position || 0
    }));
  }
  
  // Fallback normalization
  return results.map(result => ({
    title: result.title || result.name || 'Unknown',
    link: result.url || result.link || result.href || '#',
    snippet: result.description || result.snippet || result.summary || '',
    source: provider,
    position: result.position || 0
  }));
}

// Enhanced search with quality scoring and source diversity
export async function performEnhancedSearch(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
  const {
    maxResults = 8,
    requireOfficialSources = false,
    includeNews = true,
    includeWikis = true
  } = options;
  
  console.log(`Performing enhanced search for: ${query}`);
  
  try {
    const searchResult = await performWebSearch(query);
    
    if (!searchResult.success) {
      return {
        results: [],
        provider: searchResult.provider,
        success: false,
        qualityScore: 0,
        sourceDiversity: [],
        error: searchResult.error
      };
    }
    
    // Apply quality scoring
    const scoredResults = scoreSearchResults(searchResult.results, requireOfficialSources);
    
    // Calculate source diversity
    const sourceDiversity = calculateSourceDiversity(scoredResults);
    
    // Calculate quality score
    const qualityScore = calculateQualityScore(scoredResults, sourceDiversity);
    
    // Filter and limit results
    const filteredResults = scoredResults
      .filter(result => {
        if (requireOfficialSources && !isOfficialSource(result.link)) return false;
        if (!includeNews && isNewsSource(result.link)) return false;
        if (!includeWikis && isWikiSource(result.link)) return false;
        return true;
      })
      .slice(0, maxResults);
    
    return {
      results: filteredResults,
      provider: searchResult.provider,
      success: true,
      qualityScore,
      sourceDiversity
    };
    
  } catch (error) {
    return {
      results: [],
      provider: 'none',
      success: false,
      qualityScore: 0,
      sourceDiversity: [],
      error: (error as Error).message
    };
  }
}

// Score search results based on source authority and content quality
function scoreSearchResults(results: SearchResult[], requireOfficialSources: boolean): SearchResult[] {
  const sourceScores = {
    // Official sources (highest priority)
    'marvel.com': 10, 'dc.com': 10, 'starwars.com': 10, 'startrek.com': 10,
    'disney.com': 10, 'warnerbros.com': 10, 'paramount.com': 10,
    'imdb.com': 9, 'rottentomatoes.com': 9, 'metacritic.com': 9,
    
    // Major fan wikis
    'fandom.com': 8, 'memory-alpha.org': 8, 'wookieepedia.org': 8,
    'marvel.fandom.com': 8, 'dc.fandom.com': 8, 'starwars.fandom.com': 8,
    
    // Entertainment news sites
    'variety.com': 7, 'hollywoodreporter.com': 7, 'deadline.com': 7,
    'thewrap.com': 7, 'collider.com': 7, 'screenrant.com': 7,
    
    // Review and database sites
    'boxofficemojo.com': 6, 'comicbook.com': 6,
    
    // Reddit fan communities
    'reddit.com': 5,
    
    // General news sites
    'cnn.com': 4, 'bbc.com': 4, 'reuters.com': 4,
  };
  
  return results.map(result => {
    let score = 0;
    const url = result.link.toLowerCase();
    
    // Calculate score based on domain
    for (const [domain, domainScore] of Object.entries(sourceScores)) {
      if (url.includes(domain)) {
        score = Math.max(score, domainScore);
        break;
      }
    }
    
    // Bonus for recent content (if date is in title/snippet)
    if (result.title.includes('2025') || result.snippet.includes('2025')) {
      score += 2;
    }
    
    // Bonus for content length
    if (result.snippet.length > 100) {
      score += 1;
    }
    
    return {
      ...result,
      score
    };
  }).sort((a, b) => (b as any).score - (a as any).score);
}

// Calculate source diversity
function calculateSourceDiversity(results: SearchResult[]): string[] {
  const sources = new Set<string>();
  
  results.forEach(result => {
    const domain = extractDomain(result.link);
    if (domain) {
      sources.add(domain);
    }
  });
  
  return Array.from(sources);
}

// Calculate overall quality score
function calculateQualityScore(results: SearchResult[], sourceDiversity: string[]): number {
  if (results.length === 0) return 0;
  
  const avgResultScore = results.reduce((sum, result) => sum + ((result as any).score || 0), 0) / results.length;
  const diversityBonus = Math.min(sourceDiversity.length * 0.5, 5);
  const officialSourceBonus = sourceDiversity.some(source => 
    ['marvel.com', 'dc.com', 'starwars.com', 'imdb.com'].some(official => source.includes(official))
  ) ? 3 : 0;
  
  return Math.min(avgResultScore + diversityBonus + officialSourceBonus, 10);
}

// Helper functions
function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return domain.replace('www.', '');
  } catch {
    return '';
  }
}

function isOfficialSource(url: string): boolean {
  const officialDomains = [
    'marvel.com', 'dc.com', 'starwars.com', 'startrek.com',
    'disney.com', 'warnerbros.com', 'paramount.com', 'imdb.com'
  ];
  return officialDomains.some(domain => url.includes(domain));
}

function isNewsSource(url: string): boolean {
  const newsDomains = [
    'variety.com', 'hollywoodreporter.com', 'deadline.com',
    'cnn.com', 'bbc.com', 'reuters.com'
  ];
  return newsDomains.some(domain => url.includes(domain));
}

function isWikiSource(url: string): boolean {
  const wikiDomains = [
    'fandom.com', 'wikipedia.org', 'memory-alpha.org', 'wookieepedia.org'
  ];
  return wikiDomains.some(domain => url.includes(domain));
}

// Specialized search functions
export async function searchForMovieInfo(movieTitle: string): Promise<SearchResponse> {
  const query = `${movieTitle} movie cast release date site:imdb.com OR site:marvel.com OR site:dc.com`;
  return performEnhancedSearch(query, {
    maxResults: 6,
    requireOfficialSources: true,
    includeNews: true
  });
}

export async function searchForActorInfo(actorName: string): Promise<SearchResponse> {
  const query = `${actorName} filmography movies site:imdb.com OR site:marvel.com OR site:dc.com`;
  return performEnhancedSearch(query, {
    maxResults: 6,
    requireOfficialSources: true,
    includeNews: true
  });
}

export async function searchForLatestNews(topic: string): Promise<SearchResponse> {
  const query = `${topic} latest news 2025 site:variety.com OR site:hollywoodreporter.com OR site:deadline.com`;
  return performEnhancedSearch(query, {
    maxResults: 8,
    requireOfficialSources: false,
    includeNews: true,
    includeWikis: false
  });
}

export async function searchForWikiInfo(topic: string, franchise?: string): Promise<SearchResponse> {
  const query = franchise ? 
    `${topic} ${franchise} site:fandom.com OR site:wikipedia.org` :
    `${topic} site:fandom.com OR site:wikipedia.org`;
  
  return performEnhancedSearch(query, {
    maxResults: 6,
    requireOfficialSources: false,
    includeNews: false,
    includeWikis: true
  });
} 