import { C } from '../c-runtime/context.js';
/* NetHack 5.0	detect.c	$NHDT-Date: 1763708572 2025/11/20 23:02:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.191 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2018. */
/* NetHack may be freely redistributed.  See license for details. */
/*
 * Detection routines, including crystal ball, magic mapping, and search
 * command.
 */
/* for screen alert shown to player when secret door detection or ^E
   finds stuff; to use tmp_at() instead of flash_glyph_at(), define as 0;
   extra code for tmp_at() will be included and the flash_glyph_at()
   calls will execute but won't do anything */
/* dummytrap: used when detecting traps finds a door or chest trap; the
   couple of fields that matter are always re-initialized during use so
   this does not need to be part of 'struct instance_globals g'; fields
   that aren't used are compile-/link-/load-time initialized to 0 */
/* data for enhanced feedback from findone() */
/* for passing extra info to detect_obj_traps() */
/* wildcard class for clear_stale_map - this used to be used as a getobj()
   input but it's no longer used for that function */
/* bring hero out from underwater or underground or being engulfed;
   return True iff any change occurred */
export function unconstrain_map()
{
    let res=C.i8(Number(!!(Number(!!(C.i32(C.field(C.u,"you","uinwater").value)||C.i32(C.field(C.u,"you","uburied").value)))||C.i32(C.field(C.u,"you","uswallow").value))));
    /* bring Underwater, buried, or swallowed hero to normal map;
       bypass set_uinwater() */
    ((C.field(C.iflags,"instance_flags","save_uinwater").value=C.field(C.u,"you","uinwater").value),(C.field(C.u,"you","uinwater").value=C.u32(0)));
    ((C.field(C.iflags,"instance_flags","save_uburied").value=C.field(C.u,"you","uburied").value),(C.field(C.u,"you","uburied").value=C.u32(0)));
    ((C.field(C.iflags,"instance_flags","save_uswallow").value=C.field(C.u,"you","uswallow").value),(C.field(C.u,"you","uswallow").value=C.u32(0)));
    return res;
}

/* put hero back underwater or underground or engulfed */
export function reconstrain_map()
{
    /* if was in water and taken out, put back; bypass set_uinwater() */
    ((C.field(C.u,"you","uinwater").value=C.field(C.iflags,"instance_flags","save_uinwater").value),(C.field(C.iflags,"instance_flags","save_uinwater").value=C.u32(0)));
    ((C.field(C.u,"you","uburied").value=C.field(C.iflags,"instance_flags","save_uburied").value),(C.field(C.iflags,"instance_flags","save_uburied").value=C.u32(0)));
    ((C.field(C.u,"you","uswallow").value=C.field(C.iflags,"instance_flags","save_uswallow").value),(C.field(C.iflags,"instance_flags","save_uswallow").value=C.u32(0)));
}

export function map_redisplay()
{
    reconstrain_map();
    C.docrt();
    /* redraw the screen to remove unseen traps from the map */
    if((C.field(C.u,"you","uinwater").value)) C.under_water(2);
    if(C.field(C.u,"you","uburied").value) C.under_ground(2);
}

/* use getpos()'s 'autodescribe' to view whatever is currently shown on map */
export function browse_map(ter_typ,ter_explain)
{
    ter_typ=C.u32(ter_typ);
    const stackFrame=C.stackSave();
    try {
    let dummy_pos=C.stackAlloc(C.sizes["struct nhcoord"]);
    /* don't care whether player actually picks a spot */
    let save_autodescribe;
    ((C.field(dummy_pos,"nhcoord","x").value=C.field(C.u,"you","ux").value),(C.field(dummy_pos,"nhcoord","y").value=C.field(C.u,"you","uy").value));
    /* starting spot for getpos() */
    (save_autodescribe=C.field(C.iflags,"instance_flags","autodescribe").value);
    (C.field(C.iflags,"instance_flags","autodescribe").value=(C.i8(1)));
    (C.field(C.iflags,"instance_flags","terrainmode").value=ter_typ);
    C.getpos(dummy_pos,(C.i8(0)),ter_explain);
    (C.field(C.iflags,"instance_flags","terrainmode").value=C.u32(0));
    (C.field(C.iflags,"instance_flags","autodescribe").value=save_autodescribe);
    } finally {C.stackRestore(stackFrame); }
}

/* extracted from monster_detection() so can be shared by do_vicinity_map() */
export function map_monst(mtmp,showtail)
{
    showtail=C.i8(showtail);
    let glyph=((Number(C.i32((C.field((C.def_monsyms+Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value))*C.sizes["struct class_sym"]),"class_sym","sym").value))==32))?(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((mtmp),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((mtmp),"monst","female").value)==0))?C.GLYPH_DETECT_MALE_OFF:C.GLYPH_DETECT_FEM_OFF))))):(C.i32(C.field(mtmp,"monst","mtame").value)?(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((mtmp),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((mtmp),"monst","female").value)==0))?C.GLYPH_PET_MALE_OFF:C.GLYPH_PET_FEM_OFF))))):(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((mtmp),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((mtmp),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF)))))));
    C.show_glyph(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,glyph);
    if(Number(!!(C.i32(showtail)&&Number(C.field(mtmp,"monst","data").value==(C.mons+Number(C.PM_LONG_WORM)*C.sizes["struct permonst"]))))) C.detect_wsegs(mtmp,C.i8(0));
}

/* this is checking whether a trap symbol represents a trapped chest,
   not whether a trapped chest is actually present */
export function trapped_chest_at(ttyp,x,y)
{
    ttyp=C.i32(ttyp);
    x=C.i16(x);
    y=C.i16(y);
    let mtmp;
    let otmp;
    if(Number(!((Number(!!(Number((C.glyph_at(x,y))>=((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave))))))))&&Number((C.glyph_at(x,y))<(C.i32((((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave)))))))+(C.i32((C.TRAPNUM-1))))))))))))) return (C.i8(0));
    if(Number(!!(Number(ttyp!=C.TRAPPED_CHEST)||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),146,(C.literal("trapped_chest_at"))),C.rn2(20))):C.rn2(20))))))))) return (C.i8(0));
    /*
     * TODO?  We should check containers recursively like the trap
     * detecting routine does.  Chests and large boxes do not nest in
     * themselves or each other, but could be contained inside statues.
     *
     * For farlook, we should also check for buried containers, but
     * for '^' command to examine adjacent trap glyph, we shouldn't.
     */
    /* on map, presence of any trappable container will do */
    if(Number(!!(C.sobj_at(C.CHEST,x,y)||C.sobj_at(C.LARGE_BOX,x,y)))) return (C.i8(1));
    /* in inventory, we need to find one which is actually trapped */
    if((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))) {
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(!!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CHEST))))&&C.i32(C.field(otmp,"obj","otrapped").value)))) return (C.i8(1));

        if(C.field(C.u,"you","usteed").value) {
            /* steed isn't on map so won't be found by m_at() */
            for((otmp=C.field(C.field(C.u,"you","usteed").value,"monst","minvent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(!!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CHEST))))&&C.i32(C.field(otmp,"obj","otrapped").value)))) return (C.i8(1));

        }
    }
    if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) for((otmp=C.field(mtmp,"monst","minvent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(!!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CHEST))))&&C.i32(C.field(otmp,"obj","otrapped").value)))) return (C.i8(1));

    return (C.i8(0));
}

/* this is checking whether a trap symbol represents a trapped door,
   not whether the door here is actually trapped */
export function trapped_door_at(ttyp,x,y)
{
    ttyp=C.i32(ttyp);
    x=C.i16(x);
    y=C.i16(y);
    let lev;
    if(Number(!((Number(!!(Number((C.glyph_at(x,y))>=((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave))))))))&&Number((C.glyph_at(x,y))<(C.i32((((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave)))))))+(C.i32((C.TRAPNUM-1))))))))))))) return (C.i8(0));
    if(Number(!!(Number(ttyp!=C.TRAPPED_DOOR)||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),188,(C.literal("trapped_door_at"))),C.rn2(20))):C.rn2(20))))))))) return (C.i8(0));
    (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
    if(Number(!((Number(C.i32((C.field(lev,"rm","typ").value))==C.DOOR))))) return (C.i8(0));
    if(Number(!!(Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&(C.i32((C.i32((0|1))|2))))))!=0)&&C.i32(trapped_chest_at(ttyp,x,y))))) return (C.i8(0));
    return (C.i8(1));
}

/* recursively search obj for an object in class oclass, return 1st found */
export function o_in(obj,oclass)
{
    oclass=C.i8(oclass);
    let otmp;
    let temp;
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.i32(oclass))) return obj;
    /*
     * Note:  we exclude SchroedingersBox because the corpse it contains
     * isn't necessarily a corpse yet.  Resolving the status would lead
     * to complications if it turns out to be a live cat.  We know that
     * that Box can't contain anything else because putting something in
     * would resolve the cat/corpse situation and convert to ordinary box.
     */
    if(Number(!!((Number(C.field((obj),"obj","cobj").value!=0))&&Number(!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","spe").value)==1))))))))) {
        for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.i32(oclass))) return otmp;
 else if(Number(!!((Number(C.field((otmp),"obj","cobj").value!=0))&&Number(((temp=o_in(otmp,oclass)))!=0)))) return temp;

    }
    return 0;
}

/* Recursively search obj for an object made of specified material.
 * Return first found.
 */
export function o_material(obj,material)
{
    material=C.u32(material);
    let otmp;
    let temp;
    if(Number(C.u32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==material)) return obj;
    if((Number(C.field((obj),"obj","cobj").value!=0))) {
        for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.u32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==material)) return otmp;
 else if(Number(!!((Number(C.field((otmp),"obj","cobj").value!=0))&&Number(((temp=o_material(otmp,material)))!=0)))) return temp;

    }
    return 0;
}

export function observe_recursively(obj)
{
    let otmp;
    C.observe_object(obj);
    if((Number(C.field((obj),"obj","cobj").value!=0))) {
        for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) observe_recursively(otmp);

    }
}

/* Check whether the location has an outdated object displayed on it. */
export function check_map_spot(x,y,oclass,material)
{
    x=C.i16(x);
    y=C.i16(y);
    oclass=C.i8(oclass);
    material=C.u32(material);
    let glyph;
    let otmp;
    let mtmp;
    (glyph=C.glyph_at(x,y));
    if((Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number((glyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((glyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))||(Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))))||(Number(!!((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_BODY_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS))))))))))))))) {
        /* there's some object shown here */
        if(Number(C.i32(oclass)==(C.i32((C.MAXOCLASSES+1))))) {
            return C.i8(Number(!((Number(!!(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value||(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&C.field(mtmp,"monst","minvent").value)))))))));
            /* stale if nothing here */
        } else {
            if(Number(!!(material&&Number(C.u32(C.field((C.objects+Number((((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_BODY_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS)))))))))))?C.CORPSE:((Number(!!((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))?C.STATUE:((Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))?(C.i32(((glyph)-(((Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))):((Number(!!(Number(!!(Number((glyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((glyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))?(C.i32(((glyph)-(((Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS))))))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))):C.NUM_OBJECTS))))))*C.sizes["struct objclass"]),"objclass","oc_material").value)==material)))) {
                /* object shown here is of interest because material matches */
                for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(o_material(otmp,C.u32(C.GOLD))) return (C.i8(0));

                /* didn't find it; perhaps a monster is carrying it */
                if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) {
                    for((otmp=C.field(mtmp,"monst","minvent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(o_material(otmp,C.u32(C.GOLD))) return (C.i8(0));

                }
                /* detection indicates removal of this object from the map */
                return (C.i8(1));
            }
            if(Number(!!(C.i32(oclass)&&Number(C.i32(C.field((C.objects+Number((((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_BODY_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS)))))))))))?C.CORPSE:((Number(!!((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))?C.STATUE:((Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))?(C.i32(((glyph)-(((Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))):((Number(!!(Number(!!(Number((glyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((glyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))?(C.i32(((glyph)-(((Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS))))))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))):C.NUM_OBJECTS))))))*C.sizes["struct objclass"]),"objclass","oc_class").value)==C.i32(oclass))))) {
                /* obj shown here is of interest because its class matches */
                for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(o_in(otmp,oclass)) return (C.i8(0));

                /* didn't find it; perhaps a monster is carrying it */
                if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) {
                    for((otmp=C.field(mtmp,"monst","minvent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(o_in(otmp,oclass)) return (C.i8(0));

                }
                /* detection indicates removal of this object from the map */
                return (C.i8(1));
            }
        }
    }
    return (C.i8(0));
}

/*
 * When doing detection, remove stale data from the map display (corpses
 * rotted away, objects carried away by monsters, etc) so that it won't
 * reappear after the detection has completed.  Return true if noticeable
 * change occurs.
 */
export function clear_stale_map(oclass,material)
{
    oclass=C.i8(oclass);
    material=C.u32(material);
    let zx; let zy;
    let change_made=(C.i8(0));
    for((zx=C.i16(1));Number(C.i32(zx)<80);((zx=C.i16((zx+1)))-1)) for((zy=C.i16(0));Number(C.i32(zy)<21);((zy=C.i16((zy+1)))-1)) if(check_map_spot(zx,zy,oclass,material)) {
        C.unmap_object(zx,zy);
        (change_made=(C.i8(1)));
    }


    return change_made;
}

