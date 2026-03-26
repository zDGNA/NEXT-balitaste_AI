"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatPanel, { type Restaurant } from "@/components/ChatPanel";
import ProfileOverlay from "@/components/ProfileOverlay";
import { FaBeer } from 'react-icons/fa'
// ─── Constants ───────────────────────────────────────────────────────────────
const FILTER_PILLS = [
    { id: "Sunset & View",     icon: "🌅", label: "Sunset View" },
    { id: "Work from Cafe",    icon: "💻", label: "Work Café" },
    { id: "Budget Friendly",   icon: "💰", label: "Budget" },
    { id: "Family Friendly",   icon: "👨‍👩‍👧", label: "Family" },
    { id: "Vibrant Nightlife", icon: "🎶", label: "Nightlife" },
    { id: "Romantic & Cozy",   icon: "🕯️", label: "Romantic" },
];

const CARD_GRADIENTS = [
    "linear-gradient(135deg,#3d1f0f,#6b3520)",
    "linear-gradient(135deg,#1a2f1a,#2d5020)",
    "linear-gradient(135deg,#1a2a35,#203a50)",
    "linear-gradient(135deg,#2a1a3a,#4a2060)",
    "linear-gradient(135deg,#35200a,#5a3815)",
    "linear-gradient(135deg,#1a2535,#1a3545)",
];

function getEmoji(k: string) {
    if (k.includes("Sunset"))    return "🌅";
    if (k.includes("Work"))      return "☕";
    if (k.includes("Nightlife")) return "🎶";
    if (k.includes("Family"))    return "🍽️";
    if (k.includes("Budget"))    return "🥘";
    if (k.includes("Romantic"))  return "🕯️";
    return "🌿";
}

