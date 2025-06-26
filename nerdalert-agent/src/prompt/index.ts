import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import axios from "axios"; // Import axios
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat";

import { PromptPayload } from "./types";
import { conversationMemory, extractTopicsFromMessage, analyzeAgentResponse } from "./conversation-memory";
import { RAGService } from "../rag/rag-service";
import {
  MODEL,
  LLM_API_KEY,
  LLM_BASE_URL,
  SYSTEM_PROMPT,
  SERPER_API_KEY, // Import the new key
} from "../constants";

// Handle import.meta.url for different environments
let __filename: string = '';
let __dirname: string = '';

try {
  __filename = fileURLToPath(import.meta.url);
  __dirname = path.dirname(__filename);
} catch (error) {
  // Fallback for test environments or when import.meta is not available
  __dirname = process.cwd();
}

const openAI = new OpenAI({
  apiKey: LLM_API_KEY,
  baseURL: LLM_BASE_URL,
  maxRetries: 3,
});

// Initialize RAG service
const ragService = new RAGService();

const systemPrompt =
  SYSTEM_PROMPT ||
  fs.readFileSync(path.join(__dirname, "../system-prompt.txt"), "utf8");

// Add current date and time to the system prompt
const getCurrentDateTime = () => {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    time: now.toLocaleTimeString('en-US', { 
      hour12: true, 
      timeZoneName: 'short' 
    }),
    iso: now.toISOString(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    timestamp: now.getTime()
  };
};

const currentDateTime = getCurrentDateTime();

// Enhanced date validation function
const validateDateAccuracy = (mentionedDate: string, context: string): string => {
  const currentYear = currentDateTime.year;
  const currentMonth = currentDateTime.month;
  
  // Extract year from mentioned date
  const yearMatch = mentionedDate.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[0]);
    
    // Check if year is in the future
    if (year > currentYear) {
      return `DATE VALIDATION WARNING: The year ${year} mentioned in "${context}" is in the future. Current year is ${currentYear}. This may be a prediction, rumor, or error.`;
    }
    
    // Check if year is too far in the past for current events
    if (year < currentYear - 50 && context.toLowerCase().includes('current') || context.toLowerCase().includes('latest')) {
      return `DATE VALIDATION WARNING: The year ${year} mentioned in "${context}" seems outdated for current information. Current year is ${currentYear}.`;
    }
  }
  
  return "";
};

// Generate conversation memory context
const generateMemoryContext = (sessionId?: string): string => {
  if (!sessionId) return "";
  
  const memorySummary = conversationMemory.getMemorySummary(sessionId);
  return memorySummary ? `\n\n${memorySummary}` : "";
};

const systemPromptWithDate = (sessionId?: string) => `${systemPrompt}

CURRENT DATE AND TIME: Today is ${currentDateTime.date} at ${currentDateTime.time} (${currentDateTime.iso}).
CURRENT YEAR: ${currentDateTime.year}
IMPORTANT: Always use this current date and time when discussing dates, events, or time-sensitive information. Do not reference dates from your training data unless specifically asked about historical events.

DATE ACCURACY RULES:
- When discussing current events, releases, or upcoming content, ALWAYS verify dates against current year (${currentDateTime.year})
- If a date seems to be in the future or too far in the past, flag it for verification
- For movie/TV show release dates, always search for the most recent information
- When discussing "latest" or "current" information, ensure it's actually current
- If you're unsure about a date's accuracy, search for verification before sharing
- Distinguish between announced dates, rumored dates, and confirmed dates
- Always mention the source and confidence level when sharing dates

CONVERSATION GUIDELINES:
- Focus primarily on the user's most recent question or statement
- Don't rehash or repeat answers to previous questions unless specifically asked
- If the user asks a new question, answer that question directly without referencing previous topics
- Keep responses focused and relevant to the current conversation turn
- Be conversational and engaging, not repetitive
- NEVER repeat the same information, explanations, or trivia you've already shared
- If you've already explained something, assume the user remembers it
- Focus on providing NEW information, insights, or angles
- If you need to reference previous information, do so briefly without re-explaining
- Each response should add fresh value to the conversation
- NEVER show internal thinking or analysis in your responses
- Answer questions directly and naturally, as if you're having a casual conversation
- If you're unsure about something, just say so briefly and move on - don't over-analyze
- Use natural conversation flow - respond to what they said, not what you think they might have meant${generateMemoryContext(sessionId)}
`;

