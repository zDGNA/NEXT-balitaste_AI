"use client";

import { useState, useEffect } from "react";
import ChatPanel from "@/components/ChatPanel";
import ProfileOverlay from "@/components/ProfileOverlay";
import { getRecommendations, formatReviews, parseKategori, KATEGORI_CONFIG, type Restaurant } from "@/lib/api";

const MAP_PINS = [
    { name: "Locavore",      color: "terra",  style: { left: "52%", top: "42%" }, label: "Locavore · Ubud",       rating: "★ 4.9 · 12 min" },
    { name: "Mozaic",        color: "gold",   style: { left: "35%", top: "55%" }, label: "Mozaic · Ubud",          rating: "★ 4.8 · Fine Dining" },
    { name: "Warung Bu Mi",  color: "forest", style: { left: "28%", top: "35%" }, label: "Warung Bu Mi · Canggu",  rating: "★ 4.7 · Budget" },
    { name: "Jimbaran Bay",  color: "terra",  style: { left: "60%", top: "68%" }, label: "Jimbaran Seafood",       rating: "★ 4.6 · Beachfront" },
    { name: "Rock Bar",      color: "gold",   style: { left: "72%", top: "48%" }, label: "Rock Bar · Uluwatu",     rating: "★ 4.8 · Sunset View" },
    { name: "Naughty Nuri",  color: "forest", style: { left: "43%", top: "28%" }, label: "Naughty Nuri's",         rating: "★ 4.5 · BBQ Ribs" },
    { name: "Echo Beach",    color: "gold",   style: { left: "20%", top: "62%" }, label: "Echo Beach Club",        rating: "★ 4.4 · Surf Vibe" },
];

const FILTER_PILLS = [
    { id: "Sunset & View",     icon: "🌅", label: "Sunset View" },
    { id: "Work from Cafe",    icon: "💻", label: "Work Café" },
    { id: "Budget Friendly",   icon: "💰", label: "Budget" },
    { id: "Family Friendly",   icon: "👨‍👩‍👧", label: "Family" },
    { id: "Vibrant Nightlife", icon: "🎶", label: "Nightlife" },
    { id: "Romantic & Cozy",   icon: "🕯️", label: "Romantic" },
];

// Warna gradient per card index
const CARD_COLORS = [
    "linear-gradient(135deg, #3d1f0f, #6b3520)",
    "linear-gradient(135deg, #1a2f1a, #2d5020)",
    "linear-gradient(135deg, #1a2a35, #203a50)",
    "linear-gradient(135deg, #2a1a3a, #4a2060)",
    "linear-gradient(135deg, #35200a, #5a3815)",
];

function getCardEmoji(kategori: string): string {
    if (kategori.includes("Sunset"))    return "🌅";
    if (kategori.includes("Work"))      return "☕";
    if (kategori.includes("Nightlife")) return "🎶";
    if (kategori.includes("Family"))    return "🍽️";
    if (kategori.includes("Budget"))    return "🥘";
    if (kategori.includes("Romantic"))  return "🕯️";
    return "🌿";
}

