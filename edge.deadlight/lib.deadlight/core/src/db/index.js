// deadlight-core/src/db/index.js
// Main database module exports

export { Database } from './database.js';
export { UserModel } from './models/user.js';
export { PostModel } from './models/post.js';
export { SettingsModel } from './models/settings.js';
export { LogModel } from './models/log.js';
export { migrations } from './migrations.js';
export { DatabaseError, DatabaseErrorCodes } from './errors.js';

// deadlight-core/src/db/database.js
// Core database abstraction for D1/SQLite

import { DatabaseError, DatabaseErrorCodes } from './errors.js';

export class Database {
  constructor(db, options = {}) {
    this.db = db;
    this.options = {
      debug: options.debug || false,
      timeout: options.timeout || 5000,
      ...options
    };
  }

  /**
   * Execute a query with parameters
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<object>} Query result
   */
  async query(query, params = []) {
    try {
      if (this.options.debug) {
        console.log('DB Query:', query, params);
      }

      const stmt = this.db.prepare(query);
      const result = await stmt.bind(...params).run();
      
      return {
        success: result.success,
        meta: result.meta,
        results: result.results
      };
    } catch (error) {
      console.error('Database query error:', error);
      throw new DatabaseError(
        DatabaseErrorCodes.QUERY_FAILED,
        `Query failed: ${error.message}`,
        { query, params, originalError: error }
      );
    }
  }

  /**
   * Execute a query and return first result
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<object|null>} First result or null
   */
  async first(query, params = []) {
    const result = await this.query(query, params);
    return result.results?.[0] || null;
  }

  /**
   * Execute a query and return all results
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} All results
   */
  async all(query, params = []) {
    const result = await this.query(query, params);
    return result.results || [];
  }

  /**
   * Begin a transaction
   * @returns {Promise<Transaction>} Transaction object
   */
  async transaction() {
    return new Transaction(this.db);
  }

  /**
   * Get table info for migrations
   * @param {string} tableName - Table name
   * @returns {Promise<Array>} Column information
   */
  async getTableInfo(tableName) {
    return await this.all(`PRAGMA table_info(${tableName})`);
  }

  /**
   * Check if table exists
   * @param {string} tableName - Table name
   * @returns {Promise<boolean>} Table exists
   */
  async tableExists(tableName) {
    const result = await this.first(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    );
    return !!result;
  }
}

class Transaction {
  constructor(db) {
    this.db = db;
    this.queries = [];
  }

  add(query, params = []) {
    this.queries.push({ query, params });
    return this;
  }

  async execute() {
    try {
      const results = [];
      for (const { query, params } of this.queries) {
        const stmt = this.db.prepare(query);
        const result = await stmt.bind(...params).run();
        results.push(result);
      }
      return results;
    } catch (error) {
      throw new DatabaseError(
        DatabaseErrorCodes.TRANSACTION_FAILED,
        `Transaction failed: ${error.message}`,
        { originalError: error }
      );
    }
  }
}

// deadlight-core/src/db/models/user.js
// User model with role support for future mail system

