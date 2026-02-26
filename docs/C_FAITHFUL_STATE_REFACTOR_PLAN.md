# C-Faithful State Refactor Plan

Campaign umbrella: [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md)

## Purpose
Refactor JS runtime state to mirror NetHack C gameplay state semantics closely enough that:

1. Core gameplay code can be ported with near-1:1 structure and naming.
2. RNG/event/screen parity improves by reducing hidden state-model drift.
3. Translator-assisted porting becomes practical for nontrivial functions.

This is a **state model refactor**, not a comparator/harness workaround.

## Scope
In scope:

1. Canonical runtime state shape aligned to C globals/struct groups.
2. Explicit aliasing contracts where C relies on shared mutable references.
3. Migration of core gameplay modules to direct canonical-state reads/writes.
4. Minimal adapter boundaries for async/browser/headless/persistence.
5. Parity-focused verification and rollout.

Out of scope:

1. Literal C memory layout replication.
2. Rewriting comparator semantics to hide divergences.
3. Big-bang replacement of all modules in one change.

## Success Criteria
Primary:

1. No regressions in unit tests and session suite stability.
2. Increased first-divergence step and matched RNG/event prefixes in failing gameplay sessions.
3. Reduced “same function, different hidden state” divergence class.

Secondary:

1. Fewer JS-only wrapper helper paths inside core engine modules.
2. More direct C function/body porting with low adaptation overhead.
3. Clear documentation of remaining intentional JS differences.

## Core Design Principles

1. Canonical state first. Core logic reads/writes canonical state directly.
2. Wrappers at edges only. Keep wrappers for I/O, rendering, timing, persistence.
3. Preserve C semantics over JS ergonomics in parity-critical code.
4. Keep refactors incremental with parity checkpoints after each batch.
5. Make alias behavior explicit and testable.

## Current Pain Points (Why This Refactor)

1. State spread across `game`, `player`, `map`, module locals, and legacy compatibility fields.
2. Duplicate mirrors (`runMode` vs `context.run`, `traveling` vs `context.travel`) drift.
3. Wrapper logic in core call chains introduces ordering side effects.
4. Async boundaries sometimes couple to core state in ad hoc ways.
5. Divergences often occur from subtle state/order mismatch, not missing function names.

## Current Implementation Snapshot and Migration Inventory

This section captures what exists today and what must be migrated.

## Current state reality (as of this plan)

1. Core state is split across:
   1. `game` object fields.
   2. `player` object fields.
   3. `map` runtime structures.
   4. module-local helper state and legacy compatibility fields.
2. `hack.js` currently uses a compatibility bridge (`ensure_context`) to keep:
   1. `game.context` / `context.run|travel|travel1|nopick|forcefight...`
   2. legacy mirrors (`game.runMode`, `game.traveling`, `game.forceFight`, `game.menuRequested`)
   in sync.
3. Movement logic has partial C-structure alignment, but still mixes:
   1. canonical-ish context reads
   2. compatibility fields
   3. JS-specific fallback behavior.
4. Combat and monster-turn logic (`uhitm.js`, `monmove.js`, `mon.js`, `dogmove.js`, `muse.js`) still rely on mixed ownership patterns and are major first-divergence sources.
5. Generation/startup state (`u_init.js`, `dungeon.js`, `makemon.js`, `sp_lev.js`, `bones.js`) remains partially decoupled from a single canonical state spine.

## Progress update (2026-02-26)

Completed incremental migrations in code:

1. Canonical aliases are live in engine bootstrap (`game.u`<->`game.player`, `game.lev`<->`game.map`, `game.context`<->`game.svc.context`).
2. Core movement-prefix ownership migrated to `game.svc.context` in command/movement paths.
3. Broad read-path preference updated across core modules to use canonical namespaces first (`game.u`, `game.lev`).
4. Write-sites for level/player transitions now use canonical assignments (`game.u = ...`, `game.lev = ...`) in chargen and level-change flows.
5. Trap constants were deduplicated to a single source (`config.js`), with `symbols.js` re-exporting canonical values.
6. Terrain/door constants were likewise deduplicated to `config.js` with `symbols.js` re-export aliases to avoid value drift.

## Known active divergence clusters (from failing gameplay sessions)

1. Monster action/movement stack:
   1. `mon.js:allocateMonsterMovement`
   2. `monmove.js:dochug/m_move`
   3. `dogmove.js:dog_move`
   4. `muse.js:use_defensive`
2. Combat ordering/state:
   1. `uhitm.js:playerAttackMonster` call chain from `hack.js:domove_attackmon_at`
3. Generation/startup:
   1. `u_init.js:ini_inv`
   2. `makemon.js:makemon/enexto_core`
   3. `sp_lev.js:get_location_coord/withTrapMidlog`
   4. `dungeon.js:makelevel`
   5. `bones.js:getbones`

