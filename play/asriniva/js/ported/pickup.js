import { C } from './c-runtime.js';
/* NetHack 5.0	pickup.c	$NHDT-Date: 1773373633 2026/03/12 19:47:13 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.386 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */
/*
 *      Contains code for picking objects up, and container use.
 */
/* from invent.c */
/* not used */
/* define for query_objlist() and autopickup() */
/* if you can figure this out, give yourself a hearty pat on the back... */
/* BUG: this lets you look at cockatrice corpses while blind without
   touching them */
/* much simpler version of the look-here code; used by query_classes() */
export function simple_look(otmp,here)
{
    otmp=C.ptr(otmp);
    here=C.i8(here);
    /* list of objects */
    /* flag for type of obj list linkage */
    /* Neither of the first two cases is expected to happen, since
     * we're only called after multiple classes of objects have been
     * detected, hence multiple objects must be present.
     */
    if(Number(!(otmp))) {
        C.variadic(0,C.literal("simple_look(null)"));
    } else if(Number(!(((C.i32(here)?C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value:C.field(otmp,"obj","nobj").value))))) {
        C.variadic(1,C.literal("%s"),C.doname(otmp));
    } else {
        let tmpwin=C.indirect(0,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4);
        C.indirect(1,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,C.literal(""));
        do {
            C.indirect(2,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,C.doname(otmp));
            (otmp=(C.i32(here)?C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value:C.field(otmp,"obj","nobj").value));
        } while(otmp);
        C.indirect(3,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),tmpwin,(C.i8(1)));
        C.indirect(4,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    }
}

export function collect_obj_classes(ilets,otmp,here,filter,itemcount)
{
    ilets=C.ptr(ilets);
    otmp=C.ptr(otmp);
    here=C.i8(here);
    filter=C.ptr(filter);
    itemcount=C.ptr(itemcount);
    let iletct=0;
    let c;
    (C.cell(itemcount,"int").value=0);
    (C.cell((ilets+Number(iletct)*1),"char").value=C.i8(0));
    /* terminate ilets so that strchr() will work */
    while(otmp) {
        (c=C.field((C.def_oc_syms+Number(C.i32(C.field(otmp,"obj","oclass").value))*C.sizes["struct class_sym"]),"class_sym","sym").value);
        if(Number(!!(Number(!(C.strchr(ilets,C.i32(c))))&&(Number(!!(Number(!(filter))||C.i32(C.indirect(5,(filter),otmp)))))))) ((C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=c),(C.cell((ilets+Number(iletct)*1),"char").value=C.i8(0)));
        (C.cell(itemcount,"int").value=C.i32(C.cell(itemcount,"int").value+1));
        (otmp=(C.i32(here)?C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value:C.field(otmp,"obj","nobj").value));
    }
    return iletct;
}

/*
 * For menustyle:Traditional and menustyle:Combination.
 *
 * Suppose some '?' and '!' objects are present, but '/' objects aren't:
 *      "a" picks all items without further prompting;
 *      "A" steps through all items, asking one by one;
 *      "?" steps through '?' items, asking, and ignores '!' ones;
 *      "/" becomes 'A', since no '/' present;
 *      "?a" or "a?" picks all '?' without further prompting;
 *      "/a" or "a/" becomes 'A' since there aren't any '/'
 *          (bug fix:  3.1.0 thru 3.1.3 treated it as "a");
 *      "?/a" or "a?/" or "/a?",&c picks all '?' even though no '/'
 *          (ie, treated as if it had just been "?a").
 *
 * Note: the behavior and meaning of 'a' vs 'A' is effectively reversed
 * when using menustyle:Full.  For Traditional, the choice is based on
 * ease of typing (using 'a' is much more common than 'A'); for Full,
 * it was changed to enhance menu entry ordering ('A' stands out, but
 * some players complain that it is too easy to choose accidentally).
 */
export function query_classes(oclasses,one_at_a_time,everything,action,objs,here,menu_on_demand)
{
    oclasses=C.ptr(oclasses);
    one_at_a_time=C.ptr(one_at_a_time);
    everything=C.ptr(everything);
    action=C.ptr(action);
    objs=C.ptr(objs);
    here=C.i8(here);
    menu_on_demand=C.ptr(menu_on_demand);
    const stackFrame=C.stackSave();
    try {
    /* selected classes */
    /* to tell caller that user picked 'A' */
    /* to tell caller that user picked 'a' */
    /* verb for what activity needs objects */
    /* invent or container->cobj or level.objects[x][y] */
    /* True: traverse by obj->nexthere; False: by obj->nobj */
    /* to tell caller that user picked 'm' */
    let ilets=C.stackAlloc((1*36)); let inbuf=C.stackAlloc((1*256)); C.initialize(inbuf,"char[256]",[C.i8(0)]);
    /* FIXME: hardcoded ilets[] length */
    let iletct; let oclassct;
    let not_everything; let filtered;
    let qbuf=C.stackAlloc((1*128));
    let m_seen;
    let itemcount=C.local("int",0); let bcnt=C.local("int",0); let ucnt=C.local("int",0); let ccnt=C.local("int",0); let xcnt=C.local("int",0); let ocnt=C.local("int",0); let jcnt=C.local("int",0);
    (C.cell((oclasses+Number((oclassct=0))*1),"char").value=C.i8(0));
    (C.cell(one_at_a_time,"signed char").value=(C.cell(everything,"signed char").value=(m_seen=(C.i8(0)))));
    if(menu_on_demand) (C.cell(menu_on_demand,"int").value=0);
    (iletct=collect_obj_classes(ilets,objs,here,0,itemcount.address));
    if(Number(iletct==0)) return (C.i8(0));
    if(Number(iletct==1)) {
        (C.cell((oclasses+Number(0)*1),"char").value=C.i8(C.def_char_to_objclass(C.cell((ilets+Number(0)*1),"char").value)));
        (C.cell((oclasses+Number(1)*1),"char").value=C.i8(0));
    } else {
        /* more than one choice available */
        /* additional choices */
        (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(32));
        (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(97));
        (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(65));
        (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(((Number(objs==C.field(C.gi,"instance_globals_i","invent").value)?105:58))));
    }
    if(Number(!!(itemcount.value&&menu_on_demand))) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(109));
    if(C.count_unpaid(objs)) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(117));
    C.tally_BUCX(objs,here,bcnt.address,ucnt.address,ccnt.address,xcnt.address,ocnt.address,jcnt.address);
    if(bcnt.value) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(66));
    if(ucnt.value) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(85));
    if(ccnt.value) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(67));
    if(xcnt.value) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(88));
    if(jcnt.value) (C.cell((ilets+Number((()=>{const __old=iletct;iletct=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(80));
    (C.cell((ilets+Number(iletct)*1),"char").value=C.i8(0));
    if(Number(iletct>1)) {
        let where=0;
        let sym; let oc_of_sym; let p;
        ask_again: for(;;){
            /* original label ask_again */
            (C.cell((oclasses+Number((oclassct=0))*1),"char").value=C.i8(0));
            (C.cell(one_at_a_time,"signed char").value=(C.cell(everything,"signed char").value=(C.i8(0))));
            (not_everything=(filtered=(C.i8(0))));
            C.variadic(2,qbuf,C.literal("What kinds of thing do you want to %s? [%s]"),action,ilets);
            C.getlin(qbuf,inbuf);
            if(Number(C.i32(C.cell(inbuf,"char").value)==27)) return (C.i8(0));
            for((p=inbuf);Number(C.i32(((sym=C.cell((()=>{const __old=p;p=C.ptr((__old+Number(1)));return __old;})(),"char").value)))!=0);) {
                if(Number(C.i32(sym)==32)) continue;
 else if(Number(C.i32(sym)==65)) (C.cell(one_at_a_time,"signed char").value=(C.i8(1)));
 else if(Number(C.i32(sym)==97)) (C.cell(everything,"signed char").value=(C.i8(1)));
 else if(Number(C.i32(sym)==58)) {
                    simple_look(objs,here);
                    /* dumb if objs==invent */
                    /* if we just scanned the contents of a container
                   then mark it as having known contents */
                    if(Number(C.i32(C.field(objs,"obj","where").value)==2)) (C.field(C.field(C.field(objs,"obj","v").address,"vptrs","v_ocontainer").value,"obj","cknown").value=C.u32(1));
                    continue ask_again; /* original goto ask_again */
                } else if(Number(C.i32(sym)==105)) {
                    C.display_inventory(0,(C.i8(1)));
                    continue ask_again; /* original goto ask_again */
                } else if(Number(C.i32(sym)==109)) {
                    (m_seen=(C.i8(1)));
                } else if(C.strchr(C.literal("uBUCXP"),C.i32(sym))) {
                    add_valid_menu_class(C.i32(sym));
                    /* 'u' or 'B','U','C','X','P' */
                    (filtered=(C.i8(1)));
                } else {
                    (oc_of_sym=C.i8(C.def_char_to_objclass(sym)));
                    if(C.strchr(ilets,C.i32(sym))) {
                        add_valid_menu_class(C.i32(oc_of_sym));
                        (C.cell((oclasses+Number((()=>{const __old=oclassct;oclassct=C.i32((__old+1));return __old;})())*1),"char").value=oc_of_sym);
                        (C.cell((oclasses+Number(oclassct)*1),"char").value=C.i8(0));
                    } else {
                        if(Number(!(where))) (where=(Number(!(C.strcmp(action,C.literal("pick up"))))?C.literal("here"):(Number(!(C.strcmp(action,C.literal("take out"))))?C.literal("inside"):C.literal(""))));
                        if(C.cell(where,"char").value) C.variadic(3,C.literal("are no %c's %s."),C.i32(sym),where);
 else C.variadic(4,C.literal("have no %c's."),C.i32(sym));
                        (not_everything=(C.i8(1)));
                    }
                }
            }
            /* for p:sym in inbuf */
            if(Number(!!(C.i32(m_seen)&&menu_on_demand))) {
                (C.cell(menu_on_demand,"int").value=(((Number(!!((Number(!!(C.i32(C.cell(everything,"signed char").value)||Number(!(oclassct)))))&&Number(!(filtered)))))?C.i32((-2)):C.i32((-3)))));
                return (C.i8(0));
            }
            if(Number(!!(Number(!(oclassct))&&(Number(!!(Number(!(C.cell(everything,"signed char").value))||C.i32(not_everything))))))) {
                /* didn't pick anything,
               or tried to pick something that's not present */
                (C.cell(one_at_a_time,"signed char").value=(C.i8(1)));
                /* force 'A' */
                (C.cell(everything,"signed char").value=(C.i8(0)));
                /* inhibit 'a' */
            }
            break ask_again;
        }
    }
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/*
 * tests:
 *  st_gloves      wearing gloves?
 *  st_corpse      is it a corpse obj?
 *  st_petrifies   does the corpse petrify on touch?
 *  st_resists     does hero have stoning resistance?
 *  st_all         st_gloves | st_corpse | st_petrifies | st_resists
 */
export function u_safe_from_fatal_corpse(obj,tests)
{
    obj=C.ptr(obj);
    tests=C.i32(tests);
    if(Number(!!(Number(!!(Number(!!((Number(!!((C.i32((tests&C.st_gloves)))&&C.global("uarmg").value)))||(Number(!!((C.i32((tests&C.st_corpse)))&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.CORPSE))))))||(Number(!!((C.i32((tests&C.st_petrifies)))&&Number(!((Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"]))))))))))))||(Number(!!((C.i32((tests&C.st_resists)))&&(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STONE_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) return (C.i8(1));
    return (C.i8(0));
}

/* check whether hero is bare-handedly touching a cockatrice corpse */
export function fatal_corpse_mistake(obj,remotely)
{
    obj=C.ptr(obj);
    remotely=C.i8(remotely);
    if(Number(!!(C.i32(u_safe_from_fatal_corpse(obj,C.st_all))||C.i32(remotely)))) return (C.i8(0));
    if(Number(!!(C.i32(C.poly_when_stoned(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value))&&C.polymon(C.PM_STONE_GOLEM)))) {
        C.indirect(6,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),C.global("WIN_MESSAGE").value,(C.i8(0)));
        /* --More-- */
        return (C.i8(0));
    }
    C.variadic(5,C.literal("Touching %s is a fatal mistake."),C.corpse_xname(obj,0,C.u32(C.i32((1|8)))));
    C.instapetrify(C.killer_xname(obj));
    return (C.i8(1));
}

/* attempting to manipulate a Rider's corpse triggers its revival */
export function rider_corpse_revival(obj,remotely)
{
    obj=C.ptr(obj);
    remotely=C.i8(remotely);
    if(Number(!!(Number(!!(Number(!(obj))||Number(C.i32(C.field(obj,"obj","otyp").value)!=C.CORPSE)))||Number(!((Number(!!(Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_DEATH)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_FAMINE)*C.sizes["struct permonst"]))))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"])))))))))) return (C.i8(0));
    C.variadic(6,C.literal("At your %s, the corpse suddenly moves..."),(C.i32(remotely)?C.literal("attempted acquisition"):C.literal("touch")));
    C.revive_corpse(obj);
    C.exercise(C.A_WIS,(C.i8(0)));
    return (C.i8(1));
}

/* wand of probing zapped down; perhaps hero is levitating while blind */
export function force_decor(via_probing)
{
    via_probing=C.i8(via_probing);
    /* we don't want describe_decor() to defer feedback if hero is fumbling
       with 1 turn left until next slip_or_trip(), or for ice_descr() to
       omit thawing details if hero is probing when levitating while blind
       (those will be skipped for look_here() and farlook() or autodescribe);
       we can't control that by temporarily tweaking properties because that
       could become noticeable if status gets updated while decor feedback
       is being delivered */
    (C.field(C.gd,"instance_globals_d","decor_fumble_override").value=(C.i8(1)));
    (C.field(C.gd,"instance_globals_d","decor_levitate_override").value=via_probing);
    /* force current terrain to be different from previous location, or
       uninteresting if previous location was actually inside solid stone */
    (C.field(C.iflags,"instance_flags","prev_decor").value=C.i8(C.STONE));
    describe_decor();
    (C.field(C.gd,"instance_globals_d","decor_fumble_override").value=(C.field(C.gd,"instance_globals_d","decor_levitate_override").value=(C.i8(0))));
    (C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(C.field(C.u,"you","ux").value)*(1*21))+Number(C.field(C.u,"you","uy").value)*1),"signed char").value=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value);
}

export function deferred_decor(setup)
{
    setup=C.i8(setup);
    /* True: deferring, False: catching up */
    if(Number(!(C.field(C.flags,"flag","mention_decor").value))) {
        (C.field(C.iflags,"instance_flags","defer_decor").value=(C.i8(0)));
    } else if(setup) {
        (C.field(C.iflags,"instance_flags","defer_decor").value=(C.i8(1)));
    } else {
        describe_decor();
        (C.field(C.iflags,"instance_flags","defer_decor").value=(C.i8(0)));
    }
}

/* handle 'mention_decor' (when walking onto a dungeon feature such as
   stairs or altar, describe it even if it isn't covered up by an object) */
export function describe_decor()
{
    const stackFrame=C.stackSave();
    try {
    let outbuf=C.stackAlloc((1*256)); let fbuf=C.stackAlloc((1*128));
    let doorhere; let waterhere; let res=(C.i8(1));
    let dfeature;
    let ltyp;
    if(Number(!!(Number(!!(Number((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.FUMBLING)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))==1n)&&Number(!(C.field(C.iflags,"instance_flags","defer_decor").value))))&&Number(!(C.field(C.gd,"instance_globals_d","decor_fumble_override").value))))) {
        /* about to slip_or_trip */
        /* probe_decor() */
        /*
         * Work around a message sequencing issue if Fumbling's periodic
         * timeout is about to kick in:  avoid the combination
         *  |You are back on floor.
         *  |You trip over <object>.  or  You flounder.
         * when the trip is being caused by moving on ice as hero
         * steps off ice onto non-ice.  Defer the back-on-floor part if
         * that is about to happen.
         */
        deferred_decor((C.i8(1)));
        return (C.i8(0));
    }
    (ltyp=(((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)==C.DRAWBRIDGE_UP))?C.i32(C.db_under_typ(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value))):C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))));
    (dfeature=C.dfeature_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,fbuf));
    /* we don't mention "ordinary" doors but do mention broken ones (and
       closed ones, which will only happen for Passes_walls) */
    (doorhere=C.i8(Number(!!(dfeature&&(Number(!!(Number(!(C.strcmp(dfeature,C.literal("open door"))))||Number(!(C.strcmp(dfeature,C.literal("doorway")))))))))));
    (waterhere=C.i8(Number(!!(dfeature&&Number(!(C.strcmp(dfeature,C.literal("pool of water"))))))));
    if(Number(!!(Number(!!(C.i32(doorhere)||C.i32((C.field(C.u,"you","uinwater").value))))||(Number(!!(Number(ltyp==C.ICE)&&(Number(!!(Number(C.i32((C.field(C.iflags,"instance_flags","prev_decor").value))>=C.POOL)&&Number(C.i32((C.field(C.iflags,"instance_flags","prev_decor").value))<=C.DRAWBRIDGE_UP)))))))))) (dfeature=0);
    /* pooleffects() */
    /*
     * TODO: if on ice, report moving between thicker and thinner ice (based
     * on ice_descr()'s classification) as if moving onto different terrain.
     */
    if(Number(!!(Number(ltyp==C.i32(C.field(C.iflags,"instance_flags","prev_decor").value))&&Number(!((Number(!!(Number((ltyp)>=C.STAIRS)&&Number((ltyp)<=C.ALTAR))))))))) {
        (res=(C.i8(0)));
    } else if(dfeature) {
        if(waterhere) (dfeature=C.strcpy(fbuf,C.waterbody_name(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)));
        if(Number(!!(C.strcmp(dfeature,C.literal("swamp"))&&Number(ltyp!=C.ICE)))) (dfeature=C.an(dfeature));
        if(C.field(C.flags,"flag","verbose").value) {
            C.variadic(7,outbuf,C.literal("There is %s here."),dfeature);
        } else {
            if(Number(dfeature!=fbuf)) C.strcpy(fbuf,dfeature);
            C.variadic(8,outbuf,C.literal("%s."),C.upstart(fbuf));
        }
        if(Number(!!(Number(ltyp==C.ICE)&&C.i32(C.field(C.flags,"flag","mention_decor").value)))) C.variadic(9,C.literal("%s"),outbuf);
 else C.variadic(10,C.literal("%s"),outbuf);
    } else if(Number(!((C.field(C.u,"you","uinwater").value)))) {
        if(Number(!!(Number(!!((Number(!!(Number(C.i32((C.field(C.iflags,"instance_flags","prev_decor").value))>=C.POOL)&&Number(C.i32((C.field(C.iflags,"instance_flags","prev_decor").value))<=C.DRAWBRIDGE_UP))))||(Number(!!(Number(C.i32((C.field(C.iflags,"instance_flags","prev_decor").value))==C.LAVAPOOL)||Number(C.i32((C.field(C.iflags,"instance_flags","prev_decor").value))==C.LAVAWALL))))))||Number(C.i32(C.field(C.iflags,"instance_flags","prev_decor").value)==C.ICE)))) {
            if(Number(C.field(C.iflags,"instance_flags","last_msg").value!=C.PLNMSG_BACK_ON_GROUND)) {
                C.back_on_ground((C.i8(0)));
            }
        }
    }
    /* describe_decor() is normally called when moving onto a different
       type of terrain, but it is also called by pickup() even when
       mention_decor is Off if hero can't reach floor; only adapt the next
       describe_decor() by what has just occurred in this one when it's On */
    (C.field(C.iflags,"instance_flags","prev_decor").value=C.i8((C.i32(C.field(C.flags,"flag","mention_decor").value)?ltyp:C.STONE)));
    return res;
    } finally {C.stackRestore(stackFrame); }
}

/* look at the objects at our location, unless there are too many of them */
export function check_here(picked_some)
{
    picked_some=C.i8(picked_some);
    let obj;
    let ct=0;
    let lhflags=(C.i32(picked_some)?1:0);
    if(C.field(C.flags,"flag","mention_decor").value) {
        if(describe_decor()) (lhflags=C.u32(lhflags|2));
    }
    /* count the objects here */
    for((obj=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value);obj;(obj=C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value)) {
        if(Number(obj!=C.global("uchain").value)) (()=>{const __old=ct;ct=C.i32((__old+1));return __old;})();
    }
    /* If there are objects here, take a look. */
    if(ct) {
        if(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value) C.nomul(0);
        C.flush_screen(1);
        C.look_here(ct,lhflags);
    } else {
        C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    }
}

/* query_objlist callback: return TRUE if obj's count is >= reference value */
export function n_or_more(obj)
{
    obj=C.ptr(obj);
    if(Number(obj==C.global("uchain").value)) return (C.i8(0));
    return C.i8((Number(C.field(obj,"obj","quan").value>=C.field(C.gv,"instance_globals_v","val_for_n_or_more").value)));
}

/* check valid_menu_classes[] for an entry; also used by askchain() */
export function menu_class_present(c)
{
    c=C.i32(c);
    return C.i8(((Number(!!(c&&C.strchr(C.field(C.gv,"instance_globals_v","valid_menu_classes").address,c))))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

export function add_valid_menu_class(c)
{
    c=C.i32(c);
    
    if(Number(c==0)) {
        /* reset */
        (C.cell(C.staticAddress("add_valid_menu_class.vmc_count"),"int").value=0);
        (C.field(C.gc,"instance_globals_c","class_filter").value=(C.field(C.gb,"instance_globals_b","bucx_filter").value=(C.field(C.gs,"instance_globals_s","shop_filter").value=(C.i8(0)))));
        (C.field(C.gp,"instance_globals_p","picked_filter").value=(C.i8(0)));
    } else if(Number(!(menu_class_present(c)))) {
        (C.cell((C.field(C.gv,"instance_globals_v","valid_menu_classes").address+Number((()=>{const __cell=C.cell(C.staticAddress("add_valid_menu_class.vmc_count"),"int");const __old=__cell.value;__cell.value=C.i32((__old+1));return __old;})())*1),"char").value=C.i8(c));
        /* categorize the new class */
        switch(c) {
            case (66):
                case (85):
                    case (67):
                        /*FALLTHRU*/
                        case (88):
                            (C.field(C.gb,"instance_globals_b","bucx_filter").value=(C.i8(1)));
            break;
            case (80):
                (C.field(C.gp,"instance_globals_p","picked_filter").value=(C.i8(1)));
            break;
            case (117):
                (C.field(C.gs,"instance_globals_s","shop_filter").value=(C.i8(1)));
            break;
            default:
                (C.field(C.gc,"instance_globals_c","class_filter").value=(C.i8(1)));
            break;
        }
    }
    (C.cell((C.field(C.gv,"instance_globals_v","valid_menu_classes").address+Number(C.cell(C.staticAddress("add_valid_menu_class.vmc_count"),"int").value)*1),"char").value=C.i8(0));
}

/* query_objlist callback: return TRUE if not uchain */
export function all_but_uchain(obj)
{
    obj=C.ptr(obj);
    return C.i8((Number(obj!=C.global("uchain").value)));
}

/* query_objlist callback: return TRUE */
/*ARGUSED*/
export function allow_all(obj)
{
    obj=C.ptr(obj);
    return (C.i8(1));
}

export function allow_category(obj)
{
    obj=C.ptr(obj);
    /* If no filters are active, nothing will match unless
       paranoid_confirm:A is set. */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.field(C.gc,"instance_globals_c","class_filter").value))&&Number(!(C.field(C.gs,"instance_globals_s","shop_filter").value))))&&Number(!(C.field(C.gb,"instance_globals_b","bucx_filter").value))))&&Number(!(C.field(C.gp,"instance_globals_p","picked_filter").value))))&&Number(!((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(4096))))!=0))))))) return (C.i8(0));
    /* For coins, if any class filter is specified, accept if coins
     * are included regardless of whether either unpaid or BUC-status
     * is also specified since player has explicitly requested coins.
     */
    if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)&&C.i32(C.field(C.gc,"instance_globals_c","class_filter").value)))) return C.i8((C.strchr(C.field(C.gv,"instance_globals_v","valid_menu_classes").address,C.COIN_CLASS)?C.i32((C.i8(1))):C.i32((C.i8(0)))));
    if(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_CLERIC)))&&Number(!(C.field(obj,"obj","bknown").value))))) C.set_bknown(obj,C.u32(1));
    /*
     * Version 3.6 had three types of filters possible and the first
     * and third can have more than one entry:
     *  1) object class (armor, potion, &c);
     *  2) unpaid shop item;
     *  3) bless/curse state (blessed, uncursed, cursed, BUC-unknown).
     * Version 5.0 added a fourth:
     *  4) 'novelty' ('P' for just picked up items).
     * When only one type is present, the situation is simple:
     * to be accepted, obj's status must match one of the entries.
     * When more than one type is present, the obj will now only
     * be accepted when it matches one entry of each type.
     * So ?!B will accept blessed scrolls or potions, and [u will
     * accept unpaid armor.  (In 3.4.3, an object was accepted by
     * this filter if it met any entry of any type, so ?!B resulted
     * in accepting all scrolls and potions regardless of bless/curse
     * state plus all blessed non-scroll, non-potion objects.)
     */
    /* if class is expected but obj's class is not in the list, reject */
    if(Number(!!(C.i32(C.field(C.gc,"instance_globals_c","class_filter").value)&&Number(!(C.strchr(C.field(C.gv,"instance_globals_v","valid_menu_classes").address,C.i32(C.field(obj,"obj","oclass").value))))))) return (C.i8(0));
    /* if unpaid is expected and obj isn't unpaid, reject (treat a container
       holding any unpaid object as unpaid even if isn't unpaid itself) */
    if(Number(!!(Number(!!(C.i32(C.field(C.gs,"instance_globals_s","shop_filter").value)&&Number(!(C.field(obj,"obj","unpaid").value))))&&Number(!((Number(!!((Number(C.field((obj),"obj","cobj").value!=0))&&Number(C.count_unpaid(C.field(obj,"obj","cobj").value)>0))))))))) return (C.i8(0));
    /* check for particular bless/curse state */
    if(C.field(C.gb,"instance_globals_b","bucx_filter").value) {
        /* first categorize this object's bless/curse state */
        let bucx;
        if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
            /* If no class filtering is specified but bless/curse state is,
               coins are treated as either unknown or uncursed based on an
               option setting. */
            (bucx=C.i8((C.i32(C.field(C.flags,"flag","goldX").value)?88:85)));
        } else {
            (bucx=C.i8((Number(!(C.field(obj,"obj","bknown").value))?88:(C.i32(C.field(obj,"obj","blessed").value)?66:(C.i32(C.field(obj,"obj","cursed").value)?67:85)))));
        }
        /* if its category is not in the list, reject */
        if(Number(!(C.strchr(C.field(C.gv,"instance_globals_v","valid_menu_classes").address,C.i32(bucx))))) return (C.i8(0));
    }
    if(Number(!!(C.i32(C.field(C.gp,"instance_globals_p","picked_filter").value)&&Number(!(C.field(obj,"obj","pickup_prev").value))))) return (C.i8(0));
    /* obj didn't fail any of the filter checks, so accept */
    return (C.i8(1));
}

