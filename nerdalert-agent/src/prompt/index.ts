import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import OpenAI from "openai";
import axios from "axios"; // Import axios
import { ChatCompletionChunk, ChatCompletionMessageParam } from "openai/resources/chat";

import { PromptPayload } from "./types";
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

export const prompt = async (
  payload: PromptPayload
): Promise<ReadableStream<Uint8Array>> => {
  console.log("Starting prompt with payload:", payload);

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
      content: systemPrompt,
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
      return new ReadableStream({
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
        });
      }
    }

    // === Second Call to LLM: Generate final answer with tool results ===
    console.log("Sending tool results to LLM for final answer.");
    return new ReadableStream({
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