export class UserModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new user
   * @param {object} userData - User data
   * @returns {Promise<object>} Created user
   */
  async create({ username, password, salt, role = 'user', email = null }) {
    const result = await this.db.query(
      `INSERT INTO users (username, password, salt, role, email, created_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [username, password, salt, role, email]
    );

    if (result.success) {
      return await this.findById(result.meta.last_row_id);
    }
    return null;
  }

  /**
   * Find user by ID
   * @param {number} id - User ID
   * @returns {Promise<object|null>} User or null
   */
  async findById(id) {
    return await this.db.first(
      'SELECT id, username, role, email, created_at FROM users WHERE id = ?',
      [id]
    );
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<object|null>} User or null
   */
  async findByUsername(username) {
    return await this.db.first(
      'SELECT id, username, password, salt, role, email, created_at FROM users WHERE username = ?',
      [username]
    );
  }

  /**
   * Find user by email (for mail system)
   * @param {string} email - Email address
   * @returns {Promise<object|null>} User or null
   */
  async findByEmail(email) {
    return await this.db.first(
      'SELECT id, username, role, email, created_at FROM users WHERE email = ?',
      [email]
    );
  }

  /**
   * Update user
   * @param {number} id - User ID
   * @param {object} updates - Fields to update
   * @returns {Promise<boolean>} Success
   */
  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const result = await this.db.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );

    return result.success;
  }

  /**
   * List users with pagination
   * @param {object} options - Query options
   * @returns {Promise<Array>} Users list
   */
  async list({ page = 1, limit = 10, role = null } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT id, username, role, email, created_at FROM users';
    let params = [];

    if (role) {
      query += ' WHERE role = ?';
      params.push(role);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await this.db.all(query, params);
  }

  /**
   * Delete user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} Success
   */
  async delete(id) {
    const result = await this.db.query('DELETE FROM users WHERE id = ?', [id]);
    return result.success;
  }
}

// deadlight-core/src/db/models/post.js
// Post model (can be reused for email messages)

export class PostModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new post
   * @param {object} postData - Post data
   * @returns {Promise<object>} Created post
   */
  async create({ title, content, userId, status = 'published', type = 'post' }) {
    const result = await this.db.query(
      `INSERT INTO posts (title, content, user_id, status, type, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [title, content, userId, status, type]
    );

    if (result.success) {
      return await this.findById(result.meta.last_row_id);
    }
    return null;
  }

  /**
   * Find post by ID
   * @param {number} id - Post ID
   * @returns {Promise<object|null>} Post or null
   */
  async findById(id) {
    return await this.db.first(`
      SELECT p.*, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `, [id]);
  }

  /**
   * List posts with pagination
   * @param {object} options - Query options
   * @returns {Promise<Array>} Posts list
   */
  async list({ page = 1, limit = 10, userId = null, status = 'published', type = 'post' } = {}) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT p.id, p.title, p.content, p.status, p.type, p.created_at, p.updated_at, u.username 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.status = ? AND p.type = ?
    `;
    let params = [status, type];

    if (userId) {
      query += ' AND p.user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await this.db.all(query, params);
  }

  /**
   * Update post
   * @param {number} id - Post ID
   * @param {object} updates - Fields to update
   * @returns {Promise<boolean>} Success
   */
  async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    const result = await this.db.query(
      `UPDATE posts SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...values, id]
    );

    return result.success;
  }

  /**
   * Delete post
   * @param {number} id - Post ID
   * @returns {Promise<boolean>} Success
   */
  async delete(id) {
    const result = await this.db.query('DELETE FROM posts WHERE id = ?', [id]);
    return result.success;
  }

  /**
   * Get post count for pagination
   * @param {object} filters - Count filters
   * @returns {Promise<number>} Total count
   */
  async count({ userId = null, status = 'published', type = 'post' } = {}) {
    let query = 'SELECT COUNT(*) as count FROM posts WHERE status = ? AND type = ?';
    let params = [status, type];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    const result = await this.db.first(query, params);
    return result?.count || 0;
  }
}

// deadlight-core/src/db/models/settings.js
// Settings model for configuration management

export class SettingsModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get a setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value
   */
  async get(key) {
    const setting = await this.db.first(
      'SELECT value, type FROM settings WHERE key = ?',
      [key]
    );

    if (!setting) return null;

    // Convert based on type
    switch (setting.type) {
      case 'number':
        return parseFloat(setting.value);
      case 'boolean':
        return setting.value === 'true';
      case 'json':
        return JSON.parse(setting.value);
      default:
        return setting.value;
    }
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @param {string} type - Value type
   * @returns {Promise<boolean>} Success
   */
  async set(key, value, type = 'string') {
    let stringValue = value;
    
    if (type === 'json') {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }

    const result = await this.db.query(`
      INSERT OR REPLACE INTO settings (key, value, type, updated_at) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [key, stringValue, type]);

    return result.success;
  }

  /**
   * Get all settings
   * @returns {Promise<object>} All settings as key-value pairs
   */
  async getAll() {
    const settings = await this.db.all('SELECT key, value, type FROM settings');
    const result = {};

    for (const setting of settings) {
      result[setting.key] = await this.get(setting.key);
    }

    return result;
  }

  /**
   * Delete a setting
   * @param {string} key - Setting key
   * @returns {Promise<boolean>} Success
   */
  async delete(key) {
    const result = await this.db.query('DELETE FROM settings WHERE key = ?', [key]);
    return result.success;
  }
}

// deadlight-core/src/db/errors.js
// Database error handling

export const DatabaseErrorCodes = {
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  QUERY_FAILED: 'QUERY_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  NOT_FOUND: 'NOT_FOUND'
};

export class DatabaseError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.details = details;
  }
}
