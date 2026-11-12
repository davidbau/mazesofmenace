/* NetHack 5.0	wizcmds.c	$NHDT-Date: 1736530208 2025/01/10 09:30:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.21 $ */
/*-Copyright (c) Robert Patrick Rankin, 2024. */
/* NetHack may be freely redistributed.  See license for details. */

// #include "hack.h"
// #include "nhjs_recorder_sizes.h" /* c2js recorder #stats sizes */
// #include "func_tab.h"

                  /* cmd.c [27] */
          /* cmd.c */




















/* #wizwish command - wish for something */
export function /* int */
wiz_wish() /* Unlimited wishes for debug mode by Paul Polderman */
{
    if (wizard()) {
        let save_verbose = flags.verbose;

        flags.verbose = FALSE;
        makewish();
        flags.verbose = save_verbose;
        encumber_msg();
    } else
        pline(unavailcmd, ecname_from_fn(wiz_wish));
    return ECMD_OK;
}



/* #wizidentify command - reveal and optionally identify hero's inventory */
export function /* int */
wiz_identify()
{
    if (wizard()) {
        iflags.override_ID = cmd_from_func(wiz_identify);
        /* command remapping might leave #wizidentify as the only way
           to invoke us, in which case cmd_from_func() will yield NUL;
           it won't matter to display_inventory()/display_pickinv()
           if ^I invokes some other command--what matters is that
           display_pickinv() and xname() see override_ID as nonzero */
        if (!iflags.override_ID)
            iflags.override_ID = C(ord('I'));
        void display_inventory(0, FALSE);
        iflags.override_ID = 0;
    } else
        pline(unavailcmd, ecname_from_fn(wiz_identify));
    return ECMD_OK;
}



/* used when wiz_makemap() gets rid of monsters for the old incarnation of
   a level before creating a new incarnation of it */
function /* void */
makemap_unmakemon(mtmp, migratory)
{
    let ndx = monsndx(mtmp.data);

    /* uncreate any unique monster so that it is eligible to be remade
       on the new incarnation of the level; ignores DEADMONSTER() [why?] */
    if (mtmp.data.geno & G_UNIQ)
        svm.mvitals[ndx].mvflags &= ~G_EXTINCT;
    if (svm.mvitals[ndx].born)
        svm.mvitals[ndx].born--;

    /* vault is going away; get rid of guard who might be in play or
       be parked at <0,0>; for the latter, might already be flagged as
       dead but is being kept around because of the 'isgd' flag */
    if (mtmp.isgd) {
        mtmp.isgd = 0; /* after this, fall through to mongone() */
    } else if (DEADMONSTER(mtmp)) {
        return; /* already set to be discarded */
    } else if (mtmp.isshk && on_level(u.uz, ESHK(mtmp).shoplevel)) {
        setpaid(mtmp);
    }
    if (migratory) {
        /* caller has removed 'mtmp' from migrating_mons; put it onto fmon
           so that dmonsfree() bookkeeping for number of dead or removed
           monsters won't get out of sync; it is not on the map but
           mongone() -> m_detach() -> mon_leaving_level() copes with that */
        mtmp.mstate = or64(mtmp.mstate, MON_OFFMAP);
        mtmp.mstate = and64(mtmp.mstate, ~(MON_MIGRATING | MON_LIMBO | MON_ENDGAME_MIGR));
        mtmp.nmon = fmon();
        svl.level.monlist = mtmp;
    }
    mongone(mtmp);
}

/* get rid of the all the monsters on--or intimately involved with--current
   level; used when #wizmakemap destroys the level before replacing it */
