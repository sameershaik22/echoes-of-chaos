import React, { useState } from 'react';
import { Avatar } from '../../shared/types.js';
import { AVATAR_CONFIG } from '../../shared/constants.js';
import { useSocket } from '../hooks/useSocket.js';
import { useGameStore } from '../store/gameStore.js';
import { AvatarBadge } from '../components/ui/AvatarBadge.js';
import { Button } from '../components/ui/Button.js';

function ParticleField() {
  const [particles] = useState(() =>
    Array.from({ length: 45 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      duration: Math.random() * 18 + 12,
      delay: Math.random() * 8,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            opacity: p.opacity,
            background:
              p.id % 3 === 0 ? '#a855f7' : p.id % 3 === 1 ? '#22d3ee' : '#fb923c',
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
            filter: `blur(${p.size > 2 ? 1 : 0}px)`,
          }}
        />
      ))}
    </div>
  );
}

function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 animate-glow-pulse-slow"
        style={{
          background: 'radial-gradient(circle, rgba(168,85,247,0.3) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15 animate-glow-pulse-slow"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.25) 0%, transparent 70%)',
          bottom: '-5%',
          right: '-5%',
          animationDelay: '2s',
        }}
      />
    </div>
  );
}

export const Landing: React.FC = () => {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar>(Avatar.CYBER_WOLF);

  const { createRoom, joinRoom } = useSocket();
  const setShowHowToPlay = useGameStore((state) => state.setShowHowToPlay);
  const toggleMute = useGameStore((state) => state.toggleMute);
  const isMuted = useGameStore((state) => state.isMuted);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    createRoom(playerName.trim(), selectedAvatar);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || roomCode.length !== 6) return;
    joinRoom(roomCode.trim().toUpperCase(), playerName.trim(), selectedAvatar);
  };

  return (
    <div className="min-h-screen bg-midnight font-body text-white flex flex-col items-center justify-center relative overflow-hidden px-4">
      <BackgroundOrbs />
      <ParticleField />
      <div className="absolute inset-0 bg-grid opacity-50" />

      {/* Top Bar Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <button
          onClick={toggleMute}
          className="p-2.5 rounded-xl border border-white/10 bg-midnight-light/60 hover:border-white/30 text-xs font-display flex items-center gap-1.5 transition-all"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          <span>{isMuted ? '🔇' : '🔊'}</span>
          <span className="hidden sm:inline text-gray-400">{isMuted ? 'MUTED' : 'SOUND'}</span>
        </button>
        <button
          onClick={() => setShowHowToPlay(true)}
          className="btn-ghost py-2 px-3 text-xs"
        >
          ? HOW TO PLAY
        </button>
      </div>

      {/* Main Container */}
      <div className="relative z-10 text-center max-w-xl mx-auto w-full py-12">
        {/* Title */}
        <div className="animate-fade-in-up mb-8">
          <h1 className="font-display text-5xl sm:text-7xl font-extrabold mb-3 text-gradient-main tracking-tight leading-none animate-shimmer bg-[length:200%_100%]">
            ECHOES OF
            <br />
            CHAOS
          </h1>
          <div className="h-px w-36 mx-auto bg-gradient-to-r from-transparent via-neon-cyan to-transparent mb-3" />
          <p className="text-sm sm:text-base text-gray-300 font-light tracking-[0.2em] uppercase">
            Trust your instincts. Decode the chaos.
          </p>
          <p className="text-xs text-gray-500 font-display tracking-wider mt-1">
            2–8 Players · Real-Time Multiplayer · No Install Required
          </p>
        </div>

        {/* Dynamic Panels */}
        {mode === 'menu' && (
          <div className="animate-fade-in-up space-y-4 max-w-sm mx-auto">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setMode('create')}
            >
              ✦ Create Room
            </Button>
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => setMode('join')}
            >
              → Join With Code
            </Button>
          </div>
        )}

        {(mode === 'create' || mode === 'join') && (
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-2xl animate-scale-in max-w-md mx-auto text-left">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg font-bold text-white tracking-wider uppercase">
                {mode === 'create' ? 'CREATE NEW ROOM' : 'JOIN EXISTING ROOM'}
              </h2>
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="text-xs text-gray-400 hover:text-white font-display"
              >
                ← Back
              </button>
            </div>

            <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="space-y-4">
              {/* Room code input for join */}
              {mode === 'join' && (
                <div>
                  <label className="text-xs font-display text-gray-400 uppercase tracking-wider block mb-1.5">
                    Room Code (6 Characters)
                  </label>
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    placeholder="e.g. 7X9K2B"
                    maxLength={6}
                    required
                    className="input-field font-display tracking-[0.3em] text-center uppercase text-base"
                  />
                </div>
              )}

              {/* Player Name */}
              <div>
                <label className="text-xs font-display text-gray-400 uppercase tracking-wider block mb-1.5">
                  Your Nickname
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  required
                  className="input-field text-sm"
                />
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="text-xs font-display text-gray-400 uppercase tracking-wider block mb-2">
                  Choose Your Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {Object.values(Avatar).map((av) => {
                    const isSelected = selectedAvatar === av;
                    return (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setSelectedAvatar(av)}
                        className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          isSelected
                            ? 'border-neon-cyan bg-cyan-950/40 shadow-md shadow-cyan-500/20 scale-105'
                            : 'border-white/10 bg-midnight/60 hover:border-white/30'
                        }`}
                      >
                        <AvatarBadge avatar={av} size="sm" />
                        <span className="text-[9px] font-display text-gray-400 mt-1 truncate max-w-full">
                          {AVATAR_CONFIG[av].label.split(' ')[1]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={!playerName.trim() || (mode === 'join' && roomCode.length !== 6)}
                className="mt-6"
              >
                {mode === 'create' ? 'Launch Room →' : 'Enter Match →'}
              </Button>
            </form>
          </div>
        )}

        {/* Feature Highlights */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-12 animate-fade-in">
          <span className="badge-purple">Deterministic CSP Solver</span>
          <span className="badge-cyan">Synthesized Web Audio</span>
          <span className="badge-orange">Real-Time WebSocket Sync</span>
        </div>
      </div>

      <div className="absolute bottom-4 text-gray-700 text-xs font-display tracking-widest">
        ECHOES OF CHAOS · PRODUCTION v1.0
      </div>
    </div>
  );
};
