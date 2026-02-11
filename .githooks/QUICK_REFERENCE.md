# Testing Quick Reference

*"Keep this scroll nearby for quick incantations!"*

## 🚀 Most Common Commands

### Daily Workflow (Recommended)
```bash
# Edit files
vim js/file.js

# Commit with tests (all-in-one)
.githooks/commit-with-tests-notes.sh "Fix bug" js/file.js

# Push
git push
```

That's it! The helper does everything.

---

## 📋 Cheat Sheet

### Setup (Once)
```bash
git config core.hooksPath .githooks
git config --add remote.origin.push '+refs/notes/test-results:refs/notes/test-results'
```

### Commit with Tests
```bash
# Git notes approach (recommended)
.githooks/commit-with-tests-notes.sh "message" file1.js file2.js

# Legacy approach
.githooks/commit-with-tests.sh "message" file1.js file2.js
```

### Manual Testing
```bash
# Git notes
.githooks/test-and-log-to-note.sh
.githooks/sync-notes-to-jsonl.sh
git add teststats/results.jsonl && git commit -m "Update dashboard"

# Legacy
.githooks/test-and-log.sh
git add teststats/results.jsonl && git commit -m "Test results"
```

### View Results
```bash
# Dashboard
open teststats/index.html

# Last test note
git notes --ref=test-results show HEAD

# Last JSONL entry
tail -1 teststats/results.jsonl | jq '.'

# Stats
jq -r '.stats.pass' teststats/results.jsonl | tail -1
```

### Allow Regression
```bash
# Git notes
.githooks/test-and-log-to-note.sh --allow-regression

# Legacy
.githooks/test-and-log.sh --allow-regression
```

### Rebuild Dashboard
```bash
.githooks/sync-notes-to-jsonl.sh
git add teststats/results.jsonl && git commit -m "Rebuild dashboard"
```

### After Clone
```bash
git fetch origin refs/notes/test-results:refs/notes/test-results
.githooks/sync-notes-to-jsonl.sh
```

---

## 🔍 Troubleshooting

### Hooks not running
```bash
git config core.hooksPath .githooks
chmod +x .githooks/*
```

### Notes not pushing
```bash
git config --add remote.origin.push '+refs/notes/test-results:refs/notes/test-results'
# OR manually:
git push origin refs/notes/test-results
```

### Dashboard not updating
```bash
.githooks/sync-notes-to-jsonl.sh
git add teststats/results.jsonl && git commit -m "Update dashboard"
```

### Invalid JSON
```bash
cat teststats/results.jsonl | jq '.'  # Find the bad line
```

---

## 📊 Check Status

```bash
# Current pass rate
jq -r '.stats.pass' teststats/results.jsonl | tail -1

# Last 5 commits
tail -5 teststats/results.jsonl | jq -r '"\(.commit): \(.stats.pass)/\(.stats.total)"'

# All notes
git notes --ref=test-results list

# Test count by category
tail -1 teststats/results.jsonl | jq '.categories'
```

---

## 📚 Documentation

- **Main Guide**: ../TESTING_DASHBOARD.md
- **Git Notes**: ../docs/TESTING_GIT_NOTES.md
- **Legacy**: ../docs/TESTING.md
- **Hooks**: README.md (this directory)
- **Dashboard**: ../teststats/README.md

---

*"Keep this scroll handy! May your tests always pass."*
