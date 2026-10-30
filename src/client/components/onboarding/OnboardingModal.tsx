import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { Button } from '../ui/Button.js';

export const OnboardingModal: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const showHowToPlay = useGameStore((state) => state.showHowToPlay);
  const setShowHowToPlay = useGameStore((state) => state.setShowHowToPlay);

  if (!showHowToPlay) return null;

  const slides = [
    {
      title: 'WELCOME TO ECHOES OF CHAOS',
      subtitle: 'Trust your instincts. Decode the chaos. Survive the round.',
      content: (
        <div className="space-y-4 text-sm text-gray-300 font-light leading-relaxed">
          <p>
            <strong className="text-white">Echoes of Chaos</strong> is a real-time multiplayer
            social deduction game played directly in the browser across multiple devices.
          </p>
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-200">
            ✦ <strong>Game Goal:</strong> Every round, a secret 4-symbol sequence is generated.
            Your team must combine private clues to deduce the exact sequence before time runs out.
          </div>
          <p>
            Supports <strong>2 to 8 players</strong>. In matches with 2–3 players, the game operates
            in pure cooperative mode. In matches with 4–8 players, a secret <strong>Disruptor</strong>
            infiltrates the team!
          </p>
        </div>
      ),
    },
    {
      title: 'THE 5 CLUE TYPES',
      subtitle: 'Every player receives private pieces of the truth',
      content: (
        <div className="space-y-3 text-xs sm:text-sm text-gray-300">
          <div className="p-2.5 rounded-xl border border-cyan-500/30 bg-midnight">
            <span className="badge-cyan mr-2">🎯 EXACT POSITION</span>
            <span>Tells you the exact symbol at a specific position (e.g. "Position 2 is Diamond").</span>
          </div>
          <div className="p-2.5 rounded-xl border border-pink-500/30 bg-midnight">
            <span className="badge-purple mr-2">🚫 EXCLUSION</span>
            <span>Rules out a symbol from a position (e.g. "Position 1 is NOT Circle").</span>
          </div>
          <div className="p-2.5 rounded-xl border border-purple-500/30 bg-midnight">
            <span className="badge-purple mr-2">⚖️ PARITY</span>
            <span>Reveals whether the symbol is even or odd (e.g. "Position 3 is an EVEN symbol").</span>
          </div>
          <div className="p-2.5 rounded-xl border border-orange-500/30 bg-midnight">
            <span className="badge-orange mr-2">➕ ARITHMETIC</span>
            <span>Gives the mathematical sum of two positions (e.g. "Pos 1 + Pos 4 = 7").</span>
          </div>
          <div className="p-2.5 rounded-xl border border-lime-500/30 bg-midnight">
            <span className="badge-cyan mr-2">🔢 FREQUENCY</span>
            <span>Discloses how many times a symbol appears (e.g. "Hexagon appears 1 time").</span>
          </div>
        </div>
      ),
    },
    {
      title: 'THE DISRUPTOR & DECEPTION',
      subtitle: 'Only in 4–8 Player Matches',
      content: (
        <div className="space-y-4 text-sm text-gray-300 font-light leading-relaxed">
          <p>
            When playing with 4 or more players, one player is secretly chosen as the{' '}
            <strong className="text-neon-orange">Disruptor</strong>.
          </p>
          <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-950/20 text-orange-200 text-xs">
            ⚠️ <strong>How to detect the Disruptor:</strong> The Disruptor receives 1 truthful clue
            plus 1 <em>misleading</em> clue. The truthful clues held by innocent players always
            mathematically guarantee a unique solution. A false clue will create a direct contradiction!
          </div>
          <p>
            After submission, all players vote on who they believe the Disruptor is:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-400">
            <li>Correctly identifying the Disruptor: <strong className="text-green-400">+200 pts</strong></li>
            <li>Accusing an innocent teammate: <strong className="text-red-400">-100 pts</strong></li>
            <li>Disruptor avoids detection: <strong className="text-orange-400">+200 pts to Disruptor</strong></li>
          </ul>
        </div>
      ),
    },
    {
      title: 'SUBMISSION: PROPOSE → CONFIRM → LOCK',
      subtitle: 'Unified team decision-making',
      content: (
        <div className="space-y-4 text-sm text-gray-300 font-light leading-relaxed">
          <p>
            During the <strong>Submission Phase (15s)</strong>:
          </p>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-midnight border border-white/10 flex items-center gap-3">
              <span className="font-display font-bold text-neon-cyan text-sm">1</span>
              <span>Any player can tap <strong>Propose Answer</strong> and pick 4 symbols.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-midnight border border-white/10 flex items-center gap-3">
              <span className="font-display font-bold text-neon-purple text-sm">2</span>
              <span>Teammates review the proposal and tap <strong>Confirm</strong>.</span>
            </div>
            <div className="p-2.5 rounded-xl bg-midnight border border-white/10 flex items-center gap-3">
              <span className="font-display font-bold text-green-400 text-sm">3</span>
              <span>Once a majority confirms, the answer <strong>locks instantly</strong>!</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 italic">
            Note: Proposals have a 3s cooldown and are disabled in the final 3 seconds to prevent race conditions.
          </p>
        </div>
      ),
    },
  ];

  const current = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card max-w-lg w-full p-6 sm:p-8 rounded-3xl border border-cyan-500/40 bg-midnight-light/95 shadow-2xl animate-scale-in relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="badge-purple font-display text-[10px]">
              TUTORIAL {currentSlide + 1} / {slides.length}
            </span>
          </div>
          <button
            onClick={() => setShowHowToPlay(false)}
            className="text-gray-400 hover:text-white p-1 text-sm font-display"
          >
            ✕
          </button>
        </div>

        {/* Slide Title */}
        <h2 className="font-display text-xl sm:text-2xl font-bold text-gradient-main mb-1">
          {current.title}
        </h2>
        <p className="text-xs font-display text-gray-400 tracking-wider mb-5">
          {current.subtitle}
        </p>

        {/* Slide Content */}
        <div className="min-h-[220px] mb-6">{current.content}</div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'w-6 bg-neon-cyan' : 'w-1.5 bg-white/20'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentSlide > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentSlide(currentSlide - 1)}
              >
                Back
              </Button>
            )}
            {currentSlide < slides.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentSlide(currentSlide + 1)}
              >
                Next →
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowHowToPlay(false)}
              >
                Got It!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
