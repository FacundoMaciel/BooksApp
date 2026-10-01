# Prueba técnica — React y Node.js (TypeScript)

| Carpeta     | Ejercicio                                     | Stack                                   |
| ----------- | --------------------------------------------- | --------------------------------------- |
| `frontend/` | 1. Añadir y eliminar elementos de una lista   | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| `backend/`  | 2. API REST de Libros y Autores               | Node.js + Express 5 + Zod + PostgreSQL + TypeScript |

Requisitos: Node.js ≥ 16 y npm. Ambos proyectos incluyen tests (Vitest).

---

## Ejercicio 1 — Lista (frontend)

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
npm test        # tests con Testing Library
npm run build
```

**Funcionalidad**

- Campo de texto + botón **Añadir**: agrega el texto al final de la lista.
- Click sobre cualquier elemento de la lista lo elimina.

**Detalles de usabilidad**

- Se puede añadir también con la tecla **Enter** (se usa un `<form>`).
- Se hace `trim` del texto; el botón queda deshabilitado si el campo está vacío o solo tiene espacios.
- Tras añadir se limpia el campo y se devuelve el foco, para cargar varios elementos seguidos.
- Cada elemento es un `<button>`: accesible por teclado (Tab + Enter/Espacio) y con `aria-label` "Eliminar …".
- Feedback visual al pasar el mouse (tachado + ✕), contador de elementos y mensaje de lista vacía.
- Estilos minimalistas con Tailwind CSS, responsive (formulario apilado en móvil, en fila desde `sm`) y con modo oscuro automático.
- Cada elemento tiene un id propio, así los textos repetidos se eliminan de forma individual.

**Rutas de la app**

| Ruta        | Contenido                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| `/`         | Home: **bienvenida** (personalizada si hay sesión) y debajo un **carrusel de portadas** (deslizable, flechas, avance automático pausable) |
| `/libros`   | Catálogo: solo las cards de libros (autores, capítulos, páginas, pág./cap. y extensión de lectura), desde `GET /books` |
| `/autores`  | Autores: cada uno con iniciales, cantidad de libros, páginas totales y sus libros con portada (orden alfabético) |
| `/lista`    | Ejercicio 1 — **requiere sesión** (redirige a login y vuelve)             |
| `/libros/nuevo` | Formulario para agregar un libro: **portada obligatoria** (click o arrastrar, vista previa), selección o creación de autores — **requiere sesión** |
| `/login`    | Inicio de sesión                                                          |
| `/register` | Registro                                                                  |

Navbar con login/registro (menú hamburguesa en móvil) y footer con navegación. La sesión (JWT) se guarda
en `localStorage` y se valida con `GET /auth/me` al recargar. URL de la API configurable con `VITE_API_URL` (en `frontend/.env`, ver `frontend/.env.example`)
(por defecto `http://localhost:3000`), así que la API debe estar levantada para ver libros e iniciar sesión.

**Estructura**

```
src/
  App.tsx                     rutas
  api/                        cliente fetch, endpoints y tipos
  auth/                       AuthProvider, useAuth, RequireAuth
  pages/                      Home, Books, AddBook, List (ejercicio 1), Login, Register, 404
  components/layout/          Navbar, Footer, Layout
  components/home/            WelcomeSection
  components/AddItemForm.tsx  formulario del ejercicio 1
  components/ItemList.tsx     lista clickeable del ejercicio 1
  hooks/useItemList.ts        estado y lógica (add/remove)
```

---

## Ejercicio 2 — API REST (backend)

```bash
cd backend
npm install
npm run dev     # http://localhost:3000 (modo watch)
npm test        # tests de integración con supertest
npm run build && npm start
```

La configuración se lee de `backend/.env` (ver [`backend/.env.example`](backend/.env.example)); las variables
del entorno tienen prioridad.

