import { z } from 'zod';

const positiveInt = (field: string) =>
  z
    .number({ error: `${field} debe ser un número` })
    .int(`${field} debe ser un entero`)
    .positive(`${field} debe ser mayor a 0`);

/** URL externa http(s) o ruta de una imagen subida con POST /uploads/covers. Opcional. */
const imageUrl = (field: string) =>
  z
    .union(
      [
        z.url({ protocol: /^https?$/ }),
        z.string().regex(/^\/uploads\/covers\/[0-9a-f-]{36}\.(jpg|png|gif|webp)$/),
      ],
      { error: `${field} debe ser una URL http(s) válida o una imagen subida` },
    )
    .nullish()
    .transform((url) => url ?? null);

/** Texto opcional: se recorta y "" se guarda como null. */
const optionalText = (field: string, max: number) =>
  z
    .string({ error: `${field} debe ser un texto` })
    .trim()
    .max(max, `${field} no puede superar ${max} caracteres`)
    .nullish()
    .transform((text) => text || null);

const optionalYear = (field: string) =>
  z
    .number({ error: `${field} debe ser un número` })
    .int(`${field} debe ser un entero`)
    .min(1, `${field} debe ser mayor a 0`)
    .max(new Date().getFullYear(), `${field} no puede ser posterior al año actual`)
    .nullish()
    .transform((year) => year ?? null);

export const createAuthorSchema = z
  .object({
    name: z
      .string({ error: 'name es obligatorio' })
      .trim()
      .min(1, 'name no puede estar vacío')
      .max(120, 'name no puede superar 120 caracteres'),
    nationality: optionalText('nationality', 60),
    birthYear: optionalYear('birthYear'),
    deathYear: optionalYear('deathYear'),
    biography: optionalText('biography', 1000),
    photoUrl: imageUrl('photoUrl'),
  })
  .refine((a) => a.birthYear === null || a.deathYear === null || a.deathYear >= a.birthYear, {
    message: 'deathYear no puede ser anterior a birthYear',
    path: ['deathYear'],
  });

export const createBookSchema = z.object({
  title: z.string({ error: 'title es obligatorio' }).trim().min(1, 'title no puede estar vacío'),
  chapters: positiveInt('chapters'),
  pages: positiveInt('pages'),
  coverUrl: imageUrl('coverUrl'),
  authorIds: z
    .array(positiveInt('authorIds[]'), { error: 'authorIds debe ser un arreglo de ids' })
    .min(1, 'El libro debe tener al menos un autor')
    // Se eliminan duplicados para no generar relaciones repetidas.
    .transform((ids) => [...new Set(ids)]),
});

export const idParamSchema = z.coerce
  .number({ error: 'El id debe ser numérico' })
  .int('El id debe ser un entero')
  .positive('El id debe ser mayor a 0');

export type CreateAuthorInput = z.infer<typeof createAuthorSchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;

const email = z
  .string({ error: 'email es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email('email no es válido'));

export const registerSchema = z.object({
  name: z.string({ error: 'name es obligatorio' }).trim().min(1, 'name no puede estar vacío'),
  email,
  password: z
    .string({ error: 'password es obligatorio' })
    .min(8, 'password debe tener al menos 8 caracteres')
    .max(128, 'password no puede superar 128 caracteres'),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: 'password es obligatorio' }).min(1, 'password es obligatorio'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
