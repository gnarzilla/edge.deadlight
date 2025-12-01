// lib.deadlight/core/src/security/ratelimit.js
export class RateLimiter {
  constructor(options = {}) {
      this.windowMs = options.windowMs || 60000; // 1 minute
      this.maxRequests = options.maxRequests || 10;
      this.keyPrefix = options.keyPrefix || 'rl:';
  }
  async isAllowed(request, env, identifier) {
    if (!env.RATE_LIMIT || env.DISABLE_RATE_LIMITING === 'true') {
      return {
        allowed: true,
        remaining: 999,
        resetAt: new Date(Date.now() + this.windowMs)
      };
    }
    const key = this.getKey(identifier || this.getIdentifier(request));
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get current attempts
    const attempts = await env.RATE_LIMIT.get(key, { type: 'json' }) || [];
    
    // Filter out old attempts
    const recentAttempts = attempts.filter(time => time > windowStart);
    
    if (recentAttempts.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(recentAttempts[0] + this.windowMs)
      };
    }
    
    // Add current attempt
    recentAttempts.push(now);
    await env.RATE_LIMIT.put(key, JSON.stringify(recentAttempts), {
      expirationTtl: Math.ceil(this.windowMs / 1000)
    });
    
    return {
      allowed: true,
      remaining: this.maxRequests - recentAttempts.length,
      resetAt: new Date(now + this.windowMs)
    };
  }

  getIdentifier(request) {
    // Use IP address or a combination of factors
    return request.headers.get('CF-Connecting-IP') || 
           request.headers.get('X-Forwarded-For') || 
           'unknown';
  }

  getKey(identifier) {
    return `${this.keyPrefix}${identifier}`;
  }
}

// Create specific limiters for different endpoints
export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyPrefix: 'rl:auth:'
});

export const apiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'rl:api:'
});

export const voteLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,           // 10 votes per hour
  keyPrefix: 'rl:vote:'
});

export const commentLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,            // 5 comments per hour
  keyPrefix: 'rl:comment:'
});