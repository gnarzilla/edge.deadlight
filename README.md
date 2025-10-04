# Deadlight Edge Platform — Modular, Secure Web + Network Infrastructure

A security-hardened edge platform combining a modular static/dynamic site framework with integrated multi-protocol proxy server management. Built for performance, privacy, and scalability using Cloudflare, Tailscale and lightweight containerized services.

![Proxy-Blog Integration](https://github.com/gnarzilla/proxy.deadlight/blob/7244159ad32a7ad3383e98a874449f96597b07f0/assets/interactive_proxy_dash.gif)
---

[Current Status](#current-status) | [Features](#features |[Architecture](#architecture) | [Security Model](#security-model) | [Deployment](#deployment)  [Configuration](#configuration) | [Monitoring](#Monitoring) | [Roadmap](#roadmap) | [Detailed Documentation](#detailed-documentation)

---

## Overview
The Deadlight Edge Platform is an edge-native application framework that merges:

* **[Blog / CMS Layer](https://github.com/gnarzilla/blog.deadlight):** A static-first, markdown-driven content engine with optional dynamic features, deployed at the edge for minimal latency.
* **[Proxy Management Layer](https://github.com/gnarzilla/proxy.deadlight):** A real-time, multi-protocol proxy server controller with per-session, per-route configuration.
* **[lib.deadlight Shared Library](https://github.com/gnarzilla/lib.deadlight):** A modular, edge-native library providing authentication, database models, UI components, and core utilities for the Deadlight ecosystem of applications
* **Unified Deployment Pipeline:** CI/CD and configuration tooling optimized for Cloudflare Workers and container environments.
* **Security by Default:** Strong isolation between content, application logic, and network-level routing.

The goal: A single, self-hostable stack for high-performance publishing and secure, private network access.
```text

                 DEADLIGHT ECOSYSTEM ARCHITECTURE 

┌─────────────────────────────────────────────────────────────────────────────┐
│                            GLOBAL WEB LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│   Any Browser/Device →  Cloudflare CDN →  blog.deadlight Worker             │
│                                               (REST API Client)             │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          │ HTTP/JSON API Calls
                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL PROTOCOL BRIDGE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                        proxy.deadlight v1.0                                 │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │    API          │    │   SMTP          │    │   SOCKS4/5      │          │
│  │   Handler       │    │   Bridge        │    │   Proxy         │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │    HTTP/S       │    │    IMAP/S       │    │    Protocol     │          │
│  │   Proxy         │    │   Tunnel        │    │   Detection     │          │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘          │
└─────────────────────────┬───────────────────────────────────────────────────┘
                          │
                          │ Native TCP/SSL Protocols
                          ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          INTERNET SERVICES                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│    SMTP Servers  │    IMAP Servers  │    Web Sites  │    Other Proxies       │
└──────────────────────────────────────────────────────────────────────────────┘

 DEPLOYMENT MODEL:
┌────────────────────┐                    ┌────────────────────┐
│      GLOBAL        │                    │       LOCAL        │
│   deadlight.boo    │ ←─── API BRIDGE ──→│   proxy.deadlight  │
│   Cloudflare       │                    │   VPS/Pi/Desktop   │
│   Workers/Pages    │                    │   localhost:8080   │
└────────────────────┘                    └────────────────────┘
```

## Current Status
-  **Production Ready**: Blog platform running on Cloudflare Workers
-  **Proxy Integration**: Multi-protocol proxy server with API endpoints
-  **Federation Support**: Native email-native federation for deadlight instances, compatible with ActivityPub social features
-  **In Development**: Unified admin dashboard, plugin system, VPN gateway

---

## Features

### Web Layer (Blog / CMS)
* **Edge-deployed** for global low-latency delivery.
* **Markdown content system** with automatic build/deploy
* **Federation support** for decentralized social features.
* **Email integration** for notifications and newsletters
* **Queue processing** for background tasks
* **D1 database** for persistent storage at the edge

### Proxy Management Layer
* **Multi-protocol support** for HTTP(S), SOCKS5, SSH, and custom protocols
* **API-driven configuration** with real-time status monitoring
* **Secure Mesh Networking** using Tailscale.
* **Protocol detection** with automatic handler selection
* **Connection pooling** and worker thread management
---

## Architecture

```
[ Client / Browser ]
   │
[ Cloudflare Edge Network ]
   ├─ Workers (Blog/API)
   ├─ D1 Database
   ├─ KV Storage
   └─ Queues
       │
[ Talkscale Connection ]
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
   ├─ FTP
   ├─ WebSocket
   └─ Custom Protocols
```

* **Tailscale Network:** Provides secure mesh connectivity simplifying VPN-like gateway setups.
* **Containerized Proxy Nodes:** Flexible deployment on your infrastructure for secure exit points.
* **Control Plane:** Configuration via CI/CD, stored in Git/JSON/YAML.

---

<img width="2620" height="2107" alt="proxy-blog-site_multiview" src="https://github.com/user-attachments/assets/a6054f6e-cba6-4257-8372-e94ddefb46be" />

---

## Security Model
* **Zero-trust routing:** No implicit trust; authenticated inter-service communication.
* **Isolation and sandboxing:** Prevents lateral movement in case of compromise.
* **Secrets management:** Secure and encrypted storage of sensitive information.
* **TLS everywhere:** Encrypted proxy connections end-to-end.

---

## Deployment
### Requirements
* Node.js v18+
* Wrangler CLI (Cloudflare Workers)
* GitHub Actions (optional for CI/CD)

## Quick Start
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

## Configuration

### Environment Setup
Create `.dev.vars` for local development:
```env
JWT_SECRET=your-dev-secret
X_API_KEY=your-dev-api-key
FEDERATION_PRIVATE_KEY=your-private-key
FEDERATION_PUBLIC_KEY=your-public-key
```

### Production Secrets
```bash
wrangler secret put JWT_SECRET --env production
wrangler secret put X_API_KEY --env production
```
### Getting Started with Tailscale

### Prerequisites

- Tailscale account and client installed on your devices. [Get started with Tailscale](https://tailscale.com/download).

### Configuring Tailscale

1. Sign into Tailscale on your devices.
2. Add your server running Deadlight Proxy to your Tailscale network.
3. Configure your proxy server to accept connections over Tailscale's network interface.

### Running Deadlight with Tailscale

```bash
./bin/deadlight -c deadlight.conf.example
```

## Production Deployment

### Recommmended Architecture
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
│          Tailscale Network              │
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
### Test the integration

```bash
# Test proxy connection
curl http://<tailscale-ip>:8080/api/blog/status

# Live deployment
curl -v https://proxy.<your-domain.tld>/api/blog/status

# With API key if required
curl -H "X-API-Key: your-key" http://<tailscale-ip>:8080/api/blog/status
```

## Monitoring

* **Cloudflare Analytics**: Built-in request metrics and error tracking
* **Tailscale Metrics**: Monitor network connections and manage access securely.
* **Worker Logs**: Real-time logging via `wrangler tail`
* **Proxy Metrics**: Connection stats, protocol distribution, error rates
* **Status Endpoints**: 
  - `/api/blog/status` - Blog service health
  - `/api/email/status` - Email service health
  - `/api/federation/status` - Federation service health

## Roadmap
v1.0 – v1.0: Initial integrated platform with basic features.

v1.1 – Unified admin dashboard for live control.VPN Gateway.

v1.2 – Built-in metrics + alerting.

v1.3 – Multi-region container orchestration.

v2.0 – Plugin ecosystem for extending both layers.

## License
MIT License – open for personal and commercial use.

## Detailed Documentation
[Blog Layer Guide](https://github.com/gnarzilla/blog.deadlight): Installation and configuration of the blog layer.

[Proxy Layer Guide](https://github.com/gnarzilla/proxy.deadlight): Building and deploying the proxy server.

[Library Guide](https://github.com/gnarzilla/lib.deadlight): Utilizing shared resources within Deadlight.
