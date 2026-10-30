import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../../store/gameStore.js';
import { useSocket } from '../../hooks/useSocket.js';

export const ChatPanel: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const chatMessages = useGameStore((state) => state.chatMessages);
  const playerId = useGameStore((state) => state.playerId);
  const { sendChat } = useSocket();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendChat(inputMessage.trim());
    setInputMessage('');
  };

  return (
    <div className="glass-card flex flex-col h-[380px] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 bg-midnight-light/40 flex items-center justify-between">
        <span className="text-xs font-display font-bold tracking-wider text-neon-cyan flex items-center gap-2">
          <span>💬</span> TEAM CHAT
        </span>
        <span className="text-[10px] text-gray-500 font-display">
          {chatMessages.length} messages
        </span>
      </div>

      {/* Message List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
        {chatMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center text-gray-500 text-xs font-body italic">
            Share clue deductions and spot contradictions with your team...
          </div>
        ) : (
          chatMessages.map((msg, i) => {
            const isMe = msg.senderId === playerId;
            return (
              <div
                key={i}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[11px] font-display font-semibold ${isMe ? 'text-neon-cyan' : 'text-neon-purple'}`}>
                    {msg.senderName}
                  </span>
                  <span className="text-[9px] text-gray-600">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-xl text-xs font-body max-w-[85%] break-words ${
                    isMe
                      ? 'bg-gradient-to-r from-neon-purple/30 to-neon-cyan/20 border border-cyan-500/30 text-white'
                      : 'bg-white/5 border border-white/10 text-gray-200'
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/5 bg-midnight-light/40 flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Share deduction or question..."
          maxLength={200}
          className="input-field text-xs py-2 px-3 flex-1"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim()}
          className="btn-primary text-xs py-2 px-4 whitespace-nowrap"
        >
          Send
        </button>
      </form>
    </div>
  );
};
