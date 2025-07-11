#!/bin/bash
# scripts/backup_manual.sh

# Usage: backup_manual.sh <server_base_path> <world_name>
if [ $# -lt 2 ]; then
  echo "Usage: $0 <server_base_path> <world_name>"
  exit 1
fi

BASE_PATH="$1"
WORLD_NAME="$2"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

SOURCE_WORLDS="$BASE_PATH/worlds/$WORLD_NAME"

# Detect actual config folder
if [ -d "$BASE_PATH/server_config" ]; then
  SOURCE_CONFIG="$BASE_PATH/server_config"
elif [ -d "$BASE_PATH/config" ]; then
  SOURCE_CONFIG="$BASE_PATH/config"
else
  echo "❌ No config folder found (server_config/ or config/)"
  exit 1
fi

DEST_WORLDS="$BASE_PATH/backups/worlds/$WORLD_NAME"
DEST_SERVER="$BASE_PATH/backups/server"

mkdir -p "$DEST_WORLDS"  || { echo "❌ Cannot create $DEST_WORLDS"; exit 1; }
mkdir -p "$DEST_SERVER"  || { echo "❌ Cannot create $DEST_SERVER"; exit 1; }

# Notify server about backup start (non-fatal)
screen -S minecraft_server -p 0 -X stuff "say Starting backup...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"              2>/dev/null || true
sleep 2

# 1) World backup
WORLD_ZIP="backup_world_${WORLD_NAME}_${TIMESTAMP}.zip"
if [ -d "$SOURCE_WORLDS" ]; then
  (cd "$BASE_PATH/worlds" && zip -r "$DEST_WORLDS/$WORLD_ZIP" "$WORLD_NAME") \
    && echo "✅ World compressed to $DEST_WORLDS/$WORLD_ZIP" \
    || { echo "❌ Error compressing world"; exit 1; }
else
  echo "⚠ World '$WORLD_NAME' does not exist. Skipping world backup."
  exit 1
fi

# 2) Server config backup
SERVER_ZIP="backup_server_${TIMESTAMP}.zip"
zip -r "$DEST_SERVER/$SERVER_ZIP" "$SOURCE_CONFIG" \
  && echo "✅ Server compressed to $DEST_SERVER/$SERVER_ZIP" \
  || { echo "❌ Error compressing server"; exit 1; }

# Notify server about backup completion
screen -S minecraft_server -p 0 -X stuff \
  "say Backup complete: $WORLD_ZIP and $SERVER_ZIP$(printf \\r)" \
  2>/dev/null || true

exit 0
