import type { Speaker } from '@/types'

/**
 * VoicePatternRAGService - RAG-based voice pattern recognition
 * 
 * Uses Retrieval-Augmented Generation for speaker identification:
 * 1. Stores voice patterns in vector database
 * 2. Semantic similarity search for pattern matching
 * 3. Contextual pattern retrieval and matching
 * 4. Continuous learning from voice samples
 * 5. Cross-session speaker memory
 */
export class VoicePatternRAGService {
  private patternDatabase: Map<string, VoicePattern> = new Map()
  private semanticIndex: Map<string, number[]> = new Map()
  private contextualMemory: ConversationContext[] = []
  private speakerProfiles: Map<Speaker, SpeakerProfile> = new Map()
  
  // RAG parameters
  private readonly PATTERN_DIMENSION = 512
  private readonly SIMILARITY_THRESHOLD = 0.85
  private readonly MAX_PATTERNS_PER_SPEAKER = 100
  private readonly CONTEXT_WINDOW = 10
  private readonly LEARNING_RATE = 0.1

  /**
   * Initialize RAG service with pattern database
   */
  async initialize(): Promise<void> {
    console.log('🔍 Voice Pattern RAG Service initializing...')
    
    // Load pre-trained voice patterns (in production, load from database)
    await this.loadPretrainedPatterns()
    
    // Initialize semantic search index
    this.buildSemanticIndex()
    
    console.log('🔍 Voice Pattern RAG Service initialized')
  }

  /**
   * Store new voice pattern with semantic embedding
   */
  async storeVoicePattern(
    audioFeatures: any,
    speaker: Speaker,
    context: string,
    confidence: number
  ): Promise<string> {
    const patternId = this.generatePatternId(speaker, Date.now())
    
    // Generate semantic embedding
    const embedding = await this.generateSemanticEmbedding(audioFeatures, context)
    
    // Create voice pattern
    const pattern: VoicePattern = {
      id: patternId,
      speaker,
      audioFeatures,
      semanticEmbedding: embedding,
      context,
      confidence,
      timestamp: Date.now(),
      usage_count: 0,
      success_rate: 1.0
    }
    
    // Store in pattern database
    this.patternDatabase.set(patternId, pattern)
    this.semanticIndex.set(patternId, embedding)
    
    // Update speaker profile
    this.updateSpeakerProfile(speaker, pattern)
    
    // Maintain database size
    await this.maintainPatternDatabase(speaker)
    
    console.log(`🔍 Stored voice pattern ${patternId} for speaker ${speaker}`)
    return patternId
  }

  /**
   * Retrieve similar voice patterns using RAG
   */
  async retrieveSimilarPatterns(
    audioFeatures: any,
    context: string,
    topK: number = 5
  ): Promise<VoicePatternMatch[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateSemanticEmbedding(audioFeatures, context)
    
    // Perform semantic similarity search
    const candidates = await this.semanticSearch(queryEmbedding, topK * 2)
    
    // Apply contextual filtering
    const contextualMatches = this.applyContextualFiltering(candidates, context)
    
    // Rank by composite score
    const rankedMatches = this.rankMatches(contextualMatches, queryEmbedding)
    
    // Return top matches
    return rankedMatches.slice(0, topK)
  }

  /**
   * Predict speaker using RAG-based pattern matching
   */
  async predictSpeaker(
    audioFeatures: any,
    conversationContext: string
  ): Promise<RAGPredictionResult> {
    // Retrieve similar patterns
    const similarPatterns = await this.retrieveSimilarPatterns(
      audioFeatures, 
      conversationContext, 
      10
    )
    
    if (similarPatterns.length === 0) {
      return {
        speaker: undefined,
        confidence: 0,
        reasoning: 'No similar patterns found in database',
        patterns_used: 0,
        semantic_score: 0
      }
    }
    
    // Aggregate predictions from similar patterns
    const predictions = this.aggregatePredictions(similarPatterns)
    
    // Apply conversation context
    const contextualPrediction = this.applyConversationContext(
      predictions, 
      conversationContext
    )
    
    // Update pattern usage statistics
    this.updatePatternUsage(similarPatterns, contextualPrediction.speaker)
    
    return contextualPrediction
  }

