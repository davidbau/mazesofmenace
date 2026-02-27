# Identifier Alias Review (2026-02-27)

Manual triage of unresolved translator identifiers to find likely aliases that
are already implemented under different JS names (beyond pure case/underscore
normalization).

## Confirmed High-Confidence Aliases
- `js/detect.js`: `openone -> openone_fn`
- `js/detect.js`: `map_background -> magic_map_background`
- `js/do.js`: `makeplural -> makeplural_simple`
- `js/do.js`: `pline1 -> pline`
- `js/spell.js`: `pline1 -> pline`
- `js/invent.js`: `setnotworn -> setnotworn_safe`

## Probable Aliases (Need Spot Verification in Context)
- `js/do.js`: `Doname2 -> doname`
- `js/invent.js`: `check_unpaid -> ckunpaid`

## Ambiguous / Not Auto-Aliased Yet
- `distu -> dist2` (often close, but argument semantics differ by callsite)
- `unmap_invisible -> map_invisible` (directionality differs)
- `Monnam -> monName` (function call vs local variable/cached name patterns)
- `start_corpse_timeout -> start_corpse_timeout_rng` (object-vs-species API)
- `obj_typename -> shopTypeName` (shop-specific naming helper, not global)

## Implementation Status
- Added curated alias rules in:
  - `tools/c_translator/rulesets/identifier_aliases.json`
- Safety pass now consumes those rules and emits `rename_alias` tasks while
  suppressing duplicate missing-identifier noise for mapped names.
