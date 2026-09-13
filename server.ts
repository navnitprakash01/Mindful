import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import journalRoutes from "./src/server/routes/journalRoutes";
import companionRoutes from "./src/server/routes/companionRoutes";
import conversationRoutes from "./src/server/routes/conversationRoutes";
import moodRoutes from "./src/server/routes/moodRoutes";
import stateRoutes from "./src/server/routes/stateRoutes";
import patternRoutes from "./src/server/routes/patternRoutes";
import interventionRoutes from "./src/server/routes/interventionRoutes";
import voiceRoutes from "./src/server/routes/voiceRoutes";
import cameraRoutes from "./src/server/routes/cameraRoutes";
import memoryRoutes from "./src/server/routes/memoryRoutes";
import proactiveRoutes from "./src/server/routes/proactiveRoutes";
import wearableRoutes from "./src/server/routes/wearableRoutes";
import cognitiveRoutes from "./src/server/routes/cognitiveRoutes";
import habitRoutes from "./src/server/routes/habitRoutes";
import forecastRoutes from "./src/server/routes/forecastRoutes";
import digestRoutes from "./src/server/routes/digestRoutes";
import { supabase } from "./src/server/lib/supabase";
import { companionService } from "./src/server/services/companionService";
import { geminiClient } from "./src/server/services/geminiClient";
import { screenForCrisis, CRISIS_HELPLINE_MESSAGE } from "./src/server/engine/interventionEngine/safety";



const app = express();
import cors from "cors";

const allowedOrigins = [
  ...(process.env.CLIENT_URL || process.env.ALLOWED_ORIGIN || "https://mindful-eight-xi.vercel.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  "https://mindful-eight-xi.vercel.app",
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^https?:\/\/localhost(:\d+)?$/.test(origin) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
const PORT = Number(process.env.PORT) || 3000;



// Health API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// Journal API Routes
app.use("/api/journals", journalRoutes);

// Mood API Routes
app.use("/api/moods", moodRoutes);

// Personal State API Routes
app.use("/api/state", stateRoutes);

// Longitudinal Pattern API Routes
app.use("/api/patterns", patternRoutes);

// Personalized Intervention API Routes
app.use("/api/interventions", interventionRoutes);

// Advanced Voice Intelligence API Routes
app.use("/api/voice", voiceRoutes);

// Privacy-Preserving Camera Behavioral Intelligence API Routes
app.use("/api/camera", cameraRoutes);

// Personal AI Memory API Routes
app.use("/api/memory", memoryRoutes);

// Proactive Intelligence API Routes
app.use("/api/proactive", proactiveRoutes);

// Wearable & Behavioral Intelligence API Routes
app.use("/api/wearable", wearableRoutes);

// Real-Time Cognitive Monitoring & Deep Work Focus Intelligence API Routes
app.use("/api/cognitive", cognitiveRoutes);

// Behavioral Rituals & Habit Action Intelligence API Routes
app.use("/api/habits", habitRoutes);

// Longitudinal Wellness Intelligence Forecasting API Routes
app.use("/api/forecast", forecastRoutes);

// Weekly Wellness Intelligence Digest API Routes
app.use("/api/digest", digestRoutes);

// Companion API Routes
app.use("/api/companion", companionRoutes);

// Conversation API Routes
app.use("/api/companion/conversations", conversationRoutes);

// Authoritative Unified Companion API Route
app.post("/api/gemini/companion", async (req, res) => {
  try {
    const { message, conversationHistory, conversation, mode = "Empathetic Listener" } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const cleanMessage = message.trim();

    // Ingress crisis screening defensively at route boundary
    const crisis = screenForCrisis(cleanMessage);
    if (crisis.isCrisisDetected) {
      const helpline = crisis.helplineNotice || CRISIS_HELPLINE_MESSAGE;
      const crisisPathways = ["Call 988", "Crisis Text Line", "Reach out for help"];
      return res.json({
        reply: helpline,
        message: helpline,
        suggestedPathways: crisisPathways,
        suggestions: crisisPathways,
        timestamp: new Date().toISOString(),
        isCrisisDetected: true,
      });
    }

    // Retrieve optional authenticated user
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7).trim());
        if (user) authenticatedUserId = user.id;
      } catch {}
    }

    const history = conversationHistory || conversation || [];
    const response = await companionService.chat(
      authenticatedUserId || "anonymous",
      cleanMessage,
      history,
      mode
    );

    return res.json(response);
  } catch (err: unknown) {
    console.error("Companion route error:", err);
    return res.status(500).json({
      error: "Unable to process reflection at this moment",
      message: "The AI Companion is momentarily unavailable. Please try again shortly.",
      reply: "The AI Companion is momentarily unavailable. Please try again shortly.",
      suggestedPathways: [
        "Guide me through a calming breath",
        "Help me reframe this feeling",
        "I want to reflect on my day"
      ],
      suggestions: [
        "Guide me through a calming breath",
        "Help me reframe this feeling",
        "I want to reflect on my day"
      ],
      timestamp: new Date().toISOString(),
    });
  }
});

// Gemini Journal Analysis API Route (Language-Level Analysis Only - Strictly Non-Synthetic)
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { journalText } = req.body;

    if (!journalText || typeof journalText !== "string" || !journalText.trim()) {
      return res.status(400).json({ error: "Journal text is required" });
    }

    const cleanText = journalText.trim();

    // 1. Ingress Crisis Screening (Absolute Safety Authority)
    const crisis = screenForCrisis(cleanText);
    if (crisis.isCrisisDetected) {
      return res.json({
        dominantEmotion: "Distress",
        dominantScore: 30,
        emotions: [
          { name: "Crisis Support", score: 95 },
          { name: "Safety First", score: 90 },
          { name: "Care", score: 85 },
          { name: "Hope", score: 50 },
        ],
        summary: crisis.helplineNotice || CRISIS_HELPLINE_MESSAGE,
        themes: ["Crisis Support", "Immediate Care"],
        suggestedAction: "Please pause and reach out to a 24/7 crisis lifeline immediately (Call or text 988).",
        reflectionPrompt: "Would you be willing to reach out to someone who can support you right now?",
        isCrisisDetected: true,
        crisisNotice: crisis.helplineNotice || CRISIS_HELPLINE_MESSAGE,
      });
    }

    // 2. Language-level reflection analysis via centralized geminiClient
    const result = await geminiClient.analyzeJournal(cleanText);

    // Architectural Invariants Enforced:
    // - Zero synthetic PersonalState dimensions (no fabricated fatigue: 35, energy: 65, etc.)
    // - Zero uncommitted draft signal mutations to stateService
    // Canonical state signal ingestion strictly occurs upon actual journal persistence in /api/journals.

    return res.json(result);
  } catch (err) {
    console.error("Journal analysis error:", err);
    return res.status(500).json({ error: "Failed to analyze journal entry" });
  }
});

// Setup Vite / Static handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test") {
  startServer();
}
