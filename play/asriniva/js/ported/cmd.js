import { C } from './c-runtime.js';
/* NetHack 5.0	cmd.c	$NHDT-Date: 1762680996 2025/11/09 01:36:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.755 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Robert Patrick Rankin, 2013. */
/* NetHack may be freely redistributed.  See license for details. */
/*
 * Some systems may have getchar() return EOF for various reasons, and
 * we should not quit before seeing at least NR_OF_EOFS consecutive EOFs.
 */
/* stuff commented out in extern.h, but needed here */
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/**/
/* DUMB */
export const timed_occ_fn=C=>0;
export const readchar_queue=C=>C.literal("");
/* for rejecting attempts to use wizard mode commands
 * Also used in wizcmds.c  */
export const unavailcmd=C=>C.literal("Unavailable command '%s'.");
/* for rejecting #if !SHELL, !SUSPEND */
export const cmdnotavail=C=>C.literal("'%s' command not available.");
/* the #prevmsg command */
export function doprev_message()
{
    C.callProc((C.field(C.windowprocs,"window_procs","win_doprev_message").value),"int (void)");
    return 0;
}

/* Count down by decrementing multi */
export function timed_occupation()
{
    C.callProc((C.cell(C.timed_occ_fn,"int (*)(void)").value),"int (void)");
    if(Number(C.field(C.gm,"instance_globals_m","multi").value>C.i64(0))) ((C.field(C.gm,"instance_globals_m","multi").value=C.i64((C.field(C.gm,"instance_globals_m","multi").value-1n)))+1n);
    return Number(C.field(C.gm,"instance_globals_m","multi").value>C.i64(0));
}

/* If you have moved since initially setting some occupations, they
 * now shouldn't be able to restart.
 *
 * The basic rule is that if you are carrying it, you can continue
 * since it is with you.  If you are acting on something at a distance,
 * your orientation to it must have changed when you moved.
 *
 * The exception to this is taking off items, since they can be taken
 * off in a number of ways in the intervening time, screwing up ordering.
 *
 *      Currently:      Take off all armor.
 *                      Picking Locks / Forcing Chests.
 *                      Setting traps.
 */
export function reset_occupations()
{
    C.reset_remarm();
    C.reset_pick();
    C.reset_trapset();
}

/* If a time is given, use it to timeout this function, otherwise the
 * function times out by its own means.
 */
export function set_occupation(fn,txt,xtime)
{
    xtime=C.i64(xtime);
    if(xtime) {
        (C.field(C.go,"instance_globals_o","occupation").value=C.functionPointer("timed_occupation"));
        (C.cell(C.timed_occ_fn,"int (*)(void)").value=fn);
    } else (C.field(C.go,"instance_globals_o","occupation").value=fn);
    (C.field(C.go,"instance_globals_o","occtxt").value=txt);
    (C.field(C.go,"instance_globals_o","occtime").value=0);
    return;
}

/*
void
cmdq_print(int q)
{
    char buf[QBUFSZ];
    struct _cmd_queue *cq = gc.command_queue[q];

    pline("CQ:%i", q);
    while (cq) {
        switch (cq->typ) {
        case CMDQ_KEY:
            pline("(key:%s)", key2txt(cq->key, buf));
            break;
        case CMDQ_EXTCMD:
            pline("(extcmd:#%s)", cq->ec_entry->ef_txt);
            break;
        case CMDQ_DIR:
            pline("(dir:%i,%i,%i)", cq->dirx, cq->diry, cq->dirz);
            break;
        case CMDQ_USER_INPUT:
            pline("(userinput)");
            break;
        case CMDQ_INT:
            pline("(int:%i)", cq->intval);
            break;
        default:
            pline("(ERROR:%i)",cq->typ);
            break;
        }
        cq = cq->next;
    }
}
*/
/* add extended command function to the command queue */
export function cmdq_add_ec(q,fn)
{
    q=C.i32(q);
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct _cmd_queue"])));
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    (C.field(tmp,"_cmd_queue","typ").value=C.CMDQ_EXTCMD);
    (C.field(tmp,"_cmd_queue","ec_entry").value=ext_func_tab_from_func(fn));
    (C.field(tmp,"_cmd_queue","next").value=0);
    while(Number(!!(cq&&C.field(cq,"_cmd_queue","next").value))) (cq=C.field(cq,"_cmd_queue","next").value);

    if(cq) (C.field(cq,"_cmd_queue","next").value=tmp);
 else (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=tmp);
}

/* add a key to the command queue */
export function cmdq_add_key(q,key)
{
    q=C.i32(q);
    key=C.i8(key);
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct _cmd_queue"])));
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    (C.field(tmp,"_cmd_queue","typ").value=C.CMDQ_KEY);
    (C.field(tmp,"_cmd_queue","key").value=key);
    (C.field(tmp,"_cmd_queue","next").value=0);
    while(Number(!!(cq&&C.field(cq,"_cmd_queue","next").value))) (cq=C.field(cq,"_cmd_queue","next").value);

    if(cq) (C.field(cq,"_cmd_queue","next").value=tmp);
 else (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=tmp);
}

/* add a direction to the command queue */
export function cmdq_add_dir(q,dx,dy,dz)
{
    q=C.i32(q);
    dx=C.i8(dx);
    dy=C.i8(dy);
    dz=C.i8(dz);
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct _cmd_queue"])));
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    (C.field(tmp,"_cmd_queue","typ").value=C.CMDQ_DIR);
    (C.field(tmp,"_cmd_queue","dirx").value=dx);
    (C.field(tmp,"_cmd_queue","diry").value=dy);
    (C.field(tmp,"_cmd_queue","dirz").value=dz);
    (C.field(tmp,"_cmd_queue","next").value=0);
    while(Number(!!(cq&&C.field(cq,"_cmd_queue","next").value))) (cq=C.field(cq,"_cmd_queue","next").value);

    if(cq) (C.field(cq,"_cmd_queue","next").value=tmp);
 else (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=tmp);
}

/* add placeholder to the command queue, allows user input there */
export function cmdq_add_userinput(q)
{
    q=C.i32(q);
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct _cmd_queue"])));
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    (C.field(tmp,"_cmd_queue","typ").value=C.CMDQ_USER_INPUT);
    (C.field(tmp,"_cmd_queue","next").value=0);
    while(Number(!!(cq&&C.field(cq,"_cmd_queue","next").value))) (cq=C.field(cq,"_cmd_queue","next").value);

    if(cq) (C.field(cq,"_cmd_queue","next").value=tmp);
 else (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=tmp);
}

/* add integer to the command queue */
export function cmdq_add_int(q,val)
{
    q=C.i32(q);
    val=C.i32(val);
    let tmp=C.alloc(C.u32(BigInt(C.sizes["struct _cmd_queue"])));
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    (C.field(tmp,"_cmd_queue","typ").value=C.CMDQ_INT);
    (C.field(tmp,"_cmd_queue","intval").value=val);
    (C.field(tmp,"_cmd_queue","next").value=0);
    while(Number(!!(cq&&C.field(cq,"_cmd_queue","next").value))) (cq=C.field(cq,"_cmd_queue","next").value);

    if(cq) (C.field(cq,"_cmd_queue","next").value=tmp);
 else (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=tmp);
}

/* shift the last entry in command queue to first */
export function cmdq_shift(q)
{
    q=C.i32(q);
    let tmp=0;
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    while(Number(!!(Number(!!(cq&&C.field(cq,"_cmd_queue","next").value))&&C.field(C.field(cq,"_cmd_queue","next").value,"_cmd_queue","next").value))) (cq=C.field(cq,"_cmd_queue","next").value);

    if(cq) (tmp=C.field(cq,"_cmd_queue","next").value);
    if(tmp) {
        (C.field(tmp,"_cmd_queue","next").value=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value);
        (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=tmp);
        (C.field(cq,"_cmd_queue","next").value=0);
    }
}

export function cmdq_reverse(head)
{
    let prev=0; let curr=head; let next;
    while(curr) {
        (next=C.field(curr,"_cmd_queue","next").value);
        (C.field(curr,"_cmd_queue","next").value=prev);
        (prev=curr);
        (curr=next);
    }
    return prev;
}

export function cmdq_copy(q)
{
    q=C.i32(q);
    let tmp=0;
    let cq=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    while(cq) {
        let tmp2=C.alloc(C.u32(BigInt(C.sizes["struct _cmd_queue"])));
        C.copyRecord(tmp2,cq,C.sizes["struct _cmd_queue"]);
        (C.field(tmp2,"_cmd_queue","next").value=tmp);
        (tmp=tmp2);
        (cq=C.field(cq,"_cmd_queue","next").value);
    }
    (tmp=cmdq_reverse(tmp));
    return tmp;
}

/* pop off the topmost command from the command queue.
 * caller is responsible for freeing the returned _cmd_queue.
 */
export function cmdq_pop()
{
    let q=((C.field(C.gi,"instance_globals_i","in_doagain").value)?C.CQ_REPEAT:C.CQ_CANNED);
    let tmp=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    if(tmp) {
        (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=C.field(tmp,"_cmd_queue","next").value);
        (C.field(tmp,"_cmd_queue","next").value=0);
    }
    return tmp;
}

/* get the top entry without popping it */
export function cmdq_peek(q)
{
    q=C.i32(q);
    return C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
}

/* clear all commands from the command queue */
export function cmdq_clear(q)
{
    q=C.i32(q);
    let tmp=C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value;
    let tmp2;
    while(tmp) {
        (tmp2=C.field(tmp,"_cmd_queue","next").value);
        C.free(tmp);
        (tmp=tmp2);
    }
    (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(q)*8),"struct _cmd_queue *").value=0);
}

export function pgetchar()
{
    /* courtesy of aeb@cwi.nl */
    let ch=0;
    if(C.field(C.iflags,"instance_flags","debug_fuzzer").value) return randomkey();
    (ch=C.callProc((C.field(C.windowprocs,"window_procs","win_nhgetch").value),"int (void)"));
    return C.i8(ch);
}

/* '#' or whatever has been bound to doextcmd() in its place */
export function extcmd_initiator()
{
    return C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","extcmd_char").value;
}

export function can_do_extcmd(extcmd)
{
    let ecflags=C.i32(C.field(extcmd,"ext_func_tab","flags").value);
    if(Number(!!(C.field(C.gl,"instance_globals_l","luacore").value&&C.cell((C.nhcb_counts+Number(C.NHCB_CMD_BEFORE)*4),"int").value))) {
        C.lua_getglobal(C.field(C.gl,"instance_globals_l","luacore").value,C.literal("nh_callback_run"));
        C.lua_pushstring(C.field(C.gl,"instance_globals_l","luacore").value,C.cell((C.nhcb_name+Number(C.NHCB_CMD_BEFORE)*8),"char *").value);
        C.lua_pushstring(C.field(C.gl,"instance_globals_l","luacore").value,C.field(extcmd,"ext_func_tab","ef_txt").value);
        C.nhl_pcall_handle(C.field(C.gl,"instance_globals_l","luacore").value,2,1,C.literal("can_do_extcmd"),C.i32(C.NHLpa_panic));
        if(Number(!(C.lua_toboolean(C.field(C.gl,"instance_globals_l","luacore").value,C.i32((-1)))))) {
            C.lua_settop(C.field(C.gl,"instance_globals_l","luacore").value,0);
            return (C.i8(0));
        }
        C.lua_settop(C.field(C.gl,"instance_globals_l","luacore").value,0);
    }
    if(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))&&(C.i32((ecflags&4)))))) {
        C.variadic(0,C.unavailcmd,C.field(extcmd,"ext_func_tab","ef_txt").value);
        return (C.i8(0));
    } else if(Number(!!(C.i32(C.field(C.u,"you","uburied").value)&&Number(!((C.i32((ecflags&1)))))))) {
        C.variadic(1,C.literal("do that while you are buried!"));
        return (C.i8(0));
    } else if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value)&&(C.i32((ecflags&32)))))) {
        return (C.i8(0));
    }
    return (C.i8(1));
}

/* here after # - now read a full-word command */
export function doextcmd()
{
    let idx; let retval;
    let func;
    /* keep repeating until we don't run help or quit */
    do {
        (idx=C.callProc((C.field(C.windowprocs,"window_procs","win_get_ext_cmd").value),"int (void)"));
        if(Number(idx<0)) return 0;
        /* quit */
        (func=C.field((C.extcmdlist+Number(idx)*C.sizes["struct ext_func_tab"]),"ext_func_tab","ef_funct").value);
        if(Number(!(can_do_extcmd((C.extcmdlist+Number(idx)*C.sizes["struct ext_func_tab"]))))) return 0;
        if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","menu_requested").value)&&Number(!(accept_menu_prefix((C.extcmdlist+Number(idx)*C.sizes["struct ext_func_tab"]))))))) {
            C.variadic(2,C.literal("'%s' prefix has no effect for the %s command."),C.visctrl(cmd_from_func(C.functionPointer("do_reqmenu"))),C.field((C.extcmdlist+Number(idx)*C.sizes["struct ext_func_tab"]),"ext_func_tab","ef_txt").value);
            (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
        }
        /* tell rhack() what command is actually executing */
        (C.field(C.ge,"instance_globals_e","ext_tlist").value=(C.extcmdlist+Number(idx)*C.sizes["struct ext_func_tab"]));
        (retval=C.callProc((func),"int (void)"));
    } while(Number(func==C.functionPointer("doextlist")));
    return retval;
}

/* format extended command flags for display */
export function doc_extcmd_flagstr(menuwin,efp)
{
    menuwin=C.i32(menuwin);
    const stackFrame=C.stackSave();
    try {
    /* if Null, add a footnote to the menu */
    const Abuf=C.staticData("doc_extcmd_flagstr","Abuf",()=>null);
    /* 5 would suffice: {'[','m','A',']','\0'} */
    /* note: tag shown for menu prefix is 'm' even if m-prefix action
       has been bound to some other key */
    if(Number(!(efp))) {
        let qbuf=C.stackAlloc((1*128));
        C.add_menu_str(menuwin,C.literal("[A] Command autocompletes"));
        C.variadic(3,qbuf,C.literal("[m] Command accepts '%s' prefix"),C.visctrl(cmd_from_func(C.functionPointer("do_reqmenu"))));
        C.add_menu_str(menuwin,qbuf);
        return 0;
    } else {
        let mprefix=accept_menu_prefix(efp); let autocomplete=C.i8(Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(2))))!=C.u32(0)));
        let p=Abuf;
        /* "" or "[m]" or "[A]" or "[mA]" */
        if(Number(!!(C.i32(mprefix)||C.i32(autocomplete)))) {
            (C.cell(((p=C.ptr((p+Number(1))))-Number(1)),"char").value=C.i8(91));
            if(mprefix) (C.cell(((p=C.ptr((p+Number(1))))-Number(1)),"char").value=C.i8(109));
            if(autocomplete) (C.cell(((p=C.ptr((p+Number(1))))-Number(1)),"char").value=C.i8(65));
            (C.cell(((p=C.ptr((p+Number(1))))-Number(1)),"char").value=C.i8(93));
        }
        (C.cell(p,"char").value=C.i8(0));
        return Abuf;
    }
    } finally {C.stackRestore(stackFrame); }
}

/* here after #? - now list all full-word commands and provide
   some navigation capability through the long list */
export function doextlist()
{
    const stackFrame=C.stackSave();
    try {
    let efp=0;
    let buf=C.stackAlloc((1*256)); let searchbuf=C.stackAlloc((1*256)); let descbuf=C.stackAlloc((1*256)); let promptbuf=C.stackAlloc((1*128));
    let cmd_desc;
    let menuwin;
    let any=C.stackAlloc(C.sizes["union any"]);
    let selectedAddress=C.stackAlloc(8);
    let n; let pass;
    let menumode=0; let menushown=C.stackAlloc((4*2)); let onelist=0;
    let redisplay=(C.i8(1)); let search=(C.i8(0));
    const headings=C.staticData("doextlist","headings",()=>[C.literal("Extended commands"),C.literal("Debugging Extended Commands")]);
    let clr=8;
    (C.cell((searchbuf+Number(0)*1),"char").value=C.i8(0));
    (menuwin=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
    while(redisplay) {
        (redisplay=(C.i8(0)));
        C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",menuwin,C.u64(0));
        C.add_menu_str(menuwin,C.literal("Extended Commands List"));
        C.add_menu_str(menuwin,C.literal(""));
        C.variadic(4,buf,C.literal("Switch to %s commands that don't autocomplete"),(menumode?C.literal("including"):C.literal("excluding")));
        (C.field(any,"any","a_int").value=1);
        C.add_menu(menuwin,C.nul_glyphinfo,any,C.i8(97),C.i8(0),0,clr,buf,0);
        if(Number(!(C.cell(searchbuf,"char").value))) {
            (C.field(any,"any","a_int").value=2);
            /* was 's', but then using ':' handling within the interface
               would only examine the two or three meta entries, not the
               actual list of extended commands shown via separator lines;
               having ':' as an explicit selector overrides the default
               menu behavior for it; we retain 's' as a group accelerator */
            C.add_menu(menuwin,C.nul_glyphinfo,any,C.i8(58),C.i8(115),0,clr,C.literal("Search extended commands"),0);
        } else {
            C.strcpy(buf,C.literal("Switch back from search"));
            if(Number(C.u64((C.u64((C.strlen(buf)+C.strlen(searchbuf)))+C.strlen(C.literal(" (\"\")"))))<C.u64(128))) C.variadic(5,C.eos(buf),C.literal(" (\"%s\")"),searchbuf);
            (C.field(any,"any","a_int").value=3);
            /* specifying ':' as a group accelerator here is mostly a
               statement of intent (we'd like to accept it as a synonym but
               also want to hide it from general menu use) because it won't
               work for interfaces which support ':' to search; use as a
               general menu command takes precedence over group accelerator */
            C.add_menu(menuwin,C.nul_glyphinfo,any,C.i8(115),C.i8(58),0,clr,buf,0);
        }
        if(C.field(C.flags,"flag","debug").value) {
            (C.field(any,"any","a_int").value=4);
            C.add_menu(menuwin,C.nul_glyphinfo,any,C.i8(122),C.i8(0),0,clr,(onelist?C.literal("Switch to showing debugging commands in separate section"):C.literal("Switch to showing all alphabetically, including debugging commands")),0);
        }
        C.add_menu_str(menuwin,C.literal(""));
        (C.cell((menushown+Number(0)*4),"int").value=(C.cell((menushown+Number(1)*4),"int").value=0));
        (n=0);
        for((pass=0);Number(pass<=1);(pass=C.i32((pass+1)))) {
            /* skip second pass if not in wizard mode or wizard mode
               commands are being integrated into a single list */
            if(Number(!!(Number(pass==1)&&(Number(!!(onelist||Number(!(C.field(C.flags,"flag","debug").value)))))))) break;
            for((efp=C.extcmdlist);C.field(efp,"ext_func_tab","ef_txt").value;((efp=C.ptr((efp+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) {
                let wizc;
                if(Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32((C.i32((16|64)))))))!=C.u32(0))) continue;
                /* if hiding non-autocomplete commands, skip such */
                if(Number(!!(Number(menumode==1)&&Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(2))))==C.u32(0))))) continue;
                /* skip wizard mode commands if not in wizard mode;
                   when showing two sections, skip wizard mode commands
                   in pass==0 and skip other commands in pass==1 */
                (wizc=Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(4))))!=C.u32(0)));
                if(Number(!!(wizc&&Number(!(C.field(C.flags,"flag","debug").value))))) continue;
                if(Number(!!(Number(!(onelist))&&Number(pass!=wizc)))) continue;
                /* command description might get modified on the fly */
                (cmd_desc=C.field(efp,"ext_func_tab","ef_desc").value);
                /* suppress part of the description for #genocided if it
                   doesn't apply during the current game */
                if(Number(!!(Number(!!(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))&&Number(!(C.field(C.flags,"flag","explore").value))))&&Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(8))))!=C.u32(0))))&&C.strstri(cmd_desc,C.literal("extinct"))))) (cmd_desc=C.strsubst(C.strcpy(descbuf,cmd_desc),C.literal(" been genocided or become extinct"),C.literal(" been genocided")));
                /* minor optimization */
                /* if searching, skip this command if it doesn't match */
                if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.cell(searchbuf,"char").value)&&Number(!(C.strstri(C.field(efp,"ext_func_tab","ef_txt").value,searchbuf)))))&&Number(!(C.strstri(cmd_desc,searchbuf)))))&&Number(!(C.pmatchi(searchbuf,C.field(efp,"ext_func_tab","ef_txt").value)))))&&Number(!(C.pmatchi(searchbuf,cmd_desc)))))) continue;
                /* first try case-insensitive substring match */
                /* wildcard support; most interfaces use case-insensitive
                       pmatch rather than regexp for menu searching */
                /* We're about to show an item, have we shown the menu yet?
                   Doing menu in inner loop like this on demand avoids a
                   heading with no subordinate entries on the search
                   results menu. */
                if(Number(!(C.cell((menushown+Number(pass)*4),"int").value))) {
                    C.strcpy(buf,C.cell((headings+Number(pass)*8),"char *").value);
                    C.add_menu_heading(menuwin,buf);
                    (C.cell((menushown+Number(pass)*4),"int").value=1);
                }
                /* longest ef_txt at present is "wizrumorcheck" (13 chars);
                   2nd field will be "    " or " [A]" or " [m]" or "[mA]" */
                C.variadic(6,buf,C.literal(" %-14s %4s %s"),C.field(efp,"ext_func_tab","ef_txt").value,doc_extcmd_flagstr(menuwin,efp),cmd_desc);
                C.add_menu_str(menuwin,buf);
                (n=C.i32((n+1)));
            }
            if(n) C.add_menu_str(menuwin,C.literal(""));
        }
        if(Number(!!(C.i32(C.cell(searchbuf,"char").value)&&Number(!(n))))) C.add_menu_str(menuwin,C.literal("no matches"));
 else doc_extcmd_flagstr(menuwin,0);
        C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",menuwin,0);
        (n=C.select_menu(menuwin,1,selectedAddress));
        if(Number(n>0)) {
            switch(C.field(C.field((C.cell(selectedAddress,"struct mi *").value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value) {
                case (1):
                    /* 'a': toggle show/hide non-autocomplete */
                    (menumode=C.i32((1-menumode)));
                /* toggle 0 -> 1, 1 -> 0 */
                (redisplay=(C.i8(1)));
                break;
                case (2):
                    /* ':' when not searching yet: enable search */
                    (search=(C.i8(1)));
                break;
                case (3):
                    /* 's' when already searching: disable search */
                    (search=(C.i8(0)));
                (C.cell((searchbuf+Number(0)*1),"char").value=C.i8(0));
                (redisplay=(C.i8(1)));
                break;
                case (4):
                    /* 'z': toggle showing wizard mode commands separately */
                    (search=(C.i8(0)));
                (C.cell((searchbuf+Number(0)*1),"char").value=C.i8(0));
                (onelist=C.i32((1-onelist)));
                /* toggle 0 -> 1, 1 -> 0 */
                (redisplay=(C.i8(1)));
                break;
            }
            C.free(C.cell(selectedAddress,"struct mi *").value);
        } else {
            (search=(C.i8(0)));
            (C.cell((searchbuf+Number(0)*1),"char").value=C.i8(0));
        }
        if(search) {
            C.strcpy(promptbuf,C.literal("Extended command list search phrase"));
            C.strcat(promptbuf,C.literal("?"));
            C.getlin(promptbuf,searchbuf);
            C.mungspaces(searchbuf);
            if(Number(C.i32(C.cell((searchbuf+Number(0)*1),"char").value)==27)) (C.cell((searchbuf+Number(0)*1),"char").value=C.i8(0));
            if(C.cell(searchbuf,"char").value) (redisplay=(C.i8(1)));
            (search=(C.i8(0)));
        }
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",menuwin);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* Change if we ever have more ext cmds */
/*
 * This is currently used only by the tty interface and is
 * controlled via runtime option 'extmenu'.  (Most other interfaces
 * already use a menu all the time for extended commands.)
 *
 * ``# ?'' is counted towards the limit of the number of commands,
 * so we actually support MAX_EXT_CMD-1 "real" extended commands.
 *
 * Here after # - now show pick-list of possible commands.
 */
export function extcmd_via_menu()
{
    const stackFrame=C.stackSave();
    try {
    let efp;
    let pick_listAddress=C.stackAlloc(8); C.cell(pick_listAddress,"struct mi *").value=0;
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let choices=C.stackAlloc((8*201));
    let buf=C.stackAlloc((1*256));
    let cbuf=C.stackAlloc((1*128)); let prompt=C.stackAlloc((1*128)); let fmtstr=C.stackAlloc((1*20));
    let i; let n; let nchoices; let acount;
    let ret; let len; let biggest;
    let accelerator; let prevaccelerator;
    let matchlevel=0;
    let wastoolong; let one_per_line;
    let clr=8;
    (ret=0);
    (C.cell((cbuf+Number(0)*1),"char").value=C.i8(0));
    (biggest=0);
    while(Number(!(ret))) {
        (i=(n=0));
        C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        /* populate choices */
        for((efp=C.extcmdlist);C.field(efp,"ext_func_tab","ef_txt").value;((efp=C.ptr((efp+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) {
            if(Number(!!(Number(!!((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32((C.i32((16|64)))))))||Number(!((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(2))))))))||(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))&&(C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(4)))))))))) continue;
            if(Number(!!(Number(!(matchlevel))||Number(!(C.strncmp(C.field(efp,"ext_func_tab","ef_txt").value,cbuf,C.u64(matchlevel))))))) {
                (C.cell((choices+Number(i)*8),"struct ext_func_tab *").value=efp);
                if(Number(((len=C.i32(C.strlen(C.field(efp,"ext_func_tab","ef_desc").value))))>biggest)) (biggest=len);
                if(Number((i=C.i32((i+1)))>200)) {
                    /* NH_DEVEL_STATUS != NH_STATUS_RELEASED */
                    (C.field(C.iflags,"instance_flags","extmenu").value=(C.i8(0)));
                    return C.i32((-1));
                }
            }
        }
        (C.cell((choices+Number(i)*8),"struct ext_func_tab *").value=0);
        (nchoices=i);
        /* if we're down to one, we have our selection so get out of here */
        if(Number(nchoices<=1)) {
            (ret=((Number(nchoices==1))?C.i32((C.i64(((C.cell((choices+Number(0)*8),"struct ext_func_tab *").value-C.extcmdlist)/C.sizes["struct ext_func_tab"])))):C.i32((-1))));
            break;
        }
        /* otherwise... */
        (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
        C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",win,C.u64(0));
        C.variadic(7,fmtstr,C.literal("%%-%ds"),C.i32((biggest+15)));
        (C.cell((prompt+Number(0)*1),"char").value=C.i8(0));
        (wastoolong=(C.i8(0)));
        /* True => had to wrap due to line width
                             * ('w' in wizard mode) */
        /* -3: two line menu header, 1 line menu footer (for prompt) */
        (one_per_line=C.i8((Number(nchoices<C.i32((21-3))))));
        (prevaccelerator=0);
        (acount=0);
        for((i=0);C.cell((choices+Number(i)*8),"struct ext_func_tab *").value;(i=C.i32((i+1)))) {
            (accelerator=C.i32(C.cell((C.field(C.cell((choices+Number(i)*8),"struct ext_func_tab *").value,"ext_func_tab","ef_txt").value+Number(matchlevel)*1),"char").value));
            if(Number(!!(Number(accelerator!=prevaccelerator)||C.i32(one_per_line)))) (wastoolong=(C.i8(0)));
            if(Number(!!(Number(!!(Number(accelerator!=prevaccelerator)||C.i32(one_per_line)))||(Number(!!(Number(acount>=2)&&(Number(C.u64((C.u64((C.strlen(prompt)+C.u64(4)))+C.strlen(C.field(C.cell((choices+Number(i)*8),"struct ext_func_tab *").value,"ext_func_tab","ef_txt").value)))>=((Number((BigInt((1*128)))<C.u64((C.i32((80-6)))))?(BigInt((1*128))):C.u64((C.i32((80-6)))))))))))))) {
                /* +4: + sizeof " or " - sizeof "" */
                /* -6: enough room for 1 space left margin
                         *   + "%c - " menu selector + 1 space right margin */
                if(acount) {
                    /* flush extended cmds for that letter already in buf */
                    C.variadic(8,buf,fmtstr,prompt);
                    (C.field(any,"any","a_char").value=C.i8(prevaccelerator));
                    C.add_menu(win,C.nul_glyphinfo,any,C.field(any,"any","a_char").value,C.i8(0),0,clr,buf,0);
                    (acount=0);
                    if(Number(!((Number(!!(Number(accelerator!=prevaccelerator)||C.i32(one_per_line))))))) (wastoolong=(C.i8(1)));
                }
            }
            (prevaccelerator=accelerator);
            if(Number(!!(Number(!(acount))||C.i32(one_per_line)))) {
                C.variadic(9,prompt,C.literal("%s%s [%s]"),(C.i32(wastoolong)?C.literal("or "):C.literal("")),C.field(C.cell((choices+Number(i)*8),"struct ext_func_tab *").value,"ext_func_tab","ef_txt").value,C.field(C.cell((choices+Number(i)*8),"struct ext_func_tab *").value,"ext_func_tab","ef_desc").value);
            } else if(Number(acount==1)) {
                C.variadic(10,prompt,C.literal("%s%s or %s"),(C.i32(wastoolong)?C.literal("or "):C.literal("")),C.field(C.cell((choices+Number(C.i32((i-1)))*8),"struct ext_func_tab *").value,"ext_func_tab","ef_txt").value,C.field(C.cell((choices+Number(i)*8),"struct ext_func_tab *").value,"ext_func_tab","ef_txt").value);
            } else {
                C.strcat(prompt,C.literal(" or "));
                C.strcat(prompt,C.field(C.cell((choices+Number(i)*8),"struct ext_func_tab *").value,"ext_func_tab","ef_txt").value);
            }
            (acount=C.i32((acount+1)));
        }
        if(acount) {
            /* flush buf */
            C.variadic(11,buf,fmtstr,prompt);
            (C.field(any,"any","a_char").value=C.i8(prevaccelerator));
            C.add_menu(win,C.nul_glyphinfo,any,C.field(any,"any","a_char").value,C.i8(0),0,clr,buf,0);
        }
        C.variadic(12,(C.literal("extcmd_via_menu")),856,prompt,BigInt((1*128)),C.literal("Extended Command: %s"),cbuf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",win,prompt);
        (n=C.select_menu(win,1,pick_listAddress));
        C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
        if(Number(n==1)) {
            if(Number(matchlevel>(C.i32((128-2))))) {
                C.free(C.cell(pick_listAddress,"struct mi *").value);
                (ret=C.i32((-1)));
            } else {
                (C.cell((cbuf+Number(((matchlevel=C.i32((matchlevel+1)))-1))*1),"char").value=C.field(C.field((C.cell(pick_listAddress,"struct mi *").value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
                (C.cell((cbuf+Number(matchlevel)*1),"char").value=C.i8(0));
                C.free(C.cell(pick_listAddress,"struct mi *").value);
            }
        } else {
            if(matchlevel) {
                (ret=0);
                (matchlevel=0);
            } else (ret=C.i32((-1)));
        }
    }
    return ret;
    } finally {C.stackRestore(stackFrame); }
}

/* TTY_GRAPHICS */
/* #monster command - use special monster ability while polymorphed */
export function domonability()
{
    let uptr=C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value;
    let might_hide=C.i8((Number(!!((Number((C.u64((C.field((uptr),"permonst","mflags1").value&C.u64(256n))))!=C.u64(0n)))||(Number((C.u64((C.field((uptr),"permonst","mflags1").value&C.u64(128n))))!=C.u64(0n)))))));
    let c=C.i8(0);
    if(Number(!!(C.i32(might_hide)&&(Number(!!(Number((uptr)==(C.mons+Number(C.PM_CAVE_SPIDER)*C.sizes["struct permonst"]))||Number((uptr)==(C.mons+Number(C.PM_GIANT_SPIDER)*C.sizes["struct permonst"])))))))) {
        (c=yn_function(C.literal("Hide [h] or spin a web [s]?"),C.hidespinchars,C.i8(113),(C.i8(1))));
        if(Number(!!(Number(C.i32(c)==113)||Number(C.i32(c)==27)))) return 0;
    }
    if(C.attacktype(uptr,12)) return C.dobreathe();
 else if(C.attacktype(uptr,10)) return C.dospit();
 else if(Number(C.i32(C.field(uptr,"permonst","mlet").value)==C.S_NYMPH)) return C.doremove();
 else if(C.attacktype(uptr,15)) return C.dogaze();
 else if((Number((C.u64((C.field((uptr),"permonst","mflags2").value&C.u64(4n))))!=C.u64(0n)))) return C.dosummon();
 else if((C.i32(c)?Number(C.i32(c)==104):C.i32(might_hide))) return C.dohide();
 else if((C.i32(c)?Number(C.i32(c)==115):(Number(!!(Number((uptr)==(C.mons+Number(C.PM_CAVE_SPIDER)*C.sizes["struct permonst"]))||Number((uptr)==(C.mons+Number(C.PM_GIANT_SPIDER)*C.sizes["struct permonst"]))))))) return C.dospinweb();
 else if((Number(!!(Number((uptr)==(C.mons+Number(C.PM_MIND_FLAYER)*C.sizes["struct permonst"]))||Number((uptr)==(C.mons+Number(C.PM_MASTER_MIND_FLAYER)*C.sizes["struct permonst"])))))) return C.domindblast();
 else if(Number(C.field(C.u,"you","umonnum").value==C.PM_GREMLIN)) {
        if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.FOUNTAIN))) {
            if(C.split_mon(C.field(C.gy,"instance_globals_y","youmonst").address,0)) C.dryup(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(C.i8(1)));
        } else if(C.is_pool(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)) {
            /* is_pool: might be wearing water walking boots or amulet of
               magical breathing */
            C.split_mon(C.field(C.gy,"instance_globals_y","youmonst").address,0);
        } else {
            C.variadic(13,C.literal("is no fountain here."));
        }
    } else if((Number(!!(Number(C.i32(C.field((uptr),"permonst","mlet").value)==C.S_UNICORN)&&(Number((C.u64((C.field((uptr),"permonst","mflags2").value&C.u64(536870912n))))!=C.u64(0n))))))) {
        C.use_unicorn_horn(0);
        return 1;
    } else if(Number(C.i32(C.field(uptr,"permonst","msound").value)==C.MS_SHRIEK)) {
        C.variadic(14,C.literal("shriek."));
        if(C.field(C.u,"you","uburied").value) C.variadic(15,C.literal("Unfortunately sound does not carry well through rock."));
 else C.aggravate();
    } else if(Number(!!((Number(C.i32(C.field((uptr),"permonst","mlet").value)==C.S_VAMPIRE))||(Number(!!(Number(!!(Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((C.field(C.gy,"instance_globals_y","youmonst").address),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))))) {
        return C.dopoly();
    } else if(Number(!!(C.field(C.u,"you","usteed").value&&C.i32(C.attacktype(C.field(C.field(C.u,"you","usteed").value,"monst","data").value,12))))) {
        C.pet_ranged_attk(C.field(C.u,"you","usteed").value,(C.i8(1)));
        return 1;
    } else if((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))) {
        C.variadic(16,C.literal("Any special ability you may have is purely reflexive."));
    } else {
        C.variadic(17,C.literal("don't have a special ability in your normal form!"));
    }
    return 0;
}

export function enter_explore_mode()
{
    if(C.field(C.flags,"flag","explore").value) {
        C.variadic(18,C.literal("are already in explore mode."));
    } else {
        let oldmode=(Number(!(C.field(C.flags,"flag","debug").value))?C.literal("normal game"):C.literal("debug mode"));
        if(Number(!(C.authorize_explore_mode()))) {
            if(Number(!(C.field(C.flags,"flag","debug").value))) {
                C.variadic(19,C.literal("cannot access explore mode."));
                return 0;
            } else {
                C.variadic(20,C.literal("Note: normally you wouldn't be allowed into explore mode."));
                /* keep going */
            }
        }
        C.variadic(21,C.literal("Beware!  From explore mode there will be no return to %s,"),oldmode);
        if(paranoid_query(C.i8((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(2))))!=C.u32(0)))),C.literal("Do you want to enter explore mode?"))) {
            (C.field(C.flags,"flag","explore").value=(C.i8(1)));
            (C.field(C.flags,"flag","debug").value=(C.i8(0)));
            C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
            C.variadic(22,C.literal("are now in non-scoring explore mode."));
        } else {
            C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
            C.variadic(23,C.literal("Continuing with %s."),oldmode);
        }
    }
    return 0;
}

