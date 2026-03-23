"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
    role: "user" | "ai";
    content: string;
}

const SYSTEM_PROMPT = `Kamu adalah BaliBites AI — personal culinary concierge untuk Bali, Indonesia. Kamu ahli dalam kuliner Bali dan punya pengetahuan mendalam tentang restoran, warung, café, dan pengalaman makan di seluruh Bali (Ubud, Canggu, Seminyak, Jimbaran, Uluwatu, Sanur, Kuta, dll).

Gayamu: hangat, personal, seperti teman lokal yang sangat tahu Bali. Bisa campuran Bahasa Indonesia dan Inggris (bilingual). 

Kamu memberikan rekomendasi yang sangat spesifik dengan:
- Nama tempat yang konkret dan detail unik
- Alasan personal kenapa cocok untuk user
- Tips rahasia (jam terbaik, menu andalan, apa yang perlu dihindari)
- Sentimen dari ulasan nyata
- Konteks lokal yang otentik (budaya, tradisi, vibe)

Format: singkat, conversational, pakai emoji secukupnya. Jika memberikan beberapa rekomendasi, format dengan jelas tapi tetap personal. Maksimal 280 kata per respons.

Konteks saat ini: Cuaca Bali 29°C, cerah. Waktu: malam ini.`;

function getDemoReply(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes("romantic") || lower.includes("anniversary") || lower.includes("malam")) {
        return `🌅 Untuk momen romantis malam ini di **Jimbaran**, saya rekomendasikan:\n\n**1. Menega Café** — Kaki di pasir langsung, lilin di meja, seafood segar dibakar depanmu. Peak sunset jam **6:15–7pm**, pesan meja di tepi pantai sekarang.\n\n**2. Rock Bar AYANA** — 14 meter di atas laut Hindia. Cocktail + sunset = tak terlupakan. Reservation wajib, dress code berlaku.\n\n**3. Sundara at Four Seasons** — Kolam renang infinity + fine dining. Lebih eksklusif, tapi worth it untuk anniversary spesial. 💍\n\nMana yang paling sesuai budget dan vibe kalian?`;
    }
    if (lower.includes("warung") || lower.includes("murah") || lower.includes("budget")) {
        return `💚 **Hidden warung terbaik di Canggu** yang sering dilewatkan:\n\n**Warung Bu Mi** (Jl. Batu Mejan) — Nasi campur paling otentik, Rp 25–35k. Buka **jam 11 pagi, habis jam 2 siang**. Datang lebih awal!\n\n**Warung Dandelion** — Sate ayam homemade + es kelapa muda. Lokal banget, jauh dari turis. Rp 20–40k.\n\nTips: Google Maps reviews sering mention "sambal-nya nagih" — percayalah. 🌶️`;
    }
    if (lower.includes("café") || lower.includes("kopi") || lower.includes("tenang")) {
        return `☕ **Café tersembunyi di Ubud** yang tenang dan estetik:\n\n**Seniman Coffee** (Jl. Sriwedari) — Single origin Bali, suasana art gallery, WiFi kencang. Perfect buat kerja atau baca buku.\n\n**Yellow Flower Café** — Tersembunyi di balik sawah, hanya 6 meja. Sunrise view dari jam 7am. Bring a journal. 🌾\n\n**Tukies Coconut Shop** — Semua menu berbahan kelapa lokal. Unik + instagrammable.\n\nMau yang lebih ke mana — Ubud, Canggu, atau Seminyak?`;
    }
    return `🌺 Saya bantu temukan tempat makan terbaik untuk kamu! Bisa cerita lebih detail:\n\n— **Di area mana** di Bali sekarang?\n— **Makan apa** yang kamu inginkan?  \n— **Suasana** seperti apa — santai, romantis, ramai, atau tenang?\n\nSemakin spesifik, semakin tepat rekomendasi saya! 🎯`;
}

function formatMessage(text: string): string {
    return text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n\n/g, "<br><br>")
        .replace(/\n/g, "<br>");
}

interface ChatPanelProps {
    onOpen?: () => void;
    initialMessage?: string | null;
    onMessageSent?: () => void;
}

