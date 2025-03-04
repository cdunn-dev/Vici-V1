import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { storage } from '../storage';
import { generateToken } from '../middleware/auth';

const router = Router();

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const users = Array.from((storage as any).users.values());
    const user = users.find(u => u.email === email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    if (!user.password || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Set token as cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register route
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, dateOfBirth, gender } = req.body;

    if (!email || !password || !name || !dateOfBirth || !gender) {
      return res.status(400).json({ 
        error: 'Email, password, name, date of birth, and gender are required' 
      });
    }

    // Check if email already exists
    const users = Array.from((storage as any).users.values());
    const existingUser = users.find(u => u.email === email);

    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await storage.createUser({
      email,
      name,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      personalBests: {},
      connectedApps: [],
      stravaTokens: null,
      password: hashedPassword // Add password to user object
    });

    // Generate token
    const token = generateToken(user.id);

    // Set token as cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  res.clearCookie('authToken');
  res.json({ message: 'Logged out successfully' });
});

export default router;