// Mock schema types and functions used in tests
export interface User {
  id: number;
  email: string;
  emailVerified: boolean;
  password: string;
  verificationToken: string | null;
  profilePicture: string | null;
  gender: string | null;
  birthday: string | null;
  preferredDistanceUnit: string;
  connectedApps: string[];
  stravaTokens: any | null;
  personalBests: any[];
  runningExperience: string | null;
  fitnessLevel: string | null;
  preferredCoachingStyle: string | null;
  stravaStats: any | null;
}

export const insertUserSchema = {
  shape: {
    email: { _def: { checks: [] } },
    password: { _def: { checks: [] } },
  },
};

export type InsertUser = {
  email: string;
  password: string;
};
