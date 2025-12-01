# lib.deadlight - Shared Library for the Deadlight Ecosystem

A modular, edge-native library providing authentication, database models, UI components, and core utilities for the Deadlight ecosystem of applications.


### Table of Contents
1.  [Overview](#overview)
2.  [Current Status](#current-status)
3.  [Features](#core-features)
4.  [Architecture](#architecture)
6.  [Installation](#installation)
7.  [Usage Examples](#usage-examples)
8.  [Roadmap](#roadmap)
9.  [License](#license)
10.  [Documentation](#detailed-documentation) 

---

##  Overview

lib.deadlight is the foundational shared library that powers the entire Deadlight ecosystem, including:
- **blog.deadlight** - Minimalist blog platform
- **comm.deadlight** - Communications suite (email client)
- **proxy.deadlight** - Email proxy and API server

Built for Cloudflare Workers, this library ensures consistency, security, and code reuse across all Deadlight applications.

## Current Status

Production-Ready Modules

####  **Authentication (`/core/src/auth/`)**
- JWT token generation and validation
- Secure password hashing with salt
- User session management
- Role-based access control

####  **Database (`/core/src/db/`)**
- Base model class with error handling
- D1 database integration
- Models: User, Post, Settings
- Migration support

####  **Logging (`/core/src/logging/`)**
- Structured logging with contexts
- Multiple log levels
- Cloudflare Workers compatible

####  **Markdown Processing (`/core/src/markdown/`)**
- Full markdown support with marked.js
- XSS protection via sanitization
- Custom excerpt extraction
- Manual excerpt markers (`<!--more-->`)

####  **Components (`/core/src/components/`)**
- **Posts**: List view, pagination, containers
- Reusable across blog and email contexts
- Theme-aware styling

##  Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lib.deadlight.git
cd lib.deadlight

# Install dependencies
npm install
```

### Using in Your Project

```bash
# Link locally for development
cd lib.deadlight
npm link

cd ../your-project
npm link @deadlight/core
```

##  Usage Examples

### Authentication
```javascript
import { createJWT, verifyJWT } from '@deadlight/core/auth';
import { UserModel } from '@deadlight/core/db/models';

// Create a user
const userModel = new UserModel(env.DB);
const user = await userModel.create({
  username: 'admin',
  password: 'secure-password',
  role: 'admin'
});

// Generate JWT
const token = await createJWT(
  { id: user.id, username: user.username },
  env.JWT_SECRET
);

// Verify token
const payload = await verifyJWT(token, env.JWT_SECRET);
```

### Database Models
```javascript
import { PostModel } from '@deadlight/core/db/models';

const postModel = new PostModel(env.DB);

// Create a post
const post = await postModel.create({
  title: 'Hello World',
  content: 'This is my first post',
  userId: 1
});

// Get paginated posts
const { posts, pagination } = await postModel.getPaginated({
  page: 1,
  limit: 10,
  includeAuthor: true
});
```

### Markdown Processing
```javascript
import { MarkdownProcessor } from '@deadlight/core/markdown';

const processor = new MarkdownProcessor();

// Render markdown to HTML
const html = await processor.render('# Hello World\n\nThis is **bold**');

// Extract excerpt
const excerpt = processor.extractExcerpt(content, 200);
```

### Components
```javascript
import { PostList, Pagination } from '@deadlight/core/components/posts';

const postList = new PostList({
  showAuthor: true,
  showDate: true
});

const html = postList.render(posts, { user });
```

##  Architecture

```
lib.deadlight/
├── core/src/
│   ├── auth/               # Authentication & authorization
│   ├── db/                 # Database models & base classes
│   ├── logging/            # Structured logging
│   ├── markdown/           # Markdown processing
│   └── components/         # Reusable UI components
│       └── posts/          # Post/content components
```

##  Roadmap

### Phase 1: Security Hardening (Next Priority)
- [ ] Rate limiting middleware
- [ ] CSRF protection
- [ ] Security headers
- [ ] Input validation utilities

### Phase 2: Communication Components
- [ ] Message containers (email rendering)
- [ ] Thread view components
- [ ] Attachment handling
- [ ] Contact/address book components

### Phase 3: Enhanced Authentication
- [ ] Multi-device session management
- [ ] Single Sign-On (SSO) across apps
- [ ] Two-factor authentication
- [ ] OAuth provider support

### Phase 4: Infrastructure
- [ ] Service discovery
- [ ] Event bus for inter-app communication
- [ ] Shared configuration management
- [ ] Health check endpoints

### Future Considerations
- [ ] WebSocket support for real-time features
- [ ] Internationalization (i18n)
- [ ] Theme system with CSS-in-JS
- [ ] GraphQL schema generation from models
- [ ] Automated testing framework

##  Development

### Prerequisites
- Node.js 16+
- Cloudflare account
- Wrangler CLI

##  Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Follow the existing code style
4. Add tests for new features
5. Submit a pull request

##  License

MIT License - See LICENSE file for details

---

**Note:** This library is actively under development. While core modules are production-ready, new features are being added regularly. Check the commit history for the latest updates.

For questions or support, please open an issue on GitHub.
