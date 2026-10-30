import React, { useEffect, useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { soundEngine } from '../../audio/SoundEngine.js';

interface TimerProps {
  label?: string;
  className?: string;
}

export const Timer: React.FC<TimerProps> = ({ label = 'TIME REMAINING', className = '' }) => {
  const phaseEndsAt = useGameStore((state) => state.phaseEndsAt);
  const clockOffset = useGameStore((state) => state.clockOffset);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [lastSecondTick, setLastSecondTick] = useState<number>(-1);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now() + clockOffset;
      const remainingMs = Math.max(0, phaseEndsAt - now);
      const secs = Math.ceil(remainingMs / 1000);
      setSecondsRemaining(secs);

      if (secs <= 3 && secs > 0 && secs !== lastSecondTick) {
        soundEngine.playCountdown();
        setLastSecondTick(secs);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 250);
    return () => clearInterval(interval);
  }, [phaseEndsAt, clockOffset, lastSecondTick]);

  const isUrgent = secondsRemaining <= 5 && secondsRemaining > 0;

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <span className="text-[10px] tracking-[0.2em] font-display text-gray-400 uppercase mb-1">
        {label}
      </span>
      <div
        className={`font-display text-3xl sm:text-4xl font-bold px-5 py-2 rounded-xl transition-all duration-300 border ${
          isUrgent
            ? 'text-red-400 border-red-500/60 bg-red-950/40 animate-pulse shadow-lg shadow-red-500/30'
            : 'text-neon-cyan border-cyan-500/30 bg-midnight-light/60 shadow-lg shadow-cyan-500/10'
        }`}
      >
        {String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:
        {String(secondsRemaining % 60).padStart(2, '0')}
      </div>
    </div>
  );
};
