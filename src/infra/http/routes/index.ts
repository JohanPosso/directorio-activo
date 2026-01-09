import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../../config/env';
import { logInfo, logWarn, logError } from '../../../lib/logger';
import { sendMagicLinkEmail } from '../../services/email';
import { 
  createMagicToken, 
  createSessionToken,
  getSessionCookieConfig,
  magicAuthConfig, 
  verifyMagicToken 
} from '../../services/magicAuth';
import { findOrCreateUser } from '../../services/userService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

router.get('/debug/config', (_req, res) => {
  res.json({
    emailProvider: env.emailProvider,
    sendgridConfigured: !!env.sendgridApiKey && !!env.sendgridFromEmail,
    sendgridApiKeyLength: env.sendgridApiKey?.length || 0,
    sendgridFromEmail: env.sendgridFromEmail || 'no configurado',
    sendgridFromName: env.sendgridFromName || 'no configurado',
    smtpConfigured: !!env.emailHost && !!env.emailUser,
    emailHost: env.emailHost || 'no configurado',
    emailPort: env.emailPort,
    emailUser: env.emailUser || 'no configurado',
    emailFrom: env.emailFrom || 'no configurado',
    emailFromName: env.emailFromName || 'no configurado',
    magicLinkBaseUrl: env.magicLinkBaseUrl || 'no configurado',
    allowedEmailDomain: env.allowedEmailDomain || 'no configurado',
  });
});

// Solicitar enlace mágico (login sin contraseña)
router.post('/auth/magic/request', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
  });

  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const { email } = result.data;
  const domainAllowed = env.allowedEmailDomain.toLowerCase();
  const domain = email.split('@')[1]?.toLowerCase();
  // Dominios permitidos: el configurado + hotmail.com para pruebas
  const allowedDomains = [domainAllowed, 'hotmail.com'];

  if (!domain || !allowedDomains.includes(domain)) {
    logWarn('Dominio de email no permitido', { email, allowedDomains });
    return res.status(400).json({ error: 'Dominio de email no permitido' });
  }

  const token = createMagicToken(email);
  // El magic link debe apuntar al frontend React (puerto 3000)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const link = `${frontendUrl}/verify?token=${encodeURIComponent(token)}`;

  try {
    await sendMagicLinkEmail(email, link);
    logInfo('Enlace mágico enviado', { email });
  } catch (error: any) {
    logWarn('Error enviando enlace mágico', { email, error: error?.message });
    return res.status(500).json({ 
      error: 'No se pudo enviar el correo',
      details: error?.message 
    });
  }

  return res.json({ sent: true });
});

// Verificar enlace mágico y crear/obtener usuario
router.get('/auth/magic/verify', async (req, res) => {
  const token = req.query.token as string | undefined;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  try {
    // Verificar magic token (corto)
    const { email } = verifyMagicToken(token);

    // Buscar o crear usuario en la BD
    const user = await findOrCreateUser(email);

    // Generar session token (largo, configurable por días)
    const sessionToken = createSessionToken(user.id_usuario, email);

    // Establecer cookie de sesión (largo)
    res.cookie(magicAuthConfig.SESSION_COOKIE_NAME, sessionToken, getSessionCookieConfig());

    logInfo('Usuario autenticado exitosamente', { 
      id_usuario: user.id_usuario, 
      email 
    });

    return res.json({ 
      success: true, 
      user: {
        id_usuario: user.id_usuario,
        email: user.email,
        displayName: user.displayName,
        activo: user.activo,
      }
    });
  } catch (error: any) {
    logError('Error verificando magic link', { error: error?.message });
    if (error.message?.includes('Token inválido') || error.message?.includes('expirado')) {
      return res.status(400).json({ error: 'Token inválido o expirado' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener información del usuario actual (basado en la sesión)
router.get('/auth/me', authMiddleware, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  return res.json({
    user: {
      id_usuario: req.user.id_usuario,
      email: req.user.email,
      displayName: req.user.displayName,
      activo: req.user.activo,
    }
  });
});

export { router };
