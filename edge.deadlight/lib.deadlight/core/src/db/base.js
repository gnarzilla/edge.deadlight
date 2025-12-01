// core/src/db/base.js

// Add the DatabaseError class definition
export class DatabaseError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
  }
}

// Then the BaseModel class
export class BaseModel {
  constructor(db) {
    this.db = db;
  }

  async query(sql, params = []) {
    try {
      const stmt = params.length === 0
        ? this.db.prepare(sql)
        : this.db.prepare(sql).bind(...params);

      const result = await stmt.all();

      // D1 returns { results: [...], success: true, meta: {...} }
      // Extract just the results array
      return result.results || result;
    } catch (error) {
      throw new DatabaseError(`Query failed: ${error.message}`, 'QUERY_ERROR');
    }
  }

  async queryFirst(sql, params = []) {
    try {
      const stmt = params.length === 0
        ? this.db.prepare(sql)
        : this.db.prepare(sql).bind(...params);

      const result = await stmt.first();

      // first() returns the row directly, not wrapped
      return result;
    } catch (error) {
      throw new DatabaseError(`Query failed: ${error.message}`, 'QUERY_ERROR');
    }
  }

  async execute(sql, params = []) {
    try {
      const stmt = params.length === 0
        ? this.db.prepare(sql)
        : this.db.prepare(sql).bind(...params);

      const result = await stmt.run();

      // run() returns the full result object with meta
      return result;
    } catch (error) {
      throw new DatabaseError(`Execute failed: ${error.message}`, 'EXECUTE_ERROR');
    }
  }
}