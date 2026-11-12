import * as CAdapter from '../../c-runtime/adapter-factories.js';
import * as allmain from '../../ported/allmain.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const fields=["a11y.glyph_updates", "disp.botl", "disp.botlx", "disp.time_botl", "flags.female", "flags.friday13", "flags.initgend", "flags.legacy", "flags.moonphase", "flags.pantheon", "flags.randomall", "flags.runmode", "flags.time", "flags.verbose", "gc.cmd_key", "gc.command_count", "gd.defer_see_monsters", "gh.hero_seq", "gi.invent", "gl.luacore", "gm.multi", "go.occtxt", "go.occupation", "gu.urace.adj", "gu.urole.allow", "gu.urole.name.f", "gu.urole.name.m", "gv.vision_full_recalc", "gw.were_changes", "iflags.debug_fuzzer", "iflags.deferred_X", "iflags.fuzzerpending", "iflags.hilite_delta", "iflags.news", "iflags.nofollowers", "iflags.pending_customizations", "iflags.perm_invent", "iflags.sanity_check", "iflags.wc_splash_screen", "program_state.beyond_savefile_load", "program_state.done_hup", "program_state.in_moveloop", "program_state.something_worth_saving", "svc.context.bypasses", "svc.context.ident", "svc.context.mon_moving", "svc.context.move", "svc.context.mv", "svc.context.next_attrib_check", "svc.context.resume_wish", "svc.context.rndencode", "svc.context.run", "svc.context.seer_turn", "svc.context.travel", "svc.context.tribute.enabled", "svc.context.tribute.tributesz", "svc.context.warnlevel", "svl.level.flags.fumaroles", "svl.level.flags.noautosearch", "svm.moves", "u.mfemale", "u.mh", "u.mhmax", "u.ualign.type", "u.ublesscnt", "u.uburied", "u.udg_cnt", "u.uen", "u.uenmax", "u.uevent.amulet_wish", "u.uevent.udemigod", "u.uhave.amulet", "u.uhp", "u.uhpmax", "u.uinvulnerable", "u.ulevel", "u.ulycn", "u.umoved", "u.umovement", "u.uroleplay.pauper", "u.uroleplay.reroll", "u.usleep", "u.usteed", "u.uswallow", "u.utotype", "u.utrap", "u.utraptype", "u.ux", "u.uy", "u.uz.dlevel", "u.uz0.dlevel", "urealtime.realtime", "urealtime.start_timing", "gu.urole.mnum", "WIN_MESSAGE", "WIN_STATUS", "WIN_MAP", "WIN_INVEN"];
const pointers={"u.usteed": "monster", "go.occupation": "pointer", "go.occtxt": "pointer", "gl.luacore": "pointer", "gi.invent": "pointer", "gu.urace.adj": "pointer", "gu.urole.name.f": "pointer", "gu.urole.name.m": "pointer"};
const longs=new Set(["gc.command_count", "gh.hero_seq", "gm.multi", "gw.were_changes", "iflags.hilite_delta", "svc.context.next_attrib_check", "svc.context.seer_turn", "svc.context.tribute.tributesz", "svm.moves", "u.usleep", "urealtime.realtime", "urealtime.start_timing"]);
const addresses=["u.uz", "u.uz0", "u.ucamefrom", "gy.youmonst", "stronghold_level", "iflags.menu_headings", "svp.plname"];
const heroNames=["Very_fast", "Fast", "Glib", "Upolyd", "Teleportation", "Polymorph", "Unchanging", "Searching", "Warning", "Clairvoyant", "BClairvoyant", "Underwater", "Blind", "Hallucination", "Unblind_telepat", "Warn_of_mon", "Energy_regeneration", "EMagical_breathing", "Breathless", "Regeneration", "Half_physical_damage", "Sleepy", "wizard"];
const raw=v=>BigInt(v?.address??v??0),address=v=>Number(raw(v));
const indexed=(get,set)=>new Proxy(Object.create(null),{get:(_,key)=>/^\d+$/.test(String(key))?get(Number(key)):undefined,set:(_,key,v)=>{if(!set)throw new Error('Read-only ALLMAIN array');set(Number(key),v);return true;}});
export function createAllmainBridge(layout){
 const states=new WeakMap();
 return (services,name,...args)=>{
  if(layout.pointerSize!==8||layout.longSize!==8||layout.timeSize!==8)throw new Error('Review ALLMAIN memory64 long/time ABI');
  const saved=services.stackSave();
  try{
   let state=states.get(services.moduleKey);if(!state){state={mvl_wtcap:allmain.mvl_wtcap,mvl_change:allmain.mvl_change};states.set(services.moduleKey,state);}
   const env=Object.assign(Object.create(services),layout,{allmainState:state});
   const record=(kind,at)=>{at=address(at);if(!at)return 0;const out={address:at};const keys=kind===0?['nmon','data','movement']:['mmove','mlet','geno'];
    keys.forEach((key,i)=>Object.defineProperty(out,key,{get(){const v=services.recordGet(kind,i,at);return kind===0&&i<2?record(i===0?0:1,v):Number(v);},set(v){services.recordSet(kind,i,at,raw(v));}}));return out;};
   const tree=path=>{let result=env;for(const key of path.split('.'))result=result[key]??=(Object.create(null));return result;};
   fields.forEach((path,i)=>{const parts=path.split('.'),key=parts.pop(),target=parts.length?tree(parts.join('.')):env;
    Object.defineProperty(target,key,{get(){const value=services.get(i);return pointers[path]==='monster'?record(0,value):pointers[path]?address(value):longs.has(path)?(path==='svc.context.tribute.tributesz'?BigInt.asUintN(64,BigInt(value)):BigInt(value)):Number(value);},set(v){services.set(i,raw(v));}});
   });
   addresses.forEach((path,i)=>{const parts=path.split('.'),key=parts.pop(),target=parts.length?tree(parts.join('.')):env;
    if(path==='gy.youmonst')Object.defineProperty(target,key,{get:()=>record(0,services.address(i))});
    else if(path==='iflags.menu_headings')Object.defineProperty(env,'menuHeadingsAddress',{get:()=>services.address(i)});
    else if(path==='svp.plname')Object.defineProperty(target,key,{get:()=>services.address(i)});
    else{const out=tree(path);Object.defineProperty(out,'address',{value:services.address(i)});}
   });
   env.u.ualignbase=indexed(i=>Number(services.arrayGet(1,i)),(i,v)=>services.arraySet(1,i,BigInt(v)));
   env.svm.mvitals=indexed(i=>({get mvflags(){return Number(services.arrayGet(0,i));},set mvflags(v){services.arraySet(0,i,BigInt(v));}}));
   env.mons=indexed(i=>record(1,services.arrayPointer(0,i)));
   env.genders=indexed(i=>({get adj(){return services.arrayPointer(1,i);}}));
   env.nhcb_counts=indexed(i=>Number(services.arrayGet(2,i)));env.nhcb_name=indexed(i=>services.arrayPointer(2,i));
   Object.defineProperty(env,'fmon',{get:()=>record(0,services.fmon())});
   Object.defineProperty(env,'done1Pointer',{get:()=>services.done1Pointer()});Object.defineProperty(env,'NEWS',{get:()=>services.news()});
   heroNames.forEach((key,i)=>Object.defineProperty(env,key,{get:()=>Boolean(services.hero(i))}));
   Object.assign(env,{callLocal(fn,...values){return CAdapter.callWithStack(services,fn,...values);},Role_if:n=>env.gu.urole.mnum===n,
    In_endgame:p=>services.levelFlag(0,p),Is_airlevel:p=>services.levelFlag(1,p),Is_waterlevel:p=>services.levelFlag(2,p),
    storeChar:(at,v)=>services.heap()[address(at)]=Number(v),
    find_level:s=>{const at=services.find_level(s);return at?{address:at,dlevel:{address:services.dlevel(at)}}:0;},
    m_at:(x,y)=>record(0,services.m_at(x,y)),
    rn2(bound,line,fn){services.rngCaller(line,fn);return services.drawRn2(typeof bound==='function'?bound():bound);},
    rnd(bound,line,fn){services.rngCaller(line,fn);return services.drawRnd(typeof bound==='function'?bound():bound);},
    rn1(bounds,line,fn){services.rngCaller(line,fn);const values=bounds();return services.drawRn2(values[0])+values[1];},
   });
   if(name==='interrupt_multi')args[0]=address(args[0]);
   if(name==='timet_to_seconds'||name==='timet_delta')args=args.map(v=>BigInt(v));
   return withCEnvironment(env,allmain[name],...args);
  }finally{services.stackRestore(saved);}
 };
}
