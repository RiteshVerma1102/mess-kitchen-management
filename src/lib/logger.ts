import pino from 'pino';

// Structured JSON logs. Personal data must never be logged: the redact list
// is a safety net, the real rule is "do not pass personal data to the logger".
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'p05' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.email',
      '*.phone',
      '*.studentRef',
      '*.rollNumber',
      '*.token',
    ],
    censor: '[redacted]',
  },
});
