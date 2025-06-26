import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import helmet from "helmet";

import { prompt } from "./prompt/index";
import type { PromptPayload } from "./prompt/types";
import { conversationMemory } from "./prompt/conversation-memory";
import { PORT, NODE_ENV } from "./constants";

const app = express();
const port = PORT;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5050',
    'http://127.0.0.1:5050',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: "50mb" }));

// Basic health check
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

type ExtendedPromptPayload = PromptPayload & {
  ping?: boolean;
  stream?: boolean;
};

interface StreamResponse extends Response {
  flush?: () => void;
}

const handlePrompt = async (req: Request, res: StreamResponse) => {
  const payload: ExtendedPromptPayload = req.body;
  try {
    if (!!payload.ping) {
      res.send("online");
    } else {
      // Set headers for SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Stream the response
      try {
        console.log("Starting streaming response");
        const result = await prompt(payload);

        if (result && typeof result === "object" && "getReader" in result) {
          console.log("Got readable stream, starting to read");
          const reader = (result as ReadableStream).getReader();

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) {
                console.log("Stream complete");
                res.write("data: [DONE]\n\n");
                break;
              }
              // Forward the chunk directly
              res.write(value);
              // Flush the response
              if (typeof res.flush === "function") {
                res.flush();
              }
            }
          } catch (error) {
            console.error("Stream reading error:", error);
            res.write(
              `data: ${JSON.stringify({
                type: "error",
                error: error instanceof Error ? error.message : "Unknown error",
              })}\n\n`
            );
          } finally {
            reader.releaseLock();
            res.end();
          }
        } else {
          console.log("Got non-stream response:", result);
          // For non-stream responses in streaming mode, format as SSE
          res.write(
            `data: ${JSON.stringify({
              type: "complete",
              content: result,
            })}\n\n`
          );
          res.write("data: [DONE]\n\n");
          res.end();
        }
      } catch (error) {
        console.error("Stream processing error:", error);
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          })}\n\n`
        );
        res.end();
      }
    }
  } catch (error) {
    console.log("prompt: error", error);
    res.status(500).json({ error: (error as Error).message });
  }
};

// Non-streaming handler for frontend compatibility
const handlePromptSync = async (req: Request, res: Response) => {
  const payload: ExtendedPromptPayload = req.body;
  try {
    if (!!payload.ping) {
      res.json({ status: "online" });
    } else {
      console.log("Starting non-streaming response");
      const result = await prompt(payload);

      if (result && typeof result === "object" && "getReader" in result) {
        // Convert stream to string for non-streaming response
        const reader = (result as ReadableStream).getReader();
        let fullResponse = "";
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Convert the chunk to string and extract content
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content) {
                    fullResponse += parsed.choices[0].delta.content;
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
        
        res.json({ text: fullResponse });
      } else {
        // Direct response
        res.json({ text: result });
      }
    }
  } catch (error) {
    console.log("prompt-sync: error", error);
    res.status(500).json({ error: (error as Error).message });
  }
};

app.post("/prompt", handlePrompt);
app.post("/prompt-sync", handlePromptSync);

app.post("/start", (req: Request, res: StreamResponse) => {
  // Use the same handler as /prompt, but with an empty message payload
  // to trigger the agent's introduction.
  req.body = { messages: [] };
  handlePrompt(req, res);
});

// Memory management endpoints
app.get("/memory/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const memory = conversationMemory.getMemory(sessionId);
  if (memory) {
    res.json({
      sessionId,
      discussedTopics: Array.from(memory.discussedTopics),
      mentionedCharacters: Array.from(memory.mentionedCharacters),
      explainedConcepts: Array.from(memory.explainedConcepts),
      sharedTrivia: Array.from(memory.sharedTrivia),
      lastUpdate: memory.lastUpdate
    });
  } else {
    res.status(404).json({ error: "Session not found" });
  }
});

app.delete("/memory/:sessionId", (req: Request, res: Response) => {
  const { sessionId } = req.params;
  conversationMemory.clearSession(sessionId);
  res.json({ message: "Session memory cleared" });
});

app.get("/memory", (req: Request, res: Response) => {
  // Return a list of active sessions (for debugging)
  res.json({ message: "Memory management endpoints available" });
});

// Global error handler
app.use((err: Error, req: Request, res: Response) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: err.message,
    stack: NODE_ENV === "production" ? undefined : err.stack,
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Environment: ${NODE_ENV || "development"}`);
});