/* look for gold, on the floor or in monsters' possession */
export function gold_detect(sobj)
{
    const stackFrame=C.stackSave();
    try {
    let obj;
    let mtmp;
    let gold=C.stackAlloc(C.sizes["struct obj"]); let temp=0;
    let stale; let ugold=(C.i8(0)); let steedgold=(C.i8(0));
    let ter_typ=C.i32(C.u32((32|4)));
    outgoldmap: {
    (C.field(C.gk,"instance_globals_k","known").value=(stale=clear_stale_map(C.i8(C.COIN_CLASS),C.u32(((C.i32(C.field(sobj,"obj","blessed").value)?C.GOLD:0))))));
    /* look for gold carried by monsters (might be in a container) */
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
        if(Number(!!(C.findgold(C.field(mtmp,"monst","minvent").value)||Number(C.i32((C.field((C.field(mtmp,"monst","data").value),"permonst","pmidx").value))==C.PM_GOLD_GOLEM)))) {
            if(Number(mtmp==C.field(C.u,"you","usteed").value)) {
                (steedgold=(C.i8(1)));
            } else {
                (C.field(C.gk,"instance_globals_k","known").value=(C.i8(1)));
                break outgoldmap;
                /* skip further searching */
            }
        } else {
            for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!((Number(!!(C.i32(C.field(sobj,"obj","blessed").value)&&o_material(obj,C.u32(C.GOLD)))))||o_in(obj,C.i8(C.COIN_CLASS))))) {
                if(Number(mtmp==C.field(C.u,"you","usteed").value)) {
                    (steedgold=(C.i8(1)));
                } else {
                    (C.field(C.gk,"instance_globals_k","known").value=(C.i8(1)));
                    break outgoldmap;
                    /* skip further searching */
                }
            }

        }
    }
    /* look for gold objects */
    for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(Number(!!(C.i32(C.field(sobj,"obj","blessed").value)&&o_material(obj,C.u32(C.GOLD))))) {
            (C.field(C.gk,"instance_globals_k","known").value=(C.i8(1)));
            if(Number(!!(Number(C.i32(C.field(obj,"obj","ox").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(obj,"obj","oy").value)!=C.i32(C.field(C.u,"you","uy").value))))) break outgoldmap;
        } else if(o_in(obj,C.i8(C.COIN_CLASS))) {
            (C.field(C.gk,"instance_globals_k","known").value=(C.i8(1)));
            if(Number(!!(Number(C.i32(C.field(obj,"obj","ox").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(obj,"obj","oy").value)!=C.i32(C.field(C.u,"you","uy").value))))) break outgoldmap;
        }
    }
    if(Number(!(C.field(C.gk,"instance_globals_k","known").value))) {
        /* no gold found on floor or monster's inventory.
           adjust message if you have gold in your inventory */
        let buf=C.stackAlloc((1*256));
        if(Number(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value==(C.mons+Number(C.PM_GOLD_GOLEM)*C.sizes["struct permonst"]))) C.variadic(0,buf,C.literal("You feel like a million %s!"),C.currency(2n));
 else if(Number(!!(C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value)||C.hidden_gold((C.i8(1)))))) C.strcpy(buf,C.literal("You feel worried about your future financial situation."));
 else if(steedgold) C.variadic(1,buf,C.literal("You feel interested in %s financial situation."),C.s_suffix(C.x_monnam(C.field(C.u,"you","usteed").value,(C.i32(C.field(C.field(C.u,"you","usteed").value,"monst","mtame").value)?3:1),0,8,(C.i8(0)))));
 else C.strcpy(buf,C.literal("You feel materially poor."));
        C.strange_feeling(sobj,buf);
        return 1;
    }
    /* only under me - no separate display required */
    if(stale) C.docrt();
    C.variadic(2,C.literal("notice some gold between your %s."),C.makeplural(C.body_part(C.FOOT)));
    return 0;
    }
    C.cls();
    unconstrain_map();
    /* Discover gold locations. */
    for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(Number(!!(C.i32(C.field(sobj,"obj","blessed").value)&&Number(((temp=o_material(obj,C.u32(C.GOLD))))!=0)))) {
            if(Number(temp!=obj)) {
                (C.field(temp,"obj","ox").value=C.field(obj,"obj","ox").value);
                (C.field(temp,"obj","oy").value=C.field(obj,"obj","oy").value);
            }
            C.map_object(temp,1);
        } else if(Number(((temp=o_in(obj,C.i8(C.COIN_CLASS))))!=0)) {
            if(Number(temp!=obj)) {
                (C.field(temp,"obj","ox").value=C.field(obj,"obj","ox").value);
                (C.field(temp,"obj","oy").value=C.field(obj,"obj","oy").value);
            }
            C.map_object(temp,1);
        }
        if(Number(!!(temp&&(Number(!!(Number(C.i32((C.field(temp,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(temp,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value)))))))) (ugold=(C.i8(1)));
    }
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
        (temp=0);
        if(Number(!!(C.findgold(C.field(mtmp,"monst","minvent").value)||Number(C.i32((C.field((C.field(mtmp,"monst","data").value),"permonst","pmidx").value))==C.PM_GOLD_GOLEM)))) {
            C.copyRecord(gold,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
            /* ensure oextra is cleared too */
            (C.field(gold,"obj","otyp").value=C.i16(C.GOLD_PIECE));
            (C.field(gold,"obj","quan").value=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),442,(C.literal("gold_detect"))),C.rnd(10))):C.rnd(10)))));
            /* usually more than 1 */
            (C.field(gold,"obj","ox").value=C.field(mtmp,"monst","mx").value);
            (C.field(gold,"obj","oy").value=C.field(mtmp,"monst","my").value);
            C.map_object(gold,1);
            (temp=gold);
        } else {
            for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!(C.i32(C.field(sobj,"obj","blessed").value)&&Number(((temp=o_material(obj,C.u32(C.GOLD))))!=0)))) {
                (C.field(temp,"obj","ox").value=C.field(mtmp,"monst","mx").value);
                (C.field(temp,"obj","oy").value=C.field(mtmp,"monst","my").value);
                C.map_object(temp,1);
                break;
            } else if(Number(((temp=o_in(obj,C.i8(C.COIN_CLASS))))!=0)) {
                (C.field(temp,"obj","ox").value=C.field(mtmp,"monst","mx").value);
                (C.field(temp,"obj","oy").value=C.field(mtmp,"monst","my").value);
                C.map_object(temp,1);
                break;
            }

        }
        if(Number(!!(temp&&(Number(!!(Number(C.i32((C.field(temp,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(temp,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value)))))))) (ugold=(C.i8(1)));
    }
    if(Number(!(ugold))) {
        C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        (ter_typ=C.i32(ter_typ|8));
        /* so autodescribe will recognize hero */
    }
    C.variadic(3,C.literal("very greedy, and sense gold!"));
    C.exercise(C.A_WIS,(C.i8(1)));
    browse_map(C.u32(ter_typ),C.literal("gold"));
    map_redisplay();
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* returns 1 if nothing was detected, 0 if something was detected */
export function food_detect(sobj)
{
    const stackFrame=C.stackSave();
    try {
    let obj;
    let mtmp;
    let ct=0; let ctu=0;
    let confused=C.i8((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value||(Number(!!(sobj&&C.i32(C.field(sobj,"obj","cursed").value)))))))); let stale;
    let oclass=C.i8((C.i32(confused)?C.POTION_CLASS:C.FOOD_CLASS));
    let what=(C.i32(confused)?C.field(C.c_common_strings,"c_common_strings","c_something").value:C.literal("food"));
    (stale=clear_stale_map(oclass,C.u32(0)));
    if(C.field(C.u,"you","usteed").value) ((C.field(C.field(C.u,"you","usteed").value,"monst","mx").value=C.field(C.u,"you","ux").value),(C.field(C.field(C.u,"you","usteed").value,"monst","my").value=C.field(C.u,"you","uy").value));
    /* some situations leave steed with stale coordinates */
    for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(o_in(obj,oclass)) {
        if((Number(!!(Number(C.i32((C.field(obj,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(obj,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value)))))) ((ctu=C.i32((ctu+1)))-1);
 else ((ct=C.i32((ct+1)))-1);
    }

    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);Number(!!(mtmp&&(Number(!!(Number(!(ct))||Number(!(ctu)))))));(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
        for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(o_in(obj,oclass)) {
            if((Number(!!(Number(C.i32((C.field(mtmp,"monst","mx").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(mtmp,"monst","my").value))==C.i32(C.field(C.u,"you","uy").value)))))) ((ctu=C.i32((ctu+1)))-1);
 else ((ct=C.i32((ct+1)))-1);
            /* steed or an engulfer with inventory */
            break;
        }

    }
    if(Number(!!(Number(!(ct))&&Number(!(ctu))))) {
        (C.field(C.gk,"instance_globals_k","known").value=C.i8(Number(!!(C.i32(stale)&&Number(!(confused))))));
        if(stale) {
            C.docrt();
            C.variadic(4,C.literal("sense a lack of %s nearby."),what);
            if(Number(!!(sobj&&C.i32(C.field(sobj,"obj","blessed").value)))) {
                if(Number(!(C.field(C.u,"you","uedibility").value))) C.variadic(5,C.literal("%s starts to tingle."),C.body_part(C.NOSE));
                (C.field(C.u,"you","uedibility").value=C.u32(1));
            }
        } else if(sobj) {
            let buf=C.stackAlloc((1*256));
            C.variadic(6,buf,C.literal("Your %s twitches%s."),C.body_part(C.NOSE),((Number(!!(C.i32(C.field(sobj,"obj","blessed").value)&&Number(!(C.field(C.u,"you","uedibility").value)))))?C.literal(" then starts to tingle"):C.literal("")));
            if(Number(!!(C.i32(C.field(sobj,"obj","blessed").value)&&Number(!(C.field(C.u,"you","uedibility").value))))) {
                let savebeginner=C.field(C.flags,"flag","beginner").value;
                (C.field(C.flags,"flag","beginner").value=(C.i8(0)));
                /* prevent non-delivery of message */
                C.strange_feeling(sobj,buf);
                (C.field(C.flags,"flag","beginner").value=savebeginner);
                (C.field(C.u,"you","uedibility").value=C.u32(1));
            } else C.strange_feeling(sobj,buf);
        }
        return Number(!(stale));
    } else if(Number(!(ct))) {
        (C.field(C.gk,"instance_globals_k","known").value=(C.i8(1)));
        C.variadic(7,C.literal("%s %s nearby."),(sobj?C.literal("smell"):C.literal("sense")),what);
        if(Number(!!(sobj&&C.i32(C.field(sobj,"obj","blessed").value)))) {
            if(Number(!(C.field(C.u,"you","uedibility").value))) C.variadic(8,C.literal("%s starts to tingle."),C.body_part(C.NOSE));
            (C.field(C.u,"you","uedibility").value=C.u32(1));
        }
    } else {
        let temp;
        let ter_typ=C.i32(C.u32((32|4)));
        (C.field(C.gk,"instance_globals_k","known").value=(C.i8(1)));
        C.cls();
        unconstrain_map();
        for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(((temp=o_in(obj,oclass)))!=0)) {
            if(Number(temp!=obj)) {
                (C.field(temp,"obj","ox").value=C.field(obj,"obj","ox").value);
                (C.field(temp,"obj","oy").value=C.field(obj,"obj","oy").value);
            }
            C.map_object(temp,1);
        }

        for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
            if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
            for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(((temp=o_in(obj,oclass)))!=0)) {
                (C.field(temp,"obj","ox").value=C.field(mtmp,"monst","mx").value);
                (C.field(temp,"obj","oy").value=C.field(mtmp,"monst","my").value);
                C.map_object(temp,1);
                break;
                /* skip rest of this monster's inventory */
            }

        }
        if(Number(!(ctu))) {
            C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            (ter_typ=C.i32(ter_typ|8));
            /* for autodescribe of self */
        }
        if(sobj) {
            if(C.field(sobj,"obj","blessed").value) {
                C.variadic(9,C.literal("%s %s to tingle and you smell %s."),C.body_part(C.NOSE),(C.i32(C.field(C.u,"you","uedibility").value)?C.literal("continues"):C.literal("starts")),what);
                (C.field(C.u,"you","uedibility").value=C.u32(1));
            } else C.variadic(10,C.literal("%s tingles and you smell %s."),C.body_part(C.NOSE),what);
        } else C.variadic(11,C.literal("sense %s."),what);
        C.exercise(C.A_WIS,(C.i8(1)));
        browse_map(C.u32(ter_typ),C.literal("food"));
        map_redisplay();
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Used for scrolls, potions, spells, and crystal balls.  Returns:
 *
 *      1 - nothing was detected
 *      0 - something was detected
 */
export function object_detect(detector,class_)
{
    class_=C.i32(class_);
    const stackFrame=C.stackSave();
    try {
    /* object doing the detecting */
    /* an object class, 0 for all */
    let x; let y;
    let stuff=C.stackAlloc((1*256));
    let is_cursed=(Number(!!(detector&&C.i32(C.field(detector,"obj","cursed").value))));
    let do_dknown=(Number(!!(Number(!!(detector&&(Number(!!(Number(C.i32(C.field(detector,"obj","oclass").value)==C.POTION_CLASS)||Number(C.i32(C.field(detector,"obj","oclass").value)==C.SPBOOK_CLASS))))))&&C.i32(C.field(detector,"obj","blessed").value))));
    let ct=0; let ctu=0;
    let obj; let otmp=0;
    let mtmp;
    let sym; let boulder=0; let ter_typ=C.i32(C.u32((32|4)));
    if(Number(!!(Number(class_<0)||Number(class_>=C.MAXOCLASSES)))) {
        C.variadic(12,C.literal("object_detect:  illegal class %d"),class_);
        (class_=0);
    }
    /* Special boulder symbol check - does the class symbol happen
     * to match showsyms[SYM_BOULDER + SYM_OFF_X] which is user-defined.
     * If so, that means we aren't sure what they really wanted to
     * detect. Rather than trump anything, show both possibilities.
     * We can exclude checking the buried obj chain for boulders below.
     */
    (sym=(class_?C.i32(C.field((C.def_oc_syms+Number(class_)*C.sizes["struct class_sym"]),"class_sym","sym").value):0));
    if(Number(!!(sym&&Number(sym==C.i32(C.cell((C.field(C.gs,"instance_globals_s","showsyms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value))))) (boulder=C.ROCK_CLASS);
    if(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(class_==C.SCROLL_CLASS))))))) C.strcpy(stuff,C.field(C.c_common_strings,"c_common_strings","c_something").value);
 else C.strcpy(stuff,(class_?C.field((C.def_oc_syms+Number(class_)*C.sizes["struct class_sym"]),"class_sym","name").value:C.literal("objects")));
    if(Number(!!(boulder&&Number(class_!=C.ROCK_CLASS)))) C.strcat(stuff,C.literal(" and/or large stones"));
    if(do_dknown) for((obj=C.field(C.gi,"instance_globals_i","invent").value);obj;(obj=C.field(obj,"obj","nobj").value)) observe_recursively(obj);

    for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(Number(!!(Number(!!((Number(!!(Number(!(class_))&&Number(!(boulder)))))||o_in(obj,C.i8(class_))))||o_in(obj,C.i8(boulder))))) {
            if((Number(!!(Number(C.i32((C.field(obj,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(obj,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value)))))) ((ctu=C.i32((ctu+1)))-1);
 else ((ct=C.i32((ct+1)))-1);
        }
        if(do_dknown) observe_recursively(obj);
    }
    for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(Number(!!(Number(!(class_))||o_in(obj,C.i8(class_))))) {
            if((Number(!!(Number(C.i32((C.field(obj,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(obj,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value)))))) ((ctu=C.i32((ctu+1)))-1);
 else ((ct=C.i32((ct+1)))-1);
        }
        if(do_dknown) observe_recursively(obj);
    }
    if(C.field(C.u,"you","usteed").value) ((C.field(C.field(C.u,"you","usteed").value,"monst","mx").value=C.field(C.u,"you","ux").value),(C.field(C.field(C.u,"you","usteed").value,"monst","my").value=C.field(C.u,"you","uy").value));
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
        for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
            if(Number(!!(Number(!!((Number(!!(Number(!(class_))&&Number(!(boulder)))))||o_in(obj,C.i8(class_))))||o_in(obj,C.i8(boulder))))) ((ct=C.i32((ct+1)))-1);
            if(do_dknown) observe_recursively(obj);
        }
        if(Number(!!((Number(!!(Number(!!(is_cursed&&Number((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))==C.M_AP_OBJECT)))&&(Number(!!(Number(!(class_))||Number(class_==C.i32(C.field((C.objects+Number(C.field(mtmp,"monst","mappearance").value)*C.sizes["struct objclass"]),"objclass","oc_class").value))))))))||(Number(!!(C.findgold(C.field(mtmp,"monst","minvent").value)&&(Number(!!(Number(!(class_))||Number(class_==C.COIN_CLASS)))))))))) {
            ((ct=C.i32((ct+1)))-1);
            break;
        }
    }
    if(Number(!!(Number(!(clear_stale_map(C.i8((Number(!(class_))?(C.i32((C.MAXOCLASSES+1))):class_)),C.u32(0))))&&Number(!(ct))))) {
        if(Number(!(ctu))) {
            if(detector) C.strange_feeling(detector,C.literal("You feel a lack of something."));
            return 1;
        }
        C.variadic(13,C.literal("sense %s nearby."),stuff);
        return 0;
    }
    C.cls();
    unconstrain_map();
    /*
     *  Map all buried objects first.
     */
    for((obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!(Number(!(class_))||Number(((otmp=o_in(obj,C.i8(class_))))!=0)))) {
        if(class_) {
            if(Number(otmp!=obj)) {
                (C.field(otmp,"obj","ox").value=C.field(obj,"obj","ox").value);
                (C.field(otmp,"obj","oy").value=C.field(obj,"obj","oy").value);
            }
            C.map_object(otmp,1);
        } else C.map_object(obj,1);
    }

    /*
     * If we are mapping all objects, map only the top object of a pile or
     * the first object in a monster's inventory.  Otherwise, go looking
     * for a matching object class and display the first one encountered
     * at each location.
     *
     * Objects on the floor override buried objects.
     */
    for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) for((obj=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);obj;(obj=C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(!!(Number(!!((Number(!!(Number(!(class_))&&Number(!(boulder)))))||Number(((otmp=o_in(obj,C.i8(class_))))!=0)))||Number(((otmp=o_in(obj,C.i8(boulder))))!=0)))) {
        if(Number(!!(class_||boulder))) {
            if(Number(otmp!=obj)) {
                (C.field(otmp,"obj","ox").value=C.field(obj,"obj","ox").value);
                (C.field(otmp,"obj","oy").value=C.field(obj,"obj","oy").value);
            }
            C.map_object(otmp,1);
        } else C.map_object(obj,1);
        break;
    }



    /* Objects in the monster's inventory override floor objects. */
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
        for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!(Number(!!((Number(!!(Number(!(class_))&&Number(!(boulder)))))||Number(((otmp=o_in(obj,C.i8(class_))))!=0)))||Number(((otmp=o_in(obj,C.i8(boulder))))!=0)))) {
            if(Number(!!(Number(!(class_))&&Number(!(boulder))))) (otmp=obj);
            (C.field(otmp,"obj","ox").value=C.field(mtmp,"monst","mx").value);
            /* at monster location */
            (C.field(otmp,"obj","oy").value=C.field(mtmp,"monst","my").value);
            C.map_object(otmp,1);
            break;
        }

        /* Allow a mimic to override the detected objects it is carrying. */
        if(Number(!!(Number(!!(is_cursed&&Number((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))==C.M_AP_OBJECT)))&&(Number(!!(Number(!(class_))||Number(class_==C.i32(C.field((C.objects+Number(C.field(mtmp,"monst","mappearance").value)*C.sizes["struct objclass"]),"objclass","oc_class").value)))))))) {
            let temp=C.stackAlloc(C.sizes["struct obj"]);
            C.copyRecord(temp,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
            (C.field(temp,"obj","otyp").value=C.i16(C.field(mtmp,"monst","mappearance").value));
            /* needed for obj_to_glyph() */
            (C.field(temp,"obj","quan").value=1n);
            (C.field(temp,"obj","ox").value=C.field(mtmp,"monst","mx").value);
            (C.field(temp,"obj","oy").value=C.field(mtmp,"monst","my").value);
            /* used for mimicking a corpse or statue */
            (C.field(temp,"obj","corpsenm").value=((Number(!!(C.field((mtmp),"monst","mextra").value&&Number((C.field(C.field((mtmp),"monst","mextra").value,"mextra","mcorpsenm").value)!=C.NON_PM))))?(C.field(C.field((mtmp),"monst","mextra").value,"mextra","mcorpsenm").value):C.PM_TENGU));
            C.map_object(temp,1);
        } else if(Number(!!(C.findgold(C.field(mtmp,"monst","minvent").value)&&(Number(!!(Number(!(class_))||Number(class_==C.COIN_CLASS))))))) {
            let gold=C.stackAlloc(C.sizes["struct obj"]);
            C.copyRecord(gold,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
            /* ensure oextra is cleared too */
            (C.field(gold,"obj","otyp").value=C.i16(C.GOLD_PIECE));
            (C.field(gold,"obj","quan").value=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),770,(C.literal("object_detect"))),C.rnd(10))):C.rnd(10)))));
            /* usually more than 1 */
            (C.field(gold,"obj","ox").value=C.field(mtmp,"monst","mx").value);
            (C.field(gold,"obj","oy").value=C.field(mtmp,"monst","my").value);
            C.map_object(gold,1);
        }
    }
    if(Number(!((Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))==C.GLYPH_OBJ_OFF)||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))||(Number(!!((Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>C.GLYPH_OBJ_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>C.GLYPH_OBJ_PILETOP_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))))||(Number(!!((Number(!!((Number(!!((Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_STATUE_MALE_OFF))&&(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_STATUE_FEM_OFF))&&(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))))||(Number(!!((Number(!!((Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_BODY_OFF))&&(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS))))))))))))))))) {
        C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        (ter_typ=C.i32(ter_typ|8));
    }
    C.variadic(14,C.literal("detect the %s of %s."),(ct?C.literal("presence"):C.literal("absence")),stuff);
    if(Number(!(ct))) C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MAP").value,(C.i8(1)));
 else browse_map(C.u32(ter_typ),C.literal("object"));
    map_redisplay();
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Used by: crystal balls, potions, fountains
 *
 * Returns 1 if nothing was detected.
 * Returns 0 if something was detected.
 */
