import { C } from './c-runtime.js';
/* NetHack 5.0	dothrow.c	$NHDT-Date: 1737343372 2025/01/19 19:22:52 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.300 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2013. */
/* NetHack may be freely redistributed.  See license for details. */
/* Contains code for 't' (throw) */
/* uwep might already be removed from inventory so test for W_WEP instead;
   for Valk+Mjollnir, caller needs to validate the strength requirement */
/* gt.thrownobj (decl.c) tracks an object until it lands */
export function multishot_class_bonus(pm,ammo,launcher)
{
    pm=C.i32(pm);
    ammo=C.ptr(ammo);
    launcher=C.ptr(launcher);
    /* can be NULL */
    let multishot=0;
    let skill=C.field((C.objects+Number(C.field(ammo,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value;
    switch(pm) {
        case (C.PM_CAVE_DWELLER):
            /* give bonus for low-tech gear */
            if(Number(!!(Number(C.i32(skill)==C.i32((-C.P_SLING)))||Number(C.i32(skill)==C.P_SPEAR)))) ((multishot=C.i32((multishot+1)))-1);
        break;
        case (C.PM_MONK):
            /* allow higher volley count despite skill limitation */
            if(Number(C.i32(skill)==C.i32((-C.P_SHURIKEN)))) ((multishot=C.i32((multishot+1)))-1);
        break;
        case (C.PM_RANGER):
            /* arbitrary; encourage use of other missiles beside daggers */
            if(Number(C.i32(skill)!=C.P_DAGGER)) ((multishot=C.i32((multishot+1)))-1);
        break;
        case (C.PM_ROGUE):
            /* possibly should add knives... */
            if(Number(C.i32(skill)==C.P_DAGGER)) ((multishot=C.i32((multishot+1)))-1);
        break;
        case (C.PM_NINJA):
            if(Number(!!(Number(C.i32(skill)==C.i32((-C.P_SHURIKEN)))||Number(C.i32(skill)==C.i32((-C.P_DART)))))) ((multishot=C.i32((multishot+1)))-1);
        ;
        /*FALLTHRU*/
        case (C.PM_SAMURAI):
            /* role-specific launcher and its ammo */
            if(Number(!!(Number(!!(Number(C.i32(C.field(ammo,"obj","otyp").value)==C.YA)&&launcher))&&Number(C.i32(C.field(launcher,"obj","otyp").value)==C.YUMI)))) ((multishot=C.i32((multishot+1)))-1);
        break;
        default:
            break;
        /* No bonus */
    }
    return multishot;
}

/* Throw the selected object, asking for direction */
export function throw_obj(obj,shotlimit)
{
    obj=C.ptr(obj);
    shotlimit=C.i32(shotlimit);
    const stackFrame=C.stackSave();
    try {
    let otmp; let oldslot;
    let multishot;
    let skill;
    let wep_mask;
    let twoweap; let weakmultishot;
    let res=1;
    let save_osplit=C.stackAlloc(C.sizes["struct obj_split"]); C.copy(save_osplit,C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,C.sizes["struct obj_split"]);
    unsplit_stack: {
        /* ask "in what direction?" */
        if(Number(!(C.getdir(0)))) {
            /* No direction specified, so cancel the throw */
            (res=2);
            /* no time passes */
            break unsplit_stack; /* original goto unsplit_stack */
        }
        /*
     * Throwing gold is usually for getting rid of it when
     * a leprechaun approaches, or for bribing an oncoming
     * angry monster.  So throw the whole object.
     *
     * If the gold is in quiver, throw one coin at a time,
     * possibly using a sling.
     */
        if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)&&Number(obj!=C.global("uquiver").value)))) {
            /* throw_gold will unsplit the stack itself if necessary and may have
           freed the object, so don't route through unsplit_stack here */
            return throw_gold(obj);
            /* check */
        }
        if(Number(!(C.canletgo(obj,C.literal("throw"))))) {
            (res=0);
            break unsplit_stack; /* original goto unsplit_stack */
        }
        if(Number(!!(C.i32(C.is_art(obj,C.ART_MJOLLNIR))&&Number(obj!=C.global("uwep").value)))) {
            C.variadic(0,C.literal("%s must be wielded before it can be thrown."),C.The(C.xname(obj)));
            (res=0);
            break unsplit_stack; /* original goto unsplit_stack */
        }
        if(Number(!!((Number(!!(C.i32(C.is_art(obj,C.ART_MJOLLNIR))&&Number(C.i32((C.acurr(C.A_STR)))<(C.i32((100+(25))))))))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)&&Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(134217728n))))!=C.u64(0n))))))))))) {
            C.variadic(1,C.literal("It's too heavy."));
            (res=1);
            break unsplit_stack; /* original goto unsplit_stack */
        }
        if(Number(!!(Number(!!(Number(!(C.field(C.u,"you","dx").value))&&Number(!(C.field(C.u,"you","dy").value))))&&Number(!(C.field(C.u,"you","dz").value))))) {
            C.variadic(2,C.literal("cannot throw an object at yourself."));
            (res=0);
            break unsplit_stack; /* original goto unsplit_stack */
        }
        C.u_wipe_engr(2);
        if(Number(!!(Number(!!(Number(!!(Number(!(C.global("uarmg").value))&&Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)))&&(Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))) {
            C.variadic(3,C.literal("throw %s with your bare %s."),C.corpse_xname(obj,0,C.u32(4)),C.makeplural(C.body_part(C.HAND)));
            /* throwing with one hand, but pluralize since the
               expression "with your bare hands" sounds better */
            C.variadic(4,C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address,C.literal("throwing %s bare-handed"),C.killer_xname(obj));
            C.instapetrify(C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address);
        }
        if(C.welded(obj)) {
            C.weldmsg(obj);
            (res=1);
            break unsplit_stack; /* original goto unsplit_stack */
        }
        if((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.TOWEL)&&Number(C.i32(C.field((obj),"obj","spe").value)>0))))) C.dry_a_towel(obj,C.i32((-1)),(C.i8(0)));
        /* Multishot calculations
     * (potential volley of up to N missiles; default for N is 1)
     */
        (multishot=1);
        (skill=C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value);
        if(Number(!!(Number(!!(Number(C.field(obj,"obj","quan").value>1n)&&(((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))?(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))):Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STUNNED)*C.sizes["struct prop"]),"prop","intrinsic").value)))))))) {
            /* no point checking if there's only 1 */
            /* ammo requires corresponding launcher be wielded */
            /* otherwise any stackable (non-ammo) weapon */
            /* some roles don't get a volley bonus until becoming expert */
            (weakmultishot=C.i8((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_WIZARD)))||(Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))))||(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_HEALER)))&&Number(C.i32(skill)!=C.P_KNIFE))))))||(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_TOURIST)))&&Number(C.i32(skill)!=C.i32((-C.P_DART))))))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","extrinsic").value)))))||Number(C.i32((C.acurr(C.A_DEX)))<=6))))));
            /* poor dexterity also inhibits multishot */
            /* Bonus if the player is proficient in this weapon... */
            switch(C.i32((C.field((C.field(C.u,"you","weapon_skills").address+Number(C.weapon_type(obj))*C.sizes["struct skills"]),"skills","skill").value))) {
                case (C.P_EXPERT):
                    ((multishot=C.i32((multishot+1)))-1);
                ;
                /*FALLTHRU*/
                case (C.P_SKILLED):
                    if(Number(!(weakmultishot))) ((multishot=C.i32((multishot+1)))-1);
                break;
                default:
                    /* basic or unskilled: no bonus */
                    break;
            }
            /* ...or is using a special weapon for their role... */
            (multishot=C.i32(multishot+multishot_class_bonus(C.i32((C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)),obj,C.global("uwep").value)));
            /* ...or using their race's special bow; no bonus for spears */
            if(Number(!(weakmultishot))) {
                switch(C.i32((C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value))) {
                    case (C.PM_ELF):
                        if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.ELVEN_ARROW)&&C.global("uwep").value))&&Number(C.i32(C.field(C.global("uwep").value,"obj","otyp").value)==C.ELVEN_BOW)))) ((multishot=C.i32((multishot+1)))-1);
                    break;
                    case (C.PM_ORC):
                        if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.ORCISH_ARROW)&&C.global("uwep").value))&&Number(C.i32(C.field(C.global("uwep").value,"obj","otyp").value)==C.ORCISH_BOW)))) ((multishot=C.i32((multishot+1)))-1);
                    break;
                    case (C.PM_GNOME):
                        /* arbitrary; there isn't any gnome-specific gear */
                        if(Number(C.i32(skill)==C.i32((-C.P_CROSSBOW)))) ((multishot=C.i32((multishot+1)))-1);
                    break;
                    case (C.PM_HUMAN):
                        case (C.PM_DWARF):
                            default:
                                break;
                    /* No bonus */
                }
                /* when launcher is own quest artifact, give extra +1 with any
               type of ammo appropriate for that launcher (compensates for
               elven and orcish rangers loss of bonus for use of racial bow
               plus racial arrows if they switch to the Longbow of Diana) */
                if(Number(!!(Number(!!(C.global("uwep").value&&C.i32(C.is_quest_artifact(C.global("uwep").value))))&&(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))))) (multishot=C.i32((multishot+1)));
            }
            /* crossbows are slow to load and probably shouldn't allow multiple
           shots at all, but that would result in players never using them;
           instead, high strength is necessary to load and shoot quickly */
            if(Number(!!(Number(!!(Number(!!(Number(multishot>1)&&Number(C.i32(skill)==C.i32((-C.P_CROSSBOW)))))&&(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))))&&Number(C.i32((C.acurrstr()))<(((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_GNOME)))?16:18)))))) (multishot=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),231,(C.literal("throw_obj"))),C.rnd(multishot))):C.rnd(multishot))));
            (multishot=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),233,(C.literal("throw_obj"))),C.rnd(multishot))):C.rnd(multishot))));
            if(Number(C.i64(multishot)>C.field(obj,"obj","quan").value)) (multishot=C.i32(C.field(obj,"obj","quan").value));
            if(Number(!!(Number(shotlimit>0)&&Number(multishot>shotlimit)))) (multishot=shotlimit);
        }
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","s").value=C.i8(((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
        /* give a message if shooting more than one, or if player
       attempted to specify a count */
        if(Number(!!(Number(multishot>1)||Number(shotlimit>0)))) {
            /* "You shoot N arrows." or "You throw N daggers." */
            C.variadic(5,C.literal("%s %d %s."),(C.i32(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","s").value)?C.literal("shoot"):C.literal("throw")),multishot,((Number(multishot==1))?C.singular(obj,C.nativeFunctionPointer("xname")):C.xname(obj)));
            /* (might be 1 if player gave shotlimit) */
        }
        (wep_mask=C.field(obj,"obj","owornmask").value);
        (oldslot=0);
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","o").value=C.field(obj,"obj","otyp").value);
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","n").value=multishot);
        for((C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value=1);Number(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value<=C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","n").value);((C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value=C.i32((C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value+1)))-1)) {
            (twoweap=C.field(C.u,"you","twoweap").value);
            ((Number(!!((Number(obj!=(0)))||((C.__assert_fail(C.literal("obj != NULL"),C.literal("dothrow.c"),256,(C.literal("throw_obj"))),0))))));
            /* m_shot.i <= m_shot.n guarantees this */
            /* split this object off from its slot if necessary */
            if(Number(C.field(obj,"obj","quan").value>1n)) {
                (otmp=C.splitobj(obj,1n));
            } else {
                (otmp=obj);
                if(C.field(otmp,"obj","owornmask").value) C.remove_worn_item(otmp,(C.i8(0)));
                (oldslot=C.field(obj,"obj","nobj").value);
                /* obj will leave inventory and may be freed by throwit, don't
               try to unsplit it from potential parent stack below */
                (obj=0);
            }
            C.freeinv(otmp);
            throwit(otmp,wep_mask,twoweap,oldslot);
            C.encumber_msg();
        }
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","n").value=(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value=0));
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","o").value=C.i16(C.STRANGE_OBJECT));
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","s").value=(C.i8(0)));
    }
    /* might need to undo an object split.
     * We used to use freeinv(obj),addinv(obj) here, but that can
     * merge obj into another stack--usually quiver--even if it hadn't
     * been split from there (possibly triggering a panic in addinv),
     * and freeinv+addinv potentially has other side-effects.
     */
    if(Number(!!(Number(!!(obj&&Number(obj!=C.global("uquiver").value)))&&(Number(!!(Number(C.field(obj,"obj","o_id").value==C.field(save_osplit,"obj_split","parent_oid").value)||Number(C.field(obj,"obj","o_id").value==C.field(save_osplit,"obj_split","child_oid").value))))))) {
        /* futureproofing: objsplit will have been affected if partial stack
           was thrown; objects will have been split off stack to throw. */
        C.copy(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,save_osplit,C.sizes["struct obj_split"]);
        C.unsplitobj(obj);
    }
    return res;
    } finally {C.stackRestore(stackFrame); }
}

/* common to dothrow() and dofire() */
export function ok_to_throw(shotlimit_p)
{
    shotlimit_p=C.ptr(shotlimit_p);
    /* (see dothrow()) */
    (C.cell(shotlimit_p,"int").value=(C.i32(((Number((C.field(C.gc,"instance_globals_c","command_count").value)<C.i64((0)))?C.i64((0)):(Number((C.field(C.gc,"instance_globals_c","command_count").value)>C.i64((32767)))?C.i64((32767)):(C.field(C.gc,"instance_globals_c","command_count").value)))))));
    (C.field(C.gm,"instance_globals_m","multi").value=C.i64(0));
    /* reset; it's been used up */
    if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(2048n))))!=C.u64(0n)))) {
        C.variadic(6,C.literal("are physically incapable of throwing or shooting anything."));
        return (C.i8(0));
    } else if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))) {
        C.variadic(7,C.literal("throw or shoot without hands."));
        /* not body_part(HAND) */
        return (C.i8(0));
        /*[what about !freehand(), aside from cursed missile launcher?]*/
    }
    if(C.check_capacity(0)) return (C.i8(0));
    return (C.i8(1));
}

/* getobj callback for object to be thrown */
export function throw_ok(obj)
{
    obj=C.ptr(obj);
    if(Number(!(obj))) return C.GETOBJ_EXCLUDE;
    if(Number(!!(C.i32(C.field(obj,"obj","bknown").value)&&C.welded(obj)))) return C.GETOBJ_DOWNPLAY;
    /* not a candidate if known to be stuck */
    if(Number(!!((Number(!!((Number(!!(Number((C.i64(((C.field(obj,"obj","owornmask").value)&256n)))!=C.i64(0))&&(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.AKLYS)||(Number(!!(Number(C.i32(C.field((obj),"obj","oartifact").value)==C.ART_MJOLLNIR)&&(Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_VALKYRIE))))))))))))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.BOOMERANG))))&&(Number(!!(Number(C.i32(C.field(obj,"obj","oartifact").value)!=C.ART_MJOLLNIR)||Number(C.i32((C.acurr(C.A_STR)))>=(C.i32((100+(25))))))))))) return C.GETOBJ_SUGGEST;
    /* to get here, obj is boomerang or is uwep and (alkys or Mjollnir) */
    if(Number(!!(Number(C.field(obj,"obj","quan").value==C.i64(1))&&(Number(!!(Number(obj==C.global("uwep").value)||(Number(!!(Number(obj==C.global("uswapwep").value)&&C.i32(C.field(C.u,"you","twoweap").value)))))))))) return C.GETOBJ_DOWNPLAY;
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) return C.GETOBJ_SUGGEST;
    if(Number(!!(Number(!((Number(!!(C.global("uwep").value&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_SLING))))))&&Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)))) return C.GETOBJ_SUGGEST;
    /* Possible extension: exclude weapons that make no sense to throw,
       such as whips, bows, slings, rubber hoses. */
    if(Number(!!((Number(!!(C.global("uwep").value&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_SLING))))&&Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)))) return C.GETOBJ_SUGGEST;
    if(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(134217728n))))!=C.u64(0n)))&&Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)))) return C.GETOBJ_SUGGEST;
    return C.GETOBJ_DOWNPLAY;
}

/* the #throw command */
export function dothrow()
{
    const stackFrame=C.stackSave();
    try {
    let obj;
    let shotlimit=C.local("int",0);
    /*
     * Since some characters shoot multiple missiles at one time,
     * allow user to specify a count prefix for 'f' or 't' to limit
     * number of items thrown (to avoid possibly hitting something
     * behind target after killing it, or perhaps to conserve ammo).
     *
     * Prior to 3.3.0, command ``3t'' meant ``t(shoot) t(shoot) t(shoot)''
     * and took 3 turns.  Now it means ``t(shoot at most 3 missiles)''.
     *
     * [3.6.0:  shot count setup has been moved into ok_to_throw().]
     */
    if(Number(!(ok_to_throw(shotlimit.address)))) return 0;
    (obj=C.getobj(C.literal("throw"),C.ownedFunctionPointer("throw_ok"),C.u32(C.i32((2|1)))));
    /* it is also possible to throw food */
    /* (or jewels, or iron balls... ) */
    return (obj?throw_obj(obj,shotlimit.value):2);
    } finally {C.stackRestore(stackFrame); }
}

