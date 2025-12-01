deadlight-lib/
├── c/                            # Core C modules (build into static/shared libs)
│   ├── include/                  # Public headers
│   │   ├── deadlight-config.h
│   │   ├── deadlight-logging.h
│   │   ├── deadlight-auth.h      # Aggregates jwt.h, password.h, crypto.h, base64url.h
│   │   └── deadlight-network.h
│   ├── src/                      # Implementation files
│   │   ├── auth/
│   │   │   ├── jwt.c
│   │   │   ├── password.c
│   │   │   ├── auth.c
│   │   │   ├── base64url.c
│   │   │   └── crypto.c
│   │   ├── config/               # YAML‐based loader & hot reload
│   │   │   └── config.c
│   │   ├── logging/              # Structured, multi‐level logging
│   │   │   └── logging.c
│   │   └── network/              # Non-blocking I/O abstractions
│   │       └── network.c
│   ├── tests/                    # Unit/integration tests (e.g. libcheck)
│   ├── CMakeLists.txt            # Or top‐level Makefile
│   └── README.md                 # C‐module quickstart & API docs
│
├── js/                           # Node.js / Wasm bindings & pure-JS modules
│   ├── src/
│   │   ├── auth/                 # JS wrapper around C JWT/password or pure fallback
│   │   │   └── index.js
│   │   ├── config/               # Loads shared/config.yaml
│   │   │   └── index.js
│   │   ├── logging/              # Mirrors C logging API
│   │   │   └── index.js
│   │   └── db/                   # Migration runner, D1/SQLite helpers
│   │       └── migrations.js
│   ├── tests/                    # Jest/Mocha tests
│   ├── package.json
│   └── README.md                 # JS‐module usage & examples
│
├── shared/                       # Cross‐language assets
│   ├── config.yaml               # Base config that C/JS both consume
│   └── schema.sql                # DB schema for blog/mail
│
├── scripts/                      # Top‐level helpers
│   ├── build-all.sh              # Kick off C build + npm pack
│   └── lint-all.sh
│
├── docker/                       # Optional container builds
│   └── Dockerfile.lib
├── LICENSE
└── README.md                     # Library overview, quickstart, roadmap
