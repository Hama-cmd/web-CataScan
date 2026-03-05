import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertScreeningSchema } from "@shared/schema";

// Python model server URL
const MODEL_SERVER_URL = process.env.PYTHON_MODEL_URL || "http://127.0.0.1:5001";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ─── Auth stub (no auth system active) ───────────────────────────
  app.get("/api/auth/user", (_req, res) => {
    res.status(401).json({ message: "Not authenticated" });
  });

  // ─── Create Screening (Analyze Image) ────────────────────────────
  app.post("/api/screenings", async (req, res) => {
    try {
      const { image } = req.body;

      if (!image || typeof image !== "string") {
        return res.status(400).json({ message: "Missing or invalid 'image' field." });
      }

      console.log("📸 Received image for analysis, sending to model server...");

      // Determine model server URL based on environment
      // In Vercel, the python function is hosted on the same domain under /api/predict
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const host = req.headers.host;
      const isVercel = process.env.VERCEL || process.env.NODE_ENV === "production";

      const targetUrl = isVercel
        ? `${protocol}://${host}/api/predict`
        : "http://127.0.0.1:5001/predict";

      // Call the Python model server
      const modelResponse = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      });

      if (!modelResponse.ok) {
        const errorData = await modelResponse.json().catch(() => ({}));
        console.error("Model server error:", errorData);
        throw new Error(
          errorData.error || `Model server returned status ${modelResponse.status}`
        );
      }

      const analysisResult = await modelResponse.json();
      console.log("✅ Analysis result:", analysisResult.condition, analysisResult.confidence);

      // Save to database
      // Try to save to database, but don't fail if DB is unavailable
      let screening;
      try {
        screening = await storage.createScreening({
          userId: "local-user",
          imageUrl: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
          analysis: analysisResult,
        });
      } catch (dbErr: any) {
        console.warn("⚠️ Database unavailable, returning result without saving:", dbErr.message);
        // Return mock screening object so frontend still works
        screening = {
          id: Date.now(),
          userId: "local-user",
          imageUrl: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`,
          analysis: analysisResult,
          createdAt: new Date(),
        };
      }

      res.status(201).json(screening);
    } catch (err: any) {
      console.error("Screening error:", err);

      // Check if model server is unreachable
      if (err.cause?.code === "ECONNREFUSED") {
        return res.status(503).json({
          message:
            "Model server tidak bisa dihubungi. Pastikan Python model server berjalan di port 5001. Jalankan: python model_server.py",
        });
      }

      res.status(500).json({
        message: err.message || "Failed to process screening",
      });
    }
  });

  // ─── List Screenings ─────────────────────────────────────────────
  app.get("/api/screenings", async (_req, res) => {
    try {
      // Return all screenings for the current user
      const screenings = await storage.getScreeningsByUser("local-user");
      res.json(screenings);
    } catch (err) {
      console.error("Error fetching screenings:", err);
      res.status(500).json({ message: "Failed to fetch screenings" });
    }
  });

  // ─── Get Single Screening ────────────────────────────────────────
  app.get("/api/screenings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid screening ID" });
      }

      const screening = await storage.getScreening(id);

      if (!screening) {
        return res.status(404).json({ message: "Screening not found" });
      }

      res.json(screening);
    } catch (err) {
      console.error("Error fetching screening details:", err);
      res.status(500).json({ message: "Failed to fetch screening details" });
    }
  });

  return httpServer;
}
