// lib.deadlight/core/src/security/headers.js
export function securityHeaders(response) {
  const headers = new Headers(response.headers);
  
  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Enable browser XSS protection
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  headers.set('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), ' +
    'gyroscope=(), magnetometer=(), microphone=(), ' +
    'payment=(), usb=()'
  );
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function securityHeadersMiddleware(request, env, ctx, next) {
  return next().then(response => securityHeaders(response));
}