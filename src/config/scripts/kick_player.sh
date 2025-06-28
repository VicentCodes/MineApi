#!/bin/bash

PLAYER="$1"
MESSAGE="$2"

if [ -z "$PLAYER" ]; then
  echo "❌ ERROR: No se proporcionó nombre de jugador"
  exit 1
fi

SESSION="minecraft_server"

# Si no hay mensaje, usar uno por defecto
if [ -z "$MESSAGE" ]; then
  MESSAGE="Fuiste expulsado por un administrador. Vuelve a iniciar sesión."
fi

# Comando para expulsar por pantalla
COMMAND="kick \"$PLAYER\" \"$MESSAGE\""
screen -S "$SESSION" -p 0 -X stuff "$COMMAND\n"

echo "✅ Jugador $PLAYER expulsado con mensaje: $MESSAGE"
