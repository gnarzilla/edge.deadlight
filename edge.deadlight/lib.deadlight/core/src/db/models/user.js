// core/src/db/models/user.js
import { BaseModel, DatabaseError } from '../base.js';
import { hashPassword, verifyPassword } from '../../auth/index.js';

export class UserModel extends BaseModel {
  async create({ username, password, role = 'user' }) {
    try {
      // Check if user already exists
      const existing = await this.queryFirst(
        'SELECT id FROM users WHERE username = ?', 
        [username]
      );
      
      if (existing) {
        throw new DatabaseError('Username already exists', 'DUPLICATE_USER');
      }

      // Hash password
      const { hash, salt } = await hashPassword(password);

      // Insert user
      const result = await this.execute(
        'INSERT INTO users (username, password, salt, role, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [username, hash, salt, role]
      );

      // Return created user (without password/salt)
      return await this.getById(result.meta.last_row_id);
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError(`Failed to create user: ${error.message}`, 'CREATE_ERROR');
    }
  }

  async getById(id) {
    const user = await this.queryFirst(
      'SELECT id, username, role, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
    return user;
  }

  async getByUsername(username) {
    const user = await this.queryFirst(
      'SELECT id, username, role, created_at, last_login FROM users WHERE username = ?',
      [username]
    );
    return user;
  }

  async authenticate(username, password) {
    try {
      // Get user with password/salt for verification
      const user = await this.queryFirst(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );
      
      if (!user) {
        return { success: false, error: 'USER_NOT_FOUND' };
      }

      const isValid = await verifyPassword(password, user.password, user.salt);
      
      if (!isValid) {
        return { success: false, error: 'INVALID_PASSWORD' };
      }

      // Return user without sensitive data
      const { password: _, salt: __, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch (error) {
      return { success: false, error: 'DATABASE_ERROR', details: error.message };
    }
  }

  async updateLastLogin(userId) {
    return await this.execute(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [userId]
    );
  }

  async changePassword(userId, newPassword) {
    const { hash, salt } = await hashPassword(newPassword);
    return await this.execute(
      'UPDATE users SET password = ?, salt = ? WHERE id = ?',
      [hash, salt, userId]
    );
  }

  async delete(userId) {
    return await this.execute('DELETE FROM users WHERE id = ?', [userId]);
  }

  async list({ limit = 50, offset = 0 } = {}) {
    return await this.query(
      'SELECT id, username, role, created_at, last_login FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );
  }

  async count() {
    const result = await this.queryFirst('SELECT COUNT(*) as total FROM users');
    return result.total;
  }
}
