# MORE_NEEDED_CAMPAIGN.md

## Campaign Name
Operation More Needed

## Why This Campaign Exists

When NetHack displays `--More--`, C gameplay pauses until the player presses a key.
The JS port was approximating this — queueing messages, batching output, and
suppressing some prompt events — producing timing and display divergences that
cascaded into hard-to-diagnose parity failures.

This campaign makes `--More--` handling explicit throughout:
1. Sessions record actual key steps for every `--More--` dismissal (no auto-suppression).
2. JS message/display paths are async so gameplay can pause exactly when C does.
3. Event logs capture the truth (`^event` annotations in sessions).
4. Comparator layers bear the flexibility burden; replay execution stays simple.

The branch name is the mission statement: **more is needed** — more explicit
key steps, more event evidence, more async fidelity, more parity.

## Background (What Changed)

This branch was created after Operation Iron Parity was assessed as unsuccessful
for near-term parity closure (March 4, 2026). The pivot:

1. Many real `--More--` prompts had been auto-suppressed in sessions, with
   compensation logic in `replay_core` hiding meaningful gameplay complexity.
2. An erroneous C-side patch had been changing gameplay behavior during
   instrumentation; corrected.
3. Replay execution simplified: replay keys, capture outputs; no gameplay-aware
   queueing or squashing logic in replay core.
4. Flexible/tolerant handling moved to comparator/reporting code.
5. Sessions re-recorded with:
   - richer `^event` logging (monster movement, dog AI, map wipe, engravings, etc.),
   - corrected PRNG instrumentation behavior,
   - explicit space-key steps for `--More--` dismissals (`record_more_spaces`),
   - refreshed gameplay baselines against current C binary.
6. Async message flow refactors begun:
   - `pline`/message paths made async so gameplay can pause exactly at `--More--`.
7. Cursor-position capture/comparison added to the test harness.

## Work Completed on This Branch

Concrete fixes already landed:

1. **`--More--` async chain** — `pline` and message display paths refactored to
   be async-capable; gameplay pauses correctly when C does.
2. **`^event` logging** — `^distfleeck`, `^movemon_turn`, `^wipe`, `^dog_move`,
   `^dog_goal`, `^dog_invent_decision`, `^mcalcmove`, and others added to C harness
   and JS runtime for parity comparison.
3. **Session re-recording** — all 42-seed gameplay sessions re-recorded with
   `record_more_spaces=true` and the new event logging baseline.
4. **Group E fix** (seed42_items, dog display at step 20) — `--More--` dismissal
   during eating occupation now correctly processes a monster turn in JS.
5. **Group F fix** (`interface_nameprompt`, 'A' command) — `handleRemoveAll`
   implemented in `do_wear.js`, wired to 'A' in `cmd.js`, with correct overlay
   menu rendering (inverse video on prompt row) in `headless.js`.
6. **Group A fix** (seed100 `^wipe` re-record) — sessions re-recorded so `^wipe`
   only appears when an engraving actually exists, matching current C behavior.
7. **Cursor channel** — cursor position captured per step in C harness and JS
   `HeadlessDisplay`; comparator reports cursor divergences (non-blocking).
8. **Overlay menu prompt rendering** — `renderOverlayMenu` line 0 renders with
   inverse video (attr=1) to match C `tty_select_menu` behavior.

## Current State (latest gate run)

Session suite: **123 / 150 passing** (27 failing).

Observed failure taxonomy (all 27 failing sessions triaged):

1. **`dochug` monster-movement/pet-AI divergence** (~14 sessions, dominant):
   First RNG mismatch is JS at `dochug(monmove.js:847)` while C is at a
   completely different callsite — `dog_move`, `do_attack`, `m_move`,
   `dog_invent`, `mcalcmove`, `teleport`, `obj_resists`, etc. This single
   codepath is the #1 blocker. Affected sessions include seed031, seed303,
   seed304, seed306, seed307, seed308, seed310, seed311, seed325, seed329
   and others.

2. **Level-generation divergence** (~7 sessions, Group D wizard seeds):
   Divergence in dungeon/object placement code: `themeroom_fill`,
   `makerooms`, `makedog`, `get_location_coord`, `newobj` in `sp_lev`.
   Several diverge at step 1 immediately after descending to a new level.
   Affected: seed321, seed323, seed326, seed327, seed328, seed330, seed331.