  /**
   * Learn from feedback to improve pattern matching
   */
  async learnFromFeedback(
    audioFeatures: any,
    predictedSpeaker: Speaker | undefined,
    actualSpeaker: Speaker,
    context: string
  ): Promise<void> {
    const wasCorrect = predictedSpeaker === actualSpeaker
    
    // Store new pattern if prediction was wrong
    if (!wasCorrect) {
      await this.storeVoicePattern(audioFeatures, actualSpeaker, context, 0.8)
    }
    
    // Update pattern success rates
    const queryEmbedding = await this.generateSemanticEmbedding(audioFeatures, context)
    const recentPatterns = await this.semanticSearch(queryEmbedding, 5)
    
    for (const match of recentPatterns) {
      const pattern = this.patternDatabase.get(match.patternId)
      if (pattern) {
        const isCorrectPattern = pattern.speaker === actualSpeaker
        this.updatePatternSuccessRate(pattern, isCorrectPattern)
      }
    }
    
    // Update conversation context
    this.updateConversationContext(audioFeatures, actualSpeaker, context, wasCorrect)
    
    console.log(`🔍 Learning from feedback: ${wasCorrect ? 'correct' : 'incorrect'} prediction`)
  }

  /**
   * Generate semantic embedding from audio features and context
   */
  private async generateSemanticEmbedding(
    audioFeatures: any,
    context: string
  ): Promise<number[]> {
    const embedding = new Array(this.PATTERN_DIMENSION).fill(0)
    
    // Audio feature encoding (40% of embedding)
    const audioEncoding = this.encodeAudioFeatures(audioFeatures)
    for (let i = 0; i < Math.min(audioEncoding.length, this.PATTERN_DIMENSION * 0.4); i++) {
      embedding[i] = audioEncoding[i]
    }
    
    // Context encoding (30% of embedding)
    const contextEncoding = this.encodeContext(context)
    const contextStart = Math.floor(this.PATTERN_DIMENSION * 0.4)
    for (let i = 0; i < Math.min(contextEncoding.length, this.PATTERN_DIMENSION * 0.3); i++) {
      embedding[contextStart + i] = contextEncoding[i]
    }
    
    // Temporal encoding (20% of embedding)
    const temporalEncoding = this.encodeTemporalFeatures()
    const temporalStart = Math.floor(this.PATTERN_DIMENSION * 0.7)
    for (let i = 0; i < Math.min(temporalEncoding.length, this.PATTERN_DIMENSION * 0.2); i++) {
      embedding[temporalStart + i] = temporalEncoding[i]
    }
    
    // Conversation history encoding (10% of embedding)
    const historyEncoding = this.encodeConversationHistory()
    const historyStart = Math.floor(this.PATTERN_DIMENSION * 0.9)
    for (let i = 0; i < Math.min(historyEncoding.length, this.PATTERN_DIMENSION * 0.1); i++) {
      embedding[historyStart + i] = historyEncoding[i]
    }
    
    // Normalize embedding
    return this.normalizeVector(embedding)
  }

  /**
   * Perform semantic similarity search
   */
  private async semanticSearch(
    queryEmbedding: number[],
    topK: number
  ): Promise<VoicePatternMatch[]> {
    const matches: VoicePatternMatch[] = []
    
    for (const [patternId, patternEmbedding] of this.semanticIndex) {
      const similarity = this.cosineSimilarity(queryEmbedding, patternEmbedding)
      
      if (similarity > this.SIMILARITY_THRESHOLD) {
        const pattern = this.patternDatabase.get(patternId)
        if (pattern) {
          matches.push({
            patternId,
            pattern,
            similarity,
            semantic_score: similarity,
            contextual_score: 0, // Will be calculated later
            composite_score: similarity
          })
        }
      }
    }
    
    // Sort by similarity
    matches.sort((a, b) => b.similarity - a.similarity)
    
    return matches.slice(0, topK)
  }

