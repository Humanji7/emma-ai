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

// Create rate limiter for specific endpoint
export function createRateLimiter(config: keyof typeof rateLimitConfigs) {
  const { requests, window } = rateLimitConfigs[config]
  
  try {
    if (redis) {
      return new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(requests, window),
        analytics: true,
      })
    } else {
      return new Ratelimit({
        redis: new Map() as any,
        limiter: Ratelimit.slidingWindow(requests, window), 
        analytics: false,
      })
    }
  } catch (error) {
    console.warn(`Failed to create rate limiter for ${config}:`, error)
    return ratelimit // Fallback to default
  }
}

// Rate limiting middleware helper
export function withRateLimit(config: keyof typeof rateLimitConfigs = 'general') {
  const limiter = createRateLimiter(config)
  
  return async function rateLimitMiddleware(
    request: Request,
    handler: () => Promise<Response>
  ): Promise<Response> {
    try {
      const clientIp = getClientIp(request)
      const { success, limit, reset, remaining } = await limiter.limit(clientIp)
      
      if (!success) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            limit,
            reset: new Date(reset).toISOString(),
            config: rateLimitConfigs[config].description
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(reset).toISOString(),
            }
          }
        )
      }
      
      const response = await handler()
      
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', limit.toString())
      response.headers.set('X-RateLimit-Remaining', (remaining - 1).toString())
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString())
      
      return response
      
    } catch (error) {
      console.error('Rate limiting error:', error)
      // Continue without rate limiting if there's an error
      return handler()
    }
  }
}

// Extract client IP from request
function getClientIp(request: Request): string {
  // Try various headers that might contain the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip', 
    'x-client-ip',
    'cf-connecting-ip', // Cloudflare
    'x-forwarded',
    'forwarded-for',
    'forwarded'
  ]
  
  for (const header of headers) {
    const value = request.headers.get(header)
    if (value) {
      // Take the first IP if there are multiple
      const ip = value.split(',')[0].trim()
      if (ip && ip !== 'unknown') {
        return ip
      }
    }
  }
  
  // Fallback to a default identifier
  return 'anonymous'
}