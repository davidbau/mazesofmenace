// Next level-generation owners on shared storage; source policies unchanged.
import {callRegion} from '../nethack/bindings/region.js';
import {enableDig} from './dig.js';
import {make_grave,random_engraving,rubouts} from '../ported/engrave.js';
import {enableRandomText} from './random-text.js';
import {enableVision} from './vision.js';
import abi from './trap-abi.json' with {type:'json'};
import * as trap from '../ported/trap.js';
import {invocation_pos,in_rooms} from '../ported/hack.js';
import {callTrap} from '../nethack/bindings/trap.js';
import {antholemon,courtmon,mkundead,squadprob,fill_zoo,cmap_to_type,do_mkroom,has_dnstairs,has_upstairs,inside_room,somex,somey,somexy,somexyspace,save_rooms,rest_rooms,search_special} from '../ported/mkroom.js';
import {enableSchemaPort} from './schema-port.js';
export function enableLevelContents(environment,layouts,creation){
 if(!environment.hasFunction('m_dowear'))environment.enableMonsterInventory(layouts);
 const randomText=enableRandomText(environment,layouts),engraving=environment.start('world-engravings').environment;
 engraving.get_rnd_text=(name,out,rng,pad)=>{if(rng!==engraving.rn2)throw new Error('Unexpected engraving RNG callback');return environment.resolve('get_rnd_text')(name,out,environment.functionPointer('rn2','ii'),pad);};
 const text=p=>typeof p==='string'?environment.services.literal(p):environment.address(p);
 engraving.rubouts=rubouts.map(row=>({...row,wipeto:environment.services.literal(row.wipeto)}));
 engraving.strlen=p=>BigInt(environment.memory.strlen(text(p)));engraving.strchr=(p,ch)=>environment.services.strchr(text(p),ch);
 engraving.loadChar=p=>environment.transport.read('Int8',text(p));engraving.storeChar=(p,v)=>environment.transport.write('Int8',environment.address(p),v);
 engraving.rn2=(n,line,caller)=>{if(environment.services.rng_log_enabled())environment.services.rng_log_set_caller(environment.services.literal('engrave.c'),line,environment.services.literal(caller));return environment.services.rn2(n);};
 environment.extend('world-engravings',{make_grave,random_engraving});
 const vision=enableVision(environment,layouts);
 const regions=environment.start('region-reset').environment;environment.extend('region-reset',Object.fromEntries(['visible_region_at','any_visible_region'].filter(name=>!environment.hasFunction(name)).map(name=>[name,(...args)=>callRegion(regions,layouts.region,name,...args)])));
 enableDig(environment,layouts);
 const position=creation.context(layouts.hack);Object.defineProperty(position,'svi',{value:creation.views.record('struct instance_globals_saved_i',environment.requireGlobal('svi'))});position.Invocation_lev=lev=>environment.resolve('Invocation_lev')(environment.address(lev));Object.defineProperty(position,'svr',{value:creation.views.record('struct instance_globals_saved_r',environment.requireGlobal('svr'))});
 position.in_rooms_buf=environment.allocateGlobal('hack.in_rooms.buf',5);position.charPointer=p=>typeof p==='string'?environment.services.literal(p):environment.address(p);
 Object.defineProperty(position,'HEAP8',{get:()=>environment.services.signedHeap()});
 const numeric=k=>typeof k==='string'&&/^-?\d+$/.test(k),cell=(x,y)=>new Proxy(creation.environment.levl[x][y],{get:(o,k,r)=>numeric(k)?creation.views.advance(o,Number(k)):Reflect.get(o,k,r)});
 Object.defineProperty(position,'levl',{value:new Proxy({}, {get:(_,x)=>new Proxy({}, {get:(_,y)=>cell(Number(x),Number(y))})})});
 environment.register('level-invocation',{invocation_pos,in_rooms},position);
 const traps=enableSchemaPort(environment,'trap',trap,trap.trapSchema,abi.layout,callTrap,['maketrap','t_at']);
 const room=creation.context(layouts.mkroom),{views}=creation;
 // Original MKROOM bridge materializes these native struct obj* returns.
 for(const name of ['mkgold','mk_tt_object','mksobj_at','mkobj','add_to_container','mkobj_at','mksobj','sobj_at'])room[name]=(...args)=>views.record('struct obj',environment.resolve(name)(...args.map(v=>v?.address??v)));
 const shrine=environment.allocateGlobal('mkroom.shrine',environment.ctypes.size('coord'));room.shrineCoord=()=>views.record('coord',shrine);
 // Native rm.altarmask aliases the measured flags field.
 const roomCells=new WeakMap(),roomCell=cell=>{if(!roomCells.has(cell))roomCells.set(cell,new Proxy(cell,{get:(o,k,r)=>k==='altarmask'?o.flags:Reflect.get(o,k,r),set:(o,k,v,r)=>k==='altarmask'?(o.flags=v,true):Reflect.set(o,k,v,r)}));return roomCells.get(cell);};
 Object.defineProperty(room,'levl',{value:new Proxy({}, {get:(_,x)=>new Proxy({}, {get:(_,y)=>roomCell(creation.environment.levl[x][y])})})});
 Object.defineProperty(room,'shtypes',{get:()=>new Proxy({}, {get:(_,key)=>{if(typeof key!=='string'||!/^\d+$/.test(key))return undefined;const at=environment.requireGlobal('shtypes')+Number(key)*layouts.mkroom.shopSize;return {name:Number(environment.memory.view.getBigUint64(at+layouts.mkroom.shop_name,true)),prob:environment.memory.view.getInt32(at+layouts.mkroom.shop_prob,true),symb:environment.memory.view.getInt8(at+layouts.mkroom.shop_symb)};}})});

 for(const [name,type]of [['gn','struct instance_globals_n'],['svr','struct instance_globals_saved_r']])Object.defineProperty(room,name,{value:views.record(type,environment.requireGlobal(name))});
 const roomSvd=Object.create(views.record('struct instance_globals_saved_d',environment.requireGlobal('svd')));
 Object.defineProperty(roomSvd,'doors',{get:()=>{const at=environment.ctypes.locate('struct instance_globals_saved_d',environment.requireGlobal('svd'),'doors').at,base=Number(environment.memory.view.getBigUint64(at,true));return new Proxy({address:base},{get:(o,k)=>typeof k==='string'&&/^\d+$/.test(k)?views.record('coord',base+Number(k)*environment.ctypes.size('coord')):Reflect.get(o,k)});}});
 Object.defineProperty(room,'svd',{value:roomSvd});
 const sharedGs=views.record('struct instance_globals_s',environment.requireGlobal('gs')),roomGs=Object.create(sharedGs);
 Object.defineProperty(roomGs,'subrooms',{get:()=>{const at=environment.ctypes.locate('struct instance_globals_s',environment.requireGlobal('gs'),'subrooms').at,base=Number(environment.memory.view.getBigUint64(at,true));return new Proxy({address:base},{get:(o,k)=>typeof k==='string'&&/^\d+$/.test(k)?views.record('struct mkroom',base+Number(k)*environment.ctypes.size('struct mkroom')):Reflect.get(o,k)});}});
 Object.defineProperty(room,'gs',{value:roomGs});
 Object.defineProperty(room,'ubirthday',{get:()=>environment.ctypes.load('time_t',environment.requireGlobal('ubirthday'))});
 Object.assign(room,{squadprob:squadprob.map(row=>({pm:layouts.mkroom[row.pm],prob:row.prob})),SPACE_POS:t=>t>layouts.mkroom.DOOR,IS_THRONE:t=>t===layouts.mkroom.THRONE,roomNext:r=>views.advance(r,1),bool:v=>Number(Boolean(v)),IS_WALL:t=>Boolean(t&&t<=layouts.mkroom.DBWALL),roomDifference:(a,b)=>BigInt(environment.address(a)-environment.address(b))/BigInt(environment.ctypes.size('struct mkroom'))});
 room.nroomRef=()=>({address:environment.ctypes.locate('struct instance_globals_saved_n',environment.requireGlobal('svn'),'nroom').at});
 for(const direction of ['sfo','sfi'])for(const type of ['int','mkroom'])room[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(fp,p,tag)=>environment.resolve(direction+'_'+type)(environment.address(fp),environment.address(p),typeof tag==='string'?environment.services.literal(tag):environment.address(tag));
 for(const kind of ['rn1','rn2','rnd'])room[kind]=(...args)=>{const count=kind==='rn1'?2:1,[line,caller]=args.slice(count);if(environment.services.rng_log_enabled())environment.services.rng_log_set_caller(environment.services.literal('mkroom.c'),line,environment.services.literal(caller));return kind==='rn1'?environment.transport.int(environment.services.rn2(environment.transport.int(args[0]))+environment.transport.int(args[1])):environment.services[kind](...args.slice(0,count));};
 environment.register('room-queries',{antholemon,courtmon,mkundead,fill_zoo,cmap_to_type,do_mkroom,has_dnstairs,has_upstairs,inside_room,somex,somey,somexy,somexyspace,save_rooms,rest_rooms,search_special},room,{prepareArgs:(name,args)=>{if(name==='antholemon'||name==='courtmon')return args;if(name==='mkundead')return [views.record('struct nhcoord',args[0]),environment.transport.char(args[1]),environment.transport.int(args[2])];if(name==='do_mkroom'||name==='cmap_to_type'){args[0]=environment.transport.int(args[0]);return args;}if(name==='search_special'){args[0]=environment.transport.char(args[0]);return args;}if(['save_rooms','rest_rooms'].includes(name)){args[0]=environment.address(args[0]);return args;}args[0]=views.record('struct mkroom',args[0]);if(['somexy','somexyspace'].includes(name))args[1]=views.record('coord',args[1]);return args;}});
 return {traps,room,vision,randomText,limitation:'Trap and room dependency integration in progress; complete level generation and full-game recording are not accepted.'};
}
