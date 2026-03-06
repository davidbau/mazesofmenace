# Issue 260 Gate 1: postmov C->JS Ordering Ledger (2026-03-06)

## Canonical C flow (source of truth)

Primary references:

- `nethack-c/patched/src/monmove.c:m_move()`
- `nethack-c/patched/src/monmove.c:postmov()`

High-level C sequence:

1. `m_move()` performs path selection and raw movement placement.
2. `m_move()` returns via `postmov(...)` for major paths (pet, covetous, special movers, regular).
3. `postmov()` handles post-move sequencing for `MMOVE_MOVED`:
   - `newsym(old)`
   - `mintrap(...)`
   - door/bars handling
   - dig handling (`mdig_tunnel`)
   - final redraw (`newsym(new)` when appropriate)
4. `postmov()` then handles shared moved/done tail:
   - object eating/pickup (`mpickstuff` etc.)
   - `maybe_spin_web()`
   - hide-under reevaluation + redraw

Important order in C `postmov(MMOVE_MOVED)`:

1. old-tile redraw
2. trap resolution
3. door/bars
4. dig
5. final redraw/update

## Current JS flow (2026-03-06)

Primary references:

- `js/monmove.js:dochug()`
- `js/monmove.js:m_move()`
- `js/monmove.js:apply_dochug_postmove()`

Observed JS structure:

1. `dochug()` calls `m_move()` for non-pets.
2. `m_move()` currently performs movement and includes:
   - `maybe_spin_web()` inline
   - `mdig_tunnel()` inline (gated by `ALLOW_DIG`)
   - door open handling inline
   - returns `MMOVE_MOVED`
3. `dochug()` then calls `apply_dochug_postmove()` when movement occurred:
   - `m_postmove_effect(...)`
   - `newsym(old)`
   - `mintrap_postmove(...)`
   - `newsym(new)`

Pet path (`dog_move`) in `dochug()`:

1. run `dog_move(...)`
2. if moved status, run `mdig_tunnel(...)` first
3. then `apply_dochug_postmove(...)` with `mintrap_postmove(...)`

## Gate 1 mismatch inventory

1. `m_move()` in JS performs `maybe_spin_web` before trap resolution.
   - C does web in `postmov` moved/done tail, after trap/door/dig block.

2. `m_move()` in JS performs dig handling before `mintrap_postmove`.
   - C order in `postmov`: trap before dig.

3. `m_move()` in JS performs door handling before `mintrap_postmove`.
   - C order in `postmov`: trap before door/bars.

4. Pet path in JS does dig before trap (`dog_move` path).
   - C `postmov` ordering is still trap before dig for moved pets.

5. Post-move responsibilities are split across:
   - `m_move()` inline logic
   - `dochug()` post wrapper
   - pet-only ad hoc branch
   - unused `postmov(...)` helper
   This fragmentation increases branch drift risk.

6. Dig gate source differs:
   - C uses `can_tunnel` (derived from monster traits, then adjusted by local conditions).
   - JS currently gates with `ALLOW_DIG` in `m_move()`, which is not equivalent.

## What looked promising but is not yet safe

- A broad local reorder patch aligning trap-before-dig moved `seed325` frontier from ~238 to ~309.
- The same patch regressed overall gameplay baseline from 7 failing sessions to 11.
- Isolated micro-slices did not preserve the seed325 gain alone.

Conclusion: the intended direction is likely correct, but current patch shape is too coupled.

## Gate 2/3 execution constraints

1. Build one explicit JS post-move pipeline callable from both pet and non-pet paths.
2. First land pure structural refactor with no behavior intent change.
3. Then move one semantic block at a time to C order:
   - trap ordering first
   - then door/bars
   - then dig gate/order
   - then web/hideunder tail placement
4. Validate after each block on:
   - `seed325`, `seed327`, `seed328`
   - global `scripts/run-and-report.sh --failures`
5. Reject any step that increases failing-session count without compensating clear frontier gain and root-cause explanation.

