// Shared native field/storage transport for unchanged SYMBOLS policies.
import * as symbols from '../ported/symbols.js';
import {callSymbols} from '../ported/symbols-runtime.js';
import publicFunctions from './public-functions.json' with {type:'json'};
export function enableSymbols(environment,layouts){
 const {services,ctypes,memory,functions,transport}=environment,L=layouts.symbols;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args.map(v=>v?.address??v)):undefined});
 for(const name of ['gs','go','gp','gr','gc','cg','u'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const text=value=>typeof value==='string'?services.literal(value):environment.address(value);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
 const c={p:environment.address,t:text,i:transport.int,u:transport.uint,b:transport.char,j:transport.ulong};
 const calls={alloc:['alloc','u','p'],dupstr:['dupstr','t','p'],free:['free','p','v'],strlen:['strlen','t','n'],strchr:['strchr','ti','p'],strrchr:['strrchr','ti','p'],strcmp:['strcmp','tt','i'],strncmpi:['strncmpi','tti','i'],mungspaces:['mungspaces','p','p'],lowc:['lowc','b','b'],reset_glyphmap:['reset_glyphmap','i','v'],free_all_glyphmap_u:['free_all_glyphmap_u','','v'],purge_custom_entries:['purge_custom_entries','i','v'],clear_all_glyphmap_colors:['clear_all_glyphmap_colors','','v'],match_glyph:['match_glyph','p','i'],sym_val:['sym_val','t','i'],glyphrep_to_custom_map_entries:['glyphrep_to_custom_map_entries','tp','i'],read_sym_file:['read_sym_file','i','i'],apply_customizations:['apply_customizations','ii','v'],strbuf_append:['strbuf_append','pt','v'],add_menu:['add_menu','ippbbiitu','v'],select_menu:['select_menu','iip','i'],glyphid_cache_status:['glyphid_cache_status','','b'],fill_glyphid_cache:['fill_glyphid_cache','','v'],free_glyphid_cache:['free_glyphid_cache','','v']};
 for(const[name,[target,args,ret]]of Object.entries(calls))local[name]=(...values)=>{const value=resolve(target)(...Array.from(args,(kind,i)=>c[kind](values[i])));return ret==='v'?undefined:ret==='n'?Number(value):c[ret](value);};
 local.strcmpi=(a,b)=>transport.int(resolve('strncmpi')(text(a),text(b),-1));
 const windowCall=(field,signature,...args)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),field).at;return functions.indirect(memory.view.getBigUint64(at,true),signature,...args);};
 Object.assign(local,{
  invokeCallback:fn=>functions.indirect(fn,'v'),nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),
  create_nhwindow:k=>windowCall('win_create_nhwindow','ii',transport.int(k)),start_menu:(w,b)=>windowCall('win_start_menu','vij',transport.int(w),transport.ulong(b)),end_menu:(w,s)=>windowCall('win_end_menu','vip',transport.int(w),text(s)),destroy_nhwindow:w=>windowCall('win_destroy_nhwindow','vi',transport.int(w)),preference_update:s=>windowCall('win_preference_update','vp',text(s)),
  config_error_add:s=>resolve('config_error_add')(text('%s'),text(s)),There:(fmt,s)=>resolve('There')(text(fmt),text(s)),pline:(fmt,s)=>resolve('pline')(text(fmt),text(s)),
  Sprintf:(out,fmt,...args)=>{const values=fmt==='%%-%ds %%s'?[transport.int(args[0])]:args.map(text);if(![1,2,3].includes(args.length))throw new Error('Unknown original SYMBOLS Sprintf shape');resolve('sprintf')(environment.address(out),text(fmt),...values);},
  Snprintf:(out,n,fmt,a,b)=>resolve('nh_snprintf')(text('parsesymbols'),836,environment.address(out),transport.ulong(n),text(fmt),text(a),text(b)),
 });
 const globals=['gs','go','gp','gr','gc','cg','u','defsyms','def_oc_syms','def_monsyms','def_warnsyms','def_r_oc_syms'];
 const storage=[environment.allocateGlobal('loadsyms',L.loadsymsCount*L.symparseSize),environment.allocateGlobal('known_handling',L.knownHandlingCount*8),environment.allocateGlobal('known_restrictions',L.knownRestrictionCount*8),environment.allocateGlobal('saved_symbols',8)];
 const bit=(p,i,v)=>{const key=['nocolor','primary','rogue','explicitly'][i];if(!key)throw new Error('Unknown SYMBOLS packed field');return v===undefined?ctypes.getField('struct symsetentry',environment.address(p),key,'unsigned int'):ctypes.setField('struct symsetentry',environment.address(p),key,'unsigned int',v);};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,global:i=>environment.requireGlobal(globals[i]),storage:i=>{if(storage[i]===undefined)throw new Error('Unknown SYMBOLS storage');return storage[i];},bit:(p,i)=>bit(p,i),setBit:bit,callback:i=>ctypes.load('void *',environment.requireGlobal(i?'utf8graphics_mode_callback':'decgraphics_mode_callback')),invoke:fn=>functions.indirect(fn,'v'),fileName:()=>services.literal('symbols'),rogueLevel:()=>ctypes.locate('struct instance_globals_saved_d',environment.requireGlobal('svd'),'dungeon_topology').at+ctypes.record('struct dgn_topology').fields.d_rogue_level.offset,on_level:(a,b)=>environment.resolve('on_level')(environment.address(a),environment.address(b))});
 callSymbols(local,L,'initialize');
 const names=Object.keys(symbols).filter(name=>typeof symbols[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('symbols',Object.fromEntries(names.map(name=>[name,(...args)=>callSymbols(local,L,name,...args)])));
 return {services:local,storage,call:(name,...args)=>callSymbols(local,L,name,...args),limitation:'Symbol/header transport connected; parsing/options/configuration and full display remain under verification.'};
}
