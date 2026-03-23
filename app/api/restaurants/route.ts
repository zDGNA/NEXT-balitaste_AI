import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export interface Restaurant {
    id: number;
    nama: string;
    kabupaten: string;
    rating: number;
    total_review: number;
    kategori: string;
    highlights: string[];
    price_range: string;
    best_time: string;
    link: string;
    score?: number;
}

// Load dataset sekali saat module di-init (cached by Node.js module system)
let _data: Restaurant[] | null = null;
function getData(): Restaurant[] {
    if (_data) return _data;
    const filePath = path.join(process.cwd(), "public", "data", "balibites_enriched.json");
    _data = JSON.parse(readFileSync(filePath, "utf-8")) as Restaurant[];
    return _data;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const kabupaten  = searchParams.get("kabupaten")?.toLowerCase();
    const kategori   = searchParams.get("kategori")?.toLowerCase();
    const nama       = searchParams.get("nama")?.toLowerCase();
    const min_rating = parseFloat(searchParams.get("min_rating") ?? "4.0");
    const min_review = parseInt(searchParams.get("min_review") ?? "50");
    const top_n      = parseInt(searchParams.get("top_n") ?? "8");

    const data = getData();

    let results = data.filter((r) => {
        if (r.rating < min_rating) return false;
        if (r.total_review < min_review) return false;
        if (kabupaten && r.kabupaten.toLowerCase() !== kabupaten) return false;
        if (kategori && !r.kategori.toLowerCase().includes(kategori)) return false;
        if (nama && !r.nama.toLowerCase().includes(nama)) return false;
        return true;
    });

    // Sort by popularity score: rating (60%) + log(review) (40%)
    results = results
        .map((r) => ({
            ...r,
            score: r.rating * 0.6 + Math.log1p(r.total_review) * 0.4,
        }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, top_n);

    return NextResponse.json(results);
}
