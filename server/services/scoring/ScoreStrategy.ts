export interface ScoreContext {
  mode: string;
  timeRemaining: number;
  totalTime: number;
  isCorrect?: boolean;
  order?: number; // 1st, 2nd, 3rd guesser
  votesReceived?: number;
  bluffedCount?: number;
  votedCorrectly?: boolean;
  raceRank?: number;
  coinsCollected?: number;
}

export interface ScoreResult {
  points: number;
  xp: number;
  coins: number;
  breakdown: Record<string, number>;
}

export interface ScoreStrategy {
  calculateScore(context: ScoreContext): ScoreResult;
}
