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
    for (const [keys, kab] of areaMap) {
        if (keys.some(k => lower.includes(k))) { p.kabupaten = kab; break; }
    }
    if (lower.match(/sunset|view|pantai|beach|rooftop/))      p.kategori = "Sunset & View";
    else if (lower.match(/kerja|laptop|wifi|coworking|work/)) p.kategori = "Work from Cafe";
    else if (lower.match(/malam|nightlife|bar|club|cocktail/))p.kategori = "Vibrant Nightlife";
    else if (lower.match(/keluarga|family|anak|kids/))        p.kategori = "Family Friendly";
    else if (lower.match(/murah|budget|hemat|cheap/))         p.kategori = "Budget Friendly";
    else if (lower.match(/romantis|romantic|date|couple/))    p.kategori = "Romantic & Cozy";
    const bm = lower.match(/(\d+)\s*(k|rb|ribu)?/);
    if (bm) {
        const v = parseFloat(bm[1]) * (bm[2] ? 1000 : bm[1].length <= 3 ? 1000 : 1);
        if (v >= 10000) p.budget = String(v);
    }
    return new URLSearchParams(p);
}

function buildSystemPrompt(restaurants: Restaurant[]): string {
    const base = `Kamu adalah BaliBites AI — personal culinary concierge Bali.
Punya akses 1,352 restoran nyata seluruh Bali.
PERSONA: Hangat, personal, bilingual natural.
ATURAN: Selalu rekomendasikan tempat spesifik. Sebutkan nama, lokasi, rating, harga. Highlight menu unik. 1 tip lokal. Maks 200 kata.`;
    if (!restaurants.length) return base;
    const ctx = restaurants.map((r, i) => {
        const h = r.highlights.filter(s => s.length > 2).slice(0, 2).join(", ");
        return `${i+1}. **${r.nama}** (${r.kabupaten}) ⭐${r.rating} · ${r.total_review.toLocaleString()} ulasan · ${r.price_range}${h ? ` · ${h}` : ""}`;
    }).join("\n");
    return `${base}\n\n📍 DATA RELEVAN:\n${ctx}`;
}

function fmt(text: string) {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
}

// ── Platform badge ────────────────────────────────────────────────────────────
const PLATFORM_CFG: Record<string, {color:string;icon:string;name:string}> = {
    gofood:     { color:"#e8333a", icon:"🟢", name:"GoFood" },
    grabfood:   { color:"#00b14f", icon:"🚗", name:"GrabFood" },
    shopeefood: { color:"#ff6600", icon:"🛒", name:"ShopeeFood" },
};

function PlatformBadge({ platform, url, promo, fee, time }: {
    platform: string; url?: string; promo?: string; fee?: number; time?: number;
}) {
    const c = PLATFORM_CFG[platform] ?? { color:"#888", icon:"🍽️", name: platform };
    return (
        <div style={{
            display:"flex", alignItems:"center", gap:8, padding:"8px 10px", borderRadius:10,
            border:`1px solid ${url ? c.color+"44" : "rgba(250,246,239,0.08)"}`,
            background: url ? `${c.color}11` : "rgba(250,246,239,0.03)",
            opacity: url ? 1 : 0.5,
        }}>
            <span style={{fontSize:15}}>{c.icon}</span>
            <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:500,color:url?"#faf6ef":"rgba(250,246,239,0.3)",display:"flex",alignItems:"center",gap:6}}>
                    {c.name}
                    {promo && url && (
                        <span style={{fontSize:9,padding:"1px 6px",borderRadius:100,background:`${c.color}33`,color:c.color}}>
                            {promo.slice(0,20)}
                        </span>
                    )}
                </div>
                <div style={{fontSize:10,color:"rgba(250,246,239,0.35)"}}>
                    {url
                        ? `${fee !== undefined ? `Ongkir Rp${fee.toLocaleString()}` : "Cek ongkir"}${time ? ` · ~${time} mnt` : ""}`
                        : "Tidak tersedia"}
                </div>
            </div>
            {url ? (
                <a href={url} target="_blank" rel="noopener" style={{
                    padding:"4px 10px",borderRadius:8,background:c.color,
                    color:"#fff",fontSize:11,textDecoration:"none",whiteSpace:"nowrap",
                    fontFamily:"DM Sans,sans-serif",
                }}>Order →</a>
            ) : (
                <span style={{fontSize:10,color:"rgba(250,246,239,0.2)"}}>N/A</span>
            )}
        </div>
    );
}

