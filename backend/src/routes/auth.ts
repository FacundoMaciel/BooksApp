import { Router } from 'express';
import { loginSchema, registerSchema } from '../domain/schemas';
import { requireAuth } from '../middleware/requireAuth';
import { parseOrThrow } from '../middleware/validate';
import type { AuthService } from '../services/authService';

export function authRouter(service: AuthService): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const input = parseOrThrow(registerSchema, req.body);
    res.status(201).json(await service.register(input));
  });

  router.post('/login', async (req, res) => {
    const input = parseOrThrow(loginSchema, req.body);
    res.json(await service.login(input));
  });

  router.get('/me', requireAuth(service), (_req, res) => {
    res.json(res.locals.user);
  });

  return router;
}
