"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message { role: "user" | "ai"; content: string; }

export interface Restaurant {
    id: number; rank: number;
    nama: string; kabupaten: string; rating: number;
    total_review: number; kategori: string; highlights: string[];
    price_range: string; best_time: string;
    top_menu?: string; promo?: string;
    link: string;
    gofood: string; grabfood: string;
    // ✅ Video links — format baru dari backend: tiktok1/2/3, yt1/2/3, reels1/2/3
    tiktok1?: string; tiktok2?: string; tiktok3?: string;
    yt1?: string;     yt2?: string;     yt3?: string;
    reels1?: string;  reels2?: string;  reels3?: string;
    lat: number | null; lng: number | null;
    score_final: number; score_semantic: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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
        .replace(/\n\n/g, "<br><br>").replace(/\n/g, "<br>");
}

function isValidLink(v?: string): boolean {
    return !!v && v !== "N/A" && v !== "" && v !== "nan";
}

// Extract YouTube video ID from any YT URL format
function getYtId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
}

// ✅ Collect all valid links of a type — format baru: tiktok1/2/3, yt1/2/3, reels1/2/3
function collectLinks(resto: Restaurant, type: "yt" | "tiktok" | "reels"): string[] {
    const keys: Record<string, (keyof Restaurant)[]> = {
        yt:     ["yt1", "yt2", "yt3"],
        tiktok: ["tiktok1", "tiktok2", "tiktok3"],
        reels:  ["reels1", "reels2", "reels3"],
    };
    return keys[type]
        .map(k => resto[k])
        .filter((v): v is string => isValidLink(v as string));
}

// ── VideoThumb ─────────────────────────────────────────────────────────────────
function VideoThumb({ url, platform }: { url: string; platform: "yt" | "tiktok" | "reels" }) {
    const [hovered, setHovered] = useState(false);
    const ytId = platform === "yt" ? getYtId(url) : null;
    const thumbUrl = ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null;

    const isPortrait = platform !== "yt";
    const W = isPortrait ? 88 : 156;
    const H = isPortrait ? 120 : 88;

    const colors = {
        yt:     { bg: "linear-gradient(135deg,#1a0a0a,#3d1515)", accent: "#ff4444", icon: "▶", label: "YouTube" },
        tiktok: { bg: "linear-gradient(135deg,#0a0a1a,#1a0a2e)", accent: "#00f2ea", icon: "♪", label: "TikTok"  },
        reels:  { bg: "linear-gradient(135deg,#1a0a14,#2e0a1e)", accent: "#e1306c", icon: "▶", label: "Reels"   },
    }[platform];

    return (
        <a
            href={url} target="_blank" rel="noopener noreferrer"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "block", position: "relative", flexShrink: 0,
                width: W, height: H, borderRadius: 8, overflow: "hidden",
                border: `1px solid ${hovered ? colors.accent + "88" : "rgba(250,246,239,0.1)"}`,
                transition: "all .18s", textDecoration: "none",
                transform: hovered ? "scale(1.04)" : "scale(1)",
                boxShadow: hovered ? `0 6px 20px ${colors.accent}44` : "0 2px 8px rgba(0,0,0,0.4)",
            }}
        >
            {thumbUrl ? (
                <img
                    src={thumbUrl} alt={colors.label}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
            ) : (
                <div style={{ width: "100%", height: "100%", background: colors.bg }} />
            )}

            <div style={{
                position: "absolute", inset: 0,
                background: hovered ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.28)",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3, transition: "background .18s",
            }}>
                <div style={{
                    position: "absolute", top: 5, left: 6,
                    fontSize: 8, color: colors.accent, fontFamily: "DM Sans,sans-serif",
                    fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase",
                    background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "1px 4px",
                }}>
                    {colors.label}
                </div>

                <div style={{
                    width: hovered ? 32 : 24, height: hovered ? 32 : 24,
                    borderRadius: "50%",
                    background: hovered ? colors.accent : "rgba(255,255,255,0.25)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .18s",
                    boxShadow: hovered ? `0 0 12px ${colors.accent}88` : "none",
                }}>
                    <span style={{
                        fontSize: hovered ? 13 : 10,
                        color: hovered ? "#fff" : "rgba(255,255,255,0.9)",
                        marginLeft: platform === "yt" ? 2 : 0,
                        transition: "all .18s",
                    }}>
                        {colors.icon}
                    </span>
                </div>

                {hovered && (
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "DM Sans,sans-serif" }}>
                        Buka video
                    </div>
                )}
            </div>
        </a>
    );
}