export function makemap_prepost(pre,wiztower)
{
    pre=C.i8(pre);
    wiztower=C.i8(wiztower);
    let tmpnhfp;
    let mtmp;
    if(pre) {
        C.makemap_remove_mons();
        C.rm_mapseen(C.i32(C.ledger_no(C.field(C.u,"you","uz").address)));
        /* discard overview info for level */
{
            const Unachieve=C.staticData("makemap_prepost","Unachieve",()=>C.literal("%s achievement revoked."));
            /* achievement tracking; if replacing a level that has a
               special prize, lose credit for previously finding it and
               reset for the new instance of that prize */
            if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_mineend_level").address))))))) {
                if(C.remove_achievement(C.i8(C.ACH_MINE_PRIZE))) C.variadic(24,Unachieve,C.literal("Mine's-end"));
                (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_oid").value=C.u32(0));
            } else if(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoend_level").address))))))) {
                if(C.remove_achievement(C.i8(C.ACH_SOKO_PRIZE))) C.variadic(25,Unachieve,C.literal("Soko-prize"));
                (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_oid").value=C.u32(0));
            }
        }        if((Number(C.global("uball").value!=0))) {
            C.ballrelease((C.i8(0)));
            C.unplacebc();
        }
        /* reset lock picking unless it's for a carried container */
        C.maybe_reset_pick(0);
        /* reset interrupted digging if it was taking place on this level */
        if(C.on_level(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,"dig_info","level").address,C.field(C.u,"you","uz").address)) C.memset(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","digging").address,0,BigInt(C.sizes["struct dig_info"]));
        /* reset cached targets */
        (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=(C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=C.i16(0)));
        /* travel destination */
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","polearm").address,"polearm_info","hitmon").value=0);
        /* polearm target */
        /* escape from trap */
        C.reset_utrap((C.i8(0)));
        C.check_special_room((C.i8(1)));
        /* room exit */
        C.memset(C.field(C.svd,"instance_globals_saved_d","dndest").address,0,BigInt(C.sizes["struct dest_area"]));
        C.memset(C.field(C.svu,"instance_globals_saved_u","updest").address,0,BigInt(C.sizes["struct dest_area"]));
        (C.field(C.u,"you","ustuck").value=0);
        (C.field(C.u,"you","uswallow").value=(C.field(C.u,"you","uswldtim").value=C.u32(0)));
        C.set_uinwater(0);
        /* u.uinwater = 0 */
        (C.field(C.u,"you","uundetected").value=C.u32(0));
        /* not hidden, even if means are available */
        C.dmonsfree();
        /* purge dead monsters from 'fmon' */
        C.dobjsfree();
        /* discard current level; "saving" is used to release dynamic data */
        (tmpnhfp=C.get_freeing_nhfile());
        C.savelev(tmpnhfp,C.i8(C.ledger_no(C.field(C.u,"you","uz").address)));
        C.close_nhfile(tmpnhfp);
    } else {
        C.vision_reset();
        (C.field(C.gv,"instance_globals_v","vision_full_recalc").value=C.i8(1));
        C.cls();
        /* was using safe_teleds() but that doesn't honor arrival region
           on levels which have such; we don't force stairs, just area */
        C.u_on_rndspot(C.i32((((C.i32(C.field(C.field(C.u,"you","uhave").address,"u_have","amulet").value)?1:0))|((C.i32(wiztower)?2:0)))));
        /* 'going up' flag */
        C.losedogs();
        C.kill_genocided_monsters();
        /* u_on_rndspot() might pick a spot that has a monster, or losedogs()
           might pick the hero's spot (only if there isn't already a monster
           there), so we might have to move hero or the co-located monster */
        if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct monst *").value)))!=0)) C.u_collide_m(mtmp);
        C.initrack();
        if((Number(C.global("uball").value!=0))) {
            C.unplacebc();
            C.placebc();
        }
        C.docrt();
        C.flush_screen(1);
        C.deliver_splev_message();
        /* level entry */
        C.check_special_room((C.i8(0)));
        /* room entry */
        C.save_currentstate();
    }
}

/* temporary? hack, since level type codes aren't the same as screen
   symbols and only the latter have easily accessible descriptions.
   Also used by wizcmds.c */
export const levltyp=C=>[C.literal("stone"),C.literal("vertical wall"),C.literal("horizontal wall"),C.literal("top-left corner wall"),C.literal("top-right corner wall"),C.literal("bottom-left corner wall"),C.literal("bottom-right corner wall"),C.literal("cross wall"),C.literal("tee-up wall"),C.literal("tee-down wall"),C.literal("tee-left wall"),C.literal("tee-right wall"),C.literal("drawbridge wall"),C.literal("tree"),C.literal("secret door"),C.literal("secret corridor"),C.literal("pool"),C.literal("moat"),C.literal("water"),C.literal("drawbridge up"),C.literal("lava pool"),C.literal("lava wall"),C.literal("iron bars"),C.literal("door"),C.literal("corridor"),C.literal("room"),C.literal("stairs"),C.literal("ladder"),C.literal("fountain"),C.literal("throne"),C.literal("sink"),C.literal("grave"),C.literal("altar"),C.literal("ice"),C.literal("drawbridge down"),C.literal("air"),C.literal("cloud"),C.literal("unreachable/undiggable"),C.literal("")];
/* not a real terrain type, but used for undiggable stone
       by wiz_map_levltyp() */
/* padding in case the number of entries above is odd */
export function levltyp_to_name(typ)
{
    typ=C.i32(typ);
    if(Number(!!(Number(typ>=0)&&Number(typ<C.MAX_TYPE)))) return C.cell((C.levltyp+Number(typ)*8),"char *").value;
    return 0;
}

/* #terrain command -- show known map, inspired by crawl's '|' command */
export function doterrain()
{
    const stackFrame=C.stackSave();
    try {
    let men;
    let selAddress=C.stackAlloc(8);
    let any=C.stackAlloc(C.sizes["union any"]);
    let n;
    let which;
    let clr=8;
    /* this used to be done each time vision was recalculated, so would
       always be up to date (hopefully); now we do it on demand instead */
    C.recalc_mapseen();
    /*
     * normal play: choose between known map without mons, obj, and traps
     *  (to see underlying terrain only), or
     *  known map without mons and objs (to see traps under mons and objs), or
     *  known map without mons (to see objects under monsters);
     * explore mode: normal choices plus full map (w/o mons, objs, traps);
     * wizard mode: normal and explore choices plus
     *  a dump of the internal levl[][].typ codes w/ level flags, or
     *  a legend for the levl[][].typ codes dump
     */
    (men=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
    C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",men,C.u64(0));
    C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_int").value=1);
    C.add_menu(men,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("known map without monsters, objects, and traps"),1);
    (C.field(any,"any","a_int").value=2);
    C.add_menu(men,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("known map without monsters and objects"),0);
    (C.field(any,"any","a_int").value=3);
    C.add_menu(men,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("known map without monsters"),0);
    if(Number(!!(C.i32(C.field(C.flags,"flag","explore").value)||C.i32(C.field(C.flags,"flag","debug").value)))) {
        (C.field(any,"any","a_int").value=4);
        C.add_menu(men,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("full map without monsters, objects, and traps"),0);
        if(C.field(C.flags,"flag","debug").value) {
            (C.field(any,"any","a_int").value=5);
            C.add_menu(men,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("internal levl[][].typ codes in base-36"),0);
            (C.field(any,"any","a_int").value=6);
            C.add_menu(men,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("legend of base-36 levl[][].typ codes"),0);
        }
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",men,C.literal("View which?"));
    (n=C.select_menu(men,1,selAddress));
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",men);
    /*
     * n <  0: player used ESC to cancel;
     * n == 0: preselected entry was explicitly chosen and got toggled off;
     * n == 1: preselected entry was implicitly chosen via <space>|<enter>;
     * n == 2: another entry was explicitly chosen, so skip preselected one.
     */
    (which=((Number(n<0))?C.i32((-1)):((Number(n==0))?1:C.field(C.field((C.cell(selAddress,"struct mi *").value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value)));
    if(Number(!!(Number(n>1)&&Number(which==1)))) (which=C.field(C.field((C.cell(selAddress,"struct mi *").value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value);
    if(Number(n>0)) C.free(C.cell(selAddress,"struct mi *").value);
    switch(which) {
        case (1):
            /* known map */
            C.reveal_terrain(1);
        break;
        case (2):
            /* known map with known traps */
            C.reveal_terrain(C.u32((1|2)));
        break;
        case (3):
            /* known map with known traps and objects */
            C.reveal_terrain(C.u32((C.u32((1|2))|4)));
        break;
        case (4):
            /* full map */
            C.reveal_terrain(C.u32((1|16)));
        break;
        case (5):
            /* map internals */
            C.wiz_map_levltyp();
        break;
        case (6):
            /* internal details */
            C.wiz_levltyp_legend();
        break;
        default:
            break;
    }
    return 0;
    /* no time elapses */
    } finally {C.stackRestore(stackFrame); }
}

/* has hero seen all locations in selection? */
export function u_have_seen_whole_selection(sel)
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let rect=C.stackAlloc(C.sizes["struct nhrect"]); C.copyRecord(rect,C.field(C.cg,"const_globals","zeroNhRect").address,C.sizes["struct nhrect"]);
    C.selection_getbounds(sel,rect);
    for((x=C.field(rect,"nhrect","lx").value);Number(C.i32(x)<=C.i32(C.field(rect,"nhrect","hx").value));((x=C.i16((x+1)))-1)) for((y=C.field(rect,"nhrect","ly").value);Number(C.i32(y)<=C.i32(C.field(rect,"nhrect","hy").value));((y=C.i16((y+1)))-1)) if(Number(!!(Number(!!(isok(x,y)&&C.i32(C.selection_getpoint(x,y,sel))))&&Number(C.glyph_at(x,y)==C.GLYPH_UNEXPLORED_OFF)))) return (C.i8(0));


    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* has hero seen all location of the rectangular outline in the selection */
export function u_have_seen_bounds_selection(sel)
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let rect=C.stackAlloc(C.sizes["struct nhrect"]); C.copyRecord(rect,C.field(C.cg,"const_globals","zeroNhRect").address,C.sizes["struct nhrect"]);
    C.selection_getbounds(sel,rect);
    for((x=C.field(rect,"nhrect","lx").value);Number(C.i32(x)<=C.i32(C.field(rect,"nhrect","hx").value));((x=C.i16((x+1)))-1)) {
        (y=C.field(rect,"nhrect","ly").value);
        if(Number(!!(Number(!!(isok(x,y)&&C.i32(C.selection_getpoint(x,y,sel))))&&Number(C.glyph_at(x,y)==C.GLYPH_UNEXPLORED_OFF)))) return (C.i8(0));
        (y=C.field(rect,"nhrect","hy").value);
        if(Number(!!(Number(!!(isok(x,y)&&C.i32(C.selection_getpoint(x,y,sel))))&&Number(C.glyph_at(x,y)==C.GLYPH_UNEXPLORED_OFF)))) return (C.i8(0));
    }
    for((y=C.field(rect,"nhrect","ly").value);Number(C.i32(y)<=C.i32(C.field(rect,"nhrect","hy").value));((y=C.i16((y+1)))-1)) {
        (x=C.field(rect,"nhrect","lx").value);
        if(Number(!!(Number(!!(isok(x,y)&&C.i32(C.selection_getpoint(x,y,sel))))&&Number(C.glyph_at(x,y)==C.GLYPH_UNEXPLORED_OFF)))) return (C.i8(0));
        (x=C.field(rect,"nhrect","hx").value);
        if(Number(!!(Number(!!(isok(x,y)&&C.i32(C.selection_getpoint(x,y,sel))))&&Number(C.glyph_at(x,y)==C.GLYPH_UNEXPLORED_OFF)))) return (C.i8(0));
    }
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* can hero currently see all locations in the selection */
export function u_can_see_whole_selection(sel)
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let rect=C.stackAlloc(C.sizes["struct nhrect"]); C.copyRecord(rect,C.field(C.cg,"const_globals","zeroNhRect").address,C.sizes["struct nhrect"]);
    C.selection_getbounds(sel,rect);
    for((x=C.field(rect,"nhrect","lx").value);Number(C.i32(x)<=C.i32(C.field(rect,"nhrect","hx").value));((x=C.i16((x+1)))-1)) for((y=C.field(rect,"nhrect","ly").value);Number(C.i32(y)<=C.i32(C.field(rect,"nhrect","hy").value));((y=C.i16((y+1)))-1)) if(Number(!!(Number(!!(isok(x,y)&&C.i32(C.selection_getpoint(x,y,sel))))&&Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))))) return (C.i8(0));


    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* selection_floofill callback to get all locations in a room */
export function dolookaround_floodfill_findroom(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let typ=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value;
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number(C.i32((typ))<=C.DBWALL))||(Number(C.i32((typ))==C.DOOR))))||(Number(!!(Number(C.i32((typ))==C.TREE)||(Number(!!(C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","arboreal").value)&&Number(C.i32((typ))==C.STONE)))))))))||(Number(C.i32((typ))==C.WATER))))||Number(C.i32(typ)==C.LAVAWALL)))||Number(C.i32(typ)==C.IRONBARS)))||Number(C.i32(typ)==C.SCORR)))||Number(C.i32(typ)==C.SDOOR)))||Number(C.i32(typ)==C.DRAWBRIDGE_UP)))) return C.i32((C.i8(0)));
    return C.i32((C.i8(1)));
}

/* describe the room at x,y */
export function lookaround_known_room(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    try {
    let sel=C.selection_new();
    let rmno=C.i32((C.i32(C.cell((C.field(C.u,"you","urooms").address+Number(0)*1),"char").value)-3));
    let qbuf=C.stackAlloc((1*128));
    C.set_selection_floodfillchk(C.functionPointer("dolookaround_floodfill_findroom"));
    C.selection_floodfill(sel,x,y,(C.i8(1)));
    if(Number(!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))) C.set_msg_xy(x,y);
    if(u_have_seen_whole_selection(sel)) {
        let u_in=C.i8(C.selection_getpoint(x,y,sel));
        C.variadic(26,C.literal("%s %s %s."),(Number(!!(Number(!!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))&&C.i32(u_in)))&&C.i32(u_can_see_whole_selection(sel))))?C.literal("are in"):(((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value))))))?C.literal("remember this as"):C.literal("remember that as"))),C.an(C.selection_size_description(sel,qbuf)),(Number(rmno>=0)?C.literal("room"):C.literal("area")));
    } else if(u_have_seen_bounds_selection(sel)) {
        C.variadic(27,C.literal("guess %s to be %s %s."),((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))?C.literal("this"):C.literal("that")),C.an(C.selection_size_description(sel,qbuf)),(Number(rmno>=0)?C.literal("room"):C.literal("area")));
    } else {
        C.variadic(28,C.literal("can't guess the size of %s area."),((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))?C.literal("this"):C.literal("that")));
    }
    C.selection_free(sel,(C.i8(1)));
    } finally {C.stackRestore(stackFrame); }
}

/* #lookaround - describe what the hero can see, in text */
export function dolookaround()
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let tmp_getloc_filter=C.field(C.iflags,"instance_flags","getloc_filter").value;
    let tmp_accessiblemsg=C.field(C.a11y,"accessibility_data","accessiblemsg").value;
    let corr_next2u=(C.i8(0));
    (C.field(C.a11y,"accessibility_data","accessiblemsg").value=(C.i8(1)));
    if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)==C.CORR)) {
        /* In a corridor, mention corridors next to you. */
        (corr_next2u=(C.i8(1)));
        /* TODO: if we know, describe where the corridor goes,
           perhaps by describing the rooms? */
    } else if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))) {
        /* In a doorway, describe the rooms next to you */
        let i;
        for((i=C.DIR_W);Number(i<(C.i32((C.N_DIRS_Z-2))));(i=C.i32(i+2))) {
            (x=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(C.cell((C.xdir+Number(i)*1),"signed char").value)))));
            (y=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(C.cell((C.ydir+Number(i)*1),"signed char").value)))));
            if(Number(!!(isok(x,y)&&(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))>=C.ROOM))))) lookaround_known_room(x,y);
        }
        (corr_next2u=(C.i8(1)));
    } else {
        lookaround_known_room(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
    }
    /* TODO: maybe describe stuff outside the current room differently? */
    (C.field(C.iflags,"instance_flags","getloc_filter").value=C.GFILTER_VIEW);
    for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) {
        let glyph; let mapsym;
        let iscorr=C.i8((Number(!!(Number(!!(Number(!!(C.i32(corr_next2u)&&Number(((glyph=C.glyph_at(x,y)))>=0)))&&(Number(!!(Number((glyph)>=C.GLYPH_CMAP_STONE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_CMAP_C_OFF+(C.i32(((C.i32((C.S_goodpos-C.S_digbeam)))+1))))))))))))&&(Number(!!(Number(((mapsym=C.glyph_to_cmap(glyph)))==C.S_corr)||Number(mapsym==C.S_litcorr))))))));
        if(Number(!!(Number(!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))&&(Number(!!(C.i32(C.gather_locs_interesting(x,y,C.GLOC_INTERESTING))||C.i32(iscorr))))))) {
            /* note: GLOC_INTERESTING catches S_engrcorr */
            let buf=C.stackAlloc((1*256));
            let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
            let sym=0;
            let firstmatchAddress=C.stackAlloc(8); C.cell(firstmatchAddress,"char *").value=0;
            ((C.field(cc,"nhcoord","x").value=x),(C.field(cc,"nhcoord","y").value=y));
            C.do_screen_description(cc,(C.i8(1)),sym,buf,firstmatchAddress,0);
            C.variadic(29,x,y,C.literal("%s."),C.cell(firstmatchAddress,"char *").value);
        }
    }

    (C.field(C.iflags,"instance_flags","getloc_filter").value=tmp_getloc_filter);
    (C.field(C.a11y,"accessibility_data","accessiblemsg").value=tmp_accessiblemsg);
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* #toggle extended command

   BIND=':toggle(price_quotes)
   BIND=@:toggle(autopickup) */
export function dotoggleoption()
{
    if(Number(!!(C.field(C.gc,"instance_globals_c","cmd_bind").value&&C.field(C.field(C.gc,"instance_globals_c","cmd_bind").value,"Cmd_bind","param").value))) {
        return C.toggle_bool_option(C.field(C.field(C.gc,"instance_globals_c","cmd_bind").value,"Cmd_bind","param").value);
    } else {
        C.variadic(30,C.literal("Use #optionsfull to set any option instead."));
        return 0;
    }
}

export function set_move_cmd(dir,run)
{
    dir=C.i32(dir);
    run=C.i32(run);
    (C.field(C.u,"you","dz").value=C.i32(C.cell((C.zdir+Number(dir)*1),"signed char").value));
    (C.field(C.u,"you","dx").value=C.i32(C.cell((C.xdir+Number(dir)*1),"signed char").value));
    (C.field(C.u,"you","dy").value=C.i32(C.cell((C.ydir+Number(dir)*1),"signed char").value));
    /* #reqmenu -prefix disables autopickup during movement */
    if(C.field(C.iflags,"instance_flags","menu_requested").value) (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","nopick").value=C.i8(1));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel").value=(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel1").value=C.i8(0)));
    if(Number(!!(Number(!(C.field(C.gd,"instance_globals_d","domove_attempting").value))&&Number(!(C.field(C.u,"you","dz").value))))) {
        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(run));
        (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(C.field(C.gd,"instance_globals_d","domove_attempting").value|C.i64(((Number(!(run))?1:2)))));
    }
}

/* move or attack */
export function do_move_west()
{
    set_move_cmd(C.DIR_W,0);
    return 1;
}

export function do_move_northwest()
{
    set_move_cmd(C.DIR_NW,0);
    return 1;
}

export function do_move_north()
{
    set_move_cmd(C.DIR_N,0);
    return 1;
}

export function do_move_northeast()
{
    set_move_cmd(C.DIR_NE,0);
    return 1;
}

export function do_move_east()
{
    set_move_cmd(C.DIR_E,0);
    return 1;
}

export function do_move_southeast()
{
    set_move_cmd(C.DIR_SE,0);
    return 1;
}

export function do_move_south()
{
    set_move_cmd(C.DIR_S,0);
    return 1;
}

export function do_move_southwest()
{
    set_move_cmd(C.DIR_SW,0);
    return 1;
}

/* rush */
export function do_rush_west()
{
    set_move_cmd(C.DIR_W,3);
    return 1;
}

export function do_rush_northwest()
{
    set_move_cmd(C.DIR_NW,3);
    return 1;
}

export function do_rush_north()
{
    set_move_cmd(C.DIR_N,3);
    return 1;
}

export function do_rush_northeast()
{
    set_move_cmd(C.DIR_NE,3);
    return 1;
}

export function do_rush_east()
{
    set_move_cmd(C.DIR_E,3);
    return 1;
}

export function do_rush_southeast()
{
    set_move_cmd(C.DIR_SE,3);
    return 1;
}

export function do_rush_south()
{
    set_move_cmd(C.DIR_S,3);
    return 1;
}

export function do_rush_southwest()
{
    set_move_cmd(C.DIR_SW,3);
    return 1;
}

/* run */
export function do_run_west()
{
    set_move_cmd(C.DIR_W,1);
    return 1;
}

export function do_run_northwest()
{
    set_move_cmd(C.DIR_NW,1);
    return 1;
}

export function do_run_north()
{
    set_move_cmd(C.DIR_N,1);
    return 1;
}

export function do_run_northeast()
{
    set_move_cmd(C.DIR_NE,1);
    return 1;
}

export function do_run_east()
{
    set_move_cmd(C.DIR_E,1);
    return 1;
}

export function do_run_southeast()
{
    set_move_cmd(C.DIR_SE,1);
    return 1;
}

export function do_run_south()
{
    set_move_cmd(C.DIR_S,1);
    return 1;
}

export function do_run_southwest()
{
    set_move_cmd(C.DIR_SW,1);
    return 1;
}

/* #reqmenu, prefix command to modify some others */
export function do_reqmenu()
{
    if(C.field(C.iflags,"instance_flags","menu_requested").value) {
        C.variadic(31,C.literal("Double %s prefix, canceled."),C.visctrl(cmd_from_func(C.functionPointer("do_reqmenu"))));
        (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
        return 2;
    }
    (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(1)));
    return 0;
}

/* #rush */
export function do_rush()
{
    if((C.i64((C.field(C.gd,"instance_globals_d","domove_attempting").value&C.i64(2))))) {
        C.variadic(32,C.literal("Double rush prefix, canceled."));
        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(0));
        (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(0));
        return 2;
    }
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(2));
    (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(C.field(C.gd,"instance_globals_d","domove_attempting").value|C.i64(2)));
    return 0;
}

/* #run */
export function do_run()
{
    if((C.i64((C.field(C.gd,"instance_globals_d","domove_attempting").value&C.i64(2))))) {
        C.variadic(33,C.literal("Double run prefix, canceled."));
        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(0));
        (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(0));
        return 2;
    }
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(3));
    (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(C.field(C.gd,"instance_globals_d","domove_attempting").value|C.i64(2)));
    return 0;
}

/* #fight */
export function do_fight()
{
    if(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","forcefight").value) {
        C.variadic(34,C.literal("Double fight prefix, canceled."));
        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","forcefight").value=C.i8(0));
        (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(0));
        return 2;
    }
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","forcefight").value=C.i8(1));
    (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(C.field(C.gd,"instance_globals_d","domove_attempting").value|C.i64(1)));
    return 0;
}

