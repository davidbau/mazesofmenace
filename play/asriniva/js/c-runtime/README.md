# Shared JavaScript C runtime

`index.js` is the public surface for the configured LP64 C runtime. These are
JavaScript implementations: no C helper, Wasm loader, NetHack import or host
filesystem is part of this layer. It remains a bounded runtime for this port,
not a complete implementation of every C/Unix facility.

## Responsibilities

| Files | Responsibility |
| --- | --- |
| `runtime.js` | Per-instance assembly; caller-injected declarations, inherited services and conversion aliases |
| `adapter-memory.js`, `adapter-factories.js` | Stack scopes, explicit conversion profiles, scalar environments, descriptor memory, record/global factories and native dependency calls |
| `memory.js` | Addresses, scalar loads/stores/conversions, allocation, stack scopes and literals |
| `records.js` | Shared record identity, field properties and indexed-view machinery |
| `types.js`, `bitfields.js`, `record-views.js` | Measured types, unions, arrays, pointers, bitfields and live property views |
| `functions.js` | Callback identities, signature checks, targeted jump scopes and exit |
| `linker.js` | Public symbols, deferred exports, globals, initialization, dependency and invocation scopes |
| `address-bindings.js` | Measured-schema binding of field/global/callback/dependency transport |
| `libc.js`, `scanf.js`, `qsort.js`, `stdio.js` | Configured library operations and synchronous streams on injected CVFS |
| `environment-inputs.js` | Caller-injected environment strings in addressable memory |
| `heap.js`, `stdlib.js`, `time.js`, `vfs.js`, `float-format.js` | Byte allocator, base libc/formatting, calendar and virtual filesystem |
| `context.js` | Synchronous, reentrant C/R/T scope for source-shaped translations |
| `library-bindings.js`, `regex-abi.js` | Injected library/regex ABI bindings |

The shared runtime does not own game rules, header macros, game globals or
platform defaults. Typedefs/header field aliases are in
`../nethack/declarations.js`; NetHack module selection and special static
storage are in `../nethack/address-ports.js`. `runtime-bindings.js` supplies
NetHack's declarations to the common instance factory. `../nethack/runtime.js`
provides allocation/string/calendar/regex/RNG policies from translated sources.
The standalone environment composes these owners and game subsystems.

Required standalone entry points (`memory-services`, `functions`, `c-types`,
`record-views`, `address-ports`, and the platform `libc` wrapper) retain existing
interfaces and class identities. Six unused forwarding files were removed after
migrating their consumers; the old `ported/js-runtime.js` provider path is retired. NetHack's platform `getpid` default remains in its provider wrapper.
The synchronous `C/R/T` scope facade lives in `context.js`; translation-specific
adapters live in `../nethack/bindings`. Both pure-JS and mixed callers use these
owners directly. Header alias declarations live in `../nethack/header-aliases.js`.

## Contracts preserved by consolidation

- Views read current memory after growth; their addresses never retarget.
- Record assignment copies storage; pointer assignment preserves aliasing.
- Automatic local reservation does not introduce implicit zero initialization.
- Stack cleanup occurs during exceptions and nested/reentrant calls.
- Per-instance globals, callback registries and initialization state stay isolated.
- The old declaration-backed array surface bounds-checks every element and
  recognizes canonical numeric keys. The typed-C view surface also recognizes
  leading-zero keys and supplies address-only one-past sentinels for record
  arrays. These intentional legacy distinctions are explicit options on one
  indexed-view implementation; both use the declaration's original extent.
- Header aliases are nonenumerable; record fields retain their existing
  enumerability, setters, copying and string-pointer behavior.
- Existing unresolved functions and unsupported operations still fail explicitly.

`recordType(name)` binds a registered declaration to `size`, `view`, `array`
and `local`. A local optionally initializes declared fields in order. This is
field initialization, not arbitrary overlapping struct assignment.

## Verification

With the configured SDK Node and `STANDALONE_REFERENCE_ROOT` set:

```sh
node scripts/check-services-layout.mjs
node scripts/test-binding-infrastructure.mjs
node scripts/check-c-runtime-boundaries.mjs
node scripts/check-c-runtime-relocation.mjs
node scripts/check-c-runtime-extraction.mjs
node scripts/test-c-runtime-adapter-memory.mjs
node scripts/test-c-runtime-memory.mjs
node scripts/test-c-runtime-contracts.mjs
node scripts/write-c-runtime-manifest.mjs --check
```

The adapter profiles also cover scalar/pointer fields, pointer sequences, C
aggregate initialization, type sizes and vararg-format classification. Their
source-specific conventions remain explicit. Adapters use one `Crt` namespace
import; the shared functions do not observe a call receiver or implicit arguments.

The checks enforce generic dependency boundaries, mechanical relocation of
existing factories, unchanged game policy/frozen inputs, memory and linker
contracts, and the cleanup's source hashes. Original-C component and connected
startup comparisons remain separate; see
`../../docs/runtime-environment/C_RUNTIME_CLEANUP.md` for actual results and
inherited reference/provenance blockers.

This cleanup does not add a playable backend, establish new whole-game scores,
change game algorithms or claim a performance improvement. Deleting the mixed
backend and its remaining C bridges remains gated on complete pure-JS acceptance.