/* not used */
/* query_objlist callback: return TRUE if valid category (class), no uchain */
/* query_objlist callback: return TRUE if valid class and worn */
export function is_worn_by_type(otmp)
{
    otmp=C.ptr(otmp);
    return C.i8(((Number(!!(C.i32(C.is_worn(otmp))&&C.i32(allow_category(otmp)))))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/* reset last-picked-up flags */
export function reset_justpicked(olist)
{
    olist=C.ptr(olist);
    let otmp;
    /*
     * TODO?  Possible enhancement: don't reset if hero is still at same
     *  spot where most recent pickup took place.  Not resetting will be
     *  the correct behavior for autopickup immediately followed by manual
     *  pickup.  It would probably be correct for either or both pickups
     *  followed by manual pickup of a newly arrived missile after some
     *  time has elapsed.  Things becomes murkier for other activity.
     *  Taking anything out of a container ought to be treated as if
     *  having moved to another spot.
     */
    for((otmp=olist);otmp;(otmp=C.field(otmp,"obj","nobj").value)) (C.field(otmp,"obj","pickup_prev").value=C.u32(0));

}

export function count_justpicked(olist)
{
    olist=C.ptr(olist);
    let otmp;
    let cnt=0;
    for((otmp=olist);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(C.field(otmp,"obj","pickup_prev").value) (()=>{const __old=cnt;cnt=C.i32((__old+1));return __old;})();

    return cnt;
}

export function find_justpicked(olist)
{
    olist=C.ptr(olist);
    let otmp;
    for((otmp=olist);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(C.field(otmp,"obj","pickup_prev").value) return otmp;

    return 0;
}

/*
 * Have the hero pick things from the ground
 * or a monster's inventory if swallowed.
 *
 * Arg what:
 *      >0  autopickup
 *      =0  interactive
 *      <0  pickup count of something
 *
 * Returns 1 if tried to pick something up, whether
 * or not it succeeded.
 */
export function pickup(what)
{
    what=C.i32(what);
    const stackFrame=C.stackSave();
    try {
    /* should be a long */
    let i; let n; let res; let count; let n_tried=0; let n_picked=0;
    let pick_list=C.local("struct mi *",0);
    let autopickup=C.i8(Number(what>0));
    let objchain_p;
    let traverse_how;
    /* we might have arrived here while fainted or sleeping, via
       random teleport or levitation timeout; if so, skip check_here
       and read_engr_at in addition to bypassing autopickup itself
       [probably ought to check whether hero is using a cockatrice
       corpse for a pillow here... (also at initial faint/sleep)] */
    if(Number(!!(Number(!!(C.i32(autopickup)&&Number(C.field(C.gm,"instance_globals_m","multi").value<C.i64(0))))&&C.i32(C.unconscious())))) {
        (C.field(C.iflags,"instance_flags","prev_decor").value=C.i8(C.STONE));
        return 0;
    }
    /* used by pickup_object() for encumbrance feedback */
    (C.field(C.gp,"instance_globals_p","pickup_encumbrance").value=0);
    if(Number(what<0)) (count=C.i32((-what)));
 else (count=0);
    /* pick N of something */
    /* pick anything */
    if(Number(!(C.field(C.u,"you","uswallow").value))) {
        let t;
        /* no auto-pick if no-pick move, nothing there, or in a pool */
        if(Number(!!(C.i32(autopickup)&&(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","nopick").value)||Number(!((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value!=0))))))||(Number(!!(C.i32(C.is_pool(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))&&Number(!((C.field(C.u,"you","uinwater").value))))))))||C.i32(C.is_lava(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))))))) {
            if(C.field(C.flags,"flag","mention_decor").value) describe_decor();
            C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            return 0;
        }
        /* no pickup if levitating & not on air or water level */
        (t=C.t_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
        if(Number(!(C.can_reach_floor(C.i8(Number(!!(t&&(Number(!!(Number(C.i32((C.field(t,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(t,"trap","ttyp").value))==C.SPIKED_PIT))))))))))) {
            describe_decor();
            /* even when !flags.mention_decor */
            if(Number(!!(Number(!!((Number(!!(C.field(C.gm,"instance_globals_m","multi").value&&Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value)))))||(Number(!!(C.i32(autopickup)&&Number(!(C.field(C.flags,"flag","pickup").value)))))))||(Number(!!(t&&(Number(!!(C.i32(C.uteetering_at_seen_pit(t))||C.i32(C.uescaped_shaft(t))))))))))) C.read_engr_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            return 0;
        }
        /* multi && !svc.context.run means they are in the middle of some
         * other action, or possibly paralyzed, sleeping, etc.... and they
         * just teleported onto the object.  They shouldn't pick it up.
         */
        if(Number(!!(Number(!!((Number(!!(C.field(C.gm,"instance_globals_m","multi").value&&Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value)))))||(Number(!!(C.i32(autopickup)&&Number(!(C.field(C.flags,"flag","pickup").value)))))))||(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(2048n))))!=C.u64(0n)))))) {
            check_here((C.i8(0)));
            if(Number(!!(Number(!!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(2048n))))!=C.u64(0n)))&&(Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value!=0))))&&(Number(!!(C.i32(autopickup)||C.i32(C.field(C.flags,"flag","pickup").value))))))) C.variadic(11,C.literal("are physically incapable of picking anything up."));
            return 0;
        }
        /* if there's anything here, stop running */
        if(Number(!!(Number(!!(Number(!!((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value!=0))&&C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value))&&Number(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value!=C.u32(8))))&&Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","nopick").value))))) C.nomul(0);
    }
    add_valid_menu_class(0);
    /* reset */
    if(Number(!(C.field(C.u,"you","uswallow").value))) {
        (objchain_p=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8));
        (traverse_how=1);
    } else {
        (objchain_p=C.field(C.field(C.u,"you","ustuck").value,"monst","minvent").address);
        (traverse_how=0);
        /* nobj */
    }
    pickupdone: {
        pickup_menu_flow: {
            /*
     * Start the actual pickup process.  This is split into two main
     * sections, the newer menu and the older "traditional" methods.
     * Automatic pickup has been split into its own menu-style routine
     * to make things less confusing.
     */
            if(autopickup) {
                (n=autopick(C.cell(objchain_p,"struct obj *").value,traverse_how,pick_list.address));
                {menu_pickup();break pickup_menu_flow;} /* original goto menu_pickup */
            }
            if(Number(!!(Number(C.i32(C.field(C.flags,"flag","menu_style").value)!=0)||C.i32(C.field(C.iflags,"instance_flags","menu_requested").value)))) {
                /* use menus exclusively */
                (traverse_how=C.i32(traverse_how|C.i32((4|((C.i32(C.field(C.flags,"flag","sortpack").value)?16:0))))));
                if(count) {
                    /* looking for N of something */
                    let qbuf=C.stackAlloc((1*128));
                    C.variadic(12,qbuf,C.literal("Pick %d of what?"),count);
                    (C.field(C.gv,"instance_globals_v","val_for_n_or_more").value=C.i64(count));
                    /* set up callback selector */
                    (n=query_objlist(qbuf,objchain_p,traverse_how,pick_list.address,1,C.ownedFunctionPointer("n_or_more")));
                    /* correct counts, if any given */
                    for((i=0);Number(i<n);(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) (C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","count").value=C.i64(count));

                } else {
                    (n=query_objlist(C.literal("Pick up what?"),objchain_p,(C.i32((traverse_how|128))),pick_list.address,2,C.ownedFunctionPointer("all_but_uchain")));
                }
                menu_pickup();
            } else {
                /* old style interface */
                let ct=0;
                let lcount;
                let all_of_a_type=C.local("signed char",0); let selective=C.local("signed char",0); let bycat;
                let oclasses=C.stackAlloc((1*28));
                /* +10: room for B,U,C,X plus slop */
                let obj; let obj2;
                (C.cell((oclasses+Number(0)*1),"char").value=C.i8(0));
                /* types to consider (empty for all) */
                (all_of_a_type.value=(C.i8(1)));
                /* take all of considered types */
                (selective.value=(C.i8(0)));
                /* ask for each item */
                /* check for more than one object */
                for((obj=C.cell(objchain_p,"struct obj *").value);obj;(obj=(((C.i32(((traverse_how)&1)))?C.field(C.field((obj),"obj","v").address,"vptrs","v_nexthere").value:C.field((obj),"obj","nobj").value)))) (()=>{const __old=ct;ct=C.i32((__old+1));return __old;})();

                end_query: {
                    if(Number(!!(Number(ct==1)&&count))) {
                        /* if only one thing, then pick it */
                        (obj=C.cell(objchain_p,"struct obj *").value);
                        (lcount=((Number((C.field(obj,"obj","quan").value)<(C.i64(count)))?(C.field(obj,"obj","quan").value):(C.i64(count)))));
                        (()=>{const __old=n_tried;n_tried=C.i32((__old+1));return __old;})();
                        reset_justpicked(C.field(C.gi,"instance_globals_i","invent").value);
                        if(Number(pickup_object(obj,lcount,(C.i8(0)))>0)) (()=>{const __old=n_picked;n_picked=C.i32((__old+1));return __old;})();
                        /* picked something */
                        break end_query; /* original goto end_query */
                    } else if(Number(ct>=2)) {
                        let via_menu=C.local("int",0);
                        C.variadic(13,C.literal("are %s objects here."),((Number(ct<=10))?C.literal("several"):C.literal("many")));
                        if(Number(!(query_classes(oclasses,selective.address,all_of_a_type.address,C.literal("pick up"),C.cell(objchain_p,"struct obj *").value,C.i8(((C.i32((traverse_how&1)))?C.i32((C.i8(1))):C.i32((C.i8(0))))),via_menu.address)))) {
                            if(Number(!(via_menu.value))) break pickupdone; /* original goto pickupdone */
                            if(selective.value) (traverse_how=C.i32(traverse_how|16));
                            (n=query_objlist(C.literal("Pick up what?"),objchain_p,traverse_how,pick_list.address,2,((Number(via_menu.value==C.i32((-2))))?C.ownedFunctionPointer("allow_all"):C.ownedFunctionPointer("allow_category"))));
                            {menu_pickup();break pickup_menu_flow;} /* original goto menu_pickup */
                        }
                    }
                    (bycat=C.i8((Number(!!(Number(!!(Number(!!(C.i32(menu_class_present(66))||C.i32(menu_class_present(85))))||C.i32(menu_class_present(67))))||C.i32(menu_class_present(88)))))));
                    for((obj=C.cell(objchain_p,"struct obj *").value);obj;(obj=obj2)) {
                        (obj2=(((C.i32(((traverse_how)&1)))?C.field(C.field((obj),"obj","v").address,"vptrs","v_nexthere").value:C.field((obj),"obj","nobj").value)));
                        if((C.i32(bycat)?Number(!(allow_category(obj))):(Number(!!(Number(!!(Number(!(selective.value))&&C.i32(C.cell((oclasses+Number(0)*1),"char").value)))&&Number(!(C.strchr(oclasses,C.i32(C.field(obj,"obj","oclass").value))))))))) continue;
                        (lcount=C.i64((-1n)));
                        if(Number(!(all_of_a_type.value))) {
                            let qbuf=C.stackAlloc((1*256));
                            C.safe_qbuf(qbuf,C.literal("Pick up "),C.literal("?"),obj,C.nativeFunctionPointer("doname"),C.nativeFunctionPointer("ansimpleoname"),C.field(C.c_common_strings,"c_common_strings","c_something").value);
                            switch(((Number(C.field(obj,"obj","quan").value<2n))?C.i32(C.yn_function(qbuf,C.ynaqchars,C.i8(121),(C.i8(1)))):C.i32(C.yn_function(qbuf,C.ynNaqchars,C.i8(121),(C.i8(1)))))) {
                                case (113):
                                    break end_query; /* original goto end_query */
                                /* out 2 levels */
                                case (110):
                                    continue;
                                case (97):
                                    (all_of_a_type.value=(C.i8(1)));
                                if(selective.value) {
                                    (selective.value=(C.i8(0)));
                                    (C.cell((oclasses+Number(0)*1),"char").value=C.field(obj,"obj","oclass").value);
                                    (C.cell((oclasses+Number(1)*1),"char").value=C.i8(0));
                                }
                                break;
                                case (35):
                                    /* count was entered */
                                    if(Number(!(C.global("yn_number").value))) continue;
                                /* 0 count => No */
                                (lcount=C.global("yn_number").value);
                                if(Number(lcount>C.field(obj,"obj","quan").value)) (lcount=C.field(obj,"obj","quan").value);
                                ;
                                /*FALLTHRU*/
                                default:
                                    /* 'y' */
                                    break;
                            }
                        }
                        if(Number(lcount==C.i64((-1n)))) (lcount=C.field(obj,"obj","quan").value);
                        if(Number(!(n_tried))) reset_justpicked(C.field(C.gi,"instance_globals_i","invent").value);
                        /* reset just before the first item picked */
                        (()=>{const __old=n_tried;n_tried=C.i32((__old+1));return __old;})();
                        if(Number(((res=pickup_object(obj,lcount,(C.i8(0)))))<0)) break;
                        (n_picked=C.i32(n_picked+res));
                    }
                }
                /* original label end_query */
                ;
                /* statement required after label */
            }
        }
        if(Number(!(C.field(C.u,"you","uswallow").value))) {
            if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(128n))))!=C.u64(0n)))) C.hideunder(C.field(C.gy,"instance_globals_y","youmonst").address);
            /* position may need updating (invisible hero) */
            if(n_picked) C.newsym_force(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
            /* check if there's anything else here after auto-pickup is done */
            if(autopickup) check_here(C.i8(Number(n_picked>0)));
        }
    }
    /* original label pickupdone */
    (C.field(C.gp,"instance_globals_p","pickup_encumbrance").value=0);
    add_valid_menu_class(0);
    /* reset */
    return (Number(n_tried>0));
    function menu_pickup(){
                    /* original label menu_pickup */
                    if(Number(n>0)) reset_justpicked(C.field(C.gi,"instance_globals_i","invent").value);
                    (n_tried=n);
                    for((n_picked=(i=0));Number(i<n);(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) {
                        (res=pickup_object(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value,C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","count").value,(C.i8(0))));
                        if(Number(res<0)) break;
                        /* can't continue */
                        (n_picked=C.i32(n_picked+res));
                    }
                    if(pick_list.value) C.free(pick_list.value);
    }
    } finally {C.stackRestore(stackFrame); }
}

export function check_autopickup_exceptions(obj)
{
    obj=C.ptr(obj);
    /*
     *  Does the text description of this match an exception?
     */
    let ape=C.field(C.ga,"instance_globals_a","apelist").value;
    if(ape) {
        let objdesc=C.makesingular(C.doname(obj));
        while(Number(!!(ape&&Number(!(C.regex_match(objdesc,C.field(ape,"autopickup_exception","regex").value)))))) (ape=C.field(ape,"autopickup_exception","next").value);

    }
    return ape;
}

export function autopick_testobj(otmp,calc_costly)
{
    otmp=C.ptr(otmp);
    calc_costly=C.i8(calc_costly);
    let ape;
    
    let otypes=C.field(C.flags,"flag","pickup_types").address;
    let pickit;
    /* calculate 'costly' just once for a given autopickup operation */
    if(calc_costly) (C.cell(C.staticAddress("autopick_testobj.costly"),"signed char").value=C.i8((Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)==1)&&C.i32(C.costly_spot(C.field(otmp,"obj","ox").value,C.field(otmp,"obj","oy").value)))))));
    /* first check: reject if an unpaid item in a shop */
    if(Number(!!(C.i32(C.cell(C.staticAddress("autopick_testobj.costly"),"signed char").value)&&Number(!(C.field(otmp,"obj","no_charge").value))))) return (C.i8(0));
    /* pickup_thrown/pickup_stolen/nopick_dropped override pickup_types and
       exceptions */
    if(Number(!!((Number(!!(C.i32(C.field(C.flags,"flag","pickup_thrown").value)&&Number(C.i32(C.field(otmp,"obj","how_lost").value)==1))))||(Number(!!(C.i32(C.field(C.flags,"flag","pickup_stolen").value)&&Number(C.i32(C.field(otmp,"obj","how_lost").value)==3))))))) return (C.i8(1));
    if(Number(!!(C.i32(C.field(C.flags,"flag","nopick_dropped").value)&&Number(C.i32(C.field(otmp,"obj","how_lost").value)==2)))) return (C.i8(0));
    if(Number(C.i32(C.field(otmp,"obj","how_lost").value)==4)) return (C.i8(0));
    /* check for pickup_types */
    (pickit=C.i8((Number(!!(Number(!(C.cell(otypes,"char").value))||C.strchr(otypes,C.i32(C.field(otmp,"obj","oclass").value)))))));
    /* check for autopickup exceptions */
    (ape=check_autopickup_exceptions(otmp));
    if(ape) (pickit=C.field(ape,"autopickup_exception","grab").value);
    return pickit;
}

/*
 * Pick from the given list using flags.pickup_types.  Return the number
 * of items picked (not counts).  Create an array that returns pointers
 * and counts of the items to be picked up.  If the number of items
 * picked is zero, the pickup list is left alone.  The caller of this
 * function must free the pickup list.
 */
