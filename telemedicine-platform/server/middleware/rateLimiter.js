const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

// Create rate limiter store (in-memory for now, can be replaced with Redis)
const rateLimiterStore = new Map();

// Custom rate limiter store
class MemoryStore {
  constructor() {
    this.store = new Map();
  }

  incr(key, callback) {
    const record = this.store.get(key);
    const now = Date.now();

    if (!record) {
      this.store.set(key, { count: 1, resetTime: now + 60000 });
      callback(null, 1, now + 60000);
    } else {
      if (now > record.resetTime) {
        this.store.set(key, { count: 1, resetTime: now + 60000 });
        callback(null, 1, now + 60000);
      } else {
        record.count++;
        callback(null, record.count, record.resetTime);
      }
    }
  }

  decrement(key) {
    const record = this.store.get(key);
    if (record) {
      record.count = Math.max(0, record.count - 1);
    }
  }

  resetKey(key) {
    this.store.delete(key);
  }
}

// Rate limiter configurations
const rateLimiterConfigs = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore()
  },

  // Authentication rate limit (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore()
  },

  // Password reset rate limit
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many password reset attempts, please try again later.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore()
  },

  // Registration rate limit
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // limit each IP to 3 requests per windowMs
    message: {
      status: 'error',
      message: 'Too many registration attempts, please try again later.',
      code: 'REGISTRATION_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore()
  },

  // API key rate limit (for external integrations)
  apiKey: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // limit each API key to 1000 requests per windowMs
    message: {
      status: 'error',
      message: 'API rate limit exceeded, please try again later.',
      code: 'API_KEY_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore(),
    keyGenerator: (req) => req.headers['x-api-key'] || req.ip
  },

  // Payment rate limit
  payment: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // limit each IP to 10 payment requests per windowMs
    message: {
      status: 'error',
      message: 'Too many payment attempts, please try again later.',
      code: 'PAYMENT_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    store: new MemoryStore()
  }
};

// Create rate limiters
const generalLimiter = rateLimit(rateLimiterConfigs.general);
const authLimiter = rateLimit(rateLimiterConfigs.auth);
const passwordResetLimiter = rateLimit(rateLimiterConfigs.passwordReset);
const registrationLimiter = rateLimit(rateLimiterConfigs.registration);
const apiKeyLimiter = rateLimit(rateLimiterConfigs.apiKey);
const paymentLimiter = rateLimit(rateLimiterConfigs.payment);

// Custom rate limiter with Redis support (for production)
const createCustomRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create rate limit record
    let record = rateLimiterStore.get(key);
    
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs
      };
      rateLimiterStore.set(key, record);
    }

    // Check if limit exceeded
    if (record.count >= max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: record.count,
        max,
        resetTime: record.resetTime,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.status(429).json({
        status: 'error',
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    // Increment counter
    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    // Log rate limit usage
    if (record.count > max * 0.8) {
      logger.warn('Rate limit warning', {
        key,
        count: record.count,
        max,
        percentage: (record.count / max) * 100,
        ip: req.ip
      });
    }

    next();
  };
};

// Role-based rate limiting
const roleBasedLimiter = (limits = {}) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'anonymous';
    const limit = limits[userRole] || limits.default || 100;

    const limiter = createCustomRateLimiter({
      max: limit,
      keyGenerator: (req) => `${req.ip}:${userRole}`,
      message: `Rate limit exceeded for ${userRole} role`
    });

    limiter(req, res, next);
  };
};

// IP whitelist/blacklist
const ipFilter = (whitelist = [], blacklist = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;

    // Check blacklist
    if (blacklist.includes(clientIP)) {
      logger.warn('Blacklisted IP blocked', { ip: clientIP });
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'IP_BLACKLISTED'
      });
    }

    // Check whitelist (if provided)
    if (whitelist.length > 0 && !whitelist.includes(clientIP)) {
      logger.warn('Non-whitelisted IP blocked', { ip: clientIP });
      return res.status(403).json({
        status: 'error',
        message: 'Access denied',
        code: 'IP_NOT_WHITELISTED'
      });
    }

    next();
  };
};

// Cleanup expired rate limit records
const cleanupExpiredRecords = () => {
  const now = Date.now();
  for (const [key, record] of rateLimiterStore.entries()) {
    if (now > record.resetTime) {
      rateLimiterStore.delete(key);
    }
  }
};

// Schedule cleanup every 5 minutes
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  registrationLimiter,
  apiKeyLimiter,
  paymentLimiter,
  createCustomRateLimiter,
  roleBasedLimiter,
  ipFilter,
  cleanupExpiredRecords
};