# C_TRANSLATOR_NIR_SPEC.md

Campaign umbrella: [IRON_PARITY_PLAN.md](/share/u/davidbau/git/mazesofmenace/game/docs/IRON_PARITY_PLAN.md)

## Purpose

Define `NIR` (Normalized Intermediate Representation) for the C-to-JS translator.

NIR is the deterministic function-level IR between parser/frontend output and JS emitter output.

## What NIR Is

`NIR` is a structured JSON form that captures the parts of C function structure we need for parity-safe translation:

1. function identity and source spans,
2. stable body fingerprinting,
3. call inventory,
4. write/assignment inventory.

NIR is generated from C source before rewrite passes.

## What NIR Is Not

1. Not a replacement for C AST.
2. Not executable IR.
3. Not final JS output.
4. Not a full semantic model yet (control/data-flow is staged in later milestones).

## Why It Exists

1. Deterministic snapshots make translator progress diffable and reviewable.
2. Passes can target explicit nodes instead of ad-hoc text rewriting.
3. We can run static checks (unmapped calls/state writes) before emission.

## Current Schema (`nir_version: 1`)

Top-level fields:

1. `nir_version`
2. `source`
3. `source_sha256`
4. `function_count`
5. `functions[]`

Per-function fields:

1. `id` (stable within file order: `fn_<idx>_<name>`)
2. `name`
3. `span`:
   1. `signature_line`
   2. `body_start_line`
   3. `body_end_line`
4. `body_line_count`
5. `body_sha256`
6. `calls[]` (distinct call target names, first-seen order)
7. `assignments[]`:
   1. `target`
   2. `op`

## Example (trimmed)

```json
{
  "nir_version": 1,
  "source": "nethack-c/src/hack.c",
  "function_count": 88,
  "functions": [
    {
      "id": "fn_0001_uint_to_any",
      "name": "uint_to_any",
      "span": {
        "signature_line": 74,
        "body_start_line": 75,
        "body_end_line": 79
      },
      "body_sha256": "...",
      "calls": [],
      "assignments": [{ "target": "gt.tmp_anything", "op": "=" }]
    }
  ]
}
```

## Pipeline Position

1. Frontend parse/provenance output (`parse-summary`, `provenance-summary`)
2. `nir-snapshot` output (this spec)
3. Rule passes (`state_paths`, `macro_semantics`, `function_map`, `boundary_calls`)
4. JS emitter + diagnostics

## Determinism Requirements

1. Byte-stable output for identical source and profile.
2. Stable key ordering in serializer.
3. No timestamps or host-specific fields in NIR JSON.

## Current Limitations

1. CFG/label/goto graph is not yet included (`P3.4`).
2. Macro-expansion provenance is sidecar, not yet embedded per-NIR node.
3. Assignment inventory is syntactic and conservative.

## Planned Extensions

1. `nir_version: 2`:
   1. basic-block graph,
   2. label/goto edges,
   3. switch/fallthrough tags.
2. `nir_version: 3`:
   1. boundary-call annotations,
   2. async-inference hints.
3. Optional node-level source+PP provenance links.

## CLI

Generate NIR snapshot:

```bash
python3 tools/c_translator/main.py \
  --src nethack-c/src/hack.c \
  --emit nir-snapshot \
  --out docs/port-status/IRON_PARITY_TRANSLATOR_NIR_SNAPSHOT_2026-02-26.json
```
