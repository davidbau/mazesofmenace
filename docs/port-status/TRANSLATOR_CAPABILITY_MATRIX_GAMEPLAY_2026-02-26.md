# Translator Capability Matrix Baseline (Gameplay Set)

Date: 2026-02-26

Command:
```bash
conda run -n base python tools/c_translator/capability_matrix.py \
  --src nethack-c/src/hack.c --src nethack-c/src/dogmove.c --src nethack-c/src/monmove.c \
  --src nethack-c/src/mhitu.c --src nethack-c/src/uhitm.c --src nethack-c/src/zap.c \
  --src nethack-c/src/muse.c --src nethack-c/src/do.c --src nethack-c/src/cmd.c \
  --src nethack-c/src/read.c --src nethack-c/src/apply.c --src nethack-c/src/mthrowu.c \
  --src nethack-c/src/mklev.c --src nethack-c/src/sp_lev.c --src nethack-c/src/dungeon.c \
  --src nethack-c/src/u_init.c \
  --out docs/port-status/TRANSLATOR_CAPABILITY_MATRIX_GAMEPLAY_2026-02-26.json
```

Files analyzed: 16
Functions: 142/1145 translated (12.4%)

Top blocker codes:
- `PLACEHOLDER_BODY`: 1003
- `UNRESOLVED_C_TOKENS`: 336
- `UNSUPPORTED_STMT_KIND`: 330
- `CLANG_AST_UNAVAILABLE`: 223
- `UNSUPPORTED_DECL_STMT`: 113
- `BAD_IF_COND`: 1

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
- Reduce `UNSUPPORTED_STMT_KIND` by adding lowering for remaining statement kinds.
- Reduce `UNRESOLVED_C_TOKENS` by expanding rewrite tables for canonical global paths.
- Reduce `CLANG_AST_UNAVAILABLE` by extending parse support for problematic signatures/macros.
