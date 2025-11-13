/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and properly formatted
 * Note: Uses console.log directly since this runs before logger is initialized
 */

interface EnvConfig {
  SLACK_BOT_TOKEN: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_APP_TOKEN: string;
  DATABASE_URL: string;
  NODE_ENV?: string;
  FIRST_ESCALATION_MINUTES?: string;
  SECOND_ESCALATION_MINUTES?: string;
  ZENDESK_INTEGRATION_ENABLED?: string;
}

/**
 * Validate that required environment variables are present
 */
export function validateEnv(): EnvConfig {
  const requiredVars = [
    'SLACK_BOT_TOKEN',
    'SLACK_SIGNING_SECRET',
    'SLACK_APP_TOKEN',
    'DATABASE_URL',
  ];

  const missing: string[] = [];
  const invalid: string[] = [];

  // Check for missing variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach((varName) => console.error(`   - ${varName}`));
    console.error('\n💡 Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Validate token formats
  const botToken = process.env.SLACK_BOT_TOKEN!;
  const appToken = process.env.SLACK_APP_TOKEN!;
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;
  const databaseUrl = process.env.DATABASE_URL!;

  if (!botToken.startsWith('xoxb-')) {
    invalid.push('SLACK_BOT_TOKEN must start with "xoxb-"');
  }

  if (!appToken.startsWith('xapp-')) {
    invalid.push('SLACK_APP_TOKEN must start with "xapp-"');
  }

  if (signingSecret.length < 32) {
    invalid.push('SLACK_SIGNING_SECRET appears to be invalid (too short)');
  }

  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    invalid.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  if (invalid.length > 0) {
    console.error('❌ Invalid environment variable formats:');
    invalid.forEach((error) => console.error(`   - ${error}`));
    console.error('\n💡 Please check your .env file and fix the invalid values.');
    process.exit(1);
  }

  // Validate optional numeric values
  const firstEscalation = process.env.FIRST_ESCALATION_MINUTES;
  const secondEscalation = process.env.SECOND_ESCALATION_MINUTES;

  if (firstEscalation && isNaN(parseInt(firstEscalation))) {
    console.warn('⚠️  FIRST_ESCALATION_MINUTES is not a valid number, will use default');
  }

  if (secondEscalation && isNaN(parseInt(secondEscalation))) {
    console.warn('⚠️  SECOND_ESCALATION_MINUTES is not a valid number, will use default');
  }

  console.log('✅ Environment variables validated successfully');

  return {
    SLACK_BOT_TOKEN: botToken,
    SLACK_SIGNING_SECRET: signingSecret,
    SLACK_APP_TOKEN: appToken,
    DATABASE_URL: databaseUrl,
    NODE_ENV: process.env.NODE_ENV,
    FIRST_ESCALATION_MINUTES: firstEscalation,
    SECOND_ESCALATION_MINUTES: secondEscalation,
    ZENDESK_INTEGRATION_ENABLED: process.env.ZENDESK_INTEGRATION_ENABLED,
  };
}

/**
 * Redact sensitive values for logging
 */
export function redactToken(token: string): string {
  if (token.length < 8) return '***';
  return `${token.substring(0, 8)}...${token.substring(token.length - 4)}`;
}