// Add enhanced fact verification function
async function verify_facts(query: string, initial_results: string): Promise<string> {
  console.log(`Verifying facts for: ${query}`);
  if (!SERPER_API_KEY) {
    return initial_results + "\n\nFACT VERIFICATION: Unable to verify - API key not available.";
  }

  const searchUrl = "https://google.serper.dev/search";
  
  // Create verification searches targeting official sources
  const verificationStrategies = [
    { q: `${query} site:marvel.com OR site:dc.com OR site:starwars.com OR site:disney.com`, description: "Official publishers" },
    { q: `${query} site:imdb.com OR site:boxofficemojo.com`, description: "Verified databases" },
    { q: `${query} site:variety.com OR site:hollywoodreporter.com OR site:deadline.com`, description: "Industry news" },
    { q: `${query} site:*.fandom.com -"fan theory" -"speculation" -"rumor"`, description: "Wiki facts only" }
  ];

  let verificationResults: any[] = [];
  let conflictingInfo: string[] = [];
  
  for (const strategy of verificationStrategies) {
    try {
      const searchPayload = JSON.stringify({ q: strategy.q });
      const response = await axios.post(searchUrl, searchPayload, {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const results = response.data.organic || [];
      verificationResults = verificationResults.concat(results);
      
      console.log(`Verification strategy "${strategy.description}" returned ${results.length} results`);
    } catch (error) {
      console.error(`Verification strategy failed: ${(error as Error).message}`);
    }
  }

  // Analyze verification results for consistency
  const verifiedInfo = analyzeFactConsistency(verificationResults);
  
  // Add date validation if dates are mentioned
  const dateValidation = validateDatesInContent(initial_results + verifiedInfo);
  
  return initial_results + "\n\n" + verifiedInfo + (dateValidation ? "\n\n" + dateValidation : "");
}

// Function to validate dates mentioned in content
function validateDatesInContent(content: string): string {
  const currentYear = currentDateTime.year;
  const dateMatches = content.match(/\b(19|20)\d{2}\b/g);
  
  if (!dateMatches) return "";
  
  const warnings: string[] = [];
  
  for (const dateMatch of dateMatches) {
    const year = parseInt(dateMatch);
    
    if (year > currentYear) {
      warnings.push(`Future date warning: ${year} is in the future (current year: ${currentYear})`);
    } else if (year < currentYear - 50 && content.toLowerCase().includes('current')) {
      warnings.push(`Outdated date warning: ${year} seems outdated for current information`);
    }
  }
  
  if (warnings.length > 0) {
    return `DATE VALIDATION WARNINGS:\n${warnings.join('\n')}`;
  }
  
  return "";
}

// Function to analyze fact consistency across sources
function analyzeFactConsistency(results: any[]): string {
  if (results.length === 0) {
    return "FACT VERIFICATION: No verification sources found.";
  }

  const sourceTypes = {
    official: results.filter(r => 
      r.link?.includes('marvel.com') || 
      r.link?.includes('dc.com') || 
      r.link?.includes('starwars.com') ||
      r.link?.includes('disney.com')
    ).length,
    databases: results.filter(r => 
      r.link?.includes('imdb.com') || 
      r.link?.includes('boxofficemojo.com')
    ).length,
    news: results.filter(r => 
      r.link?.includes('variety.com') || 
      r.link?.includes('hollywoodreporter.com') ||
      r.link?.includes('deadline.com')
    ).length,
    wikis: results.filter(r => 
      r.link?.includes('fandom.com')
    ).length
  };

  let confidence = "MEDIUM";
  let verificationNote = "";

  if (sourceTypes.official >= 2) {
    confidence = "HIGH";
    verificationNote = "Verified by multiple official sources";
  } else if (sourceTypes.official >= 1 && sourceTypes.databases >= 1) {
    confidence = "HIGH";
    verificationNote = "Confirmed by official source and verified database";
  } else if (sourceTypes.databases >= 2) {
    confidence = "MEDIUM-HIGH";
    verificationNote = "Confirmed by multiple entertainment databases";
  } else if (sourceTypes.official >= 1) {
    confidence = "MEDIUM";
    verificationNote = "Found in official source, limited cross-reference";
  } else if (sourceTypes.wikis >= 3 && sourceTypes.news >= 1) {
    confidence = "MEDIUM";
    verificationNote = "Multiple wiki sources with news confirmation";
  } else {
    confidence = "LOW";
    verificationNote = "Limited verification sources available";
  }

  return `FACT VERIFICATION:
Confidence Level: ${confidence}
Sources Checked: ${results.length} (${sourceTypes.official} official, ${sourceTypes.databases} databases, ${sourceTypes.news} news, ${sourceTypes.wikis} wikis)
Note: ${verificationNote}`;
}

// Add new tool for fact verification
const factVerificationTool = {
  type: "function" as const,
  function: {
    name: "verify_facts",
    description: "Cross-reference and verify pop-culture facts from multiple authoritative sources to ensure accuracy. Use this when sharing specific trivia, character details, dates, or any facts that fans would care about being accurate.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The specific fact or claim to verify across multiple sources.",
        },
        initial_results: {
          type: "string",
          description: "The initial research results to cross-reference and verify.",
        },
      },
      required: ["query", "initial_results"],
    },
  },
};

