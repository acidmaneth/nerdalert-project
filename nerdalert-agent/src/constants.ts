export const PORT = process.env.PORT || 80;
export const NODE_ENV = process.env.NODE_ENV || "development";

export const LLM_API_KEY = process.env.LLM_API_KEY || "sk-proj-unknown";
export const LLM_BASE_URL =
  process.env.LLM_BASE_URL || "http://localhost:8080";
export const MODEL = process.env.MODEL || "local-model";
export const SYSTEM_PROMPT = process.env.SYSTEM_PROMPT || "";

// Search Configuration
export const SEARCH_PROVIDER = process.env.SEARCH_PROVIDER || "brave";
export const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
export const SERPER_API_KEY = process.env.SERPER_API_KEY || "4d1982fb5c40dbd06aa445d490292575f60a8f91";

// Search fallback configuration
export const SEARCH_FALLBACK_ENABLED = process.env.SEARCH_FALLBACK_ENABLED !== "false";
export const SEARCH_TIMEOUT = parseInt(process.env.SEARCH_TIMEOUT || "10000");
export const SEARCH_MAX_RETRIES = parseInt(process.env.SEARCH_MAX_RETRIES || "3");