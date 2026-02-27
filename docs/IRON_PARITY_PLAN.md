# IRON_PARITY_PLAN.md

## Campaign Name
Operation Iron Parity

## Mission
Achieve durable C-faithful gameplay parity by combining:

1. canonical runtime-state alignment under `game.*`, and
2. rule-driven mechanical translation for scalable porting.

This campaign treats green tests as guardrails, not the goal. The goal is faithful C behavior and architecture.

## Source Plans

1. State refactor plan: [C_FAITHFUL_STATE_REFACTOR_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_FAITHFUL_STATE_REFACTOR_PLAN.md)
2. Translator architecture: [C_TRANSLATOR_ARCHITECTURE_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_ARCHITECTURE_SPEC.md)
3. Translator parser strategy: [C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md)
4. Coverage ledger: [CODEMATCH.md](/share/u/davidbau/git/mazesofmenace/game/docs/CODEMATCH.md)
5. Parity debugging workflow: [RNG_ALIGNMENT_GUIDE.md](/share/u/davidbau/git/mazesofmenace/game/docs/RNG_ALIGNMENT_GUIDE.md)
6. Learnings: [LORE.md](/share/u/davidbau/git/mazesofmenace/game/docs/LORE.md)

## Strategic Thesis

1. State refactor is the foundation.
2. Translator is the force multiplier.
3. Translator coverage only scales after canonical state is stable.
4. Every increment must hold or improve replay parity evidence.

## Campaign Outcomes

Primary outcomes:

1. Canonical C-shaped runtime state under `game.*` in parity-critical modules.
2. Measurable reduction in hidden-state divergence classes.
3. Mechanical translation pipeline producing safe, reviewable patches for large portions of C gameplay code.

Secondary outcomes:

1. Faster function-surface closure in CODEMATCH.
2. Lower manual churn for repetitive ports.
3. Better long-term maintainability with explicit translation policies and boundary contracts.

## Non-Negotiable Constraints

1. No comparator exceptions that hide real mismatches.
2. No synthetic replay behavior that changes semantics.
3. No big-bang refactor without parity gates.
4. No widening of legacy mirror state paths.
5. Headless replay speed remains high; animation timing is boundary-correct but skippable in headless.

## Program Structure

Run three coordinated workstreams:

1. Workstream A: State Canonicalization
2. Workstream B: Translator Infrastructure
3. Workstream C: Parity Operations and Governance

## Workstream A: State Canonicalization

Objective:

1. Move parity-critical ownership to canonical namespaces (`game.u`, `game.svc.context`, `game.flags`, `game.iflags`, `game.gd`, `game.gm`, `game.gn`, `game.lev`).

Module priority:

1. Tier 1: `hack.js`, `allmain.js`, `cmd.js`, `monmove.js`, `mon.js`, `uhitm.js`, `mhitu.js`, `mhitm.js`, `trap.js`
2. Tier 2: `dungeon.js`, `mkroom.js`, `makemon.js`, `u_init.js`, `sp_lev.js`, `bones.js`
3. Tier 3: display/animation/input-edge consistency files

Exit conditions for A:

1. Tier 1 modules contain no active legacy mirror ownership.
2. Alias invariants validated in CI/debug.
3. Session pass count stable or improved versus baseline.

## Workstream B: Translator Infrastructure

Objective:

1. Build and deploy project-specific C-to-JS translator with deterministic rule tables and risk controls.

Required assets:

1. `tools/c_translator/rulesets/*` rule tables and schemas
2. coverage policy manifest: `tools/c_translator/rulesets/file_policy.json`
3. policy checker: `scripts/check-translator-file-policy.mjs`
4. annotation-driven mixed-file controls (`TRANSLATOR: AUTO/MANUAL/MANUAL-BEGIN/MANUAL-END`)

Translation policy classes:

1. `manual_only` for runtime/platform/harness glue
2. `generated_data` for generated tables and static data
3. `mixed` with annotation-derived allowlist
4. `auto` for gameplay modules

Exit conditions for B:

1. Schema + rule loader stable.
2. Translator regression tests in place.
3. Pilot files translated with no parity regression.

## Workstream C: Parity Operations and Governance

Objective:

1. Keep campaign evidence-driven with reproducible parity deltas and tight rollback paths.

Operational loop:

1. Capture baseline metrics (all sessions, gameplay subset, failing session taxonomy).
2. Apply scoped batch.
3. Run gates.
4. Record deltas (first divergence step, RNG/events matched prefixes, pass counts).
5. Update docs and issue tracker.

Governance rules:

1. No merge without evidence artifact.
2. Any regression requires explicit disposition:
   1. fix immediately,
   2. rollback,
   3. documented known regression with approved follow-up issue.

## Integrated Phase Plan

Shared milestone IDs in this table are authoritative for all three planning docs.
`C_FAITHFUL_STATE_REFACTOR_PLAN.md` and translator specs must reference these IDs.

