import { C } from '../c-runtime/context.js';
/* NetHack 5.0	pray.c	$NHDT-Date: 1762680996 2025/11/09 01:36:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.244 $ */
/* Copyright (c) Benson I. Margulies, Mike Stephenson, Steve Linhart, 1989. */
/* NetHack may be freely redistributed.  See license for details. */
/* NORETURN */
/* simplify a few tests */
/*
 * Logic behind deities and altars and such:
 * + prayers are made to your god if not on an altar, and to the altar's god
 *   if you are on an altar
 * + If possible, your god answers all prayers, which is why bad things happen
 *   if you try to pray on another god's altar
 * + sacrifices work basically the same way, but the other god may decide to
 *   accept your allegiance, after which they are your god.  If rejected,
 *   your god takes over with your punishment.
 * + if you're in Gehennom, all messages come from Moloch
 */
/*
 *      Moloch, who dwells in Gehennom, is the "renegade" cruel god
 *      responsible for the theft of the Amulet from Marduk, the Creator.
 *      Moloch is unaligned.
 */
export const Moloch=C=>C.literal("Moloch");
export const godvoices=C=>[C.literal("booms out"),C.literal("thunders"),C.literal("rings out"),C.literal("booms")];
/*
 * The actual trouble priority is determined by the order of the
 * checks performed in in_trouble() rather than by these numeric
 * values, so keep that code and these values synchronized in
 * order to have the values be meaningful.
 */
/* stinking cloud */
/* used by turn undead iteration function; always reinitialized
   before iterating that, so don't need to be globals */
/* critically low hit points if hp <= 5 or hp <= maxhp/N for some N */
export function critically_low_hp(only_if_injured)
{
    only_if_injured=C.i8(only_if_injured);
    /* determines whether maxhp <= 5 matters */
    let divisor; let hplim; let curhp=((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.field(C.u,"you","mh").value:C.field(C.u,"you","uhp").value); let maxhp=((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.field(C.u,"you","mhmax").value:C.field(C.u,"you","uhpmax").value);
    if(Number(!!(C.i32(only_if_injured)&&Number(!((Number(curhp<maxhp))))))) return (C.i8(0));
    /* if maxhp is extremely high, use lower threshold for the division test
       (golden glow cuts off at 11+5*lvl, nurse interaction at 25*lvl; this
       ought to use monster hit dice--and a smaller multiplier--rather than
       ulevel when polymorphed, but polyself doesn't maintain that) */
    (hplim=C.i32((15*C.field(C.u,"you","ulevel").value)));
    if(Number(maxhp>hplim)) (maxhp=hplim);
    /* 7 used to be the unconditional divisor */
    switch(C.xlev_to_rank(C.field(C.u,"you","ulevel").value)) {
        /* maps 1..30 into 0..8 */
        case (0):
            case (1):
                (divisor=5);
        break;
        /* explvl 1 to 5 */
        case (2):
            case (3):
                (divisor=6);
        break;
        /* explvl 6 to 13 */
        case (4):
            case (5):
                (divisor=7);
        break;
        /* explvl 14 to 21 */
        case (6):
            case (7):
                (divisor=8);
        break;
        /* explvl 22 to 29 */
        default:
            (divisor=9);
        break;
        /* explvl 30+ */
    }
    /* 5 is a magic number in TROUBLE_HIT handling below */
    return C.i8((Number(!!(Number(curhp<=5)||Number(C.i32((curhp*divisor))<=maxhp)))));
}

/* return True if surrounded by impassible rock, regardless of the state
   of your own location (for example, inside a doorless closet) */
export function stuck_in_wall()
{
    let i; let j; let x; let y; let count=0;
    if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","extrinsic").value)))) return (C.i8(0));
    for((i=C.i32((-1)));Number(i<=1);((i=C.i32((i+1)))-1)) {
        (x=C.i32((C.i32(C.field(C.u,"you","ux").value)+i)));
        for((j=C.i32((-1)));Number(j<=1);((j=C.i32((j+1)))-1)) {
            if(Number(!!(Number(!(i))&&Number(!(j))))) continue;
            (y=C.i32((C.i32(C.field(C.u,"you","uy").value)+j)));
            if(Number(!!(Number(!!(Number(!(C.isok(C.i16(x),C.i16(y))))||(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))&&(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.SDOOR)&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)!=C.SCORR)))))))))||(Number(!!(C.i32(blocked_boulder(i,j))&&Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(134217728n))))!=C.u64(0n))))))))))) (count=C.i32((count+1)));
        }
    }
    return C.i8(((Number(count==8))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/*
 * Return 0 if nothing particular seems wrong, positive numbers for
 * serious trouble, and negative numbers for comparative annoyances.
 * This returns the worst problem. There may be others, and the gods
 * may fix more than one.
 *
 * This could get as bizarre as noting surrounding opponents, (or
 * hostile dogs), but that's really hard.
 *
 * We could force rehumanize of polyselfed people, but we can't tell
 * unintentional shape changes from the other kind. Oh well.
 * 3.4.2: make an exception if polymorphed into a form which lacks
 * hands; that's a case where the ramifications override this doubt.
 */
export function in_trouble()
{
    let otmp;
    let i;
    /*
     * major troubles
     */
    if(C.field((C.field(C.u,"you","uprops").address+Number(C.STONED)*C.sizes["struct prop"]),"prop","intrinsic").value) return 14;
    if(C.field((C.field(C.u,"you","uprops").address+Number(C.SLIMED)*C.sizes["struct prop"]),"prop","intrinsic").value) return 13;
    if(C.field((C.field(C.u,"you","uprops").address+Number(C.STRANGLED)*C.sizes["struct prop"]),"prop","intrinsic").value) return 12;
    if(Number(!!(C.field(C.u,"you","utrap").value&&Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_LAVA))))) return 11;
    if(C.field((C.field(C.u,"you","uprops").address+Number(C.SICK)*C.sizes["struct prop"]),"prop","intrinsic").value) return 10;
    if(Number(C.field(C.u,"you","uhs").value>=C.u32(C.WEAK))) return 9;
    if(C.region_danger()) return 8;
    if(Number(!!((Number(!!(Number(!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.UNCHANGING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.UNCHANGING)*C.sizes["struct prop"]),"prop","extrinsic").value))))))&&C.i32(critically_low_hp((C.i8(0))))))) return 7;
    if((Number(!!(Number((C.field(C.u,"you","ulycn").value)>=C.LOW_PM)&&Number((C.field(C.u,"you","ulycn").value)<C.NUMMONS))))) return 6;
    if(Number(!!(Number(C.near_capacity()>=C.EXT_ENCUMBER)&&Number(C.i32((C.i32((C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value))-C.i32((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value))))>3)))) return 5;
    if(stuck_in_wall()) return 4;
    if(Number(!!(Number(!!((Number(!!(Number(!!((C.global("uarmf").value)&&Number(C.i32(C.field((C.global("uarmf").value),"obj","otyp").value)==(C.LEVITATION_BOOTS))))&&C.i32(C.field((C.global("uarmf").value),"obj","cursed").value))))||C.stuck_ring(C.global("uleft").value,C.RIN_LEVITATION)))||C.stuck_ring(C.global("uright").value,C.RIN_LEVITATION)))) return 3;
    if(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))||Number(!(C.freehand()))))) {
        /* for bag/box access [cf use_container()]...
           make sure it's a case that we know how to handle;
           otherwise "fix all troubles" would get stuck in a loop */
        if(C.welded(C.global("uwep").value)) return 2;
        if(Number(!!(Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))&&(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))&&(Number(!!(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.UNCHANGING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.UNCHANGING)*C.sizes["struct prop"]),"prop","extrinsic").value)))))||(Number(!!(Number(((otmp=C.unchanger()))!=0)&&C.i32(C.field(otmp,"obj","cursed").value)))))))))) return 2;
    }
    if(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value&&C.i32(C.field(C.global("ublindf").value,"obj","cursed").value)))) return 1;
    /*
     * minor troubles
     */
    if(Number(!!((Number(C.global("uball").value!=0))||(Number(!!(C.field(C.u,"you","utrap").value&&Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_BURIEDBALL)))))))) return (C.i32((-1)));
    if(Number(!!((Number(!!(Number(!!((C.global("uarmg").value)&&Number(C.i32(C.field((C.global("uarmg").value),"obj","otyp").value)==(C.GAUNTLETS_OF_FUMBLING))))&&C.i32(C.field((C.global("uarmg").value),"obj","cursed").value))))||(Number(!!(Number(!!((C.global("uarmf").value)&&Number(C.i32(C.field((C.global("uarmf").value),"obj","otyp").value)==(C.FUMBLE_BOOTS))))&&C.i32(C.field((C.global("uarmf").value),"obj","cursed").value))))))) return (C.i32((-2)));
    if(worst_cursed_item()) return (C.i32((-3)));
    if(C.field(C.u,"you","usteed").value) {
        /* can't voluntarily dismount from a cursed saddle */
        (otmp=C.which_armor(C.field(C.u,"you","usteed").value,1048576n));
        if((Number(!!(Number(!!((otmp)&&Number(C.i32(C.field((otmp),"obj","otyp").value)==(C.SADDLE))))&&C.i32(C.field((otmp),"obj","cursed").value))))) return (C.i32((-4)));
    }
    if(Number(!!(Number(!!(Number((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))>1n)&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&C.i64((~16777215n)))))))))&&(Number(!!(Number(!(C.field(C.u,"you","uswallow").value))||Number(!(C.attacktype_fordmg(C.field(C.field(C.u,"you","ustuck").value,"monst","data").value,11,11))))))))) return (C.i32((-5)));
    /* deafness isn't its own trouble; healing magic cures deafness
       when it cures blindness, so do the same with trouble repair */
    if(Number((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))>1n)) return (C.i32((-5)));
    for((i=0);Number(i<C.A_MAX);((i=C.i32((i+1)))-1)) if(Number(C.i32((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(i)*1),"signed char").value))<C.i32((C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(i)*1),"signed char").value)))) return (C.i32((-6)));

    if(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.WOUNDED_LEGS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.WOUNDED_LEGS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field(C.u,"you","usteed").value))))) return (C.i32((-7)));
    if(Number(C.field(C.u,"you","uhs").value>=C.u32(C.HUNGRY))) return (C.i32((-8)));
    if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.STUNNED)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n))) return (C.i32((-9)));
    if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n))) return (C.i32((-10)));
    if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n))) return (C.i32((-11)));
    return 0;
}

/* select an item for TROUBLE_CURSED_ITEMS */
export function worst_cursed_item()
{
    let otmp;
    /* if strained or worse, check for loadstone first */
    if(Number(C.near_capacity()>=C.HVY_ENCUMBER)) {
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if((Number(!!(Number(!!((otmp)&&Number(C.i32(C.field((otmp),"obj","otyp").value)==(C.LOADSTONE))))&&C.i32(C.field((otmp),"obj","cursed").value))))) return otmp;

    }
    /* weapon takes precedence if it is interfering
       with taking off a ring or putting on a shield */
    if(Number(!!(C.welded(C.global("uwep").value)&&(Number(!!(C.global("uright").value||(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.TOOL_CLASS))))&&C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_big").value)))))))))) {
        /* weapon */
        (otmp=C.global("uwep").value);
        /* gloves come next, due to rings */
    } else if(Number(!!(C.global("uarmg").value&&C.i32(C.field(C.global("uarmg").value,"obj","cursed").value)))) {
        /* gloves */
        (otmp=C.global("uarmg").value);
        /* then shield due to two handed weapons and spells */
    } else if(Number(!!(C.global("uarms").value&&C.i32(C.field(C.global("uarms").value,"obj","cursed").value)))) {
        /* shield */
        (otmp=C.global("uarms").value);
        /* then cloak due to body armor */
    } else if(Number(!!(C.global("uarmc").value&&C.i32(C.field(C.global("uarmc").value,"obj","cursed").value)))) {
        /* cloak */
        (otmp=C.global("uarmc").value);
    } else if(Number(!!(C.global("uarm").value&&C.i32(C.field(C.global("uarm").value,"obj","cursed").value)))) {
        /* suit */
        (otmp=C.global("uarm").value);
        /* if worn helmet of opposite alignment is making you an adherent
       of the current god, he/she/it won't uncurse that for you */
    } else if(Number(!!(Number(!!(C.global("uarmh").value&&C.i32(C.field(C.global("uarmh").value,"obj","cursed").value)))&&Number(C.i32(C.field(C.global("uarmh").value,"obj","otyp").value)!=C.HELM_OF_OPPOSITE_ALIGNMENT)))) {
        /* helmet */
        (otmp=C.global("uarmh").value);
    } else if(Number(!!(C.global("uarmf").value&&C.i32(C.field(C.global("uarmf").value,"obj","cursed").value)))) {
        /* boots */
        (otmp=C.global("uarmf").value);
    } else if(Number(!!(C.global("uarmu").value&&C.i32(C.field(C.global("uarmu").value,"obj","cursed").value)))) {
        /* shirt */
        (otmp=C.global("uarmu").value);
    } else if(Number(!!(C.global("uamul").value&&C.i32(C.field(C.global("uamul").value,"obj","cursed").value)))) {
        /* amulet */
        (otmp=C.global("uamul").value);
    } else if(Number(!!(C.global("uleft").value&&C.i32(C.field(C.global("uleft").value,"obj","cursed").value)))) {
        /* left ring */
        (otmp=C.global("uleft").value);
    } else if(Number(!!(C.global("uright").value&&C.i32(C.field(C.global("uright").value,"obj","cursed").value)))) {
        /* right ring */
        (otmp=C.global("uright").value);
    } else if(Number(!!(C.global("ublindf").value&&C.i32(C.field(C.global("ublindf").value,"obj","cursed").value)))) {
        /* eyewear */
        (otmp=C.global("ublindf").value);
        /* must be non-blinding lenses */
        /* if weapon wasn't handled above, do it now */
    } else if(C.welded(C.global("uwep").value)) {
        /* weapon */
        (otmp=C.global("uwep").value);
        /* active secondary weapon even though it isn't welded */
    } else if(Number(!!(Number(!!(C.global("uswapwep").value&&C.i32(C.field(C.global("uswapwep").value,"obj","cursed").value)))&&C.i32(C.field(C.u,"you","twoweap").value)))) {
        (otmp=C.global("uswapwep").value);
        /* all worn items ought to be handled by now */
    } else {
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
            if(Number(!(C.field(otmp,"obj","cursed").value))) continue;
            if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.LOADSTONE)||C.i32(C.confers_luck(otmp))))) break;
        }
    }
    return otmp;
}

export function fix_curse_trouble(otmp,what)
{
    if(Number(!(otmp))) {
        C.variadic(0,C.literal("fix_curse_trouble: nothing to uncurse."));
        return;
    }
    if(Number(!!(Number(otmp==C.global("uarmg").value)&&C.field((C.field(C.u,"you","uprops").address+Number(C.GLIB)*C.sizes["struct prop"]),"prop","intrinsic").value))) {
        C.make_glib(0);
        C.variadic(1,C.literal("%s are no longer slippery."),C.gloves_simple_name(C.global("uarmg").value));
        if(Number(!(C.field(otmp,"obj","cursed").value))) return;
    }
    if(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number(!!(Number(otmp==C.global("ublindf").value)&&(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))))))))) {
        C.variadic(2,C.literal("%s %s."),(what?what:C.Yobjnam2(otmp,C.literal("softly glow"))),C.hcolor(C.field(C.c_color_names,"c_color_names","c_amber").value));
        (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_OBJ_GLOWS);
        (C.field(otmp,"obj","bknown").value=C.u32(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))));
        /* ok to skip set_bknown() */
    }
    C.uncurse(otmp);
    C.update_inventory();
}

