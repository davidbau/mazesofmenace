// end.js -- the end of the game: dying, quitting, the tombstone and the
// final score.
// C ref: end.c done_in_by(), fixup_death(), should_query_disclose_option(),
// disclose(), savelife(), done_object_cleanup(), artifact_score(), done(),
// really_done(), container_contents(); vault.c findgd(), paygd();
// priest.c clearpriests(); files.c clearlocks()
//
// DUMPLOG isn't defined in this build, so the dumplog calls are no-ops;
// HANGUPHANDLING's done_hup never happens in a recorded session.

import { make_sick } from './potion.js';
import { SICK_ALL, UTOTYPE_ATSTAIRS } from './const.js';
import { reset_utrap } from './trap.js';
import { schedule_goto } from './do.js';
import { observe_quantum_cat } from './pickup.js';
import { game } from './gstate.js';
import { livelog_printf } from './display.js';
import { LL_LIFESAVE } from './const.js';
import { pline, You, Your, bot, canspotmon } from './display.js';
import { accessible } from './makemon.js';
import {
    DIED, CHOKING, STARVING, BURNING, DISSOLVED, STONING, TURNED_SLIME,
    GENOCIDED, PANICKED, TRICKED, QUIT, ESCAPED, ASCENDED, KILLED_BY_AN,
    KILLED_BY, NO_KILLER_PREFIX, NON_PM, LEAVESTATUE, LIFESAVED, A_CON,
    ACH_BLND, ACH_NUDE, ACH_UWIN, NHW_TEXT, WIN_ERR, PARANOID_DIE,
    PARANOID_BONES, BASICENLIGHTENMENT, MAGICENLIGHTENMENT, ENL_GAMEOVERDEAD,
    has_mgivenname, MGIVENNAME, has_ebones, ismnum, Upolyd, isok, G_GENOD,
    DISCLOSE_YES_WITHOUT_PROMPT, DISCLOSE_SPECIAL_WITHOUT_PROMPT,
    DISCLOSE_NO_WITHOUT_PROMPT, DISCLOSE_PROMPT_DEFAULT_YES,
    DISCLOSE_PROMPT_DEFAULT_SPECIAL, In_quest, In_endgame, Is_astralevel,
    Is_knox_level, LOW_PM, M_AP_MONSTER, SICK, TIMEOUT, UNCHANGING, TT_LAVA,
    IS_GRAVE, PARANOID_QUIT,
} from './const.js';
import { nomul } from './hack.js';
import { mons, PM_HIGH_CLERIC, PM_GHOST, PM_WRAITH, PM_VAMPIRE, PM_GHOUL,
         PM_HUMAN, PM_GREEN_SLIME, PM_TOURIST, S_WRAITH, S_MUMMY, S_VAMPIRE,
         G_UNIQ, G_NOCORPSE, M2_PNAME } from './monsters.js';
import { AMULET_OF_LIFE_SAVING, LARGE_BOX, STATUE, TIN, CORPSE,
         FAKE_AMULET_OF_YENDOR } from './objects.js';
import { pmname, Mgender, m_monnam } from './do_name.js';
import { shkname, shkname_is_pname } from './shknam.js';
import { an, the_unique_pm } from './objnam.js';
import { is_vampshifter } from './mondata.js';
import { strstri } from './hacklib.js';
import { zombie_maker, mongone } from './mon.js';
import { night, midnight, getnow } from './calendar.js';
import { record_achievement } from './do.js';
import { can_make_bones, savebones } from './bones.js';
import { paybill, finish_paybill } from './shk.js';
import { discover_object } from './o_init.js';
import { sortloot } from './pickup.js';
import { the, thesimpleoname } from './iactions.js';
import { xname, doname_with_price } from './objnam.js';
import { NHW_MENU, SORTLOOT_LOOT, SORTLOOT_PACK } from './const.js';
import { BAG_OF_TRICKS } from './objects.js';
import { Is_container, place_object, mk_named_object } from './mkobj.js';
import { make_grave } from './engrave.js';
import { deepest_lev_reached, depth, dunlev, on_level } from './dungeon.js';
import { money_cnt } from './u_init.js';
import { hidden_gold, currency, enlightenment, list_vanquished,
         list_genocided, count_achievements,
         show_conduct } from './insight.js';
import { keepdogs } from './dog.js';
import { Goodbye } from './role.js';
import { inven_inuse } from './restore.js';
import { useup, display_inventory, carrying, stackobj } from './invent.js';
import { adjattrib, ACURR, minuhpmax, setuhpmax } from './attrib.js';
import { init_uhunger } from './eat.js';
import { paranoid_query } from './cmd.js';
import { delete_levelfile } from './files.js';
import { maxledgerno, show_overview } from './dungeon.js';
import { formatkiller, killer, topten } from './topten.js';
import { genl_outrip } from './rip.js';
import { nh_terminate } from './save.js';
import {
    tty_display_nhwindow, tty_destroy_nhwindow, tty_create_nhwindow,
    tty_putstr, tty_exit_nhwindows, tty_raw_print, tty_yn_function,
    tty_destroy_mapwindow, tty_destroy_statuswindow, tty_clear_nhwindow,
} from './wintty.js';
import { Blind, Hallucination, Lifesaved } from './youprop.js';
import { Race_if, Role_if } from './const.js';
import * as O_EN from './objects.js';
import { arti_cost as arti_cost_en, artiname as artiname_en } from './artifact.js';
import { the_unique_obj as the_unique_obj_en } from './objnam.js';
import { mon_nam as mon_nam_en } from './do_name.js';
import { adj_lev as adj_lev_en } from './makemon.js';
import { mons as mons_en, PM_HOUSECAT as PM_HOUSECAT_EN } from './monsters.js';
import { d as d_en } from './rng.js';
import { mksobj as mksobj_en } from './mkobj.js';
import { obfree as obfree_en } from './invent.js';
import { expels, unstuck } from './mhitu.js';
import { sticks as sticks_end } from './engrave.js';
import { Monnam as Monnam_end } from './do_name.js';
import { flush_screen as flush_screen_end } from './display.js';

const EXIT_SUCCESS = 0;
const BUFSZ = 256;

/*
 * The order of these needs to match the macros in hack.h.
 */
const deaths = [
    /* the array of death */
    "died", "choked", "poisoned", "starvation", "drowning", "burning",
    "dissolving under the heat and pressure", "crushed", "turned to stone",
    "turned into slime", "genocided", "panic", "trickery", "quit",
    "escaped", "ascended"
];

const ends = [
    /* "when you %s" */
    "died", "choked", "were poisoned",
    "starved", "drowned", "burned",
    "dissolved in the lava",
    "were crushed", "turned to stone",
    "turned into slime", "were genocided",
    "panicked", "were tricked", "quit",
    "escaped", "ascended"
];

/* C ref: decl.c disclosure_options[] */
const disclosure_options = "iavgco";

/* static boolean Schroedingers_cat */
function Schroedingers_cat() { return !!game.Schroedingers_cat; }

