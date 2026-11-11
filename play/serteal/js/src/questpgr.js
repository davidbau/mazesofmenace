/* NetHack 5.0	questpgr.c	$NHDT-Date: 1704043695 2023/12/31 17:28:15 $  $NHDT-Branch: keni-luabits2 $:$NHDT-Revision: 1.87 $ */
/*      Copyright 1991, M. Stephenson                             */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"
// #include "dlb.h"

/*  quest-specific pager routines. */

export const QTEXT_FILE = "quest.lua";


// #include "wintty.h"



/* sometimes find_qarti(gi.invent), and gi.invent can be null */
 











export function /* short */
quest_info(typ)
{
    switch (typ) {
    case 0:
        return gu.urole.questarti;
    case MS_LEADER:
        return gu.urole.ldrnum;
    case MS_NEMESIS:
        return gu.urole.neminum;
    case MS_GUARDIAN:
        return gu.urole.guardnum;
    default:
        impossible(_("quest_info(%d)"), typ);
    }
    return 0;
}

/* return your role leader's name */
export function /* const char * */
ldrname()
{
    let i = gu.urole.ldrnum;

    void sprintf(gn.nambuf, _("%s%s"), type_is_pname(mons[i]) ? _("") : _("the "), mons[i].pmnames[NEUTRAL])
;
    return gn.nambuf;
}

/* return your intermediate target string */
function /* const char * */
intermed()
{
    return gu.urole.intermed;
}

export function /* boolean */
is_quest_artifact(otmp)
{
    return (+(otmp.oartifact == gu.urole.questarti));
}

function /* struct obj * */
find_qarti(ochain)
{
    let otmp, qarti;

    for (otmp = ochain; otmp; otmp = otmp.nobj) {
        if (is_quest_artifact(otmp))
            return otmp;
        if (Has_contents(otmp) && (qarti = find_qarti(otmp.cobj)) != null)
            return qarti;
    }
    return null;
}

/* check several object chains for the quest artifact to determine
   whether it is present on the current level */
export function /* struct obj * */
find_quest_artifact(whichchains)
{
    let mtmp;
    let qarti = null;

    if ((whichchains & (1 << OBJ_INVENT)) != 0)
        qarti = find_qarti(gi.invent);
    if (!qarti && (whichchains & (1 << OBJ_FLOOR)) != 0)
        qarti = find_qarti(fobj());
    if (!qarti && (whichchains & (1 << OBJ_MINVENT)) != 0)
        for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
            if (DEADMONSTER(mtmp))
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) != null)
                break;
        }
    if (!qarti && (whichchains & (1 << OBJ_MIGRATING)) != 0) {
        /* check migrating objects and minvent of migrating monsters */
        for (mtmp = gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
            if (DEADMONSTER(mtmp))
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) != null)
                break;
        }
        if (!qarti)
            qarti = find_qarti(gm.migrating_objs);
    }
    if (!qarti && (whichchains & (1 << OBJ_BURIED)) != 0)
        qarti = find_qarti(svl.level.buriedobjlist);

    return qarti;
}

/* return your role nemesis' name */
function /* const char * */
neminame()
{
    let i = gu.urole.neminum;

    void sprintf(gn.nambuf, _("%s%s"), type_is_pname(mons[i]) ? _("") : _("the "), mons[i].pmnames[NEUTRAL])
;
    return gn.nambuf;
}

function /* const char * */
guardname() /* return your role leader's guard monster name */
{
    let i = gu.urole.guardnum;

    return mons[i].pmnames[NEUTRAL];
}

function /* const char * */
homebase() /* return your role leader's location */
{
    return gu.urole.homebase;
}

/* returns 1 if nemesis death message mentions noxious fumes, otherwise 0;
   does not display the message */
