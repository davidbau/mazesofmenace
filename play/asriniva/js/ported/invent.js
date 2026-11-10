import { C } from './c-runtime.js';
/* NetHack 5.0	invent.c	$NHDT-Date: 1762680996 2025/11/09 01:36:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.543 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Derek S. Ray, 2015. */
/* NetHack may be freely redistributed.  See license for details. */
/* enum and structs are defined in wintype.h */
/* wizards can wish for venom, which will become an invisible inventory
 * item without this.  putting it in inv_order would mean venom would
 * suddenly become a choice for all the inventory-class commands, which
 * would probably cause mass confusion.  the test for inventory venom
 * is only WIZARD and not wizard because the wizard can leave venom lying
 * around on a bones level for normal players to find.  [Note to the
 * confused:  'WIZARD' used to be a compile-time conditional so this was
 * guarded by #ifdef WIZARD/.../#endif.]
 */
/* (constant) */
/* menu heading lines used instead of object classes when sorting by in-use;
   pointers aren't const because dispinv_with_action() might temporarily
   change "Accessories" to "Rings" or "Amulet", then back again */
/* [4] shown first, [1] last */
/* sortloot() classification for in-use sort;
   called at most once [per sort] for each object */
export function inuse_classify(sort_item,obj)
{
    sort_item=C.ptr(sort_item);
    obj=C.ptr(obj);
    let w_mask=(C.i64((C.field(obj,"obj","owornmask").value&(C.i64((C.i64(((C.i64((C.i64(((C.i64((131072n|262144n)))|65536n))|524288n)))|(C.i64((C.i64((256n|1024n))|512n)))))|(C.i64((C.i64((C.i64((C.i64((C.i64((C.i64((1n|2n))|4n))|8n))|16n))|32n))|64n)))))))));
    let rating=0; let altclass=0;
    assign_rating: {
    /* 'rating' advances for each USE_RATING() call */
    /*
     * In order of importance, least to most, somewhat arbitrarily.
     *
     * For instance, all accessories are grouped together even
     * though they're usually less important than other stuff, so
     * that they appear earlier within displayed list of used items.
     * Amulet is rated as most important primarily because the
     * default 'packorder' puts amulets first (possibly because one
     * might be The Amulet).  Non-wielded alternate weapon and
     * quiver are grouped with primary weapon.  Weapons are rated
     * above armor because of default 'packorder'.
     *
     * These ratings don't match either subclasses or 'packorder'.
     *
     * USE_RATING() sets up 'rating' then jumps to 'assign_rating'
     * if 'obj' warrants that.
     */
    /* "Miscellaneous" */
    (()=>{const old=altclass;altclass=C.i32((old+1));return altclass;})();
    /* 1 */
    /* lamp and leash might be used doubly, as a tool and also wielded
       or readied-in-quiver; these tests for used-as-tool only pass
       when owornmask is 0 so that used-as-weapon takes precedence */
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((Number(!!(Number(!!(Number(!(w_mask))&&Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)))&&C.field(obj,"obj","corpsenm").value)))!=0)) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((Number(!!(Number(!!(Number(!(w_mask))&&Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS)))&&C.i32(C.field(obj,"obj","lamplit").value))))!=0)) break assign_rating; /* source goto assign_rating */
    } while(0);
    /* "Armor" */
    (()=>{const old=altclass;altclass=C.i32((old+1));return altclass;})();
    /* 2 */
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&64n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&32n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&16n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&4n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&8n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&2n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&1n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    /* "Weapons" */
    (()=>{const old=altclass;altclass=C.i32((old+1));return altclass;})();
    /* 3 */
    /* could get more complicated:  if uswapwep is just alternate weapon
       rather than wielded secondary, swap order with quiver (unless
       quiver is ammo for uswapwep without also being ammo for uwep) */
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&512n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&1024n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&256n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    /* "Accessories" */
    (()=>{const old=altclass;altclass=C.i32((old+1));return altclass;})();
    /* 4 */
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&524288n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&(((Number(C.i32(C.field(C.u,"you","uhandedness").value)==1))?262144n:131072n)))))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    /* off hand */
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&(((Number(C.i32(C.field(C.u,"you","uhandedness").value)==0))?262144n:131072n)))))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    /* main hand */
    do {
        (()=>{const old=rating;rating=C.i32((old+1));return rating;})();
        if(Number((C.i64((w_mask&65536n)))!=C.i64(0))) break assign_rating; /* source goto assign_rating */
    } while(0);
    /* if we get here, the USE_RATING() checks failed to find a match */
    (rating=0);
    (altclass=C.i32((-1)));
    /* 'orderclass' must end up non-zero */
    } /* source assign_rating: */
    (C.field(sort_item,"sortloot_item","inuse").value=C.i8(rating));
    (C.field(sort_item,"sortloot_item","orderclass").value=C.i8(altclass));
    /* used for alternate headings */
    /* not applicable for in-use */
    (C.field(sort_item,"sortloot_item","subclass").value=C.i8(0));
    (C.field(sort_item,"sortloot_item","disco").value=C.i8(0));
}

/* sortloot() classification; called at most once [per sort] for each object;
   also called by '\' command if discoveries use sortloot order */
export function loot_classify(sort_item,obj)
{
    sort_item=C.ptr(sort_item);
    obj=C.ptr(obj);
    /* we may eventually make this a settable option to always use
       with sortloot instead of only when the 'sortpack' option isn't
       set; it is similar to sortpack's inv_order but items most
       likely to be picked up are moved to the front */
    
    
    let classorder;
    let p;
    let k; let otyp=C.i32(C.field(obj,"obj","otyp").value); let oclass=C.i32(C.field(obj,"obj","oclass").value);
    let seen; let discovered=C.i8((C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_name_known").value)?C.i32((C.i8(1))):C.i32((C.i8(0)))));
    /*
     * For the value types assigned by this classification, sortloot()
     * will put lower valued ones before higher valued ones.
     */
    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.observe_object(obj);
    /* xname(obj) does this; we want it sooner */
    ((seen=C.i8((C.i32(C.field(obj,"obj","dknown").value)?C.i32((C.i8(1))):C.i32((C.i8(0)))))),(classorder=(C.i32(C.field(C.flags,"flag","sortpack").value)?C.field(C.flags,"flag","inv_order").address:C.staticAddress("loot_classify.def_srt_order"))));
    /* class order */
    (p=C.strchr(classorder,oclass));
    if(p) (k=C.i32((1+C.i32((C.i64(((p-classorder)/1)))))));
 else (k=C.i32((C.i32((1+C.i32(C.strlen(classorder))))+(Number(oclass!=C.VENOM_CLASS)))));
    (C.field(sort_item,"sortloot_item","orderclass").value=C.i8(k));
    /* subclass designation; only a few classes have subclasses
       and the non-armor ones we use are fairly arbitrary */
    switch(oclass) {
        case (C.ARMOR_CLASS):
            if(Number(!(C.cell((C.staticAddress("loot_classify.armcat")+Number(7)*1),"char").value))) {
                /* one-time init; we use a different order than the subclass
               values defined by objclass.h */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_HELM)*1),"char").value=C.i8(1));
                /* [2] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_GLOVES)*1),"char").value=C.i8(2));
                /* [3] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_BOOTS)*1),"char").value=C.i8(3));
                /* [4] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_SHIELD)*1),"char").value=C.i8(4));
                /* [1] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_CLOAK)*1),"char").value=C.i8(5));
                /* [5] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_SHIRT)*1),"char").value=C.i8(6));
                /* [6] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(C.ARM_SUIT)*1),"char").value=C.i8(7));
                /* [0] */
                (C.cell((C.staticAddress("loot_classify.armcat")+Number(7)*1),"char").value=C.i8(8));
                /* sanity protection */
            }
        (k=C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value));
        /* oc_armcat overloads oc_subtyp which is an 'schar' so guard
           against somebody assigning something unexpected to it */
        if(Number(!!(Number(k<0)||Number(k>=7)))) (k=7);
        (k=C.i32(C.cell((C.staticAddress("loot_classify.armcat")+Number(k)*1),"char").value));
        break;
        case (C.WEAPON_CLASS):
            /* for weapons, group by ammo (arrows, bolts), launcher (bows),
           missile (darts, boomerangs), stackable (daggers, knives, spears),
           'other' (swords, axes, &c), polearms */
            (k=C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value));
        (k=((Number(k<0))?(((Number(!!(Number(k>=C.i32((-C.P_CROSSBOW)))&&Number(k<=C.i32((-C.P_BOW))))))?1:3)):(((Number(!!(Number(k>=C.P_BOW)&&Number(k<=C.P_CROSSBOW))))?2:((Number(!!(Number(!!(Number(k==C.P_SPEAR)||Number(k==C.P_DAGGER)))||Number(k==C.P_KNIFE))))?4:(Number(!((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_POLEARMS)||Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_LANCE)))||C.i32(C.is_art(obj,C.ART_SNICKERSNEE))))))))))?5:6))))));
        break;
        case (C.TOOL_CLASS):
            if(Number(!!(Number(!!(C.i32(seen)&&C.i32(discovered)))&&(Number(!!(Number(otyp==C.BAG_OF_TRICKS)||Number(otyp==C.HORN_OF_PLENTY))))))) (k=2);
 else if((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) (k=1);
 else switch(otyp) {
                /* known pseudo-container */
                /* regular container or unknown bag of tricks */
                case (C.WOODEN_FLUTE):
                    case (C.MAGIC_FLUTE):
                        case (C.TOOLED_HORN):
                            case (C.FROST_HORN):
                                case (C.FIRE_HORN):
                                    case (C.WOODEN_HARP):
                                        case (C.MAGIC_HARP):
                                            case (C.BUGLE):
                                                case (C.LEATHER_DRUM):
                                                    case (C.DRUM_OF_EARTHQUAKE):
                                                        case (C.HORN_OF_PLENTY):
                                                            /* not a musical instrument */
                                                            (k=3);
                /* instrument or unknown horn of plenty */
                break;
                default:
                    (k=4);
                /* 'other' tool */
                break;
            }
        break;
        case (C.FOOD_CLASS):
            /* [what about separating "partly eaten" within each group?] */
            switch(otyp) {
                case (C.SLIME_MOLD):
                    (k=1);
                break;
                default:
                    /* [maybe separate one-bite foods from rations and such?] */
                    (k=(C.i32(C.field(obj,"obj","globby").value)?6:2));
                break;
                case (C.TIN):
                    (k=3);
                break;
                case (C.EGG):
                    (k=4);
                break;
                case (C.CORPSE):
                    (k=5);
                break;
            }
        break;
        case (C.GEM_CLASS):
            /*
         * Normally subclass takes priority over discovery status, but
         * that would give away information for gems (assuming we'll
         * group them as valuable gems, next glass, then gray stones,
         * and finally rocks once they're all fully identified).
         *
         * Order:
         *  1) unseen gems and glass ("gem")
         *  2) seen but undiscovered gems and glass ("blue gem"),
         *  3) discovered gems ("sapphire"),
         *  4) discovered glass ("worthless pieced of blue glass"),
         *  5) unseen gray stones and rocks ("stone"),
         *  6) seen but undiscovered gray stones ("gray stone"),
         *  7) discovered gray stones ("touchstone"),
         *  8) seen rocks ("rock").
         */
            switch(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)) {
                case (C.GEMSTONE):
                    (k=(Number(!(seen))?1:(Number(!(discovered))?2:3)));
                break;
                case (C.GLASS):
                    (k=(Number(!(seen))?1:(Number(!(discovered))?2:4)));
                break;
                default:
                    /* MINERAL */
                    (k=(Number(!(seen))?5:((Number(C.i32(C.field(obj,"obj","otyp").value)!=C.ROCK))?((Number(!(discovered))?6:7)):8)));
                break;
            }
        break;
        default:
            /* other classes don't have subclasses; we assign a nonzero
           value because sortloot() uses 0 to mean 'not yet classified' */
            (k=1);
        /* any non-zero would do */
        break;
    }
    (C.field(sort_item,"sortloot_item","subclass").value=C.i8(k));
    /* discovery status */
    (k=(Number(!(seen))?1:((Number(!!(C.i32(discovered)||Number(!((C.field((C.obj_descr+Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_descr_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_descr").value))))))?4:((C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_uname").value)?3:2))));
    /* unseen */
    /* named (partially discovered) */
    /* undiscovered */
    (C.field(sort_item,"sortloot_item","disco").value=C.i8(k));
    /* not applicable */
    (C.field(sort_item,"sortloot_item","inuse").value=C.i8(0));
}

/* sortloot() formatting routine; for alphabetizing, not shown to user */
export function loot_xname(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["loot_xname.saveo",C.sizes["struct obj"]]]);
    try {
    let saveo=C.automatic("loot_xname.saveo",C.sizes["struct obj"]);
    let save_debug;
    let res; let save_oname;
    /*
     * Deal with things that xname() includes as a prefix.  We don't
     * want such because they change alphabetical ordering.  First,
     * remember 'obj's current settings.
     */
    (C.field(saveo,"obj","oeroded").value=C.field(obj,"obj","oeroded").value);
    ((C.field(saveo,"obj","blessed").value=C.field(obj,"obj","blessed").value),(C.field(saveo,"obj","cursed").value=C.field(obj,"obj","cursed").value));
    (C.field(saveo,"obj","spe").value=C.field(obj,"obj","spe").value);
    (C.field(saveo,"obj","owt").value=C.field(obj,"obj","owt").value);
    (save_oname=((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value))))?(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value):0));
    (save_debug=C.field(C.flags,"flag","debug").value);
    /* suppress "diluted" for potions and "holy/unholy" for water;
       sortloot() will deal with them using other criteria than name */
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)) {
        (C.field(obj,"obj","oeroded").value=C.u32(0));
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_WATER)) ((C.field(obj,"obj","blessed").value=C.u32(0)),(C.field(obj,"obj","cursed").value=C.u32(0)));
    }
    /* make "wet towel" and "moist towel" format as "towel" so that all
       three group together */
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TOWEL)) (C.field(obj,"obj","spe").value=C.i8(0));
    /* group globs by monster type rather than by size:  force all to
       have the same size adjective hence same "small glob of " prefix */
    if(C.field(obj,"obj","globby").value) (C.field(obj,"obj","owt").value=C.u32(20));
    /* weight of a fresh glob (one pudding's worth) */
    /* suppress user-assigned name */
    if(Number(!!(save_oname&&Number(!(C.field(obj,"obj","oartifact").value))))) ((C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value)=0);
    /* avoid wizard mode formatting variations */
    if(C.field(C.flags,"flag","debug").value) {
        /* flags.debug */
        /* paranoia:  before toggling off wizard mode, guard against a
           panic in xname() producing a normal mode panic save file */
        (C.field(C.program_state,"sinfo","something_worth_saving").value=0);
        (C.field(C.flags,"flag","debug").value=(C.i8(0)));
    }
    (res=C.cxname_singular(obj));
    if(save_debug) {
        (C.field(C.flags,"flag","debug").value=(C.i8(1)));
        (C.field(C.program_state,"sinfo","something_worth_saving").value=1);
    }
    /* restore the object */
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)) {
        (C.field(obj,"obj","oeroded").value=C.field(saveo,"obj","oeroded").value);
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_WATER)) ((C.field(obj,"obj","blessed").value=C.field(saveo,"obj","blessed").value),(C.field(obj,"obj","cursed").value=C.field(saveo,"obj","cursed").value));
    }
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TOWEL)) {
        (C.field(obj,"obj","spe").value=C.field(saveo,"obj","spe").value);
        /* give "towel" a suffix that will force wet ones to come first,
           moist ones next, and dry ones last regardless of whether
           they've been flagged as having spe known */
        C.strcat(res,((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.TOWEL)&&Number(C.i32(C.field((obj),"obj","spe").value)>0))))?(((Number(C.i32(C.field(obj,"obj","spe").value)>=3))?C.literal("x"):C.literal("y"))):C.literal("z")));
    }
    if(C.field(obj,"obj","globby").value) {
        (C.field(obj,"obj","owt").value=C.field(saveo,"obj","owt").value);
        /* we've suppressed the size prefix (above); there normally won't
           be more than one of a given creature type because they coalesce,
           but globs with different bless/curse state won't merge so it is
           feasible to have multiple at the same location; add a suffix to
           get such sorted by size (small first) */
        C.strcat(res,((Number(C.field(obj,"obj","owt").value<=C.u32(100)))?C.literal("a"):((Number(C.field(obj,"obj","owt").value<=C.u32(300)))?C.literal("b"):((Number(C.field(obj,"obj","owt").value<=C.u32(500)))?C.literal("c"):C.literal("d")))));
    }
    if(Number(!!(save_oname&&Number(!(C.field(obj,"obj","oartifact").value))))) ((C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value)=save_oname);
    return res;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* '$'==1, 'a'-'z'==2..27, 'A'-'Z'==28..53, '#'==54, catchall 55 */
export function invletter_value(c)
{
    c=C.i8(c);
    return ((Number(!!(Number(97<=C.i32(c))&&Number(C.i32(c)<=122))))?(C.i32((C.i32((C.i32(c)-97))+2))):((Number(!!(Number(65<=C.i32(c))&&Number(C.i32(c)<=90))))?(C.i32((C.i32((C.i32((C.i32(c)-65))+2))+26))):((Number(C.i32(c)==36))?1:((Number(C.i32(c)==35))?C.i32((C.i32((1+C.invlet_basic))+1)):C.i32((C.i32((C.i32((1+C.invlet_basic))+1))+1))))));
    /* none of the above
                                              * (shouldn't happen) */
}

