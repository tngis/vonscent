#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPENAI_API_KEY="$(grep -E '^OPENAI_API_KEY=' "$ROOT/.env.local" | head -1 | cut -d= -f2- | tr -d '"'"'"' ')"
OUT="${1:-$ROOT/public/v-point.png}"
TMP="$(mktemp)"

PROMPT='A single minted luxury collectible coin / token viewed straight-on, embossing the capital letter "V" in the center. Polished platinum and silver metal with sharp engraved relief, fine milled reeded edge, deep specular highlights and reflections, ultra premium expensive jewelry feel. Perfect circle coin. Fully isolated on a transparent background, no shadow, no scene. Centered, 1:1 square, photorealistic product render, high detail.'

python3 - "$OPENAI_API_KEY" "$PROMPT" "$OUT" <<'PY'
import sys, json, base64, urllib.request

key, prompt, out = sys.argv[1], sys.argv[2], sys.argv[3]
body = json.dumps({
    "model": "gpt-image-1",
    "prompt": prompt,
    "size": "1024x1024",
    "quality": "high",
    "background": "transparent",
    "n": 1,
}).encode()

req = urllib.request.Request(
    "https://api.openai.com/v1/images/generations",
    data=body,
    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
)
try:
    resp = urllib.request.urlopen(req, timeout=300)
except urllib.error.HTTPError as e:
    sys.exit("API error %s: %s" % (e.code, e.read().decode()))

data = json.load(resp)
b64 = data["data"][0]["b64_json"]
with open(out, "wb") as f:
    f.write(base64.b64decode(b64))
print("wrote", out)
PY
