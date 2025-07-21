/**
 * Quality Gates System for Emma AI
 * Comprehensive validation and monitoring for AI responses
 * QA Persona - Prevention > Detection > Correction
 */

import type { SafetyValidatedResponse, CrisisDetectionResult, EmotionData } from '@/types'

// Quality metrics thresholds
export const QUALITY_THRESHOLDS = {
  // Response quality
  MIN_CONFIDENCE: 0.7,
  MAX_RESPONSE_TIME_MS: 5000,
  MIN_THERAPEUTIC_SCORE: 0.6,
  
  // Crisis detection
  CRISIS_CONFIDENCE_THRESHOLD: 0.8,
  IMMEDIATE_ESCALATION_THRESHOLD: 0.95,
  
  // Safety checks  
  MAX_HALLUCINATION_RISK: 0.3,
  MIN_SAFETY_SCORE: 0.8,
  
  // User experience
  MAX_RESPONSE_LENGTH: 500,
  MIN_EMPATHY_SCORE: 0.7
} as const

export interface QualityMetrics {
  responseTime: number
  confidence: number
  therapeuticQuality: number
  safetyScore: number
  empathyScore: number
  hallucinationRisk: number
  crisisDetectionAccuracy: number
  timestamp: Date
}

export interface ValidationResult {
  passed: boolean
  gate: string
  score: number
  issues: string[]
  recommendations: string[]
  requiresHumanReview: boolean
}

export class QualityGateSystem {
  private metrics: QualityMetrics[] = []
  
  /**
   * Gate 1: Input Validation & Risk Assessment
   */
  async validateInput(userInput: string, emotion?: EmotionData): Promise<ValidationResult> {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Length validation
    if (userInput.length > 1000) {
      issues.push('Input exceeds maximum length')
      recommendations.push('Truncate input to 1000 characters')
    }
    
    if (userInput.length < 5) {
      issues.push('Input too short for meaningful analysis')
      recommendations.push('Encourage user to provide more context')
    }
    
    // Content safety pre-check
    const riskIndicators = this.detectHighRiskContent(userInput)
    const riskScore = riskIndicators.length / 10 // Normalize
    
    if (riskScore > 0.8) {
      issues.push('High-risk content detected')
      recommendations.push('Prepare crisis intervention protocols')
    }
    
    // Emotion consistency check
    if (emotion && this.checkEmotionInputMismatch(userInput, emotion)) {
      issues.push('Emotion-text mismatch detected')
      recommendations.push('Request clarification from user')
    }
    
    return {
      passed: issues.length === 0,
      gate: 'input-validation',
      score: Math.max(0, 1 - (issues.length * 0.2)),
      issues,
      recommendations,
      requiresHumanReview: riskScore > 0.9
    }
  }
  
  /**
   * Gate 2: AI Response Quality Assessment
   */
  async validateResponse(
    response: SafetyValidatedResponse<string>,
    userInput: string,
    crisisResult: CrisisDetectionResult
  ): Promise<ValidationResult> {
    const issues: string[] = []
    const recommendations: string[] = []
    const startTime = Date.now()
    
    // Response time check
    const responseTime = Date.now() - startTime
    if (responseTime > QUALITY_THRESHOLDS.MAX_RESPONSE_TIME_MS) {
      issues.push(`Response time ${responseTime}ms exceeds ${QUALITY_THRESHOLDS.MAX_RESPONSE_TIME_MS}ms`)
      recommendations.push('Optimize AI processing pipeline')
    }
    
    // Confidence threshold
    if (response.confidence < QUALITY_THRESHOLDS.MIN_CONFIDENCE) {
      issues.push(`Low confidence score: ${response.confidence}`)
      recommendations.push('Consider regenerating response or requesting human review')
    }
    
    // Therapeutic quality assessment
    const therapeuticScore = await this.assessTherapeuticQuality(response.data, userInput)
    if (therapeuticScore < QUALITY_THRESHOLDS.MIN_THERAPEUTIC_SCORE) {
      issues.push(`Low therapeutic quality: ${therapeuticScore}`)
      recommendations.push('Improve empathy and therapeutic language')
    }
    
    // Crisis response appropriateness
    if (crisisResult.isCrisis) {
      const crisisAppropriate = this.validateCrisisResponse(response.data, crisisResult)
      if (!crisisAppropriate) {
        issues.push('Crisis response does not follow safety protocols')
        recommendations.push('Apply crisis response template')
      }
    }
    
    // Hallucination detection
    const hallucinationRisk = await this.detectHallucinations(response.data, userInput)
    if (hallucinationRisk > QUALITY_THRESHOLDS.MAX_HALLUCINATION_RISK) {
      issues.push(`High hallucination risk: ${hallucinationRisk}`)
      recommendations.push('Fact-check response and ground in conversation context')
    }
    
    // Length appropriateness  
    if (response.data.length > QUALITY_THRESHOLDS.MAX_RESPONSE_LENGTH) {
      issues.push('Response too long for optimal user experience')
      recommendations.push('Condense response while maintaining therapeutic value')
    }
    
    // Record metrics
    const metrics: QualityMetrics = {
      responseTime,
      confidence: response.confidence,
      therapeuticQuality: therapeuticScore,
      safetyScore: response.safetyChecked ? 1 : 0,
      empathyScore: await this.calculateEmpathyScore(response.data),
      hallucinationRisk,
      crisisDetectionAccuracy: crisisResult.isCrisis ? 
        (response.crisisDetected ? 1 : 0) : (response.crisisDetected ? 0 : 1),
      timestamp: new Date()
    }
    
    this.metrics.push(metrics)
    
    return {
      passed: issues.length === 0 && !response.requiresHumanReview,
      gate: 'response-quality', 
      score: this.calculateOverallQualityScore(metrics),
      issues,
      recommendations,
      requiresHumanReview: response.requiresHumanReview || issues.length > 2
    }
  }
  
