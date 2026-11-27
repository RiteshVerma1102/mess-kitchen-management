import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import { z } from "zod";

const FREE_CHAT_MODELS = ["gemini-4-hydrogen", "gemini-3.1-flash-lite"] as const;
const SERVER_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHE_ENTRIES = 120;

interface CachedEntry {
  expiresAt: number;
  payload: unknown;
}

const serverResponseCache = new Map<string, CachedEntry>();

function getServerCached(key: string): unknown | null {
  const hit = serverResponseCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    serverResponseCache.delete(key);
    return null;
  }
  return hit.payload;
}

function setServerCached(key: string, payload: unknown): void {
  if (serverResponseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = serverResponseCache.keys().next().value;
    if (oldestKey) serverResponseCache.delete(oldestKey);
  }
  serverResponseCache.set(key, {
    expiresAt: Date.now() + SERVER_CACHE_TTL_MS,
    payload,
  });
}

const SanitizedSummarySchema = z
  .object({
    lang: z.enum(["en", "hi"]).optional().default("en"),
    stock: z
      .object({
        totalItems: z.number().int().min(0).max(10000),
        lowStockCount: z.number().int().min(0).max(10000),
        expiringSoonCount: z.number().int().min(0).max(10000),
        topLowStock: z
          .array(
            z.object({
              name: z.string().max(80),
              qty: z.number().min(0),
              min: z.number().min(0),
              unit: z.string().max(24),
            }),
          )
          .max(6),
        topExpiring: z
          .array(
            z.object({
              name: z.string().max(80),
              qty: z.number().min(0),
              unit: z.string().max(24),
              expiryDate: z.string().max(32),
            }),
          )
          .max(6),
      })
      .optional(),
    menu: z
      .object({
        todayMenus: z
          .array(
            z.object({
              mealType: z.string().max(32),
              title: z.string().max(120),
              expectedServings: z.number().min(0).max(50000),
            }),
          )
          .max(8),
        recipeCount: z.number().int().min(0).max(5000),
        avgRecipeCostRupees: z.number().min(0).max(50000),
        topCostEffectiveRecipes: z
          .array(
            z.object({
              name: z.string().max(80),
              costRupees: z.number().min(0),
            }),
          )
          .max(6),
      })
      .optional(),
    billing: z
      .object({
        invoiceCount: z.number().int().min(0).max(50000),
        unpaidCount: z.number().int().min(0).max(50000),
        totalBilledRupees: z.number().min(0),
        totalCollectedRupees: z.number().min(0),
        pendingRupees: z.number().min(0),
      })
      .optional(),
    waste: z
      .object({
        logCount: z.number().int().min(0).max(50000),
        totalPreparedKg: z.number().min(0),
        totalWastedKg: z.number().min(0),
        totalWasteCostRupees: z.number().min(0),
        wastePct: z.number().min(0).max(100),
        topWastedDishes: z
          .array(
            z.object({
              dishName: z.string().max(80),
              wastedKg: z.number().min(0),
              wastePct: z.number().min(0).max(100),
              reason: z.string().max(120),
            }),
          )
          .max(5),
      })
      .optional(),
    ratings: z
      .object({
        feedbackCount: z.number().int().min(0).max(50000),
        avgRating: z.number().min(0).max(5),
        lowRatedMeals: z
          .array(
            z.object({
              mealType: z.string().max(32),
              rating: z.number().min(1).max(5),
              category: z.string().max(32),
            }),
          )
          .max(4),
        topicCounts: z
          .array(
            z.object({
              topic: z.string().max(40),
              count: z.number().int().min(0).max(50000),
              avgRating: z.number().min(0).max(5),
            }),
          )
          .max(10)
          .optional(),
        openComplaintsCount: z.number().int().min(0).max(50000).optional(),
      })
      .optional(),
    operations: z
      .object({
        activeStudentsCount: z.number().int().min(0).max(50000),
        pastAttendanceAvg: z.number().min(0).max(50000),
        upcomingHolidays: z
          .array(
            z.object({
              date: z.string().max(32),
              title: z.string().max(80),
              attendanceFactor: z.number().min(0).max(3),
            }),
          )
          .max(4),
      })
      .optional(),
  })
  .optional();

const ChatRequestSchema = z.object({
  model: z.enum(FREE_CHAT_MODELS).optional().default("gemini-3.1-flash-lite"),
  persona: z
    .enum(["kitchen_copilot", "warden_ops", "student_helper"])
    .optional()
    .default("kitchen_copilot"),
  message: z.string().trim().min(1).max(1500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().trim().min(1).max(2000),
      }),
    )
    .max(12)
    .optional()
    .default([]),
  messSummary: SanitizedSummarySchema,
});

const ForecastRequestSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdayName: z.string().max(24),
  lang: z.enum(["en", "hi"]).optional().default("en"),
  activeStudentsCount: z.number().int().min(0).max(50000),
  pastAttendanceAvg: z.number().min(0).max(50000),
  tomorrowSkipsCount: z.number().int().min(0).max(50000),
  guestCount: z.number().int().min(0).max(5000),
  holidayFactor: z.number().min(0.1).max(2.5),
  holidayNote: z.string().max(120),
  weatherTempMaxC: z.number().min(-20).max(60),
  weatherRainMm: z.number().min(0).max(500),
  weatherCondition: z.string().max(100),
  weatherMultiplier: z.number().min(0.5).max(1.5),
});