export function autopick(olist,follow,pick_list)
{
    olist=C.ptr(olist);
    follow=C.i32(follow);
    pick_list=C.ptr(pick_list);
    /* the object list */
    /* how to follow the object list */
    /* list of objects and counts to pick up */
    let pi;
    /* pick item */
    let curr;
    let n;
    let check_costly=(C.i8(1));
    /* first count the number of eligible items */
    for(((n=0),(curr=olist));curr;(curr=(((C.i32(((follow)&1)))?C.field(C.field((curr),"obj","v").address,"vptrs","v_nexthere").value:C.field((curr),"obj","nobj").value)))) {
        if(autopick_testobj(curr,check_costly)) (()=>{const __old=n;n=C.i32((__old+1));return n;})();
        (check_costly=(C.i8(0)));
        /* only need to check once per autopickup */
    }
    if(n) {
        (C.cell(pick_list,"struct mi *").value=(pi=C.alloc(C.u32(C.u64((BigInt(C.sizes["struct mi"])*C.u64(n)))))));
        for(((n=0),(curr=olist));curr;(curr=(((C.i32(((follow)&1)))?C.field(C.field((curr),"obj","v").address,"vptrs","v_nexthere").value:C.field((curr),"obj","nobj").value)))) {
            if(autopick_testobj(curr,(C.i8(0)))) {
                (C.field(C.field((pi+Number(n)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value=curr);
                (C.field((pi+Number(n)*C.sizes["struct mi"]),"mi","count").value=C.field(curr,"obj","quan").value);
                (()=>{const __old=n;n=C.i32((__old+1));return __old;})();
            }
        }
    }
    return n;
}

/*
 * Put up a menu using the given object list.  Only those objects on the
 * list that meet the approval of the allow function are displayed.  Return
 * a count of the number of items selected, as well as an allocated array of
 * menu_items, containing pointers to the objects selected and counts.  The
 * returned counts are guaranteed to be in bounds and non-zero.
 *
 * Query flags:
 *      BY_NEXTHERE       - Follow object list via nexthere instead of nobj.
 *      AUTOSELECT_SINGLE - Don't ask if only 1 object qualifies - just
 *                          use it.
 *      USE_INVLET        - Use object's invlet.
 *      INVORDER_SORT     - Use hero's pack order.
 *      INCLUDE_HERO      - Showing engulfer's invent; show hero too.
 *      SIGNAL_NOMENU     - Return -1 rather than 0 if nothing passes "allow".
 *      SIGNAL_ESCAPE     - Return -1 rather than 0 if player uses ESC to
 *                          pick nothing.
 *      FEEL_COCKATRICE   - touch corpse.
 */
export function query_objlist(qstr,olist_p,qflags,pick_list,how,allow)
{
    qstr=C.ptr(qstr);
    olist_p=C.ptr(olist_p);
    qflags=C.i32(qflags);
    pick_list=C.ptr(pick_list);
    how=C.i32(how);
    allow=C.ptr(allow);
    const stackFrame=C.stackSave();
    try {
    /* query string */
    /* the list to pick from */
    /* options to control the query */
    /* return list of items picked */
    /* type of query */
    /* allow function */
    let i; let n; let tmpglyph;
    let win;
    let curr; let last; let fake_hero_object=C.stackAlloc(C.sizes["struct obj"]); let olist=C.local("struct obj *",C.cell(olist_p,"struct obj *").value);
    let pack; let packbuf=C.stackAlloc((1*19));
    let any=C.stackAlloc(C.sizes["union any"]);
    let printed_type_name; let first; let sorted=C.i8(Number((C.i32((qflags&16)))!=0)); let engulfer=C.i8(Number((C.i32((qflags&256)))!=0)); let engulfer_minvent;
    let sortflags;
    let tmpglyphinfo=C.stackAlloc(C.sizes["struct glyphinfo"]); C.copy(tmpglyphinfo,C.nul_glyphinfo,C.sizes["struct glyphinfo"]);
    let sortedolist=C.local("struct sortloot_item *",0); let srtoli;
    let clr=8;
    (C.cell(pick_list,"struct mi *").value=0);
    if(Number(!!(Number(!(olist.value))&&Number(!(engulfer))))) return 0;
    /* count the number of items allowed */
    for((((n=0),(last=0)),(curr=olist.value));curr;(curr=(((C.i32(((qflags)&1)))?C.field(C.field((curr),"obj","v").address,"vptrs","v_nexthere").value:C.field((curr),"obj","nobj").value)))) if(C.indirect(7,(allow),curr)) {
        (last=curr);
        (()=>{const __old=n;n=C.i32((__old+1));return __old;})();
    }

    /* can't depend upon 'engulfer' because that's used to indicate whether
       hero should be shown as an extra, fake item */
    (engulfer_minvent=C.i8((Number(!!(Number(!!(olist.value&&Number(C.i32(C.field(olist.value,"obj","where").value)==4)))&&(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&(Number(C.field(C.u,"you","ustuck").value==(C.field(C.field(olist.value,"obj","v").address,"vptrs","v_ocarry").value)))))))))));
    if(Number(!!(Number(!!(C.i32(engulfer_minvent)&&Number(n==1)))&&Number(C.field(olist.value,"obj","owornmask").value!=0n)))) {
        (qflags=C.i32(qflags&C.i32((~4))));
    }
    if(engulfer) {
        (()=>{const __old=n;n=C.i32((__old+1));return n;})();
        /* don't autoselect swallowed hero if it's the only choice */
        (qflags=C.i32(qflags&C.i32((~4))));
    }
    if(Number(n==0)) return ((C.i32((qflags&32)))?C.i32((-1)):0);
    /* nothing to pick here */
    if(Number(!!(Number(n==1)&&(C.i32((qflags&4)))))) {
        (C.cell(pick_list,"struct mi *").value=C.alloc(C.u32(BigInt(C.sizes["struct mi"]))));
        (C.field(C.field((C.cell(pick_list,"struct mi *").value),"mi","item").address,"any","a_obj").value=last);
        (C.field((C.cell(pick_list,"struct mi *").value),"mi","count").value=C.field(last,"obj","quan").value);
        return 1;
    }
    (sortflags=C.u32((C.i32((C.i32(((((Number(!!(Number(C.i32(C.field(C.flags,"flag","sortloot").value)==102)||(Number(!!(Number(C.i32(C.field(C.flags,"flag","sortloot").value)==108)&&Number(!((C.i32((qflags&8)))))))))))?4:(((C.i32((qflags&8)))?2:0))))|((C.i32(C.field(C.flags,"flag","sortpack").value)?1:0))))|(((C.i32((qflags&128)))?32:0)))))));
    (sortedolist.value=C.sortloot(olist.address,sortflags,C.i8(((C.i32((qflags&1)))?C.i32((C.i8(1))):C.i32((C.i8(0))))),allow));
    (win=C.indirect(8,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.indirect(9,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    if(C.field(C.gt,"instance_globals_t","this_title").value) {
        /* dotypeinv() supplies gt.this_title to display as initial header;
           intentionally avoid the menu_headings highlight attribute here */
        C.add_menu_str(win,C.field(C.gt,"instance_globals_t","this_title").value);
    }
    /*
     * Run through the list and add the objects to the menu.  If
     * INVORDER_SORT is set, we'll run through the list once for
     * each type so we can group them.  The allow function was
     * called by sortloot() and will be called once per item here.
     */
    (pack=C.strcpy(packbuf,C.field(C.flags,"flag","inv_order").address));
    if(C.i32((qflags&2))) C.strkitten(pack,C.i8(C.VENOM_CLASS));
    /* venom is not in inv_order */
    (first=(C.i8(1)));
    do {
        (printed_type_name=(C.i8(0)));
        for((srtoli=sortedolist.value);(Number(((curr=C.field(srtoli,"sortloot_item","obj").value))!=0));(()=>{const __old=srtoli;srtoli=C.ptr((__old+Number(C.sizes["struct sortloot_item"])));return srtoli;})()) {
            if(Number(!!(C.i32(sorted)&&Number(C.i32(C.field(curr,"obj","oclass").value)!=C.i32(C.cell(pack,"char").value))))) continue;
            if(Number(!!(Number(!!((C.i32((qflags&128)))&&Number(C.i32(C.field(curr,"obj","otyp").value)==C.CORPSE)))&&C.i32(C.will_feel_cockatrice(curr,(C.i8(0))))))) {
                C.indirect(10,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
                /* stop the menu and revert */
                C.look_here(0,0);
                C.unsortloot(sortedolist.address);
                return 0;
            }
            if(C.indirect(11,(allow),curr)) {
                /* if sorting, print type name (once only) */
                if(Number(!!(C.i32(sorted)&&Number(!(printed_type_name))))) {
                    let with_oc_sym=C.i8((Number(!!(Number(how!=0)&&C.i32(C.field(C.iflags,"instance_flags","menu_head_objsym").value)))));
                    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
                    C.add_menu_heading(win,C.let_to_name(C.cell(pack,"char").value,(C.i8(0)),with_oc_sym));
                    (printed_type_name=(C.i8(1)));
                }
                (C.field(any,"any","a_obj").value=curr);
                (tmpglyph=(((Number(C.i32(C.field((curr),"obj","otyp").value)==C.STATUE))?((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(C.i32((((C.rn2_on_display_rng(C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.field((curr),"obj","corpsenm").value+(((Number((C.i32((C.i32(C.field((curr),"obj","spe").value)&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.field((curr),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((curr),"obj","ox").value)*(8*21))+Number(C.field((curr),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.field((curr),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((curr),"obj","ox").value)*(8*21))+Number(C.field((curr),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.field(C.go,"instance_globals_o","otg_temp").value+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.field((curr),"obj","otyp").value)==C.CORPSE))?((C.i32((C.field((curr),"obj","corpsenm").value+(((Number(!!(Number(!!(Number(C.i32(C.field((curr),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((curr),"obj","ox").value)*(8*21))+Number(C.field((curr),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((curr),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.field((curr),"obj","oclass").value)==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.field((curr),"obj","otyp").value)<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)>=C.FIRST_SPELL)&&(Number(C.i32(C.field((curr),"obj","otyp").value)<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.field((curr),"obj","oclass").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((curr),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((curr),"obj","ox").value)*(8*21))+Number(C.field((curr),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.field((curr),"obj","otyp").value)+(((Number(!!(Number(!!(Number(C.i32(C.field((curr),"obj","where").value)==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.field(C.field(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field((curr),"obj","ox").value)*(8*21))+Number(C.field((curr),"obj","oy").value)*8),"struct obj *").value,"obj","v").address,"vptrs","v_nexthere").value))!=0))))&&(Number(!!(Number(C.i32(C.field((curr),"obj","otyp").value)!=C.BOULDER)||Number(C.i32(C.field(C.field(C.go,"instance_globals_o","otg_otmp").value,"obj","otyp").value)==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))))))))));
                C.map_glyphinfo(C.i16(0),C.i16(0),tmpglyph,0,tmpglyphinfo);
                C.add_menu(win,tmpglyphinfo,any,C.i8(((C.i32((qflags&8)))?C.i32(C.field(curr,"obj","invlet").value):((Number(!!(C.i32(first)&&Number(C.i32(C.field(curr,"obj","oclass").value)==C.COIN_CLASS))))?36:0))),C.field((C.def_oc_syms+Number(C.i32(C.field((C.objects+Number(C.field(curr,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_class").value))*C.sizes["struct class_sym"]),"class_sym","sym").value,0,clr,C.doname_with_price(curr),0);
                (first=(C.i8(0)));
            }
        }
        (()=>{const __old=pack;pack=C.ptr((__old+Number(1)));return __old;})();
    } while(Number(!!(C.i32(sorted)&&C.i32(C.cell(pack,"char").value))));
    C.unsortloot(sortedolist.address);
    if(engulfer) {
        let buf=C.stackAlloc((1*256));
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        if(Number(!!(C.i32(sorted)&&Number(n>1)))) {
            C.variadic(14,buf,C.literal("%s Creatures"),((Number(C.dmgtype_fromattack((C.field(C.field(C.u,"you","ustuck").value,"monst","data").value),26,11)!=0))?C.literal("Swallowed"):C.literal("Engulfed")));
            C.add_menu_heading(win,buf);
        }
        C.copy(fake_hero_object,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
        (C.field(fake_hero_object,"obj","quan").value=1n);
        /* not strictly necessary... */
        (C.field(any,"any","a_obj").value=fake_hero_object);
        (tmpglyph=(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.field((C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
        C.map_glyphinfo(C.i16(0),C.i16(0),tmpglyph,0,tmpglyphinfo);
        C.add_menu(win,tmpglyphinfo,any,C.i8(62),C.i8(0),0,clr,C.an(C.self_lookat(buf)),0);
        /* fake inventory letter, no group accelerator */
    }
    C.indirect(12,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,qstr);
    (n=C.select_menu(win,how,pick_list));
    C.indirect(13,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    if(Number(n>0)) {
        let mi;
        let k;
        /* fix up counts:  -1 means no count used => pick all;
           if fake_hero_object was picked, discard that choice */
        for(((i=(k=0)),(mi=C.cell(pick_list,"struct mi *").value));Number(i<n);((()=>{const __old=i;i=C.i32((__old+1));return __old;})(),(()=>{const __old=mi;mi=C.ptr((__old+Number(C.sizes["struct mi"])));return __old;})())) {
            (curr=C.field(C.field(mi,"mi","item").address,"any","a_obj").value);
            if(Number(curr==fake_hero_object)) {
                /* this isn't actually possible; fake item representing
                   hero is only included for look here (':'), not pickup,
                   and that's PICK_NONE so we can't get here from there */
                C.variadic(15,C.literal("pick yourself up!"));
                continue;
            }
            if(Number(!!(C.i32(engulfer_minvent)&&Number(C.field(curr,"obj","owornmask").value!=0n)))) {
                C.variadic(16,C.literal("pick %s up."),C.ysimple_name(curr));
                continue;
            }
            if(Number(!!(Number(C.field(mi,"mi","count").value==C.i64((-1n)))||Number(C.field(mi,"mi","count").value>C.field(curr,"obj","quan").value)))) (C.field(mi,"mi","count").value=C.field(curr,"obj","quan").value);
            if(Number(k<i)) C.copy(((C.cell(pick_list,"struct mi *").value)+Number(k)*C.sizes["struct mi"]),mi,C.sizes["struct mi"]);
            (()=>{const __old=k;k=C.i32((__old+1));return k;})();
        }
        if(Number(!(k))) {
            /* fake_hero was only choice so discard whole list */
            C.free(C.cell(pick_list,"struct mi *").value);
            (C.cell(pick_list,"struct mi *").value=0);
            (n=0);
        } else if(Number(k<n)) {
            /* other stuff plus fake_hero; last slot is now unused
               (could be more than one if player tried to pick items
               worn by engulfer) */
            while(Number(n>k)) {
                (()=>{const __old=n;n=C.i32((__old-1));return n;})();
                C.copy(C.field(((C.cell(pick_list,"struct mi *").value)+Number(n)*C.sizes["struct mi"]),"mi","item").address,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
                (C.field(((C.cell(pick_list,"struct mi *").value)+Number(n)*C.sizes["struct mi"]),"mi","count").value=0n);
            }
        }
    } else if(Number(n<0)) {
        /* -1 is used for SIGNAL_NOMENU, so callers don't expect it
           to indicate that the player declined to make a choice */
        (n=((C.i32((qflags&64)))?C.i32((-2)):0));
    }
    return n;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * For menustyle:Full.
 *
 * allow menu-based category (class) selection (for Drop,take off etc.)
 *
 * If ParanoidAutoAll, requires confirmation when 'A' has been picked.
 */
export function query_category(qstr,olist,qflags,pick_list,how)
{
    qstr=C.ptr(qstr);
    olist=C.ptr(olist);
    qflags=C.i32(qflags);
    pick_list=C.ptr(pick_list);
    how=C.i32(how);
    const stackFrame=C.stackSave();
    try {
    /* query string */
    /* the list to pick from */
    /* behavior modification flags */
    /* return list of items picked */
    /* type of query */
    let n;
    let win;
    let curr;
    let pack; let packbuf=C.stackAlloc((1*19));
    let any=C.stackAlloc(C.sizes["union any"]);
    let collected_type_name;
    let invlet;
    let ccount;
    let ofilter=0;
    let show_a; let do_unpaid=(C.i8(0)); let do_usedup=(C.i8(0)); let do_blessed=(C.i8(0)); let do_cursed=(C.i8(0)); let do_uncursed=(C.i8(0)); let do_buc_unknown=(C.i8(0)); let do_worn=(C.i8(0)); let verify_All=(C.i8(0));
    let num_buc_types=0; let num_justpicked=0; let clr=8;
    (C.cell(pick_list,"struct mi *").value=0);
    if(Number(!(olist))) return 0;
    if(Number(!!(Number((C.i32((qflags&4)))!=0)&&C.count_unpaid(olist)))) (do_unpaid=(C.i8(1)));
    /* caller only passes BILLED_TYPES when there are some used up items
       on shop's bill */
    if(Number((C.i32((qflags&64)))!=0)) (do_usedup=(C.i8(1)));
    /* for the 'A' command to remove worn/wielded */
    if(Number((C.i32((qflags&16)))!=0)) {
        (do_worn=(C.i8(1)));
        (ofilter=C.nativeFunctionPointer("is_worn"));
    }
    if(Number(!!(Number((C.i32((qflags&256)))!=0)&&C.count_buc(olist,256,ofilter)))) {
        (do_blessed=(C.i8(1)));
        (()=>{const __old=num_buc_types;num_buc_types=C.i32((__old+1));return __old;})();
    }
    if(Number(!!(Number((C.i32((qflags&512)))!=0)&&C.count_buc(olist,512,ofilter)))) {
        (do_cursed=(C.i8(1)));
        (()=>{const __old=num_buc_types;num_buc_types=C.i32((__old+1));return __old;})();
    }
    if(Number(!!(Number((C.i32((qflags&1024)))!=0)&&C.count_buc(olist,1024,ofilter)))) {
        (do_uncursed=(C.i8(1)));
        (()=>{const __old=num_buc_types;num_buc_types=C.i32((__old+1));return __old;})();
    }
    if(Number(!!(Number((C.i32((qflags&2048)))!=0)&&C.count_buc(olist,2048,ofilter)))) {
        (do_buc_unknown=(C.i8(1)));
        (()=>{const __old=num_buc_types;num_buc_types=C.i32((__old+1));return __old;})();
    }
    if(Number((C.i32((qflags&4096)))!=0)) {
        (num_justpicked=count_justpicked(olist));
    }
    (ccount=count_categories(olist,qflags));
    /* no point in actually showing a menu for a single category */
    if(Number(!!(Number(!!(Number(!!(Number(ccount==1)&&Number(!(do_unpaid))))&&Number(!(do_usedup))))&&Number(num_buc_types<=1)))) {
        for((curr=olist);curr;(curr=(((C.i32(((qflags)&1)))?C.field(C.field((curr),"obj","v").address,"vptrs","v_nexthere").value:C.field((curr),"obj","nobj").value)))) {
            if(Number(!!(ofilter&&Number(!(C.indirect(14,(ofilter),curr)))))) continue;
            break;
        }
        if(curr) {
            (C.cell(pick_list,"struct mi *").value=C.alloc(C.u32(BigInt(C.sizes["struct mi"]))));
            (C.field(C.field((C.cell(pick_list,"struct mi *").value),"mi","item").address,"any","a_int").value=C.i32(C.field(curr,"obj","oclass").value));
            (n=1);
        } else {
            do {
                if(C.debugcore(C.literal("pickup.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(17,C.literal("query_category: no single object match"));
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
            (n=0);
        }
        /* early return is ok; there's no temp window yet */
        return n;
    }
    (win=C.indirect(15,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.indirect(16,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    (pack=C.strcpy(packbuf,C.field(C.flags,"flag","inv_order").address));
    if(Number((C.i32((qflags&2)))!=0)) C.strkitten(pack,C.i8(C.VENOM_CLASS));
    /* venom is not in inv_order */
    (show_a=C.i8((Number(!!(Number((C.i32((qflags&32)))!=0)&&Number(ccount>1))))));
    if(Number((C.i32((qflags&128)))!=0)) {
        (invlet=C.i8(65));
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        (C.field(any,"any","a_int").value=65);
        C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,(C.i32(do_worn)?C.literal("Auto-select every item being worn or wielded"):C.literal("Auto-select every relevant item")),2);
        /* note: menu_remarm() doesn't pass the CHOOSE_ALL flag,
                    so do_worn handling here is moot */
        (verify_All=C.i8(Number(!!((Number(how==2))&&(Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(4096))))!=0))))));
        if(Number(!(verify_All))) {
            if(Number(!!(Number(!((()=>{const __cell=C.field(C.ga,"instance_globals_a","A_first_hint");const __old=__cell.value;__cell.value=C.i32((__old+1));return __old;})()))||C.i32(C.field(C.iflags,"instance_flags","cmdassist").value)))) C.add_menu_str(win,C.literal("    (ignored unless some other choices are also picked)"));
        } else if(show_a) {
            if(Number(!!(Number(!((()=>{const __cell=C.field(C.ga,"instance_globals_a","A_second_hint");const __old=__cell.value;__cell.value=C.i32((__old+1));return __old;})()))||C.i32(C.field(C.iflags,"instance_flags","cmdassist").value)))) C.add_menu_str(win,C.literal("    (if no other choices are picked, 'a' is implied)"));
        }
        /* blank separator */
        C.add_menu_str(win,C.literal(""));
    }
    (invlet=C.i8(97));
    if(show_a) {
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        (C.field(any,"any","a_int").value=C.i32((-2)));
        C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,(C.i32(do_worn)?C.literal("All worn and wielded types"):C.literal("All types")),2);
        (()=>{const __old=invlet;invlet=C.i8((__old+1));return invlet;})();
        /* invlet = 'b'; */
    }
    query_done: {
        do {
            (collected_type_name=(C.i8(0)));
            for((curr=olist);curr;(curr=(((C.i32(((qflags)&1)))?C.field(C.field((curr),"obj","v").address,"vptrs","v_nexthere").value:C.field((curr),"obj","nobj").value)))) {
                if(Number(C.i32(C.field(curr,"obj","oclass").value)==C.i32(C.cell(pack,"char").value))) {
                    if(Number(!!(ofilter&&Number(!(C.indirect(17,(ofilter),curr)))))) continue;
                    if(Number(!(collected_type_name))) {
                        let oclass=C.i32(C.field(curr,"obj","oclass").value);
                        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
                        (C.field(any,"any","a_int").value=oclass);
                        C.add_menu(win,C.nul_glyphinfo,any,(()=>{const __old=invlet;invlet=C.i8((__old+1));return __old;})(),C.i8(C.i32(C.field((C.def_oc_syms+Number(oclass)*C.sizes["struct class_sym"]),"class_sym","sym").value)),0,clr,C.let_to_name(C.cell(pack,"char").value,(C.i8(0)),C.i8((Number(!!(Number(how!=0)&&C.i32(C.field(C.iflags,"instance_flags","menu_head_objsym").value)))))),0);
                        (collected_type_name=(C.i8(1)));
                    }
                }
            }
            (()=>{const __old=pack;pack=C.ptr((__old+Number(1)));return __old;})();
            if(Number(C.i32(invlet)>=117)) {
                C.variadic(18,C.literal("query_category: too many categories"));
                (n=0);
                break query_done; /* original goto query_done */
            }
        } while(C.cell(pack,"char").value);
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(do_unpaid)||C.i32(do_usedup)))||C.i32(do_blessed)))||C.i32(do_cursed)))||C.i32(do_uncursed)))||C.i32(do_buc_unknown)))||num_justpicked))) {
            C.add_menu_str(win,C.literal(""));
        }
        /* unpaid items if there are any */
        if(do_unpaid) {
            (invlet=C.i8(117));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=117);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,C.literal("Unpaid items"),2);
        }
        /* billed items: checked by caller, so always include if BILLED_TYPES */
        if(do_usedup) {
            (invlet=C.i8(120));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=120);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,C.literal("Unpaid items already used up"),2);
        }
        /* items with b/u/c/unknown if there are any;
       this cluster of menu entries is in alphabetical order,
       reversing the usual sequence of 'U' and 'C' in BUCX */
        if(do_blessed) {
            (invlet=C.i8(66));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=66);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,C.literal("Items known to be Blessed"),2);
        }
        if(do_cursed) {
            (invlet=C.i8(67));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=67);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,C.literal("Items known to be Cursed"),2);
        }
        if(do_uncursed) {
            (invlet=C.i8(85));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=85);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,C.literal("Items known to be Uncursed"),2);
        }
        if(do_buc_unknown) {
            (invlet=C.i8(88));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=88);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,C.literal("Items of unknown Bless/Curse status"),2);
        }
        if(num_justpicked) {
            let tmpbuf=C.stackAlloc((1*256));
            if(Number(num_justpicked==1)) C.variadic(19,tmpbuf,C.literal("Just picked up: %s"),C.doname(find_justpicked(olist)));
 else C.strcpy(tmpbuf,C.literal("Items you just picked up"));
            (invlet=C.i8(80));
            C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
            (C.field(any,"any","a_int").value=80);
            C.add_menu(win,C.nul_glyphinfo,any,invlet,C.i8(0),0,clr,tmpbuf,2);
        }
        C.indirect(18,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,qstr);
        (n=C.select_menu(win,how,pick_list));
        if(Number(n>0)) {
            ((Number(!!((Number(C.cell(pick_list,"struct mi *").value!=(0)))||((C.__assert_fail(C.literal("*pick_list != NULL"),C.literal("pickup.c"),1451,(C.literal("query_category"))),0))))));
        }
        /* handle ParanoidAutoAll by confirming 'A' choice if present */
        if(Number(!!(Number(n>0)&&C.i32(verify_All)))) {
            let i; let j;
            for((i=0);Number(i<n);(()=>{const __old=i;i=C.i32((__old+1));return i;})()) if(Number(C.field(C.field(((C.cell(pick_list,"struct mi *").value)+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value==65)) {
                /* ParanoidAutoAll is set (otherwise verify_All is false);
                   if ParanoidConfirm is also set, require "yes" rather than
                   just "y" to accept (and "no" rather than "n" to decline;
                   accepts "quit" and ESC without converting them to 'n') */
                switch(C.i32(C.paranoid_ynq(C.i8((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(1))))!=C.u32(0)))),C.literal("Really autoselect All?"),(C.i8(1))))) {
                    case (121):
                        /* yes => honor Auto-select All */
                        break;
                    case (110):
                        /* no => remove 'A' from the list; if that would make
                       it empty then replace with 'a' */
                        if(Number(n>1)) {
                            for((j=C.i32((i+1)));Number(j<n);(()=>{const __old=j;j=C.i32((__old+1));return j;})()) C.copy(((C.cell(pick_list,"struct mi *").value)+Number(C.i32((j-1)))*C.sizes["struct mi"]),((C.cell(pick_list,"struct mi *").value)+Number(j)*C.sizes["struct mi"]),C.sizes["struct mi"]);

                            (()=>{const __old=n;n=C.i32((__old-1));return n;})();
                            break;
                            /* from switch */
                        } else if(Number((C.i32((qflags&32)))!=0)) {
                            /* 'A' was the only choice; convert it to 'a' and
                           then let the next menu offer a choice of all */
                            (C.field(C.field(((C.cell(pick_list,"struct mi *").value)+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value=C.i32((-2)));
                            /* assert( n == 1 ); */
                            break;
                            /* from switch */
                        }
                    ;
                    /*FALLTHRU*/
                    case (113):
                        default:
                            /* quit | ESC => cancel, no Auto-select and no 2nd menu */
                            (n=0);
                    (C.free(C.cell(pick_list,"struct mi *").value),(C.cell(pick_list,"struct mi *").value=0));
                    break;
                }
                break;
                /* from for => goto query_done; */
            }

        } else if(Number(!!(Number(!!(Number(n==1)&&Number(!(verify_All))))&&Number(C.field(C.field(((C.cell(pick_list,"struct mi *").value)+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value==65)))) {
            /* without paranoid_confirm:A, choosing 'A' by itself is rejected */
            (n=0);
            (C.free(C.cell(pick_list,"struct mi *").value),(C.cell(pick_list,"struct mi *").value=0));
            /* the menu entry description is "Auto-select every relevant item"
           [not sure whether issuing a message here is a good idea...] */
            C.variadic(20,C.literal("No relevant items selected."));
        }
    }
    /* original label query_done */
    C.indirect(19,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    if(Number(n<0)) (n=0);
    /* closed menu with ESC */
    /* callers don't expect -1 */
    return n;
    } finally {C.stackRestore(stackFrame); }
}

export function count_categories(olist,qflags)
{
    olist=C.ptr(olist);
    qflags=C.i32(qflags);
    let pack;
    let counted_category;
    let ccount=0;
    let curr;
    let do_worn=C.i8(Number((C.i32((qflags&16)))!=0));
    (pack=C.field(C.flags,"flag","inv_order").address);
    do {
        (counted_category=(C.i8(0)));
        for((curr=olist);curr;(curr=(((C.i32(((qflags)&1)))?C.field(C.field((curr),"obj","v").address,"vptrs","v_nexthere").value:C.field((curr),"obj","nobj").value)))) {
            if(Number(C.i32(C.field(curr,"obj","oclass").value)==C.i32(C.cell(pack,"char").value))) {
                if(Number(!!(C.i32(do_worn)&&Number(!((C.i64((C.field(curr,"obj","owornmask").value&(C.i64((C.i64(((C.i64((C.i64((C.i64((C.i64((C.i64((C.i64((1n|2n))|4n))|8n))|16n))|32n))|64n)))|(C.i64((C.i64(((C.i64((131072n|262144n)))|65536n))|524288n)))))|(C.i64((C.i64((256n|1024n))|512n)))))))))))))) continue;
                if(Number(!(counted_category))) {
                    (()=>{const __old=ccount;ccount=C.i32((__old+1));return __old;})();
                    (counted_category=(C.i8(1)));
                }
            }
        }
        (()=>{const __old=pack;pack=C.ptr((__old+Number(1)));return __old;})();
    } while(C.cell(pack,"char").value);
    return ccount;
}

/*
 *  How much the weight of the given container will change when the given
 *  object is removed from it.  Use before and after weight amounts rather
 *  than trying to match the calculation used by weight() in mkobj.c.
 */
export function delta_cwt(container,obj)
{
    container=C.ptr(container);
    obj=C.ptr(obj);
    let prev;
    let owt; let nwt;
    if(Number(C.i32(C.field(container,"obj","otyp").value)!=C.BAG_OF_HOLDING)) return C.i32(C.field(obj,"obj","owt").value);
    (owt=(nwt=C.i32(C.field(container,"obj","owt").value)));
    /* find the object so that we can remove it */
    for((prev=C.field(container,"obj","cobj").address);C.cell(prev,"struct obj *").value;(prev=C.field((C.cell(prev,"struct obj *").value),"obj","nobj").address)) if(Number(C.cell(prev,"struct obj *").value==obj)) break;

    if(Number(!(C.cell(prev,"struct obj *").value))) {
        C.variadic(21,C.literal("delta_cwt: obj not inside container?"));
    } else {
        /* temporarily remove the object and calculate resulting weight */
        (C.cell(prev,"struct obj *").value=C.field(obj,"obj","nobj").value);
        (nwt=C.weight(container));
        (C.cell(prev,"struct obj *").value=obj);
        /* put the object back; obj->nobj is still valid */
    }
    return C.i32((owt-nwt));
}

/* could we carry `obj'? if not, could we carry some of it/them? */
export function carry_count(obj,container,count,telekinesis,wt_before,wt_after)
{
    obj=C.ptr(obj);
    container=C.ptr(container);
    count=C.i64(count);
    telekinesis=C.i8(telekinesis);
    wt_before=C.ptr(wt_before);
    wt_after=C.ptr(wt_after);
    const stackFrame=C.stackSave();
    try {
    /* object to pick up... */
    /* ...bag it is coming out of */
    let adjust_wt=C.i8(Number(!!(container&&(Number(C.i32(C.field((container),"obj","where").value)==3))))); let is_gold=C.i8(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS));
    let wt; let iw; let ow; let oow;
    let qq; let savequan; let umoney;
    let saveowt;
    let verb; let prefx1; let prefx2; let suffx;
    let obj_nambuf=C.stackAlloc((1*256)); let where=C.stackAlloc((1*256));
    (savequan=C.field(obj,"obj","quan").value);
    (saveowt=C.field(obj,"obj","owt").value);
    (umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value));
    (iw=C.max_capacity());
    if(Number(count!=savequan)) {
        (C.field(obj,"obj","quan").value=count);
        (C.field(obj,"obj","owt").value=C.u32(C.weight(obj)));
    }
    (wt=C.i32((iw+C.i32(C.field(obj,"obj","owt").value))));
    if(adjust_wt) (wt=C.i32(wt-delta_cwt(container,obj)));
    /* This will go with silver+copper & new gold weight */
    if(is_gold) (wt=C.i32(C.i64(wt)-(C.i64((C.i64(((C.i64(((C.i64(((umoney)+50n)))/100n)))+(C.i64(((C.i64(((count)+50n)))/100n)))))-(C.i64(((C.i64(((C.i64((umoney+count)))+50n)))/100n))))))));
    /* merged gold might affect cumulative weight */
    if(Number(count!=savequan)) {
        (C.field(obj,"obj","quan").value=savequan);
        (C.field(obj,"obj","owt").value=saveowt);
    }
    (C.cell(wt_before,"int").value=iw);
    (C.cell(wt_after,"int").value=wt);
    if(Number(wt<0)) return count;
    /* see how many we can lift */
    if(is_gold) {
        (iw=C.i32(iw-C.i32((C.i64(((C.i64(((umoney)+50n)))/100n))))));
        if(Number(!(adjust_wt))) {
            (qq=(C.i64((C.i64(((C.i64(((C.i64(iw))*C.i64((-100n)))))-(C.i64(((umoney)+50n)))))-1n))));
        } else {
            (oow=0);
            (qq=C.i64((C.i64((50n-(C.i64((umoney%100n)))))-1n)));
            if(Number(qq<0n)) (qq=C.i64(qq+100n));
            for(;Number(qq<=count);(qq=C.i64(qq+100n))) {
                (C.field(obj,"obj","quan").value=qq);
                (C.field(obj,"obj","owt").value=C.u32((C.i64(((C.i64(((qq)+50n)))/100n)))));
                (ow=C.i32((C.i64(((C.i64(((C.i64((umoney+qq)))+50n)))/100n)))));
                (ow=C.i32(ow-delta_cwt(container,obj)));
                if(Number(C.i32((iw+ow))>=0)) break;
                (oow=ow);
            }
            (iw=C.i32(iw-oow));
            (qq=C.i64(qq-100n));
        }
        if(Number(qq<0n)) (qq=0n);
 else if(Number(qq>count)) (qq=count);
        (wt=C.i32((iw+C.i32((C.i64(((C.i64(((C.i64((umoney+qq)))+50n)))/100n)))))));
    } else if(Number(!!(Number(count>C.i64(1))||Number(count<C.field(obj,"obj","quan").value)))) {
        /*
         * Ugh. Calc num to lift by changing the quan of the
         * object and calling weight.
         *
         * This works for containers only because containers
         * don't merge.  -dean
         */
        for((qq=1n);Number(qq<=count);(()=>{const __old=qq;qq=C.i64((__old+1n));return __old;})()) {
            (C.field(obj,"obj","quan").value=qq);
            (C.field(obj,"obj","owt").value=C.u32(((ow=C.weight(obj)))));
            if(adjust_wt) (ow=C.i32(ow-delta_cwt(container,obj)));
            if(Number(C.i32((iw+ow))>=0)) break;
            (wt=C.i32((iw+ow)));
        }
        (()=>{const __old=qq;qq=C.i64((__old-1n));return qq;})();
    } else {
        /* there's only one, and we can't lift it */
        (qq=0n);
    }
    (C.field(obj,"obj","quan").value=savequan);
    (C.field(obj,"obj","owt").value=saveowt);
    if(Number(qq<count)) {
        /* some message will be given */
        C.strcpy(obj_nambuf,C.doname(obj));
        if(container) {
            C.variadic(22,where,C.literal("in %s"),C.the(C.xname(container)));
            (verb=C.literal("carry"));
        } else {
            C.strcpy(where,C.literal("lying here"));
            (verb=(C.i32(telekinesis)?C.literal("acquire"):C.literal("lift")));
        }
    } else {
        /* lint suppression */
        (C.cell(obj_nambuf,"char").value=(C.cell(where,"char").value=C.i8(0)));
        (verb=C.literal(""));
    }
    /* we can carry qq of them */
    if(Number(qq>C.i64(0))) {
        if(Number(qq<count)) C.variadic(23,C.literal("can only %s %s of the %s %s."),verb,((Number(qq==1n))?C.literal("one"):C.literal("some")),obj_nambuf,where);
        (C.cell(wt_after,"int").value=wt);
        return qq;
    }
    if(Number(!(container))) C.strcpy(where,C.literal("here"));
    /* slightly shorter form */
    if(Number(!!(C.field(C.gi,"instance_globals_i","invent").value||umoney))) {
        (prefx1=C.literal("you cannot "));
        (prefx2=C.literal(""));
        (suffx=C.literal(" any more"));
    } else {
        (prefx1=((Number(C.field(obj,"obj","quan").value==1n))?C.literal("it "):C.literal("even one ")));
        (prefx2=C.literal("is too heavy for you to "));
        (suffx=C.literal(""));
    }
    C.variadic(24,C.literal("%s %s %s, but %s%s%s%s."),C.otense(obj,C.literal("are")),obj_nambuf,where,prefx1,prefx2,verb,suffx);
    /* *wt_after = iw; */
    return 0n;
    } finally {C.stackRestore(stackFrame); }
}

/* determine whether character is able and player is willing to carry `obj' */
export function lift_object(obj,container,cnt_p,telekinesis)
{
    obj=C.ptr(obj);
    container=C.ptr(container);
    cnt_p=C.ptr(cnt_p);
    telekinesis=C.i8(telekinesis);
    const stackFrame=C.stackSave();
    try {
    /* object to pick up... */
    /* ...bag it's coming out of */
    let result; let old_wt=C.local("int",0); let new_wt=C.local("int",0); let prev_encumbr; let next_encumbr;
    if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)&&C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value)))) {
        C.variadic(25,C.literal("cannot get your %s around this %s."),C.body_part(C.HAND),C.xname(obj));
        return C.i32((-1));
    }
    /* override weight consideration for loadstone picked up by anybody
       and for boulder picked up by hero poly'd into a giant; override
       availability of open inventory slot iff not already carrying one */
    if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LOADSTONE)||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)&&(Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(134217728n))))!=C.u64(0n))))))))) {
        if(Number(!!(Number(!!(Number(C.inv_cnt((C.i8(0)))<C.invlet_basic)||Number(!(C.carrying(C.i32(C.field(obj,"obj","otyp").value))))))||C.merge_choice(C.field(C.gi,"instance_globals_i","invent").value,obj)))) return 1;
        /* lift regardless of current situation */
        /* if we reach here, we're out of slots and already have at least
           one of these, so treat this one more like a normal item
           [this was using simpleonames(obj) for shortest description, but
           that's suboptimal for loadstones because it omits user-assigned
           type name which is something of interest for gray stones] */
        C.variadic(26,C.literal("are carrying too much stuff to pick up %s %s."),((Number(C.field(obj,"obj","quan").value==1n))?C.literal("another"):C.literal("more")),C.xname(obj));
        return C.i32((-1));
    }
    (C.cell(cnt_p,"long").value=carry_count(obj,container,C.cell(cnt_p,"long").value,telekinesis,old_wt.address,new_wt.address));
    if(Number(C.cell(cnt_p,"long").value<1n)) {
        (result=C.i32((-1)));
        /* nothing lifted */
    } else if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)&&Number(C.inv_cnt((C.i8(0)))>=C.invlet_basic)))&&Number(!(C.merge_choice(C.field(C.gi,"instance_globals_i","invent").value,obj)))))) {
        /* [exception for gold coins will have to change
                   if silver/copper ones ever get implemented] */
        /* if there is some gold here (and we haven't already skipped it),
           we aren't limited by the 52 item limit for it, but caller and
           "grandcaller" aren't prepared to skip stuff and then pickup
           just gold, so the best we can do here is vary the message */
        C.variadic(27,C.literal("knapsack cannot accommodate any more items%s."),(C.nxtobj(obj,C.GOLD_PIECE,C.i8((Number(C.i32(C.field(obj,"obj","where").value)==1))))?C.literal(" (except gold)"):C.literal("")));
        /* floor follows by nexthere, otherwise container so by nobj */
        (result=C.i32((-1)));
        /* nothing lifted */
    } else {
        (result=1);
        (prev_encumbr=C.near_capacity());
        if(Number(prev_encumbr<C.field(C.flags,"flag","pickup_burden").value)) (prev_encumbr=C.field(C.flags,"flag","pickup_burden").value);
        (next_encumbr=C.calc_capacity(C.i32((new_wt.value-old_wt.value))));
        if(Number(next_encumbr>prev_encumbr)) {
            if(telekinesis) {
                (result=0);
                /* don't lift */
            } else {
                let qbuf=C.stackAlloc((1*256));
                let savequan=C.field(obj,"obj","quan").value;
                (C.field(obj,"obj","quan").value=C.cell(cnt_p,"long").value);
                C.variadic(28,qbuf,C.literal("%s %s "),((Number(next_encumbr>=C.EXT_ENCUMBER))?C.staticAddress("overloadpfx"):((Number(next_encumbr>=C.HVY_ENCUMBER))?C.staticAddress("nearloadpfx"):((Number(next_encumbr>=C.MOD_ENCUMBER))?C.staticAddress("moderateloadpfx"):C.staticAddress("slightloadpfx")))),(Number(!(container))?C.literal("lifting"):C.literal("removing")));
                C.safe_qbuf(qbuf,qbuf,C.literal(".  Continue?"),obj,C.nativeFunctionPointer("doname"),C.nativeFunctionPointer("ansimpleoname"),C.field(C.c_common_strings,"c_common_strings","c_something").value);
                (C.field(obj,"obj","quan").value=savequan);
                switch(C.i32(C.yn_function(qbuf,C.ynqchars,C.i8(113),(C.i8(1))))) {
                    case (113):
                        (result=C.i32((-1)));
                    break;
                    case (110):
                        (result=0);
                    break;
                    default:
                        break;
                    /* 'y' => result == 1 */
                }
                C.indirect(20,(C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),C.global("WIN_MESSAGE").value);
            }
        }
    }
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_SCARE_MONSTER)&&Number(result<=0)))&&Number(!(container))))) (C.field(obj,"obj","spe").value=C.i8(0));
    return result;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Pick up <count> of obj from the ground and add it to the hero's inventory.
 * Returns -1 if caller should break out of its loop, 0 if nothing picked
 * up, 1 if otherwise.
 */
