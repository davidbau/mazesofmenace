import * as CAdapter from '../../c-runtime/adapter-factories.js';
import {applyRecordAliases,createFieldAliases,applyPrototypeAliases} from '../header-aliases.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// ARTIFACT live native-memory views and original header macros. No form policy in C.
import * as core from '../../ported/artifact.js';
import { withCEnvironment } from '../../c-runtime/context.js';
const schemas={"Align":{"ctype":"struct Align","fields":[{"name":"value","d":{"t":"i8"},"ctype":"aligntyp","bit":false,"const":false}]},"flag":{"ctype":"struct flag","fields":[{"name":"initalign","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"verbose","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false},{"name":"female","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false}]},"artifact":{"ctype":"struct artifact","fields":[{"name":"otyp","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"role","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"alignment","d":{"t":"i8"},"ctype":"aligntyp","bit":false,"const":false},{"name":"name","d":{"p":""},"ctype":"const char *","bit":false,"const":false},{"name":"spfx","d":{"t":"u64"},"ctype":"unsigned long","bit":false,"const":false},{"name":"gift_value","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"race","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"gen_spe","d":{"t":"i8"},"ctype":"schar","bit":false,"const":false},{"name":"cspfx","d":{"t":"u64"},"ctype":"unsigned long","bit":false,"const":false},{"name":"mtype","d":{"t":"u64"},"ctype":"unsigned long","bit":false,"const":false},{"name":"attk","d":{"s":"attack"},"ctype":"struct attack","bit":false,"const":false},{"name":"defn","d":{"s":"attack"},"ctype":"struct attack","bit":false,"const":false},{"name":"cary","d":{"s":"attack"},"ctype":"struct attack","bit":false,"const":false},{"name":"inv_prop","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"cost","d":{"t":"i64"},"ctype":"long","bit":false,"const":false},{"name":"acolor","d":{"t":"i8"},"ctype":"char","bit":false,"const":false}]},"Role":{"ctype":"struct Role","fields":[{"name":"mnum","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"questarti","d":{"t":"i16"},"ctype":"short","bit":false,"const":false}]},"instance_globals_u":{"ctype":"struct instance_globals_u","fields":[{"name":"urole","d":{"s":"Role"},"ctype":"struct Role","bit":false,"const":false},{"name":"urace","d":{"s":"Race"},"ctype":"struct Race","bit":false,"const":false}]},"obj":{"ctype":"struct obj","fields":[{"name":"otyp","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"oeroded","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"oeroded2","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"oartifact","d":{"t":"i8"},"ctype":"char","bit":false,"const":false},{"name":"spe","d":{"t":"i8"},"ctype":"schar","bit":false,"const":false},{"name":"otrapped","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"age","d":{"t":"i64"},"ctype":"long","bit":false,"const":false},{"name":"where","d":{"t":"i8"},"ctype":"xint8","bit":false,"const":false},{"name":"ox","d":{"t":"i16"},"ctype":"coordxy","bit":false,"const":false},{"name":"oy","d":{"t":"i16"},"ctype":"coordxy","bit":false,"const":false},{"name":"owornmask","d":{"t":"i64"},"ctype":"long","bit":false,"const":false},{"name":"quan","d":{"t":"i64"},"ctype":"long","bit":false,"const":false},{"name":"nobj","d":{"p":"obj"},"ctype":"struct obj *","bit":false,"const":false},{"name":"known","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"blessed","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"cursed","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"bknown","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"owt","d":{"t":"u32"},"ctype":"unsigned int","bit":false,"const":false},{"name":"oclass","d":{"t":"i8"},"ctype":"char","bit":false,"const":false},{"name":"lamplit","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"corpsenm","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"cobj","d":{"p":"obj"},"ctype":"struct obj *","bit":false,"const":false},{"name":"v","d":{"s":"vptrs"},"ctype":"union vptrs","bit":false,"const":false}]},"objclass":{"ctype":"struct objclass","fields":[{"name":"oc_unique","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"oc_class","d":{"t":"i8"},"ctype":"char","bit":false,"const":false},{"name":"oc_subtyp","d":{"t":"i8"},"ctype":"schar","bit":false,"const":false},{"name":"oc_material","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"oc_name_known","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"oc_descr_idx","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"oc_oprop","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"oc_cost","d":{"t":"i16"},"ctype":"short","bit":false,"const":false}]},"arti_info":{"ctype":"struct arti_info","fields":[{"name":"exists","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"found","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"wish","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"gift","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"viadip","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"named","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"lvldef","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"bones","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"rndm","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false}]},"permonst":{"ctype":"struct permonst","fields":[{"name":"mflags2","d":{"t":"u64"},"ctype":"unsigned long","bit":false,"const":false},{"name":"mflags3","d":{"t":"u16"},"ctype":"unsigned short","bit":false,"const":false},{"name":"mlet","d":{"t":"i8"},"ctype":"char","bit":false,"const":false},{"name":"mflags1","d":{"t":"u64"},"ctype":"unsigned long","bit":false,"const":false},{"name":"maligntyp","d":{"t":"i8"},"ctype":"aligntyp","bit":false,"const":false},{"name":"mr","d":{"t":"i8"},"ctype":"schar","bit":false,"const":false},{"name":"msize","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"msound","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false}]},"Race":{"ctype":"struct Race","fields":[{"name":"hatemask","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"mnum","d":{"t":"i16"},"ctype":"short","bit":false,"const":false},{"name":"selfmask","d":{"t":"i16"},"ctype":"short","bit":false,"const":false}]},"skills":{"ctype":"struct skills","fields":[{"name":"max_skill","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false},{"name":"skill","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false}]},"you":{"ctype":"struct you","fields":[{"name":"weapon_skills","d":{"a":[38],"e":{"s":"skills"}},"ctype":"struct skills[38]","bit":false,"const":false},{"name":"ugifts","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uprops","d":{"a":[69],"e":{"s":"prop"}},"ctype":"struct prop[69]","bit":false,"const":false},{"name":"xray_range","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"ualign","d":{"s":"align"},"ctype":"align","bit":false,"const":false},{"name":"ulycn","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"umonnum","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"umonster","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uenmax","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uen","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uenpeak","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"ustuck","d":{"p":"monst"},"ctype":"struct monst *","bit":false,"const":false},{"name":"ux","d":{"t":"i16"},"ctype":"coordxy","bit":false,"const":false},{"name":"uy","d":{"t":"i16"},"ctype":"coordxy","bit":false,"const":false},{"name":"uswallow","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"mh","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uhp","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uhpmax","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"ucreamed","d":{"t":"u32"},"ctype":"unsigned int","bit":false,"const":false},{"name":"mhmax","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"uz","d":{"s":"d_level"},"ctype":"d_level","bit":false,"const":false},{"name":"uhave","d":{"s":"u_have"},"ctype":"struct u_have","bit":false,"const":false},{"name":"dx","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"dy","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"dz","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"twoweap","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false},{"name":"usteed","d":{"p":"monst"},"ctype":"struct monst *","bit":false,"const":false}]},"objdescr":{"ctype":"struct objdescr","fields":[{"name":"oc_descr","d":{"p":""},"ctype":"const char *","bit":false,"const":false}]},"instance_globals_saved_b":{"ctype":"struct instance_globals_saved_b","fields":[{"name":"bases","d":{"a":[20],"e":{"t":"i32"}},"ctype":"int[20]","bit":false,"const":false}]},"attack":{"ctype":"struct attack","fields":[{"name":"aatyp","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"adtyp","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"damn","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"damd","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false}]},"prop":{"ctype":"struct prop","fields":[{"name":"extrinsic","d":{"t":"i64"},"ctype":"long","bit":false,"const":false},{"name":"intrinsic","d":{"t":"i64"},"ctype":"long","bit":false,"const":false},{"name":"blocked","d":{"t":"i64"},"ctype":"long","bit":false,"const":false}]},"instance_globals_i":{"ctype":"struct instance_globals_i","fields":[{"name":"invent","d":{"p":"obj"},"ctype":"struct obj *","bit":false,"const":false}]},"sinfo":{"ctype":"struct sinfo","fields":[{"name":"restoring","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"warntype_info":{"ctype":"struct warntype_info","fields":[{"name":"obj","d":{"t":"u64"},"ctype":"unsigned long","bit":false,"const":false}]},"context_info":{"ctype":"struct context_info","fields":[{"name":"warntype","d":{"s":"warntype_info"},"ctype":"struct warntype_info","bit":false,"const":false}]},"instance_globals_saved_c":{"ctype":"struct instance_globals_saved_c","fields":[{"name":"context","d":{"s":"context_info"},"ctype":"struct context_info","bit":false,"const":false}]},"instance_globals_v":{"ctype":"struct instance_globals_v","fields":[{"name":"vision_full_recalc","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false},{"name":"viz_array","d":{"p":""},"ctype":"seenV **","bit":false,"const":false}]},"instance_globals_y":{"ctype":"struct instance_globals_y","fields":[{"name":"youmonst","d":{"s":"monst"},"ctype":"struct monst","bit":false,"const":false}]},"align":{"ctype":"struct align","fields":[{"name":"type","d":{"t":"i8"},"ctype":"aligntyp","bit":false,"const":false},{"name":"record","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"monst":{"ctype":"struct monst","fields":[{"name":"data","d":{"p":"permonst"},"ctype":"struct permonst *","bit":false,"const":false},{"name":"mx","d":{"t":"i16"},"ctype":"coordxy","bit":false,"const":false},{"name":"my","d":{"t":"i16"},"ctype":"coordxy","bit":false,"const":false},{"name":"mhp","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"mstun","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"mconf","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"minvent","d":{"p":"obj"},"ctype":"struct obj *","bit":false,"const":false},{"name":"m_lev","d":{"t":"u8"},"ctype":"uchar","bit":false,"const":false},{"name":"mhpmax","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"nmon","d":{"p":"monst"},"ctype":"struct monst *","bit":false,"const":false},{"name":"msleeping","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"mtame","d":{"t":"i8"},"ctype":"schar","bit":false,"const":false},{"name":"mpeaceful","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false}]},"instance_globals_s":{"ctype":"struct instance_globals_s","fields":[{"name":"spec_dbon_applies","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"window_procs":{"ctype":"struct window_procs","fields":[{"name":"win_putstr","d":{"f":true},"ctype":"void (*)(winid, int, const char *)","bit":false,"const":false},{"name":"win_create_nhwindow","d":{"f":true},"ctype":"winid (*)(int)","bit":false,"const":false},{"name":"win_start_menu","d":{"f":true},"ctype":"void (*)(winid, unsigned long)","bit":false,"const":false},{"name":"win_end_menu","d":{"f":true},"ctype":"void (*)(winid, const char *)","bit":false,"const":false},{"name":"win_destroy_nhwindow","d":{"f":true},"ctype":"void (*)(winid)","bit":false,"const":false}]},"color_and_attr":{"ctype":"struct color_and_attr","fields":[{"name":"attr","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"instance_flags":{"ctype":"struct instance_flags","fields":[{"name":"menu_headings","d":{"s":"color_and_attr"},"ctype":"color_attr","bit":false,"const":false}]},"display_hints":{"ctype":"struct display_hints","fields":[{"name":"botl","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false}]},"instance_globals_m":{"ctype":"struct instance_globals_m","fields":[{"name":"multi_reason","d":{"p":""},"ctype":"const char *","bit":false,"const":false},{"name":"mkot_trap_warn_count","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"instance_globals_n":{"ctype":"struct instance_globals_n","fields":[{"name":"nomovemsg","d":{"p":""},"ctype":"const char *","bit":false,"const":false},{"name":"notonhead","d":{"t":"i8"},"ctype":"boolean","bit":false,"const":false}]},"c_common_strings":{"ctype":"struct c_common_strings","fields":[{"name":"c_fakename","d":{"a":[2],"e":{"p":""}},"ctype":"const char *const[2]","bit":false,"const":false},{"name":"c_Never_mind","d":{"p":""},"ctype":"const char *const","bit":false,"const":true},{"name":"c_nothing_seems_to_happen","d":{"p":""},"ctype":"const char *const","bit":false,"const":true},{"name":"c_nothing_happens","d":{"p":""},"ctype":"const char *const","bit":false,"const":true}]},"c_color_names":{"ctype":"struct c_color_names","fields":[{"name":"c_black","d":{"p":""},"ctype":"const char *const","bit":false,"const":true}]},"const_globals":{"ctype":"struct const_globals","fields":[{"name":"zeroobj","d":{"s":"obj"},"ctype":"const struct obj","bit":false,"const":true},{"name":"zeroany","d":{"s":"any"},"ctype":"const anything","bit":false,"const":true}]},"instance_globals_saved_n":{"ctype":"struct instance_globals_saved_n","fields":[{"name":"n_dgns","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"dungeon":{"ctype":"struct dungeon","fields":[{"name":"dunlev_ureached","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false},{"name":"dname","d":{"a":[24],"e":{"t":"i8"}},"ctype":"char[24]","bit":false,"const":false},{"name":"depth_start","d":{"t":"i32"},"ctype":"int","bit":false,"const":false},{"name":"entry_lev","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false}]},"instance_globals_saved_d":{"ctype":"struct instance_globals_saved_d","fields":[{"name":"dungeons","d":{"a":[16],"e":{"s":"dungeon"}},"ctype":"dungeon[16]","bit":false,"const":false},{"name":"dungeon_topology","d":{"s":"dgn_topology"},"ctype":"struct dgn_topology","bit":false,"const":false}]},"dgn_topology":{"ctype":"struct dgn_topology","fields":[{"name":"d_tutorial_dnum","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false},{"name":"d_astral_level","d":{"s":"d_level"},"ctype":"d_level","bit":false,"const":false}]},"any":{"ctype":"union any","fields":[{"name":"a_int","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"mi":{"ctype":"struct mi","fields":[{"name":"item","d":{"s":"any"},"ctype":"anything","bit":false,"const":false}]},"d_level":{"ctype":"struct d_level","fields":[{"name":"dnum","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false},{"name":"dlevel","d":{"t":"i16"},"ctype":"xint16","bit":false,"const":false}]},"u_have":{"ctype":"struct u_have","fields":[{"name":"amulet","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false}]},"dlevel_t":{"ctype":"dlevel_t","fields":[{"name":"monlist","d":{"p":"monst"},"ctype":"struct monst *","bit":false,"const":false},{"name":"locations","d":{"a":[80,21],"e":{"s":"rm"}},"ctype":"struct rm[80][21]","bit":false,"const":false},{"name":"objects","d":{"a":[80,21],"e":{"p":"obj"}},"ctype":"struct obj *[80][21]","bit":false,"const":false}]},"instance_globals_saved_l":{"ctype":"struct instance_globals_saved_l","fields":[{"name":"level","d":{"s":"dlevel_t"},"ctype":"dlevel_t","bit":false,"const":false}]},"q_score":{"ctype":"struct q_score","fields":[{"name":"killed_nemesis","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false}]},"instance_globals_saved_q":{"ctype":"struct instance_globals_saved_q","fields":[{"name":"quest_status","d":{"s":"q_score"},"ctype":"struct q_score","bit":false,"const":false}]},"instance_globals_saved_m":{"ctype":"struct instance_globals_saved_m","fields":[{"name":"moves","d":{"t":"i64"},"ctype":"long","bit":false,"const":false}]},"rm":{"ctype":"struct rm","fields":[{"name":"lit","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"waslit","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false},{"name":"typ","d":{"t":"i8"},"ctype":"schar","bit":false,"const":false},{"name":"flags","d":{"t":"u32"},"ctype":"unsigned int","bit":true,"const":false}]},"instance_globals_w":{"ctype":"struct instance_globals_w","fields":[{"name":"warn_obj_cnt","d":{"t":"i32"},"ctype":"int","bit":false,"const":false}]},"vptrs":{"ctype":"union vptrs","fields":[{"name":"v_nexthere","d":{"p":"obj"},"ctype":"struct obj *","bit":false,"const":false}]},"glyphinfo":{"ctype":"struct glyphinfo","fields":[]},"nhcoord":{"ctype":"struct nhcoord","fields":[]}};
const globals=[{"name":"aligns","d":{"a":[0],"e":{"s":"Align"}}},{"name":"flags","d":{"s":"flag"}},{"name":"artilist","d":{"a":[35],"e":{"s":"artifact"}}},{"name":"gu","d":{"s":"instance_globals_u"}},{"name":"artiexist","d":{"a":[34],"e":{"s":"arti_info"}}},{"name":"artidisco","d":{"a":[33],"e":{"t":"i16"}}},{"name":"objects","d":{"a":[482],"e":{"s":"objclass"}}},{"name":"mons","d":{"a":[384],"e":{"s":"permonst"}}},{"name":"u","d":{"s":"you"}},{"name":"zero_artiexist","d":{"s":"arti_info"}},{"name":"obj_descr","d":{"a":[482],"e":{"s":"objdescr"}}},{"name":"svb","d":{"s":"instance_globals_saved_b"}},{"name":"gi","d":{"s":"instance_globals_i"}},{"name":"program_state","d":{"s":"sinfo"}},{"name":"svc","d":{"s":"instance_globals_saved_c"}},{"name":"gv","d":{"s":"instance_globals_v"}},{"name":"gy","d":{"s":"instance_globals_y"}},{"name":"gs","d":{"s":"instance_globals_s"}},{"name":"windowprocs","d":{"s":"window_procs"}},{"name":"iflags","d":{"s":"instance_flags"}},{"name":"disp","d":{"s":"display_hints"}},{"name":"gm","d":{"s":"instance_globals_m"}},{"name":"gn","d":{"s":"instance_globals_n"}},{"name":"c_common_strings","d":{"s":"c_common_strings"}},{"name":"c_color_names","d":{"s":"c_color_names"}},{"name":"cg","d":{"s":"const_globals"}},{"name":"svn","d":{"s":"instance_globals_saved_n"}},{"name":"svd","d":{"s":"instance_globals_saved_d"}},{"name":"nul_glyphinfo","d":{"s":"glyphinfo"}},{"name":"svl","d":{"s":"instance_globals_saved_l"}},{"name":"svq","d":{"s":"instance_globals_saved_q"}},{"name":"svm","d":{"s":"instance_globals_saved_m"}},{"name":"uwep","d":{"p":"obj"}},{"name":"gw","d":{"s":"instance_globals_w"}},{"name":"uarmg","d":{"p":"obj"}},{"name":"uleft","d":{"p":"obj"}},{"name":"uright","d":{"p":"obj"}},{"name":"uswapwep","d":{"p":"obj"}}];
const moduleStates=new WeakMap();
export function createArtifactEnvironment(services,layout,namespace) {
    for(const [k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,charSigned:1,littleEndian:1}))
        if(Number(layout[k])!==v)throw Error('Review changed ARTIFACT ABI: '+k);
    const pointerValue=v=>{const r=BigInt.asUintN(64,BigInt(v?.address??v??0));return r<=BigInt(Number.MAX_SAFE_INTEGER)?Number(r):r;};
    const addr=v=>Number(v?.address??v??0),raw=v=>BigInt.asUintN(64,BigInt(typeof v==='string'?services.literal(v):typeof v==='boolean'?Number(v):typeof v==='number'?Math.trunc(v):v?.address??v??0));
    const memory=()=>CAdapter.currentDataView(services),cache=new Map(),names=Object.keys(schemas);
    const {width,decode,read,write,array}=CAdapter.createDescriptorMemory({services,layout,addr,raw,memory,cache,view:(name,value)=>view(name,value),pointerArrays:false,rows:true,coerceRecordSize:true,directIntegerReads:false,voidPointer:pointerValue});




    const view=CAdapter.createDescriptorViewFactory({services,schemas,address:pointerValue,raw,cache,names,decode,decorate:(kind,result)=>applyRecordAliases(kind,result,'artifact'),numericRows:true,layout,aggregateField:{record:'instance_globals_v',field:'viz_array',array,address:addr,makeDescriptor:()=>({a:[0],e:{row:'u8'}})}});
    const env=Object.assign(Object.create(services),layout,{view,
        callLocal:(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);},
        addressOf:(o,f)=>addr(services.address(names.indexOf(o.kind),o.address,schemas[o.kind].fields.findIndex(x=>x.name===f))),
        int:v=>Number(BigInt.asIntN(32,raw(v))),char:v=>Number(BigInt.asIntN(8,raw(v))),uchar:v=>Number(BigInt.asUintN(8,raw(v))),boolean:v=>Number(BigInt.asIntN(8,raw(v))),short:v=>Number(BigInt.asIntN(16,raw(v))),long:v=>BigInt.asIntN(64,raw(v)),ulong:v=>raw(v),
        charPointer:v=>typeof v==='string'?services.literal(v):Array.isArray(v)?services.literal(String.fromCharCode(...v.slice(0,v.indexOf(0)<0?v.length:v.indexOf(0)))):addr(v),
        loadChar:v=>memory().getInt8(addr(v)),storeChar:(v,b)=>memory().setInt8(addr(v),Number(b)),intReference:(get,set)=>({get,set}),
    });
    for(const [name,value]of Object.entries(layout))if(name.startsWith('constwidth_')){const k=name.slice(11);env[k]=Number(value)===8?(Number(layout['constsigned_'+k])?BigInt.asIntN(64,BigInt(layout[k])):BigInt.asUintN(64,BigInt(layout[k]))):Number(layout['constsigned_'+k])?Number(BigInt.asIntN(32,BigInt(layout[k]))):Number(BigInt.asUintN(32,BigInt(layout[k])));}
    for(const [name,sch]of Object.entries(schemas))for(const f of sch.fields)if(!f.bit&&width(f.d)!==Number(layout['width_'+name+'_'+f.name]))throw Error('Review changed ARTIFACT field width: '+name+'.'+f.name);
    CAdapter.installDescriptorGlobals(globals,env,services,read,write,addr);
    namespace=namespace??core;
    const functions=["hack_artifacts", "init_artifacts", "save_artifacts", "restore_artifacts", "artiname", "mk_artifact", "dispose_of_orig_obj", "artifact_name", "exist_artifact", "artifact_exists", "found_artifact", "find_artifact", "nartifact_exist", "artifact_origin", "spec_ability", "confers_luck", "arti_reflects", "shade_glare", "restrict_name", "attacks", "defends", "defends_when_carried", "protects", "set_artifact_intrinsic", "touch_artifact", "arti_immune", "bane_applies", "spec_applies", "spec_m2", "spec_abon", "spec_dbon", "discover_artifact", "undiscovered_artifact", "disp_artifact_discoveries", "dump_artifact_info", "Mb_hit", "artifact_hit", "invoke_ok", "doinvoke", "nothing_special", "invoke_taming", "invoke_healing", "invoke_energy_boost", "invoke_untrap", "invoke_charge_obj", "invoke_create_portal", "invoke_create_ammo", "invoke_banish", "invoke_fling_poison", "invoke_storm_spell", "invoke_blinding_ray", "arti_invoke_cost_pw", "arti_invoke_cost", "arti_invoke", "finesse_ahriman", "artifact_light", "arti_speak", "artifact_has_invprop", "arti_cost", "abil_to_adtyp", "abil_to_spfx", "what_gives", "glow_color", "glow_strength", "glow_verb", "Sting_effects", "retouch_object", "untouchable", "retouch_equipment", "count_surround_traps", "mkot_trap_warn", "is_magic_key", "has_magic_key", "is_art", "get_artifact", "permapoisoned"];
    for(const name of functions)env[name]=(...args)=>env.callLocal(namespace[name],...args);
    const functionPointer=fn=>{if(typeof fn!=='function')return fn;const i=functions.findIndex(n=>namespace[n]===fn||env[n]===fn);if(i<0){const foreign=["charge_ok", "xname"].findIndex(n=>env[n]===fn);if(foreign>=0)return services.foreignFunctionPointer(foreign);throw Error('Unrecognized ARTIFACT native callback');}return services.functionPointer(i);};
    const invoke=(fn,args)=>{const refs=args.filter(a=>a?.localRef);try{return fn(...args.map(a=>typeof a==='function'?functionPointer(a):a));}finally{for(const ref of refs)ref.set(read(ref.descriptor,ref.address));}};
    Object.defineProperty(env,'HEAP8',{get:()=>new Int8Array(services.heap().buffer)});
    Object.defineProperty(env,'HEAPU8',{get:()=>services.heap()});
    env.sizes=Object.assign(Object.fromEntries(names.map(n=>[n,Number(layout[n+'Size'])])),{ptr:8,int:4,short:2,boolean:1,'monst *':8,artilist:35*Number(layout.artifactSize),artiexist:34*Number(layout.arti_infoSize),artidisco:66});
    const aliases={anything:'any',menu_item:'mi',coord:'nhcoord',d_level:'d_level',boolean:'signed char',coordxy:'short'};
    const descriptor=type=>{type=type.replace(/^(?:const )?(?:struct |union )/,'');type=aliases[type]??type;if(type.endsWith('*')){const n=type.slice(0,-1).trim();return{p:aliases[n]??(schemas[n]?n:'')};}if(schemas[type])return{s:type};const scalar={char:'i8','signed char':'i8','unsigned char':'u8',uchar:'u8',boolean:'i8',short:'i16','unsigned short':'u16',int:'i32','unsigned int':'u32',unsigned:'u32',long:'i64','unsigned long':'u64'};if(scalar[type])return{t:scalar[type]};throw Error('Review ARTIFACT local type '+type);};
    env.longPointer=at=>Object.defineProperty({address:addr(at)},'value',{get:()=>memory().getBigInt64(addr(at),true),set:v=>memory().setBigInt64(addr(at),BigInt(v),true)});
    env.localPointer=(type,get,set)=>{const d=descriptor(type),at=addr(services.stackAlloc(width(d)));write(d,at,get());return{address:at,descriptor:d,localRef:true,set,get value(){return read(d,at);},set value(v){write(d,at,v);set(read(d,at));}};};
    env.fieldPointer=(obj,name)=>{const field=schemas[obj.kind].fields.find(f=>f.name===name);if(!field)throw Error('Unknown ARTIFACT field reference '+name);return Object.defineProperty({address:env.addressOf(obj,name)},'value',{get:()=>obj[name],set:v=>obj[name]=v});};
    env.recordLocal=(name,initial)=>{name=aliases[name]??name;const at=addr(services.stackAlloc(Number(layout[name+'Size']))),out=view(name,at);if(Array.isArray(initial)){schemas[name].fields.forEach((f,i)=>{out[f.name]=initial[i]??0;});}else if(initial!==undefined)services.heap().copyWithin(at,addr(initial),addr(initial)+Number(layout[name+'Size']));return out;};
    env.copyRecord=(out,input,bytes)=>services.heap().copyWithin(addr(out),addr(input),addr(input)+Number(bytes));
    env.pointerLoad=(kind,at)=>view(aliases[kind]??kind,memory().getBigUint64(addr(at),true));
    env.pointerArray=(kind,at)=>array({a:[0],e:{p:aliases[kind]??kind}},addr(at));
    env.intArray=at=>array({a:[0],e:{t:'i32'}},addr(at));
    env.advanceRecord=(obj,n)=>view(obj.kind,obj.address+Number(n)*Number(layout[obj.kind+'Size']));
    env.SIZE=a=>typeof a==='string'?a.length+1:Array.isArray(a)?a.length:a.descriptor?.a?.[0]??(()=>{throw Error('Review ARTIFACT SIZE operand');})();
    env.callLocal=(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);};
    env.uint=v=>Number(BigInt.asUintN(32,raw(v)));env.ushort=v=>Number(BigInt.asUintN(16,raw(v)));env.int=v=>Number(BigInt.asIntN(32,raw(v)));env.char=v=>Number(BigInt.asIntN(8,raw(v)));env.short=v=>Number(BigInt.asIntN(16,raw(v)));env.long=v=>BigInt.asIntN(64,raw(v));env.ulong=raw;
    env.min=(a,b)=>a<b?a:b;env.max=(a,b)=>a>b?a:b;
    env.loadChar=v=>typeof v==='string'?v.charCodeAt(0):memory().getInt8(addr(v));
    env.storeChar=(p,v)=>memory().setInt8(addr(p),Number(v));
    env.ctrl=v=>(typeof v==='string'?v.charCodeAt(0):Number(v))&31;
    env.FEATURE_NOTICE_VER=(major,minor,patch)=>(BigInt(major)<<24n)|(BigInt(minor)<<16n)|(BigInt(patch)<<8n);
    env.pointerEqual=(a,b)=>Number(raw(a)===raw(b));
    env.pointerDifference=(a,b,kind)=>(raw(a)-raw(b))/BigInt(layout[(aliases[kind]??kind)+'Size']);
    env.scalarPointer=(type,at)=>{if(!pointerValue(at))return 0;const d=descriptor(type);return Object.defineProperty({address:pointerValue(at),descriptor:d},'value',{get:()=>read(d,addr(at)),set:v=>write(d,addr(at),v)});};
    env.shortArray=(at,count=0)=>array({a:[Number(count)],e:{t:'i16'}},addr(at));
    env.byteArray=(at,count=0)=>array({a:[Number(count)],e:{t:'u8'}},addr(at));
    env.resbuf=services.resbuf();
    let state=moduleStates.get(services.moduleKey);
    if(!state){state={initialized:false,touch_blasted:0,nesting:0};moduleStates.set(services.moduleKey,state);}
    env.state=state;
    env.memset=(...args)=>{const result=invoke(services.memset,args);return result;};
    env.sfo_arti_info=(...args)=>{const result=invoke(services.sfo_arti_info,args);return result;};
    env.sfo_xint16=(...args)=>{const result=invoke(services.sfo_xint16,args);return result;};
    env.sfi_arti_info=(...args)=>{const result=invoke(services.sfi_arti_info,args);return result;};
    env.sfi_short=(...args)=>{const result=invoke(services.sfi_short,args);return result;};
    env.rn2=(...args)=>{const result=invoke(services.rn2,args);return result;};
    env.mksobj=(...args)=>{const result=invoke(services.mksobj,args);return view("obj",result);};
    env.__assert_fail=(...args)=>{const result=invoke(services.__assert_fail,args);return result;};
    env.oname=(...args)=>{const result=invoke(services.oname,args);return view("obj",result);};
    env.obj_extract_self=(...args)=>{const result=invoke(services.obj_extract_self,args);return result;};
    env.obfree=(...args)=>{const result=invoke(services.obfree,args);return result;};
    env.strncmpi=(...args)=>{const result=invoke(services.strncmpi,args);return result;};
    env.fuzzymatch=(...args)=>{const result=invoke(services.fuzzymatch,args);return result;};
    env.strcmp=(...args)=>{const result=invoke(services.strcmp,args);return result;};
    env.inside_shop=(...args)=>{const result=invoke(services.inside_shop,args);return result;};
    env.bare_artifactname=(...args)=>{const result=invoke(services.bare_artifactname,args);return result;};
    env.obj_shuffle_range=(...args)=>{const result=invoke(services.obj_shuffle_range,args);return result;};
    env.make_hallucinated=(...args)=>{const result=invoke(services.make_hallucinated,args);return result;};
    env.recalc_telepat_range=(...args)=>{const result=invoke(services.recalc_telepat_range,args);return result;};
    env.see_monsters=(...args)=>{const result=invoke(services.see_monsters,args);return result;};
    env.mon_aligntyp=(...args)=>{const result=invoke(services.mon_aligntyp,args);return result;};
    env.s_suffix=(...args)=>{const result=invoke(services.s_suffix,args);return result;};
    env.the=(...args)=>{const result=invoke(services.the,args);return result;};
    env.xname=(...args)=>{const result=invoke(services.xname,args);return result;};
    env.d=(...args)=>{const result=invoke(services.d,args);return result;};
    env.hates_silver=(...args)=>{const result=invoke(services.hates_silver,args);return result;};
    env.rnd=(...args)=>{const result=invoke(services.rnd,args);return result;};
    env.losehp=(...args)=>{const result=invoke(services.losehp,args);return result;};
    env.exercise=(...args)=>{const result=invoke(services.exercise,args);return result;};
    env.Tobjnam=(...args)=>{const result=invoke(services.Tobjnam,args);return result;};
    env.sgn=(...args)=>{const result=invoke(services.sgn,args);return result;};
    env.defended=(...args)=>{const result=invoke(services.defended,args);return result;};
    env.Resists_Elem=(...args)=>{const result=invoke(services.Resists_Elem,args);return result;};
    env.resists_drli=(...args)=>{const result=invoke(services.resists_drli,args);return result;};
    env.align_str=(...args)=>{const result=invoke(services.align_str,args);return result;};
    env.simple_typename=(...args)=>{const result=invoke(services.simple_typename,args);return result;};
    env.vtense=(...args)=>{const result=invoke(services.vtense,args);return result;};
    env.canseemon=(...args)=>{const result=invoke(services.canseemon,args);return result;};
    env.sensemon=(...args)=>{const result=invoke(services.sensemon,args);return result;};
    env.map_invisible=(...args)=>{const result=invoke(services.map_invisible,args);return result;};
    env.cancel_monst=(...args)=>{const result=invoke(services.cancel_monst,args);return result;};
    env.strcpy=(...args)=>{const result=invoke(services.strcpy,args);return result;};
    env.mon_nam=(...args)=>{const result=invoke(services.mon_nam,args);return result;};
    env.attacktype=(...args)=>{const result=invoke(services.attacktype,args);return result;};
    env.nomul=(...args)=>{const result=invoke(services.nomul,args);return result;};
    env.sticks=(...args)=>{const result=invoke(services.sticks,args);return result;};
    env.set_ustuck=(...args)=>{const result=invoke(services.set_ustuck,args);return result;};
    env.resist=(...args)=>{const result=invoke(services.resist,args);return result;};
    env.monflee=(...args)=>{const result=invoke(services.monflee,args);return result;};
    env.abs=(...args)=>{const result=invoke(services.abs,args);return result;};
    env.probe_monster=(...args)=>{const result=invoke(services.probe_monster,args);return result;};
    env.make_stunned=(...args)=>{const result=invoke(services.make_stunned,args);return result;};
    env.make_confused=(...args)=>{const result=invoke(services.make_confused,args);return result;};
    env.upstart=(...args)=>{const result=invoke(services.upstart,args);return result;};
    env.shieldeff=(...args)=>{const result=invoke(services.shieldeff,args);return result;};
    env.strcat=(...args)=>{const result=invoke(services.strcat,args);return result;};
    env.destroy_items=(...args)=>{const result=invoke(services.destroy_items,args);return result;};
    env.ignite_items=(...args)=>{const result=invoke(services.ignite_items,args);return result;};
    env.burn_away_slime=(...args)=>{const result=invoke(services.burn_away_slime,args);return result;};
    env.wake_nearto=(...args)=>{const result=invoke(services.wake_nearto,args);return result;};
    env.Monnam=(...args)=>{const result=invoke(services.Monnam,args);return result;};
    env.observe_object=(...args)=>{const result=invoke(services.observe_object,args);return result;};
    env.mbodypart=(...args)=>{const result=invoke(services.mbodypart,args);return result;};
    env.body_part=(...args)=>{const result=invoke(services.body_part,args);return result;};
    env.monhp_per_lvl=(...args)=>{const result=invoke(services.monhp_per_lvl,args);return result;};
    env.distant_name=(...args)=>{const result=invoke(services.distant_name,args);return result;};
    env.hcolor=(...args)=>{const result=invoke(services.hcolor,args);return result;};
    env.The=(...args)=>{const result=invoke(services.The,args);return result;};
    env.healup=(...args)=>{const result=invoke(services.healup,args);return result;};
    env.healmon=(...args)=>{const result=invoke(services.healmon,args);return result;};
    env.losexp=(...args)=>{const result=invoke(services.losexp,args);return result;};
    env.getobj=(...args)=>{const result=invoke(services.getobj,args);return view("obj",result);};
    env.seffects=(...args)=>{const result=invoke(services.seffects,args);return result;};
    env.make_sick=(...args)=>{const result=invoke(services.make_sick,args);return result;};
    env.make_slimed=(...args)=>{const result=invoke(services.make_slimed,args);return result;};
    env.make_blinded=(...args)=>{const result=invoke(services.make_blinded,args);return result;};
    env.untrap=(...args)=>{const result=invoke(services.untrap,args);return result;};
    env.charge_ok=(...args)=>{const result=invoke(services.charge_ok,args);return result;};
    env.recharge=(...args)=>{const result=invoke(services.recharge,args);return result;};
    env.update_inventory=(...args)=>{const result=invoke(services.update_inventory,args);return result;};
    env.add_menu=(...args)=>{const result=invoke(services.add_menu,args);return result;};
    env.select_menu=(...args)=>{const result=invoke(services.select_menu,args);return result;};
    env.free=(...args)=>{const result=invoke(services.free,args);return result;};
    env.depth=(...args)=>{const result=invoke(services.depth,args);return result;};
    env.next_to_u=(...args)=>{const result=invoke(services.next_to_u,args);return result;};
    env.goto_level=(...args)=>{const result=invoke(services.goto_level,args);return result;};
    env.weight=(...args)=>{const result=invoke(services.weight,args);return result;};
    env.hold_another_object=(...args)=>{const result=invoke(services.hold_another_object,args);return view("obj",result);};
    env.aobjnam=(...args)=>{const result=invoke(services.aobjnam,args);return result;};
    env.find_hell=(...args)=>{const result=invoke(services.find_hell,args);return result;};
    env.isok=(...args)=>{const result=invoke(services.isok,args);return result;};
    env.In_quest=(...args)=>{const result=invoke(services.In_quest,args);return result;};
    env.In_hell=(...args)=>{const result=invoke(services.In_hell,args);return result;};
    env.dunlevs_in_dungeon=(...args)=>{const result=invoke(services.dunlevs_in_dungeon,args);return result;};
    env.migrate_mon=(...args)=>{const result=invoke(services.migrate_mon,args);return result;};
    env.ledger_no=(...args)=>{const result=invoke(services.ledger_no,args);return result;};
    env.u_teleport_mon=(...args)=>{const result=invoke(services.u_teleport_mon,args);return result;};
    env.eos=(...args)=>{const result=invoke(services.eos,args);return result;};
    env.getdir=(...args)=>{const result=invoke(services.getdir,args);return result;};
    env.throwit=(...args)=>{const result=invoke(services.throwit,args);return result;};
    env.spell_skilltype=(...args)=>{const result=invoke(services.spell_skilltype,args);return result;};
    env.spelleffects=(...args)=>{const result=invoke(services.spelleffects,args);return result;};
    env.do_blinding_ray=(...args)=>{const result=invoke(services.do_blinding_ray,args);return result;};
    env.litroom=(...args)=>{const result=invoke(services.litroom,args);return result;};
    env.lightdamage=(...args)=>{const result=invoke(services.lightdamage,args);return result;};
    env.flashburn=(...args)=>{const result=invoke(services.flashburn,args);return result;};
    env.otense=(...args)=>{const result=invoke(services.otense,args);return result;};
    env.rnz=(...args)=>{const result=invoke(services.rnz,args);return result;};
    env.use_crystal_ball=(...args)=>{const result=invoke(services.use_crystal_ball,args);return result;};
    env.level_tele=(...args)=>{const result=invoke(services.level_tele,args);return result;};
    env.enlightenment=(...args)=>{const result=invoke(services.enlightenment,args);return result;};
    env.float_up=(...args)=>{const result=invoke(services.float_up,args);return result;};
    env.spoteffects=(...args)=>{const result=invoke(services.spoteffects,args);return result;};
    env.float_down=(...args)=>{const result=invoke(services.float_down,args);return result;};
    env.newsym=(...args)=>{const result=invoke(services.newsym,args);return result;};
    env.getrumor=(...args)=>{const result=invoke(services.getrumor,args);return result;};
    env.bcsign=(...args)=>{const result=invoke(services.bcsign,args);return result;};
    env.clr2colorname=(...args)=>{const result=invoke(services.clr2colorname,args);return result;};
    env.maybe_lvltport_feedback=(...args)=>{const result=invoke(services.maybe_lvltport_feedback,args);return result;};
    env.invocation_pos=(...args)=>{const result=invoke(services.invocation_pos,args);return result;};
    env.On_stairs=(...args)=>{const result=invoke(services.On_stairs,args);return result;};
    env.yname=(...args)=>{const result=invoke(services.yname,args);return result;};
    env.killer_xname=(...args)=>{const result=invoke(services.killer_xname,args);return result;};
    env.remove_worn_item=(...args)=>{const result=invoke(services.remove_worn_item,args);return result;};
    env.freeinv=(...args)=>{const result=invoke(services.freeinv,args);return result;};
    env.hitfloor=(...args)=>{const result=invoke(services.hitfloor,args);return result;};
    env.surface=(...args)=>{const result=invoke(services.surface,args);return result;};
    env.dropx=(...args)=>{const result=invoke(services.dropx,args);return result;};
    env.clear_bypasses=(...args)=>{const result=invoke(services.clear_bypasses,args);return result;};
    env.bypass_obj=(...args)=>{const result=invoke(services.bypass_obj,args);return result;};
    env.which_armor=(...args)=>{const result=invoke(services.which_armor,args);return view("obj",result);};
    env.dismount_steed=(...args)=>{const result=invoke(services.dismount_steed,args);return result;};
    env.nxt_unbypassed_obj=(...args)=>{const result=invoke(services.nxt_unbypassed_obj,args);return view("obj",result);};
    env.uncurse=(...args)=>{const result=invoke(services.uncurse,args);return result;};
    env.selftouch=(...args)=>{const result=invoke(services.selftouch,args);return result;};
    env.glyph_at=(...args)=>{const result=invoke(services.glyph_at,args);return result;};
    env.t_at=(...args)=>{const result=invoke(services.t_at,args);return result;};
    env.nxtobj=(...args)=>{const result=invoke(services.nxtobj,args);return view("obj",result);};
    Object.defineProperty(env,"HAntimagic",{get:()=>env.u.uprops[env.ANTIMAGIC].intrinsic,set:value=>{env.u.uprops[env.ANTIMAGIC].intrinsic=value;}});
    Object.defineProperty(env,"EAntimagic",{get:()=>env.u.uprops[env.ANTIMAGIC].extrinsic,set:value=>{env.u.uprops[env.ANTIMAGIC].extrinsic=value;}});
    Object.defineProperty(env,"Antimagic",{get:()=>Number(Boolean((env.HAntimagic || env.EAntimagic)))});
    Object.defineProperty(env,"BInvis",{get:()=>env.u.uprops[env.INVIS].blocked,set:value=>{env.u.uprops[env.INVIS].blocked=value;}});
    Object.defineProperty(env,"HBlinded",{get:()=>env.u.uprops[env.BLINDED].intrinsic,set:value=>{env.u.uprops[env.BLINDED].intrinsic=value;}});
    Object.defineProperty(env,"EBlinded",{get:()=>env.u.uprops[env.BLINDED].extrinsic,set:value=>{env.u.uprops[env.BLINDED].extrinsic=value;}});
    Object.defineProperty(env,"BBlinded",{get:()=>env.u.uprops[env.BLINDED].blocked,set:value=>{env.u.uprops[env.BLINDED].blocked=value;}});
    Object.defineProperty(env,"Blind",{get:()=>Number(Boolean(((env.HBlinded || env.EBlinded) && !env.BBlinded)))});
    Object.defineProperty(env,"Blinded",{get:()=>Number(Boolean((env.HBlinded && !env.BBlinded)))});
    Object.defineProperty(env,"BlindedTimeout",{get:()=>(env.HBlinded & env.TIMEOUT)});
    Object.defineProperty(env,"HCold_resistance",{get:()=>env.u.uprops[env.COLD_RES].intrinsic,set:value=>{env.u.uprops[env.COLD_RES].intrinsic=value;}});
    Object.defineProperty(env,"ECold_resistance",{get:()=>env.u.uprops[env.COLD_RES].extrinsic,set:value=>{env.u.uprops[env.COLD_RES].extrinsic=value;}});
    Object.defineProperty(env,"Cold_resistance",{get:()=>Number(Boolean((env.HCold_resistance || env.ECold_resistance)))});
    env.DEADMONSTER=(mon)=>Number(Boolean(((mon).mhp < 1)));
    Object.defineProperty(env,"HDrain_resistance",{get:()=>env.u.uprops[env.DRAIN_RES].intrinsic,set:value=>{env.u.uprops[env.DRAIN_RES].intrinsic=value;}});
    Object.defineProperty(env,"EDrain_resistance",{get:()=>env.u.uprops[env.DRAIN_RES].extrinsic,set:value=>{env.u.uprops[env.DRAIN_RES].extrinsic=value;}});
    Object.defineProperty(env,"Drain_resistance",{get:()=>Number(Boolean((env.HDrain_resistance || env.EDrain_resistance)))});
    Object.defineProperty(env,"EBlnd_resist",{get:()=>env.u.uprops[env.BLND_RES].extrinsic,set:value=>{env.u.uprops[env.BLND_RES].extrinsic=value;}});
    Object.defineProperty(env,"EEnergy_regeneration",{get:()=>env.u.uprops[env.ENERGY_REGENERATION].extrinsic,set:value=>{env.u.uprops[env.ENERGY_REGENERATION].extrinsic=value;}});
    Object.defineProperty(env,"EHalf_physical_damage",{get:()=>env.u.uprops[env.HALF_PHDAM].extrinsic,set:value=>{env.u.uprops[env.HALF_PHDAM].extrinsic=value;}});
    Object.defineProperty(env,"EHalf_spell_damage",{get:()=>env.u.uprops[env.HALF_SPDAM].extrinsic,set:value=>{env.u.uprops[env.HALF_SPDAM].extrinsic=value;}});
    Object.defineProperty(env,"ELevitation",{get:()=>env.u.uprops[env.LEVITATION].extrinsic,set:value=>{env.u.uprops[env.LEVITATION].extrinsic=value;}});
    Object.defineProperty(env,"EProtection",{get:()=>env.u.uprops[env.PROTECTION].extrinsic,set:value=>{env.u.uprops[env.PROTECTION].extrinsic=value;}});
    Object.defineProperty(env,"EReflecting",{get:()=>env.u.uprops[env.REFLECTING].extrinsic,set:value=>{env.u.uprops[env.REFLECTING].extrinsic=value;}});
    Object.defineProperty(env,"ERegeneration",{get:()=>env.u.uprops[env.REGENERATION].extrinsic,set:value=>{env.u.uprops[env.REGENERATION].extrinsic=value;}});
    Object.defineProperty(env,"ESearching",{get:()=>env.u.uprops[env.SEARCHING].extrinsic,set:value=>{env.u.uprops[env.SEARCHING].extrinsic=value;}});
    Object.defineProperty(env,"EStealth",{get:()=>env.u.uprops[env.STEALTH].extrinsic,set:value=>{env.u.uprops[env.STEALTH].extrinsic=value;}});
    Object.defineProperty(env,"ETelepat",{get:()=>env.u.uprops[env.TELEPAT].extrinsic,set:value=>{env.u.uprops[env.TELEPAT].extrinsic=value;}});
    Object.defineProperty(env,"ETeleport_control",{get:()=>env.u.uprops[env.TELEPORT_CONTROL].extrinsic,set:value=>{env.u.uprops[env.TELEPORT_CONTROL].extrinsic=value;}});
    Object.defineProperty(env,"EWarn_of_mon",{get:()=>env.u.uprops[env.WARN_OF_MON].extrinsic,set:value=>{env.u.uprops[env.WARN_OF_MON].extrinsic=value;}});
    Object.defineProperty(env,"EWarning",{get:()=>env.u.uprops[env.WARNING].extrinsic,set:value=>{env.u.uprops[env.WARNING].extrinsic=value;}});
    Object.defineProperty(env,"HFire_resistance",{get:()=>env.u.uprops[env.FIRE_RES].intrinsic,set:value=>{env.u.uprops[env.FIRE_RES].intrinsic=value;}});
    Object.defineProperty(env,"EFire_resistance",{get:()=>env.u.uprops[env.FIRE_RES].extrinsic,set:value=>{env.u.uprops[env.FIRE_RES].extrinsic=value;}});
    Object.defineProperty(env,"Fire_resistance",{get:()=>Number(Boolean((env.HFire_resistance || env.EFire_resistance)))});
    Object.defineProperty(env,"HConfusion",{get:()=>env.u.uprops[env.CONFUSION].intrinsic,set:value=>{env.u.uprops[env.CONFUSION].intrinsic=value;}});
    Object.defineProperty(env,"HLevitation",{get:()=>env.u.uprops[env.LEVITATION].intrinsic,set:value=>{env.u.uprops[env.LEVITATION].intrinsic=value;}});
    Object.defineProperty(env,"HStun",{get:()=>env.u.uprops[env.STUNNED].intrinsic,set:value=>{env.u.uprops[env.STUNNED].intrinsic=value;}});
    Object.defineProperty(env,"HHallucination",{get:()=>env.u.uprops[env.HALLUC].intrinsic,set:value=>{env.u.uprops[env.HALLUC].intrinsic=value;}});
    Object.defineProperty(env,"HHalluc_resistance",{get:()=>env.u.uprops[env.HALLUC_RES].intrinsic,set:value=>{env.u.uprops[env.HALLUC_RES].intrinsic=value;}});
    Object.defineProperty(env,"EHalluc_resistance",{get:()=>env.u.uprops[env.HALLUC_RES].extrinsic,set:value=>{env.u.uprops[env.HALLUC_RES].extrinsic=value;}});
    Object.defineProperty(env,"Halluc_resistance",{get:()=>Number(Boolean((env.HHalluc_resistance || env.EHalluc_resistance)))});
    Object.defineProperty(env,"Hallucination",{get:()=>Number(Boolean((env.HHallucination && !env.Halluc_resistance)))});
    env.Has_contents=(o)=>Number(Boolean(( (o).cobj != 0)));
    Object.defineProperty(env,"Hate_silver",{get:()=>Number(Boolean((env.u.ulycn >= env.LOW_PM || env.hates_silver(env.gy.youmonst.data))))});
    env.IS_ALTAR=(typ)=>Number(Boolean(((typ) == env.ALTAR)));
    env.IS_DOOR=(typ)=>Number(Boolean(((typ) == env.DOOR)));
    Object.defineProperty(env,"astral_level",{get:()=>(env.svd.dungeon_topology.d_astral_level)});
    env.In_endgame=(x)=>Number(Boolean(((x).dnum == env.astral_level.dnum)));
    Object.defineProperty(env,"Inhell",{get:()=>env.In_hell(env.u.uz)});
    env.Is_container=(o)=>Number(Boolean(((o).otyp >= env.LARGE_BOX && (o).otyp <= env.BAG_OF_TRICKS)));
    env.Is_dragon_scales=(obj)=>Number(Boolean(((obj).otyp >= env.GRAY_DRAGON_SCALES && (obj).otyp <= env.YELLOW_DRAGON_SCALES)));
    env.Is_dragon_mail=(obj)=>Number(Boolean(((obj).otyp >= env.GRAY_DRAGON_SCALE_MAIL && (obj).otyp <= env.YELLOW_DRAGON_SCALE_MAIL)));
    env.Is_dragon_armor=(obj)=>Number(Boolean((env.Is_dragon_scales(obj) || env.Is_dragon_mail(obj))));
    Object.defineProperty(env,"BLevitation",{get:()=>env.u.uprops[env.LEVITATION].blocked,set:value=>{env.u.uprops[env.LEVITATION].blocked=value;}});
    Object.defineProperty(env,"Levitation",{get:()=>Number(Boolean(((env.HLevitation || env.ELevitation) && !env.BLevitation)))});
    Object.defineProperty(env,"HHalf_physical_damage",{get:()=>env.u.uprops[env.HALF_PHDAM].intrinsic,set:value=>{env.u.uprops[env.HALF_PHDAM].intrinsic=value;}});
    Object.defineProperty(env,"Half_physical_damage",{get:()=>Number(Boolean((env.HHalf_physical_damage || env.EHalf_physical_damage)))});
    env.Maybe_Half_Phys=(dmg)=>(env.Half_physical_damage ? Math.trunc((Number(dmg) + 1) / 2) : dmg);
    Object.defineProperty(env,"NH_BLACK",{get:()=>env.c_color_names.c_black,set:value=>{env.c_color_names.c_black=value;}});
    Object.defineProperty(env,"Never_mind",{get:()=>env.c_common_strings.c_Never_mind,set:value=>{env.c_common_strings.c_Never_mind=value;}});
    env.OBJ_DESCR=(obj)=>(env.obj_descr[(obj).oc_descr_idx].oc_descr);
    env.P_MAX_SKILL=(type)=>(env.u.weapon_skills[type].max_skill);
    Object.defineProperty(env,"HPoison_resistance",{get:()=>env.u.uprops[env.POISON_RES].intrinsic,set:value=>{env.u.uprops[env.POISON_RES].intrinsic=value;}});
    Object.defineProperty(env,"EPoison_resistance",{get:()=>env.u.uprops[env.POISON_RES].extrinsic,set:value=>{env.u.uprops[env.POISON_RES].extrinsic=value;}});
    Object.defineProperty(env,"Poison_resistance",{get:()=>Number(Boolean((env.HPoison_resistance || env.EPoison_resistance)))});
    env.Race_if=(X)=>Number(Boolean((env.gu.urace.mnum == (X))));
    env.Role_if=(X)=>Number(Boolean((env.gu.urole.mnum == (X))));
    Object.defineProperty(env,"Role_switch",{get:()=>(env.gu.urole.mnum)});
    env.SPELL_LEV_PW=(lvl)=>((lvl) * 5);
    env.Sfi_arti_info=(a,b,c)=>env.sfi_arti_info(a, b, c);
    env.Sfi_short=(a,b,c)=>env.sfi_short(a, b, c);
    env.Sfo_arti_info=(a,b,c)=>env.sfo_arti_info(a, b, c);
    env.Sfo_xint16=(a,b,c)=>env.sfo_xint16(a, b, c);
    Object.defineProperty(env,"HShock_resistance",{get:()=>env.u.uprops[env.SHOCK_RES].intrinsic,set:value=>{env.u.uprops[env.SHOCK_RES].intrinsic=value;}});
    Object.defineProperty(env,"EShock_resistance",{get:()=>env.u.uprops[env.SHOCK_RES].extrinsic,set:value=>{env.u.uprops[env.SHOCK_RES].extrinsic=value;}});
    Object.defineProperty(env,"Shock_resistance",{get:()=>Number(Boolean((env.HShock_resistance || env.EShock_resistance)))});
    Object.defineProperty(env,"Sick",{get:()=>env.u.uprops[env.SICK].intrinsic,set:value=>{env.u.uprops[env.SICK].intrinsic=value;}});
    Object.defineProperty(env,"Slimed",{get:()=>env.u.uprops[env.SLIMED].intrinsic,set:value=>{env.u.uprops[env.SLIMED].intrinsic=value;}});
    Object.defineProperty(env,"HStone_resistance",{get:()=>env.u.uprops[env.STONE_RES].intrinsic,set:value=>{env.u.uprops[env.STONE_RES].intrinsic=value;}});
    Object.defineProperty(env,"EStone_resistance",{get:()=>env.u.uprops[env.STONE_RES].extrinsic,set:value=>{env.u.uprops[env.STONE_RES].extrinsic=value;}});
    Object.defineProperty(env,"Stone_resistance",{get:()=>Number(Boolean((env.HStone_resistance || env.EStone_resistance)))});
    Object.defineProperty(env,"Upolyd",{get:()=>(env.u.umonnum != env.u.umonster)});
    env.amorphous=(ptr)=>Number(Boolean((((ptr).mflags1 & env.M1_AMORPHOUS) != 0n)));
    env.bigmonst=(ptr)=>Number(Boolean(((ptr).msize >= env.MZ_LARGE)));
    env.cansee=(x,y)=>Number(Boolean(((env.gv.viz_array[y][x] & env.IN_SIGHT) != 0)));
    env.canspotmon=(mon)=>Number(Boolean((env.canseemon(mon) || env.sensemon(mon))));
    env.carried=(o)=>Number(Boolean(((o).where == env.OBJ_INVENT)));
    env.couldsee=(x,y)=>Number(Boolean(((env.gv.viz_array[y][x] & env.COULD_SEE) != 0)));
    env.engulfing_u=(mon)=>Number(Boolean((env.u.uswallow && (env.u.ustuck == (mon)))));
    Object.defineProperty(env,"fakename",{get:()=>env.c_common_strings.c_fakename,set:value=>{env.c_common_strings.c_fakename=value;}});
    Object.defineProperty(env,"fmon",{get:()=>env.svl.level.monlist,set:value=>{env.svl.level.monlist=value;}});
    env.glyph_is_trap=(glyph)=>Number(Boolean(((glyph) >= (env.GLYPH_TRAP_OFF) && (glyph) < ((env.GLYPH_TRAP_OFF) + env.MAXTCHARS))));
    env.has_head=(ptr)=>Number(Boolean((((ptr).mflags1 & env.M1_NOHEAD) == 0n)));
    env.is_covetous=(ptr)=>(((ptr).mflags3 & env.M3_COVETOUS));
    env.is_demon=(ptr)=>Number(Boolean((((ptr).mflags2 & env.M2_DEMON) != 0n)));
    env.is_lord=(ptr)=>Number(Boolean((((ptr).mflags2 & env.M2_LORD) != 0n)));
    env.is_dlord=(ptr)=>Number(Boolean((env.is_demon(ptr) && env.is_lord(ptr))));
    env.is_prince=(ptr)=>Number(Boolean((((ptr).mflags2 & env.M2_PRINCE) != 0n)));
    env.is_dprince=(ptr)=>Number(Boolean((env.is_demon(ptr) && env.is_prince(ptr))));
    env.is_mplayer=(ptr)=>Number(Boolean((((ptr) >= env.mons[env.PM_ARCHEOLOGIST]) && ((ptr) <= env.mons[env.PM_WIZARD]))));
    env.ismnum=(x)=>Number(Boolean(((x) >= env.LOW_PM && (x) < env.NUMMONS)));
    Object.defineProperty(env,"levl",{get:()=>env.svl.level.locations,set:value=>{env.svl.level.locations=value;}});
    env.nhUse=(arg)=>((arg));
    env.noncorporeal=(ptr)=>Number(Boolean(((ptr).mlet == env.S_GHOST)));
    env.is_undead=(ptr)=>Number(Boolean((((ptr).mflags2 & env.M2_UNDEAD) != 0n)));
    env.is_golem=(ptr)=>Number(Boolean(((ptr).mlet == env.S_GOLEM)));
    env.weirdnonliving=(ptr)=>Number(Boolean((env.is_golem(ptr) || (ptr).mlet == env.S_VORTEX)));
    env.nonliving=(ptr)=>Number(Boolean((env.is_undead(ptr) || (ptr) == env.mons[env.PM_MANES] || env.weirdnonliving(ptr))));
    Object.defineProperty(env,"nothing_happens",{get:()=>env.c_common_strings.c_nothing_happens,set:value=>{env.c_common_strings.c_nothing_happens=value;}});
    Object.defineProperty(env,"nothing_seems_to_happen",{get:()=>env.c_common_strings.c_nothing_seems_to_happen,set:value=>{env.c_common_strings.c_nothing_seems_to_happen=value;}});
    env.pline1=(cstr)=>env.pline("%s", cstr);
    env.race_hostile=(ptr)=>Number(Boolean((((ptr).mflags2 & env.gu.urace.hatemask) != 0n)));
    env.resists_cold=(mon)=>env.Resists_Elem(mon, env.COLD_RES);
    env.resists_elec=(mon)=>env.Resists_Elem(mon, env.SHOCK_RES);
    env.resists_fire=(mon)=>env.Resists_Elem(mon, env.FIRE_RES);
    env.resists_poison=(mon)=>env.Resists_Elem(mon, env.POISON_RES);
    env.resists_ston=(mon)=>env.Resists_Elem(mon, env.STONE_RES);
    env.strcmpi=(a,b)=>env.strncmpi((a), (b), -1);
    Object.defineProperty(env,"tutorial_dnum",{get:()=>(env.svd.dungeon_topology.d_tutorial_dnum)});
    env.u_wield_art=(art)=>env.is_art(env.uwep, art);
    env.verbalize1=(cstr)=>env.verbalize("%s", cstr);
    const cString=fmt=>{if(typeof fmt==='string')return fmt;let at=addr(fmt),out='';const bytes=services.heap();while(bytes[at])out+=String.fromCharCode(bytes[at++]);return out;};
    const formatShape=fmt=>{return Crt.formatShape(cString,fmt);};
    env.You=(...args)=>{const key="You_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.You_cant=(...args)=>{const key="You_cant_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.You_feel=(...args)=>{const key="You_feel_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.Your=(...args)=>{const key="Your_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.impossible=(...args)=>{const key="impossible_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.livelog_printf=(...args)=>{const key="livelog_printf_jp"+formatShape(args[1]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.nh_snprintf=(...args)=>{const key="nh_snprintf_pipjp"+formatShape(args[4]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.pline=(...args)=>{const key="pline_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.pline_The=(...args)=>{const key="pline_The_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.sprintf=(...args)=>{const key="sprintf_pp"+formatShape(args[1]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.verbalize=(...args)=>{const key="verbalize_p"+formatShape(args[0]);const fn=services[key];if(!fn)throw Error("Review unconfigured ARTIFACT vararg ABI "+key);return invoke(fn,args);};
    env.Sprintf=env.sprintf;env.Strcpy=env.strcpy;env.Strcat=env.strcat;
    return env;
}
// Reuse validated views, while preserving per-call service overrides and reentry.
const artifactEnvironments=new WeakMap();
function artifactEnvironmentFor(services,layout){
 let layouts=artifactEnvironments.get(services.moduleKey);
 if(!layouts){layouts=new WeakMap();artifactEnvironments.set(services.moduleKey,layouts);}
 let entry=layouts.get(layout);
 if(!entry){
  entry={active:services};
  const forwarding=new Proxy({}, {get(_target,key){return Reflect.get(entry.active,key,entry.active);}});
  entry.environment=createArtifactEnvironment(forwarding,layout,core);
  // Constructor/layout validation must complete before this entry is visible.
  layouts.set(layout,entry);
 }
 return entry;
}
export function callArtifact(services,layout,name,...args){const saved=services.stackSave();let entry,previous;try{entry=artifactEnvironmentFor(services,layout);previous=entry.active;entry.active=services;const env=entry.environment;if(!env.state.initialized)core.initializeArtifactData(env);
if(name==="mk_artifact"){args[0]=env.view('obj',args[0]);}
if(name==="dispose_of_orig_obj"){args[0]=env.view('obj',args[0]);}
if(name==="artifact_name"){args[1]=env.scalarPointer("short",args[1]);}
if(name==="artifact_exists"){args[0]=env.view('obj',args[0]);}
if(name==="find_artifact"){args[0]=env.view('obj',args[0]);}
if(name==="artifact_origin"){args[0]=env.view('obj',args[0]);}
if(name==="spec_ability"){args[0]=env.view('obj',args[0]);}
if(name==="confers_luck"){args[0]=env.view('obj',args[0]);}
if(name==="arti_reflects"){args[0]=env.view('obj',args[0]);}
if(name==="shade_glare"){args[0]=env.view('obj',args[0]);}
if(name==="restrict_name"){args[0]=env.view('obj',args[0]);}
if(name==="attacks"){args[1]=env.view('obj',args[1]);}
if(name==="defends"){args[1]=env.view('obj',args[1]);}
if(name==="defends_when_carried"){args[1]=env.view('obj',args[1]);}
if(name==="protects"){args[0]=env.view('obj',args[0]);}
if(name==="set_artifact_intrinsic"){args[0]=env.view('obj',args[0]);}
if(name==="touch_artifact"){args[0]=env.view('obj',args[0]);args[1]=env.view('monst',args[1]);}
if(name==="arti_immune"){args[0]=env.view('obj',args[0]);}
if(name==="bane_applies"){args[0]=env.view('artifact',args[0]);args[1]=env.view('monst',args[1]);}
if(name==="spec_applies"){args[0]=env.view('artifact',args[0]);args[1]=env.view('monst',args[1]);}
if(name==="spec_m2"){args[0]=env.view('obj',args[0]);}
if(name==="spec_abon"){args[0]=env.view('obj',args[0]);args[1]=env.view('monst',args[1]);}
if(name==="spec_dbon"){args[0]=env.view('obj',args[0]);args[1]=env.view('monst',args[1]);}
if(name==="Mb_hit"){args[0]=env.view('monst',args[0]);args[1]=env.view('monst',args[1]);args[2]=env.view('obj',args[2]);args[3]=env.scalarPointer("int",args[3]);}
if(name==="artifact_hit"){args[0]=env.view('monst',args[0]);args[1]=env.view('monst',args[1]);args[2]=env.view('obj',args[2]);args[3]=env.scalarPointer("int",args[3]);}
if(name==="invoke_ok"){args[0]=env.view('obj',args[0]);}
if(name==="nothing_special"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_taming"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_healing"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_energy_boost"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_untrap"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_charge_obj"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_create_portal"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_create_ammo"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_banish"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_fling_poison"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_storm_spell"){args[0]=env.view('obj',args[0]);}
if(name==="invoke_blinding_ray"){args[0]=env.view('obj',args[0]);}
if(name==="arti_invoke_cost_pw"){args[0]=env.view('obj',args[0]);}
if(name==="arti_invoke_cost"){args[0]=env.view('obj',args[0]);}
if(name==="arti_invoke"){args[0]=env.view('obj',args[0]);}
if(name==="finesse_ahriman"){args[0]=env.view('obj',args[0]);}
if(name==="artifact_light"){args[0]=env.view('obj',args[0]);}
if(name==="arti_speak"){args[0]=env.view('obj',args[0]);}
if(name==="artifact_has_invprop"){args[0]=env.view('obj',args[0]);}
if(name==="arti_cost"){args[0]=env.view('obj',args[0]);}
if(name==="abil_to_adtyp"){args[0]=env.scalarPointer("long",args[0]);}
if(name==="abil_to_spfx"){args[0]=env.scalarPointer("long",args[0]);}
if(name==="what_gives"){args[0]=env.scalarPointer("long",args[0]);}
if(name==="retouch_object"){args[0]=env.scalarPointer("struct obj *",args[0]);}
if(name==="untouchable"){args[0]=env.view('obj',args[0]);}
if(name==="is_magic_key"){args[0]=env.view('monst',args[0]);args[1]=env.view('obj',args[1]);}
if(name==="has_magic_key"){args[0]=env.view('monst',args[0]);}
if(name==="is_art"){args[0]=env.view('obj',args[0]);}
if(name==="get_artifact"){args[0]=env.view('obj',args[0]);}
if(name==="permapoisoned"){args[0]=env.view('obj',args[0]);}
const result=withCEnvironment(env,()=>core[name](...args));return typeof result==='string'?services.literal(result):result?.address??result;}finally{if(entry)entry.active=previous;services.stackRestore(saved);}}
