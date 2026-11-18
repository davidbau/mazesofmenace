// Frozen v5 nhlobj.c: Lua object references, inspection, placement, containers, and timers.
import { game } from './gstate.js';
import { LuaTable, LuaUserdata } from './lua/interp.js';
import { readobjnam, hands_obj, getObjDescr, is_poisonable } from './objnam.js';
import { mksobj, mkobj, obj_extract_self, place_object, dealloc_obj, add_to_container, weight } from './mkobj.js';
import { addinv } from './invent.js';
import { newsym } from './display.js';
import { get_table_objtype, get_table_objclass, cvt_to_abscoord } from './sp_lev.js';
import { def_char_to_objclass, def_oc_syms_chars, MAXOCLASSES } from './drawing.js';
import { FIRST_OBJECT, getObjName, object_tough, isWanNothingNodir } from './o_init.js';
import { OC_COST, OC_CHARGED } from './oc_cost_data.js';
import { OC_WEIGHT } from './oc_weight.generated.js';
import { MKOBJ_OC_PROB, MKOBJ_OC_CLASS, MKOBJ_OC_COLOR } from './mkobj_data.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP, MKOBJ_OC_MAGIC, MKOBJ_OC_MERGE } from './mkobj_erosion_meta.js';
import { obj_has_timer, peek_timer, stop_timer, obj_stop_timers, start_timer } from './timeout.js';
import { bury_an_obj } from './dig.js';
import { obj_to_any } from './hack.js';
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import {
    CORPSTAT_FEMALE, CORPSTAT_HISTORIC, CORPSTAT_MALE, CORPSE, Has_contents,
    has_oname, isok, NON_PM, OBJ_CONTAINED, OBJ_FREE, OBJ_INVENT, OBJ_FLOOR,
    OBJ_LUAFREE, ONAME, POTION_CLASS, ROT_ORGANIC, SHRINK_GLOB, TIMER_OBJECT,
} from './const.js';

const RANDOM_CLASS = 0;
const LARGE_BOX = 214;
const BAG_OF_TRICKS = 220;
const FIGURINE = 241;
const EGG = 266;
const TIN = 296;
const WAN_NOTHING = 416;
const STATUE = 476;
const NODIR = 1;

// C ref: decl.c:90-95 materialnm[]
const MATERIALNM = [
    'mysterious', 'liquid', 'wax', 'organic',
    'flesh', 'paper', 'cloth', 'leather',
    'wooden', 'bone', 'dragonhide', 'iron',
    'metal', 'copper', 'silver', 'gold',
    'platinum', 'mithril', 'plastic', 'glass',
    'gemstone', 'stone',
];

// C ref: nhlua.c:278-282 timerstr[]
const NHL_TIMER_NAMES = [
    'rot-organic', 'rot-corpse', 'revive-mon', 'zombify-mon',
    'burn-obj', 'hatch-egg', 'fig-transform', 'shrink-glob',
    'melt-ice',
];

