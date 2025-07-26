const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

// Colors for console output
const COLORS = {
  ERROR: '\x1b[31m', // Red
  WARN: '\x1b[33m',  // Yellow
  INFO: '\x1b[36m',  // Cyan
  DEBUG: '\x1b[32m', // Green
  RESET: '\x1b[0m'
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'INFO';
    this.logToFile = process.env.LOG_TO_FILE === 'true';
    this.logToConsole = process.env.LOG_TO_CONSOLE !== 'false';
    
    // Create log files
    this.errorLogFile = path.join(logsDir, 'error.log');
    this.combinedLogFile = path.join(logsDir, 'combined.log');
    this.accessLogFile = path.join(logsDir, 'access.log');
  }

  shouldLog(level) {
    return LOG_LEVELS[level] <= LOG_LEVELS[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaString = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaString}`;
  }

  writeToFile(filename, message) {
    if (this.logToFile) {
      try {
        fs.appendFileSync(filename, message + '\n');
      } catch (error) {
        console.error('Failed to write to log file:', error);
      }
    }
  }

  writeToConsole(level, message) {
    if (this.logToConsole) {
      const color = COLORS[level] || COLORS.RESET;
      console.log(`${color}${message}${COLORS.RESET}`);
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Write to console
    this.writeToConsole(level, formattedMessage);
    
    // Write to files
    this.writeToFile(this.combinedLogFile, formattedMessage);
    
    // Write errors to separate error log
    if (level === 'ERROR') {
      this.writeToFile(this.errorLogFile, formattedMessage);
    }
  }

  error(message, meta = {}) {
    this.log('ERROR', message, meta);
  }

  warn(message, meta = {}) {
    this.log('WARN', message, meta);
  }

  info(message, meta = {}) {
    this.log('INFO', message, meta);
  }

  debug(message, meta = {}) {
    this.log('DEBUG', message, meta);
  }

  // HTTP request logging
  logRequest(req, res, responseTime) {
    const { method, url, ip, headers } = req;
    const { statusCode } = res;
    
    const logData = {
      method,
      url,
      ip,
      userAgent: headers['user-agent'],
      statusCode,
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString()
    };

    const accessMessage = `${method} ${url} ${statusCode} ${responseTime}ms - ${ip}`;
    
    // Log to access log file
    this.writeToFile(this.accessLogFile, JSON.stringify(logData));
    
    // Log to console based on status code
    if (statusCode >= 400) {
      this.error(accessMessage, { request: logData });
    } else {
      this.info(accessMessage, { request: logData });
    }
  }

  // Database operation logging
  logDBOperation(operation, collection, query = {}, result = {}) {
    const message = `DB ${operation} on ${collection}`;
    this.debug(message, { operation, collection, query, result });
  }

  // Authentication logging
  logAuth(action, user, success = true, error = null) {
    const message = `Auth ${action} ${success ? 'successful' : 'failed'} for user: ${user}`;
    const meta = { action, user, success, error };
    
    if (success) {
      this.info(message, meta);
    } else {
      this.warn(message, meta);
    }
  }

  // Payment logging
  logPayment(action, paymentData) {
    const message = `Payment ${action}`;
    this.info(message, { payment: paymentData });
  }

  // Error logging with stack trace
  logError(error, context = {}) {
    const message = `Error: ${error.message}`;
    const meta = {
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };
    
    this.error(message, meta);
  }

  // Performance logging
  logPerformance(operation, duration, additionalData = {}) {
    const message = `Performance: ${operation} took ${duration}ms`;
    this.info(message, { operation, duration, ...additionalData });
  }

  // System health logging
  logSystemHealth(metrics) {
    const message = 'System health check';
    this.info(message, { health: metrics });
  }

  // Cleanup old logs (run periodically)
  cleanupLogs(daysToKeep = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const logFiles = [this.errorLogFile, this.combinedLogFile, this.accessLogFile];
    
    logFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const stats = fs.statSync(file);
        if (stats.mtime < cutoffDate) {
          try {
            fs.unlinkSync(file);
            this.info(`Cleaned up old log file: ${file}`);
          } catch (error) {
            this.error(`Failed to cleanup log file: ${file}`, { error: error.message });
          }
        }
      }
    });
  }
}

// Create singleton instance
const logger = new Logger();

// Express middleware for request logging
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
};

// Global error handler
const errorHandler = (error, req, res, next) => {
  logger.logError(error, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  next(error);
};

module.exports = {
  logger,
  requestLogger,
  errorHandler
};