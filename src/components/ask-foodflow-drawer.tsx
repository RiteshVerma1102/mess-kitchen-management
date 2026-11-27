import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bot,
  ExternalLink,
  Globe,
  LoaderCircle,
  Mic,
  Send,
  Sparkles,
  Square,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useFirebaseAuth } from "@/components/firebase-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  debounceCallback,
  recordAiUsageEvent,
  requestAskFoodFlowChat,
  type SanitizedMessSummary,
} from "@/lib/ai-client";
import { saveVoiceLogRecord, subscribeToMyVoiceLogs, type VoiceLogDoc } from "@/lib/firebase";

type AssistantMode = "chat" | "search" | "voice";
type ChatModel = "gemini-3.1-flash-lite" | "gemini-4-hydrogen";
type ChatPersona = "kitchen_copilot" | "warden_ops" | "student_helper";
type VoiceCategory = "waste" | "inventory" | "feedback" | "general";

interface ChatTurn {
  role: "user" | "model";
  text: string;
  badge?: string;
}

interface SearchSource {
  title: string;
  uri: string;
}

interface SearchResult {
  query: string;
  answer: string;
  sources: SearchSource[];
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const commaIdx = result.indexOf(",");
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read audio data."));
    reader.readAsDataURL(blob);
  });
}

function normalizeAudioMimeType(
  rawType: string,
): "audio/webm" | "audio/wav" | "audio/mp3" | "audio/mpeg" | "audio/ogg" | "audio/mp4" {
  const lower = rawType.toLowerCase();
  if (lower.includes("wav")) return "audio/wav";
  if (lower.includes("mp3")) return "audio/mp3";
  if (lower.includes("mpeg")) return "audio/mpeg";
  if (lower.includes("ogg")) return "audio/ogg";
  if (lower.includes("mp4") || lower.includes("m4a")) return "audio/mp4";
  return "audio/webm";
}

