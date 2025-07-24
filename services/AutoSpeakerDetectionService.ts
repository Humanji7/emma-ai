import type { Speaker, VADResult, AudioLevel } from '@/types'

/**
 * AutoSpeakerDetectionService - Automatic speaker detection from single microphone
 * 
 * Uses multiple detection methods:
 * 1. Pitch analysis (fundamental frequency)
 * 2. Spectral features (MFCC-like)
 * 3. Energy distribution patterns
 * 4. Pause-based turn detection
 * 5. Statistical learning from conversation patterns
 */
export class AutoSpeakerDetectionService {
  private speakerProfiles: Map<Speaker, SpeakerProfile> = new Map()
  private conversationBuffer: AudioSegment[] = []
  private lastSpeechTime: number = 0
  private lastDetectedSpeaker: Speaker = 'A'
  private turnHistory: TurnEvent[] = []
  private isCalibrated: boolean = false
  
  // Detection parameters
  private readonly PAUSE_THRESHOLD = 300 // ms for turn detection
  private readonly MIN_SPEECH_DURATION = 200 // ms minimum speech segment
  private readonly CONFIDENCE_THRESHOLD = 0.6
  private readonly CALIBRATION_WINDOW = 10000 // ms for initial learning

  /**
   * Initialize auto detection with conversation learning
   */
  async initialize(): Promise<void> {
    console.log('🎯 Auto Speaker Detection Service initialized')
    this.resetLearning()
  }

  /**
   * Process audio chunk and detect speaker automatically
   */
  detectSpeakerAuto(
    audioData: Float32Array, 
    sampleRate: number = 44100
  ): AutoDetectionResult {
    const timestamp = Date.now()

    // Step 1: Voice Activity Detection
    const hasVoice = this.detectVoiceActivity(audioData)
    if (!hasVoice.isActive) {
      return {
        speaker: undefined,
        confidence: 0,
        method: 'silence',
        timestamp,
        reasoning: 'No voice activity detected'
      }
    }

    // Step 2: Extract audio features
    const features = this.extractAudioFeatures(audioData, sampleRate)
    
    // Step 3: Multi-method detection
    const detectionResults = [
      this.detectByPitch(features),
      this.detectBySpectralFeatures(features),
      this.detectByEnergyPattern(features),
      this.detectByTurnTaking(timestamp),
      this.detectByConversationContext()
    ]

    // Step 4: Weighted ensemble decision
    const finalDecision = this.ensembleDecision(detectionResults, timestamp)

    // Step 5: Update learning models
    this.updateLearningModels(features, finalDecision, timestamp)

    // Step 6: Store conversation history
    this.updateConversationBuffer(audioData, finalDecision.speaker, timestamp)

    return finalDecision
  }

  /**
   * Voice Activity Detection - improved algorithm
   */
  private detectVoiceActivity(audioData: Float32Array): { isActive: boolean; energy: number } {
    // Calculate multiple energy metrics
    const rms = this.calculateRMS(audioData)
    const zcr = this.calculateZeroCrossingRate(audioData) // Zero Crossing Rate
    const spectralCentroid = this.calculateSpectralCentroid(audioData)

    // Adaptive threshold based on recent history
    const recentEnergy = this.conversationBuffer.slice(-5).map(s => s.energy)
    const avgRecentEnergy = recentEnergy.length > 0 
      ? recentEnergy.reduce((a, b) => a + b, 0) / recentEnergy.length 
      : 0.01

    const energyThreshold = Math.max(0.005, avgRecentEnergy * 0.3)
    const zcrThreshold = 0.1 // Human speech typically has ZCR 0.05-0.15

    const isActive = rms > energyThreshold && zcr > 0.02 && zcr < zcrThreshold

    return { 
      isActive, 
      energy: rms 
    }
  }

  /**
   * Extract comprehensive audio features for speaker identification
   */
  private extractAudioFeatures(audioData: Float32Array, sampleRate: number): AudioFeatures {
    return {
      // Basic features
      rms: this.calculateRMS(audioData),
      zcr: this.calculateZeroCrossingRate(audioData),
      
      // Pitch features
      pitch: this.estimatePitch(audioData, sampleRate),
      pitchVariance: this.calculatePitchVariance(audioData, sampleRate),
      
      // Spectral features
      spectralCentroid: this.calculateSpectralCentroid(audioData),
      spectralRolloff: this.calculateSpectralRolloff(audioData),
      mfcc: this.calculateMFCC(audioData), // Simplified MFCC
      
      // Temporal features
      timestamp: Date.now()
    }
  }

