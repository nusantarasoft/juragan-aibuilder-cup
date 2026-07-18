#!/bin/sh
# Apply WhatsApp Web MsgKey $1 fallback before WAHA starts (WEBJS inbound drop bug).
if [ -f /patches/waha-patch-lid-id.js ]; then
  node /patches/waha-patch-lid-id.js || true
fi
exec /entrypoint.sh "$@"
