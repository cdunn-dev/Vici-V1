export interface ActivityProvider {
  name: string;
  isConnected(): Promise<boolean>;
  connect(credentials: any): Promise<void>;
  disconnect(): Promise<void>;
  syncActivities(since?: Date): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity>;
}

export interface Activity {
  id: string;
  source: string;
  type: ActivityType;
  startTime: Date;
  endTime: Date;
  distance: number;     // meters
  duration: number;     // seconds
  elevation?: {
    gain: number;      // meters
    loss: number;      // meters
  };
  pace: {
    average: number;   // seconds per kilometer
    best: number;      // seconds per kilometer
  };
  heartRate?: {
    average: number;   // bpm
    max: number;       // bpm
    zones?: HeartRateZones;
  };
  calories?: number;
  perceivedEffort?: number;  // 1-10 scale
  weather?: WeatherConditions;
  notes?: string;
  originalData: any;   // Raw data from provider
}

export interface AthleteProfile {
  gender: string;
  birthday: string;
  measurementPreference: string;
  weight: number;
  profile: {
    firstName: string;
    lastName: string;
    city: string;
    state: string;
    country: string;
  };
}

export type ActivityType = 
  | 'run'
  | 'trail_run'
  | 'treadmill'
  | 'track'
  | 'race'
  | 'walk'
  | 'other';

export interface HeartRateZones {
  zone1: number;  // Time spent in each zone (seconds)
  zone2: number;
  zone3: number;
  zone4: number;
  zone5: number;
}

export interface WeatherConditions {
  temperature: number;    // Celsius
  humidity: number;       // Percentage
  windSpeed: number;      // km/h
  description: string;
}

export interface ProviderCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export class ActivityServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ActivityServiceError';
  }
}