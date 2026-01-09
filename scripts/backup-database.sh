#!/bin/bash

# Script para hacer backup de la base de datos de producción directamente en tu PC
# Servidor: ESIEA-08
# Base de datos: IEA_GestionDepuracion

set -e  # Salir si hay error

# Configuración del servidor remoto
SERVER="ESIEA-08\\SQLEXPRESS"
DB_NAME="IEA_GestionDepuracion"
USER="ieagp"
PASSWORD="ieagp2010"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Obtener información del PC local
PC_NAME=$(hostname)
PC_USER=$(whoami)

# Ruta local donde guardar el backup
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
BACKUP_FILE_LOCAL="${BACKUP_DIR}/IEA_GestionDepuracion_${TIMESTAMP}.bak"

# Crear directorio local de backups si no existe
mkdir -p "${BACKUP_DIR}"

echo "========================================="
echo "Backup de Base de Datos"
echo "========================================="
echo "Servidor remoto: ${SERVER}"
echo "Base de datos: ${DB_NAME}"
echo "PC local: ${PC_NAME}"
echo "Archivo backup: ${BACKUP_FILE_LOCAL}"
echo ""

# Verificar conectividad
echo "Verificando conectividad con el servidor..."
if ! ping -c 1 -W 2 ESIEA-08 > /dev/null 2>&1; then
    echo "⚠️  ERROR: No se puede alcanzar el servidor ESIEA-08"
    echo "   Verifica que estés conectado a la red correcta"
    exit 1
fi

echo "✓ Servidor accesible"
echo ""

# Para que SQL Server guarde el backup directamente en tu PC,
# necesitas compartir la carpeta 'backups' en tu Mac
# 
# IMPORTANTE: Comparte la carpeta antes de ejecutar:
# 1. En Finder, ve a: System Preferences > Sharing > File Sharing
# 2. Agrega la carpeta: ${BACKUP_DIR}
# 3. Asegúrate de que 'Everyone' o el usuario del servidor tenga acceso de lectura/escritura
# 4. Anota el nombre de la carpeta compartida (ej: "backups")

echo "⚠️  IMPORTANTE: Para guardar directamente en tu PC, necesitas:"
echo ""
echo "1. Compartir la carpeta de backups en tu Mac:"
echo "   ${BACKUP_DIR}"
echo ""
echo "2. En macOS:"
echo "   - Ve a: System Preferences > Sharing"
echo "   - Activa 'File Sharing'"
echo "   - Click en 'Options' y habilita 'Share files and folders using SMB'"
echo "   - Agrega la carpeta compartida: ${BACKUP_DIR}"
echo "   - Asegúrate de que tenga permisos de lectura/escritura"
echo ""
echo -n "¿Ya compartiste la carpeta? (s/N): "
read -r CONFIRM_SHARE

if [[ ! "${CONFIRM_SHARE}" =~ ^[Ss]$ ]]; then
    echo ""
    echo "Por favor comparte la carpeta primero y vuelve a ejecutar el script."
    exit 0
fi

echo ""
echo -n "Ingresa el nombre de la carpeta compartida (ej: 'backups', 'Backups'): "
read -r SHARE_NAME

if [ -z "${SHARE_NAME}" ]; then
    SHARE_NAME="backups"
fi

# Ruta UNC desde el servidor hacia tu PC
# Formato: \\PC-NAME\SHARE-NAME\archivo.bak
BACKUP_FILE_UNC="\\\\${PC_NAME}\\${SHARE_NAME}\\IEA_GestionDepuracion_${TIMESTAMP}.bak"

echo ""
echo "Iniciando backup directamente en tu PC..."
echo "Ruta UNC: ${BACKUP_FILE_UNC}"
echo ""

# Hacer backup directamente a la carpeta compartida de tu PC
sqlcmd -S "${SERVER}" -U "${USER}" -P "${PASSWORD}" -Q "
BACKUP DATABASE [${DB_NAME}]
TO DISK = N'${BACKUP_FILE_UNC}'
WITH FORMAT, INIT, 
NAME = N'${DB_NAME}-Full Database Backup', 
SKIP, NOREWIND, NOUNLOAD, STATS = 10
GO
" -b

if [ $? -eq 0 ] && [ -f "${BACKUP_FILE_LOCAL}" ]; then
    FILE_SIZE=$(du -h "${BACKUP_FILE_LOCAL}" | cut -f1)
    echo ""
    echo "========================================="
    echo "✓ Backup completado exitosamente"
    echo "========================================="
    echo "Archivo guardado en tu PC:"
    echo "  ${BACKUP_FILE_LOCAL}"
    echo "Tamaño: ${FILE_SIZE}"
    echo ""
    echo "Para restaurar en local cuando quieras:"
    echo "  ./scripts/restore-database.sh ${BACKUP_FILE_LOCAL}"
else
    echo ""
    echo "========================================="
    echo "⚠️  Backup creado pero verifica el archivo"
    echo "========================================="
    echo "El comando se ejecutó, pero verifica que el archivo esté en:"
    echo "  ${BACKUP_FILE_LOCAL}"
    echo ""
    echo "Si el archivo no está ahí, verifica:"
    echo "1. Que la carpeta esté compartida correctamente"
    echo "2. Que el servidor ESIEA-08 tenga acceso a tu PC"
    echo "3. Que los permisos de la carpeta compartida permitan escritura"
fi
