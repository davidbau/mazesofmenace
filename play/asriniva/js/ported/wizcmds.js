/* NetHack 5.0	wizcmds.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.21 $ */
/*-Copyright (c) Robert Patrick Rankin, 2024. */
/* NetHack may be freely redistributed.  See license for details. */
import { C } from './c-runtime.js';

/* cmd.c [27] */
/* cmd.c */

/* #wizwish command - wish for something */
export function wiz_wish() /* Unlimited wishes for debug mode by Paul Polderman */
{
    if (C.wizard) {
        let save_verbose = C.flags.verbose;

        C.flags.verbose = C.FALSE;
        C.makewish();
        C.flags.verbose = save_verbose;
        C.encumber_msg();
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_wish));
    return C.ECMD_OK;
}

/* #wizidentify command - reveal and optionally identify hero's inventory */
export function wiz_identify()
{
    if (C.wizard) {
        C.iflags.override_ID = C.int(C.cmd_from_func(wiz_identify));
        /* command remapping might leave #wizidentify as the only way
           to invoke us, in which case cmd_from_func() will yield NUL;
           it won't matter to display_inventory()/display_pickinv()
           if ^I invokes some other command--what matters is that
           display_pickinv() and xname() see override_ID as nonzero */
        if (!C.iflags.override_ID)
            C.iflags.override_ID = C.ctrl('I');
        C.display_inventory(0, C.FALSE);
        C.iflags.override_ID = 0;
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_identify));
    return C.ECMD_OK;
}

/* used when wiz_makemap() gets rid of monsters for the old incarnation of
   a level before creating a new incarnation of it */
export function makemap_unmakemon(mtmp, migratory)
{
    let ndx = C.monsndx(mtmp.data);

    /* uncreate any unique monster so that it is eligible to be remade
       on the new incarnation of the level; ignores DEADMONSTER() [why?] */
    if (mtmp.data.geno & C.G_UNIQ)
        C.svm.mvitals[ndx].mvflags &= ~C.G_EXTINCT;
    if (C.svm.mvitals[ndx].born)
        C.svm.mvitals[ndx].born--;

    /* vault is going away; get rid of guard who might be in play or
       be parked at <0,0>; for the latter, might already be flagged as
       dead but is being kept around because of the 'isgd' flag */
    if (mtmp.isgd) {
        mtmp.isgd = 0; /* after this, fall through to mongone() */
    } else if (C.DEADMONSTER(mtmp)) {
        return; /* already set to be discarded */
    } else if (mtmp.isshk && C.on_level(C.u.uz, C.ESHK(mtmp).shoplevel)) {
        C.setpaid(mtmp);
    }
    if (migratory) {
        /* caller has removed 'mtmp' from migrating_mons; put it onto fmon
           so that dmonsfree() bookkeeping for number of dead or removed
           monsters won't get out of sync; it is not on the map but
           mongone() -> m_detach() -> mon_leaving_level() copes with that */
        mtmp.mstate |= C.long(C.MON_OFFMAP);
        mtmp.mstate &= ~(C.long(C.MON_MIGRATING) | C.long(C.MON_LIMBO) | C.long(C.MON_ENDGAME_MIGR));
        mtmp.nmon = C.fmon;
        C.fmon = mtmp;
    }
    C.mongone(mtmp);
}

/* get rid of the all the monsters on--or intimately involved with--current
   level; used when #wizmakemap destroys the level before replacing it */
export function makemap_remove_mons()
{
    let mtmp, mprev;

    /* keep steed and other adjacent pets after releasing them
       from traps, stopping eating, &c as if hero were ascending */
    C.keepdogs(C.TRUE); /* (pets-only; normally we'd be using 'FALSE') */
    /* get rid of all the monsters that didn't make it to 'mydogs' */
    for (mtmp = C.fmon; mtmp; mtmp = mtmp.nmon) {
        /* if already dead, dmonsfree(below) will get rid of it */
        if (C.DEADMONSTER(mtmp))
            continue;
        C.callLocal(makemap_unmakemon, mtmp, C.FALSE);
    }
    /* some monsters retain details of this level in mon->mextra; that
       data becomes invalid when the level is replaced by a new one;
       get rid of them now if migrating or already arrived elsewhere;
       [when on their 'home' level, the previous loop got rid of them;
       if they aren't actually migrating but have been placed on some
       'away' level, such monsters are treated like the Wizard:  kept
       on migrating monsters list, scheduled to migrate back to their
       present location instead of being saved with whatever level they
       happen to be on; see keepdogs() and keep_mon_accessible(dog.c)] */
    for (mprev = C.fieldPointer(C.gm, 'migrating_mons'); (mtmp = mprev.value) != 0;) {
        if (mtmp.mextra
            && ((mtmp.isshk && C.on_level(C.u.uz, C.ESHK(mtmp).shoplevel))
                || (mtmp.ispriest && C.on_level(C.u.uz, C.EPRI(mtmp).shrlevel))
                || (mtmp.isgd && C.on_level(C.u.uz, C.EGD(mtmp).gdlevel)))) {
            mprev.value = mtmp.nmon;
            C.callLocal(makemap_unmakemon, mtmp, C.TRUE);
        } else {
            mprev = C.fieldPointer(mtmp, 'nmon');
        }
    }
    /* release dead and 'unmade' monsters */
    C.dmonsfree();
    if (C.fmon) {
        C.impossible("makemap_remove_mons: 'fmon' did not get emptied?");
    }
    return;
}

/* #wizmakemap - discard current dungeon level and replace with a new one */
export function wiz_makemap()
{
    if (C.wizard) {
        let was_in_W_tower = C.In_W_tower(C.u.ux, C.u.uy, C.u.uz);

        C.makemap_prepost(C.TRUE, was_in_W_tower);
        /* create a new level; various things like bestowing a guardian
           angel on Astral or setting off alarm on Ft.Ludios are handled
           by goto_level(do.c) so won't occur for replacement levels */
        C.mklev();
        C.makemap_prepost(C.FALSE, was_in_W_tower);
    } else {
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_makemap));
    }
    return C.ECMD_OK;
}

/* the #wizmap command - reveal the level map
   and any traps or engravings on it */
export function wiz_map()
{
    if (C.wizard) {
        let t;
        let ep;
        let save_Hconf = C.HConfusion, save_Hhallu = C.HHallucination;

        C.notice_mon_off();
        C.HConfusion = C.HHallucination = 0n;
        for (t = C.gf.ftrap; t != 0; t = t.ntrap) {
            t.tseen = 1;
            C.map_trap(t, C.TRUE);
        }
        for (ep = C.head_engr; ep != 0; ep = ep.nxt_engr) {
            C.map_engraving(ep, C.TRUE);
        }
        C.do_mapping();
        C.notice_mon_on();
        C.HConfusion = save_Hconf;
        C.HHallucination = save_Hhallu;
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_map));
    return C.ECMD_OK;
}

/* #wizgenesis - generate monster(s); a count prefix will be honored */
export function wiz_genesis()
{
    if (C.wizard) {
        let mongen_saved = C.iflags.debug_mongen;

        C.iflags.debug_mongen = C.FALSE;
        C.create_particular();
        C.iflags.debug_mongen = mongen_saved;
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_genesis));
    return C.ECMD_OK;
}

/* #wizwhere command - display dungeon layout */
export function wiz_where()
{
    if (C.wizard)
        C.print_dungeon(C.FALSE, 0, 0);
    else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_where));
    return C.ECMD_OK;
}

/* the #wizdetect command - detect secret doors, traps, hidden monsters */
export function wiz_detect()
{
    if (C.wizard)
        C.findit();
    else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_detect));
    return C.ECMD_OK;
}

/* the #wizkill command - pick targets and reduce them to 0HP;
   by default, the hero is credited/blamed; use 'm' prefix to avoid that */