export function /* void */
makemap_remove_mons()
{
    let mtmp, mprev;

    /* keep steed and other adjacent pets after releasing them
       from traps, stopping eating, &c as if hero were ascending */
    keepdogs(TRUE); /* (pets-only; normally we'd be using 'FALSE') */
    /* get rid of all the monsters that didn't make it to 'mydogs' */
    for (mtmp = fmon(); mtmp; mtmp = mtmp.nmon) {
        /* if already dead, dmonsfree(below) will get rid of it */
        if (DEADMONSTER(mtmp))
            continue;
        makemap_unmakemon(mtmp, FALSE);
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
    for (mprev = ref_of(gm, "migrating_mons"); (mtmp = mprev[0]) != null; ) {
        if (mtmp.mextra
            && ((mtmp.isshk && on_level(u.uz, ESHK(mtmp).shoplevel))
                || (mtmp.ispriest && on_level(u.uz, EPRI(mtmp).shrlevel))
                || (mtmp.isgd && on_level(u.uz, EGD(mtmp).gdlevel)))) {
            mprev[0] = mtmp.nmon;
            makemap_unmakemon(mtmp, TRUE);
        } else {
            mprev = ref_of(mtmp, "nmon");
        }
    }
    /* release dead and 'unmade' monsters */
    dmonsfree();
    if (fmon()) {
        impossible(_("makemap_remove_mons: 'fmon' did not get emptied?"));
    }
    return;
}



/* #wizmakemap - discard current dungeon level and replace with a new one */
export function /* int */
wiz_makemap()
{
    if (wizard()) {
        let was_in_W_tower = In_W_tower(u.ux, u.uy, u.uz);

        makemap_prepost(TRUE, was_in_W_tower);
        /* create a new level; various things like bestowing a guardian
           angel on Astral or setting off alarm on Ft.Ludios are handled
           by goto_level(do.c) so won't occur for replacement levels */
        mklev();
        makemap_prepost(FALSE, was_in_W_tower);
    } else {
        pline(unavailcmd, ecname_from_fn(wiz_makemap));
    }
    return ECMD_OK;
}

/* the #wizmap command - reveal the level map
   and any traps or engravings on it */
export function /* int */
wiz_map()
{
    if (wizard()) {
        let t;
        let ep;
        let save_Hconf = HConfusion(), save_Hhallu = HHallucination();

        notice_mon_off();
        u.uprops[CONFUSION].intrinsic = u.uprops[HALLUC].intrinsic = 0;
        for (t = gf.ftrap; t != null; t = t.ntrap) {
            t.tseen = 1;
            map_trap(t, TRUE);
        }
        for (ep = head_engr; ep != null; ep = ep.nxt_engr) {
            map_engraving(ep, TRUE);
        }
        do_mapping();
        notice_mon_on();
        u.uprops[CONFUSION].intrinsic = save_Hconf;
        u.uprops[HALLUC].intrinsic = save_Hhallu;
    } else
        pline(unavailcmd, ecname_from_fn(wiz_map));
    return ECMD_OK;
}

/* #wizgenesis - generate monster(s); a count prefix will be honored */
export function /* int */
wiz_genesis()
{
    if (wizard()) {
        let mongen_saved = iflags.debug_mongen;

        iflags.debug_mongen = FALSE;
        void create_particular();
        iflags.debug_mongen = mongen_saved;
    } else
        pline(unavailcmd, ecname_from_fn(wiz_genesis));
    return ECMD_OK;
}

/* #wizwhere command - display dungeon layout */
export function /* int */
wiz_where()
{
    if (wizard())
        void print_dungeon(FALSE, 0, null);
    else
        pline(unavailcmd, ecname_from_fn(wiz_where));
    return ECMD_OK;
}

/* the #wizdetect command - detect secret doors, traps, hidden monsters */
export function /* int */
wiz_detect()
{
    if (wizard())
        void findit();
    else
        pline(unavailcmd, ecname_from_fn(wiz_detect));
    return ECMD_OK;
}



/* the #wizkill command - pick targets and reduce them to 0HP;
   by default, the hero is credited/blamed; use 'm' prefix to avoid that */
export function /* int */
wiz_kill()
{ const $frame = stack_frame(); try {
    let mtmp;
    let cc = stack_struct(struct_nhcoord);
    let ans;
    let c, qbuf = stack_array(char, QBUFSZ);
    let prompt = _("Pick first monster to slay");
    let save_verbose = flags.verbose,
            save_autodescribe = iflags.autodescribe;
    let uarehere = struct_assign(stack_struct(struct_d_level), u.uz);

    cc.x = u.ux, cc.y = u.uy;
    for (;;) {
        pline(_("%s:"), prompt);
        prompt = _("Next monster");

        flags.verbose = FALSE;
        iflags.autodescribe = TRUE;
        ans = getpos(cc, TRUE, _("a monster"));
        flags.verbose = save_verbose;
        iflags.autodescribe = save_autodescribe;
        if (ans < 0 || cc.x < 1)
            break;

        mtmp = null;
        if (u_at(cc.x, cc.y)) {
            if (u.usteed) {
                void sprintf(qbuf, _("Kill %.110s?"), mon_nam(u.usteed));
                if ((c = ynq(qbuf)) == ord('q'))
                    break;
                if (c == ord('y'))
                    mtmp = u.usteed;
            }
            if (!mtmp) {
                void sprintf(qbuf, _("%s?"), Role_if(PM_SAMURAI) ? _("Perform seppuku")
                                                         : _("Commit suicide"));
                if (paranoid_query(TRUE, qbuf)) {
                    void sprintf(svk.killer.name, _("%s own player"), uhis());
                    svk.killer.format = KILLED_BY;
                    done(DIED);
                }
                break;
            }
        } else if (u.uswallow) {
            mtmp = next2u(cc.x, cc.y) ? u.ustuck : null;
        } else {
            mtmp = m_at(cc.x, cc.y);
        }

        /* whether there's an unseen monster here or not, player will know
           that there's no monster here after the kill or failed attempt;
           let hero know too */
        void unmap_invisible(cc.x, cc.y);

        if (mtmp) {
            /* we don't require that the monster be seen or sensed so
               we issue our own message in order to name it in case it
               isn't; note that if it triggers other kills, those might
               be referred to as "it" */
            let tame = +!!mtmp.mtame,
                seen = (((canspotmon(mtmp) || (u.uswallow && mtmp == u.ustuck)) ? 1 : 0)),
                flgs = (SUPPRESS_IT | SUPPRESS_HALLUCINATION
                        | ((tame && has_mgivenname(mtmp)) ? SUPPRESS_SADDLE
                           : 0)),
                articl = tame ? ARTICLE_YOUR : seen ? ARTICLE_THE : ARTICLE_A;
            let adjs = tame ? (!seen ? _("poor, unseen") : _("poor"))
                                    : (!seen ? _("unseen") : 0);
            let Mn = x_monnam(mtmp, articl, adjs, flgs, FALSE);

            if (!iflags.menu_requested) {
                /* normal case: hero is credited/blamed */
                You(_("%s %s!"), nonliving(mtmp.data) ? _("destroy") : _("kill"), Mn);
                xkilled(mtmp, XKILL_NOMSG);
            } else { /* 'm'-prefix */
                /* we know that monsters aren't moving because player has
                   just issued this #wizkill command, but if 'mtmp' is a
                   gas spore whose explosion kills any other monsters we
                   need to have the mon_moving flag be True in order to
                   avoid blaming or crediting hero for their deaths */
                svc.context.mon_moving = TRUE;
                pline(_("%s is %s."), upstart(Mn),
                      nonliving(mtmp.data) ? _("destroyed") : _("killed"));
                /* Null second arg suppresses the usual message */
                monkilled(mtmp, 0, AD_PHYS);
                svc.context.mon_moving = FALSE;
            }
            /* end targetting loop if an engulfer dropped hero onto a level-
               changing trap */
            if (u.utotype || !on_level(u.uz, uarehere))
                break;
        } else {
            There(_("is no monster there."));
            break;
        }
    }
    /* since #wizkill takes no game time, it is possible to kill something
       in the main dungeon and immediately level teleport into the endgame
       which will delete the main dungeon's level files; avoid triggering
       impossible "dmonsfree: 0 removed doesn't match N pending" by forcing
       dead monster cleanup; we don't track whether anything was actually
       killed above--if nothing was, this will be benign */
    dmonsfree();
    /* distinction between ECMD_CANCEL and ECMD_OK is unimportant here */
    return ECMD_OK; /* no time elapses */
} finally { stack_pop($frame); } }



/* the #wizloadlua command - load an arbitrary lua file */
export function /* int */
wiz_load_lua()
{ const $frame = stack_frame(); try {
    if (wizard()) {
        let buf = stack_array(char, BUFSZ);
            /* Large but not unlimited memory and CPU so random bits of
             * code can be tested by wizards. */
        let sbi = init_list(stack_struct(struct_nhl_sandbox_info), {flags: unsigned(NHL_SB_SAFE | NHL_SB_DEBUGGING),
                memlimit: 16*1024*1024, steps: 0, perpcall: 16*1024*1024});

        chars[buf + 0] = ord('\0');
        getlin(_("Load which lua file?"), buf);
        if (chars[buf + 0] == ord('\x1b') || chars[buf + 0] == ord('\0'))
            return ECMD_CANCEL;
        if (!strchr(buf, ord('.')))
            strcat(buf, _(".lua"));
        void load_lua(buf, sbi);
    } else
        pline(unavailcmd, ecname_from_fn(wiz_load_lua));
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* the #wizloaddes command - load a special level lua file */
export function /* int */
wiz_load_splua()
{ const $frame = stack_frame(); try {
    if (wizard()) {
        let buf = stack_array(char, BUFSZ);

        chars[buf + 0] = ord('\0');
        getlin(_("Load which des lua file?"), buf);
        if (chars[buf + 0] == ord('\x1b') || chars[buf + 0] == ord('\0'))
            return ECMD_CANCEL;
        if (!strchr(buf, ord('.')))
            strcat(buf, _(".lua"));

        lspo_reset_level(null);
        void load_special(buf);
        lspo_finalize_level(null);

    } else
        pline(unavailcmd, ecname_from_fn(wiz_load_splua));
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* the #wizlevelport command - level teleport */
export function /* int */
wiz_level_tele()
{
    if (wizard())
        level_tele();
    else
        pline(unavailcmd, ecname_from_fn(wiz_level_tele));
    return ECMD_OK;
}



/* #wizfliplevel - transpose the current level */
export function /* int */
wiz_flip_level()
{
    let choices = init_string(static_array("wiz_flip_level.choices", char, sizeof_string("0123")), _("0123"), true),
        prmpt = init_string(static_array("wiz_flip_level.prmpt", char, sizeof_string("Flip 0=randomly, 1=vertically, 2=horizontally, 3=both:")), _("Flip 0=randomly, 1=vertically, 2=horizontally, 3=both:"), true);

    /*
     * Does not handle
     *   levregions,
     *   monster mtrack,
     *   migrating monsters aimed at returning to specific coordinates
     *     on this level
     * as flipping is normally done only during level creation.
     */
    if (wizard()) {
        let c = yn_function(prmpt, choices, ord('\0'), TRUE);

        if (c && strchr(choices, c)) {
            c -= ord('0');

            if (!c)
                flip_level_rnd(3, TRUE);
            else
                flip_level(c, TRUE);

            docrt();
        } else {
            pline(_("%s"), Never_mind());
        }
    }
    return ECMD_OK;
}

/* #levelchange command - adjust hero's experience level */
export function /* int */
wiz_level_change()
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ), dummy = stack_var(char, ord('\0'));
    let newlevel = stack_var(int, 0);
    let ret;

    chars[buf + 0] = ord('\0'); /* in case EDIT_GETLIN is enabled */
    getlin(_("To what experience level do you want to be set?"), buf);
    void mungspaces(buf);
    if (chars[buf + 0] == ord('\x1b') || chars[buf + 0] == ord('\0'))
        ret = 0;
    else
        ret = sscanf(buf, _("%d%c"), newlevel, addr_of(dummy));

    if (ret != 1) {
        pline1(Never_mind());
        return ECMD_OK;
    }
    if (newlevel[0] == u.ulevel) {
        You(_("are already that experienced."));
    } else if (newlevel[0] < u.ulevel) {
        if (u.ulevel == 1) {
            You(_("are already as inexperienced as you can get."));
            return ECMD_OK;
        }
        if (newlevel[0] < 1)
            newlevel[0] = 1;
        while (u.ulevel > newlevel[0])
            losexp(_("#levelchange"));
    } else {
        if (u.ulevel >= MAXULEV) {
            You(_("are already as experienced as you can get."));
            return ECMD_OK;
        }
        if (newlevel[0] > MAXULEV)
            newlevel[0] = MAXULEV;
        while (u.ulevel < newlevel[0])
            pluslvl(FALSE);
    }
    /* blessed full healing or restore ability won't fix any lost levels */
    u.ulevelmax = u.ulevel;
    return ECMD_OK;
} finally { stack_pop($frame); } }



/* #wiztelekinesis */
export function /* int */
wiz_telekinesis()
{ const $frame = stack_frame(); try {
    let ans = 0;
    let cc = stack_struct(struct_nhcoord);
    let mtmp = null;

    cc.x = u.ux;
    cc.y = u.uy;

    pline(_("Pick a monster to hurtle."));
    do {
        ans = getpos(cc, TRUE, _("a monster"));
        if (ans < 0 || cc.x < 1)
            return ECMD_CANCEL;

        if ((((mtmp = m_at(cc.x, cc.y)) != null) && canspotmon(mtmp))
            || u_at(cc.x, cc.y)) {
            if (!getdir(_("which direction?")))
                return ECMD_CANCEL;

            if (mtmp) {
                mhurtle(mtmp, u.dx, u.dy, 6);
                if (!DEADMONSTER(mtmp) && canspotmon(mtmp)) {
                    cc.x = mtmp.mx;
                    cc.y = mtmp.my;
                }
            } else {
                hurtle(u.dx, u.dy, 6, FALSE);
                cc.x = u.ux, cc.y = u.uy;
            }
        }

    } while (u.utotype == UTOTYPE_NONE);
    return ECMD_OK;
} finally { stack_pop($frame); } }



/* #panic command - test program's panic handling */
export function /* int */
wiz_panic()
{
    if (iflags.debug_fuzzer) {
        u.uhp = u.uhpmax = 1000;
        u.uen = u.uenmax = 1000;
        return ECMD_OK;
    }
    if (paranoid_query(TRUE,
                       _("Do you want to call panic() and end your game?")))
        panic(_("Crash test (#panic)."));
    return ECMD_OK;
}

/* #debugfuzzer command - fuzztest the program */
export function /* int */
wiz_fuzzer()
{
    if (flags.suppress_alert < FEATURE_NOTICE_VER(3,7,0)) {
        pline(_("The fuzz tester will make NetHack execute random keypresses."));
        There(_("is no conventional way out of this mode."));
    }
    if (paranoid_query(TRUE, _("Do you want to start fuzz testing?"))) {
        /* Thoth, take the reins */
        if (y_n(_("Do you want to call panic() after impossible()?")) == ord('n')) {
            iflags.debug_fuzzer = fuzzer_impossible_continue;
        } else {
            iflags.debug_fuzzer = fuzzer_impossible_panic;
        }
    }
    return ECMD_OK;
}

/* #polyself command - change hero's form */
export function /* int */
wiz_polyself()
{
    polyself(POLY_CONTROLLED);
    return ECMD_OK;
}

/* #seenv command */
export function /* int */
wiz_show_seenv()
{ const $frame = stack_frame(); try {
    let win;
    let x, y, startx, stopx, curx;
    let v;
    let row = stack_array(char, COLNO + 1);

    win = create_nhwindow()(NHW_TEXT);
    /*
     * Each seenv description takes up 2 characters, so center
     * the seenv display around the hero.
     */
    startx = max(1, u.ux - (Math.trunc(COLNO / 4)));
    stopx = min(startx + (Math.trunc(COLNO / 2)), COLNO);
    /* can't have a line exactly 80 chars long */
    if (stopx - startx == Math.trunc(COLNO / 2))
        startx++;

    for (y = 0; y < ROWNO; y++) {
        for (x = startx, curx = 0; x < stopx; x++, curx += 2) {
            if (u_at(x, y)) {
                chars[row + curx] = chars[row + (curx + 1)] = ord('@');
            } else {
                v = levl()[x][y].seenv & 0xff;
                if (v == 0)
                    chars[row + curx] = chars[row + (curx + 1)] = ord(' ');
                else
                    void sprintf(row + curx, _("%02x"), v);
            }
        }
        /* remove trailing spaces */
        for (x = curx - 1; x >= 0; x--)
            if (chars[row + x] != ord(' '))
                break;
        chars[row + (x + 1)] = ord('\0');

        putstr()(win, 0, row);
    }
    display_nhwindow()(win, TRUE);
    destroy_nhwindow()(win);
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* #vision command */
export function /* int */
wiz_show_vision()
{ const $frame = stack_frame(); try {
    let win;
    let x, y;
    let v;
    let row = stack_array(char, COLNO + 1);

    win = create_nhwindow()(NHW_TEXT);
    void sprintf(row, _("Flags: 0x%x could see, 0x%x in sight, 0x%x temp lit"), COULD_SEE, IN_SIGHT, TEMP_LIT)
;
    putstr()(win, 0, row);
    putstr()(win, 0, _(""));
    for (y = 0; y < ROWNO; y++) {
        for (x = 1; x < COLNO; x++) {
            if (u_at(x, y)) {
                chars[row + x] = ord('@');
            } else {
                v = uchars[gv.viz_array[y] + x]; /* data access should be hidden */
                chars[row + x] = (v == 0) ? ord(' ') : (ord('0') + v);
            }
        }
        /* remove trailing spaces */
        for (x = COLNO - 1; x >= 1; x--)
            if (chars[row + x] != ord(' '))
                break;
        chars[row + (x + 1)] = ord('\0');

        putstr()(win, 0, row + 1);
    }
    display_nhwindow()(win, TRUE);
    destroy_nhwindow()(win);
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* #wmode command */
export function /* int */
wiz_show_wmodes()
{ const $frame = stack_frame(); try {
    let win;
    let x, y;
    let row = stack_array(char, COLNO + 1);
    let lev;
    let istty = (+(windowprocs.wp_id == wp_tty));

    win = create_nhwindow()(NHW_TEXT);
    if (istty)
        putstr()(win, 0, _("")); /* tty only: blank top line */
    for (y = 0; y < ROWNO; y++) {
        for (x = 0; x < COLNO; x++) {
            lev = levl()[x][y];
            if (u_at(x, y))
                chars[row + x] = ord('@');
            else if (IS_WALL(lev.typ) || lev.typ == SDOOR)
                chars[row + x] = ord('0') + (lev.flags & WM_MASK);
            else if (lev.typ == CORR)
                chars[row + x] = ord('#');
            else if (IS_ROOM(lev.typ) || IS_DOOR(lev.typ))
                chars[row + x] = ord('.');
            else
                chars[row + x] = ord('x');
        }
        chars[row + COLNO] = ord('\0');
        /* map column 0, levl[0][], is off the left edge of the screen */
        putstr()(win, 0, row + 1);
    }
    display_nhwindow()(win, TRUE);
    destroy_nhwindow()(win);
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* wizard mode variant of #terrain; internal levl[][].typ values in base-36 */
export function /* void */
wiz_map_levltyp()
{ const $frame = stack_frame(); try {
    let win;
    let x, y;
    let terrain;
    let row = stack_array(char, COLNO + 1);
    let istty = +!strcmp(windowprocs.name, _("tty"));

    win = create_nhwindow()(NHW_TEXT);
    /* map row 0, levl[][0], is drawn on the second line of tty screen */
    if (istty)
        putstr()(win, 0, _("")); /* tty only: blank top line */
    for (y = 0; y < ROWNO; y++) {
        /* map column 0, levl[0][], is off the left edge of the screen;
           it should always have terrain type "undiggable stone" */
        for (x = 1; x < COLNO; x++) {
            terrain = levl()[x][y].typ;
            /* assumes there aren't more than 10+26+26 terrain types */
            chars[row + (x - 1)] = char(((terrain == STONE && !may_dig(x, y))
                                    ? ord('*')
                                    : (terrain < 10)
                                       ? ord('0') + terrain
                                       : (terrain < 36)
                                          ? ord('a') + terrain - 10
                                          : ord('A') + terrain - 36));
        }
        x--;
        if (levl()[0][y].typ != STONE || may_dig(0, y))
            chars[row + (x++)] = ord('!');
        chars[row + x] = ord('\0');
        putstr()(win, 0, row);
    }

    {
        let dsc = stack_array(char, COLBUFSZ);
        let slev = Is_special(u.uz);

        void sprintf(dsc, _("D:%d,L:%d"), u.uz.dnum, u.uz.dlevel);
        /* [dungeon branch features currently omitted] */
        /* special level features */
        if (slev) {
            void sprintf(eos(dsc), _(" \"%s\""), slev.proto);
            /* special level flags (note: dungeon.def doesn't set `maze'
               or `hell' for any specific levels so those never show up) */
            if (slev.flags.maze_like)
                void strcat(dsc, _(" mazelike"));
            if (slev.flags.hellish)
                void strcat(dsc, _(" hellish"));
            if (slev.flags.town)
                void strcat(dsc, _(" town"));
            if (slev.flags.rogue_like)
                void strcat(dsc, _(" roguelike"));
            /* alignment currently omitted to save space */
        }
        /* level features */
        if (svl.level.flags.nfountains)
            void sprintf(eos(dsc), _(" %c:%d"), defsyms[S_fountain].sym, svl.level.flags.nfountains)
;
        if (svl.level.flags.nsinks)
            void sprintf(eos(dsc), _(" %c:%d"), defsyms[S_sink].sym, svl.level.flags.nsinks)
;
        if (svl.level.flags.has_vault)
            void strcat(dsc, _(" vault"));
        if (svl.level.flags.has_shop)
            void strcat(dsc, _(" shop"));
        if (svl.level.flags.has_temple)
            void strcat(dsc, _(" temple"));
        if (svl.level.flags.has_court)
            void strcat(dsc, _(" throne"));
        if (svl.level.flags.has_zoo)
            void strcat(dsc, _(" zoo"));
        if (svl.level.flags.has_morgue)
            void strcat(dsc, _(" morgue"));
        if (svl.level.flags.has_barracks)
            void strcat(dsc, _(" barracks"));
        if (svl.level.flags.has_beehive)
            void strcat(dsc, _(" hive"));
        if (svl.level.flags.has_swamp)
            void strcat(dsc, _(" swamp"));
        /* level flags */
        if (svl.level.flags.noteleport)
            void strcat(dsc, _(" noTport"));
        if (svl.level.flags.hardfloor)
            void strcat(dsc, _(" noDig"));
        if (svl.level.flags.nommap)
            void strcat(dsc, _(" noMMap"));
        if (!svl.level.flags.hero_memory)
            void strcat(dsc, _(" noMem"));
        if (svl.level.flags.shortsighted)
            void strcat(dsc, _(" shortsight"));
        if (svl.level.flags.graveyard)
            void strcat(dsc, _(" graveyard"));
        if (svl.level.flags.is_maze_lev)
            void strcat(dsc, _(" maze"));
        if (svl.level.flags.is_cavernous_lev)
            void strcat(dsc, _(" cave"));
        if (svl.level.flags.arboreal)
            void strcat(dsc, _(" tree"));
        if (Sokoban())
            void strcat(dsc, _(" sokoban-rules"));
        /* non-flag info; probably should include dungeon branching
           checks (extra stairs and magic portals) here */
        if (Invocation_lev(u.uz))
            void strcat(dsc, _(" invoke"));
        if (On_W_tower_level(u.uz))
            void strcat(dsc, _(" tower"));
        /* append a branch identifier for completeness' sake */
        if (u.uz.dnum == 0)
            void strcat(dsc, _(" dungeon"));
        else if (u.uz.dnum == mines_dnum())
            void strcat(dsc, _(" mines"));
        else if (In_sokoban(u.uz))
            void strcat(dsc, _(" sokoban"));
        else if (u.uz.dnum == quest_dnum())
            void strcat(dsc, _(" quest"));
        else if (Is_knox(u.uz))
            void strcat(dsc, _(" ludios"));
        else if (u.uz.dnum == 1)
            void strcat(dsc, _(" gehennom"));
        else if (u.uz.dnum == tower_dnum())
            void strcat(dsc, _(" vlad"));
        else if (In_endgame(u.uz))
            void strcat(dsc, _(" endgame"));
        else {
            /* somebody's added a dungeon branch we're not expecting */
            let brname = svd.dungeons[u.uz.dnum].dname;

            if (!brname || !chars[brname])
                brname = _("unknown");
            if (!strncmpi(brname, _("the "), 4))
                brname += 4;
            void sprintf(eos(dsc), _(" %s"), brname);
        }
        /* limit the line length to map width */
        if (strlen(dsc) >= COLNO)
            chars[dsc + (COLNO - 1)] = ord('\0'); /* truncate */
        putstr()(win, 0, dsc);
    }

    display_nhwindow()(win, TRUE);
    destroy_nhwindow()(win);
    return;
} finally { stack_pop($frame); } }



/* explanation of base-36 output from wiz_map_levltyp() */
export function /* void */
wiz_levltyp_legend()
{ const $frame = stack_frame(); try {
    let win;
    let i, j, last, c;
    let dsc, fmt;
    let buf = stack_array(char, BUFSZ);

    win = create_nhwindow()(NHW_TEXT);
    putstr()(win, 0, _("#terrain encodings:"));
    putstr()(win, 0, _(""));
    fmt = _(" %c - %-28s"); /* TODO: include tab-separated variant for win32 */
    chars[buf] = ord('\0');
    /* output in pairs, left hand column holds [0],[1],...,[N/2-1]
       and right hand column holds [N/2],[N/2+1],...,[N-1];
       N ('last') will always be even, and may or may not include
       the empty string entry to pad out the final pair, depending
       upon how many other entries are present in levltyp[] */
    last = SIZE(levltyp) & ~1;
    for (i = 0; i < Math.trunc(last / 2); ++i)
        for (j = i; j < last; j += Math.trunc(last / 2)) {
            dsc = levltyp[j];
            c = !chars[dsc] ? ord(' ')
                   : !strncmp(dsc, _("unreachable"), 11) ? ord('*')
                      /* same int-to-char conversion as wiz_map_levltyp() */
                      : (j < 10) ? ord('0') + j
                         : (j < 36) ? ord('a') + j - 10
                            : ord('A') + j - 36;
            void sprintf(eos(buf), fmt, c, dsc);
            if (j > i) {
                putstr()(win, 0, buf);
                chars[buf] = ord('\0');
            }
        }
    display_nhwindow()(win, TRUE);
    destroy_nhwindow()(win);
    return;
} finally { stack_pop($frame); } }





/* #wizsmell command - test usmellmon(). */
export function /* int */
wiz_smell()
{ const $frame = stack_frame(); try {
    let mtmp; /* monster being smelled */
    let mptr;
    let ans, glyph;
    let cc = stack_struct(struct_nhcoord); /* screen pos to sniff */
    let is_you;

    cc.x = u.ux;
    cc.y = u.uy;
    if (!olfaction(gy.youmonst.data)) {
        You(_("are incapable of detecting odors in your present form."));
        return ECMD_OK;
    }

    You(_("can move the cursor to a monster that you want to smell."));
    do {
        pline(_("Pick a monster to smell."));
        ans = getpos(cc, TRUE, _("a monster"));
        if (ans < 0 || cc.x < 0) {
            return ECMD_CANCEL; /* done */
        }
        is_you = FALSE;
        if (u_at(cc.x, cc.y)) {
            if (u.usteed) {
                mptr = u.usteed.data;
            } else {
                mptr = gy.youmonst.data;
                is_you = TRUE;
            }
        } else if ((mtmp = m_at(cc.x, cc.y)) != null) {
            mptr = mtmp.data;
        } else {
            mptr = null;
        }
        /* Buglet: mapping or unmapping "remembered, unseen monster" should
           cause time to elapse; since we're in wizmode, don't bother */
        glyph = glyph_at(cc.x, cc.y);
        /* Is it a monster? */
        if (mptr) {
            if (is_you)
                You(_("surreptitiously sniff under your %s."), body_part(ARM));
            if (!usmellmon(mptr))
                pline(_("%s to not give off any smell."),
                      is_you ? _("You seem") : _("That monster seems"));
            if (!glyph_is_monster(glyph))
                map_invisible(cc.x, cc.y);
        } else {
            You(_("don't smell any monster there."));
            if (glyph_is_invisible(glyph))
                unmap_invisible(cc.x, cc.y);
        }
    } while (TRUE);
    return ECMD_OK;
} finally { stack_pop($frame); } }





export const DEFAULT_TIMEOUT_INCR = 30;

/* #wizinstrinsic command to set some intrinsics for testing */
export function /* int */
wiz_intrinsic()
{ const $frame = stack_frame(); try { let $goto = null; var wizintrinsic = init_string(static_array("wiz_intrinsic.wizintrinsic", char, sizeof_string("#wizintrinsic")), _("#wizintrinsic"), true), fmt = init_string(static_array("wiz_intrinsic.fmt", char, sizeof_string("You are%s %s.")), _("You are%s %s."), true), any = stack_struct(struct_any), buf = stack_array(char, BUFSZ), p = stack_var(int), pick_list = stack_var(ptr_to(struct_mi));
    if (wizard()) {
        
        
        var win;
        
        
        var i, j, n, amt, typ; p[0] = 0;
        var oldtimeout, newtimeout;
        var propname;
        pick_list[0] = null;
        var clr = NO_COLOR;

        struct_assign(any, cg.zeroany);
        win = create_nhwindow()(NHW_MENU);
        start_menu()(win, MENU_BEHAVE_STANDARD);
        if (iflags.cmdassist) {
            /* start menu with a subtitle */
            void sprintf(buf, _("[Precede any selection with a count to increment by other than %d.]"), DEFAULT_TIMEOUT_INCR)

;
            add_menu_str(win, buf);
        }
        for (i = 0; (propname = property_by_index(i, p)) != 0; ++i) {
            if (p[0] == HALLUC_RES) {
                /* Grayswandir vs hallucination; ought to be redone to
                   use u.uprops[HALLUC].blocked instead of being treated
                   as a separate property; letting in be manually toggled
                   even only in wizard mode would be asking for trouble... */
                continue;
            }
            if (p[0] == FIRE_RES) {
                /* FIRE_RES and properties beyond it (in the propertynames[]
                   ordering, not their numerical PROP values), can only be
                   set to timed values here so show a separator */
                add_menu_str(win, _("--"));
            }
            any.a_int = i + 1; /* +1: avoid 0 */
            oldtimeout = u.uprops[p[0]].intrinsic & TIMEOUT;
            if (oldtimeout)
                void sprintf(buf, _("%-27s [%lli]"), propname, oldtimeout);
            else
                void sprintf(buf, _("%s"), propname);
            add_menu(win, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf,
                     MENU_ITEMFLAGS_NONE);
        }
        end_menu()(win, _("Which intrinsics?"));
        n = select_menu(win, PICK_ANY, pick_list);
        destroy_nhwindow()(win);

        for (j = 0; j < n; ++j) {
            i = ptr_add(pick_list[0], j).item.a_int - 1; /* -1: reverse +1 above */
            propname = property_by_index(i, p);
            oldtimeout = u.uprops[p[0]].intrinsic & TIMEOUT;
            amt = (ptr_add(pick_list[0], j).count == -1) ? DEFAULT_TIMEOUT_INCR
                                              : int((ptr_add(pick_list[0], j).count));
            if (amt <= 0) /* paranoia */
                continue;
            newtimeout = oldtimeout + amt;

            switch (p[0]) {
            case SICK:
            case SLIMED:
            case STONED:
                if (oldtimeout > 0 && newtimeout > oldtimeout)
                    newtimeout = oldtimeout;
                break;
            }

            $goto_def_feedback: for (;;) { switch ($goto || (p[0])) {
            case BLINDED:
                make_blinded(newtimeout, TRUE);
                break;






            case DEAF:
                make_deaf(newtimeout, TRUE);
                break;
            case HALLUC:
                make_hallucinated(newtimeout, TRUE, 0);
                break;
            case SICK:
                typ = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
                make_sick(newtimeout, wizintrinsic, TRUE, typ);
                break;
            case SLIMED:
                void sprintf(buf, fmt, !Slimed() ? _("") : _(" still"), _("turning into slime"))
;
                make_slimed(newtimeout, buf);
                break;
            case STONED:
                void sprintf(buf, fmt, !Stoned() ? _("") : _(" still"), _("turning into stone"))
;
                make_stoned(newtimeout, buf, KILLED_BY, wizintrinsic);
                break;
            case STUNNED:
                make_stunned(newtimeout, TRUE);
                break;
            case VOMITING:
                void sprintf(buf, fmt, !Vomiting() ? _("") : _(" still"), _("vomiting"));
                make_vomiting(newtimeout, FALSE);
                pline1(buf);
                break;
            case WARN_OF_MON:
                if (!Warn_of_mon()) {
                    svc.context.warntype.speciesidx = PM_GRID_BUG;
                    svc.context.warntype.species
                                     = mons[svc.context.warntype.speciesidx];
                }
                { $goto = "def_feedback"; continue $goto_def_feedback; }
            case GLIB:
                /* slippery fingers might need a persistent inventory update
                   so needs more than simple incr_itimeout() but we want
                   the pline() issued with that */
                make_glib(int(newtimeout));
                /* FALLTHROUGH */;
                /*FALLTHRU*/
            case "def_feedback": default:
 $goto = null;
                if (p[0] != GLIB)
                    incr_itimeout(ref_of(u.uprops[p[0]], "intrinsic"), amt);
                disp.botl = TRUE; /* have pline() do a status update */
                pline(_("Timeout for %s %s %d."), propname,
                      oldtimeout ? _("increased by") : _("set to"), amt);
                break;
            } break; }
            /* this has to be after incr_itimeout() */
            if (p[0] == LEVITATION || p[0] == FLYING)
                float_vs_flight();
            else if (p[0] == PROT_FROM_SHAPE_CHANGERS)
                rescham();
            if (p[0] == WWALKING || p[0] == LEVITATION || p[0] == FLYING) {
                if (u.uinwater)
                    void pooleffects(FALSE);
            }
        }
        if (n >= 1)
            free(addr_of(pick_list[0]));
        docrt();
    } else
        pline(unavailcmd, ecname_from_fn(wiz_intrinsic));
    return ECMD_OK;
} finally { stack_pop($frame); } }



/* #wizrumorcheck command - verify each rumor access */
export function /* int */
wiz_rumor_check()
{
    rumor_check();
    return ECMD_OK;
}

/*
 * wizard mode sanity_check code
 */

const template = init_string(static_array("template", char, sizeof_string("%-27s  %4lld  %6lld")), _("%-27s  %4lld  %6lld"), true);
const stats_hdr = init_string(static_array("stats_hdr", char, sizeof_string("                             count  bytes")), _("                             count  bytes"), true);
const stats_sep = init_string(static_array("stats_sep", char, sizeof_string("---------------------------  ----- -------")), _("---------------------------  ----- -------"), true);

function /* int */
size_obj(otmp)
{
    let sz = (NHJS_LP64_SIZEOF_struct_obj);

    if (otmp.oextra) {
        sz += (NHJS_LP64_SIZEOF_struct_oextra);
        if (ONAME(otmp))
            sz += int(strlen(ONAME(otmp))) + 1;
        if (OMONST(otmp))
            sz += size_monst(OMONST(otmp), FALSE);
        if (OMAILCMD(otmp))
            sz += int(strlen(OMAILCMD(otmp))) + 1;
        /* sz += (int) sizeof (unsigned); -- now part of oextra itself */
    }
    return sz;
}

function /* void */
count_obj(chain, total_count, total_size,
          top, recurse)
{
    let count, size;
    let obj;

    for (count = size = 0, obj = chain; obj; obj = obj.nobj) {
        if (top) {
            count++;
            size += size_obj(obj);
        }
        if (recurse && obj.cobj)
            count_obj(obj.cobj, total_count, total_size, TRUE, TRUE);
    }
    total_count[0] += count;
    total_size[0] += size;
}

  /* RESTORE_WARNING follows wiz_show_stats */

function /* void */
obj_chain(
    win,
    src,
    chain,
    force,
    total_count, total_size)
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);
    let count = stack_var(long, 0), size = stack_var(long, 0);

    count_obj(chain, count, size, TRUE, FALSE);

    if (count[0] || size[0] || force) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(buf, template, src, count[0], size[0]);
        putstr()(win, 0, buf);
    }
} finally { stack_pop($frame); } }

function /* void */
mon_invent_chain(
    win,
    src,
    chain,
    total_count, total_size)
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);
    let count = stack_var(long, 0), size = stack_var(long, 0);
    let mon;

    for (mon = chain; mon; mon = mon.nmon)
        count_obj(mon.minvent, count, size, TRUE, FALSE);

    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(buf, template, src, count[0], size[0]);
        putstr()(win, 0, buf);
    }
} finally { stack_pop($frame); } }

