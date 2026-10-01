import { Router } from 'express';
import { createBookSchema, idParamSchema } from '../domain/schemas';
import { requireAuth } from '../middleware/requireAuth';
import { parseOrThrow } from '../middleware/validate';
import type { AuthService } from '../services/authService';
import type { LibraryService } from '../services/libraryService';

export function booksRouter(service: LibraryService, auth: AuthService): Router {
  const router = Router();
  // Crear requiere sesión; las consultas son públicas.
  const authenticated = requireAuth(auth);

  router.get('/', async (_req, res) => {
    res.json(await service.listBooks());
  });

  router.post('/', authenticated, async (req, res) => {
    const input = parseOrThrow(createBookSchema, req.body);
    res.status(201).json(await service.createBook(input));
  });

  router.get('/:id/average-pages-per-chapter', async (req, res) => {
    const id = parseOrThrow(idParamSchema, req.params.id);
    res.json(await service.getPagesPerChapter(id));
  });

  router.get('/:id', async (req, res) => {
    const id = parseOrThrow(idParamSchema, req.params.id);
    const book = (await service.listBooks()).find((b) => b.id === id);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }
    res.json(book);
  });

  return router;
}