export function monster_detect(otmp,mclass)
{
    mclass=C.i32(mclass);
    /* detecting object (if any) */
    /* monster class, 0 for all */
    let mtmp;
    let mcnt=0;
    /* Note: This used to just check fmon for a non-zero value
     * but in versions since 3.3.0 fmon can test TRUE due to the
     * presence of dmons, so we have to find at least one
     * with positive hit-points to know for sure.
     */
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
        (mcnt=C.i32((mcnt+1)));
        break;
        /* no need for full count, just 1 or more vs 0 */
    }
    if(Number(!(mcnt))) {
        if(otmp) C.strange_feeling(otmp,((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("You get the heebie jeebies."):C.literal("You feel threatened.")));
        return 1;
    } else {
        let unconstrained; let woken=(C.i8(0));
        let swallowed=C.field(C.u,"you","uswallow").value;
        /* before unconstrain_map() */
        C.cls();
        (unconstrained=unconstrain_map());
        for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) {
            if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value)))))))) continue;
            if(Number(!!(Number(!!(Number(!(mclass))||Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==mclass)))||(Number(!!(Number(C.field(mtmp,"monst","data").value==(C.mons+Number(C.PM_LONG_WORM)*C.sizes["struct permonst"]))&&Number(mclass==C.S_WORM_TAIL))))))) map_monst(mtmp,(C.i8(1)));
            if(Number(!!(Number(!!(otmp&&C.i32(C.field(otmp,"obj","cursed").value)))&&(Number(!!(C.i32(C.field((mtmp),"monst","msleeping").value)||Number(!(C.field((mtmp),"monst","mcanmove").value)))))))) {
                (C.field(mtmp,"monst","msleeping").value=(C.field(mtmp,"monst","mfrozen").value=C.u32(0)));
                (C.field(mtmp,"monst","mcanmove").value=C.u32(1));
                (woken=(C.i8(1)));
            }
        }
        if(Number(!(swallowed))) C.show_glyph(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(((Number(!!(C.field(C.u,"you","usteed").value&&C.mon_visible(C.field(C.u,"you","usteed").value))))?(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((C.field(C.u,"you","usteed").value),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((C.field(C.u,"you","usteed").value),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))||Number(!(C.field(C.flags,"flag","showrace").value)))))?C.field(C.u,"you","umonnum").value:C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)))+(((Number((((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))+(((Number(((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
        C.variadic(15,C.literal("sense the presence of monsters."));
        if(woken) C.variadic(16,C.literal("Monsters sense the presence of you."));
        if(Number(!!((Number(!!(otmp&&C.i32(C.field(otmp,"obj","blessed").value))))&&Number(!(unconstrained))))) {
            /* persistent detection--just show updated map */
            C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MAP").value,(C.i8(1)));
        } else {
            /* one-shot detection--allow player to move cursor around and
               get autodescribe feedback */
            (C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value|536870912n));
            browse_map(C.u32((32|8)),C.literal("monster of interest"));
            (C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value&C.i64((~536870912n))));
        }
        map_redisplay();
    }
    return 0;
}

export function sense_trap(trap,x,y,src_cursed)
{
    x=C.i16(x);
    y=C.i16(y);
    src_cursed=C.i32(src_cursed);
    const stackFrame=C.stackSave();
    try {
    if(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))||src_cursed))) {
        let obj=C.stackAlloc(C.sizes["struct obj"]);
        /* fake object */
        C.copyRecord(obj,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
        if(trap) {
            (C.field(obj,"obj","ox").value=C.field(trap,"trap","tx").value);
            (C.field(obj,"obj","oy").value=C.field(trap,"trap","ty").value);
        } else {
            (C.field(obj,"obj","ox").value=x);
            (C.field(obj,"obj","oy").value=y);
        }
        (C.field(obj,"obj","otyp").value=C.i16((Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))?C.GOLD_PIECE:(C.i32((C.callProc((C.functionPointer("rn2")),"int (int)",C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT))))));
        (C.field(obj,"obj","quan").value=C.i64((((Number(C.i32(C.field(obj,"obj","otyp").value)==C.GOLD_PIECE))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),879,(C.literal("sense_trap"))),C.rnd(10))):C.rnd(10))):(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_merge").value)?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),880,(C.literal("sense_trap"))),C.rnd(2))):C.rnd(2))):1)))));
        (C.field(obj,"obj","corpsenm").value=(C.callProc((C.functionPointer("rn2")),"int (int)",C.NUMMONS)));
        /* if otyp == CORPSE */
        C.map_object(obj,1);
    } else if(trap) {
        C.map_trap(trap,1);
        (C.field(trap,"trap","tseen").value=C.u32(1));
    } else {
        /*
         * OBSOLETE; this was for trapped door or trapped chest
         * but those are handled by 'if (trap) {map_trap()}' now
         * and this block of code shouldn't be reachable anymore.
         */
        (C.field(C.dummytrap,"trap","tx").value=x);
        (C.field(C.dummytrap,"trap","ty").value=y);
        (C.field(C.dummytrap,"trap","ttyp").value=C.u32(C.BEAR_TRAP));
        /* some kind of trap */
        C.map_trap(C.dummytrap,1);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* nothing found */
/* found at hero's location */
/* found at any other location */
/* check a list of objects for chest traps; return 1 if found at <ux,uy>,
   2 if found at some other spot, 3 if both, 0 otherwise; optionally
   update the map to show where such traps were found */
export function detect_obj_traps(objlist,show_them,how,ft)
{
    show_them=C.i8(show_them);
    how=C.i32(how);
    const stackFrame=C.stackSave();
    try {
    /* 1 for misleading map feedback */
    /* being called by findone() when non-Null */
    let otmp;
    let xAddress=C.stackAlloc(2); let yAddress=C.stackAlloc(2);
    let trapglyph; let result=0;
    /*
     * TODO?  Display locations of unarmed land mine and beartrap objects.
     * If so, should they be displayed as objects or as traps?
     */
    (C.field(C.dummytrap,"trap","ttyp").value=C.u32(C.TRAPPED_CHEST));
    (trapglyph=(ft?(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):C.GLYPH_NOTHING_OFF));
    for((otmp=objlist);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        (C.cell(xAddress,"short").value=(C.cell(yAddress,"short").value=C.i16(0)));
        /* lint suppression */
        if(Number(!!((Number(!!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CHEST))))&&C.i32(C.field(otmp,"obj","otrapped").value))))||(Number(C.field((otmp),"obj","cobj").value!=0))))) {
            /* !get_obj_location and !isok should both be impossible here */
            if(Number(!!(Number(!!(Number(!(C.get_obj_location(otmp,xAddress,yAddress,C.i32((2|1)))))||Number(!(C.isok(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value)))))||(Number(!!(ft&&(Number(!!(Number(C.i32(C.cell(xAddress,"short").value)!=C.i32(C.field(C.field(ft,"found_things","ft_cc").address,"nhcoord","x").value))||Number(C.i32(C.cell(yAddress,"short").value)!=C.i32(C.field(C.field(ft,"found_things","ft_cc").address,"nhcoord","y").value))))))))))) continue;
        }
        if(Number(!!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CHEST))))&&C.i32(C.field(otmp,"obj","otrapped").value)))) {
            (C.field(otmp,"obj","tknown").value=C.u32(1));
            C.observe_object(otmp);
            (result=C.i32(result|((Number(!!(Number(C.i32((C.cell(xAddress,"short").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.cell(yAddress,"short").value))==C.i32(C.field(C.u,"you","uy").value)))))?1:2)));
            if(ft) {
                C.flash_glyph_at(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,trapglyph,6);
            }
            if(show_them) {
                ((C.field(C.dummytrap,"trap","tx").value=C.cell(xAddress,"short").value),(C.field(C.dummytrap,"trap","ty").value=C.cell(yAddress,"short").value));
                sense_trap(C.dummytrap,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,how);
            }
            if(ft) {
                foundone(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value,trapglyph);
                ((C.field(ft,"found_things","num_traps").value=C.u8((C.field(ft,"found_things","num_traps").value+1)))-1);
            }
        }
        if((Number(C.field((otmp),"obj","cobj").value!=0))) (result=C.i32(result|detect_obj_traps(C.field(otmp,"obj","cobj").value,show_them,how,ft)));
    }
    return result;
    } finally {C.stackRestore(stackFrame); }
}

