import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

const formatter = printf(({ level, message, timestamp, ...meta }) => {
  const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} [${level}] ${message}${rest}`;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(timestamp(), formatter),
  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), formatter),
    }),
  ],
});

// Helpers tipados para evitar errores TS2345 al pasar objetos como meta
export const logInfo = (msg: string, meta?: unknown) => logger.info(msg, meta ?? {});
export const logWarn = (msg: string, meta?: unknown) => logger.warn(msg, meta ?? {});
export const logError = (msg: string, meta?: unknown) => logger.error(msg, meta ?? {});
export const logDebug = (msg: string, meta?: unknown) => logger.debug(msg, meta ?? {});

// Banner ASCII para inicio de aplicación
export const logBanner = () => {
  const banner = `
 ___    _                  _        
|_ _|__| | ___  __ _ _   _| |_ ___  
 | |/ _\` |/ _ \\/ _\` | | | | __/ _ \\ 
 | | (_| |  __/ (_| | |_| | || (_) |
|___\\__,_|\\___|\\__,_|\\__,_|\\__\\___/ 

  >> Aplicacion de depuracion de vehiculos <<
  `;
  logger.info(banner);
};
