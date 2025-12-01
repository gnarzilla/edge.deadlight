// lib.deadlight/core/src/db/models/settings.js
import { BaseModel, DatabaseError } from '../base.js';

export class SettingsModel extends BaseModel {
  async get(key, defaultValue = null) {
    try {
      const result = await this.queryFirst('SELECT value, type FROM settings WHERE key = ?', [key]);
      if (!result) return defaultValue;
      
      return this.convertValue(result.value, result.type);
    } catch (error) {
      throw new DatabaseError(`Failed to get setting ${key}: ${error.message}`, 'GET_ERROR');
    }
  }

  async getAll() {
    try {
      const result = await this.query('SELECT key, value, type FROM settings ORDER BY key');
      const results = result.results || result;
      
      const settings = {};
      results.forEach(row => {
        settings[row.key] = this.convertValue(row.value, row.type);
      });
      
      return settings;
    } catch (error) {
      throw new DatabaseError(`Failed to get all settings: ${error.message}`, 'GET_ALL_ERROR');
    }
  }

  async set(key, value, type = 'string') {
    try {
      const stringValue = String(value);
      await this.execute(
        'INSERT OR REPLACE INTO settings (key, value, type, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
        [key, stringValue, type]
      );
      
      return { key, value, type };
    } catch (error) {
      throw new DatabaseError(`Failed to set setting ${key}: ${error.message}`, 'SET_ERROR');
    }
  }

  async delete(key) {
    try {
      const result = await this.execute('DELETE FROM settings WHERE key = ?', [key]);
      if (result.changes === 0) {
        throw new DatabaseError('Setting not found', 'NOT_FOUND');
      }
      return { success: true };
    } catch (error) {
      throw new DatabaseError(`Failed to delete setting ${key}: ${error.message}`, 'DELETE_ERROR');
    }
  }

  // Added method for getting multiple settings efficiently
  async getMany(keys) {
    try {
      const placeholders = keys.map(() => '?').join(',');
      const result = await this.query(
        `SELECT key, value, type FROM settings WHERE key IN (${placeholders})`,
        keys
      );
      const results = result.results || result;
      
      const settings = {};
      results.forEach(row => {
        settings[row.key] = this.convertValue(row.value, row.type);
      });
      
      return settings;
    } catch (error) {
      throw new DatabaseError(`Failed to get multiple settings: ${error.message}`, 'GET_MANY_ERROR');
    }
  }

  convertValue(value, type) {
    switch (type) {
      case 'number': return parseInt(value);
      case 'boolean': return value === 'true';
      case 'float': return parseFloat(value);
      default: return value;
    }
  }
}