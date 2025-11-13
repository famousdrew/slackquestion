/**
 * Environment Variable Validation
 * Ensures all required environment variables are present and properly formatted
 * Note: Uses console.log directly since this runs before logger is initialized
 */

interface EnvConfig {
  SLACK_CLIENT_ID: string;
  SLACK_CLIENT_SECRET: string;
  SLACK_SIGNING_SECRET: string;
  SLACK_STATE_SECRET: string;
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
    'SLACK_CLIENT_ID',
    'SLACK_CLIENT_SECRET',
    'SLACK_SIGNING_SECRET',
    'SLACK_STATE_SECRET',
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
    console.error('💡 For OAuth V2, you need: SLACK_CLIENT_ID, SLACK_CLIENT_SECRET, SLACK_SIGNING_SECRET, SLACK_STATE_SECRET');
    process.exit(1);
  }

  // Validate OAuth credentials
  const clientId = process.env.SLACK_CLIENT_ID!;
  const clientSecret = process.env.SLACK_CLIENT_SECRET!;
  const signingSecret = process.env.SLACK_SIGNING_SECRET!;
  const stateSecret = process.env.SLACK_STATE_SECRET!;
  const databaseUrl = process.env.DATABASE_URL!;

  // Validate Client ID format (should end with .apps.slack.com)
  if (!clientId.includes('.apps.slack.com') && !clientId.match(/^\d+\.\d+$/)) {
    invalid.push('SLACK_CLIENT_ID format appears invalid (should end with .apps.slack.com or be numeric)');
  }

  // Validate Client Secret length (should be reasonably long)
  if (clientSecret.length < 32) {
    invalid.push('SLACK_CLIENT_SECRET appears to be invalid (too short, should be 32+ characters)');
  }

  // Validate Signing Secret length
  if (signingSecret.length < 32) {
    invalid.push('SLACK_SIGNING_SECRET appears to be invalid (too short, should be 32+ characters)');
  }

  // Validate State Secret (should be at least 16 characters for security)
  if (stateSecret.length < 16) {
    invalid.push('SLACK_STATE_SECRET must be at least 16 characters (generate with: openssl rand -hex 16)');
  }

  // Validate Database URL
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    invalid.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  if (invalid.length > 0) {
    console.error('❌ Invalid environment variable formats:');
    invalid.forEach((error) => console.error(`   - ${error}`));
    console.error('\n💡 Please check your .env file and fix the invalid values.');
    console.error('💡 Generate SLACK_STATE_SECRET with: openssl rand -hex 16');
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

  console.log('✅ Environment variables validated successfully (OAuth V2 mode)');

  return {
    SLACK_CLIENT_ID: clientId,
    SLACK_CLIENT_SECRET: clientSecret,
    SLACK_SIGNING_SECRET: signingSecret,
    SLACK_STATE_SECRET: stateSecret,
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
