# Iron Parity Alias Bridge Ledger (2026-02-26)

Scope: M1 alias-bridge planning and retirement criteria for Tier-1 movement stack.

## Mirror paths to retire

| Legacy mirror | Canonical target | Primary owners (current) | Current role | Retirement checkpoint |
|---|---|---|---|---|
| `game.runMode` | `game.svc.context.run` | `js/cmd.js`, `js/hack.js`, `js/allmain.js` | Run/rush command prefix state | All write sites migrate to `svc.context.run`; `runMode` becomes read-only compatibility accessor; then remove direct uses in Tier-1 modules |
| `game.traveling` | `game.svc.context.travel` | `js/hack.js` | Travel-path active flag | Travel start/stop and stop-on-fail all write canonical context flag; legacy boolean removed |
| `game.forceFight` | `game.svc.context.forcefight` | `js/cmd.js`, `js/hack.js`, `js/dokick.js` | Prefix force-attack behavior | Canonical writes only; legacy mirror replaced by compatibility accessor and later removed |
| `game.menuRequested` | `game.svc.context.nopick` | `js/cmd.js`, `js/hack.js` | Prefix suppress-autopickup behavior | Canonical writes only; autopickup gating reads canonical flag; legacy mirror removed |

## Active compatibility bridge

Current bridge logic is centered in `ensure_context()` in `js/hack.js`, which still syncs legacy mirrors to context values.

Migration principle for M2 batches:

1. Move ownership (writes) first.
2. Keep compatibility accessors during transition.
3. Remove mirror read/write usage after parity-safe migration.

## Batch issue map

1. `runMode -> svc.context.run` migration batch (Tier-1 movement stack)
2. `traveling -> svc.context.travel` migration batch
3. `forceFight/menuRequested -> svc.context.forcefight/nopick` migration batch
4. `ensure_context()` retirement batch after the three ownership migrations above

## Acceptance criteria for mirror retirement

1. No direct writes to legacy mirrors remain in Tier-1 modules.
2. Session parity does not regress (same or better pass/fail and first-divergence position).
3. Compatibility accessor behavior is covered by unit tests until final mirror removal.

## Executed migration batch (2026-02-26)

1. `runMode` ownership bridge executed in `NetHackGame`:
   1. legacy `game.runMode` now routes through accessor logic that writes canonical `game.svc.context.run`,
   2. run-mode reads are derived from canonical context values.
2. Tier-1 movement command flow now writes canonical run state directly:
   1. `js/cmd.js` run/rush prefix handling now uses `context.run` read/write helpers,
   2. run-prefix clearing now clears canonical context state directly.
3. `js/hack.js` context bootstrap no longer backfills `context.run` from legacy mirrors.
4. `js/allmain.js` turn-interrupt checks now read canonical `context.run`.
5. Additional legacy mirrors now route through canonical context accessors:
   1. `game.traveling` -> `game.svc.context.travel`,
   2. `game.forceFight` -> `game.svc.context.forcefight`,
   3. `game.menuRequested` -> `game.svc.context.nopick`.
6. Validation:
   1. `npm run -s test:unit`,
   2. `./scripts/run-session-tests.sh` (baseline unchanged: `186/204`, `18` failing).
7. `ensure_context()` status:
   1. now treated as a compatibility shim,
   2. canonical `NetHackGame` path initializes from `svc.context`,
   3. legacy backfill is restricted to non-canonical plain fixture objects.