  /**
   * Apply contextual filtering to pattern matches
   */
  private applyContextualFiltering(
    matches: VoicePatternMatch[],
    context: string
  ): VoicePatternMatch[] {
    return matches.map(match => {
      // Calculate contextual similarity
      const contextualScore = this.calculateContextualSimilarity(
        match.pattern.context,
        context
      )
      
      // Update match with contextual score
      match.contextual_score = contextualScore
      match.composite_score = (match.similarity * 0.7) + (contextualScore * 0.3)
      
      return match
    })
  }

  /**
   * Rank matches by composite score
   */
  private rankMatches(
    matches: VoicePatternMatch[],
    queryEmbedding: number[]
  ): VoicePatternMatch[] {
    // Apply additional ranking factors
    return matches.map(match => {
      const pattern = match.pattern
      
      // Recency bonus
      const recencyScore = this.calculateRecencyScore(pattern.timestamp)
      
      // Usage frequency bonus
      const usageScore = this.calculateUsageScore(pattern.usage_count)
      
      // Success rate bonus
      const successScore = pattern.success_rate
      
      // Final composite score
      match.composite_score = 
        match.semantic_score * 0.5 +
        match.contextual_score * 0.2 +
        recencyScore * 0.1 +
        usageScore * 0.1 +
        successScore * 0.1
      
      return match
    }).sort((a, b) => b.composite_score - a.composite_score)
  }

  /**
   * Aggregate predictions from multiple patterns
   */
  private aggregatePredictions(matches: VoicePatternMatch[]): Map<Speaker, number> {
    const predictions = new Map<Speaker, number>()
    
    for (const match of matches) {
      const speaker = match.pattern.speaker
      const currentScore = predictions.get(speaker) || 0
      const weightedScore = match.composite_score * match.pattern.confidence
      
      predictions.set(speaker, currentScore + weightedScore)
    }
    
    return predictions
  }

  /**
   * Apply conversation context to predictions
   */
  private applyConversationContext(
    predictions: Map<Speaker, number>,
    context: string
  ): RAGPredictionResult {
    // Get recent conversation context
    const recentContext = this.contextualMemory.slice(-this.CONTEXT_WINDOW)
    
    // Apply turn-taking patterns
    const turnTakingBonus = this.calculateTurnTakingBonus(recentContext)
    
    // Apply speaker consistency bonus
    const consistencyBonus = this.calculateConsistencyBonus(recentContext)
    
    // Find best prediction
    let bestSpeaker: Speaker | undefined = undefined
    let bestScore = 0
    
    for (const [speaker, score] of predictions) {
      let adjustedScore = score
      
      // Apply turn-taking bonus
      if (turnTakingBonus.has(speaker)) {
        adjustedScore += turnTakingBonus.get(speaker)! * 0.2
      }
      
      // Apply consistency bonus
      if (consistencyBonus.has(speaker)) {
        adjustedScore += consistencyBonus.get(speaker)! * 0.1
      }
      
      if (adjustedScore > bestScore) {
        bestScore = adjustedScore
        bestSpeaker = speaker
      }
    }
    
    // Normalize confidence
    const totalScore = Array.from(predictions.values()).reduce((sum, score) => sum + score, 0)
    const confidence = totalScore > 0 ? bestScore / totalScore : 0
    
    return {
      speaker: confidence > 0.6 ? bestSpeaker : undefined,
      confidence,
      reasoning: `RAG prediction based on ${predictions.size} similar patterns`,
      patterns_used: predictions.size,
      semantic_score: bestScore
    }
  }

