import { NextRequest, NextResponse } from 'next/server'
import { ratelimit } from '@/lib/ratelimit'
import { TranscriptionService } from '@/lib/voice/transcription-service'
import { TranscriptionResult, VoiceProcessingError } from '@/types'

// Initialize transcription service with fallback providers
const transcriptionService = new TranscriptionService()

export async function POST(request: NextRequest) {
  console.log('=== Transcription API called ===')
  try {
    // Rate limiting with better error handling
    const clientIp = request.ip ?? 'anonymous'
    console.log('Client IP:', clientIp)
    
    let rateLimitResult
    try {
      rateLimitResult = await ratelimit.limit(clientIp)
    } catch (rateLimitError) {
      console.warn('Rate limiting failed, proceeding without limits:', rateLimitError)
      rateLimitResult = { success: true, limit: 100, reset: Date.now() + 60000, remaining: 99 }
    }
    
    const { success, limit, reset, remaining } = rateLimitResult
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
          }
        }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const language = formData.get('language') as string || 'en'
    
    if (!file) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    // Validate file size (max 25MB for Whisper)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 25MB.' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = [
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 
      'audio/ogg', 'audio/flac', 'audio/m4a'
    ]
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      )
    }

    // Convert file to blob for transcription service
    const audioBuffer = Buffer.from(await file.arrayBuffer())
    const audioBlob = new Blob([audioBuffer], { type: file.type })

    // Transcribe with resilient service (OpenAI + Web Speech API fallback)
    const result = await transcriptionService.transcribe(audioBlob, {
      language: language,
      temperature: 0.2,
      maxRetries: 2
    })

    console.log(`Transcription successful with provider: ${result.provider}`)

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': (remaining - 1).toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      }
    })

  } catch (error) {
    console.error('Transcription error:', error)
    
    if (error instanceof VoiceProcessingError) {
      // Handle VoiceProcessingError with specific error codes
      switch (error.code) {
        case 'NO_SPEECH_DETECTED':
          return NextResponse.json(
            { error: 'No speech detected in audio' },
            { status: 400 }
          )
        case 'RATE_LIMIT_EXCEEDED':
          return NextResponse.json(
            { error: 'API rate limit exceeded. Please try again later.' },
            { status: 429 }
          )
        case 'INVALID_API_KEY':
        case 'INSUFFICIENT_QUOTA':
          return NextResponse.json(
            { error: 'Service temporarily unavailable' },
            { status: 503 }
          )
        case 'ALL_PROVIDERS_FAILED':
          return NextResponse.json(
            { error: 'All transcription services are currently unavailable. Please try again later.' },
            { status: 503 }
          )
        case 'PERMISSION_DENIED':
          return NextResponse.json(
            { error: 'Microphone permission required for transcription' },
            { status: 403 }
          )
        case 'NETWORK_ERROR':
        case 'TIMEOUT':
          return NextResponse.json(
            { error: 'Network error. Please check your connection and try again.' },
            { status: 503 }
          )
        default:
          return NextResponse.json(
            { error: 'Failed to process audio. Please try again.' },
            { status: 500 }
          )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process audio. Please try again.' },
      { status: 500 }
    )
  }
}