/* qsort comparison routine for sortloot() */
export function sortloot_cmp(vptr1,vptr2)
{
    vptr1=C.ptr(vptr1);
    vptr2=C.ptr(vptr2);
    let sli1=vptr1; let sli2=vptr2;
    let obj1=C.field(sli1,"sortloot_item","obj").value; let obj2=C.field(sli2,"sortloot_item","obj").value;
    let nam1; let nam2; let tmpstr;
    let val1; let val2; let namcmp;
    tiebreak: {
    /* in-use takes precedence over all others */
    if(Number((C.u32((C.field(C.gs,"instance_globals_s","sortlootmode").value&C.u32(8))))!=C.u32(0))) {
        /* Classify each object at most once no matter how many
           comparisons it is involved in. */
        if(Number(!(C.field(sli1,"sortloot_item","orderclass").value))) inuse_classify(sli1,obj1);
        if(Number(!(C.field(sli2,"sortloot_item","orderclass").value))) inuse_classify(sli2,obj2);
        (val1=C.i32(C.field(sli1,"sortloot_item","inuse").value));
        (val2=C.i32(C.field(sli2,"sortloot_item","inuse").value));
        if(Number(val1!=val2)) return C.i32((val2-val1));
        /* bigger value comes before smaller */
        /* neither item in use (or both are lit lamps/candles or both are
           attached leashes; items using owornmask don't produce ties) */
        break tiebreak; /* source goto tiebreak */
    }
    /* order by object class unless we're doing by-invlet without sortpack */
    if(Number((C.u32((C.field(C.gs,"instance_globals_s","sortlootmode").value&C.u32((C.i32((1|2)))))))!=C.u32(2))) {
        /* Classify each object at most once no matter how many
           comparisons it is involved in. */
        if(Number(!(C.field(sli1,"sortloot_item","orderclass").value))) loot_classify(sli1,obj1);
        if(Number(!(C.field(sli2,"sortloot_item","orderclass").value))) loot_classify(sli2,obj2);
        /* Sort by class. */
        (val1=C.i32(C.field(sli1,"sortloot_item","orderclass").value));
        (val2=C.i32(C.field(sli2,"sortloot_item","orderclass").value));
        if(Number(val1!=val2)) return C.i32((val1-val2));
        /* skip sub-classes when ordering by sortpack+invlet */
        if(Number((C.u32((C.field(C.gs,"instance_globals_s","sortlootmode").value&C.u32(2))))==C.u32(0))) {
            /* Class matches; sort by subclass. */
            (val1=C.i32(C.field(sli1,"sortloot_item","subclass").value));
            (val2=C.i32(C.field(sli2,"sortloot_item","subclass").value));
            if(Number(val1!=val2)) return C.i32((val1-val2));
            /* Class and subclass match; sort by discovery status:
             * first unseen, then seen but not named or discovered,
             * then named, lastly discovered.
             * 1) potion
             * 2) pink potion
             * 3) dark green potion called confusion
             * 4) potion of healing
             * Multiple entries within each group will be put into
             * alphabetical order below.
             */
            (val1=C.i32(C.field(sli1,"sortloot_item","disco").value));
            (val2=C.i32(C.field(sli2,"sortloot_item","disco").value));
            if(Number(val1!=val2)) return C.i32((val1-val2));
        }
    }
    /* order by assigned inventory letter */
    if(Number((C.u32((C.field(C.gs,"instance_globals_s","sortlootmode").value&C.u32(2))))!=C.u32(0))) {
        (val1=invletter_value(C.field(obj1,"obj","invlet").value));
        (val2=invletter_value(C.field(obj2,"obj","invlet").value));
        if(Number(val1!=val2)) return C.i32((val1-val2));
    }
    if(Number((C.u32((C.field(C.gs,"instance_globals_s","sortlootmode").value&C.u32(4))))==C.u32(0))) break tiebreak; /* source goto tiebreak */
    /*
     * Sort object names in lexicographical order, ignoring quantity.
     *
     * Each obj gets formatted at most once (per sort) no matter how many
     * comparisons it gets subjected to.
     */
    (nam1=C.field(sli1,"sortloot_item","str").value);
    if(Number(!(nam1))) {
        (tmpstr=loot_xname(obj1));
        (nam1=(C.field(sli1,"sortloot_item","str").value=C.dupstr(tmpstr)));
        C.maybereleaseobuf(tmpstr);
    }
    (nam2=C.field(sli2,"sortloot_item","str").value);
    if(Number(!(nam2))) {
        (tmpstr=loot_xname(obj2));
        (nam2=(C.field(sli2,"sortloot_item","str").value=C.dupstr(tmpstr)));
        C.maybereleaseobuf(tmpstr);
    }
    if(Number(((namcmp=C.strncmpi((nam1),(nam2),C.i32((-1)))))!=0)) return namcmp;
    /* Sort by BUCX. */
    (val1=(C.i32(C.field(obj1,"obj","bknown").value)?((C.i32(C.field(obj1,"obj","blessed").value)?3:(Number(!(C.field(obj1,"obj","cursed").value))?2:1))):0));
    (val2=(C.i32(C.field(obj2,"obj","bknown").value)?((C.i32(C.field(obj2,"obj","blessed").value)?3:(Number(!(C.field(obj2,"obj","cursed").value))?2:1))):0));
    if(Number(val1!=val2)) return C.i32((val2-val1));
    /* bigger is better */
    /* Sort by greasing.  This will put the objects in degreasing order. */
    (val1=C.i32(C.field(obj1,"obj","greased").value));
    (val2=C.i32(C.field(obj2,"obj","greased").value));
    if(Number(val1!=val2)) return C.i32((val2-val1));
    /* bigger is better */
    /* Sort by erosion.  The effective amount is what matters. */
    (val1=((Number(C.i32(C.field((obj1),"obj","oeroded").value)>C.i32(C.field((obj1),"obj","oeroded2").value))?C.i32(C.field((obj1),"obj","oeroded").value):C.i32(C.field((obj1),"obj","oeroded2").value))));
    (val2=((Number(C.i32(C.field((obj2),"obj","oeroded").value)>C.i32(C.field((obj2),"obj","oeroded2").value))?C.i32(C.field((obj2),"obj","oeroded").value):C.i32(C.field((obj2),"obj","oeroded2").value))));
    if(Number(val1!=val2)) return C.i32((val1-val2));
    /* bigger is WORSE */
    /* Sort by erodeproofing.  Map known-invulnerable to 1, and both
       known-vulnerable and unknown-vulnerability to 0, because that's
       how they're displayed. */
    (val1=Number(!!(C.i32(C.field(obj1,"obj","rknown").value)&&C.i32(C.field(obj1,"obj","oerodeproof").value))));
    (val2=Number(!!(C.i32(C.field(obj2,"obj","rknown").value)&&C.i32(C.field(obj2,"obj","oerodeproof").value))));
    if(Number(val1!=val2)) return C.i32((val2-val1));
    /* bigger is better */
    /* Sort by enchantment.  Map unknown to -1000, which is comfortably
       below the range of obj->spe.  oc_uses_known means that obj->known
       matters, which usually indirectly means that obj->spe is relevant.
       Lots of objects use obj->spe for some other purpose (see obj.h). */
    if(Number(!!(C.i32(C.field((C.objects+Number(C.field(obj1,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_uses_known").value)&&Number(C.i32(C.field(obj1,"obj","oclass").value)!=C.FOOD_CLASS)))) {
        /* exclude eggs (laid by you) and tins (homemade, pureed, &c) */
        (val1=(C.i32(C.field(obj1,"obj","known").value)?C.i32(C.field(obj1,"obj","spe").value):C.i32((-1000))));
        (val2=(C.i32(C.field(obj2,"obj","known").value)?C.i32(C.field(obj2,"obj","spe").value):C.i32((-1000))));
        if(Number(val1!=val2)) return C.i32((val2-val1));
        /* bigger is better */
    }
    } /* source tiebreak: */
    /* They're identical, as far as we're concerned.  We want
       to force a deterministic order, and do so by producing a
       stable sort: maintain the original order of equal items. */
    return (C.i32((C.field(sli1,"sortloot_item","indx").value-C.field(sli2,"sortloot_item","indx").value)));
}

/*
 * sortloot() - the story so far...
 *
 *      The original implementation constructed and returned an array
 *      of pointers to objects in the requested order.  Callers had to
 *      count the number of objects, allocate the array, pass one
 *      object at a time to the routine which populates it, traverse
 *      the objects via stepping through the array, then free the
 *      array.  The ordering process used a basic insertion sort which
 *      is fine for short lists but inefficient for long ones.
 *
 *      3.6.0 (and continuing with 3.6.1) changed all that so that
 *      sortloot was self-contained as far as callers were concerned.
 *      It reordered the linked list into the requested order and then
 *      normal list traversal was used to process it.  It also switched
 *      to qsort() on the assumption that the C library implementation
 *      put some effort into sorting efficiently.  It also checked
 *      whether the list was already sorted as it got ready to do the
 *      sorting, so re-examining inventory or a pile of objects without
 *      having changed anything would gobble up less CPU than a full
 *      sort.  But it had at least two problems (aside from the ordinary
 *      complement of bugs):
 *      1) some players wanted to get the original order back when they
 *      changed the 'sortloot' option back to 'none', but the list
 *      reordering made that infeasible;
 *      2) object identification giving the 'ID whole pack' result
 *      would call makeknown() on each newly ID'd object, that would
 *      call update_inventory() to update the persistent inventory
 *      window if one existed, the interface would call the inventory
 *      display routine which would call sortloot() which might change
 *      the order of the list being traversed by the identify code,
 *      possibly skipping the ID of some objects.  That could have been
 *      avoided by suppressing 'perm_invent' during identification
 *      (fragile) or by avoiding sortloot() during inventory display
 *      (more robust).
 *
 *      As of 3.6.2: revert to the temporary array of ordered obj pointers
 *      but have sortloot() do the counting and allocation.  Callers
 *      need to use array traversal instead of linked list traversal
 *      and need to free the temporary array when done.  And the
 *      array contains 'struct sortloot_item' (aka 'Loot') entries
 *      instead of simple 'struct obj *' entries.
 */
export function sortloot(olist,mode,by_nexthere,filterfunc)
{
    olist=C.ptr(olist);
    mode=C.u32(mode);
    by_nexthere=C.i8(by_nexthere);
    filterfunc=C.ptr(filterfunc);
    /* old version might have changed *olist, we don't */
    /* flags for sortloot_cmp() */
    /* T: traverse via obj->nexthere, F: via obj->nobj */
    /* optional filter */
    
    let sliarray;
    let o;
    let n; let i;
    let augment_filter;
    for(((n=C.u32(0)),(o=C.cell(olist,"struct obj *").value));o;(o=(C.i32(by_nexthere)?C.field(C.field(o,"obj","v").address,"vptrs","v_nexthere").value:C.field(o,"obj","nobj").value))) (()=>{const old=n;n=C.u32((old+1));return n;})();

    /* note: if there is a filter function, this might overallocate */
    (sliarray=C.alloc(C.u32(C.u64((C.u64((C.u32((n+C.u32(1)))))*BigInt(C.sizes["struct sortloot_item"]))))));
    /* the 'keep cockatrice corpses' flag is overloaded with sort mode */
    (augment_filter=C.i8(((C.u32((mode&C.u32(32))))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    (mode=C.u32(mode&C.u32(C.i32((~32)))));
    /* remove flag, leaving mode */
    /* populate aliarray[0..n-1] */
    for(((i=C.u32(0)),(o=C.cell(olist,"struct obj *").value));o;(o=(C.i32(by_nexthere)?C.field(C.field(o,"obj","v").address,"vptrs","v_nexthere").value:C.field(o,"obj","nobj").value))) {
        if(Number(!!(Number(!!(filterfunc&&Number(!(C.callback(0,(filterfunc),o)))))&&(Number(!!(Number(!!(Number(!(augment_filter))||Number(C.i32(C.field(o,"obj","otyp").value)!=C.CORPSE)))||Number(!((Number(!!(Number(((C.mons+Number(C.field(o,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(o,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"]))))))))))))) continue;
        /* caller may be asking us to override filterfunc (in order
               to do a cockatrice corpse touch check during pickup even
               if/when the filter rejects food class) */
        C.copy((sliarray+Number(i)*C.sizes["struct sortloot_item"]),C.staticAddress("sortloot.zerosli"),C.sizes["struct sortloot_item"]);
        ((C.field((sliarray+Number(i)*C.sizes["struct sortloot_item"]),"sortloot_item","obj").value=o),(C.field((sliarray+Number(i)*C.sizes["struct sortloot_item"]),"sortloot_item","indx").value=C.i32(i)));
        (()=>{const old=i;i=C.u32((old+1));return i;})();
    }
    (n=i);
    /* add a terminator so that we don't have to pass 'n' back to caller */
    C.copy((sliarray+Number(n)*C.sizes["struct sortloot_item"]),C.staticAddress("sortloot.zerosli"),C.sizes["struct sortloot_item"]);
    (C.field((sliarray+Number(n)*C.sizes["struct sortloot_item"]),"sortloot_item","indx").value=C.i32((-1)));
    /* do the sort; if no sorting is requested, we'll just return
       a sortloot_item array reflecting the current ordering */
    if(Number(!!(mode&&Number(n>C.u32(1))))) {
        (C.field(C.gs,"instance_globals_s","sortlootmode").value=mode);
        /* extra input for sortloot_cmp() */
        C.nh_deterministic_qsort((sliarray),C.u64((n)),(BigInt(C.sizes["struct sortloot_item"])),(C.functionAddress("sortloot_cmp")));
        (C.field(C.gs,"instance_globals_s","sortlootmode").value=C.u32(0));
        /* reset static mode flags */
        /* if sortloot_cmp formatted any objects, discard their strings now */
        for((i=C.u32(0));Number(i<n);(()=>{const old=i;i=C.u32((old+1));return i;})()) if(C.field((sliarray+Number(i)*C.sizes["struct sortloot_item"]),"sortloot_item","str").value) (C.free(C.field((sliarray+Number(i)*C.sizes["struct sortloot_item"]),"sortloot_item","str").value),(C.field((sliarray+Number(i)*C.sizes["struct sortloot_item"]),"sortloot_item","str").value=0));

    }
    return sliarray;
}

/* sortloot() callers should use this to free up memory it allocates */
export function unsortloot(loot_array_p)
{
    loot_array_p=C.ptr(loot_array_p);
    if(C.cell(loot_array_p,"struct sortloot_item *").value) (C.free(C.cell(loot_array_p,"struct sortloot_item *").value),(C.cell(loot_array_p,"struct sortloot_item *").value=0));
}

/* 3.6.0 'revamp' -- simpler than current, but ultimately too simple */
/* flags for sortloot_cmp() */
/* T: traverse via obj->nexthere, F: via obj->nobj */
/* extra input for sortloot_cmp() */
/*0*/
export function assigninvlet(otmp)
{
    otmp=C.ptr(otmp);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["assigninvlet.inuse",(1*52)]]);
    try {
    let inuse=C.automatic("assigninvlet.inuse",(1*52));
    let i;
    let obj;
    /* there should be at most one of these in inventory... */
    if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) {
        (C.field(otmp,"obj","invlet").value=C.i8(C.GOLD_SYM));
        return;
    }
    for((i=0);Number(i<C.invlet_basic);(()=>{const old=i;i=C.i32((old+1));return old;})()) (C.cell((inuse+Number(i)*1),"signed char").value=(C.i8(0)));

    for((obj=C.field(C.gi,"instance_globals_i","invent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(obj!=otmp)) {
        (i=C.i32(C.field(obj,"obj","invlet").value));
        if(Number(!!(Number(97<=i)&&Number(i<=122)))) (C.cell((inuse+Number(C.i32((i-97)))*1),"signed char").value=(C.i8(1)));
 else if(Number(!!(Number(65<=i)&&Number(i<=90)))) (C.cell((inuse+Number(C.i32((C.i32((i-65))+26)))*1),"signed char").value=(C.i8(1)));
        if(Number(i==C.i32(C.field(otmp,"obj","invlet").value))) (C.field(otmp,"obj","invlet").value=C.i8(0));
    }

    if(Number(!!(((i=C.i32(C.field(otmp,"obj","invlet").value)))&&(Number(!!((Number(!!(Number(97<=i)&&Number(i<=122))))||(Number(!!(Number(65<=i)&&Number(i<=90)))))))))) return;
    for((i=C.i32((C.field(C.gl,"instance_globals_l","lastinvnr").value+1)));Number(i!=C.field(C.gl,"instance_globals_l","lastinvnr").value);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
        if(Number(i==C.invlet_basic)) {
            (i=C.i32((-1)));
            continue;
        }
        if(Number(!(C.cell((inuse+Number(i)*1),"signed char").value))) break;
    }
    (C.field(otmp,"obj","invlet").value=C.i8(((C.i32(C.cell((inuse+Number(i)*1),"signed char").value)?35:((Number(i<26))?(C.i32((97+i))):(C.i32((C.i32((65+i))-26))))))));
    (C.field(C.gl,"instance_globals_l","lastinvnr").value=i);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* note: assumes ASCII; toggling a bit puts lowercase in front of uppercase */
/* sort the inventory; used by addinv() and doorganize() */
export function reorder_invent()
{
    let otmp; let prev; let next;
    let need_more_sorting;
    do {
        /*
         * We expect at most one item to be out of order, so this
         * isn't nearly as inefficient as it may first appear.
         */
        (need_more_sorting=(C.i8(0)));
        for(((otmp=C.field(C.gi,"instance_globals_i","invent").value),(prev=0));otmp;) {
            (next=C.field(otmp,"obj","nobj").value);
            if(Number(!!(next&&Number((C.i32((C.i32(C.field((next),"obj","invlet").value)^32)))<(C.i32((C.i32(C.field((otmp),"obj","invlet").value)^32))))))) {
                (need_more_sorting=(C.i8(1)));
                if(prev) (C.field(prev,"obj","nobj").value=next);
 else (C.field(C.gi,"instance_globals_i","invent").value=next);
                (C.field(otmp,"obj","nobj").value=C.field(next,"obj","nobj").value);
                (C.field(next,"obj","nobj").value=otmp);
                (prev=next);
            } else {
                (prev=otmp);
                (otmp=next);
            }
        }
    } while(need_more_sorting);
}

/* scan a list of objects to see whether another object will merge with
   one of them; used in pickup.c when all 52 inventory slots are in use,
   to figure out whether another object could still be picked up */
export function merge_choice(objlist,obj)
{
    objlist=C.ptr(objlist);
    obj=C.ptr(obj);
    let shkp;
    let save_nocharge;
    if(Number(!(objlist))) return 0;
    /* might be checking 'obj' against empty inventory */
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_SCARE_MONSTER)) return 0;
    /* punt on these */
    /* if this is an item on the shop floor, the attributes it will
       have when carried are different from what they are now; prevent
       that from eliciting an incorrect result from mergable() */
    (save_nocharge=C.field(obj,"obj","no_charge").value);
    if(Number(!!(Number(!!(Number(objlist==C.field(C.gi,"instance_globals_i","invent").value)&&Number(C.i32(C.field(obj,"obj","where").value)==1)))&&Number(((shkp=C.shop_keeper(C.inside_shop(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value))))!=0)))) {
        if(C.field(obj,"obj","no_charge").value) (C.field(obj,"obj","no_charge").value=C.u32(0));
 else if(C.inhishop(shkp)) return 0;
        /* A billable object won't have its `unpaid' bit set, so would
           erroneously seem to be a candidate to merge with a similar
           ordinary object.  That's no good, because once it's really
           picked up, it won't merge after all.  It might merge with
           another unpaid object, but we can't check that here (depends
           too much upon shk's bill) and if it doesn't merge it would
           end up in the '#' overflow inventory slot, so reject it now. */
    }
    do {
        /*assert(objlist != NULL);*/
        if(mergable(objlist,obj)) break;
        (objlist=C.field(objlist,"obj","nobj").value);
    } while(objlist);
    (C.field(obj,"obj","no_charge").value=save_nocharge);
    return objlist;
}

/* merge obj with otmp and delete obj if types agree */
export function merged(potmp,pobj)
{
    potmp=C.ptr(potmp);
    pobj=C.ptr(pobj);
    let otmp=C.cell(potmp,"struct obj *").value; let obj=C.cell(pobj,"struct obj *").value;
    let discovered=(C.i8(0));
    if(mergable(otmp,obj)) {
        /* Approximate age: we do it this way because if we were to
         * do it "accurately" (merge only when ages are identical)
         * we'd wind up never merging any corpses.
         * otmp->age = otmp->age*(1-proportion) + obj->age*proportion;
         *
         * Don't do the age manipulation if lit.  We would need
         * to stop the burn on both items, then merge the age,
         * then restart the burn.  Glob ages are averaged in the
         * absorb routine, which uses weight rather than quantity
         * to adjust for proportion (glob quantity is always 1).
         */
        if(Number(!!(Number(!(C.field(obj,"obj","lamplit").value))&&Number(!(C.field(obj,"obj","globby").value))))) (C.field(otmp,"obj","age").value=C.i64(((C.i64(((C.i64((C.field(otmp,"obj","age").value*C.field(otmp,"obj","quan").value)))+(C.i64((C.field(obj,"obj","age").value*C.field(obj,"obj","quan").value))))))/(C.i64((C.field(otmp,"obj","quan").value+C.field(obj,"obj","quan").value))))));
        if(Number(!(C.field(otmp,"obj","globby").value))) (C.field(otmp,"obj","quan").value=C.i64(C.field(otmp,"obj","quan").value+C.field(obj,"obj","quan").value));
        /* temporary special case for gold objects!!!! */
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) ((C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp))),(C.field(otmp,"obj","bknown").value=C.u32(0)));
 else if(Number(!((Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_GRAY_OOZE)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_BROWN_PUDDING)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_GREEN_SLIME)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_BLACK_PUDDING))))))) (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
        /* and puddings!!!1!!one! */
        if(Number(!!(Number(!((Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","oname").value))))))&&(Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value))))))) (otmp=(C.cell(potmp,"struct obj *").value=C.oname(otmp,(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value),512)));
        C.obj_extract_self(obj);
        if(Number(!!(C.i32(C.field(obj,"obj","pickup_prev").value)&&Number(C.i32(C.field(otmp,"obj","where").value)==3)))) (C.field(otmp,"obj","pickup_prev").value=C.u32(1));
        /* really should merge the timeouts */
        if(C.field(obj,"obj","lamplit").value) C.obj_merge_light_sources(obj,otmp);
        if(C.field(obj,"obj","timed").value) C.obj_stop_timers(obj);
        /* follows lights */
        /* objects can be identified by comparing them (unless Blind,
           but that is handled in mergable()); the object becomes
           identified in a particular dimension if either object was
           previously identified in that dimension, and if the
           identification states don't match, one of them must have
           previously been identified */
        if(Number(C.i32(C.field(obj,"obj","known").value)!=C.i32(C.field(otmp,"obj","known").value))) {
            (C.field(otmp,"obj","known").value=C.u32(1));
            (discovered=(C.i8(1)));
        }
        if(Number(C.i32(C.field(obj,"obj","rknown").value)!=C.i32(C.field(otmp,"obj","rknown").value))) {
            (C.field(otmp,"obj","rknown").value=C.u32(1));
            if(C.field(otmp,"obj","oerodeproof").value) (discovered=(C.i8(1)));
        }
        if(Number(C.i32(C.field(obj,"obj","bknown").value)!=C.i32(C.field(otmp,"obj","bknown").value))) {
            (C.field(otmp,"obj","bknown").value=C.u32(1));
            if(Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))))) (discovered=(C.i8(1)));
        }
        /* fixup for `#adjust' merging wielded darts, daggers, &c */
        if(Number(!!(C.field(obj,"obj","owornmask").value&&(Number(C.i32(C.field((otmp),"obj","where").value)==3))))) {
            let wmask=C.i64((C.field(otmp,"obj","owornmask").value|C.field(obj,"obj","owornmask").value));
            /* Both the items might be worn in competing slots;
               merger preference (regardless of which is which):
             primary weapon + alternate weapon -> primary weapon;
             primary weapon + quiver -> primary weapon;
             alternate weapon + quiver -> alternate weapon.
               (Prior to 3.3.0, it was not possible for the two
               stacks to be worn in different slots and `obj'
               didn't need to be unworn when merging.) */
            if(Number((C.i64((wmask&256n)))!=0n)) {
                (wmask=256n);
            } else if(Number((C.i64((wmask&1024n)))!=0n)) {
                (wmask=1024n);
            } else if(Number((C.i64((wmask&512n)))!=0n)) {
                (wmask=512n);
            } else {
                C.variadic(0,C.literal("merging strangely worn items (%lx)"),wmask);
                (wmask=C.field(otmp,"obj","owornmask").value);
            }
            if(Number((C.i64((C.field(otmp,"obj","owornmask").value&C.i64((~wmask)))))!=0n)) C.setnotworn(otmp);
            C.setworn(otmp,wmask);
            C.setnotworn(obj);
            /* (this should not be necessary, since items
            already in a monster's inventory don't ever get
            merged into other objects [only vice versa]) */
            /*0*/
        }
        /* mergable() no longer requires 'bypass' to match; if 'obj' has
           the bypass bit set, force the combined stack to have that too;
           primarily in case this merge is occurring because stackobj()
           is operating on an object just dropped by a monster that was
           zapped with polymorph, we want bypass set in order to inhibit
           the same zap from affecting the new combined stack when it hits
           objects at the monster's spot (but also in case we're called by
           code that's using obj->bypass to track 'already processed') */
        if(C.field(obj,"obj","bypass").value) (C.field(otmp,"obj","bypass").value=C.u32(1));
        /* handle puddings a bit differently; absorption will free the
           other object automatically so we can just return out from here */
        if(C.field(obj,"obj","globby").value) {
            C.pudding_merge_message(otmp,obj);
            C.obj_absorb(potmp,pobj);
            return 1;
        }
        /* Print a message if item comparison discovers more
           information about the items (with the exception of thrown
           items, where this would be too spammy as such items get
           unidentified by monsters very frequently). */
        if(Number(!!(Number(!!(Number(!!(C.i32(discovered)&&Number(C.i32(C.field(otmp,"obj","where").value)==3)))&&Number(C.i32(C.field(obj,"obj","how_lost").value)!=1)))&&Number(C.i32(C.field(otmp,"obj","how_lost").value)!=1)))) {
            C.variadic(1,C.literal("You learn more about your items by comparing them."));
        }
        C.obfree(obj,otmp);
        /* free(obj), bill->otmp */
        return 1;
    }
    return 0;
}

/*
 * Adjust hero intrinsics as if this object was being added to the hero's
 * inventory.  Called _before_ the object has been added to the hero's
 * inventory.
 *
 * This is called when adding objects to the hero's inventory normally (via
 * addinv) or when an object in the hero's inventory has been polymorphed
 * in-place.
 */
export function addinv_core1(obj)
{
    obj=C.ptr(obj);
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.AMULET_OF_YENDOR)) {
        if(C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value) C.variadic(2,C.literal("already have amulet?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value=C.u32(1));
        C.record_achievement(C.i8(C.ACH_AMUL));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)) {
        if(C.field(C.field(C.u,"you","uhave").address,"u_have","menorah").value) C.variadic(3,C.literal("already have candelabrum?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","menorah").value=C.u32(1));
        C.record_achievement(C.i8(C.ACH_CNDL));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BELL_OF_OPENING)) {
        if(C.field(C.field(C.u,"you","uhave").address,"u_have","bell").value) C.variadic(4,C.literal("already have silver bell?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","bell").value=C.u32(1));
        C.record_achievement(C.i8(C.ACH_BELL));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SPE_BOOK_OF_THE_DEAD)) {
        if(C.field(C.field(C.u,"you","uhave").address,"u_have","book").value) C.variadic(5,C.literal("already have the book?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","book").value=C.u32(1));
        C.record_achievement(C.i8(C.ACH_BOOK));
    } else if(C.field(obj,"obj","oartifact").value) {
        if(C.is_quest_artifact(obj)) {
            if(C.field(C.field(C.u,"you","uhave").address,"u_have","questart").value) C.variadic(6,C.literal("already have quest artifact?"));
            (C.field(C.field(C.u,"you","uhave").address,"u_have","questart").value=C.u32(1));
            C.artitouch(obj);
        }
        C.set_artifact_intrinsic(obj,C.i8(1),4096n);
    }
    /* "special achievements"; revealed in end of game disclosure and
       dumplog, originally just recorded in XLOGFILE */
    if((Number(C.field((obj),"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_oid").value))) {
        C.record_achievement(C.i8(C.ACH_MINE_PRIZE));
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_oid").value=C.u32(0));
        /* done w/ luckstone o_id */
        (C.field(obj,"obj","nomerge").value=C.u32(0));
        /* was set in create_object(sp_lev.c) */
    } else if((Number(C.field((obj),"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_oid").value))) {
        C.record_achievement(C.i8(C.ACH_SOKO_PRIZE));
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_oid").value=C.u32(0));
        /* done w/ bag/amulet o_id */
        (C.field(obj,"obj","nomerge").value=C.u32(0));
        /* (got set in sp_lev.c) */
    }
}

/*
 * Adjust hero intrinsics (and perform other side effects) as if this
 * object was being added to the hero's inventory.  Called _after_ the
 * object has been added to the hero's inventory.
 *
 * This can be used either for updating intrinsics, or to allow the hero to
 * react to objects that are now in inventory.
 *
 * This is called when adding objects to the hero's inventory normally (via
 * addinv), when an object in the hero's inventory has been polymorphed
 * in-place, or when the hero re-examines objects that they picked up while
 * blind.
 *
 * This may occasionally be called on an item that was already in inventory,
 * so it should be written to work even if called multiple times in a row
 * (e.g. do not assume that the object was not in inventory already).
 */
export function addinv_core2(obj)
{
    obj=C.ptr(obj);
    if(C.confers_luck(obj)) {
        /* new luckstone must be in inventory by this point
           for correct calculation */
        C.set_moreluck();
    }
    /* Archeologists can decipher the writing on a scroll label to work out
       what they are (exception: unlabeled scrolls don't have a label to
       decipher) */
    if(Number(!!(Number(!!(Number(!!(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_ARCHEOLOGIST)))&&Number(C.i32(C.field(obj,"obj","oclass").value)==C.SCROLL_CLASS)))&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.SCR_BLANK_PAPER)))&&Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))&&Number(!(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))) {
        C.observe_object(obj);
        C.variadic(7,C.literal("You decipher the label on %s."),C.yname(obj));
        C.discover_object(C.i32((C.field(obj,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        /* conduct: this is avoidable via not picking up / wishing for
           scrolls */
        if(Number(!((()=>{const ref=C.field(C.field(C.u,"you","uconduct").address,"u_conduct","literate");const old=ref.value;ref.value=C.i64((old+1n));return old;})()))) C.variadic(8,32n,C.literal("became literate by deciphering a scroll label"));
    }
}

/*
 * Add obj to the hero's inventory.  Make sure the object is "free".
 * Adjust hero attributes as necessary.
 */
export function addinv_core0(obj,other_obj,update_perm_invent)
{
    obj=C.ptr(obj);
    other_obj=C.ptr(other_obj);
    update_perm_invent=C.i8(update_perm_invent);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["addinv_core0.otmp",8]]);
    try {
    let otmp=C.local("addinv_core0.otmp","struct obj *"); let prev;
    let saved_otyp=C.i32(C.field(obj,"obj","otyp").value);
    /* for panic */
    let obj_was_thrown;
    added: {
    if(Number(C.i32(C.field(obj,"obj","where").value)!=0)) C.variadic(9,C.literal("addinv: obj not free"));
    if(Number(C.i32(C.field(obj,"obj","how_lost").value)==4)) return (0);
    /* normally addtobill() clears no_charge when items in a shop are
       picked up, but won't do so if the shop has become untended */
    (C.field(obj,"obj","no_charge").value=C.u32(0));
    /* should not be set in hero's invent */
    if((Number(C.field((obj),"obj","cobj").value!=0))) C.picked_container(obj);
    /* clear no_charge */
    (obj_was_thrown=C.i8((Number(C.i32(C.field(obj,"obj","how_lost").value)==1))));
    (C.field(obj,"obj","how_lost").value=C.u32(0));
    if(C.field(C.gl,"instance_globals_l","loot_reset_justpicked").value) {
        (C.field(C.gl,"instance_globals_l","loot_reset_justpicked").value=(C.i8(0)));
        C.reset_justpicked(C.field(C.gi,"instance_globals_i","invent").value);
    }
    addinv_core1(obj);
    /* handle most side effects of carrying obj */
    /* for addinv_before(); if something has been removed and is now being
       reinserted, try to put it in the same place instead of merging or
       placing at end; for thrown-and-return weapon with !fixinv setting */
    if(other_obj) {
        for((otmp.value=C.field(C.gi,"instance_globals_i","invent").value);otmp.value;(otmp.value=C.field(otmp.value,"obj","nobj").value)) {
            if(Number(C.field(otmp.value,"obj","nobj").value==other_obj)) {
                (C.field(obj,"obj","nobj").value=other_obj);
                (C.field(otmp.value,"obj","nobj").value=obj);
                (C.field(obj,"obj","where").value=C.i8(3));
                break added; /* source goto added */
            }
        }
    }
    /* merge with quiver in preference to any other inventory slot
       in case quiver and wielded weapon are both eligible; adding
       extra to quivered stack is more useful than to wielded one */
    if(Number(!!(C.global("uquiver").value&&merged(C.global("uquiver").value,obj)))) {
        (obj=C.global("uquiver").value);
        if(Number(!(obj))) C.variadic(10,C.literal("addinv: null obj after quiver merge otyp=%d"),saved_otyp);
        break added; /* source goto added */
    }
    /* merge if possible; find end of chain in the process */
    for(((prev=0),(otmp.value=C.field(C.gi,"instance_globals_i","invent").value));otmp.value;((prev=otmp.value),(otmp.value=C.field(otmp.value,"obj","nobj").value))) if(merged(otmp.address,obj)) {
        (obj=otmp.value);
        if(Number(!(obj))) C.variadic(11,C.literal("addinv: null obj after merge otyp=%d"),saved_otyp);
        break added; /* source goto added */
    }

    /* didn't merge, so insert into chain */
    assigninvlet(obj);
    if(Number(!!(C.i32(C.field(C.flags,"flag","invlet_constant").value)||Number(!(prev))))) {
        (C.field(obj,"obj","nobj").value=C.field(C.gi,"instance_globals_i","invent").value);
        /* insert at beginning */
        (C.field(C.gi,"instance_globals_i","invent").value=obj);
        if(C.field(C.flags,"flag","invlet_constant").value) reorder_invent();
    } else {
        (C.field(prev,"obj","nobj").value=obj);
        /* insert at end */
        (C.field(obj,"obj","nobj").value=0);
    }
    (C.field(obj,"obj","where").value=C.i8(3));
    /* fill empty quiver if obj was thrown */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(obj_was_thrown)&&C.i32(C.field(C.flags,"flag","pickup_thrown").value)))&&Number(!(C.global("uquiver").value))))&&Number(C.i32(C.field(obj,"obj","oartifact").value)!=C.ART_MJOLLNIR)))&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.AKLYS)))&&(Number(!!(C.i32(C.throwing_weapon(obj))||(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW)))))))))))) C.setuqwep(obj);
    /* if Mjollnir is thrown and fails to return, we want to
           auto-pick it when we move to its spot, but not into quiver
           because it needs to be wielded to be re-thrown;
           aklys likewise because player using 'f' to throw it might
           not notice that it isn't wielded until it fails to return
           several times; we never auto-wield, just omit from quiver
           so that player will be prompted for what to throw and
           possibly realize that re-wielding is necessary */
    } /* source added: */
    (C.field(obj,"obj","pickup_prev").value=C.u32(1));
    addinv_core2(obj);
    /* handle extrinsics conferred by carrying obj */
    carry_obj_effects(obj);
    /* carrying affects the obj */
    if(update_perm_invent) update_inventory();
    return obj;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* add obj to the hero's inventory in the default fashion */
export function addinv(obj)
{
    obj=C.ptr(obj);
    return addinv_core0(obj,0,(C.i8(1)));
}

/* add obj to the hero's inventory by inserting in front of a specific item;
   used for throw-and-return in case '!fixinv' is in effect */
export function addinv_before(obj,other_obj)
{
    obj=C.ptr(obj);
    other_obj=C.ptr(other_obj);
    /* if 'other_obj' is present this will implicitly be 'nomerge' */
    return addinv_core0(obj,other_obj,(C.i8(1)));
}

/* return value will always be 'obj' */
export function addinv_nomerge(obj)
{
    obj=C.ptr(obj);
    let result;
    let save_nomerge=C.field(obj,"obj","nomerge").value;
    (C.field(obj,"obj","nomerge").value=C.u32(1));
    (result=addinv(obj));
    (C.field(obj,"obj","nomerge").value=save_nomerge);
    return result;
}

/*
 * Some objects are affected by being carried.
 * Make those adjustments here. Called _after_ the object
 * has been added to the hero's or monster's inventory,
 * and after hero's intrinsics have been updated.
 */
export function carry_obj_effects(obj)
{
    obj=C.ptr(obj);
    /* Cursed figurines can spontaneously transform when carried. */
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FIGURINE)) {
        if(Number(!!(Number(!!(C.i32(C.field(obj,"obj","cursed").value)&&Number(C.field(obj,"obj","corpsenm").value!=C.NON_PM)))&&Number(!(C.dead_species(C.field(obj,"obj","corpsenm").value,(C.i8(1)))))))) {
            C.attach_fig_transform_timeout(obj);
        }
    }
}

/* Add an item to the inventory unless we're fumbling or it refuses to be
 * held (via touch_artifact), and give a message.
 * If there aren't any free inventory slots, we'll drop it instead.
 * If both success and failure messages are NULL, then we're just doing the
 * fumbling/slot-limit checking for a silent grab.  In any case,
 * touch_artifact will print its own messages if they are warranted.
 */
export function hold_another_object(obj,drop_fmt,drop_arg,hold_msg)
{
    obj=C.ptr(obj);
    drop_fmt=C.ptr(drop_fmt);
    drop_arg=C.ptr(drop_arg);
    hold_msg=C.ptr(hold_msg);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["hold_another_object.buf",(1*256)]]);
    try {
    /* object to be held */
    /* format string for message if it can't be held */
    /* argument to use when formatting message */
    /* message to display if successfully held */
    let buf=C.automatic("hold_another_object.buf",(1*256));
    drop_it: {
    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.observe_object(obj);
    /* maximize mergeability */
    if(C.field(obj,"obj","oartifact").value) {
        /* place_object may change these */
        let crysknife=C.i8((Number(C.i32(C.field(obj,"obj","otyp").value)==C.CRYSKNIFE)));
        let oerode=C.i32(C.field(obj,"obj","oerodeproof").value);
        let wasUpolyd=C.i8((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value)));
        /* in case touching this object turns out to be fatal */
        C.place_object(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        if(Number(!(C.touch_artifact(obj,C.field(C.gy,"instance_globals_y","youmonst").address)))) {
            C.obj_extract_self(obj);
            /* remove it from the floor */
            C.dropy(obj);
            /* now put it back again :-) */
            return obj;
        } else if(Number(!!(C.i32(wasUpolyd)&&Number(!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))))))) {
            /* lose your grip if you revert your form */
            if(drop_fmt) C.variadic(12,drop_fmt,drop_arg);
            C.obj_extract_self(obj);
            C.dropy(obj);
            return obj;
        }
        C.obj_extract_self(obj);
        if(crysknife) {
            (C.field(obj,"obj","otyp").value=C.i16(C.CRYSKNIFE));
            (C.field(obj,"obj","oerodeproof").value=C.u32(oerode));
        }
    }
    if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","extrinsic").value)))) {
        (C.field(obj,"obj","nomerge").value=C.u32(1));
        /* dropping expects obj to be in invent; since it's going to be
           dropped, avoid perminv update when temporarily adding it */
        (obj=addinv_core0(obj,0,(C.i8(0))));
        break drop_it; /* source goto drop_it */
    } else if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&Number(!(C.u_safe_from_fatal_corpse(obj,C.st_all)))))&&C.field(obj,"obj","usecount").value))) {
        (C.field(obj,"obj","usecount").value=0);
        (obj=addinv_core0(obj,0,(C.i8(0))));
        break drop_it; /* source goto drop_it */
    } else {
        let oquan=C.field(obj,"obj","quan").value;
        let prev_encumbr=C.near_capacity();
        /* before addinv() */
        /* encumbrance limit is max( current_state, pickup_burden );
           this used to use hardcoded MOD_ENCUMBER (stressed) instead
           of the 'pickup_burden' option (which defaults to stressed) */
        if(Number(prev_encumbr<C.field(C.flags,"flag","pickup_burden").value)) (prev_encumbr=C.field(C.flags,"flag","pickup_burden").value);
        /* addinv() may redraw the entire inventory, overwriting
           drop_arg when it is kept in an 'obuf' from doname();
           [should no longer be necessary now that perm_invent update is
           suppressed, but it's cheap to keep as a paranoid precaution] */
        if(drop_arg) (drop_arg=C.strcpy(buf,drop_arg));
        (obj=addinv_core0(obj,0,(C.i8(0))));
        if(Number(!!(Number(C.inv_cnt((C.i8(0)))>C.invlet_basic)||(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)!=C.LOADSTONE)||Number(!(C.field(obj,"obj","cursed").value)))))&&Number(C.near_capacity()>prev_encumbr))))))) {
            /* undo any merge which took place */
            if(Number(C.field(obj,"obj","quan").value>oquan)) (obj=C.splitobj(obj,oquan));
            break drop_it; /* source goto drop_it */
        } else {
            if(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.flags,"flag","autoquiver").value)&&Number(!(C.global("uquiver").value))))&&Number(!(C.field(obj,"obj","owornmask").value))))&&(Number(!!(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_BOOMERANG)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_DART))))))||(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value))))))))))))||(Number(!!((Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_CROSSBOW)))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))&&(Number(!!((C.global("uswapwep").value)&&Number(C.i32(C.field((C.objects+Number(C.field((obj),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.i32((-C.i32(C.field((C.objects+Number(C.field((C.global("uswapwep").value),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)))))))))))))))) C.setuqwep(obj);
            if(Number(!!(hold_msg||drop_fmt))) prinv(hold_msg,obj,oquan);
            /* obj made it into inventory and is staying there */
            update_inventory();
            C.encumber_msg();
        }
    }
    return obj;
    } /* source drop_it: */
    if(drop_fmt) C.variadic(13,drop_fmt,drop_arg);
    (C.field(obj,"obj","nomerge").value=C.u32(0));
    if(Number(!!(C.i32(C.can_reach_floor((C.i8(1))))||C.i32(C.field(C.u,"you","uswallow").value)))) {
        C.dropx(obj);
    } else {
        freeinv(obj);
        C.hitfloor(obj,(C.i8(0)));
    }
    return 0;
    /* might be gone */
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* useup() all of an item regardless of its quantity */
export function useupall(obj)
{
    obj=C.ptr(obj);
    C.setnotworn(obj);
    freeinv(obj);
    C.obfree(obj,0);
    /* deletes contents also */
}

/* an item in inventory is going away after being used */
export function useup(obj)
{
    obj=C.ptr(obj);
    /* Note:  This works correctly for containers because they (containers)
       don't merge. */
    if(Number(C.field(obj,"obj","quan").value>1n)) {
        (C.field(obj,"obj","in_use").value=C.u32((C.i8(0))));
        /* no longer in use */
        (()=>{const ref=C.field(obj,"obj","quan");const old=ref.value;ref.value=C.i64((old-1n));return old;})();
        (C.field(obj,"obj","owt").value=C.u32(C.weight(obj)));
        update_inventory();
    } else {
        useupall(obj);
    }
}

/* use one charge from an item and possibly incur shop debt for it */
export function consume_obj_charge(obj,maybe_unpaid)
{
    obj=C.ptr(obj);
    maybe_unpaid=C.i8(maybe_unpaid);
    /* false if caller handles shop billing */
    if(maybe_unpaid) C.check_unpaid(obj);
    (C.field(obj,"obj","spe").value=C.i8(C.i32(C.field(obj,"obj","spe").value)-1));
    if(C.field(obj,"obj","known").value) update_inventory();
}

/*
 * Adjust hero's attributes as if this object was being removed from the
 * hero's inventory.  This should only be called from freeinv() and
 * where we are polymorphing an object already in the hero's inventory.
 *
 * Should think of a better name...
 */
export function freeinv_core(obj)
{
    obj=C.ptr(obj);
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        return;
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.AMULET_OF_YENDOR)) {
        if(Number(!(C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value))) C.variadic(14,C.literal("don't have amulet?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value=C.u32(0));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)) {
        if(Number(!(C.field(C.field(C.u,"you","uhave").address,"u_have","menorah").value))) C.variadic(15,C.literal("don't have candelabrum?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","menorah").value=C.u32(0));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BELL_OF_OPENING)) {
        if(Number(!(C.field(C.field(C.u,"you","uhave").address,"u_have","bell").value))) C.variadic(16,C.literal("don't have silver bell?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","bell").value=C.u32(0));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SPE_BOOK_OF_THE_DEAD)) {
        if(Number(!(C.field(C.field(C.u,"you","uhave").address,"u_have","book").value))) C.variadic(17,C.literal("don't have the book?"));
        (C.field(C.field(C.u,"you","uhave").address,"u_have","book").value=C.u32(0));
    } else if(C.field(obj,"obj","oartifact").value) {
        if(C.is_quest_artifact(obj)) {
            if(Number(!(C.field(C.field(C.u,"you","uhave").address,"u_have","questart").value))) C.variadic(18,C.literal("don't have quest artifact?"));
            (C.field(C.field(C.u,"you","uhave").address,"u_have","questart").value=C.u32(0));
        }
        C.set_artifact_intrinsic(obj,C.i8(0),4096n);
    }
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LOADSTONE)) {
        C.curse(obj);
    } else if(C.confers_luck(obj)) {
        C.set_moreluck();
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FIGURINE)&&C.i32(C.field(obj,"obj","timed").value)))) {
        C.stop_timer(C.i16(C.FIG_TRANSFORM),C.obj_to_any(obj));
    }
    if(Number(obj==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","tin").address,"tin_info","tin").value)) {
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","tin").address,"tin_info","tin").value=0);
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","tin").address,"tin_info","o_id").value=C.u32(0));
    }
}

/* remove an object from the hero's inventory */
export function freeinv(obj)
{
    obj=C.ptr(obj);
    C.extract_nobj(obj,C.field(C.gi,"instance_globals_i","invent").address);
    (C.field(obj,"obj","pickup_prev").value=C.u32(0));
    freeinv_core(obj);
    update_inventory();
}

/* drawbridge is destroying all objects at <x,y> */
export function delallobj(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let otmp; let otmp2;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=otmp2)) {
        if(Number(otmp==C.global("uball").value)) C.unpunish();
        /* after unpunish(), or might get deallocated chain */
        (otmp2=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value);
        if(Number(otmp==C.global("uchain").value)) continue;
        delobj(otmp);
    }
}

/* normal object deletion (if unpaid, it remains on the bill) */
export function delobj(obj)
{
    obj=C.ptr(obj);
    delobj_core(obj,(C.i8(0)));
}

/* destroy object; caller has control over whether to destroy something
   that ordinarily shouldn't be destroyed */
export function delobj_core(obj,force)
{
    obj=C.ptr(obj);
    force=C.i8(force);
    /* 'force==TRUE' used when reviving Rider corpses */
    let update_map;
    /* obj_resists(obj,0,0) protects the Amulet, the invocation tools,
       and Rider corpses */
    if(Number(!!(Number(!(force))&&C.i32(C.obj_resists(obj,0,0))))) {
        /* player might be doing something stupid, but we
         * can't guarantee that.  assume special artifacts
         * are indestructible via drawbridges, and exploding
         * chests, and golem creation, and ...
         */
        (C.field(obj,"obj","in_use").value=C.u32(0));
        /* in case caller has set this to 1 */
        return;
    }
    (update_map=C.i8((Number(C.i32(C.field(obj,"obj","where").value)==1))));
    C.obj_extract_self(obj);
    if(update_map) {
        /* floor object's coordinates are always up to date */
        C.maybe_unhide_at(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value);
        C.newsym(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value);
    }
    C.obfree(obj,0);
    /* frees contents also */
}

/* try to find a particular type of object at designated map location */
export function sobj_at(otyp,x,y)
{
    otyp=C.i32(otyp);
    x=C.i16(x);
    y=C.i16(y);
    let otmp;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(C.i32(C.field(otmp,"obj","otyp").value)==otyp)) break;

    return otmp;
}

/* sobj_at(&c) traversal -- find next object of specified type */
export function nxtobj(obj,type,by_nexthere)
{
    obj=C.ptr(obj);
    type=C.i32(type);
    by_nexthere=C.i8(by_nexthere);
    let otmp;
    (otmp=obj);
    /* start with the object after this one */
    do {
        (otmp=(Number(!(by_nexthere))?C.field(otmp,"obj","nobj").value:C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value));
        if(Number(!(otmp))) break;
    } while(Number(C.i32(C.field(otmp,"obj","otyp").value)!=type));
    return otmp;
}

/* return inventory object of type 'type' if hero has one, otherwise Null */
export function carrying(type)
{
    type=C.i32(type);
    let otmp;
    /* this could be replaced by 'return m_carrying(&gy.youmonst, type);' */
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","otyp").value)==type)) break;

    return otmp;
}

/* return inventory object of type that will petrify on touch */
export function carrying_stoning_corpse()
{
    let otmp;
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&(Number(!!(Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))))) break;

    return otmp;
}

/* Fictional and not-so-fictional currencies.
 * http://concord.wikia.com/wiki/List_of_Fictional_Currencies
 */
/* The Hitchhiker's Guide to the Galaxy */
/* Discworld */
/* The Domination of Draka */
/* Space Quest */
/* Starslip */
/* Deus Ex */
/* Battlestar Galactica */
/* The Hitchhiker's Guide to the Galaxy */
/* Jules Verne */
/* Star Wars */
/* The Moon is a Harsh Mistress */
/* Snow Crash */
/* System Shock 2 */
/* Star Trek, Sim City */
/* Sim City */
/* Spaceballs */
/* Spaceballs */
/* Spore */
/* The Hitchhiker's Guide to the Galaxy */
/* Cowboy Bebop */
/* Zork, NetHack */
export function currency(amount)
{
    amount=C.i64(amount);
    let res;
    (res=((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.cell((C.staticAddress("currencies")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("invent.c"),1550,(C.literal("currency"))),C.rn2(C.i32((C.u64((BigInt((8*21))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*21))/BigInt(8)))))))))*8),"char *").value:C.literal("zorkmid")));
    if(Number(amount!=1n)) (res=C.makeplural(res));
    return res;
}

