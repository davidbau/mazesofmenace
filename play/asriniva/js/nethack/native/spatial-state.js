// Direct per-game spatial state. Native callers share cells and actor identities;
// byte-oriented reference/save providers still alias the same typed storage.
import {nativeStateFor} from './state-bridge.js';
import {createNativeGeometryPolicy,createNativeCoordinatesPolicy,createNativeTerrainPolicy,createNativeEngravingsPolicy,createNativeRegionsPolicy} from './spatial-policy.js';
const geometries=new WeakMap(),spaces=new WeakMap();
function publish(owner,namespace){for(const [name,fn]of Object.entries(namespace)){fn.nativeDirect=true;fn.nativePrepared=true;fn.nativeState=owner;owner.functions.set(name,fn);}return namespace;}
export function nativeGeometryFor(environment){
 if(geometries.has(environment))return geometries.get(environment);
 const owner=nativeStateFor(environment),{transport}=environment,C={coordxy:transport.short,int:transport.int,i16:transport.short,i32:transport.int};
 const geometry=publish(owner,{...createNativeGeometryPolicy(C),...createNativeCoordinatesPolicy(C)});geometries.set(environment,geometry);return geometry;
}
export function nativeSpatialFor(environment,layouts){
 if(spaces.has(environment))return spaces.get(environment);
 const owner=nativeStateFor(environment),arena=owner.nativeArena,views=owner.nativeRecords,{ctypes,transport,memory,services}=environment;
 if(!arena||!views)throw Error('Native spatial state requires the canonical game owner');
 const geometry=nativeGeometryFor(environment),at=name=>environment.requireGlobal(name),field=(type,base,name)=>ctypes.fieldAddress(type,base,name);
 const level=field('struct instance_globals_saved_l',at('svl'),'level'),map=field('dlevel_t',level,'locations'),width=layouts.hack.COLNO,height=layouts.hack.ROWNO,stride=ctypes.size('struct rm');
 const cells=Array.from({length:width},(_,x)=>Array.from({length:height},(_,y)=>views.record('struct rm',map+(x*height+y)*stride)));
 function occupancy(name,type){const base=field('dlevel_t',level,name);return Array.from({length:width},(_,x)=>{const row=Array(height);for(let y=0;y<height;y++){const p=base+(x*height+y)*8;let previous,record;Object.defineProperty(row,y,{enumerable:true,get(){const raw=arena.pointer(p);if(raw!==previous){record=views.record(type,raw);previous=raw;}return record;},set(value){arena.storePointer(p,value);previous=undefined;}});}return row;});}
 const monsters=occupancy('monsters','struct monst'),objects=occupancy('objects','struct obj');
 const u=views.record('struct you',at('u')),svd=views.record('struct instance_globals_saved_d',at('svd')),svm=views.record('struct instance_globals_saved_m',at('svm')),svn=views.record('struct instance_globals_saved_n',at('svn'));
 const C={...layouts.dbridge,coordxy:transport.short,int:transport.int,isok:geometry.isok,levl:cells,u,IS_WATERWALL:t=>t===layouts.dbridge.WATER,
  Is_juiblex_level:lev=>lev.dnum===svd.dungeon_topology.d_juiblex_level.dnum&&lev.dlevel===svd.dungeon_topology.d_juiblex_level.dlevel};
 const terrain=publish(owner,createNativeTerrainPolicy(C));
 const heads={trap:field('struct instance_globals_f',at('gf'),'ftrap'),engr:at('head_engr'),regions:field('struct instance_globals_r',at('gr'),'regions')};
 const engrContext={HEADSTONE:layouts.engrave.HEADSTONE,actual_text:layouts.engrave.actual_text,svm,
  strcmpi:(a,b)=>services.strncmpi(typeof a==='string'?services.literal(a):a,typeof b==='string'?services.literal(b):b,-1),
  strstri:(a,b)=>services.strstri(typeof a==='string'?services.literal(a):a,typeof b==='string'?services.literal(b):b)};
 Object.defineProperty(engrContext,'head_engr',{get:()=>views.record('struct engr',arena.pointer(heads.engr))});
 const engravingPolicy=createNativeEngravingsPolicy(engrContext);
 const engravings=publish(owner,{engr_at:(x,y)=>engravingPolicy.engr_at(transport.short(x),transport.short(y)),sengr_at:(s,x,y,strict)=>engravingPolicy.sengr_at(s,transport.short(x),transport.short(y),transport.char(strict))});
 // Preserve ordered region/rectangle traversal. Arrays are refreshed only when
 // their pointer or count changes; ordinary region queries reuse them.
 const regionViews=new Map();
 function region(raw){if(!raw)return 0;if(regionViews.has(raw))return regionViews.get(raw);const base=views.record('NhRegion',raw),out=Object.create(base);let rects,oldAt,oldCount;
  Object.defineProperty(out,'rects',{get(){const p=arena.pointer(field('NhRegion',raw,'rects')),n=base.nrects;if(p!==oldAt||n!==oldCount){rects=Array.from({length:n},(_,i)=>views.record('NhRect',p+i*ctypes.size('NhRect')));oldAt=p;oldCount=n;}return rects;}});regionViews.set(raw,out);return out;}
 let regionList=[],regionAt,regionCount;const gr={};Object.defineProperty(gr,'regions',{get(){const p=arena.pointer(heads.regions),n=svn.n_regions;if(p!==regionAt||n!==regionCount){regionList=Array.from({length:n},(_,i)=>region(arena.pointer(p+i*8)));regionAt=p;regionCount=n;}else for(let i=0;i<n;i++)regionList[i]=region(arena.pointer(p+i*8));return regionList;}});
 const regionPolicy=createNativeRegionsPolicy({svn,gr});
 const regions=publish(owner,{visible_region_at:(x,y)=>regionPolicy.visible_region_at(transport.short(x),transport.short(y)),any_visible_region:regionPolicy.any_visible_region});
 const t_at=publish(owner,{t_at(x,y){x=transport.short(x);y=transport.short(y);let trap=views.record('struct trap',arena.pointer(heads.trap));while(trap){if(trap.tx===x&&trap.ty===y)return trap.address;trap=trap.ntrap;}return 0;}}).t_at;
 const spatial={cells,monsters,objects,geometry,terrain,engravings,regions,t_at,region};owner.spatial=spatial;spaces.set(environment,spatial);return spatial;
}
