import { Upload, MessageSquare, Trophy } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import type { LucideIcon } from 'lucide-react';

interface Step {
  number: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  iconBg: string;
}

const STEPS: Step[] = [
  {
    number: '01',
    icon: Upload,
    title: 'Upload your documents',
    description: 'Drop in PDFs, DOCX, text files, or paste a URL. Cognifast AI processes and indexes them in seconds.',
    color: 'from-emerald-500 to-teal-400',
    iconBg: 'bg-emerald-500/10',
  },
  {
    number: '02',
    icon: MessageSquare,
    title: 'Chat with your content',
    description: 'Ask any question. Get precise, cited answers grounded entirely in your own documents.',
    color: 'from-blue-500 to-indigo-400',
    iconBg: 'bg-blue-500/10',
  },
  {
    number: '03',
    icon: Trophy,
    title: 'Master your material',
    description: 'Auto-generate quizzes, track progress, and lock in knowledge with spaced repetition.',
    color: 'from-purple-500 to-pink-400',
    iconBg: 'bg-purple-500/10',
  },
];

export function HowItWorks() {
  const [ref, visible] = useInView({ threshold: 0.1 });

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className="py-24 px-8"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div
          className={`text-center mb-16 animate-fade-up ${visible ? '' : 'opacity-0'}`}
          style={{ animationDelay: '0ms' }}
        >
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-3">
            How it works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold sansation-regular text-gray-900 dark:text-white">
            From upload to mastery<br className="hidden md:block" /> in three steps
          </h2>
        </div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Connecting line (desktop) */}
          <div
            className={`hidden md:block absolute top-[52px] left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px origin-left ${visible ? 'animate-[line-grow_0.8s_0.4s_ease_both]' : 'scale-x-0'}`}
            style={{ background: 'linear-gradient(to right, #10b981, #3b82f6, #a855f7)' }}
          />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className={`relative flex flex-col items-center text-center animate-fade-up ${visible ? '' : 'opacity-0'}`}
                style={{ animationDelay: `${200 + i * 150}ms` }}
              >
                {/* Step number + icon */}
                <div className="relative mb-5">
                  <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white dark:bg-zinc-900 border-2 border-gray-200 dark:border-zinc-700 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{step.number}</span>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 dark:text-white sansation-regular mb-2">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>

                {/* Mobile connector */}
                {i < STEPS.length - 1 && (
                  <div className="md:hidden w-px h-8 bg-linear-to-b from-gray-300 to-transparent dark:from-zinc-600 mt-6" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
