import { Server } from 'socket.io';
import { VectorStroke } from '../dtos/drawing.dto';
import { DrawingWordRepository } from '../db/repositories/DrawingWordRepository';
import { MultiplayerScoreEngine } from './scoring/MultiplayerScoreEngine';
import { RoomRepository } from '../db/repositories/RoomRepository';
import { db } from '../db';
import { userProfiles } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { ValkeyService } from './valkey.service';
import { DrawBattleService } from './DrawBattleService';
import { GuessRushService } from './GuessRushService';
import { SpiritRaceService } from './SpiritRaceService';
import { DrawingGameService } from './DrawingGameService';
import { BluffService } from './BluffService';

export interface RoomGameState {
  roomId: string;
  status: 'LOBBY' | 'STARTING' | 'ROUND_ACTIVE' | 'ROUND_RESULTS' | 'GAME_OVER';
  mode: string;
  activeRoundMode: string; // resolved mode if RANDOM
  theme: string;
  currentRound: number;
  maxRounds: number;
  roundTime: number;
  timeRemaining: number;
  scores: Record<string, number>; // userId -> score
  playerNames: Record<string, string>; // userId -> displayName
  
  // Mode-specific data
  drawingState?: {
    artistId: string;
    secretWord: string;
    revealedHint: string;
    category: string;
    strokes: VectorStroke[];
    correctGuessers: string[];
  };

  drawBattleState?: {
    artist1Id: string;
    artist2Id: string;
    secretWord: string;
    category: string;
    strokes1: VectorStroke[];
    strokes2: VectorStroke[];
    votes: Record<string, string>; // voterId -> artistId
  };

  guessRushState?: {
    canonicalName: string;
    category: string;
    hints: string[];
    revealedCount: number;
    correctGuessers: string[];
    cooldowns: Record<string, number>; // userId -> timestamp
  };

  bluffState?: {
    question: string;
    correctAnswer: string;
    stage: 'SUBMITTING' | 'VOTING' | 'REVEAL';
    submissions: Record<string, string>; // userId -> fakeAnswer
    options: Array<{ id: string; text: string; authorId?: string }>;
    votes: Record<string, string>; // voterId -> optionId
  };

  raceState?: {
    trackLength: number;
    players: Record<string, { x: number; isGrounded: boolean; coins: number; finished: boolean; finishRank?: number }>;
    obstacles: Array<{ x: number; type: 'TRAP' | 'COIN' | 'BOOST' | 'SHIELD' }>;
  };

  lastRoundResults?: {
    round: number;
    secretOrAnswer?: string;
    scoresAwarded: Record<string, number>;
    summaryText: string;
  };
}

export class RoomGameService {
  private static rooms = new Map<string, RoomGameState>();
  private static roomTimers = new Map<string, NodeJS.Timeout>();
  private static disconnectTimeouts = new Map<string, NodeJS.Timeout>(); // userId -> timeout

  static getOrCreateGame(roomId: string, mode: string, theme: string, maxRounds: number, roundTime: number): RoomGameState {
    let state = this.rooms.get(roomId);
    if (!state) {
      state = {
        roomId,
        status: 'LOBBY',
        mode,
        activeRoundMode: mode,
        theme,
        currentRound: 0,
        maxRounds,
        roundTime,
        timeRemaining: roundTime,
        scores: {},
        playerNames: {},
      };
      this.rooms.set(roomId, state);
    }
    return state;
  }

  static getGame(roomId: string): RoomGameState | undefined {
    return this.rooms.get(roomId);
  }

