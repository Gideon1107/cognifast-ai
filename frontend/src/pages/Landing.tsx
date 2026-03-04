/**
 * Landing Page
 */

import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { StatsBar } from '../components/landing/StatsBar';
import { BentoFeatures } from '../components/landing/BentoFeatures';
import { HowItWorks } from '../components/landing/HowItWorks';
import { CTASection } from '../components/landing/CTASection';
import { Footer } from '../components/landing/Footer';

export function Landing() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 overflow-x-hidden">
      <Navbar />

      <main id="main-content" tabIndex={-1}>
        <HeroSection onGetStarted={handleGetStarted} />

        <StatsBar />

        <section className="py-24 px-6 md:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-blue-500 mb-3">
                Features
              </span>
              <h2 className="text-4xl md:text-5xl font-bold sansation-regular text-gray-900 dark:text-white">
                Everything you need to learn
              </h2>
            </div>
            <BentoFeatures />
          </div>
        </section>

        <HowItWorks />

        <CTASection onGetStarted={handleGetStarted} />
      </main>

      <Footer />
    </div>
  );
}