export function pickup_object(obj,count,telekinesis)
{
    obj=C.ptr(obj);
    count=C.i64(count);
    telekinesis=C.i8(telekinesis);
    const stackFrame=C.stackSave();
    try {
    count=C.local("long",count);
    /* if non-zero, pick up a subset of this amount */
    /* not picking it up directly by hand */
    let res;
    if(Number(C.field(obj,"obj","quan").value<count.value)) {
        C.variadic(29,C.literal("pickup_object: count %ld > quan %ld?"),count.value,C.field(obj,"obj","quan").value);
        return 0;
    }
    /* In case of auto-pickup, where we haven't had a chance
       to look at it yet; affects docall(SCR_SCARE_MONSTER). */
    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.observe_object(obj);
    if(Number(obj==C.global("uchain").value)) {
        /* do not pick up attached chain */
        return 0;
    } else if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==4)&&Number(C.field(obj,"obj","owornmask").value!=0n)))&&(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&(Number(C.field(C.u,"you","ustuck").value==(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value))))))))) {
        C.variadic(30,C.literal("pick %s up."),C.ysimple_name(obj));
        return 0;
    } else if(Number(!!(C.i32(C.field(obj,"obj","oartifact").value)&&Number(!(C.touch_artifact(obj,C.field(C.gy,"instance_globals_y","youmonst").address)))))) {
        return 0;
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)) {
        if(Number(!!(C.i32(fatal_corpse_mistake(obj,telekinesis))||C.i32(rider_corpse_revival(obj,telekinesis))))) return C.i32((-1));
    } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_SCARE_MONSTER)) {
        let old_wt=C.local("int",0); let new_wt=C.local("int",0);
        /* process a count before altering/deleting scrolls;
           tricky because being unable to lift full stack imposes an
           implicit count; unliftable ones should be treated as if
           the count excluded them so that they don't change state */
        if(Number(((count.value=carry_count(obj,0,(count.value?count.value:C.field(obj,"obj","quan").value),(C.i8(0)),old_wt.address,new_wt.address)))<1n)) return C.i32((-1));
        /* couldn't even pick up 1, so effectively untouched */
        /* all current callers handle a new object sanely when traversing
           a list; other half of a split will be left as-is and whatever
           already follows 'obj' will still be processed next */
        if(Number(!!(Number(count.value>0n)&&Number(count.value<C.field(obj,"obj","quan").value)))) (obj=C.splitobj(obj,count.value));
        if(C.field(obj,"obj","blessed").value) {
            C.unbless(obj);
        } else if(Number(!!(Number(!(C.field(obj,"obj","spe").value))&&Number(!(C.field(obj,"obj","cursed").value))))) {
            (C.field(obj,"obj","spe").value=C.i8(1));
        } else {
            C.variadic(31,C.literal("scroll%s %s to dust as you %s %s up."),(((Number((C.field(obj,"obj","quan").value)==C.i64(1)))?C.literal(""):C.literal("s"))),C.otense(obj,C.literal("turn")),(C.i32(telekinesis)?C.literal("raise"):C.literal("pick")),((Number(C.field(obj,"obj","quan").value==1n))?C.literal("it"):C.literal("them")));
            C.trycall(obj);
            C.useupf(obj,C.field(obj,"obj","quan").value);
            return 1;
            /* tried to pick something up and failed, but
                         don't want to terminate pickup loop yet   */
        }
    }
    /* obj has either already passed autopick_testobj or we are explicitly
       picking it off the floor, so addinv() will override obj->how_lost;
       otherwise we couldn't pick up a thrown, stolen, or dropped item that
       was split off from a carried stack even while still carrying the
       rest of the stack unless we have at least one free slot available */
    (res=lift_object(obj,0,count.address,telekinesis));
    if(Number(res<=0)) return res;
    /* What's left of the special case for gold :-) */
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    if(Number(!!(Number(C.field(obj,"obj","quan").value!=count.value)&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.LOADSTONE)))) (obj=C.splitobj(obj,count.value));
    (obj=pick_obj(obj));
    if(Number(!!(C.global("uwep").value&&Number(C.global("uwep").value==obj)))) (C.field(C.gm,"instance_globals_m","mrg_to_wielded").value=(C.i8(1)));
    pickup_prinv(obj,count.value,C.literal("lifting"));
    if(C.field(obj,"obj","ghostly").value) C.fix_ghostly_obj(obj);
    (C.field(C.gm,"instance_globals_m","mrg_to_wielded").value=(C.i8(0)));
    return 1;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Do the actual work of picking otmp from the floor or monster's interior
 * and putting it in the hero's inventory.  Take care of billing.  Return a
 * pointer to the object where otmp ends up.  This may be different
 * from otmp because of merging.
 */
export function pick_obj(otmp)
{
    otmp=C.ptr(otmp);
    const stackFrame=C.stackSave();
    try {
    let result;
    let ox=C.local("short",0); let oy=C.local("short",0);
    let robshop; let fromfloor=C.i8(Number(C.i32(C.field(otmp,"obj","where").value)==1));
    /* otmp is either on the floor or in an engulfer's inventory; for the
       latter, its <ox,oy> probably won't be set */
    C.get_obj_location(otmp,ox.address,oy.address,0);
    (robshop=C.i8((Number(!!(Number(!!(Number(!(C.field(C.u,"you","uswallow").value))&&Number(otmp!=C.global("uball").value)))&&C.i32(C.costly_spot(ox.value,oy.value)))))));
    C.obj_extract_self(otmp);
    if(fromfloor) C.newsym(ox.value,oy.value);
    /* for shop items, addinv() needs to be after addtobill() (so that
       object merger can take otmp->unpaid into account) but before
       remote_robbery() (which calls rob_shop() which calls setpaid()
       after moving costs of unpaid items to shop debt; setpaid()
       calls clear_unpaid() for lots of object chains, but 'otmp' isn't
       on any of those between obj_extract_self() and addinv(); for
       3.6.0, 'otmp' remained flagged as an unpaid item in inventory
       and triggered impossible() every time inventory was examined) */
    if(robshop) {
        let saveushops=C.stackAlloc((1*5)); let fakeshop=C.stackAlloc((1*2));
        /* addtobill cares about your location rather than the object's;
           usually they'll be the same, but not when using telekinesis
           (if ever implemented) or a grappling hook */
        C.strcpy(saveushops,C.field(C.u,"you","ushops").address);
        (C.cell((fakeshop+Number(0)*1),"char").value=C.cell(C.in_rooms(ox.value,oy.value,C.SHOPBASE),"char").value);
        (C.cell((fakeshop+Number(1)*1),"char").value=C.i8(0));
        C.strcpy(C.field(C.u,"you","ushops").address,fakeshop);
        /* sets obj->unpaid if necessary */
        C.addtobill(otmp,(C.i8(1)),(C.i8(0)),(C.i8(0)));
        C.strcpy(C.field(C.u,"you","ushops").address,saveushops);
        (robshop=C.i8(Number(!!(C.i32(C.field(otmp,"obj","unpaid").value)&&Number(!(C.strchr(C.field(C.u,"you","ushops").address,C.i32(C.cell(fakeshop,"char").value))))))));
    }
    (result=C.addinv(otmp));
    /* if you're taking a shop item from outside the shop, make shk notice */
    if(robshop) C.remote_burglary(ox.value,oy.value);
    return result;
    } finally {C.stackRestore(stackFrame); }
}

/* pickup_object()/out_container() helper;
   print an added-to-invent message for current object, limiting feedback
   about encumbrance to the first item which causes that to change */
export function pickup_prinv(obj,count,verb)
{
    obj=C.ptr(obj);
    count=C.i64(count);
    verb=C.ptr(verb);
    const stackFrame=C.stackSave();
    try {
    let pbuf=C.stackAlloc((1*128));
    let prefix;
    let nearload=C.near_capacity();
    (C.cell((pbuf+Number(0)*1),"char").value=C.i8(0));
    if(Number(nearload==C.field(C.gp,"instance_globals_p","pickup_encumbrance").value)) {
        (prefix=0);
    } else {
        (prefix=((Number(nearload>=C.EXT_ENCUMBER))?C.staticAddress("overloadpfx"):((Number(nearload>=C.HVY_ENCUMBER))?C.staticAddress("nearloadpfx"):((Number(nearload>=C.MOD_ENCUMBER))?C.staticAddress("moderateloadpfx"):((Number(nearload>=C.SLT_ENCUMBER))?C.staticAddress("slightloadpfx"):0)))));
        (C.field(C.gp,"instance_globals_p","pickup_encumbrance").value=nearload);
    }
    if(prefix) C.variadic(32,pbuf,C.literal("%s %s"),prefix,verb);
    C.prinv(pbuf,obj,count);
    } finally {C.stackRestore(stackFrame); }
}

/*
 * prints a message if encumbrance changed since the last check
 */
export function encumber_msg()
{
    let newcap=C.near_capacity();
    if(Number(C.field(C.go,"instance_globals_o","oldcap").value<newcap)) {
        switch(newcap) {
            case (1):
                C.variadic(33,C.literal("movements are slowed slightly because of your load."));
            break;
            case (2):
                C.variadic(34,C.literal("rebalance your load.  Movement is difficult."));
            break;
            case (3):
                C.variadic(35,C.literal("%s under your heavy load.  Movement is very hard."),C.stagger(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,C.literal("stagger")));
            break;
            default:
                C.variadic(36,C.literal("%s move a handspan with this load!"),(Number(newcap==4)?C.literal("can barely"):C.literal("can't even")));
            break;
        }
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    } else if(Number(C.field(C.go,"instance_globals_o","oldcap").value>newcap)) {
        switch(newcap) {
            case (0):
                C.variadic(37,C.literal("movements are now unencumbered."));
            break;
            case (1):
                C.variadic(38,C.literal("movements are only slowed slightly by your load."));
            break;
            case (2):
                C.variadic(39,C.literal("rebalance your load.  Movement is still difficult."));
            break;
            case (3):
                C.variadic(40,C.literal("%s under your load.  Movement is still very hard."),C.stagger(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,C.literal("stagger")));
            break;
        }
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    }
    (C.field(C.go,"instance_globals_o","oldcap").value=newcap);
}