// ── PlatformBadge ──────────────────────────────────────────────────────────────
const PLATFORM_CFG: Record<string, { color: string; icon: string; name: string }> = {
    gofood:   { color: "#e8333a", icon: "🟢", name: "GoFood"   },
    grabfood: { color: "#00b14f", icon: "🚗", name: "GrabFood" },
};

function PlatformBadge({ platform, url }: { platform: string; url?: string }) {
    const c = PLATFORM_CFG[platform] ?? { color: "#888", icon: "🍽️", name: platform };
    const active = isValidLink(url);
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
            borderRadius: 10, border: `1px solid ${active ? c.color + "44" : "rgba(250,246,239,0.08)"}`,
            background: active ? `${c.color}11` : "rgba(250,246,239,0.03)", opacity: active ? 1 : 0.45,
        }}>
            <span style={{ fontSize: 15 }}>{c.icon}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#faf6ef" : "rgba(250,246,239,0.3)" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.35)" }}>{active ? "Pesan sekarang" : "Tidak tersedia"}</div>
            </div>
            {active ? (
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ padding: "4px 10px", borderRadius: 8, background: c.color, color: "#fff", fontSize: 11, textDecoration: "none", whiteSpace: "nowrap" }}>
                    Order →
                </a>
            ) : (
                <span style={{ fontSize: 10, color: "rgba(250,246,239,0.2)" }}>N/A</span>
            )}
        </div>
    );
}

