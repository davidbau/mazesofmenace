# IRON_PARITY Translator Frontend Milestone (2026-02-26)

This note records delivery of translator parser milestones `P3.1`, `P3.2`, and `P3.3`.

## Delivered

1. `P3.1` Frontend TU loader + parse report:
   1. `tools/c_translator/main.py` supports `--src`, `--func`, `--compile-profile`, `--emit`, and `--out`.
   2. `parse-summary` emit mode writes deterministic function inventory artifacts.
2. `P3.2` Source/PP provenance extractor:
   1. `provenance-summary` emit mode writes macro definition/invocation tables with source spans.
   2. Preprocessed/source crosswalk is captured using `cpp -E -dD` line markers.
3. `P3.3` NIR serializer:
   1. `nir-snapshot` emit mode writes function-level deterministic JSON snapshots.
   2. Each snapshot includes stable IDs, source spans, body hashes, call inventory, and assignment inventory.

## Artifact Baseline

1. Parse summary:
   1. `docs/port-status/IRON_PARITY_TRANSLATOR_PARSE_SUMMARY_2026-02-26.json`
2. Provenance summary:
   1. `docs/port-status/IRON_PARITY_TRANSLATOR_PROVENANCE_SUMMARY_2026-02-26.json`
3. NIR snapshot:
   1. `docs/port-status/IRON_PARITY_TRANSLATOR_NIR_SNAPSHOT_2026-02-26.json`

For `nethack-c/src/hack.c` at this baseline:

1. function count: `88`
2. macro definition count in source file: `9`
3. macro invocation count (macro-name matched): `79`
4. source/PP crosswalk rows: `4421`
5. NIR function snapshots: `88`

## Environment Notes

1. This environment does not currently provide `clang.cindex`.
2. Frontend therefore uses deterministic fallback paths:
   1. function extraction: regex signature scanner,
   2. macro provenance/source mapping: `cpp` line-marker crosswalk.
3. Planned hardening remains:
   1. libclang-backed AST/token provenance integration (`A1/A2` hard mode),
   2. CFG/lowering and emitter milestones (`P3.4+`),
   3. fixture tests for deterministic serializer checks (`P3.x` exit criteria).
