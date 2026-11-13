# NetHack runtime and bindings

This directory owns NetHack-specific JavaScript infrastructure: the complete game
environment, startup and lifecycle, globals, subsystem integration, measured ABI
declarations, and the adapters in `bindings/`.

- `environment.js` assembles a game instance and registers its services.
- `program.js` supplies the independent JavaScript program entry.
- Subsystem modules such as `light.js`, `commands.js` and `save-lifecycle.js`
  connect the translated algorithms to the game instance.
- `bindings/` supplies field, global, callback and dependency adapters for the
  source-shaped translations in `../ported/`.
- JSON declarations retain the original measured layouts and source evidence.

General C behavior belongs in `../c-runtime/`: memory, integers, records, libc,
stdio, files and callback machinery. Lua and platform implementations keep their
own directories. The former `js/standalone` sources now live here; there is no
second production runtime tree or compatibility directory.

Historical source receipts keep their original paths and hashes. The checked
consolidation recipe provides a read-only prior-layout audit view when those
old receipts are reproduced. Current runtime tests import the modules here.

Run `npm run test:layout` to check the exact relocation, all current relative
imports, environment initialization with Wasm denied, and source-drift rejection.
Existing standalone-named commands and public APIs retain their names.