export function fix_worst_trouble(trouble)
{
    trouble=C.i32(trouble);
    const stackFrame=C.stackSave();
    try {
    let i; let maxhp;
    let otmp=0;
    let what=0;
    const leftglow=C.staticArray("fix_worst_trouble","leftglow","Your left ring softly glows"); const rightglow=C.staticArray("fix_worst_trouble","rightglow","Your right ring softly glows");
    switch(trouble) {
        case (14):
            C.make_stoned(0n,C.literal("You feel more limber."),0,0);
        break;
        case (13):
            C.make_slimed(0n,C.literal("The slime disappears."));
        break;
        case (12):
            if(Number(!!(C.global("uamul").value&&Number(C.i32(C.field(C.global("uamul").value,"obj","otyp").value)==C.AMULET_OF_STRANGULATION)))) {
                C.variadic(3,C.literal("amulet vanishes!"));
                C.useup(C.global("uamul").value);
            }
        C.variadic(4,C.literal("can breathe again."));
        (C.field((C.field(C.u,"you","uprops").address+Number(C.STRANGLED)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(0));
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        break;
        case (11):
            /* teleport should always succeed, but if not, just untrap them */
            if(Number(!(C.safe_teleds(0)))) C.reset_utrap((C.i8(1)));
        C.rescued_from_terrain(C.DISSOLVED);
        /* DISSOLVED: pending cause of death
                                          * if trouble didn't get cured */
        break;
        case (9):
            /* temporarily lost strength recovery now handled by init_uhunger() */
            ;
        /* FALLTHRU*/
        case ((C.i32((-8)))):
            C.variadic(5,C.literal("%s feels content."),C.body_part(C.STOMACH));
        C.init_uhunger();
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        break;
        case (10):
            C.variadic(6,C.literal("better."));
        C.make_sick(0n,0,(C.i8(0)),3);
        break;
        case (8):
            /* stinking cloud, with hero vulnerable to HP loss */
            C.region_safety();
        break;
        case (7):
            /* "fix all troubles" will keep trying if hero has
           5 or less hit points, so make sure they're always
           boosted to be more than that */
            C.variadic(7,C.literal("much better."));
        if((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))) {
            (maxhp=C.i32((C.field(C.u,"you","mhmax").value+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),427,(C.literal("fix_worst_trouble"))),C.rnd(5))):C.rnd(5))))));
            C.setuhpmax(((Number((maxhp)>(C.i32((5+1))))?(maxhp):(C.i32((5+1))))),(C.i8(0)));
            /* acts as setmhmax() */
            (C.field(C.u,"you","mh").value=C.field(C.u,"you","mhmax").value);
        }
        (maxhp=C.field(C.u,"you","uhpmax").value);
        if(Number(maxhp<C.i32((C.i32((C.field(C.u,"you","ulevel").value*5))+11)))) (maxhp=C.i32(maxhp+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),433,(C.literal("fix_worst_trouble"))),C.rnd(5))):C.rnd(5)))));
        /* True: update u.uhpmax even if currently poly'd */
        C.setuhpmax(((Number((maxhp)>(C.i32((5+1))))?(maxhp):(C.i32((5+1))))),(C.i8(1)));
        (C.field(C.u,"you","uhp").value=C.field(C.u,"you","uhpmax").value);
        /* setuhpmax() will do this when u.uhp is higher
                           * than u.uhpmax; prayer also does this if lower */
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        break;
        case (5):
            /* override Fixed_abil; uncurse that if feasible */
            C.variadic(8,C.literal("%sstronger."),((Number(C.i32((C.i32((C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value))-C.i32((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value))))>6))?C.literal("much "):C.literal("")));
        ((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value)=(C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value));
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        if(C.field((C.field(C.u,"you","uprops").address+Number(C.FIXED_ABIL)*C.sizes["struct prop"]),"prop","extrinsic").value) {
            if(Number(((otmp=C.stuck_ring(C.global("uleft").value,C.RIN_SUSTAIN_ABILITY)))!=0)) {
                if(Number(otmp==C.global("uleft").value)) (what=leftglow);
            } else if(Number(((otmp=C.stuck_ring(C.global("uright").value,C.RIN_SUSTAIN_ABILITY)))!=0)) {
                if(Number(otmp==C.global("uright").value)) (what=rightglow);
            }
            if(otmp) {
                fix_curse_trouble(otmp,what);
                break;
            }
        }
        break;
        case (4):
            /* no control, but works on no-teleport levels */
            if(C.safe_teleds(0)) {
                C.variadic(9,C.literal("surroundings change."));
            } else {
                /* safe_teleds() couldn't find a safe place; perhaps the
               level is completely full.  As a last resort, confer
               intrinsic wall/rock-phazing.  Hero might get stuck
               again fairly soon....
               Without something like this, fix_all_troubles can get
               stuck in an infinite loop trying to fix STUCK_IN_WALL
               and repeatedly failing. */
                C.set_itimeout(C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","intrinsic").address,C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),473,(C.literal("fix_worst_trouble"))),C.d((4),(4)))):C.d((4),(4))))+4)))));
                /* 8..20 */
                /* how else could you move between packed rocks or among
               lattice forming "solid" rock? */
                C.variadic(10,C.literal("much slimmer."));
            }
        break;
        case (3):
            if((Number(!!(Number(!!((C.global("uarmf").value)&&Number(C.i32(C.field((C.global("uarmf").value),"obj","otyp").value)==(C.LEVITATION_BOOTS))))&&C.i32(C.field((C.global("uarmf").value),"obj","cursed").value))))) {
                (otmp=C.global("uarmf").value);
            } else if(Number(((otmp=C.stuck_ring(C.global("uleft").value,C.RIN_LEVITATION)))!=0)) {
                if(Number(otmp==C.global("uleft").value)) (what=leftglow);
            } else if(Number(((otmp=C.stuck_ring(C.global("uright").value,C.RIN_LEVITATION)))!=0)) {
                if(Number(otmp==C.global("uright").value)) (what=rightglow);
            }
        fix_curse_trouble(otmp,what);
        break;
        case (2):
            if(C.welded(C.global("uwep").value)) {
                (otmp=C.global("uwep").value);
                fix_curse_trouble(otmp,what);
                break;
            }
        if(Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))&&(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))) {
            if(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.UNCHANGING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.UNCHANGING)*C.sizes["struct prop"]),"prop","extrinsic").value)))))) {
                C.variadic(11,C.literal("shape becomes uncertain."));
                C.rehumanize();
                /* "You return to {normal} form." */
            } else if(Number(!!(Number(((otmp=C.unchanger()))!=0)&&C.i32(C.field(otmp,"obj","cursed").value)))) {
                /* otmp is an amulet of unchanging */
                fix_curse_trouble(otmp,what);
                break;
            }
        }
        if(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))||Number(!(C.freehand()))))) C.variadic(12,C.literal("fix_worst_trouble: couldn't cure hands."));
        break;
        case (1):
            (otmp=C.global("ublindf").value);
        fix_curse_trouble(otmp,what);
        break;
        case (6):
            C.you_unwere((C.i8(1)));
        break;
        /*
     */
        case ((C.i32((-1)))):
            C.variadic(13,C.literal("chain disappears."));
        if(Number(!!(C.field(C.u,"you","utrap").value&&Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_BURIEDBALL))))) C.buried_ball_to_freedom();
 else C.unpunish();
        break;
        case ((C.i32((-2)))):
            if((Number(!!(Number(!!((C.global("uarmg").value)&&Number(C.i32(C.field((C.global("uarmg").value),"obj","otyp").value)==(C.GAUNTLETS_OF_FUMBLING))))&&C.i32(C.field((C.global("uarmg").value),"obj","cursed").value))))) (otmp=C.global("uarmg").value);
 else if((Number(!!(Number(!!((C.global("uarmf").value)&&Number(C.i32(C.field((C.global("uarmf").value),"obj","otyp").value)==(C.FUMBLE_BOOTS))))&&C.i32(C.field((C.global("uarmf").value),"obj","cursed").value))))) (otmp=C.global("uarmf").value);
        fix_curse_trouble(otmp,what);
        break;
        case ((C.i32((-3)))):
            (otmp=worst_cursed_item());
        if(Number(otmp==C.global("uright").value)) (what=rightglow);
 else if(Number(otmp==C.global("uleft").value)) (what=leftglow);
        fix_curse_trouble(otmp,what);
        break;
        case ((C.i32((-6)))):
            /* override Fixed_abil; ignore items which confer that */
            if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) C.variadic(14,C.literal("There's a tiger in your tank."));
 else C.variadic(15,C.literal("in good health again."));
        for((i=0);Number(i<C.A_MAX);((i=C.i32((i+1)))-1)) {
            if(Number(C.i32((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(i)*1),"signed char").value))<C.i32((C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(i)*1),"signed char").value)))) {
                ((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(i)*1),"signed char").value)=(C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(i)*1),"signed char").value));
                (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            }
        }
        C.encumber_msg();
        break;
        case ((C.i32((-5)))):
{
                /* handles deafness as well as blindness */
                let msgbuf=C.stackAlloc((1*256));
                let eyes=C.body_part(C.EYE);
                let cure_deaf=C.i8(((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
                (C.cell((msgbuf+Number(0)*1),"char").value=C.i8(0));
                if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) {
                    if(Number(((Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))))?0:((Number(!!(Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_CYCLOPS)*C.sizes["struct permonst"]))||Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_FLOATING_EYE)*C.sizes["struct permonst"])))))?1:2)))!=1)) (eyes=C.makeplural(eyes));
                    C.variadic(16,msgbuf,C.literal("Your %s %s better"),eyes,C.vtense(eyes,C.literal("feel")));
                    (C.field(C.u,"you","ucreamed").value=C.u32(0));
                    C.make_blinded(0n,(C.i8(0)));
                }
                if(cure_deaf) {
                    C.make_deaf(0n,(C.i8(0)));
                    if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) C.variadic(17,C.eos(msgbuf),C.literal("%s can hear again"),(Number(!(C.cell(msgbuf,"char").value))?C.literal("You"):C.literal(" and you")));
                }
                if(C.cell(msgbuf,"char").value) C.variadic(18,C.literal("%s."),msgbuf);
                break;
            }        case ((C.i32((-7)))):
            C.heal_legs(0);
        break;
        case ((C.i32((-9)))):
            C.make_stunned(0n,(C.i8(1)));
        break;
        case ((C.i32((-10)))):
            C.make_confused(0n,(C.i8(1)));
        break;
        case ((C.i32((-11)))):
            C.variadic(19,C.literal("Looks like you are back in Kansas."));
        C.make_hallucinated(0n,(C.i8(0)),0n);
        break;
        case ((C.i32((-4)))):
            (otmp=C.which_armor(C.field(C.u,"you","usteed").value,1048576n));
        if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) {
            C.variadic(20,C.literal("%s %s."),C.Yobjnam2(otmp,C.literal("softly glow")),C.hcolor(C.field(C.c_color_names,"c_color_names","c_amber").value));
            C.set_bknown(otmp,C.u32(1));
        }
        C.uncurse(otmp);
        break;
    }
    } finally {C.stackRestore(stackFrame); }
}

/* "I am sometimes shocked by... the nuns who never take a bath without
 * wearing a bathrobe all the time.  When asked why, since no man can see them,
 * they reply 'Oh, but you forget the good God'.  Apparently they conceive of
 * the Deity as a Peeping Tom, whose omnipotence enables Him to see through
 * bathroom walls, but who is foiled by bathrobes." --Bertrand Russell, 1943
 * Divine wrath, dungeon walls, and armor follow the same principle.
 */
export function god_zaps_you(resp_god)
{
    resp_god=C.i8(resp_god);
    if(C.field(C.u,"you","uswallow").value) {
        C.variadic(21,C.literal("Suddenly a bolt of lightning comes down at you from the heavens!"));
        C.variadic(22,C.literal("It strikes %s!"),C.mon_nam(C.field(C.u,"you","ustuck").value));
        if(Number(!(C.Resists_Elem(C.field(C.u,"you","ustuck").value,C.SHOCK_RES)))) {
            C.variadic(23,C.literal("%s fries to a crisp!"),C.Monnam(C.field(C.u,"you","ustuck").value));
            /* Yup, you get experience.  It takes guts to successfully
             * pull off this trick on your god, anyway.
             * Other credit/blame applies (luck or alignment adjustments),
             * but not direct kill count (pacifist conduct).
             */
            C.xkilled(C.field(C.u,"you","ustuck").value,C.i32((1|4)));
        } else C.variadic(24,C.literal("%s seems unaffected."),C.Monnam(C.field(C.u,"you","ustuck").value));
    } else {
        C.variadic(25,C.literal("Suddenly, a bolt of lightning strikes you!"));
        if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value)))) {
            C.shieldeff(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.variadic(26,C.literal("For some reason you're unaffected."));
 else C.ureflects(C.literal("%s reflects from your %s."),C.literal("It"));
            C.monstseesu(C.u64(C.M_SEEN_REFL));
        } else if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.SHOCK_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.SHOCK_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))) {
            C.shieldeff(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            C.variadic(27,C.literal("It seems not to affect you."));
            C.monstseesu(C.u64(C.M_SEEN_ELEC));
            C.monstunseesu(C.u64(C.M_SEEN_REFL));
        } else {
            fry_by_god(resp_god,(C.i8(0)));
            C.monstunseesu(C.u64(C.i32((C.M_SEEN_REFL|C.M_SEEN_ELEC))));
        }
    }
    C.variadic(28,C.literal("%s is not deterred..."),align_gname(resp_god));
    if(C.field(C.u,"you","uswallow").value) {
        C.variadic(29,C.literal("A wide-angle disintegration beam aimed at you hits %s!"),C.mon_nam(C.field(C.u,"you","ustuck").value));
        if(Number(!(C.Resists_Elem(C.field(C.u,"you","ustuck").value,C.DISINT_RES)))) {
            C.variadic(30,C.literal("%s disintegrates into a pile of dust!"),C.Monnam(C.field(C.u,"you","ustuck").value));
            C.xkilled(C.field(C.u,"you","ustuck").value,C.i32((C.i32((1|2))|4)));
        } else C.variadic(31,C.literal("%s seems unaffected."),C.Monnam(C.field(C.u,"you","ustuck").value));
    } else {
        C.variadic(32,C.literal("A wide-angle disintegration beam hits you!"));
        /* disintegrate shield and body armor before disintegrating
         * the impudent mortal, like black dragon breath -3.
         */
        if(Number(!!(Number(!!(C.global("uarms").value&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&8n)))))))&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.DISINT_RES)*C.sizes["struct prop"]),"prop","extrinsic").value&8n)))))))) C.disintegrate_arm(C.global("uarms").value);
        if(Number(!!(Number(!!(C.global("uarmc").value&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&2n)))))))&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.DISINT_RES)*C.sizes["struct prop"]),"prop","extrinsic").value&2n)))))))) C.disintegrate_arm(C.global("uarmc").value);
        if(Number(!!(Number(!!(Number(!!(C.global("uarm").value&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&1n)))))))&&Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.DISINT_RES)*C.sizes["struct prop"]),"prop","extrinsic").value&1n)))))))&&Number(!(C.global("uarmc").value))))) C.disintegrate_arm(C.global("uarm").value);
        if(Number(!!(Number(!!(C.global("uarmu").value&&Number(!(C.global("uarm").value))))&&Number(!(C.global("uarmc").value))))) C.disintegrate_arm(C.global("uarmu").value);
        if(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DISINT_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DISINT_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))) {
            fry_by_god(resp_god,(C.i8(1)));
            C.monstunseesu(C.u64(C.M_SEEN_DISINT));
        } else {
            C.variadic(33,C.literal("bask in its %s glow for a minute..."),C.field(C.c_color_names,"c_color_names","c_black").value);
            godvoice(resp_god,C.literal("I believe it not!"));
            C.monstseesu(C.u64(C.M_SEEN_DISINT));
        }
        if(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address))))))))) {
            /* one more try for high altars */
            ;
            C.variadic(34,C.literal("Thou cannot escape my wrath, mortal!"));
            C.summon_minion(resp_god,(C.i8(0)));
            C.summon_minion(resp_god,(C.i8(0)));
            C.summon_minion(resp_god,(C.i8(0)));
            ;
            C.variadic(35,C.literal("Destroy %s, my servants!"),(C.field((C.genders+Number((C.i32(C.field(C.flags,"flag","female").value)?1:0))*C.sizes["struct Gender"]),"Gender","him").value));
        }
    }
}

