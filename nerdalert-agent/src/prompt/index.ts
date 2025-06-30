import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import axios from "axios"; // Import axios
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat";

import type { PromptPayload } from "./types.js";
import { conversationMemory, extractTopicsFromMessage, analyzeAgentResponse, detectCorrection } from "./conversation-memory.js";
import { RAGService } from "../rag/rag-service.js";
import { performWebSearch, performEnhancedSearch, searchForMovieInfo, searchForActorInfo, searchForLatestNews, searchForWikiInfo } from "../search-service.js";
import {
  MODEL,
  LLM_API_KEY,
  LLM_BASE_URL,
  SYSTEM_PROMPT,
  SEARCH_PROVIDER,
  BRAVE_API_KEY,
  SERPER_API_KEY,
  SEARCH_FALLBACK_ENABLED,
  SEARCH_TIMEOUT,
  SEARCH_MAX_RETRIES,
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

// NEW: Enhanced date validation with cross-referencing
const validateAndCrossReferenceDates = async (content: string, searchResults: any[]): Promise<{
  validatedContent: string;
  warnings: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> => {
  const warnings: string[] = [];
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
  
  // Extract all years mentioned in content
  const yearMatches = content.match(/\b(19|20)\d{2}\b/g) || [];
  const uniqueYears = [...new Set(yearMatches)].map(y => parseInt(y));
  
  // Extract movie titles and cast information
  const movieTitles = extractMovieTitles(content);
  const castInfo = extractCastInfo(content);
  
  // Validate each year against current year
  for (const year of uniqueYears) {
    if (year > currentDateTime.year) {
      warnings.push(`FUTURE DATE WARNING: Year ${year} is in the future. Current year is ${currentDateTime.year}.`);
      confidence = 'LOW';
    }
  }
  
  // Cross-reference movie titles with release dates
  for (const title of movieTitles) {
    const titleValidation = await crossReferenceMovieTitle(title, searchResults);
    if (titleValidation.warning) {
      warnings.push(titleValidation.warning);
      if (titleValidation.confidence === 'LOW') confidence = 'LOW';
    }
  }
  
  // Cross-reference cast information with movie titles
  for (const cast of castInfo) {
    const castValidation = await crossReferenceCastInfo(cast, searchResults);
    if (castValidation.warning) {
      warnings.push(castValidation.warning);
      if (castValidation.confidence === 'LOW') confidence = 'LOW';
    }
  }
  
  // Add validation warnings to content if any
  let validatedContent = content;
  if (warnings.length > 0) {
    validatedContent += `\n\n⚠️ DATE VALIDATION WARNINGS:\n${warnings.map(w => `• ${w}`).join('\n')}`;
  }
  
  return { validatedContent, warnings, confidence };
};

// NEW: Extract movie titles from content
const extractMovieTitles = (content: string): string[] => {
  const titles: string[] = [];
  
  // Look for quoted titles
  const quotedMatches = content.match(/"([^"]+)"/g) || [];
  quotedMatches.forEach(match => {
    const title = match.replace(/"/g, '');
    if (title.length > 3 && title.length < 100) {
      titles.push(title);
    }
  });
  
  // Look for titles with years
  const yearMatches = content.match(/([A-Z][A-Za-z\s&:]+)\s*\((\d{4})\)/g) || [];
  yearMatches.forEach(match => {
    const titleMatch = match.match(/([A-Z][A-Za-z\s&:]+)\s*\((\d{4})\)/);
    if (titleMatch) {
      titles.push(titleMatch[1].trim());
    }
  });
  
  return [...new Set(titles)];
};

// NEW: Extract cast information from content
const extractCastInfo = (content: string): Array<{actor: string, character: string}> => {
  const castInfo: Array<{actor: string, character: string}> = [];
  
  // Look for "Actor (Character)" patterns
  const castMatches = content.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s*\(([^)]+)\)/g) || [];
  castMatches.forEach(match => {
    const castMatch = match.match(/([A-Z][a-z]+ [A-Z][a-z]+)\s*\(([^)]+)\)/);
    if (castMatch) {
      castInfo.push({
        actor: castMatch[1].trim(),
        character: castMatch[2].trim()
      });
    }
  });
  
  return castInfo;
};

// NEW: Cross-reference movie title with search results
const crossReferenceMovieTitle = async (title: string, searchResults: any[]): Promise<{
  warning?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> => {
  // Check if title appears in search results
  const titleInResults = searchResults.some(result => 
    result.title?.toLowerCase().includes(title.toLowerCase()) ||
    result.snippet?.toLowerCase().includes(title.toLowerCase())
  );
  
  if (!titleInResults) {
    // Search for the title specifically
    try {
      const titleSearch = await performWebSearch(`"${title}" release date site:imdb.com OR site:marvel.com OR site:dc.com`);
      if (!titleSearch.success || titleSearch.results.length === 0) {
        return {
          warning: `MOVIE TITLE WARNING: "${title}" not found in verified sources. This may be a rumor or incorrect information.`,
          confidence: 'LOW'
        };
      }
    } catch (error) {
      return {
        warning: `MOVIE TITLE WARNING: Could not verify "${title}" due to search error.`,
        confidence: 'MEDIUM'
      };
    }
  }
  
  return { confidence: 'HIGH' };
};

// NEW: Cross-reference cast information with search results
const crossReferenceCastInfo = async (cast: {actor: string, character: string}, searchResults: any[]): Promise<{
  warning?: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> => {
  // Check if cast info appears in search results
  const castInResults = searchResults.some(result => 
    result.snippet?.toLowerCase().includes(cast.actor.toLowerCase()) &&
    result.snippet?.toLowerCase().includes(cast.character.toLowerCase())
  );
  
  if (!castInResults) {
    // Search for the cast info specifically
    try {
      const castSearch = await performWebSearch(`"${cast.actor}" "${cast.character}" site:imdb.com OR site:marvel.com OR site:dc.com`);
      if (!castSearch.success || castSearch.results.length === 0) {
        return {
          warning: `CAST WARNING: "${cast.actor} as ${cast.character}" not found in verified sources. This may be incorrect.`,
          confidence: 'LOW'
        };
      }
    } catch (error) {
      return {
        warning: `CAST WARNING: Could not verify "${cast.actor} as ${cast.character}" due to search error.`,
        confidence: 'MEDIUM'
      };
    }
  }
  
  return { confidence: 'HIGH' };
};

// NEW: Enhanced release date verification
const verifyReleaseDates = async (content: string): Promise<{
  verifiedContent: string;
  warnings: string[];
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}> => {
  const warnings: string[] = [];
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
  
  // Extract all release date mentions
  const releaseDatePatterns = [
    /(\d{4})/g, // Years
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi, // Full dates
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/g // MM/DD/YYYY
  ];
  
  const allDates: string[] = [];
  releaseDatePatterns.forEach(pattern => {
    const matches = content.match(pattern) || [];
    allDates.push(...matches);
  });
  
  // Validate each date
  for (const dateStr of allDates) {
    const yearMatch = dateStr.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0]);
      
      if (year > currentDateTime.year) {
        warnings.push(`FUTURE RELEASE WARNING: ${dateStr} is in the future. Current year is ${currentDateTime.year}.`);
        confidence = 'LOW';
      } else if (year === currentDateTime.year) {
        // For current year, check if the date has passed
        const dateMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
          const month = parseInt(dateMatch[1]);
          const day = parseInt(dateMatch[2]);
          const year = parseInt(dateMatch[3]);
          
          if (year === currentDateTime.year && 
              (month < currentDateTime.month || 
               (month === currentDateTime.month && day < currentDateTime.day))) {
            warnings.push(`PAST RELEASE WARNING: ${dateStr} has already passed.`);
          }
        }
      }
    }
  }
  
  // Add verification to content
  let verifiedContent = content;
  if (warnings.length > 0) {
    verifiedContent += `\n\n⚠️ RELEASE DATE VERIFICATION:\n${warnings.map(w => `• ${w}`).join('\n')}`;
  }
  
  return { verifiedContent, warnings, confidence };
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

