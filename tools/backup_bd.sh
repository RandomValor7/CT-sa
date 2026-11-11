#!/bin/bash
# Respaldo diario de la base de datos de Conexión Total Ingeniería.
#
# Uso manual:
#   ./tools/backup_bd.sh
#
# Uso programado (cron), corriendo todos los días a las 3:00 a.m.,
# guardando solo los últimos 14 respaldos:
#   0 3 * * * /ruta/completa/al/proyecto/tools/backup_bd.sh >> /var/log/conexiontotal_backup.log 2>&1
#
# Variables de entorno esperadas (las mismas que usa la app en .env):
#   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
# Si no las tienes exportadas en el shell, este script intenta leerlas
# del archivo .env del proyecto.

set -euo pipefail

DIR_PROYECTO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR_BACKUPS="${DIR_PROYECTO}/backups"
DIAS_A_CONSERVAR=14

if [ -f "${DIR_PROYECTO}/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    source "${DIR_PROYECTO}/.env"
    set +a
fi

MYSQL_HOST="${MYSQL_HOST:-localhost}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DB="${MYSQL_DB:-conexion_total}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

mkdir -p "${DIR_BACKUPS}"

FECHA=$(date +%Y-%m-%d_%H%M%S)
ARCHIVO="${DIR_BACKUPS}/${MYSQL_DB}_${FECHA}.sql.gz"

echo "[$(date)] Iniciando respaldo de '${MYSQL_DB}'..."

mysqldump \
    --host="${MYSQL_HOST}" \
    --port="${MYSQL_PORT}" \
    --user="${MYSQL_USER}" \
    --password="${MYSQL_PASSWORD}" \
    --single-transaction \
    --routines \
    --triggers \
    "${MYSQL_DB}" | gzip > "${ARCHIVO}"

echo "[$(date)] Respaldo guardado en: ${ARCHIVO}"

# Borra respaldos más viejos que DIAS_A_CONSERVAR para no llenar el disco.
find "${DIR_BACKUPS}" -name "${MYSQL_DB}_*.sql.gz" -mtime +${DIAS_A_CONSERVAR} -delete

echo "[$(date)] Listo. Respaldos conservados: $(find "${DIR_BACKUPS}" -name "${MYSQL_DB}_*.sql.gz" | wc -l)"

# Nota: esto respalda a disco local. Si el servidor se pierde por completo
# (falla de hardware, hosting cancelado, etc.), el respaldo se pierde con
# él. Para hosting compartido sin acceso a subir a S3/Drive por CLI, la
# forma más simple de tener una copia fuera del servidor es programar una
# tarea que descargue este archivo por SFTP/rsync a otra máquina, o subirlo
# a un bucket con `rclone` si el proveedor lo permite.
