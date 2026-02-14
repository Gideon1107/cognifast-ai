/**
 * Navbar Component
 * Main navigation bar used across all pages
 */

import { useNavigate, useLocation } from 'react-router-dom';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const getStartedBaseClasses =
    'bg-gray-900 px-8 py-4 rounded-lg text-lg font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  const getStartedModifierClasses = isActive('/dashboard')
    ? 'text-blue-600'
    : 'text-white hover:text-gray-200';

  return (
    <header className="relative bg-white border-b border-gray-200">
      <a
        href="#main-content"
        className="absolute left-4 top-2 z-50 -translate-y-20 opacity-0 bg-white px-3 py-2 rounded-md text-sm font-medium text-gray-900 shadow-sm transition-all focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
            <span className="text-xl font-semibold text-gray-900 cursor-pointer sansation-regular">Cognifast</span>
          </button>
          
          <nav className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className={`${getStartedBaseClasses} ${getStartedModifierClasses}`}
            >
              Get Started
            </button>
            
            
          </nav>
        </div>
      </div>
    </header>
  );
}
