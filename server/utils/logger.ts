
import * as fs from 'fs';
import * as path from 'path';

enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

class Logger {
  private level: LogLevel;
  private logDir: string;
  private logFile: string;
  
  constructor() {
    // Set log level based on environment
    this.level = process.env.NODE_ENV === 'production' 
      ? LogLevel.INFO 
      : LogLevel.DEBUG;
    
    // Set up log directory
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }
  
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (meta) {
      const metaStr = typeof meta === 'object' ? JSON.stringify(meta) : meta;
      logMessage += ` - ${metaStr}`;
    }
    
    return logMessage;
  }
  
  private writeLog(level: string, message: string, meta?: any): void {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Log to console
    console.log(formattedMessage);
    
    // Log to file
    fs.appendFileSync(this.logFile, formattedMessage + '\n');
  }
  
  error(message: string, meta?: any): void {
    if (this.level >= LogLevel.ERROR) {
      this.writeLog('ERROR', message, meta);
    }
  }
  
  warn(message: string, meta?: any): void {
    if (this.level >= LogLevel.WARN) {
      this.writeLog('WARN', message, meta);
    }
  }
  
  info(message: string, meta?: any): void {
    if (this.level >= LogLevel.INFO) {
      this.writeLog('INFO', message, meta);
    }
  }
  
  debug(message: string, meta?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      this.writeLog('DEBUG', message, meta);
    }
  }
}

export const logger = new Logger();