export function wiz_kill()
{
    let mtmp;
    let cc = C.recordLocal('nhcoord');
    let ans;
    let c, qbuf = C.stackAlloc(C.QBUFSZ);
    let prompt = "Pick first monster to slay";
    let save_verbose = C.flags.verbose,
        save_autodescribe = C.iflags.autodescribe;
    let uarehere = C.recordLocal('d_level', C.u.uz);

    cc.x = C.u.ux, cc.y = C.u.uy;
    for (;;) {
        C.pline('%s:', prompt);
        prompt = 'Next monster';

        C.flags.verbose = C.FALSE;
        C.iflags.autodescribe = C.TRUE;
        ans = C.getpos(cc, C.TRUE, 'a monster');
        C.flags.verbose = save_verbose;
        C.iflags.autodescribe = save_autodescribe;
        if (ans < 0 || cc.x < 1)
            break;

        mtmp = 0;
        if (C.u_at(cc.x, cc.y)) {
            if (C.u.usteed) {
                C.Sprintf(qbuf, 'Kill %.110s?', C.mon_nam(C.u.usteed));
                if ((c = C.ynq(qbuf)) == 113)
                    break;
                if (c == 121)
                    mtmp = C.u.usteed;
            }
            if (!mtmp) {
                C.Sprintf(qbuf, '%s?', C.Role_if(C.PM_SAMURAI) ? 'Perform seppuku'
                                                           : 'Commit suicide');
                if (C.paranoid_query(C.TRUE, qbuf)) {
                    C.Sprintf(C.svk.killer.name, '%s own player', C.uhis());
                    C.svk.killer.format = C.KILLED_BY;
                    C.done(C.DIED);
                }
                break;
            }
        } else if (C.u.uswallow) {
            mtmp = C.next2u(cc.x, cc.y) ? C.u.ustuck : 0;
        } else {
            mtmp = C.m_at(cc.x, cc.y);
        }

        /* whether there's an unseen monster here or not, player will know
           that there's no monster here after the kill or failed attempt;
           let hero know too */
        C.unmap_invisible(cc.x, cc.y);

        if (mtmp) {
            /* we don't require that the monster be seen or sensed so
               we issue our own message in order to name it in case it
               isn't; note that if it triggers other kills, those might
               be referred to as "it" */
            let tame = Number(!!mtmp.mtame),
                seen = Number(Boolean(C.canspotmon(mtmp) || (C.u.uswallow && mtmp == C.u.ustuck))),
                flgs = (C.SUPPRESS_IT | C.SUPPRESS_HALLUCINATION
                        | ((tame && C.has_mgivenname(mtmp)) ? C.SUPPRESS_SADDLE
                           : 0)),
                articl = tame ? C.ARTICLE_YOUR : seen ? C.ARTICLE_THE : C.ARTICLE_A;
            let adjs = tame ? (!seen ? 'poor, unseen' : 'poor')
                            : (!seen ? 'unseen' : 0);
            let Mn = C.x_monnam(mtmp, articl, adjs, flgs, C.FALSE);

            if (!C.iflags.menu_requested) {
                /* normal case: hero is credited/blamed */
                C.You('%s %s!', C.nonliving(mtmp.data) ? 'destroy' : 'kill', Mn);
                C.xkilled(mtmp, C.XKILL_NOMSG);
            } else { /* 'm'-prefix */
                /* we know that monsters aren't moving because player has
                   just issued this #wizkill command, but if 'mtmp' is a
                   gas spore whose explosion kills any other monsters we
                   need to have the mon_moving flag be True in order to
                   avoid blaming or crediting hero for their deaths */
                C.svc.context.mon_moving = C.TRUE;
                C.pline('%s is %s.', C.upstart(Mn),
                        C.nonliving(mtmp.data) ? 'destroyed' : 'killed');
                /* Null second arg suppresses the usual message */
                C.monkilled(mtmp, 0, C.AD_PHYS);
                C.svc.context.mon_moving = C.FALSE;
            }
            /* end targetting loop if an engulfer dropped hero onto a level-
               changing trap */
            if (C.u.utotype || !C.on_level(C.u.uz, uarehere))
                break;
        } else {
            C.There('is no monster there.');
            break;
        }
    }
    /* since #wizkill takes no game time, it is possible to kill something
       in the main dungeon and immediately level teleport into the endgame
       which will delete the main dungeon's level files; avoid triggering
       impossible "dmonsfree: 0 removed doesn't match N pending" by forcing
       dead monster cleanup; we don't track whether anything was actually
       killed above--if nothing was, this will be benign */
    C.dmonsfree();
    /* distinction between ECMD_CANCEL and ECMD_OK is unimportant here */
    return C.ECMD_OK; /* no time elapses */
}

/* the #wizloadlua command - load an arbitrary lua file */
export function wiz_load_lua()
{
    if (C.wizard) {
        let buf = C.stackAlloc(C.BUFSZ);
            /* Large but not unlimited memory and CPU so random bits of
             * code can be tested by wizards. */
        let sbi = C.recordLocal('nhl_sandbox_info', [C.NHL_SB_SAFE | C.NHL_SB_DEBUGGING,
                                                   16 * 1024 * 1024, 0, 16 * 1024 * 1024]);

        C.storeChar(buf, 0);
        C.getlin('Load which lua file?', buf);
        if (C.loadChar(buf) == 27 || C.loadChar(buf) == 0)
            return C.ECMD_CANCEL;
        if (!C.strchr(buf, 46))
            C.strcat(buf, '.lua');
        C.load_lua(buf, sbi);
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_load_lua));
    return C.ECMD_OK;
}

/* the #wizloaddes command - load a special level lua file */
export function wiz_load_splua()
{
    if (C.wizard) {
        let buf = C.stackAlloc(C.BUFSZ);

        C.storeChar(buf, 0);
        C.getlin('Load which des lua file?', buf);
        if (C.loadChar(buf) == 27 || C.loadChar(buf) == 0)
            return C.ECMD_CANCEL;
        if (!C.strchr(buf, 46))
            C.strcat(buf, '.lua');

        C.lspo_reset_level(0);
        C.load_special(buf);
        C.lspo_finalize_level(0);

    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_load_splua));
    return C.ECMD_OK;
}

/* the #wizlevelport command - level teleport */
export function wiz_level_tele()
{
    if (C.wizard)
        C.level_tele();
    else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_level_tele));
    return C.ECMD_OK;
}

/* #wizfliplevel - transpose the current level */
export function wiz_flip_level()
{
    const choices = '0123',
        prmpt = 'Flip 0=randomly, 1=vertically, 2=horizontally, 3=both:';

    /*
     * Does not handle
     *   levregions,
     *   monster mtrack,
     *   migrating monsters aimed at returning to specific coordinates
     *     on this level
     * as flipping is normally done only during level creation.
     */
    if (C.wizard) {
        let c = C.yn_function(prmpt, choices, 0, C.TRUE);

        if (c && C.strchr(choices, c)) {
            c -= 48;

            if (!c)
                C.flip_level_rnd(3, C.TRUE);
            else
                C.flip_level(C.int(c), C.TRUE);

            C.docrt();
        } else {
            C.pline('%s', C.Never_mind);
        }
    }
    return C.ECMD_OK;
}

/* #levelchange command - adjust hero's experience level */
export function wiz_level_change()
{
    let buf = C.stackAlloc(C.BUFSZ), dummy = 0;
    let newlevel = 0;
    let ret;

    C.storeChar(buf, 0); /* in case EDIT_GETLIN is enabled */
    C.getlin('To what experience level do you want to be set?', buf);
    C.mungspaces(buf);
    if (C.loadChar(buf) == 27 || C.loadChar(buf) == 0)
        ret = 0;
    else
        ret = C.sscanf(buf, '%d%c', C.localPointer('int', () => newlevel, v => newlevel = v),
                       C.localPointer('char', () => dummy, v => dummy = v));

    if (ret != 1) {
        C.pline1(C.Never_mind);
        return C.ECMD_OK;
    }
    if (newlevel == C.u.ulevel) {
        C.You('are already that experienced.');
    } else if (newlevel < C.u.ulevel) {
        if (C.u.ulevel == 1) {
            C.You('are already as inexperienced as you can get.');
            return C.ECMD_OK;
        }
        if (newlevel < 1)
            newlevel = 1;
        while (C.u.ulevel > newlevel)
            C.losexp('#levelchange');
    } else {
        if (C.u.ulevel >= C.MAXULEV) {
            C.You('are already as experienced as you can get.');
            return C.ECMD_OK;
        }
        if (newlevel > C.MAXULEV)
            newlevel = C.MAXULEV;
        while (C.u.ulevel < newlevel)
            C.pluslvl(C.FALSE);
    }
    /* blessed full healing or restore ability won't fix any lost levels */
    C.u.ulevelmax = C.u.ulevel;
    return C.ECMD_OK;
}

/* #wiztelekinesis */
export function wiz_telekinesis()
{
    let ans = 0;
    let cc = C.recordLocal('nhcoord');
    let mtmp = 0;

    cc.x = C.u.ux;
    cc.y = C.u.uy;

    C.pline('Pick a monster to hurtle.');
    do {
        ans = C.getpos(cc, C.TRUE, 'a monster');
        if (ans < 0 || cc.x < 1)
            return C.ECMD_CANCEL;

        if ((((mtmp = C.m_at(cc.x, cc.y)) != 0) && C.canspotmon(mtmp))
            || C.u_at(cc.x, cc.y)) {
            if (!C.getdir('which direction?'))
                return C.ECMD_CANCEL;

            if (mtmp) {
                C.mhurtle(mtmp, C.u.dx, C.u.dy, 6);
                if (!C.DEADMONSTER(mtmp) && C.canspotmon(mtmp)) {
                    cc.x = mtmp.mx;
                    cc.y = mtmp.my;
                }
            } else {
                C.hurtle(C.u.dx, C.u.dy, 6, C.FALSE);
                cc.x = C.u.ux, cc.y = C.u.uy;
            }
        }

    } while (C.u.utotype == C.UTOTYPE_NONE);
    return C.ECMD_OK;
}

/* #panic command - test program's panic handling */
export function wiz_panic()
{
    if (C.iflags.debug_fuzzer) {
        C.u.uhp = C.u.uhpmax = 1000;
        C.u.uen = C.u.uenmax = 1000;
        return C.ECMD_OK;
    }
    if (C.paranoid_query(C.TRUE,
                         'Do you want to call panic() and end your game?'))
        C.panic('Crash test (#panic).');
    return C.ECMD_OK;
}

