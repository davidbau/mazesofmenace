# Replay Input Boundary Architecture

This document defines the replay-step boundary contract used by `js/replay_core.js`.

## Problem This Solves

Historically, replay boundary detection relied on polling (`setTimeout(0)`) to infer
whether a command had completed or was blocked on additional input. That approach
was race-prone and hard to reason about in prompt-heavy flows.

## Boundary Contract

Replay boundaries are keyed to an explicit input-runtime signal:

1. A command is considered *waiting for external input* when the runtime has an
   unresolved `nhgetch()` read.
2. Each transition into waiting state increments a monotonic `waitEpoch`.
3. Replay code can await the *next* waiting transition using:
   - `waitForInputWait({ afterEpoch, signal })`
4. Runtime state can be inspected with:
   - `isWaitingInput()`
   - `getInputState()` returning `{ waiting, queueLength, waitEpoch }`

This API is implemented consistently in:

- `createInputQueue()` (`js/input.js`)
- `createHeadlessInput()` (`js/headless.js`)

## Replay Driver Invariant

`drainUntilInput()` in `js/replay_core.js` now uses boundary-aware waiting:

- race command completion vs next `waitEpoch` transition;
- return `done: false` only when runtime is actually in waiting state;
- avoid polling when boundary APIs are present.

Fallback polling remains only for runtimes that do not implement boundary APIs.

## Maintainer Checklist

When changing input or replay code, keep all of these true:

1. Any path that blocks in `nhgetch()` must trigger a new wait epoch.
2. Resolving a blocked read (`pushInput`) must clear waiting state.
3. `waitForInputWait({ afterEpoch })` must not resolve for stale epochs.
4. Replay boundary logic must depend on runtime waiting state, not UI artifacts.
5. New input adapters must implement `isWaitingInput`, `getInputState`, and
   `waitForInputWait` if they are used by replay.

## Anti-Patterns

Do not reintroduce these:

1. Ad-hoc `setTimeout` loops as primary boundary detection in replay.
2. Comparator masking for step-boundary artifacts that stem from replay routing.
3. Adapter-specific hacks in replay core that bypass the boundary contract.

## Tests Covering This Contract

- `test/unit/input_runtime.test.js`
  - queue -> wait -> resume epoch progression
  - abortable wait subscriptions
  - parity of contract between generic and headless runtimes

