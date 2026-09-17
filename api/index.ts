import { appReady } from "../server.ts";
import type { Request, Response } from "express";

let appP: Promise<import("express").Express> | null = appReady;

async function getApp(): Promise<import("express").Express> {
  return (appP ?? (appP = appReady)) as Promise<import("express").Express>;
}

export default async function handler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const app = await getApp();

    await new Promise<void>((resolve, reject) => {
      app(req, res, (err?: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err: any) {
    console.error("[api/index] handler error:", err?.message || err);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errorCode: "INTERNAL_ERROR"
      });
    }
  }
}