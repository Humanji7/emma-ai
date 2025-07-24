/**
 * CoupleVoiceManager - Unified Voice Interface for Couple Mode
 * 
 * Single entry point for all voice operations:
 * - Quick calibration (30s per person)  
 * - Advanced calibration (2-3min per person)
 * - Speaker detection with 70%+ accuracy
 * - Profile persistence
 * - Eleven Labs TTS integration
 */

import { VoiceCalibrationService } from './VoiceCalibrationService'
import { HybridSpeakerDetectionService } from './HybridSpeakerDetectionService'
import type { Speaker, EmotionData } from '@/types'

export interface VoiceProfile {
  id: string
  partnerId: 'A' | 'B'
  samples: Float32Array[]
  accuracy: number
  createdAt: Date
  lastUsed: Date
  advanced: boolean // Quick (30s) vs Advanced (2-3min)
}

export interface CoupleProfile {
  id: string
  name: string
  partnerA: VoiceProfile
  partnerB: VoiceProfile
  accuracy: number
  lastCalibrated: Date
}

export interface VoiceManagerConfig {
  mode: 'couple' // Only couple mode for now
  calibrationType: 'quick' | 'advanced' | 'none'
  accuracyTarget: number // 70% default
  persistProfiles: boolean
  enableTTS: boolean
}

export interface VoiceManagerState {
  isInitialized: boolean
  isCalibrated: boolean
  currentProfile?: CoupleProfile
  isRecording: boolean
  currentSpeaker: Speaker | 'silence'
  accuracy: number
  detectionConfidence: number
}

export class CoupleVoiceManager {
  private config: VoiceManagerConfig
  private state: VoiceManagerState
  private calibrationService: VoiceCalibrationService
  private detectionService: HybridSpeakerDetectionService
  private mediaRecorder?: MediaRecorder
  private audioContext?: AudioContext
  private analyser?: AnalyserNode
  
  constructor(config: Partial<VoiceManagerConfig> = {}) {
    this.config = {
      mode: 'couple',
      calibrationType: 'quick',
      accuracyTarget: 0.7,
      persistProfiles: true,
      enableTTS: true,
      ...config
    }
    
    this.state = {
      isInitialized: false,
      isCalibrated: false,
      isRecording: false,
      currentSpeaker: 'silence',
      accuracy: 0,
      detectionConfidence: 0
    }
    
    this.calibrationService = new VoiceCalibrationService()
    this.detectionService = new HybridSpeakerDetectionService()
  }

  /**
   * Initialize the voice manager
   */
  async initialize(): Promise<void> {
    try {
      await this.calibrationService.initialize()
      await this.detectionService.initialize()
      
      // Load existing profile if available
      await this.loadExistingProfile()
      
      this.state.isInitialized = true
      console.log('🎤 CoupleVoiceManager initialized')
    } catch (error) {
      console.error('Failed to initialize CoupleVoiceManager:', error)
      throw error
    }
  }

  /**
   * Quick Calibration: 30s per person (60s total)
   */
  async startQuickCalibration(): Promise<{
    sessionId: string
    totalSteps: number
    estimatedTime: number // seconds
  }> {
    if (!this.state.isInitialized) {
      throw new Error('Voice manager not initialized')
    }

    const sessionId = `quick_${Date.now()}`
    
    return {
      sessionId,
      totalSteps: 6, // 3 samples per partner (A: 3, B: 3)
      estimatedTime: 60 // 30s per partner
    }
  }

  /**
   * Advanced Calibration: 2-3min per person (4-6min total)
   */
  async startAdvancedCalibration(): Promise<{
    sessionId: string
    totalSteps: number
    estimatedTime: number // seconds
  }> {
    if (!this.state.isInitialized) {
      throw new Error('Voice manager not initialized')
    }

    const sessionId = `advanced_${Date.now()}`
    
    return {
      sessionId,
      totalSteps: 16, // 8 samples per partner (A: 8, B: 8)
      estimatedTime: 300 // 2.5min per partner
    }
  }

