#!/bin/bash
CONFIG="$(dirname "$0")/../server.yml"
BASE_PATH=$(yq eval -r '.server.basePath' "$CONFIG")        # -r to drop quotes
SCREEN_NAME=$(yq eval -r '.server.screenName' "$CONFIG")
LOG_FILE="$BASE_PATH/logs/latest.log"
PLAYERS_FILE=$(yq eval -r '.paths.playersFile' "$CONFIG")
TMP_FILE="/tmp/players_tmp.txt"

update_list() {
  # send the list command and wait for output
  screen -S "$SCREEN_NAME" -p 0 -X stuff "list\n"
  sleep 1

  # dump the console buffer
  screen -S "$SCREEN_NAME" -p 0 -X hardcopy "$TMP_FILE"
  sleep 0.1

  # grab the last “There are X/Y players online: …” line
  line=$(grep -E 'There are [0-9]+/[0-9]+ players online:' "$TMP_FILE" | tail -1)

  if [[ -z "$line" ]]; then
    players="(none)"
  else
    # strip everything up to and including the colon+space
    players="${line#*: }"
    [[ -z "$players" ]] && players="(none)"
  fi

  echo "$players" > "$PLAYERS_FILE"
}

# watch join/leave in the log and update
tail -n0 -F "$LOG_FILE" \
  | grep --line-buffered -E "joined the game|left the game" \
  | while read -r _; do
      update_list
    done
