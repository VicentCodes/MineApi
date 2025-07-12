#!/usr/bin/env bash
# scripts/restore_backup.sh

# Usage: restore_backup.sh <zip_file> <destination_base_path> <world_name>
ZIP_FILE="$1"
DEST_BASE="$2"
WORLD_NAME="$3"

# Function to send messages to the Minecraft server
notify_server() {
  local MSG="$1"
  for SES in "${SESSIONS[@]}"; do
    screen -S "$SES" -p 0 -X stuff "say ${MSG}$(printf \\r)" 2>/dev/null || true
  done
}

echo "✔ [restore] Starting restoration of world '$WORLD_NAME' from '$ZIP_FILE'"

# Validate arguments
if [ -z "$ZIP_FILE" ] || [ -z "$DEST_BASE" ] || [ -z "$WORLD_NAME" ]; then
  echo "✖ [restore] Usage: $0 <zip_file> <destination_base_path> <world_name>"
  exit 1
fi

WORLD_DIR="$DEST_BASE/worlds"
TARGET="$WORLD_DIR/$WORLD_NAME"

# 1) List sessions before stopping
echo "ℹ [restore] screen -ls (before stop):"
screen -ls

# 2) Gather all 'minecraft_server' sessions
mapfile -t SESSIONS < <(screen -ls | awk '/\.minecraft_server/ {print $1}')
if [ ${#SESSIONS[@]} -eq 0 ]; then
  echo "⚠ [restore] No active 'minecraft_server' screen sessions found"
else
  echo "✔ [restore] Detected ${#SESSIONS[@]} session(s)."

  # 10-second countdown with in-game warnings
  for i in $(seq 10 -1 1); do
    notify_server "⚠ Restoration in progress: server shutting down in ${i} second(s)..."
    sleep 1
  done

  notify_server "⛔ Shutting down server for restoration..."
  notify_server "save-off"

  # Send stop command to each session
  for SES in "${SESSIONS[@]}"; do
    screen -S "$SES" -p 0 -X stuff "stop$(printf \\r)" 2>/dev/null || true
  done
fi

# 3) Wait for sessions to end
sleep 8

# 4) Force-quit any lingering sessions
if [ ${#SESSIONS[@]} -gt 0 ]; then
  echo "ℹ [restore] Forcing quit on remaining sessions:"
  for SES in "${SESSIONS[@]}"; do
    echo "ℹ [restore] -> quit $SES"
    screen -S "$SES" -X quit 2>/dev/null || true
  done
  screen -wipe >/dev/null 2>&1
fi

# 5) Status after stop
echo "ℹ [restore] screen -ls (after stop):"
screen -ls
echo "ℹ [restore] ps aux | grep bedrock_server (after stop):"
ps aux | grep bedrock_server | grep -v grep || echo "→ No bedrock_server process running"

# 6) Remove old world directory
if [ -d "$TARGET" ]; then
  echo "✔ [restore] Removing old world directory: $TARGET"
  rm -rf "$TARGET"
else
  echo "⚠ [restore] World directory not found: $TARGET"
fi

# 7) Ensure worlds directory exists
mkdir -p "$WORLD_DIR"

# 8) List ZIP contents
echo "ℹ [restore] Contents of '$ZIP_FILE':"
unzip -l "$ZIP_FILE"

# 9) Extract world
echo "✔ [restore] Extracting '$ZIP_FILE' into '$WORLD_DIR'"
unzip -o "$ZIP_FILE" -d "$WORLD_DIR"

# 10) Sessions before restart
echo "ℹ [restore] screen -ls (before start):"
screen -ls

# 11) Start the server
echo "✔ [restore] Starting server..."
screen -dmS minecraft_server bash -c "cd $DEST_BASE && LD_LIBRARY_PATH=. ./bedrock_server"

# 12) Brief wait and final status
sleep 3
echo "ℹ [restore] screen -ls (after start):"
screen -ls
echo "ℹ [restore] ps aux | grep bedrock_server (after start):"
ps aux | grep bedrock_server | grep -v grep || echo "→ bedrock_server did not start"

echo "✔ [restore] World '$WORLD_NAME' restored successfully."