| Milestone | Scope lead | Exit gate |
| --- | --- | --- |
| M0 | Baseline + policy/CI guardrails | Baseline reproducible; policy checks green |
| M1 | Canonical state spine | No regression in unit/sessions; alias invariants active |
| M2 | Movement/turn canonicalization | Movement-divergence seeds stable/improving |
| M3 | Translator alpha (safe subset) | Idempotence + static gates green |
| M4 | Combat/monster + translator pilot | Targeted parity stable/improving |
| M5 | Generation/startup + translator expansion | Early-step divergence class improved |
| M6 | Boundary hardening + legacy removal | Campaign metrics stable; docs synchronized |

## Phase 0: Baseline and Tooling Guardrails

Deliver:

1. Baseline parity report.
2. Failing-session divergence taxonomy by `file:function`.
3. CI checks for translator file-policy completeness.

Gate:

1. Current baseline captured and reproducible.

## Phase 1: Canonical State Spine

Deliver:

1. Canonical `game.*` namespaces established.
2. Transitional alias checks active.
3. No new mirrors introduced.

Gate:

1. Unit and session suites non-regressing.

## Phase 2: Movement/Turn Control Canonicalization

Deliver:

1. `hack.js`, `cmd.js`, `allmain.js` movement/run/travel paths on canonical state.
2. Legacy sync glue reduced/removed.

Gate:

1. Movement-centric failing seeds stable or improved.

## Phase 3: Translator Alpha (Safe Subset)

Deliver:

1. Translator end-to-end pipeline operational.
2. Rule tables loaded and validated.
3. Pure/helper function translation proven.

Gate:

1. Idempotence and static checks pass.

## Phase 4: Combat/Monster Core Canonicalization + Translator Pilot

Deliver:

1. Canonicalization of combat and monster turn core paths.
2. Translator pilot for selected `hack.c`, `monmove.c`, `uhitm.c` functions.

Gate:

1. No parity regression on targeted seeds; at least one divergence cluster improves.

## Phase 5: Generation/Startup Canonicalization + Translator Expansion

Deliver:

1. Startup and generation ownership aligned (`u_init`, `dungeon`, `makemon`, `sp_lev`, `bones`).
2. Translator expands to additional `auto` modules.

Gate:

1. Early-step divergence class improved.

## Phase 6: Boundary Hardening and Legacy Path Elimination

Deliver:

1. Mixed-file boundaries fully annotation-managed.
2. Remaining legacy mirrors removed in Tier 1.
3. Documentation finalized and synchronized.

Gate:

1. Stable campaign-level parity metrics and clean policy checks.

## Artifacts and Evidence Required Per Batch

1. Changed files and rationale.
2. Unit test result summary.
3. Session test summary:
   1. overall pass/fail
   2. gameplay subset pass/fail
   3. top failing divergences with `file:function`.
4. Delta note:
   1. improved/unchanged/regressed seeds
   2. reasoned explanation for changes.

## Metrics Dashboard (Minimum)

1. `sessions_passed_total`
2. `gameplay_passed_total`
3. `failing_gameplay_count`
4. median first RNG divergence step (failing gameplay set)
5. median first event divergence index (failing gameplay set)
6. top-10 divergence origins by frequency (`file:function`)

## Risks and Countermeasures

1. Risk: State migration introduces hidden behavior drift.
   1. Countermeasure: small batches + focused parity reruns + rapid rollback.
2. Risk: Translator rules overfit and mis-translate edge cases.
   1. Countermeasure: strict-mode conflicts + risk scoring + manual-required high-risk paths.
3. Risk: Mixed-file boundaries become stale.
   1. Countermeasure: annotation-first policy + CI enforcement.
4. Risk: Development velocity drops due to process overhead.
   1. Countermeasure: keep artifacts lightweight and script-assisted.

## Decision Framework for “Should This Be Auto-Translated?”

Auto-translate if all are true:

1. file policy is `auto` or `mixed` with annotation-allowed region/function,
2. no unresolved parity-critical macros/symbols,
3. boundary semantics resolved by table rules,
4. risk score below configured threshold.

Manual required if any are true:

1. `manual_only` or `generated_data` policy,
2. unresolved boundary/async rule,
3. high-risk control-flow transform not proven for this pattern,
4. translation touches blocked mixed-file region.

## Rollback Strategy

1. Keep changes in small commits aligned to one module cluster.
2. If parity regresses, revert the offending batch cleanly.
3. Preserve diagnostics artifacts so the same bug is not reintroduced.

## Completion Criteria for Operation Iron Parity

1. Canonical state ownership complete for Tier 1 and Tier 2 modules.
2. Translator v1 operational and trusted on safe/high-value subsets.
3. Remaining non-translated zones are explicitly policy-marked and justified.
4. Replay parity trend is stable/improving with reduced hidden-state divergence clusters.
5. All campaign plan docs remain synchronized and current:
   1. [C_FAITHFUL_STATE_REFACTOR_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_FAITHFUL_STATE_REFACTOR_PLAN.md)
   2. [C_TRANSLATOR_ARCHITECTURE_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_ARCHITECTURE_SPEC.md)
   3. [C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md)
   4. [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md)
