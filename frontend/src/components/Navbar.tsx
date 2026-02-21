/**
 * Navbar Component
 * Main navigation bar used across all pages
 */

import { useNavigate } from 'react-router-dom';
import cognifastLogo from '../assets/cognifast_logo.png';

export function Navbar() {
  const navigate = useNavigate();

  return (
    <header className="relative bg-white border-b border-gray-200">
      <a
        href="#main-content"
        className="absolute left-4 top-2 z-50 -translate-y-20 opacity-0 bg-white px-3 py-2 rounded-md text-sm font-medium text-gray-900 shadow-sm transition-all focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="px-8 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
          >
            <img src={cognifastLogo} alt="Cognifast logo" className="w-14 h-14 object-contain" />
            <span className="text-xl font-semibold text-gray-900 cursor-pointer sansation-regular -ml-2">Cogni<span className="text-blue-800 italic">fast</span></span>
          </button>
          
          <nav className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-900 px-8 py-4 rounded-lg text-lg font-medium text-white hover:text-gray-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Get Started
            </button>
            
            
          </nav>
        </div>
      </div>
    </header>
  );
}
