import { C } from '../c-runtime/context.js';
/* NetHack 5.0	dungeon.c	$NHDT-Date: 1737343478 2025/01/19 19:24:38 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.228 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2012. */
/* NetHack may be freely redistributed.  See license for details. */
/* corresponding level pointers */
/* starting index of current dungeon sp levels */
/* number of tmplevel entries */
/* number of tmpbranch entries */
export function dumpit()
{
    let i;
    let x;
    let br;
    if(Number(!(C.debugcore(C.literal("dungeon.c"),(C.i8(0)))))) return;
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);((i=C.i32((i+1)))-1)) {
        C.variadic(0,(C.global("stderr").value),C.literal("\n#%d \"%s\" (%s):\n"),i,C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","dname").address,C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","proto").address);
        C.variadic(1,(C.global("stderr").value),C.literal("    num_dunlevs %d, dunlev_ureached %d\n"),C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value),C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value));
        C.variadic(2,(C.global("stderr").value),C.literal("    depth_start %d, ledger_start %d\n"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","depth_start").value,C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value);
        C.variadic(3,(C.global("stderr").value),C.literal("    flags:%s%s%s\n"),(C.i32(C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","rogue_like").value)?C.literal(" rogue_like"):C.literal("")),(C.i32(C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","maze_like").value)?C.literal(" maze_like"):C.literal("")),(C.i32(C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","hellish").value)?C.literal(" hellish"):C.literal("")));
        C.getchar();
    }
    C.variadic(4,(C.global("stderr").value),C.literal("\nSpecial levels:\n"));
    for((x=C.field(C.svs,"instance_globals_saved_s","sp_levchn").value);x;(x=C.field(x,"s_level","next").value)) {
        C.variadic(5,(C.global("stderr").value),C.literal("%s (%d): "),C.field(x,"s_level","proto").address,C.i32(C.field(x,"s_level","rndlevs").value));
        C.variadic(6,(C.global("stderr").value),C.literal("on %d, %d; "),C.i32(C.field(C.field(x,"s_level","dlevel").address,"d_level","dnum").value),C.i32(C.field(C.field(x,"s_level","dlevel").address,"d_level","dlevel").value));
        C.variadic(7,(C.global("stderr").value),C.literal("flags:%s%s%s%s\n"),(C.i32(C.field(C.field(x,"s_level","flags").address,"d_flags","rogue_like").value)?C.literal(" rogue_like"):C.literal("")),(C.i32(C.field(C.field(x,"s_level","flags").address,"d_flags","maze_like").value)?C.literal(" maze_like"):C.literal("")),(C.i32(C.field(C.field(x,"s_level","flags").address,"d_flags","hellish").value)?C.literal(" hellish"):C.literal("")),(C.i32(C.field(C.field(x,"s_level","flags").address,"d_flags","town").value)?C.literal(" town"):C.literal("")));
        C.getchar();
    }
    C.variadic(8,(C.global("stderr").value),C.literal("\nBranches:\n"));
    for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) {
        C.variadic(9,(C.global("stderr").value),C.literal("%d: %s, end1 %d %d, end2 %d %d, %s\n"),C.field(br,"branch","id").value,(Number(C.field(br,"branch","type").value==0)?C.literal("stair"):(Number(C.field(br,"branch","type").value==1)?C.literal("no end1"):(Number(C.field(br,"branch","type").value==2)?C.literal("no end2"):(Number(C.field(br,"branch","type").value==3)?C.literal("portal"):C.literal("unknown"))))),C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dnum").value),C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dlevel").value),C.i32(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value),C.i32(C.field(C.field(br,"branch","end2").address,"d_level","dlevel").value),(C.i32(C.field(br,"branch","end1_up").value)?C.literal("end1 up"):C.literal("end1 down")));
    }
    C.getchar();
    C.variadic(10,(C.global("stderr").value),C.literal("\nDone\n"));
    C.getchar();
    return;
}

/* Save the dungeon structures. */
export function save_dungeon(nhfp,perform_write,free_data)
{
    nhfp=C.ptr(nhfp);
    perform_write=C.i8(perform_write);
    free_data=C.i8(free_data);
    const stackFrame=C.stackSave();
    try {
    let i; let count=C.local("int",0);
    let curr; let next;
    let curr_ms; let next_ms;
    if(perform_write) {
        C.sfo_int(nhfp,C.field(C.svn,"instance_globals_saved_n","n_dgns").address,C.literal("dungeon_count"));
        for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);(i=C.i32((i+1)))) {
            C.sfo_dungeon(nhfp,(C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),C.literal("dungeon"));
        }
        C.sfo_dgn_topology(nhfp,C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,C.literal("svd.dungeon_topology"));
        C.sfo_char(nhfp,C.field(C.svt,"instance_globals_saved_t","tune").address,C.literal("tune"),C.i32(BigInt((1*6))));
        for(((count.value=0),(curr=C.field(C.svb,"instance_globals_saved_b","branches").value));curr;(curr=C.field(curr,"branch","next").value)) ((count.value=C.i32((count.value+1)))-1);

        C.sfo_int(nhfp,count.address,C.literal("branch_count"));
        for((curr=C.field(C.svb,"instance_globals_saved_b","branches").value);curr;(curr=C.field(curr,"branch","next").value)) {
            C.sfo_branch(nhfp,curr,C.literal("branch"));
        }
        (count.value=C.i32(maxledgerno()));
        C.sfo_int(nhfp,count.address,C.literal("level_info_count"));
        for((i=0);Number(i<count.value);(i=C.i32((i+1)))) {
            C.sfo_linfo(nhfp,(C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(i)*C.sizes["struct linfo"]),C.literal("svl.level_info"));
        }
        C.sfo_nhcoord(nhfp,C.field(C.svi,"instance_globals_saved_i","inv_pos").address,C.literal("svi.inv_pos"));
        for(((count.value=0),(curr_ms=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value));curr_ms;(curr_ms=C.field(curr_ms,"mapseen","next").value)) ((count.value=C.i32((count.value+1)))-1);

        C.sfo_int(nhfp,count.address,C.literal("mapseen_count"));
        for((curr_ms=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);curr_ms;(curr_ms=C.field(curr_ms,"mapseen","next").value)) {
            save_mapseen(nhfp,curr_ms);
        }
    }
    if(free_data) {
        for((curr=C.field(C.svb,"instance_globals_saved_b","branches").value);curr;(curr=next)) {
            (next=C.field(curr,"branch","next").value);
            C.free(curr);
        }
        (C.field(C.svb,"instance_globals_saved_b","branches").value=0);
        for((curr_ms=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);curr_ms;(curr_ms=next_ms)) {
            (next_ms=C.field(curr_ms,"mapseen","next").value);
            if(C.field(curr_ms,"mapseen","custom").value) C.free(C.field(curr_ms,"mapseen","custom").value);
            if(C.field(curr_ms,"mapseen","final_resting_place").value) C.savecemetery(nhfp,C.field(curr_ms,"mapseen","final_resting_place").address);
            C.free(curr_ms);
        }
        (C.field(C.svm,"instance_globals_saved_m","mapseenchn").value=0);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* !SFCTOOL */
/* Restore the dungeon structures. */
export function restore_dungeon(nhfp)
{
    nhfp=C.ptr(nhfp);
    const stackFrame=C.stackSave();
    try {
    let curr; let last;
    let count=C.local("int",0);
    let i;
    let curr_ms; let last_ms;
    C.sfi_int(nhfp,C.field(C.svn,"instance_globals_saved_n","n_dgns").address,C.literal("dungeon_count"));
    ;
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);(i=C.i32((i+1)))) {
        C.sfi_dungeon(nhfp,(C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),C.literal("dungeon"));
    }
    C.sfi_dgn_topology(nhfp,C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,C.literal("svd.dungeon_topology"));
    C.sfi_char(nhfp,C.field(C.svt,"instance_globals_saved_t","tune").address,C.literal("tune"),C.i32(BigInt((1*6))));
    (last=(C.field(C.svb,"instance_globals_saved_b","branches").value=0));
    C.sfi_int(nhfp,count.address,C.literal("branch_count"));
    ;
    for((i=0);Number(i<count.value);((i=C.i32((i+1)))-1)) {
        (curr=C.alloc(C.u32(BigInt(C.sizes["struct branch"]))));
        C.sfi_branch(nhfp,curr,C.literal("branch"));
        (C.field(curr,"branch","next").value=0);
        if(last) (C.field(last,"branch","next").value=curr);
 else (C.field(C.svb,"instance_globals_saved_b","branches").value=curr);
        (last=curr);
    }
    C.sfi_int(nhfp,count.address,C.literal("level_info_count"));
    ;
    if(Number(count.value>=(C.i32((16*32))))) C.variadic(11,C.literal("level information count larger (%d) than allocated size"),count.value);
    for((i=0);Number(i<count.value);(i=C.i32((i+1)))) {
        C.sfi_linfo(nhfp,(C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(i)*C.sizes["struct linfo"]),C.literal("svl.level_info"));
    }
    C.sfi_nhcoord(nhfp,C.field(C.svi,"instance_globals_saved_i","inv_pos").address,C.literal("svi.inv_pos"));
    C.sfi_int(nhfp,count.address,C.literal("mapseen_count"));
    ;
    (last_ms=0);
    for((i=0);Number(i<count.value);((i=C.i32((i+1)))-1)) {
        (curr_ms=load_mapseen(nhfp));
        (C.field(curr_ms,"mapseen","next").value=0);
        if(last_ms) (C.field(last_ms,"mapseen","next").value=curr_ms);
 else (C.field(C.svm,"instance_globals_saved_m","mapseenchn").value=curr_ms);
        (last_ms=curr_ms);
    }
    } finally {C.stackRestore(stackFrame); }
}

export function dname_to_dnum(s)
{
    s=C.ptr(s);
    let i;
    for((i=C.i16(0));Number(C.i32(i)<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);((i=C.i16((i+1)))-1)) if(Number(!(C.strcmp(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","dname").address,s)))) return i;

    C.variadic(12,C.literal("Couldn't resolve dungeon number for name \"%s\"."),s);
    /*NOT REACHED*/
    return C.i16(0);
}

export function find_level(s)
{
    s=C.ptr(s);
    let curr;
    for((curr=C.field(C.svs,"instance_globals_saved_s","sp_levchn").value);curr;(curr=C.field(curr,"s_level","next").value)) if(Number(!(C.strncmpi((s),(C.field(curr,"s_level","proto").address),C.i32((-1)))))) break;

    return curr;
}

/* Find the branch that links the named dungeon. */
export function find_branch(s,pd)
{
    s=C.ptr(s);
    pd=C.ptr(pd);
    /* dungeon name */
    let i;
    if(pd) {
        for((i=0);Number(i<C.field(pd,"proto_dungeon","n_brs").value);((i=C.i32((i+1)))-1)) if(Number(!(C.strcmp(C.field((C.field(pd,"proto_dungeon","tmpbranch").address+Number(i)*C.sizes["struct tmpbranch"]),"tmpbranch","name").value,s)))) break;

        if(Number(i==C.field(pd,"proto_dungeon","n_brs").value)) C.variadic(13,C.literal("find_branch: can't find %s"),s);
    } else {
        /* support for level tport by name */
        let br;
        let dnam;
        for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) {
            (dnam=C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","dname").address);
            if(Number(!!(Number(!(C.strncmpi((dnam),(s),C.i32((-1)))))||(Number(!!(Number(!(C.strncmpi(dnam,C.literal("The "),4)))&&Number(!(C.strncmpi(((dnam+Number(4)*1)),(s),C.i32((-1))))))))))) break;
        }
        (i=(br?(C.i32(((C.i32((C.i32(ledger_no(C.field(br,"branch","end1").address))<<8)))|C.i32(ledger_no(C.field(br,"branch","end2").address))))):C.i32((-1))));
    }
    return i;
}

/*
 * Find the "parent" by searching the prototype branch list for the branch
 * listing, then figuring out to which dungeon it belongs.
 */
export function parent_dnum(s,pd)
{
    s=C.ptr(s);
    pd=C.ptr(pd);
    /* dungeon name */
    let i;
    let pdnum;
    (i=find_branch(s,pd));
    /*
     * Got branch, now find parent dungeon.  Stop if we have reached
     * "this" dungeon (if we haven't found it by now it is an error).
     */
    for((pdnum=C.i16(0));C.strcmp(C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(pdnum)*C.sizes["struct tmpdungeon"]),"tmpdungeon","name").value,s);((pdnum=C.i16((pdnum+1)))-1)) if(Number(((i=C.i32(i-C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(pdnum)*C.sizes["struct tmpdungeon"]),"tmpdungeon","branches").value)))<0)) return pdnum;

    C.variadic(14,C.literal("parent_dnum: couldn't resolve branch."));
    /*NOT REACHED*/
    return C.i16(0);
}

/*
 * Return a starting point and number of successive positions a level
 * or dungeon entrance can occupy.
 *
 * Note: This follows the acouple (instead of the rcouple) rules for a
 *       negative random component (randc < 0).  These rules are found
 *       in dgn_comp.y.  The acouple [absolute couple] section says that
 *       a negative random component means from the (adjusted) base to the
 *       end of the dungeon.
 */
export function level_range(dgn,base,randc,chain,pd,adjusted_base)
{
    dgn=C.i16(dgn);
    base=C.i32(base);
    randc=C.i32(randc);
    chain=C.i32(chain);
    pd=C.ptr(pd);
    adjusted_base=C.ptr(adjusted_base);
    let lmax=C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value);
    if(Number(chain>=0)) {
        /* relative to a special level */
        let levtmp=C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(chain)*8),"struct s_level *").value;
        if(Number(!(levtmp))) C.variadic(15,C.literal("level_range: empty chain level!"));
        (base=C.i32(base+C.i32(C.field(C.field(levtmp,"s_level","dlevel").address,"d_level","dlevel").value)));
    } else {
        /* absolute in the dungeon */
        /* from end of dungeon */
        if(Number(base<0)) (base=(C.i32((C.i32((lmax+base))+1))));
    }
    if(Number(!!(Number(base<1)||Number(base>lmax)))) C.variadic(16,C.literal("level_range: base value out of range"));
    (C.cell(adjusted_base,"int").value=base);
    if(Number(randc==C.i32((-1)))) {
        /* from base to end of dungeon */
        return (C.i32((C.i32((lmax-base))+1)));
    } else if(randc) {
        /* make sure we don't run off the end of the dungeon */
        return (((Number((C.i32((C.i32((base+randc))-1)))>lmax))?C.i32((C.i32((lmax-base))+1)):randc));
    }
    /* else only one choice */
    return 1;
}

export function parent_dlevel(s,pd)
{
    s=C.ptr(s);
    pd=C.ptr(pd);
    const stackFrame=C.stackSave();
    try {
    let i; let j; let num; let base=C.local("int",0); let dnum=C.i32(parent_dnum(s,pd));
    let curr;
    (i=find_branch(s,pd));
    (num=level_range(C.i16(dnum),C.i32(C.field(C.field((C.field(pd,"proto_dungeon","tmpbranch").address+Number(i)*C.sizes["struct tmpbranch"]),"tmpbranch","lev").address,"couple","base").value),C.i32(C.field(C.field((C.field(pd,"proto_dungeon","tmpbranch").address+Number(i)*C.sizes["struct tmpbranch"]),"tmpbranch","lev").address,"couple","rand").value),C.field((C.field(pd,"proto_dungeon","tmpbranch").address+Number(i)*C.sizes["struct tmpbranch"]),"tmpbranch","chain").value,pd,base.address));
    /* KMH -- Try our best to find a level without an existing branch */
    (i=(j=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),426,(C.literal("parent_dlevel"))),C.rn2(num))):C.rn2(num)))));
    do {
        if(Number((i=C.i32((i+1)))>=num)) (i=0);
        for((curr=C.field(C.svb,"instance_globals_saved_b","branches").value);curr;(curr=C.field(curr,"branch","next").value)) if(Number(!!((Number(!!(Number(C.i32(C.field(C.field(curr,"branch","end1").address,"d_level","dnum").value)==dnum)&&Number(C.i32(C.field(C.field(curr,"branch","end1").address,"d_level","dlevel").value)==C.i32((base.value+i))))))||(Number(!!(Number(C.i32(C.field(C.field(curr,"branch","end2").address,"d_level","dnum").value)==dnum)&&Number(C.i32(C.field(C.field(curr,"branch","end2").address,"d_level","dlevel").value)==C.i32((base.value+i))))))))) break;

    } while(Number(!!(curr&&Number(i!=j))));
    return C.i16((C.i32((base.value+i))));
    } finally {C.stackRestore(stackFrame); }
}

/* Convert from the temporary branch type to the dungeon branch type. */
export function correct_branch_type(tbr)
{
    tbr=C.ptr(tbr);
    switch(C.field(tbr,"tmpbranch","type").value) {
        case (0):
            return 0;
        case (1):
            return (C.field(tbr,"tmpbranch","up").value?1:2);
        case (2):
            return (C.field(tbr,"tmpbranch","up").value?2:1);
        case (3):
            return 3;
    }
    C.variadic(17,C.literal("correct_branch_type: unknown branch type"));
    return 0;
}

/*
 * Add the given branch to the branch list.  The branch list is ordered
 * by end1 dungeon and level followed by end2 dungeon and level.  If
 * extract_first is true, then the branch is already part of the list
 * but needs to be repositioned.
 */
export function insert_branch(new_branch,extract_first)
{
    new_branch=C.ptr(new_branch);
    extract_first=C.i8(extract_first);
    let curr; let prev;
    let new_val; let curr_val; let prev_val;
    if(extract_first) {
        for(((prev=0),(curr=C.field(C.svb,"instance_globals_saved_b","branches").value));curr;((prev=curr),(curr=C.field(curr,"branch","next").value))) if(Number(curr==new_branch)) break;

        if(Number(!(curr))) C.variadic(18,C.literal("insert_branch: not found"));
        if(prev) (C.field(prev,"branch","next").value=C.field(curr,"branch","next").value);
 else (C.field(C.svb,"instance_globals_saved_b","branches").value=C.field(curr,"branch","next").value);
    }
    (C.field(new_branch,"branch","next").value=0);
    /* Convert the branch into a unique number so we can sort them. */
    /*
     * Insert the new branch into the correct place in the branch list.
     */
    (prev=0);
    (prev_val=C.i64(C.i32((-1))));
    (new_val=(C.i64(((C.i64((C.i64(((C.i64((C.i64((C.i64(C.field(C.field((new_branch),"branch","end1").address,"d_level","dnum").value)*C.i64((C.i32((32+1))))))+C.i64(C.field(C.field((new_branch),"branch","end1").address,"d_level","dlevel").value))))*C.i64((C.i32((16+1))))))*C.i64((C.i32((32+1)))))))+(C.i64((C.i64((C.i64(C.field(C.field((new_branch),"branch","end2").address,"d_level","dnum").value)*C.i64((C.i32((32+1))))))+C.i64(C.field(C.field((new_branch),"branch","end2").address,"d_level","dlevel").value))))))));
    for((curr=C.field(C.svb,"instance_globals_saved_b","branches").value);curr;(((prev_val=curr_val),(prev=curr)),(curr=C.field(curr,"branch","next").value))) {
        (curr_val=(C.i64(((C.i64((C.i64(((C.i64((C.i64((C.i64(C.field(C.field((curr),"branch","end1").address,"d_level","dnum").value)*C.i64((C.i32((32+1))))))+C.i64(C.field(C.field((curr),"branch","end1").address,"d_level","dlevel").value))))*C.i64((C.i32((16+1))))))*C.i64((C.i32((32+1)))))))+(C.i64((C.i64((C.i64(C.field(C.field((curr),"branch","end2").address,"d_level","dnum").value)*C.i64((C.i32((32+1))))))+C.i64(C.field(C.field((curr),"branch","end2").address,"d_level","dlevel").value))))))));
        if(Number(!!(Number(prev_val<new_val)&&Number(new_val<=curr_val)))) break;
    }
    if(prev) {
        (C.field(new_branch,"branch","next").value=curr);
        (C.field(prev,"branch","next").value=new_branch);
    } else {
        (C.field(new_branch,"branch","next").value=C.field(C.svb,"instance_globals_saved_b","branches").value);
        (C.field(C.svb,"instance_globals_saved_b","branches").value=new_branch);
    }
}

