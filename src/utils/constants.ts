/**
 * Application Constants
 */

/**
 * Escalation Levels
 */
export const ESCALATION_LEVEL = {
  NOT_ESCALATED: 0,
  FIRST: 1,
  SECOND: 2,
  FINAL: 3,
  PAUSED: 99, // Questions with replies in hybrid mode or auto-answered
} as const;

/**
 * Escalation Engine Configuration
 */
export const ESCALATION_ENGINE = {
  CHECK_INTERVAL_MS: 30000, // 30 seconds
  DEFAULT_FIRST_ESCALATION_MINUTES: 2,
  DEFAULT_SECOND_ESCALATION_MINUTES: 4,
  DEFAULT_FINAL_ESCALATION_MINUTES: 1440, // 24 hours
} as const;

/**
 * Question Status
 */
export const QUESTION_STATUS = {
  UNANSWERED: 'unanswered',
  ANSWERED: 'answered',
  DISMISSED: 'dismissed',
} as const;
