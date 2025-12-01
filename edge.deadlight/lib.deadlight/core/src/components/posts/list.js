// lib.deadlight/core/src/components/posts/list.js
import { MarkdownProcessor } from '../../markdown/index.js';
import { renderAuthorLink } from '../../utils/templates.js';

export class PostList {
  constructor(options = {}) {
    this.markdown = options.markdown || new MarkdownProcessor();
    this.showActions = options.showActions !== false;
    this.showAuthor = options.showAuthor !== false;
    this.showDate = options.showDate !== false;
    this.showKarma = options.showKarma !== false;
    this.showUpvote = options.showUpvote !== false; 
    this.excerptLength = options.excerptLength || 300;
  }
  
  renderMeta(post, options = {}) {
    const { user, csrfToken } = options;  
    const parts = [];
    
    if (this.showAuthor && post.author_username) {
      parts.push(`By ${renderAuthorLink(post.author_username)}`);
    }
    
    if (this.showDate && post.created_at) {
      parts.push(new Date(post.created_at).toLocaleDateString());
    }
    
    // Add karma display with upvote button
    if (this.showKarma && post.karma !== undefined) {
      const userReaction = post.user_reaction;
      
      const karmaDisplay = `
        <div class="karma-controls">
          ${user && csrfToken ? `
            <form method="POST" action="/api/posts/${post.id}/upvote" style="display: inline;">
              <input type="hidden" name="csrf_token" value="${csrfToken}">
              <button type="submit" class="karma-button ${userReaction === 'like' ? 'active' : ''}" title="Upvote">
                ↑
              </button>
            </form>
          ` : ''}
          <span class="karma-score">${post.karma || 0}</span>
        </div>
      `;
      parts.push(karmaDisplay);
    }
    
    return parts.length > 0 
      ? `<div class="post-meta">${parts.join(' | ')}</div>`
      : '';
  }

  render(posts = [], options = {}) {
    const { user = null, baseUrl = '', csrfToken = null } = options;
    
    if (posts.length === 0) {
      return '<p>No posts yet.</p>';
    }
    
    return posts.map(post => this.renderPost(post, { user, baseUrl, csrfToken })).join('\n');
  }

  renderPost(post, options = {}) {
    const { user, baseUrl = '', csrfToken } = options; 
    const excerpt = this.markdown.extractExcerpt(post.content, this.excerptLength);
    const hasMore = this.markdown.hasMore(post.content, this.excerptLength);
    
    return `
      <article class="post-preview">
        <h2><a href="${baseUrl}/post/${post.slug || post.id}">${post.title}</a></h2>
        ${this.renderMeta(post, { user, csrfToken })}
        <div class="post-excerpt">
          ${this.markdown.render(excerpt)}
        </div>
        <div class="post-footer">
          ${hasMore ? `<a href="${baseUrl}/post/${post.slug || post.id}" class="read-more">Read more →</a>` : ''}
          ${user && this.showActions ? this.renderActions(post, user, baseUrl) : ''}
        </div>
      </article>
    `;
  }

  renderActions(post, user, baseUrl = '') {
    if (!user || user.role !== 'admin') {
      return '';
    }

    return `
      <div class="post-actions">
        <a href="/admin/edit/${post.id}" class="edit-button button button-sm">Edit</a>
        <a href="/admin/delete/${post.id}" class="delete-button button button-sm">Delete</a>
      </div>
    `;
  }
}