/* Add a dungeon branch to the branch list. */
export function add_branch(dgn,child_entry_level,pd)
{
    dgn=C.i32(dgn);
    child_entry_level=C.i32(child_entry_level);
    pd=C.ptr(pd);
    
    let branch_num;
    let new_branch;
    (branch_num=find_branch(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","dname").address,pd));
    (new_branch=C.alloc(C.u32(BigInt(C.sizes["struct branch"]))));
    C.memset(new_branch,0,BigInt(C.sizes["struct branch"]));
    (C.field(new_branch,"branch","next").value=0);
    (C.field(new_branch,"branch","id").value=((C.cell(C.staticAddress("branch_id"),"int").value=C.i32((C.cell(C.staticAddress("branch_id"),"int").value+1)))-1));
    (C.field(new_branch,"branch","type").value=correct_branch_type((C.field(pd,"proto_dungeon","tmpbranch").address+Number(branch_num)*C.sizes["struct tmpbranch"])));
    (C.field(C.field(new_branch,"branch","end1").address,"d_level","dnum").value=parent_dnum(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","dname").address,pd));
    (C.field(C.field(new_branch,"branch","end1").address,"d_level","dlevel").value=parent_dlevel(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","dname").address,pd));
    (C.field(C.field(new_branch,"branch","end2").address,"d_level","dnum").value=C.i16(dgn));
    (C.field(C.field(new_branch,"branch","end2").address,"d_level","dlevel").value=C.i16(child_entry_level));
    (C.field(new_branch,"branch","end1_up").value=C.i8((C.field((C.field(pd,"proto_dungeon","tmpbranch").address+Number(branch_num)*C.sizes["struct tmpbranch"]),"tmpbranch","up").value?C.i32((C.i8(1))):C.i32((C.i8(0))))));
    insert_branch(new_branch,(C.i8(0)));
    return new_branch;
}

/*
 * Add new level to special level chain.  Insert it in level order with the
 * other levels in this dungeon.  This assumes that we are never given a
 * level that has a dungeon number less than the dungeon number of the
 * last entry.
 */
export function add_level(new_lev)
{
    new_lev=C.ptr(new_lev);
    let prev; let curr;
    (prev=0);
    for((curr=C.field(C.svs,"instance_globals_saved_s","sp_levchn").value);curr;(curr=C.field(curr,"s_level","next").value)) {
        if(Number(!!(Number(C.i32(C.field(C.field(curr,"s_level","dlevel").address,"d_level","dnum").value)==C.i32(C.field(C.field(new_lev,"s_level","dlevel").address,"d_level","dnum").value))&&Number(C.i32(C.field(C.field(curr,"s_level","dlevel").address,"d_level","dlevel").value)>C.i32(C.field(C.field(new_lev,"s_level","dlevel").address,"d_level","dlevel").value))))) break;
        (prev=curr);
    }
    if(Number(!(prev))) {
        (C.field(new_lev,"s_level","next").value=C.field(C.svs,"instance_globals_saved_s","sp_levchn").value);
        (C.field(C.svs,"instance_globals_saved_s","sp_levchn").value=new_lev);
    } else {
        (C.field(new_lev,"s_level","next").value=curr);
        (C.field(prev,"s_level","next").value=new_lev);
    }
}

export function init_level(dgn,proto_index,pd)
{
    dgn=C.i32(dgn);
    proto_index=C.i32(proto_index);
    pd=C.ptr(pd);
    let new_level;
    let tlevel=(C.field(pd,"proto_dungeon","tmplevel").address+Number(proto_index)*C.sizes["struct tmplevel"]);
    (C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(proto_index)*8),"struct s_level *").value=0);
    /* no "real" level */
    if(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))&&Number(C.field(tlevel,"tmplevel","chance").value<=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),572,(C.literal("init_level"))),C.rn2(100))):C.rn2(100))))))) return;
    (C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(proto_index)*8),"struct s_level *").value=(new_level=C.alloc(C.u32(BigInt(C.sizes["struct s_level"])))));
    C.memset(new_level,0,BigInt(C.sizes["struct s_level"]));
    /* load new level with data */
    C.strcpy(C.field(new_level,"s_level","proto").address,C.field(tlevel,"tmplevel","name").value);
    (C.field(new_level,"s_level","boneid").value=C.field(tlevel,"tmplevel","boneschar").value);
    (C.field(C.field(new_level,"s_level","dlevel").address,"d_level","dnum").value=C.i16(dgn));
    (C.field(C.field(new_level,"s_level","dlevel").address,"d_level","dlevel").value=C.i16(0));
    /* for now */
    (C.field(C.field(new_level,"s_level","flags").address,"d_flags","town").value=C.u32(Number(!(Number(!((C.i32((C.field(tlevel,"tmplevel","flags").value&1)))))))));
    (C.field(C.field(new_level,"s_level","flags").address,"d_flags","hellish").value=C.u32(Number(!(Number(!((C.i32((C.field(tlevel,"tmplevel","flags").value&2)))))))));
    (C.field(C.field(new_level,"s_level","flags").address,"d_flags","maze_like").value=C.u32(Number(!(Number(!((C.i32((C.field(tlevel,"tmplevel","flags").value&4)))))))));
    (C.field(C.field(new_level,"s_level","flags").address,"d_flags","rogue_like").value=C.u32(Number(!(Number(!((C.i32((C.field(tlevel,"tmplevel","flags").value&8)))))))));
    (C.field(C.field(new_level,"s_level","flags").address,"d_flags","align").value=C.u32((C.i32(((C.i32((C.field(tlevel,"tmplevel","flags").value&112)))>>4)))));
    if(Number(!(C.field(C.field(new_level,"s_level","flags").address,"d_flags","align").value))) (C.field(C.field(new_level,"s_level","flags").address,"d_flags","align").value=C.u32((C.i32(((C.i32((C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dgn)*C.sizes["struct tmpdungeon"]),"tmpdungeon","flags").value&112)))>>4)))));
    (C.field(new_level,"s_level","rndlevs").value=C.u8(C.field(tlevel,"tmplevel","rndlevs").value));
    (C.field(new_level,"s_level","next").value=0);
}

export function possible_places(idx,map,pd)
{
    idx=C.i32(idx);
    map=C.ptr(map);
    pd=C.ptr(pd);
    const stackFrame=C.stackSave();
    try {
    /* prototype index */
    /* array MAXLEVEL+1 in length */
    let i; let start=C.local("int",0); let count;
    let lev=C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(idx)*8),"struct s_level *").value;
    /* init level possibilities */
    for((i=0);Number(i<=32);((i=C.i32((i+1)))-1)) (C.cell((map+Number(i)*1),"signed char").value=(C.i8(0)));

    /* get base and range and set those entries to true */
    (count=level_range(C.field(C.field(lev,"s_level","dlevel").address,"d_level","dnum").value,C.i32(C.field(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(idx)*C.sizes["struct tmplevel"]),"tmplevel","lev").address,"couple","base").value),C.i32(C.field(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(idx)*C.sizes["struct tmplevel"]),"tmplevel","lev").address,"couple","rand").value),C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(idx)*C.sizes["struct tmplevel"]),"tmplevel","chain").value,pd,start.address));
    for((i=start.value);Number(i<C.i32((start.value+count)));((i=C.i32((i+1)))-1)) (C.cell((map+Number(i)*1),"signed char").value=(C.i8(1)));

    /* mark off already placed levels */
    for((i=C.field(pd,"proto_dungeon","start").value);Number(i<idx);((i=C.i32((i+1)))-1)) {
        if(Number(!!(C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(i)*8),"struct s_level *").value&&C.i32(C.cell((map+Number(C.field(C.field(C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(i)*8),"struct s_level *").value,"s_level","dlevel").address,"d_level","dlevel").value)*1),"signed char").value)))) {
            (C.cell((map+Number(C.field(C.field(C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(i)*8),"struct s_level *").value,"s_level","dlevel").address,"d_level","dlevel").value)*1),"signed char").value=(C.i8(0)));
            (count=C.i32((count-1)));
        }
    }
    return count;
    } finally {C.stackRestore(stackFrame); }
}

/* Pick the nth TRUE entry in the given boolean array. */
export function pick_level(map,nth)
{
    map=C.ptr(map);
    nth=C.i32(nth);
    /* an array MAXLEVEL+1 in size */
    let i;
    for((i=C.i16(1));Number(C.i32(i)<=32);((i=C.i16((i+1)))-1)) if(Number(!!(C.i32(C.cell((map+Number(i)*1),"signed char").value)&&Number(!(((nth=C.i32((nth-1)))+1)))))) return i;

    C.variadic(19,C.literal("pick_level:  ran out of valid levels"));
    /*NOTREACHED*/
    return C.i16(0);
}

/*
 * Place a level.  First, find the possible places on a dungeon map
 * template.  Next pick one.  Then try to place the next level.  If
 * successful, we're done.  Otherwise, try another (and another) until
 * all possible places have been tried.  If all possible places have
 * been exhausted, return false.
 */
export function place_level(proto_index,pd)
{
    proto_index=C.i32(proto_index);
    pd=C.ptr(pd);
    const stackFrame=C.stackSave();
    try {
    let map=C.stackAlloc((1*33));
    /* valid levels are 1..MAXLEVEL inclusive */
    let lev;
    let npossible;
    if(Number(proto_index==C.field(pd,"proto_dungeon","n_levs").value)) return (C.i8(1));
    /* at end of proto levels */
    (lev=C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(proto_index)*8),"struct s_level *").value);
    /* No level created for this prototype, goto next. */
    if(Number(!(lev))) return place_level(C.i32((proto_index+1)),pd);
    (npossible=possible_places(proto_index,map,pd));
    for(;npossible;(npossible=C.i32((npossible-1)))) {
        (C.field(C.field(lev,"s_level","dlevel").address,"d_level","dlevel").value=pick_level(map,((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),687,(C.literal("place_level"))),C.rn2(npossible))):C.rn2(npossible)))));
        if(place_level(C.i32((proto_index+1)),pd)) return (C.i8(1));
        (C.cell((map+Number(C.field(C.field(lev,"s_level","dlevel").address,"d_level","dlevel").value)*1),"signed char").value=(C.i8(0)));
        /* this choice didn't work */
    }
    return (C.i8(0));
    } finally {C.stackRestore(stackFrame); }
}

export function get_dgn_flags(L)
{
    L=C.ptr(L);
    let dgn_flags=0;
    
    
    C.lua_getfield(L,C.i32((-1)),C.literal("flags"));
    if(Number(C.lua_type(L,C.i32((-1)))==5)) {
        let f; let nflags;
        C.lua_len(L,C.i32((-1)));
        (nflags=C.i32(C.lua_tointegerx(L,(C.i32((-1))),0)));
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        for((f=0);Number(f<nflags);((f=C.i32((f+1)))-1)) {
            C.lua_pushinteger(L,C.i64(C.i32((f+1))));
            C.lua_gettable(L,C.i32((-2)));
            if(Number(C.lua_type(L,C.i32((-1)))==4)) {
                (dgn_flags=C.i32(dgn_flags|C.cell((C.staticAddress("flagstrs2i")+Number(C.luaL_checkoption(L,C.i32((-1)),0,C.staticAddress("flagstrs")))*4),"int").value));
                C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
            } else C.variadic(20,C.literal("flags[%i] is not a string"),f);
        }
    } else if(Number(C.lua_type(L,C.i32((-1)))==4)) {
        (dgn_flags=C.i32(dgn_flags|C.cell((C.staticAddress("flagstrs2i")+Number(C.luaL_checkoption(L,C.i32((-1)),0,C.staticAddress("flagstrs")))*4),"int").value));
    } else if(Number(C.lua_type(L,C.i32((-1)))!=0)) C.variadic(21,C.literal("flags is not an array or string"));
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    return dgn_flags;
}

export function get_dgn_align(L)
{
    L=C.ptr(L);
    
    
    let a=C.cell((C.staticAddress("dgnaligns2i")+Number(C.get_table_option(L,C.literal("alignment"),C.literal("unaligned"),C.staticAddress("dgnaligns")))*4),"int").value;
    return a;
}

export function init_dungeon_levels(L,pd,dngidx)
{
    L=C.ptr(L);
    pd=C.ptr(pd);
    dngidx=C.i32(dngidx);
    let lvl_name; let lvl_bonetag; let lvl_chain;
    let lvl_base; let lvl_range; let lvl_nlevels; let lvl_chance; let lvl_align; let lvl_flags;
    let tmpl;
    let bi; let f; let nlevels;
    C.lua_len(L,C.i32((-1)));
    (nlevels=C.i32(C.lua_tointegerx(L,(C.i32((-1))),0)));
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","levels").value=nlevels);
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    for((f=0);Number(f<nlevels);((f=C.i32((f+1)))-1)) {
        C.lua_pushinteger(L,C.i64(C.i32((f+1))));
        C.lua_gettable(L,C.i32((-2)));
        if(Number(C.lua_type(L,C.i32((-1)))==5)) {
            (lvl_name=C.get_table_str(L,C.literal("name")));
            (lvl_bonetag=C.get_table_str_opt(L,C.literal("bonetag"),C.emptystr));
            (lvl_chain=C.get_table_str_opt(L,C.literal("chainlevel"),0));
            (lvl_base=C.get_table_int(L,C.literal("base")));
            (lvl_range=C.get_table_int_opt(L,C.literal("range"),0));
            (lvl_nlevels=C.get_table_int_opt(L,C.literal("nlevels"),0));
            (lvl_chance=C.get_table_int_opt(L,C.literal("chance"),100));
            (lvl_align=get_dgn_align(L));
            (lvl_flags=get_dgn_flags(L));
            /* array index is offset by cumulative number of levels
               defined for preceding branches (iterations of 'while'
               loop we're inside, not branch connections below) */
            (tmpl=(C.field(pd,"proto_dungeon","tmplevel").address+Number(C.i32((C.field(pd,"proto_dungeon","n_levs").value+f)))*C.sizes["struct tmplevel"]));
            do {
                if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(22,C.literal("LEVEL[%i]:%s,(%i,%i)"),f,lvl_name,lvl_base,lvl_range);
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
            (C.field(tmpl,"tmplevel","name").value=lvl_name);
            (C.field(tmpl,"tmplevel","chainlvl").value=lvl_chain);
            (C.field(C.field(tmpl,"tmplevel","lev").address,"couple","base").value=C.i16(lvl_base));
            (C.field(C.field(tmpl,"tmplevel","lev").address,"couple","rand").value=C.i16(lvl_range));
            (C.field(tmpl,"tmplevel","chance").value=lvl_chance);
            (C.field(tmpl,"tmplevel","rndlevs").value=lvl_nlevels);
            (C.field(tmpl,"tmplevel","flags").value=C.i32((lvl_flags|lvl_align)));
            (C.field(tmpl,"tmplevel","boneschar").value=C.i8((C.i32(C.cell(lvl_bonetag,"char").value)?C.i32(C.cell(lvl_bonetag,"char").value):0)));
            C.free(lvl_bonetag);
            (C.field(tmpl,"tmplevel","chain").value=C.i32((-1)));
            if(lvl_chain) {
                do {
                    if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
                        let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                        C.variadic(23,C.literal("CHAINLEVEL: %s"),lvl_chain);
                        (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                    }
                } while(0);
                for((bi=0);Number(bi<C.i32((C.field(pd,"proto_dungeon","n_levs").value+f)));((bi=C.i32((bi+1)))-1)) {
                    do {
                        if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
                            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                            C.variadic(24,C.literal("checking(%i):%s"),bi,C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(bi)*C.sizes["struct tmplevel"]),"tmplevel","name").value);
                            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                        }
                    } while(0);
                    if(Number(!(C.strcmp(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(bi)*C.sizes["struct tmplevel"]),"tmplevel","name").value,lvl_chain)))) {
                        (C.field(tmpl,"tmplevel","chain").value=bi);
                        break;
                    }
                }
                if(Number(C.field(tmpl,"tmplevel","chain").value==C.i32((-1)))) C.variadic(25,C.literal("Could not chain level %s to %s"),lvl_name,lvl_chain);
                /* free(lvl_chain); -- recorded in pd.tmplevel[] */
            }
        } else C.variadic(26,C.literal("dungeon[%i].levels[%i] is not a hash"),dngidx,f);
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    }
    (C.field(pd,"proto_dungeon","n_levs").value=C.i32(C.field(pd,"proto_dungeon","n_levs").value+nlevels));
    if(Number(C.field(pd,"proto_dungeon","n_levs").value>50)) C.variadic(27,C.literal("init_dungeon: too many special levels"));
}

export function init_dungeon_branches(L,pd,dngidx)
{
    L=C.ptr(L);
    pd=C.ptr(pd);
    dngidx=C.i32(dngidx);
    
    
    
    
    let br_name; let br_chain;
    let br_base; let br_range; let br_type; let br_up;
    let tmpb;
    let bi; let f; let nbranches;
    C.lua_len(L,C.i32((-1)));
    (nbranches=C.i32(C.lua_tointegerx(L,(C.i32((-1))),0)));
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","branches").value=nbranches);
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    for((f=0);Number(f<nbranches);((f=C.i32((f+1)))-1)) {
        C.lua_pushinteger(L,C.i64(C.i32((f+1))));
        C.lua_gettable(L,C.i32((-2)));
        if(Number(C.lua_type(L,C.i32((-1)))==5)) {
            (br_name=C.get_table_str(L,C.literal("name")));
            (br_chain=C.get_table_str_opt(L,C.literal("chainlevel"),0));
            (br_base=C.get_table_int(L,C.literal("base")));
            (br_range=C.get_table_int_opt(L,C.literal("range"),0));
            (br_type=C.cell((C.staticAddress("brtypes2i")+Number(C.get_table_option(L,C.literal("branchtype"),C.literal("stair"),C.staticAddress("brtypes")))*4),"int").value);
            (br_up=C.cell((C.staticAddress("brdirstr2i")+Number(C.get_table_option(L,C.literal("direction"),C.literal("down"),C.staticAddress("brdirstr")))*4),"int").value);
            (tmpb=(C.field(pd,"proto_dungeon","tmpbranch").address+Number(C.i32((C.field(pd,"proto_dungeon","n_brs").value+f)))*C.sizes["struct tmpbranch"]));
            do {
                if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(28,C.literal("BRANCH[%i]:%s,(%i,%i)"),f,br_name,br_base,br_range);
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
            (C.field(tmpb,"tmpbranch","name").value=br_name);
            (C.field(C.field(tmpb,"tmpbranch","lev").address,"couple","base").value=C.i16(br_base));
            (C.field(C.field(tmpb,"tmpbranch","lev").address,"couple","rand").value=C.i16(br_range));
            (C.field(tmpb,"tmpbranch","type").value=br_type);
            (C.field(tmpb,"tmpbranch","up").value=br_up);
            (C.field(tmpb,"tmpbranch","chain").value=C.i32((-1)));
            if(br_chain) {
                do {
                    if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
                        let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                        C.variadic(29,C.literal("CHAINBRANCH:%s"),br_chain);
                        (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                    }
                } while(0);
                for((bi=0);Number(bi<C.i32((C.i32((C.field(pd,"proto_dungeon","n_levs").value+f))-1)));((bi=C.i32((bi+1)))-1)) if(Number(!(C.strcmp(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(bi)*C.sizes["struct tmplevel"]),"tmplevel","name").value,br_chain)))) {
                    (C.field(tmpb,"tmpbranch","chain").value=bi);
                    break;
                }

                if(Number(C.field(tmpb,"tmpbranch","chain").value==C.i32((-1)))) C.variadic(30,C.literal("Could not chain branch %s to level %s"),br_name,br_chain);
                C.free(br_chain);
            }
        } else C.variadic(31,C.literal("dungeon[%i].branches[%i] is not a hash"),dngidx,f);
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    }
    (C.field(pd,"proto_dungeon","n_brs").value=C.i32(C.field(pd,"proto_dungeon","n_brs").value+nbranches));
    if(Number(C.field(pd,"proto_dungeon","n_brs").value>32)) C.variadic(32,C.literal("init_dungeon: too many branches"));
}

export function init_dungeon_set_entry(pd,dngidx)
{
    pd=C.ptr(pd);
    dngidx=C.i32(dngidx);
    let dgn_entry=C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","entry_lev").value;
    /*
     * Set the entry level for this dungeon.  The entry value means:
     *              < 0     from bottom (-1 == bottom level)
     *                0     default (top)
     *              > 0     actual level (1 = top)
     *
     * Note that the entry_lev field in the dungeon structure is
     * redundant.  It is used only here and in print_dungeon().
     */
    if(Number(dgn_entry<0)) {
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value=C.i16(C.i32((C.i32((C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value)+dgn_entry))+1))));
        if(Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value)<=0)) (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value=C.i16(1));
    } else if(Number(dgn_entry>0)) {
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value=C.i16(dgn_entry));
        if(Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value)>C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value))) (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value=C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value);
    } else {
        /* default */
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value=C.i16(1));
        /* defaults to top level */
    }
}

