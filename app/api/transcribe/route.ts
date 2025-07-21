import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { ratelimit } from '@/lib/ratelimit'
import type { TranscriptionResult } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.ip ?? 'anonymous'
    const { success, limit, reset, remaining } = await ratelimit.limit(clientIp)
    
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

    // Transcribe with OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: language,
      response_format: 'verbose_json',
      temperature: 0.2, // Lower temperature for more consistent results
    })

    // Validate transcription result
    if (!transcription.text || transcription.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No speech detected in audio' },
        { status: 400 }
      )
    }

    // Safety check for crisis indicators
    const text = transcription.text.trim()
    const hasEmergencyKeywords = checkForEmergencyKeywords(text)
    
    const result: TranscriptionResult = {
      text,
      confidence: 0.9, // Whisper doesn't provide confidence, using default
      language: transcription.language || language,
      duration: transcription.duration,
      segments: transcription.segments?.map(segment => ({
        start: segment.start,
        end: segment.end,
        text: segment.text,
        confidence: 0.9 // Default confidence for segments
      })) || [],
      crisisDetected: hasEmergencyKeywords,
      requiresHumanReview: hasEmergencyKeywords
    }

    return NextResponse.json(result, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': (remaining - 1).toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      }
    })

  } catch (error) {
    console.error('Transcription error:', error)
    
    if (error instanceof Error) {
      // Handle specific OpenAI errors
      if (error.message.includes('rate_limit_exceeded')) {
        return NextResponse.json(
          { error: 'API rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      
      if (error.message.includes('invalid_api_key')) {
        return NextResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process audio. Please try again.' },
      { status: 500 }
    )
  }
}

// Emergency keyword detection
function checkForEmergencyKeywords(text: string): boolean {
  const emergencyKeywords = [
    // Direct harm indicators
    'kill myself', 'suicide', 'end my life', 'want to die',
    'hurt myself', 'self-harm', 'cut myself', 'harm myself',
    
    // Method indicators
    'overdose', 'pills', 'jump off', 'hang myself',
    'shoot myself', 'knife', 'blade',
    
    // Desperation indicators
    'can\'t go on', 'no point living', 'better off dead',
    'end it all', 'give up', 'hopeless',
    
    // Crisis language
    'emergency', 'help me', 'save me', 'desperate'
  ]
  
  const lowerText = text.toLowerCase()
  
  return emergencyKeywords.some(keyword => {
    // Use word boundaries to avoid false positives
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    return regex.test(lowerText)
  })
}

// Supported languages for Whisper
const SUPPORTED_LANGUAGES = [
  'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr', 'cs', 'da', 'nl',
  'en', 'et', 'fi', 'fr', 'gl', 'de', 'el', 'he', 'hi', 'hu', 'is', 'id', 'it',
  'ja', 'kn', 'kk', 'ko', 'lv', 'lt', 'mk', 'ms', 'ml', 'mt', 'mi', 'mr', 'ne',
  'no', 'fa', 'pl', 'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw', 'sv', 'tl',
  'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy'
] as const