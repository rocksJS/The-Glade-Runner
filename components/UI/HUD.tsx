import React from 'react';
import { Player } from '../../types';
import { TOTAL_KEYS } from '../../constants';

interface HUDProps {
  player: Player;
  message: string | null;
}

const HUD: React.FC<HUDProps> = ({ player, message }) => {
  const noiseColor = player.noiseLevel > 0.7 ? 'bg-zinc-400' : 'bg-zinc-600';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 mix-blend-screen opacity-80">
      
      {/* Top Bar */}
      <div className="flex justify-between items-start font-mono">
        <div className="bg-black/60 p-3 border border-zinc-800 text-zinc-400">
            <h3 className="text-[10px] uppercase tracking-[0.2em] mb-1">Keys</h3>
            <div className="flex gap-2 text-xl font-bold">
                {Array.from({length: TOTAL_KEYS}).map((_, i) => (
                    <span key={i} className={i < player.keysFound ? "text-zinc-200" : "text-zinc-800"}>
                        [K]
                    </span>
                ))}
            </div>
        </div>

        <div className="bg-black/60 p-3 border border-zinc-800 w-48">
             <h3 className="text-[10px] uppercase tracking-[0.2em] mb-1">Vitality</h3>
             <div className="w-full bg-zinc-900 h-1 overflow-hidden">
                <div 
                    className="h-full bg-zinc-400 transition-all duration-300" 
                    style={{ width: `${player.health}%`}}
                />
             </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 text-center z-30">
            <p className="text-sm font-mono text-zinc-300 tracking-[0.3em] uppercase animate-pulse">{message}</p>
        </div>
      )}

      {/* Bottom */}
      <div className="flex flex-col gap-4 font-mono">
          <div className="flex justify-center gap-1 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-10 h-10 bg-black/60 border border-zinc-800 flex items-center justify-center">
                <span className="text-[8px] text-zinc-700">{i + 1}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-end">
              <div className="bg-black/60 p-4 border border-zinc-800 w-56">
                <div className="flex justify-between text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">
                    <span>Acoustics</span>
                    <span className={player.noiseLevel > 0.5 ? "text-zinc-200" : ""}>
                        {Math.floor(player.noiseLevel * 100)}%
                    </span>
                </div>
                <div className="flex gap-1 h-4 items-end">
                    {Array.from({length: 12}).map((_, i) => (
                        <div 
                            key={i} 
                            className={`flex-1 transition-all duration-75 ${player.noiseLevel > i/12 ? noiseColor : 'bg-zinc-900'}`}
                            style={{ height: `${player.noiseLevel > i/12 ? 40 + Math.random()*60 : 10}%` }}
                        />
                    ))}
                </div>
              </div>

              <div className="text-right text-zinc-600 text-[10px] space-y-1 tracking-tighter">
                 <p>{player.isCrouching ? "MOD: SUPPRESSED" : "MOD: ACTIVE"}</p>
                 <p className="text-zinc-400">LAT: {player.x.toFixed(1)} LON: {player.y.toFixed(1)}</p>
              </div>
          </div>
      </div>

      {/* Locker Overlay */}
      {player.isInLocker && (
          <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-20">
              <div className="text-zinc-500 font-mono text-[10px] tracking-[0.5em] animate-pulse">
                  STASIS PROTOCOL ENABLED // PRESS [E] TO DEPLOY
              </div>
          </div>
      )}
    </div>
  );
};

export default HUD;