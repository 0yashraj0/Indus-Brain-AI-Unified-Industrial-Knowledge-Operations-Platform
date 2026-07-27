import dotenv from 'dotenv';
dotenv.config();

/**
 * Security Configuration loaded from Environment Variables
 * Fallback defaults are provided for safe operation when env vars are unassigned.
 */
export const SECURITY_CONFIG = {
  // Authentication Rate Limits
  AUTH_RATE_LIMIT_WINDOW_MS: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  AUTH_RATE_LIMIT_MAX_PER_IP: parseInt(process.env.AUTH_RATE_LIMIT_MAX_PER_IP || '10', 10),
  AUTH_RATE_LIMIT_MAX_PER_ACCOUNT: parseInt(process.env.AUTH_RATE_LIMIT_MAX_PER_ACCOUNT || '5', 10),
  
  // Exponential Backoff Config for Auth
  AUTH_BACKOFF_BASE_SEC: parseInt(process.env.AUTH_BACKOFF_BASE_SEC || '30', 10),
  AUTH_BACKOFF_MULTIPLIER: parseFloat(process.env.AUTH_BACKOFF_MULTIPLIER || '2.0'),

  // Public Endpoint Rate Limits
  PUBLIC_RATE_LIMIT_WINDOW_MS: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
  PUBLIC_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Authenticated User Action Rate Limits
  USER_RATE_LIMIT_WINDOW_MS: parseInt(process.env.USER_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
  USER_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.USER_RATE_LIMIT_MAX_REQUESTS || '300', 10),

  // Sensitive Operation Rate Limits (Uploads, AI Streaming, Emergency updates)
  SENSITIVE_RATE_LIMIT_WINDOW_MS: parseInt(process.env.SENSITIVE_RATE_LIMIT_WINDOW_MS || '60000', 10),
  SENSITIVE_RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.SENSITIVE_RATE_LIMIT_MAX_REQUESTS || '50', 10),

  // File Upload Security Thresholds
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || '20971520', 10), // 20 MB
  MAX_IMAGE_SIZE_BYTES: parseInt(process.env.MAX_IMAGE_SIZE_BYTES || '26214400', 10), // 25 MB
  ALLOWED_FILE_EXTENSIONS: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'csv', 'log', 'json'],
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'text/plain',
    'text/csv',
    'application/json'
  ]
};
