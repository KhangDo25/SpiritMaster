import { ScoreContext, ScoreResult, ScoreStrategy } from './ScoreStrategy';

export class DrawAndGuessScoringStrategy implements ScoreStrategy {
  calculateScore(ctx: ScoreContext): ScoreResult {
    if (!ctx.isCorrect) {
      return { points: 0, xp: 5, coins: 0, breakdown: { base: 0 } };
    }

    const timeRatio = Math.max(0.1, ctx.timeRemaining / (ctx.totalTime || 60));
    const basePoints = 200;
    const speedBonus = Math.round(timeRatio * 200);
    const orderBonus = ctx.order === 1 ? 100 : ctx.order === 2 ? 50 : 0;
    const totalPoints = basePoints + speedBonus + orderBonus;

    const earnedXp = Math.round(totalPoints * 0.5);
    const earnedCoins = Math.round(totalPoints * 0.15);

    return {
      points: totalPoints,
      xp: earnedXp,
      coins: earnedCoins,
      breakdown: {
        base: basePoints,
        speedBonus,
        orderBonus
      }
    };
  }
}

export class DrawBattleScoringStrategy implements ScoreStrategy {
  calculateScore(ctx: ScoreContext): ScoreResult {
    const votes = ctx.votesReceived || 0;
    const votePoints = votes * 150;
    const isWinner = ctx.order === 1;
    const winBonus = isWinner ? 300 : 50;

    const total = votePoints + winBonus;
    return {
      points: total,
      xp: Math.round(total * 0.6),
      coins: Math.round(total * 0.2),
      breakdown: {
        votes: votePoints,
        winBonus
      }
    };
  }
}

export class GuessRushScoringStrategy implements ScoreStrategy {
  calculateScore(ctx: ScoreContext): ScoreResult {
    if (!ctx.isCorrect) {
      return { points: 0, xp: 5, coins: 0, breakdown: { base: 0 } };
    }

    const rankBonusMap: Record<number, number> = { 1: 500, 2: 350, 3: 200, 4: 150 };
    const rankPoints = rankBonusMap[ctx.order || 1] || 100;
    const timeBonus = Math.round((ctx.timeRemaining / (ctx.totalTime || 30)) * 100);
    const total = rankPoints + timeBonus;

    return {
      points: total,
      xp: Math.round(total * 0.5),
      coins: Math.round(total * 0.2),
      breakdown: {
        rankPoints,
        timeBonus
      }
    };
  }
}

export class BluffScoringStrategy implements ScoreStrategy {
  calculateScore(ctx: ScoreContext): ScoreResult {
    const correctGuessPoints = ctx.votedCorrectly ? 200 : 0;
    const trickedPlayers = ctx.bluffedCount || 0;
    const bluffTrickPoints = trickedPlayers * 120;
    const total = correctGuessPoints + bluffTrickPoints;

    return {
      points: total,
      xp: Math.round(total * 0.5),
      coins: Math.round(total * 0.15),
      breakdown: {
        correctGuessPoints,
        bluffTrickPoints
      }
    };
  }
}

export class SpiritRaceScoringStrategy implements ScoreStrategy {
  calculateScore(ctx: ScoreContext): ScoreResult {
    const rank = ctx.raceRank || 99;
    const rankPoints = rank === 1 ? 500 : rank === 2 ? 350 : rank === 3 ? 200 : 100;
    const coinBonus = (ctx.coinsCollected || 0) * 10;
    const total = rankPoints + coinBonus;

    return {
      points: total,
      xp: Math.round(total * 0.6),
      coins: (ctx.coinsCollected || 0) + Math.round(rankPoints * 0.1),
      breakdown: {
        rankPoints,
        coinBonus
      }
    };
  }
}
