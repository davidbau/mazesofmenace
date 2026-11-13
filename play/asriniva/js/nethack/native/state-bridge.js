// One per-game native field owner. Legacy byte-level services are explicit
// synchronization boundaries; native-to-native field access stays in JS.
export class NativeStateBridge {
 constructor() { this.sharedTypes=new Set(['struct you','struct prop','struct d_level','struct u_roleplay','struct u_conduct','struct monst','struct permonst','struct obj','struct rm','struct nhcoord','struct attack','struct mfndposdata','struct mextra','struct edog','struct eshk','struct epri','struct emin','struct egd','struct ebones','struct trap']);this.providers=[];this.schemaVersion=0;this.enriched=new WeakMap();this.depth=0; this.epoch=0; this.dirty=new Set();this.aliasVersions=new Map();this.pendingAliases=new Map(); this.fields=0; this.hits=0; this.boundaries=0; }
 registerSchemas(provider) {this.providers.push(provider);this.schemaVersion++;}
 enrich(record,type,address) {
  if(this.enriched.get(record)===this.schemaVersion)return;
  this.enriched.set(record,this.schemaVersion);
  for(const provider of this.providers)provider.get(type)?.(address);
 }
 // A key identifies one complete physical field with compatible storage width.
 // Distinct packed members must not share it; overlapping unions stay live.
 field(read,write,normalize=v=>v,storageKey) {
  const owner=this;
  if(this.nativeArena){this.fields++;return {enumerable:true,get:read,set(value){write(normalize(value));}};}
  const cell={epoch:-1,version:-1,value:undefined,read,write};this.fields++;
  return {enumerable:true,get(){
   if(!owner.depth)return read();
   const version=storageKey===undefined?0:owner.aliasVersions.get(storageKey)??0;
   if(cell.epoch!==owner.epoch||cell.version!==version){if(storageKey!==undefined&&owner.pendingAliases.has(storageKey))owner.flush();cell.value=read();cell.epoch=owner.epoch;cell.version=version;}else owner.hits++;
   return cell.value;
  },set(value){const normalized=normalize(value);if(!owner.depth){write(normalized);owner.invalidate();return;}cell.value=normalized;cell.epoch=owner.epoch;if(storageKey!==undefined){const previous=owner.pendingAliases.get(storageKey);if(previous&&previous!==cell)owner.dirty.delete(previous);cell.version=(owner.aliasVersions.get(storageKey)??0)+1;owner.aliasVersions.set(storageKey,cell.version);owner.pendingAliases.set(storageKey,cell);}else cell.version=0;owner.dirty.add(cell);}};
 }
 scalar(at,kind,normalize,read,write,key) {if(!this.nativeArena)return this.field(read,write,normalize,key);this.fields++;const cell=this.nativeArena.scalar(kind,at);return {enumerable:true,get:cell.get,set(value){cell.set(normalize(value));}};}
 pointer(at,decode,normalize,read,write,key) {
  if(!this.nativeArena)return this.field(read,write,normalize,key);
  this.fields++;const arena=this.nativeArena,owner=this;let previous,value,version=-1;
  return {enumerable:true,get(){const raw=arena.pointer(at);if(raw!==previous||version!==owner.schemaVersion){value=decode(raw);previous=raw;version=owner.schemaVersion;}return value;},set(input){const normalized=normalize(input),raw=arena.handle(normalized);arena.storePointer(at,raw);value=decode(raw);previous=raw;version=owner.schemaVersion;}};
 }
 flush() {if(this.nativeArena)return;for(const cell of this.dirty)cell.write(cell.value);this.dirty.clear();this.pendingAliases.clear();}
 invalidate() {if(!this.nativeArena)this.epoch++;}
 boundary(fn,...args) {
  if(!this.nativeArena)this.flush();this.boundaries++;const depth=this.depth;this.depth=0;
  try {return fn(...args);}finally {this.depth=depth;if(this.nativeArena)this.nativeArena.sync();else this.invalidate();}
 }
 enter() {if(!this.depth){if(this.nativeArena)this.nativeArena.sync();else{this.flush();this.invalidate();}}this.depth++;}
 leave() {this.depth--;if(!this.nativeArena&&!this.depth){this.flush();this.invalidate();}}
}

// Native providers in one game share identities and their synchronization owner.
const games=new WeakMap();
export function nativeStateFor(moduleKey) {
 let state=games.get(moduleKey);
 if(!state){state=new NativeStateBridge();state.records=new Map();state.functions=new Map();games.set(moduleKey,state);}
 return state;
}
