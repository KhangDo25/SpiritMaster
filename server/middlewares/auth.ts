import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { apiResponse } from '../utils/response';
import { getAuthSession } from '../services/authSession.service';

export interface AuthRequest extends Request {
  user?: { userId: string; id: string; username: string };
  cookies: any;
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token: string | undefined =
    req.cookies?.token || req.headers?.authorization?.split(' ')[1];

  const sessionId: string | undefined = req.cookies?.session_id;

  if (!token && !sessionId) {
    res.status(401).json(
      apiResponse(false, "Authentication required", null, "UNAUTHORIZED")
    );
    return;
  }

  try {
    if (token) {
      const secret = process.env.JWT_SECRET || 'dev-only-insecure-secret';

      const decoded = jwt.verify(token, secret) as any;
      const uid = decoded.userId || decoded.id;

      if (!uid) {
        res.clearCookie('token');
        res.status(401).json(
          apiResponse(false, "Invalid token payload", null, "UNAUTHORIZED")
        );
        return;
      }

      req.user = {
        userId: uid,
        id: uid,
        username: decoded.username || ''
      };

      next();
      return;
    }

    if (sessionId) {
      const session = await getAuthSession(sessionId);

      if (!session) {
        res.clearCookie('session_id');
        res.status(401).json(
          apiResponse(false, "Session expired. Please login again.", null, "UNAUTHORIZED")
        );
        return;
      }

      req.user = {
        userId: session.userId,
        id: session.userId,
        username: session.username
      };

      next();
      return;
    }
  } catch (err) {
    res.clearCookie('token');
    res.clearCookie('session_id');

    res.status(401).json(
      apiResponse(false, "Invalid or expired token", null, "UNAUTHORIZED")
    );
  }
};