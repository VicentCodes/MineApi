#!/bin/bash

SERVER_SCREEN="minecraft_server"

# Forzar detach por si alguien dejó el screen abierto
screen -d "$SERVER_SCREEN"

avisar() {
  screen -S "$SERVER_SCREEN" -p 0 -X stuff "say $1$(printf \\r)"
}
avisar "Reinicio en 10 segundos..."
for i in {9..1}; do
  sleep 1
  avisar "Reinicio en $i..."
done

avisar "Reiniciando servidor ahora."
screen -S "$SERVER_SCREEN" -p 0 -X stuff "save-all$(printf \\r)"
screen -S "$SERVER_SCREEN" -p 0 -X stuff "stop$(printf \\r)"

# Espera a que el proceso termine realmente
echo "Esperando a que bedrock_server termine..."
while pgrep -f bedrock_server > /dev/null; do
  sleep 1
done

# ¡Ahora sí, relanza!
cd /home/tomas/minecraft
screen -dmS "$SERVER_SCREEN" ./bedrock_server