export function fry_by_god(resp_god,via_disintegration)
{
    resp_god=C.i8(resp_god);
    via_disintegration=C.i8(via_disintegration);
    C.variadic(36,C.literal("%s!"),(Number(!(via_disintegration))?C.literal("fry to a crisp"):C.literal("disintegrate into a pile of dust")));
    (C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","format").value=1);
    C.variadic(37,C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address,C.literal("the wrath of %s"),align_gname(resp_god));
    C.done(C.DIED);
}

export function angrygods(resp_god)
{
    resp_god=C.i8(resp_god);
    let maxanger; let new_ublesscnt;
    if(C.In_hell(C.field(C.u,"you","uz").address)) (resp_god=C.i8((C.i32((-128)))));
    (C.field(C.u,"you","ublessed").value=0);
    /* lose divine protection */
    /* changed from tmp = u.ugangr + abs (u.uluck) -- rph */
    /* added test for alignment diff -dlc */
    if(Number(C.i32(resp_god)!=C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))) (maxanger=C.i32((C.i32(Math.trunc((C.field(C.field(C.u,"you","ualign").address,"align","record").value/2)))+((Number((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))>0)?C.i32(Math.trunc((C.i32((-(C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))))/3))):C.i32((-(C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value)))))))))));
 else (maxanger=C.i32((C.i32((3*C.field(C.u,"you","ugangr").value))+(((Number(!!(Number((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))>0)||Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>=4))))?C.i32(Math.trunc((C.i32((-(C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))))/3))):C.i32((-(C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value)))))))))));
    if(Number(maxanger<1)) (maxanger=1);
 else if(Number(maxanger>15)) (maxanger=15);
    /* possible if bad align & good luck */
    /* be reasonable */
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),725,(C.literal("angrygods"))),C.rn2(maxanger))):C.rn2(maxanger)))) {
        case (0):
            case (1):
                C.variadic(38,C.literal("that %s is %s."),align_gname(resp_god),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("bummed"):C.literal("displeased")));
        break;
        case (2):
            case (3):
                godvoice(resp_god,0);
        C.variadic(39,C.literal("\"Thou %s, %s.\""),((Number(!!((Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<0))&&Number(C.i32(resp_god)==C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)))))?C.literal("hast strayed from the path"):C.literal("art arrogant")),(Number(C.i32(C.field(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,"permonst","mlet").value)==C.S_HUMAN)?C.literal("mortal"):C.literal("creature")));
        ;
        C.variadic(40,C.literal("Thou must relearn thy lessons!"));
        C.adjattrib(C.A_WIS,C.i32((-1)),C.i32((C.i8(0))));
        C.losexp(0);
        break;
        case (6):
            if(Number(!((Number(C.global("uball").value!=0))))) {
                gods_angry(resp_god);
                C.punish(0);
                break;
            }
        ;
        /* FALLTHRU */
        case (4):
            case (5):
                gods_angry(resp_god);
        if(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.ANTIMAGIC)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.ANTIMAGIC)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))) C.variadic(41,C.literal("%s glow surrounds you."),C.An(C.hcolor(C.field(C.c_color_names,"c_color_names","c_black").value)));
        if(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),757,(C.literal("angrygods"))),C.rn2(2))):C.rn2(2)))||Number(!(C.attrcurse()))))) C.rndcurse();
        break;
        case (7):
            case (8):
                godvoice(resp_god,0);
        ;
        C.variadic(42,C.literal("Thou durst %s me?"),((Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))&&(Number(C.i32(((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7))))-2)))))))))!=C.i32(resp_god))))))?C.literal("scorn"):C.literal("call upon")));
        /* [why isn't this using verbalize()?] */
        C.variadic(43,C.literal("\"Then die, %s!\""),((Number(C.i32(C.field(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,"permonst","mlet").value)==C.S_HUMAN))?C.literal("mortal"):C.literal("creature")));
        C.summon_minion(resp_god,(C.i8(0)));
        break;
        default:
            gods_angry(resp_god);
        god_zaps_you(resp_god);
        break;
    }
    /* even though this might not be in response to prayer, set pray timer */
    (new_ublesscnt=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),780,(C.literal("angrygods"))),C.rnz(300))):C.rnz(300))));
    if(Number(new_ublesscnt>C.field(C.u,"you","ublesscnt").value)) (C.field(C.u,"you","ublesscnt").value=new_ublesscnt);
    return;
}

/* helper to print "str appears at your feet", or appropriate */
export function at_your_feet(str)
{
    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) (str=C.field(C.c_common_strings,"c_common_strings","c_Something").value);
    if(C.field(C.u,"you","uswallow").value) {
        /* barrier between you and the floor */
        C.variadic(44,C.literal("%s %s into %s %s."),str,C.vtense(str,C.literal("drop")),C.s_suffix(C.mon_nam(C.field(C.u,"you","ustuck").value)),C.mbodypart(C.field(C.u,"you","ustuck").value,C.STOMACH));
    } else {
        C.variadic(45,C.literal("%s %s %s your %s!"),str,C.vtense(str,((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("land"):C.literal("appear"))),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("beneath"):C.literal("at")),C.makeplural(C.body_part(C.FOOT)));
    }
}

export function gcrownu()
{
    const stackFrame=C.stackSave();
    try {
    let obj;
    let what;
    let already_exists; let in_hand;
    let class_gift;
    (C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
    (C.field((C.field(C.u,"you","uprops").address+Number(C.FIRE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.FIRE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
    (C.field((C.field(C.u,"you","uprops").address+Number(C.COLD_RES)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.COLD_RES)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
    (C.field((C.field(C.u,"you","uprops").address+Number(C.SHOCK_RES)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.SHOCK_RES)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
    (C.field((C.field(C.u,"you","uprops").address+Number(C.SLEEP_RES)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.SLEEP_RES)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
    (C.field((C.field(C.u,"you","uprops").address+Number(C.POISON_RES)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.POISON_RES)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
    godvoice(C.field(C.field(C.u,"you","ualign").address,"align","type").value,0);
    (class_gift=C.i16(C.STRANGE_OBJECT));
    /* 3.3.[01] had this in the A_NEUTRAL case,
       preventing chaotic wizards from receiving a spellbook */
    if(Number(!!(Number(!!(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_WIZARD)))&&Number(!(C.is_art(C.global("uwep").value,C.ART_VORPAL_BLADE)))))&&Number(!(C.is_art(C.global("uwep").value,C.ART_STORMBRINGER)))))&&Number(!(C.carrying(C.SPE_FINGER_OF_DEATH)))))) {
        (class_gift=C.i16(C.SPE_FINGER_OF_DEATH));
    } else if(Number(!!(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_MONK)))&&(Number(!!(Number(!(C.global("uwep").value))||Number(!(C.field(C.global("uwep").value,"obj","oartifact").value)))))))&&Number(!(C.carrying(C.SPE_RESTORE_ABILITY)))))) {
        /* monks rarely wield a weapon */
        (class_gift=C.i16(C.SPE_RESTORE_ABILITY));
    }
    (obj=((Number(!!((C.global("uwep").value)&&(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","oclass").value)==C.WEAPON_CLASS)||(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","oclass").value)==C.TOOL_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)!=C.P_NONE))))))))))?C.global("uwep").value:0));
    (already_exists=(in_hand=(C.i8(0))));
    /* lint suppression */
    switch(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)) {
        case (1):
            (C.field(C.field(C.u,"you","uevent").address,"u_event","uhand_of_elbereth").value=C.u32(1));
        ;
        C.variadic(46,C.literal("I crown thee...  The Hand of Elbereth!"));
        C.variadic(47,8n,C.literal("was crowned \"The Hand of Elbereth\" by %s"),u_gname());
        break;
        case (0):
            (C.field(C.field(C.u,"you","uevent").address,"u_event","uhand_of_elbereth").value=C.u32(2));
        (in_hand=C.is_art(C.global("uwep").value,C.ART_VORPAL_BLADE));
        (already_exists=C.exist_artifact(C.LONG_SWORD,C.artiname(C.ART_VORPAL_BLADE)));
        ;
        C.variadic(48,C.literal("Thou shalt be my Envoy of Balance!"));
        C.variadic(49,8n,C.literal("became %s Envoy of Balance"),C.s_suffix(u_gname()));
        break;
        case ((C.i32((-1)))):
            (C.field(C.field(C.u,"you","uevent").address,"u_event","uhand_of_elbereth").value=C.u32(3));
        (in_hand=C.is_art(C.global("uwep").value,C.ART_STORMBRINGER));
        (already_exists=C.exist_artifact(C.RUNESWORD,C.artiname(C.ART_STORMBRINGER)));
        (what=(((Number(!!((Number(!!(C.i32(already_exists)&&Number(!(in_hand)))))||Number(C.i32(class_gift)!=C.STRANGE_OBJECT))))?C.literal("take lives"):C.literal("steal souls"))));
        ;
        C.variadic(50,C.literal("Thou art chosen to %s for My Glory!"),what);
        C.variadic(51,8n,C.literal("was chosen to %s for the Glory of %s"),what,u_gname());
        break;
    }
    if(Number(C.i32(C.field((C.objects+Number(class_gift)*C.sizes["struct objclass"]),"objclass","oc_class").value)==C.SPBOOK_CLASS)) {
        let bbuf=C.stackAlloc((1*256));
        (obj=C.mksobj(C.i32(class_gift),(C.i8(1)),(C.i8(0))));
        /* get book type before dropping (don't think that could destroy
           the book because we need to be on an altar in order to become
           crowned, but be paranoid about it) */
        C.strcpy(bbuf,C.actualoname(obj));
        /* for livelog; "spellbook of <foo>"
                                         * even if hero doesn't know book */
        C.bless(obj);
        (C.field(obj,"obj","bknown").value=C.u32(1));
        /* ok to skip set_bknown() */
        C.observe_object(obj);
        at_your_feet(C.upstart(C.ansimpleoname(obj)));
        C.dropy(obj);
        ((C.field(C.u,"you","ugifts").value=C.i32((C.field(C.u,"you","ugifts").value+1)))-1);
        /* not an artifact, but treat like one for this situation;
           classify as a spoiler in case player hasn't IDed the book yet */
        C.variadic(52,C.i64((C.i64((8n|64n))|8192n)),C.literal("was bestowed with %s"),bbuf);
        /* when getting a new book for known spell, enhance
           currently wielded weapon rather than the book */
        if(Number(!!(Number(C.known_spell(class_gift)!=C.spe_Unknown)&&(Number(!!((C.global("uwep").value)&&(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","oclass").value)==C.WEAPON_CLASS)||(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","oclass").value)==C.TOOL_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)!=C.P_NONE))))))))))))) (obj=C.global("uwep").value);
        /* to be blessed,&c */
    }
    switch(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)) {
        case (1):
            if(Number(C.i32(class_gift)!=C.STRANGE_OBJECT)) {
                ;
                /* already got bonus above */
            } else if(Number(!!(Number(!!(obj&&Number(C.i32(C.field(obj,"obj","otyp").value)==C.LONG_SWORD)))&&Number(!(C.field(obj,"obj","oartifact").value))))) {
                let lbuf=C.stackAlloc((1*256));
                C.strcpy(lbuf,C.simpleonames(obj));
                /* before transformation */
                if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(53,C.literal("sword shines brightly for a moment."));
                (obj=C.oname(obj,C.artiname(C.ART_EXCALIBUR),C.u32((8|256))));
                if(C.is_art(obj,C.ART_EXCALIBUR)) {
                    ((C.field(C.u,"you","ugifts").value=C.i32((C.field(C.u,"you","ugifts").value+1)))-1);
                    C.variadic(54,C.i64((8n|64n)),C.literal("had %s wielded %s transformed into %s"),(C.field((C.genders+Number((C.i32(C.field(C.flags,"flag","female").value)?1:0))*C.sizes["struct Gender"]),"Gender","his").value),lbuf,C.artiname(C.ART_EXCALIBUR));
                }
            }
        /* acquire Excalibur's skill regardless of weapon or gift */
        C.unrestrict_weapon_skill(C.P_LONG_SWORD);
        if(C.is_art(obj,C.ART_EXCALIBUR)) C.discover_artifact(C.i16(C.ART_EXCALIBUR));
        break;
        case (0):
            if(Number(C.i32(class_gift)!=C.STRANGE_OBJECT)) {
                ;
                /* already got bonus above */
            } else if(Number(!!(obj&&C.i32(in_hand)))) {
                C.variadic(55,C.literal("%s goes snicker-snack!"),C.xname(obj));
                C.observe_object(obj);
            } else if(Number(!(already_exists))) {
                (obj=C.mksobj(C.LONG_SWORD,(C.i8(0)),(C.i8(0))));
                (obj=C.oname(obj,C.artiname(C.ART_VORPAL_BLADE),C.u32((8|256))));
                (C.field(obj,"obj","spe").value=C.i8(1));
                at_your_feet(C.literal("A sword"));
                C.dropy(obj);
                ((C.field(C.u,"you","ugifts").value=C.i32((C.field(C.u,"you","ugifts").value+1)))-1);
                C.variadic(56,C.i64((8n|64n)),C.literal("was bestowed with %s"),C.artiname(C.ART_VORPAL_BLADE));
            }
        /* acquire Vorpal Blade's skill regardless of weapon or gift */
        C.unrestrict_weapon_skill(C.P_LONG_SWORD);
        if(C.is_art(obj,C.ART_VORPAL_BLADE)) C.discover_artifact(C.i16(C.ART_VORPAL_BLADE));
        break;
        case ((C.i32((-1)))):
{
                let swordbuf=C.stackAlloc((1*256));
                C.variadic(57,swordbuf,C.literal("%s sword"),C.hcolor(C.field(C.c_color_names,"c_color_names","c_black").value));
                if(Number(C.i32(class_gift)!=C.STRANGE_OBJECT)) {
                    ;
                    /* already got bonus above */
                } else if(Number(!!(obj&&C.i32(in_hand)))) {
                    C.variadic(58,C.literal("%s hums ominously!"),swordbuf);
                    C.observe_object(obj);
                } else if(Number(!(already_exists))) {
                    (obj=C.mksobj(C.RUNESWORD,(C.i8(0)),(C.i8(0))));
                    (obj=C.oname(obj,C.artiname(C.ART_STORMBRINGER),C.u32((8|256))));
                    (C.field(obj,"obj","spe").value=C.i8(1));
                    at_your_feet(C.An(swordbuf));
                    C.dropy(obj);
                    ((C.field(C.u,"you","ugifts").value=C.i32((C.field(C.u,"you","ugifts").value+1)))-1);
                    C.variadic(59,C.i64((8n|64n)),C.literal("was bestowed with %s"),C.artiname(C.ART_STORMBRINGER));
                }
                /* acquire Stormbringer's skill regardless of weapon or gift */
                C.unrestrict_weapon_skill(C.P_BROAD_SWORD);
                if(C.is_art(obj,C.ART_STORMBRINGER)) C.discover_artifact(C.i16(C.ART_STORMBRINGER));
                break;
            }        default:
            (obj=0);
        /* lint */
        break;
    }
    /* enhance weapon regardless of alignment or artifact status */
    if((Number(!!((obj)&&(Number(!!(Number(C.i32(C.field((obj),"obj","oclass").value)==C.WEAPON_CLASS)||(Number(!!(Number(C.i32(C.field((obj),"obj","oclass").value)==C.TOOL_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)!=C.P_NONE))))))))))) {
        C.bless(obj);
        (C.field(obj,"obj","oeroded").value=(C.field(obj,"obj","oeroded2").value=C.u32(0)));
        (C.field(obj,"obj","oerodeproof").value=C.u32((C.i8(1))));
        (C.field(obj,"obj","bknown").value=(C.field(obj,"obj","rknown").value=C.u32(1)));
        /* ok to skip set_bknown() */
        if(Number(C.i32(C.field(obj,"obj","spe").value)<1)) (C.field(obj,"obj","spe").value=C.i8(1));
        /* acquire skill in this weapon */
        C.unrestrict_weapon_skill(C.weapon_type(obj));
    } else if(Number(C.i32(class_gift)==C.STRANGE_OBJECT)) {
        /* opportunity knocked, but there was nobody home... */
        C.variadic(60,C.literal("unworthy."));
    }
    C.update_inventory();
    /* lastly, confer an extra skill slot/credit beyond the
       up-to-29 you can get from gaining experience levels */
    C.add_weapon_skill(1);
    return;
    } finally {C.stackRestore(stackFrame); }
}

