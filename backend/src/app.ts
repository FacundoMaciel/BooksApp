import cors from 'cors';
import express, { type Express } from 'express';
import type { Db } from './db/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { PgCoverRepository } from './repositories/pgCoverRepository';
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
  /** Orígenes permitidos por CORS; vacío o ausente = cualquiera (tests). */
  corsOrigins: string[];
}

export const defaultAuthConfig: AuthConfig = {
  jwtSecret: 'dev-secret-cambiar-en-produccion',
  tokenTtlSeconds: 60 * 60 * 24 * 7, // 7 días
};

export function createApp(deps: Pick<AppDeps, 'db'> & Partial<AppDeps>): Express {
  const libraryService = new LibraryService(new PgLibraryRepository(deps.db));
  const authService = new AuthService(new PgUserRepository(deps.db), deps.auth ?? defaultAuthConfig);
  const coverStorage = new CoverStorage(new PgCoverRepository(deps.db));
  const app = express();

  app.use(cors(deps.corsOrigins?.length ? { origin: deps.corsOrigins } : undefined));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/auth', authRouter(authService));
  app.use('/books', booksRouter(libraryService, authService));
  app.use('/authors', authorsRouter(libraryService, authService));
  app.use('/uploads', uploadsRouter(coverStorage, authService));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