/* KMH -- Automatically fill quiver */
/* Suggested by Jeffrey Bay <jbay@convex.hp.com> */
export function autoquiver()
{
    let otmp; let oammo=0; let omissile=0; let omisc=0; let altammo=0;
    if(C.global("uquiver").value) return;
    /* Scan through the inventory */
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(!!(Number(!!(C.field(otmp,"obj","owornmask").value||C.i32(C.field(otmp,"obj","oartifact").value)))||Number(!(C.field(otmp,"obj","dknown").value))))) {
            ;
            /* Skip it */
        } else if(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.ROCK)||(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FLINT)&&C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))))||(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.GEM_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)))&&C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))))) {
            /* seen rocks or known flint or known glass */
            if((Number(!!(C.global("uwep").value&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_SLING))))) (oammo=otmp);
 else if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uswapwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((otmp),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uswapwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) (altammo=otmp);
 else if(Number(!(omisc))) (omisc=otmp);
        } else if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.GEM_CLASS)) {
            ;
            /* skip non-rock gems--they're ammo but
                 player has to select them explicitly */
        } else if((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))) {
            if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((otmp),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) (oammo=otmp);
 else if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uswapwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((otmp),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uswapwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) (altammo=otmp);
 else (omisc=otmp);
            /* Ammo matched with launcher (bow+arrow, crossbow+bolt) */
            /* Mismatched ammo (no better than an ordinary weapon) */
        } else if((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_BOOMERANG)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_DART))))))) {
            /* Missile (dart, shuriken, etc.) */
            (omissile=otmp);
        } else if(Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)&&C.i32(throwing_weapon(otmp))))) {
            /* Ordinary weapon */
            if(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_DAGGER)&&Number(!(omissile))))) (omissile=otmp);
 else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AKLYS)) continue;
 else (omisc=otmp);
        }
    }
    /* Pick the best choice */
    if(oammo) C.setuqwep(oammo);
 else if(omissile) C.setuqwep(omissile);
 else if(altammo) C.setuqwep(altammo);
 else if(omisc) C.setuqwep(omisc);
    return;
}

/* look through hero inventory for launcher matching ammo,
   avoiding known cursed items. Returns NULL if no match. */
export function find_launcher(ammo)
{
    ammo=C.ptr(ammo);
    let otmp; let oX;
    if(Number(!(ammo))) return 0;
    for(((oX=0),(otmp=C.field(C.gi,"instance_globals_i","invent").value));otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(!!(C.i32(C.field(otmp,"obj","cursed").value)&&C.i32(C.field(otmp,"obj","bknown").value)))) continue;
        /* known to be cursed, so skip */
        if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(ammo,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(ammo,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(ammo,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(ammo,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((otmp)&&Number(C.i32(C.field((C.objects+Number(C.field((ammo),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((otmp),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) {
            if(C.field(otmp,"obj","bknown").value) return otmp;
            /* known-B or known-U (known-C won't get here) */
            if(Number(!(oX))) (oX=otmp);
            /* unknown-BUC; used if no known-BU item found */
        }
    }
    return oX;
}

/* the #fire command -- throw from the quiver or use wielded polearm */
export function dofire()
{
    const stackFrame=C.stackSave();
    try {
    let shotlimit=C.local("int",0);
    let obj;
    /* AutoReturn() verifies Valkyrie if weapon is Mjollnir, but it relies
       on its caller to make sure hero is strong enough to throw that */
    let uwep_Throw_and_Return=C.i8((Number(!!(Number(!!(C.global("uwep").value&&(Number(!!((Number(!!(Number((C.i64(((C.field(C.global("uwep").value,"obj","owornmask").value)&256n)))!=C.i64(0))&&(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","otyp").value)==C.AKLYS)||(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","oartifact").value)==C.ART_MJOLLNIR)&&(Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_VALKYRIE))))))))))))||Number(C.i32(C.field((C.global("uwep").value),"obj","otyp").value)==C.BOOMERANG))))))&&(Number(!!(Number(C.i32(C.field(C.global("uwep").value,"obj","oartifact").value)!=C.ART_MJOLLNIR)||Number(C.i32((C.acurr(C.A_STR)))>=(C.i32((100+(25)))))))))))); let skip_fireassist=(C.i8(0));
    let altres; let res=0;
    /*
     * Same as dothrow(), except we use quivered missile instead
     * of asking what to throw/shoot.  [Note: with the advent of
     * fireassist that is no longer accurate...]
     *
     * If hero is wielding a thrown-and-return weapon and quiver
     * is empty or contains ammo, use the wielded weapon (won't
     * have any ammo's launcher wielded due to the weapon).
     * If quiver is empty, use autoquiver to fill it when the
     * corresponding option is on.
     * If option is off or autoquiver doesn't select anything,
     * we ask what to throw.
     * Then we put the chosen item into the quiver slot unless
     * it is already in another slot.  [Matters most if it is a
     * stack but also matters for single item if this throw gets
     * aborted (ESC at the direction prompt).]
     */
    if(Number(!(ok_to_throw(shotlimit.address)))) return 0;
    (obj=C.global("uquiver").value);
    /* if wielding a throw-and-return weapon, throw it if quiver is empty
       or has ammo rather than missiles [since the throw/return weapon is
       wielded, the ammo's launcher isn't; the ammo-only policy avoids
       throwing Mjollnir if quiver contains daggers] */
    if(Number(!!(C.i32(uwep_Throw_and_Return)&&(Number(!!(Number(!(obj))||(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW)))))))))))) {
        (obj=C.global("uwep").value);
        (skip_fireassist=(C.i8(1)));
    } else if(Number(!(obj))) {
        if(Number(!(C.field(C.flags,"flag","autoquiver").value))) {
            /* if we're wielding a polearm, apply it */
            if(Number(!!(C.global("uwep").value&&(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.TOOL_CLASS))))&&(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_POLEARMS)||Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_LANCE)))||C.i32(C.is_art(C.global("uwep").value,C.ART_SNICKERSNEE))))))))))) {
                return C.use_pole(C.global("uwep").value,(C.i8(1)));
                /* if we're wielding a bullwhip, apply it */
            } else if(Number(!!(C.global("uwep").value&&Number(C.i32(C.field(C.global("uwep").value,"obj","otyp").value)==C.BULLWHIP)))) {
                return C.use_whip(C.global("uwep").value);
            } else if(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.iflags,"instance_flags","fireassist").value)&&C.global("uswapwep").value))&&(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uswapwep").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uswapwep").value,"obj","oclass").value)==C.TOOL_CLASS))))&&(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(C.global("uswapwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_POLEARMS)||Number(C.i32(C.field((C.objects+Number(C.field(C.global("uswapwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_LANCE)))||C.i32(C.is_art(C.global("uswapwep").value,C.ART_SNICKERSNEE))))))))))&&Number(!((Number(!!(C.i32(C.field(C.global("uswapwep").value,"obj","cursed").value)&&C.i32(C.field(C.global("uswapwep").value,"obj","bknown").value))))))))) {
                /* we have a known not-cursed polearm as swap weapon.
                   swap to it and retry */
                C.cmdq_add_ec(C.CQ_CANNED,C.nativeFunctionPointer("doswapweapon"));
                C.cmdq_add_ec(C.CQ_CANNED,C.ownedFunctionPointer("dofire"));
                return 0;
                /* haven't taken any time yet */
            } else {
                C.variadic(8,C.literal("have no ammunition readied."));
            }
        } else {
            autoquiver();
            (obj=C.global("uquiver").value);
            if(obj) {
                /* give feedback if quiver has now been filled */
                (C.field(C.global("uquiver").value,"obj","owornmask").value=C.i64(C.field(C.global("uquiver").value,"obj","owornmask").value&C.i64((~512n))));
                /* less verbose */
                C.prinv(C.literal("You ready:"),obj,0n);
                (C.field(C.global("uquiver").value,"obj","owornmask").value=C.i64(C.field(C.global("uquiver").value,"obj","owornmask").value|512n));
            } else {
                C.variadic(9,C.literal("have nothing appropriate for your quiver."));
            }
        }
    }
    /* if autoquiver is disabled or has failed, prompt for missile */
    if(Number(!(obj))) {
        /* in case we're using ^A to repeat prior 'f' command, don't
           use direction of previous throw as getobj()'s choice here */
        (C.field(C.gi,"instance_globals_i","in_doagain").value=0);
        /* this gives its own feedback about populating the quiver slot */
        (res=C.doquiver_core(C.literal("fire")));
        if(Number(!!(Number(res!=0)&&Number(res!=1)))) return res;
        (obj=C.global("uquiver").value);
    }
    if(Number(!!(Number(!!(Number(!!(C.global("uquiver").value&&(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uquiver").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uquiver").value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uquiver").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uquiver").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))))&&C.i32(C.field(C.iflags,"instance_flags","fireassist").value)))&&Number(!(skip_fireassist))))) {
        let olauncher;
        if(Number(!!(Number(!!(C.global("uwep").value&&(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.TOOL_CLASS))))&&(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_POLEARMS)||Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_LANCE)))||C.i32(C.is_art(C.global("uwep").value,C.ART_SNICKERSNEE))))))))))&&C.i32(C.could_pole_mon())))) return C.use_pole(C.global("uwep").value,(C.i8(1)));
        /* Try to find a launcher */
        if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uquiver").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uquiver").value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uquiver").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uquiver").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((C.global("uquiver").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) {
            (obj=C.global("uquiver").value);
        } else if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uquiver").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uquiver").value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uquiver").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uquiver").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uswapwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((C.global("uquiver").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uswapwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) {
            /* swap weapons and retry fire */
            C.cmdq_add_ec(C.CQ_CANNED,C.nativeFunctionPointer("doswapweapon"));
            C.cmdq_add_ec(C.CQ_CANNED,C.ownedFunctionPointer("dofire"));
            return res;
        } else if(Number(((olauncher=find_launcher(C.global("uquiver").value)))!=0)) {
            /* wield launcher, retry fire */
            if(Number(!!(C.global("uwep").value&&Number(!(C.field(C.flags,"flag","pushweapon").value))))) C.cmdq_add_ec(C.CQ_CANNED,C.nativeFunctionPointer("doswapweapon"));
            C.cmdq_add_ec(C.CQ_CANNED,C.nativeFunctionPointer("dowield"));
            C.cmdq_add_key(C.CQ_CANNED,C.field(olauncher,"obj","invlet").value);
            C.cmdq_add_ec(C.CQ_CANNED,C.ownedFunctionPointer("dofire"));
            return res;
        }
    }
    (altres=(obj?throw_obj(obj,shotlimit.value):2));
    /* fire can take time by filling quiver (if that causes something which
       was wielded to be unwielded) even if the throw itself gets cancelled */
    return ((Number(res==1))?res:altres);
    } finally {C.stackRestore(stackFrame); }
}

/* if in midst of multishot shooting/throwing, stop early */
export function endmultishot(verbose)
{
    verbose=C.i8(verbose);
    if(Number(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value<C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","n").value)) {
        if(Number(!!(C.i32(verbose)&&Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))))) {
            C.variadic(10,C.literal("stop %s after the %d%s %s."),(C.i32(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","s").value)?C.literal("firing"):C.literal("throwing")),C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value,C.ordin(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value),(C.i32(C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","s").value)?C.literal("shot"):C.literal("toss")));
        }
        (C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","n").value=C.field(C.field(C.gm,"instance_globals_m","m_shot").address,"multishot","i").value);
        /* make current shot be the last */
    }
}

/* Object hits floor at hero's feet.
   Called from drop(), throwit(), hold_another_object(), litter(). */
export function hitfloor(obj,verbosely)
{
    obj=C.ptr(obj);
    verbosely=C.i8(verbosely);
    /* usually True; False if caller has given drop mesg */
    if(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.AIR)||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.CLOUD)))||(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))>=C.POOL)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))<=C.DRAWBRIDGE_UP)))))))||C.i32(C.field(C.u,"you","uinwater").value)))||C.i32(C.field(C.u,"you","uswallow").value)))) {
        C.dropy(obj);
        return;
    }
    if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))) {
        C.doaltarobj(obj);
    } else if(verbosely) {
        let verb=((Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_STRIKING))?C.literal("strike"):C.literal("hit"));
        let surf=C.surface(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        let t=C.t_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        /* describe something that might keep the object where it is
           or precede next message stating that it falls */
        if(Number(!!(t&&C.i32(C.field(t,"trap","tseen").value)))) {
            switch(C.i32(C.field(t,"trap","ttyp").value)) {
                case (C.TRAPDOOR):
                    (surf=C.literal("trap door"));
                break;
                case (C.HOLE):
                    (surf=C.literal("edge of the hole"));
                break;
                case (C.PIT):
                    case (C.SPIKED_PIT):
                        (surf=C.literal("edge of the pit"));
                break;
                default:
                    break;
            }
        }
        C.variadic(11,C.literal("%s %s the %s."),C.Doname2(obj),C.otense(obj,verb),surf);
    }
    if(hero_breaks(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.u32(2))) return;
    if(C.ship_object(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(C.i8(0)))) return;
    C.dropz(obj,(C.i8(1)));
}

/*
 * Walk a path from src_cc to dest_cc, calling a proc for each location
 * except the starting one.  If the proc returns FALSE, stop walking
 * and return FALSE.  If stopped early, dest_cc will be the location
 * before the failed callback.
 */
export function walk_path(src_cc,dest_cc,check_proc,arg)
{
    src_cc=C.ptr(src_cc);
    dest_cc=C.ptr(dest_cc);
    check_proc=C.ptr(check_proc);
    arg=C.ptr(arg);
    let err;
    let x; let y; let dx; let dy; let x_change; let y_change; let i; let prev_x; let prev_y;
    let keep_going=(C.i8(1));
    /* Use Bresenham's Line Algorithm to walk from src to dest.
     *
     * This should be replaced with a more versatile algorithm
     * since it handles slanted moves in a suboptimal way.
     * Going from 'x' to 'y' needs to pass through 'z', and will
     * fail if there's an obstacle there, but it could choose to
     * pass through 'Z' instead if that way imposes no obstacle.
     *     ..y          .Zy
     *     xz.    vs    x..
     * Perhaps we should check both paths and accept whichever
     * one isn't blocked.  But then multiple zigs and zags could
     * potentially produce a meandering path rather than the best
     * attempt at a straight line.  And (*check_proc)() would
     * need to work more like 'travel', distinguishing between
     * testing a possible move and actually attempting that move.
     */
    (dx=C.i16(C.i32((C.i32(C.field(dest_cc,"nhcoord","x").value)-C.i32(C.field(src_cc,"nhcoord","x").value)))));
    (dy=C.i16(C.i32((C.i32(C.field(dest_cc,"nhcoord","y").value)-C.i32(C.field(src_cc,"nhcoord","y").value)))));
    (prev_x=(x=C.field(src_cc,"nhcoord","x").value));
    (prev_y=(y=C.field(src_cc,"nhcoord","y").value));
    if(Number(C.i32(dx)<0)) {
        (x_change=C.i16(C.i32((-1))));
        (dx=C.i16(C.i32((-C.i32(dx)))));
    } else {
        (x_change=C.i16(1));
    }
    if(Number(C.i32(dy)<0)) {
        (y_change=C.i16(C.i32((-1))));
        (dy=C.i16(C.i32((-C.i32(dy)))));
    } else {
        (y_change=C.i16(1));
    }
    (i=C.i16((err=0)));
    if(Number(C.i32(dx)<C.i32(dy))) {
        while(Number(C.i32(((i=C.i16((i+1)))-1))<C.i32(dy))) {
            (prev_x=x);
            (prev_y=y);
            (y=C.i16(y+C.i32(y_change)));
            (err=C.i32(err+C.i32((C.i32(dx)<<1))));
            if(Number(err>C.i32(dy))) {
                (x=C.i16(x+C.i32(x_change)));
                (err=C.i32(err-C.i32((C.i32(dy)<<1))));
            }
            /* check for early exit condition */
            if(Number(!(((keep_going=C.indirect(0,(check_proc),arg,x,y)))))) break;
        }
    } else {
        while(Number(C.i32(((i=C.i16((i+1)))-1))<C.i32(dx))) {
            (prev_x=x);
            (prev_y=y);
            (x=C.i16(x+C.i32(x_change)));
            (err=C.i32(err+C.i32((C.i32(dy)<<1))));
            if(Number(err>C.i32(dx))) {
                (y=C.i16(y+C.i32(y_change)));
                (err=C.i32(err-C.i32((C.i32(dx)<<1))));
            }
            /* check for early exit condition */
            if(Number(!(((keep_going=C.indirect(1,(check_proc),arg,x,y)))))) break;
        }
    }
    if(keep_going) return (C.i8(1));
    /* successful */
    (C.field(dest_cc,"nhcoord","x").value=prev_x);
    (C.field(dest_cc,"nhcoord","y").value=prev_y);
    return (C.i8(0));
}

/* hack for hurtle_step() -- it ought to be changed to take an argument
   indicating lev/fly-to-dest vs lev/fly-to-dest-minus-one-land-on-dest
   vs drag-to-dest; original callers use first mode, jumping wants second,
   grappling hook backfire and thrown chained ball need third */
