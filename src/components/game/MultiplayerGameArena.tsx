import React, { useState, useEffect, useRef } from 'react';
import { DrawingCanvas } from '../drawing/DrawingCanvas';
import { VectorStroke } from '../../types/drawing';
import { DrawGuessGame } from './DrawGuessGame';
import { DrawBattleGame } from './DrawBattleGame';
import { GuessRushGame } from './GuessRushGame';
import { BluffGame } from './BluffGame';
import { SpiritRaceGame } from './SpiritRaceGame';
import { 
  Timer, 
  Send, 
  Crown, 
  Award, 
  Flame, 
  Smile, 
  Sparkles, 
  CheckCircle, 
  HelpCircle,
  Zap,
  Swords,
  Footprints
} from 'lucide-react';
import { Button } from '../ui/Button';

interface Player {
  userId: string;
  name: string;
  score: number;
  isReady?: boolean;
}

interface ChatMessage {
  id: string;
  senderName: string;
  senderId?: string;
  text: string;
  type: 'CHAT' | 'GUESS' | 'SYSTEM' | 'CORRECT';
  timestamp: number;
}

interface MultiplayerGameArenaProps {
  roomId: string;
  currentUserId: string;
  mode: string;
  activeRoundMode: string;
  currentRound: number;
  maxRounds: number;
  roundTime: number;
  timeRemaining: number;
  scores: Record<string, number>;
  players: Player[];
  strokes: VectorStroke[];
  onAddStroke: (stroke: VectorStroke) => void;
  onClearCanvas: () => void;
  onUndoStroke: () => void;
  onSubmitGuess: (guess: string) => void;
  onSendChat: (text: string) => void;
  chatMessages: ChatMessage[];
  // Mode specific data
  drawingArtistId?: string;
  artistSecretWord?: string;
  revealedCategory?: string;
  wordLength?: number;
  revealedHint?: string;
  // Draw battle
  battleArtist1Id?: string;
  battleArtist2Id?: string;
  battleStrokes1?: VectorStroke[];
  battleStrokes2?: VectorStroke[];
  onVoteDrawBattle?: (artistId: string) => void;
  // Bluff
  bluffQuestion?: string;
  bluffStage?: 'SUBMITTING' | 'VOTING' | 'REVEAL';
  bluffOptions?: Array<{ id: string; text: string }>;
  onSubmitBluff?: (answer: string) => void;
  onVoteBluff?: (optionId: string) => void;
  // Guess rush
  rushHints?: string[];
  // Race
  racePositions?: Record<string, { x: number; isGrounded: boolean; coins: number; finished: boolean; finishRank?: number }>;
  onRaceMove?: (data: { x: number; isGrounded: boolean }) => void;
  // Round results & Game finish
  roundResult?: {
    round: number;
    secretOrAnswer?: string;
    summary: string;
    isFinalRound: boolean;
  } | null;
  gameFinishData?: {
    leaderboard: Array<{ userId: string; displayName: string; score: number }>;
    rewards: Array<{ userId: string; rank: number; coinsEarned: number }>;
  } | null;
  onBackToLobby?: () => void;
}

