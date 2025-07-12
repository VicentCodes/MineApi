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

# 1) Notificar y parar el servidor
screen -S minecraft_server -p 0 -X stuff "say Restaurando copia de seguridad...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-off$(printf \\r)"                             2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "stop$(printf \\r)"                                 2>/dev/null || true
sleep 5  # espera a que se apague

# 2) Borrar el mundo antiguo
if [ -d "$TARGET" ]; then
  rm -rf "$TARGET"
fi

# 3) Asegurar el directorio worlds/
mkdir -p "$WORLD_DIR"

# 4) Descomprimir solo la carpeta del mundo dentro de worlds/
#    (el ZIP debe contener una carpeta llamada EXACTAMENTE $WORLD_NAME)
unzip -o "$ZIP_FILE" -d "$WORLD_DIR"

# 5) Arrancar de nuevo el servidor
screen -dmS minecraft_server bash -c "cd $DEST_BASE && LD_LIBRARY_PATH=. ./bedrock_server"

echo "✔ Mundo '$WORLD_NAME' restaurado desde $ZIP_FILE"
