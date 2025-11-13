/**
 * Input Sanitization Utilities
 * Protects against malicious input and data injection
 */

/**
 * Sanitize a display name to prevent injection attacks
 * Allows only alphanumeric characters, spaces, hyphens, apostrophes, and dots
 */
export function sanitizeDisplayName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove any characters that aren't alphanumeric, space, hyphen, apostrophe, or dot
  // Also handle common international characters
  const sanitized = input
    .replace(/[^\w\s\-'.]/g, '')
    .trim()
    .substring(0, 100); // Limit length

  return sanitized;
}

/**
 * Sanitize channel names
 */
export function sanitizeChannelName(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Slack channel names can only contain lowercase letters, numbers, hyphens, and underscores
  const sanitized = input
    .toLowerCase()
    .replace(/[^a-z0-9\-_]/g, '')
    .substring(0, 80);

  return sanitized;
}

/**
 * Sanitize message text to prevent excessively long content
 */
export function sanitizeMessageText(input: string, maxLength: number = 5000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.trim().substring(0, maxLength);
}

/**
 * Validate and sanitize a Slack ID (user, channel, or team ID)
 * Slack IDs follow specific patterns
 */
export function sanitizeSlackId(input: string, idType: 'user' | 'channel' | 'team' | 'message'): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const patterns = {
    user: /^[UW][A-Z0-9]{8,}$/,      // Users start with U or W
    channel: /^[CG][A-Z0-9]{8,}$/,    // Channels start with C or G (private)
    team: /^T[A-Z0-9]{8,}$/,          // Teams start with T
    message: /^\d+\.\d+$/,            // Message timestamps are numeric with decimal
  };

  const pattern = patterns[idType];
  if (!pattern) {
    return null;
  }

  const trimmed = input.trim();
  return pattern.test(trimmed) ? trimmed : null;
}

/**
 * Sanitize and validate email addresses
 */
export function sanitizeEmail(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(trimmed) || trimmed.length > 254) {
    return null;
  }

  return trimmed;
}

/**
 * Escape special characters for safe display in Slack messages
 */
export function escapeSlackMarkdown(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Escape special Slack markdown characters
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sanitize numeric input with bounds checking
 */
export function sanitizeNumber(
  input: string | number,
  min: number,
  max: number,
  defaultValue: number
): number {
  const parsed = typeof input === 'string' ? parseInt(input, 10) : input;

  if (isNaN(parsed)) {
    return defaultValue;
  }

  return Math.max(min, Math.min(max, parsed));
}
