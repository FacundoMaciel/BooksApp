/**
 * Migraciones de PostgreSQL en orden. Cada una se aplica una sola vez y queda
 * registrada en la tabla `schema_migrations`. Para cambiar el esquema, agregar
 * una nueva entrada al final (nunca modificar las existentes).
 */
export const migrations: string[] = [
  // 1 — esquema inicial
  `
  CREATE TABLE users (
    id            SERIAL      PRIMARY KEY,
    name          TEXT        NOT NULL,
    -- Se guarda en minúsculas (lo normaliza la API), así UNIQUE no distingue mayúsculas.
    email         TEXT        NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE authors (
    id         SERIAL      PRIMARY KEY,
    name       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE books (
    id         SERIAL      PRIMARY KEY,
    title      TEXT        NOT NULL,
    chapters   INTEGER     NOT NULL CHECK (chapters > 0),
    pages      INTEGER     NOT NULL CHECK (pages > 0),
    cover_url  TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- Relación Many-to-Many libros <-> autores. "position" conserva el orden de los autores.
  CREATE TABLE book_authors (
    book_id   INTEGER NOT NULL REFERENCES books(id)   ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
    position  INTEGER NOT NULL,
    PRIMARY KEY (book_id, author_id)
  );

  CREATE INDEX idx_book_authors_author ON book_authors(author_id);
  `,
];
