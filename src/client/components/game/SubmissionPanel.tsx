import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSocket } from '../../hooks/useSocket.js';
import { SYMBOL_DISPLAY } from '../../../shared/constants.js';
import { SymbolPicker } from './SymbolPicker.js';
import { Button } from '../ui/Button.js';

export const SubmissionPanel: React.FC = () => {
  const [showPicker, setShowPicker] = useState(false);
  const { proposeAnswer, confirmProposal } = useSocket();

  const playerId = useGameStore((state) => state.playerId);
  const currentProposal = useGameStore((state) => state.currentProposal);
  const lockedAnswer = useGameStore((state) => state.lockedAnswer);
  const phaseEndsAt = useGameStore((state) => state.phaseEndsAt);
  const clockOffset = useGameStore((state) => state.clockOffset);
  const players = useGameStore((state) => state.players);

  const connectedCount = players.filter((p) => p.isConnected).length;
  const neededConfirms = Math.floor(connectedCount / 2) + 1;

  // Check final 3-second lockout
  const now = Date.now() + clockOffset;
  const remainingMs = phaseEndsAt ? Math.max(0, phaseEndsAt - now) : 15000;
  const isLockoutActive = remainingMs <= 3000;

  const hasConfirmed = currentProposal?.confirmations.includes(playerId || '');

  const handlePropose = (answer: number[]) => {
    proposeAnswer(answer);
    setShowPicker(false);
  };

  if (showPicker) {
    return (
      <div className="mb-6">
        <SymbolPicker
          onPropose={handlePropose}
          onCancel={() => setShowPicker(false)}
          disabled={isLockoutActive}
        />
      </div>
    );
  }

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden mb-6">
      {/* Locked Answer State */}
      {lockedAnswer ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/50 text-green-300 font-display text-xs uppercase tracking-widest mb-3">
            <span>🔒</span> ANSWER LOCKED FOR REVEAL
          </div>
          <h3 className="font-display text-xl font-bold text-white mb-4">
            TEAM SUBMISSION CONFIRMED
          </h3>
          <div className="flex justify-center gap-3">
            {lockedAnswer.map((sym, i) => {
              const display = SYMBOL_DISPLAY[sym];
              return (
                <div
                  key={i}
                  className="w-16 h-20 rounded-xl border-2 border-green-500/60 bg-green-950/30 flex flex-col items-center justify-center shadow-lg shadow-green-500/20 animate-scale-in"
                >
                  <span className="text-2xl" style={{ color: display?.color }}>
                    {display?.icon}
                  </span>
                  <span className="text-[10px] font-display text-gray-300 mt-1 font-semibold">
                    {display?.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : currentProposal ? (
        /* Active Proposal State */
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-white/5">
            <div>
              <span className="text-xs font-display text-neon-cyan uppercase tracking-wider block">
                Active Team Proposal
              </span>
              <span className="text-sm text-gray-300 font-medium">
                Proposed by <strong className="text-white">{currentProposal.proposerName}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-display text-gray-400">Confirmations:</span>
              <span className="badge-purple font-display text-xs">
                {currentProposal.confirmations.length} / {neededConfirms} needed
              </span>
            </div>
          </div>

          {/* Proposed Sequence Display */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-6">
            {currentProposal.answer.map((sym, idx) => {
              const display = SYMBOL_DISPLAY[sym];
              return (
                <div
                  key={idx}
                  className="w-16 sm:w-20 h-20 sm:h-24 rounded-2xl border border-neon-cyan/50 bg-cyan-950/20 flex flex-col items-center justify-center shadow-lg shadow-cyan-500/10"
                >
                  <span className="text-[10px] font-display text-gray-500 uppercase">P{idx + 1}</span>
                  <span className="text-2xl sm:text-3xl font-bold my-1" style={{ color: display?.color }}>
                    {display?.icon}
                  </span>
                  <span className="text-[10px] font-display text-gray-300 font-medium">
                    {display?.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {hasConfirmed ? (
              <div className="flex-1 w-full text-center py-3 px-4 rounded-xl border border-green-500/40 bg-green-950/20 text-green-300 text-xs font-display tracking-wider font-semibold">
                ✓ YOU CONFIRMED · WAITING FOR TEAM
              </div>
            ) : (
              <Button
                variant="primary"
                onClick={confirmProposal}
                className="flex-1 w-full"
                size="md"
              >
                ✓ Confirm This Proposal
              </Button>
            )}

            {!isLockoutActive && (
              <Button
                variant="secondary"
                onClick={() => setShowPicker(true)}
                className="w-full sm:w-auto"
                size="md"
              >
                Propose Different Answer
              </Button>
            )}
          </div>

          {isLockoutActive && (
            <p className="text-[11px] text-orange-400/90 text-center mt-3 font-display tracking-wider">
              ⏱ Proposals locked in final 3 seconds. Confirm the active proposal!
            </p>
          )}
        </div>
      ) : (
        /* No Proposal Yet */
        <div className="text-center py-6">
          <div className="text-4xl mb-3">🧩</div>
          <h3 className="font-display text-lg font-bold text-white mb-2">
            SUBMISSION PHASE ACTIVE
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto mb-5 font-light">
            Collaborate with your team to propose the decoded 4-symbol combination.
            Majority confirmation is required to lock the answer.
          </p>

          {!isLockoutActive ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowPicker(true)}
              className="py-3 px-8"
            >
              ✦ Propose Answer
            </Button>
          ) : (
            <div className="text-red-400 text-xs font-display tracking-wider">
              No proposal made. Time running out!
            </div>
          )}
        </div>
      )}
    </div>
  );
};