/* #repeat */
export function do_repeat()
{
    let res=0;
    if(Number(!(C.field(C.gi,"instance_globals_i","in_doagain").value))) {
        let repeat_copy;
        if(Number(!(cmdq_peek(C.CQ_REPEAT)))) {
            C.variadic(35,C.literal("There is no command available to repeat."));
            return 4;
        }
        (repeat_copy=cmdq_copy(C.CQ_REPEAT));
        (C.field(C.gi,"instance_globals_i","in_doagain").value=C.i32((C.i8(1))));
        rhack(0);
        /* read and execute command */
        (C.field(C.gi,"instance_globals_i","in_doagain").value=C.i32((C.i8(0))));
        cmdq_clear(C.CQ_REPEAT);
        (C.cell((C.field(C.gc,"instance_globals_c","command_queue").address+Number(C.CQ_REPEAT)*8),"struct _cmd_queue *").value=repeat_copy);
        (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
        if(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","move").value) (res=1);
    }
    return res;
}

/* extcmdlist: full command list, ordered by command name;
   commands with no keystroke or with only a meta keystroke generally
   need to be flagged as autocomplete and ones with a regular keystroke
   or control keystroke generally should not be; there are a few exceptions
   such as ^O/#overview and C/N/#name */
export const extcmdlist=C=>[[C.u8(35),C.literal("#"),C.literal("enter and perform an extended command"),C.functionPointer("doextcmd"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8((C.i32(((63)-128)))),C.literal("?"),C.literal("list all extended commands"),C.functionPointer("doextlist"),C.u32(C.i32((C.i32((C.i32((1|2))|8))|128))),0],[C.u8((C.i32(((97)-128)))),C.literal("adjust"),C.literal("adjust inventory letters"),C.functionPointer("doorganize"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8((C.i32(((65)-128)))),C.literal("annotate"),C.literal("name current level"),C.functionPointer("donamelevel"),C.u32(C.i32((C.i32((C.i32((1|2))|8))|128))),0],[C.u8(97),C.literal("apply"),C.literal("apply (use) a tool (pick-axe, key, lamp...)"),C.functionPointer("doapply"),C.u32(128),0],[C.u8((C.i32((31&(120))))),C.literal("attributes"),C.literal("show your attributes"),C.functionPointer("doattributes"),C.u32(C.i32((1|8))),0],[C.u8(64),C.literal("autopickup"),C.literal("toggle the 'autopickup' option on/off"),C.functionPointer("dotogglepickup"),C.u32(C.i32((1|8))),0],[C.u8(0),C.literal("bugreport"),C.literal("file a bug report"),C.functionPointer("dobugreport"),C.u32(C.i32((8|32))),0],[C.u8(67),C.literal("call"),C.literal("name a monster, specific object, or type of object"),C.functionPointer("docallcmd"),C.u32(C.i32((1|8))),0],[C.u8(90),C.literal("cast"),C.literal("zap (cast) a spell"),C.functionPointer("docast"),C.u32(1),0],[C.u8((C.i32(((99)-128)))),C.literal("chat"),C.literal("talk to someone"),C.functionPointer("dotalk"),C.u32(C.i32((1|2))),0],[C.u8(118),C.literal("chronicle"),C.literal("show journal of major events"),C.functionPointer("do_gamelog"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8(99),C.literal("close"),C.literal("close a door"),C.functionPointer("doclose"),C.u32(0),0],[C.u8((C.i32(((67)-128)))),C.literal("conduct"),C.literal("list voluntary challenges you have maintained"),C.functionPointer("doconduct"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8(0),C.literal("debugfuzzer"),C.literal("start the fuzz tester"),C.functionPointer("wiz_fuzzer"),C.u32(C.i32((C.i32((1|4))|32))),0],[C.u8((C.i32(((100)-128)))),C.literal("dip"),C.literal("dip an object into something"),C.functionPointer("dodip"),C.u32(C.i32((2|128))),0],[C.u8(62),C.literal("down"),C.literal("go down a staircase"),C.functionPointer("dodown"),C.u32(128),0],[C.u8(100),C.literal("drop"),C.literal("drop an item"),C.functionPointer("dodrop"),C.u32(0),0],[C.u8(68),C.literal("droptype"),C.literal("drop specific item types"),C.functionPointer("doddrop"),C.u32(0),0],[C.u8(101),C.literal("eat"),C.literal("eat something"),C.functionPointer("doeat"),C.u32(128),0],[C.u8(69),C.literal("engrave"),C.literal("engrave writing on the floor"),C.functionPointer("doengrave"),C.u32(0),0],[C.u8((C.i32(((101)-128)))),C.literal("enhance"),C.literal("advance or check weapon and spell skills"),C.functionPointer("enhance_weapon_skill"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8((C.i32(((88)-128)))),C.literal("exploremode"),C.literal("enter explore (discovery) mode"),C.functionPointer("enter_explore_mode"),C.u32(C.i32((C.i32((1|8))|32))),0],[C.u8(70),C.literal("fight"),C.literal("prefix: force fight even if you don't see a monster"),C.functionPointer("do_fight"),C.u32(512),0],[C.u8(102),C.literal("fire"),C.literal("fire ammunition from quiver"),C.functionPointer("dofire"),C.u32(0),0],[C.u8((C.i32(((102)-128)))),C.literal("force"),C.literal("force a lock"),C.functionPointer("doforce"),C.u32(2),0],[C.u8((C.i32(((103)-128)))),C.literal("genocided"),C.literal("list monsters that have been genocided or become extinct"),C.functionPointer("dogenocided"),C.u32(C.i32((C.i32((C.i32((1|2))|8))|128))),0],[C.u8(59),C.literal("glance"),C.literal("show what type of thing a map symbol corresponds to"),C.functionPointer("doquickwhatis"),C.u32(C.i32((1|8))),0],[C.u8(63),C.literal("help"),C.literal("give a help message"),C.functionPointer("dohelp"),C.u32(C.i32((1|8))),0],[C.u8(0),C.literal("herecmdmenu"),C.literal("show menu of commands you can do here"),C.functionPointer("doherecmdmenu"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8(0),C.literal("history"),C.literal("show a summary of the game's development"),C.functionPointer("dohistory"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8(105),C.literal("inventory"),C.literal("show your inventory"),C.functionPointer("ddoinv"),C.u32(C.i32((1|8))),0],[C.u8(73),C.literal("inventtype"),C.literal("show inventory of one specific item class"),C.functionPointer("dotypeinv"),C.u32(C.i32((1|8))),0],[C.u8((C.i32(((105)-128)))),C.literal("invoke"),C.literal("invoke an object's special powers"),C.functionPointer("doinvoke"),C.u32(C.i32((1|2))),0],[C.u8((C.i32(((106)-128)))),C.literal("jump"),C.literal("jump to another location"),C.functionPointer("dojump"),C.u32(2),0],[C.u8((C.i32((31&(100))))),C.literal("kick"),C.literal("kick something"),C.functionPointer("dokick"),C.u32(0),0],[C.u8(92),C.literal("known"),C.literal("show what object types have been discovered"),C.functionPointer("dodiscovered"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(96),C.literal("knownclass"),C.literal("show discovered types for one class of objects"),C.functionPointer("doclassdisco"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(0),C.literal("levelchange"),C.literal("change experience level"),C.functionPointer("wiz_level_change"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("lightsources"),C.literal("show mobile light sources"),C.functionPointer("wiz_light_sources"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(58),C.literal("look"),C.literal("look at what is here"),C.functionPointer("dolook"),C.u32(1),0],[C.u8(0),C.literal("lookaround"),C.literal("describe what you can see"),C.functionPointer("dolookaround"),C.u32(C.i32((1|8))),0],[C.u8((C.i32(((108)-128)))),C.literal("loot"),C.literal("loot a box on the floor"),C.functionPointer("doloot"),C.u32(C.i32((2|128))),0],[C.u8(0),C.literal("migratemons"),C.literal("show migrating monsters and migrate N random ones"),C.functionPointer("wiz_migrate_mons"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8((C.i32(((109)-128)))),C.literal("monster"),C.literal("use monster's special ability"),C.functionPointer("domonability"),C.u32(C.i32((1|2))),0],[C.u8((C.i32(((110)-128)))),C.literal("name"),C.literal("same as call; name a monster or object or object type"),C.functionPointer("docallcmd"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8((C.i32(((111)-128)))),C.literal("offer"),C.literal("offer a sacrifice to the gods"),C.functionPointer("dosacrifice"),C.u32(C.i32((2|128))),0],[C.u8(111),C.literal("open"),C.literal("open a door"),C.functionPointer("doopen"),C.u32(0),0],[C.u8(79),C.literal("options"),C.literal("show option settings"),C.functionPointer("doset_simple"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(0),C.literal("optionsfull"),C.literal("show all option settings, possibly change them"),C.functionPointer("doset"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8((C.i32((31&(111))))),C.literal("overview"),C.literal("show a summary of the explored dungeon"),C.functionPointer("dooverview"),C.u32(C.i32((C.i32((C.i32((1|2))|8))|128))),0],[C.u8(0),C.literal("panic"),C.literal("test panic routine (fatal to game)"),C.functionPointer("wiz_panic"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(112),C.literal("pay"),C.literal("pay your shopping bill"),C.functionPointer("dopay"),C.u32(128),0],[C.u8(124),C.literal("perminv"),C.literal("scroll persistent inventory display"),C.functionPointer("doperminv"),C.u32(C.i32((C.i32((1|8))|32))),0],[C.u8(44),C.literal("pickup"),C.literal("pick up things at the current location"),C.functionPointer("dopickup"),C.u32(128),0],[C.u8(0),C.literal("polyself"),C.literal("polymorph self"),C.functionPointer("wiz_polyself"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8((C.i32(((112)-128)))),C.literal("pray"),C.literal("pray to the gods for help"),C.functionPointer("dopray"),C.u32(C.i32((1|2))),0],[C.u8((C.i32((31&(112))))),C.literal("prevmsg"),C.literal("view recent game messages"),C.functionPointer("doprev_message"),C.u32(C.i32((C.i32((1|8))|4096))),0],[C.u8(80),C.literal("puton"),C.literal("put on an accessory (ring, amulet, etc)"),C.functionPointer("doputon"),C.u32(0),0],[C.u8(113),C.literal("quaff"),C.literal("quaff (drink) something"),C.functionPointer("dodrink"),C.u32(128),0],[C.u8(0),C.literal("quit"),C.literal("exit without saving current game"),C.functionPointer("done2"),C.u32(C.i32((C.i32((C.i32((1|2))|8))|32))),0],[C.u8(81),C.literal("quiver"),C.literal("select ammunition for quiver"),C.functionPointer("dowieldquiver"),C.u32(0),0],[C.u8(114),C.literal("read"),C.literal("read a scroll or spellbook"),C.functionPointer("doread"),C.u32(0),0],[C.u8((C.i32((31&(114))))),C.literal("redraw"),C.literal("redraw screen"),C.functionPointer("doredraw"),C.u32(C.i32((C.i32((1|8))|4096))),0],[C.u8(82),C.literal("remove"),C.literal("remove an accessory (ring, amulet, etc)"),C.functionPointer("doremring"),C.u32(0),0],[C.u8((C.i32((31&(97))))),C.literal("repeat"),C.literal("repeat a previous command"),C.functionPointer("do_repeat"),C.u32(C.i32((1|8))),0],[C.u8(109),C.literal("reqmenu"),C.literal("prefix: request menu or modify command"),C.functionPointer("do_reqmenu"),C.u32(512),0],[C.u8((C.i32((31&(95))))),C.literal("retravel"),C.literal("travel to previously selected travel location"),C.functionPointer("dotravel_target"),C.u32(0),0],[C.u8((C.i32(((82)-128)))),C.literal("ride"),C.literal("mount or dismount a saddled steed"),C.functionPointer("doride"),C.u32(2),0],[C.u8((C.i32(((114)-128)))),C.literal("rub"),C.literal("rub a lamp or a stone"),C.functionPointer("dorub"),C.u32(2),0],[C.u8(71),C.literal("run"),C.literal("prefix: run until something interesting is seen"),C.functionPointer("do_run"),C.u32(512),0],[C.u8(103),C.literal("rush"),C.literal("prefix: rush until something interesting is seen"),C.functionPointer("do_rush"),C.u32(512),0],[C.u8(83),C.literal("save"),C.literal("save the game and exit"),C.functionPointer("dosave"),C.u32(C.i32((C.i32((1|8))|32))),0],[C.u8(0),C.literal("saveoptions"),C.literal("save the game configuration"),C.functionPointer("do_write_config_file"),C.u32(C.i32((C.i32((1|8))|32))),0],[C.u8(115),C.literal("search"),C.literal("search for traps and secret doors"),C.functionPointer("dosearch"),C.u32(C.i32((1|128))),C.literal("searching")],[C.u8(42),C.literal("seeall"),C.literal("show all equipment in use"),C.functionPointer("doprinuse"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(C.AMULET_SYM),C.literal("seeamulet"),C.literal("show the amulet currently worn"),C.functionPointer("dopramulet"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(C.ARMOR_SYM),C.literal("seearmor"),C.literal("show the armor currently worn"),C.functionPointer("doprarm"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(C.RING_SYM),C.literal("seerings"),C.literal("show the ring(s) currently worn"),C.functionPointer("doprring"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(C.TOOL_SYM),C.literal("seetools"),C.literal("show the tools currently in use"),C.functionPointer("doprtool"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(C.WEAPON_SYM),C.literal("seeweapon"),C.literal("show the weapon currently wielded"),C.functionPointer("doprwep"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(33),C.literal("shell"),C.literal("leave game to enter a sub-shell ('exit' to come back)"),C.functionPointer("dosh_core"),C.u32((C.i32((C.i32((1|8))|32)))),0],[C.u8(C.GOLD_SYM),C.literal("showgold"),C.literal("show gold, possibly shop credit or debt"),C.functionPointer("doprgold"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(C.SPBOOK_SYM),C.literal("showspells"),C.literal("list and reorder known spells"),C.functionPointer("dovspell"),C.u32(C.i32((1|8))),0],[C.u8(94),C.literal("showtrap"),C.literal("describe an adjacent, discovered trap"),C.functionPointer("doidtrap"),C.u32(C.i32((1|8))),0],[C.u8((C.i32(((115)-128)))),C.literal("sit"),C.literal("sit down"),C.functionPointer("dosit"),C.u32(2),0],[C.u8(0),C.literal("stats"),C.literal("show memory statistics"),C.functionPointer("wiz_show_stats"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8((C.i32((31&(122))))),C.literal("suspend"),C.literal("push game to background ('fg' to come back)"),C.functionPointer("dosuspend_core"),C.u32((C.i32((C.i32((1|8))|32)))),0],[C.u8(120),C.literal("swap"),C.literal("swap wielded and secondary weapons"),C.functionPointer("doswapweapon"),C.u32(0),0],[C.u8(84),C.literal("takeoff"),C.literal("take off one piece of armor"),C.functionPointer("dotakeoff"),C.u32(0),0],[C.u8(65),C.literal("takeoffall"),C.literal("remove all armor"),C.functionPointer("doddoremarm"),C.u32(0),0],[C.u8((C.i32((31&(116))))),C.literal("teleport"),C.literal("teleport around the level"),C.functionPointer("dotelecmd"),C.u32(C.i32((1|128))),0],[C.u8(127),C.literal("terrain"),C.literal("view map without monsters or objects obstructing it"),C.functionPointer("doterrain"),C.u32(C.i32((C.i32((1|8))|2))),0],[C.u8(0),C.literal("therecmdmenu"),C.literal("menu of commands you can do from here to adjacent spot"),C.functionPointer("dotherecmdmenu"),C.u32(C.i32((C.i32((2|8))|2048))),0],[C.u8(116),C.literal("throw"),C.literal("throw something"),C.functionPointer("dothrow"),C.u32(0),0],[C.u8(0),C.literal("timeout"),C.literal("look at timeout queue and hero's timed intrinsics"),C.functionPointer("wiz_timeout_queue"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8((C.i32(((84)-128)))),C.literal("tip"),C.literal("empty a container"),C.functionPointer("dotip"),C.u32(C.i32((2|128))),0],[C.u8(0),C.literal("toggle"),C.literal("toggle boolean option"),C.functionPointer("dotoggleoption"),C.u32(C.i32((C.i32((1|8))|16384))),0],[C.u8(95),C.literal("travel"),C.literal("travel to a specific location on the map"),C.functionPointer("dotravel"),C.u32(128),0],[C.u8((C.i32(((116)-128)))),C.literal("turn"),C.literal("turn undead away"),C.functionPointer("doturn"),C.u32(C.i32((1|2))),0],[C.u8(88),C.literal("twoweapon"),C.literal("toggle two-weapon combat"),C.functionPointer("dotwoweapon"),C.u32(0),0],[C.u8((C.i32(((117)-128)))),C.literal("untrap"),C.literal("untrap something"),C.functionPointer("dountrap"),C.u32(2),0],[C.u8(60),C.literal("up"),C.literal("go up a staircase"),C.functionPointer("doup"),C.u32(128),0],[C.u8((C.i32(((86)-128)))),C.literal("vanquished"),C.literal("list vanquished monsters"),C.functionPointer("dovanquished"),C.u32(C.i32((C.i32((C.i32((1|2))|8))|128))),0],[C.u8((C.i32(((118)-128)))),C.literal("version"),C.literal("list compile time options for this version of NetHack"),C.functionPointer("doextversion"),C.u32(C.i32((C.i32((1|2))|8))),0],[C.u8(86),C.literal("versionshort"),C.literal("show version and date+time program was built"),C.functionPointer("doversion"),C.u32(C.i32((C.i32((1|8))|128))),0],[C.u8(0),C.literal("vision"),C.literal("show vision array"),C.functionPointer("wiz_show_vision"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(46),C.literal("wait"),C.literal("rest one move while doing nothing"),C.functionPointer("donull"),C.u32(C.i32((1|128))),C.literal("waiting")],[C.u8(87),C.literal("wear"),C.literal("wear a piece of armor"),C.functionPointer("dowear"),C.u32(0),0],[C.u8(38),C.literal("whatdoes"),C.literal("tell what a command does"),C.functionPointer("dowhatdoes"),C.u32(C.i32((1|8))),0],[C.u8(47),C.literal("whatis"),C.literal("show what type of thing a symbol corresponds to"),C.functionPointer("dowhatis"),C.u32(C.i32((1|8))),0],[C.u8(119),C.literal("wield"),C.literal("wield (put in use) a weapon"),C.functionPointer("dowield"),C.u32(0),0],[C.u8((C.i32(((119)-128)))),C.literal("wipe"),C.literal("wipe off your face"),C.functionPointer("dowipe"),C.u32(2),0],[C.u8(0),C.literal("wizborn"),C.literal("show stats of monsters created"),C.functionPointer("doborn"),C.u32(C.i32((1|4))),0],[C.u8(0),C.literal("wizbury"),C.literal("bury objs under and around you"),C.functionPointer("wiz_debug_cmd_bury"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizcast"),C.literal("cast any spell"),C.functionPointer("dowizcast"),C.u32(C.i32((1|4))),0],[C.u8(0),C.literal("wizcustom"),C.literal("show customized glyphs"),C.functionPointer("wiz_custom"),C.u32(C.i32((C.i32((1|4))|32))),0],[C.u8((C.i32((31&(101))))),C.literal("wizdetect"),C.literal("reveal hidden things within a small radius"),C.functionPointer("wiz_detect"),C.u32(C.i32((1|4))),0],[C.u8(0),C.literal("wizdispmacros"),C.literal("validate the display macro ranges"),C.functionPointer("wiz_display_macros"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizfliplevel"),C.literal("flip the level"),C.functionPointer("wiz_flip_level"),C.u32(C.i32((1|4))),0],[C.u8((C.i32((31&(103))))),C.literal("wizgenesis"),C.literal("create a monster"),C.functionPointer("wiz_genesis"),C.u32(C.i32((1|4))),0],[C.u8((C.i32((31&(105))))),C.literal("wizidentify"),C.literal("identify all items in inventory"),C.functionPointer("wiz_identify"),C.u32(C.i32((1|4))),0],[C.u8(0),C.literal("wizintrinsic"),C.literal("set an intrinsic"),C.functionPointer("wiz_intrinsic"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizkill"),C.literal("slay a monster"),C.functionPointer("wiz_kill"),C.u32((C.i32((C.i32((C.i32((C.i32((1|2))|4))|128))|32)))),0],[C.u8((C.i32((31&(118))))),C.literal("wizlevelport"),C.literal("teleport to another level"),C.functionPointer("wiz_level_tele"),C.u32(C.i32((C.i32((1|4))|128))),0],[C.u8(0),C.literal("wizloaddes"),C.literal("load and execute a des-file lua script"),C.functionPointer("wiz_load_splua"),C.u32(C.i32((C.i32((1|4))|32))),0],[C.u8(0),C.literal("wizloadlua"),C.literal("load and execute a lua script"),C.functionPointer("wiz_load_lua"),C.u32(C.i32((C.i32((1|4))|32))),0],[C.u8(0),C.literal("wizobjprobs"),C.literal("list object generation probabilities"),C.functionPointer("wiz_objprobs"),C.u32(C.i32((1|4))),0],[C.u8(0),C.literal("wizmakemap"),C.literal("recreate the current level"),C.functionPointer("wiz_makemap"),C.u32(C.i32((1|4))),0],[C.u8((C.i32((31&(102))))),C.literal("wizmap"),C.literal("map the level"),C.functionPointer("wiz_map"),C.u32(C.i32((1|4))),0],[C.u8(0),C.literal("wizmondiff"),C.literal("validate the difficulty ratings of monsters"),C.functionPointer("wiz_mon_diff"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizrumorcheck"),C.literal("verify rumor boundaries"),C.functionPointer("wiz_rumor_check"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizseenv"),C.literal("show map locations' seen vectors"),C.functionPointer("wiz_show_seenv"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizshownhuuid"),C.literal("show NHUUID for this game"),C.functionPointer("wiz_show_nhuuid"),C.u32(C.i32((2|4))),0],[C.u8(0),C.literal("wizsmell"),C.literal("smell monster"),C.functionPointer("wiz_smell"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wiztelekinesis"),C.literal("telekinesis"),C.functionPointer("wiz_telekinesis"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(0),C.literal("wizwhere"),C.literal("show locations of special levels"),C.functionPointer("wiz_where"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8((C.i32((31&(119))))),C.literal("wizwish"),C.literal("wish for something"),C.functionPointer("wiz_wish"),C.u32(C.i32((C.i32((1|128))|4))),0],[C.u8(0),C.literal("wmode"),C.literal("show wall modes"),C.functionPointer("wiz_show_wmodes"),C.u32(C.i32((C.i32((1|2))|4))),0],[C.u8(122),C.literal("zap"),C.literal("zap a wand"),C.functionPointer("dozap"),C.u32(0),0],[C.u8(0),C.literal("movewest"),C.literal("move west (screen left)"),C.functionPointer("do_move_west"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("movenorthwest"),C.literal("move northwest (screen upper left)"),C.functionPointer("do_move_northwest"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("movenorth"),C.literal("move north (screen up)"),C.functionPointer("do_move_north"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("movenortheast"),C.literal("move northeast (screen upper right)"),C.functionPointer("do_move_northeast"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("moveeast"),C.literal("move east (screen right)"),C.functionPointer("do_move_east"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("movesoutheast"),C.literal("move southeast (screen lower right)"),C.functionPointer("do_move_southeast"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("movesouth"),C.literal("move south (screen down)"),C.functionPointer("do_move_south"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("movesouthwest"),C.literal("move southwest (screen lower left)"),C.functionPointer("do_move_southwest"),C.u32(C.i32((1024|(C.i32((128|256)))))),0],[C.u8(0),C.literal("rushwest"),C.literal("rush west (screen left)"),C.functionPointer("do_rush_west"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rushnorthwest"),C.literal("rush northwest (screen upper left)"),C.functionPointer("do_rush_northwest"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rushnorth"),C.literal("rush north (screen up)"),C.functionPointer("do_rush_north"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rushnortheast"),C.literal("rush northeast (screen upper right)"),C.functionPointer("do_rush_northeast"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rusheast"),C.literal("rush east (screen right)"),C.functionPointer("do_rush_east"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rushsoutheast"),C.literal("rush southeast (screen lower right)"),C.functionPointer("do_rush_southeast"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rushsouth"),C.literal("rush south (screen down)"),C.functionPointer("do_rush_south"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("rushsouthwest"),C.literal("rush southwest (screen lower left)"),C.functionPointer("do_rush_southwest"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runwest"),C.literal("run west (screen left)"),C.functionPointer("do_run_west"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runnorthwest"),C.literal("run northwest (screen upper left)"),C.functionPointer("do_run_northwest"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runnorth"),C.literal("run north (screen up)"),C.functionPointer("do_run_north"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runnortheast"),C.literal("run northeast (screen upper right)"),C.functionPointer("do_run_northeast"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runeast"),C.literal("run east (screen right)"),C.functionPointer("do_run_east"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runsoutheast"),C.literal("run southeast (screen lower right)"),C.functionPointer("do_run_southeast"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runsouth"),C.literal("run south (screen down)"),C.functionPointer("do_run_south"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("runsouthwest"),C.literal("run southwest (screen lower left)"),C.functionPointer("do_run_southwest"),C.u32(C.i32((1024|128))),0],[C.u8(0),C.literal("clicklook"),0,C.functionPointer("doclicklook"),C.u32(C.i32((64|2048))),0],[C.u8(0),C.literal("mouseaction"),0,C.functionPointer("domouseaction"),C.u32(C.i32((64|2048))),0],[C.u8(0),C.literal("altadjust"),0,C.functionPointer("adjust_split"),C.u32(64),0],[C.u8(0),C.literal("altdip"),0,C.functionPointer("dip_into"),C.u32(64),0],[C.u8(0),C.literal("alttakeoff"),0,C.functionPointer("ia_dotakeoff"),C.u32(64),0],[C.u8(0),C.literal("altunwield"),0,C.functionPointer("remarm_swapwep"),C.u32(64),0],[C.u8(0),0,0,C.functionPointer("donull"),C.u32(0),0]];
/* allows 'm' prefix (for move without autopickup) but not the
                 g/G/F movement modifiers; not flagged as MOVEMENTCMD because
                 that would suppress it from dokeylist output */
/* #exploremode should be flagged AUTOCOMPETE but that would negatively
       impact frequently used #enhance by making #e become ambiguous */
/* 'm #options' runs doset() */
/* 'm #optionsfull' runs doset_simple() */
/* #overview used to need autocomplete and has retained that even
       after being assigned to ^O [old wizard mode ^O is now #wizwhere];
       'm' prefix displays overview as a menu where player can choose a
       level to supply with an annotation */
/* [should #panic actually autocomplete?] */
/* "modify command" is a vague description for use as no-autopickup,
       no-attack movement as well as miscellaneous non-movement things;
       key2extcmddesc() constructs a more explicit two line description
       for display by the '&' command and expects to find "prefix:" as
       the start of the text here */
/* SHELL */
/* $ is like ),=,&c but is not included with *, so not called "seegold" */
/* SUSPEND */
/* \177 == <del> aka <delete> aka <rubout>; some terminals have an
       option to swap it with <backspace> so if there's a key labeled
       <delete> it may or may not actually invoke the #terrain command */
/* (see comment for dodown() above */
/* movement commands will be bound by reset_commands() */
/* move or attack; accept m/g/G/F prefixes */
/* rush; accept m prefix but not g/G/F */
/* run; accept m prefix but not g/G/F */
/* internal commands: only used by game core, not available for user */
/* sentinel */
/* mapping direction and move mode to extended command function */
export const move_funcs=C=>[[C.functionPointer("do_move_west"),C.functionPointer("do_run_west"),C.functionPointer("do_rush_west")],[C.functionPointer("do_move_northwest"),C.functionPointer("do_run_northwest"),C.functionPointer("do_rush_northwest")],[C.functionPointer("do_move_north"),C.functionPointer("do_run_north"),C.functionPointer("do_rush_north")],[C.functionPointer("do_move_northeast"),C.functionPointer("do_run_northeast"),C.functionPointer("do_rush_northeast")],[C.functionPointer("do_move_east"),C.functionPointer("do_run_east"),C.functionPointer("do_rush_east")],[C.functionPointer("do_move_southeast"),C.functionPointer("do_run_southeast"),C.functionPointer("do_rush_southeast")],[C.functionPointer("do_move_south"),C.functionPointer("do_run_south"),C.functionPointer("do_rush_south")],[C.functionPointer("do_move_southwest"),C.functionPointer("do_run_southwest"),C.functionPointer("do_rush_southwest")],[C.functionPointer("dodown"),C.functionPointer("dodown"),C.functionPointer("dodown")],[C.functionPointer("doup"),C.functionPointer("doup"),C.functionPointer("doup")]];
/* misleading; rush and run for down or up are rejected by rhack()
       because dodown() and doup() lack the CMD_gGF_PREFIX flag */
/* used by dokeylist() and by key2extcmddesc() for dowhatdoes() */
export const misc_keys=C=>[[C.NHKF_ESC,C.literal("cancel current prompt or pending prefix"),(C.i8(0))],[C.NHKF_COUNT,C.literal("Prefix: for digits when preceding a command with a count"),(C.i8(1))],[0,0,(C.i8(0))]];
export const extcmdlist_length=C=>C.i32((C.i32((C.u64((BigInt((C.sizes["struct ext_func_tab"]*171))/BigInt(C.sizes["struct ext_func_tab"])))))-1));
/* get entry i in the extended commands list. for windowport use. */
export function extcmds_getentry(i)
{
    i=C.i32(i);
    if(Number(!!(Number(i<0)||Number(i>C.cell(C.extcmdlist_length,"int").value)))) return 0;
    return (C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]);
}

/* get the command bound to a key */
export function cmdbind_get(key)
{
    key=C.u8(key);
    let bind=C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value;
    if(Number(!(key))) return 0;
    while(bind) {
        if(Number(C.i32(C.field(bind,"Cmd_bind","key").value)==C.i32(key))) return bind;
        (bind=C.field(bind,"Cmd_bind","next").value);
    }
    return bind;
}

export function cmdbind_add(key,extcmd,user)
{
    key=C.u8(key);
    user=C.i8(user);
    let bind=cmdbind_get(key);
    if(Number(!(key))) return;
    if(Number(!!(Number(!(extcmd))&&bind))) {
        cmdbind_remove(key);
        return;
    }
    /* binding exists, set it to this command */
    if(bind) {
        (C.field(bind,"Cmd_bind","cmd").value=extcmd);
        (C.field(bind,"Cmd_bind","userbind").value=user);
        if(C.field(bind,"Cmd_bind","param").value) {
            C.free(C.field(bind,"Cmd_bind","param").value);
            (C.field(bind,"Cmd_bind","param").value=0);
        }
        return;
    } else {
        (bind=C.alloc(C.u32(BigInt(C.sizes["struct Cmd_bind"]))));
        (C.field(bind,"Cmd_bind","key").value=key);
        (C.field(bind,"Cmd_bind","userbind").value=user);
        (C.field(bind,"Cmd_bind","param").value=0);
        (C.field(bind,"Cmd_bind","cmd").value=extcmd);
        (C.field(bind,"Cmd_bind","next").value=C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value);
        (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value=bind);
    }
}

export function cmdbind_remove(key)
{
    key=C.u8(key);
    let bind=C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value;
    let prev=0;
    while(bind) {
        if(Number(C.i32(C.field(bind,"Cmd_bind","key").value)==C.i32(key))) {
            if(prev) (C.field(prev,"Cmd_bind","next").value=C.field(bind,"Cmd_bind","next").value);
 else (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value=C.field(bind,"Cmd_bind","next").value);
            if(C.field(bind,"Cmd_bind","param").value) C.free(C.field(bind,"Cmd_bind","param").value);
            C.free(bind);
            return;
        }
        (prev=bind);
        (bind=C.field(bind,"Cmd_bind","next").value);
    }
}

export function cmdbind_freeall()
{
    let next;
    while(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value) {
        (next=C.field(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value,"Cmd_bind","next").value);
        if(C.field(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value,"Cmd_bind","param").value) C.free(C.field(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value,"Cmd_bind","param").value);
        C.free(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value);
        (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value=next);
    }
}

/* swap key bindings for key1 and key2. both bindings must exist. */
export function cmdbind_swapkeys(key1,key2)
{
    key1=C.u8(key1);
    key2=C.u8(key2);
    let bind1=cmdbind_get(key1);
    let bind2=cmdbind_get(key2);
    if(Number(!!(bind1&&bind2))) {
        (C.field(bind1,"Cmd_bind","key").value=key2);
        (C.field(bind2,"Cmd_bind","key").value=key1);
    }
}

/* return number of extended commands bound to a non-default key */
export function count_bind_keys()
{
    const stackFrame=C.stackSave();
    try {
    let bind=C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value;
    let i; let nbinds=0;
    let keys=C.stackAlloc((1*256));
    C.memset(keys,0,C.u64((BigInt(1)*C.u64(256))));
    /* commands bound to different key */
    while(bind) {
        (C.cell((keys+Number(C.field(bind,"Cmd_bind","key").value)*1),"unsigned char").value=C.u8(1));
        if(Number(!!(Number(!!(C.i32(C.field(bind,"Cmd_bind","userbind").value)&&C.field(bind,"Cmd_bind","cmd").value))&&Number(C.i32(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","key").value)!=C.i32(C.field(bind,"Cmd_bind","key").value))))) {
            ((nbinds=C.i32((nbinds+1)))-1);
        }
        (bind=C.field(bind,"Cmd_bind","next").value);
    }
    /* commands which should be bound to a key, but aren't */
    for((i=0);Number(i<C.cell(C.extcmdlist_length,"int").value);((i=C.i32((i+1)))-1)) if(Number(!!(C.i32(C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","key").value)&&Number(!(C.cell((keys+Number(C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","key").value)*1),"unsigned char").value))))) ((nbinds=C.i32((nbinds+1)))-1);

    return nbinds;
    } finally {C.stackRestore(stackFrame); }
}

/* show changed key bindings in text, or if sbuf is non-null, append to it */
export function get_changed_key_binds(sbuf)
{
    const stackFrame=C.stackSave();
    try {
    let win=(C.i32((-1)));
    let i;
    let buf=C.stackAlloc((1*256));
    let buf2=C.stackAlloc((1*128));
    let bind=C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value;
    let keys=C.stackAlloc((1*256));
    C.memset(keys,0,C.u64((BigInt(1)*C.u64(256))));
    if(Number(!(sbuf))) (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",5));
    /* commands bound to different key */
    while(bind) {
        (C.cell((keys+Number(C.field(bind,"Cmd_bind","key").value)*1),"unsigned char").value=C.u8(1));
        if(Number(!!(Number(!!(C.i32(C.field(bind,"Cmd_bind","userbind").value)&&C.field(bind,"Cmd_bind","cmd").value))&&Number(C.i32(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","key").value)!=C.i32(C.field(bind,"Cmd_bind","key").value))))) {
            if(Number((C.u32((C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","flags").value&C.u32(16384))))!=C.u32(0))) C.variadic(36,buf,C.literal("BIND=%s:%s(%s)%s"),key2txt(C.field(bind,"Cmd_bind","key").value,buf2),C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value,C.field(bind,"Cmd_bind","param").value,(sbuf?C.literal("\n"):C.literal("")));
 else C.variadic(37,buf,C.literal("BIND=%s:%s%s"),key2txt(C.field(bind,"Cmd_bind","key").value,buf2),C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value,(sbuf?C.literal("\n"):C.literal("")));
            if(sbuf) C.strbuf_append(sbuf,buf);
 else C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        }
        (bind=C.field(bind,"Cmd_bind","next").value);
    }
    /* commands which should be bound to a key, but aren't */
    for((i=0);Number(i<C.cell(C.extcmdlist_length,"int").value);((i=C.i32((i+1)))-1)) {
        let ec=(C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]);
        if(Number(!!(C.i32(C.field(ec,"ext_func_tab","key").value)&&Number(!(C.cell((keys+Number(C.field(ec,"ext_func_tab","key").value)*1),"unsigned char").value))))) {
            C.variadic(38,buf,C.literal("BIND=%s:nothing%s"),key2txt(C.field(ec,"ext_func_tab","key").value,buf2),(sbuf?C.literal("\n"):C.literal("")));
            if(sbuf) C.strbuf_append(sbuf,buf);
 else C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        }
    }
    if(Number(!(sbuf))) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",win,(C.i8(1)));
        C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* interactive key binding */
export function handler_rebind_keys_add(keyfirst)
{
    keyfirst=C.i8(keyfirst);
    const stackFrame=C.stackSave();
    try {
    let ec;
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let i; let npick;
    let picksAddress=C.stackAlloc(8); C.cell(picksAddress,"struct mi *").value=0;
    let buf=C.stackAlloc((1*256));
    let buf2=C.stackAlloc((1*128));
    let key=C.u8(0);
    let clr=8;
    if(keyfirst) {
        C.variadic(39,C.literal("Bind which key? "));
        (key=C.u8(pgetchar()));
        if(Number(!!(Number(!(key))||Number(C.i32(key)==27)))) return;
    }
    (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
    C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",win,C.u64(0));
    C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    if(key) {
        let bind=cmdbind_get(key);
        if(Number(!!(bind&&C.field(bind,"Cmd_bind","cmd").value))) {
            C.variadic(40,buf,C.literal("Key '%s' is currently bound to \"%s\"."),key2txt(key,buf2),C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value);
        } else {
            C.variadic(41,buf,C.literal("Key '%s' is not bound to anything."),key2txt(key,buf2));
        }
        C.add_menu_str(win,buf);
        C.add_menu_str(win,C.literal(""));
    }
    (C.field(any,"any","a_int").value=C.i32((-1)));
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("nothing: unbind the key"),0);
    C.add_menu_str(win,C.literal(""));
    for((i=0);Number(i<C.cell(C.extcmdlist_length,"int").value);((i=C.i32((i+1)))-1)) {
        (ec=(C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]));
        if(Number((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32((C.i32((C.i32((1024|64))|16)))))))!=C.u32(0))) continue;
        (C.field(any,"any","a_int").value=(C.i32((i+1))));
        C.variadic(42,buf,C.literal("%s: %s"),C.field(ec,"ext_func_tab","ef_txt").value,C.field(ec,"ext_func_tab","ef_desc").value);
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,buf,0);
    }
    if(key) C.variadic(43,buf,C.literal("Bind '%s' to what command?"),key2txt(key,buf2));
 else C.variadic(44,buf,C.literal("Bind what command?"));
    C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",win,buf);
    (npick=C.select_menu(win,1,picksAddress));
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
    if(Number(npick>0)) {
        let prevcmd;
        let cmdstr=C.stackAlloc((1*256));
        (i=C.field(C.field(C.cell(picksAddress,"struct mi *").value,"mi","item").address,"any","a_int").value);
        C.free(C.cell(picksAddress,"struct mi *").value);
        bindit: {
            if(Number(i==C.i32((-1)))) {
                (ec=0);
                C.strcat(cmdstr,C.literal("nothing"));
                break bindit;
            } else {
                (ec=(C.extcmdlist+Number(C.i32((i-1)))*C.sizes["struct ext_func_tab"]));
                if(Number((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32(16384))))!=C.u32(0))) {
                    let parambuf=C.stackAlloc((1*256));
                    let querybuf=C.stackAlloc((1*256));
                    (C.cell((parambuf+Number(0)*1),"char").value=C.i8(0));
                    C.variadic(45,querybuf,C.literal("Command %s requires a parameter:"),C.field(ec,"ext_func_tab","ef_txt").value);
                    C.getlin(querybuf,parambuf);
                    C.mungspaces(parambuf);
                    C.variadic(46,(C.literal("handler_rebind_keys_add")),2376,cmdstr,C.u64(C.i32((256-1))),C.literal("%s(%s)"),C.field(ec,"ext_func_tab","ef_txt").value,parambuf);
                    (C.cell((cmdstr+Number(C.i32((256-1)))*1),"char").value=C.i8(0));
                } else {
                    C.strcat(cmdstr,C.field(ec,"ext_func_tab","ef_txt").value);
                }
            }
        }
        if(Number(!(key))) {
            C.variadic(47,C.literal("Bind which key? "));
            (key=C.u8(pgetchar()));
            if(Number(!!(Number(!(key))||Number(C.i32(key)==27)))) return;
        }
        (prevcmd=cmdbind_get(key));
        if(bind_key(key,cmdstr,(C.i8(1)))) {
            if(Number(!!(prevcmd&&Number(C.field(prevcmd,"Cmd_bind","cmd").value!=ec)))) {
                C.variadic(48,C.literal("Changed key '%s' from \"%s\" to \"%s\"."),key2txt(key,buf2),C.field(C.field(prevcmd,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value,cmdstr);
            } else if(Number(!(prevcmd))) {
                C.variadic(49,C.literal("Bound key '%s' to \"%s\"."),key2txt(key,buf2),cmdstr);
            }
        } else {
            C.variadic(50,C.literal("Key binding failed?!"));
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function handler_rebind_keys()
{
    const stackFrame=C.stackSave();
    try {
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let i; let npick;
    let picksAddress=C.stackAlloc(8); C.cell(picksAddress,"struct mi *").value=0;
    let clr=8;
    redo_rebind: for(;;) {
        (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
        C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",win,C.u64(0));
        C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
        (C.field(any,"any","a_int").value=1);
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("bind key to a command"),0);
        (C.field(any,"any","a_int").value=2);
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("bind command to a key"),0);
        if(count_bind_keys()) {
            (C.field(any,"any","a_int").value=3);
            C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,C.literal("view changed key binds"),0);
        }
        C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",win,C.literal("Do what?"));
        (npick=C.select_menu(win,1,picksAddress));
        C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
        if(Number(npick>0)) {
            (i=C.field(C.field(C.cell(picksAddress,"struct mi *").value,"mi","item").address,"any","a_int").value);
            C.free(C.cell(picksAddress,"struct mi *").value);
            if(Number(!!(Number(i==1)||Number(i==2)))) {
                handler_rebind_keys_add(C.i8((Number(i==1))));
            } else if(Number(i==3)) {
                get_changed_key_binds(0);
            }
            continue redo_rebind;
        }
        break;
    }
    } finally {C.stackRestore(stackFrame); }
}

export function handler_change_autocompletions()
{
    const stackFrame=C.stackSave();
    try {
    let win;
    let any=C.stackAlloc(C.sizes["union any"]);
    let i; let n;
    let picksAddress=C.stackAlloc(8); C.cell(picksAddress,"struct mi *").value=0;
    let clr=8;
    let ec;
    let buf=C.stackAlloc((1*256));
    (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
    C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",win,C.u64(0));
    C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    for((i=0);Number(i<C.cell(C.extcmdlist_length,"int").value);((i=C.i32((i+1)))-1)) {
        (ec=(C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]));
        if(Number((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32((C.i32((64|16)))))))!=C.u32(0))) continue;
        if(Number(C.strlen(C.field(ec,"ext_func_tab","ef_txt").value)<C.u64(2))) continue;
        (C.field(any,"any","a_int").value=(C.i32((i+1))));
        C.variadic(51,buf,C.literal("%c %s: %s"),((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32(8192))))?42:32),C.field(ec,"ext_func_tab","ef_txt").value,C.field(ec,"ext_func_tab","ef_desc").value);
        C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,buf,((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32(2))))?1:0));
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",win,C.literal("Which commands autocomplete?"));
    (n=C.select_menu(win,2,picksAddress));
    if(Number(n>=0)) {
        let j;
        for((i=0);Number(i<C.cell(C.extcmdlist_length,"int").value);((i=C.i32((i+1)))-1)) {
            let setit=(C.i8(0));
            (ec=(C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]));
            if(Number((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32((C.i32((64|16)))))))!=C.u32(0))) continue;
            if(Number(C.strlen(C.field(ec,"ext_func_tab","ef_txt").value)<C.u64(2))) continue;
            C.variadic(52,buf,C.literal("%s"),C.field(ec,"ext_func_tab","ef_txt").value);
            for((j=0);Number(j<n);(j=C.i32((j+1)))) {
                if(Number(ec==(C.extcmdlist+Number((C.i32((C.field(C.field((C.cell(picksAddress,"struct mi *").value+Number(j)*C.sizes["struct mi"]),"mi","item").address,"any","a_int").value-1))))*C.sizes["struct ext_func_tab"]))) {
                    parseautocomplete(buf,(C.i8(1)));
                    (setit=(C.i8(1)));
                    break;
                }
            }
            if(Number(!(setit))) {
                parseautocomplete(buf,(C.i8(0)));
            }
        }
        if(Number(n>0)) C.free(C.cell(picksAddress,"struct mi *").value);
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
    } finally {C.stackRestore(stackFrame); }
}

/* find extended command entries matching findstr.
   if findstr is NULL, returns all available entries.
   returns: number of matching extended commands,
            and the entry indexes in matchlist.
   for windowport use. */
export function extcmds_match(findstr,ecmflags,matchlist)
{
    ecmflags=C.i32(ecmflags);
    const retmatchlist=C.staticData("extcmds_match","retmatchlist",()=>[]);
    let i; let mi=0;
    let fslen=C.i32((findstr?C.Strlen_(findstr,(C.literal("extcmds_match")),2527):C.u32(0)));
    let ignoreac=C.i8(Number((C.i32((ecmflags&1)))!=0));
    let exactmatch=C.i8(Number((C.i32((ecmflags&2)))!=0));
    let no1charcmd=C.i8(Number((C.i32((ecmflags&4)))!=0));
    for((i=0);C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","ef_txt").value;((i=C.i32((i+1)))-1)) {
        if(C.u32((C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","flags").value&C.u32((C.i32((16|64))))))) continue;
        if(Number(!!(Number(!(C.field(C.flags,"flag","debug").value))&&(C.u32((C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","flags").value&C.u32(4))))))) continue;
        if(Number(!!(Number(!(ignoreac))&&Number(!((C.u32((C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","flags").value&C.u32(2))))))))) continue;
        if(Number(!!(C.i32(no1charcmd)&&(Number(C.strlen(C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","ef_txt").value)==C.u64(1)))))) continue;
        if(Number(!(findstr))) {
            (C.cell((retmatchlist+Number(((mi=C.i32((mi+1)))-1))*4),"int").value=i);
        } else if(exactmatch) {
            if(Number(!(C.strncmpi((findstr),(C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","ef_txt").value),C.i32((-1)))))) {
                (C.cell((retmatchlist+Number(((mi=C.i32((mi+1)))-1))*4),"int").value=i);
            }
        } else {
            if(Number(!(C.strncmpi(findstr,C.field((C.extcmdlist+Number(i)*C.sizes["struct ext_func_tab"]),"ext_func_tab","ef_txt").value,fslen)))) {
                (C.cell((retmatchlist+Number(((mi=C.i32((mi+1)))-1))*4),"int").value=i);
            }
        }
    }
    if(matchlist) (C.cell(matchlist,"int *").value=retmatchlist);
    return mi;
}

export function key2extcmddesc(key)
{
    key=C.u8(key);
    const key2cmdbuf=C.staticData("key2extcmddesc","key2cmdbuf",()=>null);
    let txt;
    let k; let i; let j;
    let M_5=C.u8((C.i32(((53)-128)))); let M_0=C.u8((C.i32(((48)-128))));
    let cmdbind;
    /* need to check for movement commands before checking the extended
       commands table because it contains entries for number_pad commands
       that match !number_pad movement (like 'j' for "jump") */
    (C.cell((key2cmdbuf+Number(0)*1),"char").value=C.i8(0));
    if(movecmd(C.i8((k=C.i32(key))),C.MV_WALK)) C.strcpy(key2cmdbuf,C.literal("move"));
 else if(movecmd(C.i8((k=C.i32(key))),C.MV_RUSH)) C.strcpy(key2cmdbuf,C.literal("rush"));
 else if(movecmd(C.i8((k=C.i32(key))),C.MV_RUN)) C.strcpy(key2cmdbuf,C.literal("run"));
    /* "move or attack"? */
    if(Number(!!(C.i32(C.digit(C.i8(key)))||(Number(!!(C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value)&&C.i32(C.digit(C.i8((C.i32((127&C.i32((key)))))))))))))) {
        (C.cell((key2cmdbuf+Number(0)*1),"char").value=C.i8(0));
        if(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))) C.strcpy(key2cmdbuf,C.literal("start of, or continuation of, a count"));
 else if(Number(!!(Number(C.i32(key)==53)||Number(C.i32(key)==C.i32(M_5))))) C.variadic(53,key2cmdbuf,C.literal("%s prefix"),((C.i32((Number(!(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value))))^(Number(C.i32(key)==C.i32(M_5))))))?C.literal("run"):C.literal("rush")));
 else if(Number(!!(Number(C.i32(key)==48)||(Number(!!(C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value)&&Number(C.i32(key)==C.i32(M_0)))))))) C.strcpy(key2cmdbuf,C.literal("synonym for 'i'"));
        if(C.cell(key2cmdbuf,"char").value) return key2cmdbuf;
    }
    /* check prefixes before regular commands; includes ^A pseudo-command */
    for((i=0);C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value;(i=C.i32((i+1)))) {
        if(Number(!!(C.i32(C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","numpad").value)&&Number(!(C.field(C.iflags,"instance_flags","num_pad").value))))) continue;
        (j=C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","nhkf").value);
        if(Number(C.i32(key)==C.i32(C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(j)*1),"char").value)))) return C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value;
    }
    /* finally, check whether 'key' is a command */
    if(Number(!!(Number(!!(Number(((cmdbind=cmdbind_get(key)))!=0)&&C.field(cmdbind,"Cmd_bind","cmd").value))&&Number(((txt=C.field(C.field(cmdbind,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value))!=0)))) {
        C.variadic(54,key2cmdbuf,C.literal("%s (#%s)"),C.field(C.field(cmdbind,"Cmd_bind","cmd").value,"ext_func_tab","ef_desc").value,txt);
        /* special case: for reqmenu prefix (normally 'm'), replace
           "prefix: request menu or modify command (#reqmenu)"
           with two-line "movement prefix:...\nnon-movement prefix:..." */
        if(Number(!!(Number(!(C.strncmpi(key2cmdbuf,C.literal("prefix:"),7)))&&Number(!(C.strncmpi((txt),(C.literal("reqmenu")),C.i32((-1)))))))) C.strsubst(key2cmdbuf,C.literal("prefix:"),C.literal("movement prefix: move without autopickup and without attacking\nnon-movement prefix:"));
        /* relies on implicit concatenation of literal strings */
        /* and rest of buf */
        /* another special case: 'txt' for '#' is "#" and showing that as
           "perform an extended command (##)" looks silly; strip "(##)" off */
        return C.strsubst(key2cmdbuf,C.literal(" (##)"),C.literal(""));
    }
    return 0;
}

export function bind_mousebtn(btn,command)
{
    btn=C.i32(btn);
    let extcmd;
    if(Number(!!(Number(btn<1)||Number(btn>2)))) {
        C.variadic(55,C.literal("Wrong mouse button, valid are 1-%i"),2);
        return (C.i8(0));
    }
    ((btn=C.i32((btn-1)))+1);
    /* special case: "nothing" is reserved for unbinding */
    if(Number(!(C.strncmpi((command),(C.literal("nothing")),C.i32((-1)))))) {
        (C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(btn)*8),"struct ext_func_tab *").value=0);
        return (C.i8(1));
    }
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;((extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) {
        if(C.strncmpi((command),(C.field(extcmd,"ext_func_tab","ef_txt").value),C.i32((-1)))) continue;
        if(Number(!((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(2048))))))) continue;
        (C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(btn)*8),"struct ext_func_tab *").value=extcmd);
        /* silently accept key binding for unavailable command (!SHELL,&c) */
        return (C.i8(1));
    }
    return (C.i8(0));
}

export function bind_key(key,command,user)
{
    key=C.u8(key);
    user=C.i8(user);
    let extcmd;
    let len;
    let buf; let p=0; let lastp=0;
    /* special case: "nothing" is reserved for unbinding */
    if(Number(!(C.strncmpi((command),(C.literal("nothing")),C.i32((-1)))))) {
        cmdbind_remove(key);
        return (C.i8(1));
    }
    /* copy command to buf for modification */
    (len=C.i64(C.u64((C.strlen(command)+C.u64(1)))));
    (buf=C.alloc(C.u32(len)));
    C.strncpy(buf,command,C.u64(len));
    /* does buf have a parameter in parenthesis? */
    if(Number(!!(Number(!!(Number(((p=C.strchr(buf,40)))!=0)&&Number(((lastp=C.strrchr(buf,41)))!=0)))&&(Number(lastp>p))))) {
        (C.cell(p,"char").value=C.i8(0));
        (C.cell(lastp,"char").value=C.i8(0));
        /* p points to the parameter */
        ((p=C.ptr((p+Number(1))))-Number(1));
    }
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;((extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) {
        if(C.strncmpi((buf),(C.field(extcmd,"ext_func_tab","ef_txt").value),C.i32((-1)))) continue;
        if(Number((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(64))))!=C.u32(0))) continue;
        cmdbind_add(key,extcmd,user);
        if(Number((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(16384))))!=C.u32(0))) {
            if(Number(!(p))) {
                C.variadic(56,C.literal("'%s' requires a parameter"),buf);
            } else {
                let bind=cmdbind_get(key);
                let maxlen=C.i32(C.u64((((Number(C.u64((30))<(C.strlen(p)))?C.u64((30)):(C.strlen(p))))+C.u64(1))));
                if(Number(maxlen<=1)) {
                    C.variadic(57,C.literal("Required parameter cannot be empty"));
                } else {
                    (C.field(bind,"Cmd_bind","param").value=C.alloc(C.u32(maxlen)));
                    C.strncpy(C.field(bind,"Cmd_bind","param").value,p,C.u64(maxlen));
                    (C.cell((C.field(bind,"Cmd_bind","param").value+Number(C.i32((maxlen-1)))*1),"char").value=C.i8(0));
                }
            }
        } else if(Number(!!(p&&Number(C.strlen(p)>C.u64(0))))) C.variadic(58,C.literal("'%s' does not take a parameter"),buf);
        /* silently accept key binding for unavailable command (!SHELL,&c) */
        C.free(buf);
        return (C.i8(1));
    }
    C.free(buf);
    return (C.i8(0));
}

/* bind key by ext cmd function */
export function bind_key_fn(key,fn)
{
    key=C.u8(key);
    let extcmd;
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;((extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) {
        if(Number(C.field(extcmd,"ext_func_tab","ef_funct").value!=fn)) continue;
        if(Number((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(64))))!=C.u32(0))) continue;
        cmdbind_add(key,extcmd,(C.i8(0)));
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* initialize all keyboard commands */
export function commands_init()
{
    let extcmd;
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;((extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) if(C.field(extcmd,"ext_func_tab","key").value) cmdbind_add(C.field(extcmd,"ext_func_tab","key").value,extcmd,(C.i8(0)));

    bind_mousebtn(1,C.literal("therecmdmenu"));
    bind_mousebtn(2,C.literal("clicklook"));
    /* number_pad */
    bind_key(C.u8((C.i32((31&(108))))),C.literal("redraw"),(C.i8(0)));
    bind_key(C.u8(104),C.literal("help"),(C.i8(0)));
    bind_key(C.u8(106),C.literal("jump"),(C.i8(0)));
    bind_key(C.u8(107),C.literal("kick"),(C.i8(0)));
    bind_key(C.u8(108),C.literal("loot"),(C.i8(0)));
    bind_key(C.u8((C.i32((31&(110))))),C.literal("annotate"),(C.i8(0)));
    bind_key(C.u8(78),C.literal("name"),(C.i8(0)));
    bind_key(C.u8(117),C.literal("untrap"),(C.i8(0)));
    bind_key(C.u8(53),C.literal("run"),(C.i8(0)));
    bind_key(C.u8((C.i32(((53)-128)))),C.literal("rush"),(C.i8(0)));
    bind_key(C.u8(45),C.literal("fight"),(C.i8(0)));
    /* alt keys: */
    bind_key(C.u8((C.i32(((79)-128)))),C.literal("overview"),(C.i8(0)));
    bind_key(C.u8((C.i32(((50)-128)))),C.literal("twoweapon"),(C.i8(0)));
    bind_key(C.u8((C.i32(((78)-128)))),C.literal("name"),(C.i8(0)));
    /* don't do this until the rest_on_space option is set or cleared */
}

export function keylist_func_has_key(extcmd,skip_keys_used)
{
    /* boolean keys_used[256] */
    let i;
    let bind;
    for((i=0);Number(i<256);(i=C.i32((i+1)))) {
        if(C.cell((skip_keys_used+Number(i)*1),"signed char").value) continue;
        if(Number(!!((Number(((bind=cmdbind_get(C.u8(i))))!=0))&&(Number(C.field(bind,"Cmd_bind","cmd").value==extcmd))))) return (C.i8(1));
    }
    return (C.i8(0));
}

export function keylist_putcmds(datawin,docount,incl_flags,excl_flags,keys_used)
{
    datawin=C.i32(datawin);
    docount=C.i8(docount);
    incl_flags=C.i32(incl_flags);
    excl_flags=C.i32(excl_flags);
    const stackFrame=C.stackSave();
    try {
    /* boolean keys_used[256] */
    let extcmd;
    let i;
    let buf=C.stackAlloc((1*256)); let buf2=C.stackAlloc((1*128));
    let keys_already_used=C.stackAlloc((1*256));
    /* copy of keys_used[] before updates */
    let count=0;
    let bind;
    for((i=0);Number(i<256);((i=C.i32((i+1)))-1)) {
        let key=C.u8(i);
        (C.cell((keys_already_used+Number(i)*1),"signed char").value=C.cell((keys_used+Number(i)*1),"signed char").value);
        if(C.cell((keys_used+Number(i)*1),"signed char").value) continue;
        if(Number(!!(Number(C.i32(key)==32)&&Number(!(C.field(C.flags,"flag","rest_on_space").value))))) continue;
        (bind=cmdbind_get(key));
        if(Number(!!(bind&&Number(C.field(bind,"Cmd_bind","cmd").value!=0)))) {
            if(Number(!!((Number(!!(incl_flags&&Number(!((C.u32((C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","flags").value&C.u32(incl_flags)))))))))||(Number(!!(excl_flags&&(C.u32((C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","flags").value&C.u32(excl_flags)))))))))) continue;
            if(docount) {
                ((count=C.i32((count+1)))-1);
                continue;
            }
            if(Number((C.u32((C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","flags").value&C.u32(16384))))!=C.u32(0))) C.variadic(59,buf,C.literal("%-7s %-13s %s \"%s\""),key2txt(key,buf2),C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value,C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_desc").value,C.field(bind,"Cmd_bind","param").value);
 else C.variadic(60,buf,C.literal("%-7s %-13s %s"),key2txt(key,buf2),C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_txt").value,C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_desc").value);
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
            (C.cell((keys_used+Number(i)*1),"signed char").value=(C.i8(1)));
        }
    }
    /* also list commands that lack key assignments; most are wizard mode */
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) {
        if(Number(!!((Number(!!(incl_flags&&Number(!((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(incl_flags)))))))))||(Number(!!(excl_flags&&(C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(excl_flags)))))))))) continue;
        /* can't just check for non-Null extcmd->key; it holds the
           default assignment and a user-specified binding might hijack
           this command's default key for some other command; or this
           command might have been assigned a key being used for
           movement or as a prefix, intercepting that keystroke */
        if(keylist_func_has_key(extcmd,keys_already_used)) continue;
        /* found a command for current category without any key assignment */
        if(docount) {
            ((count=C.i32((count+1)))-1);
            continue;
        }
        /* '#'+20 for one column here == 7+' '+13 for two columns above */
        C.variadic(61,buf,C.literal("#%-20s %s"),C.field(extcmd,"ext_func_tab","ef_txt").value,C.field(extcmd,"ext_func_tab","ef_desc").value);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
    }
    return count;
    } finally {C.stackRestore(stackFrame); }
}

/* list all keys and their bindings, like dat/hh but dynamic */
export function dokeylist()
{
    const stackFrame=C.stackSave();
    try {
    let extcmd;
    let datawin;
    let buf=C.stackAlloc((1*256)); let buf2=C.stackAlloc((1*256));
    let key;
    let spkey_gap; let keys_used=C.stackAlloc((1*256)); let mov_seen=C.stackAlloc((1*256));
    let i; let j; let pfx_seen=C.stackAlloc((4*256));
    C.memset(keys_used,0,BigInt((1*256)));
    C.memset(pfx_seen,0,BigInt((4*256)));
    /* this is actually ambiguous; tty raw mode will override SIGINT;
       when enabled, treat it like a movement command since assigning
       other commands to this keystroke would be unwise... */
    (key=C.u8((C.i32((31&(99))))));
    (C.cell((keys_used+Number(key)*1),"signed char").value=(C.i8(1)));
    /* movement keys have been flagged in keys_used[]; clone them */
    C.memcpy(mov_seen,keys_used,BigInt((1*256)));
    (spkey_gap=(C.i8(0)));
    for((i=0);C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value;(i=C.i32((i+1)))) {
        if(Number(!!(C.i32(C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","numpad").value)&&Number(!(C.field(C.iflags,"instance_flags","num_pad").value))))) continue;
        (j=C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","nhkf").value);
        (key=C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(j)*1),"char").value));
        if(Number(!!(Number(!!(C.i32(key)&&Number(!(C.cell((mov_seen+Number(key)*1),"signed char").value))))&&Number(!(C.cell((pfx_seen+Number(key)*4),"int").value))))) {
            (C.cell((keys_used+Number(key)*1),"signed char").value=(C.i8(1)));
            (C.cell((pfx_seen+Number(key)*4),"int").value=j);
        } else (spkey_gap=(C.i8(1)));
    }
    (datawin=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",5));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
    C.variadic(62,buf,C.literal("%7s %s"),C.literal(""),C.literal("    Full Current Key Bindings List"));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) if(Number(!!(C.i32(spkey_gap)||Number(!(keylist_func_has_key(extcmd,keys_used)))))) {
        C.variadic(63,buf,C.literal("%7s %s"),C.literal(""),C.literal("(also commands with no key assignment)"));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
        break;
    }

    /* directional keys */
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal("Directional keys:"));
    show_direction_keys(datawin,C.i8(46),(C.i8(0)));
    /* '.'==self in direct'n grid */
    if(Number(!(C.field(C.iflags,"instance_flags","num_pad").value))) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal("Ctrl+<direction> will run in specified direction until something very"));
        C.variadic(64,buf,C.literal("%7s %s"),C.literal(""),C.literal("interesting is seen."));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
        C.strcpy(buf,C.literal("Shift"));
        /* append the rest below */
    } else {
        /* num_pad */
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
        C.strcpy(buf,C.literal("Meta"));
        /* append the rest next */
    }
    C.strcat(buf,C.literal("+<direction> will run in specified direction until you encounter"));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
    C.variadic(65,buf,C.literal("%7s %s"),C.literal(""),C.literal("an obstacle."));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal("Miscellaneous keys:"));
    for((i=0);C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value;(i=C.i32((i+1)))) {
        if(Number(!!(C.i32(C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","numpad").value)&&Number(!(C.field(C.iflags,"instance_flags","num_pad").value))))) continue;
        (j=C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","nhkf").value);
        (key=C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(j)*1),"char").value));
        if(Number(!!(Number(!!(C.i32(key)&&Number(!(C.cell((mov_seen+Number(key)*1),"signed char").value))))&&(Number(C.cell((pfx_seen+Number(key)*4),"int").value==j))))) {
            C.variadic(66,buf,C.literal("%-7s %s"),key2txt(key,buf2),C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value);
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
        }
    }
    /* (see above) */
    (key=C.u8((C.i32((31&(99))))));
    /* last of the special keys */
    C.variadic(67,buf,C.literal("%-7s"),key2txt(key,buf2));
    /* first of the keyless commands */
    C.strcat(buf,C.literal(" interrupt: break out of NetHack (SIGINT)"));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
    /* keyless special key commands, if any */
    if(spkey_gap) {
        for((i=0);C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value;(i=C.i32((i+1)))) {
            if(Number(!!(C.i32(C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","numpad").value)&&Number(!(C.field(C.iflags,"instance_flags","num_pad").value))))) continue;
            (j=C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","nhkf").value);
            (key=C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(j)*1),"char").value));
            if(Number(!!(Number(!(key))||(Number(C.cell((pfx_seen+Number(key)*4),"int").value!=j))))) {
                C.variadic(68,buf2,C.literal("[%s]"),spkey_name(j));
                /* lines up with the other unassigned commands which use
                   "#%-20s ", but not with the other special keys */
                C.variadic(69,(C.literal("dokeylist")),2976,buf,BigInt((1*256)),C.literal("%-21s %s"),buf2,C.field((C.misc_keys+Number(i)*C.sizes["cmd_misc_key"]),"cmd_misc_key","desc").value);
                C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,buf);
            }
        }
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
    C.show_menu_controls(datawin,(C.i8(1)));
    if(keylist_putcmds(datawin,(C.i8(1)),8,(C.i32((C.i32((4|64))|1024))),keys_used)) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal("General commands:"));
        keylist_putcmds(datawin,(C.i8(0)),8,(C.i32((C.i32((4|64))|1024))),keys_used);
    }
    if(keylist_putcmds(datawin,(C.i8(1)),0,C.i32((8|(C.i32((C.i32((4|64))|1024))))),keys_used)) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal("Game commands:"));
        keylist_putcmds(datawin,(C.i8(0)),0,C.i32((8|(C.i32((C.i32((4|64))|1024))))),keys_used);
    }
    if(Number(!!(C.i32(C.field(C.flags,"flag","debug").value)&&keylist_putcmds(datawin,(C.i8(1)),4,64,keys_used)))) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal(""));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",datawin,0,C.literal("Debug mode commands:"));
        keylist_putcmds(datawin,(C.i8(0)),4,64,keys_used);
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",datawin,(C.i8(0)));
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",datawin);
    } finally {C.stackRestore(stackFrame); }
}

export function ext_func_tab_from_func(fn)
{
    let extcmd;
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) if(Number(C.field(extcmd,"ext_func_tab","ef_funct").value==fn)) return extcmd;

    return 0;
}

/* returns the key bound to a movement command for given DIR_ and MV_ mode */
export function cmd_from_dir(dir,mode)
{
    dir=C.i32(dir);
    mode=C.i32(mode);
    return cmd_from_func(C.cell(((C.move_funcs+Number(dir)*(8*3))+Number(mode)*8),"int (*)(void)").value);
}

/* return the key bound to extended command */
export function cmd_from_func(fn)
{
    let i;
    let ret=C.i8(0);
    let bind;
    for((bind=C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","cmdbinds").value);bind;(bind=C.field(bind,"Cmd_bind","next").value)) {
        (i=C.i32(C.field(bind,"Cmd_bind","key").value));
        /* skip space; we'll use it below as last resort if no other
           keystroke invokes space's command */
        if(Number(i==32)) continue;
        /* skip digits if number_pad is Off; also skip '-' unless it has
           been bound to something other than what number_pad assigns */
        if(Number(!!((Number(!!((Number(!!(Number(i>=48)&&Number(i<=57))))||(Number(!!(Number(i==45)&&Number(fn==C.functionPointer("do_fight"))))))))&&Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))))) continue;
        if(Number(!!(C.field(bind,"Cmd_bind","cmd").value&&Number(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value==fn)))) {
            if(Number(!!(Number(i>=32)&&Number(i<=126)))) return C.i8(i);
 else {
                (ret=C.i8(i));
            }
        }
    }
    if(Number(!!(Number(!!(Number(((bind=cmdbind_get(C.u8(32))))!=0)&&C.field(bind,"Cmd_bind","cmd").value))&&Number(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value==fn)))) return C.i8(32);
    return ret;
}

/* return visual interpretation of the key bound to extended command,
   or the ext cmd name if not bound to any key. */
export function cmd_from_ecname(ecname)
{
    const cmdnamebuf=C.staticData("cmd_from_ecname","cmdnamebuf",()=>null);
    let extcmd;
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) if(Number(!(C.strcmp(C.field(extcmd,"ext_func_tab","ef_txt").value,ecname)))) {
        let key=cmd_from_func(C.field(extcmd,"ext_func_tab","ef_funct").value);
        if(key) C.variadic(70,cmdnamebuf,C.literal("%s"),C.visctrl(key));
 else C.variadic(71,cmdnamebuf,C.literal("#%s"),ecname);
        return cmdnamebuf;
    }

    (C.cell((cmdnamebuf+Number(0)*1),"char").value=C.i8(0));
    return cmdnamebuf;
}

export function ecname_from_fn(fn)
{
    let extcmd; let cmdptr=0;
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) if(Number(C.field(extcmd,"ext_func_tab","ef_funct").value==fn)) {
        (cmdptr=extcmd);
        return C.field(cmdptr,"ext_func_tab","ef_txt").value;
    }

    return 0;
}

/* return extended command name (without leading '#') for command (*fn)() */
export function cmdname_from_func(fn,outbuf,fullname)
{
    fullname=C.i8(fullname);
    /* function whose command name is wanted */
    /* place to store the result */
    /* False: just enough to disambiguate */
    let extcmd; let cmdptr=0;
    let res=0;
    for((extcmd=C.extcmdlist);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) if(Number(C.field(extcmd,"ext_func_tab","ef_funct").value==fn)) {
        (cmdptr=extcmd);
        (res=C.field(cmdptr,"ext_func_tab","ef_txt").value);
        break;
    }

    if(Number(!(res))) {
        /* make sure output buffer doesn't contain junk or stale data;
           return Null below */
        (C.cell((outbuf+Number(0)*1),"char").value=C.i8(0));
    } else if(fullname) {
        /* easy; the entire command name */
        (res=C.strcpy(outbuf,res));
    } else {
        let matchcmd=C.extcmdlist;
        let len=C.u32(0); let maxlen=C.Strlen_(res,(C.literal("cmdname_from_func")),3130);
        /* find the shortest leading substring which is unambiguous */
        do {
            if(Number((len=C.u32((len+1)))>=maxlen)) break;
            for((extcmd=matchcmd);C.field(extcmd,"ext_func_tab","ef_txt").value;(extcmd=C.ptr((extcmd+Number(C.sizes["struct ext_func_tab"]))))) {
                if(Number(extcmd==cmdptr)) continue;
                if(Number(!!(Number((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(16))))!=C.u32(0))||(Number(!!(Number((C.u32((C.field(extcmd,"ext_func_tab","flags").value&C.u32(4))))!=C.u32(0))&&Number(!(C.field(C.flags,"flag","debug").value)))))))) continue;
                if(Number(!(C.strncmp(res,C.field(extcmd,"ext_func_tab","ef_txt").value,C.u64(len))))) {
                    (matchcmd=extcmd);
                    break;
                }
            }
        } while(C.field(extcmd,"ext_func_tab","ef_txt").value);
        C.copynchars(outbuf,res,C.i32(len));
        /* [note: for Qt, this debugpline writes a couple dozen lines to
            stdout during menu setup when message window isn't ready yet] */
        do {
            if(C.debugcore(C.literal("cmd.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(72,C.literal("shortened %s: \"%s\""),res,outbuf);
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
        (res=outbuf);
    }
    return res;
}

export const spkeys_binds=C=>[[C.NHKF_ESC,C.u8(27),0],[C.NHKF_GETDIR_SELF,C.u8(46),C.literal("getdir.self")],[C.NHKF_GETDIR_SELF2,C.u8(115),C.literal("getdir.self2")],[C.NHKF_GETDIR_HELP,C.u8(63),C.literal("getdir.help")],[C.NHKF_GETDIR_MOUSE,C.u8(95),C.literal("getdir.mouse")],[C.NHKF_COUNT,C.u8(110),C.literal("count")],[C.NHKF_GETPOS_SELF,C.u8(64),C.literal("getpos.self")],[C.NHKF_GETPOS_PICK,C.u8(46),C.literal("getpos.pick")],[C.NHKF_GETPOS_PICK_Q,C.u8(44),C.literal("getpos.pick.quick")],[C.NHKF_GETPOS_PICK_O,C.u8(59),C.literal("getpos.pick.once")],[C.NHKF_GETPOS_PICK_V,C.u8(58),C.literal("getpos.pick.verbose")],[C.NHKF_GETPOS_SHOWVALID,C.u8(36),C.literal("getpos.valid")],[C.NHKF_GETPOS_AUTODESC,C.u8(35),C.literal("getpos.autodescribe")],[C.NHKF_GETPOS_MON_NEXT,C.u8(109),C.literal("getpos.mon.next")],[C.NHKF_GETPOS_MON_PREV,C.u8(77),C.literal("getpos.mon.prev")],[C.NHKF_GETPOS_OBJ_NEXT,C.u8(111),C.literal("getpos.obj.next")],[C.NHKF_GETPOS_OBJ_PREV,C.u8(79),C.literal("getpos.obj.prev")],[C.NHKF_GETPOS_DOOR_NEXT,C.u8(100),C.literal("getpos.door.next")],[C.NHKF_GETPOS_DOOR_PREV,C.u8(68),C.literal("getpos.door.prev")],[C.NHKF_GETPOS_UNEX_NEXT,C.u8(120),C.literal("getpos.unexplored.next")],[C.NHKF_GETPOS_UNEX_PREV,C.u8(88),C.literal("getpos.unexplored.prev")],[C.NHKF_GETPOS_VALID_NEXT,C.u8(122),C.literal("getpos.valid.next")],[C.NHKF_GETPOS_VALID_PREV,C.u8(90),C.literal("getpos.valid.prev")],[C.NHKF_GETPOS_INTERESTING_NEXT,C.u8(97),C.literal("getpos.all.next")],[C.NHKF_GETPOS_INTERESTING_PREV,C.u8(65),C.literal("getpos.all.prev")],[C.NHKF_GETPOS_HELP,C.u8(63),C.literal("getpos.help")],[C.NHKF_GETPOS_LIMITVIEW,C.u8(34),C.literal("getpos.filter")],[C.NHKF_GETPOS_MOVESKIP,C.u8(42),C.literal("getpos.moveskip")],[C.NHKF_GETPOS_MENU,C.u8(33),C.literal("getpos.menu")]];
/* no binding */
export function bind_specialkey(key,command)
{
    key=C.u8(key);
    let i;
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["cmd_spkey_bind"]*29))/BigInt(C.sizes["cmd_spkey_bind"]))))));((i=C.i32((i+1)))-1)) {
        if(Number(!!(Number(!(C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","name").value))||C.strcmp(command,C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","name").value)))) continue;
        (C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","nhkf").value)*1),"char").value=C.i8(key));
        return (C.i8(1));
    }
    return (C.i8(0));
}

export function spkey_name(nhkf)
{
    nhkf=C.i32(nhkf);
    let name=0;
    let i;
    for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["cmd_spkey_bind"]*29))/BigInt(C.sizes["cmd_spkey_bind"]))))));((i=C.i32((i+1)))-1)) {
        if(Number(C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","nhkf").value==nhkf)) {
            (name=((Number(nhkf==C.NHKF_ESC))?C.literal("escape"):C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","name").value));
            break;
        }
    }
    return name;
}

/* returns the text for a one-byte encoding;
 * must be shorter than a tab for proper formatting */
export function key2txt(c,txt)
{
    c=C.u8(c);
    /* sufficiently long buffer */
    /* should probably switch to "SPC", "ESC", "RET"
       since nethack's documentation uses ESC for <escape> */
    if(Number(C.i32(c)==32)) C.variadic(73,txt,C.literal("<space>"));
 else if(Number(C.i32(c)==27)) C.variadic(74,txt,C.literal("<esc>"));
 else if(Number(C.i32(c)==10)) C.variadic(75,txt,C.literal("<enter>"));
 else if(Number(C.i32(c)==127)) C.variadic(76,txt,C.literal("<del>"));
 else C.strcpy(txt,C.visctrl(C.i8(c)));
    /* "<escape>" won't fit */
    /* "<return>" won't fit */
    /* "<delete>" won't fit */
    return txt;
}

export function parseautocomplete(autocomplete,condition)
{
    condition=C.i8(condition);
    let efp;
    let autoc;
    /* break off first autocomplete from the rest; parse the rest */
    if(Number(!!(Number(((autoc=C.strchr(autocomplete,44)))!=0)||Number(((autoc=C.strchr(autocomplete,58)))!=0)))) {
        (C.cell(((autoc=C.ptr((autoc+Number(1))))-Number(1)),"char").value=C.i8(0));
        parseautocomplete(autoc,condition);
    }
    /* strip leading and trailing white space */
    (autocomplete=C.trimspaces(autocomplete));
    if(Number(!(C.cell(autocomplete,"char").value))) return;
    /* take off negation */
    if(Number(C.i32(C.cell(autocomplete,"char").value)==33)) {
        /* unlike most options, a leading "no" might actually be a part of
         * the extended command.  Thus you have to use ! */
        ((autocomplete=C.ptr((autocomplete+Number(1))))-Number(1));
        (autocomplete=C.trimspaces(autocomplete));
        (condition=C.i8(Number(!(condition))));
    }
    /* find and modify the extended command */
    for((efp=C.extcmdlist);C.field(efp,"ext_func_tab","ef_txt").value;((efp=C.ptr((efp+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) {
        if(Number(!(C.strcmp(autocomplete,C.field(efp,"ext_func_tab","ef_txt").value)))) {
            if(Number(C.i32(condition)==(((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(2))))?C.i32((C.i8(0))):C.i32((C.i8(1))))))) {
                if((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(8192))))) (C.field(efp,"ext_func_tab","flags").value=C.u32(C.field(efp,"ext_func_tab","flags").value&C.u32(C.i32((~8192)))));
 else (C.field(efp,"ext_func_tab","flags").value=C.u32(C.field(efp,"ext_func_tab","flags").value|C.u32(8192)));
            }
            if(condition) (C.field(efp,"ext_func_tab","flags").value=C.u32(C.field(efp,"ext_func_tab","flags").value|C.u32(2)));
 else (C.field(efp,"ext_func_tab","flags").value=C.u32(C.field(efp,"ext_func_tab","flags").value&C.u32(C.i32((~2)))));
            return;
        }
    }
    /* not a real extended command */
    C.variadic(77,C.literal("Bad autocomplete: invalid extended command '%s'."),autocomplete);
    C.callProc((C.field(C.windowprocs,"window_procs","win_wait_synch").value),"void (void)");
}

/* add changed autocompletions to the string buffer in config file format */
export function all_options_autocomplete(sbuf)
{
    const stackFrame=C.stackSave();
    try {
    let efp;
    let buf=C.stackAlloc((1*256));
    for((efp=C.extcmdlist);C.field(efp,"ext_func_tab","ef_txt").value;((efp=C.ptr((efp+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) if(Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(8192))))!=C.u32(0))) {
        C.variadic(78,buf,C.literal("AUTOCOMPLETE=%s%s\n"),((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(2))))?C.literal(""):C.literal("!")),C.field(efp,"ext_func_tab","ef_txt").value);
        C.strbuf_append(sbuf,buf);
    }

    } finally {C.stackRestore(stackFrame); }
}

/* return the number of changed autocompletions */
export function count_autocompletions()
{
    let efp;
    let n=0;
    for((efp=C.extcmdlist);C.field(efp,"ext_func_tab","ef_txt").value;((efp=C.ptr((efp+Number(C.sizes["struct ext_func_tab"]))))-Number(C.sizes["struct ext_func_tab"]))) if(Number((C.u32((C.field(efp,"ext_func_tab","flags").value&C.u32(8192))))!=C.u32(0))) ((n=C.i32((n+1)))-1);

    return n;
}

/* save&clear the mouse button actions, or restore the saved ones */
export function lock_mouse_buttons(savebtns)
{
    savebtns=C.i8(savebtns);
    const mousebtn=C.staticData("lock_mouse_buttons","mousebtn",()=>[]);
    let i;
    if(savebtns) {
        for((i=0);Number(i<2);((i=C.i32((i+1)))-1)) {
            (C.cell((mousebtn+Number(i)*8),"struct ext_func_tab *").value=C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(i)*8),"struct ext_func_tab *").value);
            (C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(i)*8),"struct ext_func_tab *").value=0);
        }
    } else {
        for((i=0);Number(i<2);((i=C.i32((i+1)))-1)) (C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(i)*8),"struct ext_func_tab *").value=C.cell((mousebtn+Number(i)*8),"struct ext_func_tab *").value);

    }
}

/* called at startup and after number_pad is twiddled */
export function reset_commands(initial)
{
    initial=C.i8(initial);
    const sdir=C.staticData("reset_commands","sdir",()=>C.literal("hykulnjb><")); const sdir_swap_yz=C.staticData("reset_commands","sdir_swap_yz",()=>C.literal("hzkulnjb><")); const ndir=C.staticData("reset_commands","ndir",()=>C.literal("47896321><")); const ndir_phone_layout=C.staticData("reset_commands","ndir_phone_layout",()=>C.literal("41236987><"));
    const ylist=C.staticData("reset_commands","ylist",()=>[121,89,(C.i32((31&(121)))),(C.i32(((121)-128))),(C.i32(((89)-128))),(C.i32((((C.i32((31&(121)))))-128)))]);
    const back_dir_cmd=C.staticData("reset_commands","back_dir_cmd",()=>null);
    const back_dir_key=C.staticData("reset_commands","back_dir_key",()=>null);
    const backed_dir_cmd=C.staticData("reset_commands","backed_dir_cmd",()=>(C.i8(0)));
    let flagtemp;
    let c; let i; let updated=0;
    let dir; let mode;
    if(initial) {
        (updated=1);
        (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value=(C.i8(0)));
        (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value=(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","phone_layout").value=(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","swap_yz").value=(C.i8(0)))));
        for((i=0);Number(i<C.i32((C.u64((BigInt((C.sizes["cmd_spkey_bind"]*29))/BigInt(C.sizes["cmd_spkey_bind"]))))));((i=C.i32((i+1)))-1)) (C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","nhkf").value)*1),"char").value=C.i8(C.field((C.spkeys_binds+Number(i)*C.sizes["cmd_spkey_bind"]),"cmd_spkey_bind","key").value));

        commands_init();
    } else {
        if(C.cell(backed_dir_cmd,"signed char").value) {
            for((dir=0);Number(dir<(C.i32((C.N_DIRS_Z-2))));((dir=C.i32((dir+1)))-1)) {
                for((mode=0);Number(mode<C.N_MOVEMODES);((mode=C.i32((mode+1)))-1)) {
                    cmdbind_add(C.cell(((back_dir_key+Number(dir)*(1*3))+Number(mode)*1),"unsigned char").value,C.cell(((back_dir_cmd+Number(dir)*(8*3))+Number(mode)*8),"struct ext_func_tab *").value,(C.i8(0)));
                }
            }
        }
        /* basic num_pad */
        (flagtemp=C.field(C.iflags,"instance_flags","num_pad").value);
        if(Number(C.i32(flagtemp)!=C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))) {
            (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value=flagtemp);
            (updated=C.i32((updated+1)));
        }
        /* swap_yz mode (only applicable for !num_pad); intended for
           QWERTZ keyboard used in Central Europe, particularly Germany */
        (flagtemp=C.i8(((C.i32((C.i32(C.field(C.iflags,"instance_flags","num_pad_mode").value)&1)))?Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value)):C.i32((C.i8(0))))));
        if(Number(C.i32(flagtemp)!=C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","swap_yz").value))) {
            (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","swap_yz").value=flagtemp);
            (updated=C.i32((updated+1)));
            /* FIXME? should Cmd.spkeys[] be scanned for y and/or z to swap?
               Cmd.swap_yz has been toggled;
               perform the swap (or reverse previous one) */
            for((i=0);Number(i<C.i32((C.u64((BigInt((4*6))/BigInt(4))))));((i=C.i32((i+1)))-1)) {
                (c=C.i32((C.cell((ylist+Number(i)*4),"int").value&255)));
                cmdbind_swapkeys(C.u8(c),C.u8(C.i32((c+1))));
            }
        }
        /* MSDOS compatibility mode (only applicable for num_pad) */
        (flagtemp=C.i8(((C.i32((C.i32(C.field(C.iflags,"instance_flags","num_pad_mode").value)&1)))?C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value):C.i32((C.i8(0))))));
        if(Number(C.i32(flagtemp)!=C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value))) {
            (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value=flagtemp);
            (updated=C.i32((updated+1)));
            /* pcHack_compat has been toggled */
            /* FIXME: NHKF_DOINV2 ought to be implemented instead of this */
            (c=C.i32(((C.i32(((48)-128)))&255)));
            if(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","pcHack_compat").value) cmdbind_add(C.u8(c),ext_func_tab_from_func(C.functionPointer("dotypeinv")),(C.i8(0)));
 else cmdbind_remove(C.u8(c));
        }
        /* phone keypad layout (only applicable for num_pad) */
        (flagtemp=C.i8(((C.i32((C.i32(C.field(C.iflags,"instance_flags","num_pad_mode").value)&2)))?C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value):C.i32((C.i8(0))))));
        if(Number(C.i32(flagtemp)!=C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","phone_layout").value))) {
            (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","phone_layout").value=flagtemp);
            (updated=C.i32((updated+1)));
            /* phone_layout has been toggled */
            for((i=0);Number(i<3);((i=C.i32((i+1)))-1)) {
                (c=C.i32((49+i)));
                /* 1,2,3 <-> 7,8,9 */
                cmdbind_swapkeys(C.u8(c),C.u8(C.i32((c+6))));
                (c=C.i32(((C.i32(((C.i32(((49)-128)))&255)))+i)));
                /* M-1,M-2,M-3 <-> M-7,M-8,M-9 */
                cmdbind_swapkeys(C.u8(c),C.u8(C.i32((c+6))));
            }
        }
    }
    /*?initial*/
    /* choose updated movement keys */
    if(updated) ((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","serialno").value=C.u32((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","serialno").value+1)))-1);
    (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value=(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))?((Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","swap_yz").value))?sdir:sdir_swap_yz)):((Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","phone_layout").value))?ndir:ndir_phone_layout))));
    (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","alphadirchars").value=(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))?C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value:sdir));
    /* back up the commands & keys overwritten by new movement keys */
    for((dir=0);Number(dir<(C.i32((C.N_DIRS_Z-2))));((dir=C.i32((dir+1)))-1)) {
        for((mode=C.MV_WALK);Number(mode<C.N_MOVEMODES);((mode=C.i32((mode+1)))-1)) {
            let di=C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(dir)*1),"char").value);
            let bind;
            if(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))) {
                if(Number(mode==C.MV_RUN)) (di=C.u8(C.highc(C.i8(di))));
 else if(Number(mode==C.MV_RUSH)) (di=C.u8((C.i32((31&C.i32((di)))))));
            } else {
                if(Number(mode==C.MV_RUN)) (di=C.u8((C.i32((C.i32((di))-128)))));
 else if(Number(mode==C.MV_RUSH)) (di=C.u8((C.i32((C.i32((di))-128)))));
            }
            (C.cell(((back_dir_key+Number(dir)*(1*3))+Number(mode)*1),"unsigned char").value=di);
            if(Number(((bind=cmdbind_get(di)))!=0)) (C.cell(((back_dir_cmd+Number(dir)*(8*3))+Number(mode)*8),"struct ext_func_tab *").value=C.field(bind,"Cmd_bind","cmd").value);
 else (C.cell(((back_dir_cmd+Number(dir)*(8*3))+Number(mode)*8),"struct ext_func_tab *").value=0);
            cmdbind_remove(di);
        }
    }
    (C.cell(backed_dir_cmd,"signed char").value=(C.i8(1)));
    /* bind the new keys to movement commands */
    for((i=0);Number(i<(C.i32((C.N_DIRS_Z-2))));((i=C.i32((i+1)))-1)) {
        bind_key_fn(C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(i)*1),"char").value),C.cell(((C.move_funcs+Number(i)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value);
        if(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))) {
            bind_key_fn(C.u8(C.highc(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(i)*1),"char").value)),C.cell(((C.move_funcs+Number(i)*(8*3))+Number(C.MV_RUN)*8),"int (*)(void)").value);
            bind_key_fn(C.u8((C.i32((31&C.i32((C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(i)*1),"char").value)))))),C.cell(((C.move_funcs+Number(i)*(8*3))+Number(C.MV_RUSH)*8),"int (*)(void)").value);
        } else {
            /* M(number) works when altmeta is on */
            bind_key_fn(C.u8((C.i32((C.i32((C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(i)*1),"char").value))-128)))),C.cell(((C.move_funcs+Number(i)*(8*3))+Number(C.MV_RUN)*8),"int (*)(void)").value);
            /* can't bind highc() or C() of digits. just use the 5 prefix. */
        }
    }
    update_rest_on_space();
    (C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","extcmd_char").value=cmd_from_func(C.functionPointer("doextcmd")));
}

/* called when 'rest_on_space' is toggled, also called by reset_commands()
   from initoptions_init() which takes place before key bindings have been
   processed, and by initoptions_finish() after key bindings so that we
   can remember anything bound to <space> in 'unrestonspace' */
export function update_rest_on_space()
{
    /* cloned from extcmdlist['.'], then slightly modified to be distinct;
       donull is all that's needed for it to operate; command name and
       description get shown by help menu's "Info on what a given key does"
       (which runs the '&' command) and "Full list of keyboard commands" */
    const restonspace=C.staticData("update_rest_on_space","restonspace",()=>[C.u8(32),C.literal("wait"),C.literal("rest one move via 'rest_on_space' option"),C.functionPointer("donull"),C.u32((C.i32((1|128)))),C.literal("waiting")]);
    const unrestonspace=C.staticData("update_rest_on_space","unrestonspace",()=>0);
    let bind=cmdbind_get(C.u8(32));
    /* when 'rest_on_space' is On, <space> will run the #wait command;
       when it is Off, <space> will use 'unrestonspace' which will either
       be Null and elicit "Unknown command ' '." or have some non-Null
       command bound in player's RC file */
    if(Number(!!(bind&&Number(C.field(bind,"Cmd_bind","cmd").value!=restonspace)))) (C.cell(unrestonspace,"struct ext_func_tab *").value=C.field(bind,"Cmd_bind","cmd").value);
    cmdbind_add(C.u8(32),(C.i32(C.field(C.flags,"flag","rest_on_space").value)?restonspace:C.cell(unrestonspace,"struct ext_func_tab *").value),(C.i8(0)));
}

/* commands which accept 'm' prefix to request menu operation or other
   alternate behavior; it's also overloaded for move-without-autopickup;
   there is no overlap between the two groups of commands */
export function accept_menu_prefix(ec)
{
    return C.i8((Number(!!(ec&&(Number((C.u32((C.field(ec,"ext_func_tab","flags").value&C.u32(128))))!=C.u32(0)))))));
}

/* choose a random character, biased towards movement commands, primarily
   for debug-fuzzer testing */
export function randomkey()
{
    const i=C.staticData("randomkey","i",()=>C.u32(0));
    const last_c=C.staticData("randomkey","last_c",()=>C.i8(0));
    let c;
    /* give ^A and ^P a high probability of being repeated */
    if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.cell(last_c,"char").value)==(C.i32((31&(97)))))||Number(C.i32(C.cell(last_c,"char").value)==(C.i32((31&(112))))))))&&Number(C.field(C.program_state,"sinfo","input_state").value==C.commandInp)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3525,(C.literal("randomkey"))),C.rn2(5))):C.rn2(5)))))) return C.cell(last_c,"char").value;
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3528,(C.literal("randomkey"))),C.rn2(16))):C.rn2(16)))) {
        default:
            (c=C.i8(27));
        break;
        case (0):
            (c=C.i8(10));
        break;
        case (1):
            case (2):
                case (3):
                    case (4):
                        (c=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3539,(C.literal("randomkey"))),C.rn2(C.i32((C.i32((126-32))+1))))):C.rn2(C.i32((C.i32((126-32))+1)))))+(32))))));
        break;
        case (5):
            (c=C.i8(((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3542,(C.literal("randomkey"))),C.rn2(2))):C.rn2(2)))?9:32))));
        break;
        case (6):
            (c=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3545,(C.literal("randomkey"))),C.rn2(C.i32((C.i32((122-97))+1))))):C.rn2(C.i32((C.i32((122-97))+1)))))+(97))))));
        break;
        case (7):
            (c=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3548,(C.literal("randomkey"))),C.rn2(C.i32((C.i32((90-65))+1))))):C.rn2(C.i32((C.i32((90-65))+1)))))+(65))))));
        break;
        case (8):
            (c=C.i8(C.field((C.extcmdlist+Number(C.u32((((C.cell(i,"unsigned int").value=C.u32((C.cell(i,"unsigned int").value+1)))-1)%C.u32(C.i32((C.u64((BigInt((C.sizes["struct ext_func_tab"]*171))/BigInt(C.sizes["struct ext_func_tab"])))))))))*C.sizes["struct ext_func_tab"]),"ext_func_tab","key").value));
        break;
        case (9):
            (c=C.i8(35));
        break;
        case (10):
            case (11):
                case (12):
{
                        let d=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3560,(C.literal("randomkey"))),C.rn2((C.i32((C.N_DIRS_Z-2)))))):C.rn2((C.i32((C.N_DIRS_Z-2))))));
                        let m=(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3561,(C.literal("randomkey"))),C.rn2(7))):C.rn2(7)))?C.MV_WALK:((Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3561,(C.literal("randomkey"))),C.rn2(3))):C.rn2(3)))))?C.MV_RUSH:C.MV_RUN)));
                        (c=cmd_from_dir(d,m));
                    }        break;
        case (13):
            (c=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3567,(C.literal("randomkey"))),C.rn2(C.i32((C.i32((57-48))+1))))):C.rn2(C.i32((C.i32((57-48))+1)))))+(48))))));
        break;
        case (14):
            /* any char, but avoid '\0' because it's used for mouse click */
            (c=C.i8(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3571,(C.literal("randomkey"))),C.rnd((C.i32(C.field(C.iflags,"instance_flags","wc_eight_bit_input").value)?255:127)))):C.rnd((C.i32(C.field(C.iflags,"instance_flags","wc_eight_bit_input").value)?255:127))))));
        break;
    }
    if(Number(C.field(C.program_state,"sinfo","input_state").value==C.commandInp)) (C.cell(last_c,"char").value=c);
    return c;
}

