#!/bin/bash

PLAYER="$1"
BANLIST="/home/tomas/minecraft/ban-list.json"
ALLOWLIST="/home/tomas/minecraft/allowlist.json"

if [ -z "$PLAYER" ]; then
  echo "❌ ERROR: Nombre de jugador requerido"
  exit 1
fi

# Agregar al ban-list si no está
if ! grep -q "\"name\": \"$PLAYER\"" "$BANLIST"; then
  jq ". += [{\"name\": \"$PLAYER\"}]" "$BANLIST" > "$BANLIST.tmp" && mv "$BANLIST.tmp" "$BANLIST"
  echo "✅ Jugador $PLAYER añadido a ban-list.json"
fi

# Eliminar de allowlist
if grep -q "\"name\": \"$PLAYER\"" "$ALLOWLIST"; then
  jq "del(.[] | select(.name == \"$PLAYER\"))" "$ALLOWLIST" > "$ALLOWLIST.tmp" && mv "$ALLOWLIST.tmp" "$ALLOWLIST"
  echo "⛔ Jugador $PLAYER eliminado de allowlist.json"
fi

# Expulsar
SCRIPT="/home/tomas/minecraft-admin/scripts/kick_player.sh"
bash "$SCRIPT" "$PLAYER" "Fuiste baneado"
