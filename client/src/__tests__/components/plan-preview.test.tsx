import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import PlanPreview from '@/components/training/plan-preview';
import { renderWithProviders } from '../test-utils';
import { validTrainingPlan } from '../fixtures/training-plan';
import { vi } from 'vitest';

describe('PlanPreview', () => {
  const mockOnConfirm = vi.fn();
  const mockOnAdjust = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plan details correctly', () => {
    renderWithProviders(
      <PlanPreview
        planDetails={{
          ...validTrainingPlan,
          targetRace: validTrainingPlan.targetRace || undefined
        }}
        onConfirm={mockOnConfirm}
        onAdjust={mockOnAdjust}
        onBack={mockOnBack}
      />
    );

    // Check goal is displayed in Training Goal section
    const goalSection = screen.getByTestId('training-goal');
    expect(goalSection).toHaveTextContent(validTrainingPlan.goal);

    // Check dates are displayed in Program Timeline section
    const timelineSection = screen.getByTestId('program-timeline');
    expect(timelineSection).toHaveTextContent('March 15, 2025');
    expect(timelineSection).toHaveTextContent('June 15, 2025');
  });

  it('validates plan before confirmation', async () => {
    const invalidPlan = {
      ...validTrainingPlan,
      goal: '',  // Invalid: empty goal
      targetRace: validTrainingPlan.targetRace || undefined
    };

    renderWithProviders(
      <PlanPreview
        planDetails={invalidPlan}
        onConfirm={mockOnConfirm}
        onAdjust={mockOnAdjust}
        onBack={mockOnBack}
      />
    );

    // Try to confirm the plan
    const confirmButton = screen.getByTestId('approve-plan-button');
    fireEvent.click(confirmButton);

    // Check that the error is displayed in a toast
    await waitFor(() => {
      expect(screen.getByText(/training goal is required/i)).toBeInTheDocument();
    });

    // Confirm shouldn't be called with invalid data
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('allows plan confirmation when valid', async () => {
    renderWithProviders(
      <PlanPreview
        planDetails={{
          ...validTrainingPlan,
          targetRace: validTrainingPlan.targetRace || undefined
        }}
        onConfirm={mockOnConfirm}
        onAdjust={mockOnAdjust}
        onBack={mockOnBack}
      />
    );

    // Confirm the plan
    const confirmButton = screen.getByTestId('approve-plan-button');
    fireEvent.click(confirmButton);

    // Should call onConfirm
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('shows loading state during submission', () => {
    renderWithProviders(
      <PlanPreview
        planDetails={{
          ...validTrainingPlan,
          targetRace: validTrainingPlan.targetRace || undefined
        }}
        onConfirm={mockOnConfirm}
        onAdjust={mockOnAdjust}
        onBack={mockOnBack}
        isSubmitting={true}
      />
    );

    // Check loading state
    const approveButton = screen.getByTestId('approve-plan-button');
    expect(approveButton).toHaveTextContent(/creating plan/i);
    expect(approveButton).toBeDisabled();
  });

  it('handles adjustment requests', () => {
    renderWithProviders(
      <PlanPreview
        planDetails={{
          ...validTrainingPlan,
          targetRace: validTrainingPlan.targetRace || undefined
        }}
        onConfirm={mockOnConfirm}
        onAdjust={mockOnAdjust}
        onBack={mockOnBack}
      />
    );

    // Click adjust button
    const adjustButton = screen.getByTestId('request-adjustments-button');
    fireEvent.click(adjustButton);

    // Enter feedback
    const feedbackInput = screen.getByPlaceholderText(/adjust the training intensity/i);
    fireEvent.change(feedbackInput, { target: { value: 'Please reduce the intensity' } });

    // Submit adjustment
    const submitButton = screen.getByRole('button', { name: /submit adjustments/i });
    fireEvent.click(submitButton);

    expect(mockOnAdjust).toHaveBeenCalledWith('Please reduce the intensity');
  });
});