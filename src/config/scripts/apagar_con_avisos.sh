#!/bin/bash

SERVER_SCREEN="minecraft_server"
MINUTOS=${1:-10}  # Por defecto 10 minutos si no se pasa argumento

screen -d "$SERVER_SCREEN"

avisar() {
  screen -S "$SERVER_SCREEN" -p 0 -X stuff "say $1$(printf \\r)"
}

if [ "$MINUTOS" -eq 10 ]; then
  avisar "El servidor se apagará en 10 minutos."
  sleep 300
  avisar "El servidor se apagará en 5 minutos."
  sleep 240
  avisar "El servidor se apagará en 1 minuto."
  sleep 30
  avisar "El servidor se apagará en 30 segundos."
  sleep 20
elif [ "$MINUTOS" -eq 5 ]; then
  avisar "El servidor se apagará en 5 minutos."
  sleep 240
  avisar "El servidor se apagará en 1 minuto."
  sleep 30
  avisar "El servidor se apagará en 30 segundos."
  sleep 20
elif [ "$MINUTOS" -eq 2 ]; then
  avisar "El servidor se apagará en 2 minutos."
  sleep 60
  avisar "El servidor se apagará en 1 minuto."
  sleep 30
  avisar "El servidor se apagará en 30 segundos."
  sleep 20
else
  avisar "Apagando en 10 segundos..."
fi

for i in {9..1}; do
  sleep 1
  avisar "Apagando en $i..."
done

avisar "Apagando servidor ahora."
screen -S "$SERVER_SCREEN" -p 0 -X stuff "save-all$(printf \\r)"
screen -S "$SERVER_SCREEN" -p 0 -X stuff "stop$(printf \\r)"
