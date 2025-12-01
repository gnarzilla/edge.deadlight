// lib.deadlight/core/src/markdown/processor.js
import { marked } from 'marked';
import { filterXSS } from 'xss';

export class MarkdownProcessor {
  constructor(options = {}) {
    this.options = {
      gfm: true,
      breaks: true,
      headerIds: false,
      mangle: false,
      ...options
    };
    
    this.xssOptions = options.xssOptions || {
      whiteList: {
        h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
        p: [], br: [], hr: [],
        a: ['href', 'title', 'target', 'rel'],
        strong: [], em: [], del: [],
        ul: [], ol: [], li: [],
        code: ['class'], 
        pre: [],
        blockquote: [],
        table: [], thead: [], tbody: [], tr: [], th: [], td: []
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    };

    this.setupRenderer();
  }

  setupRenderer() {
    marked.setOptions(this.options);
    
    this.renderer = new marked.Renderer();
    
    // Fixed code renderer - handle the marked token properly
    this.renderer.code = (code, language, isEscaped) => {
      // If code is an object (marked v4+ token), extract the text
      const codeText = typeof code === 'object' && code !== null ? code.text : code;
      const codeString = String(codeText || '');
      const lang = language || '';
      
      // Only escape if not already escaped
      const escapedCode = isEscaped ? codeString : codeString
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      return `<pre><code class="language-${lang}">${escapedCode}</code></pre>`;
    };
    
    marked.use({ renderer: this.renderer });
  }

  render(content) {
    try {
      const html = marked(content);
      return filterXSS(html, this.xssOptions);
    } catch (error) {
      console.error('Markdown rendering error:', error);
      return content;
    }
  }

  stripContent(content) {
    return content
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.+?)\*/g, '$1') // Remove italic
      .replace(/$$(.*?)$$$(.*?)$/g, '$1') // Remove links, keep text
      .replace(/`(.+?)`/g, '$1') // Remove inline code
      .trim();
  }

  // Refined excerpt extraction with intra-paragraph truncation
  extractExcerpt(content, maxLength = 300) {
    // Check for manual excerpt marker first
    const moreIndex = content.indexOf('<!--more-->');
    if (moreIndex !== -1) {
      return content.substring(0, moreIndex).trim();
    }
    
    // Split into sections, avoiding code blocks
    const sections = [];
    const lines = content.split('\n');
    let insideCodeBlock = false;
    let currentSection = [];
    
    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        if (insideCodeBlock) {
          insideCodeBlock = false;
          if (currentSection.length > 0) {
            sections.push(currentSection.join('\n'));
          }
        } else {
          insideCodeBlock = true;
          if (currentSection.length > 0) {
            sections.push(currentSection.join('\n'));
            break; // Stop at first code block for excerpt
          }
        }
      } else if (!insideCodeBlock) {
        currentSection.push(line);
      }
    }
    
    if (currentSection.length > 0 && !insideCodeBlock) {
      sections.push(currentSection.join('\n'));
    }
    
    // Join sections and split into paragraphs
    let fullText = sections.join('\n\n').trim();
    const paragraphs = fullText.split('\n\n').filter(p => p.trim());
    
    let excerptParagraphs = [];
    let currentLength = 0;
    
    for (const paragraph of paragraphs) {
      const textLength = this.stripContent(paragraph).length;
      const remaining = maxLength - currentLength;
      
      if (remaining <= 0) {
        break;
      }
      
      if (textLength <= remaining) {
        excerptParagraphs.push(paragraph);
        currentLength += textLength;
      } else {
        // Truncate this paragraph
        let rawSoFar = '';
        for (let i = 0; i < paragraph.length; i++) {
          rawSoFar += paragraph[i];
          const strippedSoFarLength = this.stripContent(rawSoFar).length;
          if (strippedSoFarLength >= remaining) {
            break;
          }
        }
        // Cut at last space for word boundary
        const cutAt = rawSoFar.lastIndexOf(' ');
        if (cutAt > 0) {
          rawSoFar = rawSoFar.substring(0, cutAt) + '...';
        } else {
          rawSoFar += '...';
        }
        excerptParagraphs.push(rawSoFar);
        break;
      }
    }
    
    let excerpt = excerptParagraphs.join('\n\n').trim();
    
    // Add ellipsis if truncated
    if (excerptParagraphs.length < paragraphs.length || content.length > maxLength) {
      if (!excerpt.endsWith('...')) {
        excerpt += '\n\n...';
      }
    }
    
    return excerpt || 'Read more...'; // Fallback if no content
  }

  hasMore(content, maxLength = 300) {
    if (content.includes('```') || content.includes('<!--more-->')) {
      return true;
    }
    
    const textLength = this.stripContent(content
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks for length check
    ).length;
    
    return textLength > maxLength * 2;
  }
}

// Export singleton for backward compatibility
export const defaultProcessor = new MarkdownProcessor();

// Legacy function for easy migration
export function renderMarkdown(content) {
  return defaultProcessor.render(content);
}