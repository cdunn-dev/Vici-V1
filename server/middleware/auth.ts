import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { storage } from '../storage';

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable in production

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
  };
}

// Middleware to verify JWT token
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Get token from cookie or authorization header
    const token = req.cookies?.authToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
    const user = await storage.getUser(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request object
    req.user = { id: user.id, email: user.email };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
};

// Generate JWT token  - Modified to include email in payload
export const generateToken = (userId: number, userEmail: string): string => {
  return jwt.sign({ id: userId, email: userEmail }, JWT_SECRET, { expiresIn: '7d' });
};

// Placeholder for a hypothetical User type (needed for generateToken)
interface User {
  id: number;
  email: string;
}


// Placeholder for hypothetical register function (Illustrative purpose only)
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        // ... (Registration logic) ...
        const newUser = await storage.createUser(email, password); // Placeholder for creating a user in storage
        const token = generateToken(newUser.id, newUser.email);
        res.status(201).json({ token });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Failed to register user" });
    }
};

// Placeholder for hypothetical login function (Illustrative purpose only)
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await storage.getUserByEmail(email); // Placeholder function
        if (!user || !await user.comparePassword(password)) { // Placeholder for password comparison
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const token = generateToken(user.id, user.email);
        res.cookie('authToken', token, { httpOnly: true }); // Set cookie
        res.json({ token });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Failed to log in" });
    }
};