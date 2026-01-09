import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { errorHandler } from '../middleware/errorHandler';
import { router } from '../routes';

export function createApp() {
  const app = express();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));
  // Configurar CORS para permitir el frontend React en puerto 3000
  app.use(cors({
    origin: (origin, callback) => {
      // Permitir solicitudes sin origen (como aplicaciones móviles o Postman)
      if (!origin) return callback(null, true);
      // Permitir localhost:3000 (frontend React) y otros puertos locales para desarrollo
      if (origin === 'http://localhost:3000' ||
          origin.match(/^http:\/\/localhost:\d+$/) || 
          origin.match(/^http:\/\/127\.0\.0\.1:\d+$/)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true, // Permite cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Request logging via morgan + winston
  const stream = {
    write: (message: string) => logger.info(message.trim()),
  };
  app.use(morgan('combined', { stream }));

  // Rutas
  app.use('/api', router);

  // Manejo de errores
  app.use(errorHandler);

  return app;
}
