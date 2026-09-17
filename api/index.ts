import { appReady } from "../server";

let ready: Promise<import("express").Express> | null = appReady;

async function getApp(): Promise<import("express").Express> {
  return ready ?? (ready = appReady);
}

export default async function handler(req: any, res: any): Promise<void> {
  try {
    const app = await getApp();
    await new Promise<void>((resolve, reject) => {
      app(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (err) {
    console.error("[api/index] Unhandled handler error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, message: "Internal server error", errorCode: "INTERNAL_ERROR", detail: String(err?.message || err) }));
    }
  }
}
