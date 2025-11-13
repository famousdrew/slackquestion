/**
 * Slack Client Wrapper with Retry Logic
 * Automatically retries Slack API calls with exponential backoff
 */
import { WebClient } from '@slack/web-api';
import { withSlackRetry } from './retry.js';
import { logger } from './logger.js';

/**
 * Wrap a Slack WebClient method with retry logic
 */
function wrapWithRetry<T extends (...args: any[]) => Promise<any>>(
  method: T,
  methodName: string
): T {
  return (async (...args: Parameters<T>) => {
    return withSlackRetry(
      () => method(...args),
      `slack.${methodName}`
    );
  }) as T;
}

/**
 * Create a Slack client with automatic retry logic for all API calls
 */
export function createResilientSlackClient(client: WebClient): WebClient {
  // Create a proxy that wraps all methods with retry logic
  return new Proxy(client, {
    get(target, prop: string) {
      const value = (target as any)[prop];

      // If it's not a function, return as-is
      if (typeof value !== 'function') {
        return value;
      }

      // If it's a nested API namespace (e.g., client.chat), proxy it recursively
      if (value.apiCall) {
        // This is an API method - wrap it
        return wrapWithRetry(value.bind(target), prop);
      }

      // Check if this property has sub-methods (like client.chat.postMessage)
      const subMethods = Object.getOwnPropertyNames(value);
      const hasApiMethods = subMethods.some(key => {
        const subValue = value[key];
        return typeof subValue === 'function' && key !== 'constructor';
      });

      if (hasApiMethods) {
        // This is a namespace with API methods - create a proxy for it
        return new Proxy(value, {
          get(subTarget, subProp: string) {
            const subValue = subTarget[subProp];

            if (typeof subValue !== 'function') {
              return subValue;
            }

            // Wrap the actual API method
            return wrapWithRetry(subValue.bind(subTarget), `${prop}.${subProp}`);
          },
        });
      }

      // Regular method - return as-is
      return value.bind(target);
    },
  });
}

/**
 * Helper to wrap a Slack App's client with retry logic
 * Use this when you need to access app.client with automatic retries
 */
export function getResilientClient(app: { client: WebClient }): WebClient {
  return createResilientSlackClient(app.client);
}
