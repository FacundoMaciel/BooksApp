import express, { Router } from 'express';
import multer from 'multer';
import { ValidationError } from '../domain/errors';
import { requireAuth } from '../middleware/requireAuth';
import type { AuthService } from '../services/authService';
import { MAX_COVER_BYTES, type CoverStorage } from '../services/coverStorage';

// En memoria: el archivo se valida antes de escribirse a disco.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COVER_BYTES, files: 1 },
});

export function uploadsRouter(storage: CoverStorage, auth: AuthService, uploadsDir: string): Router {
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

      // Dentro del callback de multer un throw no llega a Express: se pasa a next().
      try {
        res.status(201).json({ url: storage.save(req.file.buffer) });
      } catch (saveError) {
        next(saveError);
      }
    });
  });

  // Archivos subidos: nombres únicos e inmutables, se pueden cachear sin límite.
  router.use(
    express.static(uploadsDir, {
      immutable: true,
      maxAge: '1y',
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }),
  );

  return router;
}