export function give_spell()
{
    let otmp;
    let spe_let;
    let spe_knowledge; let trycnt=C.i32((C.field(C.u,"you","ulevel").value+1));
    /* not yet known spells and forgotten spells are given preference over
       usable ones; also, try to grant spell that hero could gain skill in
       (even though being restricted doesn't prevent learning and casting) */
    (otmp=C.mkobj((C.i32((0-C.SPBOOK_CLASS))),(C.i8(1))));
    while(Number((trycnt=C.i32((trycnt-1)))>0)) {
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.SPE_BLANK_PAPER)) {
            if(Number(!!(Number(C.known_spell(C.field(otmp,"obj","otyp").value)<=C.spe_Unknown)&&Number(!((Number(C.i32(C.field((C.field(C.u,"you","weapon_skills").address+Number(C.spell_skilltype(C.i32(C.field(otmp,"obj","otyp").value)))*C.sizes["struct skills"]),"skills","skill").value)==C.P_ISRESTRICTED))))))) break;
            /* forgotten or not yet known */
        } else {
            /* blank paper is acceptable if not discovered yet or
               if hero has a magic marker to write something on it
               (doesn't matter if marker is out of charges); it will
               become discovered (below) without needing to be read */
            if(Number(!!(Number(!(C.field((C.objects+Number(C.SPE_BLANK_PAPER)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))||C.carrying(C.MAGIC_MARKER)))) break;
        }
        (C.field(otmp,"obj","otyp").value=C.i16(C.rnd_class(C.cell((C.field(C.svb,"instance_globals_saved_b","bases").address+Number(C.SPBOOK_CLASS)*4),"int").value,C.SPE_BLANK_PAPER)));
    }
    /*
     * 25% chance of learning the spell directly instead of
     * receiving the book for it, unless it's already well known.
     * The chance is not influenced by whether hero is illiterate.
     */
    if(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.SPE_BLANK_PAPER)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1030,(C.literal("give_spell"))),C.rn2(4))):C.rn2(4)))))))&&Number(((spe_knowledge=C.known_spell(C.field(otmp,"obj","otyp").value)))!=C.spe_Fresh)))) {
        /* force_learn_spell() should only return '\0' if the book
           is blank paper or the spell is known and has retention
           of spe_Fresh, so no 'else' case is needed here */
        if(Number(C.i32(((spe_let=C.force_learn_spell(C.field(otmp,"obj","otyp").value))))!=0)) {
            /* for spellbook class, OBJ_NAME() yields the name of
               the spell rather than "spellbook of <spell-name>" */
            let spe_name=(C.field((C.obj_descr+Number(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value);
            if(Number(spe_knowledge==C.spe_Unknown)) C.variadic(61,C.literal("Divine knowledge of %s fills your mind!  Spell '%c'."),spe_name,C.i32(spe_let));
 else C.variadic(62,C.literal("knowledge of spell '%c' - %s is %s."),C.i32(spe_let),spe_name,((Number(spe_knowledge==C.spe_Forgotten))?C.literal("restored"):C.literal("refreshed")));
            /* prior to learning */
            /* appending "spell 'a'" seems slightly silly but
                   is similar to "added to your repertoire, as 'a'"
                   and without any spellbook on hand a novice player
                   might not recognize that 'spe_name' is a spell */
        }
        C.obfree(otmp,0);
        /* discard the book */
    } else {
        C.observe_object(otmp);
        /* don't set bknown */
        /* discovering blank paper will make it less likely to
           be given again; small chance to arbitrarily discover
           some other book type without having to read it first */
        if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.SPE_BLANK_PAPER)||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1060,(C.literal("give_spell"))),C.rn2(100))):C.rn2(100)))))))) C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.bless(otmp);
        at_your_feet(C.upstart(C.ansimpleoname(otmp)));
        C.place_object(otmp,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    }
    return;
}

export function pleased(g_align)
{
    g_align=C.i8(g_align);
    const stackFrame=C.stackSave();
    try {
    /* don't use p_trouble, worst trouble may get fixed while praying */
    let trouble=in_trouble();
    /* what's your worst difficulty? */
    let pat_on_head=0; let kick_on_butt;
    C.variadic(63,C.literal("that %s is %s."),align_gname(g_align),((Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>=14))?((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("pleased as punch"):C.literal("well-pleased")):((Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>=4))?((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("ticklish"):C.literal("pleased")):((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("full"):C.literal("satisfied")))));
    /* not your deity */
    if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))&&Number(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)!=C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))))) {
        C.adjalign(C.i32((-1)));
        return;
    } else if(Number(!!(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<2)&&Number(trouble<=0)))) C.adjalign(1);
    /*
     * Depending on your luck & align level, the god you prayed to will:
     *  - fix your worst problem if it's major;
     *  - fix all your major problems;
     *  - fix your worst problem if it's minor;
     *  - fix all of your problems;
     *  - do you a gratuitous favor.
     *
     * If you make it to the last category, you roll randomly again
     * to see what they do for you.
     *
     * If your luck is at least 0, then you are guaranteed rescued from
     * your worst major problem.
     */
    if(Number(!!(Number(!(trouble))&&Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>=14)))) {
        /* if hero was in trouble, but got better, no special favor */
        if(Number(C.field(C.gp,"instance_globals_p","p_trouble").value==0)) (pat_on_head=1);
    } else {
        let action; let prayer_luck;
        let tryct=0;
        /* Negative luck is normally impossible here (can_pray() forces
           prayer failure in that situation), but it's possible for
           Luck to drop during the period of prayer occupation and
           become negative by the time we get here.  [Reported case
           was lawful character whose stinking cloud caused a delayed
           killing of a peaceful human, triggering the "murderer"
           penalty while successful prayer was in progress.  It could
           also happen due to inconvenient timing on Friday 13th, but
           the magnitude there (-1) isn't big enough to cause trouble.]
           We don't bother remembering start-of-prayer luck, just make
           sure it's at least -1 so that Luck+2 is big enough to avoid
           a divide by zero crash when generating a random number.  */
        (prayer_luck=((Number(((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value)))))>(C.i32((-1))))?((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))):(C.i32((-1))))));
        /* => (prayer_luck + 2 > 0) */
        (action=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1126,(C.literal("pleased"))),C.rn2(C.i32((prayer_luck+(((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))?C.i32((3+(Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0)))):2))))))):C.rn2(C.i32((prayer_luck+(((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))?C.i32((3+(Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0)))):2)))))))+(1)))));
        if(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))))) (action=((Number((action)<(3))?(action):(3))));
        if(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<4)) (action=((Number(!!(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>0)||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1130,(C.literal("pleased"))),C.rnl(2))):C.rnl(2))))))))?1:0));
        switch(((Number((action)<(5))?(action):(5)))) {
            case (5):
                (pat_on_head=1);
            ;
            /*FALLTHRU*/
            case (4):
                do fix_worst_trouble(trouble);
 while(Number(((trouble=in_trouble()))!=0));
            break;
            case (3):
                /* up to 10 troubles */
                fix_worst_trouble(trouble);
            ;
            /*FALLTHRU*/
            case (2):
                /* up to 9 troubles */
                while(Number(!!(Number(((trouble=in_trouble()))>0)&&(Number((tryct=C.i32((tryct+1)))<10))))) fix_worst_trouble(trouble);

            break;
            case (1):
                if(Number(trouble>0)) fix_worst_trouble(trouble);
            break;
            case (0):
                break;
            /* your god blows you off, too bad */
        }
    }
    /* note: can't get pat_on_head unless all troubles have just been
       fixed or there were no troubles to begin with; hallucination
       won't be in effect so special handling for it is superfluous */
    if(pat_on_head) switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1167,(C.literal("pleased"))),C.rn2(C.i32(((C.i32(((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))+6)))>>1))))):C.rn2(C.i32(((C.i32(((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))+6)))>>1)))))) {
        case (0):
            break;
        case (1):
            if(Number(!!(C.global("uwep").value&&(Number(!!(Number(!!(C.welded(C.global("uwep").value)||Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.WEAPON_CLASS)))||(Number(!!(Number(C.i32(C.field((C.global("uwep").value),"obj","oclass").value)==C.TOOL_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)!=C.P_NONE)))))))))) {
                let repair_buf=C.stackAlloc((1*256));
                (C.cell(repair_buf,"char").value=C.i8(0));
                if(Number(!!(C.i32(C.field(C.global("uwep").value,"obj","oeroded").value)||C.i32(C.field(C.global("uwep").value,"obj","oeroded2").value)))) C.variadic(64,repair_buf,C.literal(" and %s now as good as new"),C.otense(C.global("uwep").value,C.literal("are")));
                if(C.field(C.global("uwep").value,"obj","cursed").value) {
                    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) {
                        C.variadic(65,C.literal("%s %s%s."),C.Yobjnam2(C.global("uwep").value,C.literal("softly glow")),C.hcolor(C.field(C.c_color_names,"c_color_names","c_amber").value),repair_buf);
                        (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_OBJ_GLOWS);
                    } else C.variadic(66,C.literal("the power of %s over %s."),u_gname(),C.yname(C.global("uwep").value));
                    C.uncurse(C.global("uwep").value);
                    (C.field(C.global("uwep").value,"obj","bknown").value=C.u32(1));
                    /* ok to bypass set_bknown() */
                    (C.cell(repair_buf,"char").value=C.i8(0));
                } else if(Number(!(C.field(C.global("uwep").value,"obj","blessed").value))) {
                    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) {
                        C.variadic(67,C.literal("%s with %s aura%s."),C.Yobjnam2(C.global("uwep").value,C.literal("softly glow")),C.an(C.hcolor(C.field(C.c_color_names,"c_color_names","c_light_blue").value)),repair_buf);
                        (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_OBJ_GLOWS);
                    } else C.variadic(68,C.literal("the blessing of %s over %s."),u_gname(),C.yname(C.global("uwep").value));
                    C.bless(C.global("uwep").value);
                    (C.field(C.global("uwep").value,"obj","bknown").value=C.u32(1));
                    /* ok to bypass set_bknown() */
                    (C.cell(repair_buf,"char").value=C.i8(0));
                }
                /* fix any rust/burn/rot damage, but don't protect
                   against future damage */
                if(Number(!!(C.i32(C.field(C.global("uwep").value,"obj","oeroded").value)||C.i32(C.field(C.global("uwep").value,"obj","oeroded2").value)))) {
                    (C.field(C.global("uwep").value,"obj","oeroded").value=(C.field(C.global("uwep").value,"obj","oeroded2").value=C.u32(0)));
                    /* only give this message if we didn't just bless
                       or uncurse (which has already given a message) */
                    if(C.cell(repair_buf,"char").value) C.variadic(69,C.literal("%s as good as new!"),C.Yobjnam2(C.global("uwep").value,((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("feel"):C.literal("look"))));
                }
                C.update_inventory();
            }
        break;
        case (3):
            /* takes 2 hints to get the music to enter the stronghold;
               skip if you've solved it via mastermind or destroyed the
               drawbridge (both set uopened_dbridge) or if you've already
               travelled past the Valley of the Dead (gehennom_entered) */
            if(Number(!!(Number(!(C.field(C.field(C.u,"you","uevent").address,"u_event","uopened_dbridge").value))&&Number(!(C.field(C.field(C.u,"you","uevent").address,"u_event","gehennom_entered").value))))) {
                if(Number(C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value)<1)) {
                    godvoice(g_align,0);
                    ;
                    C.variadic(70,C.literal("Hark, %s!"),((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(8n))))!=C.u64(0n)))?C.literal("mortal"):C.literal("creature")));
                    ;
                    C.variadic(71,C.literal("To enter the castle, thou must play the right tune!"));
                    ((C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value=C.u32((C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value+1)))-1);
                    break;
                } else if(Number(C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value)<2)) {
                    ;
                    C.variadic(72,C.literal("a divine music..."));
                    C.variadic(73,C.literal("It sounds like:  \"%s\"."),C.field(C.svt,"instance_globals_saved_t","tune").address);
                    ((C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value=C.u32((C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value+1)))-1);
                    C.record_achievement(C.i8(C.ACH_TUNE));
                    break;
                }
            }
        ;
        /*FALLTHRU*/
        case (2):
            if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(74,C.literal("are surrounded by %s glow."),C.an(C.hcolor(C.field(C.c_color_names,"c_color_names","c_golden").value)));
        /* if any levels have been lost (and not yet regained),
               treat this effect like blessed full healing */
        if(Number(C.field(C.u,"you","ulevel").value<C.field(C.u,"you","ulevelmax").value)) {
            (C.field(C.u,"you","ulevelmax").value=C.i32(C.field(C.u,"you","ulevelmax").value-1));
            /* see potion.c */
            C.pluslvl((C.i8(0)));
        } else {
            (C.field(C.u,"you","uhpmax").value=C.i32(C.field(C.u,"you","uhpmax").value+5));
            if(Number(C.field(C.u,"you","uhpmax").value>C.field(C.u,"you","uhppeak").value)) (C.field(C.u,"you","uhppeak").value=C.field(C.u,"you","uhpmax").value);
            if((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))) (C.field(C.u,"you","mhmax").value=C.i32(C.field(C.u,"you","mhmax").value+5));
        }
        (C.field(C.u,"you","uhp").value=C.field(C.u,"you","uhpmax").value);
        if((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))) (C.field(C.u,"you","mh").value=C.field(C.u,"you","mhmax").value);
        if(Number(C.i32((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value))<C.i32((C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value)))) {
            ((C.cell((C.field(C.field(C.u,"you","acurr").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value)=(C.cell((C.field(C.field(C.u,"you","amax").address,"attribs","a").address+Number(C.A_STR)*1),"signed char").value));
            (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            /* before potential message */
            C.encumber_msg();
        }
        if(Number(C.field(C.u,"you","uhunger").value<900)) C.init_uhunger();
        /* luck couldn't have been negative at start of prayer because
               the prayer would have failed, but might have been decremented
               due to a timed event (delayed death of peaceful monster hit
               by hero-created stinking cloud) during the praying interval */
        if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) (C.field(C.u,"you","uluck").value=C.i8(0));
        /* superfluous; if hero was blinded we'd be handling trouble
               rather than issuing a pat-on-head */
        (C.field(C.u,"you","ucreamed").value=C.u32(0));
        C.make_blinded(0n,(C.i8(1)));
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        break;
        case (4):
{
                let otmp; let nextobj;
                let any=0;
                if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.variadic(75,C.literal("the power of %s."),u_gname());
 else C.variadic(76,C.literal("are surrounded by %s aura."),C.an(C.hcolor(C.field(C.c_color_names,"c_color_names","c_light_blue").value)));
                for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=nextobj)) {
                    (nextobj=C.field(otmp,"obj","nobj").value);
                    if(Number(!!(C.i32(C.field(otmp,"obj","cursed").value)&&(Number(!!(Number(otmp!=C.global("uarmh").value)||Number(C.i32(C.field(C.global("uarmh").value,"obj","otyp").value)!=C.HELM_OF_OPPOSITE_ALIGNMENT))))))) {
                        /* [see worst_cursed_item()] */
                        if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) {
                            C.variadic(77,C.literal("%s %s."),C.Yobjnam2(otmp,C.literal("softly glow")),C.hcolor(C.field(C.c_color_names,"c_color_names","c_amber").value));
                            (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_OBJ_GLOWS);
                            (C.field(otmp,"obj","bknown").value=C.u32(1));
                            /* ok to bypass set_bknown() */
                            (any=C.i32((any+1)));
                        }
                        C.uncurse(otmp);
                    }
                }
                if(any) C.update_inventory();
                break;
            }        case (5):
{
                const msg=C.staticArray("pleased","msg","\"and thus I grant thee the gift of %s!\"");
                godvoice(C.field(C.field(C.u,"you","ualign").address,"align","type").value,C.literal("Thou hast pleased me with thy progress,"));
                if(Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","intrinsic").value&(C.i64((C.i64((67108864n|33554432n))|16777216n))))))))) {
                    (C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
                    C.variadic(78,msg,C.literal("Telepathy"));
                    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.see_monsters();
                } else if(Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","intrinsic").value&(C.i64((C.i64((67108864n|33554432n))|16777216n))))))))) {
                    (C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
                    C.variadic(79,msg,C.literal("Speed"));
                } else if(Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.STEALTH)*C.sizes["struct prop"]),"prop","intrinsic").value&(C.i64((C.i64((67108864n|33554432n))|16777216n))))))))) {
                    (C.field((C.field(C.u,"you","uprops").address+Number(C.STEALTH)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.STEALTH)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
                    C.variadic(80,msg,C.literal("Stealth"));
                } else {
                    if(Number(!((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.PROTECTION)*C.sizes["struct prop"]),"prop","intrinsic").value&(C.i64((C.i64((67108864n|33554432n))|16777216n))))))))) {
                        (C.field((C.field(C.u,"you","uprops").address+Number(C.PROTECTION)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.PROTECTION)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
                        if(Number(!(C.field(C.u,"you","ublessed").value))) (C.field(C.u,"you","ublessed").value=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1331,(C.literal("pleased"))),C.rn2(3))):C.rn2(3)))+(2)))));
                    } else ((C.field(C.u,"you","ublessed").value=C.i32((C.field(C.u,"you","ublessed").value+1)))-1);
                    C.variadic(81,msg,C.literal("my protection"));
                }
                ;
                C.variadic(82,C.literal("Use it wisely in my name!"));
                break;
            }        case (7):
            case (8):
                if(Number(!!(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>=20)&&Number(!(C.field(C.field(C.u,"you","uevent").address,"u_event","uhand_of_elbereth").value))))) {
                    gcrownu();
                    break;
                }
        ;
        /*FALLTHRU*/
        case (6):
            give_spell();
        break;
        default:
            C.variadic(83,C.literal("Confused deity!"));
        break;
    }
    (C.field(C.u,"you","ublesscnt").value=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1356,(C.literal("pleased"))),C.rnz(350))):C.rnz(350))));
    (kick_on_butt=(C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","udemigod").value)?1:0));
    if(C.field(C.field(C.u,"you","uevent").address,"u_event","uhand_of_elbereth").value) ((kick_on_butt=C.i32((kick_on_butt+1)))-1);
    if(kick_on_butt) (C.field(C.u,"you","ublesscnt").value=C.i32(C.field(C.u,"you","ublesscnt").value+C.i32((kick_on_butt*((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1361,(C.literal("pleased"))),C.rnz(1000))):C.rnz(1000)))))));
    /* Avoid games that go into infinite loops of copy-pasted commands
       with no human interaction; this is a DoS vector against the
       computer running NetHack.  Once the turn counter is over 100000,
       every additional 100 turns increases the prayer timeout by 1,
       thus eventually hunger prayers will fail and some other source
       of nutrition will be required.  The increase gets throttled if
       it ever reaches 32K so that configurations using 16-bit ints are
       still viable. */
    if(Number(C.field(C.svm,"instance_globals_saved_m","moves").value>100000n)) {
        let incr=C.i64(((C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-100000n)))/100n)); let largest_ublesscnt_incr=C.i64((C.i32((32767-C.field(C.u,"you","ublesscnt").value))));
        if(Number(incr>largest_ublesscnt_incr)) (incr=largest_ublesscnt_incr);
        (C.field(C.u,"you","ublesscnt").value=C.i32(C.field(C.u,"you","ublesscnt").value+C.i32(incr)));
    }
    return;
    } finally {C.stackRestore(stackFrame); }
}