export function /* int */
stinky_nemesis(mon)
{ const $frame = stack_frame(); try {
    let mesg = stack_var(ptr_to(char), 0);
    let res = 0;














    (void (mon));
    /* since nemdead() just gave the message for hero's nemesis even if 'mon'
       is some other role's nemesis (feasible in wizard mode), base any gas
       cloud on the text that was shown even if not appropriate for 'mon' */
    void com_pager_core(gu.urole.filecode, _("killed_nemesis"), FALSE, mesg);


    /* this is somewhat fragile; it assumes that when both {noxious or
       poisonous or toxic} and {gas or fumes} are present, the latter
       refers to the former rather than to something unrelated; it does
       make sure that fumes occurs after noxious rather than before */
    if (mesg[0]) {
        let p;

        /* change newlines into spaces to cope with "...noxious\nfumes..." */
        void strNsubst(mesg[0], _("\n"), _(" "), 0);

        if (((p = strstri(mesg[0], _("noxious"))) != 0
             || (p = strstri(mesg[0], _("poisonous"))) != 0
             || (p = strstri(mesg[0], _("toxic"))) != 0)
            && (strstri(p, _(" gas")) || strstri(p, _(" fumes"))))
            res = 1;

        free((mesg[0]));
    }
    return res;
} finally { stack_pop($frame); } }

/* replace deity, leader, nemesis, or artifact name with pronoun;
   overwrites cvt_buf[] */
function /* void */
qtext_pronoun(
    who,
    which) /* 'h'|'H'|'i'|'I'|'j'|'J' */
{
    let pnoun;
    let godgend;
    let lwhich = lowc(which); /* H,I,J -> h,i,j */

    /*
     * Invalid subject (not d,l,n,o) yields neuter, singular result.
     *
     * For %o, treat all artifacts as neuter; some have plural names,
     * which genders[] doesn't handle; cvt_buf[] already contains name.
     */
    if (who == ord('o')
        && (strstri(gc.cvt_buf, _("Eyes "))
            || strncmpi((gc.cvt_buf), (makesingular(gc.cvt_buf)), -1))) {
        pnoun = (lwhich == ord('h')) ? _("they")
                : (lwhich == ord('i')) ? _("them")
                : (lwhich == ord('j')) ? _("their") : _("?");
    } else {
        godgend = (who == ord('d')) ? svq.quest_status.godgend
            : (who == ord('l')) ? svq.quest_status.ldrgend
            : (who == ord('n')) ? svq.quest_status.nemgend
            : 2; /* default to neuter */
        pnoun = (lwhich == ord('h')) ? genders[godgend].he
                : (lwhich == ord('i')) ? genders[godgend].him
                : (lwhich == ord('j')) ? genders[godgend].his : _("?");
    }
    void strcpy(gc.cvt_buf, pnoun);
    /* capitalize for H,I,J */
    if (lwhich != which)
        chars[gc.cvt_buf + 0] = highc(chars[gc.cvt_buf + 0]);
    return;
}

function /* void */
convert_arg(c)
{
    let str;

    switch (c) {
    case ord('p'):
        str = svp.plname;
        break;
    case ord('c'):
        str = (flags.female && gu.urole.name.f) ? gu.urole.name.f
                                               : gu.urole.name.m;
        break;
    case ord('r'):
        str = rank_of(u.ulevel, Role_switch(), flags.female);
        break;
    case ord('R'):
        str = rank_of(MIN_QUEST_LEVEL, Role_switch(), flags.female);
        break;
    case ord('s'):
        str = (flags.female) ? _("sister") : _("brother");
        break;
    case ord('S'):
        str = (flags.female) ? _("daughter") : _("son");
        break;
    case ord('l'):
        str = ldrname();
        break;
    case ord('i'):
        str = intermed();
        break;
    case ord('O'):
    case ord('o'):
        str = the(artiname(gu.urole.questarti));
        if (c == ord('O')) {
            /* shorten "the Foo of Bar" to "the Foo"
               (buffer returned by the() is modifiable) */
            let p = strstri(str, _(" of "));

            if (p)
                chars[p] = ord('\0');
        }
        break;
    case ord('n'):
        str = neminame();
        break;
    case ord('g'):
        str = guardname();
        break;
    case ord('G'):
        str = align_gtitle(chars[u.ualignbase + A_ORIGINAL]);
        break;
    case ord('H'):
        str = homebase();
        break;
    case ord('a'):
        str = align_str(chars[u.ualignbase + A_ORIGINAL]);
        break;
    case ord('A'):
        str = align_str(u.ualign.type);
        break;
    case ord('d'):
        str = align_gname(chars[u.ualignbase + A_ORIGINAL]);
        break;
    case ord('D'):
        str = align_gname(A_LAWFUL);
        break;
    case ord('C'):
        str = _("chaotic");
        break;
    case ord('N'):
        str = _("neutral");
        break;
    case ord('L'):
        str = _("lawful");
        break;
    case ord('x'):
        str = Blind() ? _("sense") : _("see");
        break;
    case ord('Z'):
        str = svd.dungeons[0].dname;
        break;
    case ord('%'):
        str = _("%");
        break;
    default:
        str = _("");
        break;
    }
    void strcpy(gc.cvt_buf, str);
}

