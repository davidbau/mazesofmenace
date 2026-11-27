// wizcmds.js — wizard-mode commands.
// C ref: wizcmds.c
//
// Ported so far: #levelchange (wiz_level_change(), with exper.c losexp()
// and pluslvl()), ^I (wiz_identify()), #wizintrinsic (wiz_intrinsic())
// and the ^W wish (wiz_wish(), zap.c makewish(), with invent.c
// hold_another_object()).

import { game } from './gstate.js';
import { livelog_printf } from './display.js';
import { LL_CONDUCT, LL_WISH, LL_ARTIFACT } from './const.js';
import { pline } from './display.js';
import { tty_getlin } from './wintty.js';
import { MAXULEV, IRONBARS, ICE, Is_airlevel, Is_waterlevel, ONAME_WISH,
         ONAME_KNOW_ARTI } from './const.js';
import { rn1 } from './rng.js';
import { readobjnam_async, doname, The, aobjnam } from './objnam.js';
import { splitobj } from './mkobj.js';
import { freeinv } from './invent.js';
import { dropx, dropy } from './do.js';
import { hitfloor } from './dothrow.js';
import { can_reach_floor } from './engrave.js';
import { observe_object } from './o_init.js';
import { Blind, Hallucination } from './youprop.js';
import { artifact_origin, touch_artifact } from './artifact.js';
import { place_object, obj_extract_self } from './mkobj.js';
import { addinv } from './u_init.js';
import { prinv } from './invent.js';
import * as O from './objects.js';
import { create_particular } from './read.js';
import { losexp, pluslvl } from './exper.js';
import { near_capacity, inv_cnt } from './hack.js';
import { encumber_msg } from './pickup.js';
import { MOD_ENCUMBER, Upolyd } from './const.js';
import { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ANY, TIMEOUT,
         HALLUC_RES, FIRE_RES, SICK, SLIMED, STONED, BLINDED, DEAF, HALLUC,
         STUNNED, VOMITING, WARN_OF_MON, GLIB, LEVITATION, FLYING,
         PROT_FROM_SHAPE_CHANGERS, WWALKING, SICK_VOMITABLE, SICK_NONVOMITABLE,
         KILLED_BY } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { rn2 } from './rng.js';
import { tty_create_nhwindow, tty_start_menu, tty_add_menu, tty_end_menu,
         tty_select_menu, tty_destroy_nhwindow, add_menu_str } from './wintty.js';
import { property_by_index } from './timeout.js';
import { make_blinded, make_deaf, make_hallucinated, make_sick, make_slimed,
         make_stoned, make_stunned, make_vomiting, make_glib,
         incr_itimeout } from './potion.js';
import { float_vs_flight, polyself } from './polyself.js';
import { pooleffects } from './hack.js';
import { docrt } from './display.js';
import { display_inventory } from './invent.js';
import { cmd_from_func } from './cmd.js';
import { uhis } from './mhitu.js';
import { CONFUSION, POLY_CONTROLLED } from './const.js';
import { map_trap, map_engraving } from './display.js';
import { do_mapping, findit } from './detect.js';
import { print_dungeon } from './dungeon.js';
import { setuqwep } from './wield.js';

// C ref: wizcmds.c wiz_level_change() -- #levelchange
export async function wiz_level_change() {
    const u = game.u;
    let newlevel = 0;
    let ret;

    let buf = await tty_getlin("To what experience level do you want to be set?");
    buf = buf.replace(/[ \t]+/g, ' ').trim(); /* mungspaces() */
    if (buf[0] === '\x1b' || buf === '')
        ret = 0;
    else {
        /* sscanf(buf, "%d%c", &newlevel, &dummy) */
        const m = /^([+-]?\d+)(.?)/.exec(buf);
        ret = m ? (m[2] ? 2 : 1) : 0;
        if (m) newlevel = parseInt(m[1], 10);
    }

    if (ret !== 1) {
        await pline("Never mind.");
        return 0; /* ECMD_OK */
    }
    if (newlevel === u.ulevel) {
        await pline("You are already that experienced."); /* You() */
    } else if (newlevel < u.ulevel) {
        if (u.ulevel === 1) {
            await pline("You are already as inexperienced as you can get.");
            return 0;
        }
        if (newlevel < 1)
            newlevel = 1;
        while (u.ulevel > newlevel)
            await losexp("#levelchange");
    } else {
        if (u.ulevel >= MAXULEV) {
            await pline("You are already as experienced as you can get.");
            return 0;
        }
        if (newlevel > MAXULEV)
            newlevel = MAXULEV;
        while (u.ulevel < newlevel)
            await pluslvl(false);
    }
    /* blessed full healing or restore ability won't fix any lost levels */
    u.ulevelmax = u.ulevel;
    return 0; /* ECMD_OK */
}

