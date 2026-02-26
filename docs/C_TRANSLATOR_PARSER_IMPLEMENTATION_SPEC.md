# C_TRANSLATOR_PARSER_IMPLEMENTATION_SPEC.md

Campaign umbrella: [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md)

## Document Role

This document is the parser/frontend implementation spec:

1. parse/preprocess strategy,
2. macro provenance model,
3. CFG/control-flow lowering,
4. async inference mechanics,
5. parser-specific verification.

Translator program architecture and governance live in:

1. [C_TRANSLATOR_ARCHITECTURE_SPEC.md](/share/u/davidbau/git/mazesofmenace/game/docs/C_TRANSLATOR_ARCHITECTURE_SPEC.md)

## Purpose
Specify the concrete parser and semantic-lowering strategy for C-to-JS translation in this repository, with enough structure-awareness to:

1. preserve gameplay logic order,
2. model macros/preprocessor effects correctly,
3. insert async/await only where semantically required,
4. emit reviewable, parity-safe JS patches.

## Difficulty Assessment

Difficulty: high but tractable with a project-specific pipeline.

Why high:

1. NetHack C relies heavily on macros and global state.
2. Preprocessor and labels/goto alter apparent structure.
3. Async does not exist in C and must be introduced carefully in JS boundaries.

Why tractable:

1. Domain is bounded (known files, known coding patterns, known runtime model).
2. We can curate explicit rules for macros/globals/boundaries.
3. Replay parity gives objective acceptance criteria.

## Core Design

Use a dual-view parser model:

1. **Source View**: original C tokens/AST with macro invocations and labels preserved.
2. **PP View**: preprocessed expansion view to resolve ambiguous syntax and macro semantics.

Translator decisions are made from Source View, informed by PP View.

## Physical Implementation Decision

Parser/translator stack:

1. Primary implementation language: **Python**.
2. Primary parser frontend: **Clang/libclang** via `clang.cindex`.
3. Preprocessor companion view: `clang -E` output consumed by translator for cross-checking macro-expanded structure.
4. Rule execution, NIR, and emit pipeline: Python modules in `tools/c_translator/`.
5. Runtime verification bridge: invoke Node-based test/parity scripts after emit.

What we will not do:

1. No handwritten C parser.
2. No parser frontend that lacks robust preprocessing/macro provenance as the authoritative source.

## Frontend Architecture

## Parser stack

1. C parser frontend with full preprocessor integration.
2. Macro callback collector (definition + expansion sites).
3. Symbol indexer for globals, locals, statics, typedefs, enums.

## Required outputs per function

1. Raw AST subtree.
2. Token stream with source spans.
3. Expanded token stream with expansion provenance.
4. CFG skeleton (basic blocks + label edges + goto edges + switch edges).
5. Side-effect summary for each statement/expression.

## Preprocessor and Macro Model

## Macro data capture

Capture:

1. macro definition text,
2. argument list and variadic flags,
3. expansion token list,
4. invocation site and argument expressions,
5. nested expansion stack.

## Macro classification pipeline

Each macro is classified into:

1. `pure_predicate`
2. `value_expr`
3. `bitflag_expr`
4. `statement_like`
5. `control_annotation` (for example fallthrough markers)
6. `unsafe_or_unknown`

Classification sources:

1. `macro_semantics.yml` explicit entries,
2. structural inference from expansion tokens,
3. per-file overrides.

Policy:

1. `unsafe_or_unknown` in parity-critical paths => translation block + manual marker.
2. non-critical unknowns => scaffold TODO with diagnostic.

## Conditional compilation handling

1. Preserve active branch semantics for target build profile.
2. Emit explicit markers for compile-time excluded logic.
3. For parity-critical files, if multiple branches are runtime-relevant across modes, keep branch metadata in sidecar diagnostics.

## AST to NIR Lowering

Lower C AST to NIR with explicit semantics:

1. expression purity/effects,
2. read/write sets (globals + local + pointed targets),
3. call boundary classification,
4. short-circuit structure,
5. control edges.

NIR nodes must include:

1. `id`,
2. `kind`,
3. `span`,
4. `children`,
5. `effects`,
6. `rw_set`,
7. `control_predecessors`,
8. `control_successors`,
9. `annotations`.

## Control-Flow Reconstruction

## Labels and goto

Strategy:

1. Build CFG with explicit label nodes.
2. Detect reducible patterns:
   1. retry loops,
   2. early-exit ladders,
   3. state-machine switch dispatch.
3. Rewrite reducible patterns to structured JS (`while`, `for`, `switch`, `break`, `continue`).
4. For irreducible graph segments:
   1. emit manual-required marker, or
   2. emit explicit state-machine transform (only if rule-approved for file).

## Switch and fallthrough

1. Preserve original case ordering.
2. Convert C fallthrough intent into explicit JS fallthrough comments and validated control edges.
3. Reject unsafe transformations when intermediary side effects are ambiguous.

## Async/Await Inference

C has no async; JS requires explicit async at boundaries.

## Boundary-driven async rules

Use `boundary_calls.yml` as source of truth for async behavior:

