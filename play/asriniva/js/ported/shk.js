import { C } from '../c-runtime/context.js';
/* NetHack 5.0	shk.c	$NHDT-Date: 1736516428 2025/01/10 05:40:28 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.306 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */
/*
 * FIXME:
 *  The normal shop messages are verbal.  There are a lot of cases
 *  where an alternate message is given if the hero is deaf or shk
 *  is mute (when poly'd), but that is usually visual-based.  It is
 *  possible for hero to pay for items while blind (only if adjacent
 *  to shk) and the alternate messages fail to account for that.
 */
/* too poor */
/* completely used up; obj->where==OBJ_ONBILL */
/* partly used up; obj->where==OBJ_INVENT or similar */
/* intact portion of partly used up item */
/* normal unpaid item */
/* container->cknown==1, holding unpaid item(s) */
/* container->cknown==0 */
/* this is similar to sortloot; the shop bill gets converted into an array of
   struct sortbill_item so that sorting and traversal don't need to access
   the original bill or even the shk; the array gets sorted by usedup vs
   unpaid and by cost within each of those two categories */
/* full amount for current quantity, not per-unit amount */
/* count for this entry; subset if this is partly used or
                  * partly intact */
/* index into ESHK(shkp)->bill_p[]; hero-owned container,
                  * which isn't in bill_p[], uses bidx == -1 */
/* billitem_status, small but needs to be signed for qsort()
                  * [for an earlier edition; 'signed' no longer necessary] */
/* buy without asking when containers are involved
                        * or purchase targets have been picked via menu */
/* defined in shknam.c */
/*
        invariants: obj->unpaid iff onbill(obj) [unless bp->useup]
                    obj->quan <= bp->bquan
 */
/*
 *  Transfer money from inventory to monster when paying
 *  shopkeepers, priests, oracle, succubus, and other demons.
 *  Simple with only gold coins.
 *  This routine will handle money changing when multiple
 *  coin types is implemented, only appropriate
 *  monsters will pay change.  (Peaceful shopkeepers, priests
 *  and the oracle try to maintain goodwill while selling
 *  their wares or services.  Angry monsters and all demons
 *  will keep anything they get their hands on.
 *  Returns the amount actually paid, so we can know
 *  if the monster kept the change.
 */
export function money2mon(mon,amount)
{
    mon=C.ptr(mon);
    amount=C.i64(amount);
    let ygold=C.findgold(C.field(C.gi,"instance_globals_i","invent").value);
    if(Number(amount<=C.i64(0))) {
        C.variadic(0,C.literal("%s payment in money2mon!"),(amount?C.literal("negative"):C.literal("zero")));
        return 0n;
    }
    if(Number(!!(Number(!(ygold))||Number(C.field(ygold,"obj","quan").value<amount)))) {
        C.variadic(1,C.literal("Paying without %s gold?"),(ygold?C.literal("enough"):C.literal("")));
        return 0n;
    }
    if(Number(C.field(ygold,"obj","quan").value>amount)) (ygold=C.splitobj(ygold,amount));
 else if(C.field(ygold,"obj","owornmask").value) C.remove_worn_item(ygold,(C.i8(0)));
    /* quiver */
    C.freeinv(ygold);
    C.add_to_minv(mon,ygold);
    (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    return amount;
}

/*
 *  Transfer money from monster to inventory.
 *  Used when the shopkeeper pay for items, and when
 *  the priest gives you money for an ale.
 */
export function money2u(mon,amount)
{
    mon=C.ptr(mon);
    amount=C.i64(amount);
    let mongold=C.findgold(C.field(mon,"monst","minvent").value);
    if(Number(amount<=C.i64(0))) {
        C.variadic(2,C.literal("%s payment in money2u!"),(amount?C.literal("negative"):C.literal("zero")));
        return;
    }
    if(Number(!!(Number(!(mongold))||Number(C.field(mongold,"obj","quan").value<amount)))) {
        C.variadic(3,C.literal("%s paying without %s gold?"),C.a_monnam(mon),(mongold?C.literal("enough"):C.literal("")));
        return;
    }
    if(Number(C.field(mongold,"obj","quan").value>amount)) (mongold=C.splitobj(mongold,amount));
    C.obj_extract_self(mongold);
    if(Number(!!(Number(!(C.merge_choice(C.field(C.gi,"instance_globals_i","invent").value,mongold)))&&Number(C.inv_cnt((C.i8(0)))>=C.invlet_basic)))) {
        C.variadic(4,C.literal("have no room for the gold!"));
        C.dropy(mongold);
    } else {
        C.addinv(mongold);
        (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    }
}

export function next_shkp(shkp,withbill)
{
    shkp=C.ptr(shkp);
    withbill=C.i8(withbill);
    for(;shkp;(shkp=C.field(shkp,"monst","nmon").value)) {
        if((Number(C.field((shkp),"monst","mhp").value<1))) continue;
        if(Number(!!(C.i32(C.field(shkp,"monst","isshk").value)&&(Number(!!(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value||Number(!(withbill)))))))) break;
    }
    if(shkp) {
        if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) {
            if(Number(!(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value))) rile_shk(shkp);
        }
    }
    return shkp;
}

/* called in mon.c */
export function shkgone(mtmp)
{
    mtmp=C.ptr(mtmp);
    let eshk=(C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value);
    let sroom=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(C.field(eshk,"eshk","shoproom").value)-3)))*C.sizes["struct mkroom"]);
    let otmp;
    let p;
    let sx; let sy;
    /* [BUG: some of this should be done on the shop level */
    /*       even when the shk dies on a different level.] */
    if(C.on_level(C.field(eshk,"eshk","shoplevel").address,C.field(C.u,"you","uz").address)) {
        discard_damage_owned_by(mtmp);
        (C.field(sroom,"mkroom","resident").value=0);
        if(Number(!(C.search_special(C.i8((C.i32((-2)))))))) (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_shop").value=C.u32(0));
        /* items on shop floor revert to ordinary objects */
        for((sx=C.i32(C.field(sroom,"mkroom","lx").value));Number(sx<=C.i32(C.field(sroom,"mkroom","hx").value));(()=>{const old=sx;sx=C.i32((old+1));return old;})()) for((sy=C.i32(C.field(sroom,"mkroom","ly").value));Number(sy<=C.i32(C.field(sroom,"mkroom","hy").value));(()=>{const old=sy;sy=C.i32((old+1));return old;})()) for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(sx)*(8*21))+Number(sy)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) (C.field(otmp,"obj","no_charge").value=C.u32(0));



        /* Make sure bill is set only when the
           dead shk is the resident shk. */
        if(Number(((p=C.strchr(C.field(C.u,"you","ushops").address,C.i32(C.field(eshk,"eshk","shoproom").value))))!=0)) {
            setpaid(mtmp);
            (C.field(eshk,"eshk","bill_p").value=0);
            /* remove eshk->shoproom from u.ushops */
            do {
                (C.cell(p,"char").value=C.cell(((p+Number(1)*1)),"char").value);
            } while(C.cell((()=>{const old=p;p=C.ptr((old+Number(1)));return p;})(),"char").value);
        }
    }
}

export function set_residency(shkp,zero_out)
{
    shkp=C.ptr(shkp);
    zero_out=C.i8(zero_out);
    if(C.on_level(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoplevel").address,C.field(C.u,"you","uz").address)) (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value)-3)))*C.sizes["struct mkroom"]),"mkroom","resident").value=(C.i32((zero_out))?0:shkp));
}

export function replshk(mtmp,mtmp2)
{
    mtmp=C.ptr(mtmp);
    mtmp2=C.ptr(mtmp2);
    (C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(C.field((C.field(C.field((mtmp2),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value)-3)))*C.sizes["struct mkroom"]),"mkroom","resident").value=mtmp2);
    if(Number(!!(inhishop(mtmp)&&Number(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)==C.i32(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value))))) {
        (C.field((C.field(C.field((mtmp2),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value=(C.field((C.field(C.field((mtmp2),"monst","mextra").value,"mextra","eshk").value),"eshk","bill").address+Number(0)*C.sizes["struct bill_x"]));
    }
}

/* do shopkeeper specific structure munging -dlc */
export function restshk(shkp,ghostly)
{
    shkp=C.ptr(shkp);
    ghostly=C.i8(ghostly);
    if(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value) {
        let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
        if(Number(C.field(eshkp,"eshk","bill_p").value!=C.ptr(C.i32((-1000))))) (C.field(eshkp,"eshk","bill_p").value=(C.field(eshkp,"eshk","bill").address+Number(0)*C.sizes["struct bill_x"]));
        /* shoplevel can change as dungeons move around */
        /* savebones guarantees that non-homed shk's will be gone */
        if(ghostly) {
            C.assign_level(C.field(eshkp,"eshk","shoplevel").address,C.field(C.u,"you","uz").address);
            if(Number(!!((Number(!((C.field((shkp),"monst","mpeaceful").value))))&&C.strncmpi(C.field(eshkp,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,32)))) pacify_shk(shkp,(C.i8(1)));
        }
    }
}

/* clear the unpaid bit on a single object and its contents */
export function clear_unpaid_obj(shkp,otmp)
{
    shkp=C.ptr(shkp);
    otmp=C.ptr(otmp);
    if((Number(C.field((otmp),"obj","cobj").value!=0))) clear_unpaid(shkp,C.field(otmp,"obj","cobj").value);
    if(onbill(otmp,shkp,(C.i8(1)))) (C.field(otmp,"obj","unpaid").value=C.u32(0));
}

/* clear the unpaid bit on all of the objects in the list */
export function clear_unpaid(shkp,list)
{
    shkp=C.ptr(shkp);
    list=C.ptr(list);
    while(list) {
        clear_unpaid_obj(shkp,list);
        (list=C.field(list,"obj","nobj").value);
    }
}

/* clear the no_charge bit on a single object and its contents */
export function clear_no_charge_obj(shkp,otmp)
{
    shkp=C.ptr(shkp);
    otmp=C.ptr(otmp);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["clear_no_charge_obj.x@12572",2],["clear_no_charge_obj.y@12575",2]]);
    try {
    /* if null, clear regardless of shop */
    if((Number(C.field((otmp),"obj","cobj").value!=0))) clear_no_charge(shkp,C.field(otmp,"obj","cobj").value);
    if(C.field(otmp,"obj","no_charge").value) {
        let rm_shkp;
        let rno;
        let x=C.local("clear_no_charge_obj.x@12572","short"); let y=C.local("clear_no_charge_obj.y@12575","short");
        /*
         * Clear no_charge if
         *  shkp is Null (clear all items on specified list)
         *  or not located somewhere that we expect no_charge (which is
         *    floor [of shop] or inside container [on shop floor])
         *  or can't find object's map coordinates (should never happen
         *    for floor or contained; conceivable if on shop bill somehow
         *    but would have failed the floor-or-contained test since
         *    containers get emptied before going onto bill)
         *  or fails location sanity check (should always be good when
         *    location successfully found)
         *  or not inside any room
         *  or the room isn't a shop
         *  or the shop has no shopkeeper (deserted)
         *  or shopkeeper is the current one (to avoid clearing no_charge
         *    for items located in some rival's shop).
         *
         * no_charge items in a shop which is only temporarily deserted
         * become owned by the shop now and will be for-sale once the shk
         * returns.
         */
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(shkp))||(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)!=1)&&Number(C.i32(C.field(otmp,"obj","where").value)!=2)))&&Number(C.i32(C.field(otmp,"obj","where").value)!=6))))))||Number(!(C.get_obj_location(otmp,x.address,y.address,C.i32((2|6)))))))||Number(!(C.isok(x.value,y.value)))))||Number(((rno=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x.value)*(C.sizes["struct rm"]*21))+Number(y.value)*C.sizes["struct rm"]),"rm","roomno").value)))<3)))||Number(!((Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((rno-3)))*C.sizes["struct mkroom"]),"mkroom","rtype").value)>=C.SHOPBASE))))))||Number(((rm_shkp=C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((rno-3)))*C.sizes["struct mkroom"]),"mkroom","resident").value))==0)))||Number(rm_shkp==shkp)))) (C.field(otmp,"obj","no_charge").value=C.u32(0));
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* clear the no_charge bit on all of the objects in the list */
export function clear_no_charge(shkp,list)
{
    shkp=C.ptr(shkp);
    list=C.ptr(list);
    while(list) {
        /* handle first element of list and any contents it may have */
        clear_no_charge_obj(shkp,list);
        /* move on to next element of list */
        (list=C.field(list,"obj","nobj").value);
    }
}

/* clear no_charge from objects in pets' inventories belonging to shkp */
export function clear_no_charge_pets(shkp)
{
    shkp=C.ptr(shkp);
    let mtmp;
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) if(Number(!!(C.i32(C.field(mtmp,"monst","mtame").value)&&C.field(mtmp,"monst","minvent").value))) clear_no_charge(shkp,C.field(mtmp,"monst","minvent").value);

}

/* either you paid or left the shop or the shopkeeper died */
export function setpaid(shkp)
{
    shkp=C.ptr(shkp);
    let obj;
    let mtmp;
    clear_unpaid(shkp,C.field(C.gi,"instance_globals_i","invent").value);
    clear_unpaid(shkp,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);
    if(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value) clear_unpaid(shkp,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);
    if(C.field(C.gt,"instance_globals_t","thrownobj").value) clear_unpaid_obj(shkp,C.field(C.gt,"instance_globals_t","thrownobj").value);
    if(C.field(C.gk,"instance_globals_k","kickedobj").value) clear_unpaid_obj(shkp,C.field(C.gk,"instance_globals_k","kickedobj").value);
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) if(C.field(mtmp,"monst","minvent").value) clear_unpaid(shkp,C.field(mtmp,"monst","minvent").value);

    for((mtmp=C.field(C.gm,"instance_globals_m","migrating_mons").value);mtmp;(mtmp=C.field(mtmp,"monst","nmon").value)) if(C.field(mtmp,"monst","minvent").value) clear_unpaid(shkp,C.field(mtmp,"monst","minvent").value);

    /* clear obj->no_charge for all obj in shkp's shop */
    clear_no_charge(shkp,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);
    clear_no_charge(shkp,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);
    while(Number(((obj=C.field(C.gb,"instance_globals_b","billobjs").value))!=0)) {
        C.obj_extract_self(obj);
        C.dealloc_obj(obj);
    }
    if(shkp) {
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value=0);
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value=0n);
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value=0n);
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","loan").value=0n);
    }
}

/* Remembers that a shopkeeper has quoted a particular price for a
   particular type of object. */
export function record_price_quote(otyp,price,buyprice)
{
    otyp=C.i32(otyp);
    price=C.u64(price);
    buyprice=C.i8(buyprice);
    let oc=(C.objects+Number(otyp)*C.sizes["struct objclass"]);
    if(buyprice) {
        if(Number(price>C.field(oc,"objclass","oc_buy_maxseen").value)) (C.field(oc,"objclass","oc_buy_maxseen").value=price);
        if(Number(price<C.field(oc,"objclass","oc_buy_minseen").value)) (C.field(oc,"objclass","oc_buy_minseen").value=price);
    } else {
        if(Number(price>C.field(oc,"objclass","oc_sell_maxseen").value)) (C.field(oc,"objclass","oc_sell_maxseen").value=price);
        if(Number(price<C.field(oc,"objclass","oc_sell_minseen").value)) (C.field(oc,"objclass","oc_sell_minseen").value=price);
    }
}

/* Appends price-quote information to the given buffer, updating the
   given end of string position. *eos mut be buf + strlen(buf). If the
   update would make bug longer than BUFSZ, instead does nothing. */
export function append_price_quote(buf,eos,otyp)
{
    buf=C.ptr(buf);
    eos=C.ptr(eos);
    otyp=C.i32(otyp);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["append_price_quote.buf2@16691",(1*256)]]);
    try {
    let buf2=C.automatic("append_price_quote.buf2@16691",(1*256));
    let eos2=buf2;
    let sep=C.literal("");
    let len=C.u64(C.i64(((C.cell(eos,"char *").value-buf)/1)));
    let len2;
    if(Number(!!(Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_minseen").value>C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_maxseen").value)&&Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_minseen").value>C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_maxseen").value)))) return;
    (eos2=C.ptr(eos2+Number(C.variadic(5,eos2,C.literal(" {")))*1));
    if(Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_minseen").value<C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_maxseen").value)) {
        (eos2=C.ptr(eos2+Number(C.variadic(6,eos2,C.literal("buy %lu-%lu"),C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_minseen").value,C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_maxseen").value))*1));
        (sep=C.literal(" "));
    } else if(Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_minseen").value==C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_maxseen").value)) {
        (eos2=C.ptr(eos2+Number(C.variadic(7,eos2,C.literal("buy %lu"),C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_buy_minseen").value))*1));
        (sep=C.literal(" "));
    }
    if(Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_minseen").value<C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_maxseen").value)) {
        (eos2=C.ptr(eos2+Number(C.variadic(8,eos2,C.literal("%ssell %lu-%lu"),sep,C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_minseen").value,C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_maxseen").value))*1));
    } else if(Number(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_minseen").value==C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_maxseen").value)) {
        (eos2=C.ptr(eos2+Number(C.variadic(9,eos2,C.literal("%ssell %lu"),sep,C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_sell_minseen").value))*1));
    }
    (eos2=C.ptr(eos2+Number(C.variadic(10,eos2,C.literal("}")))*1));
    (len2=C.u64(C.i64(((eos2-buf2)/1))));
    if(Number(len2<C.u64((C.u64((C.u64(256)-len))-C.u64(1))))) {
        C.strcpy(C.cell(eos,"char *").value,buf2);
        (C.cell(eos,"char *").value=C.ptr(C.cell(eos,"char *").value+Number(len2)*1));
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function addupbill(shkp)
{
    shkp=C.ptr(shkp);
    let ct=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value;
    let bp=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value;
    let total=0n;
    while((()=>{const old=ct;ct=C.i32((old-1));return old;})()) {
        (total=C.i64(total+C.i64((C.field(bp,"bill_x","price").value*C.field(bp,"bill_x","bquan").value))));
        (()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return old;})();
    }
    return total;
}

export function call_kops(shkp,nearshop)
{
    shkp=C.ptr(shkp);
    nearshop=C.i8(nearshop);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["call_kops.mm@18967",C.sizes["struct nhcoord"]],["call_kops.sx@18987",2],["call_kops.sy@18995",2]]);
    try {
    /* Keystone Kops srt@ucla */
    let nokops;
    if(Number(!(shkp))) return;
    ;
    if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) C.variadic(11,C.literal("An alarm sounds!"));
    (nokops=C.i8((Number(!!(Number(!!(Number(!!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_KEYSTONE_KOP)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))&&(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_KOP_SERGEANT)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))&&(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_KOP_LIEUTENANT)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))&&(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_KOP_KAPTAIN)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1)))))))))));
    if(Number(!!(Number(!(C.angry_guards(C.i8(Number(!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))))))))&&C.i32(nokops)))) {
        if(Number(!!(C.i32(C.field(C.flags,"flag","verbose").value)&&Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))))) C.variadic(12,C.literal("But no one seems to respond to it."));
        return;
    }
    if(nokops) return;
{
        let mm=C.automatic("call_kops.mm@18967",C.sizes["struct nhcoord"]);
        let sx=C.local("call_kops.sx@18987","short",C.i16(0)); let sy=C.local("call_kops.sy@18995","short",C.i16(0));
        C.choose_stairs(sx.address,sy.address,(C.i8(1)));
        if(nearshop) {
            /* Create swarm around you, if you merely "stepped out" */
            if(C.field(C.flags,"flag","verbose").value) C.variadic(13,C.literal("Keystone Kops appear!"));
            (C.field(mm,"nhcoord","x").value=C.field(C.u,"you","ux").value);
            (C.field(mm,"nhcoord","y").value=C.field(C.u,"you","uy").value);
            makekops(mm);
            return;
        }
        if(C.field(C.flags,"flag","verbose").value) C.variadic(14,C.literal("Keystone Kops are after you!"));
        /* Create swarm near down staircase (hinders return to level) */
        if(C.isok(sx.value,sy.value)) {
            (C.field(mm,"nhcoord","x").value=sx.value);
            (C.field(mm,"nhcoord","y").value=sy.value);
            makekops(mm);
        }
        /* Create swarm near shopkeeper (hinders return to shop) */
        (C.field(mm,"nhcoord","x").value=C.field(shkp,"monst","mx").value);
        (C.field(mm,"nhcoord","y").value=C.field(shkp,"monst","my").value);
        makekops(mm);
    }    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* x,y is strictly inside shop */
export function inside_shop(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let rno;
    (rno=C.i8(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","roomno").value));
    if(Number(!!(Number(!!((Number(C.i32(rno)<3))||C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value)))||Number(!((Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(rno)-3)))*C.sizes["struct mkroom"]),"mkroom","rtype").value)>=C.SHOPBASE))))))) (rno=C.i8(0));
    return rno;
}

export function u_left_shop(leavestring,newlev)
{
    leavestring=C.ptr(leavestring);
    newlev=C.i8(newlev);
    let shkp;
    let eshkp;
    /*
     * IF player
     * ((didn't leave outright) AND
     *  ((he is now strictly-inside the shop) OR
     *   (he wasn't strictly-inside last turn anyway)))
     * THEN (there's nothing to do, so just return)
     */
    if(Number(!!(Number(!(C.cell(leavestring,"char").value))&&(Number(!!(Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","edge").value))||C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux0").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy0").value)*C.sizes["struct rm"]),"rm","edge").value))))))) return;
    (shkp=shop_keeper(C.i8((C.i32(C.cell(leavestring,"char").value)?C.i32(C.cell(leavestring,"char").value):C.i32(C.cell(C.field(C.u,"you","ushops0").address,"char").value)))));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return;
    /* shk died, teleported, changed levels... */
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if(Number(!!(Number(!(C.field(eshkp,"eshk","billct").value))&&Number(!(C.field(eshkp,"eshk","debit").value))))) return;
    /* bill is settled */
    if(Number(!!(Number(!(C.cell(leavestring,"char").value))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
        /*
         * Player just stepped onto shop-boundary (known from above logic).
         * Try to intimidate him into paying his bill
         */
        let not_upset=C.i8(Number(!(C.field(eshkp,"eshk","surcharge").value)));
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(15,(C.i32(not_upset)?C.literal("%s!  Please pay before leaving."):C.literal("%s!  Don't you leave without paying!")),C.field(C.svp,"instance_globals_saved_p","plname").address);
        } else {
            C.variadic(16,C.literal("%s %s that you need to pay before leaving%s"),C.Shknam(shkp),(C.i32(not_upset)?C.literal("points out"):C.literal("makes it clear")),(C.i32(not_upset)?C.literal("."):C.literal("!")));
        }
        return;
    }
    if(rob_shop(shkp)) {
        call_kops(shkp,C.i8((Number(!!(Number(!(newlev))&&C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux0").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy0").value)*C.sizes["struct rm"]),"rm","edge").value))))));
    }
}

export function credit_report(shkp,idx,silent)
{
    shkp=C.ptr(shkp);
    idx=C.i32(idx);
    silent=C.i8(silent);
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    
    if(Number(!(idx))) {
        (C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(0)*8),"long").value=(C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(0)*8),"long").value=0n));
        (C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(1)*8),"long").value=(C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(1)*8),"long").value=0n));
        (C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(2)*8),"long").value=(C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(2)*8),"long").value=0n));
    } else {
        (idx=1);
    }
    (C.cell(((C.staticAddress("credit_report.credit_snap")+Number(idx)*(8*3))+Number(0)*8),"long").value=C.field(eshkp,"eshk","credit").value);
    (C.cell(((C.staticAddress("credit_report.credit_snap")+Number(idx)*(8*3))+Number(1)*8),"long").value=C.field(eshkp,"eshk","debit").value);
    (C.cell(((C.staticAddress("credit_report.credit_snap")+Number(idx)*(8*3))+Number(2)*8),"long").value=C.field(eshkp,"eshk","loan").value);
    if(Number(!!(idx&&Number(!(silent))))) {
        let amt=0n;
        let msg=C.literal("debt has increased");
        if(Number(C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(0)*8),"long").value<C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(0)*8),"long").value)) {
            (amt=C.i64((C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(0)*8),"long").value-C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(0)*8),"long").value)));
            (msg=C.literal("credit has been reduced"));
        } else if(Number(C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(1)*8),"long").value>C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(1)*8),"long").value)) {
            (amt=C.i64((C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(1)*8),"long").value-C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(1)*8),"long").value)));
        } else if(Number(C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(2)*8),"long").value>C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(2)*8),"long").value)) {
            (amt=C.i64((C.cell(((C.staticAddress("credit_report.credit_snap")+Number(1)*(8*3))+Number(2)*8),"long").value-C.cell(((C.staticAddress("credit_report.credit_snap")+Number(0)*(8*3))+Number(2)*8),"long").value)));
        }
        if(amt) C.variadic(17,C.literal("%s by %ld %s."),msg,amt,C.currency(amt));
    }
}

/* robbery from outside the shop via telekinesis or grappling hook */
export function remote_burglary(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let shkp;
    let eshkp;
    (shkp=shop_keeper(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return;
    /* shk died, teleported, changed levels... */
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if(Number(!!(Number(!(C.field(eshkp,"eshk","billct").value))&&Number(!(C.field(eshkp,"eshk","debit").value))))) return;
    /* bill is settled */
    if(rob_shop(shkp)) {
        /*[might want to set 2nd arg based on distance from shop doorway]*/
        call_kops(shkp,(C.i8(0)));
    }
}

/* shop merchandise has been taken; pay for it with any credit available;
   return false if the debt is fully covered by credit, true otherwise */
export function rob_shop(shkp)
{
    shkp=C.ptr(shkp);
    let eshkp;
    let total;
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    rouse_shk(shkp,(C.i8(1)));
    (total=(C.i64((addupbill(shkp)+C.field(eshkp,"eshk","debit").value))));
    if(Number(C.field(eshkp,"eshk","credit").value>=total)) {
        C.variadic(18,C.literal("credit of %ld %s is used to cover your shopping bill."),C.field(eshkp,"eshk","credit").value,C.currency(C.field(eshkp,"eshk","credit").value));
        (total=0n);
        /* credit gets cleared by setpaid() */
    } else {
        C.variadic(19,C.literal("escaped the shop without paying!"));
        (total=C.i64(total-C.field(eshkp,"eshk","credit").value));
    }
    setpaid(shkp);
    if(Number(!(total))) return (C.i8(0));
    /* by this point, we know an actual robbery has taken place */
    (C.field(eshkp,"eshk","robbed").value=C.i64(C.field(eshkp,"eshk","robbed").value+total));
    C.variadic(20,C.literal("stole %ld %s worth of merchandise."),total,C.currency(total));
    C.variadic(21,2n,C.literal("stole %ld %s worth of merchandise from %s %s"),total,C.currency(total),C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((C.field(eshkp,"eshk","shoptype").value-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value);
    if(Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_ROGUE)))))) C.adjalign(C.i32((-C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)))));
    /* stealing is unlawful */
    hot_pursuit(shkp);
    return (C.i8(1));
}

/* give a message when entering an untended shop (caller has verified that) */
export function deserted_shop(enterstring)
{
    enterstring=C.ptr(enterstring);
    /*const*/
    let mtmp;
    let r=(C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(C.cell(enterstring,"char").value)-3)))*C.sizes["struct mkroom"]);
    let x; let y; let m=0; let n=0;
    for((x=C.i32(C.field(r,"mkroom","lx").value));Number(x<=C.i32(C.field(r,"mkroom","hx").value));(()=>{const old=x;x=C.i32((old+1));return x;})()) for((y=C.i32(C.field(r,"mkroom","ly").value));Number(y<=C.i32(C.field(r,"mkroom","hy").value));(()=>{const old=y;y=C.i32((old+1));return y;})()) {
        if((Number(!!(Number((x)==C.i32(C.field(C.u,"you","ux").value))&&Number((y)==C.i32(C.field(C.u,"you","uy").value)))))) continue;
        if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)) {
            (()=>{const old=n;n=C.i32((old+1));return n;})();
            if(Number(!!(C.sensemon(mtmp)||(Number(!!((Number(!!(Number((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))==C.M_AP_NOTHING)||Number((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))==C.M_AP_MONSTER))))&&C.canseemon(mtmp))))))) (()=>{const old=m;m=C.i32((old+1));return m;})();
        }
    }

    if(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))&&Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","extrinsic").value)))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))) (()=>{const old=n;n=C.i32((old+1));return n;})();
    /* force feedback to be less specific */
    C.variadic(22,C.literal("This shop %s %s."),((Number(m<n))?C.literal("seems to be"):C.literal("is")),(Number(!(n))?C.literal("deserted"):C.literal("untended")));
}

/* called from check_special_room(hack.c) */
export function u_entered_shop(enterstring)
{
    enterstring=C.ptr(enterstring);
    
    let shkp;
    let eshkp;
    let rt;
    if(Number(!(C.cell(enterstring,"char").value))) return;
    (shkp=shop_keeper(C.cell(enterstring,"char").value));
    if(Number(!(shkp))) {
        if(Number(!!(Number(!(C.strchr(C.staticAddress("u_entered_shop.empty_shops"),C.i32(C.cell(enterstring,"char").value))))&&(Number(C.in_rooms(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.SHOPBASE)!=C.in_rooms(C.field(C.u,"you","ux0").value,C.field(C.u,"you","uy0").value,C.SHOPBASE)))))) deserted_shop(enterstring);
        C.strcpy(C.staticAddress("u_entered_shop.empty_shops"),C.field(C.u,"you","ushops").address);
        (C.cell((C.field(C.u,"you","ushops").address+Number(0)*1),"char").value=C.i8(0));
        return;
    }
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if(Number(!(inhishop(shkp)))) {
        /* dump core when referenced */
        (C.field(eshkp,"eshk","bill_p").value=C.ptr(C.i32((-1000))));
        if(Number(!(C.strchr(C.staticAddress("u_entered_shop.empty_shops"),C.i32(C.cell(enterstring,"char").value))))) deserted_shop(enterstring);
        C.strcpy(C.staticAddress("u_entered_shop.empty_shops"),C.field(C.u,"you","ushops").address);
        (C.cell((C.field(C.u,"you","ushops").address+Number(0)*1),"char").value=C.i8(0));
        return;
    }
    C.record_achievement(C.i8(C.ACH_SHOP));
    (C.field(eshkp,"eshk","bill_p").value=(C.field(eshkp,"eshk","bill").address+Number(0)*C.sizes["struct bill_x"]));
    if(Number(!!((Number(!!(Number(!(C.field(eshkp,"eshk","visitct").value))||C.i32(C.cell(C.field(eshkp,"eshk","customer").address,"char").value))))&&C.strncmpi(C.field(eshkp,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,32)))) {
        /* You seem to be new here */
        (C.field(eshkp,"eshk","visitct").value=0);
        (C.field(eshkp,"eshk","following").value=C.i8(0));
        C.strncpy(C.field(eshkp,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32));
        pacify_shk(shkp,(C.i8(1)));
    }
    if(Number(!!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))||C.i32(C.field(eshkp,"eshk","following").value)))) return;
    /* no dialog */
    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))) {
        C.variadic(23,C.literal("%s senses your presence."),C.Shknam(shkp));
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(24,C.literal("Invisible customers are not welcome!"));
        } else {
            C.variadic(25,C.literal("%s stands firm as if %s knows you are there."),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","he").value));
        }
        return;
    }
    (rt=C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(C.cell(enterstring,"char").value)-3)))*C.sizes["struct mkroom"]),"mkroom","rtype").value));
    if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) {
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(26,C.literal("So, %s, you dare return to %s %s?!"),C.field(C.svp,"instance_globals_saved_p","plname").address,C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((rt-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value);
        } else {
            C.variadic(27,C.literal("%s seems %s over your return to %s %s!"),C.Shknam(shkp),C.cell((C.staticAddress("angrytexts")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),820,(C.literal("u_entered_shop"))),C.rn2(C.i32((C.u64((BigInt((8*3))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*3))/BigInt(8)))))))))*8),"char *").value,(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),C.field((C.shtypes+Number(C.i32((rt-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value);
        }
    } else if(C.field(eshkp,"eshk","surcharge").value) {
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(28,C.literal("Back again, %s?  I've got my %s on you."),C.field(C.svp,"instance_globals_saved_p","plname").address,C.mbodypart(shkp,C.EYE));
        } else {
            C.variadic(29,C.literal("atmosphere at %s %s seems unwelcoming."),C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((rt-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value);
        }
    } else if(C.field(eshkp,"eshk","robbed").value) {
        if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
            ;
            C.variadic(30,C.literal("%s mutters imprecations against shoplifters."),C.Shknam(shkp));
        } else {
            C.variadic(31,C.literal("%s is combing through %s inventory list."),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value));
        }
    } else {
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            C.set_voice(shkp,0,80,0);
            C.variadic(32,C.literal("%s, %s!  Welcome%s to %s %s!"),C.Hello(shkp),C.field(C.svp,"instance_globals_saved_p","plname").address,((()=>{const ref=C.field(eshkp,"eshk","visitct");const old=ref.value;ref.value=C.i32((old+1));return old;})()?C.literal(" again"):C.literal("")),C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((rt-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value);
        } else {
            C.variadic(33,C.literal("enter %s %s%s!"),C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((rt-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value,((()=>{const ref=C.field(eshkp,"eshk","visitct");const old=ref.value;ref.value=C.i32((old+1));return old;})()?C.literal(" again"):C.literal("")));
        }
    }
    /* can't do anything about blocking if teleported in */
    if(Number(!(inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))) {
        let should_block; let not_upset=C.i8(Number(!(C.field(eshkp,"eshk","surcharge").value)));
        let cnt;
        let tool;
        let pick=C.carrying(C.PICK_AXE); let mattock=C.carrying(C.DWARVISH_MATTOCK);
        if(Number(!!(pick||mattock))) {
            (cnt=1);
            /* so far */
            if(Number(!!(pick&&mattock))) {
                /* carrying both types */
                (tool=C.literal("digging tool"));
                (cnt=2);
                /* `more than 1' is all that matters */
            } else if(pick) {
                (tool=C.literal("pick-axe"));
                /* hack: `pick' already points somewhere into inventory */
                while(Number(((pick=C.field(pick,"obj","nobj").value))!=0)) if(Number(C.i32(C.field(pick,"obj","otyp").value)==C.PICK_AXE)) (()=>{const old=cnt;cnt=C.i32((old+1));return cnt;})();

            } else {
                /* assert(mattock != 0) */
                (tool=C.literal("mattock"));
                while(Number(((mattock=C.field(mattock,"obj","nobj").value))!=0)) if(Number(C.i32(C.field(mattock,"obj","otyp").value)==C.DWARVISH_MATTOCK)) (()=>{const old=cnt;cnt=C.i32((old+1));return cnt;})();

                /* [ALI] Shopkeeper identifies mattock(s) */
                if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) C.discover_object((C.DWARVISH_MATTOCK),(C.i8(1)),(C.i8(1)),(C.i8(1)));
            }
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(34,(C.i32(not_upset)?C.literal("Will you please leave your %s%s outside?"):C.literal("Leave the %s%s outside.")),tool,(((Number((cnt)==1))?C.literal(""):C.literal("s"))));
            } else {
                C.variadic(35,C.literal("%s %s to let you in with your %s%s."),C.Shknam(shkp),(C.i32(not_upset)?C.literal("is hesitant"):C.literal("refuses")),tool,(((Number((cnt)==1))?C.literal(""):C.literal("s"))));
            }
            (should_block=(C.i8(1)));
        } else if(C.field(C.u,"you","usteed").value) {
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(36,(C.i32(not_upset)?C.literal("Will you please leave %s outside?"):C.literal("Leave %s outside.")),C.y_monnam(C.field(C.u,"you","usteed").value));
            } else {
                C.variadic(37,C.literal("%s %s to let you in while you're riding %s."),C.Shknam(shkp),(C.i32(not_upset)?C.literal("doesn't want"):C.literal("refuses")),C.y_monnam(C.field(C.u,"you","usteed").value));
            }
            (should_block=(C.i8(1)));
        } else {
            (should_block=C.i8((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&(Number(!!(C.sobj_at(C.PICK_AXE,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)||C.sobj_at(C.DWARVISH_MATTOCK,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))))))));
        }
        if(should_block) C.dochug(shkp);
        /* shk gets extra move */
    }
    return;
}

