import React, { useState, useEffect } from 'react';
import { Footprints, Flame } from 'lucide-react';
import { Button } from '../ui/Button';

interface SpiritRaceGameProps {
  currentUserId: string;
  players: Array<{ userId: string; name: string }>;
  racePositions: Record<string, any>;
  onRaceMove: (data: { x: number; isGrounded: boolean }) => void;
}

export const SpiritRaceGame: React.FC<SpiritRaceGameProps> = ({
  currentUserId,
  players,
  racePositions,
  onRaceMove
}) => {
  const [localX, setLocalX] = useState(0);

  // Jump and tap controls
  const handleBoost = () => {
    const newX = localX + 45;
    setLocalX(newX);
    onRaceMove({ x: newX, isGrounded: true });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleBoost();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localX]);

  const myPos = racePositions[currentUserId]?.x || localX;

  return (
    <div id="spirit-race-game-container" className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden">
      <div className="text-xs text-slate-400 flex items-center justify-between mb-4">
        <span>Nhấn <strong>[Phím Cách]</strong> hoặc nút bên dưới để bứt tốc về đích (2000m)!</span>
        <span>Vị trí của bạn: <strong className="text-emerald-400">{Math.round(myPos)}m</strong></span>
      </div>

      {/* Race Track Visualization */}
      <div className="flex-1 flex flex-col justify-around py-4 bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-4">
        {players.map((p) => {
          const pos = racePositions[p.userId]?.x || (p.userId === currentUserId ? localX : 0);
          const progressPct = Math.min(100, (pos / 2000) * 100);
          const isMe = p.userId === currentUserId;

          return (
            <div key={p.userId} className="relative w-full">
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-semibold">
                <span className={isMe ? "text-emerald-400 font-bold" : ""}>
                  {p.name} {isMe && "(Bạn)"}
                </span>
                <span>{Math.round(pos)}m / 2000m</span>
              </div>
              <div className="w-full h-8 bg-slate-900 rounded-full border border-slate-800 relative overflow-hidden flex items-center px-1">
                {/* Finish line marker */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-amber-400 to-rose-500 z-10 opacity-70" />
                
                {/* Racer position pin */}
                <div 
                  className="absolute transition-all duration-300 flex items-center gap-1"
                  style={{ left: `calc(${progressPct}% - 24px)` }}
                >
                  <div className={`p-1.5 rounded-full ${isMe ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-slate-700 text-slate-300'}`}>
                    <Footprints className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Controls for Mobile / Click */}
      <div className="mt-4 flex justify-center">
        <Button
          id="spirit-race-boost-btn"
          size="lg"
          onClick={handleBoost}
          className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold px-8 py-3 rounded-2xl shadow-lg flex items-center gap-2"
        >
          <Flame className="w-5 h-5 animate-bounce" />
          BỨT TỐC (NHẤN CÁCH)
        </Button>
      </div>
    </div>
  );
};
