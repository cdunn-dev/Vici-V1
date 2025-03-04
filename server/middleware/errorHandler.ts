
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class ApiError extends Error {
  statusCode: number;
  
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
  
  static badRequest(msg: string) {
    return new ApiError(400, msg);
  }
  
  static unauthorized(msg: string = 'Unauthorized') {
    return new ApiError(401, msg);
  }
  
  static forbidden(msg: string = 'Forbidden') {
    return new ApiError(403, msg);
  }
  
  static notFound(msg: string = 'Resource not found') {
    return new ApiError(404, msg);
  }
  
  static internal(msg: string = 'Internal server error') {
    return new ApiError(500, msg);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error(`[${req.method}] ${req.path} - ${err.message}`, {
    error: err.stack,
    requestId: req.headers['x-request-id'],
    userId: (req as any).userId,
  });
  
  // Handle ApiError instances
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    });
  }
  
  // Handle generic errors
  return res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    statusCode: 500,
  });
};
