import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Compiler-derived live views and ABI/header expansions; room policy is mkroom.js.
import * as mkroom from '../../ported/mkroom.js';
import { withCEnvironment } from '../../c-runtime/context.js';
export function createMkroomEnvironment(services, layout) {
    for (const [key, expected] of Object.entries({pointerSize:8,intSize:4,longSize:8,shortSize:2,coordxySize:2,coordSize:4,config_SFCTOOL:0,config_SPECIALIZATION:0}))
        if (layout[key] !== expected) throw new Error('Review changed mkroom ABI: '+key);
    const raw = value => CAdapter.unsignedPointer(value);
    const addr = value => Number(value?.address??value??0);
    const ident = value => { const bits=raw(value); return bits>BigInt(Number.MAX_SAFE_INTEGER)?bits:Number(bits); };
    const view = () => CAdapter.currentDataView(services);
    const glob = index => addr(services.global(index));
    const pointer = at => ident(view().getBigUint64(at,true));
    const int = value => CAdapter.signedInt(value,true);
    const scalar = (obj,key,at,kind) => Object.defineProperty(obj,key,{get(){return view()['get'+kind](at(),true);},set(value){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(value):Number(value),true);}});
    const ptr = (obj,key,at,wrap=value=>value) => Object.defineProperty(obj,key,{get(){return wrap(pointer(at()));},set(value){view().setBigUint64(at(),raw(value),true);}});
    const indexed = (get,set) => new Proxy({}, {get(target,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(target,key);},set(target,key,value){if(typeof key==='string'&&/^-?\d+$/.test(key)&&set){set(Number(key),value);return true;}return Reflect.set(target,key,value);}});
    function fields(obj,at,prefix,definitions) {for(const [key,kind] of definitions){if(layout[prefix+key+'_size']!==Number(kind.match(/\d+/)[0])/8)throw new Error('Review changed mkroom field: '+prefix+key);scalar(obj,key,()=>at+layout[prefix+key],kind);}return obj;}
    function coord(value){const at=addr(value);return at?fields({address:ident(value)},at,'coord_',[['x','Int16'],['y','Int16']]):0;}
    function room(value){const at=addr(value);if(!at)return 0;const r=fields({address:ident(value)},at,'room_',[['lx','Int16'],['hx','Int16'],['ly','Int16'],['hy','Int16'],['rtype','Int8'],['orig_rtype','Int8'],['rlit','Int8'],['needfill','Int8'],['needjoining','Int8'],['doorct','Int8'],['nsubrooms','Int8'],['irregular','Int8'],['roomnoidx','Int8'],['fdoor','Int32']]);
        ptr(r,'resident',()=>at+layout.room_resident);r.sbrooms=indexed(i=>room(pointer(at+layout.room_sbrooms+i*layout.pointerSize)),(i,v)=>view().setBigUint64(at+layout.room_sbrooms+i*layout.pointerSize,raw(v),true));return r;}
    function object(value){const at=addr(value);return at?fields({address:ident(value)},at,'obj_',[['quan','BigInt64'],['owt','Uint32'],['spe','Int8'],['otyp','Int16']]):0;}
    function monster(value){const at=addr(value);if(!at)return 0;const mon={address:ident(value)};for(const [i,key]of ['msleeping','mpeaceful'].entries())Object.defineProperty(mon,key,{get(){return services.monsterBit(mon,i);},set(v){services.setMonsterBit(mon,i,v);}});return mon;}
    const permonst = value => raw(value)?{address:ident(value)}:0;
    function stairs(value){const at=addr(value);if(!at)return 0;const st=fields({address:ident(value)},at,'stair_',[['sx','Int16'],['sy','Int16'],['up','Int8']]);ptr(st,'next',()=>at+layout.stair_next,stairs);return st;}
    const svr={rooms:indexed(i=>room(glob(0)+layout.rooms+i*layout.roomSize))},svn={},gs={},gn={},svl={level:{flags:{}}},svd={},svm={},u={};
    scalar(svn,'nroom',()=>glob(1)+layout.nroom,'Int32');scalar(gn,'nsubroom',()=>glob(3)+layout.nsubroom,'Int32');
    gs.subrooms=indexed(i=>room(addr(pointer(glob(2)+layout.subrooms))+i*layout.roomSize));ptr(gs,'stairs',()=>glob(2)+layout.stairs,stairs);
    svd.doors=indexed(i=>coord(addr(pointer(glob(5)+layout.doors))+i*layout.coordSize));
    for(const [i,key]of ['is_maze_lev','has_court','has_barracks','has_zoo','has_morgue','has_swamp','has_beehive','has_temple','graveyard'].entries())Object.defineProperty(svl.level.flags,key,{get(){return services.levelBit(i);},set(v){services.setLevelBit(i,v);}});
    svm.mvitals=indexed(i=>fields({address:glob(6)+layout.mvitals+i*layout.vitalSize},glob(6)+layout.mvitals+i*layout.vitalSize,'vital_',[['mvflags','Uint8']]));
    u.uz=fields({address:glob(7)+layout.u_uz},glob(7)+layout.u_uz,'level_',[['dnum','Int16'],['dlevel','Int16']]);
    const terrain=(x,y)=>{const at=glob(4)+layout.terrain+(x*layout.ROWNO+y)*layout.terrainSize;const cell=fields({address:at},at,'terrain_',[['typ','Int8']]);for(const [i,key]of ['lit','roomno','edge','altarmask'].entries())Object.defineProperty(cell,key,{get(){return services.terrainBit(x,y,i);},set(v){services.setTerrainBit(x,y,i,v);}});return cell;};
    const levl=indexed(x=>indexed(y=>terrain(x,y)));
    const mons=indexed(i=>permonst(glob(11)+i*layout.permonstSize));
    const shtypes=indexed(i=>{const at=glob(9)+i*layout.shopSize;const row=fields({address:at},at,'shop_',[['prob','Int32'],['symb','Int8']]);ptr(row,'name',()=>at+layout.shop_name);return row;});
    const def_oc_syms=indexed(i=>fields({address:glob(10)+i*layout.symSize},glob(10)+i*layout.symSize,'sym_',[['sym','Int8']]));
    const env=Object.assign(Object.create(services),layout,{room,coord,object,monster,permonst,svr,svn,gs,gn,svl,svd,svm,u,levl,mons,shtypes,def_oc_syms,int,
        long:v=>BigInt.asIntN(64,BigInt(v)),short:v=>int(v)<<16>>16,coordxy:v=>int(v)<<16>>16,char:v=>int(v)<<24>>24,boolean:v=>int(v)<<24>>24,bool:v=>Number(Boolean(v)),
        samePtr:(a,b)=>raw(a)===raw(b),roomNext:r=>room(raw(r)+BigInt(layout.roomSize)),roomDifference:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b))/BigInt(layout.roomSize),
        coordLocal:()=>coord(services.stackAlloc(layout.coordSize)),shrineCoord:()=>coord(services.shrine()),nroomRef:()=>({address:glob(1)+layout.nroom}),loadChar:p=>view().getInt8(addr(p)),
        IS_ROOM:t=>t>=layout.ROOM,IS_WALL:t=>Boolean(t&&t<=layout.DBWALL),IS_DOOR:t=>t===layout.DOOR,IS_THRONE:t=>t===layout.THRONE,SPACE_POS:t=>t>layout.DOOR,
        OBJ_AT:(x,y)=>Boolean(pointer(glob(4)+layout.floorObjects+(x*layout.ROWNO+y)*layout.pointerSize)),MON_AT:(x,y)=>Boolean(pointer(glob(4)+layout.floorMonsters+(x*layout.ROWNO+y)*layout.pointerSize)),
        In_endgame:level=>level.dnum===view().getInt16(glob(5)+layout.astral+layout.level_dnum,true),
        min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        squadprob:mkroom.squadprob.map(row=>({pm:layout[row.pm],prob:row.prob})),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    Object.defineProperties(env,{wizard:{get(){return view().getInt8(glob(8)+layout.wizard);}},ubirthday:{get(){return services.birthday();}},Inhell:{get(){return services.In_hell(u.uz);}}});
    for(const key of ['makemon','revive'])env[key]=(...args)=>monster(services[key](...args));
    for(const key of ['mkclass'])env[key]=(...args)=>permonst(services[key](...args));
    for(const key of ['mkgold','mk_tt_object','mksobj_at','mkobj','add_to_container','mkobj_at','mksobj','sobj_at'])env[key]=(...args)=>object(services[key](...args));
    return env;
}
export function callMkroom(services,layout,name,...args){const env=createMkroomEnvironment(services,layout);
    if(['isbig','fill_zoo','has_dnstairs','has_upstairs','somex','somey','inside_room','somexy','somexyspace','invalid_shop_shape'].includes(name))args[0]=env.room(args[0]);
    if(['somexy','somexyspace'].includes(name))args[1]=env.coord(args[1]);if(name==='mkundead')args[0]=env.coord(args[0]);
    if(['save_room','rest_room'].includes(name))args[1]=env.room(args[1]);
    const result=withCEnvironment(env,mkroom[name],...args);return result?.address??result??0;
}
