# Mazes of Menace - Session Memory

## Project Overview
JS port of NetHack 3.7 with RNG-faithful replay testing. C harness generates golden session files (.session.json) with per-step RNG traces. JS must consume identical RNG calls.

## Key Patterns
- Monster objects use `mndx` (not `mnum`) for monster type index
- C's `resist()` formula: `rn2(100 + alev - dlev) < mr` where alev=12 for wands, dlev=max(m_lev,1)
- C's `burnarmor()`: while(true) loop with rn2(5), case 1 always returns TRUE
- C's `doopen_indir()`: both explicit 'o' command and auto-open use `rnl(20) < threshold`
- Trap discovery: `spoteffects()` → `dotrap()` → `seetrap()` sets `tseen=true`; SQKY_BOARD has no RNG on trigger
- Pet trap avoidance: gated on `trap.tseen`, rn2(40) to skip position
- Fountain drinking: `rnd(30)` fate, then `dryup()` with `rn2(3)` at end (except blessed jackpot path)

## Test Commands
- Run specific session: `npm run test:session -- --test-name-pattern='seed2_wizard'`
- Run all session tests: `npm run test:session`
- Run all tests (unit + session): `npm test`
- Run everything (unit + session + E2E): `npm run test:all`

## GitHub Issue Tracking
- Use GitHub Issues for work tracking and handoff (`gh issue list --state open`, `gh issue view <number>`, `gh issue close <number>`)
- Keep issue status current in comments/checklists when starting or finishing scoped work

## Session Status (as of 2026-02-09)
- seed2_wizard_fountains: ALL 37 STEPS PASS (startup + steps 0-36)
- seed1, seed42: pre-existing gameplay step failures (unrelated to seed2 work)
- Map sessions (seed16, seed72, etc.): pre-existing depth 2+ divergences