export function random_response(buf,sz)
{
    sz=C.i32(sz);
    let c;
    let count=0;
    for(;;) {
        (c=randomkey());
        if(Number(C.i32(c)==10)) break;
        if(Number(C.i32(c)==27)) {
            (count=0);
            break;
        }
        if(Number(count<C.i32((sz-1)))) (C.cell((buf+Number(((count=C.i32((count+1)))-1))*1),"char").value=c);
    }
    (C.cell((buf+Number(count)*1),"char").value=C.i8(0));
}

export function rnd_extcmd_idx()
{
    return C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3603,(C.literal("rnd_extcmd_idx"))),C.rn2(C.i32((C.cell(C.extcmdlist_length,"int").value+1))))):C.rn2(C.i32((C.cell(C.extcmdlist_length,"int").value+1)))))-1));
}

export function reset_cmd_vars(reset_cmdq)
{
    reset_cmdq=C.i8(reset_cmdq);
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(0));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","nopick").value=(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","forcefight").value=(C.i8(0))));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","move").value=(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mv").value=(C.i8(0))));
    (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(0));
    (C.field(C.gm,"instance_globals_m","multi").value=C.i64(0));
    (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel").value=(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel1").value=C.i8(0)));
    if(C.field(C.gt,"instance_globals_t","travelmap").value) {
        C.selection_free(C.field(C.gt,"instance_globals_t","travelmap").value,(C.i8(1)));
        (C.field(C.gt,"instance_globals_t","travelmap").value=0);
    }
    if(reset_cmdq) {
        cmdq_clear(C.CQ_CANNED);
        cmdq_clear(C.CQ_REPEAT);
    }
}

