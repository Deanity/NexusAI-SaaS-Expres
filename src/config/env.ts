import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_ACCESS_SECRET: z.string().min(64, 'JWT_ACCESS_SECRET must be at least 64 characters long'),
  JWT_REFRESH_SECRET: z.string().min(64, 'JWT_REFRESH_SECRET must be at least 64 characters long'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  EMAIL_FROM: z.string().email().default('noreply@nexusai.dev'),
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),

  GOOGLE_AI_API_KEY: z.string().min(1, 'GOOGLE_AI_API_KEY is required'),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  ENABLED_MODELS: z.string().transform((val) => val.split(',').map((s) => s.trim())),

  CREDIT_RATE_GEMINI_PRO: z.coerce.number().default(5),
  CREDIT_RATE_GEMINI_FLASH: z.coerce.number().default(2),

  WELCOME_BONUS_CREDITS: z.coerce.number().default(100),

  SWAGGER_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  RATE_LIMIT_AUTH: z.coerce.number().default(10),
  RATE_LIMIT_AI_FREE: z.coerce.number().default(30),
  RATE_LIMIT_AI_PRO: z.coerce.number().default(120),
});

const parseEnv = (): z.infer<typeof envSchema> => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      console.error('❌ Invalid environment variables:\n', missingVars.join('\n'));
    } else {
      console.error('❌ Failed to parse environment variables:', error);
    }
    process.exit(1);
  }
};

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
