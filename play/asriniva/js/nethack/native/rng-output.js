// Native logger values only. Generator state, draw order and FILE operations
// remain in their original owners; numeric pointers keep live byte reads.
export function createNativeRngOutput({memory,stdio,libc,snprintf:legacySnprintf,fprintf:legacyFprintf,ownedOutput=stdio,ownedFormat=libc.format}){
 const printf=stdio.fprintf,puts=stdio.fputs,format=libc.format;
 const integer=value=>String(typeof value==='number'&&Number.isInteger(value)?value|0:Number(BigInt.asIntN(32,BigInt(value))));
 const text=value=>{
  if(value instanceof Uint8Array){const end=value.indexOf(0);return String.fromCharCode(...value.subarray(0,end<0?value.length:end));}
  if(value===0)return '(null)';
  if(typeof value==='string'){const end=value.indexOf('\0');return end<0?value:value.slice(0,end);}
  return memory.readString(value);
 };
 function render(shape,a){
  const need=shape==='%d'?1:shape==='%d,%d'?2:shape==='%d %s(%s) = %d @ %s(%s:%d)\n'?7:shape==='%d %s(%s) = %d @ %s:%d\n'?6:shape==='%d %s(%s) = %d\n'?4:shape==='%d ~drn2(%d) = %d'?3:shape===' @ %s(%s:%d)'?3:shape===' @ %s:%d'?2:0;
  if(a.length<need)return;
  switch(shape){
   case '%d':return integer(a[0]);
   case '%d,%d':return integer(a[0])+','+integer(a[1]);
   case '%d %s(%s) = %d @ %s(%s:%d)\n':return integer(a[0])+' '+text(a[1])+'('+text(a[2])+') = '+integer(a[3])+' @ '+text(a[4])+'('+text(a[5])+':'+integer(a[6])+')\n';
   case '%d %s(%s) = %d @ %s:%d\n':return integer(a[0])+' '+text(a[1])+'('+text(a[2])+') = '+integer(a[3])+' @ '+text(a[4])+':'+integer(a[5])+'\n';
   case '%d %s(%s) = %d\n':return integer(a[0])+' '+text(a[1])+'('+text(a[2])+') = '+integer(a[3])+'\n';
   case '%d ~drn2(%d) = %d':return integer(a[0])+' ~drn2('+integer(a[1])+') = '+integer(a[2]);
   case ' @ %s(%s:%d)':return ' @ '+text(a[0])+'('+text(a[1])+':'+integer(a[2])+')';
   case ' @ %s:%d':return ' @ '+text(a[0])+':'+integer(a[1]);
  }
 }
 return {
  snprintf(buffer,n,shape,...args){
   if(libc.format!==format||libc.format!==ownedFormat||!(buffer instanceof Uint8Array)||typeof n!=='number'||!Number.isInteger(n)||n!==buffer.length||n<24||(shape!=='%d'&&shape!=='%d,%d'))return legacySnprintf(buffer,n,shape,...args);
   const value=render(shape,args);if(value===undefined)return legacySnprintf(buffer,n,shape,...args);
   // At most two signed int32 values: 23 bytes plus NUL fit the source's
   // 32/64-byte arrays. Other capacities use the unchanged formatter above.
   for(let i=0;i<value.length;i++)buffer[i]=value.charCodeAt(i);buffer[value.length]=0;return value.length;
  },
  fprintf(file,shape,...args){
   if(stdio.fprintf!==printf||stdio.fputs!==puts||ownedOutput.fprintf!==printf||ownedOutput.fputs!==puts||libc.format!==format||libc.format!==ownedFormat||typeof shape!=='string')return legacyFprintf(file,shape,...args);
   const value=render(shape,args);if(value===undefined)return legacyFprintf(file,shape,...args);
   return ownedOutput.fputs(value,file)===-1?-1:value.length;
  },
 };
}
export function installNativeRngCaller(services,setCaller){
 const validated=new Set(),literal=services.literal,compatibility=services.rng_log_set_caller;
 const value=input=>{
  if(typeof input!=='string')return services.address?services.address(input):input?.address??input??0;
  if(!validated.has(input)){for(let i=0;i<input.length;i++)if(input.charCodeAt(i)>255)throw new TypeError('C byte strings require explicit UTF-8 encoding');validated.add(input);}
  // Empty strings must remain non-NULL in the original source's branch tests.
  return input.length?input:literal(input);
 };
 const native=(file,line,caller)=>setCaller(value(file),line,value(caller));
 Object.assign(native,{owner:services,compatibility,literal});services.nativeRngCaller=native;
}
export function recordNativeRngCaller(services,file,line,caller){
 const native=services.nativeRngCaller;
 if(native?.owner===services&&native.compatibility===services.rng_log_set_caller&&native.literal===services.literal)return native(file,line,caller);
 const pointer=value=>typeof value==='string'?services.literal(value):value?.address??value??0;
 return services.rng_log_set_caller(pointer(file),line,pointer(caller));
}
