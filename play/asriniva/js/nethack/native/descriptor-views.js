// Game-owned records with shared field accessors and precompiled native fields.
// Descriptor arrays and byte/pointer arguments retain their boundary carriers.
export function createNativeDescriptorViews({owner,schemas,address,raw,cache,names,decode,decorate,plans,numericRows=false,layout,aggregateField}){
 const prototypes=new Map(),kinds=new WeakMap();
 function view(name,input){
  const at=address(input);if(!at)return 0;
  const key=name+':'+at;if(cache.has(key))return cache.get(key);
  const schema=schemas[name];if(!schema)throw Error('Unknown native descriptor record '+name);
  let prototype=prototypes.get(name);
  if(!prototype){
   prototype={};const fields=plans[names.indexOf(name)];
   schema.fields.forEach((field,index)=>{const plan=fields[index],read=plan.nativeRead??plan.read,write=plan.nativeWrite??plan.write;
    Object.defineProperty(prototype,field.name,{get(){const value=read(this.address);return aggregateField&&name===aggregateField.record&&field.name===aggregateField.field?aggregateField.array(aggregateField.makeDescriptor(),aggregateField.address(value)):field.d.t?value:decode(field.d,value);},set(value){write(this.address,field.d.t&&typeof value==='number'&&Number.isInteger(value)?value:raw(value));}});
   });prototypes.set(name,prototype);
  }
  const shared=owner.sharedTypes.has(schema.ctype),result=shared?owner.nativeRecords.record(schema.ctype,at):Object.assign(Object.create(prototype),{address:at,kind:name});
  // Pointer-style numeric indexing is retained for private descriptor records.
  // Shared actors/items keep their canonical identity and direct field access.
  const record=numericRows&&!shared?new Proxy(result,{get:(target,key,receiver)=>typeof key==='string'&&/^\d+$/.test(key)?view(name,at+Number(key)*Number(layout[name+'Size'])):Reflect.get(target,key,receiver)}):result;
  kinds.set(record,name);cache.set(key,record);
  // Own descriptors retain header-macro reflection rules; their accessor
  // functions are shared between all records of this type.
  for(const field of schema.fields)if(!Object.hasOwn(result,field.name))Object.defineProperty(result,field.name,Object.getOwnPropertyDescriptor(prototype,field.name));
  try{decorate(name,record);}catch(error){cache.delete(key);kinds.delete(record);throw error;}
  return record;
 }
 view.kindOf=value=>{const kind=value&&typeof value==='object'?kinds.get(value)??owner.nativeRecords.kindOf(value):undefined;return Object.hasOwn(schemas,kind)?kind:undefined;};
 return view;
}
