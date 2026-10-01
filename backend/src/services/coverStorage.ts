import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ValidationError } from '../domain/errors';

/** Ruta pública bajo la que se sirven las portadas subidas. */
export const COVERS_PUBLIC_PATH = '/uploads/covers';
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

/**
 * Formatos admitidos, detectados por su firma binaria ("magic bytes") y no por el
 * nombre o el Content-Type que manda el cliente, que pueden falsearse.
 */
const FORMATS: { ext: string; matches: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: 'png', matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: 'gif', matches: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    ext: 'webp',
    matches: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

export class CoverStorage {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  /** Valida y guarda la imagen; devuelve su ruta pública (p. ej. `/uploads/covers/<uuid>.jpg`). */
  save(data: Buffer): string {
    const format = FORMATS.find((f) => f.matches(data));
    if (!format) {
      throw new ValidationError('La portada debe ser una imagen JPG, PNG, WEBP o GIF');
    }
    // Nombre aleatorio: evita colisiones y que el cliente controle la ruta en disco.
    const filename = `${randomUUID()}.${format.ext}`;
    writeFileSync(join(this.dir, filename), data);
    return `${COVERS_PUBLIC_PATH}/${filename}`;
  }
}
