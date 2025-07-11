#!/bin/bash
# backup_manual.sh

# Verifica que recibió los argumentos
if [ $# -lt 2 ]; then
  echo "Uso: $0 <ruta_base_servidor> <nombre_mundo>"
  exit 1
fi

RUTA_BASE="$1"
MUNDO_ACTIVO="$2"
FECHA=$(date +"%Y-%m-%d_%H-%M-%S")

# Orígenes
ORIGEN_MUNDOS="$RUTA_BASE/worlds/$MUNDO_ACTIVO"

# Detecta carpeta de configuración real
if [ -d "$RUTA_BASE/server_config" ]; then
  ORIGEN_CONFIG="$RUTA_BASE/server_config"
elif [ -d "$RUTA_BASE/config" ]; then
  ORIGEN_CONFIG="$RUTA_BASE/config"
else
  echo "❌ No existe carpeta de configuración (server_config/ ni config/)"
  exit 1
fi

# Destinos
DESTINO_MUNDOS="$RUTA_BASE/backups/worlds/$MUNDO_ACTIVO"
DESTINO_SERVER="$RUTA_BASE/backups/server"

# Crear carpetas de backup si no existen
mkdir -p "$DESTINO_MUNDOS"  || { echo "❌ No se pudo crear $DESTINO_MUNDOS"; exit 1; }
mkdir -p "$DESTINO_SERVER"  || { echo "❌ No se pudo crear $DESTINO_SERVER"; exit 1; }

# Mensaje al servidor (no aborta si falla la notificación)
screen -S minecraft_server -p 0 -X stuff "say Iniciando backup...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"              2>/dev/null || true
sleep 2

# 1) Backup del mundo activo (solo la carpeta del mundo)
NOMBRE_BACKUP_MUNDOS="backup_mundos_${MUNDO_ACTIVO}_${FECHA}.zip"
if [ -d "$ORIGEN_MUNDOS" ]; then
  # Nos movemos dentro de worlds para que el zip solo contenga <MUNDO_ACTIVO>/
  (cd "$RUTA_BASE/worlds" && zip -r "$DESTINO_MUNDOS/$NOMBRE_BACKUP_MUNDOS" "$MUNDO_ACTIVO") \
    && echo "✅ Mundo comprimido en $DESTINO_MUNDOS/$NOMBRE_BACKUP_MUNDOS" \
    || { echo "❌ Error al comprimir mundo"; exit 1; }
else
  echo "⚠ El mundo '$MUNDO_ACTIVO' no existe. No se realizará el backup."
  exit 1
fi

# 2) Backup del servidor (config, plugins, etc.)
NOMBRE_BACKUP_SERVER="backup_server_${FECHA}.zip"
zip -r "$DESTINO_SERVER/$NOMBRE_BACKUP_SERVER" "$ORIGEN_CONFIG" \
  && echo "✅ Servidor comprimido en $DESTINO_SERVER/$NOMBRE_BACKUP_SERVER" \
  || { echo "❌ Error al comprimir servidor"; exit 1; }

# Mensaje de fin (ignora errores de screen)
screen -S minecraft_server -p 0 -X stuff \
  "say Backup completo: $NOMBRE_BACKUP_MUNDOS y $NOMBRE_BACKUP_SERVER$(printf \\r)" \
  2>/dev/null || true

exit 0
