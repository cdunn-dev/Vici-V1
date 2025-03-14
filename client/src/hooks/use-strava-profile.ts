import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/api";
import { GenderEnum, DistanceUnitEnum, type PersonalBest, type RunningExperience, type StravaStats } from "@shared/schema";

export interface StravaProfile {
  gender: string | null;
  birthday: string | null;
  measurementPreference: string;
  weight: number | null;
  profile: {
    firstName: string;
    lastName: string;
    city: string | null;
    state: string | null;
    country: string | null;
    profilePicture: string | null;
  };
  personalBests: PersonalBest[];
  stravaStats: StravaStats | null;
  runningExperience: RunningExperience | null;
}

export function useStravaProfile() {
  return useQuery<StravaProfile | null>({
    queryKey: ["/api/strava/profile"],
    queryFn: async () => {
      const data = await getQueryFn({ on401: "returnNull" })("/api/strava/profile");
      if (!data) return null;

      // Ensure the data matches our schema
      return {
        gender: data.gender || null,
        birthday: data.birthday || null,
        measurementPreference: data.measurementPreference || "miles",
        weight: data.weight || null,
        profile: {
          firstName: data.profile?.firstName || "",
          lastName: data.profile?.lastName || "",
          city: data.profile?.city || null,
          state: data.profile?.state || null,
          country: data.profile?.country || null,
          profilePicture: data.profile?.profilePicture || null
        },
        personalBests: Array.isArray(data.personalBests) ? data.personalBests.map(pb => ({
          distance: pb.distance,
          time: pb.time,
          date: new Date(pb.date).toISOString()
        })) : [],
        stravaStats: data.stravaStats || null,
        runningExperience: data.runningExperience ? {
          level: data.runningExperience.level,
          weeklyMileage: data.runningExperience.weeklyMileage,
          preferredRunDays: data.runningExperience.preferredRunDays,
          commonWorkoutTypes: data.runningExperience.commonWorkoutTypes,
          fitnessLevel: data.runningExperience.fitnessLevel
        } : null
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
    throwOnError: false
  });
}