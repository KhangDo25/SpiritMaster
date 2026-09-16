import { Request, Response, NextFunction } from "express";
import { BusinessException } from "../errors/BusinessException";
import { apiResponse } from "../utils/response";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof BusinessException) {
    console.warn(`[Business Warning] ${err.message} (${err.errorCode})`);
    res.status(err.statusCode).json(
      apiResponse(false, err.message, null, err.errorCode)
    );
    return;
  }

  if (err.name === 'SqliteError' && err.message?.includes('FOREIGN KEY constraint failed')) {
    console.warn(`[Database Warning] Foreign key constraint handled: ${err.message}`);
    res.status(400).json(
      apiResponse(false, "Dữ liệu liên kết không hợp lệ hoặc phiên đã hết hạn", null, "FOREIGN_KEY_MISMATCH")
    );
    return;
  }

  if (err.name === 'SqliteError' && String((err as any)?.message || '').includes('UNIQUE constraint failed')) {
    const msg = String((err as any)?.message || '');
    const isEmail = msg.includes('users.email');
    res.status(409).json(
      apiResponse(false, isEmail ? "Email already exists" : "Username already exists", null, isEmail ? "EMAIL_EXISTS" : "USER_EXISTS")
    );
    return;
  }

  if ((err as any)?.code === 'ER_DUP_ENTRY') {
    const msg = String((err as any)?.sqlMessage || '');
    const isEmail = msg.includes('users.email') || (msg.includes('email') && !msg.includes('username'));
    res.status(409).json(
      apiResponse(false, isEmail ? "Email already exists" : "Username already exists", null, isEmail ? "EMAIL_EXISTS" : "USER_EXISTS")
    );
    return;
  }

  if ((err as any)?.code === 'ECONNREFUSED' || (err as any)?.code === 'ETIMEDOUT') {
    res.status(503).json(
      apiResponse(false, "Authentication service temporarily unavailable. Please try again.", null, "DB_UNAVAILABLE")
    );
    return;
  }
  
  console.error(`[Fatal Error] ${err.name}: ${err.message}`, err);

  res.status(500).json(
    apiResponse(false, "Internal Server Error", null, "INTERNAL_ERROR")
  );
}
