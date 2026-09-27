import React, { useState, useEffect } from 'react';
import { List, CheckCircle2, Bookmark } from 'lucide-react';

export interface TocSection {
  id: string;
  title: string;
  type?: 'text' | 'code' | 'video' | 'quiz';
}

interface TableOfContentsProps {
  sections: TocSection[];
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ sections }) => {
  const [activeId, setActiveId] = useState<string>('');
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  // Détection du scroll pour surligner la section active
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;

          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveId(section.id);
            // Marquer comme lu une fois atteint
            setCompletedSections((prev) =>
              prev.includes(section.id) ? prev : [...prev, section.id]
            );
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Vérification initiale

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const progressPercentage = Math.round(
    (completedSections.length / (sections.length || 1)) * 100
  );

  return (
    <aside className="sticky top-24 hidden w-72 shrink-0 lg:block">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl backdrop-blur">
        {/* En-tête du sommaire */}
        <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 font-semibold text-slate-200 text-sm">
            <List className="h-4 w-4 text-emerald-400" />
            <span>Dans ce chapitre</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            {progressPercentage}% lu
          </span>
        </div>

        {/* Barre de progression visuelle */}
        <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-emerald-400 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Liste des sections */}
        <nav className="space-y-1">
          {sections.map((section) => {
            const isActive = activeId === section.id;
            const isCompleted = completedSections.includes(section.id);

            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all ${
                  isActive
                    ? 'bg-emerald-500/10 font-semibold text-emerald-400 border-l-2 border-emerald-400'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <span className="truncate">{section.title}</span>
                {isCompleted ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-40" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};