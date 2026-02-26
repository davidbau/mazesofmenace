# Translator Capability Matrix Baseline (Gameplay Set)

Date: 2026-02-26

Files analyzed: 16
Functions: 167/1145 translated (14.6%)

Recent change impact:
- Added lowering support for `DO_STMT`, `SWITCH_STMT`, `CASE_STMT`, `DEFAULT_STMT`, `CSTYLE_CAST_EXPR`, `COMPOUND_ASSIGNMENT_OPERATOR`.
- Gameplay-set translatable count improved to current total above.

Top blocker codes:
- `PLACEHOLDER_BODY`: 978
- `UNRESOLVED_C_TOKENS`: 575
- `CLANG_AST_UNAVAILABLE`: 223
- `UNSUPPORTED_DECL_STMT`: 122
- `UNSUPPORTED_STMT_KIND`: 51
- `BAD_IF_COND`: 7

Top blocker details (for next pass planning):
- `PLACEHOLDER_BODY` x978: Function body emitted as placeholder scaffold.
- `UNRESOLVED_C_TOKENS` x211: Unresolved C tokens after rewrite: ->
- `UNRESOLVED_C_TOKENS` x49: Unresolved C tokens after rewrite: ->, u.
- `UNRESOLVED_C_TOKENS` x33: Unresolved C tokens after rewrite: u.
- `UNRESOLVED_C_TOKENS` x27: Unresolved C tokens after rewrite: levl[]
- `UNRESOLVED_C_TOKENS` x21: Unresolved C tokens after rewrite: *L, ->
- `UNSUPPORTED_STMT_KIND` x19: GOTO_STMT
- `UNRESOLVED_C_TOKENS` x15: Unresolved C tokens after rewrite: ->, levl[]
- `UNSUPPORTED_STMT_KIND` x15: UNEXPOSED_STMT
- `UNRESOLVED_C_TOKENS` x12: Unresolved C tokens after rewrite: &u., ->, u.

Top files by translated ratio:
- `nethack-c/src/cmd.c`: 56/183 (30.6%)
- `nethack-c/src/mthrowu.c`: 6/27 (22.2%)
- `nethack-c/src/u_init.c`: 3/17 (17.6%)
- `nethack-c/src/sp_lev.c`: 24/145 (16.6%)
- `nethack-c/src/read.c`: 9/61 (14.8%)
- `nethack-c/src/dungeon.c`: 16/112 (14.3%)
- `nethack-c/src/mklev.c`: 8/56 (14.3%)
- `nethack-c/src/zap.c`: 11/81 (13.6%)
- `nethack-c/src/hack.c`: 12/95 (12.6%)
- `nethack-c/src/do.c`: 5/45 (11.1%)

Immediate scale targets:
- Expand canonical rewrite rules for unresolved `->`, `u.`, `levl[]` token classes.
- Add lowering for `GOTO_STMT`/label-heavy functions via structured loop-switch transforms.
- Continue capability-matrix before/after each lowering batch to quantify throughput.
