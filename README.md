# Aplicación de Depuración de Vehículos

Sistema de depuración de vehículos con integración de Active Directory mediante proxy IIS.

## Stack Tecnológico

- Node.js + TypeScript
- Express.js
- Prisma ORM
- Winston (logging)
- Morgan (HTTP logging)

## Características

- Autenticación mediante Active Directory (via IIS headers)
- Arquitectura modular
- Logging robusto
- Manejo de errores centralizado

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Variables de Entorno

Crea un archivo `.env` con:

```
DATABASE_URL=tu_conexion_sql_server
PORT=3000
LOG_LEVEL=info
```

## Pruebas de Active Directory

En desarrollo, puedes simular los headers de IIS:

```bash
curl -H "X-Forwarded-User: DOMINIO\Miguel" http://localhost:3000/api/whoami
```
