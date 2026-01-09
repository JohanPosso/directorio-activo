import { prisma } from '../../prisma/client';
import { logError, logInfo } from '../../lib/logger';
import { User, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

export type UserData = User;

/**
 * Buscar usuario por email
 */
export async function findUserByEmail(email: string): Promise<UserData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user;
  } catch (error: any) {
    logError('Error buscando usuario por email', { email, error: error?.message });
    throw error;
  }
}

/**
 * Buscar usuario por ID (GUID)
 */
export async function findUserById(id_usuario: string): Promise<UserData | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id_usuario } as Prisma.UserWhereUniqueInput,
    });

    return user;
  } catch (error: any) {
    logError('Error buscando usuario por ID', { id_usuario, error: error?.message });
    throw error;
  }
}

/**
 * Crear nuevo usuario
 */
export async function createUser(email: string, displayName?: string): Promise<UserData> {
  try {
    const user = await prisma.user.create({
      data: {
        id_usuario: randomUUID(),
        email,
        displayName: displayName || null,
      } as Prisma.UserCreateInput,
    });

    logInfo('Usuario creado exitosamente', { id_usuario: user.id_usuario, email });
    return user;
  } catch (error: any) {
    logError('Error creando usuario', { email, error: error?.message });
    throw error;
  }
}

/**
 * Buscar o crear usuario por email (findOrCreate)
 */
export async function findOrCreateUser(email: string, displayName?: string): Promise<UserData> {
  try {
    // Intentar buscar usuario existente
    let user = await findUserByEmail(email);

    if (!user) {
      // Usuario no existe, crearlo
      user = await createUser(email, displayName);
    } else {
      // Usuario existe, actualizar updatedAt
      user = await prisma.user.update({
        where: { id_usuario: user.id_usuario } as Prisma.UserWhereUniqueInput,
        data: { updatedAt: new Date() },
      });
      logInfo('Usuario encontrado, sesión actualizada', { id_usuario: user.id_usuario, email });
    }

    return user as UserData;
  } catch (error: any) {
    logError('Error en findOrCreateUser', { email, error: error?.message });
    throw error;
  }
}
