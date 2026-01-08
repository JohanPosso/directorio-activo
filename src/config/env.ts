import 'dotenv/config';

const required = (value: string | undefined, name: string): string => {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
};

export const env = {
  port: Number(process.env.PORT || 3000),
  // Valor dummy por defecto hasta que se configure la BD real
  databaseUrl: process.env.DATABASE_URL || 'sqlserver://localhost:1433;database=placeholder',
};
