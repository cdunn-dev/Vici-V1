import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileReview from '@/pages/profile-review';
import { useStravaProfile } from '@/hooks/use-strava-profile';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

// Mock the hooks
vi.mock('@/hooks/use-strava-profile');
vi.mock('@/hooks/use-auth');
vi.mock('wouter');

describe('ProfileReview', () => {
  const mockStravaProfile = {
    gender: 'M',
    birthday: '1990-01-01',
    measurementPreference: 'miles',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      profilePicture: 'https://example.com/pic.jpg'
    },
    personalBests: [
      { distance: '5K', time: '20:00', date: '2025-01-01' }
    ],
    runningExperience: {
      level: 'intermediate',
      weeklyMileage: 30,
      preferredRunDays: ['monday', 'wednesday', 'saturday'],
      commonWorkoutTypes: ['easy', 'tempo', 'long run']
    }
  };

  beforeEach(() => {
    vi.mocked(useStravaProfile).mockReturnValue({
      data: mockStravaProfile,
      isLoading: false,
      error: null
    });

    vi.mocked(useAuth).mockReturnValue({
      user: { id: 123 },
      isLoading: false
    });

    vi.mocked(useLocation).mockReturnValue(['/profile/review', vi.fn()]);
  });

  it('should display loading state initially', () => {
    vi.mocked(useStravaProfile).mockReturnValueOnce({
      data: null,
      isLoading: true,
      error: null
    });

    render(<ProfileReview />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should display profile data when loaded', async () => {
    render(<ProfileReview />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('5K')).toBeInTheDocument();
      expect(screen.getByText('30 miles')).toBeInTheDocument();
    });
  });

  it('should handle form submission correctly', async () => {
    const user = userEvent.setup();
    render(<ProfileReview />);

    // Wait for form to be populated
    await waitFor(() => {
      expect(screen.getByLabelText('Gender')).toHaveValue('M');
    });

    // Change some values
    await user.selectOptions(screen.getByLabelText('Gender'), 'F');

    // Submit form
    await user.click(screen.getByText('Confirm & Continue'));

    // Verify redirect
    expect(useLocation()[1]).toHaveBeenCalledWith('/training');
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