const MAXWISHTRY = 5;
const thats_enough_tries = "That's enough tries!";

// C ref: invent.c hold_another_object()
export async function hold_another_object(obj, drop_fmt, drop_arg, hold_msg) {
    if (!Blind())
        observe_object(obj, Hallucination()); /* maximize mergeability */
    if (obj.oartifact) {
        /* place_object may change these */
        const crysknife = (obj.otyp === O.CRYSKNIFE);
        const oerode = obj.oerodeproof;
        const wasUpolyd = Upolyd();

        /* in case touching this object turns out to be fatal */
        place_object(obj, game.u.ux, game.u.uy);

        if (!(await touch_artifact(obj, game.youmonst))) {
            obj_extract_self(obj); /* remove it from the floor */
            await dropy(obj);      /* now put it back again :-) */
            return obj;
        } else if (wasUpolyd && !Upolyd()) {
            /* lose your grip if you revert your form */
            if (drop_fmt)
                await pline(drop_fmt.replace('%s', drop_arg ?? ''));
            obj_extract_self(obj);
            await dropy(obj);
            return obj;
        }
        obj_extract_self(obj);
        if (crysknife) {
            obj.otyp = O.CRYSKNIFE;
            obj.oerodeproof = oerode;
        }
    }
    if (game.u.Fumbling)
        throw new Error('hold_another_object(): Fumbling is not ported yet');
    if (obj.otyp === O.CORPSE && obj.wishedfor)
        throw new Error('hold_another_object(): wished-for corpse is not ported yet');
    const oquan = obj.quan;
    let prev_encumbr = near_capacity(); /* before addinv() */

    /* encumbrance limit is max( current_state, pickup_burden );
       this used to use hardcoded MOD_ENCUMBER (stressed) instead
       of the 'pickup_burden' option (which defaults to stressed) */
    const pickup_burden = game.flags.pickup_burden ?? MOD_ENCUMBER;
    if (prev_encumbr < pickup_burden)
        prev_encumbr = pickup_burden;
    obj = await addinv(obj); /* addinv_core0(obj, NULL, FALSE) */
    if (inv_cnt(false) > 52 /* invlet_basic */
        || ((obj.otyp !== O.LOADSTONE || !obj.cursed)
            && near_capacity() > prev_encumbr)) {
        /* undo any merge which took place */
        if (obj.quan > oquan)
            obj = splitobj(obj, oquan);
        /* drop_it: */
        if (drop_fmt)
            await pline(drop_fmt.replace('%s', drop_arg ?? ''));
        obj.nomerge = 0;
        if (can_reach_floor(true) || game.u.uswallow) {
            await dropx(obj);
        } else {
            freeinv(obj);
            await hitfloor(obj, false);
        }
        return null; /* might be gone */
    }
    if (game.flags.autoquiver && !game.uquiver && !obj.owornmask
        && (O.is_missile(obj) || O.ammo_and_launcher(obj, game.uwep)
            || O.ammo_and_launcher(obj, game.uswapwep)))
        setuqwep(obj);
    if (hold_msg || drop_fmt)
        await prinv(hold_msg, obj, oquan);
    /* obj made it into inventory and is staying there */
    /* update_inventory(): no perm_invent */
    await encumber_msg();
    void drop_arg;
    return obj;
}

