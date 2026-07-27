import express from 'express';
import { ZodError, ZodSchema } from 'zod';

/**
 * Structured Server Logger that strictly redacts sensitive information
 */
export function logSecurityEvent(type: string, details: Record<string, any>) {
  const sanitizedDetails = { ...details };

  // Redact secrets, passwords, tokens, API keys, full document contents
  const sensitiveKeys = ['password', 'token', 'key', 'secret', 'authorization', 'cookie', 'text', 'extractedText', 'imageBase64', 'photo'];
  
  for (const k of Object.keys(sanitizedDetails)) {
    const lowerKey = k.toLowerCase();
    if (sensitiveKeys.some(s => lowerKey.includes(s))) {
      if (typeof sanitizedDetails[k] === 'string') {
        sanitizedDetails[k] = `[REDACTED_LEN_${sanitizedDetails[k].length}]`;
      } else {
        sanitizedDetails[k] = '[REDACTED]';
      }
    }
  }

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    event: type,
    ...sanitizedDetails
  }));
}

/**
 * Express Middleware to apply security headers
 */
export function applySecurityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; media-src 'self' data: https:; connect-src 'self' https:;"
  );
  next();
}

/**
 * Input Validation Middleware Wrapper using Zod Schemas
 */
export function validateBody(schema: ZodSchema<any>) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const firstError = err.issues[0];
        const fieldName = firstError.path.join('.');
        return res.status(400).json({
          error: `Invalid request payload: ${fieldName ? `'${fieldName}' ` : ''}${firstError.message}`
        });
      }
      return res.status(400).json({ error: 'Invalid input format.' });
    }
  };
}

/**
 * Centralized Error Handling Middleware for Express
 */
export function errorHandler(
  err: any,
  req: express.Request,
  res: express.Response,
  _next: express.NextFunction
) {
  // Structured logging for developers on server side only
  logSecurityEvent('SERVER_ERROR', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    errorMessage: err.message || String(err),
    status: err.status || err.statusCode || 500
  });

  if (res.headersSent) {
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  
  // Generic safe user messages preventing details leakage
  let userMessage = 'An unexpected error occurred. Please try again later.';
  
  if (err.isOperational && err.message) {
    userMessage = err.message;
  } else if (statusCode === 400) {
    userMessage = 'Bad request. Please check your input parameters.';
  } else if (statusCode === 401) {
    userMessage = 'Authentication required. Please log in again.';
  } else if (statusCode === 403) {
    userMessage = 'Access denied. You do not have permission to perform this action.';
  } else if (statusCode === 404) {
    userMessage = 'Requested resource not found.';
  } else if (statusCode === 429) {
    userMessage = 'Too many requests. Please slow down and try again later.';
  }

  res.status(statusCode).json({ error: userMessage });
}
