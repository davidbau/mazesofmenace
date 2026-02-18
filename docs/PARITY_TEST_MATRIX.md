# Parity Test Matrix

> *You carefully unroll the scroll of Parity. It reads:*
> *"To port a dungeon is to rebuild it stone by stone, trap by trap,*
> *random number by random number — and then prove that every adventurer*
> *who steps inside cannot tell which dungeon they are in."*

This is the canonical reference for what "parity" means operationally. It
defines every test suite, session category, comparison channel, deterministic
control, and quality gate that governs C-vs-JS fidelity.

For the testing dashboard, git-notes workflow, and enforcement infrastructure,
see [TESTING.md](TESTING.md). For how to capture new C reference sessions,
see [COLLECTING_SESSIONS.md](COLLECTING_SESSIONS.md). For the session file
format specification, see [SESSION_FORMAT_V3.md](SESSION_FORMAT_V3.md).

## Test Commands

| Command | Scope | What it runs | Gate |
|---------|-------|-------------|------|
| `npm run test:unit` | Unit tests | `node --test test/unit/*.test.js` (84 files) | PR |
| `npm run test:session` | Session parity | `node test/comparison/sessions.test.js` — all session types | PR |
| `npm test` | **PR gate** | `test:unit` + `test:session` | PR |
| `npm run test:e2e` | Browser E2E | `node --test --test-concurrency=1 test/e2e/*.test.js` (3 files, Puppeteer) | Release |
| `npm run test:all` | **Release gate** | `test:unit` + `test:session` + `test:e2e` | Release |

The session test runner also accepts command-line options for targeted work:

```bash
node test/comparison/session_test_runner.js --verbose          # detailed per-session output
node test/comparison/session_test_runner.js --type=chargen     # single category
node test/comparison/session_test_runner.js --parallel          # use all CPU cores
node test/comparison/session_test_runner.js --fail-fast         # stop on first failure
node test/comparison/session_test_runner.js path/to/file.json  # single session
```

## Session Categories

> *You enter the Hall of Mirrors. Each mirror reflects the same dungeon — one*
> *rendered in C, the other in JavaScript. Your quest: make every reflection*
> *identical.*

All 203 session files live in two directories (`test/comparison/sessions/` and
`test/comparison/maps/`) and are classified into types by `deriveType()` in
`session_loader.js`. The test runner in `sessions.test.js` groups results by
type: chargen, gameplay, interface, map, special, other.

| Type | Count | Seeds | What's checked | Example |
|------|------:|-------|---------------|---------|
| **chargen** | 91 | 1, 42, 100, 200, 300 | Character creation for all 13 roles × 5 seeds, plus race and alignment variants at seed 42. Compares startup RNG sequence and initial map grid. | `seed42_chargen_wizard` |
| **gameplay** | 49 | 1–306 | Live play: selfplay traces (5–200 turns per role), wizard-mode sessions (13 roles), movement and combat prefixes, inventory, items, Gnomish Mines descent, option variants. Compares RNG, screen text, and ANSI color. | `seed3_selfplay_100turns_gameplay` |
| **interface** | 3 | 42 | Pregame UI: startup screen, options menu, name prompt. Screen text and color compared with normalization for version strings and box-drawing characters. | `interface_startup` |
| **map** | 10 | 16, 72, 119, 163, 306 | Dungeon level generation to multi-depth: typGrid cell-by-cell and per-level RNG. Includes paired JS and C reference files. | `seed119_map` |
| **special** | 50 | 1, 42, 100 | Special level generation: 16 level groups × 3 seeds. Validates that level grids have correct 21×80 dimensions. | `seed42_special_mines` |

**Total: 203 session files** (142 in `sessions/`, 61 in `maps/`).

### Chargen inventory

Every role that can be created must be tested. Every seed that can diverge
must be tried.

| Variant | Count | Seeds | Defined in `seeds.json` |
|---------|------:|-------|------------------------|
| Base roles (13 × 5 seeds) | 65 | 1, 42, 100, 200, 300 | `chargen_seeds.seeds` × `chargen_seeds.sessions` |
| Race variants | 15 | 42 | `chargen_seeds.race_variants` |
| Alignment variants | 10 | 42 | `chargen_seeds.alignment_variants` |
| Interface chargen | 1 | 42 | `interface_seeds` (typed as chargen by filename) |

### Gameplay inventory

Gameplay sessions are the most diverse category — the dungeon has many rooms,
and each must be checked.

| Subcategory | Count | Notes |
|-------------|------:|-------|
| Explicit gameplay traces | 16 | Movement, combat prefixes (`F`, `G`), multidigit counts, inventory, items, Gnomish Mines |
| Per-role selfplay (200 turns) | 13 | Seeds 101–113, one per role — enough turns to exercise pet AI, combat, and level features |
| Per-role wizard mode | 13 | Seeds 201–213, wish + explore per role — high-level items, spells, equipment |
| Option variants | 6 | Seeds 301–306: verbose on/off, DECgraphics on/off, time on/off |
| Castle (map dir) | 1 | `seed42_castle.session.json` |

### Special level groups

> *Sixteen branches of the dungeon, each with its own rules, its own traps,*
> *its own way of killing you.*

The 16 groups tested across 3 seeds (1, 42, 100): mines, sokoban, oracle,
bigroom, castle, medusa, quest, gehennom, knox, valley, vlad, wizard, filler,
rogue, tutorial, planes. Sokoban gets two extra seeds (200, 300) because its
puzzle layouts are particularly sensitive to generation order.

