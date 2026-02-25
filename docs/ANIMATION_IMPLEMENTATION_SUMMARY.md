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
- Some gameplay paths now await `nh_delay_output()`, but many still rely on `nh_delay_output_nowait()` boundaries.
- Result: structural replay boundaries are often correct before full visible timing parity is reached.

2. `zap.c` coverage is incomplete.
- Major beam behavior is present, but several C zap call surfaces remain simplified/stubbed.

3. Rolling boulder / complex trap-motion animation is partial.
- Trap flash lifecycle hooks are present, but full per-cell rolling-object lifecycle (C-style chain behavior) is not complete.

4. `getpos` advanced targeting features are partial.
- Core cursor interaction and hilite lifecycle are implemented.
- Advanced cycling/filter/menu targeting features from C remain incomplete.

5. Display-layer glyph parity remains approximate.
- `tmp_at` lifecycle is close.
- Full C mapglyph/windowport equivalence remains open.

## Practical Meaning
- The animation system is usable and integrated.
- It is not yet equivalent to C NetHack animation semantics in all gameplay paths.
- Session parity metrics should continue to be used as the regression guardrail while filling remaining gaps.
