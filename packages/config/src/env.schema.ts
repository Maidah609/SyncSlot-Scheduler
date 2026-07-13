import { z } from "zod";

const requiredUrl = (name: string) =>
  z.string().url({ message: `${name} must be a valid URL.` });

const requiredSecret = (name: string) =>
  z.string().min(32, { message: `${name} must be at least 32 characters long.` });

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: requiredUrl("DATABASE_URL"),
  JWT_SECRET: requiredSecret("JWT_SECRET"),
  SESSION_SECRET: requiredSecret("SESSION_SECRET"),
  REDIS_URL: requiredUrl("REDIS_URL"),
  EMAIL_PROVIDER: z.enum(["resend"]).default("resend"),
  EMAIL_FROM_EMAIL: z.string().email({ message: "EMAIL_FROM_EMAIL must be a valid email address." }).default("no-reply@syncslot.dev"),
  EMAIL_FROM_NAME: z.string().min(1, { message: "EMAIL_FROM_NAME is required." }).default("SyncSlot"),
  RESEND_API_KEY: z.string().min(1, { message: "RESEND_API_KEY must not be empty." }).optional(),
  SMTP_HOST: z.string().min(1, { message: "SMTP_HOST must not be empty." }).optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().min(1, { message: "SMTP_USER must not be empty." }).optional(),
  SMTP_PASS: z.string().min(1, { message: "SMTP_PASS must not be empty." }).optional(),
  SMTP_FROM_EMAIL: z.string().email({ message: "SMTP_FROM_EMAIL must be a valid email address." }).optional(),
  SMTP_FROM_NAME: z.string().min(1, { message: "SMTP_FROM_NAME must not be empty." }).optional(),
  GOOGLE_OAUTH_CLIENT_ID: z.string().min(1, { message: "GOOGLE_OAUTH_CLIENT_ID is required." }),
  GOOGLE_OAUTH_CLIENT_SECRET: z.string().min(1, { message: "GOOGLE_OAUTH_CLIENT_SECRET is required." }),
  GOOGLE_OAUTH_CALLBACK_URL: requiredUrl("GOOGLE_OAUTH_CALLBACK_URL"),
  MICROSOFT_OAUTH_CLIENT_ID: z.string().min(1, { message: "MICROSOFT_OAUTH_CLIENT_ID is required." }),
  MICROSOFT_OAUTH_CLIENT_SECRET: z.string().min(1, { message: "MICROSOFT_OAUTH_CLIENT_SECRET is required." }),
  MICROSOFT_OAUTH_CALLBACK_URL: requiredUrl("MICROSOFT_OAUTH_CALLBACK_URL"),
  TOKEN_ENCRYPTION_KEY: requiredSecret("TOKEN_ENCRYPTION_KEY"),
});

export type AppEnv = z.infer<typeof envSchema>;