// NEW: Detect user intent and determine response format
const detectUserIntent = (userMessage: string): {
  intent: 'list' | 'conversation' | 'deep_dive' | 'quick_fact' | 'general';
  format: 'bulleted' | 'conversational' | 'detailed' | 'concise' | 'natural';
  instructions: string;
} => {
  const message = userMessage.toLowerCase();
  
  // List indicators
  const listPatterns = [
    /list of/i, /list the/i, /what are the/i, /name the/i, /give me a list/i,
    /top \d+/i, /best \d+/i, /worst \d+/i, /favorite \d+/i,
    /examples of/i, /types of/i, /kinds of/i, /sorts of/i,
    /bullet points/i, /bullet list/i, /numbered list/i,
    /all the/i, /every/i, /each/i, /multiple/i
  ];
  
  // Deep dive indicators
  const deepDivePatterns = [
    /deep dive/i, /in depth/i, /detailed/i, /comprehensive/i,
    /explain in detail/i, /tell me everything/i, /full story/i,
    /background/i, /history/i, /origin story/i, /behind the scenes/i,
    /how did/i, /why did/i, /what happened/i, /what's the story/i,
    /elaborate/i, /expand on/i, /more about/i, /tell me more/i
  ];
  
  // Quick fact indicators
  const quickFactPatterns = [
    /quick/i, /fast/i, /brief/i, /short/i, /simple/i,
    /just/i, /only/i, /basic/i, /main/i, /key/i,
    /what is/i, /who is/i, /when is/i, /where is/i,
    /one thing/i, /single/i, /fact/i, /info/i
  ];
  
  // Conversation indicators
  const conversationPatterns = [
    /what do you think/i, /your opinion/i, /your thoughts/i,
    /how do you feel/i, /do you like/i, /do you prefer/i,
    /compare/i, /versus/i, /vs/i, /better/i, /worse/i,
    /discuss/i, /talk about/i, /chat about/i, /conversation/i,
    /debate/i, /argue/i, /disagree/i, /agree/i
  ];
  
  // Check for list intent
  if (listPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: 'list',
      format: 'bulleted',
      instructions: `RESPONSE FORMAT: Use precise bullet points with short, direct descriptions. Get straight to the point with minimal added context. Keep each bullet concise and focused.`
    };
  }
  
  // Check for deep dive intent
  if (deepDivePatterns.some(pattern => pattern.test(message))) {
    return {
      intent: 'deep_dive',
      format: 'detailed',
      instructions: `RESPONSE FORMAT: Provide comprehensive, detailed explanations with rich context, background information, and thorough analysis. Be thorough and educational.`
    };
  }
  
  // Check for quick fact intent
  if (quickFactPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: 'quick_fact',
      format: 'concise',
      instructions: `RESPONSE FORMAT: Keep responses brief and to the point. Provide essential information only with minimal elaboration.`
    };
  }
  
  // Check for conversation intent
  if (conversationPatterns.some(pattern => pattern.test(message))) {
    return {
      intent: 'conversation',
      format: 'conversational',
      instructions: `RESPONSE FORMAT: Use natural, conversational language with personal opinions, engaging dialogue, and interactive elements. Be more casual and opinionated.`
    };
  }
  
  // Default to general
  return {
    intent: 'general',
    format: 'natural',
    instructions: `RESPONSE FORMAT: Use natural, balanced responses that match the user's energy and provide appropriate detail level.`
  };
};

// Helper function to extract text content from Content type
const extractTextContent = (content: string | Array<{type: string, text?: string, image_url?: any}>): string => {
  if (typeof content === 'string') {
    return content;
  }
  
  // Handle ContentPart array
  return content
    .filter(part => part.type === 'text' && part.text)
    .map(part => part.text)
    .join(' ');
};

