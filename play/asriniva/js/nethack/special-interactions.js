import {nativeSteedFor} from './native/steed-graph.js';
// Optional interaction owners on the shared standalone game state.
// Game decisions remain in the unchanged translated modules.
import {enableUtf8map} from './utf8map.js';
import abi from './special-interactions-abi.json' with {type:'json'};
import {fillholetyp} from '../ported/dig.js';
import {name_ok,call_ok,rndghostname,roguename,ghostnames,bogon_is_pname} from '../ported/do_name.js';
import {nexttodoor} from '../ported/mkroom.js';
import * as steed from '../ported/steed.js';
import * as iactions from '../ported/iactions.js';
import * as extralev from '../ported/extralev.js';
import * as mondata from '../ported/mondata.js';
import {createRegionEntry} from './bindings/region.js';
import {enablePagerLookup} from './pager-lookup.js';
import {is_moat} from '../ported/dbridge.js';
import {createIactionsEnvironment} from './bindings/iactions.js';
import {createExtralevEnvironment} from './bindings/extralev.js';
import * as rumors from '../ported/rumors.js';
import * as fountain from '../ported/fountain.js';
import * as sit from '../ported/sit.js';
import * as music from '../ported/music.js';
import * as write from '../ported/write.js';
import {withCEnvironment} from '../c-runtime/context.js';
import {createRumorsEnvironment,createRumorsState} from './bindings/rumors.js';
import {createFountainEnvironment} from './bindings/fountain.js';
import {createSitEnvironment} from './bindings/sit.js';
import {createMusicEnvironment,createMusicState} from './bindings/music.js';
import {createWriteEnvironment} from './bindings/write.js';
import * as factories from './special-interaction-services.js';
import {createRecordViews} from './record-views.js';

