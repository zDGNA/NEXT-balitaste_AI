"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message { role: "user" | "ai"; content: string; }

export interface Restaurant {
    id:           number;
    rank:         number;
    nama:         string;
    kabupaten:    string;
    rating:       number;
    total_review: number;
    kategori:     string;
    highlights:   string[];
    price_range:  string;
    best_time:    string;
    top_menu?:    string;
    promo?:       string;
    // Links — semua dari FastAPI row_to_dict
    link:         string;   // Google Maps
    gofood:       string;
    grabfood:     string;
    tiktok:       string;
    yt:           string;
    reels:        string;
    lat:          number | null;
    lng:          number | null;
    score_final:  number;
    score_semantic: number;
}

// ── Intent parser untuk /api/restaurant (map markers) ─────────────────────────
function parseIntent(text: string): URLSearchParams {
    const lower = text.toLowerCase();
    const p: Record<string, string> = { min_rating: "3.5", min_review: "20", top_n: "8" };
    const areaMap: [string[], string][] = [
        [["ubud","tegallalang","gianyar","sukawati"], "Gianyar"],
        [["canggu","seminyak","kerobokan","jimbaran","uluwatu","nusa dua","kuta","legian","badung","pecatu"], "Badung"],
        [["denpasar","sanur","renon","sesetan"], "Denpasar"],
        [["tabanan","tanah lot","bedugul","baturiti"], "Tabanan"],
        [["singaraja","lovina","buleleng"], "Buleleng"],
        [["kintamani","bangli"], "Bangli"],
        [["amed","candidasa","karangasem","tirtagangga","sidemen"], "Karangasem"],
        [["nusa penida","nusa lembongan","klungkung","semarapura"], "Klungkung"],
        [["negara","medewi","jembrana","melaya"], "Jembrana"],
    ];
    for (const [keys, kab] of areaMap)
        if (keys.some(k => lower.includes(k))) { p.kabupaten = kab; break; }
    if (lower.match(/sunset|view|pantai|beach|rooftop/))       p.kategori = "Sunset & View";
    else if (lower.match(/kerja|laptop|wifi|coworking|work/))  p.kategori = "Work from Cafe";
    else if (lower.match(/malam|nightlife|bar|club|cocktail/)) p.kategori = "Vibrant Nightlife";
    else if (lower.match(/keluarga|family|anak|kids/))         p.kategori = "Family Friendly";
    else if (lower.match(/murah|budget|hemat|cheap/))          p.kategori = "Budget Friendly";
    else if (lower.match(/romantis|romantic|date|couple/))     p.kategori = "Romantic & Cozy";
    return new URLSearchParams(p);
}

function fmt(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
}

// ── Platform badge ─────────────────────────────────────────────────────────────
const PLATFORM_CFG: Record<string, { color: string; icon: string; name: string }> = {
    gofood:     { color: "#e8333a", icon: "🟢", name: "GoFood" },
    grabfood:   { color: "#00b14f", icon: "🚗", name: "GrabFood" },
};

function PlatformBadge({ platform, url }: { platform: string; url?: string }) {
    const c = PLATFORM_CFG[platform] ?? { color: "#888", icon: "🍽️", name: platform };
    const active = url && url !== "N/A";
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10,
            border: `1px solid ${active ? c.color + "44" : "rgba(250,246,239,0.08)"}`,
            background: active ? `${c.color}11` : "rgba(250,246,239,0.03)",
            opacity: active ? 1 : 0.45,
        }}>
            <span style={{ fontSize: 15 }}>{c.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#faf6ef" : "rgba(250,246,239,0.3)" }}>
                    {c.name}
                </div>
                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.35)" }}>
                    {active ? "Pesan sekarang" : "Tidak tersedia"}
                </div>
            </div>
            {active ? (
                <a href={url} target="_blank" rel="noopener noreferrer" style={{
                    padding: "4px 10px", borderRadius: 8, background: c.color,
                    color: "#fff", fontSize: 11, textDecoration: "none", whiteSpace: "nowrap",
                }}>Order →</a>
            ) : (
                <span style={{ fontSize: 10, color: "rgba(250,246,239,0.2)" }}>N/A</span>
            )}
        </div>
    );
}

