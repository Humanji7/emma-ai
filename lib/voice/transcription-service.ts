import OpenAI from 'openai'
import { TranscriptionResult, VoiceProcessingError } from '@/types'

export interface TranscriptionProvider {
  name: string
  transcribe: (audioBlob: Blob, options?: TranscriptionOptions) => Promise<TranscriptionResult>
  isHealthy: () => Promise<boolean>
}

export interface TranscriptionOptions {
  language?: string
  temperature?: number
  prompt?: string
  maxRetries?: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffFactor: number
}

/**
 * OpenAI Whisper transcription provider
 */
export class OpenAITranscriptionProvider implements TranscriptionProvider {
  name = 'openai-whisper'
  private openai: OpenAI

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY || 'dummy-key-for-build'
    })
  }

  async transcribe(audioBlob: Blob, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    try {
      console.log(`[${this.name}] Starting transcription...`)
      
      // Convert blob to file
      const audioFile = new File([audioBlob], 'audio.webm', { type: audioBlob.type })
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: options.language || 'en',
        response_format: 'verbose_json',
        temperature: options.temperature || 0.2,
        prompt: options.prompt
      })

      if (!transcription.text || transcription.text.trim().length === 0) {
        throw new VoiceProcessingError('No speech detected in audio', 'NO_SPEECH_DETECTED')
      }

      const result: TranscriptionResult = {
        text: transcription.text.trim(),
        confidence: 0.9, // Whisper doesn't provide confidence
        language: transcription.language || options.language || 'en',
        duration: transcription.duration,
        segments: transcription.segments?.map(segment => ({
          start: segment.start,
          end: segment.end,
          text: segment.text,
          confidence: 0.9
        })) || [],
        crisisDetected: this.checkForCrisisIndicators(transcription.text),
        requiresHumanReview: false, // Will be set by crisis detection
        provider: this.name
      }

      console.log(`[${this.name}] Transcription successful: ${result.text.length} characters`)
      return result

    } catch (error) {
      console.error(`[${this.name}] Transcription failed:`, error)
      
      if (error instanceof VoiceProcessingError) {
        throw error
      }

      // Handle OpenAI-specific errors
      if (error instanceof Error) {
        if (error.message.includes('rate_limit_exceeded')) {
          throw new VoiceProcessingError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', true)
        }
        
        if (error.message.includes('invalid_api_key')) {
          throw new VoiceProcessingError('Invalid API key', 'INVALID_API_KEY', false)
        }
        
        if (error.message.includes('insufficient_quota')) {
          throw new VoiceProcessingError('Insufficient quota', 'INSUFFICIENT_QUOTA', false)
        }
      }

      throw new VoiceProcessingError('Transcription failed', 'TRANSCRIPTION_ERROR', true)
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple API key validation instead of file upload
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'dummy-key-for-build') {
        return false
      }
      
      // Test API connectivity with a simple request
      try {
        await this.openai.models.list()
        return true
      } catch (error: any) {
        // If we get 401, API key is invalid but service is reachable
        if (error?.status === 401) {
          return false
        }
        // Other errors might indicate service issues
        return false
      }
    } catch (error: any) {
      console.error(`[${this.name}] Health check failed:`, error)
      return false
    }
  }

  private checkForCrisisIndicators(text: string): boolean {
    const crisisKeywords = [
      // Immediate danger
      'kill myself', 'suicide', 'end my life', 'want to die', 'better off dead',
      'hurt myself', 'self-harm', 'cut myself', 'harm myself',
      
      // Violence indicators  
      'hit me', 'beats me', 'hurts me', 'threatens me', 'afraid of',
      'violence', 'abuse', 'domestic violence',
      
      // Child safety
      'hurt my child', 'child abuse', 'unsafe for kids',
      
      // Methods
      'overdose', 'pills', 'jump off', 'hang myself', 'gun', 'knife',
      
      // Desperation
      'can\'t go on', 'no point living', 'hopeless', 'desperate',
      'end it all', 'give up'
    ]
    
    const lowerText = text.toLowerCase()
    return crisisKeywords.some(keyword => {
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return regex.test(lowerText)
    })
  }
}

/**
 * Browser Web Speech API fallback provider
 */
export class WebSpeechAPIProvider implements TranscriptionProvider {
  name = 'web-speech-api'

