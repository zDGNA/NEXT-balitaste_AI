FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# torch 2.6+ CPU-only (fix CVE-2025-32434, masih jauh lebih kecil dari GPU build)
RUN pip install --no-cache-dir \
    torch==2.6.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake model ke /app/model saat BUILD
# pakai paraphrase-multilingual-MiniLM-L12-v2:
#   - punya safetensors (aman dari CVE)
#   - 470MB → ~120MB (jauh lebih kecil)
#   - support Bahasa Indonesia + multilingual
#   - tidak perlu download saat startup
RUN python - << 'PYEOF'
from sentence_transformers import SentenceTransformer
import os

MODEL_ID  = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
SAVE_PATH = "/app/model"

print(f"Downloading {MODEL_ID} ...")
m = SentenceTransformer(MODEL_ID)
m.save(SAVE_PATH)

files = os.listdir(SAVE_PATH)
print(f"Saved: {files}")

m2   = SentenceTransformer(SAVE_PATH)
test = m2.encode(["test kuliner bali enak"])
print(f"Verify OK — shape: {test.shape}")
PYEOF

EXPOSE 8000
CMD ["python", "main.py"]
