import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logError, logInfo, logWarn } from '../../lib/logger';

type EmailProvider = 'sendgrid' | 'ethereal' | 'smtp' | 'gmail';

let transporter: nodemailer.Transporter | null = null;
let etherealAccount: nodemailer.TestAccount | null = null;

// Inicializar proveedor de email
async function initializeEmailProvider() {
  const provider = env.emailProvider as EmailProvider;

  switch (provider) {
    case 'sendgrid':
      if (env.sendgridApiKey) {
        sgMail.setApiKey(env.sendgridApiKey);
        logInfo('SendGrid configurado correctamente');
        return true;
      } else {
        logWarn('EMAIL_PROVIDER=sendgrid pero SENDGRID_API_KEY no configurada');
        return false;
      }

    case 'ethereal':
      try {
        // Ethereal Email - perfecto para pruebas, no requiere configuración
        etherealAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: etherealAccount.user,
            pass: etherealAccount.pass,
          },
        });
        logInfo('Ethereal Email configurado correctamente (solo para pruebas)');
        logInfo(`Ver emails en: https://ethereal.email (usuario: ${etherealAccount.user})`);
        return true;
      } catch (error: any) {
        logError('Error creando cuenta Ethereal Email', { error: error?.message });
        return false;
      }

    case 'gmail':
      if (!env.gmailUser || !env.gmailAppPassword) {
        logWarn('EMAIL_PROVIDER=gmail pero GMAIL_USER o GMAIL_APP_PASSWORD no configurados');
        return false;
      }
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: env.gmailUser,
          pass: env.gmailAppPassword,
        },
      });
      logInfo('Gmail configurado correctamente');
      return true;

    case 'smtp':
      if (!env.emailHost || !env.emailUser || !env.emailPass) {
        logWarn('EMAIL_PROVIDER=smtp pero EMAIL_HOST, EMAIL_USER o EMAIL_PASS no configurados');
        return false;
      }
      transporter = nodemailer.createTransport({
        host: env.emailHost,
        port: env.emailPort,
        secure: env.emailPort === 465, // true para 465, false para otros puertos
        auth: {
          user: env.emailUser,
          pass: env.emailPass,
        },
      });
      logInfo('SMTP configurado correctamente', { 
        host: env.emailHost, 
        port: env.emailPort,
        from: env.emailFrom || env.emailUser 
      });
      return true;

    default:
      logWarn(`EMAIL_PROVIDER desconocido: ${provider}. Usando Ethereal Email por defecto.`);
      // Intentar con Ethereal como fallback
      try {
        etherealAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: etherealAccount.user,
            pass: etherealAccount.pass,
          },
        });
        logInfo('Ethereal Email configurado como fallback');
        logInfo(`Ver emails en: https://ethereal.email (usuario: ${etherealAccount.user})`);
        return true;
      } catch (error: any) {
        logError('Error inicializando email provider', { error: error?.message });
        return false;
      }
  }
}

// Inicializar al cargar el módulo
const emailProviderReady = initializeEmailProvider().catch((err) => {
  logError('Error inicializando proveedor de email', { error: err });
});

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface SendEmailResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

/**
 * Enviar email genérico
 */