/* either blesses or curses water on the altar,
 * returns true if it found any water here.
 */
export function water_prayer(bless_water)
{
    bless_water=C.i8(bless_water);
    let otmp;
    let changed=C.i64(0);
    let other=(C.i8(0)); let bc_known=C.i8(Number(!((Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))))));
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) {
        /* turn water into (un)holy water */
        if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.POT_WATER)&&((C.i32(bless_water)?Number(!(C.field(otmp,"obj","blessed").value)):Number(!(C.field(otmp,"obj","cursed").value))))))) {
            (C.field(otmp,"obj","blessed").value=C.u32(bless_water));
            (C.field(otmp,"obj","cursed").value=C.u32(Number(!(bless_water))));
            (C.field(otmp,"obj","bknown").value=C.u32(bc_known));
            /* ok to bypass set_bknown() */
            (changed=C.i64(changed+C.field(otmp,"obj","quan").value));
        } else if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.POTION_CLASS)) (other=(C.i8(1)));
    }
    if(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&changed))) {
        C.variadic(84,C.literal("%s potion%s on the altar glow%s %s for a moment."),(((Number(!!(C.i32(other)&&Number(changed>1n))))?C.literal("Some of the"):((C.i32(other)?C.literal("One of the"):C.literal("The"))))),(((Number(!!(C.i32(other)||Number(changed>1n))))?C.literal("s"):C.literal(""))),((Number(changed>1n)?C.literal(""):C.literal("s"))),((C.i32(bless_water)?C.hcolor(C.field(C.c_color_names,"c_color_names","c_light_blue").value):C.hcolor(C.field(C.c_color_names,"c_color_names","c_black").value))));
    }
    return C.i8((Number(changed>0n)));
}

export function godvoice(g_align,words)
{
    g_align=C.i8(g_align);
    let quot=C.literal("");
    if(words) (quot=C.literal("\""));
 else (words=C.literal(""));
    C.variadic(85,C.literal("voice of %s %s: %s%s%s"),align_gname(g_align),C.godvoices[Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1425,(C.literal("godvoice"))),C.rn2(C.i32((C.u64((BigInt((8*4))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*4))/BigInt(8)))))))))],quot,words,quot);
}

export function gods_angry(g_align)
{
    g_align=C.i8(g_align);
    godvoice(g_align,C.literal("Thou hast angered me."));
}

/* The g_align god is upset with you. */
export function gods_upset(g_align)
{
    g_align=C.i8(g_align);
    if(Number(C.i32(g_align)==C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))) ((C.field(C.u,"you","ugangr").value=C.i32((C.field(C.u,"you","ugangr").value+1)))-1);
 else if(C.field(C.u,"you","ugangr").value) ((C.field(C.u,"you","ugangr").value=C.i32((C.field(C.u,"you","ugangr").value-1)))+1);
    angrygods(g_align);
}

export function consume_offering(otmp)
{
    if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1449,(C.literal("consume_offering"))),C.rn2(3))):C.rn2(3)))) {
        case (0):
            C.variadic(86,C.literal("sacrifice sprouts wings and a propeller and roars away!"));
        break;
        case (1):
            C.variadic(87,C.literal("sacrifice puffs up, swelling bigger and bigger, and pops!"));
        break;
        case (2):
            C.variadic(88,C.literal("sacrifice collapses into a cloud of dancing particles and fades away!"));
        break;
    }
 else if(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))&&Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==1)))) C.variadic(89,C.literal("sacrifice disappears!"));
 else C.variadic(90,C.literal("sacrifice is consumed in a %s!"),((Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==1))?C.literal("flash of light"):((Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==0))?C.literal("plume of smoke"):C.literal("burst of flame"))));
    if((Number(C.i32(C.field((otmp),"obj","where").value)==3))) C.useup(otmp);
 else C.useupf(otmp,1n);
    C.exercise(C.A_WIS,(C.i8(1)));
}

/* feedback when attempting to offer the Amulet on a "low altar" (not one of
   the high altars in the temples on the Astral Plane or Moloch's Sanctum) */
export function offer_too_soon(altaralign)
{
    altaralign=C.i8(altaralign);
    if(Number(!!(Number(C.i32(altaralign)==(C.i32((-128))))&&C.i32(C.In_hell(C.field(C.u,"you","uz").address))))) {
        /* offering on an unaligned altar in Gehennom;
           hero has left Moloch's Sanctum (caller handles that)
           so is in the process of getting away with the Amulet;
           for any unaligned altar outside of Gehennom, give the
           "you feel ashamed" feedback for wrong alignment below */
        gods_upset(C.i8((C.i32((-128)))));
        /* Moloch becomes angry */
        return;
    }
    C.variadic(91,C.literal("%s."),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("homesick"):((Number(C.i32(altaralign)==C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)))?C.literal("an urge to return to the surface"):C.literal("ashamed"))));
    /* if on track, give a big hint */
    /* else headed towards celestial disgrace */
}

export function desecrate_altar(highaltar,altaralign)
{
    highaltar=C.i8(highaltar);
    altaralign=C.i8(altaralign);
    const stackFrame=C.stackSave();
    try {
    let gvbuf=C.stackAlloc((1*256));
    /*
     * REAL BAD NEWS!!! High altars cannot be converted.  Even an attempt
     * gets the god who owns it truly pissed off.  The same effect for
     * deliberately destroying a normal altar.
     */
    /* if you did this to your own altar, your god will hold a grudge... */
    if(Number(C.i32(altaralign)==C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))) {
        C.adjalign(C.i32((-20)));
        (C.field(C.u,"you","ugangr").value=C.i32(C.field(C.u,"you","ugangr").value+5));
    }
    C.variadic(92,C.literal("the air around you grow charged..."));
    C.variadic(93,C.literal("Suddenly, you realize that %s has noticed you..."),align_gname(altaralign));
    C.variadic(94,gvbuf,C.literal("So, mortal!  You dare desecrate my %s!"),(C.i32(highaltar)?C.literal("High Temple"):C.literal("altar")));
    godvoice(altaralign,gvbuf);
    /* Throw everything we have at the player */
    god_zaps_you(altaralign);
    } finally {C.stackRestore(stackFrame); }
}

/* offering the Amulet on a high altar (checked by caller) ends the game;
   we don't declare this 'NORETURN' because done() can return (if called
   with some reasons other than ASCENDED and ESCAPED) */
export function offer_real_amulet(otmp,altaralign)
{
    altaralign=C.i8(altaralign);
    const cloud_of_smoke=C.staticArray("offer_real_amulet","cloud_of_smoke","A cloud of %s smoke surrounds you...");
    /* The final Test.  Did you win? */
    if(Number(C.global("uamul").value==otmp)) C.Amulet_off();
    if((Number(C.i32(C.field((otmp),"obj","where").value)==3))) C.useup(otmp);
 else C.useupf(otmp,1n);
    /* well, it's gone now */
    C.variadic(95,C.literal("offer the Amulet of Yendor to %s..."),a_gname());
    if(Number(C.i32(altaralign)==(C.i32((-128))))) {
        /* Moloch's high altar at the bottom of Gehennom. */
        if(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>C.i32((-99)))) (C.field(C.field(C.u,"you","ualign").address,"align","record").value=C.i32((-99)));
        C.variadic(96,C.literal("An invisible choir chants, and you are bathed in darkness..."));
        /*[apparently shrug/snarl can be sensed without being seen]*/
        C.variadic(97,C.literal("%s shrugs and retains dominion over %s,"),C.Moloch,u_gname());
        C.variadic(98,C.literal("then mercilessly snuffs out your life."));
        C.variadic(99,C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","name").address,C.literal("%s indifference"),C.s_suffix(C.Moloch));
        (C.field(C.field(C.svk,"instance_globals_saved_k","killer").address,"kinfo","format").value=1);
        C.done(C.DIED);
        /* life-saved (or declined to die in wizard/explore mode) */
        C.variadic(100,C.literal("%s snarls and tries again..."),C.Moloch);
        fry_by_god(C.i8((C.i32((-128)))),(C.i8(1)));
        /* wrath of Moloch */
        /* declined to die in wizard or explore mode */
        C.variadic(101,cloud_of_smoke,C.hcolor(C.field(C.c_color_names,"c_color_names","c_black").value));
        C.done(C.ESCAPED);
        /*NOTREACHED*/
    } else if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=C.i32(altaralign))) {
        /* And the opposing team picks you up and carries you off
           on their shoulders. */
        C.adjalign(C.i32((-99)));
        C.variadic(102,C.literal("%s accepts your gift, and gains dominion over %s..."),a_gname(),u_gname());
        C.variadic(103,C.literal("%s is enraged..."),u_gname());
        C.variadic(104,C.literal("Fortunately, %s permits you to live..."),a_gname());
        C.variadic(105,cloud_of_smoke,C.hcolor(C.field(C.c_color_names,"c_color_names","c_orange").value));
        C.done(C.ESCAPED);
        /*NOTREACHED*/
    } else {
        /* You've won the game!  Feedback-wise, it's a bit of a let down. */
        (C.field(C.field(C.u,"you","uevent").address,"u_event","ascended").value=C.u32(1));
        C.adjalign(10);
        C.variadic(106,C.literal("An invisible choir sings, and you are bathed in radiance..."));
        godvoice(altaralign,C.literal("Mortal, thou hast done well!"));
        C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MESSAGE").value,(C.i8(0)));
        ;
        C.variadic(107,C.literal("In return for thy service, I grant thee the gift of Immortality!"));
        C.variadic(108,C.literal("ascend to the status of Demigod%s..."),(C.i32(C.field(C.flags,"flag","female").value)?C.literal("dess"):C.literal("")));
        C.done(C.ASCENDED);
        /*NOTREACHED*/
    }
    /*NOTREACHED*/
}

export function offer_negative_valued(highaltar,altaralign)
{
    highaltar=C.i8(highaltar);
    altaralign=C.i8(altaralign);
    if(Number(!!(Number(C.i32(altaralign)!=C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))&&C.i32(highaltar)))) {
        desecrate_altar(highaltar,altaralign);
    } else {
        gods_upset(altaralign);
    }
}

export function offer_fake_amulet(otmp,highaltar,altaralign)
{
    highaltar=C.i8(highaltar);
    altaralign=C.i8(altaralign);
    if(Number(!!(Number(!(highaltar))&&Number(!(C.field(otmp,"obj","known").value))))) {
        offer_too_soon(altaralign);
        return;
    }
    ;
    C.variadic(109,C.literal("a nearby thunderclap."));
    if(Number(!(C.field(otmp,"obj","known").value))) {
        C.variadic(110,C.literal("realize you have made a %s."),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("boo-boo"):C.literal("mistake")));
        (C.field(otmp,"obj","known").value=C.u32((C.i8(1))));
        C.change_luck(C.i8(C.i32((-1))));
    } else {
        /* don't you dare try to fool the gods */
        if((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))) C.variadic(111,C.literal("Oh, no."));
        /* didn't hear thunderclap */
        C.change_luck(C.i8(C.i32((-3))));
        C.adjalign(C.i32((-1)));
        (C.field(C.u,"you","ugangr").value=C.i32(C.field(C.u,"you","ugangr").value+3));
        offer_negative_valued(highaltar,altaralign);
    }
}

