#!/bin/bash
# scripts/restore_backup.sh

# Usage: restore_backup.sh <zip_file> <destination_base_path> <world_name>
ZIP_FILE="$1"
DEST_BASE="$2"
WORLD_NAME="$3"

if [ -z "$ZIP_FILE" ] || [ -z "$DEST_BASE" ] || [ -z "$WORLD_NAME" ]; then
  echo "Usage: $0 <zip_file> <destination_base_path> <world_name>"
  exit 1
fi

WORLD_DIR="$DEST_BASE/worlds"
TARGET="$WORLD_DIR/$WORLD_NAME"

# 1) Notificar al servidor y pararlo
screen -S minecraft_server -p 0 -X stuff "say Restaurando copia de seguridad...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-off$(printf \\r)"                             2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "stop$(printf \\r)"                                 2>/dev/null || true
sleep 5

# 2) Renombrar el mundo existente (si lo hay) antes de restaurar
if [ -d "$TARGET" ]; then
  mv "$TARGET" "${TARGET}_backup_$(date +%s)"
fi

# 3) Asegurar que exista la carpeta worlds
mkdir -p "$WORLD_DIR"

# 4) Descomprimir el zip dentro de worlds/
#    (el .zip contiene una carpeta con el nombre del mundo)
unzip -o "$ZIP_FILE" -d "$WORLD_DIR"

# 5) Arrancar de nuevo el servidor
screen -dmS minecraft_server bash -c "cd $DEST_BASE && LD_LIBRARY_PATH=. ./bedrock_server"

# 6) Mensaje de confirmación
echo "Copia restaurada desde $ZIP_FILE en $TARGET"