export default function HomePage() {
    const [activeNav, setActiveNav]     = useState("explore");
    const [activePills, setActivePills] = useState<Set<string>>(new Set());
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [chatTrigger, setChatTrigger] = useState<string | null>(null);

    // Dynamic cards dari API
    const [cards, setCards]             = useState<Restaurant[]>([]);
    const [cardsLoading, setCardsLoading] = useState(true);

    // Load cards awal — top popular se-Bali
    useEffect(() => {
        loadCards();
    }, []);

    // Reload saat filter berubah
    useEffect(() => {
        loadCards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePills]);

    async function loadCards() {
        setCardsLoading(true);
        try {
            const kategori = activePills.size === 1 ? [...activePills][0] : undefined;
            const data = await getRecommendations({
                kategori,
                min_rating: 4.3,
                min_review: 200,
                top_n: 6,
                mode: "popularity",
            });
            setCards(data);
        } catch {
            // Kalau API belum jalan, cards tetap kosong (bukan error fatal)
        } finally {
            setCardsLoading(false);
        }
    }

    const togglePill = (id: string) => {
        setActivePills((prev) => {
            const next = new Set(prev);
            // Single select — kalau klik yang sama, deselect
            if (next.has(id)) { next.delete(id); return next; }
            next.clear();
            next.add(id);
            return next;
        });
    };

    const triggerSearch = () => {
        if (searchValue.trim()) {
            setChatTrigger(searchValue.trim());
            setSearchValue("");
        }
    };

    const handlePinClick  = (name: string) => setChatTrigger(`Tell me about ${name} — is it good for tonight?`);
    const handleCardClick = (r: Restaurant) =>
        setChatTrigger(`Cerita tentang ${r.Nama} di ${r.Kabupaten} — worth it? Tips apa yang perlu saya tahu?`);

    return (
        <section className="hero" id="heroSection">
            {/* Map Background */}
            <div className="map-canvas" id="mapCanvas">
                <div className="ocean"></div>
                <div className="light-blob blob-1"></div>
                <div className="light-blob blob-2"></div>
                <div className="light-blob blob-3"></div>
                {MAP_PINS.map((pin) => (
                    <div key={pin.name} className={`map-pin pin-${pin.color}`}
                        style={pin.style} onClick={() => handlePinClick(pin.name)}>
                        <div className="pin-dot"></div>
                        <div className="pin-label">
                            {pin.label}
                            <span className="pin-rating">{pin.rating}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Weather Widget */}
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
                <div className="nav-pills">
                    {["explore", "trending", "itinerary"].map((mode) => (
                        <button key={mode}
                            className={`nav-pill ${activeNav === mode ? "active" : ""}`}
                            onClick={() => setActiveNav(mode)}>
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="nav-cta" onClick={() => setProfileOpen(true)}>
                    🔮 Taste Profile
                </button>
            </nav>

            {/* Hero Content */}
            <div className="hero-content">
                <div className="eyebrow">
                    <span className="eyebrow-dot"></span>AI-Powered · 1,352 Real Restaurants
                </div>
                <h1>
                    Discover your next <em>perfect</em>{" "}
                    <span className="highlight">Bali meal</span>
                </h1>
                <p className="hero-sub">
                    Hyper-personal dining recommendations powered by local expertise,
                    real-time context & AI that actually understands your cravings.
                </p>

                {/* Filter Pills */}
                <div className="filter-bar">
                    {FILTER_PILLS.map((pill) => (
                        <div key={pill.id}
                            className={`filter-pill ${activePills.has(pill.id) ? "active" : ""}`}
                            onClick={() => togglePill(pill.id)}>
                            <span className="pill-icon">{pill.icon}</span> {pill.label}
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="search-wrap">
                    <input className="search-input" id="mainSearch"
                        placeholder="Where are you? What are you craving?"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && triggerSearch()} />
                    <button className="search-btn" onClick={triggerSearch}>✦ Find</button>
                </div>
            </div>

            <div className="bottom-grad"></div>

            {/* Floating stats */}
            <div className="stat-float stat-float-1">
                <div className="stat-num">1,352</div>
                <div className="stat-label">Curated spots</div>
            </div>
            <div className="stat-float stat-float-2">
                <div className="stat-num">9</div>
                <div className="stat-label">Regencies</div>
            </div>
            <div className="stat-float stat-float-3">
                <div className="stat-num">4.55</div>
                <div className="stat-label">Avg rating</div>
            </div>

            {/* Restaurant Cards — dynamic */}
            <div className="cards-section">
                <div className="cards-label">
                    {activePills.size > 0
                        ? `✦ ${[...activePills][0]} · Top picks`
                        : "✦ Curated for you · Right now"}
                </div>
                <div className="cards-row" id="cardsRow">
                    {cardsLoading
                        ? Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="resto-card resto-card-skeleton">
                                <div className="card-img-placeholder card-color-skeleton"></div>
                                <div className="card-body">
                                    <div className="skeleton-line" style={{ width: "70%", height: 14, marginBottom: 6 }}></div>
                                    <div className="skeleton-line" style={{ width: "50%", height: 10 }}></div>
                                </div>
                            </div>
                        ))
                        : cards.map((r, i) => {
                            const cats = parseKategori(r.Kategori);
                            const primaryCat = cats[0] ?? "General Chill";
                            const catCfg = KATEGORI_CONFIG[primaryCat] ?? KATEGORI_CONFIG["General Chill"];
                            return (
                                <div key={r.id} className="resto-card"
                                    style={{ animationDelay: `${i * 0.08}s` }}
                                    onClick={() => handleCardClick(r)}>
                                    <div className="card-img-placeholder"
                                        style={{ background: CARD_COLORS[i % CARD_COLORS.length] }}>
                                        {getCardEmoji(r.Kategori)}
                                        <div className="card-badge">{primaryCat}</div>
                                        {r.Rating >= 4.7 && (
                                            <div className="card-trend">⭐ Top Rated</div>
                                        )}
                                    </div>
                                    <div className="card-body">
                                        <div className="card-name">{r.Nama}</div>
                                        <div className="card-area">📍 {r.Kabupaten}</div>
                                        <div className="card-meta">
                                            <div className="card-rating">★ {r.Rating}</div>
                                            <div className="card-price">{formatReviews(r.Total_Review)} reviews</div>
                                        </div>
                                        <div className="card-insight">
                                            {catCfg.icon} {cats.slice(0, 2).join(" · ")}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            </div>

            <ProfileOverlay isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
            <ChatPanel initialMessage={chatTrigger} onMessageSent={() => setChatTrigger(null)} />
        </section>
    );
}