export function u_carried_gloves()
{
    let otmp; let gloves=0;
    if(C.global("uarmg").value) {
        (gloves=C.global("uarmg").value);
    } else {
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.ARMOR_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.ARM_GLOVES))))) {
            (gloves=otmp);
            break;
        }

    }
    return gloves;
}

/* 3.6 tribute */
export function u_have_novel()
{
    let otmp;
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.SPE_NOVEL)) return otmp;

    return 0;
}

export function o_on(id,objchn)
{
    id=C.u32(id);
    objchn=C.ptr(objchn);
    let temp;
    while(objchn) {
        if(Number(C.field(objchn,"obj","o_id").value==id)) return objchn;
        if(Number(!!((Number(C.field((objchn),"obj","cobj").value!=0))&&((temp=o_on(id,C.field(objchn,"obj","cobj").value)))))) return temp;
        (objchn=C.field(objchn,"obj","nobj").value);
    }
    return 0;
}

export function obj_here(obj,x,y)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    let otmp;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(obj==otmp)) return (C.i8(1));

    return (C.i8(0));
}

export function g_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let obj=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value;
    while(obj) {
        if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) return obj;
        (obj=C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value);
    }
    return 0;
}

/* compact a string of inventory letters by dashing runs of letters */
export function compactify(buf)
{
    buf=C.ptr(buf);
    let i1=1; let i2=1;
    let ilet; let ilet1; let ilet2;
    (ilet2=C.cell((buf+Number(0)*1),"char").value);
    (ilet1=C.cell((buf+Number(1)*1),"char").value);
    (C.cell((buf+Number((()=>{const old=i2;i2=C.i32((old+1));return i2;})())*1),"char").value=C.cell((buf+Number((()=>{const old=i1;i1=C.i32((old+1));return i1;})())*1),"char").value);
    (ilet=C.cell((buf+Number(i1)*1),"char").value);
    while(ilet) {
        if(Number(C.i32(ilet)==C.i32((C.i32(ilet1)+1)))) {
            if(Number(C.i32(ilet1)==C.i32((C.i32(ilet2)+1)))) (C.cell((buf+Number(C.i32((i2-1)))*1),"char").value=(ilet1=C.i8(45)));
 else if(Number(C.i32(ilet2)==45)) {
                (C.cell((buf+Number(C.i32((i2-1)))*1),"char").value=(()=>{const old=ilet1;ilet1=C.i8((old+1));return ilet1;})());
                (C.cell((buf+Number(i2)*1),"char").value=C.cell((buf+Number((()=>{const old=i1;i1=C.i32((old+1));return i1;})())*1),"char").value);
                (ilet=C.cell((buf+Number(i1)*1),"char").value);
                continue;
            }
        } else if(Number(C.i32(ilet)==35)) {
            /* compact three or more consecutive '#'
               characters into "#-#" */
            if(Number(!!(Number(!!(Number(i2>=2)&&Number(C.i32(C.cell((buf+Number(C.i32((i2-2)))*1),"char").value)==35)))&&Number(C.i32(C.cell((buf+Number(C.i32((i2-1)))*1),"char").value)==35)))) (C.cell((buf+Number(C.i32((i2-1)))*1),"char").value=C.i8(45));
 else if(Number(!!(Number(!!(Number(!!(Number(i2>=3)&&Number(C.i32(C.cell((buf+Number(C.i32((i2-3)))*1),"char").value)==35)))&&Number(C.i32(C.cell((buf+Number(C.i32((i2-2)))*1),"char").value)==45)))&&Number(C.i32(C.cell((buf+Number(C.i32((i2-1)))*1),"char").value)==35)))) (()=>{const old=i2;i2=C.i32((old-1));return i2;})();
        }
        (ilet2=ilet1);
        (ilet1=ilet);
        (C.cell((buf+Number((()=>{const old=i2;i2=C.i32((old+1));return i2;})())*1),"char").value=C.cell((buf+Number((()=>{const old=i1;i1=C.i32((old+1));return i1;})())*1),"char").value);
        (ilet=C.cell((buf+Number(i1)*1),"char").value);
    }
}

/* some objects shouldn't be split when count given to getobj or askchain */
export function splittable(obj)
{
    obj=C.ptr(obj);
    return C.i8(Number(!((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LOADSTONE)&&C.i32(C.field(obj,"obj","cursed").value))))||(Number(!!(Number(obj==C.global("uwep").value)&&C.welded(C.global("uwep").value))))))))));
}

/* match the prompt for either 'T' or 'R' command */
export function taking_off(action)
{
    action=C.ptr(action);
    return C.i8(Number(!!(Number(!(C.strcmp(action,C.literal("take off"))))||Number(!(C.strcmp(action,C.literal("remove")))))));
}

export function mime_action(word)
{
    word=C.ptr(word);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["mime_action.buf",(1*256)]]);
    try {
    let buf=C.automatic("mime_action.buf",(1*256));
    let bp; let pfx; let sfx;
    C.strcpy(buf,word);
    (bp=(pfx=(sfx=0)));
    if(Number(((bp=C.strstr(buf,C.literal(" on the "))))!=0)) {
        /* rub on the stone[s] */
        (C.cell(bp,"char").value=C.i8(0));
        (sfx=((bp+Number(1)*1)));
        /* "something <sfx>" */
    }
    if(Number(!!((Number(!!(Number(!(C.strncmp(buf,C.literal("rub the "),C.u64(8))))&&C.strstr((buf+Number(8)*1),C.literal(" on")))))||(Number(!!(Number(!(C.strncmp(buf,C.literal("dip "),C.u64(4))))&&C.strstr((buf+Number(4)*1),C.literal(" into")))))))) {
        /* "rub the royal jelly on" -> "rubbing the royal jelly on", or
           "dip <foo> into" => "dipping <foo> into" */
        (C.cell((buf+Number(3)*1),"char").value=C.i8(0));
        (pfx=(buf+Number(C.i32((3+1)))*1));
        /* "<pfx> something" */
    }
    if(Number(((bp=C.strstr(buf,C.literal(" or "))))!=0)) {
        (C.cell(bp,"char").value=C.i8(0));
        (bp=((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("invent.c"),1700,(C.literal("mime_action"))),C.rn2(2))):C.rn2(2)))?buf:((bp+Number(4)*1)))));
    } else (bp=buf);
    C.variadic(19,C.literal("mime %s%s%s something%s%s."),C.ing_suffix(bp),(pfx?C.literal(" "):C.literal("")),(pfx?pfx:C.literal("")),(sfx?C.literal(" "):C.literal("")),(sfx?sfx:C.literal("")));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* getobj callback that allows any object - but not hands. */
export function any_obj_ok(obj)
{
    obj=C.ptr(obj);
    if(obj) return C.GETOBJ_SUGGEST;
    return C.GETOBJ_EXCLUDE;
}

/* return string describing your hands based on action. */
export function getobj_hands_txt(action,qbuf)
{
    action=C.ptr(action);
    qbuf=C.ptr(qbuf);
    if(Number(!(C.strcmp(action,C.literal("grease"))))) {
        C.variadic(20,qbuf,C.literal("your %s"),C.fingers_or_gloves((C.i8(0))));
    } else if(Number(!(C.strcmp(action,C.literal("write with"))))) {
        C.variadic(21,qbuf,C.literal("your %s"),C.body_part(C.FINGERTIP));
    } else if(Number(!(C.strcmp(action,C.literal("wield"))))) {
        C.variadic(22,qbuf,C.literal("your %s %s%s"),(C.global("uarmg").value?C.literal("gloved"):C.literal("bare")),C.makeplural(C.body_part(C.HAND)),(Number(!(C.global("uwep").value))?C.literal(" (wielded)"):C.literal("")));
    } else if(Number(!(C.strcmp(action,C.literal("ready"))))) {
        C.variadic(23,qbuf,C.literal("empty quiver%s"),(Number(!(C.global("uquiver").value))?C.literal(" (nothing readied)"):C.literal("")));
    } else {
        C.variadic(24,qbuf,C.literal("your %s"),C.makeplural(C.body_part(C.HAND)));
    }
    return qbuf;
}

/*
 * getobj returns:
 *      struct obj *xxx:        object to do something with.
 *      (struct obj *) 0        error return: no object.
 *      &hands_obj              explicitly no object (as in w-).
 * The obj_ok callback should not have side effects (apart from
 * abnormal-behavior things like impossible calls); it can be called multiple
 * times on the same object during the execution of this function.
 * Callbacks' argument is either a valid object pointer or a null pointer,
 * which represents the validity of doing that action on HANDS_SYM. getobj
 * won't call it with &hands_obj, so its behavior can be undefined in that
 * case.
 */
export function getobj(word,obj_ok,ctrlflags)
{
    word=C.ptr(word);
    obj_ok=C.ptr(obj_ok);
    ctrlflags=C.u32(ctrlflags);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["getobj.buf",(1*256)],["getobj.qbuf",(1*128)],["getobj.lets",(1*256)],["getobj.altlets",(1*256)],["getobj.sortedinvent",8],["getobj.cq",C.sizes["struct _cmd_queue"]],["getobj.tmpcnt",8],["getobj.ctmp",8],["getobj.menuquery",(1*128)]]);
    try {
    /* usually a direct verb such as "drop" */
    /* callback to classify an object's suitability */
    /* some control to fine-tune the behavior */
    let otmp;
    let ilet=C.i8(0);
    let buf=C.automatic("getobj.buf",(1*256)); let qbuf=C.automatic("getobj.qbuf",(1*128));
    let lets=C.automatic("getobj.lets",(1*256)); let altlets=C.automatic("getobj.altlets",(1*256));
    let suggested=0;
    let bp=buf; let ap=altlets;
    let allowcnt=C.i8((C.u32((ctrlflags&C.u32(1))))); let forceprompt=C.i8((C.u32((ctrlflags&C.u32(2))))); let allownone=(C.i8(0));
    let inaccess=0;
    /* counts GETOBJ_EXCLUDE_INACCESS items to decide
                       * between "you don't have anything to <foo>"
                       * versus "you don't have anything _else_ to <foo>"
                       * (also used for GETOBJ_EXCLUDE_NONINVENT) */
    let cnt=0n;
    let cntgiven=(C.i8(0));
    let msggiven=(C.i8(0));
    let oneloop=(C.i8(0));
    let sortedinvent=C.local("getobj.sortedinvent","struct sortloot_item *"); let srtinv;
    let cq=C.automatic("getobj.cq",C.sizes["struct _cmd_queue"]); let cmdq;
    let need_more_cq=(C.i8(0));
    split_otmp: {
    need_more_cq: for(;;) {
        if(Number(((cmdq=C.cmdq_pop()))!=0)) {
            C.copy(cq,cmdq,C.sizes["struct _cmd_queue"]);
            C.free(cmdq);
            /* user-input means pick something interactively now, with more
           in the command queue for after that; if not user-input, it
           has to be a key here */
            if(Number(C.field(cq,"_cmd_queue","typ").value!=C.CMDQ_USER_INPUT)) {
                (otmp=0);
                /* in case of non-key or lookup failure */
                if(Number(C.field(cq,"_cmd_queue","typ").value==C.CMDQ_KEY)) {
                    let v;
                    if(Number(C.i32(C.field(cq,"_cmd_queue","key").value)==45)) {
                        /* check whether the hands/self choice is suitable */
                        (v=C.callback(1,(obj_ok),0));
                        if(Number(!!(Number(v==C.GETOBJ_SUGGEST)||Number(v==C.GETOBJ_DOWNPLAY)))) (otmp=C.hands_obj);
                    } else {
                        /* there could be more than one match if key is '#';
                       take first one which passes the obj_ok callback */
                        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","invlet").value)==C.i32(C.field(cq,"_cmd_queue","key").value))) {
                            (v=C.callback(2,(obj_ok),otmp));
                            if(Number(!!(Number(v==C.GETOBJ_SUGGEST)||Number(v==C.GETOBJ_DOWNPLAY)))) break;
                        }

                    }
                } else if(Number(C.field(cq,"_cmd_queue","typ").value==C.CMDQ_INT)) {
                    /* getting a partial stack */
                    if(Number(!!(Number(!(cntgiven))&&C.i32(allowcnt)))) {
                        (cnt=C.i64(C.field(cq,"_cmd_queue","intval").value));
                        (cntgiven=(C.i8(1)));
                        continue need_more_cq; /* source goto need_more_cq */
                        /* now, get CMDQ_KEY */
                    } else {
                        C.cmdq_clear(C.CQ_CANNED);
                        /* should maybe clear the CQ_REPEAT too? */
                        return 0;
                    }
                }
                if(Number(!(otmp))) {
                    /* didn't find what we were looking for, */
                    C.cmdq_clear(C.CQ_CANNED);
                    /* so discard any other queued cmnds */
                } else if(cntgiven) {
                    /* if stack is smaller than count, drop the whole stack */
                    if(Number(!!(Number(cnt<1n)||Number(C.field(otmp,"obj","quan").value<=cnt)))) (cntgiven=(C.i8(0)));
                    break split_otmp; /* source goto split_otmp */
                }
                return otmp;
            }
            /* !CMDQ_USER_INPUT */
        } else if(need_more_cq) {
            return 0;
        }
        break;
    }
    /* is "hands"/"self" a valid thing to do this action on? */
    switch(C.callback(3,(obj_ok),0)) {
        case (C.GETOBJ_SUGGEST):
            /* treat as likely candidate */
            (allownone=(C.i8(1)));
        (C.cell((()=>{const old=bp;bp=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(45));
        (C.cell((()=>{const old=bp;bp=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(32));
        /* put a space after the '-' in the prompt */
        break;
        case (C.GETOBJ_DOWNPLAY):
            /* acceptable but not shown as likely choice */
            case (C.GETOBJ_EXCLUDE_INACCESS):
                /* nothing currently gives this for '-'
                                     * but theoretically could if wearing
                                     * gloves */
                case (C.GETOBJ_EXCLUDE_SELECTABLE):
                    /* ditto, I think... */
                    (allownone=(C.i8(1)));
        (C.cell((()=>{const old=ap;ap=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(45));
        break;
        case (C.GETOBJ_EXCLUDE_NONINVENT):
            /* player skipped some alternative that's
                                    * not in inventory, now the hands/self
                                    * possibility is telling us so */
            (forceprompt=(C.i8(0)));
        (()=>{const old=inaccess;inaccess=C.i32((old+1));return old;})();
        break;
        default:
            break;
    }
    if(Number(!(C.field(C.flags,"flag","invlet_constant").value))) reassign();
    /* force invent to be in invlet order before collecting candidate
       inventory letters */
    (sortedinvent.value=sortloot(C.field(C.gi,"instance_globals_i","invent").address,C.u32(2),(C.i8(0)),0));
    for((srtinv=sortedinvent.value);Number(((otmp=C.field(srtinv,"sortloot_item","obj").value))!=0);(()=>{const old=srtinv;srtinv=C.ptr((old+Number(C.sizes["struct sortloot_item"])));return srtinv;})()) {
        if(Number(!!(Number((bp+Number(suggested)*1)==(buf+Number(C.u64((BigInt((1*256))-C.u64(1))))*1))||Number(ap==(altlets+Number(C.u64((BigInt((1*256))-C.u64(1))))*1))))) {
            /* we must have a huge number of noinvsym items somehow */
            C.variadic(25,C.literal("getobj: inventory overflow"));
            break;
        }
        (C.cell((bp+Number((()=>{const old=suggested;suggested=C.i32((old+1));return old;})())*1),"char").value=C.field(otmp,"obj","invlet").value);
        switch(C.callback(4,(obj_ok),otmp)) {
            case (C.GETOBJ_EXCLUDE_INACCESS):
                /* remove inaccessible things */
                (()=>{const old=suggested;suggested=C.i32((old-1));return old;})();
            (()=>{const old=inaccess;inaccess=C.i32((old+1));return old;})();
            break;
            case (C.GETOBJ_EXCLUDE):
                case (C.GETOBJ_EXCLUDE_SELECTABLE):
                    /* remove more inappropriate things, but unlike the first it won't
               trigger an "else" in "you don't have anything else to ___" */
                    (()=>{const old=suggested;suggested=C.i32((old-1));return old;})();
            break;
            case (C.GETOBJ_DOWNPLAY):
                /* acceptable but not listed as likely candidates in the prompt
               or in the inventory subset if player responds with '?' - thus,
               don't add it to lets with bp, but add it to altlets with ap */
                (()=>{const old=suggested;suggested=C.i32((old-1));return old;})();
            (forceprompt=(C.i8(1)));
            (C.cell((()=>{const old=ap;ap=C.ptr((old+Number(1)));return old;})(),"char").value=C.field(otmp,"obj","invlet").value);
            break;
            case (C.GETOBJ_SUGGEST):
                break;
            /* adding otmp->invlet is all that's needed */
            case (C.GETOBJ_EXCLUDE_NONINVENT):
                /* not applicable for invent items */
                default:
                    C.variadic(26,C.literal("bad return from getobj callback"));
        }
    }
    unsortloot(sortedinvent.address);
    (C.cell((bp+Number(suggested)*1),"char").value=C.i8(0));
    /* If no objects were suggested but we added '- ' at the beginning for
     * hands, destroy the trailing space */
    if(Number(!!(Number(!!(Number(suggested==0)&&Number(bp>buf)))&&Number(C.i32(C.cell((bp+Number(C.i32((-1)))*1),"char").value)==32)))) (C.cell((()=>{const old=bp;bp=C.ptr((old-Number(1)));return bp;})(),"char").value=C.i8(0));
    C.strcpy(lets,bp);
    /* necessary since we destroy buf */
    if(Number(suggested>5)) compactify(bp);
    /* compactify string */
    (C.cell(ap,"char").value=C.i8(0));
    if(Number(!!(Number(!!(Number(suggested==0)&&Number(!(forceprompt))))&&Number(!(allownone))))) {
        C.variadic(27,C.literal("don't have anything %sto %s."),(inaccess?C.literal("else "):C.literal("")),word);
        return 0;
    }
    getobj_input: for(;;) {
        (cnt=0n);
        (cntgiven=(C.i8(0)));
        C.variadic(28,qbuf,C.literal("What do you want to %s?"),word);
        if(C.field(C.gi,"instance_globals_i","in_doagain").value) {
            (ilet=C.readchar());
        } else if(C.field(C.iflags,"instance_flags","force_invmenu").value) {
            /* don't overwrite a possible quitchars */
            if(Number(!(oneloop))) (ilet=C.i8(((Number(!!(C.i32(C.cell(lets,"char").value)||C.i32(C.cell(altlets,"char").value))))?63:42)));
            if(Number(!(msggiven))) C.callback(5,(C.field(C.windowprocs,"window_procs","win_putmsghistory").value),qbuf,(C.i8(0)));
            (msggiven=(C.i8(1)));
            (oneloop=(C.i8(1)));
        } else {
            if(Number(!(C.cell((buf+Number(0)*1),"char").value))) C.strcat(qbuf,C.literal(" [*]"));
 else C.variadic(29,C.eos(qbuf),C.literal(" [%s or ?*]"),buf);
            (ilet=C.yn_function(qbuf,0,C.i8(0),(C.i8(0))));
        }
        if(C.digit(ilet)) {
            let tmpcnt=C.local("getobj.tmpcnt","long",0n);
            if(Number(!(allowcnt))) {
                C.variadic(30,C.literal("No count allowed with this command."));
                continue;
            }
            (ilet=C.get_count(0,ilet,C.i64(32767),tmpcnt.address,C.u32(1)));
            if(tmpcnt.value) {
                (cnt=tmpcnt.value);
                (cntgiven=(C.i8(1)));
            }
        }
        if(C.strchr(C.quitchars,C.i32(ilet))) {
            if(C.field(C.flags,"flag","verbose").value) C.variadic(31,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
            return 0;
        }
        if(Number(C.i32(ilet)==45)) {
            /* '-' */
            if(Number(!(allownone))) mime_action(word);
            return ((C.i32(allownone)?C.hands_obj:0));
        }
        redo_menu: for(;;) {
            /* since gold is now kept in inventory, we need to do processing for
           select-from-invent before checking whether gold has been picked */
            if(Number(!!(Number(C.i32(ilet)==63)||Number(C.i32(ilet)==42)))) {
                let allowed_choices=((Number(C.i32(ilet)==63))?lets:0);
                let ctmp=C.local("getobj.ctmp","long",0n);
                let menuquery=C.automatic("getobj.menuquery",(1*128));
                let handsbuf=0;
                if(Number(!!(Number(!!(Number(C.i32(ilet)==63)&&Number(!(C.cell(lets,"char").value))))&&C.i32(C.cell(altlets,"char").value)))) (allowed_choices=altlets);
                (C.cell((menuquery+Number(0)*1),"char").value=(C.cell((qbuf+Number(0)*1),"char").value=C.i8(0)));
                if(C.field(C.iflags,"instance_flags","force_invmenu").value) C.variadic(32,(C.literal("getobj")),1975,menuquery,BigInt((1*128)),C.literal("What do you want to %s?"),word);
                if(Number(!!(Number(!!(Number(!(allowed_choices))||Number(C.i32(C.cell(allowed_choices,"char").value)==45)))||Number(C.i32(C.cell(buf,"char").value)==45)))) (handsbuf=getobj_hands_txt(word,qbuf));
                (ilet=display_pickinv(allowed_choices,handsbuf,menuquery,allownone,(C.i8(1)),(C.i32(allowcnt)?ctmp.address:0)));
                if(Number(!(ilet))) {
                    if(oneloop) return 0;
                    continue getobj_input;
                }
                if(Number(C.i32(ilet)==45)) return C.hands_obj;
                if(Number(C.i32(ilet)==27)) {
                    if(C.field(C.flags,"flag","verbose").value) C.variadic(33,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
                    return 0;
                }
                if(Number(!!(Number(C.i32(ilet)==42)||Number(C.i32(ilet)==63)))) continue redo_menu; /* source goto redo_menu */
                if(Number(!!(C.i32(allowcnt)&&Number(ctmp.value>=0n)))) {
                    (cnt=ctmp.value);
                    (cntgiven=(C.i8(1)));
                }
                /* they typed a letter (not a space) at the prompt */
            }
            break;
        }
        /* find the item which was picked */
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","invlet").value)==C.i32(ilet))) break;

        /* some items have restrictions */
        if(Number(!!(Number(C.i32(ilet)==C.GOLD_SYM)||(Number(!!(otmp&&Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS))))))) {
            /* guard against the [hypothetical] chance of having more
               than one invent slot of gold and picking the non-'$' one */
            if(Number(!!(otmp&&Number(C.callback(6,obj_ok,otmp)<=C.GETOBJ_EXCLUDE)))) {
                C.variadic(34,C.literal("cannot %s gold."),word);
                return 0;
            }
            /*
             * Historical note: early Nethack had a bug which was
             * first reported for Larn, where trying to drop 2^32-n
             * gold pieces was allowed, and did interesting things to
             * your money supply.  The LRS is the tax bureau from Larn.
             */
            if(Number(!!(C.i32(cntgiven)&&Number(cnt<=0n)))) {
                if(Number(cnt<0n)) C.variadic(35,C.literal("LRS would be very interested to know you have that much."));
                return 0;
            }
        }
        if(Number(!!(C.i32(cntgiven)&&Number(!(C.strcmp(word,C.literal("throw"))))))) {
            
            let coins;
            /* permit counts for throwing gold, but don't accept counts
               for other things since the throw code will split off a
               single item anyway; if populating quiver, 'word' will be
               "ready" or "fire" and this restriction doesn't apply */
            if(Number(!!(Number(cnt==0n)||Number(!(otmp))))) return 0;
            (coins=C.i8((Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS))));
            if(Number(!!(Number(cnt>1n)&&(Number(!!(Number(!(coins))||Number(cnt>C.field(otmp,"obj","quan").value))))))) {
                if(Number(cnt>C.field(otmp,"obj","quan").value)) C.variadic(36,C.literal("only have %ld%s%s."),C.field(otmp,"obj","quan").value,((Number(!!(Number(!(coins))&&Number(C.field(otmp,"obj","quan").value>1n))))?C.literal(" and "):C.literal("")),((Number(!!(Number(!(coins))&&Number(C.field(otmp,"obj","quan").value>1n))))?C.staticAddress("getobj.only_one"):C.literal("")));
 else C.variadic(37,C.literal("%s."),C.staticAddress("getobj.only_one"));
                continue;
            }
        }
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        /* May have changed the amount of money */
        if(Number(!!(otmp&&Number(!(C.field(C.gi,"instance_globals_i","in_doagain").value))))) {
            if(Number(!!(C.i32(cntgiven)&&Number(cnt>0n)))) C.cmdq_add_int(C.CQ_REPEAT,C.i32(cnt));
            C.cmdq_add_key(C.CQ_REPEAT,ilet);
        }
        /* [we used to set otmp (by finding ilet in invent) here, but
           that's been moved above so that otmp can be checked earlier] */
        /* verify the chosen object */
        if(Number(!(otmp))) {
            C.variadic(38,C.literal("don't have that object."));
            if(C.field(C.gi,"instance_globals_i","in_doagain").value) return 0;
            continue;
        } else if(Number(!!(Number(cnt<0n)||Number(C.field(otmp,"obj","quan").value<cnt)))) {
            C.variadic(39,C.literal("don't have that many!  You have only %ld."),C.field(otmp,"obj","quan").value);
            if(C.field(C.gi,"instance_globals_i","in_doagain").value) return 0;
            continue;
        }
        break;
    }
    if(Number(C.callback(7,obj_ok,otmp)==C.GETOBJ_EXCLUDE)) {
        silly_thing(word,otmp);
        return 0;
    }
    } /* source split_otmp: */
    if(cntgiven) {
        if(Number(cnt==0n)) return 0;
        if(Number(cnt!=C.field(otmp,"obj","quan").value)) {
            /* don't split a stack of cursed loadstones */
            if(splittable(otmp)) (otmp=C.splitobj(otmp,cnt));
 else if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.LOADSTONE)&&C.i32(C.field(otmp,"obj","cursed").value)))) (C.field(otmp,"obj","corpsenm").value=C.i32(cnt));
            /* kludge for canletgo()'s can't-drop-this message */
        }
    }
    return otmp;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function silly_thing(word,otmp)
{
    word=C.ptr(word);
    otmp=C.ptr(otmp);
    /* 'P','R' vs 'W','T' handling is obsolete */
    /* check for attempted use of accessory commands ('P','R') on armor
       and for corresponding armor commands ('W','T') on accessories */
    /* see comment about Amulet of Yendor in objtyp_is_callable(do_name.c);
       known fakes yield the silly thing feedback */
    if(Number(!!(Number(!(C.strcmp(word,C.literal("call"))))&&(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AMULET_OF_YENDOR)||(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FAKE_AMULET_OF_YENDOR)&&Number(!(C.field(otmp,"obj","known").value))))))))))) C.variadic(40,C.literal("Amulet doesn't like being called names."));
 else C.variadic(41,C.field(C.c_common_strings,"c_common_strings","c_silly_thing_to").value,word);
}

export function ckvalidcat(otmp)
{
    otmp=C.ptr(otmp);
    /* use allow_category() from pickup.c */
    return C.i32(C.allow_category(otmp));
}

export function ckunpaid(otmp)
{
    otmp=C.ptr(otmp);
    return (Number(!!(C.i32(C.field(otmp,"obj","unpaid").value)||(Number(!!((Number(C.field((otmp),"obj","cobj").value!=0))&&count_unpaid(C.field(otmp,"obj","cobj").value)))))));
}

export function wearing_armor()
{
    return C.i8((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.global("uarm").value||C.global("uarmc").value))||C.global("uarmf").value))||C.global("uarmg").value))||C.global("uarmh").value))||C.global("uarms").value))||C.global("uarmu").value))));
}

export function is_worn(otmp)
{
    otmp=C.ptr(otmp);
    return C.i8(((C.i64((C.field(otmp,"obj","owornmask").value&(C.i64((C.i64((C.i64(((C.i64((C.i64((C.i64((C.i64((C.i64((C.i64((1n|2n))|4n))|8n))|16n))|32n))|64n)))|(C.i64((C.i64(((C.i64((131072n|262144n)))|65536n))|524288n)))))|1048576n))|(C.i64((C.i64((256n|1024n))|512n)))))))))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/* is 'obj' being used by the hero?  worn, wielded, active lamp or leash;
   not to be confused with obj->in_use, which finishes using up an item
   (destroys it) if restoring a save file finds that bit set */
export function is_inuse(obj)
{
    obj=C.ptr(obj);
    return C.i8((Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))&&(Number(!!(C.i32(is_worn(obj))||C.i32(tool_being_used(obj)))))))));
}

/* extra xprname() input that askchain() can't pass through safe_qbuf() */
/* safe_qbuf() -> short_oname() callback */
export function safeq_xprname(obj)
{
    obj=C.ptr(obj);
    return xprname(obj,0,C.field(C.staticAddress("safeq_xprn_ctx"),"xprnctx","let").value,C.field(C.staticAddress("safeq_xprn_ctx"),"xprnctx","dot").value,0n,0n);
}

/* alternate safe_qbuf() -> short_oname() callback */
export function safeq_shortxprname(obj)
{
    obj=C.ptr(obj);
    return xprname(obj,C.ansimpleoname(obj),C.field(C.staticAddress("safeq_xprn_ctx"),"xprnctx","let").value,C.field(C.staticAddress("safeq_xprn_ctx"),"xprnctx","dot").value,0n,0n);
}

/* Interactive version of getobj - used for Drop, Identify, and Takeoff (A).
   Return the number of times fn was called successfully.
   If combo is TRUE, we just use this to get a category list. */