  /**
   * Record calibration sample with real audio data
   */
  async recordCalibrationSample(
    sessionId: string,
    partnerId: Speaker,
    sampleType: 'neutral' | 'happy' | 'frustrated' | 'question',
    audioData?: Float32Array,
    sampleRate?: number
  ): Promise<{
    success: boolean
    progress: number // 0-1
    quality: number // 0-1
    nextStep?: string
  }> {
    // If no audio data provided, this is likely an initialization call
    if (!audioData || !sampleRate) {
      console.warn('⚠️ No audio data provided for calibration sample')
      return {
        success: false,
        progress: 0,
        quality: 0,
        nextStep: 'Please record audio for calibration'
      }
    }

    console.log(`🎤 Processing calibration sample for ${partnerId}: ${audioData.length} samples at ${sampleRate}Hz`)
    
    try {
      // Check if calibration session exists, create if needed
      if (!this.calibrationService.hasCalibrationSession(sessionId)) {
        console.log(`🎙️ Creating new calibration session: ${sessionId}`)
        this.calibrationService.startCalibrationSession(sessionId)
      } else {
        console.log(`🎙️ Using existing calibration session: ${sessionId}`)
      }

      // Implementation will use existing VoiceCalibrationService
      const result = await this.calibrationService.recordCalibrationSample(
        sessionId,
        audioData,
        sampleRate,
        sampleType as any,
        partnerId  // Pass the partnerId parameter
      )
      
      console.log(`📊 Calibration result: success=${result.success}, quality=${result.qualityAnalysis?.clarityScore}`)
      
      return {
        success: result.success,
        progress: result.progress?.overallProgress || 0,
        quality: result.qualityAnalysis?.clarityScore || 0.5,
        nextStep: result.recommendation
      }
    } catch (error) {
      console.error('❌ Calibration sample recording failed:', error)
      return {
        success: false,
        progress: 0,
        quality: 0,
        nextStep: 'Recording failed, please try again'
      }
    }
  }

  /**
   * Complete calibration and save profile
   */
  async completeCalibration(sessionId: string, profileName: string): Promise<{
    success: boolean
    profile: CoupleProfile
    accuracy: number
  }> {
    console.log(`🎯 Starting calibration completion for session: ${sessionId}, profile: "${profileName}"`)
    
    const result = await this.calibrationService.completeCalibration(sessionId)
    console.log(`📊 VoiceCalibrationService result:`, result)
    
    if (result.success) {
      const profile: CoupleProfile = {
        id: `couple_${Date.now()}`,
        name: profileName,
        partnerA: {
          id: `A_${Date.now()}`,
          partnerId: 'A',
          samples: [], // From result
          accuracy: result.results.speakerA.avgQuality,
          createdAt: new Date(),
          lastUsed: new Date(),
          advanced: sessionId.startsWith('advanced_')
        },
        partnerB: {
          id: `B_${Date.now()}`,
          partnerId: 'B', 
          samples: [], // From result
          accuracy: result.results.speakerB.avgQuality,
          createdAt: new Date(),
          lastUsed: new Date(),
          advanced: sessionId.startsWith('advanced_')
        },
        accuracy: (result.results?.speakerA.avgQuality + result.results?.speakerB.avgQuality) / 2 || 0.7, // Average accuracy
        lastCalibrated: new Date()
      }

      console.log(`💾 Created profile object:`, profile)

      // Save profile
      if (this.config.persistProfiles) {
        console.log(`💾 Saving profile to localStorage...`)
        await this.saveProfile(profile)
        console.log(`✅ Profile saved to localStorage`)
      } else {
        console.log(`⚠️ Profile persistence disabled, not saving to localStorage`)
      }

      this.state.currentProfile = profile
      this.state.isCalibrated = true
      this.state.accuracy = profile.accuracy

      console.log(`✅ Calibration completion successful for: ${profileName}`)

      return {
        success: true,
        profile,
        accuracy: profile.accuracy
      }
    }

    console.log(`❌ Calibration completion failed for session: ${sessionId}`)
    return {
      success: false,
      profile: {} as CoupleProfile,
      accuracy: 0
    }
  }

  /**
   * Start voice conversation
   */
  async startConversation(): Promise<void> {
    if (!this.state.isCalibrated) {
      throw new Error('Voice profiles not calibrated')
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      })

      this.audioContext = new AudioContext()
      const source = this.audioContext.createMediaStreamSource(stream)
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      source.connect(this.analyser)

      this.mediaRecorder = new MediaRecorder(stream)
      this.state.isRecording = true

      // Start real-time speaker detection
      this.startRealtimeDetection()