/* possibly convert an altar's alignment or the hero's alignment */
export function offer_different_alignment_altar(otmp,altaralign)
{
    altaralign=C.i8(altaralign);
    /* Is this a conversion ? */
    /* An unaligned altar in Gehennom will always elicit rejection. */
    if(Number(!!((Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<0))||(Number(!!(Number(C.i32(altaralign)==(C.i32((-128))))&&C.i32(C.In_hell(C.field(C.u,"you","uz").address)))))))) {
        if(Number(!!(Number(C.i32(C.cell((C.field(C.u,"you","ualignbase").address+Number(0)*1),"signed char").value)==C.i32(C.cell((C.field(C.u,"you","ualignbase").address+Number(1)*1),"signed char").value))&&Number(C.i32(altaralign)!=(C.i32((-128))))))) {
            C.variadic(112,C.literal("have a strong feeling that %s is angry..."),u_gname());
            consume_offering(otmp);
            C.variadic(113,C.literal("%s accepts your allegiance."),a_gname());
            C.uchangealign(C.i32(altaralign),C.A_CG_CONVERT);
            /* Beware, Conversion is costly */
            C.change_luck(C.i8(C.i32((-3))));
            (C.field(C.u,"you","ublesscnt").value=C.i32(C.field(C.u,"you","ublesscnt").value+300));
        } else {
            (C.field(C.u,"you","ugangr").value=C.i32(C.field(C.u,"you","ugangr").value+3));
            C.adjalign(C.i32((-5)));
            C.variadic(114,C.literal("%s rejects your sacrifice!"),a_gname());
            godvoice(altaralign,C.literal("Suffer, infidel!"));
            C.change_luck(C.i8(C.i32((-5))));
            C.adjattrib(C.A_WIS,C.i32((-2)),C.i32((C.i8(1))));
            if(Number(!(C.In_hell(C.field(C.u,"you","uz").address)))) angrygods(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
        }
    } else {
        consume_offering(otmp);
        C.variadic(115,C.literal("sense a conflict between %s and %s."),u_gname(),a_gname());
        if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1661,(C.literal("offer_different_alignment_altar"))),C.rn2(C.i32((8+C.field(C.u,"you","ulevel").value))))):C.rn2(C.i32((8+C.field(C.u,"you","ulevel").value)))))>5)) {
            let pri;
            let shrine;
            C.variadic(116,C.literal("the power of %s increase."),u_gname());
            C.exercise(C.A_WIS,(C.i8(1)));
            C.change_luck(C.i8(1));
            (shrine=C.i8((Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&8)))!=0))));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value=(C.u32((((Number(C.i32((C.field(C.field(C.u,"you","ualign").address,"align","type").value))==(C.i32((-128)))))?0:((Number(C.i32((C.field(C.field(C.u,"you","ualign").address,"align","type").value))==1))?4:(C.i32((C.i32((C.field(C.field(C.u,"you","ualign").address,"align","type").value))+2)))))))));
            if(shrine) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value|8));
            C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            /* in case Invisible to self */
            if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(117,C.literal("altar glows %s."),C.hcolor(((Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==1))?C.field(C.c_color_names,"c_color_names","c_white").value:(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)?C.field(C.c_color_names,"c_color_names","c_black").value:C.literal("gray")))));
            if(Number(!!(Number(!!(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1679,(C.literal("offer_different_alignment_altar"))),C.rnl(C.field(C.u,"you","ulevel").value))):C.rnl(C.field(C.u,"you","ulevel").value)))>6)&&Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>0)))&&Number(C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1680,(C.literal("offer_different_alignment_altar"))),C.rnd(C.field(C.field(C.u,"you","ualign").address,"align","record").value))):C.rnd(C.field(C.field(C.u,"you","ualign").address,"align","record").value))))>C.i64(((C.i64((C.i64(3)*(C.i64((10n+(C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value/200n)))))))))/C.i64(4))))))) C.summon_minion(altaralign,(C.i8(1)));
            /* anger priest; test handles bones files */
            if(Number(!!(((pri=C.findpriest(C.temple_occupied(C.field(C.u,"you","urooms").address))))&&Number(!(C.p_coaligned(pri)))))) C.angry_priest();
        } else {
            C.variadic(118,C.literal("Unluckily, you feel the power of %s decrease."),u_gname());
            C.change_luck(C.i8(C.i32((-1))));
            C.exercise(C.A_WIS,(C.i8(0)));
            if(Number(!!(Number(!!(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1690,(C.literal("offer_different_alignment_altar"))),C.rnl(C.field(C.u,"you","ulevel").value))):C.rnl(C.field(C.u,"you","ulevel").value)))>6)&&Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>0)))&&Number(C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1691,(C.literal("offer_different_alignment_altar"))),C.rnd(C.field(C.field(C.u,"you","ualign").address,"align","record").value))):C.rnd(C.field(C.field(C.u,"you","ualign").address,"align","record").value))))>C.i64(((C.i64((C.i64(7)*(C.i64((10n+(C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value/200n)))))))))/C.i64(8))))))) C.summon_minion(altaralign,(C.i8(1)));
        }
    }
}

export function sacrifice_your_race(otmp,highaltar,altaralign)
{
    highaltar=C.i8(highaltar);
    altaralign=C.i8(altaralign);
    const stackFrame=C.stackSave();
    try {
    let pm;
    if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(256n))))!=C.u64(0n)))) {
        C.variadic(119,C.literal("find the idea very satisfying."));
        C.exercise(C.A_WIS,(C.i8(1)));
    } else if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=(C.i32((-1))))) {
        C.variadic(120,C.literal("You'll regret this infamous offense!"));
        C.exercise(C.A_WIS,(C.i8(0)));
    }
    if(Number(!!(C.i32(highaltar)&&(Number(!!(Number(C.i32(altaralign)!=(C.i32((-1))))||Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=(C.i32((-1)))))))))) {
        desecrate_altar(highaltar,altaralign);
        return;
    } else if(Number(!!(Number(C.i32(altaralign)!=(C.i32((-1))))&&Number(C.i32(altaralign)!=(C.i32((-128))))))) {
        /* curse the lawful/neutral altar */
        C.variadic(121,C.literal("altar is stained with %s blood."),C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","adj").value);
        (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(1));
        C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        /* in case Invisible to self */
        C.angry_priest();
    } else {
        let dmon;
        let demonless_msg;
        /* Human sacrifice on a chaotic or unaligned altar */
        /* is equivalent to demon summoning */
        if(Number(!!(Number(C.i32(altaralign)==(C.i32((-1))))&&Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=(C.i32((-1))))))) {
            C.variadic(122,C.literal("The blood floods the altar, which vanishes in %s cloud!"),C.an(C.hcolor(C.field(C.c_color_names,"c_color_names","c_black").value)));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value=C.i8(C.ROOM));
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value=C.u32(0));
            C.newsym(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            C.angry_priest();
            (demonless_msg=C.literal("cloud dissipates"));
        } else {
            /* either you're chaotic or altar is Moloch's or both */
            C.variadic(123,C.literal("blood covers the altar!"));
            C.change_luck(C.i8((Number(C.i32(altaralign)==(C.i32((-128))))?C.i32((-2)):2)));
            (demonless_msg=C.literal("blood coagulates"));
        }
        if(Number(!!(Number(((pm=C.dlord(altaralign)))!=C.NON_PM)&&Number(((dmon=C.makemon((C.mons+Number(pm)*C.sizes["struct permonst"]),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.u32(131072n))))!=0)))) {
            let dbuf=C.stackAlloc((1*256));
            C.strcpy(dbuf,C.a_monnam(dmon));
            if(Number(!(C.strncmpi((dbuf),(C.literal("it")),C.i32((-1)))))) C.strcpy(dbuf,C.literal("something dreadful"));
 else (C.field(dmon,"monst","mstrategy").value=C.u64(C.field(dmon,"monst","mstrategy").value&C.u64((~2147483648n))));
            C.variadic(124,C.literal("have summoned %s!"),dbuf);
            if(Number(C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))==C.sgn(C.i32(C.field(C.field(dmon,"monst","data").value,"permonst","maligntyp").value)))) (C.field(dmon,"monst","mpeaceful").value=C.u32((C.i8(1))));
            C.variadic(125,C.literal("are terrified, and unable to move."));
            C.nomul(C.i32((-3)));
            (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("being terrified of a demon"));
            (C.field(C.gn,"instance_globals_n","nomovemsg").value=0);
        } else C.variadic(126,C.literal("%s."),demonless_msg);
    }
    if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=(C.i32((-1))))) {
        C.adjalign(C.i32((-5)));
        (C.field(C.u,"you","ugangr").value=C.i32(C.field(C.u,"you","ugangr").value+3));
        C.adjattrib(C.A_WIS,C.i32((-1)),C.i32((C.i8(1))));
        if(Number(!(C.In_hell(C.field(C.u,"you","uz").address)))) angrygods(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
        C.change_luck(C.i8(C.i32((-5))));
    } else C.adjalign(5);
    if((Number(C.i32(C.field((otmp),"obj","where").value)==3))) C.useup(otmp);
 else C.useupf(otmp,1n);
    } finally {C.stackRestore(stackFrame); }
}

export function bestow_artifact(max_giftvalue)
{
    max_giftvalue=C.u8(max_giftvalue);
    const stackFrame=C.stackSave();
    try {
    let nartifacts=C.nartifact_exist();
    let do_bestow=C.i8(Number(!!(Number(C.field(C.u,"you","ulevel").value>2)&&Number(C.i32(C.field(C.u,"you","uluck").value)>=0))));
    if(do_bestow) {
        /* you were already in pretty good standing */
        /* The player can gain an artifact */
        /* The chance goes down as the number of artifacts goes up */
        if(C.field(C.flags,"flag","debug").value) (do_bestow=C.i8(Number(C.i32(C.yn_function(C.literal("Gift an artifact?"),C.ynchars,C.i8(110),(C.i8(1))))==121)));
 else (do_bestow=C.i8(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1792,(C.literal("bestow_artifact"))),C.rn2(C.i32((6+(C.i32((C.i32((2*C.field(C.u,"you","ugifts").value))*nartifacts)))))))):C.rn2(C.i32((6+(C.i32((C.i32((2*C.field(C.u,"you","ugifts").value))*nartifacts))))))))))));
    }
    if(do_bestow) {
        let otmp;
        /* mk_artifact() with NULL obj and a_align() arg can return NULL */
        (otmp=C.mk_artifact(0,((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7))))-2)))))))),max_giftvalue,(C.i8(1))));
        if(otmp) {
            let buf=C.stackAlloc((1*256));
            C.artifact_origin(otmp,C.u32((8|256)));
            if(Number(C.i32(C.field(otmp,"obj","spe").value)<0)) (C.field(otmp,"obj","spe").value=C.i8(0));
            if(C.field(otmp,"obj","cursed").value) C.uncurse(otmp);
            (C.field(otmp,"obj","oerodeproof").value=C.u32((C.i8(1))));
            C.strcpy(buf,(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("a doodad"):((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("an object"):C.ansimpleoname(otmp)))));
            if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(127,C.eos(buf),C.literal(" named %s"),C.bare_artifactname(otmp));
            at_your_feet(C.upstart(buf));
            C.dropy(otmp);
            godvoice(C.field(C.field(C.u,"you","ualign").address,"align","type").value,C.literal("Use my gift wisely!"));
            ((C.field(C.u,"you","ugifts").value=C.i32((C.field(C.u,"you","ugifts").value+1)))-1);
            (C.field(C.u,"you","ublesscnt").value=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),1819,(C.literal("bestow_artifact"))),C.rnz(C.i32((300+(C.i32((50*nartifacts)))))))):C.rnz(C.i32((300+(C.i32((50*nartifacts)))))))));
            C.exercise(C.A_WIS,(C.i8(1)));
            C.variadic(128,C.i64((8n|64n)),C.literal("was bestowed with %s by %s"),C.artiname(C.i32(C.field(otmp,"obj","oartifact").value)),align_gname(C.field(C.field(C.u,"you","ualign").address,"align","type").value));
            /* make sure we can use this weapon */
            C.unrestrict_weapon_skill(C.weapon_type(otmp));
            if(Number(!!(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))&&Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))) {
                C.observe_object(otmp);
                C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
                C.discover_artifact(C.i16(C.field(otmp,"obj","oartifact").value));
            }
            return C.i32((C.i8(1)));
        }
    }
    return C.i32((C.i8(0)));
    } finally {C.stackRestore(stackFrame); }
}

export function sacrifice_value(otmp)
{
    let value=0;
    if(Number(!!(Number(C.field(otmp,"obj","corpsenm").value==C.PM_ACID_BLOB)||(Number(C.field(C.svm,"instance_globals_saved_m","moves").value<=C.i64((C.peek_at_iced_corpse_age(otmp)+C.i64(50)))))))) {
        (value=C.i32((C.i32(C.field((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]),"permonst","difficulty").value)+1)));
        if(C.field(otmp,"obj","oeaten").value) (value=C.eaten_stat(value,otmp));
    }
    return value;
}

/* the #offer command - sacrifice something to the gods */
export function dosacrifice()
{
    let otmp;
    let highaltar;
    let altaralign=((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7))))-2))))))));
    if(Number(!!(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))))||C.i32(C.field(C.u,"you","uswallow").value)))) {
        C.variadic(129,C.literal("are not %s an altar."),((Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))||(Number(!!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","extrinsic").value))||(Number(!!(C.field(C.u,"you","usteed").value&&(Number((C.u64((C.field((C.field(C.field(C.u,"you","usteed").value,"monst","data").value),"permonst","mflags1").value&C.u64(1n))))!=C.u64(0n)))))))))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","blocked").value))))))))?C.literal("over"):C.literal("on")));
        return 0;
    } else if(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STUNNED)*C.sizes["struct prop"]),"prop","intrinsic").value))) {
        C.variadic(130,C.literal("are too impaired to perform the rite."));
        return 0;
    }
    (highaltar=C.i8((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&16)))));
    (otmp=C.floorfood(C.literal("sacrifice"),1));
    if(Number(!(otmp))) return 0;
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AMULET_OF_YENDOR)) {
        if(Number(!(highaltar))) {
            offer_too_soon(altaralign);
            return 1;
        } else {
            offer_real_amulet(otmp,altaralign);
            /*NOTREACHED*/
        }
    }
    /* real Amulet */
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FAKE_AMULET_OF_YENDOR)) {
        offer_fake_amulet(otmp,highaltar,altaralign);
        return 1;
    }
    /* fake Amulet */
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)) {
        offer_corpse(otmp,highaltar,altaralign);
        return 1;
    }
    C.variadic(131,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_nothing_happens").value);
    return 1;
}

export function eval_offering(otmp,altaralign)
{
    altaralign=C.i8(altaralign);
    let ptr;
    let value;
    (value=sacrifice_value(otmp));
    if(Number(!(value))) return 0;
    (ptr=(C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]));
    if((Number((C.u64((C.field((ptr),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))) {
        /* Not demons--no demon corpses */
        /* most undead that leave a corpse yield 'human' (or other race)
           corpse so won't get here; the exception is wraith; give the
           bonus for wraith to chaotics too because they are sacrificing
           something valuable (unless hero refuses to eat such things) */
        if(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=(C.i32((-1))))||(Number(!!(Number(ptr==(C.mons+Number(C.PM_WRAITH)*C.sizes["struct permonst"]))&&C.field(C.field(C.u,"you","uconduct").address,"u_conduct","unvegetarian").value)))))) (value=C.i32(value+1));
        /* reaching this side of the 'or' means hero is chaotic */
    } else if((Number(!!(Number(C.i32(C.field((ptr),"permonst","mlet").value)==C.S_UNICORN)&&(Number((C.u64((C.field((ptr),"permonst","mflags2").value&C.u64(536870912n))))!=C.u64(0n))))))) {
        let unicalign=C.sgn(C.i32(C.field(ptr,"permonst","maligntyp").value));
        if(Number(unicalign==C.i32(altaralign))) {
            /* When same as altar, always a very bad action.
             */
            C.variadic(132,C.literal("Such an action is an insult to %s!"),((Number(unicalign==(C.i32((-1)))))?C.literal("chaos"):(unicalign?C.literal("law"):C.literal("balance"))));
            C.adjattrib(C.A_WIS,C.i32((-1)),C.i32((C.i8(1))));
            return C.i32((-1));
        } else if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==C.i32(altaralign))) {
            /* When different from altar, and altar is same as yours,
             * it's a very good action.
             */
            if(Number(C.i64(C.field(C.field(C.u,"you","ualign").address,"align","record").value)<(C.i64((10n+(C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value/200n)))))))) C.variadic(133,C.literal("appropriately %s."),C.align_str(C.field(C.field(C.u,"you","ualign").address,"align","type").value));
 else C.variadic(134,C.literal("you are thoroughly on the right path."));
            C.adjalign(5);
            (value=C.i32(value+3));
        } else if(Number(unicalign==C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))) {
            /* When sacrificing unicorn of your alignment to altar not of
             * your alignment, your god gets angry and it's a conversion.
             */
            (C.field(C.field(C.u,"you","ualign").address,"align","record").value=C.i32((-1)));
            (value=1);
        } else {
            /* Otherwise, unicorn's alignment is different from yours
             * and different from the altar's.  It's an ordinary (well,
             * with a bonus) sacrifice on a cross-aligned altar.
             */
            (value=C.i32(value+3));
        }
    }
    return value;
}

