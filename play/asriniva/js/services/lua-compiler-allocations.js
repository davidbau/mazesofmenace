/* Owned storage for the Lua5.4 source compiler. Allocation callbacks are
 * performed by the real compiler operations, never by replaying a trace.
 * Lexer/code-generation interleaving is checked independently against the C
 * allocator oracle; adding this ledger alone does not establish that gate.
 * Lua notice: lua/lobject.js; references lparser.c/lcode.c/llex.c. */
import { LuaTable, LuaString, luaStringBytes, luaValues } from './lua/lobject.js';
const keywords = new Set('and break do else elseif end false for function goto if in local nil not or repeat return then true until while'.split(' '));

export class LuaCompilerAllocations {
  constructor(observer, sourceName, closure, { workspace = null } = {}) {
    this.observer = observer; this.layout = observer.layout;
    this.capacities = new WeakMap(); this.lineStates = new WeakMap(); this.pool = new Map(); this.roots = [];
    this.ownsWorkspace=workspace===null;this.workspace = workspace ?? {}; observer.temporary(this.workspace, ['buffer', 'actvar', 'gotos', 'labels']);
    this.temporarySizes = new Map(); this.activeLocals = 0;
    this.pendingLocals = new WeakMap(); this.localCounts = new WeakMap(); this.cursor = -1;
    this.closure = closure;
    try {
      observer.object('closure', closure, this.layout.lclosure + this.layout.pointer);
      this.roots.push(observer.root(closure));
      this.scanner = new LuaTable(); observer.object('table', this.scanner, this.layout.table);
      this.scannerRoot = observer.root(this.scanner);
      this.sourceName = sourceName;
    } catch (error) { this.dispose({releaseWorkspace:this.ownsWorkspace}); throw error; }
  }
  prototype(p, parent = null) {
    p.allocationStrings = [];
    this.observer.object('proto', p, this.layout.proto);if(parent)parent.protos[parent.protos.length-1]=p;
    if (!parent) {
      this.closure.prototype = p;
      this.sourceString = this.observer.internString(this.sourceName, 'source');
      p.sourceAllocation=this.sourceString;if(this.sourceString instanceof LuaString)p.allocationStrings.push(this.sourceString);
      this.resizeTemporary('buffer', 32);
    }
    p.sourceAllocation = this.sourceString;
    if (this.sourceString instanceof LuaString&&!p.allocationStrings.includes(this.sourceString)) p.allocationStrings.push(this.sourceString);
    this.capacities.set(p, new Map());
  }
  resizeTemporary(key, size) {
    const old = this.temporarySizes.get(key) ?? 0;
    if (old !== size) this.observer.resize(this.workspace, key, old, size);
    this.temporarySizes.set(key, size);
  }
  growTemporary(key, needed, width) {
    let capacity = (this.temporarySizes.get(key) ?? 0) / width;
    if (needed <= capacity) return;
    capacity = Math.max(4, capacity * 2, needed); this.resizeTemporary(key, capacity * width);
  }
  width(key) { return { code: 4, lineinfo: 1, abslineinfo: this.layout.absline, constants: this.layout.value, protos: this.layout.pointer, upvalues: this.layout.updesc, locvars: this.layout.locvar }[key]; }
  grow(p, key, needed) {
    const capacities = this.capacities.get(p), old = capacities.get(key) ?? 0;
    if (needed <= old) return;
    const capacity = Math.max(4, old * 2, needed), width = this.width(key);
    this.observer.resize(p, key, old * width, capacity * width); capacities.set(key, capacity);
  }
  line(p) {
    let state=this.lineStates.get(p);if(!state){state={previous:p.linedefined,counter:0,absolute:0,snapshots:[]};this.lineStates.set(p,state);}
    const first=Math.min(state.snapshots.length,p.lines.length-1);
    if(state.snapshots.length>first){Object.assign(state,state.snapshots[first]);state.snapshots.length=first;}
    for(let pc=first;pc<p.lines.length;pc++){
      state.snapshots.push({previous:state.previous,counter:state.counter,absolute:state.absolute});
      const line=p.lines[pc],delta=line-state.previous;
      if(Math.abs(delta)>=128||state.counter++>=128){state.counter=1;state.absolute++;}
      state.previous=line;
    }
    this.grow(p,'abslineinfo',state.absolute);this.grow(p,'lineinfo',p.lines.length);
  }

