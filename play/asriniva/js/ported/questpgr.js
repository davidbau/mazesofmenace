import { C } from '../c-runtime/context.js';

export const QTEXT_FILE = "quest.lua";
/* NetHack 5.0	questpgr.c	$NHDT-Date: 1704043695 2023/12/31 17:28:15 $  $NHDT-Branch: keni-luabits2 $:$NHDT-Revision: 1.87 $ */
/*      Copyright 1991, M. Stephenson                             */
/* NetHack may be freely redistributed.  See license for details. */


/*  quest-specific pager routines. */



/* sometimes find_qarti(gi.invent), and gi.invent can be null */

export function quest_info(typ)
{
    typ = C.int(typ);
    switch (typ) {
    case 0:
        return C.gu.urole.questarti;
    case C.MS_LEADER:
        return C.gu.urole.ldrnum;
    case C.MS_NEMESIS:
        return C.gu.urole.neminum;
    case C.MS_GUARDIAN:
        return C.gu.urole.guardnum;
    default:
        C.impossible("quest_info(%d)", typ);
    }
    return 0;
}

/* return your role leader's name */
export function ldrname()
{
    let i = C.gu.urole.ldrnum;

    C.Sprintf(C.gn.nambuf, "%s%s", C.type_is_pname(C.mons[i]) ? "" : "the ",
            C.mons[i].pmnames[C.NEUTRAL]);
    return C.gn.nambuf;
}

/* return your intermediate target string */
export function intermed()
{
    return C.gu.urole.intermed;
}

export function is_quest_artifact(otmp)
{
    return (otmp.oartifact == C.gu.urole.questarti);
}

export function find_qarti(ochain)
{
    let otmp, qarti;

    for (otmp = ochain; otmp; otmp = otmp.nobj) {
        if (is_quest_artifact(otmp))
            return otmp;
        if (C.Has_contents(otmp) && (qarti = find_qarti(otmp.cobj)) != 0)
            return qarti;
    }
    return 0;
}

/* check several object chains for the quest artifact to determine
   whether it is present on the current level */
export function find_quest_artifact(whichchains)
{
    whichchains = C.uint(whichchains);
    let mtmp;
    let qarti = 0;

    if ((whichchains & (1 << C.OBJ_INVENT)) != 0)
        qarti = find_qarti(C.gi.invent);
    if (!qarti && (whichchains & (1 << C.OBJ_FLOOR)) != 0)
        qarti = find_qarti(C.fobj);
    if (!qarti && (whichchains & (1 << C.OBJ_MINVENT)) != 0)
        for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
            if (C.DEADMONSTER(mtmp))
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) != 0)
                break;
        }
    if (!qarti && (whichchains & (1 << C.OBJ_MIGRATING)) != 0) {
        /* check migrating objects and minvent of migrating monsters */
        for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
            if (C.DEADMONSTER(mtmp))
                continue;
            if ((qarti = find_qarti(mtmp.minvent)) != 0)
                break;
        }
        if (!qarti)
            qarti = find_qarti(C.gm.migrating_objs);
    }
    if (!qarti && (whichchains & (1 << C.OBJ_BURIED)) != 0)
        qarti = find_qarti(C.svl.level.buriedobjlist);

    return qarti;
}

/* return your role nemesis' name */
export function neminame()
{
    let i = C.gu.urole.neminum;

    C.Sprintf(C.gn.nambuf, "%s%s", C.type_is_pname(C.mons[i]) ? "" : "the ",
            C.mons[i].pmnames[C.NEUTRAL]);
    return C.gn.nambuf;
}

export function guardname()
/* return your role leader's guard monster name */
{
    let i = C.gu.urole.guardnum;

    return C.mons[i].pmnames[C.NEUTRAL];
}

export function homebase()
/* return your role leader's location */
{
    return C.gu.urole.homebase;
}

/* returns 1 if nemesis death message mentions noxious fumes, otherwise 0;
   does not display the message */