function /* void */
contained_stats(
    win,
    src,
    total_count, total_size)
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);
    let count = stack_var(long, 0), size = stack_var(long, 0);
    let mon;

    count_obj(gi.invent, count, size, FALSE, TRUE);
    count_obj(fobj(), count, size, FALSE, TRUE);
    count_obj(svl.level.buriedobjlist, count, size, FALSE, TRUE);
    count_obj(gm.migrating_objs, count, size, FALSE, TRUE);
    /* DEADMONSTER check not required in this loop since they have no
     * inventory */
    for (mon = fmon(); mon; mon = mon.nmon)
        count_obj(mon.minvent, count, size, FALSE, TRUE);
    for (mon = gm.migrating_mons; mon; mon = mon.nmon)
        count_obj(mon.minvent, count, size, FALSE, TRUE);

    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(buf, template, src, count[0], size[0]);
        putstr()(win, 0, buf);
    }
} finally { stack_pop($frame); } }

function /* int */
size_monst(mtmp, incl_wsegs)
{
    let sz = (NHJS_LP64_SIZEOF_struct_monst);

    if (mtmp.wormno && incl_wsegs)
        sz += size_wseg(mtmp);

    if (mtmp.mextra) {
        sz += (NHJS_LP64_SIZEOF_struct_mextra);
        if (MGIVENNAME(mtmp))
            sz += int(strlen(MGIVENNAME(mtmp))) + 1;
        if (EGD(mtmp))
            sz += (NHJS_LP64_SIZEOF_struct_egd);
        if (EPRI(mtmp))
            sz += (NHJS_LP64_SIZEOF_struct_epri);
        if (ESHK(mtmp))
            sz += (NHJS_LP64_SIZEOF_struct_eshk);
        if (EMIN(mtmp))
            sz += (NHJS_LP64_SIZEOF_struct_emin);
        if (EDOG(mtmp))
            sz += (NHJS_LP64_SIZEOF_struct_edog);
        if (EBONES(mtmp))
            sz += (NHJS_LP64_SIZEOF_struct_ebones);
        /* mextra->mcorpsenm doesn't point to more memory */
    }
    return sz;
}

