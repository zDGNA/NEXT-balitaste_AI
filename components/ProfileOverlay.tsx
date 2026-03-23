"use client";

import { useEffect, useRef } from "react";

interface ProfileOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

const vectors = [
    { label: "Local Authenticity", value: 82, className: "v-local" },
    { label: "Budget-Conscious", value: 65, className: "v-budget" },
    { label: "Ambience Seeker", value: 74, className: "v-ambience" },
    { label: "Spice Tolerance", value: 55, className: "v-spicy" },
];

const tasteTags = ["🍃 Warung lover", "🌙 Late dinner", "☕ Slow café", "🌊 Coastal views", "🌶️ Mild–medium"];

export default function ProfileOverlay({ isOpen, onClose }: ProfileOverlayProps) {
    const barsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                barsRef.current.forEach((bar) => {
                    if (bar) {
                        const w = bar.style.width;
                        bar.style.width = "0";
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                bar.style.width = w;
                            });
                        });
                    }
                });
            }, 50);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="profile-overlay" id="profileOverlay">
            <div className="profile-header">
                <div>
                    <div className="profile-title">
                        Your <span>Culinary</span> DNA
                    </div>
                    <div className="profile-vector">invisible taste vector · learning…</div>
                </div>
                <button className="chat-close" onClick={onClose}>
                    ×
                </button>
            </div>

            {vectors.map((v, i) => (
                <div className="vector-bar" key={v.label}>
                    <div className="vector-label">
                        <span>{v.label}</span>
                        <span>{v.value}%</span>
                    </div>
                    <div className="vector-track">
                        <div
                            ref={(el) => { barsRef.current[i] = el; }}
                            className={`vector-fill ${v.className}`}
                            style={{ width: `${v.value}%` }}
                        />
                    </div>
                </div>
            ))}

            <div className="taste-tags">
                {tasteTags.map((tag) => (
                    <div className="taste-tag" key={tag}>
                        {tag}
                    </div>
                ))}
            </div>
        </div>
    );
}
