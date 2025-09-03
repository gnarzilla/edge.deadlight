# Deadlight Edge Platform — Modular, Secure Web + Network Infrastructure

A security-hardened edge platform that combines a modular static/dynamic site framework with integrated multi-protocol proxy server management. Built for performance, privacy, and scalability using Cloudflare Workers and lightweight containerized services.

---

### Table of Contents
1.  [Overview](#overview)
2.  [Current Status](#current-status)
3.  [Features](#core-features)
4.  [Architecture](#architecture)
5.  [Security Model](#security-model)
6.  [Deployment](#deployment)
7.  [Monitoring & Observability](#Monitoring)
8.  [Roadmap](#roadmap)
9.  [License](#license)
10.  [Documentation](#detailed-documentation) 

---

### Overview
The Deadlight Edge Platform is an edge-native application framework that merges:

* **Blog / CMS Layer:** A static-first, markdown-driven content engine with optional dynamic features, deployed at the edge for minimal latency.
* **Proxy Management Layer:** A real-time, multi-protocol proxy server controller with per-session, per-route configuration.
* **lib.deadlight Shared Library:** A modular, edge-native library providing authentication, database models, UI components, and core utilities for the Deadlight ecosystem of applications
* **Unified Deployment Pipeline:** CI/CD and configuration tooling optimized for Cloudflare Workers and container environments.
* **Security by Default:** Strong isolation between content, application logic, and network-level routing.

The goal: A single, self-hostable stack for high-performance publishing and secure, private network access.

### Current Status
-  **Production Ready**: Blog platform running on Cloudflare Workers
-  **Proxy Integration**: Multi-protocol proxy server with API endpoints
-  **Federation Support**: Native email-native federation for deadlight instances, compatible with ActivityPub social features
-  **In Development**: Unified admin dashboard, plugin system

---

### Core Features

### 2.1 Web Layer (Blog / CMS)
* **Edge-deployed** on Cloudflare Workers for global low-latency delivery
* **Markdown content system** with automatic build/deploy
* **Federation support** via built-in email for decentralized social features
* **Email integration** for notifications and newsletters
* **Queue processing** for background tasks
* **D1 database** for persistent storage at the edge
* **KV storage** for rate limiting and caching

### 2.2 Proxy Management Layer
* **Multi-protocol support** for HTTP(S), SOCKS5, SSH, and custom protocols
* **API-driven configuration** with real-time status monitoring
* **Cloudflare Tunnel integration** for secure inbound connections
* **Protocol detection** with automatic handler selection
* **Connection pooling** and worker thread management
---

### Architecture

```
[ Client / Browser ]
   │
[ Cloudflare Edge Network ]
   ├─ Workers (Blog/API)
   ├─ D1 Database
   ├─ KV Storage
   └─ Queues
       │
[ Cloudflare Tunnel ]
   │
[ Proxy Server Layer ]
   ├─ API Handler (/api/*)
   ├─ Blog Integration
   ├─ Email Service
   └─ Federation Handler
       │
[ Protocol Handlers ]
   ├─ HTTP/HTTPS
   ├─ SOCKS4
   ├─ SOCKS5
   ├─ SSH
   ├─ IMAP/S
   ├─ SMTP
   ├─ API
   └─ Custom Protocols
```

* **Cloudflare Worker Layer:** Handles request routing, caching, content rendering, and API endpoints.
* **Containerized Proxy Nodes:** Run on your infrastructure or remote hosts for flexible exit points.
* **Control Plane:** Configuration stored in Git/JSON/YAML, deployable via CI/CD.

---

<img width="2620" height="2107" alt="proxy-blog-site_multiview" src="https://github.com/user-attachments/assets/a6054f6e-cba6-4257-8372-e94ddefb46be" />

---

### Security Model
* **Zero-trust routing:** No implicit trust between layers; all inter-service communication is authenticated.
* **Worker sandboxing:** Cloudflare’s isolation prevents lateral movement in case of compromise.
* **Secrets management:** No hardcoded secrets; stored in environment variables or an encrypted vault.
* **TLS everywhere:** All proxy connections are encrypted end-to-end.

---

### Deployment
#### Requirements
* Node.js v18+
* Wrangler CLI (Cloudflare Workers)
* GitHub Actions (optional for CI/CD)

### Quick Start
To get started quickly, follow these steps:

```bash
# Clone the repository
git clone https://github.com/gnarzilla/edge.deadlight
cd edge.deadlight

# Install dependencies
npm install

# Configure your environment
cp .env.example .env
nano .env

# Deploy the Cloudflare Worker
wrangler deploy
```

### Configuration

#### Environment Setup
Create `.dev.vars` for local development:
```env
JWT_SECRET=your-dev-secret
X_API_KEY=your-dev-api-key
FEDERATION_PRIVATE_KEY=your-private-key
FEDERATION_PUBLIC_KEY=your-public-key
```

#### Production Secrets
```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put X_API_KEY --env production
```

#### Cloudflare Tunnel Setup

```bash
# Debian/Ubuntu
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Or via binary
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create a tunnel:
cloudflared tunnel create deadlight-proxy
```

Create config file `~/.cloudflared/config.yml`:
```yaml
tunnel: your-tunnel-id
credentials-file: ~/.cloudflared/tunnel-creds.json

ingress:
  - hostname: proxy.your-domain.tld
    service: http://localhost:8080
  - service: http_status:404
```
```bash
# Route traffic to your tunnel:
cloudflared tunnel route dns deadlight-proxy proxy.deadlight.boo

# Run the tunnel:
cloudflared tunnel run deadlight-proxy

# Run in background with systemd (optional)
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

### Production Deployment

#### Recommmended Architecture
```markdown
┌─────────────────────────────────────────┐
│            Cloudflare Workers           │
│     ┌─────────────┐ ┌─────────────┐     │
│     │  Main Site  │ │  Admin API  │     │
│     │ .domain.com │ │   /api/     │     │
│     └─────────────┘ └─────────────┘     │
└─────────────────────────────────────────┘
                   │ │
                   │ │
┌───────────▼────────────────▼────────────┐
│           Cloudflare Tunnel             │
│           (Secure Inbound)              │
└─────────────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────┐
│              Proxy Server               │
│    ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│    │   Blog  │ │  Email  │ │  Fed.   │  │
│    │   API   │ │  API    │ │  API    │  │
│    └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────┘
```
#### Test the integration

```bash
# From your blog's location, test if you can reach the proxy
curl http://localhost:8080/api/blog/status

# Live deployment
curl -v https://proxy.<your-domain.xxx>/api/blog/status

# Test with API key if required
curl -H "X-API-Key: your-key" http://localhost:8080/api/blog/status
```

### Monitoring 
####   & Observability

* **Cloudflare Analytics**: Built-in request metrics and error tracking
* **Worker Logs**: Real-time logging via `wrangler tail`
* **Proxy Metrics**: Connection stats, protocol distribution, error rates
* **Status Endpoints**: 
  - `/api/blog/status` - Blog service health
  - `/api/email/status` - Email service health
  - `/api/federation/status` - Federation service health

#### Roadmap
v1.0 – Baseline integrated platform (content + proxy).

v1.1 – Admin dashboard for live control.

v1.2 – Built-in metrics + alerting.

v1.3 – Multi-region container orchestration.

v2.0 – Plugin ecosystem for extending both layers.

#### License
MIT License – open for personal and commercial use.

#### Detailed Documentation
[blog.deadlight README](https://github.com/gnarzilla/blog.deadlight): Detailed instructions for setting up and configuring the blog layer.

[proxy.deadlight README](https://github.com/gnarzilla/proxy.deadlight): In-depth guide for building and deploying the proxy server.

[lib.deadlight README](https://github.com/gnarzilla/lib.deadlight): In-depth guide for utilizing shared deadlight resources.
