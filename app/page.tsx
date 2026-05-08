"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatPanel, { type Restaurant } from "@/components/ChatPanel";
import ProfileOverlay from "@/components/ProfileOverlay";
import SplashScreen from "@/components/Splashscreen";
import AuthModal, { type AuthUser } from "@/components/Authmodal";

const FILTER_PILLS = [
    { id: "Sunset & View",     icon: "🌅", label: "Sunset",    color: "#c9972b" },
    { id: "Work from Cafe",    icon: "💻", label: "Work Café", color: "#4ade80" },
    { id: "Budget Friendly",   icon: "💰", label: "Budget",    color: "#94a3b8" },
    { id: "Family Friendly",   icon: "👨‍👩‍👧", label: "Family",   color: "#60a5fa" },
    { id: "Vibrant Nightlife", icon: "🎶", label: "Nightlife", color: "#f87171" },
    { id: "Romantic & Cozy",   icon: "🕯️", label: "Romantic",  color: "#f472b6" },
];

const KAT_COLOR: Record<string, string> = {
    "Sunset & View":"#c9972b","Work from Cafe":"#4ade80","Budget Friendly":"#94a3b8",
    "Family Friendly":"#60a5fa","Vibrant Nightlife":"#f87171","Romantic & Cozy":"#f472b6","General Chill":"#c4603a",
};

function markerColor(k: string) {
    for (const [key, v] of Object.entries(KAT_COLOR)) if (k?.includes(key)) return v;
    return "#c4603a";
}
function fmtN(n: number) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

interface SearchHistoryItem { query: string; timestamp: number; resultCount: number; }

