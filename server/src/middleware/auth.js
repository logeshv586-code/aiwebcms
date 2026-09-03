import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { httpError } from '../utils/http.js';

function getToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

export async function optionalAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) return next();
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me');
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (user?.isActive) req.user = user;
    return next();
  } catch {
    return next();
  }
}

export async function requireAuth(req, res, next) {
  try {
    const token = getToken(req);
    if (!token) throw httpError(401, 'Please sign in to continue.');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'development-only-change-me');
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw httpError(401, 'Your session is no longer valid.');
    req.user = user;
    return next();
  } catch (error) {
    return next(error.status ? error : httpError(401, 'Please sign in again.'));
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(httpError(403, 'You do not have permission to do that.'));
    }
    return next();
  };
}

export const requireAdmin = [requireAuth, requireRoles('OWNER', 'ADMIN', 'MANAGER', 'EDITOR')];
export const requireManager = [requireAuth, requireRoles('OWNER', 'ADMIN', 'MANAGER')];

export const requireOwner = [requireAuth, requireRoles('OWNER')];