export function hurtle_jump(arg,x,y)
{
    arg=C.ptr(arg);
    x=C.i16(x);
    y=C.i16(y);
    let res;
    let save_EWwalking=C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","extrinsic").value;
    /* prevent jumping over water from being placed in that water */
    (C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","extrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","extrinsic").value|536870912n));
    (res=hurtle_step(arg,x,y));
    (C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","extrinsic").value=save_EWwalking);
    return res;
}

/*
 * Single step for the hero flying through the air from jumping, flying,
 * etc.  Called from hurtle() and jump() via walk_path().  We expect the
 * argument to be a pointer to an integer -- the range -- which is
 * used in the calculation of points off if we hit something.
 *
 * Bumping into monsters won't cause damage but will wake them and make
 * them angry.  Auto-pickup isn't done, since you don't have control over
 * your movements at the time.
 *
 * Possible additions/changes:
 *      o really attack monster if we hit one
 *      o set stunned if we hit a wall or door
 *      o reset nomul when we stop
 *      o creepy feeling if pass through monster (if ever implemented...)
 *      o bounce off walls
 *      o let jumps go over boulders
 */
export function hurtle_step(arg,x,y)
{
    arg=C.ptr(arg);
    x=C.i16(x);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    try {
    let ox; let oy;
    let range=arg;
    let obj;
    let mon;
    let may_pass=(C.i8(1)); let via_jumping; let stopping_short;
    let ttmp;
    let lev;
    let ltyp; let dmg=0;
    if(Number(!(C.isok(x,y)))) {
        C.variadic(12,C.literal("the spirits holding you back."));
        return (C.i8(0));
    } else if(Number(!(C.in_out_region(x,y)))) {
        return (C.i8(0));
    } else if(Number(C.cell(range,"int").value==0)) {
        return (C.i8(0));
        /* previous step wants to stop now */
    }
    (via_jumping=C.i8(Number((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","extrinsic").value&536870912n)))!=0n)));
    (stopping_short=C.i8((Number(!!(C.i32(via_jumping)&&Number(C.cell(range,"int").value<2))))));
    (lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
    (ltyp=C.i32(C.field(lev,"rm","typ").value));
    if(Number(!!(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","extrinsic").value)))))||Number(!(((may_pass=C.may_passwall(x,y)))))))) {
        let why=0;
        let diagonal=C.i8(Number(!!(Number((C.i32((C.i32(C.field(C.u,"you","ux").value)-C.i32(x))))!=0)&&Number((C.i32((C.i32(C.field(C.u,"you","uy").value)-C.i32(y))))!=0)))); let open_door=C.i8(Number(!!((Number((ltyp)==C.DOOR))&&Number((C.i32((C.i32(C.field(lev,"rm","flags").value)&2)))!=0)))); let odoor_diag=C.i8(Number(!!(C.i32(open_door)&&C.i32(diagonal))));
        if(Number(!!(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))||C.i32(C.closed_door(x,y))))||C.i32(odoor_diag)))) {
            (why=((Number(!!(Number((ltyp)==C.TREE)||(Number(!!(C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value)&&Number((ltyp)==C.STONE)))))))?C.literal("bumping into a tree"):((Number((ltyp)<C.POOL))?C.literal("bumping into a wall"):(C.i32(odoor_diag)?C.literal("bumping into a door frame"):C.literal("bumping into a closed door")))));
            if(odoor_diag) C.variadic(13,C.literal("hit the door frame!"));
            C.variadic(14,C.literal("Ouch!"));
        } else if(Number(ltyp==C.IRONBARS)) {
            (why=C.literal("crashing into iron bars"));
            C.variadic(15,C.literal("crash into some iron bars.  Ouch!"));
        } else if(Number(((obj=C.sobj_at(C.BOULDER,x,y)))!=0)) {
            (why=C.literal("bumping into a boulder"));
            C.variadic(16,C.literal("bump into a %s.  Ouch!"),C.xname(obj));
        } else if(Number(!(may_pass))) {
            /* did we hit a no-dig non-wall position? */
            (why=C.literal("touching the edge of the universe"));
            C.variadic(17,C.literal("smack into something!"));
        } else if(Number(!!(Number(!!(C.i32(diagonal)&&C.i32(C.bad_rock(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,C.field(C.u,"you","ux").value,y))))&&C.i32(C.bad_rock(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,x,C.field(C.u,"you","uy").value))))) {
            let too_much=C.i8((Number(!!(C.field(C.gi,"instance_globals_i","invent").value&&(Number(C.i32((C.inv_weight()+C.weight_cap()))>C.WT_TOOMUCH_DIAGONAL))))));
            if(Number(!!((Number(C.i32(C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","msize").value)>=3))||C.i32(too_much)))) {
                (why=C.literal("wedging into a narrow crevice"));
                C.variadic(18,C.literal("%sget forcefully wedged into a crevice."),(C.i32(too_much)?C.literal("and all your belongings "):C.literal("")));
            }
        }
        if(why) {
            (dmg=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),835,(C.literal("hurtle_step"))),C.rnd(C.i32((2+C.cell(range,"int").value))))):C.rnd(C.i32((2+C.cell(range,"int").value))))));
            C.losehp(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","extrinsic").value))))?(C.i32(Math.trunc(((C.i32(((dmg)+1)))/2)))):(dmg))),why,C.i8(1));
            C.wake_nearto(x,y,10);
            return (C.i8(0));
        }
    }
    if(Number(((mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) {
        /* we can't include these two exceptions unless we know we're
         * going to end up past the current spot rather than on it;
         * for that, we need to know that the range is not exhausted
         * and also that the next spot doesn't contain an obstacle */
        let mnam;
        let glyph=C.glyph_at(x,y);
        (C.field(mon,"monst","mundetected").value=C.u32(0));
        /* wakeup() will handle mimic */
        /* after unhiding; combination of a_monnam() and some_mon_nam();
           yields "someone" or "something" instead of "it" for unseen mon */
        (mnam=C.x_monnam(mon,2,0,(C.i32(((((Number(!!(C.field((mon),"monst","mextra").value&&(C.field(C.field((mon),"monst","mextra").value,"mextra","mgivenname").value))))?8:0))|64))),(C.i8(0))));
        if(Number(!!(Number(!((Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((glyph)>=C.GLYPH_MON_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_MON_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_PET_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_PET_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))))))))))&&Number(!((Number((glyph)==C.GLYPH_INVIS_OFF))))))) C.variadic(19,C.literal("find %s by bumping into %s."),mnam,(C.field((C.genders+Number(C.pronoun_gender(mon,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","him").value));
 else C.variadic(20,C.literal("bump into %s."),mnam);
        C.wakeup(mon,(C.i8(0)));
        if(Number(!((Number(!!(C.canseemon(mon)||C.sensemon(mon))))))) C.map_invisible(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
        C.setmangry(mon,(C.i8(0)));
        if(Number(!!(Number(!!(Number(!!((Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))&&Number(!(C.global("uarmu").value))))&&Number(!(C.global("uarm").value))))&&Number(!(C.global("uarmc").value))))) {
            /* this is a bodily collision, so check for body armor */
            C.variadic(21,C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address,C.literal("bumping into %s"),C.an(C.pmname(C.field(mon,"monst","data").value,C.NEUTRAL)));
            C.instapetrify(C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address);
        }
        if(Number(!!((Number(!!(Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))&&Number(!(C.which_armor(mon,C.i64((C.i64((64n|1n))|2n)))))))) {
            C.minstapetrify(mon,(C.i8(1)));
        }
        C.wake_nearto(x,y,10);
        return (C.i8(0));
    }
    if(Number(!!(Number(!!(Number(!!((C.i32((C.i32(C.field(C.u,"you","ux").value)-C.i32(x))))&&(C.i32((C.i32(C.field(C.u,"you","uy").value)-C.i32(y))))))&&C.i32(C.bad_rock(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,C.field(C.u,"you","ux").value,y))))&&C.i32(C.bad_rock(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,x,C.field(C.u,"you","uy").value))))) {
        /* Move at a diagonal. */
        if(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value) {
            C.variadic(22,C.literal("come to an abrupt halt!"));
            return (C.i8(0));
        }
    }
    /* caller has already determined that dragging the ball is allowed;
       if ball is carried we might still need to drag the chain */
    if((Number(C.global("uball").value!=0))) {
        let bc_control=C.local("int",0);
        let ballx=C.local("short",0); let bally=C.local("short",0); let chainx=C.local("short",0); let chainy=C.local("short",0);
        let cause_delay=C.local("signed char",0);
        if(C.drag_ball(x,y,bc_control.address,ballx.address,bally.address,chainx.address,chainy.address,cause_delay.address,(C.i8(1)))) C.move_bc(0,bc_control.value,ballx.value,bally.value,chainx.value,chainy.value);
    }
    (ox=C.field(C.u,"you","ux").value);
    (oy=C.field(C.u,"you","uy").value);
    C.u_on_newpos(x,y);
    /* set u.<ux,uy>, u.usteed-><mx,my>; cliparound(); */
    C.newsym(ox,oy);
    /* update old position */
    C.vision_recalc(1);
    /* update for new position */
    C.flush_screen(1);
    /* if terrain type changes, levitation or flying might become blocked
       or unblocked; might issue message, so do this after map+vision has
       been updated for new location instead of right after u_on_newpos() */
    if(Number(ltyp!=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(ox)*(C.sizes["struct rm"]*21))+Number(oy)*C.sizes["struct rm"]),"rm","typ").value))) C.switch_terrain();
    /* might be entering a special room (treasure zoo, thrown room, &c) that
       has a first-time entry message, or leaving shop with unpaid goods */
    C.check_special_room((C.i8(0)));
    if(Number(!!(C.i32(C.is_pool(x,y))&&Number(!(C.field(C.u,"you","uinwater").value))))) {
        if(Number(!!(C.i32(C.is_waterwall(x,y))||Number(!((Number(!!(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))||(Number(!!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","extrinsic").value))||(Number(!!(C.field(C.u,"you","usteed").value&&(Number((C.u64((C.field((C.field(C.field(C.u,"you","usteed").value,"monst","data").value),"permonst","mflags1").value&C.u64(1n))))!=C.u64(0n)))))))))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.WWALKING)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))))))))))))) {
            /* couldn't move while hurtling; allow movement now so that
               drown() will give a chance to crawl out of pool and survive */
            (C.field(C.gm,"instance_globals_m","multi").value=C.i64(0));
            C.drown();
            return (C.i8(0));
        } else if(Number(!!(Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))&&Number(!(stopping_short))))) {
            C.variadic(23,C.literal("You move over %s."),C.an((C.i32(C.is_moat(x,y))?C.literal("moat"):C.literal("pool"))));
        }
    } else if(Number(!!(C.i32(C.is_lava(x,y))&&Number(!(stopping_short))))) {
        C.variadic(24,C.literal("You move over some lava."));
    }
    /* FIXME:
     * Each trap should really trigger on the recoil if it would
     * trigger during normal movement. However, not all the possible
     * side-effects of this are tested [as of 3.4.0] so we trigger
     * those that we have tested, and offer a message for the ones
     * that we have not yet tested.
     */
    if(Number(((ttmp=C.t_at(x,y)))!=0)) {
        if(stopping_short) {
            ;
            /* see the comment above hurtle_jump() */
        } else if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.MAGIC_PORTAL)) {
            C.dotrap(ttmp,0);
            return (C.i8(0));
        } else if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.VIBRATING_SQUARE)) {
            C.variadic(25,C.literal("The ground vibrates as you pass it."));
            C.dotrap(ttmp,0);
            /* doesn't print messages */
        } else if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.FIRE_TRAP)) {
            C.dotrap(ttmp,0);
        } else if(Number(!!((Number(!!((Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.SPIKED_PIT))))||(Number(!!(Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.HOLE)||Number(C.i32((C.field(ttmp,"trap","ttyp").value))==C.TRAPDOOR)))))))&&C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value)))) {
            /* air currents overcome the recoil in Sokoban;
               when jumping, caller performs last step and enters trap */
            if(Number(!(via_jumping))) C.dotrap(ttmp,0);
            (C.cell(range,"int").value=0);
            return (C.i8(1));
        } else {
            if(C.field(ttmp,"trap","tseen").value) C.variadic(26,C.literal("pass right over %s."),C.an(C.trapname(C.i32(C.field(ttmp,"trap","ttyp").value),(C.i8(0)))));
        }
    }
    if(Number((C.cell(range,"int").value=C.i32((C.cell(range,"int").value-1)))<0)) (C.cell(range,"int").value=0);
    /* make sure our range never goes negative */
    if(Number(C.cell(range,"int").value!=0)) C.indirect(2,(C.field(C.windowprocs,"window_procs","win_delay_output").value));
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* used by mhurtle_step() for actual hurtling and also to vary message
   if target will/won't change location when knocked back */
export function will_hurtle(mon,x,y)
{
    mon=C.ptr(mon);
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!(C.isok(x,y)))) return (C.i8(0));
    /* redundant when called by mhurtle() but needed for mhitm_knockback() */
    if(Number(!!(Number(!!(Number(C.i32(C.field(C.field(mon,"monst","data").value,"permonst","msize").value)>=4)||Number(mon==C.field(C.u,"you","ustuck").value)))||C.i32(C.field(mon,"monst","mtrapped").value)))) return (C.i8(0));
    /*
     * TODO: Treat walls, doors, iron bars, etc. specially
     * rather than just stopping before.
     */
    return C.goodpos(x,y,mon,C.u32(C.i64((8n|524288n))));
}

export function mhurtle_step(arg,x,y)
{
    arg=C.ptr(arg);
    x=C.i16(x);
    y=C.i16(y);
    let mon=arg;
    let mtmp;
    if(Number(!(C.isok(x,y)))) return (C.i8(0));
    if(Number(!!(C.i32(will_hurtle(mon,x,y))&&C.i32(C.m_in_out_region(mon,x,y))))) {
        let res;
        if(Number(mon!=C.field(C.u,"you","usteed").value)) {
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(mon,"monst","mx").value)*(8*21))+Number(C.field(mon,"monst","my").value)*8),"struct monst *").value=0);
            C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
            C.place_monster(mon,x,y);
            C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
        } else {
            /* steed is hurtling, move hero which will also move steed */
            ((C.field(C.u,"you","ux0").value=C.field(C.u,"you","ux").value),(C.field(C.u,"you","uy0").value=C.field(C.u,"you","uy").value));
            C.u_on_newpos(x,y);
            C.newsym(C.field(C.u,"you","ux0").value,C.field(C.u,"you","uy0").value);
            /* update old position */
            C.vision_recalc(0);
            /* new location => different lines of sight */
        }
        C.flush_screen(1);
        C.indirect(3,(C.field(C.windowprocs,"window_procs","win_delay_output").value));
        C.set_apparxy(mon);
        if(C.is_waterwall(x,y)) return (C.i8(0));
        (res=C.mintrap(mon,128));
        if(Number(!!(Number(!!(Number(res==C.Trap_Killed_Mon)||Number(res==C.Trap_Caught_Mon)))||Number(res==C.Trap_Moved_Mon)))) return (C.i8(0));
        return (C.i8(1));
    }
    if(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&Number(mtmp!=mon)))) {
        if(Number(!!(C.canseemon(mon)||C.canseemon(mtmp)))) C.variadic(27,C.literal("%s bumps into %s."),C.Monnam(mon),C.a_monnam(mtmp));
        C.wakeup(mtmp,C.i8(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))));
        /* check whether 'mon' is turned to stone by touching 'mtmp' */
        if(Number(!!((Number(!!(Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number((C.field(mtmp,"monst","data").value)==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))&&Number(!(C.which_armor(mon,C.i64((C.i64((64n|1n))|2n)))))))) {
            C.minstapetrify(mon,C.i8(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))));
            C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
        }
        /* and whether 'mtmp' is turned to stone by being touched by 'mon' */
        if(Number(!!((Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))&&Number(!(C.which_armor(mtmp,C.i64((C.i64((64n|1n))|2n)))))))) {
            C.minstapetrify(mtmp,C.i8(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))));
            C.newsym(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        }
    } else if((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))) {
        /* a monster has caused 'mon' to hurtle against hero */
        C.variadic(28,C.literal("%s bumps into you."),C.Some_Monnam(mon));
        C.stop_occupation();
        /* check whether 'mon' is turned to stone by touching poly'd hero */
        if(Number(!!(Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))&&(Number(!!(Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))))&&Number(!(C.which_armor(mon,C.i64((C.i64((64n|1n))|2n)))))))) {
            /* give poly'd hero credit/blame despite a monster causing it */
            C.minstapetrify(mon,(C.i8(1)));
            C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
        }
        /* and whether hero is turned to stone by being touched by 'mon' */
        if(Number(!!((Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))&&Number(!((Number(!!(Number(!!(C.global("uarmu").value||C.global("uarm").value))||C.global("uarmc").value)))))))) {
            C.variadic(29,(C.literal("mhurtle_step")),1061,C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address,BigInt((1*256)),C.literal("being hit by %s"),C.x_monnam(mon,(C.i32(C.field(mon,"monst","mtame").value)?3:2),C.literal("hurtling"),C.i32((31|32)),(C.i8(0))));
            /* combine m_monnam() and noname_monnam():
                        "{your,a} hurtling cockatrice" w/o assigned name */
            C.instapetrify(C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address);
            C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        }
    }
    return (C.i8(0));
}

/*
 * The player moves through the air for a few squares as a result of
 * throwing or kicking something.
 *
 * dx and dy should be the direction of the hurtle, not of the original
 * kick or throw.
 */