export function rhack(key)
{
    key=C.i32(key);
    const stackFrame=C.stackSave();
    try {
    let bad_command; let firsttime=C.i8((Number(key==0)));
    let cq=C.stackAlloc(C.sizes["struct _cmd_queue"]); let cmdq=0;
    let cmdq_ec=0; let prefix_seen=0;
    let was_m_prefix=(C.i8(0));
    let func=C.functionPointer("dummyfunction");
    (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","nopick").value=C.i8(0));
    got_prefix_input: for(;;) {
        let cmdqJoin=false;
        do_cmdq_extcmd: {
            if(C.field(C.program_state,"sinfo","done_hup").value) end_of_input();
            if(Number(((cmdq=cmdq_pop()))!=0)) {
                /* doing queued commands */
                C.copyRecord(cq,cmdq,C.sizes["struct _cmd_queue"]);
                C.free(cmdq);
                if(Number(!!(Number(C.field(cq,"_cmd_queue","typ").value==C.CMDQ_EXTCMD)&&Number(((cmdq_ec=C.field(cq,"_cmd_queue","ec_entry").value))!=0)))) { cmdqJoin=true; break do_cmdq_extcmd; }
                /* already handled a queued command (goto do_cmdq_extcmd);
           if something other than a key is queued, we'll drop down
           to the !*cmd handling which clears out the command-queue */
                (key=((Number(C.field(cq,"_cmd_queue","typ").value==C.CMDQ_KEY))?C.i32(C.field(cq,"_cmd_queue","key").value):0));
            } else if(firsttime) {
                (key=parse());
                /* parse() pushed a cmd but didn't return any key */
                if(Number(!!(Number(!(key))&&cmdq_peek(C.CQ_CANNED)))) continue got_prefix_input;
            }
            /* if there's no command, there's nothing to do except reset */
            if(Number(!!(Number(!!(Number(!(key))||Number(key==C.i32(C.i8(255)))))||Number(key==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_ESC)*1),"char").value))))) {
                if(Number(key==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_ESC)*1),"char").value))) (C.field(C.iflags,"instance_flags","sanity_no_check").value=C.field(C.iflags,"instance_flags","sanity_check").value);
 else C.callProc((C.field(C.windowprocs,"window_procs","win_nhbell").value),"void (void)");
                /* don't perform next sanity check if player typed ESC for
               the current command, similar to handling for CMD_INSANE
               flag below (^P and ^R) */
                reset_cmd_vars((C.i8(1)));
                return;
            }
            /* handle most movement commands */
            (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel").value=(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel1").value=C.i8(0)));
        }
{
            let tlist;
            let res;
            if(!cmdqJoin) (C.field(C.gc,"instance_globals_c","cmd_bind").value=cmdbind_get(C.u8(C.i32((key&255)))));
            if(cmdq_ec) (tlist=cmdq_ec);
 else (tlist=(C.field(C.gc,"instance_globals_c","cmd_bind").value?C.field(C.field(C.gc,"instance_globals_c","cmd_bind").value,"Cmd_bind","cmd").value:0));
            /* current - use key to directly index cmdlist array */
            if(Number(tlist!=0)) {
                if(Number(!(can_do_extcmd(tlist)))) {
                    /* can_do_extcmd() already gave a message */
                    reset_cmd_vars((C.i8(1)));
                    (res=0);
                } else if(Number(!!(Number(!!(prefix_seen&&Number(!((C.u32((C.field(tlist,"ext_func_tab","flags").value&C.u32(512))))))))&&Number(!((C.u32((C.field(tlist,"ext_func_tab","flags").value&C.u32(((C.i32(was_m_prefix)?128:256))))))))))) {
                    let pfxidx=cmd_from_func(C.field(prefix_seen,"ext_func_tab","ef_funct").value);
                    let which=((Number(C.i32(pfxidx)!=0))?C.visctrl(pfxidx):((Number(C.field(prefix_seen,"ext_func_tab","ef_funct").value==C.functionPointer("do_reqmenu")))?C.literal("move-no-pickup or request-menu"):C.field(prefix_seen,"ext_func_tab","ef_txt").value));
                    /*
                 * We got a prefix previously and looped for another
                 * command instead of returning, but the command we got
                 * doesn't accept a prefix.  The feedback here supersedes
                 * the former call to help_dir() (for 'bad_command' below).
                 */
                    if(was_m_prefix) {
                        C.variadic(79,C.u32(4),C.literal("The %s command does not accept '%s' prefix."),C.field(tlist,"ext_func_tab","ef_txt").value,which);
                    } else {
                        let ch=C.field(tlist,"ext_func_tab","key").value;
                        let up=C.i8((Number(!!(Number(C.i32(ch)==60)||Number(C.field(tlist,"ext_func_tab","ef_funct").value==C.functionPointer("doup")))))); let down=C.i8((Number(!!(Number(C.i32(ch)==62)||Number(C.field(tlist,"ext_func_tab","ef_funct").value==C.functionPointer("dodown"))))));
                        C.variadic(80,C.literal("The '%s' prefix should be followed by a movement command%s."),which,((Number(!!(C.i32(up)||C.i32(down))))?C.literal(" other than up or down"):C.literal("")));
                    }
                    (res=4);
                    (prefix_seen=0);
                } else {
                    /* we discard 'const' because some compilers seem to have
                   trouble with the pointer passed to set_occupation() */
                    (func=C.field((tlist),"ext_func_tab","ef_funct").value);
                    if(Number(!!(Number(!!(C.field(tlist,"ext_func_tab","f_text").value&&Number(!(C.field(C.go,"instance_globals_o","occupation").value))))&&C.field(C.gm,"instance_globals_m","multi").value))) set_occupation(func,C.field(tlist,"ext_func_tab","f_text").value,C.field(C.gm,"instance_globals_m","multi").value);
                    (C.field(C.ge,"instance_globals_e","ext_tlist").value=0);
                    if(Number(!!(Number(!!(Number(!(C.field(C.gi,"instance_globals_i","in_doagain").value))&&Number(func!=C.functionPointer("do_repeat"))))&&Number(func!=C.functionPointer("doextcmd"))))) {
                        if(Number(!(prefix_seen))) cmdq_clear(C.CQ_REPEAT);
                        cmdq_add_ec(C.CQ_REPEAT,C.field((tlist),"ext_func_tab","ef_funct").value);
                    } else {
                        if(Number(func==C.functionPointer("doextcmd"))) {
                            cmdq_clear(C.CQ_REPEAT);
                        }
                    }
                    /* some commands shouldn't trigger sanity_check() because
                   if it produces output that might interfere with them;
                   note: if sanity_check is False, this has no effect */
                    if(Number((C.u32((C.field(tlist,"ext_func_tab","flags").value&C.u32(4096))))!=C.u32(0))) (C.field(C.iflags,"instance_flags","sanity_no_check").value=C.field(C.iflags,"instance_flags","sanity_check").value);
                    (res=C.callProc((func),"int (void)"));
                    /* perform the command */
                    /* if 'func' is doextcmd(), 'tlist' is for Cmd.commands['#']
                   rather than for the command that doextcmd() just ran;
                   doextcmd() notifies us what that was via ext_tlist;
                   other commands leave it Null */
                    if(C.field(C.ge,"instance_globals_e","ext_tlist").value) {
                        ((tlist=C.field(C.ge,"instance_globals_e","ext_tlist").value),(C.field(C.ge,"instance_globals_e","ext_tlist").value=0));
                        /* Add the command post-execution */
                        cmdq_add_ec(C.CQ_REPEAT,C.field((tlist),"ext_func_tab","ef_funct").value);
                        /* shift the command to first */
                        cmdq_shift(C.CQ_REPEAT);
                    }
                    if(Number((C.u32((C.field(tlist,"ext_func_tab","flags").value&C.u32(512))))!=C.u32(0))) {
                        /* it was a prefix command, mark and get another cmd */
                        if(Number((C.i32((res&2)))!=0)) {
                            /* prefix commands cancel if pressed twice */
                            reset_cmd_vars((C.i8(1)));
                            return;
                        }
                        (prefix_seen=tlist);
                        (cmdq_ec=0);
                        if(Number(func==C.functionPointer("do_reqmenu"))) (was_m_prefix=(C.i8(1)));
                        continue got_prefix_input;
                    } else if(Number(!!(Number(!((C.u32((C.field(tlist,"ext_func_tab","flags").value&C.u32(1024))))))&&C.field(C.gd,"instance_globals_d","domove_attempting").value))) {
                        /* not a movement command, but a move prefix earlier? */
                        ;
                        /* just do nothing */
                    } else if(Number(!!(Number(!!((Number((C.i64((C.field(C.gd,"instance_globals_d","domove_attempting").value&C.i64((C.i32((2|1)))))))!=0n))&&Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel").value))))&&Number(!(dxdy_moveok()))))) {
                        /* trying to move diagonally as a grid bug */
                        C.variadic(81,C.literal("get there from here..."));
                        reset_cmd_vars((C.i8(1)));
                        return;
                    } else if(Number((C.i64((C.field(C.gd,"instance_globals_d","domove_attempting").value&C.i64(1))))!=0n)) {
                        if(C.field(C.gm,"instance_globals_m","multi").value) (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mv").value=(C.i8(1)));
                        C.domove();
                        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","forcefight").value=C.i8(0));
                        (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
                        return;
                    } else if(Number((C.i64((C.field(C.gd,"instance_globals_d","domove_attempting").value&C.i64(2))))!=0n)) {
                        if(firsttime) {
                            if(Number(!(C.field(C.gm,"instance_globals_m","multi").value))) (C.field(C.gm,"instance_globals_m","multi").value=C.i64(((Number((80)>(21))?(80):(21)))));
                            (C.field(C.u,"you","last_str_turn").value=0);
                        }
                        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mv").value=(C.i8(1)));
                        C.domove();
                        (C.field(C.iflags,"instance_flags","menu_requested").value=(C.i8(0)));
                        return;
                    }
                    (prefix_seen=0);
                }
                /* it is possible to have a result of (ECMD_TIME|ECMD_CANCEL)
               [for example, using 'f'ire, manually filling quiver with
               wielded weapon or dual-wielded swap-weapon, then cancelling
               at the direction prompt; using time to unwield should take
               precedence over general cancellation] */
                if(Number((C.i32((res&(C.i32((2|4))))))!=0)) {
                    /* command was canceled by user, maybe they declined to
                   pick an object to act on, or command failed to finish */
                    reset_cmd_vars((C.i8(1)));
                } else if(Number((C.i32((res&(C.i32((0|1))))))==0)) {
                    reset_cmd_vars(C.i8(Number(C.field(C.gm,"instance_globals_m","multi").value<C.i64(0))));
                }
                /* reset_cmd_vars() sets context.move to False so we might
               need to change it [back] to True */
                if(Number((C.i32((res&1)))!=0)) {
                    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","move").value=(C.i8(1)));
                    if(Number(func!=C.functionPointer("dokick"))) {
                        /* hero did something else than kicking a location;
                       reset the location, so pets don't avoid it */
                        ((C.field(C.field(C.gk,"instance_globals_k","kickedloc").address,"nhcoord","x").value=C.i16(0)),(C.field(C.field(C.gk,"instance_globals_k","kickedloc").address,"nhcoord","y").value=C.i16(0)));
                    }
                }
                return;
            }
            /* if we reach here, cmd wasn't found in cmdlist[] */
            (bad_command=(C.i8(1)));
        }        if(bad_command) {
            C.variadic(82,C.u32(4),C.literal("Unknown command '%s'."),C.visctrl(C.i8(key)));
            cmdq_clear(C.CQ_CANNED);
            cmdq_clear(C.CQ_REPEAT);
            (C.field(C.iflags,"instance_flags","sanity_no_check").value=C.field(C.iflags,"instance_flags","sanity_check").value);
            /* skip sanity check */
        }
        /* didn't move */
        (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","move").value=(C.i8(0)));
        (C.field(C.gm,"instance_globals_m","multi").value=C.i64(0));
        return;
        break;
    }
    } finally {C.stackRestore(stackFrame); }
}

/* convert an x,y pair into a direction code */
export function xytodir(x,y)
{
    x=C.i32(x);
    y=C.i32(y);
    let dd;
    for((dd=0);Number(dd<(C.i32((C.N_DIRS_Z-2))));((dd=C.i32((dd+1)))-1)) if(Number(!!(Number(x==C.i32(C.cell((C.xdir+Number(dd)*1),"signed char").value))&&Number(y==C.i32(C.cell((C.ydir+Number(dd)*1),"signed char").value))))) return dd;

    return C.DIR_ERR;
}

/* convert a direction code into an x,y pair */
export function dirtocoord(cc,dd)
{
    dd=C.i32(dd);
    if(Number(!!(Number(dd>C.DIR_ERR)&&Number(dd<C.N_DIRS_Z)))) {
        (C.field(cc,"nhcoord","x").value=C.i16(C.cell((C.xdir+Number(dd)*1),"signed char").value));
        (C.field(cc,"nhcoord","y").value=C.i16(C.cell((C.ydir+Number(dd)*1),"signed char").value));
    }
}

/* also sets u.dz, but returns false for <> */
export function movecmd(sym,mode)
{
    sym=C.i8(sym);
    mode=C.i32(mode);
    let d=C.DIR_ERR;
    let bind=cmdbind_get(C.u8(sym));
    if(Number(!!(bind&&C.field(bind,"Cmd_bind","cmd").value))) {
        let fnc=C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value;
        if(Number(mode==C.MV_ANY)) {
            for((d=C.i32((C.N_DIRS_Z-1)));Number(d>C.DIR_ERR);((d=C.i32((d-1)))+1)) if(Number(!!(Number(!!(Number(fnc==C.cell(((C.move_funcs+Number(d)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value)||Number(fnc==C.cell(((C.move_funcs+Number(d)*(8*3))+Number(C.MV_RUN)*8),"int (*)(void)").value)))||Number(fnc==C.cell(((C.move_funcs+Number(d)*(8*3))+Number(C.MV_RUSH)*8),"int (*)(void)").value)))) break;

        } else {
            for((d=C.i32((C.N_DIRS_Z-1)));Number(d>C.DIR_ERR);((d=C.i32((d-1)))+1)) if(Number(fnc==C.cell(((C.move_funcs+Number(d)*(8*3))+Number(mode)*8),"int (*)(void)").value)) break;

        }
    }
    if(Number(d!=C.DIR_ERR)) {
        (C.field(C.u,"you","dx").value=C.i32(C.cell((C.xdir+Number(d)*1),"signed char").value));
        (C.field(C.u,"you","dy").value=C.i32(C.cell((C.ydir+Number(d)*1),"signed char").value));
        (C.field(C.u,"you","dz").value=C.i32(C.cell((C.zdir+Number(d)*1),"signed char").value));
        return Number(!(C.field(C.u,"you","dz").value));
    }
    (C.field(C.u,"you","dz").value=0);
    return 0;
}

/* grid bug handling */
export function dxdy_moveok()
{
    if(Number(!!(Number(!!(C.field(C.u,"you","dx").value&&C.field(C.u,"you","dy").value))&&(Number((C.field(C.u,"you","umonnum").value)==C.PM_GRID_BUG))))) (C.field(C.u,"you","dx").value=(C.field(C.u,"you","dy").value=0));
    return Number(!!(C.field(C.u,"you","dx").value||C.field(C.u,"you","dy").value));
}

/* decide whether character (user input keystroke) requests screen repaint */
export function redraw_cmd(c)
{
    c=C.i8(c);
    let uc=C.u8(c);
    let bind=cmdbind_get(uc);
    return C.i8((Number(!!(Number(!!(bind&&C.field(bind,"Cmd_bind","cmd").value))&&Number(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value==C.functionPointer("doredraw"))))));
}

/*
 * uses getdir() but unlike getdir() it specifically
 * produces coordinates using the direction from getdir()
 * and verifies that those coordinates are ok.
 *
 * If the call to getdir() returns 0, Never_mind is displayed.
 * If the resulting coordinates are not okay, emsg is displayed.
 *
 * Returns non-zero if coordinates in cc are valid.
 */
export function get_adjacent_loc(prompt,emsg,x,y,cc)
{
    x=C.i16(x);
    y=C.i16(y);
    let new_x; let new_y;
    if(Number(!(getdir(prompt)))) {
        C.variadic(83,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_Never_mind").value);
        return 0;
    }
    (new_x=C.i16(C.i32((C.i32(x)+C.field(C.u,"you","dx").value))));
    (new_y=C.i16(C.i32((C.i32(y)+C.field(C.u,"you","dy").value))));
    if(Number(!!(cc&&isok(new_x,new_y)))) {
        (C.field(cc,"nhcoord","x").value=new_x);
        (C.field(cc,"nhcoord","y").value=new_y);
    } else {
        if(emsg) C.variadic(84,C.literal("%s"),emsg);
        return 0;
    }
    return 1;
}

/* prompt for a direction (specified via movement keystroke) and return it
   in u.dx, u.dy, and u.dz; function return value is 1 for ok, 0 otherwise */
export function getdir(s)
{
    const stackFrame=C.stackSave();
    try {
    let dirsym;
    let is_mov;
    let cmdq=cmdq_pop();
    let queuedDirJoin=false;
    got_dirsym: {
        if(cmdq) {
            if(Number(C.field(cmdq,"_cmd_queue","typ").value==C.CMDQ_DIR)) {
                if(Number(!(C.field(cmdq,"_cmd_queue","dirz").value))) {
                    (dirsym=C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(xytodir(C.i32(C.field(cmdq,"_cmd_queue","dirx").value),C.i32(C.field(cmdq,"_cmd_queue","diry").value)))*1),"char").value);
                } else {
                    (dirsym=C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(((Number(C.i32(C.field(cmdq,"_cmd_queue","dirz").value)>0))?C.DIR_DOWN:C.DIR_UP))*1),"char").value);
                }
            } else if(Number(C.field(cmdq,"_cmd_queue","typ").value==C.CMDQ_KEY)) {
                (dirsym=C.field(cmdq,"_cmd_queue","key").value);
            } else {
                cmdq_clear(C.CQ_CANNED);
                (dirsym=C.i8(0));
                C.variadic(85,C.literal("getdir: command queue had no dir?"));
            }
            C.free(cmdq);
            { queuedDirJoin=true; break got_dirsym; }
        }
    }
    retry: for(;;) {
        if(!queuedDirJoin) {
            (C.field(C.program_state,"sinfo","input_state").value=C.getdirInp);
            if(Number(!!(C.field(C.gi,"instance_globals_i","in_doagain").value||C.i32(C.cell(C.cell(C.readchar_queue,"char *").value,"char").value)))) {
                (dirsym=readchar());
            } else {
                (dirsym=yn_function(((Number(!!(s&&Number(C.i32(C.cell(s,"char").value)!=94))))?s:C.literal("In what direction?")),0,C.i8(0),(C.i8(0))));
                /* for the fuzzer, usually force the result to be a valid direction,
           but sometimes let it exercise the invalid direction code; we
           don't try to enforce no-diagonal for hero in grid bug form since
           things like '^' to look at adjacent trap shouldn't be bound by
           that (caller is expected to handle situations where it matters) */
                if(Number(!!(C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3996,(C.literal("getdir"))),C.rn2(20))):C.rn2(20)))))) {
                    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3997,(C.literal("getdir"))),C.rn2(20))):C.rn2(20)))) {
                        case (0):
                            (dirsym=C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),3999,(C.literal("getdir"))),C.rn2(2))):C.rn2(2)))?C.NHKF_GETDIR_SELF:C.NHKF_ESC))*1),"char").value);
                        break;
                        case (1):
                            (dirsym=C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),4002,(C.literal("getdir"))),C.rn2(2))):C.rn2(2)))?C.DIR_DOWN:C.DIR_UP))*1),"char").value);
                        break;
                        default:
                            (dirsym=C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","dirchars").value+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),4005,(C.literal("getdir"))),C.rn2((C.i32((C.N_DIRS_Z-2)))))):C.rn2((C.i32((C.N_DIRS_Z-2)))))))*1),"char").value);
                        break;
                    }
                }
            }
            /* remove the prompt string so caller won't have to */
            C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
            if(redraw_cmd(dirsym)) {
                /* ^R */
                C.docrt_flags(C.docrtRefresh);
                /* redraw */
                continue retry;
            }
            if(Number(!(C.field(C.gi,"instance_globals_i","in_doagain").value))) cmdq_add_key(C.CQ_REPEAT,dirsym);
        }
        queuedDirJoin=false;
        if(Number(!!(Number(C.i32(dirsym)==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_GETDIR_SELF)*1),"char").value))||Number(C.i32(dirsym)==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_GETDIR_SELF2)*1),"char").value))))) {
            (C.field(C.u,"you","dx").value=(C.field(C.u,"you","dy").value=(C.field(C.u,"you","dz").value=0)));
        } else if(Number(C.i32(dirsym)==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_GETDIR_MOUSE)*1),"char").value))) {
            let qbuf=C.stackAlloc((1*128));
            let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
            let pos; let mod;
            /*
         * For #therecmdmenu:
         * Player has entered the 'simulated mouse' key ('_' by default)
         * at the "which direction?" prompt so we use getpos() to get a
         * simulated click after moving cursor to the desired location.
         *
         * getpos() returns 0..3 for period, comma, semi-colon, colon.
         * We treat "," as left click and "." as right click due to
         * their positions relative to each other on the keyboard.
         * Using ";" as synonym for "," and ":" for "." is due to their
         * shapes rather than to their keyboard location.
         *
         * Those keys aren't separately bindable for being treated as
         * clicks but we do honor their getpos bindings if player has
         * changed them.  (Bound values might have scrambled keyboard
         * locations relative to each other so ruin the memory aid of
         * "," being left of ".".)
         */
            C.variadic(86,qbuf,C.literal("desired location, then type '%s' for left click, '%s' for right"),C.visctrl(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_GETPOS_PICK_Q)*1),"char").value),C.visctrl(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_GETPOS_PICK)*1),"char").value));
            /* visctrl() cycles through several static buffers for its
                   return value so using two in the same expression is ok */
            /* ',' */
            /* '.' */
            ((C.field(cc,"nhcoord","x").value=C.field(C.u,"you","ux").value),(C.field(cc,"nhcoord","y").value=C.field(C.u,"you","uy").value));
            /* starting cursor location for getpos() */
            (pos=C.getpos(cc,(C.i8(1)),qbuf));
            if(Number(pos<0)) {
                /* ESC or other rejection */
                (C.field(C.u,"you","dx").value=(C.field(C.u,"you","dy").value=(C.field(C.u,"you","dz").value=0)));
                (mod=0);
                /* neither CLICK_1 nor CLICK_2 */
            } else {
                /* caller expects simulated click to be relative to hero's spot */
                (C.field(C.u,"you","dx").value=C.i32((C.i32(C.field(cc,"nhcoord","x").value)-C.i32(C.field(C.u,"you","ux").value))));
                (C.field(C.u,"you","dy").value=C.i32((C.i32(C.field(cc,"nhcoord","y").value)-C.i32(C.field(C.u,"you","uy").value))));
                /* non-zero getdir_click actually means ok to click farther than
               one spot away from hero; adjacent click is always allowed */
                if(Number(!(C.field(C.iflags,"instance_flags","getdir_click").value))) {
                    (C.field(C.u,"you","dx").value=C.sgn(C.field(C.u,"you","dx").value));
                    (C.field(C.u,"you","dy").value=C.sgn(C.field(C.u,"you","dy").value));
                }
                (C.field(C.u,"you","dz").value=0);
                switch(C.i32((pos+C.NHKF_GETPOS_PICK))) {
                    case (C.NHKF_GETPOS_PICK_Q):
                        /* 1: quick:   ',' */
                        case (C.NHKF_GETPOS_PICK_O):
                            /* 2: once:    ';' */
                            (mod=1);
                    break;
                    case (C.NHKF_GETPOS_PICK):
                        /* 0: normal:  '.' */
                        case (C.NHKF_GETPOS_PICK_V):
                            /* 3: verbose: ':' */
                            (mod=2);
                    break;
                    default:
                        /* could plug in bound values for spkeys[NHKF_GETPOS_PICK],&c
                   but that feels like overkill for something which should
                   never happen; just show their default values */
                        C.variadic(87,C.literal("getpos successful but not one of [.,;:] (%d)"),pos);
                    (mod=0);
                    /* neither CLICK_1 nor CLICK_2 */
                    (pos=C.i32((-1)));
                    /* return failure */
                    break;
                }
            }
            if(C.field(C.iflags,"instance_flags","getdir_click").value) (C.field(C.iflags,"instance_flags","getdir_click").value=mod);
            return (Number(pos>=0));
        } else if(Number(!!(Number(!(((is_mov=movecmd(dirsym,C.MV_ANY)))))&&Number(!(C.field(C.u,"you","dz").value))))) {
            let did_help=(C.i8(0)); let help_requested;
            if(Number(!(C.strchr(C.quitchars,C.i32(dirsym))))) {
                (help_requested=C.i8((Number(C.i32(dirsym)==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_GETDIR_HELP)*1),"char").value)))));
                if(Number(!!(C.i32(help_requested)||C.i32(C.field(C.iflags,"instance_flags","cmdassist").value)))) {
                    (did_help=help_dir(C.i8(((Number(!!(s&&Number(C.i32(C.cell(s,"char").value)==94))))?C.i32(dirsym):0)),C.u8(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_ESC)*1),"char").value),(C.i32(help_requested)?0:C.literal("Invalid direction key!"))));
                    if(help_requested) continue retry;
                }
                if(Number(!(did_help))) C.variadic(88,C.literal("What a strange direction!"));
            }
            return 0;
        } else if(Number(!!(is_mov&&Number(!(dxdy_moveok()))))) {
            C.variadic(89,C.literal("orient yourself that direction."));
            return 0;
        }
        if(Number(!(C.field(C.u,"you","dz").value))) confdir((C.i8(0)));
        return 1;
    }
    } finally {C.stackRestore(stackFrame); }
}