const systemPromptWithDate = (sessionId?: string, userMessage?: string) => {
  const intent = userMessage ? detectUserIntent(userMessage) : {
    intent: 'general',
    format: 'natural',
    instructions: `RESPONSE FORMAT: Use natural, balanced responses that match the user's energy and provide appropriate detail level.`
  };
  
  return `${systemPrompt}

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
- Match the user's energy level

${intent.instructions}${generateMemoryContext(sessionId)}
`;
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
  
  // Check if user is correcting the agent
  let isCorrection = false;
  let correctionInfo = null;
  
  if (payload.messages && payload.messages.length > 0) {
    const lastMessage = payload.messages[payload.messages.length - 1];
    if (lastMessage.role === "user" && typeof lastMessage.content === "string") {
      correctionInfo = detectCorrection(lastMessage.content);
      isCorrection = correctionInfo.isCorrection;
      
      if (isCorrection) {
        console.log("User correction detected:", correctionInfo);
        // Store the correction in memory
        if (correctionInfo.correctedInfo) {
          conversationMemory.addCorrection(sessionId, {
            originalClaim: "Previous incorrect information",
            correctedInfo: correctionInfo.correctedInfo,
            topic: "User correction",
            confidence: correctionInfo.confidence || 'MEDIUM'
          });
        }
      }
    }
  }
  
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
      content: systemPromptWithDate(sessionId, extractTextContent(payload.messages[payload.messages.length - 1].content)),
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
      } else if (functionName === "check_accuracy_before_response") {
        functionResponse = await check_accuracy_before_response(functionArgs.claim, functionArgs.topic);
      } else if (functionName === "handle_user_correction") {
        functionResponse = await handle_user_correction(functionArgs.correction, functionArgs.originalTopic);
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

// NEW: Enhanced web content reading function
async function readWebsiteContent(url: string): Promise<{
  content: string;
  title: string;
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`Reading website content from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Extract text content from HTML
    const html = response.data;
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
      .replace(/<[^>]+>/g, ' ') // Remove HTML tags
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title found';
    
    return {
      content: textContent.substring(0, 5000), // Limit content length
      title,
      success: true
    };
  } catch (error) {
    console.error(`Failed to read website: ${url}`, error);
    return {
      content: '',
      title: '',
      success: false,
      error: (error as Error).message
    };
  }
}

// NEW: Direct IMDB lookup function
async function lookupIMDBMovie(movieTitle: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    year?: string;
    cast?: string[];
    director?: string;
    status: 'released' | 'post-production' | 'filming' | 'announced' | 'rumored';
    releaseDate?: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up IMDB movie: ${movieTitle}`);
    
    // Search IMDB for the movie
    const searchQuery = `${movieTitle} site:imdb.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No IMDB results found' };
    }
    
    // Get the first IMDB result
    const imdbUrl = searchResults.results[0].link;
    if (!imdbUrl.includes('imdb.com')) {
      return { found: false, error: 'No IMDB URL found' };
    }
    
    // Read the IMDB page content
    const pageContent = await readWebsiteContent(imdbUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    // Extract movie information from IMDB page
    const content = pageContent.content.toLowerCase();
    const pageTitle = pageContent.title;
    
    // Determine status based on content
    let status: 'released' | 'post-production' | 'filming' | 'announced' | 'rumored' = 'rumored';
    if (content.includes('released') || content.includes('in theaters')) {
      status = 'released';
    } else if (content.includes('post-production') || content.includes('post production')) {
      status = 'post-production';
    } else if (content.includes('filming') || content.includes('in production')) {
      status = 'filming';
    } else if (content.includes('announced') || content.includes('confirmed')) {
      status = 'announced';
    }
    
    // Extract year from title or content
    const yearMatch = pageTitle.match(/\((\d{4})\)/) || content.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[1] : undefined;
    
    // Extract cast information (simplified)
    const castMatches = content.match(/([a-z]+ [a-z]+)\s*as\s*([a-z\s]+)/gi);
    const cast = castMatches ? castMatches.slice(0, 5).map(match => match.trim()) : [];
    
    return {
      found: true,
      data: {
        title: pageTitle.replace(/\([^)]*\)/g, '').trim(),
        year,
        cast,
        status,
        releaseDate: year
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Direct IMDB cast lookup function
async function lookupIMDBCast(actorName: string): Promise<{
  found: boolean;
  data?: {
    actor: string;
    recentRoles: string[];
    currentProjects: string[];
  };
  error?: string;
}> {
  try {
    console.log(`Looking up IMDB cast: ${actorName}`);
    
    // Search IMDB for the actor
    const searchQuery = `${actorName} site:imdb.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No IMDB results found' };
    }
    
    // Get the first IMDB result
    const imdbUrl = searchResults.results[0].link;
    if (!imdbUrl.includes('imdb.com')) {
      return { found: false, error: 'No IMDB URL found' };
    }
    
    // Read the IMDB page content
    const pageContent = await readWebsiteContent(imdbUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    
    // Extract recent roles (simplified)
    const roleMatches = content.match(/([a-z\s]+)\s*\((\d{4})\)/gi);
    const recentRoles = roleMatches ? roleMatches.slice(0, 10).map(match => match.trim()) : [];
    
    // Extract current projects
    const projectMatches = content.match(/([a-z\s]+)\s*\((\d{4}|announced|post-production|filming)\)/gi);
    const currentProjects = projectMatches ? projectMatches.slice(0, 5).map(match => match.trim()) : [];
    
    return {
      found: true,
      data: {
        actor: actorName,
        recentRoles,
        currentProjects
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Fact verification function
async function verifyFact(claim: string, context: string): Promise<{
  verified: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
  corrections?: string[];
  warnings?: string[];
}> {
  try {
    console.log(`Verifying fact: ${claim}`);
    
    const warnings: string[] = [];
    const corrections: string[] = [];
    const sources: string[] = [];
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    
    // Search for the claim in authoritative sources
    const searchQueries = [
      `"${claim}" site:imdb.com`,
      `"${claim}" site:marvel.com`,
      `"${claim}" site:dc.com`,
      `"${claim}" site:variety.com`,
      `"${claim}" site:hollywoodreporter.com`
    ];
    
    let verificationCount = 0;
    let officialSourceCount = 0;
    
    for (const query of searchQueries) {
      try {
        const results = await performWebSearch(query);
        if (results.success && results.results.length > 0) {
          verificationCount++;
          const sitePart = query.split('site:')[1];
          if (sitePart) {
            sources.push(sitePart);
          }
          
          if (query.includes('imdb.com') || query.includes('marvel.com') || query.includes('dc.com')) {
            officialSourceCount++;
          }
          
          // Read the first result to verify the claim
          const firstResult = results.results[0];
          if (firstResult && firstResult.link) {
            const pageContent = await readWebsiteContent(firstResult.link);
            
            if (pageContent.success) {
              const content = pageContent.content.toLowerCase();
              const claimLower = claim.toLowerCase();
              
              // Check if the claim is actually mentioned in the content
              if (content.includes(claimLower)) {
                verificationCount++;
              } else {
                warnings.push(`Claim "${claim}" not found in ${firstResult.link}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Verification query failed: ${query}`, error);
      }
    }
    
    // Determine confidence level
    if (officialSourceCount >= 2 && verificationCount >= 3) {
      confidence = 'HIGH';
    } else if (verificationCount >= 1) {
      confidence = 'MEDIUM';
    }
    
    // Check for contradictions
    const contradictionQuery = `"${claim}" false incorrect debunked`;
    try {
      const contradictionResults = await performWebSearch(contradictionQuery);
      if (contradictionResults.success && contradictionResults.results.length > 0) {
        warnings.push(`Potential contradiction found for claim: ${claim}`);
        confidence = 'LOW';
      }
    } catch (error) {
      // Ignore contradiction search errors
    }
    
    return {
      verified: confidence !== 'LOW',
      confidence,
      sources,
      corrections,
      warnings
    };
  } catch (error) {
    return {
      verified: false,
      confidence: 'LOW',
      sources: [],
      warnings: [`Verification failed: ${(error as Error).message}`]
    };
  }
}

// NEW: Enhanced research function with full context and multiple sources
async function researchWithFullContext(query: string): Promise<{
  facts: Array<{
    claim: string;
    verified: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    sources: string[];
    warnings?: string[];
    sourceTypes?: string[];
  }>;
  summary: string;
  recommendations: string[];
  sourceDiversity: string[];
}> {
  console.log(`Researching with full context and multiple sources: ${query}`);
  
  const facts: Array<{
    claim: string;
    verified: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    sources: string[];
    warnings?: string[];
    sourceTypes?: string[];
  }> = [];
  
  const recommendations: string[] = [];
  const sourceDiversity: string[] = [];
  
  try {
    // Extract potential claims from the query
    const claims = extractClaimsFromQuery(query);
    
    // Research each claim individually with multiple sources
    for (const claim of claims) {
      const verification = await verifyFactWithMultipleSources(claim, query);
      facts.push({
        claim,
        verified: verification.verified,
        confidence: verification.confidence,
        sources: verification.sources,
        warnings: verification.warnings,
        sourceTypes: verification.sourceTypes
      });
      
      // Track source diversity
      verification.sourceTypes.forEach(type => {
        if (!sourceDiversity.includes(type)) {
          sourceDiversity.push(type);
        }
      });
    }
    
    // Content-specific database lookups
    const lowerQuery = query.toLowerCase();
    
    // Literature lookups
    if (lowerQuery.includes('book') || lowerQuery.includes('novel') || lowerQuery.includes('author')) {
      const bookTitle = extractBookTitleFromQuery(query);
      if (bookTitle) {
        const literatureData = await lookupLiteratureDatabase(bookTitle);
        if (literatureData.found && literatureData.data) {
          facts.push({
            claim: `${bookTitle} by ${literatureData.data.author} (${literatureData.data.publicationYear || 'Unknown year'})`,
            verified: true,
            confidence: 'HIGH',
            sources: ['goodreads.com'],
            sourceTypes: ['literature-database']
          });
          
          if (literatureData.data.rating) {
            facts.push({
              claim: `${bookTitle} has a rating of ${literatureData.data.rating}/5 on Goodreads`,
              verified: true,
              confidence: 'HIGH',
              sources: ['goodreads.com'],
              sourceTypes: ['literature-database']
            });
          }
        }
      }
    }
    
    // Comic lookups
    if (lowerQuery.includes('comic') || lowerQuery.includes('graphic novel')) {
      const comicTitle = extractComicTitleFromQuery(query);
      if (comicTitle) {
        const comicData = await lookupComicDatabase(comicTitle);
        if (comicData.found && comicData.data) {
          facts.push({
            claim: `${comicTitle} published by ${comicData.data.publisher} (${comicData.data.publicationYear || 'Unknown year'})`,
            verified: true,
            confidence: 'HIGH',
            sources: ['comicvine.com'],
            sourceTypes: ['comic-database']
          });
        }
      }
    }
    
    // Gaming lookups
    if (lowerQuery.includes('game') || lowerQuery.includes('gaming')) {
      const gameTitle = extractGameTitleFromQuery(query);
      if (gameTitle) {
        const gameData = await lookupGamingDatabase(gameTitle);
        if (gameData.found && gameData.data) {
          facts.push({
            claim: `${gameTitle} developed by ${gameData.data.developer} (${gameData.data.releaseYear || 'Unknown year'})`,
            verified: true,
            confidence: 'HIGH',
            sources: ['metacritic.com'],
            sourceTypes: ['gaming-database']
          });
          
          if (gameData.data.rating) {
            facts.push({
              claim: `${gameTitle} has a Metacritic score of ${gameData.data.rating}/100`,
              verified: true,
              confidence: 'HIGH',
              sources: ['metacritic.com'],
              sourceTypes: ['gaming-database']
            });
          }
        }
      }
    }
    
    // Movie/TV lookups (existing IMDB integration)
    if (lowerQuery.includes('movie') || lowerQuery.includes('film')) {
      const movieTitle = extractMovieTitleFromQuery(query);
      if (movieTitle) {
        const imdbData = await lookupIMDBMovie(movieTitle);
        if (imdbData.found && imdbData.data) {
          facts.push({
            claim: `${movieTitle} status: ${imdbData.data.status}`,
            verified: true,
            confidence: 'HIGH',
            sources: ['imdb.com'],
            sourceTypes: ['entertainment-database']
          });
          
          if (imdbData.data.status === 'rumored') {
            recommendations.push(`Note: ${movieTitle} is currently listed as rumored on IMDB`);
          }
        }
      }
    }
    
    // Actor lookups (existing IMDB integration)
    const actors = extractActorsFromQuery(query);
    for (const actor of actors) {
      const castData = await lookupIMDBCast(actor);
      if (castData.found && castData.data) {
        facts.push({
          claim: `${actor} current projects: ${castData.data.currentProjects.join(', ')}`,
          verified: true,
          confidence: 'HIGH',
          sources: ['imdb.com'],
          sourceTypes: ['entertainment-database']
        });
      }
    }
    
    // NEW: Wiki-specific lookups for major fandoms
    if (lowerQuery.includes('star wars') || lowerQuery.includes('luke') || 
        lowerQuery.includes('vader') || lowerQuery.includes('jedi') ||
        lowerQuery.includes('sith') || lowerQuery.includes('force')) {
      console.log('Performing Star Wars wiki lookup...');
      const starWarsResult = await lookupStarWarsWiki(query);
      if (starWarsResult.found && starWarsResult.data) {
        facts.push({
          claim: `Star Wars Wiki Entry: ${starWarsResult.data.title} (${starWarsResult.data.category})${starWarsResult.data.era ? ` - Era: ${starWarsResult.data.era}` : ''}${starWarsResult.data.affiliation ? ` - Affiliation: ${starWarsResult.data.affiliation}` : ''}${starWarsResult.data.species ? ` - Species: ${starWarsResult.data.species}` : ''}`,
          verified: true,
          confidence: 'HIGH',
          sources: [starWarsResult.data.source],
          sourceTypes: ['starwars-wiki']
        });
      }
    }
    
    if (lowerQuery.includes('star trek') || lowerQuery.includes('kirk') || 
        lowerQuery.includes('spock') || lowerQuery.includes('enterprise') ||
        lowerQuery.includes('federation') || lowerQuery.includes('klingon')) {
      console.log('Performing Star Trek wiki lookup...');
      const starTrekResult = await lookupStarTrekWiki(query);
      if (starTrekResult.found && starTrekResult.data) {
        facts.push({
          claim: `Star Trek Wiki Entry: ${starTrekResult.data.title} (${starTrekResult.data.category})${starTrekResult.data.series ? ` - Series: ${starTrekResult.data.series}` : ''}${starTrekResult.data.affiliation ? ` - Affiliation: ${starTrekResult.data.affiliation}` : ''}${starTrekResult.data.species ? ` - Species: ${starTrekResult.data.species}` : ''}`,
          verified: true,
          confidence: 'HIGH',
          sources: [starTrekResult.data.source],
          sourceTypes: ['startrek-wiki']
        });
      }
    }
    
    // General wiki lookup for other fandoms
    if (lowerQuery.includes('lord of the rings') || lowerQuery.includes('lotr') ||
        lowerQuery.includes('middle earth') || lowerQuery.includes('frodo') ||
        lowerQuery.includes('gandalf') || lowerQuery.includes('tolkien')) {
      console.log('Performing LOTR wiki lookup...');
      const lotrResult = await lookupWikiDatabase(query, 'lotr');
      if (lotrResult.found && lotrResult.data) {
        facts.push({
          claim: `LOTR Wiki Entry: ${lotrResult.data.title} (${lotrResult.data.category})`,
          verified: true,
          confidence: 'HIGH',
          sources: [lotrResult.data.source],
          sourceTypes: ['lotr-wiki']
        });
      }
    }
    
    if (lowerQuery.includes('harry potter') || lowerQuery.includes('hogwarts') ||
        lowerQuery.includes('voldemort') || lowerQuery.includes('wizard')) {
      console.log('Performing Harry Potter wiki lookup...');
      const hpResult = await lookupWikiDatabase(query, 'harrypotter');
      if (hpResult.found && hpResult.data) {
        facts.push({
          claim: `Harry Potter Wiki Entry: ${hpResult.data.title} (${hpResult.data.category})`,
          verified: true,
          confidence: 'HIGH',
          sources: [hpResult.data.source],
          sourceTypes: ['harrypotter-wiki']
        });
      }
    }
    
    if (lowerQuery.includes('doctor who') || lowerQuery.includes('tardis') ||
        lowerQuery.includes('dalek') || lowerQuery.includes('time lord')) {
      console.log('Performing Doctor Who wiki lookup...');
      const dwResult = await lookupWikiDatabase(query, 'doctorwho');
      if (dwResult.found && dwResult.data) {
        facts.push({
          claim: `Doctor Who Wiki Entry: ${dwResult.data.title} (${dwResult.data.category})`,
          verified: true,
          confidence: 'HIGH',
          sources: [dwResult.data.source],
          sourceTypes: ['doctorwho-wiki']
        });
      }
    }
    
    if (lowerQuery.includes('game of thrones') || lowerQuery.includes('westeros') ||
        lowerQuery.includes('iron throne') || lowerQuery.includes('stark') ||
        lowerQuery.includes('lannister') || lowerQuery.includes('targaryen')) {
      console.log('Performing Game of Thrones wiki lookup...');
      const gotResult = await lookupWikiDatabase(query, 'gameofthrones');
      if (gotResult.found && gotResult.data) {
        facts.push({
          claim: `Game of Thrones Wiki Entry: ${gotResult.data.title} (${gotResult.data.category})`,
          verified: true,
          confidence: 'HIGH',
          sources: [gotResult.data.source],
          sourceTypes: ['gameofthrones-wiki']
        });
      }
    }
    
    // Generate summary with source diversity information
    const verifiedFacts = facts.filter(f => f.verified && f.confidence === 'HIGH');
    const mediumConfidenceFacts = facts.filter(f => f.verified && f.confidence === 'MEDIUM');
    const unverifiedClaims = facts.filter(f => !f.verified || f.confidence === 'LOW');
    
    let summary = '';
    
    // Add source diversity information
    if (sourceDiversity.length > 0) {
      summary += `SOURCES CONSULTED: ${sourceDiversity.join(', ')}\n\n`;
    }
    
    if (verifiedFacts.length > 0) {
      summary += `VERIFIED FACTS:\n${verifiedFacts.map(f => `• ${f.claim} (${f.sources.join(', ')})`).join('\n')}\n\n`;
    }
    
    if (mediumConfidenceFacts.length > 0) {
      summary += `MEDIUM CONFIDENCE FACTS:\n${mediumConfidenceFacts.map(f => `• ${f.claim} (${f.sources.join(', ')})`).join('\n')}\n\n`;
    }
    
    if (unverifiedClaims.length > 0) {
      summary += `UNVERIFIED CLAIMS:\n${unverifiedClaims.map(f => `• ${f.claim} (${f.confidence} confidence)`).join('\n')}\n\n`;
    }
    
    if (facts.length === 0) {
      summary = 'No factual information found. This may be a rumor or unconfirmed speculation.';
      recommendations.push('Recommend checking official sources for confirmation');
    }
    
    // Add recommendations based on source diversity
    if (sourceDiversity.length < 2) {
      recommendations.push('Limited source diversity - consider checking additional sources');
    }
    
    if (sourceDiversity.includes('entertainment-news') && !sourceDiversity.includes('entertainment-database')) {
      recommendations.push('News sources found but no database verification - check official databases');
    }
    
    return { facts, summary, recommendations, sourceDiversity };
  } catch (error) {
    return {
      facts: [],
      summary: `Research failed: ${(error as Error).message}`,
      recommendations: ['Try rephrasing the query or check official sources directly'],
      sourceDiversity: []
    };
  }
}

// Helper functions for extracting different content types
function extractBookTitleFromQuery(query: string): string | null {
  const bookMatches = query.match(/"([^"]+)"/g) || query.match(/([A-Z][A-Za-z\s&:]+)\s*by\s*([A-Z][a-z]+)/g) || [];
  return bookMatches.length > 0 && bookMatches[0] ? bookMatches[0].replace(/"/g, '').replace(/\s*by\s*[A-Z][a-z]+/, '') : null;
}

function extractComicTitleFromQuery(query: string): string | null {
  const comicMatches = query.match(/"([^"]+)"/g) || query.match(/([A-Z][A-Za-z\s&:]+)\s*#(\d+)/g) || [];
  return comicMatches.length > 0 && comicMatches[0] ? comicMatches[0].replace(/"/g, '').replace(/\s*#\d+/, '') : null;
}

function extractGameTitleFromQuery(query: string): string | null {
  const gameMatches = query.match(/"([^"]+)"/g) || query.match(/([A-Z][A-Za-z\s&:]+)\s*\((\d{4})\)/g) || [];
  return gameMatches.length > 0 && gameMatches[0] ? gameMatches[0].replace(/"/g, '').replace(/\s*\(\d{4}\)/, '') : null;
}

// Helper functions for claim extraction
function extractClaimsFromQuery(query: string): string[] {
  const claims: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  // Extract movie titles
  const movieMatches = query.match(/"([^"]+)"/g) || query.match(/([A-Z][A-Za-z\s&:]+)\s*\((\d{4})\)/g) || [];
  movieMatches.forEach(match => claims.push(match.replace(/"/g, '')));
  
  // Extract actor names
  const actorMatches = query.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
  actorMatches.forEach(match => claims.push(`${match} is in upcoming movies`));
  
  // Extract years
  const yearMatches = query.match(/\b(19|20)\d{2}\b/g) || [];
  yearMatches.forEach(year => claims.push(`Movie coming out in ${year}`));
  
  return [...new Set(claims)];
}

function extractMovieTitleFromQuery(query: string): string | null {
  const movieMatches = query.match(/"([^"]+)"/g) || query.match(/([A-Z][A-Za-z\s&:]+)\s*\((\d{4})\)/g) || [];
  return movieMatches.length > 0 && movieMatches[0] ? movieMatches[0].replace(/"/g, '').replace(/\s*\(\d{4}\)/, '') : null;
}

function extractActorsFromQuery(query: string): string[] {
  const actorMatches = query.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
  return [...new Set(actorMatches)];
}

// NEW: Comprehensive source configuration
const SOURCE_CONFIG = {
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
  },
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
  },
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
  },
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
  },
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
  },
  // NEW: Comprehensive wiki sources
  wikis: {
    starwars: [
      'starwars.fandom.com',  // Wookieepedia
      'starwars.com',
      'starwars.wikia.com'
    ],
    startrek: [
      'memory-alpha.fandom.com',  // Memory Alpha (Star Trek)
      'memory-beta.fandom.com',   // Memory Beta (Star Trek novels)
      'startrek.com'
    ],
    lotr: [
      'lotr.fandom.com',      // The One Wiki to Rule Them All
      'tolkiengateway.net',
      'tolkienestate.com'
    ],
    harrypotter: [
      'harrypotter.fandom.com',  // Harry Potter Wiki
      'pottermore.com',
      'wizardingworld.com'
    ],
    marvel: [
      'marvel.fandom.com',    // Marvel Database
      'marvel.com'
    ],
    dc: [
      'dc.fandom.com',        // DC Database
      'dc.com'
    ],
    gaming: [
      'minecraft.fandom.com',
      'elderscrolls.fandom.com',  // UESP
      'fallout.fandom.com',
      'wowwiki.com',
      'leagueoflegends.fandom.com'
    ],
    anime: [
      'myanimelist.net',
      'anime.fandom.com',
      'crunchyroll.com'
    ],
    general: [
      'wikipedia.org',
      'wikia.com',
      'fandom.com'
    ]
  },
  // NEW: Specialized fandom sources
  fandoms: {
    doctorwho: [
      'tardis.fandom.com',    // TARDIS Wiki
      'doctorwho.fandom.com',
      'bbc.co.uk/doctorwho'
    ],
    gameofthrones: [
      'awoiaf.westeros.org',  // A Wiki of Ice and Fire
      'gameofthrones.fandom.com',
      'georgerrmartin.com'
    ],
    dune: [
      'dune.fandom.com',
      'dunenovels.com'
    ],
    discworld: [
      'discworld.fandom.com',
      'lspace.org'
    ],
    hitchhikers: [
      'hitchhikers.fandom.com',
      'douglasadams.com'
    ]
  }
};

// NEW: Source selection based on query type
function selectSourcesForQuery(query: string, type: string = "general"): string[] {
  const lowerQuery = query.toLowerCase();
  const sources: string[] = [];
  
  // Entertainment sources
  if (lowerQuery.includes('movie') || lowerQuery.includes('film')) {
    sources.push(...SOURCE_CONFIG.entertainment.movies);
  }
  
  if (lowerQuery.includes('tv') || lowerQuery.includes('television') || lowerQuery.includes('show')) {
    sources.push(...SOURCE_CONFIG.entertainment.tv);
  }
  
  if (lowerQuery.includes('actor') || lowerQuery.includes('actress') || lowerQuery.includes('star')) {
    sources.push(...SOURCE_CONFIG.entertainment.actors);
  }
  
  // Literature sources
  if (lowerQuery.includes('book') || lowerQuery.includes('novel') || lowerQuery.includes('author')) {
    sources.push(...SOURCE_CONFIG.literature.books);
    sources.push(...SOURCE_CONFIG.literature.authors);
  }
  
  // Comic sources
  if (lowerQuery.includes('comic') || lowerQuery.includes('graphic novel')) {
    sources.push(...SOURCE_CONFIG.comics.general);
  }
  
  if (lowerQuery.includes('marvel')) {
    sources.push(...SOURCE_CONFIG.comics.marvel);
    sources.push(...SOURCE_CONFIG.wikis.marvel);
  }
  
  if (lowerQuery.includes('dc') || lowerQuery.includes('batman') || lowerQuery.includes('superman')) {
    sources.push(...SOURCE_CONFIG.comics.dc);
    sources.push(...SOURCE_CONFIG.wikis.dc);
  }
  
  // Gaming sources
  if (lowerQuery.includes('game') || lowerQuery.includes('gaming')) {
    sources.push(...SOURCE_CONFIG.gaming.games);
    sources.push(...SOURCE_CONFIG.wikis.gaming);
  }
  
  // NEW: Wiki and fandom sources
  // Star Wars
  if (lowerQuery.includes('star wars') || lowerQuery.includes('starwars') || 
      lowerQuery.includes('luke skywalker') || lowerQuery.includes('darth vader') ||
      lowerQuery.includes('jedi') || lowerQuery.includes('sith') ||
      lowerQuery.includes('force') || lowerQuery.includes('lightsaber')) {
    sources.push(...SOURCE_CONFIG.wikis.starwars);
  }
  
  // Star Trek
  if (lowerQuery.includes('star trek') || lowerQuery.includes('startrek') ||
      lowerQuery.includes('kirk') || lowerQuery.includes('spock') ||
      lowerQuery.includes('enterprise') || lowerQuery.includes('federation') ||
      lowerQuery.includes('klingon') || lowerQuery.includes('vulcan')) {
    sources.push(...SOURCE_CONFIG.wikis.startrek);
  }
  
  // Lord of the Rings
  if (lowerQuery.includes('lord of the rings') || lowerQuery.includes('lotr') ||
      lowerQuery.includes('middle earth') || lowerQuery.includes('middle-earth') ||
      lowerQuery.includes('frodo') || lowerQuery.includes('gandalf') ||
      lowerQuery.includes('hobbit') || lowerQuery.includes('tolkien')) {
    sources.push(...SOURCE_CONFIG.wikis.lotr);
  }
  
  // Harry Potter
  if (lowerQuery.includes('harry potter') || lowerQuery.includes('harrypotter') ||
      lowerQuery.includes('hogwarts') || lowerQuery.includes('voldemort') ||
      lowerQuery.includes('wizard') || lowerQuery.includes('witch') ||
      lowerQuery.includes('muggle') || lowerQuery.includes('quidditch')) {
    sources.push(...SOURCE_CONFIG.wikis.harrypotter);
  }
  
  // Doctor Who
  if (lowerQuery.includes('doctor who') || lowerQuery.includes('doctorwho') ||
      lowerQuery.includes('tardis') || lowerQuery.includes('dalek') ||
      lowerQuery.includes('time lord') || lowerQuery.includes('timelord') ||
      lowerQuery.includes('gallifrey')) {
    sources.push(...SOURCE_CONFIG.fandoms.doctorwho);
  }
  
  // Game of Thrones
  if (lowerQuery.includes('game of thrones') || lowerQuery.includes('gameofthrones') ||
      lowerQuery.includes('westeros') || lowerQuery.includes('iron throne') ||
      lowerQuery.includes('dragon') || lowerQuery.includes('stark') ||
      lowerQuery.includes('lannister') || lowerQuery.includes('targaryen')) {
    sources.push(...SOURCE_CONFIG.fandoms.gameofthrones);
  }
  
  // Dune
  if (lowerQuery.includes('dune') || lowerQuery.includes('arrakis') ||
      lowerQuery.includes('fremen') || lowerQuery.includes('spice') ||
      lowerQuery.includes('muad dib') || lowerQuery.includes('herbert')) {
    sources.push(...SOURCE_CONFIG.fandoms.dune);
  }
  
  // Discworld
  if (lowerQuery.includes('discworld') || lowerQuery.includes('pratchett') ||
      lowerQuery.includes('ankh morpork') || lowerQuery.includes('death')) {
    sources.push(...SOURCE_CONFIG.fandoms.discworld);
  }
  
  // Hitchhiker's Guide
  if (lowerQuery.includes('hitchhiker') || lowerQuery.includes('hitchhikers') ||
      lowerQuery.includes('douglas adams') || lowerQuery.includes('42') ||
      lowerQuery.includes('vogon') || lowerQuery.includes('babel fish')) {
    sources.push(...SOURCE_CONFIG.fandoms.hitchhikers);
  }
  
  // Gaming specific wikis
  if (lowerQuery.includes('minecraft')) {
    sources.push(...SOURCE_CONFIG.wikis.gaming.filter(s => s.includes('minecraft')));
  }
  
  if (lowerQuery.includes('elder scrolls') || lowerQuery.includes('skyrim') ||
      lowerQuery.includes('oblivion') || lowerQuery.includes('morrowind')) {
    sources.push(...SOURCE_CONFIG.wikis.gaming.filter(s => s.includes('elderscrolls')));
  }
  
  if (lowerQuery.includes('fallout')) {
    sources.push(...SOURCE_CONFIG.wikis.gaming.filter(s => s.includes('fallout')));
  }
  
  if (lowerQuery.includes('world of warcraft') || lowerQuery.includes('wow')) {
    sources.push(...SOURCE_CONFIG.wikis.gaming.filter(s => s.includes('wow')));
  }
  
  if (lowerQuery.includes('league of legends') || lowerQuery.includes('lol')) {
    sources.push(...SOURCE_CONFIG.wikis.gaming.filter(s => s.includes('leagueoflegends')));
  }
  
  // Anime sources
  if (lowerQuery.includes('anime') || lowerQuery.includes('manga') ||
      lowerQuery.includes('japanese animation')) {
    sources.push(...SOURCE_CONFIG.wikis.anime);
  }
  
  // News sources (always include for current events)
  sources.push(...SOURCE_CONFIG.news.entertainment);
  
  // General wiki sources (always include for comprehensive coverage)
  sources.push(...SOURCE_CONFIG.wikis.general);
  
  // Remove duplicates and return
  return [...new Set(sources)];
}

// NEW: Enhanced fact verification with multiple source types
async function verifyFactWithMultipleSources(claim: string, context: string): Promise<{
  verified: boolean;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources: string[];
  corrections?: string[];
  warnings?: string[];
  sourceTypes: string[];
}> {
  try {
    console.log(`Verifying fact with multiple sources: ${claim}`);
    
    const warnings: string[] = [];
    const corrections: string[] = [];
    const sources: string[] = [];
    const sourceTypes: string[] = [];
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    
    // Select appropriate sources based on the claim
    const selectedSources = selectSourcesForQuery(claim, context);
    
    let verificationCount = 0;
    let officialSourceCount = 0;
    
    // Search across all selected sources
    for (const source of selectedSources) {
      try {
        const searchQuery = `"${claim}" site:${source}`;
        const results = await performWebSearch(searchQuery);
        
        if (results.success && results.results.length > 0) {
          verificationCount++;
          sources.push(source);
          
          // Categorize source type
          if (source.includes('imdb.com')) sourceTypes.push('entertainment-database');
          else if (source.includes('marvel.com') || source.includes('dc.com')) sourceTypes.push('official-studio');
          else if (source.includes('goodreads.com')) sourceTypes.push('literature-database');
          else if (source.includes('comicvine.com')) sourceTypes.push('comic-database');
          else if (source.includes('variety.com') || source.includes('hollywoodreporter.com')) sourceTypes.push('entertainment-news');
          else if (source.includes('fandom.com') || source.includes('wikia.com')) sourceTypes.push('fandom-wiki');
          else if (source.includes('wikipedia.org')) sourceTypes.push('general-wiki');
          else if (source.includes('starwars.fandom.com')) sourceTypes.push('starwars-wiki');
          else if (source.includes('memory-alpha.fandom.com')) sourceTypes.push('startrek-wiki');
          else if (source.includes('lotr.fandom.com')) sourceTypes.push('lotr-wiki');
          else if (source.includes('harrypotter.fandom.com')) sourceTypes.push('harrypotter-wiki');
          else if (source.includes('tardis.fandom.com')) sourceTypes.push('doctorwho-wiki');
          else if (source.includes('awoiaf.westeros.org')) sourceTypes.push('gameofthrones-wiki');
          else if (source.includes('minecraft.fandom.com')) sourceTypes.push('minecraft-wiki');
          else if (source.includes('elderscrolls.fandom.com')) sourceTypes.push('elderscrolls-wiki');
          else if (source.includes('fallout.fandom.com')) sourceTypes.push('fallout-wiki');
          else if (source.includes('myanimelist.net')) sourceTypes.push('anime-database');
          else sourceTypes.push('general');
          
          // Check if it's an official source
          if (source.includes('imdb.com') || source.includes('marvel.com') || source.includes('dc.com') || 
              source.includes('goodreads.com') || source.includes('comicvine.com')) {
            officialSourceCount++;
          }
          
          // Read the first result to verify the claim
          const firstResult = results.results[0];
          if (firstResult && firstResult.link) {
            const pageContent = await readWebsiteContent(firstResult.link);
            
            if (pageContent.success) {
              const content = pageContent.content.toLowerCase();
              const claimLower = claim.toLowerCase();
              
              // Check if the claim is actually mentioned in the content
              if (content.includes(claimLower)) {
                verificationCount++;
              } else {
                warnings.push(`Claim "${claim}" not found in ${firstResult.link}`);
              }
            }
          }
        }
      } catch (error) {
        console.error(`Verification query failed for ${source}:`, error);
      }
    }
    
    // Determine confidence level based on source diversity and verification count
    if (officialSourceCount >= 2 && verificationCount >= 3 && sourceTypes.length >= 2) {
      confidence = 'HIGH';
    } else if (verificationCount >= 2) {
      confidence = 'MEDIUM';
    }
    
    // Check for contradictions
    const contradictionQuery = `"${claim}" false incorrect debunked`;
    try {
      const contradictionResults = await performWebSearch(contradictionQuery);
      if (contradictionResults.success && contradictionResults.results.length > 0) {
        warnings.push(`Potential contradiction found for claim: ${claim}`);
        confidence = 'LOW';
      }
    } catch (error) {
      // Ignore contradiction search errors
    }
    
    return {
      verified: confidence !== 'LOW',
      confidence,
      sources,
      corrections,
      warnings,
      sourceTypes
    };
  } catch (error) {
    return {
      verified: false,
      confidence: 'LOW',
      sources: [],
      warnings: [`Verification failed: ${(error as Error).message}`],
      sourceTypes: []
    };
  }
}

// NEW: Literature database lookup
async function lookupLiteratureDatabase(query: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    author: string;
    genre: string;
    publicationYear?: string;
    description?: string;
    rating?: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up literature: ${query}`);
    
    // Search Goodreads for the book
    const searchQuery = `${query} site:goodreads.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No literature results found' };
    }
    
    // Get the first Goodreads result
    const goodreadsUrl = searchResults.results[0].link;
    if (!goodreadsUrl.includes('goodreads.com')) {
      return { found: false, error: 'No Goodreads URL found' };
    }
    
    // Read the Goodreads page content
    const pageContent = await readWebsiteContent(goodreadsUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract book information (simplified)
    const authorMatch = content.match(/by\s+([a-z\s]+)/i);
    const author = authorMatch ? authorMatch[1].trim() : 'Unknown';
    
    const yearMatch = content.match(/\b(19|20)\d{2}\b/);
    const publicationYear = yearMatch ? yearMatch[0] : undefined;
    
    const ratingMatch = content.match(/(\d+\.?\d*)\s*out\s*of\s*5/);
    const rating = ratingMatch ? ratingMatch[1] : undefined;
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        author,
        genre: 'Unknown', // Would need more sophisticated parsing
        publicationYear,
        rating
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Comic database lookup
async function lookupComicDatabase(query: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    publisher: string;
    series?: string;
    issueNumber?: string;
    publicationYear?: string;
    creators?: string[];
  };
  error?: string;
}> {
  try {
    console.log(`Looking up comic: ${query}`);
    
    // Search ComicVine for the comic
    const searchQuery = `${query} site:comicvine.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No comic results found' };
    }
    
    // Get the first ComicVine result
    const comicvineUrl = searchResults.results[0].link;
    if (!comicvineUrl.includes('comicvine.com')) {
      return { found: false, error: 'No ComicVine URL found' };
    }
    
    // Read the ComicVine page content
    const pageContent = await readWebsiteContent(comicvineUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract comic information (simplified)
    const publisherMatch = content.match(/(marvel|dc|image|dark horse|boom)/i);
    const publisher = publisherMatch ? publisherMatch[1] : 'Unknown';
    
    const yearMatch = content.match(/\b(19|20)\d{2}\b/);
    const publicationYear = yearMatch ? yearMatch[0] : undefined;
    
    const issueMatch = content.match(/issue\s*#?(\d+)/i);
    const issueNumber = issueMatch ? issueMatch[1] : undefined;
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        publisher,
        publicationYear,
        issueNumber
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Gaming database lookup
async function lookupGamingDatabase(query: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    developer: string;
    publisher: string;
    releaseYear?: string;
    genre: string;
    rating?: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up game: ${query}`);
    
    // Search Metacritic for the game
    const searchQuery = `${query} site:metacritic.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No gaming results found' };
    }
    
    // Get the first Metacritic result
    const metacriticUrl = searchResults.results[0].link;
    if (!metacriticUrl.includes('metacritic.com')) {
      return { found: false, error: 'No Metacritic URL found' };
    }
    
    // Read the Metacritic page content
    const pageContent = await readWebsiteContent(metacriticUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract game information (simplified)
    const developerMatch = content.match(/developer[:\s]+([a-z\s]+)/i);
    const developer = developerMatch ? developerMatch[1].trim() : 'Unknown';
    
    const publisherMatch = content.match(/publisher[:\s]+([a-z\s]+)/i);
    const publisher = publisherMatch ? publisherMatch[1].trim() : 'Unknown';
    
    const yearMatch = content.match(/\b(19|20)\d{2}\b/);
    const releaseYear = yearMatch ? yearMatch[0] : undefined;
    
    const ratingMatch = content.match(/(\d+)\s*out\s*of\s*100/);
    const rating = ratingMatch ? ratingMatch[1] : undefined;
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        developer,
        publisher,
        releaseYear,
        genre: 'Unknown', // Would need more sophisticated parsing
        rating
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Wiki database lookup functions
async function lookupWikiDatabase(query: string, wikiType: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    category: string;
    description?: string;
    relatedTopics?: string[];
    source: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up ${wikiType} wiki: ${query}`);
    
    // Select appropriate wiki source based on type
    let wikiSource = '';
    switch (wikiType) {
      case 'starwars':
        wikiSource = 'starwars.fandom.com';
        break;
      case 'startrek':
        wikiSource = 'memory-alpha.fandom.com';
        break;
      case 'lotr':
        wikiSource = 'lotr.fandom.com';
        break;
      case 'harrypotter':
        wikiSource = 'harrypotter.fandom.com';
        break;
      case 'doctorwho':
        wikiSource = 'tardis.fandom.com';
        break;
      case 'gameofthrones':
        wikiSource = 'awoiaf.westeros.org';
        break;
      default:
        wikiSource = 'wikipedia.org';
    }
    
    // Search the specific wiki
    const searchQuery = `${query} site:${wikiSource}`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: `No ${wikiType} wiki results found` };
    }
    
    // Get the first wiki result
    const wikiUrl = searchResults.results[0].link;
    if (!wikiUrl.includes(wikiSource)) {
      return { found: false, error: `No ${wikiType} wiki URL found` };
    }
    
    // Read the wiki page content
    const pageContent = await readWebsiteContent(wikiUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract wiki information (simplified)
    const categoryMatch = content.match(/category[:\s]+([a-z\s]+)/i);
    const category = categoryMatch ? categoryMatch[1].trim() : 'Unknown';
    
    // Extract related topics (simplified)
    const relatedMatches = content.match(/([a-z\s]+)\s*\([^)]*\)/gi);
    const relatedTopics = relatedMatches ? relatedMatches.slice(0, 5).map(match => match.trim()) : [];
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        category,
        relatedTopics,
        source: wikiSource
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Star Wars specific lookup (Wookieepedia)
async function lookupStarWarsWiki(query: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    category: string;
    era?: string;
    affiliation?: string;
    species?: string;
    source: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up Wookieepedia: ${query}`);
    
    const searchQuery = `${query} site:starwars.fandom.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No Wookieepedia results found' };
    }
    
    const wookieeUrl = searchResults.results[0].link;
    if (!wookieeUrl.includes('starwars.fandom.com')) {
      return { found: false, error: 'No Wookieepedia URL found' };
    }
    
    const pageContent = await readWebsiteContent(wookieeUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract Star Wars specific information
    const eraMatch = content.match(/(old republic|high republic|rise of the empire|rebellion era|new republic|legacy era)/i);
    const era = eraMatch ? eraMatch[1] : undefined;
    
    const affiliationMatch = content.match(/(jedi order|sith order|galactic republic|galactic empire|rebel alliance|first order|resistance)/i);
    const affiliation = affiliationMatch ? affiliationMatch[1] : undefined;
    
    const speciesMatch = content.match(/(human|wookiee|twilek|togruta|zabrak|chiss|mandalorian)/i);
    const species = speciesMatch ? speciesMatch[1] : undefined;
    
    const categoryMatch = content.match(/(character|location|vehicle|weapon|species|organization|event)/i);
    const category = categoryMatch ? categoryMatch[1] : 'Unknown';
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        category,
        era,
        affiliation,
        species,
        source: 'starwars.fandom.com'
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// NEW: Star Trek specific lookup (Memory Alpha)
async function lookupStarTrekWiki(query: string): Promise<{
  found: boolean;
  data?: {
    title: string;
    category: string;
    series?: string;
    species?: string;
    affiliation?: string;
    source: string;
  };
  error?: string;
}> {
  try {
    console.log(`Looking up Memory Alpha: ${query}`);
    
    const searchQuery = `${query} site:memory-alpha.fandom.com`;
    const searchResults = await performWebSearch(searchQuery);
    
    if (!searchResults.success || searchResults.results.length === 0) {
      return { found: false, error: 'No Memory Alpha results found' };
    }
    
    const memoryAlphaUrl = searchResults.results[0].link;
    if (!memoryAlphaUrl.includes('memory-alpha.fandom.com')) {
      return { found: false, error: 'No Memory Alpha URL found' };
    }
    
    const pageContent = await readWebsiteContent(memoryAlphaUrl);
    if (!pageContent.success) {
      return { found: false, error: pageContent.error };
    }
    
    const content = pageContent.content.toLowerCase();
    const title = pageContent.title;
    
    // Extract Star Trek specific information
    const seriesMatch = content.match(/(the original series|the next generation|deep space nine|voyager|enterprise|discovery|picard|strange new worlds)/i);
    const series = seriesMatch ? seriesMatch[1] : undefined;
    
    const speciesMatch = content.match(/(human|vulcan|klingon|romulan|ferengi|cardassian|borg|andorian)/i);
    const species = speciesMatch ? speciesMatch[1] : undefined;
    
    const affiliationMatch = content.match(/(starfleet|federation|klingon empire|romulan empire|borg collective|ferengi alliance)/i);
    const affiliation = affiliationMatch ? affiliationMatch[1] : undefined;
    
    const categoryMatch = content.match(/(character|location|starship|technology|species|organization|episode)/i);
    const category = categoryMatch ? categoryMatch[1] : 'Unknown';
    
    return {
      found: true,
      data: {
        title: title.replace(/\([^)]*\)/g, '').trim(),
        category,
        series,
        species,
        affiliation,
        source: 'memory-alpha.fandom.com'
      }
    };
  } catch (error) {
    return { found: false, error: (error as Error).message };
  }
}

// Enhanced accuracy checking function
async function check_accuracy_before_response(claim: string, topic: string): Promise<string> {
  console.log(`Checking accuracy for claim: ${claim}`);
  
  try {
    // First check RAG knowledge base
    const ragResult = await ragService.enhancedSearch(claim, undefined, undefined);
    
    if (ragResult.ragResults.length > 0 && ragResult.confidence === "HIGH") {
      // Cross-reference with web search for verification
      const verificationResults = await performWebSearch(`"${claim}" site:imdb.com OR site:marvel.com OR site:dc.com OR site:starwars.com`);
      
      if (verificationResults.success && verificationResults.results.length > 0) {
        return `ACCURACY CHECK: HIGH confidence - claim verified by knowledge base and official sources`;
      }
    }
    
    // If not in knowledge base, perform comprehensive verification
    const searchStrategies = [
      { q: `"${claim}" site:imdb.com OR site:marvel.com OR site:dc.com`, description: "Official sources" },
      { q: `"${claim}" site:variety.com OR site:hollywoodreporter.com`, description: "Industry news" },
      { q: `"${claim}" site:*.fandom.com`, description: "Fan wikis" }
    ];
    
    let verificationCount = 0;
    let officialSourceCount = 0;
    
    for (const strategy of searchStrategies) {
      try {
        const results = await performWebSearch(strategy.q);
        if (results.success && results.results.length > 0) {
          verificationCount++;
          if (strategy.description === "Official sources") {
            officialSourceCount++;
          }
        }
      } catch (error) {
        console.error(`Verification strategy failed: ${(error as Error).message}`);
      }
    }
    
    if (officialSourceCount >= 1 && verificationCount >= 2) {
      return `ACCURACY CHECK: HIGH confidence - verified by ${verificationCount} sources (${officialSourceCount} official)`;
    } else if (verificationCount >= 1) {
      return `ACCURACY CHECK: MEDIUM confidence - verified by ${verificationCount} sources`;
    } else {
      return `ACCURACY CHECK: LOW confidence - insufficient verification sources found`;
    }
    
  } catch (error) {
    return `ACCURACY CHECK: ERROR - ${(error as Error).message}`;
  }
}

// Handle user corrections
async function handle_user_correction(correction: string, originalTopic: string): Promise<string> {
  console.log(`Handling user correction: ${correction}`);
  
  try {
    // Extract the corrected information
    const correctionMatch = correction.match(/(?:actually|in fact|the truth is|correctly|it's not|it is not|the correct|the right|the actual|the fact is|the truth is)\s+(.+)/i);
    const correctedInfo = correctionMatch ? correctionMatch[1].trim() : correction;
    
    // Research the corrected information
    const searchResults = await performWebSearch(`"${correctedInfo}" ${originalTopic} site:imdb.com OR site:marvel.com OR site:dc.com OR site:starwars.com`);
    
    if (searchResults.success && searchResults.results.length > 0) {
      // Verify the correction with multiple sources
      const verificationResults = await performWebSearch(`"${correctedInfo}" verified confirmed site:variety.com OR site:hollywoodreporter.com`);
      
      let confidence = "MEDIUM";
      if (verificationResults.success && verificationResults.results.length > 0) {
        confidence = "HIGH";
      }
      
      return `CORRECTION VERIFICATION:
Original Topic: ${originalTopic}
User Correction: ${correctedInfo}
Verification: ${searchResults.results.length} sources found
Confidence: ${confidence}
Status: Correction appears to be accurate
Recommendation: Use corrected information for future discussions`;
    } else {
      return `CORRECTION VERIFICATION:
Original Topic: ${originalTopic}
User Correction: ${correctedInfo}
Verification: Limited sources found
Confidence: LOW
Status: Correction needs additional verification
Recommendation: Research further before accepting correction`;
    }
    
  } catch (error) {
    return `CORRECTION VERIFICATION ERROR: ${(error as Error).message}`;
  }
}

// Smart Search function
async function smart_search(query: string, type: string = "general"): Promise<string> {
  console.log(`Performing smart search for: ${query} (type: ${type})`);
  
  try {
    // Use enhanced search with appropriate options
    const searchOptions = {
      maxResults: 8,
      requireOfficialSources: type === "character" || type === "canon",
      includeNews: true,
      includeWikis: true
    };
    
    const searchResult = await performEnhancedSearch(query, searchOptions);
    
    if (!searchResult.success) {
      return `Search failed: ${searchResult.error}. Please try rephrasing your query or check official sources directly.`;
    }
    
    if (searchResult.results.length === 0) {
      return "No search results found. This may be a rumor or unconfirmed information.";
    }
    
    let response = `SEARCH RESULTS (${searchResult.provider.toUpperCase()}):\n\n`;
    response += `Quality Score: ${searchResult.qualityScore.toFixed(2)}\n`;
    response += `Source Diversity: ${searchResult.sourceDiversity.join(', ')}\n\n`;
    
    // Add search results with source attribution
    searchResult.results.slice(0, 5).forEach((result, index) => {
      response += `${index + 1}. ${result.title}\n`;
      response += `   ${result.snippet}\n`;
      response += `   Source: ${result.link}\n\n`;
    });
    
    return response;
  } catch (error) {
    console.error("Smart search failed:", error);
    return `Search failed: ${(error as Error).message}. Please try rephrasing your query or check official sources directly.`;
  }
}

// Information Verification function
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
      if (results.success) {
        verificationResults = verificationResults.concat(results.results);
      }
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

// RAG Lookup function
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

// Update the tools array to include the new accuracy and correction tools
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
  {
    type: "function" as const,
    function: {
      name: "check_accuracy_before_response",
      description: "Check the accuracy of a claim before responding to ensure information is verified and reliable.",
      parameters: {
        type: "object" as const,
        properties: {
          claim: {
            type: "string",
            description: "The claim or information to verify before sharing.",
          },
          topic: {
            type: "string",
            description: "The topic or context of the claim.",
          },
        },
        required: ["claim", "topic"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "handle_user_correction",
      description: "Handle user corrections by verifying the corrected information and updating understanding.",
      parameters: {
        type: "object" as const,
        properties: {
          correction: {
            type: "string",
            description: "The user's correction message or corrected information.",
          },
          originalTopic: {
            type: "string",
            description: "The original topic that was being discussed.",
          },
        },
        required: ["correction", "originalTopic"],
      },
    },
  },
];