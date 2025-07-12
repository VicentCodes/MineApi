#!/bin/bash

ZIP="$1"
DESTINO_BASE="$2"

if [ -z "$ZIP" ] || [ -z "$DESTINO_BASE" ]; then
  echo "Uso: $0 <archivo_zip> <ruta_base_destino>"
  exit 1
fi

WORLD_DEST="$DESTINO_BASE/worlds"

# Detener el servidor
screen -S minecraft_server -p 0 -X stuff "say Restaurando backup...$(printf \\r)"
screen -S minecraft_server -p 0 -X stuff "save-off$(printf \\r)"
screen -S minecraft_server -p 0 -X stuff "stop$(printf \\r)"
sleep 5

# Verificar si la carpeta worlds existe y renombrarla antes de restaurar
if [ -d "$WORLD_DEST" ]; then
  mv "$WORLD_DEST" "${WORLD_DEST}_respaldo_$(date +%s)"
fi

# Extraer el zip (asegurándose de que solo la carpeta worlds se restaure)
unzip -o "$ZIP" -d "$DESTINO_BASE"

# Iniciar el servidor después de restaurar
screen -dmS minecraft_server bash -c "cd $DESTINO_BASE && ./start.sh"

# Confirmación
echo "Backup restaurado desde $ZIP a $WORLD_DEST"