function SocialRow({ icon, label, url, color }: { icon: string; label: string; url?: string; color: string }) {
    const active = url && url !== "N/A";
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8,
            border: `1px solid ${active ? color + "33" : "rgba(250,246,239,0.07)"}`,
            background: active ? `${color}0d` : "transparent",
            opacity: active ? 1 : 0.4,
        }}>
            <span style={{ fontSize: 14 }}>{icon}</span>
            <span style={{ flex: 1, fontSize: 12, color: active ? "#faf6ef" : "rgba(250,246,239,0.3)" }}>{label}</span>
            {active ? (
                <a href={url} target="_blank" rel="noopener noreferrer" style={{
                    fontSize: 10, color, textDecoration: "none",
                    padding: "3px 8px", borderRadius: 6, border: `1px solid ${color}44`,
                }}>Lihat →</a>
            ) : (
                <span style={{ fontSize: 10, color: "rgba(250,246,239,0.2)" }}>Tidak tersedia</span>
            )}
        </div>
    );
}

// ── DetailPanel — pakai field langsung dari Restaurant object ─────────────────
function DetailPanel({ resto }: { resto: Restaurant }) {
    const q = encodeURIComponent(resto.nama + " Bali");
    // Social links dari data FastAPI (tiktok, yt, reels) + fallback search
    const social = {
        youtube:   resto.yt    !== "N/A" ? resto.yt    : `https://www.youtube.com/results?search_query=${q}+review`,
        tiktok:    resto.tiktok !== "N/A" ? resto.tiktok : `https://www.tiktok.com/search?q=${q}`,
        reels:     resto.reels !== "N/A" ? resto.reels  : `https://www.instagram.com/reels/audio/${q}`,
        instagram: `https://www.instagram.com/explore/tags/${encodeURIComponent(resto.nama.replace(/\s+/g,"").toLowerCase())}`,
    };

    return (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header */}
            <div style={{ paddingBottom: 12, borderBottom: "1px solid rgba(250,246,239,0.07)" }}>
                <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, fontWeight: 600, color: "#faf6ef", marginBottom: 4 }}>
                    {resto.nama}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    <span style={{ fontSize: 11, color: "rgba(250,246,239,0.45)" }}>📍 {resto.kabupaten}</span>
                    <span style={{ fontSize: 11, color: "rgba(250,246,239,0.45)" }}>⭐ {resto.rating}</span>
                    <span style={{ fontSize: 11, color: "rgba(250,246,239,0.45)" }}>{resto.total_review.toLocaleString()} ulasan</span>
                    <span style={{ fontSize: 11, background: "rgba(201,151,43,0.12)", color: "#e8c46a", padding: "1px 8px", borderRadius: 100 }}>{resto.price_range}</span>
                    {resto.best_time !== "N/A" && (
                        <span style={{ fontSize: 11, background: "rgba(250,246,239,0.06)", color: "rgba(250,246,239,0.4)", padding: "1px 8px", borderRadius: 100 }}>{resto.best_time}</span>
                    )}
                </div>

                {/* Highlights */}
                {Array.isArray(resto.highlights) && resto.highlights.filter(h => h && h !== "System.Object[]").length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "rgba(250,246,239,0.35)" }}>
                        ✨ {resto.highlights.filter(h => h && h !== "System.Object[]").slice(0, 3).join(" · ")}
                    </div>
                )}

                {/* Top menu */}
                {resto.top_menu && resto.top_menu !== "N/A" && (
                    <div style={{ marginTop: 5, fontSize: 11, color: "rgba(250,246,239,0.45)" }}>
                        🍴 {resto.top_menu.split(",").slice(0, 4).join(", ")}
                    </div>
                )}

                {/* Promo */}
                {resto.promo && resto.promo !== "N/A" && resto.promo !== "Tidak ada promo aktif" && (
                    <div style={{ marginTop: 4, fontSize: 11, color: "#e8c46a" }}>🎁 {resto.promo}</div>
                )}
            </div>

            {/* Delivery */}
            <div>
                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>
                    🚚 Pesan Online
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <PlatformBadge platform="gofood"     url={resto.gofood !== "N/A" ? resto.gofood : undefined} />
                    <PlatformBadge platform="grabfood"   url={resto.grabfood !== "N/A" ? resto.grabfood : undefined} />
                </div>
            </div>

            {/* Social */}
            <div>
                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>
                    📱 Review di Sosmed
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <SocialRow icon="▶️" label="YouTube"         url={social.youtube}   color="#00f2ea" />
                    <SocialRow icon="🎵" label="TikTok"          url={social.tiktok}    color="#00f2ea" />
                    <SocialRow icon="🎬" label="Instagram Reels" url={social.reels}     color="#00f2ea" />
                    <SocialRow icon="📸" label="Instagram Posts" url={social.instagram} color="#00f2ea" />
                </div>
            </div>

            {/* Google Maps */}
            {resto.link && resto.link !== "N/A" && (
                <a href={resto.link} target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "9px 0", borderRadius: 10,
                    background: "rgba(250,246,239,0.05)", border: "1px solid rgba(250,246,239,0.1)",
                    color: "rgba(250,246,239,0.6)", fontSize: 12, textDecoration: "none",
                }}>
                    🗺️ Buka di Google Maps
                </a>
            )}
        </div>
    );
}