/* #define done_stopprint program_state.stopprint */
function done_stopprint() { return game.program_state.stopprint || 0; }
function inc_done_stopprint() {
    game.program_state.stopprint = (game.program_state.stopprint || 0) + 1;
}

/* C ref: mondata.h type_is_pname() */
function type_is_pname(ptr) { return (ptr.mflags2 & M2_PNAME) !== 0; }
/* C ref: obj.h SchroedingersBox() */
function SchroedingersBox(o) { return o.otyp === LARGE_BOX && o.spe === 1; }
/* C ref: hacklib.c upstart() */
function upstart(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
/* C ref: hack.h makeknown() */
function makeknown(x) { discover_object(x, true, false, true); }
/* C ref: integer.h nowrap_add() */
function nowrap_add(a, b) {
    return (a <= Number.MAX_SAFE_INTEGER - b) ? a + b : Number.MAX_SAFE_INTEGER;
}
/* C ref: hacklib.c plur() */
function plur(x) { return (x === 1) ? "" : "s"; }
/* C ref: dungeon.c single_level_branch() */
function single_level_branch(lev) { return Is_knox_level(lev); }
/* C ref: invent.c set_cknown_lknown() */
function set_cknown_lknown(obj) {
    if (Is_container(obj) || obj.otyp === STATUE)
        obj.cknown = obj.lknown = 1;
    else if (obj.otyp === TIN)
        obj.cknown = 1;
}
/* C ref: wintty.c tty_wait_synch() -- the map window is up and no raw
   output is pending, so this only flushes the (unbuffered) screen */
function wait_synch() {
    if (game.ttyDisplay?.rawprint)
        throw new Error('wait_synch(): getret() not ported yet');
}

// C ref: end.c done_in_by()
export async function done_in_by(mtmp, how) {
    const g = game;
    const u = g.u;
    let buf = '';
    let mptr = mtmp.data;
    const champtr = ismnum(mtmp.cham) ? mons[mtmp.cham] : mptr;
    const distorted = !!(Hallucination() && canspotmon(mtmp)),
          mimicker = (mtmp.m_ap_type === M_AP_MONSTER),
          imitator = (mptr !== champtr || mimicker);

    await You((how === STONING) ? "turn to stone..." : "die...");
    /* mark_synch(): flush buffered screen output */
    killer().format = KILLED_BY_AN;
    /* "killed by the high priest of Crom" is okay,
       "killed by the high priest" alone isn't */
    if ((mptr.geno & G_UNIQ) !== 0 && !(imitator && !mimicker)
        && !(mptr === mons[PM_HIGH_CLERIC] && !mtmp.ispriest)) {
        if (!type_is_pname(mptr))
            buf += "the ";
        killer().format = KILLED_BY;
    }
    /* _the_ <invisible> <distorted> ghost of Dudley */
    if (mptr === mons[PM_GHOST] && has_mgivenname(mtmp)) {
        buf += "the ";
        killer().format = KILLED_BY;
    }
    buf += ''; /* monhealthdescr(mtmp, TRUE, eos(buf)): disabled in C */
    if (mtmp.minvis)
        buf += "invisible ";
    if (distorted)
        buf += "hallucinogen-distorted ";

    if (imitator) {
        let shape;
        const realnm = pmname(champtr, Mgender(mtmp));
        let fakenm = pmname(mptr, Mgender(mtmp));
        const alt = is_vampshifter(mtmp);

        if (mimicker) {
            /* realnm is already correct because champtr==mptr;
               set up fake mptr for type_is_pname/the_unique_pm */
            mptr = mons[mtmp.mappearance];
            fakenm = pmname(mptr, Mgender(mtmp));
        } else if (alt && strstri(realnm, "vampire") >= 0
                   && fakenm === "vampire bat") {
            /* special case: use "vampire in bat form" in preference
               to redundant looking "vampire in vampire bat form" */
            fakenm = "bat";
        }
        /* for the alternate format, always suppress any article;
           pname and the_unique should also have s_suffix() applied,
           but vampires don't take on any shapes which warrant that */
        if (alt || type_is_pname(mptr)) /* no article */
            shape = fakenm;
        else if (the_unique_pm(mptr)) /* "the"; don't use the() here */
            shape = `the ${fakenm}`;
        else /* "a"/"an" */
            shape = an(fakenm);
        /* omit "called" to avoid excessive verbosity */
        buf += alt ? `${realnm} in ${shape} form`
                   : mimicker ? `${realnm} disguised as ${shape}`
                              : `${realnm} imitating ${shape}`;
        mptr = mtmp.data; /* reset for mimicker case */
    } else if (mptr === mons[PM_GHOST]) {
        buf += "ghost";
        if (has_mgivenname(mtmp))
            buf += ` of ${MGIVENNAME(mtmp)}`;
    } else if (mtmp.isshk) {
        const shknm = shkname(mtmp),
              honorific = shkname_is_pname(mtmp) ? ""
                              : mtmp.female ? "Ms. " : "Mr. ";

        buf += `${honorific}${shknm}, the shopkeeper`;
        killer().format = KILLED_BY;
    } else if (mtmp.ispriest || mtmp.isminion) {
        /* m_monnam() suppresses "the" prefix plus "invisible", and
           it overrides the effect of Hallucination on priestname() */
        buf += m_monnam(mtmp);
    } else {
        buf += pmname(mptr, Mgender(mtmp));
        if (has_mgivenname(mtmp)) {
            buf += ` ${has_ebones(mtmp) ? "of" : "called"} ${MGIVENNAME(mtmp)}`;
        }
    }

    killer().name = buf;

    /* might need to fix up multi_reason if 'mtmp' caused the reason */
    /* [C tests that the multi_reason pointer lies inside multireasonbuf,
       past its "m_id:" prefix; JS strings compare that text instead] */
    if (g.multi_reason && g.multireasonbuf
        && g.multireasonbuf.indexOf(':') >= 0
        && g.multi_reason === g.multireasonbuf.slice(
               g.multireasonbuf.indexOf(':') + 1)) {
        /*
         * multireasonbuf[] contains 'm_id:reason' and multi_reason
         * points at the text past the colon, so we have something
         * like "42:paralyzed by a ghoul"; if mtmp->m_id matches 42
         * then we truncate 'reason' at its first space so that final
         * death reason becomes "Killed by a ghoul, while paralyzed."
         * instead of "Killed by a ghoul, while paralyzed by a ghoul."
         */
        const m = /^\s*(\d+):[\s\S]/.exec(g.multireasonbuf); /* sscanf "%u:%c" */
        if (m && mtmp.m_id === Number(m[1])) {
            const sp = g.multireasonbuf.indexOf(' ');
            if (sp >= 0) {
                g.multireasonbuf = g.multireasonbuf.slice(0, sp);
                g.multi_reason = g.multireasonbuf.slice(
                    g.multireasonbuf.indexOf(':') + 1);
            }
        }
    }

    /*
     * Chicken and egg issue:
     *  Ordinarily Unchanging ought to override something like this,
     *  but the transformation occurs at death.  With the current code,
     *  the effectiveness of Unchanging stops first, but a case could
     *  be made that it should last long enough to prevent undead
     *  transformation.  (Turning to slime isn't an issue here because
     *  Unchanging prevents that from happening.)
     */
    if (mptr.mlet === S_WRAITH)
        u.ugrave_arise = PM_WRAITH;
    else if (mptr.mlet === S_MUMMY && g.urace.mummynum !== NON_PM)
        u.ugrave_arise = g.urace.mummynum;
    else if (zombie_maker(mtmp) && g.urace.zombienum !== NON_PM)
        u.ugrave_arise = g.urace.zombienum;
    else if (mptr.mlet === S_VAMPIRE && Race_if(PM_HUMAN))
        u.ugrave_arise = PM_VAMPIRE;
    else if (mptr === mons[PM_GHOUL])
        u.ugrave_arise = PM_GHOUL;
    /* this could happen if a high-end vampire kills the hero
       when ordinary vampires are genocided; ditto for wraiths */
    if (u.ugrave_arise >= LOW_PM
        && (g.mvitals[u.ugrave_arise].mvflags & G_GENOD))
        u.ugrave_arise = NON_PM;

    await done(how);
}

/* some special cases for overriding while-helpless reason */
const death_fixups = [
    /* "petrified by <foo>, while getting stoned" -- "while getting stoned"
       prevented any last-second recovery, but it was not the cause of
       "petrified by <foo>" */
    { why: STONING, unmulti: 1, exclude: "getting stoned", include: null },
    /* "died of starvation, while fainted from lack of food" is accurate
       but sounds a fairly silly (and doesn't actually appear unless you
       splice together death and while-helpless from xlogfile) */
    { why: STARVING, unmulti: 0, exclude: "fainted from lack of food", include: "fainted" },
];

// C ref: end.c fixup_death()
/* clear away while-helpless when the cause of death caused that
   helplessness (ie, "petrified by <foo> while getting stoned") */
function fixup_death(how) {
    const g = game;

    if (g.multi_reason) {
        for (const f of death_fixups)
            if (f.why === how && f.exclude === g.multi_reason) {
                if (f.include) /* substitute alternate reason */
                    g.multi_reason = f.include;
                else /* remove the helplessness reason */
                    g.multi_reason = null;
                g.multireasonbuf = ''; /* dynamic buf stale either way */
                if (f.unmulti) /* possibly hide helplessness */
                    g.multi = 0;
                break;
            }
    }
}

// C ref: end.c should_query_disclose_option() -- returns [ask, defquery]
function should_query_disclose_option(category) {
    const idx = disclosure_options.indexOf(category);

    if (idx >= 0) {
        const disclose = game.flags.end_disclose[idx];
        if (disclose === DISCLOSE_YES_WITHOUT_PROMPT)
            return [false, 'y'];
        else if (disclose === DISCLOSE_SPECIAL_WITHOUT_PROMPT)
            return [false, 'a'];
        else if (disclose === DISCLOSE_NO_WITHOUT_PROMPT)
            return [false, 'n'];
        else if (disclose === DISCLOSE_PROMPT_DEFAULT_YES)
            return [true, 'y'];
        else if (disclose === DISCLOSE_PROMPT_DEFAULT_SPECIAL)
            return [true, 'a'];
        else
            return [true, 'n'];
    }
    /* impossible("should_query_disclose_option: bad category %c") */
    return [true, 'n'];
}

// C ref: end.c disclose()
async function disclose(how, taken) {
    const g = game;
    let c = '\0', defquery, qbuf, ask = false;

    if (g.invent && !done_stopprint()) {
        if (taken)
            qbuf = `Do you want to see what you had when you ${
                    (how === QUIT) ? "quit" : "died"}?`;
        else
            qbuf = "Do you want your possessions identified?";

        [ask, defquery] = should_query_disclose_option('i');
        c = ask ? await tty_yn_function(qbuf, "ynq", defquery) : defquery;
        if (c === 'y') {
            /* caller has already ID'd everything; we pass 'want_reply=True'
               to force display_pickinv() to avoid using WIN_INVENT */
            g.iflags.force_invmenu = false;
            await display_inventory(null, true);
            await container_contents(g.invent, true, true, false);
        }
        if (c === 'q')
            inc_done_stopprint();
    }

    if (!done_stopprint()) {
        [ask, defquery] = should_query_disclose_option('a');
        c = ask ? await tty_yn_function("Do you want to see your attributes?",
                                        "ynq", defquery)
                : defquery;
        if (c === 'y')
            await enlightenment((BASICENLIGHTENMENT | MAGICENLIGHTENMENT),
                                (how >= PANICKED) ? 1 /* ENL_GAMEOVERALIVE */
                                                  : ENL_GAMEOVERDEAD);
        if (c === 'q')
            inc_done_stopprint();
    }

    if (!done_stopprint()) {
        [ask, defquery] = should_query_disclose_option('v');
        await list_vanquished(defquery, ask);
    }

    if (!done_stopprint()) {
        [ask, defquery] = should_query_disclose_option('g');
        await list_genocided(defquery, ask);
    }

    if (!done_stopprint()) {
        [ask, defquery] = should_query_disclose_option('c');
        if (ask) {
            const acnt = count_achievements();

            qbuf = `Do you want to see your conduct${
                    (acnt > 0) ? " and achievements" : ""}?`;
            c = await tty_yn_function(qbuf, "ynq", defquery);
        } else {
            c = defquery;
        }
        if (c === 'y')
            await show_conduct((how >= PANICKED) ? 1 : 2);
        if (c === 'q')
            inc_done_stopprint();
    }

    if (!done_stopprint()) {
        [ask, defquery] = should_query_disclose_option('o');
        c = ask ? await tty_yn_function("Do you want to see the dungeon overview?",
                                        "ynq", defquery)
                : defquery;
        if (c === 'y')
            await show_overview((how >= PANICKED) ? 1 : 2, how);
        if (c === 'q')
            inc_done_stopprint();
    }
}

// C ref: end.c savelife()
/* try to get the player back in a viable state after being killed */
async function savelife(how) {
    const g = game;
    const u = g.u;
    let uhpmin;
    const givehp = 50 + 10 * Math.trunc(ACURR(A_CON) / 2);

    /* life-drain/level-loss to experience level 0 kills without actually
       reducing ulevel below 1, but include this for bulletproofing */
    if (u.ulevel < 1)
        u.ulevel = 1;
    uhpmin = minuhpmax(10);
    if (u.uhpmax < uhpmin)
        setuhpmax(uhpmin, true);
    u.uhp = Math.min(u.uhpmax, givehp);
    if (Upolyd()) /* Unchanging, or death which bypasses losing hit points */
        u.mh = Math.min(u.mhmax, givehp);
    if (u.uhunger < 500 || how === CHOKING) {
        await init_uhunger();
    }
    /* cure impending doom of sickness hero won't have time to fix
       [shouldn't this also be applied to other fatal timeouts?] */
    if (((u.uprops[SICK]?.intrinsic || 0) & TIMEOUT) === 1)
        await make_sick(0, null, false, SICK_ALL);
    g.nomovemsg = "You survived that attempt on your life.";
    g.context.move = 0;

    g.multi = -1; /* can't move again during the current turn */
    /* in case being life-saved is immediately followed by being killed
       again (perhaps due to zap rebound); this text will be appended to
          "killed by <something>, while "
       in high scores entry, if any, and in logfile (but not on tombstone) */
    g.multi_reason = Role_if(PM_TOURIST) ? "being toyed with by Fate"
                                         : "attempting to cheat Death";

    if (u.utrap && u.utraptype === TT_LAVA)
        await reset_utrap(false);
    g.disp_botl = true;
    u.ugrave_arise = NON_PM;
    if (u.uprops[UNCHANGING])
        u.uprops[UNCHANGING].intrinsic = 0; /* HUnchanging = 0L */
    await flush_screen_end(1); /* curs_on_u() */
    if (!g.context.mon_moving)
        endmultishot(false);
    if (u.uswallow) {
        /* might drop hero onto a trap that kills her all over again */
        await expels(u.ustuck, u.ustuck.data, true);
    } else if (u.ustuck) {
        if (Upolyd() && sticks_end(game.youmonst.data))
            await You(`release ${mon_nam_en(u.ustuck)}.`);
        else
            await pline(`${Monnam_end(u.ustuck)} releases you.`);
        await unstuck(u.ustuck);
    }
}

// C ref: dothrow.c endmultishot()
/* interrupt multishot (the 'verbose' message isn't needed here) */
export function endmultishot(verbose) {
    const m_shot = game.m_shot;

    if (m_shot && m_shot.i < m_shot.n) {
        if (verbose && !game.context.mon_moving)
            throw new Error('endmultishot(): verbose message not ported yet');
        /* get rid of any pending multishot */
        m_shot.n = m_shot.i = 0;
        m_shot.o = 0; /* STRANGE_OBJECT */
        m_shot.s = false;
    }
}

// C ref: end.c done_object_cleanup()
/* deal with some objects which may be in an abnormal state at end of game */
export async function done_object_cleanup() {
    const g = game;
    const u = g.u;
    let ox, oy;

    /* might have been killed while using a disposable item, so make sure
       it's gone prior to inventory disclosure and creation of bones */
    await inven_inuse(true);
    /*
     * Hero can die when throwing an object (by hitting an adjacent
     * gas spore, for instance, or being hit by mis-returning Mjollnir),
     * or while in transit (from falling down stairs).  If that happens,
     * some object(s) might be in limbo rather than on the map or in
     * any inventory.
     */
    ox = u.ux + (u.dx || 0), oy = u.uy + (u.dy || 0);
    if (!isok(ox, oy) || !accessible(ox, oy))
        ox = u.ux, oy = u.uy;
    /* put thrown or kicked object on map (for bones); location might
       be incorrect (perhaps killed by divine lightning when throwing at
       a temple priest?) but this should be better than just vanishing
       (fragile stuff should be taken care of before getting here) */
    if (g.thrownobj && (!g.thrownobj.where || g.thrownobj.where === 'OBJ_FREE')) {
        place_object(g.thrownobj, ox, oy);
        stackobj(g.thrownobj), g.thrownobj = null;
    }
    if (g.kickedobj && (!g.kickedobj.where || g.kickedobj.where === 'OBJ_FREE')) {
        place_object(g.kickedobj, ox, oy);
        stackobj(g.kickedobj), g.kickedobj = null;
    }
    /* if Punished hero dies during level change or dies or quits while
       swallowed, uball and uchain will be in limbo; put them on floor
       so bones will have them and object list cleanup finds them */
    if (g.uchain && (!g.uchain.where || g.uchain.where === 'OBJ_FREE'))
        throw new Error('done_object_cleanup(): lift_covet_and_placebc() not ported yet');
    /* persistent inventory window now obsolete since disclosure uses
       a normal popup one; avoids "Bad fruit #n" when saving bones */
    if (g.iflags.perm_invent) {
        g.iflags.perm_invent = false;
        /* perm_invent_toggled(TRUE): the JS tty has no persistent
           inventory window */
    }
}

// C ref: end.c artifact_score()
/* called twice; first to calculate total, then to list relevant items */
async function artifact_score(list, counting, endwin) {
    const u = game.u;
    let pbuf;
    let otmp;
    let value, points;

    for (otmp = list; otmp; otmp = otmp.nobj) {
        if (otmp.oartifact || otmp.otyp === O_EN.BELL_OF_OPENING
            || otmp.otyp === O_EN.SPE_BOOK_OF_THE_DEAD
            || otmp.otyp === O_EN.CANDELABRUM_OF_INVOCATION) {
            value = arti_cost_en(otmp); /* zorkmid value */
            points = Math.trunc(value * 5 / 2);  /* score value */
            if (counting) {
                u.urexp = nowrap_add(u.urexp, points);
            } else {
                discover_object(otmp.otyp, true, true, false);
                /* not observe_object; dead characters don't observe */
                otmp.known = otmp.dknown = otmp.bknown = otmp.rknown = 1;
                /* assumes artifacts don't have quan > 1 */
                pbuf = `${the_unique_obj_en(otmp) ? "The " : ""}${
                        otmp.oartifact ? artiname_en(otmp.oartifact)
                                       : O_EN.OBJ_NAME(O_EN.objects[otmp.otyp])} (worth ${
                        value} ${currency(value)} and ${points} points)`;
                await tty_putstr(endwin, 0, pbuf);
            }
        }
        if (otmp.cobj) /* Has_contents(otmp) */
            await artifact_score(otmp.cobj, counting, endwin);
    }
}

// C ref: end.c get_valuables()
/* gv.valuables[]: [0] gems (the glass gems share the last slot),
   [1] amulets */
function get_valuables(list, valuables) /* inventory or container contents */ {
    let obj;
    let i;

    /* find amulets and gems, ignoring all artifacts */
    for (obj = list; obj; obj = obj.nobj)
        if (obj.cobj) { /* Has_contents(obj) */
            get_valuables(obj.cobj, valuables);
        } else if (obj.oartifact) {
            continue;
        } else if (obj.oclass === O_EN.AMULET_CLASS) {
            const amulets = valuables[1];
            i = obj.otyp - O_EN.FIRST_AMULET;
            if (!amulets[i].count) {
                amulets[i].count = obj.quan;
                amulets[i].typ = obj.otyp;
            } else
                amulets[i].count += obj.quan; /* always adds one */
        } else if (obj.oclass === O_EN.GEM_CLASS && obj.otyp <= O_EN.LAST_GLASS_GEM) {
            const gems = valuables[0];
            /* last+1: combine all glass gems into one slot */
            i = Math.min(obj.otyp, O_EN.LAST_REAL_GEM + 1) - O_EN.FIRST_REAL_GEM;
            if (!gems[i].count) {
                gems[i].count = obj.quan;
                gems[i].typ = obj.otyp;
            } else
                gems[i].count += obj.quan;
        }
    return;
}

// C ref: end.c sort_valuables()
/*
 *  Sort collected valuables, most frequent to least.  We could just
 *  as easily use qsort, but we don't care about efficiency here.
 */
function sort_valuables(list, size) /* max value is less than 20 */ {
    let i, j;
    let ltmp;

    /* move greater quantities to the front of the list */
    for (i = 1; i < size; i++) {
        if (list[i].count === 0)
            continue;   /* empty slot */
        ltmp = list[i]; /* structure copy */
        for (j = i; j > 0; --j) {
            if (list[j - 1].count >= ltmp.count)
                break;
            list[j] = list[j - 1];
        }
        list[j] = ltmp;
    }
    return;
}

// C ref: end.c done2()
/* "#quit" command or keyboard interrupt */
export async function done2() {
    const g = game;
    const u = g.u;
    let abandon_tutorial = false;

    if (u.uz.dnum === g.dungeon_topology?.d_tutorial_dnum /* In_tutorial() */
        && await tty_yn_function("Switch from the tutorial back to regular play?",
                                 "yn", 'n') === 'y') /* y_n() */
        abandon_tutorial = true;

    if (abandon_tutorial || !(await paranoid_query(
            (g.flags.paranoia_bits & PARANOID_QUIT) !== 0, /* ParanoidQuit */
            "Really quit without saving?"))) {
        /* (void) signal(SIGINT, (SIG_RET_TYPE) done1); */
        tty_clear_nhwindow(g.WIN_MESSAGE);
        /* curs_on_u(): the cursor goes back to the hero at the next
           input wait */
        wait_synch();
        if (g.multi > 0)
            nomul(0);
        if (g.multi === 0) {
            u.uinvulnerable = 0; /* avoid ctrl-C bug -dlc */
            u.usleep = 0;
        }

        if (abandon_tutorial)
            schedule_goto(u.ucamefrom, UTOTYPE_ATSTAIRS,
                          "Resuming regular play.", null);
        return 0; /* ECMD_OK */
    }

    if (g.flags.debug) { /* wizard (UNIX) */
        const c = await tty_yn_function("Dump core?", "ynq", 'q'); /* ynq() */

        if (c === 'y') {
            throw new Error('done2(): NH_abort() not ported yet');
        } else if (c === 'q')
            inc_done_stopprint(); /* done_stopprint++ */
    }
    await done(QUIT);
    return 0; /* ECMD_OK */
}

// C ref: end.c done()
/* Be careful not to call panic from here! */
export async function done(how) {
    const g = game;
    const u = g.u;
    const wizard = !!g.flags.debug, discover = !!g.flags.explore;
    let survive = false;

    if (how === TRICKED) {
        if (killer().name) {
            /* paniclog("trickery", svk.killer.name); */
            killer().name = '';
        }
        if (wizard) {
            /* Suppress message for deterministic replay. */
            /* You("are a very tricky wizard, it seems."); */
            killer().format = KILLED_BY_AN; /* reset to 0 */
            return;
        }
    }
    if (g.program_state.panicking
        || (how === QUIT && done_stopprint())) {
        /* skip status update if panicking or disconnected
           or answer of 'q' to "Really quit?" */
        g.disp_botl = g.disp_botlx = g.disp_time_botl = false;
    } else {
        /* otherwise force full status update */
        g.disp_botlx = true;
        bot();
    }

    /* hero_seq is (moves<<3 + n) where n is number of moves made
       by the hero on the current turn (since the 'moves' variable
       actually counts turns); its details shouldn't matter here;
       used by fuzzer_savelife() and for hangup below */
    if ((g.done_seq || 0) < g.hero_seq)
        g.done_seq = g.hero_seq;

    if (g.iflags.debug_fuzzer)
        throw new Error('done(): fuzzer_savelife() not ported yet');

    if (how === ASCENDED || (!killer().name && how === GENOCIDED))
        killer().format = NO_KILLER_PREFIX;
    /* Avoid killed by "a" burning or "a" starvation */
    if (!killer().name && (how === STARVING || how === BURNING))
        killer().format = KILLED_BY;
    if (!killer().name || how >= PANICKED)
        killer().name = deaths[how];

    if (how < PANICKED) {
        u.umortality = (u.umortality || 0) + 1;
        /* in case caller hasn't already done this */
        if (u.uhp !== 0 || (Upolyd() && u.mh !== 0)) {
            /* force HP to zero in case it is still positive (some
               deaths aren't triggered by loss of hit points), or
               negative (-1 is used as a flag in some circumstances
               which don't apply when actually dying due to HP loss) */
            u.uhp = u.mh = 0;
            g.disp_botl = true;
        }
    }
    if (Lifesaved() && (how <= GENOCIDED)) {
        await pline("But wait...");
        /* assumes that only one type of item confers LifeSaved property */
        makeknown(AMULET_OF_LIFE_SAVING);
        await Your(`medallion ${!Blind() ? "begins to glow" : "feels warm"}!`);
        if (how === CHOKING)
            await You("vomit ...");
        await pline("You feel much better!"); /* You_feel() */
        await pline("The medallion crumbles to dust!"); /* pline_The() */
        if (g.uamul)
            await useup(g.uamul);

        await adjattrib(A_CON, -1, true);
        await savelife(how);
        if (how === GENOCIDED) {
            await pline("Unfortunately you are still genocided...");
        } else {
            const killbuf = formatkiller(256 /* BUFSZ */, how, false);
            livelog_printf(LL_LIFESAVE, `averted death (${killbuf})`);
            survive = true;
        }
    }
    /* explore and wizard modes offer player the option to keep playing */
    if (!survive && (wizard || discover) && how <= GENOCIDED
        && !(await paranoid_query((g.flags.paranoia_bits & PARANOID_DIE) !== 0,
                                  "Die?"))) {
        await pline(`OK, so you don't ${(how === CHOKING) ? "choke" : "die"}.`);
        g.iflags.last_msg = 'PLNMSG_OK_DONT_DIE';
        await savelife(how);
        survive = true;
    }

    if (survive) {
        killer().name = '';
        killer().format = KILLED_BY_AN; /* reset to 0 */
        return;
    }
    await really_done(how);
    /*NOTREACHED*/
}

// C ref: vault.c findgd()
function findgd() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER */
            continue;
        if (mtmp.isgd && on_level(mtmp.egd.gdlevel, game.u.uz))
            return mtmp;
    }
    return null;
}

