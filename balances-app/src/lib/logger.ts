/**
 * Enhanced logging utility for API routes
 * Ensures logs are visible in development and properly formatted
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  webhookId?: string;
  transactionId?: string;
  sourceId?: string;
  requestId?: string;
  responseTime?: number;
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isEdge = typeof EdgeRuntime !== 'undefined';

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (context) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ');
      return `${prefix} ${message} | ${contextStr}`;
    }
    
    return `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In development, log everything
    if (this.isDevelopment) return true;
    
    // In production, only log warnings and errors
    return level === 'warn' || level === 'error';
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, context?: LogContext): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, context));
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  // Specialized logging for webhooks
  webhookRequest(webhookId: string, source: string, context?: LogContext): void {
    this.info(`Webhook request received`, {
      webhookId,
      source,
      ...context
    });
  }

  webhookSuccess(webhookId: string, transactionId: string, responseTime: number, context?: LogContext): void {
    this.info(`Webhook processed successfully`, {
      webhookId,
      transactionId,
      responseTime,
      ...context
    });
  }

  webhookError(webhookId: string, error: string, responseTime: number, context?: LogContext): void {
    this.error(`Webhook processing failed`, {
      webhookId,
      error,
      responseTime,
      ...context
    });
  }

  // API route logging
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.info(`API ${method} ${path}`, context);
  }

  apiResponse(method: string, path: string, status: number, responseTime: number, context?: LogContext): void {
    const level = status >= 400 ? 'error' : 'info';
    this[level](`API ${method} ${path} - ${status}`, {
      status,
      responseTime,
      ...context
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export types for use in other files
export type { LogLevel, LogContext };
