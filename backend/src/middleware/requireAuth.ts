import type { RequestHandler } from 'express';
import type { PublicUser } from '../domain/entities';
import { UnauthorizedError } from '../domain/errors';
import type { AuthService } from '../services/authService';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      user?: PublicUser;
    }
  }
}

/** Exige `Authorization: Bearer <token>` y deja el usuario en `res.locals.user`. */
export function requireAuth(auth: AuthService): RequestHandler {
  return async (req, res, next) => {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Falta el token de autenticación');
    }
    res.locals.user = await auth.verifyToken(token);
    next();
  };
}
