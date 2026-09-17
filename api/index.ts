import { appReady } from "../server";

export default async function handler(req: any, res: any) {
  try {
    const app = await appReady;

    await new Promise<void>((resolve, reject) => {
      app(req, res, (err?: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  } catch (err: any) {
    console.error("[api/index] handler error:", err?.message || err);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        errorCode: "INTERNAL_ERROR",
      });
    }
  }
}