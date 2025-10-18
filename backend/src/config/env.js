import "dotenv/config";

export const ENV = {
  PORT: process.env.PORT || 5001,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
  DB_USER: process.env.DB_USER || "root",
  DB_PASSWORD: process.env.DB_PASSWORD || "1234",
  DB_NAME: process.env.DB_NAME || "heladeria_db",
  JWT_SECRET: process.env.JWT_SECRET || "super-secret-heladeria",
  NODE_ENV: process.env.NODE_ENV,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_NAME: process.env.ADMIN_NAME,
  ADMIN_PHONE: process.env.ADMIN_PHONE,
};
