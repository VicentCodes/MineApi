#!/bin/bash

PLAYER="$1"
BANLIST="/home/tomas/minecraft/ban-list.json"

if [ -z "$PLAYER" ]; then
  echo "❌ ERROR: Nombre de jugador requerido"
  exit 1
fi

# Eliminar del ban-list si está
if grep -q "\"name\": \"$PLAYER\"" "$BANLIST"; then
  jq "del(.[] | select(.name == \"$PLAYER\"))" "$BANLIST" > "$BANLIST.tmp" && mv "$BANLIST.tmp" "$BANLIST"
  echo "✅ Jugador $PLAYER eliminado de ban-list.json"
else
  echo "⚠️ Jugador $PLAYER no estaba en ban-list.json"
fi
