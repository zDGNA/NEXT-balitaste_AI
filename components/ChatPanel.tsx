"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message { role: "user" | "ai"; content: string; }

export interface Restaurant {
    id: number; nama: string; kabupaten: string;
    rating: number; total_review: number; kategori: string;
    highlights: string[]; price_range: string; best_time: string;
    link: string; lat: number; lng: number;
}

function parseIntent(text: string): URLSearchParams {
    const lower = text.toLowerCase();
    const p: Record<string, string> = { min_rating: "3.5", min_review: "20", top_n: "8" };

    const areaMap: [string[], string][] = [
        [["ubud","tegallalang","payangan","gianyar","sukawati"], "Gianyar"],
        [["canggu","seminyak","kerobokan","jimbaran","uluwatu","nusa dua","kuta","legian","badung","pecatu"], "Badung"],
        [["denpasar","sanur","renon","sesetan"], "Denpasar"],
        [["tabanan","tanah lot","bedugul","baturiti"], "Tabanan"],
        [["singaraja","lovina","buleleng","seririt"], "Buleleng"],
        [["kintamani","bangli"], "Bangli"],
        [["amed","candidasa","karangasem","tirtagangga","sidemen","amlapura"], "Karangasem"],
        [["nusa penida","nusa lembongan","klungkung","semarapura"], "Klungkung"],
        [["negara","medewi","jembrana","melaya"], "Jembrana"],
    ];
    for (const [keys, kab] of areaMap) {
        if (keys.some((k) => lower.includes(k))) { p.kabupaten = kab; break; }
    }

    if      (lower.match(/sunset|view|rooftop|pantai|beach|pemandangan/)) p.kategori = "Sunset & View";
    else if (lower.match(/kerja|laptop|wifi|coworking|work|coffee shop/)) p.kategori = "Work from Cafe";
    else if (lower.match(/malam|nightlife|bar|club|cocktail|party/))      p.kategori = "Vibrant Nightlife";
    else if (lower.match(/keluarga|family|anak|kids/))                    p.kategori = "Family Friendly";
    else if (lower.match(/murah|budget|hemat|cheap|terjangkau/))          p.kategori = "Budget Friendly";
    else if (lower.match(/romantis|romantic|date|couple|anniversary/))    p.kategori = "Romantic & Cozy";

    // Budget parser — "100k", "50rb", "budget 150", "max 200k"
    const budgetMatch = lower.match(/(?:budget|max|maksimal|harga|under|di bawah)?\s*(\d+)\s*(k|rb|ribu|jt|juta)?/);
    if (budgetMatch) {
        const num  = parseFloat(budgetMatch[1]);
        const unit = budgetMatch[2] ?? "";
        let   val  = num;
        if (unit.match(/k|rb|ribu/)) val = num * 1000;
        else if (unit.match(/jt|juta/)) val = num * 1_000_000;
        else if (num <= 5000) val = num * 1000; // "100" → "100k"
        if (val >= 10_000 && val <= 2_000_000) p.budget = String(val);
    }

    const namaMatch = lower.match(/tentang\s+(.+?)(?:\s+di\s+|\s+—|\?|$)/);
    if (namaMatch) p.nama = namaMatch[1].trim();

    return new URLSearchParams(p);
}

function buildSystemPrompt(restaurants: Restaurant[]): string {
    const base = `Kamu adalah BaliBites AI — personal culinary concierge Bali, Indonesia.
Kamu punya akses ke database 1,352 restoran nyata di seluruh Bali dengan koordinat GPS.

PERSONA: Hangat, personal, bilingual natural (Indonesia + Inggris).

ATURAN:
1. SELALU rekomendasikan tempat spesifik dari DATA di bawah — jangan tanya balik terus
2. Sebutkan: nama, lokasi, rating, rentang harga, dan kenapa cocok
3. Highlight 2-3 menu/suasana dari ulasan nyata kalau ada
4. 1 tip lokal berguna (jam terbaik, cara reservasi, dll)
5. Boleh tanya 1 hal untuk refinement di akhir
6. Maks 250 kata, conversational, emoji secukupnya`;

    if (!restaurants.length) return base;

    const ctx = restaurants.map((r, i) => {
        const h = r.highlights.filter(s => s.length > 2).slice(0, 3).join(", ");
        return `${i + 1}. **${r.nama}** (${r.kabupaten})
   ⭐${r.rating} · ${r.total_review.toLocaleString()} ulasan · ${r.price_range}
   Kategori: ${r.kategori.split("|").map(s => s.trim()).join(" · ")}
   Best time: ${r.best_time}${h ? `\n   Known for: ${h}` : ""}`;
    }).join("\n\n");

    return `${base}\n\n---\n📍 DATA RESTORAN RELEVAN:\n\n${ctx}`;
}

function fmt(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
}

interface ChatPanelProps {
    onOpen?: () => void;
    initialMessage?: string | null;
    onMessageSent?: () => void;
    onRestaurantsLoaded?: (restaurants: Restaurant[]) => void;
    onFocusRestaurant?: (restaurant: Restaurant | null) => void;
}

