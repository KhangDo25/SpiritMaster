import { Server } from 'socket.io';
import { RoomGameState } from './RoomGameService';
import { DrawingWordRepository } from '../db/repositories/DrawingWordRepository';
import { VectorStroke } from '../../src/types/drawing';
import { MultiplayerScoreEngine } from './scoring/MultiplayerScoreEngine';

export class DrawingGameService {
  static async startRound(game: RoomGameState, roomId: string, io: Server, playerIds: string[]) {
    const artistIndex = (game.currentRound - 1) % playerIds.length;
    const artistId = playerIds[artistIndex];
    const wordObj = await DrawingWordRepository.getRandomWord();
    const secret = wordObj ? wordObj.word : 'Hoa sen';

    game.drawingState = {
      artistId,
      secretWord: secret,
      revealedHint: wordObj ? wordObj.hint : 'Một loài hoa',
      category: wordObj ? wordObj.category : 'Thiên nhiên',
      strokes: [],
      correctGuessers: []
    };

    io.to(roomId).emit('round_started', {
      round: game.currentRound,
      maxRounds: game.maxRounds,
      mode: 'DRAW_GUESS',
      artistId,
      artistName: game.playerNames[artistId] || 'Họa sĩ',
      category: game.drawingState.category,
      wordLength: secret.length,
      roundTime: game.roundTime,
      isArtist: false
    });

    io.to(roomId).emit('artist_secret_word', {
      artistId,
      word: secret,
      hint: game.drawingState.revealedHint
    });
  }

  static addStroke(game: RoomGameState, roomId: string, userId: string, stroke: VectorStroke, io: Server) {
    if (!game.drawingState || game.drawingState.artistId !== userId) return;
    game.drawingState.strokes.push(stroke);
    io.to(roomId).emit('stroke_added', stroke);
  }

  static clearCanvas(game: RoomGameState, roomId: string, userId: string, io: Server) {
    if (!game.drawingState || game.drawingState.artistId !== userId) return;
    game.drawingState.strokes = [];
    io.to(roomId).emit('canvas_cleared');
  }

  static undoStroke(game: RoomGameState, roomId: string, userId: string, io: Server) {
    if (!game.drawingState || game.drawingState.artistId !== userId) return;
    game.drawingState.strokes.pop();
    io.to(roomId).emit('canvas_undo', { remainingCount: game.drawingState.strokes.length });
  }

  static handleGuess(game: RoomGameState, roomId: string, userId: string, guessText: string, io: Server) {
    if (!game.drawingState) return;
    if (game.drawingState.artistId === userId) return;
    if (game.drawingState.correctGuessers.includes(userId)) return;

    const normalizedGuess = guessText.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const secret = game.drawingState.secretWord.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const isMatch = normalizedGuess === secret || normalizedGuess.includes(secret);
    if (isMatch) {
      game.drawingState.correctGuessers.push(userId);
      const order = game.drawingState.correctGuessers.length;

      const scoreResult = MultiplayerScoreEngine.calculate('DRAW_GUESS', {
        mode: 'DRAW_GUESS',
        timeRemaining: game.timeRemaining,
        totalTime: game.roundTime,
        isCorrect: true,
        order
      });

      game.scores[userId] = (game.scores[userId] || 0) + scoreResult.points;
      const artistBonus = Math.round(scoreResult.points * 0.4);
      game.scores[game.drawingState.artistId] = (game.scores[game.drawingState.artistId] || 0) + artistBonus;

      io.to(roomId).emit('player_guessed_correctly', {
        userId,
        userName: game.playerNames[userId],
        pointsAwarded: scoreResult.points,
        order
      });
    }
  }
}
