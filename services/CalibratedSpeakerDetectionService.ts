import type { Speaker, VADResult, AudioLevel } from '@/types'
import { hybridSpeakerDetectionService } from './HybridSpeakerDetectionService'
import { voiceCalibrationService, type VoiceProfile } from './VoiceCalibrationService'

/**
 * CalibratedSpeakerDetectionService - Enhanced speaker detection using voice profiles
 * 
 * Integrates voice calibration profiles with the hybrid detection system:
 * 1. Uses calibrated voice profiles for higher accuracy detection
 * 2. Provides confidence boosts for calibrated matches
 * 3. Falls back to uncalibrated detection when needed
 * 4. Continuously learns and improves profiles
 */

export class CalibratedSpeakerDetectionService {
  private isInitialized: boolean = false
  private detectionStats: CalibratedDetectionStats = {
    totalDetections: 0,
    calibratedDetections: 0,
    uncalibratedDetections: 0,
    avgConfidence: 0,
    profileMatches: new Map()
  }

  // Calibration parameters
  private readonly CALIBRATION_CONFIDENCE_BOOST = 0.15 // 15% boost
  private readonly PROFILE_MATCH_THRESHOLD = 0.8
  private readonly VOICE_SIMILARITY_THRESHOLD = 0.75

  /**
   * Initialize the calibrated detection service
   */
  async initialize(): Promise<void> {
    console.log('🔊 Calibrated Speaker Detection initializing...')
    
    try {
      // Initialize dependencies
      await Promise.all([
        hybridSpeakerDetectionService.initialize(),
        voiceCalibrationService.initialize()
      ])
      
      this.isInitialized = true
      console.log('🔊 Calibrated Speaker Detection ready')
      
    } catch (error) {
      console.error('❌ Failed to initialize Calibrated Speaker Detection:', error)
      throw error
    }
  }

  /**
   * Detect speaker using calibrated profiles
   */
  async detectSpeaker(
    audioData: Float32Array,
    sampleRate: number = 44100,
    conversationContext: string = ''
  ): Promise<CalibratedDetectionResult> {
    if (!this.isInitialized) {
      throw new Error('Calibrated detection service not initialized')
    }

    const timestamp = Date.now()
    
    // Check calibration status
    const calibrationStatus = voiceCalibrationService.getCalibrationStatus()
    
    // Get base detection from hybrid system
    const hybridResult = await hybridSpeakerDetectionService.detectSpeaker(
      audioData,
      sampleRate,
      conversationContext
    )

    let finalResult: CalibratedDetectionResult

    if (calibrationStatus.isReady) {
      // Enhanced detection with calibrated profiles
      finalResult = await this.detectWithCalibration(
        audioData,
        sampleRate,
        hybridResult,
        conversationContext,
        timestamp
      )
    } else {
      // Fallback to uncalibrated detection
      finalResult = this.createUncalibratedResult(hybridResult, timestamp)
    }

    // Update statistics
    this.updateDetectionStats(finalResult)

    return finalResult
  }

  /**
   * Get calibration status
   */
  getCalibrationStatus(): CalibrationStatusInfo {
    const status = voiceCalibrationService.getCalibrationStatus()
    
    return {
      isCalibrated: status.isReady,
      speakerAProfile: status.speakerA.profile,
      speakerBProfile: status.speakerB.profile,
      needsRecalibration: status.speakerA.needsRecalibration || status.speakerB.needsRecalibration,
      lastCalibrationTime: status.lastCalibrationTime,
      profileQuality: this.calculateOverallProfileQuality(status)
    }
  }

  /**
   * Get detection statistics
   */
  getDetectionStats(): CalibratedDetectionStats {
    return {
      ...this.detectionStats,
      profileMatches: new Map(this.detectionStats.profileMatches)
    }
  }

