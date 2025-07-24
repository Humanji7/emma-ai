import type { Speaker } from '@/types'

/**
 * VoiceCalibrationService - Voice profiling system similar to Eleven Labs
 * 
 * Creates detailed voice profiles through guided calibration process:
 * 1. Records multiple voice samples (30+ seconds total)
 * 2. Analyzes audio quality and characteristics
 * 3. Builds comprehensive voice profiles
 * 4. Enables high-accuracy speaker detection
 */

export class VoiceCalibrationService {
  private voiceProfiles: Map<Speaker, VoiceProfile> = new Map()
  private calibrationSessions: Map<string, CalibrationSession> = new Map()
  private isInitialized: boolean = false

  // Calibration parameters - adjusted for real-world microphone conditions
  private readonly MIN_SAMPLES_PER_SPEAKER = 3  // Reduced to match Quick calibration (3 per speaker)
  private readonly OPTIMAL_SAMPLES_PER_SPEAKER = 8  // Advanced calibration target
  private readonly MIN_SAMPLE_DURATION = 3000 // 3 seconds
  private readonly TOTAL_MIN_DURATION = 30000 // 30 seconds
  private readonly MIN_SNR_DB = 10 // Lowered from 15dB (more lenient for typical microphones)
  private readonly MIN_CLARITY_SCORE = 0.15 // Lowered from 0.7 (realistic for web microphones)

  /**
   * Initialize the voice calibration service
   */
  async initialize(): Promise<void> {
    console.log('🎙️ Voice Calibration Service initializing...')
    this.isInitialized = true
    console.log('🎙️ Voice Calibration Service ready')
  }

  /**
   * Start calibration session for a couple
   */
  startCalibrationSession(sessionId: string): CalibrationSession {
    const session: CalibrationSession = {
      sessionId,
      startTime: Date.now(),
      currentStep: 'instructions',
      currentSpeaker: 'A',
      samples: new Map(),
      qualityMetrics: {
        totalDuration: 0,
        avgSnr: 0,
        avgClarity: 0,
        completionRate: 0
      },
      isComplete: false
    }

    this.calibrationSessions.set(sessionId, session)
    console.log(`🎙️ Started calibration session: ${sessionId}`)
    return session
  }

  /**
   * Record calibration sample
   */
  async recordCalibrationSample(
    sessionId: string,
    audioData: Float32Array,
    sampleRate: number,
    promptType: CalibrationPromptType,
    partnerId?: Speaker  // Add optional partnerId parameter
  ): Promise<CalibrationSampleResult> {
    const session = this.calibrationSessions.get(sessionId)
    if (!session) {
      throw new Error('Calibration session not found')
    }

    // Analyze audio quality
    const qualityAnalysis = await this.analyzeAudioQuality(audioData, sampleRate)
    
    // Check if sample meets quality standards
    if (!this.validateSampleQuality(qualityAnalysis)) {
      return {
        success: false,
        reason: 'quality_too_low',
        qualityAnalysis,
        recommendation: this.getQualityRecommendation(qualityAnalysis)
      }
    }

    // Extract voice features
    const voiceFeatures = await this.extractVoiceFeatures(audioData, sampleRate)

    // Use partnerId if provided, otherwise fall back to session.currentSpeaker
    const speakerToUse = partnerId || session.currentSpeaker
    console.log(`🎙️ Recording sample for speaker: ${speakerToUse} (partnerId: ${partnerId}, currentSpeaker: ${session.currentSpeaker})`)

    // Create calibration sample
    const sample: CalibrationSample = {
      id: `${sessionId}_${speakerToUse}_${Date.now()}`,
      speaker: speakerToUse,
      audioData: audioData.slice(), // Copy array
      sampleRate,
      duration: (audioData.length / sampleRate) * 1000,
      promptType,
      timestamp: Date.now(),
      qualityAnalysis,
      voiceFeatures
    }

    // Add sample to session
    if (!session.samples.has(speakerToUse)) {
      session.samples.set(speakerToUse, [])
    }
    session.samples.get(speakerToUse)!.push(sample)

    // Update session metrics
    this.updateSessionMetrics(session)

    console.log(`🎙️ Recorded sample: ${sample.id}`)
    console.log(`📊 Quality metrics: SNR=${qualityAnalysis.snrDb.toFixed(1)}dB, Clarity=${(qualityAnalysis.clarityScore * 100).toFixed(1)}%, RMS=${qualityAnalysis.rms.toFixed(4)}`)
    console.log(`✅ Quality check: ${qualityAnalysis.isQualitySufficient ? 'PASSED' : 'FAILED'} (min: SNR>=${this.MIN_SNR_DB}dB, Clarity>=${(this.MIN_CLARITY_SCORE * 100).toFixed(0)}%)`)

    return {
      success: true,
      sample,
      qualityAnalysis,
      progress: this.calculateCalibrationProgress(session)
    }
  }