/* called when removing a pick-axe or mattock from a container */
export function pick_pick(obj)
{
    obj=C.ptr(obj);
    let shkp;
    if(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)||Number(!((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_PICK_AXE))))))))) return;
    (shkp=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value));
    if(Number(!!(shkp&&inhishop(shkp)))) {
        
        /* if you bring a sack of N picks into a shop to sell,
           don't repeat this N times when they're taken out */
        if(Number(C.field(C.svm,"instance_globals_saved_m","moves").value!=C.cell(C.staticAddress("pick_pick.pickmovetime"),"long").value)) {
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(38,C.literal("You sneaky %s!  Get out of here with that pick!"),cad((C.i8(0))));
            } else {
                C.variadic(39,C.literal("%s %s your pick!"),C.Shknam(shkp),((Number((C.u64((C.field((C.field(shkp,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))?C.literal("glares at"):C.literal("is dismayed because of")));
            }
        }
        (C.cell(C.staticAddress("pick_pick.pickmovetime"),"long").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
    }
}

/*
   Decide whether two unpaid items are mergeable; caller is responsible for
   making sure they're unpaid and the same type of object; we check the price
   quoted by the shopkeeper and also that they both belong to the same shk.
 */
export function same_price(obj1,obj2)
{
    obj1=C.ptr(obj1);
    obj2=C.ptr(obj2);
    let shkp1; let shkp2;
    let bp1=0; let bp2=0;
    let are_mergable=(C.i8(0));
    /* look up the first object by finding shk whose bill it's on */
    for((shkp1=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp1;(shkp1=next_shkp(C.field(shkp1,"monst","nmon").value,(C.i8(1))))) if(Number(((bp1=onbill(obj1,shkp1,(C.i8(1)))))!=0)) break;

    /* second object is probably owned by same shk; if not, look harder */
    if(Number(!!(shkp1&&Number(((bp2=onbill(obj2,shkp1,(C.i8(1)))))!=0)))) {
        (shkp2=shkp1);
    } else {
        for((shkp2=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp2;(shkp2=next_shkp(C.field(shkp2,"monst","nmon").value,(C.i8(1))))) if(Number(((bp2=onbill(obj2,shkp2,(C.i8(1)))))!=0)) break;

    }
    if(Number(!!(Number(!(bp1))||Number(!(bp2))))) C.variadic(40,C.literal("same_price: object wasn't on any bill!"));
 else (are_mergable=C.i8((Number(!!(Number(shkp1==shkp2)&&Number(C.field(bp1,"bill_x","price").value==C.field(bp2,"bill_x","price").value))))));
    return are_mergable;
}

/*
 * Figure out how much is owed to a given shopkeeper.
 * At present, we ignore any amount robbed from the shop, to avoid
 * turning the `$' command into a way to discover that the current
 * level is bones data which has a shk on the warpath.
 */
export function shop_debt(eshkp)
{
    eshkp=C.ptr(eshkp);
    let bp;
    let ct;
    let debt=C.field(eshkp,"eshk","debit").value;
    for(((bp=C.field(eshkp,"eshk","bill_p").value),(ct=C.field(eshkp,"eshk","billct").value));Number(ct>0);((()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return old;})(),(()=>{const old=ct;ct=C.i32((old-1));return old;})())) (debt=C.i64(debt+C.i64((C.field(bp,"bill_x","price").value*C.field(bp,"bill_x","bquan").value))));

    return debt;
}

/* called in response to the `$' command */
export function shopper_financial_report()
{
    let shkp; let this_shkp=shop_keeper(inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
    let eshkp;
    let amt;
    let pass;
    (eshkp=(this_shkp?(C.field(C.field((this_shkp),"monst","mextra").value,"mextra","eshk").value):0));
    if(Number(!!(eshkp&&Number(!((Number(!!(C.field(eshkp,"eshk","credit").value||shop_debt(eshkp))))))))) {
        C.variadic(41,C.literal("have no credit or debt in here."));
        (this_shkp=0);
        /* skip first pass */
    }
    /* pass 0: report for the shop we're currently in, if any;
       pass 1: report for all other shops on this level. */
    for((pass=(this_shkp?0:1));Number(pass<=1);(()=>{const old=pass;pass=C.i32((old+1));return old;})()) for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(0))))) {
        if(C.i32(((Number(shkp!=this_shkp))^pass))) continue;
        (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
        if(Number(((amt=C.field(eshkp,"eshk","credit").value))!=C.i64(0))) C.variadic(42,C.literal("have %ld %s credit at %s %s."),amt,C.currency(amt),C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((C.field(eshkp,"eshk","shoptype").value-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value);
 else if(Number(shkp==this_shkp)) C.variadic(43,C.literal("have no credit in here."));
        if(Number(((amt=shop_debt(eshkp)))!=C.i64(0))) C.variadic(44,C.literal("owe %s %ld %s."),C.shkname(shkp),amt,C.currency(amt));
 else if(Number(shkp==this_shkp)) C.variadic(45,C.literal("don't owe any gold here."));
    }

}

/* 1: shopkeeper is currently in her shop or its boundary; 0: not */
export function inhishop(shkp)
{
    shkp=C.ptr(shkp);
    let shkrooms;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    if(Number(!(C.on_level(C.field(eshkp,"eshk","shoplevel").address,C.field(C.u,"you","uz").address)))) return C.i32((C.i8(0)));
    (shkrooms=C.in_rooms(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,C.SHOPBASE));
    return (Number(C.strchr(shkrooms,C.i32(C.field(eshkp,"eshk","shoproom").value))!=0));
}

/* return the shopkeeper for rooms[rmno-2]; returns Null if there isn't one */
export function shop_keeper(rmno)
{
    rmno=C.i8(rmno);
    let shkp;
    (shkp=((Number(C.i32(rmno)>=3))?C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(rmno)-3)))*C.sizes["struct mkroom"]),"mkroom","resident").value:0));
    if(shkp) {
        if((Number(!!(C.field((shkp),"monst","mextra").value&&(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value))))) {
            if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) {
                if(Number(!(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value))) rile_shk(shkp);
            }
        } else {
            /* would have segfaulted on ESHK dereference previously */
            C.variadic(46,C.literal("%s? (rmno=%d, rtype=%d, mnum=%d, \"%s\")"),(C.i32(C.field(shkp,"monst","isshk").value)?C.literal("shopkeeper career change"):C.literal("shop resident not shopkeeper")),C.i32(rmno),C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(C.i32((C.i32(rmno)-3)))*C.sizes["struct mkroom"]),"mkroom","rtype").value),C.i32(C.field(shkp,"monst","mnum").value),((Number(!!(C.field((shkp),"monst","mextra").value&&(C.field(C.field((shkp),"monst","mextra").value,"mextra","mgivenname").value))))?(C.field(C.field((shkp),"monst","mextra").value,"mextra","mgivenname").value):C.literal("anonymous")));
            /* [real shopkeeper name is kept in ESHK,
                          not MGIVENNAME] */
            /* not sure if this is appropriate, because it does nothing to
               correct the underlying svr.rooms[].resident issue but... */
            return 0;
        }
    }
    return shkp;
}

/* find the shopkeeper who owns 'obj'; needed to handle shared shop walls */
export function find_objowner(obj,x,y)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    /* caller passes obj's location since obj->ox,oy
                           * might be stale; don't update coordinates here
                           * because if we're called during sanity checking
                           * they shouldn't be modified */
    let shkp; let deflt_shkp=0;
    if(Number(C.i32(C.field(obj,"obj","where").value)==7)) {
        /* used up item; bill obj coordinates are useless and so are x,y */
        for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(1))))) if(onshopbill(obj,shkp,(C.i8(1)))) return shkp;

    } else {
        let roomindx; let where=C.in_rooms(x,y,C.SHOPBASE);
        /* conceptually object could be inside up to 4 rooms simultaneously;
           in practice it will usually be one room but can sometimes be two;
           check shk and bill for each room rather than just the first;
           fallback to the first shk if obj isn't on the relevant bill(s) */
        for((roomindx=where);C.cell(roomindx,"char").value;(()=>{const old=roomindx;roomindx=C.ptr((old+Number(1)));return roomindx;})()) if(Number(((shkp=shop_keeper(C.cell(roomindx,"char").value)))!=0)) {
            if(onshopbill(obj,shkp,(C.i8(1)))) return shkp;
            if(Number(!(deflt_shkp))) (deflt_shkp=shkp);
        }

    }
    return deflt_shkp;
}

export function tended_shop(sroom)
{
    sroom=C.ptr(sroom);
    let mtmp=C.field(sroom,"mkroom","resident").value;
    return C.i8((Number(!(mtmp))?C.i32((C.i8(0))):C.i32(C.i8(inhishop(mtmp)))));
}

export function noisy_shop(sroom)
{
    sroom=C.ptr(sroom);
    let mtmp=C.field(sroom,"mkroom","resident").value;
    if(Number(!!(mtmp&&inhishop(mtmp)))) {
        C.wake_nearto(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.i32((11*11)));
    }
}

export function onbill(obj,shkp,silent)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    silent=C.i8(silent);
    if(shkp) {
        let bp;
        let ct;
        for(((ct=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value),(bp=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value));Number(ct>0);((()=>{const old=ct;ct=C.i32((old-1));return ct;})(),(()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return bp;})())) {
            if(Number(C.field(bp,"bill_x","bo_id").value==C.field(obj,"obj","o_id").value)) {
                if(Number(!(C.field(obj,"obj","unpaid").value))) C.variadic(47,C.literal("onbill: paid obj on bill?"));
                return bp;
            }
        }
    }
    if(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)&&Number(!(silent))))) C.variadic(48,C.literal("onbill: unpaid obj %s?"),(Number(!(shkp))?C.literal("without shopkeeper"):C.literal("not on shk's bill")));
    return 0;
}

/* used outside of shk.c when caller wants to know whether item is on bill
   but doesn't need to know any details about the bill itself */
export function onshopbill(obj,shkp,silent)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    silent=C.i8(silent);
    return C.i8((onbill(obj,shkp,silent)?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/* check whether an object or any of its contents belongs to a shop */
export function is_unpaid(obj)
{
    obj=C.ptr(obj);
    return C.i8((Number(!!(C.i32(C.field(obj,"obj","unpaid").value)||(Number(!!((Number(C.field((obj),"obj","cobj").value!=0))&&C.count_unpaid(C.field(obj,"obj","cobj").value))))))));
}

/* Delete the contents of the given object. */
export function delete_contents(obj)
{
    obj=C.ptr(obj);
    let curr;
    while(Number(((curr=C.field(obj,"obj","cobj").value))!=0)) {
        C.obj_extract_self(curr);
        obfree(curr,0);
    }
}

/* called with two args on merge */
export function obfree(obj,merge)
{
    obj=C.ptr(obj);
    merge=C.ptr(merge);
    let bp;
    let bpm;
    let shkp;
    if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)&&C.field(obj,"obj","corpsenm").value))) C.o_unleash(obj);
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.FOOD_CLASS)) C.food_disappears(obj);
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.SPBOOK_CLASS)) C.book_disappears(obj);
    if((Number(C.field((obj),"obj","cobj").value!=0))) delete_contents(obj);
    if((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) C.maybe_reset_pick(obj);
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)) (C.field(obj,"obj","corpsenm").value=0);
    (shkp=0);
    if(C.field(obj,"obj","unpaid").value) {
        /* look for a shopkeeper who owns this object */
        for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(1))))) if(onbill(obj,shkp,(C.i8(1)))) break;

    }
    /* sanity check, in case obj is on bill but not marked 'unpaid' */
    if(Number(!(shkp))) (shkp=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value));
    /*
     * Note:  `shkp = shop_keeper(*u.ushops)' used to be
     *    unconditional.  But obfree() is used all over
     *    the place, so making its behavior be dependent
     *    upon player location doesn't make much sense.
     */
    if(Number(((bp=onbill(obj,shkp,(C.i8(0)))))!=0)) {
        if(Number(!(merge))) {
            (C.field(bp,"bill_x","useup").value=(C.i8(1)));
            (C.field(obj,"obj","unpaid").value=C.u32(0));
            /* only for doinvbill */
            /* for used up glob, put back original weight in case it gets
               formatted ('I x' or itemized billing) with 'wizweight' On */
            if(Number(!!(Number(!!(C.i32(C.field(obj,"obj","globby").value)&&Number(!(C.field(obj,"obj","owt").value))))&&(Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omid").value))))))) (C.field(obj,"obj","owt").value=(C.field(C.field((obj),"obj","oextra").value,"oextra","omid").value));
            add_to_billobjs(obj);
            return;
        }
        (bpm=onbill(merge,shkp,(C.i8(0))));
        if(Number(!(bpm))) {
            /* this used to be a rename */
            /* !merge already returned */
            C.variadic(49,C.literal("obfree: not on bill, %s = (%d,%d,%ld,%d) (%d,%d,%ld,%d)?"),C.literal("otyp,where,quan,unpaid"),C.i32(C.field(obj,"obj","otyp").value),C.i32(C.field(obj,"obj","where").value),C.field(obj,"obj","quan").value,(C.i32(C.field(obj,"obj","unpaid").value)?1:0),C.i32(C.field(merge,"obj","otyp").value),C.i32(C.field(merge,"obj","where").value),C.field(merge,"obj","quan").value,(C.i32(C.field(merge,"obj","unpaid").value)?1:0));
            return;
        } else {
            let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
            /* this was a merger */
            (C.field(bpm,"bill_x","bquan").value=C.i64(C.field(bpm,"bill_x","bquan").value+C.field(bp,"bill_x","bquan").value));
            (()=>{const ref=C.field(eshkp,"eshk","billct");const old=ref.value;ref.value=C.i32((old-1));return old;})();
            C.copy(bp,(C.field(eshkp,"eshk","bill_p").value+Number(C.field(eshkp,"eshk","billct").value)*C.sizes["struct bill_x"]),C.sizes["struct bill_x"]);
        }
    } else {
        /* not on bill; if the item is being merged away rather than
           just deleted and has a higher price adjustment than the stack
           being merged into, give the latter the former's obj->o_id so
           that the merged stack takes on higher price; matters if hero
           eventually buys them from a shop, but doesn't matter if hero
           owns them and intends to sell (unless he subsequently buys
           them back) or if no shopping activity ever involves them */
        if(Number(!!(merge&&(Number(oid_price_adjustment(obj,C.field(obj,"obj","o_id").value)>oid_price_adjustment(merge,C.field(merge,"obj","o_id").value)))))) (C.field(merge,"obj","o_id").value=C.field(obj,"obj","o_id").value);
    }
    if(C.field(obj,"obj","owornmask").value) {
        C.variadic(50,C.literal("obfree: deleting worn obj (%d: %ld)"),C.i32(C.field(obj,"obj","otyp").value),C.field(obj,"obj","owornmask").value);
        /* unfortunately at this point we don't know whether worn mask
           applied to hero or a monster or perhaps something bogus, so
           can't call remove_worn_item() to get <X>_off() side-effects */
        C.setnotworn(obj);
    }
    C.dealloc_obj(obj);
}

export function check_credit(tmp,shkp)
{
    tmp=C.i64(tmp);
    shkp=C.ptr(shkp);
    let credit=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value;
    if(Number(credit==0n)) {
        ;
        /* nothing to do; just 'return tmp;' */
    } else if(Number(credit>=tmp)) {
        C.variadic(51,C.literal("price is deducted from your credit."));
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value=C.i64(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value-tmp));
        (tmp=0n);
    } else {
        C.variadic(52,C.literal("price is partially covered by your credit."));
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value=0n);
        (tmp=C.i64(tmp-credit));
    }
    return tmp;
}

export function pay(tmp,shkp)
{
    tmp=C.i64(tmp);
    shkp=C.ptr(shkp);
    let robbed=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value;
    let balance=(((Number(tmp<=0n))?tmp:check_credit(tmp,shkp)));
    if(Number(balance>C.i64(0))) money2mon(shkp,balance);
 else if(Number(balance<C.i64(0))) money2u(shkp,C.i64((-balance)));
    (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
    if(robbed) {
        (robbed=C.i64(robbed-tmp));
        if(Number(robbed<C.i64(0))) (robbed=0n);
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value=robbed);
    }
}

/* return shkp to home position */
export function home_shk(shkp,killkops)
{
    shkp=C.ptr(shkp);
    killkops=C.i8(killkops);
    let x=C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value; let y=C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value;
    C.mnearto(shkp,x,y,(C.i8(1)),C.u32(4));
    (C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_shop").value=C.u32(1));
    if(killkops) {
        kops_gone((C.i8(1)));
        C.pacify_guards();
    }
    after_shk_move(shkp);
}

export function angry_shk_exists()
{
    let shkp;
    for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(0))))) if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) return (C.i8(1));

    return (C.i8(0));
}

/* remove previously applied surcharge from all billed items */
export function pacify_shk(shkp,clear_surcharge)
{
    shkp=C.ptr(shkp);
    clear_surcharge=C.i8(clear_surcharge);
    ((C.field((shkp),"monst","mpeaceful").value)=C.u32((C.i8(1))));
    /* make peaceful */
    if(Number(!!(C.i32(clear_surcharge)&&C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value)))) {
        let bp=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value;
        let ct=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value;
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value=(C.i8(0)));
        while(Number((()=>{const old=ct;ct=C.i32((old-1));return old;})()>0)) {
            let reduction=C.i64(((C.i64((C.field(bp,"bill_x","price").value+3n)))/4n));
            (C.field(bp,"bill_x","price").value=C.i64(C.field(bp,"bill_x","price").value-reduction));
            /* undo 33% increase */
            (()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return old;})();
        }
    }
}

/* add aggravation surcharge to all billed items */
export function rile_shk(shkp)
{
    shkp=C.ptr(shkp);
    ((C.field((shkp),"monst","mpeaceful").value)=C.u32((C.i8(0))));
    /* make angry */
    if(Number(!(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value))) {
        let surcharge;
        let bp=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value;
        let ct=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value;
        (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value=(C.i8(1)));
        while(Number((()=>{const old=ct;ct=C.i32((old-1));return old;})()>0)) {
            (surcharge=C.i64(((C.i64((C.field(bp,"bill_x","price").value+2n)))/3n)));
            (C.field(bp,"bill_x","price").value=C.i64(C.field(bp,"bill_x","price").value+surcharge));
            (()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return old;})();
        }
    }
}

/* wakeup and/or unparalyze shopkeeper */
export function rouse_shk(shkp,verbosely)
{
    shkp=C.ptr(shkp);
    verbosely=C.i8(verbosely);
    if((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))) {
        /* greed induced recovery... */
        if(Number(!!(C.i32(verbosely)&&(Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))))) C.variadic(53,C.literal("%s %s."),C.Shknam(shkp),(C.i32(C.field(shkp,"monst","msleeping").value)?C.literal("wakes up"):C.literal("can move again")));
        (C.field(shkp,"monst","msleeping").value=C.u32(0));
        (C.field(shkp,"monst","mfrozen").value=C.u32(0));
        (C.field(shkp,"monst","mcanmove").value=C.u32(1));
    }
}

export function make_happy_shk(shkp,silentkops)
{
    shkp=C.ptr(shkp);
    silentkops=C.i8(silentkops);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["make_happy_shk.shk_nam@46747",(1*256)]]);
    try {
    let wasmad=C.i8((Number(!((C.field((shkp),"monst","mpeaceful").value)))));
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    pacify_shk(shkp,(C.i8(0)));
    (C.field(eshkp,"eshk","following").value=C.i8(0));
    (C.field(eshkp,"eshk","robbed").value=0n);
    if(Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_ROGUE)))))) C.adjalign(C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)));
    if(Number(!(inhishop(shkp)))) {
        let shk_nam=C.automatic("make_happy_shk.shk_nam@46747",(1*256));
        let vanished=C.i8(C.canseemon(shkp));
        C.strcpy(shk_nam,C.shkname(shkp));
        if(C.on_level(C.field(eshkp,"eshk","shoplevel").address,C.field(C.u,"you","uz").address)) {
            home_shk(shkp,(C.i8(0)));
            if((Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))) {
                C.variadic(54,C.literal("%s returns to %s shop."),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value));
                (vanished=(C.i8(0)));
                /* don't give 'Shk disappears' message */
            }
        } else {
            /* if sensed, does disappear regardless whether seen */
            if(C.sensemon(shkp)) (vanished=(C.i8(1)));
            /* can't act as porter for the Amulet, even if shk
               happens to be going farther down rather than up */
            C.mdrop_special_objs(shkp);
            /* arrive near shop's door */
            C.migrate_to_level(shkp,C.ledger_no(C.field(eshkp,"eshk","shoplevel").address),C.i16(1),C.field(eshkp,"eshk","shd").address);
            /* dismiss kops on that level when shk arrives */
            (C.field(eshkp,"eshk","dismiss_kops").value=(C.i8(1)));
        }
        if(vanished) C.variadic(55,C.literal("Satisfied, %s suddenly disappears!"),shk_nam);
    } else if(wasmad) C.variadic(56,C.literal("%s calms down."),C.Shknam(shkp));
    make_happy_shoppers(silentkops);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* called by make_happy_shk() and also by losedogs() for migrating shk */
export function make_happy_shoppers(silentkops)
{
    silentkops=C.i8(silentkops);
    if(Number(!(angry_shk_exists()))) {
        kops_gone(silentkops);
        C.pacify_guards();
    }
}

export function hot_pursuit(shkp)
{
    shkp=C.ptr(shkp);
    if(Number(!(C.field(shkp,"monst","isshk").value))) return;
    rile_shk(shkp);
    C.strncpy(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32));
    (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","following").value=C.i8(1));
    /* shopkeeper networking:  clear obj->no_charge for all obj on the
       floor of this level (including inside containers on floor), even
       those that are in other shopkeepers' shops */
    clear_no_charge((0),C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);
    clear_no_charge_pets(shkp);
}

/* Used when the shkp is teleported or falls (ox == 0) out of his shop, or
   when the player is not on a costly_spot and he damages something inside
   the shop.  These conditions must be checked by the calling function. */
/*ARGSUSED*/
export function make_angry_shk(shkp,ox,oy)
{
    shkp=C.ptr(shkp);
    ox=C.i16(ox);
    oy=C.i16(oy);
    /* <ox,oy> predate 'noit_Monnam()', let alone Shknam() */
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    /* all pending shop transactions are now "past due" */
    if(Number(!!(Number(!!(Number(!!(C.field(eshkp,"eshk","billct").value||C.field(eshkp,"eshk","debit").value))||C.field(eshkp,"eshk","loan").value))||C.field(eshkp,"eshk","credit").value))) {
        (C.field(eshkp,"eshk","robbed").value=C.i64(C.field(eshkp,"eshk","robbed").value+(C.i64((C.i64((addupbill(shkp)+C.field(eshkp,"eshk","debit").value))+C.field(eshkp,"eshk","loan").value)))));
        (C.field(eshkp,"eshk","robbed").value=C.i64(C.field(eshkp,"eshk","robbed").value-C.field(eshkp,"eshk","credit").value));
        if(Number(C.field(eshkp,"eshk","robbed").value<0n)) (C.field(eshkp,"eshk","robbed").value=0n);
        /* billct, debit, loan, and credit will be cleared by setpaid */
        setpaid(shkp);
    }
    C.variadic(57,C.literal("%s %s!"),C.Shknam(shkp),(Number(!((Number(!((C.field((shkp),"monst","mpeaceful").value))))))?C.literal("gets angry"):C.literal("is furious")));
    hot_pursuit(shkp);
}

/* if one item is used-up and the other isn't, the used-up one comes first;
   otherwise, if their costs differ, the more expensive one comes first;
   if costs are the same, use internal index as tie-breaker for stable sort */
export function sortbill_cmp(vptr1,vptr2)
{
    vptr1=C.ptr(vptr1);
    vptr2=C.ptr(vptr2);
    let sbi1=vptr1; let sbi2=vptr2;
    let cost1=C.field(sbi1,"sortbill_item","cost").value; let cost2=C.field(sbi2,"sortbill_item","cost").value;
    let bidx1=C.field(sbi1,"sortbill_item","bidx").value; let bidx2=C.field(sbi2,"sortbill_item","bidx").value; let used1=Number(C.i32(C.field(sbi1,"sortbill_item","usedup").value)<=C.PartlyUsedUp); let used2=Number(C.i32(C.field(sbi2,"sortbill_item","usedup").value)<=C.PartlyUsedUp);
    /* sort such that FullyUsedUp and PartlyUsedUp come before
            PartlyIntact, FullyIntact, KnownContainer, UndisclosedContainer */
    /* 0=>unpaid, 1=>used */
    if(Number(used1!=used2)) return (C.i32((used2-used1)));
    /* bigger comes before smaller here */
    if(Number(cost1!=cost2)) return C.i32((C.i64((cost2-cost1))));
    /* bigger comes before smaller here too */
    /* index into eshkp->bill_p[] isn't unique (an item that is partly
       used and partly intact will have two ibill[] entries indexing same
       bill_p[] element) but duplicates won't reach here (used1 vs used2) */
    return (C.i32((bidx1-bidx2)));
}

