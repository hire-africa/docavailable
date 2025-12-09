// Performance monitoring utility to track logging impact and app performance

import { logger } from './logger';

interface PerformanceMetrics {
  logCount: number;
  logOverhead: number;
  memoryUsage: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private logCount = 0;
  private startTime = Date.now();
  private maxMetrics = 100; // Keep only last 100 measurements

  // Track logging performance
  trackLog(): void {
    this.logCount++;
    
    // Sample performance every 50 logs
    if (this.logCount % 50 === 0) {
      this.recordMetrics();
    }
  }

  private recordMetrics(): void {
    const now = Date.now();
    const memoryUsage = this.getMemoryUsage();
    
    const metric: PerformanceMetrics = {
      logCount: this.logCount,
      logOverhead: now - this.startTime,
      memoryUsage,
      timestamp: now
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log performance warning if too many logs
    if (this.logCount > 1000) {
      logger.warn(`Performance: ${this.logCount} logs in ${metric.logOverhead}ms`);
    }
  }

  private getMemoryUsage(): number {
    // Simple memory estimation based on log count
    // In a real app, you'd use performance.memory if available
    return this.logCount * 0.1; // Rough estimate
  }

  // Get performance summary
  getPerformanceSummary(): string {
    if (this.metrics.length === 0) {
      return 'No performance data available';
    }

    const latest = this.metrics[this.metrics.length - 1];
    const avgLogsPerSecond = this.logCount / (latest.logOverhead / 1000);
    
    return `Logs: ${this.logCount}, Rate: ${avgLogsPerSecond.toFixed(2)}/s, Memory: ${latest.memoryUsage.toFixed(2)}MB`;
  }

  // Reset metrics
  reset(): void {
    this.metrics = [];
    this.logCount = 0;
    this.startTime = Date.now();
  }

  // Check if logging is excessive
  isLoggingExcessive(): boolean {
    if (this.metrics.length < 2) return false;
    
    const latest = this.metrics[this.metrics.length - 1];
    const avgLogsPerSecond = this.logCount / (latest.logOverhead / 1000);
    
    return avgLogsPerSecond > 10; // More than 10 logs per second
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Enhanced logger that tracks performance
export const createPerformanceLogger = () => {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args: any[]) => {
    performanceMonitor.trackLog();
    originalLog(...args);
  };

  console.error = (...args: any[]) => {
    performanceMonitor.trackLog();
    originalError(...args);
  };

  console.warn = (...args: any[]) => {
    performanceMonitor.trackLog();
    originalWarn(...args);
  };

  return {
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
  };
};

export default performanceMonitor;
