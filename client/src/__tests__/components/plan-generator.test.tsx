import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlanGenerator from '@/components/training/plan-generator';
import { createAuthWrapper } from '../test-utils';
import { vi } from 'vitest';

const mockOnPreview = vi.fn();

describe('PlanGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the multi-step form correctly', () => {
    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Initial view should show welcome screen and next button
    expect(screen.getByText(/Welcome to Training Plan Generator/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('validates form fields before proceeding to next step', async () => {
    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Click next without filling required fields
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Should stay on first step
    expect(screen.getByText(/Welcome to Training Plan Generator/i)).toBeInTheDocument();
  });

  it('correctly sets and preserves the training goal', async () => {
    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Move to goal selection step
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);

    // Select a training goal
    const goalSelect = screen.getByLabelText(/training goal/i);
    await userEvent.click(goalSelect);
    await userEvent.click(screen.getByText(/improve general health/i));

    // Move to next step
    fireEvent.click(nextButton);

    // Move back
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    // Goal should still be selected
    expect(screen.getByText(/improve general health/i)).toBeInTheDocument();
  });

  it('completes form submission successfully', async () => {
    // Mock fetch for plan preview
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ weeklyPlans: [] })
      })
    );

    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Navigate through form steps
    const nextButton = screen.getByRole('button', { name: /next/i });

    // Welcome step
    fireEvent.click(nextButton);

    // Fill out basic profile
    await userEvent.type(screen.getByLabelText(/age/i), '30');
    const genderSelect = screen.getByLabelText(/gender/i);
    await userEvent.click(genderSelect);
    await userEvent.click(screen.getByText('Male'));

    fireEvent.click(nextButton);

    // Fill out running profile
    const experienceSelect = screen.getByLabelText(/experience level/i);
    await userEvent.click(experienceSelect);
    await userEvent.click(screen.getByText('Beginner'));

    const fitnessSelect = screen.getByLabelText(/fitness level/i);
    await userEvent.click(fitnessSelect);
    await userEvent.click(screen.getByText('Novice'));

    fireEvent.click(nextButton);

    // Fill out goal
    const goalSelect = screen.getByLabelText(/training goal/i);
    await userEvent.click(goalSelect);
    await userEvent.click(screen.getByText(/improve general health/i));

    fireEvent.click(nextButton);

    // Fill out training preferences
    // Verify that clicking Generate Plan triggers the onPreview callback
    const generateButton = screen.getByRole('button', { name: /generate plan/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mockOnPreview).toHaveBeenCalledWith(
        expect.objectContaining({
          goal: expect.any(String),
          startDate: expect.any(String),
          endDate: expect.any(String),
          runningExperience: expect.objectContaining({
            level: expect.any(String),
            fitnessLevel: expect.any(String)
          }),
          trainingPreferences: expect.objectContaining({
            weeklyRunningDays: expect.any(Number),
            maxWeeklyMileage: expect.any(Number)
          })
        })
      );
    });
  });

  it('handles preview generation errors gracefully', async () => {
    // Mock fetch to simulate an error
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      })
    );

    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Navigate to the last step
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    await userEvent.type(screen.getByLabelText(/age/i), '30');
    const genderSelect = screen.getByLabelText(/gender/i);
    await userEvent.click(genderSelect);
    await userEvent.click(screen.getByText('Male'));
    fireEvent.click(nextButton);
    const experienceSelect = screen.getByLabelText(/experience level/i);
    await userEvent.click(experienceSelect);
    await userEvent.click(screen.getByText('Beginner'));
    const fitnessSelect = screen.getByLabelText(/fitness level/i);
    await userEvent.click(fitnessSelect);
    await userEvent.click(screen.getByText('Novice'));
    fireEvent.click(nextButton);
    const goalSelect = screen.getByLabelText(/training goal/i);
    await userEvent.click(goalSelect);
    await userEvent.click(screen.getByText(/improve general health/i));
    fireEvent.click(nextButton);


    const generateButton = screen.getByRole('button', { name: /generate plan/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/error generating plan/i)).toBeInTheDocument();
    });
  });
  it('logs form data before submission', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Navigate and fill form
    const nextButton = screen.getByRole('button', { name: /next/i });
    fireEvent.click(nextButton);
    await userEvent.type(screen.getByLabelText(/age/i), '30');
    const genderSelect = screen.getByLabelText(/gender/i);
    await userEvent.click(genderSelect);
    await userEvent.click(screen.getByText('Male'));
    fireEvent.click(nextButton);
    const experienceSelect = screen.getByLabelText(/experience level/i);
    await userEvent.click(experienceSelect);
    await userEvent.click(screen.getByText('Beginner'));
    const fitnessSelect = screen.getByLabelText(/fitness level/i);
    await userEvent.click(fitnessSelect);
    await userEvent.click(screen.getByText('Novice'));
    fireEvent.click(nextButton);
    const goalSelect = screen.getByLabelText(/training goal/i);
    await userEvent.click(goalSelect);
    await userEvent.click(screen.getByText(/improve general health/i));
    fireEvent.click(nextButton);

    const generateButton = screen.getByRole('button', { name: /generate plan/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Form submission data:'),
        expect.any(Object)
      );
    });
  });
});