/* delivers the cheapest item on the list */
export function cheapest_item(ibillct,ibill)
{
    ibillct=C.i32(ibillct);
    ibill=C.ptr(ibill);
    let i;
    let gmin=C.field((ibill+Number(0)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value;
    /*
     * 5.0: old version didn't determine cheapest item correctly if it
     * was either the partly used or partly intact portion of a partially
     * used stack.  Rather than modify it to use bp_to_obj() in order to
     * obtain quanities for every entry on eshkp->bill_p[], switch to
     * ibill[] which has already split such items into separate entries.
     */
    for((i=1);Number(i<ibillct);(()=>{const old=i;i=C.i32((old+1));return i;})()) if(Number(C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value<gmin)) (gmin=C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value);

    return gmin;
}

/* for itemized purchasing, create an alternate shop bill that hides
   container contents */
export function make_itemized_bill(shkp,ibill_p)
{
    shkp=C.ptr(shkp);
    ibill_p=C.ptr(ibill_p);
    /* returns number of entries */
    /* output, augmented bill similar to a 'sortloot array' */
    
    /* Null sortbill item */
    let ibill;
    let bp;
    let otmp;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    let i; let n; let bidx; let ebillct=C.field(eshkp,"eshk","billct").value;
    let used;
    let quan; let cost;
    /* this overallocates unless there happens to be a used-up portion
       and an intact potion for every object on the bill; doing it this
       way avoids the need to look up every object on the bill an extra
       time; (the +1 for a terminator isn't actually needed) */
    (n=C.i32((C.i32((2*ebillct))+1)));
    (ibill=(C.cell(ibill_p,"struct sortbill_item *").value=C.alloc(C.u32(C.u64((C.u64(n)*BigInt(C.sizes["struct sortbill_item"])))))));
    for((i=0);Number(i<n);(()=>{const old=i;i=C.i32((old+1));return i;})()) C.copy((ibill+Number(i)*C.sizes["struct sortbill_item"]),C.staticAddress("make_itemized_bill.zerosbi"),C.sizes["struct sortbill_item"]);

    (n=0);
    /* number of entries in ibill[]; won't necessary match ebillct */
    for((i=0);Number(i<ebillct);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        (bp=(C.field(eshkp,"eshk","bill_p").value+Number(i)*C.sizes["struct bill_x"]));
        /* find the object on the bill */
        (otmp=bp_to_obj(bp));
        if(Number(!(otmp))) {
            C.variadic(58,C.literal("Can't find shop bill entry for #%d"),C.field(bp,"bill_x","bo_id").value);
            continue;
        }
        (bidx=i);
        /* index into bill_p[], except for hero-owner container */
        if(Number(!!(Number(C.field(otmp,"obj","quan").value==0n)||Number(C.i32(C.field(otmp,"obj","where").value)==7)))) {
            /* item is completely used up; restore quantity from when it
               was first unpaid; otmp is on billobjs list where it can
               only be seen via Ix and itemized billing while paying shk */
            (C.field(otmp,"obj","quan").value=C.field(bp,"bill_x","bquan").value);
            (C.field(bp,"bill_x","useup").value=(C.i8(1)));
            /* (expected to be set already) */
        } else if(Number(C.field(otmp,"obj","quan").value<C.field(bp,"bill_x","bquan").value)) {
            /* item is partly used up; we will create two entries in the
               augmented bill: one for the used up part here, another for
               the intact part (which might be inside a container if put in
               after using part of a stack; used up part isn't) below */
            (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value=otmp);
            (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","quan").value=C.i64((C.field(bp,"bill_x","bquan").value-C.field(otmp,"obj","quan").value)));
            (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value=C.i64((C.field(bp,"bill_x","price").value*C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","quan").value)));
            (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","bidx").value=bidx);
            /* duplicate index into eshkp->bill_p[] */
            (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value=C.i8(C.PartlyUsedUp));
            /* for sorting */
            (()=>{const old=n;n=C.i32((old+1));return n;})();
            /* intact portion will be a separate entry, next */
        }
        if(Number(C.i32(C.field(otmp,"obj","where").value)==7)) {
            /* completely used up */
            (quan=C.field(bp,"bill_x","bquan").value);
            (cost=C.i64((C.field(bp,"bill_x","price").value*quan)));
            (used=C.i8(C.FullyUsedUp));
        } else if(Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)==2)||(Number(C.field((otmp),"obj","cobj").value!=0))))) {
            let j;
            let item=otmp;
            let cknown=(C.i8(1));
            /* assume container contents are known */
            /* when it's in a container, put the container rather than the
               specific object into ibill[]; find outermost container */
            while(Number(C.i32(C.field(otmp,"obj","where").value)==2)) {
                (otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_ocontainer").value);
                if(Number(!(C.field(otmp,"obj","cknown").value))) (cknown=(C.i8(0)));
            }
            /* this container might already be in ibill[] if it is unpaid
               itself or if it holds more than one unpaid item and another
               besides this one has already been processed; only include
               first instance */
            for((j=0);Number(j<n);(()=>{const old=j;j=C.i32((old+1));return j;})()) if(Number(otmp==C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value)) break;

            if(Number(j<n)) {
                /* when already on bill as FullyIntact, update; the cost
                   saved in ibill[j] is based on the container even if the
                   entry was initially created for an item of its contents */
                if(Number(C.i32(C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)==C.FullyIntact)) (C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value=C.i8((C.i32(cknown)?C.KnownContainer:C.UndisclosedContainer)));
                continue;
                /* 'i' loop */
            }
            /* include 1 container containing unpaid item(s) */
            (quan=1n);
            (cost=unpaid_cost(otmp,C.u8(C.COST_CONTENTS)));
            if(Number(!(C.field(otmp,"obj","unpaid").value))) (bidx=C.i32((-1)));
            /* an unpaid container without any unpaid contents is classified
               as 'FullyIntact'; a container with unpaid contents will be
               '*Container' regardless of whether it is unpaid itself */
            (used=C.i8(((Number(otmp==item))?C.FullyIntact:(C.i32(cknown)?C.KnownContainer:C.UndisclosedContainer))));
        } else {
            /* ordinary unpaid; when partly used, these are values for the
               intact portion; might be an empty shop-owned container */
            (quan=C.field(otmp,"obj","quan").value);
            (cost=C.i64((C.field(bp,"bill_x","price").value*quan)));
            (used=C.i8(((Number(quan<C.field(bp,"bill_x","bquan").value))?C.PartlyIntact:C.FullyIntact)));
        }
        (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value=otmp);
        (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","quan").value=quan);
        (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value=cost);
        (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","bidx").value=bidx);
        (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value=used);
        (()=>{const old=n;n=C.i32((old+1));return n;})();
    }
    (C.field((ibill+Number(n)*C.sizes["struct sortbill_item"]),"sortbill_item","bidx").value=C.i32((-1)));
    /* end of list; not strictly needed */
    /* ibill[0..n-1] contains data, ibill[n] has Null obj and -1 bidx and
       is excluded from the sort */
    if(Number(n>1)) C.nh_deterministic_qsort((ibill),C.u64((n)),(BigInt(C.sizes["struct sortbill_item"])),(C.functionAddress("sortbill_cmp")));
    return n;
}

/* show items on your bill in a menu, and ask which to pay.
   returns the number of entries selected. */
export function menu_pick_pay_items(ibillct,ibill)
{
    ibillct=C.i32(ibillct);
    ibill=C.ptr(ibill);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["menu_pick_pay_items.any@57265",C.sizes["union any"]],["menu_pick_pay_items.pick_list@57285",8],["menu_pick_pay_items.buf@57327",(1*256)]]);
    try {
    /* number of entries in ibill[] */
    /* all used up items, if any, precede all intact items */
    let otmp;
    let win;
    let any=C.automatic("menu_pick_pay_items.any@57265",C.sizes["union any"]);
    let pick_list=C.local("menu_pick_pay_items.pick_list@57285","struct mi *",0);
    let p; let buf=C.automatic("menu_pick_pay_items.buf@57327",(1*256));
    let amt; let largest_amt; let save_quan;
    let i; let j; let n; let amt_width;
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (win=C.callback(0,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(1,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    /* we go through ibill[] twice, first time to control price formatting
       during the second */
    (largest_amt=0n);
    for((i=0);Number(i<ibillct);(()=>{const old=i;i=C.i32((old+1));return i;})()) if(Number(C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value>largest_amt)) (largest_amt=C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value);

    C.variadic(59,buf,C.literal("%ld"),largest_amt);
    (amt_width=C.i32(C.strlen(buf)));
    /* show the "used up items" header if there are any used up items on
       the bill, no matter whether there are also any intact items;
       note: ibill[] has been sorted to hold used-up items first */
    if(Number(C.i32(C.field((ibill+Number(0)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)<=C.PartlyUsedUp)) {
        C.variadic(60,buf,C.literal("Used up item%s:"),((Number(!!(Number(ibillct>1)&&Number(C.i32(C.field((ibill+Number(1)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)<=C.PartlyUsedUp))))?C.literal("s"):C.literal("")));
        C.add_menu_heading(win,buf);
    }
    for((i=0);Number(i<ibillct);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        /* the "unpaid items" header is only shown if the "used up items"
           one was shown before the first menu entry */
        if(Number(!!(Number(!!(Number(i>0)&&Number(C.i32(C.field((ibill+Number(C.i32((i-1)))*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)<=C.PartlyUsedUp)))&&Number(C.i32(C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)>=C.PartlyIntact)))) {
            C.variadic(61,buf,C.literal("Unpaid item%s:"),((Number(i<C.i32((ibillct-1))))?C.literal("s"):C.literal("")));
            C.add_menu_heading(win,buf);
        }
        (otmp=C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value);
        (save_quan=C.field(otmp,"obj","quan").value);
        (C.field(otmp,"obj","quan").value=C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","quan").value);
        /* in case it's partly used */
        (p=C.paydoname(otmp));
        (C.field(otmp,"obj","quan").value=save_quan);
        (amt=C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value);
        /* this doesn't support hallucinatory currency because shopkeeper
           isn't hallucinating; also, that would mess up the alignment */
        C.variadic(62,(C.literal("menu_pick_pay_items")),1717,buf,BigInt((1*256)),C.literal("%*ld Zm, %s"),amt_width,amt,p);
        (C.field(any,"any","a_int").value=C.i32((i+1)));
        /* +1: avoid 0 */
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,8,buf,0);
    }
    C.callback(2,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Pay for which items?"));
    (n=C.select_menu(win,2,pick_list.address));
    C.callback(3,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    for((j=0);Number(j<n);(()=>{const old=j;j=C.i32((old+1));return j;})()) {
        /*
         * FIXME:
         *  The menu will accept a subset count for each entry but buying
         *  doesn't have any support for that.
         */
        (i=C.i32((C.field(C.field((pick_list.value+Number(j)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        /* -1: reverse +1 above */
        (C.field((ibill+Number(i)*C.sizes["struct sortbill_item"]),"sortbill_item","queuedpay").value=(C.i8(1)));
    }
    C.free(pick_list.value);
    /* for ESC, return 0 instead of usual -1 */
    return ((Number((n)>(0))?(n):(0)));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* the #pay command */
export function dopay()
{
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["dopay.ibill@59882",8],["dopay.paid@59991",1],["dopay.cc@61746",C.sizes["struct nhcoord"]],["dopay.sbuf@66837",(1*256)]]);
    try {
    let eshkp;
    let shkp;
    let nxtm; let resident;
    let ibill=C.local("dopay.ibill@59882","struct sortbill_item *",(0));
    let ltmp;
    let umoney;
    let sk=0; let seensk=0; let nexttosk=0;
    let paid=C.local("dopay.paid@59991","signed char",(C.i8(0))); let stashed_gold=C.i8((Number(C.hidden_gold((C.i8(1)))>0n))); let pay_done;
    proceed: {
    (C.field(C.gm,"instance_globals_m","multi").value=C.i64(0));
    /* Find how many shk's there are, how many are in
     * sight, and are you in a shop room with one.
     */
    (nxtm=(resident=0));
    for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(0))))) {
        (()=>{const old=sk;sk=C.i32((old+1));return old;})();
        if((Number(C.dist2((C.field((shkp),"monst","mx").value),(C.field((shkp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))) {
            /* next to an irate shopkeeper? prioritize that */
            if(Number(!!(nxtm&&(Number(!((C.field((nxtm),"monst","mpeaceful").value))))))) continue;
            (()=>{const old=nexttosk;nexttosk=C.i32((old+1));return old;})();
            (nxtm=shkp);
        }
        if((Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))) (()=>{const old=seensk;seensk=C.i32((old+1));return old;})();
        if(Number(!!(inhishop(shkp)&&(Number(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)==C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value)))))) (resident=shkp);
    }
    if(Number(!!(nxtm&&Number(nexttosk==1)))) {
        (shkp=nxtm);
        break proceed; /* original goto */
    }
    if(Number(!!((Number(!!(Number(!(sk))&&(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPAT)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))))||(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&Number(!(seensk)))))))) {
        C.variadic(63,C.literal("appears to be no shopkeeper here to receive your payment."));
        return 0;
    }
    if(Number(!(seensk))) {
        C.variadic(64,C.literal("see..."));
        return 0;
    }
    /* The usual case.  Allow paying at a distance when
     * inside a tended shop.  Should we change that?
     */
    if(Number(!!(Number(sk==1)&&resident))) {
        (shkp=resident);
        break proceed; /* original goto */
    }
    if(Number(seensk==1)) {
        for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(0))))) if((Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))) break;

        ((Number(!!((Number(shkp!=(0)))||((C.__assert_fail(C.literal("shkp != NULL"),C.literal("shk.c"),1805,(C.literal("dopay"))),0))))));
        /* seensk==1 =>  traversal will spot one shk */
        if(Number(!!(Number(shkp!=resident)&&Number(!((Number(C.dist2((C.field((shkp),"monst","mx").value),(C.field((shkp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))))) {
            C.variadic(65,C.literal("%s is not near enough to receive your payment."),C.Shknam(shkp));
            return 0;
        }
    } else {
        let mtmp;
        let cc=C.automatic("dopay.cc@61746",C.sizes["struct nhcoord"]);
        let cx; let cy;
        C.variadic(66,C.literal("Pay whom?"));
        (C.field(cc,"nhcoord","x").value=C.field(C.u,"you","ux").value);
        (C.field(cc,"nhcoord","y").value=C.field(C.u,"you","uy").value);
        if(Number(C.getpos(cc,(C.i8(1)),C.literal("the creature you want to pay"))<0)) return 2;
        /* player pressed ESC */
        (cx=C.i32(C.field(cc,"nhcoord","x").value));
        (cy=C.i32(C.field(cc,"nhcoord","y").value));
        if(Number(cx<0)) {
            C.variadic(67,C.literal("Try again..."));
            return 0;
        }
        if((Number(!!(Number((cx)==C.i32(C.field(C.u,"you","ux").value))&&Number((cy)==C.i32(C.field(C.u,"you","uy").value)))))) {
            C.variadic(68,C.literal("are generous to yourself."));
            return 0;
        }
        (mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(cx)*(8*21))+Number(cy)*8),"struct monst *").value));
        if(Number(!!(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(cy)*8),"unsigned char *").value+Number(cx)*1),"unsigned char").value)&2)))!=0))))&&(Number(!!(Number(!(mtmp))||Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp)))))))))))) {
            C.variadic(69,C.literal("can't %s anyone there."),(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))?C.literal("see"):C.literal("sense")));
            return 0;
        }
        if(Number(!(mtmp))) {
            C.variadic(70,C.literal("is no one there to receive your payment."));
            return 0;
        }
        if(Number(!(C.field(mtmp,"monst","isshk").value))) {
            C.variadic(71,C.literal("%s is not interested in your payment."),C.Monnam(mtmp));
            return 0;
        }
        if(Number(!!(Number(mtmp!=resident)&&Number(!((Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))))) {
            C.variadic(72,C.literal("%s is too far to receive your payment."),C.Shknam(mtmp));
            return 0;
        }
        (shkp=mtmp);
    }
    if(Number(!(shkp))) {
        do {
            if(C.debugcore(C.literal("shk.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(73,C.literal("dopay: null shkp."));
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
        return 0;
    }
    } /* source proceed: */
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    (ltmp=C.field(eshkp,"eshk","robbed").value);
    /* wake sleeping shk when someone who owes money offers payment */
    if(Number(!!(Number(!!(ltmp||C.field(eshkp,"eshk","billct").value))||C.field(eshkp,"eshk","debit").value))) rouse_shk(shkp,(C.i8(1)));
    if((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))) {
        /* still asleep/paralyzed */
        C.variadic(74,C.literal("%s %s."),C.Shknam(shkp),(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),1865,(C.literal("dopay"))),C.rn2(2))):C.rn2(2)))?C.literal("seems to be napping"):C.literal("doesn't respond")));
        return 0;
    }
    if(Number(!!(Number(shkp!=resident)&&C.i32((C.field((shkp),"monst","mpeaceful").value))))) {
        (umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value));
        if(Number(!(ltmp))) {
            C.variadic(75,C.literal("do not owe %s anything."),C.shkname(shkp));
        } else if(Number(!(umoney))) {
            C.variadic(76,C.literal("%shave no gold."),(C.i32(stashed_gold)?C.literal("seem to "):C.literal("")));
            if(stashed_gold) C.variadic(77,C.literal("But you have some gold stashed away."));
        } else {
            if(Number(umoney>ltmp)) {
                C.variadic(78,C.literal("give %s the %ld gold piece%s %s asked for."),C.shkname(shkp),ltmp,(((Number((ltmp)==C.i64(1)))?C.literal(""):C.literal("s"))),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","he").value));
                pay(ltmp,shkp);
            } else {
                C.variadic(79,C.literal("give %s all your%s gold."),C.shkname(shkp),(C.i32(stashed_gold)?C.literal(" openly kept"):C.literal("")));
                pay(umoney,shkp);
                if(stashed_gold) C.variadic(80,C.literal("But you have hidden gold!"));
            }
            if(Number(!!((Number(umoney<C.i64((ltmp/2n))))||(Number(!!(Number(umoney<ltmp)&&C.i32(stashed_gold))))))) C.variadic(81,C.literal("Unfortunately, %s doesn't look satisfied."),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","he").value));
 else make_happy_shk(shkp,(C.i8(0)));
        }
        return 1;
    }
    /* ltmp is still eshkp->robbed here */
    if(Number(!!(Number(!(C.field(eshkp,"eshk","billct").value))&&Number(!(C.field(eshkp,"eshk","debit").value))))) {
        (umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value));
        if(Number(!!(Number(!(ltmp))&&C.i32((C.field((shkp),"monst","mpeaceful").value))))) {
            C.variadic(82,C.literal("do not owe %s anything."),C.shkname(shkp));
            if(Number(!(umoney))) C.variadic(83,C.staticAddress("no_money"),(C.i32(stashed_gold)?C.literal(" seem to"):C.literal("")));
        } else if(ltmp) {
            C.variadic(84,C.literal("%s is after blood, not gold!"),C.shkname(shkp));
            if(Number(!!(Number(umoney<C.i64((ltmp/2n)))||(Number(!!(Number(umoney<ltmp)&&C.i32(stashed_gold))))))) {
                if(Number(!(umoney))) C.variadic(85,C.staticAddress("no_money"),(C.i32(stashed_gold)?C.literal(" seem to"):C.literal("")));
 else C.variadic(86,C.staticAddress("not_enough_money"),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","him").value));
                return 1;
            }
            C.variadic(87,C.literal("But since %s shop has been robbed recently,"),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value));
            C.variadic(88,C.literal("you %scompensate %s for %s losses."),((Number(umoney<ltmp))?C.literal("partially "):C.literal("")),C.shkname(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value));
            pay((Number(umoney<ltmp)?umoney:ltmp),shkp);
            make_happy_shk(shkp,(C.i8(0)));
        } else {
            /* shopkeeper is angry, but has not been robbed --
             * door broken, attacked, etc. */
            C.variadic(89,C.literal("%s is after your hide, not your gold!"),C.Shknam(shkp));
            if(Number(umoney<1000n)) {
                if(Number(!(umoney))) C.variadic(90,C.staticAddress("no_money"),(C.i32(stashed_gold)?C.literal(" seem to"):C.literal("")));
 else C.variadic(91,C.staticAddress("not_enough_money"),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","him").value));
                return 1;
            }
            C.variadic(92,C.literal("try to appease %s by giving %s 1000 gold pieces."),((Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))?C.x_monnam(shkp,1,C.literal("angry"),0,(C.i8(0))):C.shkname(shkp)),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","him").value));
            pay(1000n,shkp);
            if(Number(!!(C.strncmp(C.field(eshkp,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32))||((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),1938,(C.literal("dopay"))),C.rn2(3))):C.rn2(3)))))) make_happy_shk(shkp,(C.i8(0)));
 else C.variadic(93,C.literal("But %s is as angry as ever."),C.shkname(shkp));
        }
        return 1;
    }
    if(Number(shkp!=resident)) {
        C.variadic(94,C.literal("dopay: not to shopkeeper?"));
        if(resident) setpaid(resident);
        return 0;
    }
    /* pay debt, if any, first */
    if(C.field(eshkp,"eshk","debit").value) {
        let dtmp=C.field(eshkp,"eshk","debit").value;
        let loan=C.field(eshkp,"eshk","loan").value;
        let sbuf=C.automatic("dopay.sbuf@66837",(1*256));
        (umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value));
        C.variadic(95,sbuf,C.literal("You owe %s %ld %s "),C.shkname(shkp),dtmp,C.currency(dtmp));
        if(loan) {
            if(Number(loan==dtmp)) C.strcat(sbuf,C.literal("you picked up in the store."));
 else C.strcat(sbuf,C.literal("for gold picked up and the use of merchandise."));
        } else {
            C.strcat(sbuf,C.literal("for the use of merchandise."));
        }
        C.variadic(96,C.literal("%s"),sbuf);
        if(Number(C.i64((umoney+C.field(eshkp,"eshk","credit").value))<dtmp)) {
            C.variadic(97,C.literal("But you don't%s have enough gold%s."),(C.i32(stashed_gold)?C.literal(" seem to"):C.literal("")),(C.field(eshkp,"eshk","credit").value?C.literal(" or credit"):C.literal("")));
            return 1;
        } else {
            if(Number(C.field(eshkp,"eshk","credit").value>=dtmp)) {
                (C.field(eshkp,"eshk","credit").value=C.i64(C.field(eshkp,"eshk","credit").value-dtmp));
                (C.field(eshkp,"eshk","debit").value=0n);
                (C.field(eshkp,"eshk","loan").value=0n);
                C.variadic(98,C.literal("debt is covered by your credit."));
            } else if(Number(!(C.field(eshkp,"eshk","credit").value))) {
                money2mon(shkp,dtmp);
                (C.field(eshkp,"eshk","debit").value=0n);
                (C.field(eshkp,"eshk","loan").value=0n);
                C.variadic(99,C.literal("pay that debt."));
                (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            } else {
                (dtmp=C.i64(dtmp-C.field(eshkp,"eshk","credit").value));
                (C.field(eshkp,"eshk","credit").value=0n);
                money2mon(shkp,dtmp);
                (C.field(eshkp,"eshk","debit").value=0n);
                (C.field(eshkp,"eshk","loan").value=0n);
                C.variadic(100,C.literal("That debt is partially offset by your credit."));
                C.variadic(101,C.literal("pay the remainder."));
                (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            }
            (paid.value=(C.i8(1)));
        }
    }
    /* now check items on bill */
    (pay_done=(C.i8(1)));
    /* assume success */
    if(C.field(eshkp,"eshk","billct").value) {
        let ibillct=make_itemized_bill(shkp,ibill.address);
        if(Number(!(pay_billed_items(shkp,ibillct,ibill.value,stashed_gold,paid.address)))) (pay_done=(C.i8(0)));
        /* skip thank you message */
    }
    /* {mute shk,deaf hero}-aware thank you message */
    if(Number(!!(Number(!!(C.i32(pay_done)&&Number(!((Number(!((C.field((shkp),"monst","mpeaceful").value))))))))&&C.i32(paid.value)))) {
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(102,C.literal("Thank you for shopping in %s %s%s"),C.s_suffix(C.shkname(shkp)),C.field((C.shtypes+Number(C.i32((C.field(eshkp,"eshk","shoptype").value-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value,(Number(!(C.field(eshkp,"eshk","surcharge").value))?C.literal("!"):C.literal(".")));
        } else {
            C.variadic(103,C.literal("%s nods%s at you for shopping in %s %s%s"),C.Shknam(shkp),(Number(!(C.field(eshkp,"eshk","surcharge").value))?C.literal(" appreciatively"):C.literal("")),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),C.field((C.shtypes+Number(C.i32((C.field(eshkp,"eshk","shoptype").value-C.SHOPBASE)))*C.sizes["struct shclass"]),"shclass","name").value,(Number(!(C.field(eshkp,"eshk","surcharge").value))?C.literal("!"):C.literal(".")));
        }
    }
    if(paid.value) C.update_inventory();
    (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
    /* reset */
    /* free the sortbill array used for itemized billing */
    if(ibill.value) {
        (C.free(ibill.value),(ibill.value=0));
        ((ibill.value));
    }
    return (C.i32(paid.value)?1:0);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* for menustyle=Traditional, choose between paying for everything (by
   declining to itemize), asking item-by-item (by accepting itemization),
   or switch to selecting via menu (special 'm' answer at "Itemize? [ynq m]"
   prompt); for other menustyles, always select via menu;
   player can use 'm' prefix before 'p' command to invert those behaviors;
   once the method is chosen, actually pay for the selected items, item by
   item for as long as hero has enough credit+cash */
export function pay_billed_items(shkp,ibillct,ibill,stashed_gold,paid_p)
{
    shkp=C.ptr(shkp);
    ibillct=C.i32(ibillct);
    ibill=C.ptr(ibill);
    stashed_gold=C.i8(stashed_gold);
    paid_p=C.ptr(paid_p);
    /* output */
    let bp;
    let otmp;
    let umoney;
    let itemize; let more_than_one;
    let queuedpay=(C.i8(0)); let via_menu;
    let buy; let indx; let bidx; let pass; let iprompt; let ebillct;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    (umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value));
    if(Number(!!(Number(!(umoney))&&Number(!(C.field(eshkp,"eshk","credit").value))))) {
        C.variadic(104,C.literal("%shave no gold or credit%s."),(C.i32(stashed_gold)?C.literal("seem to "):C.literal("")),(C.i32(C.cell(paid_p,"signed char").value)?C.literal(" left"):C.literal("")));
        return (C.i8(1));
    }
    (bp=C.field(eshkp,"eshk","bill_p").value);
    (otmp=bp_to_obj(bp));
    (ebillct=C.field(eshkp,"eshk","billct").value);
    (more_than_one=C.i8((Number(!!(Number(!!(Number(ebillct>1)||Number(C.field(otmp,"obj","quan").value<C.field(bp,"bill_x","bquan").value)))||Number(C.i32(C.field((ibill+Number(0)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)==C.UndisclosedContainer))))));
    /* note: will only get here for a single item, so
                        we can deduce that it is ibill[0] */
    if(Number((C.i64((umoney+C.field(eshkp,"eshk","credit").value)))<cheapest_item(ibillct,ibill))) {
        C.variadic(105,C.literal("don't have enough gold to buy%s the item%s %s."),(C.i32(more_than_one)?C.literal(" any of"):C.literal("")),(((Number(((C.i32(more_than_one)?2:1))==1))?C.literal(""):C.literal("s"))),((Number(ebillct>1))?C.literal("you've picked"):C.literal("on your bill")));
        if(stashed_gold) C.variadic(106,C.literal("Maybe you have some gold stashed away?"));
        return (C.i8(1));
    }
    (via_menu=C.i8((Number(C.i32(C.field(C.flags,"flag","menu_style").value)!=0))));
    /* allow 'm p' to request a menu for menustyle:traditional;
       for other styles, it will do the opposite; that doesn't make
       a whole lot of sense for a 'request-menu' prefix, but otherwise
       it would simply be redundant and there wouldn't be any way to
       skip the menu when hero owes for multiple items */
    if(C.field(C.iflags,"instance_flags","menu_requested").value) (via_menu=C.i8(Number(!(via_menu))));
    /* this will loop for a second iteration iff not initially using a
       menu and player answers 'm' at custom ynq prompt */
    do {
        if(via_menu) {
            /*&& more_than_one*/
            if(Number(!(menu_pick_pay_items(ibillct,ibill)))) return (C.i8(1));
            (queuedpay=(C.i8(1)));
            (itemize=(C.i8(0)));
            (via_menu=(C.i8(0)));
            /* reset so that we don't loop */
        } else {
            (iprompt=(Number(!(more_than_one))?121:C.i32(C.yn_function(C.literal("Itemized billing?"),C.literal("ynq m"),C.i8(113),(C.i8(1))))));
            if(Number(iprompt==113)) return (C.i8(1));
            (itemize=C.i8((Number(iprompt==121))));
            (via_menu=C.i8((Number(iprompt==109))));
        }
    } while(via_menu);
    /*
     * 5.0:  this used to make two passes through eshkp->bill_p[],
     * the first for used up items and the second for unpaid ones.
     * Items which were partly used were processed on both passes.
     *
     * Now it makes one pass through ibill[], which has all used up
     * items sorted to the beginning and unpaid ones sorted to the end.
     * Partly used items have two entries for same base item, one in
     * each section.
     */
    for((indx=0);Number(indx<ibillct);(()=>{const old=indx;indx=C.i32((old+1));return indx;})()) {
        if(Number(!!(C.i32(queuedpay)&&Number(!(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","queuedpay").value))))) continue;
        (otmp=C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value);
        /* ordinary object or outermost container */
        if(Number(C.i32(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)>=C.KnownContainer)) {
            /* when successfull, buy_container() will call both
               dopayobj() and update_bill(), possibly multiple times */
            let boxbag_result=buy_container(shkp,indx,ibillct,ibill);
            if(Number(boxbag_result==0)) {
                (buy=1);
            } else {
                /* buy_container() failed... */
                if(Number(boxbag_result==2)) C.variadic(107,C.literal("You need to remove any unpaid items from that %s and buy them separately."),C.simpleonames(otmp));
                /* ... but didn't explain why */
                (buy=0);
            }
        } else {
            (bidx=C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","bidx").value);
            (bp=(C.field(eshkp,"eshk","bill_p").value+Number(bidx)*C.sizes["struct bill_x"]));
            (pass=((Number(C.i32(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)<=C.PartlyUsedUp))?0:1));
            (buy=dopayobj(shkp,bp,otmp,pass,itemize,(C.i8(0))));
            if(Number(buy==1)) update_bill(indx,ibillct,ibill,eshkp,bp,otmp);
        }
        switch(buy) {
            case (0):
                return (C.i8(0));
            case ((C.i32((-2)))):
                (C.cell(paid_p,"signed char").value=(C.i8(1)));
            return (C.i8(1));
            case ((C.i32((-1)))):
                continue;
            /* case PAY_SOME: //no longer used */
            case (1):
                (C.cell(paid_p,"signed char").value=(C.i8(1)));
            if(Number(!!(C.i32(itemize)||C.i32(queuedpay)))) {
                C.update_inventory();
                C.bot();
            }
            break;
        }
    }
    return (C.i8(1));
}

/* update shk's bill and augmented bill after an item has been purchased */
export function update_bill(indx,ibillct,ibill,eshkp,bp,paiditem)
{
    indx=C.i32(indx);
    ibillct=C.i32(ibillct);
    ibill=C.ptr(ibill);
    eshkp=C.ptr(eshkp);
    bp=C.ptr(bp);
    paiditem=C.ptr(paiditem);
    /* index into ibill[]; -1 for unpaid contained item */
    let j; let newebillct;
    /* remove from eshkp->bill_p[] unless this was the used up portion
       of partly used item (since removal would take out both; note:
       can't buy PartlyIntact until PartlyUsedUp has been paid for) */
    if(Number(!!(Number(indx>=0)&&Number(C.i32(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)==C.PartlyUsedUp)))) {
        /* 'paiditem' points to the partly intact portion still in invent or
           inside a container (ibill[indx].obj points to the container) */
        (C.field(bp,"bill_x","bquan").value=C.field(paiditem,"obj","quan").value);
        for((j=0);Number(j<ibillct);(()=>{const old=j;j=C.i32((old+1));return j;})()) if(Number(!!(Number(C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value==paiditem)&&Number(C.i32(C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)==C.PartlyIntact)))) {
            (C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value=C.i8(C.FullyIntact));
            break;
        }

    } else {
        /* if we get here, something was bought and needs to be removed
           from shop bill; if it was used up, remove it from the billobjs
           list and delete it; update shop's bill by moving last bill_p[]
           entry into vacated slot; also update ibill[] indices for that */
        (C.field(paiditem,"obj","unpaid").value=C.u32(0));
        /* clear before maybe deallocating */
        if(Number(C.i32(C.field(paiditem,"obj","where").value)==7)) {
            C.obj_extract_self(paiditem);
            C.dealloc_obj(paiditem);
        }
        (newebillct=C.i32((C.field(eshkp,"eshk","billct").value-1)));
        C.copy(bp,(C.field(eshkp,"eshk","bill_p").value+Number(newebillct)*C.sizes["struct bill_x"]),C.sizes["struct bill_x"]);
        for((j=0);Number(j<ibillct);(()=>{const old=j;j=C.i32((old+1));return j;})()) if(Number(C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","bidx").value==newebillct)) (C.field((ibill+Number(j)*C.sizes["struct sortbill_item"]),"sortbill_item","bidx").value=C.i32((C.i64(((bp-C.field(eshkp,"eshk","bill_p").value)/C.sizes["struct bill_x"])))));

        (C.field(eshkp,"eshk","billct").value=newebillct);
        /* eshkp->billct - 1 */
    }
    return;
}

/* return 2 if used-up portion paid
 *        1 if paid successfully
 *        0 if not enough money
 *       -1 if skip this object
 *       -2 if no money/credit left
 */
export function dopayobj(shkp,bp,obj,which,itemize,unseen)
{
    shkp=C.ptr(shkp);
    bp=C.ptr(bp);
    obj=C.ptr(obj);
    which=C.i32(which);
    itemize=C.i8(itemize);
    unseen=C.i8(unseen);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["dopayobj.qbuf@78058",(1*256)],["dopayobj.qsfx@78071",(1*256)]]);
    try {
    /* 0 => used-up item, 1 => other (unpaid or lost) */
    let ltmp; let quan; let save_quan;
    let buy;
    let consumed=C.i8((Number(which==0)));
    if(Number(!!(Number(!!(Number(!(C.field(obj,"obj","unpaid").value))&&Number(!(C.field(bp,"bill_x","useup").value))))&&Number(!((Number(!!((Number(C.field((obj),"obj","cobj").value!=0))&&unpaid_cost(obj,C.u8(C.COST_CONTENTS)))))))))) {
        C.variadic(108,C.literal("Paid object on bill??"));
        return 1;
    }
    if(Number(!!(C.i32(itemize)&&C.i32(insufficient_funds(shkp,obj,0n))))) {
        return (C.i32((-2)));
    }
    /* we may need to temporarily adjust the object, if part of the
       original quantity has been used up but part remains unpaid; [note:
       this predates 'ibill[]' and feels redundant but still works] */
    (save_quan=C.field(obj,"obj","quan").value);
    if(consumed) {
        /* either completely used up (simple), or split needed */
        (quan=C.field(bp,"bill_x","bquan").value);
        if(Number(quan>C.field(obj,"obj","quan").value)) (quan=C.i64(quan-C.field(obj,"obj","quan").value));
        /* difference is amount used up */
    } else {
        /* dealing with ordinary unpaid item */
        (quan=C.field(obj,"obj","quan").value);
    }
    (ltmp=C.i64((C.field(bp,"bill_x","price").value*quan)));
    (C.field(obj,"obj","quan").value=quan);
    /* to be used by doname() */
    (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old+1));return old;})();
    /* affects containers */
    (buy=1);
    /* flag; if changed then return early */
    if(itemize) {
        let qbuf=C.automatic("dopayobj.qbuf@78058",(1*256)); let qsfx=C.automatic("dopayobj.qsfx@78071",(1*256));
        /*
         * TODO:
         *  This should also accept 'a' and 'q' to end itemized paying:
         *  'a' to buy the rest without asking, 'q' to just stop.
         */
        C.variadic(109,qsfx,C.literal(" for %ld %s.  Pay?"),ltmp,C.currency(ltmp));
        C.safe_qbuf(qbuf,0,qsfx,obj,((Number(quan==1n))?C.functionAddress("Doname2"):C.functionAddress("doname")),C.functionAddress("ansimpleoname"),((Number(quan==1n))?C.literal("that"):C.literal("those")));
        if(Number(C.i32(C.yn_function(qbuf,C.ynchars,C.i8(110),(C.i8(1))))==110)) {
            (buy=(C.i32((-1))));
            /* don't want to buy */
        }
    }
    /* itemize */
    if(Number(!!(Number(quan<C.field(bp,"bill_x","bquan").value)&&Number(!(consumed))))) {
        /* partly used goods */
        /* shk won't sell the intact portion until the used up portion has
           been paid for (once it has been, bp->bquan will match quan) */
        reject_purchase(shkp,obj,C.field(bp,"bill_x","bquan").value);
        (buy=(C.i32((-1))));
    }
    if(Number(!!(Number(buy==1)&&C.i32(insufficient_funds(shkp,obj,ltmp))))) {
        (buy=(C.i32(itemize)?(C.i32((-1))):0));
    }
    if(Number(buy==1)) {
        pay(ltmp,shkp);
        if(Number(!(unseen))) shk_names_obj(shkp,obj,(C.i32(consumed)?C.literal("paid for %s at a cost of %ld gold piece%s.%s"):C.literal("bought %s for %ld gold piece%s.%s")),ltmp,C.literal(""));
    }
    /* restore obj to original state */
    (C.field(obj,"obj","quan").value=save_quan);
    /* restore original count */
    (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old-1));return old;})();
    return buy;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* pay for the unpaid contents of a container without itemizing,
   and for the container itself if it is unpaid too;
   returns 0==successfully bought; 1==rejected, message given here;
   2=rejected, caller should issue message */
export function buy_container(shkp,indx,ibillct,ibill)
{
    shkp=C.ptr(shkp);
    indx=C.i32(indx);
    ibillct=C.i32(ibillct);
    ibill=C.ptr(ibill);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["buy_container.boids@79898",(4*200)]]);
    try {
    let boid; let boids=C.automatic("buy_container.boids@79898",(4*200));
    let i; let j; let buy; let buycount=0; let boidsct=0;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    let ebillct=C.field(eshkp,"eshk","billct").value;
    let bp;
    let otmp; let otop; let container=C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","obj").value;
    let unpaidcontainer=C.field(container,"obj","unpaid").value;
    let totalcost=C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value;
    let sightunseen=C.i8(Number(!!(Number(C.i32(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)==C.UndisclosedContainer)||Number(C.i32(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","usedup").value)==C.KnownContainer))));
    /* give feedback just for container+contents rather
                             than for individiual contents even when those
                             contents are known */
    /* check for no-gold first, then for not-enough-gold; feedback is
       different for the two cases */
    if(Number(!!(C.i32(insufficient_funds(shkp,container,0n))||C.i32(insufficient_funds(shkp,container,totalcost))))) return 1;
    /* message given by insufficent_funds() */
    /* check for partly intact portion of a not-yet-paid partly used item */
    for((i=0);Number(i<ebillct);(()=>{const old=i;i=C.i32((old+1));return i;})()) {
        (bp=(C.field(eshkp,"eshk","bill_p").value+Number(i)*C.sizes["struct bill_x"]));
        (otmp=bp_to_obj(bp));
        /* ibill[bidx].obj is the container */
        if(Number(!(otmp))) {
            C.variadic(110,C.literal("Can't find contained item on shop bill (#%d)."),C.field(bp,"bill_x","bo_id").value);
            return 2;
            /* failure; have caller give a generic message */
        }
        if(Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)!=2)&&Number(!((Number(C.field((otmp),"obj","cobj").value!=0))))))) continue;
        /* otmp is contained, but possibly inside a different container */
        for((otop=otmp);Number(C.i32(C.field(otop,"obj","where").value)==2);(otop=C.field(C.field(otop,"obj","v").address,"vptrs","v_ocontainer").value)) continue;

        /* where==OBJ_CONTAINED loop */
        if(Number(otop!=container)) continue;
        /* 'i' loop */
        /* now check for partly intact portion of partly used item */
        if(Number(C.field(otmp,"obj","quan").value<C.field(bp,"bill_x","bquan").value)) {
            reject_purchase(shkp,otmp,C.field(bp,"bill_x","bquan").value);
            return 1;
            /* message given by reject_purchase() */
        }
        /* record this for the second pass; unless it's the container--that
           will be deferred until after the loop so that it will be last */
        if(Number(C.field(bp,"bill_x","bo_id").value!=C.field(container,"obj","o_id").value)) (C.cell((boids+Number((()=>{const old=boidsct;boidsct=C.i32((old+1));return old;})())*4),"unsigned int").value=C.field(bp,"bill_x","bo_id").value);
    }
    if(unpaidcontainer) (C.cell((boids+Number((()=>{const old=boidsct;boidsct=C.i32((old+1));return old;})())*4),"unsigned int").value=C.field(container,"obj","o_id").value);
    /* now make the actual purchasing pass; we've collected a set of
       o_id values in order to avoid traversing the shk's bill while it
       undergoes updates */
    for((j=0);Number(j<boidsct);(()=>{const old=j;j=C.i32((old+1));return j;})()) {
        (boid=C.cell((boids+Number(j)*4),"unsigned int").value);
        for(((i=0),(bp=C.field(eshkp,"eshk","bill_p").value));Number(i<ebillct);((()=>{const old=i;i=C.i32((old+1));return i;})(),(()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return bp;})())) if(Number(C.field(bp,"bill_x","bo_id").value==boid)) break;

        if(Number(i==ebillct)) {
            C.variadic(111,C.literal("Buying %s contents: item #%u disappeared from bill."),C.simpleonames(container),boid);
            return 2;
        }
        (otmp=bp_to_obj(bp));
        (buy=dopayobj(shkp,bp,otmp,1,(C.i8(0)),sightunseen));
        if(Number(buy!=1)) {
            C.variadic(112,C.literal("Buying %s contents failed unexpectedly (#%u %d)."),C.simpleonames(container),C.field(otmp,"obj","o_id").value,buy);
            continue;
        }
        /* [updating cost here is not necessary but useful when debugging] */
        (C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value=C.i64(C.field((ibill+Number(indx)*C.sizes["struct sortbill_item"]),"sortbill_item","cost").value-(C.i64((C.field(bp,"bill_x","price").value*C.field(bp,"bill_x","bquan").value)))));
        /* update container */
        update_bill(((Number(boid==C.field(container,"obj","o_id").value))?indx:C.i32((-1))),ibillct,ibill,eshkp,bp,otmp);
        (()=>{const old=buycount;buycount=C.i32((old+1));return buycount;})();
    }
    if(Number(!!(buycount&&C.i32(sightunseen)))) {
        /* if the container was unpaid, the hero has just purchased it;
           normally paydoname()--called by shk_names_obj()--would give
           "contents of your <container>" when it's hero-owned but we
           want it to reflect container's state before purchase;
           since paydoname() isn't called for no_charge items, we use
           obj->no_charge as a hack to avoid that phrasing in favor of
           "a/an <container> and its contents"; temporarily set
           obj->unpaid to reflect the before-purchase state too */
        if(unpaidcontainer) (C.field(container,"obj","unpaid").value=(C.field(container,"obj","no_charge").value=C.u32(1)));
        shk_names_obj(shkp,container,C.literal("bought %s for %ld gold piece%s.%s"),totalcost,C.literal(""));
        (C.field(container,"obj","unpaid").value=(C.field(container,"obj","no_charge").value=C.u32(0)));
    }
    return (buycount?0:2);
    /* we don't expect buycount to be 0 */
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* called if an item on shop bill is partly used up and partly intact and
   player tries to buy the intact portion before paying for used up portion
   (not actually very effective since player can just drop the unpaid
   portion then pick it back up to have it get its own distinct bill entry;
   the former partly used up portion becomes a fully used up separate item) */
export function reject_purchase(shkp,obj,billed_quan)
{
    shkp=C.ptr(shkp);
    obj=C.ptr(obj);
    billed_quan=C.i64(billed_quan);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["reject_purchase.which@84960",(1*256)]]);
    try {
    let intact_quan=C.field(obj,"obj","quan").value;
    ((Number(!!((Number(intact_quan<billed_quan))||((C.__assert_fail(C.literal("intact_quan < billed_quan"),C.literal("shk.c"),2426,(C.literal("reject_purchase"))),0))))));
    /* temporarily change obj to refer to the used up portion */
    (C.field(obj,"obj","quan").value=C.i64((billed_quan-intact_quan)));
    if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
        let which=C.automatic("reject_purchase.which@84960",(1*256));
        if(Number(C.i32(C.field(obj,"obj","where").value)==2)) C.variadic(113,(C.literal("reject_purchase")),2434,which,BigInt((1*256)),C.literal("the one%s in %s"),(((Number((intact_quan)==C.i64(1)))?C.literal(""):C.literal("s"))),C.thesimpleoname(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value));
 else C.variadic(114,which,C.literal("%s"),((Number(intact_quan>1n))?C.literal("these"):C.literal("this one")));
        ;
        C.variadic(115,C.literal("%s for the other %s before buying %s."),((Number(!((C.field((shkp),"monst","mpeaceful").value))))?C.literal("Pay"):C.literal("Please pay")),C.simpleonames(obj),which);
        /* short name suffices */
    } else {
        C.variadic(116,C.literal("%s %s%s your bill for the other %s first."),C.Shknam(shkp),((Number(!((C.field((shkp),"monst","mpeaceful").value))))?C.literal("angrily "):C.literal("")),((Number((C.u64((C.field((C.field(shkp,"monst","data").value),"permonst","mflags1").value&C.u64(24576n))))==C.u64(24576n)))?C.literal("motions to"):C.literal("points out")),C.simpleonames(obj));
    }
    (C.field(obj,"obj","quan").value=intact_quan);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* gold+credit checking+feedback common to dopayobj() and buy_container() */
export function insufficient_funds(shkp,item,cost)
{
    shkp=C.ptr(shkp);
    item=C.ptr(item);
    cost=C.i64(cost);
    /* 0: check for no-gold; >0: check for specified amount */
    let stashed_gold;
    let umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value); let ecredit=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value;
    /* dopayobj() checks for no-gold early and not-enough-gold later;
       buy_container() checks for both early but uses separate calls to us */
    if(Number(!!(Number(!(cost))&&Number(C.i64((umoney+ecredit))==0n)))) {
        (stashed_gold=C.hidden_gold((C.i8(1))));
        C.variadic(117,C.literal("%shave no gold or credit left."),((Number(stashed_gold>C.i64(0)))?C.literal("seem to "):C.literal("")));
        return (C.i8(1));
    }
    if(Number(!!(cost&&Number(C.i64((umoney+ecredit))<cost)))) {
        (stashed_gold=C.hidden_gold((C.i8(1))));
        C.variadic(118,C.literal("don't%s have gold%s enough to pay for %s."),((Number(stashed_gold>0n))?C.literal(" seem to"):C.literal("")),((Number(ecredit>0n))?C.literal(" or credit"):C.literal("")),C.paydoname(item));
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* routine called after dying (or quitting) */
export function paybill(croaked,silently)
{
    croaked=C.i32(croaked);
    silently=C.i8(silently);
    /* -1: escaped dungeon; 0: quit; 1: died */
    /* maybe avoid messages */
    let mtmp; let mtmp2; let firstshk; let resident; let creditor; let hostile; let localshk;
    let eshkp;
    let taken=(C.i8(0)); let local;
    let numsk=0;
    /* if we escaped from the dungeon, shopkeepers can't reach us;
       shops don't occur on level 1, but this could happen if hero
       level teleports out of the dungeon and manages not to die */
    if(Number(croaked<0)) return (C.i8(0));
    /* [should probably also return false when dead hero has been
        petrified since shk shouldn't be able to grab inventory
        which has been shut inside a statue] */
    /* this is where inventory will end up if any shk takes it */
    (C.field(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","location").address,"nhcoord","x").value=(C.field(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","location").address,"nhcoord","y").value=C.i16(0)));
    (C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","shopkeeper").value=0);
    /*
     * Scan all shopkeepers on the level, to prioritize them:
     * 1) keeper of shop hero is inside and who is owed money,
     * 2) keeper of shop hero is inside who isn't owed any money,
     * 3) other shk who is owed money, 4) other shk who is angry,
     * 5) any shk local to this level, and if none is found,
     * 6) first shk on monster list (last resort; unlikely, since
     * any nonlocal shk will probably be in the owed category
     * and almost certainly be in the angry category).
     */
    (resident=(creditor=(hostile=(localshk=0))));
    for((mtmp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));mtmp;(mtmp=next_shkp(mtmp2,(C.i8(0))))) {
        (mtmp2=C.field(mtmp,"monst","nmon").value);
        (eshkp=(C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value));
        (local=C.on_level(C.field(eshkp,"eshk","shoplevel").address,C.field(C.u,"you","uz").address));
        if(Number(!!(C.i32(local)&&C.strchr(C.field(C.u,"you","ushops").address,C.i32(C.field(eshkp,"eshk","shoproom").value))))) {
            /* inside this shk's shop [there might be more than one
               resident shk if hero is standing in a breech of a shared
               wall, so give priority to one who's also owed money] */
            if(Number(!!(Number(!!(Number(!!(Number(!(resident))||C.field(eshkp,"eshk","billct").value))||C.field(eshkp,"eshk","debit").value))||C.field(eshkp,"eshk","robbed").value))) (resident=mtmp);
        } else if(Number(!!(Number(!!(C.field(eshkp,"eshk","billct").value||C.field(eshkp,"eshk","debit").value))||C.field(eshkp,"eshk","robbed").value))) {
            /* owe this shopkeeper money (might also owe others) */
            if(Number(!(creditor))) (creditor=mtmp);
        } else if(Number(!!(C.i32(C.field(eshkp,"eshk","following").value)||(Number(!((C.field((mtmp),"monst","mpeaceful").value))))))) {
            /* this shopkeeper is antagonistic (others might be too) */
            if(Number(!(hostile))) (hostile=mtmp);
        } else if(local) {
            /* this shopkeeper's shop is on current level */
            if(Number(!(localshk))) (localshk=mtmp);
        }
    }
    /* give highest priority shopkeeper first crack */
    (firstshk=(resident?resident:(creditor?creditor:(hostile?hostile:localshk))));
    if(firstshk) {
        (()=>{const old=numsk;numsk=C.i32((old+1));return old;})();
        (taken=inherits(firstshk,numsk,croaked,silently));
    }
    /* now handle the rest */
    for((mtmp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));mtmp;(mtmp=next_shkp(mtmp2,(C.i8(0))))) {
        (mtmp2=C.field(mtmp,"monst","nmon").value);
        (eshkp=(C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value));
        (local=C.on_level(C.field(eshkp,"eshk","shoplevel").address,C.field(C.u,"you","uz").address));
        if(Number(mtmp!=firstshk)) {
            (()=>{const old=numsk;numsk=C.i32((old+1));return old;})();
            (taken=C.i8(C.i32(taken)|C.i32(inherits(mtmp,numsk,croaked,silently))));
        }
        /* for bones: we don't want a shopless shk around */
        if(Number(!(local))) C.mongone(mtmp);
    }
    return taken;
}

/* decide whether a shopkeeper will take possession of dying hero's invent;
   when this returns True, it should call set_repo_loc() before returning;
   when it returns False, it should not do such because that might have
   already been called for some shopkeeper */
export function inherits(shkp,numsk,croaked,silently)
{
    shkp=C.ptr(shkp);
    numsk=C.i32(numsk);
    croaked=C.i32(croaked);
    silently=C.i8(silently);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["inherits.takes@90812",(1*256)]]);
    try {
    let loss=0n;
    let umoney;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    let take=(C.i8(0)); let taken=(C.i8(0)); let uinshop=C.i8((Number(C.strchr(C.field(C.u,"you","ushops").address,C.i32(C.field(eshkp,"eshk","shoproom").value))!=0)));
    let takes=C.automatic("inherits.takes@90812",(1*256));
    clear: {
    skip: {
    /* not strictly consistent; affects messages and prevents next player
       (if bones are saved) from blundering into or being ambushed by an
       invisible shopkeeper */
    (C.field(shkp,"monst","minvis").value=(C.field(shkp,"monst","perminvis").value=C.u32(0)));
    /* The simplifying principle is that first-come
       already took everything you had. */
    if(Number(numsk>1)) {
        if(Number(!!(Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(shkp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(shkp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))&&croaked))&&Number(!(silently))))) {
            (C.cell((takes+Number(0)*1),"char").value=C.i8(0));
            if(Number(!!((Number((C.u64((C.field((C.field(shkp,"monst","data").value),"permonst","mflags1").value&C.u64(32768n))))==C.u64(0n)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),2600,(C.literal("inherits"))),C.rn2(2))):C.rn2(2)))))))) C.variadic(119,takes,C.literal(", shakes %s %s,"),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),C.mbodypart(shkp,C.HEAD));
            C.variadic(120,C.literal("%s %slooks at your corpse%s and %s."),C.Shknam(shkp),((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))?C.literal("wakes up, "):C.literal("")),takes,(Number(!(inhishop(shkp)))?C.literal("disappears"):C.literal("sighs")));
        }
        (taken=uinshop);
        break skip; /* original goto */
    }
    /* get one case out of the way: you die in the shop, the
       shopkeeper is peaceful, nothing stolen, nothing owed */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(uinshop)&&inhishop(shkp)))&&Number(!(C.field(eshkp,"eshk","billct").value))))&&Number(!(C.field(eshkp,"eshk","robbed").value))))&&Number(!(C.field(eshkp,"eshk","debit").value))))&&C.i32((C.field((shkp),"monst","mpeaceful").value))))&&Number(!(C.field(eshkp,"eshk","following").value))))&&Number(C.field(C.u,"you","ugrave_arise").value<C.LOW_PM)))) {
        (taken=C.i8((Number(C.field(C.gi,"instance_globals_i","invent").value!=0))));
        if(Number(!!(C.i32(taken)&&Number(!(silently))))) C.variadic(121,C.literal("%s gratefully inherits all your possessions."),C.Shknam(shkp));
        break clear; /* original goto */
    }
    if(Number(!!(Number(!!(C.field(eshkp,"eshk","billct").value||C.field(eshkp,"eshk","debit").value))||C.field(eshkp,"eshk","robbed").value))) {
        if(Number(!!(C.i32(uinshop)&&inhishop(shkp)))) (loss=C.i64((addupbill(shkp)+C.field(eshkp,"eshk","debit").value)));
        if(Number(loss<C.field(eshkp,"eshk","robbed").value)) (loss=C.field(eshkp,"eshk","robbed").value);
        (take=(C.i8(1)));
    }
    if(Number(!!(Number(!!(C.i32(C.field(eshkp,"eshk","following").value)||(Number(!((C.field((shkp),"monst","mpeaceful").value))))))||C.i32(take)))) {
        if(Number(!(C.field(C.gi,"instance_globals_i","invent").value))) break skip; /* original goto */
        (umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value));
        (C.cell((takes+Number(0)*1),"char").value=C.i8(0));
        if((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))) C.strcat(takes,C.literal("wakes up and "));
        if(Number(!((Number(C.dist2((C.field((shkp),"monst","mx").value),(C.field((shkp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))) C.strcat(takes,C.literal("comes and "));
        C.strcat(takes,C.literal("takes"));
        if(Number(!!(Number(!!(Number(loss>umoney)||Number(!(loss))))||C.i32(uinshop)))) {
            (C.field(eshkp,"eshk","robbed").value=C.i64(C.field(eshkp,"eshk","robbed").value-umoney));
            if(Number(C.field(eshkp,"eshk","robbed").value<0n)) (C.field(eshkp,"eshk","robbed").value=0n);
            if(Number(umoney>0n)) {
                money2mon(shkp,umoney);
                (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            }
            if(Number(!(silently))) C.variadic(122,C.literal("%s %s all your possessions."),C.Shknam(shkp),takes);
            (taken=(C.i8(1)));
        } else {
            money2mon(shkp,loss);
            (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
            if(Number(!(silently))) C.variadic(123,C.literal("%s %s the %ld %s %sowed %s."),C.Shknam(shkp),takes,loss,C.currency(loss),(C.strncmp(C.field(eshkp,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32))?C.literal(""):C.literal("you ")),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","him").value));
            /* shopkeeper has now been paid in full */
            pacify_shk(shkp,(C.i8(0)));
            (C.field(eshkp,"eshk","following").value=C.i8(0));
            (C.field(eshkp,"eshk","robbed").value=0n);
        }
    } else {break clear;}
    } /* source skip: */
    /* in case we create bones */
    rouse_shk(shkp,(C.i8(0)));
    /* wake up */
    if(Number(!(inhishop(shkp)))) home_shk(shkp,(C.i8(0)));
    } /* source clear: */
    setpaid(shkp);
    /* clear this shk's bill */
    /* where to put player's invent (after disclosure) */
    if(taken) set_repo_loc(shkp);
    return taken;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function set_repo_loc(shkp)
{
    shkp=C.ptr(shkp);
    let ox; let oy;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    /* when multiple shopkeepers are present, we might get called more
       than once; don't override previous setting */
    if(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","shopkeeper").value) return;
    /* savebones() sets u.ux,u.uy to 0,0 to remove hero from map but that
       takes place after finish_paybill() has been called so we expect
       u.ux,u.uy to be valid; however, there has been a report of
       impossible "place_object: \"<item>\" off map <0,0>" when hero died
       in a gap in a shop's wall (in Minetown, so multiple shopkeepers in
       play, and prior to adding 'if (gr.repo.shopkeeper) return' above) */
    (ox=C.i16((C.i32(C.field(C.u,"you","ux").value)?C.i32(C.field(C.u,"you","ux").value):C.i32(C.field(C.u,"you","ux0").value))));
    (oy=C.i16((C.i32(C.field(C.u,"you","ux").value)?C.i32(C.field(C.u,"you","uy").value):C.i32(C.field(C.u,"you","uy0").value))));
    /* [testing u.ux when setting oy is correct] */
    /* if you're not in this shk's shop room, or if you're in its doorway
       or entry spot or one of its walls (temporary gap or Passes_walls),
       then your gear gets dumped all the way inside */
    if(Number(!!(Number(!(C.strchr(C.field(C.u,"you","ushops").address,C.i32(C.field(eshkp,"eshk","shoproom").value))))||C.i32(costly_adjacent(shkp,ox,oy))))) {
        /* shk.x,shk.y is the position immediately in front of the door;
           move in one more space */
        (ox=C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","x").value);
        (oy=C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","y").value);
        (ox=C.i16(C.i32(ox)+C.sgn(C.i32((C.i32(ox)-C.i32(C.field(C.field(eshkp,"eshk","shd").address,"nhcoord","x").value))))));
        (oy=C.i16(C.i32(oy)+C.sgn(C.i32((C.i32(oy)-C.i32(C.field(C.field(eshkp,"eshk","shd").address,"nhcoord","y").value))))));
    } else {
        ;
        /* already inside this shk's shop so use ox,oy as-is */
    }
    /* finish_paybill will deposit invent here */
    (C.field(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","location").address,"nhcoord","x").value=ox);
    (C.field(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","location").address,"nhcoord","y").value=oy);
    (C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","shopkeeper").value=shkp);
}

/* called at game exit, after inventory disclosure but before making bones;
   shouldn't issue any messages */
export function finish_paybill()
{
    let shkp=C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","shopkeeper").value;
    let ox=C.i32(C.field(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","location").address,"nhcoord","x").value); let oy=C.i32(C.field(C.field(C.field(C.gr,"instance_globals_r","repo").address,"repo","location").address,"nhcoord","y").value);
    /*
     * If set_repo_loc() didn't get called for some reason (good luck
     * untangling inherits() to figure out why...), ox,oy will be 0,0
     * and shkp will be Null.  Fix coordinates if that happens.
     */
    if(Number(!(C.isok(C.i16(ox),C.i16(oy))))) {
        /* this used to be suppressed as "don't bother" (too late to matter)
           but that led to "place_object: \"<item>\" off map <0,0>" warning */
        if(shkp) C.variadic(124,C.literal("finish_paybill: bad location <%d,%d>."),ox,oy);
        /* force a valid location */
        (ox=(C.i32(C.field(C.u,"you","ux").value)?C.i32(C.field(C.u,"you","ux").value):C.i32(C.field(C.u,"you","ux0").value)));
        (oy=(C.i32(C.field(C.u,"you","ux").value)?C.i32(C.field(C.u,"you","uy").value):C.i32(C.field(C.u,"you","uy0").value)));
        /* [note: testing u.ux when setting oy
                                   *  is correct here]*/
    }
    /* normally done by savebones(), but that's too late in this case */
    C.unleash_all();
    /* if hero has any gold left, take it into shopkeeper's possession */
    if(shkp) {
        let umoney=C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value);
        if(umoney) money2mon(shkp,umoney);
    }
    /* transfer rest of the character's inventory to the shop floor */
    C.drop_upon_death(0,0,C.i16(ox),C.i16(oy));
}

/* find obj on one of the lists */
export function bp_to_obj(bp)
{
    bp=C.ptr(bp);
    let obj;
    let id=C.field(bp,"bill_x","bo_id").value;
    if(C.field(bp,"bill_x","useup").value) (obj=C.o_on(id,C.field(C.gb,"instance_globals_b","billobjs").value));
 else (obj=find_oid(id));
    return obj;
}

/*
 * Look for o_id on all lists but billobj.  Return obj or NULL if not found.
 * Its OK for restore_timers() to call this function, there should not
 * be any timeouts on the gb.billobjs chain.
 */
export function find_oid(id)
{
    id=C.u32(id);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["find_oid.mmtmp@97514",(8*3)]]);
    try {
    let obj;
    let mon; let mmtmp=C.automatic("find_oid.mmtmp@97514",(8*3));
    let i;
    /* first check various obj lists directly */
    if(Number(((obj=C.o_on(id,C.field(C.gi,"instance_globals_i","invent").value)))!=0)) return obj;
    if(Number(((obj=C.o_on(id,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value)))!=0)) return obj;
    if(Number(((obj=C.o_on(id,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value)))!=0)) return obj;
    if(Number(((obj=C.o_on(id,C.field(C.gm,"instance_globals_m","migrating_objs").value)))!=0)) return obj;
    /* not found yet; check inventory for members of various monst lists */
    (C.cell((mmtmp+Number(0)*8),"struct monst *").value=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);
    (C.cell((mmtmp+Number(1)*8),"struct monst *").value=C.field(C.gm,"instance_globals_m","migrating_mons").value);
    (C.cell((mmtmp+Number(2)*8),"struct monst *").value=C.field(C.gm,"instance_globals_m","mydogs").value);
    /* for use during level changes */
    for((i=0);Number(i<3);(()=>{const old=i;i=C.i32((old+1));return old;})()) for((mon=C.cell((mmtmp+Number(i)*8),"struct monst *").value);mon;(mon=C.field(mon,"monst","nmon").value)) if(Number(((obj=C.o_on(id,C.field(mon,"monst","minvent").value)))!=0)) return obj;


    /* not found at all */
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* Returns the price of an arbitrary item in the shop,
   0 if the item doesn't belong to a shopkeeper or hero is not in the shop. */
export function get_cost_of_shop_item(obj,nochrg)
{
    obj=C.ptr(obj);
    nochrg=C.ptr(nochrg);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["get_cost_of_shop_item.x@98652",2],["get_cost_of_shop_item.y@98655",2]]);
    try {
    /* alternate return value: 1: no charge, 0: shop owned,
                  * -1: not in a shop (so don't format as "no charge") */
    let shkp;
    let top;
    let x=C.local("get_cost_of_shop_item.x@98652","short"); let y=C.local("get_cost_of_shop_item.y@98655","short");
    let freespot;
    let cost=0n;
    (C.cell(nochrg,"int").value=C.i32((-1)));
    /* assume 'not applicable' */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)&&Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)))&&Number(obj!=C.global("uball").value)))&&Number(obj!=C.global("uchain").value)))&&C.i32(C.get_obj_location(obj,x.address,y.address,1))))&&Number(C.i32(C.cell(C.in_rooms(x.value,y.value,C.SHOPBASE),"char").value)==C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value))))&&Number(((shkp=shop_keeper(inside_shop(x.value,y.value))))!=0)))&&inhishop(shkp)))) {
        for((top=obj);Number(C.i32(C.field(top,"obj","where").value)==2);(top=C.field(C.field(top,"obj","v").address,"vptrs","v_ocontainer").value)) continue;

        (freespot=C.i8((Number(!!(Number(!!(Number(C.i32(C.field(top,"obj","where").value)==1)&&Number(C.i32(x.value)==C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))))&&Number(C.i32(y.value)==C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value)))))));
        /* no_charge is only set for floor items inside shop proper;
           items on freespot are implicitly 'no charge' */
        (C.cell(nochrg,"int").value=(Number(!!(Number(C.i32(C.field(top,"obj","where").value)==1)&&(Number(!!(C.i32(C.field(obj,"obj","no_charge").value)||C.i32(freespot))))))));
        if(((Number(C.i32(C.field((top),"obj","where").value)==3))?C.i32(C.field(obj,"obj","unpaid").value):Number(!(C.cell(nochrg,"int").value)))) {
            let per_unit_cost=get_cost(obj,shkp);
            (cost=C.i64((get_pricing_units(obj)*per_unit_cost)));
        }
        if(Number(!!((Number(C.field((obj),"obj","cobj").value!=0))&&Number(!(freespot))))) (cost=C.i64(cost+contained_cost(obj,shkp,0n,(C.i8(0)),(C.i8(1)))));
    }
    return cost;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function get_pricing_units(obj)
{
    obj=C.ptr(obj);
    let units=C.field(obj,"obj","quan").value;
    if(C.field(obj,"obj","globby").value) {
        /* globs must be sold by weight not by volume */
        let unit_weight=C.i64(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_weight").value); let wt=((Number(C.field(obj,"obj","owt").value>C.u32(0)))?C.i64(C.field(obj,"obj","owt").value):C.i64(C.weight(obj)));
        if(unit_weight) (units=C.i64(((C.i64((C.i64((wt+unit_weight))-1n)))/unit_weight)));
    }
    return units;
}

/* decide whether to apply a surcharge (or hypothetically, a discount) to obj
   if it had ID number 'oid'; returns 1: increase, 0: normal, -1: decrease */
export function oid_price_adjustment(obj,oid)
{
    obj=C.ptr(obj);
    oid=C.u32(oid);
    let res=0; let otyp=C.i32(C.field(obj,"obj","otyp").value);
    if(Number(!!(Number(!((Number(!!(C.i32(C.field(obj,"obj","dknown").value)&&C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))))&&(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.GEM_CLASS)||Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value)!=C.GLASS))))))) {
        (res=(Number((C.u32((oid%C.u32(4))))==C.u32(0))));
        /* id%4 ==0 -> +1, ==1..3 -> 0 */
    }
    return res;
}

