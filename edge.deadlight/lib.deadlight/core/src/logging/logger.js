// core/src/logging/logger.js
export class Logger {
  constructor(options = {}) {
    this.context = options.context || 'app';
    this.level = options.level || 'info';
  }

  info(message, data = {}) {
    this.log('info', message, data);
  }

  warn(message, data = {}) {
    this.log('warn', message, data);
  }

  error(message, data = {}) {
    this.log('error', message, data);
  }

  log(level, message, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      ...data
    };
    
    console.log(JSON.stringify(logEntry));
  }
}
