# Iron Parity State Root Inventory (2026-02-26)

Commit baseline: `d04ae1c0` (updated in follow-up work on `iron-parity` branch).

## Canonical state roots (bootstrap target)

1. `game.svc.context` (command/move transient context)
2. `game.u` (hero state; alias to `game.player` during migration)
3. `game.lev` (level/map runtime state; alias to `game.map` during migration)
4. `game.flags` / `game.iflags` (configuration/interface flags)
5. `game.gd`, `game.gm`, `game.gn` (domain/group state roots for migration waves)

## Alias invariants implemented

1. `game.context` is an alias accessor for `game.svc.context`.
2. `game.u` is an alias accessor for `game.player`.
3. `game.lev` is an alias accessor for `game.map`.

These are enforced by unit tests in:

1. `test/unit/state_alias_invariants.test.js`

## Immediate migration notes

1. Movement stack (`hack.js`, `cmd.js`, `allmain.js`) still mixes legacy mirrors (`runMode`, `traveling`, `forceFight`, `menuRequested`) with `context.*`.
2. Next migration step is replacing mirror ownership with canonical `svc.context` fields in M2 batches, while preserving replay parity.
