# Mapbuilding Parity Final Plan

## Goal
Reach full NetHack C 3.7.0 parity for mapbuilding behavior in JS, including RNG/event/screen parity in targeted map-focused sessions and no regressions in the global test baseline.

## Scope
In scope:
- `mkmaze` water/air runtime behavior (`movebubbles`, `mv_bubble`, water lifecycle helpers)
- `mkmaze` special-fixup edge matrix (`baalz_fixup`, `fixup_special`, `check_ransacked`)
- Remaining map-generation side effects that affect parity timelines (vision/display/update ordering)

Out of scope for this plan:
- Non-map gameplay systems unless they are direct blockers for map parity sequencing

## Definition of Done
We consider mapbuilding parity complete when all are true:
1. No meaningful "Partial" gaps remain in map-critical `mkmaze` rows in `docs/CODEMATCH.md` (or any remaining partial is explicitly N/A with rationale).
2. Targeted deterministic bubble/fixup sessions show expected C ordering for RNG/events/screens.
3. Full test suite shows no regression versus current baseline fail count/category.
4. `docs/LORE.md` captures the durable lessons from each resolved hard case.

## Execution Strategy
- Work in small, test-guarded batches.
- For ambiguous behavior, validate against C source and targeted replay traces before changing code.
- Prefer fixing core JS behavior over harness changes.
- Keep temporary diagnostics behind env flags; remove or gate before finishing each batch.

## Workstreams

### A) Water/Air Runtime Parity (Highest Priority)
1. Bubble movement sequencing
   - Verify C order: setup portal, terrain reset, content pickup, move, redraw, content replace.
   - Close any ordering mismatches in `movebubbles`/`mv_bubble`.
2. Hero-in-bubble side effects
   - Ensure hero relocation, occupant displacement, and movement semantics match C timing.
3. Vision/display side effects
   - Align tile blocking/unblocking and post-move recompute timing with C intent.
4. Water lifecycle helpers
   - Finalize `save_waterlevel` / `restore_waterlevel` / `setup_waterlevel` / `unsetup_waterlevel` semantics.

### B) Special-Fixup Edge Matrix
1. `baalz_fixup` edge cases
   - Confirm nondiggable scan bounds, pool markers, ironbars exceptions, and monster relocation outcomes.
2. `fixup_special` matrix completeness
   - Revalidate medusa/priest/castle/minetown/ransacked/portal interactions and sequencing.
3. `check_ransacked` behavior
   - Ensure all required lookup modes and state transitions reflect C behavior and level naming assumptions.

### C) Focused Parity Sessions and Diagnostics
1. Add/refresh targeted sessions for:
   - Water plane arrival
   - In-bubble movement with collisions
   - Bubble content transport (objects/monsters/traps/hero)
   - Baalz fixup and minetown-ransacked paths
2. Use RNG step diff tooling to localize first mismatch for each new case.

### D) Final Hardening
1. CODEMATCH cleanup for remaining map partials.
2. Lore/documentation updates for non-obvious porting rules.
3. Final full-suite and targeted-session verification pass.

## Batch Checklist (Use Every Batch)
1. Make one cohesive change.
2. Run targeted unit/session tests for touched behavior.
3. Run full suite (`npm test --silent`) and confirm no regression in fail count/category.
4. Update `docs/CODEMATCH.md` and `docs/LORE.md` if behavior/coverage changed.
5. Commit and push validated increment.

## Immediate Next Batches
1. Water plane: tighten final hero/vision side-effect ordering in `movebubbles`/`mv_bubble` using focused trace sessions.
2. Baalz edge closure: complete remaining relocation/wallify corner-case parity details.
3. Fixup matrix sweep: recheck `fixup_special` branching and ransacked transitions against C.

## Risks and Mitigations
- Risk: chasing broad dependencies without closure.
  - Mitigation: require first-mismatch localization and targeted session evidence per batch.
- Risk: regressions from cross-module side effects.
  - Mitigation: keep changes incremental and verify full-suite baseline each batch.
- Risk: overfitting tests instead of behavior.
  - Mitigation: C source remains source of truth; no comparator masking.