export function ggetobj(word,fn,mx,combo,resultflags)
{
    word=C.ptr(word);
    fn=C.ptr(fn);
    mx=C.i32(mx);
    combo=C.i8(combo);
    resultflags=C.ptr(resultflags);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["ggetobj.itemcount",4],["ggetobj.olets",(1*24)],["ggetobj.ilets",(1*29)],["ggetobj.extra_removeables",(1*4)],["ggetobj.buf",(1*256)],["ggetobj.qbuf",(1*128)],["ggetobj.ailets",(1*60)]]);
    try {
    /* combination menu flag */
    let ckfn=0;
    let ofilter=0;
    let takeoff; let ident; let allflag; let m_seen;
    let itemcount=C.local("ggetobj.itemcount","int");
    let oletct; let iletct; let unpaid; let oc_of_sym;
    let sym; let ip; let olets=C.automatic("ggetobj.olets",(1*24)); let ilets=C.automatic("ggetobj.ilets",(1*29));
    let extra_removeables=C.automatic("ggetobj.extra_removeables",(1*4));
    /* uwep,uswapwep,uquiver */
    let buf=C.automatic("ggetobj.buf",(1*256)); C.zero(buf,(1*256)); C.initialize(buf,"char[256]",[C.i8(0)]); let qbuf=C.automatic("ggetobj.qbuf",(1*128));
    if(Number(!(C.field(C.gi,"instance_globals_i","invent").value))) {
        C.variadic(42,C.literal("have nothing to %s."),word);
        if(resultflags) (C.cell(resultflags,"unsigned int").value=C.u32(1));
        return 0;
    }
    if(resultflags) (C.cell(resultflags,"unsigned int").value=C.u32(0));
    (takeoff=(ident=(allflag=(m_seen=(C.i8(0))))));
    C.add_valid_menu_class(0);
    /* reset */
    if(taking_off(word)) {
        (takeoff=(C.i8(1)));
        (ofilter=C.functionAddress("is_worn"));
    } else if(Number(!(C.strcmp(word,C.literal("identify"))))) {
        (ident=(C.i8(1)));
        (ofilter=C.functionAddress("not_fully_identified"));
    }
    (iletct=C.collect_obj_classes(ilets,C.field(C.gi,"instance_globals_i","invent").value,(C.i8(0)),ofilter,itemcount.address));
    (unpaid=count_unpaid(C.field(C.gi,"instance_globals_i","invent").value));
    if(Number(!!(C.i32(ident)&&Number(!(iletct))))) {
        return C.i32((-1));
        /* no further identifications */
    } else if(C.field(C.gi,"instance_globals_i","invent").value) {
        (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(32));
        if(unpaid) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(117));
        if(count_buc(C.field(C.gi,"instance_globals_i","invent").value,256,ofilter)) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(66));
        if(count_buc(C.field(C.gi,"instance_globals_i","invent").value,1024,ofilter)) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(85));
        if(count_buc(C.field(C.gi,"instance_globals_i","invent").value,512,ofilter)) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(67));
        if(count_buc(C.field(C.gi,"instance_globals_i","invent").value,2048,ofilter)) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(88));
        if(C.count_justpicked(C.field(C.gi,"instance_globals_i","invent").value)) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(80));
        (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(97));
    }
    (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(105));
    if(Number(!(combo))) (C.cell((ilets+Number((()=>{const old=iletct;iletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(109));
    /* allow menu presentation on request */
    (C.cell((ilets+Number(iletct)*1),"char").value=C.i8(0));
    for(;;) {
        C.variadic(43,qbuf,C.literal("What kinds of thing do you want to %s? [%s]"),word,ilets);
        C.getlin(qbuf,buf);
        if(Number(C.i32(C.cell((buf+Number(0)*1),"char").value)==27)) return 0;
        if(C.strchr(buf,105)) {
            let ailets=C.automatic("ggetobj.ailets",(1*60));
            /* $ + a-z + A-Z + # + slop + \0 */
            let otmp; let nextobj;
            /* applicable inventory letters; if empty, show entire invent */
            (C.cell((ailets+Number(0)*1),"char").value=C.i8(0));
            if(ofilter) for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=nextobj)) {
                (nextobj=C.field(otmp,"obj","nobj").value);
                /* strchr() check: limit overflow items to one '#' */
                if(Number(!!(C.i32(C.callback(8,(ofilter),otmp))&&Number(!(C.strchr(ailets,C.i32(C.field(otmp,"obj","invlet").value))))))) C.strkitten(ailets,C.field(otmp,"obj","invlet").value);
            }
            if(Number(C.i32(display_inventory(ailets,(C.i8(1))))==27)) return 0;
        } else break;
    }
    (C.cell((extra_removeables+Number(0)*1),"char").value=C.i8(0));
    if(takeoff) {
        /* arbitrary types of items can be placed in the weapon slots
           [any duplicate entries in extra_removeables[] won't matter] */
        if(C.global("uwep").value) C.strkitten(extra_removeables,C.field(C.global("uwep").value,"obj","oclass").value);
        if(C.global("uswapwep").value) C.strkitten(extra_removeables,C.field(C.global("uswapwep").value,"obj","oclass").value);
        if(C.global("uquiver").value) C.strkitten(extra_removeables,C.field(C.global("uquiver").value,"obj","oclass").value);
    }
    (ip=buf);
    (C.cell((olets+Number((oletct=0))*1),"char").value=C.i8(0));
    while(Number(C.i32(((sym=C.cell((()=>{const old=ip;ip=C.ptr((old+Number(1)));return old;})(),"char").value)))!=0)) {
        if(Number(C.i32(sym)==32)) continue;
        (oc_of_sym=C.def_char_to_objclass(sym));
        if(Number(!!(C.i32(takeoff)&&Number(oc_of_sym!=C.MAXOCLASSES)))) {
            if(C.strchr(extra_removeables,oc_of_sym)) {
                ;
                /* skip rest of takeoff checks */
            } else if(Number(!(C.strchr(C.staticAddress("removeables"),oc_of_sym)))) {
                C.variadic(44,C.literal("Not applicable."));
                return 0;
            } else if(Number(!!(Number(oc_of_sym==C.ARMOR_CLASS)&&Number(!(wearing_armor()))))) {
                noarmor((C.i8(0)));
                return 0;
            } else if(Number(!!(Number(!!(Number(!!(Number(oc_of_sym==C.WEAPON_CLASS)&&Number(!(C.global("uwep").value))))&&Number(!(C.global("uswapwep").value))))&&Number(!(C.global("uquiver").value))))) {
                C.variadic(45,C.literal("are not wielding anything."));
                return 0;
            } else if(Number(!!(Number(!!(Number(oc_of_sym==C.RING_CLASS)&&Number(!(C.global("uright").value))))&&Number(!(C.global("uleft").value))))) {
                C.variadic(46,C.literal("are not wearing rings."));
                return 0;
            } else if(Number(!!(Number(oc_of_sym==C.AMULET_CLASS)&&Number(!(C.global("uamul").value))))) {
                C.variadic(47,C.literal("are not wearing an amulet."));
                return 0;
            } else if(Number(!!(Number(oc_of_sym==C.TOOL_CLASS)&&Number(!(C.global("ublindf").value))))) {
                C.variadic(48,C.literal("are not wearing a blindfold."));
                return 0;
            }
        }
        if(Number(C.i32(sym)==97)) {
            (allflag=(C.i8(1)));
        } else if(Number(C.i32(sym)==65)) {
            ;
            /* same as the default */
        } else if(Number(C.i32(sym)==117)) {
            C.add_valid_menu_class(117);
            (ckfn=C.functionAddress("ckunpaid"));
        } else if(C.strchr(C.literal("BUCXP"),C.i32(sym))) {
            C.add_valid_menu_class(C.i32(sym));
            /* 'B','U','C','X', or 'P' */
            (ckfn=C.functionAddress("ckvalidcat"));
        } else if(Number(C.i32(sym)==109)) {
            (m_seen=(C.i8(1)));
        } else if(Number(oc_of_sym==C.MAXOCLASSES)) {
            C.variadic(49,C.literal("don't have any %c's."),C.i32(sym));
        } else {
            if(Number(!(C.strchr(olets,oc_of_sym)))) {
                C.add_valid_menu_class(oc_of_sym);
                (C.cell((olets+Number((()=>{const old=oletct;oletct=C.i32((old+1));return old;})())*1),"char").value=C.i8(oc_of_sym));
                (C.cell((olets+Number(oletct)*1),"char").value=C.i8(0));
            }
        }
    }
    if(m_seen) {
        return ((Number(!!(C.i32(allflag)||(Number(!!(Number(!!(Number(!(oletct))&&Number(ckfn!=C.functionAddress("ckunpaid"))))&&Number(ckfn!=C.functionAddress("ckvalidcat"))))))))?C.i32((-2)):C.i32((-3)));
    } else if(Number(!!(Number(!!(Number(C.i32(C.field(C.flags,"flag","menu_style").value)!=0)&&C.i32(combo)))&&Number(!(allflag))))) {
        return 0;
    } else {
        let cnt=askchain(C.field(C.gi,"instance_globals_i","invent").address,olets,C.i32(allflag),fn,ckfn,mx,word);
        /*
         * askchain() has already finished the job in this case
         * so set a special flag to convey that back to the caller
         * so that it won't continue processing.
         * Fix for bug C331-1 reported by Irina Rempt-Drijfhout.
         */
        if(Number(!!(Number(!!(C.i32(combo)&&C.i32(allflag)))&&resultflags))) (C.cell(resultflags,"unsigned int").value=C.u32(C.cell(resultflags,"unsigned int").value|C.u32(1)));
        return cnt;
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 * Walk through the chain starting at objchn and ask for all objects
 * with olet in olets (if nonNULL) and satisfying ckfn (if nonnull)
 * whether the action in question (i.e., fn) has to be performed.
 */
export function askchain(objchn,olets,allflag,fn,ckfn,mx,word)
{
    objchn=C.ptr(objchn);
    olets=C.ptr(olets);
    allflag=C.i32(allflag);
    fn=C.ptr(fn);
    ckfn=C.ptr(ckfn);
    mx=C.i32(mx);
    word=C.ptr(word);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["askchain.qbuf",(1*128)],["askchain.qpfx",(1*128)],["askchain.sortedchn",8]]);
    try {
    /* *objchn might change */
    /* olets is an Obj Class char array */
    /* bypass prompting about individual items */
    /* action to perform on selected items */
    /* callback to decided if an item is selectable */
    /* if non-0, maximum number of objects to process */
    /* name of the action */
    let otmp; let otmpo;
    let sym; let ilet;
    let cnt=0; let dud=0; let tmp;
    let takeoff; let nodot; let ident; let take_out; let put_in; let first; let ininv; let bycat;
    let qbuf=C.automatic("askchain.qbuf",(1*128)); let qpfx=C.automatic("askchain.qpfx",(1*128));
    let sortedchn=C.local("askchain.sortedchn","struct sortloot_item *",0);
    ret: {
    (takeoff=taking_off(word));
    (ident=C.i8(Number(!(C.strcmp(word,C.literal("identify"))))));
    (take_out=C.i8(Number(!(C.strcmp(word,C.literal("take out"))))));
    (put_in=C.i8(Number(!(C.strcmp(word,C.literal("put in"))))));
    (nodot=C.i8((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strcmp(word,C.literal("nodot"))))||Number(!(C.strcmp(word,C.literal("drop"))))))||C.i32(ident)))||C.i32(takeoff)))||C.i32(take_out)))||C.i32(put_in))))));
    (ininv=C.i8((Number(C.cell(objchn,"struct obj *").value==C.field(C.gi,"instance_globals_i","invent").value))));
    (bycat=C.i8((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.menu_class_present(117))||C.i32(C.menu_class_present(66))))||C.i32(C.menu_class_present(85))))||C.i32(C.menu_class_present(67))))||C.i32(C.menu_class_present(88))))||C.i32(C.menu_class_present(80)))))));
    /* someday maybe we'll sort by 'olets' too (temporarily replace
       flags.packorder and pass SORTLOOT_PACK), but not yet... */
    (sortedchn.value=sortloot(objchn,C.u32(2),(C.i8(0)),0));
    (first=(C.i8(1)));
    /*
     * Interrogate in the object class order specified.
     * For example, if a person specifies =/ then first all rings
     * will be asked about followed by all wands.  -dgk
     */
    nextclass: for(;;) {
    (ilet=C.i8(C.i32((97-1))));
    if(Number(!!(C.cell(objchn,"struct obj *").value&&Number(C.i32(C.field((C.cell(objchn,"struct obj *").value),"obj","oclass").value)==C.COIN_CLASS)))) (()=>{const old=ilet;ilet=C.i8((old-1));return old;})();
    /* extra iteration */
    /*
     * Multiple Drop can change the gi.invent chain while it operates
     * (dropping a burning potion of oil while levitating creates
     * an explosion which can destroy inventory items), so simple
     * list traversal
     *  for (otmp = *objchn; otmp; otmp = otmp2) {
     *      otmp2 = otmp->nobj;
     *      ...
     *  }
     * is inadequate here.  Use each object's bypass bit to keep
     * track of which list elements have already been processed.
     */
    C.bypass_objlist(C.cell(objchn,"struct obj *").value,(C.i8(0)));
    /* clear chain's bypass bits */
    while(Number(((otmp=C.nxt_unbypassed_loot(sortedchn.value,C.cell(objchn,"struct obj *").value)))!=0)) {
        if(Number(C.i32(ilet)==122)) (ilet=C.i8(65));
 else if(Number(C.i32(ilet)==90)) (ilet=C.i8(35));
 else (()=>{const old=ilet;ilet=C.i8((old+1));return old;})();
        /* '#' */
        if(Number(!!(Number(!!(olets&&C.i32(C.cell(olets,"char").value)))&&Number(C.i32(C.field(otmp,"obj","oclass").value)!=C.i32(C.cell(olets,"char").value))))) continue;
        if(Number(!!(C.i32(takeoff)&&Number(!(is_worn(otmp)))))) continue;
        if(Number(!!(C.i32(ident)&&Number(!(C.not_fully_identified(otmp)))))) continue;
        if(Number(!!(ckfn&&Number(!(C.callback(9,(ckfn),otmp)))))) continue;
        if(Number(!!(C.i32(bycat)&&Number(!(ckvalidcat(otmp)))))) continue;
        if(Number(!(allflag))) {
            (C.field(C.staticAddress("safeq_xprn_ctx"),"xprnctx","let").value=ilet);
            (C.field(C.staticAddress("safeq_xprn_ctx"),"xprnctx","dot").value=C.i8(Number(!(nodot))));
            (C.cell(qpfx,"char").value=C.i8(0));
            if(first) {
                /* traditional_loot() skips prompting when only one
                   class of objects is involved, so prefix the first
                   object being queried here with an explanation why */
                if(Number(!!(C.i32(take_out)||C.i32(put_in)))) (C.variadic(50,qpfx,C.literal("%s: "),word),(C.cell(qpfx,"char").value=C.highc(C.cell(qpfx,"char").value)));
                (first=(C.i8(0)));
            }
            C.safe_qbuf(qbuf,qpfx,C.literal("?"),otmp,(C.i32(ininv)?C.functionAddress("safeq_xprname"):C.functionAddress("doname")),(C.i32(ininv)?C.functionAddress("safeq_shortxprname"):C.functionAddress("ansimpleoname")),C.literal("item"));
            /* nyaq(qbuf) or nyNaq(qbuf), bypassing canned input for ^A */
            (sym=C.yn_function(qbuf,((Number(!!(Number(!!(C.i32(takeoff)||C.i32(ident)))||Number(C.field(otmp,"obj","quan").value<2n))))?C.ynaqchars:C.ynNaqchars),C.i8(110),(C.i8(0))));
        } else (sym=C.i8(121));
        (otmpo=otmp);
        if(Number(C.i32(sym)==35)) {
            /* Number was entered; split the object unless it corresponds
               to 'none' or 'all'.  2 special cases: cursed loadstones and
               welded weapons (eg, multiple daggers) will remain as merged
               unit; done to avoid splitting an object that won't be
               droppable (even if we're picking up rather than dropping). */
            if(Number(!(C.global("yn_number").value))) {
                (sym=C.i8(110));
            } else {
                (sym=C.i8(121));
                if(Number(!!(Number(C.global("yn_number").value<C.field(otmp,"obj","quan").value)&&C.i32(splittable(otmp))))) (otmp=C.splitobj(otmp,C.global("yn_number").value));
            }
        }
        switch(C.i32(sym)) {
            case (97):
                (allflag=1);
            ;
            /*FALLTHRU*/
            case (121):
                (tmp=C.callback(10,(fn),otmp));
            if(Number(tmp<=0)) {
                if(C.container_gone(fn)) {
                    /* otmp caused magic bag to explode;
                       both are now gone */
                    (otmp=0);
                    /* and return */
                } else if(Number(!!(otmp&&Number(otmp!=otmpo)))) {
                    /* split occurred, merge again */
                    C.unsplitobj(otmp);
                }
                if(Number(tmp<0)) break ret; /* source goto ret */
            }
            (cnt=C.i32(cnt+tmp));
            if(Number((()=>{const old=mx;mx=C.i32((old-1));return mx;})()==0)) break ret; /* source goto ret */
            ;
            /*FALLTHRU*/
            case (110):
                if(nodot) (()=>{const old=dud;dud=C.i32((old+1));return old;})();
            ;
            /*FALLTHRU*/
            default:
                break;
            case (113):
                /* special case for seffects() */
                if(ident) (cnt=C.i32((-1)));
            break ret; /* source goto ret */
        }
    }
    if(Number(!!(Number(!!(olets&&C.i32(C.cell(olets,"char").value)))&&C.i32(C.cell((()=>{const old=olets;olets=C.ptr((old+Number(1)));return olets;})(),"char").value)))) continue nextclass; /* source goto nextclass */
    break;
    } /* source nextclass loop */
    if(Number(!!(Number(!(takeoff))&&(Number(!!(dud||cnt)))))) C.variadic(51,C.literal("That was all."));
 else if(Number(!!(Number(!(dud))&&Number(!(cnt))))) C.variadic(52,C.literal("No applicable objects."));
    } /* source ret: */
    unsortloot(sortedchn.address);
    /* can't just clear bypass bit of items in objchn because the action
       applied to selected ones might move them to a different chain */
    /*bypass_objlist(*objchn, FALSE);*/
    C.clear_bypasses();
    return cnt;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* The menu for rerolling attributes and inventory.

   This is similar to the other inventory menus, but simpler to help it fit on
   the screen (there's more text around it and rerolling is difficult if you
   can't see the whole list at once).

   Returns TRUE (and increases numrerolls) if a reroll was requested. */
export function reroll_menu()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["reroll_menu.any",C.sizes["union any"]],["reroll_menu.pick_list",8],["reroll_menu.tmpglyphinfo",C.sizes["struct glyphinfo"]],["reroll_menu.buf",(1*256)]]);
    try {
    let win;
    let any=C.automatic("reroll_menu.any",C.sizes["union any"]);
    let pick_list=C.local("reroll_menu.pick_list","struct mi *",0);
    let otmp;
    let tmpglyph;
    let tmpglyphinfo=C.automatic("reroll_menu.tmpglyphinfo",C.sizes["struct glyphinfo"]);
    let option;
    let buf=C.automatic("reroll_menu.buf",(1*256));
    (win=C.callback(11,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(12,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_char").value=C.i8(110));
    C.add_menu(win,C.nul_glyphinfo,any,C.i8((C.i32(C.field(C.flags,"flag","lootabc").value)?0:112)),C.i8(0),0,8,C.literal("start the game with this character"),0);
    (C.field(any,"any","a_char").value=C.i8(121));
    C.add_menu(win,C.nul_glyphinfo,any,C.i8((C.i32(C.field(C.flags,"flag","lootabc").value)?0:114)),C.i8(0),0,8,C.literal("reroll another character"),0);
    (C.field(any,"any","a_char").value=C.i8(0));
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,8,C.literal(""),0);
    (()=>{const ref=C.field(C.gd,"instance_globals_d","distantname");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
    /* avoid adding items to discoveries */
    (()=>{const ref=C.field(C.iflags,"instance_flags","override_ID");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
    /* identify them */
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        (tmpglyph=(((Number(C.i32(C.field((otmp),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.callback(13,(C.functionAddress("rn2_on_display_rng")),C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((otmp),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((otmp),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.callback(14,(C.functionAddress("rn2_on_display_rng")),C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.callback(15,(C.functionAddress("rn2_on_display_rng")),C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((otmp),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((otmp),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((otmp),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((otmp),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))))))))));
        C.map_glyphinfo(C.i16(0),C.i16(0),tmpglyph,0,tmpglyphinfo);
        C.add_menu(win,tmpglyphinfo,any,C.i8(0),C.i8(0),0,8,C.doname(otmp),0);
    }
    (()=>{const ref=C.field(C.iflags,"instance_flags","override_ID");const old=ref.value;ref.value=C.i32((old-1));return ref.value;})();
    (()=>{const ref=C.field(C.gd,"instance_globals_d","distantname");const old=ref.value;ref.value=C.i32((old-1));return ref.value;})();
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,8,C.literal(""),0);
    C.variadic(53,buf,C.literal("St:%s Dx:%-1d Co:%-1d In:%-1d Wi:%-1d Ch:%-1d"),C.get_strength_str(),C.i32((C.acurr(C.A_DEX))),C.i32((C.acurr(C.A_CON))),C.i32((C.acurr(C.A_INT))),C.i32((C.acurr(C.A_WIS))),C.i32((C.acurr(C.A_CHA))));
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,8,buf,0);
    C.callback(16,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Reroll this character?"));
    if(Number(C.select_menu(win,1,pick_list.address)>0)) {
        (option=C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
        C.free(pick_list.value);
    } else {
        /* user closed the menu without selecting; unclear what their choice
           is here so ask again; but (e.g. for hangup handling) stop asking if
           the user cancels out again */
        (option=C.yn_function(C.literal("Reroll this character?"),C.ynchars,C.i8(110),(C.i8(1))));
    }
    C.callback(17,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    if(Number(C.i32(option)==121)) {
        (()=>{const ref=C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","numrerolls");const old=ref.value;ref.value=C.i64((old+1n));return ref.value;})();
        return (C.i8(1));
    }
    return (C.i8(0));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 *      Object identification routines:
 */
/* set the cknown and lknown flags on an object if they're applicable */
export function set_cknown_lknown(obj)
{
    obj=C.ptr(obj);
    if(Number(!!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.STATUE)))) (C.field(obj,"obj","cknown").value=(C.field(obj,"obj","lknown").value=C.u32(1)));
 else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN)) (C.field(obj,"obj","cknown").value=C.u32(1));
    /* TODO? cknown might be extended to candy bar, where it would mean that
       wrapper's text was known which in turn indicates candy bar's content */
    return;
}

/* make an object actually be identified; no display updating */
export function fully_identify_obj(otmp)
{
    otmp=C.ptr(otmp);
    C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
    if(C.field(otmp,"obj","oartifact").value) C.discover_artifact(C.i16(C.field(otmp,"obj","oartifact").value));
    C.observe_object(otmp);
    (C.field(otmp,"obj","known").value=(C.field(otmp,"obj","bknown").value=(C.field(otmp,"obj","rknown").value=C.u32(1))));
    set_cknown_lknown(otmp);
    /* set otmp->{cknown,lknown} if applicable */
    if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.EGG)&&Number(C.field(otmp,"obj","corpsenm").value!=C.NON_PM)))) C.learn_egg_type(C.field(otmp,"obj","corpsenm").value);
}

/* ggetobj callback routine; identify an object and give immediate feedback */
export function identify(otmp)
{
    otmp=C.ptr(otmp);
    fully_identify_obj(otmp);
    prinv(0,otmp,0n);
    return 1;
}

/* menu of unidentified objects; select and identify up to id_limit of them */
export function menu_identify(id_limit)
{
    id_limit=C.i32(id_limit);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["menu_identify.pick_list",8],["menu_identify.buf",(1*256)]]);
    try {
    let pick_list=C.local("menu_identify.pick_list","struct mi *");
    let n; let i; let first=1; let tryct=5;
    let buf=C.automatic("menu_identify.buf",(1*256));
    /* assumptions:  id_limit > 0 and at least one unID'd item is present */
    while(id_limit) {
        C.variadic(54,buf,C.literal("What would you like to identify %s?"),(first?C.literal("first"):C.literal("next")));
        (n=C.query_objlist(buf,C.field(C.gi,"instance_globals_i","invent").address,(C.i32((C.i32((C.i32((32|64))|8))|16))),pick_list.address,2,C.functionAddress("not_fully_identified")));
        if(Number(n>0)) {
            if(Number(n>id_limit)) (n=id_limit);
            for((i=0);Number(i<n);((()=>{const old=i;i=C.i32((old+1));return old;})(),(()=>{const old=id_limit;id_limit=C.i32((old-1));return old;})())) identify(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);

            C.free(pick_list.value);
            if(id_limit) C.callback(18,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
            /* Before we loop to pop open another menu */
            (first=0);
        } else if(Number(n==C.i32((-2)))) {
            /* player used ESC to quit menu */
            break;
        } else if(Number(n==C.i32((-1)))) {
            /* no eligible items found */
            C.variadic(55,C.literal("That was all."));
            break;
        } else if(Number(!((()=>{const old=tryct;tryct=C.i32((old-1));return tryct;})()))) {
            /* stop re-prompting */
            C.variadic(56,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_thats_enough_tries").value);
            break;
        } else {
            /* try again */
            C.variadic(57,C.literal("Choose an item; use ESC to decline."));
        }
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* count the unidentified items */
export function count_unidentified(objchn)
{
    objchn=C.ptr(objchn);
    let unid_cnt=0;
    let obj;
    for((obj=objchn);obj;(obj=C.field(obj,"obj","nobj").value)) if(C.not_fully_identified(obj)) (()=>{const old=unid_cnt;unid_cnt=C.i32((old+1));return unid_cnt;})();

    return unid_cnt;
}

/* dialog with user to identify a given number of items; 0 means all */
export function identify_pack(id_limit,learning_id)
{
    id_limit=C.i32(id_limit);
    learning_id=C.i8(learning_id);
    /* T: just read unknown identify scroll */
    let obj;
    let n; let unid_cnt=count_unidentified(C.field(C.gi,"instance_globals_i","invent").value);
    if(Number(!(unid_cnt))) {
        C.variadic(58,C.literal("have already identified %s of your possessions."),(Number(!(learning_id))?C.literal("all"):C.literal("the rest")));
    } else if(Number(!!(Number(!(id_limit))||Number(id_limit>=unid_cnt)))) {
        /* identify everything */
        /* TODO:  use fully_identify_obj and cornline/menu/whatever here */
        for((obj=C.field(C.gi,"instance_globals_i","invent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
            if(C.not_fully_identified(obj)) {
                identify(obj);
                if(Number((()=>{const old=unid_cnt;unid_cnt=C.i32((old-1));return unid_cnt;})()<1)) break;
            }
        }
    } else {
        /* identify up to `id_limit' items */
        (n=0);
        if(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==0)) do {
            (n=ggetobj(C.literal("identify"),C.functionAddress("identify"),id_limit,(C.i8(0)),0));
            if(Number(n<0)) break;
            /* quit or no eligible items */
        } while(Number(((id_limit=C.i32(id_limit-n)))>0));
        if(Number(!!(Number(n==0)||Number(n<C.i32((-1)))))) menu_identify(id_limit);
    }
    update_inventory();
}

/* called when regaining sight; mark inventory objects which were picked
   up while blind as now having been seen */
export function learn_unseen_invent()
{
    let otmp;
    let invupdated=(C.i8(0));
    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) return;
    /* sanity check */
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(!!(Number(!!(C.i32(C.field(otmp,"obj","dknown").value)&&(Number(!!(C.i32(C.field(otmp,"obj","bknown").value)||Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC))))))))))&&(Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)!=C.SCROLL_CLASS)||Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_ARCHEOLOGIST))))))))))) continue;
        /* already seen */
        (invupdated=(C.i8(1)));
        /* xname() will set dknown, perhaps bknown (for priest[ess]);
           result from xname() is immediately released for re-use */
        C.maybereleaseobuf(C.xname(otmp));
        addinv_core2(otmp);
        /* you react to seeing the object */
        /*
         * If object->eknown gets implemented (see learnwand(zap.c)),
         * handle deferred discovery here.
         */
    }
    if(invupdated) update_inventory();
}

/* persistent inventory window is maintained by interface code;
   'update_inventory' used to be a macro for
   (*windowprocs.win_update_inventory) but the restore hackery to suppress
   screen updates was getting out of hand; this is now a central call point */
export function update_inventory()
{
    let save_suppress_price;
    if(Number(!(C.field(C.program_state,"sinfo","in_moveloop").value))) return;
    /* not covered by suppress_map_output */
    if(C.suppress_map_output()) return;
    /* despite name, used for perm_invent too */
    /*
     * Ought to check (windowprocs.wincap & WC_PERM_INVENT) here....
     *
     * We currently don't skip this call when iflags.perm_invent is False
     * because curses uses that to disable a previous perm_invent window
     * (after toggle via 'O'; perhaps the options code should handle that).
     *
     * perm_invent might get updated while some code is avoiding price
     * feedback during obj name formatting for messages.  Temporarily
     * force 'normal' formatting during the perm_invent update.  (Cited
     * example was an update triggered by change in invent gold when
     * transferring some to shk during itemized billing.  A previous fix
     * attempt in the shop code handled it for unpaid items but not for
     * paying for used-up shop items; that follows a different code path.)
     */
    (save_suppress_price=C.field(C.iflags,"instance_flags","suppress_price").value);
    (C.field(C.iflags,"instance_flags","suppress_price").value=0);
    C.callback(19,(C.field(C.windowprocs,"window_procs","win_update_inventory").value),0);
    (C.field(C.iflags,"instance_flags","suppress_price").value=save_suppress_price);
}

/* the #perminv command - call interface's persistent inventory routine */
export function doperminv()
{
    /*
     * If persistent inventory window is enabled, interact with it.
     *
     * Depending on interface, might accept and execute one scrolling
     * request (MENU_{FIRST,NEXT,PREVIOUS,LAST}_PAGE) then return,
     * or might stay and handle multiple requests until user finishes
     * (typically by typing <return> or <esc> but that's up to interface).
     */
    /* [currently this would redraw the persistent inventory window
       whether that's needed or not, so also reset any previous
       scrolling; we don't want that if the interface only accepts
       one scroll command at a time] */
    /* make sure that it's up to date */
    if(Number((C.u64((C.field(C.windowprocs,"window_procs","wincap").value&C.u64(134217728n))))==C.u64(0))) {
        /* [TODO? perhaps omit "by <interface>" if all the window ports
           compiled into this binary lack support for perm_invent...] */
        C.variadic(59,C.literal("Persistent inventory display is not supported by '%s'."),C.field(C.windowprocs,"window_procs","name").value);
    } else if(Number(!(C.field(C.iflags,"instance_flags","perm_invent").value))) {
        C.variadic(60,C.literal("Persistent inventory ('perm_invent' option) is not presently enabled."));
    } else if(Number(!(C.field(C.gi,"instance_globals_i","invent").value))) {
        /* [should this be left for the interface to decide?] */
        C.variadic(61,C.literal("Persistent inventory display is empty."));
    } else {
        /* note: we used to request a scrolling key here and pass that to
           (*win_update_inventory)(key), but that limited the functionality
           and also cluttered message history with prompt and response so
           just send non-zero and have the interface be responsible for it */
        C.callback(20,(C.field(C.windowprocs,"window_procs","win_update_inventory").value),1);
    }
    /* iflags.perm_invent */
    return 0;
}

/* should of course only be called for things in invent */
export function obj_to_let(obj)
{
    obj=C.ptr(obj);
    if(Number(!(C.field(C.flags,"flag","invlet_constant").value))) {
        (C.field(obj,"obj","invlet").value=C.i8(35));
        reassign();
    }
    return C.field(obj,"obj","invlet").value;
}

/*
 * Print the indicated quantity of the given object.  If quan == 0L then use
 * the current quantity.
 */
export function prinv(prefix,obj,quan)
{
    prefix=C.ptr(prefix);
    obj=C.ptr(obj);
    quan=C.i64(quan);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["prinv.totalbuf",(1*128)]]);
    try {
    let total_of=C.i8((Number(!!(quan&&(Number(quan<C.field(obj,"obj","quan").value))))));
    let totalbuf=C.automatic("prinv.totalbuf",(1*128));
    if(Number(!(prefix))) (prefix=C.literal(""));
    (C.cell((totalbuf+Number(0)*1),"char").value=C.i8(0));
    if(total_of) C.variadic(62,(C.literal("prinv")),2886,totalbuf,BigInt((1*128)),C.literal(" (%ld in total)."),C.field(obj,"obj","quan").value);
    C.variadic(63,C.literal("%s%s%s%s"),prefix,(C.i32(C.cell(prefix,"char").value)?C.literal(" "):C.literal("")),xprname(obj,0,obj_to_let(obj),C.i8(Number(!(total_of))),0n,quan),(C.i32(C.field(C.flags,"flag","verbose").value)?totalbuf:C.literal("")));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function xprname(obj,txt,let_,dot,cost,quan)
{
    obj=C.ptr(obj);
    txt=C.ptr(txt);
    let_=C.i8(let_);
    dot=C.i8(dot);
    cost=C.i64(cost);
    quan=C.i64(quan);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["xprname.suffix",(1*80)]]);
    try {
    /* text to print instead of obj */
    /* inventory letter */
    /* append period; (dot && cost => Iu) */
    /* cost (for inventory of unpaid or expended items) */
    /* if non-0, print this quantity, not obj->quan */
    
    let suffix=C.automatic("xprname.suffix",(1*80));
    /* plenty of room for count and hallucinatory currency */
    let sfxlen; let txtlen;
    /* signed int for %*s formatting */
    let fmt;
    let use_invlet=C.i8((Number(!!(Number(!!(Number(!!(C.i32(C.field(C.flags,"flag","invlet_constant").value)&&Number(obj!=(0))))&&Number(C.i32(let_)!=62)))&&Number(C.i32(let_)!=45)))));
    let savequan=0n;
    if(Number(!!(quan&&obj))) {
        (savequan=C.field(obj,"obj","quan").value);
        (C.field(obj,"obj","quan").value=quan);
    }
    /*
     * If let is:
     *  -  Then obj == null and 'txt' refers to hands or fingers.
     *  *  Then obj == null and we are printing a total amount.
     *  >  Then the object is contained and doesn't have an inventory letter.
     */
    (fmt=C.literal("%c - %.*s%s"));
    if(Number(!(txt))) {
        ((Number(!!((Number(obj!=(0)))||((C.__assert_fail(C.literal("obj != NULL"),C.literal("invent.c"),2923,(C.literal("xprname"))),0))))));
        (txt=C.doname(obj));
    }
    (txtlen=C.i32(C.strlen(txt)));
    if(Number(!!(Number(cost!=0n)||Number(C.i32(let_)==42)))) {
        /* if dot is true, we're doing Iu, otherwise Ix */
        if(Number(!!(C.i32(dot)&&C.i32(use_invlet)))) (let_=C.field(obj,"obj","invlet").value);
        C.variadic(64,suffix,C.literal("%c%6ld %.50s"),(C.i32(C.field(C.iflags,"instance_flags","menu_tab_sep").value)?9:32),cost,currency(cost));
        if(Number(!(C.field(C.iflags,"instance_flags","menu_tab_sep").value))) {
            (fmt=C.literal("%c - %-45.*s%s"));
            if(Number(txtlen<45)) (txtlen=45);
        }
    } else {
        /* ordinary inventory display or pickup message */
        if(use_invlet) (let_=C.field(obj,"obj","invlet").value);
        C.strcpy(suffix,(C.i32(dot)?C.literal("."):C.literal("")));
    }
    (sfxlen=C.i32(C.strlen(suffix)));
    if(Number(txtlen>C.i32((C.i32((256-1))-(C.i32((4+sfxlen))))))) (txtlen=C.i32((C.i32((256-1))-(C.i32((4+sfxlen))))));
    /* 4: "c - " prefix */
    C.variadic(65,C.staticAddress("xprname.li"),fmt,C.i32(let_),txtlen,txt,suffix);
    if(savequan) (C.field(obj,"obj","quan").value=savequan);
    return C.staticAddress("xprname.li");
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* show some or all of inventory while allowing the picking of an item in
   order to preform context-sensitive item action on it; always returns 'ok';
   invent subsets specified by the ')', '[', '(', '=', '"', or '*' commands
   when they're invoked with the 'm' prefix (or without it for '*') */
export function dispinv_with_action(lets,use_inuse_ordering,alt_label)
{
    lets=C.ptr(lets);
    use_inuse_ordering=C.i8(use_inuse_ordering);
    alt_label=C.ptr(alt_label);
    /* list of invlet values to include */
    /* affects sortloot() and header labels */
    /* alternate value for in-use "Accessories" */
    let otmp; let nextobj;
    let save_accessories=0;
    let c; let save_sortloot=C.i8(0);
    let len=(lets?C.u32(C.strlen(lets)):0);
    let menumode=C.i8(((Number(!!(Number(len!=C.u32(1))||C.i32(C.field(C.iflags,"instance_flags","menu_requested").value))))?C.i32((C.i8(1))):C.i32((C.i8(0))))); let save_force_invmenu=C.field(C.iflags,"instance_flags","force_invmenu").value;
    if(use_inuse_ordering) {
        (save_accessories=C.cell((C.staticAddress("inuse_headers")+Number(4)*8),"char *").value);
        (save_sortloot=C.field(C.flags,"flag","sortloot").value);
        (C.field(C.flags,"flag","sortloot").value=C.i8(105));
        /* checked by display_pickinv() */
        if(alt_label) (C.cell((C.staticAddress("inuse_headers")+Number(4)*8),"char *").value=alt_label);
    }
    (C.field(C.iflags,"instance_flags","force_invmenu").value=(C.i8(0)));
    (c=display_inventory(lets,menumode));
    if(use_inuse_ordering) {
        (C.field(C.flags,"flag","sortloot").value=save_sortloot);
        (C.cell((C.staticAddress("inuse_headers")+Number(4)*8),"char *").value=save_accessories);
    }
    (C.field(C.iflags,"instance_flags","force_invmenu").value=save_force_invmenu);
    if(Number(!!(C.i32(c)&&Number(C.i32(c)!=27)))) {
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=nextobj)) {
            (nextobj=C.field(otmp,"obj","nobj").value);
            if(Number(C.i32(C.field(otmp,"obj","invlet").value)==C.i32(c))) return C.itemactions(otmp);
        }
    }
    return 0;
}

