# GIFREAD standalone first-pass profile

Readable original-function JavaScript plus typed native libc/stdio/layout transport. This is a separate utility profile, with no game registry/harness change. Original utility and all eight real native dependency sources remain the oracle/dependencies. No decoder/writer/naming policy fallback is introduced in C.

Use a fresh absolute output path; the builder rejects existing directories. From the repository root:

```sh
OUT="$PWD/.cache/gifread-fresh-UNIQUE"
python3 scripts/build-utility-gifread.py --out "$OUT" --source-root "$PWD"
python3 scripts/fixtures-utility-gifread.py --out "$OUT"
python3 scripts/check-utility-gifread.py --out "$OUT" --source-root "$PWD"
UTILITY_GIFREAD_OUT="$OUT" .cache/emsdk/node/24.19.0_64bit/bin/node scripts/test-utility-gifread.mjs
```

26 defined-input scenarios and7 separately labeled empirical EmC scenarios. The original GetCode firstdecode reads buf[last_byte-2/-1] with zero last_byte; exact source initialization/order and unpadded native backing remain. Full decoder observations are NOT defined-C equivalence or general GIF acceptance. No hidden catalogue startup.

Actual profile: SDK4.0.10/Clang21 MEMORY64=1, NOTPARMDECL/NO_TIMED_DELAY, actual configured headers and GCC layout, no platform spoof. Builder prospectively hashes actual source/header/dependency closure and current SDK serializer/tool/source/archive inputs without copying the SDK. Current reviewed serializer24b is required. The external system GIF encoder (GIFREAD only) produces test fixtures, not decoder implementation.

Original/mixed pairs run in isolated MEMFS. No shared generated headers or graphics configuration are written. Native dependency/pointer/string/FILE/storage lifetime behavior is preserved within the declared fixtures; no arbitrary callback/reentry/fullgame/performance/nativeMac claim.