/* calculate the value that the shk will charge for [one of] an object */
export function get_cost(obj,shkp)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    /* if angry, impose a surcharge */
    /*
     * FIXME:
     *  If this obj is already on the shop's bill, use the price which
     *  has been set there.  Otherwise, the amount could be different
     *  (if billed while undiscovered and now become discovered or
     *  hero's charisma and/or visible worn gear have changed).
     */
    let tmp=getprice(obj,(C.i8(0))); let multiplier=1n; let divisor=1n;
    /* used to perform a single calculation even when multiple
            adjustments (unID'd, dunce/tourist, charisma) are made */
    if(Number(!(tmp))) (tmp=5n);
    /* shopkeeper may notice if the player isn't very knowledgeable -
       especially when gem prices are concerned */
    if(Number(!!(Number(!(C.field(obj,"obj","dknown").value))||Number(!(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))) {
        if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)))) {
            let i;
            /* get a value that's 'random' from game to game, but the
               same within the same game */
            let pseudorand=C.i8((Number((C.i32((C.i32(C.global("ubirthday").value)%C.i32(C.field(obj,"obj","otyp").value))))>=C.i32(Math.trunc((C.i32(C.field(obj,"obj","otyp").value)/2))))));
            /* all gems are priced high - real or not */
            switch(C.i32((C.i32(C.field(obj,"obj","otyp").value)-C.FIRST_GLASS_GEM))) {
                case (0):
                    /* white */
                    (i=(C.i32(pseudorand)?C.DIAMOND:C.OPAL));
                break;
                case (1):
                    /* blue */
                    (i=(C.i32(pseudorand)?C.SAPPHIRE:C.AQUAMARINE));
                break;
                case (2):
                    /* red */
                    (i=(C.i32(pseudorand)?C.RUBY:C.JASPER));
                break;
                case (3):
                    /* yellowish brown */
                    (i=(C.i32(pseudorand)?C.AMBER:C.TOPAZ));
                break;
                case (4):
                    /* orange */
                    (i=(C.i32(pseudorand)?C.JACINTH:C.AGATE));
                break;
                case (5):
                    /* yellow */
                    (i=(C.i32(pseudorand)?C.CITRINE:C.CHRYSOBERYL));
                break;
                case (6):
                    /* black */
                    (i=(C.i32(pseudorand)?C.BLACK_OPAL:C.JET));
                break;
                case (7):
                    /* green */
                    (i=(C.i32(pseudorand)?C.EMERALD:C.JADE));
                break;
                case (8):
                    /* violet */
                    (i=(C.i32(pseudorand)?C.AMETHYST:C.FLUORITE));
                break;
                default:
                    C.variadic(125,C.literal("bad glass gem %d?"),C.i32(C.field(obj,"obj","otyp").value));
                (i=C.STRANGE_OBJECT);
                break;
            }
            (tmp=C.i64(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_cost").value));
        } else if(Number(oid_price_adjustment(obj,C.field(obj,"obj","o_id").value)>0)) {
            /* unid'd, arbitrarily impose surcharge: tmp *= 4/3 */
            (multiplier=C.i64(multiplier*4n));
            (divisor=C.i64(divisor*3n));
        }
    }
    if(Number(!!(C.global("uarmh").value&&Number(C.i32(C.field(C.global("uarmh").value,"obj","otyp").value)==C.DUNCE_CAP)))) ((multiplier=C.i64(multiplier*4n)),(divisor=C.i64(divisor*3n)));
 else if(Number(!!((Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_TOURIST)))&&Number(C.field(C.u,"you","ulevel").value<(C.i32(Math.trunc((30/2))))))))||(Number(!!(Number(!!(C.global("uarmu").value&&Number(!(C.global("uarm").value))))&&Number(!(C.global("uarmc").value)))))))) ((multiplier=C.i64(multiplier*4n)),(divisor=C.i64(divisor*3n)));
    /* touristy shirt visible */
    if(Number(C.i32((C.acurr(C.A_CHA)))>18)) (divisor=C.i64(divisor*2n));
 else if(Number(C.i32((C.acurr(C.A_CHA)))==18)) ((multiplier=C.i64(multiplier*2n)),(divisor=C.i64(divisor*3n)));
 else if(Number(C.i32((C.acurr(C.A_CHA)))>=16)) ((multiplier=C.i64(multiplier*3n)),(divisor=C.i64(divisor*4n)));
 else if(Number(C.i32((C.acurr(C.A_CHA)))<=5)) (multiplier=C.i64(multiplier*2n));
 else if(Number(C.i32((C.acurr(C.A_CHA)))<=7)) ((multiplier=C.i64(multiplier*3n)),(divisor=C.i64(divisor*2n)));
 else if(Number(C.i32((C.acurr(C.A_CHA)))<=10)) ((multiplier=C.i64(multiplier*4n)),(divisor=C.i64(divisor*3n)));
    /* tmp = (tmp * multiplier) / divisor [with roundoff tweak] */
    (tmp=C.i64(tmp*multiplier));
    if(Number(divisor>1n)) {
        /* tmp = (((tmp * 10) / divisor) + 5) / 10 */
        (tmp=C.i64(tmp*10n));
        (tmp=C.i64(tmp/divisor));
        (tmp=C.i64(tmp+5n));
        (tmp=C.i64(tmp/10n));
    }
    if(Number(tmp<=0n)) (tmp=1n);
    /* the artifact prices in artilist[] are also used as a score bonus;
       inflate their shop price here without affecting score calculation */
    if(C.field(obj,"obj","oartifact").value) (tmp=C.i64(tmp*4n));
    /* anger surcharge should match rile_shk's, so we do it separately
       from the multiplier/divisor calculation */
    if(Number(!!(shkp&&C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value)))) (tmp=C.i64(tmp+C.i64(((C.i64((tmp+2n)))/3n))));
    return tmp;
}

/* returns the price of a container's content.  the price
 * of the "top" container is added in the calling functions.
 * a different price quoted for selling as vs. buying.
 */
export function contained_cost(obj,shkp,price,usell,unpaid_only)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    price=C.i64(price);
    usell=C.i8(usell);
    unpaid_only=C.i8(unpaid_only);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["contained_cost.x@105071",2],["contained_cost.y@105074",2]]);
    try {
    let otmp; let top;
    let x=C.local("contained_cost.x@105071","short"); let y=C.local("contained_cost.y@105074","short");
    let on_floor; let freespot;
    for((top=obj);Number(C.i32(C.field(top,"obj","where").value)==2);(top=C.field(C.field(top,"obj","v").address,"vptrs","v_ocontainer").value)) continue;

    /* pick_obj() removes item from floor, adds it to shop bill, then
       puts it in inventory; behave as if it is still on the floor
       during the add-to-bill portion of that situation */
    (on_floor=C.i8((Number(!!(Number(C.i32(C.field(top,"obj","where").value)==1)||Number(C.i32(C.field(top,"obj","where").value)==0))))));
    if(Number(!!(Number(C.i32(C.field(top,"obj","where").value)==0)||Number(!(C.get_obj_location(top,x.address,y.address,0)))))) ((x.value=C.field(C.u,"you","ux").value),(y.value=C.field(C.u,"you","uy").value));
    (freespot=C.i8((Number(!!(Number(!!(C.i32(on_floor)&&Number(C.i32(x.value)==C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))))&&Number(C.i32(y.value)==C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value)))))));
    /* price of contained objects; "top" container handled by caller */
    for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        if(usell) {
            if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.saleable(shkp,otmp))&&Number(!(C.field(otmp,"obj","unpaid").value))))&&Number(C.i32(C.field(otmp,"obj","oclass").value)!=C.BALL_CLASS)))&&Number(!((Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.FOOD_CLASS)&&C.field(otmp,"obj","oeaten").value)))))))&&Number(!((Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAX_CANDLE))))&&Number(C.field(otmp,"obj","age").value<C.i64((20n*C.i64(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_cost").value)))))))))))) (price=C.i64(price+set_cost(otmp,shkp)));
        } else {
            /* no_charge is only set for floor items (including
               contents of floor containers) inside shop proper;
               items on freespot are implicitly 'no charge' */
            if((C.i32(on_floor)?(Number(!!(Number(!(C.field(otmp,"obj","no_charge").value))&&Number(!(freespot))))):(Number(!!(C.i32(C.field(otmp,"obj","unpaid").value)||Number(!(unpaid_only))))))) (price=C.i64(price+C.i64((get_cost(otmp,shkp)*get_pricing_units(otmp)))));
        }
        if((Number(C.field((otmp),"obj","cobj").value!=0))) (price=contained_cost(otmp,shkp,price,usell,unpaid_only));
    }
    return price;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* count amount of gold inside container 'obj' and any nested containers */
export function contained_gold(obj,even_if_unknown)
{
    obj=C.ptr(obj);
    even_if_unknown=C.i8(even_if_unknown);
    /* T: all gold; F: limit to known contents */
    let otmp;
    let value=0n;
    /* accumulate contained gold */
    for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) (value=C.i64(value+C.field(otmp,"obj","quan").value));
 else if(Number(!!((Number(C.field((otmp),"obj","cobj").value!=0))&&(Number(!!(C.i32(C.field(otmp,"obj","cknown").value)||C.i32(even_if_unknown))))))) (value=C.i64(value+contained_gold(otmp,even_if_unknown)));

    return value;
}

export function dropped_container(obj,shkp,sale)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    sale=C.i8(sale);
    let otmp;
    /* the "top" container is treated in the calling fn */
    for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        if(Number(!!(Number(!(C.field(otmp,"obj","unpaid").value))&&Number(!((Number(!!(C.i32(sale)&&C.i32(C.saleable(shkp,otmp)))))))))) (C.field(otmp,"obj","no_charge").value=C.u32(1));
        if((Number(C.field((otmp),"obj","cobj").value!=0))) dropped_container(otmp,shkp,sale);
    }
}

export function picked_container(obj)
{
    obj=C.ptr(obj);
    let otmp;
    /* the "top" container is treated in the calling fn */
    for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        if(C.field(otmp,"obj","no_charge").value) (C.field(otmp,"obj","no_charge").value=C.u32(0));
        if((Number(C.field((otmp),"obj","cobj").value!=0))) picked_container(otmp);
    }
}

