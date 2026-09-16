import { Server } from 'socket.io';
import { RoomGameState } from './RoomGameService';
import { DrawingWordRepository } from '../db/repositories/DrawingWordRepository';
import { VectorStroke } from '../../src/types/drawing';

export class DrawBattleService {
  static async startRound(game: RoomGameState, roomId: string, io: Server, playerIds: string[]) {
    const artist1 = playerIds[0];
    const artist2 = playerIds[1] || playerIds[0];
    const wordObj = await DrawingWordRepository.getRandomWord();
    const secret = wordObj ? wordObj.word : 'Rồng Lửa';

    game.drawBattleState = {
      artist1Id: artist1,
      artist2Id: artist2,
      secretWord: secret,
      category: wordObj ? wordObj.category : 'Thần thoại',
      strokes1: [],
      strokes2: [],
      votes: {}
    };

    io.to(roomId).emit('round_started', {
      round: game.currentRound,
      maxRounds: game.maxRounds,
      mode: 'DRAW_BATTLE',
      artist1Id: artist1,
      artist2Id: artist2,
      artist1Name: game.playerNames[artist1] || 'Họa Sĩ 1',
      artist2Name: game.playerNames[artist2] || 'Họa Sĩ 2',
      category: game.drawBattleState.category,
      roundTime: game.roundTime,
      word: secret
    });
  }

  static addStroke(game: RoomGameState, roomId: string, userId: string, stroke: VectorStroke, io: Server) {
    if (!game.drawBattleState) return;
    if (game.drawBattleState.artist1Id === userId) {
      game.drawBattleState.strokes1.push(stroke);
      io.to(roomId).emit('battle_stroke_added', { artistIndex: 1, stroke });
    } else if (game.drawBattleState.artist2Id === userId) {
      game.drawBattleState.strokes2.push(stroke);
      io.to(roomId).emit('battle_stroke_added', { artistIndex: 2, stroke });
    }
  }

  static clearCanvas(game: RoomGameState, roomId: string, userId: string, io: Server) {
    if (!game.drawBattleState) return;
    if (game.drawBattleState.artist1Id === userId) {
      game.drawBattleState.strokes1 = [];
      io.to(roomId).emit('battle_canvas_cleared', { artistIndex: 1 });
    } else if (game.drawBattleState.artist2Id === userId) {
      game.drawBattleState.strokes2 = [];
      io.to(roomId).emit('battle_canvas_cleared', { artistIndex: 2 });
    }
  }

  static undoStroke(game: RoomGameState, roomId: string, userId: string, io: Server) {
    if (!game.drawBattleState) return;
    if (game.drawBattleState.artist1Id === userId) {
      game.drawBattleState.strokes1.pop();
      io.to(roomId).emit('battle_canvas_undo', { artistIndex: 1 });
    } else if (game.drawBattleState.artist2Id === userId) {
      game.drawBattleState.strokes2.pop();
      io.to(roomId).emit('battle_canvas_undo', { artistIndex: 2 });
    }
  }

  static handleVote(game: RoomGameState, roomId: string, voterId: string, artistId: string, io: Server) {
    if (!game.drawBattleState) return;
    // Artists cannot vote for themselves
    if (voterId === game.drawBattleState.artist1Id || voterId === game.drawBattleState.artist2Id) {
      return;
    }
    game.drawBattleState.votes[voterId] = artistId;
    io.to(roomId).emit('battle_vote_recorded', {
      voterId,
      totalVotes: Object.keys(game.drawBattleState.votes).length
    });
  }
}
