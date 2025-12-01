// deadlight-core/src/logging/index.js
// Enhanced logging module built on your existing implementation

export { loggingMiddleware, logRequest } from './middleware.js';
export { Logger } from './logger.js';
export { LogAnalytics } from './analytics.js';

// deadlight-core/src/logging/middleware.js
// Enhanced version of your logging middleware

/**
 * Extract client IP from Cloudflare request
 * @param {Request} request - Request object
 * @returns {string} Client IP address
 */
function getClientIP(request) {
  return request.headers.get('cf-connecting-ip') || 
         request.headers.get('x-real-ip') || 
         request.headers.get('x-forwarded-for') || 
         'unknown';
}

/**
 * Initialize logs table - enhanced from your version
 * @param {object} db - Database connection
 */
const initLogsTable = async (db) => {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS request_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      duration INTEGER NOT NULL,
      status_code INTEGER,
      user_agent TEXT,
      ip TEXT,
      referer TEXT,
      country TEXT,
      error TEXT,
      user_id INTEGER,
      session_id TEXT,
      request_size INTEGER,
      response_size INTEGER
    )
  `).run();

  // Add indices for performance
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp ON request_logs(timestamp)
  `).run();
  
  await db.prepare(`
    CREATE INDEX IF NOT EXISTS idx_request_logs_ip ON request_logs(ip)
  `).run();
};

/**
 * Enhanced request logging function
 * @param {Request} request - Request object
 * @param {Response} response - Response object
 * @param {object} env - Environment variables
 * @param {object} options - Logging options
 */
export const logRequest = async (request, response, env, options = {}) => {
  try {
    const duration = Date.now() - request.timing.startTime;
    const analytics = request.analytics || {};
    
    // Calculate response size if available
    const responseSize = response.headers.get('content-length') || 
                        (response.body ? new Blob([response.body]).size : 0);
    
    await env.DB.prepare(`
      INSERT INTO request_logs (
        path, method, duration, status_code, user_agent, ip, referer, country, error,
        user_id, session_id, request_size, response_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      analytics.path,
      analytics.method,
      duration,
      response.status,
      analytics.userAgent,
      analytics.ip,
      analytics.referer,
      analytics.country,
      response.ok ? null : response.statusText,
      analytics.userId || null,
      analytics.sessionId || null,
      analytics.requestSize || 0,
      responseSize
    ).run();

  } catch (error) {
    console.error('Error logging request:', error);
  }
};

/**
 * Enhanced logging middleware based on your implementation
 * @param {Request} request - Request object
 * @param {object} env - Environment variables
 * @param {Function} next - Next middleware function
 * @returns {Response} Response object
 */
export const loggingMiddleware = async (request, env, next) => {
  const startTime = Date.now();
  const url = new URL(request.url);
  
  try {
    // Initialize logs table if needed
    await initLogsTable(env.DB);
    
    // Enhanced request data collection
    const requestData = {
      path: url.pathname,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      ip: getClientIP(request),
      referer: request.headers.get('referer') || '',
      country: request.headers.get('cf-ipcountry') || 'unknown',
      requestSize: parseInt(request.headers.get('content-length') || '0'),
      sessionId: extractSessionId(request),
      userId: null // Will be set by auth middleware
    };
    
    // Add analytics data to request
    request.analytics = requestData;
    request.timing = { startTime };
    
    // Call the next middleware/handler
    const response = await next();
    
    // Async logging to not slow down response
    const duration = Date.now() - startTime;
    const responseSize = response.headers.get('content-length') || 0;
    
    env.DB.prepare(`
      INSERT INTO request_logs (
        path, method, duration, status_code, user_agent, ip, referer, country, error,
        user_id, session_id, request_size, response_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      requestData.path,
      requestData.method,
      duration,
      response.status,
      requestData.userAgent,
      requestData.ip,
      requestData.referer,
      requestData.country,
      response.ok ? null : response.statusText,
      requestData.userId,
      requestData.sessionId,
      requestData.requestSize,
      responseSize
    ).run().catch(err => console.error('Failed to log request:', err));
    
    return response;
    
  } catch (error) {
    console.error('Logging middleware error:', error);
    return await next();
  }
};

/**
 * Extract session ID from cookies or headers
 * @param {Request} request - Request object
 * @returns {string|null} Session ID
 */
function extractSessionId(request) {
  const cookies = request.headers.get('Cookie') || '';
  const sessionCookie = cookies.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith('session='));
    
  return sessionCookie ? sessionCookie.split('=')[1] : null;
}

// deadlight-core/src/logging/logger.js
// Structured logging utility

export class Logger {
  constructor(context = {}, options = {}) {
    this.context = context;
    this.options = {
      level: options.level || 'info',
      timestamp: options.timestamp !== false,
      colorize: options.colorize !== false,
      ...options
    };
  }

  /**
   * Create child logger with additional context
   * @param {object} childContext - Additional context
   * @returns {Logger} Child logger
   */
  child(childContext) {
    return new Logger(
      { ...this.context, ...childContext },
      this.options
    );
  }

  /**
   * Log a message with specified level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {object} data - Additional data
   */
  log(level, message, data = {}) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const currentLevel = levels[this.options.level] || 1;
    
    if (levels[level] < currentLevel) return;

