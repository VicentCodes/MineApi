#!/bin/bash

# Verifica que recibió los argumentos
if [ $# -lt 2 ]; then
  echo "Uso: $0 <ruta_base_servidor> <nombre_mundo>"
  exit 1
fi

RUTA_BASE="$1"
MUNDO_ACTIVO="$2"
FECHA=$(date +"%Y-%m-%d_%H-%M-%S")

# Orígenes y destinos
ORIGEN_MUNDOS="$RUTA_BASE/worlds/$MUNDO_ACTIVO"
ORIGEN_CONFIG="$RUTA_BASE/server_config"
DESTINO_MUNDOS="$RUTA_BASE/backups/mundos"
DESTINO_CONFIG="$RUTA_BASE/backups/server_config"

# Crear carpetas de backup si no existen
mkdir -p "$DESTINO_MUNDOS" || { echo "❌ No se pudo crear $DESTINO_MUNDOS"; exit 1; }
mkdir -p "$DESTINO_CONFIG" || { echo "❌ No se pudo crear $DESTINO_CONFIG"; exit 1; }

# Intentar enviar mensaje de inicio, pero NO abortar si falla
screen -S minecraft_server -p 0 -X stuff "say Iniciando backup...$(printf \\r)" 2>/dev/null || true
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"              2>/dev/null || true
sleep 2

# Backup del mundo activo
NOMBRE_BACKUP_MUNDOS="backup_mundos_${MUNDO_ACTIVO}_${FECHA}.zip"
if [ -d "$ORIGEN_MUNDOS" ]; then
  (cd "$RUTA_BASE" && zip -r "$DESTINO_MUNDOS/$NOMBRE_BACKUP_MUNDOS" "worlds/$MUNDO_ACTIVO") \
    && echo "✅ Mundo comprimido en $DESTINO_MUNDOS/$NOMBRE_BACKUP_MUNDOS" \
    || { echo "❌ Error al comprimir mundo"; exit 1; }
else
  echo "⚠ El mundo '$MUNDO_ACTIVO' no existe. No se realizará el backup."
  exit 1
fi

# Backup de configuración del servidor
NOMBRE_BACKUP_CONFIG="backup_config_${FECHA}.zip"
zip -r "$DESTINO_CONFIG/$NOMBRE_BACKUP_CONFIG" "$ORIGEN_CONFIG" \
  && echo "✅ Config comprimida en $DESTINO_CONFIG/$NOMBRE_BACKUP_CONFIG" \
  || { echo "❌ Error al comprimir configuración"; exit 1; }

# Intentar enviar mensaje de fin, pero NO abortar si falla
screen -S minecraft_server -p 0 -X stuff "say Backup completo: $NOMBRE_BACKUP_MUNDOS y $NOMBRE_BACKUP_CONFIG$(printf \\r)" \
  2>/dev/null || true

# Si llegamos aquí, todo salió bien
exit 0