  static registerPlayer(roomId: string, userId: string, displayName: string) {
    const game = this.rooms.get(roomId);
    if (game) {
      game.playerNames[userId] = displayName;
      if (game.scores[userId] === undefined) {
        game.scores[userId] = 0;
      }
    }
    // Clear disconnect timeout if reconnecting
    const key = `${roomId}:${userId}`;
    const timeout = this.disconnectTimeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this.disconnectTimeouts.delete(key);
    }
  }

  static handlePlayerDisconnect(roomId: string, userId: string, io: Server) {
    const key = `${roomId}:${userId}`;
    // 45 second grace period to preserve match state
    const timeout = setTimeout(async () => {
      this.disconnectTimeouts.delete(key);
      const game = this.rooms.get(roomId);
      if (game) {
        // Player abandoned
        io.to(roomId).emit('chat_message', {
          id: `sys-${Date.now()}`,
          senderName: 'Hệ thống',
          text: `${game.playerNames[userId] || 'Người chơi'} đã rời khỏi trận đấu do mất kết nối.`,
          type: 'SYSTEM',
          timestamp: Date.now()
        });
      }
    }, 45000);
    this.disconnectTimeouts.set(key, timeout);
  }

  // --- GAME FLOW ---
  static async startGame(roomId: string, io: Server) {
    const room = await RoomRepository.getRoomById(roomId);
    if (!room) return;

    const game = this.getOrCreateGame(roomId, room.mode, room.theme, room.maxRounds, room.roundTimeSeconds);
    
    // Populate players
    for (const p of room.players) {
      game.playerNames[p.userId] = p.user.username;
      game.scores[p.userId] = 0;
    }

    game.status = 'STARTING';
    game.currentRound = 0;
    await RoomRepository.updateRoomStatus(roomId, 'PLAYING');

    io.to(roomId).emit('game_started', {
      roomId,
      mode: game.mode,
      maxRounds: game.maxRounds,
      roundTime: game.roundTime
    });

    // Start 3-second countdown to round 1
    let startCountdown = 3;
    const cdInterval = setInterval(() => {
      io.to(roomId).emit('game_countdown', { count: startCountdown });
      startCountdown--;
      if (startCountdown < 0) {
        clearInterval(cdInterval);
        this.startNextRound(roomId, io);
      }
    }, 1000);
  }

  static async startNextRound(roomId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game) return;

    // Clear any previous tick timer
    if (this.roomTimers.has(roomId)) {
      clearInterval(this.roomTimers.get(roomId)!);
      this.roomTimers.delete(roomId);
    }

    game.currentRound++;
    if (game.currentRound > game.maxRounds) {
      await this.endGame(roomId, io);
      return;
    }

    game.status = 'ROUND_ACTIVE';
    game.timeRemaining = game.roundTime;

    // Resolve mode if RANDOM
    const candidateModes = ['DRAW_GUESS', 'DRAW_BATTLE', 'GUESS_RUSH', 'BLUFF', 'SPIRIT_RACE'];
    if (game.mode === 'RANDOM') {
      const randIdx = Math.floor(Math.random() * candidateModes.length);
      game.activeRoundMode = candidateModes[randIdx];
    } else {
      game.activeRoundMode = game.mode === 'BATTLE' ? 'DRAW_GUESS' : game.mode;
    }

    const playerIds = Object.keys(game.playerNames);

    // Initialize round based on activeRoundMode
    if (game.activeRoundMode === 'DRAW_GUESS') {
      await DrawingGameService.startRound(game, roomId, io, playerIds);
    } else if (game.activeRoundMode === 'DRAW_BATTLE') {
      await DrawBattleService.startRound(game, roomId, io, playerIds);
    } else if (game.activeRoundMode === 'GUESS_RUSH') {
      await GuessRushService.startRound(game, roomId, io);
    } else if (game.activeRoundMode === 'BLUFF') {
      BluffService.startRound(game, roomId, io);
    } else if (game.activeRoundMode === 'SPIRIT_RACE') {
      SpiritRaceService.startRound(game, roomId, io, playerIds);
    }

    // Start Authoritative 1-second interval timer
    this.startAuthoritativeTimer(roomId, io);
  }

  static startAuthoritativeTimer(roomId: string, io: Server) {
    const timer = setInterval(() => {
      const game = this.rooms.get(roomId);
      if (!game || game.status !== 'ROUND_ACTIVE') {
        clearInterval(timer);
        return;
      }

      game.timeRemaining--;

      // Progressive hints for Guess Rush every 10s
      if (game.activeRoundMode === 'GUESS_RUSH' && game.guessRushState) {
        const elapsed = game.roundTime - game.timeRemaining;
        if (elapsed % 10 === 0 && game.guessRushState.revealedCount < game.guessRushState.hints.length) {
          game.guessRushState.revealedCount++;
          io.to(roomId).emit('rush_hint_revealed', {
            hint: game.guessRushState.hints[game.guessRushState.revealedCount - 1],
            hintIndex: game.guessRushState.revealedCount - 1
          });
        }
      }

      // Bluff mode stage transitions: after 20s, move from SUBMITTING to VOTING
      if (game.activeRoundMode === 'BLUFF' && game.bluffState && game.bluffState.stage === 'SUBMITTING') {
        if (game.timeRemaining <= game.roundTime - 25) {
          this.transitionBluffToVoting(roomId, io);
        }
      }

      // Emit Authoritative TIMER_SYNC (Task 9.4)
      io.to(roomId).emit('timer_sync', {
        timeRemaining: game.timeRemaining,
        round: game.currentRound,
        totalTime: game.roundTime
      });

      if (game.timeRemaining <= 0) {
        clearInterval(timer);
        this.roomTimers.delete(roomId);
        this.endRound(roomId, io);
      }
    }, 1000);

    this.roomTimers.set(roomId, timer);
  }

  // --- MODE ACTIONS ---

  // Task 10.1 & 10.4: Vector Stroke Sync
  static addStroke(roomId: string, userId: string, stroke: VectorStroke, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || game.status !== 'ROUND_ACTIVE') return;

    if (game.activeRoundMode === 'DRAW_GUESS' && game.drawingState) {
      if (game.drawingState.artistId !== userId) return; // Only artist can draw!
      game.drawingState.strokes.push(stroke);
      io.to(roomId).emit('stroke_added', stroke);
    } else if (game.activeRoundMode === 'DRAW_BATTLE' && game.drawBattleState) {
      if (game.drawBattleState.artist1Id === userId) {
        game.drawBattleState.strokes1.push(stroke);
        io.to(roomId).emit('battle_stroke_added', { artistIndex: 1, stroke });
      } else if (game.drawBattleState.artist2Id === userId) {
        game.drawBattleState.strokes2.push(stroke);
        io.to(roomId).emit('battle_stroke_added', { artistIndex: 2, stroke });
      }
    }
  }

  static clearCanvas(roomId: string, userId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || game.status !== 'ROUND_ACTIVE') return;

    if (game.activeRoundMode === 'DRAW_GUESS' && game.drawingState?.artistId === userId) {
      game.drawingState.strokes = [];
      io.to(roomId).emit('canvas_cleared');
    } else if (game.activeRoundMode === 'DRAW_BATTLE') {
      if (game.drawBattleState?.artist1Id === userId) {
        game.drawBattleState.strokes1 = [];
        io.to(roomId).emit('battle_canvas_cleared', { artistIndex: 1 });
      } else if (game.drawBattleState?.artist2Id === userId) {
        game.drawBattleState.strokes2 = [];
        io.to(roomId).emit('battle_canvas_cleared', { artistIndex: 2 });
      }
    }
  }

  static undoStroke(roomId: string, userId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || game.status !== 'ROUND_ACTIVE') return;

    if (game.activeRoundMode === 'DRAW_GUESS' && game.drawingState?.artistId === userId) {
      game.drawingState.strokes.pop();
      io.to(roomId).emit('canvas_undo', { remainingCount: game.drawingState.strokes.length });
    } else if (game.activeRoundMode === 'DRAW_BATTLE' && game.drawBattleState) {
      if (game.drawBattleState.artist1Id === userId) {
        game.drawBattleState.strokes1.pop();
        io.to(roomId).emit('battle_canvas_undo', { artistIndex: 1 });
      } else if (game.drawBattleState.artist2Id === userId) {
        game.drawBattleState.strokes2.pop();
        io.to(roomId).emit('battle_canvas_undo', { artistIndex: 2 });
      }
    }
  }

  // Task 10.4: Handle Drawing Guess
  static handleGuess(roomId: string, userId: string, guessText: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || game.status !== 'ROUND_ACTIVE') return;

    const normalizedGuess = guessText.trim().toLowerCase();
    const cleanGuess = normalizedGuess.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (game.activeRoundMode === 'DRAW_GUESS' && game.drawingState) {
      if (game.drawingState.artistId === userId) return; // Artist cannot guess
      if (game.drawingState.correctGuessers.includes(userId)) return; // Already guessed

      const secret = game.drawingState.secretWord.toLowerCase();
      const cleanSecret = secret.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      const isMatch = cleanGuess === cleanSecret || cleanGuess.includes(cleanSecret);
      if (isMatch) {
        game.drawingState.correctGuessers.push(userId);
        const order = game.drawingState.correctGuessers.length;

        // Calculate score with Strategy Engine
        const scoreResult = MultiplayerScoreEngine.calculate('DRAW_GUESS', {
          mode: 'DRAW_GUESS',
          timeRemaining: game.timeRemaining,
          totalTime: game.roundTime,
          isCorrect: true,
          order
        });

        game.scores[userId] = (game.scores[userId] || 0) + scoreResult.points;
        // Artist also gets bonus points when people guess their drawing!
        const artistBonus = Math.round(scoreResult.points * 0.4);
        game.scores[game.drawingState.artistId] = (game.scores[game.drawingState.artistId] || 0) + artistBonus;

        io.to(roomId).emit('player_guessed_correctly', {
          userId,
          displayName: game.playerNames[userId],
          pointsAwarded: scoreResult.points,
          order,
          updatedScores: game.scores
        });

        // If everyone (except artist) guessed correctly, end round early
        const nonArtistCount = Object.keys(game.playerNames).length - 1;
        if (game.drawingState.correctGuessers.length >= Math.max(1, nonArtistCount)) {
          setTimeout(() => this.endRound(roomId, io), 1500);
        }
      } else {
        // Normal chat message
        io.to(roomId).emit('chat_message', {
          id: `msg-${Date.now()}`,
          senderId: userId,
          senderName: game.playerNames[userId],
          text: guessText,
          type: 'GUESS',
          timestamp: Date.now()
        });
      }
    } else if (game.activeRoundMode === 'GUESS_RUSH' && game.guessRushState) {
      // Cooldown check (3s for wrong guess)
      const lastAttempt = game.guessRushState.cooldowns[userId] || 0;
      if (Date.now() - lastAttempt < 3000) {
        return; // in cooldown
      }

      if (game.guessRushState.correctGuessers.includes(userId)) return;

      const target = game.guessRushState.canonicalName.toLowerCase();
      const cleanTarget = target.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isMatch = cleanGuess === cleanTarget || cleanGuess.includes(cleanTarget);

      if (isMatch) {
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
          displayName: game.playerNames[userId],
          pointsAwarded: scoreResult.points,
          order,
          updatedScores: game.scores
        });

        if (game.guessRushState.correctGuessers.length >= Object.keys(game.playerNames).length) {
          setTimeout(() => this.endRound(roomId, io), 1500);
        }
      } else {
        game.guessRushState.cooldowns[userId] = Date.now();
        io.to(roomId).emit('chat_message', {
          id: `msg-${Date.now()}`,
          senderId: userId,
          senderName: game.playerNames[userId],
          text: guessText,
          type: 'GUESS',
          timestamp: Date.now()
        });
      }
    }
  }

  // Task 10.5: Draw Battle Voting
  static voteDrawBattle(roomId: string, voterId: string, artistId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || !game.drawBattleState) return;

    // Prevent self-voting
    if (voterId === artistId) return;
    if (voterId === game.drawBattleState.artist1Id || voterId === game.drawBattleState.artist2Id) {
      return; // Contestants cannot vote
    }

    game.drawBattleState.votes[voterId] = artistId;
    io.to(roomId).emit('draw_battle_vote_cast', {
      voterId,
      totalVotes: Object.keys(game.drawBattleState.votes).length
    });
  }

  // Task 11.2: Bluff Submissions & Voting
  static submitBluffAnswer(roomId: string, userId: string, fakeAnswer: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || !game.bluffState || game.bluffState.stage !== 'SUBMITTING') return;

    game.bluffState.submissions[userId] = fakeAnswer.trim();
    io.to(roomId).emit('bluff_answer_submitted', {
      userId,
      submittedCount: Object.keys(game.bluffState.submissions).length,
      totalPlayers: Object.keys(game.playerNames).length
    });

    // If all submitted, advance early
    if (Object.keys(game.bluffState.submissions).length >= Object.keys(game.playerNames).length) {
      this.transitionBluffToVoting(roomId, io);
    }
  }

  static transitionBluffToVoting(roomId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || !game.bluffState || game.bluffState.stage !== 'SUBMITTING') return;

    game.bluffState.stage = 'VOTING';

    // Mix real answer with player submissions anonymously
    const allOptions: Array<{ id: string; text: string; authorId?: string }> = [
      { id: 'real', text: game.bluffState.correctAnswer }
    ];

    Object.entries(game.bluffState.submissions).forEach(([authorId, text]) => {
      allOptions.push({
        id: `fake-${authorId}`,
        text,
        authorId
      });
    });

    // Shuffle options
    allOptions.sort(() => Math.random() - 0.5);
    game.bluffState.options = allOptions;

    // Send options to clients WITHOUT authorId to prevent cheating
    const publicOptions = allOptions.map(opt => ({ id: opt.id, text: opt.text }));
    io.to(roomId).emit('bluff_voting_started', {
      question: game.bluffState.question,
      options: publicOptions,
      votingTime: 20
    });
  }

  static voteBluffOption(roomId: string, voterId: string, optionId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || !game.bluffState || game.bluffState.stage !== 'VOTING') return;

    // Players cannot vote for their own bluff
    const selectedOption = game.bluffState.options.find(o => o.id === optionId);
    if (selectedOption?.authorId === voterId) return;

    game.bluffState.votes[voterId] = optionId;
    io.to(roomId).emit('bluff_vote_received', {
      voterId,
      votedCount: Object.keys(game.bluffState.votes).length
    });

    if (Object.keys(game.bluffState.votes).length >= Object.keys(game.playerNames).length) {
      this.endRound(roomId, io);
    }
  }

  // Task 11.3: Spirit Race Movement
  static updateRacePosition(roomId: string, userId: string, data: { x: number; isGrounded: boolean }, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game || !game.raceState || game.status !== 'ROUND_ACTIVE') return;

    const p = game.raceState.players[userId];
    if (!p || p.finished) return;

    // Server validates distance delta (prevent teleporting / hacking)
    const maxDeltaX = 50; // max speed per tick
    const safeX = Math.min(game.raceState.trackLength, Math.max(p.x, Math.min(p.x + maxDeltaX, data.x)));
    p.x = safeX;
    p.isGrounded = data.isGrounded;

    // Check collisions with coins and obstacles
    for (const obs of game.raceState.obstacles) {
      if (Math.abs(p.x - obs.x) < 25) {
        if (obs.type === 'COIN') {
          p.coins += 1;
        }
      }
    }

    if (p.x >= game.raceState.trackLength && !p.finished) {
      p.finished = true;
      const finishedCount = Object.values(game.raceState.players).filter(pl => pl.finished).length;
      p.finishRank = finishedCount;

      const scoreResult = MultiplayerScoreEngine.calculate('SPIRIT_RACE', {
        mode: 'SPIRIT_RACE',
        timeRemaining: game.timeRemaining,
        totalTime: game.roundTime,
        raceRank: p.finishRank,
        coinsCollected: p.coins
      });

      game.scores[userId] = (game.scores[userId] || 0) + scoreResult.points;

      io.to(roomId).emit('racer_finished', {
        userId,
        displayName: game.playerNames[userId],
        rank: p.finishRank,
        points: scoreResult.points,
        coins: p.coins
      });

      // End round when all or top 3 have finished
      if (finishedCount >= Object.keys(game.raceState.players).length) {
        setTimeout(() => this.endRound(roomId, io), 1500);
      }
    }

    // Broadcast positions periodically or on change
    io.to(roomId).emit('race_positions_updated', {
      players: game.raceState.players
    });
  }

  // --- ROUND & GAME END ---
  static async endRound(roomId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game) return;

    if (this.roomTimers.has(roomId)) {
      clearInterval(this.roomTimers.get(roomId)!);
      this.roomTimers.delete(roomId);
    }

    game.status = 'ROUND_RESULTS';

    let secretOrAnswer = '';
    let summary = '';
    const roundAwarded: Record<string, number> = {};

    if (game.activeRoundMode === 'DRAW_GUESS' && game.drawingState) {
      secretOrAnswer = game.drawingState.secretWord;
      summary = `Từ khóa bí mật là "${secretOrAnswer}". Đã có ${game.drawingState.correctGuessers.length} người đoán đúng!`;
    } else if (game.activeRoundMode === 'DRAW_BATTLE' && game.drawBattleState) {
      secretOrAnswer = game.drawBattleState.secretWord;
      let votesA = 0;
      let votesB = 0;
      Object.values(game.drawBattleState.votes).forEach(aid => {
        if (aid === game.drawBattleState?.artist1Id) votesA++;
        if (aid === game.drawBattleState?.artist2Id) votesB++;
      });

      const winnerId = votesA >= votesB ? game.drawBattleState.artist1Id : game.drawBattleState.artist2Id;
      const loserId = winnerId === game.drawBattleState.artist1Id ? game.drawBattleState.artist2Id : game.drawBattleState.artist1Id;

      const scoreWin = MultiplayerScoreEngine.calculate('DRAW_BATTLE', {
        mode: 'DRAW_BATTLE',
        timeRemaining: 0,
        totalTime: game.roundTime,
        votesReceived: Math.max(votesA, votesB),
        order: 1
      });
      const scoreLose = MultiplayerScoreEngine.calculate('DRAW_BATTLE', {
        mode: 'DRAW_BATTLE',
        timeRemaining: 0,
        totalTime: game.roundTime,
        votesReceived: Math.min(votesA, votesB),
        order: 2
      });

      game.scores[winnerId] = (game.scores[winnerId] || 0) + scoreWin.points;
      game.scores[loserId] = (game.scores[loserId] || 0) + scoreLose.points;

      roundAwarded[winnerId] = scoreWin.points;
      roundAwarded[loserId] = scoreLose.points;

      summary = `Người chiến thắng cuộc chiến vẽ: ${game.playerNames[winnerId]} (${Math.max(votesA, votesB)} phiếu)!`;
    } else if (game.activeRoundMode === 'BLUFF' && game.bluffState) {
      secretOrAnswer = game.bluffState.correctAnswer;
      // Calculate bluff results
      Object.entries(game.bluffState.votes).forEach(([voterId, optionId]) => {
        const isCorrect = optionId === 'real';
        if (isCorrect) {
          const res = MultiplayerScoreEngine.calculate('BLUFF', {
            mode: 'BLUFF',
            timeRemaining: 0,
            totalTime: game.roundTime,
            votedCorrectly: true
          });
          game.scores[voterId] = (game.scores[voterId] || 0) + res.points;
          roundAwarded[voterId] = (roundAwarded[voterId] || 0) + res.points;
        } else {
          // Tricked by author
          const opt = game.bluffState?.options.find(o => o.id === optionId);
          if (opt?.authorId) {
            const authorRes = MultiplayerScoreEngine.calculate('BLUFF', {
              mode: 'BLUFF',
              timeRemaining: 0,
              totalTime: game.roundTime,
              bluffedCount: 1
            });
            game.scores[opt.authorId] = (game.scores[opt.authorId] || 0) + authorRes.points;
            roundAwarded[opt.authorId] = (roundAwarded[opt.authorId] || 0) + authorRes.points;
          }
        }
      });
      summary = `Đáp án chính xác là: "${secretOrAnswer}"!`;
    } else if (game.activeRoundMode === 'GUESS_RUSH' && game.guessRushState) {
      secretOrAnswer = game.guessRushState.canonicalName;
      summary = `Ẩn số là "${secretOrAnswer}". ${game.guessRushState.correctGuessers.length} người giải thành công!`;
    } else if (game.activeRoundMode === 'SPIRIT_RACE' && game.raceState) {
      summary = `Vòng đua kết thúc!`;
    }

    game.lastRoundResults = {
      round: game.currentRound,
      secretOrAnswer,
      scoresAwarded: roundAwarded,
      summaryText: summary
    };

    io.to(roomId).emit('round_ended', {
      round: game.currentRound,
      secretOrAnswer,
      summary,
      scores: game.scores,
      isFinalRound: game.currentRound >= game.maxRounds
    });

    // 5 seconds pause then proceed
    setTimeout(() => {
      if (game.currentRound >= game.maxRounds) {
        this.endGame(roomId, io);
      } else {
        this.startNextRound(roomId, io);
      }
    }, 5000);
  }

  static async endGame(roomId: string, io: Server) {
    const game = this.rooms.get(roomId);
    if (!game) return;

    game.status = 'GAME_OVER';
    await RoomRepository.updateRoomStatus(roomId, 'FINISHED');

    // Rank players by score
    const leaderboard = Object.entries(game.scores)
      .map(([userId, score]) => ({
        userId,
        displayName: game.playerNames[userId] || 'Người chơi',
        score
      }))
      .sort((a, b) => b.score - a.score);

    // Save final scores to roomPlayers & reward coins
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      const rank = i + 1;
      const coinReward = rank === 1 ? 150 : rank === 2 ? 100 : rank === 3 ? 60 : 30;
      
      try {
        await db.update(userProfiles)
          .set({ coins: sql`coins + ${coinReward}` })
          .where(eq(userProfiles.userId, entry.userId));
      } catch (err) {
        console.error("Reward error:", err);
      }
    }

    // Record to Valkey/Redis Realtime Leaderboard
    for (let i = 0; i < leaderboard.length; i++) {
      const entry = leaderboard[i];
      if (i === 0) {
        ValkeyService.updateLeaderboardScore('arena_wins', entry.userId, 1).catch(() => {});
      }
      ValkeyService.updateLeaderboardScore('arena_scores', entry.userId, entry.score).catch(() => {});
    }

    io.to(roomId).emit('game_finished', {
      leaderboard,
      rewards: leaderboard.map((e, idx) => ({
        userId: e.userId,
        rank: idx + 1,
        coinsEarned: idx === 0 ? 150 : idx === 1 ? 100 : idx === 2 ? 60 : 30
      }))
    });

    // Auto Cleanup Room State after 60 seconds of game completion
    setTimeout(async () => {
      this.rooms.delete(roomId);
      await ValkeyService.deleteRoomState(roomId);
      console.log(`[Multiplayer] Room ${roomId} memory & cache auto-cleaned after match completion.`);
    }, 60000);
  }
}
