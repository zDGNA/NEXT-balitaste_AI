import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash"; 
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
    try {
        // 1. Validasi API KEY di awal agar tidak 502 tanpa alasan jelas
        if (!GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY di .env.local atau Vercel Settings");
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        const { messages, systemPrompt } = await req.json();

        // 2. Bersihkan dan format messages untuk Gemini
        // Menghapus 'system' dari array messages karena sudah masuk ke systemInstruction
        const contents = messages
            .filter((m: any) => m.role !== "system")
            .map((m: { role: string; content: string }) => ({
                role: m.role === "assistant" || m.role === "model" ? "model" : "user",
                parts: [{ text: m.content }],
            }));

        const body = {
            systemInstruction: {
                parts: [{ text: systemPrompt || "Kamu adalah asisten kuliner Bali yang ramah." }],
            },
            contents,
            generationConfig: {
                maxOutputTokens: 3000,
                temperature:     0.7,
                topP:             0.95,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT",     threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
        };

        // 3. Eksekusi fetch ke Google
        const response = await fetch(GEMINI_URL, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(body),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Gemini API error:", err);
            return NextResponse.json({ error: "AI sedang sibuk", detail: err }, { status: 502 });
        }

        const data = await response.json();

        // 4. Ambil teks jawaban
        const reply: string =
            data?.candidates?.[0]?.content?.parts
                ?.map((p: { text?: string }) => p.text ?? "")
                .join("") ?? "Maaf, saya tidak bisa menjawab itu saat ini.";

        return NextResponse.json({ reply });

    } catch (err: any) {
        console.error("Chat route crash:", err);
        return NextResponse.json({ error: "Server error", detail: err.message }, { status: 500 });
    }
}