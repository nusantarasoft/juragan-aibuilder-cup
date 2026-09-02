# Patch Hermes WhatsApp bridge on the volume (Baileys 7.0.0-rc13 pairing fix).
# Root cause: fetchLatestBaileysVersion() returns a stale WA Web build; phone then
# shows "Couldn't link device". Use fetchLatestWaWebVersion() instead.
# Also use a Chrome-on-Ubuntu browser fingerprint WA accepts.
#
# Applied under: volumes/hermes/scripts/whatsapp-bridge/bridge.js
# Re-run after replacing that file from upstream Hermes image.

sed -i.bak-waver \
  -e 's/fetchLatestBaileysVersion, downloadMediaMessage/fetchLatestBaileysVersion, fetchLatestWaWebVersion, downloadMediaMessage/' \
  -e 's/createVersionResolver(fetchLatestBaileysVersion)/createVersionResolver(fetchLatestWaWebVersion)/' \
  -e "s/browser: \\['Hermes Agent', 'Chrome', '120.0'\\]/browser: ['Ubuntu', 'Chrome', '22.04.4']/" \
  /opt/data/scripts/whatsapp-bridge/bridge.js

grep -n "fetchLatestWaWebVersion\\|Ubuntu" /opt/data/scripts/whatsapp-bridge/bridge.js | head
