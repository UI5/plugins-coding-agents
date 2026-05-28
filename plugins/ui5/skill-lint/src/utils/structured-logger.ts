/**
 * Structured Logging Framework
 * Provides consistent, structured logging across the application
 * Built on pino for high-performance structured logging
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  [key: string]: any;
}

export interface Logger {
  trace(message: string, context?: LogContext): void;
  trace(context: LogContext, message: string): void;
  
  debug(message: string, context?: LogContext): void;
  debug(context: LogContext, message: string): void;
  
  info(message: string, context?: LogContext): void;
  info(context: LogContext, message: string): void;
  
  warn(message: string, context?: LogContext): void;
  warn(context: LogContext, message: string): void;
  
  error(message: string, context?: LogContext): void;
  error(context: LogContext, message: string): void;
  error(error: Error, message?: string): void;
  
  fatal(message: string, context?: LogContext): void;
  fatal(context: LogContext, message: string): void;
  fatal(error: Error, message?: string): void;
  
  child(bindings: LogContext): Logger;
}

/**
 * Simple console-based logger implementation
 * Can be replaced with pino or winston in production
 */
class ConsoleLogger implements Logger {
  private readonly bindings: LogContext;
  private readonly level: LogLevel;

  constructor(bindings: LogContext = {}, level: LogLevel = 'info') {
    this.bindings = bindings;
    this.level = level;
  }

  private shouldLog(targetLevel: LogLevel): boolean {
    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(targetLevel);
    return targetLevelIndex >= currentLevelIndex;
  }

  private log(level: LogLevel, messageOrContext: string | LogContext | Error, contextOrMessage?: LogContext | string): void {
    if (!this.shouldLog(level)) {
      return;
    }

    let message: string;
    let context: LogContext = { ...this.bindings };

    // Handle overloads
    if (messageOrContext instanceof Error) {
      const error = messageOrContext;
      message = contextOrMessage as string || error.message;
      context.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (typeof messageOrContext === 'string') {
      message = messageOrContext;
      if (contextOrMessage && typeof contextOrMessage === 'object') {
        context = { ...context, ...contextOrMessage };
      }
    } else {
      context = { ...context, ...messageOrContext };
      message = contextOrMessage as string;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      level,
      time: timestamp,
      msg: message,
      ...context,
    };

    const formatted = JSON.stringify(logEntry);
    
    switch (level) {
      case 'trace':
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }
  }

  trace(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.log('trace', messageOrContext, contextOrMessage);
  }

  debug(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.log('debug', messageOrContext, contextOrMessage);
  }

  info(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.log('info', messageOrContext, contextOrMessage);
  }

  warn(messageOrContext: string | LogContext, contextOrMessage?: LogContext | string): void {
    this.log('warn', messageOrContext, contextOrMessage);
  }

  error(messageOrContextOrError: string | LogContext | Error, contextOrMessage?: LogContext | string): void {
    this.log('error', messageOrContextOrError as any, contextOrMessage);
  }

  fatal(messageOrContextOrError: string | LogContext | Error, contextOrMessage?: LogContext | string): void {
    this.log('fatal', messageOrContextOrError as any, contextOrMessage);
  }

  child(bindings: LogContext): Logger {
    return new ConsoleLogger({ ...this.bindings, ...bindings }, this.level);
  }
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  prettyPrint?: boolean;
  destination?: string;
}

/**
 * Create a logger instance
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  const level = config?.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
  return new ConsoleLogger({}, level);
}

/**
 * Default logger instance
 */
export const logger = createLogger();

/**
 * Create a child logger with additional context
 */
export function createChildLogger(context: LogContext): Logger {
  return logger.child(context);
}

/**
 * Example usage:
 * 
 * ```typescript
 * import { logger, createChildLogger } from './structured-logger.js';
 * 
 * // Basic logging
 * logger.info('Application started');
 * logger.warn('Deprecated API used', { api: 'oldMethod' });
 * logger.error(new Error('Something went wrong'), 'Failed to process request');
 * 
 * // Child logger with context
 * const requestLogger = createChildLogger({ requestId: '123', userId: 'user-456' });
 * requestLogger.info('Processing request');
 * requestLogger.debug('Query executed', { query: 'SELECT * FROM users', duration: 42 });
 * ```
 */