| Variable                | Por defecto           | Descripción                                                   |
| ----------------------- | --------------------- | ------------------------------------------------------------- |
| `DATABASE_URL_EXTERNAL` | —                     | URL de PostgreSQL para correr en local (External URL de Render) |
| `DATABASE_URL`          | —                     | Si está, tiene prioridad (p. ej. la Internal URL al desplegar en Render) |
| `PORT`                  | `3000`                | Puerto HTTP                                                   |
| `JWT_SECRET`            | secreto de desarrollo | Clave para firmar tokens (mín. 32 caracteres). **Obligatoria si `NODE_ENV=production`** |
| `JWT_TTL_SECONDS`       | `604800` (7 días)     | Duración de la sesión                                         |
| `CORS_ORIGIN`           | cualquiera            | Orígenes permitidos, separados por coma (p. ej. `http://localhost:5173`) |
| `SEED`                  | `true`                | `false` para no cargar el catálogo de ejemplo                 |
| `PGSSLMODE`             | —                     | `disable` para conectar sin SSL (p. ej. un Postgres local)    |

### Persistencia (PostgreSQL)

Los datos viven en PostgreSQL (Render) con el driver `pg`. La conexión usa SSL con verificación de certificado
para hosts remotos; los locales (`localhost`) y la Internal URL de Render (sin dominio) se conectan sin SSL.

| Tabla               | Columnas                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `users`             | `id`, `name`, `email` (único, guardado en minúsculas), `password_hash`, `created_at` |
| `authors`           | `id`, `name`, `created_at`                                               |
| `books`             | `id`, `title`, `chapters` (> 0), `pages` (> 0), `cover_url` (opcional), `created_at` |
| `book_authors`      | `book_id` → books, `author_id` → authors, `position` (orden de los autores); PK compuesta, `ON DELETE CASCADE` |
| `cover_images`      | `id` (UUID), `mime_type`, `size`, `data` (BYTEA), `created_at`: portadas subidas |
| `schema_migrations` | versiones de esquema aplicadas                                           |

- Esquema versionado en [`src/db/migrations.ts`](backend/src/db/migrations.ts): al arrancar se aplican las
  migraciones pendientes; para cambiar el esquema se agrega una nueva al final.
