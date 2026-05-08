#!/usr/bin/env bash
# sync-source.sh — refresh the guidebook source from the upstream
# NetHack repo (nethack-c submodule in teleport/maud).
#
# Run this whenever upstream cuts a new release. The output files
# (Guidebook.tex/.mn/.txt) are committed to mazesofmenace so the site
# builds even when the teleport tree isn't checked out.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="${NETHACK_DOC:-$SCRIPT_DIR/../../teleport/maud/nethack-c/upstream/doc}"

if [ ! -d "$SRC" ]; then
  echo "Error: NetHack doc dir not found at $SRC" >&2
  echo "Set NETHACK_DOC to the upstream nethack-c/doc path." >&2
  exit 1
fi

for f in Guidebook.tex Guidebook.mn Guidebook.txt; do
  if [ ! -f "$SRC/$f" ]; then
    echo "Error: $SRC/$f missing" >&2
    exit 1
  fi
  cp "$SRC/$f" "$SCRIPT_DIR/$f"
  echo "    ← $f"
done

echo "Synced from $SRC"
echo "Run ./build.sh to regenerate index.html."
