import type { Speaker, VADResult, AudioLevel } from '@/types'
import { autoSpeakerDetectionService } from './AutoSpeakerDetectionService'
import { advancedSpeakerDetectionService } from './AdvancedSpeakerDetectionService'
import { voicePatternRAGService } from './VoicePatternRAGService'

/**
 * HybridSpeakerDetectionService - Ultimate speaker detection system
 * 
 * Combines multiple detection approaches:
 * 1. Traditional VAD + pitch detection (AutoSpeakerDetectionService)
 * 2. Advanced ML features + neural networks (AdvancedSpeakerDetectionService)
 * 3. RAG-based pattern matching (VoicePatternRAGService)
 * 4. Ensemble decision making with confidence calibration
 * 5. Adaptive system selection based on performance
 * 6. Real-time learning and improvement
 */
export class HybridSpeakerDetectionService {
  private detectionMethods: Map<string, DetectionMethod> = new Map()
  private performanceHistory: PerformanceRecord[] = []
  private adaptiveWeights: Map<string, number> = new Map()
  private isInitialized: boolean = false
  private sessionData: SessionData = {
    totalDetections: 0,
    correctDetections: 0,
    avgConfidence: 0,
    methodPerformance: new Map()
  }

  // Hybrid parameters
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.7
  private readonly ENSEMBLE_METHODS = 3
  private readonly PERFORMANCE_WINDOW = 50
  private readonly ADAPTATION_RATE = 0.05
  private readonly QUALITY_THRESHOLD = 0.8

  /**
   * Initialize all detection services
   */
  async initialize(): Promise<void> {
    console.log('🚀 Hybrid Speaker Detection initializing...')
    
    try {
      // Initialize all sub-services
      await Promise.all([
        autoSpeakerDetectionService.initialize(),
        advancedSpeakerDetectionService.initialize(),
        voicePatternRAGService.initialize()
      ])

      // Register detection methods
      this.registerDetectionMethods()
      
      // Initialize adaptive weights
      this.initializeAdaptiveWeights()
      
      this.isInitialized = true
      console.log('🚀 Hybrid Speaker Detection initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize Hybrid Speaker Detection:', error)
      throw error
    }
  }

