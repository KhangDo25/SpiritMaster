import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAuthToken } from '../utils/auth';

export interface UseGameSocketOptions {
  roomId: string;
  onRoomUpdated?: (room: any) => void;
  onGameStarted?: (data: any) => void;
  onRoundStarted?: (data: any) => void;
  onRoundEnded?: (data: any) => void;
  onTimerSync?: (data: { timeRemaining: number; round: number; totalTime: number }) => void;
  onStrokeAdded?: (stroke: any) => void;
  onCanvasCleared?: () => void;
  onCanvasUndo?: (data: any) => void;
  onPlayerGuessedCorrectly?: (data: any) => void;
  onChatMessage?: (message: any) => void;
  onGameFinished?: (data: any) => void;
  onGameReconnected?: (data: any) => void;
  onBattleStrokeAdded?: (data: any) => void;
  onBattleCanvasCleared?: (data: any) => void;
  onBattleCanvasUndo?: (data: any) => void;
  onRushHintRevealed?: (data: any) => void;
  onBluffVotingStarted?: (data: any) => void;
  onRacePositionsUpdated?: (data: any) => void;
  onError?: (err: string) => void;
}

export function useGameSocket(options: UseGameSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Store latest callbacks in ref to avoid re-subscribing on each render
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  useEffect(() => {
    if (!options.roomId) return;

    const token = getAuthToken();
    const socket = io('/', {
      auth: { token },
      query: { token },
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      socket.emit('join_room_lobby', options.roomId);
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setConnectionError(err.message);
      callbacksRef.current.onError?.(err.message);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room_updated', (data) => callbacksRef.current.onRoomUpdated?.(data));
    socket.on('game_started', (data) => callbacksRef.current.onGameStarted?.(data));
    socket.on('round_started', (data) => callbacksRef.current.onRoundStarted?.(data));
    socket.on('round_ended', (data) => callbacksRef.current.onRoundEnded?.(data));
    socket.on('timer_sync', (data) => callbacksRef.current.onTimerSync?.(data));
    socket.on('stroke_added', (data) => callbacksRef.current.onStrokeAdded?.(data));
    socket.on('canvas_cleared', () => callbacksRef.current.onCanvasCleared?.());
    socket.on('canvas_undo', (data) => callbacksRef.current.onCanvasUndo?.(data));
    socket.on('player_guessed_correctly', (data) => callbacksRef.current.onPlayerGuessedCorrectly?.(data));
    socket.on('chat_message', (data) => callbacksRef.current.onChatMessage?.(data));
    socket.on('game_finished', (data) => callbacksRef.current.onGameFinished?.(data));
    socket.on('game_reconnected', (data) => callbacksRef.current.onGameReconnected?.(data));
    socket.on('battle_stroke_added', (data) => callbacksRef.current.onBattleStrokeAdded?.(data));
    socket.on('battle_canvas_cleared', (data) => callbacksRef.current.onBattleCanvasCleared?.(data));
    socket.on('battle_canvas_undo', (data) => callbacksRef.current.onBattleCanvasUndo?.(data));
    socket.on('rush_hint_revealed', (data) => callbacksRef.current.onRushHintRevealed?.(data));
    socket.on('bluff_voting_started', (data) => callbacksRef.current.onBluffVotingStarted?.(data));
    socket.on('race_positions_updated', (data) => callbacksRef.current.onRacePositionsUpdated?.(data));
    socket.on('error', (err) => callbacksRef.current.onError?.(err));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.roomId]);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit
  };
}