export function show_direction_keys(win,centerchar,nodiag)
{
    win=C.i32(win);
    centerchar=C.i8(centerchar);
    nodiag=C.i8(nodiag);
    const stackFrame=C.stackSave();
    try {
    /* should specify a window which is using a fixed-width font */
    /* '.' or '@' or ' ' */
    let buf=C.stackAlloc((1*256));
    if(Number(!(centerchar))) (centerchar=C.i8(32));
    if(nodiag) {
        C.variadic(90,buf,C.literal("             %s   "),C.visctrl(cmd_from_func(C.functionPointer("do_move_north"))));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("             |   "));
        C.variadic(91,buf,C.literal("          %s- %c -%s"),C.visctrl(cmd_from_func(C.functionPointer("do_move_west"))),C.i32(centerchar),C.visctrl(cmd_from_func(C.functionPointer("do_move_east"))));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("             |   "));
        C.variadic(92,buf,C.literal("             %s   "),C.visctrl(cmd_from_func(C.functionPointer("do_move_south"))));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
    } else {
        C.variadic(93,buf,C.literal("          %s  %s  %s"),C.visctrl(cmd_from_func(C.functionPointer("do_move_northwest"))),C.visctrl(cmd_from_func(C.functionPointer("do_move_north"))),C.visctrl(cmd_from_func(C.functionPointer("do_move_northeast"))));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("           \\ | / "));
        C.variadic(94,buf,C.literal("          %s- %c -%s"),C.visctrl(cmd_from_func(C.functionPointer("do_move_west"))),C.i32(centerchar),C.visctrl(cmd_from_func(C.functionPointer("do_move_east"))));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("           / | \\ "));
        C.variadic(95,buf,C.literal("          %s  %s  %s"),C.visctrl(cmd_from_func(C.functionPointer("do_move_southwest"))),C.visctrl(cmd_from_func(C.functionPointer("do_move_south"))),C.visctrl(cmd_from_func(C.functionPointer("do_move_southeast"))));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
    }
    ;
    } finally {C.stackRestore(stackFrame); }
}

/* explain choices if player has asked for getdir() help or has given
   an invalid direction after a prefix key ('F', 'g', 'm', &c), which
   might be bogus but could be up, down, or self when not applicable */
export function help_dir(sym,spkey,msg)
{
    sym=C.i8(sym);
    spkey=C.u8(spkey);
    const stackFrame=C.stackSave();
    try {
    /* actual key; either prefix or ESC */
    const wiz_only_list=C.staticData("help_dir","wiz_only_list",()=>C.literal("EFGIVW"));
    let ctrl;
    let win;
    let buf=C.stackAlloc((1*256)); let buf2=C.stackAlloc((1*256)); let explain;
    let dothat;
    /*, *how */
    let prefixhandling;
    /*, viawindow */
    /* NHKF_ESC indicates that player asked for help at getdir prompt */
    /* viawindow = (spkey == gc.Cmd.spkeys[NHKF_ESC] || iflags.cmdassist); */
    (prefixhandling=C.i8((Number(C.i32(spkey)!=C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_ESC)*1),"char").value)))));
    /*
     * Handling for prefix keys that don't want special directions.
     * Delivered via pline if 'cmdassist' is off, or instead of the
     * general message if it's on.
     */
    (dothat=C.literal("do that"));
    /* how = " at"; */
    /* for "<action> at yourself"; not used for up/down */
    (C.cell((buf+Number(0)*1),"char").value=C.i8(0));
    /* Since prefix keys got 'promoted' to commands, feedback for
         * invalid prefix is done in rhack() these days.
         */
    /* for movement prefix followed by '.' or (numpad && 's') to mean 'self';
       note: '-' for hands (inventory form of 'self') is not handled here */
    /* for movement prefix followed by up or down */
    /* was "upwards" and "downwards", but they're considered
                   to be variants of canonical "upward" and "downward" */
    /* if '!cmdassist', display via pline() and we're done (note: asking
       for help at getdir() prompt forces cmdassist for this operation) */
    /* when 'cmdassist' is off and caller doesn't insist, do nothing */
    ((prefixhandling));
    (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",5));
    if(Number(!(win))) return (C.i8(0));
    if(C.cell(buf,"char").value) {
        /* show bad-prefix message instead of general invalid-direction one */
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
    } else if(msg) {
        C.variadic(96,buf,C.literal("cmdassist: %s"),msg);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
    }
    if(Number(!!(Number(!(prefixhandling))&&(Number(!!(C.i32(C.letter(sym))||Number(C.i32(sym)==91))))))) {
        /* '[': old 'cmdhelp' showed ESC as ^[ */
        (sym=C.highc(sym));
        /* @A-Z[ (note: letter() accepts '@') */
        (ctrl=C.i8(C.i32(((C.i32((C.i32(sym)-65)))+1))));
        /* 0-27 (note: 28-31 aren't applicable) */
        if(Number(!!(Number(((explain=C.dowhatdoes_core(ctrl,buf2)))!=0)&&(Number(!!(Number(!(C.strchr(wiz_only_list,C.i32(sym))))||C.i32(C.field(C.flags,"flag","debug").value))))))) {
            C.variadic(97,buf,C.literal("Are you trying to use ^%c%s?"),C.i32(sym),(C.strchr(wiz_only_list,C.i32(sym))?C.literal(""):C.literal(" as specified in the Guidebook")));
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,explain);
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("To use that command, hold down the <Ctrl> key as a shift"));
            C.variadic(98,buf,C.literal("and press the <%c> key."),C.i32(sym));
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
        }
    }
    C.variadic(99,buf,C.literal("Valid direction keys%s%s%s are:"),(C.i32(prefixhandling)?C.literal(" to "):C.literal("")),(C.i32(prefixhandling)?dothat:C.literal("")),((Number((C.field(C.u,"you","umonnum").value)==C.PM_GRID_BUG))?C.literal(" in your current form"):C.literal("")));
    C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
    show_direction_keys(win,C.i8((Number(!(prefixhandling))?46:32)),C.i8((Number((C.field(C.u,"you","umonnum").value)==C.PM_GRID_BUG))));
    if(Number(!(prefixhandling))) {
        /* NOPICKUP: unlike the other prefix keys, 'm' allows up/down for
           stair traversal; we won't get here when "m<" or "m>" has been
           given but we include up and down for 'm'+invalid_direction;
           self is excluded as a viable direction for every prefix */
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("          <  up"));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("          >  down"));
        if(Number(!(prefixhandling))) {
            let selfi=(C.i32(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value)?C.NHKF_GETDIR_SELF2:C.NHKF_GETDIR_SELF);
            C.variadic(100,buf,C.literal("       %4s  direct at yourself"),C.visctrl(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(selfi)*1),"char").value));
            C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,buf);
        }
    }
    if(msg) {
        /* non-null msg means that this wasn't an explicit user request */
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal(""));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putstr").value),"void (winid, int, const char *)",win,0,C.literal("(Suppress this message with !cmdassist in config file.)"));
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",win,(C.i8(0)));
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
    return (C.i8(1));
    } finally {C.stackRestore(stackFrame); }
}

/* if hero is impaired, pick random movement direction */
export function confdir(force_impairment)
{
    force_impairment=C.i8(force_impairment);
    if(Number(!!(C.i32(force_impairment)||C.i32(C.u_maybe_impaired())))) {
        let kmax=((Number((C.field(C.u,"you","umonnum").value)==C.PM_GRID_BUG))?(C.i32(Math.trunc(((C.i32((C.N_DIRS_Z-2)))/2)))):(C.i32((C.N_DIRS_Z-2)))); let k=C.i32(C.cell((C.dirs_ord+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),4304,(C.literal("confdir"))),C.rn2(kmax))):C.rn2(kmax))))*1),"signed char").value);
        (C.field(C.u,"you","dx").value=C.i32(C.cell((C.xdir+Number(k)*1),"signed char").value));
        (C.field(C.u,"you","dy").value=C.i32(C.cell((C.ydir+Number(k)*1),"signed char").value));
    }
    return;
}

export function directionname(dir)
{
    dir=C.i32(dir);
    const dirnames=C.staticData("directionname","dirnames",()=>[C.literal("west"),C.literal("northwest"),C.literal("north"),C.literal("northeast"),C.literal("east"),C.literal("southeast"),C.literal("south"),C.literal("southwest"),C.literal("down"),C.literal("up")]);
    if(Number(!!(Number(dir<0)||Number(dir>=C.N_DIRS_Z)))) return C.literal("invalid");
    return C.cell((dirnames+Number(dir)*8),"char *").value;
}

export function isok(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    /* x corresponds to curx, so x==1 is the first column. Ach. %% */
    return Number(!!(Number(!!(Number(!!(Number(C.i32(x)>=1)&&Number(C.i32(x)<=C.i32((80-1)))))&&Number(C.i32(y)>=0)))&&Number(C.i32(y)<=C.i32((21-1)))));
}

