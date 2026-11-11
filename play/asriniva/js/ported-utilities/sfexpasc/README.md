# SFEXPASC standalone SFCTOOL dependency profile

Readable139 original functions (86 macro-expanded empty +53 handwritten),40 original comments and two authoritative procedure-selector tables. Three static buffers/native procedure structs use zero-only storage; startup fills actual native function pointers before any foreign C read. Other serializer TUs remain original native dependencies.

From the repository root choose a NEW absolute output path and genuine generated metadata directory:

```sh
OUT="$PWD/.cache/sfexpasc-fresh-UNIQUE"
GENERATED="$PWD/.cache/utility-sfctool-port/generated"
python3 scripts/build-utility-sfexpasc.py --out "$OUT" --source-root "$PWD" --generated-root "$GENERATED"
python3 scripts/check-utility-sfexpasc.py --out "$OUT" --source-root "$PWD"
TZ=UTC UTILITY_SFEXPASC_OUT="$OUT" .cache/emsdk/node/24.19.0_64bit/bin/node scripts/test-utility-sfexpasc.mjs
TZ=UTC UTILITY_SFEXPASC_OUT="$OUT" .cache/emsdk/node/24.19.0_64bit/bin/node scripts/test-utility-sfexpasc-catalogues.mjs
```

Generated sfdata.c/sfproto.h must come from the actual project Ctags+original SFTAGS pipeline, not fabricated headers or padded project input. The proof used UniversalCtags6.2.1 and unmodified original SFTAGS on5456 genuine records; original SFTAGS short-tail UB makes that generator output empirical/pinned, not general defined-C acceptance. A separate JS-SFTAGS genuine-tag mismatch is OPEN and is not hidden by this serializer proof.

Actual SDK4.0.10/Clang21/MEMORY64 optional utility flags: NOTPARMDECL/NO_TIMED_DELAY/SFCTOOL/NOPANICTRACE/NOCRASHREPORT/NO_CHRONICLE. No platform spoof or SAVEFILE_DEBUGGING enablement. Builder requires reviewed SDK serializer24b and prospectively binds actual native source/header/tool/source/archive inputs without SDK copying. The actual profile uses6 native dependency units, so the18 recorded commands comprise1 owner AST+9 dependency scans+6 compiles+2 links; no artificial22-command count.

Unchanged tests:197 complete originalC/mixed comparisons across all139 functions;278 catalogue/foreign-scalar checks. Guard retains exact byte regeneration, selectors/names/formals/comments and3 rejecting mutations. No full SFCTOOL CLI, every generated recursive structure path, malformed/overflowing/null input, OOM, arbitrary reentry, nativeMac/game/performance claim. Explicit glorkum pointer normalization is limited to that known original literal across independent Modules.