export function init_dungeon_set_depth(pd,dngidx)
{
    pd=C.ptr(pd);
    dngidx=C.i32(dngidx);
    let br;
    let from_depth;
    let from_up;
    (br=add_branch(dngidx,C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value),pd));
    /* Get the depth of the connecting end. */
    if(Number(C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dnum").value)==dngidx)) {
        (from_depth=depth(C.field(br,"branch","end2").address));
        (from_up=C.i8(Number(!(C.field(br,"branch","end1_up").value))));
    } else {
        (from_depth=depth(C.field(br,"branch","end1").address));
        (from_up=C.field(br,"branch","end1_up").value);
    }
    /*
     * Calculate the depth of the top of the dungeon via
     * its branch.  First, the depth of the entry point:
     *
     *  depth of branch from "parent" dungeon
     *  + -1 or 1 depending on an up or down stair or
     *    0 if portal
     *
     * Followed by the depth of the top of the dungeon:
     *
     *  - (entry depth - 1)
     *
     * We'll say that portals stay on the same depth.
     */
    (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","depth_start").value=C.i32((C.i32((C.i32(from_depth)+((Number(C.field(br,"branch","type").value==3)?0:((C.i32(from_up)?C.i32((-1)):1))))))-(C.i32((C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value)-1))))));
}

export function init_dungeon_dungeons(L,pd,dngidx)
{
    L=C.ptr(L);
    pd=C.ptr(pd);
    dngidx=C.i32(dngidx);
    let dgn_name; let dgn_bonetag; let dgn_protoname; let dgn_fill;
    let dgn_themerms;
    let dgn_base; let dgn_range; let dgn_align; let dgn_entry; let dgn_chance; let dgn_flags;
    (dgn_name=C.get_table_str(L,C.literal("name")));
    /* TODO: accept single char or "none" for bonetag */
    (dgn_bonetag=C.get_table_str_opt(L,C.literal("bonetag"),C.emptystr));
    (dgn_protoname=C.get_table_str_opt(L,C.literal("protofile"),C.emptystr));
    (dgn_base=C.get_table_int(L,C.literal("base")));
    (dgn_range=C.get_table_int_opt(L,C.literal("range"),0));
    (dgn_align=get_dgn_align(L));
    (dgn_entry=C.get_table_int_opt(L,C.literal("entry"),0));
    (dgn_chance=C.get_table_int_opt(L,C.literal("chance"),100));
    (dgn_flags=get_dgn_flags(L));
    (dgn_fill=C.get_table_str_opt(L,C.literal("lvlfill"),C.emptystr));
    (dgn_themerms=C.get_table_str_opt(L,C.literal("themerooms"),C.emptystr));
    do {
        if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
            C.variadic(33,C.literal("DUNGEON[%i]: %s, base=(%i,%i)"),dngidx,dgn_name,dgn_base,dgn_range);
            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
        }
    } while(0);
    if(Number(!!(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))&&dgn_chance))&&(Number(dgn_chance<=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),1022,(C.literal("init_dungeon_dungeons"))),C.rn2(100))):C.rn2(100)))))))) {
        do {
            if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(34,C.literal("IGNORING %s"),dgn_name);
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
        ((C.field(C.svn,"instance_globals_saved_n","n_dgns").value=C.i32((C.field(C.svn,"instance_globals_saved_n","n_dgns").value-1)))+1);
        C.free(dgn_name);
        C.free(dgn_bonetag);
        C.free(dgn_protoname);
        C.free(dgn_fill);
        C.free(dgn_themerms);
        return (C.i8(0));
    }
    /* levels begin */
    C.lua_getfield(L,C.i32((-1)),C.literal("levels"));
    if(Number(C.lua_type(L,C.i32((-1)))==5)) {
        init_dungeon_levels(L,pd,dngidx);
    } else if(Number(C.lua_type(L,C.i32((-1)))!=0)) C.variadic(35,C.literal("dungeon[%i].levels is not an array of hashes"),dngidx);
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    /* levels end */
    /* branches begin */
    C.lua_getfield(L,C.i32((-1)),C.literal("branches"));
    if(Number(C.lua_type(L,C.i32((-1)))==5)) {
        init_dungeon_branches(L,pd,dngidx);
    } else if(Number(C.lua_type(L,C.i32((-1)))!=0)) C.variadic(36,C.literal("dungeon[%i].branches is not an array of hashes"),dngidx);
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    /* branches end */
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","name").value=dgn_name);
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","protoname").value=dgn_protoname);
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","boneschar").value=C.i8((C.i32(C.cell(dgn_bonetag,"char").value)?C.i32(C.cell(dgn_bonetag,"char").value):0)));
    (C.field(C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","lev").address,"couple","base").value=C.i16(dgn_base));
    (C.field(C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","lev").address,"couple","rand").value=C.i16(dgn_range));
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","flags").value=dgn_flags);
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","align").value=dgn_align);
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","chance").value=dgn_chance);
    (C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(dngidx)*C.sizes["struct tmpdungeon"]),"tmpdungeon","entry_lev").value=dgn_entry);
    /* FIXME: these should have length checks */
    C.strcpy(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","fill_lvl").address,dgn_fill);
    C.strcpy(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","dname").address,dgn_name);
    C.strcpy(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","proto").address,dgn_protoname);
    C.strcpy(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","themerms").address,dgn_themerms);
    /* FIXME: accept "none", convert that to '\0' */
    (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","boneid").value=C.i8((C.i32(C.cell(dgn_bonetag,"char").value)?C.i32(C.cell(dgn_bonetag,"char").value):0)));
    C.free(dgn_fill);
    /* free((genericptr) dgn_protoname); -- stored in pd.tmpdungeon[] */
    C.free(dgn_bonetag);
    C.free(dgn_themerms);
    if(dgn_range) (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),1074,(C.literal("init_dungeon_dungeons"))),C.rn2(dgn_range))):C.rn2(dgn_range)))+(dgn_base))))));
 else (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value=C.i16(dgn_base));
    if(Number(!(dngidx))) {
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value=0);
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","depth_start").value=1);
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value=C.i16(1));
    } else {
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value=C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.i32((dngidx-1)))*C.sizes["struct dungeon"]),"dungeon","ledger_start").value+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.i32((dngidx-1)))*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value))));
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value=C.i16(0));
    }
    (C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","hellish").value=C.u32(Number(!(Number(!((C.i32((dgn_flags&2)))))))));
    (C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","maze_like").value=C.u32(Number(!(Number(!((C.i32((dgn_flags&4)))))))));
    (C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","rogue_like").value=C.u32(Number(!(Number(!((C.i32((dgn_flags&8)))))))));
    (C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","align").value=C.u32(dgn_align));
    (C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","unconnected").value=C.u32(Number(!(Number(!((C.i32((dgn_flags&16)))))))));
    init_dungeon_set_entry(pd,dngidx);
    if(C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","unconnected").value) {
        (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","depth_start").value=1);
    } else if(dngidx) {
        /* set depth */
        init_dungeon_set_depth(pd,dngidx);
    }
    if(Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value)>32)) (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dngidx)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value=C.i16(32));
    return (C.i8(1));
}

/* initialize the Castle drawbridge tune */
export function init_castle_tune()
{
    let i;
    for((i=0);Number(i<5);((i=C.i32((i+1)))-1)) (C.cell((C.field(C.svt,"instance_globals_saved_t","tune").address+Number(i)*1),"char").value=C.i8(C.i32((65+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),1116,(C.literal("init_castle_tune"))),C.rn2(7))):C.rn2(7)))))));

    (C.cell((C.field(C.svt,"instance_globals_saved_t","tune").address+Number(5)*1),"char").value=C.i8(0));
}

/* fix up the special level names and locations for quick access */
export function fixup_level_locations()
{
    let i;
    let x;
    let lev_map;
    /*
     * Find most of the special levels and dungeons so we can access their
     * locations quickly.
     */
    for((lev_map=C.staticAddress("level_map"));C.cell((C.field(lev_map,"level_map","lev_name").value+Number(0)*1),"char").value;((lev_map=C.ptr((lev_map+Number(C.sizes["struct level_map"]))))-Number(C.sizes["struct level_map"]))) {
        (x=find_level(C.field(lev_map,"level_map","lev_name").value));
        if(x) {
            assign_level(C.field(lev_map,"level_map","lev_spec").value,C.field(x,"s_level","dlevel").address);
            if(Number(!(C.strncmp(C.field(lev_map,"level_map","lev_name").value,C.literal("x-"),C.u64(2))))) {
                /* This is where the name substitution on the
                 * levels of the quest dungeon occur.
                 */
                C.variadic(37,C.field(x,"s_level","proto").address,C.literal("%s%s"),C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","filecode").value,(C.field(lev_map,"level_map","lev_name").value+Number(1)*1));
            } else if(Number(C.field(lev_map,"level_map","lev_spec").value==C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address)) {
                let br;
                /*
                 * Kludge to allow floating Knox entrance.  We
                 * specify a floating entrance by the fact that its
                 * entrance (end1) has a bogus dnum, namely n_dgns.
                 */
                for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) if(on_level(C.field(br,"branch","end2").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address)) break;

                if(br) {
                    (C.field(C.field(br,"branch","end1").address,"d_level","dnum").value=C.i16(C.field(C.svn,"instance_globals_saved_n","n_dgns").value));
                    /* adjust the branch's position on the list */
                    insert_branch(br,(C.i8(1)));
                }
            }
        }
    }
    /*
     *  I hate hardwiring these names. :-(
     */
    ((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_quest_dnum").value)=dname_to_dnum(C.literal("The Quest")));
    ((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value)=dname_to_dnum(C.literal("Sokoban")));
    ((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value)=dname_to_dnum(C.literal("The Gnomish Mines")));
    ((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tower_dnum").value)=dname_to_dnum(C.literal("Vlad's Tower")));
    ((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tutorial_dnum").value)=dname_to_dnum(C.literal("The Tutorial")));
    /* one special fixup for dummy surface level */
    if(Number(((x=find_level(C.literal("dummy"))))!=0)) {
        (i=C.i32(C.field(C.field(x,"s_level","dlevel").address,"d_level","dnum").value));
        /* the code above puts earth one level above dungeon level #1,
           making the dummy level overlay level 1; but the whole reason
           for having the dummy level is to make earth have depth -1
           instead of 0, so adjust the start point to shift endgame up */
        if(Number(C.i32(dunlevs_in_dungeon(C.field(x,"s_level","dlevel").address))>C.i32((1-C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","depth_start").value)))) (C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","depth_start").value=C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","depth_start").value-1));
        /* TODO: strip "dummy" out all the way here,
           so that it's hidden from '#wizwhere' feedback. */
    }
}

export function free_proto_dungeon(pd)
{
    pd=C.ptr(pd);
    let i;
    for((i=0);Number(i<C.field(pd,"proto_dungeon","n_brs").value);((i=C.i32((i+1)))-1)) {
        C.free(C.field((C.field(pd,"proto_dungeon","tmpbranch").address+Number(i)*C.sizes["struct tmpbranch"]),"tmpbranch","name").value);
    }
    for((i=0);Number(i<C.field(pd,"proto_dungeon","n_levs").value);((i=C.i32((i+1)))-1)) {
        C.free(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(i)*C.sizes["struct tmplevel"]),"tmplevel","name").value);
        if(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(i)*C.sizes["struct tmplevel"]),"tmplevel","chainlvl").value) C.free(C.field((C.field(pd,"proto_dungeon","tmplevel").address+Number(i)*C.sizes["struct tmplevel"]),"tmplevel","chainlvl").value);
    }
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);((i=C.i32((i+1)))-1)) {
        C.free(C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(i)*C.sizes["struct tmpdungeon"]),"tmpdungeon","name").value);
        C.free(C.field((C.field(pd,"proto_dungeon","tmpdungeon").address+Number(i)*C.sizes["struct tmpdungeon"]),"tmpdungeon","protoname").value);
    }
}

/* initialize the "dungeon" structs */
export function init_dungeons()
{
    const stackFrame=C.stackSave();
    try {
    let L;
    let i; let cl=0;
    let pd=C.stackAlloc(C.sizes["struct proto_dungeon"]);
    let tidx;
    let sbi=C.stackAlloc(C.sizes["struct nhl_sandbox_info"]); C.initialize(sbi,"struct nhl_sandbox_info",[2147483648,C.u32(C.i32((C.i32((1*1024))*1024))),C.u32(0),C.u32(C.i32((C.i32((1*1024))*1024)))]);
    C.memset(pd,0,BigInt(C.sizes["struct proto_dungeon"]));
    (C.field(pd,"proto_dungeon","n_levs").value=(C.field(pd,"proto_dungeon","n_brs").value=0));
    (L=C.nhl_init(sbi));
    /* private Lua state for this function */
    if(Number(!(L))) {
        C.variadic(38,C.literal("%s"),C.literal("'nhl_init' failed; can't continue."));
        /*NOTREACHED*/
    }
    if(Number(!(C.nhl_loadlua(L,C.literal("dungeon.lua"))))) {
        let tbuf=C.stackAlloc((1*256));
        C.variadic(39,tbuf,C.literal("Cannot open dungeon description - \"%s"),C.literal("dungeon.lua"));
        /* using a resource from the executable */
        /* using a file or DLB file */
        C.strcat(tbuf,C.literal("\" file!"));
        C.variadic(40,C.literal("%s"),tbuf);
    }
    if(C.field(C.iflags,"instance_flags","window_inited").value) C.indirect(0,(C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),C.global("WIN_MAP").value);
    (C.field(C.svs,"instance_globals_saved_s","sp_levchn").value=0);
    C.lua_settop(L,0);
    C.lua_getglobal(L,C.literal("dungeon"));
    if(Number(!((Number(C.lua_type(L,(C.i32((-1))))==5))))) C.variadic(41,C.literal("dungeon is not a lua table"));
    C.lua_len(L,C.i32((-1)));
    (C.field(C.svn,"instance_globals_saved_n","n_dgns").value=C.i32(C.lua_tointegerx(L,(C.i32((-1))),0)));
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    (C.field(pd,"proto_dungeon","start").value=0);
    (C.field(pd,"proto_dungeon","n_levs").value=0);
    (C.field(pd,"proto_dungeon","n_brs").value=0);
    /*
     * Read in each dungeon and transfer the results to the internal
     * dungeon arrays.
     */
    if(Number(C.field(C.svn,"instance_globals_saved_n","n_dgns").value>=16)) C.variadic(42,C.literal("init_dungeons: too many dungeons"));
    (tidx=C.lua_gettop(L));
    C.lua_pushnil(L);
    /* first key */
    (i=0);
    while(Number(C.lua_next(L,tidx)!=0)) {
        if(Number(!((Number(C.lua_type(L,(C.i32((-1))))==5))))) C.variadic(43,C.literal("dungeon[%i] is not a lua table"),i);
        if(init_dungeon_dungeons(L,pd,i)) {
            for(;Number(cl<C.field(pd,"proto_dungeon","n_levs").value);((cl=C.i32((cl+1)))-1)) {
                init_level(i,cl,pd);
            }
            /*
             * Recursively place the generated levels for this dungeon.  This
             * routine will attempt all possible combinations before giving
             * up.
             */
            if(Number(!(place_level(C.field(pd,"proto_dungeon","start").value,pd)))) C.variadic(44,C.literal("init_dungeon:  couldn't place levels"));
            for(;Number(C.field(pd,"proto_dungeon","start").value<C.field(pd,"proto_dungeon","n_levs").value);((C.field(pd,"proto_dungeon","start").value=C.i32((C.field(pd,"proto_dungeon","start").value+1)))-1)) if(C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(C.field(pd,"proto_dungeon","start").value)*8),"struct s_level *").value) add_level(C.cell((C.field(pd,"proto_dungeon","final_lev").address+Number(C.field(pd,"proto_dungeon","start").value)*8),"struct s_level *").value);

            /* levels handling end */
            ((i=C.i32((i+1)))-1);
        }
        C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
        /* pop the dungeon table */
    }
    C.lua_settop(L,C.i32((C.i32((-(1)))-1)));
    /* get rid of the dungeon global */
    do {
        if(C.debugcore(C.literal("dungeon.c"),(C.i8(1)))) {
            let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
            C.variadic(45,C.literal("init_dungeon lua DONE (n_levs=%i, n_brs=%i)"),C.field(pd,"proto_dungeon","n_levs").value,C.field(pd,"proto_dungeon","n_brs").value);
            (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
        }
    } while(0);
    init_castle_tune();
    fixup_level_locations();
    C.nhl_done(L);
    free_proto_dungeon(pd);
    dumpit();
    } finally {C.stackRestore(stackFrame); }
}

/* return the level number for lev in *this* dungeon */
export function dunlev(lev)
{
    lev=C.ptr(lev);
    return C.field(lev,"d_level","dlevel").value;
}

/* return the lowest level number for *this* dungeon */
export function dunlevs_in_dungeon(lev)
{
    lev=C.ptr(lev);
    return C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value;
}

/* return the lowest level explored in the game*/
export function deepest_lev_reached(noquest)
{
    noquest=C.i8(noquest);
    const stackFrame=C.stackSave();
    try {
    /* this function is used for three purposes: to provide a factor
     * of difficulty in monster generation; to provide a factor of
     * difficulty in experience calculations (botl.c and end.c); and
     * to insert the deepest level reached in the game in the topten
     * display.  the 'noquest' arg switch is required for the latter.
     *
     * from the player's point of view, going into the Quest is _not_
     * going deeper into the dungeon -- it is going back "home", where
     * the dungeon starts at level 1.  given the setup in dungeon.def,
     * the depth of the Quest (thought of as starting at level 1) is
     * never lower than the level of entry into the Quest, so we exclude
     * the Quest from the topten "deepest level reached" display
     * calculation.  _However_ the Quest is a difficult dungeon, so we
     * include it in the factor of difficulty calculations.
     */
    let i;
    let tmp=C.stackAlloc(C.sizes["struct d_level"]);
    let ret=C.i16(0);
    for((i=0);Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);((i=C.i32((i+1)))-1)) {
        if(Number(!!(C.i32(noquest)&&Number(i==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_quest_dnum").value)))))) continue;
        (C.field(tmp,"d_level","dlevel").value=C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value);
        if(Number(C.i32(C.field(tmp,"d_level","dlevel").value)==0)) continue;
        (C.field(tmp,"d_level","dnum").value=C.i16(i));
        if(Number(C.i32(depth(tmp))>C.i32(ret))) (ret=C.i16(depth(tmp)));
    }
    return ret;
    } finally {C.stackRestore(stackFrame); }
}

/* return a bookkeeping level number for purpose of comparisons and
   save/restore */
export function ledger_no(lev)
{
    lev=C.ptr(lev);
    return C.i16((C.i32((C.i32(C.field(lev,"d_level","dlevel").value)+C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value))));
}

/*
 * The last level in the bookkeeping list of level is the bottom of the last
 * dungeon in the svd.dungeons[] array.
 *
 * Maxledgerno() -- which is the max number of levels in the bookkeeping
 * list, should not be confused with dunlevs_in_dungeon(lev) -- which
 * returns the max number of levels in lev's dungeon, and both should
 * not be confused with deepest_lev_reached() -- which returns the lowest
 * depth visited by the player.
 */
export function maxledgerno()
{
    return C.i16((C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.i32((C.field(C.svn,"instance_globals_saved_n","n_dgns").value-1)))*C.sizes["struct dungeon"]),"dungeon","ledger_start").value+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.i32((C.field(C.svn,"instance_globals_saved_n","n_dgns").value-1)))*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value)))));
}

/* return the dungeon that this ledgerno exists in */
export function ledger_to_dnum(ledgerno)
{
    ledgerno=C.i16(ledgerno);
    let i;
    /* find i such that (i->base + 1) <= ledgerno <= (i->base + i->count) */
    for((i=C.i16(0));Number(C.i32(i)<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);((i=C.i16((i+1)))-1)) if(Number(!!(Number(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value<C.i32(ledgerno))&&Number(C.i32(ledgerno)<=(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(i)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value)))))))) return i;

    C.variadic(46,C.literal("level number out of range [ledger_to_dnum(%d)]"),C.i32(ledgerno));
    /*NOT REACHED*/
    return C.i16(0);
}

/* return the level of the dungeon this ledgerno exists in */
export function ledger_to_dlev(ledgerno)
{
    ledgerno=C.i16(ledgerno);
    return C.i16((C.i32((C.i32(ledgerno)-C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(ledger_to_dnum(ledgerno))*C.sizes["struct dungeon"]),"dungeon","ledger_start").value))));
}

/* returns the depth of a level, in floors below the surface
   (note levels in different dungeons can have the same depth) */
