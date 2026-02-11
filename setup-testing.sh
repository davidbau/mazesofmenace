#!/bin/bash
# One-time setup for testing infrastructure
# Run this after cloning the repository

set -e

echo "========================================"
echo "Mazes of Menace - Testing Setup"
echo "========================================"
echo ""
echo "This script will configure git hooks and test automation."
echo ""

# Check if already configured
CURRENT_HOOKS=$(git config --local core.hooksPath || echo "")
if [ "$CURRENT_HOOKS" = ".githooks" ]; then
  echo "✅ Hooks already configured"
else
  echo "Configuring git hooks..."
  git config core.hooksPath .githooks
  echo "✅ Hooks configured: .githooks"
fi

# Check if auto-push is configured
if git config --local --get-all remote.origin.push | grep -q "refs/notes/test-results"; then
  echo "✅ Auto-push for test notes already configured"
else
  echo "Configuring auto-push for test notes..."
  git config --add remote.origin.push '+refs/notes/test-results:refs/notes/test-results'
  echo "✅ Auto-push configured for test notes"
fi

# Make sure all scripts are executable
echo "Ensuring all hook scripts are executable..."
chmod +x .githooks/*.sh .githooks/pre-* 2>/dev/null || true
echo "✅ Scripts are executable"

# Fetch test notes if they exist
echo "Fetching test notes from remote..."
if git fetch origin refs/notes/test-results:refs/notes/test-results 2>/dev/null; then
  echo "✅ Test notes fetched"

  # Rebuild dashboard from notes
  if [ -x .githooks/sync-notes-to-jsonl.sh ]; then
    echo "Rebuilding dashboard from test notes..."
    .githooks/sync-notes-to-jsonl.sh
    echo "✅ Dashboard rebuilt"
  fi
else
  echo "ℹ️  No test notes found on remote (this is normal for new repositories)"
fi

echo ""
echo "========================================"
echo "✅ Setup Complete!"
echo "========================================"
echo ""
echo "Your repository is now configured for testing."
echo ""
echo "Quick Start:"
echo "  1. Make changes to code"
echo "  2. Run: .githooks/commit-with-tests-notes.sh \"message\" file.js"
echo "  3. Run: git push"
echo ""
echo "Documentation:"
echo "  - Quick Reference: .githooks/QUICK_REFERENCE.md"
echo "  - Main Guide: TESTING_DASHBOARD.md"
echo "  - Git Notes: docs/TESTING_GIT_NOTES.md"
echo ""
echo "View dashboard:"
echo "  - Local: open teststats/index.html"
echo "  - GitHub Pages: https://davidbau.github.io/mazesofmenace/teststats/"
echo ""
echo "May your tests always pass!"
echo ""
