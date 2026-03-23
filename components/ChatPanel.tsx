"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message { role: "user" | "ai"; content: string; }

interface Restaurant {
    id: number; nama: string; kabupaten: string;
    rating: number; total_review: number; kategori: string;
    highlights: string[]; price_range: string; best_time: string; link: string;
}

// ── Parse user message jadi query params ──────────────────────────────────────
function parseIntent(text: string): URLSearchParams {
    const lower = text.toLowerCase();
    const p: Record<string, string> = { min_rating: "3.5", min_review: "20", top_n: "6" };

    const areaMap: [string[], string][] = [
        [["ubud","tegallalang","payangan","gianyar","sukawati"], "Gianyar"],
        [["canggu","seminyak","kerobokan","jimbaran","uluwatu","nusa dua","kuta","legian","badung","pecatu"], "Badung"],
        [["denpasar","sanur","renon","sesetan","kota"], "Denpasar"],
        [["tabanan","tanah lot","bedugul","baturiti","kerambitan"], "Tabanan"],
        [["singaraja","lovina","buleleng","seririt"], "Buleleng"],
        [["kintamani","bangli","tembuku"], "Bangli"],
        [["amed","candidasa","karangasem","tirtagangga","sidemen","amlapura"], "Karangasem"],
        [["nusa penida","nusa lembongan","nusa ceningan","klungkung","semarapura"], "Klungkung"],
        [["negara","medewi","jembrana","melaya","pekutatan"], "Jembrana"],
    ];
    for (const [keys, kab] of areaMap) {
        if (keys.some((k) => lower.includes(k))) { p.kabupaten = kab; break; }
    }

    if (lower.match(/sunset|view|pantai|beach|rooftop|pemandangan|ocean/))
        p.kategori = "Sunset & View";
    else if (lower.match(/kerja|laptop|wifi|coworking|work|kopi|coffee/))
        p.kategori = "Work from Cafe";
    else if (lower.match(/malam|nightlife|bar|club|cocktail|party|dj/))
        p.kategori = "Vibrant Nightlife";
    else if (lower.match(/keluarga|family|anak|kids/))
        p.kategori = "Family Friendly";
    else if (lower.match(/murah|budget|hemat|cheap|affordable|terjangkau/))
        p.kategori = "Budget Friendly";
    else if (lower.match(/romantis|romantic|date|couple|anniversary/))
        p.kategori = "Romantic & Cozy";

    // Nama spesifik — kalau user tanya "tentang X di Y"
    const namaMatch = lower.match(/tentang\s+(.+?)(?:\s+di\s+|\s+—|\s+worth|\?|$)/);
    if (namaMatch) p.nama = namaMatch[1].trim();

    return new URLSearchParams(p);
}

// ── Build system prompt dengan data real ─────────────────────────────────────
function buildSystemPrompt(restaurants: Restaurant[]): string {
    const base = `Kamu adalah BaliBites AI — personal culinary concierge Bali, Indonesia.
Kamu punya akses ke database 1,352 restoran nyata di seluruh Bali.

PERSONA: Hangat, personal, seperti teman lokal yang tahu semua spot di Bali. Bilingual alami (mix Indonesia + Inggris).

ATURAN MENJAWAB:
1. SELALU rekomendasikan tempat spesifik — jangan cuma tanya balik terus
2. Sebutkan: nama, lokasi, rating, price range, dan kenapa bagus
3. Kalau ada highlight menu (dari ulasan nyata), sebutkan 2-3 yang menarik  
4. Tambahkan 1 tip lokal yang berguna (jam terbaik, cara order, dll)
5. Di akhir boleh tanya 1 hal untuk refinement (bukan 3 pertanyaan sekaligus)
6. Maksimal 250 kata, format conversational dengan emoji secukupnya
7. Gunakan data restoran di bawah sebagai referensi UTAMA`;

    if (!restaurants.length) return base;

    const ctx = restaurants.map((r, i) => {
        const h = r.highlights.filter(s => s.length > 0).slice(0, 3).join(", ");
        return `${i + 1}. **${r.nama}** — ${r.kabupaten}
   ⭐${r.rating} · ${r.total_review.toLocaleString()} ulasan · ${r.price_range}
   Kategori: ${r.kategori.split("|").map(s => s.trim()).join(" · ")}
   Best time: ${r.best_time}${h ? `\n   Highlights: ${h}` : ""}`;
    }).join("\n\n");

    return `${base}\n\n---\n📍 DATA RESTORAN RELEVAN (prioritaskan ini):\n\n${ctx}`;
}

function formatMessage(text: string): string {
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
}

