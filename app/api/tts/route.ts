import { NextRequest, NextResponse } from 'next/server'

/**
 * ElevenLabs TTS API Endpoint
 * 
 * Secure backend endpoint for text-to-speech generation
 * API key is kept server-side for security
 */

interface TTSRequest {
  text: string
  voiceId?: string
  emotionalContext?: 'calm' | 'empathetic' | 'supportive' | 'gentle'
  priority?: 'speed' | 'quality'
}

interface TTSResponse {
  success: boolean
  audioUrl?: string
  duration?: number
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<TTSResponse>> {
  try {
    const { text, voiceId, emotionalContext, priority }: TTSRequest = await request.json()

    // Validate input
    if (!text || text.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Text is required'
      }, { status: 400 })
    }

    if (text.length > 5000) {
      return NextResponse.json({
        success: false,
        error: 'Text too long (max 5000 characters)'
      }, { status: 400 })
    }

    // Get API key from environment (secure server-side)
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      console.error('❌ ELEVENLABS_API_KEY not configured in environment')
      return NextResponse.json({
        success: false,
        error: 'TTS service not configured'
      }, { status: 500 })
    }

    // Determine voice settings based on emotional context
    const getVoiceSettings = (context?: string) => {
      const baseSettings = {
        stability: 0.6,
        similarity_boost: 0.8,
        style: 0.2,
        use_speaker_boost: true
      }

      switch (context) {
        case 'empathetic':
          return { ...baseSettings, stability: 0.7, style: 0.4 }
        case 'supportive':
          return { ...baseSettings, stability: 0.8, style: 0.1 }
        case 'gentle':
          return { ...baseSettings, stability: 0.9, style: 0.05 }
        case 'calm':
        default:
          return baseSettings
      }
    }

    // Prepare text for TTS (add natural pauses)
    const prepareText = (text: string): string => {
      return text
        .replace(/\.\s+/g, '. <break time="0.3s"/> ')
        .replace(/,\s+/g, ', <break time="0.1s"/> ')
        .replace(/\?\s+/g, '? <break time="0.4s"/> ')
        .replace(/!\s+/g, '! <break time="0.4s"/> ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Use configured voice ID or fallback
    const targetVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'
    const model = priority === 'quality' ? 'eleven_multilingual_v1' : 'eleven_turbo_v2'
    const voiceSettings = getVoiceSettings(emotionalContext)
    const processedText = prepareText(text)

    console.log(`🔊 TTS Request: ${processedText.substring(0, 50)}... (voice: ${targetVoiceId}, context: ${emotionalContext})`)

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: processedText,
          model_id: model,
          voice_settings: voiceSettings
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ ElevenLabs API error:', response.status, errorText)
      
      return NextResponse.json({
        success: false,
        error: `TTS service error: ${response.status}`
      }, { status: response.status })
    }

    // Get audio data
    const audioBuffer = await response.arrayBuffer()
    const audioBase64 = Buffer.from(audioBuffer).toString('base64')
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`

    // Estimate duration (rough calculation: ~150 characters per second)
    const estimatedDuration = Math.max(1, Math.ceil(processedText.length / 150))

    console.log(`✅ TTS Success: ${audioBuffer.byteLength} bytes, ~${estimatedDuration}s duration`)

    return NextResponse.json({
      success: true,
      audioUrl,
      duration: estimatedDuration
    })

  } catch (error) {
    console.error('❌ TTS endpoint error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'TTS service unavailable'
    }, { status: 500 })
  }
}