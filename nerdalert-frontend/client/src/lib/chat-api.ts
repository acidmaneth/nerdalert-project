import { apiRequest } from "./queryClient";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface SendMessageRequest {
  messages: ChatMessage[];
}

export interface SendMessageResponse {
  text: string;
}

export async function sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
  const response = await apiRequest("POST", "/prompt-sync", request);
  return response.json();
}

export async function getMessages() {
  const response = await apiRequest("GET", "/memory");
  return response.json();
}

export async function clearMessages() {
  const response = await apiRequest("DELETE", "/memory");
  return response.json();
}
