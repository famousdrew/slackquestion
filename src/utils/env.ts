/**
 * Environment Variable Validation
 * Validates required environment variables on startup
 */

interface EnvConfig {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_APP_TOKEN: string;
  DATABASE_URL: string;
  NODE_ENV?: string;
}

/**
 * Validate and return required environment variables
 * Throws an error if any required variables are missing
 */
export function validateEnv(): EnvConfig {
  const required = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_APP_TOKEN',
    'DATABASE_URL',
  ] as const;

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const errorMessage = [
      '❌ Missing required environment variables:',
      ...missing.map(key => `   - ${key}`),
      '',
      'Please set these variables in your .env file or environment.',
      'See .env.example for reference.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  return {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN!,
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET!,
    SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN!,
    DATABASE_URL: process.env.DATABASE_URL!,
    NODE_ENV: process.env.NODE_ENV,
  };
}
