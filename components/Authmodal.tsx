"use client";

import { useState } from "react";

export interface AuthUser {
    name: string;
    email: string;
    location?: GeolocationCoordinates;
}

interface AuthModalProps {
    onAuth: (user: AuthUser) => void;
}

type LocStatus = "idle" | "asking" | "granted" | "denied";

export default function AuthModal({ onAuth }: AuthModalProps) {
    const [mode, setMode]         = useState<"login" | "register">("login");
    const [name, setName]         = useState("");
    const [email, setEmail]       = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading]   = useState(false);
    const [locStatus, setLocStatus] = useState<LocStatus>("idle");
    const [locCoords, setLocCoords] = useState<GeolocationCoordinates | null>(null);
    const [error, setError]       = useState("");

    const requestLocation = () => {
        if (!navigator.geolocation) {
            setLocStatus("denied");
            return;
        }
        setLocStatus("asking");
        navigator.geolocation.getCurrentPosition(
            (pos) => { setLocCoords(pos.coords); setLocStatus("granted"); },
            ()    => { setLocStatus("denied"); },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const handleSubmit = async () => {
        setError("");

        // Validasi
        if (!email.trim() || !password.trim()) {
            setError("Email dan password wajib diisi.");
            return;
        }
        if (mode === "register" && !name.trim()) {
            setError("Nama wajib diisi.");
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError("Format email tidak valid.");
            return;
        }

        setLoading(true);

        // TODO: Ganti dengan NextAuth / Supabase auth yang sesungguhnya
        await new Promise<void>(r => setTimeout(r, 900));

        onAuth({
            name:     name.trim() || email.split("@")[0],
            email:    email.trim().toLowerCase(),
            location: locCoords ?? undefined,
        });

        setLoading(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !loading) handleSubmit();
    };

    const switchMode = (m: "login" | "register") => {
        setMode(m);
        setError("");
    };

    const locIcon = locStatus === "granted" ? "✅" : locStatus === "denied" ? "❌" : "📍";
    const locTitle =
        locStatus === "granted" ? "Lokasi diizinkan" :
        locStatus === "denied"  ? "Lokasi ditolak"   :
        "Izinkan akses lokasi";
    const locSub =
        locStatus === "granted"
            ? "Rekomendasi akan disesuaikan dengan lokasimu"
            : "Untuk rekomendasi restoran terdekat";

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: "fixed",
                inset: 0,
                zIndex: 8000,
                backdropFilter: "blur(12px) brightness(0.4)",
                background: "rgba(255, 255, 255, 0.3)",
            }} />

            {/* Modal container */}
            <div style={{
                position: "fixed",
                inset: 0,
                zIndex: 8001,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 20,
            }}>
                <div style={{
                    background: "rgba(18,12,8,0.98)",
                    border: "1px solid rgba(250,246,239,0.1)",
                    borderRadius: 20,
                    padding: "32px 28px",
                    width: "100%",
                    maxWidth: 380,
                    backdropFilter: "blur(40px)",
                    boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,151,43,0.08)",
                    animation: "authIn 0.4s cubic-bezier(0.34,1.3,0.64,1) both",
                }}>
                    {/* Logo */}
                    <div style={{ textAlign: "center", marginBottom: 24 }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: 12,
                            background: "linear-gradient(135deg,#c4603a,#c9972b)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 22, margin: "0 auto 10px",
                            boxShadow: "0 4px 20px rgba(196,96,58,0.4)",
                        }}>
                            🌿
                        </div>
                        <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 20, fontWeight: 600, color: "#faf6ef" }}>
                            Bali<span style={{ color: "#c9972b" }}>Bites</span> AI
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(250,246,239,0.35)", marginTop: 3 }}>
                            {mode === "login" ? "Selamat datang kembali" : "Buat akun gratis"}
                        </div>
                    </div>

                    {/* Mode tabs */}
                    <div style={{
                        display: "flex",
                        background: "rgba(250,246,239,0.05)",
                        borderRadius: 10,
                        padding: 3,
                        marginBottom: 20,
                    }}>
                        {(["login", "register"] as const).map(m => (
                            <button key={m} onClick={() => switchMode(m)} style={{
                                flex: 1, padding: "7px 0", borderRadius: 8, border: "none",
                                background: mode === m ? "rgba(196,96,58,0.25)" : "transparent",
                                color: mode === m ? "#faf6ef" : "rgba(250,246,239,0.4)",
                                fontSize: 12, fontWeight: 500, cursor: "pointer",
                                fontFamily: "DM Sans, sans-serif",
                                transition: "all .2s",
                                borderBottom: mode === m ? "1px solid rgba(196,96,58,0.5)" : "1px solid transparent",
                            }}>
                                {m === "login" ? "Masuk" : "Daftar"}
                            </button>
                        ))}
                    </div>

                    {/* Fields */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {mode === "register" && (
                            <input
                                placeholder="Nama lengkap"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={handleKeyDown}
                                autoComplete="name"
                                style={inputStyle}
                            />
                        )}
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete="email"
                            style={inputStyle}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoComplete={mode === "login" ? "current-password" : "new-password"}
                            style={inputStyle}
                        />
                    </div>

                    {/* Error message */}
                    {error && (
                        <div style={{
                            marginTop: 8, fontSize: 11, color: "#f87171",
                            background: "rgba(248,113,113,0.1)", borderRadius: 6,
                            padding: "6px 10px",
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Location permission */}
                    <div style={{
                        marginTop: 14,
                        background: "rgba(201,151,43,0.07)",
                        border: "1px solid rgba(201,151,43,0.18)",
                        borderRadius: 10, padding: "10px 12px",
                        display: "flex", alignItems: "center", gap: 10,
                    }}>
                        <span style={{ fontSize: 18 }}>{locIcon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, color: "#e8c46a", marginBottom: 2 }}>
                                {locTitle}
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(250,246,239,0.35)" }}>
                                {locSub}
                            </div>
                        </div>
                        {locStatus === "idle" && (
                            <button onClick={requestLocation} style={{
                                padding: "5px 12px", borderRadius: 100,
                                background: "rgba(201,151,43,0.2)",
                                border: "1px solid rgba(201,151,43,0.35)",
                                color: "#e8c46a", fontSize: 11, cursor: "pointer",
                                fontFamily: "DM Sans, sans-serif", whiteSpace: "nowrap",
                            }}>
                                Izinkan
                            </button>
                        )}
                        {locStatus === "asking" && (
                            <div style={{ fontSize: 10, color: "rgba(250,246,239,0.4)" }}>Meminta...</div>
                        )}
                    </div>

                    {/* Submit button */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        style={{
                            width: "100%", marginTop: 16,
                            padding: "12px 0", borderRadius: 12, border: "none",
                            background: loading ? "rgba(196,96,58,0.4)" : "linear-gradient(135deg,#c4603a,#c9972b)",
                            color: "#faf6ef", fontSize: 14, fontWeight: 500,
                            cursor: loading ? "not-allowed" : "pointer",
                            fontFamily: "DM Sans, sans-serif",
                            boxShadow: loading ? "none" : "0 4px 20px rgba(196,96,58,0.4)",
                            transition: "all .2s",
                            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        }}
                    >
                        {loading ? (
                            <>
                                <div style={{
                                    width: 14, height: 14, borderRadius: "50%",
                                    border: "2px solid rgba(255,255,255,0.3)",
                                    borderTopColor: "#fff",
                                    animation: "spin 0.7s linear infinite",
                                }} />
                                {mode === "login" ? "Masuk..." : "Mendaftar..."}
                            </>
                        ) : (
                            mode === "login" ? "✦ Masuk" : "✦ Buat Akun"
                        )}
                    </button>

                    {/* Guest skip */}
                    <button
                        onClick={() => onAuth({ name: "Guest", email: "guest@balibites.ai" })}
                        style={{
                            width: "100%", marginTop: 10, padding: "8px 0",
                            background: "none", border: "none",
                            color: "rgba(250,246,239,0.3)", fontSize: 11,
                            cursor: "pointer", fontFamily: "DM Sans, sans-serif",
                            transition: "color .2s",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(250,246,239,0.6)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(250,246,239,0.3)")}
                    >
                        Lanjut sebagai tamu
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes authIn {
                    from { opacity:0; transform:scale(0.92) translateY(24px); }
                    to   { opacity:1; transform:scale(1) translateY(0); }
                }
                @keyframes spin {
                    to { transform:rotate(360deg); }
                }
            `}</style>
        </>
    );
}

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "rgba(250,246,239,0.05)",
    border: "1px solid rgba(250,246,239,0.1)",
    borderRadius: 10,
    fontSize: 13,
    color: "#faf6ef",
    fontFamily: "DM Sans, sans-serif",
    outline: "none",
    transition: "border-color .2s",
    boxSizing: "border-box",
};