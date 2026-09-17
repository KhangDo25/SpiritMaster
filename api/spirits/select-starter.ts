import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

const STARTER_IDS = new Set([
  "spirit-hoa-khuyen",
  "spirit-thuy-ngu",
  "spirit-moc-tinh",
  "spirit-loi-dieu",
  "spirit-anh-mieu",
  "spirit-quang-loc",
]);

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-only-insecure-secret";
}

function getToken(req: Request): string | null {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);

  if (match) {
    return decodeURIComponent(match[1]);
  }

  const authorization = req.headers.authorization;

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return null;
}

export default function handler(
  req: Request,
  res: Response
): void {
  if (req.method !== "POST") {
    res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
    return;
  }

  const token = getToken(req);

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
      errorCode: "UNAUTHORIZED",
    });
    return;
  }

  let decoded: {
    userId?: string;
    id?: string;
    username?: string;
    hasStarter?: boolean;
  };

  try {
    decoded = jwt.verify(
      token,
      getJwtSecret()
    ) as typeof decoded;
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      errorCode: "UNAUTHORIZED",
    });
    return;
  }

  const body =
    typeof req.body === "string"
      ? JSON.parse(req.body || "{}")
      : req.body || {};

  const spiritId = String(body.spiritId || "");

  if (!STARTER_IDS.has(spiritId)) {
    res.status(400).json({
      success: false,
      message: "Invalid starter spirit selected",
      errorCode: "INVALID_SPIRIT",
    });
    return;
  }

  if (decoded.hasStarter === true) {
    res.status(400).json({
      success: false,
      message: "User already has a starting spirit",
      errorCode: "ALREADY_HAS_STARTER",
    });
    return;
  }

  const userId = decoded.userId || decoded.id;

  if (!userId || !decoded.username) {
    res.status(401).json({
      success: false,
      message: "Invalid user",
      errorCode: "UNAUTHORIZED",
    });
    return;
  }

  const newToken = jwt.sign(
    {
      userId,
      id: userId,
      username: decoded.username,
      hasStarter: true,
      starterSpiritId: spiritId,
    },
    getJwtSecret(),
    {
      expiresIn: "24h",
    }
  );

  res.setHeader(
    "Set-Cookie",
    `token=${encodeURIComponent(
      newToken
    )}; Path=/; HttpOnly; Max-Age=86400; Secure; SameSite=None`
  );

  res.status(200).json({
    success: true,
    message: "Starter spirit successfully assigned",
    data: {
      spiritId,
      token: newToken,
    },
  });
}