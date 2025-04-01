import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { registerUserSchema } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { db } from "./db";
import { AuthError, ERROR_MESSAGES } from "./services/auth/types";
import { sendPasswordResetEmail } from "./services/email";
import { Pool } from "@neondatabase/serverless";
import { authLimiter, passwordResetLimiter } from './middleware/rateLimiter';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

async function generateResetToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  const sessionPool = new Pool({ connectionString: process.env.DATABASE_URL });

  const sessionStore = new PgSession({
    pool: sessionPool,
    tableName: 'session',
    createTableIfMissing: true
  });

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: ERROR_MESSAGES.INVALID_CREDENTIALS });
          }
          return done(null, user);
        } catch (error) {
          console.error('[Auth] Login error:', error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", authLimiter, async (req, res) => {
    try {
      const registerResult = registerUserSchema.safeParse(req.body);
      if (!registerResult.success) {
        throw new AuthError(
          'VALIDATION_ERROR',
          ERROR_MESSAGES.VALIDATION_ERROR,
          registerResult.error
        );
      }

      const existingUser = await storage.getUserByEmail(registerResult.data.email);
      if (existingUser) {
        throw new AuthError(
          'EMAIL_EXISTS',
          ERROR_MESSAGES.EMAIL_EXISTS
        );
      }

      const insertData = {
        email: registerResult.data.email,
        password: await hashPassword(registerResult.data.password),
        emailVerified: true,
        connectedApps: [],
        stravaTokens: null,
        profilePicture: null,
        gender: null,
        birthday: null,
        preferredDistanceUnit: "miles",
        personalBests: [],
        runningExperience: null,
        fitnessLevel: null,
        preferredCoachingStyle: null,
        stravaStats: null
      };

      const user = await storage.createUser(insertData);

      req.login(user, (err) => {
        if (err) {
          throw new AuthError(
            'SESSION_ERROR',
            ERROR_MESSAGES.SESSION_ERROR,
            err
          );
        }
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof AuthError) {
        res.status(error.httpStatus).json({ error: error.userMessage });
      } else {
        res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR });
      }
    }
  });

  app.post("/api/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        if (err instanceof AuthError) {
          return res.status(err.httpStatus).json({ error: err.userMessage });
        }
        return res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR });
      }

      if (!user) {
        return res.status(401).json({
          error: info?.message || ERROR_MESSAGES.INVALID_CREDENTIALS
        });
      }

      req.login(user, (err) => {
        if (err) {
          console.error('[Auth] Session error:', err);
          return res.status(500).json({ error: ERROR_MESSAGES.SESSION_ERROR });
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ error: ERROR_MESSAGES.SESSION_ERROR });
      }
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: ERROR_MESSAGES.NOT_AUTHENTICATED });
    }
    res.json(req.user);
  });

  app.post("/api/reset-password", passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        throw new AuthError(
          'VALIDATION_ERROR',
          ERROR_MESSAGES.VALIDATION_ERROR
        );
      }

      const user = await storage.getUserByEmail(email);

      if (user) {
        const resetToken = await generateResetToken();
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        await storage.storeResetToken(user.id, resetToken, resetExpires);

        await sendPasswordResetEmail(email, resetToken);
      }

      res.json({ message: ERROR_MESSAGES.RESET_EMAIL_SENT });
    } catch (error) {
      console.error('[Auth] Reset password error:', error);
      if (error instanceof AuthError) {
        res.status(error.httpStatus).json({ error: error.userMessage });
      } else {
        res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR });
      }
    }
  });

  app.post("/api/reset-password/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { password } = req.body;

      if (!password || typeof password !== 'string' || password.length < 8) {
        throw new AuthError(
          'VALIDATION_ERROR',
          ERROR_MESSAGES.PASSWORD_TOO_SHORT
        );
      }

      const resetInfo = await storage.getResetToken(token);
      if (!resetInfo) {
        throw new AuthError(
          'RESET_TOKEN_INVALID',
          ERROR_MESSAGES.RESET_TOKEN_INVALID
        );
      }

      if (resetInfo.expires < new Date()) {
        throw new AuthError(
          'RESET_TOKEN_EXPIRED',
          ERROR_MESSAGES.RESET_TOKEN_EXPIRED
        );
      }

      const hashedPassword = await hashPassword(password);
      await storage.updateUserPassword(resetInfo.userId, hashedPassword);

      await storage.removeResetToken(token);

      res.json({ message: 'Password successfully reset' });
    } catch (error) {
      console.error('[Auth] Reset password verification error:', error);
      if (error instanceof AuthError) {
        res.status(error.httpStatus).json({ error: error.userMessage });
      } else {
        res.status(500).json({ error: ERROR_MESSAGES.DATABASE_ERROR });
      }
    }
  });
}