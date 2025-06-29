import type { PromptPayload } from "./types.js";

export interface Correction {
  originalClaim: string;
  correctedInfo: string;
  topic: string;
  timestamp: Date;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sources?: string[];
}

export interface ConversationMemory {
  sessionId: string;
  discussedTopics: Set<string>;  // Keep - prevents topic repetition
  recentMessages: string[];     // Keep - prevents response repetition
  corrections: Correction[];    // NEW: Track user corrections
  lastUpdate: Date;
  // Removed: mentionedCharacters, explainedConcepts, sharedTrivia, dateSensitiveInfo, verifiedFacts
}

class ConversationMemoryManager {
  private memories: Map<string, ConversationMemory> = new Map();
  private readonly MAX_TOPICS_PER_SESSION = 20;  // Reduced from 50
  private readonly MAX_SESSIONS = 50;            // Reduced from 100
  private readonly MAX_RECENT_MESSAGES = 5;     // Reduced from 10
  private readonly MAX_CORRECTIONS = 10;        // NEW: Limit corrections per session

  createMemory(sessionId: string): ConversationMemory {
    const memory: ConversationMemory = {
      sessionId,
      discussedTopics: new Set(),
      recentMessages: [],
      corrections: [],           // NEW: Initialize corrections array
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

  // NEW: Add correction tracking
  addCorrection(sessionId: string, correction: Omit<Correction, 'timestamp'>): void {
    const memory = this.getMemory(sessionId) || this.createMemory(sessionId);
    
    const fullCorrection: Correction = {
      ...correction,
      timestamp: new Date()
    };
    
    memory.corrections.push(fullCorrection);
    memory.lastUpdate = new Date();
    
    // Keep only the most recent corrections
    if (memory.corrections.length > this.MAX_CORRECTIONS) {
      memory.corrections = memory.corrections.slice(-this.MAX_CORRECTIONS);
    }
  }

  // NEW: Get recent corrections for a topic
  getCorrectionsForTopic(sessionId: string, topic: string): Correction[] {
    const memory = this.getMemory(sessionId);
    if (!memory) return [];
    
    const topicLower = topic.toLowerCase();
    return memory.corrections.filter(correction => 
      correction.topic.toLowerCase().includes(topicLower) ||
      correction.originalClaim.toLowerCase().includes(topicLower) ||
      correction.correctedInfo.toLowerCase().includes(topicLower)
    );
  }

  // NEW: Check if a claim has been corrected before
  hasBeenCorrected(sessionId: string, claim: string): Correction | null {
    const memory = this.getMemory(sessionId);
    if (!memory) return null;
    
    const claimLower = claim.toLowerCase();
    return memory.corrections.find(correction => 
      correction.originalClaim.toLowerCase().includes(claimLower) ||
      this.calculateSimilarity(claimLower, correction.originalClaim.toLowerCase()) > 0.6
    ) || null;
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
    const recentCorrections = memory.corrections.slice(-3); // Last 3 corrections

    let summary = "";
    
    if (topics.length > 0) {
      summary += `PREVIOUS TOPICS: ${topics.join(", ")}\n`;
      summary += `IMPORTANT: Don't repeat information about these topics unless specifically asked.\n`;
    }
    
    if (recentCorrections.length > 0) {
      summary += `\nRECENT CORRECTIONS:\n`;
      recentCorrections.forEach(correction => {
        summary += `- "${correction.originalClaim}" was corrected to "${correction.correctedInfo}"\n`;
      });
      summary += `IMPORTANT: Use corrected information when discussing these topics.\n`;
    }

    return summary;
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

// Enhanced topic extraction to detect corrections
export function extractTopicsFromMessage(message: string): string[] {
  // Extract only clear topic words (no complex analysis)
  const topicMatches = message.match(/(?:about|regarding)\s+([^.!?]+)/gi);
  if (!topicMatches) return [];
  
  return topicMatches
    .map(m => m.replace(/^(about|regarding)\s+/i, '').trim())
    .filter(topic => topic.length > 2 && topic.length < 50); // Reasonable topic length
}

// NEW: Detect if user is correcting the agent
export function detectCorrection(message: string): {
  isCorrection: boolean;
  originalClaim?: string;
  correctedInfo?: string;
  topic?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
} {
  const messageLower = message.toLowerCase();
  
  // Patterns that indicate correction
  const correctionPatterns = [
    // Direct corrections
    /(?:that's|that is|you're|you are) (?:wrong|incorrect|not right|mistaken)/i,
    /(?:actually|in fact|the truth is|correctly)/i,
    /(?:no,|nope,|wrong,|incorrect,)/i,
    // Specific corrections
    /(?:it's|it is) (?:not|actually|really) (.+)/i,
    /(?:the correct|the right|the actual) (.+) (?:is|was)/i,
    // Apology requests
    /(?:you should|you need to) (?:apologize|say sorry|correct)/i,
    // Fact corrections
    /(?:the fact is|the truth is|actually) (.+)/i
  ];
  
  for (const pattern of correctionPatterns) {
    if (pattern.test(message)) {
      // Try to extract the corrected information
      const match = message.match(/(?:actually|in fact|the truth is|correctly|it's not|it is not|the correct|the right|the actual|the fact is|the truth is)\s+(.+)/i);
      if (match) {
        return {
          isCorrection: true,
          correctedInfo: match[1].trim(),
          confidence: 'MEDIUM'
        };
      }
      
      return {
        isCorrection: true,
        confidence: 'LOW'
      };
    }
  }
  
  return { isCorrection: false };
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