export function special_stock(obj,shkp,quietly)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    quietly=C.i8(quietly);
    /* for unique situations */
    if(Number(!!(Number(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoptype").value==C.CANDLESHOP)&&Number(C.i32(C.field(obj,"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)))) {
        if(Number(!(quietly))) {
            if(Number(!!(C.i32(C.is_izchak(shkp,(C.i8(1))))&&Number(!(C.field(C.field(C.u,"you","uevent").address,"u_event","invoked").value))))) {
                if(Number(!!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))||(Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))) {
                    C.variadic(126,C.literal("%s seems %s that you want to sell that."),C.Shknam(shkp),((Number(C.i32(C.field(obj,"obj","spe").value)<7))?C.literal("horrified"):C.literal("concerned")));
                } else {
                    ;
                    C.variadic(127,C.literal("No thanks, I'd hang onto that if I were you."));
                    if(Number(C.i32(C.field(obj,"obj","spe").value)<7)) {
                        ;
                        C.variadic(128,C.literal("You'll need %d%s candle%s to go along with it."),(C.i32((7-C.i32(C.field(obj,"obj","spe").value)))),((Number(C.i32(C.field(obj,"obj","spe").value)>0))?C.literal(" more"):C.literal("")),(((Number((C.i32((7-C.i32(C.field(obj,"obj","spe").value))))==1))?C.literal(""):C.literal("s"))));
                    }
                    /* [what if hero is already carrying enough candles?
                       should Izchak explain how to attach them instead?] */
                }
            } else {
                if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                    ;
                    C.variadic(129,C.literal("I won't stock that.  Take it out of here!"));
                } else {
                    C.variadic(130,C.literal("%s shakes %s %s in refusal."),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),C.mbodypart(shkp,C.HEAD));
                }
            }
        }
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* calculate how much the shk will pay when buying [all of] an object */
export function set_cost(obj,shkp)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    let tmp; let unit_price=getprice(obj,(C.i8(1))); let multiplier=1n; let divisor=1n;
    (tmp=C.i64((get_pricing_units(obj)*unit_price)));
    if(Number(!!(C.global("uarmh").value&&Number(C.i32(C.field(C.global("uarmh").value,"obj","otyp").value)==C.DUNCE_CAP)))) (divisor=C.i64(divisor*3n));
 else if(Number(!!((Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_TOURIST)))&&Number(C.field(C.u,"you","ulevel").value<(C.i32(Math.trunc((30/2))))))))||(Number(!!(Number(!!(C.global("uarmu").value&&Number(!(C.global("uarm").value))))&&Number(!(C.global("uarmc").value)))))))) (divisor=C.i64(divisor*3n));
 else (divisor=C.i64(divisor*2n));
    /* touristy shirt visible */
    /* shopkeeper may notice if the player isn't very knowledgeable -
       especially when gem prices are concerned */
    if(Number(!!(Number(!(C.field(obj,"obj","dknown").value))||Number(!(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))))) {
        if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)) {
            /* different shop keepers give different prices */
            if(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GEMSTONE)||Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)))) {
                (tmp=C.i64((C.u32((C.u32((C.i32((C.i32(C.field(obj,"obj","otyp").value)-C.FIRST_REAL_GEM))))%(C.u32((C.u32(6)-C.u32((C.field(shkp,"monst","m_id").value%C.u32(3)))))))))));
                (tmp=C.i64(((C.i64((tmp+C.i64(3))))*C.field(obj,"obj","quan").value)));
                (divisor=1n);
            }
        } else if(Number(!!(Number(tmp>1n)&&Number(!((C.u32((C.field(shkp,"monst","m_id").value%C.u32(4))))))))) ((multiplier=C.i64(multiplier*3n)),(divisor=C.i64(divisor*4n)));
    }
    if(Number(tmp>=1n)) {
        /* [see get_cost()] */
        (tmp=C.i64(tmp*multiplier));
        if(Number(divisor>1n)) {
            (tmp=C.i64(tmp*10n));
            (tmp=C.i64(tmp/divisor));
            (tmp=C.i64(tmp+5n));
            (tmp=C.i64(tmp/10n));
        }
        /* avoid adjusting nonzero to zero */
        if(Number(tmp<1n)) (tmp=1n);
    }
    /* (no adjustment for angry shk here) */
    return tmp;
}

/* unlike alter_cost() which operates on a specific item, identifying or
   forgetting a gem causes all unpaid gems of its type to change value */
export function gem_learned(oindx)
{
    oindx=C.i32(oindx);
    let obj;
    let shkp;
    let bp;
    let ct;
    /*
     * Unfortunately, shop bill doesn't have object type included,
     * just obj->oid for each unpaid stack, so we have to go through
     * every bill and every item on that bill and match up against
     * every unpaid stack on the level....
     *
     * Fortunately, there's no need to catch up when changing dungeon
     * levels even if we ID'd or forget some gems while gone from a
     * level.  There won't be any shop bills when arriving; they were
     * either paid before leaving or got treated as robbery and it's
     * too late to adjust pricing.
     */
    for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(1))))) {
        (ct=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value);
        (bp=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value);
        while(Number((()=>{const old=ct;ct=C.i32((old-1));return ct;})()>=0)) {
            (obj=find_oid(C.field(bp,"bill_x","bo_id").value));
            if(Number(!(obj))) continue;
            /* shouldn't happen */
            if(((Number(oindx!=C.STRANGE_OBJECT))?(Number(C.i32(C.field(obj,"obj","otyp").value)==oindx)):(Number(C.i32(C.field(obj,"obj","oclass").value)==C.GEM_CLASS)))) (C.field(bp,"bill_x","price").value=get_cost(obj,shkp));
            (()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return bp;})();
        }
    }
}

/* called when an item's value has been enhanced; if it happens to be
   on any shop bill, update that bill to reflect the new higher price
   [if the new price drops for some reason, keep the old one in place] */
export function alter_cost(obj,amt)
{
    obj=C.ptr(obj);
    amt=C.i64(amt);
    /* if 0, use regular shop pricing, otherwise force amount;
                 if negative, use abs(amt) even if it's less than old cost */
    let bp=0;
    let shkp;
    let new_price;
    for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp;(shkp=next_shkp(shkp,(C.i8(1))))) if(Number(((bp=onbill(obj,shkp,(C.i8(1)))))!=0)) {
        (new_price=(Number(!(amt))?get_cost(obj,shkp):((Number(amt<0n))?C.i64((-amt)):amt)));
        if(Number(!!(Number(new_price>C.field(bp,"bill_x","price").value)||Number(amt<0n)))) {
            (C.field(bp,"bill_x","price").value=new_price);
            C.update_inventory();
        }
        break;
        /* done */
    }

    return;
}

/* called from doinv(invent.c) for inventory of unpaid objects */
export function unpaid_cost(unp_obj,cost_type)
{
    unp_obj=C.ptr(unp_obj);
    cost_type=C.u8(cost_type);
    /* known to be unpaid or contain unpaid */
    /* COST_NOCONTENTS, COST_CONTENTS, or COST_SINGLEOBJ */
    let bp=0;
    let shkp=0;
    let shop;
    let amt=0n;
    /* if two shops share a wall, this might find wrong shk */
    /* (shouldn't happen) */
    /* didn't find shk?  try searching bills */
    for((shop=C.field(C.u,"you","ushops").address);C.cell(shop,"char").value;(()=>{const old=shop;shop=C.ptr((old+Number(1)));return old;})()) {
        if(Number(((shkp=shop_keeper(C.cell(shop,"char").value)))!=0)) {
            if(((bp=onbill(unp_obj,shkp,(C.i8(1)))))) {
                (amt=C.field(bp,"bill_x","price").value);
                if(Number(C.i32(cost_type)!=C.COST_SINGLEOBJ)) {
                    /* use quan rather than get_pricing_units -- glob weight
                       should already be factored into bp->price */
                    (amt=C.i64(amt*C.field(unp_obj,"obj","quan").value));
                }
            }
            if(Number(!!(Number(C.i32(cost_type)==C.COST_CONTENTS)&&(Number(C.field((unp_obj),"obj","cobj").value!=0))))) (amt=contained_cost(unp_obj,shkp,amt,(C.i8(0)),(C.i8(1))));
            if(Number(!!(bp||(Number(!!(Number(!(C.field(unp_obj,"obj","unpaid").value))&&amt)))))) break;
        }
    }
    /* onbill() gave no message if unexpected problem occurred */
    if(Number(!!(Number(!(shkp))||(Number(!!(C.i32(C.field(unp_obj,"obj","unpaid").value)&&Number(!(bp)))))))) C.variadic(131,C.literal("unpaid_cost: object wasn't on any bill."));
    return amt;
}

/* add 'obj' to 'shkp's bill */
export function add_one_tobill(obj,dummy,shkp)
{
    obj=C.ptr(obj);
    dummy=C.i8(dummy);
    shkp=C.ptr(shkp);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["add_one_tobill.shkp@115601",8]]);
    try {
    shkp=C.local("add_one_tobill.shkp@115601","struct monst *",shkp);
    /* True: obj is used up so goes on bill differently */
    let eshkp;
    let bp;
    let bct;
    let unbilled=(C.i8(0));
    (eshkp=(C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value));
    /* normally bill_p gets set up whenever you enter the shop, but obj
       might be going onto the bill because hero just snagged it with
       a grappling hook from outside without ever having been inside */
    if(Number(!(C.field(eshkp,"eshk","bill_p").value))) (C.field(eshkp,"eshk","bill_p").value=(C.field(eshkp,"eshk","bill").address+Number(0)*C.sizes["struct bill_x"]));
    if(Number(!(billable(shkp.address,obj,C.cell(C.field(C.u,"you","ushops").address,"char").value,(C.i8(1)))))) {
        /* shk doesn't want it */
        (unbilled=(C.i8(1)));
    } else if(Number(C.field(eshkp,"eshk","billct").value==200)) {
        /* shk's bill is completely full */
        C.variadic(132,C.literal("got that for free!"));
        (unbilled=(C.i8(1)));
    }
    /* if not on any list (probably from bill_dummy_object() which creates
       a new OBJ_FREE object), don't leave unmanaged object hanging around */
    if(unbilled) {
        if(Number(C.i32(C.field(obj,"obj","where").value)==0)) C.dealloc_obj(obj);
        /* change to obj->where==OBJ_DELETED */
        return;
    }
    (bct=C.field(eshkp,"eshk","billct").value);
    (bp=(C.field(eshkp,"eshk","bill_p").value+Number(bct)*C.sizes["struct bill_x"]));
    (C.field(bp,"bill_x","bo_id").value=C.field(obj,"obj","o_id").value);
    (C.field(bp,"bill_x","bquan").value=C.field(obj,"obj","quan").value);
    if(dummy) {
        /* a dummy object must be inserted into  */
        (C.field(bp,"bill_x","useup").value=(C.i8(1)));
        /* the gb.billobjs chain here.  crucial for */
        add_to_billobjs(obj);
        /* eating floorfood in shop.  see eat.c  */
    } else (C.field(bp,"bill_x","useup").value=(C.i8(0)));
    (C.field(bp,"bill_x","price").value=get_cost(obj,shkp.value));
    if(C.field(obj,"obj","globby").value) {
        /* for globs, the amt charged for quan 1 depends on owt */
        (C.field(bp,"bill_x","price").value=C.i64(C.field(bp,"bill_x","price").value*get_pricing_units(obj)));
        /* remember the weight this glob had when it was added to bill;
           glob oextra_owt field overlays corpse omid field */
        C.newomid(obj);
        ((C.field(C.field((obj),"obj","oextra").value,"oextra","omid").value)=C.field(obj,"obj","owt").value);
    }
    (()=>{const ref=C.field(eshkp,"eshk","billct");const old=ref.value;ref.value=C.i32((old+1));return old;})();
    (C.field(obj,"obj","unpaid").value=C.u32(1));
    record_price_quote(C.i32(C.field(obj,"obj","otyp").value),C.u64(C.field(bp,"bill_x","price").value),(C.i8(1)));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function add_to_billobjs(obj)
{
    obj=C.ptr(obj);
    if(Number(C.i32(C.field(obj,"obj","where").value)!=0)) C.variadic(133,C.literal("add_to_billobjs: obj not free"));
    if(C.field(obj,"obj","timed").value) C.obj_stop_timers(obj);
    (C.field(obj,"obj","nobj").value=C.field(C.gb,"instance_globals_b","billobjs").value);
    (C.field(C.gb,"instance_globals_b","billobjs").value=obj);
    (C.field(obj,"obj","where").value=C.i8(7));
    /* if hero drinks a shop-owned potion, it will have been flagged
       in_use by dodrink/dopotion but isn't being used up yet because
       it stays on the bill; only object sanity checking actually cares */
    (C.field(obj,"obj","in_use").value=C.u32(0));
    /* ... same for bypass by destroy_items */
    (C.field(obj,"obj","bypass").value=C.u32(0));
}

/* recursive billing of objects within containers. */
export function bill_box_content(obj,ininv,dummy,shkp)
{
    obj=C.ptr(obj);
    ininv=C.i8(ininv);
    dummy=C.i8(dummy);
    shkp=C.ptr(shkp);
    let otmp;
    if((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","spe").value)==1))))) return;
    for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        /* the "top" box is added in addtobill() */
        if(Number(!(C.field(otmp,"obj","no_charge").value))) add_one_tobill(otmp,dummy,shkp);
        if((Number(C.field((otmp),"obj","cobj").value!=0))) bill_box_content(otmp,ininv,dummy,shkp);
    }
}

/* shopkeeper tells you what you bought or sold, sometimes partly IDing it */
export function shk_names_obj(shkp,obj,fmt,amt,arg)
{
    shkp=C.ptr(shkp);
    obj=C.ptr(obj);
    fmt=C.ptr(fmt);
    amt=C.i64(amt);
    arg=C.ptr(arg);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["shk_names_obj.fmtbuf@118873",(1*256)]]);
    try {
    /* "%s %ld %s %s", doname(obj), amt, plur(amt), arg */
    let obj_name; let fmtbuf=C.automatic("shk_names_obj.fmtbuf@118873",(1*256));
    let was_unknown=C.i8(Number(!(C.field(obj,"obj","dknown").value)));
    C.observe_object(obj);
    /* Use real name for ordinary weapons/armor, and spell-less
     * scrolls/books (that is, blank and mail), but only if the
     * object is within the shk's area of interest/expertise.
     */
    if(Number(!!(Number(!!(Number(!(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_magic").value))&&C.i32(C.saleable(shkp,obj))))&&(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.ARMOR_CLASS)))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.SCROLL_CLASS)))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.SPBOOK_CLASS)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.MIRROR))))))) {
        (was_unknown=C.i8(C.i32(was_unknown)|Number(!(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value))));
        C.discover_object(C.i32((C.field(obj,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
    }
    (obj_name=C.paydoname(obj));
    /* Use an alternate message when extra information is being provided */
    if(was_unknown) {
        C.variadic(134,fmtbuf,C.literal("%%s; you %s"),fmt);
        (C.cell((obj_name+Number(0)*1),"char").value=C.highc(C.cell((obj_name+Number(0)*1),"char").value));
        C.variadic(135,fmtbuf,obj_name,((Number(C.field(obj,"obj","quan").value>1n))?C.literal("them"):C.literal("it")),amt,(((Number((amt)==C.i64(1)))?C.literal(""):C.literal("s"))),arg);
    } else {
        C.variadic(136,fmt,obj_name,amt,(((Number((amt)==C.i64(1)))?C.literal(""):C.literal("s"))),arg);
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* decide whether a shopkeeper thinks an item belongs to her */
export function billable(shkpp,obj,roomno,reset_nocharge)
{
    shkpp=C.ptr(shkpp);
    obj=C.ptr(obj);
    roomno=C.i8(roomno);
    reset_nocharge=C.i8(reset_nocharge);
    /* in: non-null if shk has been validated;
                           * out: shk */
    let shkp=C.cell(shkpp,"struct monst *").value;
    /* if caller hasn't supplied a shopkeeper, look one up now */
    if(Number(!(shkp))) {
        if(Number(!(roomno))) return (C.i8(0));
        (shkp=shop_keeper(roomno));
        if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return (C.i8(0));
        (C.cell(shkpp,"struct monst *").value=shkp);
    }
    /* perhaps we threw it away earlier */
    if(Number(!!(onbill(obj,shkp,(C.i8(0)))||(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.FOOD_CLASS)&&C.field(obj,"obj","oeaten").value)))))) return (C.i8(0));
    /* outer container might be marked no_charge but still have contents
       which should be charged for; clear no_charge when picking things up */
    if(C.field(obj,"obj","no_charge").value) {
        if(Number(!!(Number(!((Number(C.field((obj),"obj","cobj").value!=0))))||(Number(!!(Number(contained_gold(obj,(C.i8(1)))==0n)&&Number(contained_cost(obj,shkp,0n,(C.i8(0)),C.i8(Number(!(reset_nocharge))))==0n))))))) (shkp=0);
        /* not billable */
        if(Number(!!(Number(!!(C.i32(reset_nocharge)&&Number(!(shkp))))&&Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)))) {
            (C.field(obj,"obj","no_charge").value=C.u32(0));
            if((Number(C.field((obj),"obj","cobj").value!=0))) picked_container(obj);
            /* clear no_charge */
        }
    }
    return C.i8((shkp?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

export function addtobill(obj,ininv,dummy,silent)
{
    obj=C.ptr(obj);
    ininv=C.i8(ininv);
    dummy=C.i8(dummy);
    silent=C.i8(silent);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["addtobill.shkp@121420",8],["addtobill.buf@122879",(1*256)]]);
    try {
    let shkp=C.local("addtobill.shkp@121420","struct monst *",0);
    let ltmp; let cltmp; let gltmp;
    let contentscount;
    let container;
    if(Number(!(billable(shkp.address,obj,C.cell(C.field(C.u,"you","ushops").address,"char").value,(C.i8(1)))))) return;
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        costly_gold(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value,C.field(obj,"obj","quan").value,silent);
        return;
    } else if(Number(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value==200)) {
        if(Number(!(silent))) C.variadic(137,C.literal("got that for free!"));
        return;
    }
    (ltmp=(cltmp=(gltmp=0n)));
    (container=C.i8((Number(C.field((obj),"obj","cobj").value!=0))));
    if(Number(!(C.field(obj,"obj","no_charge").value))) {
        (ltmp=get_cost(obj,shkp.value));
        if(C.field(obj,"obj","globby").value) (ltmp=C.i64(ltmp*get_pricing_units(obj)));
    }
    if(Number(!!(C.i32(C.field(obj,"obj","no_charge").value)&&Number(!(container))))) {
        (C.field(obj,"obj","no_charge").value=C.u32(0));
        return;
    }
    if(container) {
        (cltmp=contained_cost(obj,shkp.value,cltmp,(C.i8(0)),(C.i8(0))));
        (gltmp=contained_gold(obj,(C.i8(1))));
        if(ltmp) add_one_tobill(obj,dummy,shkp.value);
        if(cltmp) bill_box_content(obj,ininv,dummy,shkp.value);
        picked_container(obj);
        /* reset contained obj->no_charge */
        (ltmp=C.i64(ltmp+cltmp));
        if(gltmp) {
            costly_gold(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value,gltmp,silent);
            if(Number(!(ltmp))) return;
        }
        if(C.field(obj,"obj","no_charge").value) (C.field(obj,"obj","no_charge").value=C.u32(0));
        (contentscount=C.count_unpaid(C.field(obj,"obj","cobj").value));
    } else {
        /* !container */
        add_one_tobill(obj,dummy,shkp.value);
        (contentscount=0);
    }
    if(Number(!!(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp.value),"monst","msleeping").value)||Number(!(C.field((shkp.value),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp.value),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))&&Number(!(silent))))) {
        let buf=C.automatic("addtobill.buf@122879",(1*256));
        /* no need to update price quotes here; it was done by
           add_one_tobill above */
        if(Number(!(ltmp))) {
            C.variadic(138,C.literal("%s has no interest in %s."),C.Shknam(shkp.value),C.the(C.xname(obj)));
            return;
        }
        if(Number(!(ininv))) {
            C.variadic(139,C.literal("%s will cost you %ld %s%s."),C.The(C.xname(obj)),ltmp,C.currency(ltmp),((Number(C.field(obj,"obj","quan").value>1n))?C.literal(" each"):C.literal("")));
        } else {
            let save_quan=C.field(obj,"obj","quan").value;
            C.strcpy(buf,C.literal("\"For you,"));
            if((Number(!((C.field((shkp.value),"monst","mpeaceful").value))))) {
                C.strcat(buf,C.literal(" scum;"));
            } else if(Number(!(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","surcharge").value))) {
                C.strcat(buf,C.literal(" "));
                append_honorific(buf);
                C.strcat(buf,C.literal("; only"));
            }
            (C.field(obj,"obj","quan").value=1n);
            /* fool xname() into giving singular */
            C.set_voice(shkp.value,0,80,0);
            C.variadic(140,C.literal("%s %ld %s %s %s%s.\""),buf,ltmp,C.currency(ltmp),((Number(save_quan>1n))?C.literal("per"):((Number(!!(contentscount&&Number(!(C.field(obj,"obj","unpaid").value)))))?C.literal("for the contents of this"):C.literal("for this"))),C.xname(obj),((Number(!!(contentscount&&C.i32(C.field(obj,"obj","unpaid").value))))?C.staticAddress("and_its_contents"):C.literal("")));
            (C.field(obj,"obj","quan").value=save_quan);
        }
    } else if(Number(!(silent))) {
        if(ltmp) {
            C.set_voice(shkp.value,0,80,0);
            C.variadic(141,C.literal("list price of %s%s%s is %ld %s%s."),((Number(!!(contentscount&&Number(!(C.field(obj,"obj","unpaid").value)))))?C.staticAddress("the_contents_of"):C.literal("")),C.the(C.xname(obj)),((Number(!!(contentscount&&C.i32(C.field(obj,"obj","unpaid").value))))?C.staticAddress("and_its_contents"):C.literal("")),ltmp,C.currency(ltmp),((Number(C.field(obj,"obj","quan").value>1n))?C.literal(" each"):C.literal("")));
        } else {
            C.variadic(142,C.literal("%s does not notice."),C.Shknam(shkp.value));
        }
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function append_honorific(buf)
{
    buf=C.ptr(buf);
    /* (chooses among [0]..[3] normally; [1]..[4] after the
       Wizard has been killed or invocation ritual performed) */
    
    C.strcat(buf,C.cell((C.staticAddress("append_honorific.honored")+Number(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),3611,(C.literal("append_honorific"))),C.rn2(C.i32((C.i32((C.u64((BigInt((8*5))/BigInt(8)))))-1))))):C.rn2(C.i32((C.i32((C.u64((BigInt((8*5))/BigInt(8)))))-1)))))+C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","udemigod").value))))*8),"char *").value);
    if((Number(C.i32(C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mlet").value)==C.S_VAMPIRE))) C.strcat(buf,(C.i32((C.field(C.flags,"flag","female").value))?C.literal(" dark lady"):C.literal(" dark lord")));
 else if((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(16n))))!=C.u64(0n)))):((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_ELF))))))) C.strcat(buf,(C.i32((C.field(C.flags,"flag","female").value))?C.literal(" hiril"):C.literal(" hir")));
 else C.strcat(buf,(Number(!((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(8n))))!=C.u64(0n)))))?C.literal(" creature"):(C.i32((C.field(C.flags,"flag","female").value))?C.literal(" lady"):C.literal(" sir"))));
}