  /**
   * Update speaker profile with new pattern
   */
  private updateSpeakerProfile(speaker: Speaker, pattern: VoicePattern): void {
    if (!this.speakerProfiles.has(speaker)) {
      this.speakerProfiles.set(speaker, {
        speaker,
        patterns: [],
        avgConfidence: pattern.confidence,
        totalPatterns: 1,
        lastUpdate: Date.now()
      })
    }
    
    const profile = this.speakerProfiles.get(speaker)!
    profile.patterns.push(pattern.id)
    profile.totalPatterns++
    profile.avgConfidence = (profile.avgConfidence + pattern.confidence) / 2
    profile.lastUpdate = Date.now()
  }

  /**
   * Maintain pattern database size
   */
  private async maintainPatternDatabase(speaker: Speaker): Promise<void> {
    const profile = this.speakerProfiles.get(speaker)
    if (!profile || profile.patterns.length <= this.MAX_PATTERNS_PER_SPEAKER) {
      return
    }
    
    // Remove oldest, least successful patterns
    const patterns = profile.patterns
      .map(id => this.patternDatabase.get(id))
      .filter(p => p !== undefined) as VoicePattern[]
    
    // Sort by success rate and recency
    patterns.sort((a, b) => {
      const scoreA = a.success_rate * 0.7 + this.calculateRecencyScore(a.timestamp) * 0.3
      const scoreB = b.success_rate * 0.7 + this.calculateRecencyScore(b.timestamp) * 0.3
      return scoreA - scoreB
    })
    
    // Remove bottom 20%
    const toRemove = Math.floor(patterns.length * 0.2)
    for (let i = 0; i < toRemove; i++) {
      const pattern = patterns[i]
      this.patternDatabase.delete(pattern.id)
      this.semanticIndex.delete(pattern.id)
      profile.patterns.splice(profile.patterns.indexOf(pattern.id), 1)
    }
    
    console.log(`🔍 Removed ${toRemove} old patterns for speaker ${speaker}`)
  }

  /**
   * Update pattern usage statistics
   */
  private updatePatternUsage(matches: VoicePatternMatch[], predictedSpeaker?: Speaker): void {
    for (const match of matches) {
      const pattern = match.pattern
      pattern.usage_count++
      
      // Bonus for patterns that contributed to correct prediction
      if (pattern.speaker === predictedSpeaker) {
        pattern.usage_count += 0.5
      }
    }
  }

  /**
   * Update pattern success rate
   */
  private updatePatternSuccessRate(pattern: VoicePattern, wasCorrect: boolean): void {
    const alpha = this.LEARNING_RATE
    const feedback = wasCorrect ? 1.0 : 0.0
    pattern.success_rate = (1 - alpha) * pattern.success_rate + alpha * feedback
  }

  /**
   * Update conversation context memory
   */
  private updateConversationContext(
    audioFeatures: any,
    speaker: Speaker,
    context: string,
    wasCorrect: boolean
  ): void {
    const contextEntry: ConversationContext = {
      audioFeatures,
      speaker,
      context,
      timestamp: Date.now(),
      wasCorrect
    }
    
    this.contextualMemory.push(contextEntry)
    
    // Keep only recent context
    if (this.contextualMemory.length > this.CONTEXT_WINDOW * 2) {
      this.contextualMemory = this.contextualMemory.slice(-this.CONTEXT_WINDOW)
    }
  }

  // ===== HELPER METHODS =====

  private encodeAudioFeatures(audioFeatures: any): number[] {
    // Simplified audio feature encoding
    const encoding: number[] = []
    
    if (audioFeatures.mfcc) {
      encoding.push(...audioFeatures.mfcc)
    }
    if (audioFeatures.pitch) {
      encoding.push(audioFeatures.pitch / 500) // Normalize
    }
    if (audioFeatures.energy) {
      encoding.push(audioFeatures.energy)
    }
    if (audioFeatures.spectralCentroid) {
      encoding.push(audioFeatures.spectralCentroid / 8000) // Normalize
    }
    
    return encoding
  }

