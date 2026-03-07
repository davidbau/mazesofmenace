#!/bin/bash
# Run all Rogue 3.6 parity sessions and show PES table
cd "$(git rev-parse --show-toplevel)/mac"
for f in rogue/test/sessions/seed*.json; do
  node rogue/test/replay_test.mjs "$f" 2>/dev/null
done | node rogue/test/pes_report.mjs
