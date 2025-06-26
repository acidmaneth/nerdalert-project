import { apiRequest } from "./queryClient";

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

export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await apiRequest("POST", "/api/prompt-sync", request);
  return response.json();
}

export async function getMessages() {
  const response = await apiRequest("GET", "/api/messages");
  return response.json();
}

export async function clearMessages() {
  const response = await apiRequest("DELETE", "/api/messages");
  return response.json();
}
