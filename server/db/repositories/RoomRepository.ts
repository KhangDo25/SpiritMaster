import { db } from '../index';
import { rooms, roomPlayers, users } from '../schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { ensureUserExists } from '../../utils/ensureUser';

export class RoomRepository {
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static async createRoom(
    hostId: string, 
    mode: string, 
    theme: string, 
    maxRounds: number, 
    roundTimeSeconds: number,
    maxPlayers: number
  ) {
    const user = await ensureUserExists(hostId);
    const validHostId = user ? user.id : hostId;

    let code = '';
    let isUnique = false;
    
    // Ensure room code is unique
    while (!isUnique) {
      code = this.generateRoomCode();
      const existing = await db.query.rooms.findFirst({
        where: eq(rooms.code, code)
      });
      if (!existing) isUnique = true;
    }

    const roomId = uuidv4();
    
    await db.insert(rooms).values({
      id: roomId,
      code,
      hostId: validHostId,
      mode,
      theme,
      maxRounds,
      roundTimeSeconds,
      maxPlayers,
      status: 'LOBBY'
    });

    // Add host as a player
    await db.insert(roomPlayers).values({
      id: uuidv4(),
      roomId,
      userId: validHostId,
      isReady: true, // Host is implicitly ready or can toggle
    }).onConflictDoNothing();

    return { id: roomId, code };
  }

  static async getRoomByCode(code: string) {
    return await db.query.rooms.findFirst({
      where: eq(rooms.code, code),
      with: {
        host: true,
        players: {
          with: {
            user: true
          }
        }
      }
    });
  }

  static async getRoomById(id: string) {
    return await db.query.rooms.findFirst({
      where: eq(rooms.id, id),
      with: {
        host: true,
        players: {
          with: {
            user: true
          }
        }
      }
    });
  }

  static async joinRoom(roomId: string, userId: string) {
    const user = await ensureUserExists(userId);
    const validUserId = user ? user.id : userId;

    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId)
    });
    if (!room) {
      return null;
    }

    const existing = await db.query.roomPlayers.findFirst({
      where: and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, validUserId))
    });

    if (existing) {
      // Update connection state if rejoining
      await db.update(roomPlayers).set({ connectionState: 'CONNECTED' }).where(eq(roomPlayers.id, existing.id));
      return existing;
    }

    const newPlayerId = uuidv4();
    try {
      await db.insert(roomPlayers).values({
        id: newPlayerId,
        roomId,
        userId: validUserId,
      }).onConflictDoNothing();
    } catch (insertErr) {
      console.warn("[RoomRepository.joinRoom] Insert warning:", insertErr);
    }

    return await db.query.roomPlayers.findFirst({
      where: and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, validUserId))
    });
  }

  static async updatePlayerConnectionState(roomId: string, userId: string, state: 'CONNECTED' | 'DISCONNECTED') {
    await db.update(roomPlayers).set({ connectionState: state }).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  static async transferHost(roomId: string, currentHostId: string, newHostId: string) {
    const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
    if (!room || room.hostId !== currentHostId) {
      throw new Error("Unauthorized or room not found");
    }

    // Verify new host is in the room
    const isPlayerInRoom = await db.query.roomPlayers.findFirst({
      where: and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, newHostId))
    });

    if (!isPlayerInRoom) {
      throw new Error("New host is not in the room");
    }

    await db.update(rooms).set({ hostId: newHostId }).where(eq(rooms.id, roomId));
  }

  static async removePlayer(roomId: string, userId: string) {
    await db.delete(roomPlayers).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  static async setPlayerReady(roomId: string, userId: string, isReady: boolean) {
    await db.update(roomPlayers).set({ isReady }).where(and(eq(roomPlayers.roomId, roomId), eq(roomPlayers.userId, userId)));
  }

  static async updateRoomStatus(roomId: string, status: string) {
    await db.update(rooms).set({ status }).where(eq(rooms.id, roomId));
  }
}
