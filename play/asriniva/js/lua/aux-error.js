/* Lua5.4.8 lauxlib.c argument errors and lobject.c BuffFS formatting.
 * Lua notice: lua/lobject.js. Temporary values model the actual C API stack;
 * string creation, concatenation and checkGC happen at their native sites.
 */
import {LuaError,LuaTable,LuaLightUserdata,isLuaString,luaStringBytes,luaType,numberToString,toInteger,toNumber,utf8Bytes} from './lobject.js';
import {LuaMemoryError} from './debug.js';
const text=value=>value===null?'(null)':isLuaString(value)?luaStringBytes(value).split('\0',1)[0]:String(value);
function stackContext(vm){const frame=vm.heap.frameMetadata(vm.currentThread),scope=vm.luaAuxStackScope,record=vm.heap.objects.get(vm.currentThread),explicit=record?.gcTop!==undefined&&(record.gcTopFrame===undefined||record.gcTopFrame===frame);return{frame,top:scope?.frame===frame?scope.top:explicit?record.gcTop:frame?.argumentTop??frame?.checkTop??vm.heap.getStackTop(vm.currentThread)};}
export const luaAuxTop=vm=>stackContext(vm).top;
export function luaWithAuxTop(vm,extra,callback){const previous=vm.luaAuxStackScope,context=stackContext(vm);vm.luaAuxStackScope={frame:context.frame,top:context.top+extra};try{return callback();}finally{vm.luaAuxStackScope=previous;}}
export class LuaAuxStack{
  constructor(vm,{extra=0,check=true}={}){this.vm=vm;this.values=[];this.base=stackContext(vm).top+extra;this.checkFormat=check;this.release=vm.heap.addRoots(()=>this.values);}
  atTop(fn){return this.vm.heap.withStackTop(this.base+this.values.length,fn);}
  checkpoint(){return this.atTop(()=>this.vm.heap.checkpoint());}
  push(value){this.values.push(value);return value;}
  string(bytes,check=true){const value=this.atTop(()=>this.vm.heap.adopt(bytes));this.push(value);if(check)this.checkpoint();return value;}
  pop(count=1){this.values.length-=count;}
  concat(count,check=true){
    const parts=this.values.slice(-count),nonempty=parts.filter(value=>luaStringBytes(value).length);let result;
    if(nonempty.length===1)result=nonempty[0];else if(!nonempty.length)result=this.atTop(()=>this.vm.heap.adopt(''));
    else result=this.atTop(()=>this.vm.heap.adopt(parts.map(luaStringBytes).join('')));
    this.pop(count);this.push(result);if(check)this.checkpoint();return result;
  }
  format(format,...args){
    format=text(format);let buffer='',pushed=false,argument=0;
    const pushstr=bytes=>{this.string(bytes,false);if(pushed)this.concat(2,false);else pushed=true;};
    const clear=()=>{pushstr(buffer);buffer='';};
    const prepare=size=>{if(size>199-buffer.length)clear();};
    const add=bytes=>{if(bytes.length<=199){prepare(bytes.length);buffer+=bytes;}else{clear();pushstr(bytes);}};
    let start=0;
    for(let at=0;at<format.length;at++)if(format[at]==='%'){
      add(format.slice(start,at));const code=format[++at],value=args[argument++];
      if(code==='s')add(text(value));
      else if(code==='c')add(String.fromCharCode(Number(value)&255));
      else if(code==='d'||code==='I'||code==='f'){prepare(44);buffer+=numberToString(code==='d'?BigInt.asIntN(32,BigInt(value)):code==='I'?BigInt.asIntN(64,BigInt(value)):Number(value));}
      else if(code==='p'){prepare(32);buffer+=BigInt(value)?'0x'+BigInt.asUintN(64,BigInt(value)).toString(16):'0x0';}
      else if(code==='U')add(utf8Bytes(Number(value)));
      else if(code==='%'){argument--;add('%');}
      else throw new Error('unsupported internal Lua diagnostic conversion: '+code);
      start=at+1;
    }
    add(format.slice(start));clear();if(this.checkFormat)this.checkpoint();return this.values.at(-1);
  }
  close(){this.release();}
}
function raise(stack,format,args){
  stack.format('%s',stack.vm.debug.where(stack.vm.currentThread,1));
  stack.format(format,...args);const value=stack.concat(2);
  const error=luaStringBytes(value)==='not enough memory'?new LuaMemoryError():new LuaError(value,{adopt:false});error.luaExplicit=true;throw error;
}
export function luaAuxError(vm,format,...args){const stack=new LuaAuxStack(vm);try{return raise(stack,format,args);}finally{stack.close();}}
export function luaFormattedString(vm,format,args,{extra=0}={}){const stack=new LuaAuxStack(vm,{extra});try{return stack.format(format,...args);}finally{stack.close();}}
function findField(stack,table,fn,level){
  if(!level||!(table instanceof LuaTable))return false;
  let key=null;stack.push(null);
  while(true){const pair=table.next(key);stack.pop();if(pair[0]===null)return false;key=pair[0];stack.push(key);stack.push(pair[1]);
    if(isLuaString(key)){
      if(pair[1]===fn){stack.pop();return true;}
      if(findField(stack,pair[1],fn,level-1)){stack.string('.');const dot=stack.values.pop();stack.values[stack.values.length-2]=dot;stack.concat(3);return true;}
    }
    stack.pop();
  }
}
function globalName(stack,fn){
  const initial=stack.values.length;stack.push(fn);stack.atTop(()=>stack.vm.heap.adopt('_LOADED'));const loaded=stack.vm.registry.rawget('_LOADED');stack.push(loaded);
  if(!stack.vm.heap.checkStack(stack.vm.currentThread,stack.base+stack.values.length,6,{safe:false,gc:false}))return luaWithAuxTop(stack.vm,stack.values.length,()=>luaAuxError(stack.vm,'stack overflow (%s)','not enough stack'));
  if(findField(stack,loaded,fn,2)){
    let name=luaStringBytes(stack.values.at(-1));if(name.startsWith('_G.')){stack.string(name.slice(3));stack.values.splice(-2,1);name=name.slice(3);}
    const value=stack.values.at(-1);stack.values.length=initial;stack.push(value);return name;
  }
  stack.values.length=initial;return '?';
}
function argumentError(stack,arg,extra){
  const frame=stack.vm.debug.thread(stack.vm.currentThread).frames.at(-1);
  if(!frame)return raise(stack,'bad argument #%d (%s)',[arg,extra]);
  if(frame.namewhat==='method'){arg--;if(arg===0)return raise(stack,"calling '%s' on bad self (%s)",[frame.name,extra]);}
  const name=frame.name??globalName(stack,frame.fn);
  return raise(stack,"bad argument #%d to '%s' (%s)",[arg,name,extra]);
}
export function luaArgError(vm,arg,extra){const stack=new LuaAuxStack(vm);try{return argumentError(stack,arg,extra);}finally{stack.close();}}
export function luaArgErrorFormat(vm,arg,format,...args){const stack=new LuaAuxStack(vm);try{const extra=stack.format(format,...args);return argumentError(stack,arg,extra);}finally{stack.close();}}
export function luaTypeError(vm,arg,expected,value=vm.debug.thread(vm.currentThread).frames.at(-1)?.args?.[arg-1]){
  const stack=new LuaAuxStack(vm);
  try{
    let name;const metatable=vm.metatableOf(value);
    if(metatable){stack.push(metatable);stack.string('__name');const field=metatable.rawget('__name');stack.pop();stack.push(field);if(field===null)stack.pop(2);else{stack.values.splice(-2,1);if(isLuaString(field))name=luaStringBytes(field);}}
    name??=value===undefined?'no value':value instanceof LuaLightUserdata?'light userdata':luaType(value);
    const message=stack.format('%s expected, got %s',expected,name);
    return argumentError(stack,arg,message);
  }finally{stack.close();}
}
export function luaCheckInteger(vm,value,arg){const result=toInteger(value);if(result!==null)return result;if(toNumber(value)!==null)return luaArgError(vm,arg,'number has no integer representation');return luaTypeError(vm,arg,'number',value);}
export function luaCheckNumber(vm,value,arg){const result=toNumber(value);return result===null?luaTypeError(vm,arg,'number',value):Number(result);}
export function luaCheckString(vm,value,arg){if(isLuaString(value)||luaType(value)==='number')return vm.checkString(value,arg-1);return luaTypeError(vm,arg,'string',value);}
