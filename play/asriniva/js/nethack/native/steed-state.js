// Native STEED roots and lookup arrays; header rules retain upstream order.
import {nativeStateFor} from './state-bridge.js';
export function createNativeSteedState(environment,layouts,services,namespace){
 const layout=layouts.steed,owner=nativeStateFor(environment),views=owner.nativeRecords,arena=owner.nativeArena,t=environment.transport;
 const address=environment.address,raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0)),view=()=>arena.view,pointer=p=>arena.pointer(p);
 const int=t.int,boolean=t.char,coordxy=t.short,long=t.long;
 const object=p=>views.record('struct obj',p),monster=p=>views.record('struct monst',p),permonst=p=>views.record('struct permonst',p),level=p=>views.record('struct d_level',p),trap=p=>views.record('struct trap',p);
 const roots={};for(const[name,type]of Object.entries({u:'you',gy:'instance_globals_y',gu:'instance_globals_u',gi:'instance_globals_i',gv:'instance_globals_v',disp:'display_hints',iflags:'instance_flags',flags:'flag'}))roots[name]=views.record('struct '+type,environment.requireGlobal(name));
 const {u,gy,gu,gi,gv,disp,iflags,flags}=roots;
 function table(type,base,stride,length){const out=Array(length);for(let i=0;i<length;i++)Object.defineProperty(out,i,{enumerable:true,configurable:true,get(){const value=views.record(type,base+i*stride);Object.defineProperty(out,i,{value,enumerable:true});return value;}});return out;}
 const mons=table('struct permonst',environment.requireGlobal('mons'),layout.permonstSize,layouts.makemon.NUMMONS);
 const objects=table('struct objclass',environment.requireGlobal('objects'),layout.objectClassSize,layouts.o_init.NUM_OBJECTS);
 const properties=table('struct prop',u.address+layout.u_uprops,layout.propSize,u.uprops.length);
 const skills=table('struct skills',u.address+layout.u_weapon_skills,layout.skillSize,u.weapon_skills.length);
 const speciesCache=new WeakMap(),dataOffset=environment.ctypes.record('struct monst').fields.data.offset;
 function species(mon){const p=arena.pointer(address(mon)+dataOffset),old=speciesCache.get(mon);if(old?.pointer===p)return old.value;const value=permonst(p);speciesCache.set(mon,{pointer:p,value});return value;}
 const actorLink=at=>{let previous,value;return ()=>{const p=arena.pointer(at);if(p!==previous){value=monster(p);previous=p;}return value;};};
 const mount=actorLink(u.address+layout.u_usteed),grabber=actorLink(u.address+layout.u_ustuck);
 const prop=(id,key)=>properties[id][key],active=id=>Boolean(prop(id,'intrinsic')||prop(id,'extrinsic')),unblocked=id=>active(id)&&!prop(id,'blocked');
 let grid;const svl={level:{get monsters(){if(owner.spatial)return owner.spatial.monsters;if(!grid){const base=environment.requireGlobal('svl')+layout.floorMonsters;grid=Array.from({length:layout.COLNO},(_,x)=>Array.from({length:layout.ROWNO},()=>0));for(let x=0;x<layout.COLNO;x++)for(let y=0;y<layout.ROWNO;y++){const at=base+(x*layout.ROWNO+y)*8;Object.defineProperty(grid[x],y,{get:()=>monster(arena.pointer(at)),set:v=>arena.storePointer(at,v),enumerable:true});}}return grid;}}};
 const locals=new WeakSet();function localCoord(){const reservation=t.stackAlloc.reserve(layout.coordSize);let x=0,y=0,at;const out={get address(){reservation.assertAlive();if(at===undefined){at=reservation();arena.view.setInt16(at,x,true);arena.view.setInt16(at+2,y,true);}return at;},get x(){reservation.assertAlive();return at===undefined?x:arena.view.getInt16(at,true);},set x(v){reservation.assertAlive();v=t.short(v);if(at===undefined)x=v;else arena.view.setInt16(at,v,true);},get y(){reservation.assertAlive();return at===undefined?y:arena.view.getInt16(at+2,true);},set y(v){reservation.assertAlive();v=t.short(v);if(at===undefined)y=v;else arena.view.setInt16(at+2,v,true);}};locals.add(out);return out;}
 const coord=p=>locals.has(p)?p:views.record('struct nhcoord',p);
 function nativeByteBuffer(size){const reservation=t.stackAlloc.reserve(size),pending=new Map();let at;return {nativeBytes:true,get address(){reservation.assertAlive();if(at===undefined){at=reservation();for(const[i,v]of pending)arena.view.setInt8(at+i,v);}return at;},store(i,v){reservation.assertAlive();if(i<0||i>=size)throw RangeError('Native byte buffer extent');v=t.char(v);if(at===undefined)pending.set(i,v);else arena.view.setInt8(at+i,v);},load(i){reservation.assertAlive();if(i<0||i>=size)throw RangeError('Native byte buffer extent');return at===undefined?pending.get(i)??0:arena.view.getInt8(at+i);}};}
    const flag=(pm,key)=>Boolean(pm.mflags1&BigInt(layout[key]));
    const samePtr=(a,b)=>(a?.address??a??0)===(b?.address??b??0);
    const is_flyer=pm=>flag(pm,'M1_FLY');
    const is_floater=pm=>pm.mlet===layout.S_EYE||pm.mlet===layout.S_LIGHT;
    const is_swimmer=pm=>flag(pm,'M1_SWIM');
    const env=Object.assign({},layout,{
        address,int,boolean,coordxy,long,object,monster,permonst,coord,level,trap,
        W_SADDLE:BigInt(layout.W_SADDLE),BOTH_SIDES:BigInt(layout.BOTH_SIDES),
        u,gy,gu,gi,gv,disp,iflags,svl,mons,objects,samePtr,
        callLocal:(fn,...args)=>fn(...args),
        coordLocal:localCoord,
        coordArrayLocal:count=>Array.from({length:count},localCoord),
        copyCoord(dst,src){dst.x=src.x;dst.y=src.y;},
        loadChar:at=>at?.nativeBytes?at.load(0):view().getInt8(address(at)),storeChar:(at,value)=>at?.nativeBytes?at.store(0,value):view().setInt8(address(at),value),
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        M_AP_TYPE:mon=>mon.m_ap_type&layout.M_AP_TYPMASK,
        DEADMONSTER:mon=>mon.mhp<1,
        m_at:(x,y)=>svl.level.monsters[x][y],MON_AT:(x,y)=>Boolean(svl.level.monsters[x][y]),
        remove_monster:(x,y)=>{svl.level.monsters[x][y]=0;},
        u_at:(x,y)=>u.ux===x&&u.uy===y,
        Role_if:pm=>gu.urole.mnum===pm,
        P_SKILL:skill=>skills[skill].skill,
        DIR_RIGHT:dir=>int(dir+1)%layout.N_DIRS,DIR_LEFT:dir=>int(dir+7)%layout.N_DIRS,
        NODIAG:pm=>pm===layout.PM_GRID_BUG,
        humanoid:pm=>flag(pm,'M1_HUMANOID'),amorphous:pm=>flag(pm,'M1_AMORPHOUS'),
        noncorporeal:pm=>pm.mlet===layout.S_GHOST,unsolid:pm=>flag(pm,'M1_UNSOLID'),
        is_whirly:pm=>pm.mlet===layout.S_VORTEX||samePtr(pm,mons[layout.PM_AIR_ELEMENTAL]),
        verysmall:pm=>pm.msize<layout.MZ_SMALL,bigmonst:pm=>pm.msize>=layout.MZ_LARGE,
        is_flyer,is_floater,is_swimmer,slithy:pm=>flag(pm,'M1_SLITHY'),
        touch_petrifies:pm=>samePtr(pm,mons[layout.PM_COCKATRICE])||samePtr(pm,mons[layout.PM_CHICKATRICE]),
        cant_drown:pm=>is_swimmer(pm)||flag(pm,'M1_AMPHIBIOUS')||flag(pm,'M1_BREATHLESS'),
        grounded:pm=>!is_flyer(pm)&&!is_floater(pm)&&(!flag(pm,'M1_CLING')||!services.has_ceiling(u.uz)),
        likes_lava:pm=>samePtr(pm,mons[layout.PM_FIRE_ELEMENTAL])||samePtr(pm,mons[layout.PM_SALAMANDER]),
        throws_rocks:pm=>Boolean(pm.mflags2&BigInt(layout.M2_ROCKTHROW)),
        helpless:mon=>Boolean(mon.msleeping||!mon.mcanmove),
        greatest_erosion:obj=>obj.oeroded>obj.oeroded2?obj.oeroded:obj.oeroded2,
        is_metallic:obj=>objects[obj.otyp].oc_material>=layout.IRON&&objects[obj.otyp].oc_material<=layout.MITHRIL,
        is_pole:obj=>(obj.oclass===layout.WEAPON_CLASS||obj.oclass===layout.TOOL_CLASS)
            &&(objects[obj.otyp].oc_skill===layout.P_POLEARMS||objects[obj.otyp].oc_skill===layout.P_LANCE
                ||services.is_art(obj,layout.ART_SNICKERSNEE)),
        canspotmon:mon=>Boolean(services.canseemon(mon)||services.sensemon(mon)),
        distu:(x,y)=>services.dist2(x,y,u.ux,u.uy),
        mhe:mon=>views.record('struct Gender',environment.requireGlobal('genders')+services.pronoun_gender(mon,layout.PRONOUN_HALLU)*layout.genderSize).he,
        has_mgivenname:mon=>services.hasMgivenname(mon),
        Maybe_Half_Phys:damage=>active(layout.HALF_PHDAM)?Math.trunc(int(damage+1)/2):damage,
        pline1:text=>services.pline('%s',text),
    });
    Object.defineProperties(env,{
        HEAP8:{get(){return arena.Int8;}},HEAPU8:{get(){return services.heap();}},
        uwep:{get(){return object(services.equipment(0));}},uarm:{get(){return object(services.equipment(1));}},
        uarmg:{get(){return object(services.equipment(2));}},uarmf:{get(){return object(services.equipment(3));}},
        Punished:{get(){return Boolean(services.equipment(4));}},
        wizard:{get(){return flags.debug;}},
        Never_mind:{get(){return services.commonString(0);}},ACURR:{value:services.acurr},
        Underwater:{get(){return u.uinwater;}},Upolyd:{get(){return u.umonnum!==u.umonster;}},
        Stone_resistance:{get(){return active(layout.STONE_RES);}},
        Confusion:{get(){return prop(layout.CONFUSION,'intrinsic');}},Stunned:{get(){return prop(layout.STUNNED,'intrinsic');}},
        Fumbling:{get(){return active(layout.FUMBLING);}},Glib:{get(){return prop(layout.GLIB,'intrinsic');}},
        Hallucination:{get(){return Boolean(prop(layout.HALLUC,'intrinsic')&&!active(layout.HALLUC_RES));}},
        Wounded_legs:{get(){return active(layout.WOUNDED_LEGS);}},HWounded_legs:{get(){return prop(layout.WOUNDED_LEGS,'intrinsic');}},
        Blind:{get(){return unblocked(layout.BLINDED);}},Blind_telepat:{get(){return active(layout.TELEPAT);}},
        Levitation:{get(){return unblocked(layout.LEVITATION);}},
        Lev_at_will:{get(){const h=prop(layout.LEVITATION,'intrinsic'),e=prop(layout.LEVITATION,'extrinsic');
            return Boolean((h&BigInt(layout.I_SPECIAL)||e&BigInt(layout.W_ARTI))
                &&!(h&~(BigInt(layout.I_SPECIAL)|BigInt(layout.TIMEOUT)))&&!(e&~BigInt(layout.W_ARTI)));}},
        Flying:{get(){return Boolean((active(layout.FLYING)||(mount()&&is_flyer(species(mount()))))&&!prop(layout.FLYING,'blocked'));}},
        Stealth:{get(){return unblocked(layout.STEALTH);}},
    });

 env.nativeByteBuffer=nativeByteBuffer;env.species=species;env.mount=mount;env.grabber=grabber;
 const classifiers=namespace.steeds.map(n=>typeof n==='string'?layout[n]:n);if(classifiers.length!==7||classifiers[6]!==0)throw Error('Review STEED class table');env.hasSteedClass=n=>classifiers.includes(Number(n)&255);
 for(const name of ['mksobj','which_armor','sobj_at'])env[name]=(...args)=>object(services[name](...args));env.t_at=(...args)=>trap(services.t_at(...args));
 const byteMemset=services.memset;env.memset=(at,value,bytes)=>{if(Array.isArray(at)){if(value!==0||bytes!==at.length*layout.coordSize)throw Error('Unsupported STEED coordinate initialization');for(const p of at)p.x=p.y=0;return at;}return byteMemset(at,value,bytes);};
 env.FROMOUTSIDE=BigInt(layout.FROMOUTSIDE);Object.defineProperty(env,'BStealth',{get:()=>properties[layout.STEALTH].blocked,set:v=>{properties[layout.STEALTH].blocked=v;}});
 Object.setPrototypeOf(env,services);
 return env;
}
