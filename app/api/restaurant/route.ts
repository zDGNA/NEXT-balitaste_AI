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
    lat: number;
    lng: number;
    score?: number;
}

let _data: Restaurant[] | null = null;
function getData(): Restaurant[] {
    if (_data) return _data;
    const filePath = path.join(process.cwd(), "public", "balibites_enriched.json");
    _data = JSON.parse(readFileSync(filePath, "utf-8")) as Restaurant[];
    return _data;
}

// Parse "100k" → 100000, "50" → 50000
function parseRupiahMax(str: string): number {
    const s = str.toLowerCase().replace(/[rp\s.,]/g, "");
    if (s.includes("k")) return parseFloat(s.replace("k", "")) * 1000;
    if (s.includes("rb")) return parseFloat(s.replace("rb", "")) * 1000;
    if (s.includes("jt")) return parseFloat(s.replace("jt", "")) * 1_000_000;
    return parseFloat(s) * (parseFloat(s) < 1000 ? 1000 : 1);
}

// Cek apakah price_range masuk budget maksimum
function matchesBudget(price_range: string, maxBudget: number): boolean {
    // price_range contoh: "Rp 50–150k" atau "Rp 15–50k"
    const nums = price_range.match(/[\d]+/g);
    if (!nums) return true;
    // Ambil nilai minimum dari range
    const minPrice = parseFloat(nums[0]) * 1000;
    return minPrice <= maxBudget;
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);

    const kabupaten    = searchParams.get("kabupaten")?.toLowerCase();
    const kategori     = searchParams.get("kategori")?.toLowerCase();
    const nama         = searchParams.get("nama")?.toLowerCase();
    const min_rating   = parseFloat(searchParams.get("min_rating") ?? "3.5");
    const min_review   = parseInt(searchParams.get("min_review")  ?? "20");
    const top_n        = parseInt(searchParams.get("top_n")       ?? "8");
    const budget_raw   = searchParams.get("budget"); // misal "100k" atau "150000"
    const maxBudget    = budget_raw ? parseRupiahMax(budget_raw) : null;

    const data = getData();

    let results = data.filter((r) => {
        if (r.rating       < min_rating) return false;
        if (r.total_review < min_review)  return false;
        if (kabupaten && r.kabupaten.toLowerCase() !== kabupaten) return false;
        if (kategori  && !r.kategori.toLowerCase().includes(kategori)) return false;
        if (nama      && !r.nama.toLowerCase().includes(nama)) return false;
        if (maxBudget && !matchesBudget(r.price_range, maxBudget)) return false;
        return true;
    });

    results = results
        .map((r) => ({
            ...r,
            score: r.rating * 0.6 + Math.log1p(r.total_review) * 0.4,
        }))
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, top_n);

    return NextResponse.json(results);
}