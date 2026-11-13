// Measured native fields shared by game-bound descriptor-style engine kernels.
// Arrays retain addressable transport; scalar/pointer state has one JS owner.
export function createNativeDescriptorViews({owner,schemas,records,memory,addr,raw,read,write,decode,decorate,decodedFunctions=false,stableInline=false}) {
 const views=new Map(),scalar={i8:'Int8',u8:'Uint8',i16:'Int16',u16:'Uint16',i32:'Int32',u32:'Uint32',i64:'BigInt64',u64:'BigUint64'};
 const canonical=type=>owner.sharedTypes.has('struct '+type)?'struct '+type:type;
 const definitions=new Map(Object.entries(schemas).map(([name,row])=>{
  const definition=records[row.ctype.replace(/^(struct |union )/,'')];
  if(!definition)throw Error('Missing native descriptor record '+row.ctype);
  for(const f of row.fields)if(!definition.fields[f.name])throw Error('Missing native descriptor field '+row.ctype+'.'+f.name);
  return [name,definition];
 }));
 function view(name,value) {
  const at=addr(value);if(!at)return 0;
  const row=schemas[name];if(!row)throw Error('Unknown native descriptor record '+name);
  const key=name+':'+at,type=canonical(row.ctype),shared=owner.sharedTypes.has(type);
  if(views.has(key)){const out=views.get(key);owner.enrich(out,type,at);return out;}
  const identity=type+':'+at,out=(shared&&owner.nativeRecords?owner.nativeRecords.record(type,at):shared?owner.records.get(identity):undefined)??{address:at};
  if(views.has(key))return views.get(key);
  if(shared)owner.records.set(identity,out);
  if(!Object.hasOwn(out,'kind'))Object.defineProperty(out,'kind',{value:name,enumerable:true});
  for(const f of row.fields){
   if(Object.hasOwn(out,f.name))continue;
   const field=definitions.get(name).fields[f.name],p=at+field.offset;
   if(f.d.s||f.d.a){let ready=false,projection;Object.defineProperty(out,f.name,{enumerable:true,get(){if(!stableInline)return read(f.d,p);if(!ready){const value=read(f.d,p);projection=value;ready=true;}return projection;},set:v=>write(f.d,p,v)});continue;}
   let get,set,normalize,pointerDecode;
   if(f.bit){
    if(field.bits===undefined||field.shift+field.bits>8)throw Error('Review native descriptor packed field '+name+'.'+f.name);
    const mask=(1<<field.bits)-1,packed=mask<<field.shift;
    get=()=>memory().getUint8(p)>>>field.shift&mask;
    set=v=>memory().setUint8(p,(memory().getUint8(p)&~packed)|((v&mask)<<field.shift));
    normalize=v=>Number(v)&mask;
   }else if(f.d.p!==undefined||f.d.q||f.d.f){
    pointerDecode=v=>decode(f.d,v);get=()=>pointerDecode(memory().getBigUint64(p,true));set=v=>memory().setBigUint64(p,raw(v),true);normalize=v=>pointerDecode(raw(v));
   }else{
    const method=scalar[f.d.t];if(!method)throw Error('Review native descriptor scalar '+name+'.'+f.name);
    get=()=>memory()['get'+method](p,true);set=v=>memory()['set'+method](p,v,true);normalize=v=>decode(f.d,typeof v==='number'&&Number.isFinite(v)?Math.trunc(v):raw(v));
   }
   // Unshared globals can have different pointer projections in other native
   // kernels. Their backing bytes are the common synchronization boundary.
   if(decodedFunctions&&f.d.f)Object.defineProperty(out,f.name,owner.field(get,set,raw));
   else if(owner.nativeArena&&!f.bit)Object.defineProperty(out,f.name,pointerDecode&&!f.d.f?owner.pointer(p,pointerDecode,normalize,get,set):owner.scalar(p,f.d.f?'BigUint64':scalar[f.d.t],normalize,get,set));
   else if(type.startsWith('union ')||(!shared&&type!=='struct instance_globals_v'))Object.defineProperty(out,f.name,{enumerable:true,get(){owner.flush();return get();},set(v){owner.flush();set(normalize(v));owner.invalidate();}});
   else Object.defineProperty(out,f.name,owner.field(get,set,normalize,type==='struct instance_globals_v'?p:undefined));
  }
  views.set(key,out);decorate(name,out);owner.enrich(out,type,at);return out;
 }
 owner.registerSchemas(new Map(Object.entries(schemas).filter(([,row])=>owner.sharedTypes.has(canonical(row.ctype))).map(([name,row])=>[canonical(row.ctype),p=>view(name,p)])));
 return view;
}