/* #debugfuzzer command - fuzztest the program */
export function wiz_fuzzer()
{
    if (C.flags.suppress_alert < C.FEATURE_NOTICE_VER(3, 7, 0)) {
        C.pline('The fuzz tester will make NetHack execute random keypresses.');
        C.There('is no conventional way out of this mode.');
    }
    if (C.paranoid_query(C.TRUE, 'Do you want to start fuzz testing?')) {
        /* Thoth, take the reins */
        if (C.y_n('Do you want to call panic() after impossible()?') == 110) {
            C.iflags.debug_fuzzer = C.fuzzer_impossible_continue;
        } else {
            C.iflags.debug_fuzzer = C.fuzzer_impossible_panic;
        }
    }
    return C.ECMD_OK;
}

/* #polyself command - change hero's form */
export function wiz_polyself()
{
    C.polyself(C.POLY_CONTROLLED);
    return C.ECMD_OK;
}

/* #seenv command */
export function wiz_show_seenv()
{
    let win;
    let x, y, startx, stopx, curx;
    let v;
    let row = C.stackAlloc(C.COLNO + 1);

    win = C.create_nhwindow(C.NHW_TEXT);
    /*
     * Each seenv description takes up 2 characters, so center
     * the seenv display around the hero.
     */
    startx = C.max(1, C.u.ux - (C.COLNO / 4));
    stopx = C.min(startx + (C.COLNO / 2), C.COLNO);
    /* can't have a line exactly 80 chars long */
    if (stopx - startx == C.COLNO / 2)
        startx++;

    for (y = 0; y < C.ROWNO; y++) {
        for (x = startx, curx = 0; x < stopx; x++, curx += 2) {
            if (C.u_at(x, y)) {
                C.HEAP8[row + (curx)] = C.HEAP8[row + (curx + 1)] = 64;
            } else {
                v = C.levl[x][y].seenv & 0xff;
                if (v == 0)
                    C.HEAP8[row + (curx)] = C.HEAP8[row + (curx + 1)] = 32;
                else
                    C.Sprintf((row + (curx)), "%02x", v);
            }
        }
        /* remove trailing spaces */
        for (x = curx - 1; x >= 0; x--)
            if (C.HEAP8[row + (x)] != 32)
                break;
        C.HEAP8[row + (x + 1)] = 0;

        C.putstr(win, 0, row);
    }
    C.display_nhwindow(win, C.TRUE);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

/* #vision command */
export function wiz_show_vision()
{
    let win;
    let x, y;
    let v;
    let row = C.stackAlloc(C.COLNO + 1);

    win = C.create_nhwindow(C.NHW_TEXT);
    C.Sprintf(row, "Flags: 0x%x could see, 0x%x in sight, 0x%x temp lit",
            C.COULD_SEE, C.IN_SIGHT, C.TEMP_LIT);
    C.putstr(win, 0, row);
    C.putstr(win, 0, "");
    for (y = 0; y < C.ROWNO; y++) {
        for (x = 1; x < C.COLNO; x++) {
            if (C.u_at(x, y)) {
                C.HEAP8[row + (x)] = 64;
            } else {
                v = C.gv.viz_array[y][x]; /* data access should be hidden */
                C.HEAP8[row + (x)] = (v == 0) ? 32 : (48 + v);
            }
        }
        /* remove trailing spaces */
        for (x = C.COLNO - 1; x >= 1; x--)
            if (C.HEAP8[row + (x)] != 32)
                break;
        C.HEAP8[row + (x + 1)] = 0;

        C.putstr(win, 0, (row + (1)));
    }
    C.display_nhwindow(win, C.TRUE);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

/* #wmode command */
export function wiz_show_wmodes()
{
    let win;
    let x, y;
    let row = C.stackAlloc(C.COLNO + 1);
    let lev;
    let istty = C.WINDOWPORT("tty");

    win = C.create_nhwindow(C.NHW_TEXT);
    if (istty)
        C.putstr(win, 0, ""); /* tty only: blank top line */
    for (y = 0; y < C.ROWNO; y++) {
        for (x = 0; x < C.COLNO; x++) {
            lev = C.levl[x][y];
            if (C.u_at(x, y))
                C.HEAP8[row + (x)] = 64;
            else if (C.IS_WALL(lev.typ) || lev.typ == C.SDOOR)
                C.HEAP8[row + (x)] = 48 + (lev.wall_info & C.WM_MASK);
            else if (lev.typ == C.CORR)
                C.HEAP8[row + (x)] = 35;
            else if (C.IS_ROOM(lev.typ) || C.IS_DOOR(lev.typ))
                C.HEAP8[row + (x)] = 46;
            else
                C.HEAP8[row + (x)] = 120;
        }
        C.HEAP8[row + (C.COLNO)] = 0;
        /* map column 0, levl[0][], is off the left edge of the screen */
        C.putstr(win, 0, (row + (1)));
    }
    C.display_nhwindow(win, C.TRUE);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

/* wizard mode variant of #terrain; internal levl[][].typ values in base-36 */
export function wiz_map_levltyp()
{
    let win;
    let x, y;
    let terrain;
    let row = C.stackAlloc(C.COLNO + 1);
    let istty = Number(!C.strcmp(C.windowprocs.name, "tty"));

    win = C.create_nhwindow(C.NHW_TEXT);
    /* map row 0, levl[][0], is drawn on the second line of tty screen */
    if (istty)
        C.putstr(win, 0, ""); /* tty only: blank top line */
    for (y = 0; y < C.ROWNO; y++) {
        /* map column 0, levl[0][], is off the left edge of the screen;
           it should always have terrain type "undiggable stone" */
        for (x = 1; x < C.COLNO; x++) {
            terrain = C.levl[x][y].typ;
            /* assumes there aren't more than 10+26+26 terrain types */
            C.HEAP8[row + (x - 1)] =  ((terrain == C.STONE && !C.may_dig(x, y))
                                    ? 42
                                    : (terrain < 10)
                                       ? 48 + terrain
                                       : (terrain < 36)
                                          ? 97 + terrain - 10
                                          : 65 + terrain - 36);
        }
        x--;
        if (C.levl[0][y].typ != C.STONE || C.may_dig(0, y))
            C.HEAP8[row + (x++)] = 33;
        C.HEAP8[row + (x)] = 0;
        C.putstr(win, 0, row);
    }

    {
        let dsc = C.stackAlloc(C.COLBUFSZ);
        let slev = C.Is_special(C.u.uz);

        C.Sprintf(dsc, "D:%d,L:%d", C.u.uz.dnum, C.u.uz.dlevel);
        /* [dungeon branch features currently omitted] */
        /* special level features */
        if (slev) {
            C.Sprintf(C.eos(dsc), " \"%s\"", slev.proto);
            /* special level flags (note: dungeon.def doesn't set `maze'
               or `hell' for any specific levels so those never show up) */
            if (slev.flags.maze_like)
                C.Strcat(dsc, " mazelike");
            if (slev.flags.hellish)
                C.Strcat(dsc, " hellish");
            if (slev.flags.town)
                C.Strcat(dsc, " town");
            if (slev.flags.rogue_like)
                C.Strcat(dsc, " roguelike");
            /* alignment currently omitted to save space */
        }
        /* level features */
        if (C.svl.level.flags.nfountains)
            C.Sprintf(C.eos(dsc), " %c:%d", C.defsyms[C.S_fountain].sym,
                     C.svl.level.flags.nfountains);
        if (C.svl.level.flags.nsinks)
            C.Sprintf(C.eos(dsc), " %c:%d", C.defsyms[C.S_sink].sym,
                     C.svl.level.flags.nsinks);
        if (C.svl.level.flags.has_vault)
            C.Strcat(dsc, " vault");
        if (C.svl.level.flags.has_shop)
            C.Strcat(dsc, " shop");
        if (C.svl.level.flags.has_temple)
            C.Strcat(dsc, " temple");
        if (C.svl.level.flags.has_court)
            C.Strcat(dsc, " throne");
        if (C.svl.level.flags.has_zoo)
            C.Strcat(dsc, " zoo");
        if (C.svl.level.flags.has_morgue)
            C.Strcat(dsc, " morgue");
        if (C.svl.level.flags.has_barracks)
            C.Strcat(dsc, " barracks");
        if (C.svl.level.flags.has_beehive)
            C.Strcat(dsc, " hive");
        if (C.svl.level.flags.has_swamp)
            C.Strcat(dsc, " swamp");
        /* level flags */
        if (C.svl.level.flags.noteleport)
            C.Strcat(dsc, " noTport");
        if (C.svl.level.flags.hardfloor)
            C.Strcat(dsc, " noDig");
        if (C.svl.level.flags.nommap)
            C.Strcat(dsc, " noMMap");
        if (!C.svl.level.flags.hero_memory)
            C.Strcat(dsc, " noMem");
        if (C.svl.level.flags.shortsighted)
            C.Strcat(dsc, " shortsight");
        if (C.svl.level.flags.graveyard)
            C.Strcat(dsc, " graveyard");
        if (C.svl.level.flags.is_maze_lev)
            C.Strcat(dsc, " maze");
        if (C.svl.level.flags.is_cavernous_lev)
            C.Strcat(dsc, " cave");
        if (C.svl.level.flags.arboreal)
            C.Strcat(dsc, " tree");
        if (C.Sokoban)
            C.Strcat(dsc, " sokoban-rules");
        /* non-flag info; probably should include dungeon branching
           checks (extra stairs and magic portals) here */
        if (C.Invocation_lev(C.u.uz))
            C.Strcat(dsc, " invoke");
        if (C.On_W_tower_level(C.u.uz))
            C.Strcat(dsc, " tower");
        /* append a branch identifier for completeness' sake */
        if (C.u.uz.dnum == 0)
            C.Strcat(dsc, " dungeon");
        else if (C.u.uz.dnum == C.mines_dnum)
            C.Strcat(dsc, " mines");
        else if (C.In_sokoban(C.u.uz))
            C.Strcat(dsc, " sokoban");
        else if (C.u.uz.dnum == C.quest_dnum)
            C.Strcat(dsc, " quest");
        else if (C.Is_knox(C.u.uz))
            C.Strcat(dsc, " ludios");
        else if (C.u.uz.dnum == 1)
            C.Strcat(dsc, " gehennom");
        else if (C.u.uz.dnum == C.tower_dnum)
            C.Strcat(dsc, " vlad");
        else if (C.In_endgame(C.u.uz))
            C.Strcat(dsc, " endgame");
        else {
            /* somebody's added a dungeon branch we're not expecting */
            let brname = C.svd.dungeons[C.u.uz.dnum].dname;

            if (!brname || !C.loadChar(brname))
                brname = "unknown";
            if (!C.strncmpi(brname, "the ", 4))
                brname = C.charPointer(brname) + 4;
            C.Sprintf(C.eos(dsc), " %s", brname);
        }
        /* limit the line length to map width */
        if (C.strlen(dsc) >= C.COLNO)
            C.HEAP8[dsc + (C.COLNO - 1)] = 0; /* truncate */
        C.putstr(win, 0, dsc);
    }

    C.display_nhwindow(win, C.TRUE);
    C.destroy_nhwindow(win);
    return;
}

/* explanation of base-36 output from wiz_map_levltyp() */
export function wiz_levltyp_legend()
{
    let win;
    let i, j, last, c;
    let dsc, fmt;
    let buf = C.stackAlloc(C.BUFSZ);

    win = C.create_nhwindow(C.NHW_TEXT);
    C.putstr(win, 0, "#terrain encodings:");
    C.putstr(win, 0, "");
    fmt = " %c - %-28s"; /* TODO: include tab-separated variant for win32 */
    C.storeChar(buf, 0);
    /* output in pairs, left hand column holds [0],[1],...,[N/2-1]
       and right hand column holds [N/2],[N/2+1],...,[N-1];
       N ('last') will always be even, and may or may not include
       the empty string entry to pad out the final pair, depending
       upon how many other entries are present in levltyp[] */
    last = C.SIZE(C.levltyp) & ~1;
    for (i = 0; i < last / 2; ++i)
        for (j = i; j < last; j += last / 2) {
            dsc = C.levltyp[j];
            c = !C.loadChar(dsc) ? 32
                   : !C.strncmp(dsc, "unreachable", 11) ? 42
                      /* same int-to-char conversion as wiz_map_levltyp() */
                      : (j < 10) ? 48 + j
                         : (j < 36) ? 97 + j - 10
                            : 65 + j - 36;
            C.Sprintf(C.eos(buf), fmt, c, dsc);
            if (j > i) {
                C.putstr(win, 0, buf);
                C.storeChar(buf, 0);
            }
        }
    C.display_nhwindow(win, C.TRUE);
    C.destroy_nhwindow(win);
    return;
}

/* #wizsmell command - test usmellmon(). */
export function wiz_smell()
{
    let mtmp; /* monster being smelled */
    let mptr;
    let ans, glyph;
    let cc = C.recordLocal("nhcoord"); /* screen pos to sniff */
    let is_you;

    cc.x = C.u.ux;
    cc.y = C.u.uy;
    if (!C.olfaction(C.gy.youmonst.data)) {
        C.You("are incapable of detecting odors in your present form.");
        return C.ECMD_OK;
    }

    C.You("can move the cursor to a monster that you want to smell.");
    do {
        C.pline("Pick a monster to smell.");
        ans = C.getpos(cc, C.TRUE, "a monster");
        if (ans < 0 || cc.x < 0) {
            return C.ECMD_CANCEL; /* done */
        }
        is_you = C.FALSE;
        if (C.u_at(cc.x, cc.y)) {
            if (C.u.usteed) {
                mptr = C.u.usteed.data;
            } else {
                mptr = C.gy.youmonst.data;
                is_you = C.TRUE;
            }
        } else if ((mtmp = C.m_at(cc.x, cc.y)) != 0) {
            mptr = mtmp.data;
        } else {
            mptr = 0;
        }
        /* Buglet: mapping or unmapping "remembered, unseen monster" should
           cause time to elapse; since we're in wizmode, don't bother */
        glyph = C.glyph_at(cc.x, cc.y);
        /* Is it a monster? */
        if (mptr) {
            if (is_you)
                C.You("surreptitiously sniff under your %s.", C.body_part(C.ARM));
            if (!C.usmellmon(mptr))
                C.pline("%s to not give off any smell.",
                      is_you ? "You seem" : "That monster seems");
            if (!C.glyph_is_monster(glyph))
                C.map_invisible(cc.x, cc.y);
        } else {
            C.You("don't smell any monster there.");
            if (C.glyph_is_invisible(glyph))
                C.unmap_invisible(cc.x, cc.y);
        }
    } while (C.TRUE);
    return C.ECMD_OK;
}

const DEFAULT_TIMEOUT_INCR = 30;

/* #wizinstrinsic command to set some intrinsics for testing */
export function wiz_intrinsic()
{
    if (C.wizard) {
        const wizintrinsic = '#wizintrinsic';
        const fmt = 'You are%s %s.';
        let win;
        let any = C.recordLocal('any');
        let buf = C.stackAlloc(C.BUFSZ);
        let i, j, n, amt, typ, p = 0;
        let pp = C.localPointer('int', () => p, v => p = v);
        let oldtimeout, newtimeout;
        let propname;
        let pick_list = 0;
        let clr = C.NO_COLOR;

        C.copyRecord(any, C.cg.zeroany, C.sizes.any);
        win = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(win, C.MENU_BEHAVE_STANDARD);
        if (C.iflags.cmdassist) {
            /* start menu with a subtitle */
            C.Sprintf(buf,
        '[Precede any selection with a count to increment by other than %d.]',
                      DEFAULT_TIMEOUT_INCR);
            C.add_menu_str(win, buf);
        }
        for (i = 0; (propname = C.property_by_index(i, pp)) != 0; ++i) {
            if (p == C.HALLUC_RES) {
                /* Grayswandir vs hallucination; ought to be redone to
                   use u.uprops[HALLUC].blocked instead of being treated
                   as a separate property; letting in be manually toggled
                   even only in wizard mode would be asking for trouble... */
                continue;
            }
            if (p == C.FIRE_RES) {
                /* FIRE_RES and properties beyond it (in the propertynames[]
                   ordering, not their numerical PROP values), can only be
                   set to timed values here so show a separator */
                C.add_menu_str(win, '--');
            }
            any.a_int = i + 1; /* +1: avoid 0 */
            oldtimeout = C.u.uprops[p].intrinsic & C.long(C.TIMEOUT);
            if (oldtimeout)
                C.Sprintf(buf, '%-27s [%li]', propname, oldtimeout);
            else
                C.Sprintf(buf, '%s', propname);
            C.add_menu(win, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, clr, buf,
                       C.MENU_ITEMFLAGS_NONE);
        }
        C.end_menu(win, 'Which intrinsics?');
        n = C.select_menu(win, C.PICK_ANY, C.localPointer('menu_item *', () => pick_list, v => pick_list = v));
        C.destroy_nhwindow(win);

        for (j = 0; j < n; ++j) {
            i = pick_list[j].item.a_int - 1; /* -1: reverse +1 above */
            propname = C.property_by_index(i, pp);
            oldtimeout = C.u.uprops[p].intrinsic & C.long(C.TIMEOUT);
            amt = (pick_list[j].count == -1n) ? DEFAULT_TIMEOUT_INCR
                                             : C.int(pick_list[j].count);
            if (amt <= 0) /* paranoia */
                continue;
            newtimeout = oldtimeout + C.long(amt);

            switch (p) {
            case C.SICK:
            case C.SLIMED:
            case C.STONED:
                if (oldtimeout > 0n && newtimeout > oldtimeout)
                    newtimeout = oldtimeout;
                break;
            }

            // Native goto def_feedback exits the inner labeled block; other
            // cases leave the outer block after their original switch break.
            skip_feedback: {
                def_feedback: {
                    switch (p) {
                    case C.BLINDED:
                        C.make_blinded(newtimeout, C.TRUE);
                        break;
                    /* make_confused() only gives feedback when confusion is
             * ending so use the 'default' case for it instead */
                    // Original #if 0: case CONFUSION; make_confused(...).
                    /*0*/
                    case C.DEAF:
                        C.make_deaf(newtimeout, C.TRUE);
                        break;
                    case C.HALLUC:
                        C.make_hallucinated(newtimeout, C.TRUE, 0n);
                        break;
                    case C.SICK:
                        typ = !C.rn2(2, 1036, 'wiz_intrinsic') ? C.SICK_VOMITABLE : C.SICK_NONVOMITABLE;
                        C.make_sick(newtimeout, wizintrinsic, C.TRUE, typ);
                        break;
                    case C.SLIMED:
                        C.Sprintf(buf, fmt,
                                  !C.Slimed ? '' : ' still', 'turning into slime');
                        C.make_slimed(newtimeout, buf);
                        break;
                    case C.STONED:
                        C.Sprintf(buf, fmt,
                                  !C.Stoned ? '' : ' still', 'turning into stone');
                        C.make_stoned(newtimeout, buf, C.KILLED_BY, wizintrinsic);
                        break;
                    case C.STUNNED:
                        C.make_stunned(newtimeout, C.TRUE);
                        break;
                    case C.VOMITING:
                        C.Sprintf(buf, fmt, !C.Vomiting ? '' : ' still', 'vomiting');
                        C.make_vomiting(newtimeout, C.FALSE);
                        C.pline1(buf);
                        break;
                    case C.WARN_OF_MON:
                        if (!C.Warn_of_mon) {
                            C.svc.context.warntype.speciesidx = C.PM_GRID_BUG;
                            C.svc.context.warntype.species
                                = C.mons[C.svc.context.warntype.speciesidx];
                        }
                        break def_feedback;
                    case C.GLIB:
                        /* slippery fingers might need a persistent inventory update
                   so needs more than simple incr_itimeout() but we want
                   the pline() issued with that */
                        C.make_glib(C.int(newtimeout));
                        // FALLTHROUGH;
                        /*FALLTHRU*/
                    default:
                        break def_feedback;
                    }
                    break skip_feedback;
                }
                if (p != C.GLIB)
                    C.incr_itimeout(C.fieldPointer(C.u.uprops[p], 'intrinsic'), amt);
                C.disp.botl = C.TRUE; /* have pline() do a status update */
                C.pline('Timeout for %s %s %d.', propname,
                        oldtimeout ? 'increased by' : 'set to', amt);
            }
            /* this has to be after incr_itimeout() */
            if (p == C.LEVITATION || p == C.FLYING)
                C.float_vs_flight();
            else if (p == C.PROT_FROM_SHAPE_CHANGERS)
                C.rescham();
            if (p == C.WWALKING || p == C.LEVITATION || p == C.FLYING) {
                if (C.u.uinwater)
                    C.pooleffects(C.FALSE);
            }
        }
        if (n >= 1)
            C.free(pick_list);
        C.docrt();
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_intrinsic));
    return C.ECMD_OK;
}

/* #wizrumorcheck command - verify each rumor access */
export function wiz_rumor_check()
{
    C.rumor_check();
    return C.ECMD_OK;
}

/*
 * wizard mode sanity_check code
 */

const template = '%-27s  %4ld  %6ld';
const stats_hdr = '                             count  bytes';
const stats_sep = '---------------------------  ----- -------';

export function size_obj(otmp)
{
    let sz = C.int(C.sizes.obj);

    if (otmp.oextra) {
        sz += C.int(C.sizes.oextra);
        if (C.ONAME(otmp))
            sz += C.int(C.strlen(C.ONAME(otmp))) + 1;
        if (C.OMONST(otmp))
            sz += C.callLocal(size_monst, C.OMONST(otmp), C.FALSE);
        if (C.OMAILCMD(otmp))
            sz += C.int(C.strlen(C.OMAILCMD(otmp))) + 1;
        /* sz += (int) sizeof (unsigned); -- now part of oextra itself */
    }
    return C.int(sz);
}

export function count_obj(chain, total_count, total_size, top, recurse)
{
    let count, size;
    let obj;

    for (count = size = 0n, obj = chain; obj; obj = obj.nobj) {
        if (top) {
            count++;
            size += C.long(C.callLocal(size_obj, obj));
        }
        if (recurse && obj.cobj)
            C.callLocal(count_obj, obj.cobj, total_count, total_size, C.TRUE, C.TRUE);
    }
    total_count.value += count;
    total_size.value += size;
}

/* DISABLE_WARNING_FORMAT_NONLITERAL -- RESTORE_WARNING follows wiz_show_stats */
export function obj_chain(win, src, chain, force, total_count, total_size)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let count = 0n, size = 0n;

    C.callLocal(count_obj, chain,
        C.localPointer('long', () => count, v => count = v),
        C.localPointer('long', () => size, v => size = v), C.TRUE, C.FALSE);

    if (count || size || force) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, src, count, size);
        C.putstr(win, 0, buf);
    }
}

