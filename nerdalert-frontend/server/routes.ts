import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get chat messages
  app.get("/api/messages", async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Add message directly (for welcome message)
  app.post("/api/messages", async (req, res) => {
    try {
      const { role, content } = req.body;
      
      if (!role || !content) {
        return res.status(400).json({ error: "Role and content are required" });
      }

      const message = await storage.createMessage({ role, content });
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  // Send message to NerdAlert and get response
  app.post("/api/prompt-sync", async (req, res) => {
    try {
      const { messages: chatMessages } = req.body;
      
      if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
        return res.status(400).json({ error: "Messages array is required" });
      }

      const lastMessage = chatMessages[chatMessages.length - 1];
      if (!lastMessage || !lastMessage.content) {
        return res.status(400).json({ error: "Invalid message format" });
      }

      // Store user message (only if it's from user)
      if (lastMessage.role === "user") {
        await storage.createMessage({
          role: "user",
          content: lastMessage.content,
        });
      }

      // Forward to actual NerdAlert API 
      const apiUrl = process.env.NERDALERT_API_URL || "http://localhost:80";
      try {
        const response = await fetch(`${apiUrl}/prompt-sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messages: chatMessages }),
        });

        if (!response.ok) {
          throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        
        // Store AI response
        const aiMessage = await storage.createMessage({
          role: "assistant",
          content: data.response || "I apologize, but I couldn't generate a response.",
        });

        res.json({ response: data.response || "I apologize, but I couldn't generate a response." });
      } catch (apiError) {
        // Fallback response when backend is unavailable
        const fallbackResponse = "SYSTEM ERROR: Unable to connect to NerdAlert neural network. The cyberpunk AI is currently offline. Please try again later.";
        
        await storage.createMessage({
          role: "assistant",
          content: fallbackResponse,
        });

        res.json({ response: fallbackResponse });
      }
    } catch (error) {
      console.error("Error in prompt-sync:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Clear chat history
  app.delete("/api/messages", async (req, res) => {
    try {
      await storage.clearMessages();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
