import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Compiler-described ABI and header macros; all34 original algorithms and data
// initializers remain in attrib.js. Heap views are refreshed after dependencies.
export function createAttribEnvironment(services, layout, source) {
    for(const[k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,booleanSize:1,coordSize:2,charSigned:1,programMoveloopSize:4,flagsInitalignSize:4,flagsVerboseSize:1,moveSize:8,multiSize:8,nextCheckSize:8,innate_ulevel_size:1,innate_ability_size:8,innate_gainstr_size:8,innate_losestr_size:8,prop_intrinsic_size:8,prop_extrinsic_size:8,prop_blocked_size:8,obj_quan_size:8}))if(layout[k]!==v)throw new Error('Review changed ATTRIB ABI: '+k);
    for(const key of['acurr','amax','abon','aexe','atemp','atime'])if(layout['u_'+key+'_size']!==layout.A_MAX)throw new Error('Review changed ATTRIB attribute array '+key);
    for(const [prefix,keys]of[['role',['attrbase','attrdist']],['race',['attrmin','attrmax']]])for(const key of keys)if(layout[prefix+'_'+key+'_size']!==layout.A_MAX*2)throw new Error('Review changed ATTRIB role/race array '+key);
    if(layout.u_uhpinc_size!==layout.MAXULEV*2)throw new Error('Review changed ATTRIB HP increments');
    const address=v=>Number(v?.address??v??0),raw=v=>CAdapter.unsignedPointer(v);
    const view=()=>CAdapter.currentDataView(services),global=i=>address(services.global(i));
    const pointer=at=>CAdapter.readPointerNumber(view,at);
    const int=v=>CAdapter.signedInt(v);
    const indexed=(get,set)=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);},set(obj,key,value){if(typeof key==='string'&&/^-?\d+$/.test(key)){set(Number(key),value);return true;}return Reflect.set(obj,key,value);}});
    const field=(obj,key,at,kind)=>Object.defineProperty(obj,key,{get(){return view()['get'+kind](at(),true);},set(v){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(v):Number(v),true);}});
    const sized=(obj,key,at,size,signed=true)=>{if(![1,2,4].includes(size))throw new Error('Review ATTRIB scalar width: '+key);field(obj,key,at,(signed?'Int':'Uint')+(size*8));};
    const ptr=(obj,key,at,wrap)=>Object.defineProperty(obj,key,{get(){return wrap(pointer(at()));},set(v){view().setBigUint64(at(),raw(v),true);}});
    const array=(at,kind,size)=>indexed(i=>view()['get'+kind](at()+i*size,true),(i,v)=>view()['set'+kind](at()+i*size,kind.startsWith('Big')?BigInt(v):Number(v),true));
    const structure=(at,prefix,keys)=>{const obj={address:at};for(const key of keys)sized(obj,key,()=>at+layout[prefix+'_'+key],layout[prefix+'_'+key+'_size']);return obj;};
    function object(v){const at=address(v);if(!at)return 0;const obj=structure(at,'obj',['otyp']);ptr(obj,'nobj',()=>at+layout.obj_nobj,object);field(obj,'quan',()=>at+layout.obj_quan,'BigInt64');sized(obj,'oartifact',()=>at+layout.obj_oartifact,layout.obj_oartifact_size,true);for(const[i,key]of['cursed','blessed','dknown'].entries())Object.defineProperty(obj,key,{get(){return services.objectBit(obj,i);}});return obj;}
    function permonst(v){const at=address(v);if(!at)return 0;const obj=structure(at,'pm',['mlet']);sized(obj,'geno',()=>at+layout.pm_geno,layout.pm_geno_size,false);return obj;}
    const longPointer=v=>{const at=address(v);if(!at)return 0;const obj={address:at};field(obj,'value',()=>at,'BigInt64');return obj;};
    const propAt=(index,key)=>global(0)+layout.u_uprops+index*layout.propSize+layout['prop_'+key];
    const intrinsicPointer=index=>longPointer(propAt(index,'intrinsic')),extrinsicPointer=index=>longPointer(propAt(index,'extrinsic'));
    const named={HSearching:'SEARCHING',HStealth:'STEALTH',HFast:'FAST',HPoison_resistance:'POISON_RES',HWarning:'WARNING',HSleep_resistance:'SLEEP_RES',HSee_invisible:'SEE_INVIS',HFire_resistance:'FIRE_RES',HCold_resistance:'COLD_RES',HShock_resistance:'SHOCK_RES',HTeleport_control:'TELEPORT_CONTROL',HInfravision:'INFRAVISION'};
    const intrinsicNamed=name=>{if(!(name in named))throw new Error('Unknown original ATTRIB ability '+name);return intrinsicPointer(layout[named[name]]);};
    function innate(v){const at=address(v);if(!at)return 0;const obj=structure(at,'innate',['ulevel']);ptr(obj,'ability',()=>at+layout.innate_ability,longPointer);ptr(obj,'gainstr',()=>at+layout.innate_gainstr,v=>v);ptr(obj,'losestr',()=>at+layout.innate_losestr,v=>v);return obj;}
    const tables={},tableNames=Object.keys(source).filter(k=>Array.isArray(source[k])&&/_abil$/.test(k));let row=0;
    const tableBase=address(services.tableStorage()),tableCount=services.tableCount();
    if(tableNames.reduce((n,k)=>n+source[k].length,0)!==tableCount)throw new Error('Review changed ATTRIB innate rows');
    for(const name of tableNames){tables[name]=innate(tableBase+row*layout.innateSize);for(const [level,ability,gain,loss] of source[name]){const out=innate(tableBase+row++*layout.innateSize);out.ulevel=level;out.ability=ability?intrinsicNamed(ability):0;out.gainstr=gain===0?0:services.literal(gain);out.losestr=loss===0?0:services.literal(loss);}}
    const names=address(services.attrnameStorage());for(let i=0;i<source.attrname.length;i++)view().setBigUint64(names+i*8,raw(services.literal(source.attrname[i])),true);
    const u=structure(global(0),'u',['ux','uy','ulevel','uhp','uhpmax','uhppeak','mh','mhmax','umonnum','umonster','ulycn','uhunger','ublessed','uluck','moreluck']);
    for(const key of['uhs','ucreamed'])sized(u,key,()=>global(0)+layout['u_'+key],layout['u_'+key+'_size'],false);
    ptr(u,'usteed',()=>global(0)+layout.u_usteed,v=>v);
    u.ualign=structure(global(0)+layout.u_ualign,'align',['type','record']);sized(u.ualign,'abuse',()=>global(0)+layout.u_ualign+layout.align_abuse,layout.align_abuse_size,false);
    u.ualignbase=array(()=>global(0)+layout.u_ualignbase,'Int8',1);u.uhpinc=array(()=>global(0)+layout.u_uhpinc,'Int16',2);u.uz={address:global(0)+layout.u_uz};u.uroleplay={};for(const[i,key]of['blind','deaf'].entries())Object.defineProperty(u.uroleplay,key,{get(){return services.roleplayBit(i);}});
    u.uprops=indexed(i=>{const obj={};for(const key of['intrinsic','extrinsic','blocked'])field(obj,key,()=>propAt(i,key),'BigInt64');return obj;});
    for(const key of['acurr','abon','atemp'])u[key]={a:array(()=>global(0)+layout['u_'+key],'Int8',1)};
    function roleRace(at,prefix){const obj=structure(at,prefix,['mnum',...(prefix==='role'?['xlev','initrecord']:[])]);for(const key of prefix==='role'?['attrbase','attrdist']:['attrmin','attrmax'])obj[key]=array(()=>at+layout[prefix+'_'+key],'Int16',2);obj.hpadv=structure(at+layout[prefix+'_hpadv'],'adv',['infix','inrnd','lofix','lornd','hifix','hirnd']);return obj;}
    const gu={urole:roleRace(global(1),'role'),urace:roleRace(global(2),'race')},gy={};Object.defineProperty(gy,'youmonst',{get(){const at=global(3);return {address:at,get data(){return permonst(services.heroData());}};}});
    const gi={},svm={},gm={},svc={context:{}},svk={killer:{}},flags={},program_state={},disp={};
    ptr(gi,'invent',()=>global(4),object);field(svm,'moves',()=>global(5),'BigInt64');field(gm,'multi',()=>global(6),'BigInt64');field(svc.context,'next_attrib_check',()=>global(7),'BigInt64');field(svk.killer,'format',()=>global(8),'Int32');Object.defineProperty(svk.killer,'name',{get(){return global(9);}});field(flags,'initalign',()=>global(10),'Int32');field(flags,'verbose',()=>global(11),'Int8');field(program_state,'in_moveloop',()=>global(12),'Int32');Object.defineProperty(disp,'botl',{get(){return services.botl();},set(v){services.setBotl(v);}});
    const env=Object.assign(Object.create(services),layout,tables,{u,gu,gy,gi,svm,gm,svc,svk,flags,program_state,disp,object,permonst,longPointer,innate,intrinsicPointer,extrinsicPointer,intrinsicNamed,address,int,
        attribState:{buf:address(services.fromWhatBuffer())},nextInnate:v=>innate(address(v)+layout.innateSize),
        samePtr:(a,b)=>raw(a)===raw(b),schar:v=>int(v)<<24>>24,short:v=>int(v)<<16>>16,uint:v=>int(v)>>>0,
        max:(a,b)=>a>b?a:b,min:(a,b)=>a<b?a:b,abs:v=>int(Math.abs(int(v))),
        STR18:v=>18+v,STR19:v=>100+v,Role_if:role=>gu.urole.mnum===role,
        ATTRMIN:i=>gu.urace.attrmin[i],ATTRMAX:i=>i===layout.A_STR&&env.Upolyd?services.uasmon_maxStr():gu.urace.attrmax[i],
        ismnum:i=>i>=layout.LOW_PM&&i<layout.NUMMONS,nhUse(){},
        loadChar:at=>view().getInt8(address(at)),storeChar:(at,v)=>view().setInt8(address(at),v),
        mons:indexed(i=>permonst(global(14)+i*layout.permonstSize)),
        aligns:indexed(i=>{const at=global(15)+i*layout.alignDescSize,obj={};ptr(obj,'adj',()=>at+layout.alignDesc_adj,v=>v);sized(obj,'value',()=>at+layout.alignDesc_value,layout.alignDesc_value_size);return obj;}),
        objects:indexed(i=>({get oc_name_known(){return services.objectNameKnown(i);}})),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    for(const key of['FROMEXPER','FROMRACE','FROMOUTSIDE','FROMFORM','INTRINSIC','TIMEOUT','W_ARMF','W_ARMC','W_ARMH','LL_ALIGNMENT'])env[key]=BigInt(layout[key]);
    for(const[key,field_]of Object.entries({ABASE:'acurr',AMAX:'amax',ABON:'abon',AEXE:'aexe',ATEMP:'atemp',ATIME:'atime'}))env[key]=array(()=>global(0)+layout['u_'+field_],'Int8',1);
    const flagNames=['Fixed_abil','Poison_resistance','Half_gas_damage','Wounded_legs','Upolyd','Hallucination','Confusion','Sick','Vomiting','Fumbling','Blindfolded_only','Very_fast','wizard','HClairvoyant','BClairvoyant','HRegeneration','HStun','HBlnd_resist','HFast','EFast','HBlinded','EBlinded','BBlinded','BlindedTimeout'];
    for(const[i,key]of flagNames.entries())Object.defineProperty(env,key,{get(){const value=services.flag(i);return i<13?Boolean(value):BigInt(value);}});
    Object.defineProperties(env,{ALIGNLIM:{get(){return 10n+svm.moves/200n;}},Role_switch:{get(){return gu.urole.mnum;}},Race_switch:{get(){return gu.urace.mnum;}}});
    for(const[i,key]of['uarmh','uarmg','uarmf','uarmc','ublindf'].entries())Object.defineProperty(env,key,{get(){return object(services.equipment(i));}});
    env.what_gives=(...args)=>object(services.what_gives(...args));env.carrying=(...args)=>object(services.carrying(...args));
    return env;
}