// ── DetailPanel ────────────────────────────────────────────────────────────────
function DetailPanel({ resto }: { resto: Restaurant }) {
    const ytLinks    = collectLinks(resto, "yt");
    const tikLinks   = collectLinks(resto, "tiktok");
    const reelLinks  = collectLinks(resto, "reels");
    const hasVideo   = ytLinks.length > 0 || tikLinks.length > 0 || reelLinks.length > 0;

    const videoItems: { url: string; platform: "yt" | "tiktok" | "reels" }[] = [
        ...ytLinks.map(u => ({ url: u, platform: "yt" as const })),
        ...tikLinks.map(u => ({ url: u, platform: "tiktok" as const })),
        ...reelLinks.map(u => ({ url: u, platform: "reels" as const })),
    ].slice(0, 6);

    const cleanHL = Array.isArray(resto.highlights)
        ? resto.highlights.filter(h => h && h !== "System.Object[]" && h.trim())
        : [];

    return (
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Header */}
            <div style={{ paddingBottom: 12, borderBottom: "1px solid rgba(250,246,239,0.07)" }}>
                <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, fontWeight: 600, color: "#faf6ef", marginBottom: 5 }}>
                    {resto.nama}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: "rgba(250,246,239,0.45)" }}>📍 {resto.kabupaten}</span>
                    <span style={{ fontSize: 11, color: "rgba(250,246,239,0.45)" }}>⭐ {resto.rating}</span>
                    <span style={{ fontSize: 11, color: "rgba(250,246,239,0.45)" }}>{resto.total_review.toLocaleString()} ulasan</span>
                    <span style={{ fontSize: 11, background: "rgba(201,151,43,0.12)", color: "#e8c46a", padding: "1px 8px", borderRadius: 100 }}>{resto.price_range}</span>
                    {isValidLink(resto.best_time) && (
                        <span style={{ fontSize: 11, background: "rgba(250,246,239,0.06)", color: "rgba(250,246,239,0.4)", padding: "1px 8px", borderRadius: 100 }}>{resto.best_time}</span>
                    )}
                </div>
                {cleanHL.length > 0 && (
                    <div style={{ fontSize: 11, color: "rgba(250,246,239,0.35)", marginTop: 2 }}>
                        ✨ {cleanHL.slice(0, 3).join(" · ")}
                    </div>
                )}
                {isValidLink(resto.top_menu) && (
                    <div style={{ fontSize: 11, color: "rgba(250,246,239,0.45)", marginTop: 4 }}>
                        🍴 {resto.top_menu!.split(",").slice(0, 4).join(", ")}
                    </div>
                )}
                <div style={{ fontSize: 11, color: "rgba(250,246,239,0.45)", marginTop: 3 }}>
                    🎁 Promo: {isValidLink(resto.promo) && resto.promo !== "Tidak ada promo aktif" ? (
                        <span style={{ color: "#4ade80", fontWeight: 500 }}>Tersedia</span>
                ) : (
                        <span style={{ color: "rgba(250,246,239,0.3)" }}>Tidak tersedia</span>
                )}
                </div>
            </div>

            {/* Video thumbnails */}
{/* Video thumbnails - SATU PLATFORM PER BARIS */}
{hasVideo && (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 10, color: "rgba(250,246,239,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>
            🎬 Video Review
        </div>
        
        {/* YouTube Section */}
        {ytLinks.length > 0 && (
            <div>
                <div style={{ fontSize: 9, color: "#ff4444", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ff4444" }} />
                    YOUTUBE ({ytLinks.length})
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ytLinks.map((url, i) => (
                        <VideoThumb key={`yt-${i}`} url={url} platform="yt" />
                    ))}
                </div>
            </div>
        )}
        
        {/* TikTok Section */}
        {tikLinks.length > 0 && (
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: "#00f2ea", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#00f2ea" }} />
                    TIKTOK ({tikLinks.length})
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tikLinks.map((url, i) => (
                        <VideoThumb key={`tik-${i}`} url={url} platform="tiktok" />
                    ))}
                </div>
            </div>
        )}
        
        {/* Instagram Reels Section */}
        {reelLinks.length > 0 && (
            <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 9, color: "#e1306c", fontWeight: 600, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e1306c" }} />
                    REELS ({reelLinks.length})
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {reelLinks.map((url, i) => (
                        <VideoThumb key={`reel-${i}`} url={url} platform="reels" />
                    ))}
                </div>
            </div>
        )}
    </div>
)}

            {/* Delivery */}
            <div>
                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>
                    🚚 Pesan Online
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <PlatformBadge platform="gofood"   url={isValidLink(resto.gofood) ? resto.gofood : undefined} />
                    <PlatformBadge platform="grabfood" url={isValidLink(resto.grabfood) ? resto.grabfood : undefined} />
                </div>
            </div>

            {/* Google Maps */}
            {isValidLink(resto.link) && (
                <a href={resto.link} target="_blank" rel="noopener noreferrer" style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "10px 0", borderRadius: 10,
                    background: "rgba(250,246,239,0.05)", border: "1px solid rgba(250,246,239,0.1)",
                    color: "rgba(250,246,239,0.6)", fontSize: 12, textDecoration: "none",
                }}>
                    🗺️ Buka di Google Maps
                </a>
            )}
        </div>
    );
}

// ── ChatPanel Props ────────────────────────────────────────────────────────────
interface ChatPanelProps {
    onOpen?:              () => void;
    initialMessage?:      string | null;
    onMessageSent?:       () => void;
    onRestaurantsLoaded?: (r: Restaurant[]) => void;
    onFocusRestaurant?:   (r: Restaurant | null) => void;
    onSearchCompleted?:   (query: string, count: number) => void;
    userName?:            string;
}

