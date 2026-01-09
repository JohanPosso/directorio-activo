#!/bin/bash

# Script para restaurar backup de base de datos en local
# Asegúrate de tener SQL Server local ejecutándose

set -e  # Salir si hay error

# Verificar argumentos
if [ -z "$1" ]; then
    echo "Uso: $0 <archivo_backup.bak> [nombre_bd_local]"
    echo ""
    echo "Ejemplo:"
    echo "  $0 backups/IEA_GestionDepuracion_20260109_120000.bak IEA_GestionDepuracion_Local"
    exit 1
fi

BACKUP_FILE="$1"
LOCAL_DB_NAME="${2:-IEA_GestionDepuracion_Local}"

# Configuración del servidor local
# Ajusta estos valores según tu instalación local de SQL Server
LOCAL_SERVER="localhost"
LOCAL_USER="${DB_USER:-sa}"  # Usuario administrador local
LOCAL_PASSWORD="${DB_PASSWORD:-}"  # Contraseña local (puede venir de variable de entorno)

echo "========================================="
echo "Restauración de Base de Datos"
echo "========================================="
echo "Servidor local: ${LOCAL_SERVER}"
echo "Archivo backup: ${BACKUP_FILE}"
echo "Base de datos destino: ${LOCAL_DB_NAME}"
echo ""

# Verificar que el archivo existe
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "⚠️  ERROR: El archivo de backup no existe: ${BACKUP_FILE}"
    exit 1
fi

# Verificar que sqlcmd está instalado
if ! command -v sqlcmd &> /dev/null; then
    echo "⚠️  ERROR: sqlcmd no está instalado"
    echo "   Instala SQL Server Command Line Utilities"
    exit 1
fi

# Solicitar contraseña si no está en variable de entorno
if [ -z "${LOCAL_PASSWORD}" ]; then
    echo -n "Ingresa la contraseña del usuario ${LOCAL_USER}: "
    read -s LOCAL_PASSWORD
    echo ""
fi

echo "Verificando conexión al servidor local..."
if ! sqlcmd -S "${LOCAL_SERVER}" -U "${LOCAL_USER}" -P "${LOCAL_PASSWORD}" -Q "SELECT @@VERSION" > /dev/null 2>&1; then
    echo "⚠️  ERROR: No se puede conectar al servidor local"
    echo "   Verifica que SQL Server esté ejecutándose"
    echo "   Verifica usuario y contraseña"
    exit 1
fi

echo "✓ Conexión al servidor local exitosa"
echo ""

# Obtener ruta absoluta del backup
BACKUP_FILE_ABS=$(cd "$(dirname "${BACKUP_FILE}")" && pwd)/$(basename "${BACKUP_FILE}")

echo "Iniciando restauración..."
echo "⚠️  ADVERTENCIA: Si la base de datos ${LOCAL_DB_NAME} existe, será reemplazada"
echo -n "¿Continuar? (s/N): "
read -r CONFIRM

if [[ ! "${CONFIRM}" =~ ^[Ss]$ ]]; then
    echo "Restauración cancelada"
    exit 0
fi

# Restaurar backup
sqlcmd -S "${LOCAL_SERVER}" -U "${LOCAL_USER}" -P "${LOCAL_PASSWORD}" -Q "
USE master;
GO

-- Cerrar conexiones existentes a la BD
IF EXISTS (SELECT name FROM sys.databases WHERE name = '${LOCAL_DB_NAME}')
BEGIN
    ALTER DATABASE [${LOCAL_DB_NAME}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [${LOCAL_DB_NAME}];
END
GO

-- Restaurar backup
RESTORE DATABASE [${LOCAL_DB_NAME}]
FROM DISK = N'${BACKUP_FILE_ABS}'
WITH MOVE '${DB_NAME}' TO '/var/opt/mssql/data/${LOCAL_DB_NAME}.mdf',
     MOVE '${DB_NAME}_Log' TO '/var/opt/mssql/data/${LOCAL_DB_NAME}_Log.ldf',
     REPLACE, STATS = 10;
GO
" -b

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✓ Restauración completada exitosamente"
    echo "========================================="
    echo "Base de datos: ${LOCAL_DB_NAME}"
    echo ""
    echo "Para conectarte:"
    echo "  sqlcmd -S ${LOCAL_SERVER} -U ${LOCAL_USER} -P '***' -d ${LOCAL_DB_NAME}"
else
    echo ""
    echo "========================================="
    echo "✗ Error al restaurar"
    echo "========================================="
    echo ""
    echo "Posibles soluciones:"
    echo "1. Verifica que el archivo .bak esté accesible"
    echo "2. Verifica permisos del usuario ${LOCAL_USER}"
    echo "3. Verifica que SQL Server local tenga espacio suficiente"
    echo "4. Revisa los nombres de los archivos de datos en el backup original"
    exit 1
fi
