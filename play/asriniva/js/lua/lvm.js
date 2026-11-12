/* Lua 5.4 AST execution stage. References lvm.c/ldo.c; lobject.js notice.
 * This is an incomplete migration core, not Lua 5.4 certification. Lua opcode
 * emission, tail calls and bytecode loading remain in this AST backend.
 * Logical GC/lifecycle uses explicit roots; native allocation cadence differs. Generator
 * frames preserve live values across coroutine suspension; no script replay.
 */
import { LuaTable, LuaUserdata, LuaLightUserdata, LuaThread, LuaError, isLuaString, luaStringBytes, appendLuaValues, luaValues, luaType, truth, rawEqual, arithmetic, toNumber, toInteger, numberToString, MININTEGER, MAXINTEGER } from './lobject.js';
import { parse } from './lparser.js';
import { LuaHeap } from './lgc.js';
import { LuaDebugState } from './debug.js';
import { luaAuxError, luaTypeError, luaAuxTop } from './aux-error.js';

class ReturnSignal { constructor(values) { this.values = values; } }
class BreakSignal {}
class Environment {
  constructor(parent, globals) { this.parent = parent; this.globals = globals ?? parent?.globals; this.cells = new Map(); this.luaEnvironment = true; }
  find(name) { return this.cells.get(name) ?? this.parent?.find(name); }
  define(name, value, constant = false) { this.cells.set(name, { value: value ?? null, constant }); }
}
const metamethods = { '+': '__add', '-': '__sub', '*': '__mul', '/': '__div', '//': '__idiv', '%': '__mod', '^': '__pow', '&': '__band', '|': '__bor', '~': '__bxor', '<<': '__shl', '>>': '__shr' };
export class LuaVM {
  constructor({ globals = {}, instructionLimit = 1000000, hook = null, warning = null, memoryTracker = null, memoryAllocator = null, memoryUserdata = null, memoryLayout = null, gcScheduler = true, memoryReady = true, debug = null } = {}) {
    this.heap = new LuaHeap(this, { warning, memoryTracker, memoryAllocator, memoryUserdata, memoryLayout });
    try {
    this.mainThread=this.heap.with(()=>new LuaThread(null,true));this.currentThread=this.mainThread;
    this.registry=this.heap.with(()=>new LuaTable([],{arraySize:2}));
    this.globals = this.heap.with(() => new LuaTable());this.registry.rawset(1n,this.mainThread);this.registry.rawset(2n,this.globals);this.heap.initializeStrings(); this.instructions = 0; this.instructionLimit = instructionLimit; this.hook = hook;
    this.environment = new Environment(null, this.globals); this.environment.define('_ENV', this.globals);
    for (const [name, value] of Object.entries(globals)) this.setGlobal(name, value);
    this.typeMetatables=new Map();this.stringMetatable = null;
    const objectPointers=new WeakMap(),shortPointers=new Map();let nextPointer=16n;
    this.pointerOf=value=>{if(value instanceof LuaLightUserdata){if(typeof value.value==='number'||typeof value.value==='bigint')return BigInt(value.value);value=value.value;}if(!(isLuaString(value)||typeof value==='function'||value&&typeof value==='object'))return 0n;const map=typeof value==='string'?shortPointers:objectPointers;if(!map.has(value)){map.set(value,nextPointer);nextPointer+=16n;}return map.get(value);};
    this.debug=debug??new LuaDebugState({mainThread:this.mainThread});if(gcScheduler)this.heap.attachScheduler();this.heap.memoryTracker.ready=memoryReady;
    } catch (error) { this.heap.close(); throw error; }
  }
  tick() { if (++this.instructions > this.instructionLimit) throw new LuaError('instruction limit exceeded'); if (this.hook) this.hook(this.instructions); }
  setHostStackTop(count) {
    if(!Number.isInteger(count)||count<0)throw new TypeError('nonnegative host stack size required');
    const thread=this.currentThread,metadata=this.heap.frameMetadata(thread),frame=this.debug.thread(thread).frames.at(-1);
    const values=metadata?.values??frame?.args;if(!values)throw new TypeError('host Lua stack required');
    const previous=values.length;values.length=count;for(let i=previous;i<count;i++)values[i]=null;
    if(frame)frame.args=values;
    if(metadata){metadata.values=values;metadata.argumentTop=metadata.checkTop=metadata.func+1+count;const record=this.heap.objects.get(thread);if(record?.gcTopFrame===metadata)record.gcTop=metadata.argumentTop;}
    return values;
  }
  auxError(message) {return luaAuxError(this,'%s',message);}
  checkString(value,index=0) {
    if(isLuaString(value))return luaStringBytes(value);
    if(luaType(value)!=='number')return luaTypeError(this,index+1,'string',value);
    const bytes=numberToString(value),frame=this.debug.thread(this.currentThread).frames.at(-1),args=frame?.what==='C'?frame.args:null;
    if(index>=0&&isLuaString(args?.[index])&&luaStringBytes(args[index])===bytes)return bytes;
    const text=this.heap.adopt(bytes);if(index>=0&&args&&index<args.length)args[index]=text;
    const release=this.heap.addRoots(()=>text),top=luaAuxTop(this);
    try{this.heap.withStackTop(top+(index<0?1:0),()=>this.heap.checkpoint());}finally{release();}
    return bytes;
  }
  getGlobal(name) { return this.globals.rawget(name); }
  setGlobal(name, value) { value = this.heap.adopt(value); this.globals.rawset(name, value); }
  metatableOf(value) {return value instanceof LuaTable||value instanceof LuaUserdata?value.metatable:isLuaString(value)?this.stringMetatable:this.typeMetatables.get(value instanceof LuaLightUserdata?'lightuserdata':luaType(value))??null;}
  setMetatableOf(value,metatable) {if(!(metatable===null||metatable instanceof LuaTable))throw new LuaError('table or nil expected');this.heap.adopt(metatable);if(value instanceof LuaTable||value instanceof LuaUserdata)value.metatable=metatable;else if(isLuaString(value))this.stringMetatable=metatable;else this.typeMetatables.set(value instanceof LuaLightUserdata?'lightuserdata':luaType(value),metatable);}
  metamethod(value,name){return this.metatableOf(value)?.rawget(name)??null;}
  // Synchronous APIs form non-yieldable C-style boundaries.
  checkCStack(thread) {
    if (thread.nativeCalls === 200) throw new LuaError('C stack overflow');
    if (thread.nativeCalls >= 220) { const error=new LuaError('error in error handling');error.status=5;throw error; }
  }
  run(generator,{boundary=true}={}) {
    if(this.heap.closed)throw new LuaError('Lua state is closed');
    const thread=this.currentThread;thread.nonYieldableDepth++;if(boundary)thread.nativeCalls=(thread.nativeCalls??0)+1;
    try {
      if(boundary)this.checkCStack(thread);
      const result=this.heap.with(()=>generator.next());
      if(!result.done){generator.return();throw new LuaError('attempt to yield across a C-call boundary');}
      return result.value;
    } catch(error){throw this.dispatchError(error);}
    finally{thread.nonYieldableDepth--;if(boundary)thread.nativeCalls--;}
  }
  dispatchError(error) {
    if(!(error instanceof LuaError)||error.status===4||error.status===5)return error;
    const thread=this.currentThread,context=thread.errorHandlers?.at(-1);
    this.debug.captureError(thread,error);this.lastError=error;
    if(!context||context.handler===null||error.luaHandledBy?.has(context))return error;
    error.luaHandledBy??=new Set();error.luaHandledBy.add(context);
    try {error.value=this.call(context.handler,[error.value])[0]??null;return error;}
    catch(next){return next;}
  }
  *protectedCallG(fn,args,handler=null,stack=null) {
    const thread=this.currentThread,context={handler};thread.errorHandlers??=[];thread.errorHandlers.push(context);
    const serial=thread.resumeSerial??0;thread.nativeCalls=(thread.nativeCalls??0)+1;
    try{this.checkCStack(thread);return yield* this.callG(fn,args,stack);}
    catch(error){throw this.dispatchError(error);}
    finally{if((thread.resumeSerial??0)===serial)thread.nativeCalls--;thread.errorHandlers.pop();}
  }
  get(...args) { return this.run(this.getG(...args)); }
  set(...args) { return this.run(this.setG(...args)); }
  length(...args) { return this.run(this.lengthG(...args)); }
  unary(...args) { return this.run(this.unaryG(...args)); }
  binary(...args) { return this.run(this.binaryG(...args)); }
  call(...args) { return this.run(this.callG(...args)); }
  *getG(table, key, depth = 0) {
    if (depth > 100) throw new LuaError("'__index' chain too long; possible loop");
    if (table instanceof LuaTable) { const value = table.rawget(key); if (value !== null) return value; }
    const index = this.metamethod(table, '__index');
    if (index instanceof LuaTable) return (yield* this.getG(index, key, depth + 1));
    if (index !== null) return (yield* this.callG(index, [table, key]))[0] ?? null;
    if (table instanceof LuaTable) return null;
    throw new LuaError(`attempt to index a ${luaType(table)} value`);
  }
  *setG(table, key, value, depth = 0) {
    if (depth > 100) throw new LuaError("'__newindex' chain too long; possible loop");
    if (table instanceof LuaTable && table.rawget(key) !== null) { table.rawset(key, value); return; }
    const index = this.metamethod(table, '__newindex');
    if (index instanceof LuaTable) { (yield* this.setG(index, key, value, depth + 1)); return; }
    if (index !== null) { (yield* this.callG(index, [table, key, value])); return; }
    if (table instanceof LuaTable) { table.rawset(key, value); return; }
    throw new LuaError(`attempt to index a ${luaType(table)} value`);
  }
  *variableG(env, name) {
    const cell = env.find(name);
    return cell ? cell.value : (yield* this.getG(env.find('_ENV').value, name));
  }
  *assignG(env, name, value) {
    const cell = env.find(name);
    if (cell) { if (cell.constant) throw new LuaError(`attempt to assign to const variable '${name}'`); cell.value = value;this.heap.barrierForward(cell,value); }
    else (yield* this.setG(env.find('_ENV').value, name, value));
  }
  *lengthG(value) {
    if (isLuaString(value)) return BigInt(value.length);
    const mm = this.metamethod(value, '__len');
    if (mm !== null) return (yield* this.callG(mm, [value, value]))[0] ?? null;
    if (value instanceof LuaTable) return value.length();
    throw new LuaError(`attempt to get length of a ${luaType(value)} value`);
  }
  *unaryG(op, value) {
    if (op === 'not') return !truth(value);
    if (op === '#') return (yield* this.lengthG(value));
    const mm = this.metamethod(value, op === '-' ? '__unm' : '__bnot');
    if (!['number','bigint'].includes(typeof value) && mm !== null) return (yield* this.callG(mm, [value, value]))[0] ?? null;
    return arithmetic(op === '-' ? 'unm' : 'bnot', value);
  }
  *binaryG(op, a, b) {
    if (op === '==' || op === '~=') {
      let equal = rawEqual(a, b);
      if (!equal && ((a instanceof LuaTable && b instanceof LuaTable) || (a instanceof LuaUserdata && b instanceof LuaUserdata))) {
        const mm = this.metamethod(a, '__eq') ?? this.metamethod(b, '__eq');
        if (mm !== null) equal = truth((yield* this.callG(mm, [a, b]))[0] ?? null);
      }
      return op === '==' ? equal : !equal;
    }
    if (['<', '<=', '>', '>='].includes(op)) {
      if (op === '>' || op === '>=') return (yield* this.binaryG(op === '>' ? '<' : '<=', b, a));
      if ((luaType(a) === 'number' && luaType(b) === 'number') || (isLuaString(a) && isLuaString(b))) return op === '<' ? a < b : a <= b;
      const name = op === '<' ? '__lt' : '__le';
      const mm = this.metamethod(a, name) ?? this.metamethod(b, name);
      if (mm !== null) return truth((yield* this.callG(mm, [a, b]))[0] ?? null);
      throw new LuaError(`attempt to compare ${luaType(a)} with ${luaType(b)}`);
    }
    if (op === '..') {
      const text = value => isLuaString(value) ? luaStringBytes(value) : luaType(value) === 'number' ? numberToString(value) : null;
      const x = text(a), y = text(b); if (x !== null && y !== null) return this.heap.adopt(x + y);
      const mm = this.metamethod(a, '__concat') ?? this.metamethod(b, '__concat');
      if (mm !== null) return (yield* this.callG(mm, [a, b]))[0] ?? null;
      throw new LuaError('attempt to concatenate a non-string value');
    }
    const valid = ['&', '|', '~', '<<', '>>'].includes(op) ? ['number', 'bigint'].includes(typeof a) && ['number', 'bigint'].includes(typeof b) && toInteger(a) !== null && toInteger(b) !== null : ['number','bigint'].includes(typeof a) && ['number','bigint'].includes(typeof b);
    if (valid) return arithmetic(op, a, b);
    const mm = this.metamethod(a, metamethods[op]) ?? this.metamethod(b, metamethods[op]);
    if (mm !== null) return (yield* this.callG(mm, [a, b]))[0] ?? null;
    return arithmetic(op, a, b); // produces an explicit Lua error
  }
  *listG(expressions, env, varargs) {
    const gcThread = this.currentThread, gcFrame = { environment: env, values: [] }; gcThread.gcRoots.add(gcFrame);
    try {
    const values=luaValues();
    for (let i = 0; i < expressions.length; i++) {
      const result = (yield* this.evaluateG(expressions[i], env, varargs));
      appendLuaValues(values,i + 1 === expressions.length ? result : [result[0] ?? null]); gcFrame.values = values;
    }
    return values;
    } finally { gcThread.gcRoots.delete(gcFrame); }
  }
  *evaluateG(node, env, varargs) {
    const gcThread = this.currentThread, gcFrame = { environment: env, values: [] }; gcThread.gcRoots.add(gcFrame);
    try {
    this.tick();
    const one = function* (value) { const values = yield* this.evaluateG(value, env, varargs); appendLuaValues(gcFrame.values,values); return values[0] ?? null; }.bind(this);
    if (node.kind === 'literal') return luaValues(node.value);
    if (node.kind === 'variable') return luaValues(yield* this.variableG(env,node.name));
    if (node.kind === 'paren') return luaValues(yield* one(node.value));
    if (node.kind === 'vararg') return varargs;
    if (node.kind === 'unary') return luaValues(yield* this.unaryG(node.op,yield* one(node.value)));
    if (node.kind === 'binary') {
      const left = (yield* one(node.left));
      if (node.op === 'and') return luaValues(truth(left)?yield* one(node.right):left);
      if (node.op === 'or') return luaValues(truth(left)?left:yield* one(node.right));
      const result=yield* this.binaryG(node.op,left,yield* one(node.right));if(node.op==='..'){gcFrame.values.push(result);this.heap.checkpoint();}return luaValues(result);
    }
    if(node.kind==='function'){const fn=this.closure(node,env);gcFrame.values.push(fn);this.heap.checkpoint();return luaValues(fn);}
    if (node.kind === 'index') return luaValues(yield* this.getG(yield* one(node.table),yield* one(node.key)));
    if (node.kind === 'table') {
      const listCount = node.fields.filter(field => field.key === null).length;
      const last = node.fields.at(-1);
      const multiLast = last?.key === null && ['call', 'vararg'].includes(last.value.kind);
      const table = new LuaTable([], { arraySize: listCount - Number(multiLast), hashSize: node.fields.length - listCount }); gcFrame.values.push(table);this.heap.checkpoint(); let index = 1n;
      for (let i = 0; i < node.fields.length; i++) {
        const { key, value } = node.fields[i];
        if (key) table.rawset((yield* one(key)), (yield* one(value)));
        else {
          const values = i + 1 === node.fields.length ? (yield* this.evaluateG(value, env, varargs)) : [(yield* one(value))];
          if (i + 1 === node.fields.length && Number(index) + values.length - 1 > table.arraySize) table.resizeArray(Number(index) + values.length - 1);
          for (const v of values) table.rawset(index++, v);
        }
      }
      return [table];
    }
    if (node.kind === 'call') {
      const receiver = (yield* one(node.callee));
      const fn = node.method ? (yield* this.getG(receiver, node.method)) : receiver;
      const args = (yield* this.listG(node.args, env, varargs));
      if (node.method) args.unshift(receiver);
      return (yield* this.callG(fn, args));
    }
    throw new LuaError(`unimplemented expression ${node.kind}`);
    } finally { gcThread.gcRoots.delete(gcFrame); }
  }
  *callG(fn, args = []) {
    const thread = this.currentThread, gcFrame = { fn, args: fn?.luaClosure && !fn.prototype.vararg ? args.slice(0, fn.prototype.params.length) : args };
    thread.gcRoots.add(gcFrame); fn=this.heap.adopt(fn); gcFrame.fn=fn; const normalized=luaValues();gcFrame.args=normalized;for(const value of args)normalized.push(this.heap.adopt(value));args=normalized;
    const debugFrame = this.debug.frameEnter(thread, { fn, args, prototype: fn?.prototype }); let errored = false, resultCount = 0;
    thread.callDepth++;
    try {
      this.tick();
      if (fn?.luaYieldableArray || fn?.luaYieldable) { if (!fn.luaYieldableArray && args.length>60000) throw new LuaError('host callback argument limit exceeded'); const values = fn.luaYieldableArray ? yield* fn.luaYieldableArray(args) : yield* fn.luaYieldable(...args); resultCount = values.length; return values; }
      if (typeof fn === 'function') {
        this.heap.checkpoint();
        if(!fn.luaInvoke && args.length>60000)throw new LuaError('host callback argument limit exceeded');
        const values = fn.luaInvoke ? fn.luaInvoke(args) : fn(...args);
        if (!Array.isArray(values)) throw new TypeError('Lua host callback must return an array of Lua values');
        resultCount=values.length;const result=luaValues();gcFrame.results=result;for(const value of values)result.push(this.heap.adopt(value??null));if(result.some(value=>isLuaString(value)||this.heap.collectable(value)))this.heap.checkpoint();return result;
      }
      if (fn?.luaClosure) {
        const { prototype, environment } = fn;
        const env = new Environment(environment);
        for (let i = 0; i < prototype.params.length; i++) env.define(prototype.params[i], args[i] ?? null);
        try { (yield* this.blockG(prototype.body, env, prototype.vararg ? args.slice(prototype.params.length) : [])); }
        catch (signal) { if (signal instanceof ReturnSignal) { resultCount = signal.values.length; return signal.values; } throw signal; }
        return [];
      }
      const mm = this.metamethod(fn, '__call');
      if (mm !== null) return (yield* this.callG(mm, [fn, ...args]));
      throw new LuaError(`attempt to call a ${luaType(fn)} value`);
    } catch (error) {
      errored = true; this.debug.captureError(thread, error);
      if (error instanceof LuaError && !error.luaGcRoots) error.luaGcRoots = [...thread.gcRoots].map(frame => ({ ...frame, values: frame.values?.slice() }));
      throw this.dispatchError(error);
    } finally { thread.callDepth--; thread.gcRoots.delete(gcFrame); this.debug.frameLeave(thread, debugFrame, resultCount, { error: errored }); }
  }
  *closeValuesG(values, original = null) {
    let error = original;
    for (let i = values.length - 1; i >= 0; i--) {
      const value = values[i]; if (!truth(value)) continue;
      try { const closer = this.metamethod(value, '__close'); if (closer === null) throw new LuaError('to-be-closed value has no __close metamethod'); yield* this.callG(closer, [value, error instanceof LuaError ? error.value : null]); }
      catch (next) { error = next; }
    }
    if (error !== original) throw error;
  }
  *blockG(body, initialEnv, varargs = []) {
    const gcThread = this.currentThread, gcFrame = { environment: initialEnv, values: [], closing: [] }; gcThread.gcRoots.add(gcFrame);
    let pending = null;
    try {
    let env = initialEnv;
    const one = function* (value) { const values = yield* this.evaluateG(value, env, varargs); appendLuaValues(gcFrame.values,values); return values[0] ?? null; }.bind(this);
    for (const node of body) {
      gcFrame.values = [];
      const currentDebugFrame = this.debug.thread(gcThread).frames.at(-1); if (currentDebugFrame && node.line) this.debug.frameLine(currentDebugFrame, node.line);
      this.tick();
      if (node.kind === 'local' || node.kind === 'localfunction') {
        const previous = env; env = new Environment(previous); gcFrame.environment = env;
        if (node.kind === 'localfunction') {
          env.define(node.name, null); env.cells.get(node.name).value = (yield* one(node.value));
        } else {
          const values = (yield* this.listG(node.values, previous, varargs));
          for (let i = 0; i < node.names.length; i++) {
            const declaration = node.names[i], value = values[i] ?? null;
            env.define(declaration.name, value, declaration.attribute !== null);
            if (declaration.attribute === 'close') {
              if (truth(value) && this.metamethod(value, '__close') === null) throw new LuaError(`variable '${declaration.name}' got a non-closable value`);
              gcFrame.closing.push(value);
            }
          }
        }
      } else if (node.kind === 'assign') {
        const references = [];
        for (const target of node.targets) references.push(target.kind === 'variable' ? { name: target.name } : { table: (yield* one(target.table)), key: (yield* one(target.key)) });
        const values = (yield* this.listG(node.values, env, varargs));
        for (let i = 0; i < references.length; i++) {
          const reference = references[i];
          if ('name' in reference) (yield* this.assignG(env, reference.name, values[i] ?? null));
          else (yield* this.setG(reference.table, reference.key, values[i] ?? null));
        }
      } else if (node.kind === 'callstatement') (yield* one(node.value));
      else if (node.kind === 'return') throw new ReturnSignal((yield* this.listG(node.values, env, varargs)));
      else if (node.kind === 'break') throw new BreakSignal();
      else if (node.kind === 'do') (yield* this.blockG(node.body, new Environment(env), varargs));
      else if (node.kind === 'if') {
        let selected = node.otherwise;
        for (const branch of node.branches) if (truth((yield* one(branch.test)))) { selected = branch.body; break; }
        gcFrame.values = []; (yield* this.blockG(selected, new Environment(env), varargs));
      } else if (node.kind === 'while') {
        while (truth((yield* one(node.test)))) {
          gcFrame.values = []; this.tick();
          try { (yield* this.blockG(node.body, new Environment(env), varargs)); } catch (signal) { if (signal instanceof BreakSignal) break; throw signal; }
        }
      } else if (node.kind === 'repeat') {
        while (true) {
          this.tick(); const loop = new Environment(env);
          // Repeat's condition shares locals declared in its body. block returns
          // the final environment to retain those declaration cells.
          try { const final = (yield* this.blockG(node.body, loop, varargs)); if (truth((yield* this.evaluateG(node.test, final, varargs))[0] ?? null)) break; }
          catch (signal) { if (signal instanceof BreakSignal) break; throw signal; }
        }
      } else if (node.kind === 'for') {
        const initial = (yield* one(node.start)), limitValue = (yield* one(node.stop)), increment = (yield* one(node.step));
        let start = toNumber(initial), stop = toNumber(limitValue), step = toNumber(increment);
        if (start === null || stop === null || step === null) throw new LuaError('numeric for requires numbers');
        if (step === 0n || step === 0) throw new LuaError("'for' step is zero");
        const integer = typeof initial === 'bigint' && typeof increment === 'bigint';
        if (integer) {
          if (typeof stop === 'number') {
            const converted = toInteger(step < 0n ? Math.ceil(stop) : Math.floor(stop));
            if (converted !== null) stop = converted;
            else if (stop > 0) { if (step < 0n) continue; stop = MAXINTEGER; }
            else { if (step > 0n) continue; stop = MININTEGER; }
          }
        }
        else { start = Number(start); stop = Number(stop); step = Number(step); }
        if (!integer && (step > 0 ? stop < start : start < stop)) continue;
        let firstIteration = !integer;
        for (let value = start; firstIteration || (step > 0 ? value <= stop : value >= stop); value += step) {
          firstIteration = false;
          this.tick(); const loop = new Environment(env); loop.define(node.variable, value);
          try { (yield* this.blockG(node.body, loop, varargs)); } catch (signal) { if (signal instanceof BreakSignal) break; throw signal; }
          if (integer && (value + step > MAXINTEGER || value + step < MININTEGER)) break;
        }
      } else if (node.kind === 'forin') {
        const [fn, state = null, initial = null, closing = null] = (yield* this.listG(node.values, env, varargs));
        if (truth(closing) && this.metamethod(closing, '__close') === null) throw new LuaError('generic-for closing value is not closable');
        let control = initial; gcFrame.values = [fn, state, control, closing];
        let loopError = null; try { while (true) {
          this.tick(); const values = (yield* this.callG(fn, [state, control])); control = values[0] ?? null; gcFrame.values = [fn, state, control, closing, ...values]; if (control === null) break;
          const loop = new Environment(env); node.names.forEach((name, i) => loop.define(name, values[i] ?? null));
          try { (yield* this.blockG(node.body, loop, varargs)); } catch (signal) { if (signal instanceof BreakSignal) break; throw signal; }
        } } catch (error) { loopError = error; throw error; } finally { yield* this.closeValuesG([closing], loopError instanceof LuaError ? loopError : null); }
      } else throw new LuaError(`unimplemented statement ${node.kind}`);
    }
    return env;
    } catch (error) { pending = error; throw error; } finally {
      try {
        if (pending instanceof LuaError) { pending.luaPendingClose ??= []; pending.luaPendingClose.push(gcFrame.closing.slice()); }
        else yield* this.closeValuesG(gcFrame.closing, pending instanceof LuaError ? pending : null);
      } finally { gcThread.gcRoots.delete(gcFrame); }
    }
  }
  deferClose(error,callback,roots=[]) {
    if(!(error instanceof LuaError))throw new TypeError('deferred Lua close requires LuaError');
    error.luaPendingClose??=[];error.luaPendingClose.push({luaCCloser:true,callback,roots});
  }
  closeError(error) {
    let pending=error;const groups=error.luaPendingClose??[];error.luaPendingClose=[];
    const release=this.heap.addRoots(()=>[pending,groups]);
    try{for(const group of groups){try{if(group?.luaCCloser)group.callback(pending);else this.run(this.closeValuesG(group,pending));}catch(next){pending=next instanceof LuaError?this.closeError(next):next;}}return pending;}
    finally{release();}
  }
  closeThread(co, reset = false) {
    if (!reset && (co.status === 'running' || co.status === 'normal')) throw new LuaError(`cannot close a ${co.status} coroutine`);
    const parent = this.currentThread; this.currentThread = co; co.nonYieldableDepth++;
    let error = co.lastError ?? (co.error === null || co.error === undefined ? null : new LuaError(co.error));
    if (error) error = this.closeError(error);
    try {
      if (co.generator && co.status !== 'dead') {
        const result = this.heap.with(() => co.generator.return());
        if (!result.done) throw new LuaError('attempt to yield across a C-call boundary');
      }
    } catch (failure) { if (!(failure instanceof LuaError)) throw failure; error = failure; }
    finally { co.status = 'dead'; co.generator = null; co.fn = null; co.error = null; co.lastError = null; co.errorRoots = null; co.gcRoots.clear(); co.nonYieldableDepth--; this.currentThread = parent; }
    return error ? [false, error.value] : [true];
  }
  execute(source, name = 'chunk') {
    this.instructions = 0;
    return this.call(this.compile(source, name));
  }
  closure(prototype, environment, main = false) {
    const upvalues = [];
    for (const name of main ? ['_ENV', ...prototype.freeNames] : prototype.freeNames) { const cell = environment.find(name) ?? environment.find('_ENV'); if (cell && !upvalues.includes(cell)) upvalues.push(cell); }
    const fn = { luaClosure: true, prototype, environment, upvalues }; this.heap.register(fn, 'closure'); return fn;
  }
  compile(source, name = 'chunk') {
    const environment = new Environment(null, this.globals); environment.define('_ENV', this.globals);
    return this.closure(parse(source, name), environment, true);
  }
}