export function splitbill(obj,otmp)
{
    obj=C.ptr(obj);
    otmp=C.ptr(otmp);
    /* otmp has been split off from obj */
    let bp;
    let tmp;
    let shkp=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value);
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) {
        C.variadic(143,C.literal("splitbill: no resident shopkeeper??"));
        return;
    }
    (bp=onbill(obj,shkp,(C.i8(0))));
    if(Number(!(bp))) {
        C.variadic(144,C.literal("splitbill: not on bill?"));
        return;
    }
    if(Number(C.field(bp,"bill_x","bquan").value<C.field(otmp,"obj","quan").value)) {
        C.variadic(145,C.literal("Negative quantity on bill??"));
    }
    if(Number(C.field(bp,"bill_x","bquan").value==C.field(otmp,"obj","quan").value)) {
        C.variadic(146,C.literal("Zero quantity on bill??"));
    }
    (C.field(bp,"bill_x","bquan").value=C.i64(C.field(bp,"bill_x","bquan").value-C.field(otmp,"obj","quan").value));
    if(Number(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value==200)) {
        (C.field(otmp,"obj","unpaid").value=C.u32(0));
    } else {
        (tmp=C.field(bp,"bill_x","price").value);
        (bp=(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","bill_p").value+Number(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value)*C.sizes["struct bill_x"]));
        (C.field(bp,"bill_x","bo_id").value=C.field(otmp,"obj","o_id").value);
        (C.field(bp,"bill_x","bquan").value=C.field(otmp,"obj","quan").value);
        (C.field(bp,"bill_x","useup").value=(C.i8(0)));
        (C.field(bp,"bill_x","price").value=tmp);
        (()=>{const ref=C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct");const old=ref.value;ref.value=C.i32((old+1));return old;})();
    }
}

export function sub_one_frombill(obj,shkp)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    let bp;
    let eshkp;
    if(Number(((bp=onbill(obj,shkp,(C.i8(0)))))!=0)) {
        let otmp;
        (C.field(obj,"obj","unpaid").value=C.u32(0));
        if(Number(C.field(bp,"bill_x","bquan").value>C.field(obj,"obj","quan").value)) {
            (otmp=C.alloc(C.u32(BigInt(C.sizes["struct obj"]))));
            C.copy(otmp,obj,C.sizes["struct obj"]);
            (C.field(otmp,"obj","oextra").value=0);
            (C.field(bp,"bill_x","bo_id").value=(C.field(otmp,"obj","o_id").value=C.next_ident()));
            /* svc.context.ident++ */
            (C.field(otmp,"obj","where").value=C.i8(0));
            (C.field(otmp,"obj","quan").value=((C.field(bp,"bill_x","bquan").value=C.i64(C.field(bp,"bill_x","bquan").value-C.field(obj,"obj","quan").value))));
            (C.field(otmp,"obj","owt").value=C.u32(0));
            /* superfluous */
            (C.field(bp,"bill_x","useup").value=(C.i8(1)));
            add_to_billobjs(otmp);
            return;
        }
        (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
        (()=>{const ref=C.field(eshkp,"eshk","billct");const old=ref.value;ref.value=C.i32((old-1));return old;})();
        C.copy(bp,(C.field(eshkp,"eshk","bill_p").value+Number(C.field(eshkp,"eshk","billct").value)*C.sizes["struct bill_x"]),C.sizes["struct bill_x"]);
        return;
    } else if(C.field(obj,"obj","unpaid").value) {
        C.variadic(147,C.literal("sub_one_frombill: unpaid object not on bill"));
        (C.field(obj,"obj","unpaid").value=C.u32(0));
    }
}

/* recursive check of unpaid objects within nested containers. */
export function subfrombill(obj,shkp)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    let otmp;
    sub_one_frombill(obj,shkp);
    if((Number(C.field((obj),"obj","cobj").value!=0))) for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        if((Number(C.field((otmp),"obj","cobj").value!=0))) subfrombill(otmp,shkp);
 else sub_one_frombill(otmp,shkp);
    }
}

export function stolen_container(obj,shkp,price,ininv)
{
    obj=C.ptr(obj);
    shkp=C.ptr(shkp);
    price=C.i64(price);
    ininv=C.i8(ininv);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["stolen_container.shkp@127869",8]]);
    try {
    shkp=C.local("stolen_container.shkp@127869","struct monst *",shkp);
    let otmp;
    let bp;
    let billamt;
    /* the price of contained objects; caller handles top container */
    for((otmp=C.field(obj,"obj","cobj").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        (billamt=0n);
        if(Number(!(billable(shkp.address,otmp,C.i8(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value),(C.i8(1)))))) {
            /* billable() returns false for objects already on bill */
            if(Number(((bp=onbill(otmp,shkp.value,(C.i8(0)))))==0)) continue;
            ((Number(!!((Number(shkp.value!=(0)))||((C.__assert_fail(C.literal("shkp != NULL"),C.literal("shk.c"),3732,(C.literal("stolen_container"))),0))))));
            /* onbill() found shkp so it's not Null */
            /* this assumes that we're being called by stolen_value()
               (or by a recursive call to self on behalf of it) where
               the cost of this object is about to be added to shop
               debt in place of having it remain on the current bill */
            (billamt=C.i64((C.field(bp,"bill_x","bquan").value*C.field(bp,"bill_x","price").value)));
            sub_one_frombill(otmp,shkp.value);
            /* avoid double billing */
        }
        if(billamt) (price=C.i64(price+billamt));
 else if((C.i32(ininv)?C.i32(C.field(otmp,"obj","unpaid").value):Number(!(C.field(otmp,"obj","no_charge").value)))) (price=C.i64(price+C.i64((get_pricing_units(otmp)*get_cost(otmp,shkp.value)))));
        if((Number(C.field((otmp),"obj","cobj").value!=0))) (price=stolen_container(otmp,shkp.value,price,ininv));
    }
    return price;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function stolen_value(obj,x,y,peaceful,silent)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    peaceful=C.i8(peaceful);
    silent=C.i8(silent);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["stolen_value.shkp@129408",8],["stolen_value.buf@131583",(1*256)]]);
    try {
    let value=0n; let gvalue=0n; let billamt=0n;
    let roomno;
    let bp;
    let shkp=C.local("stolen_value.shkp@129408","struct monst *");
    let was_unpaid;
    let c_count=0n; let u_count=0n;
    if(Number(((shkp.value=find_objowner(obj,x,y)))!=0)) {
        (roomno=C.i8(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value));
    } else {
        (roomno=C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value);
    }
    /* gather information for message(s) prior to manipulating bill */
    (was_unpaid=C.i8((C.i32(C.field(obj,"obj","unpaid").value)?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    if((Number(C.field((obj),"obj","cobj").value!=0))) {
        (c_count=C.count_contents(obj,(C.i8(1)),(C.i8(0)),(C.i8(1)),(C.i8(0))));
        (u_count=C.count_contents(obj,(C.i8(1)),(C.i8(0)),(C.i8(0)),(C.i8(0))));
    }
    (shkp.value=0);
    if(Number(!(billable(shkp.address,obj,roomno,(C.i8(1)))))) {
        /* things already on the bill yield a not-billable result, so
           we need to check bill before deciding that shk doesn't care */
        if(Number(((bp=onbill(obj,shkp.value,(C.i8(0)))))!=0)) {
            ((Number(!!((Number(shkp.value!=(0)))||((C.__assert_fail(C.literal("shkp != NULL"),C.literal("shk.c"),3786,(C.literal("stolen_value"))),0))))));
            /* onbill() found shkp so it's not Null */
            /* shk does care; take obj off bill to avoid double billing */
            (billamt=C.i64((C.field(bp,"bill_x","bquan").value*C.field(bp,"bill_x","price").value)));
            sub_one_frombill(obj,shkp.value);
        }
        if(Number(!!(Number(!(bp))&&Number(!(u_count))))) return 0n;
    }
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        (gvalue=C.i64(gvalue+C.field(obj,"obj","quan").value));
    } else {
        if(billamt) (value=C.i64(value+billamt));
 else if(Number(!(C.field(obj,"obj","no_charge").value))) (value=C.i64(value+C.i64((get_pricing_units(obj)*get_cost(obj,shkp.value)))));
        if((Number(C.field((obj),"obj","cobj").value!=0))) {
            let ininv=C.i8((Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==3)||Number(C.i32(C.field(obj,"obj","where").value)==0)))));
            (value=C.i64(value+stolen_container(obj,shkp.value,0n,ininv)));
            if(Number(!(ininv))) (gvalue=C.i64(gvalue+contained_gold(obj,(C.i8(1)))));
        }
    }
    if(Number(C.i64((gvalue+value))==0n)) return 0n;
    (value=C.i64(value+gvalue));
    if(peaceful) {
        let credit_use=C.i8(Number(!(Number(!(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value)))));
        (value=check_credit(value,shkp.value));
        /* 'peaceful' affects general treatment, but doesn't affect
         * the fact that other code expects that all charges after the
         * shopkeeper is angry are included in robbed, not debit */
        if((Number(!((C.field((shkp.value),"monst","mpeaceful").value))))) (C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value=C.i64(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value+value));
 else (C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value=C.i64(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value+value));
        if(Number(!(silent))) {
            let buf=C.automatic("stolen_value.buf@131583",(1*256));
            let still=C.literal("");
            if(credit_use) {
                if(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value) {
                    C.variadic(148,C.literal("have %ld %s credit remaining."),C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value,C.currency(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value));
                    return value;
                } else if(Number(!(value))) {
                    C.variadic(149,C.literal("have no credit remaining."));
                    return C.i64(0);
                }
                (still=C.literal("still "));
            }
            C.variadic(150,buf,C.literal("%sowe %s %ld %s"),still,C.shkname(shkp.value),value,C.currency(value));
            if(u_count) C.variadic(151,C.eos(buf),C.literal(" for %s%sits contents"),(C.i32(was_unpaid)?C.literal("it and "):C.literal("")),((Number(c_count>u_count))?C.literal("some of "):C.literal("")));
 else if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.COIN_CLASS)) C.variadic(152,C.eos(buf),C.literal(" for %s"),((Number(C.field(obj,"obj","quan").value>1n))?C.literal("them"):C.literal("it")));
            /* u_count > 0 implies Has_contents(obj) */
            C.variadic(153,C.literal("%s!"),buf);
            /* "You owe <shk> N zorkmids for it!" */
        }
    } else {
        (C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value=C.i64(C.field((C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value+value));
        if(Number(!(silent))) {
            if(C.canseemon(shkp.value)) {
                C.variadic(154,C.literal("%s booms: \"%s, you are a thief!\""),C.Shknam(shkp.value),C.field(C.svp,"instance_globals_saved_p","plname").address);
            } else if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
                C.variadic(155,C.literal("You hear a scream, \"Thief!\""));
                /* Deaf-aware */
            }
        }
        hot_pursuit(shkp.value);
        C.angry_guards((C.i8(0)));
    }
    return value;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* opposite of costly_gold(); hero has dropped gold in a shop;
   called from sellobj(); ought to be called from subfrombill() too */
export function donate_gold(gltmp,shkp,selling)
{
    gltmp=C.i64(gltmp);
    shkp=C.ptr(shkp);
    selling=C.i8(selling);
    /* T: dropped in shop; F: kicked and landed in shop */
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    if(Number(C.field(eshkp,"eshk","debit").value>=gltmp)) {
        if(C.field(eshkp,"eshk","loan").value) {
            /* you carry shop's gold */
            if(Number(C.field(eshkp,"eshk","loan").value>gltmp)) (C.field(eshkp,"eshk","loan").value=C.i64(C.field(eshkp,"eshk","loan").value-gltmp));
 else (C.field(eshkp,"eshk","loan").value=0n);
        }
        (C.field(eshkp,"eshk","debit").value=C.i64(C.field(eshkp,"eshk","debit").value-gltmp));
        C.variadic(156,C.literal("debt is %spaid off."),(C.field(eshkp,"eshk","debit").value?C.literal("partially "):C.literal("")));
    } else {
        let delta=C.i64((gltmp-C.field(eshkp,"eshk","debit").value));
        (C.field(eshkp,"eshk","credit").value=C.i64(C.field(eshkp,"eshk","credit").value+delta));
        if(C.field(eshkp,"eshk","debit").value) {
            (C.field(eshkp,"eshk","debit").value=0n);
            (C.field(eshkp,"eshk","loan").value=0n);
            C.variadic(157,C.literal("debt is paid off."));
        }
        if(Number(C.field(eshkp,"eshk","credit").value==delta)) C.variadic(158,C.literal("have %sestablished %ld %s credit."),(Number(!(selling))?C.literal("re-"):C.literal("")),delta,C.currency(delta));
 else C.variadic(159,C.literal("%ld %s added%s to your credit; total is now %ld %s."),delta,C.currency(delta),(Number(!(selling))?C.literal(" back"):C.literal("")),C.field(eshkp,"eshk","credit").value,C.currency(C.field(eshkp,"eshk","credit").value));
    }
}

export function sellobj_state(deliberate)
{
    deliberate=C.i32(deliberate);
    /* If we're deliberately dropping something, there's no automatic
       response to the shopkeeper's "want to sell" query; however, if we
       accidentally drop anything, the shk will buy it/them without asking.
       This retains the old pre-query risk that slippery fingers while in
       shops entailed:  you drop it, you've lost it.
     */
    (C.field(C.gs,"instance_globals_s","sell_response").value=C.i8(((Number(deliberate!=(0)))?0:97)));
    (C.field(C.gs,"instance_globals_s","sell_how").value=deliberate);
    (C.field(C.ga,"instance_globals_a","auto_credit").value=(C.i8(0)));
}

export function sellobj(obj,x,y)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["sellobj.qbuf@138624",(1*256)],["sellobj.qbuf@140212",(1*256)],["sellobj.qsfx@140225",(1*256)]]);
    try {
    let shkp;
    let eshkp;
    let ltmp=0n; let cltmp=0n; let gltmp=0n; let offer; let shkmoney;
    let saleitem; let cgold=(C.i8(0)); let container=C.i8((Number(C.field((obj),"obj","cobj").value!=0)));
    let isgold=C.i8((Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)));
    let only_partially_your_contents=(C.i8(0));
    if(Number(!(C.cell(C.field(C.u,"you","ushops").address,"char").value))) return;
    /* do cheapest exclusion test first */
    (shkp=shop_keeper(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return;
    if(Number(!(costly_spot(x,y)))) return;
    if(Number(!!(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)&&Number(!(container))))&&Number(!(isgold))))) {
        sub_one_frombill(obj,shkp);
        return;
    }
    if(container) {
        /* find the price of content before subfrombill */
        (cltmp=contained_cost(obj,shkp,cltmp,(C.i8(1)),(C.i8(0))));
        /* find the value of contained gold */
        (gltmp=C.i64(gltmp+contained_gold(obj,(C.i8(1)))));
        (cgold=C.i8((Number(gltmp>0n))));
    }
    (saleitem=C.saleable(shkp,obj));
    if(Number(!!(Number(!!(Number(!(isgold))&&Number(!(C.field(obj,"obj","unpaid").value))))&&C.i32(saleitem)))) (ltmp=set_cost(obj,shkp));
    (offer=C.i64((ltmp+cltmp)));
    /* you dropped something of your own - probably want to sell it */
    rouse_shk(shkp,(C.i8(1)));
    /* wake up sleeping or paralyzed shk */
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) {
        /* they become shop-objects, no pay */
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(160,C.literal("Thank you, scum!"));
        } else {
            C.variadic(161,C.literal("%s smirks with satisfaction."),C.Shknam(shkp));
        }
        subfrombill(obj,shkp);
        return;
    }
    /* get one case out of the way: nothing to sell, and no gold */
    if(Number(!!(Number(!((Number(!!(C.i32(isgold)||C.i32(cgold))))))&&(Number(!!(Number((C.i64((offer+gltmp)))==0n)||Number(C.field(C.gs,"instance_globals_s","sell_how").value==(2)))))))) {
        let unpaid=is_unpaid(obj);
        if(container) {
            dropped_container(obj,shkp,(C.i8(0)));
            if(Number(!(C.field(obj,"obj","unpaid").value))) (C.field(obj,"obj","no_charge").value=C.u32(1));
            if(unpaid) subfrombill(obj,shkp);
        } else (C.field(obj,"obj","no_charge").value=C.u32(1));
        if(Number(!!(Number(!!(Number(!(unpaid))&&(Number(C.field(C.gs,"instance_globals_s","sell_how").value!=(2)))))&&Number(!(special_stock(obj,shkp,(C.i8(0)))))))) C.variadic(162,C.literal("%s seems uninterested."),C.Shknam(shkp));
        return;
    }
    if(C.field(eshkp,"eshk","robbed").value) {
        /* bones; shop robbed by previous customer */
        if(isgold) (offer=C.field(obj,"obj","quan").value);
 else if(cgold) (offer=C.i64(offer+C.i64(cgold)));
        if(((C.field(eshkp,"eshk","robbed").value=C.i64(C.field(eshkp,"eshk","robbed").value-C.i64(Number(offer<0n)))))) (C.field(eshkp,"eshk","robbed").value=0n);
        if(Number(!!(Number(!!(offer&&Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(163,C.literal("Thank you for your contribution to restock this recently plundered shop."));
        }
        subfrombill(obj,shkp);
        return;
    }
    if(Number(!!(C.i32(isgold)||C.i32(cgold)))) {
        if(Number(!(cgold))) (gltmp=C.field(obj,"obj","quan").value);
        donate_gold(gltmp,shkp,(C.i8(1)));
        if(Number(!!(Number(!(offer))||Number(C.field(C.gs,"instance_globals_s","sell_how").value==(2))))) {
            if(Number(!(isgold))) {
                if(container) dropped_container(obj,shkp,(C.i8(0)));
                if(Number(!(C.field(obj,"obj","unpaid").value))) (C.field(obj,"obj","no_charge").value=C.u32(1));
                subfrombill(obj,shkp);
            }
            return;
        }
    }
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(!(saleitem))&&Number(!((Number(!!(C.i32(container)&&Number(cltmp>0n)))))))))||Number(C.field(eshkp,"eshk","billct").value==200)))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.BALL_CLASS)))||Number(C.i32(C.field(obj,"obj","oclass").value)==C.CHAIN_CLASS)))||Number(offer==0n)))||(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.FOOD_CLASS)&&C.field(obj,"obj","oeaten").value)))))||(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAX_CANDLE))))&&Number(C.field(obj,"obj","age").value<C.i64((20n*C.i64(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_cost").value)))))))))) {
        C.variadic(164,C.literal("%s seems uninterested%s."),C.Shknam(shkp),(C.i32(cgold)?C.literal(" in the rest"):C.literal("")));
        if(container) dropped_container(obj,shkp,(C.i8(0)));
        (C.field(obj,"obj","no_charge").value=C.u32(1));
        return;
    }
    (shkmoney=C.money_cnt(C.field(shkp,"monst","minvent").value));
    if(Number(!(shkmoney))) {
        let c; let qbuf=C.automatic("sellobj.qbuf@138624",(1*256));
        let tmpcr=C.i64(((C.i64(((C.i64((offer*9n)))/10n)))+C.i64((Number(offer<=1n)))));
        if(Number(!!(Number(C.field(C.gs,"instance_globals_s","sell_how").value==(0))||C.i32(C.field(C.ga,"instance_globals_a","auto_credit").value)))) {
            (c=(C.field(C.gs,"instance_globals_s","sell_response").value=C.i8(121)));
        } else if(Number(C.i32(C.field(C.gs,"instance_globals_s","sell_response").value)!=110)) {
            C.variadic(165,C.literal("%s cannot pay you at present."),C.Shknam(shkp));
            C.variadic(166,qbuf,C.literal("Will you accept %ld %s in credit for "),tmpcr,C.currency(tmpcr));
            record_price_quote(C.i32(C.field(obj,"obj","otyp").value),C.u64(C.i64((tmpcr/C.field(obj,"obj","quan").value))),(C.i8(0)));
            (c=C.yn_function(C.safe_qbuf(qbuf,qbuf,C.literal("?"),obj,C.functionAddress("doname"),C.functionAddress("thesimpleoname"),((Number(C.field(obj,"obj","quan").value==1n))?C.literal("that"):C.literal("those"))),C.ynaqchars,C.i8(121),(C.i8(1))));
            if(Number(C.i32(c)==97)) {
                (c=C.i8(121));
                (C.field(C.ga,"instance_globals_a","auto_credit").value=(C.i8(1)));
            }
        } else (c=C.i8(110));
        /* previously specified "quit" */
        if(Number(C.i32(c)==121)) {
            shk_names_obj(shkp,obj,(((Number(C.field(C.gs,"instance_globals_s","sell_how").value!=(0)))?C.literal("traded %s for %ld zorkmid%s in %scredit."):C.literal("relinquish %s and acquire %ld zorkmid%s in %scredit."))),tmpcr,((Number(C.field(eshkp,"eshk","credit").value>0n))?C.literal("additional "):C.literal("")));
            (C.field(eshkp,"eshk","credit").value=C.i64(C.field(eshkp,"eshk","credit").value+tmpcr));
            if(container) dropped_container(obj,shkp,(C.i8(1)));
            subfrombill(obj,shkp);
        } else {
            if(Number(C.i32(c)==113)) (C.field(C.gs,"instance_globals_s","sell_response").value=C.i8(110));
            if(container) dropped_container(obj,shkp,(C.i8(0)));
            if(Number(!(C.field(obj,"obj","unpaid").value))) (C.field(obj,"obj","no_charge").value=C.u32(1));
            subfrombill(obj,shkp);
        }
    } else {
        let qbuf=C.automatic("sellobj.qbuf@140212",(1*256)); let qsfx=C.automatic("sellobj.qsfx@140225",(1*256));
        let short_funds=C.i8((Number(offer>shkmoney))); let one;
        if(short_funds) (offer=shkmoney);
        if(Number(!(C.field(C.gs,"instance_globals_s","sell_response").value))) {
            let yourc=0n; let shksc;
            if(container) {
                /* number of items owned by shk */
                (shksc=C.count_contents(obj,(C.i8(1)),(C.i8(1)),(C.i8(0)),(C.i8(1))));
                /* number of items owned by you (total - shksc) */
                (yourc=C.i64((C.count_contents(obj,(C.i8(1)),(C.i8(1)),(C.i8(1)),(C.i8(1)))-shksc)));
                (only_partially_your_contents=C.i8(Number(!!(shksc&&yourc))));
            }
            /*
               "<shk> offers * for ..." query formatting.
               Normal item(s):
                "... your <object>.  Sell it?"
                "... your <objects>.  Sell them?"
               A container is either owned by the hero, or already
               owned by the shk (!ltmp), or the shk isn't interested
               in buying it (also !ltmp).  It's either empty (!cltmp)
               or it has contents owned by the hero or it has some
               contents owned by the hero and others by the shk.
               (The case where it has contents already entirely owned
               by the shk is treated the same was if it were empty
               since the hero isn't selling any of those contents.)
               Your container and shk is willing to buy it:
                "... your <empty bag>.  Sell it?"
                "... your <bag> and its contents.  Sell them?"
                "... your <bag> and item inside.  Sell them?"
                "... your <bag> and items inside.  Sell them?"
               Your container but shk only cares about the contents:
                "... your item in your <bag>.  Sell it?"
                "... your items in your <bag>.  Sell them?"
               Shk's container:
                "... your item in the <bag>.  Sell it?"
                "... your items in the <bag>.  Sell them?"
              FIXME:
               "your items" should sometimes be "some of your items"
               (when container has some stuff the shk is willing to buy
               and other stuff he or she doesn't care about); likewise,
               "your item" should sometimes be "one of your items".
               That would make the prompting even more verbose so
               living without it might be a good thing.
              FIXME too:
               when container's contents are unknown, plural "items"
               should be used to not give away information.
             */
            C.variadic(167,qbuf,C.literal("%s offers%s %ld gold piece%s for %s%s "),C.Shknam(shkp),(C.i32(short_funds)?C.literal(" only"):C.literal("")),offer,(((Number((offer)==C.i64(1)))?C.literal(""):C.literal("s"))),((Number(!!(cltmp&&Number(!(ltmp)))))?(((Number(yourc==1n))?C.literal("your item in "):C.literal("your items in "))):C.literal("")),(C.i32(C.field(obj,"obj","unpaid").value)?C.literal("the"):C.literal("your")));
            (one=C.i8((Number(!(ltmp))?(Number(yourc==1n)):(Number(!!(Number(C.field(obj,"obj","quan").value==1n)&&Number(!(cltmp))))))));
            C.variadic(168,qsfx,C.literal("%s.  Sell %s?"),((Number(!!(cltmp&&ltmp)))?((C.i32(only_partially_your_contents)?(((Number(yourc==1n))?C.literal(" and item inside"):C.literal(" and items inside"))):C.staticAddress("and_its_contents"))):C.literal("")),(C.i32(one)?C.literal("it"):C.literal("them")));
            record_price_quote(C.i32(C.field(obj,"obj","otyp").value),C.u64(C.i64((offer/C.field(obj,"obj","quan").value))),(C.i8(0)));
            C.safe_qbuf(qbuf,qbuf,qsfx,obj,C.functionAddress("xname"),C.functionAddress("simpleonames"),(C.i32(one)?C.literal("that"):C.literal("those")));
        } else (C.cell((qbuf+Number(0)*1),"char").value=C.i8(0));
        /* just to pacify lint */
        switch((C.i32(C.field(C.gs,"instance_globals_s","sell_response").value)?C.i32(C.field(C.gs,"instance_globals_s","sell_response").value):C.i32(C.yn_function(qbuf,C.ynaqchars,C.i8(110),(C.i8(1)))))) {
            case (113):
                (C.field(C.gs,"instance_globals_s","sell_response").value=C.i8(110));
            ;
            /*FALLTHRU*/
            case (110):
                if(container) dropped_container(obj,shkp,(C.i8(0)));
            if(Number(!(C.field(obj,"obj","unpaid").value))) (C.field(obj,"obj","no_charge").value=C.u32(1));
            subfrombill(obj,shkp);
            break;
            case (97):
                (C.field(C.gs,"instance_globals_s","sell_response").value=C.i8(121));
            ;
            /*FALLTHRU*/
            case (121):
                if(container) dropped_container(obj,shkp,(C.i8(1)));
            if(Number(!!(Number(!(C.field(obj,"obj","unpaid").value))&&Number(!(saleitem))))) (C.field(obj,"obj","no_charge").value=C.u32(1));
            subfrombill(obj,shkp);
            pay(C.i64((-offer)),shkp);
            shk_names_obj(shkp,obj,((Number(C.field(C.gs,"instance_globals_s","sell_how").value!=(0)))?(((Number(!!(Number(!!(Number(!(ltmp))&&cltmp))&&C.i32(only_partially_your_contents))))?C.literal("sold some items inside %s for %ld gold piece%s.%s"):C.literal("sold %s for %ld gold piece%s.%s"))):C.literal("relinquish %s and receive %ld gold piece%s in compensation.%s")),offer,C.literal(""));
            break;
            default:
                C.variadic(169,C.literal("invalid sell response"));
        }
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function doinvbill(mode)
{
    mode=C.i32(mode);
    /* 0: deliver count 1: paged */
    let shkp;
    let eshkp;
    let bp; let end_bp;
    let obj;
    let totused;
    let buf_p;
    let datawin;
    quit: {
    (shkp=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) {
        if(Number(mode!=0)) C.variadic(170,C.literal("doinvbill: no shopkeeper?"));
        return 0;
    }
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if(Number(mode==0)) {
        /* count expended items, so that the `I' command can decide
           whether to include 'x' in its prompt string */
        let cnt=(Number(!(C.field(eshkp,"eshk","debit").value))?0:1);
        for(((bp=C.field(eshkp,"eshk","bill_p").value),(end_bp=(C.field(eshkp,"eshk","bill_p").value+Number(C.field(eshkp,"eshk","billct").value)*C.sizes["struct bill_x"])));Number(bp<end_bp);(()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return old;})()) if(Number(!!(C.i32(C.field(bp,"bill_x","useup").value)||(Number(!!(Number(((obj=bp_to_obj(bp)))!=0)&&Number(C.field(obj,"obj","quan").value<C.field(bp,"bill_x","bquan").value))))))) (()=>{const old=cnt;cnt=C.i32((old+1));return old;})();

        return cnt;
    }
    (datawin=C.callback(4,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(5,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal("Unpaid articles already used up:"));
    C.callback(6,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal(""));
    (totused=0n);
    for(((bp=C.field(eshkp,"eshk","bill_p").value),(end_bp=(C.field(eshkp,"eshk","bill_p").value+Number(C.field(eshkp,"eshk","billct").value)*C.sizes["struct bill_x"])));Number(bp<end_bp);(()=>{const old=bp;bp=C.ptr((old+Number(C.sizes["struct bill_x"])));return old;})()) {
        (obj=bp_to_obj(bp));
        if(Number(!(obj))) {
            C.variadic(171,C.literal("Bad shopkeeper administration."));
            break quit; /* original goto */
        }
        if(Number(!!(C.i32(C.field(bp,"bill_x","useup").value)||Number(C.field(bp,"bill_x","bquan").value>C.field(obj,"obj","quan").value)))) {
            let oquan; let uquan; let thisused;
            (oquan=C.field(obj,"obj","quan").value);
            (uquan=((C.i32(C.field(bp,"bill_x","useup").value)?C.field(bp,"bill_x","bquan").value:C.i64((C.field(bp,"bill_x","bquan").value-oquan)))));
            (thisused=C.i64((C.field(bp,"bill_x","price").value*uquan)));
            (totused=C.i64(totused+thisused));
            (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old+1));return old;})();
            /* suppress "(unpaid)" suffix */
            /* Why 'x'?  To match `I x', more or less. */
            (buf_p=C.xprname(obj,0,C.i8(120),(C.i8(0)),thisused,uquan));
            (()=>{const ref=C.field(C.iflags,"instance_flags","suppress_price");const old=ref.value;ref.value=C.i32((old-1));return old;})();
            C.callback(7,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,buf_p);
        }
    }
    if(C.field(eshkp,"eshk","debit").value) {
        /* additional shop debt which has no itemization available */
        if(totused) C.callback(8,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal(""));
        (totused=C.i64(totused+C.field(eshkp,"eshk","debit").value));
        (buf_p=C.xprname(0,C.literal("usage charges and/or other fees"),C.i8(C.GOLD_SYM),(C.i8(0)),C.field(eshkp,"eshk","debit").value,0n));
        C.callback(9,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,buf_p);
    }
    (buf_p=C.xprname(0,C.literal("Total:"),C.i8(42),(C.i8(0)),totused,0n));
    C.callback(10,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,C.literal(""));
    C.callback(11,(C.field(C.windowprocs,"window_procs","win_putstr").value),datawin,0,buf_p);
    C.callback(12,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),datawin,(C.i8(0)));
    } /* source quit: */
    C.callback(13,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),datawin);
    return 0;
}

/* adjust tin, egg, or corpse price based on monster data */
export function corpsenm_price_adj(obj)
{
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["corpsenm_price_adj.icost@147934",(C.sizes["struct shk_icost"]*11)]]);
    try {
    let val=0n;
    if(Number(!!((Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.EGG)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE))))&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS))))))) {
        let i;
        let tmp=1n;
        let ptr=(C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]);
        let icost=C.automatic("corpsenm_price_adj.icost@147934",(C.sizes["struct shk_icost"]*11)); C.zero(icost,(C.sizes["struct shk_icost"]*11)); C.initialize(icost,"struct shk_icost[11]",[[C.FIRE_RES,2],[C.SLEEP_RES,3],[C.COLD_RES,2],[C.DISINT_RES,5],[C.SHOCK_RES,4],[C.POISON_RES,2],[C.ACID_RES,1],[C.STONE_RES,3],[C.TELEPORT,2],[C.TELEPORT_CONTROL,3],[C.TELEPAT,5]]);
        for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["struct shk_icost"]*11))/BigInt(C.sizes["struct shk_icost"]))))));(()=>{const old=i;i=C.i32((old+1));return old;})()) if(C.intrinsic_possible(C.field((icost+Number(i)*C.sizes["struct shk_icost"]),"shk_icost","trinsic").value,ptr)) (tmp=C.i64(tmp+C.i64(C.field((icost+Number(i)*C.sizes["struct shk_icost"]),"shk_icost","cost").value)));

        if((Number((C.i32((C.i32(C.field((ptr),"permonst","geno").value)&4096)))!=0))) (tmp=C.i64(tmp+C.i64(50)));
        (val=C.i64(((Number((1)>((C.i32(((C.i32((C.i32(C.field(ptr,"permonst","mlevel").value)-1)))*2)))))?(1):((C.i32(((C.i32((C.i32(C.field(ptr,"permonst","mlevel").value)-1)))*2))))))));
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)) (val=C.i64(val+C.i64(((Number((1)>((C.i32(Math.trunc((C.i32(C.field(ptr,"permonst","cnutrit").value)/30))))))?(1):((C.i32(Math.trunc((C.i32(C.field(ptr,"permonst","cnutrit").value)/30))))))))));
        (val=C.i64((val*tmp)));
    }
    return val;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function getprice(obj,shk_buying)
{
    obj=C.ptr(obj);
    shk_buying=C.i8(shk_buying);
    let tmp=C.i64(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_cost").value);
    if(C.field(obj,"obj","oartifact").value) {
        (tmp=C.arti_cost(obj));
        if(shk_buying) (tmp=C.i64(tmp/C.i64(4)));
    }
    switch(C.i32(C.field(obj,"obj","oclass").value)) {
        case (C.FOOD_CLASS):
            (tmp=C.i64(tmp+corpsenm_price_adj(obj)));
        /* simpler hunger check, (2-4)*cost */
        if(Number(!!(Number(C.field(C.u,"you","uhs").value>=C.u32(C.HUNGRY))&&Number(!(shk_buying))))) (tmp=C.i64(tmp*C.i64(C.field(C.u,"you","uhs").value)));
        if(C.field(obj,"obj","oeaten").value) (tmp=0n);
        break;
        case (C.WAND_CLASS):
            if(Number(C.i32(C.field(obj,"obj","spe").value)==C.i32((-1)))) (tmp=0n);
        break;
        case (C.POTION_CLASS):
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_WATER)&&Number(!(C.field(obj,"obj","blessed").value))))&&Number(!(C.field(obj,"obj","cursed").value))))) (tmp=0n);
        break;
        case (C.ARMOR_CLASS):
            case (C.WEAPON_CLASS):
                if(Number(C.i32(C.field(obj,"obj","spe").value)>0)) (tmp=C.i64(tmp+C.i64((10n*C.i64(C.field(obj,"obj","spe").value)))));
        break;
        case (C.TOOL_CLASS):
            if(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAX_CANDLE))))&&Number(C.field(obj,"obj","age").value<C.i64((20n*C.i64(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_cost").value))))))) (tmp=C.i64(tmp/2n));
        break;
    }
    return tmp;
}

/* shk catches thrown pick-axe */
export function shkcatch(obj,x,y)
{
    obj=C.ptr(obj);
    x=C.i16(x);
    y=C.i16(y);
    let shkp;
    (shkp=shop_keeper(inside_shop(x,y)));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return 0;
    if(Number(!!(Number(!!(Number(!!(Number(!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))))&&(Number(!!(Number(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)!=C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value))||Number(!(inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))))))&&Number(C.dist2(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,x,y)<3)))&&(Number(!!(Number(C.i32(C.field(shkp,"monst","mx").value)!=C.i32(x))||Number(C.i32(C.field(shkp,"monst","my").value)!=C.i32(y)))))))) {
        /* if it is the shk's pos, you hit and anger him */
        if(Number(!!(Number(!!(Number(C.mnearto(shkp,x,y,(C.i8(1)),C.u32(4))==2)&&Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
            ;
            C.variadic(172,C.literal("Out of my way, scum!"));
        }
        if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))) {
            C.variadic(173,C.literal("%s nimbly%s catches %s."),C.Shknam(shkp),((Number(!!(Number(C.i32(x)==C.i32(C.field(shkp,"monst","mx").value))&&Number(C.i32(y)==C.i32(C.field(shkp,"monst","my").value)))))?C.literal(""):C.literal(" reaches over and")),C.the(C.xname(obj)));
            if(Number(!((Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))))) C.map_invisible(x,y);
            C.callback(14,(C.field(C.windowprocs,"window_procs","win_delay_output").value));
            C.callback(15,(C.field(C.windowprocs,"window_procs","win_mark_synch").value));
        }
        subfrombill(obj,shkp);
        C.mpickobj(shkp,obj);
        return shkp;
    }
    return 0;
}

export function add_damage(x,y,cost)
{
    x=C.i16(x);
    y=C.i16(y);
    cost=C.i64(cost);
    let tmp_dam;
    let shops;
    if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))) {
        let mtmp;
        /* Don't schedule for repair unless it's a real shop entrance */
        for((shops=C.in_rooms(x,y,C.SHOPBASE));C.cell(shops,"char").value;(()=>{const old=shops;shops=C.ptr((old+Number(1)));return old;})()) if(Number(!!(Number(!!(Number(((mtmp=shop_keeper(C.cell(shops,"char").value)))!=0)&&Number(C.i32(x)==C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value))))&&Number(C.i32(y)==C.i32(C.field(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value))))) break;

        if(Number(!(C.cell(shops,"char").value))) return;
    }
    for((tmp_dam=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value);tmp_dam;(tmp_dam=C.field(tmp_dam,"damage","next").value)) if(Number(!!(Number(C.i32(C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","x").value)==C.i32(x))&&Number(C.i32(C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","y").value)==C.i32(y))))) {
        (C.field(tmp_dam,"damage","cost").value=C.i64(C.field(tmp_dam,"damage","cost").value+cost));
        (C.field(tmp_dam,"damage","when").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
        /* needed by pay_for_damage() */
        return;
    }

    (tmp_dam=C.alloc(C.u32(BigInt(C.sizes["struct damage"]))));
    C.memset(tmp_dam,0,BigInt(C.sizes["struct damage"]));
    (C.field(tmp_dam,"damage","when").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
    (C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","x").value=x);
    (C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","y").value=y);
    (C.field(tmp_dam,"damage","cost").value=cost);
    (C.field(tmp_dam,"damage","typ").value=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value);
    (C.field(tmp_dam,"damage","flags").value=C.u8(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value));
    (C.field(tmp_dam,"damage","next").value=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value=tmp_dam);
    /* If player saw damage, display walls post-repair as walls, not stone */
    if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value=(C.u8(255)));
}

/* is shopkeeper impaired, so they cannot act? */
export function shk_impaired(shkp)
{
    shkp=C.ptr(shkp);
    if(Number(!!(Number(!!(Number(!(shkp))||Number(!(C.field(shkp,"monst","isshk").value))))||Number(!(inhishop(shkp)))))) return (C.i8(1));
    if(Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","following").value)))) return (C.i8(1));
    return (C.i8(0));
}

/* is damage dam repairable by shopkeeper shkp? */
export function repairable_damage(dam,shkp)
{
    dam=C.ptr(dam);
    shkp=C.ptr(shkp);
    let x; let y;
    let ttmp;
    let mtmp;
    if(Number(!!(Number(!(dam))||C.i32(shk_impaired(shkp))))) return (C.i8(0));
    (x=C.field(C.field(dam,"damage","place").address,"nhcoord","x").value);
    (y=C.field(C.field(dam,"damage","place").address,"nhcoord","y").value);
    /* too soon to fix it? */
    if(Number((C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(dam,"damage","when").value)))<C.i64(5))) return (C.i8(0));
    /* is it a wall? don't fix if anyone is in the way */
    if(Number(!((Number(C.i32((C.field(dam,"damage","typ").value))>=C.ROOM))))) {
        if(Number(!!(Number(!!((Number(!!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.PASSES_WALLS)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))||(Number(!!(Number(C.i32(x)==C.i32(C.field(shkp,"monst","mx").value))&&Number(C.i32(y)==C.i32(C.field(shkp,"monst","my").value)))))))||(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&Number(!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n))))))))))) return (C.i8(0));
    }
    /* is it a trap? don't fix if hero or monster is in it */
    (ttmp=C.t_at(x,y));
    if(ttmp) {
        if((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))) return (C.i8(0));
        if(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&C.i32(C.field(mtmp,"monst","mtrapped").value)))) return (C.i8(0));
    }
    /* does it belong to shkp? */
    if(Number(!(C.strchr(C.in_rooms(x,y,C.SHOPBASE),C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value))))) return (C.i8(0));
    return (C.i8(1));
}

/* find any damage shopkeeper shkp could repair. returns NULL is none found */
export function find_damage(shkp)
{
    shkp=C.ptr(shkp);
    let dam=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value;
    if(shk_impaired(shkp)) return 0;
    while(dam) {
        if(repairable_damage(dam,shkp)) return dam;
        (dam=C.field(dam,"damage","next").value);
    }
    return 0;
}

export function discard_damage_struct(dam)
{
    dam=C.ptr(dam);
    if(Number(!(dam))) return;
    if(Number(dam==C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value)) {
        (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value=C.field(dam,"damage","next").value);
    } else {
        let prev=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value;
        while(Number(!!(prev&&Number(C.field(prev,"damage","next").value!=dam)))) (prev=C.field(prev,"damage","next").value);

        if(prev) (C.field(prev,"damage","next").value=C.field(dam,"damage","next").value);
    }
    C.memset(dam,0,BigInt(C.sizes["struct damage"]));
    C.free(dam);
}

/* discard all damage structs owned by shopkeeper */
export function discard_damage_owned_by(shkp)
{
    shkp=C.ptr(shkp);
    let dam=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value; let dam2; let prevdam=0;
    while(dam) {
        let x=C.field(C.field(dam,"damage","place").address,"nhcoord","x").value; let y=C.field(C.field(dam,"damage","place").address,"nhcoord","y").value;
        if(C.strchr(C.in_rooms(x,y,C.SHOPBASE),C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value))) {
            (dam2=C.field(dam,"damage","next").value);
            if(prevdam) (C.field(prevdam,"damage","next").value=dam2);
            if(Number(dam==C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value)) (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value=dam2);
            C.memset(dam,0,BigInt(C.sizes["struct damage"]));
            (C.free(dam),(dam=(0)));
        } else {
            (prevdam=dam);
            (dam2=C.field(dam,"damage","next").value);
        }
        (dam=dam2);
    }
}

/* Shopkeeper tries to repair damage belonging to them */
export function shk_fixes_damage(shkp)
{
    shkp=C.ptr(shkp);
    let dam=find_damage(shkp);
    let shk_closeby;
    if(Number(!(dam))) return;
    (shk_closeby=C.i8((Number(C.dist2((C.field((shkp),"monst","mx").value),(C.field((shkp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=C.i32(((C.i32(Math.trunc((8/2))))*(C.i32(Math.trunc((8/2))))))))));
    if(C.canseemon(shkp)) {
        C.variadic(174,C.literal("%s whispers %s."),C.Shknam(shkp),(C.i32(shk_closeby)?C.literal("an incantation"):C.literal("something")));
    } else if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&C.i32(shk_closeby)))) {
        ;
        C.variadic(175,C.literal("someone muttering an incantation."));
    }
    repair_damage(shkp,dam,(C.i8(0)));
    discard_damage_struct(dam);
}

/* find eligible spots to move items from a gap in a shop's wall that is
   being repaired; this guarantees that items will end up inside shkp's
   shop (possibly in the "free spot" or even in doorway or an adjacent
   wall gap), but if they are in a gap in a wall shared by two shops
   they might have started in the other shop */
export function litter_getpos(litter,x,y,shkp)
{
    litter=C.ptr(litter);
    x=C.i16(x);
    y=C.i16(y);
    shkp=C.ptr(shkp);
    /* array of 9 uint8's */
    let i; let ix; let iy;
    let k=C.u8(0);
    /* number of adjacent shop spots */
    C.memset(litter,0,C.u64((C.u64(9)*BigInt(1))));
    if(Number(!!(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value&&Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.ROOM))))))) {
        for((i=0);Number(i<9);(()=>{const old=i;i=C.i32((old+1));return old;})()) {
            (ix=C.i32((C.i32(x)+(C.i32(((C.i32((i%3)))-1))))));
            (iy=C.i32((C.i32(y)+(C.i32(((C.i32(Math.trunc((i/3))))-1))))));
            if(Number(!!(Number(!!(Number(i==4)||Number(!(C.isok(C.i16(ix),C.i16(iy))))))||Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(ix)*(C.sizes["struct rm"]*21))+Number(iy)*C.sizes["struct rm"]),"rm","typ").value))>=C.POOL))))))) continue;
            (C.cell((litter+Number(i)*1),"unsigned char").value=C.u8(2));
            if(Number(C.i32(inside_shop(C.i16(ix),C.i16(iy)))==C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value))) {
                (C.cell((litter+Number(i)*1),"unsigned char").value=C.u8(C.u32(C.cell((litter+Number(i)*1),"unsigned char").value)|4));
                (()=>{const old=k;k=C.u8((old+1));return k;})();
            }
        }
    }
    return k;
}

/* move items from a gap in a shop's wall that is being repaired;
   litter[] guarantees that items will end up inside shkp's shop, but
   if the wall being repaired is shared by two shops the items might
   have started in the other shop */
export function litter_scatter(litter,x,y,shkp)
{
    litter=C.ptr(litter);
    x=C.i16(x);
    y=C.i16(y);
    shkp=C.ptr(shkp);
    let otmp;
    /* placement below assumes there is always at least one adjacent spot
       that's inside the shop; caller guarantees that */
{
        /* Scatter objects haphazardly into the shop */
        if(Number(!!(Number(!!((Number(C.global("uball").value!=0))&&Number(!(C.field(C.u,"you","uswallow").value))))&&(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uchain").value,"obj","ox").value)==C.i32(x))&&Number(C.i32(C.field(C.global("uchain").value,"obj","oy").value)==C.i32(y)))))||(Number(!!(Number(!!(Number(C.i32(C.field(C.global("uball").value,"obj","where").value)==1)&&Number(C.i32(C.field(C.global("uball").value,"obj","ox").value)==C.i32(x))))&&Number(C.i32(C.field(C.global("uball").value,"obj","oy").value)==C.i32(y))))))))))) {
            /*
             * Either the ball or chain is in the repair location.
             * Take the easy way out and put ball&chain under hero.
             *
             * FIXME: message should be reworded; this might be the
             * shop's doorway rather than a wall, there might be some
             * other stuff here which isn't junk, and "your junk" has
             * a slang connotation which could be applicable if hero
             * has Passes_walls ability.
             */
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(176,C.literal("Get your junk out of my wall!"));
            }
            C.unplacebc();
            /* pick 'em up */
            C.placebc();
            /* put 'em down */
        }
        while(Number(((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value))!=0)) {
            /* Don't mess w/ boulders -- just merge into wall */
            if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BOULDER)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.ROCK)))) {
                C.obj_extract_self(otmp);
                obfree(otmp,0);
            } else {
                let trylimit=10;
                let i=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),4661,(C.literal("litter_scatter"))),C.rn2(9))):C.rn2(9))); let ix; let iy;
                /* otmp must be moved otherwise svl.level.objects[x][y] will
                   never become Null and while-loop won't terminate */
                do {
                    (i=C.i32(((C.i32((i+1)))%9)));
                } while(Number(!!((()=>{const old=trylimit;trylimit=C.i32((old-1));return trylimit;})()&&Number(!((C.u32((C.u32(C.cell((litter+Number(i)*1),"unsigned char").value)&4))))))));
                if(Number((C.u32((C.u32(C.cell((litter+Number(i)*1),"unsigned char").value)&(C.u32((2|4))))))!=C.u32(0))) {
                    (ix=C.i32((C.i32(x)+(C.i32(((C.i32((i%3)))-1))))));
                    (iy=C.i32((C.i32(y)+(C.i32(((C.i32(Math.trunc((i/3))))-1))))));
                } else {
                    /* we know shk isn't at <x,y> because repair
                       is deferred in that situation */
                    (ix=C.i32(C.field(shkp,"monst","mx").value));
                    (iy=C.i32(C.field(shkp,"monst","my").value));
                }
                /* if the wall being repaired is shared by two adjacent
                   shops, <ix,iy> might be in a different shop than the
                   one that is billing for otmp or decided it was free;
                   control of the item goes to the shk repairing the wall
                   but otmp->no_charge isn't recalculated for new shop */
                if(C.field(otmp,"obj","unpaid").value) {
                    let oshk=shkp;
                    /* !costly_spot() happens if otmp is moved from wall
                       to shop's "free spot", still costly_adjacent() and
                       still unpaid/on-bill; otherwise, it is being moved
                       all the way into the shop so take it off the bill */
                    if(Number(!!(C.i32(costly_spot(C.i16(ix),C.i16(iy)))&&((Number(!!(onbill(otmp,oshk,(C.i8(1)))||(Number(!!(Number(((oshk=find_objowner(otmp,C.i16(ix),C.i16(iy))))!=0)&&onbill(otmp,oshk,(C.i8(0))))))))))))) subfrombill(otmp,oshk);
                }
                if(C.field(otmp,"obj","no_charge").value) {
                    /* not strictly necessary; destination is inside a
                       shop so existing no_charge remains relevant */
                    if(Number(!!(Number(!(costly_spot(C.i16(ix),C.i16(iy))))&&Number(!(costly_adjacent(shkp,C.i16(ix),C.i16(iy))))))) (C.field(otmp,"obj","no_charge").value=C.u32(0));
                }
                C.remove_object(otmp);
                C.place_object(otmp,C.i16(ix),C.i16(iy));
                (C.cell((litter+Number(i)*1),"unsigned char").value=C.u8(C.u32(C.cell((litter+Number(i)*1),"unsigned char").value)|1));
            }
        }
        /* while level.objects[x][y] != 0 */
    }}

