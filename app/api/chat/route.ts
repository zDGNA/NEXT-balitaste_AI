// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";

// 🔍 Debug: Log env vars (hanya di dev)
// BENAR: Menggunakan nama variabel yang sesuai dengan dashboard Vercel kamu
const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
console.log("🔗 Chat proxy targeting:", FASTAPI_URL);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 Received from frontend:", { 
      message: body.message?.slice(0, 50) + "...", 
      hasLocation: !!body.user_location 
    });

    // Validasi minimal
    if (!body?.message || typeof body.message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 🔍 Debug: Log request ke FastAPI
    const fetchUrl = `${FASTAPI_URL}/chat`;
    console.log("🚀 Forwarding to FastAPI:", fetchUrl);

    const res = await fetch(fetchUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Request-Source": "nextjs-frontend"
      },
      body: JSON.stringify({
        message: body.message,
        user_location: body.user_location,
        preferences: body.preferences,
        context: body.context,
      }),
      signal: AbortSignal.timeout(30000),
    });

    console.log("📡 FastAPI response status:", res.status, res.ok);

    if (!res.ok) {
      const errText = await res.text().catch(() => "Unknown error");
      console.error(`❌ FastAPI /chat error ${res.status}:`, errText);
      return NextResponse.json({ error: "Recommendation engine error" }, { status: res.status });
    }

    const data = await res.json();
    console.log("✅ FastAPI response OK, forwarding to frontend");
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("💥 Chat API proxy error:", {
      name: error.name,
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    });
    
    if (error.name === "TimeoutError") {
      return NextResponse.json({ error: "Request timeout. Please try again." }, { status: 504 });
    }
    
    if (error.cause?.code === "ECONNREFUSED") {
      return NextResponse.json({ error: "Cannot connect to recommendation engine. Is backend running?" }, { status: 503 });
    }
    
    return NextResponse.json(
      { error: "Internal server error in chat proxy" },
      { status: 500 }
    );
  }
}

console.log("🔐 Env vars:", {
  BALIBITES_API_URL: process.env.BALIBITES_API_URL,
  FASTAPI_URL: process.env.FASTAPI_URL,
  NODE_ENV: process.env.NODE_ENV,
});