const owners=new WeakMap();
const sources={rumors,fountain,sit,music,write,steed,iactions,extralev};
const objectBits={steed:['cursed','greased','bknown','oeroded','oeroded2'],iactions:['lamplit','dknown','unpaid','cknown','known'],extralev:['oerodeproof','known'],write:['dknown','bknown','blessed','cursed'],sit:['greased','blessed','known','cursed','bknown'],fountain:['cursed','blessed','oerodeproof','oeroded','oeroded2','dknown']};
const monsterBits={steed:['isminion','isshk','ispriest','isgd','iswiz','mundetected','mtrapped','mleashed','mcanmove','mfrozen','msleeping'],rumors:['mpeaceful'],fountain:['msleeping','mpeaceful'],music:['msleeping','mcanmove','mfrozen','mpeaceful','mavenge','mundetected','mtrapped','isshk']};
const heroBits={steed:['uswallow','uinwater'],iactions:['uswallow','twoweap'],rumors:['uevent.major_oracle','uevent.minor_oracle'],sit:['uhave.amulet','uundetected','uswallow','uevent.uhand_of_elbereth','uinwater','uroleplay.deaf'],fountain:['uroleplay.deaf'],music:['uswallow','uinwater','uroleplay.deaf','uevent.uheard_tune']};
const messageNames={rumors:['pline','You','There','verbalize','impossible'],fountain:['pline','pline_The','You','Your','You_feel','You_hear','verbalize','You_see'],sit:['pline','pline_The','You','Your','You_feel','verbalize','You_cant','There','impossible'],music:['pline','You','Your','You_hear','You_feel','You_cant','pline_The','Norep'],write:['pline','You','Your','You_cant','There','pline_The','impossible']};
export function enableSpecialInteractions(environment,layouts,{only=['rumors','fountain','sit','music','write','utf8map','steed','iactions','extralev']}={}){
 if((only.includes('steed')||only.includes('music'))&&(!environment.hasFunction('locomotion')||!environment.hasFunction('defended'))){
  const S=environment.services,views=createRecordViews(environment),ctx=Object.create(environment.start('monster-data').environment),text=v=>typeof v==='string'?S.literal(v):environment.address(v);
  ctx.slithy=p=>Boolean(p.mflags1&BigInt(layouts.mondata.M1_SLITHY));ctx.nolimbs=p=>(p.mflags1&BigInt(layouts.mondata.M1_NOLIMBS))===BigInt(layouts.mondata.M1_NOLIMBS);ctx.charPointer=text;ctx.loadChar=p=>environment.memory.view.getInt8(environment.address(p));for(const name of ['levitate','flys','flyl','slither','ooze','immobile','crawl'])ctx[name]=mondata[name].map(text);
  ctx.objectLocal=()=>views.record('struct obj',environment.transport.stackAlloc(environment.ctypes.size('struct obj')));ctx.copyObject=(a,b)=>environment.memory.memmove(environment.address(a),environment.address(b),environment.ctypes.size('struct obj'));Object.defineProperty(ctx,'cg',{value:views.record('struct const_globals',environment.requireGlobal('cg'))});ctx.MON_WEP=m=>m.mw;ctx.which_armor=(m,mask)=>views.record('struct obj',environment.resolve('which_armor')(environment.address(m),BigInt(mask)));ctx.Is_dragon_armor=o=>o.otyp>=layouts.mondata.GRAY_DRAGON_SCALES&&o.otyp<=layouts.mondata.YELLOW_DRAGON_SCALES||o.otyp>=layouts.mondata.GRAY_DRAGON_SCALE_MAIL&&o.otyp<=layouts.mondata.YELLOW_DRAGON_SCALE_MAIL;for(const name of ['uwep','uarm'])Object.defineProperty(ctx,name,{get:()=>views.record('struct obj',environment.ctypes.load('struct obj *',environment.requireGlobal(name)))});
  const additions={defended:(p,type)=>withCEnvironment(ctx,mondata.defended,views.record('struct monst',p),type),locomotion:(p,def)=>{const v=withCEnvironment(ctx,mondata.locomotion,views.record('struct permonst',p),text(def));return typeof v==='string'?text(v):v;}};environment.register('special-locomotion',Object.fromEntries(Object.entries(additions).filter(([name])=>!environment.hasFunction(name))),ctx);
 }
 if(only.includes('iactions'))enablePagerLookup(environment,layouts);
 if(only.includes('steed')&&!environment.hasFunction('update_player_regions')){const regions=environment.start('region-reset').environment;environment.extend('region-reset',{update_player_regions:createRegionEntry(regions,layouts.region,'update_player_regions')});}
 // Additional leaves reuse existing contexts, with their own source RNG attribution.
 if((only.includes('iactions')||only.includes('extralev'))&&!environment.hasFunction('name_ok')){
  const {services:S,transport,ctypes}=environment,views=createRecordViews(environment),base=environment.start('item-naming').environment,naming=Object.create(base),text=v=>typeof v==='string'?S.literal(v):environment.address(v);
  Object.assign(naming,{...layouts.do_name,ghostnames:ghostnames.map(text),OBJ_DESCR:o=>views.record('struct objdescr',environment.requireGlobal('obj_descr')+o.oc_descr_idx*ctypes.size('struct objdescr')).oc_descr,svp:views.record('struct instance_globals_saved_p',environment.requireGlobal('svp')),nh_getenv:p=>environment.resolve('nh_getenv')(text(p)),loadChar:p=>transport.read('Int8',environment.address(p)),storeChar:(p,v)=>transport.write('Int8',environment.address(p),v),strchr:(p,ch)=>S.strchr(text(p),ch),strncmp:(a,b,n)=>S.strncmp(text(a),text(b),n),rn2:(n,line,caller)=>{if(S.rng_log_enabled())S.rng_log_set_caller(S.literal('do_name.c'),line,S.literal(caller));return S.rn2(n);}});
  const names={name_ok,call_ok,rndghostname,roguename};environment.register('special-item-naming',Object.fromEntries(Object.entries(names).filter(([n])=>!environment.hasFunction(n)).map(([n,fn])=>[n,(...args)=>{if(n==='name_ok'||n==='call_ok')args[0]=views.record('struct obj',args[0]);const result=withCEnvironment(naming,fn,...args);return typeof result==='string'?S.literal(result):result;}])),naming);
 }
 if(only.includes('music')&&!environment.hasFunction('is_moat'))environment.extend('world-water-terrain',{is_moat});
 if(only.includes('music')&&!environment.hasFunction('fillholetyp')){
  const digging=Object.create(environment.start('level-unearthing').environment),S=environment.services;digging.rn2=(n,line,caller)=>{if(S.rng_log_enabled())S.rng_log_set_caller(S.literal('dig.c'),line,S.literal(caller));return S.rn2(n);};digging.intdiv=(a,b)=>Math.trunc(a/b);environment.register('special-liquid-fill',{fillholetyp},digging);
 }
 if(only.includes('utf8map')){enableUtf8map(environment,layouts);only=only.filter(name=>name!=='utf8map');}
 if(only.includes('fountain')&&!environment.hasFunction('nexttodoor'))environment.register('special-room-queries',{nexttodoor},environment.start('room-queries').environment);
 if(only.includes('fountain'))environment.exposeAddressPort('detect',['detecting'].filter(name=>!environment.hasFunction(name)));
 if(only.includes('music'))environment.enableZap(layouts,{only:['resist','ubuzz','flash_str','zapyourself']});
 let enabled=owners.get(environment);if(!enabled)owners.set(environment,enabled=new Map());
 for(const port of only){
  if(!Object.hasOwn(sources,port))throw new Error('Unknown optional interaction '+port);
  if(enabled.has(port))continue;
  const metadata=abi.ports[port],L=metadata.layout,source=sources[port];
  for(const [key,value]of Object.entries(L))if(JSON.stringify(layouts[port]?.[key])!==JSON.stringify(value))throw new Error('Changed special interaction layout '+port+'.'+key);
  if(port==='steed'){
   const native=nativeSteedFor(environment,layouts),old=environment.start('monster-saddle-check');
   for(const name of ['can_saddle','put_saddle_on_mon','stucksteed']){if(old.namespace[name]!==steed[name])throw Error('Review existing STEED owner '+name);old.namespace[name]=native.functions[name];}
   if(environment.hasFunction('steed_vs_stealth')){const form=environment.start('hero-form');if(typeof form.namespace.steed_vs_stealth!=='function')throw Error('Review mounted-stealth owner');form.namespace.steed_vs_stealth=native.functions.steed_vs_stealth;}
   const namespace={};for(const[name,fn]of Object.entries(native.functions))if(!environment.hasFunction(name))namespace[name]=fn;
   environment.register('special-steed',namespace);
   enabled.set(port,{call:native.call,services:native.services,get context(){return native.context;},exports:Object.keys(namespace),limitation:'Native STEED policies share canonical actors, occupancy and direct calls. Other engine owners retain their explicit boundaries; validation limits are recorded separately.'});continue;
  }
  const {services:S,memory,ctypes,transport,functions}=environment,address=environment.address;
  if(port==='rumors'){try{environment.requireGlobal('bogon_codes');}catch(error){if(error.message!=='Unresolved standalone global bogon_codes')throw error;const bytes=Uint8Array.from([...abi.bogonCodes+'\0'].map(c=>c.charCodeAt(0)));environment.allocateGlobal('bogon_codes',bytes.length,bytes);}}
  const views=createRecordViews(environment),boundary=args=>args.map(v=>v?.address??v);
  const text=v=>typeof v==='string'?S.literal(v):address(v);
  if(port==='rumors'&&!environment.hasFunction('bogon_is_pname'))environment.register('special-rumor-names',{bogon_is_pname},{char:transport.char,strchr:(p,ch)=>S.strchr(text(p),ch)});
  const resolve=name=>name==='alloc'?n=>environment.alloc('alloc',Number(BigInt.asUintN(32,BigInt(n)))):environment.hasFunction(name)?environment.resolve(name):typeof S[name]==='function'?S[name]:environment.resolve(name);
  const call=(name,...args)=>{args=boundary(args);const proto=metadata.foreign[name];if(proto){const types=proto.slice(proto.indexOf('(')+1,-1).split(',');args=args.map((value,i)=>types[i]?.includes('*')?address(value):value);}
   const value=resolve(name)(...args);return typeof value==='string'?S.literal(value):value?.address??value;};
  const bit=(type,p,key)=>{if(!key)throw new Error('Unknown '+port+' packed field');return ctypes.getField(type,address(p),key,'unsigned int');};
  const setBit=(type,p,key,v)=>{if(!key)throw new Error('Unknown '+port+' packed field');return ctypes.setField(type,address(p),key,'unsigned int',v);};
  const common=name=>{const row=abi.commonStrings[name];if(!row)throw new Error('Unknown common string '+name);return ctypes.getField('struct '+row.owner,environment.requireGlobal(row.owner),row.field,'const char *');};
  const hero=()=>views.record('struct you',environment.requireGlobal('u'));
  const heroField=(i,v,writing=false)=>{const path=heroBits[port]?.[i]?.split('.');if(!path)throw new Error('Unknown '+port+' hero field '+i);const key=path.pop();let record=hero();for(const name of path)record=record[name];if(writing)record[key]=v;return record[key];};
  const terrain=(x,y)=>views.record('struct rm',environment.requireGlobal('svl')+L.terrain+(Number(x)*L.ROWNO+Number(y))*L.terrainSize);
  const terrainField=(i)=>metadata.fieldAliases[port==='fountain'?['looted','blessedftn'][i]:'doormask'];
  const window=(key,sig,...args)=>functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),key,'void *'),sig,...args);
  const equipment=port==='steed'?['uwep','uarm','uarmg','uarmf','uball']:port==='iactions'?['uwep','uswapwep','uquiver','uamul','uleft','uright','ublindf','uarms']:port==='fountain'?['uarmg']:['uwep','uarm','uarmf'];
  const eq=i=>equipment[i]?address(ctypes.load('struct obj *',environment.requireGlobal(equipment[i]))):0;
  const record={services:null,state:null,exports:[],call:null};
  const callback=(name,sig)=>environment.functionPointer(port+'::'+name,sig,(...args)=>record.call(name,...args));
  const log=(kind,args)=>{const values=[...args],index=kind==='d'?2:1,line=values[index],caller=values[index+1]??0,name=metadata.callers[caller];if(!name)throw new Error('Unknown '+port+' RNG caller '+caller);if(S.rng_log_enabled())S.rng_log_set_caller(S.literal(port+'.c'),line,S.literal(name));return call(kind,...values.slice(0,index));};
  const helpers={
   global:i=>{const name=metadata.globals[i];if(!name)throw new Error('Unknown '+port+' global '+i);return name==='0'?0:environment.requireGlobal(name);},
   object_bit:(p,i)=>bit('struct obj',p,objectBits[port]?.[i]),set_object_bit:(p,i,v)=>setBit('struct obj',p,objectBits[port]?.[i],v),
   monster_bit:(p,i)=>bit('struct monst',p,monsterBits[port]?.[i]),set_monster_bit:(p,i,v)=>setBit('struct monst',p,monsterBits[port]?.[i],v),
   hero_bit:i=>heroField(i),set_hero_bit:(i,v)=>heroField(i,v,true),
   class_bit:(p,i)=>{const key=port==='write'?['oc_name_known','oc_encountered'][i]:port==='iactions'?['oc_name_known','oc_tough','oc_unique','oc_bimanual'][i]:'oc_material';return bit('struct objclass',p,metadata.fieldAliases[key]??key);},
   object_class_bit:p=>bit('struct objclass',p,'oc_magic'),equipment:eq,hands:()=>environment.requireGlobal('hands_obj'),
   terrain_flags:(x,y)=>terrain(x,y).flags,set_terrain_flags:(x,y,v)=>{terrain(x,y).flags=v;},
   terrain_bit:(x,y,i)=>terrain(x,y)[terrainField(i)],
   set_terrain_bit:(x,y,i,v)=>{terrain(x,y)[terrainField(i)]=v;},
   level_bit:()=>views.record('struct instance_globals_saved_l',environment.requireGlobal('svl')).level.flags.nommap,
   trap_type:p=>bit('struct trap',p,'ttyp'),trap_bit:(p,i)=>bit('struct trap',p,['tseen','ttyp'][i]),set_trap_bit:(p,i,v)=>setBit('struct trap',p,'tseen',v),
   givenname:p=>{const mon=views.record('struct monst',p);return mon.mextra?mon.mextra.mgivenname:0;},
   common_string:i=>common((port==='steed'?['Never_mind']:port==='sit'?['Never_mind','NH_BLACK']:['something','nothing_seems_to_happen'])[i]),never_mind:()=>common('Never_mind'),
   rn2:(...args)=>log('rn2',args),rnd:(...args)=>log('rnd',args),rnl:(...args)=>log('rnl',args),d:(...args)=>log('d',args),
   message:(i,format,...args)=>{const name=messageNames[port][i];if(!name)throw new Error('Unknown '+port+' message kind '+i);call(name,Number(format),...args.map(Number));},
   hear_numbers:(format,a,b,c,d)=>{call('You_hear',Number(format),a,Number(b),c,Number(d));},impossible:(...args)=>{call('impossible',...args);},
   format:(...args)=>{call('sprintf',...args.map(Number));},sprintf:(...args)=>{call('sprintf',...args.map(Number));},
   format_longs:(out,fmt,...args)=>{call('sprintf',Number(out),Number(fmt),...args);},format_long_string:(out,fmt,n,str)=>{call('sprintf',Number(out),Number(fmt),n,Number(str));},format_int_string:(out,fmt,n,str)=>{call('sprintf',Number(out),Number(fmt),n,Number(str));},format_strings:(...args)=>{call('sprintf',...args.map(Number));},
   livelog:(category,...args)=>{call('livelog_printf',category,...args.map(Number));},getlin:(...args)=>call('getlin',...args),ynq:q=>call('yn_function',text(q),environment.requireGlobal('ynqchars'),113,1),y_n:q=>call('yn_function',text(q),environment.requireGlobal('ynchars'),110,1),explicitdebug:name=>call('debugcore',Number(name),0),
   create_window:type=>window('win_create_nhwindow','ii',type),display_window:(win,block)=>window('win_display_nhwindow','vii',win,block),destroy_window:win=>window('win_destroy_nhwindow','vi',win),putstr:(...args)=>window('win_putstr','viip',...args),win_message:()=>Number(ctypes.load('int',environment.requireGlobal('WIN_MESSAGE'))),
   getobj:(verb,flags)=>call('getobj',verb,callback('write_ok','ip'),flags),
   clear_area:(x,y,range,arg)=>call('do_clear_area',x,y,range,callback('gush','viip'),arg),get_iter_mons:()=>call('get_iter_mons',callback('watchman_warn_fountain','ip')),
   bogon_codes:()=>environment.requireGlobal('bogon_codes'),rng_pointer:()=>environment.functionPointer('rn2','ii'),call_rng:(p,n)=>functions.indirect(p,'ii',n),
   open:(...args)=>call('fopen',...args),close:p=>call('fclose',p),seek:(...args)=>call('fseek',...args),tell:p=>call('ftell',p),gets:(...args)=>call('fgets',...args),free:p=>S.free(address(p)),
   scan_header:(...args)=>call('sscanf',...args),scan_int:(...args)=>call('sscanf',...args),scan_ulong:(...args)=>call('sscanf',...args),
   sfo_unsigned:(...args)=>call('sfo_unsigned',...args),sfo_ulong:(...args)=>call('sfo_ulong',...args),sfi_unsigned:(...args)=>call('sfi_unsigned',...args),sfi_ulong:(...args)=>call('sfi_ulong',...args),
   assert:()=>{const a=abi.assertions.assert;return call('__assert_fail',text(a.expression),text(a.file),a.line,text(a.function));},nhassert:()=>{const a=abi.assertions.nhassert;return call('nhassert_failed',text(a.expression),text(a.file),a.line);},
  };
  if(port==='iactions'){
   helpers.nul_glyphinfo=()=>environment.requireGlobal('nul_glyphinfo');
   helpers.command=i=>{const name=abi.iactionsCommands[i];if(!name)throw new Error('Unknown IACTIONS command '+i);return environment.functionPointer(name,'i');};
   helpers.cmdq_add_ec=(queue,cmd)=>call('cmdq_add_ec',queue,Number(cmd));
   helpers.start_menu=(win,behavior)=>window('win_start_menu','vij',win,behavior);
   helpers.end_menu=(win,prompt)=>window('win_end_menu','vip',win,Number(prompt));
   helpers.format_unwield=(out,fmt,a,b,c,d,e)=>call('sprintf',Number(out),Number(fmt),Number(a),b,Number(c),Number(d),Number(e));
   helpers.assert_fail=()=>{const a=abi.iactionsAssertion;return call('__assert_fail',text(a.expression),text('iactions.c'),a.line,text('itemactions'));};
  }
  if(port==='extralev'){
   helpers.door_mask=p=>bit('struct rm',p,metadata.fieldAliases.doormask);
   helpers.set_door_mask=(p,v)=>setBit('struct rm',p,metadata.fieldAliases.doormask,v);
   helpers.impossible_one=(fmt,n)=>call('impossible',Number(fmt),n);
   helpers.impossible_two=(fmt,x,y)=>call('impossible',Number(fmt),x,y);
  }
  let song;
  helpers.storage=(i=0)=>{if(port==='steed')return song??=environment.allocateGlobal('steed.classifiers',7);if(i!==0)throw new Error('Unknown MUSIC static '+i);return song??=environment.allocateGlobal('music.my_goto_song',music.my_goto_song_initial.length);};
  const prefix='teleport_'+port+'_',native=new Proxy({}, {get:(_,name)=>{if(typeof name!=='string')return undefined;if(name==='teleport_were_monster_bit')return(p,i)=>bit('struct monst',p,['msleeping','mfrozen','mcanmove','mpeaceful'][i]);if(name==='teleport_were_set_monster_bit')return(p,i,v)=>setBit('struct monst',p,['msleeping','mfrozen','mcanmove','mpeaceful'][i],v);if(name.startsWith(prefix)){const helper=helpers[name.slice(prefix.length)];if(!helper)throw new Error('Unconnected '+port+' transport '+name);return helper;}return (...args)=>call(name,...args);}});
  record.services=factories['create'+port[0].toUpperCase()+port.slice(1)+'Services'](environment,native);
  // Explicit boundaries below keep source records addressable and callbacks typed.
  const local=record.services;
  if(port==='rumors'){
   // The existing level-content owner already publishes random-text leaves.
   // Extend that same private cache instead of creating a second CapMons owner.
   if(environment.hasFunction('getrumor')){
    const shared=environment.start('random-text').environment;record.state={};
    for(const key of ['CapMonstCnt','CapBogonCnt','CapMonSiz','CapMons'])Object.defineProperty(record.state,key,{get:()=>shared[key]?.address??shared[key],set:value=>{shared[key]=value;}});
   }else record.state=createRumorsState();
  }
  if(port==='music')record.state=createMusicState(local,L,music);
  record.call=(name,...args)=>transport.scoped(()=>{
   let env;
   if(port==='iactions')env=createIactionsEnvironment(local,L);
   if(port==='extralev')env=createExtralevEnvironment(local,L);
   if(port==='rumors')env=createRumorsEnvironment(local,L,record.state);
   if(port==='fountain')env=createFountainEnvironment(local,L,fountain);
   if(port==='sit')env=createSitEnvironment(local,L);
   if(port==='music')env=createMusicEnvironment(local,L,record.state);
   if(port==='write')env=createWriteEnvironment(local,L);
   args=boundary(args);
   if(port==='iactions'){if(['itemactions','item_naming_classification','item_reading_classification','itemactions_pushkeys'].includes(name))args[0]=env.object(args[0]);if(name==='ia_addmenu')args[2]=env.char(args[2]);}
   if(port==='write'&&['dowrite','write_ok','cost'].includes(name))args[0]=env.object(args[0]);
   if(port==='rumors'){
    if(name==='doconsult')args[0]=env.monster(args[0]);
    if(name==='getrumor'){args[0]=env.int(args[0]);args[2]=env.boolean(args[2]);}
    if(name==='outrumor')args=args.map(env.int);
    if(name==='outoracle')args=args.map(env.boolean);
    if(name==='others_check')args[2]=env.winPointer(args[2]);
    if(name==='get_rnd_text'){args[2]=env.rng(args[2]);args[3]=env.uint(args[3]);}
    if(name==='get_rnd_line'){args[2]=env.uint(args[2]);args[3]=env.rng(args[3]);args[4]=env.long(args[4]);args[5]=env.long(args[5]);args[6]=env.uint(args[6]);}
   }
   if(port==='fountain'&&['dipfountain','dipsink'].includes(name))args[0]=env.object(args[0]);
   if(port==='fountain'&&name==='watchman_warn_fountain')args[0]=env.monster(args[0]);
   if(port==='fountain'){
    if(['gush','dryup','breaksink','sink_backs_up'].includes(name)){args[0]=env.coordxy(args[0]);args[1]=env.coordxy(args[1]);}
    if(name==='gush')args[2]=env.intPointer(args[2]);if(name==='dryup')args[2]=env.boolean(args[2]);if(name==='dogushforth')args[0]=env.int(args[0]);
   }
   if(port==='sit'&&name==='special_throne_effect')args[0]=args[0]|0;
   if(port==='music'){
    if(['awaken_scare','awaken_soldiers'].includes(name))args[0]=env.monster(args[0]);
    if(name==='awaken_scare')args[1]=env.boolean(args[1]);
    if(['awaken_monsters','put_monsters_to_sleep','charm_snakes','calm_nymphs','charm_monsters','do_earthquake'].includes(name))args[0]=env.int(args[0]);
    if(name==='do_pit'){args[0]=env.coordxy(args[0]);args[1]=env.coordxy(args[1]);args[2]=env.uint(args[2]);}
    if(['do_play_instrument','do_improvisation','obj_to_instr'].includes(name))args[0]=env.object(args[0]);
    if(name==='improvised_notes')args[0]=env.booleanPointer(args[0]);
   }
   const result=withCEnvironment(env,source[name],...args);return typeof result==='string'?S.literal(result):result?.address??result;
  });

  record.exports=Object.keys(metadata.public).filter(name=>!environment.hasFunction(name));
  environment.register('special-'+port,Object.fromEntries(record.exports.map(name=>[name,(...args)=>record.call(name,...args)])));
  record.limitation='Original policies connected to shared memory. Accepted interactions are limited to explicit complete-C comparisons; unresolved foreign owners fail rather than being stubbed.';
  enabled.set(port,record);
 }
 return enabled;
}
