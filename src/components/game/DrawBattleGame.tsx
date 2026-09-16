import React, { useState } from 'react';
import { VectorStroke } from '../../types/drawing';
import { DrawingCanvas } from '../drawing/DrawingCanvas';

interface DrawBattleGameProps {
  currentUserId: string;
  players: Array<{ userId: string; name: string }>;
  battleArtist1Id: string;
  battleArtist2Id: string;
  battleStrokes1: VectorStroke[];
  battleStrokes2: VectorStroke[];
  onAddStroke: (stroke: VectorStroke) => void;
  onClearCanvas: () => void;
  onUndoStroke: () => void;
  onVoteDrawBattle?: (artistId: string) => void;
}

export const DrawBattleGame: React.FC<DrawBattleGameProps> = ({
  currentUserId,
  players,
  battleArtist1Id,
  battleArtist2Id,
  battleStrokes1,
  battleStrokes2,
  onAddStroke,
  onClearCanvas,
  onUndoStroke,
  onVoteDrawBattle
}) => {
  const [hasVoted, setHasVoted] = useState(false);
  const isArtist1 = String(currentUserId) === String(battleArtist1Id);
  const isArtist2 = String(currentUserId) === String(battleArtist2Id);

  const artist1Name = players.find(p => String(p.userId) === String(battleArtist1Id))?.name || 'Họa Sĩ 1';
  const artist2Name = players.find(p => String(p.userId) === String(battleArtist2Id))?.name || 'Họa Sĩ 2';

  return (
    <div id="draw-battle-game-container" className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 h-full">
      {/* Artist 1 Canvas */}
      <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2">
        <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-300">
          <span>Họa Sĩ 1: {artist1Name} {isArtist1 && <strong className="text-amber-400">(Bạn)</strong>}</span>
          {!isArtist1 && !isArtist2 && (
            <button
              id="vote-artist-1-btn"
              type="button"
              disabled={hasVoted}
              onClick={() => {
                onVoteDrawBattle?.(battleArtist1Id);
                setHasVoted(true);
              }}
              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            >
              {hasVoted ? 'Đã bỏ phiếu' : 'Bình chọn bức này'}
            </button>
          )}
        </div>
        <div className="flex-1 min-h-[260px]">
          <DrawingCanvas
            isDrawingEnabled={isArtist1}
            strokes={battleStrokes1}
            onAddStroke={onAddStroke}
            onClear={onClearCanvas}
            onUndo={onUndoStroke}
          />
        </div>
      </div>

      {/* Artist 2 Canvas */}
      <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2">
        <div className="flex items-center justify-between px-2 py-1 text-xs font-bold text-slate-300">
          <span>Họa Sĩ 2: {artist2Name} {isArtist2 && <strong className="text-amber-400">(Bạn)</strong>}</span>
          {!isArtist1 && !isArtist2 && (
            <button
              id="vote-artist-2-btn"
              type="button"
              disabled={hasVoted}
              onClick={() => {
                onVoteDrawBattle?.(battleArtist2Id);
                setHasVoted(true);
              }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            >
              {hasVoted ? 'Đã bỏ phiếu' : 'Bình chọn bức này'}
            </button>
          )}
        </div>
        <div className="flex-1 min-h-[260px]">
          <DrawingCanvas
            isDrawingEnabled={isArtist2}
            strokes={battleStrokes2}
            onAddStroke={onAddStroke}
            onClear={onClearCanvas}
            onUndo={onUndoStroke}
          />
        </div>
      </div>
    </div>
  );
};
