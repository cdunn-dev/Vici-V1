// Training Goals
export const TrainingGoals = {
  FIRST_RACE: "My First Race",
  PERSONAL_BEST: "A Personal Best",
  RUN_FASTER: "To Run Faster",
  RUN_FARTHER: "To Run Farther",
  GET_FIT: "To Get Fit",
  BE_HEALTHY: "To Be Healthy",
} as const;

// Race Distances
export const RaceDistances = {
  FIVE_K: "5k",
  TEN_K: "10k",
  HALF_MARATHON: "Half-Marathon",
  MARATHON: "Marathon",
  FIFTY_K: "50k",
  HUNDRED_K: "100k",
  OTHER: "Other",
} as const;

export const DistanceUnits = {
  MILES: "miles",
  KILOMETERS: "kilometers",
} as const;

// Experience Levels with descriptions
export const ExperienceLevels = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
} as const;

export const ExperienceLevelDescriptions = {
  [ExperienceLevels.BEGINNER]: "New to running or have been running for less than a year",
  [ExperienceLevels.INTERMEDIATE]: "Regular runner with 1-3 years of experience",
  [ExperienceLevels.ADVANCED]: "Experienced runner with 3+ years of consistent training",
  [ExperienceLevels.EXPERT]: "Highly experienced runner with 5+ years of dedicated training",
} as const;

// Fitness Levels with descriptions
export const FitnessLevels = {
  VERY_FIT: "Very fit",
  SOLID_BASE: "Solid base",
  OUT_OF_SHAPE: "Out of shape",
  NEVER_RUN: "Never run before",
} as const;

export const FitnessLevelDescriptions = {
  [FitnessLevels.VERY_FIT]: "Regular exercise routine, can run 5+ miles comfortably",
  [FitnessLevels.SOLID_BASE]: "Exercise regularly, can run 2-3 miles",
  [FitnessLevels.OUT_OF_SHAPE]: "Limited recent exercise, want to get back in shape",
  [FitnessLevels.NEVER_RUN]: "Starting from scratch with running",
} as const;

// Days of Week
export const DaysOfWeek = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
} as const;

// Coaching Styles with descriptions
export const CoachingStyles = {
  AUTHORITATIVE: "Authoritative",
  DIRECTIVE: "Directive",
  MOTIVATIONAL: "Motivational",
  COLLABORATIVE: "Collaborative",
  HYBRID: "Hybrid",
} as const;

export const CoachingStyleDescriptions = {
  [CoachingStyles.AUTHORITATIVE]: "Clear, structured guidance with detailed explanations",
  [CoachingStyles.DIRECTIVE]: "Direct instructions and specific workout requirements",
  [CoachingStyles.MOTIVATIONAL]: "Encouraging and supportive with flexible guidelines",
  [CoachingStyles.COLLABORATIVE]: "Interactive approach with room for adjustments",
  [CoachingStyles.HYBRID]: "Mix of different styles adapted to your needs",
} as const;

// Validation helper functions
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(time);
};

export const isValidDistanceFormat = (distance: string, unit: string): boolean => {
  const number = parseFloat(distance);
  return !isNaN(number) && number > 0 && Object.values(DistanceUnits).includes(unit as any);
};

export const formatDistance = (distance: number, unit: string): string => {
  return `${distance} ${unit}`;
};