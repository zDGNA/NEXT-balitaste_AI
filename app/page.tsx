"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatPanel, { type Restaurant } from "@/components/ChatPanel";
import ProfileOverlay from "@/components/ProfileOverlay";

// ─── Config ───────────────────────────────────────────────────────────────────
const FILTER_PILLS = [
    { id: "Sunset & View",     icon: "🌅", label: "Sunset",    color: "#c9972b" },
    { id: "Work from Cafe",    icon: "💻", label: "Work Café", color: "#4ade80" },
    { id: "Budget Friendly",   icon: "💰", label: "Budget",    color: "#94a3b8" },
    { id: "Family Friendly",   icon: "👨‍👩‍👧", label: "Family",   color: "#60a5fa" },
    { id: "Vibrant Nightlife", icon: "🎶", label: "Nightlife", color: "#f87171" },
    { id: "Romantic & Cozy",   icon: "🕯️", label: "Romantic",  color: "#f472b6" },
];

const KAT_COLOR: Record<string, string> = {
    "Sunset & View":     "#c9972b",
    "Work from Cafe":    "#4ade80",
    "Budget Friendly":   "#94a3b8",
    "Family Friendly":   "#60a5fa",
    "Vibrant Nightlife": "#f87171",
    "Romantic & Cozy":   "#f472b6",
    "General Chill":     "#c4603a",
};

function markerColor(kategori: string): string {
    for (const [k, v] of Object.entries(KAT_COLOR)) {
        if (kategori.includes(k)) return v;
    }
    return "#c4603a";
}

function fmtN(n: number) { return n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n); }

