import type { Db } from '../db/database';
import type { User } from '../domain/entities';
import type { UserRepository } from './userRepository';

const USER_COLUMNS = 'id, name, email, password_hash AS "passwordHash"';

export class PgUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  async create(data: Omit<User, 'id'>): Promise<User> {
    const { rows } = await this.db.query<User>(
      `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING ${USER_COLUMNS}`,
      [data.name, data.email.toLowerCase(), data.passwordHash],
    );
    return rows[0]!;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const { rows } = await this.db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [
      email.toLowerCase(),
    ]);
    return rows[0];
  }

  async findById(id: number): Promise<User | undefined> {
    const { rows } = await this.db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
    return rows[0];
  }
}
