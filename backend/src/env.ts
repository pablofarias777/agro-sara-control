import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().min(1).default("127.0.0.1"),
  JWT_SECRET: z.string().min(16),
  FRONTEND_ORIGIN: z.string().min(1).optional(),
  NODE_ENV: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
