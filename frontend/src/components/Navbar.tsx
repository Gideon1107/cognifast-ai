/**
 * Navbar Component
 * Main navigation bar used across all pages
 */

import { useNavigate, useLocation } from 'react-router-dom';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
            <span className="text-xl font-semibold text-gray-900 cursor-pointer sansation-regular">Cognifast AI</span>
          </button>
          
          <nav className="flex items-center gap-6">
            <button
              onClick={() => navigate('/dashboard')}
              className={`font-medium ${
                isActive('/dashboard') ? 'text-blue-600' : 'text-white hover:text-gray-200 cursor-pointer bg-gray-900 px-8 py-4 rounded-lg text-lg font-medium  transition-colors'
              }`}
            >
              Get Started
            </button>
            
            
          </nav>
        </div>
      </div>
    </header>
  );
}

