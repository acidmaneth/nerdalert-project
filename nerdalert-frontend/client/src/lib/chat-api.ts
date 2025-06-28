import { apiRequest } from "./queryClient";

const getApiBase = () => {
  // Check for environment variable first
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NERDALERT_API_URL) {
    return import.meta.env.VITE_NERDALERT_API_URL;
  }
  
  // For local development
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:80';
  }
  
  // For production - use the same domain as the frontend (Vercel will proxy to Cloudflare)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback
  return 'https://nerdalert.app';
};

const API_BASE = getApiBase();

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: Date;
}

export interface SendMessageRequest {
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  response: string;
}

// Function to clean message content by removing internal thinking tags and tool calls
// Only clean complete tags, don't modify partial chunks
const cleanMessageContent = (content: string): string => {
  // Don't process chunks that might be incomplete - just return as-is
  // We'll clean the final content later when it's complete
  return content;
};

export async function sendMessage(
  request: SendMessageRequest,
  onStreamChunk?: (chunk: string) => void,
  onThinking?: (isThinking: boolean) => void
): Promise<SendMessageResponse> {
  const response = await fetch(`${API_BASE}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.body) throw new Error("No response body");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let result = "";
  let buffer = "";
  let isThinkingActive = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            // Stream is complete, stop thinking state
            if (isThinkingActive && onThinking) {
              onThinking(false);
              isThinkingActive = false;
            }
            return { response: result };
          }
          
          try {
            const parsed = JSON.parse(data);
            
            // Handle different chunk types
            if (parsed.type === "error") {
              throw new Error(parsed.error);
            }
            
            // Check for tool calls - if present, enter thinking mode
            if (parsed.choices?.[0]?.delta?.tool_calls) {
              if (!isThinkingActive && onThinking) {
                onThinking(true);
                isThinkingActive = true;
              }
              // Don't add tool calls to the result
              continue;
            }
            
            // Check for content
            const content = parsed.choices?.[0]?.delta?.content;
            if (content && typeof content === 'string') {
              // If we were thinking and now have content, stop thinking
              if (isThinkingActive && onThinking) {
                onThinking(false);
                isThinkingActive = false;
              }
              
              // Pass chunks through as-is to preserve all formatting and spaces
              result += content;
              if (onStreamChunk) onStreamChunk(content);
            }
            
            // Handle finish reason
            if (parsed.choices?.[0]?.finish_reason) {
              if (isThinkingActive && onThinking) {
                onThinking(false);
                isThinkingActive = false;
              }
            }
            
          } catch (e) {
            // Ignore parse errors for malformed chunks
            console.warn("Failed to parse SSE chunk:", data);
          }
        }
      }
    }
  } finally {
    // Ensure thinking state is cleared
    if (isThinkingActive && onThinking) {
      onThinking(false);
    }
  }
  
  return { response: result };
}

export async function getMessages() {
  const response = await apiRequest("GET", "/api/messages");
  return response.json();
}

export async function clearMessages() {
  const response = await apiRequest("DELETE", "/api/messages");
  return response.json();
}
