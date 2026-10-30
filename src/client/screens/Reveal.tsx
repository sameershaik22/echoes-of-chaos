import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { SYMBOL_DISPLAY } from '../../shared/constants.js';
import { AvatarBadge } from '../components/ui/AvatarBadge.js';
import { Timer } from '../components/ui/Timer.js';

export const Reveal: React.FC = () => {
  const roundResults = useGameStore((state) => state.roundResults);
  const round = useGameStore((state) => state.round);
  const players = useGameStore((state) => state.players);
  const isCooperativeMode = useGameStore((state) => state.isCooperativeMode);

  // Latest round result
  const latestResult = roundResults.length > 0 ? roundResults[roundResults.length - 1] : null;

  if (!latestResult) {
    return (
      <div className="min-h-screen bg-midnight font-body text-white flex items-center justify-center">
        <div className="text-gray-400 font-display">Tallying round results...</div>
      </div>
    );
  }

  const disruptorPlayer = latestResult.disruptorId
    ? players.find((p) => p.id === latestResult.disruptorId)
    : null;

  return (
    <div className="min-h-screen bg-midnight font-body text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
          <div>
            <span className="badge-purple text-[10px] uppercase mb-1">
              ROUND {latestResult.round} / 3 COMPLETED
            </span>
            <h2
              className={`font-display text-2xl sm:text-3xl font-extrabold ${
                latestResult.wasCorrect ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {latestResult.wasCorrect
                ? 'DECRYPTION SUCCESSFUL ✦'
                : 'DECRYPTION FAILED ✖'}
            </h2>
          </div>

          <Timer label="NEXT PHASE IN" />
        </div>

        {/* Secret Combination Reveal */}
        <div className="mb-6 text-center">
          <span className="text-xs font-display text-gray-400 tracking-wider uppercase block mb-3">
            SECRET COMBINATION REVEALED
          </span>
          <div className="flex justify-center gap-3 sm:gap-4">
            {latestResult.secretCombination.map((sym, idx) => {
              const display = SYMBOL_DISPLAY[sym];
              return (
                <div
                  key={idx}
                  className="w-16 sm:w-20 h-20 sm:h-24 rounded-2xl border-2 border-neon-cyan/60 bg-cyan-950/40 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/20 animate-scale-in"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <span className="text-[10px] font-display text-gray-400">P{idx + 1}</span>
                  <span className="text-2xl sm:text-3xl font-bold my-1" style={{ color: display?.color }}>
                    {display?.icon}
                  </span>
                  <span className="text-[10px] font-display font-semibold text-gray-300">
                    {display?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Answer Comparison */}
        <div className="mb-6 p-4 rounded-2xl bg-midnight-light/40 border border-white/5 flex items-center justify-between">
          <span className="text-xs font-display text-gray-400 uppercase">
            Team Submitted Answer:
          </span>
          <div className="flex items-center gap-2">
            {latestResult.submittedAnswer ? (
              latestResult.submittedAnswer.map((sym, i) => (
                <span
                  key={i}
                  className="text-base font-bold"
                  style={{ color: SYMBOL_DISPLAY[sym]?.color }}
                >
                  {SYMBOL_DISPLAY[sym]?.icon}
                </span>
              ))
            ) : (
              <span className="text-xs font-display text-red-400">No Answer Submitted (0 pts)</span>
            )}
          </div>
        </div>

        {/* Disruptor Reveal (Competitive Mode) */}
        {!isCooperativeMode && disruptorPlayer && (
          <div className="mb-6 p-4 rounded-2xl border border-orange-500/40 bg-orange-950/20">
            <span className="text-[10px] font-display text-orange-400 uppercase tracking-widest block mb-2">
              DISRUPTOR REVEAL
            </span>
            <div className="flex items-center gap-3">
              <AvatarBadge avatar={disruptorPlayer.avatar} size="md" />
              <div>
                <span className="text-base font-display font-bold text-white">
                  {disruptorPlayer.name}
                </span>
                <span className="text-xs text-orange-300 block font-light">
                  Was secretly assigned to mislead the team with contradicting clues.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Round Score Changes */}
        <div>
          <span className="text-xs font-display text-gray-400 uppercase tracking-wider block mb-2">
            ROUND SCORE UPDATES
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {players.map((p) => {
              const delta = latestResult.scoreChanges[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl border border-white/5 bg-midnight-light/60 flex items-center justify-between text-xs font-display"
                >
                  <span className="text-gray-300 truncate max-w-[70px]">{p.name}</span>
                  <span
                    className={`font-bold ${
                      delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-500'
                    }`}
                  >
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