/* the #inventory command (not much left...) */
export function ddoinv()
{
    return dispinv_with_action(0,(C.i8(0)),0);
}

/*
 * find_unpaid()
 *
 * Scan the given list of objects.  If last_found is NULL, return the first
 * unpaid object found.  If last_found is not NULL, then skip over unpaid
 * objects until last_found is reached, then set last_found to NULL so the
 * next unpaid object is returned.  This routine recursively follows
 * containers.
 */
export function find_unpaid(list,last_found)
{
    list=C.ptr(list);
    last_found=C.ptr(last_found);
    let obj;
    while(list) {
        if(C.field(list,"obj","unpaid").value) {
            if(C.cell(last_found,"struct obj *").value) {
                /* still looking for previous unpaid object */
                if(Number(list==C.cell(last_found,"struct obj *").value)) (C.cell(last_found,"struct obj *").value=0);
            } else return (((C.cell(last_found,"struct obj *").value=list)));
        }
        if((Number(C.field((list),"obj","cobj").value!=0))) {
            if(Number(((obj=find_unpaid(C.field(list,"obj","cobj").value,last_found)))!=0)) return obj;
        }
        (list=C.field(list,"obj","nobj").value);
    }
    return 0;
}

export function free_pickinv_cache()
{
    if(Number(C.field(C.gc,"instance_globals_c","cached_pickinv_win").value!=(C.i32((-1))))) {
        C.callback(21,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),C.field(C.gc,"instance_globals_c","cached_pickinv_win").value);
        (C.field(C.gc,"instance_globals_c","cached_pickinv_win").value=(C.i32((-1))));
    }
}

/*
 * Internal function used by display_inventory and getobj that can display
 * inventory and return a count as well as a letter.
 */