## Migration matrix (what to move, where)

1. Movement/context fields:
   1. Current: mixed `game.*` and `game.context.*` with sync glue.
   2. Target: `game.svc.context.*` only in core logic.
   3. Work: remove mirror writes; make legacy names read-only aliases during transition.
2. Hero state:
   1. Current: `player.*` with additional `game.*` cross-links.
   2. Target: canonical `game.u.*` with direct mutation in core modules.
   3. Work: convert core call signatures to consume `game`/`game.u`.
3. Turn/multi state:
   1. Current: `game.multi`, `game.multi_reason`, message state spread.
   2. Target: canonical `game.gm`, `game.gn`.
   3. Work: rehome `nomul/unmul/stop_occupation`-adjacent state.
4. Movement result bookkeeping:
   1. Current: mixed per-function locals and `game` flags.
   2. Target: canonical `game.gd.domove_*`.
   3. Work: unify status writes and reads to one namespace.
5. Level runtime state:
   1. Current: `map` plus extra per-module caches/state.
   2. Target: canonical `game.lev` ownership; temporary `map` compatibility aliases only during migration.
   3. Work: centralize trap/object/monster list ownership and mutation paths.
6. Generation context:
   1. Current: cross-module options/state passing plus per-file defaults.
   2. Target: canonical generation context in `game` passed through creation pipeline.
   3. Work: remove hidden per-file initialization and duplicate defaults.

## Target Canonical State Model

Create canonical state namespaces matching C conceptual groups. These are JS objects, but treated as authoritative C-like globals:

1. `game.u` — hero struct (`u.*` semantics).
2. `game.flags` — gameplay/user flags (`flags.*`).
3. `game.iflags` — interface/input flags (`iflags.*`).
4. `game.svc.context` — transient command/move context (`svc.context.*`).
5. `game.gd` — movement/turn-local domain state (`gd.*`).
6. `game.gm` — multi-turn action state (`gm.*`).
7. `game.gn` — top-line/message state (`gn.*`).
8. `game.lev` — level map state (`levl[][]`, trap/object/monster lists, regions).
9. `game.sv*` families — long-lived world and level state where applicable (`svm`, `svl`, etc., as practical).

Canonical container:

1. Use `game` as the runtime source of truth (single canonical umbrella).
2. Canonical C-shaped namespaces live directly under `game`.
3. Core modules consume `game` or canonical slices, not duplicated mirrors.

## Alias Contract (Critical)

### Required alias behavior

For parity-critical fields, multiple paths must resolve to the same mutable object/slot:

1. `game.context` aliases `game.svc.context` during migration, then `game.context` is retired.
2. `game.player` aliases `game.u` for shared fields or provides strict mapped proxy with zero behavioral logic, then legacy shape is retired.
3. Legacy fields (`game.runMode`, `game.traveling`, `game.forceFight`) become direct alias accessors to canonical fields, then are retired.
4. Map accessors (`map.at`, `map.trapAt`, `map.monsterAt`) operate on canonical level state.

### Alias invariants

1. Write-through: mutation by any alias path is visible through all aliases in same tick.
2. No mirror lag: no batched syncing between core aliases.
3. No split ownership for parity-critical fields.

## Edge-Boundary Policy

Keep adapters only at:

1. Input and prompt API (`nhgetch`, yes/no prompts, getpos async loop).
2. Display/windowport/rendering APIs.
3. Delay/timing (`nh_delay_output*`) and animation scheduling.
4. Save/load serialization.
5. Browser/headless bootstrap lifecycle.

Rules:

1. Edge adapters may translate format, not gameplay semantics.
2. Edge adapters must not reorder core state mutation relative to C-equivalent call points.

## Module Refactor Strategy

### Tier 1 (highest parity impact)

1. `hack.js`
2. `monmove.js`
3. `mon.js`
4. `uhitm.js`
5. `mhitu.js`
6. `mhitm.js`
7. `trap.js`
8. `allmain.js` (turn-loop/state ownership only)

### Tier 2 (high setup/generation impact)

1. `dungeon.js`
2. `mkroom.js`
3. `makemon.js`
4. `u_init.js`
5. `sp_lev.js`
6. `bones.js`

### Tier 3 (supporting correctness and cleanup)

1. `display.js`
2. `animation.js`
3. `getpos.js`
4. `storage.js`
5. `headless.js`

## Detailed Work Plan

Milestone alignment:

1. This plan maps to [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md) milestones `M0` through `M6`.
2. Any phase/gate update here must keep milestone IDs and exit gates consistent with the umbrella matrix.

## Phase 0: Baseline and Guardrails