  /**
   * Pitch-based speaker detection
   */
  private detectByPitch(features: AudioFeatures): DetectionVote {
    if (!features.pitch || features.pitch < 50 || features.pitch > 500) {
      return { speaker: undefined, confidence: 0, method: 'pitch' }
    }

    let bestMatch: Speaker | undefined = undefined
    let bestScore = 0

    // Compare with learned profiles
    for (const [speaker, profile] of this.speakerProfiles) {
      const pitchDiff = Math.abs(features.pitch - profile.avgPitch)
      const pitchScore = Math.max(0, 1 - (pitchDiff / profile.pitchRange))
      
      if (pitchScore > bestScore && pitchScore > 0.5) {
        bestScore = pitchScore
        bestMatch = speaker
      }
    }

    // If no profiles yet, use simple heuristic
    if (this.speakerProfiles.size === 0) {
      // Higher pitch = more likely female/Partner A, Lower = Partner B
      bestMatch = features.pitch > 180 ? 'A' : 'B'
      bestScore = 0.4 // Low confidence without training
    }

    return {
      speaker: bestMatch,
      confidence: bestScore,
      method: 'pitch'
    }
  }

  /**
   * Spectral features based detection
   */
  private detectBySpectralFeatures(features: AudioFeatures): DetectionVote {
    if (this.speakerProfiles.size < 2) {
      return { speaker: undefined, confidence: 0, method: 'spectral' }
    }

    let bestMatch: Speaker | undefined = undefined
    let bestScore = 0

    for (const [speaker, profile] of this.speakerProfiles) {
      // Compare spectral centroid
      const centroidDiff = Math.abs(features.spectralCentroid - profile.spectralCentroid)
      const centroidScore = Math.max(0, 1 - (centroidDiff / 2000)) // Normalize

      if (centroidScore > bestScore && centroidScore > 0.4) {
        bestScore = centroidScore
        bestMatch = speaker
      }
    }

    return {
      speaker: bestMatch,
      confidence: bestScore,
      method: 'spectral'
    }
  }

  /**
   * Energy pattern based detection
   */
  private detectByEnergyPattern(features: AudioFeatures): DetectionVote {
    // Analyze energy patterns - some speakers are consistently louder/softer
    const recentSegments = this.conversationBuffer.slice(-10)
    if (recentSegments.length < 5) {
      return { speaker: undefined, confidence: 0, method: 'energy' }
    }

    const energyBySpeaker = new Map<Speaker, number[]>()
    recentSegments.forEach(segment => {
      if (segment.speaker) {
        if (!energyBySpeaker.has(segment.speaker)) {
          energyBySpeaker.set(segment.speaker, [])
        }
        energyBySpeaker.get(segment.speaker)!.push(segment.energy)
      }
    })

    let bestMatch: Speaker | undefined = undefined
    let bestScore = 0

    for (const [speaker, energyLevels] of energyBySpeaker) {
      const avgEnergy = energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length
      const energyDiff = Math.abs(features.rms - avgEnergy)
      const energyScore = Math.max(0, 1 - (energyDiff / avgEnergy))

      if (energyScore > bestScore && energyScore > 0.5) {
        bestScore = energyScore
        bestMatch = speaker
      }
    }

    return {
      speaker: bestMatch,
      confidence: bestScore * 0.6, // Lower weight for energy alone
      method: 'energy'
    }
  }

  /**
   * Turn-taking pattern detection
   */
  private detectByTurnTaking(timestamp: number): DetectionVote {
    const timeSinceLastSpeech = timestamp - this.lastSpeechTime

    // If significant pause, likely speaker change
    if (timeSinceLastSpeech > this.PAUSE_THRESHOLD) {
      const newSpeaker = this.lastDetectedSpeaker === 'A' ? 'B' : 'A'
      return {
        speaker: newSpeaker,
        confidence: 0.7,
        method: 'turn_taking'
      }
    }

    // Continue with same speaker
    return {
      speaker: this.lastDetectedSpeaker,
      confidence: 0.8,
      method: 'continuity'
    }
  }

  /**
   * Conversation context detection
   */
  private detectByConversationContext(): DetectionVote {
    // Analyze recent turn patterns
    const recentTurns = this.turnHistory.slice(-5)
    if (recentTurns.length < 3) {
      return { speaker: undefined, confidence: 0, method: 'context' }
    }

    // Look for alternating patterns
    const isAlternating = this.isAlternatingPattern(recentTurns)
    if (isAlternating) {
      const lastSpeaker = recentTurns[recentTurns.length - 1].speaker
      const predictedNext = lastSpeaker === 'A' ? 'B' : 'A'
      
      return {
        speaker: predictedNext,
        confidence: 0.6,
        method: 'pattern'
      }
    }

    return { speaker: undefined, confidence: 0, method: 'context' }
  }

