import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from '../../../config/env';
import { logger } from '../../../lib/logger';
import { adUserMiddleware } from '../middleware/adUser';
import { errorHandler } from '../middleware/errorHandler';
import { router } from '../routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging via morgan + winston
  const stream = {
    write: (message: string) => logger.info(message.trim()),
  };
  app.use(morgan('combined', { stream }));

  // Captura usuario de AD desde headers enviados por IIS
  app.use(adUserMiddleware);

  // Rutas
  app.use('/api', router);

  // Manejo de errores
  app.use(errorHandler);

  return app;
}
