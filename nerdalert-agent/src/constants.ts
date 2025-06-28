export const PORT = process.env.PORT || 80;
export const NODE_ENV = process.env.NODE_ENV || "development";

export const LLM_API_KEY = process.env.LLM_API_KEY || "sk-proj-unknown";
export const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "http://localhost:8080";
export const MODEL = process.env.MODEL || "local-model";
export const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "";

// Brave Search Configuration
export const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || "brave";
export const BRAVE_API_KEY = process.env.BRAVE_API_KEY;