"use client";

import { useEffect, useRef, useState } from "react";

interface SplashScreenProps {
    onDone: () => void;
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
    const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

    // Stable ref agar useEffect tidak re-run jika parent re-render
    const onDoneRef = useRef(onDone);
    useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("hold"), 400);
        const t2 = setTimeout(() => setPhase("out"),  2400);
        const t3 = setTimeout(() => onDoneRef.current(), 3000);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
        };
    // Intentionally empty — run once on mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div
            aria-live="polite"
            aria-label="Loading BaliBites"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "#0a0704",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                transition: "opacity 0.6s ease",
                opacity: phase === "out" ? 0 : 1,
                pointerEvents: phase === "out" ? "none" : "all",
            }}
        >
            {/* Ambient glow */}
            <div style={{
                position: "absolute",
                width: 400,
                height: 400,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(196,96,58,0.15) 0%, transparent 70%)",
                animation: "splashPulse 2s ease infinite",
            }} />

            {/* Logo + text */}
            <div style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                animation: phase === "in" ? "splashIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
            }}>
                {/* Logo mark */}
                <div style={{
                    width: 72,
                    height: 72,
                    borderRadius: 20,
                    background: "linear-gradient(135deg, #c4603a, #c9972b)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 36,
                    boxShadow: "0 0 60px rgba(196,96,58,0.5), 0 8px 32px rgba(0,0,0,0.6)",
                }}>
                    🌿
                </div>

                {/* Wordmark */}
                <div style={{ textAlign: "center" }}>
                    <div style={{
                        fontFamily: "Cormorant Garamond, serif",
                        fontSize: 36,
                        fontWeight: 600,
                        color: "#faf6ef",
                        letterSpacing: "0.5px",
                        lineHeight: 1,
                    }}>
                        Bali<span style={{ color: "#c9972b" }}>Bites</span>
                        <span style={{ color: "rgba(250,246,239,0.4)", fontSize: 24 }}> AI</span>
                    </div>
                    <div style={{
                        fontSize: 11,
                        color: "rgba(250,246,239,0.35)",
                        letterSpacing: "3px",
                        textTransform: "uppercase",
                        marginTop: 6,
                        fontFamily: "DM Sans, sans-serif",
                        animation: "splashFadeIn 0.4s 0.6s ease both",
                    }}>
                        Your Culinary Concierge
                    </div>
                </div>

                {/* Loading dots */}
                <div style={{
                    display: "flex",
                    gap: 6,
                    marginTop: 8,
                    animation: "splashFadeIn 0.4s 0.8s ease both",
                }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#c9972b",
                            animation: `splashDot 1.2s ${i * 0.2}s ease infinite`,
                        }} />
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes splashIn {
                    from { opacity:0; transform:scale(0.7) translateY(20px); }
                    to   { opacity:1; transform:scale(1) translateY(0); }
                }
                @keyframes splashFadeIn {
                    from { opacity:0; transform:translateY(8px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes splashPulse {
                    0%,100% { transform:scale(1); opacity:0.6; }
                    50%     { transform:scale(1.15); opacity:1; }
                }
                @keyframes splashDot {
                    0%,80%,100% { transform:scale(0.6); opacity:0.3; }
                    40%         { transform:scale(1.2); opacity:1; }
                }
            `}</style>
        </div>
    );
}