export function litter_newsyms(litter,x,y)
{
    litter=C.ptr(litter);
    x=C.i16(x);
    y=C.i16(y);
    let i;
    for((i=0);Number(i<9);(()=>{const old=i;i=C.i32((old+1));return old;})()) if(C.u32((C.u32(C.cell((litter+Number(i)*1),"unsigned char").value)&1))) C.newsym(C.i16(C.i32((C.i32(x)+(C.i32(((C.i32((i%3)))-1)))))),C.i16(C.i32((C.i32(y)+(C.i32(((C.i32(Math.trunc((i/3))))-1)))))));

}

/*
 * 0: repair postponed, 1: silent repair (no messages), 2: normal repair
 * 3: untrap
 */
export function repair_damage(shkp,tmp_dam,catchup)
{
    shkp=C.ptr(shkp);
    tmp_dam=C.ptr(tmp_dam);
    catchup=C.i8(catchup);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["repair_damage.litter@161520",(1*9)]]);
    try {
    let x; let y;
    let litter=C.automatic("repair_damage.litter@161520",(1*9));
    let otmp;
    let ttmp;
    let disposition=1;
    let seeit; let stop_picking=(C.i8(0));
    if(Number(!(repairable_damage(tmp_dam,shkp)))) return 0;
    (x=C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","x").value);
    (y=C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","y").value);
    (seeit=C.i8((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))));
    (ttmp=C.t_at(x,y));
    if(ttmp) {
        switch(C.i32(C.field(ttmp,"trap","ttyp").value)) {
            case (C.LANDMINE):
                case (C.BEAR_TRAP):
                    /* convert to an object */
                    (otmp=C.mksobj(((Number(C.i32(C.field(ttmp,"trap","ttyp").value)==C.LANDMINE))?C.LAND_MINE:C.BEARTRAP),(C.i8(1)),(C.i8(0))));
            (C.field(otmp,"obj","quan").value=1n);
            (C.field(otmp,"obj","owt").value=C.u32(C.weight(otmp)));
            if(Number(!(catchup))) {
                if(Number(!!(C.canseemon(shkp)&&Number(C.dist2(x,y,C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value)<=2)))) C.variadic(177,C.literal("%s untraps %s."),C.Shknam(shkp),C.ansimpleoname(otmp));
 else if(Number(!!(C.i32(C.field(ttmp,"trap","tseen").value)&&(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(ttmp,"trap","ty").value)*8),"unsigned char *").value+Number(C.field(ttmp,"trap","tx").value)*1),"unsigned char").value)&2)))!=0))))) C.variadic(178,C.literal("The %s vanishes."),C.trapname(C.i32(C.field(ttmp,"trap","ttyp").value),(C.i8(1))));
            }
            C.mpickobj(shkp,otmp);
            break;
            case (C.HOLE):
                case (C.PIT):
                    case (C.SPIKED_PIT):
                        if(Number(!!(Number(!!(Number(!(catchup))&&C.i32(C.field(ttmp,"trap","tseen").value)))&&(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(ttmp,"trap","ty").value)*8),"unsigned char *").value+Number(C.field(ttmp,"trap","tx").value)*1),"unsigned char").value)&2)))!=0))))) C.variadic(179,C.literal("The %s is filled in."),C.trapname(C.i32(C.field(ttmp,"trap","ttyp").value),(C.i8(1))));
            break;
            default:
                if(Number(!!(Number(!!(Number(!(catchup))&&C.i32(C.field(ttmp,"trap","tseen").value)))&&(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(ttmp,"trap","ty").value)*8),"unsigned char *").value+Number(C.field(ttmp,"trap","tx").value)*1),"unsigned char").value)&2)))!=0))))) C.variadic(180,C.literal("The %s vanishes."),C.trapname(C.i32(C.field(ttmp,"trap","ttyp").value),(C.i8(1))));
            break;
        }
        C.deltrap(ttmp);
        C.del_engr_at(x,y);
        if(seeit) C.newsym(x,y);
        if(Number(!(catchup))) (disposition=3);
    }
    if(Number(!!((Number(C.i32((C.field(tmp_dam,"damage","typ").value))>=C.ROOM))||(Number(!!(Number(C.i32(C.field(tmp_dam,"damage","typ").value)==C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))&&(Number(!!(Number(!((Number(C.i32((C.field(tmp_dam,"damage","typ").value))==C.DOOR))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)>1)))))))))) return disposition;
    /* no terrain fix necessary (trap removal or manually repaired) */
    if(C.closed_door(x,y)) (stop_picking=C.picking_at(x,y));
    /* door or wall repair; trap, if any, is now gone;
       restore original terrain type and move any items away;
       rm.doormask and rm.wall_info are both overlaid on rm.flags
       so the new flags value needs to match the restored typ */
    (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value=C.field(tmp_dam,"damage","typ").value);
    if((Number(C.i32((C.field(tmp_dam,"damage","typ").value))==C.DOOR))) (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(4));
 else (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value=C.u32(C.field(tmp_dam,"damage","flags").value));
    /* arbitrary */
    /* not a door; set rm.wall_info or whatever old flags are relevant */
    if(litter_getpos(litter,x,y,shkp)) litter_scatter(litter,x,y,shkp);
    C.del_engr_at(x,y);
    /* needed if hero has line-of-sight to the former gap from outside
       the shop but is farther than one step away; once the light inside
       the shop is blocked, the other newsym() below won't redraw the
       spot showing its repaired wall */
    if(seeit) C.newsym(x,y);
    C.block_point(C.i32(x),C.i32(y));
    if(catchup) return 1;
    /* repair occurred while off level so no messages */
    if(seeit) {
        if((Number(!!(C.i32((C.field(tmp_dam,"damage","typ").value))&&Number(C.i32((C.field(tmp_dam,"damage","typ").value))<=C.DBWALL))))) {
            /* player sees actual repair process, so KNOWS it's a wall */
            (C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value=(C.u8(255)));
            C.variadic(181,C.literal("Suddenly, a section of the wall closes up!"));
        } else if((Number(C.i32((C.field(tmp_dam,"damage","typ").value))==C.DOOR))) {
            C.variadic(182,C.literal("Suddenly, the shop door reappears!"));
        }
        C.newsym(x,y);
    } else if((Number(!!(C.i32((C.field(tmp_dam,"damage","typ").value))&&Number(C.i32((C.field(tmp_dam,"damage","typ").value))<=C.DBWALL))))) {
        if(Number(C.i32(inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))==C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shoproom").value))) C.variadic(183,C.literal("more claustrophobic than before."));
 else if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),4833,(C.literal("repair_damage"))),C.rn2(10))):C.rn2(10)))))))) C.variadic(184,C.literal("The dungeon acoustics noticeably change."));
    }
    if(stop_picking) C.stop_occupation();
    litter_newsyms(litter,x,y);
    if(Number(disposition<3)) (disposition=2);
    return disposition;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* normally repair is done when a shopkeeper moves, but we also try to
   catch up for lost time when reloading a previously visited level */
export function fix_shop_damage()
{
    let shkp;
    let damg; let nextdamg;
    /* if this level has no shop damage, there's nothing to do */
    if(Number(!(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value))) return;
    /* go through all shopkeepers on the level */
    for((shkp=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(0))));shkp;(shkp=next_shkp(C.field(shkp,"monst","nmon").value,(C.i8(0))))) {
        /* if this shopkeeper isn't in his shop or can't move, skip */
        if(shk_impaired(shkp)) continue;
        /* go through all damage data trying to have this shopkeeper
           fix it; repair_damage() will only make repairs for damage
           matching shop controlled by specified shopkeeper */
        for((damg=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value);damg;(damg=nextdamg)) {
            (nextdamg=C.field(damg,"damage","next").value);
            if(repair_damage(shkp,damg,(C.i8(1)))) discard_damage_struct(damg);
        }
    }
}

/*
 * shk_move: return 1: moved  0: didn't  -1: let m_move do it  -2: died
 */
export function shk_move(shkp)
{
    shkp=C.ptr(shkp);
    let gtx; let gty; let omx; let omy;
    let udist;
    let appr;
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    let z;
    let uondoor=(C.i8(0)); let satdoor; let avoid=(C.i8(0)); let badinv;
    (omx=C.field(shkp,"monst","mx").value);
    (omy=C.field(shkp,"monst","my").value);
    if(inhishop(shkp)) shk_fixes_damage(shkp);
    if(Number(!!(Number(((udist=C.dist2((omx),(omy),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))<3)&&(Number(!!(Number(C.field(shkp,"monst","data").value!=(C.mons+Number(C.PM_GRID_BUG)*C.sizes["struct permonst"]))||(Number(!!(Number(C.i32(omx)==C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(omy)==C.i32(C.field(C.u,"you","uy").value))))))))))) {
        if(Number(!!((Number(!((C.field((shkp),"monst","mpeaceful").value))))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.CONFLICT)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.CONFLICT)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.resist_conflict(shkp))))))))) {
            if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DISPLACED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DISPLACED)*C.sizes["struct prop"]),"prop","extrinsic").value)))) C.variadic(185,C.literal("displaced image doesn't fool %s!"),C.shkname(shkp));
            C.mattacku(shkp);
            return 0;
        }
        if(C.field(eshkp,"eshk","following").value) {
            if(C.strncmp(C.field(eshkp,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32))) {
                if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                    ;
                    C.variadic(186,C.literal("%s, %s!  I was looking for %s."),C.Hello(shkp),C.field(C.svp,"instance_globals_saved_p","plname").address,C.field(eshkp,"eshk","customer").address);
                }
                (C.field(eshkp,"eshk","following").value=C.i8(0));
                return 0;
            }
            if(Number(C.field(C.svm,"instance_globals_saved_m","moves").value>C.i64((C.field(C.gf,"instance_globals_f","followmsg").value+C.i64(4))))) {
                if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                    ;
                    C.variadic(187,C.literal("%s, %s!  Didn't you forget to pay?"),C.Hello(shkp),C.field(C.svp,"instance_globals_saved_p","plname").address);
                } else {
                    C.variadic(188,C.literal("%s holds out %s upturned %s."),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),C.mbodypart(shkp,C.HAND));
                }
                (C.field(C.gf,"instance_globals_f","followmsg").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),4924,(C.literal("shk_move"))),C.rn2(9))):C.rn2(9)))))) {
                    C.variadic(189,C.literal("%s doesn't like customers who don't pay."),C.Shknam(shkp));
                    rile_shk(shkp);
                }
            }
            if(Number(udist<2)) return 0;
        }
    }
    (appr=C.i8(1));
    (gtx=C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","x").value);
    (gty=C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","y").value);
    (satdoor=C.i8((Number(!!(Number(C.i32(gtx)==C.i32(omx))&&Number(C.i32(gty)==C.i32(omy)))))));
    if(Number(!!(C.i32(C.field(eshkp,"eshk","following").value)||(Number(!!(Number(((z=C.holetime()))>=0)&&Number(C.i32((z*z))<=udist))))))) {
        /* [This distance check used to apply regardless of
            whether the shk was following, but that resulted in
            m_move() sometimes taking the shk out of the shop if
            the player had fenced him in with boulders or traps.
            Such voluntary abandonment left unpaid objects in
            invent, triggering billing impossibilities on the
            next level once the character fell through the hole.] */
        if(Number(!!(Number(!!(Number(udist>4)&&C.i32(C.field(eshkp,"eshk","following").value)))&&Number(!(C.field(eshkp,"eshk","billct").value))))) return C.i32((-1));
        /* leave it to m_move */
        (gtx=C.field(C.u,"you","ux").value);
        (gty=C.field(C.u,"you","uy").value);
    } else if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) {
        /* Move towards the hero if the shopkeeper can see him. */
        if(Number(!!(C.i32(C.field(shkp,"monst","mcansee").value)&&(Number(!!(Number(!!((Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number((C.u64((C.field((C.field((shkp),"monst","data").value),"permonst","mflags1").value&C.u64(16777216n))))!=C.u64(0n))))))&&Number(!((C.field(C.u,"you","uinwater").value)))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field((shkp),"monst","my").value)*8),"unsigned char *").value+Number(C.field((shkp),"monst","mx").value)*1),"unsigned char").value)&1)))!=0)))))))) {
            (gtx=C.field(C.u,"you","ux").value);
            (gty=C.field(C.u,"you","uy").value);
        }
        (avoid=(C.i8(0)));
    } else {
        if(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))||C.field(C.u,"you","usteed").value))) {
            (avoid=(C.i8(0)));
        } else {
            (uondoor=C.i8((Number(!!(Number(C.i32((C.field(C.field(eshkp,"eshk","shd").address,"nhcoord","x").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(C.field(eshkp,"eshk","shd").address,"nhcoord","y").value))==C.i32(C.field(C.u,"you","uy").value)))))));
            if(uondoor) {
                (badinv=C.i8((Number(!!(Number(!!(C.carrying(C.PICK_AXE)||C.carrying(C.DWARVISH_MATTOCK)))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FAST)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&(Number(!!(C.sobj_at(C.PICK_AXE,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)||C.sobj_at(C.DWARVISH_MATTOCK,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))))))))));
                if(Number(!!(C.i32(satdoor)&&C.i32(badinv)))) return 0;
                (avoid=C.i8(Number(!(badinv))));
            } else {
                (avoid=C.i8((Number(!!(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)&&Number(C.dist2((gtx),(gty),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)>8))))));
                (badinv=(C.i8(0)));
            }
            if(Number(!!((Number(!!((Number(!!(Number(!!(Number(!(C.field(eshkp,"eshk","robbed").value))&&Number(!(C.field(eshkp,"eshk","billct").value))))&&Number(!(C.field(eshkp,"eshk","debit").value)))))||C.i32(avoid))))&&Number((C.dist2(omx,omy,gtx,gty))<3)))) {
                if(Number(!!(Number(!(badinv))&&Number(!(C.online2((omx),(omy),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)))))) return 0;
                if(satdoor) (appr=C.i8((gtx=(gty=C.i16(0)))));
            }
        }
    }
    (z=C.move_special(shkp,C.i8(inhishop(shkp)),appr,uondoor,avoid,omx,omy,gtx,gty));
    if(Number(z>0)) after_shk_move(shkp);
    return z;
}

/* called after shopkeeper moves, in case move causes re-entry into shop */
export function after_shk_move(shkp)
{
    shkp=C.ptr(shkp);
    let eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value);
    if(Number(!!(Number(C.field(eshkp,"eshk","bill_p").value==C.ptr(C.i32((-1000))))&&inhishop(shkp)))) {
        /* reset bill_p, need to re-calc player's occupancy too */
        (C.field(eshkp,"eshk","bill_p").value=(C.field(eshkp,"eshk","bill").address+Number(0)*C.sizes["struct bill_x"]));
        /* only re-check occupancy if game hasn't just ended */
        if(Number(!(C.field(C.program_state,"sinfo","gameover").value))) C.check_special_room((C.i8(0)));
    }
}

/* for use in levl_follower (mondata.c) */
export function is_fshk(mtmp)
{
    mtmp=C.ptr(mtmp);
    return C.i8((Number(!!(C.i32(C.field(mtmp,"monst","isshk").value)&&C.i32(C.field((C.field(C.field((mtmp),"monst","mextra").value,"mextra","eshk").value),"eshk","following").value)))));
}

/* You are digging in the shop. */
export function shopdig(fall)
{
    fall=C.i32(fall);
    let shkp=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value);
    let lang;
    let grabs=C.literal("grabs");
    if(Number(!(shkp))) return;
    if(Number(!(inhishop(shkp)))) {
        if((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_KNIGHT)))) {
            C.variadic(190,C.literal("like a common thief."));
            C.adjalign(C.i32((-C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)))));
        }
        return;
    }
    /* 0 == can't speak, 1 == makes animal noises, 2 == speaks */
    (lang=0);
    if(Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||(Number(C.i32(C.field((C.field(shkp,"monst","data").value),"permonst","msound").value)==C.MS_SILENT))))) ;
 else if(Number(C.i32(C.field(C.field(shkp,"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)) (lang=1);
 else if(Number(C.i32(C.field(C.field(shkp,"monst","data").value,"permonst","msound").value)>=C.MS_HUMANOID)) (lang=2);
    /* lang stays 0 */
    if(Number(!(fall))) {
        if(Number(lang==2)) {
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                if(Number(C.field(C.u,"you","utraptype").value==C.u32(C.TT_PIT))) {
                    C.variadic(191,C.literal("Be careful, %s, or you might fall through the floor."),(C.i32(C.field(C.flags,"flag","female").value)?C.literal("madam"):C.literal("sir")));
                } else {
                    C.variadic(192,C.literal("%s, do not damage the floor here!"),(C.i32(C.field(C.flags,"flag","female").value)?C.literal("Madam"):C.literal("Sir")));
                }
            }
        }
        if((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_KNIGHT)))) {
            C.variadic(193,C.literal("like a common thief."));
            C.adjalign(C.i32((-C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)))));
        }
    } else if(Number(!!(Number(!!(Number(!(C.um_dist(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,C.i16(5))))&&Number(!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))))))&&(Number(!!(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value||C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value)))))) {
        let obj; let obj2;
        if((Number((C.u64((C.field((C.field(shkp,"monst","data").value),"permonst","mflags1").value&C.u64(24576n))))==C.u64(24576n)))) {
            (grabs=C.literal("knocks off"));
            /* This is what should happen, but for balance
             * reasons, it isn't currently.
             */
        }
        if(Number(!((Number(C.dist2((C.field((shkp),"monst","mx").value),(C.field((shkp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))) {
            C.mnexto(shkp,C.u32(2));
            /* for some reason the shopkeeper can't come next to you */
            if(Number(!((Number(C.dist2((C.field((shkp),"monst","mx").value),(C.field((shkp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))) {
                if(Number(lang==2)) C.variadic(194,C.literal("%s curses you in anger and frustration!"),C.Shknam(shkp));
 else if(Number(lang==1)) C.growl(shkp);
                rile_shk(shkp);
                return;
            } else C.variadic(195,C.literal("%s %s, and %s your backpack!"),C.Shknam(shkp),C.makeplural(C.locomotion(C.field(shkp,"monst","data").value,C.literal("leap"))),grabs);
        } else C.variadic(196,C.literal("%s %s your backpack!"),C.Shknam(shkp),grabs);
        for((obj=C.field(C.gi,"instance_globals_i","invent").value);obj;(obj=obj2)) {
            (obj2=C.field(obj,"obj","nobj").value);
            if(Number(!!(Number(!!(Number((C.i64((C.field(obj,"obj","owornmask").value&C.i64((~(C.i64((1024n|512n))))))))!=C.i64(0))||(Number(!!(Number(obj==C.global("uswapwep").value)&&C.i32(C.field(C.u,"you","twoweap").value))))))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)&&C.field(obj,"obj","corpsenm").value)))))) continue;
            if(Number(obj==C.field(C.gc,"instance_globals_c","current_wand").value)) continue;
            C.setnotworn(obj);
            C.freeinv(obj);
            subfrombill(obj,shkp);
            C.add_to_minv(shkp,obj);
            /* may free obj */
        }
    }
}

export function makekops(mm)
{
    mm=C.ptr(mm);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["makekops.k_cnt@174324",(4*4)]]);
    try {
    
    let k_cnt=C.automatic("makekops.k_cnt@174324",(4*4)); let cnt; let mndx; let k;
    (C.cell((k_cnt+Number(0)*4),"int").value=(cnt=C.i32((C.abs(C.i32(C.depth(C.field(C.u,"you","uz").address)))+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5119,(C.literal("makekops"))),C.rnd(5))):C.rnd(5)))))));
    (C.cell((k_cnt+Number(1)*4),"int").value=C.i32(((C.i32(Math.trunc((cnt/3))))+1)));
    /* at least one sarge */
    (C.cell((k_cnt+Number(2)*4),"int").value=(C.i32(Math.trunc((cnt/6)))));
    /* maybe a lieutenant */
    (C.cell((k_cnt+Number(3)*4),"int").value=(C.i32(Math.trunc((cnt/9)))));
    /* and maybe a kaptain */
    for((k=0);Number(k<4);(()=>{const old=k;k=C.i32((old+1));return old;})()) {
        if(Number(((cnt=C.cell((k_cnt+Number(k)*4),"int").value))==0)) break;
        (mndx=C.i32(C.cell((C.staticAddress("makekops.k_mndx")+Number(k)*2),"short").value));
        if(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(mndx)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1)))))) continue;
        while((()=>{const old=cnt;cnt=C.i32((old-1));return old;})()) if(C.enexto(mm,C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,(C.mons+Number(mndx)*C.sizes["struct permonst"]))) C.makemon((C.mons+Number(mndx)*C.sizes["struct permonst"]),C.field(mm,"nhcoord","x").value,C.field(mm,"nhcoord","y").value,C.u32(131072n));

    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function getcad(shkp,dmgstr,x,y,uinshp,animal,pursue)
{
    shkp=C.ptr(shkp);
    dmgstr=C.ptr(dmgstr);
    x=C.i16(x);
    y=C.i16(y);
    uinshp=C.i8(uinshp);
    animal=C.i8(animal);
    pursue=C.i8(pursue);
    let dugwall=C.i8((Number(!!(Number(!(C.strcmp(dmgstr,C.literal("dig into"))))||Number(!(C.strcmp(dmgstr,C.literal("damage"))))))));
    /* wand */
    /* pick-axe */
    if((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))) {
        if(Number(!!(C.i32(animal)&&Number(!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))))))) C.yelp(shkp);
    } else if(Number(!!(Number(!!(C.i32(pursue)||C.i32(uinshp)))||Number(!(C.um_dist(x,y,C.i16(1))))))) {
        if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
            ;
            C.variadic(197,C.literal("How dare you %s my %s?"),dmgstr,(C.i32(dugwall)?C.literal("shop"):C.literal("door")));
        } else {
            C.variadic(198,C.literal("%s is %s that you decided to %s %s %s!"),C.Shknam(shkp),C.cell((C.staticAddress("angrytexts")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5155,(C.literal("getcad"))),C.rn2(C.i32((C.u64((BigInt((8*3))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*3))/BigInt(8)))))))))*8),"char *").value,dmgstr,(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),(C.i32(dugwall)?C.literal("shop"):C.literal("door")));
        }
    } else {
        if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
            C.variadic(199,C.literal("%s shouts:"),C.Shknam(shkp));
            ;
            C.variadic(200,C.literal("Who dared %s my %s?"),dmgstr,(C.i32(dugwall)?C.literal("shop"):C.literal("door")));
        } else {
            C.variadic(201,C.literal("%s is %s that someone decided to %s %s %s!"),C.Shknam(shkp),C.cell((C.staticAddress("angrytexts")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5166,(C.literal("getcad"))),C.rn2(C.i32((C.u64((BigInt((8*3))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*3))/BigInt(8)))))))))*8),"char *").value,dmgstr,(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),(C.i32(dugwall)?C.literal("shop"):C.literal("door")));
        }
    }
    hot_pursuit(shkp);
}

export function pay_for_damage(dmgstr,cant_mollify)
{
    dmgstr=C.ptr(dmgstr);
    cant_mollify=C.i8(cant_mollify);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["pay_for_damage.shops_affected@176298",(1*5)],["pay_for_damage.qbuf@176368",(1*80)]]);
    try {
    let shkp=0;
    let shops_affected=C.automatic("pay_for_damage.shops_affected@176298",(1*5));
    let uinshp=C.i8((Number(C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value)!=0)));
    let qbuf=C.automatic("pay_for_damage.qbuf@176368",(1*80));
    let x; let y;
    let animal; let pursue;
    let tmp_dam; let appear_here=0;
    let cost_of_damage=0n;
    let nearest_shk=C.u32(C.i32(((C.i32((21*21)))+(C.i32((80*80)))))); let nearest_damage=nearest_shk;
    let picks=0;
    for((tmp_dam=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","damagelist").value);tmp_dam;(tmp_dam=C.field(tmp_dam,"damage","next").value)) {
        let shp;
        if(Number(!!(Number(C.field(tmp_dam,"damage","when").value!=C.field(C.svm,"instance_globals_saved_m","moves").value)||Number(!(C.field(tmp_dam,"damage","cost").value))))) continue;
        (cost_of_damage=C.i64(cost_of_damage+C.field(tmp_dam,"damage","cost").value));
        C.strcpy(shops_affected,C.in_rooms(C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","x").value,C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","y").value,C.SHOPBASE));
        for((shp=shops_affected);C.cell(shp,"char").value;(()=>{const old=shp;shp=C.ptr((old+Number(1)));return old;})()) {
            let tmp_shk;
            let shk_distance;
            if(Number(!(((tmp_shk=shop_keeper(C.cell(shp,"char").value)))))) continue;
            if(Number(tmp_shk==shkp)) {
                let damage_distance=C.u32(C.dist2((C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","x").value),(C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","y").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
                if(Number(damage_distance<nearest_damage)) {
                    (nearest_damage=damage_distance);
                    (appear_here=tmp_dam);
                }
                continue;
            }
            if(Number(!(inhishop(tmp_shk)))) continue;
            (shk_distance=C.u32(C.dist2((C.field((tmp_shk),"monst","mx").value),(C.field((tmp_shk),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)));
            if(Number(shk_distance>nearest_shk)) continue;
            if(Number(!!((Number(shk_distance==nearest_shk))&&picks))) {
                if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5218,(C.literal("pay_for_damage"))),C.rn2((()=>{const old=picks;picks=C.i32((old+1));return picks;})()))):C.rn2((()=>{const old=picks;picks=C.i32((old+1));return picks;})())))) continue;
            } else (picks=1);
            (shkp=tmp_shk);
            (nearest_shk=shk_distance);
            (appear_here=tmp_dam);
            (nearest_damage=C.u32(C.dist2((C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","x").value),(C.field(C.field(tmp_dam,"damage","place").address,"nhcoord","y").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)));
        }
    }
    if(Number(!!(Number(!(cost_of_damage))||Number(!(shkp))))) return;
    (animal=C.i8((Number(C.i32(C.field(C.field(shkp,"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))));
    (pursue=(C.i8(0)));
    (x=C.field(C.field(appear_here,"damage","place").address,"nhcoord","x").value);
    (y=C.field(C.field(appear_here,"damage","place").address,"nhcoord","y").value);
    /* not the best introduction to the shk... */
    C.strncpy(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32));
    /* if the shk is already on the war path, be sure it's all out */
    if(Number(!!((Number(!((C.field((shkp),"monst","mpeaceful").value))))||C.i32(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","following").value)))) {
        hot_pursuit(shkp);
        return;
    }
    /* if the shk is not in their shop.. */
    if(Number(!(C.cell(C.in_rooms(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,C.SHOPBASE),"char").value))) {
        if(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(shkp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(shkp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))))) return;
        (pursue=(C.i8(1)));
        getcad(shkp,dmgstr,x,y,uinshp,animal,pursue);
        return;
    }
    if(uinshp) {
        if(Number(!!(C.i32(C.um_dist(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,C.i16(1)))&&Number(!(C.um_dist(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,C.i16(3))))))) {
            C.variadic(202,C.literal("%s leaps towards you!"),C.Shknam(shkp));
            C.mnexto(shkp,C.u32(4));
        }
        (pursue=C.um_dist(C.field(shkp,"monst","mx").value,C.field(shkp,"monst","my").value,C.i16(1)));
        if(pursue) {
            getcad(shkp,dmgstr,x,y,uinshp,animal,pursue);
            return;
        }
    } else {
        /*
         * Make shkp show up at the door.  Effect:  If there is a monster
         * in the doorway, have the hero hear the shopkeeper yell a bit,
         * pause, then have the shopkeeper appear at the door, having
         * yanked the hapless critter out of the way.
         */
        if((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value!=0))) {
            if(Number(!(animal))) {
                if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                    /* Soundeffect(se_angry_voice, 75); */
                    C.variadic(203,C.literal("an angry voice:"));
                    ;
                    C.variadic(204,C.literal("Out of my way, scum!"));
                }
                C.callback(16,(C.field(C.windowprocs,"window_procs","win_wait_synch").value));
                C.sleep(C.u32(1));
            } else {
                C.growl(shkp);
            }
        }
        C.mnearto(shkp,x,y,(C.i8(1)),C.u32(2));
    }
    if(Number(!!(Number(!!(Number(!!((Number(!!(C.i32(C.um_dist(x,y,C.i16(1)))&&Number(!(uinshp)))))||C.i32(cant_mollify)))||Number((C.i64((C.money_cnt(C.field(C.gi,"instance_globals_i","invent").value)+C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","credit").value)))<cost_of_damage)))||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5297,(C.literal("pay_for_damage"))),C.rn2(50))):C.rn2(50)))))))) {
        getcad(shkp,dmgstr,x,y,uinshp,animal,pursue);
        return;
    }
    if((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))) C.variadic(205,C.literal("invisibility does not fool %s!"),C.shkname(shkp));
    C.variadic(206,qbuf,C.literal("%sYou did %ld %s worth of damage!%s  Pay?"),(Number(!(animal))?cad((C.i8(1))):C.literal("")),cost_of_damage,C.currency(cost_of_damage),(Number(!(animal))?C.literal("\""):C.literal("")));
    if(Number(C.i32(C.yn_function(qbuf,C.ynchars,C.i8(110),(C.i8(1))))!=110)) {
        let is_seen; let was_seen=C.i8(C.canseemon(shkp)); let was_outside=C.i8(Number(!(inhishop(shkp))));
        let sx=C.field(shkp,"monst","mx").value; let sy=C.field(shkp,"monst","my").value;
        (cost_of_damage=check_credit(cost_of_damage,shkp));
        if(Number(cost_of_damage>0n)) {
            money2mon(shkp,cost_of_damage);
            (C.field(C.disp,"display_hints","botl").value=(C.i8(1)));
        }
        C.variadic(207,C.literal("Mollified, %s accepts your restitution."),C.shkname(shkp));
        /* move shk back to his home loc */
        home_shk(shkp,(C.i8(0)));
        pacify_shk(shkp,(C.i8(0)));
        /* home_shk() suppresses rloc()'s vanish/appear messages */
        if(Number(!!(Number(C.i32(C.field(shkp,"monst","mx").value)!=C.i32(sx))||Number(C.i32(C.field(shkp,"monst","my").value)!=C.i32(sy))))) {
            if(Number(!!(C.i32(was_outside)&&(Number(!!(C.canseemon(shkp)||C.sensemon(shkp))))))) C.variadic(208,C.literal("%s returns to %s shop."),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value));
 else if(Number(!!(Number(C.i32(((is_seen=C.i8(C.canseemon(shkp)))))==C.i32((C.i8(1))))||C.i32(was_seen)))) C.variadic(209,C.literal("%s %s."),C.Shknam(shkp),(Number(!(was_seen))?C.literal("appears"):(C.i32(is_seen)?C.literal("shifts location"):C.literal("disappears"))));
        }
    } else {
        if(Number(!(animal))) {
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(210,C.literal("Oh, yes!  You'll pay!"));
            } else {
                C.variadic(211,C.literal("%s lunges %s %s toward your %s!"),C.Shknam(shkp),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","his").value),C.mbodypart(shkp,C.HAND),C.body_part(C.NECK));
            }
        } else C.growl(shkp);
        hot_pursuit(shkp);
        C.adjalign(C.i32((-C.sgn(C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value)))));
    }
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* called in dokick.c when we kick an object that might be in a store */
export function costly_spot(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let shkp;
    let eshkp;
    if(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","has_shop").value))) return (C.i8(0));
    (shkp=shop_keeper(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return (C.i8(0));
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    return C.i8((Number(!!(C.i32(inside_shop(x,y))&&Number(!((Number(!!(Number(C.i32(x)==C.i32(C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","x").value))&&Number(C.i32(y)==C.i32(C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","y").value)))))))))));
}

/* called by sanity checking when an unpaid or no_charge item is not at a
   costly_spot; it might still be within the boundary of the shop; if so,
   those flags are still valid */
export function costly_adjacent(shkp,x,y)
{
    shkp=C.ptr(shkp);
    x=C.i16(x);
    y=C.i16(y);
    let eshkp;
    if(Number(!!(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))||Number(!(C.isok(x,y)))))) return (C.i8(0));
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    /* adjacent if <x,y> is a shop wall spot, including door;
       also treat "free spot" one step inside the door as adjacent */
    return C.i8((Number(!!(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","edge").value)||(Number(!!(Number(C.i32(x)==C.i32(C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","x").value))&&Number(C.i32(y)==C.i32(C.field(C.field(eshkp,"eshk","shk").address,"nhcoord","y").value)))))))));
}

/* called by dotalk(sounds.c) when #chatting; returns obj if location
   contains shop goods and shopkeeper is willing & able to speak */
export function shop_object(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let otmp;
    let shkp;
    (shkp=shop_keeper(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return 0;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) if(Number(C.i32(C.field(otmp,"obj","oclass").value)!=C.COIN_CLASS)) break;

    /* note: otmp might have ->no_charge set, but that's ok */
    return ((Number(!!(Number(!!(Number(!!(otmp&&C.i32(costly_spot(x,y))))&&C.i32((C.field((shkp),"monst","mpeaceful").value))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?otmp:0);
}

/* give price quotes for all objects linked to this one (ie, on this spot) */
export function price_quote(first_obj)
{
    first_obj=C.ptr(first_obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["price_quote.buf@184069",(1*256)],["price_quote.price@184081",(1*40)]]);
    try {
    let otmp;
    let buf=C.automatic("price_quote.buf@184069",(1*256)); let price=C.automatic("price_quote.price@184081",(1*40));
    let cost=0n;
    let cnt=0;
    let contentsonly=(C.i8(0));
    let tmpwin;
    let shkp;
    (shkp=shop_keeper(inside_shop(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)));
    /* caller has verified that there is a shopkeeper, but the static
       analyzer doesn't realize it */
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return;
    (tmpwin=C.callback(17,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.callback(18,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,C.literal("Fine goods for sale:"));
    C.callback(19,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,C.literal(""));
    for((otmp=first_obj);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) {
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) continue;
        (cost=((Number(!!(Number(!!(C.i32(C.field(otmp,"obj","no_charge").value)||Number(otmp==C.global("uball").value)))||Number(otmp==C.global("uchain").value))))?0n:get_cost(otmp,shkp)));
        (contentsonly=C.i8(Number(!(cost))));
        if((Number(C.field((otmp),"obj","cobj").value!=0))) (cost=C.i64(cost+contained_cost(otmp,shkp,0n,(C.i8(0)),(C.i8(0)))));
        if(C.field(otmp,"obj","globby").value) (cost=C.i64(cost*get_pricing_units(otmp)));
        /* always quan 1, vary by wt */
        if(Number(!(cost))) {
            C.strcpy(price,C.literal("no charge"));
            (contentsonly=(C.i8(0)));
        } else {
            C.variadic(212,price,C.literal("%ld %s%s"),cost,C.currency(cost),(Number((C.field(otmp,"obj","quan").value)>1n)?C.literal(" each"):C.literal("")));
        }
        C.variadic(213,buf,C.literal("%s%s, %s"),(C.i32(contentsonly)?C.staticAddress("the_contents_of"):C.literal("")),C.doname(otmp),price);
        (C.callback(20,(C.field(C.windowprocs,"window_procs","win_putstr").value),tmpwin,0,buf),(()=>{const old=cnt;cnt=C.i32((old+1));return old;})());
    }
    if(Number(cnt>1)) {
        C.callback(21,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),tmpwin,(C.i8(1)));
    } else if(Number(cnt==1)) {
        if(Number(!(cost))) {
            /* "<doname(obj)>, no charge" */
            ;
            C.variadic(214,C.literal("%s!"),C.upstart(buf));
            /* buf contains the string */
        } else {
            /* print cost in slightly different format, so can't reuse buf;
               cost and contentsonly are already set up */
            C.variadic(215,buf,C.literal("%s%s"),(C.i32(contentsonly)?C.staticAddress("the_contents_of"):C.literal("")),C.doname(first_obj));
            ;
            C.variadic(216,C.literal("%s, price %ld %s%s%s"),C.upstart(buf),cost,C.currency(cost),((Number(C.field(first_obj,"obj","quan").value>1n))?C.literal(" each"):C.literal("")),(C.i32(contentsonly)?C.literal("."):shk_embellish(first_obj,cost)));
        }
    }
    C.callback(22,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),tmpwin);
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function shk_embellish(itm,cost)
{
    itm=C.ptr(itm);
    cost=C.i64(cost);
    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5470,(C.literal("shk_embellish"))),C.rn2(3))):C.rn2(3)))))) {
        let o; let choice=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5471,(C.literal("shk_embellish"))),C.rn2(5))):C.rn2(5)));
        if(Number(choice==0)) (choice=((Number(cost<100n)?1:(Number(cost<500n)?2:3))));
        switch(choice) {
            case (4):
                if(Number(cost<10n)) break;
 else (o=C.i32(C.field(itm,"obj","oclass").value));
            if(Number(o==C.FOOD_CLASS)) return C.literal(", gourmets' delight!");
            if((C.i32(C.field((C.objects+Number(C.field(itm,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_name_known").value)?C.i32(C.field((C.objects+Number(C.field(itm,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_magic").value):(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(o==C.AMULET_CLASS)||Number(o==C.RING_CLASS)))||Number(o==C.WAND_CLASS)))||Number(o==C.POTION_CLASS)))||Number(o==C.SCROLL_CLASS)))||Number(o==C.SPBOOK_CLASS)))))) return C.literal(", painstakingly developed!");
            return C.literal(", superb craftsmanship!");
            case (3):
                return C.literal(", finest quality.");
            case (2):
                return C.literal(", an excellent choice.");
            case (1):
                return C.literal(", a real bargain.");
            default:
                break;
        }
    } else if(C.field(itm,"obj","oartifact").value) {
        return C.literal(", one of a kind!");
    }
    return C.literal(".");
}

