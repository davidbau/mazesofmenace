# Iron Parity Translator Async Emit Milestone (2026-02-26)

Scope: `M3` translator alpha hard-part execution.

## What landed

1. `emit-helper` now reads async inference (`async-summary`) for the target C function.
2. Generated JS function declarations become `export async function ...` when async is required.
3. Direct awaited boundaries are emitted as `await <call>(...)` in statement position.
4. Async-callee propagation is emitted as `await <callee>(...)` when the callee is inferred async.
5. Sync-only boundaries (for example `tmp_at`) remain non-awaited.

## Validation

New deterministic translator tests cover four async cases:

1. Direct awaited boundary call.
2. Mixed function with both awaited and sync boundaries.
3. Sync-only boundary function (no async).
4. Async pass-through via async callee.

Files:

1. `test/fixtures/translator_async_fixture.c`
2. `test/unit/translator_emit_helper_async.test.js`

## Notes

1. This milestone is translator infrastructure progress (emission semantics), not broad gameplay-module auto-translation.
2. Real C modules still require additional state/macro rewrite coverage before most async gameplay functions can emit fully canonical JS.
