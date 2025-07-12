#!/usr/bin/env bash
# scripts/restore_backup.sh

# Usage: restore_backup.sh <zip_file> <destination_base_path> <world_name>
ZIP_FILE="$1"
DEST_BASE="$2"
WORLD_NAME="$3"

echo "✔ [restore] Iniciando restauración de '$WORLD_NAME' desde '$ZIP_FILE'"

# Validar argumentos
if [ -z "$ZIP_FILE" ] || [ -z "$DEST_BASE" ] || [ -z "$WORLD_NAME" ]; then
  echo "✖ [restore] Uso: $0 <zip_file> <destination_base_path> <world_name>"
  exit 1
fi

WORLD_DIR="$DEST_BASE/worlds"
TARGET="$WORLD_DIR/$WORLD_NAME"

# 1) Mostrar sesiones antes de parar
echo "ℹ [restore] screen -ls (antes de stop):"
screen -ls

# 2) Encontrar sesión de screen activa
SESSION=$(screen -ls | awk '/\.minecraft_server/ {print $1; exit}')
if [ -z "$SESSION" ]; then
  echo "⚠ [restore] No se encontró sesión activa de screen 'minecraft_server'"
else
  echo "✔ [restore] Parando sesión: $SESSION"
  screen -S "$SESSION" -X stuff "say Restaurando copia de seguridad...$(printf \\r)" 2>/dev/null || true
  screen -S "$SESSION" -X stuff "save-off$(printf \\r)"                             2>/dev/null || true
  screen -S "$SESSION" -X stuff "stop$(printf \\r)"                                 2>/dev/null || true
fi

# 3) Esperar y luego mostrar sesiones tras el stop
sleep 5
echo "ℹ [restore] screen -ls (después de stop):"
screen -ls

# 4) Verificar proceso bedrock_server todavía vivo
echo "ℹ [restore] ps aux | grep bedrock_server (después de stop):"
ps aux | grep bedrock_server | grep -v grep

# 5) Borrar el mundo antiguo
if [ -d "$TARGET" ]; then
  echo "✔ [restore] Borrando directorio viejo: $TARGET"
  rm -rf "$TARGET"
else
  echo "⚠ [restore] No existía el directorio: $TARGET"
fi

# 6) Asegurar el directorio worlds/
mkdir -p "$WORLD_DIR"

# 7) Mostrar contenido del ZIP antes de descomprimir
echo "ℹ [restore] Contenido de '$ZIP_FILE':"
unzip -l "$ZIP_FILE"

# 8) Descomprimir sólo la carpeta del mundo dentro de worlds/
echo "✔ [restore] Descomprimiendo '$ZIP_FILE' en '$WORLD_DIR'"
unzip -o "$ZIP_FILE" -d "$WORLD_DIR"

# 9) Mostrar sesiones antes de arrancar de nuevo
echo "ℹ [restore] screen -ls (antes de start):"
screen -ls

# 10) Arrancar de nuevo el servidor
echo "✔ [restore] Iniciando servidor..."
screen -dmS minecraft_server bash -c "cd $DEST_BASE && LD_LIBRARY_PATH=. ./bedrock_server"

# 11) Esperar un momento y mostrar sesiones tras el start
sleep 3
echo "ℹ [restore] screen -ls (después de start):"
screen -ls

# 12) Verificar proceso bedrock_server arrancado
echo "ℹ [restore] ps aux | grep bedrock_server (después de start):"
ps aux | grep bedrock_server | grep -v grep

echo "✔ [restore] Mundo '$WORLD_NAME' restaurado correctamente."
