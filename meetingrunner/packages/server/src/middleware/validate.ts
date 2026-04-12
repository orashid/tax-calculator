import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.params);
      next();
    } catch (err) {
      next(err);
    }
  };
}