export function display_pickinv(lets,xtra_choice,query,allowxtra,want_reply,out_cnt)
{
    lets=C.ptr(lets);
    xtra_choice=C.ptr(xtra_choice);
    query=C.ptr(query);
    allowxtra=C.i8(allowxtra);
    want_reply=C.i8(want_reply);
    out_cnt=C.ptr(out_cnt);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["display_pickinv.wizid_fakeobj",C.sizes["struct obj"]],["display_pickinv.inuse_fakeobj",C.sizes["struct obj"]],["display_pickinv.any",C.sizes["union any"]],["display_pickinv.selected",8],["display_pickinv.sortedinvent",8],["display_pickinv.prompt",(1*128)],["display_pickinv.tmpglyphinfo",C.sizes["struct glyphinfo"]],["display_pickinv.barehands",(1*128)]]);
    try {
    /* non-compacted list of invlet values */
    /* non-object "bare hands" or "fingers" */
    /* optional; prompt string for menu */
    /* hands are allowed (maybe alternate) choice */
    /* True: select an item, False: just display */
    /* optional; count player entered when selecting an item */
    
    /* potential entries for perm_invent window */
    let otmp; let wizid_fakeobj=C.automatic("display_pickinv.wizid_fakeobj",C.sizes["struct obj"]); let inuse_fakeobj=C.automatic("display_pickinv.inuse_fakeobj",C.sizes["struct obj"]);
    let ilet; let ret; let formattedobj;
    let invlet=C.field(C.flags,"flag","inv_order").address;
    let n; let classcount; let inusecount=0;
    let win;
    /* windows being used */
    let any=C.automatic("display_pickinv.any",C.sizes["union any"]);
    let selected=C.local("display_pickinv.selected","struct mi *");
    let sortflags;
    let sortedinvent=C.local("display_pickinv.sortedinvent","struct sortloot_item *"); let srtinv;
    let prevorderclass;
    let filter=0;
    let wizid=C.i8((Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&C.field(C.iflags,"instance_flags","override_ID").value)))); let gotsomething=(C.i8(0));
    let clr=8; let menu_behavior=C.i32(0);
    let show_gold=(C.i8(1)); let inuse_only=(C.i8(0)); let skipped_gold=(C.i8(0)); let doing_perm_invent=(C.i8(0)); let save_flags_sortpack; let usextra=C.i8((Number(!!(xtra_choice&&C.i32(allowxtra)))));
    if(Number(!!(lets&&Number(!(C.cell(lets,"char").value))))) (lets=0);
    /* simplify tests: (lets) instead of (lets && *lets) */
    /* passed to dump_putstr() which ignores it... */
    if(Number(!!(Number(!!(Number(!!(Number(!!(lets||C.i32(usextra)))||C.i32(wizid)))||C.i32(want_reply)))||Number(C.global("WIN_INVEN").value==(C.i32((-1))))))) {
        /*|| !gi.in_sync_perminvent*/
        /* partial inventory in perm_invent setting; don't operate on
           full inventory window, use an alternate one instead; create
           the first time needed and keep it for re-use as needed later */
        if(Number(C.field(C.gc,"instance_globals_c","cached_pickinv_win").value==(C.i32((-1))))) (C.field(C.gc,"instance_globals_c","cached_pickinv_win").value=C.callback(22,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
        (win=C.field(C.gc,"instance_globals_c","cached_pickinv_win").value);
        if(Number(C.i32(C.field(C.flags,"flag","sortloot").value)==105)) (inuse_only=(C.i8(1)));
    } else {
        (win=C.global("WIN_INVEN").value);
        (menu_behavior=C.i32(1));
        prepare_perminvent(win);
        (show_gold=C.i8((Number((C.u32((C.u32(C.field(C.field(C.staticAddress("wri_info"),"win_request_info_t","fromcore").address,"from_core","invmode").value)&C.u32(C.i32(C.InvShowGold)))))!=C.u32(0)))));
        (inuse_only=C.i8((Number((C.u32((C.u32(C.field(C.field(C.staticAddress("wri_info"),"win_request_info_t","fromcore").address,"from_core","invmode").value)&C.u32(C.i32(C.InvInUse)))))!=C.u32(0)))));
        (doing_perm_invent=(C.i8(1)));
    }
    /*
     * Exit early if no inventory -- but keep going if we are doing
     * a permanent inventory update.  We need to keep going so the
     * permanent inventory window updates itself to remove the last
     * item(s) dropped.  One down side:  the addition of the exception
     * for permanent inventory window updates _can_ pop the window
     * up when it's not displayed -- even if it's empty -- because we
     * don't know at this level if its up or not.  This may not be
     * an issue if empty checks are done before hand and the call
     * to here is short circuited away.
     *
     * 2: our count here is only to distinguish between 0 or 1 or
     * more than 1; for the last case, we don't need a precise number.
     * For perm_invent update we force 'more than 1'.
     */
    (n=((Number(!!(Number(!!(C.i32(doing_perm_invent)&&Number(!(lets))))&&Number(!(want_reply)))))?2:(lets?C.i32(C.strlen(lets)):(Number(!(C.field(C.gi,"instance_globals_i","invent").value))?0:(Number(!(C.field(C.field(C.gi,"instance_globals_i","invent").value,"obj","nobj").value))?1:2)))));
    /* for xtra_choice, there's another 'item' not included in initial 'n';
       for !lets (full invent or inuse_only) and for override_ID (wizard
       mode identify), skip message_menu handling of single item even if
       item count was 1 */
    if(Number(!!(C.i32(usextra)||(Number(!!(Number(n==1)&&(Number(!!(Number(!(lets))||C.i32(wizid)))))))))) (()=>{const old=n;n=C.i32((old+1));return n;})();
    if(Number(n==0)) {
        C.variadic(66,C.literal("%s."),C.staticAddress("display_pickinv.not_carrying_anything"));
        return C.i8(0);
    }
    /* oxymoron? temporarily assign permanent inventory letters */
    if(Number(!(C.field(C.flags,"flag","invlet_constant").value))) reassign();
    if(Number(!!(Number(!!(Number(n==1)&&Number(!(C.field(C.iflags,"instance_flags","force_invmenu").value))))&&Number(!(C.field(C.iflags,"instance_flags","menu_requested").value))))) {
        /* when only one item of interest, use pline instead of menus;
           we actually use a fake message-line menu in order to allow
           the user to perform selection at the --More-- prompt for tty */
        (ret=C.i8(0));
        if(usextra) {
            /* xtra_choice is "bare hands" (wield), "fingertip" (Engrave),
               "nothing" (prepare Quiver), "fingers" (apply grease), or
               "hands" (default) */
            (ret=C.callback(23,(C.field(C.windowprocs,"window_procs","win_message_menu").value),C.i8(45),1,xprname(0,xtra_choice,C.i8(45),(C.i8(1)),0n,0n)));
            /* '-' */
        } else {
            for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(!!(Number(!(lets))||Number(C.i32(C.field(otmp,"obj","invlet").value)==C.i32(C.cell((lets+Number(0)*1),"char").value))))) break;

            if(otmp) (ret=C.callback(24,(C.field(C.windowprocs,"window_procs","win_message_menu").value),C.field(otmp,"obj","invlet").value,(C.i32(want_reply)?1:0),xprname(otmp,0,C.cell((lets+Number(0)*1),"char").value,(C.i8(1)),0n,0n)));
        }
        if(out_cnt) (C.cell(out_cnt,"long").value=C.i64((-1n)));
        /* select all */
        return ret;
    }
    (sortflags=C.u32(((Number(C.i32(C.field(C.flags,"flag","sortloot").value)==102))?4:2)));
    if(C.field(C.flags,"flag","sortpack").value) (sortflags=C.u32(sortflags|C.u32(1)));
    (save_flags_sortpack=C.field(C.flags,"flag","sortpack").value);
    if(inuse_only) {
        (C.field(C.flags,"flag","sortpack").value=(C.i8(0)));
        (sortflags=C.u32(8));
        /* override */
        (filter=C.functionAddress("is_inuse"));
        if(Number(!(C.global("uwep").value))) {
            /*
             * inuse_only and not wielding anything: insert "bare hands"
             * into primary weapon slot.  Unlike adding an extra menu
             * entry for 'xtra_choice' at top of menu, we need an object
             * in invent for it to be sorted into desired position.
             * It will need custom formatting below.
             */
            C.copy(inuse_fakeobj,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
            /* STRANGE_OBJECT, ILLOBJ_CLASS */
            (C.field(inuse_fakeobj,"obj","invlet").value=C.i8(45));
            /* '-' */
            (C.field(inuse_fakeobj,"obj","owornmask").value=256n);
            /* inuse_classify needs this */
            (C.field(inuse_fakeobj,"obj","where").value=C.i8(3));
            /* is_inuse filter needs this */
            (C.field(inuse_fakeobj,"obj","nobj").value=C.field(C.gi,"instance_globals_i","invent").value);
            (C.field(C.gi,"instance_globals_i","invent").value=inuse_fakeobj);
        }
    }
    (sortedinvent.value=sortloot(C.field(C.gi,"instance_globals_i","invent").address,sortflags,(C.i8(0)),filter));
    /* inuse_only: if we inserted bare hands as a fake weapon, remove them;
       although the fake object will no longer be in invent, sortedinvent
       will still contain a pointer to it */
    if(Number(C.field(C.gi,"instance_globals_i","invent").value==inuse_fakeobj)) {
        (C.field(C.gi,"instance_globals_i","invent").value=C.field(inuse_fakeobj,"obj","nobj").value);
        (C.field(inuse_fakeobj,"obj","nobj").value=0);
        /* if inuse_fakeobj is the only thing present in sortedinvent, get
           rid of it in order to produce "not using any items" */
        if(Number(!!(Number(C.field((sortedinvent.value+Number(0)*C.sizes["struct sortloot_item"]),"sortloot_item","obj").value==inuse_fakeobj)&&Number(!(C.field((sortedinvent.value+Number(1)*C.sizes["struct sortloot_item"]),"sortloot_item","obj").value))))) (C.field((sortedinvent.value+Number(0)*C.sizes["struct sortloot_item"]),"sortloot_item","obj").value=0);
    }
    C.callback(25,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(menu_behavior));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    if(wizid) {
        let unid_cnt;
        let prompt=C.automatic("display_pickinv.prompt",(1*128));
        (unid_cnt=count_unidentified(C.field(C.gi,"instance_globals_i","invent").value));
        C.variadic(67,prompt,C.literal("Debug Identify"));
        /* 'title' rather than 'prompt' */
        if(unid_cnt) C.variadic(68,C.eos(prompt),C.literal(" -- unidentified or partially identified item%s"),(((Number((unid_cnt)==1))?C.literal(""):C.literal("s"))));
        C.add_menu_str(win,prompt);
        if(Number(!(unid_cnt))) {
            C.add_menu_str(win,C.literal("(all items are permanently identified already)"));
            (gotsomething=(C.i8(1)));
        } else {
            (C.field(any,"any","a_obj").value=wizid_fakeobj);
            C.variadic(69,prompt,C.literal("select %s to permanently identify"),((Number(unid_cnt==1))?C.literal("it"):C.literal("any or all of them")));
            /* wiz_identify stuffed the wiz_identify command character (^I)
               into iflags.override_ID for our use as an accelerator;
               it could be ambiguous if player has assigned a letter to
               the #wizidentify command, so include it as a group accelerator
               but use '_' as the primary selector */
            if(Number(unid_cnt>1)) C.variadic(70,C.eos(prompt),C.literal(" (%s for all)"),C.visctrl(C.i8(C.field(C.iflags,"instance_flags","override_ID").value)));
            C.add_menu(win,C.nul_glyphinfo,any,C.i8(95),C.i8(C.field(C.iflags,"instance_flags","override_ID").value),0,clr,prompt,2);
            (gotsomething=(C.i8(1)));
        }
    } else if(usextra) {
        /* wizard override ID and xtra_choice are mutually exclusive */
        if(C.field(C.flags,"flag","sortpack").value) C.add_menu_heading(win,C.literal("Miscellaneous"));
        (C.field(any,"any","a_char").value=C.i8(45));
        /* '-' */
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(45),C.i8(0),0,clr,xtra_choice,0);
        (gotsomething=(C.i8(1)));
    }
    nextclass: for(;;) {
    (classcount=0);
    (prevorderclass=C.i8(0));
    for((srtinv=sortedinvent.value);Number(((otmp=C.field(srtinv,"sortloot_item","obj").value))!=0);(()=>{const old=srtinv;srtinv=C.ptr((old+Number(C.sizes["struct sortloot_item"])));return srtinv;})()) {
        let tmpglyph;
        let tmpglyphinfo=C.automatic("display_pickinv.tmpglyphinfo",C.sizes["struct glyphinfo"]); C.copy(tmpglyphinfo,C.nul_glyphinfo,C.sizes["struct glyphinfo"]);
        /* for showing a set of specific letters, skip ones not in the set */
        if(Number(!!(lets&&Number(!(C.strchr(lets,C.i32(C.field(otmp,"obj","invlet").value))))))) continue;
        if(Number(!!(Number(!(C.field(C.flags,"flag","sortpack").value))||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.i32(C.cell(invlet,"char").value))))) {
            if(Number(!!(C.i32(wizid)&&Number(!(C.not_fully_identified(otmp)))))) continue;
            if(inuse_only) {
                /* for inuse-only, start with an extra header */
                if(Number(!((()=>{const old=inusecount;inusecount=C.i32((old+1));return old;})()))) C.add_menu_heading(win,(C.i32(doing_perm_invent)?C.literal("In use"):C.literal("Inventory in use")));
            } else if(Number(!!(C.i32(doing_perm_invent)&&Number(!(show_gold))))) {
                /* don't skip gold if it is quivered, even for !show_gold */
                if(Number(!!(Number(C.i32(C.field(otmp,"obj","invlet").value)==C.GOLD_SYM)&&Number(!(C.field(otmp,"obj","owornmask").value))))) {
                    (skipped_gold=(C.i8(1)));
                    continue;
                }
            }
            /* maybe insert a class header */
            if((C.i32(inuse_only)?(Number(C.i32(C.field(srtinv,"sortloot_item","orderclass").value)!=C.i32(prevorderclass))):(Number(!!(C.i32(C.field(C.flags,"flag","sortpack").value)&&Number(!(classcount))))))) {
                let withsym=C.i8((Number(!!(C.i32(want_reply)&&C.i32(C.field(C.iflags,"instance_flags","menu_head_objsym").value)))));
                let class_header=(C.i32(inuse_only)?C.cell((C.staticAddress("inuse_headers")+Number(C.i32(C.field(srtinv,"sortloot_item","orderclass").value))*8),"char *").value:let_to_name(C.cell(invlet,"char").value,(C.i8(0)),withsym));
                C.add_menu_heading(win,class_header);
                (()=>{const old=classcount;classcount=C.i32((old+1));return old;})();
                (prevorderclass=C.field(srtinv,"sortloot_item","orderclass").value);
            }
            (ilet=C.field(otmp,"obj","invlet").value);
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            /* all bits zero */
            if(wizid) (C.field(any,"any","a_obj").value=otmp);
 else (C.field(any,"any","a_char").value=ilet);
            if(Number(otmp==inuse_fakeobj)) {
                /* fake item to format as "bare|gloved hands" */
                let barehands=C.automatic("display_pickinv.barehands",(1*128));
                /* like doname() below, makeplural() returns an obuf[] */
                (formattedobj=C.makeplural(C.body_part(C.HAND)));
                C.variadic(71,barehands,C.literal("%s %s (no weapon)"),(C.global("uarmg").value?C.literal("gloved"):C.literal("bare")),formattedobj);
                C.add_menu(win,C.nul_glyphinfo,any,ilet,C.i8(0),0,clr,barehands,0);
            } else {
                /* normal inventory item */
                (tmpglyph=(((Number(C.i32(C.field((otmp),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.callback(26,(C.functionAddress("rn2_on_display_rng")),C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((otmp),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((otmp),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.callback(27,(C.functionAddress("rn2_on_display_rng")),C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.callback(28,(C.functionAddress("rn2_on_display_rng")),C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((otmp),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((otmp),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((otmp),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((otmp),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))))))))));
                C.map_glyphinfo(C.i16(0),C.i16(0),tmpglyph,0,tmpglyphinfo);
                (formattedobj=C.doname(otmp));
                C.add_menu(win,tmpglyphinfo,any,ilet,C.i8((C.i32(wizid)?C.i32(C.field((C.def_oc_syms+Number(C.i32(C.field(otmp,"obj","oclass").value))*C.sizes["struct class_sym"]),"class_sym","sym").value):0)),0,clr,formattedobj,0);
            }
            /* doname() uses a static pool of obuf[] output buffers and
               we don't want inventory display to overwrite all of them,
               so when we've used one we release it for re-use */
            C.maybereleaseobuf(formattedobj);
            (gotsomething=(C.i8(1)));
        }
    }
    if(C.field(C.flags,"flag","sortpack").value) {
        if(C.cell((()=>{const old=invlet;invlet=C.ptr((old+Number(1)));return invlet;})(),"char").value) continue nextclass; /* source goto nextclass */
        if(Number((()=>{const old=invlet;invlet=C.ptr((old-Number(1)));return invlet;})()!=C.staticAddress("venom_inv"))) {
            (invlet=C.staticAddress("venom_inv"));
            continue nextclass; /* source goto nextclass */
        }
    }
    break;
    } /* source nextclass loop */
    if(Number(C.i32(save_flags_sortpack)!=C.i32(C.field(C.flags,"flag","sortpack").value))) (C.field(C.flags,"flag","sortpack").value=save_flags_sortpack);
    /* default for force_invmenu is a menu listing likely candidates;
       add '*' for 'list all' as an extra choice unless the menu already
       includes everything; when reissuing the menu after player has
       picked '*', add '?' for 'list likely candidates' to reverse that */
    if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","force_invmenu").value)&&C.i32(want_reply)))) {
        let menutext=0;
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        if(Number(!!((Number(!!(C.i32(allowxtra)&&Number(!(usextra)))))||(Number(!!(lets&&Number(C.i32(C.strlen(lets))<C.inv_cnt((C.i8(1)))))))))) {
            (C.field(any,"any","a_char").value=C.i8(42));
            (menutext=C.literal("(list everything)"));
        } else if(Number(!(lets))) {
            (C.field(any,"any","a_char").value=C.i8(63));
            (menutext=C.literal("(list likely candidates)"));
        }
        if(menutext) {
            C.add_menu_heading(win,C.literal("Special"));
            C.add_menu(win,C.nul_glyphinfo,any,C.field(any,"any","a_char").value,C.i8(0),0,clr,menutext,0);
            (gotsomething=(C.i8(1)));
            /* menu isn't empty */
        }
    }
    unsortloot(sortedinvent.address);
    /* for permanent inventory where nothing has been listed (because
       there isn't anything applicable to list; the n==0 case above
       gets skipped for perm_invent), put something into the menu */
    if(Number(!!(Number(!!(C.i32(doing_perm_invent)&&Number(!(lets))))&&Number(!(gotsomething))))) {
        C.add_menu_str(win,(C.i32(inuse_only)?C.staticAddress("display_pickinv.not_using_anything"):((Number(!!(Number(!(show_gold))&&C.i32(skipped_gold))))?C.staticAddress("display_pickinv.only_carrying_gold"):C.staticAddress("display_pickinv.not_carrying_anything"))));
        (want_reply=(C.i8(0)));
    }
    C.callback(29,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,((Number(!!(query&&C.i32(C.cell(query,"char").value))))?query:0));
    (n=C.select_menu(win,(C.i32(wizid)?2:(C.i32(want_reply)?1:0)),selected.address));
    if(Number(n>0)) {
        if(wizid) {
            let all_id=(C.i8(0));
            let i;
            /* identifying items will update perm_invent, calling this
               routine recursively, and we don't want the nested call
               to filter on unID'd items */
            (C.field(C.iflags,"instance_flags","override_ID").value=0);
            (ret=C.i8(0));
            for((i=0);Number(i<n);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
                (otmp=C.field(C.field((selected.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
                if(Number(otmp==wizid_fakeobj)) {
                    identify_pack(0,(C.i8(0)));
                    /* identify_pack() performs update_inventory() */
                    (all_id=(C.i8(1)));
                    break;
                } else {
                    if(C.not_fully_identified(otmp)) identify(otmp);
                    /* identify() does not perform update_inventory() */
                }
            }
            if(Number(!(all_id))) update_inventory();
        } else {
            (ret=C.field(C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
            if(out_cnt) (C.cell(out_cnt,"long").value=C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","count").value);
        }
        C.free(selected.value);
    } else (ret=C.i8((Number(!(n))?0:27)));
    /* cancelled */
    return ret;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 * If lets == NULL or "", list all objects in the inventory.  Otherwise,
 * list all objects with object classes that match the order in lets.
 *
 * Returns the letter identifier of a selected item, or 0 if nothing
 * was selected.
 */
export function display_inventory(lets,want_reply)
{
    lets=C.ptr(lets);
    want_reply=C.i8(want_reply);
    let cmdq=C.cmdq_pop();
    if(cmdq) {
        if(Number(C.field(cmdq,"_cmd_queue","typ").value==C.CMDQ_KEY)) {
            let otmp;
            for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(!!(Number(C.i32(C.field(otmp,"obj","invlet").value)==C.i32(C.field(cmdq,"_cmd_queue","key").value))&&(Number(!!(Number(!!(Number(!(lets))||Number(!(C.cell(lets,"char").value))))||C.strchr(lets,C.i32(C.field((C.def_oc_syms+Number(C.i32(C.field(otmp,"obj","oclass").value))*C.sizes["struct class_sym"]),"class_sym","sym").value)))))))) {
                C.free(cmdq);
                return C.field(otmp,"obj","invlet").value;
            }

        }
        /* cmdq not a key, or did not find the object, abort */
        C.free(cmdq);
        C.cmdq_clear(C.CQ_CANNED);
        return C.i8(0);
    }
    return display_pickinv(lets,0,0,(C.i8(0)),want_reply,0);
}

export function repopulate_perminvent()
{
    display_pickinv(0,0,0,(C.i8(0)),(C.i8(0)),0);
}

/*
 * Show what is current using inventory letters.
 *
 */
export function display_used_invlets(avoidlet)
{
    avoidlet=C.i8(avoidlet);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["display_used_invlets.tmpglyphinfo",C.sizes["struct glyphinfo"]],["display_used_invlets.any",C.sizes["union any"]],["display_used_invlets.selected",8]]);
    try {
    let otmp;
    let ilet; let ret=C.i8(0);
    let invlet=C.field(C.flags,"flag","inv_order").address;
    let n; let classcount; let invdone=0; let tmpglyph;
    let tmpglyphinfo=C.automatic("display_used_invlets.tmpglyphinfo",C.sizes["struct glyphinfo"]); C.copy(tmpglyphinfo,C.nul_glyphinfo,C.sizes["struct glyphinfo"]);
    let win;
    let any=C.automatic("display_used_invlets.any",C.sizes["union any"]);
    let selected=C.local("display_used_invlets.selected","struct mi *");
    let clr=8;
    if(C.field(C.gi,"instance_globals_i","invent").value) {
        (win=C.callback(30,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
        C.callback(31,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
        while(Number(!(invdone))) {
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            /* set all bits to zero */
            (classcount=0);
            for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
                (ilet=C.field(otmp,"obj","invlet").value);
                if(Number(C.i32(ilet)==C.i32(avoidlet))) continue;
                if(Number(!!(Number(!(C.field(C.flags,"flag","sortpack").value))||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.i32(C.cell(invlet,"char").value))))) {
                    if(Number(!!(C.i32(C.field(C.flags,"flag","sortpack").value)&&Number(!(classcount))))) {
                        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
                        /* zero */
                        C.add_menu_heading(win,let_to_name(C.cell(invlet,"char").value,(C.i8(0)),(C.i8(0))));
                        (()=>{const old=classcount;classcount=C.i32((old+1));return old;})();
                    }
                    (C.field(any,"any","a_char").value=ilet);
                    (tmpglyph=(((Number(C.i32(C.field((otmp),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.callback(32,(C.functionAddress("rn2_on_display_rng")),C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((otmp),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((otmp),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.callback(33,(C.functionAddress("rn2_on_display_rng")),C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.callback(34,(C.functionAddress("rn2_on_display_rng")),C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((otmp),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((otmp),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((otmp),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((otmp),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((otmp),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((otmp),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((otmp),"obj","ox").value)*(8*21))+Number(C.field((otmp),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))))))))));
                    C.map_glyphinfo(C.i16(0),C.i16(0),tmpglyph,0,tmpglyphinfo);
                    C.add_menu(win,tmpglyphinfo,any,ilet,C.i8(0),0,clr,C.doname(otmp),0);
                }
            }
            if(Number(!!(C.i32(C.field(C.flags,"flag","sortpack").value)&&C.i32(C.cell((()=>{const old=invlet;invlet=C.ptr((old+Number(1)));return invlet;})(),"char").value)))) continue;
            (invdone=1);
        }
        C.callback(35,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Inventory letters used:"));
        (n=C.select_menu(win,1,selected.address));
        if(Number(n>0)) {
            (ret=C.field(C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
            C.free(selected.value);
        } else (ret=C.i8((Number(!(n))?0:27)));
        /* cancelled */
        C.callback(36,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    }
    return ret;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/*
 * Returns the number of unpaid items within the given list.  This includes
 * contained objects.
 */
export function count_unpaid(list)
{
    list=C.ptr(list);
    let count=0;
    while(list) {
        if(C.field(list,"obj","unpaid").value) (()=>{const old=count;count=C.i32((old+1));return old;})();
        if((Number(C.field((list),"obj","cobj").value!=0))) (count=C.i32(count+count_unpaid(C.field(list,"obj","cobj").value)));
        (list=C.field(list,"obj","nobj").value);
    }
    return count;
}

/*
 * Returns the number of items with b/u/c/unknown within the given list.
 * This does NOT include contained objects.
 *
 * Assumes that the hero sees or touches or otherwise senses the objects
 * at some point:  bknown is forced for priest[ess], like in xname().
 */
export function count_buc(list,type,filterfunc)
{
    list=C.ptr(list);
    type=C.i32(type);
    filterfunc=C.ptr(filterfunc);
    let count=0;
    for(;list;(list=C.field(list,"obj","nobj").value)) {
        /* priests always know bless/curse state */
        if((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))) (C.field(list,"obj","bknown").value=C.u32((Number(C.i32(C.field(list,"obj","oclass").value)!=C.COIN_CLASS))));
        /* some actions exclude some or most items */
        if(Number(!!(filterfunc&&Number(!(C.callback(37,(filterfunc),list)))))) continue;
        /* coins are either uncursed or unknown based upon option setting */
        if(Number(C.i32(C.field(list,"obj","oclass").value)==C.COIN_CLASS)) {
            if(Number(type==((C.i32(C.field(C.flags,"flag","goldX").value)?2048:1024)))) (()=>{const old=count;count=C.i32((old+1));return count;})();
            continue;
        }
        /* check whether this object matches the requested type */
        if((Number(!(C.field(list,"obj","bknown").value))?(Number(type==2048)):(C.i32(C.field(list,"obj","blessed").value)?(Number(type==256)):(C.i32(C.field(list,"obj","cursed").value)?(Number(type==512)):(Number(type==1024)))))) (()=>{const old=count;count=C.i32((old+1));return count;})();
    }
    return count;
}

/* similar to count_buc(), but tallies all states at once
   rather than looking for a specific type */
export function tally_BUCX(list,by_nexthere,bcp,ucp,ccp,xcp,ocp,jcp)
{
    list=C.ptr(list);
    by_nexthere=C.i8(by_nexthere);
    bcp=C.ptr(bcp);
    ucp=C.ptr(ucp);
    ccp=C.ptr(ccp);
    xcp=C.ptr(xcp);
    ocp=C.ptr(ocp);
    jcp=C.ptr(jcp);
    /* Future extensions:
     *  Skip current_container when list is invent, uchain when
     *  first object of list is located on the floor.  'ocp' will then
     *  have a function again (it was a counter for having skipped gold,
     *  but that's not skipped anymore).
     */
    (C.cell(bcp,"int").value=(C.cell(ucp,"int").value=(C.cell(ccp,"int").value=(C.cell(xcp,"int").value=(C.cell(ocp,"int").value=(C.cell(jcp,"int").value=0))))));
    for(;list;(list=((C.i32(by_nexthere)?C.field(C.field(list,"obj","v").address,"vptrs","v_nexthere").value:C.field(list,"obj","nobj").value)))) {
        /* priests always know bless/curse state */
        if((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))) (C.field(list,"obj","bknown").value=C.u32((Number(C.i32(C.field(list,"obj","oclass").value)!=C.COIN_CLASS))));
        if(C.field(list,"obj","pickup_prev").value) (()=>{const ref=C.cell(jcp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
        /* coins are either uncursed or unknown based upon option setting */
        if(Number(C.i32(C.field(list,"obj","oclass").value)==C.COIN_CLASS)) {
            if(C.field(C.flags,"flag","goldX").value) (()=>{const ref=C.cell(xcp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
 else (()=>{const ref=C.cell(ucp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
            continue;
        }
        /* ordinary items */
        if(Number(!(C.field(list,"obj","bknown").value))) (()=>{const ref=C.cell(xcp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
 else if(C.field(list,"obj","blessed").value) (()=>{const ref=C.cell(bcp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
 else if(C.field(list,"obj","cursed").value) (()=>{const ref=C.cell(ccp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
 else (()=>{const ref=C.cell(ucp,"int");const old=ref.value;ref.value=C.i32((old+1));return ref.value;})();
        /* neither blessed nor cursed => uncursed */
    }
}

/* count everything inside a container, or just shop-owned items inside */
export function count_contents(container,nested,quantity,everything,newdrop)
{
    container=C.ptr(container);
    nested=C.i8(nested);
    quantity=C.i8(quantity);
    everything=C.i8(everything);
    newdrop=C.i8(newdrop);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["count_contents.x",2],["count_contents.y",2]]);
    try {
    /* include contents of any nested containers */
    /* count all vs count separate stacks        */
    /* all objects vs only unpaid objects        */
    /* on floor, but hero-owned items haven't
                         * been marked no_charge yet and shop-owned
                         * items are still marked unpaid -- used
                         * when asking the player whether to sell    */
    let otmp; let topc;
    let shoppy=(C.i8(0));
    let count=0n;
    if(Number(!!(Number(!(everything))&&Number(!(newdrop))))) {
        let x=C.local("count_contents.x","short"); let y=C.local("count_contents.y","short");
        for((topc=container);Number(C.i32(C.field(topc,"obj","where").value)==2);(topc=C.field(C.field(topc,"obj","v").address,"vptrs","v_ocontainer").value)) continue;

        if(Number(!!(Number(C.i32(C.field(topc,"obj","where").value)==1)&&C.i32(C.get_obj_location(topc,x.address,y.address,0))))) (shoppy=C.costly_spot(x.value,y.value));
    }
    for((otmp=C.field(container,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(!!(C.i32(nested)&&(Number(C.field((otmp),"obj","cobj").value!=0))))) (count=C.i64(count+count_contents(otmp,nested,quantity,everything,newdrop)));
        if(Number(!!(Number(!!(C.i32(everything)||C.i32(C.field(otmp,"obj","unpaid").value)))||(Number(!!(C.i32(shoppy)&&Number(!(C.field(otmp,"obj","no_charge").value)))))))) (count=C.i64(count+(C.i32(quantity)?C.field(otmp,"obj","quan").value:1n)));
    }
    return count;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function dounpaid(count,floorcount,buriedcount)
{
    count=C.i32(count);
    floorcount=C.i32(floorcount);
    buriedcount=C.i32(buriedcount);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["dounpaid.marker",8],["dounpaid.contbuf",(1*256)],["dounpaid.buf",(1*256)]]);
    try {
    /* unpaid items in inventory */
    /* unpaid items on floor (rare) */
    /* unpaid items under the floor (extremely rare) */
    let win;
    let otmp; let marker=C.local("dounpaid.marker","struct obj *"); let contnr;
    let ilet;
    let invlet=C.field(C.flags,"flag","inv_order").address;
    let classcount; let num_so_far; let xtracount;
    let cost; let totcost;
    (otmp=(marker.value=(contnr=0)));
    (xtracount=C.i32((floorcount+buriedcount)));
    if(Number(!!(Number(count==1)&&Number(!(xtracount))))) {
        (otmp=find_unpaid(C.field(C.gi,"instance_globals_i","invent").value,marker.address));
        (contnr=C.unknwn_contnr_contents(otmp));
    }
    if(Number(!!(otmp&&Number(!(contnr))))) {
        /* 1 item; use pline instead of popup menu */
        (cost=C.unpaid_cost(otmp,C.u8(C.COST_NOCONTENTS)));
        (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old+1));return old;})();
        /* suppress "(unpaid)" suffix */
        C.variadic(72,C.literal("%s"),xprname(otmp,C.distant_name(otmp,C.functionAddress("doname")),C.i8(((Number(C.i32(C.field((otmp),"obj","where").value)==3))?C.i32(C.field(otmp,"obj","invlet").value):62)),(C.i8(1)),cost,0n));
        (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old-1));return old;})();
        return;
    }
    (win=C.callback(38,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    (totcost=0n);
    (num_so_far=0);
    /* count of # printed so far */
    if(Number(!(C.field(C.flags,"flag","invlet_constant").value))) reassign();
    do {
        (classcount=0);
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
            (ilet=C.field(otmp,"obj","invlet").value);
            if(C.field(otmp,"obj","unpaid").value) {
                if(Number(!!(Number(!(C.field(C.flags,"flag","sortpack").value))||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.i32(C.cell(invlet,"char").value))))) {
                    if(Number(!!(C.i32(C.field(C.flags,"flag","sortpack").value)&&Number(!(classcount))))) {
                        C.callback(39,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,let_to_name(C.cell(invlet,"char").value,(C.i8(1)),(C.i8(0))));
                        (()=>{const old=classcount;classcount=C.i32((old+1));return old;})();
                    }
                    (totcost=C.i64(totcost+(cost=C.unpaid_cost(otmp,C.u8(C.COST_NOCONTENTS)))));
                    (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old+1));return old;})();
                    /* suppress "(unpaid)" suffix */
                    C.callback(40,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,xprname(otmp,C.distant_name(otmp,C.functionAddress("doname")),ilet,(C.i8(1)),cost,0n));
                    (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old-1));return old;})();
                    (()=>{const old=num_so_far;num_so_far=C.i32((old+1));return old;})();
                }
            }
        }
    } while(Number(!!(C.i32(C.field(C.flags,"flag","sortpack").value)&&C.i32((C.cell((()=>{const old=invlet;invlet=C.ptr((old+Number(1)));return invlet;})(),"char").value)))));
    if(Number(count>num_so_far)) {
        /* something unpaid is contained */
        if(C.field(C.flags,"flag","sortpack").value) C.callback(41,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,let_to_name(C.i8(62),(C.i8(1)),(C.i8(0))));
        /*
         * Search through the container objects in the inventory for
         * unpaid items.  The top level inventory items have already
         * been listed.
         */
        for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
            if((Number(C.field((otmp),"obj","cobj").value!=0))) {
                let contcost=0n;
                (marker.value=0);
                /* haven't found any */
                while(find_unpaid(C.field(otmp,"obj","cobj").value,marker.address)) {
                    (totcost=C.i64(totcost+(cost=C.unpaid_cost(marker.value,C.u8(C.COST_NOCONTENTS)))));
                    (contcost=C.i64(contcost+cost));
                    if(C.field(otmp,"obj","cknown").value) {
                        (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old+1));return old;})();
                        /* suppress "(unpaid)" sfx */
                        C.callback(42,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,xprname(marker.value,C.distant_name(marker.value,C.functionAddress("doname")),C.i8(62),(C.i8(1)),cost,0n));
                        (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old-1));return old;})();
                    }
                }
                if(Number(!(C.field(otmp,"obj","cknown").value))) {
                    let contbuf=C.automatic("dounpaid.contbuf",(1*256));
                    /* Shopkeeper knows what to charge for contents */
                    C.variadic(73,contbuf,C.literal("%s contents"),C.s_suffix(C.xname(otmp)));
                    C.callback(43,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,xprname(0,contbuf,C.i8(62),(C.i8(1)),contcost,0n));
                }
            }
        }
    }
    if(Number(count>0)) {
        C.callback(44,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
        C.callback(45,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,xprname(0,C.literal("Total:"),C.i8(42),(C.i8(0)),totcost,0n));
    }
    /* an unpaid item can be on the floor if dropped on the shop boundary
       (then possibly moved all the way into the shop during wall repair);
       one can be buried if it started that way and a pit was dug at its
       spot then filled by a boulder (or perhaps a theme room with a pool
       and an unpaid item moved into that by wall repair, then freezing) */
    if(Number(xtracount>0)) {
        /* floorcount + buriedcount > 0 */
        let buf=C.automatic("dounpaid.buf",(1*256));
        let floorverb=((Number(xtracount>1))?C.literal("are"):C.literal("is")); let where=((Number(buriedcount==0))?C.literal("on the floor"):((Number(floorcount==0))?C.literal("under the floor"):C.literal("on or under the floor")));
        /* "under the floor" might actually be "under the floor
               beneath a wall" when shop repair is involved but that seems
               too nit-picky to bother trying to handle here (even more
               extreme description-wise:  "under the floor beneath the
               door/doorway") */
        if(Number(!(count))) {
            C.variadic(74,C.literal("aren't carrying any unpaid items but there %s %d %s."),floorverb,xtracount,where);
        } else {
            C.callback(46,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
            C.variadic(75,buf,C.literal("(There %s %d more unpaid object%s %s.)"),floorverb,xtracount,(((Number((xtracount)==1))?C.literal(""):C.literal("s"))),where);
            C.callback(47,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        }
    }
    if(Number(count>0)) C.callback(48,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),win,(C.i8(0)));
    C.callback(49,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function this_type_only(obj)
{
    obj=C.ptr(obj);
    let res=C.i8((Number(C.i32(C.field(obj,"obj","oclass").value)==C.field(C.gt,"instance_globals_t","this_type").value)));
    if(Number(C.field(C.gt,"instance_globals_t","this_type").value==80)) {
        (res=C.i8(C.field(obj,"obj","pickup_prev").value));
    } else if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        /* if filtering by bless/curse state, gold is classified as
           either unknown or uncursed based on user option setting */
        if(Number(!!(C.field(C.gt,"instance_globals_t","this_type").value&&C.strchr(C.literal("BUCX"),C.field(C.gt,"instance_globals_t","this_type").value)))) (res=C.i8((Number(C.field(C.gt,"instance_globals_t","this_type").value==((C.i32(C.field(C.flags,"flag","goldX").value)?88:85))))));
    } else {
        switch(C.field(C.gt,"instance_globals_t","this_type").value) {
            case (66):
                (res=C.i8((Number(!!(C.i32(C.field(obj,"obj","bknown").value)&&C.i32(C.field(obj,"obj","blessed").value))))));
            break;
            case (85):
                (res=C.i8((Number(!!(C.i32(C.field(obj,"obj","bknown").value)&&Number(!((Number(!!(C.i32(C.field(obj,"obj","blessed").value)||C.i32(C.field(obj,"obj","cursed").value)))))))))));
            break;
            case (67):
                (res=C.i8((Number(!!(C.i32(C.field(obj,"obj","bknown").value)&&C.i32(C.field(obj,"obj","cursed").value))))));
            break;
            case (88):
                (res=C.i8(Number(!(C.field(obj,"obj","bknown").value))));
            break;
            default:
                break;
            /* use 'res' as-is */
        }
    }
    return res;
}

/* the #inventtype command */
export function dotypeinv()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["dotypeinv.types",(1*256)],["dotypeinv.title",(1*128)],["dotypeinv.itemcount",4],["dotypeinv.bcnt",4],["dotypeinv.ccnt",4],["dotypeinv.ucnt",4],["dotypeinv.xcnt",4],["dotypeinv.ocnt",4],["dotypeinv.jcnt",4],["dotypeinv.pick_list",8]]);
    try {
    
    let c=C.i8(0);
    let n; let i=0;
    let extra_types; let types=C.automatic("dotypeinv.types",(1*256)); let title=C.automatic("dotypeinv.title",(1*128));
    let before=C.literal(""); let after=C.literal("");
    let class_count; let oclass; let itemcount=C.local("dotypeinv.itemcount","int"); let any_unpaid; let u_carried; let u_floor; let u_buried;
    let bcnt=C.local("dotypeinv.bcnt","int"); let ccnt=C.local("dotypeinv.ccnt","int"); let ucnt=C.local("dotypeinv.ucnt","int"); let xcnt=C.local("dotypeinv.xcnt","int"); let ocnt=C.local("dotypeinv.ocnt","int"); let jcnt=C.local("dotypeinv.jcnt","int");
    let billx=C.i8(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)&&C.doinvbill(0))));
    let pick_list=C.local("dotypeinv.pick_list","struct mi *");
    let traditional=(C.i8(1));
    doI_done: {
    (C.field(C.gt,"instance_globals_t","this_type").value=0);
    (C.field(C.gt,"instance_globals_t","this_title").value=0);
    if(Number(!!(Number(!(C.field(C.gi,"instance_globals_i","invent").value))&&Number(!(billx))))) {
        C.variadic(76,C.literal("aren't carrying anything."));
        break doI_done; /* source goto doI_done */
    }
    (C.cell((title+Number(0)*1),"char").value=C.i8(0));
    (u_carried=count_unpaid(C.field(C.gi,"instance_globals_i","invent").value));
    (u_floor=count_unpaid(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value));
    (u_buried=count_unpaid(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value));
    (any_unpaid=C.i32((C.i32((u_carried+u_floor))+u_buried)));
    tally_BUCX(C.field(C.gi,"instance_globals_i","invent").value,(C.i8(0)),bcnt.address,ucnt.address,ccnt.address,xcnt.address,ocnt.address,jcnt.address);
    if(Number(C.i32(C.field(C.flags,"flag","menu_style").value)!=0)) {
        if(Number(!!(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==2)||Number(C.i32(C.field(C.flags,"flag","menu_style").value)==3)))) {
            (traditional=(C.i8(0)));
            (i=4);
            if(billx) (i=C.i32(i|64));
            if(bcnt.value) (i=C.i32(i|256));
            if(ucnt.value) (i=C.i32(i|1024));
            if(ccnt.value) (i=C.i32(i|512));
            if(xcnt.value) (i=C.i32(i|2048));
            if(jcnt.value) (i=C.i32(i|4096));
            (i=C.i32(i|2));
            (n=C.query_category(C.staticAddress("dotypeinv.prompt"),C.field(C.gi,"instance_globals_i","invent").value,i,pick_list.address,1));
            if(Number(!(n))) break doI_done; /* source goto doI_done */
            (C.field(C.gt,"instance_globals_t","this_type").value=C.i32((c=C.i8(C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value))));
            C.free(pick_list.value);
        }
    }
    if(traditional) {
        /* collect list of classes of objects carried, for use as a prompt */
        (C.cell((types+Number(0)*1),"char").value=C.i8(0));
        (class_count=C.collect_obj_classes(types,C.field(C.gi,"instance_globals_i","invent").value,(C.i8(0)),0,itemcount.address));
        if(Number(!!(Number(!!(Number(!!(any_unpaid||C.i32(billx)))||Number((C.i32((C.i32((C.i32((bcnt.value+ccnt.value))+ucnt.value))+xcnt.value)))!=0)))||jcnt.value))) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(32));
        if(any_unpaid) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(117));
        if(billx) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(120));
        if(bcnt.value) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(66));
        if(ucnt.value) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(85));
        if(ccnt.value) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(67));
        if(xcnt.value) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(88));
        if(jcnt.value) (C.cell((types+Number((()=>{const old=class_count;class_count=C.i32((old+1));return old;})())*1),"char").value=C.i8(80));
        (C.cell((types+Number(class_count)*1),"char").value=C.i8(0));
        /* add everything not already included; user won't see these */
        (extra_types=C.eos(types));
        (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(27));
        if(Number(!(any_unpaid))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(117));
        if(Number(!(billx))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(120));
        if(Number(!(bcnt.value))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(66));
        if(Number(!(ucnt.value))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(85));
        if(Number(!(ccnt.value))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(67));
        if(Number(!(xcnt.value))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(88));
        if(Number(!(jcnt.value))) (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.i8(80));
        (C.cell(extra_types,"char").value=C.i8(0));
        /* for strchr() */
        for((i=0);Number(i<C.MAXOCLASSES);(()=>{const old=i;i=C.i32((old+1));return old;})()) if(Number(!(C.strchr(types,C.i32(C.field((C.def_oc_syms+Number(i)*C.sizes["struct class_sym"]),"class_sym","sym").value))))) {
            (C.cell((()=>{const old=extra_types;extra_types=C.ptr((old+Number(1)));return old;})(),"char").value=C.field((C.def_oc_syms+Number(i)*C.sizes["struct class_sym"]),"class_sym","sym").value);
            (C.cell(extra_types,"char").value=C.i8(0));
        }

        if(Number(class_count>1)) {
            (c=C.yn_function(C.staticAddress("dotypeinv.prompt"),types,C.i8(0),(C.i8(1))));
            if(Number(C.i32(c)==0)) {
                C.callback(50,(C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),C.global("WIN_MESSAGE").value);
                break doI_done; /* source goto doI_done */
            }
        } else {
            /* only one thing to itemize */
            if(any_unpaid) (c=C.i8(117));
 else if(billx) (c=C.i8(120));
 else (c=C.cell((types+Number(0)*1),"char").value);
        }
    }
    if(Number(!!(Number(C.i32(c)==120)||(Number(!!(Number(!!(Number(C.i32(c)==88)&&C.i32(billx)))&&Number(!(xcnt.value)))))))) {
        if(billx) C.doinvbill(1);
 else C.variadic(77,C.literal("No used-up objects%s."),(any_unpaid?C.literal(" on your shopping bill"):C.literal("")));
        break doI_done; /* source goto doI_done */
    }
    if(Number(!!(Number(C.i32(c)==117)||(Number(!!(Number(!!(Number(C.i32(c)==85)&&any_unpaid))&&Number(!(ucnt.value)))))))) {
        if(any_unpaid) dounpaid(u_carried,u_floor,u_buried);
 else C.variadic(78,C.literal("are not carrying any unpaid objects."));
        break doI_done; /* source goto doI_done */
    }
    if(C.strchr(C.literal("BUCXP"),C.i32(c))) (oclass=C.i32(c));
 else (oclass=C.def_char_to_objclass(c));
    /* not a class but understood by this_type_only() */
    /* change to object class */
    /* this used to be done for the 'if traditional' case but not for the
       menu case; also unlike '$', 'I$' explicitly asks about inventory,
       so we no longer handle coin class differently from other classes */
    /* these are used for traditional when not applicable and also for
       constructing a title to be used by query_objlist() */
    switch(C.i32(c)) {
        case (66):
            (before=C.literal("known to be blessed "));
        break;
        case (85):
            (before=C.literal("known to be uncursed "));
        break;
        case (67):
            (before=C.literal("known to be cursed "));
        break;
        case (88):
            (after=C.literal(" whose blessed/uncursed/cursed status is unknown"));
        break;
        /* better phrasing is desirable */
        case (80):
            (after=C.literal(" that were just picked up"));
        break;
        default:
            /* 'c' is an object class, because we've already handled
           all the non-class letters which were put into 'types[]';
           could/should move object class names[] array from below
           to somewhere above so that we can access it here (via
           lcase(strcpy(classnamebuf, names[(int) c]))), but the
           game-play value of doing so is low... */
            (before=C.literal("such "));
        break;
    }
    if(traditional) {
        if(Number(C.strchr(types,C.i32(c))>C.strchr(types,27))) {
            C.variadic(79,C.literal("have no %sobjects%s."),before,after);
            break doI_done; /* source goto doI_done */
        }
        (C.field(C.gt,"instance_globals_t","this_type").value=oclass);
        /* extra input for this_type_only() */
    }
    if(C.strchr(C.literal("BUCXP"),C.i32(c))) {
        /* the before and after phrases for "you have no..." can both be
           treated as mutually-exclusive suffices when creating a title */
        C.variadic(80,title,C.literal("Items %s"),((Number(!!(before&&C.i32(C.cell(before,"char").value))))?before:after));
        /* get rid of trailing space from 'before' and double-space from
           'after's leading space */
        C.mungspaces(title);
        C.strcat(title,C.literal(":"));
        /* after removing unwanted trailing space */
        (C.field(C.gt,"instance_globals_t","this_title").value=title);
    }
    if(Number(C.query_objlist(0,C.field(C.gi,"instance_globals_i","invent").address,(C.i32((C.i32((((C.i32(C.field(C.flags,"flag","invlet_constant").value)?8:0))|16))|2))),pick_list.address,1,C.functionAddress("this_type_only"))>0)) {
        let otmp=C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value;
        C.free(pick_list.value);
        C.itemactions(otmp);
        /* always returns ECMD_OK */
    }
    } /* source doI_done: */
    (C.field(C.gt,"instance_globals_t","this_type").value=0);
    (C.field(C.gt,"instance_globals_t","this_title").value=0);
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* return a string describing the dungeon feature at <x,y> if there
   is one worth mentioning at that location; otherwise null */
export function dfeature_at(x,y,buf)
{
    x=C.i16(x);
    y=C.i16(y);
    buf=C.ptr(buf);
    let lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    let ltyp=C.i32(C.field(lev,"rm","typ").value); let cmap=C.i32((-1));
    let dfeature=0;
    
    let stway=C.stairway_at(x,y);
    if((Number((ltyp)==C.DOOR))) {
        switch(C.i32(C.field(lev,"rm","flags").value)) {
            case (0):
                (cmap=C.S_ndoor);
            break;
            /* "doorway" */
            case (2):
                (cmap=C.S_vodoor);
            break;
            /* "open door" */
            case (1):
                (dfeature=C.literal("broken door"));
            break;
            default:
                (cmap=C.S_vcdoor);
            break;
            /* "closed door" */
        }
        /* override door description for open drawbridge */
        if(Number(C.is_drawbridge_wall(x,y)>=0)) ((dfeature=C.literal("open drawbridge portcullis")),(cmap=C.i32((-1))));
    } else if((Number((ltyp)==C.FOUNTAIN))) (cmap=C.S_fountain);
 else if((Number((ltyp)==C.THRONE))) (cmap=C.S_throne);
 else if(C.is_lava(x,y)) (cmap=C.S_lava);
 else if(C.is_ice(x,y)) ((dfeature=C.ice_descr(x,y,C.staticAddress("dfeature_at.altbuf"))),(cmap=C.i32((-1))));
 else if(C.is_pool(x,y)) (dfeature=C.literal("pool of water"));
 else if((Number((ltyp)==C.SINK))) (cmap=C.S_sink);
 else if((Number((ltyp)==C.ALTAR))) {
        /* "fountain" */
        /* "opulent throne" */
        /* "molten lava" */
        /* "ice" */
        /* "sink" */
        C.variadic(81,C.staticAddress("dfeature_at.altbuf"),C.literal("%saltar to %s (%s)"),((C.i32((C.i32(C.field(lev,"rm","flags").value)&16)))?C.literal("high "):C.literal("")),C.a_gname(),C.align_str((C.i8((((Number((C.i32(((C.i32((C.i32(C.field(lev,"rm","flags").value)&C.i32((~8)))))&7)))==0))?(C.i32((-128))):((Number((C.i32(((C.i32((C.i32(C.field(lev,"rm","flags").value)&C.i32((~8)))))&7)))==4))?1:C.i32((((C.i32(((C.i32((C.i32(C.field(lev,"rm","flags").value)&C.i32((~8)))))&7))))-2)))))))));
        (dfeature=C.staticAddress("dfeature_at.altbuf"));
    } else if(stway) {
        (dfeature=C.stairs_description(stway,C.staticAddress("dfeature_at.altbuf"),(C.i8(1))));
    } else if(Number(ltyp==C.DRAWBRIDGE_DOWN)) (cmap=C.S_vodbridge);
 else if(Number(ltyp==C.DBWALL)) (cmap=C.S_vcdbridge);
 else if((Number((ltyp)==C.GRAVE))) (cmap=C.S_grave);
 else if(Number(ltyp==C.TREE)) (cmap=C.S_tree);
 else if(Number(ltyp==C.IRONBARS)) (dfeature=C.literal("set of iron bars"));
    /* "lowered drawbridge" */
    /* "raised drawbridge" */
    /* "grave" */
    /* "tree" */
    if(Number(cmap>=0)) (dfeature=C.field((C.defsyms+Number(cmap)*C.sizes["struct symdef"]),"symdef","explanation").value);
    if(dfeature) C.strcpy(buf,dfeature);
    return dfeature;
}

/* look at what is here; if there are many objects (pile_limit or more),
   don't show them unless obj_cnt is 0 */
export function look_here(obj_cnt,lookhere_flags)
{
    obj_cnt=C.i32(obj_cnt);
    lookhere_flags=C.u32(lookhere_flags);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["look_here.fbuf",(1*256)],["look_here.fbuf2",(1*256)],["look_here.regbuf",(1*128)],["look_here.buf",(1*256)]]);
    try {
    /* obj_cnt > 0 implies that autopickup is in progress */
    let otmp;
    let trap;
    let verb=((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("feel"):C.literal("see"));
    let dfeature=0;
    let fbuf=C.automatic("look_here.fbuf",(1*256)); let fbuf2=C.automatic("look_here.fbuf2",(1*256));
    let tmpwin;
    let skip_objects; let felt_cockatrice=(C.i8(0)); let picked_some=C.i8(Number((C.u32((lookhere_flags&1)))!=C.u32(0))); let skip_dfeature=C.i8(Number((C.u32((lookhere_flags&2)))!=C.u32(0)));
    /* skip 'dfeature' if caller used describe_decor() to show it */
    /* default pile_limit is 5; a value of 0 means "never skip"
       (and 1 effectively forces "always skip") */
    (skip_objects=C.i8((Number(!!(Number(C.field(C.flags,"flag","pile_limit").value>0)&&Number(obj_cnt>=C.field(C.flags,"flag","pile_limit").value))))));
    if(C.field(C.u,"you","uswallow").value) {
        let mtmp=C.field(C.u,"you","ustuck").value;
        /*
         * FIXME?
         *  Engulfer's inventory can include worn items (specific case is
         *  Juiblex being created with an amulet as random defensive item)
         *  which will be flagged as "(being worn)".  This code includes
         *  such a worn item under the header "Contents of <mon>'s stomach",
         *  a nifty trick for how/where to wear stuff.  The situation is
         *  rare enough to turn a blind eye.
         *
         *  3.6.3:  Pickup has been changed to decline to pick up a worn
         *  item from inside an engulfer, but if player tries, it just
         *  says "you can't" without giving a reason why (which would be
         *  something along the lines of "because it's worn on the outside
         *  so is unreachable from in here...").
         */
        C.variadic(82,fbuf,C.literal("Contents of %s %s"),C.s_suffix(C.mon_nam(mtmp)),C.mbodypart(mtmp,C.STOMACH));
        /* Skip "Contents of " by using fbuf index 12 */
        C.variadic(83,C.literal("%s to %s what is lying in %s."),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("try"):C.literal("look around")),verb,(fbuf+Number(12)*1));
        (otmp=C.field(mtmp,"monst","minvent").value);
        if(otmp) {
            for(;otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
                /* If swallower is an animal, it should have become stone
                 * but... */
                if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)) feel_cockatrice(otmp,(C.i8(0)));
            }
            if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.strcpy(fbuf,C.literal("You feel"));
            C.strcat(fbuf,C.literal(":"));
            display_minventory(mtmp,C.i32((8|0)),fbuf);
        } else {
            C.variadic(84,C.literal("%s no objects here."),verb);
        }
        return ((Number(!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))?1:0));
    }
    if(Number(!(skip_objects))) {
        let reg;
        let regbuf=C.automatic("look_here.regbuf",(1*128));
        (C.cell((regbuf+Number(0)*1),"char").value=C.i8(0));
        if(Number(((reg=C.visible_region_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))!=0)) C.variadic(85,regbuf,C.literal("a %s cloud"),(C.reg_damg(reg)?C.literal("poison gas"):C.literal("vapor")));
        if(Number(!!(Number(((trap=C.t_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))!=0)&&Number(!(C.field(trap,"trap","tseen").value))))) (trap=(0));
        if(Number(!!(reg||trap))) C.variadic(86,C.literal("is %s%s%s here."),(reg?regbuf:C.literal("")),((Number(!!(reg&&trap)))?C.literal(" and "):C.literal("")),(trap?C.an(C.trapname(C.i32(C.field(trap,"trap","ttyp").value),(C.i8(0)))):C.literal("")));
    }
    (otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value);
    (dfeature=dfeature_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,fbuf2));
    if(Number(!!(Number(!!(dfeature&&Number(!(C.strcmp(dfeature,C.literal("pool of water"))))))&&C.i32((C.field(C.u,"you","uinwater").value))))) (dfeature=0);
    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))) {
        let drift=C.i8(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address)))))))));
        if(Number(!!(dfeature&&Number(!(C.strncmp(dfeature,C.literal("altar "),C.u64(6))))))) {
            /* don't say "altar" twice, dfeature has more info */
            C.variadic(87,C.literal("try to feel what is here."));
        } else if(Number((((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)==C.DRAWBRIDGE_UP))?C.i32(C.db_under_typ(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value))):C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)))==C.ICE)) {
            /* using describe_decor() to handle ice is simpler than
               replicating it in the conditional message construction */
            if(Number(!!(Number(!(C.field(C.flags,"flag","mention_decor").value))||Number(C.i32(C.field(C.iflags,"instance_flags","prev_decor").value)==C.ICE)))) C.force_decor((C.i8(0)));
            /* plain "ice" if blind and levitating, otherwise "solid ice" &c;
              "There is [thin ]ice here.  You try to feel what is on it." */
            C.variadic(88,C.literal("try to feel what is on it."));
            (skip_dfeature=(C.i8(1)));
            /* ice already described */
        } else {
            let cant_reach=C.i8(Number(!(C.can_reach_floor((C.i8(1))))));
            let surf=C.surface(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value); let where=(C.i32(cant_reach)?C.literal("lying beneath you"):C.literal("lying here on the ")); let onwhat=(C.i32(cant_reach)?C.literal(""):surf);
            C.variadic(89,C.literal("try to feel what is %s%s."),(C.i32(drift)?C.literal("floating here"):where),(C.i32(drift)?C.literal(""):onwhat));
            if(Number(!!(Number(!!(dfeature&&Number(!(drift))))&&Number(!(C.strcmp(dfeature,surf)))))) (skip_dfeature=(C.i8(1)));
            /* terrain feature already identified */
        }
        (trap=C.t_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
        if(Number(!(C.can_reach_floor(C.i8(Number(!!(trap&&(Number(!!(Number(C.i32((C.field(trap,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(trap,"trap","ttyp").value))==C.SPIKED_PIT))))))))))) {
            C.variadic(90,C.literal("But you can't reach it!"));
            return 0;
        }
    }
    if(Number(!!(dfeature&&Number(!(skip_dfeature))))) {
        let p;
        let article=1;
        /* 0 => none, 1 => a/an, 2 => the (not used here) */
        /* "molten lava", "iron bars", and plain "ice" are handled as special
           cases in an() but probably shouldn't be; don't rely on that */
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.strcmp(dfeature,C.literal("molten lava"))))||Number(!(C.strcmp(dfeature,C.literal("iron bars"))))))||Number(!(C.strcmp(dfeature,C.literal("ice"))))))||Number(!(C.strncmp(dfeature,C.literal("frozen "),C.u64(7))))))||(Number(!!(Number(((p=C.strchr(dfeature,32)))!=0)&&Number(!(C.strncmpi((p),(C.literal(" ice")),C.i32((-1))))))))))) (article=0);
        /* ice while hallucinating */
        /* thawing ice ("solid ice", "thin ice", &c) */
        if(Number(article==1)) (dfeature=C.an(dfeature));
        /* hardcoded "is" worked here because "iron bars" is actually
           "set of iron bars"; use vtense() instead of relying on that */
        C.variadic(91,fbuf,C.literal("There %s %s here."),C.vtense(dfeature,C.literal("are")),dfeature);
    }
    if(Number(!!(Number(!!(Number(!(otmp))||C.i32(C.is_lava(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))||(Number(!!(C.i32(C.is_pool(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))&&Number(!((C.field(C.u,"you","uinwater").value))))))))) {
        if(Number(!!(dfeature&&Number(!(skip_dfeature))))) C.variadic(92,C.literal("%s"),fbuf);
        C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        /* Eric Backus */
        if(Number(!!(Number(!(skip_objects))&&(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||Number(!(dfeature)))))))) C.variadic(93,C.literal("%s no objects here."),verb);
        return ((Number(!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))?1:0));
    }
    /* we know there is something here */
    if(skip_objects) {
        if(Number(!!(dfeature&&Number(!(skip_dfeature))))) C.variadic(94,C.literal("%s"),fbuf);
        C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        /* Eric Backus */
        if(Number(!!(Number(obj_cnt==1)&&Number(C.field(otmp,"obj","quan").value==1n)))) C.variadic(95,C.literal("is %s object here."),(C.i32(picked_some)?C.literal("another"):C.literal("an")));
 else C.variadic(96,C.literal("are %s%s objects here."),((Number(obj_cnt==2))?C.literal("two"):((Number(obj_cnt<5))?C.literal("a few"):((Number(obj_cnt<10))?C.literal("several"):C.literal("many")))),(C.i32(picked_some)?C.literal(" more"):C.literal("")));
        for(;otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&C.i32(will_feel_cockatrice(otmp,(C.i8(0))))))) {
            C.variadic(97,C.literal("%s %s%s."),((Number(obj_cnt>1))?C.literal("Including"):((Number(C.field(otmp,"obj","quan").value>1n))?C.literal("They're"):C.literal("It's"))),C.corpse_xname(otmp,0,C.u32(8)),(C.i32(C.poly_when_stoned(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value))?C.literal(""):C.literal(", unfortunately")));
            feel_cockatrice(otmp,(C.i8(0)));
            break;
        }

    } else if(Number(!(C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value))) {
        /* only one object */
        if(Number(!!(dfeature&&Number(!(skip_dfeature))))) C.variadic(98,C.literal("%s"),fbuf);
        C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        /* Eric Backus */
        C.variadic(99,C.literal("%s here %s."),verb,C.doname_with_price(otmp));
        (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_ONE_ITEM_HERE);
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)) feel_cockatrice(otmp,(C.i8(0)));
    } else {
        let buf=C.automatic("look_here.buf",(1*256));
        C.callback(51,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),C.global("WIN_MESSAGE").value,(C.i8(0)));
        (tmpwin=C.callback(52,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
        if(Number(!!(dfeature&&Number(!(skip_dfeature))))) {
            C.callback(53,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,fbuf);
            C.callback(54,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,C.literal(""));
        }
        C.variadic(100,buf,C.literal("%s that %s here:"),(C.i32(picked_some)?C.literal("Other things"):C.literal("Things")),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("you feel"):C.literal("are")));
        C.callback(55,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,buf);
        for(;otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) {
            if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&C.i32(will_feel_cockatrice(otmp,(C.i8(0))))))) {
                (felt_cockatrice=(C.i8(1)));
                C.variadic(101,buf,C.literal("%s..."),C.doname(otmp));
                C.callback(56,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,buf);
                break;
            }
            C.callback(57,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,C.doname_with_price(otmp));
        }
        C.callback(58,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),tmpwin,(C.i8(1)));
        C.callback(59,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
        if(felt_cockatrice) feel_cockatrice(otmp,(C.i8(0)));
        C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        /* Eric Backus */
    }
    return ((Number(!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))))?1:0));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* #look command - explicitly look at what is here, including all objects */
export function dolook()
{
    let res;
    /* don't let
       MSGTYPE={norep,noshow} "You see here"
       interfere with feedback from the look-here command */
    C.hide_unhide_msgtypes((C.i8(1)),(C.i32(((C.i32((1<<1)))|(C.i32((1<<2)))))));
    (res=look_here(0,0));
    /* restore normal msgtype handling */
    C.hide_unhide_msgtypes((C.i8(0)),(C.i32(((C.i32((1<<1)))|(C.i32((1<<2)))))));
    return res;
}

