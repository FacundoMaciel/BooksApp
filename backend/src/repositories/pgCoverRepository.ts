import type { Db } from '../db/database';
import type { CoverImage, CoverRepository } from './coverRepository';

/**
 * Las imágenes viajan como hexadecimal y se convierten con decode/encode en la base.
 * Así se almacenan como BYTEA sin depender de cómo cada driver serializa los Buffer.
 */
export class PgCoverRepository implements CoverRepository {
  constructor(private readonly db: Db) {}

  async save({ id, mimeType, data }: CoverImage): Promise<void> {
    await this.db.query(
      "INSERT INTO cover_images (id, mime_type, size, data) VALUES ($1, $2, $3, decode($4, 'hex'))",
      [id, mimeType, data.length, data.toString('hex')],
    );
  }

  async findById(id: string): Promise<CoverImage | undefined> {
    const { rows } = await this.db.query<{ id: string; mimeType: string; hex: string }>(
      `SELECT id, mime_type AS "mimeType", encode(data, 'hex') AS hex FROM cover_images WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    return row && { id: row.id, mimeType: row.mimeType, data: Buffer.from(row.hex, 'hex') };
  }
}
