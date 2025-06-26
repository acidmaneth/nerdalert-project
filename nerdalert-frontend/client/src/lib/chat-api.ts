import { apiRequest } from "./queryClient";

const getApiBase = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_NERDALERT_API_URL) {
    return import.meta.env.VITE_NERDALERT_API_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:80';
  }
  return 'https://nerdalert.app';
};
const API_BASE = getApiBase();

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendMessageRequest {
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  response: string;
}

// Function to clean message content by removing internal thinking tags
const cleanMessageContent = (content: string): string => {
  return content
    .replace(/<think>[\s\S]*?<\/think>/g, '') // Remove <think> tags and their content
    .replace(/<processing>[\s\S]*?<\/processing>/g, '') // Remove <processing> tags
    .replace(/<analysis>[\s\S]*?<\/analysis>/g, '') // Remove <analysis> tags
    .replace(/<internal>[\s\S]*?<\/internal>/g, '') // Remove <internal> tags
    .replace(/\[THINKING\][\s\S]*?\[\/THINKING\]/g, '') // Remove [THINKING] tags
    .replace(/\[PROCESSING\][\s\S]*?\[\/PROCESSING\]/g, '') // Remove [PROCESSING] tags
    .trim(); // Remove extra whitespace
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
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            result += content;
            if (onStreamChunk) onStreamChunk(content);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
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