export function will_feel_cockatrice(otmp,force_touch)
{
    otmp=C.ptr(otmp);
    force_touch=C.i8(force_touch);
    if(Number(!!(Number(!!(Number(!!((Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||C.i32(force_touch))))&&Number(!(C.global("uarmg").value))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))&&(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&(Number(!!(Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"]))))))))))) return (C.i8(1));
    return (C.i8(0));
}

export function feel_cockatrice(otmp,force_touch)
{
    otmp=C.ptr(otmp);
    force_touch=C.i8(force_touch);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["feel_cockatrice.kbuf",(1*256)]]);
    try {
    let kbuf=C.automatic("feel_cockatrice.kbuf",(1*256));
    if(will_feel_cockatrice(otmp,force_touch)) {
        /* "the <cockatrice> corpse" */
        C.strcpy(kbuf,C.corpse_xname(otmp,0,C.u32(4)));
        if(C.poly_when_stoned(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)) C.variadic(102,C.literal("touched %s with your bare %s."),kbuf,C.makeplural(C.body_part(C.HAND)));
 else C.variadic(103,C.literal("Touching %s is a fatal mistake..."),kbuf);
        /* normalize body shape here; hand, not body_part(HAND) */
        C.variadic(104,kbuf,C.literal("touching %s bare-handed"),C.killer_xname(otmp));
        /* will call polymon() for the poly_when_stoned() case */
        C.instapetrify(kbuf);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* 'obj' is being placed on the floor; if it can merge with something that
   is already there, combine them and discard obj as a separate object */
export function stackobj(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["stackobj.otmp",8]]);
    try {
    let otmp=C.local("stackobj.otmp","struct obj *");
    for((otmp.value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(obj,"obj","ox").value)*(8*21))+Number(C.field(obj,"obj","oy").value)*8),"struct obj *").value);otmp.value;(otmp.value=C.field(C.field(otmp.value,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(!!(Number(otmp.value!=obj)&&merged(obj,otmp.address)))) break;

    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* returns TRUE if obj & otmp can be merged; used in invent.c and mkobj.c */
export function mergable(otmp,obj)
{
    otmp=C.ptr(otmp);
    obj=C.ptr(obj);
    /* potential 'into' stack */
    /* 'combine' stack */
    let objnamelth=C.u64(0); let otmpnamelth=C.u64(0);
    /* fail if already the same object, if different types, if either is
       explicitly marked to prevent merge, or if not mergable in general */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(obj==otmp)||Number(C.i32(C.field(obj,"obj","otyp").value)!=C.i32(C.field(otmp,"obj","otyp").value))))||C.i32(C.field(obj,"obj","nomerge").value)))||C.i32(C.field(otmp,"obj","nomerge").value)))||Number(!(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_merge").value))))) return (C.i8(0));
    /* coins of the same kind will always merge */
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) return (C.i8(1));
    if(Number(!!(Number(C.i32(C.field(obj,"obj","cursed").value)!=C.i32(C.field(otmp,"obj","cursed").value))||Number(C.i32(C.field(obj,"obj","blessed").value)!=C.i32(C.field(otmp,"obj","blessed").value))))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field(obj,"obj","how_lost").value)==4)||Number(C.i32(C.field(otmp,"obj","how_lost").value)==4)))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field(otmp,"obj","how_lost").value)!=0)&&(Number(C.i32(C.field(obj,"obj","how_lost").value)!=C.i32(C.field(otmp,"obj","how_lost").value)))))) return (C.i8(0));
    /* don't require 'bypass' to match; that results in items dropped
         * via 'D' not stacking with compatible items already on the floor;
         * caller who wants that behavior should use 'nomerge' instead */
    if(C.field(obj,"obj","globby").value) return (C.i8(1));
    /* Checks beyond this point either aren't applicable to globs
     * or don't inhibit their merger.
     */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","unpaid").value)!=C.i32(C.field(otmp,"obj","unpaid").value))||Number(C.i32(C.field(obj,"obj","spe").value)!=C.i32(C.field(otmp,"obj","spe").value))))||Number(C.i32(C.field(obj,"obj","no_charge").value)!=C.i32(C.field(otmp,"obj","no_charge").value))))||Number(C.i32(C.field(obj,"obj","obroken").value)!=C.i32(C.field(otmp,"obj","obroken").value))))||Number(C.i32(C.field(obj,"obj","otrapped").value)!=C.i32(C.field(otmp,"obj","otrapped").value))))||Number(C.i32(C.field(obj,"obj","lamplit").value)!=C.i32(C.field(otmp,"obj","lamplit").value))))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.FOOD_CLASS)&&(Number(!!(Number(C.field(obj,"obj","oeaten").value!=C.field(otmp,"obj","oeaten").value)||Number(C.i32(C.field(obj,"obj","oeroded").value)!=C.i32(C.field(otmp,"obj","oeroded").value)))))))) return (C.i8(0));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","dknown").value)!=C.i32(C.field(otmp,"obj","dknown").value))||(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","bknown").value)!=C.i32(C.field(otmp,"obj","bknown").value))&&Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))))))&&(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))))))))||Number(C.i32(C.field(obj,"obj","oeroded").value)!=C.i32(C.field(otmp,"obj","oeroded").value))))||Number(C.i32(C.field(obj,"obj","oeroded2").value)!=C.i32(C.field(otmp,"obj","oeroded2").value))))||Number(C.i32(C.field(obj,"obj","greased").value)!=C.i32(C.field(otmp,"obj","greased").value))))) return (C.i8(0));
    if(Number(!!(C.i32((C.erosion_matters(obj)))&&(Number(!!(Number(C.i32(C.field(obj,"obj","oerodeproof").value)!=C.i32(C.field(otmp,"obj","oerodeproof").value))||(Number(!!(Number(C.i32(C.field(obj,"obj","rknown").value)!=C.i32(C.field(otmp,"obj","rknown").value))&&(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))))))))))))) return (C.i8(0));
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.EGG)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN)))) {
        if(Number(C.field(obj,"obj","corpsenm").value!=C.field(otmp,"obj","corpsenm").value)) return (C.i8(0));
    }
    /* hatching eggs don't merge; ditto for revivable corpses */
    if(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.EGG)&&(Number(!!(C.i32(C.field(obj,"obj","timed").value)||C.i32(C.field(otmp,"obj","timed").value)))))))||(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&Number(C.field(otmp,"obj","corpsenm").value>=C.LOW_PM)))&&(Number(!!((Number(!!(Number(!!(Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_DEATH)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_FAMINE)*C.sizes["struct permonst"]))))||Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"])))))||Number(C.i32(C.field(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mlet").value)==C.S_TROLL)))))))))) return (C.i8(0));
    /* allow candle merging only if their ages are close */
    /* see begin_burn() for a reference for the magic "25" */
    if(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAX_CANDLE))))&&Number(C.i64((C.field(obj,"obj","age").value/C.i64(25)))!=C.i64((C.field(otmp,"obj","age").value/C.i64(25))))))) return (C.i8(0));
    /* burning potions of oil never merge */
    if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_OIL)&&C.i32(C.field(obj,"obj","lamplit").value)))) return (C.i8(0));
    /* don't merge surcharged item with base-cost item */
    if(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)&&Number(!(C.same_price(obj,otmp)))))) return (C.i8(0));
    /* some additional information is always incompatible */
    if(Number(!!(Number(!!(Number(!!((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value))))||(Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omid").value))))))||(Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value))))))||(Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omid").value))))))) return (C.i8(0));
    /* if they have names, make sure they're the same */
    (objnamelth=C.strlen(C.safe_oname(obj)));
    (otmpnamelth=C.strlen(C.safe_oname(otmp)));
    if(Number(!!((Number(!!(Number(objnamelth!=otmpnamelth)&&(Number(!!((Number(!!(objnamelth&&otmpnamelth)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)))))))||(Number(!!(Number(!!(Number(!!(Number(!!(objnamelth&&otmpnamelth))&&(Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value))))))&&(Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","oname").value))))))&&C.strncmp((C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value),(C.field(C.field((otmp),"obj","oextra").value,"oextra","oname").value),objnamelth))))))) return (C.i8(0));
    /* verify pointers before deref for static analyzer */
    /* if one has an attached mail command, other must have same command */
    if((Number(!((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omailcmd").value))))))?(Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value)))):(Number(!!(Number(!((Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value))))))||Number(C.strcmp((C.field(C.field((obj),"obj","oextra").value,"oextra","omailcmd").value),(C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value))!=0)))))) return (C.i8(0));
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_MAIL)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number((C.u32((C.field(obj,"obj","o_id").value%C.u32(2))))!=(C.u32((C.field(otmp,"obj","o_id").value%C.u32(2)))))))) return (C.i8(0));
    /* wished or bones mail and hand written stamped scrolls
           each have two flavors; spe keeps them separate from each
           other but we want to keep their flavors separate too */
    /* should be moot since matching artifacts wouldn't be unique */
    if(Number(C.i32(C.field(obj,"obj","oartifact").value)!=C.i32(C.field(otmp,"obj","oartifact").value))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field(obj,"obj","known").value)!=C.i32(C.field(otmp,"obj","known").value))&&(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))))))) return (C.i8(0));
    return (C.i8(1));
}

