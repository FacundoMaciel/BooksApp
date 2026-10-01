import { Router } from 'express';
import multer from 'multer';
import { NotFoundError, ValidationError } from '../domain/errors';
import { requireAuth } from '../middleware/requireAuth';
import type { AuthService } from '../services/authService';
import { MAX_COVER_BYTES, type CoverStorage } from '../services/coverStorage';

// En memoria: el archivo se valida antes de guardarse.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COVER_BYTES, files: 1 },
});

export function uploadsRouter(storage: CoverStorage, auth: AuthService): Router {
  const router = Router();

  router.post('/covers', requireAuth(auth), (req, res, next) => {
    upload.single('cover')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        const message =
          err.code === 'LIMIT_FILE_SIZE'
            ? `La imagen no puede superar ${MAX_COVER_BYTES / 1024 / 1024} MB`
            : 'Archivo inválido: envía una sola imagen en el campo "cover"';
        return next(new ValidationError(message));
      }
      if (err) return next(err);
      if (!req.file) return next(new ValidationError('Falta la imagen en el campo "cover"'));

      // Dentro del callback de multer un throw/rechazo no llega a Express: se pasa a next().
      storage
        .save(req.file.buffer)
        .then((url) => res.status(201).json({ url }))
        .catch(next);
    });
  });

  router.get('/covers/:filename', async (req, res) => {
    const image = await storage.find(req.params.filename);
    if (!image) throw new NotFoundError('Portada no encontrada');

    res.set({
      'Content-Type': image.mimeType,
      // El nombre es único e inmutable: se puede cachear sin límite.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(image.data);
  });

  return router;
}
