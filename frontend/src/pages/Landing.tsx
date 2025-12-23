/**
 * Landing Page
 * Public-facing landing page with NotebookLM-style design
 */

import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/landing/HeroSection';
import { FileText, MessageCircle, ClipboardCheck } from 'lucide-react';

export function Landing() {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Main Content */}
      <main className="px-8">
        {/* Hero Section */}
        <HeroSection
          title="Learn Faster"
          titleGradient="Faster"
          subtitle="Your AI-powered learning partner, grounded in the documents you trust, built with advanced language models."
          ctaText="Try Cognifast AI"
          ctaAction={handleGetStarted}
        />

        {/* Features Section */}
        <div className="pb-24 space-y-32 px-54">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 text-center mb-24">
            Your AI-Powered Learning Partner
          </h2>

          {/* Feature 1: Upload Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-gray-900" />
                <h3 className="text-3xl font-semibold text-gray-900">Upload your sources</h3>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                Upload PDFs, DOCX, and text files, and Cognifast AI will summarize them and make interesting connections between topics, all powered by advanced language models.
              </p>
            </div>
            
            <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl min-h-[400px] flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-10 h-10 text-white" />
                </div>
                <p className="text-gray-400 text-lg">Document upload interface</p>
              </div>
            </div>
          </div>

          {/* Feature 2: AI Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl min-h-[400px] flex flex-col gap-4">
                <div className="bg-emerald-500/10 border-2 border-emerald-500/50 rounded-xl p-4">
                  <p className="text-emerald-300 font-medium">Can you summarize the key points from my document?</p>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 flex-1">
                  <h4 className="text-white text-lg font-semibold mb-3">Here's a breakdown of James Joyce's Ulysses:</h4>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-blue-300 text-sm mb-1">Plot and Structure</p>
                      <p className="text-gray-400 text-sm">Ulysses is a complex and multifaceted novel that follows Leopold Bloom through Dublin...</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="bg-gray-800/60 rounded-xl p-4 backdrop-blur border border-gray-700">
                  <p className="text-gray-400 text-xs mb-3 font-medium">TRY THESE ACTIONS:</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      Study guide
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      Quiz me
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      Key concepts
                    </button>
                    <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                      Timeline
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <MessageCircle className="w-8 h-8 text-gray-900" />
                <h3 className="text-3xl font-semibold text-gray-900">Get instant insights</h3>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                With all of your sources in place, Cognifast AI gets to work and becomes a personalized AI expert in the information that matters most to you.
              </p>
            </div>
          </div>

          {/* Feature 3: Quiz Generation */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <ClipboardCheck className="w-8 h-8 text-gray-900" />
                <h3 className="text-3xl font-semibold text-gray-900">Test your knowledge</h3>
              </div>
              <p className="text-lg text-gray-600 leading-relaxed">
                Generate quizzes automatically from your documents. Test your understanding and track your learning progress over time.
              </p>
            </div>
            
            <div className="bg-gray-900 rounded-2xl p-8 shadow-2xl min-h-[400px] flex items-center justify-center">
              <div className="w-full space-y-4">
                <div className="bg-gray-800 rounded-xl p-4 border-l-4 border-purple-500">
                  <p className="text-white font-medium mb-2">Question 1 of 5</p>
                  <p className="text-gray-300 text-sm">What is the main theme discussed in Chapter 3?</p>
                </div>
                <div className="space-y-2">
                  <div className="bg-gray-800 rounded-lg p-3 text-gray-300 text-sm hover:bg-gray-700 transition-colors cursor-pointer">
                    A) Economic theory
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-gray-300 text-sm hover:bg-gray-700 transition-colors cursor-pointer">
                    B) Social dynamics
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="px-8 text-center text-gray-600">
          <p>© 2025 Cognifast AI. Built for faster learning.</p>
        </div>
      </footer>
    </div>
  );
}

