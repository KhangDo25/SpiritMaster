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

export interface DrawingWord {
  id: string;
  word: string;
  category: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  hint: string;
}
