/**
 * Documents Page
 * Manage and view uploaded documents
 */

import { Navbar } from '../components/Navbar';

export function Documents() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <Navbar />

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 sansation-regular">Documents</h1>
        <div className="bg-white dark:bg-zinc-800 p-12 rounded-lg border border-gray-200 dark:border-zinc-700 text-center">
          <p className="text-gray-600 dark:text-gray-400">Document management coming soon...</p>
        </div>
      </main>
    </div>
  );
}