export function offer_corpse(otmp,highaltar,altaralign)
{
    highaltar=C.i8(highaltar);
    altaralign=C.i8(altaralign);
    let value;
    let ptr;
    let mtmp;
    /*
     * Was based on nutritional value and aging behavior (< 50 moves).
     * Sacrificing a food ration got you max luck instantly, making the
     * gods as easy to please as an angry dog!
     *
     * Now only accepts corpses, based on the game's evaluation of their
     * toughness.  Human and pet sacrifice, as well as sacrificing unicorns
     * of your alignment, is strongly discouraged.
     */
    /* Highest corpse value (besides Wiz) */
    /* KMH, conduct */
    if(Number(!(((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value=C.i64((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value+1n)))-1n)))) C.variadic(135,32n,C.literal("rejected atheism by offering %s on an altar of %s"),C.corpse_xname(otmp,0,C.u32(8)),a_gname());
    /* you're handling this corpse, even if it was killed upon the altar
     */
    C.feel_cockatrice(otmp,(C.i8(1)));
    if(C.rider_corpse_revival(otmp,(C.i8(0)))) return;
    (ptr=(C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]));
    /* same race or former pet results apply even if the corpse is
       too old (value==0) */
    if((Number((C.u64((C.field((ptr),"permonst","mflags2").value&C.u64(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","selfmask").value))))!=C.u64(0n)))) {
        sacrifice_your_race(otmp,highaltar,altaralign);
        return;
    }
    if(Number(!!(Number(!!((Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value))))&&Number(((mtmp=C.get_mtraits(otmp,(C.i8(0)))))!=0)))&&C.i32(C.field(mtmp,"monst","mtame").value)))) {
        /* mtmp is a temporary pointer to a tame monster's attributes,
             * not a real monster */
        C.variadic(136,C.literal("So this is how you repay loyalty?"));
        C.adjalign(C.i32((-3)));
        (C.field((C.field(C.u,"you","uprops").address+Number(C.AGGRAVATE_MONSTER)*C.sizes["struct prop"]),"prop","intrinsic").value=C.i64(C.field((C.field(C.u,"you","uprops").address+Number(C.AGGRAVATE_MONSTER)*C.sizes["struct prop"]),"prop","intrinsic").value|67108864n));
        offer_negative_valued(highaltar,altaralign);
        return;
    }
    (value=eval_offering(otmp,altaralign));
    if(Number(value==0)) {
        /* too old; don't give undead or unicorn bonus or penalty */
        C.variadic(137,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_nothing_happens").value);
        return;
    }
    if(Number(value<0)) {
        offer_negative_valued(highaltar,altaralign);
        return;
    }
    if(Number(!!(Number(C.i32(altaralign)!=C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))&&C.i32(highaltar)))) {
        desecrate_altar(highaltar,altaralign);
        return;
    }
    if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=C.i32(altaralign))) {
        /* Sacrificing at an altar of a different alignment */
        offer_different_alignment_altar(otmp,altaralign);
        return;
    }
    consume_offering(otmp);
    /* OK, you get brownie points. */
    if(C.field(C.u,"you","ugangr").value) {
        let saved_anger=C.field(C.u,"you","ugangr").value;
        (C.field(C.u,"you","ugangr").value=C.i32(C.field(C.u,"you","ugangr").value-(C.i32(Math.trunc(((C.i32((value*((Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==(C.i32((-1))))?2:3)))))/24))))));
        if(Number(C.field(C.u,"you","ugangr").value<0)) (C.field(C.u,"you","ugangr").value=0);
        if(Number(C.field(C.u,"you","ugangr").value!=saved_anger)) {
            if(C.field(C.u,"you","ugangr").value) {
                C.variadic(138,C.literal("%s seems %s."),u_gname(),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("groovy"):C.literal("slightly mollified")));
                if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) C.change_luck(C.i8(1));
            } else {
                C.variadic(139,C.literal("%s seems %s."),u_gname(),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("cosmic (not a new fact)"):C.literal("mollified")));
                if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) (C.field(C.u,"you","uluck").value=C.i8(0));
            }
        } else {
            /* not satisfied yet */
            if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) C.variadic(140,C.literal("gods seem tall."));
 else C.variadic(141,C.literal("have a feeling of inadequacy."));
        }
    } else if((Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<0))) {
        if(Number(value>24)) (value=24);
        if(Number(value>C.i32((-C.field(C.field(C.u,"you","ualign").address,"align","record").value)))) (value=C.i32((-C.field(C.field(C.u,"you","ualign").address,"align","record").value)));
        C.adjalign(value);
        C.variadic(142,C.literal("partially absolved."));
    } else if(Number(C.field(C.u,"you","ublesscnt").value>0)) {
        let saved_cnt=C.field(C.u,"you","ublesscnt").value;
        (C.field(C.u,"you","ublesscnt").value=C.i32(C.field(C.u,"you","ublesscnt").value-(C.i32(Math.trunc(((C.i32((value*((Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==(C.i32((-1))))?500:300)))))/24))))));
        if(Number(C.field(C.u,"you","ublesscnt").value<0)) (C.field(C.u,"you","ublesscnt").value=0);
        if(Number(C.field(C.u,"you","ublesscnt").value!=saved_cnt)) {
            if(C.field(C.u,"you","ublesscnt").value) {
                if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) C.variadic(143,C.literal("realize that the gods are not like you and I."));
 else C.variadic(144,C.literal("have a hopeful feeling."));
                if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) C.change_luck(C.i8(1));
            } else {
                if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) C.variadic(145,C.literal("Overall, there is a smell of fried onions."));
 else C.variadic(146,C.literal("have a feeling of reconciliation."));
                if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) (C.field(C.u,"you","uluck").value=C.i8(0));
            }
        }
    } else {
        let orig_luck; let luck_increase;
        if(bestow_artifact(C.u8(value))) return;
        (orig_luck=C.i32(C.field(C.u,"you","uluck").value));
        (luck_increase=C.i32(Math.trunc(((C.i32((value*10)))/(C.i32((24*2)))))));
        /* sacrificing can't increase non-bonus Luck to above the value of the
           sacrifice; this prevents players immediately maxing their Luck as
           soon as they find an altar and a few rations via sacrificing lots
           of low-valued corpses, which can unbalance the early game */
        if(Number(orig_luck>value)) (luck_increase=0);
 else if(Number(C.i32((orig_luck+luck_increase))>value)) (luck_increase=C.i32((value-orig_luck)));
        C.change_luck(C.i8(luck_increase));
        if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) (C.field(C.u,"you","uluck").value=C.i8(0));
        if(Number(C.i32(C.field(C.u,"you","uluck").value)!=orig_luck)) {
            if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.variadic(147,C.literal("think %s brushed your %s."),C.field(C.c_common_strings,"c_common_strings","c_something").value,C.body_part(C.FOOT));
 else C.variadic(148,((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("see crabgrass at your %s.  A funny thing in a dungeon."):C.literal("glimpse a four-leaf clover at your %s.")),C.makeplural(C.body_part(C.FOOT)));
        }
    }
}

/* determine prayer results in advance; also used for enlightenment */
export function can_pray(praying)
{
    praying=C.i8(praying);
    /* false means no messages should be given */
    let alignment;
    (C.field(C.gp,"instance_globals_p","p_aligntyp").value=C.i8(((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))?C.i32(((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7))))-2))))))))):C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))));
    (C.field(C.gp,"instance_globals_p","p_trouble").value=in_trouble());
    if(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(256n))))!=C.u64(0n)))&&(Number(!!(Number(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)==1)||Number(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)!=0))))))) {
        /* ok if chaotic or none (Moloch) */
        if(praying) C.variadic(149,C.literal("very idea of praying to a %s god is repugnant to you."),(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)?C.literal("lawful"):C.literal("neutral")));
        return (C.i8(0));
    }
    if(praying) C.variadic(150,C.literal("begin praying to %s."),align_gname(C.field(C.gp,"instance_globals_p","p_aligntyp").value));
    if(Number(!!(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)&&Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==C.i32((-C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value))))))) (alignment=C.i32((-C.field(C.field(C.u,"you","ualign").address,"align","record").value)));
 else if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value))) (alignment=C.i32(Math.trunc((C.field(C.field(C.u,"you","ualign").address,"align","record").value/2))));
 else (alignment=C.field(C.field(C.u,"you","ualign").address,"align","record").value);
    /* Opposite alignment altar */
    /* Different alignment altar */
    if(Number(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)==(C.i32((-128))))) (C.field(C.gp,"instance_globals_p","p_type").value=C.i32((-2)));
 else if(((Number(C.field(C.gp,"instance_globals_p","p_trouble").value>0))?(Number(C.field(C.u,"you","ublesscnt").value>200)):((Number(C.field(C.gp,"instance_globals_p","p_trouble").value<0))?(Number(C.field(C.u,"you","ublesscnt").value>100)):(Number(C.field(C.u,"you","ublesscnt").value>0))))) (C.field(C.gp,"instance_globals_p","p_type").value=0);
 else if(Number(!!(Number(!!(Number((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))<0)||C.field(C.u,"you","ugangr").value))||Number(alignment<0)))) (C.field(C.gp,"instance_globals_p","p_type").value=1);
 else {
        /* praying to Moloch */
        /* big trouble */
        /* minor difficulty */
        /* not in trouble */
        /* too soon... */
        /* too naughty... */
        /* alignment >= 0 */
        if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))&&Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value))))) (C.field(C.gp,"instance_globals_p","p_type").value=2);
 else (C.field(C.gp,"instance_globals_p","p_type").value=3);
    }
    if(Number(!!(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))&&Number(!(C.In_hell(C.field(C.u,"you","uz").address)))))&&(Number(!!(Number(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)==1)||(Number(!!(Number(C.i32(C.field(C.gp,"instance_globals_p","p_aligntyp").value)==0)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2166,(C.literal("can_pray"))),C.rn2(10))):C.rn2(10)))))))))))))) (C.field(C.gp,"instance_globals_p","p_type").value=C.i32((-1)));
    /* Note:  when !praying, the random factor for neutrals makes the
       return value a non-deterministic approximation for enlightenment.
       This case should be uncommon enough to live with... */
    return C.i8((Number(!(praying))?C.i32(C.i8((Number(!!(Number(C.field(C.gp,"instance_globals_p","p_type").value==3)&&Number(!(C.In_hell(C.field(C.u,"you","uz").address)))))))):C.i32((C.i8(1)))));
}

/* return TRUE if praying revived a pet corpse */
export function pray_revive()
{
    let otmp;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(!!(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.STATUE))))&&(Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value))))))&&C.i32(C.field((C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value),"monst","mtame").value)))&&Number(!(C.field((C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value),"monst","isminion").value))))) break;

    if(Number(!(otmp))) return (C.i8(0));
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)) return C.i8((Number(C.revive(otmp,(C.i8(1)))!=(0))));
 else {
        return C.i8((Number(C.animate_statue(otmp,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,2,0)!=(0))));
    }
}

/* #pray command */
export function dopray()
{
    let ok;
    /*
     * If ParanoidPray is set, confirm prayer to avoid accidental slips
     * of Alt+p.  If ParanoidConfirm is also set, require "yes" rather
     * than just "y" (will also require "no" to decline).
     */
    if((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(32))))!=C.u32(0)))) {
        (ok=C.paranoid_query(C.i8((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(1))))!=C.u32(0)))),C.literal("Are you sure you want to pray?")));
        /* clear command recall buffer; otherwise ^A to repeat p(ray) would
           do so without confirmation (if 'ok') or do nothing (if '!ok') */
        if(Number(!(ok))) return 0;
        /* declined the "are you sure?" confirmation */
    }
    if(Number(!(((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value=C.i64((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value+1n)))-1n)))) C.variadic(151,32n,C.literal("rejected atheism with a prayer"));
    /* breaking conduct should probably occur in can_pray() at
         * "You begin praying to %s", as demons who find praying repugnant
         * should not break conduct.  Also we can add more detail to the
         * livelog message as p_aligntyp will be known.
         */
    /* set up p_type and p_alignment */
    if(Number(!(can_pray((C.i8(1)))))) return 0;
    if(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&Number(C.field(C.gp,"instance_globals_p","p_type").value>=0)))) {
        const forcesuccess=C.staticArray("dopray","forcesuccess","Force the gods to be pleased?");
        /* if we asked "are you sure?" above we suppressed the response
           from the do-again buffer, so need to suppress this response too;
           otherwise subsequent ^A would use this answer for "are you sure?"
           and bypass confirmation */
        if((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(32))))!=C.u32(0)))) {
            let save_doagain=C.i8(C.field(C.gi,"instance_globals_i","in_doagain").value);
            (C.field(C.gi,"instance_globals_i","in_doagain").value=C.i32((C.i8(0))));
            (ok=C.i8((Number(C.i32(C.yn_function(forcesuccess,C.ynchars,C.i8(110),(C.i8(0))))==121))));
            (C.field(C.gi,"instance_globals_i","in_doagain").value=C.i32(save_doagain));
        } else {
            (ok=C.i8((Number(C.i32(C.yn_function(forcesuccess,C.ynchars,C.i8(110),(C.i8(1))))==121))));
        }
        if(ok) {
            (C.field(C.u,"you","ublesscnt").value=0);
            if(Number(C.i32(C.field(C.u,"you","uluck").value)<0)) (C.field(C.u,"you","uluck").value=C.i8(0));
            if(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<=0)) (C.field(C.field(C.u,"you","ualign").address,"align","record").value=1);
            (C.field(C.u,"you","ugangr").value=0);
            if(Number(C.field(C.gp,"instance_globals_p","p_type").value<2)) (C.field(C.gp,"instance_globals_p","p_type").value=3);
        }
    }
    C.nomul(C.i32((-3)));
    (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("praying"));
    (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal("You finish your prayer."));
    (C.field(C.ga,"instance_globals_a","afternmv").value=C.functionPointer("prayer_done"));
    if(Number(!!(Number(C.field(C.gp,"instance_globals_p","p_type").value==3)&&Number(!(C.In_hell(C.field(C.u,"you","uz").address)))))) {
        /* if you've been true to your god you can't die while you pray */
        if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.variadic(152,C.literal("are surrounded by a shimmering light."));
        (C.field(C.u,"you","uinvulnerable").value=C.u32((C.i8(1))));
    }
    return 1;
}

export function prayer_done()
{
    /* M. Stephenson (1.0.3b) */
    let alignment=C.field(C.gp,"instance_globals_p","p_aligntyp").value;
    (C.field(C.u,"you","uinvulnerable").value=C.u32((C.i8(0))));
    if(Number(C.field(C.gp,"instance_globals_p","p_type").value==C.i32((-2)))) {
        /* praying at an unaligned altar, not necessarily in Gehennom */
        C.variadic(153,C.literal("%s diabolical laughter all around you..."),(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))?C.literal("hear"):C.literal("intuit")));
        C.wake_nearby((C.i8(0)));
        C.adjalign(C.i32((-2)));
        C.exercise(C.A_WIS,(C.i8(0)));
        if(Number(!(C.In_hell(C.field(C.u,"you","uz").address)))) {
            /* hero's god[dess] seems to be keeping his/her head down */
            C.variadic(154,C.literal("Nothing else happens."));
            /* not actually true... */
            return 1;
        }
        /* else use regular Inhell result below */
    } else if(Number(C.field(C.gp,"instance_globals_p","p_type").value==C.i32((-1)))) {
        /* praying while poly'd into an undead creature while non-chaotic */
        godvoice(alignment,((Number(C.i32(alignment)==1))?C.literal("Vile creature, thou durst call upon me?"):C.literal("Walk no more, perversion of nature!")));
        C.variadic(155,C.literal("like you are falling apart."));
        /* KMH -- Gods have mastery over unchanging */
        C.rehumanize();
        /* no Half_physical_damage adjustment here */
        C.losehp(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2303,(C.literal("prayer_done"))),C.rnd(20))):C.rnd(20))),C.literal("residual undead turning effect"),C.i8(0));
        C.exercise(C.A_CON,(C.i8(0)));
        return 1;
    }
    if(C.In_hell(C.field(C.u,"you","uz").address)) {
        C.variadic(156,C.literal("Since you are in Gehennom, %s can't help you."),align_gname(alignment));
        /* haltingly aligned is least likely to anger */
        if(Number(!!(Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value<=0)||((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2311,(C.literal("prayer_done"))),C.rnl(C.field(C.field(C.u,"you","ualign").address,"align","record").value))):C.rnl(C.field(C.field(C.u,"you","ualign").address,"align","record").value)))))) angrygods(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
        return 0;
    }
    if(Number(C.field(C.gp,"instance_globals_p","p_type").value==0)) {
        if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))&&Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=C.i32(alignment))))) water_prayer((C.i8(0)));
        (C.field(C.u,"you","ublesscnt").value=C.i32(C.field(C.u,"you","ublesscnt").value+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2319,(C.literal("prayer_done"))),C.rnz(250))):C.rnz(250)))));
        C.change_luck(C.i8(C.i32((-3))));
        gods_upset(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
    } else if(Number(C.field(C.gp,"instance_globals_p","p_type").value==1)) {
        if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))&&Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=C.i32(alignment))))) water_prayer((C.i8(0)));
        angrygods(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
        /* naughty */
    } else if(Number(C.field(C.gp,"instance_globals_p","p_type").value==2)) {
        if(water_prayer((C.i8(0)))) {
            /* attempted water prayer on a non-coaligned altar */
            (C.field(C.u,"you","ublesscnt").value=C.i32(C.field(C.u,"you","ublesscnt").value+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2329,(C.literal("prayer_done"))),C.rnz(250))):C.rnz(250)))));
            C.change_luck(C.i8(C.i32((-3))));
            gods_upset(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
        } else pleased(alignment);
    } else {
        /* coaligned */
        if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))) {
            pray_revive();
            water_prayer((C.i8(1)));
        }
        pleased(alignment);
        /* nice */
    }
    return 1;
}

