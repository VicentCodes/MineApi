#!/bin/bash

SERVER_SCREEN="minecraft_server"
MINUTES=${1:-10}  # Default to 10 minutes if no argument is passed

# Function to send messages to the Minecraft server
notify() {
  screen -S "$SERVER_SCREEN" -p 0 -X stuff "say $1$(printf \\r)"
}

# Countdown warnings based on the chosen delay
if [ "$MINUTES" -eq 10 ]; then
  notify "Server will shut down in 10 minutes."
  sleep 300
  notify "Server will shut down in 5 minutes."
  sleep 240
  notify "Server will shut down in 1 minute."
  sleep 30
  notify "Server will shut down in 30 seconds."
  sleep 20
elif [ "$MINUTES" -eq 5 ]; then
  notify "Server will shut down in 5 minutes."
  sleep 240
  notify "Server will shut down in 1 minute."
  sleep 30
  notify "Server will shut down in 30 seconds."
  sleep 20
elif [ "$MINUTES" -eq 2 ]; then
  notify "Server will shut down in 2 minutes."
  sleep 60
  notify "Server will shut down in 1 minute."
  sleep 30
  notify "Server will shut down in 30 seconds."
  sleep 20
else
  notify "Shutting down in 10 seconds..."
fi

# Final 10-second countdown
for i in {9..1}; do
  sleep 1
  notify "Shutting down in $i..."
done

# Perform save and stop
notify "Shutting down now."
screen -S "$SERVER_SCREEN" -p 0 -X stuff "save-all$(printf \\r)"
screen -S "$SERVER_SCREEN" -p 0 -X stuff "stop$(printf \\r)"

#mkdir -p logs
#./bedrock_server --log-json 2>&1 | tee logs/latest.log
# chmod +x /home/mainserver/minecraft/bedrock-server/list_players.sh
# cd /home/mainserver/minecraft/bedrock-server
#./list_players.sh
