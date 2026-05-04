// app/api/chat/route.ts  (Next.js 14 App Router)
// ---------------------------------------------------
// Proxy layer antara frontend dan FastAPI backend.
// Simpan BALIBITES_API_URL di .env.local
// ---------------------------------------------------

import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.BALIBITES_API_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const res = await fetch(`${API_URL}/chat`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "Gagal menghubungi recommendation engine." },
      { status: 500 }
    );
  }
}