export default function ChatPanel({ onOpen, initialMessage, onMessageSent }: ChatPanelProps) {
    const [isOpen, setIsOpen]               = useState(false);
    const [messages, setMessages]           = useState<Message[]>([{
        role: "ai",
        content: "Selamat datang! 🌺 I'm your personal Bali food guide — powered by **1,352 real restaurants** across all 9 kabupaten.\n\nCoba tanya: *\"Romantic dinner sunset view\"*, *\"Warung budget di Canggu\"*, atau *\"Top café Ubud untuk kerja\"* 🎯",
    }]);
    const [input, setInput]                 = useState("");
    const [isTyping, setIsTyping]           = useState(false);
    const [showQuick, setShowQuick]         = useState(true);
    const [showNotif, setShowNotif]         = useState(true);
    const [convHistory, setConvHistory]     = useState<{ role: string; content: string }[]>([]);
    const [loadedResto, setLoadedResto]     = useState<Restaurant[]>([]);
    const [statusText, setStatusText]       = useState("Ready to find your perfect meal");

    const endRef   = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialMessage) {
            openChat();
            setTimeout(() => sendMessage(initialMessage), 400);
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

    const sendMessage = useCallback(async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || isTyping) return;

        setInput("");
        setShowQuick(false);
        setMessages(prev => [...prev, { role: "user", content: msg }]);
        setIsTyping(true);
        setStatusText("Mencari restoran...");

        // ── 1. Fetch restoran relevan dari dataset lokal ──────────────
        let freshResto = loadedResto;
        try {
            const res = await fetch(`/api/restaurants?${parseIntent(msg)}`);
            if (res.ok) {
                const data: Restaurant[] = await res.json();
                if (data.length > 0) {
                    freshResto = data;
                    setLoadedResto(data);
                    setStatusText(`${data.length} spots found`);
                }
            }
        } catch { /* gunakan data lama */ }

        // ── 2. Call Claude via server route (fix CORS) ────────────────
        const newHist = [...convHistory, { role: "user", content: msg }];
        setConvHistory(newHist);
        setStatusText("Thinking...");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages:     newHist,
                    systemPrompt: buildSystemPrompt(freshResto),
                }),
            });

            setIsTyping(false);
            setStatusText(freshResto.length > 0 ? `${freshResto.length} spots loaded` : "Ready");

            if (res.ok) {
                const { reply } = await res.json();
                setConvHistory(prev => [...prev, { role: "assistant", content: reply }]);
                setMessages(prev => [...prev, { role: "ai", content: reply }]);
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err) {
            console.error("Chat error:", err);
            setIsTyping(false);
            setStatusText("Ready");
            setMessages(prev => [...prev, {
                role: "ai",
                content: "Maaf, ada gangguan sebentar. Pastikan ANTHROPIC_API_KEY sudah di-set di .env.local ya! 🙏",
            }]);
        }
    }, [input, isTyping, convHistory, loadedResto]);

    const sendQuick = (text: string) => { openChat(); setTimeout(() => sendMessage(text), 150); };

    return (
        <div className="chat-bubble" id="chatBubble">
            {isOpen && (
                <div className="chat-panel open">
                    <div className="chat-header">
                        <div className="chat-avatar">🤖</div>
                        <div className="chat-header-info">
                            <h3>BaliBites AI</h3>
                            <div className="chat-status">
                                <span className="status-dot"></span>{statusText}
                            </div>
                        </div>
                        <button className="chat-close" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    <div className="chat-messages" id="chatMessages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`msg msg-${msg.role}`}>
                                <div className="msg-avatar">{msg.role === "ai" ? "🌿" : "👤"}</div>
                                <div className="msg-bubble"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
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
                            <div className="qp" onClick={() => sendQuick("Romantic dinner sunset view malam ini di Bali")}>🕯️ Romantic dinner</div>
                            <div className="qp" onClick={() => sendQuick("Warung murah enak di Canggu Badung")}>💰 Budget Canggu</div>
                            <div className="qp" onClick={() => sendQuick("Café wifi bagus untuk kerja di Ubud")}>💻 Work café Ubud</div>
                            <div className="qp" onClick={() => sendQuick("Top restoran di Nusa Penida Klungkung")}>🏝️ Nusa Penida</div>
                        </div>
                    )}

                    <div className="chat-input-area">
                        <input ref={inputRef} className="chat-input"
                            placeholder="Tanya apa saja tentang kuliner Bali..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()} />
                        <button className="chat-send" onClick={() => sendMessage()} disabled={isTyping}>➤</button>
                    </div>
                </div>
            )}
            <button className="chat-toggle" onClick={() => isOpen ? setIsOpen(false) : openChat()}>
                🍜
                {showNotif && <div className="chat-notif">1</div>}
            </button>
        </div>
    );
}