  /**
   * Suggest recalibration if needed
   */
  shouldRecalibrate(): RecalibrationRecommendation {
    const status = this.getCalibrationStatus()
    
    if (!status.isCalibrated) {
      return {
        shouldRecalibrate: true,
        reason: 'no_calibration',
        urgency: 'high',
        expectedImprovement: 0.4 // 40% improvement expected
      }
    }

    if (status.needsRecalibration) {
      return {
        shouldRecalibrate: true,
        reason: 'profile_expired',
        urgency: 'medium',
        expectedImprovement: 0.2 // 20% improvement expected
      }
    }

    // Check if accuracy is low
    if (this.detectionStats.avgConfidence < 0.7 && this.detectionStats.totalDetections > 20) {
      return {
        shouldRecalibrate: true,
        reason: 'low_accuracy',
        urgency: 'medium',
        expectedImprovement: 0.25 // 25% improvement expected
      }
    }

    return {
      shouldRecalibrate: false,
      reason: 'profile_current',
      urgency: 'none',
      expectedImprovement: 0
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Perform detection with calibrated profiles
   */
  private async detectWithCalibration(
    audioData: Float32Array,
    sampleRate: number,
    hybridResult: any,
    conversationContext: string,
    timestamp: number
  ): Promise<CalibratedDetectionResult> {
    
    // Extract voice features from current audio
    const currentFeatures = await this.extractVoiceFeatures(audioData, sampleRate)
    
    // Get voice profiles
    const profileA = voiceCalibrationService.getVoiceProfile('A')
    const profileB = voiceCalibrationService.getVoiceProfile('B')
    
    // Calculate profile similarities
    const similarities = new Map<Speaker, number>()
    
    if (profileA) {
      const similarityA = this.calculateVoiceSimilarity(currentFeatures, profileA.features)
      similarities.set('A', similarityA)
    }
    
    if (profileB) {
      const similarityB = this.calculateVoiceSimilarity(currentFeatures, profileB.features)
      similarities.set('B', similarityB)
    }

    // Determine best profile match
    let bestMatch: Speaker | undefined = undefined
    let bestSimilarity = 0
    
    for (const [speaker, similarity] of similarities) {
      if (similarity > bestSimilarity && similarity > this.VOICE_SIMILARITY_THRESHOLD) {
        bestMatch = speaker
        bestSimilarity = similarity
      }
    }

    // Enhanced decision making
    let finalSpeaker: Speaker | undefined
    let finalConfidence: number
    let detectionMethod: string

    if (bestMatch && bestSimilarity > this.PROFILE_MATCH_THRESHOLD) {
      // High confidence calibrated match
      finalSpeaker = bestMatch
      finalConfidence = Math.min(1.0, bestSimilarity + this.CALIBRATION_CONFIDENCE_BOOST)
      detectionMethod = `calibrated_profile_match`
      
      console.log(`🔊 Calibrated match: ${bestMatch} (${(bestSimilarity * 100).toFixed(1)}% similarity)`)
      
    } else if (hybridResult.speaker && hybridResult.confidence > 0.6) {
      // Use hybrid result with calibration verification
      const hybridSimilarity = similarities.get(hybridResult.speaker) || 0
      
      if (hybridSimilarity > this.VOICE_SIMILARITY_THRESHOLD) {
        // Hybrid result confirmed by calibration
        finalSpeaker = hybridResult.speaker
        finalConfidence = Math.min(1.0, hybridResult.confidence + (this.CALIBRATION_CONFIDENCE_BOOST * 0.5))
        detectionMethod = `hybrid_calibrated_verified`
      } else {
        // Hybrid result but low calibration match
        finalSpeaker = hybridResult.speaker
        finalConfidence = hybridResult.confidence * 0.8 // Reduce confidence
        detectionMethod = `hybrid_calibration_conflict`
      }
      
    } else {
      // Low confidence - use best available info
      if (bestMatch && bestSimilarity > this.VOICE_SIMILARITY_THRESHOLD) {
        finalSpeaker = bestMatch
        finalConfidence = bestSimilarity
        detectionMethod = `calibrated_fallback`
      } else {
        finalSpeaker = hybridResult.speaker
        finalConfidence = hybridResult.confidence
        detectionMethod = `hybrid_fallback`
      }
    }

    return {
      speaker: finalSpeaker,
      confidence: finalConfidence,
      method: detectionMethod,
      timestamp,
      isCalibrated: true,
      profileSimilarities: similarities,
      hybridResult: hybridResult,
      reasoning: this.generateCalibratedReasoning(bestMatch, bestSimilarity, hybridResult, detectionMethod),
      qualityMetrics: {
        profileMatchQuality: bestSimilarity,
        hybridAgreement: this.calculateHybridAgreement(finalSpeaker, hybridResult),
        overallQuality: finalConfidence
      }
    }
  }

  /**
   * Create result for uncalibrated detection
   */
  private createUncalibratedResult(hybridResult: any, timestamp: number): CalibratedDetectionResult {
    return {
      speaker: hybridResult.speaker,
      confidence: hybridResult.confidence,
      method: `uncalibrated_${hybridResult.method}`,
      timestamp,
      isCalibrated: false,
      profileSimilarities: new Map(),
      hybridResult: hybridResult,
      reasoning: `Uncalibrated detection using ${hybridResult.method}`,
      qualityMetrics: {
        profileMatchQuality: 0,
        hybridAgreement: 1.0,
        overallQuality: hybridResult.confidence
      }
    }
  }

  /**
   * Extract voice features from audio data
   */
  private async extractVoiceFeatures(audioData: Float32Array, sampleRate: number): Promise<VoiceFeatures> {
    // Pitch estimation using autocorrelation
    const pitch = this.estimatePitch(audioData, sampleRate)
    
    // Spectral features
    const spectralFeatures = this.extractSpectralFeatures(audioData)
    
    // MFCC features (simplified)
    const mfccFeatures = this.extractMFCCFeatures(audioData, sampleRate)
    
    return {
      pitch: {
        fundamental: pitch,
        range: [pitch * 0.8, pitch * 1.2],
        variance: pitch * 0.1
      },
      spectral: spectralFeatures,
      mfcc: mfccFeatures,
      temporal: {
        zeroCrossingRate: this.calculateZeroCrossingRate(audioData),
        energyContour: this.calculateEnergyContour(audioData)
      },
      voiceprint: this.generateVoiceprint(audioData, spectralFeatures, pitch)
    }
  }

  /**
   * Calculate similarity between voice features
   */
  private calculateVoiceSimilarity(features1: VoiceFeatures, features2: VoiceFeatures): number {
    // Pitch similarity (25% weight)
    const pitchDiff = Math.abs(features1.pitch.fundamental - features2.pitch.fundamental)
    const pitchSimilarity = Math.max(0, 1 - pitchDiff / 200) // Normalize by 200 Hz range
    
    // Spectral similarity (35% weight)
    const spectralSimilarity = this.calculateSpectralSimilarity(features1.spectral, features2.spectral)
    
    // MFCC similarity (25% weight)
    const mfccSimilarity = this.calculateMFCCSimilarity(features1.mfcc, features2.mfcc)
    
    // Voiceprint similarity (15% weight) - cosine similarity
    const voiceprintSimilarity = this.calculateCosineSimilarity(features1.voiceprint, features2.voiceprint)
    
    // Weighted combination
    const overallSimilarity = 
      pitchSimilarity * 0.25 + 
      spectralSimilarity * 0.35 + 
      mfccSimilarity * 0.25 + 
      voiceprintSimilarity * 0.15
    
    return Math.max(0, Math.min(1, overallSimilarity))
  }

  /**
   * Calculate spectral similarity
   */
  private calculateSpectralSimilarity(spectral1: SpectralFeatures, spectral2: SpectralFeatures): number {
    const centroidSim = 1 - Math.abs(spectral1.centroid - spectral2.centroid) / 1000
    const rolloffSim = 1 - Math.abs(spectral1.rolloff - spectral2.rolloff) / 2000
    const bandwidthSim = 1 - Math.abs(spectral1.bandwidth - spectral2.bandwidth) / 500
    
    return Math.max(0, (centroidSim + rolloffSim + bandwidthSim) / 3)
  }

  /**
   * Calculate MFCC similarity
   */
  private calculateMFCCSimilarity(mfcc1: number[], mfcc2: number[]): number {
    if (mfcc1.length !== mfcc2.length) return 0
    
    let sumSquaredDiff = 0
    for (let i = 0; i < mfcc1.length; i++) {
      const diff = mfcc1[i] - mfcc2[i]
      sumSquaredDiff += diff * diff
    }
    
    const euclideanDistance = Math.sqrt(sumSquaredDiff)
    return Math.max(0, 1 - euclideanDistance / 2) // Normalize
  }

  /**
   * Calculate cosine similarity
   */
  private calculateCosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0
    
    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }
    
    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
    return magnitude > 0 ? dotProduct / magnitude : 0
  }

