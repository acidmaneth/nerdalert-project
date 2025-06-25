export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: 'movie' | 'tv' | 'comic' | 'character' | 'event' | 'trivia';
  franchise: string;
  releaseDate?: string;
  status: 'announced' | 'in-production' | 'released' | 'cancelled';
  verified: boolean;
  sources: string[];
  lastUpdated: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  canonStatus: 'CANON' | 'NON-CANON' | 'SPECULATION' | 'RUMOR';
  tags: string[];
}

export interface RAGQuery {
  query: string;
  category?: string;
  franchise?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
}

export class NerdAlertKnowledgeBase {
  private entries: Map<string, KnowledgeEntry> = new Map();
  private vectorIndex: Map<string, number[]> = new Map(); // Simple vector storage

  // Add or update knowledge entry
  async addEntry(entry: KnowledgeEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    await this.updateVectorIndex(entry);
  }

  // Retrieve relevant entries based on query
  async retrieve(query: RAGQuery): Promise<KnowledgeEntry[]> {
    const queryVector = await this.vectorizeQuery(query.query);
    const results: Array<{entry: KnowledgeEntry, score: number}> = [];

    for (const [id, entry] of this.entries) {
      const entryVector = this.vectorIndex.get(id);
      if (entryVector) {
        const score = this.calculateSimilarity(queryVector, entryVector);
        if (score > 0.3) { // Threshold for relevance
          results.push({entry, score});
        }
      }
    }

    // Filter by category and franchise if specified
    let filteredResults = results;
    if (query.category) {
      filteredResults = filteredResults.filter(r => r.entry.category === query.category);
    }
    if (query.franchise) {
      filteredResults = filteredResults.filter(r => r.entry.franchise === query.franchise);
    }

    // Sort by relevance score and return top results
    return filteredResults
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit || 5)
      .map(r => r.entry);
  }

  // Get current information for a specific topic
  getCurrentInfo(topic: string, category?: string): KnowledgeEntry | null {
    const entries = Array.from(this.entries.values());
    const relevant = entries.filter(entry => 
      entry.title.toLowerCase().includes(topic.toLowerCase()) &&
      (!category || entry.category === category)
    );

    if (relevant.length === 0) return null;

    // Return the most recently updated entry
    return relevant.sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )[0];
  }

  // Check if information is current
  isInformationCurrent(entry: KnowledgeEntry, maxAgeDays: number = 30): boolean {
    const lastUpdated = new Date(entry.lastUpdated);
    const now = new Date();
    const daysDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= maxAgeDays;
  }

  // Update entry with new information
  updateEntry(id: string, updates: Partial<KnowledgeEntry>): void {
    const existing = this.entries.get(id);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        lastUpdated: new Date().toISOString()
      };
      this.addEntry(updated);
    }
  }

  // Simple vectorization (in production, use proper embeddings)
  private async vectorizeQuery(query: string): Promise<number[]> {
    // This is a simplified version - in production, use proper embeddings
    const words = query.toLowerCase().split(/\s+/);
    const vector = new Array(100).fill(0);
    words.forEach((word, index) => {
      if (index < 100) {
        vector[index] = word.length / 10; // Simple hash-like function
      }
    });
    return vector;
  }

  private async updateVectorIndex(entry: KnowledgeEntry): Promise<void> {
    const vector = await this.vectorizeQuery(entry.title + ' ' + entry.content);
    this.vectorIndex.set(entry.id, vector);
  }

  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    // Simple cosine similarity
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  // Initialize with some sample data
  initializeSampleData(): void {
    const sampleEntries: KnowledgeEntry[] = [
      {
        id: "deadpool-wolverine-2024",
        title: "Deadpool & Wolverine",
        content: "Marvel Studios' Deadpool & Wolverine is the 34th film in the Marvel Cinematic Universe. Directed by Shawn Levy, starring Ryan Reynolds and Hugh Jackman.",
        category: "movie",
        franchise: "Marvel",
        releaseDate: "2024-07-26",
        status: "released",
        verified: true,
        sources: ["marvel.com", "imdb.com"],
        lastUpdated: "2024-07-26",
        confidence: "HIGH",
        canonStatus: "CANON",
        tags: ["superhero", "comedy", "action"]
      },
      {
        id: "fantastic-four-2025",
        title: "The Fantastic Four: First Steps",
        content: "Upcoming Marvel Studios film directed by Matt Shakman, starring Pedro Pascal as Reed Richards and Vanessa Kirby as Sue Storm.",
        category: "movie",
        franchise: "Marvel",
        releaseDate: "2025-02-14",
        status: "in-production",
        verified: true,
        sources: ["marvel.com", "variety.com"],
        lastUpdated: "2024-12-01",
        confidence: "HIGH",
        canonStatus: "CANON",
        tags: ["superhero", "family", "space"]
      }
    ];

    sampleEntries.forEach(entry => this.addEntry(entry));
  }
} 