// C ref: zap.c makewish()
export async function makewish() {
    const g = game;
    const u = g.u;
    let buf;
    let tries = 0;
    let otmp;
    const nothing = {}; /* only its address matters */
    const oldwisharti = u.uconduct.wisharti || 0;
    let bufcpy = '';
    let maybe_LL_arti;

    g.context.resume_wish = 0;
    if (g.flags.verbose)
        await pline("You may wish for an object."); /* You() */
    for (;;) { /* retry: */
        let promptbuf = "For what do you wish";
        if (g.iflags.cmdassist !== false && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += "?";

        /* iflags.menu_requested && wish_history[0]: wish_history_menu()
           -- not ported yet */
        buf = await tty_getlin(promptbuf);

        buf = buf.replace(/[ \t]+/g, ' ').trim(); /* mungspaces() */
        if (buf[0] === '\x1b') {
            buf = '';
        } else if (buf.toLowerCase() === "help") {
            throw new Error('wishcmdassist() is not ported yet');
        }
        bufcpy = buf;
        otmp = await readobjnam_async(buf, nothing);
        if (!otmp) {
            await pline("Nothing fitting that description exists in the game.");
            if (++tries < MAXWISHTRY)
                continue;
            await pline(thats_enough_tries);
            otmp = await readobjnam_async(null, null);
            if (!otmp)
                return; /* for safety; should never happen */
        } else if (otmp === nothing) {
            /* explicitly wished for "nothing", presumably attempting
               to retain wishless conduct */
            livelog_printf(LL_WISH, "declined to make a wish");
            return;
        } else if (otmp === 'hands_obj') {
            /* wish_history_add(bufcpy) -- not ported yet */
            return;
        }
        /* wish_history_add(bufcpy) -- not ported yet */
        break;
    }

    if (otmp.oartifact) {
        /* update artifact bookkeeping; doesn't produce a livelog event */
        artifact_origin(otmp, ONAME_WISH | ONAME_KNOW_ARTI);
    }

    /* wisharti conduct handled in readobjnam() */
    maybe_LL_arti = ((oldwisharti < u.uconduct.wisharti) ? LL_ARTIFACT : 0);
    const wish = `"${bufcpy}", got "${doname(otmp)}"`.slice(0, 256 - 1); /* BUFSZ */
    /* KMH, conduct */
    if (!u.uconduct.wishes++)
        livelog_printf((LL_CONDUCT | LL_WISH | maybe_LL_arti),
                       `made ${uhis()} first wish - ${wish}`);
    else if (!oldwisharti && u.uconduct.wisharti)
        livelog_printf((LL_CONDUCT | LL_WISH | LL_ARTIFACT),
                       `made ${uhis()} first artifact wish - ${wish}`);
    else
        livelog_printf((LL_WISH | maybe_LL_arti), `wished for ${wish}`);
    /* TODO? maybe generate a second event describing what was received since
       these just echo player's request rather than show actual result */

    if (otmp.otyp === O.CORPSE)
        throw new Error('makewish(): corpse wishes (u_safe_from_fatal_corpse) are not ported yet');

    const verb = ((Is_airlevel(u.uz) || u.uinwater)
                  ? "slip"
                  : (otmp.otyp === O.CORPSE && otmp.wishedfor)
                    ? "materialize" : "drop");
    const typ = g.level.at(u.ux, u.uy).typ;
    const oops_msg = (u.uswallow
                      ? "Oops!  %s out of your reach!"
                      : (Is_airlevel(u.uz) || Is_waterlevel(u.uz)
                         || typ < IRONBARS || typ >= ICE)
                        ? "Oops!  %s away from you!"
                        : !(otmp.otyp === O.CORPSE && otmp.wishedfor)
                          ? "Oops!  %s to the floor!"
                          : "Careful! %s on the floor!");

    /* The(aobjnam()) is safe since otmp is unidentified -dlc */
    await hold_another_object(otmp, oops_msg, The(aobjnam(otmp, verb)), null);
    u.ublesscnt += rn1(100, 50); /* the gods take notice */
    void oldwisharti;
}

// C ref: wizcmds.c wiz_wish() -- ^W
/* Unlimited wishes for debug mode by Paul Polderman */
// C ref: wizcmds.c wiz_genesis() -- #wizgenesis - generate monster(s); a
// count prefix will be honored
export async function wiz_genesis() {
    if (game.flags?.debug) {
        const mongen_saved = game.iflags.debug_mongen;

        game.iflags.debug_mongen = false;
        game.makemon_want_msg = true; /* see makemon()'s Norep() comment */
        try {
            await create_particular();
        } finally {
            game.makemon_want_msg = false;
        }
        game.iflags.debug_mongen = mongen_saved;
    } else
        throw new Error('wiz_genesis(): unavailcmd message not ported yet');
    return 0; /* ECMD_OK */
}

export async function wiz_wish() {
    const g = game;
    if (g.flags.debug) {
        const save_verbose = g.flags.verbose;

        g.flags.verbose = false;
        await makewish();
        g.flags.verbose = save_verbose;
        await encumber_msg();
    } else
        await pline("Unavailable command 'wizwish'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}

// C ref: wizcmds.c wiz_identify() -- ^I, #wizidentify
export async function wiz_identify() {
    const g = game;
    if (g.flags?.debug) {
        g.iflags.override_ID = cmd_from_func("wiz_identify");
        /* command remapping might leave #wizidentify as the only way
           to invoke us, in which case cmd_from_func() will yield NUL;
           it won't matter to display_inventory()/display_pickinv()
           if ^I invokes some other command--what matters is that
           display_pickinv() and xname() see override_ID as nonzero */
        if (!g.iflags.override_ID)
            g.iflags.override_ID = 0x09; /* C('I') */
        await display_inventory(null, false);
        g.iflags.override_ID = 0;
    } else
        await pline("Unavailable command 'wizidentify'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}

/* C ref: wizcmds.c DEFAULT_TIMEOUT_INCR */
const DEFAULT_TIMEOUT_INCR = 30;

// C ref: wizcmds.c wiz_intrinsic() -- #wizintrinsic
export async function wiz_intrinsic() {
    const g = game, u = g.u;
    if (g.flags?.debug) {
        const wizintrinsic = "#wizintrinsic";
        const fmt = (still, what) => `You are${still} ${what}.`;
        let buf;
        let i, j, n, amt, typ;
        const p = { v: 0 };
        let oldtimeout, newtimeout;
        let propname;
        const clr = NO_COLOR;
        const intrinsic = (prop) => (u.uprops[prop]?.intrinsic || 0);

        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        if (g.iflags.cmdassist) {
            /* start menu with a subtitle */
            buf = `[Precede any selection with a count to increment by other than ${DEFAULT_TIMEOUT_INCR}.]`;
            add_menu_str(win, buf);
        }
        for (i = 0; (propname = property_by_index(i, p)) != null; ++i) {
            if (p.v === HALLUC_RES) {
                /* Grayswandir vs hallucination; ought to be redone to
                   use u.uprops[HALLUC].blocked instead of being treated
                   as a separate property; letting in be manually toggled
                   even only in wizard mode would be asking for trouble... */
                continue;
            }
            if (p.v === FIRE_RES) {
                /* FIRE_RES and properties beyond it (in the propertynames[]
                   ordering, not their numerical PROP values), can only be
                   set to timed values here so show a separator */
                add_menu_str(win, "--");
            }
            /* any.a_int = i + 1: +1 avoids 0 */
            oldtimeout = intrinsic(p.v) & TIMEOUT;
            if (oldtimeout)
                buf = `${propname.padEnd(27)} [${oldtimeout}]`;
            else
                buf = propname;
            tty_add_menu(win, null, i + 1, 0, 0, ATR_NONE, clr, buf,
                         MENU_ITEMFLAGS_NONE);
        }
        tty_end_menu(win, "Which intrinsics?");
        const res = await tty_select_menu(win, PICK_ANY);
        n = res.n;
        await tty_destroy_nhwindow(win);

        for (j = 0; j < n; ++j) {
            i = res.selected[j].item - 1; /* -1: reverse +1 above */
            propname = property_by_index(i, p);
            oldtimeout = intrinsic(p.v) & TIMEOUT;
            amt = (res.selected[j].count === -1) ? DEFAULT_TIMEOUT_INCR
                                                 : res.selected[j].count;
            if (amt <= 0) /* paranoia */
                continue;
            newtimeout = oldtimeout + amt;

            switch (p.v) {
            case SICK:
            case SLIMED:
            case STONED:
                if (oldtimeout > 0 && newtimeout > oldtimeout)
                    newtimeout = oldtimeout;
                break;
            }

            let def_feedback = false;
            switch (p.v) {
            case BLINDED:
                await make_blinded(newtimeout, true);
                break;
            case DEAF:
                await make_deaf(newtimeout, true);
                break;
            case HALLUC:
                await make_hallucinated(newtimeout, true, 0);
                break;
            case SICK:
                typ = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
                await make_sick(newtimeout, wizintrinsic, true, typ);
                break;
            case SLIMED:
                buf = fmt(!intrinsic(SLIMED) ? "" : " still", "turning into slime");
                await make_slimed(newtimeout, buf);
                break;
            case STONED:
                buf = fmt(!intrinsic(STONED) ? "" : " still", "turning into stone");
                await make_stoned(newtimeout, buf, KILLED_BY, wizintrinsic);
                break;
            case STUNNED:
                await make_stunned(newtimeout, true);
                break;
            case VOMITING:
                buf = fmt(!intrinsic(VOMITING) ? "" : " still", "vomiting");
                await make_vomiting(newtimeout, false);
                await pline(buf);
                break;
            case WARN_OF_MON:
                /* if (!Warn_of_mon): context.warntype.species = PM_GRID_BUG */
                throw new Error('wiz_intrinsic(): warn_of_mon species not ported yet');
            case GLIB:
                /* slippery fingers might need a persistent inventory update
                   so needs more than simple incr_itimeout() but we want
                   the pline() issued with that */
                make_glib(newtimeout);
                def_feedback = true; /* FALLTHRU */
                break;
            default:
                def_feedback = true;
                break;
            }
            if (def_feedback) { /* def_feedback: */
                if (p.v !== GLIB)
                    incr_itimeout(p.v, amt);
                g.disp_botl = true; /* have pline() do a status update */
                await pline(`Timeout for ${propname} ${oldtimeout ? "increased by" : "set to"} ${amt}.`);
            }
            /* this has to be after incr_itimeout() */
            if (p.v === LEVITATION || p.v === FLYING)
                float_vs_flight();
            else if (p.v === PROT_FROM_SHAPE_CHANGERS)
                throw new Error('wiz_intrinsic(): rescham() not ported yet');
            if (p.v === WWALKING || p.v === LEVITATION || p.v === FLYING) {
                if (u.uinwater)
                    await pooleffects(false);
            }
        }
        await docrt();
    } else
        await pline("Unavailable command 'wizintrinsic'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}

// C ref: wizcmds.c wiz_where() -- #wizwhere, ^O in wizard mode
export async function wiz_where() {
    if (game.flags?.debug)
        await print_dungeon(false);
    else
        await pline("Unavailable command 'wizwhere'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}

// C ref: wizcmds.c wiz_map() -- #wizmap, ^F
/* the #wizmap command - reveal the level map
   and any traps or engravings on it */
export async function wiz_map() {
    const g = game;
    if (g.flags?.debug) {
        const up = g.u.uprops;
        const save_Hconf = up[CONFUSION].intrinsic,
              save_Hhallu = up[HALLUC].intrinsic;

        /* notice_mon_off(): a11y mon_notices isn't ported (off by default) */
        up[CONFUSION].intrinsic = up[HALLUC].intrinsic = 0;
        for (const t of g.level.traps || []) { /* gf.ftrap */
            t.tseen = 1;
            map_trap(t, true);
        }
        for (let ep = g.level.head_engr || null; ep; ep = ep.nxt_engr) {
            map_engraving(ep, true);
        }
        await do_mapping();
        /* notice_mon_on() */
        up[CONFUSION].intrinsic = save_Hconf;
        up[HALLUC].intrinsic = save_Hhallu;
    } else
        await pline("Unavailable command 'wizmap'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}

// C ref: wizcmds.c wiz_polyself()
/* #polyself command - change hero's form */
export async function wiz_polyself() {
    await polyself(POLY_CONTROLLED);
    return 0; /* ECMD_OK */
}

// C ref: wizcmds.c wiz_detect() -- #wizdetect, ^E
/* the #wizdetect command - detect secret doors, traps, hidden monsters */
export async function wiz_detect() {
    if (game.flags?.debug)
        await findit();
    else
        await pline("Unavailable command 'wizdetect'."); /* unavailcmd */
    return 0; /* ECMD_OK */
}
