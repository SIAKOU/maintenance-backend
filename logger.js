const { createLogger, format, transports } = require('winston');

// Champs sensibles à masquer
const SENSITIVE_FIELDS = ['password', 'token', 'jwt', 'jwt_secret', 'authorization', 'Authorization'];

function redact(obj) {
  try {
    if (!obj || typeof obj !== 'object') return obj;
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    Object.keys(clone).forEach((key) => {
      if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
        clone[key] = '[REDACTED]';
      } else if (typeof clone[key] === 'object') {
        clone[key] = redact(clone[key]);
      }
    });
    return clone;
  } catch (e) {
    return '[REDACTION_ERROR]';
  }
}

const jsonFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.errors({ stack: true }),
  format.splat(),
  format.printf((info) => {
    // Redact potentially sensitive metadata
    const safeMeta = redact(info.meta || info);
    const base = {
      level: info.level,
      message: info.message,
      timestamp: info.timestamp,
    };
    return JSON.stringify(Object.assign({}, base, safeMeta));
  })
);

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: jsonFormat,
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

module.exports = logger;