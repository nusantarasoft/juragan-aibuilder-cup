#!/bin/bash
# generate-ssl.sh — Generate self-signed SSL certificates for development/staging
# Usage: ./scripts/generate-ssl.sh

set -e

SSL_DIR="$(cd "$(dirname "$0")/.." && pwd)/volumes/nginx/ssl"
DOMAIN="${1:-nusantarasoft.local}"
DAYS=365

echo "🔐 Generating self-signed SSL certificate for: $DOMAIN"
echo "   Output: $SSL_DIR"

mkdir -p "$SSL_DIR"

openssl req -x509 -nodes -days $DAYS -newkey rsa:2048 \
    -keyout "$SSL_DIR/key.pem" \
    -out "$SSL_DIR/cert.pem" \
    -subj "/C=ID/ST=Jakarta/L=Jakarta/O=Nusantarasoft/OU=Engineering/CN=$DOMAIN" \
    -addext "subjectAltName=DNS:$DOMAIN,DNS:*.$DOMAIN,DNS:localhost,IP:127.0.0.1"

echo ""
echo "✅ SSL certificates generated:"
echo "   Certificate: $SSL_DIR/cert.pem"
echo "   Private Key: $SSL_DIR/key.pem"
echo "   Domain:      $DOMAIN"
echo "   Valid for:    $DAYS days"
echo ""
echo "⚠️  This is a SELF-SIGNED certificate for development only."
echo "   For production, use Let's Encrypt or a purchased certificate."
echo ""
echo "   To use with nginx, uncomment the HTTPS server block in:"
echo "   volumes/nginx/nginx.conf"
