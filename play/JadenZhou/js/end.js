// end.js -- the end of the game: dying, quitting, the tombstone and the
// final score.
// C ref: end.c done_in_by(), fixup_death(), should_query_disclose_option(),
// disclose(), savelife(), done_object_cleanup(), artifact_score(), done(),
// really_done(), container_contents(); vault.c findgd(), paygd();
// priest.c clearpriests(); files.c clearlocks()
//
// DUMPLOG isn't defined in this build, so the dumplog calls are no-ops;
// HANGUPHANDLING's done_hup never happens in a recorded session.

import { game } from './gstate.js';
import { pline, You, Your, bot, Hallucination, canspotmon, Blind } from './display.js';
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
} from './const.js';
import { mons, PM_HIGH_CLERIC, PM_GHOST, PM_WRAITH, PM_VAMPIRE, PM_GHOUL,
         PM_HUMAN, PM_GREEN_SLIME, PM_TOURIST, S_WRAITH, S_MUMMY, S_VAMPIRE,
         G_UNIQ, G_NOCORPSE, M2_PNAME } from './monsters.js';
import { AMULET_OF_LIFE_SAVING, LARGE_BOX, STATUE, TIN,
         FAKE_AMULET_OF_YENDOR } from './objects.js';
import { pmname, Mgender, m_monnam } from './do_name.js';
import { shkname, shkname_is_pname } from './shknam.js';
import { an } from './objnam.js';
import { zombie_maker, mongone } from './mon.js';
import { night, midnight, getnow } from './calendar.js';
import { record_achievement } from './do.js';
import { can_make_bones, savebones } from './bones.js';
import { paybill, finish_paybill } from './shk.js';
import { discover_object } from './o_init.js';
import { Is_container } from './mkobj.js';
import { deepest_lev_reached, depth, dunlev, on_level } from './dungeon.js';
import { money_cnt } from './u_init.js';
import { hidden_gold, currency, enlightenment, list_vanquished,
         list_genocided, count_achievements } from './insight.js';
import { keepdogs } from './dog.js';
import { Goodbye } from './role.js';
import { inven_inuse } from './restore.js';
import { useup, display_inventory, carrying } from './invent.js';
import { adjattrib, ACURR, minuhpmax, setuhpmax } from './attrib.js';
import { init_uhunger } from './eat.js';
import { paranoid_query } from './cmd.js';
import { delete_levelfile } from './files.js';
import { maxledgerno } from './dungeon.js';
import { formatkiller, killer, topten } from './topten.js';
import { genl_outrip } from './rip.js';
import { nh_terminate } from './save.js';
import {
    tty_display_nhwindow, tty_destroy_nhwindow, tty_create_nhwindow,
    tty_putstr, tty_exit_nhwindows, tty_raw_print, tty_yn_function,
    tty_destroy_mapwindow, tty_destroy_statuswindow,
} from './wintty.js';

const EXIT_SUCCESS = 0;

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
/* C ref: you.h Race_if(), Role_if() */
function Race_if(pm) { return game.urace.mnum === pm; }
function Role_if(pm) { return game.urole.mnum === pm; }
/* C ref: youprop.h Lifesaved */
function Lifesaved() { return !!game.u.uprops[LIFESAVED]?.extrinsic; }
/* C ref: obj.h SchroedingersBox() */
function SchroedingersBox(o) { return o.otyp === LARGE_BOX && o.spe === 1; }
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
        throw new Error('done_in_by(): an imitating killer not ported yet');
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

    /* might need to fix up multi_reason if 'mtmp' caused the reason;
       gm.multireasonbuf ('m_id:reason') isn't filled by the JS port */
    if (g.multi_reason && g.multireasonbuf)
        throw new Error('done_in_by(): multireasonbuf fixup not ported yet');

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
            throw new Error('disclose(): show_conduct() not ported yet');
        if (c === 'q')
            inc_done_stopprint();
    }

    if (!done_stopprint()) {
        [ask, defquery] = should_query_disclose_option('o');
        c = ask ? await tty_yn_function("Do you want to see the dungeon overview?",
                                        "ynq", defquery)
                : defquery;
        if (c === 'y')
            throw new Error('disclose(): show_overview() not ported yet');
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
        init_uhunger();
    }
    /* cure impending doom of sickness hero won't have time to fix
       [shouldn't this also be applied to other fatal timeouts?] */
    if (((u.uprops[SICK]?.intrinsic || 0) & TIMEOUT) === 1)
        throw new Error('savelife(): make_sick() not ported yet');
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
        throw new Error('savelife(): reset_utrap() of lava not ported yet');
    g.disp_botl = true;
    u.ugrave_arise = NON_PM;
    if (u.uprops[UNCHANGING])
        u.uprops[UNCHANGING].intrinsic = 0; /* HUnchanging = 0L */
    /* curs_on_u() */
    if (!g.context.mon_moving)
        endmultishot(false);
    if (u.uswallow) {
        throw new Error('savelife(): expels() not ported yet');
    } else if (u.ustuck) {
        throw new Error('savelife(): unstuck() not ported yet');
    }
}

// C ref: dothrow.c endmultishot()
/* interrupt multishot (the 'verbose' message isn't needed here) */
function endmultishot(verbose) {
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
    void ox; void oy;
    /* put thrown or kicked object on map (for bones) */
    if ((g.thrownobj && (!g.thrownobj.where || g.thrownobj.where === 'OBJ_FREE'))
        || (g.kickedobj && (!g.kickedobj.where || g.kickedobj.where === 'OBJ_FREE')))
        throw new Error('done_object_cleanup(): placing a thrown/kicked object not ported yet');
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
function artifact_score(list, counting, endwin) {
    void list; void counting; void endwin;
    throw new Error('artifact_score(): not ported yet');
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
            /* formatkiller(); livelog_printf(LL_LIFESAVE, "averted death
               (%s)", killbuf): livelog isn't kept */
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
        if (mtmp.isgd && on_level(mtmp.mextra.egd.gdlevel, game.u.uz))
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
        if (mtmp.ispriest && !on_level(mtmp.mextra.epri.shrlevel, game.u.uz))
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
                    throw new Error('really_done(): observe_quantum_cat() not ported yet');
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
        && !(mons[u.umonnum].geno & G_NOCORPSE)) {
        throw new Error('really_done(): mk_named_object() of the corpse and make_grave() not ported yet');
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
        void artifact_score;
        throw new Error('really_done(): escaped/ascended score not ported yet');
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
export async function container_contents(list, identified, all_containers,
                                         reportempty) {
    void identified; void reportempty;
    for (let box = list; box; box = box.nobj) {
        if (Is_container(box) || box.otyp === STATUE)
            throw new Error('container_contents(): not ported yet');
        if (!all_containers)
            break;
    }
}