/* iterable for undead turning by priest/knight */
export function maybe_turn_mon_iter(mtmp)
{
    /* 3.6.3: used to use cansee() here but the purpose is to prevent
       #turn operating through walls, not to require that the hero be
       able to see the target location */
    if(Number(!!(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&1)))!=0))))||Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)>C.turn_undead_range)))) return;
    if(Number(!!(Number(!(C.field(mtmp,"monst","mpeaceful").value))&&(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))||(Number(!!(Number(!!(Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))))||(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(256n))))!=C.u64(0n)))&&(Number(C.field(C.u,"you","ulevel").value>(C.i32(Math.trunc((30/2))))))))))))))) {
        (C.field(mtmp,"monst","msleeping").value=C.u32(0));
        if(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value) {
            if(Number(!(((C.turn_undead_msg_cnt=C.i32((C.turn_undead_msg_cnt+1)))-1)))) C.variadic(157,C.literal("Unfortunately, your voice falters."));
            (C.field(mtmp,"monst","mflee").value=C.u32(0));
            (C.field(mtmp,"monst","mfrozen").value=C.u32(0));
            (C.field(mtmp,"monst","mcanmove").value=C.u32(1));
        } else if(Number(!(C.resist(mtmp,C.i8(0),0,1)))) {
            let xlev=6;
            switch(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)) {
                /* this is intentional, lichs are tougher
                   than zombies. */
                case (C.S_LICH):
                    (xlev=C.i32(xlev+2));
                ;
                /*FALLTHRU*/
                case (C.S_GHOST):
                    (xlev=C.i32(xlev+2));
                ;
                /*FALLTHRU*/
                case (C.S_VAMPIRE):
                    (xlev=C.i32(xlev+2));
                ;
                /*FALLTHRU*/
                case (C.S_WRAITH):
                    (xlev=C.i32(xlev+2));
                ;
                /*FALLTHRU*/
                case (C.S_MUMMY):
                    (xlev=C.i32(xlev+2));
                ;
                /*FALLTHRU*/
                case (C.S_ZOMBIE):
                    if(Number(!!(Number(C.field(C.u,"you","ulevel").value>=xlev)&&Number(!(C.resist(mtmp,C.i8(0),0,0)))))) {
                        if(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==(C.i32((-1))))) {
                            (C.field(mtmp,"monst","mpeaceful").value=C.u32(1));
                            C.set_malign(mtmp);
                        } else {
                            /* damn them */
                            C.killed(mtmp);
                        }
                        break;
                    }
                /* else flee */
                ;
                /*FALLTHRU*/
                default:
                    C.monflee(mtmp,0,(C.i8(0)),(C.i8(1)));
                break;
            }
        }
    }
}

/* #turn command */
export function doturn()
{
    /* Knights & Priest(esse)s only please */
    let Gname;
    if(Number(!!(Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))))&&Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_KNIGHT)))))))) {
        /* Try to use the "turn undead" spell. */
        if(C.known_spell(C.i16(C.SPE_TURN_UNDEAD))) return C.spelleffects(C.SPE_TURN_UNDEAD,(C.i8(0)),(C.i8(0)));
        C.variadic(158,C.literal("don't know how to turn undead!"));
        return 0;
    }
    if(Number(!(((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value=C.i64((C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value+1n)))-1n)))) C.variadic(159,32n,C.literal("rejected atheism by turning undead"));
    (Gname=halu_gname(C.field(C.field(C.u,"you","ualign").address,"align","type").value));
    /* [What about needing free hands (does #turn involve any gesturing)?] */
    if(Number(!(C.can_chant(C.field(C.gy,"instance_globals_y","youmonst").address)))) {
        /* "evilness": "demons and undead" is too verbose and too precise */
        C.variadic(160,C.literal("are %s upon %s to turn aside evilness."),(C.field((C.field(C.u,"you","uprops").address+Number(C.STRANGLED)*C.sizes["struct prop"]),"prop","intrinsic").value?C.literal("not able to call"):C.literal("incapable of calling")),Gname);
        /* violates agnosticism due to intent; conduct tracking is not
           supposed to affect play but we make an exception here:  use a
           move if this is the first time agnostic conduct has been broken */
        return ((Number(C.field(C.field(C.u,"you","uconduct").address,"u_conduct","gnostic").value==C.i64(1)))?1:0);
    }
    if(Number(!!((Number(!!(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)!=(C.i32((-1))))&&(Number(!!(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(256n))))!=C.u64(0n)))||(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))))||(Number(!!(Number(!!(Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))))))))||Number(C.field(C.u,"you","ugangr").value>6)))) {
        /* "Die, mortal!" */
        C.variadic(161,C.literal("For some reason, %s seems to ignore you."),Gname);
        C.aggravate();
        C.exercise(C.A_WIS,(C.i8(0)));
        return 1;
    }
    if(C.In_hell(C.field(C.u,"you","uz").address)) {
        C.variadic(162,C.literal("Since you are in Gehennom, %s %s help you."),Gname,(Number(!(C.strcmp(Gname,C.Moloch)))?C.literal("won't"):C.literal("can't")));
        /* not actually calling upon Moloch but use alternate
                 phrasing anyway if hallucinatory feedback says it's him */
        C.aggravate();
        return 1;
    }
    C.variadic(163,C.literal("Calling upon %s, you chant an arcane formula."),Gname);
    C.exercise(C.A_WIS,(C.i8(1)));
    /* note: does not perform unturn_dead() on victims' inventories */
    (C.turn_undead_range=C.i32((8+(C.i32(Math.trunc((C.field(C.u,"you","ulevel").value/5)))))));
    /* 8 to 14 */
    (C.turn_undead_range=C.i32(C.turn_undead_range*C.turn_undead_range));
    (C.turn_undead_msg_cnt=0);
    C.iter_mons(C.functionPointer("maybe_turn_mon_iter"));
    /*
     *  There is no detrimental effect on self for successful #turn
     *  while in demon or undead form.  That can only be done while
     *  chaotic oneself (see "For some reason" above) and chaotic
     *  turning only makes targets peaceful.
     *
     *  Paralysis duration probably ought to be based on the strength
     *  of turned creatures rather than on turner's level.
     *  Why doesn't this honor Free_action?  [Because being able to
     *  repeat #turn every turn would be too powerful.  Maybe instead
     *  of nomul(-N) we should add the equivalent of mon->mspec_used
     *  for the hero and refuse to #turn when it's non-zero?  Or have
     *  both and u.uspec_used only matters when Free_action prevents
     *  the brief paralysis?]
     */
    C.nomul(C.i32((-(C.i32((5-(C.i32(Math.trunc(((C.i32((C.field(C.u,"you","ulevel").value-1)))/6))))))))));
    /* -5 .. -1 */
    (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("trying to turn the monsters"));
    (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.field(C.c_common_strings,"c_common_strings","c_You_can_move_again").value);
    return 1;
}

export function altarmask_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let res=0;
    if(C.isok(x,y)) {
        let mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value);
        if(Number(!!(Number(!!(mon&&Number((C.i32((C.i32(C.field((mon),"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE)))&&Number(C.field(mon,"monst","mappearance").value==C.u32(C.S_altar))))) (res=((Number(!!(C.field((mon),"monst","mextra").value&&Number((C.field(C.field((mon),"monst","mextra").value,"mextra","mcorpsenm").value)!=C.NON_PM))))?(C.field(C.field((mon),"monst","mextra").value,"mextra","mcorpsenm").value):0));
 else if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))) (res=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value));
    }
    return res;
}

export function a_gname()
{
    return a_gname_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
}

/* returns the name of an altar's deity */
export function a_gname_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))))) return 0;
    return align_gname(((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7))))-2)))))))));
}

/* returns the name of the hero's deity */
export function u_gname()
{
    return align_gname(C.field(C.field(C.u,"you","ualign").address,"align","type").value);
}

export function align_gname(alignment)
{
    alignment=C.i8(alignment);
    let gnam;
    switch(C.i32(alignment)) {
        case ((C.i32((-128)))):
            (gnam=C.Moloch);
        break;
        case (1):
            (gnam=C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","lgod").value);
        break;
        case (0):
            (gnam=C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","ngod").value);
        break;
        case ((C.i32((-1)))):
            (gnam=C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","cgod").value);
        break;
        default:
            C.variadic(164,C.literal("unknown alignment."));
        (gnam=C.literal("someone"));
        break;
    }
    if(Number(C.i32(C.cell(gnam,"char").value)==95)) (gnam=C.ptr((gnam+Number(1))));
    return gnam;
}

export const hallu_gods=C=>[C.literal("the Flying Spaghetti Monster"),C.literal("Eris"),C.literal("the Martians"),C.literal("Xom"),C.literal("AnDoR dRaKoN"),C.literal("the Central Bank of Yendor"),C.literal("Tooth Fairy"),C.literal("Om"),C.literal("Yawgmoth"),C.literal("Morgoth"),C.literal("Cthulhu"),C.literal("the Ori"),C.literal("destiny"),C.literal("your Friend the Computer")];
/* Church of the FSM */
/* Discordianism */
/* every science fiction ever */
/* Crawl */
/* ADOM */
/* economics */
/* real world(?) */
/* Discworld */
/* Magic: the Gathering */
/* LoTR */
/* Lovecraft */
/* Stargate */
/* why not? */
/* Paranoia */
/* hallucination handling for priest/minion names: select a random god
   iff character is hallucinating */
export function halu_gname(alignment)
{
    alignment=C.i8(alignment);
    let gnam=0;
    let which;
    if(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))) return align_gname(alignment);
    /* Some roles (Priest) don't have a pantheon unless we're playing as
       that role, so keep trying until we get a role which does have one.
       [If playing a Priest, the current pantheon will be twice as likely
       to get picked as any of the others.  That's not significant enough
       to bother dealing with.] */
    do (which=C.randrole((C.i8(1))));
 while(Number(!(C.field((C.roles+Number(which)*C.sizes["struct Role"]),"Role","lgod").value)));
    switch(C.rn2_on_display_rng(9)) {
        case (0):
            case (1):
                (gnam=C.field((C.roles+Number(which)*C.sizes["struct Role"]),"Role","lgod").value);
        break;
        case (2):
            case (3):
                (gnam=C.field((C.roles+Number(which)*C.sizes["struct Role"]),"Role","ngod").value);
        break;
        case (4):
            case (5):
                (gnam=C.field((C.roles+Number(which)*C.sizes["struct Role"]),"Role","cgod").value);
        break;
        case (6):
            case (7):
                (gnam=C.hallu_gods[Number(C.rn2_on_display_rng(C.i32((C.u64((BigInt((8*14))/BigInt(8)))))))]);
        break;
        case (8):
            (gnam=C.Moloch);
        break;
        default:
            C.variadic(165,C.literal("rn2 broken in halu_gname?!?"));
    }
    if(Number(!(gnam))) {
        C.variadic(166,C.literal("No random god name?"));
        (gnam=C.literal("your Friend the Computer"));
        /* Paranoia */
    }
    if(Number(C.i32(C.cell(gnam,"char").value)==95)) (gnam=C.ptr((gnam+Number(1))));
    return gnam;
}

/* deity's title */
export function align_gtitle(alignment)
{
    alignment=C.i8(alignment);
    let gnam; let result=C.literal("god");
    switch(C.i32(alignment)) {
        case (1):
            (gnam=C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","lgod").value);
        break;
        case (0):
            (gnam=C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","ngod").value);
        break;
        case ((C.i32((-1)))):
            (gnam=C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","cgod").value);
        break;
        default:
            (gnam=0);
        break;
    }
    if(Number(!!(gnam&&Number(C.i32(C.cell(gnam,"char").value)==95)))) (result=C.literal("goddess"));
    return result;
}

export function altar_wrath(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let altaralign=((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&7)))&7))))-2))))))));
    if(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)==C.i32(altaralign))&&Number(C.field(C.field(C.u,"you","ualign").address,"align","record").value>C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2656,(C.literal("altar_wrath"))),C.rn2(4))):C.rn2(4))))))))) {
        godvoice(altaralign,C.literal("How darest thou desecrate my altar!"));
        C.adjattrib(C.A_WIS,C.i32((-1)),C.i32((C.i8(0))));
        ((C.field(C.field(C.u,"you","ualign").address,"align","record").value=C.i32((C.field(C.field(C.u,"you","ualign").address,"align","record").value-1)))+1);
    } else {
        C.variadic(167,C.literal("%s %s%s:"),(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))?C.literal("A voice (could it be"):C.literal("Despite your deafness, you seem to hear")),align_gname(altaralign),(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))?C.literal("?) whispers"):C.literal(" say")));
        ;
        C.variadic(168,C.literal("Thou shalt pay, infidel!"));
        /* higher luck is more likely to be reduced; as it approaches -5
           the chance to lose another point drops down, eventually to 0 */
        if(Number(!!(Number((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))>C.i32((-5)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2670,(C.literal("altar_wrath"))),C.rn2(C.i32(((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))+6))))):C.rn2(C.i32(((C.i32((C.i32(C.field(C.u,"you","uluck").value)+C.i32(C.field(C.u,"you","moreluck").value))))+6)))))))) C.change_luck(C.i8((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pray.c"),2671,(C.literal("altar_wrath"))),C.rn2(20))):C.rn2(20)))?C.i32((-1)):C.i32((-2)))));
    }
}

/* assumes isok() at one space away, but not necessarily at two */
export function blocked_boulder(dx,dy)
{
    dx=C.i32(dx);
    dy=C.i32(dy);
    let otmp;
    let nx; let ny;
    let count=0n;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+dx)))*(8*21))+Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+dy)))*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) {
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BOULDER)) (count=C.i64(count+C.field(otmp,"obj","quan").value));
    }
    ((nx=C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32((2*dx))))),(ny=C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32((2*dy))))));
    /* next spot beyond boulder(s) */
    switch(count) {
        case C.i64((0)):
            /* no boulders--not blocked */
            return (C.i8(0));
        case C.i64((1)):
            /* possibly blocked depending on if it's pushable */
            break;
        case C.i64((2)):
            /* this is only approximate since multiple boulders might sink */
            if(C.is_pool_or_lava(C.i16(nx),C.i16(ny))) break;
        /* does its own isok() check */
        /* still need Sokoban check below */
        ;
        /*FALLTHRU*/
        default:
            /* more than one boulder--blocked after they push the top one;
           don't force them to push it first to find out */
            return (C.i8(1));
    }
    if(Number(!!(Number(!!(dx&&dy))&&C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value)))) return (C.i8(1));
    /* can't push boulder diagonally in Sokoban */
    if(Number(!(C.isok(C.i16(nx),C.i16(ny))))) return (C.i8(1));
    if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(nx)*(C.sizes["struct rm"]*21))+Number(ny)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))) return (C.i8(1));
    if(C.sobj_at(C.BOULDER,C.i16(nx),C.i16(ny))) return (C.i8(1));
    return (C.i8(0));
}

/*pray.c*/
export const initialState=C=>({Moloch:Moloch(C),godvoices:godvoices(C),turn_undead_range:0,turn_undead_msg_cnt:0,hallu_gods:hallu_gods(C)});
