# C Translator 99% Capability Gaps (Current State)

Date: 2026-02-27
Source artifacts:
- `/tmp/translator-batch-full-summary-posthelper.json`
- `/tmp/translator-runtime-stitch-candidates-posthelper.json`
- `/tmp/translator-runtime-stitch-safety-posthelper.json`
- `/tmp/translator-runtime-stitch-apply-posthelper.json`
- `/tmp/marked-autotranslation-audit-posthelper.json`

## Executive Summary

Current funnel after latest helper lowering:

- Emitted: `2529` functions
- Clean candidates: `2387`
- Runtime matched exports: `2330`
- Safe now: `421`
- Unsafe: `1909`
- Safe but signature-blocked: `53`
- Safe and immediately stitchable: `14`

Marked/autotranslated set status:

- Marked (paired): `1403`
- Marked safe now: `351`

Conclusion: translator breadth is high, but safe/stitchable coverage is still constrained by a small number of recurring blocker classes. Reaching 99% practical capability requires eliminating these classes, not one-off function fixes.

## Gap Categories (Major)

## 1) Syntax Emission Defects (Hard Blocker)

Observed syntax failures: `49` functions.

Top error classes:
- `Unexpected token '*'` (`25`)
- `Invalid left-hand side in assignment` (`6`)
- `Unexpected identifier '_reason'` (`4`)
- `Octal literals are not allowed in strict mode` (`4`)
- others (`10` total)

Representative failures:
- `js/botl.js: cond_cmp, menualpha_cmp`
- `js/dbridge.js: find_drawbridge`
- `js/hacklib.js: highc/lowc/lcase/ucase`
- `js/cmd.js: timed_occupation`

What this means:
- We still emit illegal JS for recurring C forms (pointer deref patterns, legacy octal forms, malformed assignment lowering).
- This is a high-priority foundational defect: syntax-invalid output cannot enter any later gate.

## 2) Safety Lint False Positives on Helper-Lowered Code (High Impact)

After helper lowering, dominant unknowns include translator-internal/local constructs:
- unknown calls: `replace`, `match`, `shift`, `slice`, `localeCompare`, `toLowerCase`
- unknown identifiers: `__fmt`, `__a`, `__f`, `__v`, `__stars`, regex charclass tokens (`hlLzjt`, `cCdioux...`)

These are mostly artifacts of inline formatter expansion and current safety scanner heuristics, not true unresolved game symbols.

Impact:
- Inflates `unsafe_unknown_*` categories and suppresses safe counts.
- Masks real missing-symbol work with noise.

## 3) Missing Symbol/Helper/Global Surface (Real Gating)

Still-high unresolved symbols in unsafe set include real gameplay/runtime dependencies:
- `impossible`, `pline`, `Monnam`, `You`, `newsym`, `canseemon`, `canspotmon`, `m_at`, `t_at`, `alloc`, `SIZE`, etc.
- Global/state symbols: `objects`, `fmon`, `Blind`, `Hallucination`, `sysopt`, etc.

This class requires either:
1. canonical helper implementation/import exposure, or
2. translator rewrite to canonical equivalents.

## 4) Signature Mismatch / Call Contract Drift (`53` safe-but-blocked)

Top modules:
- `do_wear.js` (`8`)
- `mklev.js` (`8`)
- `muse.js` (`5`)

Common mismatch types:
- arity mismatch
- missing key params (`map`, `player`)
- key param order mismatch

This is a systematic interface-canonicalization issue and should be treated as a bulk refactor lane.

## 5) Semantic Hazard Blocks (`MODULE_SEMANTIC_BLOCK`, `NUL_SENTINEL_ASSIGN`, etc.)

Counts:
- `MODULE_SEMANTIC_BLOCK`: `117` occurrences
- `NUL_SENTINEL_ASSIGN`: `35`
- others smaller (`WHOLE_STRING_HIGHC_LOWC`, `POINTER_TRUTHY_FOR`)

Meaning:
- We intentionally block modules/functions where pointer/string semantics are not yet safely lowered.
- This is expected, but we need staged hazard-specific lowerings to retire these blocks.

## 6) Out-Param + Callsite Rewrite Not Yet Complete

From out-param audit:
- `116` functions with direct out-param writes
- `15` single-out-void candidates (easy lane)
- `101` multi/out+return candidates (needs structured return + callsite rewrite)

Without this, broad classes of C functions remain partially translatable but non-stitchable.

## 7) Format-Spec Coverage for Message/Print Paths

`Sprintf/Snprintf` lowering exists but needs robust spec handling and sink integration:
- `%.*s`, width/precision families, edge semantics
- `pline/raw_printf` family formatter contract execution

This is required for high-confidence translation in UI/message-heavy files.

## 8) Unmatched Export Coverage (`57` clean functions)

These are translatable outputs lacking corresponding JS export targets.

Required lane:
- controlled insertion of new function exports and/or canonical file mapping expansion.

## 99% Capability Program (Priority Order)

## P0 (Immediate, blocking quality)
1. Fix syntax emitter defects until syntax_not_ok is near zero.
2. Remove safety false positives on helper-lowered output.

## P1 (Scale enablers)
1. Complete helper/global symbol surface for top unresolved runtime symbols.
2. Bulk-fix signature mismatch lanes (`do_wear`, `mklev`, `muse`, etc.).
3. Implement out-param return/callsite rewrite for `single-out-void` first.

## P2 (High-fidelity expansion)
1. Expand formatting spec support and `pline/raw_printf` sink lowering.
2. Retire semantic-block modules with hazard-specific transforms.
3. Insert unmatched clean exports in controlled waves.

## Measurable Exit Targets

Translator funnel targets for “vast majority” capability:
- syntax_not_ok: `<= 5`
- safe candidates: `>= 1200`
- safe-but-signature-blocked: `<= 25`
- immediate stitchable (non-marked): `>= 300`
- marked safe now: `>= 900`

Secondary quality gates:
- no unit-test regressions
- session baseline non-regressing
- blocked categories trend dashboard updated per wave

## Active Work Starting Now

Immediate implementation wave begins with:
1. safety false-positive elimination for helper-lowered code
2. syntax-class fixes for `Unexpected token '*'` and octal/assignment emissions

These two lanes give the highest short-term lift in safe candidate count and signal quality.
