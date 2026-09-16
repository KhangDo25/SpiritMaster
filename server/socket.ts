import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RoomRepository } from './db/repositories/RoomRepository';
import { RoomGameService } from './services/RoomGameService';
import { validateStroke } from './dtos/drawing.dto';
import { ChatSanitizer } from './utils/chatSanitizer';
import { ensureUserExists } from './utils/ensureUser';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret';

export const setupSocketHandlers = (io: Server) => {
  // Middleware to authenticate socket connection via JWT
  io.use(async (socket, next) => {
    // Check auth object or handshake query or cookie
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    // Also try reading from cookie if header available
    let extractedToken = token;
    if (!extractedToken && socket.handshake.headers.cookie) {
      const match = socket.handshake.headers.cookie.match(/token=([^;]+)/);
      if (match) extractedToken = match[1];
    }

    if (!extractedToken) {
      return next(new Error('Authentication error: Token required'));
    }

    let decoded: any;
    try {
      decoded = jwt.verify(extractedToken, JWT_SECRET);
    } catch {
      return next(new Error('Authentication error: Invalid token'));
    }

    const uid = decoded?.userId || decoded?.id || decoded?.sub;
    if (!uid) {
      return next(new Error('Authentication error: User ID not found in token'));
    }

    try {
      const user = await ensureUserExists(String(uid), decoded?.username);
      if (!user) {
        return next(new Error('Authentication error: User account not found'));
      }
      socket.data.userId = String(user.id);
      socket.data.username = user.username;
      next();
    } catch (err) {
      console.warn("Socket ensureUserExists warning:", err);
      socket.data.userId = String(uid);
      socket.data.username = decoded?.username || '';
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId;
    console.log(`User connected via socket: ${userId}`);

    // Join room lobby
    socket.on('join_room_lobby', async (roomId: string) => {
      try {
        if (!roomId) {
          socket.emit('error', 'Mã phòng không hợp lệ');
          return;
        }

        const room = await RoomRepository.getRoomById(roomId);
        if (!room) {
          socket.emit('error', 'Phòng chơi không tồn tại hoặc đã kết thúc');
          return;
        }

        // Check if user is in room
        let player = room.players.find(p => String(p.userId) === String(userId));
        
        // Auto-join if room is currently in LOBBY and not full
        if (!player && room.status === 'LOBBY' && room.players.length < room.maxPlayers) {
          await RoomRepository.joinRoom(roomId, userId);
          const reloadedRoom = await RoomRepository.getRoomById(roomId);
          player = reloadedRoom?.players.find(p => String(p.userId) === String(userId));
        }

        if (!player) {
          socket.emit('error', 'Bạn chưa tham gia phòng này hoặc phòng đã đầy');
          return;
        }

        socket.join(roomId);
        socket.data.roomId = roomId;

        await RoomRepository.updatePlayerConnectionState(roomId, userId, 'CONNECTED');
        const displayName = player.user?.username || socket.data.username || 'Người chơi';
        RoomGameService.registerPlayer(roomId, userId, displayName);
        
        // Broadcast updated room state to all in room
        const updatedRoom = await RoomRepository.getRoomById(roomId);
        io.to(roomId).emit('room_updated', updatedRoom);

        // Check if game is already active (Reconnection support - Task 9.5)
        const gameState = RoomGameService.getGame(roomId);
        if (gameState && (gameState.status === 'ROUND_ACTIVE' || gameState.status === 'ROUND_RESULTS')) {
          socket.emit('game_reconnected', {
            gameState,
            myUserId: userId
          });
        }
      } catch (err) {
        console.error("Join room lobby error:", err);
        socket.emit('error', 'Không thể kết nối vào phòng chơi. Vui lòng thử lại.');
      }
    });

    socket.on('toggle_ready', async (isReady: boolean) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      
      try {
        await RoomRepository.setPlayerReady(roomId, userId, isReady);
        const updatedRoom = await RoomRepository.getRoomById(roomId);
        io.to(roomId).emit('room_updated', updatedRoom);
      } catch (err) {
        console.error("Toggle ready error:", err);
      }
    });

    socket.on('transfer_host', async (newHostId: string) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      try {
        await RoomRepository.transferHost(roomId, userId, newHostId);
        const updatedRoom = await RoomRepository.getRoomById(roomId);
        io.to(roomId).emit('room_updated', updatedRoom);
      } catch (err) {
        socket.emit('error', err instanceof Error ? err.message : 'Failed to transfer host');
      }
    });

    socket.on('kick_player', async (playerId: string) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      try {
        const room = await RoomRepository.getRoomById(roomId);
        if (room?.hostId !== userId) {
           return socket.emit('error', 'Only host can kick players');
        }

        if (playerId === userId) {
          return socket.emit('error', 'Cannot kick yourself');
        }

        await RoomRepository.removePlayer(roomId, playerId);
        const updatedRoom = await RoomRepository.getRoomById(roomId);
        io.to(roomId).emit('room_updated', updatedRoom);
        io.to(roomId).emit('player_kicked', playerId);
      } catch (err) {
        console.error("Kick player error:", err);
      }
    });

    // Task 9.3: Authoritative Game Start
    socket.on('start_game', async () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      try {
        const room = await RoomRepository.getRoomById(roomId);
        if (room?.hostId !== userId) {
          return socket.emit('error', 'Only host can start the game');
        }

        // Host starts the game authoritative loop
        await RoomGameService.startGame(roomId, io);
      } catch (err) {
        console.error("Start game error:", err);
      }
    });

    // ==========================================
    // PHASE 10: DRAWING & CANVAS EVENTS
    // ==========================================
    socket.on('draw_stroke', (rawStroke: any) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;

      // Validate normalized vector stroke (Task 10.2)
      const validStroke = validateStroke(rawStroke);
      if (!validStroke) return;

      RoomGameService.addStroke(roomId, userId, validStroke, io);
    });

    socket.on('clear_canvas', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      RoomGameService.clearCanvas(roomId, userId, io);
    });

    socket.on('undo_stroke', () => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      RoomGameService.undoStroke(roomId, userId, io);
    });

    // Task 10.5: Draw Battle Voting
    socket.on('vote_draw_battle', (artistId: string) => {
      const roomId = socket.data.roomId;
      if (!roomId) return;
      RoomGameService.voteDrawBattle(roomId, userId, artistId, io);
    });

    // ==========================================
    // PHASE 11: GUESSING, BLUFF & RACE EVENTS
    // ==========================================
    socket.on('submit_guess', (text: string) => {
      const roomId = socket.data.roomId;
      if (!roomId || typeof text !== 'string') return;

      const clean = ChatSanitizer.sanitizeText(text);
      if (!clean) return;

      RoomGameService.handleGuess(roomId, userId, clean, io);
    });

    socket.on('submit_bluff_answer', (fakeAnswer: string) => {
      const roomId = socket.data.roomId;
      if (!roomId || typeof fakeAnswer !== 'string') return;

      const clean = ChatSanitizer.sanitizeText(fakeAnswer);
      if (!clean) return;

      RoomGameService.submitBluffAnswer(roomId, userId, clean, io);
    });

    socket.on('vote_bluff_option', (optionId: string) => {
      const roomId = socket.data.roomId;
      if (!roomId || typeof optionId !== 'string') return;
      RoomGameService.voteBluffOption(roomId, userId, optionId, io);
    });

    socket.on('update_race_position', (data: { x: number; isGrounded: boolean }) => {
      const roomId = socket.data.roomId;
      if (!roomId || !data) return;
      RoomGameService.updateRacePosition(roomId, userId, data, io);
    });

    // ==========================================
    // PHASE 12: ROOM CHAT (Task 12.1)
    // ==========================================
    socket.on('send_chat', (message: string) => {
      const roomId = socket.data.roomId;
      if (!roomId || typeof message !== 'string') return;

      if (!ChatSanitizer.checkRateLimit(userId)) {
        return socket.emit('chat_error', 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng đợi vài giây.');
      }

      const sanitized = ChatSanitizer.sanitizeText(message);
      if (!sanitized) return;

      const filtered = ChatSanitizer.filterProfanity(sanitized);
      const game = RoomGameService.getGame(roomId);
      const senderName = game?.playerNames[userId] || 'Người chơi';

      io.to(roomId).emit('chat_message', {
        id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: userId,
        senderName,
        text: filtered,
        type: 'CHAT',
        timestamp: Date.now()
      });
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      const roomId = socket.data.roomId;
      if (roomId) {
        try {
          await RoomRepository.updatePlayerConnectionState(roomId, userId, 'DISCONNECTED');
          RoomGameService.handlePlayerDisconnect(roomId, userId, io);
          
          // Handle host disconnect
          const room = await RoomRepository.getRoomById(roomId);
          if (room && room.hostId === userId) {
            const newHost = room.players.find(p => p.userId !== userId && p.connectionState === 'CONNECTED');
            if (newHost) {
              await RoomRepository.transferHost(roomId, userId, newHost.userId);
            }
          }
          
          const updatedRoom = await RoomRepository.getRoomById(roomId);
          io.to(roomId).emit('room_updated', updatedRoom);
        } catch (err) {
          console.error("Disconnect handling error:", err);
        }
      }
    });
  });
};

export const setupSocketIO = setupSocketHandlers;