  /**
   * Gate 3: Crisis Detection Validation
   */
  async validateCrisisDetection(
    userInput: string,
    crisisResult: CrisisDetectionResult,
    emotion?: EmotionData
  ): Promise<ValidationResult> {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Check for false negatives (missed crises)
    const criticalKeywords = [
      'kill myself', 'suicide', 'end my life', 'hurt myself',
      'abuse', 'violence', 'threaten', 'hopeless'
    ]
    
    const hasHighRiskLanguage = criticalKeywords.some(keyword => 
      userInput.toLowerCase().includes(keyword)
    )
    
    if (hasHighRiskLanguage && !crisisResult.isCrisis) {
      issues.push('Potential false negative in crisis detection')
      recommendations.push('Manual review required - high-risk language detected')
    }
    
    // Check for false positives
    const neutralPhrases = [
      'feeling down', 'having a bad day', 'frustrated',
      'annoyed', 'tired', 'stressed'
    ]
    
    const hasNeutralLanguage = neutralPhrases.some(phrase =>
      userInput.toLowerCase().includes(phrase)
    )
    
    if (hasNeutralLanguage && crisisResult.isCrisis && crisisResult.severity === 'emergency') {
      issues.push('Potential false positive - neutral language flagged as crisis')
      recommendations.push('Reduce crisis sensitivity threshold')
    }
    
    // Emotion-crisis consistency
    if (emotion && emotion.sentiment > 0.3 && crisisResult.isCrisis) {
      issues.push('Positive emotion with crisis detection - possible false positive')
      recommendations.push('Review emotion analysis accuracy')
    }
    
    // Resource appropriateness
    if (crisisResult.isCrisis && crisisResult.resources.length === 0) {
      issues.push('Crisis detected but no resources provided')
      recommendations.push('Always include crisis resources when crisis detected')
    }
    
    return {
      passed: issues.length === 0,
      gate: 'crisis-detection',
      score: issues.length === 0 ? 1 : Math.max(0, 1 - (issues.length * 0.3)),
      issues,
      recommendations,
      requiresHumanReview: issues.length > 0 || crisisResult.escalationRequired
    }
  }
  
