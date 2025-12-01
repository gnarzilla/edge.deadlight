# Deadlight Edge Platform
#### Federated, resilient infrastructure for the internet that actually exists
**Protocol-agnostic networking · Subdomain-based federation · Works over LoRa/Satellite/2G**

---

## What This Is

**A federated publishing platform that works when infrastructure doesn't.**

Deadlight bridges incompatible protocols and maintains connectivity across edge providers, mesh networks, and degraded infrastructure. The kind that exists right now: hurricanes, internet shutdowns, rural connectivity gaps, solar-powered mesh networks.

Deploy a blog from a PinePhone over 2G. Post updates via LoRa mesh. Run a community platform with zero server costs. **User sovereignty over platform convenience.**

### Live Production Deployments

| Instance | Purpose | Stack |
|----------|---------|-------|
| [deadlight.boo](https://deadlight.boo) | Main platform | Cloudflare Workers + D1 |
| [thatch-dt.deadlight.boo](https://thatch-dt.deadlight.boo) | Zero-JS variant | Cloudflare Workers |
| [meshtastic.deadlight.boo](https://meshtastic.deadlight.boo) | LoRa gateway | Cloudflare Workers |
| [stats.deadlight.boo](https://stats.deadlight.boo) | GitHub stats | Vercel Edge |

All instances federate. All work in lynx. All survive intermittent connectivity.

---

## System Architecture

### Component Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     edge.deadlight                          │
│           (Integration Layer & Documentation)               │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│blog.deadlight│     │proxy.deadlight│     │meshtastic.       │
│              │     │               │     │  deadlight       │
│ Content CDN  │◄───►│Protocol Bridge│◄───►│                  │
│ & Federation │     │Multi-protocol │     │ LoRa ↔ Internet  │
│ Hub          │     │Adapter        │     │ Gateway          │
│              │     │               │     │                  │
│ JS/Wasm      │     │ C (17 MB)     │     │ C (proxy fork)   │
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
                    │ • Queue system   │
                    └──────────────────┘
```

---

## Integration Patterns

### 1. Blog ↔ Proxy Communication

**Challenge:** Cloudflare Workers (serverless) needs to communicate with stateful proxy (C binary on residential WiFi).

**Solution:** Tailscale-based private networking + queue-based resilience

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Worker (blog.deadlight)                         │
│                                                             │
│  User Action (comment/notification)                        │
│         ↓                                                   │
│  Queue in D1 database                                      │
│         ↓                                                   │
│  Cron (every 5 min)                                        │
│         ↓                                                   │
│  Check proxy health via Tailscale                          │
│         ↓                                                   │
│  POST /api/email/send (if online)                          │
│         │                                                   │
│         │ (If offline: keep in queue, retry later)         │
└─────────┼───────────────────────────────────────────────────┘
          │
          │ Tailscale VPN (private network)
          │
┌─────────▼───────────────────────────────────────────────────┐
│ Proxy (proxy.deadlight)                                     │
│                                                             │
│  Receives JSON payload                                     │
│         ↓                                                   │
│  Converts to transactional email API call                  │
│         ↓                                                   │
│  HTTPS POST to MailChannels (port 443)                     │
│         ↓                                                   │
│  MailChannels → Recipient's inbox                          │
└─────────────────────────────────────────────────────────────┘
```

**Key Design Decisions:**

- **Queue-first**: Worker queues all actions in D1, processes when proxy available
- **Health checks**: Cron pings proxy before attempting delivery
- **Circuit breaker**: Backs off if proxy repeatedly fails
- **HTTP over SMTP**: Uses HTTPS APIs (port 443) instead of SMTP (port 25, blocked on residential)
- **Tailscale routing**: Private IPs, no exposed ports, works through NAT

---

### 2. Email Delivery Without Port 25

**Problem:** Traditional SMTP requires port 25, which ISPs block on residential connections.

**Solution:** HTTP-to-Email bridge via transactional email APIs.

```
Traditional SMTP (doesn't work):
  Proxy → Port 25 → Recipient MX Server ✗ (blocked by ISP)

Deadlight Approach:
  Proxy → HTTPS (port 443) → MailChannels API → Recipient ✓
```

**Implementation:**

```c
// In proxy.deadlight/src/protocols/api.c
static gboolean email_send_via_mailchannels(
    const gchar *from, const gchar *to,
    const gchar *subject, const gchar *body) {
    
    // Build JSON payload
    JsonBuilder *builder = json_builder_new();
    // ... build MailChannels v1 API format
    
    // Connect via HTTPS (port 443 - never blocked)
    GSocketClient *client = g_socket_client_new();
    g_socket_client_set_tls(client, TRUE);
    
    GSocketConnection *conn = g_socket_client_connect_to_host(
        client, "api.mailchannels.net", 443, NULL, &error);
    
    // POST /tx/v1/send
    // Returns 202 Accepted on success
}
```

**Why MailChannels:**
- Free tier for Cloudflare Workers users
- Designed for transactional email (not marketing)
- Better deliverability than residential IP
- Proper SPF/DKIM signing

**Alternative Providers:** SendGrid, Mailgun, Amazon SES (all use port 443/587)

---

### 3. Federation Protocol

**Design:** Pull-based federation with email fallback.

```
Instance A                          Instance B
(blog.deadlight.boo)               (remote.example.com)
     │                                    │
     ├── 1. Announce new post ───────────►│
     │   POST /federation/announce        │
     │   { post_id, author, tags }        │
     │                                    │
     │◄── 2. Request full content ────────┤
     │   GET /api/posts/:id               │
     │                                    │
     ├── 3. Fallback via email ───────────►│
     │   (if HTTP unreachable)            │
     │   SMTP bridge via proxy            │
```

**Key Features:**

- **Pull-based**: Instances request content they want (spam resistant)
- **Signed content**: All posts cryptographically signed by author
- **Tag-based discovery**: Instances auto-discover peers via shared hashtags
- **Multi-protocol**: HTTP primary, email fallback, future LoRa support
- **Offline-capable**: Federation queues retry when connectivity returns

---

### 4. Community Subdomains (Tag Aggregation)

**Pattern:** Any non-system subdomain becomes a content aggregator.

```
DNS: *.deadlight.boo → Cloudflare Worker

Worker logic:
  - blog.deadlight.boo → Main blog (system)
  - proxy.deadlight.boo → Proxy dashboard (system)
  - politics.deadlight.boo → All #politics posts (aggregator)
  - denver.deadlight.boo → All #denver posts (aggregator)
  - emergency.deadlight.boo → Disaster response (aggregator)
```

**Implementation:**

```javascript
// Worker routing (simplified)
const subdomain = new URL(request.url).hostname.split('.')[0];

const SYSTEM_SUBDOMAINS = ['blog', 'proxy', 'stats', 'api'];

if (SYSTEM_SUBDOMAINS.includes(subdomain)) {
  return handleSystemRoute(request);
}

// Treat as tag aggregator
return aggregateTagContent(subdomain, request);
```

**Benefits:**

- Decentralized community organization
- No central authority needed
- Works offline (local cache)
- Resistant to censorship

---

## Component Deep Dive

### blog.deadlight

**Purpose:** Content delivery & federation hub  
**Stack:** Cloudflare Workers, D1 (SQLite), Markdown  
**Key Features:**

- Sub-10KB pages, works in lynx/w3m
- Post via web UI, API, or email
- JWT auth with role-based access (admin/user)
- Federation endpoint (`/federation/*`)
- D1 queue for offline resilience

**Integration Points:**

- `POST /api/email/send` → Queues notification for proxy
- `POST /federation/announce` → Notifies federated instances
- `GET /api/posts/:id` → Serves content to remote instances

[Repo →](https://github.com/gnarzilla/blog.deadlight)

---

### proxy.deadlight

**Purpose:** Protocol bridging & stateful connections  
**Stack:** C, GLib, OpenSSL, json-glib  
**Protocols:** HTTP/S, SOCKS4/5, WebSocket, SMTP/IMAP bridge, VPN (TUN device)  
**Key Features:**

- Multi-protocol auto-detection
- 17 MB Docker image or native binary
- Web dashboard on `:8081`
- Tailscale-native (private IPs, no exposed ports)
- Email delivery via HTTPS APIs (MailChannels/SendGrid)

**Integration Points:**

- `GET /api/health` → Health check from blog cron
- `POST /api/email/send` → Receives queued emails from blog
- `POST /api/federation/send` → Bridges federation over email (future)

**Why C:**
- Runs on low-power devices (Raspberry Pi, old laptops)
- Minimal dependencies (works on OpenWRT)
- Low memory footprint (<50 MB RAM)
- Can run on solar-powered nodes

[Repo →](https://github.com/gnarzilla/proxy.deadlight)

---

### meshtastic.deadlight

**Purpose:** LoRa mesh ↔ Internet gateway  
**Stack:** C (fork of proxy.deadlight)  
**Key Features:**

- Bridges Meshtastic mesh to public internet
- Post to blog via LoRa radio
- Extreme bandwidth optimization (<1 KB messages)
- Operates without internet connectivity

**Integration:**
- Extends proxy protocol detection with LoRa packet handling
- Queues messages when internet unavailable
- Syncs when connectivity restored

[Repo →](https://github.com/gnarzilla/meshtastic.deadlight)

---

### lib.deadlight

**Purpose:** Shared code across components  
**Contents:**

```
lib.deadlight/
├── core/
│   ├── auth/           # JWT generation/validation
│   ├── db/             # D1 schema & models
│   ├── security/       # Rate limiting, CSRF
│   └── queue/          # Queue service (used by blog)
├── ui/
│   ├── components/     # Reusable UI elements
│   └── themes/         # CSS themes
└── utils/
    ├── markdown/       # Markdown parser
    └── federation/     # Federation protocol helpers
```

**Usage:**

```javascript
// In blog.deadlight/src/index.js
import { initServices } from '../lib.deadlight/core/init.js';
import { QueueService } from '../lib.deadlight/core/queue/service.js';
```

---

## Deployment Model

### Current Production Setup

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare (Global CDN)                                     │
│  - blog.deadlight.boo                                       │
│  - *.deadlight.boo (wildcard)                               │
│  - D1 database (SQLite at edge)                             │
└─────────────────────────────────────────────────────────────┘
                          ↕ Tailscale VPN
┌─────────────────────────────────────────────────────────────┐
│ Home Network (Residential WiFi)                             