// ── Main ChatPanel (draggable) ─────────────────────────────────────────────────
export default function ChatPanel({
    onOpen, initialMessage, onMessageSent,
    onRestaurantsLoaded, onFocusRestaurant,
    onSearchCompleted, userName,
}: ChatPanelProps) {
    const [isOpen, setIsOpen]     = useState(false);
    const [tab, setTab]           = useState<"chat" | "detail">("chat");
    const [messages, setMessages] = useState<Message[]>([{
        role: "ai",
        content: `Halo${userName && userName !== "Guest" ? ` **${userName}**` : ""}! 🌺 Saya food guide Bali kamu.\n\nCoba: *"Warung budget 50k Canggu"*, *"Café WiFi Ubud"*, atau klik restoran di map! 🎯`,
    }]);
    const [input, setInput]           = useState("");
    const [isTyping, setIsTyping]     = useState(false);
    const [showQuick, setShowQuick]   = useState(true);
    const [showNotif, setShowNotif]   = useState(true);
    const [convHistory, setConvHistory] = useState<{ role: string; content: string }[]>([]);
    const [detailResto, setDetailResto] = useState<Restaurant | null>(null);
    const [status, setStatus]         = useState("Ready · 1,352 restaurants");

    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const isDragging  = useRef(false);
    const dragStart   = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });

    const endRef   = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const openChat = useCallback(() => {
        setIsOpen(true); setShowNotif(false); onOpen?.();
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [onOpen]);

    const send = useCallback(async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || isTyping) return;
        setInput(""); setShowQuick(false);
        setMessages(p => [...p, { role: "user", content: msg }]);
        setIsTyping(true); setStatus("Mencari...");

        try {
            const res = await fetch(`/api/restaurant?${parseIntent(msg)}`);
            if (res.ok) {
                const data: Restaurant[] = await res.json();
                if (data.length) {
                    onRestaurantsLoaded?.(data);
                    if (tab !== "detail") onFocusRestaurant?.(data[0]);
                    setStatus(`${data.length} spots on map`);
                }
            }
        } catch { }

        const hist = [...convHistory, { role: "user", content: msg }];
        setConvHistory(hist); setStatus("Thinking...");

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: msg, lokasi: "" }),
            });
            setIsTyping(false);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json();
            const reply = data.reply ?? "Maaf, tidak ada hasil.";
            setConvHistory(p => [...p, { role: "assistant", content: reply }]);
            setMessages(p => [...p, { role: "ai", content: reply }]);

            if (data.intent === "REKOMENDASI" && Array.isArray(data.results) && data.results.length > 0) {
                onRestaurantsLoaded?.(data.results);
                if (tab !== "detail") onFocusRestaurant?.(data.results[0]);
                onSearchCompleted?.(msg, data.results.length);
                setStatus(`${data.results.length} spots on map`);
            } else if (data.intent === "DETAIL" && data.restaurant) {
                setDetailResto(data.restaurant);
                setTab("detail");
                onSearchCompleted?.(msg, 1);
                setStatus("Detail mode");
            } else {
                setStatus("Ready");
            }
        } catch {
            setIsTyping(false); setStatus("Ready");
            setMessages(p => [...p, { role: "ai", content: "Maaf, ada gangguan. Coba lagi! 🙏" }]);
        }
    }, [input, isTyping, convHistory, tab, onRestaurantsLoaded, onFocusRestaurant, onSearchCompleted]);

    useEffect(() => {
        if (!initialMessage) return;
        openChat();
        const t = setTimeout(() => { send(initialMessage); onMessageSent?.(); }, 450);
        return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessage]);

    useEffect(() => {
        const t = setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        return () => clearTimeout(t);
    }, [messages, isTyping]);

    useEffect(() => {
        (window as any).__selectResto = (r: Restaurant) => {
            setDetailResto(r); setTab("detail");
            if (!isOpen) openChat();
        };
        return () => { delete (window as any).__selectResto; };
    }, [isOpen, openChat]);

    const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("button")) return;
        isDragging.current = true;
        dragStart.current = { mx: e.clientX, my: e.clientY, ox: dragOffset.x, oy: dragOffset.y };
        e.preventDefault();
    }, [dragOffset]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            setDragOffset({
                x: dragStart.current.ox + (e.clientX - dragStart.current.mx),
                y: dragStart.current.oy + (e.clientY - dragStart.current.my),
            });
        };
        const onUp = () => { isDragging.current = false; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, []);

    const quick = (t: string) => { openChat(); setTimeout(() => send(t), 200); };

    return (
        <div style={{
            position: "fixed",
            bottom: 28 - dragOffset.y,
            right:  28 - dragOffset.x,
            zIndex: 500,
        }}>
            {isOpen && (
                <div
                    className="chat-panel open"
                    style={{ width: 440, maxHeight: 640, bottom: 74, right: 0, position: "absolute" }}
                >
                    {/* Header — drag handle */}
                    <div
                        className="chat-header"
                        onMouseDown={onHeaderMouseDown}
                        style={{ cursor: "grab", userSelect: "none" }}
                    >
                        <div className="chat-avatar">🤖</div>
                        <div className="chat-header-info">
                            <h3 style={{ display: "flex", alignItems: "center", gap: 0, flexWrap: "wrap" }}>
                                <span>BaliBites AI</span>
                                {detailResto && tab === "chat" && (
                                    <button
                                        onClick={e => { e.stopPropagation(); setTab("detail"); }}
                                        style={{
                                            marginLeft: 8, fontSize: 10, color: "#4ade80",
                                            cursor: "pointer", fontFamily: "DM Sans,sans-serif",
                                            fontWeight: 400, background: "rgba(74,222,128,0.1)",
                                            border: "1px solid rgba(74,222,128,0.3)",
                                            borderRadius: 100, padding: "1px 7px",
                                            whiteSpace: "nowrap", lineHeight: 1.8,
                                        }}
                                        title={`Sedang membahas: ${detailResto.nama} — klik untuk lihat detail`}
                                    >
                                        🍽️ {detailResto.nama.length > 18 ? detailResto.nama.slice(0, 18) + "…" : detailResto.nama}
                                    </button>
                                )}
                            </h3>
                            <div className="chat-status">
                                <span className="status-dot" />{status}
                            </div>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: "flex", gap: 3, marginLeft: "auto", marginRight: 6 }}>
                            {(["chat", "detail"] as const).map(t => (
                                <button key={t} onClick={e => { e.stopPropagation(); setTab(t); }} style={{
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

                        <div style={{ fontSize: 9, color: "rgba(250,246,239,0.2)", marginRight: 4, userSelect: "none" }}>⠿</div>
                        <button className="chat-close" onClick={e => { e.stopPropagation(); setIsOpen(false); }}>×</button>
                    </div>

                    {/* Chat Tab */}
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
                                    ref={inputRef} className="chat-input"
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

                    {/* Detail Tab */}
                    {tab === "detail" && (
                        detailResto ? (
                            <DetailPanel resto={detailResto} />
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: 8, color: "rgba(250,246,239,0.3)" }}>
                                <span style={{ fontSize: 32 }}>🗺️</span>
                                <div style={{ fontSize: 12, textAlign: "center", lineHeight: 1.6 }}>
                                    Klik restoran di map<br />atau tanya AI untuk lihat detail
                                </div>
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Toggle button */}
            <button className="chat-toggle" onClick={() => isOpen ? setIsOpen(false) : openChat()} aria-label="Toggle BaliBites chat">
                🍜{showNotif && <div className="chat-notif">1</div>}
            </button>
        </div>
    );
}