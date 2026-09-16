import { Router } from 'express';
import { requireAuth, AuthRequest } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { apiResponse } from '../utils/response';
import { createRoomSchema, joinRoomSchema } from '../dtos/room.dto';
import { normalizeGameMode } from '../types/gameMode';
import { RoomRepository } from '../db/repositories/RoomRepository';
import { db } from '../db';
import { roomPlayers } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export const roomRouter = Router();

// Create Room Handler
const handleCreateRoom = async (req: AuthRequest, res: any, next: any) => {
  try {
    const userId = req.user!.userId;
    const { mode, theme, maxRounds, roundTimeSeconds, maxPlayers } = req.body;
    const normalizedMode = normalizeGameMode(mode) || 'DRAW_GUESS';

    const room = await RoomRepository.createRoom(
      userId,
      normalizedMode,
      theme,
      maxRounds,
      roundTimeSeconds,
      maxPlayers
    );

    res.json(apiResponse(true, "Room created successfully", room));
  } catch (err) {
    next(err);
  }
};

// Create Room - support both POST /api/rooms and POST /api/rooms/create
roomRouter.post('/', requireAuth, validate(createRoomSchema), handleCreateRoom);
roomRouter.post('/create', requireAuth, validate(createRoomSchema), handleCreateRoom);

// Join Room
roomRouter.post('/join', requireAuth, validate(joinRoomSchema), async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;

    const room = await RoomRepository.getRoomByCode(code);

    if (!room) {
      return res.status(404).json(apiResponse(false, "Room not found or invalid code"));
    }

    if (room.status !== 'LOBBY') {
      // Allow rejoin if already in room
      const existing = room.players.find(p => p.userId === userId);
      if (!existing) {
        return res.status(400).json(apiResponse(false, "Room is currently in progress"));
      }
    }

    if (room.players.length >= room.maxPlayers) {
      const existing = room.players.find(p => p.userId === userId);
      if (!existing) {
        return res.status(400).json(apiResponse(false, "Room is full"));
      }
    }

    await RoomRepository.joinRoom(room.id, userId);

    res.json(apiResponse(true, "Joined room successfully", { roomId: room.id }));
  } catch (err) {
    next(err);
  }
});

// Get Room Details
roomRouter.get('/:roomId', requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const { roomId } = req.params;

    let room = await RoomRepository.getRoomById(roomId);

    if (!room) {
      return res.status(404).json(apiResponse(false, "Room not found"));
    }

    // Check if user is in room
    let isPlayer = room.players.some(p => String(p.userId) === String(userId));
    if (!isPlayer) {
      // Auto-join if room is in LOBBY state and has available space
      if (room.status === 'LOBBY' && room.players.length < room.maxPlayers) {
        await RoomRepository.joinRoom(roomId, userId);
        room = await RoomRepository.getRoomById(roomId);
        if (!room) {
          return res.status(404).json(apiResponse(false, "Room not found"));
        }
        isPlayer = true;
      } else {
        return res.status(403).json(apiResponse(false, "You are not in this room"));
      }
    }

    // Clean up response data slightly
    const cleanedRoom = {
      ...room,
      players: room.players.map(p => ({
        userId: p.userId,
        isReady: p.isReady,
        connectionState: p.connectionState,
        displayName: p.user?.username || 'Người chơi',
        isHost: String(p.userId) === String(room!.hostId)
      }))
    };

    res.json(apiResponse(true, "Room details retrieved", cleanedRoom));
  } catch (err) {
    next(err);
  }
});