async function sendEmail({ to, subject, text, html }: SendEmailOptions): Promise<SendEmailResult> {
  // Asegurar que el proveedor esté inicializado
  await emailProviderReady;

  const provider = env.emailProvider as EmailProvider;

  // Usar SendGrid si está configurado
  if (provider === 'sendgrid' && env.sendgridApiKey) {
    try {
      const msg = {
        to,
        from: {
          email: env.sendgridFromEmail || 'noreply@ideauto.com',
          name: env.sendgridFromName || 'Depuración Vehículos',
        },
        subject,
        text,
        html,
      };

      const response = await sgMail.send(msg);

      logInfo('Email enviado exitosamente (SendGrid)', {
        to,
        subject,
        statusCode: response[0]?.statusCode,
      });

      return {
        success: true,
        statusCode: response[0]?.statusCode,
      };
    } catch (error: any) {
      logError('Error enviando email con SendGrid', {
        to,
        subject,
        error: error?.message,
        code: error?.code,
        response: error?.response?.body,
      });
      throw error;
    }
  }

  // Usar Nodemailer (Ethereal, SMTP, Gmail)
  if (!transporter) {
    logWarn('Transporter no inicializado, intentando inicializar...', { provider });
    const initialized = await initializeEmailProvider();
    if (!initialized || !transporter) {
      return {
        success: false,
        error: 'Email service no configurado',
      };
    }
  }

  try {
    const fromEmail = provider === 'gmail'
      ? env.gmailUser || ''
      : provider === 'smtp'
      ? (env.emailFrom || env.emailUser || '')
      : etherealAccount?.user || 'noreply@ethereal.email';

    const fromName = provider === 'gmail'
      ? env.emailFromName
      : provider === 'smtp'
      ? env.emailFromName
      : env.sendgridFromName;

    const mailOptions = {
      from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter!.sendMail(mailOptions);

    // Para Ethereal Email, mostrar URL de preview
    if (provider === 'ethereal' && nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logInfo('Email enviado exitosamente (Ethereal Email)', {
          to,
          subject,
          previewUrl,
        });
      }
    } else {
      logInfo('Email enviado exitosamente', {
        to,
        subject,
        messageId: info.messageId,
      });
    }

    return {
      success: true,
      statusCode: 200,
    };
  } catch (error: any) {
    logError('Error enviando email con Nodemailer', {
      to,
      subject,
      provider,
      error: error?.message,
    });
    throw error;
  }
}

/**
 * Enviar email de enlace mágico para autenticación sin contraseña
 */
export async function sendMagicLinkEmail(to: string, link: string): Promise<SendEmailResult> {
  const subject = 'Tu acceso sin contraseña - Depuración Vehículos';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          background-color: #f9fafb;
          padding: 30px;
          border-radius: 0 0 5px 5px;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #4F46E5;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 12px;
          color: #6b7280;
        }
        .warning {
          background-color: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 10px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Acceso Sin Contraseña</h1>
      </div>
      <div class="content">
        <p>Hola,</p>
        
        <p>Hemos recibido una solicitud de acceso a la aplicación de Depuración de Vehículos.</p>
        
        <p>Para acceder sin contraseña, haz clic en el siguiente botón:</p>
        
        <div style="text-align: center;">
          <a href="${link}" class="button">Acceder a la Aplicación</a>
        </div>
        
        <p>O copia y pega el siguiente enlace en tu navegador:</p>
        <p style="word-break: break-all; color: #4F46E5;">${link}</p>
        
        <div class="warning">
          <strong>⚠️ Importante:</strong>
          <ul>
            <li>Este enlace expirará en <strong>15 minutos</strong></li>
            <li>Si no solicitaste este acceso, ignora este email</li>
            <li>Nunca compartas este enlace con nadie</li>
          </ul>
        </div>
        
        <p>Si tienes problemas, contacta con nuestro equipo de soporte.</p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} Depuración Vehículos. Todos los derechos reservados.</p>
        <p>Este es un email automático, por favor no respondas a este mensaje.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hola,

Hemos recibido una solicitud de acceso a la aplicación de Depuración de Vehículos.

Para acceder sin contraseña, visita el siguiente enlace:
${link}

IMPORTANTE:
- Este enlace expirará en 15 minutos
- Si no solicitaste este acceso, ignora este email
- Nunca compartas este enlace con nadie

Si tienes problemas, contacta con nuestro equipo de soporte.

© ${new Date().getFullYear()} Depuración Vehículos. Todos los derechos reservados.
Este es un email automático, por favor no respondas a este mensaje.
  `;

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
}
