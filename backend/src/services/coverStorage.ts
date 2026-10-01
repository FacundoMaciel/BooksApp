import { randomUUID } from 'node:crypto';
import { ValidationError } from '../domain/errors';
import type { CoverImage, CoverRepository } from '../repositories/coverRepository';

/** Ruta pública bajo la que se sirven las portadas subidas. */
export const COVERS_PUBLIC_PATH = '/uploads/covers';
export const MAX_COVER_BYTES = 2 * 1024 * 1024;

/**
 * Formatos admitidos, detectados por su firma binaria ("magic bytes") y no por el
 * nombre o el Content-Type que manda el cliente, que pueden falsearse.
 */
const FORMATS: { ext: string; mimeType: string; matches: (b: Buffer) => boolean }[] = [
  { ext: 'jpg', mimeType: 'image/jpeg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    mimeType: 'image/png',
    matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: 'gif', mimeType: 'image/gif', matches: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    ext: 'webp',
    mimeType: 'image/webp',
    matches: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
];

const FILENAME = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|gif|webp)$/;

export function detectFormat(data: Buffer) {
  return FORMATS.find((f) => f.matches(data));
}

/** Guarda y recupera portadas subidas. Se almacenan en la base de datos. */
export class CoverStorage {
  constructor(private readonly repo: CoverRepository) {}

  /** Valida y guarda la imagen; devuelve su ruta pública (`/uploads/covers/<uuid>.<ext>`). */
  async save(data: Buffer): Promise<string> {
    const format = detectFormat(data);
    if (!format) {
      throw new ValidationError('La portada debe ser una imagen JPG, PNG, WEBP o GIF');
    }
    const id = randomUUID();
    await this.repo.save({ id, mimeType: format.mimeType, data });
    return `${COVERS_PUBLIC_PATH}/${id}.${format.ext}`;
  }

  /** Busca por nombre de archivo (`<uuid>.<ext>`); la extensión debe coincidir con el formato guardado. */
  async find(filename: string): Promise<CoverImage | undefined> {
    const match = FILENAME.exec(filename);
    if (!match) return undefined;
    const image = await this.repo.findById(match[1]!);
    const format = FORMATS.find((f) => f.ext === match[2]);
    return image && image.mimeType === format?.mimeType ? image : undefined;
  }
}
