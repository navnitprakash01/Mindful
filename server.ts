import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";

import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import journalRoutes from "./src/server/routes/journalRoutes";



const app = express();
import cors from "cors";

const corsOptions = {
  origin: "https://mindful-eight-xi.vercel.app",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
const PORT = Number(process.env.PORT) || 3000;



// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// Journal API Routes
app.use("/api/journals", journalRoutes);

// Gemini Companion API Route
app.post("/api/gemini/companion", async (req, res) => {
  try {
    const { message, conversationHistory, mode = "Empathetic Listener" } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !ai) {
      // Return a gentle, realistic intelligent response fallback if key is missing
      return res.json({
        reply: `I hear you deeply. Feeling "${message.slice(0, 30)}..." is completely valid. Take a slow, grounding breath. What is one small weight you can release right now?`,
        suggestedPathways: [
          "Guide me through a calming breath",
          "Help me reframe this feeling",
          "What patterns do you notice?"
        ]
      });
    }

    const systemInstructions: Record<string, string> = {
      "Empathetic Listener": "You are Mindful Companion, a compassionate, warm, and gentle emotional wellness assistant. Your responses should be soothing, empathetic, grounded, concise (2-4 sentences max), and ask reflective questions that help the user explore their emotions safely without judging or giving clinical diagnoses.",
      "Mindful Coach": "You are a Mindful Coach. Focus on actionable grounding techniques, breathwork suggestions, micro-habits, and gentle forward momentum. Keep responses concise, encouraging, and structured.",
      "Stoic Philosopher": "You are a Stoic Wellness Guide inspired by Marcus Aurelius and Epictetus. Offer calm wisdom on distinguishing what is within one's control versus outside, finding peace in acceptance, and transforming obstacles into wisdom.",
      "CBT Reframer": "You are a Cognitive Reframing Guide. Help the user gently identify cognitive distortions (such as all-or-nothing thinking or catastrophizing) and offer a compassionate, realistic alternative perspective."
    };

    const sysInstruction = systemInstructions[mode] || systemInstructions["Empathetic Listener"];

    // Format chat contents
    let contents = "";
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-6);
      contents = recent.map((item: { sender: string; text: string }) => `${item.sender}: ${item.text}`).join("\n");
      contents += `\nUser: ${message}\nCompanion:`;
    } else {
      contents = `User: ${message}\nCompanion:`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction: sysInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I am present with you. How does your body feel as you share this?";

    return res.json({
      reply,
      suggestedPathways: [
        "Help me reframe this thought",
        "Guide me through 3 slow breaths",
        "Explore what triggered this feeling"
      ]
    });
  } catch (err: unknown) {
    console.error("Gemini companion error:", err);
    return res.status(500).json({
      error: "Unable to process reflection at this moment",
      reply: "Take a gentle pause. I am right here with you whenever you're ready to continue."
    });
  }
});

// Gemini Journal Analysis API Route
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { journalText, type = "reflection" } = req.body;

    if (!journalText || journalText.trim().length === 0) {
      return res.status(400).json({ error: "Journal text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !ai) {
      return res.json({
        summary: "A reflective entry highlighting inner awareness and emotional processing.",
        dominantEmotion: "Contemplative",
        score: 78,
        reframingInsight: "Notice how expressing your thoughts onto paper creates mental space.",
        actionableRecommendation: "Take a 5-minute quiet walk outside to integrate your thoughts."
      });
    }

    const prompt = `Analyze the following journal entry written by a user seeking emotional wellness:
"${journalText}"

Provide a structured JSON output with:
1. "summary": A 1-2 sentence warm, empathetic summary of the reflection.
2. "dominantEmotion": One word describing the primary emotional tone (e.g. Grateful, Overwhelmed, Serene, Anxious, Inspired, Nostalgic).
3. "score": An emotional wellness balance score integer between 0 and 100.
4. "reframingInsight": A compassionate alternative perspective or gentle wisdom (1-2 sentences).
5. "actionableRecommendation": One small, concrete mindful ritual or action for today.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const parsed = JSON.parse(response.text || "{}");
      return res.json(parsed);
    } catch {
      return res.json({
        summary: "A heartfelt reflection capturing current life experiences.",
        dominantEmotion: "Reflective",
        score: 75,
        reframingInsight: "Every feeling is temporary weather; you are the sky.",
        actionableRecommendation: "Sip a glass of warm water slowly and notice the physical warmth."
      });
    }
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
    app.get("*all", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
