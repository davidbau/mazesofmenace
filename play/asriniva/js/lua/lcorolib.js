/* Lua5.4 coroutine library/continuations, lcorolib.c reference; lobject.js notice.
 * Actual generator frames suspend; source is never restarted or replayed.
 * coroutine.close unwinds suspended frames and pending error closers.
 * C continuation APIs remain unimplemented.
 */
import {prepareLibrary} from './llib.js';
import { LuaTable, LuaThread, LuaError, luaType } from './lobject.js';
export function openCoroutine(vm,{publish=true}={}) {
  const lib=prepareLibrary(vm,['create','resume','running','status','wrap','yield','isyieldable','close']);try{
  const thread = value => { if (!(value instanceof LuaThread)) throw new LuaError('thread expected'); return value; };
  const create = fn => { if (luaType(fn) !== 'function') throw new LuaError('function expected'); const co = new LuaThread(fn); vm.debug.inheritThread(co, vm.currentThread); return co; };
  const resume = (value, args) => {
    const co = thread(value);
    if (co.status !== 'suspended') return [false, `cannot resume ${co.status === 'dead' ? 'dead' : 'non-suspended'} coroutine`];
    const parent = vm.currentThread, previous = parent.status;
    parent.status='normal';co.status='running';vm.currentThread=co;co.nativeCalls=(parent.nativeCalls??0)+1;co.resumeSerial++;
    try { vm.checkCStack(co);
      let result;
      if (co.generator === null) { co.generator = vm.callG(co.fn, args); result = vm.heap.with(() => co.generator.next()); }
      else result = vm.heap.with(() => co.generator.next(args));
      co.status = result.done ? 'dead' : 'suspended';
      return [true, ...result.value];
    } catch (error) {
      co.status = 'dead'; if (!(error instanceof LuaError)) throw error; co.lastError = error; co.errorRoots = error.luaGcRoots; co.error = error.value; vm.lastError = error;
      return [false, error.value];
    } finally { vm.currentThread = parent; parent.status = previous; }
  };
  lib.rawset('create', fn => [create(fn)]);
  const resumeFunction=(co,...args)=>resume(co,args);resumeFunction.luaInvoke=args=>resume(args[0],args.slice(1));lib.rawset('resume',resumeFunction);
  lib.rawset('status', co => [thread(co) === vm.currentThread ? 'running' : co.status]);
  lib.rawset('running', () => [vm.currentThread, vm.currentThread.main]);
  lib.rawset('isyieldable', (...args) => {
    const co = args.length ? thread(args[0]) : vm.currentThread;
    return [!co.main && co.nonYieldableDepth === 0];
  });
  const yieldFunction = () => { throw new LuaError('attempt to yield across a C-call boundary'); };
  yieldFunction.luaYieldableArray = function* (values) {
    const co = vm.currentThread;
    if (co.main) throw new LuaError('attempt to yield from outside a coroutine');
    if (co.nonYieldableDepth > 0) throw new LuaError('attempt to yield across a C-call boundary');
    return yield values;
  };
  yieldFunction.luaYieldable=function*(...values){return yield* yieldFunction.luaYieldableArray(values)};
  lib.rawset('yield', yieldFunction);
  lib.rawset('wrap', fn => {
    const co = create(fn);
    const wrapped = (...args) => { const [ok, ...values] = resume(co, args); if (!ok) throw new LuaError(values[0] ?? null); return values; }; wrapped.luaInvoke=args=>{const[ok,...values]=resume(co,args);if(!ok)throw new LuaError(values[0]??null);return values;}; wrapped.luaGcRoots = [co]; return [wrapped];
  });
  lib.rawset('close', co => vm.closeThread(thread(co)));
  const table=lib.finish();if(publish)vm.setGlobal('coroutine',table);return table;}finally{lib.release();}
}