/* #herecmdmenu command */
export function doherecmdmenu()
{
    let ch=here_cmd_menu();
    return ((Number(!!(C.i32(ch)&&Number(C.i32(ch)!=27))))?1:0);
}

/* #therecmdmenu command, a way to test there_cmd_menu without mouse */
export function dotherecmdmenu()
{
    let ch;
    let dir; let click;
    let x=C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value;
    let y=C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value;
    (C.field(C.iflags,"instance_flags","getdir_click").value=C.i32((1|2)));
    /* allow 'far' click */
    if(isok(x,y)) {
        if(Number(!!(Number(C.i32(x)==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32(y)==C.i32(C.field(C.u,"you","uy").value))))) (ch=here_cmd_menu());
 else (ch=there_cmd_menu(x,y,C.field(C.iflags,"instance_flags","getdir_click").value));
        (C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value=(C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value=C.i16(C.i32((-1)))));
        (C.field(C.iflags,"instance_flags","getdir_click").value=0);
        return ((Number(!!(C.i32(ch)&&Number(C.i32(ch)!=27))))?1:0);
    }
    (dir=getdir(0));
    (click=C.field(C.iflags,"instance_flags","getdir_click").value);
    (C.field(C.iflags,"instance_flags","getdir_click").value=0);
    if(Number(!!(Number(!(dir))||Number(!(isok(C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.field(C.u,"you","dx").value))),C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.field(C.u,"you","dy").value))))))))) return 2;
    if(Number(!!(C.field(C.u,"you","dx").value||C.field(C.u,"you","dy").value))) (ch=there_cmd_menu(C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.field(C.u,"you","dx").value))),C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.field(C.u,"you","dy").value))),click));
 else (ch=here_cmd_menu());
    return ((Number(!!(C.i32(ch)&&Number(C.i32(ch)!=27))))?1:0);
}

/* commands for [t]herecmdmenu */
export function mcmd_addmenu(win,act,txt)
{
    win=C.i32(win);
    act=C.i32(act);
    const stackFrame=C.stackSave();
    try {
    let any=C.stackAlloc(C.sizes["union any"]);
    let clr=8;
    /* TODO: fixed letters for the menu entries? */
    C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_int").value=act);
    C.add_menu(win,C.nul_glyphinfo,any,C.i8(0),C.i8(0),0,clr,txt,0);
    } finally {C.stackRestore(stackFrame); }
}

/* command menu entries when targeting self */
export function there_cmd_menu_self(win,x,y,act)
{
    win=C.i32(win);
    x=C.i16(x);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    try {
    let K=0;
    let buf=C.stackAlloc((1*256));
    let typ=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value;
    let stway=C.stairway_at(x,y);
    let ttmp;
    if(Number(!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))) return K;
    if(Number(!!((Number(!!((Number(C.i32((typ))==C.FOUNTAIN))||(Number(C.i32((typ))==C.SINK)))))&&C.i32(C.can_reach_floor((C.i8(0))))))) {
        C.variadic(101,buf,C.literal("Drink from the %s"),C.field((C.defsyms+Number(((Number(C.i32((typ))==C.FOUNTAIN))?C.S_fountain:C.S_sink))*C.sizes["struct symdef"]),"symdef","explanation").value);
        (mcmd_addmenu(win,C.MCMD_QUAFF,buf),(K=C.i32((K+1))));
    }
    if(Number(!!((Number(C.i32((typ))==C.FOUNTAIN))&&C.i32(C.can_reach_floor((C.i8(0))))))) (mcmd_addmenu(win,C.MCMD_DIP,C.literal("Dip something into the fountain")),(K=C.i32((K+1))));
    if((Number(C.i32((typ))==C.THRONE))) (mcmd_addmenu(win,C.MCMD_SIT,C.literal("Sit on the throne")),(K=C.i32((K+1))));
    if((Number(C.i32((typ))==C.ALTAR))) (mcmd_addmenu(win,C.MCMD_OFFER,C.literal("Sacrifice something on the altar")),(K=C.i32((K+1))));
    if(Number(!!(stway&&C.i32(C.field(stway,"stairway","up").value)))) {
        C.variadic(102,buf,C.literal("Go up the %s"),(C.i32(C.field(stway,"stairway","isladder").value)?C.literal("ladder"):C.literal("stairs")));
        (mcmd_addmenu(win,C.MCMD_UP,buf),(K=C.i32((K+1))));
    }
    if(Number(!!(stway&&Number(!(C.field(stway,"stairway","up").value))))) {
        C.variadic(103,buf,C.literal("Go down the %s"),(C.i32(C.field(stway,"stairway","isladder").value)?C.literal("ladder"):C.literal("stairs")));
        (mcmd_addmenu(win,C.MCMD_DOWN,buf),(K=C.i32((K+1))));
    }
    if(C.field(C.u,"you","usteed").value) {
        /* another movement choice */
        C.variadic(104,buf,C.literal("Dismount %s"),C.x_monnam(C.field(C.u,"you","usteed").value,1,0,8,(C.i8(0))));
        (mcmd_addmenu(win,C.MCMD_DISMOUNT,buf),(K=C.i32((K+1))));
    }
    /* before objects */
    if((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value!=0))) {
        let otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value;
        C.variadic(105,buf,C.literal("Pick up %s"),(C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value?C.literal("items"):C.doname(otmp)));
        (mcmd_addmenu(win,C.MCMD_PICKUP,buf),(K=C.i32((K+1))));
        if((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((otmp),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) {
            C.variadic(106,buf,C.literal("Loot %s"),C.doname(otmp));
            (mcmd_addmenu(win,C.MCMD_LOOT,buf),(K=C.i32((K+1))));
            C.variadic(107,buf,C.literal("Tip %s"),C.doname(otmp));
            (mcmd_addmenu(win,C.MCMD_TIP,buf),(K=C.i32((K+1))));
        }
        if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.FOOD_CLASS)) {
            C.variadic(108,buf,C.literal("Eat %s"),C.doname(otmp));
            (mcmd_addmenu(win,C.MCMD_EAT,buf),(K=C.i32((K+1))));
        }
    }
    if(C.field(C.gi,"instance_globals_i","invent").value) {
        (mcmd_addmenu(win,C.MCMD_INVENTORY,C.literal("Inventory")),(K=C.i32((K+1))));
        (mcmd_addmenu(win,C.MCMD_DROP,C.literal("Drop items")),(K=C.i32((K+1))));
    }
    (mcmd_addmenu(win,C.MCMD_REST,C.literal("Rest one turn")),(K=C.i32((K+1))));
    (mcmd_addmenu(win,C.MCMD_SEARCH,C.literal("Search around you")),(K=C.i32((K+1))));
    (mcmd_addmenu(win,C.MCMD_LOOK_HERE,C.literal("Look at what is here")),(K=C.i32((K+1))));
    if(Number(C.num_spells()>0)) (mcmd_addmenu(win,C.MCMD_CAST_SPELL,C.literal("Cast a spell")),(K=C.i32((K+1))));
    if(Number(!!(Number(((ttmp=C.t_at(x,y)))!=0)&&C.i32(C.field(ttmp,"trap","tseen").value)))) {
        if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)!=C.VIBRATING_SQUARE)) (mcmd_addmenu(win,C.MCMD_UNTRAP_HERE,C.literal("Attempt to disarm trap")),(K=C.i32((K+1))));
    }
    return K;
    } finally {C.stackRestore(stackFrame); }
}

/* add entries to there_cmd_menu, when x,y is next to hero */
export function there_cmd_menu_next2u(win,x,y,mod,act)
{
    win=C.i32(win);
    x=C.i16(x);
    y=C.i16(y);
    mod=C.i32(mod);
    const stackFrame=C.stackSave();
    try {
    let K=0;
    let buf=C.stackAlloc((1*256));
    let typ=C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value;
    let ttmp;
    let mtmp;
    if(Number(!((Number(C.dist2(((x)),((y)),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))) return K;
    if((Number(C.i32((typ))==C.DOOR))) {
        let key_or_pick; let card;
        let dm=C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value);
        if((C.i32((dm&(C.i32((4|8))))))) {
            (mcmd_addmenu(win,C.MCMD_OPEN_DOOR,C.literal("Open the door")),(K=C.i32((K+1))));
            /* unfortunately there's no lknown flag for doors to
               remember the locked/unlocked state */
            (key_or_pick=C.i8((Number(!!(C.carrying(C.SKELETON_KEY)||C.carrying(C.LOCK_PICK))))));
            (card=C.i8((Number(C.carrying(C.CREDIT_CARD)!=0))));
            if(Number(!!(C.i32(key_or_pick)||C.i32(card)))) {
                C.variadic(109,buf,C.literal("%sunlock the door"),(C.i32(key_or_pick)?C.literal("lock or "):C.literal("")));
                (mcmd_addmenu(win,C.MCMD_LOCK_DOOR,C.upstart(buf)),(K=C.i32((K+1))));
            }
            /* unfortunately there's no tknown flag for doors (or chests)
               to remember whether a trap had been found */
            (mcmd_addmenu(win,C.MCMD_UNTRAP_DOOR,C.literal("Search the door for a trap")),(K=C.i32((K+1))));
            /* [what about #force?] */
            (mcmd_addmenu(win,C.MCMD_KICK_DOOR,C.literal("Kick the door")),(K=C.i32((K+1))));
        } else if(Number(!!((C.i32((dm&2)))&&(Number(mod==2))))) {
            (mcmd_addmenu(win,C.MCMD_CLOSE_DOOR,C.literal("Close the door")),(K=C.i32((K+1))));
        }
    }
    if(Number(C.i32(typ)<=C.SCORR)) (mcmd_addmenu(win,C.MCMD_SEARCH,C.literal("Search for secret doors")),(K=C.i32((K+1))));
    if(Number(!!(Number(((ttmp=C.t_at(x,y)))!=0)&&C.i32(C.field(ttmp,"trap","tseen").value)))) {
        (mcmd_addmenu(win,C.MCMD_LOOK_TRAP,C.literal("Examine trap")),(K=C.i32((K+1))));
        if(Number(C.i32(C.field(ttmp,"trap","ttyp").value)!=C.VIBRATING_SQUARE)) (mcmd_addmenu(win,C.MCMD_UNTRAP_TRAP,C.literal("Attempt to disarm trap")),(K=C.i32((K+1))));
        (mcmd_addmenu(win,C.MCMD_MOVE_DIR,C.literal("Move on the trap")),(K=C.i32((K+1))));
    }
    if(Number(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value==(C.i32(((C.BOULDER)+C.GLYPH_OBJ_OFF))))) (mcmd_addmenu(win,C.MCMD_MOVE_DIR,C.literal("Push the boulder")),(K=C.i32((K+1))));
    (mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value));
    if(Number(!!(mtmp&&Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))))) (mtmp=0);
    if(Number(!!(mtmp&&C.which_armor(mtmp,1048576n)))) {
        let mnam=C.x_monnam(mtmp,1,0,8,(C.i8(0)));
        if(Number(!(C.field(C.u,"you","usteed").value))) {
            C.variadic(110,buf,C.literal("Ride %s"),mnam);
            (mcmd_addmenu(win,C.MCMD_RIDE,buf),(K=C.i32((K+1))));
        }
        C.variadic(111,buf,C.literal("Remove saddle from %s"),mnam);
        (mcmd_addmenu(win,C.MCMD_REMOVE_SADDLE,buf),(K=C.i32((K+1))));
    }
    if(Number(!!(Number(!!(Number(!!(mtmp&&C.i32(C.can_saddle(mtmp))))&&Number(!(C.which_armor(mtmp,1048576n)))))&&C.carrying(C.SADDLE)))) {
        C.variadic(112,buf,C.literal("Put saddle on %s"),C.mon_nam(mtmp));
        (mcmd_addmenu(win,C.MCMD_APPLY_SADDLE,buf),(K=C.i32((K+1))));
    }
    if(Number(!!(mtmp&&(Number(!!(C.i32(C.field(mtmp,"monst","mpeaceful").value)||C.i32(C.field(mtmp,"monst","mtame").value))))))) {
        C.variadic(113,buf,C.literal("Talk to %s"),C.mon_nam(mtmp));
        (mcmd_addmenu(win,C.MCMD_TALK,buf),(K=C.i32((K+1))));
        C.variadic(114,buf,C.literal("Swap places with %s"),C.mon_nam(mtmp));
        (mcmd_addmenu(win,C.MCMD_MOVE_DIR,buf),(K=C.i32((K+1))));
        C.variadic(115,buf,C.literal("%s %s"),(Number(!((Number(!!(C.field((mtmp),"monst","mextra").value&&(C.field(C.field((mtmp),"monst","mextra").value,"mextra","mgivenname").value))))))?C.literal("Name"):C.literal("Rename")),C.mon_nam(mtmp));
        (mcmd_addmenu(win,C.MCMD_NAME,buf),(K=C.i32((K+1))));
    }
    if(Number(!!((Number(!!(mtmp&&Number(!((Number(!!(C.i32(C.field(mtmp,"monst","mpeaceful").value)||C.i32(C.field(mtmp,"monst","mtame").value)))))))))||(Number((C.glyph_at(x,y))==C.GLYPH_INVIS_OFF))))) {
        C.variadic(116,buf,C.literal("Attack %s"),(mtmp?C.mon_nam(mtmp):C.literal("unseen creature")));
        (mcmd_addmenu(win,C.MCMD_ATTACK_NEXT2U,buf),(K=C.i32((K+1))));
        /* attacking overrides any other automatic action */
        (C.cell(act,"int").value=C.MCMD_ATTACK_NEXT2U);
    } else {
        /* "Move %s", direction - handled below */
    }
    return K;
    } finally {C.stackRestore(stackFrame); }
}

export function there_cmd_menu_far(win,x,y,mod)
{
    win=C.i32(win);
    x=C.i16(x);
    y=C.i16(y);
    mod=C.i32(mod);
    let K=0;
    if(Number(mod==1)) {
        if(Number(!!(C.i32(C.linedup(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,x,y,1))&&Number(C.dist2(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,x,y)<C.i32((18*18)))))) (mcmd_addmenu(win,C.MCMD_THROW_OBJ,C.literal("Throw something")),(K=C.i32((K+1))));
        (mcmd_addmenu(win,C.MCMD_TRAVEL,C.literal("Travel here")),(K=C.i32((K+1))));
    }
    return K;
}

export function there_cmd_menu_common(win,x,y,mod,act)
{
    win=C.i32(win);
    x=C.i16(x);
    y=C.i16(y);
    mod=C.i32(mod);
    let K=0;
    if(Number(!!(Number(mod==1)||Number(mod==2)))) {
        /* ignore iflags.clicklook here */
        /* for self, only include "look at map symbol" if it isn't the
           ordinary hero symbol (steed, invisible w/o see invisible, ?) */
        if(Number(!!(Number(!!(Number(!((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))))||(Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))))||Number(C.glyph_at(x,y)!=(C.i32(((((Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))||Number(!(C.field(C.flags,"flag","showrace").value)))))?C.field(C.u,"you","umonnum").value:C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)))+(((Number((((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))) (mcmd_addmenu(win,C.MCMD_LOOK_AT,C.literal("Look at map symbol")),(K=C.i32((K+1))));
    }
    return K;
}

/* queue up command(s) to perform #therecmdmenu action */
export function act_on_act(act,dx,dy)
{
    act=C.i32(act);
    dx=C.i16(dx);
    dy=C.i16(dy);
    /* action */
    /* delta to adjacent spot (farther sometimes) */
    let otmp;
    let dir;
    /* a few there_cmd_menu_far() actions use dx,dy differently */
    switch(act) {
        case (C.MCMD_THROW_OBJ):
            case (C.MCMD_TRAVEL):
                case (C.MCMD_LOOK_AT):
                    /* keep dx,dy as-is */
                    break;
        default:
            /* force dx and dy to be +1, 0, or -1 */
            (dx=C.i16(C.sgn(C.i32(dx))));
        (dy=C.i16(C.sgn(C.i32(dy))));
        break;
    }
    switch(act) {
        case (C.MCMD_TRAVEL):
            /* FIXME: player has explicitly picked "travel to this location"
           from the menu but it will only work if flags.travelcmd is True.
           That option is intended as way to guard against stray mouse
           clicks and shouldn't inhibit explicit travel. */
            (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=(C.field(C.u,"you","tx").value=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(dx))))));
        (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=(C.field(C.u,"you","ty").value=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(dy))))));
        cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dotravel_target"));
        break;
        case (C.MCMD_THROW_OBJ):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dothrow"));
        cmdq_add_userinput(C.CQ_CANNED);
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_OPEN_DOOR):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doopen"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_LOCK_DOOR):
            (otmp=C.carrying(C.SKELETON_KEY));
        if(Number(!(otmp))) (otmp=C.carrying(C.LOCK_PICK));
        if(Number(!(otmp))) (otmp=C.carrying(C.CREDIT_CARD));
        if(otmp) {
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doapply"));
            cmdq_add_key(C.CQ_CANNED,C.field(otmp,"obj","invlet").value);
            cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
            cmdq_add_key(C.CQ_CANNED,C.i8(121));
            /* "Lock it?" */
        }
        break;
        case (C.MCMD_UNTRAP_DOOR):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dountrap"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_KICK_DOOR):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dokick"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_CLOSE_DOOR):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doclose"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_SEARCH):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dosearch"));
        break;
        case (C.MCMD_LOOK_TRAP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doidtrap"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_UNTRAP_TRAP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dountrap"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_MOVE_DIR):
            (dir=xytodir(C.i32(dx),C.i32(dy)));
        cmdq_add_ec(C.CQ_CANNED,C.cell(((C.move_funcs+Number(dir)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value);
        break;
        case (C.MCMD_RIDE):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doride"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_REMOVE_SADDLE):
            /* m-prefix for #loot: skip any floor containers */
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("do_reqmenu"));
        cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doloot"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        cmdq_add_key(C.CQ_CANNED,C.i8(121));
        /* "Do you want to remove saddle? */
        break;
        case (C.MCMD_APPLY_SADDLE):
            if(Number(((otmp=C.carrying(C.SADDLE)))!=0)) {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doapply"));
                cmdq_add_key(C.CQ_CANNED,C.field(otmp,"obj","invlet").value);
                cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
            }
        break;
        case (C.MCMD_ATTACK_NEXT2U):
            (dir=xytodir(C.i32(dx),C.i32(dy)));
        cmdq_add_ec(C.CQ_CANNED,C.cell(((C.move_funcs+Number(dir)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value);
        break;
        case (C.MCMD_TALK):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dotalk"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        break;
        case (C.MCMD_NAME):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("docallcmd"));
        cmdq_add_key(C.CQ_CANNED,C.i8(109));
        /* name a monster */
        cmdq_add_dir(C.CQ_CANNED,C.i8(dx),C.i8(dy),C.i8(0));
        /* getpos() uses u.ux+dx,u.uy+dy */
        break;
        case (C.MCMD_QUAFF):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dodrink"));
        cmdq_add_key(C.CQ_CANNED,C.i8(121));
        /* "Drink from the fountain?" */
        break;
        case (C.MCMD_DIP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dodip"));
        cmdq_add_userinput(C.CQ_CANNED);
        cmdq_add_key(C.CQ_CANNED,C.i8(121));
        /* "Dip foo into the fountain?" */
        break;
        case (C.MCMD_SIT):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dosit"));
        break;
        case (C.MCMD_UP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doup"));
        break;
        case (C.MCMD_DOWN):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dodown"));
        break;
        case (C.MCMD_DISMOUNT):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doride"));
        break;
        case (C.MCMD_MONABILITY):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("domonability"));
        break;
        case (C.MCMD_PICKUP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dopickup"));
        break;
        case (C.MCMD_LOOT):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doloot"));
        break;
        case (C.MCMD_TIP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dotip"));
        cmdq_add_key(C.CQ_CANNED,C.i8(121));
        /* "There is foo here; tip it?" */
        break;
        case (C.MCMD_EAT):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doeat"));
        cmdq_add_key(C.CQ_CANNED,C.i8(121));
        /* "There is foo here; eat it?" */
        break;
        case (C.MCMD_DROP):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dodrop"));
        break;
        case (C.MCMD_INVENTORY):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("ddoinv"));
        break;
        case (C.MCMD_REST):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("donull"));
        break;
        case (C.MCMD_LOOK_HERE):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dolook"));
        break;
        case (C.MCMD_LOOK_AT):
            (C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(dx)))));
        (C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(dy)))));
        cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doclicklook"));
        break;
        case (C.MCMD_UNTRAP_HERE):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dountrap"));
        cmdq_add_dir(C.CQ_CANNED,C.i8(0),C.i8(0),C.i8(1));
        break;
        case (C.MCMD_OFFER):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dosacrifice"));
        cmdq_add_userinput(C.CQ_CANNED);
        break;
        case (C.MCMD_CAST_SPELL):
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("docast"));
        break;
        default:
            break;
    }
}

/* offer choice of actions to perform at adjacent location <x,y>;
   a few choices can be farther away */
export function there_cmd_menu(x,y,mod)
{
    x=C.i16(x);
    y=C.i16(y);
    mod=C.i32(mod);
    const stackFrame=C.stackSave();
    try {
    let win;
    let ch=C.i8(0);
    let npick=0; let K=0;
    let picksAddress=C.stackAlloc(8); C.cell(picksAddress,"struct mi *").value=0;
    /*int dx = sgn(x - u.ux), dy = sgn(y - u.uy);*/
    let dx=C.i16(C.i32((C.i32(x)-C.i32(C.field(C.u,"you","ux").value)))); let dy=C.i16(C.i32((C.i32(y)-C.i32(C.field(C.u,"you","uy").value))));
    let actAddress=C.stackAlloc(4); C.cell(actAddress,"int").value=C.MCMD_NOTHING;
    (win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4));
    C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",win,C.u64(0));
    if((Number(!!(Number(C.i32((x))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((y))==C.i32(C.field(C.u,"you","uy").value)))))) (K=C.i32(K+there_cmd_menu_self(win,x,y,actAddress)));
 else if((Number(C.dist2(((x)),((y)),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))) (K=C.i32(K+there_cmd_menu_next2u(win,x,y,mod,actAddress)));
 else (K=C.i32(K+there_cmd_menu_far(win,x,y,mod)));
    (K=C.i32(K+there_cmd_menu_common(win,x,y,mod,actAddress)));
    if(Number(!(K))) {
        /* no menu options, try to move */
        if(Number(!!((Number(C.dist2(((x)),((y)),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))&&C.i32(C.test_move(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,dx,dy,1))))) {
            let dir=xytodir(C.i32(dx),C.i32(dy));
            cmdq_add_ec(C.CQ_CANNED,C.cell(((C.move_funcs+Number(dir)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value);
        } else if(C.field(C.flags,"flag","travelcmd").value) {
            (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=(C.field(C.u,"you","tx").value=x));
            (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=(C.field(C.u,"you","ty").value=y));
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dotravel_target"));
        }
        (npick=0);
        (ch=C.i8(0));
    } else if(Number(!!(Number(!!(Number(K==1)&&Number(C.cell(actAddress,"int").value!=C.MCMD_NOTHING)))&&Number(C.cell(actAddress,"int").value!=C.MCMD_TRAVEL)))) {
        C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
        act_on_act(C.cell(actAddress,"int").value,dx,dy);
        return C.i8(0);
    } else {
        C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",win,C.literal("What do you want to do?"));
        (npick=C.select_menu(win,1,picksAddress));
        (ch=C.i8(27));
    }
    C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
    if(Number(npick>0)) {
        (C.cell(actAddress,"int").value=C.field(C.field(C.cell(picksAddress,"struct mi *").value,"mi","item").address,"any","a_int").value);
        C.free(C.cell(picksAddress,"struct mi *").value);
        act_on_act(C.cell(actAddress,"int").value,dx,dy);
        return C.i8(0);
    }
    return ch;
    } finally {C.stackRestore(stackFrame); }
}

export function here_cmd_menu()
{
    there_cmd_menu(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,1);
    return C.i8(0);
}

export function click_to_cmd(x,y,mod)
{
    x=C.i16(x);
    y=C.i16(y);
    mod=C.i32(mod);
    (C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value=x);
    (C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value=y);
    if(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(C.i32((mod-1)))*8),"struct ext_func_tab *").value) cmdq_add_ec(C.CQ_CANNED,C.field(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","mousebtn").address+Number(C.i32((mod-1)))*8),"struct ext_func_tab *").value,"ext_func_tab","ef_funct").value);
}

export function domouseaction()
{
    let x; let y;
    let o;
    let dir;
    (x=C.i16(C.i32((C.i32(C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value)-C.i32(C.field(C.u,"you","ux").value)))));
    (y=C.i16(C.i32((C.i32(C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value)-C.i32(C.field(C.u,"you","uy").value)))));
    if(C.field(C.flags,"flag","travelcmd").value) {
        if(Number(!!(Number(C.abs(C.i32(x))<=1)&&Number(C.abs(C.i32(y))<=1)))) {
            ((x=C.i16(C.sgn(C.i32(x)))),(y=C.i16(C.sgn(C.i32(y)))));
        } else {
            (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=(C.field(C.u,"you","tx").value=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(x))))));
            (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=(C.field(C.u,"you","ty").value=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(y))))));
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dotravel_target"));
            return 0;
        }
        if(Number(!!(Number(C.i32(x)==0)&&Number(C.i32(y)==0)))) {
            /* here */
            if(Number(!!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.FOUNTAIN))||(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.SINK))))) {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dodrink"));
                return 0;
            } else if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.THRONE))) {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dosit"));
                return 0;
            } else if(C.On_stairs_up(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)) {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doup"));
                return 0;
            } else if(C.On_stairs_dn(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)) {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dodown"));
                return 0;
            } else if(Number(((o=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(C.u,"you","ux").value)*(8*21))+Number(C.field(C.u,"you","uy").value)*8),"struct obj *").value)))!=0)) {
                cmdq_add_ec(C.CQ_CANNED,((Number(!!(Number(C.i32(C.field((o),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((o),"obj","otyp").value)<=C.BAG_OF_TRICKS))))?C.functionPointer("doloot"):C.functionPointer("dopickup")));
                return 0;
            } else {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("donull"));
                /* just rest */
                return 0;
            }
        }
        /* directional commands */
        (dir=xytodir(C.i32(x),C.i32(y)));
        if(Number(!!(Number(!((C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(x))))*(8*21))+Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(y))))*8),"struct monst *").value)))&&Number(!(C.test_move(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,x,y,1)))))) {
            if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(x))))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(y))))*C.sizes["struct rm"]),"rm","typ").value))==C.DOOR))) {
                /* slight assistance to player: choose kick/open for them */
                if(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(x))))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(y))))*C.sizes["struct rm"]),"rm","flags").value)&8))) {
                    cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dokick"));
                    return 0;
                }
                if(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(x))))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(y))))*C.sizes["struct rm"]),"rm","flags").value)&4))) {
                    cmdq_add_ec(C.CQ_CANNED,C.functionPointer("doopen"));
                    return 0;
                }
            }
            if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32(x))))*(C.sizes["struct rm"]*21))+Number(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32(y))))*C.sizes["struct rm"]),"rm","typ").value)<=C.SCORR)) {
                cmdq_add_ec(C.CQ_CANNED,C.functionPointer("dosearch"));
                return 0;
            }
            cmdq_add_ec(C.CQ_CANNED,C.cell(((C.move_funcs+Number(dir)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value);
            return 0;
        }
    } else {
        /* convert without using floating point, allowing sloppy clicking */
        if(Number(C.i32(x)>C.i32((2*C.abs(C.i32(y)))))) ((x=C.i16(1)),(y=C.i16(0)));
 else if(Number(C.i32(y)>C.i32((2*C.abs(C.i32(x)))))) ((x=C.i16(0)),(y=C.i16(1)));
 else if(Number(C.i32(x)<C.i32((C.i32((-2))*C.abs(C.i32(y)))))) ((x=C.i16(C.i32((-1)))),(y=C.i16(0)));
 else if(Number(C.i32(y)<C.i32((C.i32((-2))*C.abs(C.i32(x)))))) ((x=C.i16(0)),(y=C.i16(C.i32((-1)))));
 else ((x=C.i16(C.sgn(C.i32(x)))),(y=C.i16(C.sgn(C.i32(y)))));
        if(Number(!!(Number(C.i32(x)==0)&&Number(C.i32(y)==0)))) {
            /* map click on player to "rest" command */
            cmdq_add_ec(C.CQ_CANNED,C.functionPointer("donull"));
            return 0;
        }
        (dir=xytodir(C.i32(x),C.i32(y)));
    }
    /* move, attack, etc. */
    cmdq_add_ec(C.CQ_CANNED,C.cell(((C.move_funcs+Number(dir)*(8*3))+Number(C.MV_WALK)*8),"int (*)(void)").value);
    return 0;
}

/* gather typed digits into a number in *count; return the next non-digit */
export function get_count(allowchars,inkey,maxcount,count,gc_flags)
{
    inkey=C.i8(inkey);
    maxcount=C.i64(maxcount);
    gc_flags=C.u32(gc_flags);
    const stackFrame=C.stackSave();
    try {
    /* what comes after digits; if Null, anything */
    /* if caller already got first digit, this is it */
    /* if user tries to enter a bigger count, use this */
    /* primary output */
    /* control flags: GC_SAVEHIST, GC_ECHOFIRST */
    let qbuf=C.stackAlloc((1*128));
    let key; let save_input_state=C.field(C.program_state,"sinfo","input_state").value;
    let cnt=0n; let first=(C.i32(inkey)?C.i64((C.i32((C.i32(inkey)-48)))):0n);
    let backspaced=(C.i8(0)); let showzero=(C.i8(1)); let historicmsg=C.i8(Number((C.u32((gc_flags&C.u32(1))))!=C.u32(0))); let conditionalmsg=C.i8(Number((C.u32((gc_flags&C.u32(2))))!=C.u32(0))); let echoalways=C.i8(Number((C.u32((gc_flags&C.u32(4))))!=C.u32(0)));
    /* should "Count: 123" go into message history? */
    /* put "Count: N" into mesg hist unless N is the same as the
               [first digit] value passed in via 'inkey' */
    /* normally "Count: 12" isn't echoed until the second digit */
    /* this should be done in port code so that we have erase_char
       and kill_char available; we can at least fake erase_char */
    (C.cell(count,"long").value=C.i64(0));
    for(;;) {
        if(inkey) {
            (key=C.i32(inkey));
            (inkey=C.i8(0));
        } else {
            /* if readchar() has already been called in this loop, it will
               have reset input_state; put that back to its previous value */
            (C.field(C.program_state,"sinfo","input_state").value=save_input_state);
            (key=C.i32(readchar()));
        }
        if(C.digit(C.i8(key))) {
            let dgt=C.i64((C.i32((key-48))));
            /* cnt = (10 * cnt) + (key - '0'); */
            (cnt=(((Number(!!(Number((cnt)<C.i64((9223372036854775807n/10n)))||(Number(!!(Number((cnt)==C.i64((9223372036854775807n/10n)))&&Number((dgt)<=C.i64((9223372036854775807n%10n)))))))))?C.i64((C.i64(((cnt)*10n))+(dgt))):C.i64((-1n)))));
            if(Number(cnt<0n)) (cnt=0n);
 else if(Number(!!(Number(maxcount>0n)&&Number(cnt>maxcount)))) (cnt=maxcount);
            /* if we've backed up to nothing, then typed 0, show that 0 */
            (showzero=C.i8((Number(key==48))));
        } else if(Number(!!(Number(key==8)||Number(key==127)))) {
            if(Number(!!(Number(!(cnt))&&Number(!(echoalways))))) break;
            (showzero=(C.i8(0)));
            (cnt=C.i64((cnt/10n)));
            (backspaced=(C.i8(1)));
        } else if(Number(key==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_ESC)*1),"char").value))) {
            break;
        } else if(Number(!!(Number(!(allowchars))||C.strchr(allowchars,key)))) {
            (C.cell(count,"long").value=cnt);
            if(Number(C.cell(count,"long").value!=cnt)) C.variadic(117,C.literal("get_count: cmdcount_nht"));
            break;
        }
        if(Number(!!(Number(!!(Number(cnt>C.i64(9))||C.i32(backspaced)))||C.i32(echoalways)))) {
            C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
            if(Number(!!(Number(!!(C.i32(backspaced)&&Number(!(cnt))))&&Number(!(showzero))))) {
                C.variadic(118,qbuf,C.literal("Count: "));
            } else {
                C.variadic(119,qbuf,C.literal("Count: %ld"),cnt);
                (backspaced=(C.i8(0)));
            }
            C.variadic(120,C.u32(4),C.literal("%s"),qbuf);
            C.callProc((C.field(C.windowprocs,"window_procs","win_mark_synch").value),"void (void)");
        }
    }
    if(Number(!!(C.i32(historicmsg)||(Number(!!(C.i32(conditionalmsg)&&Number(C.cell(count,"long").value!=first))))))) {
        C.variadic(121,qbuf,C.literal("Count: %ld "),C.cell(count,"long").value);
        key2txt(C.u8(key),C.eos(qbuf));
        C.callProc((C.field(C.windowprocs,"window_procs","win_putmsghistory").value),"void (const char *, boolean)",qbuf,(C.i8(0)));
    }
    return C.i8(key);
    } finally {C.stackRestore(stackFrame); }
}