  intern(bytes, owner = null) {
    let value = this.pool.get(bytes);
    if (value === undefined) {
      value = this.observer.internString(bytes, 'source-token'); this.pool.set(bytes, value);
      this.scanner.rawset(value, value); this.observer.checkpoint();
    }
    if (owner && value instanceof LuaString && !owner.allocationStrings.includes(value)) owner.allocationStrings.push(value);
    return value;
  }
  lexString(bytes) {
    const candidate = this.observer.internString(bytes, 'source-token');
    if (!this.pool.has(bytes)) { this.pool.set(bytes, candidate); this.scanner.rawset(candidate, candidate); this.observer.checkpoint(); }
    return this.pool.get(bytes);
  }
  upvalueName(name, owner) {
    const value = this.pool.get(name) ?? this.observer.internString(name, 'upvalue-name');
    if (value instanceof LuaString && !owner.allocationStrings.includes(value)) owner.allocationStrings.push(value);
    return value;
  }
  constant(p, value, index) {
    let key = value;
    if (typeof value === 'string') key = this.intern(value, p);
    else if (typeof value === 'number' && Number.isInteger(value) && value >= -(2 ** 63) && value < 2 ** 63) key = value === 0 ? 2 ** -52 : value + value * 2 ** -52;
    else if (value === null) key = this.scanner;
    this.scanner.rawset(key, BigInt(index)); this.grow(p, 'constants', index + 1);
  }
  local(p, name) {
    this.intern(name, p);
    const pending = this.pendingLocals.get(p) ?? [];
    if (pending[0] === name) pending.shift(); else this.declare(p, name);
    this.grow(p, 'locvars', p.locvars.length + 1);
  }
  leaveLocals(p,count){this.activeLocals-=count;this.localCounts.set(p,(this.localCounts.get(p)??0)-count);}
  constantLocal(p,name){const pending=this.pendingLocals.get(p);if(pending?.[0]===name)pending.shift();}
  tokens(tokens) { this.inputTokens = tokens; }
  readTo(index) {
    if (!Number.isInteger(index)) return;
    while (this.cursor < Math.min(index, this.inputTokens.length - 1)) {
      const token = this.inputTokens[++this.cursor], value = token.value;
      const need=peak=>{let capacity=this.temporarySizes.get('buffer');while(peak>capacity){capacity*=2;this.resizeTemporary('buffer',capacity);}};
      need(token.bufferPrefixPeak??0);
      if(token.type==='number')need(token.bufferPeak??0);
      if (token.type === 'name' || token.type === 'string' || keywords.has(token.type)) {
        const needed = token.bufferPeak ?? value.length;
        let capacity = this.temporarySizes.get('buffer');
        while (needed > capacity) { capacity *= 2; this.resizeTemporary('buffer', capacity); }
        // luaX_newstring allocates each long occurrence, then chooses the
        // scanner's saved key when identical bytes were already anchored.
        const candidate = this.observer.internString(value, 'source-token');
        if (!this.pool.has(value)) { this.pool.set(value, candidate); this.scanner.rawset(candidate, candidate); this.observer.checkpoint(); }
      }
    }
  }
  declare(p, name) {
    this.growTemporary('actvar', ++this.activeLocals + 1, 24);
    this.localCounts.set(p, (this.localCounts.get(p) ?? 0) + 1);
  }
  prepareLocal(p, name, index) {
    this.readTo(index + 1); this.declare(p, name);
    let pending = this.pendingLocals.get(p); if (!pending) { pending = []; this.pendingLocals.set(p, pending); } pending.push(name);
  }
  statement(node, p) {
    this.readTo(node.tokenStart);
    if (node.kind === 'local') {
      let at = node.tokenStart + 1;
      for (const local of node.names) {
        this.prepareLocal(p, local.name, at++);
        if (this.inputTokens[at]?.type === '<') { while (this.inputTokens[at]?.type !== '>') at++; this.readTo(++at); }
        if (this.inputTokens[at]?.type === ',') at++;
      }
    } else if (node.kind === 'localfunction') this.prepareLocal(p, node.name, node.tokenStart + 2);
    else if(node.kind==='for'||node.kind==='forin'){
      let at=node.tokenStart+1;this.readTo(at+1);
      let pending=this.pendingLocals.get(p);if(!pending){pending=[];this.pendingLocals.set(p,pending);}
      for(let n=0;n<(node.kind==='for'?3:4);n++){this.intern('(for state)',p);this.declare(p,'(for state)');pending.push('(for state)');}
      const names=node.kind==='for'?[node.variable]:node.names;
      for(const name of names){this.prepareLocal(p,name,at);at+=2;}
    }
    else this.readTo(node.tokenStart + 1);
  }
  expression(node, folded) {
    this.readTo(folded || ['literal', 'variable', 'vararg'].includes(node.kind) ? node.tokenEnd : node.tokenStart);
  }
  parameters(node, p) {
    let at = node.paramStart + 1;
    if (node.method) { this.readTo(node.paramStart+1); this.intern('self', p); this.declare(p, 'self'); let pending=this.pendingLocals.get(p);if(!pending){pending=[];this.pendingLocals.set(p,pending);}pending.push('self'); }
    for (const name of node.params.slice(node.method ? 1 : 0)) { this.prepareLocal(p, name, at); at += 2; }
    this.readTo(node.paramEnd);
  }
  startFunction(node, parent) { this.readTo(parent ? node.paramEnd + 1 : 0); }
  loopClose(){this.growTemporary('labels',1,24);}
  closeFunction(p) {
    for (const key of ['code', 'lineinfo', 'abslineinfo', 'constants', 'protos', 'locvars', 'upvalues']) {
      const old = this.capacities.get(p).get(key) ?? 0, size = p[key].length, width = this.width(key);
      this.observer.resize(p, key, old * width, size * width, { force: true });
      this.capacities.get(p).set(key, size);
    }
    // Long source constants share the scanner's canonical strings across all
    // nested prototypes, unlike the binary loader's distinct occurrences.
    const constants = luaValues(); for (const value of p.constants) constants.push(typeof value === 'string' ? this.intern(value, p) : value); p.constants = constants;
    this.activeLocals -= this.localCounts.get(p) ?? 0; this.localCounts.set(p, 0);
    this.observer.checkpoint();
  }
  finish() {
    this.scannerRoot?.(); this.scannerRoot = null;
    const cell = { open: false, value: null };
    this.observer.object('upvalue', cell, this.layout.upvalue); this.closure.upvalues.push(cell);
  }
  dispose({releaseWorkspace=true}={}) {
    this.scannerRoot?.(); this.scannerRoot = null;
    for (const release of this.roots ?? []) release(); this.roots = [];
    if (releaseWorkspace&&this.workspace) this.observer.release(this.workspace);
  }
}