const InsightsRequestSchema = z.object({
  kind: z.enum(["menu_suggestions", "waste_tips", "feedback_summary"]),
  lang: z.enum(["en", "hi"]).optional().default("en"),
  messSummary: SanitizedSummarySchema,
});

const SearchRequestSchema = z.object({
  query: z.string().trim().min(3).max(400),
});

const TranscribeRequestSchema = z.object({
  audioBase64: z.string().min(16).max(12_000_000),
  mimeType: z.enum([
    "audio/webm",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/mp4",
  ]),
  category: z.enum(["waste", "inventory", "feedback", "general"]).optional().default("general"),
});

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env["GEMINI_API_KEY"]?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit")
  );
}

function mapGeminiFailureResponse(error: unknown): Response {
  if (isQuotaError(error)) {
    return jsonResponse(
      {
        code: "QUOTA_EXCEEDED",
        error: "Gemini free-tier quota limit reached. Using local formula fallback.",
      },
      429,
    );
  }
  return jsonResponse(
    {
      code: "API_ERROR",
      error: "Gemini service is temporarily busy. Using local formula fallback.",
    },
    502,
  );
}

const PERSONA_SYSTEM_INSTRUCTIONS: Record<
  "kitchen_copilot" | "warden_ops" | "student_helper",
  string
> = {
  kitchen_copilot:
    "You are Ask FoodFlow, an Indian institutional mess & commercial kitchen copilot. Answer concisely using ONLY the provided non-PII mess summary (stock, bills, waste, menu, ratings) when data questions are asked. Use IST (Asia/Kolkata), metric units (kg/L), and INR.",
  warden_ops:
    "You are FoodFlow Hostel Warden Advisor. Answer concisely about attendance trends, meal skips, student ratings, and food waste hygiene using only the aggregated mess summary.",
  student_helper:
    "You are FoodFlow Dining Assistant for hostel students. Explain daily menus, allergen checks, IST cut-off rules (Breakfast 21:00 prev day, Lunch 09:00, Snacks 14:00, Dinner 16:30), leave rebates, and QR dining pass guidance clearly.",
};

