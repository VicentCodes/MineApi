#!/bin/bash

# backup\_manual.sh

# Realiza backup del mundo activo y del servidor, organizando en carpetas:

# backups/worlds/\<nombre\_mundo>/ y backups/mineServer/

# Comprueba que recibió los argumentos

if \[ \$# -lt 2 ]; then
echo "Uso: \$0 \<ruta\_base\_servidor> \<nombre\_mundo>"
exit 1
fi

RUTA\_BASE="\$1"
MUNDO\_ACTIVO="\$2"
FECHA=\$(date +"%Y-%m-%d\_%H-%M-%S")

# Orígenes

ORIGEN\_MUNDOS="\$RUTA\_BASE/worlds/\$MUNDO\_ACTIVO"

# Detectar carpeta de configuración

if \[ -d "\$RUTA\_BASE/server\_config" ]; then
ORIGEN\_CONFIG="\$RUTA\_BASE/server\_config"
elif \[ -d "\$RUTA\_BASE/config" ]; then
ORIGEN\_CONFIG="\$RUTA\_BASE/config"
else
echo "❌ No existe carpeta de configuración (server\_config/ ni config/)"
exit 1
fi

# Destinos organizados

DESTINO\_MUNDOS="\$RUTA\_BASE/backups/worlds/\$MUNDO\_ACTIVO"
DESTINO\_CONFIG="\$RUTA\_BASE/backups/mineServer"

# Crear carpetas de backup si no existen

mkdir -p "\$DESTINO\_MUNDOS"  || { echo "❌ No se pudo crear \$DESTINO\_MUNDOS"; exit 1; }
mkdir -p "\$DESTINO\_CONFIG" || { echo "❌ No se pudo crear \$DESTINO\_CONFIG"; exit 1; }

# Intentar notificar inicio (ignorar fallo si no hay session)

screen -S minecraft\_server -p 0 -X stuff "say Iniciando backup...\$(printf \r)" 2>/dev/null || true
screen -S minecraft\_server -p 0 -X stuff "save-all\$(printf \r)"              2>/dev/null || true
sleep 2

# 1) Backup del mundo activo

NOMBRE\_BACKUP\_MUNDOS="backup\_mundos\_\${MUNDO\_ACTIVO}\_\${FECHA}.zip"
if \[ -d "\$ORIGEN\_MUNDOS" ]; then
(cd "\$RUTA\_BASE" && zip -r "\$DESTINO\_MUNDOS/\$NOMBRE\_BACKUP\_MUNDOS" "worlds/\$MUNDO\_ACTIVO")&#x20;
&& echo "✅ Mundo comprimido en \$DESTINO\_MUNDOS/\$NOMBRE\_BACKUP\_MUNDOS"&#x20;
|| { echo "❌ Error al comprimir mundo"; exit 1; }
else
echo "⚠ El mundo '\$MUNDO\_ACTIVO' no existe. No se realizará el backup."
exit 1
fi

# 2) Backup de configuración del servidor

NOMBRE\_BACKUP\_CONFIG="backup\_config\_\${FECHA}.zip"
zip -r "\$DESTINO\_CONFIG/\$NOMBRE\_BACKUP\_CONFIG" "\$ORIGEN\_CONFIG"&#x20;
&& echo "✅ Config comprimida en \$DESTINO\_CONFIG/\$NOMBRE\_BACKUP\_CONFIG"&#x20;
|| { echo "❌ Error al comprimir configuración"; exit 1; }

# Notificar fin (ignorar fallo si no hay session)

screen -S minecraft\_server -p 0 -X stuff "say Backup completo: \$NOMBRE\_BACKUP\_MUNDOS y \$NOMBRE\_BACKUP\_CONFIG\$(printf \r)"&#x20;
2>/dev/null || true

exit 0
