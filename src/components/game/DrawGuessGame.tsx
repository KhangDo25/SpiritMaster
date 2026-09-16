import React from 'react';
import { VectorStroke } from '../../types/drawing';
import { DrawingCanvas } from '../drawing/DrawingCanvas';

interface DrawGuessGameProps {
  isArtist: boolean;
  strokes: VectorStroke[];
  onAddStroke: (stroke: VectorStroke) => void;
  onClearCanvas: () => void;
  onUndoStroke: () => void;
}

export const DrawGuessGame: React.FC<DrawGuessGameProps> = ({
  isArtist,
  strokes,
  onAddStroke,
  onClearCanvas,
  onUndoStroke
}) => {
  return (
    <div id="draw-guess-game-container" className="flex-1 flex flex-col h-full min-h-[400px]">
      <DrawingCanvas
        isDrawingEnabled={isArtist}
        strokes={strokes}
        onAddStroke={onAddStroke}
        onClear={onClearCanvas}
        onUndo={onUndoStroke}
      />
    </div>
  );
};
