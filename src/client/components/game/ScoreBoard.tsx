import React from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { AvatarBadge } from '../ui/AvatarBadge.js';
import { GamePhase } from '../../../shared/types.js';

export const ScoreBoard: React.FC = () => {
  const players = useGameStore((state) => state.players);
  const playerId = useGameStore((state) => state.playerId);
  const phase = useGameStore((state) => state.phase);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="glass-card p-4 rounded-2xl border border-white/10 shadow-2xl">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <span className="text-xs font-display font-bold tracking-wider text-neon-purple flex items-center gap-1.5">
          <span>🏆</span> PLAYERS & SCORES
        </span>
        <span className="text-[10px] text-gray-500 font-display">
          {players.length} players
        </span>
      </div>

      <div className="space-y-2">
        {sortedPlayers.map((p, idx) => {
          const isMe = p.id === playerId;
          return (
            <div
              key={p.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                isMe
                  ? 'border-cyan-500/40 bg-cyan-950/20'
                  : 'border-white/5 bg-midnight-light/40'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-display text-gray-500 w-3">
                  #{idx + 1}
                </span>
                <AvatarBadge avatar={p.avatar} size="sm" />
                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-display font-semibold text-white truncate">
                      {p.name}
                    </span>
                    {isMe && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-display">
                        YOU
                      </span>
                    )}
                    {p.isHost && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-300 font-display">
                        HOST
                      </span>
                    )}
                  </div>
                  {!p.isConnected && (
                    <span className="text-[9px] text-red-400 font-display block">
                      Disconnected
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-display font-bold text-neon-cyan">
                  {p.score} pts
                </span>
                {phase === GamePhase.WAITING && (
                  <span
                    className={`text-[9px] font-display block ${
                      p.isReady ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    {p.isReady ? 'READY' : 'WAITING'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
