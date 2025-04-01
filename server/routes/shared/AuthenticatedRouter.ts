import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import { AuthenticatedRequestHandler, AuthenticatedRequest } from '../../types/express';

export function createAuthenticatedRouter() {
  const router = Router();

  const convertHandler = (handler: AuthenticatedRequestHandler): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Basic validation of required properties
        if (!req.user || typeof req.user.id !== 'number') {
          return res.status(401).json({
            status: 'error',
            message: 'Authentication required'
          });
        }

        if (!req.session?.userId || typeof req.session.userId !== 'number') {
          return res.status(401).json({
            status: 'error',
            message: 'Invalid session'
          });
        }

        // Safe type assertion after validation
        const authenticatedReq = req as unknown as AuthenticatedRequest;
        await handler(authenticatedReq, res, next);
      } catch (error) {
        next(error);
      }
    };
  };

  return {
    ...router,
    get(path: string, ...handlers: AuthenticatedRequestHandler[]) {
      return router.get(path, ...handlers.map(convertHandler));
    },
    post(path: string, ...handlers: AuthenticatedRequestHandler[]) {
      return router.post(path, ...handlers.map(convertHandler));
    },
    put(path: string, ...handlers: AuthenticatedRequestHandler[]) {
      return router.put(path, ...handlers.map(convertHandler));
    },
    patch(path: string, ...handlers: AuthenticatedRequestHandler[]) {
      return router.patch(path, ...handlers.map(convertHandler));
    },
    delete(path: string, ...handlers: AuthenticatedRequestHandler[]) {
      return router.delete(path, ...handlers.map(convertHandler));
    }
  };
} 