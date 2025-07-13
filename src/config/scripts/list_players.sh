#mkdir -p logs
#./bedrock_server --log-json 2>&1 | tee logs/latest.log
# chmod +x /home/mainserver/minecraft/bedrock-server/list_players.sh
# cd /home/mainserver/minecraft/bedrock-server
#./list_players.sh
#!/usr/bin/env bash

LOG="/home/mainserver/minecraft/bedrock-server/logs/latest.log"

awk '
  /Player connected:/ {
    match($0, /Player connected: ([^,]+), xuid: ([0-9]+)/, a)
    connected[a[1]] = a[2]
  }
  /Player disconnected:/ {
    match($0, /Player disconnected: ([^,]+), xuid: ([0-9]+)/, a)
    delete connected[a[1]]
  }
  END {
    printf("[")
    sep=""
    for (name in connected) {
      printf("%s{\"name\": \"%s\", \"xuid\": \"%s\"}", sep, name, connected[name])
      sep=","
    }
    printf("]\n")
  }
' "$LOG"