  async transcribe(audioBlob: Blob, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[${this.name}] Starting transcription...`)
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new VoiceProcessingError('Web Speech API not supported', 'NOT_SUPPORTED', false)
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
        if (!SpeechRecognition) {
          throw new VoiceProcessingError('Speech recognition not available', 'NOT_SUPPORTED', false)
        }
        const recognition = new SpeechRecognition()
        
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = options.language || 'en-US'
        recognition.maxAlternatives = 1

        recognition.onresult = (event) => {
          const result = event.results[0]
          if (result && result[0]) {
            const transcript = result[0].transcript.trim()
            
            if (transcript.length === 0) {
              reject(new VoiceProcessingError('No speech detected', 'NO_SPEECH_DETECTED'))
              return
            }

            console.log(`[${this.name}] Transcription successful: ${transcript}`)
            
            resolve({
              text: transcript,
              confidence: result[0].confidence || 0.8,
              language: options.language || 'en',
              duration: 0, // Web Speech API doesn't provide duration
              segments: [{
                start: 0,
                end: 0,
                text: transcript,
                confidence: result[0].confidence || 0.8
              }],
              crisisDetected: false, // Will be handled by main service
              requiresHumanReview: false,
              provider: this.name
            })
          } else {
            reject(new VoiceProcessingError('No transcription result', 'NO_RESULT'))
          }
        }

        recognition.onerror = (event) => {
          console.error(`[${this.name}] Recognition error:`, event.error)
          
          switch (event.error) {
            case 'no-speech':
              reject(new VoiceProcessingError('No speech detected', 'NO_SPEECH_DETECTED'))
              break
            case 'audio-capture':
              reject(new VoiceProcessingError('Audio capture error', 'AUDIO_CAPTURE_ERROR'))
              break
            case 'not-allowed':
              reject(new VoiceProcessingError('Microphone permission denied', 'PERMISSION_DENIED', false))
              break
            case 'network':
              reject(new VoiceProcessingError('Network error', 'NETWORK_ERROR', true))
              break
            default:
              reject(new VoiceProcessingError(`Recognition error: ${event.error}`, 'RECOGNITION_ERROR', true))
          }
        }

        recognition.onend = () => {
          console.log(`[${this.name}] Recognition ended`)
        }

        // Start recognition
        recognition.start()

        // Timeout after 10 seconds
        setTimeout(() => {
          recognition.abort()
          reject(new VoiceProcessingError('Recognition timeout', 'TIMEOUT'))
        }, 10000)

      } catch (error) {
        console.error(`[${this.name}] Setup failed:`, error)
        reject(new VoiceProcessingError('Web Speech API setup failed', 'SETUP_ERROR', false))
      }
    })
  }

  async isHealthy(): Promise<boolean> {
    return ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window)
  }
}

/**
 * Resilient transcription service with multiple providers and retry logic
 */
export class TranscriptionService {
  private providers: TranscriptionProvider[]
  private retryConfig: RetryConfig

  constructor(providers?: TranscriptionProvider[], retryConfig?: Partial<RetryConfig>) {
    this.providers = providers || [
      new OpenAITranscriptionProvider(),
      new WebSpeechAPIProvider()
    ]

    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      ...retryConfig
    }
  }

  async transcribe(audioBlob: Blob, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    let lastError: Error | null = null

    for (const provider of this.providers) {
      try {
        console.log(`Trying transcription with ${provider.name}`)
        
        // Check if provider is healthy
        const isHealthy = await provider.isHealthy()
        if (!isHealthy) {
          console.warn(`Provider ${provider.name} is not healthy, skipping`)
          continue
        }

        // Attempt transcription with retry logic
        const result = await this.transcribeWithRetry(provider, audioBlob, options)
        
        console.log(`Transcription successful with ${provider.name}`)
        return result

      } catch (error) {
        console.error(`Provider ${provider.name} failed:`, error)
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // If it's a non-retryable error, try next provider immediately
        if (error instanceof VoiceProcessingError && !error.isRetryable) {
          continue
        }
      }
    }

    // All providers failed
    throw lastError || new VoiceProcessingError('All transcription providers failed', 'ALL_PROVIDERS_FAILED')
  }

  private async transcribeWithRetry(
    provider: TranscriptionProvider, 
    audioBlob: Blob, 
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await provider.transcribe(audioBlob, options)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on non-retryable errors
        if (error instanceof VoiceProcessingError && !error.isRetryable) {
          throw error
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1),
          this.retryConfig.maxDelay
        )

        console.log(`Retry attempt ${attempt + 1}/${this.retryConfig.maxAttempts} for ${provider.name} in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  async getHealthyProviders(): Promise<TranscriptionProvider[]> {
    const healthChecks = await Promise.allSettled(
      this.providers.map(async provider => ({
        provider,
        healthy: await provider.isHealthy()
      }))
    )

    return healthChecks
      .filter((result): result is PromiseFulfilledResult<{provider: TranscriptionProvider, healthy: boolean}> => 
        result.status === 'fulfilled' && result.value.healthy
      )
      .map(result => result.value.provider)
  }
}