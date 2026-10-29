import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar.jsx';
import ResearchPage from './pages/ResearchPage.jsx';
import WritingPage from './pages/WritingPage.jsx';
import { fetchHealth } from './services/api.js';

export default function App() {
  const [activePage, setActivePage] = useState('research');
  const [healthInfo, setHealthInfo] = useState(null);
  const [savedBrief, setSavedBrief] = useState(null);
  const [importedDraftData, setImportedDraftData] = useState(null);

  useEffect(() => {
    fetchHealth()
      .then((data) => setHealthInfo(data))
      .catch((err) => console.error('[Client] Failed to check health:', err));
  }, []);

  // Ensure scroll position resets to top when navigating between Research and Writing
  // This prevents the sticky header from obscuring section headings on page change
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [activePage]);

  const handleAngleSelectedForDraft = (draftPayload) => {
    setImportedDraftData(draftPayload);
    setActivePage('writing');
  };

  const isMock = healthInfo?.mockMode === true;

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-900 flex flex-col font-sans selection:bg-stone-200 w-full overflow-x-hidden">
      <Navbar
        activePage={activePage}
        setActivePage={setActivePage}
        selectedAngle={importedDraftData?.angle}
        isMock={isMock}
      />

      <main className="flex-1 pb-16 w-full min-w-0">
        {activePage === 'research' && (
          <ResearchPage
            onAngleSelectedForDraft={handleAngleSelectedForDraft}
            initialBrief={savedBrief}
            setSavedBrief={setSavedBrief}
          />
        )}

        {activePage === 'writing' && (
          <WritingPage
            importedDraftData={importedDraftData}
            onBackToResearch={() => setActivePage('research')}
          />
        )}
      </main>

      <footer className="border-t border-stone-200/80 bg-white py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p className="font-medium text-stone-700">
            AI Editorial Workspace • This Week in AI
          </p>
          <p className="text-[11px] text-stone-400">
            Research smarter. Find the story. Write with evidence.
          </p>
        </div>
      </footer>
    </div>
  );
}
