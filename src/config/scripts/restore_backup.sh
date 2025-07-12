#!/usr/bin/env bash
# scripts/restore_backup.sh

# Usage: restore_backup.sh <zip_file> <destination_base_path> <world_name>
ZIP_FILE="$1"
DEST_BASE="$2"
WORLD_NAME="$3"

# Función para enviar mensajes al servidor
avisar() {
  local MSG="$1"
  for SES in "${SESSIONS[@]}"; do
    screen -S "$SES" -p 0 -X stuff "say ${MSG}$(printf \\r)" 2>/dev/null || true
  done
}

echo "✔ [restore] Iniciando restauración de '$WORLD_NAME' desde '$ZIP_FILE'"

# Validar argumentos
if [ -z "$ZIP_FILE" ] || [ -z "$DEST_BASE" ] || [ -z "$WORLD_NAME" ]; then
  echo "✖ [restore] Uso: $0 <zip_file> <destination_base_path> <world_name>"
  exit 1
fi

WORLD_DIR="$DEST_BASE/worlds"
TARGET="$WORLD_DIR/$WORLD_NAME"

# 1) Listar sesiones antes
echo "ℹ [restore] screen -ls (antes de stop):"
screen -ls

# 2) Recoger todas las sesiones 'minecraft_server'
mapfile -t SESSIONS < <(screen -ls | awk '/\.minecraft_server/ {print $1}')
if [ ${#SESSIONS[@]} -eq 0 ]; then
  echo "⚠ [restore] No se encontraron sesiones activas de screen 'minecraft_server'"
else
  echo "✔ [restore] Se detectaron ${#SESSIONS[@]} sesiones."
  
  # Countdown de 10 segundos
  for i in $(seq 10 -1 1); do
    avisar "⚠ Restauración en curso: detención del servidor en ${i} segundos..."
    sleep 1
  done

  avisar "⛔ Deteniendo servidor para restauración..."
  avisar "save-off"

  # Enviar stop
  for SES in "${SESSIONS[@]}"; do
    screen -S "$SES" -p 0 -X stuff "stop$(printf \\r)" 2>/dev/null || true
  done
fi

# 3) Esperar a que mueran
sleep 8

# 4) Fuerza cierre de sesiones que persistan
if [ ${#SESSIONS[@]} -gt 0 ]; then
  echo "ℹ [restore] Forzando quit en sesiones restantes:"
  for SES in "${SESSIONS[@]}"; do
    echo "ℹ [restore] -> quit $SES"
    screen -S "$SES" -X quit 2>/dev/null || true
  done
  screen -wipe >/dev/null 2>&1
fi

# 5) Estado tras stop
echo "ℹ [restore] screen -ls (después de stop):"
screen -ls
echo "ℹ [restore] ps aux | grep bedrock_server (después de stop):"
ps aux | grep bedrock_server | grep -v grep || echo "→ No hay proceso bedrock_server"

# 6) Borrar el mundo antiguo
if [ -d "$TARGET" ]; then
  echo "✔ [restore] Borrando directorio viejo: $TARGET"
  rm -rf "$TARGET"
else
  echo "⚠ [restore] No existía el directorio: $TARGET"
fi

# 7) Asegurar directorio worlds/
mkdir -p "$WORLD_DIR"

# 8) Mostrar contenido del ZIP
echo "ℹ [restore] Contenido de '$ZIP_FILE':"
unzip -l "$ZIP_FILE"

# 9) Descomprimir mundo
echo "✔ [restore] Descomprimiendo '$ZIP_FILE' en '$WORLD_DIR'"
unzip -o "$ZIP_FILE" -d "$WORLD_DIR"

# 10) Listar sesiones antes de arrancar
echo "ℹ [restore] screen -ls (antes de start):"
screen -ls

# 11) Arrancar servidor
echo "✔ [restore] Iniciando servidor..."
screen -dmS minecraft_server bash -c "cd $DEST_BASE && LD_LIBRARY_PATH=. ./bedrock_server"

# 12) Espera y refresco
sleep 3
echo "ℹ [restore] screen -ls (después de start):"
screen -ls
echo "ℹ [restore] ps aux | grep bedrock_server (después de start):"
ps aux | grep bedrock_server | grep -v grep || echo "→ bedrock_server no arrancó"

echo "✔ [restore] Mundo '$WORLD_NAME' restaurado correctamente."
