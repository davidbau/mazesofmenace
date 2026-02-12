#!/usr/bin/env bash
# Build script for the NetHack Guidebook (HTML version)
# Source: ../docs/reference/Guidebook.mn (nroff)
# Converter: convert_guidebook.py (nroff → Markdown)
# Template: template.html (pandoc HTML5 template)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Check dependencies
if ! command -v pandoc &>/dev/null; then
  echo "Error: pandoc not found. Install with: brew install pandoc" >&2
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "Error: python3 not found." >&2
  exit 1
fi

echo "=== Converting Guidebook.mn → guidebook.md ==="
python3 convert_guidebook.py
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