export function depth(lev)
{
    lev=C.ptr(lev);
    return C.i8((C.i32((C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","depth_start").value+C.i32(C.field(lev,"d_level","dlevel").value)))-1))));
}

/* !SFCTOOL */
/* are "lev1" and "lev2" actually the same? */
export function on_level(lev1,lev2)
{
    lev1=C.ptr(lev1);
    lev2=C.ptr(lev2);
    return C.i8((Number(!!(Number(C.i32(C.field(lev1,"d_level","dnum").value)==C.i32(C.field(lev2,"d_level","dnum").value))&&Number(C.i32(C.field(lev1,"d_level","dlevel").value)==C.i32(C.field(lev2,"d_level","dlevel").value))))));
}

/* is this level referenced in the special level chain? */
export function Is_special(lev)
{
    lev=C.ptr(lev);
    let levtmp;
    for((levtmp=C.field(C.svs,"instance_globals_saved_s","sp_levchn").value);levtmp;(levtmp=C.field(levtmp,"s_level","next").value)) if(on_level(lev,C.field(levtmp,"s_level","dlevel").address)) return levtmp;

    return 0;
}

/*
 * Is this a multi-dungeon branch level?  If so, return a pointer to the
 * branch.  Otherwise, return null.
 */
export function Is_branchlev(lev)
{
    lev=C.ptr(lev);
    let curr;
    for((curr=C.field(C.svb,"instance_globals_saved_b","branches").value);curr;(curr=C.field(curr,"branch","next").value)) {
        if(Number(!!(C.i32(on_level(lev,C.field(curr,"branch","end1").address))||C.i32(on_level(lev,C.field(curr,"branch","end2").address))))) return curr;
    }
    return 0;
}

/* returns True iff the branch 'lev' is in a branch which builds up */
export function builds_up(lev)
{
    lev=C.ptr(lev);
    let dptr=(C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]);
    let br;
    if(Number(C.i32(C.field(dptr,"dungeon","num_dunlevs").value)>1)) return C.i8((Number(C.i32(C.field(dptr,"dungeon","entry_lev").value)==C.i32(C.field(dptr,"dungeon","num_dunlevs").value))));
    /* else, single-level branch; find branch connection that connects this
     * dungeon from a parent dungeon and determine whether it builds up from
     * that */
    for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) {
        if(on_level(lev,C.field(br,"branch","end2").address)) {
            return C.field(br,"branch","end1_up").value;
        }
    }
    C.variadic(47,C.literal("builds_up: can't find branch for dungeon %d"),C.i32(C.field(lev,"d_level","dnum").value));
    return (C.i8(0));
}

/* goto the next level (or appropriate dungeon) */
export function next_level(at_stairs)
{
    at_stairs=C.i8(at_stairs);
    const stackFrame=C.stackSave();
    try {
    let stway=C.stairway_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    let newlevel=C.stackAlloc(C.sizes["struct d_level"]);
    if(Number(!!(C.i32(at_stairs)&&stway))) (C.field(stway,"stairway","u_traversed").value=(C.i8(1)));
    if(Number(!!(C.i32(at_stairs)&&stway))) {
        (C.field(newlevel,"d_level","dnum").value=C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value);
        (C.field(newlevel,"d_level","dlevel").value=C.field(C.field(stway,"stairway","tolev").address,"d_level","dlevel").value);
        C.goto_level(newlevel,at_stairs,(C.i8(0)),(C.i8(0)));
    } else {
        (C.field(newlevel,"d_level","dnum").value=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value);
        (C.field(newlevel,"d_level","dlevel").value=C.i16(C.i32((C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)+1))));
        C.goto_level(newlevel,at_stairs,C.i8(Number(!(at_stairs))),(C.i8(0)));
    }
    } finally {C.stackRestore(stackFrame); }
}

/* goto the previous level (or appropriate dungeon) */
export function prev_level(at_stairs)
{
    at_stairs=C.i8(at_stairs);
    const stackFrame=C.stackSave();
    try {
    let stway=C.stairway_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    let newlevel=C.stackAlloc(C.sizes["struct d_level"]);
    if(Number(!!(C.i32(at_stairs)&&stway))) (C.field(stway,"stairway","u_traversed").value=(C.i8(1)));
    if(Number(!!(Number(!!(C.i32(at_stairs)&&stway))&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)!=C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
        /* Taking an up dungeon branch. */
        /* KMH -- Upwards branches are okay if not level 1 */
        /* (Just make sure it doesn't go above depth 1) */
        if(Number(!!(Number(!!(Number(!(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))&&Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)==1)))&&Number(!(C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value))))) C.done(C.ESCAPED);
 else {
            (C.field(newlevel,"d_level","dnum").value=C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value);
            (C.field(newlevel,"d_level","dlevel").value=C.field(C.field(stway,"stairway","tolev").address,"d_level","dlevel").value);
            C.goto_level(newlevel,at_stairs,(C.i8(0)),(C.i8(0)));
        }
    } else {
        /* Going up a stairs or rising through the ceiling. */
        (C.field(newlevel,"d_level","dnum").value=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value);
        (C.field(newlevel,"d_level","dlevel").value=C.i16(C.i32((C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)-1))));
        C.goto_level(newlevel,at_stairs,(C.i8(0)),(C.i8(0)));
    }
    } finally {C.stackRestore(stackFrame); }
}

/* Dwarves have "earth sense",
   able to sense if something is buried under their feet */
export function earth_sense()
{
    let otmp;
    if(Number(!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)==(C.PM_DWARF)))))) return;
    if(Number(!!(Number(!!(Number(!!(C.field(C.u,"you","usteed").value||(Number(!!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","extrinsic").value))||(Number(!!(C.field(C.u,"you","usteed").value&&(Number((C.u64((C.field((C.field(C.field(C.u,"you","usteed").value,"monst","data").value),"permonst","mflags1").value&C.u64(1n))))!=C.u64(0n)))))))))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.FLYING)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))))||(Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))))) return;
    if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.CORR)&&Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)!=C.ROOM)))) return;
    for((otmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) if((Number(!!(Number(C.i32((C.field(otmp,"obj","ox").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(otmp,"obj","oy").value))==C.i32(C.field(C.u,"you","uy").value)))))) {
        C.variadic(48,C.literal("sense something below your %s."),C.makeplural(C.body_part(C.FOOT)));
        return;
    }

}

export function u_on_newpos(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!(C.isok(x,y)))) {
        /* validate location */
        let func;
        (func=((Number(!!(Number(!!(Number(!!(Number(C.i32(x)<0)||Number(C.i32(y)<0)))||Number(C.i32(x)>C.i32((80-1)))))||Number(C.i32(y)>C.i32((21-1))))))?"panic":"impossible"));
        C.dynamicVariadic((func),0,C.literal("u_on_newpos: trying to place hero off map <%d,%d>"),C.i32(x),C.i32(y));
    }
    (C.field(C.u,"you","ux").value=x);
    (C.field(C.u,"you","uy").value=y);
    C.indirect(1,(C.field(C.windowprocs,"window_procs","win_cliparound").value),C.i32(C.field(C.u,"you","ux").value),C.i32(C.field(C.u,"you","uy").value));
    (C.field(C.u,"you","uundetected").value=C.u32(0));
    /* ridden steed always shares hero's location */
    if(C.field(C.u,"you","usteed").value) ((C.field(C.field(C.u,"you","usteed").value,"monst","mx").value=C.field(C.u,"you","ux").value),(C.field(C.field(C.u,"you","usteed").value,"monst","my").value=C.field(C.u,"you","uy").value));
    /* when changing levels, don't leave old position set with
       stale values from previous level */
    if(Number(!(on_level(C.field(C.u,"you","uz").address,C.field(C.u,"you","uz0").address)))) {
        ((C.field(C.u,"you","ux0").value=C.field(C.u,"you","ux").value),(C.field(C.u,"you","uy0").value=C.field(C.u,"you","uy").value));
        /* sets lastseentyp[u.ux][u.uy]; needed for switch_terrain()
           somewhere back up the call chain */
        C.map_location(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,C.i32((C.i8(0))));
        (C.field(C.iflags,"instance_flags","terrain_typ").value=C.MAX_TYPE);
        /* "none of the above" value */
    } else {
        /* still on same level; might have come close enough to
           generic object(s) to redisplay them as specific objects */
        if(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))))&&Number(!(C.field(C.u,"you","uswallow").value))))) C.see_nearby_objects();
    }
    earth_sense();
}

/* place you on a random location when arriving on a level */
export function u_on_rndspot(upflag)
{
    upflag=C.i32(upflag);
    let up=(C.i32((upflag&1))); let was_in_W_tower=(C.i32((upflag&2)));
    /*
     * Place the hero at a random location within the relevant region.
     * place_lregion(xTELE) -> put_lregion_here(xTELE) -> u_on_newpos()
     * Unspecified region (.lx == 0) defaults to entire level.
     */
    if(Number(!!(was_in_W_tower&&C.i32(On_W_tower_level(C.field(C.u,"you","uz").address))))) C.place_lregion(C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nlx").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nly").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhx").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhy").value,C.i16(0),C.i16(0),C.i16(0),C.i16(0),C.i16(C.LR_DOWNTELE),0);
 else if(up) C.place_lregion(C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","lx").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","ly").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","hx").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","hy").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nlx").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nly").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nhx").value,C.field(C.field(C.svu,"instance_globals_saved_u","updest").address,"dest_area","nhy").value,C.i16(C.LR_UPTELE),0);
 else C.place_lregion(C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","lx").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","ly").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","hx").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","hy").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nlx").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nly").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhx").value,C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhy").value,C.i16(C.LR_DOWNTELE),0);
    /* Stay inside the Wizard's tower when feasible.
           We use the W Tower's exclusion region for the
           destination instead of its enclosing region.
           Note: up vs down doesn't matter in this case
           because both specify the same exclusion area. */
    /* might have just left solid rock and unblocked levitation */
    C.switch_terrain();
}

/* !SFCTOOL */
export function Is_botlevel(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(C.i32(C.field(lev,"d_level","dlevel").value)==C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value))));
}

export function Can_dig_down(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(!!(Number(!!(Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","hardfloor").value))&&Number(!(Is_botlevel(lev)))))&&Number(!(Invocation_lev(lev)))))));
}

/*
 * Like Can_dig_down (above), but also allows falling through on the
 * stronghold level.  Normally, the bottom level of a dungeon resists
 * both digging and falling.
 */
export function Can_fall_thru(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(!!(C.i32(Can_dig_down(lev))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address))))))))));
}

/*
 * True if one can rise up a level (e.g. cursed gain level).
 * This happens on intermediate dungeon levels or on any top dungeon
 * level that has a stairwell style branch to the next higher dungeon.
 * Checks for amulets and such must be done elsewhere.
 */
export function Can_rise_up(x,y,lev)
{
    x=C.i16(x);
    y=C.i16(y);
    lev=C.ptr(lev);
    let stway=C.stairway_find_special_dir((C.i8(0)));
    /* can't rise up from inside the top of the Wizard's tower */
    /* KMH -- or in sokoban */
    if(Number(!!(Number(!!((Number(C.i32(C.field((lev),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))||(Number(C.i32(C.field((lev),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))))||(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address))))))&&C.i32(In_W_tower(x,y,lev)))))))) return (C.i8(0));
    return C.i8((Number(!!(Number(C.i32(C.field(lev,"d_level","dlevel").value)>1)||(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value)==1)&&Number(C.i32(ledger_no(lev))!=1)))&&stway))&&C.i32(C.field(stway,"stairway","up").value))))))));
}

export function has_ceiling(lev)
{
    lev=C.ptr(lev);
    /* FIXME: some (most? all?) of the quest home levels are conceptually
       above ground and don't have ceilings outside of their buildings
       but we don't presently check for that */
    if(Number(!!((Number(C.i32(C.field((lev),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address))))))))))) return (C.i8(0));
    return (C.i8(1));
}

export function avoid_ceiling(lev)
{
    lev=C.ptr(lev);
    /* The quest is challenging since parts of the level
       may have ceilings and other parts may not; Avoid
       the ambiguity there by testing with avoid_ceiling()
       and using alternative messaging that avoids the term
       ceiling altogether there */
    if(Number(!!(C.i32(In_quest(lev))||Number(!(has_ceiling(lev)))))) return (C.i8(1));
    return (C.i8(0));
}

export function ceiling(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    let what;
    /* other room types will no longer exist when we're interested --
     * see check_special_room()
     */
    if(C.cell(C.in_rooms(x,y,C.VAULT),"char").value) (what=C.literal("vault's ceiling"));
 else if(C.cell(C.in_rooms(x,y,C.TEMPLE),"char").value) (what=C.literal("temple's ceiling"));
 else if(C.cell(C.in_rooms(x,y,C.SHOPBASE),"char").value) (what=C.literal("shop's ceiling"));
 else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))) (what=C.literal("water above"));
 else if((Number(!!(Number(C.i32((C.field(lev,"rm","typ").value))==C.AIR)||Number(C.i32((C.field(lev,"rm","typ").value))==C.CLOUD))))) (what=C.literal("sky"));
 else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address))))))) (what=C.literal("flames above"));
 else if(In_quest(C.field(C.u,"you","uz").address)) (what=C.literal("expanse above"));
 else if((C.field(C.u,"you","uinwater").value)) (what=C.literal("water's surface"));
 else if(Number(!!(Number(!!(Number(!!((Number(!!((Number(C.i32((C.field(lev,"rm","typ").value))>=C.ROOM))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address)))))))))))||(Number(!!(C.i32((C.field(lev,"rm","typ").value))&&Number(C.i32((C.field(lev,"rm","typ").value))<=C.DBWALL))))))||(Number(C.i32((C.field(lev,"rm","typ").value))==C.DOOR))))||Number(C.i32(C.field(lev,"rm","typ").value)==C.SDOOR)))) (what=C.literal("ceiling"));
 else (what=C.literal("rock cavern"));
    /* water plane has no surface; its air bubbles aren't below sky */
    /* just in case; try to avoid in caller if you can */
    return what;
}

export function surface(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    let levtyp=(((Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.DRAWBRIDGE_UP))?C.i32(C.db_under_typ(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value))):C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)));
    if(Number(!!(Number(!!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))&&C.i32(C.field(C.u,"you","uswallow").value)))&&(Number((C.u64((C.field((C.field(C.field(C.u,"you","ustuck").value,"monst","data").value),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))))) return ((Number(C.dmgtype_fromattack((C.field(C.field(C.u,"you","ustuck").value,"monst","data").value),26,11)!=0))?C.literal("maw"):((Number(C.dmgtype_fromattack((C.field(C.field(C.u,"you","ustuck").value,"monst","data").value),28,11)!=0))?C.literal("husk"):C.literal("nonesuch")));
 else if((Number(!!(Number((levtyp)==C.AIR)||Number((levtyp)==C.CLOUD))))) return (((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))?C.literal("air bubble"):((Number(levtyp==C.CLOUD))?C.literal("cloud"):C.literal("air")));
 else if(C.is_pool(x,y)) return ((Number(!!(C.i32((C.field(C.u,"you","uinwater").value))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address)))))))))))?C.literal("bottom"):C.hliquid(C.literal("water")));
 else if(C.is_ice(x,y)) return C.literal("ice");
 else if(C.is_lava(x,y)) return C.hliquid(C.literal("lava"));
 else if(Number(C.i32(C.field(lev,"rm","typ").value)==C.DRAWBRIDGE_DOWN)) return C.literal("bridge");
 else if((Number((levtyp)==C.ALTAR))) return C.literal("altar");
 else if((Number((levtyp)==C.GRAVE))) return C.literal("headstone");
 else if((Number((levtyp)==C.FOUNTAIN))) return C.literal("fountain");
 else if(C.On_stairs(x,y)) return C.literal("stairs");
 else if(Number(!!((Number(!!((levtyp)&&Number((levtyp)<=C.DBWALL))))||Number(levtyp==C.SDOOR)))) return C.literal("wall");
 else if((Number((levtyp)==C.DOOR))) return C.literal("doorway");
 else if(Number(!!((Number((levtyp)>=C.ROOM))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address))))))))))) return C.literal("floor");
 else return C.literal("ground");
    /* 'husk' is iffy but maw is wrong for 't' class */
    /* can't happen (fingers crossed...) */
    /* 'surface' during Passes_walls */
    /* even for closed door */
}

/*
 * It is expected that the second argument of get_level is a depth value,
 * either supplied by the user (teleport control) or randomly generated.
 * But more than one level can be at the same depth.  If the target level
 * is "above" the present depth location, get_level must trace "up" from
 * the player's location (through the ancestors dungeons) the dungeon
 * within which the target level is located.  With only one exception
 * which does not pass through this routine (see level_tele), teleporting
 * "down" is confined to the current dungeon.  At present, level teleport
 * in dungeons that build up is confined within them.
 */
export function get_level(newlevel,levnum)
{
    newlevel=C.ptr(newlevel);
    levnum=C.i32(levnum);
    let br;
    let dgn=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value;
    if(Number(levnum<=0)) {
        /* can only currently happen in endgame */
        (levnum=C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value));
    } else if(Number(levnum>(C.i32((C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","depth_start").value+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value)))-1))))) {
        /* beyond end of dungeon, jump to last level */
        (levnum=C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value));
    } else {
        /* The desired level is in this dungeon or a "higher" one. */
        /*
         * Branch up the tree until we reach a dungeon that contains the
         * levnum.
         */
        if(Number(levnum<C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","depth_start").value)) {
            do {
                /*
                 * Find the parent dungeon of this dungeon.
                 *
                 * This assumes that end2 is always the "child" and it is
                 * unique.
                 */
                for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) if(Number(C.i32(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)==C.i32(dgn))) break;

                if(Number(!(br))) C.variadic(49,C.literal("get_level: can't find parent dungeon"));
                (dgn=C.field(C.field(br,"branch","end1").address,"d_level","dnum").value);
            } while(Number(levnum<C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","depth_start").value));
        }
        /* We're within the same dungeon; calculate the level. */
        (levnum=C.i32((C.i32((levnum-C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dgn)*C.sizes["struct dungeon"]),"dungeon","depth_start").value))+1)));
    }
    (C.field(newlevel,"d_level","dnum").value=dgn);
    (C.field(newlevel,"d_level","dlevel").value=C.i16(levnum));
}

/* are you in the quest dungeon? */
export function In_quest(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(C.i32(C.field(lev,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_quest_dnum").value)))));
}

/* are you in the mines dungeon? */
export function In_mines(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(C.i32(C.field(lev,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mines_dnum").value)))));
}

/*
 * Return the branch for the given dungeon.
 *
 * This function assumes:
 *      + This is not called with "Dungeons of Doom".
 *      + There is only _one_ branch to a given dungeon.
 *      + Field end2 is the "child" dungeon.
 */
export function dungeon_branch(s)
{
    s=C.ptr(s);
    let br;
    let dnum;
    (dnum=dname_to_dnum(s));
    /* Find the branch that connects to dungeon i's branch. */
    for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) if(Number(C.i32(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)==C.i32(dnum))) break;

    if(Number(!(br))) C.variadic(50,C.literal("dgn_entrance: can't find entrance to %s"),s);
    return br;
}

/*
 * This returns true if the hero is on the same level as the entrance to
 * the named dungeon.
 *
 * Called from do.c and mklev.c.
 *
 * Assumes that end1 is always the "parent".
 */
export function at_dgn_entrance(s)
{
    s=C.ptr(s);
    let br;
    (br=dungeon_branch(s));
    return C.i8((C.i32(on_level(C.field(C.u,"you","uz").address,C.field(br,"branch","end1").address))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/* is `lev' part of Vlad's tower? */
export function In_V_tower(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(C.i32(C.field(lev,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tower_dnum").value)))));
}

/* is `lev' a level containing the Wizard's tower? */
export function On_W_tower_level(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(!!(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz2_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz2_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz2_level").address))))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz3_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz3_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz3_level").address))))))))));
}

/* is <x,y> of `lev' inside the Wizard's tower? */
export function In_W_tower(x,y,lev)
{
    x=C.i16(x);
    y=C.i16(y);
    lev=C.ptr(lev);
    if(Number(!(On_W_tower_level(lev)))) return (C.i8(0));
    if(Number(!(C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nlx").value))) {
        C.variadic(51,C.literal("No boundary for Wizard's Tower?"));
        return (C.i8(0));
    }
    /*
     * Both of the exclusion regions for arriving via level teleport
     * (from above or below) define the tower's boundary.
     *  assert( svu.updest.nIJ == svd.dndest.nIJ for I={l|h},J={x|y} );
     */
    return C.i8((Number(!!(Number(!!(Number(!!(Number(C.i32((x))>=C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nlx").value)))&&Number(C.i32((x))<=C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhx").value)))))&&Number(C.i32((y))>=C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nly").value)))))&&Number(C.i32((y))<=C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dndest").address,"dest_area","nhy").value)))))));
}

/* are you in one of the Hell levels? */
export function In_hell(lev)
{
    lev=C.ptr(lev);
    return C.i8((C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","hellish").value));
}

/* sets *lev to be the gateway to Gehennom... */
export function find_hell(lev)
{
    lev=C.ptr(lev);
    (C.field(lev,"d_level","dnum").value=C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address,"d_level","dnum").value);
    (C.field(lev,"d_level","dlevel").value=C.i16(1));
}

/* go directly to hell... */
export function goto_hell(at_stairs,falling)
{
    at_stairs=C.i8(at_stairs);
    falling=C.i8(falling);
    const stackFrame=C.stackSave();
    try {
    let lev=C.stackAlloc(C.sizes["struct d_level"]);
    find_hell(lev);
    C.goto_level(lev,at_stairs,falling,(C.i8(0)));
    } finally {C.stackRestore(stackFrame); }
}

/* is 'lev' the only level in its branch?  affects level teleporters */
export function single_level_branch(lev)
{
    lev=C.ptr(lev);
    /*
     * TODO:  this should be generalized instead of assuming that
     * Fort Ludios is the only single level branch in the dungeon.
     */
    return C.i8(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(on_level(lev,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address)))))));
}

/* equivalent to dest = source */
export function assign_level(dest,src)
{
    dest=C.ptr(dest);
    src=C.ptr(src);
    (C.field(dest,"d_level","dnum").value=C.field(src,"d_level","dnum").value);
    (C.field(dest,"d_level","dlevel").value=C.field(src,"d_level","dlevel").value);
}

/* dest = src + rn1(range) */
export function assign_rnd_level(dest,src,range)
{
    dest=C.ptr(dest);
    src=C.ptr(src);
    range=C.i32(range);
    (C.field(dest,"d_level","dnum").value=C.field(src,"d_level","dnum").value);
    (C.field(dest,"d_level","dlevel").value=C.i16(C.i32((C.i32(C.field(src,"d_level","dlevel").value)+(((Number(range>0))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),1989,(C.literal("assign_rnd_level"))),C.rnd(range))):C.rnd(range))):C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),1989,(C.literal("assign_rnd_level"))),C.rnd(C.i32((-range))))):C.rnd(C.i32((-range)))))))))))));
    if(Number(C.i32(C.field(dest,"d_level","dlevel").value)>C.i32(dunlevs_in_dungeon(dest)))) (C.field(dest,"d_level","dlevel").value=dunlevs_in_dungeon(dest));
 else if(Number(C.i32(C.field(dest,"d_level","dlevel").value)<1)) (C.field(dest,"d_level","dlevel").value=C.i16(1));
}

