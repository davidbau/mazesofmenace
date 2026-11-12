import * as Crt from '../c-runtime/adapter-memory.js';
// APPLY typed native storage/dependencies/header transport; source algorithms stay in apply.js.
import * as core from './apply.js';
import {withCEnvironment} from './c-runtime.js';
const fieldAliases={"NH_RED": "c_color_names.c_red", "Something": "c_common_strings.c_Something", "doormask": "flags", "fmon": "svl.level.monlist", "leashmon": "corpsenm", "levl": "svl.level.locations", "nexthere": "v.v_nexthere", "nothing_happens": "c_common_strings.c_nothing_happens", "nothing_seems_to_happen": "c_common_strings.c_nothing_seems_to_happen", "oc_armcat": "oc_subtyp", "oc_bimanual": "oc_big", "oc_skill": "oc_subtyp", "ocarry": "v.v_ocarry", "something": "c_common_strings.c_something", "spestudied": "usecount"};
const records={"struct you":{"dx":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F0","record":0},"dy":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F1","record":0},"ux":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R0_F2","record":0},"uy":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R0_F3","record":0},"uinwater":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R0_F4","record":0,"bitIndex":0},"uswallow":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R0_F5","record":0,"bitIndex":1},"ustuck":{"type":"struct monst *","sourceType":"struct monst *","bit":false,"const":false,"key":"R0_F6","record":0},"dz":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F7","record":0},"uprops":{"type":"struct prop[69]","sourceType":"struct prop[69]","bit":false,"const":false,"key":"R0_F8","record":0},"ucreamed":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R0_F9","record":0},"uroleplay":{"type":"struct u_roleplay","sourceType":"struct u_roleplay","bit":false,"const":false,"key":"R0_F10","record":0},"usteed":{"type":"struct monst *","sourceType":"struct monst *","bit":false,"const":false,"key":"R0_F11","record":0},"uz":{"type":"struct d_level","sourceType":"d_level","bit":false,"const":false,"key":"R0_F12","record":0},"uconduct":{"type":"struct u_conduct","sourceType":"struct u_conduct","bit":false,"const":false,"key":"R0_F13","record":0},"umonnum":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F14","record":0},"ulevel":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F15","record":0},"uhs":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R0_F16","record":0},"umonster":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F17","record":0},"mfemale":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R0_F18","record":0,"bitIndex":2},"utrap":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R0_F19","record":0},"utraptype":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R0_F20","record":0},"uhunger":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R0_F21","record":0},"weapon_skills":{"type":"struct skills[38]","sourceType":"struct skills[38]","bit":false,"const":false,"key":"R0_F22","record":0},"atemp":{"type":"struct attribs","sourceType":"struct attribs","bit":false,"const":false,"key":"R0_F23","record":0}},"struct obj":{"ox":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R1_F0","record":1},"oy":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R1_F1","record":1},"otyp":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R1_F2","record":1},"spe":{"type":"signed char","sourceType":"schar","bit":false,"const":false,"key":"R1_F3","record":1},"cursed":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F4","record":1,"bitIndex":3},"corpsenm":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F5","record":1},"quan":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R1_F6","record":1},"where":{"type":"signed char","sourceType":"xint8","bit":false,"const":false,"key":"R1_F7","record":1},"v":{"type":"union vptrs","sourceType":"union vptrs","bit":false,"const":false,"key":"R1_F8","record":1},"dknown":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F9","record":1,"bitIndex":4},"oclass":{"type":"char","sourceType":"char","bit":false,"const":false,"key":"R1_F10","record":1},"cobj":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R1_F11","record":1},"nobj":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R1_F12","record":1},"age":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R1_F13","record":1},"blessed":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F14","record":1,"bitIndex":5},"known":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F15","record":1,"bitIndex":6},"lamplit":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F16","record":1,"bitIndex":7},"unpaid":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F17","record":1,"bitIndex":8},"owt":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R1_F18","record":1},"owornmask":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R1_F19","record":1},"nomerge":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F20","record":1,"bitIndex":9},"invlet":{"type":"char","sourceType":"char","bit":false,"const":false,"key":"R1_F21","record":1},"oeaten":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R1_F22","record":1},"no_charge":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F23","record":1,"bitIndex":10},"greased":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F24","record":1,"bitIndex":11},"bknown":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R1_F25","record":1,"bitIndex":12},"timed":{"type":"short","sourceType":"xint16","bit":false,"const":false,"key":"R1_F26","record":1},"oartifact":{"type":"char","sourceType":"char","bit":false,"const":false,"key":"R1_F27","record":1},"usecount":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F28","record":1}},"struct c_common_strings":{"c_nothing_happens":{"type":"char *","sourceType":"const char *const","bit":false,"const":true,"key":"R2_F0","record":2},"c_nothing_seems_to_happen":{"type":"char *","sourceType":"const char *const","bit":false,"const":true,"key":"R2_F1","record":2},"c_something":{"type":"char *","sourceType":"const char *const","bit":false,"const":true,"key":"R2_F2","record":2},"c_Something":{"type":"char *","sourceType":"const char *const","bit":false,"const":true,"key":"R2_F3","record":2}},"struct prop":{"intrinsic":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F0","record":3},"blocked":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F1","record":3},"extrinsic":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F2","record":3}},"struct permonst":{"msize":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R4_F0","record":4},"mflags2":{"type":"unsigned long","sourceType":"unsigned long","bit":false,"const":false,"key":"R4_F1","record":4},"mflags1":{"type":"unsigned long","sourceType":"unsigned long","bit":false,"const":false,"key":"R4_F2","record":4},"mlet":{"type":"char","sourceType":"char","bit":false,"const":false,"key":"R4_F3","record":4},"msound":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R4_F4","record":4},"mattk":{"type":"struct attack[6]","sourceType":"struct attack[6]","bit":false,"const":false,"key":"R4_F5","record":4},"cnutrit":{"type":"unsigned short","sourceType":"unsigned short","bit":false,"const":false,"key":"R4_F6","record":4}},"struct monst":{"data":{"type":"struct permonst *","sourceType":"struct permonst *","bit":false,"const":false,"key":"R5_F0","record":5},"mnum":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R5_F1","record":5},"mx":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R5_F2","record":5},"my":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R5_F3","record":5},"mundetected":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F4","record":5,"bitIndex":13},"mappearance":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R5_F5","record":5},"m_ap_type":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R5_F6","record":5},"mextra":{"type":"struct mextra *","sourceType":"struct mextra *","bit":false,"const":false,"key":"R5_F7","record":5},"nmon":{"type":"struct monst *","sourceType":"struct monst *","bit":false,"const":false,"key":"R5_F8","record":5},"mhp":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R5_F9","record":5},"mtame":{"type":"signed char","sourceType":"schar","bit":false,"const":false,"key":"R5_F10","record":5},"mtrapped":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F11","record":5,"bitIndex":14},"m_id":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R5_F12","record":5},"mleashed":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F13","record":5,"bitIndex":15},"msleeping":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F14","record":5,"bitIndex":16},"cham":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R5_F15","record":5},"mcan":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F16","record":5,"bitIndex":17},"minvis":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F17","record":5,"bitIndex":18},"mcansee":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F18","record":5,"bitIndex":19},"m_lev":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R5_F19","record":5},"mfrozen":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F20","record":5,"bitIndex":20},"mconf":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F21","record":5,"bitIndex":21},"wormno":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F22","record":5,"bitIndex":22},"mw":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R5_F23","record":5},"mpeaceful":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R5_F24","record":5,"bitIndex":23}},"struct Gender":{"he":{"type":"char *","sourceType":"const char *","bit":false,"const":false,"key":"R6_F0","record":6},"his":{"type":"char *","sourceType":"const char *","bit":false,"const":false,"key":"R6_F1","record":6},"him":{"type":"char *","sourceType":"const char *","bit":false,"const":false,"key":"R6_F2","record":6}},"struct instance_globals_o":{"otg_otmp":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R7_F0","record":7},"otg_temp":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R7_F1","record":7},"occupation":{"type":"int (*)(void)","sourceType":"int (*)(void)","bit":false,"const":false,"key":"R7_F2","record":7}},"union vptrs":{"v_nexthere":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R8_F0","record":8},"v_ocarry":{"type":"struct monst *","sourceType":"struct monst *","bit":false,"const":false,"key":"R8_F1","record":8}},"struct dlevel_t":{"objects":{"type":"struct obj *[80][21]","sourceType":"struct obj *[80][21]","bit":false,"const":false,"key":"R9_F0","record":9},"monsters":{"type":"struct monst *[80][21]","sourceType":"struct monst *[80][21]","bit":false,"const":false,"key":"R9_F1","record":9},"locations":{"type":"struct rm[80][21]","sourceType":"struct rm[80][21]","bit":false,"const":false,"key":"R9_F2","record":9},"flags":{"type":"struct levelflags","sourceType":"struct levelflags","bit":false,"const":false,"key":"R9_F3","record":9},"monlist":{"type":"struct monst *","sourceType":"struct monst *","bit":false,"const":false,"key":"R9_F4","record":9}},"struct instance_globals_saved_l":{"level":{"type":"struct dlevel_t","sourceType":"dlevel_t","bit":false,"const":false,"key":"R10_F0","record":10}},"struct Role":{"mnum":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R11_F0","record":11}},"struct instance_globals_u":{"urole":{"type":"struct Role","sourceType":"struct Role","bit":false,"const":false,"key":"R12_F0","record":12},"urace":{"type":"struct Race","sourceType":"struct Race","bit":false,"const":false,"key":"R12_F1","record":12}},"struct trap":{"ttyp":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R13_F0","record":13,"bitIndex":24},"madeby_u":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R13_F1","record":13,"bitIndex":25},"tx":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R13_F2","record":13},"ty":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R13_F3","record":13}},"struct instance_globals_y":{"youmonst":{"type":"struct monst","sourceType":"struct monst","bit":false,"const":false,"key":"R14_F0","record":14}},"struct u_roleplay":{"deaf":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R15_F0","record":15}},"struct instance_globals_h":{"hero_seq":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R16_F0","record":16}},"struct context_info":{"stethoscope_seq":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R17_F0","record":17},"move":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R17_F1","record":17},"polearm":{"type":"struct polearm_info","sourceType":"struct polearm_info","bit":false,"const":false,"key":"R17_F2","record":17},"snickersnee_turn":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R17_F3","record":17}},"struct instance_globals_saved_c":{"context":{"type":"struct context_info","sourceType":"struct context_info","bit":false,"const":false,"key":"R18_F0","record":18}},"struct nhcoord":{"x":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R19_F0","record":19},"y":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R19_F1","record":19}},"struct instance_globals_b":{"bhitpos":{"type":"struct nhcoord","sourceType":"coord","bit":false,"const":false,"key":"R20_F0","record":20}},"struct instance_globals_n":{"notonhead":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R21_F0","record":21},"nomovemsg":{"type":"char *","sourceType":"const char *","bit":false,"const":false,"key":"R21_F1","record":21}},"struct d_level":{"dlevel":{"type":"short","sourceType":"xint16","bit":false,"const":false,"key":"R22_F0","record":22},"dnum":{"type":"short","sourceType":"xint16","bit":false,"const":false,"key":"R22_F1","record":22}},"struct dgn_topology":{"d_stronghold_level":{"type":"struct d_level","sourceType":"d_level","bit":false,"const":false,"key":"R23_F0","record":23},"d_water_level":{"type":"struct d_level","sourceType":"d_level","bit":false,"const":false,"key":"R23_F1","record":23},"d_knox_level":{"type":"struct d_level","sourceType":"d_level","bit":false,"const":false,"key":"R23_F2","record":23},"d_sokoban_dnum":{"type":"short","sourceType":"xint16","bit":false,"const":false,"key":"R23_F3","record":23},"d_air_level":{"type":"struct d_level","sourceType":"d_level","bit":false,"const":false,"key":"R23_F4","record":23}},"struct instance_globals_saved_d":{"dungeon_topology":{"type":"struct dgn_topology","sourceType":"struct dgn_topology","bit":false,"const":false,"key":"R24_F0","record":24}},"struct mextra":{"mcorpsenm":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R25_F0","record":25}},"struct objclass":{"oc_subtyp":{"type":"signed char","sourceType":"schar","bit":false,"const":false,"key":"R26_F0","record":26},"oc_name_known":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R26_F1","record":26,"bitIndex":26},"oc_cost":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R26_F2","record":26},"oc_material":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R26_F3","record":26,"bitIndex":27},"oc_color":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R26_F4","record":26},"oc_big":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R26_F5","record":26,"bitIndex":28},"oc_magic":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R26_F6","record":26,"bitIndex":29}},"struct symdef":{"explanation":{"type":"char *","sourceType":"const char *","bit":false,"const":false,"key":"R27_F0","record":27}},"struct flag":{"verbose":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R28_F0","record":28},"female":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R28_F1","record":28},"confirm":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R28_F2","record":28},"paranoia_bits":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R28_F3","record":28}},"struct rm":{"typ":{"type":"signed char","sourceType":"schar","bit":false,"const":false,"key":"R29_F0","record":29},"flags":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R29_F1","record":29,"bitIndex":30},"glyph":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R29_F2","record":29},"horizontal":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R29_F3","record":29,"bitIndex":31},"candig":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R29_F4","record":29,"bitIndex":32}},"struct levelflags":{"stasis_until":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R30_F0","record":30},"arboreal":{"type":"unsigned int","sourceType":"unsigned int","bit":true,"const":false,"key":"R30_F1","record":30,"bitIndex":33}},"struct instance_globals_saved_m":{"moves":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R31_F0","record":31},"mvitals":{"type":"struct mvitals[383]","sourceType":"struct mvitals[383]","bit":false,"const":false,"key":"R31_F1","record":31}},"struct instance_flags":{"last_msg":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R32_F0","record":32}},"struct instance_globals_i":{"invent":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R33_F0","record":33}},"struct u_conduct":{"killer":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R34_F0","record":34}},"struct instance_globals_m":{"multi_reason":{"type":"char *","sourceType":"const char *","bit":false,"const":false,"key":"R35_F0","record":35},"multi":{"type":"long","sourceType":"cmdcount_nht","bit":false,"const":false,"key":"R35_F1","record":35}},"struct instance_globals_s":{"stoned":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R36_F0","record":36}},"struct attack":{"damd":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R37_F0","record":37}},"struct mvitals":{"mvflags":{"type":"unsigned char","sourceType":"uchar","bit":false,"const":false,"key":"R38_F0","record":38}},"struct instance_globals_v":{"viz_array":{"type":"unsigned char**","sourceType":"seenV **","bit":false,"const":false,"key":"R39_F0","record":39},"vision_full_recalc":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R39_F1","record":39}},"struct instance_globals_j":{"jumping_is_magic":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R40_F0","record":40}},"struct display_hints":{"botl":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R41_F0","record":41}},"union any":{"a_obj":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R42_F0","record":42},"a_int":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R42_F1","record":42}},"struct Race":{"mnum":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R43_F0","record":43}},"struct trapinfo":{"tobj":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R44_F0","record":44},"force_bungle":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R44_F1","record":44},"tx":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R44_F2","record":44},"ty":{"type":"short","sourceType":"coordxy","bit":false,"const":false,"key":"R44_F3","record":44},"time_needed":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R44_F4","record":44}},"struct instance_globals_t":{"trapinfo":{"type":"struct trapinfo","sourceType":"struct trapinfo","bit":false,"const":false,"key":"R45_F0","record":45}},"struct stairway":{"isladder":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R46_F0","record":46}},"struct skills":{"skill":{"type":"short","sourceType":"xint16","bit":false,"const":false,"key":"R47_F0","record":47}},"struct instance_globals_p":{"polearm_range_max":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R48_F0","record":48},"polearm_range_min":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R48_F1","record":48}},"struct polearm_info":{"hitmon":{"type":"struct monst *","sourceType":"struct monst *","bit":false,"const":false,"key":"R49_F0","record":49}},"struct window_procs":{"win_create_nhwindow":{"type":"winid (*)(int)","sourceType":"winid (*)(int)","bit":false,"const":false,"key":"R50_F0","record":50},"win_start_menu":{"type":"void (*)(winid, unsigned long)","sourceType":"void (*)(winid, unsigned long)","bit":false,"const":false,"key":"R50_F1","record":50},"win_end_menu":{"type":"void (*)(winid, char *)","sourceType":"void (*)(winid, const char *)","bit":false,"const":false,"key":"R50_F2","record":50},"win_destroy_nhwindow":{"type":"void (*)(winid)","sourceType":"void (*)(winid)","bit":false,"const":false,"key":"R50_F3","record":50}},"struct _globals":{"zeroany":{"type":"union any","sourceType":"const anything","bit":false,"const":true,"key":"R51_F0","record":51}},"struct mi":{"item":{"type":"union any","sourceType":"anything","bit":false,"const":false,"key":"R52_F0","record":52}},"struct instance_globals_c":{"current_wand":{"type":"struct obj *","sourceType":"struct obj *","bit":false,"const":false,"key":"R53_F0","record":53}},"struct attribs":{"a":{"type":"signed char[6]","sourceType":"schar[6]","bit":false,"const":false,"key":"R54_F0","record":54}},"struct c_color_names":{"c_red":{"type":"char *","sourceType":"const char *const","bit":false,"const":true,"key":"R55_F0","record":55}}};
const globals={"u":"struct you","c_common_strings":"struct c_common_strings","uwep":"struct obj *","ublindf":"struct obj *","uarmg":"struct obj *","mons":"struct permonst[384]","genders":"struct Gender[]","go":"struct instance_globals_o","svl":"struct instance_globals_saved_l","gu":"struct instance_globals_u","gy":"struct instance_globals_y","gh":"struct instance_globals_h","svc":"struct instance_globals_saved_c","gb":"struct instance_globals_b","gn":"struct instance_globals_n","svd":"struct instance_globals_saved_d","objects":"struct objclass[482]","defsyms":"struct symdef[106]","flags":"struct flag","svm":"struct instance_globals_saved_m","iflags":"struct instance_flags","gi":"struct instance_globals_i","gm":"struct instance_globals_m","gs":"struct instance_globals_s","uchain":"struct obj *","ynchars":"char[]","gv":"struct instance_globals_v","gj":"struct instance_globals_j","disp":"struct display_hints","hands_obj":"struct obj","c_obj_colors":"char *[]","gt":"struct instance_globals_t","gp":"struct instance_globals_p","windowprocs":"struct window_procs","cg":"struct _globals","nul_glyphinfo":"struct glyphinfo","gc":"struct instance_globals_c","xdir":"signed char[]","ydir":"signed char[]","c_color_names":"struct c_color_names"};
const params={"do_blinding_ray":["struct obj *"],"use_camera":["struct obj *"],"use_towel":["struct obj *"],"its_dead":["short","short","int *"],"use_stethoscope":["struct obj *"],"use_whistle":["struct obj *"],"use_magic_whistle":["struct obj *"],"magic_whistled":["struct obj *"],"um_dist":["short","short","short"],"number_leashed":[],"o_unleash":["struct obj *"],"m_unleash":["struct monst *","signed char"],"unleash_all":[],"leashable":["struct monst *"],"use_leash":["struct obj *"],"use_leash_core":["struct obj *","struct monst *","struct nhcoord*","int"],"get_mleash":["struct monst *"],"mleashed_next2u":["struct monst *"],"next_to_u":[],"check_leash":["short","short"],"beautiful":[],"use_mirror":["struct obj *"],"use_bell":["struct obj **"],"use_candelabrum":["struct obj *"],"use_candle":["struct obj **"],"snuff_candle":["struct obj *"],"snuff_lit":["struct obj *"],"splash_lit":["struct obj *"],"catch_lit":["struct obj *"],"use_lamp":["struct obj *"],"light_cocktail":["struct obj **"],"rub_ok":["struct obj *"],"dorub":[],"dojump":[],"check_jump":["void *","short","short"],"is_valid_jump_pos":["short","short","int","signed char"],"get_valid_jump_position":["short","short"],"display_jump_positions":["signed char"],"jump":["int"],"tinnable":["struct obj *"],"use_tinning_kit":["struct obj *"],"use_unicorn_horn":["struct obj **"],"fig_transform":["union any*","long"],"figurine_location_checks":["struct obj *","struct nhcoord*","signed char"],"use_figurine":["struct obj **"],"grease_ok":["struct obj *"],"use_grease":["struct obj *"],"touchstone_ok":["struct obj *"],"use_stone":["struct obj *"],"reset_trapset":[],"use_trap":["struct obj *"],"set_trap":[],"use_whip":["struct obj *"],"find_poleable_mon":["struct nhcoord*"],"get_valid_polearm_position":["short","short"],"display_polearm_positions":["signed char"],"calc_pole_range":["int *","int *"],"could_pole_mon":[],"snickersnee_used_dist_attk":["struct obj *"],"use_pole":["struct obj *","signed char"],"use_cream_pie":["struct obj *"],"jelly_ok":["struct obj *"],"use_royal_jelly":["struct obj **"],"grapple_range":[],"can_grapple_location":["short","short"],"display_grapple_positions":["signed char"],"use_grapple":["struct obj *"],"discard_broken_wand":[],"broken_wand_explode":["struct obj *","int","int"],"maybe_dunk_boulders":["short","short"],"do_break_wand":["struct obj *"],"apply_ok":["struct obj *"],"doapply":[],"unfixable_trouble_count":["signed char"],"flip_through_book":["struct obj *"],"flip_coin":["struct obj *"]};
const returnRecords={"get_mleash":"struct obj","mk_artifact":"struct obj","what_gives":"struct obj","has_magic_key":"struct obj","o_in":"struct obj","o_material":"struct obj","bury_an_obj":"struct obj","buried_ball":"struct obj","christen_monst":"struct monst","oname":"struct obj","christen_orc":"struct monst","some_armor":"struct obj","stuck_ring":"struct obj","unchanger":"struct obj","make_familiar":"struct monst","makedog":"struct monst","droppables":"struct obj","floorfood":"struct obj","uint_to_any":"union any","long_to_any":"union any","monst_to_any":"union any","obj_to_any":"union any","merge_choice":"struct obj","addinv":"struct obj","addinv_before":"struct obj","addinv_nomerge":"struct obj","hold_another_object":"struct obj","sobj_at":"struct obj","nxtobj":"struct obj","carrying":"struct obj","u_carried_gloves":"struct obj","u_have_novel":"struct obj","o_on":"struct obj","g_at":"struct obj","getobj":"struct obj","display_cinventory":"struct obj","display_minventory":"struct obj","carrying_stoning_corpse":"struct obj","find_mid":"struct monst","autokey":"struct obj","clone_mon":"struct monst","newmextra":"struct mextra","makemon":"struct monst","unmakemon":"struct monst","rndmonst_adj":"struct permonst","rndmonst":"struct permonst","mkclass":"struct permonst","mkclass_aligned":"struct permonst","grow_up":"struct permonst","mongets":"struct obj","cloneu":"struct monst","getmattk":"struct attack","mkobj_at":"struct obj","mksobj_at":"struct obj","mksobj_migr_to_species":"struct obj","mkobj":"struct obj","splitobj":"struct obj","unsplitobj":"struct obj","unknwn_contnr_contents":"struct obj","mksobj":"struct obj","mkgold":"struct obj","mkcorpstat":"struct obj","obj_attach_mid":"struct obj","get_mtraits":"struct monst","mk_tt_object":"struct obj","mk_named_object":"struct obj","rnd_treefruit_at":"struct obj","add_to_container":"struct obj","obj_nexto":"struct obj","obj_nexto_xy":"struct obj","obj_absorb":"struct obj","obj_meld":"struct obj","init_dummyobj":"struct obj","antholemon":"struct permonst","courtmon":"struct permonst","mlifesaver":"struct obj","get_iter_mons":"struct monst","get_iter_mons_xy":"struct monst","attacktype_fordmg":"struct attack","dmgtype_fromattack":"struct attack","raceptr":"struct permonst","find_pmmonst":"struct monst","mk_mplayer":"struct monst","m_carrying":"struct obj","readobjnam":"struct obj","find_justpicked":"struct obj","pick_obj":"struct obj","split_mon":"struct monst","findpriest":"struct monst","mk_roamer":"struct monst","find_quest_artifact":"struct obj","qt_montype":"struct permonst","character_race":"struct Race","shop_keeper":"struct monst","find_objowner":"struct monst","find_oid":"struct obj","shkcatch":"struct monst","shop_object":"struct obj","stairway_at":"struct stairway","stairway_find":"struct stairway","stairway_find_from":"struct stairway","stairway_find_dir":"struct stairway","stairway_find_type_dir":"struct stairway","stairway_find_special_dir":"struct stairway","findgold":"struct obj","tt_oname":"struct obj","gettrack":"struct nhcoord","maketrap":"struct trap","clamp_hole_destination":"struct d_level","animate_statue":"struct monst","activate_statue_trap":"struct monst","t_at":"struct trap","findgd":"struct monst","select_rwep":"struct obj","select_hwep":"struct obj","wearmask_to_obj":"struct obj","which_armor":"struct obj","nxt_unbypassed_obj":"struct obj","nxt_unbypassed_loot":"struct obj","get_container_location":"struct monst","montraits":"struct monst","revive":"struct monst","poly_obj":"struct obj","bhit":"struct monst","boomhit":"struct monst"};
const CALLER_NAMES=["do_blinding_ray", "use_camera", "use_towel", "its_dead", "use_stethoscope", "use_whistle", "use_magic_whistle", "magic_whistled", "um_dist", "number_leashed", "o_unleash", "m_unleash", "unleash_all", "leashable", "use_leash", "use_leash_core", "get_mleash", "mleashed_next2u", "next_to_u", "check_leash", "beautiful", "use_mirror", "use_bell", "use_candelabrum", "use_candle", "snuff_candle", "snuff_lit", "splash_lit", "catch_lit", "use_lamp", "light_cocktail", "rub_ok", "dorub", "dojump", "check_jump", "is_valid_jump_pos", "get_valid_jump_position", "display_jump_positions", "jump", "tinnable", "use_tinning_kit", "use_unicorn_horn", "fig_transform", "figurine_location_checks", "use_figurine", "grease_ok", "use_grease", "touchstone_ok", "use_stone", "reset_trapset", "use_trap", "set_trap", "use_whip", "find_poleable_mon", "get_valid_polearm_position", "display_polearm_positions", "calc_pole_range", "could_pole_mon", "snickersnee_used_dist_attk", "use_pole", "use_cream_pie", "jelly_ok", "use_royal_jelly", "grapple_range", "can_grapple_location", "display_grapple_positions", "use_grapple", "discard_broken_wand", "broken_wand_explode", "maybe_dunk_boulders", "do_break_wand", "apply_ok", "doapply", "unfixable_trouble_count", "flip_through_book", "flip_coin"];
const LONG_CONSTANTS=["INTRINSIC", "LEFT_SIDE", "M1_BREATHLESS", "M1_CONCEAL", "M1_FLY", "M1_HUMANOID", "M1_NOEYES", "M1_NOHANDS", "M1_NOHEAD", "M1_NOLIMBS", "M1_SEE_INVIS", "M1_SLITHY", "M1_UNSOLID", "M1_WALLWALK", "M2_DEMON", "M2_FEMALE", "M2_JEWELS", "M2_MALE", "M2_PNAME", "M2_ROCKTHROW", "M2_STRONG", "MM_NOMSG", "NO_MINVENT", "NO_MM_FLAGS", "RIGHT_SIDE", "TIMEOUT"];
const CALLBACK_NAMES=["any_obj_ok", "apply_ok", "bhito", "can_grapple_location", "check_jump", "display_grapple_positions", "display_jump_positions", "display_polearm_positions", "doapply", "dorub", "get_valid_jump_position", "get_valid_polearm_position", "grease_ok", "hurtle_jump", "jelly_ok", "mleashed_next2u", "rub_ok", "set_trap", "thesimpleoname", "touchstone_ok", "xname", "yname", "ysimple_name"];
const CALLBACK_CONSUMERS=["askchain", "at_quick_exit", "atexit", "bhit", "bhitpile", "bsearch", "cmd_from_func", "cmdname_from_func", "cmdq_add_ec", "collect_coords", "collect_obj_classes", "container_gone", "count_buc", "detecting", "distant_name", "do_clear_area", "ecname_from_fn", "ext_func_tab_from_func", "get_iter_mons", "get_iter_mons_xy", "get_rnd_text", "getobj", "getpos_sethilite", "ggetobj", "init_isaac64", "init_random", "iter_mons", "iter_mons_safe", "linedup_callback", "nh_deterministic_qsort", "parse_conf_file", "parse_conf_str", "qsort", "qsort_r", "query_objlist", "reseed_random", "safe_qbuf", "set_occupation", "set_selection_floodfillchk", "sethanguphandler", "short_oname", "signal", "sigset", "singular", "sortloot", "walk_path"];
export function createApplyEnvironment(services,L){
 const raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0)),address=v=>Number(raw(v));
 const view=()=>new DataView(services.heap().buffer),literal=v=>typeof v==='string'?services.literal(v):address(v);
 const scalarType=t=>(Crt.scalarMethod(t));
 const widths={Int8:1,Uint8:1,Int16:2,Uint16:2,Int32:4,Uint32:4,BigInt64:8,BigUint64:8};
 const size=t=>t.includes('*')?L.pointerSize:scalarType(t)?widths[scalarType(t)]:records[t]?L['R'+Object.values(records[t])[0].record+'_size']:(()=>{throw Error('Review APPLY native type '+t);})();
 const write=(t,p,v)=>{return Crt.writeTypedValue(scalarType,view,raw,literal,services,address,size,t,p,v);};
 const seq=(p,t,stride)=>Crt.pointerSequence(read,write,records,record,p,t,stride);
 function read(t,p){
  const method=scalarType(t);if(method)return view()['get'+method](p,true);
  const array=t.match(/^(.*?)\[(\d*)\](.*)$/);if(array){if(array[1]==='char'&&!array[3])return p;const elem=array[1]+array[3],stride=array[3]?size(array[1])*Number(array[3].match(/\d+/)[0]):size(elem);if(array[1]==='char'&&!array[3])return p;return seq(p,elem,stride);}
  if(t.includes('(*)'))return Number(view().getBigUint64(p,true));
  if(t.endsWith('*')){const at=Number(view().getBigUint64(p,true));if(!at)return 0;const target=t.slice(0,-1).trim();return records[target]?record(target,at):target.endsWith('*')?seq(at,target,L.pointerSize):scalarType(target)&&target!=='char'?seq(at,target,size(target)):at;}
  if(records[t])return record(t,p);
  throw Error('Review APPLY read type '+t);
 }
 const recordCache=new Map();
 function record(t,p){p=address(p);if(!p)return 0;const key=t+":"+p;if(recordCache.has(key))return recordCache.get(key);const out={address:p};Object.defineProperty(out,Symbol.toPrimitive,{value:()=>p});Object.defineProperty(out,'nativeType',{value:t});for(const[name,f]of Object.entries(records[t])){
  Object.defineProperty(out,name,{enumerable:true,get:()=>f.bit?services.bit(f.bitIndex,p):read(f.type,p+L[f.key]),set:v=>{if(f.const)throw Error('APPLY immutable field '+t+'.'+name);if(f.bit)services.setBit(f.bitIndex,p,v);else write(f.type,p+L[f.key],v);}});
 }
 for(const[name,field]of Object.entries(fieldAliases)){const path=field.split(".");if(path[0] in out&&!(name in out))Object.defineProperty(out,name,{get:()=>path.reduce((o,k)=>o[k],out),set:v=>{const parent=path.slice(0,-1).reduce((o,k)=>o[k],out);parent[path.at(-1)]=v;}});}
 const result=new Proxy(out,{get:(o,k)=>/^\d+$/.test(String(k))?record(t,p+Number(k)*size(t)):(k in o?o[k]:(()=>{throw Error('Unknown APPLY '+t+' field '+String(k));})()),set:(o,k,v)=>{if(/^\d+$/.test(String(k)))services.heap().copyWithin(p+Number(k)*size(t),address(v),address(v)+size(t));else {if(!(k in o))throw Error('Unknown APPLY '+t+' field '+String(k));o[k]=v;}return true;}});recordCache.set(key,result);return result;
 }
 const env=Object.assign(Object.create(services),L,{
  record,
  int:v=>Number(BigInt.asIntN(32,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),uint:v=>Number(BigInt.asUintN(32,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),
  char:v=>Number(BigInt.asIntN(8,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),short:v=>Number(BigInt.asIntN(16,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),
  boolean:v=>Number(BigInt.asIntN(8,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),long:v=>BigInt.asIntN(64,BigInt(v)),
  byte:p=>Object.defineProperty({address:literal(p)},'value',{get:()=>view().getInt8(literal(p)),set:v=>view().setInt8(literal(p),Number(v))}),
  ref:(t,p)=>{p=address(p);return p?Object.defineProperty({address:p},'value',{get:()=>read(t,p),set:v=>write(t,p,v)}):0;},
  localScalar:(t,v)=>{const p=Number(services.stackAlloc(size(t)));if(v!==undefined)write(t,p,v);return env.ref(t,p);},
  localArray:(t,n)=>seq(Number(services.stackAlloc(size(t)*n)),t,size(t)),
  localRecord:t=>record(t,services.stackAlloc(size(t))),
  fieldRef:(o,name)=>{const f=records[o.nativeType][fieldAliases[name]??name];if(!f||f.bit||f.const)throw Error('Review APPLY addressable field '+name);return env.ref(f.type,o.address+L[f.key]);},
  assignField:(o,k,v)=>{o[k]=v;return o[k];},samePtr:(a,b)=>raw(a)===raw(b),
  callLocal:(fn,...args)=>{const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
  SIZE:a=>a.length,min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,abs:Math.abs,
 });
 let index=0;
 for(const[name,type]of Object.entries(globals)){
  const p=Number(services.global(index++));
  if(records[type])env[name]=record(type,p);
  else Object.defineProperty(env,name,{get:()=>read(type,p),set:v=>write(type,p,v)});
 }

// Exact configured expression macros; original definitions bound in private metadata.
env.ACCESSIBLE=(typ)=>(((typ) >= env.DOOR));
env.ACURR=(x)=>((env.acurr(x)));
env.ATEMP=(x)=>((env.u.atemp.a[x]));
Object.defineProperty(env,"BBlinded",{get:()=>(env.u.uprops[env.BLINDED].blocked)});
Object.defineProperty(env,"BFlying",{get:()=>(env.u.uprops[env.FLYING].blocked)});
Object.defineProperty(env,"BInvis",{get:()=>(env.u.uprops[env.INVIS].blocked)});
Object.defineProperty(env,"BLevitation",{get:()=>(env.u.uprops[env.LEVITATION].blocked)});
Object.defineProperty(env,"Blind",{get:()=>((Number(Boolean((env.HBlinded || env.EBlinded) && !env.BBlinded))))});
Object.defineProperty(env,"Blinded",{get:()=>((Number(Boolean(env.HBlinded && !env.BBlinded))))});
Object.defineProperty(env,"BlindedTimeout",{get:()=>((env.HBlinded & env.TIMEOUT))});
Object.defineProperty(env,"Conflict",{get:()=>((Number(Boolean(env.HConflict || env.EConflict))))});
Object.defineProperty(env,"Confusion",{get:()=>(env.HConfusion)});
env.DEADMONSTER=(mon)=>(((mon).mhp < 1));
Object.defineProperty(env,"Deaf",{get:()=>((Number(Boolean(env.HDeaf || env.EDeaf || env.u.uroleplay.deaf))))});
Object.defineProperty(env,"EBlinded",{get:()=>(env.u.uprops[env.BLINDED].extrinsic)});
Object.defineProperty(env,"EConflict",{get:()=>(env.u.uprops[env.CONFLICT].extrinsic)});
Object.defineProperty(env,"EDeaf",{get:()=>(env.u.uprops[env.DEAF].extrinsic)});
Object.defineProperty(env,"EFlying",{get:()=>(env.u.uprops[env.FLYING].extrinsic)});
Object.defineProperty(env,"EFumbling",{get:()=>(env.u.uprops[env.FUMBLING].extrinsic)});
Object.defineProperty(env,"EHalf_physical_damage",{get:()=>(env.u.uprops[env.HALF_PHDAM].extrinsic)});
Object.defineProperty(env,"EHalluc_resistance",{get:()=>(env.u.uprops[env.HALLUC_RES].extrinsic)});
Object.defineProperty(env,"EInvis",{get:()=>(env.u.uprops[env.INVIS].extrinsic)});
Object.defineProperty(env,"EJumping",{get:()=>(env.u.uprops[env.JUMPING].extrinsic)});
Object.defineProperty(env,"ELevitation",{get:()=>(env.u.uprops[env.LEVITATION].extrinsic)});
Object.defineProperty(env,"EPasses_walls",{get:()=>(env.u.uprops[env.PASSES_WALLS].extrinsic)});
Object.defineProperty(env,"EProtection_from_shape_changers",{get:()=>(env.u.uprops[env.PROT_FROM_SHAPE_CHANGERS].extrinsic)});
Object.defineProperty(env,"ESee_invisible",{get:()=>(env.u.uprops[env.SEE_INVIS].extrinsic)});
Object.defineProperty(env,"EStone_resistance",{get:()=>(env.u.uprops[env.STONE_RES].extrinsic)});
Object.defineProperty(env,"EWounded_legs",{get:()=>(env.u.uprops[env.WOUNDED_LEGS].extrinsic)});
Object.defineProperty(env,"EWwalking",{get:()=>(env.u.uprops[env.WWALKING].extrinsic)});
Object.defineProperty(env,"Flying",{get:()=>((Number(Boolean((env.HFlying || env.EFlying || (env.u.usteed && env.is_flyer(env.u.usteed.data))) && !env.BFlying))))});
Object.defineProperty(env,"Free_action",{get:()=>(env.u.uprops[env.FREE_ACTION].extrinsic)});
Object.defineProperty(env,"Fumbling",{get:()=>((Number(Boolean(env.HFumbling || env.EFumbling))))});
Object.defineProperty(env,"Glib",{get:()=>(env.u.uprops[env.GLIB].intrinsic)});
Object.defineProperty(env,"HBlinded",{get:()=>(env.u.uprops[env.BLINDED].intrinsic)});
Object.defineProperty(env,"HConflict",{get:()=>(env.u.uprops[env.CONFLICT].intrinsic)});
Object.defineProperty(env,"HConfusion",{get:()=>(env.u.uprops[env.CONFUSION].intrinsic)});
Object.defineProperty(env,"HDeaf",{get:()=>(env.u.uprops[env.DEAF].intrinsic)});
Object.defineProperty(env,"HFlying",{get:()=>(env.u.uprops[env.FLYING].intrinsic)});
Object.defineProperty(env,"HFumbling",{get:()=>(env.u.uprops[env.FUMBLING].intrinsic)});
Object.defineProperty(env,"HHalf_physical_damage",{get:()=>(env.u.uprops[env.HALF_PHDAM].intrinsic)});
Object.defineProperty(env,"HHalluc_resistance",{get:()=>(env.u.uprops[env.HALLUC_RES].intrinsic)});
Object.defineProperty(env,"HHallucination",{get:()=>(env.u.uprops[env.HALLUC].intrinsic)});
Object.defineProperty(env,"HInvis",{get:()=>(env.u.uprops[env.INVIS].intrinsic)});
Object.defineProperty(env,"HJumping",{get:()=>(env.u.uprops[env.JUMPING].intrinsic)});
Object.defineProperty(env,"HLevitation",{get:()=>(env.u.uprops[env.LEVITATION].intrinsic)});
Object.defineProperty(env,"HPasses_walls",{get:()=>(env.u.uprops[env.PASSES_WALLS].intrinsic)});
Object.defineProperty(env,"HProtection_from_shape_changers",{get:()=>(env.u.uprops[env.PROT_FROM_SHAPE_CHANGERS].intrinsic)});
Object.defineProperty(env,"HSee_invisible",{get:()=>(env.u.uprops[env.SEE_INVIS].intrinsic)});
Object.defineProperty(env,"HStone_resistance",{get:()=>(env.u.uprops[env.STONE_RES].intrinsic)});
Object.defineProperty(env,"HStun",{get:()=>(env.u.uprops[env.STUNNED].intrinsic)});
Object.defineProperty(env,"HWounded_legs",{get:()=>(env.u.uprops[env.WOUNDED_LEGS].intrinsic)});
Object.defineProperty(env,"HWwalking",{get:()=>(env.u.uprops[env.WWALKING].intrinsic)});
Object.defineProperty(env,"Half_physical_damage",{get:()=>((Number(Boolean(env.HHalf_physical_damage || env.EHalf_physical_damage))))});
Object.defineProperty(env,"Halluc_resistance",{get:()=>((Number(Boolean(env.HHalluc_resistance || env.EHalluc_resistance))))});
Object.defineProperty(env,"Hallucination",{get:()=>((Number(Boolean(env.HHallucination && !env.Halluc_resistance))))});
env.Has_contents=(o)=>(( (o).cobj != 0));
env.IS_AIR=(typ)=>((Number(Boolean((typ) == env.AIR || (typ) == env.CLOUD))));
env.IS_DOOR=(typ)=>(((typ) == env.DOOR));
env.IS_FURNITURE=(typ)=>((Number(Boolean((typ) >= env.STAIRS && (typ) <= env.ALTAR))));
env.IS_OBSTRUCTED=(typ)=>(((typ) < env.POOL));
env.IS_STWALL=(typ)=>(((typ) <= env.DBWALL));
env.IS_TREE=(typ)=>((Number(Boolean((typ) == env.TREE || (env.svl.level.flags.arboreal && (typ) == env.STONE)))));
env.IS_WALL=(typ)=>((Number(Boolean((typ) && (typ) <= env.DBWALL))));
env.IS_WATERWALL=(typ)=>(((typ) == env.WATER));
env.In_sokoban=(x)=>(((x).dnum == env.sokoban_dnum));
Object.defineProperty(env,"Invis",{get:()=>((Number(Boolean((env.HInvis || env.EInvis) && !env.BInvis))))});
env.Is_airlevel=(x)=>((env.Lcheck(x, env.air_level)));
env.Is_candle=(otmp)=>((Number(Boolean(otmp.otyp == env.TALLOW_CANDLE || otmp.otyp == env.WAX_CANDLE))));
env.Is_knox=(x)=>((env.Lcheck(x, env.knox_level)));
env.Is_stronghold=(x)=>((env.Lcheck(x, env.stronghold_level)));
env.Is_waterlevel=(x)=>((env.Lcheck(x, env.water_level)));
Object.defineProperty(env,"Jumping",{get:()=>((Number(Boolean(env.HJumping || env.EJumping))))});
env.Lassigned=(y)=>((Number(Boolean((y).dlevel || (y).dnum))));
env.Lcheck=(x,z)=>((Number(Boolean(env.Lassigned(z) && env.on_level(x, z)))));
Object.defineProperty(env,"Levitation",{get:()=>((Number(Boolean((env.HLevitation || env.ELevitation) && !env.BLevitation))))});
env.MCORPSENM=(mon)=>(((mon).mextra.mcorpsenm));
env.MON_WEP=(mon)=>(((mon).mw));
env.M_AP_TYPE=(m)=>(((m).m_ap_type & env.M_AP_TYPMASK));
env.P_SKILL=(type)=>((env.u.weapon_skills[type].skill));
Object.defineProperty(env,"ParanoidBreakwand",{get:()=>(((env.flags.paranoia_bits & env.PARANOID_BREAKWAND) != 0))});
Object.defineProperty(env,"Passes_walls",{get:()=>((Number(Boolean(env.HPasses_walls || env.EPasses_walls))))});
Object.defineProperty(env,"Protection_from_shape_changers",{get:()=>((Number(Boolean(env.HProtection_from_shape_changers || env.EProtection_from_shape_changers))))});
env.Race_if=(X)=>((env.gu.urace.mnum == (X)));
env.Role_if=(X)=>((env.gu.urole.mnum == (X)));
Object.defineProperty(env,"See_invisible",{get:()=>((Number(Boolean(env.HSee_invisible || env.ESee_invisible))))});
Object.defineProperty(env,"Sick",{get:()=>(env.u.uprops[env.SICK].intrinsic)});
Object.defineProperty(env,"Slimed",{get:()=>(env.u.uprops[env.SLIMED].intrinsic)});
Object.defineProperty(env,"Something",{get:()=>(env.c_common_strings.c_Something)});
Object.defineProperty(env,"Stone_resistance",{get:()=>((Number(Boolean(env.HStone_resistance || env.EStone_resistance))))});
Object.defineProperty(env,"Stoned",{get:()=>(env.u.uprops[env.STONED].intrinsic)});
Object.defineProperty(env,"Strangled",{get:()=>(env.u.uprops[env.STRANGLED].intrinsic)});
Object.defineProperty(env,"Stunned",{get:()=>(env.HStun)});
Object.defineProperty(env,"Ugender",{get:()=>(((env.Upolyd ? env.u.mfemale : env.flags.female) ? 1 : 0))});
Object.defineProperty(env,"Underwater",{get:()=>((env.u.uinwater))});
Object.defineProperty(env,"Upolyd",{get:()=>((env.u.umonnum != env.u.umonster))});
Object.defineProperty(env,"Vomiting",{get:()=>(env.u.uprops[env.VOMITING].intrinsic)});
Object.defineProperty(env,"Wounded_legs",{get:()=>((Number(Boolean(env.HWounded_legs || env.EWounded_legs))))});
Object.defineProperty(env,"Wwalking",{get:()=>((Number(Boolean((env.HWwalking || env.EWwalking) && !env.Is_waterlevel(env.u.uz)))))});
env.age_is_relative=(otmp)=>((Number(Boolean((otmp).otyp == env.BRASS_LANTERN || (otmp).otyp == env.OIL_LAMP || (otmp).otyp == env.CANDELABRUM_OF_INVOCATION || (otmp).otyp == env.TALLOW_CANDLE || (otmp).otyp == env.WAX_CANDLE || (otmp).otyp == env.POT_OIL))));
Object.defineProperty(env,"air_level",{get:()=>((env.svd.dungeon_topology.d_air_level))});
env.altar_to_glyph=(amsk)=>(((((amsk) & env.AM_SANCTUM) == env.AM_SANCTUM) ? (env.GLYPH_ALTAR_OFF + env.altar_other) : (((amsk) & env.AM_MASK) == env.AM_LAWFUL) ? (env.GLYPH_ALTAR_OFF + env.altar_lawful) : (((amsk) & env.AM_MASK) == env.AM_NEUTRAL) ? (env.GLYPH_ALTAR_OFF + env.altar_neutral) : (((amsk) & env.AM_MASK) == env.AM_CHAOTIC) ? (env.GLYPH_ALTAR_OFF + env.altar_chaotic) : (env.GLYPH_ALTAR_OFF + env.altar_unaligned)));
env.bigmonst=(ptr)=>(((ptr).msize >= env.MZ_LARGE));
env.bimanual=(otmp)=>((Number(Boolean((otmp.oclass == env.WEAPON_CLASS || otmp.oclass == env.TOOL_CLASS) && env.objects[otmp.otyp].oc_bimanual))));
env.breathless=(ptr)=>((((ptr).mflags1 & env.M1_BREATHLESS) != 0n));
env.cansee=(x,y)=>(((env.gv.viz_array[y][x] & env.IN_SIGHT) != 0));
env.canspotmon=(mon)=>((Number(Boolean(env.canseemon(mon) || env.sensemon(mon)))));
env.carried=(o)=>(((o).where == env.OBJ_INVENT));
env.cmap_a_to_glyph=(cmap_idx)=>((((cmap_idx) - env.S_ndoor) + env.GLYPH_CMAP_A_OFF));
env.cmap_b_to_glyph=(cmap_idx)=>((((cmap_idx) - env.S_grave) + env.GLYPH_CMAP_B_OFF));
env.cmap_c_to_glyph=(cmap_idx)=>((((cmap_idx) - env.S_digbeam) + env.GLYPH_CMAP_C_OFF));
env.cmap_to_glyph=(cmap_idx)=>(( ((cmap_idx) == env.S_stone) ? env.GLYPH_CMAP_STONE_OFF : ((cmap_idx) <= env.S_trwall) ? env.cmap_walls_to_glyph(cmap_idx) : ((cmap_idx) < env.S_altar) ? env.cmap_a_to_glyph(cmap_idx) : ((cmap_idx) == env.S_altar) ? env.altar_to_glyph(env.AM_NEUTRAL) : ((cmap_idx) < env.S_arrow_trap + env.MAXTCHARS) ? env.cmap_b_to_glyph(cmap_idx) : ((cmap_idx) <= env.S_goodpos) ? env.cmap_c_to_glyph(cmap_idx) : env.NO_GLYPH ));
env.cmap_walls_to_glyph=(cmap_idx)=>(((cmap_idx) - env.S_vwall + (env.In_mines(env.u.uz) ? env.GLYPH_CMAP_MINES_OFF : env.In_hell(env.u.uz) ? env.GLYPH_CMAP_GEH_OFF : env.Is_knox(env.u.uz) ? env.GLYPH_CMAP_KNOX_OFF : env.In_sokoban(env.u.uz) ? env.GLYPH_CMAP_SOKO_OFF : env.GLYPH_CMAP_MAIN_OFF)));
env.corpse_to_glyph=(obj)=>((env.int(((obj).corpsenm + (env.obj_is_piletop(obj) ? env.GLYPH_BODY_PILETOP_OFF : env.GLYPH_BODY_OFF)))));
env.couldsee=(x,y)=>(((env.gv.viz_array[y][x] & env.COULD_SEE) != 0));
env.digests=(ptr)=>((env.dmgtype_fromattack((ptr), env.AD_DGST, env.AT_ENGL) != 0));
env.distu=(xx,yy)=>(env.dist2(env.short((xx)), env.short((yy)), env.u.ux, env.u.uy));
Object.defineProperty(env,"fmon",{get:()=>(env.svl.level.monlist)});
env.generic_obj_to_glyph=(obj)=>((env.int(((obj).oclass + (env.obj_is_piletop(obj) ? env.GLYPH_OBJ_PILETOP_OFF : env.GLYPH_OBJ_OFF)))));
env.glyph_is_body=(glyph)=>((Number(Boolean((((glyph) >= env.GLYPH_BODY_OFF) && ((glyph) < (env.GLYPH_BODY_OFF + env.NUMMONS))) || env.glyph_is_body_piletop(glyph)))));
env.glyph_is_body_piletop=(glyph)=>((Number(Boolean(((glyph) >= env.GLYPH_BODY_PILETOP_OFF) && ((glyph) < (env.GLYPH_BODY_PILETOP_OFF + env.NUMMONS))))));
env.glyph_is_cmap=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_CMAP_STONE_OFF && (glyph) < (env.GLYPH_CMAP_C_OFF + ((env.S_goodpos - env.S_digbeam) + 1))))));
env.glyph_is_detected_female_monster=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_DETECT_FEM_OFF && (glyph) < (env.GLYPH_DETECT_FEM_OFF + env.NUMMONS)))));
env.glyph_is_detected_male_monster=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_DETECT_MALE_OFF && (glyph) < (env.GLYPH_DETECT_MALE_OFF + env.NUMMONS)))));
env.glyph_is_detected_monster=(glyph)=>((Number(Boolean(env.glyph_is_detected_male_monster(glyph) || env.glyph_is_detected_female_monster(glyph)))));
env.glyph_is_fem_statue=(glyph)=>((Number(Boolean((((glyph) >= env.GLYPH_STATUE_FEM_OFF) && ((glyph) < (env.GLYPH_STATUE_FEM_OFF + env.NUMMONS))) || env.glyph_is_fem_statue_piletop(glyph)))));
env.glyph_is_fem_statue_piletop=(glyph)=>((Number(Boolean(((glyph) >= env.GLYPH_STATUE_FEM_PILETOP_OFF) && ((glyph) < (env.GLYPH_STATUE_FEM_PILETOP_OFF + env.NUMMONS))))));
env.glyph_is_female_pet=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_PET_FEM_OFF && (glyph) < (env.GLYPH_PET_FEM_OFF + env.NUMMONS)))));
env.glyph_is_generic_object=(glyph)=>((Number(Boolean(env.glyph_is_normal_generic_obj(glyph) || env.glyph_is_piletop_generic_obj(glyph)))));
env.glyph_is_invisible=(glyph)=>(((glyph) == env.GLYPH_INVISIBLE));
env.glyph_is_male_pet=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_PET_MALE_OFF && (glyph) < (env.GLYPH_PET_MALE_OFF + env.NUMMONS)))));
env.glyph_is_male_statue=(glyph)=>((Number(Boolean((((glyph) >= env.GLYPH_STATUE_MALE_OFF) && ((glyph) < (env.GLYPH_STATUE_MALE_OFF + env.NUMMONS))) || env.glyph_is_male_statue_piletop(glyph)))));
env.glyph_is_male_statue_piletop=(glyph)=>((Number(Boolean(((glyph) >= env.GLYPH_STATUE_MALE_PILETOP_OFF) && ((glyph) < (env.GLYPH_STATUE_MALE_PILETOP_OFF + env.NUMMONS))))));
env.glyph_is_monster=(glyph)=>((Number(Boolean(env.glyph_is_normal_monster(glyph) || env.glyph_is_pet(glyph) || env.glyph_is_ridden_monster(glyph) || env.glyph_is_detected_monster(glyph)))));
env.glyph_is_normal_female_monster=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_MON_FEM_OFF && (glyph) < (env.GLYPH_MON_FEM_OFF + env.NUMMONS)))));
env.glyph_is_normal_generic_obj=(glyph)=>((Number(Boolean((glyph) > env.GLYPH_OBJ_OFF && (glyph) < env.GLYPH_OBJ_OFF + env.FIRST_OBJECT - 1))));
env.glyph_is_normal_male_monster=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_MON_MALE_OFF && (glyph) < (env.GLYPH_MON_MALE_OFF + env.NUMMONS)))));
env.glyph_is_normal_monster=(glyph)=>((Number(Boolean(env.glyph_is_normal_male_monster(glyph) || env.glyph_is_normal_female_monster(glyph)))));
env.glyph_is_normal_object=(glyph)=>((Number(Boolean((glyph) == env.GLYPH_OBJ_OFF || ((glyph) >= env.GLYPH_OBJ_OFF + env.FIRST_OBJECT - 1 && (glyph) < (env.GLYPH_OBJ_OFF + env.NUM_OBJECTS)) || env.glyph_is_normal_piletop_obj(glyph)))));
env.glyph_is_normal_piletop_obj=(glyph)=>((Number(Boolean((glyph) == env.GLYPH_OBJ_PILETOP_OFF || ((glyph) > env.GLYPH_OBJ_PILETOP_OFF + env.FIRST_OBJECT - 1 && (glyph) < (env.GLYPH_OBJ_PILETOP_OFF + env.NUM_OBJECTS))))));
env.glyph_is_pet=(glyph)=>((Number(Boolean(env.glyph_is_male_pet(glyph) || env.glyph_is_female_pet(glyph)))));
env.glyph_is_piletop_generic_obj=(glyph)=>((Number(Boolean((glyph) > env.GLYPH_OBJ_PILETOP_OFF && (glyph) < env.GLYPH_OBJ_PILETOP_OFF + env.FIRST_OBJECT - 1))));
env.glyph_is_ridden_female_monster=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_RIDDEN_FEM_OFF && (glyph) < (env.GLYPH_RIDDEN_FEM_OFF + env.NUMMONS)))));
env.glyph_is_ridden_male_monster=(glyph)=>((Number(Boolean((glyph) >= env.GLYPH_RIDDEN_MALE_OFF && (glyph) < (env.GLYPH_RIDDEN_MALE_OFF + env.NUMMONS)))));
env.glyph_is_ridden_monster=(glyph)=>((Number(Boolean(env.glyph_is_ridden_male_monster(glyph) || env.glyph_is_ridden_female_monster(glyph)))));
env.glyph_is_statue=(glyph)=>((Number(Boolean(env.glyph_is_male_statue(glyph) || env.glyph_is_fem_statue(glyph)))));
env.glyph_to_obj=(glyph)=>((env.glyph_is_body(glyph) ? env.CORPSE : env.glyph_is_statue(glyph) ? env.STATUE : env.glyph_is_generic_object(glyph) ? ((glyph) - (env.glyph_is_piletop_generic_obj(glyph) ? env.GLYPH_OBJ_PILETOP_OFF : env.GLYPH_OBJ_OFF)) : env.glyph_is_normal_object(glyph) ? ((glyph) - (env.glyph_is_normal_piletop_obj(glyph) ? env.GLYPH_OBJ_PILETOP_OFF : env.GLYPH_OBJ_OFF)) : env.NUM_OBJECTS));
env.has_head=(ptr)=>((((ptr).mflags1 & env.M1_NOHEAD) == 0n));
env.has_mcorpsenm=(mon)=>((Number(Boolean((mon).mextra && env.MCORPSENM(mon) != env.NON_PM))));
env.haseyes=(ptr)=>((((ptr).mflags1 & env.M1_NOEYES) == 0n));
env.hides_under=(ptr)=>((((ptr).mflags1 & env.M1_CONCEAL) != 0n));
env.humanoid=(ptr)=>((((ptr).mflags1 & env.M1_HUMANOID) != 0n));
env.ignitable=(otmp)=>((Number(Boolean((otmp).otyp == env.BRASS_LANTERN || (otmp).otyp == env.OIL_LAMP || ((otmp).otyp == env.MAGIC_LAMP && (otmp).spe > 0) || (otmp).otyp == env.CANDELABRUM_OF_INVOCATION || (otmp).otyp == env.TALLOW_CANDLE || (otmp).otyp == env.WAX_CANDLE || (otmp).otyp == env.POT_OIL))));
env.is_axe=(otmp)=>((Number(Boolean((otmp.oclass == env.WEAPON_CLASS || otmp.oclass == env.TOOL_CLASS) && env.objects[otmp.otyp].oc_skill == env.P_AXE))));
env.is_boots=(otmp)=>((Number(Boolean(otmp.oclass == env.ARMOR_CLASS && env.objects[otmp.otyp].oc_armcat == env.ARM_BOOTS))));
env.is_demon=(ptr)=>((((ptr).mflags2 & env.M2_DEMON) != 0n));
env.is_female=(ptr)=>((((ptr).mflags2 & env.M2_FEMALE) != 0n));
env.is_flimsy=(otmp)=>((Number(Boolean(env.objects[(otmp).otyp].oc_material <= env.LEATHER || (otmp).otyp == env.RUBBER_HOSE))));
env.is_floater=(ptr)=>((Number(Boolean((ptr).mlet == env.S_EYE || (ptr).mlet == env.S_LIGHT))));
env.is_flyer=(ptr)=>((((ptr).mflags1 & env.M1_FLY) != 0n));
env.is_gloves=(otmp)=>((Number(Boolean(otmp.oclass == env.ARMOR_CLASS && env.objects[otmp.otyp].oc_armcat == env.ARM_GLOVES))));
env.is_graystone=(obj)=>((Number(Boolean((obj).otyp == env.LUCKSTONE || (obj).otyp == env.LOADSTONE || (obj).otyp == env.FLINT || (obj).otyp == env.TOUCHSTONE))));
env.is_male=(ptr)=>((((ptr).mflags2 & env.M2_MALE) != 0n));
env.is_pick=(otmp)=>((Number(Boolean((otmp.oclass == env.WEAPON_CLASS || otmp.oclass == env.TOOL_CLASS) && env.objects[otmp.otyp].oc_skill == env.P_PICK_AXE))));
env.is_pole=(otmp)=>((Number(Boolean((otmp.oclass == env.WEAPON_CLASS || otmp.oclass == env.TOOL_CLASS) && (env.objects[otmp.otyp].oc_skill == env.P_POLEARMS || env.objects[otmp.otyp].oc_skill == env.P_LANCE || env.is_art(otmp, env.ART_SNICKERSNEE))))));
env.is_rider=(ptr)=>((Number(Boolean((ptr) == env.mons[env.PM_DEATH] || (ptr) == env.mons[env.PM_FAMINE] || (ptr) == env.mons[env.PM_PESTILENCE]))));
env.is_unicorn=(ptr)=>((Number(Boolean((ptr).mlet == env.S_UNICORN && env.likes_gems(ptr)))));
env.is_vampire=(ptr)=>(((ptr).mlet == env.S_VAMPIRE));
env.is_vampshifter=(mon)=>((Number(Boolean((mon).cham == env.PM_VAMPIRE || (mon).cham == env.PM_VAMPIRE_LEADER || (mon).cham == env.PM_VLAD_THE_IMPALER))));
env.is_wet_towel=(o)=>((Number(Boolean((o).otyp == env.TOWEL && (o).spe > 0))));
env.is_whirly=(ptr)=>((Number(Boolean((ptr).mlet == env.S_VORTEX || (ptr) == env.mons[env.PM_AIR_ELEMENTAL]))));
Object.defineProperty(env,"knox_level",{get:()=>((env.svd.dungeon_topology.d_knox_level))});
Object.defineProperty(env,"levl",{get:()=>(env.svl.level.locations)});
env.likes_gems=(ptr)=>((((ptr).mflags2 & env.M2_JEWELS) != 0n));
env.m_at=(x,y)=>((env.svl.level.monsters[x][y]));
env.m_next2u=(m)=>((env.distu((m).mx,(m).my) <= 2));
env.makeknown=(x)=>(env.discover_object((x), 1, 1, 1));
env.mdistu=(mon)=>(env.distu((mon).mx, (mon).my));
env.mhe=(mtmp)=>((env.genders[env.pronoun_gender(mtmp, env.PRONOUN_HALLU)].he));
env.mhis=(mtmp)=>((env.genders[env.pronoun_gender(mtmp, env.PRONOUN_HALLU)].his));
env.nohands=(ptr)=>((((ptr).mflags1 & env.M1_NOHANDS) != 0n));
env.nolimbs=(ptr)=>((((ptr).mflags1 & env.M1_NOLIMBS) == env.M1_NOLIMBS));
env.normal_obj_to_glyph=(obj)=>((env.int(((obj).otyp + (env.obj_is_piletop(obj) ? env.GLYPH_OBJ_PILETOP_OFF : env.GLYPH_OBJ_OFF)))));
Object.defineProperty(env,"nothing_happens",{get:()=>(env.c_common_strings.c_nothing_happens)});
Object.defineProperty(env,"nothing_seems_to_happen",{get:()=>(env.c_common_strings.c_nothing_seems_to_happen)});
env.obj_is_generic=(obj)=>((Number(Boolean(!(obj).dknown && ((obj).oclass == env.POTION_CLASS || ((obj).otyp >= env.FIRST_REAL_GEM && ((obj).otyp <= env.LAST_GLASS_GEM)) || ((obj).otyp >= env.FIRST_SPELL && ((obj).otyp <= env.LAST_SPELL)))))));
env.obj_is_piletop=(obj)=>((Number(Boolean((obj).where == env.OBJ_FLOOR && ((env.go.otg_otmp = env.svl.level.objects[(obj).ox][(obj).oy].nexthere) != 0) && ((obj).otyp != env.BOULDER || env.go.otg_otmp.otyp == env.BOULDER)))));
env.obj_to_glyph=(obj,rng)=>((((obj).otyp == env.STATUE) ? env.statue_to_glyph(obj, rng) : (env.Hallucination) ? env.random_obj_to_glyph(rng) : ((obj).otyp == env.CORPSE) ? env.corpse_to_glyph(obj) : env.obj_is_generic(obj) ? env.generic_obj_to_glyph(obj) : env.normal_obj_to_glyph(obj)));
env.passes_walls=(ptr)=>((((ptr).mflags1 & env.M1_WALLWALK) != 0n));
env.perceives=(ptr)=>((((ptr).mflags1 & env.M1_SEE_INVIS) != 0n));
env.pline1=(cstr)=>(env.pline("%s", cstr));
env.plur=(x)=>((((x) == 1) ? "" : "s"));
env.random_monster=(rng)=>((rng(env.NUMMONS)));
env.random_obj_to_glyph=(rng)=>((((env.go.otg_temp = env.random_object(rng)) == env.CORPSE) ? (env.random_monster(rng) + env.GLYPH_BODY_OFF) : (env.go.otg_temp + env.GLYPH_OBJ_OFF)));
env.random_object=(rng)=>((rng(env.NUM_OBJECTS - env.FIRST_OBJECT) + env.FIRST_OBJECT));
env.slithy=(ptr)=>((((ptr).mflags1 & env.M1_SLITHY) != 0n));
Object.defineProperty(env,"sokoban_dnum",{get:()=>((env.svd.dungeon_topology.d_sokoban_dnum))});
Object.defineProperty(env,"something",{get:()=>(env.c_common_strings.c_something)});
env.statue_to_glyph=(obj,rng)=>(((env.Hallucination) ? ((env.random_monster(rng)) + ((!(rng)(2)) ? env.GLYPH_MON_MALE_OFF : env.GLYPH_MON_FEM_OFF)) : (env.int((obj).corpsenm) + ((((obj).spe & env.CORPSTAT_GENDER) == env.CORPSTAT_FEMALE) ? (env.obj_is_piletop(obj) ? env.GLYPH_STATUE_FEM_PILETOP_OFF : env.GLYPH_STATUE_FEM_OFF) : (env.obj_is_piletop(obj) ? env.GLYPH_STATUE_MALE_PILETOP_OFF : env.GLYPH_STATUE_MALE_OFF)))));
Object.defineProperty(env,"stronghold_level",{get:()=>((env.svd.dungeon_topology.d_stronghold_level))});
env.strongmonst=(ptr)=>((((ptr).mflags2 & env.M2_STRONG) != 0n));
env.throws_rocks=(ptr)=>((((ptr).mflags2 & env.M2_ROCKTHROW) != 0n));
env.touch_petrifies=(ptr)=>((Number(Boolean((ptr) == env.mons[env.PM_COCKATRICE] || (ptr) == env.mons[env.PM_CHICKATRICE]))));
env.type_is_pname=(ptr)=>((((ptr).mflags2 & env.M2_PNAME) != 0n));
env.u_at=(x,y)=>((Number(Boolean((x) == env.u.ux && (y) == env.u.uy))));
env.u_wield_art=(art)=>(env.is_art(env.uwep, art));
env.uhim=()=>((env.genders[env.flags.female ? 1 : 0].him));
env.uhis=()=>((env.genders[env.flags.female ? 1 : 0].his));
env.unsolid=(ptr)=>((((ptr).mflags1 & env.M1_UNSOLID) != 0n));
env.verysmall=(ptr)=>(((ptr).msize < env.MZ_SMALL));
Object.defineProperty(env,"water_level",{get:()=>((env.svd.dungeon_topology.d_water_level))});
env.y_n=(query)=>(env.yn_function(query, env.ynchars, 110, 1));
 // Header expressions are JavaScript; only true foreign calls use the native services.
 const callbackTargets = new Set(CALLBACK_NAMES);
 const callback=fn=>{for(const name of callbackTargets)if(fn===core[name]||fn===services[name])return services.callback(name);if(typeof fn==='number'||typeof fn==='bigint'||fn===null)return fn??0;throw Error('Review APPLY callback identity');};
 env.callbackAddress=callback;
 const pcall=(name,...args)=>services[name](...args.map(v=>typeof v==='function'?callback(v):v));
 for(const[name,type]of Object.entries(returnRecords))if(services[name])env[name]=(...args)=>record(type,pcall(name,...args));
 for(const name of CALLBACK_CONSUMERS)if(services[name]&&!returnRecords[name])env[name]=(...args)=>pcall(name,...args);
 env.propertyRef=n=>env.fieldRef(env.u.uprops[n], 'intrinsic');
 env.copyRecord=(target,source)=>{services.heap().copyWithin(address(target),address(source),address(source)+size(target.nativeType));return target;};
 env.rngSource=(line,index)=>services.rngSource(line,CALLER_NAMES[index]);
 // Constant flags retain actual C64 widths; layout values themselves stay signed64 transport.
 for(const name of LONG_CONSTANTS)if(name in env)env[name]=BigInt(env[name]);
 env.Strcpy=(a,b)=>services.Strcpy(a,b);
 env.div=(a,b)=>typeof a==='bigint'||typeof b==='bigint'?env.long(a)/env.long(b):Math.trunc(a/b);
 const scalarArgument=(t,v)=>t==='int'?env.int(v):t==='unsigned int'?env.uint(v):t==='short'?env.short(v):t==='char'||t==='signed char'?env.char(v):t==='long'||t==='unsigned long'?env.long(v):v;
 env.callLocal=(fn,...args)=>{const saved=services.stackSave();try{for(const[i,t]of(params[fn.name]??[]).entries())args[i]=scalarArgument(t,args[i]);return fn(...args);}finally{services.stackRestore(saved);}};
 return new Proxy(env,{get:(o,k,r)=>{if(typeof k==='string'&&!['rectState','trackState'].includes(k)&&!Reflect.has(o,k))throw Error('Missing APPLY environment key '+k);return Reflect.get(o,k,r);}});

}
const applyEnvironments=new WeakMap();
function applyEntry(services,L){
 const key=services.moduleKey;
 if(!key||!['object','function'].includes(typeof key)||!L||!['object','function'].includes(typeof L))return {environment:createApplyEnvironment(services,L)};
 let layouts=applyEnvironments.get(key),entry=layouts?.get(L);
 if(entry)return entry;
 // Validate immutable compiler metadata before publishing reusable live views.
 const primitive={'char':1,'signed char':1,'unsigned char':1,'short':2,'unsigned short':2,'int':4,'unsigned int':4,'long':8,'long long':8,'unsigned long':8,'unsigned long long':8};
 const extent=t=>{const a=t.match(/^(.*?)((?:\[\d+\])+)$/);if(a)return extent(a[1])*[...a[2].matchAll(/\[(\d+)\]/g)].reduce((n,m)=>n*Number(m[1]),1);if(t.includes('*'))return 8;if(primitive[t])return primitive[t];if(records[t])return Number(L['R'+Object.values(records[t])[0].record+'_size']);throw Error('Review APPLY layout type '+t);};
 for(const[k,v]of Object.entries({pointerSize:8,longSize:8,booleanSize:1}))if(L[k]!==v)throw Error('Review APPLY ABI '+k);
 for(const[t,fields]of Object.entries(records)){
  const bytes=extent(t);if(!Number.isSafeInteger(bytes)||bytes<=0)throw Error('Review APPLY record layout '+t);
  for(const f of Object.values(fields))if(!f.bit){const offset=L[f.key],width=L[f.key+'_size'];if(!Number.isSafeInteger(offset)||offset<0||width!==extent(f.type)||offset+width>bytes)throw Error('Review APPLY field layout '+f.key);}
 }
 entry={current:services,layout:L,environment:null};
 const forwarding=new Proxy(Object.create(null),{
  get:(_,k)=>Reflect.get(entry.current,k,entry.current),has:(_,k)=>Reflect.has(entry.current,k),
  ownKeys:()=>Reflect.ownKeys(entry.current),getOwnPropertyDescriptor:(_,k)=>{const d=Reflect.getOwnPropertyDescriptor(entry.current,k);return d?{...d,configurable:true}:undefined;}
 });
 try{entry.environment=createApplyEnvironment(forwarding,L);if(!layouts){layouts=new WeakMap();applyEnvironments.set(key,layouts);}layouts.set(L,entry);return entry;}
 finally{entry.current=undefined;}
}
export function callApply(services,layout,name,...args){
 const saved=services.stackSave();let entry,previous;
 try{
  entry=applyEntry(services,layout);previous=entry.current;entry.current=services;
  const env=entry.environment;
  for(const[i,t]of(params[name]??[]).entries()){
   const target=t.replace(/\s*\*$/,'');
   if(t.endsWith('**')||t.endsWith('* *'))args[i]=env.ref(t.slice(0,-1).trim(),args[i]);
   else if(t==='int *'||t==='long *'||t==='short *')args[i]=env.ref(t.slice(0,-1).trim(),args[i]);
   else if(t.endsWith('*')&&records[target])args[i]=env.record(target,args[i]);
   else if(t==='void *'||t==='char *')args[i]=Number(args[i]?.address??args[i]??0);
   else if(t==='signed char'||t==='char')args[i]=env.char(args[i]);
   else if(t==='short')args[i]=env.short(args[i]);
   else if(t==='unsigned int')args[i]=env.uint(args[i]);
   else if(t==='int')args[i]=env.int(args[i]);
   else if(t==='long'||t==='long long')args[i]=env.long(args[i]);
  }
  const result=withCEnvironment(env,()=>core[name](...args));
  return typeof result==='string'?services.literal(result):result?.address??result;
 }finally{try{services.stackRestore(saved);}finally{if(entry)entry.current=previous;}}
}