// ─── BaliMap ──────────────────────────────────────────────────────────────────
function BaliMap({ restaurants, focused, activeCategory, onMarkerClick, userLocation }: {
    restaurants: Restaurant[];
    focused: Restaurant | null;
    activeCategory: string | null;
    onMarkerClick: (r: Restaurant) => void;
    userLocation: { lat: number; lng: number } | null;  // ✅ Tipe konsisten
}) {
    const divRef        = useRef<HTMLDivElement>(null);
    const mapRef        = useRef<any>(null);
    const markersRef    = useRef<any[]>([]);
    const userMarkerRef = useRef<any>(null);
    const LRef          = useRef<any>(null);
    const initDone      = useRef(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (initDone.current) return;
        initDone.current = true;

        if (!document.getElementById("lf-css")) {
            const l = document.createElement("link");
            l.id = "lf-css"; l.rel = "stylesheet";
            l.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
            document.head.appendChild(l);
        }

        const s = document.createElement("script");
        s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        s.onload = () => {
            const L = (window as any).L;
            LRef.current = L;
            if (!divRef.current) return;

            const TOKEN = process.env.NEXT_PUBLIC_JAWGS_TOKEN ?? "";
            const tile = TOKEN
                ? `https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=${TOKEN}`
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

            const map = L.map(divRef.current, {
                center: [-8.4095, 115.19], zoom: 10, minZoom: 9, maxZoom: 17,
                maxBounds: [[-9.1, 114.3], [-7.9, 116.0]], maxBoundsViscosity: 1.0,
                zoomControl: false, attributionControl: false,
            });

            L.tileLayer(tile, { maxZoom: 19, subdomains: "abcd" }).addTo(map);
            L.control.zoom({ position: "bottomright" }).addTo(map);
            L.control.attribution({ position: "bottomleft", prefix: false })
                .addAttribution(TOKEN ? '© <a href="https://jawg.io">Jawg</a>' : '© <a href="https://carto.com">CARTO</a>')
                .addTo(map);

            mapRef.current = map;

            // inject styles
            const style = document.createElement("style");
            style.textContent = `
                @keyframes lfPulse{0%,100%{box-shadow:0 0 0 3px #c4603a55,0 2px 8px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 6px #c4603a22,0 2px 8px rgba(0,0,0,.5)}}
                @keyframes userPulse{0%,100%{box-shadow:0 0 0 4px rgba(96,165,250,.3),0 2px 12px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 8px rgba(96,165,250,.1),0 2px 12px rgba(0,0,0,.5)}}
                .leaflet-container{background:#0d1412!important}
                .leaflet-control-zoom{border:none!important;margin:0 12px 12px 0!important}
                .leaflet-control-zoom a{background:rgba(22,17,13,.9)!important;border:1px solid rgba(250,246,239,.12)!important;color:rgba(250,246,239,.6)!important;width:30px!important;height:30px!important;line-height:28px!important;font-size:16px!important}
                .leaflet-control-zoom a:hover{color:#faf6ef!important;background:rgba(196,96,58,.2)!important}
                .leaflet-control-zoom-in{border-bottom:1px solid rgba(250,246,239,.1)!important;border-radius:8px 8px 0 0!important}
                .leaflet-control-zoom-out{border-radius:0 0 8px 8px!important}
                .leaflet-control-attribution{background:rgba(22,17,13,.6)!important;color:rgba(250,246,239,.25)!important;font-size:9px!important;margin:0 0 6px 6px!important;border-radius:6px!important}
                .lf-popup-wrap .leaflet-popup-content-wrapper{background:rgba(18,13,10,.97)!important;border:1px solid rgba(250,246,239,.14)!important;border-radius:12px!important;box-shadow:0 12px 40px rgba(0,0,0,.7)!important;padding:0!important}
                .lf-popup-wrap .leaflet-popup-content{margin:0!important}
                .lf-popup-wrap .leaflet-popup-tip-container{display:none!important}
            `;
            document.head.appendChild(style);
        };
        document.head.appendChild(s);

        return () => {
            markersRef.current.forEach(m => m?.remove?.());
            userMarkerRef.current?.remove?.();
            mapRef.current?.remove?.();
            mapRef.current = null; initDone.current = false;
        };
    }, []);

    // User location marker
    useEffect(() => {
        const L = LRef.current, map = mapRef.current;
        if (!L || !map || !userLocation) return;
        userMarkerRef.current?.remove?.();
        const icon = L.divIcon({
            className: "",
            html: `<div style="width:18px;height:18px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#93c5fd,#1d4ed8);border:3px solid #fff;box-shadow:0 0 0 4px rgba(96,165,250,0.35),0 2px 12px rgba(0,0,0,0.5);animation:userPulse 2s ease infinite;"></div>`,
            iconSize: [18, 18], iconAnchor: [9, 9],
        });
        // ✅ FIX: Gunakan .lat dan .lng
        const m = L.marker([userLocation.lat, userLocation.lng], { icon });
        m.bindPopup(`<div style="padding:8px 12px;font-family:DM Sans,sans-serif;color:#faf6ef;font-size:12px;display:flex;align-items:center;gap:6px"><span>📍</span>Lokasi kamu</div>`,
            { closeButton: false, className: "lf-popup-wrap", maxWidth: 160 });
        m.addTo(map);
        userMarkerRef.current = m;
        // ✅ FIX: Fly to dengan .lat dan .lng
        map.flyTo([userLocation.lat, userLocation.lng], 13, { duration: 1.2 });
    }, [userLocation]);