/* return an alignment mask */
export function induced_align(pct)
{
    pct=C.i32(pct);
    let lev=Is_special(C.field(C.u,"you","uz").address);
    let al;
    if(Number(!!(lev&&C.i32(C.field(C.field(lev,"s_level","flags").address,"d_flags","align").value)))) if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),2005,(C.literal("induced_align"))),C.rn2(100))):C.rn2(100)))<pct)) return C.field(C.field(lev,"s_level","flags").address,"d_flags","align").value;
    if(C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","align").value) if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),2009,(C.literal("induced_align"))),C.rn2(100))):C.rn2(100)))<pct)) return C.field(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","flags").address,"d_flags","align").value;
    (al=C.i8(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("dungeon.c"),2012,(C.literal("induced_align"))),C.rn2(3))):C.rn2(3)))-1))));
    return (C.u32((((Number(C.i32((al))==(C.i32((-128)))))?0:((Number(C.i32((al))==1))?4:(C.i32((C.i32((al))+2))))))));
}

export function Invocation_lev(lev)
{
    lev=C.ptr(lev);
    return C.i8((Number(!!(C.i32(In_hell(lev))&&Number(C.i32(C.field(lev,"d_level","dlevel").value)==C.i32((C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(lev,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","num_dunlevs").value)-1)))))));
}

/* use instead of depth() wherever a degree of difficulty is made
 * dependent on the location in the dungeon (eg. monster creation).
 */
export function level_difficulty()
{
    let res;
    if((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))) {
        (res=C.i16(C.i32((C.i32(depth(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address))+C.i32(Math.trunc((C.field(C.u,"you","ulevel").value/2)))))));
    } else if(C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value) {
        (res=deepest_lev_reached((C.i8(0))));
    } else {
        (res=C.i16(depth(C.field(C.u,"you","uz").address)));
        /* depth() is the number of elevation units (levels) below
           the theoretical surface; in a builds-up branch, that value
           ends up making the harder to reach levels be treated as if
           they were easier; adjust for the extra effort involved in
           going down to the entrance and then up to the location */
        if(builds_up(C.field(C.u,"you","uz").address)) (res=C.i16(res+C.i32((2*(C.i32((C.i32((C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value)-C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)))+1)))))));
        /*
             * 'Proof' by example:  suppose the entrance to sokoban is
             * on dungeon level 9, leading up to bottom sokoban level
             * of 8 [entry_lev].  When the hero is on sokoban level 8
             * [uz.dlevel], depth() yields eight but he has ventured
             * one level beyond 9, so difficulty depth should be 10:
             *   8 + 2 * (8 - 8 + 1) => 10.
             * Going up to 7, depth is 7 but hero will be two beyond 9:
             *   7 + 2 * (8 - 7 + 1) => 11.
             * When he goes up to level 6, three levels beyond 9:
             *   6 + 2 * (8 - 6 + 1) => 12.
             * And the top level of sokoban at 5, four levels beyond 9:
             *   5 + 2 * (8 - 5 + 1) => 13.
             * The same applies to Vlad's Tower, although the increment
             * there is inconsequential compared to overall depth.
             */
        /*
         * The inside of the Wizard's Tower is also effectively a
         * builds-up area, reached from a portal an arbitrary distance
         * below rather than stairs 1 level beneath the entry level.
         */
        /*
             * Handling this properly would need more information here:
             * an inside/outside flag, or coordinates to calculate it.
             * Unfortunately level difficulty may be wanted before
             * coordinates have been chosen so simply extending this
             * routine to take extra arguments is not sufficient to cope.
             * The difference beyond naive depth-from-surface is small
             * relative to the overall depth, so just ignore complications
             * posed by W_tower.
             */
        /*0*/
    }
    /* ring of aggravate monster */
    if(C.field((C.field(C.u,"you","uprops").address+Number(C.AGGRAVATE_MONSTER)*C.sizes["struct prop"]),"prop","extrinsic").value) (res=C.i16((Number(C.i32(res)>25)?50:C.i32((C.i32(res)*2)))));
    return res;
}

/* within same branch, or else main dungeon <-> gehennom */
/* Take one word and try to match it to a level.
 * Recognized levels are as shown by print_dungeon().
 */
export function lev_by_name(nam)
{
    nam=C.ptr(nam);
    const stackFrame=C.stackSave();
    try {
    let lev=C.i8(0);
    let slev=0;
    let dlev=C.stackAlloc(C.sizes["struct d_level"]);
    let p;
    let idx; let idxtoo;
    let buf=C.stackAlloc((1*256));
    let mseen;
    /* look at the player's custom level annotations first */
    if(Number(((mseen=find_mapseen_by_str(nam)))!=0)) {
        C.copy(dlev,C.field(mseen,"mapseen","lev").address,C.sizes["struct d_level"]);
    } else {
        /* no matching annotation, check whether they used a name we know */
        /* allow strings like "the oracle level" to find "oracle" */
        if(Number(!(C.strncmpi(nam,C.literal("the "),4)))) (nam=C.ptr(nam+4*1));
        if(Number(!!(Number(((p=C.strstri(nam,C.literal(" level"))))!=0)&&Number(p==(C.eos(nam)-Number(6)*1))))) {
            (nam=C.strcpy(buf,nam));
            (C.cell(((C.eos(buf)-Number(6)*1)),"char").value=C.i8(0));
        }
        /* hell is the old name, and wouldn't match; gehennom would match its
           branch, yielding the castle level instead of valley of the dead */
        if(Number(!!(Number(!(C.strncmpi((nam),(C.literal("gehennom")),C.i32((-1)))))||Number(!(C.strncmpi((nam),(C.literal("hell")),C.i32((-1)))))))) {
            if(In_V_tower(C.field(C.u,"you","uz").address)) (nam=C.literal(" to Vlad's tower"));
 else (nam=C.literal("valley"));
            /* branch to... */
        } else if(Number(!(C.strncmpi((nam),(C.literal("delphi")),C.i32((-1)))))) {
            /* Oracle says "welcome to Delphi" so recognize that name too */
            (nam=C.literal("oracle"));
        }
        if(Number(((slev=find_level(nam)))!=0)) C.copy(dlev,C.field(slev,"s_level","dlevel").address,C.sizes["struct d_level"]);
    }
    if(Number(!!(mseen||slev))) {
        (idx=C.i32(ledger_no(dlev)));
        if(Number(!!((Number(!!(Number(!!(Number(C.i32(C.field(dlev,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))||(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address,"d_level","dnum").value))&&Number(C.i32(C.field(dlev,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address,"d_level","dnum").value)))))))||(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address,"d_level","dnum").value))&&Number(C.i32(C.field(dlev,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address,"d_level","dnum").value))))))))&&(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)||Number((C.i32((C.i32(C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(idx)*C.sizes["struct linfo"]),"linfo","flags").value)&1)))==1))))))) {
            /* either wizard mode or else seen and not forgotten;
               note: used to be '(flags & (FORGOTTEN|VISITED)) == VISITED'
               back when amnesia could cause levels to be forgotten */
            (lev=depth(dlev));
        }
    } else {
        /* not a specific level; try branch names */
        (idx=find_branch(nam,0));
        /* "<branch> to Xyzzy" */
        if(Number(!!(Number(idx<0)&&Number(((p=C.strstri(nam,C.literal(" to "))))!=0)))) (idx=find_branch((p+Number(4)*1),0));
        if(Number(idx>=0)) {
            (idxtoo=C.i32(((C.i32((idx>>8)))&255)));
            (idx=C.i32(idx&255));
            /* either wizard mode, or else _both_ sides of branch seen; */
            /* (flags & VISITED)==VISITED: see comment about amnesia above */
            if(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)||(Number(!!((Number((C.i32((C.i32(C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(idx)*C.sizes["struct linfo"]),"linfo","flags").value)&1)))==1))&&(Number((C.i32((C.i32(C.field((C.field(C.svl,"instance_globals_saved_l","level_info").address+Number(idxtoo)*C.sizes["struct linfo"]),"linfo","flags").value)&1)))==1)))))))) {
                if(Number(C.i32(ledger_to_dnum(C.i16(idxtoo)))==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))) (idx=idxtoo);
                (C.field(dlev,"d_level","dnum").value=ledger_to_dnum(C.i16(idx)));
                (C.field(dlev,"d_level","dlevel").value=ledger_to_dlev(C.i16(idx)));
                if((Number(!!(Number(!!(Number(C.i32(C.field(dlev,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))||(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address,"d_level","dnum").value))&&Number(C.i32(C.field(dlev,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address,"d_level","dnum").value)))))))||(Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address,"d_level","dnum").value))&&Number(C.i32(C.field(dlev,"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address,"d_level","dnum").value))))))))) (lev=depth(dlev));
            }
        }
    }
    return lev;
    } finally {C.stackRestore(stackFrame); }
}

