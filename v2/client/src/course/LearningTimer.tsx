import React, { useState, useEffect } from 'react';
import { Clock, Pause, Play, RotateCcw } from 'lucide-react';

interface LearningTimerProps {
  courseId: string;
}

export const LearningTimer: React.FC<LearningTimerProps> = ({ courseId }) => {
  const storageKey = `cmai_course_time_${courseId}`;

  // Récupération du temps initial depuis le localStorage
  const [seconds, setSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isActive, setIsActive] = useState<boolean>(true);

  // Synchronisation du chronomètre et sauvegarde localState/localStorage
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          localStorage.setItem(storageKey, next.toString());
          return next;
        });
      }, 1000);
    } else if (!isActive && interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, storageKey]);

  // Formatage HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    const pad = (num: number) => String(num).padStart(2, '0');

    if (hrs > 0) {
      return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(mins)}m ${pad(secs)}s`;
  };

  const handleReset = () => {
    if (confirm('Voulez-vous réinitialiser le chronomètre de ce cours ?')) {
      setSeconds(0);
      localStorage.removeItem(storageKey);
    }
  };

  return (
    <div className="my-4 inline-flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs font-medium text-slate-300 shadow-md backdrop-blur">
      <div className="flex items-center gap-2">
        <Clock className={`h-4 w-4 ${isActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
        <span>Temps d'apprentissage :</span>
        <span className="font-mono text-sm font-semibold text-emerald-400">
          {formatTime(seconds)}
        </span>
      </div>

      <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
        <button
          onClick={() => setIsActive(!isActive)}
          className="rounded-md p-1 hover:bg-slate-800 hover:text-white transition-colors"
          title={isActive ? 'Mettre en pause' : 'Reprendre'}
        >
          {isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
        </button>

        <button
          onClick={handleReset}
          className="rounded-md p-1 hover:bg-slate-800 hover:text-rose-400 transition-colors"
          title="Réinitialiser"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};