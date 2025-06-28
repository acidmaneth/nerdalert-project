import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import axios from "axios"; // Import axios
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat";

import type { PromptPayload } from "./types.js";
import { conversationMemory, extractTopicsFromMessage, analyzeAgentResponse } from "./conversation-memory.js";
import { RAGService } from "../rag/rag-service.js";
import {
  MODEL,
  LLM_API_KEY,
  LLM_BASE_URL,
  SYSTEM_PROMPT,
  SEARCH_PROVIDER,
  BRAVE_API_KEY,
} from "../constants.js";

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

// Update cleanContent to preserve <think> tags while removing other internal tags
const cleanContent = (content: string): string => {
  return content
    .replace(/<processing>[\s\S]*?<\/processing>/g, '')
    .replace(/<analysis>[\s\S]*?<\/analysis>/g, '')
    .replace(/<internal>[\s\S]*?<\/internal>/g, '')
    .replace(/<search>[\s\S]*?<\/search>/g, '')
    .replace(/<verify>[\s\S]*?<\/verify>/g, '')
    .replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '')
    .replace(/\[PROCESSING\][\s\S]*?\[\/PROCESSING\]/g, '')
    .replace(/\[ANALYSIS\][\s\S]*?\[\/ANALYSIS\]/g, '')
    .replace(/\[INTERNAL\][\s\S]*?\[\/INTERNAL\]/g, '')
    .replace(/\*\*THINKING\*\*[\s\S]*?\*\*\/THINKING\*\*/g, '')
    .replace(/\*\*PROCESSING\*\*[\s\S]*?\*\*\/PROCESSING\*\*/g, '')
    .replace(/\*\*ANALYSIS\*\*[\s\S]*?\*\*\/ANALYSIS\*\*/g, '')
    .replace(/\*\*INTERNAL\*\*[\s\S]*?\*\*\/INTERNAL\*\*/g, '');
    // Note: <think> tags are preserved so frontend can extract thinking content
};

// Generate conversation memory context
const generateMemoryContext = (sessionId?: string): string => {
  if (!sessionId) return "";
  
  const memorySummary = conversationMemory.getMemorySummary(sessionId);
  return memorySummary ? `\n\n${memorySummary}` : "";
};

const systemPromptWithDate = (sessionId?: string) => `${systemPrompt}

CURRENT CONTEXT: Today is ${currentDateTime.date}, ${currentDateTime.year}

ACCURACY RULES:
- Always search for current information, especially for dates and cast details
- Verify information using smart_search for character/cast questions  
- Use verify_information for fact-checking when needed
- Distinguish between official canon and speculation
- Provide confidence levels when sharing information

CONVERSATION STYLE:
- Be enthusiastic and engaging about pop culture
- Don't repeat information already discussed in this session
- Answer directly without over-analyzing
- Match the user's energy level${generateMemoryContext(sessionId)}
`;

// Brave Search function
async function performWebSearch(query: string): Promise<any[]> {
  console.log(`Using Brave search for: ${query}`);
  
  try {
    if (!BRAVE_API_KEY) throw new Error("BRAVE_API_KEY is not set");
    
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
      timeout: 10000,
    });
    return braveResponse.data.web?.results || [];
  } catch (error) {
    console.error(`Brave search failed:`, (error as Error).message);
    return [];
  }
}

// Normalize Brave search results
function normalizeSearchResults(results: any[]): any[] {
  return results.map(result => ({
    title: result.title,
    link: result.url,
    snippet: result.description,
    source: 'brave'
  }));
}