/* Is there a container at x,y. Optional: return count of containers at x,y */
export function container_at(x,y,countem)
{
    x=C.i16(x);
    y=C.i16(y);
    countem=C.i8(countem);
    let cobj; let nobj;
    let container_count=0;
    for((cobj=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);cobj;(cobj=nobj)) {
        (nobj=C.field(C.field(cobj,"obj","v").address,"vptrs","v_nexthere").value);
        if((Number(!!(Number(C.i32(C.field((cobj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((cobj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) {
            (()=>{const __old=container_count;container_count=C.i32((__old+1));return __old;})();
            if(Number(!(countem))) break;
        }
    }
    return container_count;
}

export function able_to_loot(x,y,looting)
{
    x=C.i16(x);
    y=C.i16(y);
    looting=C.i8(looting);
    /* loot vs tip */
    let verb=(C.i32(looting)?C.literal("loot"):C.literal("tip"));
    let t=C.t_at(x,y);
    if(Number(!(C.can_reach_floor(C.i8(Number(!!(t&&(Number(!!(Number(C.i32((C.field(t,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(t,"trap","ttyp").value))==C.SPIKED_PIT))))))))))) {
        if(Number(!!(C.field(C.u,"you","usteed").value&&Number(C.i32((C.field((C.field(C.u,"you","weapon_skills").address+Number(C.P_RIDING)*C.sizes["struct skills"]),"skills","skill").value))<C.P_BASIC)))) C.rider_cant_reach();
 else C.cant_reach_floor(x,y,(C.i8(0)),(C.i8(1)),(C.i8(0)));
        /* not skilled enough to reach */
        return (C.i8(0));
    } else if(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&(Number(!!(C.i32(looting)||Number(!((C.field(C.u,"you","uinwater").value)))))))))||C.i32(C.is_lava(x,y))))) {
        /* at present, can't loot in water even when Underwater;
           can tip underwater, but not when over--or stuck in--lava */
        C.variadic(41,C.literal("cannot %s things that are deep in the %s."),verb,C.hliquid((C.i32(C.is_lava(x,y))?C.literal("lava"):C.literal("water"))));
        return (C.i8(0));
    } else if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(24576n))))==C.u64(24576n)))) {
        C.variadic(42,C.literal("Without limbs, you cannot %s anything."),verb);
        return (C.i8(0));
    } else if(Number(!!(C.i32(looting)&&Number(!(C.freehand()))))) {
        C.variadic(43,C.literal("Without a free %s, you cannot loot anything."),C.body_part(C.HAND));
        return (C.i8(0));
    }
    return (C.i8(1));
}

export function mon_beside(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let i; let j;
    let nx; let ny;
    for((i=C.i32((-1)));Number(i<=1);(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) for((j=C.i32((-1)));Number(j<=1);(()=>{const __old=j;j=C.i32((__old+1));return __old;})()) {
        (nx=C.i16(C.i32((C.i32(x)+i))));
        (ny=C.i16(C.i32((C.i32(y)+j))));
        if(Number(!!(C.isok(nx,ny)&&(Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(nx)*(8*21))+Number(ny)*8),"struct monst *").value!=0))))) return (C.i8(1));
    }

    return (C.i8(0));
}

export function do_loot_cont(cobjp,cindex,ccount)
{
    cobjp=C.ptr(cobjp);
    cindex=C.i32(cindex);
    ccount=C.i32(ccount);
    /* index of this container (1..N)... */
    /* ...number of them (N) */
    let cobj=C.cell(cobjp,"struct obj *").value;
    if(Number(!(cobj))) return 0;
    if(C.field(cobj,"obj","olocked").value) {
        let res=0;
        if(C.field(cobj,"obj","lknown").value) C.variadic(44,C.literal("%s is locked."),C.The(C.xname(cobj)));
 else C.variadic(45,C.literal("Hmmm, %s turns out to be locked."),C.the(C.xname(cobj)));
        (C.field(cobj,"obj","lknown").value=C.u32(1));
        if(C.field(C.flags,"flag","autounlock").value) {
            let otmp; let unlocktool=0;
            let ox=C.field(cobj,"obj","ox").value; let oy=C.field(cobj,"obj","oy").value;
            (C.field(C.u,"you","dz").value=0);
            /* might be non-zero from previous command since
                       * #loot isn't a move command; pick_lock() cares */
            /* if both the untrap and apply_key bits are set, untrap
               attempt will be performed first but we need to set up
               unlocktool in case "check for trap?" is declined */
            if(Number(!!((Number(!!(Number((C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(2))))!=C.u32(0))&&Number(((unlocktool=C.autokey((C.i8(1)))))!=0))))||Number((C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(1))))!=C.u32(0))))) {
                /* pass ox and oy to avoid direction prompt */
                if(C.pick_lock(unlocktool,ox,oy,cobj)) (res=1);
                /* attempting to untrap or unlock might trigger a trap
                   which destroys 'cobj'; inform caller if that happens */
                for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(ox)*(8*21))+Number(oy)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(otmp==cobj)) break;

                if(Number(!(otmp))) (C.cell(cobjp,"struct obj *").value=0);
                return res;
            }
            if(Number(!!(Number(!!(Number(!!(Number((C.u32((C.field(C.flags,"flag","autounlock").value&C.u32(8))))!=C.u32(0))&&Number(res!=1)))&&Number(ccount==1)))&&C.i32(C.u_have_forceable_weapon())))) {
                /* single container, and we could #force it open... */
                /* note: doforce asks for confirmation */
                C.cmdq_add_ec(C.CQ_CANNED,C.nativeFunctionPointer("doforce"));
                (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(1)));
            }
        }
        return res;
    }
    (C.field(cobj,"obj","lknown").value=C.u32(1));
    /* floor container, so no need for update_inventory() */
    if(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.BAG_OF_TRICKS)) {
        let tmp;
        C.variadic(46,C.literal("carefully open %s..."),C.the(C.xname(cobj)));
        C.variadic(47,C.literal("It develops a huge set of teeth and bites you!"));
        (tmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2155,(C.literal("do_loot_cont"))),C.rnd(10))):C.rnd(10))));
        C.losehp(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_PHDAM)*C.sizes["struct prop"]),"prop","extrinsic").value))))?(C.i32(Math.trunc(((C.i32(((tmp)+1)))/2)))):(tmp))),C.literal("carnivorous bag"),C.i8(0));
        C.discover_object((C.BAG_OF_TRICKS),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(1)));
        return 1;
    }
    return use_container(cobjp,(C.i8(0)),C.i8((Number(cindex<ccount))));
}

/* #loot extended command */
export function doloot()
{
    let res;
    (C.field(C.gl,"instance_globals_l","loot_reset_justpicked").value=(C.i8(1)));
    (res=doloot_core());
    (C.field(C.gl,"instance_globals_l","loot_reset_justpicked").value=(C.i8(0)));
    return res;
}

/* loot a container on the floor or loot saddle from mon. */
export function doloot_core()
{
    const stackFrame=C.stackSave();
    try {
    let cobj=C.local("struct obj *",0); let nobj;
    let c=C.i32((-1));
    let timepassed=0;
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    let underfoot=(C.i8(1));
    let dont_find_anything=C.literal("don't find anything");
    let mtmp;
    let prev_inquiry=C.local("int",0);
    let prev_loot=C.local("signed char",(C.i8(0)));
    let num_conts=0;
    let clr=8;
    (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(0)));
    if(C.check_capacity(0)) {
        /* "Can't do that while carrying so much stuff." */
        return 0;
    }
    if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))) {
        C.variadic(48,C.literal("have no hands!"));
        /* not `body_part(HAND)' */
        return 0;
    }
    if(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value) {
        if(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2203,(C.literal("doloot_core"))),C.rn2(6))):C.rn2(6)))&&C.i32(reverse_loot())))) return 1;
        if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2205,(C.literal("doloot_core"))),C.rn2(2))):C.rn2(2)))) {
            C.variadic(49,C.literal("Being confused, you find nothing to loot."));
            return 1;
            /* costs a turn */
        }
        /* else fallthrough to normal looting */
    }
    (C.field(cc,"nhcoord","x").value=C.field(C.u,"you","ux").value);
    (C.field(cc,"nhcoord","y").value=C.field(C.u,"you","uy").value);
    let lootPhase=0;
    if(C.field(C.iflags,"instance_flags","menu_requested").value) lootPhase=1; /* original goto lootmon */
    loot_cycle: for(;;){
        if(lootPhase===0){
            /* original label lootcont */
            if(Number(((num_conts=container_at(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,(C.i8(1)))))>0)) {
                let anyfound=(C.i8(0));
                if(Number(!(able_to_loot(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,(C.i8(1)))))) return 0;
                if(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))&&Number(!(C.global("uarmg").value))))) {
                    /* if blind and without gloves, attempting to #loot at the
               location of a cockatrice corpse is fatal before asking
               whether to manipulate any containers */
                    for((nobj=C.sobj_at(C.CORPSE,C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value));nobj;(nobj=C.nxtobj(nobj,C.CORPSE,(C.i8(1))))) if(C.will_feel_cockatrice(nobj,(C.i8(0)))) {
                        C.feel_cockatrice(nobj,(C.i8(0)));
                        /* if life-saved (or poly'd into stone golem),
                       terminate attempt to loot */
                        return 1;
                    }

                }
                if(Number(num_conts>1)) {
                    /* use a menu to loot many containers */
                    let n; let i;
                    let win;
                    let any=C.stackAlloc(C.sizes["union any"]);
                    let pick_list=C.local("struct mi *",0);
                    (C.field(any,"any","a_void").value=0);
                    (win=C.indirect(21,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
                    C.indirect(22,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
                    for((cobj.value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(cc,"nhcoord","x").value)*(8*21))+Number(C.field(cc,"nhcoord","y").value)*8),"struct obj *").value);cobj.value;(cobj.value=C.field(C.field(cobj.value,"obj","v").address,"vptrs","v_nexthere").value)) if((Number(!!(Number(C.i32(C.field((cobj.value),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((cobj.value),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) {
                        (C.field(any,"any","a_obj").value=cobj.value);
                        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.doname(cobj.value),0);
                    }

                    C.indirect(23,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Loot which containers?"));
                    (n=C.select_menu(win,2,pick_list.address));
                    C.indirect(24,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
                    if(Number(n>0)) {
                        for((i=1);Number(i<=n);(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) {
                            (cobj.value=C.field(C.field((pick_list.value+Number(C.i32((i-1)))*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
                            (timepassed=C.i32(timepassed|do_loot_cont(cobj.address,i,n)));
                            if(C.field(C.ga,"instance_globals_a","abort_looting").value) {
                                /* chest trap or magic bag explosion or <esc> */
                                C.free(pick_list.value);
                                return ((timepassed?1:0));
                            }
                        }
                        C.free(pick_list.value);
                    }
                    if(Number(n!=0)) (c=121);
                } else {
                    for((cobj.value=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(cc,"nhcoord","x").value)*(8*21))+Number(C.field(cc,"nhcoord","y").value)*8),"struct obj *").value);cobj.value;(cobj.value=nobj)) {
                        (nobj=C.field(C.field(cobj.value,"obj","v").address,"vptrs","v_nexthere").value);
                        if((Number(!!(Number(C.i32(C.field((cobj.value),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((cobj.value),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) {
                            (anyfound=(C.i8(1)));
                            (timepassed=C.i32(timepassed|do_loot_cont(cobj.address,1,1)));
                            if(C.field(C.ga,"instance_globals_a","abort_looting").value) return ((timepassed?1:0));
                            /* chest trap or magic bag explosion or <esc> */
                        }
                    }
                    if(anyfound) (c=121);
                }
            } else if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(cc,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(cc,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value))==C.GRAVE))) {
                C.variadic(50,C.literal("need to dig up the grave to effectively loot it..."));
            }
        }
        /*
     * 3.3.1 introduced directional looting for some things.
     */
        /* original label lootmon */
        if(Number(!!(Number(c!=121)&&(Number(!!(C.i32(mon_beside(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))||C.i32(C.field(C.iflags,"instance_flags","menu_requested").value))))))) {
            let looted_mon=(C.i8(0));
            if(Number(!(C.get_adjacent_loc(C.literal("Loot in what direction?"),C.literal("Invalid loot location"),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,cc)))) return 0;
            (underfoot=C.i8((Number(!!(Number(C.i32((C.field(cc,"nhcoord","x").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(cc,"nhcoord","y").value))==C.i32(C.field(C.u,"you","uy").value)))))));
            if(Number(!!(C.i32(underfoot)&&container_at(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,(C.i8(0)))))) {lootPhase=0;continue loot_cycle;} /* original goto lootcont */
            if(Number(C.field(C.u,"you","dz").value<0)) {
                C.variadic(51,C.literal("%s to loot on the %s."),dont_find_anything,C.ceiling(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value));
                return 1;
            }
            (mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(cc,"nhcoord","x").value)*(8*21))+Number(C.field(cc,"nhcoord","y").value)*8),"struct monst *").value));
            if(mtmp) {
                (timepassed=loot_mon(mtmp,prev_inquiry.address,prev_loot.address));
                if(timepassed) (looted_mon=(C.i8(1)));
            }
            /* always use a turn when choosing a direction is impaired,
           even if you've successfully targeted a saddled creature
           and then answered "no" to the "remove its saddle?" prompt */
            if(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFUSION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.STUNNED)*C.sizes["struct prop"]),"prop","intrinsic").value))) (timepassed=1);
            /* Preserve pre-3.3.1 behavior for containers.
         * Adjust this if-block to allow container looting
         * from one square away to change that in the future.
         */
            if(Number(!(looted_mon))) {
                if(Number(!!(Number(!(underfoot))&&container_at(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,(C.i8(0)))))) {
                    if(mtmp) {
                        C.variadic(52,C.literal("loot anything %sthere with %s in the way."),(prev_inquiry.value?C.literal("else "):C.literal("")),C.mon_nam(mtmp));
                        return ((timepassed?1:0));
                    } else {
                        C.variadic(53,C.literal("have to be at a container to loot it."));
                    }
                } else {
                    C.variadic(54,C.literal("%s %s%shere to loot."),dont_find_anything,((Number(!!(prev_inquiry.value||C.i32(prev_loot.value))))?C.literal("else "):C.literal("")),(Number(!(underfoot))?C.literal("t"):C.literal("")));
                    return ((timepassed?1:0));
                }
            }
        } else if(Number(!!(Number(c!=121)&&Number(c!=110)))) {
            C.variadic(55,C.literal("%s %s to loot."),dont_find_anything,(C.i32(underfoot)?C.literal("here"):C.literal("there")));
        }
        return ((timepassed?1:0));
        break loot_cycle;
    }
    } finally {C.stackRestore(stackFrame); }
}

/* called when attempting to #loot while confused */
export function reverse_loot()
{
    const stackFrame=C.stackSave();
    try {
    let goldob=0; let coffers; let otmp; let boxdummy=C.stackAlloc(C.sizes["struct obj"]);
    let mon;
    let contribution;
    let n; let x=C.i32(C.field(C.u,"you","ux").value); let y=C.i32(C.field(C.u,"you","uy").value);
    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2357,(C.literal("reverse_loot"))),C.rn2(3))):C.rn2(3)))))) {
        /* n objects: 1/(n+1) chance per object, 1/(n+1) to fall off end */
        for(((n=C.inv_cnt((C.i8(1)))),(otmp=C.field(C.gi,"instance_globals_i","invent").value));otmp;((()=>{const __old=n;n=C.i32((__old-1));return n;})(),(otmp=C.field(otmp,"obj","nobj").value))) if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2361,(C.literal("reverse_loot"))),C.rn2(C.i32((n+1))))):C.rn2(C.i32((n+1)))))))) {
            C.prinv(C.literal("You find old loot:"),otmp,0n);
            return (C.i8(1));
        }

        return (C.i8(0));
    }
    /* find a money object to mess with */
    for((goldob=C.field(C.gi,"instance_globals_i","invent").value);goldob;(goldob=C.field(goldob,"obj","nobj").value)) if(Number(C.i32(C.field(goldob,"obj","oclass").value)==C.COIN_CLASS)) {
        (contribution=C.i64(((C.i64((C.i64((C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2371,(C.literal("reverse_loot"))),C.rnd(5))):C.rnd(5))))*C.field(goldob,"obj","quan").value))+4n)))/5n)));
        if(Number(contribution<C.field(goldob,"obj","quan").value)) (goldob=C.splitobj(goldob,contribution));
        break;
    }

    if(Number(!(goldob))) return (C.i8(0));
    /* gold might be quivered; dropping would un-wear it, but freeinv()
       expects caller to do that; do so now */
    C.remove_worn_item(goldob,(C.i8(0)));
    if(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.THRONE))))) {
        C.dropx(goldob);
        /* the dropped gold might have fallen to lower level */
        if(C.g_at(C.i16(x),C.i16(y))) C.variadic(56,C.literal("Ok, now there is loot here."));
    } else {
        /* find original coffers chest if present, otherwise use nearest */
        (otmp=0);
        for((coffers=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);coffers;(coffers=C.field(coffers,"obj","nobj").value)) if(Number(C.i32(C.field(coffers,"obj","otyp").value)==C.CHEST)) {
            if(Number(C.i32(C.field(coffers,"obj","spe").value)==2)) break;
            /* a throne room chest */
            if(Number(!!(Number(!(otmp))||(Number(C.dist2((C.field(coffers,"obj","ox").value),(C.field(coffers,"obj","oy").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<C.dist2((C.field(otmp,"obj","ox").value),(C.field(otmp,"obj","oy").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))))) (otmp=coffers);
            /* remember closest ordinary chest */
        }

        if(Number(!(coffers))) (coffers=otmp);
        if(coffers) {
            ;
            C.variadic(57,C.literal("Thank you for your contribution to reduce the debt."));
            C.freeinv(goldob);
            C.add_to_container(coffers,goldob);
            (C.field(coffers,"obj","owt").value=C.u32(C.weight(coffers)));
            (C.field(coffers,"obj","cknown").value=C.u32(0));
            if(Number(!(C.field(coffers,"obj","olocked").value))) {
                (C.copy(boxdummy,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]),(C.field(boxdummy,"obj","otyp").value=C.i16(C.SPE_WIZARD_LOCK)));
                C.boxlock(coffers,boxdummy);
            }
        } else if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)!=1)&&Number(((mon=C.makemon(C.courtmon(),C.i16(x),C.i16(y),C.u32(0n))))!=0)))) {
            C.freeinv(goldob);
            C.add_to_minv(mon,goldob);
            C.variadic(58,C.literal("The exchequer accepts your contribution."));
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2418,(C.literal("reverse_loot"))),C.rn2(10))):C.rn2(10)))))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(1));
        } else {
            C.variadic(59,C.literal("drop %s."),C.doname(goldob));
            C.dropx(goldob);
        }
    }
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* loot_mon() returns amount of time passed.
 */
export function loot_mon(mtmp,passed_info,prev_loot)
{
    mtmp=C.ptr(mtmp);
    passed_info=C.ptr(passed_info);
    prev_loot=C.ptr(prev_loot);
    const stackFrame=C.stackSave();
    try {
    let c=C.i32((-1));
    let timepassed=0;
    let otmp;
    let qbuf=C.stackAlloc((1*128));
    /* 3.3.1 introduced the ability to remove saddle from a steed.
     *  *passed_info is set to TRUE if a loot query was given.
     *  *prev_loot is set to TRUE if something was actually acquired in here.
     */
    if(Number(!!(Number(!!(mtmp&&Number(mtmp!=C.field(C.u,"you","usteed").value)))&&((otmp=C.which_armor(mtmp,1048576n)))))) {
        if(passed_info) (C.cell(passed_info,"int").value=1);
        C.variadic(60,qbuf,C.literal("Do you want to remove the saddle from %s?"),C.x_monnam(mtmp,1,0,8,(C.i8(0))));
        if(Number(((c=C.i32(C.yn_function(qbuf,C.ynqchars,C.i8(110),(C.i8(1))))))==121)) {
            if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(24576n))))==C.u64(24576n)))) {
                C.variadic(61,C.literal("do that without limbs."));
                /* not body_part(HAND) */
                return 0;
            }
            if(C.field(otmp,"obj","cursed").value) {
                C.variadic(62,C.literal("can't.  The saddle seems to be stuck to %s."),C.x_monnam(mtmp,1,0,8,(C.i8(0))));
                /* the attempt costs you time */
                return 1;
            }
            C.extract_from_minvent(mtmp,otmp,(C.i8(1)),(C.i8(0)));
            if(C.field(C.flags,"flag","verbose").value) C.variadic(63,C.literal("take %s off of %s."),C.thesimpleoname(otmp),C.mon_nam(mtmp));
            (otmp=C.hold_another_object(otmp,C.literal("You drop %s!"),C.doname(otmp),0));
            ((otmp));
            (timepassed=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2467,(C.literal("loot_mon"))),C.rnd(3))):C.rnd(3))));
            if(prev_loot) (C.cell(prev_loot,"signed char").value=(C.i8(1)));
        } else if(Number(c==113)) {
            return 0;
        }
    }
    /* 3.4.0 introduced ability to pick things up from swallower's stomach */
    if(C.field(C.u,"you","uswallow").value) {
        let count=(passed_info?C.cell(passed_info,"int").value:0);
        (timepassed=pickup(count));
    }
    return timepassed;
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Decide whether an object being placed into a magic bag will cause
 * it to explode.  If the object is a bag itself, check recursively.
 */
export function mbag_explodes(obj,depthin)
{
    obj=C.ptr(obj);
    depthin=C.i32(depthin);
    /* these won't cause an explosion when they're empty */
    if(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_CANCELLATION)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.BAG_OF_TRICKS))))&&Number(C.i32(C.field(obj,"obj","spe").value)<=0)))) return (C.i8(0));
    /* odds: 1/1, 2/2, 3/4, 4/8, 5/16, 6/32, 7/64, 8/128, 9/128, 10/128,... */
    if(Number(!!((Number(!!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((obj),"obj","otyp").value)==C.BAG_OF_TRICKS))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_CANCELLATION))))&&(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2497,(C.literal("mbag_explodes"))),C.rn2(C.i32((1<<((Number(depthin>7)?7:depthin))))))):C.rn2(C.i32((1<<((Number(depthin>7)?7:depthin)))))))<=depthin))))) return (C.i8(1));
 else if((Number(C.field((obj),"obj","cobj").value!=0))) {
        let otmp;
        for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(mbag_explodes(otmp,C.i32((depthin+1)))) return (C.i8(1));

    }
    return (C.i8(0));
}

export function is_boh_item_gone()
{
    return C.i8((Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2512,(C.literal("is_boh_item_gone"))),C.rn2(13))):C.rn2(13)))))));
}

/* Scatter most of Bag of holding contents around.  Some items will be
   destroyed with the same chance as looting a cursed bag. */
export function do_boh_explosion(boh,on_floor)
{
    boh=C.ptr(boh);
    on_floor=C.i8(on_floor);
    let otmp; let nobj;
    (C.field(boh,"obj","in_use").value=C.u32(1));
    /* in case scatter() leads to bones creation */
    for((otmp=C.field(boh,"obj","cobj").value);otmp;(otmp=nobj)) {
        (nobj=C.field(otmp,"obj","nobj").value);
        if(is_boh_item_gone()) {
            C.obj_extract_self(otmp);
            mbag_item_gone(C.i8(Number(!(on_floor))),otmp,(C.i8(1)));
        } else {
            ((C.field(otmp,"obj","ox").value=C.field(C.u,"you","ux").value),(C.field(otmp,"obj","oy").value=C.field(C.u,"you","uy").value));
            C.scatter(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,4,C.u32(C.i32(((C.i32((2|4)))|8))),otmp);
        }
    }
    /* boh is about to be deleted so no need to reset its in_use flag here */
}

export function boh_loss(container,held)
{
    container=C.ptr(container);
    held=C.i8(held);
    /* sometimes toss objects if a cursed magic bag */
    if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field((container),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((container),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(C.field(container,"obj","cursed").value)))&&(Number(C.field((container),"obj","cobj").value!=0))))) {
        let loss=0n;
        let curr; let otmp;
        for((curr=C.field(container,"obj","cobj").value);curr;(curr=otmp)) {
            (otmp=C.field(curr,"obj","nobj").value);
            if(is_boh_item_gone()) {
                C.obj_extract_self(curr);
                (loss=C.i64(loss+mbag_item_gone(held,curr,(C.i8(0)))));
            }
        }
        return loss;
    }
    return C.i64(0);
}