// ─── BaliMap ──────────────────────────────────────────────────────────────────
function BaliMap({ restaurants, focused, activeCategory, onMarkerClick }: {
    restaurants: Restaurant[];
    focused: Restaurant | null;
    activeCategory: string | null;
    onMarkerClick: (r: Restaurant) => void;
}) {
    const divRef    = useRef<HTMLDivElement>(null);
    const mapRef    = useRef<any>(null);
    const markersRef= useRef<any[]>([]);
    const LRef      = useRef<any>(null);
    const initDone  = useRef(false);

    // Init Leaflet once
    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        // Inject Leaflet CSS
        if (!document.getElementById("lf-css")) {
            const l = document.createElement("link");
            l.id   = "lf-css";
            l.rel  = "stylesheet";
            l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(l);
        }

        const s = document.createElement("script");
        s.src   = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => {
            const L = (window as any).L;
            LRef.current = L;

            if (!divRef.current) return;

            const TOKEN = process.env.NEXT_PUBLIC_JAWGS_TOKEN ?? "";
            const tile  = TOKEN
                ? `https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=${TOKEN}`
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

            const map = L.map(divRef.current, {
                center:              [-8.4095, 115.19],
                zoom:                10,
                minZoom:             9,
                maxZoom:             17,
                maxBounds:           [[-9.1, 114.3], [-7.9, 116.0]],
                maxBoundsViscosity:  1.0,
                zoomControl:         false,
                attributionControl:  false,
            });

            L.tileLayer(tile, { maxZoom: 19, subdomains: "abcd" }).addTo(map);
            L.control.zoom({ position: "bottomright" }).addTo(map);

            // Mini attribution
            L.control.attribution({ position: "bottomleft", prefix: false })
                .addAttribution(TOKEN ? '© <a href="https://jawg.io">Jawg</a>' : '© <a href="https://carto.com">CARTO</a>')
                .addTo(map);

            mapRef.current = map;
        };
        document.head.appendChild(s);

        return () => {
            markersRef.current.forEach(m => m?.remove?.());
            mapRef.current?.remove?.();
            mapRef.current  = null;
            initDone.current = false;
        };
    }, []); // eslint-disable-line

    // Redraw markers
    useEffect(() => {
        const L = LRef.current, map = mapRef.current;
        if (!L || !map) return;

        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];
        if (!restaurants.length) return;

        const color = activeCategory ? (KAT_COLOR[activeCategory] ?? "#c4603a") : "#c4603a";
        const hex   = color.replace("#", "");

        restaurants.forEach(r => {
            const dot = markerColor(r.kategori);
            const icon = L.divIcon({
                className: "",
                html: `<span style="
                    display:block;width:13px;height:13px;border-radius:50%;
                    background:${dot};border:2.5px solid rgba(255,255,255,0.85);
                    box-shadow:0 0 0 3px ${dot}55,0 2px 8px rgba(0,0,0,0.5);
                    animation:lfPulse 2.5s ease infinite;
                "></span>`,
                iconSize:   [13, 13],
                iconAnchor: [6, 6],
            });

            const marker = L.marker([r.lat, r.lng], { icon });
            marker.bindPopup(`
                <div style="padding:10px 12px;min-width:170px">
                    <div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:#faf6ef;margin-bottom:3px">${r.nama}</div>
                    <div style="font-size:11px;color:rgba(250,246,239,.5);margin-bottom:5px">⭐${r.rating} · ${fmtN(r.total_review)} ulasan · ${r.price_range}</div>
                    <div style="font-size:10px;color:${dot};background:${dot}22;border-radius:100px;padding:2px 8px;display:inline-block">${r.kategori.split("|")[0].trim()}</div>
                </div>
            `, { closeButton: false, className: "lf-popup-wrap", maxWidth: 220 });

            marker.on("click", () => { onMarkerClick(r); marker.openPopup(); });
            marker.addTo(map);
            markersRef.current.push(marker);
        });

        // Fit bounds
        if (restaurants.length > 1) {
            const bounds = L.latLngBounds(restaurants.map((r: Restaurant) => [r.lat, r.lng]));
            map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14, animate: true, duration: 0.8 });
        } else if (restaurants.length === 1) {
            map.flyTo([restaurants[0].lat, restaurants[0].lng], 15, { duration: 0.8 });
        }
    }, [restaurants, activeCategory, onMarkerClick]);

    // Fly to focused
    useEffect(() => {
        if (!mapRef.current || !focused) return;
        mapRef.current.flyTo([focused.lat, focused.lng], 16, { duration: 1 });
        markersRef.current.forEach((m, i) => {
            if (restaurants[i]?.id === focused.id) m.openPopup();
        });
    }, [focused]); // eslint-disable-line

    return (
        <>
            <style>{`
                @keyframes lfPulse {
                    0%,100%{box-shadow:0 0 0 3px var(--mc,#c4603a55),0 2px 8px rgba(0,0,0,.5)}
                    50%{box-shadow:0 0 0 6px var(--mc,#c4603a22),0 2px 8px rgba(0,0,0,.5)}
                }
                .leaflet-container{background:#0d1412!important}
                .leaflet-control-zoom{border:none!important;margin:0 12px 12px 0!important}
                .leaflet-control-zoom a{
                    background:rgba(22,17,13,.9)!important;
                    border:1px solid rgba(250,246,239,.12)!important;
                    color:rgba(250,246,239,.6)!important;
                    width:30px!important;height:30px!important;
                    line-height:28px!important;font-size:16px!important;
                }
                .leaflet-control-zoom a:hover{color:#faf6ef!important;background:rgba(196,96,58,.2)!important}
                .leaflet-control-zoom-in{border-bottom:1px solid rgba(250,246,239,.1)!important;border-radius:8px 8px 0 0!important}
                .leaflet-control-zoom-out{border-radius:0 0 8px 8px!important}
                .leaflet-control-attribution{
                    background:rgba(22,17,13,.6)!important;
                    color:rgba(250,246,239,.25)!important;
                    font-size:9px!important;
                    margin:0 0 6px 6px!important;
                    border-radius:6px!important;
                }
                .leaflet-control-attribution a{color:rgba(250,246,239,.35)!important}
                .lf-popup-wrap .leaflet-popup-content-wrapper{
                    background:rgba(18,13,10,.97)!important;
                    border:1px solid rgba(250,246,239,.14)!important;
                    border-radius:12px!important;
                    box-shadow:0 12px 40px rgba(0,0,0,.7)!important;
                    padding:0!important;
                }
                .lf-popup-wrap .leaflet-popup-content{margin:0!important}
                .lf-popup-wrap .leaflet-popup-tip-container{display:none!important}
            `}</style>
            <div ref={divRef} style={{ position:"absolute", inset:0, zIndex:0 }} />
        </>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    const [activeTab, setActiveTab]       = useState<"explore"|"trending"|"itinerary">("explore");
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [profileOpen, setProfileOpen]   = useState(false);
    const [activeCat, setActiveCat]       = useState<string|null>(null);
    const [searchVal, setSearchVal]       = useState("");
    const [chatTrigger, setChatTrigger]   = useState<string|null>(null);
    const [mapResto, setMapResto]         = useState<Restaurant[]>([]);
    const [focused, setFocused]           = useState<Restaurant|null>(null);
    const [selected, setSelected]         = useState<Restaurant|null>(null);
    const [loading, setLoading]           = useState(true);
    const [stats, setStats]               = useState({ total: 1352, avg: 4.55, regencies: 9 });

    // Load markers on init + category change
    useEffect(() => { loadMarkers(); }, []); // eslint-disable-line
    useEffect(() => { if (activeCat !== null) loadMarkers(); }, [activeCat]); // eslint-disable-line

    async function loadMarkers() {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ min_rating:"4.0", min_review:"30", top_n:"40" });
            if (activeCat) qs.set("kategori", activeCat);
            const res = await fetch(`/api/restaurant?${qs}`);
            if (res.ok) setMapResto(await res.json());
        } catch { /* silent */ }
        finally { setLoading(false); }
    }

    const toggleCat = (id: string) => setActiveCat(p => p === id ? null : id);
    const triggerSearch = () => { if (searchVal.trim()) { setChatTrigger(searchVal.trim()); setSearchVal(""); } };

    const onMarkerClick = useCallback((r: Restaurant) => {
        setSelected(r);
        setFocused(r);
    }, []);

    const onRestoLoaded = useCallback((data: Restaurant[]) => {
        setMapResto(data);
    }, []);

    const onFocusResto = useCallback((r: Restaurant | null) => {
        setFocused(r);
        if (r) setSelected(r);
    }, []);

    const activePill = FILTER_PILLS.find(p => p.id === activeCat);

    return (
        <div style={{ position:"fixed", inset:0, overflow:"hidden" }}>
            {/* ── Leaflet map — absolute full ── */}
            <BaliMap
                restaurants={mapResto}
                focused={focused}
                activeCategory={activeCat}
                onMarkerClick={onMarkerClick}
            />

            {/* ── TOPBAR ── */}
            <header style={{
                position:"absolute", top:0, left:0, right:0, zIndex:200,
                display:"flex", alignItems:"center", gap:0,
                background:"rgba(15,10,8,0.72)", backdropFilter:"blur(20px)",
                borderBottom:"1px solid rgba(250,246,239,0.08)",
                height:52,
            }}>
                {/* Logo */}
                <div style={{ display:"flex", alignItems:"center", gap:9, padding:"0 20px", borderRight:"1px solid rgba(250,246,239,0.08)", height:"100%", flexShrink:0 }}>
                    <div style={{
                        width:28, height:28, borderRadius:8,
                        background:"linear-gradient(135deg,#c4603a,#c9972b)",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:14, boxShadow:"0 2px 12px rgba(196,96,58,.4)",
                    }}>🌿</div>
                    <span style={{ fontFamily:"Cormorant Garamond,serif", fontSize:17, fontWeight:600, color:"#faf6ef", letterSpacing:"0.3px" }}>
                        Bali<span style={{ color:"#c9972b" }}>Bites</span> AI
                    </span>
                </div>

                {/* Tabs — Explore / Trending / Itinerary */}
                <div style={{ display:"flex", height:"100%", alignItems:"center", padding:"0 8px", gap:2 }}>
                    {(["explore","trending","itinerary"] as const).map(t => (
                        <button key={t} onClick={() => setActiveTab(t)} style={{
                            padding:"0 16px", height:34, borderRadius:8, border:"none",
                            background: activeTab===t ? "rgba(196,96,58,0.2)" : "transparent",
                            color: activeTab===t ? "#faf6ef" : "rgba(250,246,239,0.45)",
                            fontSize:13, cursor:"pointer", transition:"all .2s",
                            borderBottom: activeTab===t ? "2px solid #c4603a" : "2px solid transparent",
                            fontFamily:"DM Sans,sans-serif", letterSpacing:"0.2px",
                        }}>{t[0].toUpperCase()+t.slice(1)}</button>
                    ))}
                </div>

                {/* Spacer */}
                <div style={{ flex:1 }} />

                {/* Weather pill */}
                <div style={{
                    display:"flex", alignItems:"center", gap:8, padding:"0 14px",
                    borderRight:"1px solid rgba(250,246,239,0.08)", height:"100%",
                    fontSize:12, color:"rgba(250,246,239,0.6)",
                }}>
                    <span style={{ fontSize:16 }}>🌤️</span>
                    <span style={{ fontFamily:"Cormorant Garamond,serif", fontSize:16, color:"#faf6ef" }}>29°C</span>
                    <span style={{ color:"rgba(201,151,43,0.8)", fontStyle:"italic", fontSize:11 }}>Perfect for dining tonight</span>
                </div>

                {/* Taste Profile */}
                <button onClick={() => setProfileOpen(true)} style={{
                    margin:"0 8px", padding:"7px 16px", borderRadius:100,
                    background:"linear-gradient(135deg,#c9972b,#c4603a)", border:"none",
                    color:"#faf6ef", fontSize:12, fontWeight:500, cursor:"pointer",
                    fontFamily:"DM Sans,sans-serif", whiteSpace:"nowrap",
                    boxShadow:"0 2px 12px rgba(201,151,43,.3)",
                }}>🔮 Taste Profile</button>

                {/* Settings ⚙ */}
                <button onClick={() => setSettingsOpen(p => !p)} style={{
                    width:36, height:36, borderRadius:8, border:"1px solid rgba(250,246,239,0.1)",
                    background: settingsOpen ? "rgba(250,246,239,0.08)" : "transparent",
                    color:"rgba(250,246,239,0.5)", fontSize:17, cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    marginRight:12, transition:"all .2s",
                }}>⚙</button>
            </header>

            {/* ── Settings dropdown ── */}
            {settingsOpen && (
                <div style={{
                    position:"absolute", top:60, right:12, zIndex:300,
                    background:"rgba(18,13,10,0.97)", border:"1px solid rgba(250,246,239,0.12)",
                    borderRadius:14, padding:"14px 0", width:220,
                    backdropFilter:"blur(24px)", boxShadow:"0 20px 60px rgba(0,0,0,.7)",
                    animation:"fadeUp .2s ease",
                }}>
                    {[
                        { icon:"🗺️", label:"Map style", sub:"Dark (Jawg)" },
                        { icon:"🔔", label:"Notifications", sub:"On" },
                        { icon:"🌐", label:"Language", sub:"ID / EN" },
                        { icon:"📊", label:"Data export", sub:"CSV / JSON" },
                        { icon:"🤖", label:"AI model", sub:"Gemini 2.5 Flash" },
                    ].map(item => (
                        <div key={item.label} style={{
                            display:"flex", alignItems:"center", gap:12, padding:"9px 16px",
                            cursor:"pointer", transition:"background .15s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background="rgba(250,246,239,0.05)")}
                        onMouseLeave={e => (e.currentTarget.style.background="transparent")}
                        >
                            <span style={{ fontSize:16 }}>{item.icon}</span>
                            <div>
                                <div style={{ fontSize:13, color:"#faf6ef" }}>{item.label}</div>
                                <div style={{ fontSize:10, color:"rgba(250,246,239,0.35)", marginTop:1 }}>{item.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* ── LEFT PANEL ── */}
            <aside style={{
                position:"absolute", top:52, left:0, bottom:0, zIndex:100,
                width:300, display:"flex", flexDirection:"column",
                background:"rgba(10,7,5,0.65)", backdropFilter:"blur(18px)",
                borderRight:"1px solid rgba(250,246,239,0.07)",
            }}>
                {/* Hero text */}
                <div style={{ padding:"24px 24px 16px" }}>
                    <div style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        background:"rgba(201,151,43,0.1)", border:"1px solid rgba(201,151,43,0.22)",
                        borderRadius:100, padding:"4px 12px", fontSize:10,
                        color:"#e8c46a", letterSpacing:"1px", textTransform:"uppercase",
                        marginBottom:14,
                    }}>
                        <span style={{ width:5, height:5, borderRadius:"50%", background:"#c9972b", display:"inline-block" }}></span>
                        AI-Powered · {stats.total.toLocaleString()} Restaurants
                    </div>
                    <h1 style={{
                        fontFamily:"Cormorant Garamond,serif", fontSize:32, fontWeight:300,
                        lineHeight:1.1, color:"#faf6ef", marginBottom:10,
                    }}>
                        Discover your<br/>next <em style={{ color:"#e8c46a" }}>perfect</em><br/>
                        <span style={{ color:"#c4603a" }}>Bali meal</span>
                    </h1>
                    <p style={{ fontSize:12, lineHeight:1.6, color:"rgba(250,246,239,.45)", fontWeight:300, marginBottom:0 }}>
                        Hyper-personal dining powered by local expertise & AI.
                    </p>
                </div>

                {/* Search */}
                <div style={{ padding:"0 16px 16px", display:"flex", gap:8 }}>
                    <input
                        value={searchVal}
                        onChange={e => setSearchVal(e.target.value)}
                        onKeyDown={e => e.key==="Enter" && triggerSearch()}
                        placeholder="Budget 100k di Canggu..."
                        style={{
                            flex:1, background:"rgba(250,246,239,0.06)",
                            border:"1px solid rgba(250,246,239,0.12)", borderRadius:100,
                            padding:"9px 16px", fontSize:12, color:"#faf6ef",
                            fontFamily:"DM Sans,sans-serif", outline:"none",
                        }}
                    />
                    <button onClick={triggerSearch} style={{
                        padding:"9px 16px", background:"linear-gradient(135deg,#c4603a,#9e3f22)",
                        border:"none", borderRadius:100, color:"#faf6ef",
                        fontSize:12, cursor:"pointer", fontFamily:"DM Sans,sans-serif",
                        boxShadow:"0 2px 12px rgba(196,96,58,.4)",
                    }}>✦</button>
                </div>

                {/* Category filter */}
                <div style={{ padding:"0 16px 12px" }}>
                    <div style={{ fontSize:9, color:"rgba(250,246,239,.3)", letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:8 }}>
                        Filter kategori
                    </div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                        {FILTER_PILLS.map(p => {
                            const active = activeCat === p.id;
                            return (
                                <button key={p.id} onClick={() => toggleCat(p.id)} style={{
                                    display:"flex", alignItems:"center", gap:6,
                                    padding:"8px 12px", borderRadius:10, cursor:"pointer",
                                    border:`1px solid ${active ? p.color : "rgba(250,246,239,0.1)"}`,
                                    background: active ? `${p.color}22` : "rgba(250,246,239,0.04)",
                                    color: active ? "#faf6ef" : "rgba(250,246,239,0.55)",
                                    fontSize:12, fontFamily:"DM Sans,sans-serif",
                                    transition:"all .2s", textAlign:"left",
                                    boxShadow: active ? `0 0 12px ${p.color}44` : "none",
                                }}>
                                    <span style={{
                                        width:8, height:8, borderRadius:"50%", flexShrink:0,
                                        background: active ? p.color : "rgba(250,246,239,0.2)",
                                    }}></span>
                                    <span style={{ fontSize:13, marginRight:2 }}>{p.icon}</span>
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Divider */}
                <div style={{ height:1, background:"rgba(250,246,239,0.07)", margin:"0 16px" }} />

                {/* Stats */}
                <div style={{ padding:"14px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                    {[
                        { num: stats.total.toLocaleString(), label:"Restaurants" },
                        { num: String(stats.regencies),      label:"Regencies" },
                        { num: String(stats.avg),            label:"Avg Rating" },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign:"center" }}>
                            <div style={{ fontFamily:"Cormorant Garamond,serif", fontSize:22, fontWeight:600, color:"#e8c46a", lineHeight:1 }}>{s.num}</div>
                            <div style={{ fontSize:9, color:"rgba(250,246,239,.35)", letterSpacing:"0.8px", textTransform:"uppercase", marginTop:3 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Divider */}
                <div style={{ height:1, background:"rgba(250,246,239,0.07)", margin:"0 16px" }} />

                {/* Marker legend */}
                <div style={{ padding:"12px 20px 8px" }}>
                    <div style={{ fontSize:9, color:"rgba(250,246,239,.3)", letterSpacing:"1.2px", textTransform:"uppercase", marginBottom:10 }}>
                        Map legend
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                        {FILTER_PILLS.map(p => (
                            <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:11, color:"rgba(250,246,239,.5)" }}>
                                <span style={{ width:10, height:10, borderRadius:"50%", background:p.color, flexShrink:0, boxShadow:`0 0 6px ${p.color}88` }}></span>
                                {p.icon} {p.label}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Spacer */}
                <div style={{ flex:1 }} />

                {/* Loading indicator */}
                {loading && (
                    <div style={{ padding:"12px 20px", fontSize:11, color:"rgba(250,246,239,.35)", display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ width:6, height:6, borderRadius:"50%", background:"#4ade80", animation:"blink 1s infinite" }}></span>
                        Loading markers...
                    </div>
                )}
            </aside>

            {/* ── SELECTED RESTAURANT CARD ── */}
            {selected && (
                <div style={{
                    position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)",
                    zIndex:200, background:"rgba(15,10,8,0.97)",
                    border:`1px solid ${markerColor(selected.kategori)}55`,
                    borderRadius:16, padding:"14px 18px",
                    display:"flex", gap:14, alignItems:"center",
                    backdropFilter:"blur(24px)",
                    boxShadow:"0 20px 60px rgba(0,0,0,.8)",
                    maxWidth:"min(560px,calc(100vw - 330px))",
                    marginLeft:150,
                    animation:"slideUp .25s ease",
                }}>
                    <button onClick={() => setSelected(null)} style={{
                        position:"absolute", top:8, right:10,
                        background:"none", border:"none",
                        color:"rgba(250,246,239,.35)", cursor:"pointer",
                        fontSize:16, lineHeight:1, padding:2,
                    }}>×</button>

                    {/* Color dot */}
                    <div style={{
                        width:44, height:44, borderRadius:12, flexShrink:0,
                        background:`${markerColor(selected.kategori)}22`,
                        border:`1px solid ${markerColor(selected.kategori)}55`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:20,
                    }}>
                        {selected.kategori.includes("Sunset") ? "🌅" :
                         selected.kategori.includes("Work")   ? "☕" :
                         selected.kategori.includes("Night")  ? "🎶" :
                         selected.kategori.includes("Family") ? "🍽️" :
                         selected.kategori.includes("Budget") ? "🥘" :
                         selected.kategori.includes("Roman")  ? "🕯️" : "🌿"}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"Cormorant Garamond,serif", fontSize:16, fontWeight:600, color:"#faf6ef", marginBottom:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {selected.nama}
                        </div>
                        <div style={{ fontSize:11, color:"rgba(250,246,239,.45)", marginBottom:3 }}>
                            📍 {selected.kabupaten} · ⭐{selected.rating} · {fmtN(selected.total_review)} ulasan
                        </div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:10, color:"#e8c46a", background:"rgba(201,151,43,.12)", borderRadius:100, padding:"2px 8px" }}>{selected.price_range}</span>
                            <span style={{ fontSize:10, color:"rgba(250,246,239,.4)", background:"rgba(250,246,239,.06)", borderRadius:100, padding:"2px 8px" }}>{selected.best_time}</span>
                            {selected.highlights.slice(0,2).map(h => (
                                <span key={h} style={{ fontSize:10, color:"rgba(250,246,239,.3)", background:"rgba(250,246,239,.04)", borderRadius:100, padding:"2px 8px" }}>{h}</span>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => {
                        setChatTrigger(`Cerita tentang ${selected.nama} di ${selected.kabupaten} — worth it? Tips?`);
                        setSelected(null);
                    }} style={{
                        padding:"9px 16px", background:"linear-gradient(135deg,#c4603a,#c9972b)",
                        border:"none", borderRadius:20, color:"#faf6ef",
                        fontSize:12, fontWeight:500, cursor:"pointer",
                        fontFamily:"DM Sans,sans-serif", whiteSpace:"nowrap",
                        flexShrink:0,
                    }}>Ask AI ✦</button>
                </div>
            )}

            {/* ── Active category label on map ── */}
            {activePill && (
                <div style={{
                    position:"absolute", top:64, left:316, zIndex:150,
                    background:"rgba(15,10,8,.85)", backdropFilter:"blur(12px)",
                    border:`1px solid ${activePill.color}44`, borderRadius:100,
                    padding:"6px 14px", display:"flex", alignItems:"center", gap:6,
                }}>
                    <span style={{ width:8, height:8, borderRadius:"50%", background:activePill.color, boxShadow:`0 0 8px ${activePill.color}` }}></span>
                    <span style={{ fontSize:12, color:"#faf6ef" }}>{activePill.icon} {activePill.label}</span>
                    <span style={{ fontSize:11, color:"rgba(250,246,239,.4)" }}>· {mapResto.length} spots</span>
                    <button onClick={() => setActiveCat(null)} style={{
                        background:"none", border:"none", color:"rgba(250,246,239,.4)",
                        cursor:"pointer", fontSize:13, padding:"0 0 0 4px", lineHeight:1,
                    }}>×</button>
                </div>
            )}

            <ProfileOverlay isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

            <ChatPanel
                initialMessage={chatTrigger}
                onMessageSent={() => setChatTrigger(null)}
                onRestaurantsLoaded={onRestoLoaded}
                onFocusRestaurant={onFocusResto}
            />
        </div>
    );
}