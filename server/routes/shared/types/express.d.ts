import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      isAuthenticated(): boolean;
      user?: {
        id: string;
      };
      body: any;
      query: any;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
  };
  isAuthenticated(): boolean;
  body: any;
  query: any;
}

export interface FileUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
}

export type AuthenticatedRequestHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response> | void | Response;

export type FileUploadRequestHandler = (
  req: FileUploadRequest,
  res: Response,
  next: NextFunction
) => Promise<void | Response> | void | Response;

declare module 'express' {
  interface RequestHandler<
    P = ParamsDictionary,
    ResBody = any,
    ReqBody = any,
    ReqQuery = any,
    Locals extends Record<string, any> = Record<string, any>
  > {
    (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void | Response> | void | Response;
  }
}

declare module 'express-serve-static-core' {
  interface Request<P = ParamsDictionary, ResBody = any, ReqBody = any, ReqQuery = any, Locals extends Record<string, any> = Record<string, any>> {
    isAuthenticated(): boolean;
    user?: {
      id: string;
    };
  }
} 