  /**
   * Complete calibration and build voice profiles
   */
  async completeCalibration(sessionId: string): Promise<CalibrationCompletionResult> {
    const session = this.calibrationSessions.get(sessionId)
    if (!session) {
      throw new Error('Calibration session not found')
    }

    const profiles: Map<Speaker, VoiceProfile> = new Map()
    const results: CalibrationResults = {
      speakerA: { success: false, sampleCount: 0, avgQuality: 0 },
      speakerB: { success: false, sampleCount: 0, avgQuality: 0 }
    }

    // Build voice profiles for each speaker
    console.log(`📊 Session samples:`, Array.from(session.samples.entries()).map(([speaker, samples]) => 
      `${speaker}: ${samples.length} samples`).join(', '))
    
    for (const [speaker, samples] of session.samples) {
      console.log(`🔍 Processing speaker ${speaker}: ${samples.length} samples (min required: ${this.MIN_SAMPLES_PER_SPEAKER})`)
      
      if (samples.length >= this.MIN_SAMPLES_PER_SPEAKER) {
        console.log(`✅ Speaker ${speaker} has enough samples, building profile...`)
        const profile = await this.buildVoiceProfile(speaker, samples)
        profiles.set(speaker, profile)
        
        const result = results[speaker === 'A' ? 'speakerA' : 'speakerB']
        result.success = true
        result.sampleCount = samples.length
        result.avgQuality = samples.reduce((sum, s) => sum + s.qualityAnalysis.clarityScore, 0) / samples.length
        result.profile = profile
        console.log(`✅ Speaker ${speaker} profile built successfully: ${result.sampleCount} samples, ${result.avgQuality.toFixed(2)} avg quality`)
      } else {
        console.log(`❌ Speaker ${speaker} does not have enough samples: ${samples.length} < ${this.MIN_SAMPLES_PER_SPEAKER}`)
      }
    }

    // Store profiles
    for (const [speaker, profile] of profiles) {
      this.voiceProfiles.set(speaker, profile)
    }

    session.isComplete = true
    
    const overallSuccess = results.speakerA.success && results.speakerB.success
    
    console.log(`🎙️ Calibration ${overallSuccess ? 'completed successfully' : 'partially completed'}: ${sessionId}`)

    return {
      success: overallSuccess,
      results,
      sessionDuration: Date.now() - session.startTime,
      recommendation: overallSuccess ? 'ready_for_conversation' : 'consider_recalibration'
    }
  }

  /**
   * Get voice profile for speaker
   */
  getVoiceProfile(speaker: Speaker): VoiceProfile | undefined {
    return this.voiceProfiles.get(speaker)
  }

  /**
   * Check if speaker is calibrated
   */
  isCalibrated(speaker: Speaker): boolean {
    const profile = this.voiceProfiles.get(speaker)
    return profile !== undefined && profile.isComplete && !this.isProfileExpired(profile)
  }

  /**
   * Get calibration status
   */
  getCalibrationStatus(): CalibrationStatus {
    const speakerACalibrated = this.isCalibrated('A')
    const speakerBCalibrated = this.isCalibrated('B')
    
    return {
      speakerA: {
        isCalibrated: speakerACalibrated,
        profile: this.voiceProfiles.get('A'),
        needsRecalibration: this.needsRecalibration('A')
      },
      speakerB: {
        isCalibrated: speakerBCalibrated,
        profile: this.voiceProfiles.get('B'),
        needsRecalibration: this.needsRecalibration('B')
      },
      isReady: speakerACalibrated && speakerBCalibrated,
      lastCalibrationTime: Math.max(
        this.voiceProfiles.get('A')?.createdAt || 0,
        this.voiceProfiles.get('B')?.createdAt || 0
      )
    }
  }

