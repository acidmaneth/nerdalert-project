import { NerdAlertKnowledgeBase, KnowledgeEntry, RAGQuery } from './knowledge-base';

export class RAGService {
  private knowledgeBase: NerdAlertKnowledgeBase;

  constructor() {
    this.knowledgeBase = new NerdAlertKnowledgeBase();
    this.knowledgeBase.initializeSampleData();
  }

  // Enhanced search that combines RAG with web search
  async enhancedSearch(query: string, category?: string, franchise?: string): Promise<{
    ragResults: KnowledgeEntry[];
    webSearchNeeded: boolean;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendations: string[];
  }> {
    const ragQuery: RAGQuery = {
      query,
      category,
      franchise,
      limit: 5
    };

    const ragResults = await this.knowledgeBase.retrieve(ragQuery);
    
    // Determine if web search is needed
    const webSearchNeeded = this.shouldUseWebSearch(ragResults, query);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(ragResults);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(ragResults, query);

    return {
      ragResults,
      webSearchNeeded,
      confidence,
      recommendations
    };
  }

  // Check if information is current and accurate
  async validateInformation(topic: string, category?: string): Promise<{
    isCurrent: boolean;
    lastUpdated: string | null;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
    needsUpdate: boolean;
  }> {
    const entry = this.knowledgeBase.getCurrentInfo(topic, category);
    
    if (!entry) {
      return {
        isCurrent: false,
        lastUpdated: null,
        confidence: 'LOW',
        needsUpdate: true
      };
    }

    const isCurrent = this.knowledgeBase.isInformationCurrent(entry);
    const needsUpdate = !isCurrent || entry.confidence === 'LOW';

    return {
      isCurrent,
      lastUpdated: entry.lastUpdated,
      confidence: entry.confidence,
      needsUpdate
    };
  }

  // Update knowledge base with new information
  async updateKnowledgeBase(entry: KnowledgeEntry): Promise<void> {
    await this.knowledgeBase.addEntry(entry);
  }

  // Get canonical information for a topic
  async getCanonicalInfo(topic: string, franchise?: string): Promise<KnowledgeEntry | null> {
    const entries = await this.knowledgeBase.retrieve({
      query: topic,
      franchise,
      limit: 1
    });

    const canonicalEntry = entries.find(entry => entry.canonStatus === 'CANON');
    return canonicalEntry || null;
  }

  // Check for conflicting information
  async checkConflicts(topic: string): Promise<{
    hasConflicts: boolean;
    conflicts: Array<{
      entry1: KnowledgeEntry;
      entry2: KnowledgeEntry;
      conflictType: 'date' | 'fact' | 'status';
      description: string;
    }>;
  }> {
    const entries = await this.knowledgeBase.retrieve({
      query: topic,
      limit: 10
    });

    const conflicts: Array<{
      entry1: KnowledgeEntry;
      entry2: KnowledgeEntry;
      conflictType: 'date' | 'fact' | 'status';
      description: string;
    }> = [];

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];

        // Check for date conflicts
        if (entry1.releaseDate && entry2.releaseDate && entry1.releaseDate !== entry2.releaseDate) {
          conflicts.push({
            entry1,
            entry2,
            conflictType: 'date',
            description: `Release date conflict: ${entry1.releaseDate} vs ${entry2.releaseDate}`
          });
        }

        // Check for status conflicts
        if (entry1.status !== entry2.status) {
          conflicts.push({
            entry1,
            entry2,
            conflictType: 'status',
            description: `Status conflict: ${entry1.status} vs ${entry2.status}`
          });
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts
    };
  }

  private shouldUseWebSearch(ragResults: KnowledgeEntry[], query: string): boolean {
    // Use web search if:
    // 1. No RAG results found
    if (ragResults.length === 0) return true;

    // 2. All results are outdated (older than 30 days)
    const allOutdated = ragResults.every(entry => 
      !this.knowledgeBase.isInformationCurrent(entry, 30)
    );
    if (allOutdated) return true;

    // 3. Query contains time-sensitive keywords
    const timeSensitiveKeywords = ['latest', 'new', 'upcoming', 'recent', 'current'];
    const hasTimeSensitiveKeyword = timeSensitiveKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
    if (hasTimeSensitiveKeyword) return true;

    // 4. Low confidence in all results
    const allLowConfidence = ragResults.every(entry => entry.confidence === 'LOW');
    if (allLowConfidence) return true;

    return false;
  }

  private calculateConfidence(ragResults: KnowledgeEntry[]): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (ragResults.length === 0) return 'LOW';

    const highConfidenceCount = ragResults.filter(r => r.confidence === 'HIGH').length;
    const mediumConfidenceCount = ragResults.filter(r => r.confidence === 'MEDIUM').length;

    if (highConfidenceCount > 0) return 'HIGH';
    if (mediumConfidenceCount > 0) return 'MEDIUM';
    return 'LOW';
  }

  private generateRecommendations(ragResults: KnowledgeEntry[], query: string): string[] {
    const recommendations: string[] = [];

    if (ragResults.length === 0) {
      recommendations.push('No information found in knowledge base. Web search recommended.');
      return recommendations;
    }

    // Check for outdated information
    const outdatedEntries = ragResults.filter(entry => 
      !this.knowledgeBase.isInformationCurrent(entry, 30)
    );
    if (outdatedEntries.length > 0) {
      recommendations.push('Some information may be outdated. Consider web search for latest updates.');
    }

    // Check for low confidence entries
    const lowConfidenceEntries = ragResults.filter(entry => entry.confidence === 'LOW');
    if (lowConfidenceEntries.length > 0) {
      recommendations.push('Some information has low confidence. Verification recommended.');
    }

    // Check for non-canon entries
    const nonCanonEntries = ragResults.filter(entry => entry.canonStatus !== 'CANON');
    if (nonCanonEntries.length > 0) {
      recommendations.push('Some information may be non-canon or speculative.');
    }

    return recommendations;
  }
} 