export const MultiplayerGameArena: React.FC<MultiplayerGameArenaProps> = ({
  roomId,
  currentUserId,
  mode,
  activeRoundMode,
  currentRound,
  maxRounds,
  roundTime,
  timeRemaining,
  scores,
  players,
  strokes,
  onAddStroke,
  onClearCanvas,
  onUndoStroke,
  onSubmitGuess,
  onSendChat,
  chatMessages,
  drawingArtistId,
  artistSecretWord,
  revealedCategory,
  wordLength,
  revealedHint,
  battleArtist1Id,
  battleArtist2Id,
  battleStrokes1 = [],
  battleStrokes2 = [],
  onVoteDrawBattle,
  bluffQuestion,
  bluffStage,
  bluffOptions = [],
  onSubmitBluff,
  onVoteBluff,
  rushHints = [],
  racePositions = {},
  onRaceMove,
  roundResult,
  gameFinishData,
  onBackToLobby,
}) => {
  const [inputText, setInputText] = useState('');
  const [bluffInput, setBluffInput] = useState('');
  const [hasVotedBattle, setHasVotedBattle] = useState(false);
  const [hasVotedBluff, setHasVotedBluff] = useState(false);
  const [hasSubmittedBluff, setHasSubmittedBluff] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const isArtist = drawingArtistId === currentUserId;
  const isBattleArtist1 = battleArtist1Id === currentUserId;
  const isBattleArtist2 = battleArtist2Id === currentUserId;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // If drawing or rush mode, handle as guess; otherwise chat
    if (activeRoundMode === 'DRAW_GUESS' || activeRoundMode === 'GUESS_RUSH') {
      onSubmitGuess(inputText.trim());
    } else {
      onSendChat(inputText.trim());
    }
    setInputText('');
  };

  const handleBluffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bluffInput.trim() || hasSubmittedBluff) return;
    onSubmitBluff?.(bluffInput.trim());
    setHasSubmittedBluff(true);
  };

  // Keyboard shortcut for race jump/move
  useEffect(() => {
    if (activeRoundMode !== 'SPIRIT_RACE') return;

    let posX = racePositions[currentUserId]?.x || 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'ArrowRight') {
        posX += 25;
        onRaceMove?.({ x: posX, isGrounded: true });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeRoundMode, racePositions, currentUserId, onRaceMove]);

  // Round Result Modal Overlay
  if (roundResult) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Award className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Kết Quả Vòng {roundResult.round}</h2>
          {roundResult.secretOrAnswer && (
            <div className="bg-slate-800/80 rounded-2xl p-4 mb-4 border border-slate-700">
              <div className="text-xs text-slate-400 mb-1">ẨN SỐ / ĐÁP ÁN:</div>
              <div className="text-2xl font-black text-amber-400 tracking-wide">{roundResult.secretOrAnswer}</div>
            </div>
          )}
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">{roundResult.summary}</p>

          <div className="text-xs text-slate-400 animate-pulse">
            {roundResult.isFinalRound ? 'Đang tổng kết giải đấu...' : 'Vòng tiếp theo sẽ bắt đầu sau ít giây...'}
          </div>
        </div>
      </div>
    );
  }

  // Final Victory Podium Modal
  if (gameFinishData) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-xl w-full text-center shadow-2xl">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
            <Crown className="w-12 h-12 animate-bounce" />
          </div>
          <h1 className="text-3xl font-black text-white mb-1">Trận Đấu Kết Thúc!</h1>
          <p className="text-slate-400 text-sm mb-6">Vinh danh các cao thủ của Linh Giới</p>

          <div className="space-y-3 mb-8">
            {gameFinishData.leaderboard.map((player, idx) => {
              const reward = gameFinishData.rewards.find(r => r.userId === player.userId);
              return (
                <div
                  key={player.userId}
                  className={`flex items-center justify-between p-4 rounded-2xl border ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                      : idx === 1
                      ? 'bg-slate-800/80 border-slate-600 text-slate-200'
                      : idx === 2
                      ? 'bg-orange-950/40 border-orange-700/50 text-orange-300'
                      : 'bg-slate-800/40 border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-sm">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    <div className="font-bold text-left">
                      <div>{player.displayName}</div>
                      <div className="text-xs font-normal opacity-75">
                        +{reward?.coinsEarned || 0} Xu thưởng
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-black">{player.score} Điểm</div>
                </div>
              );
            })}
          </div>

          <Button
            size="lg"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-2xl shadow-xl"
            onClick={onBackToLobby}
          >
            Quay Lại Sảnh Chờ
          </Button>
        </div>
      </div>
    );
  }

  const timeRatio = Math.max(0, Math.min(1, timeRemaining / (roundTime || 60)));

  return (
    <div className="w-full h-full flex flex-col max-w-7xl mx-auto p-2 sm:p-4 gap-3 select-none">
      {/* Top Header HUD: Timer, Round, Mode */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Round & Mode info */}
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
            Vòng {currentRound} / {maxRounds}
          </span>
          <span className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
            {activeRoundMode === 'DRAW_GUESS' && <Sparkles className="w-4 h-4 text-amber-400" />}
            {activeRoundMode === 'DRAW_BATTLE' && <Swords className="w-4 h-4 text-rose-400" />}
            {activeRoundMode === 'GUESS_RUSH' && <Zap className="w-4 h-4 text-yellow-400" />}
            {activeRoundMode === 'BLUFF' && <Smile className="w-4 h-4 text-purple-400" />}
            {activeRoundMode === 'SPIRIT_RACE' && <Footprints className="w-4 h-4 text-emerald-400" />}
            {activeRoundMode === 'DRAW_GUESS' && 'Vẽ & Đoán'}
            {activeRoundMode === 'DRAW_BATTLE' && 'Đại Chiến Họa Sĩ'}
            {activeRoundMode === 'GUESS_RUSH' && 'Đoán Cực Tốc'}
            {activeRoundMode === 'BLUFF' && 'Kẻ Lừa Bịp (Bluff)'}
            {activeRoundMode === 'SPIRIT_RACE' && 'Đua Linh Thú'}
          </span>
        </div>

        {/* Word/Prompt Display */}
        <div className="flex-1 text-center hidden md:block">
          {activeRoundMode === 'DRAW_GUESS' && (
            <div>
              {isArtist ? (
                <div className="text-sm font-bold text-amber-300">
                  VẼ TỪ KHÓA: <span className="text-lg uppercase text-white bg-slate-800 px-3 py-1 rounded-lg border border-amber-500/40">{artistSecretWord}</span>
                  <span className="text-xs text-slate-400 ml-2 font-normal">({revealedHint})</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-slate-400">Danh mục: <strong className="text-slate-200">{revealedCategory}</strong></span>
                  <div className="tracking-widest text-lg font-mono font-bold text-amber-400">
                    {Array.from({ length: wordLength || 5 }).map((_, i) => '_ ').join('')}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeRoundMode === 'DRAW_BATTLE' && (
            <div className="text-sm font-bold text-amber-300">
              ĐỀ TÀI CHUNG: <span className="text-lg uppercase text-white bg-slate-800 px-3 py-1 rounded-lg border border-amber-500/40">{artistSecretWord || 'Rồng Lửa'}</span>
            </div>
          )}

          {activeRoundMode === 'GUESS_RUSH' && (
            <div className="text-xs text-slate-300">
              {rushHints.length > 0 ? rushHints[rushHints.length - 1] : 'Đang tải gợi ý...'}
            </div>
          )}

          {activeRoundMode === 'BLUFF' && (
            <div className="text-sm font-semibold text-purple-300 max-w-md truncate mx-auto">
              {bluffQuestion}
            </div>
          )}
        </div>

        {/* Authoritative Timer */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <Timer className={`w-4 h-4 ${timeRemaining <= 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`} />
          <span className={`font-mono text-base font-bold ${timeRemaining <= 10 ? 'text-rose-400' : 'text-slate-200'}`}>
            {timeRemaining}s
          </span>
          <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden ml-1">
            <div 
              className={`h-full transition-all duration-1000 ${
                timeRemaining <= 10 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${timeRatio * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Arena Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-3 min-h-0">
        {/* Left/Center Canvas or Game Area (3 Cols on Desktop) */}
        <div className="lg:col-span-3 flex flex-col h-full min-h-[400px]">
          {/* 1. DRAW & GUESS MODE */}
          {activeRoundMode === 'DRAW_GUESS' && (
            <DrawGuessGame
              isArtist={isArtist}
              strokes={strokes}
              onAddStroke={onAddStroke}
              onClearCanvas={onClearCanvas}
              onUndoStroke={onUndoStroke}
            />
          )}

          {/* 2. DRAW BATTLE MODE */}
          {activeRoundMode === 'DRAW_BATTLE' && (
            <DrawBattleGame
              currentUserId={currentUserId}
              players={players}
              battleArtist1Id={battleArtist1Id}
              battleArtist2Id={battleArtist2Id}
              battleStrokes1={battleStrokes1}
              battleStrokes2={battleStrokes2}
              onAddStroke={onAddStroke}
              onClearCanvas={onClearCanvas}
              onUndoStroke={onUndoStroke}
              onVoteDrawBattle={onVoteDrawBattle}
            />
          )}

          {/* 3. GUESS RUSH MODE */}
          {activeRoundMode === 'GUESS_RUSH' && (
            <GuessRushGame rushHints={rushHints} />
          )}

          {/* 4. BLUFF MODE */}
          {activeRoundMode === 'BLUFF' && (
            <BluffGame
              bluffQuestion={bluffQuestion}
              bluffStage={bluffStage}
              bluffOptions={bluffOptions}
              onSubmitBluff={onSubmitBluff}
              onVoteBluff={onVoteBluff}
            />
          )}

          {/* 5. SPIRIT RACE MODE */}
          {activeRoundMode === 'SPIRIT_RACE' && (
            <SpiritRaceGame
              currentUserId={currentUserId}
              players={players}
              racePositions={racePositions}
              onRaceMove={onRaceMove}
            />
          )}
        </div>

        {/* Right Sidebar: Players list & Chat / Guesses */}
        <div className="lg:col-span-1 flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {/* Players & Scores list */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/50">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Bảng Điểm</div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {players.map((p, idx) => {
                const isCurrentArtist = drawingArtistId === p.userId;
                return (
                  <div
                    key={p.userId}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 rounded-full bg-indigo-600/50 flex items-center justify-center font-bold text-[10px] text-white">
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-slate-200 truncate">
                        {p.name} {p.userId === currentUserId && '(Bạn)'}
                      </span>
                      {isCurrentArtist && (
                        <span className="text-[10px] px-1 bg-amber-500/20 text-amber-300 rounded">Vẽ</span>
                      )}
                    </div>
                    <span className="font-bold font-mono text-amber-400">{scores[p.userId] || 0}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat / Guesses Log */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 min-h-[180px] bg-slate-950/20">
            {chatMessages.map(msg => {
              if (msg.type === 'CORRECT') {
                return (
                  <div key={msg.id} className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{msg.senderName} đã đoán chính xác!</span>
                  </div>
                );
              }
              if (msg.type === 'SYSTEM') {
                return (
                  <div key={msg.id} className="text-center text-[11px] text-slate-500 italic py-1">
                    {msg.text}
                  </div>
                );
              }
              return (
                <div key={msg.id} className="text-xs text-slate-300 leading-relaxed break-words">
                  <strong className="text-slate-400 font-semibold">{msg.senderName}: </strong>
                  <span>{msg.text}</span>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat / Guess Input Box */}
          <form onSubmit={handleSend} className="p-2.5 border-t border-slate-800 bg-slate-950/60 flex gap-2">
            <input
              type="text"
              placeholder={isArtist ? "Bạn đang vẽ, không thể đoán..." : "Nhập phỏng đoán hoặc trò chuyện..."}
              disabled={isArtist && activeRoundMode === 'DRAW_GUESS'}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || (isArtist && activeRoundMode === 'DRAW_GUESS')}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
