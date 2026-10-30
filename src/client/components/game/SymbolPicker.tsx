import React, { useState } from 'react';
import { SYMBOL_POOL, SYMBOL_DISPLAY } from '../../../shared/constants.js';
import { soundEngine } from '../../audio/SoundEngine.js';

interface SymbolPickerProps {
  onPropose: (answer: number[]) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export const SymbolPicker: React.FC<SymbolPickerProps> = ({
  onPropose,
  onCancel,
  disabled = false,
}) => {
  const [selectedSlots, setSelectedSlots] = useState<(number | null)[]>([null, null, null, null]);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);

  const handlePickSymbol = (symbol: number) => {
    soundEngine.playClick();
    const updated = [...selectedSlots];
    updated[activeSlotIdx] = symbol;
    setSelectedSlots(updated);

    // Auto-advance to next empty slot or wrap
    const nextEmpty = updated.findIndex((s) => s === null);
    if (nextEmpty !== -1) {
      setActiveSlotIdx(nextEmpty);
    } else {
      setActiveSlotIdx((activeSlotIdx + 1) % 4);
    }
  };

  const handleClearSlot = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    soundEngine.playClick();
    const updated = [...selectedSlots];
    updated[idx] = null;
    setSelectedSlots(updated);
    setActiveSlotIdx(idx);
  };

  const isComplete = selectedSlots.every((s): s is number => s !== null);

  const handleSubmit = () => {
    if (isComplete && !disabled) {
      onPropose(selectedSlots as number[]);
    }
  };

  return (
    <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/40 bg-midnight-light/95 shadow-2xl animate-scale-in max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold text-white tracking-wider">
            CONSTRUCT PROPOSAL
          </h3>
          <p className="text-xs text-gray-400">Select symbols for all 4 positions</p>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-white text-sm font-display px-2 py-1"
        >
          ✕
        </button>
      </div>

      {/* 4 Sequence Slots */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[0, 1, 2, 3].map((idx) => {
          const val = selectedSlots[idx];
          const display = val ? SYMBOL_DISPLAY[val] : null;
          const isActive = activeSlotIdx === idx;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveSlotIdx(idx);
              }}
              className={`h-20 sm:h-24 rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all duration-300 ${
                isActive
                  ? 'border-neon-cyan bg-cyan-950/40 shadow-lg shadow-cyan-500/30 scale-[1.03]'
                  : val
                  ? 'border-white/20 bg-midnight/80'
                  : 'border-white/10 bg-midnight/40 hover:border-white/20'
              }`}
            >
              <span className="text-[10px] font-display text-gray-400 uppercase tracking-widest absolute top-2 left-2">
                P{idx + 1}
              </span>

              {display ? (
                <div className="flex flex-col items-center">
                  <span
                    className="text-2xl sm:text-3xl font-bold animate-scale-in"
                    style={{ color: display.color }}
                  >
                    {display.icon}
                  </span>
                  <span className="text-[10px] font-display font-medium text-gray-300 mt-1">
                    {display.label}
                  </span>
                </div>
              ) : (
                <span className="text-xs font-display text-gray-600">EMPTY</span>
              )}

              {val && (
                <button
                  type="button"
                  onClick={(e) => handleClearSlot(idx, e)}
                  className="absolute top-1.5 right-1.5 text-gray-500 hover:text-red-400 text-xs px-1"
                  title="Clear slot"
                >
                  ✕
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Symbol Selection Palette */}
      <div className="mb-6">
        <span className="text-xs font-display text-gray-400 tracking-wider uppercase mb-2 block">
          Select Symbol for Position {activeSlotIdx + 1}:
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {SYMBOL_POOL.map((sym) => {
            const display = SYMBOL_DISPLAY[sym];
            return (
              <button
                key={sym}
                type="button"
                onClick={() => handlePickSymbol(sym)}
                className="p-3 rounded-xl border border-white/10 hover:border-neon-cyan bg-midnight/60 hover:bg-cyan-950/30 flex flex-col items-center transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <span className="text-2xl mb-1" style={{ color: display.color }}>
                  {display.icon}
                </span>
                <span className="text-[10px] font-display font-semibold text-gray-300">
                  {display.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost flex-1 py-3 text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isComplete || disabled}
          className="btn-primary flex-2 py-3 text-xs"
        >
          Submit Proposal
        </button>
      </div>
    </div>
  );
};
