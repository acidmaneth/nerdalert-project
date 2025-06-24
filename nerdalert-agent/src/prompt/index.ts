import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import axios from "axios"; // Import axios
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat";

import { PromptPayload } from "./types";
import { conversationMemory, extractTopicsFromMessage, analyzeAgentResponse } from "./conversation-memory";
import {
  MODEL,
  LLM_API_KEY,
  LLM_BASE_URL,
  SYSTEM_PROMPT,
  SERPER_API_KEY, // Import the new key
} from "../constants";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openAI = new OpenAI({
  apiKey: LLM_API_KEY,
  baseURL: LLM_BASE_URL,
  maxRetries: 3,
});

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
    iso: now.toISOString()
  };
};

const currentDateTime = getCurrentDateTime();

// Generate conversation memory context
const generateMemoryContext = (sessionId?: string): string => {
  if (!sessionId) return "";
  
  const memorySummary = conversationMemory.getMemorySummary(sessionId);
  return memorySummary ? `\n\n${memorySummary}` : "";
};

const systemPromptWithDate = (sessionId?: string) => `${systemPrompt}

CURRENT DATE AND TIME: Today is ${currentDateTime.date} at ${currentDateTime.time} (${currentDateTime.iso}).
IMPORTANT: Always use this current date and time when discussing dates, events, or time-sensitive information. Do not reference dates from your training data unless specifically asked about historical events.

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
- Each response should add fresh value to the conversation${generateMemoryContext(sessionId)}
`;

// Define the web search tool for the LLM
const tools = [
  {
    type: "function" as const,
    function: {
      name: "web_search",
      description: "Get real-time information from the internet.",
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
];

// Implement the web search function
async function web_search(query: string): Promise<string> {
  console.log(`Performing web search for: ${query}`);
  if (!SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY is not set.");
  }

  const searchUrl = "https://google.serper.dev/search";
  const searchPayload = JSON.stringify({ q: query });

  try {
    const response = await axios.post(searchUrl, searchPayload, {
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
    });

    // Extract relevant snippets from the search results
    const results = response.data.organic || [];
    const snippets = results
      .map((result: any) => result.snippet)
      .slice(0, 5) // Get the top 5 snippets
      .join("\n");
      
    console.log(`Search results: ${snippets}`);
    return snippets || "No results found.";
  } catch (error) {
    console.error("Error during web search:", error);
    return `Error performing search: ${ (error as Error).message }`;
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
          
          console.log(`Updated conversation memory for session ${sessionId}:`, {
            characters: analysis.characters.length,
            concepts: analysis.concepts.length,
            trivia: analysis.trivia.length
          });
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