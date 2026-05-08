#!/usr/bin/env bash
# Build script for the official NetHack 5.0 Guidebook (web edition).
#
# Pipeline:
#   1. Guidebook.mn (nroff) → guidebook.md (via convert_guidebook.py)
#   2. guidebook.md       → index.html (via pandoc)
#
# Source-of-truth: nethack-c/upstream/doc/Guidebook.mn (NetHack 5.0.0).
# Run sync-source.sh to refresh from upstream.
#
# Note: this is the unmodified upstream guidebook. The teleport tree
# has a parallel build that merges a teleport-specific supplement
# (browser storage, URL parameters, simulated shell). We do NOT merge
# that supplement here — mazesofmenace.ai documents NetHack as the
# game, not the teleport runtime.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v pandoc &>/dev/null; then
  echo "Error: pandoc not found. Install with: brew install pandoc" >&2
  exit 1
fi
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found." >&2
  exit 1
fi

if [ ! -f Guidebook.mn ]; then
  echo "Error: Guidebook.mn not found. Run sync-source.sh first." >&2
  exit 1
fi

echo "=== Converting Guidebook.mn → guidebook.md ==="
python3 convert_guidebook.py Guidebook.mn guidebook.md
echo "    → guidebook.md"

echo "=== Building Guidebook HTML ==="
pandoc guidebook.md \
  --from=markdown \
  --to=html5 \
  --template=template.html \
  --section-divs \
  --output=index.html

echo "    → index.html"
echo "=== Done ==="
