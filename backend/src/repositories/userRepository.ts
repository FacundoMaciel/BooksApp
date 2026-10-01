import type { User } from '../domain/entities';

export interface UserRepository {
  create(data: Omit<User, 'id'>): Promise<User>;
  findByEmail(email: string): Promise<User | undefined>;
  findById(id: number): Promise<User | undefined>;
}