// Restaurant markers
useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach(m => map.removeLayer(m));
    markersRef.current = [];

    const valid = restaurants.filter(r =>
        r.lat != null && r.lng != null && isFinite(r.lat) && isFinite(r.lng)
    );
    if (!valid.length) return;

    valid.forEach(r => {
        const dot = markerColor(r.kategori);
        const icon = L.divIcon({
            className: "",
            html: `<span style="display:block;width:13px;height:13px;border-radius:50%;background:${dot};border:2.5px solid rgba(255,255,255,0.85);box-shadow:0 0 0 3px ${dot}55,0 2px 8px rgba(0,0,0,0.5);animation:lfPulse 2.5s ease infinite;"></span>`,
            iconSize: [13, 13], iconAnchor: [6, 6],
        });
        
        const marker = L.marker([r.lat, r.lng], { icon });
        (marker as any).restoId = r.id;

        marker.bindPopup(`
            <div style="padding:10px 12px;min-width:170px;font-family:DM Sans,sans-serif">
                <div style="font-family:'Cormorant Garamond',serif;font-size:14px;font-weight:600;color:#faf6ef;margin-bottom:3px">${r.nama}</div>
                <div style="font-size:11px;color:rgba(250,246,239,.5);margin-bottom:5px">⭐${r.rating} · ${fmtN(r.total_review)} ulasan · ${r.price_range}</div>
                <div style="font-size:10px;color:${dot};background:${dot}22;border-radius:100px;padding:2px 8px;display:inline-block">${r.kategori?.split("|")[0]?.trim()}</div>
            </div>
        `, { closeButton: false, className: "lf-popup-wrap", maxWidth: 220 });

        marker.on("click", () => { onMarkerClick(r); marker.openPopup(); });
        marker.addTo(map);
        markersRef.current.push(marker);
    });

    if (focused) return;

    if (valid.length > 1) {
        try {
            const bounds = L.latLngBounds(valid.map((r: Restaurant) => [r.lat!, r.lng!]));
            if (bounds.isValid()) map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14, animate: true, duration: 0.8 });
        } catch { map.setView([-8.4095, 115.19], 10); }
    } else if (valid.length === 1) {
        map.flyTo([valid[0].lat!, valid[0].lng!], 15, { duration: 0.8 });
    }
}, [restaurants, activeCategory, onMarkerClick, focused]);


useEffect(() => {
    const timer = setTimeout(() => {
        const L = LRef.current, map = mapRef.current;
        
        // FIX: Pastikan focused, lat, dan lng ADA sebelum lanjut
        if (!L || !map || !focused || focused.lat == null || focused.lng == null) return;

        // Ambil nilai koordinat yang sudah pasti tipenya number
        const targetLat = focused.lat;
        const targetLng = focused.lng;

        // 1. Zoom ke lokasi restoran
        map.flyTo([targetLat, targetLng], 16, { 
            duration: 0.8,
            easeLinearity: 0.25 
        });

        // 2. Cari marker berdasarkan ID unik dan paksa buka popup
        let found = false;
        map.eachLayer((layer: any) => {
            if (layer instanceof L.Marker && (layer as any).restoId === focused.id) {
                layer.openPopup();
                found = true;
            }
        });

        // 3. Fallback: Pakai koordinat jika ID tidak ketemu
        if (!found) {
            map.eachLayer((layer: any) => {
                if (layer instanceof L.Marker) {
                    const pos = layer.getLatLng();
                    if (Math.abs(pos.lat - targetLat) < 0.0001 && Math.abs(pos.lng - targetLng) < 0.0001) {
                        layer.openPopup();
                    }
                }
            });
        }
    }, 100);

    return () => clearTimeout(timer);
}, [focused]);

    return <div ref={divRef} style={{ position: "absolute", inset: 0, zIndex: 0 }} />;
}

