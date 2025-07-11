#!/bin/bash
# scripts/manual_backup.sh

# Usage: manual_backup.sh <server_base_path> <world_name>
if [ $# -lt 2 ]; then
  echo "Usage: $0 <server_base_path> <world_name>"
  exit 1
fi

BASE_PATH="$1"
WORLD_NAME="$2"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# World folder
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

# Destinations
DEST_WORLDS="$BASE_PATH/backups/worlds/$WORLD_NAME"
DEST_SERVER="$BASE_PATH/backups/server"

# Create backup folders
mkdir -p "$DEST_WORLDS"  || { echo "❌ Could not create $DEST_WORLDS"; exit 1; }
mkdir -p "$DEST_SERVER"  || { echo "❌ Could not create $DEST_SERVER"; exit 1; }

# Notify server (ignore failures)
screen -S minecraft_server -p 0 -X stuff "say Starting backup...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"           2>/dev/null || true
sleep 2

# 1) World backup
WORLD_ARCHIVE="world_backup_${WORLD_NAME}_${TIMESTAMP}.zip"
if [ -d "$SOURCE_WORLDS" ]; then
  (cd "$BASE_PATH/worlds" && zip -r "$DEST_WORLDS/$WORLD_ARCHIVE" "$WORLD_NAME") \
    && echo "✅ World archived to $DEST_WORLDS/$WORLD_ARCHIVE" \
    || { echo "❌ Error compressing world"; exit 1; }
else
  echo "⚠ World '$WORLD_NAME' does not exist. Skipping."
  exit 1
fi

# 2) Server backup (config, plugins, etc.)
SERVER_ARCHIVE="server_backup_${TIMESTAMP}.zip"
zip -r "$DEST_SERVER/$SERVER_ARCHIVE" "$SOURCE_CONFIG" \
  && echo "✅ Server archived to $DEST_SERVER/$SERVER_ARCHIVE" \
  || { echo "❌ Error compressing server"; exit 1; }

# Notify completion
screen -S minecraft_server -p 0 -X stuff \
  "say Backup complete: $WORLD_ARCHIVE and $SERVER_ARCHIVE$(printf \\r)" \
  2>/dev/null || true

exit 0