// Add new tool for canon vs speculation distinction
const canonCheckTool = {
  type: "function" as const,
  function: {
    name: "check_canon_status",
    description: "Determine if information is official canon, fan theory, speculation, or rumor. Critical for maintaining accuracy in pop-culture discussions.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The information or claim to check for canon status.",
        },
        franchise: {
          type: "string",
          description: "The franchise (Marvel, DC, Star Wars, Star Trek, etc.) to check canon for.",
        },
      },
      required: ["query", "franchise"],
    },
  },
};

// Add RAG-enhanced search tool
const ragEnhancedSearchTool = {
  type: "function" as const,
  function: {
    name: "rag_enhanced_search",
    description: "Search using RAG (Retrieval-Augmented Generation) for verified, current information from the knowledge base. Combines cached verified data with web search when needed. Provides confidence levels and source attribution.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to look up using RAG.",
        },
        category: {
          type: "string",
          description: "Optional category filter: 'movie', 'tv', 'comic', 'character', 'event', 'trivia'",
          enum: ["movie", "tv", "comic", "character", "event", "trivia"]
        },
        franchise: {
          type: "string",
          description: "Optional franchise filter: 'Marvel', 'DC', 'Star Wars', 'Star Trek', etc.",
        },
      },
      required: ["query"],
    },
  },
};

// Add RAG validation tool
const ragValidationTool = {
  type: "function" as const,
  function: {
    name: "rag_validate_information",
    description: "Validate if information is current and accurate using the RAG knowledge base. Check confidence levels, currency, and detect conflicts.",
    parameters: {
      type: "object" as const,
      properties: {
        topic: {
          type: "string",
          description: "The topic to validate for accuracy and currency.",
        },
        category: {
          type: "string",
          description: "Optional category filter for validation.",
          enum: ["movie", "tv", "comic", "character", "event", "trivia"]
        },
      },
      required: ["topic"],
    },
  },
};

// Update the tools array to include new verification tools
const tools = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Get real-time information from the internet for general queries.",
      parameters: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The search query to look up.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "deep_trivia_search",
      description: "Perform comprehensive research for pop-culture trivia, character details, and fan information. Use this for detailed character analysis, plot details, dates, and specific facts that fans care about.",
      parameters: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The specific trivia or character detail to research thoroughly.",
          },
          search_type: {
            type: "string",
            description: "Type of search: 'character', 'plot', 'trivia', 'dates', 'canon', or 'fan_theory'",
            enum: ["character", "plot", "trivia", "dates", "canon", "fan_theory"]
          },
        },
        required: ["query", "search_type"],
      },
    },
  },
  factVerificationTool,
  canonCheckTool,
  ragEnhancedSearchTool,
  ragValidationTool,
];