/* main command input routine when not repeating and not executing canned
   commands; input comes via get_count() which collects repeat count if one
   is present and returns next non-digit to us */
export function parse()
{
    let foo;
    let bind;
    (C.field(C.iflags,"instance_flags","in_parse").value=(C.i8(1)));
    (C.field(C.gc,"instance_globals_c","command_count").value=C.i64(0));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","move").value=(C.i8(1)));
    /* assume next command will take game time */
    C.flush_screen(1);
    /* Flush screen buffer. Put the cursor on the hero. */
    /* affects readchar() behavior for ESC iff 'altmeta' option is On;
       is always reset to otherInp by readchar() */
    (C.field(C.program_state,"sinfo","input_state").value=C.commandInp);
    if(Number(!!(Number(!(C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","num_pad").value))||Number(((foo=C.i32(readchar())))==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_COUNT)*1),"char").value))))) {
        /* if 'num_pad' is On then readchar() has just reset input_state;
           set it back to commandInp, so that get_count() supports 'altmeta';
           otherwise "n<count>ESC<character>" becomes "n<count>ESC" (with
           <character> not read from keyboard yet) rather than intended count
           and meta keystroke "n<count>M-<character>" */
        (C.field(C.program_state,"sinfo","input_state").value=C.commandInp);
        (foo=C.i32(get_count(0,C.i8(0),C.i64(32767),C.field(C.gc,"instance_globals_c","command_count").address,C.u32(0))));
    }
    (C.field(C.gl,"instance_globals_l","last_command_count").value=C.field(C.gc,"instance_globals_c","command_count").value);
    if(Number(foo==C.i32(C.cell((C.field(C.field(C.gc,"instance_globals_c","Cmd").address,"cmd","spkeys").address+Number(C.NHKF_ESC)*1),"char").value))) {
        /* esc cancels count (TH) */
        C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
        (C.field(C.gc,"instance_globals_c","command_count").value=C.i64(0));
        (C.field(C.gl,"instance_globals_l","last_command_count").value=C.i64(0));
    } else if(C.field(C.gi,"instance_globals_i","in_doagain").value) {
        (C.field(C.gc,"instance_globals_c","command_count").value=C.field(C.gl,"instance_globals_l","last_command_count").value);
    } else if(Number(!!(Number(!!(Number(!!(Number(!!(foo&&Number(((bind=cmdbind_get(C.u8(C.i32((foo&255))))))!=0)))&&bind))&&C.field(bind,"Cmd_bind","cmd").value))&&(Number(!!(Number(!!(Number(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value==C.functionPointer("do_repeat"))||Number(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value==C.functionPointer("doprev_message"))))||Number(C.field(C.field(bind,"Cmd_bind","cmd").value,"ext_func_tab","ef_funct").value==C.functionPointer("doextcmd")))))))) {
        /* these shouldn't go into the do-again buffer */
        /* this one might get put into the do-again buffer but
                      only if the interface code tells the core to do it */
        /* gc.command_count will be set again when we
           re-enter with gi.in_doagain set true */
        (C.field(C.gc,"instance_globals_c","command_count").value=C.field(C.gl,"instance_globals_l","last_command_count").value);
    }
    (C.field(C.gm,"instance_globals_m","multi").value=C.field(C.gc,"instance_globals_c","command_count").value);
    if(C.field(C.gm,"instance_globals_m","multi").value) ((C.field(C.gm,"instance_globals_m","multi").value=C.i64((C.field(C.gm,"instance_globals_m","multi").value-1n)))+1n);
    (C.field(C.gc,"instance_globals_c","cmd_key").value=foo);
    C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
    (C.field(C.iflags,"instance_flags","in_parse").value=(C.i8(0)));
    return C.field(C.gc,"instance_globals_c","cmd_key").value;
}

/* some very old systems, or descendents of such systems, expect signal
   handlers to have return type `int', but they don't actually inspect
   the return value so we should be safe using `void' unconditionally */
/*ARGUSED*/
export function hangup(sig_unused)
{
    sig_unused=C.i32(sig_unused);
    /* called as signal() handler, so sent
                              * at least one arg */
    if(C.field(C.program_state,"sinfo","exiting").value) (C.field(C.program_state,"sinfo","in_moveloop").value=0);
    C.nhwindows_hangup();
    /* When using SAFERHANGUP, the done_hup flag is tested in rhack
       and a couple of other places; actual hangup handling occurs then.
       This is 'safer' because it disallows certain cheats and also
       protects against losing objects in the process of being thrown,
       but also potentially riskier because the disconnected program
       must continue running longer before attempting a hangup save. */
    ((C.field(C.program_state,"sinfo","done_hup").value=C.i32((C.field(C.program_state,"sinfo","done_hup").value+1)))-1);
    /* defer hangup iff game appears to be in progress */
    if(Number(!!(C.field(C.program_state,"sinfo","in_moveloop").value&&C.field(C.program_state,"sinfo","something_worth_saving").value))) return;
    /* SAFERHANGUP */
    end_of_input();
}

export function end_of_input()
{
    /* keep files for recovery */
    /* don't save */
    if((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_tutorial_dnum").value))))) (C.field(C.program_state,"sinfo","something_worth_saving").value=0);
    /* don't save in tutorial */
    if(C.field(C.program_state,"sinfo","something_worth_saving").value) C.dosave0();
    if(C.field(C.soundprocs,"sound_procs","sound_exit_nhsound").value) C.callProc((C.field(C.soundprocs,"sound_procs","sound_exit_nhsound").value),"void (const char *)",C.literal("end_of_input"));
    if(C.field(C.iflags,"instance_flags","window_inited").value) C.callProc((C.field(C.windowprocs,"window_procs","win_exit_nhwindows").value),"void (const char *)",0);
    C.clearlocks();
    C.nh_terminate(0);
    /*NOTREACHED*/
    /* not necessarily true for vms... */
    return;
}

/* HANGUPHANDLING */
export function readchar_core(x,y,mod)
{
    let sym;
    readchar_done: {
        if(C.field(C.iflags,"instance_flags","debug_fuzzer").value) {
            (sym=C.i32(randomkey()));
            break readchar_done;
        }
        if(C.cell(C.cell(C.readchar_queue,"char *").value,"char").value) (sym=C.i32(C.cell(((C.cell(C.readchar_queue,"char *").value=C.ptr((C.cell(C.readchar_queue,"char *").value+Number(1))))-Number(1)),"char").value));
 else if(C.field(C.gi,"instance_globals_i","in_doagain").value) (sym=C.i32(pgetchar()));
 else (sym=C.callProc((C.field(C.windowprocs,"window_procs","win_nh_poskey").value),"int (coordxy *, coordxy *, int *)",x,y,mod));
        if(Number(sym==(C.i32((-1))))) {
            let cnt=20;
            /*
         * Some SYSV systems seem to return EOFs for various reasons
         * (?like when one hits break or for interrupted systemcalls?),
         * and we must see several before we quit.
         */
            do {
                C.clearerr((C.global("stdin").value));
                /* omit if clearerr is undefined */
                (sym=C.i32(pgetchar()));
            } while(Number(!!((cnt=C.i32((cnt-1)))&&Number(sym==(C.i32((-1)))))));
        }
        /* NR_OF_EOFS */
        if(Number(sym==(C.i32((-1))))) {
            hangup(0);
            /* call end_of_input() or set program_state.done_hup */
            (sym=27);
        } else if(Number(!!(Number(!!(Number(sym==27)&&C.i32(C.field(C.iflags,"instance_flags","altmeta").value)))&&Number(C.field(C.program_state,"sinfo","input_state").value!=C.otherInp)))) {
            /* iflags.altmeta: treat two character ``ESC c'' as single `M-c' but
           only when we're called by parse() [possibly via get_count()]
           or getpos() [to support Alt+digit] or getdir() [for arrow keys
           under curses] */
            (sym=(C.i32(C.cell(C.cell(C.readchar_queue,"char *").value,"char").value)?C.i32(C.cell(((C.cell(C.readchar_queue,"char *").value=C.ptr((C.cell(C.readchar_queue,"char *").value+Number(1))))-Number(1)),"char").value):C.i32(pgetchar())));
            if(Number(!!(Number(sym==(C.i32((-1))))||Number(sym==0)))) (sym=27);
 else if(Number(sym!=27)) (sym=C.i32(sym|128));
            /* force 8th bit on */
            /*ALTMETA*/
        } else if(Number(sym==0)) {
            /* click event */
            (C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value=(C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value=C.i16(C.i32((-1)))));
            click_to_cmd(C.cell(x,"short").value,C.cell(y,"short").value,C.cell(mod,"int").value);
        }
    }
    (C.field(C.program_state,"sinfo","input_state").value=C.otherInp);
    /* next readchar() will be for an ordinary char unless parse()
       sets this back to non-zero */
    return C.i8(sym);
}

/* get a character */
export function readchar()
{
    const stackFrame=C.stackSave();
    try {
    let ch;
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.field(C.u,"you","ux").value; let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.field(C.u,"you","uy").value;
    let modAddress=C.stackAlloc(4); C.cell(modAddress,"int").value=0;
    (ch=readchar_core(xAddress,yAddress,modAddress));
    return ch;
    } finally {C.stackRestore(stackFrame); }
}

/* used by getpos() to accept mouse input as well as keyboard input */
export function readchar_poskey(x,y,mod)
{
    let ch;
    (C.field(C.program_state,"sinfo","input_state").value=C.getposInp);
    (ch=readchar_core(x,y,mod));
    return ch;
}

/* '_' command, #travel, via keyboard rather than mouse click */
export function dotravel()
{
    const stackFrame=C.stackSave();
    try {
    let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
    /*
     * Traveling used to be a no-op if user toggled 'travel' option
     * Off.  However, travel was initially implemented as a mouse-only
     * command and the original purpose of the option was to be able
     * to prevent clicks on the map from initiating travel.
     *
     * Travel via '_' came later.  Since it requires a destination--
     * which offers the user a chance to cancel if it was accidental--
     * there's no reason for the option to disable travel-by-keys.
     */
    (C.field(cc,"nhcoord","x").value=C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value);
    (C.field(cc,"nhcoord","y").value=C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value);
    if(Number(!!(Number(C.i32(C.field(cc,"nhcoord","x").value)==0)&&Number(C.i32(C.field(cc,"nhcoord","y").value)==0)))) {
        /* No cached destination, start attempt from current position */
        (C.field(cc,"nhcoord","x").value=C.field(C.u,"you","ux").value);
        (C.field(cc,"nhcoord","y").value=C.field(C.u,"you","uy").value);
    }
    (C.field(C.iflags,"instance_flags","getloc_travelmode").value=(C.i8(1)));
    if(C.field(C.iflags,"instance_flags","menu_requested").value) {
        let gfilt=C.field(C.iflags,"instance_flags","getloc_filter").value;
        (C.field(C.iflags,"instance_flags","getloc_filter").value=C.GFILTER_VIEW);
        if(Number(!(C.getpos_menu(cc,C.GLOC_INTERESTING)))) {
            (C.field(C.iflags,"instance_flags","getloc_filter").value=gfilt);
            (C.field(C.iflags,"instance_flags","getloc_travelmode").value=(C.i8(0)));
            return 0;
        }
        (C.field(C.iflags,"instance_flags","getloc_filter").value=gfilt);
    } else {
        C.variadic(122,C.literal("Where do you want to travel to?"));
        if(Number(C.getpos(cc,(C.i8(1)),C.literal("the desired destination"))<0)) {
            /* user pressed ESC */
            (C.field(C.iflags,"instance_flags","getloc_travelmode").value=(C.i8(0)));
            return 2;
        }
    }
    (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=(C.field(C.u,"you","tx").value=C.field(cc,"nhcoord","x").value));
    (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=(C.field(C.u,"you","ty").value=C.field(cc,"nhcoord","y").value));
    return dotravel_target();
    } finally {C.stackRestore(stackFrame); }
}

/* #retravel, travel to iflags.travelcc, which must be set */
export function dotravel_target()
{
    if(Number(!(isok(C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value,C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value)))) {
        /* assume <0,0>, the value assigned when travel reaches destination */
        C.variadic(123,C.literal("No travel destination set."));
        return 0;
    } else if((Number(!!(Number(C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value))==C.i32(C.field(C.u,"you","uy").value)))))) {
        /* maybe interrupted while traveling then just walked rest of way
           so destination hasn't been reset yet */
        C.variadic(124,C.literal("are already here."));
        (C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","x").value=(C.field(C.field(C.iflags,"instance_flags","travelcc").address,"nhcoord","y").value=C.i16(0)));
        return 0;
    }
    (C.field(C.iflags,"instance_flags","getloc_travelmode").value=(C.i8(0)));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel").value=C.i8(1));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","travel1").value=C.i8(1));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","run").value=C.u32(8));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","nopick").value=C.i8(1));
    (C.field(C.gd,"instance_globals_d","domove_attempting").value=C.i64(C.field(C.gd,"instance_globals_d","domove_attempting").value|C.i64(2)));
    if(Number(!(C.field(C.gm,"instance_globals_m","multi").value))) (C.field(C.gm,"instance_globals_m","multi").value=C.i64(((Number((80)>(21))?(80):(21)))));
    (C.field(C.u,"you","last_str_turn").value=0);
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","mv").value=(C.i8(1)));
    C.domove();
    return 1;
}

/* mouse click look command */
export function doclicklook()
{
    if(Number(!(isok(C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value,C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value)))) return 0;
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","move").value=(C.i8(0)));
    C.auto_describe(C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","x").value,C.field(C.field(C.gc,"instance_globals_c","clicklook_cc").address,"nhcoord","y").value);
    return 0;
}

/* can we use menu entries to respond to a query? */
export function yn_menuable_resp(resp)
{
    return C.i8(Number(!!(Number(!!(C.i32(C.field(C.iflags,"instance_flags","query_menu").value)&&C.i32(C.field(C.iflags,"instance_flags","window_inited").value)))&&(Number(!!(Number(!!(Number(!!(Number(!!(Number(resp==C.ynchars)||Number(resp==C.ynqchars)))||Number(resp==C.ynaqchars)))||Number(resp==C.rightleftchars)))||Number(resp==C.hidespinchars)))))));
}

export function yn_func_menu_opt(win,key,text,def)
{
    win=C.i32(win);
    key=C.i8(key);
    def=C.i8(def);
    const stackFrame=C.stackSave();
    try {
    let any=C.stackAlloc(C.sizes["union any"]);
    C.copyRecord(any,C.field(C.cg,"const_globals","zeroany").address,C.sizes["union any"]);
    (C.field(any,"any","a_char").value=key);
    C.add_menu(win,C.nul_glyphinfo,any,key,C.i8(0),0,8,text,((Number(C.i32(def)==C.i32(key)))?1:0));
    } finally {C.stackRestore(stackFrame); }
}

/* use a menu to ask a specific response to a query.
   returns TRUE if the menu was shown to the user.
   puts the response char into res. */
export function yn_function_menu(query,resp,def,res)
{
    def=C.i8(def);
    const stackFrame=C.stackSave();
    try {
    if(yn_menuable_resp(resp)) {
        let win=C.callProc((C.field(C.windowprocs,"window_procs","win_create_nhwindow").value),"winid (int)",4);
        let selAddress=C.stackAlloc(8);
        let n;
        let keybuf=C.stackAlloc((1*128));
        C.callProc((C.field(C.windowprocs,"window_procs","win_start_menu").value),"void (winid, unsigned long)",win,C.u64(0));
        if(Number(resp==C.rightleftchars)) {
            yn_func_menu_opt(win,C.i8(114),C.literal("Right"),def);
            yn_func_menu_opt(win,C.i8(108),C.literal("Left"),def);
        } else if(Number(resp==C.hidespinchars)) {
            yn_func_menu_opt(win,C.i8(104),C.literal("Hide"),def);
            yn_func_menu_opt(win,C.i8(115),C.literal("Spin a web"),def);
        } else {
            yn_func_menu_opt(win,C.i8(121),C.literal("Yes"),def);
            yn_func_menu_opt(win,C.i8(110),C.literal("No"),def);
        }
        if(Number(resp==C.ynaqchars)) yn_func_menu_opt(win,C.i8(97),C.literal("All"),def);
        if(Number(!!(Number(!!(Number(resp==C.ynqchars)||Number(resp==C.ynaqchars)))||Number(resp==C.hidespinchars)))) yn_func_menu_opt(win,C.i8(113),C.literal("Quit"),def);
        C.callProc((C.field(C.windowprocs,"window_procs","win_end_menu").value),"void (winid, const char *)",win,query);
        (n=C.select_menu(win,1,selAddress));
        C.callProc((C.field(C.windowprocs,"window_procs","win_destroy_nhwindow").value),"void (winid)",win);
        if(Number(n>0)) {
            (C.cell(res,"char").value=C.field(C.field((C.cell(selAddress,"struct mi *").value+Number(0)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
            /* two were selected? use the one that wasn't the default */
            if(Number(!!(Number(n>1)&&Number(C.i32(C.cell(res,"char").value)==C.i32(def))))) (C.cell(res,"char").value=C.field(C.field((C.cell(selAddress,"struct mi *").value+Number(1)*C.sizes["struct mi"]),"mi","item").address,"any","a_char").value);
            C.free(C.cell(selAddress,"struct mi *").value);
        } else {
            (C.cell(res,"char").value=def);
        }
        C.variadic(125,C.literal("%s %s"),query,key2txt(C.u8(C.cell(res,"char").value),keybuf));
        C.callProc((C.field(C.windowprocs,"window_procs","win_clear_nhwindow").value),"void (winid)",C.global("WIN_MESSAGE").value);
        return (C.i8(1));
    }
    return (C.i8(0));
    } finally {C.stackRestore(stackFrame); }
}

/*
 *   Parameter validator for generic yes/no function to prevent
 *   the core from sending too long a prompt string to the
 *   window port causing a buffer overflow there.
 */
export function yn_function(query,resp,def,addcmdq)
{
    def=C.i8(def);
    addcmdq=C.i8(addcmdq);
    const stackFrame=C.stackSave();
    try {
    let resAddress=C.stackAlloc(1); C.cell(resAddress,"char").value=C.i8(27); let qbuf=C.stackAlloc((1*128));
    let cq=C.stackAlloc(C.sizes["struct _cmd_queue"]); let cmdq;
    let idx=C.field(C.gs,"instance_globals_s","saved_pline_index").value;
    /* buffer to hold query+space+formatted_single_char_response */
    let dumplog_buf=C.stackAlloc((1*144));
    /* [QBUFSZ+1+7] should suffice */
    (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_UNKNOWN);
    /* most recent pline is clobbered */
    /* maximum acceptable length is QBUFSZ-1 */
    if(Number(C.strlen(query)>=C.u64(128))) {
        /* caller shouldn't have passed anything this long */
        C.paniclog(C.literal("Query truncated: "),query);
        C.strncpy(qbuf,query,C.u64(C.i32((C.i32((128-1))-3))));
        C.strcpy((qbuf+Number(C.i32((C.i32((128-1))-3)))*1),C.literal("..."));
        (query=qbuf);
    }
    if(Number(!!(C.i32(addcmdq)&&Number(((cmdq=cmdq_pop()))!=0)))) {
        C.copyRecord(cq,cmdq,C.sizes["struct _cmd_queue"]);
        C.free(cmdq);
    } else {
        (C.field(cq,"_cmd_queue","typ").value=C.CMDQ_USER_INPUT);
        (C.field(cq,"_cmd_queue","key").value=C.i8(0));
        /* lint suppression */
    }
    if(Number(C.field(cq,"_cmd_queue","typ").value!=C.CMDQ_USER_INPUT)) {
        if(Number(C.field(cq,"_cmd_queue","typ").value==C.CMDQ_KEY)) (C.cell(resAddress,"char").value=C.field(cq,"_cmd_queue","key").value);
 else cmdq_clear(C.CQ_CANNED);
        /* 'res' is ESC */
        (addcmdq=(C.i8(0)));
        /* for the fuzzer, usually force a valid response, but sometimes let
       it exercise windowport yn_function and invalid response handling */
    } else if(Number(!!(Number(!!(Number(!!(C.i32(C.field(C.iflags,"instance_flags","debug_fuzzer").value)&&resp))&&C.i32(C.cell(resp,"char").value)))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),5513,(C.literal("yn_function"))),C.rn2(20))):C.rn2(20)))))) {
        let ln=C.i32(C.strlen(resp)); let ridx=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),5514,(C.literal("yn_function"))),C.rn2(ln))):C.rn2(ln)));
        (C.cell(resAddress,"char").value=C.cell((resp+Number(ridx)*1),"char").value);
        /* if valid-responses includes ESC followed by unshown candidates
           and we randomly picked the ESC, try again with only whatever is
           before it; be careful to avoid rn2(0) */
        if(Number(C.i32(C.cell(resAddress,"char").value)==27)) {
            if(Number(ln>1)) {
                /* if ESC is at start (ridx==0), pick something after it */
                (ridx=((Number(ridx==0))?(C.i32((1+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),5523,(C.literal("yn_function"))),C.rn2(C.i32((ln-1))))):C.rn2(C.i32((ln-1)))))))):((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("cmd.c"),5523,(C.literal("yn_function"))),C.rn2(ridx))):C.rn2(ridx)))));
                (C.cell(resAddress,"char").value=C.cell((resp+Number(ridx)*1),"char").value);
            } else {
                /* ESC is the only thing (ln==1); something is strange... */
                (C.cell(resAddress,"char").value=def);
                /* might be '\0' */
            }
        }
    } else {
        if(Number(!(yn_function_menu(query,resp,def,resAddress)))) {
            (C.cell(resAddress,"char").value=C.callProc((C.field(C.windowprocs,"window_procs","win_yn_function").value),"char (const char *, const char *, char)",query,resp,def));
        }
    }
    if(addcmdq) cmdq_add_key(C.CQ_REPEAT,C.cell(resAddress,"char").value);
    if(Number(idx==C.field(C.gs,"instance_globals_s","saved_pline_index").value)) {
        /* when idx is still the same as gs.saved_pline_index, the interface
           didn't put the prompt into gs.saved_plines[]; we put a simplified
           version in there now (without response choices or default) */
        C.variadic(126,dumplog_buf,C.literal("%s "),query);
        key2txt(C.u8(C.cell(resAddress,"char").value),C.eos(dumplog_buf));
        C.dumplogmsg(dumplog_buf);
    }
    /* should not happen but cq.key has been observed to not obey 'resp';
       it is most likely caused by saving a keystroke that was just used
       to answer a context-sensitive prompt, then using the do-again
       command with context that has changed */
    if(Number(!!(Number(!!(Number(!!(resp&&C.i32(C.cell(resp,"char").value)))&&C.i32(C.cell(resAddress,"char").value)))&&Number(!(C.strchr(resp,C.i32(C.cell(resAddress,"char").value))))))) {
        /* this probably needs refinement since caller is expecting something
           within 'resp' and ESC won't be (it could be present, but as a flag
           for unshown possibilities rather than as acceptable input) */
        let altres=(C.i32(def)?C.i32(def):27);
        if(Number(!!(Number(!(C.field(C.gi,"instance_globals_i","in_doagain").value))||C.i32(C.field(C.flags,"flag","debug").value)))) {
            /*TEMP*/
            let fuzzing=C.field(C.iflags,"instance_flags","debug_fuzzer").value;
            let dbg_buf=C.stackAlloc((1*256));
            C.variadic(127,(C.literal("yn_function")),5570,dbg_buf,BigInt((1*256)),C.literal("%s [%s] (%s)"),query,(resp?resp:C.literal("")),(C.i32(def)?C.visctrl(def):C.literal("")));
            C.paniclog(C.literal("yn debug"),dbg_buf);
            /*TEMP*/
            /* don't let this known problem kill the fuzzer */
            /*TEMP*/
            (C.field(C.iflags,"instance_flags","debug_fuzzer").value=C.i8(C.fuzzer_impossible_continue));
            C.variadic(128,C.literal("yn_function() returned '%s'; using '%s' instead"),C.visctrl(C.cell(resAddress,"char").value),C.visctrl(C.i8(altres)));
            /*TEMP*/
            (C.field(C.iflags,"instance_flags","debug_fuzzer").value=fuzzing);
        }
        (C.cell(resAddress,"char").value=C.i8(altres));
    }
    /* in case we're called via getdir() which sets input_state */
    (C.field(C.program_state,"sinfo","input_state").value=C.otherInp);
    return C.cell(resAddress,"char").value;
    } finally {C.stackRestore(stackFrame); }
}

/* for paranoid_confirm:quit,die,attack,&c prompting; allows yes, n|no,
   or q|quit; result is one of 'y' or 'n' or 'q'; ESC yields 'q' */
export function paranoid_ynq(be_paranoid,prompt,accept_q)
{
    be_paranoid=C.i8(be_paranoid);
    accept_q=C.i8(accept_q);
    const stackFrame=C.stackSave();
    try {
    let c=C.i8(110);
    /* default result */
    /* when paranoid, player must respond with "yes" rather than just 'y'
       to give the go-ahead for this query; default is "no" unless the
       ParanoidConfirm flag is set in which case there's no default */
    if(be_paranoid) {
        let pbuf=C.stackAlloc((1*256)); let qbuf=C.stackAlloc((1*128)); let ans=C.stackAlloc((1*256));
        let promptprefix=C.literal(""); let responsetype=((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(1))))!=C.u32(0)))?((C.i32(accept_q)?C.literal("[yes|no|quit]"):C.literal("[yes|no]"))):((C.i32(accept_q)?C.literal("[yes|n|q] (n)"):C.literal("[yes|n] (n)"))));
        /* empty for first iteration */
        /* default of 'n' is shown for
                                             * the !ParanoidConfirm cases */
        let k; let trylimit=6;
        /* 1 normal, 5 more with "Yes or No:" prefix */
        C.copynchars(pbuf,prompt,C.i32((256-1)));
        /* in addition to being paranoid about this particular
           query, we might be even more paranoid about all paranoia
           responses (ie, ParanoidConfirm is set) in which case we
           require "no" to reject in addition to "yes" to confirm
           (except we won't loop if response is ESC; it means no) */
        do {
            /* make sure we won't overflow a QBUFSZ sized buffer */
            (k=C.i32((C.u64((C.u64((C.strlen(promptprefix)+C.u64(1)))+C.strlen(responsetype))))));
            if(Number(C.i32((C.i32(C.strlen(pbuf))+k))>C.i32((128-1)))) {
                /* chop off some at the end */
                C.strcpy((((pbuf+Number((C.i32((128-1))))*1)-Number(k)*1)-Number(4)*1),C.literal("...?"));
                /* -4: "...?" */
            }
            C.variadic(129,(C.literal("paranoid_ynq")),5624,qbuf,BigInt((1*128)),C.literal("%s%s %s"),promptprefix,pbuf,responsetype);
            (C.cell(ans,"char").value=C.i8(0));
            C.getlin(qbuf,ans);
            C.mungspaces(ans);
            if(Number(!(C.strncmpi((ans),(C.literal("yes")),C.i32((-1)))))) {
                (c=C.i8(121));
                break;
            }
            if(Number(!!(Number(!(C.strncmpi((ans),(C.literal("quit")),C.i32((-1)))))||Number(C.i32(C.cell(ans,"char").value)==27)))) {
                (c=C.i8(113));
                break;
            }
            /* we don't bother adding "or \"Quit\"" for the accept_q case */
            (promptprefix=C.literal("\"Yes\" or \"No\": "));
            /* for empty input, return value c will already be 'n' */
        } while(Number(!!(Number(!!((Number((C.u32((C.field(C.flags,"flag","paranoia_bits").value&C.u32(1))))!=C.u32(0)))&&C.strncmpi((ans),(C.literal("no")),C.i32((-1)))))&&(trylimit=C.i32((trylimit-1))))));
    } else if(accept_q) {
        /* 'y', 'n', or 'q' */
        (c=yn_function(prompt,C.ynqchars,C.i8(110),(C.i8(0))));
    } else {
        /* 'y' or 'n' */
        (c=yn_function(prompt,C.ynchars,C.i8(110),(C.i8(0))));
    }
    if(Number(!!(Number(C.i32(c)!=121)&&(Number(!!(Number(C.i32(c)!=113)||Number(!(accept_q)))))))) (c=C.i8(110));
    return c;
    } finally {C.stackRestore(stackFrame); }
}

/* for paranoid_confirm:quit,die,attack,&c prompting; allows yes or n|no;
   result is True for yes; n|no and ESC yield False */
export function paranoid_query(be_paranoid,prompt)
{
    be_paranoid=C.i8(be_paranoid);
    return C.i8((Number(C.i32(paranoid_ynq(be_paranoid,prompt,(C.i8(0))))==121)));
}

/* ^Z command, #suspend */
export function dosuspend_core()
{
    /* Does current window system support suspend? */
    if(C.callProc((C.field(C.windowprocs,"window_procs","win_can_suspend").value),"boolean (void)")) {
        let now=C.getnow();
        (C.field(C.urealtime,"u_realtime","realtime").value=C.i64(C.field(C.urealtime,"u_realtime","realtime").value+C.timet_delta(now,C.field(C.urealtime,"u_realtime","start_timing").value)));
        (C.field(C.urealtime,"u_realtime","start_timing").value=now);
        /* as a safeguard against panic save */
        /* NB: SYSCF SHELLERS handled in port code. */
        C.dosuspend();
        (C.field(C.urealtime,"u_realtime","start_timing").value=C.getnow());
        /* resume keeping track of time */
    } else C.variadic(130,C.cmdnotavail,C.literal("#suspend"));
    return 0;
}

/* '!' command, #shell */
export function dosh_core()
{
    let now=C.getnow();
    (C.field(C.urealtime,"u_realtime","realtime").value=C.i64(C.field(C.urealtime,"u_realtime","realtime").value+C.timet_delta(now,C.field(C.urealtime,"u_realtime","start_timing").value)));
    (C.field(C.urealtime,"u_realtime","start_timing").value=now);
    /* (see dosuspend_core) */
    /* access restrictions, if any, are handled in port code */
    C.dosh();
    (C.field(C.urealtime,"u_realtime","start_timing").value=C.getnow());
    return 0;
}

export function dummyfunction()
{
    return 2;
}

/*cmd.c*/
export const initializers={timed_occ_fn,readchar_queue,unavailcmd,cmdnotavail,levltyp,extcmdlist,move_funcs,misc_keys,extcmdlist_length,spkeys_binds};
