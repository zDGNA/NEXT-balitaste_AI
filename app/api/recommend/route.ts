// app/api/recommend/route.ts
// Proxy ke FastAPI POST /recommend (semantic search)
// Dipakai jika butuh rekomendasi semantik langsung (bukan via /chat)

import { NextRequest, NextResponse } from "next/server";

const API_URL = (
    process.env.BALIBITES_API_URL ??
    process.env.FASTAPI_URL ??
    "http://localhost:8000"
).replace(/\/$/, "");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // FastAPI POST /recommend schema:
        // { query, lokasi?, top_n?, w_semantic?, w_rating?, w_review? }
        const payload = {
            query:      body.query ?? body.message ?? "",
            lokasi:     body.lokasi     ?? "",
            top_n:      body.top_n      ?? 8,
            w_semantic: body.w_semantic ?? 0.60,
            w_rating:   body.w_rating   ?? 0.25,
            w_review:   body.w_review   ?? 0.15,
        };

        if (!payload.query.trim()) {
            return NextResponse.json({ error: "Field 'query' wajib diisi." }, { status: 400 });
        }

        const res = await fetch(`${API_URL}/recommend`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload),
            signal:  AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error(`[/api/recommend] FastAPI ${res.status}:`, err);
            return NextResponse.json({ error: `Backend error: ${res.status}` }, { status: res.status });
        }

        return NextResponse.json(await res.json());

    } catch (e: unknown) {
        const isTimeout = e instanceof Error && e.name === "TimeoutError";
        console.error("[/api/recommend] Error:", e);
        return NextResponse.json(
            { error: isTimeout ? "Timeout." : "Service unavailable" },
            { status: 503 }
        );
    }
}

// GET /api/recommend?query=...&lokasi=...&top_n=...
// Alternatif GET untuk dipakai dari URL langsung
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const query  = searchParams.get("query") ?? "";
    const lokasi = searchParams.get("lokasi") ?? "";
    const top_n  = parseInt(searchParams.get("top_n") ?? "8");

    if (!query.trim()) {
        return NextResponse.json({ error: "Parameter 'query' wajib diisi." }, { status: 400 });
    }

    try {
        const res = await fetch(`${API_URL}/recommend`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ query, lokasi, top_n }),
            signal:  AbortSignal.timeout(30_000),
        });

        if (!res.ok) throw new Error(`FastAPI ${res.status}`);
        return NextResponse.json(await res.json());

    } catch (e) {
        console.error("[/api/recommend GET] Error:", e);
        return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }
}
