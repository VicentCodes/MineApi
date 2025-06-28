#!/bin/bash

ARCHIVO="/tmp/jugadores_activos.txt"
SALIDA="/tmp/salida.txt"

# Detectar sesión activa
SESION=$(screen -ls | grep minecraft_server | awk '{print $1}' | head -n 1)

# Validar sesión
if [ -z "$SESION" ]; then
  echo "No hay sesión activa del servidor Minecraft." > "$ARCHIVO"
  exit 1
fi

# Ejecutar comando list
screen -S "$SESION" -p 0 -X stuff "list$(printf '\r')"
sleep 1
screen -S "$SESION" -X hardcopy -h "$SALIDA"

# Buscar última línea del comando list
LINE_INDEX=$(grep -n "There are [0-9]\+/[0-9]\+ players online:" "$SALIDA" | tail -n 1 | cut -d: -f1)

if [ -z "$LINE_INDEX" ]; then
  echo "Jugadores conectados: (ninguno)" > "$ARCHIVO"
else
  # Capturar la línea siguiente (los nombres)
  LINE2=$(sed -n "$((LINE_INDEX+1))p" "$SALIDA" | xargs)

  if [ -z "$LINE2" ]; then
    echo "Jugadores conectados: (ninguno)" > "$ARCHIVO"
  else
    echo "Jugadores conectados: $LINE2" > "$ARCHIVO"
  fi
fi
