const { logger } = require('../utils/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle MongoDB duplicate key error
const handleDuplicateKeyError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const message = `${field} already exists. Please use a different value.`;
  return new AppError(message, 400, 'DUPLICATE_KEY');
};

// Handle MongoDB validation error
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400, 'VALIDATION_ERROR');
};

// Handle MongoDB cast error
const handleCastError = (error) => {
  const message = `Invalid ${error.path}: ${error.value}`;
  return new AppError(message, 400, 'CAST_ERROR');
};

// Handle JWT errors
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401, 'JWT_ERROR');
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please log in again.', 401, 'JWT_EXPIRED');
};

// Handle Mongoose timeout error
const handleTimeoutError = () => {
  return new AppError('Request timeout. Please try again.', 408, 'TIMEOUT_ERROR');
};

// Handle rate limiting error
const handleRateLimitError = () => {
  return new AppError('Too many requests. Please try again later.', 429, 'RATE_LIMIT_ERROR');
};

// Send error response in development
const sendErrorDev = (err, req, res) => {
  const error = {
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  logger.error('Development Error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    statusCode: err.statusCode
  });

  res.status(err.statusCode).json(error);
};

// Send error response in production
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const error = {
      status: err.status,
      message: err.message,
      code: err.code,
      timestamp: new Date().toISOString()
    };

    logger.error('Production Error', {
      message: err.message,
      code: err.code,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode
    });

    res.status(err.statusCode).json(error);
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('Unknown Error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      statusCode: err.statusCode || 500
    });

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      timestamp: new Date().toISOString()
    });
  }
};

// Main error handling middleware
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.code === 11000) error = handleDuplicateKeyError(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'CastError') error = handleCastError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'MongoTimeoutError') error = handleTimeoutError();
    if (error.statusCode === 429) error = handleRateLimitError();

    sendErrorProd(error, req, res);
  }
};

// Async error catcher
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Cannot find ${req.originalUrl} on this server!`, 404, 'NOT_FOUND');
  next(err);
};

// Unhandled promise rejection handler
const unhandledRejectionHandler = (server) => {
  process.on('unhandledRejection', (err, promise) => {
    logger.error('Unhandled Promise Rejection', {
      message: err.message,
      stack: err.stack,
      promise: promise.toString()
    });
    
    // Close server & exit process
    server.close(() => {
      process.exit(1);
    });
  });
};

// Uncaught exception handler
const uncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', {
      message: err.message,
      stack: err.stack
    });
    
    // Exit process immediately
    process.exit(1);
  });
};

// SIGTERM handler
const sigTermHandler = (server) => {
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down gracefully');
    server.close(() => {
      logger.info('Process terminated');
    });
  });
};

// API response helpers
const sendResponse = (res, statusCode, data, message = null) => {
  const response = {
    status: 'success',
    timestamp: new Date().toISOString(),
    data
  };

  if (message) {
    response.message = message;
  }

  res.status(statusCode).json(response);
};

const sendError = (res, statusCode, message, code = null) => {
  const error = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };

  if (code) {
    error.code = code;
  }

  res.status(statusCode).json(error);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
  sigTermHandler,
  sendResponse,
  sendError
};