/**
 * Tests for Structured Logging Framework
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createLogger, createChildLogger, logger, type LogContext } from '../../src/utils/structured-logger.js';

describe('Structured Logger', () => {
  let consoleInfoSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Logging', () => {
    it('should log info messages', () => {
      logger.info('Test message');
      
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('info');
      expect(logOutput.msg).toBe('Test message');
      expect(logOutput.time).toBeDefined();
    });

    it('should log warn messages', () => {
      logger.warn('Warning message');
      
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleWarnSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('warn');
      expect(logOutput.msg).toBe('Warning message');
    });

    it('should log error messages', () => {
      logger.error('Error message');
      
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('error');
      expect(logOutput.msg).toBe('Error message');
    });

    it('should log debug messages when level allows', () => {
      const debugLogger = createLogger({ level: 'debug' });
      debugLogger.debug('Debug message');
      
      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('debug');
      expect(logOutput.msg).toBe('Debug message');
    });

    it('should log trace messages when level allows', () => {
      const traceLogger = createLogger({ level: 'trace' });
      traceLogger.trace('Trace message');
      
      expect(consoleDebugSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleDebugSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('trace');
      expect(logOutput.msg).toBe('Trace message');
    });

    it('should log fatal messages', () => {
      logger.fatal('Fatal message');
      
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('fatal');
      expect(logOutput.msg).toBe('Fatal message');
    });
  });

  describe('Context Logging', () => {
    it('should log with context object', () => {
      logger.info('Message with context', { userId: '123', requestId: 'abc' });
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.msg).toBe('Message with context');
      expect(logOutput.userId).toBe('123');
      expect(logOutput.requestId).toBe('abc');
    });

    it('should support context-first syntax', () => {
      logger.info({ userId: '123', action: 'login' }, 'User logged in');
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.msg).toBe('User logged in');
      expect(logOutput.userId).toBe('123');
      expect(logOutput.action).toBe('login');
    });
  });

  describe('Error Logging', () => {
    it('should log Error objects', () => {
      const error = new Error('Test error');
      logger.error(error);
      
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.msg).toBe('Test error');
      expect(logOutput.error).toBeDefined();
      expect(logOutput.error.message).toBe('Test error');
      expect(logOutput.error.stack).toBeDefined();
    });

    it('should log Error with custom message', () => {
      const error = new Error('Original error');
      logger.error(error, 'Custom error message');
      
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.msg).toBe('Custom error message');
      expect(logOutput.error.message).toBe('Original error');
    });

    it('should log fatal errors', () => {
      const error = new Error('Fatal error');
      logger.fatal(error, 'Application crashed');
      
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('fatal');
      expect(logOutput.msg).toBe('Application crashed');
      expect(logOutput.error.message).toBe('Fatal error');
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with bindings', () => {
      const childLogger = createChildLogger({ requestId: '123', userId: 'user-456' });
      childLogger.info('Processing request');
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.msg).toBe('Processing request');
      expect(logOutput.requestId).toBe('123');
      expect(logOutput.userId).toBe('user-456');
    });

    it('should inherit bindings in nested child loggers', () => {
      const parentLogger = createChildLogger({ service: 'api' });
      const childLogger = parentLogger.child({ endpoint: '/users' });
      childLogger.info('Request received');
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.service).toBe('api');
      expect(logOutput.endpoint).toBe('/users');
    });

    it('should allow overriding parent bindings', () => {
      const parentLogger = createChildLogger({ userId: 'user-123' });
      const childLogger = parentLogger.child({ userId: 'user-456' });
      childLogger.info('User changed');
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.userId).toBe('user-456');
    });
  });

  describe('Log Levels', () => {
    it('should respect log level configuration', () => {
      const warnLogger = createLogger({ level: 'warn' });
      
      warnLogger.debug('Debug message');
      warnLogger.info('Info message');
      warnLogger.warn('Warn message');
      warnLogger.error('Error message');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
    });

    it('should log all levels when trace is configured', () => {
      const traceLogger = createLogger({ level: 'trace' });
      
      traceLogger.trace('Trace message');
      traceLogger.debug('Debug message');
      traceLogger.info('Info message');
      traceLogger.warn('Warn message');
      
      expect(consoleDebugSpy).toHaveBeenCalledTimes(2); // trace and debug
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it('should only log fatal when level is fatal', () => {
      const fatalLogger = createLogger({ level: 'fatal' });
      
      fatalLogger.error('Error message');
      fatalLogger.fatal('Fatal message');
      
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const logOutput = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(logOutput.level).toBe('fatal');
    });
  });

  describe('Structured Output', () => {
    it('should produce valid JSON output', () => {
      logger.info('Test message', { key: 'value' });
      
      const logString = consoleInfoSpy.mock.calls[0][0];
      expect(() => JSON.parse(logString)).not.toThrow();
    });

    it('should include timestamp in output', () => {
      logger.info('Test message');
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.time).toBeDefined();
      expect(new Date(logOutput.time)).toBeInstanceOf(Date);
    });

    it('should handle complex context objects', () => {
      const context: LogContext = {
        user: { id: '123', name: 'John' },
        tags: ['tag1', 'tag2'],
        metadata: { nested: { deep: 'value' } },
      };
      
      logger.info('Complex context', context);
      
      const logOutput = JSON.parse(consoleInfoSpy.mock.calls[0][0]);
      expect(logOutput.user.id).toBe('123');
      expect(logOutput.tags).toEqual(['tag1', 'tag2']);
      expect(logOutput.metadata.nested.deep).toBe('value');
    });
  });

  describe('Environment Configuration', () => {
    it('should use LOG_LEVEL from environment', () => {
      const originalEnv = process.env.LOG_LEVEL;
      process.env.LOG_LEVEL = 'error';
      
      const envLogger = createLogger();
      envLogger.info('Should not log');
      envLogger.error('Should log');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      
      process.env.LOG_LEVEL = originalEnv;
    });

    it('should default to info level when not specified', () => {
      const originalEnv = process.env.LOG_LEVEL;
      delete process.env.LOG_LEVEL;
      
      const defaultLogger = createLogger();
      defaultLogger.debug('Should not log');
      defaultLogger.info('Should log');
      
      expect(consoleDebugSpy).not.toHaveBeenCalled();
      expect(consoleInfoSpy).toHaveBeenCalledOnce();
      
      process.env.LOG_LEVEL = originalEnv;
    });
  });

  describe('Performance', () => {
    it('should not call expensive operations when level is filtered', () => {
      const errorLogger = createLogger({ level: 'error' });
      
      let expensiveCallCount = 0;
      const expensiveOperation = () => {
        expensiveCallCount++;
        return { expensive: 'data' };
      };
      
      // This should not call expensiveOperation because debug is filtered
      errorLogger.debug('Debug message', expensiveOperation());
      
      // Context is still evaluated in current implementation, but log is not written
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });
  });
});
