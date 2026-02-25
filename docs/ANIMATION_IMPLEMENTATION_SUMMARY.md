# Animation Implementation Status (Current)

This document replaces the older "complete" claim and tracks real parity status.

## Current State

Animation infrastructure is in place (`tmp_at`, delay boundaries, overlay lifecycle), but gameplay parity is still partial.

### Implemented
- Canonical transient animation module in `js/animation.js` (`tmp_at`, `DISP_*`, `BACKTRACK`, delay boundary hooks).
- Headless mode keeps animation delays skipped for fast deterministic tests.
- Core tmp-at lifecycle wiring exists in major paths (throw/beam/explode/dig/getpos highlights).
- Interactive cursor loop exists in `getpos_async`.

### Not Yet Fully Parity-Complete
1. Real timed delay usage is still mixed.
- More gameplay paths now await `nh_delay_output()` (beam zap via unified async `buzz()`, non-beam immediate wand traversal, chain-lightning spell, wand-of-digging `zap_dig` traversal, player throw-command projectile frame, monster ranged projectile flow via async `mthrowu` path), but many paths still rely on `nh_delay_output_nowait()` boundaries.
- Result: structural replay boundaries are often correct before full visible timing parity is reached.

2. `zap.c` coverage is incomplete.
- Major beam behavior is present and IMMEDIATE wand traversal is now animated; several C zap call surfaces remain simplified/stubbed.

3. Rolling boulder / complex trap-motion animation is partial.
- Trap flash lifecycle and basic per-cell travel + impact damage hook are present, with additional C-like launch behavior now wired (other-side boulder lookup, closed-door break, boulder handoff, bars/walls/trees blocking, and basic landmine/teleport/pit-family trap-tile reactions). Full `launch_obj` parity (scatter/fall-through chain details and richer object interactions) is still not complete.

4. `getpos` advanced targeting features are partial.
- Core cursor interaction and hilite lifecycle are implemented.
- C-style target-class cycling keys (`m/M o/O d/D x/X i/I v/V`) and basic menu/list helpers now exist, but full C filter-area/view semantics and NHW_MENU parity remain incomplete.

5. Display-layer glyph parity remains approximate.
- `tmp_at` lifecycle is close.
- Numeric transient glyph decoding now maps through C glyph-id domains (monster/object/cmap/zap/swallow/explosion/warning) instead of heuristic buckets.
- Full C mapglyph/windowport equivalence remains open.

## Practical Meaning
- The animation system is usable and integrated.
- It is not yet equivalent to C NetHack animation semantics in all gameplay paths.
- Session parity metrics should continue to be used as the regression guardrail while filling remaining gaps.
