# Translator Capability Matrix Baseline (Gameplay Set)

Date: 2026-02-26

Files analyzed: 16
Functions: 142/1145 translated (12.4%)

Top blocker codes:
- `PLACEHOLDER_BODY`: 1003
- `UNRESOLVED_C_TOKENS`: 336
- `UNSUPPORTED_STMT_KIND`: 330
- `CLANG_AST_UNAVAILABLE`: 223
- `UNSUPPORTED_DECL_STMT`: 113
- `BAD_IF_COND`: 1

Top blocker details (for next pass planning):
- `PLACEHOLDER_BODY` x1003: Function body emitted as placeholder scaffold.
- `UNRESOLVED_C_TOKENS` x141: Unresolved C tokens after rewrite: ->
- `UNSUPPORTED_STMT_KIND` x109: CSTYLE_CAST_EXPR
- `UNSUPPORTED_STMT_KIND` x103: COMPOUND_ASSIGNMENT_OPERATOR
- `UNSUPPORTED_STMT_KIND` x69: SWITCH_STMT
- `UNRESOLVED_C_TOKENS` x27: Unresolved C tokens after rewrite: u.
- `UNSUPPORTED_STMT_KIND` x27: DO_STMT
- `UNRESOLVED_C_TOKENS` x22: Unresolved C tokens after rewrite: levl[]
- `UNRESOLVED_C_TOKENS` x19: Unresolved C tokens after rewrite: ->, u.
- `UNSUPPORTED_STMT_KIND` x13: GOTO_STMT

Top files by translated ratio:
- `nethack-c/src/cmd.c`: 48/183 (26.2%)
- `nethack-c/src/mthrowu.c`: 5/27 (18.5%)
- `nethack-c/src/sp_lev.c`: 24/145 (16.6%)
- `nethack-c/src/read.c`: 8/61 (13.1%)
- `nethack-c/src/hack.c`: 12/95 (12.6%)
- `nethack-c/src/dungeon.c`: 12/112 (10.7%)
- `nethack-c/src/dogmove.c`: 2/20 (10.0%)
- `nethack-c/src/zap.c`: 8/81 (9.9%)
- `nethack-c/src/apply.c`: 7/76 (9.2%)
- `nethack-c/src/mklev.c`: 5/56 (8.9%)

Immediate scale targets:
- Add lowering support for `CSTYLE_CAST_EXPR`, `COMPOUND_ASSIGNMENT_OPERATOR`, `SWITCH_STMT`, `DO_STMT`.
- Expand canonical rewrite rules for unresolved `->`, `u.`, `levl[]` token classes.
- Continue using capability matrix before/after each lowering batch to quantify progress.