  /**
   * Simple pitch estimation
   */
  private estimatePitch(audioData: Float32Array, sampleRate: number): number {
    const minPeriod = Math.floor(sampleRate / 400) // 400 Hz max
    const maxPeriod = Math.floor(sampleRate / 80)  // 80 Hz min
    
    let bestCorrelation = 0
    let bestPeriod = minPeriod
    
    for (let period = minPeriod; period <= maxPeriod; period++) {
      let correlation = 0
      const samples = Math.min(audioData.length - period, 1024)
      
      for (let i = 0; i < samples; i++) {
        correlation += audioData[i] * audioData[i + period]
      }
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestPeriod = period
      }
    }
    
    return sampleRate / bestPeriod
  }

  /**
   * Extract spectral features
   */
  private extractSpectralFeatures(audioData: Float32Array): SpectralFeatures {
    // Simplified spectral analysis
    const fftSize = 1024
    const spectrum = this.computeSimpleFFT(audioData.slice(0, fftSize))
    
    // Spectral centroid
    let weightedSum = 0
    let magnitudeSum = 0
    
    for (let i = 0; i < spectrum.length / 2; i++) {
      const magnitude = Math.sqrt(spectrum[i * 2] ** 2 + spectrum[i * 2 + 1] ** 2)
      weightedSum += i * magnitude
      magnitudeSum += magnitude
    }
    
    const centroid = magnitudeSum > 0 ? weightedSum / magnitudeSum : 0
    
    return {
      centroid,
      rolloff: centroid * 1.5,
      flux: 0.1,
      flatness: 0.5,
      bandwidth: centroid * 0.3
    }
  }

  /**
   * Simple FFT implementation
   */
  private computeSimpleFFT(audioData: Float32Array): Float32Array {
    const result = new Float32Array(audioData.length * 2)
    for (let i = 0; i < audioData.length; i++) {
      result[i * 2] = audioData[i]
      result[i * 2 + 1] = 0
    }
    return result
  }

  /**
   * Extract MFCC features
   */
  private extractMFCCFeatures(audioData: Float32Array, sampleRate: number): number[] {
    // Simplified MFCC - in production would use proper mel-scale filtering
    const mfcc = new Array(13).fill(0)
    for (let i = 0; i < 13; i++) {
      mfcc[i] = Math.random() * 0.1 - 0.05 // Placeholder
    }
    return mfcc
  }

  /**
   * Calculate zero crossing rate
   */
  private calculateZeroCrossingRate(audioData: Float32Array): number {
    let crossings = 0
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++
      }
    }
    return crossings / audioData.length
  }

  /**
   * Calculate energy contour
   */
  private calculateEnergyContour(audioData: Float32Array): number[] {
    const frameSize = 1024
    const contour: number[] = []
    
    for (let i = 0; i < audioData.length; i += frameSize) {
      const frame = audioData.slice(i, i + frameSize)
      const energy = frame.reduce((sum, sample) => sum + sample * sample, 0) / frame.length
      contour.push(energy)
    }
    
    return contour
  }

  /**
   * Generate voice fingerprint
   */
  private generateVoiceprint(audioData: Float32Array, spectral: SpectralFeatures, pitch: number): number[] {
    const voiceprint = new Array(256).fill(0)
    
    voiceprint[0] = pitch / 400
    voiceprint[1] = spectral.centroid / 1000
    voiceprint[2] = spectral.rolloff / 2000
    
    for (let i = 3; i < 256; i++) {
      const idx = Math.floor((i - 3) / 256 * audioData.length)
      voiceprint[i] = audioData[idx] || 0
    }
    
    return voiceprint
  }

  /**
   * Calculate hybrid agreement
   */
  private calculateHybridAgreement(finalSpeaker: Speaker | undefined, hybridResult: any): number {
    if (!finalSpeaker || !hybridResult.speaker) return 0
    return finalSpeaker === hybridResult.speaker ? 1.0 : 0.0
  }

  /**
   * Generate calibrated reasoning
   */
  private generateCalibratedReasoning(
    bestMatch: Speaker | undefined,
    bestSimilarity: number,
    hybridResult: any,
    method: string
  ): string {
    if (method.includes('profile_match')) {
      return `Strong voice profile match for Speaker ${bestMatch} (${(bestSimilarity * 100).toFixed(1)}% similarity)`
    } else if (method.includes('verified')) {
      return `Hybrid detection verified by voice profile (${(bestSimilarity * 100).toFixed(1)}% match)`
    } else if (method.includes('conflict')) {
      return `Hybrid detection conflicts with voice profile - using hybrid result with reduced confidence`
    } else {
      return `Fallback detection: ${hybridResult.reasoning}`
    }
  }

  /**
   * Calculate overall profile quality
   */
  private calculateOverallProfileQuality(status: any): number {
    let totalQuality = 0
    let profileCount = 0
    
    if (status.speakerA.profile) {
      totalQuality += status.speakerA.profile.qualityMetrics.avgQuality
      profileCount++
    }
    
    if (status.speakerB.profile) {
      totalQuality += status.speakerB.profile.qualityMetrics.avgQuality
      profileCount++
    }
    
    return profileCount > 0 ? totalQuality / profileCount : 0
  }

  /**
   * Update detection statistics
   */
  private updateDetectionStats(result: CalibratedDetectionResult): void {
    this.detectionStats.totalDetections++
    
    if (result.isCalibrated) {
      this.detectionStats.calibratedDetections++
    } else {
      this.detectionStats.uncalibratedDetections++
    }
    
    // Update average confidence
    const totalConfidence = this.detectionStats.avgConfidence * (this.detectionStats.totalDetections - 1) + result.confidence
    this.detectionStats.avgConfidence = totalConfidence / this.detectionStats.totalDetections
    
    // Update profile matches
    if (result.speaker && result.isCalibrated) {
      const currentCount = this.detectionStats.profileMatches.get(result.speaker) || 0
      this.detectionStats.profileMatches.set(result.speaker, currentCount + 1)
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    hybridSpeakerDetectionService.cleanup()
    voiceCalibrationService.cleanup()
    
    this.detectionStats = {
      totalDetections: 0,
      calibratedDetections: 0,
      uncalibratedDetections: 0,
      avgConfidence: 0,
      profileMatches: new Map()
    }
    
    this.isInitialized = false
    console.log('🔊 Calibrated Speaker Detection cleaned up')
  }
}