/* the #showgold command */
export function doprgold()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doprgold.buf",(1*256)],["doprgold.dollarsign",(1*2)]]);
    try {
    /* Command takes containers into account. */
    let umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value);
    /* Only list the money you know about.  Guards and shopkeepers
       can somehow tell if there is any gold anywhere on your
       person, but you have no such preternatural gold-sense. */
    let hmoney=C.hidden_gold((C.i8(0)));
    if(C.field(C.flags,"flag","verbose").value) {
        let buf=C.automatic("doprgold.buf",(1*256));
        if(Number(!(umoney))) {
            C.strcpy(buf,C.literal("Your wallet is empty"));
        } else {
            C.variadic(105,buf,C.literal("Your wallet contains %ld %s"),umoney,currency(umoney));
        }
        if(hmoney) {
            C.variadic(106,C.eos(buf),C.literal(", %s you have %ld %s stashed away in your pack"),(umoney?C.literal("and"):C.literal("but")),hmoney,(umoney?C.literal("more"):currency(hmoney)));
        }
        C.variadic(107,C.literal("%s."),buf);
    } else {
        let total=C.i64((umoney+hmoney));
        if(total) C.variadic(108,C.literal("are carrying a total of %ld %s."),total,currency(total));
 else C.variadic(109,C.literal("have no money."));
    }
    C.shopper_financial_report();
    if(Number(!!(umoney&&C.i32(C.field(C.iflags,"instance_flags","menu_requested").value)))) {
        let dollarsign=C.automatic("doprgold.dollarsign",(1*2)); C.copy(dollarsign,C.literal("$"),(1*2));
        /* mustn't use TRUE or gold wouldn't show up unless it was quivered */
        dispinv_with_action(dollarsign,(C.i8(0)),0);
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* the #seeweapon command */
export function doprwep()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doprwep.lets",(1*4)]]);
    try {
    if(Number(!(C.global("uwep").value))) {
        C.variadic(110,C.literal("are %s."),C.empty_handed());
    } else if(Number(!(C.field(C.iflags,"instance_flags","menu_requested").value))) {
        prinv(0,C.global("uwep").value,0n);
        if(C.field(C.u,"you","twoweap").value) prinv(0,C.global("uswapwep").value,0n);
    } else {
        let lets=C.automatic("doprwep.lets",(1*4));
        /* 4: uwep, uswapwep, uquiver, terminator */
        let ct=0;
        /* obj_to_let() will assign letters to all of invent if necessary
           (for '!fixinv') so doesn't need to be repeated once called here */
        (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uwep").value));
        if(C.global("uswapwep").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=C.field(C.global("uswapwep").value,"obj","invlet").value);
        if(C.global("uquiver").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=C.field(C.global("uquiver").value,"obj","invlet").value);
        (C.cell((lets+Number(ct)*1),"char").value=C.i8(0));
        dispinv_with_action(lets,(C.i8(1)),0);
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* caller is responsible for checking !wearing_armor() */
export function noarmor(report_uskin)
{
    report_uskin=C.i8(report_uskin);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["noarmor.buf",(1*256)]]);
    try {
    if(Number(!!(Number(!(C.global("uskin").value))||Number(!(report_uskin))))) {
        C.variadic(111,C.literal("are not wearing any armor."));
    } else {
        let p; let uskinname; let buf=C.automatic("noarmor.buf",(1*256));
        (uskinname=C.strcpy(buf,C.simpleonames(C.global("uskin").value)));
        /* shorten "set of <color> dragon scales" to "<color> scales"
           and "<color> dragon scale mail" to "<color> scale mail" */
        if(Number(!(C.strncmpi(uskinname,C.literal("set of "),7)))) (uskinname=C.ptr(uskinname+Number(7)*1));
        if(Number(((p=C.strstri(uskinname,C.literal(" dragon "))))!=0)) while(Number(C.i32(((C.cell((p+Number(1)*1),"char").value=C.cell((p+Number(8)*1),"char").value)))!=0)) (()=>{const old=p;p=C.ptr((old+Number(1)));return p;})();

        C.variadic(112,C.literal("are not wearing armor but have %s embedded in your skin."),uskinname);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* the #seearmor command */
export function doprarm()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doprarm.lets",(1*8)]]);
    try {
    /*
     * Note:  players sometimes get here by pressing a function key which
     * transmits ''ESC [ <something>'' rather than by pressing '[';
     * there's nothing we can--or should-do about that here.
     */
    if(Number(!(wearing_armor()))) {
        noarmor((C.i8(1)));
    } else {
        let lets=C.automatic("doprarm.lets",(1*8));
        /* 8: up to 7 pieces of armor plus terminator */
        let ct=0;
        /* obj_to_let() will assign letters to all of invent if necessary
           (for '!fixinv') so doesn't need to be repeated once called, but
           each armor slot doesn't know whether any that precede have made
           that call so just do it for each one; use SORTPACK_INUSE order */
        if(C.global("uarm").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarm").value));
        if(C.global("uarmc").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarmc").value));
        if(C.global("uarms").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarms").value));
        if(C.global("uarmh").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarmh").value));
        if(C.global("uarmg").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarmg").value));
        if(C.global("uarmf").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarmf").value));
        if(C.global("uarmu").value) (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uarmu").value));
        (C.cell((lets+Number(ct)*1),"char").value=C.i8(0));
        dispinv_with_action(lets,(C.i8(1)),0);
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* the #seerings command */
export function doprring()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doprring.lets",(1*3)]]);
    try {
    if(Number(!!(Number(!(C.global("uleft").value))&&Number(!(C.global("uright").value))))) {
        C.variadic(113,C.literal("are not wearing any rings."));
    } else {
        let lets=C.automatic("doprring.lets",(1*3));
        /* 3: uright, uleft, terminator */
        let use_inuse_mode=(C.i8(0));
        let ct=0;
        /* if either ring is a meat ring, switch to use_inuse_mode in order
           to label it/them as "Rings" rather than "Comestibles" */
        if(C.global("uright").value) {
            (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uright").value));
            if(Number(C.i32(C.field(C.global("uright").value,"obj","oclass").value)!=C.RING_CLASS)) (use_inuse_mode=(C.i8(1)));
        }
        if(C.global("uleft").value) {
            (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(C.global("uleft").value));
            if(Number(C.i32(C.field(C.global("uleft").value,"obj","oclass").value)!=C.RING_CLASS)) (use_inuse_mode=(C.i8(1)));
        }
        (C.cell((lets+Number(ct)*1),"char").value=C.i8(0));
        /* also switch to use_inuse_mode if there are two rings or player
           used the 'm' prefix */
        if(Number(!!(Number(ct>1)||C.i32(C.field(C.iflags,"instance_flags","menu_requested").value)))) (use_inuse_mode=(C.i8(1)));
        dispinv_with_action(lets,use_inuse_mode,((Number(ct==1))?C.literal("Ring"):C.literal("Rings")));
        /* note; alternate label will be ignored
                                      if 'use_inuse_mode' is False */
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* the #seeamulet command */
export function dopramulet()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["dopramulet.lets",(1*2)]]);
    try {
    if(Number(!(C.global("uamul").value))) {
        C.variadic(114,C.literal("are not wearing an amulet."));
    } else {
        let lets=C.automatic("dopramulet.lets",(1*2));
        /* using display_inventory() instead of prinv() allows player
           to use 'm "' to force and menu and be able to choose amulet
           in order to perform a context-sensitive item action */
        ((C.cell((lets+Number(0)*1),"char").value=obj_to_let(C.global("uamul").value)),(C.cell((lets+Number(1)*1),"char").value=C.i8(0)));
        dispinv_with_action(lets,(C.i8(1)),C.literal("Amulet"));
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* is 'obj' a tool that's in use?  can't simply check obj->owornmask */
export function tool_being_used(obj)
{
    obj=C.ptr(obj);
    /*
     * [Should this also include lit potions of oil?  They're not tools
     *  but they are "in use" without being noticeable via obj->owornmask.]
     */
    if(Number((C.i64((C.field(obj,"obj","owornmask").value&(C.i64((524288n|1048576n))))))!=0n)) return (C.i8(1));
    if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.TOOL_CLASS)) return (C.i8(0));
    /* [don't actually need to check uwep here; caller catches it] */
    return C.i8((Number(!!(Number(!!(Number(obj==C.global("uwep").value)||C.i32(C.field(obj,"obj","lamplit").value)))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)&&C.field(obj,"obj","corpsenm").value)))))));
}

/* the #seetools command */
export function doprtool()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doprtool.lets",(1*53)]]);
    try {
    let otmp;
    let ct=0;
    let lets=C.automatic("doprtool.lets",(1*53));
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(tool_being_used(otmp)) {
        /* we could be carrying more than 52 items; theoretically they
               might all be lit candles so avoid potential lets[] overflow */
        if(Number(ct>=C.i32((C.i32(BigInt((1*53)))-1)))) break;
        (C.cell((lets+Number((()=>{const old=ct;ct=C.i32((old+1));return old;})())*1),"char").value=obj_to_let(otmp));
    }

    (C.cell((lets+Number(ct)*1),"char").value=C.i8(0));
    if(Number(!(ct))) C.variadic(115,C.literal("are not using any tools."));
 else dispinv_with_action(lets,(C.i8(1)),0);
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* the #seeall command; combines the ')' + '[' + '=' + '"' + '(' commands;
   show inventory of all currently wielded, worn, or used objects */
export function doprinuse()
{
    let otmp;
    let ct=0;
    /* no longer need to collect letters; sortloot() takes care of it, but
       still want to count far enough to know whether anything is in use */
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(is_inuse(otmp)) {
        (()=>{const old=ct;ct=C.i32((old+1));return ct;})();
        break;
    }

    if(Number(!(ct))) C.variadic(116,C.literal("are not wearing or wielding anything."));
 else dispinv_with_action(0,(C.i8(1)),0);
    return 0;
}

/*
 * uses up an object that's on the floor, charging for it as necessary
 */
export function useupf(obj,numused)
{
    obj=C.ptr(obj);
    numused=C.i64(numused);
    let otmp;
    let at_u=C.i8((Number(!!(Number(C.i32((C.field(obj,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(obj,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value))))));
    /* burn_floor_objects() keeps an object pointer that it tries to
     * useupf() multiple times, so obj must survive if plural */
    if(Number(C.field(obj,"obj","quan").value>numused)) (otmp=C.splitobj(obj,numused));
 else (otmp=obj);
    if(Number(!!(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))&&C.i32(C.costly_spot(C.field(otmp,"obj","ox").value,C.field(otmp,"obj","oy").value))))) {
        if(C.strchr(C.field(C.u,"you","urooms").address,C.i32(C.cell(C.in_rooms(C.field(otmp,"obj","ox").value,C.field(otmp,"obj","oy").value,0),"char").value))) C.addtobill(otmp,(C.i8(0)),(C.i8(0)),(C.i8(0)));
 else C.stolen_value(otmp,C.field(otmp,"obj","ox").value,C.field(otmp,"obj","oy").value,(C.i8(0)),(C.i8(0)));
    }
    delobj(otmp);
    if(Number(!!(Number(!!(C.i32(at_u)&&C.i32(C.field(C.u,"you","uundetected").value)))&&(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(128n))))!=C.u64(0n)))))) C.hideunder(C.field(C.gy,"instance_globals_y","youmonst").address);
}

/*
 * Conversion from a class to a string for printing.
 * This must match the object class order.
 */
export function let_to_name(let_,unpaid,showsym)
{
    let_=C.i8(let_);
    unpaid=C.i8(unpaid);
    showsym=C.i8(showsym);
    let ocsymfmt=C.literal("  ('%c')");
    let invbuf_sympadding=8;
    /* arbitrary */
    let class_name;
    let pos;
    let oclass=((Number(!!(Number(C.i32(let_)>=1)&&Number(C.i32(let_)<C.MAXOCLASSES))))?C.i32(let_):0);
    let len;
    if(oclass) (class_name=C.cell((C.staticAddress("names")+Number(oclass)*8),"char *").value);
 else if(Number(((pos=C.strchr(C.staticAddress("oth_symbols"),C.i32(let_))))!=0)) (class_name=C.cell((C.staticAddress("oth_names")+Number(C.i64(((pos-C.staticAddress("oth_symbols"))/1)))*8),"char *").value);
 else (class_name=C.cell((C.staticAddress("names")+Number(C.ILLOBJ_CLASS)*8),"char *").value);
    (len=C.u32(C.u64((C.u64((C.u64(C.Strlen_(class_name,(C.literal("let_to_name")),4816))+((C.i32(unpaid)?BigInt((1*8)):BigInt((1*1))))))+C.u64(((oclass?(C.u32((C.Strlen_(ocsymfmt,(C.literal("let_to_name")),4817)+C.u32(invbuf_sympadding)))):C.u32(0))))))));
    if(Number(len>C.field(C.gi,"instance_globals_i","invbufsiz").value)) {
        if(C.field(C.gi,"instance_globals_i","invbuf").value) C.free(C.field(C.gi,"instance_globals_i","invbuf").value);
        (C.field(C.gi,"instance_globals_i","invbufsiz").value=C.u32((len+C.u32(10))));
        /* add slop to reduce incremental realloc */
        (C.field(C.gi,"instance_globals_i","invbuf").value=C.alloc(C.field(C.gi,"instance_globals_i","invbufsiz").value));
    }
    if(unpaid) C.strcat(C.strcpy(C.field(C.gi,"instance_globals_i","invbuf").value,C.literal("Unpaid ")),class_name);
 else C.strcpy(C.field(C.gi,"instance_globals_i","invbuf").value,class_name);
    if(Number(!!((Number(oclass!=0))&&C.i32(showsym)))) {
        let bp=C.eos(C.field(C.gi,"instance_globals_i","invbuf").value);
        let mlen=C.i32(C.u32((C.u32(invbuf_sympadding)-C.Strlen_(class_name,(C.literal("let_to_name")),4830))));
        while(Number((()=>{const old=mlen;mlen=C.i32((old-1));return mlen;})()>0)) {
            (C.cell(bp,"char").value=C.i8(32));
            (()=>{const old=bp;bp=C.ptr((old+Number(1)));return old;})();
        }
        (C.cell(bp,"char").value=C.i8(0));
        C.variadic(117,C.eos(C.field(C.gi,"instance_globals_i","invbuf").value),ocsymfmt,C.i32(C.field((C.def_oc_syms+Number(oclass)*C.sizes["struct class_sym"]),"class_sym","sym").value));
    }
    return C.field(C.gi,"instance_globals_i","invbuf").value;
}

/* release the static buffer used by let_to_name() */
export function free_invbuf()
{
    if(C.field(C.gi,"instance_globals_i","invbuf").value) (C.free(C.field(C.gi,"instance_globals_i","invbuf").value),(C.field(C.gi,"instance_globals_i","invbuf").value=0));
    (C.field(C.gi,"instance_globals_i","invbufsiz").value=C.u32(0));
}

/* give consecutive letters to every item in inventory (for !fixinv mode);
   gold is always forced to '$' slot at head of list */
export function reassign()
{
    let i;
    let obj; let prevobj; let goldobj;
    /* first, remove [first instance of] gold from invent, if present */
    (prevobj=(goldobj=0));
    for((obj=C.field(C.gi,"instance_globals_i","invent").value);obj;((prevobj=obj),(obj=C.field(obj,"obj","nobj").value))) if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        (goldobj=obj);
        if(prevobj) (C.field(prevobj,"obj","nobj").value=C.field(goldobj,"obj","nobj").value);
 else (C.field(C.gi,"instance_globals_i","invent").value=C.field(goldobj,"obj","nobj").value);
        break;
    }

    /* second, re-letter the rest of the list */
    for(((obj=C.field(C.gi,"instance_globals_i","invent").value),(i=0));obj;((obj=C.field(obj,"obj","nobj").value),(()=>{const old=i;i=C.i32((old+1));return old;})())) (C.field(obj,"obj","invlet").value=C.i8(((Number(i<26))?(C.i32((97+i))):((Number(i<52))?(C.i32((C.i32((65+i))-26))):35))));

    /* third, assign gold the "letter" '$' and re-insert it at head */
    if(goldobj) {
        (C.field(goldobj,"obj","invlet").value=C.i8(C.GOLD_SYM));
        (C.field(goldobj,"obj","nobj").value=C.field(C.gi,"instance_globals_i","invent").value);
        (C.field(C.gi,"instance_globals_i","invent").value=goldobj);
    }
    if(Number(i>=52)) (i=C.i32((52-1)));
    (C.field(C.gl,"instance_globals_l","lastinvnr").value=i);
}

/* invent gold sanity check; used by doorganize() to control how getobj()
   deals with gold and also by wizard mode sanity_check() */
export function check_invent_gold(why)
{
    why=C.ptr(why);
    /* 'why' == caller in case of warning */
    let otmp;
    let goldstacks=0; let wrongslot=0;
    /* there should be at most one stack of gold in invent, in slot '$' */
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) {
        (()=>{const old=goldstacks;goldstacks=C.i32((old+1));return goldstacks;})();
        if(Number(C.i32(C.field(otmp,"obj","invlet").value)!=C.GOLD_SYM)) (()=>{const old=wrongslot;wrongslot=C.i32((old+1));return wrongslot;})();
    }

    if(Number(!!(Number(goldstacks>1)||Number(wrongslot>0)))) {
        C.variadic(118,C.literal("%s: %s%s%s"),why,((Number(wrongslot>1))?C.literal("gold in wrong slots"):((Number(wrongslot>0))?C.literal("gold in wrong slot"):C.literal(""))),((Number(!!(Number(wrongslot>0)&&Number(goldstacks>1))))?C.literal(" and "):C.literal("")),((Number(goldstacks>1))?C.literal("multiple gold stacks"):C.literal("")));
        return (C.i8(1));
        /* gold can be #adjusted */
    }
    return (C.i8(0));
    /* gold can't be #adjusted */
}

/* normal getobj callback for item to #adjust; excludes gold */
export function adjust_ok(obj)
{
    obj=C.ptr(obj);
    if(Number(!!(Number(!(obj))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)))) return C.GETOBJ_EXCLUDE;
    return C.GETOBJ_SUGGEST;
}

/* getobj callback for item to #adjust if gold is wonky; allows gold */
export function adjust_gold_ok(obj)
{
    obj=C.ptr(obj);
    if(Number(!(obj))) return C.GETOBJ_EXCLUDE;
    return C.GETOBJ_SUGGEST;
}

/* #adjust command
 *
 *      User specifies a 'from' slot for inventory stack to move,
 *      then a 'to' slot for its destination.  Open slots and those
 *      filled by compatible stacks are listed as likely candidates
 *      but user can pick any inventory letter (including 'from').
 *
 *  to == from, 'from' has a name
 *      All compatible items (same name or no name) are gathered
 *      into the 'from' stack.  No count is allowed.
 *  to == from, 'from' does not have a name
 *      All compatible items without a name are gathered into the
 *      'from' stack.  No count is allowed.  Compatible stacks with
 *      names are left as-is.
 *  to != from, no count
 *      Move 'from' to 'to'.  If 'to' is not empty, merge 'from'
 *      into it if possible, otherwise swap it with the 'from' slot.
 *  to != from, count given
 *      If the user specifies a count when choosing the 'from' slot,
 *      and that count is less than the full size of the stack,
 *      then the stack will be split.  The 'count' portion is moved
 *      to the destination, and the only candidate for merging with
 *      it is the stack already at the 'to' slot, if any.  When the
 *      destination is non-empty but won't merge, whatever is there
 *      will be moved to an open slot; if there isn't any open slot
 *      available, the adjustment attempt fails.
 *
 *      To minimize merging for 'from == to', unnamed stacks will
 *      merge with named 'from' but named ones won't merge with
 *      unnamed 'from'.  Otherwise attempting to collect all unnamed
 *      stacks would lump the first compatible named stack with them
 *      and give them its name.
 *
 *      To maximize merging for 'from != to', compatible stacks will
 *      merge when either lacks a name (or they already have the same
 *      name).  When no count is given and one stack has a name and
 *      the other doesn't, the merged result will have that name.
 *      However, when splitting results in a merger, the name of the
 *      destination overrides that of the source, even if destination
 *      is unnamed and source is named.
 *
 *      Gold is only a candidate to adjust if we've somehow managed
 *      to get multiple stacks and/or it is in a slot other than '$'.
 *      Specifying a count to split it into two stacks is not allowed.
 */
export function doorganize()
{
    /* inventory organizer by Del Lamb */
    let adjust_filter;
    let obj;
    /* when no invent, or just gold in '$' slot, there's nothing to adjust */
    if(Number(!!(Number(!(C.field(C.gi,"instance_globals_i","invent").value))||(Number(!!(Number(!!(Number(C.i32(C.field(C.field(C.gi,"instance_globals_i","invent").value,"obj","oclass").value)==C.COIN_CLASS)&&Number(C.i32(C.field(C.field(C.gi,"instance_globals_i","invent").value,"obj","invlet").value)==C.GOLD_SYM)))&&Number(!(C.field(C.field(C.gi,"instance_globals_i","invent").value,"obj","nobj").value)))))))) {
        C.variadic(119,C.literal("aren't carrying anything %s."),(Number(!(C.field(C.gi,"instance_globals_i","invent").value))?C.literal("to adjust"):C.literal("adjustable")));
        return 0;
    }
    if(Number(!(C.field(C.flags,"flag","invlet_constant").value))) reassign();
    /* filter passed to getobj() depends upon gold sanity */
    (adjust_filter=(C.i32(check_invent_gold(C.literal("adjust")))?C.functionAddress("adjust_gold_ok"):C.functionAddress("adjust_ok")));
    /* get object the user wants to organize (the 'from' slot) */
    (obj=getobj(C.literal("adjust"),adjust_filter,C.u32(C.i32((2|1)))));
    return doorganize_core(obj);
}

/* alternate version of #adjust used by itemactions() for splitting */
export function adjust_split()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["adjust_split.splitamount",8]]);
    try {
    let obj;
    let splitamount=C.local("adjust_split.splitamount","long",0n);
    let let_; let dig=C.i8(0);
    /* invlet should be queued so no getobj prompting is expected */
    (obj=getobj(C.literal("split"),C.functionAddress("adjust_ok"),C.u32(0)));
    if(Number(!!(Number(!!(Number(!(obj))||Number(C.field(obj,"obj","quan").value<2n)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.GOLD_PIECE)))) return 4;
    /* caller has set things up to avoid this */
    if(Number(C.field(obj,"obj","quan").value==2n)) {
        (splitamount.value=1n);
    } else {
        /* get first digit; doesn't wait for <return> */
        (dig=C.yn_function(C.literal("Split off how many?"),0,C.i8(0),(C.i8(1))));
        if(Number(!(C.digit(dig)))) {
            C.variadic(120,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
            return 2;
        }
        /* got first digit, get more until next non-digit (except for
           backspace/delete which will take away most recent digit and
           keep going; we expect one of ' ', '\n', or '\r') */
        (let_=C.get_count(0,dig,0n,splitamount.address,C.u32(C.i32((4|2)))));
        /* yn_function() added the first digit to the
                           prompt when recording message history; have
                           get_count() display "Count: N" when waiting
                           for additional digits (ordinarily that won't be
                           shown until a second digit is entered) and also
                           add "Count: N" to message history if more than
                           one digit gets entered or the original N is
                           deleted and replaced with different digit */
        /* \033 is in quitchars[] so we need to check for it separately
           in order to treat it as cancel rather than as accept */
        if(Number(!!(Number(!!(Number(!(let_))||Number(C.i32(let_)==27)))||Number(!(C.strchr(C.quitchars,C.i32(let_))))))) {
            C.variadic(121,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
            return 2;
        }
    }
    if(Number(!!(Number(splitamount.value<1n)||Number(splitamount.value>=C.field(obj,"obj","quan").value)))) {
        
        if(Number(splitamount.value<1n)) C.variadic(122,C.literal("%s at least 1."),C.staticAddress("adjust_split.Amount"));
 else C.variadic(123,C.literal("%s less than %ld."),C.staticAddress("adjust_split.Amount"),C.field(obj,"obj","quan").value);
        return 2;
    }
    /* normally a split would take place in getobj() if player supplies
       a count there, so doorganize_core() figures out 'splitamount'
       from the object; it will undo the split if player cancels while
       selecting the destination slot */
    (obj=C.splitobj(obj,splitamount.value));
    return doorganize_core(obj);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function doorganize_core(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["doorganize_core.otmp",8],["doorganize_core.splitting",8],["doorganize_core.lets",(1*55)],["doorganize_core.qbuf",(1*128)]]);
    try {
    let otmp=C.local("doorganize_core.otmp","struct obj *"); let splitting=C.local("doorganize_core.splitting","struct obj *"); let bumped;
    let ix; let cur; let trycnt;
    let let_;
    /* past gold+2*26 letters */
    let lets=C.automatic("doorganize_core.lets",(1*55));
    /* room for '$a-zA-Z#\0' */
    let qbuf=C.automatic("doorganize_core.qbuf",(1*128));
    let objname; let otmpname;
    let adj_type;
    let ever_mind=(C.i8(0)); let collect; let isgold;
    if(Number(!(obj))) return 2;
    /* can only be gold if check_invent_gold() found a problem:  multiple '$'
       stacks and/or gold in some other slot, otherwise (*adjust_filter)()
       won't allow gold to be picked; if player has picked any stack of gold
       as #adjust 'from' slot, we'll force the 'to' slot to be '$' below */
    (isgold=C.i8((Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS))));
    /* figure out whether user gave a split count to getobj() */
    (splitting.value=(bumped=0));
    for((otmp.value=C.field(C.gi,"instance_globals_i","invent").value);otmp.value;(otmp.value=C.field(otmp.value,"obj","nobj").value)) if(Number(C.field(otmp.value,"obj","nobj").value==obj)) {
        /* knowledge of splitobj() operation */
        if(Number(C.i32(C.field(otmp.value,"obj","invlet").value)==C.i32(C.field(obj,"obj","invlet").value))) (splitting.value=otmp.value);
        break;
    }

    /* initialize the list with all lower and upper case letters */
    (C.cell((lets+Number(0)*1),"char").value=C.i8(((Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS))?C.GOLD_SYM:32)));
    for(((ix=1),(let_=C.i8(97)));Number(C.i32(let_)<=122);) (C.cell((lets+Number((()=>{const old=ix;ix=C.i32((old+1));return old;})())*1),"char").value=(()=>{const old=let_;let_=C.i8((old+1));return old;})());

    for((let_=C.i8(65));Number(C.i32(let_)<=90);) (C.cell((lets+Number((()=>{const old=ix;ix=C.i32((old+1));return old;})())*1),"char").value=(()=>{const old=let_;let_=C.i8((old+1));return old;})());

    (C.cell((lets+Number((C.i32((1+C.invlet_basic))))*1),"char").value=C.i8(32));
    (C.cell((lets+Number(C.u64((BigInt((1*55))-C.u64(1))))*1),"char").value=C.i8(0));
    /* for floating inv letters, truncate list after the first open slot */
    if(Number(!!(Number(!(C.field(C.flags,"flag","invlet_constant").value))&&Number(((ix=C.inv_cnt((C.i8(0)))))<C.invlet_basic)))) (C.cell((lets+Number(C.i32((ix+((splitting.value?1:2)))))*1),"char").value=C.i8(0));
    /* blank out all the letters currently in use in the inventory
       except those that will be merged with the selected object */
    for((otmp.value=C.field(C.gi,"instance_globals_i","invent").value);otmp.value;(otmp.value=C.field(otmp.value,"obj","nobj").value)) if(Number(!!(Number(otmp.value!=obj)&&Number(!(mergable(otmp.value,obj)))))) {
        (let_=C.field(otmp.value,"obj","invlet").value);
        if(Number(!!(Number(C.i32(let_)>=97)&&Number(C.i32(let_)<=122)))) (C.cell((lets+Number(C.i32((C.i32((1+C.i32(let_)))-97)))*1),"char").value=C.i8(32));
 else if(Number(!!(Number(C.i32(let_)>=65)&&Number(C.i32(let_)<=90)))) (C.cell((lets+Number(C.i32((C.i32((C.i32((1+C.i32(let_)))-65))+26)))*1),"char").value=C.i8(32));
 else if(Number(C.i32(let_)==35)) (C.cell((lets+Number((C.i32((1+C.invlet_basic))))*1),"char").value=C.i8(35));
        /* overflow defaults to off, but it we find a stack using that
               slot, switch to on -- the opposite of normal invlet handling */
    }

    /* compact the list by removing all the blanks */
    for((ix=(cur=0));C.cell((lets+Number(ix)*1),"char").value;(()=>{const old=ix;ix=C.i32((old+1));return old;})()) if(Number(!!(Number(C.i32(C.cell((lets+Number(ix)*1),"char").value)!=32)&&Number((()=>{const old=cur;cur=C.i32((old+1));return old;})()<ix)))) (C.cell((lets+Number(C.i32((cur-1)))*1),"char").value=C.cell((lets+Number(ix)*1),"char").value);

    (C.cell((lets+Number(cur)*1),"char").value=C.i8(0));
    /* and by dashing runs of letters */
    if(Number(cur>5)) compactify(lets);
    /* get 'to' slot to use as destination */
    if(Number(!(splitting.value))) C.strcpy(qbuf,C.literal("Adjust letter"));
 else C.variadic(124,qbuf,C.literal("Split %ld"),C.field(obj,"obj","quan").value);
    /* note: splitting->quan is the amount being left in original slot */
    C.variadic(125,C.eos(qbuf),C.literal(" to what [%s]%s?"),lets,(C.field(C.gi,"instance_globals_i","invent").value?C.literal(" (? see used letters)"):C.literal("")));
    adjust_input: for((trycnt=1);;(()=>{const old=trycnt;trycnt=C.i32((old+1));return trycnt;})()) {
        noadjust: {
            (let_=C.i8((Number(!(isgold))?C.i32(C.yn_function(qbuf,0,C.i8(0),(C.i8(1)))):C.GOLD_SYM)));
            if(Number(!!(Number(C.i32(let_)==63)||Number(C.i32(let_)==42)))) {
                (let_=display_used_invlets(C.i8((splitting.value?C.i32(C.field(obj,"obj","invlet").value):0))));
                if(Number(!(let_))) continue;
                if(Number(C.i32(let_)==27)) break noadjust; /* source goto noadjust */
            }
    if(Number(!!(C.strchr(C.quitchars,C.i32(let_))||(Number(!!(splitting.value&&Number(C.i32(let_)==C.i32(C.field(obj,"obj","invlet").value)))))))) {break noadjust;} else if(Number(!!(Number(C.i32(let_)==C.GOLD_SYM)&&Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)))) {
        /* adjusting to same slot is meaningful since all
               compatible stacks get collected along the way,
               but splitting to same slot is not */
        C.variadic(126,C.literal("Only gold coins may be moved into the '%c' slot."),C.GOLD_SYM);
        (ever_mind=(C.i8(1)));
        break noadjust; /* source goto noadjust */
    }

    /* letter() classifies '@' as one; compactify() can put '-' in lets;
           the only thing of interest that strchr() might find is '$' or '#'
           since letter() catches everything else that we put into lets[] */
    if(Number(!!((Number(!!(C.i32(C.letter(let_))&&Number(C.i32(let_)!=64))))||(Number(!!(C.strchr(lets,C.i32(let_))&&Number(C.i32(let_)!=45))))))) break adjust_input;
            /* got one */
            if(Number(trycnt==5)) break noadjust; /* source goto noadjust */
            C.variadic(127,C.literal("Select an inventory slot letter."));
            continue adjust_input;
        } /* source noadjust: */
        if(splitting.value) merged(splitting.address,obj);
        if(Number(!(ever_mind))) C.variadic(128,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
        return 0;
    }
    /* else try again */
    (collect=C.i8((Number(C.i32(let_)==C.i32(C.field(obj,"obj","invlet").value)))));
    /* change the inventory and print the resulting item */
    (adj_type=(C.i32(collect)?C.literal("Collecting:"):(Number(!(splitting.value))?C.literal("Moving:"):C.literal("Splitting:"))));
    /*
     * don't use freeinv/addinv to avoid double-touching artifacts,
     * dousing lamps, losing luck, cursing loadstone, etc.
     */
    C.extract_nobj(obj,C.field(C.gi,"instance_globals_i","invent").address);
    for((otmp.value=C.field(C.gi,"instance_globals_i","invent").value);otmp.value;) {
        (otmpname=((Number(!!(C.field((otmp.value),"obj","oextra").value&&(C.field(C.field((otmp.value),"obj","oextra").value,"oextra","oname").value))))?(C.field(C.field((otmp.value),"obj","oextra").value,"oextra","oname").value):0));
        /* it's tempting to pull this outside the loop, but merged() could
           free ONAME(obj) [via obfree()] and replace it with ONAME(otmp) */
        (objname=((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value))))?(C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value):0));
        if(collect) {
            /* Collecting: #adjust an inventory stack into its same slot;
               keep it there and merge other compatible stacks into it.
               Traditional inventory behavior is to merge unnamed stacks
               with compatible named ones; we only want that if it is
               the 'from' stack (obj) with a name and candidate (otmp)
               without one, not unnamed 'from' with named candidate. */
            if(Number(!!((Number(!!(Number(!(otmpname))||(Number(!!(objname&&Number(!(C.strcmp(objname,otmpname)))))))))&&merged(otmp.address,obj)))) {
                /*adj_type = "Collecting:"; //already set to this*/
                (obj=otmp.value);
                (otmp.value=C.field(otmp.value,"obj","nobj").value);
                C.extract_nobj(obj,C.field(C.gi,"instance_globals_i","invent").address);
                continue;
                /* otmp has already been updated */
            }
        } else if(Number(C.i32(C.field(otmp.value,"obj","invlet").value)==C.i32(let_))) {
            /* Merging: when from and to are compatible */
            if(Number(!!((Number(!!(Number(!(otmpname))||(Number(!!(objname&&Number(!(C.strcmp(objname,otmpname)))))))))&&merged(otmp.address,obj)))) {
                (adj_type=C.literal("Merging:"));
                (obj=otmp.value);
                (otmp.value=C.field(otmp.value,"obj","nobj").value);
                C.extract_nobj(obj,C.field(C.gi,"instance_globals_i","invent").address);
                break;
                /* otmp has been updated and we're done merging */
            }
            /* Moving or splitting: don't merge extra compatible stacks.
               Found 'otmp' in destination slot; merge if compatible,
               otherwise bump whatever is there to an open slot. */
            if(Number(!(splitting.value))) {
                (adj_type=C.literal("Swapping:"));
                (C.field(otmp.value,"obj","invlet").value=C.field(obj,"obj","invlet").value);
            } else {
                /* strip 'from' name if it has one */
                if(Number(!!(objname&&Number(!(C.field(obj,"obj","oartifact").value))))) ((C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value)=0);
                if(Number(!(mergable(otmp.value,obj)))) {
                    /* won't merge; put 'from' name back */
                    if(objname) ((C.field(C.field((obj),"obj","oextra").value,"oextra","oname").value)=objname);
                } else {
                    /* will merge; discard 'from' name */
                    if(objname) (C.free(objname),(objname=0));
                }
                if(merged(otmp.address,obj)) {
                    (adj_type=C.literal("Splitting and merging:"));
                    (obj=otmp.value);
                    C.extract_nobj(obj,C.field(C.gi,"instance_globals_i","invent").address);
                } else if(Number(C.inv_cnt((C.i8(0)))>=C.invlet_basic)) {
                    merged(splitting.address,obj);
                    /* undo split */
                    /* "knapsack cannot accommodate any more items" */
                    C.variadic(129,C.literal("pack is too full."));
                    return 0;
                } else {
                    (bumped=otmp.value);
                    C.extract_nobj(bumped,C.field(C.gi,"instance_globals_i","invent").address);
                }
            }
            /* moving vs splitting */
            break;
            /* not collecting and found 'to' slot */
        }
        /* collect */
        (otmp.value=C.field(otmp.value,"obj","nobj").value);
    }
    /* inline addinv; insert loose object at beginning of inventory */
    (C.field(obj,"obj","invlet").value=let_);
    (C.field(obj,"obj","nobj").value=C.field(C.gi,"instance_globals_i","invent").value);
    (C.field(obj,"obj","where").value=C.i8(3));
    (C.field(C.gi,"instance_globals_i","invent").value=obj);
    reorder_invent();
    if(bumped) {
        /* splitting the 'from' stack is causing an incompatible
           stack in the 'to' slot to be moved into an open one;
           we need to do another inline insertion to inventory */
        assigninvlet(bumped);
        (C.field(bumped,"obj","nobj").value=C.field(C.gi,"instance_globals_i","invent").value);
        (C.field(bumped,"obj","where").value=C.i8(3));
        (C.field(C.gi,"instance_globals_i","invent").value=bumped);
        reorder_invent();
    }
    /* messages deferred until inventory has been fully reestablished */
    prinv(adj_type,obj,0n);
    if(bumped) prinv(C.literal("Moving:"),bumped,0n);
    if(splitting.value) C.clear_splitobjs();
    /* reset splitobj context */
    update_inventory();
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* common to display_minventory and display_cinventory */
export function invdisp_nothing(hdr,txt)
{
    hdr=C.ptr(hdr);
    txt=C.ptr(txt);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["invdisp_nothing.selected",8]]);
    try {
    let win;
    let selected=C.local("invdisp_nothing.selected","struct mi *");
    (win=C.callback(60,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(61,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    C.add_menu_heading(win,hdr);
    C.add_menu_str(win,C.literal(""));
    C.add_menu_str(win,txt);
    C.callback(62,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,0);
    if(Number(C.select_menu(win,0,selected.address)>0)) C.free(selected.value);
    C.callback(63,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* query_objlist callback: return things that are worn or wielded */
export function worn_wield_only(obj)
{
    obj=C.ptr(obj);
    /* check for things that *are* worn or wielded (only used for monsters,
       so we don't worry about excluding W_CHAIN, W_ARTI and the like) */
    return C.i8((Number(C.field(obj,"obj","owornmask").value!=0n)));
    /* this used to check for things that *might* be worn or wielded,
       but that's not particularly interesting */
}

/*
 * Display a monster's inventory.
 * Returns a pointer to the object from the monster's inventory selected
 * or NULL if nothing was selected.
 *
 * By default, only worn and wielded items are displayed.  The caller
 * can pick one.  Modifier flags are:
 *
 *      PICK_NONE, PICK_ONE - standard menu control
 *      PICK_ANY            - allowed, but we only return a single object
 *      MINV_NOLET          - nothing selectable
 *      MINV_ALL            - display all inventory
 */
export function display_minventory(mon,dflags,title)
{
    mon=C.ptr(mon);
    dflags=C.i32(dflags);
    title=C.ptr(title);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["display_minventory.tmp",(1*128)],["display_minventory.selected",8]]);
    try {
    /* monster whose minvent we're showing */
    /* control over what to display */
    /* menu title */
    let ret;
    let tmp=C.automatic("display_minventory.tmp",(1*128));
    let n;
    let selected=C.local("display_minventory.selected","struct mi *",0);
    let do_all=Number((C.i32((dflags&8)))!=0); let incl_hero=(Number(!!(do_all&&(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&(Number(C.field(C.u,"you","ustuck").value==(mon))))))))); let have_inv=(Number(C.field(mon,"monst","minvent").value!=0)); let have_any=(Number(!!(have_inv||incl_hero))); let pickings=(C.i32((dflags&3)));
    C.variadic(130,tmp,C.literal("%s %s:"),C.s_suffix(C.noit_Monnam(mon)),(do_all?C.literal("possessions"):C.literal("armament")));
    if((do_all?have_any:(Number(!!(C.field(mon,"monst","misc_worn_check").value||(C.field((mon),"monst","mw").value)))))) {
        /* Fool the 'weapon in hand' routine into
         * displaying 'weapon in claw', etc. properly.
         */
        (C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value=C.field(mon,"monst","data").value);
        /* in case inside a shop, don't append "for sale" prices */
        (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old+1));return old;})();
        (n=C.query_objlist((title?title:tmp),C.field(mon,"monst","minvent").address,(C.i32((16|((incl_hero?256:0))))),selected.address,pickings,(do_all?C.functionAddress("allow_all"):C.functionAddress("worn_wield_only"))));
        (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old-1));return old;})();
        /* was 'set_uasmon();' but that potentially has side-effects */
        (C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value=(C.mons+Number(C.field(C.u,"you","umonnum").value)*C.sizes["struct permonst"]));
        /* basic part of set_uasmon() */
    } else {
        invdisp_nothing((title?title:tmp),C.literal("(none)"));
        (n=0);
    }
    if(Number(n>0)) {
        (ret=C.field(C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
        C.free(selected.value);
    } else (ret=0);
    return ret;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* format a container name for cinventory_display(), inserting "trapped"
   if that's appropriate */
export function cinv_doname(obj)
{
    obj=C.ptr(obj);
    let result=C.doname(obj);
    /*
     * If obj->tknown ever gets implemented, doname() will handle this.
     * Assumes that probing reveals the trap prior to calling us.  Since
     * we lack that flag, hero forgets about it as soon as we're done....
     */
    /* 'result' is an obuf[] but might point into the middle (&buf[PREFIX])
       rather than the beginning and we don't have access to that;
       assume that there is at least QBUFSZ available when reusing it */
    if(Number(!!(C.i32(C.field(obj,"obj","otrapped").value)&&Number(C.u64((C.strlen(result)+BigInt((1*9))))<=C.u64(128))))) {
        /* obj->lknown has been set before calling us so either "locked" or
           "unlocked" should always be present (for a trapped container) */
        let p=C.strstri(result,C.literal(" locked")); let q=C.strstri(result,C.literal(" unlocked"));
        if(Number(!!(p&&(Number(!!(Number(!(q))||Number(p<q))))))) C.strsubst(p,C.literal(" locked "),C.literal(" trapped locked "));
 else if(q) C.strsubst(q,C.literal(" unlocked "),C.literal(" trapped unlocked "));
        /* might need to change "an" to "a"; when no BUC is present,
           "an unlocked" yielded "an trapped unlocked" above */
        C.strsubst(result,C.literal("an trapped "),C.literal("a trapped "));
    }
    return result;
}

/* used by safe_qbuf() if the full doname() result is too long */
export function cinv_ansimpleoname(obj)
{
    obj=C.ptr(obj);
    let result=C.ansimpleoname(obj);
    /* result is an obuf[] so we know this will always fit */
    if(C.field(obj,"obj","otrapped").value) {
        if(C.strncmp(result,C.literal("a "),C.u64(2))) C.strsubst(result,C.literal("a "),C.literal("a trapped "));
 else if(C.strncmp(result,C.literal("an "),C.u64(3))) C.strsubst(result,C.literal("an "),C.literal("an trapped "));
 else if(C.strncmp(result,C.literal("the "),C.u64(4))) C.strsubst(result,C.literal("the "),C.literal("the trapped "));
 else C.strsubst(result,C.literal(""),C.literal("trapped "));
        /* unique container? nethack doesn't have any */
        /* no leading article at all? shouldn't happen with ansimpleoname() */
        /* insert at beginning */
    }
    return result;
}

/* Display the contents of a container in inventory style.
   Used for wand of probing of non-empty containers and statues. */
export function display_cinventory(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["display_cinventory.qbuf",(1*128)],["display_cinventory.selected",8]]);
    try {
    let ret;
    let qbuf=C.automatic("display_cinventory.qbuf",(1*128));
    let n;
    let selected=C.local("display_cinventory.selected","struct mi *",0);
    C.safe_qbuf(qbuf,C.literal("Contents of "),C.literal(":"),obj,C.functionAddress("cinv_doname"),C.functionAddress("cinv_ansimpleoname"),C.literal("that"));
    /* custom formatting routines to insert "trapped"
                        into the object's name when appropriate;
                        last resort "that" won't ever get used */
    if(C.field(obj,"obj","cobj").value) {
        (n=C.query_objlist(qbuf,C.field(obj,"obj","cobj").address,16,selected.address,0,C.functionAddress("allow_all")));
    } else {
        invdisp_nothing(qbuf,C.literal("(empty)"));
        (n=0);
    }
    if(Number(n>0)) {
        (ret=C.field(C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
        C.free(selected.value);
    } else (ret=0);
    (C.field(obj,"obj","cknown").value=C.u32(1));
    return ret;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function only_here(obj)
{
    obj=C.ptr(obj);
    return C.i8((Number(!!(Number(C.i32(C.field(obj,"obj","ox").value)==C.i32(C.field(C.field(C.go,"instance_globals_o","only").address,"nhcoord","x").value))&&Number(C.i32(C.field(obj,"obj","oy").value)==C.i32(C.field(C.field(C.go,"instance_globals_o","only").address,"nhcoord","y").value))))));
}

/*
 * Display a list of buried or underwater items in inventory style.
 * Return a non-zero value if there were items at that spot.
 *
 * Currently, this is only used with a wand of probing zapped downwards.
 */
export function display_binventory(x,y,as_if_seen)
{
    x=C.i16(x);
    y=C.i16(y);
    as_if_seen=C.i8(as_if_seen);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["display_binventory.qbuf",(1*128)],["display_binventory.selected",8]]);
    try {
    let obj;
    let qbuf=C.automatic("display_binventory.qbuf",(1*128));
    let underwhat=C.literal("here");
    let selected=C.local("display_binventory.selected","struct mi *",0);
    let n; let n2=0;
    /* if hero is levitating or flying over water or lava, list any items
       below (the map won't be showing them); if hero is underwater, player
       should use the normal look_here command instead of probing (caller
       has already used bhitpile() which will have set dknown on all items) */
    if(Number(!!(Number(!!(C.i32(C.is_pool_or_lava(x,y))&&Number(!((C.field(C.u,"you","uinwater").value)))))&&Number(((obj=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value))!=0)))) {
        let real_liquid=(C.i32(C.is_pool(x,y))?C.literal("water"):C.literal("lava")); let seen_liquid=C.hliquid(real_liquid);
        if(Number(!(C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value))) {
            let more_than_1=C.i8((Number(!!(Number(C.field((obj),"obj","quan").value!=1n)||(Number(!!(Number(C.i32(C.field((obj),"obj","oartifact").value)==C.ART_EYES_OF_THE_OVERWORLD)&&Number(!(C.undiscovered_artifact(C.i16(C.ART_EYES_OF_THE_OVERWORLD)))))))))));
            C.variadic(131,C.literal("%s %s under the %s here."),(C.i32(more_than_1)?C.literal("are"):C.literal("is")),C.doname(obj),seen_liquid);
            (n2=1);
            /* "pair of boots" is singular but "beneath it" sounds strange */
            if((Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.LENSES)||(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.ARMOR_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.ARM_GLOVES))))))||(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.ARMOR_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.ARM_BOOTS)))))))) (more_than_1=(C.i8(1)));
            (underwhat=(C.i32(more_than_1)?C.literal("under them"):C.literal("beneath it")));
        } else {
            C.variadic(132,qbuf,C.literal("Things that are under the %s here:"),seen_liquid);
            if(Number(C.query_objlist(qbuf,((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),1,selected.address,0,C.functionAddress("allow_all"))>0)) (C.free(selected.value),(selected.value=0));
            for((n2=0);obj;(obj=C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value)) (()=>{const old=n2;n2=C.i32((old+1));return n2;})();

            (underwhat=C.literal("beneath them"));
        }
    }
    /* count # of buried objects here */
    for(((n=0),(obj=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value));obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!(Number(C.i32(C.field(obj,"obj","ox").value)==C.i32(x))&&Number(C.i32(C.field(obj,"obj","oy").value)==C.i32(y))))) {
        if(as_if_seen) C.observe_object(obj);
        (()=>{const old=n;n=C.i32((old+1));return old;})();
    }

    if(n) {
        (C.field(C.field(C.go,"instance_globals_o","only").address,"nhcoord","x").value=x);
        (C.field(C.field(C.go,"instance_globals_o","only").address,"nhcoord","y").value=y);
        /* "buried here", but vary if we've already shown underwater items */
        C.variadic(133,qbuf,C.literal("Things that are buried %s:"),underwhat);
        if(Number(C.query_objlist(qbuf,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").address,16,selected.address,0,C.functionAddress("only_here"))>0)) C.free(selected.value);
        (C.field(C.field(C.go,"instance_globals_o","only").address,"nhcoord","x").value=(C.field(C.field(C.go,"instance_globals_o","only").address,"nhcoord","y").value=C.i16(0)));
    }
    return C.i32((n+n2));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function prepare_perminvent(window)
{
    window=C.i32(window);
    let wri;
    let invmode=C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value);
    if(Number(C.cell(C.staticAddress("perminv_flags"),"int").value!=invmode)) {
        C.copy(C.staticAddress("wri_info"),C.zerowri,C.sizes["struct win_request_info_t"]);
        (C.field(C.field(C.staticAddress("wri_info"),"win_request_info_t","fromcore").address,"from_core","invmode").value=C.i32(invmode));
        /*  relay the mode settings to the window port */
        (wri=C.callback(64,(C.field(C.windowprocs,"window_procs","win_ctrl_nhwindow").value),window,C.set_mode,C.staticAddress("wri_info")));
        (C.cell(C.staticAddress("perminv_flags"),"int").value=invmode);
        ((wri));
    }
}

export function sync_perminvent()
{
    
    let wport_id;
    if(Number(C.global("WIN_INVEN").value==(C.i32((-1))))) {
        if(Number(!!((Number(!!(C.field(C.gc,"instance_globals_c","core_invent_state").value||(C.i64((C.field(C.field(C.staticAddress("wri_info"),"win_request_info_t","tocore").address,"to_core","tocore_flags").value&C.i64(C.prohibited)))))))&&Number(!((Number(!!(C.i32(C.cell(C.staticAddress("in_perm_invent_toggled"),"signed char").value)&&Number(C.field(C.gp,"instance_globals_p","perm_invent_toggling_direction").value==C.toggling_on))))))))) return;
    }
    prepare_perminvent(C.global("WIN_INVEN").value);
    if((Number(!!(Number(!(C.field(C.iflags,"instance_flags","perm_invent").value))&&C.field(C.gc,"instance_globals_c","core_invent_state").value)))) {
        /* Odd - but this could be end-of-game disclosure
         * which just sets boolean iflags.perm_invent to
         * FALSE without actually doing anything else.
         */
        /* TRUE means negated */
        C.docrt();
        return;
    }
    /*
     * The following conditions can bring us to here:
     * 1. iflags.perm_invent is on
     *      AND
     *    gc.core_invent_state is still zero.
     * OR
     * 2. iflags.perm_invent is off, but we're in the
     *    midst of toggling it on.
     * OR
     * 3. iflags.perminv_mode has been changed via 'm O'.
     */
    if(Number(!!((Number(!!(C.i32(C.field(C.iflags,"instance_flags","perm_invent").value)&&Number(!(C.field(C.gc,"instance_globals_c","core_invent_state").value)))))||(Number(!!(Number(!(C.field(C.iflags,"instance_flags","perm_invent").value))&&(Number(!!(C.i32(C.cell(C.staticAddress("in_perm_invent_toggled"),"signed char").value)&&Number(C.field(C.gp,"instance_globals_p","perm_invent_toggling_direction").value==C.toggling_on)))))))))) {
        /* Send windowport a request to return the related settings to us */
        if(Number(!!((Number(!!(C.i32(C.field(C.iflags,"instance_flags","perm_invent").value)&&Number(!(C.field(C.gc,"instance_globals_c","core_invent_state").value)))))||C.i32(C.cell(C.staticAddress("in_perm_invent_toggled"),"signed char").value)))) {
            (C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value=C.callback(65,(C.field(C.windowprocs,"window_procs","win_ctrl_nhwindow").value),C.global("WIN_INVEN").value,C.request_settings,C.staticAddress("wri_info")));
            if(Number(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value!=0)) {
                if(Number((C.i64((C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","tocore_flags").value&C.i64((C.too_early)))))!=C.i64(0))) {
                    /* don't be too noisy about this as it's really
                     * a startup timing issue. Just set a marker. */
                    (C.field(C.iflags,"instance_flags","perm_invent_pending").value=(C.i8(1)));
                    return;
                }
                if(Number((C.i64((C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","tocore_flags").value&C.i64((C.i32((C.too_small|C.prohibited)))))))!=C.i64(0))) {
                    /* sizes aren't good enough */
                    if(Number((C.i64((C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","tocore_flags").value&C.i64(C.prohibited))))!=C.i64(0))) {
                        C.set_option_mod_status(C.literal("perm_invent"),C.set_gameview);
                        C.set_option_mod_status(C.literal("perminv_mode"),C.set_gameview);
                    }
                    (C.field(C.iflags,"instance_flags","perm_invent").value=(C.i8(0)));
                    if(Number(C.global("WIN_INVEN").value!=(C.i32((-1))))) (C.callback(66,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),C.global("WIN_INVEN").value),(C.global("WIN_INVEN").value=(C.i32((-1)))));
                    (wport_id=((Number(C.u32(C.field(C.windowprocs,"window_procs","wp_id").value)==C.u32(C.wp_tty)))?C.literal("tty perm_invent"):C.literal("perm_invent")));
                    C.variadic(134,C.literal("%s could not be enabled."),wport_id);
                    C.variadic(135,C.literal("%s needs a terminal that is at least %dx%d, yours is %dx%d."),wport_id,C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","needrows").value,C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","needcols").value,C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","haverows").value,C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","havecols").value);
                    C.callback(67,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
                    return;
                }
            }
            (()=>{const ref=C.field(C.gc,"instance_globals_c","core_invent_state");const old=ref.value;ref.value=C.i32((old+1));return old;})();
        }
    }
    if(Number(!!(Number(!(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value))||Number(C.field(C.field(C.cell(C.staticAddress("sync_perminvent.wri"),"struct win_request_info_t *").value,"win_request_info_t","tocore").address,"to_core","maxslot").value==0)))) return;
    if(Number(!!(C.i32(C.cell(C.staticAddress("in_perm_invent_toggled"),"signed char").value)&&Number(C.field(C.gp,"instance_globals_p","perm_invent_toggling_direction").value==C.toggling_on)))) {
        (C.global("WIN_INVEN").value=C.callback(68,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    }
    if(Number(!!(Number(C.global("WIN_INVEN").value!=(C.i32((-1))))&&C.field(C.program_state,"sinfo","beyond_savefile_load").value))) {
        (C.field(C.gi,"instance_globals_i","in_sync_perminvent").value=1);
        display_inventory(0,(C.i8(0)));
        (C.field(C.gi,"instance_globals_i","in_sync_perminvent").value=0);
    }
}

export function perm_invent_toggled(negated)
{
    negated=C.i8(negated);
    (C.cell(C.staticAddress("in_perm_invent_toggled"),"signed char").value=(C.i8(1)));
    if(negated) {
        (C.field(C.gp,"instance_globals_p","perm_invent_toggling_direction").value=C.toggling_off);
        if(Number(C.global("WIN_INVEN").value!=(C.i32((-1))))) (C.callback(69,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),C.global("WIN_INVEN").value),(C.global("WIN_INVEN").value=(C.i32((-1)))));
        (C.field(C.gc,"instance_globals_c","core_invent_state").value=0);
    } else {
        (C.field(C.gp,"instance_globals_p","perm_invent_toggling_direction").value=C.toggling_on);
        if(Number(C.i32(C.field(C.iflags,"instance_flags","perminv_mode").value)==C.InvOptNone)) (C.field(C.iflags,"instance_flags","perminv_mode").value=C.u8(C.InvOptOn));
        /* all inventory except gold */
        sync_perminvent();
    }
    (C.field(C.gp,"instance_globals_p","perm_invent_toggling_direction").value=C.toggling_not);
    (C.cell(C.staticAddress("in_perm_invent_toggled"),"signed char").value=(C.i8(0)));
}

/*invent.c*/
export const inventStaticInitializers = C => [
    {name:"wri_info",type:"struct win_request_info_t",size:C.sizes["struct win_request_info_t"],values:null},
    {name:"perminv_flags",type:"int",size:4,values:C.InvOptNone},
    {name:"in_perm_invent_toggled",type:"signed char",size:1,values:null},
    {name:"venom_inv",type:"char[2]",size:(1*2),values:[C.i8(C.VENOM_CLASS),C.i8(0)]},
    {name:"inuse_headers",type:"char *[5]",size:(8*5),values:[C.literal(""),C.literal("Miscellaneous"),C.literal("Worn Armor"),C.literal("Wielded/Readied Weapons"),C.literal("Accessories")]},
    {name:"loot_classify.def_srt_order",type:"char[18]",size:(1*18),values:[C.i8(C.COIN_CLASS),C.i8(C.AMULET_CLASS),C.i8(C.RING_CLASS),C.i8(C.WAND_CLASS),C.i8(C.POTION_CLASS),C.i8(C.SCROLL_CLASS),C.i8(C.SPBOOK_CLASS),C.i8(C.GEM_CLASS),C.i8(C.FOOD_CLASS),C.i8(C.TOOL_CLASS),C.i8(C.WEAPON_CLASS),C.i8(C.ARMOR_CLASS),C.i8(C.ROCK_CLASS),C.i8(C.BALL_CLASS),C.i8(C.CHAIN_CLASS),C.i8(0)]},
    {name:"loot_classify.armcat",type:"char[8]",size:(1*8),values:null},
    {name:"sortloot.zerosli",type:"struct sortloot_item",size:C.sizes["struct sortloot_item"],values:null},
    {name:"currencies",type:"char *[21]",size:(8*21),values:[C.literal("Altarian Dollar"),C.literal("Ankh-Morpork Dollar"),C.literal("auric"),C.literal("buckazoid"),C.literal("cirbozoid"),C.literal("credit chit"),C.literal("cubit"),C.literal("Flanian Pobble Bead"),C.literal("fretzer"),C.literal("imperial credit"),C.literal("Hong Kong Luna Dollar"),C.literal("kongbuck"),C.literal("nanite"),C.literal("quatloo"),C.literal("simoleon"),C.literal("solari"),C.literal("spacebuck"),C.literal("sporebuck"),C.literal("Triganic Pu"),C.literal("woolong"),C.literal("zorkmid")]},
    {name:"getobj.only_one",type:"char[29]",size:(1*29),values:C.literal("can only throw one at a time")},
    {name:"safeq_xprn_ctx",type:"struct xprnctx",size:C.sizes["struct xprnctx"],values:null},
    {name:"removeables",type:"char[6]",size:(1*6),values:[C.i8(C.ARMOR_CLASS),C.i8(C.WEAPON_CLASS),C.i8(C.RING_CLASS),C.i8(C.AMULET_CLASS),C.i8(C.TOOL_CLASS),C.i8(0)]},
    {name:"xprname.li",type:"char[256]",size:(1*256),values:null},
    {name:"display_pickinv.not_carrying_anything",type:"char[22]",size:(1*22),values:C.literal("Not carrying anything")},
    {name:"display_pickinv.not_using_anything",type:"char[20]",size:(1*20),values:C.literal("Not using any items")},
    {name:"display_pickinv.only_carrying_gold",type:"char[19]",size:(1*19),values:C.literal("Only carrying gold")},
    {name:"dotypeinv.prompt",type:"char[49]",size:(1*49),values:C.literal("What type of object do you want an inventory of?")},
    {name:"dfeature_at.altbuf",type:"char[256]",size:(1*256),values:null},
    {name:"names",type:"char *[18]",size:(8*18),values:[0,C.literal("Illegal objects"),C.literal("Weapons"),C.literal("Armor"),C.literal("Rings"),C.literal("Amulets"),C.literal("Tools"),C.literal("Comestibles"),C.literal("Potions"),C.literal("Scrolls"),C.literal("Spellbooks"),C.literal("Wands"),C.literal("Coins"),C.literal("Gems/Stones"),C.literal("Boulders/Statues"),C.literal("Iron balls"),C.literal("Chains"),C.literal("Venoms")]},
    {name:"oth_symbols",type:"char[2]",size:(1*2),values:[C.i8(62),C.i8(0)]},
    {name:"oth_names",type:"char *[1]",size:(8*1),values:[C.literal("Bagged/Boxed items")]},
    {name:"adjust_split.Amount",type:"char[43]",size:(1*43),values:C.literal("Amount to split from current stack must be")},
    {name:"sync_perminvent.wri",type:"struct win_request_info_t *",size:8,values:0},
];
