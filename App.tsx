import React, { useState } from 'react';
import GameCanvas from './components/GameCanvas';
import HUD from './components/UI/HUD';
import { GameState, Player } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [hudPlayerState, setHudPlayerState] = useState<Player>({
      x: 0, y: 0, dirX: 0, dirY: 0, planeX: 0, planeY: 0, z: 0, pitch: 0,
      health: 100, keysFound: 0, isCrouching: false, isInLocker: true, 
      isClimbing: false, noiseLevel: 0, moveSpeed: 0, rotSpeed: 0
  });
  const [hudMessage, setHudMessage] = useState<string | null>(null);

  // Callback to sync render loop state with React State for HUD
  const handleUpdateHUD = (p: Player, msg: string | null) => {
      setHudPlayerState({...p}); // Clone to trigger re-render
      setHudMessage(msg);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center font-sans overflow-hidden select-none">
      
      {/* Game Container */}
      <div className="relative w-full max-w-[1280px] aspect-[4/3] bg-black shadow-2xl rounded-sm overflow-hidden border-4 border-slate-800">
        
        {/* Main 3D Canvas */}
        <GameCanvas 
            gameState={gameState} 
            setGameState={setGameState} 
            onUpdateHUD={handleUpdateHUD}
        />

        {/* UI Overlay */}
        {gameState === GameState.PLAYING && (
            <HUD player={hudPlayerState} message={hudMessage} />
        )}

        {/* Menu Screen */}
        {gameState === GameState.MENU && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-white p-8 backdrop-blur-sm z-50">
                <h1 className="text-6xl font-black mb-4 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-slate-200 to-slate-600">
                    THE GLADE RUNNER
                </h1>
                <p className="text-xl text-slate-400 mb-8 max-w-lg text-center font-light">
                    Escape the maze before nightfall. The Grievers are blind, but they can hear your fear.
                </p>
                <div className="grid grid-cols-2 gap-8 text-sm text-slate-500 mb-8 border border-slate-700 p-6 rounded bg-slate-950/50">
                    <ul className="space-y-2">
                        <li><strong className="text-slate-300">WASD</strong> Move</li>
                        <li><strong className="text-slate-300">Arrows</strong> Look</li>
                        <li><strong className="text-slate-300">SHIFT</strong> Run (Loud)</li>
                    </ul>
                    <ul className="space-y-2">
                         <li><strong className="text-slate-300">CTRL</strong> Crouch (Quiet)</li>
                         <li><strong className="text-slate-300">SPACE</strong> Climb Vines</li>
                         <li><strong className="text-slate-300">E</strong> Exit Locker</li>
                    </ul>
                </div>
                <button 
                    onClick={() => setGameState(GameState.PLAYING)}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(37,99,235,0.5)]"
                >
                    ENTER THE MAZE
                </button>
            </div>
        )}

        {/* Game Over Screen */}
        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-red-950/90 flex flex-col items-center justify-center text-white z-50">
                 <h1 className="text-6xl font-bold mb-2 text-red-500 tracking-widest">STUNG</h1>
                 <p className="text-2xl text-red-200 mb-8">You belong to the maze now.</p>
                 <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                    Try Again
                </button>
            </div>
        )}

        {/* Victory Screen */}
        {gameState === GameState.VICTORY && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center text-white z-50">
                 <h1 className="text-6xl font-bold mb-2 text-emerald-400 tracking-widest">ESCAPED</h1>
                 <p className="text-2xl text-emerald-200 mb-8">You found the way out.</p>
                 <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-colors uppercase tracking-widest"
                >
                    Play Again
                </button>
            </div>
        )}

      </div>
      
      <div className="absolute bottom-4 right-4 text-slate-600 text-xs font-mono">
        v1.0.0 | React Raycaster Engine
      </div>
    </div>
  );
}