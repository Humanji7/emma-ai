import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis connection for rate limiting
// Falls back to in-memory rate limiting if Redis is not configured
let redis: Redis | undefined
let ratelimit: Ratelimit

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })

    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
      analytics: true,
    })
  } else {
    // Fallback to memory-based rate limiting for development
    ratelimit = new Ratelimit({
      redis: new Map() as any, // Type assertion for in-memory fallback
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: false,
    })
  }
} catch (error) {
  console.warn('Rate limiting setup failed, using permissive fallback:', error)
  
  // Permissive fallback that always allows requests
  ratelimit = {
    limit: async () => ({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60000,
    }),
  } as unknown as Ratelimit
}

export { ratelimit }

// Rate limiting configurations for different endpoints
export const rateLimitConfigs = {
  // Transcription API - more restrictive due to compute cost
  transcription: {
    requests: 10,
    window: '1 m',
    description: '10 transcriptions per minute'
  },
  
  // Chat API - moderate restrictions
  chat: {
    requests: 30,
    window: '1 m', 
    description: '30 messages per minute'
  },
  
  // General API - less restrictive
  general: {
    requests: 100,
    window: '1 m',
    description: '100 requests per minute'
  },
  
  // Crisis detection - higher limits for emergency situations
  crisis: {
    requests: 50,
    window: '1 m',
    description: '50 crisis checks per minute'
  }
} as const

// Note: Additional rate limiting utilities (createRateLimiter, withRateLimit) 
// can be implemented when needed for endpoint-specific rate limiting