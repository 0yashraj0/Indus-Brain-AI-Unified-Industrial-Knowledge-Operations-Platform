import express from 'express';
import crypto from 'crypto';
import { SECURITY_CONFIG } from './securityConfig.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  failedAttempts: number;
  backoffUntil: number;
}

// In-memory stores with periodic garbage collection
const ipStore = new Map<string, RateLimitRecord>();
const accountStore = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime && now > record.backoffUntil) {
      ipStore.delete(key);
    }
  }
  for (const [key, record] of accountStore.entries()) {
    if (now > record.resetTime && now > record.backoffUntil) {
      accountStore.delete(key);
    }
  }
  if (ipStore.size > 20000) ipStore.clear();
  if (accountStore.size > 20000) accountStore.clear();
}, 5 * 60 * 1000);

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim() !== '') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

function hashIdentifier(id: string): string {
  const norm = String(id || '').trim().toLowerCase();
  return crypto.createHash('sha256').update(norm).digest('hex');
}

/**
 * Generic Rate Limiter for endpoints
 */
export function createRateLimiter(options: { windowMs: number; max: number }) {
  const instanceStore = new Map<string, RateLimitRecord>();

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = getClientIp(req);
    const now = Date.now();
    let record = instanceStore.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + options.windowMs, failedAttempts: 0, backoffUntil: 0 };
      instanceStore.set(ip, record);
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'Too many requests. Please slow down and try again later.'
      });
    }

    record.count += 1;
    next();
  };
}

/**
 * Dual per-IP and per-account Rate Limiter with Exponential Backoff for Authentication
 */
export function checkAuthRateLimit(req: express.Request, accountId?: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const ip = getClientIp(req);
  const hashedAcc = accountId ? hashIdentifier(accountId) : 'unknown_acc';

  const ipKey = `auth_ip:${ip}`;
  const accKey = `auth_acc:${hashedAcc}`;

  let ipRecord = ipStore.get(ipKey);
  if (!ipRecord || now > ipRecord.resetTime) {
    ipRecord = { count: 0, resetTime: now + SECURITY_CONFIG.AUTH_RATE_LIMIT_WINDOW_MS, failedAttempts: 0, backoffUntil: 0 };
    ipStore.set(ipKey, ipRecord);
  }

  let accRecord = accountStore.get(accKey);
  if (!accRecord || now > accRecord.resetTime) {
    accRecord = { count: 0, resetTime: now + SECURITY_CONFIG.AUTH_RATE_LIMIT_WINDOW_MS, failedAttempts: 0, backoffUntil: 0 };
    accountStore.set(accKey, accRecord);
  }

  // Check exponential backoff delays
  if (now < ipRecord.backoffUntil) {
    const retrySec = Math.max(1, Math.ceil((ipRecord.backoffUntil - now) / 1000));
    return { allowed: false, retryAfterSec: retrySec };
  }

  if (now < accRecord.backoffUntil) {
    const retrySec = Math.max(1, Math.ceil((accRecord.backoffUntil - now) / 1000));
    return { allowed: false, retryAfterSec: retrySec };
  }

  // Check volume limits
  if (ipRecord.count >= SECURITY_CONFIG.AUTH_RATE_LIMIT_MAX_PER_IP) {
    const retrySec = Math.max(1, Math.ceil((ipRecord.resetTime - now) / 1000));
    return { allowed: false, retryAfterSec: retrySec };
  }

  if (accountId && accRecord.count >= SECURITY_CONFIG.AUTH_RATE_LIMIT_MAX_PER_ACCOUNT) {
    const retrySec = Math.max(1, Math.ceil((accRecord.resetTime - now) / 1000));
    return { allowed: false, retryAfterSec: retrySec };
  }

  ipRecord.count += 1;
  if (accountId) accRecord.count += 1;

  return { allowed: true };
}

/**
 * Record a failed authentication attempt to trigger exponential backoff
 */
export function recordFailedAuth(req: express.Request, accountId?: string) {
  const now = Date.now();
  const ip = getClientIp(req);
  const hashedAcc = accountId ? hashIdentifier(accountId) : 'unknown_acc';

  const ipKey = `auth_ip:${ip}`;
  const accKey = `auth_acc:${hashedAcc}`;

  const ipRecord = ipStore.get(ipKey);
  if (ipRecord) {
    ipRecord.failedAttempts += 1;
    if (ipRecord.failedAttempts >= 3) {
      const exponent = ipRecord.failedAttempts - 3;
      const backoffSec = Math.min(3600, Math.round(SECURITY_CONFIG.AUTH_BACKOFF_BASE_SEC * Math.pow(SECURITY_CONFIG.AUTH_BACKOFF_MULTIPLIER, exponent)));
      ipRecord.backoffUntil = now + (backoffSec * 1000);
    }
  }

  if (accountId) {
    const accRecord = accountStore.get(accKey);
    if (accRecord) {
      accRecord.failedAttempts += 1;
      if (accRecord.failedAttempts >= 3) {
        const exponent = accRecord.failedAttempts - 3;
        const backoffSec = Math.min(3600, Math.round(SECURITY_CONFIG.AUTH_BACKOFF_BASE_SEC * Math.pow(SECURITY_CONFIG.AUTH_BACKOFF_MULTIPLIER, exponent)));
        accRecord.backoffUntil = now + (backoffSec * 1000);
      }
    }
  }
}

/**
 * Clear rate limit counters on successful authentication
 */
export function clearAuthRateLimit(req: express.Request, accountId?: string) {
  const ip = getClientIp(req);
  ipStore.delete(`auth_ip:${ip}`);
  if (accountId) {
    const hashedAcc = hashIdentifier(accountId);
    accountStore.delete(`auth_acc:${hashedAcc}`);
  }
}
