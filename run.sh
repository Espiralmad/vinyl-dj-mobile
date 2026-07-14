#!/bin/bash
# Sirve la PWA en la red local para probarla desde el iPhone.
# En el iPhone abre:  http://<IP-de-tu-Mac>:8770
cd "$(dirname "$0")"
PORT=8770
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
echo "──────────────────────────────────────────────"
echo "  Vinyl DJ Mobile"
echo "  En el iPhone (misma WiFi) abre:"
echo "    http://${IP:-<IP-de-tu-Mac>}:$PORT"
echo "──────────────────────────────────────────────"
python3 -m http.server "$PORT"