export function display_trap_map(cursed_src)
{
    cursed_src=C.i32(cursed_src);
    const stackFrame=C.stackSave();
    try {
    let mon;
    let ttmp;
    let door; let glyph; let ter_typ=C.i32(C.u32((32|((cursed_src?4:2)))));
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    C.cls();
    unconstrain_map();
    /* show chest traps first, first buried chests then floor chests, so
       that subsequent floor trap display will override if both types are
       present at the same location */
    detect_obj_traps(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value,(C.i8(1)),cursed_src,0);
    detect_obj_traps(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value,(C.i8(1)),cursed_src,0);
    for((mon=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mon;(mon=C.field(mon,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mon),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mon,"monst","isgd").value)&&Number(!(C.field(mon,"monst","mx").value)))))))) continue;
        detect_obj_traps(C.field(mon,"monst","minvent").value,(C.i8(1)),cursed_src,0);
    }
    detect_obj_traps(C.field(C.gi,"instance_globals_i","invent").value,(C.i8(1)),cursed_src,0);
    for((ttmp=C.field(C.gf,"instance_globals_f","ftrap").value);ttmp;(ttmp=C.field(ttmp,"trap","ntrap").value)) sense_trap(ttmp,C.i16(0),C.i16(0),cursed_src);

    (C.field(C.dummytrap,"trap","ttyp").value=C.u32(C.TRAPPED_DOOR));
    for((door=0);Number(door<C.field(C.gd,"instance_globals_d","doorindex").value);((door=C.i32((door+1)))-1)) {
        C.copyRecord(cc,(C.field(C.svd,"instance_globals_saved_d","doors").value+Number(door)*C.sizes["struct nhcoord"]),C.sizes["struct nhcoord"]);
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(cc,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(cc,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)) continue;
        /* can't be trapped; see above */
        if(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(cc,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(cc,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","flags").value)&16))) {
            ((C.field(C.dummytrap,"trap","tx").value=C.field(cc,"nhcoord","x").value),(C.field(C.dummytrap,"trap","ty").value=C.field(cc,"nhcoord","y").value));
            sense_trap(C.dummytrap,C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,cursed_src);
        }
    }
    /* redisplay hero unless sense_trap() revealed something at <ux,uy> */
    (glyph=C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
    if(Number(!((Number(!!((Number(!!(Number((glyph)>=((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave))))))))&&Number((glyph)<(C.i32((((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave)))))))+(C.i32((C.TRAPNUM-1))))))))))||(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number((glyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((glyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))||(Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))))||(Number(!!((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_BODY_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS)))))))))))))))))))) {
        C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        (ter_typ=C.i32(ter_typ|8));
        /* for autodescribe at <u.ux,u.uy> */
    }
    C.variadic(17,C.literal("%s."),(cursed_src?C.literal("very greedy"):C.literal("entrapped")));
    browse_map(C.u32(ter_typ),(cursed_src?C.literal("gold"):C.literal("trap of interest")));
    map_redisplay();
    } finally {C.stackRestore(stackFrame); }
}

/* the detections are pulled out so they can
 * also be used in the crystal ball routine
 * returns 1 if nothing was detected
 * returns 0 if something was detected
 */
export function trap_detect(sobj)
{
    const stackFrame=C.stackSave();
    try {
    /* Null if crystal ball, scroll if gold detection */
    let ttmp;
    let mon;
    let door; let tr;
    let cursed_src=Number(!!(sobj&&C.i32(C.field(sobj,"obj","cursed").value)));
    let found=(C.i8(0));
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    if(C.field(C.u,"you","usteed").value) ((C.field(C.field(C.u,"you","usteed").value,"monst","mx").value=C.field(C.u,"you","ux").value),(C.field(C.field(C.u,"you","usteed").value,"monst","my").value=C.field(C.u,"you","uy").value));
    /* floor/ceiling traps */
    for((ttmp=C.field(C.gf,"instance_globals_f","ftrap").value);ttmp;(ttmp=C.field(ttmp,"trap","ntrap").value)) {
        if(Number(!!(Number(C.i32(C.field(ttmp,"trap","tx").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(ttmp,"trap","ty").value)!=C.i32(C.field(C.u,"you","uy").value))))) {
            display_trap_map(cursed_src);
            return 0;
        }
        (found=(C.i8(1)));
    }
    /* chest traps (might be buried or carried) */
    if(Number(((tr=detect_obj_traps(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value,(C.i8(0)),0,0)))!=0)) {
        if(C.i32((tr&2))) {
            display_trap_map(cursed_src);
            return 0;
        }
        (found=(C.i8(1)));
    }
    if(Number(((tr=detect_obj_traps(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value,(C.i8(0)),0,0)))!=0)) {
        if(C.i32((tr&2))) {
            display_trap_map(cursed_src);
            return 0;
        }
        (found=(C.i8(1)));
    }
    for((mon=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mon;(mon=C.field(mon,"monst","nmon").value)) {
        if(Number(!!((Number(C.field((mon),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mon,"monst","isgd").value)&&Number(!(C.field(mon,"monst","mx").value)))))))) continue;
        if(Number(((tr=detect_obj_traps(C.field(mon,"monst","minvent").value,(C.i8(0)),0,0)))!=0)) {
            if(C.i32((tr&2))) {
                display_trap_map(cursed_src);
                return 0;
            }
            (found=(C.i8(1)));
        }
    }
    if(Number(detect_obj_traps(C.field(C.gi,"instance_globals_i","invent").value,(C.i8(0)),0,0)!=0)) (found=(C.i8(1)));
    /* door traps */
    for((door=0);Number(door<C.field(C.gd,"instance_globals_d","doorindex").value);((door=C.i32((door+1)))-1)) {
        C.copyRecord(cc,(C.field(C.svd,"instance_globals_saved_d","doors").value+Number(door)*C.sizes["struct nhcoord"]),C.sizes["struct nhcoord"]);
        /* levl[][].doormask and .wall_info both overlay levl[][].flags;
           the bit in doormask for D_TRAPPED is also a bit in wall_info;
           secret doors use wall_info so can't be marked as trapped */
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(cc,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(cc,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)) continue;
        if(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(cc,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(cc,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","flags").value)&16))) {
            if(Number(!!(Number(C.i32(C.field(cc,"nhcoord","x").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(cc,"nhcoord","y").value)!=C.i32(C.field(C.u,"you","uy").value))))) {
                display_trap_map(cursed_src);
                return 0;
            }
            (found=(C.i8(1)));
        }
    }
    if(Number(!(found))) {
        let buf=C.stackAlloc((1*256));
        C.variadic(18,buf,C.literal("Your %s stop itching."),C.makeplural(C.body_part(C.TOE)));
        C.strange_feeling(sobj,buf);
        return 1;
    }
    /* traps exist, but only under me - no separate display required */
    C.variadic(19,C.literal("%s itch."),C.makeplural(C.body_part(C.TOE)));
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function furniture_detect()
{
    let mon;
    let x; let y;
    let glyph; let sym; let found=0; let revealed=0;
    unconstrain_map();
    for((y=C.i16(0));Number(C.i32(y)<21);(y=C.i16((y+1)))) for((x=C.i16(1));Number(C.i32(x)<80);(x=C.i16((x+1)))) {
        (glyph=C.glyph_at(x,y));
        (sym=C.glyph_to_cmap(glyph));
        if((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.STAIRS)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.ALTAR))))) {
            (found=C.i32((found+1)));
            C.magic_map_background(x,y,1);
        } else if((Number(!!(Number((sym)>=C.S_upstair)&&Number((sym)<=C.S_fountain))))) {
            (found=C.i32((found+1)));
            if(Number(!!(Number(((mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&Number((C.i32((C.i32(C.field((mon),"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE)))) C.seemimic(mon);
            if(Number(!!(Number(!(mon))||Number(!((Number(!!(C.canseemon(mon)||C.sensemon(mon))))))))) C.map_invisible(x,y);
        }
        if(Number(C.glyph_at(x,y)!=glyph)) (revealed=C.i32((revealed+1)));
    }

    if(Number(!(found))) C.variadic(20,C.literal("seems to be nothing of interest on this level."));
 else if(Number(!(revealed))) C.variadic(21,C.literal("map already shows all relevant locations."));
    /* [what about clipped map with points of interest outside of the
            currently shown area?] */
    if(Number(!(revealed))) C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MAP").value,(C.i8(1)));
 else browse_map(C.u32((C.u32((C.u32((C.u32((32|1))|2))|4))|8)),C.literal("location"));
    /* we need to browse all types because we haven't redrawn the map
          * with only points of interest */
    map_redisplay();
    return 0;
}

/* way back in 3.0plN and/or 2.x, you could use a crystal ball to find out
   where the wizard was relative to your current location; that was when the
   Wizard guarded the Amulet and was located on a random maze level, and you
   were expected to level teleport deep into Hell and hunt for him while
   working your way up; this isn't of much use anymore */
export function level_distance(where)
{
    let ll=C.i8(C.i32((C.i32(C.depth(C.field(C.u,"you","uz").address))-C.i32(C.depth(where)))));
    let indun=C.i8((Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(where,"d_level","dnum").value))));
    let res=C.literal("");
    /* always replaced by some other non-Null value */
    if(Number(C.i32(ll)<0)) {
        if(Number(C.i32(ll)<(C.i32((C.i32((-8))-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1149,(C.literal("level_distance"))),C.rn2(3))):C.rn2(3)))))))) if(Number(!(indun))) (res=C.literal("far away"));
 else (res=C.literal("far below"));
 else if(Number(C.i32(ll)<C.i32((-1)))) if(Number(!(indun))) (res=C.literal("away below you"));
 else (res=C.literal("below you"));
 else if(Number(!(indun))) (res=C.literal("in the distance"));
 else (res=C.literal("just below"));
    } else if(Number(C.i32(ll)>0)) {
        if(Number(C.i32(ll)>(C.i32((8+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1164,(C.literal("level_distance"))),C.rn2(3))):C.rn2(3)))))))) if(Number(!(indun))) (res=C.literal("far away"));
 else (res=C.literal("far above"));
 else if(Number(C.i32(ll)>1)) if(Number(!(indun))) (res=C.literal("away above you"));
 else (res=C.literal("above you"));
 else if(Number(!(indun))) (res=C.literal("in the distance"));
 else (res=C.literal("just above"));
    } else {
        /* l1 == 0 */
        if(Number(!(indun))) (res=C.literal("in the distance"));
 else (res=C.literal("near you"));
    }
    return res;
}

/*
     * This could be made a lot more useful.  Especially now that
     * amnesia no longer causes levels to be forgotten.  Perhaps a
     * menu, and it ought to include the entrance to Vlad's Tower,
     * one of the few things that requires active searching/mapping
     * to find.  And once the Wizard is in play, he is easy for the
     * game to locate but not necessarily for the player.
     */
export const level_detects=C=>[
    {what:C.literal("Delphi"),where:C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address},
    {what:C.literal("Medusa's lair"),where:C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address},
    {what:C.literal("a castle"),where:C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address},
    {what:C.literal("the Wizard of Yendor's tower"),where:C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address},
];
export function use_crystal_ball(optr)
{
    let ch;
    let oops;
    let obj=C.cell(optr,"struct obj *").value;
    let charged=C.i8((Number(C.i32(C.field(obj,"obj","spe").value)>0)));
    implode: {
    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) {
        C.variadic(22,C.literal("Too bad you can't see %s."),C.the(C.xname(obj)));
        return;
    }
    (oops=(C.i32(C.is_quest_artifact(obj))?8:(C.i32(C.field(obj,"obj","blessed").value)?16:20)));
    if(Number(!!(C.i32(charged)&&(Number(!!(C.i32(C.field(obj,"obj","cursed").value)||Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1218,(C.literal("use_crystal_ball"))),C.rnd(oops))):C.rnd(oops)))>C.i32((C.acurr(C.A_INT)))))))))) {
        let impair=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1219,(C.literal("use_crystal_ball"))),C.rnd(C.i32((100-C.i32((3*C.i32((C.acurr(C.A_INT)))))))))):C.rnd(C.i32((100-C.i32((3*C.i32((C.acurr(C.A_INT)))))))))));
        switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1221,(C.literal("use_crystal_ball"))),C.rnd(((Number(!!(C.i32(C.field(obj,"obj","oartifact").value)||C.i32(C.field(obj,"obj","blessed").value))))?4:5)))):C.rnd(((Number(!!(C.i32(C.field(obj,"obj","oartifact").value)||C.i32(C.field(obj,"obj","blessed").value))))?4:5))))) {
            case (1):
                C.variadic(23,C.literal("%s too much to comprehend!"),C.Tobjnam(obj,C.literal("are")));
            break;
            case (2):
                C.variadic(24,C.literal("%s you!"),C.Tobjnam(obj,C.literal("confuse")));
            C.make_confused(C.i64(((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))+impair)),(C.i8(0)));
            break;
            case (3):
                if(Number(!(C.resists_blnd(C.field(C.gy,"instance_globals_y","youmonst").address)))) {
                    C.variadic(25,C.literal("%s your vision!"),C.Tobjnam(obj,C.literal("damage")));
                    C.make_blinded(C.i64(((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))+impair)),(C.i8(0)));
                    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(26,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_vision_clears").value);
                } else {
                    C.variadic(27,C.literal("%s your vision."),C.Tobjnam(obj,C.literal("assault")));
                    C.variadic(28,C.literal("are unaffected!"));
                }
            break;
            case (4):
                C.variadic(29,C.literal("%s your mind!"),C.Tobjnam(obj,C.literal("zap")));
            C.make_hallucinated(C.i64(((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))+impair)),(C.i8(0)),0n);
            break;
            case (5):
                C.variadic(30,C.literal("%s!"),C.Tobjnam(obj,C.literal("explode")));
            C.useup(obj);
            (C.cell(optr,"struct obj *").value=(obj=0));
            /* it's gone */
            /* physical damage cause by the shards and force */
            C.losehp(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","extrinsic").value))))?(C.i32(Math.trunc(((C.i32(((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1250,(C.literal("use_crystal_ball"))),C.rnd(30))):C.rnd(30))))+1)))/2)))):(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1250,(C.literal("use_crystal_ball"))),C.rnd(30))):C.rnd(30)))))),C.literal("exploding crystal ball"),C.i8(0));
            break;
        }
        if(obj) C.consume_obj_charge(obj,(C.i8(1)));
        return;
    }
    if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) {
        C.nomul(C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1260,(C.literal("use_crystal_ball"))),C.rnd((C.i32(charged)?4:2)))):C.rnd((C.i32(charged)?4:2)))))));
        (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("gazing into a Magic 8-Ball (tm)"));
        (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal(""));
        if(Number(!(charged))) {
            C.variadic(31,C.literal("All you see is funky %s haze."),C.hcolor(0));
            if(Number(C.i32(C.field(obj,"obj","spe").value)<0)) break implode;
            /* destroy it when it has been cancelled */
        } else {
            switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1269,(C.literal("use_crystal_ball"))),C.rnd(6))):C.rnd(6)))) {
                case (1):
                    C.variadic(32,C.literal("grok some groovy globs of incandescent lava."));
                break;
                case (2):
                    C.variadic(33,C.literal("Whoa!  Psychedelic colors, %s!"),(Number(C.poly_gender()==1)?C.literal("babe"):C.literal("dude")));
                break;
                case (3):
                    C.variadic(34,C.literal("crystal pulses with sinister %s light!"),C.hcolor(0));
                break;
                case (4):
                    C.variadic(35,C.literal("goldfish swimming above fluorescent rocks."));
                break;
                case (5):
                    C.variadic(36,C.literal("tiny snowflakes spinning around a miniature farmhouse."));
                break;
                default:
                    C.variadic(37,C.literal("Oh wow... like a kaleidoscope!"));
                break;
            }
            C.consume_obj_charge(obj,(C.i8(1)));
        }
        return;
    }
    /* read a single character */
    if(C.field(C.flags,"flag","verbose").value) C.variadic(38,C.literal("may look for an object, monster, or special map symbol."));
    (ch=C.yn_function(C.literal("What do you look for?"),0,C.i8(0),(C.i8(1))));
    /* Don't filter out ' ' here; it has a use */
    if(Number(!!((Number(C.i32(ch)!=C.i32(C.field((C.def_monsyms+Number(C.S_GHOST)*C.sizes["struct class_sym"]),"class_sym","sym").value)))&&C.strchr(C.quitchars,C.i32(ch))))) {
        if(C.field(C.flags,"flag","verbose").value) C.variadic(39,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
        return;
    }
    /* Possible extension:
     *  If ch=='?', ask whether player wants to find scrolls or is asking
     *  for help in using the crystal ball.
     */
    C.variadic(40,C.literal("peer into %s..."),C.the(C.xname(obj)));
    C.nomul(C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1313,(C.literal("use_crystal_ball"))),C.rnd((C.i32(charged)?10:2)))):C.rnd((C.i32(charged)?10:2)))))));
    (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("gazing into a crystal ball"));
    (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal(""));
    if(Number(!(charged))) {
        C.variadic(41,C.literal("vision is unclear."));
        if(Number(C.i32(C.field(obj,"obj","spe").value)<0)) break implode;
        /* destroy ball if used after being cancelled */
        /* no damage to hero but 'multi' has a small negative value */
        /* it's gone */
    } else {
        let class_; let i;
        let ret=0;
        C.discover_object((C.CRYSTAL_BALL),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.consume_obj_charge(obj,(C.i8(1)));
        /* special case: accept ']' as synonym for mimic
         * we have to do this before the def_char_to_objclass check
         */
        if(Number(C.i32(ch)==C.DEF_MIMIC_DEF)) (ch=C.i8(C.DEF_MIMIC));
        /* checking furniture before objects allows '_' to find altars
           (along with other furniture) instead of finding iron chains */
        if(Number(C.def_char_is_furniture(ch)>=0)) {
            (ret=furniture_detect());
        } else if(Number(((class_=C.def_char_to_objclass(ch)))!=C.MAXOCLASSES)) {
            (ret=object_detect(0,class_));
        } else if(Number(((class_=C.def_char_to_monclass(ch)))!=C.MAXMCLASSES)) {
            (ret=monster_detect(0,class_));
        } else if(Number(!!(C.i32(C.cell((C.field(C.gs,"instance_globals_s","showsyms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value)&&(Number(C.i32(ch)==C.i32(C.cell((C.field(C.gs,"instance_globals_s","showsyms").address+Number(C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value)))))) {
            (ret=object_detect(0,C.ROCK_CLASS));
        } else if(Number(C.i32(ch)==94)) {
            (ret=trap_detect(0));
        } else {
            (i=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1354,(C.literal("use_crystal_ball"))),C.rn2(C.i32((C.u64((BigInt((C.sizes["struct crystalballlevels"]*4))/BigInt(C.sizes["struct crystalballlevels"])))))))):C.rn2(C.i32((C.u64((BigInt((C.sizes["struct crystalballlevels"]*4))/BigInt(C.sizes["struct crystalballlevels"])))))))));
            C.variadic(42,C.literal("%s, %s."),C.level_detects[Number(i)].what,level_distance(C.level_detects[Number(i)].where));
            (ret=0);
        }
        if(ret) {
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1361,(C.literal("use_crystal_ball"))),C.rn2(100))):C.rn2(100)))))) C.variadic(43,C.literal("the Wizard of Yendor gazing out at you."));
 else C.variadic(44,C.literal("vision is unclear."));
            /* make them nervous */
        }
    }
    return;
    }
    C.variadic(45,C.literal("%s!"),C.Tobjnam(obj,C.literal("implode")));
    C.useup(obj);
    (C.cell(optr,"struct obj *").value=(obj=0));
    return;
}

