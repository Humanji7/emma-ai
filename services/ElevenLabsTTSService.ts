/**
 * ElevenLabs TTS Service for Emma Voice Responses
 * 
 * Integrates with ElevenLabs API to provide natural voice responses
 * for Emma AI in couple conversations.
 */

export interface TTSConfig {
  apiKey?: string
  voiceId: string
  model: 'eleven_monolingual_v1' | 'eleven_multilingual_v1' | 'eleven_turbo_v2'
  stability: number // 0.0 - 1.0
  similarityBoost: number // 0.0 - 1.0
  style: number // 0.0 - 1.0 (v2 only)
  useSpeakerBoost: boolean // v2 only
}

export interface TTSResponse {
  success: boolean
  audioUrl?: string
  audioBlob?: Blob
  duration?: number
  error?: string
}

export class ElevenLabsTTSService {
  private config: TTSConfig
  private audioContext?: AudioContext
  private currentAudio?: HTMLAudioElement

  constructor(config: Partial<TTSConfig> = {}) {
    this.config = {
      // Default Emma voice config - gentle, empathetic female voice
      voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm, friendly
      model: 'eleven_turbo_v2', // Fast, high quality
      stability: 0.6, // Balanced stability
      similarityBoost: 0.8, // High similarity to training
      style: 0.2, // Slightly expressive
      useSpeakerBoost: true,
      ...config
    }
  }

  /**
   * Initialize TTS service
   */
  async initialize(): Promise<void> {
    try {
      // Initialize audio context
      this.audioContext = new AudioContext()
      
      // API key is now handled securely on backend - no need to check here
      console.log('🔊 ElevenLabs TTS Service initialized (using secure backend endpoint)')
      
    } catch (error) {
      console.error('Failed to initialize TTS service:', error)
      throw error
    }
  }

  /**
   * Generate speech from text using secure backend endpoint
   */
  async generateSpeech(
    text: string,
    options: {
      voiceId?: string
      emotionalContext?: 'calm' | 'empathetic' | 'supportive' | 'gentle'
      priority?: 'speed' | 'quality'
    } = {}
  ): Promise<TTSResponse> {
    try {
      console.log(`🔊 Generating TTS via secure endpoint: "${text.substring(0, 50)}..."`)
      
      // Call secure backend endpoint instead of direct API
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text.trim(),
          voiceId: options.voiceId,
          emotionalContext: options.emotionalContext,
          priority: options.priority
        })
      })

      const result = await response.json()

      if (!result.success) {
        console.error('❌ TTS backend error:', result.error)
        return {
          success: false,
          error: result.error || 'TTS service failed'
        }
      }

      console.log(`✅ TTS Success: Audio data received (${result.duration}s estimated)`)

      return {
        success: true,
        audioUrl: result.audioUrl,
        duration: result.duration
      }

    } catch (error) {
      console.error('❌ TTS service error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'TTS service unavailable'
      }
    }
  }

  /**
   * Play generated audio
   */
  async playAudio(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Stop any currently playing audio
        this.stopCurrentAudio()

        this.currentAudio = new Audio(audioUrl)
        this.currentAudio.volume = 0.8
        
        this.currentAudio.onended = () => {
          this.cleanup()
          resolve()
        }
        
        this.currentAudio.onerror = (error) => {
          this.cleanup()
          reject(error)
        }

        this.currentAudio.play()
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Generate and play Emma's response
   */
  async speakEmmaResponse(
    text: string,
    context: {
      conflictLevel?: number
      emotionalTone?: string
      isIntervention?: boolean
    } = {}
  ): Promise<void> {
    try {
      // Determine emotional context for voice
      let emotionalContext: 'calm' | 'empathetic' | 'supportive' | 'gentle' = 'calm'
      
      if (context.isIntervention) {
        emotionalContext = 'supportive'
      } else if (context.conflictLevel && context.conflictLevel > 6) {
        emotionalContext = 'empathetic'
      } else if (context.emotionalTone === 'sad' || context.emotionalTone === 'frustrated') {
        emotionalContext = 'gentle'
      }

      // Generate speech
      const result = await this.generateSpeech(text, {
        emotionalContext,
        priority: 'speed' // Prioritize response time in conversations
      })

      if (result.success && result.audioUrl) {
        await this.playAudio(result.audioUrl)
        
        // Cleanup URL after playing
        setTimeout(() => {
          URL.revokeObjectURL(result.audioUrl!)
        }, 1000)
      } else {
        console.error('Failed to generate Emma speech:', result.error)
        // Fallback: could implement browser speech synthesis here
      }

    } catch (error) {
      console.error('Error in speakEmmaResponse:', error)
    }
  }

  /**
   * Stop currently playing audio
   */
  stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.cleanup()
    }
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    return this.currentAudio ? !this.currentAudio.paused : false
  }

  /**
   * Get available Emma voices
   */
  async getAvailableVoices(): Promise<Array<{
    voice_id: string
    name: string
    description: string
    category: string
  }>> {
    try {
      const apiKey = this.config.apiKey || process.env.ELEVENLABS_API_KEY
      
      if (!apiKey) {
        return []
      }

      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey
        }
      })

      if (response.ok) {
        const data = await response.json()
        return data.voices.filter((voice: any) => 
          voice.category === 'professional' || voice.category === 'conversational'
        )
      }
      
      return []
    } catch (error) {
      console.error('Failed to fetch voices:', error)
      return []
    }
  }

  /**
   * Prepare text for TTS (add pauses, normalize, etc.)
   */
  private prepareTextForTTS(text: string): string {
    return text
      // Add natural pauses
      .replace(/\.\s+/g, '. <break time="0.3s"/> ')
      .replace(/,\s+/g, ', <break time="0.1s"/> ')
      .replace(/\?\s+/g, '? <break time="0.4s"/> ')
      .replace(/!\s+/g, '! <break time="0.4s"/> ')
      // Normalize text
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Get voice settings based on emotional context
   */
  private getContextualVoiceSettings(context?: string) {
    const baseSettings = {
      stability: this.config.stability,
      similarity_boost: this.config.similarityBoost,
      style: this.config.style,
      use_speaker_boost: this.config.useSpeakerBoost
    }

    switch (context) {
      case 'empathetic':
        return {
          ...baseSettings,
          stability: 0.7, // More stable for empathy
          style: 0.4 // More expressive
        }
      
      case 'supportive':
        return {
          ...baseSettings,
          stability: 0.8, // Very stable for support
          style: 0.1 // Less expressive, more steady
        }
      
      case 'gentle':
        return {
          ...baseSettings,
          stability: 0.9, // Very gentle and stable
          style: 0.05 // Minimal expression
        }
      
      case 'calm':
      default:
        return baseSettings
    }
  }

  /**
   * Get audio duration from blob
   */
  private async getAudioDuration(blob: Blob): Promise<number> {
    return new Promise((resolve) => {
      try {
        const audio = new Audio(URL.createObjectURL(blob))
        audio.onloadedmetadata = () => {
          URL.revokeObjectURL(audio.src)
          resolve(audio.duration)
        }
        audio.onerror = () => resolve(0)
      } catch {
        resolve(0)
      }
    })
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.currentAudio) {
      this.currentAudio.onended = null
      this.currentAudio.onerror = null
      this.currentAudio = undefined
    }
  }

  /**
   * Cleanup service
   */
  async destroy(): Promise<void> {
    this.stopCurrentAudio()
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      await this.audioContext.close()
    }

    console.log('🔊 ElevenLabs TTS Service destroyed')
  }
}