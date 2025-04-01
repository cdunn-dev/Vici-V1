import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { Session } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
      };
      session: Session & {
        userId?: number;
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email: string;
  };
}

export interface FileUploadRequest extends Request {
  file?: Express.Multer.File;
}

export type AuthenticatedRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

export type FileUploadRequestHandler = (
  req: FileUploadRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>; 