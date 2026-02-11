#!/bin/bash
# Run tests and save results to git note (authoritative)
# Usage: ./test-and-log-to-note.sh [--allow-regression]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
ALLOW_REGRESSION=false

# Parse flags
if [[ "$1" == "--allow-regression" ]]; then
  ALLOW_REGRESSION=true
fi

echo "Running tests for current commit..."
echo ""

# Run tests and capture output
TEST_OUTPUT=$(mktemp)
START_TIME=$(date +%s)
node --test test/comparison/*.test.js 2>&1 | tee "$TEST_OUTPUT" || true
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Parse overall test results
PASS_COUNT=$(grep -c "^✔" "$TEST_OUTPUT" || echo 0)
FAIL_COUNT=$(grep -c "^✖" "$TEST_OUTPUT" || echo 0)
TOTAL_COUNT=$((PASS_COUNT + FAIL_COUNT))

# Parse category-specific results
MAP_PASS=$(grep "^✔" "$TEST_OUTPUT" | grep -c "map" || echo 0)
MAP_FAIL=$(grep "^✖" "$TEST_OUTPUT" | grep -c "map" || echo 0)
MAP_TOTAL=$((MAP_PASS + MAP_FAIL))

GAMEPLAY_PASS=$(grep "^✔" "$TEST_OUTPUT" | grep -c "gameplay" || echo 0)
GAMEPLAY_FAIL=$(grep "^✖" "$TEST_OUTPUT" | grep -c "gameplay" || echo 0)
GAMEPLAY_TOTAL=$((GAMEPLAY_PASS + GAMEPLAY_FAIL))

CHARGEN_PASS=$(grep "^✔" "$TEST_OUTPUT" | grep -c "chargen" || echo 0)
CHARGEN_FAIL=$(grep "^✖" "$TEST_OUTPUT" | grep -c "chargen" || echo 0)
CHARGEN_TOTAL=$((CHARGEN_PASS + CHARGEN_FAIL))

SPECIAL_PASS=$(grep "^✔" "$TEST_OUTPUT" | grep -c "special\|oracle\|bigroom" || echo 0)
SPECIAL_FAIL=$(grep "^✖" "$TEST_OUTPUT" | grep -c "special\|oracle\|bigroom" || echo 0)
SPECIAL_TOTAL=$((SPECIAL_PASS + SPECIAL_FAIL))

# Get commit info
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
PARENT_HASH=$(git rev-parse HEAD^ 2>/dev/null || echo "")
PARENT_SHORT="${PARENT_HASH:0:7}"
COMMIT_DATE=$(git show -s --format=%cI HEAD)
AUTHOR=$(git show -s --format="%an" HEAD)
MESSAGE=$(git show -s --format=%s HEAD)

echo ""
echo "Test Results:"
echo "  Total:    $TOTAL_COUNT ($PASS_COUNT pass, $FAIL_COUNT fail)"
echo "  Map:      $MAP_TOTAL ($MAP_PASS pass, $MAP_FAIL fail)"
echo "  Gameplay: $GAMEPLAY_TOTAL ($GAMEPLAY_PASS pass, $GAMEPLAY_FAIL fail)"
echo "  Chargen:  $CHARGEN_TOTAL ($CHARGEN_PASS pass, $CHARGEN_FAIL fail)"
echo "  Special:  $SPECIAL_TOTAL ($SPECIAL_PASS pass, $SPECIAL_FAIL fail)"
echo "  Duration: ${DURATION}s"

# Check for regression
REGRESSION=false
PREVIOUS_NOTE=$(git notes --ref=test-results show HEAD^ 2>/dev/null || echo "")
if [ -n "$PREVIOUS_NOTE" ]; then
  PREV_PASS=$(echo "$PREVIOUS_NOTE" | jq -r '.stats.pass' 2>/dev/null || echo 0)
  if [ "$PASS_COUNT" -lt "$PREV_PASS" ]; then
    REGRESSION=true
    echo ""
    echo "⚠️  REGRESSION DETECTED!"
    echo "   Previous: $PREV_PASS passing tests"
    echo "   Current:  $PASS_COUNT passing tests"
    echo "   Lost:     $((PREV_PASS - PASS_COUNT)) tests"

    if [ "$ALLOW_REGRESSION" = false ]; then
      echo ""
      echo "❌ Regression not allowed. Options:"
      echo "   1. Fix the regression"
      echo "   2. Run with: $0 --allow-regression"
      rm "$TEST_OUTPUT"
      exit 1
    else
      echo ""
      echo "⚠️  Regression allowed by --allow-regression flag"
    fi
  fi
fi

# Count new tests (compare total counts)
NEW_TESTS=0
if [ -n "$PREVIOUS_NOTE" ]; then
  PREV_TOTAL=$(echo "$PREVIOUS_NOTE" | jq -r '.stats.total' 2>/dev/null || echo 0)
  NEW_TESTS=$((TOTAL_COUNT - PREV_TOTAL))
fi

# Generate test note JSON
TEST_NOTE=$(cat <<EOF
{
  "commit": "$COMMIT_SHORT",
  "parent": "$PARENT_SHORT",
  "date": "$COMMIT_DATE",
  "author": "$AUTHOR",
  "message": "$MESSAGE",
  "stats": {
    "total": $TOTAL_COUNT,
    "pass": $PASS_COUNT,
    "fail": $FAIL_COUNT,
    "skip": 0,
    "duration": $DURATION
  },
  "categories": {
    "map": {
      "total": $MAP_TOTAL,
      "pass": $MAP_PASS,
      "fail": $MAP_FAIL
    },
    "gameplay": {
      "total": $GAMEPLAY_TOTAL,
      "pass": $GAMEPLAY_PASS,
      "fail": $GAMEPLAY_FAIL
    },
    "chargen": {
      "total": $CHARGEN_TOTAL,
      "pass": $CHARGEN_PASS,
      "fail": $CHARGEN_FAIL
    },
    "special": {
      "total": $SPECIAL_TOTAL,
      "pass": $SPECIAL_PASS,
      "fail": $SPECIAL_FAIL
    }
  },
  "regression": $REGRESSION,
  "newTests": $NEW_TESTS
}
EOF
)

# Save to git note
echo ""
echo "Saving test results to git note..."
echo "$TEST_NOTE" | git notes --ref=test-results add -f -F - HEAD

echo "✅ Test note saved for commit $COMMIT_SHORT"
echo ""
echo "Note content:"
echo "$TEST_NOTE" | jq '.'

rm "$TEST_OUTPUT"
exit 0