/* used by magic mapping, clairvoyance, and wand of probing */
export function show_map_spot(x,y,cnf)
{
    x=C.i16(x);
    y=C.i16(y);
    cnf=C.i8(cnf);
    let lev;
    let t;
    let ep;
    let oldglyph;
    if(Number(!!(C.i32(cnf)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),1379,(C.literal("show_map_spot"))),C.rn2(7))):C.rn2(7)))))) return;
    (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
    (C.field(lev,"rm","seenv").value=(C.u8(255)));
    /* Secret corridors are found, but not secret doors. */
    if(Number(C.i32(C.field(lev,"rm","typ").value)==C.SCORR)) {
        (C.field(lev,"rm","typ").value=C.i8(C.CORR));
        C.unblock_point(C.i32(x),C.i32(y));
    }
    /*
     * Force the real background, then if it's not furniture and there's
     * a known trap there, display the trap, else if there was an object
     * shown there, redisplay the object.  So during mapping, furniture
     * takes precedence over traps, which take precedence over objects,
     * opposite to how normal vision behaves.
     */
    (oldglyph=C.glyph_at(x,y));
    if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value) {
        C.magic_map_background(x,y,0);
        C.newsym(x,y);
        /* show it, if not blocked */
    } else {
        C.magic_map_background(x,y,1);
        /* display it */
    }
    if(Number(!((Number(!!(Number(C.i32((C.field(lev,"rm","typ").value))>=C.STAIRS)&&Number(C.i32((C.field(lev,"rm","typ").value))<=C.ALTAR))))))) {
        if(Number(!!(Number(((t=C.t_at(x,y)))!=0)&&C.i32(C.field(t,"trap","tseen").value)))) {
            C.map_trap(t,1);
        } else if(Number(!!(Number(((ep=C.engr_at(x,y)))!=0)&&Number(!(cnf))))) {
            C.map_engraving(ep,1);
        } else if(Number(!!((Number(!!(Number((oldglyph)>=((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave))))))))&&Number((oldglyph)<(C.i32((((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave)))))))+(C.i32((C.TRAPNUM-1))))))))))||(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number((oldglyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((oldglyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((oldglyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((oldglyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((oldglyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((oldglyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))||(Number(!!((Number(!!(Number((oldglyph)>C.GLYPH_OBJ_OFF)&&Number((oldglyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((oldglyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((oldglyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))))||(Number(!!((Number(!!((Number(!!((Number((oldglyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((oldglyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((oldglyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((oldglyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((oldglyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((oldglyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((oldglyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((oldglyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))))||(Number(!!((Number(!!((Number((oldglyph)>=C.GLYPH_BODY_OFF))&&(Number((oldglyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((oldglyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((oldglyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS))))))))))))))))) {
            C.show_glyph(x,y,oldglyph);
            if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value) (C.field(lev,"rm","glyph").value=oldglyph);
        }
    }
    /* possibly update #overview */
    if(Number(!!(Number(!(cnf))&&Number(C.i32(C.field(lev,"rm","roomno").value)>=3)))) C.room_discovered(C.i32((C.i32(C.field(lev,"rm","roomno").value)-3)));
}

export function do_mapping()
{
    let zx; let zy;
    let unconstrained;
    (unconstrained=unconstrain_map());
    for((zx=1);Number(zx<80);((zx=C.i32((zx+1)))-1)) for((zy=0);Number(zy<21);((zy=C.i32((zy+1)))-1)) show_map_spot(C.i16(zx),C.i16(zy),C.i8(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value));


    if(Number(!!(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value))||C.i32(unconstrained)))) {
        C.flush_screen(1);
        /* flush temp screen */
        /* browse_map() instead of display_nhwindow(WIN_MAP, TRUE) */
        browse_map(C.u32((C.u32((C.u32((32|1))|2))|4)),C.literal("anything of interest"));
        map_redisplay();
        /* calls reconstrain_map() and docrt() */
    } else {
        /* we only get here when unconstrained is False, so reconstrain_map
           will be a no-op; call it anyway */
        reconstrain_map();
    }
    C.exercise(C.A_WIS,(C.i8(1)));
}

/* clairvoyance */
export function do_vicinity_map(sobj)
{
    /* scroll--actually fake spellbook--object */
    let zx; let zy;
    let mtmp;
    let otmp;
    let save_EDetect_mons;
    let save_viz_uyux;
    let unconstrained; let refresh=(C.i8(0)); let mdetected=(C.i8(0)); let odetected=(C.i8(0)); let extended=C.i8((Number(!!(sobj&&(Number(!!(C.i32(C.field(sobj,"obj","blessed").value)||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CLAIRVOYANT)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.CLAIRVOYANT)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.CLAIRVOYANT)*C.sizes["struct prop"]),"prop","blocked").value)))))))))))); let random_farsight=C.i8(Number(!(sobj)));
    /* fake spellbook 'sobj' implies hero has cast the spell;
               when book is blessed, casting is skilled or expert level;
               if already clairvoyant, non-skilled spell acts like skilled */
    let newglyph; let oldglyph; let lo_y=(((Number(C.i32((C.i32(C.field(C.u,"you","uy").value)-5))<0))?0:C.i32((C.i32(C.field(C.u,"you","uy").value)-5)))); let hi_y=(((Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+6))>=21))?C.i32((21-1)):C.i32((C.i32(C.field(C.u,"you","uy").value)+6)))); let lo_x=(((Number(C.i32((C.i32(C.field(C.u,"you","ux").value)-9))<1))?1:C.i32((C.i32(C.field(C.u,"you","ux").value)-9)))); let hi_x=(((Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+10))>=80))?C.i32((80-1)):C.i32((C.i32(C.field(C.u,"you","ux").value)+10)))); let ter_typ=C.i32(C.u32((C.u32((C.u32((32|1))|2))|4)));
    /* avoid column 0 */
    /*
     * 3.6.0 attempted to emphasize terrain over transient map
     * properties (monsters and objects) but that led to problems.
     * Notably, known trap would be displayed instead of a monster
     * on or in it and then the display remained that way after the
     * clairvoyant snapshot finished.  That could have been fixed by
     * issuing --More-- and then regular vision update, but we want
     * to avoid that when having a clairvoyant episode every N turns
     * (from donating to a temple priest or by carrying the Amulet).
     * Unlike when casting the spell, it is much too intrusive when
     * in the midst of walking around or combatting monsters.
     *
     * As of 3.6.2, show terrain, then object, then monster like regular
     * map updating, except in this case the map locations get marked
     * as seen from every direction rather than just from direction of
     * hero.  Skilled spell marks revealed objects as 'seen up close'
     * (but for piles, only the top item) and shows monsters as if
     * detected.  Non-skilled and timed clairvoyance reveals non-visible
     * monsters as 'remembered, unseen'.
     */
    /* if hero is engulfed, show engulfer at <u.ux,u.uy> */
    (save_viz_uyux=C.i8(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.u,"you","uy").value)*8),"unsigned char *").value+Number(C.field(C.u,"you","ux").value)*1),"unsigned char").value));
    if(C.field(C.u,"you","uswallow").value) (C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.u,"you","uy").value)*8),"unsigned char *").value+Number(C.field(C.u,"you","ux").value)*1),"unsigned char").value=C.u8(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.u,"you","uy").value)*8),"unsigned char *").value+Number(C.field(C.u,"you","ux").value)*1),"unsigned char").value|2));
    /* <x,y> are reversed, [y][x] */
    (save_EDetect_mons=C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value);
    /* for skilled spell, getpos() scanning of the map will display all
       monsters within range; otherwise, "unseen creature" will be shown */
    (C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value|536870912n));
    (unconstrained=unconstrain_map());
    for((zx=lo_x);Number(zx<=hi_x);((zx=C.i32((zx+1)))-1)) for((zy=lo_y);Number(zy<=hi_y);((zy=C.i32((zy+1)))-1)) {
        (oldglyph=C.glyph_at(C.i16(zx),C.i16(zy)));
        /* this will remove 'remembered, unseen mon' (and objects) */
        show_map_spot(C.i16(zx),C.i16(zy),C.i8(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value));
        /* if there are any objects here, see the top one */
        if((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(zx)*(8*21))+Number(zy)*8),"struct obj *").value!=0))) {
            /* not vobj_at(); this is not vision-based access;
                   unlike object detection, we don't notice buried items */
            (otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(zx)*(8*21))+Number(zy)*8),"struct obj *").value);
            if(extended) C.observe_object(otmp);
            C.map_object(otmp,C.i32((C.i8(1))));
            (newglyph=C.glyph_at(C.i16(zx),C.i16(zy)));
            /* if otmp is underwater, we'll need to redisplay the water */
            if(Number(!!(Number(newglyph!=oldglyph)&&(Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(C.i16(zx),C.i16(zy)))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(zx)*(C.sizes["struct rm"]*21))+Number(zy)*C.sizes["struct rm"]),"rm","typ").value)==C.LAVAPOOL))))||(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(zx)*(C.sizes["struct rm"]*21))+Number(zy)*C.sizes["struct rm"]),"rm","typ").value)==C.LAVAWALL)))))))) (odetected=(C.i8(1)));
        }
        /* if there is a monster here, see or detect it,
               possibly as "remembered, unseen monster" */
        if(Number(!!(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(zx)*(8*21))+Number(zy)*8),"struct monst *").value)))!=0)&&Number(C.i32(C.field(mtmp,"monst","mx").value)==zx)))&&Number(C.i32(C.field(mtmp,"monst","my").value)==zy)))) {
            /* skip worm tails */
            /* if we're going to offer browse_map()/getpos() scanning of
                   the map and we're not doing extended/blessed clairvoyance
                   (hence must be swallowed or underwater), show "unseen
                   creature" unless map already displayed a monster here */
            if(Number(!!(Number(!!(Number(!!((Number(!!(C.i32(unconstrained)||Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value)))))&&Number(!(extended))))&&(Number(!!(Number(zx!=C.i32(C.field(C.u,"you","ux").value))||Number(zy!=C.i32(C.field(C.u,"you","uy").value)))))))&&Number(!((Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_MON_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_MON_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_PET_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_PET_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))))))))))))) C.map_invisible(C.i16(zx),C.i16(zy));
 else map_monst(mtmp,(C.i8(0)));
            (newglyph=C.glyph_at(C.i16(zx),C.i16(zy)));
            if(Number(!!(Number(!!(C.i32(extended)&&Number(newglyph!=oldglyph)))&&Number(!((Number((newglyph)==C.GLYPH_INVIS_OFF))))))) (mdetected=(C.i8(1)));
        }
    }

    /* when this instance of clairvoyance is random (see allmain()) and
       the only reason to browse the map is that previously undetected
       monster(s) or object(s) have been revealed, player can prevent
       the you-sense-your-surroundings message and browse operation from
       happening by setting 'quick_farsight' option; for clairvoyance
       spell, that option is ignored because the message and the pause
       for map browsing isn't as intrusive in that circumstance */
    if(Number(!!(C.i32(random_farsight)&&C.i32(C.field(C.flags,"flag","quick_farsight").value)))) (mdetected=(odetected=(C.i8(0))));
    if(Number(!!(Number(!!(Number(!!(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value))||C.i32(unconstrained)))||C.i32(mdetected)))||C.i32(odetected)))) {
        C.flush_screen(1);
        /* flush temp screen */
        /* the getpos() prompt from browse_map() is only shown when
           flags.verbose is set, but make this unconditional so that
           not-verbose users become aware of the prompting situation */
        C.variadic(46,C.literal("sense your surroundings."));
        if(Number(!!(C.i32(extended)||(Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_MON_MALE_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_MON_FEM_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_PET_MALE_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_PET_FEM_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_DETECT_MALE_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))>=C.GLYPH_DETECT_FEM_OFF)&&Number((C.glyph_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))))))))))) (ter_typ=C.i32(ter_typ|8));
        browse_map(C.u32(ter_typ),C.literal("anything of interest"));
        (refresh=(C.i8(1)));
    }
    reconstrain_map();
    (C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value=save_EDetect_mons);
    (C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.u,"you","uy").value)*8),"unsigned char *").value+Number(C.field(C.u,"you","ux").value)*1),"unsigned char").value=C.u8(save_viz_uyux));
    /* replace monsters with remembered,unseen monster, then run
       see_monsters() to update visible ones and warned-of ones */
    for((zx=lo_x);Number(zx<=hi_x);((zx=C.i32((zx+1)))-1)) for((zy=lo_y);Number(zy<=hi_y);((zy=C.i32((zy+1)))-1)) {
        if((Number(!!(Number((zx)==C.i32(C.field(C.u,"you","ux").value))&&Number((zy)==C.i32(C.field(C.u,"you","uy").value)))))) continue;
        (newglyph=C.glyph_at(C.i16(zx),C.i16(zy)));
        if(Number(!!((Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((newglyph)>=C.GLYPH_MON_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((newglyph)>=C.GLYPH_MON_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((newglyph)>=C.GLYPH_PET_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((newglyph)>=C.GLYPH_PET_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((newglyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((newglyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((newglyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((newglyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))))))))&&Number((((Number(!!(Number((newglyph)>=C.GLYPH_MON_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_MON_FEM_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_MON_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_MON_MALE_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_PET_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_PET_FEM_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_PET_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_PET_MALE_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_DETECT_FEM_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_DETECT_MALE_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_RIDDEN_FEM_OFF))):((Number(!!(Number((newglyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((newglyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))?(C.i32(((newglyph)-C.GLYPH_RIDDEN_MALE_OFF))):C.NUMMONS)))))))))!=C.PM_LONG_WORM_TAIL)))) {
            /* map_invisible() was unconditional here but that made
                   remembered objects be forgotten for the case where a
                   monster is immediately redrawn by see_monsters() */
            if(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(zx)*(8*21))+Number(zy)*8),"struct monst *").value)))==0)||Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))))) C.map_invisible(C.i16(zx),C.i16(zy));
        }
    }

    C.see_monsters();
    if(refresh) C.docrt();
}

