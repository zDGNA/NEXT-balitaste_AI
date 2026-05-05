// app/api/recommend/route.ts
import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Build query params yang kompatibel dengan FastAPI backend
    const params = new URLSearchParams();
    
    // Filter params
    if (searchParams.get("kategori"))   params.set("kategori", searchParams.get("kategori")!);
    if (searchParams.get("kabupaten"))  params.set("kabupaten", searchParams.get("kabupaten")!);
    if (searchParams.get("min_rating")) params.set("min_rating", searchParams.get("min_rating")!);
    if (searchParams.get("min_review")) params.set("min_review", searchParams.get("min_review")!);
    if (searchParams.get("top_n"))      params.set("top_n", searchParams.get("top_n")!);
    
    // Location-based params (dari AuthModal location permission)
    if (searchParams.get("lat"))        params.set("lat", searchParams.get("lat")!);
    if (searchParams.get("lng"))        params.set("lng", searchParams.get("lng")!);
    if (searchParams.get("radius_km"))  params.set("radius_km", searchParams.get("radius_km")!);
    
    // Personalization params
    if (searchParams.get("user_id"))    params.set("user_id", searchParams.get("user_id")!);
    if (searchParams.get("mode"))       params.set("mode", searchParams.get("mode")!); // "explore" | "trending" | "itinerary"

    const fetchUrl = `${FASTAPI_URL}/recommend?${params}`;
    console.log("🔍 Fetching:", fetchUrl);

    const res = await fetch(fetchUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      next: { revalidate: 300 }, // ISR: cache 5 menit
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "Unknown error");
      console.error(`FastAPI /recommend error ${res.status}:`, err);
      return NextResponse.json({ error: "Recommendation service error" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Recommend API error:", error);
    
    if (error.cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        { error: "Recommendation engine tidak tersedia. Coba lagi nanti." },
        { status: 503 }
      );
    }
    
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}