function SocialRow({ icon, label, url, color }: { icon:string;label:string;url?:string;color:string }) {
    return (
        <div style={{
            display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:8,
            border:`1px solid ${url ? color+"33" : "rgba(250,246,239,0.07)"}`,
            background: url ? `${color}0d` : "transparent",
            opacity: url ? 1 : 0.4,
        }}>
            <span style={{fontSize:14}}>{icon}</span>
            <span style={{flex:1,fontSize:12,color:url?"#faf6ef":"rgba(250,246,239,0.3)"}}>{label}</span>
            {url ? (
                <a href={url} target="_blank" rel="noopener" style={{
                    fontSize:10,color,textDecoration:"none",
                    padding:"3px 8px",borderRadius:6,border:`1px solid ${color}44`,
                }}>Lihat →</a>
            ) : (
                <span style={{fontSize:10,color:"rgba(250,246,239,0.2)"}}>Tidak tersedia</span>
            )}
        </div>
    );
}

function DetailPanel({ resto, delivery }: { resto: Restaurant; delivery: any[] | null }) {
    const q = encodeURIComponent(resto.nama + " Bali");
    const social = {
        youtube:   `https://www.youtube.com/results?search_query=${q}+review`,
        tiktok:    `https://www.tiktok.com/search?q=${q}`,
        reels:     `https://www.instagram.com/reels/audio/${q}`,
        instagram: `https://www.instagram.com/explore/tags/${encodeURIComponent(resto.nama.replace(/\s+/g,"").toLowerCase())}`,
    };
    const goUrl   = delivery?.find(d => d.platform === "gofood")?.platform_url;
    const grabUrl = delivery?.find(d => d.platform === "grabfood")?.platform_url;
    const goPlt   = delivery?.find(d => d.platform === "gofood");
    const grPlt   = delivery?.find(d => d.platform === "grabfood");

    return (
        <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:14}}>
            {/* Header */}
            <div style={{paddingBottom:12,borderBottom:"1px solid rgba(250,246,239,0.07)"}}>
                <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:17,fontWeight:600,color:"#faf6ef",marginBottom:4}}>
                    {resto.nama}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    <span style={{fontSize:11,color:"rgba(250,246,239,0.45)"}}>📍 {resto.kabupaten}</span>
                    <span style={{fontSize:11,color:"rgba(250,246,239,0.45)"}}>⭐ {resto.rating}</span>
                    <span style={{fontSize:11,color:"rgba(250,246,239,0.45)"}}>{resto.total_review.toLocaleString()} ulasan</span>
                    <span style={{fontSize:11,background:"rgba(201,151,43,0.12)",color:"#e8c46a",padding:"1px 8px",borderRadius:100}}>{resto.price_range}</span>
                    <span style={{fontSize:11,background:"rgba(250,246,239,0.06)",color:"rgba(250,246,239,0.4)",padding:"1px 8px",borderRadius:100}}>{resto.best_time}</span>
                </div>
                {resto.highlights.length > 0 && (
                    <div style={{marginTop:6,fontSize:11,color:"rgba(250,246,239,0.35)"}}>
                        ✨ {resto.highlights.slice(0,3).join(" · ")}
                    </div>
                )}
            </div>

            {/* Delivery */}
            <div>
                <div style={{fontSize:10,color:"rgba(250,246,239,0.3)",letterSpacing:"1.2px",textTransform:"uppercase",marginBottom:8}}>
                    🚚 Pesan Online
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {delivery === null ? (
                        <div style={{fontSize:12,color:"rgba(250,246,239,0.3)",padding:"8px 0"}}>Mengecek ketersediaan...</div>
                    ) : (
                        <>
                            <PlatformBadge platform="gofood"     url={goUrl}   promo={goPlt?.promo_label}  fee={goPlt?.delivery_fee}  time={goPlt?.delivery_time_min} />
                            <PlatformBadge platform="grabfood"   url={grabUrl} promo={grPlt?.promo_label}  fee={grPlt?.delivery_fee}  time={grPlt?.delivery_time_min} />
                            <PlatformBadge platform="shopeefood" />
                        </>
                    )}
                </div>
            </div>

            {/* Social */}
            <div>
                <div style={{fontSize:10,color:"rgba(250,246,239,0.3)",letterSpacing:"1.2px",textTransform:"uppercase",marginBottom:8}}>
                    📱 Review di Sosmed
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    <SocialRow icon="▶️"  label="YouTube Review"   url={social.youtube}   color="#ff4444" />
                    <SocialRow icon="🎵"  label="TikTok / Short"   url={social.tiktok}    color="#00f2ea" />
                    <SocialRow icon="🎬"  label="Instagram Reels"  url={social.reels}     color="#e1306c" />
                    <SocialRow icon="📸"  label="Instagram Posts"  url={social.instagram} color="#833ab4" />
                </div>
            </div>

            {/* Google Maps */}
            {resto.link && (
                <a href={resto.link} target="_blank" rel="noopener" style={{
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    padding:"9px 0",borderRadius:10,
                    background:"rgba(250,246,239,0.05)",border:"1px solid rgba(250,246,239,0.1)",
                    color:"rgba(250,246,239,0.55)",fontSize:12,textDecoration:"none",
                }}>
                    🗺️ Buka di Google Maps
                </a>
            )}
        </div>
    );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface ChatPanelProps {
    onOpen?: () => void;
    initialMessage?: string | null;
    onMessageSent?: () => void;
    onRestaurantsLoaded?: (r: Restaurant[]) => void;
    onFocusRestaurant?: (r: Restaurant | null) => void;
    userName?: string;
}

