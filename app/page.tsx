"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import ProfileOverlay from "@/components/ProfileOverlay";

const MAP_PINS = [
    { name: "Locavore", color: "terra", style: { left: "52%", top: "42%" }, label: "Locavore · Ubud", rating: "★ 4.9 · 12 min" },
    { name: "Mozaic", color: "gold", style: { left: "35%", top: "55%" }, label: "Mozaic · Ubud", rating: "★ 4.8 · Fine Dining" },
    { name: "Warung Bu Mi", color: "forest", style: { left: "28%", top: "35%" }, label: "Warung Bu Mi · Canggu", rating: "★ 4.7 · Budget" },
    { name: "Jimbaran Bay", color: "terra", style: { left: "60%", top: "68%" }, label: "Jimbaran Seafood", rating: "★ 4.6 · Beachfront" },
    { name: "Rock Bar", color: "gold", style: { left: "72%", top: "48%" }, label: "Rock Bar · Uluwatu", rating: "★ 4.8 · Sunset View" },
    { name: "Naughty Nuri", color: "forest", style: { left: "43%", top: "28%" }, label: "Naughty Nuri's", rating: "★ 4.5 · BBQ Ribs" },
    { name: "Echo Beach", color: "gold", style: { left: "20%", top: "62%" }, label: "Echo Beach Club", rating: "★ 4.4 · Surf Vibe" },
];

const RESTAURANT_CARDS = [
    { name: "Locavore", area: "Ubud · 12 min away", rating: "★★★★★ 4.9", price: "Rp 350–500k", insight: "Best time 7–8pm. Book 3 days ahead.", colorClass: "card-color-1", emoji: "🍽️", badge: "Fine Dining", trend: "🔥 Trending" },
    { name: "Warung Bu Mi", area: "Canggu · 5 min away", rating: "★★★★½ 4.7", price: "Rp 25–60k", insight: "Authentic nasi campur. Opens 11am, sells out by 2pm.", colorClass: "card-color-2", emoji: "🥘", badge: "Local Warung", trend: null },
    { name: "Jimbaran Seafood", area: "Jimbaran Bay · 18 min", rating: "★★★★½ 4.6", price: "Rp 150–300k", insight: "Feet in the sand dining. Peak sunset 6:30pm.", colorClass: "card-color-4", emoji: "🦞", badge: "Beachside", trend: "🌅 Sunset" },
    { name: "Mozaic", area: "Ubud · 15 min away", rating: "★★★★★ 4.8", price: "Rp 600k+", insight: "Award-winning. Jungle ambience. Dress smart casual.", colorClass: "card-color-3", emoji: "🌺", badge: "Garden Dining", trend: null },
    { name: "Naughty Nuri's", area: "Ubud · 14 min away", rating: "★★★★½ 4.5", price: "Rp 80–180k", insight: "Legendary BBQ ribs. Martinis a must. Lively crowd.", colorClass: "card-color-5", emoji: "🍖", badge: "BBQ · Iconic", trend: "📸 Instagram" },
];

const FILTER_PILLS = [
    { id: "halal", icon: "🕌", label: "Halal", defaultActive: false },
    { id: "local", icon: "🍃", label: "Local Warung", defaultActive: true },
    { id: "beach", icon: "🏖️", label: "Beachside", defaultActive: false },
    { id: "vegan", icon: "🌱", label: "Vegan", defaultActive: false },
    { id: "fine", icon: "✨", label: "Fine Dining", defaultActive: false },
    { id: "budget", icon: "💰", label: "Budget", defaultActive: false },
];

