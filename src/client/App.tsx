import React, { useEffect } from 'react';
import { useGameStore } from './store/gameStore.js';
import { useSocket } from './hooks/useSocket.js';
import { GamePhase } from '../shared/types.js';
import { Landing } from './screens/Landing.js';
import { Lobby } from './screens/Lobby.js';
import { GamePlay } from './screens/GamePlay.js';
import { Voting } from './screens/Voting.js';
import { Reveal } from './screens/Reveal.js';
import { GameOver } from './screens/GameOver.js';
import { ToastContainer } from './components/ui/ToastContainer.js';
import { OnboardingModal } from './components/onboarding/OnboardingModal.js';

export function App() {
  const roomCode = useGameStore((state) => state.roomCode);
  const phase = useGameStore((state) => state.phase);
  const setShowHowToPlay = useGameStore((state) => state.setShowHowToPlay);

  // Initialize socket listeners
  useSocket();

  // First time check for onboarding tutorial
  useEffect(() => {
    try {
      const seen = localStorage.getItem('eoc_tutorial_seen');
      if (!seen) {
        setShowHowToPlay(true);
        localStorage.setItem('eoc_tutorial_seen', 'true');
      }
    } catch {}
  }, [setShowHowToPlay]);

  // Screen routing based on roomCode and phase
  const renderScreen = () => {
    if (!roomCode) {
      return <Landing />;
    }

    switch (phase) {
      case GamePhase.WAITING:
        return <Lobby />;
      case GamePhase.CLUE_PHASE:
      case GamePhase.DISCUSSION:
      case GamePhase.SUBMISSION:
        return <GamePlay />;
      case GamePhase.VOTING:
        return <Voting />;
      case GamePhase.REVEAL:
        return <Reveal />;
      case GamePhase.GAME_OVER:
        return <GameOver />;
      default:
        return <Landing />;
    }
  };

  return (
    <div className="min-h-screen bg-midnight font-body text-white selection:bg-neon-cyan selection:text-midnight">
      {renderScreen()}
      <ToastContainer />
      <OnboardingModal />
    </div>
  );
}

export default App;
