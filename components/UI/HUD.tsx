import React from 'react';
import { Player } from '../../types';
import { TOTAL_KEYS } from '../../constants';

interface HUDProps {
  player: Player;
  message: string | null;
}

const HUD: React.FC<HUDProps> = ({ player, message }) => {
  // Noise bar color
  const noiseColor = player.noiseLevel > 0.7 ? 'bg-red-600' : player.noiseLevel > 0.3 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Top Bar: Keys & Health */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
            <div className="bg-black/50 backdrop-blur-md p-3 rounded-lg border border-slate-700 text-slate-100">
                <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-1">Keys Collected</h3>
                <div className="flex gap-2 text-2xl font-bold text-yellow-400">
                    {Array.from({length: TOTAL_KEYS}).map((_, i) => (
                        <span key={i} className={i < player.keysFound ? "opacity-100" : "opacity-20 grayscale"}>
                            🔑
                        </span>
                    ))}
                </div>
            </div>
        </div>

        <div className="bg-black/50 backdrop-blur-md p-3 rounded-lg border border-slate-700 w-48">
             <h3 className="text-xs uppercase tracking-widest text-slate-400 mb-1">Vitality</h3>
             <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-red-500 transition-all duration-300" 
                    style={{ width: `${player.health}%`}}
                />
             </div>
        </div>
      </div>

      {/* Center: Messages */}
      {message && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-30">
            <div className="bg-black/70 px-6 py-4 rounded-xl border border-red-500/30 shadow-[0_0_30px_rgba(255,0,0,0.2)] animate-pulse">
                <p className="text-xl font-bold text-white tracking-wider font-mono">{message}</p>
            </div>
        </div>
      )}

      {/* Bottom: Inventory and Stats */}
      <div className="flex flex-col gap-4">
          
          {/* Inventory Slots (Visual only) */}
          <div className="flex justify-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i} 
                className="w-12 h-12 bg-black/40 border-2 border-slate-700 rounded-md backdrop-blur-sm flex items-center justify-center relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[10px] text-slate-600 absolute top-0.5 right-1 font-mono">{i + 1}</span>
              </div>
            ))}
          </div>

          {/* Bottom Bar: Noise Meter & Status */}
          <div className="flex justify-between items-end">
              <div className="bg-black/60 backdrop-blur-md p-4 rounded-lg border border-slate-600 w-64">
                <div className="flex justify-between text-xs text-slate-400 mb-2 uppercase tracking-widest">
                    <span>Sound Level</span>
                    <span className={player.noiseLevel > 0.5 ? "text-red-400 animate-pulse" : "text-emerald-400"}>
                        {player.noiseLevel > 0.8 ? "DANGER" : player.noiseLevel > 0.2 ? "AUDIBLE" : "SILENT"}
                    </span>
                </div>
                {/* Visualizer bars */}
                <div className="flex gap-1 h-8 items-end">
                    {Array.from({length: 12}).map((_, i) => {
                        const threshold = i / 12;
                        const isActive = player.noiseLevel > threshold;
                        const height = isActive ? Math.max(20, Math.random() * 100) : 10;
                        
                        return (
                            <div 
                                key={i} 
                                className={`flex-1 rounded-sm transition-all duration-75 ${isActive ? noiseColor : 'bg-slate-800'}`}
                                style={{ height: `${isActive ? height : 10}%` }}
                            />
                        );
                    })}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">
                    Grievers are blind. Stay low. Stay quiet.
                </p>
              </div>

              <div className="text-right text-slate-400 text-sm font-mono space-y-1">
                 <p className={player.isCrouching ? "text-yellow-400" : ""}>{player.isCrouching ? "[CROUCHING]" : "STANDING"}</p>
                 <p className={player.isClimbing ? "text-green-400" : ""}>{player.isClimbing ? "[CLIMBING VINES]" : ""}</p>
                 <p className={player.isInLocker ? "text-blue-400" : ""}>{player.isInLocker ? "[INSIDE LOCKER]" : ""}</p>
              </div>
          </div>
      </div>

      {/* Locker Overlay Effect */}
      {player.isInLocker && (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.95)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.95)_75%),linear-gradient(0deg,rgba(0,0,0,0.95)_20%,transparent_20%,transparent_80%,rgba(0,0,0,0.95)_80%)] pointer-events-none z-20">
              <div className="absolute top-10 left-10 text-slate-500 font-mono text-sm border border-slate-700 p-2 bg-black">
                  STATUS: SECURE<br/>
                  OUTSIDE: UNKNOWN<br/>
                  PRESS 'E' TO EXIT
              </div>
          </div>
      )}
    </div>
  );
};

export default HUD;