// core/src/auth/jwt.js
import { JWTError } from './errors.js'

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

export async function createJWT(payload, secret, options = {}) {
  const encoder = new TextEncoder();
  const now = Math.floor(Date.now() / 1000);
  
  // Enhanced payload with standard claims
  const enhancedPayload = {
    ...payload,
    iat: now,
    exp: options.expiresIn ? now + options.expiresIn : now + 3600, // default 1 hour
    ...(options.issuer && { iss: options.issuer }),
    ...(options.audience && { aud: options.audience }),
    ...(options.notBefore && { nbf: now + options.notBefore })
  };

  const header = { alg: 'HS256', typ: 'JWT' };

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

export async function verifyJWT(token, secret, options = {}) {
  try {
    const encoder = new TextEncoder();
    const now = Math.floor(Date.now() / 1000);

    const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new JWTError('Invalid token format', 'INVALID_FORMAT');
    }

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
      throw new JWTError('Invalid token signature', 'INVALID_SIGNATURE');
    }

    // Decode and parse the payload
    const decodedPayloadBytes = base64UrlDecode(encodedPayload);
    const decodedPayloadString = new TextDecoder().decode(decodedPayloadBytes);
    const payload = JSON.parse(decodedPayloadString);

    // Validate timing claims
    if (payload.exp && payload.exp < now) {
      throw new JWTError('Token has expired', 'TOKEN_EXPIRED');
    }

    if (payload.nbf && payload.nbf > now) {
      throw new JWTError('Token not yet valid', 'TOKEN_NOT_BEFORE');
    }

    // Validate issuer/audience if specified
    if (options.issuer && payload.iss !== options.issuer) {
      throw new JWTError('Invalid issuer', 'INVALID_ISSUER');
    }

    if (options.audience && payload.aud !== options.audience) {
      throw new JWTError('Invalid audience', 'INVALID_AUDIENCE');
    }

    return payload;
  } catch (error) {
    if (error instanceof JWTError) {
      throw error;
    }
    throw new JWTError(`JWT verification error: ${error.message}`, 'VERIFICATION_ERROR');
  }
}
