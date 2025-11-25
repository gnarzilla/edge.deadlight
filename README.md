# Deadlight Edge Platform
#### Federated, resilient infrastructure for the internet that actually exists
**Multi-provider edge deployment · Subdomain-based federation · Protocol-agnostic networking · Works over LoRa/Satellite/2G**

---

## What We're Building

**A federated publishing platform that survives infrastructure collapse.**

Not hypothetical collapse. The kind happening right now: hurricanes knocking out power grids, authoritarian internet shutdowns, ISPs priced out of rural markets, mesh networks running on solar batteries.

Deadlight federates content across edge providers, bridges incompatible protocols, and maintains connectivity when traditional infrastructure fails. Deploy a blog from a PinePhone over 2G. Post updates via LoRa mesh. Run a community platform with zero server costs. **User sovereignty over platform convenience.**

### Live Production Deployments

| Instance | Purpose | Stack |
|----------|---------|-------|
| [deadlight.boo](https://deadlight.boo) | Main platform demo | Cloudflare Workers + D1 |
| [stats.deadlight.boo](https://stats.deadlight.boo) | GitHub stats dashboard | Vercel Edge (Node.js) |
| [thatch-dt.deadlight.boo](https://thatch-dt.deadlight.boo) | Zero-JS instance | Cloudflare Workers |
| [meshtastic.deadlight.boo](https://meshtastic.deadlight.boo) | LoRa gateway blog | Cloudflare Workers |
| [threat-level-midnight.deadlight.boo](https://threat-level-midnight.deadlight.boo) | Federation testing | Cloudflare Workers |

All instances federate. All work in lynx. All survive intermittent connectivity.

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     edge.deadlight                          │
│                  (Orchestration & Control)                  │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│blog.deadlight│     │proxy.deadlight│     │meshtastic.       │
│              │     │               │     │  deadlight       │
│ Global CDN   │◄───►│Protocol Bridge│◄───►│                  │
│ Content &    │     │SMTP/IMAP/SOCKS│     │ LoRa ↔ Internet  │
│ Federation   │     │VPN Gateway    │     │ Gateway          │
│              │     │               │     │                  │
│ JavaScript   │     │ C (17 MB)     │     │ C (proxy fork)   │
└──────────────┘     └──────────────┘     └──────────────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  lib.deadlight   │
                    │                  │
                    │ Shared libraries:│
                    │ • Auth (JWT)     │
                    │ • DB models      │
                    │ • Security       │
                    │ • UI components  │
                    └──────────────────┘
```

### Hybrid Edge Deployment Strategy

**Different providers for different strengths. No single point of failure.**

| Component | Provider | Why | Resilience Factor |
|-----------|----------|-----|-------------------|
| **Content Delivery** | Cloudflare Workers | 300+ PoPs, D1 database, generous free tier | If CF fails, content cached at edge |
| **Node.js Workloads** | Vercel Edge | Better Node ecosystem support | Different infrastructure from CF |
| **WebSocket/Realtime** | Deno Deploy | Native WebSocket, TypeScript-first | Geographic diversity |
| **Protocol Bridging** | Self-hosted/VPS | Stateful connections require persistence | Run anywhere (Pi, laptop, VPS) |
| **Mesh Gateways** | Local nodes | Physical proximity to mesh networks | Operates without internet |

### DNS Architecture

```
Cloudflare DNS (Control Plane)
│
├─── System Subdomains (Explicitly Routed)
│    ├── blog.deadlight.boo → Cloudflare Workers
│    ├── api.deadlight.boo → Vercel Functions (future)
│    ├── stats.deadlight.boo → Vercel Edge
│    ├── mesh.deadlight.boo → Local gateway
│    └── proxy.deadlight.boo → Self-hosted bridge
│
├─── Wildcard Community Subdomains (*.deadlight.boo)
│    ├── nyc.deadlight.boo → Tag aggregator
│    ├── tech.deadlight.boo → Topic community
│    ├── emergency.deadlight.boo → Disaster response
│    └── [any].deadlight.boo → Auto-provisioned
│
└─── Instance Subdomains (Named Deployments)
     ├── v1.deadlight.boo → Legacy version
     ├── threat-level-midnight.deadlight.boo → Testing
     └── [partner].deadlight.boo → Federated instances
```

**Key Design Choice:** User profiles at `/user/<name>` not subdomains. Avoids cert limits, works offline, simpler federation.

---

## Federation Model

### How Instances Communicate

```
Instance A                    Instance B
blog.deadlight.boo           remote.deadlight.example
     │                              │
     ├── POST /federation/announce ─►
     │   (New post notification)    │
     │                              │
     ◄── GET /api/posts/:id ────────┤
     │   (Fetch full content)       │
     │                              │
     ├── Email Protocol Bridge ─────►
     │   (Fallback via SMTP)        │
```

### Federation Principles

1. **Protocol-agnostic**: Primary federation over HTTP, fallback to email
2. **Pull-based**: Instances pull content they want (reduces spam)
3. **Cryptographically signed**: All federated content includes signatures
4. **Offline-capable**: Federation queues retry when connectivity returns
5. **Tag-based discovery**: Instances auto-discover peers via shared tags

### Community Subdomains

Any subdomain not in the system reserved list becomes a **tag aggregator**:

```javascript
// Worker code (simplified)
const subdomain = new URL(request.url).hostname.split('.')[0]

if (SYSTEM_SUBDOMAINS.includes(subdomain)) {
  return handleSystemRoute(request)
}

// Treat as tag/community
return aggregateTagContent(subdomain, request)
```

This enables:
- `politics.deadlight.boo` → All #politics posts across federation
- `denver.deadlight.boo` → Geographic community
- `emergency.deadlight.boo` → Disaster response coordination

---

## Component Deep Dive

### blog.deadlight
**Purpose**: Content management & federation hub  
**Stack**: Cloudflare Workers, D1, Markdown  
**Features**:
- Sub-10KB pages, works in lynx
- Post via web, API, or email
- JWT auth with role-based access
- Federation endpoint management

[Full docs →](https://github.com/gnarzilla/blog.deadlight)

### proxy.deadlight
**Purpose**: Stateful protocol bridging  
**Stack**: C, GLib, OpenSSL  
**Protocols**: HTTP/S, SOCKS4/5, SMTP, IMAP, VPN (TUN)  
**Features**:
- 17 MB Docker image or native binary
- Real-time dashboard on :8081
- Tailscale-native routing
- Zero inbound ports required

[Full docs →](https://github.com/gnarzilla/proxy.deadlight)

### meshtastic.deadlight
**Purpose**: LoRa mesh ↔ Internet gateway  
**Stack**: C (proxy.deadlight fork)  
**Features**:
- Bridge Meshtastic mesh to public internet
- Post to blog via LoRa
- Extreme low-bandwidth optimization

[Full docs →](https://github.com/gnarzilla/meshtastic.deadlight)

### EOF
