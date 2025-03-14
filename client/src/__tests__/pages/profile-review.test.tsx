import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileReview from '@/pages/profile-review';
import { useStravaProfile } from '@/hooks/use-strava-profile';
import { useLocation } from 'wouter';

vi.mock('@/hooks/use-strava-profile');
vi.mock('wouter');

describe('ProfileReview', () => {
  const mockStravaProfile = {
    gender: 'male',
    birthday: '1990-01-01T00:00:00.000Z',
    measurementPreference: 'miles',
    weight: 70,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      city: 'New York',
      state: 'NY',
      country: 'US',
      profilePicture: 'https://example.com/pic.jpg'
    },
    personalBests: [
      { distance: '5K', time: '20:00', date: '2025-01-01T00:00:00.000Z' }
    ],
    runningExperience: {
      level: 'intermediate',
      weeklyMileage: 30,
      preferredRunDays: ['monday', 'wednesday', 'friday'],
      commonWorkoutTypes: ['easy', 'tempo', 'long run'],
      fitnessLevel: 'building-base'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useStravaProfile).mockReturnValue({
      data: mockStravaProfile,
      isLoading: false,
      error: null
    });
    vi.mocked(useLocation).mockReturnValue(['/profile-review', vi.fn()]);
  });

  it('should handle gender field correctly', async () => {
    render(<ProfileReview />);

    await waitFor(() => {
      expect(screen.getByLabelText(/gender/i)).toBeInTheDocument();
    });

    const genderSelect = screen.getByLabelText(/gender/i);
    expect(genderSelect).toHaveValue('male');

    const user = userEvent.setup();
    await user.click(genderSelect);
    await user.click(screen.getByText(/female/i));
    expect(genderSelect).toHaveValue('female');
  });

  it('should display personal bests with correct formatting', async () => {
    render(<ProfileReview />);

    await waitFor(() => {
      expect(screen.getByText('5K')).toBeInTheDocument();
      expect(screen.getByText('20:00')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2025')).toBeInTheDocument();
    });
  });

  it('should handle form submission correctly', async () => {
    const user = userEvent.setup();
    render(<ProfileReview />);

    await waitFor(() => {
      expect(screen.getByText(/confirm & continue/i)).toBeInTheDocument();
    });

    // Submit form
    await user.click(screen.getByText(/confirm & continue/i));

    // Should redirect to training page
    expect(useLocation()[1]).toHaveBeenCalledWith('/training');
  });

  it('should handle loading state', () => {
    vi.mocked(useStravaProfile).mockReturnValueOnce({
      data: null,
      isLoading: true,
      error: null
    });

    render(<ProfileReview />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display error toast on submission failure', async () => {
    const user = userEvent.setup();
    render(<ProfileReview />);

    // Mock API error
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('API Error'));

    await waitFor(() => {
      expect(screen.getByText(/confirm & continue/i)).toBeInTheDocument();
    });

    // Try to submit form
    await user.click(screen.getByText(/confirm & continue/i));

    // Should show error toast
    await waitFor(() => {
      expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
    });
  });

  it('should display profile data when loaded', async () => {
    render(<ProfileReview />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('5K')).toBeInTheDocument();
      expect(screen.getByText('30 miles')).toBeInTheDocument();
    });
  });

  it('should handle missing Strava data gracefully', async () => {
    vi.mocked(useStravaProfile).mockReturnValueOnce({
      data: {
        gender: null,
        birthday: null,
        measurementPreference: 'miles',
        profile: null,
        personalBests: [],
        runningExperience: null
      },
      isLoading: false,
      error: null
    });

    render(<ProfileReview />);

    // Should still render form with default values
    await waitFor(() => {
      expect(screen.getByLabelText('Gender')).toBeInTheDocument();
      expect(screen.getByLabelText('Date of Birth')).toBeInTheDocument();
    });
  });

  it('should display error state appropriately', async () => {
    vi.mocked(useStravaProfile).mockReturnValueOnce({
      data: null,
      isLoading: false,
      error: new Error('Failed to load profile')
    });

    render(<ProfileReview />);
    expect(screen.getByText(/Failed to load profile/i)).toBeInTheDocument();
  });
});