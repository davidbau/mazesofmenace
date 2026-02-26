# Translator Capability Matrix Baseline (Gameplay Set)

Date: 2026-02-26

Files analyzed: 16
Functions: 529/1145 translated (46.2%)

Recent change impact:
- Added lowering for C boolean/null literals, function-pointer call syntax, array initializers, and common casts.
- Tightened unresolved-token guard for C global prefixes (`igame.*`, `go.*`, `gy.*`, `gt.*`, `gv.*`) and residual C casts.
- Net effect: stricter, more realistic capability accounting (fewer false-positive "translated" results).

Top blocker codes:
- `PLACEHOLDER_BODY`: 616
- `CLANG_AST_UNAVAILABLE`: 239
- `UNRESOLVED_C_TOKENS`: 216
- `UNSUPPORTED_DECL_STMT`: 97
- `UNSUPPORTED_STMT_KIND`: 54
- `BAD_IF_COND`: 7

Top blocker details (for next pass planning):
- `PLACEHOLDER_BODY` x616: Function body emitted as placeholder scaffold.
- `UNRESOLVED_C_TOKENS` x107: Unresolved C tokens after rewrite: gy.
- `UNRESOLVED_C_TOKENS` x27: Unresolved C tokens after rewrite: igame.
- `UNRESOLVED_C_TOKENS` x23: Unresolved C tokens after rewrite: gv., gy.
- `UNSUPPORTED_STMT_KIND` x19: GOTO_STMT
- `UNSUPPORTED_STMT_KIND` x19: UNEXPOSED_STMT
- `UNRESOLVED_C_TOKENS` x16: Unresolved C tokens after rewrite: C-cast
- `UNRESOLVED_C_TOKENS` x10: Unresolved C tokens after rewrite: gt.
- `UNSUPPORTED_STMT_KIND` x10: PAREN_EXPR
- `UNRESOLVED_C_TOKENS` x7: Unresolved C tokens after rewrite: go.

Top files by translated ratio:
- `nethack-c/src/apply.c`: 51/76 (67.1%)
- `nethack-c/src/monmove.c`: 34/51 (66.7%)
- `nethack-c/src/do.c`: 28/45 (62.2%)
- `nethack-c/src/hack.c`: 57/95 (60.0%)
- `nethack-c/src/muse.c`: 27/45 (60.0%)
- `nethack-c/src/wizard.c`: 12/21 (57.1%)
- `nethack-c/src/zap.c`: 46/81 (56.8%)
- `nethack-c/src/getpos.c`: 9/22 (40.9%)
- `nethack-c/src/trap.c`: 16/44 (36.4%)
- `nethack-c/src/sp_lev.c`: 19/130 (14.6%)

Immediate scale targets:
- Add rewrite coverage for unresolved C global umbrellas (`gy.*`, `igame.*`, `go.*`, `gt.*`, `gv.*`).
- Add lowering for remaining statement kinds (`GOTO_STMT`, `UNEXPOSED_STMT`, `PAREN_EXPR`, `LABEL_STMT`).
- Expand declaration handling for pointer declarator forms (for example `timer_element *curr;`).