  /**
   * Gate 4: End-to-End Quality Validation
   */
  async validateE2E(
    userInput: string,
    response: SafetyValidatedResponse<string>,
    crisisResult: CrisisDetectionResult
  ): Promise<ValidationResult> {
    const issues: string[] = []
    const recommendations: string[] = []
    
    // Conversation flow appropriateness
    const flowScore = this.assessConversationFlow(userInput, response.data)
    if (flowScore < 0.7) {
      issues.push('Poor conversation flow continuity')
      recommendations.push('Improve context awareness and response relevance')
    }
    
    // Overall safety assessment
    const overallSafety = this.assessOverallSafety(response, crisisResult)
    if (overallSafety < QUALITY_THRESHOLDS.MIN_SAFETY_SCORE) {
      issues.push('Overall safety score below threshold')
      recommendations.push('Comprehensive safety review required')
    }
    
    // User experience prediction
    const uxScore = this.predictUserExperience(response.data)
    if (uxScore < 0.6) {
      issues.push('Poor predicted user experience')
      recommendations.push('Improve response empathy and relevance')
    }
    
    return {
      passed: issues.length === 0,
      gate: 'end-to-end',
      score: (flowScore + overallSafety + uxScore) / 3,
      issues,
      recommendations,
      requiresHumanReview: overallSafety < 0.5
    }
  }
  
  // Helper methods
  private detectHighRiskContent(text: string): string[] {
    const riskPatterns = [
      /\b(kill|murder|hurt|harm|abuse|violence)\b/i,
      /\b(suicide|self-harm|cutting|overdose)\b/i,
      /\b(hopeless|worthless|give up|can't go on)\b/i,
      /\b(threat|threaten|dangerous|weapon)\b/i
    ]
    
    return riskPatterns.filter(pattern => pattern.test(text)).map(p => p.source)
  }
  
  private checkEmotionInputMismatch(text: string, emotion: EmotionData): boolean {
    const textSentiment = this.calculateTextSentiment(text)
    const emotionSentiment = emotion.sentiment
    
    // Flag if text and emotion sentiment differ by more than 0.7
    return Math.abs(textSentiment - emotionSentiment) > 0.7
  }
  
  private async assessTherapeuticQuality(response: string, userInput: string): Promise<number> {
    // Assess therapeutic language patterns
    const therapeuticMarkers = [
      /I hear (that )?you/i,
      /That sounds/i,
      /It makes sense/i,
      /You're not alone/i,
      /How are you feeling/i,
      /Tell me more about/i
    ]
    
    const empathyMarkers = therapeuticMarkers.filter(marker => marker.test(response)).length
    const maxMarkers = therapeuticMarkers.length
    
    return Math.min(1, empathyMarkers / maxMarkers + 0.3) // Base score + markers
  }
  
  private validateCrisisResponse(response: string, crisis: CrisisDetectionResult): boolean {
    if (!crisis.isCrisis) return true
    
    const requiredElements = [
      /I.*(concerned|worried|hear)/i, // Empathy
      /(resources?|help|support)/i,   // Resource offering
      /(safe|safety)/i,               // Safety focus
      /not alone/i                    // Support message
    ]
    
    const presentElements = requiredElements.filter(element => element.test(response)).length
    return presentElements >= 3 // At least 3 of 4 required elements
  }
  
  private async detectHallucinations(response: string, userInput: string): Promise<number> {
    // Basic hallucination detection - check for facts not mentioned by user
    const responseWords = response.toLowerCase().split(/\W+/)
    const userWords = userInput.toLowerCase().split(/\W+/)
    
    // Red flags: specific facts/names/places not mentioned by user
    const factualClaims = responseWords.filter(word => 
      word.length > 6 && 
      !userWords.includes(word) &&
      /^[a-z]+$/.test(word) // Only letters, likely a proper noun
    )
    
    return Math.min(1, factualClaims.length / 10) // Risk score
  }
  
  private calculateEmpathyScore(response: string): Promise<number> {
    const empathyMarkers = [
      /I can understand/i,
      /That must be/i,
      /It sounds like/i,
      /I hear you/i,
      /You're feeling/i,
      /That's really/i
    ]
    
    const score = empathyMarkers.filter(marker => marker.test(response)).length / empathyMarkers.length
    return Promise.resolve(Math.min(1, score + 0.2))
  }
  
  private calculateTextSentiment(text: string): number {
    // Simple sentiment analysis
    const positiveWords = ['happy', 'good', 'great', 'love', 'joy', 'excited']
    const negativeWords = ['sad', 'bad', 'hate', 'angry', 'depressed', 'hopeless']
    
    const words = text.toLowerCase().split(/\W+/)
    const positive = words.filter(word => positiveWords.includes(word)).length
    const negative = words.filter(word => negativeWords.includes(word)).length
    
    return (positive - negative) / Math.max(words.length, 1)
  }
  
  private calculateOverallQualityScore(metrics: QualityMetrics): number {
    return (
      metrics.confidence * 0.3 +
      metrics.therapeuticQuality * 0.25 +
      metrics.safetyScore * 0.25 +
      metrics.empathyScore * 0.2
    )
  }
  
  private assessConversationFlow(userInput: string, response: string): number {
    // Check if response addresses user's input appropriately
    const userTopics = this.extractTopics(userInput)
    const responseTopics = this.extractTopics(response)
    
    const overlap = userTopics.filter(topic => responseTopics.includes(topic)).length
    return Math.min(1, overlap / Math.max(userTopics.length, 1) + 0.3)
  }
  
  private assessOverallSafety(
    response: SafetyValidatedResponse<string>,
    crisis: CrisisDetectionResult
  ): number {
    let score = response.safetyChecked ? 0.5 : 0
    
    if (crisis.isCrisis && response.crisisDetected) score += 0.3
    if (!crisis.isCrisis && !response.crisisDetected) score += 0.3
    if (response.confidence > 0.8) score += 0.2
    
    return Math.min(1, score)
  }
  
  private predictUserExperience(response: string): number {
    // Factors: length, readability, empathy
    const length = response.length
    const optimalLength = 200
    const lengthScore = 1 - Math.abs(length - optimalLength) / optimalLength
    
    const sentences = response.split(/[.!?]+/).length
    const avgWordsPerSentence = response.split(/\W+/).length / sentences
    const readabilityScore = avgWordsPerSentence < 20 ? 1 : Math.max(0, 1 - (avgWordsPerSentence - 20) / 20)
    
    return (lengthScore + readabilityScore) / 2
  }
  
  private extractTopics(text: string): string[] {
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 4)
    
    return [...new Set(words)]
  }
  
