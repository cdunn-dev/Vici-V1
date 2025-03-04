
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiError } from './errorHandler';

export const validate = <T extends z.ZodType>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body against schema
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        // Format zod errors for better readability
        const errorMessages = result.error.errors.map(error => ({
          path: error.path.join('.'),
          message: error.message,
        }));
        
        throw ApiError.badRequest(`Validation error: ${JSON.stringify(errorMessages)}`);
      }
      
      // Add validated data to request object
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};
