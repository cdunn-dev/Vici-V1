import {
  formatDateForDisplay,
  calculatePlanMetrics,
  validatePlanData,
  preparePlanData,
  type TrainingPlan
} from "@/lib/training-plan-utils";
import { formatDateForApi } from "@/lib/date-utils";

describe("Training Plan Utilities", () => {
  describe("Date Formatting", () => {
    test("formatDateForApi handles valid dates", () => {
      expect(formatDateForApi("2025-03-15")).toBe("2025-03-15");
      expect(formatDateForApi("2025-03-15T12:00:00.000Z")).toBe("2025-03-15");
    });

    test("formatDateForApi throws error for invalid dates", () => {
      expect(() => formatDateForApi("invalid-date")).toThrow();
      expect(() => formatDateForApi("")).toThrow();
    });

    test("formatDateForDisplay formats dates correctly", () => {
      expect(formatDateForDisplay("2025-03-15")).toBe("Mar 15");
      expect(formatDateForDisplay("2025-03-15", "MMMM d, yyyy")).toBe("March 15, 2025");
    });

    test("formatDateForDisplay handles invalid dates gracefully", () => {
      expect(formatDateForDisplay("invalid-date")).toBe("Invalid date");
    });
  });

  describe("Plan Metrics Calculation", () => {
    const sampleWeeklyPlans = [
      { week: 1, phase: "Base", totalMileage: 20, workouts: [] },
      { week: 2, phase: "Build", totalMileage: 25, workouts: [] },
      { week: 3, phase: "Peak", totalMileage: 30, workouts: [] }
    ];

    test("calculatePlanMetrics computes correct values", () => {
      const metrics = calculatePlanMetrics(sampleWeeklyPlans);
      expect(metrics).toEqual({
        totalWeeks: 3,
        totalMileage: 75,
        weeklyAverage: 25
      });
    });
  });

  describe("Plan Validation", () => {
    const validPlan: TrainingPlan = {
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

    test("validatePlanData accepts valid plan", () => {
      expect(() => validatePlanData(validPlan)).not.toThrow();
    });

    test("validatePlanData requires non-empty goal", () => {
      const planWithoutGoal = { ...validPlan, goal: "" };
      expect(() => validatePlanData(planWithoutGoal)).toThrow("Training goal is required and cannot be empty");

      const planWithWhitespaceGoal = { ...validPlan, goal: "   " };
      expect(() => validatePlanData(planWithWhitespaceGoal)).toThrow("Training goal is required and cannot be empty");

      const planWithUndefinedGoal = { ...validPlan, goal: undefined };
      expect(() => validatePlanData(planWithUndefinedGoal as any)).toThrow("Training goal is required and cannot be empty");
    });

    test("validatePlanData requires weekly plans", () => {
      const planWithoutWeeklyPlans = { ...validPlan, weeklyPlans: [] };
      expect(() => validatePlanData(planWithoutWeeklyPlans)).toThrow("Weekly plans are required and must contain at least one week");

      const planWithNullWeeklyPlans = { ...validPlan, weeklyPlans: null };
      expect(() => validatePlanData(planWithNullWeeklyPlans as any)).toThrow("Weekly plans are required and must contain at least one week");
    });

    test("validatePlanData validates dates", () => {
      const planWithInvalidDates = { 
        ...validPlan, 
        startDate: "invalid",
        endDate: "2025-06-15"
      };
      expect(() => validatePlanData(planWithInvalidDates)).toThrow("Invalid start date format: invalid");
    });

    test("validatePlanData checks date order", () => {
      const planWithWrongDateOrder = {
        ...validPlan,
        startDate: "2025-06-15",
        endDate: "2025-03-15"
      };
      expect(() => validatePlanData(planWithWrongDateOrder)).toThrow("End date must be after start date");
    });

    test("validatePlanData validates workout dates", () => {
      const planWithInvalidWorkoutDate = {
        ...validPlan,
        weeklyPlans: [{
          ...validPlan.weeklyPlans[0],
          workouts: [{
            ...validPlan.weeklyPlans[0].workouts[0],
            day: "invalid-date"
          }]
        }]
      };
      expect(() => validatePlanData(planWithInvalidWorkoutDate))
        .toThrow("Invalid date format for workout 1 in week 1: invalid-date");
    });

    test("validatePlanData requires workout description", () => {
      const planWithMissingDescription = {
        ...validPlan,
        weeklyPlans: [{
          ...validPlan.weeklyPlans[0],
          workouts: [{
            ...validPlan.weeklyPlans[0].workouts[0],
            description: ""
          }]
        }]
      };
      expect(() => validatePlanData(planWithMissingDescription))
        .toThrow("Workout 1 in week 1 is missing a description");
    });
  });

  describe("Plan Data Preparation", () => {
    const samplePlan: TrainingPlan = {
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

    test("preparePlanData sets required fields", () => {
      const prepared = preparePlanData(samplePlan, 1);
      expect(prepared.userId).toBe(1);
      expect(prepared.is_active).toBe(true);
      expect(prepared.goalDescription).toBe("");
    });
  });
});