export function unplaced_floater(dptr)
{
    dptr=C.ptr(dptr);
    let br;
    let idx=C.i32((C.i64(((dptr-C.field(C.svd,"instance_globals_saved_d","dungeons").address)/C.sizes["struct dungeon"]))));
    /* if other floating branches are added, this will need to change */
    if(Number(idx!=C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address,"d_level","dnum").value))) return (C.i8(0));
    for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) if(Number(!!(Number(C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dnum").value)==C.field(C.svn,"instance_globals_saved_n","n_dgns").value)&&Number(C.i32(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)==idx)))) return (C.i8(1));

    return (C.i8(0));
}

export function unreachable_level(lvl_p,unplaced)
{
    lvl_p=C.ptr(lvl_p);
    unplaced=C.i8(unplaced);
    let dummy;
    if(unplaced) return (C.i8(1));
    if(Number(!!((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))&&Number(!((Number(C.i32(C.field((lvl_p),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))))) return (C.i8(1));
    if(Number(!!(Number(((dummy=find_level(C.literal("dummy"))))!=0)&&C.i32(on_level(lvl_p,C.field(dummy,"s_level","dlevel").address))))) return (C.i8(1));
    return (C.i8(0));
}

export function tport_menu(win,entry,lchoices,lvl_p,cannotreach)
{
    win=C.i32(win);
    entry=C.ptr(entry);
    lchoices=C.ptr(lchoices);
    lvl_p=C.ptr(lvl_p);
    cannotreach=C.i8(cannotreach);
    const stackFrame=C.stackSave();
    try {
    let tmpbuf=C.stackAlloc((1*256));
    let any=C.stackAlloc(C.sizes["union any"]);
    let clr=8;
    (C.cell((C.field(lchoices,"lchoice","lev").address+Number(C.field(lchoices,"lchoice","idx").value)*1),"signed char").value=C.i8(C.field(lvl_p,"d_level","dlevel").value));
    (C.cell((C.field(lchoices,"lchoice","dgn").address+Number(C.field(lchoices,"lchoice","idx").value)*2),"short").value=C.field(lvl_p,"d_level","dnum").value);
    (C.cell((C.field(lchoices,"lchoice","playerlev").address+Number(C.field(lchoices,"lchoice","idx").value)*1),"signed char").value=depth(lvl_p));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    if(cannotreach) {
        /* not selectable, but still consumes next menuletter;
           prepend padding in place of missing menu selector */
        C.variadic(52,tmpbuf,C.literal("    %s"),entry);
        (entry=tmpbuf);
    } else {
        (C.field(any,"any","a_int").value=C.i32((C.field(lchoices,"lchoice","idx").value+1)));
    }
    C.add_menu(win,C.nul_glyphinfo,any,C.field(lchoices,"lchoice","menuletter").value,C.i8(0),0,clr,entry,0);
    /* this assumes there are at most 52 interesting levels */
    if(Number(C.i32(C.field(lchoices,"lchoice","menuletter").value)==122)) (C.field(lchoices,"lchoice","menuletter").value=C.i8(65));
 else ((C.field(lchoices,"lchoice","menuletter").value=C.i8((C.field(lchoices,"lchoice","menuletter").value+1)))-1);
    ((C.field(lchoices,"lchoice","idx").value=C.i32((C.field(lchoices,"lchoice","idx").value+1)))-1);
    return;
    } finally {C.stackRestore(stackFrame); }
}

/* Convert a branch type to a string usable by print_dungeon(). */
export function br_string(type)
{
    type=C.i32(type);
    switch(type) {
        case (3):
            return C.literal("Portal");
        case (1):
            return C.literal("Connection");
        case (2):
            return C.literal("One way stair");
        case (0):
            return C.literal("Stair");
    }
    return C.literal(" (unknown)");
}

export function chr_u_on_lvl(dlev)
{
    dlev=C.ptr(dlev);
    return C.i8((Number(!!(Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)==C.i32(C.field(dlev,"d_level","dnum").value))&&Number(C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value)==C.i32(C.field(dlev,"d_level","dlevel").value))))?42:32));
}

/* Print all child branches between the lower and upper bounds. */
export function print_branch(win,dnum,lower_bound,upper_bound,bymenu,lchoices_p)
{
    win=C.i32(win);
    dnum=C.i32(dnum);
    lower_bound=C.i32(lower_bound);
    upper_bound=C.i32(upper_bound);
    bymenu=C.i8(bymenu);
    lchoices_p=C.ptr(lchoices_p);
    const stackFrame=C.stackSave();
    try {
    let br;
    let buf=C.stackAlloc((1*256));
    /* This assumes that end1 is the "parent". */
    for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) {
        if(Number(!!(Number(!!(Number(C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dnum").value)==dnum)&&Number(lower_bound<C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dlevel").value))))&&Number(C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dlevel").value)<=upper_bound)))) {
            C.variadic(53,buf,C.literal("%c %s to %s: %d"),(C.i32(bymenu)?C.i32(chr_u_on_lvl(C.field(br,"branch","end1").address)):32),br_string(C.field(br,"branch","type").value),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","dname").address,C.i32(depth(C.field(br,"branch","end1").address)));
            if(bymenu) tport_menu(win,buf,lchoices_p,C.field(br,"branch","end1").address,unreachable_level(C.field(br,"branch","end1").address,(C.i8(0))));
 else C.indirect(2,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

/* Print available dungeon information. */
export function print_dungeon(bymenu,rlev,rdgn)
{
    bymenu=C.i8(bymenu);
    rlev=C.ptr(rlev);
    rdgn=C.ptr(rdgn);
    const stackFrame=C.stackSave();
    try {
    let i; let last_level; let nlev;
    let buf=C.stackAlloc((1*256));
    let descr;
    let first; let unplaced;
    let slev;
    let dptr;
    let br;
    let lchoices=C.stackAlloc(C.sizes["struct lchoice"]);
    let win=C.indirect(3,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4);
    if(bymenu) {
        C.indirect(4,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
        (C.field(lchoices,"lchoice","idx").value=0);
        (C.field(lchoices,"lchoice","menuletter").value=C.i8(97));
    }
    for(((i=0),(dptr=C.field(C.svd,"instance_globals_saved_d","dungeons").address));Number(i<C.field(C.svn,"instance_globals_saved_n","n_dgns").value);(((i=C.i32((i+1)))-1),((dptr=C.ptr((dptr+Number(C.sizes["struct dungeon"]))))-Number(C.sizes["struct dungeon"])))) {
        if(Number(!!(Number(!!(C.i32(bymenu)&&(Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))&&Number(i!=C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value))))) continue;
        (unplaced=unplaced_floater(dptr));
        (descr=(C.i32(unplaced)?C.literal("depth"):C.literal("level")));
        (nlev=C.i32(C.field(dptr,"dungeon","num_dunlevs").value));
        if(Number(nlev>1)) C.variadic(54,(C.literal("print_dungeon")),2317,buf,BigInt((1*256)),C.literal("%s: %s %d to %d"),C.field(dptr,"dungeon","dname").address,C.makeplural(descr),C.field(dptr,"dungeon","depth_start").value,C.i32((C.i32((C.field(dptr,"dungeon","depth_start").value+nlev))-1)));
 else C.variadic(55,(C.literal("print_dungeon")),2320,buf,BigInt((1*256)),C.literal("%s: %s %d"),C.field(dptr,"dungeon","dname").address,descr,C.field(dptr,"dungeon","depth_start").value);
        /* Most entrances are uninteresting. */
        if(Number(C.i32(C.field(dptr,"dungeon","entry_lev").value)!=1)) {
            if(Number(C.i32(C.field(dptr,"dungeon","entry_lev").value)==nlev)) C.strcat(buf,C.literal(", entrance from below"));
 else C.variadic(56,C.eos(buf),C.literal(", entrance on %d"),C.i32((C.i32((C.field(dptr,"dungeon","depth_start").value+C.i32(C.field(dptr,"dungeon","entry_lev").value)))-1)));
        }
        if(bymenu) {
            C.add_menu_heading(win,buf);
        } else C.indirect(5,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        /*
         * Circle through the special levels to find levels that are in
         * this dungeon.
         */
        for(((slev=C.field(C.svs,"instance_globals_saved_s","sp_levchn").value),(last_level=0));slev;(slev=C.field(slev,"s_level","next").value)) {
            if(Number(C.i32(C.field(C.field(slev,"s_level","dlevel").address,"d_level","dnum").value)!=i)) continue;
            /* print any branches before this level */
            print_branch(win,i,last_level,C.i32(C.field(C.field(slev,"s_level","dlevel").address,"d_level","dlevel").value),bymenu,lchoices);
            C.variadic(57,buf,C.literal("%c %s: %d"),C.i32(chr_u_on_lvl(C.field(slev,"s_level","dlevel").address)),C.field(slev,"s_level","proto").address,C.i32(depth(C.field(slev,"s_level","dlevel").address)));
            if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(slev,"s_level","dlevel").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address))))))) C.variadic(58,C.eos(buf),C.literal(" (tune %s)"),C.field(C.svt,"instance_globals_saved_t","tune").address);
            if(bymenu) tport_menu(win,buf,lchoices,C.field(slev,"s_level","dlevel").address,unreachable_level(C.field(slev,"s_level","dlevel").address,unplaced));
 else C.indirect(6,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
            (last_level=C.i32(C.field(C.field(slev,"s_level","dlevel").address,"d_level","dlevel").value));
        }
        /* print branches after the last special level */
        print_branch(win,i,last_level,32,bymenu,lchoices);
    }
    if(bymenu) {
        let n;
        let selected=C.local("struct mi *",0);
        let idx;
        C.indirect(7,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,C.literal("Level teleport to where:"));
        (n=C.select_menu(win,1,selected.address));
        C.indirect(8,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
        if(Number(n>0)) {
            (idx=C.i32((C.field(C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
            C.free(selected.value);
            if(Number(!!(rlev&&rdgn))) {
                (C.cell(rlev,"signed char").value=C.cell((C.field(lchoices,"lchoice","lev").address+Number(idx)*1),"signed char").value);
                (C.cell(rdgn,"short").value=C.cell((C.field(lchoices,"lchoice","dgn").address+Number(idx)*2),"short").value);
                return C.cell((C.field(lchoices,"lchoice","playerlev").address+Number(idx)*1),"signed char").value;
            }
        }
        return C.i8(0);
    }
    /* Print out floating branches (if any). */
    for(((first=(C.i8(1))),(br=C.field(C.svb,"instance_globals_saved_b","branches").value));br;(br=C.field(br,"branch","next").value)) {
        if(Number(C.i32(C.field(C.field(br,"branch","end1").address,"d_level","dnum").value)==C.field(C.svn,"instance_globals_saved_n","n_dgns").value)) {
            if(first) {
                C.indirect(9,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
                C.indirect(10,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal("Floating branches"));
                (first=(C.i8(0)));
            }
            C.variadic(59,buf,C.literal("   %s to %s"),br_string(C.field(br,"branch","type").value),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","dname").address);
            C.indirect(11,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        }
    }
    /* I hate searching for the invocation pos while debugging. -dean */
    if(Invocation_lev(C.field(C.u,"you","uz").address)) {
        C.indirect(12,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
        C.variadic(60,buf,C.literal("Invocation position @ (%d,%d), hero @ (%d,%d)"),C.i32(C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","x").value),C.i32(C.field(C.field(C.svi,"instance_globals_saved_i","inv_pos").address,"nhcoord","y").value),C.i32(C.field(C.u,"you","ux").value),C.i32(C.field(C.u,"you","uy").value));
        C.indirect(13,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
    } else {
        let trap;
        /* if current level has a magic portal, report its location;
           this assumes that there is at most one magic portal on any
           given level; quest and ft.ludios have pairs (one in main
           dungeon matched with one in the corresponding branch), the
           elemental planes have singletons (connection to next plane) */
        (C.cell(buf,"char").value=C.i8(0));
        for((trap=C.field(C.gf,"instance_globals_f","ftrap").value);trap;(trap=C.field(trap,"trap","ntrap").value)) if(Number(C.i32(C.field(trap,"trap","ttyp").value)==C.MAGIC_PORTAL)) break;

        if(trap) C.variadic(61,buf,C.literal("Portal @ (%d,%d), hero @ (%d,%d)"),C.i32(C.field(trap,"trap","tx").value),C.i32(C.field(trap,"trap","ty").value),C.i32(C.field(C.u,"you","ux").value),C.i32(C.field(C.u,"you","uy").value));
 else if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address))))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qstart_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qstart_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qstart_level").address))))))))||C.i32(at_dgn_entrance(C.literal("The Quest")))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))))) C.strcpy(buf,C.literal("No portal found."));
        /* only report "no portal found" when actually expecting a portal */
        /* only give output if we found a portal or expected one and didn't */
        if(C.cell(buf,"char").value) {
            C.indirect(14,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,C.literal(""));
            C.indirect(15,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
        }
    }
    C.indirect(16,(C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),win,(C.i8(1)));
    C.indirect(17,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    return C.i8(0);
    } finally {C.stackRestore(stackFrame); }
}

/* Record that the player knows about a branch from a level. This function
 * will determine whether or not it was a "real" branch that was taken.
 * This function should not be called for a transition done via level
 * teleport or via the Eye.
 */
export function recbranch_mapseen(source,dest)
{
    source=C.ptr(source);
    dest=C.ptr(dest);
    let mptr;
    let br;
    /* not a branch */
    if(Number(C.i32(C.field(source,"d_level","dnum").value)==C.i32(C.field(dest,"d_level","dnum").value))) return;
    /* we only care about forward branches */
    for((br=C.field(C.svb,"instance_globals_saved_b","branches").value);br;(br=C.field(br,"branch","next").value)) {
        if(Number(!!(C.i32(on_level(source,C.field(br,"branch","end1").address))&&C.i32(on_level(dest,C.field(br,"branch","end2").address))))) break;
        if(Number(!!(C.i32(on_level(source,C.field(br,"branch","end2").address))&&C.i32(on_level(dest,C.field(br,"branch","end1").address))))) return;
    }
    /* branch not found, so not a real branch. */
    if(Number(!(br))) return;
    if(Number(((mptr=find_mapseen(source)))!=0)) {
        if(Number(!!(C.field(mptr,"mapseen","br").value&&Number(br!=C.field(mptr,"mapseen","br").value)))) C.variadic(62,C.literal("Two branches on the same level?"));
        (C.field(mptr,"mapseen","br").value=br);
    } else {
        C.variadic(63,C.literal("Can't note branch for unseen level (%d, %d)"),C.i32(C.field(source,"d_level","dnum").value),C.i32(C.field(source,"d_level","dlevel").value));
    }
}

export function get_annotation(lev)
{
    lev=C.ptr(lev);
    let mptr;
    if(((mptr=find_mapseen(lev)))) return C.field(mptr,"mapseen","custom").value;
    return 0;
}

/* print the annotation for the current level, if it exists */
export function print_level_annotation()
{
    let annotation;
    if(Number(((annotation=get_annotation(C.field(C.u,"you","uz").address)))!=0)) C.variadic(64,C.literal("remember this level as %s."),annotation);
}

/* ask user to annotate level lev.
   if lev is NULL, uses current level. */
export function query_annotation(lev)
{
    lev=C.ptr(lev);
    const stackFrame=C.stackSave();
    try {
    let mptr;
    let nbuf=C.stackAlloc((1*256));
    /* Buffer for response */
    if(Number(!(((mptr=find_mapseen((lev?lev:C.field(C.u,"you","uz").address))))))) return;
    (C.cell((nbuf+Number(0)*1),"char").value=C.i8(0));
    if(C.field(mptr,"mapseen","custom").value) {
        let tmpbuf=C.stackAlloc((1*256));
        C.variadic(65,tmpbuf,C.literal("Replace annotation \"%.30s%s\" with?"),C.field(mptr,"mapseen","custom").value,((Number(C.strlen(C.field(mptr,"mapseen","custom").value)>C.u64(30)))?C.literal("..."):C.literal("")));
        C.getlin(tmpbuf,nbuf);
    } else {
        let qbuf=C.stackAlloc((1*128)); let lbuf=C.stackAlloc((1*128));
        /* level description */
        if(Number(!!(Number(!(lev))||C.i32(on_level(C.field(C.u,"you","uz").address,lev))))) {
            C.strcpy(lbuf,C.literal("this dungeon level"));
        } else {
            let dflgs=((Number(C.i32(C.field(lev,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value)))?0:2);
            let save_uz=C.stackAlloc(C.sizes["struct d_level"]); C.copy(save_uz,C.field(C.u,"you","uz").address,C.sizes["struct d_level"]);
            C.copy(C.field(C.u,"you","uz").address,lev,C.sizes["struct d_level"]);
            C.describe_level(lbuf,dflgs);
            C.copy(C.field(C.u,"you","uz").address,save_uz,C.sizes["struct d_level"]);
            C.strsubst(lbuf,C.literal("Dlvl:"),C.literal("level "));
            /* even though we've told describe_level() not to append
               a trailing space (by not including '1' in dflgs), the
               level number is formatted with %-2d so single digit
               values will end up with one anyway; remove it */
            C.trimspaces(lbuf);
        }
        C.variadic(66,(C.literal("query_annotation")),2543,qbuf,BigInt((1*128)),C.literal("What do you want to call %s?"),lbuf);
        C.getlin(qbuf,nbuf);
    }
    /* empty input or ESC means don't add or change annotation;
       space-only means discard current annotation without adding new one */
    if(Number(!!(Number(!(C.cell(nbuf,"char").value))||Number(C.i32(C.cell(nbuf,"char").value)==27)))) return;
    /* strip leading and trailing spaces, compress out consecutive spaces */
    C.mungspaces(nbuf);
    /* discard old annotation, if any */
    if(C.field(mptr,"mapseen","custom").value) {
        C.free(C.field(mptr,"mapseen","custom").value);
        (C.field(mptr,"mapseen","custom").value=0);
        (C.field(mptr,"mapseen","custom_lth").value=C.u32(0));
    }
    /* add new annotation, unless it's all spaces (which will be an
       empty string after mungspaces() above) */
    if(Number(!!(C.i32(C.cell(nbuf,"char").value)&&C.strcmp(nbuf,C.literal(" "))))) {
        (C.field(mptr,"mapseen","custom").value=C.dupstr(nbuf));
        /* _lth field does not include trailing '\0' in the count */
        (C.field(mptr,"mapseen","custom_lth").value=C.u32(C.strlen(C.field(mptr,"mapseen","custom").value)));
    }
    } finally {C.stackRestore(stackFrame); }
}

/* #annotate command - add a custom name to the current level */
export function donamelevel()
{
    if(C.field(C.iflags,"instance_flags","menu_requested").value) return dooverview();
    query_annotation(0);
    return 0;
}

/* !SFCTOOL */
/* exclusion zones */
export function free_exclusions()
{
    let ez=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value;
    while(ez) {
        let nxtez=C.field(ez,"exclusion_zone","next").value;
        C.free(ez);
        (ez=nxtez);
    }
    (C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value=0);
}

export function save_exclusions(nhfp)
{
    nhfp=C.ptr(nhfp);
    const stackFrame=C.stackSave();
    try {
    let ez;
    let nez=C.local("int",0);
    for(((nez.value=0),(ez=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value));ez;((ez=C.field(ez,"exclusion_zone","next").value),(nez.value=C.i32((nez.value+1))))) ;

    if((C.i32((C.field((nhfp),"nh_file","mode").value&(C.i32((1|2))))))) {
        C.sfo_int(nhfp,nez.address,C.literal("exclusion_count"));
        for((ez=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value);ez;(ez=C.field(ez,"exclusion_zone","next").value)) {
            C.sfo_xint16(nhfp,C.field(ez,"exclusion_zone","zonetype").address,C.literal("exclusion-zonetype"));
            C.sfo_int16(nhfp,C.field(ez,"exclusion_zone","lx").address,C.literal("exclusion-lx"));
            C.sfo_int16(nhfp,C.field(ez,"exclusion_zone","ly").address,C.literal("exclusion-ly"));
            C.sfo_int16(nhfp,C.field(ez,"exclusion_zone","hx").address,C.literal("exclusion-hx"));
            C.sfo_int16(nhfp,C.field(ez,"exclusion_zone","hy").address,C.literal("exclusion-hy"));
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function load_exclusions(nhfp)
{
    nhfp=C.ptr(nhfp);
    const stackFrame=C.stackSave();
    try {
    let ez;
    let nez=C.local("int",0);
    C.sfi_int(nhfp,nez.address,C.literal("exclusion_count"));
    ;
    while(Number(((nez.value=C.i32((nez.value-1)))+1)>0)) {
        (ez=C.alloc(C.u32(BigInt(C.sizes["struct exclusion_zone"]))));
        C.sfi_xint16(nhfp,C.field(ez,"exclusion_zone","zonetype").address,C.literal("exclusion-zonetype"));
        ;
        C.sfi_int16(nhfp,C.field(ez,"exclusion_zone","lx").address,C.literal("exclusion-lx"));
        C.sfi_int16(nhfp,C.field(ez,"exclusion_zone","ly").address,C.literal("exclusion-ly"));
        C.sfi_int16(nhfp,C.field(ez,"exclusion_zone","hx").address,C.literal("exclusion-hx"));
        C.sfi_int16(nhfp,C.field(ez,"exclusion_zone","hy").address,C.literal("exclusion-hy"));
        (C.field(ez,"exclusion_zone","next").value=C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value);
        (C.field(C.sve,"instance_globals_saved_e","exclusion_zones").value=ez);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* find the particular mapseen object in the chain; may return null */
export function find_mapseen(lev)
{
    lev=C.ptr(lev);
    let mptr;
    for((mptr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);mptr;(mptr=C.field(mptr,"mapseen","next").value)) if(on_level(C.field(mptr,"mapseen","lev").address,lev)) break;

    return mptr;
}

export function find_mapseen_by_str(s)
{
    s=C.ptr(s);
    let mptr;
    for((mptr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);mptr;(mptr=C.field(mptr,"mapseen","next").value)) if(Number(!!(C.field(mptr,"mapseen","custom").value&&Number(!(C.strncmpi((s),(C.field(mptr,"mapseen","custom").value),C.i32((-1)))))))) break;

    return mptr;
}

export function rm_mapseen(ledger_num)
{
    ledger_num=C.i32(ledger_num);
    let mptr; let mprev=0;
    let bp; let bpnext;
    for((mptr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);mptr;((mprev=mptr),(mptr=C.field(mptr,"mapseen","next").value))) if(Number(C.i32((C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","ledger_start").value+C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dlevel").value)))==ledger_num)) break;

    if(Number(!(mptr))) return;
    if(C.field(mptr,"mapseen","custom").value) (C.free(C.field(mptr,"mapseen","custom").value),(C.field(mptr,"mapseen","custom").value=(0)));
    (bpnext=C.field(mptr,"mapseen","final_resting_place").value);
    while(Number(((bp=bpnext))!=(0))) {
        (bpnext=C.field(bp,"cemetery","next").value);
        C.free(bp);
    }
    if(mprev) {
        (C.field(mprev,"mapseen","next").value=C.field(mptr,"mapseen","next").value);
    } else {
        (C.field(C.svm,"instance_globals_saved_m","mapseenchn").value=C.field(mptr,"mapseen","next").value);
    }
    C.free(mptr);
}

export function save_mapseen(nhfp,mptr)
{
    nhfp=C.ptr(nhfp);
    mptr=C.ptr(mptr);
    const stackFrame=C.stackSave();
    try {
    let curr;
    let i; let brindx=C.local("int",0);
    for(((brindx.value=0),(curr=C.field(C.svb,"instance_globals_saved_b","branches").value));curr;((curr=C.field(curr,"branch","next").value),(brindx.value=C.i32((brindx.value+1))))) if(Number(curr==C.field(mptr,"mapseen","br").value)) break;

    C.sfo_int(nhfp,brindx.address,C.literal("mapseen-branch_index"));
    C.sfo_d_level(nhfp,C.field(mptr,"mapseen","lev").address,C.literal("mapseen-d_level"));
    C.sfo_mapseen_feat(nhfp,C.field(mptr,"mapseen","feat").address,C.literal("mapseen-feat"));
    C.sfo_mapseen_flags(nhfp,C.field(mptr,"mapseen","flags").address,C.literal("mapseen-flags"));
    C.sfo_unsigned(nhfp,C.field(mptr,"mapseen","custom_lth").address,C.literal("mapseen-custom_lth"));
    if(C.field(mptr,"mapseen","custom_lth").value) {
        C.sfo_char(nhfp,C.field(mptr,"mapseen","custom").value,C.literal("mapseen-custom"),C.i32(C.field(mptr,"mapseen","custom_lth").value));
    }
    for((i=0);Number(i<(C.i32(((C.i32((40+1)))*2))));(i=C.i32((i+1)))) {
        C.sfo_mapseen_rooms(nhfp,(C.field(mptr,"mapseen","msrooms").address+Number(i)*C.sizes["struct mapseen_rooms"]),C.literal("mapseen-msrooms"));
    }
    C.savecemetery(nhfp,C.field(mptr,"mapseen","final_resting_place").address);
    } finally {C.stackRestore(stackFrame); }
}

/* !SFCTOOL */
export function load_mapseen(nhfp)
{
    nhfp=C.ptr(nhfp);
    const stackFrame=C.stackSave();
    try {
    let i; let branchnum=C.local("int",0); let brindx;
    let load;
    let curr;
    (load=C.alloc(C.u32(BigInt(C.sizes["struct mapseen"]))));
    C.sfi_int(nhfp,branchnum.address,C.literal("mapseen-branch_index"));
    ;
    for(((brindx=0),(curr=C.field(C.svb,"instance_globals_saved_b","branches").value));curr;((curr=C.field(curr,"branch","next").value),(brindx=C.i32((brindx+1))))) if(Number(brindx==branchnum.value)) break;

    (C.field(load,"mapseen","br").value=curr);
    C.sfi_d_level(nhfp,C.field(load,"mapseen","lev").address,C.literal("mapseen-d_level"));
    C.sfi_mapseen_feat(nhfp,C.field(load,"mapseen","feat").address,C.literal("mapseen-feat"));
    C.sfi_mapseen_flags(nhfp,C.field(load,"mapseen","flags").address,C.literal("mapseen-flags"));
    C.sfi_unsigned(nhfp,C.field(load,"mapseen","custom_lth").address,C.literal("mapseen-custom_lth"));
    ;
    if(C.field(load,"mapseen","custom_lth").value) {
        /* length doesn't include terminator (which isn't saved & restored) */
        (C.field(load,"mapseen","custom").value=C.alloc(C.u32((C.field(load,"mapseen","custom_lth").value+C.u32(1)))));
        C.sfi_char(nhfp,C.field(load,"mapseen","custom").value,C.literal("mapseen-custom"),C.i32(C.field(load,"mapseen","custom_lth").value));
        (C.cell((C.field(load,"mapseen","custom").value+Number(C.field(load,"mapseen","custom_lth").value)*1),"char").value=C.i8(0));
    } else {
        (C.field(load,"mapseen","custom").value=0);
    }
    for((i=0);Number(i<(C.i32(((C.i32((40+1)))*2))));(i=C.i32((i+1)))) {
        C.sfi_mapseen_rooms(nhfp,(C.field(load,"mapseen","msrooms").address+Number(i)*C.sizes["struct mapseen_rooms"]),C.literal("mapseen-msrooms"));
    }
    C.restcemetery(nhfp,C.field(load,"mapseen","final_resting_place").address);
    return load;
    } finally {C.stackRestore(stackFrame); }
}

/* for '#stats' wizard-mode command, to show memory used for #overview data */
export function overview_stats(win,statsfmt,total_count,total_size)
{
    win=C.i32(win);
    statsfmt=C.ptr(statsfmt);
    total_count=C.ptr(total_count);
    total_size=C.ptr(total_size);
    const stackFrame=C.stackSave();
    try {
    /* output window */
    /* format */
    /* args for the format */
    let buf=C.stackAlloc((1*256)); let hdrbuf=C.stackAlloc((1*128));
    let ocount; let osize; let bcount; let bsize; let acount; let asize;
    let ce;
    let mptr;
    (ocount=(bcount=(acount=(osize=(bsize=(asize=0n))))));
    for((mptr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);mptr;(mptr=C.field(mptr,"mapseen","next").value)) {
        (ocount=C.i64((ocount+1n)));
        (osize=C.i64(osize+C.i64(BigInt(C.sizes["struct mapseen"]))));
        for((ce=C.field(mptr,"mapseen","final_resting_place").value);ce;(ce=C.field(ce,"cemetery","next").value)) {
            (bcount=C.i64((bcount+1n)));
            (bsize=C.i64(bsize+C.i64(BigInt(C.sizes["struct cemetery"]))));
        }
        if(C.field(mptr,"mapseen","custom_lth").value) {
            (acount=C.i64((acount+1n)));
            (asize=C.i64(asize+C.i64((C.u32((C.field(mptr,"mapseen","custom_lth").value+C.u32(1)))))));
        }
    }
    C.variadic(67,hdrbuf,C.literal("general, size %ld"),C.i64(BigInt(C.sizes["struct mapseen"])));
    C.variadic(68,buf,statsfmt,hdrbuf,ocount,osize);
    C.indirect(18,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
    if(bcount) {
        C.variadic(69,hdrbuf,C.literal("cemetery, size %ld"),C.i64(BigInt(C.sizes["struct cemetery"])));
        C.variadic(70,buf,statsfmt,hdrbuf,bcount,bsize);
        C.indirect(19,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
    }
    if(acount) {
        C.variadic(71,hdrbuf,C.literal("annotations, text"));
        C.variadic(72,buf,statsfmt,hdrbuf,acount,asize);
        C.indirect(20,(C.field(C.windowprocs,"window_procs","win_putstr").value),win,0,buf);
    }
    (C.cell(total_count,"long").value=C.i64(C.cell(total_count,"long").value+C.i64((C.i64((ocount+bcount))+acount))));
    (C.cell(total_size,"long").value=C.i64(C.cell(total_size,"long").value+C.i64((C.i64((osize+bsize))+asize))));
    } finally {C.stackRestore(stackFrame); }
}

/* Remove all mapseen objects for a particular dnum.
 * Useful during quest expulsion to remove quest levels.
 * [No longer deleted, just marked as notreachable.  #overview will
 * ignore such levels, end of game disclosure will include them.]
 */
export function remdun_mapseen(dnum)
{
    dnum=C.i32(dnum);
    let mptr; let mptraddr;
    (mptraddr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").address);
    while(Number(((mptr=C.cell(mptraddr,"struct mapseen *").value))!=0)) {
        if(Number(C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value)==dnum)) {
            /* use this... */
            (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","notreachable").value=C.u32(1));
        }
        /* old deletion code */
        (mptraddr=C.field(mptr,"mapseen","next").address);
    }
}

export function init_mapseen(lev)
{
    lev=C.ptr(lev);
    /* Create a level and insert in "sorted" order.  This is an insertion
     * sort first by dungeon (in order of discovery) and then by level number.
     */
    let mptr; let init; let prev;
    (init=C.alloc(C.u32(BigInt(C.sizes["struct mapseen"]))));
    C.memset(init,0,BigInt(C.sizes["struct mapseen"]));
    /* memset is fine for feature bits, flags, and rooms array;
       explicitly initialize pointers to null */
    (((C.field(init,"mapseen","next").value=0),(C.field(init,"mapseen","br").value=0)),(C.field(init,"mapseen","custom").value=0));
    (C.field(init,"mapseen","final_resting_place").value=0);
    /* svl.lastseentyp[][] is reused for each level, so get rid of
       previous level's data */
    C.memset(C.field(C.svl,"instance_globals_saved_l","lastseentyp").address,0,BigInt(((1*80)*21)));
    (C.field(C.field(init,"mapseen","lev").address,"d_level","dnum").value=C.field(lev,"d_level","dnum").value);
    (C.field(C.field(init,"mapseen","lev").address,"d_level","dlevel").value=C.field(lev,"d_level","dlevel").value);
    /* walk until we get to the place where we should insert init */
    for(((mptr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value),(prev=0));mptr;((prev=mptr),(mptr=C.field(mptr,"mapseen","next").value))) {
        if(Number(!!(Number(C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value)>C.i32(C.field(C.field(init,"mapseen","lev").address,"d_level","dnum").value))||(Number(!!(Number(C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value)==C.i32(C.field(C.field(init,"mapseen","lev").address,"d_level","dnum").value))&&Number(C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dlevel").value)>C.i32(C.field(C.field(init,"mapseen","lev").address,"d_level","dlevel").value)))))))) break;
    }
    if(Number(!(prev))) {
        (C.field(init,"mapseen","next").value=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);
        (C.field(C.svm,"instance_globals_saved_m","mapseenchn").value=init);
    } else {
        (mptr=C.field(prev,"mapseen","next").value);
        (C.field(prev,"mapseen","next").value=init);
        (C.field(init,"mapseen","next").value=mptr);
    }
}

/* || (feat).water || (feat).ice || (feat).lava */
/* returns true if this level has something interesting to print out */
export function interest_mapseen(mptr)
{
    mptr=C.ptr(mptr);
    if(on_level(C.field(C.u,"you","uz").address,C.field(mptr,"mapseen","lev").address)) return (C.i8(1));
    if(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","notreachable").value)||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","forgot").value)))) return (C.i8(0));
    /* when in tutorial, show all tutorial levels visited whether interesting
       or not and don't show any other levels; when outside tutorial, don't
       show any tutorial levels even if they're considered interesting */
    if((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tutorial_dnum").value))))) {
        return C.i8((Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tutorial_dnum").value)))));
    } else {
        if((Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tutorial_dnum").value))))) return (C.i8(0));
    }
    /* level is of interest if it has an auto-generated annotation */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","oracle").value)||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","bigroom").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","roguelevel").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","castle").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","valley").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","msanctum").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","vibrating_square").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","quest_summons").value)))||C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","questing").value)))) return (C.i8(1));
    /* when in Sokoban, list all sokoban levels visited; when not in it,
       list any visited Sokoban level which remains unsolved (will usually
       only be furthest one reached, but it's possible to enter pits and
       climb out on the far side on the first Sokoban level; also, wizard
       mode overrides teleport restrictions) */
    if(Number(!!((Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))&&(Number(!!((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))||Number(!(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","sokosolved").value)))))))) return (C.i8(1));
    /* when in the endgame, list all endgame levels visited, whether they
       have annotations or not, so that #overview doesn't become extremely
       sparse once the rest of the dungeon has been flagged as notreachable */
    if((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))) return C.i8((Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value))));
    /* level is of interest if it has non-zero feature count or known bones
       or user annotation or known connection to another dungeon branch
       or is the furthest level reached in its branch */
    return C.i8((Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value)||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value))))||(Number(!!(C.field(mptr,"mapseen","final_resting_place").value&&(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","knownbones").value)||C.i32(C.field(C.flags,"flag","debug").value)))))))))||C.field(mptr,"mapseen","custom").value))||C.field(mptr,"mapseen","br").value))||(Number(C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dlevel").value)==C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value)))))));
}

/* update the lastseentyp at x,y */
export function update_lastseentyp(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let mtmp;
    let ltyp=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value);
    if(Number(ltyp==C.DRAWBRIDGE_UP)) (ltyp=C.i32(C.db_under_typ(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value))));
    if(Number(!!(Number(!!(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&Number((C.i32((C.i32(C.field((mtmp),"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE)))&&C.canseemon(mtmp)))) (ltyp=C.cmap_to_type(C.i32(C.field(mtmp,"monst","mappearance").value)));
    (C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(x)*(1*21))+Number(y)*1),"signed char").value=C.i8(ltyp));
}

/* for some cases where deferred update needs to be done immediately;
   hide details from caller */
export function update_mapseen_for(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    recalc_mapseen();
    /* whole level */
    return C.i32(C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(x)*(1*21))+Number(y)*1),"signed char").value);
}

/* count mapseen feature from lastseentyp at x,y */
export function count_feat_lastseentyp(mptr,x,y)
{
    mptr=C.ptr(mptr);
    x=C.i16(x);
    y=C.i16(y);
    /* remembered data for a level; update feat.X counts */
    let count;
    let atmp;
    switch(C.i32(C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(x)*(1*21))+Number(y)*1),"signed char").value)) {
        /* levels that have these tend of have a lot of them */
        /*
     * FIXME?  due to theme rooms, lots of levels have an increased
     * chance of having these so automatic annotations for them may
     * have become more worthwhile now.
     */
        case (C.TREE):
            (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value)+1)));
        if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value=C.u32(count));
        break;
        case (C.FOUNTAIN):
            (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value)+1)));
        if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value=C.u32(count));
        break;
        case (C.THRONE):
            (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value)+1)));
        if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value=C.u32(count));
        break;
        case (C.SINK):
            (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value)+1)));
        if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value=C.u32(count));
        break;
        case (C.GRAVE):
            (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value)+1)));
        if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value=C.u32(count));
        break;
        case (C.ALTAR):
            /* get the altarmask for this location; might be a mimic */
            (atmp=C.u32(C.altarmask_at(x,y)));
        /* convert to index: 0..3 */
        (atmp=((Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address))))))&&Number((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","seenv").value)&C.i32((C.u8(255))))))!=C.i32((C.u8(255)))))))?C.u32(0):(((Number((C.u32(((atmp)&C.u32(7))))==C.u32(4)))?C.u32(3):C.u32(((atmp)&C.u32(7)))))));
        if(Number(!(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value))) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","msalign").value=atmp);
 else if(Number(C.u32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","msalign").value)!=atmp)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","msalign").value=C.u32(0));
        (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)+1)));
        if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value=C.u32(count));
        break;
        /*  An automatic annotation is added to the Castle and
         *  to Fort Ludios once their structure's main entrance
         *  has been seen (in person or via magic mapping).
         *  For the Fort, that entrance is just a secret door
         *  which will be converted into a regular one when
         *  located (or destroyed).
         * DOOR: possibly a lowered drawbridge's open portcullis;
         * DBWALL: a raised drawbridge's "closed door";
         * DRAWBRIDGE_DOWN: the span provided by lowered bridge,
         *  with moat or other terrain hidden underneath;
         * DRAWBRIDGE_UP: moat in front of a raised drawbridge,
         *  not recognizable as a bridge location unless/until
         *  the adjacent DBWALL has been seen.
         */
        case (C.DOOR):
            if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))) {
                let ty; let tx=C.i32((C.i32(x)-4));
                /* Throne is four columns to left, either directly in
             * line or one row higher or lower, and doesn't have
             * to have been seen yet.
             *   ......|}}}.
             *   ..\...S}...
             *   ..\...S}...
             *   ......|}}}.
             * For 3.6.0 and earlier, it was always in direct line:
             * both throne and door on the lower of the two rows.
             */
                for((ty=C.i32((C.i32(y)-1)));Number(ty<=C.i32((C.i32(y)+1)));(ty=C.i32((ty+1)))) if(Number(!!(C.isok(C.i16(tx),C.i16(ty))&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(tx)*(C.sizes["struct rm"]*21))+Number(ty)*C.sizes["struct rm"]),"rm","typ").value))==C.THRONE))))) {
                    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","ludios").value=C.u32(1));
                    break;
                }

                break;
            }
        if(Number(C.is_drawbridge_wall(x,y)<0)) break;
        ;
        /*FALLTHRU*/
        case (C.DBWALL):
            case (C.DRAWBRIDGE_DOWN):
                if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address))))))) ((C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","castle").value=C.u32(1)),(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","castletune").value=C.u32(1)));
        break;
        default:
            break;
    }
}

