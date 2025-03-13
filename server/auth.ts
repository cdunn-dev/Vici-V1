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

export function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "default-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: db.$pool,
      tableName: 'session',
      createTableIfMissing: true
    }),
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
          return done(new AuthError(
            ERROR_MESSAGES.DATABASE_ERROR,
            'DATABASE_ERROR',
            error
          ));
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => done(null, user.id));

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(new AuthError(
          ERROR_MESSAGES.USER_NOT_FOUND,
          'USER_NOT_FOUND'
        ));
      }
      done(null, user);
    } catch (error) {
      console.error('[Auth] Session error:', error);
      done(new AuthError(
        ERROR_MESSAGES.SESSION_ERROR,
        'SESSION_ERROR',
        error
      ));
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      // First validate with register schema
      const registerResult = registerUserSchema.safeParse(req.body);
      if (!registerResult.success) {
        throw new AuthError(
          ERROR_MESSAGES.VALIDATION_ERROR,
          'VALIDATION_ERROR',
          registerResult.error
        );
      }

      const existingUser = await storage.getUserByEmail(registerResult.data.email);
      if (existingUser) {
        throw new AuthError(
          ERROR_MESSAGES.EMAIL_EXISTS,
          'EMAIL_EXISTS'
        );
      }

      // Create user with validated data
      const insertData = {
        email: registerResult.data.email,
        password: await hashPassword(registerResult.data.password),
        emailVerified: true, // Default to true while email verification is disabled
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
            ERROR_MESSAGES.SESSION_ERROR,
            'SESSION_ERROR',
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

  app.post("/api/login", (req, res, next) => {
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
}