  /**
   * Main hybrid detection method
   */
  async detectSpeaker(
    audioData: Float32Array,
    sampleRate: number = 44100,
    conversationContext: string = ''
  ): Promise<HybridDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Hybrid detection service not initialized')
    }

    const timestamp = Date.now()
    const detectionPromises: Promise<DetectionMethodResult>[] = []

    // Run all detection methods in parallel
    for (const [methodName, method] of this.detectionMethods) {
      if (method.enabled && this.shouldUseMethod(methodName)) {
        const promise = this.runDetectionMethod(method, audioData, sampleRate, conversationContext)
          .catch(error => {
            console.warn(`Detection method ${methodName} failed:`, error)
            return {
              methodName,
              speaker: undefined,
              confidence: 0,
              processingTime: 0,
              error: error.message
            }
          })
        detectionPromises.push(promise)
      }
    }

    // Wait for all methods to complete
    const methodResults = await Promise.all(detectionPromises)
    
    // Filter out failed methods
    const validResults = methodResults.filter(result => !result.error && result.confidence > 0.1)
    
    if (validResults.length === 0) {
      return {
        speaker: undefined,
        confidence: 0,
        method: 'no_methods_available',
        timestamp,
        reasoning: 'All detection methods failed or returned low confidence',
        methodResults: methodResults,
        ensembleScore: 0,
        qualityMetrics: this.calculateQualityMetrics(methodResults)
      }
    }

    // Ensemble decision making
    const ensembleResult = this.makeEnsembleDecision(validResults, conversationContext)
    
    // Update performance tracking
    this.updatePerformanceTracking(methodResults, ensembleResult)
    
    // Learn from this detection
    await this.learnFromDetection(audioData, ensembleResult, conversationContext)

    return {
      speaker: ensembleResult.speaker,
      confidence: ensembleResult.confidence,
      method: ensembleResult.method,
      timestamp,
      reasoning: ensembleResult.reasoning,
      methodResults: methodResults,
      ensembleScore: ensembleResult.ensembleScore,
      qualityMetrics: this.calculateQualityMetrics(methodResults)
    }
  }

  /**
   * Provide feedback to improve detection accuracy
   */
  async provideFeedback(
    audioData: Float32Array,
    predictedSpeaker: Speaker | undefined,
    actualSpeaker: Speaker,
    conversationContext: string
  ): Promise<void> {
    const wasCorrect = predictedSpeaker === actualSpeaker
    
    // Update session statistics
    this.sessionData.totalDetections++
    if (wasCorrect) {
      this.sessionData.correctDetections++
    }
    
    // Update accuracy
    const accuracy = this.sessionData.correctDetections / this.sessionData.totalDetections
    
    // Provide feedback to RAG service
    await voicePatternRAGService.learnFromFeedback(
      { audioData, timestamp: Date.now() },
      predictedSpeaker,
      actualSpeaker,
      conversationContext
    )
    
    // Update adaptive weights
    this.updateAdaptiveWeights(wasCorrect, accuracy)
    
    // Record performance
    this.recordPerformance(wasCorrect, accuracy)
    
    console.log(`🚀 Feedback recorded: ${wasCorrect ? 'correct' : 'incorrect'}, accuracy: ${(accuracy * 100).toFixed(1)}%`)
  }

  /**
   * Get current detection statistics
   */
  getDetectionStats(): HybridDetectionStats {
    const methodStats = new Map<string, MethodStats>()
    
    for (const [methodName, method] of this.detectionMethods) {
      const performance = this.sessionData.methodPerformance.get(methodName)
      methodStats.set(methodName, {
        enabled: method.enabled,
        weight: this.adaptiveWeights.get(methodName) || 0,
        successRate: performance?.successRate || 0,
        avgConfidence: performance?.avgConfidence || 0,
        avgProcessingTime: performance?.avgProcessingTime || 0
      })
    }

    return {
      overallAccuracy: this.sessionData.correctDetections / Math.max(this.sessionData.totalDetections, 1),
      totalDetections: this.sessionData.totalDetections,
      avgConfidence: this.sessionData.avgConfidence,
      methodStats,
      adaptiveWeights: new Map(this.adaptiveWeights),
      isAdapting: this.sessionData.totalDetections >= 10
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Register all detection methods
   */
  private registerDetectionMethods(): void {
    this.detectionMethods.set('auto', {
      name: 'auto',
      service: autoSpeakerDetectionService,
      enabled: true,
      priority: 3,
      minConfidenceThreshold: 0.6,
      expectedProcessingTime: 50 // ms
    })

    this.detectionMethods.set('advanced', {
      name: 'advanced',
      service: advancedSpeakerDetectionService,
      enabled: true,
      priority: 2,
      minConfidenceThreshold: 0.75,
      expectedProcessingTime: 150 // ms
    })

    this.detectionMethods.set('rag', {
      name: 'rag',
      service: voicePatternRAGService,
      enabled: true,
      priority: 1,
      minConfidenceThreshold: 0.8,
      expectedProcessingTime: 100 // ms
    })
  }

  /**
   * Initialize adaptive weights
   */
  private initializeAdaptiveWeights(): void {
    this.adaptiveWeights.set('auto', 0.4)
    this.adaptiveWeights.set('advanced', 0.35)
    this.adaptiveWeights.set('rag', 0.25)
  }

  /**
   * Determine if a method should be used
   */
  private shouldUseMethod(methodName: string): boolean {
    const method = this.detectionMethods.get(methodName)
    if (!method || !method.enabled) return false
    
    // Use all methods initially
    if (this.sessionData.totalDetections < 10) return true
    
    // Adaptive method selection based on performance
    const weight = this.adaptiveWeights.get(methodName) || 0
    const performance = this.sessionData.methodPerformance.get(methodName)
    
    // Disable methods with consistently poor performance
    if (performance && performance.successRate < 0.3 && this.sessionData.totalDetections > 20) {
      return false
    }
    
    // Use methods with decent weights
    return weight > 0.1
  }

  /**
   * Run a specific detection method
   */
  private async runDetectionMethod(
    method: DetectionMethod,
    audioData: Float32Array,
    sampleRate: number,
    conversationContext: string
  ): Promise<DetectionMethodResult> {
    const startTime = Date.now()
    
    try {
      let result: any
      
      switch (method.name) {
        case 'auto':
          result = autoSpeakerDetectionService.detectSpeakerAuto(audioData, sampleRate)
          break
          
        case 'advanced':
          result = await advancedSpeakerDetectionService.detectSpeakerAdvanced(audioData, sampleRate)
          break
          
        case 'rag':
          const ragResult = await voicePatternRAGService.predictSpeaker(
            { audioData, timestamp: Date.now() },
            conversationContext
          )
          result = {
            speaker: ragResult.speaker,
            confidence: ragResult.confidence,
            reasoning: ragResult.reasoning
          }
          break
          
        default:
          throw new Error(`Unknown detection method: ${method.name}`)
      }
      
      const processingTime = Date.now() - startTime
      
      return {
        methodName: method.name,
        speaker: result.speaker,
        confidence: result.confidence || 0,
        processingTime,
        reasoning: result.reasoning || `Detection by ${method.name} method`
      }
      
    } catch (error) {
      return {
        methodName: method.name,
        speaker: undefined,
        confidence: 0,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Make ensemble decision from multiple method results
   */
  private makeEnsembleDecision(
    results: DetectionMethodResult[],
    conversationContext: string
  ): EnsembleDecisionResult {
    if (results.length === 0) {
      return {
        speaker: undefined,
        confidence: 0,
        method: 'no_results',
        reasoning: 'No valid detection results',
        ensembleScore: 0
      }
    }

    // Calculate weighted scores for each speaker
    const speakerScores = new Map<Speaker, number>()
    const methodsUsed: string[] = []
    let totalWeight = 0

    for (const result of results) {
      if (!result.speaker || result.confidence < 0.1) continue
      
      const weight = this.adaptiveWeights.get(result.methodName) || 0.1
      const weightedScore = result.confidence * weight
      
      const currentScore = speakerScores.get(result.speaker) || 0
      speakerScores.set(result.speaker, currentScore + weightedScore)
      
      totalWeight += weight
      methodsUsed.push(result.methodName)
    }

    if (speakerScores.size === 0 || totalWeight === 0) {
      return {
        speaker: undefined,
        confidence: 0,
        method: 'no_consensus',
        reasoning: 'No method reached minimum confidence',
        ensembleScore: 0
      }
    }

    // Find best speaker
    let bestSpeaker: Speaker | undefined = undefined
    let bestScore = 0
    
    for (const [speaker, score] of speakerScores) {
      const normalizedScore = score / totalWeight
      if (normalizedScore > bestScore) {
        bestScore = normalizedScore
        bestSpeaker = speaker
      }
    }

    // Apply conversation context bonus
    const contextBonus = this.calculateContextBonus(bestSpeaker, conversationContext)
    const finalScore = Math.min(1.0, bestScore + contextBonus)

    // Calculate ensemble agreement score
    const ensembleScore = this.calculateEnsembleScore(results, bestSpeaker)

    return {
      speaker: finalScore > this.MIN_CONFIDENCE_THRESHOLD ? bestSpeaker : undefined,
      confidence: finalScore,
      method: `ensemble(${methodsUsed.join('+')})`,
      reasoning: `Ensemble decision from ${methodsUsed.length} methods: ${methodsUsed.join(', ')}`,
      ensembleScore
    }
  }

  /**
   * Calculate context bonus for speaker prediction
   */
  private calculateContextBonus(speaker: Speaker | undefined, context: string): number {
    if (!speaker) return 0
    
    // Simple context analysis
    const lowerContext = context.toLowerCase()
    
    // Greeting context might favor first speaker
    if (lowerContext.includes('hello') || lowerContext.includes('hi') || lowerContext.includes('greeting')) {
      return speaker === 'A' ? 0.05 : 0
    }
    
    // Response context might favor alternating speaker
    if (lowerContext.includes('response') || lowerContext.includes('answer')) {
      // This would need conversation history to determine alternation
      return 0.03
    }
    
    return 0
  }

  /**
   * Calculate ensemble agreement score
   */
  private calculateEnsembleScore(results: DetectionMethodResult[], predictedSpeaker?: Speaker): number {
    if (!predictedSpeaker || results.length === 0) return 0
    
    const agreementCount = results.filter(r => r.speaker === predictedSpeaker).length
    const totalMethods = results.length
    
    return agreementCount / totalMethods
  }

  /**
   * Update performance tracking
   */
  private updatePerformanceTracking(
    methodResults: DetectionMethodResult[],
    ensembleResult: EnsembleDecisionResult
  ): void {
    // Update method performance statistics
    for (const result of methodResults) {
      if (!this.sessionData.methodPerformance.has(result.methodName)) {
        this.sessionData.methodPerformance.set(result.methodName, {
          totalDetections: 0,
          successfulDetections: 0,
          successRate: 0,
          avgConfidence: 0,
          avgProcessingTime: 0,
          confidenceSum: 0,
          processingTimeSum: 0
        })
      }
      
      const perf = this.sessionData.methodPerformance.get(result.methodName)!
      perf.totalDetections++
      perf.confidenceSum += result.confidence
      perf.processingTimeSum += result.processingTime
      perf.avgConfidence = perf.confidenceSum / perf.totalDetections
      perf.avgProcessingTime = perf.processingTimeSum / perf.totalDetections
    }
    
    // Update overall session data
    this.sessionData.avgConfidence = 
      (this.sessionData.avgConfidence * this.sessionData.totalDetections + ensembleResult.confidence) / 
      (this.sessionData.totalDetections + 1)
  }

  /**
   * Learn from detection results
   */
  private async learnFromDetection(
    audioData: Float32Array,
    result: EnsembleDecisionResult,
    context: string
  ): Promise<void> {
    // Store pattern in RAG service if confidence is high
    if (result.speaker && result.confidence > this.QUALITY_THRESHOLD) {
      await voicePatternRAGService.storeVoicePattern(
        { audioData, timestamp: Date.now() },
        result.speaker,
        context,
        result.confidence
      )
    }
  }

  /**
   * Update adaptive weights based on performance
   */
  private updateAdaptiveWeights(wasCorrect: boolean, overallAccuracy: number): void {
    if (this.sessionData.totalDetections < 10) return // Wait for sufficient data
    
    const learningRate = this.ADAPTATION_RATE
    
    for (const [methodName, weight] of this.adaptiveWeights) {
      const performance = this.sessionData.methodPerformance.get(methodName)
      if (!performance || performance.totalDetections < 5) continue
      
      const methodAccuracy = performance.successRate
      const relativeDifference = methodAccuracy - overallAccuracy
      
      // Increase weight for methods performing better than average
      let adjustment = relativeDifference * learningRate
      
      // Bonus for recent success
      if (wasCorrect) {
        adjustment += learningRate * 0.1
      }
      
      const newWeight = Math.max(0.05, Math.min(0.8, weight + adjustment))
      this.adaptiveWeights.set(methodName, newWeight)
    }
    
    // Normalize weights
    this.normalizeWeights()
  }

  /**
   * Normalize adaptive weights to sum to 1
   */
  private normalizeWeights(): void {
    const totalWeight = Array.from(this.adaptiveWeights.values()).reduce((sum, w) => sum + w, 0)
    
    if (totalWeight > 0) {
      for (const [methodName, weight] of this.adaptiveWeights) {
        this.adaptiveWeights.set(methodName, weight / totalWeight)
      }
    }
  }

  /**
   * Record performance for analysis
   */
  private recordPerformance(wasCorrect: boolean, accuracy: number): void {
    this.performanceHistory.push({
      timestamp: Date.now(),
      wasCorrect,
      accuracy,
      totalDetections: this.sessionData.totalDetections
    })
    
    // Keep only recent history
    if (this.performanceHistory.length > this.PERFORMANCE_WINDOW) {
      this.performanceHistory = this.performanceHistory.slice(-this.PERFORMANCE_WINDOW)
    }
  }

  /**
   * Calculate quality metrics
   */
  private calculateQualityMetrics(results: DetectionMethodResult[]): QualityMetrics {
    const validResults = results.filter(r => !r.error && r.confidence > 0)
    
    return {
      methodsUsed: validResults.length,
      avgProcessingTime: validResults.reduce((sum, r) => sum + r.processingTime, 0) / Math.max(validResults.length, 1),
      confidenceVariance: this.calculateVariance(validResults.map(r => r.confidence)),
      consensus: validResults.length > 1 ? this.calculateConsensus(validResults) : 0
    }
  }

  /**
   * Calculate variance of an array
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length
  }

  /**
   * Calculate consensus among methods
   */
  private calculateConsensus(results: DetectionMethodResult[]): number {
    if (results.length < 2) return 1
    
    const speakerCounts = new Map<Speaker | undefined, number>()
    results.forEach(r => {
      speakerCounts.set(r.speaker, (speakerCounts.get(r.speaker) || 0) + 1)
    })
    
    const maxCount = Math.max(...Array.from(speakerCounts.values()))
    return maxCount / results.length
  }

  // Public methods
  cleanup(): void {
    autoSpeakerDetectionService.cleanup()
    advancedSpeakerDetectionService.cleanup()
    voicePatternRAGService.cleanup()
    
    this.detectionMethods.clear()
    this.performanceHistory = []
    this.adaptiveWeights.clear()
    this.isInitialized = false
    
    console.log('🚀 Hybrid Speaker Detection cleaned up')
  }
}

// ===== TYPE DEFINITIONS =====

interface DetectionMethod {
  name: string
  service: any
  enabled: boolean
  priority: number
  minConfidenceThreshold: number
  expectedProcessingTime: number
}

interface DetectionMethodResult {
  methodName: string
  speaker?: Speaker
  confidence: number
  processingTime: number
  reasoning?: string
  error?: string
}

interface EnsembleDecisionResult {
  speaker?: Speaker
  confidence: number
  method: string
  reasoning: string
  ensembleScore: number
}

interface HybridDetectionResult {
  speaker?: Speaker
  confidence: number
  method: string
  timestamp: number
  reasoning: string
  methodResults: DetectionMethodResult[]
  ensembleScore: number
  qualityMetrics: QualityMetrics
}

interface SessionData {
  totalDetections: number
  correctDetections: number
  avgConfidence: number
  methodPerformance: Map<string, MethodPerformance>
}

interface MethodPerformance {
  totalDetections: number
  successfulDetections: number
  successRate: number
  avgConfidence: number
  avgProcessingTime: number
  confidenceSum: number
  processingTimeSum: number
}

interface PerformanceRecord {
  timestamp: number
  wasCorrect: boolean
  accuracy: number
  totalDetections: number
}

interface MethodStats {
  enabled: boolean
  weight: number
  successRate: number
  avgConfidence: number
  avgProcessingTime: number
}

interface HybridDetectionStats {
  overallAccuracy: number
  totalDetections: number
  avgConfidence: number
  methodStats: Map<string, MethodStats>
  adaptiveWeights: Map<string, number>
  isAdapting: boolean
}

interface QualityMetrics {
  methodsUsed: number
  avgProcessingTime: number
  confidenceVariance: number
  consensus: number
}

// Singleton instance
export const hybridSpeakerDetectionService = new HybridSpeakerDetectionService()