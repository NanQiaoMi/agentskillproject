export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: any[];
}

class AppLogger {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private readonly maxLogs = 1000;

  // Track original console methods so we don't cause infinite loops
  private originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  private initialized = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    // Monkey patch console
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addLog('info', args);
    };
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addLog('info', args);
    };
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addLog('warn', args);
    };
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.addLog('error', args);
    };
    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.addLog('debug', args);
    };

    // Also catch unhandled promise rejections and global errors
    window.addEventListener('error', (event) => {
      this.addLog('error', [event.message, event.filename, event.lineno, event.error]);
    });
    window.addEventListener('unhandledrejection', (event) => {
      this.addLog('error', ['Unhandled Promise Rejection:', event.reason]);
    });
  }

  public getLogs(): LogEntry[] {
    return this.logs;
  }

  public clearLogs() {
    this.logs = [];
    this.notify();
  }

  public subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    // Avoid mutation issues by sending a shallow copy
    const snapshot = [...this.logs];
    this.listeners.forEach(listener => listener(snapshot));
  }

  private parseLevelValue(level: string): number {
    switch (level) {
      case 'debug': return 0;
      case 'info': return 1;
      case 'warn': return 2;
      case 'error': return 3;
      default: return 1; // Default to info
    }
  }

  private addLog(level: LogLevel, args: any[]) {
    try {
      const configuredLevel = localStorage.getItem('mimi-log-level') || 'info';
      if (this.parseLevelValue(level) < this.parseLevelValue(configuredLevel)) {
        return; // Filter out lower level logs
      }

      // Convert args to strings
      const message = args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.stack || arg.message;
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }).join(' ');

      const entry: LogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: new Date(),
        level,
        message,
        details: args
      };

      this.logs.push(entry);

      if (this.logs.length > this.maxLogs) {
        this.logs.shift(); // Remove oldest
      }

      this.notify();
    } catch (e) {
      // Fallback if logging fails to prevent breaking the app
      this.originalConsole.error('Failed to parse log:', e);
    }
  }
}

export const logger = new AppLogger();