/* recalculate mapseen for the current level */
export function recalc_mapseen()
{
    const stackFrame=C.stackSave();
    try {
    let mptr; let oth_mptr;
    let mtmp;
    let bp; let bonesaddr;
    let t;
    let i; let ridx;
    let count;
    let x; let y;
    let uroom;
    /* Should not happen in general, but possible if in the process
     * of being booted from the quest.  The mapseen object gets
     * removed during the expulsion but prior to leaving the level
     * [Since quest expulsion no longer deletes quest mapseen data,
     * null return from find_mapseen() should now be impossible.]
     */
    if(Number(!(((mptr=find_mapseen(C.field(C.u,"you","uz").address)))))) return;
    /* reset all features; mptr->feat.* = 0; */
    C.memset(C.field(mptr,"mapseen","feat").address,0,BigInt(C.sizes["struct mapseen_feat"]));
    /* reset most flags; some level-specific ones are left as-is */
    if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","notreachable").value) {
        (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","notreachable").value=C.u32(0));
        /* reached it; Eye of the Aethiopica? */
        if(In_quest(C.field(C.u,"you","uz").address)) {
            let mptrtmp=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value;
            /* when quest was notreachable due to ejection and portal removal,
               getting back to it via arti-invoke should revive annotation
               data for all quest levels, not just the one we're on now */
            do {
                if(Number(C.i32(C.field(C.field(mptrtmp,"mapseen","lev").address,"d_level","dnum").value)==C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value))) (C.field(C.field(mptrtmp,"mapseen","flags").address,"mapseen_flags","notreachable").value=C.u32(0));
                (mptrtmp=C.field(mptrtmp,"mapseen","next").value);
            } while(mptrtmp);
        }
    }
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","knownbones").value=C.u32(0));
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","sokosolved").value=C.u32(Number(!!((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))&&Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value))))));
    /* mptr->flags.bigroom retains previous value when hero can't see */
    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","bigroom").value=C.u32(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_bigroom_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_bigroom_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_bigroom_level").address))))))));
 else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","forgot").value) (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","bigroom").value=C.u32(0));
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","roguelevel").value=C.u32(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))));
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","oracle").value=C.u32(0));
    /* recalculated during room traversal below */
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","castletune").value=C.u32(0));
    /* flags.castle retains previous value */
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","forgot").value=C.u32(0));
    /* flags.quest_summons disabled once quest finished */
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","quest_summons").value=C.u32((Number(!!(Number(!!(C.i32(at_dgn_entrance(C.literal("The Quest")))&&C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","qcalled").value)))&&Number(!((Number(!!(Number(!!(C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","qcompleted").value)||C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","qexpelled").value)))||C.i32(C.field(C.field(C.svq,"instance_globals_saved_q","quest_status").address,"q_score","leader_is_dead").value)))))))))));
    (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","questing").value=C.u32((Number(!!(C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qstart_level").address))&&C.i32(C.field(C.field(C.svq,"instance_globals_saved_q","quest_status").address,"q_score","got_quest").value))))));
    /* flags.msanctum, .valley, and .vibrating_square handled below */
    /* track rooms the hero is in */
    for((i=C.u32(0));Number(C.i32(((uroom=C.cell((C.field(C.u,"you","urooms").address+Number(i)*1),"char").value)))!=0);(i=C.u32((i+1)))) {
        (ridx=C.u32((C.u32(uroom)-C.u32(3))));
        (C.field((C.field(mptr,"mapseen","msrooms").address+Number(ridx)*C.sizes["struct mapseen_rooms"]),"mapseen_rooms","seen").value=C.u32(1));
        (C.field((C.field(mptr,"mapseen","msrooms").address+Number(ridx)*C.sizes["struct mapseen_rooms"]),"mapseen_rooms","untended").value=C.u32(((Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(ridx)*C.sizes["struct mkroom"]),"mkroom","rtype").value)>=C.SHOPBASE))?(Number(!!(Number(!(((mtmp=C.shop_keeper(uroom)))))||Number(!(C.inhishop(mtmp)))))):((Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(ridx)*C.sizes["struct mkroom"]),"mkroom","rtype").value)==C.TEMPLE))?(Number(!!(Number(!(((mtmp=C.findpriest(uroom)))))||Number(!(C.inhistemple(mtmp)))))):0))));
    }
    /* recalculate room knowledge: for now, just shops and temples
     * this could be extended to an array of 0..SHOPBASE
     */
    for((i=C.u32(0));Number(i<C.u32(C.i32((C.u64((BigInt((C.sizes["struct mapseen_rooms"]*82))/BigInt(C.sizes["struct mapseen_rooms"])))))));(i=C.u32((i+1)))) {
        if(C.field((C.field(mptr,"mapseen","msrooms").address+Number(i)*C.sizes["struct mapseen_rooms"]),"mapseen_rooms","seen").value) {
            if(Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","rtype").value)>=C.SHOPBASE)) {
                if(C.field((C.field(mptr,"mapseen","msrooms").address+Number(i)*C.sizes["struct mapseen_rooms"]),"mapseen_rooms","untended").value) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","shoptype").value=C.u32(C.i32((C.SHOPBASE-1))));
 else if(Number(!(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value))) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","shoptype").value=C.u32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","rtype").value));
 else if(Number(C.u32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","shoptype").value)!=C.u32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","rtype").value))) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","shoptype").value=C.u32(0));
                (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value)+1)));
                if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value=C.u32(count));
            } else if(Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","rtype").value)==C.TEMPLE)) {
                /* altar and temple alignment handled below */
                (count=C.i32((C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value)+1)));
                if(Number(count<=3)) (C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value=C.u32(count));
            } else if(Number(C.i32(C.field((C.field(C.svr,"instance_globals_saved_r","rooms").address+Number(i)*C.sizes["struct mkroom"]),"mkroom","orig_rtype").value)==C.DELPHI)) {
                (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","oracle").value=C.u32(1));
            }
        }
    }
    /* Update svl.lastseentyp with typ if and only if it is in sight or the
     * hero can feel it on their current location (i.e. not levitating).
     * This *should* give the "last known typ" for each dungeon location.
     * (At the very least, it's a better assumption than determining what
     * the player knows from the glyph and the typ (which is isn't quite
     * enough information in some cases)).
     *
     * It was reluctantly added to struct rm to track.  Alternatively
     * we could track "features" and then update them all here, and keep
     * track of when new features are created or destroyed, but this
     * seemed the most elegant, despite adding more data to struct rm.
     * [3.6.0: we're using svl.lastseentyp[][] rather than level.locations
     * to track the features seen.]
     *
     * Although no current windowing systems (can) do this, this would add
     * the ability to have non-dungeon glyphs float above the last known
     * dungeon glyph (i.e. items on fountains).
     */
    if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.LEVITATION)*C.sizes["struct prop"]),"prop","blocked").value)))))))) update_lastseentyp(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) {
        for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
            count_feat_lastseentyp(mptr,x,y);
        }
    }
    /* Moloch's Sanctum and the Valley of the Dead are normally given an
       automatic annotation when you enter a temple attended by a priest,
       but it is possible for the priest to be killed prior to that; we
       assume that both of those levels only contain one altar, so add the
       annotation if that altar has been mapped (seen or magic mapping) */
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address))))))) {
        /* don't clear valley if naltar==0; maybe altar got destroyed? */
        if(Number(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)>0)) (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","valley").value=C.u32(1));
        /* Sanctum and Gateway-to-Sanctum are mutually exclusive automatic
       annotations but handling that is tricky because they're stored
       with data for different levels */
    } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address))))))) {
        if(Number(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)>0)) (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","msanctum").value=C.u32(1));
        if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","msanctum").value) {
            let invocat_lvl=C.stackAlloc(C.sizes["struct d_level"]);
            C.copy(invocat_lvl,C.field(C.u,"you","uz").address,C.sizes["struct d_level"]);
            (C.field(invocat_lvl,"d_level","dlevel").value=C.i16(C.field(invocat_lvl,"d_level","dlevel").value-1));
            if(Number(((oth_mptr=find_mapseen(invocat_lvl)))!=0)) (C.field(C.field(oth_mptr,"mapseen","flags").address,"mapseen_flags","vibrating_square").value=C.u32(0));
        }
    } else if(Invocation_lev(C.field(C.u,"you","uz").address)) {
        /* annotate vibrating square's level if vibr_sqr 'trap' has been
           found or if that trap is gone (indicating that invocation has
           happened) provided that the sanctum's annotation hasn't been
           added (either hero hasn't descended to that level yet or hasn't
           mapped its temple) */
        for((t=C.field(C.gf,"instance_globals_f","ftrap").value);t;(t=C.field(t,"trap","ntrap").value)) if(Number(C.i32(C.field(t,"trap","ttyp").value)==C.VIBRATING_SQUARE)) break;

        (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","vibrating_square").value=C.u32((t?C.i32(C.field(t,"trap","tseen").value):(Number(!!(Number(((oth_mptr=find_mapseen(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address)))==0)||Number(!(C.field(C.field(oth_mptr,"mapseen","flags").address,"mapseen_flags","msanctum").value))))))));
        /* no trap implies that invocation has been performed */
    }
    if(Number(!!(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","bonesinfo").value&&Number(!(C.field(mptr,"mapseen","final_resting_place").value))))) {
        /* clone the bonesinfo so we aren't dependent upon this
           level being in memory */
        (bonesaddr=C.field(mptr,"mapseen","final_resting_place").address);
        (bp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","bonesinfo").value);
        do {
            (C.cell(bonesaddr,"struct cemetery *").value=C.alloc(C.u32(BigInt(C.sizes["struct cemetery"]))));
            C.copy(C.cell(bonesaddr,"struct cemetery *").value,bp,C.sizes["struct cemetery"]);
            (bp=C.field(bp,"cemetery","next").value);
            (bonesaddr=C.field((C.cell(bonesaddr,"struct cemetery *").value),"cemetery","next").address);
        } while(bp);
        (C.cell(bonesaddr,"struct cemetery *").value=0);
    }
    /* decide which past hero deaths have become known; there's no
       guarantee of either a grave or a ghost, so we go by whether the
       current hero has seen the map location where each old one died */
    for((bp=C.field(mptr,"mapseen","final_resting_place").value);bp;(bp=C.field(bp,"cemetery","next").value)) if(C.cell(((C.field(C.svl,"instance_globals_saved_l","lastseentyp").address+Number(C.field(bp,"cemetery","frpx").value)*(1*21))+Number(C.field(bp,"cemetery","frpy").value)*1),"signed char").value) {
        (C.field(bp,"cemetery","bonesknown").value=(C.i8(1)));
        (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","knownbones").value=C.u32(1));
    }

    } finally {C.stackRestore(stackFrame); }
}

/*ARGUSED*/
/* valley and sanctum levels get automatic annotation once their temple
   is entered */
export function mapseen_temple(priest)
{
    priest=C.ptr(priest);
    /* not used; might be useful someday */
    let mptr=find_mapseen(C.field(C.u,"you","uz").address);
    if(Number(!(mptr))) return;
    if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address))))))) (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","valley").value=C.u32(1));
 else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address),"d_level","dnum").value))))&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address))))))) (C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","msanctum").value=C.u32(1));
}

/* room entry message has just been delivered so learn room even if blind */
export function room_discovered(roomno)
{
    roomno=C.i32(roomno);
    let mptr=find_mapseen(C.field(C.u,"you","uz").address);
    if(Number(!!(mptr&&Number(!(C.field((C.field(mptr,"mapseen","msrooms").address+Number(roomno)*C.sizes["struct mapseen_rooms"]),"mapseen_rooms","seen").value))))) {
        (C.field((C.field(mptr,"mapseen","msrooms").address+Number(roomno)*C.sizes["struct mapseen_rooms"]),"mapseen_rooms","seen").value=C.u32(1));
        recalc_mapseen();
    }
}

