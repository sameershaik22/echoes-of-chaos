import React from 'react';
import { useGameStore } from '../store/gameStore.js';
import { useSocket } from '../hooks/useSocket.js';
import { Difficulty } from '../../shared/types.js';
import { DIFFICULTY_SETTINGS, MIN_PLAYERS } from '../../shared/constants.js';
import { AvatarBadge } from '../components/ui/AvatarBadge.js';
import { Button } from '../components/ui/Button.js';

export const Lobby: React.FC = () => {
  const roomCode = useGameStore((state) => state.roomCode);
  const hostId = useGameStore((state) => state.hostId);
  const players = useGameStore((state) => state.players);
  const playerId = useGameStore((state) => state.playerId);
  const difficulty = useGameStore((state) => state.difficulty);
  const addToast = useGameStore((state) => state.addToast);

  const { setPlayerReady, setDifficulty, startGame, leaveRoom } = useSocket();

  const isHost = playerId === hostId;
  const myPlayer = players.find((p) => p.id === playerId);
  const isReady = myPlayer?.isReady || false;

  const connectedPlayers = players.filter((p) => p.isConnected);
  const canStart =
    isHost &&
    connectedPlayers.length >= MIN_PLAYERS &&
    connectedPlayers.every((p) => p.isHost || p.isReady);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      addToast('Room code copied to clipboard!', 'success');
    }
  };

  const handleCopyLink = () => {
    if (roomCode && typeof window !== 'undefined') {
      const url = `${window.location.origin}?code=${roomCode}`;
      navigator.clipboard.writeText(url);
      addToast('Room invite link copied!', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-midnight font-body text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-40 pointer-events-none" />

      {/* Main Card */}
      <div className="relative z-10 max-w-2xl w-full glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl animate-fade-in-up">
        {/* Header & Room Code */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <span className="text-[10px] font-display text-gray-400 tracking-[0.2em] uppercase block mb-1">
              MULTIPLAYER LOBBY
            </span>
            <div className="flex items-center gap-3">
              <span className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-[0.25em]">
                {roomCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="btn-ghost py-1.5 px-3 text-xs"
                title="Copy Room Code"
              >
                📋 Copy
              </button>
              <button
                onClick={handleCopyLink}
                className="btn-ghost py-1.5 px-3 text-xs hidden sm:inline"
                title="Copy Invite Link"
              >
                🔗 Share Link
              </button>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-display text-gray-400 block">PLAYERS</span>
            <span className="text-2xl font-display font-bold text-neon-cyan">
              {connectedPlayers.length} / 8
            </span>
          </div>
        </div>

        {/* Mode Banner */}
        <div className="my-5 p-3.5 rounded-2xl border border-white/5 bg-midnight-light/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {connectedPlayers.length < 4 ? '🤝' : '🕵️'}
            </span>
            <div>
              <span className="text-xs font-display font-bold text-white tracking-wider block">
                {connectedPlayers.length < 4
                  ? 'COOPERATIVE MODE (2–3 PLAYERS)'
                  : 'DISRUPTOR SOCIAL DEDUCTION (4–8 PLAYERS)'}
              </span>
              <span className="text-xs text-gray-400 font-light">
                {connectedPlayers.length < 4
                  ? 'Pure deduction. All clues are truthful. Solve together!'
                  : '1 player is secretly the Disruptor receiving false clues!'}
              </span>
            </div>
          </div>
        </div>

        {/* Difficulty Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-display text-gray-400 uppercase tracking-wider">
              PUZZLE DIFFICULTY {isHost ? '(Host Choice)' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {Object.values(Difficulty).map((diff) => {
              const cfg = DIFFICULTY_SETTINGS[diff];
              const isSelected = difficulty === diff;

              return (
                <button
                  key={diff}
                  type="button"
                  disabled={!isHost}
                  onClick={() => setDifficulty(diff)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-neon-cyan bg-cyan-950/30 shadow-md shadow-cyan-500/20'
                      : 'border-white/5 bg-midnight/50 opacity-70 hover:opacity-100'
                  } ${!isHost ? 'cursor-default' : 'hover:scale-[1.02]'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-display font-bold text-white uppercase tracking-wider">
                      {cfg.label}
                    </span>
                    {isSelected && <span className="text-neon-cyan text-xs">✓</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 font-light leading-snug">
                    {cfg.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player Roster */}
        <div className="mb-8">
          <span className="text-xs font-display text-gray-400 uppercase tracking-wider block mb-3">
            CONNECTED AGENTS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {players.map((p) => {
              const isCurrent = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between ${
                    isCurrent
                      ? 'border-cyan-500/40 bg-cyan-950/20'
                      : 'border-white/5 bg-midnight-light/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <AvatarBadge avatar={p.avatar} size="md" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-display font-bold text-white">
                          {p.name}
                        </span>
                        {isCurrent && (
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
                      <span className="text-[10px] text-gray-500 font-display">
                        {p.isConnected ? 'Connected' : 'Reconnecting...'}
                      </span>
                    </div>
                  </div>

                  <div>
                    {p.isHost ? (
                      <span className="badge-orange text-[10px]">HOST</span>
                    ) : (
                      <span
                        className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-full border ${
                          p.isReady
                            ? 'border-green-500/50 bg-green-500/10 text-green-300'
                            : 'border-gray-600 bg-gray-800 text-gray-400'
                        }`}
                      >
                        {p.isReady ? 'READY ✓' : 'NOT READY'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls / Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={leaveRoom}
            className="w-full sm:w-auto text-xs"
          >
            ← Leave Room
          </Button>

          <div className="flex-1 w-full flex gap-3">
            {!isHost && (
              <Button
                variant={isReady ? 'ghost' : 'secondary'}
                fullWidth
                onClick={setPlayerReady}
              >
                {isReady ? 'Cancel Ready' : 'Ready Up ✓'}
              </Button>
            )}

            {isHost && (
              <Button
                variant="primary"
                fullWidth
                disabled={!canStart}
                onClick={startGame}
              >
                {connectedPlayers.length < MIN_PLAYERS
                  ? `Need ${MIN_PLAYERS - connectedPlayers.length} More Player(s)`
                  : !canStart
                  ? 'Waiting for Players to Ready Up...'
                  : 'Start Match ✦'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