/* convert a secret door into a normal door; it might be trapped */
export function cvt_sdoor_to_door(lev)
{
    let newmask=C.i32((C.i32(C.field(lev,"rm","flags").value)&C.i32((~7))));
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))) {
        /* rogue didn't have doors, only doorways */
        (newmask=0);
    } else {
        /* newly exposed door is closed */
        if(Number(!((C.i32((newmask&8)))))) (newmask=C.i32(newmask|4));
    }
    (C.field(lev,"rm","typ").value=C.i8(C.DOOR));
    (C.field(lev,"rm","flags").value=C.u32(newmask));
    (C.field(lev,"rm","candig").value=C.u32(0));
    /* clears 'candig' */
}

/* update the map for something which has just been found by wand of secret
   door detection or wizard mode ^E; will be called multiple times during a
   single operation if multiple things of interest are discovered */
export function foundone(zx,zy,glyph)
{
    zx=C.i16(zx);
    zy=C.i16(zy);
    glyph=C.i32(glyph);
    if(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_CMAP_STONE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_CMAP_C_OFF+(C.i32(((C.i32((C.S_goodpos-C.S_digbeam)))+1))))))))))||(Number((glyph)==C.GLYPH_UNEXPLORED_OFF))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(zx)*(C.sizes["struct rm"]*21))+Number(zy)*C.sizes["struct rm"]),"rm","seenv").value=(C.u8(255)));
{
        let save_viz=C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(zy)*8),"unsigned char *").value+Number(zx)*1),"unsigned char").value;
        if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) (C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(zy)*8),"unsigned char *").value+Number(zx)*1),"unsigned char").value=C.u8(C.i32((1|2))));
        C.newsym(zx,zy);
        (C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(zy)*8),"unsigned char *").value+Number(zx)*1),"unsigned char").value=save_viz);
    }    /*
     * This works [for non-monsters at present] but flash_glyph_at()
     * seems preferrable because the tmp_at() variation requires that
     * the player respond to --More-- at the end, the flash_glyph
     * variation doesn't.
     */
}

/* find something at one location; this should find all somethings there
   since it is used for magical detection rather than physical searching */
export function findone(zx,zy,whatfound)
{
    zx=C.i16(zx);
    zy=C.i16(zy);
    let lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(zx)*(C.sizes["struct rm"]*21))+Number(zy)*C.sizes["struct rm"]);
    let ttmp=C.t_at(zx,zy);
    let mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(zx)*(8*21))+Number(zy)*8),"struct monst *").value);
    let found_p=whatfound;
    if(Number(!!(mtmp&&(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(!!(C.i32(C.field(mtmp,"monst","isgd").value)&&Number(!(C.field(mtmp,"monst","mx").value))))))))))) (mtmp=(0));
    (C.field(C.field(found_p,"found_things","ft_cc").address,"nhcoord","x").value=zx);
    /* needed by detect_obj_traps() */
    (C.field(C.field(found_p,"found_things","ft_cc").address,"nhcoord","y").value=zy);
    if(Number(C.i32(C.field(lev,"rm","typ").value)==C.SDOOR)) {
        let sym=C.u8((C.i32(C.field(lev,"rm","horizontal").value)?C.S_hcdoor:C.S_vcdoor));
        C.flash_glyph_at(zx,zy,(((Number(C.i32((sym))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(C.i32((sym))<=C.S_trwall))?(C.i32((C.i32((C.i32((sym))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(C.i32((sym))<C.S_altar))?(C.i32(((C.i32((C.i32((sym))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(C.i32((sym))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(C.i32((sym))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((C.i32((sym))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(C.i32((sym))<=C.S_goodpos))?(C.i32(((C.i32((C.i32((sym))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))),6);
        cvt_sdoor_to_door(lev);
        /* set lev->typ = DOOR */
        C.recalc_block_point(zx,zy);
        C.magic_map_background(zx,zy,0);
        foundone(zx,zy,C.back_to_glyph(zx,zy));
        ((C.field(found_p,"found_things","num_sdoors").value=C.u8((C.field(found_p,"found_things","num_sdoors").value+1)))-1);
    } else if(Number(C.i32(C.field(lev,"rm","typ").value)==C.SCORR)) {
        C.flash_glyph_at(zx,zy,(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))),6);
        (C.field(lev,"rm","typ").value=C.i8(C.CORR));
        C.unblock_point(C.i32(zx),C.i32(zy));
        C.magic_map_background(zx,zy,0);
        foundone(zx,zy,(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        ((C.field(found_p,"found_things","num_scorrs").value=C.u8((C.field(found_p,"found_things","num_scorrs").value+1)))-1);
    }
    if(Number(!!(Number(!!(ttmp&&Number(!(C.field(ttmp,"trap","tseen").value))))&&Number(C.i32(C.field(ttmp,"trap","ttyp").value)!=C.STATUE_TRAP)))) {
        /* [shouldn't successful 'find' reveal and activate statue traps?] */
        C.flash_glyph_at(zx,zy,(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))),6);
        (C.field(ttmp,"trap","tseen").value=C.u32(1));
        sense_trap(ttmp,zx,zy,0);
        /* handles Hallucination */
        foundone(zx,zy,(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((ttmp),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        ((C.field(found_p,"found_things","num_traps").value=C.u8((C.field(found_p,"found_things","num_traps").value+1)))-1);
    }
    if(Number(!!(C.i32(C.closed_door(zx,zy))&&Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&16)))!=0)))) {
        (C.field(C.dummytrap,"trap","ttyp").value=C.u32(C.TRAPPED_DOOR));
        ((C.field(C.dummytrap,"trap","tx").value=zx),(C.field(C.dummytrap,"trap","ty").value=zy));
        C.flash_glyph_at(zx,zy,(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))),6);
        (C.field(C.dummytrap,"trap","tseen").value=C.u32(1));
        sense_trap(C.dummytrap,zx,zy,0);
        /* handles Hallucination */
        foundone(zx,zy,(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((C.dummytrap),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        ((C.field(found_p,"found_things","num_traps").value=C.u8((C.field(found_p,"found_things","num_traps").value+1)))-1);
    }
    /* trapped chests */
    detect_obj_traps(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value,(C.i8(1)),0,found_p);
    detect_obj_traps(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value,(C.i8(1)),0,found_p);
    if(mtmp) detect_obj_traps(C.field(mtmp,"monst","minvent").value,(C.i8(1)),0,found_p);
    if((Number(!!(Number(C.i32((zx))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((zy))==C.i32(C.field(C.u,"you","uy").value)))))) detect_obj_traps(C.field(C.gi,"instance_globals_i","invent").value,(C.i8(1)),0,found_p);
    if(Number(!!(mtmp&&(Number(!!(Number(!!(Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))||C.i32(C.field(mtmp,"monst","mundetected").value)))||(C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7))))))))) {
        if((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))) {
            C.flash_glyph_at(zx,zy,(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((mtmp),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((mtmp),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))),6);
            C.seemimic(mtmp);
            /*foundone(zx, zy, mon_to_glyph(mtmp, rn2_on_display_rng);*/
            ((C.field(found_p,"found_things","num_mons").value=C.u8((C.field(found_p,"found_things","num_mons").value+1)))-1);
        } else if(Number(!!(C.i32(C.field(mtmp,"monst","mundetected").value)&&(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(256n))))!=C.u64(0n)))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(128n))))!=C.u64(0n)))))||Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==C.S_EEL))))))) {
            C.flash_glyph_at(zx,zy,(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((mtmp),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((mtmp),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))),6);
            (C.field(mtmp,"monst","mundetected").value=C.u32(0));
            /*foundone(zx, zy, mon_to_glyph(mtmp, rn2_on_display_rng);*/
            C.newsym(zx,zy);
            ((C.field(found_p,"found_things","num_mons").value=C.u8((C.field(found_p,"found_things","num_mons").value+1)))-1);
        }
        if(Number(!((Number((C.field(lev,"rm","glyph").value)==C.GLYPH_INVIS_OFF))))) {
            if(Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))) {
                C.flash_glyph_at(zx,zy,C.GLYPH_INVIS_OFF,6);
                C.map_invisible(zx,zy);
                ((C.field(found_p,"found_things","num_invis").value=C.u8((C.field(found_p,"found_things","num_invis").value+1)))-1);
            }
        } else {
            ((C.field(found_p,"found_things","num_kept_invis").value=C.u8((C.field(found_p,"found_things","num_kept_invis").value+1)))-1);
        }
    } else if(C.unmap_invisible(zx,zy)) {
        /* flash the invisible monster glyph because it is already gone */
        C.flash_glyph_at(zx,zy,C.GLYPH_INVIS_OFF,6);
        ((C.field(found_p,"found_things","num_cleared_invis").value=C.u8((C.field(found_p,"found_things","num_cleared_invis").value+1)))-1);
    }
}

