// Engine value records acquire C bytes only at a genuine foreign boundary.
import {createNativeAbiCaster} from './execution.js';
const marker=Symbol('native value reference');
export const isNativeValueReference=value=>value!==null&&typeof value==='object'&&value[marker]===true;
class ValueReference {
 constructor(root,layout,data,offset=0,scalar,parent){this.root=root;this.layout=layout;this.data=data;this.offset=offset;this.scalar=scalar;this.parent=parent;this.children=undefined;}
 get [marker](){return true;}
 get type(){return this.layout?.type;}
 get address(){return this.root.materialize()+this.offset;}
 object(){const root=this.root;root.reserved.assertAlive();if(this.scalar)return this.parent.object()[this.scalar.name];if(root.at===undefined)return this.data;return root.views.record(this.layout.type,root.at+this.offset);}
 field(name){const f=this.layout?.byName[name];if(!f)throw Error('Unknown native value field '+name);const children=this.children??=Object.create(null);return children[name]??=new ValueReference(this.root,f.nested,this.data[name],this.offset+f.offset,f.nested?undefined:f,this);}
 read(name){if(!this.layout?.byName[name])throw Error('Unknown native value field '+name);return this.object()[name];}
 write(name,value){const f=this.layout?.byName[name];if(!f||f.nested)throw Error('Invalid native scalar write '+name);this.object()[name]=f.normalize(value);return value;}
 get value(){return this.object();}
 set value(value){if(!this.scalar)throw Error('Native record needs a structured copy');this.parent.object()[this.scalar.name]=this.scalar.normalize(value);}
}
export function createNativeValueRecords(environment,allocate){
 const {ctypes,memory}=environment,views=environment.nativeRecords??environment.nativeOwner?.nativeRecords;
 const layouts=new Map(),cast=createNativeAbiCaster(ctypes,environment.transport,v=>v);
 if(typeof allocate.reserve!=='function')throw Error('Native values require declaring-frame reservations');
 function layout(type){
  type=ctypes.canonical(type);if(layouts.has(type))return layouts.get(type);
  const row=ctypes.record(type),fields=Object.entries(row.fields).map(([name,f])=>{
   if(f.bits!==undefined)throw Error('Native value bitfields require an explicit policy');
   const declared=f.ctype.replace(new RegExp('\\s+'+name+'$'),''),scalar=ctypes.abiType(declared);
   if(scalar.includes('['))throw Error('Native value arrays require an explicit policy');
   const nested=f.record?layout(f.record):undefined,normalize=nested?undefined:scalar.includes('*')?v=>v:cast(scalar);
   return {name,offset:f.offset,nested,normalize};
  });const prototype={};Object.defineProperty(prototype,'nativeType',{value:type});
  const result={type,identity:row.type,size:row.size,fields,byName:Object.fromEntries(fields.map(f=>[f.name,f])),prototype};layouts.set(type,result);return result;
 }
 function blank(row){const out=Object.create(row.prototype);for(const f of row.fields)out[f.name]=f.nested?blank(f.nested):0;return out;}
 function snapshot(row,source){const out=blank(row);for(const f of row.fields)out[f.name]=f.nested?snapshot(f.nested,source[f.name]):source[f.name];return out;}
 function assign(row,to,from){for(const f of row.fields)if(f.nested)assign(f.nested,to[f.name],from[f.name]);else to[f.name]=f.normalize(from[f.name]);}
 function local(type){
  const row=layout(type),data=blank(row),reserved=allocate.reserve(row.size);
  const root={at:undefined,reserved,views,materialize(){reserved.assertAlive();if(this.at===undefined){this.at=Number(reserved());memory.HEAPU8.fill(0,this.at,this.at+row.size);assign(row,views.record(row.type,this.at),data);}return this.at;}};
  return new ValueReference(root,row,data);
 }
 function copy(to,from,size){
  const ref=isNativeValueReference(to)?to:from,row=ref.layout;if(!row||size!==row.size)throw Error('Native value copy extent mismatch');
  if(isNativeValueReference(to)&&isNativeValueReference(from)&&to.layout?.identity!==from.layout?.identity)throw Error('Native value copy type mismatch');
  const source=isNativeValueReference(from)?from.object():views.record(row.type,from),target=isNativeValueReference(to)?to.object():views.record(row.type,to);
  const src=isNativeValueReference(from)?from.root.at===undefined?undefined:from.root.at+from.offset:Number(from),dst=isNativeValueReference(to)?to.root.at===undefined?undefined:to.root.at+to.offset:Number(to);
  assign(row,target,src!==undefined&&dst!==undefined&&src<dst+size&&dst<src+size?snapshot(row,source):source);return to;
 }
 return {local,copy};
}
