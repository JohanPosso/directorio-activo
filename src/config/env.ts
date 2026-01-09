import 'dotenv/config';

export const env = {
  // Servidor
  port: Number(process.env.PORT),
  
  // Base de datos
  databaseUrl: process.env.DATABASE_URL || '',
  
  // SendGrid (opcional)
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',
  sendgridFromEmail: process.env.SENDGRID_FROM_EMAIL || '',
  sendgridFromName: process.env.SENDGRID_FROM_NAME || '',
  
  // Nodemailer / SMTP
  emailProvider: process.env.EMAIL_PROVIDER || '',
  emailHost: process.env.EMAIL_HOST || '',
  emailPort: Number(process.env.EMAIL_PORT),
  emailUser: process.env.EMAIL_USER || '',
  emailPass: process.env.EMAIL_PASS || '',
  emailFrom: process.env.EMAIL_FROM || '',
  emailFromName: process.env.EMAIL_FROM_NAME || '',
  
  // Gmail (alternativa)
  gmailUser: process.env.GMAIL_USER || '',
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || '',
  
  // Email de prueba
  testEmailTo: process.env.TEST_EMAIL_TO || '',
  
  // Magic Link
  magicJwtSecret: process.env.MAGIC_JWT_SECRET || '',
  magicLinkBaseUrl: process.env.MAGIC_LINK_BASE_URL || '',
  allowedEmailDomain: process.env.ALLOWED_EMAIL_DOMAIN || '',
  sessionTokenExpiresDays: Number(process.env.SESSION_TOKEN_EXPIRES_DAYS) || 7,
};
