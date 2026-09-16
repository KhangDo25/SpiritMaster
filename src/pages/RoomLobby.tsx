import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MAPS } from '../game/maps';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { io, Socket } from 'socket.io-client';
import { MultiplayerGameArena } from '../components/game/MultiplayerGameArena';
import { VectorStroke } from '../types/drawing';
import { getAuthToken } from '../utils/auth';

export default function RoomLobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGameActive, setIsGameActive] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Game Arena State
  const [activeRoundMode, setActiveRoundMode] = useState<string>('DRAW_GUESS');
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [maxRounds, setMaxRounds] = useState<number>(3);
  const [roundTime, setRoundTime] = useState<number>(60);
  const [timeRemaining, setTimeRemaining] = useState<number>(60);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [strokes, setStrokes] = useState<VectorStroke[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Mode specific states
  const [drawingArtistId, setDrawingArtistId] = useState<string>('');
  const [artistSecretWord, setArtistSecretWord] = useState<string>('');
  const [revealedCategory, setRevealedCategory] = useState<string>('');
  const [wordLength, setWordLength] = useState<number>(5);
  const [revealedHint, setRevealedHint] = useState<string>('');

  // Battle state
  const [battleArtist1Id, setBattleArtist1Id] = useState<string>('');
  const [battleArtist2Id, setBattleArtist2Id] = useState<string>('');
  const [battleStrokes1, setBattleStrokes1] = useState<VectorStroke[]>([]);
  const [battleStrokes2, setBattleStrokes2] = useState<VectorStroke[]>([]);

  // Bluff state
  const [bluffQuestion, setBluffQuestion] = useState<string>('');
  const [bluffStage, setBluffStage] = useState<'SUBMITTING' | 'VOTING' | 'REVEAL'>('SUBMITTING');
  const [bluffOptions, setBluffOptions] = useState<Array<{ id: string; text: string }>>([]);

  // Guess rush state
  const [rushHints, setRushHints] = useState<string[]>([]);

  // Race state
  const [racePositions, setRacePositions] = useState<Record<string, any>>({});

  // Overlays
  const [roundResult, setRoundResult] = useState<any>(null);
  const [gameFinishData, setGameFinishData] = useState<any>(null);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    fetchRoom();
    initSocket();

    return () => {
      socketRef.current?.disconnect();
    };
  }, [roomId]);

  const fetchRoom = async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/rooms/${roomId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) {
        navigate('/dashboard');
        return;
      }
      setRoom(data.data);
      if (data.data.mode) {
        setActiveRoundMode(data.data.mode);
      }
      setMaxRounds(data.data.maxRounds);
      setRoundTime(data.data.roundTimeSeconds);
      if (data.data.status === 'PLAYING') {
        setIsGameActive(true);
      }
    } catch (err) {
      console.error(err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const initSocket = () => {
    const token = getAuthToken();
    const socket = io('/', {
      auth: { token },
      query: { token },
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room_lobby', roomId);
    });

    socket.on('room_updated', (updatedRoom) => {
      const cleanedRoom = {
        ...updatedRoom,
        players: (updatedRoom.players || []).map((p: any) => ({
          userId: p.userId,
          isReady: p.isReady,
          connectionState: p.connectionState,
          displayName: p.displayName || p.user?.username || 'Người chơi',
          isHost: String(p.userId) === String(updatedRoom.hostId)
        }))
      };
      setRoom(cleanedRoom);
      if (updatedRoom.status === 'PLAYING') {
        setIsGameActive(true);
      }
    });

    socket.on('game_started', (data) => {
      setIsGameActive(true);
      setMaxRounds(data.maxRounds);
      setRoundTime(data.roundTime);
      setGameFinishData(null);
    });

    socket.on('game_countdown', (data) => {
      setCountdown(data.count);
      if (data.count === 0) setCountdown(null);
    });

    socket.on('round_started', (data) => {
      setCountdown(null);
      setRoundResult(null);
      setCurrentRound(data.round);
      setMaxRounds(data.maxRounds);
      setActiveRoundMode(data.mode);
      setTimeRemaining(data.roundTime || 60);
      setStrokes([]);
      setBattleStrokes1([]);
      setBattleStrokes2([]);
      setRevealedCategory(data.category || '');
      setWordLength(data.wordLength || 5);
      setDrawingArtistId(data.artistId || '');
      setBattleArtist1Id(data.artist1Id || '');
      setBattleArtist2Id(data.artist2Id || '');

      if (data.mode === 'GUESS_RUSH' && data.initialHint) {
        setRushHints([data.initialHint]);
      } else {
        setRushHints([]);
      }

      if (data.mode === 'BLUFF') {
        setBluffQuestion(data.question);
        setBluffStage('SUBMITTING');
        setBluffOptions([]);
      }

      if (data.mode === 'SPIRIT_RACE') {
        setRacePositions({});
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          senderName: 'Hệ thống',
          text: `--- BẮT ĐẦU VÒNG ${data.round}: ${data.mode} ---`,
          type: 'SYSTEM',
          timestamp: Date.now()
        }
      ]);
    });

    socket.on('artist_secret_word', (data) => {
      const myId = user?.id || user?.userId;
      if (String(data.artistId) === String(myId)) {
        setArtistSecretWord(data.word);
        setRevealedHint(data.hint);
      }
    });

    socket.on('timer_sync', (data) => {
      setTimeRemaining(data.timeRemaining);
    });

    // Drawing Events
    socket.on('stroke_added', (stroke: VectorStroke) => {
      setStrokes(prev => [...prev, stroke]);
    });

    socket.on('canvas_cleared', () => {
      setStrokes([]);
    });

    socket.on('canvas_undo', () => {
      setStrokes(prev => prev.slice(0, -1));
    });

    socket.on('battle_stroke_added', ({ artistIndex, stroke }: { artistIndex: number; stroke: VectorStroke }) => {
      if (artistIndex === 1) {
        setBattleStrokes1(prev => [...prev, stroke]);
      } else {
        setBattleStrokes2(prev => [...prev, stroke]);
      }
    });

    socket.on('battle_canvas_cleared', ({ artistIndex }: { artistIndex: number }) => {
      if (artistIndex === 1) {
        setBattleStrokes1([]);
      } else {
        setBattleStrokes2([]);
      }
    });

    socket.on('battle_canvas_undo', ({ artistIndex }: { artistIndex: number }) => {
      if (artistIndex === 1) {
        setBattleStrokes1(prev => prev.slice(0, -1));
      } else {
        setBattleStrokes2(prev => prev.slice(0, -1));
      }
    });

    // Guess & Scoring Events
    socket.on('player_guessed_correctly', (data) => {
      setScores(data.updatedScores);
      setChatMessages(prev => [
        ...prev,
        {
          id: `correct-${Date.now()}-${data.userId}`,
          senderName: data.displayName,
          text: `Đã đoán chính xác (+${data.pointsAwarded} điểm)!`,
          type: 'CORRECT',
          timestamp: Date.now()
        }
      ]);
    });

    socket.on('rush_hint_revealed', (data) => {
      setRushHints(prev => [...prev, data.hint]);
    });

    socket.on('bluff_voting_started', (data) => {
      setBluffStage('VOTING');
      setBluffOptions(data.options);
    });

    socket.on('race_positions_updated', (data) => {
      setRacePositions(data.players);
    });

    // Chat Events
    socket.on('chat_message', (msg) => {
      setChatMessages(prev => [...prev, msg]);
    });

    // Round End
    socket.on('round_ended', (data) => {
      setRoundResult(data);
      setScores(data.scores);
    });

    // Game Finished
    socket.on('game_finished', (data) => {
      setRoundResult(null);
      setGameFinishData(data);
    });

    // Reconnection handling (Task 9.5)
    socket.on('game_reconnected', ({ gameState }) => {
      setIsGameActive(true);
      setCurrentRound(gameState.currentRound);
      setMaxRounds(gameState.maxRounds);
      setActiveRoundMode(gameState.activeRoundMode);
      setTimeRemaining(gameState.timeRemaining);
      setScores(gameState.scores);
      if (gameState.drawingState) {
        setDrawingArtistId(gameState.drawingState.artistId);
        setRevealedCategory(gameState.drawingState.category);
        setWordLength(gameState.drawingState.secretWord.length);
        setStrokes(gameState.drawingState.strokes || []);
      }
    });

    socket.on('player_kicked', (kickedUserId) => {
      if (kickedUserId === user?.id) {
        alert("Bạn đã bị mời ra khỏi phòng.");
        navigate('/dashboard');
      }
    });

    socket.on('error', (msg) => {
      console.error("Socket error:", msg);
    });
  };

  const toggleReady = () => {
    const myId = user?.id || user?.userId;
    const me = room?.players.find((p: any) => String(p.userId) === String(myId));
    if (me) {
      socketRef.current?.emit('toggle_ready', !me.isReady);
    }
  };

  const handleStartGame = () => {
    socketRef.current?.emit('start_game');
  };

  const kickPlayer = (playerId: string) => {
    socketRef.current?.emit('kick_player', playerId);
  };

  const transferHost = (playerId: string) => {
    socketRef.current?.emit('transfer_host', playerId);
  };

  const leaveRoom = () => {
    socketRef.current?.disconnect();
    navigate('/dashboard');
  };

  // Drawing event triggers to backend
  const handleAddStroke = (stroke: VectorStroke) => {
    socketRef.current?.emit('draw_stroke', stroke);
  };

  const handleClearCanvas = () => {
    socketRef.current?.emit('clear_canvas');
  };

  const handleUndoStroke = () => {
    socketRef.current?.emit('undo_stroke');
  };

  const handleSubmitGuess = (text: string) => {
    socketRef.current?.emit('submit_guess', text);
  };

  const handleSendChat = (text: string) => {
    socketRef.current?.emit('send_chat', text);
  };

  const handleVoteDrawBattle = (artistId: string) => {
    socketRef.current?.emit('vote_draw_battle', artistId);
  };

  const handleSubmitBluff = (answer: string) => {
    socketRef.current?.emit('submit_bluff_answer', answer);
  };

  const handleVoteBluff = (optionId: string) => {
    socketRef.current?.emit('vote_bluff_option', optionId);
  };

  const handleRaceMove = (data: { x: number; isGrounded: boolean }) => {
    socketRef.current?.emit('update_race_position', data);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="animate-pulse font-medium">Đang kết nối phòng đấu...</div>
      </div>
    );
  }

  if (!room) return null;

  const currentUserId = user?.id || user?.userId || '';
  const me = room.players.find((p: any) => String(p.userId) === String(currentUserId));
  const isHost = me?.isHost;
  const mapConfig = MAPS[room.theme];

  // If Game is active, render full Multiplayer Game Arena!
  if (isGameActive) {
    const formattedPlayers = room.players.map((p: any) => ({
      userId: p.userId,
      name: p.displayName,
      score: scores[p.userId] || 0,
      isReady: p.isReady
    }));

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col relative text-white">
        {countdown !== null && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center">
            <div className="text-xl font-bold text-indigo-400 mb-2">TRẬN ĐẤU CHUẨN BỊ BẮT ĐẦU!</div>
            <div className="text-8xl font-black text-amber-400 animate-ping">{countdown}</div>
          </div>
        )}

        <MultiplayerGameArena
          roomId={roomId!}
          currentUserId={currentUserId}
          mode={room.mode}
          activeRoundMode={activeRoundMode}
          currentRound={currentRound}
          maxRounds={maxRounds}
          roundTime={roundTime}
          timeRemaining={timeRemaining}
          scores={scores}
          players={formattedPlayers}
          strokes={strokes}
          onAddStroke={handleAddStroke}
          onClearCanvas={handleClearCanvas}
          onUndoStroke={handleUndoStroke}
          onSubmitGuess={handleSubmitGuess}
          onSendChat={handleSendChat}
          chatMessages={chatMessages}
          drawingArtistId={drawingArtistId}
          artistSecretWord={artistSecretWord}
          revealedCategory={revealedCategory}
          wordLength={wordLength}
          revealedHint={revealedHint}
          battleArtist1Id={battleArtist1Id}
          battleArtist2Id={battleArtist2Id}
          battleStrokes1={battleStrokes1}
          battleStrokes2={battleStrokes2}
          onVoteDrawBattle={handleVoteDrawBattle}
          bluffQuestion={bluffQuestion}
          bluffStage={bluffStage}
          bluffOptions={bluffOptions}
          onSubmitBluff={handleSubmitBluff}
          onVoteBluff={handleVoteBluff}
          rushHints={rushHints}
          racePositions={racePositions}
          onRaceMove={handleRaceMove}
          roundResult={roundResult}
          gameFinishData={gameFinishData}
          onBackToLobby={() => {
            setIsGameActive(false);
            setGameFinishData(null);
          }}
        />
      </div>
    );
  }

  // Pre-game Lobby View
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col p-4 sm:p-6">
      <header className="max-w-6xl mx-auto w-full flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-wider flex items-center gap-3">
            Sảnh Chờ Thi Đấu
            <span className="bg-indigo-900/60 border border-indigo-500/40 text-indigo-300 px-3 py-1 rounded-xl text-lg font-mono tracking-widest">
              {room.code}
            </span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Chế độ: <span className="text-white font-bold">{room.mode}</span> | 
            Chủ đề: <span className="text-indigo-400 font-bold">{mapConfig?.name || room.theme}</span> | 
            Số vòng: <span className="text-white font-bold">{room.maxRounds}</span> | 
            Thời gian: <span className="text-white font-bold">{room.roundTimeSeconds}s</span>
          </p>
        </div>
        <Button variant="ghost" onClick={leaveRoom} className="text-slate-400 hover:text-white">
          Rời Phòng
        </Button>
      </header>

      <main className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Players List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800 pb-2">
            Danh Sách Người Chơi ({room.players.length}/{room.maxPlayers})
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {room.players.map((p: any) => (
              <Card 
                key={p.userId} 
                className={`flex justify-between items-center bg-slate-900 border-slate-800 p-4 rounded-2xl ${
                  p.connectionState === 'DISCONNECTED' ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className={`w-3.5 h-3.5 rounded-full ${
                      p.isReady 
                        ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]' 
                        : 'bg-slate-600'
                    }`} 
                  />
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-2 text-sm">
                      {p.displayName}
                      {String(p.userId) === String(currentUserId) && <span className="text-xs text-indigo-400 font-normal">(Bạn)</span>}
                      {p.isHost && (
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-bold">
                          CHỦ PHÒNG
                        </span>
                      )}
                    </div>
                    {p.connectionState === 'DISCONNECTED' && (
                      <div className="text-[11px] text-rose-400">Đã mất kết nối</div>
                    )}
                  </div>
                </div>

                {isHost && String(p.userId) !== String(currentUserId) && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => transferHost(p.userId)} 
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Nhượng quyền
                    </button>
                    <button 
                      onClick={() => kickPlayer(p.userId)} 
                      className="text-xs text-rose-400 hover:text-rose-300"
                    >
                      Đuổi
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>

        {/* Lobby Controls */}
        <div>
          <Card className="sticky top-6 border-slate-800 bg-slate-900/90 rounded-2xl p-6">
            <h3 className="text-base font-bold text-slate-300 uppercase tracking-wider mb-4">Trạng Thái</h3>
            
            <div className="space-y-3 mb-6">
              <Button 
                size="lg"
                className={`w-full py-3.5 rounded-2xl font-bold ${
                  me?.isReady 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                onClick={toggleReady}
              >
                {me?.isReady ? '✓ Đã Sẵn Sàng!' : 'Bấm Để Sẵn Sàng'}
              </Button>
            </div>

            {isHost && (
              <div className="pt-4 border-t border-slate-800">
                <Button 
                  size="lg"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-2xl font-bold shadow-lg" 
                  disabled={!room.players.every((p: any) => p.isReady)}
                  onClick={handleStartGame}
                >
                  Bắt Đầu Trận Đấu
                </Button>
                {!room.players.every((p: any) => p.isReady) && (
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Đang đợi tất cả người chơi sẵn sàng...
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