export function mon_invent_chain(win, src, chain, total_count, total_size)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let count = 0n, size = 0n;
    let mon;
    let countp = C.localPointer('long', () => count, v => count = v),
        sizep = C.localPointer('long', () => size, v => size = v);

    for (mon = chain; mon; mon = mon.nmon)
        C.callLocal(count_obj, mon.minvent, countp, sizep, C.TRUE, C.FALSE);

    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, src, count, size);
        C.putstr(win, 0, buf);
    }
}

export function contained_stats(win, src, total_count, total_size)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let count = 0n, size = 0n;
    let mon;
    let countp = C.localPointer('long', () => count, v => count = v),
        sizep = C.localPointer('long', () => size, v => size = v);

    C.callLocal(count_obj, C.gi.invent, countp, sizep, C.FALSE, C.TRUE);
    C.callLocal(count_obj, C.fobj, countp, sizep, C.FALSE, C.TRUE);
    C.callLocal(count_obj, C.svl.level.buriedobjlist, countp, sizep, C.FALSE, C.TRUE);
    C.callLocal(count_obj, C.gm.migrating_objs, countp, sizep, C.FALSE, C.TRUE);
    /* DEADMONSTER check not required in this loop since they have no
     * inventory */
    for (mon = C.fmon; mon; mon = mon.nmon)
        C.callLocal(count_obj, mon.minvent, countp, sizep, C.FALSE, C.TRUE);
    for (mon = C.gm.migrating_mons; mon; mon = mon.nmon)
        C.callLocal(count_obj, mon.minvent, countp, sizep, C.FALSE, C.TRUE);

    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, src, count, size);
        C.putstr(win, 0, buf);
    }
}

