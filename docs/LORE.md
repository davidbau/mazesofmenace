# LORE: Porting and Parity Knowledge Base

This document captures durable porting knowledge for C NetHack 3.7.0 parity work.
Use this as a practical guide for debugging, triage, and implementation choices.

## 1. Scope and Rules
1. C NetHack 3.7.0 behavior is the source of truth.
2. Fix gameplay mismatches in core JS logic, not by comparator/harness exceptions.
3. Harness responsibilities are limited to:
   - deterministic setup
   - high-signal diagnostics
   - fast, faithful replay
4. Never normalize away real divergences (RNG/state/typgrid/screens).

## 2. Determinism Invariants
For reproducible C-vs-JS comparison, keep these fixed:
1. PRNG seed
2. datetime
3. terminal geometry (80x24 for tty parity paths)
4. options/symbol mode (ASCII vs DECgraphics)
5. deterministic ordering where C relies on platform-sensitive behavior

If any invariant differs, treat resulting mismatch as environment drift first.

## 3. C-to-JS Structural Map (Quick Orientation)
Use C source as spec and JS as implementation target.

1. `allmain.c` -> `js/nethack.js`
2. `rnd.c` -> `js/rng.js` + `js/isaac64.js`
3. `mklev.c`, `mkroom.c`, `sp_lev.c` -> `js/dungeon.js`, `js/sp_lev.js`
4. `makemon.c`, `monmove.c`, `dog.c` -> `js/makemon.js`, `js/monmove.js`, `js/dog.js`
5. `mkobj.c`, `o_init.c` -> `js/mkobj.js`, `js/o_init.js`
6. command and UI behavior (`cmd.c`, tty flows) -> `js/commands.js`, `js/display.js`, `js/input.js`, pager/menu modules

When debugging, identify the first diverging subsystem and read that C path before editing JS.

## 4. Session and Trace Principles
1. Session keys are canonical and explicit (startup, menus, `--More--`, gameplay).
2. Replay should inject no synthetic decisions beyond recorded keys.
3. High-detail evidence at divergence is mandatory:
   - RNG context
   - typgrid/map context (when relevant)
   - screen context
   - step/action context
4. Prefer one canonical session format across manual/wizard/selfplay capture.

Reference: `docs/SESSION_FORMAT_V3.md` (current baseline semantics).

## 5. Seed Catalog by Debug Purpose
These seeds/sessions are useful because they expose specific parity risks quickly.

1. Startup/interface/chargen
   - startup/options/chargen session families under `test/comparison/sessions/`
2. Depth-1 to multi-depth map alignment
   - map session families under `test/comparison/maps/` (including seeds used in depth studies such as 16/72/119/163/306)
3. Gameplay progression and combat/item interplay
   - seed gameplay sessions (including seed1/seed2/seed42 families)
4. Pet movement and combat interaction
   - seed1 gameplay and pet divergence investigations (`docs/bugs/pet-ai-rng-divergence.md`)
5. Non-wizard gameplay parity
   - `docs/NONWIZARD_PARITY_NOTES_2026-02-17.md`
6. Human long-play style references
   - seed5/seed6 converted sessions for exploration/tempo comparison

Keep this catalog updated as new high-signal seeds are discovered.

## 6. Common Divergence Signatures -> Likely Causes
1. Early startup RNG mismatch
   - Usually environment/options mismatch (wizard flag, datetime, terminal/symbol config)
2. Typgrid matches but RNG later diverges
   - Hidden side effect ordering difference; candidate acceptance/rejection path drift
3. RNG aligns for long prefix, then hard break
   - Single branch/ordering mismatch at first divergence call; inspect immediate C caller context
4. Screen mismatch with matching state
   - Rendering/symbol handling issue (DECgraphics/ascii, tty formatting path)
5. Pet/monster behavior drift during movement/combat
   - AI scan order, occupancy checks, or branch condition mismatch
6. Special-level localized mismatch (castle/quest/mines/etc.)
   - Script conversion parity gap, placement timing/order, or terrain-state precondition mismatch

## 7. Effective Debugging Workflow
1. Reproduce deterministically with fixed environment.
2. Locate first divergence index (not later cascades).
3. Classify type: RNG-only, state/typgrid, screen/UI, or mixed.
4. Inspect C function at first mismatch call site.
5. Patch JS core logic faithfully to C branch/order semantics.
6. Re-run targeted session, then broader suite to ensure non-regression.
7. Document root cause and retained fix in this file (or link to deeper write-up).

## 8. What Works vs What Fails
Effective patterns:
1. First-divergence triage and narrow-scope fixes
2. C-code-led implementation rather than trace-only guesswork
3. Session additions for low-coverage parity-critical paths
4. Frequent replay validation while porting

Anti-patterns to avoid:
1. Harness-side normalization to force pass
2. Special-case comparator logic for known bad seeds
3. Large multi-subsystem edits without intermediate validation
4. Treating later cascade differences as primary bug

## 9. High-Value References
1. `docs/DEVELOPMENT.md` (parity policy, workflow)
2. `docs/SESSION_FORMAT_V3.md` (session semantics)
3. `docs/RNG_ALIGNMENT_GUIDE.md` and `docs/PHASE_3_MULTI_DEPTH_ALIGNMENT.md` (RNG triage)
4. `docs/C_PARITY_WORKLIST.md` (active parity backlog)
5. `docs/bugs/pet-ai-rng-divergence.md` (pet-path lessons)
6. `docs/SPECIAL_LEVELS_PARITY_2026-02-14.md` and `docs/special-levels/` progress notes (special-level pitfalls)

## 10. Update Protocol
When adding lore, include:
1. Divergence signature
2. First known mismatch location (seed/session/step or RNG index)
3. Root cause summary in C terms
4. JS fix location
5. Validation evidence (targeted + broad)
6. Whether lesson is seed-specific or generalizable
