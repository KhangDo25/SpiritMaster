import React, { useRef, useEffect, useState, useCallback } from 'react';
import { VectorStroke, Point } from '../../types/drawing';
import { soundEngine } from '../../utils/audio';
import { 
  Paintbrush, 
  Eraser, 
  RotateCcw, 
  Trash2, 
  Minus, 
  Plus,
  Palette
} from 'lucide-react';

interface DrawingCanvasProps {
  isDrawingEnabled: boolean;
  strokes: VectorStroke[];
  onAddStroke?: (stroke: VectorStroke) => void;
  onClear?: () => void;
  onUndo?: () => void;
}

const PALETTE = [
  { color: '#FFFFFF', name: 'Trắng tinh' },
  { color: '#EF4444', name: 'Đỏ Hỏa' },
  { color: '#F97316', name: 'Cam Lửa' },
  { color: '#FBBF24', name: 'Vàng Kim' },
  { color: '#10B981', name: 'Lục Mộc' },
  { color: '#06B6D4', name: 'Lam Băng' },
  { color: '#3B82F6', name: 'Dương Thủy' },
  { color: '#8B5CF6', name: 'Tím Lôi' },
  { color: '#EC4899', name: 'Hồng Đào' },
  { color: '#78350F', name: 'Nâu Thổ' },
  { color: '#64748B', name: 'Xám Khói' },
  { color: '#000000', name: 'Đen Mực' },
];

