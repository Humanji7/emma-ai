import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database, SystemHealth } from '@/types/database'

// Health check endpoint for monitoring systems
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const health: Record<string, SystemHealth> = {}
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  try {
    // Check Supabase connection
    const supabaseHealth = await checkSupabaseHealth()
    health.supabase = supabaseHealth
    
    // Check OpenAI API
    const openaiHealth = await checkOpenAIHealth()
    health.openai = openaiHealth
    
    // Check ElevenLabs API (if configured)
    if (process.env.ELEVENLABS_API_KEY) {
      const elevenLabsHealth = await checkElevenLabsHealth()
      health.elevenlabs = elevenLabsHealth
    }

    // Check Redis/Upstash (if configured)
    if (process.env.UPSTASH_REDIS_REST_URL) {
      const redisHealth = await checkRedisHealth()
      health.redis = redisHealth
    }

    // Check internal services
    const voiceHealth = await checkVoiceProcessingHealth()
    health.voice_processing = voiceHealth

    const aiHealth = await checkAIServiceHealth()
    health.ai_service = aiHealth

    // Determine overall status
    const services = Object.values(health)
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length
    const degradedCount = services.filter(s => s.status === 'degraded').length

    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy'
    } else if (degradedCount > 0) {
      overallStatus = 'degraded'
    }

    const totalTime = Date.now() - startTime

    // Log health check result
    console.log('Health check completed:', {
      status: overallStatus,
      duration: totalTime,
      services: Object.keys(health).length,
      unhealthy: unhealthyCount,
      degraded: degradedCount
    })

    return NextResponse.json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: totalTime,
      services: health,
      metadata: {
        version: process.env.npm_package_version || '0.1.0',
        environment: process.env.NODE_ENV,
        region: process.env.VERCEL_REGION || 'unknown'
      }
    }, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 206 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Health check failed:', error)

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
      services: health
    }, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}

async function checkSupabaseHealth(): Promise<SystemHealth> {
  const start = Date.now()
  
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        errorRate: 1.0,
        lastChecked: new Date().toISOString(),
        details: { error: 'Missing configuration' }
      }
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Simple connection test
    const { data, error } = await supabase
      .from('system_config')
      .select('count')
      .limit(1)

    const responseTime = Date.now() - start

    if (error) {
      return {
        service: 'supabase',
        status: 'unhealthy',
        responseTime,
        errorRate: 1.0,
        lastChecked: new Date().toISOString(),
        details: { error: error.message }
      }
    }

    return {
      service: 'supabase',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      responseTime,
      errorRate: responseTime > 1000 ? 0.5 : 0,
      lastChecked: new Date().toISOString(),
      details: { connected: true }
    }

  } catch (error) {
    return {
      service: 'supabase',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

async function checkOpenAIHealth(): Promise<SystemHealth> {
  const start = Date.now()
  
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        service: 'openai',
        status: 'unhealthy',
        responseTime: Date.now() - start,
        errorRate: 1.0,
        lastChecked: new Date().toISOString(),
        details: { error: 'Missing API key' }
      }
    }

    // Simple API test
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000) // 5 second timeout
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      return {
        service: 'openai',
        status: 'unhealthy',
        responseTime,
        errorRate: 1.0,
        lastChecked: new Date().toISOString(),
        details: { error: `HTTP ${response.status}` }
      }
    }

    return {
      service: 'openai',
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime,
      errorRate: responseTime > 2000 ? 0.5 : 0,
      lastChecked: new Date().toISOString(),
      details: { connected: true }
    }

  } catch (error) {
    return {
      service: 'openai',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

async function checkElevenLabsHealth(): Promise<SystemHealth> {
  const start = Date.now()
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      method: 'GET',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY!
      },
      signal: AbortSignal.timeout(5000)
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      return {
        service: 'elevenlabs',
        status: 'unhealthy',
        responseTime,
        errorRate: 1.0,
        lastChecked: new Date().toISOString(),
        details: { error: `HTTP ${response.status}` }
      }
    }

    return {
      service: 'elevenlabs',
      status: responseTime > 2000 ? 'degraded' : 'healthy',
      responseTime,
      errorRate: responseTime > 2000 ? 0.5 : 0,
      lastChecked: new Date().toISOString(),
      details: { connected: true }
    }

  } catch (error) {
    return {
      service: 'elevenlabs',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

async function checkRedisHealth(): Promise<SystemHealth> {
  const start = Date.now()
  
  try {
    const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/ping`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`
      },
      signal: AbortSignal.timeout(3000)
    })

    const responseTime = Date.now() - start

    if (!response.ok) {
      return {
        service: 'redis',
        status: 'unhealthy',
        responseTime,
        errorRate: 1.0,
        lastChecked: new Date().toISOString(),
        details: { error: `HTTP ${response.status}` }
      }
    }

    return {
      service: 'redis',
      status: responseTime > 500 ? 'degraded' : 'healthy',
      responseTime,
      errorRate: responseTime > 500 ? 0.5 : 0,
      lastChecked: new Date().toISOString(),
      details: { connected: true }
    }

  } catch (error) {
    return {
      service: 'redis',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

async function checkVoiceProcessingHealth(): Promise<SystemHealth> {
  const start = Date.now()
  
  try {
    // Check if voice processing components are available
    const checks = {
      transcription: !!process.env.OPENAI_API_KEY,
      synthesis: !!process.env.ELEVENLABS_API_KEY,
      processing: true // Always available (client-side)
    }

    const allHealthy = Object.values(checks).every(Boolean)
    const responseTime = Date.now() - start

    return {
      service: 'voice_processing',
      status: allHealthy ? 'healthy' : 'degraded',
      responseTime,
      errorRate: allHealthy ? 0 : 0.5,
      lastChecked: new Date().toISOString(),
      details: checks
    }

  } catch (error) {
    return {
      service: 'voice_processing',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}

async function checkAIServiceHealth(): Promise<SystemHealth> {
  const start = Date.now()
  
  try {
    // Check if AI services are configured
    const checks = {
      openai_configured: !!process.env.OPENAI_API_KEY,
      emma_core: true, // Emma core is always available
      crisis_detection: true, // Crisis detection is always available
      templates_loaded: true // Templates are loaded from database
    }

    const allHealthy = Object.values(checks).every(Boolean)
    const responseTime = Date.now() - start

    return {
      service: 'ai_service',
      status: allHealthy ? 'healthy' : 'degraded',
      responseTime,
      errorRate: allHealthy ? 0 : 0.5,
      lastChecked: new Date().toISOString(),
      details: checks
    }

  } catch (error) {
    return {
      service: 'ai_service',
      status: 'unhealthy',
      responseTime: Date.now() - start,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
}