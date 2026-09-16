import { ScoreContext, ScoreResult, ScoreStrategy } from './ScoreStrategy';
import {
  DrawAndGuessScoringStrategy,
  DrawBattleScoringStrategy,
  GuessRushScoringStrategy,
  BluffScoringStrategy,
  SpiritRaceScoringStrategy
} from './strategies';

export class MultiplayerScoreEngine {
  private static strategies: Map<string, ScoreStrategy> = new Map([
    ['DRAW_GUESS', new DrawAndGuessScoringStrategy()],
    ['BATTLE', new DrawAndGuessScoringStrategy()], // Default for generic battle
    ['DRAW_BATTLE', new DrawBattleScoringStrategy()],
    ['GUESS_RUSH', new GuessRushScoringStrategy()],
    ['BLUFF', new BluffScoringStrategy()],
    ['SPIRIT_RACE', new SpiritRaceScoringStrategy()]
  ]);

  static calculate(mode: string, context: ScoreContext): ScoreResult {
    const strategy = this.strategies.get(mode) || this.strategies.get('DRAW_GUESS')!;
    return strategy.calculateScore(context);
  }
}