1. Snapshot current parity metrics for all gameplay sessions.
2. Snapshot failure taxonomy by first divergence origin (`file:function`).
3. Add state-introspection debug dump for canonical namespaces at step boundaries.
4. Define “no-regression” gate:
   1. Unit tests must remain green.
   2. Session pass count cannot drop.
   3. Failing sessions cannot regress first-divergence step without documented cause.

Deliverables:

1. Baseline report artifact.
2. Debug hooks for canonical state inspection.

## Phase 1: Canonical State Spine

1. Introduce canonical namespaces under `game`.
2. Wire current state into canonical slots without changing behavior.
3. Create strict alias bridge:
   1. `game.context -> game.svc.context`
   2. `game.flags -> game.flags` canonical ownership (remove duplicates)
   3. `game.iflags -> game.iflags` canonical ownership (remove duplicates)
4. Add runtime assertions for alias identity in debug mode.

Deliverables:

1. Canonical namespace bootstrap under `game`.
2. Alias assertions and migration doc comments.

Exit criteria:

1. All tests green.
2. No parity drop.

## Phase 2: Context and Movement State Unification

Target files:

1. `hack.js`
2. `cmd.js`
3. `allmain.js`

Tasks:

1. Remove duplicated run/travel/forcefight state paths.
2. Make all movement and run logic read `game.svc.context` directly.
3. Ensure `nomul/end_running/runmode_delay_output/domove*` share canonical state.
4. Eliminate sync glue (`ensure_context`-style fallback logic) once aliases are strict.

Exit criteria:

1. No mirror sync code for movement context.
2. Stable or improved parity on movement-centric failing seeds.

## Phase 3: Combat State and Attack Pipeline Alignment

Target files:

1. `uhitm.js`
2. `mhitu.js`
3. `mhitm.js`
4. `monmove.js`

Tasks:

1. Make combat code consume canonical hero/monster state directly.
2. Align attack side-effect ordering with C:
   1. prechecks
   2. hit/miss
   3. passive
   4. wake/flee/reaction
   5. messaging
3. Remove core wrappers that mutate before/after attack calls.

Exit criteria:

1. Reduced divergences rooted at combat callsites.
2. No new unit regressions in combat/message tests.

## Phase 4: Monster Turn and Movement Allocation Alignment

Target files:

1. `mon.js`
2. `monmove.js`
3. `dogmove.js`
4. `muse.js`

Tasks:

1. Canonicalize monster movement budget and per-turn transient state.
2. Ensure consistent ordering for:
   1. movement allocation
   2. goal selection
   3. flee/path checks
   4. action execution
3. Keep all reads/writes on canonical monster/map state.

Exit criteria:

1. Improved failing seeds with `movemon/dochug/dog_move` first divergences.

## Phase 5: Generation and Startup State Alignment

Target files:

1. `u_init.js`
2. `dungeon.js`
3. `mkroom.js`
4. `makemon.js`
5. `sp_lev.js`
6. `bones.js`

Tasks:

1. Canonicalize startup/generation context and remove ad hoc per-file state copies.
2. Align deterministic generation state writes to C order.
3. Ensure all startup inventory/trap/object generation code uses canonical RNG context and state writes.

Exit criteria:

1. Improvement in early-step divergences (step 1–10 class).

## Phase 6: Region, Trap, and Terrain Transition State

Target files:

1. `trap.js`
2. `region.js`
3. `hack.js` terrain transition helpers

Tasks:

1. Canonicalize trap/region transition state and confirmation gates.
2. Align transition and side-effect ordering (message/nomul/move flags).
3. Ensure trap state discovery/visibility flags are canonical.

Exit criteria:

1. Reduced event-order drifts around trap/region interactions.

## Phase 7: Display and Animation Boundary Contract

Target files:

1. `display.js`
2. `animation.js`
3. callers in `hack.js`, `mthrowu.js`, `dothrow.js`, `zap.js`, `explode.js`

Tasks:

1. Keep display/animation as edge layer, but bind to canonical state snapshots.
2. Ensure display updates occur at C-equivalent lifecycle points.
3. Preserve headless fast mode by skipping real delays while maintaining boundary semantics.

Exit criteria:

1. No added RNG consumption due to display logic.
2. Stable replay timing boundaries across interactive/headless modes.

## Phase 8: Legacy Path Removal

Tasks:

1. Remove deprecated mirrors and compatibility fields.
2. Delete fallback sync logic no longer needed.
3. Enforce canonical-state-only access in Tier 1 modules.

Exit criteria:

1. Lint/static checks pass for forbidden legacy paths.
2. CODEMATCH notes updated to describe canonical state architecture.

## Data Model Specification

## Canonical namespaces (initial draft)

