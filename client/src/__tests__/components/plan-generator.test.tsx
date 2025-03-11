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

  it('completes form submission successfully', async () => {
    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Navigate through form steps
    const nextButton = screen.getByRole('button', { name: /next/i });
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
      expect(mockOnPreview).toHaveBeenCalled();
    });
  });

  it('logs form data before submission', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');
    
    render(
      <PlanGenerator existingPlan={false} onPreview={mockOnPreview} />,
      { wrapper: createAuthWrapper() }
    );

    // Navigate and fill form
    // ... (similar to previous test)

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
