"""
main.py — BaliBites Recommendation API
=======================================
FastAPI backend yang serve model dari Google Colab.

Install: pip install fastapi uvicorn pandas numpy scikit-learn python-multipart
Run    : uvicorn main:app --reload --port 8000
Deploy : Railway / Render / Fly.io
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import pickle
import json
import os
from typing import Optional

app = FastAPI(
    title="BaliBites Recommendation API",
    description="AI-powered Bali restaurant recommendations",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Ganti dengan domain Next.js saat production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Load model saat startup ───────────────────────────────
MODEL_DIR = os.getenv("MODEL_DIR", "model")

print("Loading model...")
with open(f"{MODEL_DIR}/tfidf_vectorizer.pkl", "rb") as f:
    tfidf = pickle.load(f)

with open(f"{MODEL_DIR}/cosine_sim.pkl", "rb") as f:
    cosine_sim = pickle.load(f)

with open(f"{MODEL_DIR}/nama_to_idx.json", encoding="utf-8") as f:
    nama_to_idx: dict = json.load(f)

df = pd.read_csv(f"{MODEL_DIR}/balibites_processed.csv")
df = df.reset_index(drop=True)
print(f"✅ Model loaded — {len(df)} restaurants")

# ─── Helper ────────────────────────────────────────────────
def build_mask(
    kabupaten: Optional[str],
    kategori: Optional[str],
    min_rating: float,
    min_review: int,
) -> pd.Series:
    mask = pd.Series([True] * len(df))
    if kabupaten:
        mask &= df["Kabupaten"].str.lower() == kabupaten.lower()
    if min_rating:
        mask &= df["Rating"] >= min_rating
    if min_review:
        mask &= df["Total_Review"] >= min_review
    if kategori:
        mask &= df["Kategori"].str.contains(kategori, case=False, na=False)
    return mask

def to_records(subset: pd.DataFrame) -> list:
    result = []
    for _, row in subset.iterrows():
        result.append({
            "id":           int(row["id"]),
            "Nama":         row["Nama"],
            "Kabupaten":    row["Kabupaten"],
            "Rating":       float(row["Rating"]),
            "Total_Review": int(row["Total_Review"]),
            "Mood_Review":  row.get("Mood_Review", ""),
            "Link":         row.get("Link", ""),
            "Kategori":     row["Kategori"],
            "score":        round(float(row.get("_score", 0)), 4),
        })
    return result

# ─── Endpoints ─────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "restaurants": len(df), "version": "1.0.0"}

@app.get("/recommend")
def recommend(
    nama:       Optional[str]   = Query(None,  description="Cari yang mirip restoran ini"),
    kabupaten:  Optional[str]   = Query(None,  description="Filter kabupaten"),
    kategori:   Optional[str]   = Query(None,  description="Filter kategori/suasana"),
    min_rating: float           = Query(4.0,   description="Minimum rating"),
    min_review: int             = Query(50,    description="Minimum jumlah review"),
    top_n:      int             = Query(10,    le=50),
    mode:       str             = Query("hybrid", description="content | popularity | hybrid"),
):
    mask         = build_mask(kabupaten, kategori, min_rating, min_review)
    filtered_idx = df[mask].index.tolist()

    if not filtered_idx:
        return JSONResponse(content=[], status_code=200)

    # Content score
    content_score = pd.Series(0.0, index=df.index)
    ref_idx = None

    if nama and mode in ("content", "hybrid"):
        key = nama.lower()
        matches = [k for k in nama_to_idx if key in k]
        if matches:
            ref_idx = nama_to_idx[matches[0]]
            sims = cosine_sim[ref_idx]
            content_score = pd.Series(sims, index=df.index)

    # Popularity score
    pop_score = df["rating_norm"] * 0.6 + df["review_norm"] * 0.4

    # Final score
    if mode == "content":
        final = content_score
    elif mode == "popularity":
        final = pop_score
    else:
        final = content_score * 0.6 + pop_score * 0.4

    scored = final[filtered_idx]
    if ref_idx is not None:
        scored = scored.drop(index=ref_idx, errors="ignore")

    top_idx = scored.nlargest(top_n).index
    result_df = df.loc[top_idx].copy()
    result_df["_score"] = scored[top_idx].values

    return JSONResponse(content=to_records(result_df))


@app.get("/search")
def search(
    q:    str   = Query(..., description="Nama restoran"),
    limit: int  = Query(10, le=30),
):
    """Full-text search nama restoran."""
    results = df[df["Nama"].str.contains(q, case=False, na=False)].head(limit)
    results = results.copy()
    results["_score"] = 0.0
    return JSONResponse(content=to_records(results))


@app.get("/restaurant/{restaurant_id}")
def get_restaurant(restaurant_id: int):
    """Detail satu restoran by ID."""
    row = df[df["id"] == restaurant_id]
    if row.empty:
        return JSONResponse(content={"error": "Not found"}, status_code=404)
    row = row.iloc[0]
    return {
        "id":           int(row["id"]),
        "Nama":         row["Nama"],
        "Kabupaten":    row["Kabupaten"],
        "Rating":       float(row["Rating"]),
        "Total_Review": int(row["Total_Review"]),
        "Mood_Review":  row.get("Mood_Review", ""),
        "Link":         row.get("Link", ""),
        "Kategori":     row["Kategori"],
    }


@app.get("/kabupaten")
def list_kabupaten():
    """Statistik per kabupaten."""
    stats = df.groupby("Kabupaten").agg(
        total=("Nama", "count"),
        avg_rating=("Rating", "mean"),
        avg_review=("Total_Review", "mean"),
    ).round(2).reset_index()
    return stats.to_dict(orient="records")


@app.get("/kategori")
def list_kategori():
    """Statistik per kategori."""
    all_cats: dict = {}
    for k in df["Kategori"]:
        for c in str(k).split("|"):
            c = c.strip()
            all_cats[c] = all_cats.get(c, 0) + 1
    return sorted(
        [{"kategori": k, "count": v} for k, v in all_cats.items()],
        key=lambda x: -x["count"]
    )
