import { NextRequest, NextResponse } from 'next/server'
import { EmmaAI } from '@/lib/ai/emma-core'

// Initialize Emma AI instance for monitoring
const emma = new EmmaAI()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'health'
    
    switch (action) {
      case 'health':
        const systemHealth = emma.getSystemHealth()
        return NextResponse.json({
          status: 'success',
          data: systemHealth,
          timestamp: new Date().toISOString()
        })
        
      case 'crisis-events':
        const hours = parseInt(searchParams.get('hours') || '24')
        const crisisEvents = emma.getCrisisEvents(hours)
        return NextResponse.json({
          status: 'success',
          data: {
            events: crisisEvents,
            count: crisisEvents.length,
            timeframe: `${hours} hours`
          },
          timestamp: new Date().toISOString()
        })
        
      case 'analytics':
        const analytics = emma.exportAnalytics()
        return NextResponse.json({
          status: 'success',
          data: analytics,
          timestamp: new Date().toISOString()
        })
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: health, crisis-events, or analytics' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Monitoring API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch monitoring data' },
      { status: 500 }
    )
  }
}

// Validate message quality (for testing)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, emotion } = body
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    const validation = await emma.validateMessage(message, emotion)
    
    return NextResponse.json({
      status: 'success',
      data: validation,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Message validation error:', error)
    return NextResponse.json(
      { error: 'Failed to validate message' },
      { status: 500 }
    )
  }
}