import { NextRequest, NextResponse } from 'next/server'
import { TranscriptionService } from '@/lib/voice/transcription-service'
import type { SystemHealth } from '@/types/database'

// Voice processing health check endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const transcriptionService = new TranscriptionService()
    
    // Check available transcription providers
    const healthyProviders = await transcriptionService.getHealthyProviders()
    const allProviders = ['openai-whisper', 'web-speech-api'] // Known providers
    
    // Test basic transcription capabilities (dry run)
    const capabilityTests = {
      openai_whisper: healthyProviders.some(p => p.name === 'openai-whisper'),
      web_speech_api: healthyProviders.some(p => p.name === 'web-speech-api'),
      fallback_available: healthyProviders.length > 1,
      crisis_detection: true, // Always available
      retry_logic: true, // Always available
    }
    
    const healthyCount = Object.values(capabilityTests).filter(Boolean).length
    const totalCount = Object.keys(capabilityTests).length
    const healthPercentage = healthyCount / totalCount
    
    // Determine overall status
    let status: 'healthy' | 'degraded' | 'unhealthy'
    if (healthPercentage >= 0.8) {
      status = 'healthy'
    } else if (healthPercentage >= 0.5) {
      status = 'degraded'
    } else {
      status = 'unhealthy'
    }
    
    const responseTime = Date.now() - startTime
    
    const health: SystemHealth = {
      service: 'voice_processing',
      status,
      responseTime,
      errorRate: healthyProviders.length === 0 ? 1.0 : Math.max(0, 1 - healthPercentage),
      lastChecked: new Date().toISOString(),
      details: {
        providers: {
          available: healthyProviders.map(p => p.name),
          total: allProviders.length,
          healthy: healthyProviders.length
        },
        capabilities: capabilityTests,
        performance: {
          response_time: responseTime,
          health_percentage: Math.round(healthPercentage * 100)
        }
      }
    }
    
    console.log('Voice processing health check:', {
      status,
      providers: healthyProviders.length,
      responseTime,
      capabilities: Object.keys(capabilityTests).filter(key => 
        capabilityTests[key as keyof typeof capabilityTests]
      ).length
    })
    
    return NextResponse.json(health, {
      status: status === 'healthy' ? 200 : status === 'degraded' ? 206 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
    
  } catch (error) {
    console.error('Voice processing health check failed:', error)
    
    const health: SystemHealth = {
      service: 'voice_processing',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      errorRate: 1.0,
      lastChecked: new Date().toISOString(),
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        providers: { available: [], total: 0, healthy: 0 },
        capabilities: {},
        performance: { response_time: Date.now() - startTime, health_percentage: 0 }
      }
    }
    
    return NextResponse.json(health, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Type': 'application/json'
      }
    })
  }
}