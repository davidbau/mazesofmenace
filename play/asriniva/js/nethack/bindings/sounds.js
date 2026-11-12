import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Native views, C header expansions and ABI transport; policy remains sounds.js.
import * as sounds from '../../ported/sounds.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const states=new WeakMap();
export function createSoundsEnvironment(services,layout,state){
    const schemas={"mon": {"data": "ptr", "nmon": "ptr", "mextra": "ptr", "m_id": "Uint32", "mtame": "Int8", "mx": "Int16", "my": "Int16", "mhp": "Int32", "mhpmax": "Int32", "meating": "Int32", "mstrategy": "BigUint64", "m_ap_type": "Uint8", "cham": "Int16"}, "pm": {"msound": "Uint8", "mlet": "Int8", "mlevel": "Int8", "mflags1": "BigUint64", "mflags2": "BigUint64", "mflags3": "Uint16", "pmidx": "Int32"}, "obj": {"otyp": "Int16", "oclass": "Int8", "novelidx": "Int32"}, "extra": {"epri": "ptr", "emin": "ptr", "edog": "ptr"}, "edog": {"hungrytime": "BigInt64"}, "epri": {"shroom": "Int8", "shralign": "Int8", "shrpos": "coord"}, "emin": {"renegade": "Int8"}, "room": {"lx": "Int16", "hx": "Int16", "ly": "Int16", "hy": "Int16", "rtype": "Int8"}, "coord": {"x": "Int16", "y": "Int16"}, "level": {"dnum": "Int16", "dlevel": "Int16"}, "u": {"ux": "Int16", "uy": "Int16", "dx": "Int32", "dy": "Int32", "dz": "Int32", "umonnum": "Int32", "umonster": "Int32", "usteed": "ptr", "uz": "level", "uprops": "array", "urooms": "array", "ushops": "array"}, "prop": {"intrinsic": "BigInt64", "extrinsic": "BigInt64", "blocked": "BigInt64"}, "sound": {"soundname": "ptr", "soundlib_id": "Uint32", "sound_triggers": "BigUint64", "sound_init_nhsound": "callback", "sound_exit_nhsound": "callback", "sound_achievement": "callback", "sound_soundeffect": "callback", "sound_hero_playnotes": "callback", "sound_play_usersound": "callback", "sound_ambience": "callback", "sound_verbal": "callback"}, "gender": {"his": "ptr"}, "terrain": {"typ": "Int8"}, "cls": {"oc_skill": "Int8"}};
    const addr=v=>Number(v?.address??v??0),raw=v=>CAdapter.unsignedPointer(v),int=v=>Number(BigInt.asIntN(32,BigInt(v))),long=v=>BigInt.asIntN(64,BigInt(v));
    const view=()=>CAdapter.currentDataView(services),global=i=>addr(services.global(i)),pointer=at=>CAdapter.readPointerNumber(view,at),samePtr=(a,b)=>raw(a)===raw(b);
    for(const[k,n]of Object.entries({pointerSize:8,intSize:4,longSize:8,configUserSounds:0,configSpeech:0,configAutoMap:0,configIntegrated:0,configSoundlibCount:1}))if(layout[k]!==n)throw new Error('Review sounds ABI '+k);
    const indexed=get=>new Proxy({}, {get(t,k){return typeof k==='string'&&/^-?\d+$/.test(k)?get(Number(k)):Reflect.get(t,k);}});
    const field=(o,k,at,kind)=>{Object.defineProperty(o,k,{get(){return view()['get'+kind](at(),true);},set(v){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(v):Number(v),true);}});};
    const ptr=(o,k,at,wrap=v=>v)=>{Object.defineProperty(o,k,{get(){return wrap(pointer(at()));},set(v){view().setBigUint64(at(),typeof v==='string'?BigInt(services.literal(v)):raw(v),true);}});};
    function record(value,prefix){const at=addr(value);if(!at)return 0;const o={address:at};for(const[k,kind]of Object.entries(schemas[prefix]))if(!['array','ptr','callback','coord','level'].includes(kind)){if(layout[prefix+'_'+k+'_size']!==Number(kind.match(/\d+/)[0])/8)throw new Error('Review sounds field '+prefix+'_'+k);field(o,k,()=>at+layout[prefix+'_'+k],kind);}return o;}
    const coord=v=>record(v,'coord'),level=v=>record(v,'level'),permonst=v=>record(v,'pm'),room=v=>record(v,'room');
    function object(v){const o=record(v,'obj');if(!o)return 0;for(const[i,k]of ['cursed','bknown'].entries())Object.defineProperty(o,k,{get(){return services.objectBit(o,i);},set(v){services.setObjectBit(o,i,v);}});return o;}
    function extra(v){const e=record(v,'extra');if(!e)return 0;ptr(e,'edog',()=>e.address+layout.extra_edog,p=>record(p,'edog'));ptr(e,'emin',()=>e.address+layout.extra_emin,p=>record(p,'emin'));ptr(e,'epri',()=>e.address+layout.extra_epri,p=>{const r=record(p,'epri');if(r)r.shrpos=coord(r.address+layout.epri_shrpos);return r;});return e;}
    function monster(v){const m=record(v,'mon');if(!m)return 0;ptr(m,'data',()=>m.address+layout.mon_data,permonst);ptr(m,'nmon',()=>m.address+layout.mon_nmon,monster);ptr(m,'mextra',()=>m.address+layout.mon_mextra,extra);for(const[i,k]of ['female','isminion','ispriest','isshk','mcan','mcansee','mcanmove','mconf','mflee','mpeaceful','msleeping','mstun','mtrapped','mundetected'].entries())Object.defineProperty(m,k,{get(){return services.monsterBit(m,i);},set(v){services.setMonsterBit(m,i,v);}});return m;}
    function soundproc(v){const p=record(v,'sound');if(!p)return 0;ptr(p,'soundname',()=>p.address+layout.sound_soundname);for(const[k,kind]of Object.entries(schemas.sound))if(kind==='callback')field(p,k,()=>p.address+layout['sound_'+k],'BigUint64');return p;}
    const u=record(global(0),'u');u.uz=level(global(0)+layout.u_uz);u.urooms=global(0)+layout.u_urooms;u.ushops=global(0)+layout.u_ushops;ptr(u,'usteed',()=>global(0)+layout.u_usteed,monster);Object.defineProperty(u,'uswallow',{get(){return services.heroBit(0);}});
    const props=indexed(i=>record(global(0)+layout.u_uprops+i*layout.propSize,'prop'));
    const svl={level:{flags:{}}},svr={rooms:indexed(i=>room(global(2)+layout.rooms+i*layout.roomSize))},svc={context:{tribute:{}}},svq={quest_status:{}},gu={urole:{},urace:{individual:{}}},gy={youmonst:monster(global(6)+layout.youmonst)},gi={},ga={},gc={},gn={},gm={},flags={},iflags={},svm={};
    for(const[i,k]of ['nfountains','nsinks','has_court','has_swamp','has_vault','has_beehive','has_morgue','has_barracks','has_zoo','has_shop','has_temple'].entries())Object.defineProperty(svl.level.flags,k,{get(){return services.levelBit(i);},set(v){services.setLevelBit(i,v);}});
    svl.lastseentyp=indexed(x=>indexed(y=>view().getInt8(global(1)+layout.lastseentyp+x*layout.ROWNO+y)));
    field(svc.context,'run',()=>global(3)+layout.context_run,'Uint32');Object.defineProperty(svc.context.tribute,'Deathnotice',{get(){return services.contextBit(0);},set(v){services.setContextBit(0,v);}});
    field(svq.quest_status,'leader_m_id',()=>global(4)+layout.leader_m_id,'Uint32');for(const k of ['guardnum','mnum'])field(gu.urole,k,()=>global(5)+layout[k],'Int16');field(gu.urace,'mnum',()=>global(5)+layout.race_mnum,'Int16');ptr(gu.urace,'noun',()=>global(5)+layout.race_noun);for(const k of ['f','m'])ptr(gu.urace.individual,k,()=>global(5)+layout['race_'+k]);
    ptr(gi,'invent',()=>global(7)+layout.invent,object);field(ga,'active_soundlib',()=>global(8)+layout.active_soundlib,'Uint32');field(gc,'chosen_soundlib',()=>global(9)+layout.chosen_soundlib,'Uint32');ptr(gn,'nomovemsg',()=>global(10)+layout.nomovemsg);ptr(gm,'multi_reason',()=>global(11)+layout.multi_reason);
    for(const k of ['acoustics','female'])field(flags,k,()=>global(12)+layout[k],'Int8');field(flags,'moonphase',()=>global(12)+layout.moonphase,'Uint32');field(iflags,'last_msg',()=>global(13)+layout.last_msg,'Int32');field(svm,'moves',()=>global(18)+layout.moves,'BigInt64');
    const mons=indexed(i=>permonst(global(14)+i*layout.pmSize)),objects=indexed(i=>record(global(15)+i*layout.clsSize,'cls'));
    const terrain=(x,y)=>{const t=record(global(1)+layout.terrain+(x*layout.ROWNO+y)*layout.terrainSize,'terrain');Object.defineProperty(t,'roomno',{get(){return services.terrainBit(x,y,0);}});return t;};const levl=indexed(x=>indexed(y=>terrain(x,y)));
    const equip=['uwep','uarm','uarmc','uarmh','uarms','uarmg','uarmf','uarmu'];
    const either=i=>Boolean(props[i].intrinsic||props[i].extrinsic),blocked=i=>Boolean((props[i].intrinsic||props[i].extrinsic)&&!props[i].blocked);
    const range=(g,k)=>g>=layout[k]&&g<layout[k]+layout.NUMMONS;
    const env=Object.assign(Object.create(services),layout,{u,svl,svr,svc,svq,gu,gy,gi,ga,gc,gn,gm,flags,iflags,svm,mons,objects,levl,monster,object,permonst,room,samePtr,int,long,size_t:raw,boolean:v=>int(v)<<24>>24,
        charPointer:v=>typeof v==='string'?services.literal(v):addr(v),loadChar:p=>view().getInt8(addr(p)),storeChar(p,v){const ch=int(v)<<24>>24;view().setInt8(addr(p),ch);return ch;},ptrAdd:(p,n)=>addr(p)+Number(n),stringSize:s=>BigInt(layout.suffixSize),
        SIZE:a=>a.length,IndexOk:(i,a)=>i>=0&&i<a.length,ROOM_INDEX:r=>long(raw(r)-BigInt(global(2)+layout.rooms))/BigInt(layout.roomSize),
        m_at:(x,y)=>monster(pointer(global(1)+layout.floorMonsters+(x*layout.ROWNO+y)*8)),vobj_at:(x,y)=>object(pointer(global(1)+layout.floorObjects+(x*layout.ROWNO+y)*8)),
        M_AP_TYPE:m=>m.m_ap_type&layout.M_AP_TYPMASK,monsndx:p=>p.pmidx,DEADMONSTER:m=>m.mhp<1,helpless:m=>Boolean(m.msleeping||!m.mcanmove),
        EPRI:m=>m.mextra.epri,EMIN:m=>m.mextra.emin,EDOG:m=>m.mextra.edog,has_emin:m=>Boolean(m.mextra&&m.mextra.emin),
        Role_if:n=>gu.urole.mnum===n,uhis:()=>pointer(global(16)+(flags.female?1:0)*layout.genderSize+layout.gender_his),mhis:m=>pointer(global(16)+services.pronoun_gender(m,layout.PRONOUN_HALLU)*layout.genderSize+layout.gender_his),
        is_weptool:o=>o.oclass===layout.TOOL_CLASS&&objects[o.otyp].oc_skill!==layout.P_NONE,is_silent:p=>p.msound===layout.MS_SILENT,
        is_lminion:m=>Boolean(m.data.mflags2&BigInt(layout.M2_MINION))&&services.mon_aligntyp(m)===layout.A_LAWFUL,
        is_mplayer:p=>raw(p)>=raw(mons[layout.PM_ARCHEOLOGIST])&&raw(p)<=raw(mons[layout.PM_WIZARD]),
        is_vampshifter:m=>[layout.PM_VAMPIRE,layout.PM_VAMPIRE_LEADER,layout.PM_VLAD_THE_IMPALER].includes(m.cham),
        glyph_is_invisible:g=>g===layout.GLYPH_INVISIBLE,glyph_is_statue:g=>['GLYPH_STATUE_FEM_OFF','GLYPH_STATUE_MALE_OFF','GLYPH_STATUE_FEM_PILETOP_OFF','GLYPH_STATUE_MALE_PILETOP_OFF'].some(k=>range(g,k)),
        glyph_to_mon:g=>{for(const k of ['GLYPH_MON_FEM_OFF','GLYPH_MON_MALE_OFF','GLYPH_PET_FEM_OFF','GLYPH_PET_MALE_OFF','GLYPH_DETECT_FEM_OFF','GLYPH_DETECT_MALE_OFF','GLYPH_RIDDEN_FEM_OFF','GLYPH_RIDDEN_MALE_OFF'])if(range(g,k))return g-layout[k];return layout.NUMMONS;},
        IS_WALL:t=>t>0&&t<=layout.DBWALL,cansee:(x,y)=>{const row=pointer(pointer(global(19)+layout.viz_array)+y*8);return Boolean(view().getUint8(row+x)&layout.IN_SIGHT);},couldsee:(x,y)=>{const row=pointer(pointer(global(19)+layout.viz_array)+y*8);return Boolean(view().getUint8(row+x)&layout.COULD_SEE);},canspotmon:m=>Boolean(services.canseemon(m)||services.sensemon(m)),
        next2u:(x,y)=>services.dist2(x,y,u.ux,u.uy)<=2,
        intReference:(o,k)=>({address:o.address+layout['obj_'+k]}),
        get_iter_mons(fn){const i=['throne_mon_sound','beehive_mon_sound','morgue_mon_sound','zoo_mon_sound','temple_priest_sound','oracle_sound'].findIndex(k=>sounds[k]===fn);if(i<0)throw new Error('Review sounds predicate identity');return monster(services.get_iter_mons(i));},
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        pline1:p=>services.pline('%s',p),verbalize1:p=>services.verbalize('%s',p),You1:p=>services.You('%s',p),You_hear1:p=>services.You_hear('%s',p),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    for(const[name,mask]of Object.entries({is_animal:'M1_ANIMAL',is_flyer:'M1_FLY',carnivorous:'M1_CARNIVORE',herbivorous:'M1_HERBIVORE',humanoid:'M1_HUMANOID',perceives:'M1_SEE_INVIS',is_undead:'M2_UNDEAD',is_elf:'M2_ELF',is_dwarf:'M2_DWARF',is_gnome:'M2_GNOME',is_lord:'M2_LORD',is_prince:'M2_PRINCE',is_mercenary:'M2_MERC',likes_magic:'M2_MAGIC'}))env[name]=p=>Boolean(p[mask.startsWith('M1_')?'mflags1':'mflags2']&BigInt(layout[mask]));env.haseyes=p=>!(p.mflags1&BigInt(layout.M1_NOEYES));
    for(const[k,v]of Object.entries(layout))if(/^(M1_|M2_|STRAT_|W_)/.test(k))env[k]=BigInt(v);
    for(const[i,k]of equip.entries())Object.defineProperty(env,k,{get(){return object(services.equipment(i));}});
    Object.defineProperties(env,{Deaf:{get(){return either(layout.DEAF)||services.heroBit(2);}},Blind:{get(){return blocked(layout.BLINDED);}},Invis:{get(){return blocked(layout.INVIS);}},Hallucination:{get(){return Boolean(props[layout.HALLUC].intrinsic&&!either(layout.HALLUC_RES));}},Conflict:{get(){return either(layout.CONFLICT);}},Strangled:{get(){return props[layout.STRANGLED].intrinsic;}},Underwater:{get(){return services.heroBit(1);}},Upolyd:{get(){return u.umonnum!==u.umonster;}},Race_switch:{get(){return gu.urace.mnum;}},fmon:{get(){return monster(pointer(global(1)+layout.fmon));}},SYSOPT_SEDUCE:{get(){return view().getInt32(global(21)+layout.sysopt_seduce,true);}},nothing_happens:{get(){return services.commonString(0);}},
        soundprocs:{get(){return soundproc(global(20));},set(p){services.memcpy(global(20),p,BigInt(layout.soundSize));}},
    });
    for(const[name,k]of [['Is_astralevel','astral'],['Is_sanctum','sanctum'],['Is_oracle_level','oracle']])env[name]=l=>{const target=level(global(17)+layout[k]);return Boolean((target.dnum||target.dlevel)&&services.on_level(l,target));};env.In_endgame=l=>l.dnum===level(global(17)+layout.astral).dnum;
    for(const k of ['u_have_novel','which_armor','g_at','shop_object'])env[k]=(...a)=>object(services[k](...a));env.search_special=(...a)=>room(services.search_special(...a));
    env.t_at=(...a)=>{const p=addr(services.t_at(...a));return p?{address:p,get tseen(){return services.trapBit(p,0);},set tseen(v){services.setTrapBit(p,0,v);}}:0;};
    if(!state.source){const at=addr(services.storage(0));services.heap().fill(0,at,at+layout.soundSize);const p=soundproc(at);p.soundname=services.literal(sounds.nosound_procs.soundname);p.soundlib_id=layout[sounds.nosound_procs.soundlib_id];p.sound_triggers=sounds.nosound_procs.sound_triggers;state.source=at;}
    env.nosound_procs=soundproc(state.source);env.soundlib_choices=sounds.soundlib_choices.map(row=>({sndprocs:env.nosound_procs}));
    return env;
}
const cachedEnvironments=new WeakMap();
function environmentForCall(services,layout,state){
 let layouts=cachedEnvironments.get(services.moduleKey);
 if(!layouts){layouts=new WeakMap();cachedEnvironments.set(services.moduleKey,layouts);}
 let entry=layouts.get(layout);
 if(!entry){
  entry={active:services};
  const methods=new Map();
  const forwarding=new Proxy({}, {
   get(_target,key){
    const value=Reflect.get(entry.active,key,entry.active);
    if(typeof value!=='function')return value;
    let method=methods.get(key);
    if(!method){method=(...args)=>Reflect.apply(Reflect.get(entry.active,key,entry.active),entry.active,args);methods.set(key,method);}
    return method;
   },
   has:(_target,key)=>Reflect.has(entry.active,key),
  });
  entry.environment=createSoundsEnvironment(forwarding,layout,state);
  layouts.set(layout,entry);
 }
 return entry;
}
export function callSounds(services,layout,name,...args){const saved=services.stackSave();let entry,previous;try{let state=states.get(services.moduleKey);if(!state)states.set(services.moduleKey,state={source:0});entry=environmentForCall(services,layout,state);previous=entry.active;entry.active=services;const env=entry.environment;if(name==='nosoundAddress')return state.source;
    if(['mon_in_room','throne_mon_sound','beehive_mon_sound','morgue_mon_sound','zoo_mon_sound','temple_priest_sound','oracle_sound','growl_sound','growl','yelp','whimper','beg','maybe_gasp','cry_sound','mon_is_gecko','domonnoise','set_voice'].includes(name))args[0]=env.monster(args[0]);
    const result=withCEnvironment(env,sounds[name],...args);return typeof result==='string'?services.literal(result):result?.address??result??0;}finally{if(entry)entry.active=previous;services.stackRestore(saved);}
}
