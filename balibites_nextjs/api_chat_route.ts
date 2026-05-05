// app/api/chat/route.ts
// Proxy ke FastAPI /chat endpoint
// Env: BALIBITES_API_URL di .env.local / Railway Variables

import { NextRequest, NextResponse } from "next/server";

const API_URL = (
    process.env.BALIBITES_API_URL ??
    process.env.FASTAPI_URL ??
    "http://localhost:8000"
).replace(/\/$/, "");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // FastAPI /chat schema: { message: string, lokasi?: string }
        const payload = {
            message: body.message ?? body.query ?? "",
            lokasi:  body.lokasi  ?? "",
        };

        if (!payload.message.trim()) {
            return NextResponse.json(
                { error: "Field 'message' wajib diisi." },
                { status: 400 }
            );
        }

        const res = await fetch(`${API_URL}/chat`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload),
            signal:  AbortSignal.timeout(30_000), // 30 detik — BERT encode butuh waktu
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[/api/chat] FastAPI ${res.status}:`, err);
            return NextResponse.json(
                { error: `Backend error: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (e: unknown) {
        const isTimeout = e instanceof Error && e.name === "TimeoutError";
        console.error("[/api/chat] Error:", e);
        return NextResponse.json(
            { error: isTimeout ? "Request timeout. Coba lagi." : "Gagal menghubungi server." },
            { status: 503 }
        );
    }
}