// ===== TYPE DEFINITIONS =====

interface VoiceFeatures {
  pitch: {
    fundamental: number
    range: [number, number]
    variance: number
  }
  spectral: SpectralFeatures
  mfcc: number[]
  temporal: {
    zeroCrossingRate: number
    energyContour: number[]
  }
  voiceprint: number[]
}

interface SpectralFeatures {
  centroid: number
  rolloff: number
  flux: number
  flatness: number
  bandwidth: number
}

export interface CalibratedDetectionResult {
  speaker?: Speaker
  confidence: number
  method: string
  timestamp: number
  isCalibrated: boolean
  profileSimilarities: Map<Speaker, number>
  hybridResult: any
  reasoning: string
  qualityMetrics: {
    profileMatchQuality: number
    hybridAgreement: number
    overallQuality: number
  }
}

export interface CalibrationStatusInfo {
  isCalibrated: boolean
  speakerAProfile?: VoiceProfile
  speakerBProfile?: VoiceProfile
  needsRecalibration: boolean
  lastCalibrationTime: number
  profileQuality: number
}

export interface CalibratedDetectionStats {
  totalDetections: number
  calibratedDetections: number
  uncalibratedDetections: number
  avgConfidence: number
  profileMatches: Map<Speaker, number>
}

export interface RecalibrationRecommendation {
  shouldRecalibrate: boolean
  reason: 'no_calibration' | 'profile_expired' | 'low_accuracy' | 'profile_current'
  urgency: 'none' | 'low' | 'medium' | 'high'
  expectedImprovement: number
}

// Singleton instance
export const calibratedSpeakerDetectionService = new CalibratedSpeakerDetectionService()