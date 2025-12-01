# Stage 1: Build environment
FROM alpine:3.19 AS builder

RUN apk add --no-cache \
    gcc musl-dev make pkgconfig \
    glib-dev glib-static \
    json-glib-dev \
    openssl-dev openssl-libs-static \
    linux-headers \
    zlib-static \
    libmicrohttpd-dev libmicrohttpd-static

WORKDIR /build
COPY . .

# Build with UI enabled
RUN make UI=1 CFLAGS="-O2"

# Stage 2: Minimal runtime
FROM alpine:3.19

# Need json-glib, glib-networking (for TLS), and libmicrohttpd (for UI) at runtime
RUN apk add --no-cache \
    json-glib \
    glib-networking \
    ca-certificates \
    openssl \
    libmicrohttpd

# Create deadlight user first
RUN adduser -D -s /sbin/nologin deadlight

# Create all directories needed by the config
RUN mkdir -p \
    /etc/deadlight \
    /var/log/deadlight \
    /var/cache/deadlight \
    /tmp/deadlight_certs \
    /tmp/deadlight_cache && \
    chown -R deadlight:deadlight \
        /etc/deadlight \
        /var/log/deadlight \
        /var/cache/deadlight \
        /tmp/deadlight_certs \
        /tmp/deadlight_cache

# Generate CA certificate and key at the paths expected by config
RUN openssl req -new -x509 -days 3650 -nodes \
    -subj "/C=US/ST=State/L=City/O=Deadlight/CN=Deadlight Root CA" \
    -keyout /etc/deadlight/ca.key \
    -out /etc/deadlight/ca.crt && \
    chmod 644 /etc/deadlight/ca.crt && \
    chmod 600 /etc/deadlight/ca.key && \
    chown deadlight:deadlight /etc/deadlight/ca.key /etc/deadlight/ca.crt

# Copy binary
COPY --from=builder /build/bin/deadlight /usr/local/bin/proxy

# Copy the docker config
COPY --from=builder /build/deadlight.conf.docker /etc/deadlight/deadlight.conf
RUN sed -i 's|/home/thatch/.deadlight/ca/ca.key|/etc/deadlight/ca.key|g' /etc/deadlight/deadlight.conf && \
    sed -i 's|/home/thatch/.deadlight/ca/ca.crt|/etc/deadlight/ca.crt|g' /etc/deadlight/deadlight.conf && \
    chown deadlight:deadlight /etc/deadlight/deadlight.conf

# Switch to non-root user
USER deadlight

# Expose ports from config: proxy and web UI
EXPOSE 8080 8081

ENTRYPOINT ["/usr/local/bin/proxy"]
CMD ["-v", "-c", "/etc/deadlight/deadlight.conf"]