  /**
   * Ensemble decision making - combine all detection methods
   */
  private ensembleDecision(votes: DetectionVote[], timestamp: number): AutoDetectionResult {
    // Weight different methods
    const weights: Record<string, number> = {
      pitch: 0.35,
      spectral: 0.25,
      turn_taking: 0.20,
      energy: 0.10,
      continuity: 0.15,
      pattern: 0.15,
      silence: 0
    }

    // Calculate weighted scores for each speaker
    const scores = new Map<Speaker, number>()
    const methods: string[] = []
    
    votes.forEach(vote => {
      if (vote.speaker) {
        const currentScore = scores.get(vote.speaker) || 0
        const weightedScore = vote.confidence * (weights[vote.method] || 0.1)
        scores.set(vote.speaker, currentScore + weightedScore)
        methods.push(vote.method)
      }
    })

    // Find best speaker
    let bestSpeaker: Speaker | undefined = undefined
    let bestScore = 0
    
    for (const [speaker, score] of scores) {
      if (score > bestScore) {
        bestScore = score
        bestSpeaker = speaker
      }
    }

    // Apply confidence threshold
    const finalConfidence = Math.min(bestScore, 1.0)
    const meetsThreshold = finalConfidence > this.CONFIDENCE_THRESHOLD

    if (!meetsThreshold) {
      // Fall back to turn-taking if confidence too low
      bestSpeaker = this.lastDetectedSpeaker === 'A' ? 'B' : 'A'
      return {
        speaker: bestSpeaker,
        confidence: 0.5,
        method: 'fallback',
        timestamp,
        reasoning: `Low confidence (${finalConfidence.toFixed(2)}), using turn-taking fallback`
      }
    }

    // Update state
    if (bestSpeaker) {
      this.lastDetectedSpeaker = bestSpeaker
      this.lastSpeechTime = timestamp
    }

    return {
      speaker: bestSpeaker,
      confidence: finalConfidence,
      method: methods.join('+'),
      timestamp,
      reasoning: `Ensemble decision: ${methods.join(', ')} (confidence: ${finalConfidence.toFixed(2)})`
    }
  }

  /**
   * Update learning models with new data
   */
  private updateLearningModels(features: AudioFeatures, decision: AutoDetectionResult, timestamp: number): void {
    if (!decision.speaker || decision.confidence < 0.7) return

    // Update speaker profile
    const speaker = decision.speaker
    if (!this.speakerProfiles.has(speaker)) {
      this.speakerProfiles.set(speaker, {
        speaker,
        avgPitch: features.pitch || 150,
        pitchRange: 50,
        spectralCentroid: features.spectralCentroid,
        energyProfile: features.rms,
        sampleCount: 1
      })
    } else {
      const profile = this.speakerProfiles.get(speaker)!
      
      // Running average updates
      const weight = 0.1 // Learning rate
      profile.avgPitch = profile.avgPitch * (1 - weight) + (features.pitch || profile.avgPitch) * weight
      profile.spectralCentroid = profile.spectralCentroid * (1 - weight) + features.spectralCentroid * weight
      profile.energyProfile = profile.energyProfile * (1 - weight) + features.rms * weight
      profile.sampleCount++

      // Update pitch range
      if (features.pitch) {
        const pitchDiff = Math.abs(features.pitch - profile.avgPitch)
        profile.pitchRange = Math.max(profile.pitchRange, pitchDiff * 2)
      }
    }

    // Add to turn history
    this.turnHistory.push({
      speaker,
      timestamp,
      confidence: decision.confidence,
      duration: 0 // Will be updated when turn ends
    })

    // Keep history manageable
    if (this.turnHistory.length > 20) {
      this.turnHistory = this.turnHistory.slice(-15)
    }

    // Mark as calibrated after enough samples
    if (!this.isCalibrated && this.getTotalSamples() > 10) {
      this.isCalibrated = true
      console.log('🎯 Auto speaker detection calibrated with', this.getTotalSamples(), 'samples')
    }
  }

  // Helper methods for audio processing
  private calculateRMS(audioData: Float32Array): number {
    let sum = 0
    for (let i = 0; i < audioData.length; i++) {
      sum += audioData[i] * audioData[i]
    }
    return Math.sqrt(sum / audioData.length)
  }

  private calculateZeroCrossingRate(audioData: Float32Array): number {
    let crossings = 0
    for (let i = 1; i < audioData.length; i++) {
      if ((audioData[i] >= 0) !== (audioData[i - 1] >= 0)) {
        crossings++
      }
    }
    return crossings / audioData.length
  }

  private calculateSpectralCentroid(audioData: Float32Array): number {
    // Simplified spectral centroid calculation
    const fft = this.simpleFFT(audioData)
    let weightedSum = 0
    let totalSum = 0
    
    for (let i = 0; i < fft.length / 2; i++) {
      const magnitude = Math.sqrt(fft[i * 2] ** 2 + fft[i * 2 + 1] ** 2)
      weightedSum += i * magnitude
      totalSum += magnitude
    }
    
    return totalSum > 0 ? weightedSum / totalSum : 0
  }

