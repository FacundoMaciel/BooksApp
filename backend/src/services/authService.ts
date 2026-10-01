import jwt from 'jsonwebtoken';
import type { AuthResult, PublicUser, User } from '../domain/entities';
import { ConflictError, UnauthorizedError } from '../domain/errors';
import type { LoginInput, RegisterInput } from '../domain/schemas';
import type { UserRepository } from '../repositories/userRepository';
import { hashPassword, verifyPassword } from './password';

export interface AuthConfig {
  jwtSecret: string;
  /** Duración del token en segundos. */
  tokenTtlSeconds: number;
}

const toPublicUser = ({ passwordHash: _passwordHash, ...user }: User): PublicUser => user;

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly config: AuthConfig,
  ) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictError('Ya existe una cuenta con ese email');
    }
    const user = await this.users.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    return this.buildAuthResult(user);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.users.findByEmail(input.email);
    // Mismo mensaje en ambos casos para no revelar qué emails están registrados.
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedError('Email o contraseña incorrectos');
    }
    return this.buildAuthResult(user);
  }

  /** Valida el token y devuelve el usuario asociado. */
  async verifyToken(token: string): Promise<PublicUser> {
    let userId: number;
    try {
      const payload = jwt.verify(token, this.config.jwtSecret);
      userId = Number(typeof payload === 'string' ? NaN : payload.sub);
    } catch {
      throw new UnauthorizedError('Token inválido o expirado');
    }
    const user = Number.isInteger(userId) ? await this.users.findById(userId) : undefined;
    if (!user) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
    return toPublicUser(user);
  }

  private buildAuthResult(user: User): AuthResult {
    const token = jwt.sign({}, this.config.jwtSecret, {
      subject: String(user.id),
      expiresIn: this.config.tokenTtlSeconds,
    });
    return { token, user: toPublicUser(user) };
  }
}