export default function ChatPanel({
    onOpen, initialMessage, onMessageSent,
    onRestaurantsLoaded, onFocusRestaurant, userName,
}: ChatPanelProps) {
    const [isOpen, setIsOpen]           = useState(false);
    const [tab, setTab]                 = useState<"chat"|"detail">("chat");
    const [messages, setMessages]       = useState<Message[]>([{
        role: "ai",
        content: `Halo${userName && userName !== "Guest" ? ` **${userName}**` : ""}! 🌺 Saya food guide Bali kamu — **1,352 restoran real**.\n\nCoba: *"Warung budget 50k Canggu"*, *"Café WiFi Ubud"*, atau klik restoran di map! 🎯`,
    }]);
    const [input, setInput]             = useState("");
    const [isTyping, setIsTyping]       = useState(false);
    const [showQuick, setShowQuick]     = useState(true);
    const [showNotif, setShowNotif]     = useState(true);
    const [convHistory, setConvHistory] = useState<{role:string;content:string}[]>([]);
    const [loadedResto, setLoadedResto] = useState<Restaurant[]>([]);
    const [selectedResto, setSelectedResto] = useState<Restaurant | null>(null);
    const [deliveryData, setDeliveryData]   = useState<any[] | null>(null);
    const [status, setStatus]           = useState("Ready · 1,352 restaurants");

    const endRef   = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialMessage) { openChat(); setTimeout(() => send(initialMessage), 400); onMessageSent?.(); }
    }, [initialMessage]); // eslint-disable-line

    useEffect(() => {
        setTimeout(() => endRef.current?.scrollIntoView({ behavior:"smooth" }), 50);
    }, [messages, isTyping]);

    useEffect(() => {
        if (!selectedResto) return;
        setDeliveryData(null);
        fetch(`/api/delivery?maps_id=${selectedResto.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => setDeliveryData(d?.platforms ?? []))
            .catch(() => setDeliveryData([]));
    }, [selectedResto]);

    // Expose to window so map markers can call it
    useEffect(() => {
        (window as any).__selectResto = (r: Restaurant) => {
            setSelectedResto(r);
            setTab("detail");
            if (!isOpen) openChat();
        };
    }, [isOpen, openChat]); // eslint-disable-line

    const openChat = useCallback(() => {
        setIsOpen(true); setShowNotif(false); onOpen?.();
        setTimeout(() => inputRef.current?.focus(), 300);
    }, [onOpen]);

    const send = useCallback(async (text?: string) => {
        const msg = (text ?? input).trim();
        if (!msg || isTyping) return;
        setInput(""); setShowQuick(false);
        setMessages(p => [...p, { role:"user", content:msg }]);
        setIsTyping(true); setStatus("Mencari...");

        let fresh = loadedResto;
        try {
            const res = await fetch(`/api/restaurant?${parseIntent(msg)}`);
            if (res.ok) {
                const data: Restaurant[] = await res.json();
                if (data.length) {
                    fresh = data; setLoadedResto(data);
                    onRestaurantsLoaded?.(data); onFocusRestaurant?.(data[0]);
                    setStatus(`${data.length} spots found`);
                }
            }
        } catch { /**/ }

        const hist = [...convHistory, { role:"user", content:msg }];
        setConvHistory(hist); setStatus("Thinking...");
        try {
            const res = await fetch("/api/chat", {
                method:"POST", headers:{"Content-Type":"application/json"},
                body: JSON.stringify({ messages:hist, systemPrompt:buildSystemPrompt(fresh) }),
            });
            setIsTyping(false);
            setStatus(fresh.length ? `${fresh.length} spots on map` : "Ready");
            if (res.ok) {
                const { reply } = await res.json();
                setConvHistory(p => [...p, { role:"assistant", content:reply }]);
                setMessages(p => [...p, { role:"ai", content:reply }]);
            } else throw new Error();
        } catch {
            setIsTyping(false); setStatus("Ready");
            setMessages(p => [...p, { role:"ai", content:"Maaf, ada gangguan. Coba lagi! 🙏" }]);
        }
    }, [input, isTyping, convHistory, loadedResto, onRestaurantsLoaded, onFocusRestaurant]);

    const quick = (t: string) => { openChat(); setTimeout(() => send(t), 150); };

    return (
        <div className="chat-bubble">
            {isOpen && (
                <div className="chat-panel open" style={{ width:440, maxHeight:640 }}>
                    {/* Header */}
                    <div className="chat-header">
                        <div className="chat-avatar">🤖</div>
                        <div className="chat-header-info">
                            <h3>BaliBites AI</h3>
                            <div className="chat-status"><span className="status-dot"></span>{status}</div>
                        </div>
                        <div style={{display:"flex",gap:3,marginLeft:"auto",marginRight:6}}>
                            {(["chat","detail"] as const).map(t => (
                                <button key={t} onClick={() => setTab(t)} style={{
                                    padding:"4px 10px", borderRadius:8, border:"none",
                                    background: tab===t ? "rgba(196,96,58,0.25)" : "transparent",
                                    color: tab===t ? "#faf6ef" : "rgba(250,246,239,0.35)",
                                    fontSize:11, cursor:"pointer", fontFamily:"DM Sans,sans-serif",
                                    display:"flex", alignItems:"center", gap:4,
                                }}>
                                    {t==="chat" ? "💬 Chat" : "🍽️ Detail"}
                                    {t==="detail" && selectedResto && (
                                        <span style={{width:5,height:5,borderRadius:"50%",background:"#4ade80",display:"inline-block"}}/>
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
                                        <div className="msg-avatar">{m.role==="ai"?"🌿":"👤"}</div>
                                        <div className="msg-bubble" dangerouslySetInnerHTML={{__html:fmt(m.content)}}/>
                                    </div>
                                ))}
                                {isTyping && (
                                    <div className="msg msg-ai typing-indicator">
                                        <div className="msg-avatar">🌿</div>
                                        <div className="typing-dots">
                                            <div className="typing-dot"/><div className="typing-dot"/><div className="typing-dot"/>
                                        </div>
                                    </div>
                                )}
                                <div ref={endRef}/>
                            </div>
                            {showQuick && (
                                <div className="quick-prompts">
                                    <div className="qp" onClick={()=>quick("Romantic dinner sunset view malam ini")}>🕯️ Romantic</div>
                                    <div className="qp" onClick={()=>quick("Warung murah budget 50k Canggu")}>💰 Budget</div>
                                    <div className="qp" onClick={()=>quick("Café wifi untuk kerja Ubud")}>💻 Work Café</div>
                                    <div className="qp" onClick={()=>quick("Top restoran Nusa Penida")}>🏝️ Nusa Penida</div>
                                </div>
                            )}
                            <div className="chat-input-area">
                                <input ref={inputRef} className="chat-input"
                                    placeholder="Budget 100k Seminyak... ada promo GoFood?"
                                    value={input}
                                    onChange={e=>setInput(e.target.value)}
                                    onKeyDown={e=>e.key==="Enter"&&send()}/>
                                <button className="chat-send" onClick={()=>send()} disabled={isTyping}>➤</button>
                            </div>
                        </>
                    )}

                    {/* Detail tab */}
                    {tab === "detail" && (
                        selectedResto
                            ? <DetailPanel resto={selectedResto} delivery={deliveryData}/>
                            : <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:200,gap:8,color:"rgba(250,246,239,0.3)"}}>
                                <span style={{fontSize:28}}>🗺️</span>
                                <div style={{fontSize:12,textAlign:"center"}}>Klik restoran di map<br/>untuk lihat detail & link delivery</div>
                              </div>
                    )}
                </div>
            )}
            <button className="chat-toggle" onClick={()=>isOpen?setIsOpen(false):openChat()}>
                🍜{showNotif&&<div className="chat-notif">1</div>}
            </button>
        </div>
    );
}