export async function handleGeminiApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/gemini/")) {
    return null;
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  const ai = createGeminiClient();
  if (!ai) {
    return jsonResponse(
      {
        code: "NO_KEY",
        error: "Gemini API key is not configured on the server; formula fallback is active.",
      },
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON request body." }, 400);
  }

  try {
    if (url.pathname === "/api/gemini/chat") {
      const parsed = ChatRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "Invalid chat request.", issues: parsed.error.flatten() },
          400,
        );
      }

      const { model, persona, message, history, messSummary } = parsed.data;
      const cacheKey =
        history.length === 0
          ? `chat:${model}:${persona}:${message}:${JSON.stringify(messSummary ?? {})}`
          : null;
      if (cacheKey) {
        const cached = getServerCached(cacheKey);
        if (cached) return jsonResponse({ ...(cached as Record<string, unknown>), cached: true });
      }

      const summaryBlock = messSummary
        ? `\n\nCurrent Aggregated Mess Summary (no PII):\n${JSON.stringify(messSummary)}`
        : "";
      const langDirective =
        messSummary?.lang === "hi"
          ? "\nReply in clear Hindi (Devanagari) with metric units and INR."
          : "";

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: `${PERSONA_SYSTEM_INSTRUCTIONS[persona]}${langDirective}${summaryBlock}`,
        },
        history: history.map((item) => ({
          role: item.role,
          parts: [{ text: item.text }],
        })),
      });

      const response = await chat.sendMessage({ message });
      const payload = {
        reply: (response.text ?? "").trim(),
        model,
        persona,
        cached: false,
      };
      if (cacheKey && payload.reply) {
        setServerCached(cacheKey, payload);
      }
      return jsonResponse(payload);
    }

    if (url.pathname === "/api/gemini/forecast") {
      const parsed = ForecastRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "Invalid forecast parameters.", issues: parsed.error.flatten() },
          400,
        );
      }

      const input = parsed.data;
      const cacheKey = `forecast:${JSON.stringify(input)}`;
      const cached = getServerCached(cacheKey);
      if (cached) {
        return jsonResponse({ ...(cached as Record<string, unknown>), cached: true });
      }

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: `Predict tomorrow's 4-meal portions for an Indian hostel mess from these non-PII signals:\n${JSON.stringify(input)}\nReturn concise rationale in ${input.lang === "hi" ? "Hindi" : "English"}.`,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              breakfastPortions: { type: Type.INTEGER },
              lunchPortions: { type: Type.INTEGER },
              snacksPortions: { type: Type.INTEGER },
              dinnerPortions: { type: Type.INTEGER },
              confidence: { type: Type.INTEGER },
              rationale: { type: Type.STRING },
            },
            required: [
              "breakfastPortions",
              "lunchPortions",
              "snacksPortions",
              "dinnerPortions",
              "confidence",
              "rationale",
            ],
          },
        },
      });

      const rawJson = JSON.parse(response.text ?? "{}") as unknown;
      const resultSchema = z.object({
        breakfastPortions: z.number().int().min(0).max(50000),
        lunchPortions: z.number().int().min(0).max(50000),
        snacksPortions: z.number().int().min(0).max(50000),
        dinnerPortions: z.number().int().min(0).max(50000),
        confidence: z.number().int().min(30).max(99),
        rationale: z.string().min(4).max(400),
      });
      const validated = resultSchema.parse(rawJson);
      const payload = {
        ...validated,
        model: "gemini-4-hydrogen",
        cached: false,
      };
      setServerCached(cacheKey, payload);
      return jsonResponse(payload);
    }

    if (url.pathname === "/api/gemini/insights") {
      const parsed = InsightsRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "Invalid insights payload.", issues: parsed.error.flatten() },
          400,
        );
      }

      const { kind, lang, messSummary } = parsed.data;
      const cacheKey = `insights:${kind}:${lang}:${JSON.stringify(messSummary ?? {})}`;
      const cached = getServerCached(cacheKey);
      if (cached) {
        return jsonResponse({ ...(cached as Record<string, unknown>), cached: true });
      }

      const taskDescription =
        kind === "menu_suggestions"
          ? "Suggest 3 practical Indian hostel mess menu dishes/adjustments using expiring stock, lower cost per plate, and student ratings."
          : kind === "feedback_summary"
            ? "Summarize student dining feedback and complaints by topic (taste, hygiene, portion, timing, temperature), highlighting top strengths and 1-2 urgent fixes for the Mess Committee."
            : "Suggest 3 specific food-waste reduction actions based directly on the provided food waste log summary.";

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: `${taskDescription}\nRespond in ${lang === "hi" ? "Hindi (Devanagari)" : "English"}.\nAggregated Non-PII Summary:\n${JSON.stringify(messSummary ?? {})}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tips: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              highlightMetric: { type: Type.STRING },
            },
            required: ["tips", "highlightMetric"],
          },
        },
      });

      const rawJson = JSON.parse(response.text ?? "{}") as unknown;
      const validated = z
        .object({
          tips: z.array(z.string().min(4).max(260)).min(1).max(5),
          highlightMetric: z.string().min(2).max(160),
        })
        .parse(rawJson);

      const payload = {
        ...validated,
        kind,
        model: "gemini-3.1-flash-lite",
        cached: false,
      };
      setServerCached(cacheKey, payload);
      return jsonResponse(payload);
    }

    if (url.pathname === "/api/gemini/search") {
      const parsed = SearchRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse(
          { error: "Please provide a search query of at least 3 characters." },
          400,
        );
      }

      const cacheKey = `search:${parsed.data.query.toLowerCase()}`;
      const cached = getServerCached(cacheKey);
      if (cached) {
        return jsonResponse({ ...(cached as Record<string, unknown>), cached: true });
      }

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: parsed.data.query,
        config: {
          systemInstruction:
            "You are FoodFlow Market & FSSAI Intelligence. Use Google Search grounding to return current, factual commodity price ranges in India, FSSAI food-safety temperature/hygiene standards, or academic/festival holiday dining impacts. Cite sources concisely.",
          tools: [{ googleSearch: {} }],
        },
      });

      const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources = rawChunks
        .map((chunk) => ({
          title: chunk.web?.title ?? "Web source",
          uri: chunk.web?.uri ?? "",
        }))
        .filter((s) => s.uri.startsWith("http"));

      const payload = {
        answer: response.text ?? "",
        sources,
        model: "gemini-4-hydrogen",
        cached: false,
      };
      setServerCached(cacheKey, payload);
      return jsonResponse(payload);
    }

    if (url.pathname === "/api/gemini/transcribe") {
      const parsed = TranscribeRequestSchema.safeParse(body);
      if (!parsed.success) {
        return jsonResponse({ error: "Invalid audio payload for transcription." }, 400);
      }

      const { audioBase64, mimeType, category } = parsed.data;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-transcribe",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: audioBase64,
              },
            },
            {
              text: `Transcribe this ${category} mess kitchen audio note accurately. On a new line starting with "Summary:", write a concise 1-sentence operational summary (quantities, dish names, or issue).`,
            },
          ],
        },
      });

      const rawText = (response.text ?? "").trim();
      const summaryMatch = /(?:^|\n)Summary:\s*(.+)$/i.exec(rawText);
      const summary = summaryMatch?.[1]?.trim() ?? rawText.slice(0, 160);
      const transcript = rawText.replace(/(?:^|\n)Summary:\s*.+$/i, "").trim() || rawText;

      return jsonResponse({
        transcript,
        summary,
        category,
        model: "gemini-3.5-transcribe",
      });
    }

    return jsonResponse({ error: "Unknown Gemini endpoint." }, 404);
  } catch (error) {
    console.error("[gemini.server] Request failed cleanly.");
    return mapGeminiFailureResponse(error);
  }
}
