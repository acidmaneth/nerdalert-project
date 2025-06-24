export interface ConversationMemory {
  sessionId: string;
  discussedTopics: Set<string>;
  mentionedCharacters: Set<string>;
  explainedConcepts: Set<string>;
  sharedTrivia: Set<string>;
  lastUpdate: Date;
}

class ConversationMemoryManager {
  private memories: Map<string, ConversationMemory> = new Map();
  private readonly MAX_TOPICS_PER_SESSION = 50;
  private readonly MAX_SESSIONS = 100;

  createMemory(sessionId: string): ConversationMemory {
    const memory: ConversationMemory = {
      sessionId,
      discussedTopics: new Set(),
      mentionedCharacters: new Set(),
      explainedConcepts: new Set(),
      sharedTrivia: new Set(),
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
  }

  addMentionedCharacter(sessionId: string, character: string): void {
    const memory = this.getMemory(sessionId) || this.createMemory(sessionId);
    memory.mentionedCharacters.add(character.toLowerCase());
    memory.lastUpdate = new Date();
  }

  addExplainedConcept(sessionId: string, concept: string): void {
    const memory = this.getMemory(sessionId) || this.createMemory(sessionId);
    memory.explainedConcepts.add(concept.toLowerCase());
    memory.lastUpdate = new Date();
  }

  addSharedTrivia(sessionId: string, trivia: string): void {
    const memory = this.getMemory(sessionId) || this.createMemory(sessionId);
    memory.sharedTrivia.add(trivia.toLowerCase());
    memory.lastUpdate = new Date();
  }

  hasDiscussedTopic(sessionId: string, topic: string): boolean {
    const memory = this.getMemory(sessionId);
    return memory?.discussedTopics.has(topic.toLowerCase()) || false;
  }

  hasMentionedCharacter(sessionId: string, character: string): boolean {
    const memory = this.getMemory(sessionId);
    return memory?.mentionedCharacters.has(character.toLowerCase()) || false;
  }

  hasExplainedConcept(sessionId: string, concept: string): boolean {
    const memory = this.getMemory(sessionId);
    return memory?.explainedConcepts.has(concept.toLowerCase()) || false;
  }

  hasSharedTrivia(sessionId: string, trivia: string): boolean {
    const memory = this.getMemory(sessionId);
    return memory?.sharedTrivia.has(trivia.toLowerCase()) || false;
  }

  getMemorySummary(sessionId: string): string {
    const memory = this.getMemory(sessionId);
    if (!memory) return "";

    const topics = Array.from(memory.discussedTopics).slice(0, 10);
    const characters = Array.from(memory.mentionedCharacters).slice(0, 10);
    const concepts = Array.from(memory.explainedConcepts).slice(0, 10);

    return `CONVERSATION MEMORY (Session: ${sessionId}):
Previously discussed topics: ${topics.join(", ") || "none"}
Previously mentioned characters: ${characters.join(", ") || "none"}
Previously explained concepts: ${concepts.join(", ") || "none"}
IMPORTANT: Do NOT repeat explanations for these topics, characters, or concepts unless specifically asked.`;
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

// Helper function to extract topics from user messages
export function extractTopicsFromMessage(message: string): string[] {
  const topics: string[] = [];
  
  // Extract potential character names (capitalized words)
  const characterMatches = message.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (characterMatches) {
    topics.push(...characterMatches);
  }

  // Extract potential concepts (quoted terms, technical terms)
  const conceptMatches = message.match(/"([^"]+)"/g);
  if (conceptMatches) {
    topics.push(...conceptMatches.map(m => m.replace(/"/g, '')));
  }

  // Extract potential topics (words after "about", "regarding", etc.)
  const topicMatches = message.match(/(?:about|regarding|concerning|discussing)\s+([^.!?]+)/gi);
  if (topicMatches) {
    topics.push(...topicMatches.map(m => m.replace(/^(about|regarding|concerning|discussing)\s+/i, '').trim()));
  }

  return topics.filter(topic => topic.length > 2); // Filter out very short topics
}

// Helper function to analyze agent responses and extract discussed content
export function analyzeAgentResponse(response: string): {
  characters: string[];
  concepts: string[];
  trivia: string[];
} {
  const characters: string[] = [];
  const concepts: string[] = [];
  const trivia: string[] = [];

  // Extract character names (capitalized words that might be characters)
  const characterMatches = response.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (characterMatches) {
    characters.push(...characterMatches.filter(name => 
      name.length > 2 && 
      !['The', 'This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Why', 'How'].includes(name)
    ));
  }

  // Extract concepts (terms in quotes, technical terms)
  const conceptMatches = response.match(/"([^"]+)"/g);
  if (conceptMatches) {
    concepts.push(...conceptMatches.map(m => m.replace(/"/g, '')));
  }

  // Extract potential trivia (sentences with "Fun fact", "Interesting", etc.)
  const triviaMatches = response.match(/(?:Fun fact|Interesting|Did you know|Trivia|Bonus):\s*([^.!?]+)/gi);
  if (triviaMatches) {
    trivia.push(...triviaMatches.map(m => m.replace(/^(Fun fact|Interesting|Did you know|Trivia|Bonus):\s*/i, '').trim()));
  }

  // Extract technical concepts (words that look like technical terms)
  const technicalMatches = response.match(/\b[A-Z][A-Z0-9]*(?:\s+[A-Z][A-Z0-9]*)*\b/g);
  if (technicalMatches) {
    concepts.push(...technicalMatches.filter(term => 
      term.length > 2 && 
      !['THE', 'AND', 'BUT', 'FOR', 'ARE', 'THEY', 'WERE', 'FROM', 'WITH', 'THAT', 'THIS'].includes(term)
    ));
  }

  return {
    characters: [...new Set(characters)], // Remove duplicates
    concepts: [...new Set(concepts)],
    trivia: [...new Set(trivia)]
  };
} 