1. `game.u`:
   1. Position and movement: `ux`, `uy`, `ux0`, `uy0`, `dx`, `dy`, `umoved`.
   2. Trapped/sticky/swallow state.
   3. HP/PW and condition flags.
   4. Inventory/equipment references.
2. `game.svc.context`:
   1. `run`, `travel`, `travel1`, `nopick`, `forcefight`, `door_opened`, `move`.
   2. Other transient command flags used in movement/combat.
3. `game.gd`:
   1. `domove_attempting`, `domove_succeeded`.
4. `game.gm`:
   1. `multi`, `multi_reason`.
5. `game.gn`:
   1. `nomovemsg`, message-chain metadata as needed.
6. `game.flags` and `game.iflags`:
   1. Option flags affecting core decisions.
7. `game.lev`:
   1. Tile grid.
   2. trap/object/monster lists.
   3. level-specific runtime state.

## Ownership rules

1. Core gameplay modules own mutations on canonical `game` namespaces.
2. Edge modules may observe and render from canonical `game` snapshots.
3. Persistence modules serialize/deserialize canonical `game` namespaces via explicit schema map.

## Mutation and Ordering Rules

1. Preserve C order where behavior depends on side effects.
2. No helper may perform hidden side effects unless C-equivalent and documented.
3. If helper must adapt shape, adaptation is data-only and deterministic.
4. Async boundaries must not interleave extra core state mutations.

## Verification Plan

## Automated checks

1. Alias identity checks:
   1. Assert `game.context === game.svc.context` during transition.
   2. Assert canonical references for flags and state slices.
2. Forbidden mirror writes:
   1. Static grep/lint rule to block writes to deprecated mirror fields.
3. Deterministic snapshot checker:
   1. Dump selected canonical fields at divergence step for C/JS comparison.

## Test gates per phase

1. `npm run -s test:unit`
2. `node test/comparison/session_test_runner.js`
3. `node test/comparison/session_test_runner.js --type=gameplay`
4. Focused reruns for impacted seeds with verbose divergence traces.

## Acceptance thresholds

1. No drop in passed session count.
2. No new first-divergence-at-step-1 failures.
3. At least one targeted divergence cluster improves per major phase.

## Risk Register and Mitigation

1. Risk: Broad alias refactor causes hidden regressions.
   1. Mitigation: phase gates, small commits, per-phase parity checkpoints.
2. Risk: Async paths accidentally reorder state writes.
   1. Mitigation: explicit async boundary policy and turn-step snapshots.
3. Risk: Temporary dual-path period increases complexity.
   1. Mitigation: strict deprecation schedule and fast removal of mirrors.
4. Risk: Save/load compatibility break.
   1. Mitigation: schema adapter and migration test fixtures.

## Documentation and Process Updates

Required updates as phases complete:

1. `docs/CODEMATCH.md`:
   1. note canonical state architecture status for `hack.c`, `monmove.c`, `allmain.c` mappings.
2. `docs/LORE.md`:
   1. add findings on aliasing/order pitfalls encountered.
3. `docs/DEVELOPMENT.md`:
   1. add canonical-state debugging workflow.

## Implementation Sequencing (Concrete Initial Backlog)

Batch A:

1. Introduce canonical namespaces under `game` in bootstrap.
2. Alias `game.context` and movement fields to canonical context.
3. Add debug assertions for alias identity.

Batch B:

1. Refactor `hack.js` movement path to canonical state only.
2. Remove legacy movement mirrors.
3. Re-run full gameplay sessions and report divergence deltas.

Batch C:

1. Refactor `monmove.js` and `mon.js` turn allocation paths to canonical state.
2. Remove duplicated movement budget state.
3. Re-run targeted failing seeds and full gameplay suite.

Batch D:

1. Refactor `uhitm.js`/`mhitu.js` ordering and canonical mutation points.
2. Validate combat-heavy seeds.

Batch E:

1. Refactor generation/startup ownership in `u_init.js`/`dungeon.js`/`sp_lev.js`.
2. Validate step-1 divergence class.

## Done Definition

The refactor is complete when:

1. Tier 1 modules have no legacy state mirrors.
2. Canonical namespaces own all parity-critical state.
3. Edge-only wrappers remain at I/O/render/timing/persistence boundaries.
4. Session parity metrics are stable or improved with documented gains.
5. Docs (`CODEMATCH`, `LORE`, `DEVELOPMENT`) reflect final architecture.

## Notes on Translator Integration

After Phase 2:

1. Introduce translator-generated skeletons for selected C files.
2. Require generated code to target canonical namespaces directly.
3. Keep generated output behind parity gates; never bypass behavior review.

This sequencing avoids generating code against unstable state APIs.
