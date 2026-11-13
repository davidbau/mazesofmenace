import {enableUnixTerminal} from './unix-terminal.js';
// Existing window/tty adapters on JS-owned storage and canonical C callbacks.
import records from './records.json' with {type:'json'};
import {createCTypes} from './c-types.js';
import abi from './window-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as tty from '../ported/wintty.js';
import {initializeWintty,callWintty} from './bindings/wintty.js';
import * as windows from '../ported/windows.js';
import {initializeWindows,callWindows} from './bindings/windows.js';
export function enableWindowSystem(environment,layouts){
 const {services,memory,functions}=environment,ctypes=createCTypes(memory,{...records,records:{...records.records,...abi.records},enums:{...records.enums,...abi.enums}},environment.bitfields),W=abi.windows,T=abi.wintty,schema=T.schema,L=layouts.wintty;
 const address=environment.address,text=p=>typeof p==='string'?services.literal(p):address(p);
 const canonical=t=>{t=t.replace(/\b(const|volatile)\b/g,'').replace(/\s+/g,' ').trim();const seen=new Set();while(schema.aliases[t]&&!seen.has(t)){seen.add(t);t=schema.aliases[t];}return t;};
 function size(t){t=canonical(t);const array=t.includes('(*)')?null:t.match(/^(.*?)\[(\d+)\](.*)$/);if(array)return Number(array[2])*size(array[1]+array[3]);if(t.includes('*'))return 8;const primitive={char:1,'signed char':1,'unsigned char':1,short:2,'unsigned short':2,int:4,'unsigned int':4,long:8,'unsigned long':8,'long long':8,'unsigned long long':8};const n=primitive[t]??L[schema.sizeof[t]??t.replace(/\W+/g,'_').replace(/^_|_$/g,'')+'_size'];if(n===undefined)throw new Error('Unmeasured window storage '+t);return Number(n);}
 const shared=(name,type)=>{try{return environment.requireGlobal(name);}catch(error){if(!error.message.startsWith('Unresolved standalone global '))throw error;}return environment.allocateGlobal(name,size(type));};
 for(const name of ['stdin','stdout','stderr']){const p=shared(name,'void *');ctypes.store('void *',p,services[name]);}
 for(const [name,type]of Object.entries({...T.zeroStorage,...T.dataTypes}))shared(name,type);
 const nullGlyph=environment.requireGlobal('display.nul_glyphinfo');try{environment.requireGlobal('nul_glyphinfo');}catch(error){if(!error.message.startsWith('Unresolved standalone global '))throw error;environment.linkGlobal('nul_glyphinfo',nullGlyph);}
 if(typeof services.tgetent!=='function')environment.enableDependencies();
 const terminal=Object.hasOwn(environment.status(),'termcap')?null:environment.enableTerminal(layouts.termcap);
 const proxy=()=>new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const t=proxy(),w=proxy();for(const root of ['windowprocs','cg','gs','hexdd','def_monsyms','def_oc_syms',...W.globalfields.map(path=>path.split('.')[0])])Object.defineProperty(w,root,{value:undefined,writable:true,configurable:true});
 // The native WINDOWS service materializes text operands before libc calls.
 // Keep its MEMORY64 strlen result rather than inheriting the host Number.
 for(const name of ['strlen','strcpy','strcat','strcmp','strncmp','strncpy','strchr','strrchr','strstr','puts','fputs'])if(typeof services[name]==='function')w[name]=(...args)=>{const count=['strncmp','strncpy','strcpy','strcat','strcmp','strstr'].includes(name)?2:1;const value=services[name](...args.map((v,i)=>i<count?text(v):v?.address??v));return name==='strlen'?environment.transport.ulong(value):value;};
 const code=type=>{type=ctypes.canonical(type);return type.includes('*')?'p':type==='void'?'v':/\b(float|double)\b/.test(type)?'d':size(type)===8?'j':'i';};
 const signature=row=>[row.result,...row.parameters].map(code).join('');
 function prototype(type){const match=type.match(/^(.+?)\s*\(\s*\*\s*\)\s*\((.*)\)$/)??type.match(/^(.+?)\s*\((.*)\)$/);if(!match)throw new Error('Unknown window callback ABI '+type);return{result:match[1].trim(),parameters:match[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};}
 const normalize=(type,value)=>code(type)==='p'?(typeof value==='string'?services.literal(value):address(value)):type==='void'?undefined:code(type)==='j'?BigInt(value):Number(value);
 function callback(module,name){const own=abi.callbacks[module][name],row=own??prototype(publicFunctions.functions[name]??'');return environment.functionPointer(own&&!Object.hasOwn(publicFunctions.functions,name)?module+'::'+name:name,signature(row),own?((...args)=>normalize(row.result,module==='wintty'?callWintty(t,L,name,...args):callWindows(w,layouts.windows,name,...args))):undefined);}
 const statics=new Map();Object.assign(t,{moduleKey:environment,global:i=>{const name=Object.keys(schema.globals)[i];if(!name)throw new Error('Unknown WINTTY global '+i);return environment.requireGlobal(name);},
  staticStorage:name=>{const count={'tty_askname.who_are_you':14,'compress_str.cbuf':L.BUFSZ}[name];if(!count)throw new Error('Unknown WINTTY static '+name);if(!statics.has(name))statics.set(name,environment.allocateGlobal('wintty.'+name,count));return statics.get(name);},
  callbackPointer:name=>callback('wintty',name),teleport_native_signal:(sig,fn)=>platform.signal(sig,fn),callIndirect:(fn,type,...args)=>functions.indirect(fn,signature(prototype(type)),...args),
  alloc:n=>environment.alloc('alloc',n),free:p=>services.free(address(p)),memset:(p,v,n)=>services.memset(address(p),v,n),memcpy:(a,b,n)=>services.memcpy(address(a),address(b),n),
 });
 for(const name of ['strlen','strcpy','strcat','strcmp','strncmp','strncpy','strchr','strrchr','strstr','puts','fputs'])if(typeof services[name]==='function')t[name]=(...args)=>{const count=['strncmp','strncpy','strcpy','strcat','strcmp','strstr'].includes(name)?2:1;return services[name](...args.map((v,i)=>i<count?text(v):v));};
 t.strlen=p=>BigInt(services.strlen(text(p)));
 initializeWintty(t,L);
 const ttyNames=Object.keys(abi.callbacks.wintty).filter(name=>Object.hasOwn(publicFunctions.functions,name)&&typeof tty[name]==='function'&&!environment.hasFunction(name));
 environment.register('wintty',Object.fromEntries(ttyNames.map(name=>[name,(...args)=>callWintty(t,L,name,...args)])));
 const kinds=Object.keys(W.fields),types={procs:'struct window_procs',choice:'struct win_choices',glyph:'struct glyphinfo',any:'union any',menu:'struct mi',request:'struct win_request_info_t',style:'color_attr',cmdq:'struct _cmd_queue',menucolor:'struct menucoloring',class:'struct class_sym'};
 function locate(type,at,path){for(const key of path.split('.')){const extra=abi.records[type.replace(/^struct /,'')],entry=extra?{definition:{type:type.replace(/^struct /,'')},field:extra.fields[key],at:at+extra.fields[key].offset}:ctypes.locate(type,at,key);at=entry.at;type=entry.field.record??entry.field.ctype.replace(new RegExp('\\s+'+key+'$'),'');if(key===path.split('.').at(-1))return {...entry,type};}throw new Error('Invalid window field');}

 const globals=W.globalfields.map(path=>{const [root,...fields]=path.split('.');const type={iflags:'struct instance_flags',program_state:'struct sinfo',gb:'struct instance_globals_b',go:'struct instance_globals_o',flags:'struct flag',gl:'struct instance_globals_l',gm:'struct instance_globals_m',svc:'struct instance_globals_saved_c',WIN_STATUS:'int'}[root];return{root,type,path:fields.join('.').replace(/^use_color$/,'wc_color')};});
 const storage=[environment.requireGlobal('windowprocs'),environment.allocateGlobal('windows.winchoices',windows.winchoices.length*layouts.windows.choiceSize),environment.allocateGlobal('windows.hup_procs',layouts.windows.procsSize),environment.allocateGlobal('windows.dumplog_backup',layouts.windows.procsSize),environment.requireGlobal('zerowri'),environment.allocateGlobal('windows.encbuf',20),shared('status_fieldnm','char *['+layouts.windows.MAXBLSTATS+']'),shared('status_fieldfmt','char *['+layouts.windows.MAXBLSTATS+']'),shared('status_vals','char *['+layouts.windows.MAXBLSTATS+']'),shared('status_activefields','char['+layouts.windows.MAXBLSTATS+']'),environment.requireGlobal('tty_procs'),nullGlyph,ctypes.locate('struct const_globals',environment.requireGlobal('cg'),'zeroany').at,environment.requireGlobal('def_monsyms'),environment.requireGlobal('def_oc_syms'),environment.requireGlobal('hexdd'),services.stdout,callback('wintty','win_tty_init'),ctypes.locate('struct instance_globals_s',environment.requireGlobal('gs'),'showsyms').at];
 const privateCells=[environment.allocateGlobal('windows.previnterface_exit_nhwindows',8),environment.allocateGlobal('windows.dumplog_file',8)];
 Object.assign(w,{moduleKey:environment,storage:i=>{if(storage[i]===undefined)throw new Error('Unknown WINDOWS storage '+i);return storage[i];},
  privateGet:i=>ctypes.load('long',privateCells[i]),privateSet:(i,v)=>ctypes.store('long',privateCells[i],v),
  functionAddress:i=>callback('windows',W.names[i]),copyProcs:(a,b)=>memory.memmove(address(a),address(b),layouts.windows.procsSize),
  get:(kind,field,p,index)=>{const path=W.fields[kinds[kind]]?.[field];if(!path)throw new Error('Unknown WINDOWS field');const e=locate(types[kinds[kind]],address(p),path),array=e.type.match(/^(.*?)\[(\d+)\]$/);const value=array?ctypes.load(array[1],e.at+Number(index)*ctypes.size(array[1])):e.field.bits!==undefined?environment.bitfields.get(e.definition.type,path.split('.').at(-1),e.at-e.field.offset):ctypes.load(e.type,e.at);return BigInt.asIntN(64,BigInt(value));},
  set:(kind,field,p,index,v)=>{const path=W.fields[kinds[kind]]?.[field];if(!path)throw new Error('Unknown WINDOWS field');const e=locate(types[kinds[kind]],address(p),path),array=e.type.match(/^(.*?)\[(\d+)\]$/);if(array)return ctypes.store(array[1],e.at+Number(index)*ctypes.size(array[1]),v);return e.field.bits!==undefined?ctypes.setField(e.definition.type,e.at-e.field.offset,path.split('.').at(-1),e.type,v):ctypes.store(e.type,e.at,v);},
  global:i=>{const row=globals[i];if(!row)throw new Error('Unknown WINDOWS global '+i);if(!row.path)return BigInt(ctypes.load(row.type,environment.requireGlobal(row.root)));const e=locate(row.type,environment.requireGlobal(row.root),row.path);return BigInt(e.field.bits!==undefined?ctypes.getField(e.definition.type,e.at-e.field.offset,row.path.split('.').at(-1),e.type):ctypes.load(e.type,e.at));},
  setGlobal:(i,v)=>{const row=globals[i];if(!row)throw new Error('Unknown WINDOWS global '+i);if(!row.path)return ctypes.store(row.type,environment.requireGlobal(row.root),v);const e=locate(row.type,environment.requireGlobal(row.root),row.path);return ctypes.setField(e.definition.type,e.at-e.field.offset,row.path.split('.').at(-1),e.type,v);},
  callInit:(fn,dir)=>functions.indirect(fn,'vi',dir),strcmpi:(a,b)=>environment.resolve('strncmpi')(text(a),text(b),-1),
 });
 for(const name of ['formatEncode','formatChar','formatStrings'])w[name]=(out,format,...args)=>services.sprintf(address(out),text(format),...args.map(v=>v?.address??v));
 for(const name of ['fprintfChar','fprintfString'])w[name]=(fp,format,...args)=>services.fprintf(address(fp),text(format),...args.map(v=>v?.address??v));
 w.map_glyphinfo=(x,y,glyph,flags,out)=>environment.resolve('map_glyphinfo')(x,y,glyph,flags,address(out));
 for(const [name,type]of Object.entries(W.callbacks)){const row=prototype(type);w['call_'+name]=(...args)=>{const field=ctypes.record('struct window_procs').fields[name],fn=ctypes.load(field.ctype.replace(new RegExp('\\s+'+name+'$'),''),environment.requireGlobal('windowprocs')+field.offset);return functions.indirect(fn,signature(row),...args.map((v,i)=>normalize(row.parameters[i],v)));};}
 initializeWindows(w,layouts.windows);
 const names=W.names.filter(name=>Object.hasOwn(publicFunctions.functions,name)&&typeof windows[name]==='function'&&!environment.hasFunction(name));
 environment.register('windows',Object.fromEntries(names.map(name=>[name,(...args)=>callWindows(w,layouts.windows,name,...args)])));
 // Shared windows.h macros dispatch through the existing active window owner.
 const headerWindows=Object.fromEntries(['create_nhwindow','destroy_nhwindow','curs','display_nhwindow','putstr','putmixed','start_menu','end_menu','raw_print'].map(name=>{const field='win_'+name;if(!Object.hasOwn(W.callbacks,field)||environment.hasFunction(name))throw Error('Review shared window macro '+name);return[name,(...args)=>w['call_'+field](...args)];}));
 environment.register('window-macros',{...headerWindows,nh_delay_output:()=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_delay_output').at;return functions.indirect(memory.view.getBigUint64(at,true),'v');}});
 const platform=enableUnixTerminal(environment,layouts);
 // Original UNI XTTY error() receives a JS vararg packet on this boundary.
 // Keep native va_list packets on their existing transport path.
 const nativeVaStart=platform.context.va_start,nativeVprintf=platform.context.Vprintf;
 platform.context.va_start=args=>{if(args.some(v=>v&&typeof v==='object'&&Object.hasOwn(v,'nativeVaList')))return nativeVaStart(args);Object.defineProperty(args,'standaloneVarargs',{value:true});};
 platform.context.Vprintf=(format,args)=>args.standaloneVarargs?services.printf(format,...args.map(v=>v?.address??v)):nativeVprintf(format,args);
 return {terminal,platform,tty:t,windows:w,storage,privateCells,limitation:'Window/tty integration in progress; initialization, input/output and recordings require original-C verification.'};
}
