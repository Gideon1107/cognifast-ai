import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HeroSection } from './HeroSection';

describe('HeroSection', () => {
  it('renders title, subtitle, and CTA', () => {
    render(
      <HeroSection
        title="Learn Faster"
        subtitle="Study smarter with AI guidance."
        ctaText="Get Started"
        ctaAction={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: 'Learn Faster',
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Study smarter with AI guidance.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
  });

  it('applies gradient styling when titleGradient is provided', () => {
    render(
      <HeroSection
        title="Learn Fast Today"
        titleGradient="Fast"
        subtitle="Master concepts quickly."
        ctaText="Start Learning"
        ctaAction={vi.fn()}
      />
    );

    const heading = screen.getByRole('heading', { name: 'Learn Fast Today' });
    const gradientText = screen.getByText('Fast');

    expect(heading).toContainElement(gradientText);
    expect(gradientText).toHaveClass('text-gradient');
  });

  it('calls ctaAction when the CTA button is clicked', async () => {
    const user = userEvent.setup();
    const ctaAction = vi.fn();

    render(
      <HeroSection
        title="Learn Faster"
        subtitle="Study smarter with AI guidance."
        ctaText="Get Started"
        ctaAction={ctaAction}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Get Started' }));
    expect(ctaAction).toHaveBeenCalledTimes(1);
  });
});
