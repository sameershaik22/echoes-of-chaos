import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { AvatarBadge } from '../components/ui/AvatarBadge.js';
import { Button } from '../components/ui/Button.js';

export const GameOver: React.FC = () => {
  const finalRankings = useGameStore((state) => state.finalRankings);
  const players = useGameStore((state) => state.players);
  const playerId = useGameStore((state) => state.playerId);
  const hostId = useGameStore((state) => state.hostId);
  const isCooperativeMode = useGameStore((state) => state.isCooperativeMode);

  const { playAgain, leaveRoom } = useSocket();
  const isHost = playerId === hostId;

  // Fallback to sorted players if rankings not populated
  const displayRankings =
    finalRankings ||
    [...players]
      .sort((a, b) => b.score - a.score)
      .map((p, idx) => ({ ...p, rank: idx + 1, correctIdentifications: 0 }));

  const topThree = displayRankings.slice(0, 3);

  return (
    <div className="min-h-screen bg-midnight font-body text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full glass-card p-6 sm:p-8 rounded-3xl border border-neon-cyan/40 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="text-center pb-6 border-b border-white/10 mb-6">
          <span className="badge-cyan text-xs font-display tracking-widest uppercase mb-2">
            MISSION ACCOMPLISHED
          </span>
          <h1 className="font-display text-4xl sm:text-5xl font-extrabold text-gradient-main tracking-tight mb-2">
            FINAL STANDINGS
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-light">
            All 3 rounds concluded. Ranks evaluated by Score & Disruptor Deductions.
          </p>
        </div>

        {/* Podium for Top 3 */}
        <div className="flex justify-center items-end gap-3 sm:gap-6 mb-8 pt-4">
          {/* 2nd Place */}
          {topThree[1] && (
            <div className="flex flex-col items-center">
              <AvatarBadge avatar={topThree[1].avatar} size="md" />
              <span className="text-xs font-display font-bold text-white mt-1.5 truncate max-w-[90px]">
                {topThree[1].name}
              </span>
              <span className="text-[10px] text-gray-400 font-display">
                {topThree[1].score} pts
              </span>
              <div className="w-20 sm:w-24 h-20 bg-gradient-to-t from-gray-700/60 to-gray-500/40 rounded-t-2xl border-t-2 border-gray-400 flex items-center justify-center font-display font-extrabold text-2xl text-gray-300 mt-2">
                2
              </div>
            </div>
          )}

          {/* 1st Place */}
          {topThree[0] && (
            <div className="flex flex-col items-center -mt-4">
              <span className="text-2xl animate-bounce">👑</span>
              <AvatarBadge avatar={topThree[0].avatar} size="lg" />
              <span className="text-sm font-display font-bold text-neon-cyan mt-1.5 truncate max-w-[110px]">
                {topThree[0].name}
              </span>
              <span className="text-xs text-neon-purple font-display font-bold">
                {topThree[0].score} pts
              </span>
              <div className="w-24 sm:w-28 h-28 bg-gradient-to-t from-yellow-700/60 to-yellow-500/40 rounded-t-2xl border-t-2 border-yellow-400 flex items-center justify-center font-display font-extrabold text-3xl text-yellow-300 shadow-lg shadow-yellow-500/20 mt-2">
                1
              </div>
            </div>
          )}

          {/* 3rd Place */}
          {topThree[2] && (
            <div className="flex flex-col items-center">
              <AvatarBadge avatar={topThree[2].avatar} size="md" />
              <span className="text-xs font-display font-bold text-white mt-1.5 truncate max-w-[90px]">
                {topThree[2].name}
              </span>
              <span className="text-[10px] text-gray-400 font-display">
                {topThree[2].score} pts
              </span>
              <div className="w-20 sm:w-24 h-14 bg-gradient-to-t from-orange-800/60 to-orange-600/40 rounded-t-2xl border-t-2 border-orange-500 flex items-center justify-center font-display font-extrabold text-xl text-orange-300 mt-2">
                3
              </div>
            </div>
          )}
        </div>

        {/* Detailed Standings Table */}
        <div className="mb-8">
          <span className="text-xs font-display text-gray-400 uppercase tracking-wider block mb-2">
            LEADERBOARD SUMMARY
          </span>
          <div className="glass-card rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {displayRankings.map((p) => {
              const isMe = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`p-3 sm:p-4 flex items-center justify-between transition-all ${
                    isMe ? 'bg-cyan-950/20' : 'bg-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-sm w-6 text-gray-400">
                      #{p.rank}
                    </span>
                    <AvatarBadge avatar={p.avatar} size="sm" />
                    <div>
                      <span className="text-xs sm:text-sm font-display font-bold text-white block">
                        {p.name} {isMe && '(You)'}
                      </span>
                      {!isCooperativeMode && (
                        <span className="text-[10px] text-gray-400 font-display">
                          {p.correctIdentifications} correct accusation(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-display font-bold text-neon-cyan">
                      {p.score} PTS
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={leaveRoom}
            className="w-full sm:w-auto text-xs"
          >
            ← Exit to Menu
          </Button>

          <Button
            variant="primary"
            fullWidth
            onClick={playAgain}
            className="flex-1"
          >
            Play Rematch ✦
          </Button>
        </div>
      </div>
    </div>
  );
};
