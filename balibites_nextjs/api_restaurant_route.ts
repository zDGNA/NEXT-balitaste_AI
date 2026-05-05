// app/api/restaurant/route.ts
// Proxy ke FastAPI GET /restaurant
// Dipakai oleh: BaliMap (load marker), ChatPanel (parseIntent)
// Env: BALIBITES_API_URL di .env.local / Railway Variables

import { NextRequest, NextResponse } from "next/server";

const API_URL = (
    process.env.BALIBITES_API_URL ??
    process.env.FASTAPI_URL ??
    "http://localhost:8000"
).replace(/\/$/, "");

// Parameter yang diterima FastAPI GET /restaurant:
// min_rating, min_review, top_n, kabupaten, kategori

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const params = new URLSearchParams();

    // Forward semua parameter yang relevan ke FastAPI
    const allowed = ["min_rating", "min_review", "top_n", "kabupaten", "kategori"];
    for (const key of allowed) {
        const val = searchParams.get(key);
        if (val) params.set(key, val);
    }

    try {
        const res = await fetch(`${API_URL}/restaurant?${params}`, {
            // Cache 5 menit — data restoran jarang berubah
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(15_000),
        });

        if (!res.ok) {
            console.error(`[/api/restaurant] FastAPI ${res.status}`);
            return NextResponse.json(
                { error: `Backend error: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (e: unknown) {
        const isTimeout = e instanceof Error && e.name === "TimeoutError";
        console.error("[/api/restaurant] Error:", e);
        return NextResponse.json(
            { error: isTimeout ? "Timeout." : "Service unavailable" },
            { status: 503 }
        );
    }
}