// CONSOLIDATED TOOL 1: Smart Search (replaces web_search, deep_trivia_search, rag_enhanced_search)
async function smart_search(query: string, type: string = "general"): Promise<string> {
  console.log(`Performing smart search for: ${query} (type: ${type})`);
  
  // First try RAG for verified information
  try {
    if (type !== "general") {
      const ragResult = await ragService.enhancedSearch(query, type === "character" ? "character" : undefined);
      if (ragResult.ragResults.length > 0 && ragResult.confidence === "HIGH") {
        let response = `VERIFIED INFORMATION (HIGH CONFIDENCE):\n`;
        ragResult.ragResults.forEach((entry, index) => {
          response += `${index + 1}. ${entry.title}\n`;
          response += `   ${entry.content}\n`;
          response += `   Sources: ${entry.sources.join(', ')}\n\n`;
        });
        return response;
      }
    }
  } catch (error) {
    console.log("RAG search failed, falling back to web search");
  }

  // Fallback to web search with focused strategies
  let searchStrategies: Array<{q: string, description: string}> = [];

  // Focused search strategies based on type
  switch (type) {
    case "character":
      searchStrategies = [
        { q: `${query} cast actor site:imdb.com`, description: "IMDB cast info" },
        { q: `${query} character site:*.fandom.com`, description: "Character wiki" },
        { q: `${query} site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official sources" },
        { q: `${query} actor site:variety.com OR site:hollywoodreporter.com`, description: "Entertainment news" }
      ];
      break;
    case "trivia":
      searchStrategies = [
        { q: `${query} trivia facts site:imdb.com OR site:*.fandom.com`, description: "Trivia facts" },
        { q: `${query} behind the scenes site:variety.com`, description: "Behind scenes" },
        { q: `${query} easter eggs site:screenrant.com`, description: "Easter eggs" }
      ];
      break;
    case "canon":
      searchStrategies = [
        { q: `${query} canon official site:marvel.com OR site:dc.com OR site:starwars.com`, description: "Official canon" },
        { q: `${query} canon site:*.fandom.com`, description: "Canon wiki" },
        { q: `${query} official statement site:variety.com`, description: "Official statements" }
      ];
      break;
    default: // general
      searchStrategies = [
        { q: `${query} site:*.fandom.com OR site:imdb.com`, description: "Primary sources" },
        { q: `${query} site:variety.com OR site:hollywoodreporter.com`, description: "News sources" },
        { q: query, description: "General search" }
      ];
  }

  let allResults: any[] = [];
  let searchErrors: string[] = [];

  // Perform focused searches using the configured provider
  for (const strategy of searchStrategies) {
    try {
      const results = await performWebSearch(strategy.q);
      const normalizedResults = normalizeSearchResults(results);
      allResults = allResults.concat(normalizedResults);
    } catch (error) {
      searchErrors.push(`${strategy.description} failed`);
      console.error(`Search strategy failed: ${(error as Error).message}`);
    }
  }

  if (allResults.length === 0) {
    return `No results found for "${query}". ${searchErrors.length > 0 ? `Errors: ${searchErrors.join(", ")}` : ""}`;
  }

  // Remove duplicates and prioritize results
  const uniqueResults = removeDuplicateResults(allResults);
  const prioritizedResults = prioritizeResults(uniqueResults);
  
  // Format results
  const snippets = prioritizedResults
    .slice(0, 5) // Limit to 5 results for clarity
    .map((result: any) => {
      const source = new URL(result.link || "").hostname;
      const title = result.title || "No title";
      const snippet = result.snippet || "No description available";
      return `SOURCE: ${source}\nTITLE: ${title}\nCONTENT: ${snippet}\n---`;
    })
    .join("\n\n");

  return `SEARCH RESULTS (${prioritizedResults.length} found):\n\n${snippets}`;
}

// CONSOLIDATED TOOL 2: Information Verification (replaces verify_facts, check_canon_status, etc.)
async function verify_information(content: string, verification_type: string = "facts"): Promise<string> {
  console.log(`Verifying information: ${content} (type: ${verification_type})`);

  let searchStrategies: Array<{q: string, description: string}> = [];

  switch (verification_type) {
    case "canon":
      searchStrategies = [
        { q: `"${content}" canon official`, description: "Canon verification" },
        { q: `"${content}" non-canon legends`, description: "Non-canon check" },
        { q: `"${content}" official statement`, description: "Official statements" }
      ];
      break;
    case "fake_detection":
      searchStrategies = [
        { q: `"${content}" debunked fake hoax`, description: "Debunking check" },
        { q: `"${content}" confirmed false`, description: "False confirmation" },
        { q: `"${content}" official source`, description: "Official verification" }
      ];
      break;
    default: // facts
      searchStrategies = [
        { q: `"${content}" site:imdb.com OR site:marvel.com OR site:dc.com`, description: "Official sources" },
        { q: `"${content}" verified confirmed`, description: "Verification check" },
        { q: `"${content}" fact check`, description: "Fact checking" }
      ];
  }

  let verificationResults: any[] = [];
  
  for (const strategy of searchStrategies) {
    try {
      const results = await performWebSearch(strategy.q);
      const normalizedResults = normalizeSearchResults(results);
      verificationResults = verificationResults.concat(normalizedResults);
    } catch (error) {
      console.error(`Verification strategy failed: ${(error as Error).message}`);
    }
  }

  // Analyze verification results
  const officialSources = verificationResults.filter(r => 
    r.link?.includes('marvel.com') || r.link?.includes('dc.com') || 
    r.link?.includes('starwars.com') || r.link?.includes('imdb.com')
  ).length;

  const conflictingInfo = verificationResults.filter(r => 
    r.snippet?.toLowerCase().includes('false') || 
    r.snippet?.toLowerCase().includes('debunked') ||
    r.snippet?.toLowerCase().includes('non-canon')
  ).length;

  let confidence = "MEDIUM";
  let status = "UNVERIFIED";

  if (officialSources >= 2 && conflictingInfo === 0) {
    confidence = "HIGH";
    status = verification_type === "canon" ? "CANON" : "VERIFIED";
  } else if (conflictingInfo > 0) {
    confidence = "LOW";
    status = verification_type === "fake_detection" ? "POTENTIALLY_FALSE" : "CONFLICTING";
  }

  return `VERIFICATION RESULT:
Content: ${content}
Status: ${status}
Confidence: ${confidence}
Sources Checked: ${verificationResults.length} (${officialSources} official)
Type: ${verification_type.toUpperCase()}`;
}

// CONSOLIDATED TOOL 3: Simple RAG Lookup
async function rag_lookup(query: string, category?: string, franchise?: string): Promise<string> {
  console.log(`RAG lookup for: ${query}`);
  
  try {
    const ragResult = await ragService.enhancedSearch(query, category, franchise);
    
    if (ragResult.ragResults.length === 0) {
      return `RAG LOOKUP: No verified information found for "${query}". Consider using smart_search for web results.`;
    }
    
    let response = `RAG KNOWLEDGE BASE RESULTS:\n`;
    response += `Confidence: ${ragResult.confidence}\n\n`;
    
    ragResult.ragResults.forEach((entry, index) => {
      response += `${index + 1}. ${entry.title}\n`;
      response += `   ${entry.content}\n`;
      response += `   Category: ${entry.category} | Franchise: ${entry.franchise}\n`;
      response += `   Status: ${entry.status} | Canon: ${entry.canonStatus}\n`;
      response += `   Sources: ${entry.sources.join(', ')}\n\n`;
    });
    
    if (ragResult.recommendations.length > 0) {
      response += `RECOMMENDATIONS:\n${ragResult.recommendations.map(r => `- ${r}`).join('\n')}`;
    }
    
    return response;
  } catch (error) {
    return `RAG LOOKUP ERROR: ${(error as Error).message}`;
  }
}

// Update the tools array to use only the 3 consolidated tools
const tools = [
  {
    type: "function" as const,
    function: {
      name: "smart_search",
      description: "Intelligent search that combines RAG knowledge base with web search. Automatically selects the best search strategy based on query type.",
      parameters: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The search query to look up.",
          },
          type: {
            type: "string",
            description: "Type of search: 'general', 'character', 'trivia', or 'canon'",
            enum: ["general", "character", "trivia", "canon"]
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "verify_information",
      description: "Verify information accuracy, canon status, or detect fake content using multiple authoritative sources.",
      parameters: {
        type: "object" as const,
        properties: {
          content: {
            type: "string",
            description: "The information or claim to verify.",
          },
          verification_type: {
            type: "string",
            description: "Type of verification: 'facts', 'canon', or 'fake_detection'",
            enum: ["facts", "canon", "fake_detection"]
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "rag_lookup",
      description: "Look up verified information from the RAG knowledge base. Use this for well-established facts about movies, characters, and franchises.",
      parameters: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "The query to look up in the knowledge base.",
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
  },
];

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
    // Cast and actor databases (highest priority for character info)
    'imdb.com': 11, 'rottentomatoes.com': 10, 'metacritic.com': 10,
    
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
    'boxofficemojo.com': 7, 'comicbook.com': 7,
    
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
          
          // Process the chunk to clean content before forwarding
          const lines = chunk.split('\n');
          let cleanedChunk = '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                cleanedChunk += line + '\n';
                continue;
              }
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                  // Clean any remaining internal tags from the content (but preserve <think> tags)
                  const cleanDeltaContent = cleanContent(parsed.choices[0].delta.content);
                  
                  if (cleanDeltaContent) {
                    // Update the parsed object with cleaned content
                    parsed.choices[0].delta.content = cleanDeltaContent;
                    cleanedChunk += `data: ${JSON.stringify(parsed)}\n\n`;
                    responseContent += cleanDeltaContent;
                  }
                } else {
                  // Forward non-content chunks as-is
                  cleanedChunk += line + '\n';
                }
              } catch (e) {
                // Forward invalid JSON lines as-is
                cleanedChunk += line + '\n';
              }
            } else {
              // Forward non-data lines as-is
              cleanedChunk += line + '\n';
            }
          }
          
          // Only enqueue if there's content to send
          if (cleanedChunk.trim()) {
            controller.enqueue(new TextEncoder().encode(cleanedChunk));
          }
        }
        
        // After the stream is complete, analyze the response and update memory (simplified)
        if (responseContent.trim()) {
          // Check for repetitive content before storing
          if (!conversationMemory.isRepetitiveContent(sessionId, responseContent)) {
            // Simplified analysis - just extract basic topics
            const analysis = analyzeAgentResponse(responseContent);
            
            // Only track characters as topics (simplified)
            analysis.characters.forEach(character => {
              conversationMemory.addDiscussedTopic(sessionId, character);
            });
            
            // Store the response content to detect future repetition
            conversationMemory.addRecentMessage(sessionId, responseContent);
            
            console.log(`Updated conversation memory for session ${sessionId}: ${analysis.characters.length} topics tracked`);
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

// Remove all the old individual tool functions and replace with consolidated ones in the prompt function
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
      const functionArgs = JSON.parse(toolCall.function.arguments);
      let functionResponse = "";

      if (functionName === "smart_search") {
        functionResponse = await smart_search(functionArgs.query, functionArgs.type || "general");
      } else if (functionName === "verify_information") {
        functionResponse = await verify_information(functionArgs.content, functionArgs.verification_type || "facts");
      } else if (functionName === "rag_lookup") {
        functionResponse = await rag_lookup(functionArgs.query, functionArgs.category, functionArgs.franchise);
      } else {
        functionResponse = `Error: Unknown tool '${functionName}'.`;
      }
      
      // Add tool results to the conversation history
      initialMessages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: functionResponse,
      } as any);
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
