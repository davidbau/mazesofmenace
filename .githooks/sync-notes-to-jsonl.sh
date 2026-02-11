#!/bin/bash
# Rebuild teststats/results.jsonl from git notes
# This runs before each commit to keep the JSONL mirror up-to-date

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
OUTPUT_FILE="$REPO_ROOT/teststats/results.jsonl"

echo "Rebuilding teststats/results.jsonl from git notes..."

# Create temporary file
TEMP_FILE=$(mktemp)

# Get list of commits with test notes (much faster than git log --all)
# The notes ref contains only commits that have notes
if git show-ref refs/notes/test-results >/dev/null 2>&1; then
  # Get all notes and extract the test data
  git notes --ref=test-results list | while read note_hash commit_hash; do
    # Get the note content
    NOTE=$(git notes --ref=test-results show "$commit_hash" 2>/dev/null || echo "")
    if [ -n "$NOTE" ]; then
      # Validate JSON before adding
      if echo "$NOTE" | jq empty 2>/dev/null; then
        echo "$NOTE" >> "$TEMP_FILE"
      else
        echo "⚠️  Warning: Invalid JSON for commit $commit_hash, skipping"
      fi
    fi
  done
fi

# Sort by date and write to output
if [ -s "$TEMP_FILE" ]; then
  # Sort by .date field, output as JSONL
  jq -s -c 'sort_by(.date) | .[]' "$TEMP_FILE" > "$OUTPUT_FILE"
  LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
  echo "✅ Rebuilt results.jsonl with $LINE_COUNT entries"
else
  # No notes found - check if file already exists
  if [ -f "$OUTPUT_FILE" ]; then
    echo "⚠️  No test notes found, keeping existing results.jsonl"
  else
    echo "⚠️  No test notes found. Initializing empty results.jsonl"
    touch "$OUTPUT_FILE"
  fi
fi

rm -f "$TEMP_FILE"
exit 0
