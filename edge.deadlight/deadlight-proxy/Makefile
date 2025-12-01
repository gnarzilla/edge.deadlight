# Deadlight Proxy v1.0 - Makefile
# Build system for the modular proxy server

#=============================================================================
# Project Configuration
#=============================================================================
PROJECT = deadlight
VERSION = 1.0.0
PREFIX = /usr/local

#=============================================================================
# Compiler Configuration
#=============================================================================
CC = gcc
CFLAGS = -std=c99 -Wall -Wextra -pedantic -O2 -g
LDFLAGS = -Wl,--as-needed
LIBS = -lssl -lcrypto -lpthread

# Package config for GLib/GIO
GLIB_CFLAGS = $(shell pkg-config --cflags glib-2.0 gio-2.0 gio-unix-2.0 json-glib-1.0 gmodule-2.0)
GLIB_LIBS = $(shell pkg-config --libs glib-2.0 gio-2.0 gio-unix-2.0 json-glib-1.0 gmodule-2.0)

# Combined flags
ALL_CFLAGS = $(CFLAGS) $(GLIB_CFLAGS) -DDEADLIGHT_VERSION=\"$(VERSION)\" -Isrc
ALL_LIBS = $(LIBS) $(GLIB_LIBS)

#=============================================================================
# Directory Structure
#=============================================================================
OBJDIR = obj
PLUGINDIR = src/plugins
TESTDIR = src/tests
BINDIR = bin
PLUGIN_BINDIR = $(BINDIR)/plugins
VPATH = src/core:src/protocols:src/plugins:src/ui:src/vpn

# Installation directories
LIBDIR = $(PREFIX)/lib
CONFDIR = /etc/deadlight
LOGDIR = /var/log/deadlight
CACHEDIR = /var/cache/deadlight

#=============================================================================
# Source Files
#=============================================================================
CORE_SOURCES = main.c config.c context.c logging.c network.c ssl.c \
               protocols.c protocol_detection.c plugins.c request.c \
               utils.c ssl_tunnel.c connection_pool.c

PROTOCOL_SOURCES = http.c imap.c imaps.c socks.c smtp.c websocket.c ftp.c api.c

VPN_SOURCES = vpn_gateway.c

# Combine all sources into one list
ALL_SOURCES = $(CORE_SOURCES) $(PROTOCOL_SOURCES) $(VPN_SOURCES)

# ==== UI configuration ====
UI ?= 0
ifeq ($(UI),1)
  ALL_CFLAGS += -DENABLE_UI
  ALL_LIBS += $(shell pkg-config --libs libmicrohttpd)
  ALL_SOURCES += ui.c assets.c
endif

#=============================================================================
# Object Files
#=============================================================================

ALL_OBJECTS = $(addprefix $(OBJDIR)/, $(ALL_SOURCES:.c=.o))

#=============================================================================
# Targets
#=============================================================================
MAIN_TARGET = $(BINDIR)/$(PROJECT)
PLUGIN_TARGETS = $(PLUGIN_BINDIR)/adblocker.so \
                 $(PLUGIN_BINDIR)/ratelimiter.so

#=============================================================================
# Build Rules
#=============================================================================

# Default target
all: dirs $(MAIN_TARGET) plugins

# Create necessary directories
dirs:
	@mkdir -p $(OBJDIR) $(BINDIR) $(PLUGIN_BINDIR)

# Main executable
$(MAIN_TARGET): $(ALL_OBJECTS)
	@echo "Linking $(PROJECT)..."
	@$(CC) $(LDFLAGS) -o $@ $^ $(ALL_LIBS)
	@echo "Built $(PROJECT) v$(VERSION)"

# === THIS IS THE ONLY RULE YOU NEED FOR COMPILING .o FILES ===
# 'make' will use VPATH to find the .c file in the correct subdirectory.
$(OBJDIR)/%.o: %.c
		@echo "Compiling $<..."
		@mkdir -p $(dir $@)
		@$(CC) $(ALL_CFLAGS) -c $< -o $@

# Let's make this dependency more specific so it only runs when needed.
# This says that assets.o depends on assets.c, which in turn depends on index.html
$(OBJDIR)/assets.o: src/ui/assets.c

src/ui/assets.c: src/ui/index.html
ifeq ($(UI),1)
	@echo "Generating UI assets..."
	@xxd -i $< > $@
else
	# This command does nothing, which is correct for the disabled case.
	@:
endif

