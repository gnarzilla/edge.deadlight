// lib.deadlight/core/src/security/middleware.js
import { authLimiter, apiLimiter } from './ratelimit.js';
import { securityHeaders } from './headers.js';

export async function rateLimitMiddleware(request, env, ctx, next) {
  // CHECK FOR DISABLE FLAG FIRST
  if (env.DISABLE_RATE_LIMITING === 'true') {
    return next();
  }
  
  const url = new URL(request.url);
  
  // Choose limiter based on path
  let limiter = apiLimiter;
  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/register')) {
    limiter = authLimiter;
  }
  
  const result = await limiter.isAllowed(request, env);
  
  if (!result.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000),
        'X-RateLimit-Limit': limiter.maxRequests,
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': result.resetAt.toISOString()
      }
    });
  }
  
  // Call next middleware and add rate limit headers
  const response = await next();
  response.headers.set('X-RateLimit-Limit', limiter.maxRequests);
  response.headers.set('X-RateLimit-Remaining', result.remaining);
  response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());
  
  return response;
}

export async function securityHeadersMiddleware(request, env, ctx, next) {
  const response = await next();
  return securityHeaders(response);
}