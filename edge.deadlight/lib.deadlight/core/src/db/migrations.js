// deadlight-core/src/db/migrations.js
// Database migration system for schema evolution

export const migrations = {
  // Version 1: Base blog schema
  '001_initial_schema': {
    up: async (db) => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          salt TEXT NOT NULL,
          role TEXT DEFAULT 'user',
          email TEXT UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          status TEXT DEFAULT 'published',
          type TEXT DEFAULT 'post',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      await db.query(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          type TEXT DEFAULT 'string',
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await db.query(`
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
          error TEXT
        )
      `);

      // Insert default settings
      await db.query(`
        INSERT OR IGNORE INTO settings (key, value, type) VALUES 
        ('site_title', 'Deadlight', 'string'),
        ('site_description', 'A minimal blog framework', 'string'),
        ('posts_per_page', '10', 'number'),
        ('date_format', 'M/D/YYYY', 'string'),
        ('timezone', 'UTC', 'string'),
        ('enable_registration', 'false', 'boolean'),
        ('require_login_to_read', 'false', 'boolean'),
        ('maintenance_mode', 'false', 'boolean')
      `);
    },
    down: async (db) => {
      await db.query('DROP TABLE IF EXISTS request_logs');
      await db.query('DROP TABLE IF EXISTS settings');
      await db.query('DROP TABLE IF EXISTS posts');
      await db.query('DROP TABLE IF EXISTS users');
    }
  },

  // Version 2: Mail system extensions
  '002_mail_system': {
    up: async (db) => {
      // Add mail-specific columns to users
      await db.query(`
        ALTER TABLE users ADD COLUMN public_key TEXT
      `);
      
      await db.query(`
        ALTER TABLE users ADD COLUMN mail_quota INTEGER DEFAULT 1073741824
      `); // 1GB default

      // Create mail domains table
      await db.query(`
        CREATE TABLE IF NOT EXISTS mail_domains (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          domain TEXT UNIQUE NOT NULL,
          is_local BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create mail aliases table
      await db.query(`
        CREATE TABLE IF NOT EXISTS mail_aliases (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          alias TEXT NOT NULL,
          user_id INTEGER NOT NULL,
          domain_id INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (domain_id) REFERENCES mail_domains(id) ON DELETE CASCADE,
          UNIQUE(alias, domain_id)
        )
      `);

      // Extend posts table for mail messages
      await db.query(`
        ALTER TABLE posts ADD COLUMN recipient_id INTEGER
      `);
      
      await db.query(`
        ALTER TABLE posts ADD COLUMN message_id TEXT
      `);
      
      await db.query(`
        ALTER TABLE posts ADD COLUMN in_reply_to TEXT
      `);
      
      await db.query(`
        ALTER TABLE posts ADD COLUMN encrypted_content TEXT
      `);

      // Add mail-specific settings
      await db.query(`
        INSERT OR IGNORE INTO settings (key, value, type) VALUES 
        ('mail_enabled', 'false', 'boolean'),
        ('mail_domain', 'localhost', 'string'),
        ('smtp_host', 'localhost', 'string'),
        ('smtp_port', '587', 'number'),
        ('imap_host', 'localhost', 'string'),
        ('imap_port', '993', 'number'),
        ('mail_encryption', 'true', 'boolean'),
        ('max_message_size', '26214400', 'number')
      `);
    },
    down: async (db) => {
      // This is tricky with SQLite - it doesn't support DROP COLUMN
      // In production, you'd need to recreate tables
      await db.query('DROP TABLE IF EXISTS mail_aliases');
      await db.query('DROP TABLE IF EXISTS mail_domains');
    }
  },

  // Version 3: Enhanced logging and monitoring
  '003_enhanced_logging': {
    up: async (db) => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS mail_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          event_type TEXT NOT NULL,
          from_address TEXT,
          to_address TEXT,
          message_id TEXT,
          status TEXT NOT NULL,
          error_message TEXT,
          ip_address TEXT,
          user_agent TEXT
        )
      `);

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_mail_logs_timestamp ON mail_logs(timestamp)
      `);
      
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_mail_logs_message_id ON mail_logs(message_id)
      `);
    },
    down: async (db) => {
      await db.query('DROP TABLE IF EXISTS mail_logs');
    }
  }
};

// Migration runner
export class MigrationRunner {
  constructor(db) {
    this.db = db;
  }

  async initialize() {
    // Create migrations table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations() {
    const results = await this.db.all(
      'SELECT version FROM migrations ORDER BY applied_at'
    );
    return results.map(r => r.version);
  }