export function stinky_nemesis(mon)
{
    let mesg = 0;
    let res = 0;

    // nhUse(mon);
    /* since nemdead() just gave the message for hero's nemesis even if 'mon'
       is some other role's nemesis (feasible in wizard mode), base any gas
       cloud on the text that was shown even if not appropriate for 'mon' */
    C.callLocal(com_pager_core, C.gu.urole.filecode, "killed_nemesis", 0, C.charPointerReference(() => mesg, value => { mesg = value; }));

    /* this is somewhat fragile; it assumes that when both {noxious or
       poisonous or toxic} and {gas or fumes} are present, the latter
       refers to the former rather than to something unrelated; it does
       make sure that fumes occurs after noxious rather than before */
    if (mesg) {
        let p;

        /* change newlines into spaces to cope with "...noxious\nfumes..." */
        C.strNsubst(mesg, "\n", " ", 0);

        if (((p = C.strstri(mesg, "noxious")) != 0
             || (p = C.strstri(mesg, "poisonous")) != 0
             || (p = C.strstri(mesg, "toxic")) != 0)
            && (C.strstri(p, " gas") || C.strstri(p, " fumes")))
            res = 1;

        C.free(mesg);
    }
    return res;
}

/* replace deity, leader, nemesis, or artifact name with pronoun;
   overwrites cvt_buf[] */
export function qtext_pronoun(who, which)
/* 'd' => deity, 'l' => leader, 'n' => nemesis, 'o' => arti */ /* 'h'|'H'|'i'|'I'|'j'|'J' */
{
    who = C.char(who); which = C.char(which);
    let pnoun;
    let godgend;
    let lwhich = C.lowc(which); /* H,I,J -> h,i,j */

    /*
     * Invalid subject (not d,l,n,o) yields neuter, singular result.
     *
     * For %o, treat all artifacts as neuter; some have plural names,
     * which genders[] doesn't handle; cvt_buf[] already contains name.
     */
    if (who == 'o'.charCodeAt(0)
        && (C.strstri(C.gc.cvt_buf, "Eyes ")
            || C.strcmpi(C.gc.cvt_buf, C.makesingular(C.gc.cvt_buf)))) {
        pnoun = (lwhich == 'h'.charCodeAt(0)) ? "they"
                : (lwhich == 'i'.charCodeAt(0)) ? "them"
                : (lwhich == 'j'.charCodeAt(0)) ? "their" : "?";
    } else {
        godgend = (who == 'd'.charCodeAt(0)) ? C.svq.quest_status.godgend
            : (who == 'l'.charCodeAt(0)) ? C.svq.quest_status.ldrgend
            : (who == 'n'.charCodeAt(0)) ? C.svq.quest_status.nemgend
            : 2; /* default to neuter */
        pnoun = (lwhich == 'h'.charCodeAt(0)) ? C.genders[godgend].he
                : (lwhich == 'i'.charCodeAt(0)) ? C.genders[godgend].him
                : (lwhich == 'j'.charCodeAt(0)) ? C.genders[godgend].his : "?";
    }
    C.Strcpy(C.gc.cvt_buf, pnoun);
    /* capitalize for H,I,J */
    if (lwhich != which)
        C.storeChar(C.gc.cvt_buf, C.highc(C.loadChar(C.gc.cvt_buf)));
    return;
}

export function convert_arg(c)
{
    c = C.char(c);
    let str;

    switch (c) {
    case 'p'.charCodeAt(0):
        str = C.svp.plname;
        break;
    case 'c'.charCodeAt(0):
        str = (C.flags.female && C.gu.urole.name.f) ? C.gu.urole.name.f
                                               : C.gu.urole.name.m;
        break;
    case 'r'.charCodeAt(0):
        str = C.rank_of(C.u.ulevel, C.Role_switch, C.flags.female);
        break;
    case 'R'.charCodeAt(0):
        str = C.rank_of(C.MIN_QUEST_LEVEL, C.Role_switch, C.flags.female);
        break;
    case 's'.charCodeAt(0):
        str = (C.flags.female) ? "sister" : "brother";
        break;
    case 'S'.charCodeAt(0):
        str = (C.flags.female) ? "daughter" : "son";
        break;
    case 'l'.charCodeAt(0):
        str = ldrname();
        break;
    case 'i'.charCodeAt(0):
        str = intermed();
        break;
    case 'O'.charCodeAt(0):
    case 'o'.charCodeAt(0):
        str = C.the(C.artiname(C.gu.urole.questarti));
        if (c == 'O'.charCodeAt(0)) {
            /* shorten "the Foo of Bar" to "the Foo"
               (buffer returned by the() is modifiable) */
            let p = C.strstri(str, " of ");

            if (p)
                C.storeChar(p, '\0'.charCodeAt(0));
        }
        break;
    case 'n'.charCodeAt(0):
        str = neminame();
        break;
    case 'g'.charCodeAt(0):
        str = guardname();
        break;
    case 'G'.charCodeAt(0):
        str = C.align_gtitle(C.u.ualignbase[C.A_ORIGINAL]);
        break;
    case 'H'.charCodeAt(0):
        str = homebase();
        break;
    case 'a'.charCodeAt(0):
        str = C.align_str(C.u.ualignbase[C.A_ORIGINAL]);
        break;
    case 'A'.charCodeAt(0):
        str = C.align_str(C.u.ualign.type);
        break;
    case 'd'.charCodeAt(0):
        str = C.align_gname(C.u.ualignbase[C.A_ORIGINAL]);
        break;
    case 'D'.charCodeAt(0):
        str = C.align_gname(C.A_LAWFUL);
        break;
    case 'C'.charCodeAt(0):
        str = "chaotic";
        break;
    case 'N'.charCodeAt(0):
        str = "neutral";
        break;
    case 'L'.charCodeAt(0):
        str = "lawful";
        break;
    case 'x'.charCodeAt(0):
        str = C.Blind ? "sense" : "see";
        break;
    case 'Z'.charCodeAt(0):
        str = C.svd.dungeons[0].dname;
        break;
    case '%'.charCodeAt(0):
        str = "%";
        break;
    default:
        str = "";
        break;
    }
    C.Strcpy(C.gc.cvt_buf, str);
}

