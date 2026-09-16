export interface Point {
  x: number;
  y: number;
}

export interface VectorStroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: 'pen' | 'eraser';
  timestamp: number;
}

export interface DrawingWordDTO {
  id: string;
  word: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hint: string;
}

export function validateStroke(stroke: any): VectorStroke | null {
  if (!stroke || typeof stroke !== 'object') return null;
  if (typeof stroke.id !== 'string' || stroke.id.length > 50) return null;
  if (!Array.isArray(stroke.points) || stroke.points.length === 0 || stroke.points.length > 2000) return null;
  
  // Validate points are bounded numbers between 0 and 1 (normalized coords) or 0 and 1200
  for (const pt of stroke.points) {
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number' || isNaN(pt.x) || isNaN(pt.y)) {
      return null;
    }
  }

  const validTools = ['pen', 'eraser'];
  const tool = validTools.includes(stroke.tool) ? stroke.tool : 'pen';
  const width = typeof stroke.width === 'number' && stroke.width >= 1 && stroke.width <= 60 ? stroke.width : 4;
  const color = typeof stroke.color === 'string' && stroke.color.length <= 32 ? stroke.color : '#FFFFFF';

  return {
    id: stroke.id,
    points: stroke.points.map((p: any) => ({ x: Number(p.x), y: Number(p.y) })),
    color,
    width,
    tool,
    timestamp: typeof stroke.timestamp === 'number' ? stroke.timestamp : Date.now()
  };
}
