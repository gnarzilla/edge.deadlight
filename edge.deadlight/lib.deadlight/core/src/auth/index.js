// deadlight-core/src/auth/index.js
// Main auth module exports

export { hashPassword, verifyPassword, checkAuth } from './password.js';
export { AuthError, AuthErrorCodes } from './errors.js';
/**
 * Base64 URL-safe encoding for JWT
 * @param {ArrayBuffer} arrayBuffer - Data to encode
 * @returns {string} Base64 URL-safe encoded string
 */
function base64UrlEncode(arrayBuffer) {
  const uint8Array = new Uint8Array(arrayBuffer);
  let base64String = '';

  for (let i = 0; i < uint8Array.length; i++) {
    base64String += String.fromCharCode(uint8Array[i]);
  }

  return btoa(base64String)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Base64 URL-safe decoding for JWT
 * @param {string} base64UrlString - Base64 URL-safe encoded string
 * @returns {ArrayBuffer} Decoded data
 */
function base64UrlDecode(base64UrlString) {
  const base64String = base64UrlString
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64UrlString.length + (4 - (base64UrlString.length % 4)) % 4, '=');

  const binaryString = atob(base64String);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Create a JWT token with enhanced payload validation
 * @param {object} payload - JWT payload data
 * @param {string} secret - Secret key for signing
 * @param {object} options - Additional options (exp, iss, etc.)
 * @returns {Promise<string>} JWT token
 */
export async function createJWT(payload, secret, options = {}) {
  const encoder = new TextEncoder();
  
  // Enhanced header with optional algorithm specification
  const header = { 
    alg: options.algorithm || 'HS256', 
    typ: 'JWT' 
  };

  // Enhanced payload with standard claims
  const now = Math.floor(Date.now() / 1000);
  const enhancedPayload = {
    ...payload,
    iat: now, // Issued at
    ...(options.expiresIn && { exp: now + options.expiresIn }),
    ...(options.issuer && { iss: options.issuer }),
    ...(options.audience && { aud: options.audience })
  };

  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify(enhancedPayload)));

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const encodedSignature = base64UrlEncode(signature);

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

/**
 * Verify JWT token with enhanced validation
 * @param {string} token - JWT token to verify
 * @param {string} secret - Secret key for verification
 * @param {object} options - Verification options
 * @returns {Promise<object|null>} Decoded payload or null if invalid
 */
export async function verifyJWT(token, secret, options = {}) {
  try {
    const encoder = new TextEncoder();
    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return null;
    }

    // Verify signature
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = `${encodedHeader}.${encodedPayload}`;
    const signature = base64UrlDecode(encodedSignature);

    const isValid = await crypto.subtle.verify(
      'HMAC', 
      key, 
      signature, 
      encoder.encode(data)
    );

    if (!isValid) {
      return null;
    }

    // Decode payload
    const decodedPayloadBytes = base64UrlDecode(encodedPayload);
    const decodedPayloadString = new TextDecoder().decode(decodedPayloadBytes);
    const payload = JSON.parse(decodedPayloadString);

    // Enhanced validation
    const now = Math.floor(Date.now() / 1000);
    
    // Check expiration
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // Check not before
    if (payload.nbf && payload.nbf > now) {
      return null;
    }

    // Check issuer if specified
    if (options.issuer && payload.iss !== options.issuer) {
      return null;
    }

    // Check audience if specified
    if (options.audience && payload.aud !== options.audience) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}