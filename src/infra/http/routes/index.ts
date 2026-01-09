import { Router } from 'express';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/whoami', (req, res) => {
  const authUser = (req as any).authUser;
  res.json({ 
    user: authUser || null,
    // Incluir información adicional si está disponible
    ...(authUser && {
      username: authUser.username,
      email: authUser.email,
      domain: authUser.domain,
      homedir: authUser.homedir,
    })
  });
});

export { router };