export function size_monst(mtmp, incl_wsegs)
{
    let sz = C.int(C.sizes.monst);

    if (mtmp.wormno && incl_wsegs)
        sz += C.size_wseg(mtmp);

    if (mtmp.mextra) {
        sz += C.int(C.sizes.mextra);
        if (C.MGIVENNAME(mtmp))
            sz += C.int(C.strlen(C.MGIVENNAME(mtmp))) + 1;
        if (C.EGD(mtmp))
            sz += C.int(C.sizes.egd);
        if (C.EPRI(mtmp))
            sz += C.int(C.sizes.epri);
        if (C.ESHK(mtmp))
            sz += C.int(C.sizes.eshk);
        if (C.EMIN(mtmp))
            sz += C.int(C.sizes.emin);
        if (C.EDOG(mtmp))
            sz += C.int(C.sizes.edog);
        if (C.EBONES(mtmp))
            sz += C.int(C.sizes.ebones);
        /* mextra->mcorpsenm doesn't point to more memory */
    }
    return C.int(sz);
}

export function mon_chain(win, src, chain, force, total_count, total_size)
{
    let buf = C.stackAlloc(C.BUFSZ);
    let count, size;
    let mon;
    /* mon->wormno means something different for migrating_mons and mydogs */
    let incl_wsegs = Number(!C.strcmpi(src, 'fmon'));

    count = size = 0n;
    for (mon = chain; mon; mon = mon.nmon) {
        count++;
        size += C.long(C.callLocal(size_monst, mon, incl_wsegs));
    }
    if (count || size || force) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, src, count, size);
        C.putstr(win, 0, buf);
    }
}

