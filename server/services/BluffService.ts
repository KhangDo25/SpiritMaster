import { Server } from 'socket.io';
import { RoomGameState } from './RoomGameService';
import { MultiplayerScoreEngine } from './scoring/MultiplayerScoreEngine';

const BLUFF_QUESTIONS = [
  { q: "Loài vật nào có thể ngủ khi đang bay liên tục hàng tuần?", a: "Chim yến", fakes: ["Cò trắng", "Đại bàng", "Hải âu"] },
  { q: "Quốc hoa truyền thống của Việt Nam là loài hoa nào?", a: "Hoa sen", fakes: ["Hoa đào", "Hoa mai", "Hoa súng"] },
  { q: "Cổ vật ngàn năm nào của văn hóa Đông Sơn khắc hình chim Lạc?", a: "Trống đồng", fakes: ["Thạp đồng", "Gươm đồng", "Chuông đồng"] },
  { q: "Linh vật nào trong tứ linh tượng trưng cho phương Tây và mùa thu?", a: "Bạch Hổ", fakes: ["Thanh Long", "Chu Tước", "Huyền Vũ"] },
  { q: "Vị anh hùng nào nhổ tre đằng ngà đánh tan giặc Ân thời Hùng Vương?", a: "Thánh Gióng", fakes: ["An Dương Vương", "Lê Lợi", "Thạch Sanh"] }
];

export class BluffService {
  static startRound(game: RoomGameState, roomId: string, io: Server) {
    const qObj = BLUFF_QUESTIONS[(game.currentRound - 1) % BLUFF_QUESTIONS.length];

    game.bluffState = {
      question: qObj.q,
      correctAnswer: qObj.a,
      stage: 'SUBMITTING',
      submissions: {},
      options: [],
      votes: {}
    };

    io.to(roomId).emit('round_started', {
      round: game.currentRound,
      maxRounds: game.maxRounds,
      mode: 'BLUFF',
      question: qObj.q,
      stage: 'SUBMITTING',
      submitTime: Math.min(30, game.roundTime)
    });
  }

  static handleSubmitAnswer(game: RoomGameState, roomId: string, userId: string, answer: string, io: Server) {
    if (!game.bluffState || game.bluffState.stage !== 'SUBMITTING') return;
    const cleanAnswer = answer.trim();
    if (!cleanAnswer) return;

    game.bluffState.submissions[userId] = cleanAnswer;

    io.to(roomId).emit('bluff_submission_received', {
      userId,
      totalSubmissions: Object.keys(game.bluffState.submissions).length,
      totalPlayers: Object.keys(game.playerNames).length
    });

    // If all submitted, advance early
    if (Object.keys(game.bluffState.submissions).length >= Object.keys(game.playerNames).length) {
      this.transitionToVoting(game, roomId, io);
    }
  }

  static transitionToVoting(game: RoomGameState, roomId: string, io: Server) {
    if (!game.bluffState || game.bluffState.stage !== 'SUBMITTING') return;

    game.bluffState.stage = 'VOTING';
    const rawOptions = [
      { id: 'correct_ans', text: game.bluffState.correctAnswer, isReal: true, authorId: null }
    ];

    for (const [authorId, fakeText] of Object.entries(game.bluffState.submissions)) {
      rawOptions.push({
        id: `fake_${authorId}`,
        text: fakeText,
        isReal: false,
        authorId
      });
    }

    // Shuffle options
    const shuffled = rawOptions.sort(() => Math.random() - 0.5);
    game.bluffState.options = shuffled;

    io.to(roomId).emit('bluff_stage_voting', {
      question: game.bluffState.question,
      options: shuffled.map(o => ({ id: o.id, text: o.text }))
    });
  }

  static handleVoteOption(game: RoomGameState, roomId: string, voterId: string, optionId: string, io: Server) {
    if (!game.bluffState || game.bluffState.stage !== 'VOTING') return;
    game.bluffState.votes[voterId] = optionId;

    io.to(roomId).emit('bluff_vote_recorded', {
      voterId,
      totalVotes: Object.keys(game.bluffState.votes).length
    });
  }
}
