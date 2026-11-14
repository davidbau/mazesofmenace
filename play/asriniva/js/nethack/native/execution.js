// Native engine calls keep ordinary values. Foreign functions retain the
// supplied ABI conversion and the byte/callback boundary.
export function installNativeDependency(local,name,target,owner,legacy,prepareNative){
 let previous,adapted;
 Object.defineProperty(local,name,{configurable:true,enumerable:true,get(){const selected=owner.functions.get(target);if(selected?.nativeState!==owner)return legacy;if(!prepareNative)return selected;if(selected!==previous){adapted=(...args)=>selected(...prepareNative(args));previous=selected;}return adapted;},set(value){Object.defineProperty(this,name,{value,writable:true,configurable:true,enumerable:true});}});
}
export function installNativeIntegerCasts(env,exclude=[]){
 const casts={int:v=>v|0,uint:v=>v>>>0,short:v=>v<<16>>16,ushort:v=>v&65535,char:v=>v<<24>>24,uchar:v=>v&255,byte:v=>v<<24>>24,boolean:v=>v<<24>>24,xint8:v=>v<<24>>24,xint16:v=>v<<16>>16,coordxy:v=>v<<16>>16};
 for(const[name,cast]of Object.entries(casts))if(!exclude.includes(name)&&name in env&&typeof env[name]==='function'){const legacy=env[name];env[name]=value=>typeof value==='number'&&Number.isInteger(value)?cast(value):legacy(value);}
}
export function createNativeAbiCaster(ctypes,transport,pointer){
 const cache=new Map();
 return source=>{
  const type=ctypes.abiType(source);if(cache.has(type))return cache.get(type);
  let cast,legacy;
  if(type.includes('*'))cast=pointer;
  else if(type==='void')cast=()=>undefined;
  else if(type==='bool'||type==='_Bool')cast=value=>Number(Number(value?.address??value)!==0);
  else if(type==='float')cast=value=>Math.fround(Number(value));
  else if(type==='double')cast=Number;
  else if(type==='long double')throw new TypeError('Opaque alignment storage has no native numeric ABI: '+type);
  else if(type==='char'||type==='signed char'){cast=v=>v<<24>>24;legacy=transport.char;}
  else if(type==='unsigned char'){cast=v=>v&255;legacy=transport.uchar;}
  else if(type==='short'){cast=v=>v<<16>>16;legacy=transport.short;}
  else if(type==='unsigned short'){cast=v=>v&65535;legacy=transport.ushort;}
  else if(type==='unsigned int'){cast=v=>v>>>0;legacy=transport.uint;}
  else if(ctypes.size(type)===8)cast=type.startsWith('unsigned')?transport.ulong:transport.long;
  else{cast=v=>v|0;legacy=transport.int;}
  const result=legacy?(value=>typeof value==='number'&&Number.isInteger(value)?cast(value):legacy(value)):cast;
  cache.set(type,result);return result;
 };
}
