# Translator Capability Matrix Baseline (Gameplay Set)

Date: 2026-02-26

Files analyzed: 16
Functions: 573/1145 translated (50.0%)

Recent change impact:
- Added canonical state rewrite table (`state_paths.json`).
- Added expression lowering for pointer member access (`->`) and long literals (`123L`).
- Combined with prior statement-lowering improvements, gameplay-set translator yield increased substantially.

Top blocker codes:
- `PLACEHOLDER_BODY`: 572
- `CLANG_AST_UNAVAILABLE`: 223
- `UNRESOLVED_C_TOKENS`: 169
- `UNSUPPORTED_DECL_STMT`: 122
- `UNSUPPORTED_STMT_KIND`: 51
- `BAD_IF_COND`: 7

Top blocker details (for next pass planning):
- `PLACEHOLDER_BODY` x572: Function body emitted as placeholder scaffold.
- `UNRESOLVED_C_TOKENS` x56: Unresolved C tokens after rewrite: flags.
- `UNRESOLVED_C_TOKENS` x30: Unresolved C tokens after rewrite: W_*
- `UNSUPPORTED_STMT_KIND` x19: GOTO_STMT
- `UNRESOLVED_C_TOKENS` x18: Unresolved C tokens after rewrite: svc.
- `UNSUPPORTED_STMT_KIND` x15: UNEXPOSED_STMT
- `UNRESOLVED_C_TOKENS` x14: Unresolved C tokens after rewrite: disp.
- `UNRESOLVED_C_TOKENS` x13: Unresolved C tokens after rewrite: ->
- `UNSUPPORTED_STMT_KIND` x12: PAREN_EXPR
- `UNRESOLVED_C_TOKENS` x10: Unresolved C tokens after rewrite: flags., svc.
- `UNRESOLVED_C_TOKENS` x7: Unresolved C tokens after rewrite: u.
- `UNSUPPORTED_DECL_STMT` x7: branch *br;

Top files by translated ratio:
- `nethack-c/src/read.c`: 41/61 (67.2%)
- `nethack-c/src/apply.c`: 50/76 (65.8%)
- `nethack-c/src/monmove.c`: 33/51 (64.7%)
- `nethack-c/src/mthrowu.c`: 17/27 (63.0%)
- `nethack-c/src/dogmove.c`: 12/20 (60.0%)
- `nethack-c/src/uhitm.c`: 56/101 (55.4%)
- `nethack-c/src/zap.c`: 42/81 (51.9%)
- `nethack-c/src/mklev.c`: 29/56 (51.8%)
- `nethack-c/src/hack.c`: 49/95 (51.6%)
- `nethack-c/src/mhitu.c`: 15/31 (48.4%)

Immediate scale targets:
- Add targeted rewrites for remaining `flags.`, `svc.`, `disp.` unresolved buckets.
- Extend lowering for `GOTO_STMT` and `UNEXPOSED_STMT` via structured fallback transforms.
- Keep matrix-driven loops (measure -> lower -> measure) to ramp from hundreds to thousands.
