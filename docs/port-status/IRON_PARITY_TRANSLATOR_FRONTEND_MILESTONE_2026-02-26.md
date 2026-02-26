# IRON_PARITY Translator Frontend Milestone (2026-02-26)

This note records delivery of translator parser milestones `P3.1` and `P3.2`.

## Delivered

1. `P3.1` Frontend TU loader + parse report:
   1. `tools/c_translator/main.py` supports `--src`, `--func`, `--compile-profile`, `--emit`, and `--out`.
   2. `parse-summary` emit mode writes deterministic function inventory artifacts.
2. `P3.2` Source/PP provenance extractor:
   1. `provenance-summary` emit mode writes macro definition/invocation tables with source spans.
   2. Preprocessed/source crosswalk is captured using `cpp -E -dD` line markers.

## Artifact Baseline

1. Parse summary:
   1. `docs/port-status/IRON_PARITY_TRANSLATOR_PARSE_SUMMARY_2026-02-26.json`
2. Provenance summary:
   1. `docs/port-status/IRON_PARITY_TRANSLATOR_PROVENANCE_SUMMARY_2026-02-26.json`

For `nethack-c/src/hack.c` at this baseline:

1. function count: `88`
2. macro definition count in source file: `9`
3. macro invocation count (macro-name matched): `79`
4. source/PP crosswalk rows: `4421`

## Environment Notes

1. This environment does not currently provide `clang.cindex`.
2. Frontend therefore uses deterministic fallback paths:
   1. function extraction: regex signature scanner,
   2. macro provenance/source mapping: `cpp` line-marker crosswalk.
3. Planned hardening remains:
   1. libclang-backed AST/token provenance integration (`A1/A2` hard mode),
   2. fixture tests for deterministic serializer checks (`P3.x` exit criteria).
