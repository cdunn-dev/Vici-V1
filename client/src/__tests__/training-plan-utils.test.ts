import {
  formatDateForApi,
  formatDateForDisplay,
  calculatePlanMetrics,
  validatePlanData,
  preparePlanData,
  type TrainingPlan
} from "@/lib/training-plan-utils";

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

    test("validatePlanData requires goal", () => {
      const planWithoutGoal = { ...validPlan, goal: "" };
      expect(() => validatePlanData(planWithoutGoal)).toThrow("Training goal is required");
    });

    test("validatePlanData validates dates", () => {
      const planWithInvalidDates = { 
        ...validPlan, 
        startDate: "invalid",
        endDate: "2025-06-15"
      };
      expect(() => validatePlanData(planWithInvalidDates)).toThrow("Invalid start or end date");
    });

    test("validatePlanData checks date order", () => {
      const planWithWrongDateOrder = {
        ...validPlan,
        startDate: "2025-06-15",
        endDate: "2025-03-15"
      };
      expect(() => validatePlanData(planWithWrongDateOrder)).toThrow("End date must be after start date");
    });
  });

  describe("Plan Data Preparation", () => {
    const samplePlan: TrainingPlan = {
      name: "Test Plan",
      goal: "Complete Marathon",
      startDate: "2025-03-15T12:00:00.000Z",
      endDate: "2025-06-15T12:00:00.000Z",
      weeklyMileage: 30,
      weeklyPlans: [{
        week: 1,
        phase: "Base",
        totalMileage: 20,
        workouts: [{
          day: "2025-03-15T12:00:00.000Z",
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

    test("preparePlanData formats dates correctly", () => {
      const prepared = preparePlanData(samplePlan, 1);
      expect(prepared.startDate).toBe("2025-03-15");
      expect(prepared.endDate).toBe("2025-06-15");
      expect(prepared.weeklyPlans[0].workouts[0].day).toBe("2025-03-15");
    });

    test("preparePlanData sets required fields", () => {
      const prepared = preparePlanData(samplePlan, 1);
      expect(prepared.userId).toBe(1);
      expect(prepared.is_active).toBe(true);
      expect(prepared.goalDescription).toBe("");
    });
  });
});
