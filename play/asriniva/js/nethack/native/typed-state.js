// Native actor/map values use direct typed-array elements. The byte layout also
// serves retained ABI/serialization code, so aliases never require a mirror copy.
const widths={Int8:1,Uint8:1,Int16:2,Uint16:2,Int32:4,Uint32:4,BigInt64:8,BigUint64:8};
const constructors={Int8:Int8Array,Uint8:Uint8Array,Int16:Int16Array,Uint16:Uint16Array,Int32:Int32Array,Uint32:Uint32Array,BigInt64:BigInt64Array,BigUint64:BigUint64Array};
const littleHost=new Uint8Array(new Uint16Array([1]).buffer)[0]===1;
export class NativeTypedState {
 constructor(memory){
  this.memory=memory;this.refresh();memory.onGrow(()=>this.refresh());
  const view={};
  for(const[name,bytes]of Object.entries(widths)){
   view['get'+name]=(at,little)=>{
    if(typeof at!=='number'||!Number.isInteger(at)||(bytes>1&&(!littleHost||!little||at%bytes)))return memory.view['get'+name](at,little);
    const value=this[name][at/bytes];return value===undefined?memory.view['get'+name](at,little):value;
   };
   view['set'+name]=(at,value,little)=>{
    if(typeof at!=='number'||!Number.isInteger(at)||(bytes>1&&(!littleHost||!little||at%bytes))||this[name][at/bytes]===undefined)return memory.view['set'+name](at,value,little);
    this[name][at/bytes]=value;
   };
  }
  for(const name of ['Float32','Float64']){view['get'+name]=(at,little)=>memory.view['get'+name](at,little);view['set'+name]=(at,v,little)=>memory.view['set'+name](at,v,little);}
  Object.defineProperties(view,{buffer:{get:()=>memory.buffer},byteLength:{get:()=>memory.buffer.byteLength},byteOffset:{value:0}});
  this.view=view;
 }
 refresh(){for(const[name,ctor]of Object.entries(constructors))this[name]=new ctor(this.memory.buffer,0,Math.floor(this.memory.buffer.byteLength/widths[name]));}
 sync(){if(this.Int8.buffer!==this.memory.buffer)this.refresh();}
 handle(value){value=value?.address??value??0;if(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0)return value;const raw=BigInt.asUintN(64,BigInt(value));return raw<=9007199254740991n?Number(raw):raw;}
 pointer(at){
  if(littleHost&&typeof at==='number'&&Number.isInteger(at)&&at%4===0){const lo=this.Uint32[at/4],hi=this.Uint32[at/4+1];if(lo!==undefined&&hi!==undefined&&hi<0x200000)return hi*4294967296+lo;}
  return this.handle(this.memory.view.getBigUint64(at,true));
 }
 storePointer(at,value){
  value=this.handle(value);
  if(littleHost&&typeof value==='number'&&typeof at==='number'&&Number.isInteger(at)&&at%4===0&&this.Uint32[at/4]!==undefined&&this.Uint32[at/4+1]!==undefined){this.Uint32[at/4]=value>>>0;this.Uint32[at/4+1]=Math.floor(value/4294967296);return;}
  this.memory.view.setBigUint64(at,BigInt(value),true);
 }
 scalar(kind,at){
  const bytes=widths[kind];if(!bytes)throw Error('Unknown native state scalar '+kind);
  if(!littleHost||!Number.isInteger(at)||at%bytes)return {get:()=>this.memory.view['get'+kind](at,true),set:value=>this.memory.view['set'+kind](at,value,true)};
  const index=at/bytes;
  if(bytes===8){
   let lastLow,lastHigh,lastValue;const word=at/4;
   return {get:()=>{const lo=this.Uint32[word],hi=this.Uint32[word+1];if(lo===undefined||hi===undefined)return this.memory.view['get'+kind](at,true);if(lo!==lastLow||hi!==lastHigh){lastValue=this[kind][index];lastLow=lo;lastHigh=hi;}return lastValue;},set:value=>{if(this[kind][index]===undefined)return this.memory.view['set'+kind](at,value,true);this[kind][index]=value;}};
  }
  return {get:()=>{const value=this[kind][index];return value===undefined?this.memory.view['get'+kind](at,true):value;},set:value=>{if(this[kind][index]===undefined)return this.memory.view['set'+kind](at,value,true);this[kind][index]=value;}};
 }
}
