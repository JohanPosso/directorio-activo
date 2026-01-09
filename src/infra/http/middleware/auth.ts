import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../../services/magicAuth';
import { findUserById } from '../../services/userService';
import { magicAuthConfig } from '../../services/magicAuth';
import { logWarn } from '../../../lib/logger';

// Extender el tipo Request para incluir el usuario
declare global {
  namespace Express {
    interface Request {
      user?: {
        id_usuario: string;
        email: string;
        displayName: string | null;
        activo: boolean;
      };
    }
  }
}

/**
 * Middleware de autenticación
 * Verifica la cookie de sesión y carga el usuario en req.user
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.[magicAuthConfig.SESSION_COOKIE_NAME];

    if (!sessionToken) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Verificar session token
    const { id_usuario } = verifySessionToken(sessionToken);

    // Buscar usuario en BD
    const user = await findUserById(id_usuario);

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    // Inyectar usuario en request
    req.user = {
      id_usuario: user.id_usuario,
      email: user.email,
      displayName: user.displayName,
      activo: user.activo,
    };

    next();
  } catch (error: any) {
    logWarn('Error en middleware de autenticación', { error: error?.message });
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

/**
 * Middleware opcional de autenticación
 * No falla si no hay token, solo inyecta el usuario si existe
 */
export async function optionalAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionToken = req.cookies?.[magicAuthConfig.SESSION_COOKIE_NAME];

    if (sessionToken) {
      const { id_usuario } = verifySessionToken(sessionToken);
      const user = await findUserById(id_usuario);

      if (user) {
        req.user = {
          id_usuario: user.id_usuario,
          email: user.email,
          displayName: user.displayName,
          activo: user.activo,
        };
      }
    }

    next();
  } catch (error) {
    // Si hay error, simplemente continuar sin usuario
    next();
  }
}
