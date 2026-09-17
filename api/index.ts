import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

const MOCK_PASSWORDS: readonly string[] = ["08082023", "882003"];

const MOCK_ACCOUNTS = [
  {
    id: "mock-user-khang",
    userId: "mock-user-khang",
    username: "khang",
    email: "khang@linhthuhoi.com",
  },
  {
    id: "mock-user-thu",
    userId: "mock-user-thu",
    username: "thư",
    email: "thu@linhthuhoi.com",
  },
] as const;

function getJwtSecret(): string {
  return process.env.JWT_SECRET || "dev-only-insecure-secret";
}

function findAccount(login: unknown) {
  const value = String(login ?? "").trim().toLowerCase();

  return MOCK_ACCOUNTS.find(
    (account) => account.username.toLowerCase() === value
  );
}

function createToken(
  userId: string,
  username: string,
  hasStarter = false,
  starterSpiritId?: string
): string {
  return jwt.sign(
    {
      userId,
      id: userId,
      username,
      hasStarter,
      starterSpiritId,
    },
    getJwtSecret(),
    {
      expiresIn: "24h",
    }
  );
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

function sendJson(
  res: Response,
  status: number,
  body: unknown
): void {
  res.status(status).json(body);
}

export default function handler(
  req: Request,
  res: Response
): void {
  const path = req.url?.split("?")[0] || "";

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.status(204).end();
    return;
  }

  if (
    req.method === "POST" &&
    (path === "/api/auth/login" ||
      path.endsWith("/api/auth/login"))
  ) {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : req.body || {};

    const account = findAccount(body.login);
    const password = String(body.password ?? "");

    if (
      !account ||
      !MOCK_PASSWORDS.includes(password)
    ) {
      sendJson(res, 401, {
        success: false,
        message: "Invalid username or password",
        errorCode: "INVALID_CREDENTIALS",
      });
      return;
    }

    const token = createToken(
      account.id,
      account.username
    );

    res.setHeader(
      "Set-Cookie",
      `token=${encodeURIComponent(
        token
      )}; Path=/; HttpOnly; Max-Age=86400; Secure; SameSite=None`
    );

    sendJson(res, 200, {
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: account.id,
          userId: account.userId,
          username: account.username,
          email: account.email,
        },
        token,
        isMock: true,
      },
    });

    return;
  }

  if (
    req.method === "GET" &&
    (path === "/api/auth/me" ||
      path.endsWith("/api/auth/me"))
  ) {
    const token = getToken(req);

    if (!token) {
      sendJson(res, 401, {
        success: false,
        message: "Authentication required",
        errorCode: "UNAUTHORIZED",
      });
      return;
    }

    try {
      const decoded = jwt.verify(
        token,
        getJwtSecret()
      ) as {
        userId?: string;
        id?: string;
        username?: string;
        hasStarter?: boolean;
        starterSpiritId?: string;
      };

      const userId = decoded.userId || decoded.id;

      const account = MOCK_ACCOUNTS.find(
        (item) => item.id === userId
      );

      if (!account) {
        sendJson(res, 401, {
          success: false,
          message: "Invalid user",
          errorCode: "UNAUTHORIZED",
        });
        return;
      }

      sendJson(res, 200, {
        success: true,
        message: "User profile retrieved",
        data: {
          id: account.id,
          userId: account.userId,
          username: account.username,
          email: account.email,
          profile: {
            displayName: account.username,
          },
          hasStarter: decoded.hasStarter === true,
          starterSpiritId: decoded.starterSpiritId,
          isMock: true,
        },
      });

      return;
    } catch {
      res.setHeader(
        "Set-Cookie",
        "token=; Path=/; HttpOnly; Max-Age=0"
      );

      sendJson(res, 401, {
        success: false,
        message: "Invalid or expired token",
        errorCode: "UNAUTHORIZED",
      });

      return;
    }
  }

  if (
    req.method === "POST" &&
    (path === "/api/auth/logout" ||
      path.endsWith("/api/auth/logout"))
  ) {
    res.setHeader(
      "Set-Cookie",
      "token=; Path=/; HttpOnly; Max-Age=0"
    );

    sendJson(res, 200, {
      success: true,
      message: "Logout successful",
      data: null,
    });

    return;
  }

  sendJson(res, 404, {
    success: false,
    message: "API endpoint not found",
    errorCode: "NOT_FOUND",
  });
}