export function misc_stats(win, total_count, total_size)
{
    let buf = C.stackAlloc(C.BUFSZ), hdrbuf = C.stackAlloc(C.QBUFSZ);
    let count = 0n, size = 0n;
    let idx;
    let tt;
    let sd; /* shop damage */
    let k; /* delayed killer */
    let bi; /* bones info */
    let countp = C.localPointer('long', () => count, v => count = v),
        sizep = C.localPointer('long', () => size, v => size = v);

    /* traps and engravings are output unconditionally;
     * others only if nonzero
     */
    countp.value = sizep.value = 0n;
    for (tt = C.gf.ftrap; tt; tt = tt.ntrap) {
        ++count;
        size += C.long(C.sizes.trap);
    }
    total_count.value += count;
    total_size.value += size;
    C.Sprintf(hdrbuf, 'traps, size %ld', C.long(C.sizes.trap));
    C.Sprintf(buf, template, hdrbuf, count, size);
    C.putstr(win, 0, buf);

    countp.value = sizep.value = 0n;
    C.engr_stats('engravings, size %ld+text', hdrbuf, countp, sizep);
    total_count.value += count;
    total_size.value += size;
    C.Sprintf(buf, template, hdrbuf, count, size);
    C.putstr(win, 0, buf);

    countp.value = sizep.value = 0n;
    C.light_stats('light sources, size %ld', hdrbuf, countp, sizep);
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }

    countp.value = sizep.value = 0n;
    C.timer_stats('timers, size %ld', hdrbuf, countp, sizep);
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }

    countp.value = sizep.value = 0n;
    for (sd = C.svl.level.damagelist; sd; sd = sd.next) {
        ++count;
        size += C.long(C.sizes.damage);
    }
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(hdrbuf, 'shop damage, size %ld', C.long(C.sizes.damage));
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }

    countp.value = sizep.value = 0n;
    C.region_stats('regions, size %ld+%ld*rect+N', hdrbuf, countp, sizep);
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }

    countp.value = sizep.value = 0n;
    for (k = C.svk.killer.next; k; k = k.next) {
        ++count;
        size += C.long(C.sizes.kinfo);
    }
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(hdrbuf, 'delayed killer%s, size %ld', C.plur(count), C.long(C.sizes.kinfo));
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }

    countp.value = sizep.value = 0n;
    for (bi = C.svl.level.bonesinfo; bi; bi = bi.next) {
        ++count;
        size += C.long(C.sizes.cemetery);
    }
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Sprintf(hdrbuf, 'bones history, size %ld', C.long(C.sizes.cemetery));
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }

    countp.value = sizep.value = 0n;
    for (idx = 0; idx < C.NUM_OBJECTS; ++idx)
        if (C.objects[idx].oc_uname) {
            ++count;
            size += C.long(C.strlen(C.objects[idx].oc_uname)) + 1n;
        }
    if (count || size) {
        total_count.value += count;
        total_size.value += size;
        C.Strcpy(hdrbuf, 'object type names, text');
        C.Sprintf(buf, template, hdrbuf, count, size);
        C.putstr(win, 0, buf);
    }
}

export function you_sanity_check()
{
    let mtmp;

    if (C.u.uswallow && !C.u.ustuck) {
        /* this probably ought to be panic() */
        C.impossible('sanity_check: swallowed by nothing?');
        C.display_nhwindow(C.WIN_MESSAGE, C.TRUE);
        /* try to recover from whatever the problem is */
        C.u.uswallow = 0;
        C.u.uswldtim = 0;
        C.docrt();
    }
    if ((mtmp = C.m_at(C.u.ux, C.u.uy)) != 0) {
        /* u.usteed isn't on the map */
        if (C.u.ustuck != mtmp)
            C.impossible('sanity_check: you over monster');
    }
    /* [should we also check for (u.uhp < 1), (Upolyd && u.mh < 1),
       and (u.uen < 0) here?] */
    if (C.u.uhp > C.u.uhpmax) {
        C.impossible('current hero health (%d) better than maximum? (%d)',
                   C.u.uhp, C.u.uhpmax);
        C.u.uhp = C.u.uhpmax;
    }
    if (C.Upolyd && C.u.mh > C.u.mhmax) {
        C.impossible(
              'current hero health as monster (%d) better than maximum? (%d)',
                   C.u.mh, C.u.mhmax);
        C.u.mh = C.u.mhmax;
    }
    if (C.u.uen > C.u.uenmax) {
        C.impossible('current hero energy (%d) better than maximum? (%d)',
                   C.u.uen, C.u.uenmax);
        C.u.uen = C.u.uenmax;
    }

    C.check_wornmask_slots();
    C.check_invent_gold('invent');
}

export function levl_sanity_check()
{
    let x, y;

    if (C.Underwater)
        return; /* Underwater uses different vision */

    for (y = 0; y < C.ROWNO; y++) {
        for (x = 1; x < C.COLNO; x++) {
            if ((C.does_block(x, y, C.levl[x][y]) ? 1 : 0) != C.get_viz_clear(x, y))
                C.impossible('levl[%i][%i] vision blocking', x, y);
        }
    }
}

export function sanity_check()
{
    if (C.iflags.sanity_no_check) {
        /* in case a recurring sanity_check warning occurs, we mustn't
           re-trigger it when ^P is used, otherwise msg_window:Single
           and msg_window:Combination will always repeat the most recent
           instance, never able to go back to any earlier messages */
        C.iflags.sanity_no_check = C.FALSE;
        return;
    }
    C.program_state.in_sanity_check++;
    C.callLocal(you_sanity_check);
    C.obj_sanity_check();
    C.timer_sanity_check();
    C.mon_sanity_check();
    C.light_sources_sanity_check();
    C.bc_sanity_check();
    C.trap_sanity_check();
    C.engraving_sanity_check();
    C.callLocal(levl_sanity_check);
    C.program_state.in_sanity_check--;
}

/* qsort() comparison routine for use in list_migrating_mons() */
export function migrsort_cmp(vptr1, vptr2)
{
    let m1 = C.pointerLoad('monst', vptr1),
        m2 = C.pointerLoad('monst', vptr2);
    let d1 = C.int(m1.mux), l1 = C.int(m1.muy),
        d2 = C.int(m2.mux), l2 = C.int(m2.muy);

    /* if different branches, sort by dungeon number */
    if (d1 != d2)
        return d1 - d2;
    /* within same branch, sort by level number */
    if (l1 != l2)
        return l1 - l2;
    /* same destination level:  use a tie-breaker to force stable sort;
       monst->m_id is unsigned so we need more than just simple subtraction */
    return (m1.m_id < m2.m_id) ? -1 : Number(m1.m_id > m2.m_id);
}

/* called by #migratemons; displays count of migrating monsters, optionally
   displays them as well */
export function list_migrating_mons(nextlevl) /* default destination for wiz_migrate_mons() */
{
    let win = C.WIN_ERR;
    let showit = C.FALSE;
    let n;
    let xyloc;
    let x, y;
    let c, prmpt = C.stackAlloc(10), xtra = C.stackAlloc(10), buf = C.stackAlloc(C.BUFSZ);
    let mtmp, marray;
    let here = 0, nxtlv = 0, other = 0;

    for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mux == C.u.uz.dnum && mtmp.muy == C.u.uz.dlevel)
            ++here;
        else if (mtmp.mux == nextlevl.dnum && mtmp.muy == nextlevl.dlevel)
            ++nxtlv;
        else
            ++other;
    }
    if (here + nxtlv + other == 0) {
        C.pline('No monsters currently migrating.');
    } else {
        C.pline(
      '%d mon%s pending for current level, %d for next level, %d for others.',
              here, C.plur(here), nxtlv, other);
        C.storeChar(prmpt, 0); C.storeChar(xtra, 0);
        C.strkitten(here ? prmpt : xtra, 99);
        C.strkitten(nxtlv ? prmpt : xtra, 110);
        C.strkitten(other ? prmpt : xtra, 111);
        C.Strcat(prmpt, 'a q');
        if (C.loadChar(xtra))
            C.Sprintf(C.eos(prmpt), '%c%s', 27, xtra);
        c = C.yn_function('List which?', prmpt, 113, C.TRUE);
        n = (c == 99) ? here
            : (c == 110) ? nxtlv
              : (c == 111) ? other
                : (c == 97) ? here + nxtlv + other
                  : 0;
        if (n > 0) {
            win = C.create_nhwindow(C.NHW_TEXT);
            switch (c) {
            case 99:
            case 110:
            case 111:
                C.Sprintf(buf, 'Monster%s migrating to %s:', C.plur(n),
                        (c == 99) ? 'current level'
                        : (c == 110) ? 'next level'
                          : "'other' levels");
                break;
            default:
                C.Strcpy(buf, 'All migrating monsters:');
                break;
            }
            C.putstr(win, 0, buf);
            C.putstr(win, 0, '');
            /* collect the migrating monsters into an array; for 'o' and 'a'
               where multiple destination levels might be present, sort by
               the destination; 'c' and 'n' don't need to be sorted but we
               do that anyway to get the same tie-breaker as 'o' and 'a' */
            marray = C.pointerArray('monst', C.alloc((n + 1) * C.sizes.ptr));
            n = 0;
            for (mtmp = C.gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
                if (c == 97)
                    showit = C.TRUE;
                else if (mtmp.mux == C.u.uz.dnum && mtmp.muy == C.u.uz.dlevel)
                    showit = Number(c == 99);
                else if (mtmp.mux == nextlevl.dnum
                         && mtmp.muy == nextlevl.dlevel)
                    showit = Number(c == 110);
                else
                    showit = Number(c == 111);

                if (showit)
                    marray[n++] = mtmp;
            }
            marray[n] = 0; /* mark end for traversal loop */
            if (n > 1)
                C.qsort(marray, BigInt(n), BigInt(C.sizes.ptr),
                      migrsort_cmp); /* sort elements [0] through [n-1] */
            for (n = 0; (mtmp = marray[n]) != 0; ++n) {
                C.Sprintf(buf, '  %s', C.minimal_monnam(mtmp, C.FALSE));
                /* minimal_monnam() appends map coordinates; strip that */
                C.strsubst(buf, ' <0,0>', '');
                if (C.has_mgivenname(mtmp)) /* if mtmp is named, include that */
                    C.Sprintf(C.eos(buf), ' named %s', C.MGIVENNAME(mtmp));
                if (c == 111 || c == 97)
                    C.Sprintf(C.eos(buf), ' to %d:%d', mtmp.mux, mtmp.muy);
                xyloc = mtmp.mtrack[0].x; /* (for legibility) */
                if (xyloc == C.MIGR_EXACT_XY) {
                    x = mtmp.mtrack[1].x;
                    y = mtmp.mtrack[1].y;
                    C.Sprintf(C.eos(buf), ' at <%d,%d>', C.int(x), C.int(y));
                }
                C.putstr(win, 0, buf);
            }
            C.free(marray);
            C.display_nhwindow(win, C.FALSE);
            C.destroy_nhwindow(win);
        } else if (c != 113) {
            C.pline('None.');
        }

    }
}

