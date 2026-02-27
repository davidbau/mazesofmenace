# C Translator: Out-Param + Formatting Architecture

## Goal
Unblock high-volume autotranslation by handling two recurrent C idioms that currently fail JS safety/semantic gates:

1. Out-parameter mutation (`*p = ...`, `p[i] = ...`, `Strcpy(p, ...)`, `Sprintf(p, ...)`).
2. C string-formatting sinks (`Sprintf`, `Snprintf`) that are currently emitted as unresolved C helpers.

This design is C-faithful in logic/order while producing JS-native, testable data flow.

## Current Audit (actual repo state)

Audit tool: `tools/c_translator/audit_outparams_and_formatting.py`

Input artifacts:
- `/tmp/translator-batch-full-summary.json`
- `/tmp/translator-runtime-stitch-safety-full.json`

Observed counts:
- `2528` functions in full translator summary.
- `1556` functions with pointer/array-like params.
- `116` functions with direct out-param writes detected.
- `15` functions are `single out-param + void/no-value return` (best first lane for return-lifting).
- `101` functions are `multi-out-param or out-param + value return` (needs object-return model).
- `203` functions call `Sprintf`/`Snprintf`.
- `21` functions call `Sprintf`/`Snprintf` with detected out-param sinks.

From marked-autotranslation audit (`1404` marker set):
- `78` currently marked functions are blocked by `Sprintf/Snprintf` unknown-symbol gating.
- `77/78` currently stitched JS bodies still contain direct `Sprintf(`/`Snprintf(` calls.
- Large subset is gating/surface, not deep translator drift.

## Representative Real Functions

### Single out-param lane (convertible to return value)
- `cmd.c:3697` `random_response(buf, sz)`
- `pager.c:379` `look_at_object(..., buf)`
- `version.c:21` `version_string(buf)`

### Multi out-param / out+return lane
- `botl.c:2318` `split_clridx(..., int *coloridx, int *attrib)`
- `coloratt.c:985` `closest_color(..., int *bestidx, int *distance)`
- `do_name.c:1368` `bogusmon(..., int *class, int *mndx)`

### Formatting sinks writing out buffers
- `botl.c:1628` `anything_to_s(..., char *buf, ...)`
- `cmd.c:3338` `key2txt(..., char *txt, ... )`
- `dungeon.c:3401` `endgamelevelname(..., char *outbuf)`
- `mdlib.c:299` `mdlib_version_string(char *outbuf)`

## Architecture

## 1) Out-Param Detection (frontend + NIR annotation)

Detection rule for each param `p` in function `f`:
1. Param is pointer/array-like in C signature.
2. Function body contains at least one direct write pattern:
   - `*p = ...`
   - `p[...] = ...`
   - known write-sink call with first arg `p`: `Strcpy/Strcat/Sprintf/Snprintf/...`

Emit NIR annotations:
- `param_roles[p] in {in, out, inout}`
- `out_write_sites[p]` (AST node ids / source spans)
- `out_sink_kind[p] in {scalar, buffer, struct_field, unknown}`

## 2) Out-Param Shape Classification

Per function classification:
1. `F_OUT_SINGLE_VOID`: one out-param; function returns void/no-value.
2. `F_OUT_SINGLE_PLUS_RET`: one out-param + explicit return value.
3. `F_OUT_MULTI`: multiple out-params.
4. `F_OUT_COMPLEX`: pointer aliasing/escaping, unsupported writes, or ambiguous control flow.

Safety policy:
- `F_OUT_SINGLE_VOID`, `F_OUT_SINGLE_PLUS_RET`, `F_OUT_MULTI` are translatable with rewrite.
- `F_OUT_COMPLEX` is blocked pending explicit rule entry.

## 3) JS Emission Model for Out-Params

### 3a. Single out-param + void
C:
```c
void foo(int *out) { *out = expr; }
```
JS emitted shape:
```js
export function foo(/* ... */) {
  let out = expr;
  return out;
}
```

