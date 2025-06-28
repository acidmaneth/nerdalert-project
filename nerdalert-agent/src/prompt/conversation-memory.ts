import type { PromptPayload } from "./types.js";

export interface ConversationMemory {
  sessionId: string;
  discussedTopics: Set<string>;  // Keep - prevents topic repetition
  recentMessages: string[];     // Keep - prevents response repetition
  lastUpdate: Date;
  // Removed: mentionedCharacters, explainedConcepts, sharedTrivia, dateSensitiveInfo, verifiedFacts
}

class ConversationMemoryManager {
  private memories: Map<string, ConversationMemory> = new Map();
  private readonly MAX_TOPICS_PER_SESSION = 20;  // Reduced from 50
  private readonly MAX_SESSIONS = 50;            // Reduced from 100
  private readonly MAX_RECENT_MESSAGES = 5;     // Reduced from 10

  createMemory(sessionId: string): ConversationMemory {
    const memory: ConversationMemory = {
      sessionId,
      discussedTopics: new Set(),
      recentMessages: [],
      lastUpdate: new Date(),
    };
    
    this.memories.set(sessionId, memory);
    this.cleanupOldSessions();
    return memory;
  }

  getMemory(sessionId: string): ConversationMemory | null {
    return this.memories.get(sessionId) || null;
  }

  addDiscussedTopic(sessionId: string, topic: string): void {
    const memory = this.getMemory(sessionId) || this.createMemory(sessionId);
    memory.discussedTopics.add(topic.toLowerCase());
    memory.lastUpdate = new Date();
    
    // Limit topics to prevent memory bloat
    if (memory.discussedTopics.size > this.MAX_TOPICS_PER_SESSION) {
      const topics = Array.from(memory.discussedTopics);
      memory.discussedTopics = new Set(topics.slice(-this.MAX_TOPICS_PER_SESSION));
    }
  }

  addRecentMessage(sessionId: string, message: string): void {
    const memory = this.getMemory(sessionId) || this.createMemory(sessionId);
    memory.recentMessages.push(message.toLowerCase());
    
    // Keep only the most recent messages
    if (memory.recentMessages.length > this.MAX_RECENT_MESSAGES) {
      memory.recentMessages = memory.recentMessages.slice(-this.MAX_RECENT_MESSAGES);
    }
    
    memory.lastUpdate = new Date();
  }

  hasDiscussedTopic(sessionId: string, topic: string): boolean {
    const memory = this.getMemory(sessionId);
    return memory?.discussedTopics.has(topic.toLowerCase()) || false;
  }

  isRepetitiveContent(sessionId: string, content: string): boolean {
    const memory = this.getMemory(sessionId);
    if (!memory) return false;
    
    const contentLower = content.toLowerCase();
    
    // Check if this content is too similar to recent messages
    return memory.recentMessages.some(recentMsg => {
      const similarity = this.calculateSimilarity(contentLower, recentMsg);
      return similarity > 0.7; // 70% similarity threshold
    });
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  }

  getMemorySummary(sessionId: string): string {
    const memory = this.getMemory(sessionId);
    if (!memory) return "";

    const topics = Array.from(memory.discussedTopics).slice(-5); // Only last 5 topics

    if (topics.length === 0) return "";

    return `PREVIOUS TOPICS: ${topics.join(", ")}
IMPORTANT: Don't repeat information about these topics unless specifically asked.`;
  }

  private cleanupOldSessions(): void {
    if (this.memories.size <= this.MAX_SESSIONS) return;

    const sortedSessions = Array.from(this.memories.entries())
      .sort(([, a], [, b]) => a.lastUpdate.getTime() - b.lastUpdate.getTime());

    const sessionsToRemove = sortedSessions.slice(0, this.memories.size - this.MAX_SESSIONS);
    sessionsToRemove.forEach(([sessionId]) => this.memories.delete(sessionId));
  }

  clearSession(sessionId: string): void {
    this.memories.delete(sessionId);
  }
}

export const conversationMemory = new ConversationMemoryManager();

// Simplified topic extraction
export function extractTopicsFromMessage(message: string): string[] {
  // Extract only clear topic words (no complex analysis)
  const topicMatches = message.match(/(?:about|regarding)\s+([^.!?]+)/gi);
  if (!topicMatches) return [];
  
  return topicMatches
    .map(m => m.replace(/^(about|regarding)\s+/i, '').trim())
    .filter(topic => topic.length > 2 && topic.length < 50); // Reasonable topic length
}

// Simplified response analysis (only track topics, not detailed analysis)
export function analyzeAgentResponse(response: string): {
  characters: string[];
  concepts: string[];
  trivia: string[];
} {
  // Simplified - only extract obvious topics to avoid over-analysis
  const topics = response.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
  
  return {
    characters: topics.slice(0, 3), // Limit to 3 to avoid memory bloat
    concepts: [],                   // Removed complex concept tracking
    trivia: []                     // Removed complex trivia tracking
  };
} 