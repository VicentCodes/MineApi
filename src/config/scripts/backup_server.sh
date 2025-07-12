#!/bin/bash
# Usage: backup_server.sh <server_base_path>

if [ $# -lt 1 ]; then
  echo "Usage: $0 <server_base_path>"
  exit 1
fi

BASE_PATH="$1"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
# Detecta carpeta de config
if [ -d "$BASE_PATH/server_config" ]; then
  SRC="$BASE_PATH/server_config"
elif [ -d "$BASE_PATH/config" ]; then
  SRC="$BASE_PATH/config"
else
  echo "❌ No config folder found"
  exit 1
fi

DST_DIR="$BASE_PATH/backups/server"
SERVER_ZIP="backup_server_${TIMESTAMP}.zip"

mkdir -p "$DST_DIR" || { echo "❌ Cannot create $DST_DIR"; exit 1; }

zip -r "$DST_DIR/$SERVER_ZIP" "$SRC" \
  && echo "✅ Server compressed to $DST_DIR/$SERVER_ZIP" \
  || { echo "❌ Error compressing server"; exit 1; }

screen -S minecraft_server -p 0 -X stuff \
  "say Server backup complete: $SERVER_ZIP$(printf \\r)" 2>/dev/null || true

exit 0