export default function ChatPanel({ onOpen, initialMessage, onMessageSent }: ChatPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "ai",
            content:
                "Selamat datang! 🌺 I'm your personal Bali food guide. I know every hidden warung and sunset spot on this island.\n\nTell me what you're craving — I'll find something **perfect** for tonight.",
        },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [showQuickPrompts, setShowQuickPrompts] = useState(true);
    const [showNotif, setShowNotif] = useState(true);
    const [conversationHistory, setConversationHistory] = useState<{ role: string; content: string }[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (initialMessage) {
            openChat();
            setTimeout(() => sendMessage(initialMessage), 400);
            onMessageSent?.();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMessage]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 50);
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const openChat = () => {
        setIsOpen(true);
        setShowNotif(false);
        onOpen?.();
        setTimeout(() => inputRef.current?.focus(), 300);
    };

    const closeChat = () => setIsOpen(false);

    const toggleChat = () => (isOpen ? closeChat() : openChat());

    const sendMessage = async (text?: string) => {
        const messageText = text ?? input.trim();
        if (!messageText) return;

        setInput("");
        setShowQuickPrompts(false);

        const userMsg: Message = { role: "user", content: messageText };
        setMessages((prev) => [...prev, userMsg]);

        const newHistory = [...conversationHistory, { role: "user", content: messageText }];
        setConversationHistory(newHistory);
        setIsTyping(true);

        try {
            const response = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    system: SYSTEM_PROMPT,
                    messages: newHistory,
                }),
            });

            setIsTyping(false);

            if (response.ok) {
                const data = await response.json();
                const reply = data.content.map((b: { text?: string }) => b.text || "").join("");
                setConversationHistory((prev) => [...prev, { role: "assistant", content: reply }]);
                setMessages((prev) => [...prev, { role: "ai", content: reply }]);
            } else {
                const fallback = getDemoReply(messageText);
                setConversationHistory((prev) => [...prev, { role: "assistant", content: fallback }]);
                setMessages((prev) => [...prev, { role: "ai", content: fallback }]);
            }
        } catch {
            setIsTyping(false);
            const fallback = getDemoReply(messageText);
            setConversationHistory((prev) => [...prev, { role: "assistant", content: fallback }]);
            setMessages((prev) => [...prev, { role: "ai", content: fallback }]);
        }
    };

    const sendQuick = (text: string) => {
        openChat();
        setTimeout(() => sendMessage(text), 100);
    };

    return (
        <div className="chat-bubble" id="chatBubble">
            {isOpen && (
                <div className="chat-panel open">
                    {/* Header */}
                    <div className="chat-header">
                        <div className="chat-avatar">🤖</div>
                        <div className="chat-header-info">
                            <h3>BaliBites AI</h3>
                            <div className="chat-status">
                                <span className="status-dot"></span>
                                Ready to find your perfect meal
                            </div>
                        </div>
                        <button className="chat-close" onClick={closeChat}>
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="chat-messages" id="chatMessages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`msg msg-${msg.role}`}>
                                <div className="msg-avatar">{msg.role === "ai" ? "🌿" : "👤"}</div>
                                <div
                                    className="msg-bubble"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                                />
                            </div>
                        ))}
                        {isTyping && (
                            <div className="msg msg-ai typing-indicator">
                                <div className="msg-avatar">🌿</div>
                                <div className="typing-dots">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Prompts */}
                    {showQuickPrompts && (
                        <div className="quick-prompts" id="quickPrompts">
                            <div className="qp" onClick={() => sendQuick("Romantic dinner di Jimbaran malam ini")}>
                                🕯️ Romantic dinner
                            </div>
                            <div className="qp" onClick={() => sendQuick("Warung murah enak di Canggu")}>
                                💰 Budget warung
                            </div>
                            <div className="qp" onClick={() => sendQuick("Hidden gem café di Ubud yang tenang")}>
                                ☕ Hidden café
                            </div>
                            <div className="qp" onClick={() => sendQuick("Makanan Bali otentik yang wajib dicoba")}>
                                🍃 Must-try local
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div className="chat-input-area">
                        <input
                            ref={inputRef}
                            className="chat-input"
                            id="chatInput"
                            placeholder="Tanya apa saja tentang kuliner Bali..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                        />
                        <button className="chat-send" onClick={() => sendMessage()}>
                            ➤
                        </button>
                    </div>
                </div>
            )}

            <button className="chat-toggle" onClick={toggleChat} title="Open BaliBites AI Chat">
                🍜
                {showNotif && (
                    <div className="chat-notif" id="chatNotif">
                        1
                    </div>
                )}
            </button>
        </div>
    );
}
