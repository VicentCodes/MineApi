#!/bin/bash

# Verifica que recibió los argumentos
if [ $# -lt 2 ]; then
  echo "Uso: $0 <ruta_base_servidor> <nombre_mundo>"
  exit 1
fi

RUTA_BASE="$1"
MUNDO_ACTIVO="$2"  # Mundo activo proporcionado
FECHA=$(date +"%Y-%m-%d_%H-%M-%S")

# Orígenes relativos a la ruta base
ORIGEN_MUNDOS="$RUTA_BASE/worlds/$MUNDO_ACTIVO"
ORIGEN_CONFIG="$RUTA_BASE/server_config"

# Destinos
DESTINO_BASE="$RUTA_BASE/backups"
DESTINO_MUNDOS="$DESTINO_BASE/mundos"
DESTINO_CONFIG="$DESTINO_BASE/server_config"

# Crear carpetas de backup si no existen
mkdir -p "$DESTINO_MUNDOS"
mkdir -p "$DESTINO_CONFIG"

# Mensaje al servidor
screen -S minecraft_server -p 0 -X stuff "say Iniciando backup...$(printf \\r)"
screen -S minecraft_server -p 0 -X stuff "save-all$(printf \\r)"
sleep 2

# Backup del mundo activo
NOMBRE_BACKUP_MUNDOS="backup_mundos_${MUNDO_ACTIVO}_${FECHA}.zip" 
if [ -d "$ORIGEN_MUNDOS" ]; then
  (cd "$RUTA_BASE" && zip -r "$DESTINO_MUNDOS/$NOMBRE_BACKUP_MUNDOS" "worlds/$MUNDO_ACTIVO" > /dev/null)
else
  echo "⚠ El mundo '$MUNDO_ACTIVO' no existe. No se realizará el backup."
  exit 1
fi

# Backup de configuración del servidor
NOMBRE_BACKUP_CONFIG="backup_config_${FECHA}.zip"
zip -r "$DESTINO_CONFIG/$NOMBRE_BACKUP_CONFIG" "$ORIGEN_CONFIG" > /dev/null

# Confirmación
screen -S minecraft_server -p 0 -X stuff "say Backup completo: $NOMBRE_BACKUP_MUNDOS y $NOMBRE_BACKUP_CONFIG$(printf \\r)"
