import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface StravaProfile {
  gender: string;
  birthday: string | null;
  measurementPreference: string;
  weight: number | null;
  profile: {
    firstName: string;
    lastName: string;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  // Match the server's running_experience JSON structure
  runningExperience: {
    level: string;
    weeklyMileage: number;
    preferredRunDays: string[];
    commonWorkoutTypes: string[];
  } | null;
}

export function useStravaProfile() {
  return useQuery<StravaProfile>({
    queryKey: ["/api/strava/profile"],
    queryFn: async () => {
      const data = await getQueryFn({ on401: "returnNull" })("/api/strava/profile");
      if (!data) return null;

      // Parse running_experience from JSON string if it exists
      if (data.running_experience && typeof data.running_experience === 'string') {
        data.runningExperience = JSON.parse(data.running_experience);
      }

      // Transform snake_case to camelCase
      return {
        gender: data.gender,
        birthday: data.birthday,
        measurementPreference: data.preferred_distance_unit || 'miles',
        weight: data.weight,
        profile: {
          firstName: data.profile?.first_name,
          lastName: data.profile?.last_name,
          city: data.profile?.city,
          state: data.profile?.state,
          country: data.profile?.country
        },
        runningExperience: data.runningExperience || null
      };
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    retry: false,
    throwOnError: false
  });
}