export function convert_line(in_line, out_line)
{
    let c, cc;

    cc = out_line;
    for (c = in_line; C.loadChar(c); c++) {
        C.storeChar(cc, 0);
        switch (C.loadChar(c)) {
        case '\r'.charCodeAt(0):
        case '\n'.charCodeAt(0):
            C.storeChar(++cc, 0);
            return;

        case '%'.charCodeAt(0):
            if (C.loadChar(c + 1)) {
                convert_arg(C.loadChar(++c));
                switch (C.loadChar(++c)) {
                /* insert "a"/"an" prefix */
                case 'A'.charCodeAt(0):
                    C.Strcat(cc, C.An(C.gc.cvt_buf));
                    cc += C.strlen(cc);
                    continue; /* for */
                case 'a'.charCodeAt(0):
                    C.Strcat(cc, C.an(C.gc.cvt_buf));
                    cc += C.strlen(cc);
                    continue; /* for */

                /* capitalize */
                case 'C'.charCodeAt(0):
                    C.storeChar(C.gc.cvt_buf, C.highc(C.loadChar(C.gc.cvt_buf)));
                    break;

                /* replace name with pronoun;
                   valid for %d, %l, %n, and %o */
                case 'h'.charCodeAt(0): /* he/she */
                case 'H'.charCodeAt(0): /* He/She */
                case 'i'.charCodeAt(0): /* him/her */
                case 'I'.charCodeAt(0):
                case 'j'.charCodeAt(0): /* his/her */
                case 'J'.charCodeAt(0):
                    if (C.strchr("dlno", C.lowc(C.loadChar(c - 1))))
                        qtext_pronoun(C.loadChar(c - 1), C.loadChar(c));
                    else
                        --c; /* default action */
                    break;

                /* pluralize */
                case 'P'.charCodeAt(0):
                    C.storeChar(C.gc.cvt_buf, C.highc(C.loadChar(C.gc.cvt_buf)));
                    
                    /*FALLTHRU*/
                case 'p'.charCodeAt(0):
                    C.Strcpy(C.gc.cvt_buf, C.makeplural(C.gc.cvt_buf));
                    break;

                /* append possessive suffix */
                case 'S'.charCodeAt(0):
                    C.storeChar(C.gc.cvt_buf, C.highc(C.loadChar(C.gc.cvt_buf)));
                    
                    /*FALLTHRU*/
                case 's'.charCodeAt(0):
                    C.Strcpy(C.gc.cvt_buf, C.s_suffix(C.gc.cvt_buf));
                    break;

                /* strip any "the" prefix */
                case 't'.charCodeAt(0):
                    if (!C.strncmpi(C.gc.cvt_buf, "the ", 4)) {
                        C.Strcat(cc, C.ptrAdd(C.gc.cvt_buf, 4));
                        cc += C.strlen(cc);
                        continue; /* for */
                    }
                    break;

                default:
                    --c; /* undo switch increment */
                    break;
                }
                C.Strcat(cc, C.gc.cvt_buf);
                cc += C.strlen(C.gc.cvt_buf);
                break;
            }
            
            /* FALLTHRU */
        default:
            C.storeChar(cc++, C.loadChar(c));
            break;
        }
        if (cc > C.ptrAdd(out_line, C.BUFSZ - 1))
            C.panic("convert_line: overflow");
    }
    C.storeChar(cc, 0);
    return;
}

