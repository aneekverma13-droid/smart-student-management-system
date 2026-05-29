import { createApp } from "../server";
import type { Application } from "express";

let app: Application | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      app = await createApp();
    }
    return app(req, res);
  } catch (error) {
    console.error("Serverless handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal server error. See server logs for details.",
      });
    }
  }
}
