import { Router } from 'express';
import { createAuthorSchema } from '../domain/schemas';
import { requireAuth } from '../middleware/requireAuth';
import { parseOrThrow } from '../middleware/validate';
import type { AuthService } from '../services/authService';
import type { LibraryService } from '../services/libraryService';

export function authorsRouter(service: LibraryService, auth: AuthService): Router {
  const router = Router();
  // Crear requiere sesión; las consultas son públicas.
  const authenticated = requireAuth(auth);

  router.get('/', async (_req, res) => {
    res.json(await service.listAuthors());
  });

  router.get('/:authorId/books', async (req, res) => {
    const authorId = parseInt(req.params.authorId, 10);
    const author = (await service.listAuthors()).find((a) => a.id === authorId);
    if (!author) {
      res.status(404).json({ error: 'Author not found' });
      return;
    }
    res.json(author.books);
  });

  router.post('/', authenticated, async (req, res) => {
    const input = parseOrThrow(createAuthorSchema, req.body);
    res.status(201).json(await service.createAuthor(input));
  });

  return router;
}
