import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { AuthenticatedRequestHandler } from '../types/express';

/**
 * Middleware to restrict access to admin users only
 */
export const isAdmin: AuthenticatedRequestHandler = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required'
      });
      return;
    }

    // Get user from database to check admin status
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
      columns: {
        id: true,
        email: true
      }
    });

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: 'User not found'
      });
      return;
    }

    // For now, we'll consider users with email containing 'admin' as admins
    // In a real application, you would have a proper isAdmin field in the users table
    const isAdminUser = user.email.includes('admin');
    
    if (!isAdminUser) {
      res.status(403).json({
        status: 'error',
        message: 'Admin access required'
      });
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}; 