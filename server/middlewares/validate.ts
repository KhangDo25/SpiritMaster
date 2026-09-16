import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { apiResponse } from '../utils/response';

export const validate = (schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json(
          apiResponse(false, "Validation failed", error.issues || (error as any).errors, "VALIDATION_ERROR")
        );
      } else {
        next(error);
      }
    }
  };
