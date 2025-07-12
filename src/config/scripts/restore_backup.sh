#!/usr/bin/env bash
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

echo "✔ [restore_backup.sh] Iniciando restauración de '$WORLD_NAME' desde '$ZIP_FILE'"

# 1) Encontrar sesión de screen activa
SESSION=$(screen -ls | awk '/\.minecraft_server/ {print $1; exit}')
if [ -z "$SESSION" ]; then
  echo "⚠ [restore_backup.sh] No se encontró sesión activa de screen 'minecraft_server'"
else
  echo "✔ [restore_backup.sh] Usando sesión: $SESSION"
  screen -S "$SESSION" -p 0 -X stuff "say Restaurando copia de seguridad...$(printf \\r)" 2>/dev/null || true
  screen -S "$SESSION" -p 0 -X stuff "save-off$(printf \\r)"                             2>/dev/null || true
  screen -S "$SESSION" -p 0 -X stuff "stop$(printf \\r)"                                 2>/dev/null || true
fi

sleep 5  # espera a que se apague

# 2) Borrar el mundo antiguo
if [ -d "$TARGET" ]; then
  echo "✔ [restore_backup.sh] Borrando directorio viejo: $TARGET"
  rm -rf "$TARGET"
fi

# 3) Asegurar el directorio worlds/
mkdir -p "$WORLD_DIR"

# 4) Descomprimir solo la carpeta del mundo dentro de worlds/
echo "✔ [restore_backup.sh] Descomprimiendo '$ZIP_FILE' en '$WORLD_DIR'"
unzip -o "$ZIP_FILE" -d "$WORLD_DIR"

# 5) Arrancar de nuevo el servidor
echo "✔ [restore_backup.sh] Iniciando servidor..."
screen -dmS minecraft_server bash -c "cd $DEST_BASE && LD_LIBRARY_PATH=. ./bedrock_server"

echo "✔ [restore_backup.sh] Mundo '$WORLD_NAME' restaurado correctamente."