  async applyMigration(version) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    try {
      console.log(`Applying migration: ${version}`);
      await migration.up(this.db);
      
      await this.db.query(
        'INSERT INTO migrations (version) VALUES (?)',
        [version]
      );
      
      console.log(`Migration ${version} applied successfully`);
    } catch (error) {
      console.error(`Failed to apply migration ${version}:`, error);
      throw error;
    }
  }

  async rollbackMigration(version) {
    const migration = migrations[version];
    if (!migration || !migration.down) {
      throw new Error(`Cannot rollback migration ${version}`);
    }

    try {
      console.log(`Rolling back migration: ${version}`);
      await migration.down(this.db);
      
      await this.db.query(
        'DELETE FROM migrations WHERE version = ?',
        [version]
      );
      
      console.log(`Migration ${version} rolled back successfully`);
    } catch (error) {
      console.error(`Failed to rollback migration ${version}:`, error);
      throw error;
    }
  }

  async migrate() {
    await this.initialize();
    
    const applied = await this.getAppliedMigrations();
    const available = Object.keys(migrations).sort();
    
    for (const version of available) {
      if (!applied.includes(version)) {
        await this.applyMigration(version);
      }
    }
    
    console.log('All migrations applied successfully');
  }

  async status() {
    await this.initialize();
    
    const applied = await this.getAppliedMigrations();
    const available = Object.keys(migrations).sort();
    
    console.log('Migration Status:');
    for (const version of available) {
      const status = applied.includes(version) ? '✓ Applied' : '✗ Pending';
      console.log(`  ${version}: ${status}`);
    }
    
    return {
      applied: applied.length,
      pending: available.length - applied.length,
      total: available.length
    };
  }
}

// deadlight-core/src/db/models/log.js
// Enhanced logging model

export class LogModel {
  constructor(db) {
    this.db = db;
  }

  /**
   * Log a request
   * @param {object} logData - Log data
   * @returns {Promise<boolean>} Success
   */
  async logRequest({
    path,
    method,
    duration,
    statusCode,
    userAgent = null,
    ip = null,
    referer = null,
    country = null,
    error = null
  }) {
    const result = await this.db.query(`
      INSERT INTO request_logs 
      (path, method, duration, status_code, user_agent, ip, referer, country, error) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [path, method, duration, statusCode, userAgent, ip, referer, country, error]);

    return result.success;
  }

  /**
   * Log a mail event
   * @param {object} mailData - Mail log data
   * @returns {Promise<boolean>} Success
   */
  async logMailEvent({
    eventType,
    fromAddress = null,
    toAddress = null,
    messageId = null,
    status,
    errorMessage = null,
    ipAddress = null,
    userAgent = null
  }) {
    const result = await this.db.query(`
      INSERT INTO mail_logs 
      (event_type, from_address, to_address, message_id, status, error_message, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [eventType, fromAddress, toAddress, messageId, status, errorMessage, ipAddress, userAgent]);

    return result.success;
  }

  /**
   * Get request logs with pagination
   * @param {object} options - Query options
   * @returns {Promise<Array>} Log entries
   */
  async getRequestLogs({ page = 1, limit = 50, startDate = null, endDate = null } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM request_logs';
    let params = [];

    if (startDate || endDate) {
      const conditions = [];
      if (startDate) {
        conditions.push('timestamp >= ?');
        params.push(startDate);
      }
      if (endDate) {
        conditions.push('timestamp <= ?');
        params.push(endDate);
      }
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await this.db.all(query, params);
  }

  /**
   * Get mail logs with pagination
   * @param {object} options - Query options
   * @returns {Promise<Array>} Mail log entries
   */
  async getMailLogs({ page = 1, limit = 50, eventType = null, status = null } = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM mail_logs';
    let params = [];

    const conditions = [];
    if (eventType) {
      conditions.push('event_type = ?');
      params.push(eventType);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return await this.db.all(query, params);
  }

  /**
   * Get log statistics
   * @param {string} timeframe - Timeframe for stats (24h, 7d, 30d)
   * @returns {Promise<object>} Statistics
   */
  async getStats(timeframe = '24h') {
    const timeMap = {
      '24h': '24 hours',
      '7d': '7 days', 
      '30d': '30 days'
    };

    const interval = timeMap[timeframe] || '24 hours';

    const requestStats = await this.db.first(`
      SELECT 
        COUNT(*) as total_requests,
        AVG(duration) as avg_duration,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
      FROM request_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
    `);

    const mailStats = await this.db.first(`
      SELECT 
        COUNT(*) as total_mail_events,
        COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_mails,
        COUNT(CASE WHEN status = 'error' THEN 1 END) as failed_mails
      FROM mail_logs 
      WHERE timestamp >= datetime('now', '-${interval}')
    `);

    return {
      timeframe,
      requests: requestStats || { total_requests: 0, avg_duration: 0, error_count: 0 },
      mail: mailStats || { total_mail_events: 0, successful_mails: 0, failed_mails: 0 }
    };
  }
}