export default function ChatPanel({
    onOpen, initialMessage, onMessageSent,
    onRestaurantsLoaded, onFocusRestaurant,
}: ChatPanelProps) {
    const [isOpen, setIsOpen]           = useState(false);
    const [messages, setMessages]       = useState<Message[]>([{
        role: "ai",
        content: "Selamat datang! 🌺 Saya personal food guide Bali kamu — **1,352 restoran real** dari Sabang sampai... eh, dari Jembrana sampai Karangasem! 😄\n\nCoba: *\"Romantic dinner sunset view\"*, *\"Warung budget 50k di Canggu\"*, atau *\"Top café Ubud wifi bagus\"* 🎯",
    }]);
    const [input, setInput]             = useState("");
    const [isTyping, setIsTyping]       = useState(false);
    const [showQuick, setShowQuick]     = useState(true);
    const [showNotif, setShowNotif]     = useState(true);
    const [convHistory, setConvHistory] = useState<{ role: string; content: string }[]>([]);
    const [loadedResto, setLoadedResto] = useState<Restaurant[]>([]);
    const [status, setStatus]           = useState("Ready · 1,352 restaurants");

    const endRef   = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialMessage) {
            openChat();
            setTimeout(() => send(initialMessage), 400);
            onMessageSent?.();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessage]);

    useEffect(() => {
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }, [messages, isTyping]);

    const openChat = useCallback(() => {
        setIsOpen(true);
        setShowNotif(false);
        onOpen?.();
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [onOpen]);

    const send = useCallback(async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || isTyping) return;

        setInput("");
        setShowQuick(false);
        setMessages(p => [...p, { role: "user", content: msg }]);
        setIsTyping(true);
        setStatus("Mencari restoran...");

        // 1. Fetch dari dataset
        let fresh = loadedResto;
        try {
            const res = await fetch(`/api/restaurants?${parseIntent(msg)}`);
            if (res.ok) {
                const data: Restaurant[] = await res.json();
                if (data.length > 0) {
                    fresh = data;
                    setLoadedResto(data);
                    onRestaurantsLoaded?.(data);
                    // Focus map ke restoran pertama
                    if (data[0]) onFocusRestaurant?.(data[0]);
                    setStatus(`${data.length} spots found · map updated`);
                }
            }
        } catch { /* lanjut */ }

        // 2. Call Gemini
        const hist = [...convHistory, { role: "user", content: msg }];
        setConvHistory(hist);
        setStatus("Thinking...");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: hist, systemPrompt: buildSystemPrompt(fresh) }),
            });
            setIsTyping(false);
            setStatus(fresh.length > 0 ? `${fresh.length} spots on map` : "Ready");

            if (res.ok) {
                const { reply } = await res.json();
                setConvHistory(p => [...p, { role: "assistant", content: reply }]);
                setMessages(p => [...p, { role: "ai", content: reply }]);
            } else throw new Error(`${res.status}`);
        } catch (e) {
            console.error(e);
            setIsTyping(false);
            setStatus("Ready");
            setMessages(p => [...p, { role: "ai", content: "Maaf, ada gangguan. Coba lagi ya! 🙏" }]);
        }
    }, [input, isTyping, convHistory, loadedResto, onRestaurantsLoaded, onFocusRestaurant]);

    const quick = (t: string) => { openChat(); setTimeout(() => send(t), 150); };

    return (
        <div className="chat-bubble">
            {isOpen && (
                <div className="chat-panel open">
                    <div className="chat-header">
                        <div className="chat-avatar">🤖</div>
                        <div className="chat-header-info">
                            <h3>BaliBites AI</h3>
                            <div className="chat-status"><span className="status-dot"></span>{status}</div>
                        </div>
                        <button className="chat-close" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    <div className="chat-messages">
                        {messages.map((m, i) => (
                            <div key={i} className={`msg msg-${m.role}`}>
                                <div className="msg-avatar">{m.role === "ai" ? "🌿" : "👤"}</div>
                                <div className="msg-bubble" dangerouslySetInnerHTML={{ __html: fmt(m.content) }} />
                            </div>
                        ))}
                        {isTyping && (
                            <div className="msg msg-ai typing-indicator">
                                <div className="msg-avatar">🌿</div>
                                <div className="typing-dots">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {showQuick && (
                        <div className="quick-prompts">
                            <div className="qp" onClick={() => quick("Romantic dinner sunset view Bali malam ini")}>🕯️ Romantic dinner</div>
                            <div className="qp" onClick={() => quick("Warung murah budget 50k di Canggu")}>💰 Budget 50k Canggu</div>
                            <div className="qp" onClick={() => quick("Café wifi bagus untuk kerja di Ubud")}>💻 Work café Ubud</div>
                            <div className="qp" onClick={() => quick("Top restoran Nusa Penida Klungkung")}>🏝️ Nusa Penida</div>
                        </div>
                    )}

                    <div className="chat-input-area">
                        <input ref={inputRef} className="chat-input"
                            placeholder="Tanya kuliner Bali... (contoh: budget 100k di Seminyak)"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && send()} />
                        <button className="chat-send" onClick={() => send()} disabled={isTyping}>➤</button>
                    </div>
                </div>
            )}
            <button className="chat-toggle" onClick={() => isOpen ? setIsOpen(false) : openChat()}>
                🍜{showNotif && <div className="chat-notif">1</div>}
            </button>
        </div>
    );
}