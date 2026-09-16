import { Server } from 'socket.io';
import { RoomGameState } from './RoomGameService';
import { DrawingWordRepository } from '../db/repositories/DrawingWordRepository';
import { MultiplayerScoreEngine } from './scoring/MultiplayerScoreEngine';

export class GuessRushService {
  static async startRound(game: RoomGameState, roomId: string, io: Server) {
    const wordObj = await DrawingWordRepository.getRandomWord();
    const target = wordObj ? wordObj.word : 'Cá voi';
    const hints = [
      `Danh mục: ${wordObj?.category || 'Động vật'}`,
      `Gợi ý 1: ${wordObj?.hint || 'Loài sinh vật to lớn'}`,
      `Gợi ý 2: Độ dài từ gồm ${target.length} ký tự`,
      `Gợi ý 3: Ký tự đầu tiên là '${target[0]}'`
    ];

    game.guessRushState = {
      canonicalName: target,
      category: wordObj?.category || 'Chung',
      hints,
      revealedCount: 1,
      correctGuessers: [],
      cooldowns: {}
    };

    io.to(roomId).emit('round_started', {
      round: game.currentRound,
      maxRounds: game.maxRounds,
      mode: 'GUESS_RUSH',
      category: game.guessRushState.category,
      initialHint: hints[0],
      roundTime: game.roundTime
    });
  }

  static onTick(game: RoomGameState, roomId: string, io: Server) {
    if (!game.guessRushState) return;
    const elapsed = game.roundTime - game.timeRemaining;
    if (elapsed % 10 === 0 && game.guessRushState.revealedCount < game.guessRushState.hints.length) {
      game.guessRushState.revealedCount++;
      io.to(roomId).emit('rush_hint_revealed', {
        hint: game.guessRushState.hints[game.guessRushState.revealedCount - 1],
        hintIndex: game.guessRushState.revealedCount - 1
      });
    }
  }

  static handleGuess(game: RoomGameState, roomId: string, userId: string, guessText: string, io: Server) {
    if (!game.guessRushState) return;
    const now = Date.now();
    const lastAttempt = game.guessRushState.cooldowns[userId] || 0;
    if (now - lastAttempt < 1500) {
      // 1.5s spam cooldown
      return;
    }
    game.guessRushState.cooldowns[userId] = now;

    if (game.guessRushState.correctGuessers.includes(userId)) return;

    const normalizedGuess = guessText.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const target = game.guessRushState.canonicalName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (normalizedGuess === target || normalizedGuess.includes(target)) {
      game.guessRushState.correctGuessers.push(userId);
      const order = game.guessRushState.correctGuessers.length;

      const scoreResult = MultiplayerScoreEngine.calculate('GUESS_RUSH', {
        mode: 'GUESS_RUSH',
        timeRemaining: game.timeRemaining,
        totalTime: game.roundTime,
        isCorrect: true,
        order
      });

      game.scores[userId] = (game.scores[userId] || 0) + scoreResult.points;

      io.to(roomId).emit('player_guessed_correctly', {
        userId,
        userName: game.playerNames[userId],
        pointsAwarded: scoreResult.points,
        order
      });
    }
  }
}
