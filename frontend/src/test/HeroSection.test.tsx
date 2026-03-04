import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HeroSection } from '../components/landing/HeroSection';

describe('HeroSection', () => {
  it('renders the headline', () => {
    render(<HeroSection onGetStarted={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the CTA button', () => {
    render(<HeroSection onGetStarted={vi.fn()} />);
    expect(screen.getByRole('button', { name: /try cognifast ai/i })).toBeInTheDocument();
  });

  it('calls onGetStarted when CTA button is clicked', async () => {
    const user = userEvent.setup();
    const onGetStarted = vi.fn();

    render(<HeroSection onGetStarted={onGetStarted} />);
    await user.click(screen.getByRole('button', { name: /try cognifast ai/i }));

    expect(onGetStarted).toHaveBeenCalledTimes(1);
  });

  it('renders the badge text', () => {
    render(<HeroSection onGetStarted={vi.fn()} />);
    expect(screen.getByText(/ai-powered learning platform/i)).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<HeroSection onGetStarted={vi.fn()} />);
    expect(screen.getByText(/upload your documents/i)).toBeInTheDocument();
  });
});