export function openone(zx,zy,num)
{
    zx=C.i16(zx);
    zy=C.i16(zy);
    const stackFrame=C.stackSave();
    try {
    const zxAddress=C.stackAlloc(2); C.cell(zxAddress,"short").value=zx;
    const zyAddress=C.stackAlloc(2); C.cell(zyAddress,"short").value=zy;
    let ttmp;
    let otmp;
    let num_p=num;
    if((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.cell(zxAddress,"short").value)*(8*21))+Number(C.cell(zyAddress,"short").value)*8),"struct obj *").value!=0))) {
        for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.cell(zxAddress,"short").value)*(8*21))+Number(C.cell(zyAddress,"short").value)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) {
            if(Number(!!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CHEST))))&&C.i32(C.field(otmp,"obj","olocked").value)))) {
                (C.field(otmp,"obj","olocked").value=C.u32(0));
                (((C.cell(num_p,"int").value)=C.i32(((C.cell(num_p,"int").value)+1)))-1);
            }
        }
        /* let it fall to the next cases. could be on trap. */
    }
    /* note: secret doors can't be trapped; they use levl[][].wall_info;
       see rm.h for the troublesome overlay of doormask and wall_info */
    if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)||(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)==C.DOOR)&&(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value)&(C.i32((4|8)))))))))))) {
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)) cvt_sdoor_to_door(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]));
        /* .typ = DOOR */
        if(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value)&16))) {
            if(Number(C.dist2((C.cell(zxAddress,"short").value),(C.cell(zyAddress,"short").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<3)) C.b_trapped(C.literal("door"),C.NO_PART);
 else C.variadic(47,C.literal("You %s an explosion!"),((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.cell(zyAddress,"short").value)*8),"unsigned char *").value+Number(C.cell(zxAddress,"short").value)*1),"unsigned char").value)&2)))!=0))?C.literal("see"):((Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))?C.literal("hear"):C.literal("feel the shock of")))));
            C.wake_nearto(C.cell(zxAddress,"short").value,C.cell(zyAddress,"short").value,C.i32((11*11)));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
        } else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(2));
        C.unblock_point(C.i32(C.cell(zxAddress,"short").value),C.i32(C.cell(zyAddress,"short").value));
        C.newsym(C.cell(zxAddress,"short").value,C.cell(zyAddress,"short").value);
        (((C.cell(num_p,"int").value)=C.i32(((C.cell(num_p,"int").value)+1)))-1);
    } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value)==C.SCORR)) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.cell(zxAddress,"short").value)*(C.sizes["struct rm"]*21))+Number(C.cell(zyAddress,"short").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.CORR));
        C.unblock_point(C.i32(C.cell(zxAddress,"short").value),C.i32(C.cell(zyAddress,"short").value));
        C.newsym(C.cell(zxAddress,"short").value,C.cell(zyAddress,"short").value);
        (((C.cell(num_p,"int").value)=C.i32(((C.cell(num_p,"int").value)+1)))-1);
    } else if(Number(((ttmp=C.t_at(C.cell(zxAddress,"short").value,C.cell(zyAddress,"short").value)))!=0)) {
        let mon;
        let dummyAddress=C.stackAlloc(1);
        /* unneeded "you notice it arg" */
        if(Number(!!(Number(!(C.field(ttmp,"trap","tseen").value))&&Number(C.i32(C.field(ttmp,"trap","ttyp").value)!=C.STATUE_TRAP)))) {
            (C.field(ttmp,"trap","tseen").value=C.u32(1));
            C.newsym(C.cell(zxAddress,"short").value,C.cell(zyAddress,"short").value);
            (((C.cell(num_p,"int").value)=C.i32(((C.cell(num_p,"int").value)+1)))-1);
        }
        (mon=((Number(!!(Number(C.i32((C.cell(zxAddress,"short").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.cell(zyAddress,"short").value))==C.i32(C.field(C.u,"you","uy").value)))))?C.field(C.gy,"instance_globals_y","youmonst").address:(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.cell(zxAddress,"short").value)*(8*21))+Number(C.cell(zyAddress,"short").value)*8),"struct monst *").value)));
        if(Number(!!(C.i32(C.openholdingtrap(mon,dummyAddress))||C.i32(C.openfallingtrap(mon,(C.i8(1)),dummyAddress))))) (((C.cell(num_p,"int").value)=C.i32(((C.cell(num_p,"int").value)+1)))-1);
    } else if(C.find_drawbridge(zxAddress,zyAddress)) {
        /* make sure it isn't an open drawbridge */
        C.open_drawbridge(C.cell(zxAddress,"short").value,C.cell(zyAddress,"short").value);
        (((C.cell(num_p,"int").value)=C.i32(((C.cell(num_p,"int").value)+1)))-1);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* returns number of things found */
export function findit()
{
    const stackFrame=C.stackSave();
    try {
    let num=0; let k;
    let buf=C.stackAlloc((1*256));
    let found=C.stackAlloc(C.sizes["struct found_things"]);
    /*
     *  findit() -> do_clear_area(findone) -> findone() -> foundone()
     *  is used to notify player where various things have been found.
     *  Changing FOUND_FLASH_COUNT to 0 will switch to tmp_at() to
     *  highlight all discoveries for the current operation, but requires
     *  player to respond to --More-- when done.  Neither allows browsing
     *  the map via getpos() autodescribe (until after it has reverted to
     *  normal display, where found traps might be covered by objects).
     */
    if(C.field(C.u,"you","uswallow").value) return 0;
    /* _COUNT > 0 doesn't need to init tmp_at() */
    C.memset(found,0,BigInt(C.sizes["struct found_things"]));
    C.do_clear_area(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,8,C.functionPointer("findone"),found);
    /* count that controls "reveal" punctuation; 0..4 */
    (k=C.i32((C.i32((C.i32((Number(!(Number(!(C.field(found,"found_things","num_sdoors").value))))+Number(!(Number(!(C.field(found,"found_things","num_scorrs").value))))))+Number(!(Number(!(C.field(found,"found_things","num_traps").value))))))+Number(!(Number(!(C.field(found,"found_things","num_mons").value)))))));
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    if(C.field(found,"found_things","num_sdoors").value) {
        if(Number(C.i32(C.field(found,"found_things","num_sdoors").value)>1)) C.variadic(48,C.eos(buf),C.literal("%d secret doors"),C.i32(C.field(found,"found_things","num_sdoors").value));
 else C.strcat(buf,C.literal("a secret door"));
        (num=C.i32(num+C.i32(C.field(found,"found_things","num_sdoors").value)));
    }
    /* note: non-\0 *buf implies that at least one previous type is present */
    if(C.field(found,"found_things","num_scorrs").value) {
        if(C.cell(buf,"char").value) C.strcat(buf,((Number(k==2))?C.literal(" and "):C.literal(", ")));
        /* "doors and corrs" or "doors, corrs ..." */
        if(Number(C.i32(C.field(found,"found_things","num_scorrs").value)>1)) C.variadic(49,C.eos(buf),C.literal("%d secret corridors"),C.i32(C.field(found,"found_things","num_scorrs").value));
 else C.strcat(buf,C.literal("a secret corridor"));
        (num=C.i32(num+C.i32(C.field(found,"found_things","num_scorrs").value)));
    }
    if(C.field(found,"found_things","num_traps").value) {
        if(C.cell(buf,"char").value) C.strcat(buf,((Number(!!(Number(k==3)&&Number(!(C.field(found,"found_things","num_mons").value)))))?C.literal(", and "):((Number(k==2))?C.literal(" and "):C.literal(", "))));
        /* "doors, corrs, and traps" or "{doors|corrs} and traps"
                   * or "..., traps ..." */
        if(Number(C.i32(C.field(found,"found_things","num_traps").value)>1)) C.variadic(50,C.eos(buf),C.literal("%d traps"),C.i32(C.field(found,"found_things","num_traps").value));
 else C.strcat(buf,C.literal("a trap"));
        (num=C.i32(num+C.i32(C.field(found,"found_things","num_traps").value)));
    }
    /* sdoors, scorrs, and traps call tmp_at() */
    if(C.field(found,"found_things","num_mons").value) {
        if(C.cell(buf,"char").value) C.strcat(buf,((Number(k>2))?C.literal(", and "):C.literal(" and ")));
        if(Number(C.i32(C.field(found,"found_things","num_mons").value)>1)) C.variadic(51,C.eos(buf),C.literal("%d hidden monsters"),C.i32(C.field(found,"found_things","num_mons").value));
 else C.strcat(buf,C.literal("a hidden monster"));
        (num=C.i32(num+C.i32(C.field(found,"found_things","num_mons").value)));
    }
    if(C.cell(buf,"char").value) C.variadic(52,C.literal("reveal %s!"),buf);
    if(C.field(found,"found_things","num_invis").value) {
        if(Number(C.i32(C.field(found,"found_things","num_invis").value)>1)) C.variadic(53,buf,C.literal("%d%s unseen monsters"),C.i32(C.field(found,"found_things","num_invis").value),(C.i32(C.field(found,"found_things","num_kept_invis").value)?C.literal(" other"):C.literal("")));
 else C.variadic(54,buf,C.literal("%s unseen monster"),(C.i32(C.field(found,"found_things","num_kept_invis").value)?C.literal("another"):C.literal("an")));
        C.variadic(55,C.literal("detect %s!"),buf);
        (num=C.i32(num+C.i32(C.field(found,"found_things","num_invis").value)));
    }
    if(C.field(found,"found_things","num_cleared_invis").value) {
        /* at least 1 "remembered, unseen monster" marker has been removed */
        if(Number(!(num))) C.variadic(56,C.literal("%sless paranoid."),(C.i32(C.field(found,"found_things","num_kept_invis").value)?C.literal("somewhat "):C.literal("")));
        (num=C.i32(num+C.i32(C.field(found,"found_things","num_cleared_invis").value)));
    }
    /* note: num_kept_invis is not included in the final result */
    if(Number(!(num))) C.variadic(57,C.literal("don't find anything."));
    /* note: outside of 'if (tmp_num) { }' */
    return num;
    } finally {C.stackRestore(stackFrame); }
}

/* returns number of things found and opened */
export function openit()
{
    const stackFrame=C.stackSave();
    try {
    let numAddress=C.stackAlloc(4); C.cell(numAddress,"int").value=0;
    if(C.field(C.u,"you","uswallow").value) {
        if((Number(C.dmgtype_fromattack((C.field(C.field(C.u,"you","ustuck").value,"monst","data").value),26,11)!=0))) {
            /* purple worm */
            if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.variadic(58,C.literal("Its mouth opens!"));
 else C.variadic(59,C.literal("%s opens its mouth!"),C.Monnam(C.field(C.u,"you","ustuck").value));
            /* expels() will take care of this */
            /* trapper or lurker above */
        }
        C.expels(C.field(C.u,"you","ustuck").value,C.field(C.field(C.u,"you","ustuck").value,"monst","data").value,(C.i8(1)));
        return C.i32((-1));
    }
    C.do_clear_area(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,8,C.functionPointer("openone"),numAddress);
    return C.cell(numAddress,"int").value;
    } finally {C.stackRestore(stackFrame); }
}

/* callback hack for overriding vision in do_clear_area() */
export function detecting(func)
{
    return C.i8((Number(!!(Number(func==C.functionPointer("findone"))||Number(func==C.functionPointer("openone"))))));
}

export function find_trap(trap)
{
    let cleared=(C.i8(0));
    (C.field(trap,"trap","tseen").value=C.u32(1));
    C.exercise(C.A_WIS,(C.i8(1)));
    C.feel_newsym(C.field(trap,"trap","tx").value,C.field(trap,"trap","ty").value);
    /* The "Hallucination ||" is to preserve 3.6.1 behavior, but this
       behavior might need a rework in the hallucination case
       (e.g. to not prompt if any trap glyph appears on the square). */
    if(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))||Number(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(trap,"trap","tx").value)*(C.sizes["struct rm"]*21))+Number(C.field(trap,"trap","ty").value)*C.sizes["struct rm"]),"rm","glyph").value!=(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))) {
        /* There's too much clutter to see your find otherwise */
        C.cls();
        C.map_trap(trap,1);
        C.show_glyph(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(((Number(!!(C.field(C.u,"you","usteed").value&&C.mon_visible(C.field(C.u,"you","usteed").value))))?(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((C.field(C.u,"you","usteed").value),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((C.field(C.u,"you","usteed").value),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))||Number(!(C.field(C.flags,"flag","showrace").value)))))?C.field(C.u,"you","umonnum").value:C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)))+(((Number((((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))+(((Number(((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
        (cleared=(C.i8(1)));
    }
    C.set_msg_xy(C.field(trap,"trap","tx").value,C.field(trap,"trap","ty").value);
    C.variadic(60,C.literal("find %s."),C.an(C.trapname(C.i32(C.field(trap,"trap","ttyp").value),(C.i8(0)))));
    if(cleared) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MAP").value,(C.i8(1)));
        /* wait */
        C.docrt();
    }
}

export function mfind0(mtmp,via_warning)
{
    via_warning=C.i8(via_warning);
    let x=C.field(mtmp,"monst","mx").value; let y=C.field(mtmp,"monst","my").value;
    let found_something=(C.i8(0));
    if(Number(!!(C.i32(via_warning)&&Number(!(C.warning_of(mtmp)))))) return C.i32((-1));
    if((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))) {
        C.seemimic(mtmp);
        (found_something=(C.i8(1)));
    } else {
        /* this used to only be executed if a !canspotmon() test passed
           but that failed to bring sensed monsters out of hiding */
        (found_something=C.i8(Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))));
        if(Number(!!(C.i32(C.field(mtmp,"monst","mundetected").value)&&(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(256n))))!=C.u64(0n)))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(128n))))!=C.u64(0n)))))||Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==C.S_EEL))))))) {
            if(Number(!!(C.i32(via_warning)&&C.i32(found_something)))) {
                C.set_msg_xy(x,y);
                C.variadic(61,C.literal("danger sense causes you to take a second %s."),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("to check nearby"):C.literal("look close by")));
                C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MESSAGE").value,(C.i8(0)));
                /* flush messages */
            }
            (C.field(mtmp,"monst","mundetected").value=C.u32(0));
            (found_something=(C.i8(1)));
        }
        C.newsym(x,y);
    }
    if(found_something) {
        if(Number(!!(Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))&&(Number((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value)==C.GLYPH_INVIS_OFF))))) return C.i32((-1));
        /* Found invisible monster in square which already has
                        * 'I' in it.  Logically, this should still take time
                        * and lead to `return 1', but if we did that the hero
                        * would keep finding the same monster every turn. */
        C.exercise(C.A_WIS,(C.i8(1)));
        if(Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))) {
            C.map_invisible(x,y);
            C.set_msg_xy(x,y);
            C.variadic(62,C.literal("an unseen monster!"));
        } else if(Number(!(C.sensemon(mtmp)))) {
            C.set_msg_xy(x,y);
            C.variadic(63,C.literal("find %s."),(C.i32(C.field(mtmp,"monst","mtame").value)?C.y_monnam(mtmp):C.a_monnam(mtmp)));
        }
        return 1;
    }
    return 0;
}

export function dosearch0(aflag)
{
    aflag=C.i32(aflag);
    /* intrinsic autosearch vs explicit searching */
    let x; let y;
    let trap;
    let mtmp;
    if(C.field(C.u,"you","uswallow").value) {
        if(Number(!(aflag))) C.variadic(64,C.literal("What are you looking for?  The exit?"));
    } else {
        let fund=((Number(!!(Number(!!(C.global("uwep").value&&C.i32(C.field(C.global("uwep").value,"obj","oartifact").value)))&&C.i32(C.spec_ability(C.global("uwep").value,C.u64(512n))))))?C.i32(C.field(C.global("uwep").value,"obj","spe").value):0);
        if(Number(!!(Number(!!(C.global("ublindf").value&&Number(C.i32(C.field(C.global("ublindf").value,"obj","otyp").value)==C.LENSES)))&&Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))) (fund=C.i32(fund+2));
        /* JDS: lenses help searching */
        if(Number(fund>5)) (fund=5);
        for((x=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)-1))));Number(C.i32(x)<C.i32((C.i32(C.field(C.u,"you","ux").value)+2)));((x=C.i16((x+1)))-1)) for((y=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)-1))));Number(C.i32(y)<C.i32((C.i32(C.field(C.u,"you","uy").value)+2)));((y=C.i16((y+1)))-1)) {
            if(Number(!(C.isok(x,y)))) continue;
            if((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))) continue;
            if(Number(!!(Number(!(aflag))&&(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||C.visible_region_at(x,y))))))) C.feel_location(x,y);
            if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)) {
                if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),2043,(C.literal("dosearch0"))),C.rnl(C.i32((7-fund))))):C.rnl(C.i32((7-fund)))))) continue;
                cvt_sdoor_to_door(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
                /* .typ = DOOR */
                C.recalc_block_point(x,y);
                C.exercise(C.A_WIS,(C.i8(1)));
                C.nomul(0);
                C.feel_location(x,y);
                /* make sure it shows up */
                C.set_msg_xy(x,y);
                C.variadic(65,C.literal("find a hidden door."));
            } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SCORR)) {
                if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),2053,(C.literal("dosearch0"))),C.rnl(C.i32((7-fund))))):C.rnl(C.i32((7-fund)))))) continue;
                (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.CORR));
                C.unblock_point(C.i32(x),C.i32(y));
                /* vision */
                C.exercise(C.A_WIS,(C.i8(1)));
                C.nomul(0);
                C.feel_newsym(x,y);
                /* make sure it shows up */
                C.set_msg_xy(x,y);
                C.variadic(66,C.literal("find a hidden passage."));
            } else {
                /* Be careful not to find anything in an SCORR or SDOOR */
                if(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&Number(!(aflag))))) {
                    let mfres=mfind0(mtmp,C.i8(0));
                    if(Number(mfres==C.i32((-1)))) continue;
 else if(Number(mfres>0)) return mfres;
                }
                /* see if an invisible monster has moved--if Blind,
                     * feel_location() already did it
                     */
                if(Number(!!(Number(!!(Number(!(aflag))&&Number(!(mtmp))))&&Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))) C.unmap_invisible(x,y);
                if(Number(!!(Number(!!(((trap=C.t_at(x,y)))&&Number(!(C.field(trap,"trap","tseen").value))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("detect.c"),2079,(C.literal("dosearch0"))),C.rnl(8))):C.rnl(8)))))))) {
                    C.nomul(0);
                    if(Number(C.i32(C.field(trap,"trap","ttyp").value)==C.STATUE_TRAP)) {
                        if(C.activate_statue_trap(trap,x,y,(C.i8(0)))) C.exercise(C.A_WIS,(C.i8(1)));
                        return 1;
                    } else {
                        find_trap(trap);
                    }
                }
            }
        }

    }
    return 1;
}

/* the #search command -- explicit searching */
export function dosearch()
{
    if(C.cmd_safety_prevention(C.literal("Searching"),C.literal("another search"),C.literal("You already found a monster."),C.field(C.ga,"instance_globals_a","already_found_flag").address)) return 0;
    return (dosearch0(0)?1:0);
}

export function warnreveal()
{
    let x; let y;
    let mtmp;
    for((x=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)-1))));Number(C.i32(x)<=C.i32((C.i32(C.field(C.u,"you","ux").value)+1)));((x=C.i16((x+1)))-1)) for((y=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)-1))));Number(C.i32(y)<=C.i32((C.i32(C.field(C.u,"you","uy").value)+1)));((y=C.i16((y+1)))-1)) {
        if(Number(!!(Number(!(C.isok(x,y)))||(Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))) continue;
        if(Number(!!(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&C.warning_of(mtmp)))&&C.i32(C.field(mtmp,"monst","mundetected").value)))) mfind0(mtmp,C.i8(1));
        /* via_warning */
    }

}

