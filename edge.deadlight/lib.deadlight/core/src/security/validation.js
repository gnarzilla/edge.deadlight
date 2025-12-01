// lib.deadlight/core/src/security/validation.js
export class Validator {
  // Enhanced email validation
  static email(email) {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) && email.length <= 255;
  }
  
  // Enhanced username validation with error details
  static username(username) {
    if (!username || typeof username !== 'string') {
      return { valid: false, error: 'Username is required' };
    }
    if (username.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters' };
    }
    if (username.length > 20) {
      return { valid: false, error: 'Username must not exceed 20 characters' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
    return { valid: true };
  }
  
  // Enhanced password validation
  static password(password) {
    if (!password || typeof password !== 'string') {
      return { valid: false, error: 'Password is required' };
    }
    if (password.length < 8) {
      return { valid: false, error: 'Password must be at least 8 characters' };
    }
    if (password.length > 100) {
      return { valid: false, error: 'Password is too long' };
    }
    return { valid: true };
  }
  
  // Validate blog post fields
  static postTitle(title) {
    if (!title || typeof title !== 'string') {
      return { valid: false, error: 'Title is required' };
    }
    const trimmed = title.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Title cannot be empty' };
    }
    if (trimmed.length > 200) {
      return { valid: false, error: 'Title must not exceed 200 characters' };
    }
    return { valid: true, value: trimmed };
  }
  
  static postContent(content) {
    if (!content || typeof content !== 'string') {
      return { valid: false, error: 'Content is required' };
    }
    if (content.trim().length === 0) {
      return { valid: false, error: 'Content cannot be empty' };
    }
    if (content.length > 50000) {
      return { valid: false, error: 'Content is too long' };
    }
    return { valid: true };
  }
  
  static postSlug(slug) {
    if (!slug || typeof slug !== 'string') {
      return { valid: false, error: 'Slug is required' };
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return { valid: false, error: 'Slug can only contain lowercase letters, numbers, and hyphens' };
    }
    if (slug.length > 200) {
      return { valid: false, error: 'Slug must not exceed 200 characters' };
    }
    return { valid: true };
  }
  
  // Enhanced sanitization
  static sanitizeString(str, maxLength = 1000) {
    if (!str || typeof str !== 'string') return '';
    return str
      .slice(0, maxLength)
      .replace(/[<>]/g, '') // Basic XSS prevention
      .trim();
  }
  
  // More robust HTML sanitization
  static sanitizeHTML(input) {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  // Escape HTML for safe display
  static escapeHTML(input) {
    if (!input || typeof input !== 'string') return '';
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
    };
    return input.replace(/[&<>"'\/]/g, char => escapeMap[char]);
  }
  
  // Sanitize markdown (preserve formatting but remove dangerous content)
  static sanitizeMarkdown(input) {
    if (!input || typeof input !== 'string') return '';
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  
  // Generate safe slug from title
  static generateSlug(title) {
    if (!title || typeof title !== 'string') return '';
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }
  
  static isValidId(id) {
    return /^\d+$/.test(id);
  }
  
  // Validate pagination
  static page(page) {
    const num = parseInt(page, 10);
    if (isNaN(num) || num < 1) {
      return { valid: false, error: 'Invalid page number', value: 1 };
    }
    return { valid: true, value: num };
  }
  
  // Validate search query
  static searchQuery(query) {
    if (!query || typeof query !== 'string') {
      return { valid: true, value: '' };
    }
    const trimmed = query.trim();
    if (trimmed.length > 100) {
      return { valid: false, error: 'Search query too long' };
    }
    return { valid: true, value: trimmed };
  }
}

// Form validation helper
export class FormValidator {
  constructor() {
    this.errors = {};
  }
  
  validate(field, value, validator) {
    const result = validator(value);
    if (result.valid === false) {
      this.errors[field] = result.error;
      return false;
    }
    return result.value !== undefined ? result.value : value;
  }
  
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }
  
  getErrors() {
    return this.errors;
  }
  
  // Helper to validate form data
  static async validateFormData(formData, rules) {
    const validator = new FormValidator();
    const validated = {};
    
    for (const [field, rule] of Object.entries(rules)) {
      const value = formData.get(field);
      const result = validator.validate(field, value, rule);
      if (result !== false) {
        validated[field] = result;
      }
    }
    
    return {
      success: !validator.hasErrors(),
      data: validated,
      errors: validator.getErrors()
    };
  }
}

export class CSRFProtection {
  static generateToken() {
    return crypto.randomUUID();
  }
  
  static async hashToken(token, secret) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token + secret);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(hash)));
  }
  
  static getTokenFromCookie(request) {
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) return null;
    
    const match = cookieHeader.match(/csrf_token=([^;]+)/);
    return match ? match[1] : null;
  }
  
  static setTokenCookie(response, token, maxAge = 3600) {
    const cookie = `csrf_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
    response.headers.append('Set-Cookie', cookie);
    return response;
  }
  
  static async validate(request, env) {
    // Get token from cookie (server-side state)
    const cookieToken = this.getTokenFromCookie(request);
    if (!cookieToken) {
      return false;
    }
    
    // Get token from form/header (client-side submission)
    let submittedToken;
    
    const contentType = request.headers.get('Content-Type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.clone().formData();
      submittedToken = formData.get('csrf_token');
    } else if (contentType.includes('application/json')) {
      const body = await request.clone().json();
      submittedToken = body.csrf_token;
    } else {
      submittedToken = request.headers.get('X-CSRF-Token');
    }
    
    if (!submittedToken) {
      return false;
    }
    
    return cookieToken === submittedToken;
  }
  
  static async generateAndSet(response) {
    const token = this.generateToken();
    this.setTokenCookie(response, token);
    return token;
  }
}