export function deliver_by_pline(str)
{
    const in_line = C.stackAlloc(C.BUFSZ), out_line = C.stackAlloc(C.BUFSZ);
    let msgp = str, msgend = C.eos(str);

    while (msgp < msgend) {
        /* copynchars() will stop at newline if it finds one */
        C.copynchars(in_line, msgp, C.BUFSZ - 1);
        msgp += C.strlen(in_line) + 1;

        convert_line(in_line, out_line);
        C.pline("%s", out_line);
    }
}

export function deliver_by_window(msg, how)
{
    how = C.int(how);
    const in_line = C.stackAlloc(C.BUFSZ), out_line = C.stackAlloc(C.BUFSZ);
    let msgp = msg, msgend = C.eos(msg);
    let datawin = C.create_nhwindow(how);

    while (msgp < msgend) {
        /* copynchars() will stop at newline if it finds one */
        C.copynchars(in_line, msgp, C.BUFSZ - 1);
        msgp += C.strlen(in_line) + 1;

        convert_line(in_line, out_line);
        C.putstr(datawin, 0, out_line);
    }

    C.display_nhwindow(datawin, 1);
    C.destroy_nhwindow(datawin);
}

export function skip_pager(common)
{
    common = C.boolean(common);
    /* WIZKIT: suppress plot feedback if starting with quest artifact */
    if (C.program_state.wizkit_wishing)
        return 1;
    return 0;
}