### 3b. Single out-param + return value
C:
```c
int foo(int *out) { *out = expr; return rv; }
```
JS emitted shape:
```js
export function foo(/* ... */) {
  let out = expr;
  let result = rv;
  return { result, out };
}
```

### 3c. Multiple out-params (with or without return)
JS emitted shape:
```js
return { result, out1, out2, ... };
```
If C has no explicit return value, emit `result: undefined` only when callsite expects one; otherwise omit.

## 4) Callsite Rewrite Contract

Translator must rewrite callsites using function summary metadata.

Examples:
- C:
```c
foo(&x);
```
  JS:
```js
x = foo();
```

- C:
```c
rv = foo(&x);
```
  JS:
```js
({ result: rv, x } = foo());
```

- C:
```c
foo(&x, &y);
```
  JS:
```js
({ x, y } = foo());
```

This requires interprocedural signature knowledge in the translator function index.

## 5) Formatting Intrinsics Translation (`Sprintf/Snprintf`)

Add dedicated lowering before safety lint:
1. Recognize `Sprintf(dst, fmt, ...)` and `Snprintf(dst, n, fmt, ...)` as formatting intrinsics.
2. Convert to JS string expression via `c_format(fmt, args, opts)` emitter helper.
3. Apply destination form rewrite:
   - `dst` plain variable: `dst = c_format(...)`
   - append forms (e.g., C `Sprintf(eos(buf), ...)`): `buf += c_format(...)`
   - bounded `Snprintf`: `dst = c_format(..., { maxLen: n })`
4. Preserve C truncation semantics where relevant (`Snprintf`) in helper.

Safety impact:
- post-lowering, unresolved-symbol gates should not see raw `Sprintf/Snprintf` in emitted JS.

## 6) Rule Tables / Config

Add/extend translator rulesets:
1. `rulesets/outparam_policy.json`
   - function-level overrides (`force_in`, `force_out`, `force_inout`, `complex_block`).
2. `rulesets/format_intrinsics.json`
   - supported format verbs and rewrite strategy (`template`, `helper_call`, `block`).
3. `rulesets/callsite_rewrite_policy.json`
   - allowed destructure rewrite patterns and exceptions.

## 7) Pipeline Integration

Order in pipeline:
1. Parse + NIR build
2. Out-param role inference
3. Formatting intrinsic lowering
4. Function emission
5. Callsite rewrite pass
6. Safety lint (on lowered output)

`runtime_candidate_safety.py` should treat this lowered output as authoritative and stop flagging legacy `Sprintf/Snprintf` names once lowering is active.

## 8) Rollout Plan

1. Implement `Sprintf/Snprintf` lowering for local-buffer assignments and append (`eos(buf)`) cases.
2. Enable `F_OUT_SINGLE_VOID` return-lift + callsite rewrite (smallest-risk lane).
3. Enable `F_OUT_SINGLE_PLUS_RET` object-return rewrite.
4. Enable `F_OUT_MULTI` object-return rewrite.
5. Keep `F_OUT_COMPLEX` blocked with explicit diagnostics in refactor queue.

## 9) Validation

For each rollout step:
1. Translator unit tests for emission + callsite rewrite.
2. Full translator dry-run counts (`safe`, `stitchable`, blocked categories).
3. Unit tests + session parity baseline checks.
4. Marked-function regression audit (`audit_marked_autotranslations.py`) to confirm category reductions.

## 10) Practical Next Work Items

1. Add `FORMAT_INTRINSIC` lowering node in emitter for `Sprintf/Snprintf`.
2. Add `out_param_summary` to function metadata output JSON.
3. Implement destructuring rewrite in callsite pass.
4. Extend safety lint to consume `out_param_summary` and suppress false unknown-symbol blocks after lowering.
5. Re-run full marked audit and report before/after on the `78` sprintf-blocked marked functions.
