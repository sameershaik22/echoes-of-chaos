import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { AvatarBadge } from '../components/ui/AvatarBadge.js';
import { Timer } from '../components/ui/Timer.js';
import { Button } from '../components/ui/Button.js';

export const Voting: React.FC = () => {
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  const players = useGameStore((state) => state.players);
  const playerId = useGameStore((state) => state.playerId);
  const votesCount = useGameStore((state) => state.votesCount);
  const votesNeeded = useGameStore((state) => state.votesNeeded);
  const round = useGameStore((state) => state.round);

  const { castVote } = useSocket();

  const handleCastVote = () => {
    if (selectedSuspectId && !hasVoted) {
      castVote(selectedSuspectId);
      setHasVoted(true);
    }
  };

  const suspects = players.filter((p) => p.id !== playerId && p.isConnected);
  const votedSuspect = players.find((p) => p.id === selectedSuspectId);

  return (
    <div className="min-h-screen bg-midnight font-body text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-2xl w-full glass-card p-6 sm:p-8 rounded-3xl border border-orange-500/30 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge-orange text-[10px]">ROUND {round} / 3</span>
              <span className="badge-purple text-[10px]">VOTING PHASE</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-gradient-main">
              ACCUSATION: SPOT THE DISRUPTOR
            </h2>
            <p className="text-xs text-gray-400 mt-1 font-light">
              One of your teammates received false clues. Identify the saboteur!
            </p>
          </div>

          <Timer label="VOTING CLOSES IN" />
        </div>

        {/* Voting Status / Guidance */}
        <div className="mb-6 p-4 rounded-2xl bg-orange-950/20 border border-orange-500/30 flex items-center justify-between">
          <div className="text-xs text-orange-200">
            {hasVoted ? (
              <span>
                ✓ <strong>Vote submitted:</strong> You accused{' '}
                <strong className="text-white">{votedSuspect?.name}</strong>. Waiting for final tallies...
              </span>
            ) : (
              <span>
                Select a teammate whom you suspect provided contradicting clues.
              </span>
            )}
          </div>
          <div className="text-xs font-display text-gray-300 ml-4 whitespace-nowrap">
            {votesCount} / {votesNeeded} votes cast
          </div>
        </div>

        {/* Suspect Roster */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {suspects.map((p) => {
            const isSelected = selectedSuspectId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                disabled={hasVoted}
                onClick={() => setSelectedSuspectId(p.id)}
                className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                  isSelected
                    ? 'border-neon-orange bg-orange-950/40 shadow-lg shadow-orange-500/20 scale-[1.02]'
                    : 'border-white/10 bg-midnight-light/40 hover:border-white/30'
                } ${hasVoted ? 'cursor-default opacity-80' : 'hover:scale-[1.01]'}`}
              >
                <div className="flex items-center gap-3">
                  <AvatarBadge avatar={p.avatar} size="md" />
                  <div>
                    <span className="text-sm font-display font-bold text-white block">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-gray-400 font-display">
                      Score: {p.score} pts
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  {isSelected ? (
                    <span className="text-xs font-display font-bold text-neon-orange">
                      SUSPECT 🎯
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 font-display">
                      Select
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Submit Vote Button */}
        {!hasVoted && (
          <Button
            variant="danger"
            size="lg"
            fullWidth
            disabled={!selectedSuspectId}
            onClick={handleCastVote}
          >
            {selectedSuspectId
              ? `Confirm Accusation on ${votedSuspect?.name} 🎯`
              : 'Select a Suspect to Accuse'}
          </Button>
        )}
      </div>
    </div>
  );
};