  private encodeContext(context: string): number[] {
    // Simple context encoding using character codes
    const encoding: number[] = []
    const maxLength = 64
    
    for (let i = 0; i < Math.min(context.length, maxLength); i++) {
      encoding.push(context.charCodeAt(i) / 128) // Normalize to [0, 1]
    }
    
    // Pad with zeros
    while (encoding.length < maxLength) {
      encoding.push(0)
    }
    
    return encoding
  }

  private encodeTemporalFeatures(): number[] {
    const now = Date.now()
    const hour = new Date(now).getHours()
    const dayOfWeek = new Date(now).getDay()
    
    return [
      Math.sin(2 * Math.PI * hour / 24), // Hour cycle
      Math.cos(2 * Math.PI * hour / 24),
      Math.sin(2 * Math.PI * dayOfWeek / 7), // Day cycle
      Math.cos(2 * Math.PI * dayOfWeek / 7)
    ]
  }

  private encodeConversationHistory(): number[] {
    const encoding: number[] = []
    const recentContext = this.contextualMemory.slice(-5)
    
    // Encode speaker sequence
    const speakerSequence = recentContext.map(ctx => ctx.speaker === 'A' ? 0.0 : 1.0)
    encoding.push(...speakerSequence)
    
    // Pad to fixed length
    while (encoding.length < 10) {
      encoding.push(0.5) // Neutral value
    }
    
    return encoding.slice(0, 10)
  }

  private calculateContextualSimilarity(context1: string, context2: string): number {
    // Simple Jaccard similarity for contexts
    const words1 = new Set(context1.toLowerCase().split(/\s+/))
    const words2 = new Set(context2.toLowerCase().split(/\s+/))
    
    const intersection = new Set([...words1].filter(x => words2.has(x)))
    const union = new Set([...words1, ...words2])
    
    return union.size > 0 ? intersection.size / union.size : 0
  }

