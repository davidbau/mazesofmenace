# Legacy Canonical Shape Refactor Plan (2026-02-28)

## Canonical Direction (Do Not Reverse)

This refactor is one-way:

1. Objects
   - Canonical: `obj.ghostly` (boolean)
   - Legacy to retire: `obj.ghost`

2. Invocation-level state
   - Canonical: `map.is_invocation_lev` and `map.inv_pos` (`{ x, y }`)
   - Legacy to retire in core predicates: `_isInvocationLevel`, `_invPos`, and invocation flags mirrors

3. Monster species shape
   - Canonical runtime pointer: `mon.type` (`mons[]` entry)
   - Canonical stable index: `mon.mndx`
   - Legacy compatibility-only fallback: `mon.mnum`, `mon.data`
   - Rule: core predicates should read canonical shape first and use fallback only as compatibility bridge.

4. Monster track ring
   - Canonical: `mon.mtrack` is an array of length `MTSZ` with `{ x, y }` entries.
   - Legacy behavior to remove: silent no-op when `mtrack` is missing or malformed.

5. Runmode delay gate
   - Canonical: movement state from `game.svc.context` (via `ensure_context`) and mode option from `game.flags.runmode`.
   - No new legacy aliases should be added.

## Function-Level Execution Plan

1. `set_ghostly_objlist`
   - Write only `obj.ghostly = true`.
   - Preserve recursion over array and linked-chain shapes.

2. `invocation_pos`
   - Read only canonical invocation fields (`map.is_invocation_lev`, `map.inv_pos`) plus `Invocation_lev(map.uz)` when `uz` exists.
   - Remove predicate-level fallback to legacy alias fields.

3. `mon_hates_light`
   - Fix species lookup by hardening `monsdat(mon)`:
     - prefer `mon.type`,
     - fallback to `mon.mndx`, then `mon.mnum`.

4. `m_can_break_boulder`
   - Consume species pointer through canonical lookup (`monsdat`), not ad-hoc `type/data` branches.

5. `mon_track_add`
   - Normalize `mon.mtrack` to canonical ring shape before shifting.
   - Keep deterministic write semantics (front insert, fixed ring size).

6. `runmode_delay_output`
   - Keep behavior unchanged unless mismatch appears.
   - Enforce canonical read paths only (already `ensure_context` + `flags.runmode`).

## Validation Strategy

1. Run targeted translator/unit tests that touch helper emission behavior.
2. Run full `npm test --silent`.
3. Accept only if failures remain at baseline (18 gameplay failures, no new categories).

