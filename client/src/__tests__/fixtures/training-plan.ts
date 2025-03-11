import { TrainingPlan } from "@/lib/training-plan-utils";

export const validTrainingPlan: TrainingPlan = {
  name: "Test Plan",
  goal: "Complete Marathon",
  startDate: "2025-03-15",
  endDate: "2025-06-15",
  weeklyMileage: 30,
  weeklyPlans: [{
    week: 1,
    phase: "Base",
    totalMileage: 20,
    workouts: [{
      day: "2025-03-15",
      type: "Easy Run",
      distance: 5,
      description: "Easy 5 mile run",
      completed: false
    }]
  }],
  runningExperience: {
    level: "Intermediate",
    fitnessLevel: "Good"
  },
  trainingPreferences: {
    weeklyRunningDays: 4,
    maxWeeklyMileage: 40,
    weeklyWorkouts: 1,
    preferredLongRunDay: "Sunday",
    coachingStyle: "Moderate"
  },
  is_active: true
};

export const planWithEmptyGoal = {
  ...validTrainingPlan,
  goal: ""
};

export const planWithWhitespaceGoal = {
  ...validTrainingPlan,
  goal: "   "
};

export const planWithInvalidDates = {
  ...validTrainingPlan,
  startDate: "invalid-date",
  endDate: "2025-06-15"
};

export const planWithInvalidWorkouts = {
  ...validTrainingPlan,
  weeklyPlans: [{
    ...validTrainingPlan.weeklyPlans[0],
    workouts: [{
      ...validTrainingPlan.weeklyPlans[0].workouts[0],
      day: "invalid-date"
    }]
  }]
};

export const planWithEmptyWorkoutDescription = {
  ...validTrainingPlan,
  weeklyPlans: [{
    ...validTrainingPlan.weeklyPlans[0],
    workouts: [{
      ...validTrainingPlan.weeklyPlans[0].workouts[0],
      description: ""
    }]
  }]
};
