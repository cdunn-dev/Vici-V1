// This file is temporarily disabled while JWT authentication is removed
// A simplified version will be implemented later when needed

import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}