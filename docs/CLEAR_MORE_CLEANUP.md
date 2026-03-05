# `clear_more_prompts()` Cleanup Plan

## Problem

The C harness function `clear_more_prompts()` silently dismisses `--More--`
prompts by sending Space keypresses without recording them as session steps.
This creates several problems:

1. **Invisible gaps**: Steps consumed by `--More--` dismissal are never
   captured, so session replays skip over them.
2. **Timing-dependent inconsistencies**: Whether a `--More--` prompt appears
   depends on message length, terminal width, and message concatenation order.
   Silent dismissal hides these differences.
3. **Comparator hacks**: The `isStartupToplineAlias` function in
   `comparator_policy.js` exists solely to paper over the mismatch between
   JS step 0 (which shows a welcome banner) and C step 0 (which shows a
   harness map-dump line, because `clear_more_prompts` already dismissed the
   lore/welcome screens).

## What `clear_more_prompts` Does

Location: `test/comparison/c-harness/harness_common.py` (and callers)

```python
def clear_more_prompts(proc, timeout=0.5):
    """Send spaces until no --More-- prompts remain."""
    while True:
        screen = capture_screen(proc)
        if '--More--' not in screen:
            break
        send_key(proc, ' ')
        time.sleep(0.05)
```

Called during:
- **Startup**: After `moveloop_preamble()`, before the first gameplay step
- **Tutorial entry**: After entering the tutorial level
- **Occasionally**: In some prompt-handling paths

The startup call is the most impactful: it swallows the lore text screen
and the welcome message screen (both have `--More--` prompts), so the
recorded session's step 0 never contains them.

## Proposed Fix: `dismiss_more_as_steps()`

Replace `clear_more_prompts()` with a new function that records each
`--More--` dismissal as a proper session step:

```python
def dismiss_more_as_steps(proc, session, timeout=0.5):
    """Dismiss --More-- prompts, recording each as a session step."""
    while True:
        screen = capture_screen(proc)
        if '--More--' not in screen:
            break
        # Record the current screen as a step (the --More-- is visible)
        step = capture_step(proc, key=' ')
        session['steps'].append(step)
```

This makes the lore and welcome screens visible in the session data,
allowing JS to match them faithfully.

## Files Affected

### C harness (Python)
| File | Change |
|------|--------|
| `test/comparison/c-harness/harness_common.py` | Replace `clear_more_prompts` with `dismiss_more_as_steps` |
| `test/comparison/c-harness/record_session.py` | Update call sites |
| `test/comparison/c-harness/record_selfplay.py` | Update call sites |
| `test/comparison/c-harness/rerecord.py` | Update call sites |

### JS side
| File | Change |
|------|--------|
| `js/allmain.js` | Call `showLoreAndWelcome()` in headless init path |
| `test/comparison/comparator_policy.js` | Remove `isStartupToplineAlias` hack |

### Session files
All sessions must be rerecorded after the C harness change so that
lore/welcome `--More--` steps appear in the data.

## Dependency Chain

1. **JS `showLoreAndWelcome` fix** — Make JS produce lore/welcome screens
   in headless mode (non-blocking variant for replay)
2. **C harness `dismiss_more_as_steps`** — Record the `--More--` dismissals
3. **Rerecord all sessions** — Capture the new step structure
4. **Remove `isStartupToplineAlias`** — No longer needed once both sides match
5. **Verify** — `npm test` and `scripts/run-and-report.sh` all green

## Current Interim State

Until the C harness is fixed:
- The `isStartupToplineAlias` comparator hack remains in place
- JS headless init shows a welcome banner on step 0 that doesn't match C
  (C shows a map-dump line because lore/welcome were already dismissed)
- This is a known, tracked divergence

## Related Issues

- See GitHub issue (to be filed) tracking the C-side refactoring
- Sessions affected: all wizard gameplay sessions (seed321-333) and
  standard gameplay sessions (seed001-seed100+)
