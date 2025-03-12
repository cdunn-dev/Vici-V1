import { TrainingPlan } from "@/lib/training-plan-utils";
import { MockTrainingPlan } from "./types";

export const validTrainingPlan: MockTrainingPlan = {
  name: "12-Week Marathon Training Plan",
  goal: "Complete Marathon",
  goalDescription: "Prepare for first marathon with focus on endurance building",
  startDate: "2025-03-15",
  endDate: "2025-06-15",
  weeklyMileage: 30,
  weeklyPlans: [{
    week: 1,
    phase: "Base Building",
    totalMileage: 20,
    workouts: [{
      day: "2025-03-15",
      type: "Easy Run",
      distance: 5,
      description: "Easy 5 mile run at conversational pace",
      completed: false
    }, {
      day: "2025-03-17",
      type: "Long Run",
      distance: 8,
      description: "Long run with focus on time on feet",
      completed: false
    }, {
      day: "2025-03-19",
      type: "Recovery",
      distance: 3,
      description: "Very easy recovery run",
      completed: false
    }]
  }],
  targetRace: {
    distance: "Marathon",
    date: "2025-06-15",
    customDistance: undefined,
    previousBest: "4:30:00",
    goalTime: "4:15:00"
  },
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

// Invalid plan with missing required fields
export const planWithEmptyGoal: MockTrainingPlan = {
  ...validTrainingPlan,
  goal: ""
};

export const planWithWhitespaceGoal: MockTrainingPlan = {
  ...validTrainingPlan,
  goal: "   "
};

export const planWithInvalidDates: MockTrainingPlan = {
  ...validTrainingPlan,
  startDate: "invalid-date",
  endDate: "2025-06-15"
};

export const planWithInvalidWorkouts: MockTrainingPlan = {
  ...validTrainingPlan,
  weeklyPlans: [{
    ...validTrainingPlan.weeklyPlans[0],
    workouts: [{
      ...validTrainingPlan.weeklyPlans[0].workouts[0],
      day: "invalid-date"
    }]
  }]
};

export const planWithEmptyWorkoutDescription: MockTrainingPlan = {
  ...validTrainingPlan,
  weeklyPlans: [{
    ...validTrainingPlan.weeklyPlans[0],
    workouts: [{
      ...validTrainingPlan.weeklyPlans[0].workouts[0],
      description: ""
    }]
  }]
};

export const planWithEndDateBeforeStartDate: MockTrainingPlan = {
  ...validTrainingPlan,
  startDate: "2025-06-15",
  endDate: "2025-03-15"
};

export const planWithoutWorkouts: MockTrainingPlan = {
  ...validTrainingPlan,
  weeklyPlans: [{
    ...validTrainingPlan.weeklyPlans[0],
    workouts: []
  }]
};

export const planWithNegativeDistance: MockTrainingPlan = {
  ...validTrainingPlan,
  weeklyPlans: [{
    ...validTrainingPlan.weeklyPlans[0],
    workouts: [{
      ...validTrainingPlan.weeklyPlans[0].workouts[0],
      distance: -5
    }]
  }]
};