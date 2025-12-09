// Centralized logging utility with performance optimizations
// This helps reduce console.log overhead and provides better control

import { environment } from '../config/environment';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  VERBOSE = 4
}

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO;
  private isProduction: boolean = false;

  constructor() {
    // Set log level based on environment
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Parse log level from environment
    const logLevel = environment.LOG_LEVEL;
    switch (logLevel) {
      case 'error':
        this.currentLevel = LogLevel.ERROR;
        break;
      case 'warn':
        this.currentLevel = LogLevel.WARN;
        break;
      case 'info':
        this.currentLevel = LogLevel.INFO;
        break;
      case 'debug':
        this.currentLevel = LogLevel.DEBUG;
        break;
      case 'verbose':
        this.currentLevel = LogLevel.VERBOSE;
        break;
      default:
        this.currentLevel = this.isProduction ? LogLevel.WARN : LogLevel.INFO;
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.currentLevel;
  }

  private formatMessage(prefix: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString().substring(11, 23);
    return `[${timestamp}] ${prefix} ${message}`;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('❌', message), ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('⚠️', message), ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('ℹ️', message), ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage('🐛', message), ...args);
    }
  }

  verbose(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.VERBOSE)) {
      console.log(this.formatMessage('📝', message), ...args);
    }
  }

  // Specialized logging for different services
  webrtc(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('🔌 [WebRTC]', message), ...args);
    }
  }

  chat(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('💬 [Chat]', message), ...args);
    }
  }

  session(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('📱 [Session]', message), ...args);
    }
  }

  // Performance-optimized logging that only logs occasionally
  occasional(probability: number, message: string, ...args: any[]): void {
    if (Math.random() < probability && this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage('📊', message), ...args);
    }
  }

  // Batch logging to reduce console overhead
  batch(level: LogLevel, messages: string[]): void {
    if (this.shouldLog(level)) {
      const prefix = level === LogLevel.ERROR ? '❌' : 
                    level === LogLevel.WARN ? '⚠️' : 'ℹ️';
      const timestamp = new Date().toISOString().substring(11, 23);
      console.log(`[${timestamp}] ${prefix} ${messages.join(' | ')}`);
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logError = (message: string, ...args: any[]) => logger.error(message, ...args);
export const logWarn = (message: string, ...args: any[]) => logger.warn(message, ...args);
export const logInfo = (message: string, ...args: any[]) => logger.info(message, ...args);
export const logDebug = (message: string, ...args: any[]) => logger.debug(message, ...args);
export const logVerbose = (message: string, ...args: any[]) => logger.verbose(message, ...args);

export default logger;