export function hurtle(dx,dy,range,verbose)
{
    dx=C.i32(dx);
    dy=C.i32(dy);
    range=C.i32(range);
    verbose=C.i8(verbose);
    const stackFrame=C.stackSave();
    try {
    range=C.local("int",range);
    let uc=C.stackAlloc(C.sizes["struct nhcoord"]); let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    /* The chain is stretched vertically, so you shouldn't be able to move
     * very far diagonally.  The premise that you should be able to move one
     * spot leads to calculations that allow you to only move one spot away
     * from the ball, if you are levitating over the ball, or one spot
     * towards the ball, if you are at the end of the chain.  Rather than
     * bother with all of that, assume that there is no slack in the chain
     * for diagonal movement, give the player a message and return.
     */
    if(Number(!!((Number(C.global("uball").value!=0))&&Number(!((Number(C.i32(C.field((C.global("uball").value),"obj","where").value)==3))))))) {
        C.variadic(30,C.literal("a tug from the iron ball."));
        C.nomul(0);
        return;
    } else if(C.field(C.u,"you","utrap").value) {
        C.variadic(31,C.literal("are anchored by the %s."),((Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_WEB)))?C.literal("web"):((Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_LAVA)))?C.hliquid(C.literal("lava")):((Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_INFLOOR)))?C.surface(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value):((Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_BURIEDBALL)))?C.literal("buried ball"):C.literal("trap"))))));
        C.nomul(0);
        return;
    }
    /* make sure dx and dy are [-1,0,1] */
    (dx=C.sgn(dx));
    (dy=C.sgn(dy));
    if(Number(!!(Number(!!(Number(!(range.value))||(Number(!!(Number(!(dx))&&Number(!(dy)))))))||C.field(C.u,"you","ustuck").value))) return;
    /* paranoia */
    C.nomul(C.i32((-range.value)));
    (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("moving through the air"));
    (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal(""));
    /* it just happens */
    if(verbose) C.variadic(32,C.literal("%s in the opposite direction."),((Number(range.value>1))?C.literal("hurtle"):C.literal("float")));
    /* if we're in the midst of shooting multiple projectiles, stop */
    endmultishot((C.i8(1)));
    (C.field(uc,"nhcoord","x").value=C.field(C.u,"you","ux").value);
    (C.field(uc,"nhcoord","y").value=C.field(C.u,"you","uy").value);
    /* this setting of cc is only correct if dx and dy are [-1,0,1] only */
    (C.field(cc,"nhcoord","x").value=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+(C.i32((dx*range.value)))))));
    (C.field(cc,"nhcoord","y").value=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+(C.i32((dy*range.value)))))));
    walk_path(uc,cc,C.ownedFunctionPointer("hurtle_step"),range.address);
    } finally {C.stackRestore(stackFrame); }
}

/* Move a monster through the air for a few squares. */
export function mhurtle(mon,dx,dy,range)
{
    mon=C.ptr(mon);
    dx=C.i32(dx);
    dy=C.i32(dy);
    range=C.i32(range);
    const stackFrame=C.stackSave();
    try {
    let mc=C.stackAlloc(C.sizes["struct nhcoord"]); let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    C.wakeup(mon,C.i8(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))));
    /* At the very least, debilitate the monster */
    (C.field(mon,"monst","movement").value=C.i16(0));
    (C.field(mon,"monst","mstun").value=C.u32(1));
    /* Is the monster stuck or too heavy to push?
     * (very large monsters have too much inertia, even floaters and flyers)
     */
    if(Number(!!(Number(!!(Number(C.i32(C.field(C.field(mon,"monst","data").value,"permonst","msize").value)>=4)||Number(mon==C.field(C.u,"you","ustuck").value)))||C.i32(C.field(mon,"monst","mtrapped").value)))) {
        if(C.canseemon(mon)) C.variadic(33,C.literal("%s doesn't budge!"),C.Monnam(mon));
        return;
    }
    /* Make sure dx and dy are [-1,0,1] */
    (dx=C.sgn(dx));
    (dy=C.sgn(dy));
    if(Number(!!(Number(!(range))||(Number(!!(Number(!(dx))&&Number(!(dy)))))))) return;
    /* paranoia */
    /* don't let grid bugs be hurtled diagonally */
    if(Number(!!(Number(!!(dx&&dy))&&(Number(C.i32(((C.field((C.field(mon,"monst","data").value),"permonst","pmidx").value)))==C.PM_GRID_BUG))))) return;
    /* undetected monster can be moved by your strike */
    if(C.field(mon,"monst","mundetected").value) {
        (C.field(mon,"monst","mundetected").value=C.u32(0));
        C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
    }
    if((C.i32((C.i32(C.field((mon),"monst","m_ap_type").value)&7)))) C.seemimic(mon);
    /* Send the monster along the path */
    (C.field(mc,"nhcoord","x").value=C.field(mon,"monst","mx").value);
    (C.field(mc,"nhcoord","y").value=C.field(mon,"monst","my").value);
    (C.field(cc,"nhcoord","x").value=C.i16(C.i32((C.i32(C.field(mon,"monst","mx").value)+(C.i32((dx*range)))))));
    (C.field(cc,"nhcoord","y").value=C.i16(C.i32((C.i32(C.field(mon,"monst","my").value)+(C.i32((dy*range)))))));
    walk_path(mc,cc,C.ownedFunctionPointer("mhurtle_step"),mon);
    if(Number(!((Number(C.field((mon),"monst","mhp").value<1))))) {
        if(C.t_at(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value)) C.mintrap(mon,4);
 else C.minliquid(mon);
    }
    return;
    } finally {C.stackRestore(stackFrame); }
}

export function check_shop_obj(obj,x,y,broken)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    broken=C.i8(broken);
    let costly_xy;
    let shkp=C.shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value);
    if(Number(!(shkp))) return;
    (costly_xy=C.costly_spot(x,y));
    if(Number(!!(Number(!!(C.i32(broken)||Number(!(costly_xy))))||Number(C.i32(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value)!=C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value))))) {
        /* thrown out of a shop or into a different shop */
        if(C.is_unpaid(obj)) C.stolen_value(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.i8(C.field(shkp,"monst","mpeaceful").value),(C.i8(0)));
        if(broken) (C.field(obj,"obj","no_charge").value=C.u32(1));
    } else if(costly_xy) {
        let oshops=C.in_rooms(x,y,C.SHOPBASE);
        /* ushops0: in case we threw while levitating and recoiled
           out of shop (most likely to the shk's spot in front of door) */
        if(Number(!!(Number(C.i32(C.cell(oshops,"char").value)==C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value))||Number(C.i32(C.cell(oshops,"char").value)==C.i32(C.cell(C.field(C.u,"you","ushops0").address,"char").value))))) {
            if(C.is_unpaid(obj)) {
                let gtg=((Number(C.field((obj),"obj","cobj").value!=0))?C.contained_gold(obj,(C.i8(1))):0n);
                C.subfrombill(obj,shkp);
                if(Number(gtg>0n)) C.donate_gold(gtg,shkp,(C.i8(1)));
            } else if(Number(!!(Number(C.i32(x)!=C.i32(C.field(shkp,"monst","mx").value))||Number(C.i32(y)!=C.i32(C.field(shkp,"monst","my").value))))) {
                C.sellobj(obj,x,y);
            }
        }
    }
}

/* Will 'obj' cause damage if it falls on hero's head when thrown upward?
   Not used to handle things which break when they hit.
   Stone missile hitting hero w/ Passes_walls attribute handled separately. */
export function harmless_missile(obj)
{
    obj=C.ptr(obj);
    let otyp=C.i32(C.field(obj,"obj","otyp").value);
    /* this list is fairly arbitrary */
    switch(otyp) {
        case (C.SLING):
            case (C.EUCALYPTUS_LEAF):
                case (C.KELP_FROND):
                    case (C.SPRIG_OF_WOLFSBANE):
                        case (C.FORTUNE_COOKIE):
                            case (C.PANCAKE):
                                return (C.i8(1));
        case (C.RUBBER_HOSE):
            case (C.BAG_OF_TRICKS):
                return C.i8((Number(C.i32(C.field(obj,"obj","spe").value)<1)));
        case (C.SACK):
            case (C.OILSKIN_SACK):
                case (C.BAG_OF_HOLDING):
                    return C.i8(Number(!((Number(C.field((obj),"obj","cobj").value!=0)))));
        default:
            if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.SCROLL_CLASS)) return (C.i8(1));
        /* scrolls but not all paper objs */
        if(Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.CLOTH)) return (C.i8(1));
        break;
    }
    return (C.i8(0));
}

/*
 * Hero tosses an object upwards with appropriate consequences.
 *
 * Returns FALSE if the object is gone.
 */
export function toss_up(obj,hitsroof)
{
    obj=C.ptr(obj);
    hitsroof=C.i8(hitsroof);
    const stackFrame=C.stackSave();
    try {
    petrify: {
        let action;
        let otyp=C.i32(C.field(obj,"obj","otyp").value);
        let petrifier=C.i8((Number(!!(Number(!!((Number(!!(Number(otyp==C.EGG)||Number(otyp==C.CORPSE))))&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS))))))&&(Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))))));
        /* note: obj->quan == 1 */
        if(Number(!(C.has_ceiling(C.field(C.u,"you","uz").address)))) {
            (action=C.literal("flies up into"));
            /* into "the sky" or "the water above" */
        } else if(hitsroof) {
            if(breaktest(obj)) {
                C.variadic(34,C.literal("%s hits the %s."),C.Doname2(obj),C.ceiling(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
                breakmsg(obj,C.i8(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))));
                /* crackable armor will return True for breaktest() but will
               usually return False for breakobj() */
                if(Number(!(breakobj(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(C.i8(1)),(C.i8(1)))))) {
                    hitfloor(obj,(C.i8(0)));
                    (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
                    return (C.i8(1));
                }
                return (C.i8(0));
            }
            (action=C.literal("hits"));
        } else {
            (action=C.literal("almost hits"));
        }
        C.variadic(35,C.literal("%s %s the %s, then falls back on top of your %s."),C.Doname2(obj),action,C.ceiling(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value),C.body_part(C.HEAD));
        /* object now hits you */
        if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)) {
            C.potionhit(C.field(C.gy,"instance_globals_y","youmonst").address,obj,1);
        } else if(breaktest(obj)) {
            let blindinc;
            /* need to check for blindness result prior to destroying obj */
            (blindinc=((Number(!!((Number(!!(Number(otyp==C.CREAM_PIE)||Number(otyp==C.BLINDING_VENOM))))&&C.i32(C.can_blnd(C.field(C.gy,"instance_globals_y","youmonst").address,C.field(C.gy,"instance_globals_y","youmonst").address,C.u8(254),obj)))))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1298,(C.literal("toss_up"))),C.rnd(25))):C.rnd(25))):0));
            /* AT_WEAP is ok here even if attack type was AT_SPIT */
            breakmsg(obj,C.i8(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))));
            if(breakobj(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(C.i8(1)),(C.i8(1)))) (obj=0);
            /* it's now gone */
            switch(otyp) {
                case (C.EGG):
                    if(Number(!!(Number(!!(C.i32(petrifier)&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))&&Number(!((Number(!!(C.i32(C.poly_when_stoned(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value))&&C.polymon(C.PM_STONE_GOLEM))))))))) {
                        /* egg ends up "all over your face"; perhaps
                   visored helmet should still save you here */
                        if(C.global("uarmh").value) C.variadic(36,C.literal("%s fails to protect you."),C.helm_simple_name(C.global("uarmh").value));
                        break petrify; /* original goto petrify */
                    }
                ;
                /*FALLTHRU*/
                case (C.CREAM_PIE):
                    case (C.BLINDING_VENOM):
                        C.variadic(37,C.literal("You've got it all over your %s!"),C.body_part(C.FACE));
                if(blindinc) {
                    if(Number(!!(Number(otyp==C.BLINDING_VENOM)&&Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))) C.variadic(38,C.literal("It blinds you!"));
                    (C.field(C.u,"you","ucreamed").value=C.u32(C.field(C.u,"you","ucreamed").value+C.u32(blindinc)));
                    C.make_blinded(C.i64(((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))+C.i64(blindinc))),(C.i8(0)));
                    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(39,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_vision_clears").value);
                }
                break;
                default:
                    break;
            }
            if(Number(!(obj))) return (C.i8(0));
            /* 'obj' still exists, so drop it and return True */
            hitfloor(obj,(C.i8(0)));
            (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
        } else if(harmless_missile(obj)) {
            C.variadic(40,C.literal("It doesn't hurt."));
            hitfloor(obj,(C.i8(0)));
            (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
        } else {
            /* neither potion nor other breaking object */
            let material=C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value);
            let is_silver=C.i8((Number(material==C.SILVER))); let less_damage=C.i8((Number(!!(C.i32(C.hard_helmet(C.global("uarmh").value))&&(Number(!!(Number(!(is_silver))||Number(!((Number(!!(Number(C.field(C.u,"you","ulycn").value>=C.LOW_PM)||C.i32(C.hates_silver(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)))))))))))))); let harmless=C.i8((Number(!!((Number(!!((Number(!!(Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GEMSTONE)||(Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.MINERAL)))))&&Number(C.i32(C.field((obj),"obj","oclass").value)!=C.RING_CLASS))))&&(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n)))&&Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(1048576n))))!=C.u64(0n)))))))))))); let artimsg=(C.i8(0));
            let dmg=C.local("int",C.dmgval(obj,C.field(C.gy,"instance_globals_y","youmonst").address));
            if(Number(!!(C.i32(C.field(obj,"obj","oartifact").value)&&Number(!(harmless))))) (artimsg=C.artifact_hit(0,C.field(C.gy,"instance_globals_y","youmonst").address,obj,dmg.address,(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1354,(C.literal("toss_up"))),C.rn2(18))):C.rn2(18)))+(2))))));
            /* need a fake die roll here; rn1(18,2) avoids 1 and 20 */
            if(Number(!(dmg.value))) {
                /* probably wasn't a weapon; base damage on weight */
                (dmg.value=C.i32(Math.trunc(((C.i32((C.i32(C.field(obj,"obj","owt").value)+(C.i32((C.WT_TO_DMG-1))))))/C.WT_TO_DMG))));
                (dmg.value=((Number(dmg.value<=1))?1:((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1358,(C.literal("toss_up"))),C.rnd(dmg.value))):C.rnd(dmg.value)))));
                if(Number(dmg.value>6)) (dmg.value=6);
                /* since obj is a non-weapon, bonuses for silver and blessed
               haven't been applied (otherwise '!dmg' test will fail when
               they're applicable here); we don't have to worry about
               dmgval()'s artifact light against gremlin or axe against
               woody creature since both involve weapons; hero-as-shade is
               hypothetical because hero can't polymorph into that form */
                if(Number(!!(Number(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value==(C.mons+Number(C.PM_SHADE)*C.sizes["struct permonst"]))&&Number(!(is_silver))))) (dmg.value=0);
                if(Number(!!(C.i32(C.field(obj,"obj","blessed").value)&&C.i32(C.mon_hates_blessings(C.field(C.gy,"instance_globals_y","youmonst").address))))) (dmg.value=C.i32(dmg.value+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1370,(C.literal("toss_up"))),C.rnd(4))):C.rnd(4)))));
                if(Number(!!(C.i32(is_silver)&&(Number(!!(Number(C.field(C.u,"you","ulycn").value>=C.LOW_PM)||C.i32(C.hates_silver(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)))))))) (dmg.value=C.i32(dmg.value+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1372,(C.literal("toss_up"))),C.rnd(20))):C.rnd(20)))));
            }
            if(Number(!!(Number(dmg.value>1)&&C.i32(less_damage)))) (dmg.value=1);
            if(Number(dmg.value>0)) (dmg.value=C.i32(dmg.value+C.i32(C.field(C.u,"you","udaminc").value)));
            if(Number(dmg.value<0)) (dmg.value=0);
            /* beware negative rings of increase damage */
            (dmg.value=((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","extrinsic").value))))?(C.i32(Math.trunc(((C.i32(((dmg.value)+1)))/2)))):(dmg.value))));
            if(C.global("uarmh").value) {
                /* note: 'harmless' and 'petrifier' are mutually exclusive */
                if(Number(!!((Number(!!(C.i32(less_damage)&&Number(dmg.value<(((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.field(C.u,"you","mh").value:C.field(C.u,"you","uhp").value))))))||C.i32(harmless)))) {
                    if(Number(!(artimsg))) {
                        if(Number(!(harmless))) C.variadic(41,C.literal("Fortunately, you are wearing a hard helmet."));
 else C.variadic(42,C.literal("Unfortunately, you are wearing %s."),C.an(C.helm_simple_name(C.global("uarmh").value)));
                        /* !harmless => less_damage here */
                        /* helm or hat */
                    }
                    /* helmet definitely protects you when it blocks petrification */
                } else if(Number(!(petrifier))) {
                    if(C.field(C.flags,"flag","verbose").value) C.variadic(43,C.literal("%s does not protect you."),C.helm_simple_name(C.global("uarmh").value));
                }
                /* stone missile against hero in xorn form would have been
               harmless, but hitting a worn helmet negates that */
                (harmless=(C.i8(0)));
            } else if(Number(!!(Number(!!(C.i32(petrifier)&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))&&Number(!((Number(!!(C.i32(C.poly_when_stoned(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value))&&C.polymon(C.PM_STONE_GOLEM))))))))) {
                break petrify; /* original shared petrify join */
                /* what goes up... */
                /* bypass most of hitfloor() */
                /* now either gone or on floor */
            }
            if(Number(!!(C.i32(is_silver)&&(Number(!!(Number(C.field(C.u,"you","ulycn").value>=C.LOW_PM)||C.i32(C.hates_silver(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)))))))) C.variadic(44,C.literal("silver sears you!"));
            if(harmless) C.hit(C.thesimpleoname(obj),C.field(C.gy,"instance_globals_y","youmonst").address,C.literal(" but doesn't hurt."));
            hitfloor(obj,(C.i8(1)));
            (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
            if(Number(!(harmless))) C.losehp(dmg.value,C.literal("falling object"),C.i8(0));
        }
        return (C.i8(1));
    }
    (C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","format").value=1);
    C.strcpy(C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address,C.literal("elementary physics"));
    C.variadic(45,C.literal("turn to stone."));
    if(obj) C.dropy(obj);
    (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
    C.done(C.STONING);
    return C.i8((obj?C.i32((C.i8(1))):C.i32((C.i8(0)))));
    } finally {C.stackRestore(stackFrame); }
}

/* return true for weapon meant to be thrown; excludes ammo */
export function throwing_weapon(obj)
{
    obj=C.ptr(obj);
    return C.i8((Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_BOOMERANG)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_DART))))))||(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_SPEAR))))))||(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.P_DAGGER)))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.P_SABER))))&&Number(!((Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.P_SHORT_SWORD)))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.P_SABER))))))))&&(C.i32((C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_dir").value)&1))))))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAR_HAMMER)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.AKLYS)))));
    /* daggers and knife (excludes scalpel) */
    /* special cases [might want to add AXE] */
}

/* the currently thrown object is returning to you (not for boomerangs) */
export function sho_obj_return_to_u(obj)
{
    obj=C.ptr(obj);
    /* might already be our location (bounced off a wall) */
    if(Number(!!((Number(!!(C.field(C.u,"you","dx").value||C.field(C.u,"you","dy").value)))&&(Number(!!(Number(C.i32(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)!=C.i32(C.field(C.u,"you","uy").value)))))))) {
        let x=C.i32((C.i32(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)-C.field(C.u,"you","dx").value)); let y=C.i32((C.i32(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)-C.field(C.u,"you","dy").value));
        C.tmp_at(C.i16((C.i32((-4)))),C.i16((((Number(C.i32(C.field((obj),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.rn2_on_display_rng(C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((obj),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((obj),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj),"obj","ox").value)*(8*21))+Number(C.field((obj),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj),"obj","ox").value)*(8*21))+Number(C.field((obj),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((obj),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((obj),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj),"obj","ox").value)*(8*21))+Number(C.field((obj),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((obj),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((obj),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((obj),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((obj),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj),"obj","ox").value)*(8*21))+Number(C.field((obj),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((obj),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj),"obj","ox").value)*(8*21))+Number(C.field((obj),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))))))))));
        while(Number(!!(C.isok(C.i16(x),C.i16(y))&&(Number(!!(Number(x!=C.i32(C.field(C.u,"you","ux").value))||Number(y!=C.i32(C.field(C.u,"you","uy").value)))))))) {
            C.tmp_at(C.i16(x),C.i16(y));
            C.indirect(4,(C.field(C.windowprocs,"window_procs","win_delay_output").value));
            (x=C.i32(x-C.field(C.u,"you","dx").value));
            (y=C.i32(y-C.field(C.u,"you","dy").value));
        }
        C.tmp_at(C.i16((C.i32((-7)))),C.i16(0));
    }
}

