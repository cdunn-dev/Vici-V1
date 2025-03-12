import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import PlanPreview from '@/components/training/plan-preview';
import { renderWithProviders } from '../test-utils';
import { 
  validTrainingPlan,
  planWithEndDateBeforeStartDate,
  planWithoutWorkouts,
  planWithNegativeDistance,
  planWithInvalidDates,
  emptyPlan,
  partialPlan
} from '../fixtures/training-plan';
import { vi } from 'vitest';
import { useToast } from '@/hooks/use-toast';

// Mock the useToast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

describe('PlanPreview', () => {
  const mockOnConfirm = vi.fn();
  const mockOnAdjust = vi.fn();
  const mockOnBack = vi.fn();
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as jest.Mock).mockImplementation(() => ({
      toast: mockToast,
    }));
  });

  const renderComponent = (props: any) => {
    return renderWithProviders(
      <PlanPreview {...props} />
    );
  };

  it('renders plan details correctly', () => {
    renderComponent({
      planDetails: {
        ...validTrainingPlan,
        targetRace: validTrainingPlan.targetRace || undefined
      },
      onConfirm: mockOnConfirm,
      onAdjust: mockOnAdjust,
      onBack: mockOnBack
    });

    // Check goal is displayed in Training Goal section
    const goalSection = screen.getByTestId('training-goal');
    expect(goalSection).toHaveTextContent(validTrainingPlan.goal);

    // Check dates are displayed in Program Timeline section
    const timelineSection = screen.getByTestId('program-timeline');
    expect(timelineSection).toHaveTextContent('March 15, 2025');
    expect(timelineSection).toHaveTextContent('June 15, 2025');
  });

  describe('Plan Validation', () => {
    const testValidationError = async (plan: any, expectedError: string) => {
      renderComponent({
        planDetails: plan,
        onConfirm: mockOnConfirm,
        onAdjust: mockOnAdjust,
        onBack: mockOnBack
      });

      // Try to confirm the plan
      const confirmButton = screen.getByTestId('approve-plan-button');
      fireEvent.click(confirmButton);

      // Verify that the toast was called with the correct error message
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Validation Error',
          description: expectedError,
          variant: 'destructive'
        })
      );

      // Confirm shouldn't be called with invalid data
      expect(mockOnConfirm).not.toHaveBeenCalled();
    };

    it('validates empty goals', async () => {
      await testValidationError(
        { ...validTrainingPlan, goal: '' },
        'Training goal is required and cannot be empty'
      );
    });

    it('validates date order', async () => {
      await testValidationError(
        planWithEndDateBeforeStartDate,
        'End date must be after start date'
      );
    });

    it('validates required workouts', async () => {
      await testValidationError(
        planWithoutWorkouts,
        'Week 1 must have at least one workout'
      );
    });

    it('validates workout distances', async () => {
      await testValidationError(
        planWithNegativeDistance,
        'Workout distance must be positive'
      );
    });

    it('validates date formats', async () => {
      await testValidationError(
        planWithInvalidDates,
        'Invalid start date format: invalid-date'
      );
    });
  });

  it('allows plan confirmation when valid', async () => {
    renderComponent({
      planDetails: {
        ...validTrainingPlan,
        targetRace: validTrainingPlan.targetRace || undefined
      },
      onConfirm: mockOnConfirm,
      onAdjust: mockOnAdjust,
      onBack: mockOnBack
    });

    // Confirm the plan
    const confirmButton = screen.getByTestId('approve-plan-button');
    fireEvent.click(confirmButton);

    // Should call onConfirm
    await waitFor(() => {
      expect(mockOnConfirm).toHaveBeenCalled();
    });
  });

  it('shows loading state during submission', () => {
    renderComponent({
      planDetails: {
        ...validTrainingPlan,
        targetRace: validTrainingPlan.targetRace || undefined
      },
      onConfirm: mockOnConfirm,
      onAdjust: mockOnAdjust,
      onBack: mockOnBack,
      isSubmitting: true
    });

    // Check loading state
    const approveButton = screen.getByTestId('approve-plan-button');
    expect(approveButton).toHaveTextContent(/creating plan/i);
    expect(approveButton).toBeDisabled();
  });

  it('handles adjustment requests', () => {
    renderComponent({
      planDetails: {
        ...validTrainingPlan,
        targetRace: validTrainingPlan.targetRace || undefined
      },
      onConfirm: mockOnConfirm,
      onAdjust: mockOnAdjust,
      onBack: mockOnBack
    });

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

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined plan data gracefully', () => {
      // Testing with undefined plan should not throw
      expect(() => {
        renderComponent({
          planDetails: undefined,
          onConfirm: mockOnConfirm,
          onAdjust: mockOnAdjust,
          onBack: mockOnBack
        });
      }).not.toThrow();

      // Should show a fallback message
      expect(screen.getByText(/no plan data available/i)).toBeInTheDocument();
    });

    it('handles partial plan data without crashing', () => {
      // Should render with minimal required fields
      renderComponent({
        planDetails: partialPlan,
        onConfirm: mockOnConfirm,
        onAdjust: mockOnAdjust,
        onBack: mockOnBack
      });

      // Basic info should still be shown
      expect(screen.getByTestId('training-goal')).toHaveTextContent(partialPlan.goal || '');
      expect(screen.getByTestId('program-timeline')).toBeInTheDocument();
    });

    it('handles empty weekly plans array', () => {
      renderComponent({
        planDetails: {
          ...validTrainingPlan,
          weeklyPlans: []
        },
        onConfirm: mockOnConfirm,
        onAdjust: mockOnAdjust,
        onBack: mockOnBack
      });

      // Should show empty state message
      expect(screen.getByText(/no workouts planned yet/i)).toBeInTheDocument();
    });

    it('handles missing weekly plans property', () => {
      renderComponent({
        planDetails: emptyPlan,
        onConfirm: mockOnConfirm,
        onAdjust: mockOnAdjust,
        onBack: mockOnBack
      });

      // Should show empty state message
      expect(screen.getByText(/no workouts planned yet/i)).toBeInTheDocument();
    });
  });
});