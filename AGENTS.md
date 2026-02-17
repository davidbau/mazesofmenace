# AGENTS.md

## Purpose
This file defines how coding agents should work in this repository.

Primary project direction is in `PROJECT_PLAN.md`. Agents should read that first and follow the current phase goals.

## Source of Truth and Priorities
1. NetHack C 3.7.0 behavior is the gameplay source of truth.
2. `PROJECT_PLAN.md` is the execution roadmap and phase gate definition.
3. Test harness outputs are evidence for divergences, not a place to hide or special-case them.

## Work Types and Primary Metrics
1. Porting Work
   Primary metric: reduce first divergence and increase matched PRNG log prefix against C.
   Debug focus: PRNG call context and first-mismatch localization.
2. Selfplay Agent Work
   Primary metric: held-out improvement after training-set tuning.
   Competence focus: survival, exploration breadth, depth progression, and interaction quality (combat, inventory, item use, magic/abilities).
3. Test Infrastructure Work
   Primary metric: developer insight speed.
   Requirements: tests run fast enough to avoid blocking developers and failures provide actionable debug detail.
   Scope may include deterministic replay tooling, diagnostics, and code coverage.
   Constraint: infrastructure reveals bugs; it must not solve or mask them.

## Non-Negotiable Engineering Rules
1. Fix behavior in core JS game code, not by patching comparator/harness logic.
2. Keep harness simple, deterministic, and high-signal for debugging.
3. Never normalize away real mismatches (RNG/state/screen/typgrid) just to pass tests.
4. Keep changes incremental and test-backed.
5. Preserve deterministic controls (seed, datetime, terminal geometry, options/symbol mode).

## Development Cycle
1. Identify a failing parity behavior from sessions/tests.
2. Confirm expected behavior from C source.
3. Implement faithful JS core fix that matches C logic.
4. Run relevant tests/sessions (and held-out eval where applicable).
5. Record learnings in `docs/LORE.md` for porting work and `selfplay/LEARNINGS.md` for agent work.
6. Commit only validated improvements.

## Session and Coverage Expectations
1. Use the canonical key-centered deterministic session format.
2. During translation coverage work, maintain a C-to-JS mapping ledger.
3. For low-coverage parity-critical areas, add targeted deterministic sessions.
4. Keep parity suites green while expanding coverage.

## Agent Work Rules (Selfplay)
These rules apply to coding work focused on selfplay agent quality.

1. Use a 13-seed training set with one seed per NetHack character class.
2. Optimize agent behavior against that 13-class training set.
3. Before committing, run a held-out evaluation on a different 13-seed set (also one per class).
4. Only commit when held-out results show improvement over baseline.
5. Track not only survival but competence in exploration breadth, dungeon progression, and interaction quality.
6. Keep agent policy/tuning changes separate from parity harness behavior.

## Harness Boundary
Allowed harness changes:
1. Determinism controls
2. Better observability/logging
3. Faster execution that does not change semantics

Not allowed:
1. Comparator exceptions that hide true behavior differences
2. Replay behavior that injects synthetic decisions not in session keys
3. Any workaround that makes failing gameplay look passing

## Practical Commands
- Install/run basics: see `docs/DEVELOPMENT.md`.
- Issue tracking workflow: see `docs/agent/AGENTS.md` (`bd` workflow).

## Priority Docs (Read Order)
1. Always start with:
   - `PROJECT_PLAN.md`
   - `docs/DEVELOPMENT.md`
   - `docs/LORE.md`
2. For porting/parity divergence work:
   - `docs/SESSION_FORMAT_V3.md`
   - `docs/RNG_ALIGNMENT_GUIDE.md`
   - `docs/C_PARITY_WORKLIST.md`
3. For special-level parity work:
   - `docs/SPECIAL_LEVELS_PARITY_2026-02-14.md`
   - `docs/special-levels/SPECIAL_LEVELS_TESTING.md`
4. For selfplay agent work:
   - `selfplay/LEARNINGS.md`
   - `docs/SELFPLAY_C_LEARNINGS_2026-02-14.md`
   - `docs/agent/EXPLORATION_ANALYSIS.md`
5. For known issue deep-dives:
   - `docs/bugs/pet-ai-rng-divergence.md`
   - `docs/NONWIZARD_PARITY_NOTES_2026-02-17.md`

## Completion Discipline
When a task is complete:
1. Run relevant tests.
2. Commit with a clear message.
3. Push to remote (do not leave validated work stranded locally).
4. Report what changed, what was validated, and any remaining risks.
