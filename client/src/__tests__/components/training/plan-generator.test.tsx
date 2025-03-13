import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PlanGenerator from '@/components/training/plan-generator';
import { useStravaProfile } from '@/hooks/use-strava-profile';

// Mock the Strava hook
vi.mock('@/hooks/use-strava-profile');

describe('PlanGenerator', () => {
  const mockStravaProfile = {
    gender: 'M',
    birthday: '1990-01-01',
    measurementPreference: 'meters',
    weight: 70,
    runningExperience: {
      level: 'intermediate',
      weeklyMileage: 30,
      preferredRunDays: ['monday', 'wednesday', 'saturday'],
      commonWorkoutTypes: ['easy', 'tempo', 'long run']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should pre-fill form with Strava data when available', async () => {
    vi.mocked(useStravaProfile).mockReturnValue({
      data: mockStravaProfile,
      isLoading: false,
      error: null
    } as any);

    render(<PlanGenerator existingPlan={false} onPreview={() => {}} />);

    await waitFor(() => {
      // Check that gender is pre-filled
      expect(screen.getByRole('combobox', { name: /gender/i }))
        .toHaveValue(mockStravaProfile.gender);

      // Check distance unit conversion
      expect(screen.getByRole('combobox', { name: /preferred distance unit/i }))
        .toHaveValue('kilometers');

      // Check running experience level
      expect(screen.getByRole('combobox', { name: /experience level/i }))
        .toHaveValue(mockStravaProfile.runningExperience.level);

      // Check weekly running days slider
      expect(screen.getByRole('slider', { name: /weekly running days/i }))
        .toHaveValue(mockStravaProfile.runningExperience.preferredRunDays.length.toString());
    });
  });

  it('should show loading state while fetching Strava data', () => {
    vi.mocked(useStravaProfile).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    } as any);

    render(<PlanGenerator existingPlan={false} onPreview={() => {}} />);

    expect(screen.getByTestId('strava-loading-skeleton')).toBeInTheDocument();
  });

  it('should use default values when Strava is not connected', async () => {
    vi.mocked(useStravaProfile).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as any);

    render(<PlanGenerator existingPlan={false} onPreview={() => {}} />);

    await waitFor(() => {
      // Check default values
      expect(screen.getByRole('combobox', { name: /preferred distance unit/i }))
        .toHaveValue('miles');

      expect(screen.getByRole('slider', { name: /weekly running days/i }))
        .toHaveValue('3');

      expect(screen.getByRole('slider', { name: /maximum weekly mileage/i }))
        .toHaveValue('15');
    });
  });

  it('should handle Strava data loading errors gracefully', () => {
    vi.mocked(useStravaProfile).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Failed to load Strava data')
    } as any);

    render(<PlanGenerator existingPlan={false} onPreview={() => {}} />);

    // Should still render the form with default values
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });
});