  private calculateRecencyScore(timestamp: number): number {
    const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60)
    return Math.exp(-ageHours / 24) // Exponential decay over 24 hours
  }

  private calculateUsageScore(usageCount: number): number {
    return Math.tanh(usageCount / 10) // Saturating function
  }

  private calculateTurnTakingBonus(context: ConversationContext[]): Map<Speaker, number> {
    const bonus = new Map<Speaker, number>()
    
    if (context.length < 2) return bonus
    
    const lastSpeaker = context[context.length - 1]?.speaker
    if (lastSpeaker) {
      // Bonus for speaker switching
      const otherSpeaker: Speaker = lastSpeaker === 'A' ? 'B' : 'A'
      bonus.set(otherSpeaker, 0.3)
      bonus.set(lastSpeaker, -0.1) // Small penalty for continuing
    }
    
    return bonus
  }

  private calculateConsistencyBonus(context: ConversationContext[]): Map<Speaker, number> {
    const bonus = new Map<Speaker, number>()
    
    if (context.length < 3) return bonus
    
    // Look for consistent speaker patterns
    const recentSpeakers = context.slice(-3).map(ctx => ctx.speaker)
    const speakerCounts = new Map<Speaker, number>()
    
    recentSpeakers.forEach(speaker => {
      speakerCounts.set(speaker, (speakerCounts.get(speaker) || 0) + 1)
    })
    
    // Bonus for speakers who have been consistent
    for (const [speaker, count] of speakerCounts) {
      if (count >= 2) {
        bonus.set(speaker, count * 0.1)
      }
    }
    
    return bonus
  }

  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, x) => sum + x * x, 0))
    return magnitude > 0 ? vector.map(x => x / magnitude) : vector
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      magnitudeA += a[i] * a[i]
      magnitudeB += b[i] * b[i]
    }
    
    magnitudeA = Math.sqrt(magnitudeA)
    magnitudeB = Math.sqrt(magnitudeB)
    
    return magnitudeA > 0 && magnitudeB > 0 ? dotProduct / (magnitudeA * magnitudeB) : 0
  }

  private generatePatternId(speaker: Speaker, timestamp: number): string {
    return `pattern_${speaker}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  }

  private buildSemanticIndex(): void {
    console.log('🔍 Building semantic search index...')
    // Index is built as patterns are added
  }

  private async loadPretrainedPatterns(): Promise<void> {
    // In production, load patterns from persistent storage
    console.log('🔍 Loading pre-trained voice patterns...')
    
    // Create some example patterns for demonstration
    const examplePatterns = [
      {
        speaker: 'A' as Speaker,
        features: { pitch: 180, energy: 0.7, mfcc: [1, 2, 3, 4, 5] },
        context: 'greeting conversation introduction',
        confidence: 0.8
      },
      {
        speaker: 'B' as Speaker,
        features: { pitch: 120, energy: 0.5, mfcc: [5, 4, 3, 2, 1] },
        context: 'response question clarification',
        confidence: 0.9
      }
    ]
    
    for (const pattern of examplePatterns) {
      await this.storeVoicePattern(
        pattern.features,
        pattern.speaker,
        pattern.context,
        pattern.confidence
      )
    }
  }

  // Public methods
  getStats(): RAGServiceStats {
    return {
      totalPatterns: this.patternDatabase.size,
      speakerProfiles: this.speakerProfiles.size,
      contextMemorySize: this.contextualMemory.length,
      averagePatternAge: this.calculateAveragePatternAge(),
      patternsByScore: this.getPatternDistribution()
    }
  }

  private calculateAveragePatternAge(): number {
    const patterns = Array.from(this.patternDatabase.values())
    if (patterns.length === 0) return 0
    
    const now = Date.now()
    const totalAge = patterns.reduce((sum, pattern) => sum + (now - pattern.timestamp), 0)
    return totalAge / patterns.length / (1000 * 60 * 60) // Hours
  }

  private getPatternDistribution(): { [key: string]: number } {
    const patterns = Array.from(this.patternDatabase.values())
    const distribution: { [key: string]: number } = {
      high: 0,    // > 0.8
      medium: 0,  // 0.5 - 0.8
      low: 0      // < 0.5
    }
    
    patterns.forEach(pattern => {
      if (pattern.success_rate > 0.8) distribution.high++
      else if (pattern.success_rate > 0.5) distribution.medium++
      else distribution.low++
    })
    
    return distribution
  }

  cleanup(): void {
    this.patternDatabase.clear()
    this.semanticIndex.clear()
    this.contextualMemory = []
    this.speakerProfiles.clear()
    console.log('🔍 Voice Pattern RAG Service cleaned up')
  }
}

// ===== TYPE DEFINITIONS =====

interface VoicePattern {
  id: string
  speaker: Speaker
  audioFeatures: any
  semanticEmbedding: number[]
  context: string
  confidence: number
  timestamp: number
  usage_count: number
  success_rate: number
}

interface VoicePatternMatch {
  patternId: string
  pattern: VoicePattern
  similarity: number
  semantic_score: number
  contextual_score: number
  composite_score: number
}

interface ConversationContext {
  audioFeatures: any
  speaker: Speaker
  context: string
  timestamp: number
  wasCorrect: boolean
}

interface SpeakerProfile {
  speaker: Speaker
  patterns: string[]
  avgConfidence: number
  totalPatterns: number
  lastUpdate: number
}

interface RAGPredictionResult {
  speaker?: Speaker
  confidence: number
  reasoning: string
  patterns_used: number
  semantic_score: number
}

interface RAGServiceStats {
  totalPatterns: number
  speakerProfiles: number
  contextMemorySize: number
  averagePatternAge: number
  patternsByScore: { [key: string]: number }
}

// Singleton instance
export const voicePatternRAGService = new VoicePatternRAGService()