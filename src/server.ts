import { createApp } from './infra/http/server/app';
import { env } from './config/env';
import { logError, logInfo, logBanner } from './lib/logger';

async function bootstrap() {
  logBanner();

  const app = createApp();

  app.listen(env.port, () => {
    logInfo('HTTP server listening', { port: env.port });
  });
}

bootstrap().catch((err) => {
  logError('Failed to start server', { err });
  process.exit(1);
});