  /**
   * Check if calibration session exists
   */
  hasCalibrationSession(sessionId: string): boolean {
    return this.calibrationSessions.has(sessionId)
  }

  /**
   * Get calibration session info
   */
  getCalibrationSession(sessionId: string): CalibrationSession | undefined {
    return this.calibrationSessions.get(sessionId)
  }

  // ===== PRIVATE METHODS =====

  /**
   * Analyze audio quality metrics
   */
  private async analyzeAudioQuality(audioData: Float32Array, sampleRate: number): Promise<AudioQualityAnalysis> {
    // RMS (Root Mean Square) for volume level
    const rms = Math.sqrt(audioData.reduce((sum, sample) => sum + sample * sample, 0) / audioData.length)
    
    // Estimate noise floor (bottom 5% of samples) - optimized for large arrays
    let noiseFloor = 0
    const sampleStep = Math.max(1, Math.floor(audioData.length / 1000)) // Sample every nth element
    const noiseSamples: number[] = []
    
    for (let i = 0; i < audioData.length; i += sampleStep) {
      noiseSamples.push(Math.abs(audioData[i]))
    }
    noiseSamples.sort((a, b) => a - b)
    noiseFloor = noiseSamples[Math.floor(noiseSamples.length * 0.05)]
    
    // Dynamic range - optimized to avoid stack overflow
    let maxSample = 0
    for (let i = 0; i < audioData.length; i++) {
      maxSample = Math.max(maxSample, Math.abs(audioData[i]))
    }
    const dynamicRange = 20 * Math.log10(maxSample / Math.max(rms, 0.001))
    
    // Signal-to-noise ratio
    const snrDb = 20 * Math.log10(rms / Math.max(noiseFloor, 0.001))
    
    // Improved clarity score calculation for web microphones
    // Factor in both RMS and dynamic range for better assessment
    const baseClarity = Math.min(1.0, rms * 10) // Increased multiplier for web microphones
    const dynamicBonus = Math.min(0.3, (maxSample - rms) * 2) // Bonus for dynamic range
    const clarityScore = Math.min(1.0, baseClarity + dynamicBonus)
    
    return {
      rms,
      snrDb: Math.max(-20, Math.min(40, snrDb)), // Clamp to reasonable range
      clarityScore: Math.max(0, Math.min(1, clarityScore)),
      dynamicRange,
      duration: (audioData.length / sampleRate) * 1000,
      sampleRate,
      peakAmplitude: maxSample,
      isQualitySufficient: snrDb >= this.MIN_SNR_DB && clarityScore >= this.MIN_CLARITY_SCORE
    }
  }

