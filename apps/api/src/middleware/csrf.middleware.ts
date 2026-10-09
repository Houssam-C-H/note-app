import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// A simple Double Submit Cookie CSRF implementation
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Safe methods that don't modify state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt auth endpoints (login, register, refresh)
  const path = req.originalUrl || req.path;
  if (path.includes('/api/auth/refresh') || path.includes('/api/auth/login') || path.includes('/api/auth/register')) {
    return next();
  }

  // Authorization Bearer token requests are not vulnerable to standard CSRF
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  const cookieToken = req.cookies['csrf_token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' });
  }

  next();
};

export const generateCsrfToken = (req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('csrf_token', token, {
    httpOnly: false, // Must be readable by the frontend JS to attach to the header
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });
  res.json({ csrfToken: token });
};
