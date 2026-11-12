# Lua implementation and ABI

The C-shaped `l*.js` files, JavaScript VM/compiler support and Lua API/OS bridges
live together here. `abi.js` binds the Lua API to caller-provided byte memory;
`os-abi.js` binds OS inputs. Darwin calendar/strftime semantics are supplied by
`../platform/darwin`, generic byte memory by `../c-runtime`, and timezone data by
`../platform/timezone`. No files in this directory require an Emscripten backend.