function /* void */
convert_line(in_line, out_line)
{
    let c, cc;

    cc = out_line;
    for (c = in_line; chars[c]; c++) {
        chars[cc] = 0;
        switch (chars[c]) {
        case ord('\r'):
        case ord('\n'):
            chars[(++cc)] = 0;
            return;

        case ord('%'):
            if (chars[(c + 1)]) {
                convert_arg(chars[(++c)]);
                switch (chars[(++c)]) {
                /* insert "a"/"an" prefix */
                case ord('A'):
                    void strcat(cc, An(gc.cvt_buf));
                    cc += strlen(cc);
                    continue; /* for */
                case ord('a'):
                    void strcat(cc, an(gc.cvt_buf));
                    cc += strlen(cc);
                    continue; /* for */

                /* capitalize */
                case ord('C'):
                    chars[gc.cvt_buf + 0] = highc(chars[gc.cvt_buf + 0]);
                    break;

                /* replace name with pronoun;
                   valid for %d, %l, %n, and %o */
                case ord('h'): /* he/she */
                case ord('H'): /* He/She */
                case ord('i'): /* him/her */
                case ord('I'):
                case ord('j'): /* his/her */
                case ord('J'):
                    if (strchr(_("dlno"), lowc(chars[(c - 1)])))
                        qtext_pronoun(chars[(c - 1)], chars[c]);
                    else
                        --c; /* default action */
                    break;

                /* pluralize */
                case ord('P'):
                    chars[gc.cvt_buf + 0] = highc(chars[gc.cvt_buf + 0]);
                    /* FALLTHROUGH */;
                    /*FALLTHRU*/
                case ord('p'):
                    void strcpy(gc.cvt_buf, makeplural(gc.cvt_buf));
                    break;

                /* append possessive suffix */
                case ord('S'):
                    chars[gc.cvt_buf + 0] = highc(chars[gc.cvt_buf + 0]);
                    /* FALLTHROUGH */;
                    /*FALLTHRU*/
                case ord('s'):
                    void strcpy(gc.cvt_buf, s_suffix(gc.cvt_buf));
                    break;

                /* strip any "the" prefix */
                case ord('t'):
                    if (!strncmpi(gc.cvt_buf, _("the "), 4)) {
                        void strcat(cc, gc.cvt_buf + 4);
                        cc += strlen(cc);
                        continue; /* for */
                    }
                    break;

                default:
                    --c; /* undo switch increment */
                    break;
                }
                void strcat(cc, gc.cvt_buf);
                cc += strlen(gc.cvt_buf);
                break;
            }
            /* FALLTHROUGH */;
            /* FALLTHRU */
        default:
            chars[cc++] = chars[c];
            break;
        }
        if (cc > out_line + (BUFSZ - 1))
            panic(_("convert_line: overflow"));
    }
    chars[cc] = 0;
    return;
}

