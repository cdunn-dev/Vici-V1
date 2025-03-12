import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';
import { vi } from 'vitest';

const ErrorComponent = () => {
  throw new Error('Test error message');
};

describe('ErrorBoundary', () => {
  // Mock console.error to prevent test output noise
  const originalConsoleError = console.error;
  beforeAll(() => {
    console.error = vi.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when there is no error', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(container).toHaveTextContent('Test content');
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
  });

  it('provides a way to reload the page', () => {
    const locationReload = vi.fn();
    const originalLocation = window.location;

    // Mock window.location
    delete window.location;
    window.location = { ...originalLocation, reload: locationReload };

    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    // Click reload button
    fireEvent.click(screen.getByRole('button', { name: /reload page/i }));
    expect(locationReload).toHaveBeenCalled();

    // Restore window.location
    window.location = originalLocation;
  });

  it('logs errors to console', () => {
    render(
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalledWith(
      'Uncaught error:',
      expect.any(Error),
      expect.any(Object)
    );
  });
});
