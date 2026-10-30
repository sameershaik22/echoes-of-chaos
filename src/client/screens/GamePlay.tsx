import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore.js';
import { GamePhase, PlayerRole } from '../../shared/types.js';
import { ClueCard } from '../components/game/ClueCard.js';
import { SubmissionPanel } from '../components/game/SubmissionPanel.js';
import { ChatPanel } from '../components/game/ChatPanel.js';
import { ScoreBoard } from '../components/game/ScoreBoard.js';
import { Timer } from '../components/ui/Timer.js';

export const GamePlay: React.FC = () => {
  const [mobileTab, setMobileTab] = useState<'game' | 'chat' | 'scores'>('game');

  const phase = useGameStore((state) => state.phase);
  const round = useGameStore((state) => state.round);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const role = useGameStore((state) => state.role);
  const clues = useGameStore((state) => state.clues);
  const isCooperativeMode = useGameStore((state) => state.isCooperativeMode);
  const toggleMute = useGameStore((state) => state.toggleMute);
  const isMuted = useGameStore((state) => state.isMuted);

  const phaseLabel = {
    [GamePhase.CLUE_PHASE]: 'CLUE ANALYSIS',
    [GamePhase.DISCUSSION]: 'TEAM DISCUSSION',
    [GamePhase.SUBMISSION]: 'ANSWER SUBMISSION',
    [GamePhase.WAITING]: 'PREPARING',
    [GamePhase.VOTING]: 'VOTING',
    [GamePhase.REVEAL]: 'REVEAL',
    [GamePhase.GAME_OVER]: 'GAME OVER',
  }[phase] || 'MATCH IN PROGRESS';

  const isDisruptor = role === PlayerRole.DISRUPTOR;

  return (
    <div className="min-h-screen bg-midnight font-body text-white flex flex-col p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 glass-card p-4 sm:p-5 rounded-2xl border border-white/10 shadow-xl mb-4 sm:mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="badge-purple font-display text-xs">
            ROUND {round} / {totalRounds}
          </span>
          <span className="badge-cyan font-display text-xs">
            {phaseLabel}
          </span>
          {isCooperativeMode && (
            <span className="badge-orange font-display text-xs hidden sm:inline">
              COOPERATIVE
            </span>
          )}
        </div>

        <Timer label="PHASE TIMER" />

        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl border border-white/10 bg-midnight-light/60 hover:border-white/30 text-xs font-display flex items-center gap-1"
          >
            <span>{isMuted ? '🔇' : '🔊'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden gap-2 mb-4 relative z-10">
        <button
          onClick={() => setMobileTab('game')}
          className={`flex-1 py-2 text-xs font-display rounded-xl border transition-all ${
            mobileTab === 'game' ? 'border-neon-cyan bg-cyan-950/40 text-cyan-300' : 'border-white/5 bg-midnight-light/40 text-gray-400'
          }`}
        >
          🧩 Game & Clues
        </button>
        <button
          onClick={() => setMobileTab('chat')}
          className={`flex-1 py-2 text-xs font-display rounded-xl border transition-all ${
            mobileTab === 'chat' ? 'border-neon-cyan bg-cyan-950/40 text-cyan-300' : 'border-white/5 bg-midnight-light/40 text-gray-400'
          }`}
        >
          💬 Chat
        </button>
        <button
          onClick={() => setMobileTab('scores')}
          className={`flex-1 py-2 text-xs font-display rounded-xl border transition-all ${
            mobileTab === 'scores' ? 'border-neon-cyan bg-cyan-950/40 text-cyan-300' : 'border-white/5 bg-midnight-light/40 text-gray-400'
          }`}
        >
          🏆 Scores
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 flex-1 items-start">
        {/* Left / Center Section: Clues & Submission */}
        <div className={`lg:col-span-8 space-y-4 sm:space-y-6 ${mobileTab !== 'game' ? 'hidden sm:block' : ''}`}>
          {/* Secret Role Alert */}
          {!isCooperativeMode && role && (
            <div
              className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between ${
                isDisruptor
                  ? 'border-orange-500/60 bg-orange-950/40 text-orange-200 shadow-lg shadow-orange-500/10'
                  : 'border-cyan-500/40 bg-cyan-950/20 text-cyan-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{isDisruptor ? '🕵️' : '🛡️'}</span>
                <div>
                  <span className="text-xs font-display font-bold uppercase tracking-wider block">
                    {isDisruptor ? 'CONFIDENTIAL: YOU ARE THE DISRUPTOR' : 'CONFIDENTIAL: INNOCENT AGENT'}
                  </span>
                  <span className="text-xs font-light text-gray-300">
                    {isDisruptor
                      ? 'One of your clues is FALSE! Blend in, steer the team subtly, and avoid getting voted out.'
                      : 'All of your clues are truthful. Share observations to decode the sequence!'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submission Panel (Active during SUBMISSION phase) */}
          {phase === GamePhase.SUBMISSION && <SubmissionPanel />}

          {/* Discussion Advice Banner */}
          {phase === GamePhase.DISCUSSION && (
            <div className="p-4 rounded-2xl bg-midnight-light/60 border border-white/5 flex items-center gap-3 text-xs text-gray-300 font-light">
              <span className="text-xl">🗣️</span>
              <span>
                <strong>Discussion Active:</strong> Share your clue details in chat or voice. Look for
                contradictions between clues that pinpoint the secret Disruptor!
              </span>
            </div>
          )}

          {/* Clues Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-display text-gray-400 uppercase tracking-wider">
                YOUR PRIVATE INTEL ({clues.length} {clues.length === 1 ? 'CLUE' : 'CLUES'})
              </span>
              <span className="text-[10px] text-gray-500 font-display">
                Only visible to you
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {clues.map((clue, idx) => (
                <ClueCard key={clue.id || idx} clue={clue} index={idx} />
              ))}
            </div>
          </div>
        </div>

        {/* Right Section: Team Chat & Scores */}
        <div className={`lg:col-span-4 space-y-4 ${mobileTab === 'game' ? 'hidden sm:block' : ''}`}>
          <div className={mobileTab === 'scores' ? 'block' : mobileTab === 'chat' ? 'hidden sm:block' : 'block'}>
            <ScoreBoard />
          </div>
          <div className={mobileTab === 'scores' ? 'hidden sm:block' : 'block'}>
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
};