// ─── SettingsPanel ────────────────────────────────────────────────────────────
function SettingsPanel({ onClose, user, searchHistory, onClearHistory }: {
    onClose: () => void;
    user: AuthUser | null;
    searchHistory: SearchHistoryItem[];
    onClearHistory: () => void;
}) {
    const [tab, setTab] = useState<"general" | "history">("general");
    const isLoggedIn = user && user.name !== "Guest";

    return (
        <div style={{
            position: "absolute", top: 60, right: 12, zIndex: 300,
            background: "rgba(18,13,10,0.98)", border: "1px solid rgba(250,246,239,0.12)",
            borderRadius: 14, width: 260, backdropFilter: "blur(24px)",
            boxShadow: "0 20px 60px rgba(0,0,0,.8)", overflow: "hidden",
        }}>
            <div style={{ display: "flex", borderBottom: "1px solid rgba(250,246,239,0.07)" }}>
                {(["general", "history"] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        flex: 1, padding: "10px 0", border: "none", fontSize: 11,
                        background: tab === t ? "rgba(196,96,58,0.15)" : "transparent",
                        color: tab === t ? "#faf6ef" : "rgba(250,246,239,0.35)",
                        cursor: "pointer", fontFamily: "DM Sans,sans-serif",
                        borderBottom: tab === t ? "2px solid #c4603a" : "2px solid transparent",
                        transition: "all .2s",
                    }}>
                        {t === "general" ? "⚙ Pengaturan" : "🕐 Riwayat"}
                    </button>
                ))}
                <button onClick={onClose} style={{ padding: "0 14px", border: "none", background: "transparent", color: "rgba(250,246,239,0.35)", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>

            {tab === "general" && (
                <div style={{ padding: "6px 0" }}>
                    {[
                        { icon: "🗺️", label: "Map style",   sub: "Dark (CARTO)" },
                        { icon: "🔔", label: "Notifikasi",   sub: "On" },
                        { icon: "🌐", label: "Bahasa",       sub: "ID / EN" },
                    ].map(item => (
                        <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", cursor: "pointer", transition: "background .15s" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(250,246,239,0.05)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                            <span style={{ fontSize: 15 }}>{item.icon}</span>
                            <div>
                                <div style={{ fontSize: 12, color: "#faf6ef" }}>{item.label}</div>
                                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.3)", marginTop: 1 }}>{item.sub}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === "history" && (
                <div>
                    {!isLoggedIn ? (
                        <div style={{ padding: "24px 16px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
                            <div style={{ fontSize: 12, color: "rgba(250,246,239,0.4)", lineHeight: 1.5 }}>Login untuk menyimpan<br />riwayat pencarian</div>
                        </div>
                    ) : searchHistory.length === 0 ? (
                        <div style={{ padding: "24px 16px", textAlign: "center" }}>
                            <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                            <div style={{ fontSize: 12, color: "rgba(250,246,239,0.4)" }}>Belum ada riwayat</div>
                        </div>
                    ) : (
                        <>
                            <div style={{ maxHeight: 280, overflowY: "auto" }}>
                                {searchHistory.map((h, i) => (
                                    <div key={i} style={{ padding: "9px 16px", display: "flex", alignItems: "flex-start", gap: 10, borderBottom: "1px solid rgba(250,246,239,0.05)" }}>
                                        <span style={{ fontSize: 11, marginTop: 1 }}>🔍</span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, color: "#faf6ef", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.query}</div>
                                            <div style={{ fontSize: 10, color: "rgba(250,246,239,0.3)", marginTop: 2 }}>
                                                {h.resultCount} hasil · {new Date(h.timestamp).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(250,246,239,0.07)" }}>
                                <button onClick={onClearHistory} style={{
                                    width: "100%", padding: "7px 0", borderRadius: 8,
                                    background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
                                    color: "#f87171", fontSize: 11, cursor: "pointer", fontFamily: "DM Sans,sans-serif",
                                }}>🗑️ Hapus semua riwayat</button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
    const [splashDone, setSplashDone]     = useState(false);
    const [user, setUser]                 = useState<AuthUser | null>(null);
    const [profileKey, setProfileKey]     = useState(0);
    const [profileOpen, setProfileOpen]   = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activePill, setActivePill]     = useState<string | null>(null);
    const [searchValue, setSearchValue]   = useState("");
    const [chatTrigger, setChatTrigger]   = useState<string | null>(null);
    const [restaurants, setRestaurants]   = useState<Restaurant[]>([]);
    const [focused, setFocused]           = useState<Restaurant | null>(null);
    const [selected, setSelected]         = useState<Restaurant | null>(null);
    const [loading, setLoading]           = useState(false);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const abortControllerRef = useRef<AbortController | null>(null);

    // ✅ Tipe userLocation konsisten: { lat, lng }
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const userLocationRef = useRef(userLocation);
    useEffect(() => {
        userLocationRef.current = userLocation;
    }, [userLocation]);
    
const loadRestaurants = useCallback(async (kategori?: string | null) => {
    // FIX: Gunakan abortControllerRef.current, bukan AbortController.current
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
        const qs = new URLSearchParams({ 
            min_rating: "4.0", 
            min_review: "30", 
            top_n: "100" 
        });
        
        if (kategori) qs.set("kategori", kategori);
        
        const loc = userLocationRef.current;
        if (loc) {
            qs.set("user_lat", String(loc.lat));
            qs.set("user_lng", String(loc.lng));
        }
        
        // Masukkan signal ke dalam fetch
        const res = await fetch(`/api/restaurant?${qs}`, { 
            signal: controller.signal 
        });

        if (res.ok) {
            const data = await res.json();
            setRestaurants(data);
        }
    } catch (err: any) {
        // Abaikan error jika itu karena request dibatalkan (user klik filter lain dengan cepat)
        if (err.name !== 'AbortError') {
            console.error("Fetch error:", err);
        }
    } finally {
        // Hanya matikan loading jika request ini adalah request yang terakhir (tidak dibatalkan)
        if (!controller.signal.aborted) {
            setLoading(false);
        }
    }
}, []);

    useEffect(() => { 
        if (splashDone && user) {
            loadRestaurants(activePill);
        }
    }, [splashDone, user, activePill, userLocation, loadRestaurants]);
    useEffect(() => { if (activePill !== null && user) loadRestaurants(activePill); }, [activePill]);

    const handleAuth = useCallback((u: AuthUser) => {
        setUser(u);
        setProfileKey(k => k + 1);
        setProfileOpen(false);
        if (u.name !== "Guest") {
            try {
                const stored = localStorage.getItem(`bb_hist_${u.email}`);
                if (stored) setSearchHistory(JSON.parse(stored));
                else setSearchHistory([]);
            } catch { setSearchHistory([]); }
        } else {
            setSearchHistory([]);
        }
    }, []);

    const addHistory = useCallback((query: string, count: number) => {
        if (!user || user.name === "Guest") return;
        setSearchHistory(prev => {
            const item: SearchHistoryItem = { query, timestamp: Date.now(), resultCount: count };
            const updated = [item, ...prev.filter(h => h.query !== query)].slice(0, 30);
            try { localStorage.setItem(`bb_hist_${user.email}`, JSON.stringify(updated)); } catch { }
            return updated;
        });
    }, [user]);

    const clearHistory = useCallback(() => {
        setSearchHistory([]);
        if (user?.email) try { localStorage.removeItem(`bb_hist_${user.email}`); } catch { }
    }, [user]);

    const togglePill    = (id: string) => setActivePill(p => p === id ? null : id);
    const triggerSearch = () => {
        if (!searchValue.trim()) return;
        addHistory(searchValue.trim(), 0);
        setChatTrigger(searchValue.trim());
        setSearchValue("");
    };

    const onMarkerClick  = useCallback((r: Restaurant) => { setSelected(r); setFocused(r); }, []);
    const onRestoLoaded  = useCallback((data: Restaurant[]) => { setRestaurants(data); }, []);
    const onFocusResto   = useCallback((r: Restaurant | null) => { setFocused(r); if (r) setSelected(r); }, []);
    const activePillData = FILTER_PILLS.find(p => p.id === activePill);

    // ✅ Effect: Request geolocation setelah login
 useEffect(() => {
    if (user && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                // loadRestaurants akan terpicu otomatis oleh useEffect di bawah
            },
            (err) => console.log("Location permission denied:", err),
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }
}, [user]);

    return (
        <>
            {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

            {splashDone && (
                <div style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
                    <BaliMap
                        restaurants={restaurants} focused={focused}
                        activeCategory={activePill} onMarkerClick={onMarkerClick}
                        userLocation={userLocation}
                    />

                    {/* TOPBAR */}
                    <header style={{
                        position: "absolute", top: 0, left: 0, right: 0, zIndex: 200,
                        display: "flex", alignItems: "center",
                        background: "rgba(15,10,8,0.75)", backdropFilter: "blur(20px)",
                        borderBottom: "1px solid rgba(250,246,239,0.08)", height: 52,
                    }}>
                        {/* Logo */}
                        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 20px", borderRight: "1px solid rgba(250,246,239,0.08)", height: "100%", flexShrink: 0 }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg,#c4603a,#c9972b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🌿</div>
                            <span style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, fontWeight: 600, color: "#faf6ef" }}>
                                Bali<span style={{ color: "#c9972b" }}>Bites</span> AI
                            </span>
                        </div>

                        <div style={{ flex: 1 }} />

                        {/* Location / Weather pill */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderRight: "1px solid rgba(250,246,239,0.08)", height: "100%", minWidth: 0 }}>
                            {userLocation ? (
                                <>
                                    <span style={{ fontSize: 15, flexShrink: 0 }}>📍</span>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 11, color: "#60a5fa", fontWeight: 500, whiteSpace: "nowrap" }}>Lokasi aktif</div>
                                        {/* ✅ FIX: Gunakan .lat dan .lng */}
                                        <div style={{ fontSize: 10, color: "rgba(250,246,239,0.4)", whiteSpace: "nowrap" }}>
                                            {userLocation.lat.toFixed(4)}°, {userLocation.lng.toFixed(4)}°
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <span style={{ fontSize: 15 }}>🌤️</span>
                                    <span style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, color: "#faf6ef", flexShrink: 0 }}>29°C</span>
                                    <span style={{ color: "rgba(201,151,43,0.85)", fontStyle: "italic", fontSize: 11, whiteSpace: "nowrap" }}>Perfect for dining tonight</span>
                                </>
                            )}
                        </div>

                        {/* User badge */}
                        {user && user.name !== "Guest" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRight: "1px solid rgba(250,246,239,0.08)", height: "100%", fontSize: 12, color: "rgba(250,246,239,0.6)", whiteSpace: "nowrap" }}>
                                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block", flexShrink: 0 }} />
                                {user.name}
                            </div>
                        )}

                        <button onClick={() => setProfileOpen(true)} style={{ margin: "0 8px", padding: "7px 14px", borderRadius: 100, background: "linear-gradient(135deg,#c9972b,#c4603a)", border: "none", color: "#faf6ef", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                            🔮 Taste Profile
                        </button>
                        <button onClick={() => setSettingsOpen(p => !p)} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(250,246,239,0.1)", background: settingsOpen ? "rgba(250,246,239,0.08)" : "transparent", color: "rgba(250,246,239,0.5)", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 }}>
                            ⚙
                        </button>
                    </header>

                    {settingsOpen && (
                        <SettingsPanel
                            onClose={() => setSettingsOpen(false)}
                            user={user}
                            searchHistory={searchHistory}
                            onClearHistory={clearHistory}
                        />
                    )}

                    {/* LEFT PANEL */}
                    <aside style={{ position: "absolute", top: 52, left: 0, bottom: 0, zIndex: 100, width: 300, display: "flex", flexDirection: "column", background: "rgba(10,7,5,0.65)", backdropFilter: "blur(18px)", borderRight: "1px solid rgba(250,246,239,0.07)" }}>
                        <div style={{ padding: "20px 20px 12px" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(201,151,43,0.1)", border: "1px solid rgba(201,151,43,0.22)", borderRadius: 100, padding: "4px 12px", fontSize: 10, color: "#e8c46a", letterSpacing: "1px", textTransform: "uppercase", marginBottom: 12 }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#c9972b", display: "inline-block" }} />
                                AI-Powered · 1,352 Restoran
                            </div>
                            <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 28, fontWeight: 300, lineHeight: 1.15, color: "#faf6ef", marginBottom: 8 }}>
                                Discover your<br /><em style={{ color: "#e8c46a" }}>perfect meal</em><br /><span style={{ color: "#c4603a" }}>in Bali</span>
                            </h1>
                            <p style={{ fontSize: 11, lineHeight: 1.6, color: "rgba(250,246,239,.4)", fontWeight: 300 }}>Hyper-personal dining powered by local expertise &amp; AI.</p>
                        </div>

                        <div style={{ padding: "0 14px 12px", display: "flex", gap: 8 }}>
                            <input value={searchValue} onChange={e => setSearchValue(e.target.value)} onKeyDown={e => e.key === "Enter" && triggerSearch()}
                                placeholder="Budget 100k di Canggu..."
                                style={{ flex: 1, background: "rgba(250,246,239,0.06)", border: "1px solid rgba(250,246,239,0.12)", borderRadius: 100, padding: "9px 14px", fontSize: 12, color: "#faf6ef", fontFamily: "DM Sans,sans-serif", outline: "none" }} />
                            <button onClick={triggerSearch} style={{ padding: "9px 14px", background: "linear-gradient(135deg,#c4603a,#9e3f22)", border: "none", borderRadius: 100, color: "#faf6ef", fontSize: 13, cursor: "pointer" }}>✦</button>
                        </div>

                        <div style={{ padding: "0 14px 10px" }}>
                            <div style={{ fontSize: 9, color: "rgba(250,246,239,.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>Filter kategori</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                                {FILTER_PILLS.map(p => {
                                    const active = activePill === p.id;
                                    return (
                                        <button key={p.id} onClick={() => togglePill(p.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 10px", borderRadius: 10, cursor: "pointer", border: `1px solid ${active ? p.color : "rgba(250,246,239,0.1)"}`, background: active ? `${p.color}22` : "rgba(250,246,239,0.04)", color: active ? "#faf6ef" : "rgba(250,246,239,0.55)", fontSize: 11, fontFamily: "DM Sans,sans-serif", transition: "all .2s", textAlign: "left", boxShadow: active ? `0 0 10px ${p.color}44` : "none" }}>
                                            <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: active ? p.color : "rgba(250,246,239,0.2)" }} />
                                            <span style={{ fontSize: 12 }}>{p.icon}</span>{p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ height: 1, background: "rgba(250,246,239,0.07)", margin: "0 14px" }} />

                        <div style={{ padding: "10px 18px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                            {[{ num: "1,352", label: "Restaurants" }, { num: "9", label: "Regencies" }, { num: "4.55", label: "Avg Rating" }].map(s => (
                                <div key={s.label} style={{ textAlign: "center" }}>
                                    <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 20, fontWeight: 600, color: "#e8c46a", lineHeight: 1 }}>{s.num}</div>
                                    <div style={{ fontSize: 9, color: "rgba(250,246,239,.35)", letterSpacing: "0.8px", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                                </div>
                            ))}
                        </div>

                        <div style={{ height: 1, background: "rgba(250,246,239,0.07)", margin: "0 14px" }} />

                        <div style={{ padding: "10px 18px 8px" }}>
                            <div style={{ fontSize: 9, color: "rgba(250,246,239,.3)", letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 8 }}>Map legend</div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                {userLocation && (
                                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#60a5fa" }}>
                                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1d4ed8", border: "2px solid #fff", flexShrink: 0, boxShadow: "0 0 6px #60a5fa88" }} />
                                        📍 Lokasi kamu
                                    </div>
                                )}
                                {FILTER_PILLS.map(p => (
                                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(250,246,239,.45)" }}>
                                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.color, flexShrink: 0, boxShadow: `0 0 5px ${p.color}88` }} />
                                        {p.icon} {p.label}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ flex: 1 }} />
                        {loading && (
                            <div style={{ padding: "10px 18px", fontSize: 10, color: "rgba(250,246,239,.3)", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid rgba(250,246,239,0.05)" }}>
                                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", animation: "blink 1s infinite" }} />
                                Loading markers...
                            </div>
                        )}
                    </aside>

                    {/* Active category label */}
                    {activePillData && (
                        <div style={{ position: "absolute", top: 64, left: 316, zIndex: 150, background: "rgba(15,10,8,.88)", backdropFilter: "blur(12px)", border: `1px solid ${activePillData.color}44`, borderRadius: 100, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: activePillData.color }} />
                            <span style={{ fontSize: 12, color: "#faf6ef" }}>{activePillData.icon} {activePillData.label}</span>
                            <span style={{ fontSize: 11, color: "rgba(250,246,239,.4)" }}>· {restaurants.length} spots</span>
                            <button onClick={() => setActivePill(null)} style={{ background: "none", border: "none", color: "rgba(250,246,239,.4)", cursor: "pointer", fontSize: 13, padding: "0 0 0 4px" }}>×</button>
                        </div>
                    )}

                    {/* Selected card */}
                    {selected && (
                        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", marginLeft: 150, zIndex: 200, background: "rgba(15,10,8,0.97)", border: `1px solid ${markerColor(selected.kategori)}55`, borderRadius: 16, padding: "14px 18px", display: "flex", gap: 14, alignItems: "center", backdropFilter: "blur(24px)", boxShadow: "0 20px 60px rgba(0,0,0,.8)", maxWidth: "min(560px,calc(100vw - 330px))", animation: "slideUp .25s ease" }}>
                            <button onClick={() => setSelected(null)} style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", color: "rgba(250,246,239,.35)", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>
                            <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: `${markerColor(selected.kategori)}22`, border: `1px solid ${markerColor(selected.kategori)}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                                {selected.kategori?.includes("Sunset") ? "🌅" : selected.kategori?.includes("Work") ? "☕" : selected.kategori?.includes("Night") ? "🎶" : selected.kategori?.includes("Family") ? "🍽️" : selected.kategori?.includes("Budget") ? "🥘" : selected.kategori?.includes("Roman") ? "🕯️" : "🌿"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 16, fontWeight: 600, color: "#faf6ef", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.nama}</div>
                                <div style={{ fontSize: 11, color: "rgba(250,246,239,.45)", marginBottom: 3 }}>📍 {selected.kabupaten} · ⭐{selected.rating} · {fmtN(selected.total_review)} ulasan</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 10, color: "#e8c46a", background: "rgba(201,151,43,.12)", borderRadius: 100, padding: "2px 8px" }}>{selected.price_range}</span>
                                    {Array.isArray(selected.highlights) && selected.highlights.filter(h => h && h !== "System.Object[]").slice(0, 2).map(h => (
                                        <span key={h} style={{ fontSize: 10, color: "rgba(250,246,239,.3)", background: "rgba(250,246,239,.04)", borderRadius: 100, padding: "2px 8px" }}>{h}</span>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => { setChatTrigger(`Cerita tentang ${selected.nama} di ${selected.kabupaten} — worth it? Tips?`); setSelected(null); }} style={{ padding: "8px 14px", background: "linear-gradient(135deg,#c4603a,#c9972b)", border: "none", borderRadius: 20, color: "#faf6ef", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                                Ask AI ✦
                            </button>
                        </div>
                    )}

                    {/* ProfileOverlay — key resets state on login */}
                    <ProfileOverlay key={profileKey} isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

                    <ChatPanel
                        initialMessage={chatTrigger}
                        onMessageSent={() => setChatTrigger(null)}
                        onRestaurantsLoaded={onRestoLoaded}
                        onFocusRestaurant={onFocusResto}
                        onSearchCompleted={addHistory}
                        userName={user?.name}
                    />
                </div>
            )}

            {splashDone && !user && (
                <div style={{ position: "fixed", inset: 0, zIndex: 9000 }}>
                    <AuthModal onAuth={handleAuth} />
                </div>
            )}

            <style>{`
                @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
                @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
            `}</style>
        </>
    );
}