// ── ChatPanel ──────────────────────────────────────────────────────────────────
interface ChatPanelProps {
    onOpen?:              () => void;
    initialMessage?:      string | null;
    onMessageSent?:       () => void;
    onRestaurantsLoaded?: (r: Restaurant[]) => void;
    onFocusRestaurant?:   (r: Restaurant | null) => void;
    userName?:            string;
}

export default function ChatPanel({
    onOpen, initialMessage, onMessageSent,
    onRestaurantsLoaded, onFocusRestaurant, userName,
}: ChatPanelProps) {
    const [isOpen, setIsOpen]         = useState(false);
    const [tab, setTab]               = useState<"chat" | "detail">("chat");
    const [messages, setMessages]     = useState<Message[]>([{
        role: "ai",
        content: `Halo${userName && userName !== "Guest" ? ` **${userName}**` : ""}! 🌺 Saya food guide Bali kamu.\n\nCoba: *"Warung budget 50k Canggu"*, *"Café WiFi Ubud"*, atau klik restoran di map! 🎯`,
    }]);
    const [input, setInput]           = useState("");
    const [isTyping, setIsTyping]     = useState(false);
    const [showQuick, setShowQuick]   = useState(true);
    const [showNotif, setShowNotif]   = useState(true);
    const [convHistory, setConvHistory] = useState<{ role: string; content: string }[]>([]);
    const [loadedResto, setLoadedResto] = useState<Restaurant[]>([]);
    const [detailResto, setDetailResto] = useState<Restaurant | null>(null);
    const [status, setStatus]         = useState("Ready · 1,352 restaurants");

    const endRef   = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // openChat — defined before send
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
        setStatus("Mencari...");

        // Step 1: Update map markers via /api/restaurant (cepat, tanpa BERT)
        try {
            const res = await fetch(`/api/restaurant?${parseIntent(msg)}`);
            if (res.ok) {
                const data: Restaurant[] = await res.json();
                if (data.length) {
                    setLoadedResto(data);
                    onRestaurantsLoaded?.(data);
                    onFocusRestaurant?.(data[0]);
                    setStatus(`${data.length} spots on map`);
                }
            }
        } catch { /* silent */ }

        // Step 2: /api/chat → FastAPI /chat (BERT semantic search)
        const hist = [...convHistory, { role: "user", content: msg }];
        setConvHistory(hist);
        setStatus("Thinking...");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, lokasi: "" }),
            });

            setIsTyping(false);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            console.log("[ChatPanel] /api/chat response:", data);

            // ── Handle response format: { intent, reply, results, restaurant } ──
            const reply = data.reply ?? "Maaf, tidak ada hasil.";

            setConvHistory(p => [...p, { role: "assistant", content: reply }]);
            setMessages(p => [...p, { role: "ai", content: reply }]);

            if (data.intent === "REKOMENDASI" && Array.isArray(data.results) && data.results.length > 0) {
                // Update map dengan hasil semantic search
                setLoadedResto(data.results);
                onRestaurantsLoaded?.(data.results);
                onFocusRestaurant?.(data.results[0]);
                setStatus(`${data.results.length} spots on map`);
            } else if (data.intent === "DETAIL" && data.restaurant) {
                // Tampilkan detail panel
                setDetailResto(data.restaurant);
                setTab("detail");
                setStatus("Detail mode");
            } else {
                setStatus("Ready");
            }

        } catch {
            setIsTyping(false);
            setStatus("Ready");
            setMessages(p => [...p, { role: "ai", content: "Maaf, ada gangguan. Coba lagi! 🙏" }]);
        }
    }, [input, isTyping, convHistory, loadedResto, onRestaurantsLoaded, onFocusRestaurant]);

    // Trigger dari luar (klik pin map / search bar page)
    useEffect(() => {
        if (!initialMessage) return;
        openChat();
        const t = setTimeout(() => { send(initialMessage); onMessageSent?.(); }, 450);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessage]);

    // Auto-scroll
    useEffect(() => {
        const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        return () => clearTimeout(t);
    }, [messages, isTyping]);

    // Expose ke window untuk Leaflet marker
    useEffect(() => {
        (window as any).__selectResto = (r: Restaurant) => {
            setDetailResto(r);
            setTab("detail");
            if (!isOpen) openChat();
        };
        return () => { delete (window as any).__selectResto; };
    }, [isOpen, openChat]);

    const quick = (t: string) => { openChat(); setTimeout(() => send(t), 200); };

    return (
        <div className="chat-bubble">
            {isOpen && (
                <div className="chat-panel open" style={{ width: 440, maxHeight: 640 }}>
                    {/* Header */}
                    <div className="chat-header">
                        <div className="chat-avatar">🤖</div>
                        <div className="chat-header-info">
                            <h3>BaliBites AI</h3>
                            <div className="chat-status"><span className="status-dot" />{status}</div>
                        </div>
                        <div style={{ display: "flex", gap: 3, marginLeft: "auto", marginRight: 6 }}>
                            {(["chat", "detail"] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)} style={{
                                    padding: "4px 10px", borderRadius: 8, border: "none",
                                    background: tab === t ? "rgba(196,96,58,0.25)" : "transparent",
                                    color: tab === t ? "#faf6ef" : "rgba(250,246,239,0.35)",
                                    fontSize: 11, cursor: "pointer", fontFamily: "DM Sans,sans-serif",
                                    display: "flex", alignItems: "center", gap: 4,
                                }}>
                                    {t === "chat" ? "💬 Chat" : "🍽️ Detail"}
                                    {t === "detail" && detailResto && (
                                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
                                    )}
                                </button>
                            ))}
                        </div>
                        <button className="chat-close" onClick={() => setIsOpen(false)}>×</button>
                    </div>

                    {/* Chat tab */}
                    {tab === "chat" && (
                        <>
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
                                            <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                                        </div>
                                    </div>
                                )}
                                <div ref={endRef} />
                            </div>

                            {showQuick && (
                                <div className="quick-prompts">
                                    <div className="qp" onClick={() => quick("Romantic dinner sunset view malam ini")}>🕯️ Romantic</div>
                                    <div className="qp" onClick={() => quick("Warung murah budget 50k Canggu")}>💰 Budget</div>
                                    <div className="qp" onClick={() => quick("Café wifi untuk kerja Ubud")}>💻 Work Café</div>
                                    <div className="qp" onClick={() => quick("Babi guling enak Denpasar")}>🐷 Babi Guling</div>
                                </div>
                            )}

                            <div className="chat-input-area">
                                <input
                                    ref={inputRef}
                                    className="chat-input"
                                    placeholder="Cari kuliner Bali..."
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                                    disabled={isTyping}
                                />
                                <button className="chat-send" onClick={() => send()} disabled={isTyping || !input.trim()}>➤</button>
                            </div>
                        </>
                    )}

                    {/* Detail tab */}
                    {tab === "detail" && (
                        detailResto ? (
                            <DetailPanel resto={detailResto} />
                        ) : (
                            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:200, gap:8, color:"rgba(250,246,239,0.3)" }}>
                                <span style={{ fontSize: 28 }}>🗺️</span>
                                <div style={{ fontSize: 12, textAlign: "center" }}>
                                    Klik restoran di map<br />atau tanya AI untuk lihat detail
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            <button className="chat-toggle" onClick={() => isOpen ? setIsOpen(false) : openChat()} aria-label="Toggle chat">
                🍜{showNotif && <div className="chat-notif">1</div>}
            </button>
        </div>
    );
}