  // Analytics and reporting
  public getQualityReport(): {
    averageMetrics: Partial<QualityMetrics>
    trends: string[]
    recommendations: string[]
  } {
    if (this.metrics.length === 0) {
      return { averageMetrics: {}, trends: [], recommendations: [] }
    }
    
    const avg = (field: keyof QualityMetrics) =>
      this.metrics.reduce((sum, m) => sum + (m[field] as number), 0) / this.metrics.length
    
    const averageMetrics = {
      responseTime: avg('responseTime'),
      confidence: avg('confidence'),
      therapeuticQuality: avg('therapeuticQuality'),
      safetyScore: avg('safetyScore'),
      empathyScore: avg('empathyScore'),
      hallucinationRisk: avg('hallucinationRisk'),
      crisisDetectionAccuracy: avg('crisisDetectionAccuracy')
    }
    
    const trends = this.analyzeTrends()
    const recommendations = this.generateRecommendations(averageMetrics)
    
    return { averageMetrics, trends, recommendations }
  }
  
  private analyzeTrends(): string[] {
    // Analyze recent trends vs historical
    if (this.metrics.length < 10) return ['Insufficient data for trend analysis']
    
    const recent = this.metrics.slice(-5)
    const historical = this.metrics.slice(0, -5)
    
    const trends = []
    
    const recentAvg = recent.reduce((sum, m) => sum + m.confidence, 0) / recent.length
    const historicalAvg = historical.reduce((sum, m) => sum + m.confidence, 0) / historical.length
    
    if (recentAvg > historicalAvg * 1.1) {
      trends.push('Confidence scores improving')
    } else if (recentAvg < historicalAvg * 0.9) {
      trends.push('Confidence scores declining')
    }
    
    return trends
  }
  
  private generateRecommendations(metrics: Partial<QualityMetrics>): string[] {
    const recommendations = []
    
    if ((metrics.confidence || 0) < QUALITY_THRESHOLDS.MIN_CONFIDENCE) {
      recommendations.push('Improve AI model confidence through fine-tuning')
    }
    
    if ((metrics.therapeuticQuality || 0) < QUALITY_THRESHOLDS.MIN_THERAPEUTIC_SCORE) {
      recommendations.push('Enhance therapeutic language patterns in responses')
    }
    
    if ((metrics.hallucinationRisk || 0) > QUALITY_THRESHOLDS.MAX_HALLUCINATION_RISK) {
      recommendations.push('Implement stricter fact-checking and grounding mechanisms')
    }
    
    if ((metrics.responseTime || 0) > QUALITY_THRESHOLDS.MAX_RESPONSE_TIME_MS) {
      recommendations.push('Optimize AI processing pipeline for faster responses')
    }
    
    return recommendations
  }
}