  private calculateSpectralRolloff(audioData: Float32Array): number {
    // Simplified - frequency below which 85% of energy is contained
    return 0 // Placeholder
  }

  private calculateMFCC(audioData: Float32Array): number[] {
    // Simplified MFCC - would need proper implementation
    return [0, 0, 0] // Placeholder
  }

  private estimatePitch(audioData: Float32Array, sampleRate: number): number | undefined {
    // Autocorrelation-based pitch detection
    const minPeriod = Math.floor(sampleRate / 500) // 500 Hz max
    const maxPeriod = Math.floor(sampleRate / 50)  // 50 Hz min
    
    let bestPeriod = 0
    let bestCorrelation = 0
    
    for (let period = minPeriod; period < Math.min(maxPeriod, audioData.length / 2); period++) {
      let correlation = 0
      for (let i = 0; i < audioData.length - period; i++) {
        correlation += audioData[i] * audioData[i + period]
      }
      
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation
        bestPeriod = period
      }
    }
    
    return bestPeriod > 0 ? sampleRate / bestPeriod : undefined
  }

  private calculatePitchVariance(audioData: Float32Array, sampleRate: number): number {
    // Measure of pitch stability
    return 0 // Placeholder
  }

  private simpleFFT(audioData: Float32Array): Float32Array {
    // Simplified FFT - would need proper implementation
    return new Float32Array(audioData.length * 2)
  }

  private updateConversationBuffer(audioData: Float32Array, speaker: Speaker | undefined, timestamp: number): void {
    const segment: AudioSegment = {
      audioData: audioData.slice(), // Copy
      speaker,
      timestamp,
      energy: this.calculateRMS(audioData),
      duration: audioData.length / 44100 * 1000 // Approximate duration in ms
    }

    this.conversationBuffer.push(segment)
    
    // Keep buffer manageable
    if (this.conversationBuffer.length > 50) {
      this.conversationBuffer = this.conversationBuffer.slice(-30)
    }
  }

  private isAlternatingPattern(turns: TurnEvent[]): boolean {
    if (turns.length < 3) return false
    
    for (let i = 1; i < turns.length - 1; i++) {
      if (turns[i].speaker === turns[i + 1].speaker) {
        return false // Found consecutive turns by same speaker
      }
    }
    return true
  }

  private getTotalSamples(): number {
    let total = 0
    for (const profile of this.speakerProfiles.values()) {
      total += profile.sampleCount
    }
    return total
  }

  private resetLearning(): void {
    this.speakerProfiles.clear()
    this.conversationBuffer = []
    this.turnHistory = []
    this.isCalibrated = false
    this.lastDetectedSpeaker = 'A'
  }

  // Public methods
  getCalibrationStatus(): { isCalibrated: boolean; sampleCount: number; confidence: number } {
    const totalSamples = this.getTotalSamples()
    const confidence = Math.min(totalSamples / 20, 1) // Full confidence at 20 samples
    
    return {
      isCalibrated: this.isCalibrated,
      sampleCount: totalSamples,
      confidence
    }
  }

  getDetectionStats(): DetectionStats {
    const recentTurns = this.turnHistory.slice(-10)
    const avgConfidence = recentTurns.length > 0
      ? recentTurns.reduce((sum, turn) => sum + turn.confidence, 0) / recentTurns.length
      : 0

    return {
      totalTurns: this.turnHistory.length,
      recentConfidence: avgConfidence,
      speakerProfiles: this.speakerProfiles.size,
      isLearning: !this.isCalibrated
    }
  }

  cleanup(): void {
    this.resetLearning()
    console.log('🎯 Auto Speaker Detection Service cleaned up')
  }
}

// Types
interface AudioFeatures {
  rms: number
  zcr: number
  pitch?: number
  pitchVariance: number
  spectralCentroid: number
  spectralRolloff: number
  mfcc: number[]
  timestamp: number
}

interface DetectionVote {
  speaker: Speaker | undefined
  confidence: number
  method: string
}

interface AutoDetectionResult {
  speaker: Speaker | undefined
  confidence: number
  method: string
  timestamp: number
  reasoning: string
}

interface SpeakerProfile {
  speaker: Speaker
  avgPitch: number
  pitchRange: number
  spectralCentroid: number
  energyProfile: number
  sampleCount: number
}

interface AudioSegment {
  audioData: Float32Array
  speaker: Speaker | undefined
  timestamp: number
  energy: number
  duration: number
}

interface TurnEvent {
  speaker: Speaker
  timestamp: number
  confidence: number
  duration: number
}

interface DetectionStats {
  totalTurns: number
  recentConfidence: number
  speakerProfiles: number
  isLearning: boolean
}

// Singleton for global use
export const autoSpeakerDetectionService = new AutoSpeakerDetectionService()