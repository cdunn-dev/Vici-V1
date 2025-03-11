import { render, screen } from '@testing-library/react';
import { BaseLayout } from '@/components/layout/base-layout';

describe('BaseLayout', () => {
  it('renders children content', () => {
    const testContent = 'Test Content';
    render(<BaseLayout>{testContent}</BaseLayout>);
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('includes header and footer', () => {
    render(<BaseLayout>Content</BaseLayout>);
    
    // Check for footer copyright text
    expect(screen.getByText(/Running Training Platform/)).toBeInTheDocument();
    expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    
    // Check for main structural elements
    expect(document.querySelector('header')).toBeInTheDocument();
    expect(document.querySelector('main')).toBeInTheDocument();
    expect(document.querySelector('footer')).toBeInTheDocument();
  });

  it('applies custom className to main content', () => {
    const customClass = 'custom-class';
    render(<BaseLayout className={customClass}>Content</BaseLayout>);
    expect(document.querySelector('main')).toHaveClass(customClass);
  });
});