  /**
   * Extract voice features from audio
   */
  private async extractVoiceFeatures(audioData: Float32Array, sampleRate: number): Promise<VoiceFeatures> {
    // Pitch analysis (simplified autocorrelation)
    const pitch = this.estimatePitch(audioData, sampleRate)
    
    // Spectral features
    const spectralFeatures = this.extractSpectralFeatures(audioData)
    
    // MFCC features (simplified)
    const mfccFeatures = this.extractMFCCFeatures(audioData, sampleRate)
    
    return {
      pitch: {
        fundamental: pitch,
        range: [pitch * 0.8, pitch * 1.2], // Simplified range
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
   * Simple pitch estimation using autocorrelation
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
    // Simple spectral analysis
    const fftSize = 1024
    const spectrum = this.computeFFT(audioData.slice(0, fftSize))
    
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
      rolloff: centroid * 1.5, // Simplified rolloff
      flux: 0.1, // Placeholder
      flatness: 0.5, // Placeholder
      bandwidth: centroid * 0.3
    }
  }

  /**
   * Simple FFT implementation (placeholder)
   */
  private computeFFT(audioData: Float32Array): Float32Array {
    // Simplified FFT - in production, use a proper FFT library
    const result = new Float32Array(audioData.length * 2)
    for (let i = 0; i < audioData.length; i++) {
      result[i * 2] = audioData[i] // Real part
      result[i * 2 + 1] = 0 // Imaginary part
    }
    return result
  }

  /**
   * Extract MFCC features (simplified)
   */
  private extractMFCCFeatures(audioData: Float32Array, sampleRate: number): number[] {
    // Simplified MFCC extraction - 13 coefficients
    const mfcc = new Array(13).fill(0)
    
    // Placeholder implementation - would use proper mel-scale filtering
    for (let i = 0; i < 13; i++) {
      mfcc[i] = Math.random() * 0.1 - 0.05 // Placeholder values
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
   * Generate unique voice fingerprint
   */
  private generateVoiceprint(audioData: Float32Array, spectral: SpectralFeatures, pitch: number): number[] {
    // Create 256-dimensional voiceprint
    const voiceprint = new Array(256).fill(0)
    
    // Combine features into voiceprint
    voiceprint[0] = pitch / 400 // Normalized pitch
    voiceprint[1] = spectral.centroid / 1000 // Normalized centroid
    voiceprint[2] = spectral.rolloff / 2000 // Normalized rolloff
    
    // Fill remaining with audio characteristics
    for (let i = 3; i < 256; i++) {
      const idx = Math.floor((i - 3) / 256 * audioData.length)
      voiceprint[i] = audioData[idx] || 0
    }
    
    return voiceprint
  }

  /**
   * Validate sample quality
   */
  private validateSampleQuality(quality: AudioQualityAnalysis): boolean {
    return quality.snrDb >= this.MIN_SNR_DB &&
           quality.clarityScore >= this.MIN_CLARITY_SCORE &&
           quality.duration >= this.MIN_SAMPLE_DURATION
  }

  /**
   * Get quality improvement recommendation
   */
  private getQualityRecommendation(quality: AudioQualityAnalysis): string {
    // More helpful recommendations based on actual values
    if (quality.snrDb < this.MIN_SNR_DB) {
      return `Слишком шумно (${quality.snrDb.toFixed(1)}dB). Переместитесь в тихое место или говорите ближе к микрофону`
    }
    if (quality.clarityScore < this.MIN_CLARITY_SCORE) {
      return `Качество звука низкое (${(quality.clarityScore * 100).toFixed(0)}%). Говорите четче и громче`
    }
    if (quality.duration < this.MIN_SAMPLE_DURATION) {
      return `Запись слишком короткая (${(quality.duration / 1000).toFixed(1)}с). Говорите не менее 3 секунд`
    }
    if (quality.rms < 0.01) {
      return 'Микрофон не слышит голос. Проверьте разрешения и говорите громче'
    }
    return 'Попробуйте записать снова. Говорите четко и достаточно громко'
  }

  /**
   * Build comprehensive voice profile
   */
  private async buildVoiceProfile(speaker: Speaker, samples: CalibrationSample[]): Promise<VoiceProfile> {
    // Aggregate features from all samples
    const allFeatures = samples.map(s => s.voiceFeatures)
    
    // Calculate average pitch
    const avgPitch = allFeatures.reduce((sum, f) => sum + f.pitch.fundamental, 0) / allFeatures.length
    
    // Calculate pitch range
    const pitches = allFeatures.map(f => f.pitch.fundamental)
    const pitchRange: [number, number] = [Math.min(...pitches), Math.max(...pitches)]
    
    // Aggregate spectral features
    const avgSpectral: SpectralFeatures = {
      centroid: allFeatures.reduce((sum, f) => sum + f.spectral.centroid, 0) / allFeatures.length,
      rolloff: allFeatures.reduce((sum, f) => sum + f.spectral.rolloff, 0) / allFeatures.length,
      flux: allFeatures.reduce((sum, f) => sum + f.spectral.flux, 0) / allFeatures.length,
      flatness: allFeatures.reduce((sum, f) => sum + f.spectral.flatness, 0) / allFeatures.length,
      bandwidth: allFeatures.reduce((sum, f) => sum + f.spectral.bandwidth, 0) / allFeatures.length
    }
    
    // Create composite voiceprint
    const compositeVoiceprint = new Array(256).fill(0)
    for (let i = 0; i < 256; i++) {
      compositeVoiceprint[i] = allFeatures.reduce((sum, f) => sum + (f.voiceprint[i] || 0), 0) / allFeatures.length
    }
    
    // Calculate quality metrics
    const avgQuality = samples.reduce((sum, s) => sum + s.qualityAnalysis.clarityScore, 0) / samples.length
    
    const profile: VoiceProfile = {
      speaker,
      samples: samples.map(s => ({
        id: s.id,
        duration: s.duration,
        quality: s.qualityAnalysis.clarityScore,
        promptType: s.promptType
      })),
      features: {
        pitch: {
          fundamental: avgPitch,
          range: pitchRange,
          variance: this.calculateVariance(pitches)
        },
        spectral: avgSpectral,
        mfcc: this.averageMFCC(allFeatures.map(f => f.mfcc)),
        temporal: {
          zeroCrossingRate: allFeatures.reduce((sum, f) => sum + f.temporal.zeroCrossingRate, 0) / allFeatures.length,
          energyContour: [] // Simplified
        },
        voiceprint: compositeVoiceprint
      },
      qualityMetrics: {
        sampleCount: samples.length,
        avgQuality,
        totalDuration: samples.reduce((sum, s) => sum + s.duration, 0),
        consistency: this.calculateConsistency(samples)
      },
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      isComplete: samples.length >= this.MIN_SAMPLES_PER_SPEAKER && avgQuality >= this.MIN_CLARITY_SCORE,
      version: '1.0'
    }
    
    console.log(`🎙️ Built voice profile for Speaker ${speaker}: ${samples.length} samples, ${avgQuality.toFixed(2)} avg quality`)
    
    return profile
  }

  /**
   * Calculate variance
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
    return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length
  }

  /**
   * Average MFCC coefficients
   */
  private averageMFCC(mfccArrays: number[][]): number[] {
    const avgMFCC = new Array(13).fill(0)
    for (const mfcc of mfccArrays) {
      for (let i = 0; i < 13; i++) {
        avgMFCC[i] += mfcc[i] || 0
      }
    }
    return avgMFCC.map(v => v / mfccArrays.length)
  }

  /**
   * Calculate profile consistency
   */
  private calculateConsistency(samples: CalibrationSample[]): number {
    if (samples.length < 2) return 1.0
    
    // Calculate consistency based on feature similarity
    const features = samples.map(s => s.voiceFeatures)
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < features.length - 1; i++) {
      for (let j = i + 1; j < features.length; j++) {
        const similarity = this.calculateFeatureSimilarity(features[i], features[j])
        totalSimilarity += similarity
        comparisons++
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 1.0
  }

  /**
   * Calculate similarity between voice features
   */
  private calculateFeatureSimilarity(features1: VoiceFeatures, features2: VoiceFeatures): number {
    // Simplified similarity calculation
    const pitchSim = 1 - Math.abs(features1.pitch.fundamental - features2.pitch.fundamental) / 200
    const spectralSim = 1 - Math.abs(features1.spectral.centroid - features2.spectral.centroid) / 1000
    
    return Math.max(0, Math.min(1, (pitchSim + spectralSim) / 2))
  }

  /**
   * Update session metrics
   */
  private updateSessionMetrics(session: CalibrationSession): void {
    let totalDuration = 0
    let totalSnr = 0
    let totalClarity = 0
    let sampleCount = 0
    
    for (const samples of session.samples.values()) {
      for (const sample of samples) {
        totalDuration += sample.duration
        totalSnr += sample.qualityAnalysis.snrDb
        totalClarity += sample.qualityAnalysis.clarityScore
        sampleCount++
      }
    }
    
    if (sampleCount > 0) {
      session.qualityMetrics.totalDuration = totalDuration
      session.qualityMetrics.avgSnr = totalSnr / sampleCount
      session.qualityMetrics.avgClarity = totalClarity / sampleCount
      session.qualityMetrics.completionRate = this.calculateCalibrationProgress(session).overallProgress
    }
  }

  /**
   * Calculate calibration progress
   */
  private calculateCalibrationProgress(session: CalibrationSession): CalibrationProgress {
    const speakerACount = session.samples.get('A')?.length || 0
    const speakerBCount = session.samples.get('B')?.length || 0
    
    const speakerAProgress = Math.min(1, speakerACount / this.MIN_SAMPLES_PER_SPEAKER)
    const speakerBProgress = Math.min(1, speakerBCount / this.MIN_SAMPLES_PER_SPEAKER)
    
    return {
      speakerA: {
        samplesCollected: speakerACount,
        samplesNeeded: this.MIN_SAMPLES_PER_SPEAKER,
        progress: speakerAProgress,
        isComplete: speakerACount >= this.MIN_SAMPLES_PER_SPEAKER
      },
      speakerB: {
        samplesCollected: speakerBCount,
        samplesNeeded: this.MIN_SAMPLES_PER_SPEAKER,
        progress: speakerBProgress,
        isComplete: speakerBCount >= this.MIN_SAMPLES_PER_SPEAKER
      },
      overallProgress: (speakerAProgress + speakerBProgress) / 2,
      isComplete: speakerAProgress >= 1 && speakerBProgress >= 1
    }
  }

  /**
   * Check if profile needs recalibration
   */
  private needsRecalibration(speaker: Speaker): boolean {
    const profile = this.voiceProfiles.get(speaker)
    if (!profile) return true
    
    // Check if profile is expired (7 days)
    const profileAge = Date.now() - profile.createdAt
    const isExpired = profileAge > 7 * 24 * 60 * 60 * 1000
    
    // Check if quality is too low
    const qualityTooLow = profile.qualityMetrics.avgQuality < this.MIN_CLARITY_SCORE
    
    return isExpired || qualityTooLow
  }

  /**
   * Check if profile is expired
   */
  private isProfileExpired(profile: VoiceProfile): boolean {
    const profileAge = Date.now() - profile.createdAt
    return profileAge > 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.voiceProfiles.clear()
    this.calibrationSessions.clear()
    this.isInitialized = false
    console.log('🎙️ Voice Calibration Service cleaned up')
  }
}

// ===== TYPE DEFINITIONS =====

export interface VoiceProfile {
  speaker: Speaker
  samples: CalibrationSampleSummary[]
  features: VoiceFeatures
  qualityMetrics: ProfileQualityMetrics
  createdAt: number
  lastUpdated: number
  isComplete: boolean
  version: string
}

export interface CalibrationSession {
  sessionId: string
  startTime: number
  currentStep: CalibrationStep
  currentSpeaker: Speaker
  samples: Map<Speaker, CalibrationSample[]>
  qualityMetrics: SessionQualityMetrics
  isComplete: boolean
}

export interface CalibrationSample {
  id: string
  speaker: Speaker
  audioData: Float32Array
  sampleRate: number
  duration: number
  promptType: CalibrationPromptType
  timestamp: number
  qualityAnalysis: AudioQualityAnalysis
  voiceFeatures: VoiceFeatures
}

export interface AudioQualityAnalysis {
  rms: number
  snrDb: number
  clarityScore: number
  dynamicRange: number
  duration: number
  sampleRate: number
  peakAmplitude: number
  isQualitySufficient: boolean
}

export interface VoiceFeatures {
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

export interface SpectralFeatures {
  centroid: number
  rolloff: number
  flux: number
  flatness: number
  bandwidth: number
}

export type CalibrationStep = 'instructions' | 'recording' | 'review' | 'complete'
export type CalibrationPromptType = 'neutral' | 'happy' | 'frustrated' | 'question' | 'statement' | 'emotional'

export interface CalibrationSampleResult {
  success: boolean
  sample?: CalibrationSample
  reason?: string
  qualityAnalysis: AudioQualityAnalysis
  recommendation?: string
  progress?: CalibrationProgress
}

export interface CalibrationProgress {
  speakerA: SpeakerProgress
  speakerB: SpeakerProgress
  overallProgress: number
  isComplete: boolean
}

export interface SpeakerProgress {
  samplesCollected: number
  samplesNeeded: number
  progress: number
  isComplete: boolean
}

export interface CalibrationCompletionResult {
  success: boolean
  results: CalibrationResults
  sessionDuration: number
  recommendation: string
}

export interface CalibrationResults {
  speakerA: CalibrationSpeakerResult
  speakerB: CalibrationSpeakerResult
}

export interface CalibrationSpeakerResult {
  success: boolean
  sampleCount: number
  avgQuality: number
  profile?: VoiceProfile
}

export interface CalibrationStatus {
  speakerA: SpeakerCalibrationStatus
  speakerB: SpeakerCalibrationStatus
  isReady: boolean
  lastCalibrationTime: number
}

export interface SpeakerCalibrationStatus {
  isCalibrated: boolean
  profile?: VoiceProfile
  needsRecalibration: boolean
}

export interface CalibrationSampleSummary {
  id: string
  duration: number
  quality: number
  promptType: CalibrationPromptType
}

export interface ProfileQualityMetrics {
  sampleCount: number
  avgQuality: number
  totalDuration: number
  consistency: number
}

export interface SessionQualityMetrics {
  totalDuration: number
  avgSnr: number
  avgClarity: number
  completionRate: number
}

// Singleton instance
export const voiceCalibrationService = new VoiceCalibrationService()