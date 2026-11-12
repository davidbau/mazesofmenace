import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Typed BONES field views; all bones decisions remain in bones.js.
const schemas = {"object":[["nobj","*object"],["cobj","*object"],["ocontainer","*object"],["oextra","*oextra"],["in_use","u32"],["oartifact","i8"],["otyp","i16"],["oclass","i8"],["oeaten","u32"],["where","i8"],["no_charge","u32"],["known","u32"],["dknown","u32"],["bknown","u32"],["rknown","u32"],["lknown","u32"],["cknown","u32"],["tknown","u32"],["invlet","i8"],["how_lost","u32"],["corpsenm","i32"],["spe","i8"],["nomerge","u32"],["lamplit","u32"],["age","i64"],["quan","i64"],["owt","u32"],["owornmask","i64"],["ghostly","u32"],["o_id","u32"]],"monster":[["nmon","*monster"],["data","*permonst"],["minvent","*object"],["mextra","*mextra"],["m_id","u32"],["mx","i16"],["my","i16"],["iswiz","u32"],["cham","i16"],["mpeaceful","u32"],["m_lev","u8"],["mhp","i32"],["mhpmax","i32"],["female","u32"],["msleeping","u32"],["mlstmv","i64"],["mtame","i8"],["seen_resistance","u64"]],"permonst":[["mlet","i8"],["msound","u8"],["geno","u16"],["mflags2","u64"],["pmnames","@"]],"oextra":[["oname","*"],["omonst","*monster"]],"mextra":[["mgivenname","*"],["ebones","*ebones"]],"ebones":[["parentmid","u32"],["role","u8"],["race","u8"],["oldalign","&align"],["deathlevel","u8"],["luck","i8"],["mnum","i16"],["female","u32"],["demigod","u32"],["crowned","u32"]],"fruit":[["nextf","*fruit"],["fid","i32"]],"trap":[["ntrap","*trap"],["ttyp","u32"],["madeby_u","u32"],["tseen","u32"]],"level":[["dnum","i16"],["dlevel","i16"]],"dungeon":[["boneid","i8"]],"special":[["boneid","i8"]],"room":[["rtype","i8"],["orig_rtype","i8"],["lx","i16"],["hx","i16"],["ly","i16"],["hy","i16"]],"terrain":[["roomno","u32"],["seenv","u8"],["waslit","u32"],["glyph","i32"]],"cemetery":[["next","*cemetery"],["who","@"],["how","@"],["when","@"],["frpx","i16"],["frpy","i16"],["bonesknown","i8"]],"align":[["type","i8"],["record","i32"],["abuse","u32"]],"coord":[["x","i16"],["y","i16"]],"hero":[["twoweap","i8"],["ux","i16"],["uy","i16"],["ux0","i16"],["uy0","i16"],["uz","&level"],["usteed","*monster"],["uswallow","u32"],["ugrave_arise","i32"],["umonnum","i32"],["ulevel","i32"],["uhpmax","i32"],["ualign","&align"],["uluck","i8"],["uevent","&event"],["uroleplay","&roleplay"],["uhandedness","u32"]],"event":[["udemigod","u32"],["uhand_of_elbereth","u32"]],"roleplay":[["numbones","i64"]],"role":[["name","&rolename"],["filecode","*"],["mnum","i16"]],"rolename":[["m","*"]],"race":[["noun","*"],["filecode","*"]],"gender":[["filecode","*"]],"alignment":[["filecode","*"]],"file":[["mode","i32"],["fd","i32"],["structlevel","i8"],["fieldlevel","i8"],["fpdef","*"],["style","&style"]],"style":[["deflt","i8"]],"flags":[["bones","i8"],["debug","i8"],["explore","i8"],["female","i8"]],"iflags":[["wc_eight_bit_input","i8"]],"program":[["reading_bonesfile","i32"]],"gs":[["save_dlevel","&level"]],"gf":[["ftrap","*trap"],["ffruit","*fruit"]],"gi":[["invent","*object"],["in_mklev","i8"]],"gu":[["urole","&role"],["urace","&race"]],"svp":[["plname","@"]],"svn":[["nhuuid","@"]],"gb":[["bones","@"]],"savedlevel":[["buriedobjlist","*object"],["bonesinfo","*cemetery"],["flags","&levelflags"],["monlist","*monster"],["objlist","*object"]],"levelflags":[["wizard_bones","u32"]],"class":[["oc_uses_known","u32"]]};
export function createBonesEnvironment(services,layout,namespace) {
    for(const [key,value] of Object.entries({pointerSize:8,longSize:8,intSize:4,coordSize:4,charSigned:1,config_MAIL_STRUCTURES:1,config_SFCTOOL:0,lastSeenElementSize:1,windowIdSize:4,prizeIdSize:4}))
        if(layout[key]!==value)throw new Error('Review changed bones ABI: '+key);
    const widths={"width_object_nobj":8,"width_object_cobj":8,"width_object_ocontainer":8,"width_object_oextra":8,"width_object_oartifact":1,"width_object_otyp":2,"width_object_oclass":1,"width_object_oeaten":4,"width_object_where":1,"width_object_invlet":1,"width_object_corpsenm":4,"width_object_spe":1,"width_object_age":8,"width_object_quan":8,"width_object_owt":4,"width_object_owornmask":8,"width_object_o_id":4,"width_monster_nmon":8,"width_monster_data":8,"width_monster_minvent":8,"width_monster_mextra":8,"width_monster_m_id":4,"width_monster_mx":2,"width_monster_my":2,"width_monster_cham":2,"width_monster_m_lev":1,"width_monster_mhp":4,"width_monster_mhpmax":4,"width_monster_mlstmv":8,"width_monster_mtame":1,"width_monster_seen_resistance":8,"width_permonst_mlet":1,"width_permonst_msound":1,"width_permonst_geno":2,"width_permonst_mflags2":8,"width_oextra_oname":8,"width_oextra_omonst":8,"width_mextra_mgivenname":8,"width_mextra_ebones":8,"width_ebones_parentmid":4,"width_ebones_role":1,"width_ebones_race":1,"width_ebones_deathlevel":1,"width_ebones_luck":1,"width_ebones_mnum":2,"width_fruit_nextf":8,"width_fruit_fid":4,"width_trap_ntrap":8,"width_level_dnum":2,"width_level_dlevel":2,"width_dungeon_boneid":1,"width_special_boneid":1,"width_room_rtype":1,"width_room_orig_rtype":1,"width_room_lx":2,"width_room_hx":2,"width_room_ly":2,"width_room_hy":2,"width_terrain_seenv":1,"width_terrain_glyph":4,"width_cemetery_next":8,"width_cemetery_frpx":2,"width_cemetery_frpy":2,"width_cemetery_bonesknown":1,"width_align_type":1,"width_align_record":4,"width_align_abuse":4,"width_coord_x":2,"width_coord_y":2,"width_hero_twoweap":1,"width_hero_ux":2,"width_hero_uy":2,"width_hero_ux0":2,"width_hero_uy0":2,"width_hero_usteed":8,"width_hero_ugrave_arise":4,"width_hero_umonnum":4,"width_hero_ulevel":4,"width_hero_uhpmax":4,"width_hero_uluck":1,"width_roleplay_numbones":8,"width_role_filecode":8,"width_role_mnum":2,"width_rolename_m":8,"width_race_noun":8,"width_race_filecode":8,"width_gender_filecode":8,"width_alignment_filecode":8,"width_file_mode":4,"width_file_fd":4,"width_file_structlevel":1,"width_file_fieldlevel":1,"width_file_fpdef":8,"width_style_deflt":1,"width_flags_bones":1,"width_flags_debug":1,"width_flags_explore":1,"width_flags_female":1,"width_iflags_wc_eight_bit_input":1,"width_program_reading_bonesfile":4,"width_gf_ftrap":8,"width_gf_ffruit":8,"width_gi_invent":8,"width_gi_in_mklev":1,"width_savedlevel_buriedobjlist":8,"width_savedlevel_bonesinfo":8,"width_savedlevel_monlist":8,"width_savedlevel_objlist":8};
    for(const [key,value] of Object.entries(widths))if(layout[key]!==value)throw new Error('Review changed bones field width: '+key);
    const address=value=>Number(value?.address??value??0);
    const raw=value=>CAdapter.unsignedPointer(value);
    const memory=()=>CAdapter.currentDataView(services);
    const cache=new Map(), names=Object.keys(schemas);
    function view(name,value){const at=address(value);if(!at)return 0;
        const key=name+':'+at;if(cache.has(key))return cache.get(key);
        const obj={address:at};cache.set(key,obj);const kind=names.indexOf(name);
        for(const [field,type] of schemas[name]){const index=schemas[name].findIndex(([n])=>n===field);
            Object.defineProperty(obj,field,{
                get(){const result=BigInt(services.read(kind,at,index));
                    if(type[0]==='*'||type[0]==='&')return type.length===1?Number(result):view(type.slice(1),result);
                    if(type==='@')return field==='pmnames'?indexed(i=>Number(memory().getBigUint64(Number(result)+i*8,true))):Number(result);
                    const bits=Number(type.slice(1)),number=type[0]==='i'?BigInt.asIntN(bits,result):BigInt.asUintN(bits,result);
                    return bits===64?number:Number(number);},
                set(value){services.write(kind,at,index,raw(value));},
            });
        }return obj;}
    const indexed=(get,set)=>new Proxy({}, {get(obj,key){return typeof key==='string'&&/^-?\d+$/.test(key)?get(Number(key)):Reflect.get(obj,key);},set(obj,key,value){if(typeof key==='string'&&/^-?\d+$/.test(key)&&set){set(Number(key),value);return true;}return Reflect.set(obj,key,value);}});
    const global=index=>address(services.global(index));
    const array=(name,index)=>indexed(i=>view(name,global(index)+i*layout[name+'Size']));
    const u=view('hero',global(0)),flags=view('flags',global(1)),iflags=view('iflags',global(2));
    const svl={level:view('savedlevel',global(11))};
    svl.lastseentyp=indexed(x=>indexed(y=>memory().getInt8(global(21)+(x*layout.ROWNO+y)*layout.lastSeenElementSize),(y,value)=>memory().setInt8(global(21)+(x*layout.ROWNO+y)*layout.lastSeenElementSize,value)));
    const env=Object.assign(Object.create(services),layout,{
        rn2(bound,site){services.rngCaller(site);return services.rn2Value(typeof bound==='function'?bound():bound);},
        u,flags,iflags,svl,program_state:view('program',global(3)),gs:view('gs',global(4)),gf:view('gf',global(5)),gi:view('gi',global(6)),gu:view('gu',global(7)),svp:view('svp',global(8)),svn:view('svn',global(9)),gb:view('gb',global(10)),
        mons:array('permonst',12),objects:array('class',13),svr:{rooms:array('room',14)},svd:{dungeons:array('dungeon',15)},roles:array('role',16),races:array('race',17),genders:array('gender',18),aligns:array('alignment',19),
        levl:indexed(x=>indexed(y=>view('terrain',global(20)+(x*layout.ROWNO+y)*layout.terrainSize))),
        loadChar:at=>memory().getInt8(address(at)),storeChar:(at,value)=>memory().setInt8(address(at),value),
        reference:(kind,get,set)=>({kind,get,set}),
        char:value=>Number(value)<<24>>24,unsigned:value=>Number(value)>>>0,
        coordLocal(){const at=services.stackAlloc(layout.coordSize);return view('coord',at);},
        copyAlign:(to,from)=>services.copy(address(to),address(from),layout.alignSize),
        callLocal(fn,...args){return CAdapter.callWithStack(services,fn,...args);},
    });
    for(const name of names)if(!Object.hasOwn(env,name))env[name]=value=>view(name,value);
    Object.defineProperties(env,{
        wizard:{get:()=>flags.debug},discover:{get:()=>flags.explore},
        fmon:{get:()=>svl.level.monlist},fobj:{get:()=>svl.level.objlist},
        Punished:{get:()=>Boolean(memory().getBigUint64(global(23),true))},
        URIGHTY:{get:()=>u.uhandedness===layout.RIGHT_HANDED},Role_switch:{get:()=>env.gu.urole.mnum},
        WINDOWPORT_tty:{get:()=>memory().getInt32(global(26),true)===layout.wp_tty},
    });
    env.has_oname=obj=>Boolean(obj.oextra&&obj.oextra.oname);env.ONAME=obj=>obj.oextra.oname;
    env.has_omonst=obj=>Boolean(obj.oextra&&obj.oextra.omonst);
    env.EBONES=mon=>mon.mextra.ebones;env.setEBONES=(mon,value)=>mon.mextra.ebones=value;
    env.has_ebones=mon=>Boolean(mon.mextra&&mon.mextra.ebones);
    env.MGIVENNAME=mon=>mon.mextra.mgivenname;env.has_mgivenname=mon=>Boolean(mon.mextra&&mon.mextra.mgivenname);
    env.ismnum=n=>n>=layout.LOW_PM&&n<layout.NUMMONS;
    env.is_Vlad=mon=>mon.data===env.mons[layout.PM_VLAD_THE_IMPALER]||mon.cham===layout.PM_VLAD_THE_IMPALER;
    env.is_undead=pm=>Boolean(pm.mflags2&BigInt(layout.M2_UNDEAD));
    env.likes_gold=pm=>Boolean(pm.mflags2&BigInt(layout.M2_GREEDY));env.likes_gems=pm=>Boolean(pm.mflags2&BigInt(layout.M2_JEWELS));
    env.likes_objs=pm=>Boolean(pm.mflags2&BigInt(layout.M2_COLLECT))||services.attacktype(pm,layout.AT_WEAP);
    env.likes_magic=pm=>Boolean(pm.mflags2&BigInt(layout.M2_MAGIC));env.unique_corpstat=pm=>Boolean(pm.geno&layout.G_UNIQ);
    env.is_mines_prize=obj=>obj.o_id===memory().getUint32(global(24),true);env.is_soko_prize=obj=>obj.o_id===memory().getUint32(global(25),true);
    env.u_at=(x,y)=>x===u.ux&&y===u.uy;
    env.m_at=(x,y)=>view('monster',services.monsterAt(x,y));
    env.Is_oracle_level=lev=>{const oracle=view('level',global(22));return Boolean((oracle.dnum||oracle.dlevel)&&services.on_level(lev,oracle));};
    env.unhideable_trap=type=>type===layout.HOLE;
    for(const [name,result]of Object.entries({Is_special:'special',fruit_from_indx:'fruit',makemon:'monster',christen_monst:'monster',mk_named_object:'object',m_carrying:'object',mongets:'object',add_to_container:'object',open_bonesfile:'file',create_bonesfile:'file'}))
        env[name]=(...args)=>view(result,services[name](...args));
    function withReferences(args,fn){const saved=services.stackSave(),refs=[];
        try{const converted=args.map(value=>{if(!value||!value.kind)return value;
                const kind=value.kind,at=services.stackAlloc(kind==='Pointer'?8:Number(kind.match(/\d+/)[0])/8),initial=value.get()??0;
                if(kind==='Pointer')memory().setBigUint64(at,raw(initial),true);else memory()['set'+kind](at,Number(initial),true);
                refs.push({ref:value,at});return at;});return fn(converted);}
        finally{try{for(const {ref,at}of refs){ref.set(ref.kind==='Pointer'?Number(memory().getBigUint64(at,true)):memory()['get'+ref.kind](at,true));}}finally{services.stackRestore(saved);}}}
    for(const name of ['cant_revive','get_obj_location','open_bonesfile','create_bonesfile','Sfi_char','Sfo_char']){
        const invoke=env[name]??services[name];env[name]=(...args)=>withReferences(args,converted=>invoke(...converted));}
    env.iter_mons=callback=>{if(callback!==namespace.remove_mon_from_bones)throw new Error('Unexpected bones callback');return services.iter_mons(services.callbackPointer());};
    return env;
}
