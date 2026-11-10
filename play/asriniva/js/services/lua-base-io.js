/* Lua5.4 lbaselib.c load/loadfile/dofile and lauxlib.c file preprocessing.
 * Lua notice: lua/lobject.js. Bytes enter only through injected readFile;
 * this module has no filesystem, Node, network or Wasm dependency. */
import { LuaError, isLuaString, luaStringBytes, numberToString, luaType, byteString } from './lua/lobject.js';
const string = (value, fallback, name, index) => {
  if (value === null || value === undefined) return fallback;
  if (isLuaString(value)) return luaStringBytes(value);
  if (typeof value === 'number' || typeof value === 'bigint') return numberToString(value);
  throw new LuaError(`bad argument #${index} to '${name}' (string expected, got ${luaType(value)})`);
};
const isFunction = value => typeof value === 'function' || value?.luaClosure || value?.luaYieldable;
export function luaFileSource(input) {
  let source = input instanceof Uint8Array ? byteString(input) : luaStringBytes(input);
  if (source.startsWith('\xef\xbb\xbf')) source = source.slice(3);
  let skipped = false;
  if (source[0] === '#') { const end = source.indexOf('\n'); source = end < 0 ? '' : source.slice(end + 1); skipped = true; }
  return source.charCodeAt(0) === 27 ? source : (skipped ? '\n' : '') + source;
}
export function openBaseIO(vm, { readFile = null, readStdin = null } = {}) {
  const compile = (source, name, mode, environment, hasEnvironment) => {
    const binary = source.charCodeAt(0) === 27;
    if (mode !== null && !mode.includes(binary ? 'b' : 't')) throw new LuaError(`attempt to load a ${binary ? 'binary' : 'text'} chunk (mode is '${mode}')`);
    const fn = binary ? vm.loadBinary(Uint8Array.from(source, c => c.charCodeAt(0)), name) : vm.compile(source, name);
    if (hasEnvironment && fn.upvalues?.length) fn.upvalues[0].value = vm.heap.adopt(environment ?? null);
    return fn;
  };
  const protectedCompile = (...args) => { try { return [compile(...args)]; } catch (error) { if (!(error instanceof LuaError)) throw error; return [null, error.value]; } };
  const load = (...args) => load.luaInvoke(args);
  load.luaInvoke = args => {
    let source = args[0], pieces = null;
    const mode = string(args[2], 'bt', 'load', 3).split('\0')[0];
    if (isLuaString(source) || typeof source === 'number' || typeof source === 'bigint') {
      source = string(source, null, 'load', 1);
      return protectedCompile(source, string(args[1], source, 'load', 2).split('\0')[0], mode, args[3], args.length > 3);
    }
    if (!isFunction(source)) throw new LuaError(`bad argument #1 to 'load' (function expected, got ${luaType(source)})`);
    const name = string(args[1], '=(load)', 'load', 2).split('\0')[0];
    // Lua's reader callback is a non-yieldable C boundary. Errors become the
    // parser's load error result; zero-length strings end the input too.
    try {
      pieces = [];
      while (true) {
        let part = vm.call(source, [])[0] ?? null;
        if (part === null) break;
        if (!(isLuaString(part) || typeof part === 'number' || typeof part === 'bigint')) throw new LuaError(vm.debug.where(vm.currentThread,1)+'reader function must return a string');
        part = string(part, '', 'load', 1); if (!part.length) break;
        pieces.push(part); vm.heap.adopt(part);
      }
      return protectedCompile(pieces.join(''), name, mode, args[3], args.length > 3);
    } catch (error) { if (!(error instanceof LuaError)) throw error; return [null, error.value]; }
  };
  const file = (args, name) => {
    const path = string(args[0], null, name, 1)?.split('\0')[0] ?? null;
    const mode = name === 'dofile' ? null : string(args[1], null, name, 2)?.split('\0')[0] ?? null;
    let source;
    try {
      const reader = path === null ? readStdin ?? readFile : readFile;
      if (!reader) throw new LuaError('Lua file input requires an injected file service');
      source = luaFileSource(reader(path));
    } catch (error) {
      if (error instanceof LuaError) return [null, error.value];
      const detail = error.luaMessage ?? error.strerror ?? error.message ?? String(error);
      return [null, `cannot ${error.luaOperation ?? 'open'} ${path ?? 'stdin'}: ${detail}`];
    }
    return protectedCompile(source, path === null ? '=stdin' : '@' + path, mode, args[2], name === 'loadfile' && args.length > 2);
  };
  const loadfile = (...args) => loadfile.luaInvoke(args); loadfile.luaInvoke = args => file(args, 'loadfile');
  const dofile = (...args) => vm.run(dofile.luaYieldableArray(args), { boundary: false });
  dofile.luaYieldableArray = function* (args) { const result = file(args, 'dofile'); if (result[0] === null) throw new LuaError(result[1]); return yield* vm.callG(result[0], []); };
  vm.setGlobal('load', load); vm.setGlobal('loadfile', loadfile); vm.setGlobal('dofile', dofile);
  return { load, loadfile, dofile };
}
