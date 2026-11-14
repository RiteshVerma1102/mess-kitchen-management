'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  timestamp: string;
}

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AiAssistantModal({ isOpen, onClose }: AiAssistantModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'assistant',
      text: 'Hello Chef! I am your AI Kitchen & Demand Operations Assistant powered by Google Gemini. How can I assist you with today\'s meal schedule, ingredient buffer, or waste reduction?',
      source: 'Google Gemini AI',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    'How can we reduce lunch leftovers today?',
    'What safety buffer should we use for tomorrow?',
    'Which ingredients need urgent purchase indents?',
    'Compare current meal cost with monthly budget',
  ];

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!messageText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history: messages.slice(-4).map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
        }),
      });

      if (res.ok) {
        const body = await res.json();
        const replyMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: body.data?.reply || 'Operational recommendations loaded.',
          source: body.data?.source || 'Google Gemini AI',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, replyMsg]);
      } else {
        throw new Error('Failed to reach AI service');
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: 'Unable to connect to AI server. Please verify your internet connection or check the dashboard metrics.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#253746]/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-[#E5EAF0] z-10 flex flex-col h-[600px] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5EAF0] bg-[#087E8B] px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl border border-white/20">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white">AI Kitchen Assistant</h3>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white border border-white/30">
                  Gemini Active
                </span>
              </div>
              <p className="text-[11px] text-[#DDF3F3]">Real-time demand, buffer, and recipe intelligence</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition"
          >
            ✕
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 scrollbar-thin bg-[#F5F7FA]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-[#087E8B] text-white rounded-br-xs shadow-xs'
                    : 'bg-white text-[#253746] border border-[#E5EAF0] rounded-bl-xs shadow-2xs'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>
                {m.source && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-[#087E8B] font-semibold border-t border-[#E5EAF0] pt-1">
                    <span>✨ {m.source}</span>
                  </div>
                )}
              </div>
              <span className="mt-1 px-1 text-[10px] text-[#718096]">{m.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#718096] bg-white p-3 rounded-2xl border border-[#E5EAF0] w-fit">
              <span className="h-2 w-2 rounded-full bg-[#087E8B] animate-bounce" />
              <span className="h-2 w-2 rounded-full bg-[#087E8B] animate-bounce delay-100" />
              <span className="h-2 w-2 rounded-full bg-[#087E8B] animate-bounce delay-200" />
              <span className="text-[11px] text-[#718096] font-medium">Analyzing kitchen records & models...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2 border-t border-[#E5EAF0] bg-white flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#718096] shrink-0">
            Suggested:
          </span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q)}
              className="shrink-0 rounded-full bg-[#F5F7FA] hover:bg-[#DDF3F3] hover:text-[#087E8B] hover:border-[#087E8B]/30 border border-[#E5EAF0] px-3 py-1 text-[11px] font-medium text-[#253746] transition"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 border-t border-[#E5EAF0] bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about meal turnout, buffers, waste, recipes..."
              className="flex-1 rounded-xl border border-[#E5EAF0] bg-[#F5F7FA] px-4 py-2.5 text-xs text-[#253746] placeholder-[#718096] focus:bg-white focus:border-[#087E8B] focus:outline-none focus:ring-1 focus:ring-[#087E8B] transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087E8B] text-white shadow-xs hover:bg-[#066873] disabled:opacity-40 transition"
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
