// hooks/useChat.ts
// Custom hook untuk state management chatbot BaliBites
// ---------------------------------------------------

import { useState, useCallback } from "react";

export type Restaurant = {
  rank:          number;
  nama:          string;
  kabupaten:     string;
  kategori:      string;
  rating:        number;
  total_review:  number;
  price_range:   string;
  best_time:     string;
  top_menu:      string;
  promo:         string;
  highlights:    string;
  gmaps:         string;
  gofood:        string;
  grabfood:      string;
  tiktok:        string;
  yt:            string;
  reels:         string;
  lat:           number | null;
  lng:           number | null;
  score_final:   number;
  score_semantic:number;
};

export type Message = {
  id:        string;
  role:      "user" | "bot";
  text:      string;
  intent?:   "REKOMENDASI" | "DETAIL";
  results?:  Restaurant[];
  restaurant?: Record<string, unknown>;
  loading?:  boolean;
};

export function useBaliBitesChat(lokasi = "") {
  const [messages, setMessages] = useState<Message[]>([
    {
      id:   "welcome",
      role: "bot",
      text: "Halo! Saya BaliBites 🌴 Mau cari kuliner Bali apa hari ini?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return;

      const userMsg: Message = {
        id:   Date.now().toString(),
        role: "user",
        text: userText,
      };

      const loadingMsg: Message = {
        id:      "loading",
        role:    "bot",
        text:    "Sedang mencari rekomendasi terbaik...",
        loading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsLoading(true);

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ message: userText, lokasi }),
        });

        const data = await res.json();

        const botMsg: Message = {
          id:          Date.now().toString() + "_bot",
          role:        "bot",
          intent:      data.intent,
          results:     data.results,
          restaurant:  data.restaurant,
          text:
            data.intent === "DETAIL"
              ? `Ini detail untuk **${data.restaurant?.nama}** 📍`
              : `Saya temukan ${data.results?.length ?? 0} rekomendasi untuk "${userText}" 🍽️`,
        };

        setMessages((prev) =>
          prev.filter((m) => m.id !== "loading").concat(botMsg)
        );
      } catch {
        setMessages((prev) =>
          prev
            .filter((m) => m.id !== "loading")
            .concat({
              id:   Date.now().toString() + "_err",
              role: "bot",
              text: "Maaf, terjadi kesalahan. Coba lagi ya 🙏",
            })
        );
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, lokasi]
  );

  return { messages, sendMessage, isLoading };
}