/* First 4 supplied by Ronen and Tamar, remainder by development team */
export function shk_chat(shkp)
{
    shkp=C.ptr(shkp);
    let eshk;
    let shkmoney;
    if(Number(!(C.field(shkp,"monst","isshk").value))) {
        /* The monster type is shopkeeper, but this monster is
           not actually a shk, which could happen if someone
           wishes for a shopkeeper statue and then animates it.
           (Note: shkname() would be "" in a case like this.) */
        C.variadic(217,C.literal("%s asks whether you've seen any untended shops recently."),C.Monnam(shkp));
        /* [Perhaps we ought to check whether this conversation
           is taking place inside an untended shop, but a shopless
           shk can probably be expected to be rather disoriented.] */
        return;
    }
    (eshk=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if((Number(!((C.field((shkp),"monst","mpeaceful").value))))) {
        C.variadic(218,C.literal("%s %s how much %s dislikes %s customers."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("mentions"):C.literal("indicates")),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","he").value),(C.field(eshk,"eshk","robbed").value?C.literal("non-paying"):C.literal("rude")));
    } else if(C.field(eshk,"eshk","following").value) {
        if(C.strncmp(C.field(eshk,"eshk","customer").address,C.field(C.svp,"instance_globals_saved_p","plname").address,C.u64(32))) {
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(219,C.literal("%s %s!  I was looking for %s."),C.Hello(shkp),C.field(C.svp,"instance_globals_saved_p","plname").address,C.field(eshk,"eshk","customer").address);
            }
            (C.field(eshk,"eshk","following").value=C.i8(0));
        } else {
            if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(220,C.literal("%s %s!  Didn't you forget to pay?"),C.Hello(shkp),C.field(C.svp,"instance_globals_saved_p","plname").address);
            } else {
                C.variadic(221,C.literal("%s taps you on the %s."),C.Shknam(shkp),C.body_part(C.ARM));
            }
        }
    } else if(C.field(eshk,"eshk","billct").value) {
        let total=C.i64((addupbill(shkp)+C.field(eshk,"eshk","debit").value));
        C.variadic(222,C.literal("%s %s that your bill comes to %ld %s."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("says"):C.literal("indicates")),total,C.currency(total));
    } else if(C.field(eshk,"eshk","debit").value) {
        C.variadic(223,C.literal("%s %s that you owe %s %ld %s."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("reminds you"):C.literal("indicates")),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","him").value),C.field(eshk,"eshk","debit").value,C.currency(C.field(eshk,"eshk","debit").value));
    } else if(C.field(eshk,"eshk","credit").value) {
        C.variadic(224,C.literal("%s encourages you to use your %ld %s of credit."),C.Shknam(shkp),C.field(eshk,"eshk","credit").value,C.currency(C.field(eshk,"eshk","credit").value));
    } else if(C.field(eshk,"eshk","robbed").value) {
        C.variadic(225,C.literal("%s %s about a recent robbery."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("complains"):C.literal("indicates concern")));
    } else if(C.field(eshk,"eshk","surcharge").value) {
        C.variadic(226,C.literal("%s %s that %s is watching you carefully."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("warns you"):C.literal("indicates")),(C.field((C.genders+Number(C.pronoun_gender(shkp,C.u32((C.i32((1|2))))))*C.sizes["struct Gender"]),"Gender","he").value));
    } else if(Number(((shkmoney=C.money_cnt(C.field(shkp,"monst","minvent").value)))<50n)) {
        C.variadic(227,C.literal("%s %s that business is bad."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("complains"):C.literal("indicates")));
    } else if(Number(shkmoney>C.i64(4000))) {
        C.variadic(228,C.literal("%s %s that business is good."),C.Shknam(shkp),((Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL)))))))))?C.literal("says"):C.literal("indicates")));
    } else if(C.is_izchak(shkp,(C.i8(0)))) {
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) C.variadic(229,C.cell((C.staticAddress("Izchak_speaks")+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5596,(C.literal("shk_chat"))),C.rn2(C.i32((C.u64((BigInt((8*9))/BigInt(8)))))))):C.rn2(C.i32((C.u64((BigInt((8*9))/BigInt(8)))))))))*8),"char *").value,C.shkname(shkp));
    } else {
        if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) C.variadic(230,C.literal("%s talks about the problem of shoplifters."),C.Shknam(shkp));
    }
}

export function kops_gone(silent)
{
    silent=C.i8(silent);
    let cnt=0;
    let mtmp; let mtmp2;
    for((mtmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value);mtmp;(mtmp=mtmp2)) {
        (mtmp2=C.field(mtmp,"monst","nmon").value);
        if((Number(C.field((mtmp),"monst","mhp").value<1))) continue;
        if(Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlet").value)==C.S_KOP)) {
            if((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))) (()=>{const old=cnt;cnt=C.i32((old+1));return old;})();
            C.mongone(mtmp);
        }
    }
    if(Number(!!(cnt&&Number(!(silent))))) C.variadic(231,C.literal("Kop%s (disappointed) vanish%s into thin air."),(((Number((cnt)==1))?C.literal(""):C.literal("s"))),((Number(cnt==1))?C.literal("es"):C.literal("")));
}

export function cost_per_charge(shkp,otmp,altusage)
{
    shkp=C.ptr(shkp);
    otmp=C.ptr(otmp);
    altusage=C.i8(altusage);
    /* some items have "alternate" use with different cost */
    let tmp=0n;
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return 0n;
    /* insurance */
    (tmp=get_cost(otmp,shkp));
    /* The idea is to make the exhaustive use of an unpaid item
     * more expensive than buying it outright.
     */
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.MAGIC_LAMP)) {
        /* 1 */
        /* normal use (ie, as light source) of a magic lamp never
           degrades its value, but not charging anything would make
           identification too easy; charge an amount comparable to
           what is charged for an ordinary lamp (don't bother with
           angry shk surcharge) */
        if(Number(!(altusage))) (tmp=C.i64(C.field((C.objects+Number(C.OIL_LAMP)*C.sizes["struct objclass"]),"objclass","oc_cost").value));
 else (tmp=C.i64(tmp+C.i64((tmp/3n))));
        /* djinni is being released */
    } else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.MAGIC_MARKER)) {
        /* 70 - 100 */
        /* No way to determine in advance how many charges will be
         * wasted.  So, arbitrarily, one half of the price per use.
         */
        (tmp=C.i64(tmp/2n));
    } else if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_TRICKS)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.HORN_OF_PLENTY)))) {
        /* 1 - 20 */
        /* altusage: emptying of all the contents at once */
        if(Number(!(altusage))) (tmp=C.i64(tmp/5n));
    } else if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CRYSTAL_BALL)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.OIL_LAMP)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BRASS_LANTERN)))||(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)>=C.MAGIC_FLUTE)&&Number(C.i32(C.field(otmp,"obj","otyp").value)<=C.DRUM_OF_EARTHQUAKE))))))||Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WAND_CLASS)))) {
        /* 1 - 5 */
        /* 1 - 10 */
        /* 5 - 9 */
        /* 3 - 11 */
        if(Number(C.i32(C.field(otmp,"obj","spe").value)>1)) (tmp=C.i64(tmp/4n));
    } else if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.SPBOOK_CLASS)) {
        (tmp=C.i64(tmp-C.i64((tmp/5n))));
    } else if(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CAN_OF_GREASE)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.TINNING_KIT)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.EXPENSIVE_CAMERA)))) {
        (tmp=C.i64(tmp/10n));
    } else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.POT_OIL)) {
        (tmp=C.i64(tmp/5n));
    }
    return tmp;
}

/* Charge the player for partial use of an unpaid object.
 *
 * Note that bill_dummy_object() should be used instead
 * when an object is completely used.
 */
export function check_unpaid_usage(otmp,altusage)
{
    otmp=C.ptr(otmp);
    altusage=C.i8(altusage);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["check_unpaid_usage.buf@194421",(1*256)]]);
    try {
    let shkp;
    let fmt; let arg1; let arg2;
    let buf=C.automatic("check_unpaid_usage.buf@194421",(1*256));
    let tmp;
    if(Number(!!(Number(!!(Number(!(C.field(otmp,"obj","unpaid").value))||Number(!(C.cell(C.field(C.u,"you","ushops").address,"char").value))))||(Number(!!(Number(C.i32(C.field(otmp,"obj","spe").value)<=0)&&C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_charged").value))))))) return;
    (shkp=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return;
    if(Number(((tmp=cost_per_charge(shkp,otmp,altusage)))==0n)) return;
    (arg1=(arg2=C.literal("")));
    if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.SPBOOK_CLASS)) {
        (fmt=C.literal("%sYou owe%s %ld %s."));
        C.variadic(232,buf,C.literal("This is no free library, %s!  "),cad((C.i8(0))));
        (arg1=(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5708,(C.literal("check_unpaid_usage"))),C.rn2(2))):C.rn2(2)))?buf:C.literal("")));
        (arg2=(Number(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value>0n)?C.literal(" an additional"):C.literal("")));
    } else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.POT_OIL)) {
        (fmt=C.literal("%s%sThat will cost you %ld %s (Yendorian Fuel Tax)."));
    } else if(Number(!!(C.i32(altusage)&&(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_TRICKS)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.HORN_OF_PLENTY))))))) {
        (fmt=C.literal("%s%sEmptying that will cost you %ld %s."));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5715,(C.literal("check_unpaid_usage"))),C.rn2(3))):C.rn2(3)))))) (arg1=C.literal("Whoa!  "));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5717,(C.literal("check_unpaid_usage"))),C.rn2(3))):C.rn2(3)))))) (arg1=C.literal("Watch it!  "));
    } else {
        (fmt=C.literal("%s%sUsage fee, %ld %s."));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5721,(C.literal("check_unpaid_usage"))),C.rn2(3))):C.rn2(3)))))) (arg1=C.literal("Hey!  "));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("shk.c"),5723,(C.literal("check_unpaid_usage"))),C.rn2(3))):C.rn2(3)))))) (arg2=C.literal("Ahem.  "));
    }
    if(Number(!!(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
        ;
        C.variadic(233,fmt,arg1,arg2,tmp,C.currency(tmp));
        C.exercise(C.A_WIS,(C.i8(1)));
        /* you just got info */
    }
    (C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value=C.i64(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value+tmp));
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* for using charges of unpaid objects "used in the normal manner" */
export function check_unpaid(otmp)
{
    otmp=C.ptr(otmp);
    check_unpaid_usage(otmp,(C.i8(0)));
    /* normal item use */
}

export function costly_gold(x,y,amount,silent)
{
    x=C.i16(x);
    y=C.i16(y);
    amount=C.i64(amount);
    silent=C.i8(silent);
    let delta;
    let shkp;
    let eshkp;
    if(Number(!(costly_spot(x,y)))) return;
    /* shkp is guaranteed to exist after successful costly_spot(), but
       the static analyzer isn't smart enough to realize that, so follow
       the shkp assignment with a redundant test that will always fail */
    (shkp=shop_keeper(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value));
    if(Number(!(shkp))) return;
    (eshkp=(C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value));
    if(Number(C.field(eshkp,"eshk","credit").value>=amount)) {
        if(Number(!(silent))) {
            if(Number(C.field(eshkp,"eshk","credit").value>amount)) C.variadic(234,C.literal("credit is reduced by %ld %s."),amount,C.currency(amount));
 else C.variadic(235,C.literal("credit is erased."));
        }
        (C.field(eshkp,"eshk","credit").value=C.i64(C.field(eshkp,"eshk","credit").value-amount));
    } else {
        (delta=C.i64((amount-C.field(eshkp,"eshk","credit").value)));
        if(Number(!(silent))) {
            if(C.field(eshkp,"eshk","credit").value) C.variadic(236,C.literal("credit is erased."));
            if(C.field(eshkp,"eshk","debit").value) C.variadic(237,C.literal("debt increases by %ld %s."),delta,C.currency(delta));
 else C.variadic(238,C.literal("owe %s %ld %s."),C.shkname(shkp),delta,C.currency(delta));
        }
        (C.field(eshkp,"eshk","debit").value=C.i64(C.field(eshkp,"eshk","debit").value+delta));
        (C.field(eshkp,"eshk","loan").value=C.i64(C.field(eshkp,"eshk","loan").value+delta));
        (C.field(eshkp,"eshk","credit").value=0n);
    }
}

/* used in domove to block diagonal shop-exit */
/* x,y should always be a door */
export function block_door(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let roomno=C.i32(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value);
    let shkp;
    if(Number(!!(Number(roomno<0)||Number(!((Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(roomno)*C.sizes["struct mkroom"]),"mkroom","rtype").value)>=C.SHOPBASE))))))) return (C.i8(0));
    if(Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))))) return (C.i8(0));
    if(Number(roomno!=C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value))) return (C.i8(0));
    (shkp=shop_keeper(C.i8(roomno)));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return (C.i8(0));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(shkp,"monst","mx").value)==C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value))&&Number(C.i32(C.field(shkp,"monst","my").value)==C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value))))&&Number(C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value)==C.i32(x))))&&Number(C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value)==C.i32(y))))&&Number(!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))))))&&(Number(!!(Number(!!(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","debit").value||C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","billct").value))||C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","robbed").value)))))) {
        /* Actually, the shk should be made to block _any_
         * door, including a door the player digs, if the
         * shk is within a 'jumping' distance.
         */
        C.variadic(239,C.literal("%s%s blocks your way!"),C.Shknam(shkp),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal(" senses your motion and"):C.literal("")));
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* used in domove to block diagonal shop-entry;
   u.ux, u.uy should always be a door */
export function block_entry(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let sx; let sy;
    let roomno;
    let shkp;
    if(Number(!((Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","flags").value)==1))))))) return (C.i8(0));
    (roomno=C.i32(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value));
    if(Number(!!(Number(roomno<0)||Number(!((Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(roomno)*C.sizes["struct mkroom"]),"mkroom","rtype").value)>=C.SHOPBASE))))))) return (C.i8(0));
    (shkp=shop_keeper(C.i8(roomno)));
    if(Number(!!(Number(!(shkp))||Number(!(inhishop(shkp)))))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","x").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shd").address,"nhcoord","y").value)!=C.i32(C.field(C.u,"you","uy").value))))) return (C.i8(0));
    (sx=C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","x").value);
    (sy=C.field(C.field((C.field(C.field((shkp),"monst","mextra").value,"mextra","eshk").value),"eshk","shk").address,"nhcoord","y").value);
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(shkp,"monst","mx").value)==C.i32(sx))&&Number(C.i32(C.field(shkp,"monst","my").value)==C.i32(sy))))&&Number(!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))))))&&(Number(!!(Number(!!(Number(!!(Number(C.i32(x)==C.i32((C.i32(sx)-1)))||Number(C.i32(x)==C.i32((C.i32(sx)+1)))))||Number(C.i32(y)==C.i32((C.i32(sy)-1)))))||Number(C.i32(y)==C.i32((C.i32(sy)+1))))))))&&(Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))||C.carrying(C.PICK_AXE)))||C.carrying(C.DWARVISH_MATTOCK)))||C.field(C.u,"you","usteed").value)))))) {
        C.variadic(240,C.literal("%s%s blocks your way!"),C.Shknam(shkp),((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.INVIS)*C.sizes["struct prop"]),"prop","blocked").value)))))?C.literal(" senses your motion and"):C.literal("")));
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* "your " or "Foobar's " (note the trailing space) */
export function shk_your(buf,obj)
{
    buf=C.ptr(buf);
    obj=C.ptr(obj);
    let chk_pm=C.i8(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS)))))));
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    if(Number(!!(C.i32(chk_pm)&&(Number((C.u64((C.field(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(524288n))))!=C.u64(0n)))))) return buf;
 else if(Number(!!(C.i32(chk_pm)&&C.i32(C.the_unique_pm((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"])))))) C.strcpy(buf,C.literal("the"));
 else if(Number(!!(Number(!(shk_owns(buf,obj)))&&Number(!(mon_owns(buf,obj)))))) C.strcpy(buf,C.cell((C.field(C.c_common_strings,"c_common_strings","c_the_your").address+Number(((Number(C.i32(C.field((obj),"obj","where").value)==3))?1:0))*8),"char *").value);
    /* skip ownership prefix and space: "Medusa's corpse" */
    /* override ownership: "the Oracle's corpse" */
    return C.strcat(buf,C.literal(" "));
}

export function Shk_Your(buf,obj)
{
    buf=C.ptr(buf);
    obj=C.ptr(obj);
    shk_your(buf,obj);
    (C.cell(buf,"char").value=C.highc(C.cell(buf,"char").value));
    return buf;
}

export function shk_owns(buf,obj)
{
    buf=C.ptr(buf);
    obj=C.ptr(obj);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["shk_owns.x@200105",2],["shk_owns.y@200108",2]]);
    try {
    let shkp;
    let x=C.local("shk_owns.x@200105","short"); let y=C.local("shk_owns.y@200108","short");
    if(Number(!!(C.i32(C.get_obj_location(obj,x.address,y.address,0))&&(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)||(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==1)&&Number(!(C.field(obj,"obj","no_charge").value))))&&C.i32(costly_spot(x.value,y.value))))))))))) {
        (shkp=shop_keeper(inside_shop(x.value,y.value)));
        return C.strcpy(buf,(shkp?C.s_suffix(C.shkname(shkp)):C.cell((C.field(C.c_common_strings,"c_common_strings","c_the_your").address+Number(0)*8),"char *").value));
    }
    return 0;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

export function mon_owns(buf,obj)
{
    buf=C.ptr(buf);
    obj=C.ptr(obj);
    if(Number(C.i32(C.field(obj,"obj","where").value)==4)) return C.strcpy(buf,C.s_suffix(C.y_monnam(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value)));
    return 0;
}

export function cad(altusage)
{
    altusage=C.i8(altusage);
    /* used as a verbalized exclamation:  \"Cad! ...\" */
    let res=0;
    switch(((Number((C.u64((C.field((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value),"permonst","mflags2").value&C.u64(256n))))!=C.u64(0n)))?3:C.poly_gender())) {
        case (0):
            (res=C.literal("cad"));
        break;
        case (1):
            (res=C.literal("minx"));
        break;
        case (2):
            (res=C.literal("beast"));
        break;
        case (3):
            (res=C.literal("fiend"));
        break;
        default:
            C.variadic(241,C.literal("cad: unknown gender"));
        (res=C.literal("thing"));
        break;
    }
    if(altusage) {
        let cadbuf=C.mon_nam(C.field(C.gy,"instance_globals_y","youmonst").address);
        /* snag an output buffer */
        /* alternate usage adds a leading double quote and trailing
           exclamation point plus sentence separating spaces */
        C.variadic(242,cadbuf,C.literal("\"%s!  "),res);
        (C.cell((cadbuf+Number(1)*1),"char").value=C.highc(C.cell((cadbuf+Number(1)*1),"char").value));
        (res=cadbuf);
    }
    return res;
}

/*
 * The caller is about to make obj_absorbed go away.
 *
 * There's no way for you (or a shopkeeper) to prevent globs
 * from merging with each other on the floor due to the
 * inherent nature of globs so it irretrievably becomes part
 * of the floor glob mass. When one glob is absorbed by another
 * glob, the two become indistinguishable and the remaining
 * glob object grows in mass, the product of both.
 *
 * billing admin, player compensation, shopkeeper compensation
 * all need to be considered.
 *
 * Any original billed item is lost to the absorption so the
 * original billed amount for the object being absorbed must
 * get added to the cost owing for the absorber, and the
 * separate cost for the object being absorbed goes away.
 *
 * There are four scenarios to deal with:
 *     1. shop_owned glob merging into shop_owned glob
 *     2. player_owned glob merging into shop_owned glob
 *     3. shop_owned glob merging into player_owned glob
 *     4. player_owned glob merging into player_owned glob
 */
export function globby_bill_fixup(obj_absorber,obj_absorbed)
{
    obj_absorber=C.ptr(obj_absorber);
    obj_absorbed=C.ptr(obj_absorbed);
    const stackFrame=C.stackSave();
    const automaticFrame=C.enterAutomatic([["globby_bill_fixup.shkp@202740",8]]);
    try {
    let x=0; let y=0;
    let bp; let bp_absorber=0;
    let shkp=C.local("globby_bill_fixup.shkp@202740","struct monst *",0);
    let eshkp;
    let amount; let per_unit_cost;
    let floor_absorber=C.i8((Number(C.i32(C.field(obj_absorber,"obj","where").value)==1)));
    if(Number(!(C.field(obj_absorber,"obj","globby").value))) C.variadic(243,C.literal("globby_bill_fixup called for non-globby object"));
    if(floor_absorber) {
        ((x=C.i32(C.field(obj_absorber,"obj","ox").value)),(y=C.i32(C.field(obj_absorber,"obj","oy").value)));
    }
    if(C.field(obj_absorber,"obj","unpaid").value) {
        /* look for a shopkeeper who owns this object */
        for((shkp.value=next_shkp(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,(C.i8(1))));shkp.value;(shkp.value=next_shkp(C.field(shkp.value,"monst","nmon").value,(C.i8(1))))) if(onbill(obj_absorber,shkp.value,(C.i8(1)))) break;

    } else if(C.field(obj_absorbed,"obj","unpaid").value) {
        if(Number(!!(Number(!!(Number(C.i32(C.field(obj_absorbed,"obj","where").value)==0)&&C.i32(floor_absorber)))&&C.i32(costly_spot(C.i16(x),C.i16(y)))))) {
            (shkp.value=shop_keeper(C.cell(C.in_rooms(C.i16(x),C.i16(y),C.SHOPBASE),"char").value));
        }
    }
    /* sanity check, in case obj is on bill but not marked 'unpaid' */
    if(Number(!(shkp.value))) (shkp.value=shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value));
    if(Number(!(shkp.value))) return;
    (bp_absorber=onbill(obj_absorber,shkp.value,(C.i8(0))));
    (bp=onbill(obj_absorbed,shkp.value,(C.i8(0))));
    (eshkp=(C.field(C.field((shkp.value),"monst","mextra").value,"mextra","eshk").value));
    (per_unit_cost=set_cost(obj_absorbed,shkp.value));
    /**************************************************************
     * Scenario 1. Shop-owned glob absorbing into shop-owned glob
     **************************************************************/
    if(Number(!!(bp&&(Number(!!(Number(!(C.field(obj_absorber,"obj","no_charge").value))||C.i32(billable(shkp.address,obj_absorber,C.i8(C.field(eshkp,"eshk","shoproom").value),(C.i8(0)))))))))) {
        /* the glob being absorbed has a billing record */
        (amount=C.field(bp,"bill_x","price").value);
        (()=>{const ref=C.field(eshkp,"eshk","billct");const old=ref.value;ref.value=C.i32((old-1));return old;})();
        C.copy(bp,(C.field(eshkp,"eshk","bill_p").value+Number(C.field(eshkp,"eshk","billct").value)*C.sizes["struct bill_x"]),C.sizes["struct bill_x"]);
        clear_unpaid_obj(shkp.value,obj_absorbed);
        if(bp_absorber) {
            /* the absorber has a billing record */
            (C.field(bp_absorber,"bill_x","price").value=C.i64(C.field(bp_absorber,"bill_x","price").value+amount));
        } else {
            /* the absorber has no billing record */
            ;
        }
        return;
    }
    /**************************************************************
     * Scenario 2. Player-owned glob absorbing into shop-owned glob
     **************************************************************/
    if(Number(!!(Number(!!(Number(!(bp_absorber))&&Number(!(bp))))&&Number(!(C.field(obj_absorber,"obj","no_charge").value))))) {
        /* there are no billing records */
        (amount=C.i64((get_pricing_units(obj_absorbed)*per_unit_cost)));
        if(C.saleable(shkp.value,obj_absorbed)) {
            if(Number(C.field(eshkp,"eshk","debit").value>=amount)) {
                if(C.field(eshkp,"eshk","loan").value) {
                    /* you carry shop's gold */
                    if(Number(C.field(eshkp,"eshk","loan").value>=amount)) (C.field(eshkp,"eshk","loan").value=C.i64(C.field(eshkp,"eshk","loan").value-amount));
 else (C.field(eshkp,"eshk","loan").value=0n);
                }
                (C.field(eshkp,"eshk","debit").value=C.i64(C.field(eshkp,"eshk","debit").value-amount));
                C.variadic(244,C.literal("donated %s %spays off your debt."),C.obj_typename(C.i32(C.field(obj_absorbed,"obj","otyp").value)),(C.field(eshkp,"eshk","debit").value?C.literal("partially "):C.literal("")));
            } else {
                let delta=C.i64((amount-C.field(eshkp,"eshk","debit").value));
                (C.field(eshkp,"eshk","credit").value=C.i64(C.field(eshkp,"eshk","credit").value+delta));
                if(C.field(eshkp,"eshk","debit").value) {
                    (C.field(eshkp,"eshk","debit").value=0n);
                    (C.field(eshkp,"eshk","loan").value=0n);
                    C.variadic(245,C.literal("debt is paid off."));
                }
                if(Number(C.field(eshkp,"eshk","credit").value==delta)) C.variadic(246,C.literal("%s established %ld %s credit."),C.obj_typename(C.i32(C.field(obj_absorbed,"obj","otyp").value)),delta,C.currency(delta));
 else C.variadic(247,C.literal("%s added %ld %s %s %ld %s."),C.obj_typename(C.i32(C.field(obj_absorbed,"obj","otyp").value)),delta,C.currency(delta),C.literal("to your credit; total is now"),C.field(eshkp,"eshk","credit").value,C.currency(C.field(eshkp,"eshk","credit").value));
            }
        }
        return;
    } else if(bp_absorber) {
        /* absorber has a billing record */
        (C.field(bp_absorber,"bill_x","price").value=C.i64(C.field(bp_absorber,"bill_x","price").value+C.i64((per_unit_cost*get_pricing_units(obj_absorbed)))));
        return;
    }
    /**************************************************************
     * Scenario 3. shop_owned glob merging into player_owned glob
     **************************************************************/
    if(Number(!!(bp&&(Number(!!(C.i32(C.field(obj_absorber,"obj","no_charge").value)||(Number(!!(C.i32(floor_absorber)&&Number(!(costly_spot(C.i16(x),C.i16(y))))))))))))) {
        (amount=C.field(bp,"bill_x","price").value);
        C.bill_dummy_object(obj_absorbed);
        ;
        C.variadic(248,C.literal("You owe me %ld %s for my %s that you %s with your%s"),amount,C.currency(amount),C.obj_typename(C.i32(C.field(obj_absorbed,"obj","otyp").value)),((Number(!((C.field((shkp.value),"monst","mpeaceful").value))))?C.literal("had the audacity to mix"):C.literal("just mixed")),((Number(!((C.field((shkp.value),"monst","mpeaceful").value))))?C.literal(" stinking batch!"):C.literal("s.")));
        return;
    }
    /**************************************************************
     * Scenario 4. player_owned glob merging into player_owned glob
     **************************************************************/
    return;
    } finally {C.leaveAutomatic(automaticFrame);C.stackRestore(stackFrame); }
}

/* Shopkeeper bills for use of a land mine or bear trap they own */
export function use_unpaid_trapobj(otmp,x,y)
{
    otmp=C.ptr(otmp);
    x=C.i16(x);
    y=C.i16(y);
    if(C.field(otmp,"obj","unpaid").value) {
        if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
            let shkp=find_objowner(otmp,x,y);
            if(Number(!!(shkp&&Number(!((Number(!!((Number(!!(C.i32(C.field((shkp),"monst","msleeping").value)||Number(!(C.field((shkp),"monst","mcanmove").value)))))||Number(C.i32(C.field(C.field((shkp),"monst","data").value,"permonst","msound").value)<=C.MS_ANIMAL))))))))) {
                ;
                C.variadic(249,C.literal("You set it, you buy it!"));
            }
        }
        C.bill_dummy_object(otmp);
    }
}

/*shk.c*/
export const shkStaticInitializers = C => [
    {name:"and_its_contents",type:"char[18]",size:(1*18),values:C.literal(" and its contents")},
    {name:"the_contents_of",type:"char[17]",size:(1*17),values:C.literal("the contents of ")},
    {name:"angrytexts",type:"char *[3]",size:(8*3),values:[C.literal("quite upset"),C.literal("ticked off"),C.literal("furious")]},
    {name:"credit_report.credit_snap",type:"long[2][3]",size:((8*2)*3),values:[[0n,0n,0n],[0n,0n,0n]]},
    {name:"u_entered_shop.empty_shops",type:"char[5]",size:(1*5),values:null},
    {name:"pick_pick.pickmovetime",type:"long",size:8,values:0n},
    {name:"no_money",type:"char[30]",size:(1*30),values:C.literal("Moreover, you%s have no gold.")},
    {name:"not_enough_money",type:"char[47]",size:(1*47),values:C.literal("Besides, you don't have enough to interest %s.")},
    {name:"make_itemized_bill.zerosbi",type:"struct sortbill_item",size:C.sizes["struct sortbill_item"],values:null},
    {name:"append_honorific.honored",type:"char *[5]",size:(8*5),values:[C.literal("good"),C.literal("honored"),C.literal("most gracious"),C.literal("esteemed"),C.literal("most renowned and sacred")]},
    {name:"makekops.k_mndx",type:"short[4]",size:(2*4),values:[C.i16(C.PM_KEYSTONE_KOP),C.i16(C.PM_KOP_SERGEANT),C.i16(C.PM_KOP_LIEUTENANT),C.i16(C.PM_KOP_KAPTAIN)]},
    {name:"Izchak_speaks",type:"char *[9]",size:(8*9),values:[C.literal("%s says: 'These shopping malls give me a headache.'"),C.literal("%s says: 'Slow down.  Think clearly.'"),C.literal("%s says: 'You need to take things one at a time.'"),C.literal("%s says: 'I don't like poofy coffee... give me Colombian Supremo.'"),C.literal("%s says that getting the devteam's agreement on anything is difficult."),C.literal("%s says that he has noticed those who serve their deity will prosper."),C.literal("%s says: 'Don't try to steal from me - I have friends in high places!'"),C.literal("%s says: 'You may well need something from this shop in the future.'"),C.literal("%s comments about the Valley of the Dead as being a gateway.")]},
];