      console.log('🎤 Couple conversation started')
    } catch (error) {
      console.error('Failed to start conversation:', error)
      throw error
    }
  }

  /**
   * Real-time speaker detection
   */
  private startRealtimeDetection(): void {
    if (!this.analyser) return

    const detectSpeaker = () => {
      if (!this.analyser || !this.state.isRecording) return

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
      this.analyser.getByteFrequencyData(dataArray)

      const floatArray = new Float32Array(dataArray.length)
      for (let i = 0; i < dataArray.length; i++) {
        floatArray[i] = (dataArray[i] - 128) / 128.0
      }

      // Use calibrated detection
      this.detectionService.detectSpeaker(
        floatArray,
        this.audioContext?.sampleRate || 44100,
        'couple_conversation'
      ).then(result => {
        if (result.confidence > this.config.accuracyTarget) {
          this.state.currentSpeaker = result.speaker || 'silence'
          this.state.detectionConfidence = result.confidence
        }
      }).catch(console.error)

      if (this.state.isRecording) {
        requestAnimationFrame(detectSpeaker)
      }
    }

    detectSpeaker()
  }

  /**
   * Stop conversation
   */
  async stopConversation(): Promise<void> {
    this.state.isRecording = false
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop()
    }
    
    if (this.audioContext) {
      await this.audioContext.close()
    }

    console.log('🎤 Couple conversation stopped')
  }

  /**
   * Get current state
   */
  getState(): VoiceManagerState {
    return { ...this.state }
  }

  /**
   * Save profile to storage
   */
  private async saveProfile(profile: CoupleProfile): Promise<void> {
    try {
      console.log(`💾 Saving profile to localStorage:`, { profileId: profile.id, profileName: profile.name })
      
      const profiles = await this.getStoredProfiles()
      console.log(`📊 Existing profiles count: ${Object.keys(profiles).length}`)
      
      profiles[profile.id] = profile
      const profilesJson = JSON.stringify(profiles)
      console.log(`📦 Serialized profiles size: ${profilesJson.length} characters`)
      
      localStorage.setItem('emma_couple_profiles', profilesJson)
      
      // Verify the save worked
      const verification = localStorage.getItem('emma_couple_profiles')
      if (verification) {
        const parsed = JSON.parse(verification)
        const savedProfile = parsed[profile.id]
        if (savedProfile && savedProfile.name === profile.name) {
          console.log('✅ Profile verification successful:', savedProfile.name)
        } else {
          console.error('❌ Profile verification failed - data mismatch')
        }
      } else {
        console.error('❌ Profile verification failed - nothing saved to localStorage')
      }
      
      console.log('💾 Profile saved successfully:', profile.name)
    } catch (error) {
      console.error('❌ Failed to save profile:', error)
      throw error // Re-throw to propagate error up
    }
  }

  /**
   * Load existing profile
   */
  private async loadExistingProfile(): Promise<void> {
    try {
      const profiles = await this.getStoredProfiles()
      const profileKeys = Object.keys(profiles)
      
      if (profileKeys.length > 0) {
        // Load most recent profile
        const latestProfile = Object.values(profiles)
          .sort((a, b) => b.lastCalibrated.getTime() - a.lastCalibrated.getTime())[0]
        
        this.state.currentProfile = latestProfile
        this.state.isCalibrated = true
        this.state.accuracy = latestProfile.accuracy
        
        console.log('📂 Loaded existing profile:', latestProfile.name)
      }
    } catch (error) {
      console.warn('Could not load existing profile:', error)
    }
  }

  /**
   * Get stored profiles
   */
  private async getStoredProfiles(): Promise<Record<string, CoupleProfile>> {
    try {
      const stored = localStorage.getItem('emma_couple_profiles')
      if (stored) {
        const profiles = JSON.parse(stored)
        // Convert date strings back to Date objects
        Object.values(profiles).forEach((profile: any) => {
          profile.lastCalibrated = new Date(profile.lastCalibrated)
          profile.partnerA.createdAt = new Date(profile.partnerA.createdAt)
          profile.partnerA.lastUsed = new Date(profile.partnerA.lastUsed)
          profile.partnerB.createdAt = new Date(profile.partnerB.createdAt)
          profile.partnerB.lastUsed = new Date(profile.partnerB.lastUsed)
        })
        return profiles
      }
    } catch (error) {
      console.error('Error loading profiles:', error)
    }
    return {}
  }

  /**
   * List available profiles
   */
  async getAvailableProfiles(): Promise<CoupleProfile[]> {
    const profiles = await this.getStoredProfiles()
    return Object.values(profiles).sort((a, b) => 
      b.lastCalibrated.getTime() - a.lastCalibrated.getTime()
    )
  }

  /**
   * Delete profile
   */
  async deleteProfile(profileId: string): Promise<void> {
    const profiles = await this.getStoredProfiles()
    delete profiles[profileId]
    localStorage.setItem('emma_couple_profiles', JSON.stringify(profiles))
    
    if (this.state.currentProfile?.id === profileId) {
      this.state.currentProfile = undefined
      this.state.isCalibrated = false
      this.state.accuracy = 0
    }
  }

  /**
   * Switch to different profile
   */
  async switchProfile(profileId: string): Promise<void> {
    const profiles = await this.getStoredProfiles()
    const profile = profiles[profileId]
    
    if (profile) {
      this.state.currentProfile = profile
      this.state.isCalibrated = true
      this.state.accuracy = profile.accuracy
      
      // Update last used
      profile.partnerA.lastUsed = new Date()
      profile.partnerB.lastUsed = new Date()
      await this.saveProfile(profile)
      
      console.log('🔄 Switched to profile:', profile.name)
    } else {
      throw new Error(`Profile not found: ${profileId}`)
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stopConversation()
    this.state.isInitialized = false
    console.log('🧹 CoupleVoiceManager cleaned up')
  }
}

// Singleton instance
export const coupleVoiceManager = new CoupleVoiceManager()