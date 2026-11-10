/* Lua5.4 lbaselib.c load/loadfile/dofile and lauxlib.c file preprocessing.
 * Lua notice: lua/lobject.js. Bytes enter only through injected readFile;
 * this module has no filesystem, Node, network or Wasm dependency. */
import { luaAuxError, luaTypeError } from './lua-aux-error.js';
import { LuaError, isLuaString, luaStringBytes, numberToString, byteString } from './lua/lobject.js';
const isFunction = value => typeof value === 'function' || value?.luaClosure || value?.luaYieldable;
export function luaFileSource(input) {
  let source = input instanceof Uint8Array ? byteString(input) : luaStringBytes(input);
  if (source.startsWith('\xef\xbb\xbf')) source = source.slice(3);
  let skipped = false;
  if (source[0] === '#') { const end = source.indexOf('\n'); source = end < 0 ? '' : source.slice(end + 1); skipped = true; }
  return source.charCodeAt(0) === 27 ? source : (skipped ? '\n' : '') + source;
}
export function createBaseIOFunctions(vm, { readFile = null, readStdin = null } = {}) {
  const string=(value,fallback,_name,index)=>value===null||value===undefined?fallback:vm.checkString(value,index-1);
  const compile = (source, name, mode, environment, hasEnvironment) => {
    const binary = source.charCodeAt(0) === 27;
    if (!vm.loadReader && mode !== null && !mode.includes(binary ? 'b' : 't')) throw new LuaError(`attempt to load a ${binary ? 'binary' : 'text'} chunk (mode is '${mode}')`);
    const fn = vm.loadReader ? vm.loadReader(source,name,mode) : binary ? vm.loadBinary(Uint8Array.from(source, c => c.charCodeAt(0)), name) : vm.compile(source, name);
    const release = vm.heap.pin(fn);
    try { if (hasEnvironment && fn.upvalues?.length) fn.upvalues[0].value = vm.heap.adopt(environment ?? null); return fn; }
    finally { release(); }
  };
  const protectedCompile = (...args) => { try { return [compile(...args)]; } catch (error) { if (!(error instanceof LuaError)) throw error; return [null, error.value]; } };
  const load = (...args) => load.luaInvoke(args);
  load.luaInvoke = args => {
    let source = args[0], pieces = null;
    if(typeof source==='number'||typeof source==='bigint')source=vm.checkString(source,0);
    const mode = string(args[2], 'bt', 'load', 3).split('\0')[0];
    if (isLuaString(source) || typeof source === 'number' || typeof source === 'bigint') {
      source = string(source, null, 'load', 1);
      return protectedCompile(source, string(args[1], source, 'load', 2).split('\0')[0], mode, args[3], args.length > 3);
    }
    const name = string(args[1], '=(load)', 'load', 2).split('\0')[0];
    if (!isFunction(source))luaTypeError(vm,1,'function',source);
    // Lua's reader callback is a non-yieldable C boundary. Errors become the
    // parser's load error result; zero-length strings end the input too.
    pieces = [];
    const roots = { values: pieces }, thread = vm.currentThread, metadata=vm.heap.frameMetadata(thread);
    const stackValues=args.slice(0,4);while(stackValues.length<5)stackValues.push(null);
    if(metadata){metadata.values=stackValues;metadata.argumentTop=metadata.func+6;}
    thread.gcRoots.add(roots);
    try {
      const reader=stream=>{
        const top=(metadata?.argumentTop??vm.heap.getStackTop(thread))+(stream?.stackExtra??0);vm.heap.checkStack(thread,top,2,{gc:false});
        let part = vm.call(source, [], {func:top,checkTop:top+1})[0] ?? null;
        if (part === null) return null;
        if (!(isLuaString(part) || typeof part === 'number' || typeof part === 'bigint')) {pieces[1]=part;return vm.heap.withStackTop(top+1,()=>luaAuxError(vm,'reader function must return a string'));}
        const numeric=typeof part==='number'||typeof part==='bigint';if(numeric)part=vm.heap.withStackTop(top,()=>vm.heap.adopt(numberToString(part)));stackValues[4]=part;pieces[0]=part;if(numeric)vm.heap.withStackTop(top,()=>vm.heap.checkpoint());
        return part;
      };
      const fn=vm.loadReader?vm.loadReader(reader,name,mode):compile((()=>{let all='',part;while((part=reader())!==null&&luaStringBytes(part).length)all+=luaStringBytes(part);return all;})(),name,mode,null,false);
      const release=vm.heap.pin(fn);try{if(args.length>3&&fn.upvalues?.length)fn.upvalues[0].value=vm.heap.adopt(args[3]??null);return [fn];}finally{release();}
    } catch (error) { if (!(error instanceof LuaError)) throw error; error=vm.closeError(error);vm.heap.shrinkThread(thread);return [null, error.value]; }
    finally { thread.gcRoots.delete(roots); }

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
  return { load, loadfile, dofile };
}

export function openBaseIO(vm, options = {}) {
  const functions = createBaseIOFunctions(vm, options);
  for (const name of ['dofile', 'loadfile', 'load']) vm.setGlobal(name, functions[name]);
  return functions;
}
