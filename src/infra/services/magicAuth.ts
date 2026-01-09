import jwt from 'jsonwebtoken';
import { env } from '../../config/env';

// Magic token: token corto para el enlace de login (15 minutos)
const MAGIC_EXPIRATION = '15m';
const MAGIC_COOKIE_NAME = 'magic_token';

// Session token: token largo para mantener la sesión (configurable por días)
const SESSION_COOKIE_NAME = 'session_token';

/**
 * Crear magic token (corto, solo para verificación del enlace)
 */
export function createMagicToken(email: string): string {
  const secret = env.magicJwtSecret || 'dev-secret-magic-link';
  const token = jwt.sign({ email, type: 'magic' }, secret, { expiresIn: MAGIC_EXPIRATION });
  return token;
}

/**
 * Verificar magic token
 */
export function verifyMagicToken(token: string): { email: string } {
  const secret = env.magicJwtSecret || 'dev-secret-magic-link';
  const payload = jwt.verify(token, secret) as { email: string; type?: string };
  if (payload.type !== 'magic') {
    throw new Error('Token inválido: no es un magic token');
  }
  return { email: payload.email };
}

/**
 * Crear session token (largo, para mantener la sesión)
 */
export function createSessionToken(id_usuario: string, email: string): string {
  const expiresInDays = env.sessionTokenExpiresDays || 7;
  const expiresIn: string = `${expiresInDays}d`;
  const secret = env.magicJwtSecret || 'dev-secret-magic-link';
  const token = jwt.sign({ id_usuario, email, type: 'session' }, secret, { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] });
  return token;
}

/**
 * Verificar session token
 */
export function verifySessionToken(token: string): { id_usuario: string; email: string } {
  const secret = env.magicJwtSecret || 'dev-secret-magic-link';
  const payload = jwt.verify(token, secret) as { id_usuario: string; email: string; type?: string };
  if (payload.type !== 'session') {
    throw new Error('Token inválido: no es un session token');
  }
  if (!payload.id_usuario || !payload.email) {
    throw new Error('Token inválido: faltan datos');
  }
  return { id_usuario: payload.id_usuario, email: payload.email };
}

/**
 * Configuración de cookie para magic token (corto)
 */
export function getMagicCookieConfig() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 15 * 60 * 1000, // 15 minutos
    secure: false, // poner true si sirve por HTTPS
  };
}

/**
 * Configuración de cookie para session token (largo)
 */
export function getSessionCookieConfig() {
  const expiresInDays = env.sessionTokenExpiresDays || 7;
  const maxAgeMs = expiresInDays * 24 * 60 * 60 * 1000; // convertir días a milisegundos

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: maxAgeMs,
    secure: false, // poner true si sirve por HTTPS
  };
}

export const magicAuthConfig = {
  MAGIC_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  MAGIC_EXPIRATION: '15m',
};
