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
    <div className="bg-white p-8 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-blue-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}

