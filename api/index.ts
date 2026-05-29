import { createApp } from "../server";
import type { Application } from "express";

let app: Application | null = null;

export default async function handler(req: any, res: any) {
  res.setHeader("x-debug", "handler-called");
  try {
    if (!app) {
      app = await createApp();
    }
    return app(req, res);
  } catch (error: any) {
    console.error("Serverless handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
}