    const logEntry = {
      timestamp: this.options.timestamp ? new Date().toISOString() : undefined,
      level,
      message,
      ...this.context,
      ...data
    };

    // Remove undefined values
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined) delete logEntry[key];
    });

    if (this.options.colorize && typeof console !== 'undefined') {
      this.colorizedOutput(level, logEntry);
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Colorized console output
   * @param {string} level - Log level
   * @param {object} entry - Log entry
   */
  colorizedOutput(level, entry) {
    const colors = {
      debug: '\x1b[36m', // cyan
      info: '\x1b[32m',  // green
      warn: '\x1b[33m',  // yellow
      error: '\x1b[31m', // red
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.reset;
    const timestamp = entry.timestamp ? `[${entry.timestamp}] ` : '';
    
    console.log(
      `${color}${timestamp}${level.toUpperCase()}${colors.reset}: ${entry.message}`,
      Object.keys(entry).length > 3 ? entry : ''
    );
  }

  debug(message, data) { this.log('debug', message, data); }
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
}

// deadlight-core/src/logging/analytics.js
// Log analytics and insights

import { Database } from '../db/database.js';

export class LogAnalytics {
  constructor(db) {
    this.db = db instanceof Database ? db : new Database(db);
  }

  /**
   * Get traffic summary for timeframe
   * @param {string} timeframe - Time period (1h, 24h, 7d, 30d)
   * @returns {Promise<object>} Traffic summary
   */
  async getTrafficSummary(timeframe = '24h') {
    const timeMap = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };

    const interval = timeMap[timeframe] || '24 hours';

    const summary = await this.db.first(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(DISTINCT ip) as unique_visitors,
        AVG(duration) as avg_response_time,
        SUM(request_size + response_size) as total_bandwidth,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
        COUNT(CASE WHEN status_code >= 500 THEN 1 END) as server_errors
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
    `);

    return {
      timeframe,
      totalRequests: summary?.total_requests || 0,
      uniqueVisitors: summary?.unique_visitors || 0,
      avgResponseTime: Math.round(summary?.avg_response_time || 0),
      totalBandwidth: summary?.total_bandwidth || 0,
      errorRate: summary?.total_requests ? 
        (summary.error_count / summary.total_requests * 100).toFixed(2) : 0,
      serverErrors: summary?.server_errors || 0
    };
  }

  /**
   * Get top pages by traffic
   * @param {string} timeframe - Time period
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Top pages
   */
  async getTopPages(timeframe = '24h', limit = 10) {
    const timeMap = {
      '1h': '1 hour',
      '24h': '24 hours', 
      '7d': '7 days',
      '30d': '30 days'
    };

    const interval = timeMap[timeframe] || '24 hours';

    return await this.db.all(`
      SELECT 
        path,
        COUNT(*) as hits,
        COUNT(DISTINCT ip) as unique_visitors,
        AVG(duration) as avg_duration
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
      GROUP BY path
      ORDER BY hits DESC
      LIMIT ?
    `, [limit]);
  }

  /**
   * Get error analysis
   * @param {string} timeframe - Time period
   * @returns {Promise<object>} Error analysis
   */
  async getErrorAnalysis(timeframe = '24h') {
    const timeMap = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days', 
      '30d': '30 days'
    };

    const interval = timeMap[timeframe] || '24 hours';

    const errors = await this.db.all(`
      SELECT 
        status_code,
        path,
        COUNT(*) as count,
        error
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
        AND status_code >= 400
      GROUP BY status_code, path, error
      ORDER BY count DESC
      LIMIT 20
    `);

    const summary = await this.db.first(`
      SELECT 
        COUNT(CASE WHEN status_code = 404 THEN 1 END) as not_found,
        COUNT(CASE WHEN status_code >= 500 THEN 1 END) as server_errors,
        COUNT(CASE WHEN status_code = 403 THEN 1 END) as forbidden
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
        AND status_code >= 400
    `);

    return {
      timeframe,
      errors,
      summary: {
        notFound: summary?.not_found || 0,
        serverErrors: summary?.server_errors || 0,
        forbidden: summary?.forbidden || 0
      }
    };
  }

  /**
   * Get geographic distribution
   * @param {string} timeframe - Time period
   * @returns {Promise<Array>} Geographic data
   */
  async getGeographicData(timeframe = '24h') {
    const timeMap = {
      '1h': '1 hour',
      '24h': '24 hours',
      '7d': '7 days',
      '30d': '30 days'
    };

    const interval = timeMap[timeframe] || '24 hours';

    return await this.db.all(`
      SELECT 
        country,
        COUNT(*) as requests,
        COUNT(DISTINCT ip) as unique_visitors
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
        AND country != 'unknown'
      GROUP BY country
      ORDER BY requests DESC
      LIMIT 20
    `);
  }

  /**
   * Get hourly traffic pattern
   * @param {number} days - Number of days to analyze
   * @returns {Promise<Array>} Hourly traffic data
   */
  async getHourlyPattern(days = 7) {
    return await this.db.all(`
      SELECT 
        strftime('%H', timestamp) as hour,
        COUNT(*) as requests,
        AVG(duration) as avg_duration
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${days} days')
      GROUP BY hour
      ORDER BY hour
    `);
  }
}
