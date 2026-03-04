import { ArrowRight, FileText, MessageCircle, Sparkles } from 'lucide-react';

interface HeroSectionProps {
  onGetStarted: () => void;
}

export function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-6 pt-20 pb-16">
      {/* Background orbs */}
      <div
        aria-hidden
        className="orb animate-pulse-orb w-[700px] h-[700px] -top-48 -left-48 opacity-50"
        style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="orb animate-pulse-orb w-[600px] h-[600px] -bottom-32 -right-32 opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)',
          animationDelay: '3.5s',
        }}
      />
      <div
        aria-hidden
        className="orb animate-pulse-orb w-[400px] h-[400px] top-1/3 right-1/4 opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
          animationDelay: '1.5s',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div
          className="animate-fade-in inline-flex items-center gap-2 glass rounded-full px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-8 shadow-sm"
          style={{ animationDelay: '0ms' }}
        >
          <Sparkles className="w-4 h-4 text-emerald-500" />
          AI-Powered Learning Platform
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up sansation-regular text-6xl md:text-7xl lg:text-8xl font-bold text-gray-900 dark:text-white mb-6 leading-[1.05] tracking-tight"
          style={{ animationDelay: '100ms' }}
        >
          Learn{' '}
          <span className="text-gradient">Faster</span>
          {' '}Than<br className="hidden md:block" /> Ever Before
        </h1>

        {/* Subtitle */}
        <p
          className="animate-fade-up text-xl md:text-2xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ animationDelay: '220ms' }}
        >
          Upload your documents, chat with an AI that truly understands them, and generate quizzes to cement your knowledge.
        </p>

        {/* CTA */}
        <div
          className="animate-fade-up flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{ animationDelay: '340ms' }}
        >
          <button
            onClick={onGetStarted}
            className="inline-flex items-center gap-2 bg-linear-to-r from-emerald-500 to-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/45 hover:scale-[1.03] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
          >
            Try Cognifast AI
            <ArrowRight className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-500">Free to get started · No credit card</span>
        </div>
      </div>

      {/* Floating UI mockup */}
      <div
        className="animate-fade-up animate-float relative z-10 mt-16 w-full max-w-2xl mx-auto"
        style={{ animationDelay: '500ms' }}
      >
        <div className="glass rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden border border-white/20 dark:border-white/5">
          {/* Window chrome */}
          <div className="bg-zinc-900 px-5 py-3 flex items-center gap-2 border-b border-zinc-800">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
            <div className="flex-1 mx-4 bg-zinc-800 rounded-md h-5 flex items-center px-3">
              <span className="text-zinc-500 text-xs">cognifast.ai/chat</span>
            </div>
          </div>

          {/* Mock chat UI */}
          <div className="bg-zinc-950 p-6 grid grid-cols-[200px_1fr] gap-4 min-h-[260px]">
            {/* Sources panel mock */}
            <div className="bg-zinc-900 rounded-xl p-3 space-y-2">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-3">Sources</p>
              {['Chapter 1.pdf', 'Notes.docx', 'Slides.pdf'].map((name) => (
                <div key={name} className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                  <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-zinc-300 text-xs truncate">{name}</span>
                </div>
              ))}
            </div>

            {/* Chat panel mock */}
            <div className="flex flex-col gap-3">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-emerald-300 text-sm">Can you summarize the key concepts from Chapter 1?</p>
              </div>
              <div className="bg-zinc-800 rounded-xl p-4 flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-blue-400" />
                  <span className="text-blue-300 text-xs font-semibold">Cognifast AI</span>
                </div>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  Chapter 1 introduces three foundational principles: <span className="text-blue-300 font-medium">active recall</span>, <span className="text-emerald-300 font-medium">spaced repetition</span>, and <span className="text-purple-300 font-medium">interleaving</span>...
                </p>
              </div>
              <div className="flex gap-2">
                {['Quiz me', 'Key concepts', 'Study guide'].map((label) => (
                  <span key={label} className="px-3 py-1.5 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-medium border border-zinc-700">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