3. **Screen-only failures** (2 sessions — RNG and events fully matched):
   seed305 and seed313 pass all RNG and event checks but diverge on screen
   rendering (e.g., floor tile `·` rendered as `` ` `` at step 118).
   These are pure display bugs, not logic divergences.

4. **Other gameplay divergences** (~4 sessions):
   Miscellaneous first divergences: seed302 (`getbones` — bones-file
   loading), seed322/seed332/seed333 (combat and makemon paths diverging
   late in long sessions), seed312 (`wipe_engr_at` vs `mcalcmove`).

5. **Prompt/input boundary bug** (1 session):
   `seed033_manual_direct` times out (`Unknown command ' '`) — space key
   treated as a game command instead of a modal dismissal.

## Active Workstreams

Team execution lanes:

1. **`dochug` monster-movement/pet-AI divergence** (primary blocker, ~14 sessions):
   - Investigate `dochug(monmove.js:847)`: why does JS arrive there when C is
     in `dog_move`, `do_attack`, `m_move`, etc. at the same RNG position?
   - Likely root causes: JS processes extra or wrong monster turns, or takes a
     different code path for a monster type/situation that C handles differently.
   - Fix `dochug`/`distfleeck`/`dog_goal` ordering and decision-path mismatches
     using `^event` traces. Prioritize fixes that move first divergence later
     across many sessions simultaneously.

2. **Level-generation divergence in wizard sessions** (~7 sessions):
   - `themeroom_fill`, `makerooms`, `makedog`, `sp_lev` placement paths diverge
     from C when descending to new dungeon levels.
   - Investigate whether JS level-gen code matches C order for room filling,
     object placement, and monster initialization in special rooms.

3. **Screen-only rendering bugs** (2 sessions — seed305, seed313):
   - RNG and events match fully; screen diverges on tile/symbol rendering.
   - Fix the specific display path producing wrong tile (e.g., `·` vs `` ` ``).

4. **Prompt/input boundary stabilization** (targeted, 1 session):
   - Fix `seed033_manual_direct` timeout where space is treated as a game
     command instead of a modal dismissal.

4. **Cursor parity closure** (tracked in [`docs/CURSOR_PLAN.md`](CURSOR_PLAN.md)):
   - Complete JS `setCursor` / `getCursor` integration across display paths.
   - Add cursor comparison to gameplay session suite.
   - Align gameplay/topline/prompt cursor behavior with C.

5. **Async message-flow parity** (ongoing):
   - Propagate async call chains wherever C behavior can block on `--More--`.
   - Eliminate any remaining queueing-era approximations that mask ordering.

6. **Event fidelity** (ongoing, supports all lanes):
   - Add instrumentation where first-divergence evidence is thin.
   - Keep instrumentation behavior-neutral (no gameplay side effects).

## Non-Negotiable Rules

1. Instrumentation must not change gameplay semantics.
2. No suppression or normalization of real `--More--`, RNG, screen, typgrid, or
   cursor differences to improve pass rates artificially.
3. Replay core remains execution-simple; comparison flexibility belongs in
   comparator code.
4. Session fixtures are evidence artifacts, not hand-tuned outputs.
5. Re-recording a session is valid only when the C binary behavior changed;
   re-recording to match a JS bug is not permitted.

## Success Criteria

Operation More Needed is successful when all are true:

1. Remaining gameplay failures are reduced to an agreed merge threshold, with
   first-divergence clusters materially narrowed and documented.
2. Cursor channel is captured and compared for gameplay suites.
3. `--More--` handling is explicit in sessions and correctly replayed with no
   suppression-era approximations remaining.
4. Re-recorded session corpus is stable and trusted as parity evidence.
5. `more-needed` is merged into `main` with maintainer sign-off.

## Merge Gate

Before merging `more-needed` into `main`:

1. Keep unit/infra gates green (or explicitly document blockers).
2. Demonstrate gameplay parity improvement against the Iron Parity baseline.
3. Publish a short merge note summarizing:
   - what changed architecturally (async message flow, event logging, session re-recording),
   - which parity channels improved (events, screens, colors, cursor),
   - remaining known gaps and follow-up issues.

## Related Documents

1. [PROJECT_PLAN.md](../PROJECT_PLAN.md)
2. [docs/COMPARISON_PIPELINE.md](COMPARISON_PIPELINE.md)
3. [docs/CURSOR_PLAN.md](CURSOR_PLAN.md)
4. [docs/IRON_PARITY_PLAN.md](IRON_PARITY_PLAN.md)
