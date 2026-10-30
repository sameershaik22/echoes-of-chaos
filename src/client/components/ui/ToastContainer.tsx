import React from 'react';
import { useGameStore } from '../../store/gameStore.js';

export const ToastContainer: React.FC = () => {
  const toasts = useGameStore((state) => state.toasts);
  const removeToast = useGameStore((state) => state.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => {
        const borderColors = {
          info: 'border-cyan-500/50 text-cyan-200 bg-midnight-light/95',
          success: 'border-green-500/50 text-green-200 bg-midnight-light/95',
          warning: 'border-orange-500/50 text-orange-200 bg-midnight-light/95',
          error: 'border-red-500/50 text-red-200 bg-midnight-light/95',
        }[toast.type];

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md shadow-2xl flex items-center justify-between animate-fade-in-up transition-all ${borderColors}`}
          >
            <span className="text-sm font-body font-medium">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-3 text-xs opacity-60 hover:opacity-100 p-1"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
};