/* skip premap detection of areas outside Sokoban map */
export function skip_premap_detect(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!!((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.STONE))&&Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&(C.i32((8|16))))))!=0)))) return (C.i8(1));
    return (C.i8(0));
}

/* Pre-map (the sokoban) levels */
export function premap_detect()
{
    let x; let y;
    let ttmp;
    let obj;
    /* Map the background and boulders */
    for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        if(skip_premap_detect(x,y)) continue;
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value=(C.u8(255)));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","waslit").value=C.u32((C.i8(1))));
        if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
        /* see rm.h for explanation */
        C.map_background(x,y,1);
        if(Number(((obj=C.sobj_at(C.BOULDER,x,y)))!=0)) C.map_object(obj,1);
    }

    /* Map the traps */
    for((ttmp=C.field(C.gf,"instance_globals_f","ftrap").value);ttmp;(ttmp=C.field(ttmp,"trap","ntrap").value)) {
        (C.field(ttmp,"trap","tseen").value=C.u32(1));
        C.map_trap(ttmp,1);
    }
}

/* used to see under visible gas/cloud regions; caller must declare cmaptmp */
export function reveal_terrain_getglyph(x,y,swallowed,default_glyph,which_subset)
{
    x=C.i16(x);
    y=C.i16(y);
    swallowed=C.u32(swallowed);
    default_glyph=C.i32(default_glyph);
    which_subset=C.u32(which_subset);
    const stackFrame=C.stackSave();
    try {
    let t;
    let mtmp;
    let glyph; let levl_glyph;
    let seenv;
    let keep_traps=C.i8(Number((C.u32((which_subset&2)))!=C.u32(0))); let keep_objs=C.i8(Number((C.u32((which_subset&4)))!=C.u32(0))); let keep_mons=C.i8(Number((C.u32((which_subset&8)))!=C.u32(0))); let full=C.i8(Number((C.u32((which_subset&16)))!=C.u32(0)));
    /*
     * FIXME:
     *  travel treats discovered vibrating square as if it were terrain
     *  rather than a trap so this should do so too.
     */
    /* for 'full', show the actual terrain for the entire level,
       otherwise what the hero remembers for seen locations with
       monsters, objects, and/or traps removed as caller dictates */
    (seenv=C.u8(((Number(!!(C.i32(full)||C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value))))?C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value):((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))?C.i32((C.u8(255))):0))));
    if(full) {
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value=(C.u8(255)));
        (glyph=C.back_to_glyph(x,y));
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value=seenv);
    } else {
        let cmaptmp=0;
        /* used by glyph_is_gascloud() macro */
        let reg=C.visible_region_at(x,y);
        let was_mon=(C.i8(0));
        (levl_glyph=(C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hero_memory").value)?C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value:(C.i32(seenv)?C.back_to_glyph(x,y):default_glyph)));
        /* glyph_at() returns the displayed glyph, which might
           be a monster.  levl[][].glyph contains the remembered
           glyph, which will never be a monster (unless it is
           the invisible monster glyph, which is handled like
           an object, replacing any object or trap at its spot) */
        (glyph=(Number(!(swallowed))?C.glyph_at(x,y):levl_glyph));
        if(Number(!!(Number(!!(C.i32(keep_mons)&&(Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))&&swallowed))) {
            (glyph=(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((C.field(C.u,"you","ustuck").value),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((C.field(C.u,"you","ustuck").value),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
        } else if(Number(!!((Number(!!(Number(!(keep_mons))&&(Number(!!((Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((glyph)>=C.GLYPH_MON_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_MON_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_PET_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_PET_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))))))))||(Number(!!(Number((glyph)>=C.GLYPH_WARNING_OFF)&&Number((glyph)<(C.i32((C.GLYPH_WARNING_OFF+6)))))))))))))||(Number(!!(Number((glyph)>=C.GLYPH_SWALLOW_OFF)&&Number((glyph)<((C.i32(((C.i32((C.NUMMONS<<3)))+C.GLYPH_SWALLOW_OFF))))))))))) {
            (glyph=levl_glyph);
            (was_mon=(C.i8(1)));
        }
        if(Number(!!(Number(!!((Number(!!((Number(!!(Number(!(keep_objs))&&(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number((glyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((glyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))||(Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))))||(Number(!!((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_BODY_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS)))))))))))))))))||(Number((glyph)==C.GLYPH_INVIS_OFF)))))&&C.i32(keep_traps)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.LAVAPOOL))))||(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.LAVAWALL)))))))))) {
            if(Number(!!(Number(((t=C.t_at(x,y)))!=0)&&C.i32(C.field(t,"trap","tseen").value)))) (glyph=(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        }
        if(Number(!!(Number(!!(Number(!!((Number(!!(Number(!(keep_objs))&&(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number((glyph)==C.GLYPH_OBJ_OFF)||(Number(!!(Number((glyph)>=C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_OFF+C.NUM_OBJECTS)))))))))||(Number(!!(Number((glyph)==C.GLYPH_OBJ_PILETOP_OFF)||(Number(!!(Number((glyph)>C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))&&Number((glyph)<(C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.NUM_OBJECTS)))))))))))))||(Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))))||(Number(!!((Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_MALE_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_MALE_PILETOP_OFF+C.NUMMONS)))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_STATUE_FEM_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_STATUE_FEM_PILETOP_OFF+C.NUMMONS))))))))))))))))||(Number(!!((Number(!!((Number((glyph)>=C.GLYPH_BODY_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_OFF+C.NUMMONS))))))))||(Number(!!((Number((glyph)>=C.GLYPH_BODY_PILETOP_OFF))&&(Number((glyph)<(C.i32((C.GLYPH_BODY_PILETOP_OFF+C.NUMMONS)))))))))))))))))||(Number(!!(Number(!(keep_traps))&&(Number(!!((Number(!!(Number((glyph)>=((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave))))))))&&Number((glyph)<(C.i32((((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave)))))))+(C.i32((C.TRAPNUM-1))))))))))||(Number(!!(reg&&(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_CMAP_STONE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_CMAP_C_OFF+(C.i32(((C.i32((C.S_goodpos-C.S_digbeam)))+1))))))))))&&(Number(!!(Number(((cmaptmp=C.glyph_to_cmap(glyph)))==C.S_cloud)||Number(cmaptmp==C.S_poisoncloud))))))))))))))))))||(Number(!!(reg&&C.i32(was_mon))))))||(Number((glyph)==C.GLYPH_INVIS_OFF))))) {
            /* we either show both traps and visible regions (trap if both
               are present at the same spot) or neither traps nor regions */
            if(Number(!(seenv))) {
                /* it's possible to have a visible region shown at an
                   otherwise unexplored location (cast stinking cloud
                   through unexplored corridor into lit room, then approach
                   far enough to be adjacent to the cloud without having
                   seen the corridor underneath it) */
                (glyph=(Number(!(reg))?default_glyph:C.GLYPH_UNEXPLORED_OFF));
            } else if(Number(!!(Number(!!(C.i32(keep_traps)&&reg))&&(Number(!!((Number(!!((Number(!!(Number((glyph)>=C.GLYPH_CMAP_STONE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_CMAP_C_OFF+(C.i32(((C.i32((C.S_goodpos-C.S_digbeam)))+1))))))))))&&(Number(!!(Number(((cmaptmp=C.glyph_to_cmap(glyph)))==C.S_cloud)||Number(cmaptmp==C.S_poisoncloud)))))))||C.i32(was_mon))))))) {
                (t=C.t_at(x,y));
                /* we need reg->glyph here when there's a monster shown
                   at a region spot; the region glyph isn't the remembered
                   background glyph or the current glyph */
                (glyph=((Number(!!(t&&C.i32(C.field(t,"trap","tseen").value))))?(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((t),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):C.field(reg,"NhRegion","glyph").value));
                /* FIXME? what about objects temporarily hidden by regions?
                   when objects are being shown, shouldn't showing them take
                   precedence over showing the region, just like traps? */
            } else if(Number(C.i32(C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(x)*(1*21))+Number(y)*1),"signed char").value)==C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))) {
                (glyph=C.back_to_glyph(x,y));
            } else {
                /* look for a mimic here posing as furniture;
                   if we don't find one, we'll have to fake it */
                if(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&Number((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE)))) {
                    (glyph=C.i32((((Number((C.field(mtmp,"monst","mappearance").value)==C.u32(C.S_stone)))?C.u32(C.GLYPH_CMAP_STONE_OFF):((Number((C.field(mtmp,"monst","mappearance").value)<=C.u32(C.S_trwall)))?(C.u32((C.u32(((C.field(mtmp,"monst","mappearance").value)-C.u32(C.S_vwall)))+C.u32(((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF))))))))):((Number((C.field(mtmp,"monst","mappearance").value)<C.u32(C.S_altar)))?(C.u32(((C.u32(((C.field(mtmp,"monst","mappearance").value)-C.u32(C.S_ndoor))))+C.u32(C.GLYPH_CMAP_A_OFF)))):((Number((C.field(mtmp,"monst","mappearance").value)==C.u32(C.S_altar)))?C.u32((((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned))))))))):((Number((C.field(mtmp,"monst","mappearance").value)<C.u32(C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1))))))))?(C.u32(((C.u32(((C.field(mtmp,"monst","mappearance").value)-C.u32(C.S_grave))))+C.u32(C.GLYPH_CMAP_B_OFF)))):((Number((C.field(mtmp,"monst","mappearance").value)<=C.u32(C.S_goodpos)))?(C.u32(((C.u32(((C.field(mtmp,"monst","mappearance").value)-C.u32(C.S_digbeam))))+C.u32(C.GLYPH_CMAP_C_OFF)))):C.u32(C.MAX_GLYPH))))))))));
                } else {
                    let save_spot=C.stackAlloc(C.sizes["struct rm"]);
                    /*
                     * We have a topology type but we want a screen symbol
                     * in order to derive a glyph.  Some screen symbols need
                     * the flags field of levl[][] in addition to the type
                     * (to disambiguate STAIRS to S_upstair or S_dnstair,
                     * for example).  Current flags might not be intended
                     * for remembered type, but we've got no other choice.
                     * An exception is wall_info which can be recalculated and
                     * needs to be.  Otherwise back_to_glyph() -> wall_angle()
                     * might issue an impossible() for it if it is currently
                     * doormask==D_OPEN for an open door remembered as a wall.
                     */
                    C.copyRecord(save_spot,((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),C.sizes["struct rm"]);
                    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(x)*(1*21))+Number(y)*1),"signed char").value);
                    if(Number(!!((Number(!!(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<=C.DBWALL))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.SDOOR)))) C.xy_set_wall_state(x,y);
                    /* levl[x][y].wall_info */
                    (glyph=C.back_to_glyph(x,y));
                    C.copyRecord(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),save_spot,C.sizes["struct rm"]);
                }
            }
        }
    }
    /* FIXME: dirty hack */
    if(Number(glyph==(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))) (glyph=(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
 else if(Number(glyph==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))) (glyph=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
    return glyph;
    } finally {C.stackRestore(stackFrame); }
}

/* cmap_to_glyph() evaluates its argument multiple times, so pull the
       tree vs stone conditional out of it */
/*
     * Squeeze out excess vertical space when dumping the map.
     * If there are any blank map rows at the top, suppress them
     * (our caller has already printed a separator).  If there is
     * more than one blank map row at the bottom, keep just one.
     * Any blank rows within the middle of the map are kept.
     * Note: putstr() with winid==0 is for dumplog.
     */
/* assume blank until we discover otherwise */
/* buf[] index rather than map's x */
/* map row #y */
/* DUMPLOG */
/* idea from crawl; show known portion of map without any monsters,
   objects, or traps occluding the view of the underlying terrain;
   in explore or wizard modes, can also display unexplored portion */
export function reveal_terrain(which_subset)
{
    which_subset=C.u32(which_subset);
    const stackFrame=C.stackSave();
    try {
    /* TER_TRP | TER_OBJ | TER_MON | TER_FULL */
    /* 'full' overrides impairment and implies no-traps, no-objs, no-mons */
    let full=C.i8(Number((C.u32((which_subset&16)))!=C.u32(0)));
    /* show whole map */
    if(Number(!!((Number(!!(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))||C.field((C.field(C.u,"you","uprops").address+Number(C.STUNNED)*C.sizes["struct prop"]),"prop","intrinsic").value))||C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value)))&&Number(!(full))))) {
        C.variadic(67,C.literal("are too disoriented for this."));
    } else {
        let x; let y;
        let glyph; let default_glyph;
        let buf=C.stackAlloc((1*256));
        /* there is a TER_MAP bit too; we always show map regardless of it */
        let keep_traps=C.i8(Number((C.u32((which_subset&2)))!=C.u32(0))); let keep_objs=C.i8(Number((C.u32((which_subset&4)))!=C.u32(0))); let keep_mons=C.i8(Number((C.u32((which_subset&8)))!=C.u32(0)));
        /* not used */
        let swallowed=C.field(C.u,"you","uswallow").value;
        /* before unconstrain_map() */
        let default_sym=C.u8((C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value)?C.S_tree:C.S_stone));
        if(unconstrain_map()) C.docrt();
        (default_glyph=(((Number(C.i32((default_sym))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(C.i32((default_sym))<=C.S_trwall))?(C.i32((C.i32((C.i32((default_sym))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(C.i32((default_sym))<C.S_altar))?(C.i32(((C.i32((C.i32((default_sym))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(C.i32((default_sym))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(C.i32((default_sym))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((C.i32((default_sym))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(C.i32((default_sym))<=C.S_goodpos))?(C.i32(((C.i32((C.i32((default_sym))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
            (glyph=reveal_terrain_getglyph(x,y,swallowed,default_glyph,which_subset));
            C.show_glyph(x,y,glyph);
        }

        /* hero's location is not highlighted, but getpos() starts with
           cursor there, and after moving it anywhere '@' moves it back */
        C.flush_screen(1);
        if(full) {
            C.strcpy(buf,C.literal("underlying terrain"));
        } else {
            C.strcpy(buf,C.literal("known terrain"));
            if(keep_traps) C.variadic(68,C.eos(buf),C.literal("%s traps"),((Number(!!(C.i32(keep_objs)||C.i32(keep_mons))))?C.literal(","):C.literal(" and")));
            if(keep_objs) C.variadic(69,C.eos(buf),C.literal("%s%s objects"),((Number(!!(C.i32(keep_traps)||C.i32(keep_mons))))?C.literal(","):C.literal("")),(C.i32(keep_mons)?C.literal(""):C.literal(" and")));
            if(keep_mons) C.variadic(70,C.eos(buf),C.literal("%s and monsters"),((Number(!!(C.i32(keep_traps)||C.i32(keep_objs))))?C.literal(","):C.literal("")));
        }
        C.variadic(71,C.literal("Showing %s only..."),buf);
        /* allow player to move cursor around and get autodescribe feedback
           based on what is visible now rather than what is on 'real' map */
        (which_subset=C.u32(which_subset|1));
        /* guarantee non-zero */
        browse_map(which_subset,C.literal("anything of interest"));
        map_redisplay();
    }
    return;
    } finally {C.stackRestore(stackFrame); }
}

/*detect.c*/
export const initialState=C=>({dummytrap:C.dummytrapBacking,level_detects:level_detects(C)});
