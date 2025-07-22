import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, NewSystemMetric } from '@/types/database'

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()
    
    // Validate error data
    if (!errorData.error || !errorData.errorId) {
      return NextResponse.json(
        { error: 'Missing required error data' },
        { status: 400 }
      )
    }

    // Log error to console
    console.error('Frontend Error Reported:', {
      errorId: errorData.errorId,
      message: errorData.error.message,
      context: errorData.context,
      level: errorData.level,
      timestamp: errorData.timestamp,
      url: errorData.url
    })

    // Store error metrics in database (if available)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        const supabase = createClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        )

        const errorMetric: NewSystemMetric = {
          metric_name: 'frontend_error',
          metric_value: 1,
          metric_unit: 'count',
          service_name: errorData.context || 'frontend',
          environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
          metadata: {
            errorId: errorData.errorId,
            errorMessage: errorData.error.message,
            errorName: errorData.error.name,
            level: errorData.level,
            url: errorData.url,
            userAgent: errorData.userAgent,
            stack: errorData.error.stack?.substring(0, 1000), // Truncate stack trace
            errorInfo: errorData.errorInfo
          }
        }

        await supabase.from('system_metrics').insert(errorMetric)
      } catch (dbError) {
        console.error('Failed to store error in database:', dbError)
        // Don't fail the request if database is unavailable
      }
    }

    // Send to external monitoring service (if configured)
    if (process.env.SENTRY_DSN) {
      // TODO: Send to Sentry
    }

    // Rate limiting check
    const clientIp = request.ip || 'unknown'
    const rateLimitKey = `error_report_${clientIp}`
    
    // TODO: Implement rate limiting to prevent spam

    return NextResponse.json(
      { 
        success: true, 
        errorId: errorData.errorId,
        message: 'Error reported successfully'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error reporting endpoint failed:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to report error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}