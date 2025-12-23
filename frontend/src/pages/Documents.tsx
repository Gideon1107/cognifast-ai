/**
 * Documents Page
 * Manage and view uploaded documents
 */

import { Navbar } from '../components/Navbar';

export function Documents() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Documents</h1>
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600">Document management coming soon...</p>
        </div>
      </main>
    </div>
  );
}