function /* void */
mon_chain(
    win,
    src,
    chain,
    force,
    total_count, total_size)
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);
    let count, size;
    let mon;
    /* mon->wormno means something different for migrating_mons and mydogs */
    let incl_wsegs = +!strcmpi(src, _("fmon"));

    count = size = 0;
    for (mon = chain; mon; mon = mon.nmon) {
        count++;
        size += size_monst(mon, incl_wsegs);
    }
    if (count || size || force) {
        total_count[0] += count;
        total_size[0] += size;
        void sprintf(buf, template, src, count, size);
        putstr()(win, 0, buf);
    }
} finally { stack_pop($frame); } }

function /* void */
misc_stats(
    win,
    total_count, total_size)
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ), hdrbuf = stack_array(char, QBUFSZ);
    let count = stack_var(long), size = stack_var(long);
    let idx;
    let tt;
    let sd; /* shop damage */
    let k; /* delayed killer */
    let bi; /* bones info */

    /* traps and engravings are output unconditionally;
     * others only if nonzero
     */
    count[0] = size[0] = 0;
    for (tt = gf.ftrap; tt; tt = tt.ntrap) {
        ++count[0];
        size[0] += (NHJS_LP64_SIZEOF_struct_trap);
    }
    total_count[0] += count[0];
    total_size[0] += size[0];
    void sprintf(hdrbuf, _("traps, size %lld"), (NHJS_LP64_SIZEOF_struct_trap));
    void sprintf(buf, template, hdrbuf, count[0], size[0]);
    putstr()(win, 0, buf);

    count[0] = size[0] = 0;
    engr_stats(_("engravings, size %lld+text"), hdrbuf, count, size);
    total_count[0] += count[0];
    total_size[0] += size[0];
    void sprintf(buf, template, hdrbuf, count[0], size[0]);
    putstr()(win, 0, buf);

    count[0] = size[0] = 0;
    light_stats(_("light sources, size %lld"), hdrbuf, count, size);
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }

    count[0] = size[0] = 0;
    timer_stats(_("timers, size %lld"), hdrbuf, count, size);
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }

    count[0] = size[0] = 0;
    for (sd = svl.level.damagelist; sd; sd = sd.next) {
        ++count[0];
        size[0] += (NHJS_LP64_SIZEOF_struct_damage);
    }
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(hdrbuf, _("shop damage, size %lld"), (NHJS_LP64_SIZEOF_struct_damage))
;
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }

    count[0] = size[0] = 0;
    region_stats(_("regions, size %lld+%lld*rect+N"), hdrbuf, count, size);
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }

    count[0] = size[0] = 0;
    for (k = svk.killer.next; k; k = k.next) {
        ++count[0];
        size[0] += (NHJS_LP64_SIZEOF_struct_kinfo);
    }
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(hdrbuf, _("delayed killer%s, size %lld"), plur(count[0]), (NHJS_LP64_SIZEOF_struct_kinfo))
;
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }

    count[0] = size[0] = 0;
    for (bi = svl.level.bonesinfo; bi; bi = bi.next) {
        ++count[0];
        size[0] += (NHJS_LP64_SIZEOF_struct_cemetery);
    }
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void sprintf(hdrbuf, _("bones history, size %lld"), (NHJS_LP64_SIZEOF_struct_cemetery))
;
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }

    count[0] = size[0] = 0;
    for (idx = 0; idx < NUM_OBJECTS; ++idx)
        if (objects[idx].oc_uname) {
            ++count[0];
            size[0] += (unsigned(strlen(objects[idx].oc_uname) + 1));
        }
    if (count[0] || size[0]) {
        total_count[0] += count[0];
        total_size[0] += size[0];
        void strcpy(hdrbuf, _("object type names, text"));
        void sprintf(buf, template, hdrbuf, count[0], size[0]);
        putstr()(win, 0, buf);
    }
} finally { stack_pop($frame); } }

