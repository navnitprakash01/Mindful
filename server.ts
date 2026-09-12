import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";

import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import journalRoutes from "./src/server/routes/journalRoutes";
import companionRoutes from "./src/server/routes/companionRoutes";
import conversationRoutes from "./src/server/routes/conversationRoutes";
import moodRoutes from "./src/server/routes/moodRoutes";
import stateRoutes from "./src/server/routes/stateRoutes";
import patternRoutes from "./src/server/routes/patternRoutes";
import interventionRoutes from "./src/server/routes/interventionRoutes";
import { supabase } from "./src/server/lib/supabase";
import { stateService } from "./src/server/services/stateService";
import { SignalExtractor } from "./src/server/engine/signalExtractor";
import { shouldEmitCompanionSignal } from "./src/server/engine/providers";



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
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

// Companion API Routes
app.use("/api/companion", companionRoutes);

// Conversation API Routes
app.use("/api/companion/conversations", conversationRoutes);

// Gemini Companion API Route
app.post("/api/gemini/companion", async (req, res) => {
  try {
    const { message, conversationHistory, mode = "Empathetic Listener" } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const cleanMessage = message.trim();

    // 1. Retrieve optional authenticated journal context securely
    let authenticatedUser: any = null;
    let journalContextText = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (user && !authError) {
          authenticatedUser = user;
          const { data: entries, error: dbError } = await supabase
            .from("journal_entries")
            .select("created_at, mood, emotion, ai_summary, content")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(3);

          if (!dbError && entries && entries.length > 0) {
            const formatted = entries.map((e, idx) => {
              const dateStr = new Date(e.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
              const moodOrEmotion = e.emotion || e.mood || "Reflective";
              const summary = e.ai_summary || (e.content ? e.content.slice(0, 90) + "..." : "Reflection");
              return `${idx + 1}. [${dateStr}] Mood: ${moodOrEmotion} — ${summary}`;
            }).join("\n");
            journalContextText = `User's Recent Journal Entries (for background empathy only; do NOT recite or dump this context unless the user brings it up or it naturally connects):\n${formatted}\n`;
          }
        }
      } catch {
        // Silently continue without journal context if auth check or Supabase query fails
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !ai) {
      return res.json({
        reply: "Hello! I am present with you. How can I support your inner peace and clarity today?",
        suggestedPathways: [
          "Guide me through a calming breath",
          "Help me reframe this feeling",
          "I want to reflect on my day"
        ]
      });
    }

    // 2. Structured, conversational system instructions
    const baseSystemPrompt = `You are Mindful Companion, a calm, warm, supportive, and emotionally intelligent AI companion in the Mindful wellness app.

Core Principles:
1. Conversational & Responsive: Always respond directly to what the user actually said. If the user says a casual greeting (like "hello", "hi", "good morning", "how are you?"), greet them warmly and naturally first. Do NOT turn casual greetings or simple small talk into intense emotional processing or therapeutic exercises.
2. Calm & Grounded Presence: Maintain a soothing, warm, mindful, and unhurried tone. Keep responses concise (typically 2 to 4 sentences) unless the user specifically asks for an exercise or detailed reflection.
3. Thoughtful Inquiry: Ask an open, gentle question or offer an insightful thought when appropriate, but vary your questions naturally. Avoid repetitive catchphrases.
4. Positive Recognition: If the user shares good news or says they had a good day, celebrate and validate their joy warmly.
5. Boundaries: You are a mindfulness guide and emotional wellness support companion, not a licensed therapist or clinical provider. Never provide medical diagnoses, clinical labels, or pretend to be human.
6. Context Awareness: If journal notes or previous chat history are provided, use them to sense the user's emotional state, but never lecture them or dump journal summaries unprompted.`;

    const personaInstructions: Record<string, string> = {
      "Empathetic Listener": "Active Persona: Empathetic Listener. Focus on deep presence, warmth, non-judgmental validation, and gentle emotional reflection.",
      "Mindful Coach": "Active Persona: Mindful Coach. Focus on gentle encouragement, actionable micro-habits, breathwork, and clear, realistic grounding steps.",
      "Stoic Philosopher": "Active Persona: Stoic Philosopher (inspired by Marcus Aurelius and Epictetus). Focus on calm wisdom, distinguishing what is within our control from what is not, and finding peace in acceptance.",
      "CBT Reframer": "Active Persona: CBT Reframer. Focus on compassionate cognitive reframing, gently helping identify cognitive distortions and exploring balanced, realistic alternative viewpoints."
    };

    const personaInstruction = personaInstructions[mode] || personaInstructions["Empathetic Listener"];
    const sysInstruction = `${baseSystemPrompt}\n\n${personaInstruction}`;

    // 3. Format chat contents with conversation history
    let contents = "";
    if (journalContextText) {
      contents += `${journalContextText}\n`;
    }

    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      const recent = conversationHistory.slice(-10);
      const historyStr = recent
        .filter((item: any) => item && (item.text || item.content))
        .map((item: any) => {
          const sender = item.sender === "user" || item.role === "user" ? "User" : "Companion";
          const text = item.text || item.content;
          return `${sender}: ${text}`;
        })
        .join("\n");
      if (historyStr) {
        contents += `Conversation History:\n${historyStr}\n\n`;
      }
    }

    contents += `User: ${cleanMessage}\nCompanion:`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction: sysInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text?.trim() || "I am present with you. How can I support you right now?";

    const pathwaysByMode: Record<string, string[]> = {
      "Empathetic Listener": [
        "Help me explore this feeling",
        "Guide me through a calming breath",
        "What patterns do you notice?"
      ],
      "Mindful Coach": [
        "Suggest a small next step",
        "Guide me through a quick grounding reset",
        "How can I build momentum?"
      ],
      "Stoic Philosopher": [
        "What is within my control here?",
        "Help me view this with acceptance",
        "Offer a stoic reflection"
      ],
      "CBT Reframer": [
        "Help me reframe this thought",
        "What is a more balanced perspective?",
        "Explore what triggered this feeling"
      ]
    };

    // Calibrated companion state signal emission for authenticated user
    if (authenticatedUser) {
      try {
        const historyCount = Array.isArray(conversationHistory) ? conversationHistory.length : 1;
        if (shouldEmitCompanionSignal(cleanMessage, historyCount)) {
          const companionSignal = SignalExtractor.fromCompanionSession({
            userId: authenticatedUser.id,
            mode,
            recentMessagesCount: historyCount,
          });
          await stateService.ingestSignal(companionSignal);
        }
      } catch {}
    }

    return res.json({
      reply,
      suggestedPathways: pathwaysByMode[mode] || pathwaysByMode["Empathetic Listener"]
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Gemini companion generation error:", errorMsg);
    return res.status(500).json({
      error: "Unable to process reflection at this moment",
      message: "The AI Companion is momentarily unavailable. Please try again shortly."
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
      // Deterministic Local Analysis fallback (zero-budget mode, no fake AI text)
      const localSignal = SignalExtractor.fromJournal({
        userId: 'anonymous',
        content: journalText,
      });

      return res.json({
        dominantEmotion: "Reflective",
        dominantScore: localSignal.estimates.mood?.value ?? 70,
        emotions: [
          { name: "Focus", score: localSignal.estimates.focus?.value ?? 70 },
          { name: "Stress", score: localSignal.estimates.stress?.value ?? 30 },
          { name: "Vitality", score: localSignal.estimates.energy?.value ?? 65 },
          { name: "Fatigue", score: localSignal.estimates.fatigue?.value ?? 35 },
        ],
        summary: "Analyzed locally using transparent linguistic heuristics.",
        themes: localSignal.features.themes?.length ? localSignal.features.themes : ["Reflection"],
        suggestedAction: "Take a quiet moment to breathe and observe your thoughts without judgment.",
        reflectionPrompt: "What is one gentle step you can take for yourself right now?",
        stateEstimates: localSignal.estimates,
        isLocalSynthesis: true,
      });
    }

    const prompt = `Analyze the following journal entry and return ONLY valid JSON with this exact structure:
{
  "dominantEmotion": "string (one word, e.g. Overwhelmed, Grateful, Anxious, Peaceful)",
  "dominantScore": "integer 0-100",
  "emotions": [
    {"name": "string", "score": "integer 0-100"},
    {"name": "string", "score": "integer 0-100"},
    {"name": "string", "score": "integer 0-100"},
    {"name": "string", "score": "integer 0-100"}
  ],
  "summary": "string (2-3 short sentences)",
  "themes": ["string", "string", "string"],
  "suggestedAction": "string (one actionable item)",
  "reflectionPrompt": "string (one thoughtful question)"
}

Journal entry:
"${journalText}"

Guidelines:
- dominantEmotion: single word, capitalized
- emotions: exactly 4 entries, scores should vary
- themes: max 3 items, short phrases
- suggestedAction: one concrete, gentle action
- reflectionPrompt: one open-ended question`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    console.log("Raw Gemini response:", response.text);

    // Check for authenticated user to emit personal state signal
    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const { data: { user } } = await supabase.auth.getUser(authHeader.substring(7));
        if (user) authenticatedUserId = user.id;
      } catch {}
    }

    try {
      const parsed = JSON.parse(response.text || "{}");
      // Validate and ensure all fields exist
      const emotionsList = Array.isArray(parsed.emotions) ? parsed.emotions.slice(0, 4).map((e: any) => ({
        name: e.name || "Unknown",
        score: typeof e.score === 'number' ? e.score : 50
      })) : [
        { name: "Stress", score: 65 },
        { name: "Anxiety", score: 45 },
        { name: "Hope", score: 30 },
        { name: "Confidence", score: 40 }
      ];

      const stressMatch = emotionsList.find((e: any) => e.name.toLowerCase() === 'stress' || e.name.toLowerCase() === 'anxiety');
      const dominantScore = typeof parsed.dominantScore === 'number' ? parsed.dominantScore : 75;

      const stateEstimates = {
        mood: { value: dominantScore, confidence: 0.85 },
        stress: { value: stressMatch ? stressMatch.score : 30, confidence: 0.80 },
        fatigue: { value: 35, confidence: 0.70 },
        energy: { value: 65, confidence: 0.70 },
        focus: { value: 75, confidence: 0.80 },
        cognitiveLoad: { value: 35, confidence: 0.75 },
      };

      const result = {
        dominantEmotion: parsed.dominantEmotion || "Reflective",
        dominantScore,
        emotions: emotionsList,
        summary: parsed.summary || "A reflective entry capturing current life experiences.",
        themes: Array.isArray(parsed.themes) ? parsed.themes.slice(0, 3) : ["Self-awareness", "Emotional processing"],
        suggestedAction: parsed.suggestedAction || "Sip a glass of warm water slowly and notice the physical warmth.",
        reflectionPrompt: parsed.reflectionPrompt || "What small step could bring you more peace right now?",
        stateEstimates,
      };

      if (authenticatedUserId) {
        const signal = SignalExtractor.fromJournal({
          userId: authenticatedUserId,
          content: journalText,
          moodScore: result.dominantScore,
          aiAnalysis: result,
        });
        await stateService.ingestSignal(signal);
      }

      return res.json(result);
    } catch {
      // Deterministic fallback if model output failed JSON parse
      const localSignal = SignalExtractor.fromJournal({
        userId: authenticatedUserId || 'anonymous',
        content: journalText,
      });

      const fallbackResult = {
        dominantEmotion: "Reflective",
        dominantScore: localSignal.estimates.mood?.value ?? 70,
        emotions: [
          { name: "Focus", score: localSignal.estimates.focus?.value ?? 70 },
          { name: "Stress", score: localSignal.estimates.stress?.value ?? 30 },
          { name: "Vitality", score: localSignal.estimates.energy?.value ?? 65 },
          { name: "Fatigue", score: localSignal.estimates.fatigue?.value ?? 35 },
        ],
        summary: "Locally processed reflection with deterministic wellness signal extraction.",
        themes: localSignal.features.themes?.length ? localSignal.features.themes : ["Emotional Processing"],
        suggestedAction: "Take a 5-minute quiet stretch to decompress physical tension.",
        reflectionPrompt: "What is currently demanding most of your mental energy?",
        stateEstimates: localSignal.estimates,
        isLocalSynthesis: true,
      };

      if (authenticatedUserId) {
        await stateService.ingestSignal(localSignal);
      }

      return res.json(fallbackResult);
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

if (process.env.NODE_ENV !== "test") {
  startServer();
}