export function throwit_return(clear_thrownobj)
{
    clear_thrownobj=C.i8(clear_thrownobj);
    (C.field(C.iflags,"instance_flags","returning_missile").value=0);
    if(clear_thrownobj) (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
}

export function swallowit(obj)
{
    obj=C.ptr(obj);
    if(Number(obj!=C.global("uball").value)) {
        C.mpickobj(C.field(C.u,"you","ustuck").value,obj);
        /* clears 'gt.thrownobj' */
        throwit_return((C.i8(0)));
    } else throwit_return((C.i8(1)));
}

/* thrown object hits a monster.
   mon may be NULL.
   returns TRUE if shopkeeper caught the object.
   may delete object, clearing gt.thrownobj */
export function throwit_mon_hit(obj,mon)
{
    obj=C.ptr(obj);
    mon=C.ptr(mon);
    if(mon) {
        let obj_gone;
        if(Number(!!(Number(!!(C.i32(C.field(mon,"monst","isshk").value)&&Number(C.i32(C.field(obj,"obj","where").value)==4)))&&Number(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value==mon)))) {
            return (C.i8(1));
        }
        C.snuff_candle(obj);
        (C.field(C.gn,"instance_globals_n","notonhead").value=C.i8((Number(!!(Number(C.i32(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)!=C.i32(C.field(mon,"monst","mx").value))||Number(C.i32(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)!=C.i32(C.field(mon,"monst","my").value)))))));
        (obj_gone=C.i8(thitmonst(mon,obj)));
        /* Monster may have been tamed; this frees old mon [obsolete] */
        (mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(8*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"struct monst *").value));
        /* [perhaps this should be moved into thitmonst or hmon] */
        if(Number(!!(Number(!!(mon&&C.i32(C.field(mon,"monst","isshk").value)))&&(Number(!!(Number(!(C.inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))||Number(!(C.strchr(C.in_rooms(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value,C.SHOPBASE),C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)))))))))) C.hot_pursuit(mon);
        if(obj_gone) (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
    }
    return (C.i8(0));
}

/* throw an object, NB: obj may be consumed in the process */
export function throwit(obj,wep_mask,twoweap,oldslot)
{
    obj=C.ptr(obj);
    wep_mask=C.i64(wep_mask);
    twoweap=C.i8(twoweap);
    oldslot=C.ptr(oldslot);
    const stackFrame=C.stackSave();
    try {
    obj=C.local("struct obj *",obj);
    /* used to re-equip returning boomerang */
    /* used to restore twoweapon mode if
                          * wielded weapon returns */
    /* for thrown-and-return used with !fixinv */
    let mon;
    let range; let urange;
    let arw=C.autoreturn_weapon(obj.value);
    let crossbowing; let impaired=C.i8((Number(!!(Number(!!(Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STUNNED)*C.sizes["struct prop"]),"prop","intrinsic").value))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","extrinsic").value))))))); let tethered_weapon=C.i8((Number(!!(Number(!!(arw&&C.i32(C.field(arw,"throw_and_return_weapon","tethered").value)))&&Number((C.i64((wep_mask&256n)))!=C.i64(0))))));
    (C.field(C.gn,"instance_globals_n","notonhead").value=(C.i8(0)));
    /* reset potentially stale value */
    if(Number(!!(Number(!!((Number(!!(C.i32(C.field(obj.value,"obj","cursed").value)||C.i32(C.field(obj.value,"obj","greased").value))))&&(Number(!!(C.field(C.u,"you","dx").value||C.field(C.u,"you","dy").value)))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1526,(C.literal("throwit"))),C.rn2(7))):C.rn2(7)))))))) {
        let slipok=(C.i8(1));
        if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj.value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) {
            C.variadic(46,C.literal("%s!"),C.Tobjnam(obj.value,C.literal("misfire")));
        } else {
            /* only slip if it's greased or meant to be thrown */
            if(Number(!!(C.i32(C.field(obj.value,"obj","greased").value)||C.i32(throwing_weapon(obj.value))))) C.variadic(47,C.literal("%s as you throw it!"),C.Tobjnam(obj.value,C.literal("slip")));
 else (slipok=(C.i8(0)));
            /* BUG: this message is grammatically incorrect if obj has
                   a plural name; greased gloves or boots for instance. */
        }
        if(slipok) {
            (C.field(C.u,"you","dx").value=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1541,(C.literal("throwit"))),C.rn2(3))):C.rn2(3)))-1)));
            (C.field(C.u,"you","dy").value=C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1542,(C.literal("throwit"))),C.rn2(3))):C.rn2(3)))-1)));
            if(Number(!!(Number(!(C.field(C.u,"you","dx").value))&&Number(!(C.field(C.u,"you","dy").value))))) (C.field(C.u,"you","dz").value=1);
            (impaired=(C.i8(1)));
        }
    }
    if(Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(C.field(C.u,"you","dx").value||C.field(C.u,"you","dy").value))||(Number(C.field(C.u,"you","dz").value<1)))))&&Number(C.calc_capacity(C.i32(C.field(obj.value,"obj","owt").value))>C.SLT_ENCUMBER)))&&(((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?(Number(!!(Number(C.field(C.u,"you","mh").value<5)&&Number(C.field(C.u,"you","mh").value!=C.field(C.u,"you","mhmax").value)))):(Number(!!(Number(C.field(C.u,"you","uhp").value<10)&&Number(C.field(C.u,"you","uhp").value!=C.field(C.u,"you","uhpmax").value))))))))&&Number(C.field(obj.value,"obj","owt").value>C.u32((C.i32(((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.field(C.u,"you","mh").value:C.field(C.u,"you","uhp").value))*2)))))))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))))))) {
        C.variadic(48,C.literal("have so little stamina, %s drops from your grasp."),C.the(C.xname(obj.value)));
        C.exercise(C.A_CON,(C.i8(0)));
        (C.field(C.u,"you","dx").value=(C.field(C.u,"you","dy").value=0));
        (C.field(C.u,"you","dz").value=1);
    }
    (C.field(C.gt,"instance_globals_t","thrownobj").value=obj.value);
    (C.field(C.field(C.gt,"instance_globals_t","thrownobj").value,"obj","how_lost").value=C.u32(1));
    (C.field(C.iflags,"instance_flags","returning_missile").value=((Number(!!((Number(!!(Number((C.i64(((wep_mask)&256n)))!=C.i64(0))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)==C.AKLYS)||(Number(!!(Number(C.i32(C.field((obj.value),"obj","oartifact").value)==C.ART_MJOLLNIR)&&(Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_VALKYRIE))))))))))))||Number(C.i32(C.field((obj.value),"obj","otyp").value)==C.BOOMERANG))))?obj.value:0));
    /* NOTE:  No early returns after this point or returning_missile
       will be left with a stale pointer. */
    if(C.field(C.u,"you","uswallow").value) {
        if(Number(obj.value==C.global("uball").value)) {
            (C.field(C.global("uball").value,"obj","ox").value=(C.field(C.global("uchain").value,"obj","ox").value=C.field(C.u,"you","ux").value));
            (C.field(C.global("uball").value,"obj","oy").value=(C.field(C.global("uchain").value,"obj","oy").value=C.field(C.u,"you","uy").value));
        }
        (mon=C.field(C.u,"you","ustuck").value);
        (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.field(mon,"monst","mx").value);
        (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.field(mon,"monst","my").value);
        if(tethered_weapon) C.tmp_at(C.i16((C.i32((-3)))),C.i16((((Number(C.i32(C.field((obj.value),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.rn2_on_display_rng(C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((obj.value),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((obj.value),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((obj.value),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((obj.value),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((obj.value),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((obj.value),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((obj.value),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((obj.value),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((obj.value),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))))))))));
    } else if(C.field(C.u,"you","dz").value) {
        if(Number(!!(Number(!!(Number(C.field(C.u,"you","dz").value<0)&&C.field(C.iflags,"instance_flags","returning_missile").value))&&Number(!(impaired))))) {
            /* Mjollnir must we wielded to be thrown--caller verifies this;
               aklys must we wielded as primary to return when thrown */
            C.variadic(49,C.literal("%s the %s and returns to your hand!"),C.Tobjnam(obj.value,C.literal("hit")),C.ceiling(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
            (obj.value=return_throw_to_inv(obj.value,wep_mask,twoweap,oldslot));
        } else if(Number(C.field(C.u,"you","dz").value<0)) {
            toss_up(obj.value,C.i8(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1589,(C.literal("throwit"))),C.rn2(5))):C.rn2(5)))&&Number(!((C.field(C.u,"you","uinwater").value)))))));
        } else if(Number(!!(Number(!!(Number(!!(Number(C.field(C.u,"you","dz").value>0)&&C.field(C.u,"you","usteed").value))&&Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.POTION_CLASS)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1591,(C.literal("throwit"))),C.rn2(6))):C.rn2(6)))))) {
            /* alternative to prayer or wand of opening/spell of knock
               for dealing with cursed saddle:  throw holy water > */
            C.potionhit(C.field(C.u,"you","usteed").value,obj.value,1);
        } else {
            hitfloor(obj.value,(C.i8(1)));
        }
        throwit_return((C.i8(1)));
        return;
    } else if(Number(!!(Number(C.i32(C.field(obj.value,"obj","otyp").value)==C.BOOMERANG)&&Number(!((C.field(C.u,"you","uinwater").value)))))) {
        if(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))))) hurtle(C.i32((-C.field(C.u,"you","dx").value)),C.i32((-C.field(C.u,"you","dy").value)),1,(C.i8(1)));
        (mon=C.boomhit(obj.value,C.field(C.u,"you","dx").value,C.field(C.u,"you","dy").value));
        (C.field(C.iflags,"instance_flags","returning_missile").value=0);
        /* has returned or isn't going to */
        if(Number(mon==C.field(C.gy,"instance_globals_y","youmonst").address)) {
            /* the thing was caught */
            C.exercise(C.A_DEX,(C.i8(1)));
            (obj.value=return_throw_to_inv(obj.value,wep_mask,twoweap,oldslot));
            throwit_return((C.i8(1)));
            return;
        }
    } else {
        /* crossbow range is independent of strength */
        (crossbowing=C.i8((Number(!!((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj.value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))&&Number(C.weapon_type(C.global("uwep").value)==C.P_CROSSBOW))))));
        (urange=C.i32(Math.trunc((((C.i32(crossbowing)?18:C.i32((C.acurrstr()))))/2))));
        /* balls are easy to throw or at least roll;
         * also, this insures the maximum range of a ball is greater
         * than 1, so the effects from throwing attached balls are
         * actually possible
         */
        if(Number(C.i32(C.field(obj.value,"obj","otyp").value)==C.HEAVY_IRON_BALL)) (range=C.i32((urange-C.i32((C.u32(Math.trunc((C.field(obj.value,"obj","owt").value/C.u32(100)))))))));
 else (range=C.i32((urange-C.i32((C.u32(Math.trunc((C.field(obj.value,"obj","owt").value/C.u32(40)))))))));
        if(Number(obj.value==C.global("uball").value)) {
            if(C.field(C.u,"you","ustuck").value) (range=1);
 else if(Number(range>=5)) (range=5);
        }
        if(Number(range<1)) (range=1);
        if((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))) {
            if((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj.value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))) {
                if(crossbowing) (range=8);
 else ((range=C.i32((range+1)))-1);
            } else if(Number(C.i32(C.field(obj.value,"obj","oclass").value)!=C.GEM_CLASS)) {
                (range=C.i32(Math.trunc(range/2)));
                C.variadic(50,C.literal("You aren't wielding %s, so you throw your %s by %s."),C.an(C.skill_name(C.weapon_type(obj.value))),C.weapon_descr(obj.value),C.body_part(C.HAND));
            }
        }
        if(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))))) {
            /* action, reaction... */
            (urange=C.i32(urange-range));
            if(Number(urange<1)) (urange=1);
            (range=C.i32(range-urange));
            if(Number(range<1)) (range=1);
        }
        if(Number(C.i32(C.field(obj.value,"obj","otyp").value)==C.BOULDER)) (range=20);
 else if(C.is_art(obj.value,C.ART_MJOLLNIR)) (range=C.i32(Math.trunc(((C.i32((range+1)))/2))));
 else if(tethered_weapon) (range=((Number((range)<(C.isqrt(C.field(arw,"throw_and_return_weapon","range").value)))?(range):(C.isqrt(C.field(arw,"throw_and_return_weapon","range").value)))));
 else if(Number(!!(Number(!!(Number(obj.value==C.global("uball").value)&&C.field(C.u,"you","utrap").value))&&Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_INFLOOR))))) (range=1);
        /* you must be giant */
        /* it's heavy */
        /* primary weapon is aklys */
        /* range of a tethered_weapon is limited by the
               length of the attached cord [implicit aspect of item] */
        if((C.field(C.u,"you","uinwater").value)) (range=1);
        (mon=C.bhit(C.field(C.u,"you","dx").value,C.field(C.u,"you","dy").value,range,C.i32((C.i32(tethered_weapon)?C.THROWN_TETHERED_WEAPON:C.THROWN_WEAPON)),0,0,obj.address));
        (C.field(C.gt,"instance_globals_t","thrownobj").value=obj.value);
        /* obj may be null now */
        /* have to do this after bhit() so u.ux & u.uy are correct */
        if(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))))) hurtle(C.i32((-C.field(C.u,"you","dx").value)),C.i32((-C.field(C.u,"you","dy").value)),urange,(C.i8(1)));
        if(Number(!(obj.value))) {
            /* bhit display cleanup was left with this caller
               for tethered_weapon, but clean it up now since
               we're about to return */
            if(tethered_weapon) C.tmp_at(C.i16((C.i32((-7)))),C.i16(0));
            throwit_return((C.i8(0)));
            return;
        }
    }
    if(throwit_mon_hit(obj.value,mon)) {
        throwit_return((C.i8(1)));
        /* alert shk caught it */
        return;
    }
    if(Number(!(C.field(C.gt,"instance_globals_t","thrownobj").value))) {
        /* missile has already been handled */
        if(tethered_weapon) C.tmp_at(C.i16((C.i32((-7)))),C.i16(0));
    } else if(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&Number(!(C.field(C.iflags,"instance_flags","returning_missile").value))))) {
        swallowit(obj.value);
        return;
    } else {
        /* Mjollnir must be wielded to be thrown--caller verifies this;
           aklys must be wielded as primary to return when thrown */
        if(C.field(C.iflags,"instance_flags","returning_missile").value) {
            /* Mjollnir or aklys */
            if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1711,(C.literal("throwit"))),C.rn2(100))):C.rn2(100)))) {
                if(tethered_weapon) C.tmp_at(C.i16((C.i32((-7)))),C.i16((C.i32((-1)))));
 else sho_obj_return_to_u(obj.value);
                /* display its flight */
                if(Number(!!(Number(!(impaired))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1717,(C.literal("throwit"))),C.rn2(100))):C.rn2(100)))))) {
                    C.variadic(51,C.literal("%s to your hand!"),C.Tobjnam(obj.value,C.literal("return")));
                    (obj.value=C.addinv_before(obj.value,oldslot));
                    C.encumber_msg();
                    /* addinv autoquivers an aklys if quiver is empty;
                       if obj is quivered, remove it before wielding */
                    if(C.i64((C.field(obj.value,"obj","owornmask").value&512n))) C.setuqwep(0);
                    C.setuwep(obj.value);
                    C.set_twoweap(twoweap);
                    /* u.twoweap = twoweap */
                    if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"unsigned char *").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*1),"unsigned char").value)&2)))!=0))) C.newsym(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
                } else {
                    let dmg=C.local("int",((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1730,(C.literal("throwit"))),C.rn2(2))):C.rn2(2))));
                    if(Number(!(dmg.value))) {
                        C.variadic(52,((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("%s lands %s your %s."):C.literal("%s back to you, landing %s your %s.")),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.field(C.c_common_strings,"c_common_strings","c_Something").value:C.Tobjnam(obj.value,C.literal("return"))),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("beneath"):C.literal("at")),C.makeplural(C.body_part(C.FOOT)));
                    } else {
                        (dmg.value=C.i32(dmg.value+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1739,(C.literal("throwit"))),C.rnd(3))):C.rnd(3)))));
                        C.variadic(53,((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("%s your %s!"):C.literal("%s back toward you, hitting your %s!")),C.Tobjnam(obj.value,((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("hit"):C.literal("fly"))),C.body_part(C.ARM));
                        if(C.field(obj.value,"obj","oartifact").value) C.artifact_hit(0,C.field(C.gy,"instance_globals_y","youmonst").address,obj.value,dmg.address,0);
                        C.losehp(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","extrinsic").value))))?(C.i32(Math.trunc(((C.i32(((dmg.value)+1)))/2)))):(dmg.value))),C.killer_xname(obj.value),C.i8(1));
                    }
                    if(C.field(C.u,"you","uswallow").value) {
                        swallowit(obj.value);
                        return;
                    }
                    if(Number(!(C.ship_object(obj.value,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(C.i8(0)))))) C.dropy(obj.value);
                }
                throwit_return((C.i8(1)));
                return;
            } else {
                if(tethered_weapon) C.tmp_at(C.i16((C.i32((-7)))),C.i16(0));
                /* when this location is stepped on, the weapon will be
                   auto-picked up due to 'obj->how_lost' of LOST_THROWN;
                   addinv() prevents thrown Mjollnir from being placed
                   into the quiver slot, but an aklys will end up there if
                   that slot is empty at the time; since hero will need to
                   explicitly rewield the weapon to get throw-and-return
                   capability back anyway, quivered or not shouldn't matter */
                C.variadic(54,C.literal("%s to return!"),C.Tobjnam(obj.value,C.literal("fail")));
                if(C.field(C.u,"you","uswallow").value) {
                    swallowit(obj.value);
                    return;
                }
                /* continue below with placing 'obj' at target location */
            }
        }
        if(Number(!!((Number(!!(Number(!((Number(!!(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))==C.AIR)||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))==C.CLOUD)))||(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))>=C.POOL)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))<=C.DRAWBRIDGE_UP)))))))))&&C.i32(breaktest(obj.value)))))||Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.VENOM_CLASS)))) {
            /* venom [via #monster to spit while poly'd] fails breaktest()
               but we want to force breakage even when location IS_SOFT() */
            C.tmp_at(C.i16((C.i32((-4)))),C.i16((((Number(C.i32(C.field((obj.value),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.rn2_on_display_rng(C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((obj.value),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((obj.value),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((obj.value),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((obj.value),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((obj.value),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((obj.value),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((obj.value),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((obj.value),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((obj.value),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((obj.value),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((obj.value),"obj","ox").value)*(8*21))+Number(C.field((obj.value),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((obj.value),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))))))))));
            C.tmp_at(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
            C.indirect(5,(C.field(C.windowprocs,"window_procs","win_delay_output").value));
            C.tmp_at(C.i16((C.i32((-7)))),C.i16(0));
            breakmsg(obj.value,C.i8((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"unsigned char *").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*1),"unsigned char").value)&2)))!=0))));
            if(breakobj(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,(C.i8(1)),(C.i8(1)))) {
                throwit_return((C.i8(1)));
                return;
            }
        }
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((C.field(C.u,"you","uinwater").value)))))) {
            /* Some sound effects when item lands in water or lava */
            if(Number(!!(C.i32(C.is_pool(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value))||(Number(!!(C.i32(C.is_lava(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value))&&Number(!(C.is_flammable(obj.value))))))))) {
                ;
                C.variadic(55,((Number(C.weight(obj.value)>C.WT_SPLASH_THRESHOLD))?C.literal("Splash!"):C.literal("Plop!")));
            }
        }
        if(C.flooreffects(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,C.literal("fall"))) {
            throwit_return((C.i8(1)));
            return;
        }
        C.obj_no_longer_held(obj.value);
        if(Number(!!(Number(!!(mon&&C.i32(C.field(mon,"monst","isshk").value)))&&(Number(!!((Number(!!(Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj.value,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj.value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_PICK_AXE))))))) {
            if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"unsigned char *").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*1),"unsigned char").value)&2)))!=0))) C.variadic(56,C.literal("%s snatches up %s."),C.Monnam(mon),C.the(C.xname(obj.value)));
            if(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)||C.i32(C.field(obj.value,"obj","unpaid").value)))) check_shop_obj(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,(C.i8(0)));
            C.mpickobj(mon,obj.value);
            /* may merge and free obj */
            throwit_return((C.i8(1)));
            return;
        }
        C.snuff_candle(obj.value);
        if(Number(!!(Number(!(mon))&&C.i32(C.ship_object(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,(C.i8(0))))))) {
            throwit_return((C.i8(1)));
            return;
        }
        (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
        C.place_object(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
        /* container contents might break;
           do so before turning ownership of gt.thrownobj over to shk
           (container_impact_dmg handles item already owned by shop) */
        if(Number(!((Number(!!(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))==C.AIR)||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))==C.CLOUD)))||(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))>=C.POOL)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))<=C.DRAWBRIDGE_UP)))))))))) {
            /* <x,y> is spot where you initiated throw, not gb.bhitpos */
            C.container_impact_dmg(obj.value,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            C.impact_disturbs_zombies(obj.value,(C.i8(1)));
        }
        /* charge for items thrown out of shop;
           shk takes possession for items thrown into one */
        if(Number(!!((Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)||C.i32(C.field(obj.value,"obj","unpaid").value))))&&Number(obj.value!=C.global("uball").value)))) check_shop_obj(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,(C.i8(0)));
        C.stackobj(obj.value);
        if(Number(obj.value==C.global("uball").value)) C.drop_ball(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
        if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"unsigned char *").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*1),"unsigned char").value)&2)))!=0))) C.newsym(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
        if(C.obj_sheds_light(obj.value)) (C.field(C.gv,"instance_globals_v","vision_full_recalc").value=C.i8(1));
    }
    throwit_return((C.i8(0)));
    return;
    } finally {C.stackRestore(stackFrame); }
}