function /* void */
you_sanity_check()
{
    let mtmp;

    if (u.uswallow && !u.ustuck) {
        /* this probably ought to be panic() */
        impossible(_("sanity_check: swallowed by nothing?"));
        display_nhwindow()(WIN_MESSAGE, TRUE);
        /* try to recover from whatever the problem is */
        u.uswallow = 0;
        u.uswldtim = 0;
        docrt();
    }
    if ((mtmp = m_at(u.ux, u.uy)) != null) {
        /* u.usteed isn't on the map */
        if (u.ustuck != mtmp)
            impossible(_("sanity_check: you over monster"));
    }
    /* [should we also check for (u.uhp < 1), (Upolyd && u.mh < 1),
       and (u.uen < 0) here?] */
    if (u.uhp > u.uhpmax) {
        impossible(_("current hero health (%d) better than maximum? (%d)"),
                   u.uhp, u.uhpmax);
        u.uhp = u.uhpmax;
    }
    if (Upolyd() && u.mh > u.mhmax) {
        impossible(
              _("current hero health as monster (%d) better than maximum? (%d)"),
                   u.mh, u.mhmax);
        u.mh = u.mhmax;
    }
    if (u.uen > u.uenmax) {
        impossible(_("current hero energy (%d) better than maximum? (%d)"),
                   u.uen, u.uenmax);
        u.uen = u.uenmax;
    }

    check_wornmask_slots();
    void check_invent_gold(_("invent"));
}

function /* void */
levl_sanity_check()
{
    let x, y;

    if (Underwater())
        return; /* Underwater uses different vision */

    for (y = 0; y < ROWNO; y++) {
        for (x = 1; x < COLNO; x++) {
            if ((does_block(x, y, levl()[x][y]) ? 1 : 0) != get_viz_clear(x, y))
                impossible(_("levl[%i][%i] vision blocking"), x, y);
        }
    }
}

export function /* void */
sanity_check()
{
    if (iflags.sanity_no_check) {
        /* in case a recurring sanity_check warning occurs, we mustn't
           re-trigger it when ^P is used, otherwise msg_window:Single
           and msg_window:Combination will always repeat the most recent
           instance, never able to go back to any earlier messages */
        iflags.sanity_no_check = FALSE;
        return;
    }
    program_state.in_sanity_check++;
    you_sanity_check();
    obj_sanity_check();
    timer_sanity_check();
    mon_sanity_check();
    light_sources_sanity_check();
    bc_sanity_check();
    trap_sanity_check();
    engraving_sanity_check();
    levl_sanity_check();
    program_state.in_sanity_check--;
}

/* qsort() comparison routine for use in list_migrating_mons() */
function /* int QSORTCALLBACK */
migrsort_cmp(vptr1, vptr2)
{
    let m1 = ref_to(ptr_to(struct_monst), vptr1)[0],
                       m2 = ref_to(ptr_to(struct_monst), vptr2)[0];
    let d1 = m1.mux, l1 = m1.muy,
        d2 = m2.mux, l2 = m2.muy;

    /* if different branches, sort by dungeon number */
    if (d1 != d2)
        return d1 - d2;
    /* within same branch, sort by level number */
    if (l1 != l2)
        return l1 - l2;
    /* same destination level:  use a tie-breaker to force stable sort;
       monst->m_id is unsigned so we need more than just simple subtraction */
    return (m1.m_id < m2.m_id) ? -1 : (+(m1.m_id > m2.m_id));
}

/* called by #migratemons; displays count of migrating monsters, optionally
   displays them as well */
function /* void */
list_migrating_mons(
    nextlevl) /* default destination for wiz_migrate_mons() */
{ const $frame = stack_frame(); try {
    let win = WIN_ERR;
    let showit = FALSE;
    let n;
    let xyloc;
    let x, y;
    let c, prmpt = stack_array(char, 10), xtra = stack_array(char, 10), buf = stack_array(char, BUFSZ);
    let mtmp, marray;
    let here = 0, nxtlv = 0, other = 0;

    for (mtmp = gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mux == u.uz.dnum && mtmp.muy == u.uz.dlevel)
            ++here;
        else if (mtmp.mux == nextlevl.dnum && mtmp.muy == nextlevl.dlevel)
            ++nxtlv;
        else
            ++other;
    }
    if (here + nxtlv + other == 0) {
        pline(_("No monsters currently migrating."));
    } else {
        pline(
      _("%d mon%s pending for current level, %d for next level, %d for others."),
              here, plur(here), nxtlv, other);
        chars[prmpt + 0] = chars[xtra + 0] = ord('\0');
        void strkitten(here ? prmpt : xtra, ord('c'));
        void strkitten(nxtlv ? prmpt : xtra, ord('n'));
        void strkitten(other ? prmpt : xtra, ord('o'));
        void strcat(prmpt, _("a q"));
        if (chars[xtra])
            void sprintf(eos(prmpt), _("%c%s"), ord('\x1b'), xtra);
        c = yn_function(_("List which?"), prmpt, ord('q'), TRUE);
        n = unsigned((c == ord('c')) ? here
            : (c == ord('n')) ? nxtlv
              : (c == ord('o')) ? other
                : (c == ord('a')) ? here + nxtlv + other
                  : 0);
        if (n > 0) {
            win = create_nhwindow()(NHW_TEXT);
            switch (c) {
            case ord('c'):
            case ord('n'):
            case ord('o'):
                void sprintf(buf, _("Monster%s migrating to %s:"), plur(n), (c == ord('c')) ? _("current level")
                        : (c == ord('n')) ? _("next level")
                          : _("'other' levels"))
;
                break;
            default:
                void strcpy(buf, _("All migrating monsters:"));
                break;
            }
            putstr()(win, 0, buf);
            putstr()(win, 0, _(""));
            /* collect the migrating monsters into an array; for 'o' and 'a'
               where multiple destination levels might be present, sort by
               the destination; 'c' and 'n' don't need to be sorted but we
               do that anyway to get the same tie-breaker as 'o' and 'a' */
            marray = ref_to(ptr_to(struct_monst), addr_of(alloc(unsigned(unsigned(Math.imul(unsigned((unsigned(n + 1))), sizeof(ptr_to(struct_monst))))))));
            n = 0;
            for (mtmp = gm.migrating_mons; mtmp; mtmp = mtmp.nmon) {
                if (c == ord('a'))
                    showit = TRUE;
                else if (mtmp.mux == u.uz.dnum && mtmp.muy == u.uz.dlevel)
                    showit = (+(c == ord('c')));
                else if (mtmp.mux == nextlevl.dnum
                         && mtmp.muy == nextlevl.dlevel)
                    showit = (+(c == ord('n')));
                else
                    showit = (+(c == ord('o')));

                if (showit)
                    marray[n++] = mtmp;
            }
            marray[n] = null; /* mark end for traversal loop */
            if (n > 1)
                qsort(addr_of(marray), n, sizeof(ptr_to(struct_monst)),
                      migrsort_cmp); /* sort elements [0] through [n-1] */
            for (n = 0; (mtmp = marray[n]) != null; ++n) {
                void sprintf(buf, _("  %s"), minimal_monnam(mtmp, FALSE));
                /* minimal_monnam() appends map coordinates; strip that */
                void strsubst(buf, _(" <0,0>"), _(""));
                if (has_mgivenname(mtmp)) /* if mtmp is named, include that */
                    void sprintf(eos(buf), _(" named %s"), MGIVENNAME(mtmp));
                if (c == ord('o') || c == ord('a'))
                    void sprintf(eos(buf), _(" to %d:%d"), mtmp.mux, mtmp.muy);
                xyloc = mtmp.mtrack[0].x; /* (for legibility) */
                if (xyloc == MIGR_EXACT_XY) {
                    x = mtmp.mtrack[1].x;
                    y = mtmp.mtrack[1].y;
                    void sprintf(eos(buf), _(" at <%d,%d>"), x, y);
                }
                putstr()(win, 0, buf);
            }
            free(addr_of(marray));
            display_nhwindow()(win, FALSE);
            destroy_nhwindow()(win);
        } else if (c != ord('q')) {
            pline(_("None."));
        }

    }
} finally { stack_pop($frame); } }

/* the #stats command
 * Display memory usage of all monsters and objects on the level.
 */