function /* void */
deliver_by_pline(str)
{ const $frame = stack_frame(); try {
    let in_line = stack_array(char, BUFSZ), out_line = stack_array(char, BUFSZ);
    let msgp = str, msgend = eos(str);

    while (msgp < msgend) {
        /* copynchars() will stop at newline if it finds one */
        copynchars(in_line, msgp, sizeof(array_of(char, BUFSZ)) - 1);
        msgp += unsigned(strlen(in_line) + 1);

        convert_line(in_line, out_line);
        pline(_("%s"), out_line);
    }
} finally { stack_pop($frame); } }

function /* void */
deliver_by_window(msg, how)
{ const $frame = stack_frame(); try {
    let in_line = stack_array(char, BUFSZ), out_line = stack_array(char, BUFSZ);
    let msgp = msg, msgend = eos(msg);
    let datawin = create_nhwindow()(how);

    while (msgp < msgend) {
        /* copynchars() will stop at newline if it finds one */
        copynchars(in_line, msgp, sizeof(array_of(char, BUFSZ)) - 1);
        msgp += unsigned(strlen(in_line) + 1);

        convert_line(in_line, out_line);
        putstr()(datawin, 0, out_line);
    }

    display_nhwindow()(datawin, TRUE);
    destroy_nhwindow()(datawin);
} finally { stack_pop($frame); } }

function /* boolean */
skip_pager(common)
{
    /* WIZKIT: suppress plot feedback if starting with quest artifact */
    if (program_state.wizkit_wishing)
        return TRUE;
    return FALSE;
}