/* #overview command */
export function dooverview()
{
    /* game in progress; 'why' is 0 for normal #overview, -1 if user prefixed
       #overview with 'm'; 'reason' for end of game isn't applicable: use 0 */
    show_overview((C.i32(C.field(C.iflags,"instance_flags","menu_requested").value)?C.i32((-1)):0),0);
    (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
    return 0;
}

/* called for #overview or for end of game disclosure */
export function show_overview(why,reason)
{
    why=C.i32(why);
    reason=C.i32(reason);
    const stackFrame=C.stackSave();
    try {
    /* 0 => normal #overview command, -1 => 'm' prefix #overview;
              * 1 or 2 => final disclosure (1: hero lived, 2: hero died) */
    /* how hero died; used when disclosing end-of-game level */
    let win;
    let lastdun=C.local("int",C.i32((-1)));
    let selected=C.local("struct mi *",0);
    let n;
    /* lazy initialization */
    recalc_mapseen();
    (win=C.indirect(21,(C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),4));
    C.indirect(22,(C.field(C.windowprocs,"window_procs","win_start_menu").value),win,C.u64(0));
    /* show the endgame levels before the rest of the dungeon,
       so that the Planes (dnum 5-ish) come out above main dungeon (dnum 0) */
    if((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))) traverse_mapseenchn(1,win,why,reason,lastdun.address);
    /* if game is over or we're not in the endgame yet, show the dungeon */
    if(Number(!!(Number(why>0)||Number(!((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))))) traverse_mapseenchn(0,win,why,reason,lastdun.address);
    C.indirect(23,(C.field(C.windowprocs,"window_procs","win_end_menu").value),win,0);
    (n=C.select_menu(win,((Number(why!=C.i32((-1))))?0:1),selected.address));
    if(Number(n>0)) {
        let ledger;
        let lev=C.stackAlloc(C.sizes["struct d_level"]);
        (ledger=C.i32((C.field(C.field((selected.value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1)));
        (C.field(lev,"d_level","dnum").value=ledger_to_dnum(C.i16(ledger)));
        (C.field(lev,"d_level","dlevel").value=ledger_to_dlev(C.i16(ledger)));
        query_annotation(lev);
        C.free(selected.value);
    }
    C.indirect(24,(C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),win);
    } finally {C.stackRestore(stackFrame); }
}

/* display endgame levels or non-endgame levels, not both */
export function traverse_mapseenchn(viewendgame,win,why,reason,lastdun_p)
{
    viewendgame=C.i32(viewendgame);
    win=C.i32(win);
    why=C.i32(why);
    reason=C.i32(reason);
    lastdun_p=C.ptr(lastdun_p);
    /* 0: show endgame branch; 1: show other branches */
    /* output window */
    /* -1: menu, 0: normal, 1 and 2: end of game disclosure */
    /* when 'why'==1 or 2, how the game ended */
    /* where to restart if called twice */
    let mptr;
    let showheader;
    for((mptr=C.field(C.svm,"instance_globals_saved_m","mapseenchn").value);mptr;(mptr=C.field(mptr,"mapseen","next").value)) {
        if(C.i32((viewendgame^(Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))) continue;
        /* only print out info for a level or a dungeon if it's of interest */
        if(Number(!!(Number(why!=0)||C.i32(interest_mapseen(mptr))))) {
            (showheader=C.i8((Number(C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value)!=C.cell(lastdun_p,"int").value))));
            print_mapseen(win,mptr,why,reason,showheader);
            (C.cell(lastdun_p,"int").value=C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value));
        }
    }
}

export function seen_string(x,obj)
{
    x=C.i16(x);
    obj=C.ptr(obj);
    /* players are computer scientists: 0, 1, 2, n */
    switch(C.i32(x)) {
        case (0):
            return C.literal("no");
        /* an() returns too much.  index/strchr is ok in this case */
        case (1):
            return (C.strchr(C.vowels,C.i32(C.cell(obj,"char").value))?C.literal("an"):C.literal("a"));
        case (2):
            return C.literal("some");
        case (3):
            return C.literal("many");
    }
    return C.literal("(unknown)");
}

/* better br_string */
export function br_string2(br)
{
    br=C.ptr(br);
    /* Special case: quest portal says closed if kicked from quest */
    let closed_portal=C.i8((Number(!!(Number(C.i32(C.field(C.field(br,"branch","end2").address,"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_quest_dnum").value)))&&C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","qexpelled").value)))));
    switch(C.field(br,"branch","type").value) {
        case (3):
            return (C.i32(closed_portal)?C.literal("Sealed portal"):C.literal("Portal"));
        case (1):
            return C.literal("Connection");
        case (2):
            return (C.i32(C.field(br,"branch","end1_up").value)?C.literal("One way stairs up"):C.literal("One way stairs down"));
        case (0):
            return (C.i32(C.field(br,"branch","end1_up").value)?C.literal("Stairs up"):C.literal("Stairs down"));
    }
    return C.literal("(unknown)");
}

/* get the name of an endgame level; topten.c does something similar */
export function endgamelevelname(outbuf,indx)
{
    outbuf=C.ptr(outbuf);
    indx=C.i32(indx);
    let planename=0;
    (C.cell(outbuf,"char").value=C.i8(0));
    switch(indx) {
        case (C.i32((-5))):
            C.strcpy(outbuf,C.literal("Astral Plane"));
        break;
        case (C.i32((-4))):
            (planename=C.literal("Water"));
        break;
        case (C.i32((-3))):
            (planename=C.literal("Fire"));
        break;
        case (C.i32((-2))):
            (planename=C.literal("Air"));
        break;
        case (C.i32((-1))):
            (planename=C.literal("Earth"));
        break;
    }
    if(planename) C.variadic(73,outbuf,C.literal("Plane of %s"),planename);
 else if(Number(!(C.cell(outbuf,"char").value))) C.variadic(74,outbuf,C.literal("unknown plane #%d"),indx);
    return outbuf;
}

/* short shop description */
export function shop_string(rtype)
{
    rtype=C.i32(rtype);
    
    /* defined in shknam.c */
    let shoptype=C.i32((rtype-C.SHOPBASE));
    /* convert room type to shop type */
    let str=C.literal("shop?");
    /* catchall */
    if(Number(shoptype<0)) {
        (str=C.literal("untended shop"));
    } else if(C.field((C.shtypes+Number(shoptype)*C.sizes["struct shclass"]),"shclass","annotation").value) {
        (str=C.field((C.shtypes+Number(shoptype)*C.sizes["struct shclass"]),"shclass","annotation").value);
    } else if(C.field((C.shtypes+Number(shoptype)*C.sizes["struct shclass"]),"shclass","name").value) {
        (str=C.field((C.shtypes+Number(shoptype)*C.sizes["struct shclass"]),"shclass","name").value);
    }
    return str;
}

/* if player knows about the mastermind tune, append it to Castle annotation;
   if drawbridge has been destroyed, flags.castletune will be zero */
export function tunesuffix(mptr,outbuf,bsz)
{
    mptr=C.ptr(mptr);
    outbuf=C.ptr(outbuf);
    bsz=C.u64(bsz);
    const stackFrame=C.stackSave();
    try {
    /* size of outbuf */
    (C.cell(outbuf,"char").value=C.i8(0));
    if(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","castletune").value)&&C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value)))) {
        let tmp=C.stackAlloc((1*256));
        if(Number(C.i32(C.field(C.field(C.u,"you","uevent").address,"u_event","uheard_tune").value)==2)) C.variadic(75,tmp,C.literal("notes \"%s\""),C.field(C.svt,"instance_globals_saved_t","tune").address);
 else C.strcpy(tmp,C.literal("5-note tune"));
        C.variadic(76,(C.literal("tunesuffix")),3473,outbuf,bsz,C.literal(" (play %s to open or close drawbridge)"),tmp);
    }
    return outbuf;
    } finally {C.stackRestore(stackFrame); }
}

/* some utility macros for print_mapseen */
/* three spaces */
/* empty; otherwise output becomes cluttered */
/*!0*/
/* K&R: don't require support for concatenation of adjacent string literals */
/* two TABs + empty BULLET: six spaces */
/* "iterate" once; safe to use as ``if (cond) ADDTOBUF(); else whatever;'' */
/* ADD2NTOBUF: for "M temples and N altars"; seen_string() is safe to use
   multiple times within one expression; so is plur() */
export function print_mapseen(win,mptr,final,how,printdun)
{
    win=C.i32(win);
    mptr=C.ptr(mptr);
    final=C.i32(final);
    how=C.i32(how);
    printdun=C.i8(printdun);
    const stackFrame=C.stackSave();
    try {
    /* -1: as menu; 0: not final;
                * 1: game over, alive; 2: game over, dead */
    /* cause of death; only used if final==2 and mptr->lev==u.uz */
    let buf=C.stackAlloc((1*256)); let tmpbuf=C.stackAlloc((1*256));
    let i; let depthstart; let dnum;
    let died_here=C.i8((Number(!!(Number(final==2)&&C.i32(on_level(C.field(C.u,"you","uz").address,C.field(mptr,"mapseen","lev").address))))));
    let any=C.stackAlloc(C.sizes["union any"]);
    /* Damnable special cases */
    /* The quest and knox should appear to be level 1 to match
     * other text.
     */
    (dnum=C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dnum").value));
    if(Number(!!(Number(dnum==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_quest_dnum").value)))||Number(dnum==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address,"d_level","dnum").value))))) (depthstart=1);
 else (depthstart=C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","depth_start").value);
    if(printdun) {
        if(Number(!!(Number(C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value)==C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value))||(Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))) C.variadic(77,buf,C.literal("%s:"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","dname").address);
 else if(builds_up(C.field(mptr,"mapseen","lev").address)) C.variadic(78,buf,C.literal("%s: levels %d up to %d"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","dname").address,C.i32((C.i32((depthstart+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","entry_lev").value)))-1)),C.i32((C.i32((depthstart+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value)))-1)));
 else C.variadic(79,buf,C.literal("%s: levels %d to %d"),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","dname").address,depthstart,C.i32((C.i32((depthstart+C.i32(C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(dnum)*C.sizes["struct dungeon"]),"dungeon","dunlev_ureached").value)))-1)));
        /* suppress the negative numbers in the endgame */
        C.add_menu_heading(win,buf);
    }
    /* calculate level number */
    (i=C.i32((C.i32((depthstart+C.i32(C.field(C.field(mptr,"mapseen","lev").address,"d_level","dlevel").value)))-1)));
    if((Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))) C.variadic(80,buf,C.literal("%s%s:"),((Number(final!=C.i32((-1))))?C.literal("   "):C.literal("")),endgamelevelname(tmpbuf,i));
 else C.variadic(81,buf,C.literal("%sLevel %d:"),((Number(final!=C.i32((-1))))?C.literal("   "):C.literal("")),i);
    /* wizmode prints out proto dungeon names for clarity */
    if(C.field(C.flags,"flag","debug").value) {
        let slev;
        if(Number(((slev=Is_special(C.field(mptr,"mapseen","lev").address)))!=0)) C.variadic(82,C.eos(buf),C.literal(" [%s]"),C.field(slev,"s_level","proto").address);
    }
    /* [perhaps print custom annotation on its own line when it's long] */
    if(C.field(mptr,"mapseen","custom").value) C.variadic(83,C.eos(buf),C.literal(" \"%s\""),C.field(mptr,"mapseen","custom").value);
    if(on_level(C.field(C.u,"you","uz").address,C.field(mptr,"mapseen","lev").address)) C.variadic(84,C.eos(buf),C.literal(" <- You %s here."),((Number(!!(Number(final<=0)||(Number(!!(Number(final==1)&&Number(how==C.ASCENDED)))))))?C.literal("are"):((Number(!!(Number(final==1)&&Number(how==C.ESCAPED))))?C.literal("left from"):C.literal("were"))));
    C.copy(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    if(Number(final==C.i32((-1)))) (C.field(any,"any","a_int").value=C.i32((C.i32(ledger_no(C.field(mptr,"mapseen","lev").address))+1)));
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,8,buf,0);
    if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","forgot").value) return;
    if((Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value)||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value)))||C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value))))) {
        (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
        (i=0);
        /* interest counter */
        /* List interests in an order vaguely corresponding to
         * how important they are.
         */
        if(Number(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value)>0)) {
            if(Number(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value)>1)) do {
                if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value) C.variadic(85,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value)),(C.literal("shop"))),(C.literal("shop")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nshop").value))==1))?C.literal(""):C.literal("s"))));
            } while(0);
 else C.variadic(86,C.eos(buf),C.literal("%s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),C.an(shop_string(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","shoptype").value))));
        }
        if(Number(!!(Number(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)>0)||Number(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value)>0)))) {
            let atmp;
            /* being aware of a temple doesn't guarantee being aware of its
               altar (via entrance message when entering while blinded, or
               possibly it being out of view in an irregularly shaped room);
               FIXME: if all temples present have been desecrated, we ought
               to say so */
            do {
                if(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value)&&C.i32(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)))) {
                    C.variadic(87,C.eos(buf),C.literal("%s%s %s%s and %s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value)),(C.literal("temple"))),(C.literal("temple")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value))==1))?C.literal(""):C.literal("s"))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)),(C.literal("altar"))),(C.literal("altar")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value))==1))?C.literal(""):C.literal("s"))));
                } else if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value) {
                    do {
                        if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value) C.variadic(88,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value)),(C.literal("temple"))),(C.literal("temple")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntemple").value))==1))?C.literal(""):C.literal("s"))));
                    } while(0);
                } else if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value) {
                    do {
                        if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value) C.variadic(89,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value)),(C.literal("altar"))),(C.literal("altar")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","naltar").value))==1))?C.literal(""):C.literal("s"))));
                    } while(0);
                }
            } while(0);
            /* only print out altar's god if they are all to your god */
            (atmp=C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","msalign").value);
            /*    0,  1,  2,  3 */
            (atmp=(((Number((atmp)==C.u32(3)))?C.u32(4):(atmp))));
            /*    0,  1,  2,  4 */
            if(Number(C.i32((C.i8((((Number((C.u32(((atmp)&C.u32(7))))==C.u32(0)))?(C.i32((-128))):((Number((C.u32(((atmp)&C.u32(7))))==C.u32(4)))?1:C.i32(((C.i32((C.u32(((atmp)&C.u32(7))))))-2))))))))==C.i32(C.field(C.field(C.u,"you","ualign").address,"align","type").value))) C.variadic(90,C.eos(buf),C.literal(" to %s"),C.align_gname(C.field(C.field(C.u,"you","ualign").address,"align","type").value));
            /* -128, -1,  0, +1 */
        }
        do {
            if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value) C.variadic(91,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value)),(C.literal("throne"))),(C.literal("throne")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nthrone").value))==1))?C.literal(""):C.literal("s"))));
        } while(0);
        do {
            if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value) C.variadic(92,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value)),(C.literal("fountain"))),(C.literal("fountain")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nfount").value))==1))?C.literal(""):C.literal("s"))));
        } while(0);
        do {
            if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value) C.variadic(93,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value)),(C.literal("sink"))),(C.literal("sink")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","nsink").value))==1))?C.literal(""):C.literal("s"))));
        } while(0);
        do {
            if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value) C.variadic(94,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value)),(C.literal("grave"))),(C.literal("grave")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ngrave").value))==1))?C.literal(""):C.literal("s"))));
        } while(0);
        do {
            if(C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value) C.variadic(95,C.eos(buf),C.literal("%s%s %s%s"),((Number(((i=C.i32((i+1)))-1)>0)?C.literal(", "):C.literal("      "))),seen_string(C.i16((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value)),(C.literal("tree"))),(C.literal("tree")),(((Number(C.i32((C.field(C.field(mptr,"mapseen","feat").address,"mapseen_feat","ntree").value))==1))?C.literal(""):C.literal("s"))));
        } while(0);
        /* capitalize afterwards */
        (i=C.i32(C.strlen(C.literal("      "))));
        (C.cell((buf+Number(i)*1),"char").value=C.highc(C.cell((buf+Number(i)*1),"char").value));
        /* capitalizing it makes it a sentence; terminate with '.' */
        C.strcat(buf,C.literal("."));
        C.add_menu_str(win,buf);
    }
    /* we assume that these are mutually exclusive */
    (C.cell(buf,"char").value=C.i8(0));
    if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","oracle").value) {
        C.variadic(96,buf,C.literal("%sOracle of Delphi."),C.literal("      "));
    } else if((Number(C.i32(C.field((C.field(mptr,"mapseen","lev").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))) {
        C.variadic(97,buf,C.literal("%s%s."),C.literal("      "),(C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","sokosolved").value)?C.literal("Solved"):C.literal("Unsolved")));
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","bigroom").value) {
        C.variadic(98,buf,C.literal("%sA very big room."),C.literal("      "));
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","roguelevel").value) {
        C.variadic(99,buf,C.literal("%sA primitive area."),C.literal("      "));
    } else if(on_level(C.field(mptr,"mapseen","lev").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qstart_level").address)) {
        C.variadic(100,buf,C.literal("%sHome%s."),C.literal("      "),(C.i32(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","notreachable").value)?C.literal(" (no way back...)"):C.literal("")));
        if(C.field(C.field(C.u,"you","uevent").address,"u_event","qcompleted").value) C.variadic(101,buf,C.literal("%sCompleted quest for %s."),C.literal("      "),C.ldrname());
 else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","questing").value) C.variadic(102,buf,C.literal("%sGiven quest by %s."),C.literal("      "),C.ldrname());
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","ludios").value) {
        /* presence of the ludios branch in #overview output indicates that
           the player has made it onto the level; presence of this annotation
           indicates that the fort's entrance has been seen (or mapped) */
        C.variadic(103,buf,C.literal("%sFort Ludios."),C.literal("      "));
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","castle").value) {
        C.variadic(104,(C.literal("print_mapseen")),3663,buf,BigInt((1*256)),C.literal("%sThe castle%s."),C.literal("      "),tunesuffix(mptr,tmpbuf,BigInt((1*256))));
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","valley").value) {
        C.variadic(105,buf,C.literal("%sValley of the Dead."),C.literal("      "));
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","vibrating_square").value) {
        C.variadic(106,buf,C.literal("%sGateway to Moloch's Sanctum."),C.literal("      "));
    } else if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","msanctum").value) {
        C.variadic(107,buf,C.literal("%sMoloch's Sanctum."),C.literal("      "));
    }
    if(C.cell(buf,"char").value) {
        C.add_menu_str(win,buf);
    }
    /* quest entrance is not mutually-exclusive with bigroom or rogue level */
    if(C.field(C.field(mptr,"mapseen","flags").address,"mapseen_flags","quest_summons").value) {
        C.variadic(108,buf,C.literal("%sSummoned by %s."),C.literal("      "),C.ldrname());
        C.add_menu_str(win,buf);
    }
    /* print out branches */
    if(C.field(mptr,"mapseen","br").value) {
        C.variadic(109,buf,C.literal("%s%s to %s"),C.literal("      "),br_string2(C.field(mptr,"mapseen","br").value),C.field((C.field(C.svd,"instance_globals_saved_d","dungeons").address+Number(C.field(C.field(C.field(mptr,"mapseen","br").value,"branch","end2").address,"d_level","dnum").value)*C.sizes["struct dungeon"]),"dungeon","dname").address);
        /* Since mapseen objects are printed out in increasing order
         * of dlevel, clarify which level this branch is going to
         * if the branch goes upwards.  Unless it's the end game.
         */
        if(Number(!!(C.i32(C.field(C.field(mptr,"mapseen","br").value,"branch","end1_up").value)&&Number(!((Number(C.i32(C.field((C.field(C.field(mptr,"mapseen","br").value,"branch","end2").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))))) C.variadic(110,C.eos(buf),C.literal(", level %d"),C.i32(depth(C.field(C.field(mptr,"mapseen","br").value,"branch","end2").address)));
        C.strcat(buf,C.literal("."));
        C.add_menu_str(win,buf);
    }
    /* maybe print out bones details */
    if(Number(!!(C.field(mptr,"mapseen","final_resting_place").value||Number(final>0)))) {
        let bp;
        let kncnt=(Number(!(died_here))?0:1);
        for((bp=C.field(mptr,"mapseen","final_resting_place").value);bp;(bp=C.field(bp,"cemetery","next").value)) if(Number(!!(Number(!!(C.i32(C.field(bp,"cemetery","bonesknown").value)||C.i32(C.field(C.flags,"flag","debug").value)))||Number(final>0)))) (kncnt=C.i32((kncnt+1)));

        if(kncnt) {
            C.variadic(111,buf,C.literal("%s%s"),C.literal("      "),C.literal("Final resting place for"));
            C.add_menu_str(win,buf);
            if(died_here) {
                /* disclosure occurs before bones creation, so listing dead
                   hero here doesn't give away whether bones are produced */
                C.formatkiller(tmpbuf,C.u32(BigInt((1*256))),how,(C.i8(1)));
                /* rephrase a few death reasons to work with "you" */
                C.strsubst(tmpbuf,C.literal(" himself"),C.literal(" yourself"));
                C.strsubst(tmpbuf,C.literal(" herself"),C.literal(" yourself"));
                C.strsubst(tmpbuf,C.literal(" his "),C.literal(" your "));
                C.strsubst(tmpbuf,C.literal(" her "),C.literal(" your "));
                C.variadic(112,(C.literal("print_mapseen")),3716,buf,BigInt((1*256)),C.literal("%s%syou, %s%c"),C.literal("      "),C.literal("   "),tmpbuf,((kncnt=C.i32((kncnt-1)))?44:46));
                C.add_menu_str(win,buf);
            }
            for((bp=C.field(mptr,"mapseen","final_resting_place").value);bp;(bp=C.field(bp,"cemetery","next").value)) {
                if(Number(!!(Number(!!(C.i32(C.field(bp,"cemetery","bonesknown").value)||C.i32(C.field(C.flags,"flag","debug").value)))||Number(final>0)))) {
                    C.variadic(113,buf,C.literal("%s%s%s, %s%c"),C.literal("      "),C.literal("   "),C.field(bp,"cemetery","who").address,C.field(bp,"cemetery","how").address,((kncnt=C.i32((kncnt-1)))?44:46));
                    C.add_menu_str(win,buf);
                }
            }
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

/* !SFCTOOL */
/*dungeon.c*/
export const dungeonStaticInitializers = C => [
    {name:"branch_id",type:"int",size:4,values:0},
    {name:"level_map",type:"struct level_map[27]",size:(C.sizes["struct level_map"]*27),values:[[C.literal("air"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address],[C.literal("asmodeus"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_asmodeus_level").address],[C.literal("astral"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address],[C.literal("baalz"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_baalzebub_level").address],[C.literal("bigrm"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_bigroom_level").address],[C.literal("castle"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_stronghold_level").address],[C.literal("earth"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address],[C.literal("fakewiz1"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_portal_level").address],[C.literal("fire"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_fire_level").address],[C.literal("juiblex"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_juiblex_level").address],[C.literal("knox"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address],[C.literal("medusa"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_medusa_level").address],[C.literal("oracle"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_oracle_level").address],[C.literal("orcus"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_orcus_level").address],[C.literal("rogue"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address],[C.literal("sanctum"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sanctum_level").address],[C.literal("valley"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_valley_level").address],[C.literal("water"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address],[C.literal("wizard1"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz1_level").address],[C.literal("wizard2"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz2_level").address],[C.literal("wizard3"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_wiz3_level").address],[C.literal("minend"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address],[C.literal("soko1"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address],[C.literal("x-strt"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qstart_level").address],[C.literal("x-loca"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_qlocate_level").address],[C.literal("x-goal"),C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_nemesis_level").address],[C.literal(""),0]]},
    {name:"flagstrs",type:"char *[6]",size:(8*6),values:[C.literal("town"),C.literal("hellish"),C.literal("mazelike"),C.literal("roguelike"),C.literal("unconnected"),0]},
    {name:"flagstrs2i",type:"int[6]",size:(4*6),values:[1,2,4,8,16,0]},
    {name:"dgnaligns",type:"char *[6]",size:(8*6),values:[C.literal("unaligned"),C.literal("noalign"),C.literal("lawful"),C.literal("neutral"),C.literal("chaotic"),0]},
    {name:"dgnaligns2i",type:"int[6]",size:(4*6),values:[0,0,(C.i32((4<<4))),(C.i32((2<<4))),(C.i32((1<<4))),0]},
    {name:"brdirstr",type:"char *[3]",size:(8*3),values:[C.literal("up"),C.literal("down"),0]},
    {name:"brdirstr2i",type:"int[3]",size:(4*3),values:[C.i32((C.i8(1))),C.i32((C.i8(0))),C.i32((C.i8(0)))]},
    {name:"brtypes",type:"char *[5]",size:(8*5),values:[C.literal("stair"),C.literal("portal"),C.literal("no_down"),C.literal("no_up"),0]},
    {name:"brtypes2i",type:"int[5]",size:(4*5),values:[0,3,2,1,0]},
];
