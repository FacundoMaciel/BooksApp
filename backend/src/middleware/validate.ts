import type { ZodType } from 'zod';
import { ValidationError } from '../domain/errors';

export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(
      'Datos inválidos',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.') || undefined,
        message: issue.message,
      })),
    );
  }
  return result.data;
}

export function validateRequestBody<T>(schema: ZodType<T>) {
  return (req: any, res: any, next: any) => {
    try {
      req.body = parseOrThrow(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
} 