// C ref: vault.c paygd()
async function paygd(silently) {
    const grd = findgd();
    const umoney = money_cnt(game.invent);

    void silently;
    if (!umoney || !grd)
        return;
    throw new Error('paygd(): a vault guard taking the gold not ported yet');
}

// C ref: priest.c clearpriests()
function clearpriests() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp < 1) /* DEADMONSTER */
            continue;
        if (mtmp.ispriest && !on_level(mtmp.epri.shrlevel, game.u.uz))
            mongone(mtmp);
    }
}

// C ref: files.c clearlocks()
function clearlocks() {
    /* can't access maxledgerno() before dungeons are created -dlc */
    for (let x = (game.n_dgns || game.dungeons?.length ? maxledgerno() : 0); x >= 0; x--)
        delete_levelfile(x); /* not all levels need be present */
}

// C ref: end.c really_done()
/* separated from done() in order to specify the __noreturn__ attribute */
async function really_done(how) {
    const g = game;
    const u = g.u;
    const flags = g.flags;
    const wizard = !!flags.debug;
    let taken;
    let pbuf;
    let endwin = WIN_ERR;
    let bones_ok;
    let have_windows = g.iflags.window_inited !== false;
    let corpse = null;
    let endtime;
    let umoney;
    let tmp;

    /*
     *  The game is now over...
     */
    g.program_state.gameover = 1;
    /* in case of a subsequent panic(), there's no point trying to save */
    g.program_state.something_worth_saving = 0;
    /* render vision subsystem inoperative */
    g.iflags.vision_inited = false;

    /* maybe use up active invent item(s), place thrown/kicked missile,
       deal with ball and chain possibly being temporarily off the map */
    if (!g.program_state.panicking)
        await done_object_cleanup();
    /* in case we're panicking; normally cleared by done_object_cleanup() */
    g.iflags.perm_invent = false;

    /* remember time of death here instead of having bones, rip, and
       topten figure it out separately and possibly getting different
       time or even day if player is slow responding to --More-- */
    g.urealtime.finish_time = endtime = getnow();
    /* urealtime.realtime += timet_delta(endtime, urealtime.start_timing):
       the recorder's clock doesn't run */
    /* collect these for end of game disclosure (not used during play) */
    g.iflags.at_night = night();
    g.iflags.at_midnight = midnight();

    /* final achievement tracking; only show blind and nudist if some
       tangible progress has been made; always show ascension last */
    if ((u.uachieved && u.uachieved.length) || !flags.beginner) {
        if (u.uroleplay.blind)
            record_achievement(ACH_BLND); /* blind the whole game */
        if (u.uroleplay.nudist)
            record_achievement(ACH_NUDE); /* never wore armor */
    }
    if (how === ASCENDED)
        record_achievement(ACH_UWIN);

    /* dump_open_log(endtime): no DUMPLOG */
    /* Sometimes you die on the first move.  Life's not fair.
     * On those rare occasions you get hosed immediately, go out
     * smiling... :-)  -3.
     */
    if (g.moves <= 1 && how < PANICKED && !done_stopprint())
        await pline(`Do not pass Go.  Do not collect 200 ${currency(200)}.`);

    if (have_windows)
        wait_synch(); /* flush screen output */
    /* signal(SIGINT, done_intr) &c */

    bones_ok = (how < GENOCIDED) && can_make_bones();

    if (bones_ok && g.launchplace?.obj)
        throw new Error('really_done(): force_launch_placement() not ported yet');

    /* maintain ugrave_arise even for !bones_ok */
    if (how === PANICKED)
        u.ugrave_arise = (NON_PM - 3); /* no corpse, no grave */
    else if (how === BURNING || how === DISSOLVED) /* corpse burns up too */
        u.ugrave_arise = (NON_PM - 2); /* leave no corpse */
    else if (how === STONING)
        u.ugrave_arise = LEAVESTATUE; /* statue instead of corpse */
    else if (how === TURNED_SLIME
             /* it's possible to turn into slime even though green slimes
                have been genocided:  genocide could occur after hero is
                already infected or hero could eat a glob of one created
                before genocide; don't try to arise as one if they're gone */
             && !(g.mvitals[PM_GREEN_SLIME].mvflags & G_GENOD))
        u.ugrave_arise = PM_GREEN_SLIME;

    if (how === QUIT) {
        killer().format = NO_KILLER_PREFIX;
        if (u.uhp < 1) {
            how = DIED;
            u.umortality++; /* skipped above when how==QUIT */
            killer().name = "quit while already on Charon's boat";
        }
    }
    if (how === ESCAPED || how === PANICKED)
        killer().format = NO_KILLER_PREFIX;

    fixup_death(how); /* actually, fixup gm.multi_reason */

    if (how !== PANICKED) {
        const silently = done_stopprint() ? true : false;

        /* these affect score and/or bones, but avoid them during panic */
        taken = await paybill((how === ESCAPED) ? -1 : (how !== QUIT) ? 1 : 0, silently);
        await paygd(silently);
        clearpriests();
    } else
        taken = false; /* lint; assert( !bones_ok ); */

    clearlocks();

    if (have_windows)
        await tty_display_nhwindow(g.WIN_MESSAGE, false);

    if (how !== PANICKED) {
        let obj, nextobj;

        /*
         * This is needed for both inventory disclosure and dumplog.
         * Both are optional, so do it once here instead of duplicating
         * it in both of those places.
         */
        for (obj = g.invent; obj; obj = nextobj) {
            nextobj = obj.nobj;
            discover_object(obj.otyp, true, true, false);
            /* observe_object not necessary after discover_object */
            obj.known = obj.bknown = obj.dknown = obj.rknown = 1;
            set_cknown_lknown(obj); /* set flags when applicable */
            /* we resolve Schroedinger's cat now in case of both
               disclosure and dumplog, where the 50:50 chance for
               live cat has to be the same both times */
            if (SchroedingersBox(obj)) {
                if (!Schroedingers_cat()) {
                    /* tell observe_quantum_cat() not to create a cat; if it
                       chooses live cat in this situation, it will leave the
                       SchroedingersBox flag set (for container_contents()) */
                    await observe_quantum_cat(obj, false, false);
                    if (SchroedingersBox(obj))
                        g.Schroedingers_cat = true;
                } else
                    obj.spe = 0; /* ordinary box with cat corpse in it */
            }
        }

        if (flags.end_disclose.join('') !== "none")
            await disclose(how, taken);

        /* formatkiller(); livelog_printf(LL_DUMP, ...): livelog isn't
           kept; dump_everything(how, endtime): no DUMPLOG */
    }

    /* if pets will contribute to score, populate gm.mydogs list now
       (bones creation isn't a factor, but pline() messaging is; used to
       be done even sooner, but we need it to come after dump_everything()
       so that any accompanying pets are still on the map during dump) */
    if (how === ESCAPED || how === ASCENDED)
        await keepdogs(true);

    /* finish_paybill should be called after disclosure but before bones */
    if (bones_ok && taken)
        await finish_paybill();

    /* grave creation should be after disclosure so it doesn't have
       this grave in the current level's features for #overview */
    if (bones_ok && u.ugrave_arise === NON_PM
        && !(g.mvitals[u.umonnum].mvflags & G_NOCORPSE)) {
        /* Base corpse on race when not poly'd since original u.umonnum
           is based on role, and all role monsters are human. */
        const mnum = !Upolyd() ? g.urace.mnum : u.umonnum,
              was_already_grave = IS_GRAVE(g.level.at(u.ux, u.uy).typ);

        corpse = mk_named_object(CORPSE, mons[mnum], u.ux, u.uy, g.plname);
        pbuf = `${g.plname}, `;
        pbuf += formatkiller(BUFSZ - pbuf.length, how, true);
        make_grave(u.ux, u.uy, pbuf);
        if (IS_GRAVE(g.level.at(u.ux, u.uy).typ) && !was_already_grave)
            g.level.at(u.ux, u.uy).emptygrave = 1; /* corpse isn't buried */
    }
    pbuf = ''; /* clear grave text; also lint suppression */

    /* calculate score, before creating bones [container gold] */
    {
        const deepest = deepest_lev_reached(false);

        umoney = money_cnt(g.invent);
        tmp = u.umoney0 || 0;
        umoney += hidden_gold(true); /* accumulate gold from containers */
        tmp = umoney - tmp;          /* net gain */

        if (tmp < 0)
            tmp = 0;
        if (how < PANICKED)
            tmp -= Math.trunc(tmp / 10);
        tmp += 50 * (deepest - 1);
        if (deepest > 20)
            tmp += 1000 * ((deepest > 30) ? 10 : deepest - 20);
        u.urexp = nowrap_add(u.urexp, tmp);

        /* ascension gives a score bonus iff offering to original deity */
        if (how === ASCENDED && u.ualign.type === u.ualignbase[1 /* A_ORIGINAL */]) {
            /* retaining original alignment: score *= 2;
               converting, then using helm-of-OA to switch back: *= 1.5 */
            tmp = (u.ualignbase[0 /* A_CURRENT */] === u.ualignbase[1 /* A_ORIGINAL */])
                      ? u.urexp
                      : Math.trunc(u.urexp / 2);
            u.urexp = nowrap_add(u.urexp, tmp);
        }
    }

    if (ismnum(u.ugrave_arise) && !done_stopprint()) {
        /* give this feedback even if bones aren't going to be created,
           so that its presence or absence doesn't tip off the player to
           new bones or their lack; it might be a lie if makemon fails */
        await Your(`${(u.ugrave_arise !== PM_GREEN_SLIME)
                      ? "body rises from the dead"
                      : "revenant persists"} as ${
                   an(pmname(mons[u.ugrave_arise], flags.female ? 1 : 0))}...`);
        await tty_display_nhwindow(g.WIN_MESSAGE, false);
    }

    if (bones_ok) {
        if (!wizard || await paranoid_query((flags.paranoia_bits & PARANOID_BONES) !== 0,
                                            "Save bones?"))
            await savebones(how, endtime, corpse);
        /* corpse may be invalid pointer now so
            ensure that it isn't used again */
        corpse = null;
    }

    /* update gold for the rip output, which can't use hidden_gold()
       (containers will be gone by then if bones just got saved...) */
    g.done_money = umoney;

    /* clean up unneeded windows */
    if (have_windows) {
        wait_synch();
        /* free_pickinv_cache(); WIN_INVEN: the JS tty has no persistent
           inventory window */
        await tty_display_nhwindow(g.WIN_MESSAGE, true);
        tty_destroy_mapwindow();     /* destroy_nhwindow(WIN_MAP) */
        tty_destroy_statuswindow();  /* destroy_nhwindow(WIN_STATUS) */
        await tty_destroy_nhwindow(g.WIN_MESSAGE);
        g.WIN_MESSAGE = WIN_ERR;

        if (!done_stopprint() || flags.tombstone)
            endwin = tty_create_nhwindow(NHW_TEXT);

        if (how < GENOCIDED && flags.tombstone && endwin !== WIN_ERR)
            await genl_outrip(endwin, how, endtime); /* outrip() */
    } else
        g.program_state.stopprint = 1; /* just avoid any more output */

    if (u.uhave?.amulet) {
        killer().name += " (with the Amulet)";
    } else if (how === ESCAPED) {
        if (Is_astralevel(u.uz)) /* offered Amulet to wrong deity */
            killer().name += " (in celestial disgrace)";
        else if (carrying(FAKE_AMULET_OF_YENDOR))
            killer().name += " (with a fake Amulet)";
        /* don't bother counting to see whether it should be plural */
    }

    pbuf = `${Goodbye()} ${g.plname} the ${(how !== ASCENDED)
            ? ((flags.female && g.urole.name.f) ? g.urole.name.f : g.urole.name.m)
            : (flags.female ? "Demigoddess" : "Demigod")}...`;
    await dump_forward_putstr(endwin, 0, pbuf, done_stopprint());
    await dump_forward_putstr(endwin, 0, "", done_stopprint());

    if (how === ESCAPED || how === ASCENDED) {
        let mtmp;
        let otmp;
        let i;
        /* gv.valuables[]: the counts start out zeroed */
        const mkval = (n) => Array.from({ length: n }, () => ({ count: 0, typ: 0 }));
        const valuables = [
            mkval(O_EN.LAST_REAL_GEM + 1 - O_EN.FIRST_REAL_GEM + 1), /* gems */
            mkval(O_EN.LAST_AMULET + 1 - O_EN.FIRST_AMULET), /* amulets */
        ];

        get_valuables(g.invent, valuables);

        /* add points for collected valuables */
        for (const val of valuables)
            for (i = 0; i < val.length; i++)
                if (val[i].count !== 0) {
                    tmp = val[i].count * O_EN.objects[val[i].typ].oc_cost;
                    u.urexp = nowrap_add(u.urexp, tmp);
                }

        /* count the points for artifacts */
        await artifact_score(g.invent, true, endwin);

        /* gv.viz_array[0][0] |= IN_SIGHT: need visibility for naming */
        if (g.viz_array?.[0])
            g.viz_array[0][0] |= 0x2; /* IN_SIGHT */
        mtmp = g.mydogs;
        pbuf = "You";
        if (mtmp || Schroedingers_cat()) {
            while (mtmp) {
                pbuf += ` and ${mon_nam_en(mtmp)}`;
                if (mtmp.mtame)
                    u.urexp = nowrap_add(u.urexp, mtmp.mhp);
                mtmp = mtmp.nmon;
            }
            /* [it might be more robust to create a housecat and add it to
               gm.mydogs; it doesn't have to be placed on the map for that] */
            if (Schroedingers_cat()) {
                const m_lev = adj_lev_en(mons_en[PM_HOUSECAT_EN]);
                const mhp = d_en(m_lev, 8);
                u.urexp = nowrap_add(u.urexp, mhp);
                pbuf += " and Schroedinger's cat";
            }
            await dump_forward_putstr(endwin, 0, pbuf, done_stopprint());
            pbuf = '';
        } else {
            pbuf += " ";
        }
        pbuf += `${(how === ASCENDED) ? "went to your reward"
                                      : "escaped from the dungeon"} with ${
                u.urexp} point${plur(u.urexp)},`;
        await dump_forward_putstr(endwin, 0, pbuf, done_stopprint());

        if (!done_stopprint())
            await artifact_score(g.invent, false, endwin); /* list artifacts */

        /* list valuables here */
        for (const val of valuables) {
            sort_valuables(val, val.length);
            for (i = 0; i < val.length && !done_stopprint(); i++) {
                const typ = val[i].typ;
                const count = val[i].count;

                if (count === 0)
                    continue;
                if (O_EN.objects[typ].oc_class !== O_EN.GEM_CLASS
                    || typ <= O_EN.LAST_REAL_GEM) {
                    otmp = mksobj_en(typ, false, false);
                    discover_object(otmp.otyp, true, true, false);
                    otmp.dknown = 1; /* seen it (blindness fix) */
                    /* observe_object not necessary after discover_object */
                    otmp.known = 1;  /* for fake amulets */
                    if (otmp.oextra?.oname) /* has_oname(otmp) */
                        otmp.oextra.oname = null; /* free_oname(otmp) */
                    otmp.quan = count;
                    pbuf = `${String(count).padStart(8)} ${xname(otmp)} (worth ${
                            count * O_EN.objects[typ].oc_cost} ${currency(2)}),`;
                    obfree_en(otmp, null);
                } else {
                    pbuf = `${String(count).padStart(8)} worthless piece${
                            plur(count)} of colored glass,`;
                }
                await dump_forward_putstr(endwin, 0, pbuf, 0);
            }
        }

    } else {
        /* did not escape or ascend */
        if (u.uz.dnum === 0 && u.uz.dlevel <= 0) {
            /* level teleported out of the dungeon; `how' is DIED,
               due to falling or to "arriving at heaven prematurely" */
            pbuf = `You ${(u.uz.dlevel < 0) ? "passed away" : ends[how]
                    } beyond the confines of the dungeon`;
        } else {
            /* more conventional demise */
            let where = g.dungeons[u.uz.dnum].dname;

            if (Is_astralevel(u.uz))
                where = "The Astral Plane";
            pbuf = `You ${ends[how]} in ${where}`;
            if (!In_endgame(u.uz) && !single_level_branch(u.uz))
                pbuf += ` on dungeon level ${In_quest(u.uz) ? dunlev(u.uz) : depth(u.uz)}`;
        }

        pbuf += ` with ${u.urexp} point${plur(u.urexp)},`;
        await dump_forward_putstr(endwin, 0, pbuf, done_stopprint());
    }

    pbuf = `and ${umoney} piece${plur(umoney)} of gold, after ${g.moves} move${plur(g.moves)}.`;
    await dump_forward_putstr(endwin, 0, pbuf, done_stopprint());
    pbuf = `You were level ${u.ulevel} with a maximum of ${u.uhpmax} hit point${
            plur(u.uhpmax)} when you ${ends[how]}.`;
    await dump_forward_putstr(endwin, 0, pbuf, done_stopprint());
    await dump_forward_putstr(endwin, 0, "", done_stopprint());
    if (!done_stopprint())
        await tty_display_nhwindow(endwin, true);
    if (endwin !== WIN_ERR)
        await tty_destroy_nhwindow(endwin);

    /* dump_close_log(); soundlib: none */

    /*
     * "So when I die, the first thing I will see in Heaven is a score list?"
     *
     * topten() updates 'logfile' and 'xlogfile', when they're enabled.
     * Then the current game's score is shown in its relative position
     * within high scores, and 'record' is updated if that makes the cut.
     */
    if (have_windows && !g.iflags.toptenwin) {
        tty_exit_nhwindows(null);
        have_windows = false;
    }
    await topten(how, endtime);
    if (have_windows)
        tty_exit_nhwindows(null);

    if (done_stopprint()) {
        tty_raw_print("");
        tty_raw_print("");
    }
    await nh_terminate(EXIT_SUCCESS);
}

