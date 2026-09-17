import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

const STARTER_SPIRITS = [
  {
    id: "spirit-hoa-khuyen",
    name: "Hỏa Khuyển",
    realm: "Hỏa",
    rarity: "COMMON",
    isActive: true,
  },
  {
    id: "spirit-thuy-ngu",
    name: "Thủy Ngư",
    realm: "Thủy",
    rarity: "COMMON",
    isActive: true,
  },
  {
    id: "spirit-moc-tinh",
    name: "Mộc Tinh",
    realm: "Mộc",
    rarity: "COMMON",
    isActive: true,
  },
  {
    id: "spirit-loi-dieu",
    name: "Lôi Điểu",
    realm: "Lôi",
    rarity: "COMMON",
    isActive: true,
  },
  {
    id: "spirit-anh-mieu",
    name: "Ảnh Miêu",
    realm: "Ảnh",
    rarity: "COMMON",
    isActive: true,
  },
  {
    id: "spirit-quang-loc",
    name: "Quang Lộc",
    realm: "Quang",
    rarity: "COMMON",
    isActive: true,
  },
];

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
  if (req.method !== "GET") {
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

  try {
    jwt.verify(token, getJwtSecret());
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
      errorCode: "UNAUTHORIZED",
    });
    return;
  }

  res.status(200).json({
    success: true,
    message: "Starter spirits retrieved",
    data: STARTER_SPIRITS,
  });
}
