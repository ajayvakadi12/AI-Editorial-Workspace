import React from 'react';
import { Newspaper, PenTool, Search, AlertCircle, Sparkles } from 'lucide-react';

export default function Navbar({ activePage, setActivePage, selectedAngle, isMock }) {
  return (
    <header className="border-b border-stone-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-30 transition-all w-full">
      {/* Mock Data Banner */}
      {isMock && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 py-1.5 text-xs text-amber-900">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
              <AlertCircle className="w-3 h-3 text-amber-800" />
              Mock Mode
            </span>
            <span className="text-amber-800 text-xs">
              Running with deterministic test fixtures (<code className="font-mono text-[11px] bg-amber-100/80 px-1 py-0.2 rounded">LLM_MOCK=true</code>).
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between min-h-[3.5rem] sm:min-h-[4rem] py-2 sm:py-0 gap-2 sm:gap-4">
          {/* Brand & Editorial Subtitle */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center shrink-0 shadow-2xs">
              <Newspaper className="w-4 h-4 text-stone-200" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-950 text-base tracking-tight shrink-0">
                  AI Editorial Workspace
                </span>
                <span className="text-[10px] font-medium text-stone-500 font-mono bg-stone-100 border border-stone-200/80 px-1.5 py-0.5 rounded shrink-0">
                  This Week in AI
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-500 truncate hidden md:block">
                Research smarter. Find the story. Write with evidence.
              </p>
            </div>
          </div>

          {/* Workflow Navigation Controls */}
          <nav className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActivePage('research')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activePage === 'research'
                  ? 'bg-stone-100 text-stone-950 shadow-xs border border-stone-200/80 font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <Search className={`w-3.5 h-3.5 ${activePage === 'research' ? 'text-stone-950' : 'text-stone-400'}`} />
              <span>Research</span>
            </button>

            <span className="text-stone-300 text-xs hidden sm:inline">•</span>

            <button
              type="button"
              onClick={() => setActivePage('writing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                activePage === 'writing'
                  ? 'bg-stone-100 text-stone-950 shadow-xs border border-stone-200/80 font-semibold'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-50'
              }`}
            >
              <PenTool className={`w-3.5 h-3.5 ${activePage === 'writing' ? 'text-stone-950' : 'text-stone-400'}`} />
              <span>Writing & Review</span>
            </button>

            {/* Selected Angle Context Pill (Compact with tooltip & accessible label) */}
            {selectedAngle && (
              <div
                className="hidden lg:flex items-center gap-1.5 pl-3 ml-1 border-l border-stone-200 max-w-[200px] xl:max-w-[280px]"
                title={`Active Angle: ${selectedAngle.headline}\n\nThesis: ${selectedAngle.thesis}`}
                aria-label={`Active Angle: ${selectedAngle.headline}`}
              >
                <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
                <span className="text-xs font-medium text-stone-700 bg-stone-100/90 border border-stone-200/80 px-2 py-0.5 rounded truncate">
                  {selectedAngle.headline}
                </span>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
