import { FileText, MessageCircle, ClipboardCheck } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

function CardAccentLine() {
  return null;
}

function UploadMock() {
  return (
    <div className="mt-6 bg-zinc-900 rounded-xl p-5 space-y-3">
      {[
        { name: 'Introduction to ML.pdf', size: '2.4 MB', color: 'bg-blue-500' },
        { name: 'Research Notes.docx', size: '856 KB', color: 'bg-emerald-500' },
        { name: 'Lecture Slides.pdf', size: '5.1 MB', color: 'bg-purple-500' },
      ].map((file) => (
        <div key={file.name} className="flex items-center gap-3 bg-zinc-800 rounded-lg px-4 py-3">
          <div className={`w-8 h-8 ${file.color} rounded-lg flex items-center justify-center shrink-0`}>
            <FileText className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{file.name}</p>
            <p className="text-zinc-500 text-xs">{file.size}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        </div>
      ))}
      <div className="border-2 border-dashed border-zinc-700 rounded-lg p-4 text-center">
        <p className="text-zinc-500 text-xs">Drop files here or click to upload</p>
      </div>
    </div>
  );
}

function ChatMock() {
  return (
    <div className="mt-4 space-y-3">
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
        <p className="text-emerald-300 text-xs">What are the key differences between supervised and unsupervised learning?</p>
      </div>
      <div className="bg-zinc-800 rounded-xl p-4">
        <p className="text-zinc-300 text-xs leading-relaxed">
          <span className="text-blue-300 font-semibold">Supervised learning</span> uses labeled data to train models, while{' '}
          <span className="text-purple-300 font-semibold">unsupervised learning</span> discovers patterns in unlabeled data...
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['Explain further', 'Give examples', 'Quiz me'].map((a) => (
          <span key={a} className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg text-xs">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuizMock() {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <div className="col-span-2 bg-zinc-800 rounded-xl p-4 border-l-4 border-purple-500">
        <p className="text-zinc-400 text-xs mb-1">Question 2 of 8</p>
        <p className="text-white text-sm font-medium">Which algorithm is best suited for classification tasks with linear boundaries?</p>
      </div>
      {['Logistic Regression', 'K-Means', 'Random Forest', 'DBSCAN'].map((opt, i) => (
        <div
          key={opt}
          className={`rounded-lg px-3 py-2.5 text-xs font-medium transition-colors cursor-pointer ${
            i === 0
              ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-300'
              : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          {opt}
        </div>
      ))}
    </div>
  );
}

export function BentoFeatures() {
  const [ref, visible] = useInView({ threshold: 0.08 });

  return (
    <div
      ref={ref as React.Ref<HTMLDivElement>}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto md:auto-rows-[1fr]"
    >
      {/* Card 1: Upload Sources — col-span-2 */}
      <div
        className={`relative group md:col-span-2 glass glow-border rounded-2xl p-7 overflow-hidden animate-fade-up ${visible ? '' : 'opacity-0'}`}
        style={{ animationDelay: '0ms' }}
      >
        <CardAccentLine />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white sansation-regular">Upload your sources</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">PDFs, DOCX, plain text, and URLs</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Drop in documents or paste a URL — Cognifast AI will parse, summarize, and index everything, ready for deep Q&A in seconds.
        </p>
        <UploadMock />
      </div>

      {/* Card 2: AI Insights — tall, row-span-2 */}
      <div
        className={`relative group md:row-span-2 glass glow-border rounded-2xl p-7 overflow-hidden animate-fade-up ${visible ? '' : 'opacity-0'}`}
        style={{ animationDelay: '120ms' }}
      >
        <CardAccentLine />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-500/15 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white sansation-regular">Get instant insights</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Grounded in your documents</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Ask anything. Get precise answers with citations, summaries, concept maps, and study guides — all sourced from your own files.
        </p>
        <ChatMock />
      </div>

      {/* Card 3: Quiz Generation — col-span-2 */}
      <div
        className={`relative group md:col-span-2 glass glow-border rounded-2xl p-7 overflow-hidden animate-fade-up ${visible ? '' : 'opacity-0'}`}
        style={{ animationDelay: '240ms' }}
      >
        <CardAccentLine />
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white sansation-regular">Test your knowledge</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Auto-generated quizzes</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
          Generate adaptive quizzes instantly from your materials. Track progress and reinforce learning with spaced repetition.
        </p>
        <QuizMock />
      </div>
    </div>
  );
}