## Parity Dimensions

> *Five channels of truth. A session passes only when all five agree.*

Session tests compare JS replay output against C reference captures across
five channels, implemented in `test/comparison/comparators.js`:

| Channel | What it checks | How mismatches are reported |
|---------|---------------|---------------------------|
| **RNG** | PRNG call sequence (ISAAC64). Entries are normalized: source tags stripped, midlog and composite entries filtered. | First divergent call index with JS and session values, plus call-stack context (the `>funcname` entries preceding the divergence). |
| **Screen** | Terminal text output (24 lines). Trailing whitespace trimmed. Gameplay screens get col-0 padding normalization; interface screens normalize box-drawing chars (`┌→-`) and version/copyright strings. | First mismatched row with both line contents. |
| **Grid** | Dungeon typGrid — the 21×80 integer array of tile types. Cell-by-cell comparison. | First differing cell: (x, y) coordinates, JS value, session value. |
| **Color** | ANSI terminal attributes per cell: foreground, background, bold, inverse, underline. Parses full SGR sequences and DEC special graphics (SO/SI mode). | First mismatched (row, col) with full attribute details for both sides. |
| **Metrics** | Aggregate counts: rng matched/total, screens matched/total, grids matched/total, colors matched/total. | Summary object on the result — the bird's-eye view of how close you are. |

A session **passes** when every checked channel matches completely. The
`firstDivergence` field identifies the earliest mismatch; `firstDivergences`
gives the earliest mismatch *per channel* when multiple channels fail.
These are your trail markers when debugging — follow the first divergence,
and you will find the bug.

## Deterministic Controls

> *The DevTeam thinks of everything. And so must we — every source of*
> *nondeterminism must be nailed down, or the mirrors will never align.*

Parity testing requires bitwise-reproducible behavior across C and JS.
Six controls eliminate environmental nondeterminism:

| Control | What it fixes | C enforcement | JS enforcement |
|---------|--------------|---------------|---------------|
| **Seed** | PRNG initial state (ISAAC64) | Passed via `run_session.py` at harness startup | Passed to `game.init({ seed })` or `replaySession(seed, ...)` |
| **Date/time** | In-game clock, moon phase, Friday-the-13th | Harness patches `gettimeofday` / build constants | `replay_core.js` uses fixed epoch; clock functions return deterministic values |
| **Terminal size** | Screen dimensions (80 columns × 24 lines) | Harness sets `LINES=24 COLUMNS=80` | `HeadlessDisplay` fixed at 80×24; comparators hard-code width 80 |
| **Options** | Game behavior flags (verbose, pickup, symset, color, etc.) | Harness writes `.nethackrc` or CLI equivalents | `replayFlags` object merged with `DEFAULT_FLAGS` before replay |
| **Sort stability** | Tie-breaking order in object/monster lists | C harness uses stable qsort variant | JS `Array.prototype.sort` is stable per ES2019+ spec |
| **Input replay** | Keystroke-by-keystroke game input | Harness pipes recorded keystrokes via TTY | `replaySession()` feeds keys via `input.pushKey()` with per-step screen stabilization |

## Quality Gates

> *Two altars guard the path to release. You must sacrifice at both.*

### PR gate (`npm test`)

Every pull request must pass before merge. No exceptions, no `--no-verify`.

| Requirement | Details |
|------------|---------|
| Unit tests green | All 84 unit test files pass |
| Session tests green | All 203 sessions pass across all types |
| No regressions | A previously-passing session may not regress to failing |

### Release gate (`npm run test:all` + golden comparison)

The full suite. Run before any release.

| Requirement | Details |
|------------|---------|
| PR gate passes | Everything above |
| E2E tests green | 3 Puppeteer browser tests pass (startup, gameplay, game flow) |
| Golden comparison | `--golden` flag compares JS output against golden-branch C captures |

## Session Recording

> *To test the JS dungeon, you must first record the C dungeon. The Oracle*
> *cannot compare what she has never seen.*

New C reference sessions are generated by Python scripts in
`test/comparison/c-harness/` that drive a patched C NetHack build:

| Script | What it captures |
|--------|-----------------|
| `gen_chargen_sessions.py` | Character creation from `seeds.json` chargen definitions |
| `gen_selfplay_trace.py` | Selfplay gameplay traces (scripted movement patterns) |
| `gen_selfplay_agent_trace.py` | Agent-driven selfplay traces (AI movement) |
| `gen_map_sessions.py` | Multi-depth map generation (typGrid + RNG per level) |
| `gen_special_sessions.py` | Special level grid captures (all 16 branch types) |
| `gen_interface_sessions.py` | Pregame UI interaction captures (startup, options, chargen) |
| `gen_option_sessions.py` | Option-variant gameplay (verbose, DECgraphics, time) |
| `create_wizard_sessions.py` | Wizard-mode per-role sessions (wish + explore) |
| `run_session.py` | Low-level single-session runner (building block for the above) |
| `setup.sh` | Builds the patched C NetHack binary for session capture |

All session definitions live in `test/comparison/seeds.json`. To add a new
session:

1. Add the seed, moves, and options to the appropriate section of `seeds.json`.
2. Run the corresponding `gen_*.py` script from `c-harness/` to capture the C reference.
3. Place the resulting `.session.json` in `sessions/` or `maps/` as appropriate.
4. Run `npm run test:session` to verify JS matches.

For a full walkthrough of session capture, see
[COLLECTING_SESSIONS.md](COLLECTING_SESSIONS.md).