/* handle a throw-and-return missile coming back into inventory; makes sure
   that if it was wielded, it will be re-wielded; if it was split off of a
   stack (boomerang), don't let it merge with a different compatible stack */
export function return_throw_to_inv(obj,wep_mask,twoweap,oldslot)
{
    obj=C.ptr(obj);
    wep_mask=C.i64(wep_mask);
    twoweap=C.i8(twoweap);
    oldslot=C.ptr(oldslot);
    /* object to add to invent */
    /* its owornmask before it was removed from invent */
    /* True if hero was dual-wielding before removal */
    /* following item in invent in case of '!fixinv' */
    let otmp=0;
    /* if 'obj' is from a stack split, we can put it back by undoing split
       so there's no chance of merging with some other compatible stack */
    if(Number(!!(Number(C.field(obj,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value)||Number(C.field(obj,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value)))) {
        (C.field(obj,"obj","nobj").value=C.field(C.gi,"instance_globals_i","invent").value);
        (C.field(C.gi,"instance_globals_i","invent").value=obj);
        (C.field(obj,"obj","where").value=C.i8(3));
        (otmp=C.unsplitobj(obj));
        if(Number(!(otmp))) {
            (C.field(C.gi,"instance_globals_i","invent").value=C.field(obj,"obj","nobj").value);
            (C.field(obj,"obj","nobj").value=0);
            (C.field(obj,"obj","where").value=C.i8(0));
        } else {
            (obj=otmp);
        }
    }
    /* if 'obj' wasn't from a stack split or if it wouldn't merge back
       (maybe new erosion damage?) then it needs to be added to invent;
       don't merge with any other stack even if there is a compatible one
       (others with similar erosion?); can't use addinv_nomerge() here */
    if(Number(!(otmp))) {
        (C.field(obj,"obj","nomerge").value=C.u32(1));
        /* redundant unless 'oldslot' somehow went away */
        (obj=C.addinv_before(obj,oldslot));
        (C.field(obj,"obj","nomerge").value=C.u32(0));
        /* in case addinv() autoquivered */
        if(Number(!!(Number((C.i64((C.field(obj,"obj","owornmask").value&512n)))!=C.i64(0))&&Number((C.i64(((C.i64((C.field(obj,"obj","owornmask").value|wep_mask)))&(C.i64((256n|1024n))))))!=C.i64(0))))) C.setuqwep(0);
        if(Number(!!((C.i64((wep_mask&256n)))&&Number(!(C.global("uwep").value))))) C.setuwep(obj);
 else if(Number(!!((C.i64((wep_mask&1024n)))&&Number(!(C.global("uswapwep").value))))) C.setuswapwep(obj);
 else if(Number(!!((C.i64((wep_mask&512n)))&&Number(!(C.global("uquiver").value))))) C.setuqwep(obj);
        /* in case the throw ended dual-wielding, reinstate it after
           successful catch (not needed for boomerang split/unsplit) */
        if(Number(!!(C.i32(twoweap)&&Number(!(C.field(C.u,"you","twoweap").value))))) C.set_twoweap((C.i8(1)));
        /* u.twoweap = TRUE */
    }
    C.encumber_msg();
    return obj;
}

/* an object may hit a monster; various factors adjust chance of hitting */
export function omon_adj(mon,obj,mon_notices)
{
    mon=C.ptr(mon);
    obj=C.ptr(obj);
    mon_notices=C.i8(mon_notices);
    let tmp=0;
    /* size of target affects the chance of hitting */
    (tmp=C.i32(tmp+(C.i32((C.i32(C.field(C.field(mon,"monst","data").value,"permonst","msize").value)-2)))));
    /* -2..+5 */
    /* sleeping target is more likely to be hit */
    if(C.field(mon,"monst","msleeping").value) {
        (tmp=C.i32(tmp+2));
    }
    /* ditto for immobilized target */
    if(Number(!!(Number(!(C.field(mon,"monst","mcanmove").value))||Number(!(C.field(C.field(mon,"monst","data").value,"permonst","mmove").value))))) {
        (tmp=C.i32(tmp+4));
        if(Number(!!(Number(!!(C.i32(mon_notices)&&C.i32(C.field(C.field(mon,"monst","data").value,"permonst","mmove").value)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1926,(C.literal("omon_adj"))),C.rn2(10))):C.rn2(10)))))))) {
            (C.field(mon,"monst","mcanmove").value=C.u32(1));
            (C.field(mon,"monst","mfrozen").value=C.u32(0));
        }
    }
    /* some objects are more likely to hit than others */
    switch(C.i32(C.field(obj,"obj","otyp").value)) {
        case (C.HEAVY_IRON_BALL):
            if(Number(obj!=C.global("uball").value)) (tmp=C.i32(tmp+2));
        break;
        case (C.BOULDER):
            (tmp=C.i32(tmp+6));
        break;
        default:
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||(Number(!!(Number(C.i32(C.field((obj),"obj","oclass").value)==C.TOOL_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)!=C.P_NONE))))))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)))) (tmp=C.i32(tmp+C.hitval(obj,mon)));
        break;
    }
    return tmp;
}

/* thrown object misses target monster */
export function tmiss(obj,mon,maybe_wakeup)
{
    obj=C.ptr(obj);
    mon=C.ptr(mon);
    maybe_wakeup=C.i8(maybe_wakeup);
    let missile=C.mshot_xname(obj);
    /* If the target can't be seen or doesn't look like a valid target,
       avoid "the arrow misses it," or worse, "the arrows misses the mimic."
       An attentive player will still notice that this is different from
       an arrow just landing short of any target (no message in that case),
       so will realize that there is a valid target here anyway. */
    if(Number(!!(Number(!(C.canseemon(mon)))||(Number(!!((C.i32((C.i32(C.field((mon),"monst","m_ap_type").value)&7)))&&Number((C.i32((C.i32(C.field((mon),"monst","m_ap_type").value)&7)))!=C.M_AP_MONSTER))))))) C.variadic(57,C.literal("%s %s."),C.The(missile),C.otense(obj,C.literal("miss")));
 else C.miss(missile,mon);
    if(Number(!!(C.i32(maybe_wakeup)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1964,(C.literal("tmiss"))),C.rn2(3))):C.rn2(3)))))))) C.wakeup(mon,(C.i8(1)));
    return;
}

