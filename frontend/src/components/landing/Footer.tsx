import cognifastLogo from '../../assets/cognifast_logo.png';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-zinc-800 py-10 px-8">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src={cognifastLogo} alt="Cognifast logo" className="w-8 h-6 object-contain" />
          <span className="sansation-regular font-semibold text-gray-900 dark:text-white text-lg">
            Cogni<span className="text-blue-600 italic font-bold">fast</span>
          </span>
        </div>

        {/* Links */}
        <nav className="flex gap-6 text-sm text-gray-500 dark:text-gray-400">
          <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Contact</a>
        </nav>

        {/* Copyright */}
        <p className="text-sm text-gray-400 dark:text-gray-500">
          © 2025 Cognifast AI. Built for faster learning.
        </p>
      </div>
    </footer>
  );
}
