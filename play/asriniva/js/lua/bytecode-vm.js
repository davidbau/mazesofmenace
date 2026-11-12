/* Lua5.4 register VM for real 5.4 binary prototypes. Based on lvm.c/ldo.c;
 * Lua notice: lua/lobject.js. Text compilation is a separate compiler seam.
 * All dispatched instructions call LuaDebugState.opcode(); fused JMP,
 * EXTRAARG, arithmetic-success MMBIN and generic-for instructions skipped by
 * Lua's native VM are likewise not dispatched/count-hooked here.
 */
import { LuaChunkReader } from './incremental-lexer.js';
import { compileLuaIncremental } from './incremental-parser.js';
import { LuaParserErrors } from './parser-errors.js';
import { LuaVM } from './lvm.js';
import { LuaTable, LuaUserdata, LuaThread, LuaError, luaType, truth, rawEqual, arithmetic, toNumber, toInteger, MININTEGER, MAXINTEGER, luaValues, isLuaString, luaStringBytes, numberToString } from './lobject.js';
import { LuaDebugState, luaFunctionLine } from './debug.js';
import { loadLuaChunk, dumpLuaChunk, decodeLuaInstruction, luaCallName, LUA_OP as O } from './codegen.js';
import { openBase, openTable } from './lbaselib.js';
import { openMath } from './lmathlib.js';
import { openString } from './lstrlib.js';
import { openUtf8 } from './lutf8lib.js';
import { openCoroutine } from './lcorolib.js';
const numeric=v=>typeof v==='number'||typeof v==='bigint';
const tmops={6:'+ ',7:'-',8:'*',9:'%',10:'^',11:'/',12:'//',13:'&',14:'|',15:'~',16:'<<',17:'>>'};tmops[6]='+';
const arithNames=['+','-','*','%','^','/','//','&','|','~','<<','>>'];
function upvalue(registers,index,heap){return {open:true,registers,index,closed:null,get value(){return this.open?this.registers[this.index]??null:this.closed;},set value(v){v=heap?.adopt(v)??v;if(this.open)this.registers[this.index]=v;else this.closed=v;heap?.barrierForward(this,v);},close(){if(this.open){this.closed=this.value;this.open=false;this.registers=null;const record=heap?.records.get(this);if(record?.white===0)record.black=true;heap?.barrierForward(this,this.closed);}}};}
export class LuaBytecodeVM extends LuaVM {
 writeStackSlots(base,values,thread=this.currentThread){let stack=this.bytecodeStacks.get(thread);if(!stack){stack=new Map();this.bytecodeStacks.set(thread,stack);}for(let n=0;n<values.length;n++)stack.set(base+n,{value:values[n]??null});}
 setHostStackTop(count){const values=super.setHostStackTop(count),metadata=this.heap.frameMetadata(this.currentThread);this.writeStackSlots(metadata.func+1,values);return values;}
 callName(thread){const parent=this.bytecodeDebug.thread(thread).frames.at(-1);return parent?.prototype?.code&&parent.pc>=0?luaCallName(parent.prototype,parent.pc):{name:null,namewhat:''};}
 constructor(options={}) {
  super({...options,instructionLimit:Infinity});this.bytecodeDebug=this.debug;this.bytecodeFrames=new Map();this.bytecodeStacks=new WeakMap();this.bytecodeHostThreads=[];this.bytecodeInstructionLimit=options.instructionLimit??Infinity;this.bytecodeInstructions=0;this.bytecodeErrorSerial=0;this.hostWorkUnits=0;this.hostWorkLimit=options.hostWorkLimit??Infinity;
 }
 // Native C library work does not fetch Lua opcodes. An optional host-work
 // guard is separate from Lua's hook counter and disabled by default.
 tick(){if(++this.hostWorkUnits>this.hostWorkLimit)throw new LuaError('host work limit exceeded');}
 compile(source,name='chunk'){return this.loadReader(source,name,'t');}
 execute(source,name='chunk'){this.bytecodeInstructions=0;return this.call(this.compile(source,name));}
 loadReader(read,name='=(load)',mode='bt') {
  const reader=read instanceof LuaChunkReader?read:new LuaChunkReader(read),observer=this.heap?.allocationObserver?.(),workspace={};observer?.temporary(workspace,['buffer','actvar','gotos','labels']);
  try{const binary=reader.peek()==='\x1b';if(mode!==null&&!mode.includes(binary?'b':'t')){const diagnostics=new LuaParserErrors(this,name,{extra:0});try{const error=new LuaError(diagnostics.format("attempt to load a %s chunk (mode is '%s')",binary?'binary':'text',mode),{adopt:false});error.status=3;throw error;}finally{diagnostics.close();}}
   const result=binary?loadLuaChunk(reader,name,{observer,workspace,vm:this}):compileLuaIncremental(reader,name,{observer,workspace,vm:this,nativeCalls:this.currentThread?.nativeCalls??0});const fn=result.closure;if(fn.upvalues.length)fn.upvalues[0].value=this.globals;return fn;
  }catch(error){if(error instanceof LuaError){error=this.closeError(error);this.heap.shrinkThread(this.currentThread);}throw error;}finally{observer?.release(workspace);}
 }
 loadBinary(bytes,name='binary string') {const {closure}=loadLuaChunk(bytes,name,{observer:this.heap?.allocationObserver?.(),vm:this});if(closure.upvalues.length)closure.upvalues[0].value=this.globals;this.heap?.register(closure,'closure');return closure;}
 dumpBinary(fn,options={}) {if(!fn?.luaBytecode)throw new LuaError('unable to dump given function');return dumpLuaChunk(fn,options);}
 closure(prototype,upvalues) {const fn={luaClosure:true,luaBytecode:true,prototype,upvalues};this.heap?.register(fn,'closure');this.heap?.adopt(fn);return fn;}
 executeBinary(bytes,name='binary string') {this.bytecodeInstructions=0;return this.call(this.loadBinary(bytes,name));}
 bytecodeRoots(thread=this.currentThread){
  const roots=[],record=this.heap?.objects.get(thread),metas=[...(record?.frameMeta?.values()??[])],meta=metas.at(-1),explicit=record?.gcTop;
  const cap=explicit!==undefined&&(record.gcTopFrame===meta||record.gcTopFrame===undefined)?explicit:meta?.kind==='C'?meta.argumentTop:meta?.top;
  for(const frame of this.bytecodeFrames.get(thread)??[]){
   roots.push(frame.fn);for(const cell of frame.open.values())roots.push(cell);const position=metas.indexOf(frame.native),next=position>=0?metas[position+1]:null;
   const top=Math.min(cap??Infinity,next?.func??Infinity),limit=Math.min(frame.gcLimit??frame.registers.length,top===Infinity?Infinity:Math.max(0,top-frame.native.base));
   for(let n=0;n<limit;n++)roots.push(frame.registers[n]);for(const value of frame.varargs)roots.push(value);
  }return roots;
 }
 *callG(fn,args=[],stack=null) {
  if(fn?.luaBytecode)return yield* this.bytecodeCallG(fn,args,stack);
  // C/host callbacks need real debug frames as well. AST execution retains its
  // own frame integration; it is never counted as fetched Lua bytecode here.
  if(typeof fn==='function'||fn?.luaYieldable){
   const thread=this.currentThread,frame=this.bytecodeDebug.frameEnter(thread,{fn,args,what:'C',...this.callName(thread)});let result,error=true;this.bytecodeHostThreads.push(thread);
   const nativeFunc=stack?.func??this.heap?.getStackTop(thread)??1,argumentTop=stack?.checkTop??stack?.argumentTop??nativeFunc+1+args.length,metadata={func:nativeFunc,argumentTop,top:argumentTop+20,checkTop:argumentTop,checkExtra:20,kind:'C'};const heap=this.heap;const roots={fn,get args(){const info=heap?.objects.get(thread),metas=[...(info?.frameMeta?.values()??[])],position=metas.indexOf(metadata),next=position>=0?metas[position+1]:null,current=metas.at(-1),explicit=info?.gcTop,cap=explicit!==undefined&&(info.gcTopFrame===current||info.gcTopFrame===undefined)?explicit:current?.kind==='C'?current.argumentTop:current?.top,top=Math.min(cap??Infinity,next?.func??Infinity),values=metadata.values??args;return values.slice(0,Math.max(0,top-metadata.func-1));}};thread.gcRoots?.add(roots);
   thread.callDepth++;
   try{
    this.heap?.adopt(fn);this.heap?.enterFrame(thread,roots,args.length+20,metadata);
    result=fn?.luaYieldableArray?yield* fn.luaYieldableArray(args):fn?.luaYieldable?yield* fn.luaYieldable(...args):fn.luaInvoke?fn.luaInvoke(args):fn(...args);
    if(!Array.isArray(result))throw new TypeError('Lua host callback must return an array of Lua values');
    const originalResults=result;result=luaValues();roots.sourceResults=originalResults;roots.results=result;const resultTop=metadata.argumentTop;if(!fn.luaResultStackManaged)this.heap?.checkStack(thread,resultTop,originalResults.length);metadata.top=Math.max(metadata.top,resultTop+originalResults.length);for(const value of originalResults)result.push(this.heap?.adopt(value??null)??value??null);for(const value of result){if(value instanceof LuaThread&&!this.bytecodeDebug.threads.has(value))this.bytecodeDebug.inheritThread(value,thread);}error=false;return result;
   }
   catch(e){this.bytecodeErrorSerial++;e=this.dispatchError(e);this.bytecodeDebug.captureError(thread,e);throw e;}
   finally{this.heap?.leaveFrame(thread,roots);thread.callDepth--;thread.gcRoots?.delete(roots);this.bytecodeHostThreads.pop();this.bytecodeDebug.frameLeave(thread,frame,result?.length??0,{error});if(!error)this.writeStackSlots(nativeFunc,result,thread);}
  }
  return yield* super.callG(fn,args);
 }
 *closeBytecodeG(frame,from,error=null){
  for(const [index,cell]of frame.open)if(index>=from){cell.close();frame.open.delete(index);}
  for(let n=frame.tbc.length-1;n>=0;n--){const index=frame.tbc[n];if(index<from)continue;frame.tbc.splice(n,1);const value=frame.registers[index]??null;if(!truth(value))continue;const close=this.metamethod(value,'__close');if(close===null)throw new LuaError(`variable '(C temporary)' got a non-closable value`);try{yield* this.callG(close,[value,error instanceof LuaError?error.value:error]);}catch(e){error=e;}}
  if(error!==null)throw error;
 }
 *bytecodeCallG(initialFn,initialArgs,initialStack=null){
  const thread=this.currentThread,debug=this.bytecodeDebug;let fn=initialFn,args=initialArgs,entryStack=initialStack,debugFrame=null,state=null,result=null,error=true,tail=false;
  if(!debug.threads.has(thread))debug.inheritThread(thread,this.bytecodeHostThreads.at(-1)??this.mainThread);
  let frames=this.bytecodeFrames.get(thread);if(!frames){frames=[];this.bytecodeFrames.set(thread,frames);}
  thread.callDepth++;
  try{
   outer:while(true){
    const p=fn.prototype;
    const func=entryStack?.func??this.heap?.getStackTop(thread)??1,argumentTop=entryStack?.checkTop??entryStack?.argumentTop??func+1+args.length,native={func,base:func+1,originalFunc:func,actualArgs:Math.max(args.length,p.numparams),top:func+1+p.maxstacksize,argumentTop,checkTop:argumentTop,checkExtra:entryStack?.checkExtra??p.maxstacksize,kind:'Lua',tail:Boolean(entryStack?.tail)};
    // Lua reuses the real thread stack. In particular, a NEWTABLE allocation
    // can collect before it overwrites a temporary left by an earlier call.
    let physical=this.bytecodeStacks.get(thread);if(!physical){physical=new Map();this.bytecodeStacks.set(thread,physical);}
    physical.set(func,{value:fn});for(let n=0;n<Math.max(args.length,p.numparams);n++)physical.set(func+1+n,{value:args[n]??null});
    const heap=this.heap,index=key=>typeof key==='string'&&/^(0|[1-9][0-9]*)$/.test(key)?Number(key):null;
    const R=new Proxy(Array(p.maxstacksize).fill(null),{get(target,key,receiver){if(key==='slice')return(start=0,end=target.length)=>{const values=luaValues(),length=target.length;start=start<0?Math.max(0,length+start):Math.min(start,length);end=end<0?Math.max(0,length+end):Math.min(end,length);for(let n=start;n<end;n++)values.push(receiver[n]);return values;};const n=index(key);if(n===null)return Reflect.get(target,key,receiver);const value=physical.get(native.base+n)?.value??null;if(value?.luaFreed||heap?.collectable(value)&&!heap.records.has(value)||isLuaString(value)&&!heap.records.has(value))return null;return value;},set(target,key,value,receiver){const n=index(key);if(n!==null)physical.set(native.base+n,{value});return Reflect.set(target,key,value,receiver);}});
    state={fn,native,registers:R,varargs:p.is_vararg?args.slice(p.numparams):[],open:new Map(),tbc:[],top:p.numparams};frames.push(state);this.heap?.enterFrame(thread,state,p.maxstacksize+state.varargs.length,native);native.argumentTop=func+1+native.actualArgs;
    const details={prototype:p,fn,args,registers:R,state,what:p.linedefined===0?'main':'Lua',source:p.source,deferCallHook:true,...this.callName(thread)};
    debugFrame=tail?debug.frameTailcall(thread,debugFrame,details):debug.frameEnter(thread,details);
    if(!p.is_vararg){debugFrame.pc=0;debugFrame.currentline=luaFunctionLine(p,0);debug.callHook(thread,tail);}
    let pc=0;
    const reg=n=>R[n]??null,constant=n=>{if(n>=p.constants.length)throw new LuaError('invalid bytecode constant index');return p.constants[n];};
    const extra=()=>{const word=p.code[pc++];if((word&127)!==O.EXTRAARG)throw new LuaError('missing bytecode EXTRAARG');return word>>>7;};
    const condition=(value,k)=>{if(Number(Boolean(value))!==k)pc++;else{const jump=decodeLuaInstruction(p.code[pc++]);if(jump.op!==O.JMP)throw new LuaError('missing bytecode conditional jump');pc+=jump.sJ;}};
    const tbc=index=>{const value=reg(index);if(truth(value)){if(this.metamethod(value,'__close')===null)throw new LuaError(`variable '${p.locvars?.find(l=>l.startpc<=pc&&l.endpc>pc)?.varname??'(C temporary)'}' got a non-closable value`);state.tbc.push(index);}};
    while(pc<p.code.length){
     if(pc<0)throw new LuaError('invalid bytecode jump');
     const at=pc,word=p.code[pc++],i=decodeLuaInstruction(word),{op,A,B,C,k,Bx,sBx,sB,sC}=i;
     debugFrame.pc=at;debugFrame.currentline=luaFunctionLine(p,at);
     // Native Lua does not trace the initial VARARGPREP; hooks become active
     // after it adjusts the frame and emits the deferred call event.
     if(op!==O.VARARGPREP){debug.opcode(thread,at);if(++this.bytecodeInstructions>this.bytecodeInstructionLimit)throw new LuaError('instruction limit exceeded');}
     if(op===O.MOVE)R[A]=reg(B);
     else if(op===O.LOADI)R[A]=BigInt(sBx);
     else if(op===O.LOADF)R[A]=sBx;
     else if(op===O.LOADK)R[A]=constant(Bx);
     else if(op===O.LOADKX)R[A]=constant(extra());
     else if(op===O.LOADFALSE)R[A]=false;
     else if(op===O.LFALSESKIP){R[A]=false;pc++;}
     else if(op===O.LOADTRUE)R[A]=true;
     else if(op===O.LOADNIL)for(let n=A;n<=A+B;n++)R[n]=null;
     else if(op===O.GETUPVAL)R[A]=fn.upvalues[B]?.value??null;
     else if(op===O.SETUPVAL){if(!fn.upvalues[B])throw new LuaError('invalid bytecode upvalue');fn.upvalues[B].value=reg(A);this.heap?.barrierForward(fn.upvalues[B],reg(A));}
     else if(op===O.GETTABUP)R[A]=(yield* this.getG(fn.upvalues[B]?.value??null,constant(C)));
     else if(op===O.GETTABLE)R[A]=(yield* this.getG(reg(B),reg(C)));
     else if(op===O.GETI)R[A]=(yield* this.getG(reg(B),BigInt(C)));
     else if(op===O.GETFIELD)R[A]=(yield* this.getG(reg(B),constant(C)));
     else if(op===O.SETTABUP)(yield* this.setG(fn.upvalues[A]?.value??null,constant(B),k?constant(C):reg(C)));
     else if(op===O.SETTABLE)(yield* this.setG(reg(A),reg(B),k?constant(C):reg(C)));
     else if(op===O.SETI)(yield* this.setG(reg(A),BigInt(B),k?constant(C):reg(C)));
     else if(op===O.SETFIELD)(yield* this.setG(reg(A),constant(B),k?constant(C):reg(C)));
     else if(op===O.NEWTABLE){const high=extra(),arraySize=C+(k?high*256:0),hashSize=B?2**(B-1):0;state.gcLimit=A+1;try{this.heap.withStackTop(state.native.base+A+1,()=>{R[A]=new LuaTable();if(arraySize||hashSize)R[A].resize(arraySize,hashSize);},thread);}finally{delete state.gcLimit;}}
     else if(op===O.SELF){R[A+1]=reg(B);R[A]=(yield* this.getG(reg(B),k?constant(C):reg(C)));}
     else if(op>=O.ADDI&&op<=O.SHR){
      let left=reg(B),right,operation;
      if(op===O.ADDI){right=BigInt(sC);operation='+';}
      else if(op>=O.ADDK&&op<=O.BXORK){right=constant(C);operation=arithNames[op-O.ADDK];}
      else if(op===O.SHRI){right=BigInt(sC);operation='>>';}
      else if(op===O.SHLI){right=left;left=BigInt(sC);operation='<<';}
      else{right=reg(C);operation=arithNames[op-O.ADD];}
      const bit=['&','|','~','<<','>>'].includes(operation),valid=numeric(left)&&numeric(right)&&(!bit||(toInteger(left)!==null&&toInteger(right)!==null));
      if(valid){R[A]=arithmetic(operation,left,right);pc++;}
     }
     else if(op===O.MMBIN||op===O.MMBINI||op===O.MMBINK){
      const previous=decodeLuaInstruction(p.code[at-1]);let left=reg(A),right=op===O.MMBIN?reg(B):op===O.MMBINI?BigInt(sB):constant(B);if(k&&op!==O.MMBIN)[left,right]=[right,left];
      const operation=tmops[C];if(!operation)throw new LuaError('invalid bytecode arithmetic metamethod');R[previous.A]=(yield* this.binaryG(operation,left,right));
     }
     else if(op===O.UNM)R[A]=(yield* this.unaryG('-',reg(B)));
     else if(op===O.BNOT)R[A]=(yield* this.unaryG('~',reg(B)));
     else if(op===O.NOT)R[A]=!truth(reg(B));
     else if(op===O.LEN)R[A]=(yield* this.lengthG(reg(B)));
     else if(op===O.CONCAT){
      const info=this.heap.objects.get(thread),previousTop=info.gcTop,previousFrame=info.gcTopFrame;let top=A+B,total=B;info.gcTopFrame=state.native;info.gcTop=state.native.base+top;state.gcLimit=top;try{const convert=index=>{const value=reg(index);if(isLuaString(value))return true;if(numeric(value)){R[index]=this.heap.adopt(numberToString(value));return true;}return false;};
      while(total>1){let count=2;const left=reg(top-2);
       if(!(isLuaString(left)||numeric(left))||!convert(top-1))R[top-2]=this.heap.adopt((yield* this.binaryG('..',left,reg(top-1))));
       else if(reg(top-1).length===0){convert(top-2);}
       else if(isLuaString(left)&&left.length===0)R[top-2]=reg(top-1);
       else{convert(top-2);while(count<total&&convert(top-count-1))count++;const parts=[];for(let n=top-count;n<top;n++)parts.push(luaStringBytes(reg(n)));R[top-count]=this.heap.adopt(parts.join(''));}
       top-=count-1;total-=count-1;info.gcTop=state.native.base+top;state.gcLimit=top;
      }R[A]=reg(A);state.top=A+1;}finally{info.gcTop=previousTop;info.gcTopFrame=previousFrame;delete state.gcLimit;}
     }
     else if(op===O.CLOSE)(yield* this.closeBytecodeG(state,A));
     else if(op===O.TBC)tbc(A);
     else if(op===O.JMP)pc+=i.sJ;
     else if(op===O.EQ||op===O.LT||op===O.LE)condition((yield* this.binaryG(op===O.EQ?'==':op===O.LT?'<':'<=',reg(A),reg(B))),k);
     else if(op===O.EQK)condition(rawEqual(reg(A),constant(B)),k);
     else if(op>=O.EQI&&op<=O.GEI){const operation=['==','<','<=','>','>='][op-O.EQI];condition((yield* this.binaryG(operation,reg(A),C?sB:BigInt(sB))),k);}
     else if(op===O.TEST)condition(truth(reg(A)),k);
     else if(op===O.TESTSET){if(Number(!truth(reg(B)))===k)pc++;else{R[A]=reg(B);const jump=decodeLuaInstruction(p.code[pc++]);pc+=jump.sJ;}}
     else if(op===O.CALL){debugFrame.callBase=A;const callArgs=R.slice(A+1,B?A+B:state.top),func=state.native.base+A;const values=(yield* this.callG(reg(A),callArgs,{func,checkTop:func+1+callArgs.length}));delete debugFrame.callBase;const count=C?C-1:values.length;for(let n=0;n<count;n++)R[A+n]=values[n]??null;state.top=C?p.maxstacksize:A+count;}
     else if(op===O.TAILCALL){
      const next=reg(A),nextArgs=R.slice(A+1,B?A+B:state.top);yield* this.closeBytecodeG(state,0);
      if(next?.luaBytecode){frames.pop();this.heap?.leaveFrame(thread,state);const previous=state.native;state=null;fn=next;args=nextArgs;entryStack={func:previous.originalFunc,checkTop:previous.base+A+1+nextArgs.length,checkExtra:next.prototype.maxstacksize-(previous.func-previous.originalFunc),tail:true};tail=true;continue outer;}
      // A yielded C tail call resumes through the following RETURN opcode in
      // Lua5.4 (ldo.c unroll), which is a real counted dispatch on resumption.
      const serial=this.bytecodeErrorSerial,generator=this.callG(next,nextArgs,{func:state.native.base+A,checkTop:state.native.base+A+1+nextArgs.length});let step=generator.next(),suspended=false;
      while(!step.done){suspended=true;const resume=yield step.value;step=generator.next(resume);}
      if(suspended||(!thread.main&&serial!==this.bytecodeErrorSerial)){for(let n=0;n<step.value.length;n++)R[A+n]=step.value[n];state.top=A+step.value.length;continue;}
      result=step.value;error=false;return result;
     }
     else if(op===O.RETURN||op===O.RETURN0||op===O.RETURN1){
      result=op===O.RETURN0?luaValues():op===O.RETURN1?luaValues(reg(A)):R.slice(A,B?A+B-1:state.top);yield* this.closeBytecodeG(state,0);error=false;return result;
     }
     else if(op===O.FORPREP){
      let start=reg(A),limit=reg(A+1),step=reg(A+2);
      if(typeof start==='bigint'&&typeof step==='bigint'){
       if(!step)throw new LuaError("'for' step is zero");const number=toNumber(limit);if(number===null)throw new LuaError("bad 'for' limit (number expected)");
       if(typeof number==='bigint')limit=number;else{const rounded=step<0n?Math.ceil(number):Math.floor(number);if(Number.isNaN(rounded)||(rounded>Number(MAXINTEGER)&&step<0n)||(rounded<Number(MININTEGER)&&step>0n)){pc+=Bx+1;continue;}limit=rounded>=2**63?MAXINTEGER:rounded<-(2**63)?MININTEGER:BigInt(rounded);}
       R[A+3]=start;if(step>0n?start>limit:start<limit){pc+=Bx+1;continue;}R[A+1]=BigInt.asIntN(64,step>0n?(limit-start)/step:(start-limit)/(-step));
      }else{
       const lim=toNumber(limit),inc=toNumber(step),init=toNumber(start);if(lim===null||inc===null||init===null)throw new LuaError("bad 'for' value (number expected)");
       start=Number(init);limit=Number(lim);step=Number(inc);if(step===0)throw new LuaError("'for' step is zero");if(step>0?limit<start:start<limit){pc+=Bx+1;continue;}R[A]=start;R[A+1]=limit;R[A+2]=step;R[A+3]=start;
      }
     }
     else if(op===O.FORLOOP){const step=reg(A+2);if(typeof step==='bigint'){const count=BigInt.asUintN(64,reg(A+1));if(count>0n){R[A+1]=BigInt.asIntN(64,count-1n);R[A]=BigInt.asIntN(64,reg(A)+step);R[A+3]=reg(A);pc-=Bx;}}else{const next=reg(A)+step;if(step>0?next<=reg(A+1):reg(A+1)<=next){R[A]=next;R[A+3]=next;pc-=Bx;}}}
     else if(op===O.TFORPREP||op===O.TFORCALL){
      let call=i;if(op===O.TFORPREP){tbc(A+3);pc+=Bx;call=decodeLuaInstruction(p.code[pc++]);if(call.op!==O.TFORCALL)throw new LuaError('invalid generic for call');}
      debugFrame.pc=pc-1;debugFrame.currentline=luaFunctionLine(p,pc-1);debugFrame.callBase=A+4;const values=(yield* this.callG(reg(A),[reg(A+1),reg(A+2)],{func:state.native.base+A+4,checkTop:state.native.base+A+7}));delete debugFrame.callBase;for(let n=0;n<call.C;n++)R[A+4+n]=values[n]??null;
      const loop=decodeLuaInstruction(p.code[pc++]);if(loop.op!==O.TFORLOOP)throw new LuaError('invalid generic for loop');if(reg(A+4)!==null){R[A+2]=reg(A+4);pc-=loop.Bx;}
     }
     else if(op===O.TFORLOOP){if(reg(A+4)!==null){R[A+2]=reg(A+4);pc-=Bx;}}
     else if(op===O.SETLIST){let base=C;if(k)base+=extra()*256;const count=B||state.top-A-1;const table=reg(A);if(!(table instanceof LuaTable))throw new LuaError('invalid bytecode SETLIST target');if(base+count>table.arraySize)table.resizeArray(base+count);for(let n=1;n<=count;n++)table.rawset(BigInt(base+n),reg(A+n));}
     else if(op===O.CLOSURE){const child=p.protos[Bx];if(!child)throw new LuaError('invalid bytecode prototype');const captures=child.upvalues.map(u=>{if(!u.instack)return fn.upvalues[u.idx];if(!state.open.has(u.idx))state.open.set(u.idx,upvalue(R,u.idx,this.heap));return state.open.get(u.idx);});R[A]=this.closure(child,captures);}
     else if(op===O.VARARG){const count=C?C-1:state.varargs.length;if(!C)this.heap?.checkStack(thread,state.native.top,count);for(let n=0;n<count;n++)R[A+n]=state.varargs[n]??null;if(!C)state.top=A+count;}
     else if(op===O.VARARGPREP){this.heap?.checkStack(thread,state.native.argumentTop,p.maxstacksize+1,{gc:false});const delta=state.native.actualArgs+1,fixed=R.slice(0,p.numparams);for(let n=0;n<p.numparams;n++)R[n]=null;state.native.func+=delta;state.native.base+=delta;state.native.top+=delta;physical.set(state.native.func,{value:fn});for(let n=0;n<fixed.length;n++)R[n]=fixed[n];debugFrame.pc=at;debugFrame.currentline=luaFunctionLine(p,at);debug.callHook(thread,tail);}
     else throw new LuaError(`invalid or unexpected Lua opcode ${op}`);
     R[A]=this.heap?.adopt(R[A])??R[A];
     if(op===O.NEWTABLE||op===O.CONCAT||op===O.CLOSURE){state.gcLimit=A+1;try{this.heap?.withStackTop(state.native.base+A+1,()=>this.heap.checkpoint(),thread);}finally{delete state.gcLimit;}}
    }
    throw new LuaError('Lua bytecode function fell off end');
   }
  }catch(e){
   e=this.dispatchError(e);debug.captureError(thread,e);
   if(e instanceof LuaError&&!e.luaGcRoots)e.luaGcRoots=frames.map(f=>({fn:f.fn,values:f.registers.concat(f.varargs)}));
   if(state){
    if(e instanceof LuaError){e.luaPendingClose??=[];e.luaPendingClose.push(state.tbc.map(index=>state.registers[index]??null));state.tbc=[];for(const cell of state.open.values())cell.close();state.open.clear();}
    else{try{yield* this.closeBytecodeG(state,0,e);}catch(closed){throw closed;}}
   }throw e;
  }
  finally{
   if(state&&state.tbc.length)yield* this.closeBytecodeG(state,0);
   if(state&&frames.at(-1)===state){frames.pop();this.heap?.leaveFrame(thread,state);}if(!frames.length)this.bytecodeFrames.delete(thread);
   if(debugFrame)debug.frameLeave(thread,debugFrame,result?.length??0,{error});if(!error&&state)this.writeStackSlots(state.native.originalFunc,result,thread);thread.callDepth--;
  }
 }
}
export function createLuaBytecodeVM(options={}){const vm=new LuaBytecodeVM(options);if(options.libraries===false)return vm;openBase(vm,options);openTable(vm);openMath(vm,options.seed??0n);openString(vm);openUtf8(vm);openCoroutine(vm);return vm;}
