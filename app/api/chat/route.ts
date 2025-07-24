import { NextRequest, NextResponse } from 'next/server'
import { EmmaAI } from '@/lib/ai/emma-core'
import { ratelimit } from '@/lib/ratelimit'
import type { EmotionData } from '@/types'

// Initialize Emma AI instance
const emma = new EmmaAI()

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

    // Parse request body
    const body = await request.json()
    const { 
      message, 
      emotion,
      speaker,
      coupleMode,
      conversationHistory,
      conflictLevel,
      emotionalTone
    } = body as {
      message: string
      emotion?: EmotionData
      speaker?: 'A' | 'B' | 'emma'
      coupleMode?: boolean
      conversationHistory?: Array<{
        id: string
        text: string
        speaker: 'A' | 'B' | 'emma'
        timestamp: string
        conflictLevel?: number
        emotionalTone?: string
      }>
      conflictLevel?: number
      emotionalTone?: 'calm' | 'frustrated' | 'angry' | 'defensive' | 'sad'
    }

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { error: 'Message too long. Maximum 1000 characters.' },
        { status: 400 }
      )
    }

    // Validate couple mode specific fields
    if (coupleMode) {
      if (speaker && !['A', 'B', 'emma'].includes(speaker)) {
        return NextResponse.json(
          { error: 'Invalid speaker. Must be A, B, or emma' },
          { status: 400 }
        )
      }
      
      if (conflictLevel !== undefined && (typeof conflictLevel !== 'number' || conflictLevel < 0 || conflictLevel > 10)) {
        return NextResponse.json(
          { error: 'Conflict level must be a number between 0 and 10' },
          { status: 400 }
        )
      }
      
      if (conversationHistory && !Array.isArray(conversationHistory)) {
        return NextResponse.json(
          { error: 'Conversation history must be an array' },
          { status: 400 }
        )
      }
    }

    // Process with Emma AI (with monitoring)
    const sessionId = request.headers.get('x-session-id') || undefined
    const userId = request.headers.get('x-user-id') || undefined
    
    // Enhanced metadata for couple mode
    const metadata = {
      userId,
      sessionId,
      coupleMode,
      speaker,
      conflictLevel,
      emotionalTone,
      conversationHistory: conversationHistory?.slice(-10) // Limit to last 10 messages for context
    }
    
    const result = coupleMode 
      ? await emma.processCoupleInput(message, emotion, metadata)
      : await emma.processUserInput(message, emotion, { userId, sessionId })

    // Log monitoring results
    if (!result.monitoring.passed) {
      console.warn('QUALITY GATES FAILED:', {
        alerts: result.monitoring.alerts,
        recommendations: result.monitoring.recommendations
      })
    }

    // Crisis handling with enhanced monitoring
    if (result.response.crisisDetected) {
      console.error('CRISIS DETECTED WITH MONITORING:', {
        timestamp: new Date().toISOString(),
        message: `${message.substring(0, 100)}...`,
        monitoring: result.monitoring,
        requiresReview: result.response.requiresHumanReview
      })
    }

    return NextResponse.json({
      response: result.response.data,
      metadata: {
        crisisDetected: result.response.crisisDetected,
        confidence: result.response.confidence,
        requiresHumanReview: result.response.requiresHumanReview,
        timestamp: result.response.timestamp,
        qualityGates: {
          passed: result.monitoring.passed,
          alertCount: result.monitoring.alerts.length,
          recommendations: result.monitoring.recommendations.slice(0, 3) // Limit for API
        },
        // Couple mode specific metadata
        ...(coupleMode && 'conflictAnalysis' in result && {
          coupleMode: true,
          speaker: speaker || 'unknown',
          conflictAnalysis: (result as any).conflictAnalysis,
          interventionRecommendation: (result as any).interventionRecommendation,
          speakerContext: (result as any).speakerContext
        })
      }
    }, {
      headers: {
        'X-RateLimit-Limit': limit.toString(),
        'X-RateLimit-Remaining': (remaining - 1).toString(),
        'X-RateLimit-Reset': new Date(reset).toISOString(),
      }
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    return NextResponse.json(
      { error: 'Failed to process message. Please try again.' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'Emma AI Chat API',
    timestamp: new Date().toISOString()
  })
}