/* Returns: -1 to stop, 1 item was inserted, 0 item was not inserted. */
export function in_container(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    try {
    let floor_container=C.i8(Number(!((Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","where").value)==3)))));
    let was_unpaid=(C.i8(0));
    let buf=C.stackAlloc((1*256));
    if(Number(!(C.field(C.gc,"instance_globals_c","current_container").value))) {
        C.variadic(64,C.literal("<in> no gc.current_container?"));
        return 0;
    } else if(Number(!!(Number(obj==C.global("uball").value)||Number(obj==C.global("uchain").value)))) {
        C.variadic(65,C.literal("must be kidding."));
        return 0;
    } else if(Number(obj==C.field(C.gc,"instance_globals_c","current_container").value)) {
        C.variadic(66,C.literal("That would be an interesting topological exercise."));
        return 0;
    } else if(C.i64((C.field(obj,"obj","owornmask").value&(C.i64(((C.i64((C.i64((C.i64((C.i64((C.i64((C.i64((1n|2n))|4n))|8n))|16n))|32n))|64n)))|(C.i64((C.i64(((C.i64((131072n|262144n)))|65536n))|524288n))))))))) {
        C.variadic(67,C.literal("You cannot %s %s you are wearing."),((Number(C.i32(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","otyp").value)==C.ICE_BOX))?C.literal("refrigerate"):C.literal("stash")),C.field(C.c_common_strings,"c_common_strings","c_something").value);
        return 0;
    } else if(Number(!!((Number(C.i32(C.field(obj,"obj","otyp").value)==C.LOADSTONE))&&C.i32(C.field(obj,"obj","cursed").value)))) {
        C.set_bknown(obj,C.u32(1));
        C.variadic(68,C.literal("stone%s won't leave your person."),(((Number((C.field(obj,"obj","quan").value)==C.i64(1)))?C.literal(""):C.literal("s"))));
        return 0;
    } else if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.AMULET_OF_YENDOR)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.BELL_OF_OPENING)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.SPE_BOOK_OF_THE_DEAD)))) {
        /* Prohibit Amulets in containers; if you allow it, monsters can't
         * steal them.  It also becomes a pain to check to see if someone
         * has the Amulet.  Ditto for the Candelabrum, the Bell and the Book.
         */
        C.variadic(69,C.literal("%s cannot be confined in such trappings."),C.The(C.xname(obj)));
        return 0;
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)&&Number(C.field(obj,"obj","corpsenm").value!=0)))) {
        C.variadic(70,C.literal("%s attached to your pet."),C.Tobjnam(obj,C.literal("are")));
        return 0;
    } else if(Number(obj==C.global("uwep").value)) {
        if(C.welded(obj)) {
            C.weldmsg(obj);
            return 0;
        }
        C.setuwep(0);
        /* This uwep check is obsolete.  It dates to 3.0 and earlier when
         * unwielding Firebrand would be fatal in hell if hero had no other
         * fire resistance.  Life-saving would force it to be re-wielded.
         */
        if(C.global("uwep").value) return 0;
        /* unwielded, died, rewielded */
    } else if(Number(obj==C.global("uswapwep").value)) {
        C.setuswapwep(0);
    } else if(Number(obj==C.global("uquiver").value)) {
        C.setuqwep(0);
    }
    if(fatal_corpse_mistake(obj,(C.i8(0)))) return C.i32((-1));
    /* boxes, boulders, and big statues can't fit into any container */
    if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.ICE_BOX)||(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.LARGE_BOX)||Number(C.i32(C.field((obj),"obj","otyp").value)==C.CHEST))))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.STATUE)&&(Number(C.i32(C.field(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","msize").value)>=3)))))))) {
        /* consumes multiple obufs but not enough to overwrite the result */
        C.strcpy(buf,C.the(C.xname(obj)));
        C.variadic(71,C.literal("cannot fit %s into %s."),buf,C.the(C.xname(C.field(C.gc,"instance_globals_c","current_container").value)));
        return 0;
    }
    C.freeinv(obj);
    if(C.obj_is_burning(obj)) C.snuff_lit(obj);
    /* this used to be part of freeinv() */
    if(Number(!!(C.i32(floor_container)&&C.i32(C.costly_spot(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))) {
        /* defer gold until after put-in message */
        if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)) {
            /* sellobj() will take an unpaid item off the shop bill */
            (was_unpaid=C.i8((C.i32(C.field(obj,"obj","unpaid").value)?C.i32((C.i8(1))):C.i32((C.i8(0))))));
            if(C.field(C.gs,"instance_globals_s","sellobj_first").value) {
                /* don't sell when putting the item into your own container,
                   but handle billing correctly */
                C.sellobj_state((C.i32(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","no_charge").value)?(2):(1)));
                (C.field(C.gs,"instance_globals_s","sellobj_first").value=(C.i8(0)));
            }
            C.sellobj(obj,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
        }
    }
    if(Number(!!((Number(C.i32(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","otyp").value)==C.ICE_BOX))&&Number(!((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.BRASS_LANTERN)||Number(C.i32(C.field((obj),"obj","otyp").value)==C.OIL_LAMP)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.TALLOW_CANDLE)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.WAX_CANDLE)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.POT_OIL))))))))) {
        (C.field(obj,"obj","age").value=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(obj,"obj","age").value)));
        /* actual age */
        /* stop any corpse timeouts when frozen */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)) {
            if(C.field(obj,"obj","timed").value) {
                C.stop_timer(C.i16(C.ROT_CORPSE),C.obj_to_any(obj));
                C.stop_timer(C.i16(C.REVIVE_MON),C.obj_to_any(obj));
            }
            /* if this is the corpse of a cancelled ice troll, uncancel it */
            if(Number(!!(Number(C.field(obj,"obj","corpsenm").value==C.PM_ICE_TROLL)&&(Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value))))))) (C.field((C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value),"monst","mcan").value=C.u32(0));
        } else if(Number(!!(C.i32(C.field(obj,"obj","globby").value)&&C.i32(C.field(obj,"obj","timed").value)))) {
            C.stop_timer(C.i16(C.SHRINK_GLOB),C.obj_to_any(obj));
        }
    } else if(Number(!!((Number(!!(Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(mbag_explodes(obj,0))))) {
        C.variadic(72,2n,C.literal("just blew up %s bag of holding"),(C.field((C.genders+Number((C.i32(C.field(C.flags,"flag","female").value)?1:0))*C.sizes["struct Gender"]),"Gender","his").value));
        /* explicitly mention what item is triggering the explosion */
        C.variadic(73,C.literal("As you put %s inside, you are blasted by a magical explosion!"),C.doname(obj));
        /* did not actually insert obj yet */
        if(was_unpaid) C.addtobill(obj,(C.i8(0)),(C.i8(0)),(C.i8(1)));
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BAG_OF_HOLDING)) do_boh_explosion(obj,C.i8((Number(C.i32(C.field(obj,"obj","where").value)==1))));
        /* one bag of holding into another */
        C.obfree(obj,0);
        /* if carried, shop goods will be flagged 'unpaid' and obfree() will
           handle bill issues, but if on floor, we need to put them on bill
           before deleting them (non-shop items will be flagged 'no_charge')*/
        if(Number(!!(C.i32(floor_container)&&C.i32(C.costly_spot(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","ox").value,C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","oy").value))))) {
            let save_no_charge=C.stackAlloc(C.sizes["struct obj"]);
            (C.field(save_no_charge,"obj","no_charge").value=C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","no_charge").value);
            C.addtobill(C.field(C.gc,"instance_globals_c","current_container").value,(C.i8(0)),(C.i8(0)),(C.i8(0)));
            /* addtobill() clears no charge; we need to set it back
               so that useupf() doesn't double bill */
            (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","no_charge").value=C.field(save_no_charge,"obj","no_charge").value);
        }
        do_boh_explosion(C.field(C.gc,"instance_globals_c","current_container").value,floor_container);
        if(Number(!(floor_container))) C.useup(C.field(C.gc,"instance_globals_c","current_container").value);
 else if(C.obj_here(C.field(C.gc,"instance_globals_c","current_container").value,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)) C.useupf(C.field(C.gc,"instance_globals_c","current_container").value,C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","quan").value);
 else C.variadic(74,C.literal("in_container:  bag not found."));
        C.losehp(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2692,(C.literal("in_container"))),C.d((6),(6)))):C.d((6),(6)))),C.literal("magical explosion"),C.i8(0));
        (C.field(C.gc,"instance_globals_c","current_container").value=0);
        /* baggone = TRUE; */
    }
    if(C.field(C.gc,"instance_globals_c","current_container").value) {
        C.strcpy(buf,C.the(C.xname(C.field(C.gc,"instance_globals_c","current_container").value)));
        C.variadic(75,C.literal("put %s into %s."),C.doname(obj),buf);
        /* gold in container always needs to be added to credit */
        if(Number(!!(C.i32(floor_container)&&Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)))) C.sellobj(obj,C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","ox").value,C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","oy").value);
        C.add_to_container(C.field(C.gc,"instance_globals_c","current_container").value,obj);
        (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","owt").value=C.u32(C.weight(C.field(C.gc,"instance_globals_c","current_container").value)));
    }
    /* gold needs this, and freeinv() many lines above may cause
     * the encumbrance to disappear from the status, so just always
     * update status immediately.
     */
    C.bot();
    return ((C.field(C.gc,"instance_globals_c","current_container").value?1:C.i32((-1))));
    } finally {C.stackRestore(stackFrame); }
}

/* askchain() filter used by in_container();
 * returns True if the container is intact and 'obj' isn't it, False if
 * container is gone (magic bag explosion) or 'obj' is the container itself;
 * also used by getobj() when picking a single item to stash
 */
export function ck_bag(obj)
{
    obj=C.ptr(obj);
    return (Number(!!(C.field(C.gc,"instance_globals_c","current_container").value&&Number(obj!=C.field(C.gc,"instance_globals_c","current_container").value))));
}

/* Returns: -1 to stop, 1 item was removed, 0 item was not removed. */
export function out_container(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    try {
    let otmp;
    let res;
    let count=C.local("long",0);
    let is_gold=C.i8((Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)));
    if(Number(!(C.field(C.gc,"instance_globals_c","current_container").value))) {
        C.variadic(76,C.literal("<out> no gc.current_container?"));
        return C.i32((-1));
    } else if(is_gold) {
        (C.field(obj,"obj","owt").value=C.u32(C.weight(obj)));
    }
    if(Number(!!(C.i32(C.field(obj,"obj","oartifact").value)&&Number(!(C.touch_artifact(obj,C.field(C.gy,"instance_globals_y","youmonst").address)))))) return 0;
    if(fatal_corpse_mistake(obj,(C.i8(0)))) return C.i32((-1));
    (count.value=C.field(obj,"obj","quan").value);
    if(Number(((res=lift_object(obj,C.field(C.gc,"instance_globals_c","current_container").value,count.address,(C.i8(0)))))<=0)) return res;
    if(Number(!!(Number(C.field(obj,"obj","quan").value!=count.value)&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.LOADSTONE)))) (obj=C.splitobj(obj,count.value));
    /* Remove the object from the list. */
    C.obj_extract_self(obj);
    (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","owt").value=C.u32(C.weight(C.field(C.gc,"instance_globals_c","current_container").value)));
    if((Number(C.i32(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","otyp").value)==C.ICE_BOX))) removed_from_icebox(obj);
    if(Number(!!(Number(!!(Number(!(C.field(obj,"obj","unpaid").value))&&Number(!((Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","where").value)==3))))))&&C.i32(C.costly_spot(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","ox").value,C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","oy").value))))) {
        (C.field(obj,"obj","ox").value=C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","ox").value);
        (C.field(obj,"obj","oy").value=C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","oy").value);
        C.addtobill(obj,(C.i8(0)),(C.i8(0)),(C.i8(0)));
    }
    if((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_PICK_AXE))))) C.pick_pick(obj);
    /* shopkeeper feedback */
    (otmp=C.addinv(obj));
    pickup_prinv(otmp,count.value,C.literal("removing"));
    if(is_gold) {
        C.bot();
        /* update character's gold piece count immediately */
    }
    return 1;
    } finally {C.stackRestore(stackFrame); }
}

/* taking a corpse out of an ice box needs a couple of adjustments */
export function removed_from_icebox(obj)
{
    obj=C.ptr(obj);
    if(Number(!((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.BRASS_LANTERN)||Number(C.i32(C.field((obj),"obj","otyp").value)==C.OIL_LAMP)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.TALLOW_CANDLE)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.WAX_CANDLE)))||Number(C.i32(C.field((obj),"obj","otyp").value)==C.POT_OIL))))))) {
        (C.field(obj,"obj","age").value=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(obj,"obj","age").value)));
        /* actual age */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)) {
            let m=C.get_mtraits(obj,(C.i8(0)));
            let iceT=C.i8((m?(Number(C.field(m,"monst","data").value==(C.mons+Number(C.PM_ICE_TROLL)*C.sizes["struct permonst"]))):(Number(C.field(obj,"obj","corpsenm").value==C.PM_ICE_TROLL))));
            /* start a revive timer if this corpse is for an ice troll,
               otherwise start a rot-away timer (even for other trolls) */
            (C.field(obj,"obj","oeroded2").value=C.u32((C.i32(iceT)?0:1)));
            C.start_corpse_timeout(obj);
        } else if(C.field(obj,"obj","globby").value) {
            /* non-frozen globs gradually shrink away to nothing */
            C.start_glob_timeout(obj,0n);
        }
    }
}

/* an object inside a cursed bag of holding is being destroyed */
export function mbag_item_gone(held,item,silent)
{
    held=C.i8(held);
    item=C.ptr(item);
    silent=C.i8(silent);
    let shkp;
    let loss=0n;
    if(Number(!(silent))) {
        if(C.field(item,"obj","dknown").value) C.variadic(77,C.literal("%s %s vanished!"),C.Doname2(item),C.otense(item,C.literal("have")));
 else C.variadic(78,C.literal("%s %s disappear!"),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal("notice"):C.literal("see")),C.doname(item));
    }
    if(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)&&Number(((shkp=C.shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value)))!=0)))) {
        if((C.i32(held)?C.i32(C.i8(C.field(item,"obj","unpaid").value)):C.i32(C.costly_spot(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))) (loss=C.stolen_value(item,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.i8(C.field(shkp,"monst","mpeaceful").value),(C.i8(1))));
    }
    C.obfree(item,0);
    return loss;
}

/* used for #loot/apply, #tip, and final disclosure */
export function observe_quantum_cat(box,makecat,givemsg)
{
    box=C.ptr(box);
    makecat=C.i8(makecat);
    givemsg=C.i8(givemsg);
    const stackFrame=C.stackSave();
    try {
    
    let deadcat;
    let livecat=0;
    let ox=C.local("short",0); let oy=C.local("short",0);
    let itsalive=C.i8(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),2832,(C.literal("observe_quantum_cat"))),C.rn2(2))):C.rn2(2))))));
    if(C.get_obj_location(box,ox.address,oy.address,0)) ((C.field(box,"obj","ox").value=ox.value),(C.field(box,"obj","oy").value=oy.value));
    /* in case it's being carried */
    /* this isn't really right, since any form of observation
       (telepathic or monster/object/food detection) ought to
       force the determination of alive vs dead state; but basing it
       just on opening or disclosing the box is much simpler to cope with */
    /* SchroedingersBox already has a cat corpse in it */
    (deadcat=C.field(box,"obj","cobj").value);
    if(itsalive) {
        if(makecat) (livecat=C.makemon((C.mons+Number(C.PM_HOUSECAT)*C.sizes["struct permonst"]),C.field(box,"obj","ox").value,C.field(box,"obj","oy").value,C.u32(C.i64((C.i64((1n|16n))|131072n)))));
        if(livecat) {
            (C.field(livecat,"monst","mpeaceful").value=C.u32(1));
            C.set_malign(livecat);
            if(givemsg) {
                if(Number(!((Number(!!(C.canseemon(livecat)||C.sensemon(livecat))))))) C.variadic(79,C.literal("think %s brushed your %s."),C.field(C.c_common_strings,"c_common_strings","c_something").value,C.body_part(C.FOOT));
 else C.variadic(80,C.literal("%s inside the box is still alive!"),C.Monnam(livecat));
            }
            C.christen_monst(livecat,C.staticAddress("observe_quantum_cat.sc"));
            if(deadcat) {
                C.obj_extract_self(deadcat);
                (C.obfree(deadcat,0),(deadcat=0));
            }
            (C.field(box,"obj","owt").value=C.u32(C.weight(box)));
            (C.field(box,"obj","spe").value=C.i8(0));
            if(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))) {
                /* give experience points for releasing live cat; slightly
                   different amount from what is given for "killing" it */
                C.more_experienced(10,20);
                /* 10:current exp; 20:score bonus */
                C.newexplevel();
            }
        }
    } else {
        (C.field(box,"obj","spe").value=C.i8(0));
        /* now an ordinary box (with a cat corpse inside) */
        if(givemsg) C.variadic(81,C.literal("%s inside the box is dead!"),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.rndmonnam(0):C.literal("housecat")));
        if(deadcat) {
            /* set_corpsenm() will start the rot timer that was removed
               when makemon() created SchroedingersBox; start it from
               now rather than from when this special corpse got created */
            (C.field(deadcat,"obj","age").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
            C.set_corpsenm(deadcat,C.PM_HOUSECAT);
            (deadcat=C.oname(deadcat,C.staticAddress("observe_quantum_cat.sc"),0));
            if(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mon_moving").value))) {
                /* give experience points for the death of the cat since
                   that has been finalized by the hero opening the box */
                C.more_experienced(20,10);
                /* 20:current exp; 10:score bonus */
                C.newexplevel();
            }
        }
    }
    ((deadcat));
    return;
    } finally {C.stackRestore(stackFrame); }
}

/* used by askchain() to check for magic bag explosion */
export function container_gone(fn)
{
    fn=C.ptr(fn);
    /* result is only meaningful while use_container() is executing */
    return C.i8((Number(!!((Number(!!(Number(fn==C.ownedFunctionPointer("in_container"))||Number(fn==C.ownedFunctionPointer("out_container")))))&&Number(!(C.field(C.gc,"instance_globals_c","current_container").value))))));
}

export function explain_container_prompt(more_containers)
{
    more_containers=C.i8(more_containers);
    
    let txtpp;
    let win;
    /* "Do what with <container>? [:oibrsq or ?] (q)" */
    if(Number(((win=C.indirect(25,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),5)))!=(C.i32((-1))))) {
        for((txtpp=C.staticAddress("explain_container_prompt.explaintext"));C.cell(txtpp,"char *").value;(()=>{const __old=txtpp;txtpp=C.ptr((__old+Number(8)));return txtpp;})()) {
            if(Number(!!(Number(!(more_containers))&&Number(!(C.strncmp(C.cell(txtpp,"char *").value,C.literal(" n "),C.u64(3))))))) continue;
            C.indirect(26,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.cell(txtpp,"char *").value);
        }
        C.indirect(27,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),win,(C.i8(0)));
        C.indirect(28,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    }
}

export function u_handsy()
{
    if((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))) {
        C.variadic(82,C.literal("have no hands!"));
        /* not `body_part(HAND)' */
        return (C.i8(0));
    } else if(Number(!(C.freehand()))) {
        C.variadic(83,C.literal("have no free %s."),C.body_part(C.HAND));
        return (C.i8(0));
    }
    return (C.i8(1));
}

/* getobj callback for object to be stashed into a container */
export function stash_ok(obj)
{
    obj=C.ptr(obj);
    if(Number(!(obj))) return C.GETOBJ_EXCLUDE;
    /* downplay the container being stashed into */
    if(Number(!(ck_bag(obj)))) return C.GETOBJ_EXCLUDE_SELECTABLE;
    /* Possible extension: downplay things too big to fit into containers (in
     * which case extract in_container()'s logic.) */
    return C.GETOBJ_SUGGEST;
}