export function com_pager_core(section, msgid, showerror, rawtext)
{
    showerror = C.boolean(showerror);
    const howtoput = [
        "pline", "window", "text", "menu", "default", 0
    ];
    const howtoput2i = [ 1, 2, 2, 3, 0, 0 ];
    let output;
    let L;
    let text = 0, synopsis = 0, fallback_msgid = 0;
    let res = 0;
    const sbi = C.sandboxLocal(C.NHL_SB_SAFE, 1*1024*1024, 0, 1*1024*1024);

    compagerdone: {
    if (skip_pager(1))
        return 0;

    L = C.nhl_init(sbi);
    if (!L) {
        if (showerror)
            C.impossible("com_pager: nhl_init() failed");
        break compagerdone;
    }

    if (!C.nhl_loadlua(L, QTEXT_FILE)) {
        if (showerror)
            C.impossible("com_pager: %s not found.", QTEXT_FILE);
        break compagerdone;
    }

    C.lua_settop(L, 0);
    C.lua_getglobal(L, "questtext");
    if (!C.lua_istable(L, -1)) {
        if (showerror)
            C.impossible("com_pager: questtext in %s is not a lua table",
                       QTEXT_FILE);
        break compagerdone;
    }

    C.lua_getfield(L, -1, section);
    if (!C.lua_istable(L, -1)) {
        if (showerror)
            C.impossible("com_pager: questtext[%s] in %s is not a lua table",
                       section, QTEXT_FILE);
        break compagerdone;
    }

    tryagain: for (;;) {
    C.lua_getfield(L, -1, fallback_msgid ? fallback_msgid : msgid);
    if (!C.lua_istable(L, -1)) {
        if (!fallback_msgid) {
            /* Do we have questtxt[msg_fallbacks][<msgid>]? */
            C.lua_getfield(L, -3, "msg_fallbacks");
            if (C.lua_istable(L, -1)) {
                fallback_msgid = C.get_table_str_opt(L, msgid, 0);
                C.lua_pop(L, 2);
                if (fallback_msgid)
                    continue tryagain;
            }
        }
        if (showerror) {
            if (!fallback_msgid)
                C.impossible(
                      "com_pager: questtext[%s][%s] in %s is not a lua table",
                           section, msgid, QTEXT_FILE);
            else
                C.impossible(
           "com_pager: questtext[%s][%s] and [][%s] in %s are not lua tables",
                           section, msgid, fallback_msgid, QTEXT_FILE);
        }
        break compagerdone;
    }

    text = C.get_table_str_opt(L, "text", 0);
    if (rawtext) {
        rawtext.value = C.dupstr(text);
        res = 1;
        break compagerdone;
    }
    synopsis = C.get_table_str_opt(L, "synopsis", 0);
    output = howtoput2i[C.get_table_option(L, "output", "default", howtoput)];

    if (!text) {
        let nelems;

        C.lua_len(L, -1);
        nelems = C.int(C.lua_tointeger(L, -1));
        C.lua_pop(L, 1);
        if (nelems < 2) {
            if (showerror)
                C.impossible(
              "com_pager: questtext[%s][%s] in %s is not an array of strings",
                           section, fallback_msgid ? fallback_msgid : msgid,
                           QTEXT_FILE);
            break compagerdone;
        }
        nelems = C.rn2(nelems, 566, 'com_pager_core') + 1;
        C.lua_pushinteger(L, nelems);
        C.lua_gettable(L, -2);
        text = C.dupstr(C.luaL_checkstring(L, -1));
    }

    /* switch from by_pline to by_window if line has multiple segments or
       is unreasonably long (the latter ought to checked after formatting
       conversions rather than before...) */
    if (output == 0 && (C.strchr(text, '\n'.charCodeAt(0)) || C.strlen(text) >= C.BUFSZ - 1)) {
        output = 2;

        /*
         * FIXME:  should update quest.lua to include proper synopsis line
         * for any item subject to having its delivery converted to by_window.
         */
        if (!synopsis) {
            const tmpbuf = C.stackAlloc(C.BUFSZ);

            C.Sprintf(tmpbuf, "[%.*s]", C.BUFSZ - 1 - 2, text);
            /* change every newline character to a space */
            C.strNsubst(tmpbuf, "\n", " ", 0);
            synopsis = C.dupstr(tmpbuf);
        }
    }

    if (output == 0 || output == 1)
        C.callLocal(deliver_by_pline, text);
    else
        C.callLocal(deliver_by_window, text, (output == 3) ? C.NHW_MENU : C.NHW_TEXT);

    if (synopsis) {
        const in_line = C.stackAlloc(C.BUFSZ), out_line = C.stackAlloc(C.BUFSZ);

        C.Strcpy(in_line, synopsis);
        convert_line(in_line, out_line);
        /* bypass message delivery but be available for ^P recall */
        C.putmsghistory(out_line, 0);
    }
    res = 1;

    break;
    }
    }
    if (text)
        C.free(text);
    if (synopsis)
        C.free(synopsis);
    if (fallback_msgid)
        C.free(fallback_msgid);
    C.nhl_done(L);
    return res;
}

export function com_pager(msgid)
{
    C.callLocal(com_pager_core, "common", msgid, 1, 0);
}

export function qt_pager(msgid)
{
    if (!C.callLocal(com_pager_core, C.gu.urole.filecode, msgid, 0, 0))
        C.callLocal(com_pager_core, "common", msgid, 1, 0);
}

export function qt_montype()
{
    let qpm;

    if (C.rn2(5, 641, 'qt_montype')) {
        qpm = C.gu.urole.enemy1num;
        if (qpm != C.NON_PM && C.rn2(5, 643, 'qt_montype') && !(C.svm.mvitals[qpm].mvflags & C.G_GENOD))
            return C.mons[qpm];
        return C.mkclass(C.gu.urole.enemy1sym, 0);
    }
    qpm = C.gu.urole.enemy2num;
    if (qpm != C.NON_PM && C.rn2(5, 648, 'qt_montype') && !(C.svm.mvitals[qpm].mvflags & C.G_GENOD))
        return C.mons[qpm];
    return C.mkclass(C.gu.urole.enemy2sym, 0);
}

/* special levels can include a custom arrival message; display it */
export function deliver_splev_message()
{
    /* there's no provision for delivering via window instead of pline */
    if (C.gl.lev_message) {
        C.callLocal(deliver_by_pline, C.gl.lev_message);

        C.free(C.gl.lev_message);
        C.gl.lev_message = 0;
    }
}


/*questpgr.c*/

/* get the quest text for dying nemesis; don't assume that mon is
       hero's own role's nemesis (overkill since m_detach() and nemdead()
       both make that assumption--valid for normal play but not necessarily
       valid for wizard mode) */

/* not yet -- brackets need to be removed from quest.lua */
