import { ArrowRight, Zap } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

interface CTASectionProps {
  onGetStarted: () => void;
}

export function CTASection({ onGetStarted }: CTASectionProps) {
  const [ref, visible] = useInView({ threshold: 0.15 });

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className="px-6 md:px-8 py-16"
    >
      <div className="relative overflow-hidden rounded-3xl">
        {/* Animated gradient background */}
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: 'linear-gradient(135deg, #10b981, #3b82f6, #a855f7, #3b82f6, #10b981)',
          }}
        />

        {/* Overlay for depth */}
        <div className="absolute inset-0 bg-black/25" />

        {/* Central glow orb */}
        <div
          aria-hidden
          className="orb animate-pulse-orb w-[700px] h-[400px] top-1/2 left-1/2"
          style={{
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 65%)',
            position: 'absolute',
          }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 py-20 px-8 text-center">
          <div
            className={`inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm text-white/90 font-medium mb-8 animate-fade-in ${visible ? '' : 'opacity-0'}`}
            style={{ animationDelay: '0ms' }}
          >
            <Zap className="w-4 h-4 text-yellow-300" />
            Start learning in minutes
          </div>

          <h2
            className={`text-4xl md:text-5xl lg:text-6xl font-bold sansation-regular text-white mb-6 leading-tight animate-fade-up ${visible ? '' : 'opacity-0'}`}
            style={{ animationDelay: '100ms' }}
          >
            Start Learning Smarter Today
          </h2>

          <p
            className={`text-xl text-white/75 mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-up ${visible ? '' : 'opacity-0'}`}
            style={{ animationDelay: '220ms' }}
          >
            Join thousands of students and professionals who use Cognifast AI to learn faster, retain more, and achieve better results.
          </p>

          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up ${visible ? '' : 'opacity-0'}`}
            style={{ animationDelay: '340ms' }}
          >
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 bg-white text-gray-900 px-10 py-4 rounded-xl text-lg font-semibold shadow-xl shadow-black/20 hover:bg-gray-50 hover:scale-[1.03] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </button>
            <span className="text-white/60 text-sm">No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  );
}
