-- Migración de tabla User (versión corregida)
-- 1. Renombrar Id a id_usuario (GUID)
-- 2. Agregar campo activo (BIT/boolean)
-- 3. Eliminar campo Username

USE test;
GO

-- Paso 1: Identificar y eliminar restricciones que dependen de Username
DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'Username' AND CONSTRAINT_NAME LIKE 'UQ%';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE [User] DROP CONSTRAINT ' + @constraintName);
END
GO

-- Paso 2: Eliminar restricción de primary key en Id
DECLARE @pkConstraint NVARCHAR(200);
SELECT @pkConstraint = CONSTRAINT_NAME 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_NAME = 'User' AND CONSTRAINT_TYPE = 'PRIMARY KEY';

IF @pkConstraint IS NOT NULL
BEGIN
    EXEC('ALTER TABLE [User] DROP CONSTRAINT ' + @pkConstraint);
END
GO

-- Paso 3: Si id_usuario ya existe, eliminar su restricción única primero
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'id_usuario')
BEGIN
    DECLARE @uqIdUsuario NVARCHAR(200);
    SELECT @uqIdUsuario = CONSTRAINT_NAME 
    FROM INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE 
    WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'id_usuario' AND CONSTRAINT_NAME LIKE 'UQ%';
    
    IF @uqIdUsuario IS NOT NULL
    BEGIN
        EXEC('ALTER TABLE [User] DROP CONSTRAINT ' + @uqIdUsuario);
    END
    
    -- Si ya existe id_usuario, eliminarlo para recrearlo limpio
    ALTER TABLE [User] DROP COLUMN id_usuario;
END
GO

-- Paso 4: Eliminar campo Username
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'Username')
BEGIN
    ALTER TABLE [User] DROP COLUMN Username;
END
GO

-- Paso 5: Renombrar Id a id_usuario (primero crear nueva columna GUID)
-- Copiar datos existentes a una columna temporal, luego eliminar Id y renombrar
ALTER TABLE [User] ADD id_usuario_temp UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID();
GO

-- Actualizar id_usuario_temp con GUIDs únicos
-- (Ya se generaron con DEFAULT, pero asegurar que sean únicos)

-- Paso 6: Eliminar la columna Id antigua
IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'Id')
BEGIN
    ALTER TABLE [User] DROP COLUMN Id;
END
GO

-- Paso 7: Renombrar id_usuario_temp a id_usuario
EXEC sp_rename '[User].id_usuario_temp', 'id_usuario', 'COLUMN';
GO

-- Paso 8: Crear primary key en id_usuario
ALTER TABLE [User] ADD CONSTRAINT PK_User_id_usuario PRIMARY KEY (id_usuario);
GO

-- Paso 9: Agregar campo activo si no existe
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'User' AND COLUMN_NAME = 'activo')
BEGIN
    ALTER TABLE [User] ADD activo BIT NOT NULL DEFAULT 1;
END
GO

-- Verificar la estructura final
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    CHARACTER_MAXIMUM_LENGTH, 
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'User' 
ORDER BY ORDINAL_POSITION;
GO
