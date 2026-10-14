"use client";

import { useState, useRef, useEffect } from "react";

type Msg = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string; // generated image
  uploadUrl?: string; // user-uploaded image
};

const SUGGESTIONS = ["Fashion ideas 💡", "Gift ideas 🎁", "Today's deals 🔥", "Style tips 👗"];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg && !uploadPreview) return;
    const userMsg: Msg = { role: "user", content: msg || "Ye image dekho 👀", uploadUrl: uploadPreview || undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setUploadPreview(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const d = await res.json();
      if (d.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: d.text, imageUrl: d.imageUrl }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: "Oops! Kuch garbar hui. Phir se try karo! 😅" }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection issue! Phir se try karo! 😅" }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#fef9f3]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-orange-100 bg-white/90 px-4 py-3 backdrop-blur">
        <a href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg hover:bg-gray-200" title="Back">
          ←
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/zuvo-assistant-wave.jpg" alt="Zuzu AI" className="h-10 w-10 rounded-full object-cover ring-2 ring-orange-200" />
        <div>
          <h1 className="text-base font-extrabold text-gray-900">Zuzu AI Chat</h1>
          <p className="text-xs text-gray-500">Ask anything • Shopping help • Fully open 🧠</p>
        </div>
      </div>

      {/* Messages — only this scrolls */}
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="mt-10 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/zuvo-assistant-wave.jpg" alt="Zuzu" className="mx-auto h-20 w-20 rounded-full object-cover ring-4 ring-orange-100" />
            <h2 className="mt-4 text-xl font-extrabold text-gray-900">Hey, I&apos;m Zuzu! 👋</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Kuch bhi pucho — shopping help, fashion ideas, gift suggestions, ya bas gappein! 🛍️
            </p>
            <div className="mx-auto mt-4 flex max-w-sm flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s.replace(/ [^ ]*$/, ""))}
                  className="rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-orange-500 text-white" : "bg-white text-gray-800 shadow-sm ring-1 ring-gray-100"}`}>
              {m.uploadUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.uploadUrl} alt="uploaded" className="mb-2 max-h-48 rounded-xl object-cover" />
              )}
              {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
              {m.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.imageUrl} alt="generated" className="mt-2 max-h-72 rounded-xl object-cover" />
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm ring-1 ring-gray-100">
              <span className="animate-pulse">Zuzu soch raha hai... 💭</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Upload preview */}
      {uploadPreview && (
        <div className="flex items-center gap-2 border-t border-orange-100 bg-orange-50 px-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploadPreview} alt="preview" className="h-12 w-12 rounded-lg object-cover" />
          <span className="text-xs text-gray-600">Image attached!</span>
          <button onClick={() => setUploadPreview(null)} className="ml-auto text-xs font-bold text-red-500">✕ Remove</button>
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 border-t border-orange-100 bg-white">
      {/* Suggestion chips — always visible above the input, even mid-chat */}
      <div className="mx-auto w-full max-w-3xl overflow-x-auto px-3 pt-2">
        <div className="flex gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s.replace(/ [^ ]*$/, ""))}
              className="shrink-0 rounded-full bg-orange-100 px-3 py-1.5 text-xs font-bold text-orange-700 hover:bg-orange-200"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="mx-auto flex w-full max-w-3xl items-center gap-2 px-3 py-3"
      >
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xl hover:bg-gray-200"
          title="Upload image"
        >
          📷
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Kuch bhi pucho... 🛍️"
          className="h-10 flex-1 rounded-full bg-gray-100 px-4 text-sm outline-none focus:ring-2 focus:ring-orange-300"
        />
        <button
          type="submit"
          disabled={loading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-lg text-white hover:bg-orange-600 disabled:opacity-50"
        >
          ➤
        </button>
      </form>
      </div>
    </div>
  );
}