/* whether or not object should be destroyed when it hits its target */
export function should_mulch_missile(obj)
{
    obj=C.ptr(obj);
    let broken;
    let chance;
    /* only ammo (excluding magic stones) or missiles will break */
    if(Number(!!(Number(!!(Number(!!(Number(!(obj))||Number(!((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))||(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_BOOMERANG)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_DART)))))))))))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOOMERANG)))||C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_magic").value)))) return (C.i8(0));
    /* we had been breaking 2/3 of everything unconditionally.  we still don't
       want anything to survive unconditionally, but we need ammo to stay
       around longer on average. */
    (chance=C.i32((C.i32((3+((Number(C.i32(C.field((obj),"obj","oeroded").value)>C.i32(C.field((obj),"obj","oeroded2").value))?C.i32(C.field((obj),"obj","oeroded").value):C.i32(C.field((obj),"obj","oeroded2").value)))))-C.i32(C.field(obj,"obj","spe").value))));
    (broken=C.i8((Number(chance>1)?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1991,(C.literal("should_mulch_missile"))),C.rn2(chance))):C.rn2(chance))):Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1991,(C.literal("should_mulch_missile"))),C.rn2(4))):C.rn2(4))))))));
    if(Number(!!(C.i32(C.field(obj,"obj","blessed").value)&&((C.i32(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value)?Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1992,(C.literal("should_mulch_missile"))),C.rn2(3))):C.rn2(3))))):Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1992,(C.literal("should_mulch_missile"))),C.rnl(4))):C.rnl(4)))))))))) (broken=(C.i8(0)));
    /* Flint and hard gems don't break easily */
    if(Number(!!((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)&&C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_tough").value))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.FLINT))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),1998,(C.literal("should_mulch_missile"))),C.rn2(2))):C.rn2(2)))))))) (broken=(C.i8(0)));
    return broken;
}

/*
 * Object thrown by player arrives at monster's location.
 * Return 1 if obj has disappeared or otherwise been taken care of,
 * 0 if caller must take care of it.
 * Also used for kicked objects and for polearms/grapnel applied at range.
 */
export function thitmonst(mon,obj)
{
    mon=C.ptr(mon);
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    try {
    /* gt.thrownobj or gk.kickedobj or uwep */
    let tmp;
    /* Base chance to hit */
    let disttmp;
    /* distance modifier */
    let otyp=C.i32(C.field(obj,"obj","otyp").value); let hmode;
    let guaranteed_hit=C.i8((Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&(Number(C.field(C.u,"you","ustuck").value==(mon)))))));
    let dieroll;
    (hmode=((Number(obj==C.global("uwep").value))?C.HMON_APPLIED:((Number(obj==C.field(C.gk,"instance_globals_k","kickedobj").value))?C.HMON_KICKED:C.HMON_THROWN)));
    /* Differences from melee weapons:
     *
     * Dex still gives a bonus, but strength does not.
     * Polymorphed players lacking attacks may still throw.
     * There's a base -1 to hit.
     * No bonuses for fleeing or stunned targets (they don't dodge
     *    melee blows as readily, but dodging arrows is hard anyway).
     * Not affected by traps, etc.
     * Certain items which don't in themselves do damage ignore 'tmp'.
     * Distance and monster size affect chance to hit.
     */
    (tmp=C.i32((C.i32((C.i32((C.i32((C.i32((-1))+(C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))))+C.find_mac(mon)))+C.i32(C.field(C.u,"you","uhitinc").value)))+(((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32((C.field(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,"permonst","mlevel").value)):(C.field(C.u,"you","ulevel").value))))));
    if(Number(C.i32((C.acurr(C.A_DEX)))<4)) (tmp=C.i32(tmp-3));
 else if(Number(C.i32((C.acurr(C.A_DEX)))<6)) (tmp=C.i32(tmp-2));
 else if(Number(C.i32((C.acurr(C.A_DEX)))<8)) (tmp=C.i32(tmp-1));
 else if(Number(C.i32((C.acurr(C.A_DEX)))>=14)) (tmp=C.i32(tmp+(C.i32((C.i32((C.acurr(C.A_DEX)))-14)))));
    /* Modify to-hit depending on distance; but keep it sane.
     * Polearms get a distance penalty even when wielded; it's
     * hard to hit at a distance.
     */
    (disttmp=C.i32((3-C.distmin(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value))));
    if(Number(disttmp<C.i32((-4)))) (disttmp=C.i32((-4)));
    (tmp=C.i32(tmp+disttmp));
    /* gloves are a hindrance to proper use of bows */
    if(Number(!!(Number(!!(C.global("uarmg").value&&C.global("uwep").value))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_BOW)))) {
        switch(C.i32(C.field(C.global("uarmg").value,"obj","otyp").value)) {
            case (C.GAUNTLETS_OF_POWER):
                /* metal */
                (tmp=C.i32(tmp-2));
            break;
            case (C.GAUNTLETS_OF_FUMBLING):
                (tmp=C.i32(tmp-3));
            break;
            case (C.LEATHER_GLOVES):
                case (C.GAUNTLETS_OF_DEXTERITY):
                    break;
            default:
                C.variadic(58,C.literal("Unknown type of gloves (%d)"),C.i32(C.field(C.global("uarmg").value,"obj","otyp").value));
            break;
        }
    }
    (tmp=C.i32(tmp+omon_adj(mon,obj,(C.i8(1)))));
    if(Number(!!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(128n))))!=C.u64(0n)))&&(((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(16n))))!=C.u64(0n)))):((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_ELF))))))))) ((tmp=C.i32((tmp+1)))-1);
    if(guaranteed_hit) {
        (tmp=C.i32(tmp+1000));
        /* Guaranteed hit */
    }
    /* throwing real gems to co-aligned unicorns boosts Luck,
       to cross-aligned unicorns changes Luck by random amount;
       throwing worthless glass doesn't affect Luck but doesn't anger them;
       5.0: treat rocks and gray stones as attacks rather than like glass
       and also treat gems or glass shot via sling as attacks */
    if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)&&(Number(!!(Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_UNICORN)&&(Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(536870912n))))!=C.u64(0n))))))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)!=C.MINERAL)))&&Number(!((Number(!!(C.global("uwep").value&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_SLING))))))))) {
        if((Number(!!(C.i32(C.field((mon),"monst","msleeping").value)||Number(!(C.field((mon),"monst","mcanmove").value)))))) {
            tmiss(obj,mon,(C.i8(0)));
            return 0;
        } else if(C.field(mon,"monst","mtame").value) {
            C.variadic(59,C.literal("%s catches and drops %s."),C.Monnam(mon),C.the(C.xname(obj)));
            return 0;
        } else {
            C.variadic(60,C.literal("%s catches %s."),C.Monnam(mon),C.the(C.xname(obj)));
            return gem_accept(mon,obj);
        }
    }
    /* don't make game unwinnable if naive player throws artifact
       at leader... (kicked artifact is ok too; HMON_APPLIED could
       occur if quest artifact polearm or grapnel ever gets added) */
    if(Number(!!(Number(hmode!=C.HMON_APPLIED)&&(Number(!!((Number(!!(Number(!!(C.i32(C.is_quest_artifact(obj))||C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_unique").value)))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FAKE_AMULET_OF_YENDOR)&&Number(!(C.field(obj,"obj","known").value))))))))&&Number(C.field(mon,"monst","m_id").value==C.field(C.field(C.svq,"instance_globals_saved_q","quest_status").address,"q_score","leader_m_id").value))))))) {
        /* AIS: changes to wakeup() means that it's now less inappropriate
           here than it used to be, but manual version works just as well */
        (C.field(mon,"monst","msleeping").value=C.u32(0));
        (C.field(mon,"monst","mstrategy").value=C.u64(C.field(mon,"monst","mstrategy").value&C.u64(C.i64((~(C.i64((268435456n|536870912n))))))));
        if(C.field(mon,"monst","mcanmove").value) {
            C.variadic(61,C.literal("%s catches %s."),C.Some_Monnam(mon),C.the(C.xname(obj)));
            /* leader will keep tossed invocation item after you've done the
               invocation and it's become unnecessary for completion.. */
            if(Number(!!((Number(!!(Number(!!(C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","invoked").value)&&C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_unique").value)))&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.AMULET_OF_YENDOR))))||Number(!(C.field(mon,"monst","mpeaceful").value))))) {
                /* ...or any special item, if you've made him angry */
                /* give an explanation for keeping the item only if leader is
                   not doing it out of anger */
                if(Number(!!(C.i32(C.field(mon,"monst","mpeaceful").value)&&Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))))) {
                    /* just in case, identify the object so its name will
                       appear in the message */
                    C.fully_identify_obj(obj);
                    C.variadic(62,C.literal("%s part in this is finished."),C.s_suffix(C.The(C.xname(obj))));
                    C.variadic(63,C.literal("We will guard it in case it is ever needed again, %s forbid."),C.align_gname(C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value));
                }
                if(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)||C.i32(C.field(obj,"obj","unpaid").value)))) check_shop_obj(obj,C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value,(C.i8(0)));
                /* not very likely... */
                C.mpickobj(mon,obj);
            } else {
                /* under normal circumstances, leader will say something and
                   then return the item to the hero */
                let next2u=C.monnear(mon,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
                C.finish_quest(obj);
                /* acknowledge quest completion */
                C.variadic(64,C.literal("%s %s %s back to you."),C.Some_Monnam(mon),((C.i32(next2u)?C.literal("hands"):C.literal("tosses"))),C.the(C.xname(obj)));
                if(Number(!(next2u))) sho_obj_return_to_u(obj);
                (obj=C.addinv(obj));
                /* back into your inventory */
                ((obj));
                C.encumber_msg();
            }
            return 1;
            /* caller doesn't need to place it */
        }
        return 0;
    }
    (dieroll=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2152,(C.literal("thitmonst"))),C.rnd(20))):C.rnd(20))));
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||(Number(!!(Number(C.i32(C.field((obj),"obj","oclass").value)==C.TOOL_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)!=C.P_NONE))))))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)))) {
        if(Number(hmode==C.HMON_KICKED)) {
            /* throwing adjustments and weapon skill bonus don't apply */
            (tmp=C.i32(tmp-(((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))?5:3))));
        } else if((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))) {
            if(Number(!((Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))))) {
                (tmp=C.i32(tmp-4));
            } else {
                (tmp=C.i32(tmp+C.i32((C.i32(C.field(C.global("uwep").value,"obj","spe").value)-((Number(C.i32(C.field((C.global("uwep").value),"obj","oeroded").value)>C.i32(C.field((C.global("uwep").value),"obj","oeroded2").value))?C.i32(C.field((C.global("uwep").value),"obj","oeroded").value):C.i32(C.field((C.global("uwep").value),"obj","oeroded2").value)))))));
                (tmp=C.i32(tmp+C.weapon_hit_bonus(C.global("uwep").value)));
                if(C.field(C.global("uwep").value,"obj","oartifact").value) (tmp=C.i32(tmp+C.spec_abon(C.global("uwep").value,mon)));
                /*
                 * Elves and Samurais are highly trained w/bows,
                 * especially their own special types of bow.
                 * Polymorphing won't make you a bow expert.
                 */
                if(Number(!!(Number(!!((Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_ELF)))||(Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_SAMURAI))))))&&(Number(!!(Number(!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))))||(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","selfmask").value))))!=C.u64(0n))))))))&&Number(C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_BOW)))) {
                    (tmp=C.i32((tmp+1)));
                    if(Number(!!((Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_ELF)))&&Number(C.i32(C.field(C.global("uwep").value,"obj","otyp").value)==C.ELVEN_BOW))))||(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_SAMURAI)))&&Number(C.i32(C.field(C.global("uwep").value,"obj","otyp").value)==C.YUMI))))))) (tmp=C.i32((tmp+1)));
                }
            }
        } else {
            /* thrown non-ammo or applied polearm/grapnel */
            if(Number(otyp==C.BOOMERANG)) (tmp=C.i32(tmp+4));
 else if(throwing_weapon(obj)) (tmp=C.i32(tmp+2));
 else if(Number(obj==C.field(C.gt,"instance_globals_t","thrownobj").value)) (tmp=C.i32(tmp-2));
            /* arbitrary */
            /* meant to be thrown */
            /* not meant to be thrown */
            /* we know we're dealing with a weapon or weptool handled
               by WEAPON_SKILLS once ammo objects have been excluded */
            (tmp=C.i32(tmp+C.weapon_hit_bonus(obj)));
        }
        if(Number(tmp>=dieroll)) {
            let wasthrown=C.i8((Number(C.field(C.gt,"instance_globals_t","thrownobj").value!=0))); let chopper=C.i8((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_AXE)))));
            /* remember weapon attribute; hmon() might destroy obj */
            /* attack hits mon */
            if(Number(hmode==C.HMON_APPLIED)) {
                /* ranged hit with wielded polearm */
                /* hmon()'s caller is expected to do this; however, hmon()
                   delivers the "hit with wielded weapon for first time"
                   gamelog message when applicable */
                ((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","weaphit").value=C.i64((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","weaphit").value+1n)))-1n);
            }
            if(C.hmon(mon,obj,hmode,dieroll)) {
                /* mon still alive */
                if(C.field(mon,"monst","wormno").value) C.cutworm(mon,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,chopper);
            }
            C.exercise(C.A_DEX,(C.i8(1)));
            /* if hero was swallowed and projectile killed the engulfer,
               'obj' got added to engulfer's inventory and then dropped,
               so we can't safely use that pointer anymore; it escapes
               the chance to be used up here... */
            if(Number(!!(C.i32(wasthrown)&&Number(!(C.field(C.gt,"instance_globals_t","thrownobj").value))))) return 1;
            /* projectiles other than magic stones sometimes disappear
               when thrown; projectiles aren't among the types of weapon
               that hmon() might have destroyed so obj is intact */
            if(should_mulch_missile(obj)) {
                if(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)||C.i32(C.field(obj,"obj","unpaid").value)))) check_shop_obj(obj,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,(C.i8(1)));
                C.obfree(obj,0);
                return 1;
            }
            C.passive_obj(mon,obj,0);
        } else {
            tmiss(obj,mon,(C.i8(1)));
            if(Number(hmode==C.HMON_APPLIED)) C.wakeup(mon,(C.i8(1)));
        }
    } else if(Number(otyp==C.HEAVY_IRON_BALL)) {
        C.exercise(C.A_STR,(C.i8(1)));
        if(Number(tmp>=dieroll)) {
            let was_swallowed=C.i32(guaranteed_hit);
            C.exercise(C.A_DEX,(C.i8(1)));
            if(Number(!(C.hmon(mon,obj,hmode,dieroll)))) {
                /* mon killed */
                if(Number(!!(Number(!!(was_swallowed&&Number(!(C.field(C.u,"you","uswallow").value))))&&Number(obj==C.global("uball").value)))) return 1;
                /* already did placebc() */
            }
        } else {
            tmiss(obj,mon,(C.i8(1)));
        }
    } else if(Number(otyp==C.BOULDER)) {
        C.exercise(C.A_STR,(C.i8(1)));
        if(Number(tmp>=dieroll)) {
            C.exercise(C.A_DEX,(C.i8(1)));
            C.hmon(mon,obj,hmode,dieroll);
        } else {
            tmiss(obj,mon,(C.i8(1)));
        }
    } else if(Number(!!((Number(!!(Number(!!(Number(!!(Number(otyp==C.EGG)||Number(otyp==C.CREAM_PIE)))||Number(otyp==C.BLINDING_VENOM)))||Number(otyp==C.ACID_VENOM))))&&(Number(!!(C.i32(guaranteed_hit)||Number(C.i32((C.acurr(C.A_DEX)))>((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2258,(C.literal("thitmonst"))),C.rnd(25))):C.rnd(25)))))))))) {
        C.hmon(mon,obj,hmode,dieroll);
        return 1;
        /* hmon used it up */
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)&&(Number(!!(C.i32(guaranteed_hit)||Number(C.i32((C.acurr(C.A_DEX)))>((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2263,(C.literal("thitmonst"))),C.rnd(25))):C.rnd(25)))))))))) {
        C.potionhit(mon,obj,1);
        return 1;
    } else if(Number(!!((((Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_MONKEY)*C.sizes["struct permonst"]))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_APE)*C.sizes["struct permonst"])))))?Number(C.i32(C.field((obj),"obj","otyp").value)==C.BANANA):(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(4194304n))))!=C.u64(0n)))&&Number(C.i32(C.field((obj),"obj","oclass").value)==C.FOOD_CLASS)))&&(Number(!!(Number(!!(Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)!=C.S_UNICORN)||Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.VEGGY)))||(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.CORPSE)&&Number(C.field((obj),"obj","corpsenm").value==C.PM_LICHEN))))))))))))||(Number(!!(C.i32(C.field(mon,"monst","mtame").value)&&Number(C.dogfood(mon,obj)<=C.ACCFOOD))))))) {
        if(C.tamedog(mon,obj,(C.i8(1)))) {
            return 1;
            /* obj is gone */
        } else {
            tmiss(obj,mon,(C.i8(0)));
            (C.field(mon,"monst","msleeping").value=C.u32(0));
            (C.field(mon,"monst","mstrategy").value=C.u64(C.field(mon,"monst","mstrategy").value&C.u64(C.i64((~(C.i64((268435456n|536870912n))))))));
        }
    } else if(guaranteed_hit) {
        let trail=C.stackAlloc((1*256));
        let monname;
        let md=C.field(C.field(C.u,"you","ustuck").value,"monst","data").value;
        /* this assumes that guaranteed_hit is due to swallowing */
        C.wakeup(mon,(C.i8(1)));
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&(Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))))) {
            if((Number((C.u64((C.field((md),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))) {
                C.minstapetrify(C.field(C.u,"you","ustuck").value,(C.i8(1)));
                /* Don't leave a cockatrice corpse available in a statue */
                if(Number(!(C.field(C.u,"you","uswallow").value))) {
                    C.delobj(obj);
                    return 1;
                }
            }
        }
        C.strcpy(trail,((Number(C.dmgtype_fromattack((md),26,11)!=0))?C.literal(" entrails"):((Number(!!(Number(C.i32(C.field((md),"permonst","mlet").value)==C.S_VORTEX)||Number((md)==(C.mons+Number(C.PM_AIR_ELEMENTAL)*C.sizes["struct permonst"])))))?C.literal(" currents"):C.literal(""))));
        (monname=C.mon_nam(mon));
        if(C.cell(trail,"char").value) (monname=C.s_suffix(monname));
        C.variadic(65,C.literal("%s into %s%s."),C.Tobjnam(obj,C.literal("vanish")),monname,trail);
    } else {
        tmiss(obj,mon,(C.i8(1)));
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function gem_accept(mon,obj)
{
    mon=C.ptr(mon);
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    try {
    
    let buf=C.stackAlloc((1*256));
    let is_buddy=C.i8(Number(C.sgn(C.i32(C.field(C.field(mon,"monst","data").value,"permonst","maligntyp").value))==C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))));
    let is_gem=C.i8(Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GEMSTONE));
    let ret=0;
    C.strcpy(buf,C.Monnam(mon));
    (C.field(mon,"monst","mpeaceful").value=C.u32(1));
    (C.field(mon,"monst","mavenge").value=C.u32(0));
    nopick: {
        /* object properly identified */
        if(Number(!!(C.i32(C.field(obj,"obj","dknown").value)&&C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value)))) {
            if(is_gem) {
                if(is_buddy) {
                    C.strcat(buf,C.staticAddress("addluck"));
                    C.change_luck(C.i8(5));
                } else {
                    C.strcat(buf,C.staticAddress("maybeluck"));
                    C.change_luck(C.i8(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2334,(C.literal("gem_accept"))),C.rn2(7))):C.rn2(7)))-3))));
                }
            } else {
                C.strcat(buf,C.staticAddress("nogood"));
                break nopick; /* original goto nopick */
            }
            /* making guesses */
        } else if(Number(!!((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value))))||C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_uname").value))) {
            if(is_gem) {
                if(is_buddy) {
                    C.strcat(buf,C.staticAddress("addluck"));
                    C.change_luck(C.i8(2));
                } else {
                    C.strcat(buf,C.staticAddress("maybeluck"));
                    C.change_luck(C.i8(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2349,(C.literal("gem_accept"))),C.rn2(3))):C.rn2(3)))-1))));
                }
            } else {
                C.strcat(buf,C.staticAddress("nogood"));
                break nopick; /* original goto nopick */
            }
            /* value completely unknown to @ */
        } else {
            if(is_gem) {
                if(is_buddy) {
                    C.strcat(buf,C.staticAddress("addluck"));
                    C.change_luck(C.i8(1));
                } else {
                    C.strcat(buf,C.staticAddress("maybeluck"));
                    C.change_luck(C.i8(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2364,(C.literal("gem_accept"))),C.rn2(3))):C.rn2(3)))-1))));
                }
            } else {
                C.strcat(buf,C.staticAddress("noluck"));
            }
        }
        C.strcat(buf,C.staticAddress("acceptgift"));
        if(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)||C.i32(C.field(obj,"obj","unpaid").value)))) check_shop_obj(obj,C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value,(C.i8(1)));
        C.mpickobj(mon,obj);
        /* may merge and free obj */
        (ret=1);
    }
    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(66,C.literal("%s"),buf);
    if(Number(!(C.tele_restrict(mon)))) C.rloc(mon,C.u32(2));
    return ret;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Comments about the restructuring of the old breaks() routine.
 *
 * There are now three distinct phases to object breaking:
 *     breaktest() - which makes the check/decision about whether the
 *                   object is going to break.
 *     breakmsg()  - which outputs a message about the breakage,
 *                   appropriate for that particular object. Should
 *                   only be called after a positive breaktest().
 *                   on the object and, if it going to be called,
 *                   it must be called before calling breakobj().
 *                   Calling breakmsg() is optional.
 *     breakobj()  - which actually does the breakage and the side-effects
 *                   of breaking that particular object. This should
 *                   only be called after a positive breaktest() on the
 *                   object.
 *
 * Each of the above routines is currently static to this source module.
 * There are two routines callable from outside this source module which
 * perform the routines above in the correct sequence.
 *
 *   hero_breaks() - called when an object is to be broken as a result
 *                   of something that the hero has done. (throwing it,
 *                   kicking it, etc.)
 *   breaks()      - called when an object is to be broken for some
 *                   reason other than the hero doing something to it.
 */
