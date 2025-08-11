import { NextRequest } from 'next/server';

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: { windowMs?: number; maxRequests?: number } = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute default
    this.maxRequests = options.maxRequests || 100; // 100 requests default
    
    // Clean up expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime <= now) {
        this.store.delete(key);
      }
    }
  }

  private getKey(req: NextRequest): string {
    // Use IP address as the key
    // In production with a proxy, you might need to check X-Forwarded-For
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // Include the path to have different limits per endpoint
    const path = new URL(req.url).pathname;
    return `${ip}:${path}`;
  }

  async check(req: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(req);
    const now = Date.now();
    
    let entry = this.store.get(key);
    
    if (!entry || entry.resetTime <= now) {
      // Create new entry
      entry = {
        count: 1,
        resetTime: now + this.windowMs
      };
      this.store.set(key, entry);
      
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetTime: entry.resetTime
      };
    }
    
    // Check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }
    
    // Increment count
    entry.count++;
    
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }
}

// Create singleton instances with different limits for different endpoint types
export const generalRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100  // 100 requests per minute
});

export const strictRateLimiter = new RateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 10   // 10 requests per minute for sensitive operations
});

export const authRateLimiter = new RateLimiter({
  windowMs: 300000, // 5 minutes
  maxRequests: 5     // 5 auth attempts per 5 minutes
});

/**
 * Middleware helper to apply rate limiting
 */
export async function withRateLimit(
  req: NextRequest,
  limiter: RateLimiter = generalRateLimiter
): Promise<{ success: boolean; response?: Response }> {
  // Skip rate limiting in development unless explicitly enabled
  if (process.env.NODE_ENV !== 'production' && process.env.RATE_LIMIT_ENABLED !== 'true') {
    return { success: true };
  }
  
  const { allowed, remaining, resetTime } = await limiter.check(req);
  
  if (!allowed) {
    const response = new Response(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': limiter['maxRequests'].toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime.toString(),
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
        }
      }
    );
    
    return { success: false, response };
  }
  
  return { success: true };
}
