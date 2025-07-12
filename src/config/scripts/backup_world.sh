#!/bin/bash
# Usage: backup_world.sh <server_base_path> <world_name>

if [ $# -lt 2 ]; then
  echo "Usage: $0 <server_base_path> <world_name>"
  exit 1
fi

BASE_PATH="$1"
WORLD_NAME="$2"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
SRC="$BASE_PATH/worlds/$WORLD_NAME"
DST_DIR="$BASE_PATH/backups/worlds/$WORLD_NAME"
WORLD_ZIP="backup_world_${WORLD_NAME}_${TIMESTAMP}.zip"

mkdir -p "$DST_DIR" || { echo "❌ Cannot create $DST_DIR"; exit 1; }

# Notify server about backup start (non-fatal)
screen -S minecraft_server -p 0 -X stuff "say Starting world backup...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"              2>/dev/null || true
sleep 2

if [ -d "$SRC" ]; then
  (cd "$BASE_PATH/worlds" && zip -r "$DST_DIR/$WORLD_ZIP" "$WORLD_NAME") \
    && echo "✅ World compressed to $DST_DIR/$WORLD_ZIP" \
    || { echo "❌ Error compressing world"; exit 1; }
else
  echo "⚠ World '$WORLD_NAME' does not exist. Skipping."
  exit 1
fi

screen -S minecraft_server -p 0 -X stuff \
  "say World backup complete: $WORLD_ZIP$(printf \\r)" 2>/dev/null || true

exit 0