/*
 * The hero causes breakage of an object (throwing, dropping it, etc.)
 * Return 0 if the object didn't break, 1 if the object broke.
 */
export function hero_breaks(obj,x,y,breakflags)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    breakflags=C.u32(breakflags);
    /* object location (ox, oy may not be right) */
    /* from_invent: thrown or dropped by player; maybe on shop bill;
       by-hero is implicit so callers don't need to specify BRK_BY_HERO */
    let from_invent=C.i8(Number((C.u32((breakflags&C.u32(2))))!=C.u32(0))); let in_view=C.i8(((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.i32((C.i8(0))):(Number(!!(C.i32(from_invent)||(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0)))))));
    let brk=(C.u32((breakflags&C.u32((C.i32((4|8)))))));
    /* only call breaktest if caller hasn't already specified the outcome */
    if(Number(!(brk))) (brk=C.u32((C.i32(breaktest(obj))?4:8)));
    if(Number(brk==C.u32(8))) return 0;
    breakmsg(obj,in_view);
    return breakobj(obj,x,y,(C.i8(1)),from_invent);
}

/*
 * The object is going to break for a reason other than the hero doing
 * something to it.
 * Return 0 if the object doesn't break, 1 if the object broke.
 */
export function breaks(obj,x,y)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    /* object location (ox, oy may not be right) */
    let in_view=C.i8(((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.i32((C.i8(0))):(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))));
    if(Number(!(breaktest(obj)))) return 0;
    breakmsg(obj,in_view);
    return breakobj(obj,x,y,(C.i8(0)),(C.i8(0)));
}

export function release_camera_demon(obj,x,y)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    let mtmp;
    if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2460,(C.literal("release_camera_demon"))),C.rn2(3))):C.rn2(3)))))&&Number(((mtmp=C.makemon((C.mons+Number((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2461,(C.literal("release_camera_demon"))),C.rn2(3))):C.rn2(3)))?C.PM_HOMUNCULUS:C.PM_IMP))*C.sizes["struct permonst"]),x,y,C.u32(131072n))))!=0)))) {
        if((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))) C.variadic(67,C.literal("%s is released!"),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.An(C.rndmonnam(0)):C.literal("The picture-painting demon")));
        (C.field(mtmp,"monst","mpeaceful").value=C.u32(Number(!(C.field(obj,"obj","cursed").value))));
        C.set_malign(mtmp);
    }
}

/*
 * Break an object.  Breakable armor goes through erosion steps; other
 * items break unconditionally.  Assumes all resistance checks
 * and break messages have been delivered prior to getting here.
 * (No longer true; breakmsg() is silent for crackable armor and we
 * call erode_obj() for it and that delivers a damaged-the-item message.)
 */
export function breakobj(obj,x,y,hero_caused,from_invent)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    hero_caused=C.i8(hero_caused);
    from_invent=C.i8(from_invent);
    /* object location (ox, oy may not be right) */
    /* is this the hero's fault? */
    let fracture=(C.i8(0));
    let explosion=(C.i8(0));
    if((Number(!!(Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)&&Number(C.i32(C.field((obj),"obj","oclass").value)==C.ARMOR_CLASS))))) return (Number(C.erode_obj(obj,C.armor_simple_name(obj),4,C.i32((2|4)))==3));
    /* if erodeproof, erode_obj() will say so */
    switch((Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)?C.POT_WATER:C.i32(C.field(obj,"obj","otyp").value))) {
        case (C.MIRROR):
            if(hero_caused) C.change_luck(C.i8(C.i32((-2))));
        break;
        case (C.POT_WATER):
            /* really, all potions */
            (C.field(obj,"obj","in_use").value=C.u32(1));
        /* in case it's fatal */
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_OIL)&&C.i32(C.field(obj,"obj","lamplit").value)))) {
            C.explode_oil(obj,x,y);
        } else if((Number(C.dist2(((x)),((y)),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))) {
            if(Number(!!(Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(1024n))))!=C.u64(0n)))))||(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))))) {
                /* wet towel protects both eyes and breathing */
                if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)!=C.POT_WATER)&&Number(!((Number(!!(Number(!!(C.global("ublindf").value&&Number(C.i32(C.field(C.global("ublindf").value,"obj","otyp").value)==C.TOWEL)))&&Number(C.i32(C.field(C.global("ublindf").value,"obj","spe").value)>0))))))))) {
                    if(Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(1024n))))!=C.u64(0n)))))) {
                        /* [what about "familiar odor" when known?] */
                        C.variadic(68,C.literal("smell a peculiar odor..."));
                    } else {
                        let eyes=C.body_part(C.EYE);
                        if(Number(((Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))))?0:((Number(!!(Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_CYCLOPS)*C.sizes["struct permonst"]))||Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_FLOATING_EYE)*C.sizes["struct permonst"])))))?1:2)))!=1)) (eyes=C.makeplural(eyes));
                        C.variadic(69,C.literal("%s %s."),eyes,C.vtense(eyes,C.literal("water")));
                    }
                }
                C.potionbreathe(obj);
            }
        }
        /* monster breathing isn't handled... [yet?] */
        break;
        case (C.EXPENSIVE_CAMERA):
            release_camera_demon(obj,x,y);
        break;
        case (C.EGG):
            /* breaking your own eggs is bad luck */
            if(Number(!!(Number(!!(C.i32(hero_caused)&&C.i32(C.field(obj,"obj","spe").value)))&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS))))))) C.change_luck(C.i8(C.i64((-((Number((C.field(obj,"obj","quan").value)<(5n))?(C.field(obj,"obj","quan").value):(5n)))))));
        if(Number(C.field(obj,"obj","corpsenm").value==C.PM_PYROLISK)) (explosion=(C.i8(1)));
        break;
        case (C.BOULDER):
            case (C.STATUE):
                /* caller will handle object disposition;
           we're just doing the shop theft handling */
                (fracture=(C.i8(1)));
        break;
        default:
            break;
    }
    if(hero_caused) {
        if(Number(!!(C.i32(from_invent)||C.i32(C.field(obj,"obj","unpaid").value)))) {
            if(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)||C.i32(C.field(obj,"obj","unpaid").value)))) check_shop_obj(obj,x,y,(C.i8(1)));
        } else if(Number(!!(Number(!(C.field(obj,"obj","no_charge").value))&&C.i32(C.costly_spot(x,y))))) {
            /* it is assumed that the obj is a floor-object */
            let o_shop=C.in_rooms(x,y,C.SHOPBASE);
            let shkp=C.shop_keeper(C.cell(o_shop,"char").value);
            if(shkp) {
                /* (implies *o_shop != '\0') */
                let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
                /* base shk actions on her peacefulness at start of
                   this turn, so that "simultaneous" multiple breakage
                   isn't drastically worse than single breakage */
                if(Number(C.field(C.gh,"instance_globals_h","hero_seq").value!=C.field(eshkp,"eshk","break_seq").value)) (C.field(eshkp,"eshk","seq_peaceful").value=C.i8(C.field(shkp,"monst","mpeaceful").value));
                if(Number(!!(Number(!!((Number(C.stolen_value(obj,x,y,C.field(eshkp,"eshk","seq_peaceful").value,(C.i8(0)))>0n))&&(Number(!!(Number(C.i32(C.cell(o_shop,"char").value)!=C.i32(C.cell((C.field(C.u,"you","ushops").address+Number(0)*1),"char").value))||Number(!(C.inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))))))&&Number(C.field(C.gh,"instance_globals_h","hero_seq").value!=C.field(eshkp,"eshk","break_seq").value)))) C.make_angry_shk(shkp,x,y);
                /* make_angry_shk() is only called on the first instance
                   of breakage during any particular hero move */
                (C.field(eshkp,"eshk","break_seq").value=C.field(C.gh,"instance_globals_h","hero_seq").value);
            }
        }
    }
    if(Number(!(fracture))) C.delobj(obj);
    if(explosion) C.explode(x,y,C.i32((-11)),((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dothrow.c"),2572,(C.literal("breakobj"))),C.d((3),(6)))):C.d((3),(6)))),C.i8(0),C.EXPL_FIERY);
    return 1;
}

/*
 * Check to see if obj (which has just hit hard something at speed, e.g.
 * thrown or dropped from height) is going to break, but don't actually
 * break it. Return 0 if the object isn't going to break, 1 if it is.
 */
export function breaktest(obj)
{
    obj=C.ptr(obj);
    let nonbreakchance=1;
    /* chance for non-artifacts to resist */
    /* this may need to be changed if actual glass armor gets added someday;
       for now, it affects crystal plate mail and helm of brilliance;
       either of them will have to be cracked 4 times before breaking */
    if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.ARMOR_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)))) (nonbreakchance=90);
    if(C.obj_resists(obj,nonbreakchance,99)) return (C.i8(0));
    if(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)&&Number(!(C.field(obj,"obj","oartifact").value))))&&Number(C.i32(C.field(obj,"obj","oclass").value)!=C.GEM_CLASS)))) return (C.i8(1));
    switch((Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)?C.POT_WATER:C.i32(C.field(obj,"obj","otyp").value))) {
        case (C.EXPENSIVE_CAMERA):
            case (C.POT_WATER):
                /* really, all potions */
                case (C.EGG):
                    case (C.CREAM_PIE):
                        case (C.MELON):
                            case (C.ACID_VENOM):
                                case (C.BLINDING_VENOM):
                                    return (C.i8(1));
        default:
            return (C.i8(0));
    }
}

export function breakmsg(obj,in_view)
{
    obj=C.ptr(obj);
    in_view=C.i8(in_view);
    let to_pieces;
    if((Number(!!(Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)&&Number(C.i32(C.field((obj),"obj","oclass").value)==C.ARMOR_CLASS))))) return;
    /* breakobj() will call erode_obj() for message */
    (to_pieces=C.literal(""));
    switch((Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)?C.POT_WATER:C.i32(C.field(obj,"obj","otyp").value))) {
        default:
            /* glass or crystal wand */
            if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.WAND_CLASS)) C.variadic(70,C.literal("breaking odd object (%d)?"),C.i32(C.field(obj,"obj","otyp").value));
        ;
        /*FALLTHRU*/
        case (C.LENSES):
            case (C.MIRROR):
                case (C.CRYSTAL_BALL):
                    case (C.EXPENSIVE_CAMERA):
                        (to_pieces=C.literal(" into a thousand pieces"));
        ;
        /*FALLTHRU*/
        case (C.POT_WATER):
            /* really, all potions */
            if(Number(!(in_view))) C.variadic(71,C.literal("%s shatter!"),C.field(C.c_common_strings,"c_common_strings","c_something").value);
 else C.variadic(72,C.literal("%s shatter%s%s!"),C.Doname2(obj),((Number(C.field(obj,"obj","quan").value==1n))?C.literal("s"):C.literal("")),to_pieces);
        break;
        case (C.EGG):
            case (C.MELON):
                C.variadic(73,C.literal("Splat!"));
        break;
        case (C.CREAM_PIE):
            if(in_view) C.variadic(74,C.literal("What a mess!"));
        break;
        case (C.ACID_VENOM):
            case (C.BLINDING_VENOM):
                C.variadic(75,C.literal("Splash!"));
        break;
    }
}

export function throw_gold(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    try {
    obj=C.local("struct obj *",obj);
    let range; let odx; let ody;
    let mon;
    if(Number(!!(Number(!!(Number(!(C.field(C.u,"you","dx").value))&&Number(!(C.field(C.u,"you","dy").value))))&&Number(!(C.field(C.u,"you","dz").value))))) {
        C.variadic(76,C.literal("cannot throw gold at yourself."));
        /* If we tried to throw part of a stack, force it to merge back
           together (same as in throw_obj).  Essential for gold. */
        if(Number(!!(Number(C.field(obj.value,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value)||Number(C.field(obj.value,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value)))) C.unsplitobj(obj.value);
        return 2;
    }
    C.freeinv(obj.value);
    if(C.field(C.u,"you","uswallow").value) {
        let swallower=C.mon_nam(C.field(C.u,"you","ustuck").value);
        if((Number(C.dmgtype_fromattack((C.field(C.field(C.u,"you","ustuck").value,"monst","data").value),26,11)!=0))) (swallower=C.strcat(C.s_suffix(swallower),C.literal(" entrails")));
        /* note: s_suffix() returns a modifiable buffer */
        C.variadic(77,C.literal("gold disappears into %s."),swallower);
        C.add_to_minv(C.field(C.u,"you","ustuck").value,obj.value);
        return 1;
    }
    if(C.field(C.u,"you","dz").value) {
        if(Number(!!(Number(!!(Number(!!(Number(C.field(C.u,"you","dz").value<0)&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))))))&&Number(!((C.field(C.u,"you","uinwater").value)))))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))))) {
            C.variadic(78,C.literal("gold hits the %s, then falls back on top of your %s."),C.ceiling(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value),C.body_part(C.HEAD));
            /* some self damage? */
            if(C.global("uarmh").value) C.variadic(79,C.literal("Fortunately, you are wearing %s!"),C.an(C.helm_simple_name(C.global("uarmh").value)));
        }
        (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.field(C.u,"you","ux").value);
        (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.field(C.u,"you","uy").value);
    } else {
        /* consistent with range for normal objects */
        (range=C.i32((C.u32((C.u32(C.i32(Math.trunc((C.i32(((C.acurrstr())))/2))))-C.u32(Math.trunc((C.field(obj.value,"obj","owt").value/C.u32(40)))))))));
        /* see if the gold has a place to move into */
        (odx=C.i32((C.i32(C.field(C.u,"you","ux").value)+C.field(C.u,"you","dx").value)));
        (ody=C.i32((C.i32(C.field(C.u,"you","uy").value)+C.field(C.u,"you","dy").value)));
        if(Number(!!(Number(!!(Number(!(C.isok(C.i16(odx),C.i16(ody))))||Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(odx)*(C.sizes["struct rm"]*21))+Number(ody)*C.sizes["struct rm"]),"rm","typ").value))>=C.POOL))))))||C.i32(C.closed_door(C.i16(odx),C.i16(ody)))))) {
            (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.field(C.u,"you","ux").value);
            (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.field(C.u,"you","uy").value);
        } else {
            (mon=C.bhit(C.field(C.u,"you","dx").value,C.field(C.u,"you","dy").value,range,C.i32(C.THROWN_WEAPON),0,0,obj.address));
            if(Number(!(obj.value))) return 1;
            /* object is gone */
            if(mon) {
                if(C.ghitm(mon,obj.value)) return 1;
                /* was it caught? */
            } else {
                if(C.ship_object(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,(C.i8(0)))) return 1;
            }
        }
    }
    if(C.flooreffects(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,C.literal("fall"))) return 1;
    if(Number(C.field(C.u,"you","dz").value>0)) C.variadic(80,C.literal("gold hits the %s."),C.surface(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value));
    C.place_object(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
    if(C.cell(C.field(C.u,"you","ushops").address,"char").value) C.sellobj(obj.value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
    C.stackobj(obj.value);
    C.newsym(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
    return 1;
    } finally {C.stackRestore(stackFrame); }
}

/*dothrow.c*/
export const dothrowStaticInitializers = C => [
    {name:"nogood",type:"char[33]",size:(1*33),values:C.literal(" is not interested in your junk.")},
    {name:"acceptgift",type:"char[20]",size:(1*20),values:C.literal(" accepts your gift.")},
    {name:"maybeluck",type:"char[14]",size:(1*14),values:C.literal(" hesitatingly")},
    {name:"noluck",type:"char[12]",size:(1*12),values:C.literal(" graciously")},
    {name:"addluck",type:"char[12]",size:(1*12),values:C.literal(" gratefully")},
];