function fmtReviews(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

// ─── Jawgs Map Component (Leaflet-based) ─────────────────────────────────────
interface BaliMapProps {
    restaurants: Restaurant[];
    focusedRestaurant: Restaurant | null;
    onMarkerClick: (r: Restaurant) => void;
}

function BaliMap({ restaurants, focusedRestaurant, onMarkerClick }: BaliMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<any>(null);
    const markersRef   = useRef<any[]>([]);
    const LRef         = useRef<any>(null); // Leaflet instance

    // Init Leaflet + Jawgs once
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const JAWGS_TOKEN = process.env.NEXT_PUBLIC_JAWGS_TOKEN || "";

        // Load Leaflet CSS
        const link = document.createElement("link");
        link.rel  = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);

        // Load Leaflet JS
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => {
            const L = (window as any).L;
            LRef.current = L;

            const baliBounds = L.latLngBounds(
                [-8.98, 114.4],
                [-8.00, 115.8]

            );

            const map = L.map(containerRef.current!, {
                center:      [-8.5, 115.2],
                zoom:        5,
                minZoom: 9,
                maxBounds: baliBounds,
                maxBoundsViscosity: 1.0,
                zoomControl: false,
                attributionControl: false,
            });

            // Jawgs Dark tile layer
            // Kalau tidak punya token → fallback ke OpenStreetMap Carto Dark
            const tileUrl = JAWGS_TOKEN
                ? `https://tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token=${JAWGS_TOKEN}`
                : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

            const attribution = JAWGS_TOKEN
                ? '<a href="https://www.jawg.io">© Jawg Maps</a>'
                : '© <a href="https://carto.com">CARTO</a>';

            L.tileLayer(tileUrl, {
                attribution,
                maxZoom: 19,
                subdomains: "abcd",
            }).addTo(map);

            // Zoom control kanan atas
            L.control.zoom({ position: "topright" }).addTo(map);

            mapRef.current = map;
        };
        document.head.appendChild(script);

        return () => {
            markersRef.current.forEach(m => m.remove());
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

    // Update markers saat restaurants berubah
    useEffect(() => {
        if (!mapRef.current || !LRef.current) return;
        const L   = LRef.current;
        const map = mapRef.current;

        // Hapus marker lama
        markersRef.current.forEach(m => map.removeLayer(m));
        markersRef.current = [];

        if (!restaurants.length) return;

        restaurants.forEach((r) => {
            // Custom div icon
            const icon = L.divIcon({
                className: "",
                html: `<div class="lf-marker"><div class="lf-dot"></div><div class="lf-pulse"></div></div>`,
                iconSize:   [20, 20],
                iconAnchor: [10, 10],
            });

            const marker = L.marker([r.lat, r.lng], { icon });

            // Popup
            marker.bindPopup(`
                <div class="lf-popup">
                    <div class="lf-pop-name">${r.nama}</div>
                    <div class="lf-pop-meta">⭐${r.rating} · ${fmtReviews(r.total_review)} ulasan · ${r.price_range}</div>
                    <div class="lf-pop-cat">${r.kategori.split("|")[0].trim()}</div>
                </div>
            `, {
                closeButton:   false,
                className:     "lf-popup-wrap",
                maxWidth:      220,
                autoPanPadding: [20, 20],
            });

            marker.on("click", () => {
                onMarkerClick(r);
                marker.openPopup();
            });

            marker.addTo(map);
            markersRef.current.push(marker);
        });

        // Fit bounds ke semua marker
        if (restaurants.length > 1) {
            const bounds = L.latLngBounds(restaurants.map(r => [r.lat, r.lng]));
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14, animate: true });
        } else if (restaurants.length === 1) {
            map.setView([restaurants[0].lat, restaurants[0].lng], 15, { animate: true });
        }
    }, [restaurants, onMarkerClick]);

    // Fly to focused restaurant
    useEffect(() => {
        if (!mapRef.current || !focusedRestaurant) return;
        mapRef.current.flyTo(
            [focusedRestaurant.lat, focusedRestaurant.lng],
            15,
            { animate: true, duration: 1 }
        );
        // Buka popup marker yang sesuai
        markersRef.current.forEach((m, i) => {
            if (restaurants[i]?.id === focusedRestaurant.id) m.openPopup();
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusedRestaurant]);

    return (
        <>
            {/* Leaflet & custom map styles */}
            <style>{`
                /* Override Leaflet default styles agar cocok dengan tema */
                .leaflet-container { background: #0d1a12 !important; font-family: "DM Sans", sans-serif !important; }
                .leaflet-control-zoom { border: none !important; }
                .leaflet-control-zoom a {
                    background: rgba(22,17,13,0.9) !important;
                    border: 1px solid rgba(250,246,239,0.12) !important;
                    color: rgba(250,246,239,0.6) !important;
                    width: 28px !important; height: 28px !important;
                    line-height: 26px !important; font-size: 16px !important;
                }
                .leaflet-control-zoom a:hover { color: #faf6ef !important; background: rgba(196,96,58,0.2) !important; }
                .leaflet-control-zoom-in  { border-bottom: 1px solid rgba(250,246,239,0.1) !important; }
                .leaflet-control-attribution {
                    background: rgba(22,17,13,0.7) !important;
                    color: rgba(250,246,239,0.3) !important; font-size: 9px !important;
                    backdrop-filter: blur(8px);
                }
                .leaflet-control-attribution a { color: rgba(250,246,239,0.4) !important; }

                /* Custom markers */
                .lf-marker { position: relative; width: 20px; height: 20px; cursor: pointer; }
                .lf-dot {
                    position: absolute; top: 4px; left: 4px;
                    width: 12px; height: 12px; border-radius: 50%;
                    background: #c4603a;
                    border: 2px solid rgba(250,246,239,0.9);
                    box-shadow: 0 2px 8px rgba(196,96,58,0.7);
                    transition: transform 0.2s;
                    z-index: 2;
                }
                .lf-marker:hover .lf-dot { transform: scale(1.5); }
                .lf-pulse {
                    position: absolute; inset: -2px; border-radius: 50%;
                    border: 1.5px solid #c4603a;
                    animation: lf-ripple 2.5s ease-out infinite;
                }
                @keyframes lf-ripple {
                    0%   { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(2.8); opacity: 0; }
                }

                /* Custom popup */
                .lf-popup-wrap .leaflet-popup-content-wrapper {
                    background: rgba(22,17,13,0.97) !important;
                    border: 1px solid rgba(250,246,239,0.15) !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.6) !important;
                    padding: 0 !important;
                    backdrop-filter: blur(20px);
                }
                .lf-popup-wrap .leaflet-popup-content { margin: 0 !important; }
                .lf-popup-wrap .leaflet-popup-tip-container { display: none !important; }
                .lf-popup {
                    padding: 10px 14px;
                    min-width: 160px;
                }
                .lf-pop-name {
                    font-family: "Cormorant Garamond", serif;
                    font-size: 14px; font-weight: 600;
                    color: #faf6ef; margin-bottom: 3px;
                }
                .lf-pop-meta { font-size: 11px; color: rgba(250,246,239,0.5); margin-bottom: 5px; }
                .lf-pop-cat {
                    font-size: 10px; color: #e8c46a;
                    background: rgba(201,151,43,0.15);
                    border-radius: 100px; padding: 2px 8px;
                    display: inline-block;
                }

                /* Cards grid */
                .cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 12px;
                    padding: 0 48px 48px;
                    position: relative; z-index: 50;
                }
                @media (max-width: 768px) {
                    .cards-grid { padding: 0 16px 32px; grid-template-columns: repeat(2, 1fr); gap: 10px; }
                }

                /* Selected card detail */
                .selected-card-overlay {
                    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
                    z-index: 300;
                    background: rgba(22,17,13,0.97);
                    border: 1px solid rgba(201,151,43,0.3);
                    border-radius: 16px; padding: 16px 20px;
                    display: flex; gap: 14px; align-items: center;
                    backdrop-filter: blur(24px);
                    box-shadow: 0 20px 60px rgba(0,0,0,0.7);
                    animation: slide-up 0.3s ease both;
                    max-width: min(520px, 92vw);
                }
                .selected-card-close {
                    position: absolute; top: 8px; right: 10px;
                    background: none; border: none;
                    color: rgba(250,246,239,0.35); cursor: pointer;
                    font-size: 16px; line-height: 1; padding: 2px;
                }
                .selected-card-close:hover { color: #faf6ef; }
                .ask-ai-btn {
                    margin-left: auto; flex-shrink: 0;
                    background: linear-gradient(135deg, #c4603a, #c9972b);
                    border: none; border-radius: 20px; padding: 8px 14px;
                    color: #faf6ef; font-size: 12px; font-weight: 500;
                    cursor: pointer; white-space: nowrap;
                    font-family: "DM Sans", sans-serif;
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .ask-ai-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(196,96,58,0.4); }
            `}</style>

            <div
                ref={containerRef}
                className="map-canvas"
                style={{ position: "absolute", inset: 0, zIndex: 0 }}
            />
        </>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
    const [activeNav, setActiveNav]           = useState("explore");
    const [activePills, setActivePills]       = useState<Set<string>>(new Set());
    const [profileOpen, setProfileOpen]       = useState(false);
    const [searchValue, setSearchValue]       = useState("");
    const [chatTrigger, setChatTrigger]       = useState<string | null>(null);
    const [cards, setCards]                   = useState<Restaurant[]>([]);
    const [cardsLoading, setCardsLoading]     = useState(true);
    const [mapRestaurants, setMapRestaurants] = useState<Restaurant[]>([]);
    const [focusedResto, setFocusedResto]     = useState<Restaurant | null>(null);
    const [selectedCard, setSelectedCard]     = useState<Restaurant | null>(null);

    useEffect(() => { loadCards(); }, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { loadCards(); }, [activePills]);

    async function loadCards() {
        setCardsLoading(true);
        try {
            const qs = new URLSearchParams({ min_rating: "4.3", min_review: "100", top_n: "12" });
            if (activePills.size === 1) qs.set("kategori", [...activePills][0]);
            const res = await fetch(`/api/restaurants?${qs}`);
            if (res.ok) {
                const data: Restaurant[] = await res.json();
                setCards(data);
                setMapRestaurants(data.slice(0, 24));
            }
        } catch { /* silent */ }
        finally { setCardsLoading(false); }
    }

    const togglePill = (id: string) => {
        setActivePills(prev => {
            const next = new Set(prev);
            if (next.has(id)) { next.delete(id); return next; }
            next.clear(); next.add(id); return next;
        });
    };

    const triggerSearch = () => {
        if (searchValue.trim()) { setChatTrigger(searchValue.trim()); setSearchValue(""); }
    };

    const handleMarkerClick = useCallback((r: Restaurant) => setSelectedCard(r), []);

    const handleCardClick = (r: Restaurant) => {
        setSelectedCard(r);
        setFocusedResto(r);
    };

    const handleRestaurantsLoaded = useCallback((data: Restaurant[]) => {
        setMapRestaurants(data);
        setCards(data);
    }, []);

    return (
        <>
            <section className="hero" id="heroSection">

                {/* ── Jawgs Map ── */}
                <BaliMap
                    restaurants={mapRestaurants}
                    focusedRestaurant={focusedResto}
                    onMarkerClick={handleMarkerClick}
                />

                {/* Weather */}
                <div className="weather-widget">
                    <div className="weather-icon">🌤️</div>
                    <div>
                        <div className="weather-temp">29°C</div>
                        <div className="weather-label">Bali · Now</div>
                    </div>
                    <div className="weather-note">☀️ Perfect for beachside dining tonight</div>
                </div>

                {/* Nav */}
                <nav>
                    <div className="logo">
                        <div className="logo-mark">🌿</div>
                        <div className="logo-text">Bali<span>Bites</span> AI</div>
                    </div>
                    
                    <button className="nav-cta" onClick={() => setProfileOpen(true)}>🔮 Taste Profile</button>
                </nav>

                {/* Hero content */}
                <div className="hero-content">
                    <div className="eyebrow">
                        <span className="eyebrow-dot"></span>AI-Powered · 1,352 Real Restaurants
                    </div>
                    <h1>Discover your next <em>perfect</em> <span className="highlight">Bali meal</span></h1>
                    <p className="hero-sub">
                        Hyper-personal dining recommendations powered by local expertise,
                        real-time context & AI that actually understands your cravings.
                    </p>

                    <div className="filter-bar">
                        {FILTER_PILLS.map(p => (
                            <div key={p.id}
                                className={`filter-pill ${activePills.has(p.id) ? "active" : ""}`}
                                onClick={() => togglePill(p.id)}>
                                <span className="pill-icon">{p.icon}</span>{p.label}
                            </div>
                        ))}
                    </div>

                    <div className="search-wrap">
                        <input className="search-input"
                            placeholder="Where are you? What are you craving?"
                            value={searchValue}
                            onChange={e => setSearchValue(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && triggerSearch()} />
                        <button className="search-btn" onClick={triggerSearch}>✦ Find</button>
                    </div>
                </div>

                <div className="bottom-grad"></div>

                {/* Stats */}
                <div className="stat-float stat-float-1"><div className="stat-num">1,352</div><div className="stat-label">Curated spots</div></div>
                <div className="stat-float stat-float-2"><div className="stat-num">9</div><div className="stat-label">Regencies</div></div>
                <div className="stat-float stat-float-3"><div className="stat-num">4.55</div><div className="stat-label">Avg rating</div></div>

                {/* ── Cards Grid ── */}
                <div style={{ position: "relative", zIndex: 50, paddingTop: 8 }}>
                    <div style={{ padding: "0 48px 12px", fontSize: 11, color: "rgba(250,246,239,0.35)", letterSpacing: "1px", textTransform: "uppercase" as const, fontWeight: 500 }}>
                        {activePills.size > 0 ? `✦ ${[...activePills][0]} · Top picks` : "✦ Curated for you · Right now"}
                    </div>
                    <div className="cards-grid">
                        {cardsLoading
                            ? Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="resto-card resto-card-skeleton">
                                    <div className="card-img-placeholder card-color-skeleton" />
                                    <div className="card-body">
                                        <div className="skeleton-line" style={{ width: "70%", height: 13, marginBottom: 6 }} />
                                        <div className="skeleton-line" style={{ width: "50%", height: 10 }} />
                                    </div>
                                </div>
                            ))
                            : cards.map((r, i) => {
                                const cats = r.kategori.split("|").map(s => s.trim());
                                return (
                                    <div key={r.id} className="resto-card"
                                        style={{ animationDelay: `${i * 0.06}s` }}
                                        onClick={() => handleCardClick(r)}>
                                        <div className="card-img-placeholder"
                                            style={{ background: CARD_GRADIENTS[i % CARD_GRADIENTS.length] }}>
                                            {getEmoji(r.kategori)}
                                            <div className="card-badge">{cats[0]}</div>
                                            {r.rating >= 4.7 && <div className="card-trend">⭐ Top Rated</div>}
                                        </div>
                                        <div className="card-body">
                                            <div className="card-name">{r.nama}</div>
                                            <div className="card-area">📍 {r.kabupaten}</div>
                                            <div className="card-meta">
                                                <div className="card-rating">★ {r.rating}</div>
                                                <div className="card-price">{r.price_range}</div>
                                            </div>
                                            <div className="card-insight">
                                                {fmtReviews(r.total_review)} ulasan · {r.best_time}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>

                {/* Selected restaurant detail */}
                {selectedCard && (
                    <div className="selected-card-overlay">
                        <button className="selected-card-close" onClick={() => setSelectedCard(null)}>×</button>
                        <div style={{ fontSize: 30, flexShrink: 0 }}>{getEmoji(selectedCard.kategori)}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 15, fontWeight: 600, color: "#faf6ef", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                {selectedCard.nama}
                            </div>
                            <div style={{ fontSize: 11, color: "rgba(250,246,239,0.5)", marginBottom: 4 }}>
                                📍 {selectedCard.kabupaten} · ⭐{selectedCard.rating} · {fmtReviews(selectedCard.total_review)} ulasan
                            </div>
                            <div style={{ fontSize: 11, color: "#e8c46a" }}>
                                {selectedCard.price_range} · {selectedCard.best_time}
                            </div>
                            {selectedCard.highlights.length > 0 && (
                                <div style={{ fontSize: 10, color: "rgba(250,246,239,0.35)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {selectedCard.highlights.slice(0, 3).join(" · ")}
                                </div>
                            )}
                        </div>
                        <button className="ask-ai-btn"
                            onClick={() => {
                                setChatTrigger(`Cerita detail tentang ${selectedCard.nama} di ${selectedCard.kabupaten} — worth it dan tips apa?`);
                                setSelectedCard(null);
                            }}>
                            Ask AI ✦
                        </button>
                    </div>
                )}

                <ProfileOverlay isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

                <ChatPanel
                    initialMessage={chatTrigger}
                    onMessageSent={() => setChatTrigger(null)}
                    onRestaurantsLoaded={handleRestaurantsLoaded}
                    onFocusRestaurant={setFocusedResto}
                />
            </section>
        </>
    );
}