// C ref: include/objects.h OBJECTS_INIT columns (482 entries, otyp-indexed)
const OC_NOWISH = [0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0];
const OC_BIG = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0];
const OC_DIR = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,2,2,3,3,0,1,2,2,1,1,1,1,2,2,2,2,2,2,2,2,2,1,1,1,2,3,2,2,3,2,3,5,5,4,1,4,4,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,1,1,2,2,2,2,2,2,2,2,1,1,1,1,1,2,1,1,1,2,1,1,1,1,1,1,2,2,2,1,2,1,2,2,1,0,0,0,1,1,1,1,1,1,2,2,2,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0];
const OC_DELAY = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,0,1,1,0,1,1,1,1,1,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,1,1,5,5,5,3,5,5,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1,20,1,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,3,5,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,2,4,7,1,10,1,1,2,1,2,2,2,2,2,3,3,3,3,3,3,3,4,4,4,5,5,5,5,5,7,6,8,8,6,7,8,3,3,1,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
const OC_WSDAM = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,7,5,6,7,4,3,8,9,6,7,5,8,6,6,6,4,5,3,4,4,3,3,3,2,10,6,8,6,8,5,7,8,8,4,6,8,12,10,16,4,6,4,6,6,10,4,4,6,4,4,4,8,12,6,6,6,4,4,6,4,6,6,6,2,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,2,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,6,3,20,20,25,4,0,6,0];
const OC_WLDAM = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,6,6,6,7,6,2,6,9,8,8,8,8,8,6,4,3,3,3,3,3,3,2,2,2,10,4,6,8,8,8,8,8,8,6,6,12,6,12,8,6,6,4,6,10,6,4,4,8,8,10,6,6,8,8,6,6,6,4,3,3,6,3,4,1,2,2,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,6,12,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,6,3,20,20,25,4,0,6,0];
const OC_NUTRITION = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,5,30,30,30,35,36,20,25,10,10,10,12,10,5,5,5,20,20,60,120,30,30,30,30,40,40,70,70,40,150,40,60,40,80,50,50,75,150,120,125,60,80,120,150,100,120,180,30,36,120,50,30,20,40,15,15,20,30,30,30,30,3,50,3,30,40,3,4,4,10,40,30,50,50,50,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,450,415,450,400,350,150,150,300,300,250,200,250,250,150,30,5,5,3,10,10,10,10,15,10,15,10,10,10,10,30,30,30,40,50,50,100,100,50,10,10,30,10,10,50,20,20,15,20,15,50,20,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,20,20,20,20,20,20,20,20,20,20,20,1,20,350,600,900,15,15,15,15,3,4,1,2,2,30,20,20,12,13,150,3,2,5,200,12,4,100,4,15,50,2,200,200,3,3,5,5,18,18,18,18,30,30,30,10,25,25,100,30,20,200,50,200,0,80,5,5,2000,5,20,20,20,20,30,1,50,80,50,100,80,50,40,40,250,200,100,100,40,200,800,600,800,400,300,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,0,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,15,6,6,6,6,6,6,6,6,6,10,10,10,10,10,2000,2500,200,200,0,0,0];
const OC_USES_KNOWN = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,1,1,0,1,0,0,0,1,1,1,1,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

function lobj_is_ok(lo) {
    return !!(lo && lo.obj && lo.obj.where !== OBJ_LUAFREE);
}

function is_container(obj) {
    return !!obj && (obj.otyp | 0) >= LARGE_BOX && (obj.otyp | 0) <= BAG_OF_TRICKS;
}

