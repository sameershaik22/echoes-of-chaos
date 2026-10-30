import React from 'react';
import { Clue, ClueType } from '../../../shared/types.js';
import { SYMBOL_DISPLAY } from '../../../shared/constants.js';

interface ClueCardProps {
  clue: Clue;
  index: number;
}

export const ClueCard: React.FC<ClueCardProps> = ({ clue, index }) => {
  const typeConfig = {
    [ClueType.EXACT_POSITION]: {
      label: 'EXACT POSITION',
      color: 'border-neon-cyan/50 bg-cyan-950/20 text-neon-cyan shadow-cyan-500/10',
      badge: 'badge-cyan',
      icon: '🎯',
    },
    [ClueType.EXCLUSION]: {
      label: 'EXCLUSION',
      color: 'border-neon-pink/50 bg-pink-950/20 text-neon-pink shadow-pink-500/10',
      badge: 'px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold tracking-wider uppercase border border-pink-500/40 bg-pink-500/10 text-pink-300',
      icon: '🚫',
    },
    [ClueType.PARITY]: {
      label: 'PARITY',
      color: 'border-neon-purple/50 bg-purple-950/20 text-neon-purple shadow-purple-500/10',
      badge: 'badge-purple',
      icon: '⚖️',
    },
    [ClueType.ARITHMETIC]: {
      label: 'ARITHMETIC',
      color: 'border-neon-orange/50 bg-orange-950/20 text-neon-orange shadow-orange-500/10',
      badge: 'badge-orange',
      icon: '➕',
    },
    [ClueType.FREQUENCY]: {
      label: 'FREQUENCY',
      color: 'border-lime-500/50 bg-lime-950/20 text-lime-400 shadow-lime-500/10',
      badge: 'px-2.5 py-0.5 rounded-full text-[10px] font-display font-bold tracking-wider uppercase border border-lime-500/40 bg-lime-500/10 text-lime-300',
      icon: '🔢',
    },
  }[clue.type];

  return (
    <div
      className={`glass-card relative overflow-hidden border p-4 sm:p-5 rounded-2xl shadow-xl transition-all duration-300 hover:scale-[1.01] hover:border-white/30 ${typeConfig.color}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeConfig.icon}</span>
          <span className={typeConfig.badge}>{typeConfig.label}</span>
        </div>
        <span className="text-xs font-display text-gray-500">CLUE #{index + 1}</span>
      </div>

      <div className="text-base sm:text-lg font-body font-semibold text-white tracking-wide">
        {clue.description}
      </div>

      {/* Visual aid preview for specific clue types */}
      {clue.type === ClueType.EXACT_POSITION && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5 text-xs text-gray-400">
          <span>Position {clue.position}</span>
          <span className="text-gray-600">→</span>
          <span
            className="font-bold text-sm"
            style={{ color: SYMBOL_DISPLAY[clue.symbol]?.color }}
          >
            {SYMBOL_DISPLAY[clue.symbol]?.icon} {SYMBOL_DISPLAY[clue.symbol]?.label}
          </span>
        </div>
      )}

      {clue.type === ClueType.EXCLUSION && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-white/5 text-xs text-gray-400">
          <span>Position {clue.position}</span>
          <span className="text-gray-600">≠</span>
          <span
            className="font-bold line-through text-sm"
            style={{ color: SYMBOL_DISPLAY[clue.symbol]?.color }}
          >
            {SYMBOL_DISPLAY[clue.symbol]?.icon} {SYMBOL_DISPLAY[clue.symbol]?.label}
          </span>
        </div>
      )}
    </div>
  );
};
