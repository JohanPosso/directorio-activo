import { Request, Response, NextFunction } from 'express';
import os from 'os';
import { logDebug, logInfo } from '../../../lib/logger';

/**
 * Middleware para obtener el usuario actual de Windows usando os.userInfo()
 * No requiere IIS ni Active Directory
 */

interface WindowsUserInfo {
  username: string;
  domain?: string;
  email?: string;
  homedir?: string;
  raw: string;
}

/**
 * Obtiene información del usuario de Windows usando os.userInfo()
 * Método nativo de Node.js, no requiere procesos externos
 */
function getWindowsUserFromOS(): WindowsUserInfo | null {
  if (process.platform !== 'win32') {
    logDebug('Sistema no es Windows, omitiendo obtención de usuario', {
      platform: process.platform
    });
    return null;
  }

  try {
    const userInfo = os.userInfo();
    const computer = process.env.COMPUTERNAME || os.hostname();
    
    const windowsUser: WindowsUserInfo = {
      username: userInfo.username,
      domain: computer,
      homedir: userInfo.homedir,
      email: `${userInfo.username}@${computer}.local`,
      raw: `${computer}\\${userInfo.username}`
    };

    return windowsUser;
  } catch (error) {
    logDebug('Error obteniendo usuario con os.userInfo()', { 
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}

export const adUserMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  // Obtener usuario de Windows usando os.userInfo()
  const winUser = getWindowsUserFromOS();

  if (winUser) {
    (req as any).authUser = {
      raw: winUser.raw,
      username: winUser.username,
      domain: winUser.domain,
      email: winUser.email,
      homedir: winUser.homedir,
    };

    logInfo('Usuario Windows obtenido con os.userInfo()', {
      username: winUser.username,
      email: winUser.email,
      domain: winUser.domain
    });
  } else {
    logDebug('No se pudo obtener usuario de Windows', {
      platform: process.platform,
      username: process.env.USERNAME
    });
  }

  next();
};
