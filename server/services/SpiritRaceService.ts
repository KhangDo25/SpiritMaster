import { Server } from 'socket.io';
import { RoomGameState } from './RoomGameService';
import { MultiplayerScoreEngine } from './scoring/MultiplayerScoreEngine';

export class SpiritRaceService {
  static startRound(game: RoomGameState, roomId: string, io: Server, playerIds: string[]) {
    const obstacles: Array<{ x: number; type: 'TRAP' | 'COIN' | 'BOOST' | 'SHIELD' }> = [];
    for (let x = 300; x < 2000; x += 150) {
      const types: Array<'TRAP' | 'COIN' | 'BOOST' | 'SHIELD'> = ['TRAP', 'COIN', 'COIN', 'BOOST', 'SHIELD'];
      obstacles.push({
        x,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }

    const playersObj: Record<string, any> = {};
    for (const id of playerIds) {
      playersObj[id] = { x: 0, isGrounded: true, coins: 0, finished: false };
    }

    game.raceState = {
      trackLength: 2000,
      players: playersObj,
      obstacles
    };

    io.to(roomId).emit('round_started', {
      round: game.currentRound,
      maxRounds: game.maxRounds,
      mode: 'SPIRIT_RACE',
      trackLength: 2000,
      obstacles,
      roundTime: game.roundTime
    });
  }

  static handleRaceMove(game: RoomGameState, roomId: string, userId: string, data: { x: number; isGrounded: boolean }, io: Server) {
    if (!game.raceState || !game.raceState.players[userId]) return;
    const player = game.raceState.players[userId];
    if (player.finished) return;

    // Authoritative position validation (max speed check)
    const delta = data.x - player.x;
    if (delta > 0 && delta <= 120) {
      player.x = data.x;
      player.isGrounded = data.isGrounded;

      // Check finish line
      if (player.x >= game.raceState.trackLength) {
        player.finished = true;
        const finishedCount = Object.values(game.raceState.players).filter((p: any) => p.finished).length;

        const scoreResult = MultiplayerScoreEngine.calculate('SPIRIT_RACE', {
          mode: 'SPIRIT_RACE',
          timeRemaining: game.timeRemaining,
          totalTime: game.roundTime,
          isCorrect: true,
          order: finishedCount
        });

        game.scores[userId] = (game.scores[userId] || 0) + scoreResult.points;

        io.to(roomId).emit('race_player_finished', {
          userId,
          userName: game.playerNames[userId],
          place: finishedCount,
          points: scoreResult.points
        });
      }

      io.to(roomId).emit('race_position_updated', {
        userId,
        x: player.x,
        isGrounded: player.isGrounded,
        coins: player.coins
      });
    }
  }
}