/* the #stats command
 * Display memory usage of all monsters and objects on the level.
 */
export function wiz_show_stats()
{
    let buf = C.stackAlloc(C.BUFSZ);
    let win;
    let total_obj_size = 0n, total_obj_count = 0n,
        total_mon_size = 0n, total_mon_count = 0n,
        total_ovr_size = 0n, total_ovr_count = 0n,
        total_misc_size = 0n, total_misc_count = 0n;
    let oc = C.localPointer('long', () => total_obj_count, v => total_obj_count = v),
        os = C.localPointer('long', () => total_obj_size, v => total_obj_size = v),
        mc = C.localPointer('long', () => total_mon_count, v => total_mon_count = v),
        ms = C.localPointer('long', () => total_mon_size, v => total_mon_size = v),
        vc = C.localPointer('long', () => total_ovr_count, v => total_ovr_count = v),
        vs = C.localPointer('long', () => total_ovr_size, v => total_ovr_size = v),
        xc = C.localPointer('long', () => total_misc_count, v => total_misc_count = v),
        xs = C.localPointer('long', () => total_misc_size, v => total_misc_size = v);

    win = C.create_nhwindow(C.NHW_TEXT);
    C.putstr(win, 0, 'Current memory statistics:');

    total_obj_count = total_obj_size = 0n;
    oc.value = os.value = 0n;
    C.putstr(win, 0, stats_hdr);
    C.Sprintf(buf, '  Objects, base size %ld', C.long(C.sizes.obj));
    C.putstr(win, 0, buf);
    C.callLocal(obj_chain, win, 'invent', C.gi.invent, C.TRUE, oc, os);
    C.callLocal(obj_chain, win, 'fobj', C.fobj, C.TRUE, oc, os);
    C.callLocal(obj_chain, win, 'buried', C.svl.level.buriedobjlist, C.FALSE, oc, os);
    C.callLocal(obj_chain, win, 'migrating obj', C.gm.migrating_objs, C.FALSE, oc, os);
    C.callLocal(obj_chain, win, 'billobjs', C.gb.billobjs, C.FALSE, oc, os);
    C.callLocal(mon_invent_chain, win, 'minvent', C.fmon, oc, os);
    C.callLocal(mon_invent_chain, win, 'migrating minvent', C.gm.migrating_mons, oc, os);
    C.callLocal(contained_stats, win, 'contained', oc, os);
    C.putstr(win, 0, stats_sep);
    C.Sprintf(buf, template, '  Obj total', total_obj_count, total_obj_size);
    C.putstr(win, 0, buf);

    total_mon_count = total_mon_size = 0n;
    mc.value = ms.value = 0n;
    C.putstr(win, 0, '');
    C.Sprintf(buf, '  Monsters, base size %ld', C.long(C.sizes.monst));
    C.putstr(win, 0, buf);
    C.callLocal(mon_chain, win, 'fmon', C.fmon, C.TRUE, mc, ms);
    C.callLocal(mon_chain, win, 'migrating', C.gm.migrating_mons, C.FALSE, mc, ms);
    /* 'gm.mydogs' is only valid during level change or end of game disclosure,
       but conceivably we've been called from within debugger at such time */
    if (C.gm.mydogs) /* monsters accompanying hero */
        C.callLocal(mon_chain, win, 'mydogs', C.gm.mydogs, C.FALSE, mc, ms);
    C.putstr(win, 0, stats_sep);
    C.Sprintf(buf, template, '  Mon total', total_mon_count, total_mon_size);
    C.putstr(win, 0, buf);

    total_ovr_count = total_ovr_size = 0n;
    vc.value = vs.value = 0n;
    C.putstr(win, 0, '');
    C.putstr(win, 0, '  Overview');
    C.overview_stats(win, template, vc, vs);
    C.putstr(win, 0, stats_sep);
    C.Sprintf(buf, template, '  Over total', total_ovr_count, total_ovr_size);
    C.putstr(win, 0, buf);

    total_misc_count = total_misc_size = 0n;
    xc.value = xs.value = 0n;
    C.putstr(win, 0, '');
    C.putstr(win, 0, '  Miscellaneous');
    C.callLocal(misc_stats, win, xc, xs);
    C.putstr(win, 0, stats_sep);
    C.Sprintf(buf, template, '  Misc total', total_misc_count, total_misc_size);
    C.putstr(win, 0, buf);

    C.putstr(win, 0, '');
    C.putstr(win, 0, stats_sep);
    C.Sprintf(buf, template, '  Grand total',
            (total_obj_count + total_mon_count + total_ovr_count + total_misc_count),
            (total_obj_size + total_mon_size + total_ovr_size + total_misc_size));
    C.putstr(win, 0, buf);

    /* __BORLANDC__ && !_WIN32 is not configured. */
    C.display_nhwindow(win, C.FALSE);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

/* RESTORE_WARNING_FORMAT_NONLITERAL */
/* (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) is configured. */
/* the #wizdispmacros command
 * Verify that some display macros are returning sane values */
export function wiz_display_macros()
{
    const display_issues = 'Display macro issues:';
    let buf = C.stackAlloc(C.BUFSZ);
    let win;
    let glyph, test, trouble = 0, no_glyph = C.NO_GLYPH, max_glyph = C.MAX_GLYPH;

    win = C.create_nhwindow(C.NHW_TEXT);

    for (glyph = 0; glyph < C.MAX_GLYPH; ++glyph) {
        /* glyph_is_cmap / glyph_to_cmap() */
        if (C.glyph_is_cmap(glyph)) {
            test = C.glyph_to_cmap(glyph);
            /* check for MAX_GLYPH return */
            if (test == no_glyph) {
                if (!trouble++)
                    C.putstr(win, 0, display_issues);
                C.Sprintf(buf, 'glyph_is_cmap() / glyph_to_cmap(glyph=%d)'
                             + ' sync failure, returned NO_GLYPH (%d)', glyph, test);
                C.putstr(win, 0, buf);
            }
            if (C.glyph_is_cmap_zap(glyph)
                && !(test >= C.S_vbeam && test <= C.S_rslant)) {
                if (!trouble++)
                    C.putstr(win, 0, display_issues);
                C.Sprintf(buf,
                        'glyph_is_cmap_zap(glyph=%d) returned non-zap cmap %d', glyph, test);
                C.putstr(win, 0, buf);
            }
            /* check against defsyms array subscripts */
            if (!C.IndexOk(test, C.defsyms)) {
                if (!trouble++)
                    C.putstr(win, 0, display_issues);
                C.Sprintf(buf, 'glyph_to_cmap(glyph=%d) returns %d'
                             + ' exceeds defsyms[%d] bounds (MAX_GLYPH = %d)',
                        glyph, test, C.SIZE(C.defsyms), max_glyph);
                C.putstr(win, 0, buf);
            }
        }
        /* glyph_is_monster / glyph_to_mon */
        if (C.glyph_is_monster(glyph)) {
            test = C.glyph_to_mon(glyph);
            /* check against mons array subscripts */
            if (test < 0 || test >= C.NUMMONS) {
                if (!trouble++)
                    C.putstr(win, 0, display_issues);
                C.Sprintf(buf, 'glyph_to_mon(glyph=%d) returns %d exceeds mons[%d] bounds',
                        glyph, test, C.NUMMONS);
                C.putstr(win, 0, buf);
            }
        }
        /* glyph_is_object / glyph_to_obj */
        if (C.glyph_is_object(glyph)) {
            test = C.glyph_to_obj(glyph);
            /* check against objects array subscripts */
            if (test < 0 || test > C.NUM_OBJECTS) {
                if (!trouble++)
                    C.putstr(win, 0, display_issues);
                C.Sprintf(buf, 'glyph_to_obj(glyph=%d) returns %d exceeds objects[%d] bounds',
                        glyph, test, C.NUM_OBJECTS);
                C.putstr(win, 0, buf);
            }
        }
    }
    if (!trouble)
        C.putstr(win, 0, 'No display macro issues detected.');
    C.display_nhwindow(win, C.FALSE);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

/* the #wizshownhuuid command */
export function wiz_show_nhuuid()
{
    C.pline('The NHUUID for this game is { %s }.', C.svn.nhuuid);
    return C.ECMD_OK;
}

/* the #wizmondiff command */
export function wiz_mon_diff()
{
    const window_title = 'Review of monster difficulty ratings [index:level]:';
    let buf = C.stackAlloc(C.BUFSZ);
    let win;
    let mhardcoded = 0, mcalculated = 0, trouble = 0, cnt = 0, mdiff = 0;
    let mlev;
    let ptr;

    /*
     * Possible extension:  choose between showing discrepancies,
     * showing all monsters, or monsters within a particular class.
     */

    win = C.create_nhwindow(C.NHW_TEXT);
    for (ptr = C.mons[0]; ptr.mlet; ptr = C.advanceRecord(ptr, 1), cnt++) {
        mcalculated = C.mstrength(ptr);
        mhardcoded = C.int(ptr.difficulty);
        mdiff = mhardcoded - mcalculated;
        if (mdiff) {
            if (!trouble++)
                C.putstr(win, 0, window_title);
            mlev = C.int(ptr.mlevel);
            if (mlev > 50) /* hack for named demons */
                mlev = 50;
            C.nh_snprintf('wiz_mon_diff', 1819, buf, BigInt(C.BUFSZ),
                     '%-18s [%3d:%2d]: calculated: %2d, hardcoded: %2d (%+d)',
                     ptr.pmnames[C.NEUTRAL], cnt, mlev,
                     mcalculated, mhardcoded, mdiff);
            C.putstr(win, 0, buf);
        }
    }
    if (!trouble)
        C.putstr(win, 0, 'No monster difficulty discrepancies were detected.');
    C.display_nhwindow(win, C.FALSE);
    C.destroy_nhwindow(win);
    return C.ECMD_OK;
}

/* the #wizobjprobs command */
export function wiz_objprobs()
{
    let win;
    let buf = C.stackAlloc(C.BUFSZ);
    let probsum = C.intArray(C.stackAlloc(C.MAXOCLASSES * C.sizes.int));
    let otyp;
    let oclass = C.objects[C.FIRST_OBJECT].oc_class;
    C.memset(probsum, 0, BigInt(C.MAXOCLASSES * C.sizes.int));

    for (otyp = C.FIRST_OBJECT; otyp < C.NUM_OBJECTS; otyp++) {
        probsum[C.int(C.objects[otyp].oc_class)] += C.objects[otyp].oc_prob;
    }

    win = C.create_nhwindow(C.NHW_TEXT);
    for (otyp = C.FIRST_OBJECT; otyp < C.NUM_OBJECTS; otyp++) {
        /* placeholders for extra descriptions aren't generatable objects */
        if (!C.OBJ_NAME(C.objects[otyp]))
            continue;

        if (C.int(C.objects[otyp].oc_class) != oclass) {
            C.putstr(win, 0, '');
        }
        oclass = C.objects[otyp].oc_class;

        C.nh_snprintf('wiz_objprobs', 1861, buf, BigInt(C.BUFSZ), '%4d / %4d (%6.2f%%): %s',
                 C.objects[otyp].oc_prob,
                 probsum[oclass],
                 Math.fround(Math.fround(Math.fround(C.objects[otyp].oc_prob) * Math.fround(100))
                             / Math.fround(probsum[oclass])),
                 C.OBJ_NAME(C.objects[otyp]));
        C.putstr(win, 0, buf);
    }
    C.display_nhwindow(win, C.FALSE);
    C.destroy_nhwindow(win);

    return C.ECMD_OK;
}

/* #migratemons command */
export function wiz_migrate_mons()
{
    /* Source commentary retained from this routine (including inactive branches). */
    /* DEBUG_MIGRATING_MONS */

    /* DEBUG_MIGRATING_MONS is configured. */
    let mcount;
    let inbuf = C.stackAlloc(C.BUFSZ);
    let ptr;
    let mtmp;
    let use_random_mon = C.TRUE;
    let mongen_saved = C.iflags.debug_mongen;
    let tolevel = C.recordLocal('d_level');

    if (C.Is_stronghold(C.u.uz))
        C.assign_level(tolevel, C.valley_level);
    else if (!C.Is_botlevel(C.u.uz))
        C.get_level(tolevel, C.depth(C.u.uz) + 1);
    else
        tolevel.dnum = 0, tolevel.dlevel = 0;

    C.callLocal(list_migrating_mons, tolevel);

    C.storeChar(inbuf, 0); C.storeChar(inbuf + 1, 0);
    if (tolevel.dnum || tolevel.dlevel)
        C.getlin('How many random monsters to migrate to next level? [0]', inbuf);
    else
        C.pline("Can't get there from here.");
    if (C.loadChar(inbuf) == 27 || C.loadChar(inbuf) == 0)
        return C.ECMD_OK;

    mcount = C.atoi(inbuf);
    if (mcount < 0) {
        use_random_mon = C.FALSE;
        mcount *= -1;
    }
    if (mcount < 1)
        mcount = 0;
    else if (mcount > ((C.COLNO - 1) * C.ROWNO))
        mcount = (C.COLNO - 1) * C.ROWNO;

    C.iflags.debug_mongen = C.FALSE;
    while (mcount > 0) {
        if (use_random_mon) {
            ptr = C.rndmonst();
            mtmp = C.makemon(ptr, 0, 0, C.MM_NOMSG);
        } else {
            mtmp = C.fmon;
        }
        if (mtmp)
            C.migrate_to_level(mtmp, C.ledger_no(tolevel), C.MIGR_RANDOM, 0);
        mcount--;
    }
    C.iflags.debug_mongen = mongen_saved;
    return C.ECMD_OK;
}

/* #wizcustom command to see glyphmap customizations */
export function wiz_custom()
{
    /* Source commentary retained from this routine (including inactive branches). */
    /* symbols.c */

    /* extern const char *const known_handling[]; -- symbols.c */
    if (C.wizard) {
        const wizcustom = '#wizcustom';
        let win;
        let buf = C.stackAlloc(C.BUFSZ), bufa = C.stackAlloc(C.BUFSZ);
        let n;
        /* #if 0: int j, glyph; */
        let pick_list = 0;

        if (!C.glyphid_cache_status())
            C.fill_glyphid_cache();

        win = C.create_nhwindow(C.NHW_MENU);
        C.start_menu(win, C.MENU_BEHAVE_STANDARD);
        C.add_menu_heading(win,
                         '    glyph  glyph identifier                        '
                         + '     sym   clr customcolor unicode utf8');
        C.Sprintf(bufa, '%s: colorcount=%ld %s', wizcustom,
                C.long(C.iflags.colorcount),
                C.gs.symset[C.PRIMARYSET].name ? C.gs.symset[C.PRIMARYSET].name : 'default');
        if (C.gc.currentgraphics == C.PRIMARYSET && C.gs.symset[C.PRIMARYSET].name)
            C.Strcat(bufa, ', active');
        if (C.gs.symset[C.PRIMARYSET].handling) {
            C.Sprintf(C.eos(bufa), ', handler=%s',
                    C.known_handling[C.gs.symset[C.PRIMARYSET].handling]);
        }
        C.Sprintf(buf, '%s', bufa);
        C.wizcustom_glyphids(win);
        C.end_menu(win, bufa);
        n = C.select_menu(win, C.PICK_NONE,
            C.localPointer('menu_item *', () => pick_list, v => pick_list = v));
        C.destroy_nhwindow(win);
        /* #if 0: for (j = 0; j < n; ++j) glyph = pick_list[j].item.a_int - 1;
           -1: reverse +1 above */
        if (n >= 1)
            C.free(pick_list);
        if (C.glyphid_cache_status())
            C.free_glyphid_cache();
        C.docrt();
    } else
        C.pline(C.unavailcmd, C.ecname_from_fn(wiz_custom));
    return C.ECMD_OK;
}

export function wizcustom_callback(win, glyphnum, id)
{
    /* extern glyph_map glyphmap[MAX_GLYPH]; */
    let cgm;
    let clr = C.NO_COLOR;
    let buf = C.stackAlloc(C.BUFSZ), bufa = C.stackAlloc(C.BUFSZ),
        bufb = C.stackAlloc(C.BUFSZ), bufc = C.stackAlloc(C.BUFSZ),
        bufd = C.stackAlloc(C.BUFSZ), bufu = C.stackAlloc(C.BUFSZ);
    let any = C.recordLocal('any');
    let cp;

    if (win && id) {
        cgm = C.glyphmap[glyphnum];
        if (cgm.u || cgm.customcolor != 0) { /* ENHANCED_SYMBOLS */
            C.Sprintf(bufa, '[%04d] %-44s', glyphnum, id);
            C.Sprintf(bufb, "'\\%03d' %02d",
                    C.gs.showsyms[cgm.sym.symidx], cgm.sym.color);
            C.Sprintf(bufc, '%011lx', C.ulong(cgm.customcolor));
            C.storeChar(bufu, 0);
            /* ENHANCED_SYMBOLS */
            if (cgm.u && cgm.u.utf8str) {
                C.Sprintf(bufu, 'U+%04lx', C.ulong(cgm.u.utf32ch));
                cp = cgm.u.utf8str;
                while (C.HEAPU8[cp]) {
                    C.Sprintf(bufd, ' <%d>', C.int(C.HEAPU8[cp]));
                    C.Strcat(bufu, bufd);
                    cp++;
                }
            }
            any.a_int = glyphnum + 1; /* avoid 0 */
            C.nh_snprintf('wizcustom_callback', 2021, buf, BigInt(C.BUFSZ),
                '%s %s %s %s', bufa, bufb, bufc, bufu);
            C.add_menu(win, C.nul_glyphinfo, any, 0, 0, C.ATR_NONE, clr, buf,
                     C.MENU_ITEMFLAGS_NONE);
        }
    }
    return;
}

/*wizcmds.c*/

/* Remaining original file/configuration commentary. */
/* RESTORE_WARNING follows wiz_show_stats */
/* (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || defined(DEBUG) */
