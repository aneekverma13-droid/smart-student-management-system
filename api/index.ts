import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { DB, initDatabase } from "../server/db";

const JWT_SECRET = process.env.JWT_SECRET || "smart-edu-super-secret-key-2026";

let app: express.Application | null = null;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      await initDatabase();
      app = express();
      app.use(express.json());

      app.post("/api/auth/login", async (req: any, res: any) => {
        const { email, password } = req.body;
        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required fields." });
        }
        try {
          let user = await DB.users.findOne({ email: email.toLowerCase() });
          if (!user) {
            const allUsers = await DB.users.find();
            user = allUsers.find(u => u.name && u.name.toLowerCase() === email.toLowerCase()) || null;
          }
          if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
          }
          const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
          if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password." });
          }
          const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: "24h" }
          );
          let studentProfileId = "";
          if (user.role === "student") {
            const student = await DB.students.findOne({ userId: user._id });
            if (student) studentProfileId = student._id;
          }
          return res.json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role, studentProfileId },
          });
        } catch (error) {
          console.error("Login failed:", error);
          return res.status(500).json({ error: "Internal server authentication error" });
        }
      });

      app.get("/api/auth/profile", async (req: any, res: any) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          return res.status(401).json({ error: "Access denied. Token missing or invalid." });
        }
        try {
          const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
          return res.json({ user: decoded });
        } catch (err) {
          return res.status(403).json({ error: "Invalid or expired authorization token." });
        }
      });

      app.all("/api/*", (req: any, res: any) => {
        res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
      });
    }
    return app(req, res);
  } catch (error: any) {
    console.error("Serverless handler error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  }
}
