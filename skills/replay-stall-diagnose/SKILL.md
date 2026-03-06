---
name: replay-stall-diagnose
description: Use this skill when a session replay hangs or times out and you need systematic CPU/live-lock diagnosis with repeatable artifacts.
---

# Replay Stall Diagnose

## When To Use
Use this when `session_test_runner` times out or appears stuck, especially when:
- no RNG/event comparisons are produced (`rng=0/0`, `events=0/0`)
- runs stall before clear first divergence evidence
- ad-hoc logging is too noisy to identify root cause

## Goal
Localize the hottest runtime path causing timeout/live-lock and convert a generic timeout into actionable evidence.

## Primary Tool
- `scripts/replay_stall_diagnose.mjs`

It wraps `session_test_runner` with Node CPU profiling and writes:
- `run.log` (full run output)
- `summary.txt` (top self-sample functions/files)
- `summary.json` (machine-readable hotspot summary)

## Standard Workflow
1. Reproduce timeout quickly on one target session:
```bash
node scripts/replay_stall_diagnose.mjs \
  --session seed325_knight_wizard_gameplay \
  --timeout-ms 12000 \
  --top 20
```

2. Read `summary.txt` first:
- Confirm the timeout line matches the target failure.
- Identify dominant self-sample frames (usually top 1-3 functions).
- Identify dominant files (e.g. `vision.js`, `monmove.js`, `hack.js`).

3. Form a root-cause hypothesis from hot frames:
- Vision-heavy hotspot (`right_side`, `q4_path`): suspect map/FOV loops, repeated scans, or runaway traversal.
- Monster-move hotspot (`movemon`, `dog_move`, `dochug`): suspect movement loop invariants or repeated no-progress turns.
- Input/prompt hotspot (`nhgetch`, `pendingPrompt` paths): suspect unresolved waits, prompt loops, or boundary bugs.

4. Add narrow tracing only where hotspot points:
- Avoid global logging first.
- Use one or two focused env traces per run (for example command, run, or monmove traces).

5. Re-run the same diagnose command after each fix candidate.
- Compare whether dominant hotspot percentage drops or shifts.
- Keep the same session and timeout while iterating for consistent comparison.

## Practical Tips
- Start with shorter timeouts (`--timeout-ms 6000` to `12000`) for faster iteration.
- Run 2-3 repeated profiles before concluding a hotspot is stable.
- Prioritize **self samples** over inclusive stack intuition; they indicate where CPU is actively spent.
- Ignore small GC/native noise unless it dominates.
- If no `.cpuprofile` is generated, treat as setup/runtime failure and fix that first.

## Differential Profiling Pattern
Use A/B profiling to validate fixes:
1. Capture baseline profile + summary.
2. Apply one focused code change.
3. Capture post-change profile with same session/timeout.
4. Compare:
   - timeout still present or cleared,
   - top function/file percentages,
   - whether hotspot moved to a new stage.

## Guardrails
- Do not add comparator exceptions to hide timeout/divergence.
- Do not add replay-core synthetic input/auto-dismiss/timing compensation.
- Keep fixes in core gameplay/runtime logic and preserve C-faithful behavior.

## Output to Share in Issue Updates
Include:
- exact command used
- timeout line from `run.log`
- top 3 functions and top 3 files from `summary.txt`
- root-cause hypothesis
- next narrow instrumentation/fix step

## Done Criteria
- Timeout converted into a concrete, repeatable hotspot diagnosis.
- A targeted fix is implemented and validated, or a bounded follow-up issue is filed with profiling evidence.
- No harness/replay masking hacks introduced.
