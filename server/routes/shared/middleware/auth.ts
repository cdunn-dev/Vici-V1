import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express';

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  if (!req.user?.id) {
    return res.status(400).json({ error: "User ID not found" });
  }

  next();
}; 