export default function HomePage() {
    const [activeNav, setActiveNav] = useState("explore");
    const [activePills, setActivePills] = useState<Set<string>>(new Set(["local"]));
    const [profileOpen, setProfileOpen] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [chatTrigger, setChatTrigger] = useState<string | null>(null);

    const togglePill = (id: string) => {
        setActivePills((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSearch = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") triggerSearch();
    };

    const triggerSearch = () => {
        if (searchValue.trim()) {
            setChatTrigger(searchValue.trim());
            setSearchValue("");
        }
    };

    const handlePinClick = (name: string) => {
        setChatTrigger(`Tell me about ${name} — is it good for tonight?`);
    };

    const handleCardClick = (name: string) => {
        setChatTrigger(`More details about ${name} — what makes it special?`);
    };

    return (
        <section className="hero" id="heroSection">
            {/* Map Background */}
            <div className="map-canvas" id="mapCanvas">
                <div className="ocean"></div>
                <div className="light-blob blob-1"></div>
                <div className="light-blob blob-2"></div>
                <div className="light-blob blob-3"></div>

                {/* Map Pins */}
                {MAP_PINS.map((pin) => (
                    <div
                        key={pin.name}
                        className={`map-pin pin-${pin.color}`}
                        style={pin.style}
                        onClick={() => handlePinClick(pin.name)}
                    >
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

            {/* Navigation */}
            <nav>
                <div className="logo">
                    <div className="logo-mark">🌿</div>
                    <div className="logo-text">
                        Bali<span>Bites</span> AI
                    </div>
                </div>
                <div className="nav-pills">
                    {["explore", "trending", "itinerary"].map((mode) => (
                        <button
                            key={mode}
                            className={`nav-pill ${activeNav === mode ? "active" : ""}`}
                            onClick={() => setActiveNav(mode)}
                        >
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
                    <span className="eyebrow-dot"></span>AI-Powered · Bali-Focused
                </div>
                <h1>
                    Discover your next <em>perfect</em> <span className="highlight">Bali meal</span>
                </h1>
                <p className="hero-sub">
                    Hyper-personal dining recommendations powered by local expertise, real-time context & AI that actually understands your cravings.
                </p>

                {/* Filter Pills */}
                <div className="filter-bar">
                    {FILTER_PILLS.map((pill) => (
                        <div
                            key={pill.id}
                            className={`filter-pill ${activePills.has(pill.id) ? "active" : ""}`}
                            onClick={() => togglePill(pill.id)}
                        >
                            <span className="pill-icon">{pill.icon}</span> {pill.label}
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="search-wrap">
                    <input
                        className="search-input"
                        id="mainSearch"
                        placeholder="Where are you? What are you craving?"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={handleSearch}
                    />
                    <button className="search-btn" onClick={triggerSearch}>
                        ✦ Find
                    </button>
                </div>
            </div>

            {/* Bottom gradient */}
            <div className="bottom-grad"></div>

            {/* Floating stats */}
            <div className="stat-float stat-float-1">
                <div className="stat-num">1,200+</div>
                <div className="stat-label">Curated spots</div>
            </div>
            <div className="stat-float stat-float-2">
                <div className="stat-num">47k</div>
                <div className="stat-label">AI Recommendations</div>
            </div>
            <div className="stat-float stat-float-3">
                <div className="stat-num">98%</div>
                <div className="stat-label">Match accuracy</div>
            </div>

            {/* Restaurant Cards */}
            <div className="cards-section">
                <div className="cards-label">✦ Curated for you · Right now</div>
                <div className="cards-row" id="cardsRow">
                    {RESTAURANT_CARDS.map((card) => (
                        <div key={card.name} className="resto-card" onClick={() => handleCardClick(card.name)}>
                            <div className={`card-img-placeholder ${card.colorClass}`}>
                                {card.emoji}
                                <div className="card-badge">{card.badge}</div>
                                {card.trend && <div className="card-trend">{card.trend}</div>}
                            </div>
                            <div className="card-body">
                                <div className="card-name">{card.name}</div>
                                <div className="card-area">📍 {card.area}</div>
                                <div className="card-meta">
                                    <div className="card-rating">{card.rating}</div>
                                    <div className="card-price">{card.price}</div>
                                </div>
                                <div className="card-insight">💡 &ldquo;{card.insight}&rdquo;</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Profile Overlay */}
            <ProfileOverlay isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

            {/* Chat Panel */}
            <ChatPanel initialMessage={chatTrigger} onMessageSent={() => setChatTrigger(null)} />
        </section>
    );
}