export function AskFoodFlowDrawer({
  open,
  onOpenChange,
  messSummary,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messSummary?: SanitizedMessSummary;
}) {
  const { user, language } = useFirebaseAuth();
  const [mode, setMode] = useState<AssistantMode>("chat");

  // Multi-turn Chat state (fast free-tier flash-lite default)
  const [model, setModel] = useState<ChatModel>("gemini-3.1-flash-lite");
  const [persona, setPersona] = useState<ChatPersona>("kitchen_copilot");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatNotice, setChatNotice] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([
    {
      role: "model",
      text:
        language === "hi"
          ? "नमस्ते! अपने मेस के स्टॉक, मासिक बिल, भोजन अपव्यय या आज के मेनू के बारे में पूछें।"
          : "Namaste! Ask me about your mess stock, pending bills, food waste, or today's menu.",
    },
  ]);

  // Grounded Web Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);

  // Voice Log state
  const [voiceCategory, setVoiceCategory] = useState<VoiceCategory>("waste");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [latestTranscript, setLatestTranscript] = useState<{
    transcript: string;
    summary: string;
    category: VoiceCategory;
  } | null>(null);
  const [savedVoiceLogs, setSavedVoiceLogs] = useState<VoiceLogDoc[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setSavedVoiceLogs([]);
      return;
    }
    return subscribeToMyVoiceLogs(user.uid, (rows) => {
      setSavedVoiceLogs(rows.slice(-5).reverse());
    });
  }, [user?.uid]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory, chatLoading]);

  const sendChatMessage = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? chatInput).trim();
    if (!prompt || chatLoading) return;

    setChatNotice(null);
    const priorHistory = chatHistory.map((h) => ({ role: h.role, text: h.text }));
    setChatHistory((prev) => [...prev, { role: "user", text: prompt }]);
    if (!overridePrompt) setChatInput("");
    setChatLoading(true);

    try {
      const result = await requestAskFoodFlowChat({
        model,
        persona,
        message: prompt,
        history: priorHistory,
        ...(messSummary ? { messSummary } : {}),
      });
      if (result.notice) {
        setChatNotice(result.notice);
      }
      setChatHistory((prev) => [
        ...prev,
        {
          role: "model",
          text: result.reply,
          badge:
            result.source === "cache"
              ? "Cached"
              : result.source === "formula-fallback"
                ? "Formula Fallback"
                : "Gemini Free Tier",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const debouncedQuickSend = useMemo(
    () => debounceCallback((prompt: string) => void sendChatMessage(prompt), 300),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, persona, messSummary],
  );

  useEffect(() => {
    return () => debouncedQuickSend.cancel();
  }, [debouncedQuickSend]);

  const runGroundedSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery ?? searchQuery).trim();
    if (q.length < 3 || searchLoading) return;
    if (overrideQuery) setSearchQuery(q);

    setSearchError(null);
    setSearchLoading(true);
    try {
      const response = await fetch("/api/gemini/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await response.json()) as {
        answer?: string;
        sources?: SearchSource[];
        cached?: boolean;
        error?: string;
      };
      if (!response.ok || !data.answer) {
        recordAiUsageEvent("fallback", {
          status: response.status === 429 ? "quota_fallback" : "offline_fallback",
        });
        throw new Error(data.error ?? "Grounded search unavailable right now.");
      }
      recordAiUsageEvent(data.cached ? "cache" : "api", {
        model: "gemini-4-hydrogen",
        status: "ok",
      });
      setSearchResult({
        query: q,
        answer: data.answer,
        sources: data.sources ?? [],
      });
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Search request failed.");
    } finally {
      setSearchLoading(false);
    }
  };

  const submitAudioBlob = async (blob: Blob) => {
    setVoiceError(null);
    setTranscribing(true);
    try {
      const audioBase64 = await blobToBase64(blob);
      const mimeType = normalizeAudioMimeType(blob.type || "audio/webm");
      const response = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType,
          category: voiceCategory,
        }),
      });
      const data = (await response.json()) as {
        transcript?: string;
        summary?: string;
        error?: string;
      };
      if (!response.ok || !data.transcript) {
        recordAiUsageEvent("fallback", { status: "offline_fallback" });
        throw new Error(data.error ?? "Audio transcription failed.");
      }
      recordAiUsageEvent("api", { model: "gemini-3.5-transcribe", status: "ok" });
      const transcript = data.transcript;
      const summary = data.summary ?? transcript.slice(0, 140);
      setLatestTranscript({
        transcript,
        summary,
        category: voiceCategory,
      });

      if (user?.uid && user.emailVerified) {
        await saveVoiceLogRecord({
          userId: user.uid,
          category: voiceCategory,
          transcript,
          summary,
        });
        toast.success("Voice log transcribed and saved to Firestore.");
      } else {
        toast.success("Voice audio transcribed.");
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Could not transcribe audio.");
    } finally {
      setTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    setVoiceError(null);
    if (recording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError(
        "Microphone capture is unavailable in this browser. Upload an audio clip below instead.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size > 0) {
          void submitAudioBlob(blob);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (error) {
      setVoiceError(
        error instanceof Error
          ? error.message
          : "Microphone permission denied. Upload an audio clip instead.",
      );
    }
  };

  const quickPrompts =
    language === "hi"
      ? [
          "स्टॉक में कम या जल्द समाप्त होने वाली सामग्री क्या है?",
          "मासिक मेस बिल और बकाया राशि का सारांश दें",
          "भोजन अपव्यय सबसे अधिक किस व्यंजन में है?",
          "आज का मेनू और औसत प्लेट लागत क्या है?",
        ]
      : [
          "What stock items are low or expiring soon?",
          "Summarize our monthly bills and pending dues",
          "Which dish has the highest food waste?",
          "What is today's menu and plate cost?",
        ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col bg-white p-0 sm:max-w-md">
        <SheetHeader className="border-b border-[#E5EAF0] p-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-[#087E8B] text-white">
              <Sparkles className="size-4 text-amber-300" />
            </div>
            <div>
              <SheetTitle className="font-display text-base font-bold text-[#172B3A]">
                {language === "hi" ? "फूडफ्लो AI सहायक" : "Ask FoodFlow AI"}
              </SheetTitle>
              <span className="text-[11px] text-[#718096]">
                {language === "hi"
                  ? "मेस डेटा (गोपनीयता-सुरक्षित) • कैश • फ्री टियर"
                  : "Mess Data Grounding (No PII) • Cached • Free Tier"}
              </span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-[#F5F8FA] p-1">
            {(
              [
                { id: "chat", label: language === "hi" ? "मेस कोपायलट" : "Mess Copilot", icon: Bot },
                {
                  id: "search",
                  label: language === "hi" ? "लाइव खोज" : "Live Search",
                  icon: Globe,
                },
                { id: "voice", label: language === "hi" ? "वॉइस लॉग" : "Voice Log", icon: Mic },
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const active = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[11px] font-bold transition-colors ${
                    active
                      ? "bg-white text-[#087E8B] shadow-xs"
                      : "text-[#718096] hover:text-[#172B3A]"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </SheetHeader>

        {/* MODE 1: DATA-GROUNDED GEMINI CHAT */}
        {mode === "chat" && (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-[#E5EAF0] bg-[#F8FAFC] px-4 py-2 text-[11px]">
              <label className="flex items-center gap-1.5 font-semibold text-[#172B3A]">
                <span>{language === "hi" ? "सहायक भूमिका:" : "Role:"}</span>
                <select
                  value={persona}
                  onChange={(e) => setPersona(e.target.value as ChatPersona)}
                  className="rounded-lg border border-[#E5EAF0] bg-white px-2 py-1 text-[11px] font-semibold text-[#172B3A]"
                >
                  <option value="kitchen_copilot">
                    {language === "hi" ? "रसोई प्रमुख" : "Kitchen Head"}
                  </option>
                  <option value="warden_ops">
                    {language === "hi" ? "हॉस्टल वार्डन" : "Hostel Warden"}
                  </option>
                  <option value="student_helper">
                    {language === "hi" ? "छात्र सहायक" : "Student Helper"}
                  </option>
                </select>
              </label>

              <label className="flex items-center gap-1.5 font-semibold text-[#172B3A]">
                <span>{language === "hi" ? "मॉडल:" : "Model:"}</span>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as ChatModel)}
                  className="rounded-lg border border-[#E5EAF0] bg-white px-2 py-1 text-[11px] font-semibold text-[#087E8B]"
                >
                  <option value="gemini-3.1-flash-lite">Flash-Lite (Fast)</option>
                  <option value="gemini-4-hydrogen">Hydrogen (Ops)</option>
                </select>
              </label>
            </div>

            <div ref={chatScrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {chatHistory.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "model" && (
                    <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#DDF3EA] text-[#087E8B]">
                      <Bot className="size-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] space-y-1.5 rounded-2xl p-3.5 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-tr-xs bg-[#087E8B] text-white"
                        : "rounded-tl-xs border border-[#E5EAF0] bg-[#F5F8FA] text-[#172B3A]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.badge && (
                      <Badge
                        variant="outline"
                        className="border-[#087E8B]/20 bg-white text-[9px] text-[#087E8B]"
                      >
                        {msg.badge}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex items-center gap-2 text-xs text-[#718096]">
                  <LoaderCircle className="size-3.5 animate-spin text-[#087E8B]" />
                  <span>
                    {language === "hi"
                      ? `${model} से मेस डेटा का विश्लेषण हो रहा है...`
                      : `Analyzing mess summary with ${model}...`}
                  </span>
                </div>
              )}
              {chatNotice && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{chatNotice}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-[#E5EAF0] bg-[#F5F8FA] p-3">
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => debouncedQuickSend(prompt)}
                    className="rounded-full border border-[#E5EAF0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#172B3A] transition-colors hover:border-[#087E8B] hover:text-[#087E8B]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendChatMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    language === "hi"
                      ? "स्टॉक, बिल, अपव्यय या मेनू के बारे में पूछें..."
                      : "Ask about your stock, bills, waste, menu..."
                  }
                  className="h-10 rounded-xl border-[#E5EAF0] bg-white text-xs"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={chatLoading}
                  aria-label="Send chat message"
                  className="h-10 w-10 shrink-0 rounded-xl bg-[#087E8B] text-white"
                >
                  <Send className="size-4" />
                </Button>
              </form>
            </div>
          </>
        )}

        {/* MODE 2: GOOGLE SEARCH GROUNDING */}
        {mode === "search" && (
          <div className="flex flex-1 flex-col justify-between overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-3.5 text-xs text-[#475569]">
                Look up current Indian commodity prices, FSSAI holding temperatures, or upcoming
                hostel holiday dining calendars grounded with live Google Search citations.
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[
                  "Current wholesale toor dal and basmati rice price India",
                  "FSSAI hot cooked food holding temperature guidelines India",
                  "Upcoming Indian gazetted holidays November December 2026",
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => void runGroundedSearch(sample)}
                    className="rounded-full border border-[#E5EAF0] bg-white px-2.5 py-1 text-[11px] font-medium text-[#172B3A] hover:border-[#087E8B] hover:text-[#087E8B]"
                  >
                    {sample}
                  </button>
                ))}
              </div>

              {searchLoading && (
                <div className="flex items-center gap-2 text-xs text-[#718096]">
                  <LoaderCircle className="size-4 animate-spin text-[#087E8B]" />
                  <span>Grounding answer with Google Search...</span>
                </div>
              )}

              {searchError && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchResult && (
                <div className="space-y-3 rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                      Grounded Answer
                    </span>
                    <Badge className="bg-[#DDF3EA] text-[#087E8B] border-none text-[10px]">
                      Google Search
                    </Badge>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-[#172B3A]">
                    {searchResult.answer}
                  </p>
                  {searchResult.sources.length > 0 && (
                    <div className="border-t border-[#E5EAF0] pt-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#718096]">
                        Cited Sources
                      </p>
                      <ul className="space-y-1.5">
                        {searchResult.sources.slice(0, 6).map((source, index) => (
                          <li key={index}>
                            <a
                              href={source.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#087E8B] hover:underline"
                            >
                              <ExternalLink className="size-3 shrink-0" />
                              <span className="line-clamp-1">{source.title}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void runGroundedSearch();
              }}
              className="flex gap-2 border-t border-[#E5EAF0] bg-[#F5F8FA] p-3"
            >
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commodity prices, FSSAI rules..."
                className="h-10 rounded-xl border-[#E5EAF0] bg-white text-xs"
              />
              <Button
                type="submit"
                disabled={searchLoading}
                className="h-10 rounded-xl bg-[#087E8B] px-3.5 text-xs font-bold text-white"
              >
                Search
              </Button>
            </form>
          </div>
        )}

        {/* MODE 3: VOICE AUDIO TRANSCRIPTION */}
        {mode === "voice" && (
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-2xl border border-[#E5EAF0] bg-[#F8FAFC] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#172B3A]">Log Category</span>
                <select
                  value={voiceCategory}
                  onChange={(e) => setVoiceCategory(e.target.value as VoiceCategory)}
                  className="rounded-lg border border-[#E5EAF0] bg-white px-2.5 py-1 text-xs font-semibold text-[#172B3A]"
                >
                  <option value="waste">Plate & Prep Waste</option>
                  <option value="inventory">Stock Count / Expiry</option>
                  <option value="feedback">Student Dining Note</option>
                  <option value="general">General Kitchen Memo</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void toggleRecording()}
                  disabled={transcribing}
                  className={`flex-1 rounded-xl text-xs font-bold ${
                    recording
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-[#087E8B] text-white hover:bg-[#07545B]"
                  }`}
                >
                  {recording ? (
                    <>
                      <Square className="mr-1.5 size-3.5" />
                      Stop & Transcribe
                    </>
                  ) : (
                    <>
                      <Mic className="mr-1.5 size-3.5" />
                      Record Voice Note
                    </>
                  )}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void submitAudioBlob(file);
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={transcribing || recording}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border-[#E5EAF0] text-xs font-semibold"
                >
                  <Upload className="mr-1.5 size-3.5" />
                  Upload Audio
                </Button>
              </div>

              {transcribing && (
                <div className="flex items-center gap-2 text-xs text-[#087E8B]">
                  <LoaderCircle className="size-3.5 animate-spin" />
                  <span>Transcribing audio via Gemini 3.5 Transcribe...</span>
                </div>
              )}

              {voiceError && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{voiceError}</span>
                </div>
              )}
            </div>

            {latestTranscript && (
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#087E8B]">
                    Latest Transcription
                  </span>
                  <Badge className="bg-[#DDF3EA] text-[#087E8B] border-none text-[10px] capitalize">
                    {latestTranscript.category}
                  </Badge>
                </div>
                <p className="text-xs font-medium leading-relaxed text-[#172B3A]">
                  {latestTranscript.transcript}
                </p>
                <p className="rounded-xl bg-[#F5F8FA] p-2.5 text-[11px] text-[#475569]">
                  <strong>Summary:</strong> {latestTranscript.summary}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
                {user ? "Synced Firestore Voice Logs" : "Sign in to save voice logs"}
              </p>
              {savedVoiceLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-[#E5EAF0] bg-[#F8FAFC] p-3 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-[#172B3A]">
                    <span className="capitalize">{log.category}</span>
                    <span className="text-[10px] font-normal text-[#718096]">Saved</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#475569]">{log.transcript}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
