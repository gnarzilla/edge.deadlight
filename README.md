# Deadlight Edge Platform
#### Global, low-latency web presence + local multi-protocol gateway over a private Tailscale mesh  
**No always-on servers · No port forwarding · Works offline-first · <20 MB total footprint**

![demo](https://github.com/gnarzilla/proxy.deadlight/blob/main/assets/interactive_proxy_dash.gif)

## What It Is Today (November 2025)

| Layer                  | Repo                              | Status         | Key Capability |
|------------------------|-----------------------------------|----------------|----------------|
| Global Front-End       | [blog.deadlight]                         | Production     | Markdown blog + API on Cloudflare Workers/Pages |
| Local Protocol Bridge  | [proxy.deadlight]                        | Production     | HTTP/S, SOCKS, SMTP, IMAP, VPN gateway (TUN) |
| Shared Utilities       | [lib.deadlight]                          | Alpha          | Auth, models, UI components |
| Extreme-Edge Bridge    | [meshtastic.deadlight]            | Early          | LoRa ↔ Internet via the same proxy binary |
| Umbrella Integration   | edge.deadlight (this repo)        | Integration & docs | Ties everything together |

**Live examples** → deadlight.boo · thatch-dt.deadlight.boo · meshtastic.deadlight.boo

## Real-World Flow (the 5-minute version)

```text
Browser ──► Cloudflare Worker (blog.deadlight) 
               │
               └──► Tailscale mesh (100.x.x.x)
                       │
               proxy.deadlight (running on Pi/VPS/laptop)
               ├─► Routes your browser traffic (HTTP/SOCKS)
               ├─► Tunnels your email client (SMTP/IMAP)
               └─► Optional full-VPN mode (TUN device)
```

Zero open inbound ports. Works behind CGNAT, Starlink, hotel Wi-Fi, etc.

## Accurate Feature Matrix (2025)

| Feature                               | Status      | Details |
|---------------------------------------|-------------|-------|
| Global markdown blog + comments       | Done        | Cloudflare Workers + D1 |
| Multi-protocol proxy (HTTP/S, SOCKS, SMTP, IMAP) | Done | Single 17 MB Docker image |
| VPN gateway (Layer 3 TUN)             | Done        | Privileged container or native |
| Tailscale-native control plane        | Done        | Proxy listens on tailscale0 by default |
| TLS interception + dynamic CA         | Done        | With clear warnings |
| Real-time web dashboard (:8081)       | Done        | Connection table + stats |
| External control API for the proxy    | Not yet     | Planned for v1.1 |
| Unified admin UI across blog + proxy  | Not yet     | Planned |
| ActivityPub federation                | Partial     | Outbound webfinger/.well-known only |
| Dynamic plugin loading                | Not yet     | Requires rebuild today |

## Realistic Roadmap (next 6–12 months)

| Milestone | Target | What ships |
|---------|--------|------------|
| v1.1    | Q1 2026 | External REST API for proxy + basic dashboard in blog.deadlight |
| v1.2    | Q2 2026 | Dynamic plugin loading (no rebuild), IPv6, Windows builds |
| v2.0    | 2026–27 | Full ActivityPub node, ML-based anomaly plugin, orchestration manifests |

## Quick Start in Under 5 Minutes

```bash
# 1. Blog (global)
git clone https://github.com/gnarzilla/blog.deadlight && cd blog.deadlight
wrangler deploy

# 2. Proxy (local — runs anywhere)
docker run -d --name deadlight-proxy --privileged -p 8080:8080 -p 8081:8081 gnarzilla/proxy-deadlight:latest

# 3. Connect them
#   → Join both machines to the same Tailscale network
#   → Point your browser/email client to the proxy’s Tailscale IP
```

That’s it. No database servers, no reverse proxies, no cert management.

## Documentation
- proxy.deadlight → full build/run guide + plugin docs
- blog.deadlight → content authoring + federation guide
- meshtastic.deadlight → off-grid deployment notes

MIT licensed · Contributions extremely welcome
```