export function /* int */
wiz_show_stats()
{ const $frame = stack_frame(); try {
    let buf = stack_array(char, BUFSZ);
    let win;
    let total_obj_size = stack_var(long), total_obj_count = stack_var(long),
         total_mon_size = stack_var(long), total_mon_count = stack_var(long),
         total_ovr_size = stack_var(long), total_ovr_count = stack_var(long),
         total_misc_size = stack_var(long), total_misc_count = stack_var(long);

    win = create_nhwindow()(NHW_TEXT);
    putstr()(win, 0, _("Current memory statistics:"));

    total_obj_count[0] = total_obj_size[0] = 0;
    putstr()(win, 0, stats_hdr);
    void sprintf(buf, _("  Objects, base size %lld"), (NHJS_LP64_SIZEOF_struct_obj));
    putstr()(win, 0, buf);
    obj_chain(win, _("invent"), gi.invent, TRUE,
              total_obj_count, total_obj_size);
    obj_chain(win, _("fobj"), fobj(), TRUE, total_obj_count, total_obj_size);
    obj_chain(win, _("buried"), svl.level.buriedobjlist, FALSE,
              total_obj_count, total_obj_size);
    obj_chain(win, _("migrating obj"), gm.migrating_objs, FALSE,
              total_obj_count, total_obj_size);
    obj_chain(win, _("billobjs"), gb.billobjs, FALSE,
              total_obj_count, total_obj_size);
    mon_invent_chain(win, _("minvent"), fmon(), total_obj_count, total_obj_size);
    mon_invent_chain(win, _("migrating minvent"), gm.migrating_mons,
                     total_obj_count, total_obj_size);
    contained_stats(win, _("contained"), total_obj_count, total_obj_size);
    putstr()(win, 0, stats_sep);
    void sprintf(buf, template, _("  Obj total"), total_obj_count[0], total_obj_size[0]);
    putstr()(win, 0, buf);

    total_mon_count[0] = total_mon_size[0] = 0;
    putstr()(win, 0, _(""));
    void sprintf(buf, _("  Monsters, base size %lld"), (NHJS_LP64_SIZEOF_struct_monst));
    putstr()(win, 0, buf);
    mon_chain(win, _("fmon"), fmon(), TRUE, total_mon_count, total_mon_size);
    mon_chain(win, _("migrating"), gm.migrating_mons, FALSE,
              total_mon_count, total_mon_size);
    /* 'gm.mydogs' is only valid during level change or end of game disclosure,
       but conceivably we've been called from within debugger at such time */
    if (gm.mydogs) /* monsters accompanying hero */
        mon_chain(win, _("mydogs"), gm.mydogs, FALSE,
                  total_mon_count, total_mon_size);
    putstr()(win, 0, stats_sep);
    void sprintf(buf, template, _("  Mon total"), total_mon_count[0], total_mon_size[0]);
    putstr()(win, 0, buf);

    total_ovr_count[0] = total_ovr_size[0] = 0;
    putstr()(win, 0, _(""));
    putstr()(win, 0, _("  Overview"));
    overview_stats(win, template, total_ovr_count, total_ovr_size);
    putstr()(win, 0, stats_sep);
    void sprintf(buf, template, _("  Over total"), total_ovr_count[0], total_ovr_size[0]);
    putstr()(win, 0, buf);

    total_misc_count[0] = total_misc_size[0] = 0;
    putstr()(win, 0, _(""));
    putstr()(win, 0, _("  Miscellaneous"));
    misc_stats(win, total_misc_count, total_misc_size);
    putstr()(win, 0, stats_sep);
    void sprintf(buf, template, _("  Misc total"), total_misc_count[0], total_misc_size[0]);
    putstr()(win, 0, buf);

    putstr()(win, 0, _(""));
    putstr()(win, 0, stats_sep);
    void sprintf(buf, template, _("  Grand total"), (total_obj_count[0] + total_mon_count[0]
             + total_ovr_count[0] + total_misc_count[0]), (total_obj_size[0] + total_mon_size[0]
             + total_ovr_size[0] + total_misc_size[0]))

;
    putstr()(win, 0, buf);





    display_nhwindow()(win, FALSE);
    destroy_nhwindow()(win);
    return ECMD_OK;
} finally { stack_pop($frame); } }




/* the #wizdispmacros command
 * Verify that some display macros are returning sane values */
