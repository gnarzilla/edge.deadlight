// core/src/db/models/post.js
import { BaseModel, DatabaseError } from '../base.js';

export class PostModel extends BaseModel {
  // Helper to generate slug from title
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
  }

  async create({ title, content, slug, excerpt, author_id, published = false, visibility = 'public' }) {
    try {
      // Generate slug if not provided
      const finalSlug = slug || this.generateSlug(title);
      
      // Check if slug already exists
      const existing = await this.queryFirst('SELECT id FROM posts WHERE slug = ?', [finalSlug]);
      if (existing) {
        // Append timestamp to make it unique
        const uniqueSlug = `${finalSlug}-${Date.now()}`;
        return this.create({ title, content, slug: uniqueSlug, excerpt, author_id, published, visibility });
      }
      
      const result = await this.execute(
        'INSERT INTO posts (title, content, slug, excerpt, author_id, published, created_at, updated_at, visibility) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?)',
        [title, content, finalSlug, excerpt || null, author_id, published ? 1 : 0, visibility]  // ← Add visibility here
      );

      return await this.getById(result.meta.last_row_id);
    } catch (error) {
      throw new DatabaseError(`Failed to create post: ${error.message}`, 'CREATE_ERROR');
    }
  }
  async getById(id, options = {}) {
    let query = 'SELECT posts.*';
    if (options.includeAuthor) {
      query += ', users.username as author_username';
    }
    query += ' FROM posts';
    if (options.includeAuthor) {
      query += ' LEFT JOIN users ON posts.author_id = users.id';
    }
    query += ' WHERE posts.id = ?';
    
    return await this.queryFirst(query, [id]);
  }

  async getBySlug(slug, options = {}) {
    let query = 'SELECT posts.*';
    if (options.includeAuthor) {
      query += ', users.username as author_username';
    }
    query += ' FROM posts';
    if (options.includeAuthor) {
      query += ' LEFT JOIN users ON posts.author_id = users.id';
    }
    query += ' WHERE posts.slug = ?';
    
    return await this.queryFirst(query, [slug]);
  }

  async update(id, { title, content, slug, excerpt, published, visibility, pinned }) {
    try {
      let updates = [];
      let values = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (content !== undefined) {
        updates.push('content = ?');
        values.push(content);
      }
      if (slug !== undefined) {
        // Generate new slug if title changed and slug is empty
        const finalSlug = slug || this.generateSlug(title);
        // Add unique check logic here if necessary
        updates.push('slug = ?');
        values.push(finalSlug);
      }
      if (excerpt !== undefined) {
        updates.push('excerpt = ?');
        values.push(excerpt);
      }
      if (published !== undefined) {
        updates.push('published = ?');
        values.push(published ? 1 : 0);
      }
      
      // Visibility update
      if (visibility !== undefined) {
        updates.push('visibility = ?');
        values.push(visibility);
      }

      // Pinned update (for future implementation)
      if (pinned !== undefined) {
        updates.push('pinned = ?');
        values.push(pinned ? 1 : 0);
      }

      if (updates.length === 0) {
        return await this.getById(id);
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');

      const updateQuery = `UPDATE posts SET ${updates.join(', ')} WHERE id = ?`;
      values.push(id);

      await this.execute(updateQuery, values);

      return await this.getById(id);
    } catch (error) {
      throw new DatabaseError(`Failed to update post: ${error.message}`);
    }
  }

  async delete(id) {
    const result = await this.execute('DELETE FROM posts WHERE id = ?', [id]);
    
    if (result.changes === 0) {
      throw new DatabaseError('Post not found', 'NOT_FOUND');
    }
    
    return { success: true };
  }

  async getPaginated(options = {}) {
    const { 
      page = 1,
      limit = 10,
      publishedOnly = true, 
      postType = 'blog', 
      visibility = 'public',
      authorId = null,
      tagId = null,
      orderBy = 'created_at',
      orderDirection = 'DESC',
      includeAuthor = false
    } = options;

    const offset = (page - 1) * limit;

    let whereClauses = [];
    let values = [];

    // Base filters
    if (publishedOnly) {
      whereClauses.push('posts.published = 1');
    }
    whereClauses.push('posts.post_type = ?');
    values.push(postType);
    
    // Visibility filter
    if (visibility) {
      whereClauses.push('posts.visibility = ?');
      values.push(visibility);
    }
    
    // Author filter
    if (authorId) {
      whereClauses.push('posts.author_id = ?');
      values.push(authorId);
    }

    // Tag filtering
    let joins = '';
    if (tagId) {
      joins += ' LEFT JOIN post_tags ON posts.id = post_tags.post_id';
      whereClauses.push('post_tags.tag_id = ?');
      values.push(tagId);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Build ORDER BY clause
    let orderByClause;
    if (orderBy === 'karma') {
      orderByClause = `(
        SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'like'
      ) - (
        SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'dislike'
      ) ${orderDirection}`;
    } else {
      // Sanitize column name to prevent SQL injection
      const allowedColumns = ['created_at', 'updated_at', 'title', 'id'];
      const safeOrderBy = allowedColumns.includes(orderBy) ? orderBy : 'created_at';
      orderByClause = `posts.${safeOrderBy} ${orderDirection}`;
    }

    // Build SELECT clause
    let selectClause = 'posts.*';
    if (includeAuthor) {
      selectClause += ', users.username as author_username';
    }
    selectClause += `, (
      SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'like'
    ) - (
      SELECT COUNT(*) FROM post_reactions WHERE post_id = posts.id AND reaction = 'dislike'
    ) AS karma`;

    const query = `
      SELECT ${selectClause}
      FROM posts
      ${includeAuthor ? 'LEFT JOIN users ON posts.author_id = users.id' : ''}
      ${joins}
      ${whereString}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?
    `;

    values.push(limit, offset);

    const posts = await this.query(query, values);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT posts.id) as total 
      FROM posts
      ${joins}
      ${whereString}
    `;
    const countResult = await this.queryFirst(countQuery, values.slice(0, -2));

    return {
      posts,
      totalCount: countResult.total,
      currentPage: page,
      totalPages: Math.ceil(countResult.total / limit),
      hasNextPage: page < Math.ceil(countResult.total / limit),
      hasPrevPage: page > 1
    };
  }

  async list({ limit = 10, offset = 0, orderBy = 'created_at', orderDirection = 'DESC', includeAuthor = false, publishedOnly = false } = {}) {
    const page = Math.floor(offset / limit) + 1;
    
    const result = await this.getPaginated({
      page,
      limit,
      includeAuthor,
      orderBy,
      orderDirection,
      publishedOnly
    });
    
    return result.posts;
  }

  async getNavigation(currentId, publishedOnly = true) {
    const whereClause = publishedOnly ? ' AND published = 1' : '';
    
    return await this.queryFirst(`
      SELECT 
        (SELECT id FROM posts WHERE id < ?${whereClause} ORDER BY id DESC LIMIT 1) as prev_id,
        (SELECT title FROM posts WHERE id < ?${whereClause} ORDER BY id DESC LIMIT 1) as prev_title,
        (SELECT slug FROM posts WHERE id < ?${whereClause} ORDER BY id DESC LIMIT 1) as prev_slug,
        (SELECT id FROM posts WHERE id > ?${whereClause} ORDER BY id ASC LIMIT 1) as next_id,
        (SELECT title FROM posts WHERE id > ?${whereClause} ORDER BY id ASC LIMIT 1) as next_title,
        (SELECT slug FROM posts WHERE id > ?${whereClause} ORDER BY id ASC LIMIT 1) as next_slug
    `, [currentId, currentId, currentId, currentId, currentId, currentId]);
  }

  async getByAuthorId(authorId, options = {}) {
    const { limit = 50, offset = 0, publishedOnly = false } = options;
    
    let query = 'SELECT posts.*';
    if (options.includeAuthor) {
      query += ', users.username as author_username';
    }
    query += ' FROM posts';
    if (options.includeAuthor) {
      query += ' LEFT JOIN users ON posts.author_id = users.id';
    }
    query += ' WHERE posts.author_id = ?';
    if (publishedOnly) {
      query += ' AND posts.published = 1';
    }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    return await this.query(query, [authorId, limit, offset]);
  }

  async count(publishedOnly = false) {
    const whereClause = publishedOnly ? ' WHERE published = 1' : '';
    const result = await this.queryFirst(`SELECT COUNT(*) as total FROM posts${whereClause}`);
    return result.total;
  }

  async countToday() {
    const result = await this.queryFirst(`
      SELECT COUNT(*) as total 
      FROM posts 
      WHERE date(created_at) = date('now')
    `);
    return result.total || 0;
  }

  async togglePublished(id) {
    const result = await this.execute(
      'UPDATE posts SET published = NOT published, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );
    
    if (result.changes === 0) {
      throw new DatabaseError('Post not found', 'NOT_FOUND');
    }
    
    return await this.getById(id);
  }

  async recordReaction(postId, userId, reaction) {
    if (reaction !== 'like' && reaction !== 'dislike') {
      throw new Error('Invalid reaction type.');
    }
    
    // Remove existing reaction if the user is submitting the opposite reaction,
    // or if the user clicks the same reaction twice (to toggle it off).
    const existing = await this.queryFirst(
      'SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?', 
      [postId, userId]
    );

    if (existing && existing.reaction === reaction) {
        // User is toggling their existing vote off
        await this.execute(
            'DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?',
            [postId, userId]
        );
    } else {
        // User is voting (inserting new or replacing opposite)
        await this.execute(
            'INSERT OR REPLACE INTO post_reactions (post_id, user_id, reaction, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
            [postId, userId, reaction]
        );
    }
    return this.getKarma(postId);
  }

  /**
   * Computes the current karma score for a single post.
   * @param {number} postId
   * @returns {number} The karma score (likes - dislikes)
   */
  async getKarma(postId) {
    const result = await this.queryFirst(`
      SELECT 
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'like') - 
        (SELECT COUNT(*) FROM post_reactions WHERE post_id = ? AND reaction = 'dislike') AS karma
    `, [postId, postId]);
    
    return result.karma || 0;
  }
}