// Implement the web search function with enhanced research capabilities
async function web_search(query: string): Promise<string> {
  console.log(`Performing enhanced web search for: ${query}`);
  if (!SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is not set.");
  }

  const searchUrl = "https://google.serper.dev/search";
  
  // Create multiple search strategies for comprehensive research
  const searchStrategies = [
    // Primary search with accuracy focus
    { q: `${query} site:fandom.com OR site:marvel.com OR site:dc.com OR site:starwars.com OR site:memory-alpha.org OR site:wookieepedia.org` },
    // Fan wiki search
    { q: `${query} site:*.fandom.com OR site:*.wikia.com` },
    // News and official sources
    { q: `${query} site:variety.com OR site:hollywoodreporter.com OR site:deadline.com OR site:thewrap.com` },
    // Reddit fan communities
    { q: `${query} site:reddit.com/r/marvel OR site:reddit.com/r/DCcomics OR site:reddit.com/r/StarWars OR site:reddit.com/r/startrek` },
    // IMDB and entertainment databases
    { q: `${query} site:imdb.com OR site:rottentomatoes.com OR site:metacritic.com` }
  ];

  let allResults: any[] = [];
  let searchErrors: string[] = [];

  // Perform multiple searches for comprehensive coverage
  for (const strategy of searchStrategies) {
    try {
      const searchPayload = JSON.stringify(strategy);
      const response = await axios.post(searchUrl, searchPayload, {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 second timeout
      });

      const results = response.data.organic || [];
      allResults = allResults.concat(results);
      
      console.log(`Strategy "${strategy.q.substring(0, 50)}..." returned ${results.length} results`);
    } catch (error) {
      const errorMsg = `Strategy failed: ${(error as Error).message}`;
      searchErrors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // If all strategies failed, try a basic search
  if (allResults.length === 0) {
    try {
      const basicPayload = JSON.stringify({ q: query });
      const response = await axios.post(searchUrl, basicPayload, {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      });
      allResults = response.data.organic || [];
      console.log(`Basic search returned ${allResults.length} results`);
    } catch (error) {
      console.error("Basic search also failed:", error);
      return `Error performing search: ${(error as Error).message}`;
    }
  }

  // Remove duplicates and prioritize authoritative sources
  const uniqueResults = removeDuplicateResults(allResults);
  const prioritizedResults = prioritizeResults(uniqueResults);
  
  // Extract and format the best results
  const snippets = prioritizedResults
    .slice(0, 8) // Get more results for comprehensive coverage
    .map((result: any) => {
      const source = result.link || "Unknown source";
      const title = result.title || "No title";
      const snippet = result.snippet || "No description available";
      return `SOURCE: ${source}\nTITLE: ${title}\nCONTENT: ${snippet}\n---`;
    })
    .join("\n\n");

  const resultSummary = `Found ${prioritizedResults.length} relevant results from ${searchStrategies.length} search strategies.`;
  const errorSummary = searchErrors.length > 0 ? `\nSearch errors: ${searchErrors.join(", ")}` : "";
  
  console.log(`Enhanced search completed: ${resultSummary}`);
  return `${resultSummary}${errorSummary}\n\n${snippets || "No results found."}`;
}

// Helper function to remove duplicate search results
function removeDuplicateResults(results: any[]): any[] {
  const seen = new Set();
  return results.filter(result => {
    const key = result.link || result.title || result.snippet;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// Helper function to prioritize results by source authority
function prioritizeResults(results: any[]): any[] {
  const priorityScores = new Map<string, number>();
  
  // Define priority scores for different source types
  const sourcePriorities = {
    // Official sources (highest priority)
    'marvel.com': 10, 'dc.com': 10, 'starwars.com': 10, 'startrek.com': 10,
    'disney.com': 10, 'warnerbros.com': 10, 'paramount.com': 10,
    
    // Major fan wikis
    'fandom.com': 9, 'memory-alpha.org': 9, 'wookieepedia.org': 9,
    'marvel.fandom.com': 9, 'dc.fandom.com': 9, 'starwars.fandom.com': 9,
    
    // Entertainment news sites
    'variety.com': 8, 'hollywoodreporter.com': 8, 'deadline.com': 8,
    'thewrap.com': 8, 'collider.com': 8, 'screenrant.com': 8,
    
    // Review and database sites
    'imdb.com': 7, 'rottentomatoes.com': 7, 'metacritic.com': 7,
    
    // Reddit fan communities
    'reddit.com': 6,
    
    // General news sites
    'cnn.com': 5, 'bbc.com': 5, 'reuters.com': 5,
  };

  return results.sort((a, b) => {
    const urlA = a.link || '';
    const urlB = b.link || '';
    
    let scoreA = 0;
    let scoreB = 0;
    
    // Calculate scores based on domain priorities
    for (const [domain, score] of Object.entries(sourcePriorities)) {
      if (urlA.includes(domain)) scoreA = Math.max(scoreA, score);
      if (urlB.includes(domain)) scoreB = Math.max(scoreB, score);
    }
    
    // If scores are equal, prefer results with more content
    if (scoreA === scoreB) {
      const contentA = (a.snippet || '').length;
      const contentB = (b.snippet || '').length;
      return contentB - contentA;
    }
    
    return scoreB - scoreA;
  });
}

// Implement deep trivia search with specialized strategies
async function deep_trivia_search(query: string, search_type: string): Promise<string> {
  console.log(`Performing deep trivia search for: ${query} (type: ${search_type})`);
  if (!SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is not set.");
  }

  const searchUrl = "https://google.serper.dev/search";
  
  // Create specialized search strategies based on search type
  let searchStrategies: Array<{q: string, description: string}> = [];
  
  switch (search_type) {
    case "character":
      searchStrategies = [
        { q: `${query} character site:marvel.fandom.com OR site:dc.fandom.com OR site:starwars.fandom.com OR site:memory-alpha.org`, description: "Character wikis" },
        { q: `${query} character biography site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official character pages" },
        { q: `${query} character analysis site:screenrant.com OR site:collider.com OR site:comicbook.com`, description: "Character analysis" },
        { q: `${query} character origin story site:*.fandom.com`, description: "Origin stories" }
      ];
      break;
      
    case "plot":
      searchStrategies = [
        { q: `${query} plot summary site:imdb.com OR site:rottentomatoes.com`, description: "Plot summaries" },
        { q: `${query} storyline site:*.fandom.com`, description: "Storyline details" },
        { q: `${query} plot details site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official plot info" },
        { q: `${query} plot analysis site:screenrant.com OR site:collider.com`, description: "Plot analysis" }
      ];
      break;
      
    case "trivia":
      searchStrategies = [
        { q: `${query} trivia facts site:imdb.com OR site:*.fandom.com`, description: "Trivia facts" },
        { q: `${query} behind the scenes site:variety.com OR site:hollywoodreporter.com`, description: "Behind the scenes" },
        { q: `${query} easter eggs site:screenrant.com OR site:collider.com`, description: "Easter eggs" },
        { q: `${query} fun facts site:reddit.com`, description: "Fan trivia" }
      ];
      break;
      
    case "dates":
      searchStrategies = [
        { q: `${query} release date site:imdb.com OR site:boxofficemojo.com`, description: "Release dates" },
        { q: `${query} premiere date site:variety.com OR site:hollywoodreporter.com`, description: "Premiere dates" },
        { q: `${query} timeline site:*.fandom.com`, description: "Timeline info" },
        { q: `${query} when site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official dates" }
      ];
      break;
      
    case "canon":
      searchStrategies = [
        { q: `${query} canon site:*.fandom.com`, description: "Canon information" },
        { q: `${query} official site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official canon" },
        { q: `${query} continuity site:*.fandom.com`, description: "Continuity details" },
        { q: `${query} canon vs non-canon site:reddit.com`, description: "Canon discussions" }
      ];
      break;
      
    case "fan_theory":
      searchStrategies = [
        { q: `${query} fan theory site:reddit.com`, description: "Fan theories" },
        { q: `${query} theory site:screenrant.com OR site:collider.com`, description: "Theory analysis" },
        { q: `${query} speculation site:variety.com OR site:hollywoodreporter.com`, description: "Speculation" },
        { q: `${query} theory discussion site:*.fandom.com`, description: "Theory discussions" }
      ];
      break;
      
    default:
      searchStrategies = [
        { q: `${query} site:*.fandom.com`, description: "General fandom search" },
        { q: `${query} site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official sites" },
        { q: `${query} site:imdb.com OR site:rottentomatoes.com`, description: "Database search" }
      ];
  }

  let allResults: any[] = [];
  let searchErrors: string[] = [];

  // Perform specialized searches
  for (const strategy of searchStrategies) {
    try {
      const searchPayload = JSON.stringify({ q: strategy.q });
      const response = await axios.post(searchUrl, searchPayload, {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout for deep research
      });

      const results = response.data.organic || [];
      allResults = allResults.concat(results);
      
      console.log(`Deep search strategy "${strategy.description}" returned ${results.length} results`);
    } catch (error) {
      const errorMsg = `Deep search strategy failed: ${(error as Error).message}`;
      searchErrors.push(errorMsg);
      console.error(errorMsg);
    }
  }

  // If all strategies failed, try a basic search
  if (allResults.length === 0) {
    try {
      const basicPayload = JSON.stringify({ q: query });
      const response = await axios.post(searchUrl, basicPayload, {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
      });
      allResults = response.data.organic || [];
      console.log(`Basic deep search returned ${allResults.length} results`);
    } catch (error) {
      console.error("Basic deep search also failed:", error);
      return `Error performing deep search: ${(error as Error).message}`;
    }
  }

  // Remove duplicates and prioritize authoritative sources
  const uniqueResults = removeDuplicateResults(allResults);
  const prioritizedResults = prioritizeResults(uniqueResults);
  
  // Extract and format the best results with source attribution
  const snippets = prioritizedResults
    .slice(0, 10) // Get more results for comprehensive research
    .map((result: any) => {
      const source = result.link || "Unknown source";
      const title = result.title || "No title";
      const snippet = result.snippet || "No description available";
      const domain = new URL(source).hostname;
      return `SOURCE: ${domain}\nTITLE: ${title}\nCONTENT: ${snippet}\n---`;
    })
    .join("\n\n");

  const resultSummary = `Deep ${search_type} research found ${prioritizedResults.length} relevant results from ${searchStrategies.length} specialized search strategies.`;
  const errorSummary = searchErrors.length > 0 ? `\nSearch errors: ${searchErrors.join(", ")}` : "";
  
  console.log(`Deep trivia search completed: ${resultSummary}`);
  return `${resultSummary}${errorSummary}\n\n${snippets || "No results found."}`;
}

// Function to capture and store agent response content
const captureAgentResponse = async (stream: ReadableStream<Uint8Array>, sessionId: string): Promise<ReadableStream<Uint8Array>> => {
  let responseContent = "";
  
  return new ReadableStream({
    async start(controller) {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          controller.enqueue(value);
          
          // Extract content from streaming chunks
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  responseContent += parsed.choices[0].delta.content;
                }
              } catch (e) {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
        
        // After the stream is complete, analyze the response and update memory
        if (responseContent.trim()) {
          // Check for repetitive content before storing
          if (!conversationMemory.isRepetitiveContent(sessionId, responseContent)) {
            const analysis = analyzeAgentResponse(responseContent);
            
            analysis.characters.forEach(character => {
              conversationMemory.addMentionedCharacter(sessionId, character);
            });
            
            analysis.concepts.forEach(concept => {
              conversationMemory.addExplainedConcept(sessionId, concept);
            });
            
            analysis.trivia.forEach(trivia => {
              conversationMemory.addSharedTrivia(sessionId, trivia);
            });
            
            // Store the response content to detect future repetition
            conversationMemory.addRecentMessage(sessionId, responseContent);
            
            console.log(`Updated conversation memory for session ${sessionId}:`, {
              characters: analysis.characters.length,
              concepts: analysis.concepts.length,
              trivia: analysis.trivia.length
            });
          } else {
            console.log(`Detected repetitive content in session ${sessionId}, not storing in memory`);
          }
        }
        
        controller.close();
      } catch (error) {
        console.error("Error processing stream:", error);
        controller.error(error);
      } finally {
        reader.releaseLock();
      }
    }
  });
};

export const prompt = async (
  payload: PromptPayload
): Promise<ReadableStream<Uint8Array>> => {
  console.log("Starting prompt with payload:", payload);
  console.log("Conversation history length:", payload.messages?.length || 0);
  if (payload.messages && payload.messages.length > 0) {
    console.log("Last user message:", payload.messages[payload.messages.length - 1]);
  }

  // Generate session ID if not provided
  const sessionId = payload.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Track topics from the latest user message
  if (payload.messages && payload.messages.length > 0) {
    const lastMessage = payload.messages[payload.messages.length - 1];
    if (lastMessage.role === "user" && typeof lastMessage.content === "string") {
      const topics = extractTopicsFromMessage(lastMessage.content);
      topics.forEach(topic => {
        conversationMemory.addDiscussedTopic(sessionId, topic);
      });
    }
  }

  if (!payload.messages || payload.messages.length === 0) {
    // If no messages are provided, create a default first message
    // to ask the AI to introduce itself.
    payload.messages = [{
        role: "user",
        content: "Introduce yourself based on your system prompt. Start by saying 'Hello there'."
    }];
    console.log("No messages provided. Starting with a default introduction prompt.");
  }

  const initialMessages: Array<ChatCompletionMessageParam> = [
    {
      role: "system",
      content: systemPromptWithDate(sessionId),
    },
    ...(payload.messages as Array<ChatCompletionMessageParam>),
  ];

  try {
    // === First Call to LLM: Decide if a tool is needed ===
    const firstResponse = await openAI.chat.completions.create({
      model: MODEL || "unknown",
      messages: initialMessages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = firstResponse.choices[0].message;
    const toolCalls = responseMessage.tool_calls;

    // If no tool is needed, stream the response directly
    if (!toolCalls) {
      console.log("LLM decided not to use a tool. Streaming response.");
      const baseStream = new ReadableStream({
        async start(controller) {
          const stream = await openAI.chat.completions.create({
            model: MODEL || "unknown",
            messages: initialMessages,
            stream: true,
          });
          for await (const chunk of stream) {
            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
            );
          }
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      
      return captureAgentResponse(baseStream, sessionId);
    }

    // === If a tool is needed, execute it ===
    console.log("LLM decided to use a tool.");
    initialMessages.push(responseMessage); // Add assistant's tool request to history

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      if (functionName === "web_search") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await web_search(functionArgs.query);
        
        // Add tool results to the conversation history
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        } as any);
      } else if (functionName === "deep_trivia_search") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await deep_trivia_search(functionArgs.query, functionArgs.search_type);
        
        // Add tool results to the conversation history
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        } as any);
      } else if (functionName === "verify_facts") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await verify_facts(functionArgs.query, functionArgs.initial_results);
        
        // Add tool results to the conversation history
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        } as any);
      } else if (functionName === "check_canon_status") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await check_canon_status(functionArgs.query, functionArgs.franchise);
        
        // Add tool results to the conversation history
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        } as any);
      } else if (functionName === "rag_enhanced_search") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await rag_enhanced_search(functionArgs.query, functionArgs.category, functionArgs.franchise);
        
        // Add tool results to the conversation history
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        } as any);
      } else if (functionName === "rag_validate_information") {
        const functionArgs = JSON.parse(toolCall.function.arguments);
        const functionResponse = await rag_validate_information(functionArgs.topic, functionArgs.category);
        
        // Add tool results to the conversation history
        initialMessages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: functionResponse,
        } as any);
      }
    }

    // === Second Call to LLM: Generate final answer with tool results ===
    console.log("Sending tool results to LLM for final answer.");
    const baseStream = new ReadableStream({
      async start(controller) {
        const finalStream = await openAI.chat.completions.create({
          model: MODEL || "unknown",
          messages: initialMessages,
          stream: true,
        });
        for await (const chunk of finalStream) {
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
        controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });
    
    return captureAgentResponse(baseStream, sessionId);

  } catch (error) {
    console.error("Error in prompt execution:", error);
    // Stream back an error message
    return new ReadableStream({
        start(controller) {
            const errorPayload = {
                type: 'error',
                error: error instanceof Error ? error.message : "Unknown error",
            };
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(errorPayload)}\n\n`));
            controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
            controller.close();
        }
    });
  }
};

// Implement canon status checking
async function check_canon_status(query: string, franchise: string): Promise<string> {
  console.log(`Checking canon status for: ${query} in ${franchise}`);
  if (!SERPER_API_KEY) {
    return "CANON STATUS: Unable to verify - API key not available.";
  }

  const searchUrl = "https://google.serper.dev/search";
  
  // Create canon-specific searches
  const canonSearches = [
    { q: `${query} ${franchise} canon official site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official canon" },
    { q: `${query} ${franchise} "not canon" OR "non-canon" OR "legends"`, description: "Non-canon identification" },
    { q: `${query} ${franchise} "fan theory" OR "speculation" OR "rumor"`, description: "Speculation identification" },
    { q: `${query} ${franchise} official statement site:variety.com OR site:hollywoodreporter.com`, description: "Official statements" }
  ];

  let canonResults: any[] = [];
  
  for (const search of canonSearches) {
    try {
      const searchPayload = JSON.stringify({ q: search.q });
      const response = await axios.post(searchUrl, searchPayload, {
        headers: {
          "X-API-KEY": SERPER_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });

      const results = response.data.organic || [];
      canonResults = canonResults.concat(results.map((r: any) => ({...r, searchType: search.description})));
      
    } catch (error) {
      console.error(`Canon search failed: ${(error as Error).message}`);
    }
  }

  return analyzeCanonStatus(canonResults, query, franchise);
}

// Analyze canon status from search results
function analyzeCanonStatus(results: any[], query: string, franchise: string): string {
  if (results.length === 0) {
    return `CANON STATUS: Unable to determine canon status for "${query}" in ${franchise}.`;
  }

  const officialSources = results.filter(r => 
    r.link?.includes('marvel.com') || 
    r.link?.includes('dc.com') || 
    r.link?.includes('starwars.com') ||
    r.link?.includes('disney.com')
  );

  const nonCanonIndicators = results.filter(r => 
    r.snippet?.toLowerCase().includes('not canon') ||
    r.snippet?.toLowerCase().includes('non-canon') ||
    r.snippet?.toLowerCase().includes('legends') ||
    r.title?.toLowerCase().includes('non-canon')
  );

  const speculationIndicators = results.filter(r => 
    r.snippet?.toLowerCase().includes('fan theory') ||
    r.snippet?.toLowerCase().includes('speculation') ||
    r.snippet?.toLowerCase().includes('rumor') ||
    r.title?.toLowerCase().includes('theory')
  );

  let status = "UNKNOWN";
  let explanation = "";

  if (officialSources.length >= 1 && nonCanonIndicators.length === 0) {
    status = "CANON";
    explanation = `Confirmed as official canon by ${franchise} official sources`;
  } else if (nonCanonIndicators.length >= 1) {
    status = "NON-CANON";
    explanation = `Identified as non-canon or "Legends" material`;
  } else if (speculationIndicators.length >= 2) {
    status = "SPECULATION/FAN THEORY";
    explanation = `Appears to be fan speculation or theory, not official`;
  } else if (officialSources.length === 0 && results.length > 0) {
    status = "UNVERIFIED";
    explanation = `No official sources found to confirm canon status`;
  }

  return `CANON STATUS: ${status}
Franchise: ${franchise}
Explanation: ${explanation}
Sources checked: ${results.length} (${officialSources.length} official)`;
}

// Implement RAG-enhanced search function
async function rag_enhanced_search(query: string, category?: string, franchise?: string): Promise<string> {
  console.log(`Performing RAG-enhanced search for: ${query}`);
  
  try {
    // Use RAG service for enhanced search
    const ragResult = await ragService.enhancedSearch(query, category, franchise);
    
    let response = `RAG-ENHANCED SEARCH RESULTS:\n`;
    response += `Overall Confidence: ${ragResult.confidence}\n`;
    response += `Web Search Needed: ${ragResult.webSearchNeeded ? 'Yes' : 'No'}\n\n`;
    
    // Add RAG results
    if (ragResult.ragResults.length > 0) {
      response += `KNOWLEDGE BASE RESULTS:\n`;
      ragResult.ragResults.forEach((entry, index) => {
        response += `${index + 1}. ${entry.title}\n`;
        response += `   Content: ${entry.content}\n`;
        response += `   Category: ${entry.category}\n`;
        response += `   Franchise: ${entry.franchise}\n`;
        if (entry.releaseDate) {
          response += `   Release Date: ${entry.releaseDate}\n`;
        }
        response += `   Status: ${entry.status}\n`;
        response += `   Confidence: ${entry.confidence}\n`;
        response += `   Canon Status: ${entry.canonStatus}\n`;
        response += `   Sources: ${entry.sources.join(', ')}\n`;
        response += `   Last Updated: ${entry.lastUpdated}\n\n`;
      });
    }
    
    // Add recommendations
    if (ragResult.recommendations.length > 0) {
      response += `RECOMMENDATIONS:\n`;
      ragResult.recommendations.forEach(rec => {
        response += `- ${rec}\n`;
      });
      response += `\n`;
    }
    
    // If web search is needed, perform it
    if (ragResult.webSearchNeeded) {
      response += `PERFORMING WEB SEARCH FOR ADDITIONAL INFORMATION...\n\n`;
      const webResults = await web_search(query);
      response += webResults;
    }
    
    return response;
    
  } catch (error) {
    console.error(`RAG-enhanced search failed: ${(error as Error).message}`);
    // Fallback to regular web search
    return `RAG search failed, falling back to web search:\n\n${await web_search(query)}`;
  }
}

// Implement RAG validation function
async function rag_validate_information(topic: string, category?: string): Promise<string> {
  console.log(`Validating information for: ${topic}`);
  
  try {
    // Use RAG service for validation
    const validation = await ragService.validateInformation(topic, category);
    
    let response = `INFORMATION VALIDATION RESULTS:\n`;
    response += `Topic: ${topic}\n`;
    response += `Is Current: ${validation.isCurrent ? 'Yes' : 'No'}\n`;
    response += `Confidence: ${validation.confidence}\n`;
    response += `Needs Update: ${validation.needsUpdate ? 'Yes' : 'No'}\n`;
    
    if (validation.lastUpdated) {
      response += `Last Updated: ${validation.lastUpdated}\n`;
    }
    
    // Check for conflicts
    const conflicts = await ragService.checkConflicts(topic);
    if (conflicts.hasConflicts) {
      response += `\nCONFLICTS DETECTED:\n`;
      conflicts.conflicts.forEach(conflict => {
        response += `- ${conflict.description}\n`;
      });
    } else {
      response += `\nNo conflicts detected.\n`;
    }
    
    // Get canonical information if available
    const canonicalInfo = await ragService.getCanonicalInfo(topic);
    if (canonicalInfo) {
      response += `\nCANONICAL INFORMATION:\n`;
      response += `Title: ${canonicalInfo.title}\n`;
      response += `Content: ${canonicalInfo.content}\n`;
      response += `Canon Status: ${canonicalInfo.canonStatus}\n`;
      response += `Confidence: ${canonicalInfo.confidence}\n`;
    }
    
    return response;
    
  } catch (error) {
    console.error(`RAG validation failed: ${(error as Error).message}`);
    return `Validation failed: ${(error as Error).message}`;
  }
}