// Training Goals
export const TrainingGoals = {
  FIRST_RACE: "First Race",
  PERSONAL_BEST: "Personal Best",
  RUN_FAST: "Run Fast",
  RUN_FAR: "Run Far",
  GET_FIT: "Get Fit",
  BE_HEALTHY: "Be Healthy",
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

// Experience Levels
export const ExperienceLevels = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
} as const;

// Fitness Levels
export const FitnessLevels = {
  VERY_FIT: "Very fit",
  SOLID_BASE: "Solid base",
  OUT_OF_SHAPE: "Out of shape",
  NEVER_RUN: "Never run before",
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

// Coaching Styles
export const CoachingStyles = {
  AUTHORITATIVE: "Authoritative",
  DIRECTIVE: "Directive",
  MOTIVATIONAL: "Motivational",
  COLLABORATIVE: "Collaborative",
  HYBRID: "Hybrid",
} as const;

// Helper function to validate time format (HH:MM:SS)
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Helper function to validate distance format (number + unit)
export const isValidDistanceFormat = (distance: string): boolean => {
  const distanceRegex = /^\d+(\.\d+)?\s*(km|mi|miles|kilometers)$/i;
  return distanceRegex.test(distance);
};