function /* boolean */
com_pager_core(
    section,
    msgid,
    showerror,
    rawtext)
{ const $frame = stack_frame(); try {
    var howtoput = static_array("com_pager_core.howtoput", ptr_to(char), null, [
        _("pline"), _("window"), _("text"), _("menu"), _("default"), 0
    ]);
    var howtoput2i = static_array("com_pager_core.howtoput2i", int, null, [ 1, 2, 2, 3, 0, 0 ]);
    var output;
    var L;
    var text = 0, synopsis = 0, fallback_msgid = 0;
    var res = FALSE;
    var sbi = init_list(stack_struct(struct_nhl_sandbox_info), {flags: NHL_SB_SAFE, memlimit: 1*1024*1024, steps: 0, perpcall: 1*1024*1024});

    if (skip_pager(TRUE))
        return FALSE;

    L = nhl_init(sbi);
    compagerdone: { if (!L) {
        if (showerror)
            impossible(_("com_pager: nhl_init() failed"));
        break compagerdone;
    }

    if (!nhl_loadlua(L, _(QTEXT_FILE))) {
        if (showerror)
            impossible(_("com_pager: %s not found."), _(QTEXT_FILE));
        break compagerdone;
    }

    lua_settop(L, 0);
    lua_getglobal(L, _("questtext"));
    if (!lua_istable(L, -1)) {
        if (showerror)
            impossible(_("com_pager: questtext in %s is not a lua table"),
                       _(QTEXT_FILE));
        break compagerdone;
    }

    lua_getfield(L, -1, section);
    if (!lua_istable(L, -1)) {
        if (showerror)
            impossible(_("com_pager: questtext[%s] in %s is not a lua table"),
                       section, _(QTEXT_FILE));
        break compagerdone;
    }

 tryagain: for (;;) {
    lua_getfield(L, -1, fallback_msgid ? fallback_msgid : msgid);
    if (!lua_istable(L, -1)) {
        if (!fallback_msgid) {
            /* Do we have questtxt[msg_fallbacks][<msgid>]? */
            lua_getfield(L, -3, _("msg_fallbacks"));
            if (lua_istable(L, -1)) {
                fallback_msgid = get_table_str_opt(L, msgid, 0);
                lua_pop(L, 2);
                if (fallback_msgid)
                    continue tryagain;;
            }
        }
        if (showerror) {
            if (!fallback_msgid)
                impossible(
                      _("com_pager: questtext[%s][%s] in %s is not a lua table"),
                           section, msgid, _(QTEXT_FILE));
            else
                impossible(
           _("com_pager: questtext[%s][%s] and [][%s] in %s are not lua tables"),
                           section, msgid, fallback_msgid, _(QTEXT_FILE));
        }
        break compagerdone;
    } break; }

    text = get_table_str_opt(L, _("text"), 0);
    if (rawtext) {
        rawtext[0] = dupstr(text);
        res = TRUE;
        break compagerdone;
    }
    synopsis = get_table_str_opt(L, _("synopsis"), 0);
    output = howtoput2i[get_table_option(L, _("output"), _("default"), howtoput)];

    if (!text) {
        var nelems;

        lua_len(L, -1);
        nelems = int(lua_tointeger(L, -1));
        lua_pop(L, 1);
        if (nelems < 2) {
            if (showerror)
                impossible(
              _("com_pager: questtext[%s][%s] in %s is not an array of strings"),
                           section, fallback_msgid ? fallback_msgid : msgid,
                           _(QTEXT_FILE));
            break compagerdone;
        }
        nelems = rn2(nelems) + 1;
        lua_pushinteger(L, nelems);
        lua_gettable(L, -2);
        text = dupstr(luaL_checkstring(L, -1));
    }

    /* switch from by_pline to by_window if line has multiple segments or
       is unreasonably long (the latter ought to checked after formatting
       conversions rather than before...) */
    if (output == 0 && (strchr(text, ord('\n')) || strlen(text) >= BUFSZ - 1)) {
        output = 2;

        /*
         * FIXME:  should update quest.lua to include proper synopsis line
         * for any item subject to having its delivery converted to by_window.
         */
        if (!synopsis) {
            var tmpbuf = stack_array(char, BUFSZ);

            void sprintf(tmpbuf, _("[%.*s]"), BUFSZ - 1 - 2, text);
            /* change every newline character to a space */
            void strNsubst(tmpbuf, _("\n"), _(" "), 0);
            synopsis = dupstr(tmpbuf);
        }
    }

    if (output == 0 || output == 1)
        deliver_by_pline(text);
    else
        deliver_by_window(text, (output == 3) ? NHW_MENU : NHW_TEXT);

    if (synopsis) {
        var in_line = stack_array(char, BUFSZ), out_line = stack_array(char, BUFSZ);





        void strcpy(in_line, synopsis);

        convert_line(in_line, out_line);
        /* bypass message delivery but be available for ^P recall */
        putmsghistory()(out_line, FALSE);
    }
    res = TRUE;

 }
    if (text)
        free(text);
    if (synopsis)
        free(synopsis);
    if (fallback_msgid)
        free(fallback_msgid);
    nhl_done(L);
    return res;
} finally { stack_pop($frame); } }

export function /* void */
com_pager(msgid)
{
    void com_pager_core(_("common"), msgid, TRUE, null);
}

export function /* void */
qt_pager(msgid)
{
    if (!com_pager_core(gu.urole.filecode, msgid, FALSE, null))
        void com_pager_core(_("common"), msgid, TRUE, null);
}

export function /* struct permonst * */
qt_montype()
{
    let qpm;

    if (rn2(5)) {
        qpm = gu.urole.enemy1num;
        if (qpm != NON_PM && rn2(5) && !(svm.mvitals[qpm].mvflags & G_GENOD))
            return mons[qpm];
        return mkclass(gu.urole.enemy1sym, 0);
    }
    qpm = gu.urole.enemy2num;
    if (qpm != NON_PM && rn2(5) && !(svm.mvitals[qpm].mvflags & G_GENOD))
        return mons[qpm];
    return mkclass(gu.urole.enemy2sym, 0);
}

/* special levels can include a custom arrival message; display it */
export function /* void */
deliver_splev_message()
{
    /* there's no provision for delivering via window instead of pline */
    if (gl.lev_message) {
        deliver_by_pline(gl.lev_message);

        free(gl.lev_message);
        gl.lev_message = 0;
    }
}



