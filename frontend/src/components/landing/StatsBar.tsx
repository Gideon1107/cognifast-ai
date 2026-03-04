import { useEffect, useRef, useState } from 'react';
import { useInView } from '../../hooks/useInView';

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const STATS: Stat[] = [
  { value: 10, suffix: 'x', label: 'Faster learning' },
  { value: 3, suffix: ' min', label: 'Setup time' },
  { value: 50, suffix: 'K+', label: 'Documents analyzed' },
  { value: 98, suffix: '%', label: 'Accuracy rate' },
];

function useCounter(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [active, target, duration]);

  return value;
}

function StatItem({ stat, active, delay }: { stat: Stat; active: boolean; delay: number }) {
  const count = useCounter(stat.value, active);

  return (
    <div
      className={`flex flex-col items-center text-center px-8 animate-fade-up ${active ? '' : 'opacity-0'}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="text-4xl md:text-5xl font-bold sansation-regular text-gray-900 dark:text-white">
        {count}
        <span className="text-gradient">{stat.suffix}</span>
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{stat.label}</div>
    </div>
  );
}

export function StatsBar() {
  const [ref, visible] = useInView();

  return (
    <section
      ref={ref as React.Ref<HTMLElement>}
      className="py-16 px-8 border-y border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50"
    >
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x-0 md:divide-x divide-gray-200 dark:divide-zinc-700">
          {STATS.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} active={visible} delay={i * 100} />
          ))}
        </div>
      </div>
    </section>
  );
}