export function use_container(objp,held,more_containers)
{
    objp=C.ptr(objp);
    held=C.i8(held);
    more_containers=C.i8(more_containers);
    const stackFrame=C.stackSave();
    try {
    /* True iff #loot multiple and this isn't last */
    let otmp; let obj=C.cell(objp,"struct obj *").value;
    let quantum_cat; let cursed_mbag; let loot_out; let loot_in; let loot_in_first; let stash_one; let inokay; let outokay; let outmaybe;
    let c; let emptymsg=C.stackAlloc((1*256)); let qbuf=C.stackAlloc((1*128)); let pbuf=C.stackAlloc((1*128)); let xbuf=C.stackAlloc((1*128));
    let used=0;
    let loss;
    (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(0)));
    (C.field(C.gs,"instance_globals_s","sellobj_first").value=(C.i8(1)));
    /* in_container() should call sellobj_state() */
    (C.cell((emptymsg+Number(0)*1),"char").value=C.i8(0));
    if(Number(!(u_handsy()))) return 0;
    if(Number(!(C.field(obj,"obj","lknown").value))) {
        /* do this in advance */
        (C.field(obj,"obj","lknown").value=C.u32(1));
        if(held) C.update_inventory();
    }
    if(C.field(obj,"obj","olocked").value) {
        C.variadic(84,C.literal("%s locked."),C.Tobjnam(obj,C.literal("are")));
        if(held) C.variadic(85,C.literal("must put it down to unlock."));
        return 0;
    } else if(C.field(obj,"obj","otrapped").value) {
        if(held) C.variadic(86,C.literal("open %s..."),C.the(C.xname(obj)));
        C.chest_trap(obj,C.HAND,(C.i8(0)));
        /* even if the trap fails, you've used up this turn */
        if(Number(C.field(C.gm,"instance_globals_m","multi").value>=C.i64(0))) {
            /* in case we didn't become paralyzed */
            C.nomul(C.i32((-1)));
            (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("opening a container"));
            (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal(""));
        }
        (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(1)));
        return 1;
    }
    (C.field(C.gc,"instance_globals_c","current_container").value=obj);
    /* for use by in/out_container */
    /*
     * From here on out, all early returns go through 'containerdone:'.
     */
    /* check for Schroedinger's Cat */
    (quantum_cat=C.i8((Number(!!(Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","otyp").value)==C.LARGE_BOX)&&Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","spe").value)==1))))));
    if(quantum_cat) {
        observe_quantum_cat(C.field(C.gc,"instance_globals_c","current_container").value,(C.i8(1)),(C.i8(1)));
        (used=1);
    }
    (cursed_mbag=C.i8(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cursed").value)))&&(Number(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","cobj").value!=0))))));
    if(Number(!!(C.i32(cursed_mbag)&&Number(((loss=boh_loss(C.field(C.gc,"instance_globals_c","current_container").value,held)))!=C.i64(0))))) {
        (used=1);
        C.variadic(87,C.literal("owe %ld %s for lost merchandise."),loss,C.currency(loss));
        (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","owt").value=C.u32(C.weight(C.field(C.gc,"instance_globals_c","current_container").value)));
    }
    /* might put something in if carrying anything other than just the
       container itself (invent is not the container or has a next object) */
    (inokay=C.i8((Number(!!(Number(C.field(C.gi,"instance_globals_i","invent").value!=0)&&(Number(!!(Number(C.field(C.gi,"instance_globals_i","invent").value!=C.field(C.gc,"instance_globals_c","current_container").value)||C.field(C.field(C.gi,"instance_globals_i","invent").value,"obj","nobj").value))))))));
    /* might take something out if container isn't empty */
    (outokay=C.i8((Number(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","cobj").value!=0))));
    if(Number(!(outokay))) C.variadic(88,emptymsg,C.literal("%s is %sempty."),C.Ysimple_name2(C.field(C.gc,"instance_globals_c","current_container").value),((Number(!!(C.i32(quantum_cat)||C.i32(cursed_mbag))))?C.literal("now "):C.literal("")));
    /* preformat the empty-container message */
    /*
     * What-to-do prompt's list of possible actions:
     * always include the look-inside choice (':');
     * include the take-out choice ('o') if container
     * has anything in it or if player doesn't yet know
     * that it's empty (latter can change on subsequent
     * iterations if player picks ':' response);
     * include the put-in choices ('i','s') if hero
     * carries any inventory (including gold) aside from
     * the container itself;
     * include do-both when 'o' is available, even if
     * inventory is empty--taking out could alter that;
     * include do-both-reversed when 'i' is available,
     * even if container is empty--for similar reason;
     * include the next container choice ('n') when
     * relevant, and make it the default;
     * always include the quit choice ('q'), and make
     * it the default if there's no next container;
     * include the help choice (" or ?") if `cmdassist'
     * run-time option is set;
     * (Player can pick any of (o,i,b,r,n,s,?) even when
     * they're not listed among the available actions.)
     *
     * Do what with <the/your/Shk's container>? [:oibrs nq or ?] (q)
     * or
     * <The/Your/Shk's container> is empty.  Do what with it? [:irs nq or ?]
     */
    for(;;) {
        /* repeats iff '?' or ':' gets chosen */
        (outmaybe=C.i8((Number(!!(C.i32(outokay)||Number(!(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value)))))));
        if(Number(!(outmaybe))) C.safe_qbuf(qbuf,0,C.literal(" is empty.  Do what with it?"),C.field(C.gc,"instance_globals_c","current_container").value,C.nativeFunctionPointer("Yname2"),C.nativeFunctionPointer("Ysimple_name2"),C.literal("This"));
 else C.safe_qbuf(qbuf,C.literal("Do what with "),C.literal("?"),C.field(C.gc,"instance_globals_c","current_container").value,C.nativeFunctionPointer("yname"),C.nativeFunctionPointer("ysimple_name"),C.literal("it"));
        /* ask player about what to do with this container */
        if(Number(!!(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==3)||Number(C.i32(C.field(C.flags,"flag","menu_style").value)==2)))) {
            if(Number(!!(Number(!(inokay))&&Number(!(outmaybe))))) {
                /* nothing to take out, nothing to put in;
                   trying to do both will yield proper feedback */
                (c=C.i8(98));
            } else {
                (c=in_or_out_menu(qbuf,C.field(C.gc,"instance_globals_c","current_container").value,outmaybe,inokay,C.i8((Number(used!=0))),more_containers));
            }
        } else {
            /* TRADITIONAL or COMBINATION */
            (C.cell((xbuf+Number(0)*1),"char").value=C.i8(0));
            /* list of extra acceptable responses */
            C.strcpy(pbuf,C.literal(":"));
            /* look inside */
            C.strcat((C.i32(outmaybe)?pbuf:xbuf),C.literal("o"));
            /* take out */
            C.strcat((C.i32(inokay)?pbuf:xbuf),C.literal("i"));
            /* put in */
            C.strcat((C.i32(outmaybe)?pbuf:xbuf),C.literal("b"));
            /* both */
            C.strcat((C.i32(inokay)?pbuf:xbuf),C.literal("rs"));
            /* reversed, stash */
            C.strcat(pbuf,C.literal(" "));
            /* separator */
            C.strcat((C.i32(more_containers)?pbuf:xbuf),C.literal("n"));
            /* next container */
            C.strcat(pbuf,C.literal("q"));
            /* quit */
            if(C.field(C.iflags,"instance_flags","cmdassist").value) C.strcat(pbuf,C.literal(" or ?"));
 else C.strcat(xbuf,C.literal("?"));
            /* this unintentionally allows user to answer with 'o' or
                   'r'; fortunately, those are already valid choices here */
            /* help */
            if(C.cell(xbuf,"char").value) C.strcat(C.strcat(pbuf,C.literal("\u001b")),xbuf);
            (c=C.yn_function(qbuf,pbuf,C.i8((C.i32(more_containers)?110:113)),(C.i8(1))));
        }
        /* PARTIAL|FULL vs other modes */
        if(Number(C.i32(c)==63)) {
            explain_container_prompt(more_containers);
        } else if(Number(C.i32(c)==58)) {
            /* note: will set obj->cknown */
            if(Number(!(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value))) (used=1);
            /* gaining info */
            C.container_contents(C.field(C.gc,"instance_globals_c","current_container").value,(C.i8(0)),(C.i8(0)),(C.i8(1)));
        } else break;
    }
    /* loop until something other than '?' or ':' is picked */
    if(Number(C.i32(c)==113)) (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(1)));
    containerdone: {
        if(Number(!!(Number(C.i32(c)==110)||Number(C.i32(c)==113)))) break containerdone; /* original goto containerdone */
        /* [not strictly needed; falling thru works] */
        (loot_out=C.i8((Number(!!(Number(!!(Number(C.i32(c)==111)||Number(C.i32(c)==98)))||Number(C.i32(c)==114))))));
        (loot_in=C.i8((Number(!!(Number(!!(Number(C.i32(c)==105)||Number(C.i32(c)==98)))||Number(C.i32(c)==114))))));
        (loot_in_first=C.i8((Number(C.i32(c)==114))));
        /* both, reversed */
        (stash_one=C.i8((Number(C.i32(c)==115))));
        /* out-only or out before in */
        if(Number(!!(C.i32(loot_out)&&Number(!(loot_in_first))))) {
            if(Number(!((Number(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","cobj").value!=0))))) {
                C.variadic(89,C.literal("%s"),emptymsg);
                /* <whatever> is empty. */
                if(Number(!(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value))) (used=1);
                (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value=C.u32(1));
            } else {
                add_valid_menu_class(0);
                /* reset */
                if(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==0)) (used=C.i32(used|traditional_loot((C.i8(0)))));
 else (used=C.i32(used|(Number(menu_loot(0,(C.i8(0)))>0))));
                add_valid_menu_class(0);
            }
            /* recalculate 'inokay' in case something was just taken out and
           inventory is no longer empty or no longer just the container */
            (inokay=C.i8((Number(!!(C.field(C.gi,"instance_globals_i","invent").value&&(Number(!!(Number(C.field(C.gi,"instance_globals_i","invent").value!=C.field(C.gc,"instance_globals_c","current_container").value)||C.field(C.field(C.gi,"instance_globals_i","invent").value,"obj","nobj").value))))))));
        }
        if(Number(!!((Number(!!(C.i32(loot_in)||C.i32(stash_one))))&&Number(!(inokay))))) {
            C.variadic(90,C.literal("don't have anything%s to %s."),(C.field(C.gi,"instance_globals_i","invent").value?C.literal(" else"):C.literal("")),(C.i32(stash_one)?C.literal("stash"):C.literal("put in")));
            (loot_in=(stash_one=(C.i8(0))));
        }
        /*
     * Gone: being nice about only selecting food if we know we are
     * putting things in an ice chest.
     */
        if(loot_in) {
            add_valid_menu_class(0);
            /* reset */
            if(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==0)) (used=C.i32(used|traditional_loot((C.i8(1)))));
 else (used=C.i32(used|(Number(menu_loot(0,(C.i8(1)))>0))));
            add_valid_menu_class(0);
        } else if(stash_one) {
            /* put one item into container */
            if(Number(((otmp=C.getobj(C.literal("stash"),C.ownedFunctionPointer("stash_ok"),C.u32(C.i32((2|1))))))!=0)) {
                if(in_container(otmp)) {
                    (used=1);
                } else {
                    /* couldn't put selected item into container for some
                   reason; might need to undo splitobj() */
                    C.unsplitobj(otmp);
                }
            }
        }
        /* putting something in might have triggered magic bag explosion */
        if(Number(!(C.field(C.gc,"instance_globals_c","current_container").value))) (loot_out=(C.i8(0)));
        /* out after in */
        if(Number(!!(C.i32(loot_out)&&C.i32(loot_in_first)))) {
            if(Number(!((Number(C.field((C.field(C.gc,"instance_globals_c","current_container").value),"obj","cobj").value!=0))))) {
                C.variadic(91,C.literal("%s"),emptymsg);
                /* <whatever> is empty. */
                if(Number(!(C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value))) (used=1);
                (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value=C.u32(1));
            } else {
                add_valid_menu_class(0);
                /* reset */
                if(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==0)) (used=C.i32(used|traditional_loot((C.i8(0)))));
 else (used=C.i32(used|(Number(menu_loot(0,(C.i8(0)))>0))));
                add_valid_menu_class(0);
            }
        }
    }
    /* original label containerdone */
    if(used) {
        /* Not completely correct; if we put something in without knowing
           whatever was already inside, now we suddenly do.  That can't
           be helped unless we want to track things item by item and then
           deal with containers whose contents are "partly known". */
        if(C.field(C.gc,"instance_globals_c","current_container").value) (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value=C.u32(1));
        C.update_inventory();
    }
    C.sellobj_state((0));
    /* in case in_container() set it */
    (C.cell(objp,"struct obj *").value=C.field(C.gc,"instance_globals_c","current_container").value);
    /* might have become null */
    if(C.field(C.gc,"instance_globals_c","current_container").value) (C.field(C.gc,"instance_globals_c","current_container").value=0);
 else (C.field(C.ga,"instance_globals_a","abort_looting").value=(C.i8(1)));
    /* avoid hanging on to stale pointer */
    return used;
    } finally {C.stackRestore(stackFrame); }
}

/* loot current_container (take things out or put things in), by prompting */
export function traditional_loot(put_in)
{
    put_in=C.i8(put_in);
    const stackFrame=C.stackSave();
    try {
    let actionfunc; let checkfunc;
    let objlist;
    let selection=C.stackAlloc((1*28));
    /* +10: room for B,U,C,X plus slop */
    let action;
    let one_by_one=C.local("signed char",0); let allflag=C.local("signed char",0);
    let used=0; let menu_on_request=C.local("int",0);
    if(put_in) {
        (action=C.literal("put in"));
        (objlist=C.field(C.gi,"instance_globals_i","invent").address);
        (actionfunc=C.ownedFunctionPointer("in_container"));
        (checkfunc=C.ownedFunctionPointer("ck_bag"));
    } else {
        (action=C.literal("take out"));
        (objlist=C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cobj").address);
        (actionfunc=C.ownedFunctionPointer("out_container"));
        (checkfunc=0);
        (C.field(C.gp,"instance_globals_p","pickup_encumbrance").value=0);
        /* used to limit verbosity */
    }
    if(query_classes(selection,one_by_one.address,allflag.address,action,C.cell(objlist,"struct obj *").value,(C.i8(0)),menu_on_request.address)) {
        if(C.askchain(objlist,((C.i32(one_by_one.value)?0:selection)),C.i32(allflag.value),actionfunc,checkfunc,0,action)) (used=1);
    } else if(Number(menu_on_request.value<0)) {
        (used=(Number(menu_loot(menu_on_request.value,put_in)>0)));
    }
    return used;
    } finally {C.stackRestore(stackFrame); }
}

/* loot current_container (take things out or put things in), using a menu */
export function menu_loot(retry,put_in)
{
    retry=C.i32(retry);
    put_in=C.i8(put_in);
    const stackFrame=C.stackSave();
    try {
    let n; let i; let n_looted=0;
    let all_categories=(C.i8(1)); let loot_everything=(C.i8(0)); let autopick=(C.i8(0));
    let buf=C.stackAlloc((1*256));
    let loot_justpicked=(C.i8(0));
    let action=(C.i32(put_in)?C.literal("Put in"):C.literal("Take out"));
    let otmp; let otmp2;
    let pick_list=C.local("struct mi *",0);
    let mflags; let res;
    let count=C.i64(0);
    (C.field(C.gp,"instance_globals_p","pickup_encumbrance").value=0);
    /* used by out_container(); no harm in
                                * zeroing it if about to use in_container() */
    if(retry) {
        (all_categories=C.i8((Number(retry==C.i32((-2))))));
    } else if(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==2)) {
        (all_categories=(C.i8(0)));
        C.variadic(92,buf,C.literal("%s what type of objects?"),action);
        (mflags=(C.i32((C.i32((C.i32((C.i32((32|4))|(C.i32(((C.i32((C.i32((256|512))|1024)))|2048)))))|128))|4096))));
        (n=query_category(buf,(C.i32(put_in)?C.field(C.gi,"instance_globals_i","invent").value:C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cobj").value),mflags,pick_list.address,2));
        /* when paranoid_confirm:A is set, 'A' by itself implies
               'A'+'a' which will be followed by a confirmation prompt;
               when that option isn't set, 'A' by itself is rejected
               by query_categorry() and result here will be n==0 */
        if(Number(!(n))) return 0;
        /* no non-autopick category filters specified */
        for((i=0);Number(i<n);(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) {
            if(Number(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value==65)) {
                (loot_everything=(autopick=(C.i8(1))));
            } else if(Number(!!(C.i32(put_in)&&Number(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value==80)))) {
                (loot_justpicked=(C.i8(1)));
                (count=((Number(C.i64((0))>(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","count").value))?C.i64((0)):(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","count").value))));
                add_valid_menu_class(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value);
                (loot_everything=(C.i8(0)));
            } else if(Number(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value==C.i32((-2)))) {
                (all_categories=(C.i8(1)));
            } else {
                add_valid_menu_class(C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value);
                (loot_everything=(C.i8(0)));
            }
        }
        C.free(pick_list.value);
    }
    if(autopick) {
        let inout_func;
        /* in_container or out_container */
        let firstobj;
        if(Number(!(put_in))) {
            (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value=C.u32(1));
            (inout_func=C.ownedFunctionPointer("out_container"));
            (firstobj=C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cobj").value);
        } else {
            (inout_func=C.ownedFunctionPointer("in_container"));
            (firstobj=C.field(C.gi,"instance_globals_i","invent").value);
        }
        /*
         * Note:  for put_in, current_container might be destroyed during
         * mid-traversal by a magic bag explosion.
         * Note too:  items are processed in internal list order rather
         * than menu display order ('sortpack') or 'sortloot' order;
         * for put_in that should be item->invlet order so reasonable.
         */
        for((otmp=firstobj);Number(!!(otmp&&C.field(C.gc,"instance_globals_c","current_container").value));(otmp=otmp2)) {
            (otmp2=C.field(otmp,"obj","nobj").value);
            if(Number(!!(Number(!!(C.i32(loot_everything)||C.i32(all_categories)))||C.i32(allow_category(otmp))))) {
                (res=C.indirect(29,(inout_func),otmp));
                if(Number(res<0)) break;
                (n_looted=C.i32(n_looted+res));
            }
        }
    } else if(Number(!!(Number(!!(C.i32(put_in)&&C.i32(loot_justpicked)))&&Number(count_justpicked(C.field(C.gi,"instance_globals_i","invent").value)==1)))) {
        (otmp=find_justpicked(C.field(C.gi,"instance_globals_i","invent").value));
        if(otmp) {
            (n_looted=1);
            if(Number(!!(Number(count>C.i64(0))&&Number(count<C.field(otmp,"obj","quan").value)))) {
                (otmp=C.splitobj(otmp,count));
            }
            in_container(otmp);
            /* return value doesn't matter, even if container blew up */
        }
    } else {
        (mflags=C.i32((16|2)));
        if(Number(!!(C.i32(put_in)&&C.i32(C.field(C.flags,"flag","invlet_constant").value)))) (mflags=C.i32(mflags|8));
        if(Number(!!(C.i32(put_in)&&C.i32(loot_justpicked)))) (mflags=C.i32(mflags|4096));
        if(Number(!(put_in))) (C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cknown").value=C.u32(1));
        C.variadic(93,buf,C.literal("%s what?"),action);
        (n=query_objlist(buf,(C.i32(put_in)?C.field(C.gi,"instance_globals_i","invent").address:C.field(C.field(C.gc,"instance_globals_c","current_container").value,"obj","cobj").address),mflags,pick_list.address,2,(C.i32(all_categories)?C.ownedFunctionPointer("allow_all"):C.ownedFunctionPointer("allow_category"))));
        if(n) {
            (n_looted=n);
            for((i=0);Number(i<n);(()=>{const __old=i;i=C.i32((__old+1));return __old;})()) {
                (otmp=C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
                ((Number(!!((Number(otmp!=0))||((C.__assert_fail(C.literal("otmp != 0"),C.literal("pickup.c"),3370,(C.literal("menu_loot"))),0))))));
                (count=C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","count").value);
                if(Number(!!(Number(count>C.i64(0))&&Number(count<C.field(otmp,"obj","quan").value)))) {
                    (otmp=C.splitobj(otmp,count));
                    /* special split case also handled by askchain() */
                }
                (res=(C.i32(put_in)?in_container(otmp):out_container(otmp)));
                if(Number(res<=0)) {
                    if(Number(!(C.field(C.gc,"instance_globals_c","current_container").value))) {
                        /* otmp caused current_container to explode;
                           both are now gone */
                        (otmp=0);
                        /* and break loop */
                    } else if(Number(!!(otmp&&Number(otmp!=C.field(C.field((pick_list.value+Number(i)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value)))) {
                        /* split occurred, merge again */
                        C.unsplitobj(otmp);
                    }
                    if(Number(res<0)) break;
                }
            }
            C.free(pick_list.value);
        }
    }
    return (n_looted?1:0);
    } finally {C.stackRestore(stackFrame); }
}

export function in_or_out_menu(prompt,obj,outokay,inokay,alreadyused,more_containers)
{
    prompt=C.ptr(prompt);
    obj=C.ptr(obj);
    outokay=C.i8(outokay);
    inokay=C.i8(inokay);
    alreadyused=C.i8(alreadyused);
    more_containers=C.i8(more_containers);
    const stackFrame=C.stackSave();
    try {
    /* can take out */
    /* can put in */
    /* controls phrasing of the decline choice */
    /* underscore is not a choice; it's used to skip element [0] */
    
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let pick_list=C.local("struct mi *",0);
    let buf=C.stackAlloc((1*256));
    let n;
    let menuselector=(C.i32(C.field(C.flags,"flag","lootabc").value)?C.staticAddress("in_or_out_menu.abc_chars"):C.staticAddress("in_or_out_menu.lootchars"));
    let clr=8;
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (win=C.indirect(30,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.indirect(31,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    (C.field(any,"any","a_int").value=1);
    /* ':' */
    C.variadic(94,buf,C.literal("Look inside %s"),C.thesimpleoname(obj));
    C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,0);
    if(outokay) {
        (C.field(any,"any","a_int").value=2);
        /* 'o' */
        C.variadic(95,buf,C.literal("take %s out"),C.field(C.c_common_strings,"c_common_strings","c_something").value);
        C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,0);
    }
    if(inokay) {
        (C.field(any,"any","a_int").value=3);
        /* 'i' */
        C.variadic(96,buf,C.literal("put %s in"),C.field(C.c_common_strings,"c_common_strings","c_something").value);
        C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,0);
    }
    if(outokay) {
        (C.field(any,"any","a_int").value=4);
        /* 'b' */
        C.variadic(97,buf,C.literal("%stake out, then put in"),(C.i32(inokay)?C.literal("both; "):C.literal("")));
        C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,0);
    }
    if(inokay) {
        (C.field(any,"any","a_int").value=5);
        /* 'r' */
        C.variadic(98,buf,C.literal("%sput in, then take out"),(C.i32(outokay)?C.literal("both reversed; "):C.literal("")));
        C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,0);
        (C.field(any,"any","a_int").value=6);
        /* 's' */
        C.variadic(99,buf,C.literal("stash one item into %s"),C.thesimpleoname(obj));
        C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,0);
    }
    C.add_menu_str(win,C.literal(""));
    if(more_containers) {
        (C.field(any,"any","a_int").value=7);
        /* 'n' */
        C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,C.literal("loot next container"),1);
    }
    (C.field(any,"any","a_int").value=8);
    /* 'q' */
    C.strcpy(buf,(C.i32(alreadyused)?C.literal("done"):C.literal("do nothing")));
    C.add_menu(win,C.nul_glyphinfo,any,C.cell((menuselector+Number(C.field(any,"any","a_int").value)*1),"char").value,C.i8(0),0,clr,buf,(C.i32(more_containers)?0:1));
    C.indirect(32,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,prompt);
    (n=C.select_menu(win,1,pick_list.address));
    C.indirect(33,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    if(Number(n>0)) {
        let k=C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value;
        if(Number(!!(Number(n>1)&&Number(k==((C.i32(more_containers)?7:8)))))) (k=C.field(C.field((pick_list.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value);
        C.free(pick_list.value);
        return C.cell((C.staticAddress("in_or_out_menu.lootchars")+Number(k)*1),"char").value;
        /* :,o,i,b,r,s,n,q */
    }
    return C.i8(((Number(!!(Number(n==0)&&C.i32(more_containers))))?110:113));
    /* next or quit */
    } finally {C.stackRestore(stackFrame); }
}

/* getobj callback for object to tip */
export function tip_ok(obj)
{
    obj=C.ptr(obj);
    if(Number(!!(Number(!(obj))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)))) return C.GETOBJ_EXCLUDE;
    if((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) {
        return C.GETOBJ_SUGGEST;
    }
    /* include horn of plenty if sufficiently discovered */
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.HORN_OF_PLENTY)&&C.i32(C.field(obj,"obj","dknown").value)))&&C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value)))) return C.GETOBJ_SUGGEST;
    /* allow trying anything else in inventory */
    return C.GETOBJ_DOWNPLAY;
}

/* show a menu of containers under hero,
   and one extra entry for choosing an inventory.
   returns ECMD_CANCEL if menu was canceled,
   ECMD_TIME if a container was picked,
   otherwise returns ECMD_OK. */
export function choose_tip_container_menu()
{
    const stackFrame=C.stackSave();
    try {
    let n; let i;
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let pick_list=C.local("struct mi *",0);
    let dummyobj=C.stackAlloc(C.sizes["struct obj"]); let otmp;
    let clr=8;
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (win=C.indirect(34,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.indirect(35,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    for(((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value),(i=0));otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) {
        (()=>{const __old=i;i=C.i32((__old+1));return i;})();
        (C.field(any,"any","a_obj").value=otmp);
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.doname(otmp),0);
    }

    if(C.field(C.gi,"instance_globals_i","invent").value) {
        C.add_menu_str(win,C.literal(""));
        (C.field(any,"any","a_obj").value=dummyobj);
        /* use 'i' for inventory unless there are so many
           containers that it's already being used */
        (i=((Number(!!(Number(i<=C.i32((105-97)))&&Number(!(C.field(C.flags,"flag","lootabc").value)))))?105:0));
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(i),C.i8(0),0,clr,C.literal("tip something being carried"),1);
    }
    C.indirect(36,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Tip which container?"));
    (n=C.select_menu(win,1,pick_list.address));
    C.indirect(37,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    /*
     * Deal with quirk of preselected item in pick-one menu:
     * n ==  0 => picked preselected entry, toggling it off;
     * n ==  1 => accepted preselected choice via SPACE or RETURN;
     * n ==  2 => picked something other than preselected entry;
     * n == -1 => cancelled via ESC;
     */
    (otmp=((Number(n<=0))?0:C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value));
    if(Number(!!(Number(n>1)&&Number(otmp==dummyobj)))) (otmp=C.field(C.field((pick_list.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
    if(pick_list.value) C.free(pick_list.value);
    if(Number(!!(otmp&&Number(otmp!=dummyobj)))) {
        tipcontainer(otmp);
        return 1;
    }
    if(Number(n==C.i32((-1)))) return 2;
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* #tip command -- empty container contents onto floor */
export function dotip()
{
    const stackFrame=C.stackSave();
    try {
    let cobj; let nobj;
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    let boxes;
    let c; let buf=C.stackAlloc((1*256)); let qbuf=C.stackAlloc((1*256));
    let spillage=0;
    /*
     * Doesn't require free hands;
     * limbs are needed to tip floor containers.
     *
     * Note: for menustyle:Traditional, using m prefix forces a menu
     * of floor containers when more than one is present.  For other
     * menustyle settings or when fewer than two floor containers are
     * present, using 'm' skips floor and goes straight to invent.
     * This somewhat unintuitive behavior is driven by the way that
     * context-sensitive inventory item actions use m prefix.
     */
    /* at present, can only tip things at current spot, not adjacent ones */
    ((C.field(cc,"nhcoord","x").value=C.field(C.u,"you","ux").value),(C.field(cc,"nhcoord","y").value=C.field(C.u,"you","uy").value));
    /* check floor container(s) first; at most one will be accessed */
    (boxes=container_at(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,(C.i8(1))));
    /* this is iffy for menustyle:traditional; 'm' prefix is ambiguous
       for it: skip floor vs handle multiple containers via menu */
    if(Number(!!(Number(boxes>0)&&(Number(!!(Number(!(C.field(C.iflags,"instance_flags","menu_requested").value))||(Number(!!(Number(C.i32(C.field(C.flags,"flag","menu_style").value)==0)&&Number(boxes>1)))))))))) {
        C.variadic(100,buf,C.literal("You can't tip %s while carrying so much."),(Number(!(C.field(C.flags,"flag","verbose").value))?C.literal("a container"):((Number(boxes>1))?C.literal("one"):C.literal("it"))));
        if(Number(!!(Number(!(C.check_capacity(buf)))&&C.i32(able_to_loot(C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,(C.i8(0))))))) {
            if(Number(boxes>1)) {
                let res;
                /* pick one container via menu or ... */
                if(Number(((res=choose_tip_container_menu()))!=0)) return res;
                /* else pick-from-gi.invent below */
            } else {
                for((cobj=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(cc,"nhcoord","x").value)*(8*21))+Number(C.field(cc,"nhcoord","y").value)*8),"struct obj *").value);cobj;(cobj=nobj)) {
                    (nobj=C.field(C.field(cobj,"obj","v").address,"vptrs","v_nexthere").value);
                    if(Number(!((Number(!!(Number(C.i32(C.field((cobj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((cobj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))))) continue;
                    (c=C.yn_function(C.safe_qbuf(qbuf,C.literal("There is "),C.literal(" here, tip it?"),cobj,C.nativeFunctionPointer("doname"),C.nativeFunctionPointer("ansimpleoname"),C.literal("container")),C.ynqchars,C.i8(113),(C.i8(1))));
                    if(Number(C.i32(c)==113)) return 0;
                    if(Number(C.i32(c)==110)) continue;
                    tipcontainer(cobj);
                    /* can only tip one container at a time */
                    return 1;
                }
            }
        }
    }
    /* either no floor container(s) or 'm' prefix was used to ignore such
       or couldn't tip one or didn't tip any */
    (cobj=C.getobj(C.literal("tip"),C.ownedFunctionPointer("tip_ok"),C.u32(2)));
    if(Number(!(cobj))) return 2;
    /* normal case */
    if(Number(!!((Number(!!(Number(C.i32(C.field((cobj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((cobj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))||Number(C.i32(C.field(cobj,"obj","otyp").value)==C.HORN_OF_PLENTY)))) {
        tipcontainer(cobj);
        return 1;
    }
    /* assorted other cases */
    if(Number(!!((Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(cobj,"obj","otyp").value)==C.WAX_CANDLE))))&&C.i32(C.field(cobj,"obj","lamplit").value)))) {
        /* note "wax" even for tallow candles to avoid giving away info */
        (spillage=C.literal("wax"));
    } else if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.POT_OIL)&&C.i32(C.field(cobj,"obj","lamplit").value))))||(Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.OIL_LAMP)&&Number(C.field(cobj,"obj","age").value!=0n))))))||(Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.MAGIC_LAMP)&&Number(C.i32(C.field(cobj,"obj","spe").value)!=0))))))) {
        (spillage=C.literal("oil"));
        /* todo: reduce potion's remaining burn timer or oil lamp's fuel */
    } else if(Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.CAN_OF_GREASE)&&Number(C.i32(C.field(cobj,"obj","spe").value)>0)))) {
        /* charged consumed below */
        (spillage=C.literal("grease"));
    } else if(Number(!!(Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.FOOD_RATION)||Number(C.i32(C.field(cobj,"obj","otyp").value)==C.CRAM_RATION)))||Number(C.i32(C.field(cobj,"obj","otyp").value)==C.LEMBAS_WAFER)))) {
        (spillage=C.literal("crumbs"));
    } else if(Number(C.i32(C.field(cobj,"obj","oclass").value)==C.VENOM_CLASS)) {
        (spillage=C.literal("venom"));
    }
    if(spillage) {
        (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
        if(C.is_pool(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)) C.variadic(101,buf,C.literal(" and gradually %s"),C.vtense(spillage,C.literal("dissipate")));
 else if(C.is_lava(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)) C.variadic(102,buf,C.literal(" and immediately %s away"),C.vtense(spillage,C.literal("burn")));
        C.variadic(103,C.literal("Some %s %s onto the %s%s."),spillage,C.vtense(spillage,C.literal("spill")),C.surface(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value),buf);
        /* shop usage message comes after the spill message */
        if(Number(!!(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.CAN_OF_GREASE)&&Number(C.i32(C.field(cobj,"obj","spe").value)>0)))) {
            C.consume_obj_charge(cobj,(C.i8(1)));
        }
        /* something [useless] happened */
        return 1;
    }
    /* anything not covered yet */
    if(Number(C.i32(C.field(cobj,"obj","oclass").value)==C.POTION_CLASS)) C.variadic(104,C.literal("%s %s securely sealed."),C.xname(cobj),C.otense(cobj,C.literal("are")));
 else if(Number(!!(C.global("uarmh").value&&Number(cobj==C.global("uarmh").value)))) return (C.tiphat()?1:0);
 else if(Number(C.i32(C.field(cobj,"obj","otyp").value)==C.STATUE)) C.variadic(105,C.literal("Nothing interesting happens."));
 else C.variadic(106,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_nothing_happens").value);
    /* can't pour potions... */
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export const TIPCHECK_OK=0,TIPCHECK_LOCKED=1,TIPCHECK_TRAPPED=2,TIPCHECK_CANNOT=3,TIPCHECK_EMPTY=4; /* original enum tipping_check_values */
export function tipcontainer(box)
{
    box=C.ptr(box);
    const stackFrame=C.stackSave();
    try {
    /* or bag */
    let ox=C.local("short",C.field(C.u,"you","ux").value); let oy=C.local("short",C.field(C.u,"you","uy").value);
    /* #tip only works at hero's location */
    let srcheld=(C.i8(0)); let dstheld=(C.i8(0)); let maybeshopgoods;
    let targetbox=0;
    let cancelled=C.local("signed char",(C.i8(0)));
    /* box is either held or on floor at hero's spot; no need to check for
       nesting; when held, we need to update its location to match hero's;
       for floor, the coordinate updating is redundant */
    if(C.get_obj_location(box,ox.address,oy.address,0)) ((C.field(box,"obj","ox").value=ox.value),(C.field(box,"obj","oy").value=oy.value));
    /*
     * TODO?
     *  if 'box' is known to be empty or known to be locked, give up
     *  before choosing 'targetbox'.
     */
    (targetbox=tipcontainer_gettarget(box,cancelled.address));
    if(cancelled.value) return;
    /* Shop handling:  can't rely on the container's own unpaid
       or no_charge status because contents might differ with it.
       A carried container's contents will be flagged as unpaid
       or not, as appropriate, and need no special handling here.
       Items owned by the hero get sold to the shop without
       confirmation as with other uncontrolled drops.  A floor
       container's contents will be marked no_charge if owned by
       hero, otherwise they're owned by the shop.  By passing
       the contents through shop billing, they end up getting
       treated the same as in the carried case.   We do so one
       item at a time instead of doing whole container at once
       to reduce the chance of exhausting shk's billing capacity. */
    (maybeshopgoods=C.i8(Number(!!(Number(!((Number(C.i32(C.field((box),"obj","where").value)==3))))&&C.i32(C.costly_spot(C.field(box,"obj","ox").value,C.field(box,"obj","oy").value))))));
    if(Number(tipcontainer_checks(box,targetbox,(C.i8(0)))!=TIPCHECK_OK)) return;
    if(Number(!!(targetbox&&Number(tipcontainer_checks(targetbox,0,(C.i8(1)))!=TIPCHECK_OK)))) return;
{
        let otmp; let nobj;
        let terse; let highdrop=C.i8(Number(!(C.can_reach_floor((C.i8(1)))))); let altarizing=C.i8((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(ox.value)*(C.sizes["struct rm"]*21))+Number(oy.value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))); let cursed_mbag=C.i8((Number(!!((Number(!!(Number(C.i32(C.field((box),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((box),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(C.field(box,"obj","cursed").value)))));
        let loss=0n;
        (srcheld=C.i8((Number(C.i32(C.field((box),"obj","where").value)==3))));
        (dstheld=C.i8((Number(!!(targetbox&&(Number(C.i32(C.field((targetbox),"obj","where").value)==3)))))));
        if(C.field(C.u,"you","uswallow").value) (highdrop=(altarizing=(C.i8(0))));
        (terse=C.i8(Number(!((Number(!!(Number(!!(C.i32(highdrop)||C.i32(altarizing)))||C.i32(C.costly_spot(C.field(box,"obj","ox").value,C.field(box,"obj","oy").value)))))))));
        (C.field(box,"obj","cknown").value=C.u32(1));
        /* Terse formatting is
         * "Objects spill out: obj1, obj2, obj3, ..., objN."
         * If any other messages intervene between objects, we revert to
         * "ObjK drops to the floor.", "ObjL drops to the floor.", &c.
         */
        if(targetbox) C.variadic(107,C.literal("%s into %s."),(C.field(C.field(box,"obj","cobj").value,"obj","nobj").value?C.literal("Objects tumble"):C.literal("An object tumbles")),C.the(C.xname(targetbox)));
 else C.variadic(108,C.literal("%s out%c"),(C.field(C.field(box,"obj","cobj").value,"obj","nobj").value?C.literal("Objects spill"):C.literal("An object spills")),(C.i32(terse)?58:46));
        for((otmp=C.field(box,"obj","cobj").value);otmp;(otmp=nobj)) {
            (nobj=C.field(otmp,"obj","nobj").value);
            C.obj_extract_self(otmp);
            ((C.field(otmp,"obj","ox").value=C.field(box,"obj","ox").value),(C.field(otmp,"obj","oy").value=C.field(box,"obj","oy").value));
            if(Number(C.i32(C.field(box,"obj","otyp").value)==C.ICE_BOX)) {
                removed_from_icebox(otmp);
                /* resume rotting for corpse */
            } else if(Number(!!(C.i32(cursed_mbag)&&C.i32(is_boh_item_gone())))) {
                (loss=C.i64(loss+mbag_item_gone(srcheld,otmp,(C.i8(0)))));
                /* abbreviated drop format is no longer appropriate */
                (terse=(C.i8(0)));
                continue;
            }
            if(maybeshopgoods) {
                C.addtobill(otmp,(C.i8(0)),(C.i8(0)),(C.i8(1)));
                (()=>{const __cell=C.field(C.iflags,"instance_flags","suppress_price");const __old=__cell.value;__cell.value=C.i32((__old+1));return __old;})();
                /* doname formatting */
            }
            if(targetbox) {
                if(Number(!!((Number(!!(Number(C.i32(C.field((targetbox),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((targetbox),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(mbag_explodes(otmp,0))))) {
                    C.variadic(109,2n,C.literal("just blew up %s bag of holding via tipping"),(C.field((C.genders+Number((C.i32(C.field(C.flags,"flag","female").value)?1:0))*C.sizes["struct Gender"]),"Gender","his").value));
                    /* explicitly mention what item is triggering explosion */
                    C.variadic(110,C.literal("As %s %s inside, you are blasted by a magical explosion!"),C.doname(otmp),C.otense(otmp,C.literal("tumble")));
                    /* if putting one bag of holding into another, first
                       blow up the one going in, then (below) blow up the
                       one it's going into */
                    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_HOLDING)) do_boh_explosion(otmp,C.i8(Number(!(srcheld))));
                    /* BoH into another */
                    /* always delete the item which triggered the explosion */
                    C.obfree(otmp,0);
                    /* where==OBJ_FREE */
                    /* [assumes targetbox is carried, otherwise shop bill
                       handling becomes necessary here] */
                    do_boh_explosion(targetbox,C.i8(Number(!(dstheld))));
                    if(dstheld) C.useup(targetbox);
 else C.useupf(targetbox,C.field(targetbox,"obj","quan").value);
                    (targetbox=0);
                    /* it's gone */
                    (nobj=0);
                    /* stop tipping; want loop to exit 'normally' */
                    C.losehp(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("pickup.c"),3803,(C.literal("tipcontainer"))),C.d((6),(6)))):C.d((6),(6)))),C.literal("magical explosion"),C.i8(0));
                } else {
                    C.add_to_container(targetbox,otmp);
                }
            } else if(highdrop) {
                (C.field(otmp,"obj","how_lost").value=C.u32(2));
                /* might break or fall down stairs; handles altars itself */
                C.hitfloor(otmp,(C.i8(1)));
            } else {
                if(altarizing) {
                    C.doaltarobj(otmp);
                } else if(Number(!(terse))) {
                    C.variadic(111,C.literal("%s %s to the %s."),C.Doname2(otmp),C.otense(otmp,C.literal("drop")),C.surface(ox.value,oy.value));
                } else {
                    C.variadic(112,C.literal("%s%c"),C.doname(otmp),(nobj?44:46));
                    (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_OBJNAM_ONLY);
                }
                (C.field(otmp,"obj","how_lost").value=C.u32(2));
                C.dropy(otmp);
                if(Number(C.field(C.iflags,"instance_flags","last_msg").value!=C.PLNMSG_OBJNAM_ONLY)) (terse=(C.i8(0)));
                /* terse formatting has been interrupted */
            }
            if(maybeshopgoods) (()=>{const __cell=C.field(C.iflags,"instance_flags","suppress_price");const __old=__cell.value;__cell.value=C.i32((__old-1));return __old;})();
            /* reset */
        }
        if(loss) C.variadic(113,C.literal("owe %ld %s for lost merchandise."),loss,C.currency(loss));
        /* magic bag lost some shop goods */
        (C.field(box,"obj","owt").value=C.u32(C.weight(box)));
        /* mbag_item_gone() doesn't update this */
        if(targetbox) (C.field(targetbox,"obj","owt").value=C.u32(C.weight(targetbox)));
        if(Number(!!(C.i32(srcheld)||C.i32(dstheld)))) encumber_msg();
    }    if(Number(!!(C.i32(srcheld)||C.i32(dstheld)))) C.update_inventory();
    } finally {C.stackRestore(stackFrame); }
}

/* returns number of containers in object chain; does not recurse into
   containers; skips bags of tricks when they're known */
/* list of objects (invent) */
/* particular object to exclude if found in list */
/* include bag of tricks when not known to be such */
/* ask user for a carried container into which they want box to be emptied;
   cancelled is TRUE if user cancelled the menu pick; hands aren't required
   when tipping to the floor but are when tipping into another container */
export function tipcontainer_gettarget(box,cancelled)
{
    box=C.ptr(box);
    cancelled=C.ptr(cancelled);
    const stackFrame=C.stackSave();
    try {
    let n; let n_conts;
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let buf=C.stackAlloc((1*256));
    let pick_list=C.local("struct mi *",0);
    let dummyobj=C.stackAlloc(C.sizes["struct obj"]); let otmp;
    let hands_available=(C.i8(1)); let exclude_it;
    let clr=8;
    /* [skip potential early return so that menu response is needed
         *  regardless of whether other containers are being carried] */
    (win=C.indirect(38,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.indirect(39,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    C.copy(dummyobj,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
    /* lint suppression; only its address matters */
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_obj").value=dummyobj);
    /* tip to floor does not require free hands */
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(45),C.i8(0),0,clr,C.literal("on the floor"),1);
    /* [TODO? vary destination string depending on surface()] */
    C.add_menu_str(win,C.literal(""));
    (n_conts=0);
    for((otmp=C.field(C.gi,"instance_globals_i","invent").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(otmp==box)) continue;
        /* skip non-containers; bag of tricks passes Is_container() test,
           only include it if it isn't known to be a bag of tricks */
        if(Number(!!(Number(!((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.BAG_OF_TRICKS))))))||(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_TRICKS)&&C.i32(C.field(otmp,"obj","dknown").value)))&&C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))))) continue;
        if(Number(!((()=>{const __old=n_conts;n_conts=C.i32((__old+1));return __old;})()))) (hands_available=u_handsy());
        /* might issue message */
        /* container-to-container tip requires free hands;
           exclude container as possible target when known to be locked */
        (exclude_it=C.i8(Number(!!(Number(!(hands_available))||(Number(!!(C.i32(C.field(otmp,"obj","olocked").value)&&C.i32(C.field(otmp,"obj","lknown").value))))))));
        C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        (C.field(any,"any","a_obj").value=(Number(!(exclude_it))?otmp:0));
        C.variadic(114,buf,C.literal("%s%s"),(Number(!(exclude_it))?C.literal(""):C.literal("    ")),C.doname(otmp));
        C.add_menu(win,C.nul_glyphinfo,any,C.i8((Number(!(exclude_it))?C.i32(C.field(otmp,"obj","invlet").value):0)),C.i8(0),0,clr,buf,0);
    }
    C.variadic(115,buf,C.literal("Where to tip the contents of %s"),C.doname(box));
    C.indirect(40,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,buf);
    (n=C.select_menu(win,1,pick_list.address));
    C.indirect(41,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    (otmp=0);
    if(pick_list.value) {
        (otmp=C.field(C.field((pick_list.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
        /* PICK_ONE with a preselected item might return 2;
           if so, choose the one that wasn't preselected */
        if(Number(!!(Number(n>1)&&Number(otmp==dummyobj)))) (otmp=C.field(C.field((pick_list.value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_obj").value);
        if(Number(otmp==dummyobj)) (otmp=0);
        C.free(pick_list.value);
    }
    (C.cell(cancelled,"signed char").value=C.i8((Number(n==C.i32((-1))))));
    return otmp;
    } finally {C.stackRestore(stackFrame); }
}

/* Perform check on box if we can tip it.
   Returns one of TIPCHECK_foo values.
   If allowempty if TRUE, return TIPCHECK_OK instead of TIPCHECK_EMPTY. */
export function tipcontainer_checks(box,targetbox,allowempty)
{
    box=C.ptr(box);
    targetbox=C.ptr(targetbox);
    allowempty=C.i8(allowempty);
    const stackFrame=C.stackSave();
    try {
    /* container player wants to tip */
    /* destination (used here for horn of plenty) */
    /* affects result when box is empty */
    /* undiscovered bag of tricks is acceptable as a container-to-container
       destination but it can't receive items; it has to be opened in
       preparation so apply it once before even trying to tip source box */
    if(Number(!!(targetbox&&Number(C.i32(C.field(targetbox,"obj","otyp").value)==C.BAG_OF_TRICKS)))) {
        let seencount=C.local("int",0);
        C.bagotricks(targetbox,(C.i8(0)),seencount.address);
        return TIPCHECK_CANNOT;
    }
    /* caveat: this assumes that cknown, lknown, olocked, and otrapped
       fields haven't been overloaded to mean something special for the
       non-standard "container" horn of plenty */
    if(Number(!(C.field(box,"obj","lknown").value))) {
        (C.field(box,"obj","lknown").value=C.u32(1));
        if((Number(C.i32(C.field((box),"obj","where").value)==3))) C.update_inventory();
        /* jumping the gun slightly; hope that's ok */
    }
    if(C.field(box,"obj","olocked").value) {
        C.variadic(116,C.literal("%s is locked."),C.upstart(C.thesimpleoname(box)));
        return TIPCHECK_LOCKED;
    } else if(C.field(box,"obj","otrapped").value) {
        /* we're not reaching inside but we're still handling it... */
        C.chest_trap(box,C.HAND,(C.i8(0)));
        /* even if the trap fails, you've used up this turn */
        if(Number(C.field(C.gm,"instance_globals_m","multi").value>=C.i64(0))) {
            /* in case we didn't become paralyzed */
            C.nomul(C.i32((-1)));
            (C.field(C.gm,"instance_globals_m","multi_reason").value=C.literal("tipping a container"));
            (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal(""));
        }
        return TIPCHECK_TRAPPED;
    } else if(Number(!!(Number(C.i32(C.field(box,"obj","otyp").value)==C.BAG_OF_TRICKS)||Number(C.i32(C.field(box,"obj","otyp").value)==C.HORN_OF_PLENTY)))) {
        let res=TIPCHECK_OK;
        let bag=C.i8((Number(C.i32(C.field(box,"obj","otyp").value)==C.BAG_OF_TRICKS)));
        let old_spe=C.i32(C.field(box,"obj","spe").value); let seen=C.local("int",0); let totseen;
        let maybeshopgoods=C.i8((Number(!!(Number(!((Number(C.i32(C.field((box),"obj","where").value)==3))))&&C.i32(C.costly_spot(C.field(box,"obj","ox").value,C.field(box,"obj","oy").value))))));
        let ox=C.local("short",C.field(C.u,"you","ux").value); let oy=C.local("short",C.field(C.u,"you","uy").value);
        if(Number(!!(targetbox&&(Number(((res=tipcontainer_checks(targetbox,0,(C.i8(1)))))!=TIPCHECK_OK))))) return res;
        if(C.get_obj_location(box,ox.address,oy.address,0)) ((C.field(box,"obj","ox").value=ox.value),(C.field(box,"obj","oy").value=oy.value));
        if(Number(!!(C.i32(maybeshopgoods)&&Number(!(C.field(box,"obj","no_charge").value))))) C.addtobill(box,(C.i8(0)),(C.i8(0)),(C.i8(1)));
        /* apply this bag/horn until empty or monster/object creation fails
           (if the latter occurs, force the former...) */
        (seen.value=(totseen=0));
        do {
            if(Number(!(((C.i32(bag)?C.bagotricks(box,(C.i8(1)),seen.address):C.hornoplenty(box,(C.i8(1)),targetbox)))))) break;
            (totseen=C.i32(totseen+seen.value));
        } while(Number(C.i32(C.field(box,"obj","spe").value)>0));
        if(Number(C.i32(C.field(box,"obj","spe").value)<old_spe)) {
            if(Number(!!(C.i32(bag)&&Number(!(totseen))))) C.variadic(117,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_nothing_seems_to_happen").value);
            /* check_unpaid wants to see a non-zero charge count */
            (C.field(box,"obj","spe").value=C.i8(old_spe));
            C.check_unpaid_usage(box,(C.i8(1)));
            (C.field(box,"obj","spe").value=C.i8(0));
            /* empty */
            (C.field(box,"obj","cknown").value=C.u32(1));
        }
        if(Number(!!(C.i32(maybeshopgoods)&&Number(!(C.field(box,"obj","no_charge").value))))) C.subfrombill(box,C.shop_keeper(C.cell(C.in_rooms(ox.value,oy.value,C.SHOPBASE),"char").value));
        return TIPCHECK_CANNOT;
        /* actually means 'already done' */
    } else if((Number(!!(Number(C.i32(C.field((box),"obj","otyp").value)==C.LARGE_BOX)&&Number(C.i32(C.field((box),"obj","spe").value)==1))))) {
        let yourbuf=C.stackAlloc((1*256));
        let empty_it=(C.i8(0));
        observe_quantum_cat(box,(C.i8(1)),(C.i8(1)));
        if(Number(!((Number(C.field((box),"obj","cobj").value!=0))))) C.variadic(118,C.literal("%sbox is now empty."),C.Shk_Your(yourbuf,box));
 else (empty_it=(C.i8(1)));
        /* evidently a live cat came out */
        /* container type of "large box" is inferred */
        /* holds cat corpse */
        (C.field(box,"obj","cknown").value=C.u32(1));
        return ((Number(!!(C.i32(empty_it)||C.i32(allowempty))))?TIPCHECK_OK:TIPCHECK_EMPTY);
    } else if(Number(!!(Number(!(allowempty))&&Number(!((Number(C.field((box),"obj","cobj").value!=0))))))) {
        (C.field(box,"obj","cknown").value=C.u32(1));
        C.variadic(119,C.literal("%s is empty."),C.upstart(C.thesimpleoname(box)));
        return TIPCHECK_EMPTY;
    }
    return TIPCHECK_OK;
    } finally {C.stackRestore(stackFrame); }
}

/*pickup.c*/
export const pickupStaticInitializers = C => [
    {name:"slightloadpfx",type:"char[26]",size:(1*26),values:C.literal("You have a little trouble")},
    {name:"moderateloadpfx",type:"char[17]",size:(1*17),values:C.literal("You have trouble")},
    {name:"nearloadpfx",type:"char[22]",size:(1*22),values:C.literal("You have much trouble")},
    {name:"overloadpfx",type:"char[28]",size:(1*28),values:C.literal("You have extreme difficulty")},
    {name:"add_valid_menu_class.vmc_count",type:"int",size:4,values:0},
    {name:"autopick_testobj.costly",type:"signed char",size:1,values:(C.i8(0))},
    {name:"observe_quantum_cat.sc",type:"char[19]",size:(1*19),values:C.literal("Schroedinger's Cat")},
    {name:"explain_container_prompt.explaintext",type:"char *[14]",size:(8*14),values:[C.literal("Container actions:"),C.literal(""),C.literal(" : -- Look: examine contents"),C.literal(" o -- Out: take things out"),C.literal(" i -- In: put things in"),C.literal(" b -- Both: first take things out, then put things in"),C.literal(" r -- Reversed: put things in, then take things out"),C.literal(" s -- Stash: put one item in"),C.literal(""),C.literal(" n -- Next: loot next selected container"),C.literal(" q -- Quit: finished"),C.literal(" ? -- Help: display this text."),C.literal(""),0]},
    {name:"in_or_out_menu.lootchars",type:"char[10]",size:(1*10),values:C.literal("_:oibrsnq")},
    {name:"in_or_out_menu.abc_chars",type:"char[10]",size:(1*10),values:C.literal("_:abcdenq")},
];
