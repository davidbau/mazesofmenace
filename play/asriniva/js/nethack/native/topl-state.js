// One live TOPL model per game. Scalar state and window/history indices are
// direct native fields; actual message bytes retain their terminal/save ABI.
import abi from '../terminal-messages-abi.json' with {type:'json'};
export function createNativeToplState(environment,layouts,services,owner){
 const {transport:t,ctypes}=environment,arena=owner.nativeArena,views=owner.nativeRecords,L=layouts.topl;
 if(L.pointerSize!==8)throw Error('Review TOPL pointer ABI');
 const roots={};for(const[name,type]of Object.entries({iflags:'instance_flags',windowprocs:'window_procs',program_state:'sinfo',flags:'flag',gs:'instance_globals_s'}))roots[name]=views.record('struct '+type,environment.requireGlobal(name));
 const addresses=Object.fromEntries(Object.keys(abi.globals).map(name=>[name,environment.requireGlobal(name)])),windows=new Map();
 function slots(at,count,kind){const out=Array(count);Object.defineProperty(out,'address',{value:at});for(let i=0;i<count;i++)Object.defineProperty(out,i,{enumerable:true,get:kind==='pointer'?()=>arena.pointer(at+i*8):()=>arena.Int16[(at+i*2)/2],set:kind==='pointer'?v=>arena.storePointer(at+i*8,v):v=>{arena.Int16[(at+i*2)/2]=t.short(v);}});return out;}
 function window(at){if(!at)return 0;if(windows.has(at))return windows.get(at);const native=views.record('struct WinDesc',at),out={address:at};
  for(const name of ['maxcol','maxrow','rows','flags','curx','cury'])Object.defineProperty(out,name,{enumerable:true,get:()=>native[name],set:v=>{native[name]=v;}});
  for(const[name,kind]of [['data','pointer'],['datlen','short']]){let previous,count,values;Object.defineProperty(out,name,{enumerable:true,get(){const p=native[name],n=Number(native.rows);if(p!==previous||n!==count){values=p?slots(p,n,kind):0;previous=p;count=n;}return values;}});}
  windows.set(at,out);return out;
 }
 const wins=Array(ctypes.size(abi.globals.wins)/L.pointerSize);for(let i=0;i<wins.length;i++)Object.defineProperty(wins,i,{enumerable:true,get:()=>window(arena.pointer(addresses.wins+i*8))});
 const gt=views.record('struct instance_globals_t',addresses.gt),toplines=addresses.gt+ctypes.record('struct instance_globals_t').fields.toplines.offset;
 const snapshots=new WeakSet(),env=Object.assign({},L,roots,{wins,gt:{toplines,tc_gbl_data:gt.tc_gbl_data},snapshot_mesgs:0,nxtidx:0,initd:0,
  text:value=>typeof value==='string'?services.literal(value):environment.address(value),
  int:t.int,uint:t.uint,char:t.char,short:t.short,boolean:t.char,long:t.long,uchar:t.uchar,
  nativeMessageSnapshot(count){if(!Number.isSafeInteger(count)||count<1)throw RangeError('TOPL snapshot extent');const value=Array(count).fill(0);snapshots.add(value);return value;},
  free:value=>{if(!value||snapshots.has(value))return;return services.free(value);},
  byte(value){const at=typeof value==='string'?services.literal(value):environment.address(value);return {get value(){return arena.Int8[at];},set value(v){arena.Int8[at]=t.char(v);}};},
  C:c=>0x1f&c,SIZE:a=>a.length,min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,abs:Math.abs,
  callLocal:(fn,...args)=>fn(...args),toplAssert:(expression,line,ok)=>{if(!ok)services.nhassert_failed(expression,'../win/tty/topl.c',line);},
 });
 for(const[name,kind,narrow]of [['WIN_MESSAGE','Int32',t.int],['BASE_WINDOW','Int32',t.int],['morc','Int8',t.char],['yn_number','BigInt64',t.long],['erase_char','Int8',t.char]]){const cell=arena.scalar(kind,addresses[name]);Object.defineProperty(env,name,{enumerable:true,get:cell.get,set:v=>cell.set(narrow(v))});}
 for(const name of ['defmorestr','quitchars'])env[name]=addresses[name];
 let displayAt,display;Object.defineProperty(env,'ttyDisplay',{get(){const at=arena.pointer(addresses.ttyDisplay);if(at!==displayAt){display=views.record('struct DisplayDesc',at);displayAt=at;}return display;}});
 let nextIndex=0,initialized=0;Object.defineProperties(env,{nxtidx:{get:()=>nextIndex,set:v=>{nextIndex=t.int(v);}},initd:{get:()=>initialized,set:v=>{initialized=t.char(v);}}});
 Object.defineProperty(env,'CO',{get:()=>gt.tc_gbl_data.tc_CO});
 const LONG_MAX=9223372036854775807n;env.AppendLongDigit=(value,digit)=>(value<LONG_MAX/10n||(value===LONG_MAX/10n&&digit<=LONG_MAX%10n))?t.long(value*10n+digit):-1n;
 Object.setPrototypeOf(env,services);return env;
}
