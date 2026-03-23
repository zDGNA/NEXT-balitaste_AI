// lib/api.ts
// Tipe data & helper fetch untuk BaliBites

export interface Restaurant {
    id: number;
    Nama: string;
    Kabupaten: string;
    Rating: number;
    Total_Review: number;
    Mood_Review: string;
    Link: string;
    Kategori: string;
    kategori_list?: string[];
    score?: number;
    similarity?: number;
}

export interface RecommendParams {
    nama?: string;
    kabupaten?: string;
    kategori?: string;
    min_rating?: number;
    min_review?: number;
    top_n?: number;
    mode?: "content" | "popularity" | "hybrid";
}

export async function getRecommendations(params: RecommendParams): Promise<Restaurant[]> {
    const query = new URLSearchParams();
    if (params.nama)       query.set("nama",       params.nama);
    if (params.kabupaten)  query.set("kabupaten",  params.kabupaten);
    if (params.kategori)   query.set("kategori",   params.kategori);
    if (params.min_rating) query.set("min_rating", String(params.min_rating));
    if (params.min_review) query.set("min_review", String(params.min_review));
    if (params.top_n)      query.set("top_n",      String(params.top_n));
    if (params.mode)       query.set("mode",       params.mode);

    const res = await fetch(`/api/recommend?${query}`);
    if (!res.ok) return [];
    return res.json();
}

// Format angka review: 12345 → "12.3k"
export function formatReviews(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

// Kabupaten → area label yang user-friendly
export const KABUPATEN_LABELS: Record<string, string> = {
    Badung:     "Badung · Seminyak / Canggu / Jimbaran",
    Gianyar:    "Gianyar · Ubud / Tegallalang",
    Denpasar:   "Denpasar · Kota / Sanur / Renon",
    Tabanan:    "Tabanan · Tanah Lot / Bedugul",
    Buleleng:   "Buleleng · Singaraja / Lovina",
    Bangli:     "Bangli · Kintamani",
    Karangasem: "Karangasem · Amed / Candidasa",
    Klungkung:  "Klungkung · Nusa Penida / Lembongan",
    Jembrana:   "Jembrana · Medewi / Negara",
};

// Kategori → emoji + label
export const KATEGORI_CONFIG: Record<string, { icon: string; color: string }> = {
    "Sunset & View":    { icon: "🌅", color: "#c9972b" },
    "Work from Cafe":   { icon: "💻", color: "#4a7a56" },
    "Vibrant Nightlife":{ icon: "🎶", color: "#c4603a" },
    "Family Friendly":  { icon: "👨‍👩‍👧", color: "#4a7a56" },
    "Budget Friendly":  { icon: "💰", color: "#888" },
    "Romantic & Cozy":  { icon: "🕯️", color: "#c4603a" },
    "General Chill":    { icon: "🌿", color: "#4a7a56" },
};

// Parse kategori string → array
export function parseKategori(k: string): string[] {
    return k.split("|").map((s) => s.trim()).filter(Boolean);
}

// Buat context string dari list restoran untuk system prompt AI
export function buildRestaurantContext(restaurants: Restaurant[]): string {
    if (!restaurants.length) return "";
    return restaurants
        .slice(0, 8)
        .map((r, i) =>
            `${i + 1}. ${r.Nama} (${r.Kabupaten}) — ⭐${r.Rating} · ${formatReviews(r.Total_Review)} ulasan · ${r.Kategori}`
        )
        .join("\n");
}
