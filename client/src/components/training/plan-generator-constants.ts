// Training Goals
export const TrainingGoals = {
  RACE_TRAINING: "Training for a Race",
  GENERAL_FITNESS: "Improve General Health & Fitness",
} as const;

export type TrainingGoalType = typeof TrainingGoals[keyof typeof TrainingGoals];

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

// Gender options
export const GenderOptions = {
  MALE: "male",
  FEMALE: "female",
  OTHER: "other",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;

export const GenderLabels = {
  [GenderOptions.MALE]: "Male",
  [GenderOptions.FEMALE]: "Female",
  [GenderOptions.OTHER]: "Other",
  [GenderOptions.PREFER_NOT_TO_SAY]: "Prefer not to say",
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