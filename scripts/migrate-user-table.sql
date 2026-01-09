-- Migración de tabla User:
-- 1. Renombrar Id a id_usuario
-- 2. Cambiar tipo a UNIQUEIDENTIFIER (GUID)
-- 3. Agregar campo activo (BIT/boolean)
-- 4. Eliminar campo Username

USE test;
GO

-- Paso 1: Agregar nueva columna id_usuario como UNIQUEIDENTIFIER
ALTER TABLE [User] ADD id_usuario UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID();
GO

-- Paso 2: Generar GUIDs únicos para los registros existentes
-- (Ya se generaron con DEFAULT, pero asegurémonos que sean únicos)

-- Paso 3: Agregar campo activo (por defecto true/1)
ALTER TABLE [User] ADD activo BIT NOT NULL DEFAULT 1;
GO

-- Paso 4: Crear índice único en id_usuario
ALTER TABLE [User] ADD CONSTRAINT UQ_User_id_usuario UNIQUE (id_usuario);
GO

-- Paso 5: Copiar los datos si es necesario (en este caso ya tenemos datos, pero vamos a mantenerlos)
-- Los GUIDs ya se generaron automáticamente con DEFAULT NEWID()

-- Paso 6: Eliminar la columna Username
ALTER TABLE [User] DROP COLUMN Username;
GO

-- Paso 7: Eliminar la restricción y columna Id antigua
-- Primero eliminamos la primary key en Id
ALTER TABLE [User] DROP CONSTRAINT PK__User__3214EC071A14E395;
GO

-- Luego eliminamos la columna Id
ALTER TABLE [User] DROP COLUMN Id;
GO

-- Paso 8: Establecer id_usuario como primary key
ALTER TABLE [User] ADD CONSTRAINT PK_User_id_usuario PRIMARY KEY (id_usuario);
GO

-- Verificar la estructura final
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE,
    COLUMNPROPERTY(OBJECT_ID('dbo.User'), COLUMN_NAME, 'IsIdentity') AS IsIdentity
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'User' 
ORDER BY ORDINAL_POSITION;
GO