// C ref: windows.c dump_forward_putstr() -- no dumplog_file
async function dump_forward_putstr(win, attr, str, no_forward) {
    if (!no_forward)
        await tty_putstr(win, attr, str);
}

// C ref: end.c container_contents()
/* used for disclosure and for the ':' choice when looting a container */
/* 'list' is an object chain: the hero's invent (linked by nobj) or a
   container's cobj array */
export async function container_contents(list, identified, all_containers,
                                         reportempty) {
    let buf;
    let cat;
    const dumping = !!game.iflags?.in_dumplog;
    const boxes = Array.isArray(list) ? list.slice() : [];
    if (!Array.isArray(list))
        for (let o = list; o; o = o.nobj)
            boxes.push(o);

    for (const box of boxes) {
        if (Is_container(box) || box.otyp === STATUE) {
            if (!box.cknown || (identified && !box.lknown)) {
                box.cknown = 1; /* we're looking at the contents now */
                if (identified)
                    box.lknown = 1;
                /* update_inventory(): no perm_invent window */
            }
            if (box.otyp === BAG_OF_TRICKS) {
                continue; /* wrong type of container */
            } else if (box.cobj && box.cobj.length) {
                const tmpwin = tty_create_nhwindow(NHW_MENU);

                /* at this stage, the SchroedingerBox() flag is only set
                   if the cat inside the box is alive; the box actually
                   contains a cat corpse that we'll pretend is not there;
                   for dead cat, the flag will be clear and there'll be
                   a cat corpse inside the box; either way, inventory
                   reports the box as containing "1 item" */
                cat = SchroedingersBox(box);

                buf = `Contents of ${the(xname(box))}:`;
                await tty_putstr(tmpwin, 0, buf);
                if (!dumping)
                    await tty_putstr(tmpwin, 0, "");
                if (box.cobj.length && !cat) {
                    const sortloot_opt = game.flags.sortloot ?? 'l';
                    const sortflags = (((sortloot_opt === 'l'
                                         || sortloot_opt === 'f')
                                        ? SORTLOOT_LOOT : 0)
                                       | ((game.flags.sortpack ?? true)
                                          ? SORTLOOT_PACK : 0));
                    const sortedcobj = sortloot(box.cobj, sortflags, false,
                                                null);
                    for (const srtc of sortedcobj) {
                        const obj = srtc.obj;
                        if (identified) {
                            discover_object(obj.otyp, true, true, false);
                            obj.dknown = 1; /* observe_object unnecessary */
                            obj.known = obj.bknown = obj.rknown = 1;
                            if (Is_container(obj) || obj.otyp === STATUE)
                                obj.cknown = obj.lknown = 1;
                        }
                        await tty_putstr(tmpwin, 0, `  ${doname_with_price(obj)}`);
                    }
                } else if (cat) {
                    await tty_putstr(tmpwin, 0, "  Schroedinger's cat!");
                }
                if (dumping)
                    await tty_putstr(0, 0, "");
                await tty_display_nhwindow(tmpwin, true);
                tty_destroy_nhwindow(tmpwin);
                if (all_containers)
                    await container_contents(box.cobj, identified, true,
                                             reportempty);
            } else if (reportempty) {
                await pline(`${upstart(thesimpleoname(box))} is empty.`);
                await tty_display_nhwindow(game.WIN_MESSAGE, false);
            }
        }
        if (!all_containers)
            break;
    }
}