function luaCheckInteger(value) {
    const n = (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
        ? Number(value) : NaN;
    if (!Number.isInteger(n)) throw new Error('Lua integer expected');
    return n;
}

function luaToInteger(value) {
    const n = (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
        ? Number(value) : 0;
    return Number.isInteger(n) ? n : 0;
}

function toCoordXY(n) {
    return (n << 24) >> 24;
}

function charEntry(val) {
    if (typeof val === 'string') return val.length ? val[0] : '';
    const code = val | 0;
    return code ? String.fromCharCode(code & 0xff) : '';
}

function nhl_get_timertype(val) {
    const idx = typeof val === 'string' ? NHL_TIMER_NAMES.indexOf(val) : -1;
    if (idx < 0 || idx >= NHL_TIMER_NAMES.length)
        throw new Error('Unknown timer type');
    return idx;
}

function timer_is_obj(ttype) {
    return ttype >= ROT_ORGANIC && ttype <= SHRINK_GLOB;
}

// C ref: nhlobj.c:35-44
function l_obj_check(value) {
    if (!(value instanceof LuaUserdata) || value.metatable?.get('__name') !== 'obj' || !value.value)
        throw new Error('Obj error');
    return value.value;
}

// C ref: nhlobj.c:47-70
export async function l_obj_gc(value) {
    const lo = l_obj_check(value);
    const obj = lo.obj;
    if (obj) {
        if (obj.lua_ref_cnt > 0) obj.lua_ref_cnt--;
        if (!obj.lua_ref_cnt && (obj.where === OBJ_FREE || obj.where === OBJ_LUAFREE)) {
            if (Has_contents(obj)) {
                while (obj.cobj) {
                    const otmp = obj.cobj;
                    obj_extract_self(otmp);
                    await dealloc_obj(otmp);
                }
            }
            obj.where = OBJ_FREE;
            await dealloc_obj(obj);
        }
        lo.obj = null;
    }
}

// C ref: nhlobj.c:73-86
export function l_obj_push(L, obj) {
    const lo = new LuaUserdata({ state: 0, obj }, L.objMetatable);
    if (obj) obj.lua_ref_cnt = (obj.lua_ref_cnt || 0) + 1;
    L.objectRefs.add(lo);
    return lo;
}

// C ref: nhlobj.c:89-92
export function nhl_push_obj(L, otmp) {
    return l_obj_push(L, otmp);
}

// C ref: nhlobj.c:97-107
export function l_obj_getcontents(L, ...args) {
    const lo = l_obj_check(args[0]);
    const obj = lo.obj;
    if (!obj)
        throw new Error('l_obj_getcontents: no obj');
    return l_obj_push(L, obj.cobj || null);
}

// C ref: nhlobj.c:114-137
export async function l_obj_add_to_container(...args) {
    const lobox = l_obj_check(args[0]);
    const lo = l_obj_check(args[1]);
    if (!lobj_is_ok(lo) || !lobj_is_ok(lobox))
        return;
    const refs = lo.obj.lua_ref_cnt | 0;
    obj_extract_self(lo.obj);
    const otmp = await add_to_container(lobox.obj, lo.obj);
    /* was lo->obj merged? */
    if (otmp !== lo.obj) {
        lo.obj = otmp;
        lo.obj.lua_ref_cnt = (lo.obj.lua_ref_cnt | 0) + refs;
    }
    lobox.obj.owt = weight(lobox.obj);
}

// C ref: nhlobj.c:142-162
export async function nhl_obj_u_giveobj(...args) {
    const lo = l_obj_check(args[0]);
    if (!lobj_is_ok(lo) || lo.obj.where === OBJ_INVENT)
        return;
    const refs = lo.obj.lua_ref_cnt | 0;
    obj_extract_self(lo.obj);
    const otmp = await addinv(lo.obj);
    if (otmp !== lo.obj) {
        lo.obj.lua_ref_cnt = (lo.obj.lua_ref_cnt | 0) + refs;
        lo.obj = otmp;
    }
}

// C ref: nhlobj.c:171-238
export function l_obj_objects_to_table(...args) {
    if (args.length !== 1)
        throw new Error('l_obj_objects_to_table: Wrong args');
    let otyp = -1;
    if (typeof args[0] === 'number') {
        otyp = luaCheckInteger(args[0]) | 0;
    } else if (args[0] instanceof LuaUserdata) {
        const lo = l_obj_check(args[0]);
        if (lo && lo.obj)
            otyp = lo.obj.otyp | 0;
    }
    if (otyp === -1)
        throw new Error('l_obj_objects_to_table: Wrong args');

    const t = new LuaTable();
    const name = getObjName(otyp);
    if (name) t.set('name', name);
    const descr = getObjDescr(otyp);
    if (descr) t.set('descr', descr);
    const uname = game._oc_uname?.[otyp];
    if (uname) t.set('uname', uname);

    t.set('name_known', game._oc_name_known?.[otyp] ? 1 : 0);
    t.set('merge', MKOBJ_OC_MERGE[otyp] | 0);
    t.set('uses_known', OC_USES_KNOWN[otyp] | 0);
    t.set('encountered', game._oc_encountered?.[otyp] ? 1 : 0);
    t.set('magic', MKOBJ_OC_MAGIC[otyp] | 0);
    t.set('charged', OC_CHARGED[otyp] | 0);
    t.set('unique', game._oc_unique?.[otyp] ? 1 : 0);
    t.set('nowish', OC_NOWISH[otyp] | 0);
    t.set('big', OC_BIG[otyp] | 0);
    t.set('tough', object_tough(otyp) ? 1 : 0);
    t.set('dir', (otyp === WAN_NOTHING && isWanNothingNodir()) ? NODIR : (OC_DIR[otyp] | 0));
    const mat = (game._objMaterials && game._objMaterials[otyp] != null)
        ? (game._objMaterials[otyp] | 0) : (MKOBJ_OC_MATERIAL[otyp] | 0);
    t.set('material', MATERIALNM[mat] ?? '');
    t.set('oprop', MKOBJ_OC_OPROP[otyp] | 0);
    t.set('class', charEntry(def_oc_syms_chars[MKOBJ_OC_CLASS[otyp] | 0]));
    t.set('delay', OC_DELAY[otyp] | 0);
    const clr = (game._objColors && game._objColors[otyp] != null)
        ? (game._objColors[otyp] | 0) : (MKOBJ_OC_COLOR[otyp] | 0);
    t.set('color', clr);
    t.set('prob', MKOBJ_OC_PROB[otyp] | 0);
    t.set('weight', OC_WEIGHT[otyp] | 0);
    t.set('cost', OC_COST[otyp] | 0);
    t.set('damage_small', OC_WSDAM[otyp] | 0);
    t.set('damage_large', OC_WLDAM[otyp] | 0);
    t.set('nutrition', OC_NUTRITION[otyp] | 0);
    return t;
}

// C ref: nhlobj.c:247-342
export function l_obj_to_table(...args) {
    const lo = l_obj_check(args[0]);
    const obj = lo.obj;
    const t = new LuaTable();

    if (!obj || obj.where === OBJ_LUAFREE) {
        t.set('NO_OBJ', 1);
        return t;
    }

    const otyp = obj.otyp | 0;
    const spe = obj.spe | 0;
    const oclass = obj.oclass | 0;
    const corpsenm = obj.corpsenm ?? NON_PM;

    t.set('has_contents', Has_contents(obj) ? 1 : 0);
    t.set('is_container', is_container(obj) ? 1 : 0);
    t.set('o_id', obj.o_id | 0);
    t.set('ox', obj.ox | 0);
    t.set('oy', obj.oy | 0);
    t.set('otyp', otyp);
    const otypName = getObjName(otyp);
    if (otypName) t.set('otyp_name', otypName);
    const otypDescr = getObjDescr(otyp);
    if (otypDescr) t.set('otyp_descr', otypDescr);
    t.set('owt', obj.owt | 0);
    t.set('quan', obj.quan | 0);
    t.set('spe', spe);

    if (otyp === STATUE)
        t.set('historic', (spe & CORPSTAT_HISTORIC) !== 0 ? 1 : 0);
    if (otyp === CORPSE || otyp === STATUE) {
        t.set('male', (spe & CORPSTAT_MALE) !== 0 ? 1 : 0);
        t.set('female', (spe & CORPSTAT_FEMALE) !== 0 ? 1 : 0);
    }

    t.set('oclass', charEntry(def_oc_syms_chars[oclass]));
    t.set('invlet', charEntry(obj.invlet));
    t.set('where', obj.where | 0);
    t.set('cursed', obj.cursed ? 1 : 0);
    t.set('blessed', obj.blessed ? 1 : 0);
    t.set('unpaid', obj.unpaid ? 1 : 0);
    t.set('no_charge', obj.no_charge ? 1 : 0);
    t.set('known', obj.known ? 1 : 0);
    t.set('dknown', obj.dknown ? 1 : 0);
    t.set('bknown', obj.bknown ? 1 : 0);
    t.set('rknown', obj.rknown ? 1 : 0);
    t.set('tknown', obj.tknown ? 1 : 0);
    if (oclass === POTION_CLASS)
        t.set('odiluted', (obj.odiluted ?? obj.oeroded) | 0);
    else
        t.set('oeroded', obj.oeroded | 0);
    t.set('oeroded2', obj.oeroded2 | 0);
    t.set('oerodeproof', obj.oerodeproof ? 1 : 0);
    t.set('olocked', obj.olocked ? 1 : 0);
    t.set('obroken', obj.obroken ? 1 : 0);
    if (is_poisonable(obj))
        t.set('opoisoned', (obj.opoisoned ?? obj.otrapped) | 0);
    else
        t.set('otrapped', obj.otrapped | 0);
    t.set('recharged', obj.recharged | 0);
    t.set('lamplit', obj.lamplit ? 1 : 0);
    t.set('globby', obj.globby ? 1 : 0);
    t.set('greased', obj.greased ? 1 : 0);
    t.set('nomerge', obj.nomerge ? 1 : 0);
    t.set('how_lost', obj.how_lost | 0);
    t.set('in_use', obj.in_use ? 1 : 0);
    t.set('bypass', obj.bypass ? 1 : 0);
    t.set('cknown', obj.cknown ? 1 : 0);
    t.set('lknown', obj.lknown ? 1 : 0);
    t.set('corpsenm', corpsenm | 0);
    if (corpsenm !== NON_PM
        && (otyp === TIN || otyp === CORPSE || otyp === EGG
            || otyp === FIGURINE || otyp === STATUE)) {
        const pmRow = monPmnamesPack.pmnames?.[corpsenm];
        t.set('corpsenm_name', pmRow?.[2] ?? '');
    }
    t.set('usecount', obj.usecount | 0);
    t.set('oeaten', obj.oeaten | 0);
    t.set('age', obj.age | 0);
    t.set('owornmask', obj.owornmask | 0);
    const hasOname = has_oname(obj) ? 1 : 0;
    t.set('has_oname', hasOname);
    if (hasOname)
        t.set('oname', ONAME(obj));

    return t;
}

// C ref: nhlobj.c:350-384
export async function l_obj_new_readobjnam(L, ...args) {
    if (args.length !== 1) throw new Error('l_obj_new_readobjname: Wrong args');
    let obj;
    if (typeof args[0] === 'string') {
        obj = await readobjnam(args[0], null);
        if (obj === hands_obj) obj = null;
    } else if (args[0] instanceof LuaTable) {
        const id = get_table_objtype(args[0]);
        let cls = get_table_objclass(args[0]);
        if (id >= FIRST_OBJECT) obj = await mksobj(id, true, false);
        else {
            cls = def_char_to_objclass(cls);
            if (cls >= MAXOCLASSES) cls = RANDOM_CLASS;
            obj = await mkobj(cls, false);
        }
    } else throw new Error('l_obj_new_readobjname: Wrong args');
    return l_obj_push(L, obj);
}

// C ref: nhlobj.c:389-407
export function l_obj_at(L, ...args) {
    if (args.length !== 2)
        throw new Error('l_obj_at: Wrong args');
    const { x, y } = cvt_to_abscoord(
        toCoordXY(luaCheckInteger(args[0])),
        toCoordXY(luaCheckInteger(args[1])),
        { xstart: game.gx?.xstart || 0, ystart: game.gy?.ystart || 0 },
    );
    return l_obj_push(L, game.level?.levelObjects?.[x]?.[y] ?? null);
}

// C ref: nhlobj.c:413-435
export async function l_obj_placeobj(...args) {
    const lo = l_obj_check(args[0]);
    if (args.length !== 3) throw new Error('l_obj_placeobj: Wrong args');
    const { x, y } = cvt_to_abscoord(
        toCoordXY(luaCheckInteger(args[1])),
        toCoordXY(luaCheckInteger(args[2])),
        { xstart: game.gx?.xstart || 0, ystart: game.gy?.ystart || 0 },
    );
    if (lobj_is_ok(lo)) {
        obj_extract_self(lo.obj);
        await place_object(lo.obj, x, y);
        newsym(x, y);
    }
}

// C ref: nhlobj.c:445-464
export function l_obj_nextobj(L, ...args) {
    if (args.length === 0)
        return l_obj_push(L, game.fobj || null);
    const lo = l_obj_check(args[0]);
    let use_nexthere = false;
    if (args.length === 2)
        use_nexthere = args[1] !== null && args[1] !== undefined && args[1] !== false;
    if (lo && lo.obj) {
        return l_obj_push(L, (use_nexthere && lo.obj.where === OBJ_FLOOR)
            ? (lo.obj.nexthere || null)
            : (lo.obj.nobj || null));
    }
    return null;
}

// C ref: nhlobj.c:469-478
export function l_obj_container(L, ...args) {
    const lo = l_obj_check(args[0]);
    if (lo && lo.obj && lo.obj.where === OBJ_CONTAINED)
        return l_obj_push(L, lo.obj.ocontainer || null);
    return l_obj_push(L, null);
}

// C ref: nhlobj.c:483-489
export function l_obj_isnull(...args) {
    const lo = l_obj_check(args[0]);
    return !lobj_is_ok(lo);
}

// C ref: nhlobj.c:496-514
export function l_obj_timer_has(...args) {
    if (args.length === 2) {
        const lo = l_obj_check(args[0]);
        const timertype = nhl_get_timertype(args[1]);
        if (timer_is_obj(timertype) && lo && lo.obj)
            return !!obj_has_timer(lo.obj, timertype);
        return false;
    }
    throw new Error('l_obj_timer_has: Wrong args');
}

// C ref: nhlobj.c:520-539
export function l_obj_timer_peek(...args) {
    if (args.length === 2) {
        const lo = l_obj_check(args[0]);
        const timertype = nhl_get_timertype(args[1]);
        if (timer_is_obj(timertype) && lo && lo.obj)
            return peek_timer(timertype, obj_to_any(lo.obj));
        return 0;
    }
    throw new Error('l_obj_timer_peek: Wrong args');
}

// C ref: nhlobj.c:547-572
export function l_obj_timer_stop(...args) {
    if (args.length === 1) {
        const lo = l_obj_check(args[0]);
        if (lo && lo.obj)
            obj_stop_timers(lo.obj);
        return;
    }
    if (args.length === 2) {
        const lo = l_obj_check(args[0]);
        const timertype = nhl_get_timertype(args[1]);
        if (timer_is_obj(timertype) && lo && lo.obj)
            return stop_timer(timertype, obj_to_any(lo.obj));
        return 0;
    }
    throw new Error('l_obj_timer_stop: Wrong args');
}

// C ref: nhlobj.c:579-596
export function l_obj_timer_start(...args) {
    if (args.length === 3) {
        const lo = l_obj_check(args[0]);
        const timertype = nhl_get_timertype(args[1]);
        const when = luaCheckInteger(args[2]);
        if (timer_is_obj(timertype) && lo && lo.obj && when > 0) {
            if (obj_has_timer(lo.obj, timertype))
                stop_timer(timertype, obj_to_any(lo.obj));
            start_timer(when, TIMER_OBJECT, timertype, obj_to_any(lo.obj));
        }
        return;
    }
    throw new Error('l_obj_timer_start: Wrong args');
}

// C ref: nhlobj.c:603-627
export async function l_obj_bury(...args) {
    let dealloced = false;
    const lo = l_obj_check(args[0]);
    let x = 0, y = 0;

    if (args.length === 1) {
        x = lo.obj.ox | 0;
        y = lo.obj.oy | 0;
    } else if (args.length === 3) {
        const c = cvt_to_abscoord(
            toCoordXY(luaToInteger(args[1])),
            toCoordXY(luaToInteger(args[2])),
            { xstart: game.gx?.xstart || 0, ystart: game.gy?.ystart || 0 },
        );
        x = c.x;
        y = c.y;
    } else {
        throw new Error('l_obj_bury: Wrong args');
    }

    if (lobj_is_ok(lo) && isok(x, y)) {
        lo.obj.ox = x;
        lo.obj.oy = y;
        const d = { value: 0 };
        await bury_an_obj(lo.obj, d);
        dealloced = !!d.value;
    }
    return dealloced;
}

// C ref: nhlobj.c:654-679
export function l_obj_register(L) {
    L.objectRefs = new Set();
    L.defineGlobal('obj', {
        new: (...args) => l_obj_new_readobjnam(L, ...args),
        isnull: l_obj_isnull,
        at: (...args) => l_obj_at(L, ...args),
        next: (...args) => l_obj_nextobj(L, ...args),
        totable: l_obj_to_table,
        class: l_obj_objects_to_table,
        placeobj: l_obj_placeobj,
        container: (...args) => l_obj_container(L, ...args),
        contents: (...args) => l_obj_getcontents(L, ...args),
        addcontent: l_obj_add_to_container,
        has_timer: l_obj_timer_has,
        peek_timer: l_obj_timer_peek,
        stop_timer: l_obj_timer_stop,
        start_timer: l_obj_timer_start,
        bury: l_obj_bury,
    });
    L.objMetatable = new LuaTable();
    L.objMetatable.set('__name', 'obj');
    L.objMetatable.set('__index', L.getGlobal('obj'));
    L.objMetatable.set('__gc', l_obj_gc);
    const fakeMeta = new LuaTable();
    fakeMeta.set('__gc', l_obj_gc);
    L.objMetatable.set('__metatable', fakeMeta);
}
