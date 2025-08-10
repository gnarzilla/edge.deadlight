# Deadlight Edge Platform — Modular, Secure Web + Network Infrastructure

A production-ready, security-hardened edge platform that combines a modular static/dynamic site framework with integrated multi-protocol proxy server management. Built for performance, privacy, and scalability using Cloudflare Workers and lightweight containerized services.

---

## 1. Overview
The Deadlight Edge Platform is an edge-native application framework that merges:

* **Blog / CMS Layer:** A static-first, markdown-driven content engine with optional dynamic features, deployed at the edge for minimal latency.
* **Proxy Management Layer:** A real-time, multi-protocol proxy server controller with per-session, per-route configuration.
* **Unified Deployment Pipeline:** CI/CD and configuration tooling optimized for Cloudflare Workers and container environments.
* **Security by Default:** Strong isolation between content, application logic, and network-level routing.

The goal: A single, self-hostable stack for high-performance publishing and secure, private network access.

---

## 2. Core Features

### 2.1 Web Layer (Blog / CMS)
* **Edge-deployed** on Cloudflare Workers for global low-latency delivery.
* **Markdown content system** with automatic build/deploy.
* **Modular theming** via components for easy customization.
* **Asset optimization** with CSS/JS bundling and Cloudflare caching rules.
* **Security hardening** with CSP, sanitization, and Worker-level request filtering.

### 2.2 Proxy Management Layer
* **Multi-protocol support** for HTTP(S), SOCKS5, and WebSocket tunneling.
* **Dynamic routing rules** with runtime reconfiguration.
* **Access controls** via token-based auth and IP restrictions.
* **Containerized workers** for isolated network services.

---

## 3. Architecture

```
[ Client ] 
   │
[ Cloudflare Worker Layer ]
   ├─ Content Rendering (Markdown → HTML)
   ├─ API Gateway
   ├─ Proxy Routing Rules
   └─ Security Filters
       │
[ Containerized Services / Proxy Nodes ]
   ├─ HTTP/HTTPS Proxy
   ├─ SOCKS5 Proxy
   ├─ WebSocket Tunnel
   └─ Custom Protocol Handlers
       │
[ Target Services / Origin Servers ]
```

* **Cloudflare Worker Layer:** Handles request routing, caching, content rendering, and API endpoints.
* **Containerized Proxy Nodes:** Run on your infrastructure or remote hosts for flexible exit points.
* **Control Plane:** Configuration stored in Git/JSON/YAML, deployable via CI/CD.

---

## 4. Security Model
* **Zero-trust routing:** No implicit trust between layers; all inter-service communication is authenticated.
* **Worker sandboxing:** Cloudflare’s isolation prevents lateral movement in case of compromise.
* **Secrets management:** No hardcoded secrets; stored in environment variables or an encrypted vault.
* **TLS everywhere:** All proxy connections are encrypted end-to-end.

---

## 5. Deployment
### Requirements
* Node.js v18+
* Wrangler CLI (Cloudflare Workers)
* Docker (for proxy containers)
* GitHub Actions (optional for CI/CD)

### Quick Start
To get started quickly, follow these steps:

```bash
# Clone the repository
git clone [https://github.com/your-org/deadlight-edge.git](https://github.com/your-org/deadlight-edge.git)
cd deadlight-edge

# Install dependencies
npm install

# Configure your environment
cp .env.example .env
nano .env

# Deploy the Cloudflare Worker
npx wrangler publish

# Start the proxy containers
docker-compose up -d
```

## 6. Roadmap
v1.0 – Baseline integrated platform (content + proxy).

v1.1 – Admin dashboard for live control.

v1.2 – Built-in metrics + alerting.

v1.3 – Multi-region container orchestration.

v2.0 – Plugin ecosystem for extending both layers.

## 7. License
MIT License – open for personal and commercial use.

## 8. Detailed Documentation
[Deadlight Blog README](https://github.com/gnarzilla/deadlight): Detailed instructions for setting up and configuring the blog layer.

[Deadlight Proxy README](https://github.com/gnarzilla/deadlight): In-depth guide for building and deploying the proxy server.
