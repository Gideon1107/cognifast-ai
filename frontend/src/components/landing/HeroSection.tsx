/**
 * Hero Section Component
 * Reusable hero component for landing page and dashboard
 * NotebookLM-style typography
 */

import { ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  title: string;
  titleGradient?: string; // Part of title to apply gradient to
  subtitle: string;
  ctaText: string;
  ctaAction: () => void;
  centered?: boolean;
}

export function HeroSection({ 
  title, 
  titleGradient, 
  subtitle, 
  ctaText, 
  ctaAction, 
  centered = true 
}: HeroSectionProps) {
  // Split title if gradient part is specified
  const renderTitle = () => {
    if (titleGradient && title.includes(titleGradient)) {
      const parts = title.split(titleGradient);
      return (
        <>
          {parts[0]}
          <span className="text-gradient">{titleGradient}</span>
          {parts[1]}
        </>
      );
    }
    return title;
  };

  return (
    <div className={`py-16 md:py-24 ${centered ? 'text-center' : ''}`}>
      <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 mb-6 leading-[1.1] tracking-tight">
        {renderTitle()}
      </h1>
      <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
        {subtitle}
      </p>
      <button
        onClick={ctaAction}
        className="inline-flex items-center gap-2 bg-gray-900 text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition-colors cursor-pointer"
      >
        {ctaText}
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}