export function /* int */
wiz_display_macros()
{ const $frame = stack_frame(); try {
    let display_issues = init_string(static_array("wiz_display_macros.display_issues", char, sizeof_string("Display macro issues:")), _("Display macro issues:"), true);
    let buf = stack_array(char, BUFSZ);
    let win;
    let glyph, test, trouble = 0, no_glyph = NO_GLYPH, max_glyph = MAX_GLYPH;

    win = create_nhwindow()(NHW_TEXT);

    for (glyph = 0; glyph < MAX_GLYPH; ++glyph) {
        /* glyph_is_cmap / glyph_to_cmap() */
        if (glyph_is_cmap(glyph)) {
            test = glyph_to_cmap(glyph);
            /* check for MAX_GLYPH return */
            if (test == no_glyph) {
                if (!trouble++)
                    putstr()(win, 0, display_issues);
                void sprintf(buf, _("glyph_is_cmap() / glyph_to_cmap(glyph=%d)" +
                             " sync failure, returned NO_GLYPH (%d)"), glyph, test)
;
                 putstr()(win, 0, buf);
            }
            if (glyph_is_cmap_zap(glyph)
                && !(test >= S_vbeam && test <= S_rslant)) {
                if (!trouble++)
                    putstr()(win, 0, display_issues);
                void sprintf(buf, _("glyph_is_cmap_zap(glyph=%d) returned non-zap cmap %d"), glyph, test)

;
                 putstr()(win, 0, buf);
            }
            /* check against defsyms array subscripts */
            if (!IndexOk(test, defsyms)) {
                if (!trouble++)
                    putstr()(win, 0, display_issues);
                void sprintf(buf, _("glyph_to_cmap(glyph=%d) returns %d" +
                             " exceeds defsyms[%d] bounds (MAX_GLYPH = %d)"), glyph, test, SIZE(defsyms), max_glyph)
;
                putstr()(win, 0, buf);
            }
        }
        /* glyph_is_monster / glyph_to_mon */
        if (glyph_is_monster(glyph)) {
            test = glyph_to_mon(glyph);
            /* check against mons array subscripts */
            if (test < 0 || test >= NUMMONS) {
                if (!trouble++)
                    putstr()(win, 0, display_issues);
                void sprintf(buf, _("glyph_to_mon(glyph=%d) returns %d" +
                             " exceeds mons[%d] bounds"), glyph, test, NUMMONS)
;
                putstr()(win, 0, buf);
            }
        }
        /* glyph_is_object / glyph_to_obj */
        if (glyph_is_object(glyph)) {
            test = glyph_to_obj(glyph);
            /* check against objects array subscripts */
            if (test < 0 || test > NUM_OBJECTS) {
                if (!trouble++)
                    putstr()(win, 0, display_issues);
                void sprintf(buf, _("glyph_to_obj(glyph=%d) returns %d" +
                             " exceeds objects[%d] bounds"), glyph, test, NUM_OBJECTS)
;
                putstr()(win, 0, buf);
            }
        }
    }
    if (!trouble)
        putstr()(win, 0, _("No display macro issues detected."));
    display_nhwindow()(win, FALSE);
    destroy_nhwindow()(win);
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* the #wizshownhuuid command */
export function /* int */
wiz_show_nhuuid()
{
    pline(_("The NHUUID for this game is { %s }."), svn.nhuuid);
    return ECMD_OK;
}

/* the #wizmondiff command */
export function /* int */
wiz_mon_diff()
{ const $frame = stack_frame(); try {
    let window_title = init_string(static_array("wiz_mon_diff.window_title", char, sizeof_string("Review of monster difficulty ratings" + " [index:level]:")), _("Review of monster difficulty ratings" +
                                       " [index:level]:"), true);
    let buf = stack_array(char, BUFSZ);
    let win;
    let mhardcoded = 0, mcalculated = 0, trouble = 0, cnt = 0, mdiff = 0;
    let mlev;
    let ptr;

    /*
     * Possible extension:  choose between showing discrepancies,
     * showing all monsters, or monsters within a particular class.
     */

    win = create_nhwindow()(NHW_TEXT);
    for (ptr = ptr_add(mons[0], 0); ptr.mlet; ptr = ptr_add(ptr, 1), cnt++) {
        mcalculated = mstrength(ptr);
        mhardcoded = ptr.difficulty;
        mdiff = mhardcoded - mcalculated;
        if (mdiff) {
            if (!trouble++)
                putstr()(win, 0, window_title);
            mlev = ptr.mlevel;
            if (mlev > 50) /* hack for named demons */
                mlev = 50;
            Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%-18s [%3d:%2d]: calculated: %2d, hardcoded: %2d (%+d)"), ptr.pmnames[NEUTRAL], cnt, mlev, mcalculated, mhardcoded, mdiff)


;
            putstr()(win, 0, buf);
        }
    }
    if (!trouble)
        putstr()(win, 0, _("No monster difficulty discrepancies were detected."));
    display_nhwindow()(win, FALSE);
    destroy_nhwindow()(win);
    return ECMD_OK;
} finally { stack_pop($frame); } }

/* the #wizobjprobs command */
export function /* int */
wiz_objprobs()
{ const $frame = stack_frame(); try {
    let win;
    let buf = stack_array(char, BUFSZ);
    let probsum = stack_array(int, MAXOCLASSES);
    let otyp;
    let oclass = objects[FIRST_OBJECT].oc_class;
    memset(addr_of(probsum), 0, sizeof(array_of(int, MAXOCLASSES)));

    for (otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        probsum[(objects[otyp].oc_class)] += objects[otyp].oc_prob;
    }

    win = create_nhwindow()(NHW_TEXT);
    for (otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        /* placeholders for extra descriptions aren't generatable objects */
        if (!OBJ_NAME(objects[otyp]))
            continue;

        if ((objects[otyp].oc_class) != oclass) {
            putstr()(win, 0, _(""));
        }
        oclass = objects[otyp].oc_class;

        Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%4d / %4d (%6.2f%%): %s"), objects[otyp].oc_prob, probsum[oclass], (objects[otyp].oc_prob) * 100. /
                 (probsum[oclass]), OBJ_NAME(objects[otyp]))



;
        putstr()(win, 0, buf);
    }
    display_nhwindow()(win, FALSE);
    destroy_nhwindow()(win);

    return ECMD_OK;
} finally { stack_pop($frame); } }


/* #migratemons command */
export function /* int */
wiz_migrate_mons()
{ const $frame = stack_frame(); try {

    let mcount;
    let inbuf = stack_array(char, BUFSZ);
    let ptr;
    let mtmp;
    let use_random_mon = TRUE;
    let mongen_saved = iflags.debug_mongen;

    let tolevel = stack_struct(struct_d_level);

    if (Is_stronghold(u.uz))
        assign_level(tolevel, (svd.dungeon_topology.d_valley_level));
    else if (!Is_botlevel(u.uz))
        get_level(tolevel, depth(u.uz) + 1);
    else
        tolevel.dnum = 0, tolevel.dlevel = 0;

    list_migrating_mons(tolevel);


    chars[inbuf + 0] = chars[inbuf + 1] = ord('\0');
    if (tolevel.dnum || tolevel.dlevel)
        getlin(_("How many random monsters to migrate to next level? [0]"),
               inbuf);
    else
        pline(_("Can't get there from here."));
    if (chars[inbuf] == ord('\x1b') || chars[inbuf] == ord('\0'))
        return ECMD_OK;

    mcount = atoi(inbuf);
    if (mcount < 0) {
        use_random_mon = FALSE;
        mcount *= -1;
    }
    if (mcount < 1)
        mcount = 0;
    else if (mcount > ((COLNO - 1) * ROWNO))
        mcount = (COLNO - 1) * ROWNO;

    iflags.debug_mongen = FALSE;
    while (mcount > 0) {
        if (use_random_mon) {
            ptr = rndmonst();
            mtmp = makemon(ptr, 0, 0, MM_NOMSG);
        } else {
            mtmp = fmon();
        }
        if (mtmp)
            migrate_to_level(mtmp, ledger_no(tolevel), MIGR_RANDOM,
                                 null);
        mcount--;
    }
    iflags.debug_mongen = mongen_saved;

    return ECMD_OK;
} finally { stack_pop($frame); } }

/* #wizcustom command to see glyphmap customizations */
export function /* int */
wiz_custom()
{ const $frame = stack_frame(); try {
         /* symbols.c */

    if (wizard()) {
        let wizcustom = init_string(static_array("wiz_custom.wizcustom", char, sizeof_string("#wizcustom")), _("#wizcustom"), true);
        let win;
        let buf = stack_array(char, BUFSZ), bufa = stack_array(char, BUFSZ);
        let n;



        let pick_list = stack_var(ptr_to(struct_mi), null);

        if (!glyphid_cache_status())
            fill_glyphid_cache();

        win = create_nhwindow()(NHW_MENU);
        start_menu()(win, MENU_BEHAVE_STANDARD);
        add_menu_heading(win,
                         _("    glyph  glyph identifier                        " +
                         "     sym   clr customcolor unicode utf8"));
        void sprintf(bufa, _("%s: colorcount=%lld %s"), wizcustom, iflags.colorcount, gs.symset[PRIMARYSET].name ? gs.symset[PRIMARYSET].name
                                          : _("default"))

;
        if (gc.currentgraphics == PRIMARYSET && gs.symset[PRIMARYSET].name)
            void strcat(bufa, _(", active"));
        if (gs.symset[PRIMARYSET].handling) {
            void sprintf(eos(bufa), _(", handler=%s"), known_handling[gs.symset[PRIMARYSET].handling])
;
        }
        void sprintf(buf, _("%s"), bufa);
        wizcustom_glyphids(win);
        end_menu()(win, bufa);
        n = select_menu(win, PICK_NONE, pick_list);
        destroy_nhwindow()(win);





        if (n >= 1)
            free(addr_of(pick_list[0]));
        if (glyphid_cache_status())
            free_glyphid_cache();
        docrt();
    } else
        pline(unavailcmd, ecname_from_fn(wiz_custom));
    return ECMD_OK;
} finally { stack_pop($frame); } }

export function /* void */
wizcustom_callback(win, glyphnum, id)
{ const $frame = stack_frame(); try {
    
    let cgm;
    let clr = NO_COLOR;
    let buf = stack_array(char, BUFSZ), bufa = stack_array(char, BUFSZ), bufb = stack_array(char, BUFSZ), bufc = stack_array(char, BUFSZ), bufd = stack_array(char, BUFSZ),
        bufu = stack_array(char, BUFSZ);
    let any = stack_struct(struct_any);
    let cp;

    if (win && id) {
        cgm = glyphmap[glyphnum];
        if (

            cgm.u ||

            cgm.customcolor != 0) {
            void sprintf(bufa, _("[%04d] %-44s"), glyphnum, id);
            void sprintf(bufb, _("'\\%03d' %02d"), uchars[gs.showsyms + cgm.sym.symidx], cgm.sym.color)
;
            void sprintf(bufc, _("%011llx"), cgm.customcolor);
            chars[bufu + 0] = ord('\0');

            if (cgm.u && cgm.u.utf8str) {
                void sprintf(bufu, _("U+%04llx"), cgm.u.utf32ch);
                cp = cgm.u.utf8str;
                while (uchars[cp]) {
                    void sprintf(bufd, _(" <%d>"), (uchars[cp]));
                    void strcat(bufu, bufd);
                    cp++;
                }
            }

            any.a_int = glyphnum + 1; /* avoid 0 */
            Snprintf(buf, sizeof(array_of(char, BUFSZ)), _("%s %s %s %s"), bufa, bufb, bufc, bufu);
            add_menu(win, nul_glyphinfo, any, 0, 0, ATR_NONE, clr, buf,
                     MENU_ITEMFLAGS_NONE);
        }
    }
    return;
} finally { stack_pop($frame); } }

/*wizcmds.c*/
import { NO_COLOR } from "./color.h.js";
import { struct_nhcoord } from "./coord.h.js";
import { Never_mind } from "./decl.h.macros.js";
import { MAXOCLASSES } from "./defsym.h.js";
import { S_fountain } from "./defsym.h.js";
import { S_rslant } from "./defsym.h.js";
import { S_sink } from "./defsym.h.js";
import { S_vbeam } from "./defsym.h.js";
import { MAX_GLYPH } from "./display.h.js";
import { NO_GLYPH } from "./display.h.js";
import { canspotmon } from "./display.h.macros.js";
import { glyph_is_cmap } from "./display.h.macros.js";
import { glyph_is_cmap_zap } from "./display.h.macros.js";
import { glyph_is_invisible } from "./display.h.macros.js";
import { glyph_is_monster } from "./display.h.macros.js";
import { glyph_is_object } from "./display.h.macros.js";
import { glyph_to_mon } from "./display.h.macros.js";
import { glyph_to_obj } from "./display.h.macros.js";
import { MIGR_EXACT_XY } from "./dungeon.h.js";
import { MIGR_RANDOM } from "./dungeon.h.js";
import { struct_d_level } from "./dungeon.h.js";
import { In_endgame } from "./dungeon.h.macros.js";
import { In_sokoban } from "./dungeon.h.macros.js";
import { Is_knox } from "./dungeon.h.macros.js";
import { Is_stronghold } from "./dungeon.h.macros.js";
import { fuzzer_impossible_continue } from "./flag.h.js";
import { fuzzer_impossible_panic } from "./flag.h.js";
import { notice_mon_off } from "./flag.h.macros.js";
import { notice_mon_on } from "./flag.h.macros.js";
import { wizard } from "./flag.h.macros.js";
import { BUFSZ } from "./global.h.js";
import { COLBUFSZ } from "./global.h.js";
import { COLNO } from "./global.h.js";
import { FALSE } from "./global.h.js";
import { MAXULEV } from "./global.h.js";
import { NHL_SB_DEBUGGING } from "./global.h.js";
import { NHL_SB_SAFE } from "./global.h.js";
import { QBUFSZ } from "./global.h.js";
import { ROWNO } from "./global.h.js";
import { TRUE } from "./global.h.js";
import { struct_nhl_sandbox_info } from "./global.h.js";
import { C } from "./global.h.macros.js";
import { strcmpi } from "./global.h.macros.js";
import { ARM } from "./hack.h.js";
import { ARTICLE_A } from "./hack.h.js";
import { ARTICLE_THE } from "./hack.h.js";
import { ARTICLE_YOUR } from "./hack.h.js";
import { DIED } from "./hack.h.js";
import { ECMD_CANCEL } from "./hack.h.js";
import { ECMD_OK } from "./hack.h.js";
import { KILLED_BY } from "./hack.h.js";
import { MM_NOMSG } from "./hack.h.js";
import { POLY_CONTROLLED } from "./hack.h.js";
import { SUPPRESS_HALLUCINATION } from "./hack.h.js";
import { SUPPRESS_IT } from "./hack.h.js";
import { SUPPRESS_SADDLE } from "./hack.h.js";
import { XKILL_NOMSG } from "./hack.h.js";
import { FEATURE_NOTICE_VER } from "./hack.h.macros.js";
import { IndexOk } from "./hack.h.macros.js";
import { max } from "./hack.h.macros.js";
import { min } from "./hack.h.macros.js";
import { mines_dnum } from "./hack.h.macros.js";
import { pline1 } from "./hack.h.macros.js";
import { plur } from "./hack.h.macros.js";
import { qsort } from "./hack.h.macros.js";
import { quest_dnum } from "./hack.h.macros.js";
import { tower_dnum } from "./hack.h.macros.js";
import { y_n } from "./hack.h.macros.js";
import { ynq } from "./hack.h.macros.js";
import { Snprintf } from "./hacklib.h.macros.js";
import { EBONES } from "./mextra.h.macros.js";
import { EDOG } from "./mextra.h.macros.js";
import { EGD } from "./mextra.h.macros.js";
import { EMIN } from "./mextra.h.macros.js";
import { EPRI } from "./mextra.h.macros.js";
import { ESHK } from "./mextra.h.macros.js";
import { MGIVENNAME } from "./mextra.h.macros.js";
import { has_mgivenname } from "./mextra.h.macros.js";
import { AD_PHYS } from "./monattk.h.js";
import { monsndx } from "./mondata.h.macros.js";
import { nonliving } from "./mondata.h.macros.js";
import { G_EXTINCT } from "./monflag.h.js";
import { G_UNIQ } from "./monflag.h.js";
import { NEUTRAL } from "./monflag.h.js";
import { MON_ENDGAME_MIGR } from "./monst.h.js";
import { MON_LIMBO } from "./monst.h.js";
import { MON_MIGRATING } from "./monst.h.js";
import { MON_OFFMAP } from "./monst.h.js";
import { struct_monst } from "./monst.h.js";
import { DEADMONSTER } from "./monst.h.macros.js";
import { NUMMONS } from "./monsters.h.js";
import { PM_GRID_BUG } from "./monsters.h.js";
import { PM_SAMURAI } from "./monsters.h.js";
import { NHJS_LP64_SIZEOF_struct_cemetery } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_damage } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_ebones } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_edog } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_egd } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_emin } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_epri } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_eshk } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_kinfo } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_mextra } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_monst } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_obj } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_oextra } from "./nhjs_recorder_sizes.h.js";
import { NHJS_LP64_SIZEOF_struct_trap } from "./nhjs_recorder_sizes.h.js";
import { OMAILCMD } from "./obj.h.macros.js";
import { OMONST } from "./obj.h.macros.js";
import { ONAME } from "./obj.h.macros.js";
import { OBJ_NAME } from "./objclass.h.macros.js";
import { FIRST_OBJECT } from "./objects.h.js";
import { NUM_OBJECTS } from "./objects.h.js";
import { BLINDED } from "./prop.h.js";
import { CONFUSION } from "./prop.h.js";
import { DEAF } from "./prop.h.js";
import { FIRE_RES } from "./prop.h.js";
import { FLYING } from "./prop.h.js";
import { GLIB } from "./prop.h.js";
import { HALLUC } from "./prop.h.js";
import { HALLUC_RES } from "./prop.h.js";
import { LEVITATION } from "./prop.h.js";
import { PROT_FROM_SHAPE_CHANGERS } from "./prop.h.js";
import { SICK } from "./prop.h.js";
import { SLIMED } from "./prop.h.js";
import { STONED } from "./prop.h.js";
import { STUNNED } from "./prop.h.js";
import { TIMEOUT } from "./prop.h.js";
import { VOMITING } from "./prop.h.js";
import { WARN_OF_MON } from "./prop.h.js";
import { WWALKING } from "./prop.h.js";
import { CORR } from "./rm.h.js";
import { SDOOR } from "./rm.h.js";
import { STONE } from "./rm.h.js";
import { WM_MASK } from "./rm.h.js";
import { IS_DOOR } from "./rm.h.macros.js";
import { IS_ROOM } from "./rm.h.macros.js";
import { IS_WALL } from "./rm.h.macros.js";
import { Sokoban } from "./rm.h.macros.js";
import { fmon } from "./rm.h.macros.js";
import { fobj } from "./rm.h.macros.js";
import { levl } from "./rm.h.macros.js";
import { m_at } from "./rm.h.macros.js";
import { PRIMARYSET } from "./sym.h.js";
import { COULD_SEE } from "./vision.h.js";
import { IN_SIGHT } from "./vision.h.js";
import { TEMP_LIT } from "./vision.h.js";
import { wp_tty } from "./winprocs.h.js";
import { create_nhwindow } from "./winprocs.h.macros.js";
import { destroy_nhwindow } from "./winprocs.h.macros.js";
import { display_nhwindow } from "./winprocs.h.macros.js";
import { end_menu } from "./winprocs.h.macros.js";
import { putstr } from "./winprocs.h.macros.js";
import { start_menu } from "./winprocs.h.macros.js";
import { ATR_NONE } from "./wintype.h.js";
import { MENU_BEHAVE_STANDARD } from "./wintype.h.js";
import { MENU_ITEMFLAGS_NONE } from "./wintype.h.js";
import { NHW_MENU } from "./wintype.h.js";
import { NHW_TEXT } from "./wintype.h.js";
import { PICK_ANY } from "./wintype.h.js";
import { PICK_NONE } from "./wintype.h.js";
import { WIN_ERR } from "./wintype.h.js";
import { struct_any } from "./wintype.h.js";
import { struct_mi } from "./wintype.h.js";
import { SICK_NONVOMITABLE } from "./you.h.js";
import { SICK_VOMITABLE } from "./you.h.js";
import { UTOTYPE_NONE } from "./you.h.js";
import { Role_if } from "./you.h.macros.js";
import { Upolyd } from "./you.h.macros.js";
import { next2u } from "./you.h.macros.js";
import { u_at } from "./you.h.macros.js";
import { uhis } from "./you.h.macros.js";
import { HConfusion } from "./youprop.h.macros.js";
import { HHallucination } from "./youprop.h.macros.js";
import { Slimed } from "./youprop.h.macros.js";
import { Stoned } from "./youprop.h.macros.js";
import { Underwater } from "./youprop.h.macros.js";
import { Vomiting } from "./youprop.h.macros.js";
import { Warn_of_mon } from "./youprop.h.macros.js";
import { SIZE } from "../rt/cmacros.js";
import { char } from "../rt/ctypes.js";
import { int } from "../rt/ctypes.js";
import { long } from "../rt/ctypes.js";
import { ord } from "../rt/ctypes.js";
import { sizeof } from "../rt/ctypes.js";
import { sizeof_string } from "../rt/ctypes.js";
import { unsigned } from "../rt/ctypes.js";
import { chars } from "../rt/heap.js";
import { stack_frame } from "../rt/heap.js";
import { stack_pop } from "../rt/heap.js";
import { uchars } from "../rt/heap.js";
import { and64 } from "../rt/int64.js";
import { or64 } from "../rt/int64.js";
import { atoi } from "../rt/libc.js";
import { free } from "../rt/libc.js";
import { memset } from "../rt/libc.js";
import { sprintf } from "../rt/libc.js";
import { sscanf } from "../rt/libc.js";
import { strcat } from "../rt/libc.js";
import { strchr } from "../rt/libc.js";
import { strcmp } from "../rt/libc.js";
import { strcpy } from "../rt/libc.js";
import { strlen } from "../rt/libc.js";
import { strncmp } from "../rt/libc.js";
import { init_list } from "../rt/locals.js";
import { init_string } from "../rt/locals.js";
import { stack_array } from "../rt/locals.js";
import { stack_struct } from "../rt/locals.js";
import { stack_var } from "../rt/locals.js";
import { static_array } from "../rt/locals.js";
import { _ } from "../rt/strings.js";
import { addr_of } from "../rt/struct.js";
import { array_of } from "../rt/struct.js";
import { ptr_add } from "../rt/struct.js";
import { ptr_to } from "../rt/struct.js";
import { ref_of } from "../rt/struct.js";
import { ref_to } from "../rt/struct.js";
import { struct_assign } from "../rt/struct.js";
import { alloc } from "./alloc.js";
import { bc_sanity_check } from "./ball.js";
import { cmd_from_func } from "./cmd.js";
import { ecname_from_fn } from "./cmd.js";
import { getdir } from "./cmd.js";
import { levltyp } from "./cmd.js";
import { makemap_prepost } from "./cmd.js";
import { paranoid_query } from "./cmd.js";
import { unavailcmd } from "./cmd.js";
import { yn_function } from "./cmd.js";
import { cg } from "./decl.js";
import { disp } from "./decl.js";
import { flags } from "./decl.js";
import { gb } from "./decl.js";
import { gc } from "./decl.js";
import { gf } from "./decl.js";
import { gi } from "./decl.js";
import { gm } from "./decl.js";
import { gs } from "./decl.js";
import { gv } from "./decl.js";
import { gy } from "./decl.js";
import { iflags } from "./decl.js";
import { program_state } from "./decl.js";
import { svc } from "./decl.js";
import { svd } from "./decl.js";
import { svk } from "./decl.js";
import { svl } from "./decl.js";
import { svm } from "./decl.js";
import { svn } from "./decl.js";
import { u } from "./decl.js";
import { do_mapping } from "./detect.js";
import { findit } from "./detect.js";
import { docrt } from "./display.js";
import { glyph_at } from "./display.js";
import { glyphmap } from "./display.js";
import { map_engraving } from "./display.js";
import { map_invisible } from "./display.js";
import { map_trap } from "./display.js";
import { nul_glyphinfo } from "./display.js";
import { unmap_invisible } from "./display.js";
import { minimal_monnam } from "./do_name.js";
import { mon_nam } from "./do_name.js";
import { x_monnam } from "./do_name.js";
import { keepdogs } from "./dog.js";
import { migrate_to_level } from "./dog.js";
import { hurtle } from "./dothrow.js";
import { mhurtle } from "./dothrow.js";
import { defsyms } from "./drawing.js";
import { In_W_tower } from "./dungeon.js";
import { Invocation_lev } from "./dungeon.js";
import { Is_botlevel } from "./dungeon.js";
import { Is_special } from "./dungeon.js";
import { On_W_tower_level } from "./dungeon.js";
import { assign_level } from "./dungeon.js";
import { depth } from "./dungeon.js";
import { get_level } from "./dungeon.js";
import { ledger_no } from "./dungeon.js";
import { on_level } from "./dungeon.js";
import { overview_stats } from "./dungeon.js";
import { print_dungeon } from "./dungeon.js";
import { done } from "./end.js";
import { panic } from "./end.js";
import { engr_stats } from "./engrave.js";
import { engraving_sanity_check } from "./engrave.js";
import { losexp } from "./exper.js";
import { pluslvl } from "./exper.js";
import { getpos } from "./getpos.js";
import { fill_glyphid_cache } from "./glyphs.js";
import { free_glyphid_cache } from "./glyphs.js";
import { glyph_to_cmap } from "./glyphs.js";
import { glyphid_cache_status } from "./glyphs.js";
import { wizcustom_glyphids } from "./glyphs.js";
import { may_dig } from "./hack.js";
import { pooleffects } from "./hack.js";
import { eos } from "./hacklib.js";
import { mungspaces } from "./hacklib.js";
import { strkitten } from "./hacklib.js";
import { strncmpi } from "./hacklib.js";
import { strsubst } from "./hacklib.js";
import { upstart } from "./hacklib.js";
import { check_invent_gold } from "./invent.js";
import { display_inventory } from "./invent.js";
import { light_sources_sanity_check } from "./light.js";
import { light_stats } from "./light.js";
import { makemon } from "./makemon.js";
import { rndmonst } from "./makemon.js";
import { mklev } from "./mklev.js";
import { obj_sanity_check } from "./mkobj.js";
import { dmonsfree } from "./mon.js";
import { mon_sanity_check } from "./mon.js";
import { mongone } from "./mon.js";
import { monkilled } from "./mon.js";
import { rescham } from "./mon.js";
import { usmellmon } from "./mon.js";
import { xkilled } from "./mon.js";
import { mstrength } from "./mondata.js";
import { olfaction } from "./mondata.js";
import { mons } from "./monst.js";
import { load_lua } from "./nhlua.js";
import { objects } from "./objects.js";
import { encumber_msg } from "./pickup.js";
import { There } from "./pline.js";
import { You } from "./pline.js";
import { impossible } from "./pline.js";
import { pline } from "./pline.js";
import { body_part } from "./polyself.js";
import { float_vs_flight } from "./polyself.js";
import { polyself } from "./polyself.js";
import { incr_itimeout } from "./potion.js";
import { make_blinded } from "./potion.js";
import { make_deaf } from "./potion.js";
import { make_glib } from "./potion.js";
import { make_hallucinated } from "./potion.js";
import { make_sick } from "./potion.js";
import { make_slimed } from "./potion.js";
import { make_stoned } from "./potion.js";
import { make_stunned } from "./potion.js";
import { make_vomiting } from "./potion.js";
import { create_particular } from "./read.js";
import { region_stats } from "./region.js";
import { rn2 } from "./rnd.js";
import { rumor_check } from "./rumors.js";
import { setpaid } from "./shk.js";
import { flip_level } from "./sp_lev.js";
import { flip_level_rnd } from "./sp_lev.js";
import { load_special } from "./sp_lev.js";
import { lspo_finalize_level } from "./sp_lev.js";
import { lspo_reset_level } from "./sp_lev.js";
import { known_handling } from "./symbols.js";
import { level_tele } from "./teleport.js";
import { property_by_index } from "./timeout.js";
import { timer_sanity_check } from "./timeout.js";
import { timer_stats } from "./timeout.js";
import { trap_sanity_check } from "./trap.js";
import { does_block } from "./vision.js";
import { get_viz_clear } from "./vision.js";
import { add_menu } from "./windows.js";
import { add_menu_heading } from "./windows.js";
import { add_menu_str } from "./windows.js";
import { getlin } from "./windows.js";
import { select_menu } from "./windows.js";
import { windowprocs } from "./windows.js";
import { size_wseg } from "./worm.js";
import { check_wornmask_slots } from "./worn.js";
import { makewish } from "./zap.js";