1. awaited boundary (`always_await`)
2. conditional await (interactive-only, headless-skip)
3. no-wait boundary (must not become awaited)

## Async propagation algorithm

1. Mark direct callsites that require await.
2. Propagate async requirement up call graph for translated functions.
3. Stop propagation at manual-only boundaries (emit adapter requirement).
4. If propagation reaches non-translatable function in `auto` module, fail translation for that scope.

## Await placement constraints

1. Place await exactly on boundary call expression or explicit wrapper call required by rule.
2. Do not wrap adjacent logic in synthetic async blocks.
3. Maintain statement order around awaited calls.
4. Preserve headless skip semantics via boundary wrappers, not by deleting boundaries.

## State-Path Semantics

All global/state references must map to canonical `game.*` namespaces via `state_paths.yml`.

Rules:

1. unresolved global path in parity-critical function => hard failure.
2. write to deprecated mirror path => hard failure.
3. pointer/member alias paths must resolve to explicit canonical write target.

## Function Call Mapping

All C function calls are resolved through `function_map.yml`:

1. direct JS target,
2. arg mapping + injected context args,
3. sync/async mode,
4. return contract.

Unmapped call policy:

1. parity-critical scope => fail.
2. non-critical scope => scaffold + TODO + diagnostic.

## Unsupported Construct Policy

Unsupported constructs are explicit and tracked:

1. Emit `TRANSLATOR_UNSUPPORTED` marker with source span.
2. Assign risk score bump.
3. Route function to manual review queue.

Never silently degrade:

1. no dropped statements,
2. no implicit behavior substitution.

## Emission Strategy

Emit targets:

1. patch mode (preferred),
2. full-file mode (allowed for generated scaffold),
3. function-snippet mode for review tooling.

Emitter requirements:

1. stable formatting,
2. deterministic identifier naming policy,
3. minimal comments for non-obvious transforms,
4. source span mapping in sidecar.

## Verification Strategy

## Static verification

1. schema validation for all rule tables,
2. no unresolved parity-critical mappings,
3. no writes to deprecated state mirrors,
4. no edits to blocked files/regions from file policy + annotations.

## Semantic verification

1. translation idempotence check (same input => same output).
2. control-flow preservation check for transformed label/goto regions.
3. async contract check (await placement equals boundary rule expectations).

## Runtime verification

1. `npm run -s test:unit`
2. targeted gameplay replay subset for touched files
3. full gameplay parity sweep before broad merge

## Parser/Translator Failure Modes

1. Preprocessor ambiguity misclassifies macro usage.
   1. Mitigation: Source+PP dual-view and macro provenance checks.
2. CFG restructuring changes branch behavior.
   1. Mitigation: control-edge equivalence checks and conservative fallback to manual.
3. Async propagation crosses unsupported boundaries.
   1. Mitigation: hard fail with explicit adapter requirement.
4. State-path drift after refactor.
   1. Mitigation: versioned ruleset + CI lockstep checks.

## Rollout Plan

Milestone alignment:

1. Parser rollout corresponds to [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md) milestones `M3` to `M5`.
2. Parser/frontend gates must remain consistent with translator architecture gates and umbrella milestone exits.

Phase P0: Frontend + NIR

1. parse and capture macro provenance.
2. emit NIR snapshots for representative files.

Phase P1: Safe expression/function translation

1. pure helpers and low-risk files.

Phase P2: Control-flow + macro-heavy pilot

1. `hack.c` selected functions.

Phase P3: Async boundary pilot

1. translate functions crossing known display/input/timing boundaries under strict rule control.

Phase P4: Core campaign integration

1. couple parser translator output with Operation Iron Parity module waves.

## Concrete Deliverables (M3)

The parser/emitter hard parts are tracked as explicit deliverables with exit checks.

1. `P3.1` Frontend TU loader:
   1. deterministic parse of one target file (`hack.c` baseline),
   2. compile-arg profile pinned in repo config.
2. `P3.2` Source/PP provenance extractor:
   1. macro invocation table with source spans,
   2. expanded-token backreferences.
3. `P3.3` NIR serializer:
   1. function-level NIR JSON snapshots,
   2. stable key ordering for diffability.
4. `P3.4` CFG/control lowering prototype:
   1. labels/goto graph extraction,
   2. reducible-pattern tagging.
5. `P3.5` Emitter baseline:
   1. JS output for a safe helper function,
   2. sidecars (`meta`, `diag`) emitted.
6. `P3.6` Async-boundary inference prototype:
   1. boundary-driven await placement validation on selected functions.

Exit checks:

1. Each `P3.x` has at least one deterministic fixture test.
2. Re-running the same input yields byte-stable artifacts (except timestamps).
3. Unsupported constructs appear in diagnostics, never silently dropped.

## Definition of Done (Parser Spec v1)

1. Parser outputs Source+PP linked representations with macro provenance.
2. CFG and control transforms are deterministic and validated.
3. Async inference and await placement are fully rule-driven.
4. Unsupported constructs are explicit and routed; none are silently ignored.
5. Translated parity-critical pilot functions pass replay gates without regression.