/*questpgr.c*/
import { A_LAWFUL } from "./align.h.js";
import { BUFSZ } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { NHL_SB_SAFE } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { struct_nhl_sandbox_info } from "./global.h.js";
import { luaL_checkstring } from "./lauxlib.h.macros.js";
import { lua_istable } from "./lua.h.macros.js";
import { lua_pop } from "./lua.h.macros.js";
import { lua_tointeger } from "./lua.h.macros.js";
import { type_is_pname } from "./mondata.h.macros.js";
import { G_GENOD } from "./monflag.h.js";
import { MS_GUARDIAN } from "./monflag.h.js";
import { MS_LEADER } from "./monflag.h.js";
import { MS_NEMESIS } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { NON_PM } from "./monsters.h.js";
import { OBJ_BURIED } from "./obj.h.js";
import { OBJ_FLOOR } from "./obj.h.js";
import { OBJ_INVENT } from "./obj.h.js";
import { OBJ_MIGRATING } from "./obj.h.js";
import { OBJ_MINVENT } from "./obj.h.js";
import { Has_contents } from "./obj.h.macros.js";
import { MIN_QUEST_LEVEL } from "./quest.h.js";
import { fmon } from "./rm.h.macros.js";
import { fobj } from "./rm.h.macros.js";
import { create_nhwindow } from "./winprocs.h.macros.js";
import { destroy_nhwindow } from "./winprocs.h.macros.js";
import { display_nhwindow } from "./winprocs.h.macros.js";
import { putmsghistory } from "./winprocs.h.macros.js";
import { putstr } from "./winprocs.h.macros.js";
import { NHW_MENU } from "./wintype.h.js";
import { NHW_TEXT } from "./wintype.h.js";
import { A_ORIGINAL } from "./you.h.js";
import { Role_switch } from "./you.h.macros.js";
import { Blind } from "./youprop.h.macros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { free } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strchr } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { init_list } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { lua_getfield } from "../rt/lua.js";
import { lua_getglobal } from "../rt/lua.js";
import { lua_gettable } from "../rt/lua.js";
import { lua_len } from "../rt/lua.js";
import { lua_pushinteger } from "../rt/lua.js";
import { lua_settop } from "../rt/lua.js";
import { _ } from "../rt/strings.js";
import { array_of } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { dupstr } from "./alloc.js";
import { artiname } from "./artifact.js";
import { rank_of } from "./botl.js";
import { flags } from "./decl.js";
import { gc } from "./decl.js";
import { gi } from "./decl.js";
import { gl } from "./decl.js";
import { gm } from "./decl.js";
import { gn } from "./decl.js";
import { gu } from "./decl.js";
import { program_state } from "./decl.js";
import { svd } from "./decl.js";
import { svl } from "./decl.js";
import { svm } from "./decl.js";
import { svp } from "./decl.js";
import { svq } from "./decl.js";
import { u } from "./decl.js";
import { panic } from "./end.js";
import { copynchars } from "./hacklib.js";
import { eos } from "./hacklib.js";
import { highc } from "./hacklib.js";
import { lowc } from "./hacklib.js";
import { s_suffix } from "./hacklib.js";
import { strNsubst } from "./hacklib.js";
import { strncmpi } from "./hacklib.js";
import { strstri } from "./hacklib.js";
import { align_str } from "./insight.js";
import { mkclass } from "./makemon.js";
import { mons } from "./monst.js";
import { get_table_option } from "./nhlua.js";
import { get_table_str_opt } from "./nhlua.js";
import { nhl_done } from "./nhlua.js";
import { nhl_init } from "./nhlua.js";
import { nhl_loadlua } from "./nhlua.js";
import { An } from "./objnam.js";
import { an } from "./objnam.js";
import { makeplural } from "./objnam.js";
import { makesingular } from "./objnam.js";
import { the } from "./objnam.js";
import { impossible } from "./pline.js";
import { pline } from "./pline.js";
import { align_gname } from "./pray.js";
import { align_gtitle } from "./pray.js";
import { rn2 } from "./rnd.js";
import { genders } from "./role.js";
