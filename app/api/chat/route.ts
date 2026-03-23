import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, systemPrompt } = body;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY!,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 600,
                system: systemPrompt,
                messages,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error("Anthropic error:", err);
            return NextResponse.json({ error: "AI unavailable" }, { status: 502 });
        }

        const data = await response.json();
        const reply = data.content
            ?.map((b: { text?: string }) => b.text || "")
            .join("") ?? "";

        return NextResponse.json({ reply });
    } catch (err) {
        console.error("Chat route error:", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
