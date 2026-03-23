import { NextRequest, NextResponse } from "next/server";

// URL FastAPI Python backend
// Ganti dengan URL deployment (Railway, Render, dll) saat production
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const params = new URLSearchParams();
    if (searchParams.get("nama"))       params.set("nama",       searchParams.get("nama")!);
    if (searchParams.get("kabupaten"))  params.set("kabupaten",  searchParams.get("kabupaten")!);
    if (searchParams.get("kategori"))   params.set("kategori",   searchParams.get("kategori")!);
    if (searchParams.get("min_rating")) params.set("min_rating", searchParams.get("min_rating")!);
    if (searchParams.get("min_review")) params.set("min_review", searchParams.get("min_review")!);
    if (searchParams.get("top_n"))      params.set("top_n",      searchParams.get("top_n")!);
    if (searchParams.get("mode"))       params.set("mode",       searchParams.get("mode")!);

    try {
        const res = await fetch(`${FASTAPI_URL}/recommend?${params}`, {
            next: { revalidate: 300 }, // cache 5 menit
        });

        if (!res.ok) throw new Error(`FastAPI error: ${res.status}`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (err) {
        console.error("Recommend API error:", err);
        return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
    }
}
