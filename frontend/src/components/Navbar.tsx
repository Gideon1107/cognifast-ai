/**
 * Navbar Component
 * Main navigation bar used across all pages
 */

import { useNavigate } from 'react-router-dom';
import cognifastLogo from '../assets/cognifast_logo.png';
import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isChatPage = location.pathname.includes('/chat');
  const isLandingPage = location.pathname === '/';

  const { theme, toggleTheme } = useTheme();

  return (
  <header className={`relative ${isChatPage ? 'bg-gray-50 dark:bg-zinc-950 dark:border-zinc-950' : isLandingPage ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-900'} border-b border-gray-50 dark:border-zinc-900`}>
      <a
        href="#main-content"
        className="absolute left-4 top-2 z-50 -translate-y-20 opacity-0 bg-white dark:bg-zinc-900 px-3 py-2 rounded-md text-sm font-medium text-gray-900 dark:text-white shadow-sm transition-all focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="px-8 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg"
          >
            <img src={cognifastLogo} alt="Cognifast logo" className="w-14 h-10 object-contain" />
            <span className="text-xl font-semibold text-gray-900 dark:text-white cursor-pointer sansation-regular -ml-2">Cogni<span className="text-blue-800 italic">fast</span></span>
          </button>

          <nav className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>

            {!isChatPage && (
              <button
                onClick={() => navigate('/dashboard')}
                className="bg-gray-900 dark:bg-white px-8 py-4 rounded-lg text-lg font-medium text-white dark:text-gray-900 hover:text-gray-200 dark:hover:bg-gray-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Get Started
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
