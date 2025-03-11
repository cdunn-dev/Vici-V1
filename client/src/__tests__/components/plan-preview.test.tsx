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

    // Check goal is displayed
    expect(screen.getByText(validTrainingPlan.goal)).toBeInTheDocument();

    // Check dates are displayed
    expect(screen.getByText(/March 15, 2025/)).toBeInTheDocument();
    expect(screen.getByText(/June 15, 2025/)).toBeInTheDocument();
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
    const confirmButton = screen.getByText(/Approve Training Plan/i);
    fireEvent.click(confirmButton);

    // Check that the error is displayed in a toast
    await waitFor(() => {
      expect(screen.getByText(/Training goal is required/i)).toBeInTheDocument();
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
    const confirmButton = screen.getByText(/Approve Training Plan/i);
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
    expect(screen.getByText(/Creating Plan/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Creating Plan/i })).toBeDisabled();
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
    const adjustButton = screen.getByText(/Request Adjustments/i);
    fireEvent.click(adjustButton);

    // Enter feedback
    const feedbackInput = screen.getByPlaceholderText(/adjust the training intensity/i);
    fireEvent.change(feedbackInput, { target: { value: 'Please reduce the intensity' } });

    // Submit adjustment
    const submitButton = screen.getByText(/Submit Adjustments/i);
    fireEvent.click(submitButton);

    expect(mockOnAdjust).toHaveBeenCalledWith('Please reduce the intensity');
  });
});