#!/bin/bash

SERVER_SCREEN="minecraft_server"
SERVER_PATH=$1

if [ -z "$SERVER_PATH" ]; then
  echo "Usage: $0 /path/to/bedrock-server"
  exit 1
fi

notify() {
  screen -S "$SERVER_SCREEN" -p 0 -X stuff "say $1$(printf \\r)"
}

notify "Server restarting in 10 seconds..."
for i in {9..1}; do
  sleep 1
  notify "Server restarting in ${i} second(s)..."
done

notify "Restarting now."
screen -S "$SERVER_SCREEN" -p 0 -X stuff "save-all$(printf \\r)"
screen -S "$SERVER_SCREEN" -p 0 -X stuff "stop$(printf \\r)"

echo "Waiting for server to stop..."
while pgrep -f bedrock_server > /dev/null; do
  sleep 1
done

cd "$SERVER_PATH" || exit 1
screen -dmS "$SERVER_SCREEN" bash -c "LD_LIBRARY_PATH=. ./bedrock_server"
