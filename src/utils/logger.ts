/**
 * Structured Logger Utility using Winston
 * Provides production-ready logging with JSON output, file rotation, and contextual metadata
 */
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine log level from environment
const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

// Custom format for console output (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    const metaKeys = Object.keys(metadata);
    if (metaKeys.length > 0) {
      // Filter out common winston internal fields
      const filteredMeta = Object.fromEntries(
        Object.entries(metadata).filter(([key]) =>
          !['timestamp', 'level', 'message', 'splat', Symbol.for('level')].includes(key)
        )
      );

      if (Object.keys(filteredMeta).length > 0) {
        msg += ` ${JSON.stringify(filteredMeta)}`;
      }
    }

    return msg;
  })
);

// JSON format for file output (machine-readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console output (always enabled)
  new winston.transports.Console({
    format: consoleFormat,
    level: LOG_LEVEL,
  }),
];

// Add file transports in production or if explicitly enabled
if (!IS_DEVELOPMENT || process.env.ENABLE_FILE_LOGGING === 'true') {
  const logsDir = path.join(__dirname, '../../logs');

  // Combined log file (all logs)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      level: LOG_LEVEL,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );

  // Error log file (errors only)
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      format: fileFormat,
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    })
  );
}

// Create the winston logger
const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports,
  // Don't exit on error
  exitOnError: false,
});

/**
 * Structured logger with contextual metadata support
 */
class Logger {
  /**
   * Log debug message (development only by default)
   */
  debug(message: string, metadata?: Record<string, any>): void {
    winstonLogger.debug(message, metadata);
  }

  /**
   * Log info message
   */
  info(message: string, metadata?: Record<string, any>): void {
    winstonLogger.info(message, metadata);
  }

  /**
   * Log warning message
   */
  warn(message: string, metadata?: Record<string, any>): void {
    winstonLogger.warn(message, metadata);
  }

  /**
   * Log error message
   */
  error(message: string, metadata?: Record<string, any> | Error): void {
    if (metadata instanceof Error) {
      winstonLogger.error(message, {
        error: {
          message: metadata.message,
          stack: metadata.stack,
          name: metadata.name,
        },
      });
    } else {
      winstonLogger.error(message, metadata);
    }
  }

  /**
   * Create a child logger with default metadata
   * Useful for adding context to all logs in a module
   */
  child(defaultMetadata: Record<string, any>): Logger {
    const childLogger = winstonLogger.child(defaultMetadata);

    return {
      debug: (message: string, metadata?: Record<string, any>) =>
        childLogger.debug(message, metadata),
      info: (message: string, metadata?: Record<string, any>) =>
        childLogger.info(message, metadata),
      warn: (message: string, metadata?: Record<string, any>) =>
        childLogger.warn(message, metadata),
      error: (message: string, metadata?: Record<string, any> | Error) => {
        if (metadata instanceof Error) {
          childLogger.error(message, {
            error: {
              message: metadata.message,
              stack: metadata.stack,
              name: metadata.name,
            },
          });
        } else {
          childLogger.error(message, metadata);
        }
      },
      child: (meta: Record<string, any>) => this.child({ ...defaultMetadata, ...meta }),
    } as Logger;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for direct access to winston if needed
export { winstonLogger };
