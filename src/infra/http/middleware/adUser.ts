import { Request, Response, NextFunction } from 'express';
import { logDebug } from '../../../lib/logger';

// Middlewares to capture user provided by IIS (Windows Auth) via headers
// Expected headers (set by IIS reverse proxy):
//   - X-Forwarded-User
//   - REMOTE_USER
//   - AUTH_USER
// We normalize to a simple username (without domain) and also keep the raw value.

const headerKeys = ['x-forwarded-user', 'remote-user', 'auth-user'];

const normalizeUser = (raw?: string | string[]): string | undefined => {
  if (!raw) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  // Examples: "DOMINIO\\usuario", "DOMINIO/usuario", "usuario@dominio.local", "usuario"
  const clean = value.trim();
  const domainSep = clean.includes('\\') ? '\\' : clean.includes('/') ? '/' : null;
  if (domainSep) {
    const parts = clean.split(domainSep);
    return parts[1] || parts[0];
  }
  const atIdx = clean.indexOf('@');
  if (atIdx > 0) return clean.substring(0, atIdx);
  return clean;
};

export const adUserMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  let rawUser: string | undefined;

  for (const key of headerKeys) {
    const v = req.headers[key];
    if (v) {
      rawUser = Array.isArray(v) ? v[0] : v;
      break;
    }
  }

  const normalized = normalizeUser(rawUser);

  if (normalized) {
    (req as any).authUser = {
      raw: rawUser,
      username: normalized,
    };
  } else {
    logDebug('No AD user header found', { headers: req.headers });
  }

  next();
};
