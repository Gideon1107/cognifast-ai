/**
 * Feature Card Component
 * Displays a feature with icon, title, and description
 */

import type { LucideProps } from 'lucide-react';
import type { FC } from 'react';

interface FeatureCardProps {
  icon: FC<LucideProps>;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white dark:bg-zinc-800 p-8 rounded-lg border border-gray-200 dark:border-zinc-700 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 sansation-regular">{title}</h3>
      <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}


