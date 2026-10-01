import cors from 'cors';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express, { type Express } from 'express';
import type { Db } from './db/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { PgLibraryRepository } from './repositories/pgLibraryRepository';
import { PgUserRepository } from './repositories/pgUserRepository';
import { authRouter } from './routes/auth';
import { authorsRouter } from './routes/authors';
import { booksRouter } from './routes/books';
import { uploadsRouter } from './routes/uploads';
import { AuthService, type AuthConfig } from './services/authService';
import { CoverStorage } from './services/coverStorage';
import { LibraryService } from './services/libraryService';

export interface AppDeps {
  /** Pool de PostgreSQL con las migraciones ya aplicadas. */
  db: Db;
  auth: AuthConfig;
  /** Carpeta de archivos subidos; por defecto una temporal (tests). */
  uploadsDir: string;
}

export const defaultAuthConfig: AuthConfig = {
  jwtSecret: 'dev-secret-cambiar-en-produccion',
  tokenTtlSeconds: 60 * 60 * 24 * 7, // 7 días
};

export function createApp(deps: Pick<AppDeps, 'db'> & Partial<AppDeps>): Express {
  const libraryService = new LibraryService(new PgLibraryRepository(deps.db));
  const authService = new AuthService(new PgUserRepository(deps.db), deps.auth ?? defaultAuthConfig);
  const uploadsDir = deps.uploadsDir ?? mkdtempSync(join(tmpdir(), 'libros-uploads-'));
  const coverStorage = new CoverStorage(join(uploadsDir, 'covers'));
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/auth', authRouter(authService));
  app.use('/books', booksRouter(libraryService, authService));
  app.use('/authors', authorsRouter(libraryService, authService));
  app.use('/uploads', uploadsRouter(coverStorage, authService, uploadsDir));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