const PRESET_SIZES = [2, 4, 8, 16, 24];

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  isDrawingEnabled,
  strokes,
  onAddStroke,
  onClear,
  onUndo
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [activeTool, setActiveTool] = useState<'pen' | 'eraser'>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#FFFFFF');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isPointerDown, setIsPointerDown] = useState<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);
  const containerSizeRef = useRef<{ width: number; height: number }>({ width: 800, height: 500 });

  // Draw smooth path with quadratic Bézier curves
  const drawStrokePath = (
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number,
    isEraser: boolean,
    widthPx: number,
    heightPx: number
  ) => {
    if (!points || points.length === 0) return;

    ctx.save();
    ctx.strokeStyle = isEraser ? '#090d16' : color;
    ctx.fillStyle = isEraser ? '#090d16' : color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (points.length === 1) {
      // Single dot tap
      ctx.beginPath();
      ctx.arc(points[0].x * widthPx, points[0].y * heightPx, Math.max(1, width / 2), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.beginPath();
    const p0 = points[0];
    ctx.moveTo(p0.x * widthPx, p0.y * heightPx);

    if (points.length === 2) {
      ctx.lineTo(points[1].x * widthPx, points[1].y * heightPx);
    } else {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = ((points[i].x + points[i + 1].x) / 2) * widthPx;
        const yc = ((points[i].y + points[i + 1].y) / 2) * heightPx;
        ctx.quadraticCurveTo(points[i].x * widthPx, points[i].y * heightPx, xc, yc);
      }
      const last = points[points.length - 1];
      ctx.lineTo(last.x * widthPx, last.y * heightPx);
    }

    ctx.stroke();
    ctx.restore();
  };

  // Redraw canvas whenever strokes change or size changes
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = containerSizeRef.current;
    if (width <= 0 || height <= 0) return;

    const dpr = window.devicePixelRatio || 1;

    // Reset transform to identity then scale by DPR
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear background to dark fantasy slate
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric grid overlay for drawing precision
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Render all saved strokes
    for (const stroke of strokes) {
      drawStrokePath(
        ctx,
        stroke.points,
        stroke.color,
        stroke.width,
        stroke.tool === 'eraser',
        width,
        height
      );
    }

    // Render current active stroke in progress
    if (currentPointsRef.current.length > 0) {
      drawStrokePath(
        ctx,
        currentPointsRef.current,
        selectedColor,
        brushSize,
        activeTool === 'eraser',
        width,
        height
      );
    }
  }, [strokes, activeTool, selectedColor, brushSize]);

  // Handle resizing with ResizeObserver and DPR scaling
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          const dpr = window.devicePixelRatio || 1;
          containerSizeRef.current = { width: Math.floor(width), height: Math.floor(height) };
          canvas.width = Math.floor(width * dpr);
          canvas.height = Math.floor(height * dpr);
          canvas.style.width = `${Math.floor(width)}px`;
          canvas.style.height = `${Math.floor(height)}px`;
          redraw();
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [redraw]);

  // Redraw when strokes change
  useEffect(() => {
    redraw();
  }, [strokes, redraw]);

  // Keyboard shortcut for Undo (Ctrl+Z or Cmd+Z)
  useEffect(() => {
    if (!isDrawingEnabled || !onUndo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        soundEngine.playClick();
        onUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawingEnabled, onUndo]);

  // Pointer event handlers (touch, mouse, stylus)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    setIsPointerDown(true);

    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentPointsRef.current = [{ x: nx, y: ny }];
    redraw();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown || !isDrawingEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    currentPointsRef.current.push({ x: nx, y: ny });
    redraw();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown || !isDrawingEnabled) return;
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    setIsPointerDown(false);

    if (currentPointsRef.current.length > 0 && onAddStroke) {
      // If single point (tap), add duplicate micro-offset for vector storage compatibility
      let finalPoints = [...currentPointsRef.current];
      if (finalPoints.length === 1) {
        finalPoints.push({
          x: Math.min(1, finalPoints[0].x + 0.0001),
          y: finalPoints[0].y
        });
      }

      const newStroke: VectorStroke = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        points: finalPoints,
        color: selectedColor,
        width: brushSize,
        tool: activeTool,
        timestamp: Date.now()
      };
      onAddStroke(newStroke);
    }
    currentPointsRef.current = [];
  };

  return (
    <div className="flex flex-col w-full h-full bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl">
      {/* Canvas viewport container */}
      <div 
        ref={containerRef} 
        className="relative flex-1 min-h-[360px] md:min-h-[460px] w-full cursor-crosshair bg-[#090d16] select-none touch-none"
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 block touch-none select-none"
        />

        {!isDrawingEnabled && (
          <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700 text-xs font-medium text-slate-200 pointer-events-none flex items-center gap-2 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
            <span>Đang quan sát nét vẽ của Họa Sĩ...</span>
          </div>
        )}
      </div>

      {/* Interactive Toolbar: Visible only to artist */}
      {isDrawingEnabled && (
        <div className="bg-slate-900/95 border-t border-slate-700/80 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 select-none">
          {/* Tool selector (Pen vs Eraser) */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTool('pen');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                activeTool === 'pen'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Bút vẽ tự do"
            >
              <Paintbrush className="w-4 h-4" />
              <span>Bút vẽ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick();
                setActiveTool('eraser');
              }}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                activeTool === 'eraser'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Tẩy nét"
            >
              <Eraser className="w-4 h-4" />
              <span>Tẩy</span>
            </button>
          </div>

          {/* Color Palette Presets + Color Picker */}
          {activeTool === 'pen' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {PALETTE.map(({ color, name }) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => {
                    soundEngine.playClick();
                    setSelectedColor(color);
                  }}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full transition-transform border-2 ${
                    selectedColor.toLowerCase() === color.toLowerCase()
                      ? 'scale-125 border-white shadow-lg shadow-black/60 z-10'
                      : 'border-slate-700/80 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`${name} (${color})`}
                />
              ))}

              {/* Native Color Picker */}
              <label
                className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-slate-700/80 hover:scale-110 cursor-pointer flex items-center justify-center bg-gradient-to-tr from-rose-500 via-emerald-500 to-indigo-500 shadow"
                title="Màu tùy chỉnh"
              >
                <Palette className="w-3.5 h-3.5 text-white drop-shadow" />
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* Brush Size Controls */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs font-medium text-slate-300">
            <span className="text-slate-400 hidden sm:inline">Cỡ:</span>
            {PRESET_SIZES.map(size => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  setBrushSize(size);
                }}
                className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                  brushSize === size
                    ? 'bg-indigo-600 text-white font-bold shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div 
                  className="rounded-full bg-current" 
                  style={{ width: Math.max(3, Math.min(14, size / 1.5)), height: Math.max(3, Math.min(14, size / 1.5)) }} 
                />
              </button>
            ))}
            <div className="h-4 w-px bg-slate-800 mx-1" />
            <button
              type="button"
              onClick={() => setBrushSize(prev => Math.max(2, prev - 2))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title="Giảm cỡ nét"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono font-bold text-indigo-400 w-4 text-center">{brushSize}</span>
            <button
              type="button"
              onClick={() => setBrushSize(prev => Math.min(32, prev + 2))}
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition"
              title="Tăng cỡ nét"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Action buttons (Undo, Clear) */}
          <div className="flex items-center gap-2">
            {onUndo && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onUndo();
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold shadow hover:text-white"
                title="Hoàn tác nét vẽ cuối (Ctrl+Z)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hoàn tác</span>
              </button>
            )}
            {onClear && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  onClear();
                }}
                className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold shadow hover:shadow-rose-600/20"
                title="Xóa toàn bộ bản vẽ"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Xóa sạch</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