# Plugin builds
plugins: $(PLUGIN_TARGETS)

$(PLUGIN_BINDIR)/adblocker.so: $(PLUGINDIR)/adblocker.c $(PLUGINDIR)/adblocker.h | $(PLUGIN_BINDIR)
	@echo "Building AdBlocker plugin..."
	@$(CC) $(CFLAGS) $(GLIB_CFLAGS) -DDEADLIGHT_VERSION=\"$(VERSION)\" -Isrc -Isrc/core -fPIC -shared -o $@ $< $(ALL_LIBS)

$(PLUGIN_BINDIR)/ratelimiter.so: $(PLUGINDIR)/ratelimiter.c $(PLUGINDIR)/ratelimiter.h | $(PLUGIN_BINDIR)
	@echo "Building RateLimiter plugin..."
	@$(CC) $(CFLAGS) $(GLIB_CFLAGS) -DDEADLIGHT_VERSION=\"$(VERSION)\" -Isrc -Isrc/core -fPIC -shared -o $@ $< $(ALL_LIBS)

#=============================================================================
# Utility Targets
#=============================================================================

# Clean build artifacts
clean:
	@echo "Cleaning build files..."
	@rm -rf $(OBJDIR) $(BINDIR)
	@rm -f src/ui/assets.c   # remove generated UI assets
	@echo "Clean complete"

# Run the built executable (requires root for VPN)
run: $(MAIN_TARGET)
	@echo "Running $(PROJECT)..."
	@./$(MAIN_TARGET) -v

# Run with VPN enabled (requires root)
run-vpn: $(MAIN_TARGET)
	@echo "Running $(PROJECT) with VPN gateway (requires root)..."
	@sudo ./$(MAIN_TARGET) -v

# Development build with debug symbols
dev: CFLAGS += -DDEBUG -g3 -O0
dev: clean all
	@echo "Starting development server..."
	@./$(MAIN_TARGET) -v

# Build only plugins
plugins-only: dirs $(PLUGIN_TARGETS)
	@echo "Plugins built"

# Install target (basic structure)
install: all
	@echo "Installing $(PROJECT)..."
	@install -d $(DESTDIR)$(PREFIX)/bin
	@install -d $(DESTDIR)$(LIBDIR)/$(PROJECT)/plugins
	@install -d $(DESTDIR)$(CONFDIR)
	@install -d $(DESTDIR)$(LOGDIR)
	@install -d $(DESTDIR)$(CACHEDIR)
	@install -m 755 $(MAIN_TARGET) $(DESTDIR)$(PREFIX)/bin/
	@install -m 644 $(PLUGIN_TARGETS) $(DESTDIR)$(LIBDIR)/$(PROJECT)/plugins/
	@echo "Installation complete"
	@echo ""
	@echo "Note: VPN gateway requires root/CAP_NET_ADMIN capabilities"
	@echo "To enable VPN, set vpn.enabled=true in $(CONFDIR)/deadlight.conf"

# Uninstall target
uninstall:
	@echo "Uninstalling $(PROJECT)..."
	@rm -f $(DESTDIR)$(PREFIX)/bin/$(PROJECT)
	@rm -rf $(DESTDIR)$(LIBDIR)/$(PROJECT)
	@echo "Uninstall complete"

# Help target
help:
	@echo "Deadlight Proxy v$(VERSION) - Available targets:"
	@echo "  all          - Build everything (default)"
	@echo "  clean        - Remove build artifacts"
	@echo "  run          - Build and run the proxy"
	@echo "  run-vpn      - Build and run with VPN (requires sudo)"
	@echo "  dev          - Build with debug flags and run"
	@echo "  plugins      - Build all plugins"
	@echo "  plugins-only - Build only plugins (no main executable)"
	@echo "  install      - Install to system directories"
	@echo "  uninstall    - Remove from system directories"
	@echo "  help         - Show this help message"
	@echo ""
	@echo "UI options (set UI=1 to enable the embedded web UI):"
	@echo "  make UI=1           - Build with UI support (requires libmicrohttpd)"
	@echo "  make clean UI=1     - Clean with UI assets"
	@echo ""
	@echo "VPN Gateway:"
	@echo "  - Automatically included in build"
	@echo "  - Requires root to run: sudo ./bin/deadlight"
	@echo "  - Enable in config: [vpn] enabled=true"

#=============================================================================
# Special Targets
#=============================================================================
.PHONY: all dirs clean run run-vpn dev plugins plugins-only install uninstall help