- Claves foráneas y `CHECK` en la base, además de la validación con Zod en la API.
- Crear un libro y sus relaciones ocurre en una transacción.
- Los tests usan [pg-mem](https://github.com/oguimbal/pg-mem) (PostgreSQL en memoria): ejecutan el mismo SQL sin
  necesitar un servidor. pg-mem no emula `ROLLBACK`, así que ese caso no se cubre en los tests.

#### Migrar datos desde la base SQLite anterior

```bash
npm run db:migrate-sqlite               # copia backend/data/library.db a Postgres (debe estar vacío)
npm run db:migrate-sqlite -- --replace  # vacía antes las tablas de Postgres
npm run db:import-uploads               # importa las portadas de backend/data/uploads/covers (conserva sus URLs)
```

Conserva ids, fechas, hashes de contraseña (las cuentas siguen funcionando) y el orden de los autores; todo en
una transacción y verificando al final que las cantidades coincidan. `better-sqlite3` queda solo como dependencia
de desarrollo para este script (fijado en la v11 por sus binarios precompilados para Node 20 en Windows).

### Endpoints

| Método | Ruta                                  | Descripción                                        |
| ------ | ------------------------------------- | -------------------------------------------------- |
| POST   | `/books`                              | Crea un libro con sus autores (`coverUrl` opcional: URL http(s) o la `url` devuelta por `/uploads/covers`) — 🔒 requiere token |
| GET    | `/books`                              | Lista los libros con sus autores                   |
| POST   | `/authors`                            | Crea un autor — 🔒 requiere token                  |
| GET    | `/authors`                            | Lista los autores con sus libros                   |
| GET    | `/books/:id/average-pages-per-chapter`| Promedio de páginas por capítulo de un libro       |
| GET    | `/health`                             | Healthcheck                                        |
| POST   | `/auth/register`                      | `{name, email, password}` → 201 `{token, user}` (409 si el email existe) |
| POST   | `/auth/login`                         | `{email, password}` → `{token, user}` (401 si son incorrectos) |
| GET    | `/auth/me`                            | Usuario actual (`Authorization: Bearer <token>`)   |
| POST   | `/uploads/covers`                     | Sube una portada (multipart, campo `cover`, JPG/PNG/WEBP/GIF, máx. 2 MB) → 201 `{url}` — 🔒 requiere token |

Auth: usuarios en PostgreSQL, contraseñas con `scrypt` + salt (módulo `crypto` de Node), JWT HS256 con 7 días de
vigencia. La sesión se mantiene entre reinicios de la API mientras no cambie `JWT_SECRET`. Crear libros y autores requiere `Authorization: Bearer <token>` (401 si falta o es inválido); las consultas
(`GET`) son públicas.

### Ejemplos

```bash
# Obtener un token (o usar /auth/login si la cuenta ya existe)
curl -X POST localhost:3000/auth/register -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"supersegura"}'
# 201 {"token":"eyJ...","user":{"id":1,"name":"Ada","email":"ada@example.com"}}
TOKEN=eyJ...

curl -X POST localhost:3000/authors -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Borges"}'
# 201 {"id":1,"name":"Borges","books":[]}

curl -X POST localhost:3000/authors -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Bioy Casares"}'

curl -X POST localhost:3000/books -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Seis problemas para don Isidro Parodi","chapters":6,"pages":157,"authorIds":[1,2]}'
# 201 {"id":1,"title":"...","chapters":6,"pages":157,"authors":[{"id":1,"name":"Borges"},{"id":2,"name":"Bioy Casares"}]}

curl localhost:3000/books
curl localhost:3000/authors
# [{"id":1,"name":"Borges","books":[{"id":1,"title":"...","chapters":6,"pages":157}]}, ...]

curl localhost:3000/books/1/average-pages-per-chapter
# 200 {"id":"1","averagePagesPerChapter":"26.17"}
```

### Errores

Formato uniforme: `{ "error": string, "details"?: unknown }`

| Código | Caso                                                                 |
| ------ | -------------------------------------------------------------------- |
| 400    | Body inválido (validación Zod, con detalle por campo) o JSON mal formado; id no numérico |
| 401    | Falta el token, es inválido o expiró; credenciales incorrectas en login |
| 409    | Email ya registrado                                                  |
| 404    | Libro inexistente, autores inexistentes (`details.missingAuthorIds`) o ruta desconocida |
| 500    | Error no controlado                                                  |

### Arquitectura

```
src/
  db/            pool de PostgreSQL, migraciones y transacciones
  domain/        entidades, esquemas de validación (Zod) y errores
  repositories/  interfaces LibraryRepository / UserRepository + implementaciones PostgreSQL
  services/      lógica de negocio (LibraryService, AuthService, hashing de contraseñas)
  routes/        routers de Express (auth, books, authors)
  middleware/    validación, requireAuth y manejo de errores
  seed.ts        catálogo de ejemplo (21 libros, 12 autores, portadas de Open Library); agrega solo los que falten
  app.ts         createApp({ db, auth }) — inyección de dependencias (facilita tests)
  config.ts      carga de .env y URL de la base
  scripts/       migración de datos SQLite → PostgreSQL
  index.ts       arranque: migraciones, seed, servidor y cierre ordenado
```

La relación **Many-to-Many** se modela con la tabla intermedia `book_authors`. Los servicios dependen de
las interfaces de repositorio, así que cambiar de motor (p. ej. PostgreSQL) no toca servicios ni rutas.

### Supuestos y aclaraciones

- **Almacenamiento**: PostgreSQL en Render (ver [Persistencia](#persistencia-postgresql)). Las portadas subidas también se guardan en la base (tabla `cover_images`), así funcionan en Render, donde el disco no es persistente. Los ids son autoincrementales.
- **Autores al crear un libro**: se envían como `authorIds` (autores ya existentes). Se exige al menos uno,
  se ignoran ids duplicados y, si alguno no existe, se responde 404 sin crear el libro.
- `chapters` y `pages` deben ser **enteros positivos** (esto además evita la división por cero en el promedio).
- `title` y `name` se guardan sin espacios al inicio/final y no pueden quedar vacíos.
- El promedio se redondea con `toFixed(2)` y, como pide el enunciado, tanto el id como el promedio se devuelven como **string**.
- En los listados anidados (libros de un autor / autores de un libro) no se repite la relación inversa, para evitar respuestas circulares.
- **Portadas subidas**: el formato se valida por el contenido del archivo (firma binaria), no por el nombre ni el
  `Content-Type`; se guardan en PostgreSQL (`cover_images`) con un id aleatorio y se sirven en `/uploads/covers/<id>.<ext>` con caché inmutable; el libro guarda esa ruta relativa. La API mantiene
  `coverUrl` opcional (compatibilidad con el enunciado); es el formulario del frontend el que exige la imagen. Si la
  subida funciona pero falla la creación del libro, la imagen queda sin usar en la base (aceptable para este alcance).
