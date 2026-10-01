// @ts-nocheck
import { game } from './gstate.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { pline, Norep, newsym, canseemon } from './display.js';
import { cansee, Blind } from './vision.js';
import { exercise, acurr } from './attrib.js';
import { resist, zapyourself, ubuzz, flash_str } from './zap.js';
import { onscary, monflee } from './makemon.js';
import { can_blow, x_monnam, sleep_monst, slept_monst } from './mhitm.js';
import { Monnam } from './mcastu.js';
import { impossible } from './steed.js';
import { discover_object } from './o_init.js';
import { yn_function } from './end.js';
import { getlin } from './wizcmds.js';
import { thesimpleoname, Tobjnam, an } from './objnam.js';
import { yname } from './do_wear.js';
import { dist2 } from './hacklib.js';
import { tamedog } from './dog.js';
import { consume_obj_charge, Yname2, record_achievement } from './cmd.js';
import { find_drawbridge } from './dokick.js';
import {
    ECMD_OK, ECMD_TIME,
    A_DEX, A_WIS,
    STUNNED, CONFUSION, HALLUC, HALLUC_RES, UNCHANGING, DEAF,
    In_endgame, Is_astralevel, In_sokoban, In_V_tower, Is_stronghold,
    IS_DRAWBRIDGE, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DBWALL,
    DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, DB_DIR, W_NONDIGGABLE, isok,
    ACH_TUNE, STRAT_WAITMASK,
} from './const.js';
import { MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js';
import { digactualhole_ } from './dig.js';
import { wakeup_attack, seemimic } from './mhitm.js';
import { m_at } from './uhitm.js';
import { set_levltyp } from './mkmaze.js';
import { M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER,
         STONE, SCORR, CORR, DOOR, SDOOR, D_NODOOR,
         FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, PIT, AM_SANCTUM } from './const.js';
import { altarmask_at } from './cmd.js';
import { getdir } from './lock.js';
import { losehp } from './dokick.js';

/* objects.h tool ids, in table order (js/oc_name_data.js OC_NAME[]). */
const WOODEN_FLUTE = 247, MAGIC_FLUTE = 248, TOOLED_HORN = 249,
      FROST_HORN = 250, FIRE_HORN = 251,
      WOODEN_HARP = 253, MAGIC_HARP = 254,
      BUGLE = 256, LEATHER_DRUM = 257, DRUM_OF_EARTHQUAKE = 258;

/* objclass.h TOOL_CLASS — the oclass resist() scores an instrument's attack
 * level from (zap.c:6113 `case TOOL_CLASS: alev = 10;`). */
const TOOL_CLASS = 6;
/* zap.c resist()'s `tell` argument; hack.h NOTELL == 0. */
const NOTELL = 0;
/* monsym.h monster classes used by the charm/calm filters. */
const S_NYMPH = 14, S_SNAKE = 45;
/* monflag.h M1_MINDLESS. */
const M1_MINDLESS = 0x00100000;
/* monflag.h M2_MERC — is_mercenary(ptr) is (ptr)->mflags2 & M2_MERC. */
const M2_MERC = 0x00200000;
/* mkobj.h G_UNIQ, the geno bit unique_corpstat() tests. */
const G_UNIQ = 0x1000;
/* global.h ROWNO / COLNO, for the earthquake drum's awaken_monsters radius. */
const ROWNO = 21, COLNO = 80;
/* hack.h:1330  #define ynq(query) yn_function(query, ynqchars, 'q', TRUE)
 * decl.c ynqchars[] = "ynq". */
const ynqchars = 'ynq';
/* hack.h ARTICLE_A, for a_monnam(). */
const ARTICLE_A = 1;
/* pm.h PM_GUARD — the vault guard awaken_soldiers() exempts. */
const PM_GUARD = 272;

/* ── C macros this file leans on, spelled once here ─────────────────────── */
/* mondata.h:  #define DEADMONSTER(mon)  ((mon)->mhp < 1) */
function DEADMONSTER(mtmp) { return (mtmp.mhp | 0) < 1; }
/* hack.h:1532 #define mdistu(mon) distu((mon)->mx, (mon)->my), and
 * hack.h      #define distu(x,y)  dist2((x), (y), u.ux, u.uy). */
function mdistu(mtmp) {
    const u = game.u || {};
    return dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
}
/* mondata.h:  #define mindless(ptr) (((ptr)->mflags1 & M1_MINDLESS) != 0) */
function mindless(ptr) { return (((ptr?.mflags1) | 0) & M1_MINDLESS) !== 0; }
/* mondata.h:  #define is_mercenary(ptr) (((ptr)->mflags2 & M2_MERC) != 0) */
function is_mercenary(ptr) { return (((ptr?.mflags2) | 0) & M2_MERC) !== 0; }
/* mondata.h:  #define unique_corpstat(ptr) (((ptr)->geno & G_UNIQ) != 0) */
function unique_corpstat(ptr) { return (((ptr?.geno) | 0) & G_UNIQ) !== 0; }
/* hack.h:1530 #define makeknown(x) discover_object((x), TRUE, TRUE, TRUE) */
function makeknown(otyp) { discover_object(otyp | 0, true, true, true); }
/* objnam.c a_monnam(mtmp) — x_monnam(mtmp, ARTICLE_A, NULL, 0, TRUE). */
function a_monnam(mtmp) { return x_monnam(mtmp, ARTICLE_A, null, 0, true); }
/* hack.h ROLL_FROM(array) — array[rn2(SIZE(array))]. */
function ROLL_FROM(arr) { return arr[rn2(arr.length)]; }

function _prop(idx) { return (game.u && game.u.uprops) ? game.u.uprops[idx] : null; }
function Stunned() { return ((_prop(STUNNED)?.intrinsic) | 0) !== 0; }
function Confusion() { return ((_prop(CONFUSION)?.intrinsic) | 0) !== 0; }
function Hallucination() {
    const hp = _prop(HALLUC), hrp = _prop(HALLUC_RES);
    const res = ((hrp?.intrinsic) | 0) !== 0 || ((hrp?.extrinsic) | 0) !== 0;
    return ((hp?.intrinsic) | 0) !== 0 && !res;
}
/* youprop.h:125  Deaf = (HDeaf || EDeaf || u.uroleplay.deaf).
 * HDeaf is the FLAT u.HDeaf slot in this port, not u.uprops[DEAF].intrinsic:
 * js/allmain.js:1591 nh_timeout_deaf owns the countdown on that slot and
 * js/fastforward.js:1192 (dosounds' Deaf early-out), js/cmd.js:12158,
 * js/monmove.js:2280, js/shk.js:2111 and js/were.js:53 all read it.  Writing
 * the uprops spelling instead would set a word with no live readers — the
 * three-spellings trap: dosounds would keep drawing its rn2(300) after the
 * drum, which is exactly the leaf-27083 divergence this port first produced. */
function Deaf() {
    const u = game.u || {};
    return (u.HDeaf | 0) !== 0 || !!(_prop(DEAF)?.extrinsic | 0)
        || !!(u.uroleplay && u.uroleplay.deaf);
}
function Unchanging() {
    const up = _prop(UNCHANGING);
    return ((up?.intrinsic) | 0) !== 0 || ((up?.extrinsic) | 0) !== 0;
}
/* potion.c:55-86 itimeout / itimeout_incr / incr_itimeout, on the flat u.HDeaf
 * word: set_itimeout(&HDeaf, itimeout((HDeaf & TIMEOUT) + incr)), i.e. clamp
 * the sum into [0, TIMEOUT] and store it back.  js/eat.js:1183 (rottenfood's
 * knockout) is the other caller of the same C line on the same slot. */
const TIMEOUT = 0x00ffffff;
function incr_HDeaf(incr) {
    const u = game.u;
    let v = ((u.HDeaf | 0) & TIMEOUT) + (incr | 0);
    if (v >= TIMEOUT) v = TIMEOUT;
    else if (v < 1) v = 0;
    u.HDeaf = v;
}

/* C music.c:494 — the mundane-drum riff names. */
const beats = [
    "stepper", "one drop", "slow two", "triple stroke roll",
    "double shuffle", "half-time shuffle", "second line", "train",
];

/* ── C music.c:43-59  awaken_scare ──────────────────────────────────────── */
/* wake up monster, possibly scare it */
async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    /* may scare some monsters -- waiting monsters excluded */
    if (!unique_corpstat(mtmp.data)
        && ((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0) {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
    } else if (scary
               && !mindless(mtmp.data)
               && !await resist(mtmp, TOOL_CLASS, 0, NOTELL)
               /* some monsters are immune */
               && onscary(0, 0, mtmp)) {
        await monflee(mtmp, 0, false, true);
    }
}

/* ── C music.c:65-77  awaken_monsters ───────────────────────────────────── */
/* Wake every monster in range... */
async function awaken_monsters(distance) {
    let distm;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if ((distm = mdistu(mtmp)) < distance)
            await awaken_scare(mtmp, (distm < Math.trunc(distance / 3)));
    }
}

/* ── C music.c:83-97  put_monsters_to_sleep ─────────────────────────────── */
/* Make monsters fall asleep.  Note that they may resist the spell. */
async function put_monsters_to_sleep(distance) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mdistu(mtmp) < distance
            && await sleep_monst(mtmp, d(10, 10), TOOL_CLASS)) {
            mtmp.msleeping = 1;
            await slept_monst(mtmp);
        }
    }
}

/* ── C music.c:103-131  charm_snakes ────────────────────────────────────── */
/* Charm snakes in range.  Note that the snakes are NOT tamed. */
async function charm_snakes(distance) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if ((mtmp.data.mlet | 0) === S_SNAKE && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            const was_peaceful = mtmp.mpeaceful;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            const could_see_mon = canseemon(mtmp);
            mtmp.mundetected = 0;
            newsym(mtmp.mx | 0, mtmp.my | 0);
            if (canseemon(mtmp)) {
                if (!could_see_mon)
                    await pline(`You notice ${a_monnam(mtmp)}, swaying with the music.`);
                else
                    await pline(`${Monnam(mtmp)} freezes, then sways with the music${
                        was_peaceful ? "" : ", and now seems quieter"}.`);
            }
        }
    }
}

/* ── C music.c:137-157  calm_nymphs ─────────────────────────────────────── */
/* Calm nymphs in range. */
async function calm_nymphs(distance) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if ((mtmp.data.mlet | 0) === S_NYMPH && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            mtmp.msleeping = 0;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} listens cheerfully to the music, then seems quieter.`);
        }
    }
}

/* ── C music.c:160-190  awaken_soldiers ─────────────────────────────────── */
/* Awake soldiers anywhere the level (and any nearby monster).
 * `bugler` is the monster that played the instrument. */
export async function awaken_soldiers(bugler) {
    const u = game.u || {};
    const youmonst = game.youmonst;
    let distm;

    /* distance of affected non-soldier monsters to bugler */
    const distance = ((bugler === youmonst) ? (u.ulevel | 0)
                                            : (bugler.data.mlevel | 0)) * 30;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (is_mercenary(mtmp.data) && (mtmp.data.pmidx | 0) !== PM_GUARD) {
            if (!mtmp.mtame)
                mtmp.mpeaceful = 0;
            mtmp.msleeping = mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp))
                await pline(`${Monnam(mtmp)} is now ready for battle!`);
            else if (!Deaf())
                await Norep("You hear the rattle of battle gear being readied.");
        } else if ((distm = ((bugler === youmonst)
                                ? mdistu(mtmp)
                                : dist2(bugler.mx | 0, bugler.my | 0,
                                        mtmp.mx | 0, mtmp.my | 0))) < distance) {
            await awaken_scare(mtmp, (distm < Math.trunc(distance / 3)));
        }
    }
}

/* ── C music.c:193-216  charm_monsters ──────────────────────────────────── */
/* Charm monsters in range.  Note that they may resist the spell. */
async function charm_monsters(distance) {
    const u = game.u || {};
    let mtmp2;

    if (u.uswallow)
        distance = 0; /* only u.ustuck will be affected (u.usteed is Null
                       * since hero gets forcibly dismounted when engulfed) */

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (DEADMONSTER(mtmp))
            continue;

        if (mdistu(mtmp) <= distance) {
            /* a shopkeeper can't be tamed but tamedog() pacifies an angry
               one; do that even if mtmp resists in order to behave the same
               as a non-cursed scroll of taming or spell of charm monster */
            if (!await resist(mtmp, TOOL_CLASS, 0, NOTELL) || mtmp.isshk)
                await tamedog(mtmp, null, true);
        }
    }
}

/* ── C music.c:342-470  do_earthquake ───────────────────────────────────── */
async function do_earthquake(force) {
    const u = game.u || {};
    const into_a_chasm = ' into a chasm';
    force = Math.min(force | 0, 13);
    const sx = Math.max((u.ux | 0) - force * 2, 1);
    const sy = Math.max((u.uy | 0) - force * 2, 0);
    const ex = Math.min((u.ux | 0) + force * 2, COLNO - 1);
    const ey = Math.min((u.uy | 0) + force * 2, ROWNO - 1);
    for (let x = sx; x <= ex; ++x) for (let y = sy; y <= ey; ++y) {
        const mon = m_at(x, y);
        if (mon) {
            await wakeup_attack(mon, true);
            if (mon.mundetected) {
                mon.mundetected = 0;
                newsym(x, y);
                if (mon.data?.ceiling_hider && cansee(x, y))
                    await pline(`${Monnam(mon)} is shaken loose from the ceiling!`);
            }
            const ap = M_AP_TYPE(mon);
            if (ap !== M_AP_NOTHING && ap !== M_AP_MONSTER) seemimic(mon);
        }
        if (rn2(14 - force)) continue;
        const lev = game.level?.at(x, y);
        if (!lev) continue;
        const typ = lev.typ | 0;
        if (typ === ALTAR && ((altarmask_at(x, y) | 0) & AM_SANCTUM)) continue;
        if (cansee(x, y)) {
            const desc = typ === FOUNTAIN ? 'The fountain falls'
                : typ === SINK ? 'The kitchen sink falls'
                : typ === ALTAR ? 'The altar falls'
                : typ === GRAVE ? 'The headstone topples'
                : typ === THRONE ? 'The throne falls' : null;
            if (desc) await pline(`${desc}${into_a_chasm}.`);
        }
        if (typ === SCORR) {
            set_levltyp(x, y, CORR);
            newsym(x, y);
            if (cansee(x, y)) await pline('A secret corridor is revealed.');
        } else if (typ === SDOOR) {
            set_levltyp(x, y, DOOR);
            lev.doormask = D_NODOOR;
            newsym(x, y);
            if (cansee(x, y)) await pline('A secret door is revealed.');
        } else if (typ === DOOR && (lev.doormask | 0) !== D_NODOOR) {
            lev.doormask = D_NODOOR;
            newsym(x, y);
            if (cansee(x, y)) await pline('The door collapses.');
        } else if (typ === STONE) {
            continue;
        }
        await digactualhole_(x, y, null, PIT, true);
    }
}

/* ── C music.c:476-492  generic_lvl_desc ────────────────────────────────── */
function generic_lvl_desc() {
    const uz = (game.u && game.u.uz) || null;
    if (Is_astralevel(uz))
        return "astral plane";
    else if (In_endgame(uz))
        return "plane";
    else if (Is_sanctum(uz))
        return "sanctum";
    else if (In_sokoban(uz))
        return "puzzle";
    else if (In_V_tower(uz))
        return "tower";
    else
        return "dungeon";
}
/* dungeon.h:  #define Is_sanctum(lev) on_level(lev, &sanctum_level) */
function Is_sanctum(uz) {
    const lev = uz ?? game?.u?.uz;
    const s = game?.sanctum_level;
    return !!lev && !!s && lev.dnum === s.dnum && lev.dlevel === s.dlevel;
}

/* ── C music.c:733-757  improvised_notes(boolean *same_as_last_time) ─────── */
/* `same_as_last_time` is C's out-parameter, spelled here as the caller's
 * one-field ref object.  svc.context.jingle is char[6], so
 * SIZE(svc.context.jingle) - 1 == 5 and the note count is rnd(5). */
const JINGLE_SIZE = 6;
function improvised_notes(same_as_last_time) {
    const notes = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    /* target buffer has to be in svc.context, otherwise saving game
     * between improvised recitals would not be able to maintain
     * the same_as_last_time context. */
    const ctx = (game.context = game.context || {});
    if (typeof ctx.jingle !== 'string')
        ctx.jingle = '';

    /* You can change your tune, usually */
    if (!(Unchanging() && ctx.jingle.length > 0)) {
        const notecount = rnd(JINGLE_SIZE - 1); /* 1 - 5 */
        let j = '';
        for (let i = 0; i < notecount; ++i)
            j += ROLL_FROM(notes);
        ctx.jingle = j;
        same_as_last_time.value = false;
    } else {
        same_as_last_time.value = true;
    }
    return ctx.jingle;
}

/* ── C music.c:500-731  do_improvisation ────────────────────────────────── */
/* The player is trying to extract something from his/her instrument. */
const PLAY_NORMAL = 0x00, PLAY_STUNNED = 0x01,
      PLAY_CONFUSED = 0x02, PLAY_HALLU = 0x04;

async function do_improvisation(instr) {
    const u = game.u || {};
    let mode;
    let do_spec = (!Stunned() && !Confusion()) ? 1 : 0;
    let mundane = false;
    const same_old_song = { value: false };

    /* C: `struct obj itmp = *instr;` — a BY-VALUE copy whose otyp the
     * mundane-downgrade loop below walks backwards; `instr` itself is never
     * retyped.  itmp.otyp is the only field anything downstream reads (C nulls
     * itmp.oextra purely so the copy does not alias a freeable pointer), so
     * that one field is the whole copy this port needs. */
    const itmp = { otyp: instr.otyp | 0 };

    /* if won't yield special effect, make sound of mundane counterpart */
    if (!do_spec || (instr.spe | 0) <= 0) {
        while (MKOBJ_OC_MAGIC[itmp.otyp | 0]) {
            itmp.otyp -= 1;
            mundane = true;
        }
    }

    mode = PLAY_NORMAL;
    if (Stunned())
        mode |= PLAY_STUNNED;
    if (Confusion())
        mode |= PLAY_CONFUSED;
    if (Hallucination())
        mode |= PLAY_HALLU;

    if (!rn2(2)) {
        /*
         * TEMPORARY?  for multiple impairments, don't always
         * give the generic "it's far from music" message.
         */
        /* remove if STUNNED+CONFUSED ever gets its own message below */
        if (mode === (PLAY_STUNNED | PLAY_CONFUSED))
            mode = !rn2(2) ? PLAY_STUNNED : PLAY_CONFUSED;
        /* likewise for stunned and/or confused combined with hallucination */
        if (mode & PLAY_HALLU)
            mode = PLAY_HALLU;
    }

    /* 3.6.3: most of these gave "You produce <blah>" and then many of
       the instrument-specific messages below which immediately follow
       also gave "You produce <something>."  That looked strange so we
       now use a different verb here */
    switch (mode) {
    case PLAY_NORMAL:
        await pline(`You start playing ${yname(instr)}.`);
        break;
    case PLAY_STUNNED:
        if (!Deaf())
            await pline("You radiate an obnoxious droning sound.");
        else
            await pline("You feel a monotonous vibration.");
        break;
    case PLAY_CONFUSED:
        if (!Deaf())
            await pline("You generate a raucous noise.");
        else
            await pline("You feel a jarring vibration.");
        break;
    case PLAY_HALLU:
        await pline("You disseminate a kaleidoscopic display of floating butterflies.");
        break;
    /* TODO? give some or all of these combinations their own feedback;
       hallucination ones should reference senses other than hearing... */
    default:
        await pline("What you perform is quite far from music...");
        break;
    }

    const improvisation = improvised_notes(same_old_song);
    void improvisation; /* C nhUse(improvisation): only Hero_playnotes reads it */

    switch (itmp.otyp) { /* note: itmp.otyp might differ from instr->otyp */
    case MAGIC_FLUTE: /* Make monster fall asleep */
        consume_obj_charge(instr, true);

        await pline(`You ${!Deaf() ? "" : "seem to "}produce ${
            Hallucination() ? "piped" : "soft"}${
            same_old_song.value ? ", familiar" : ""} music.`);
        await put_monsters_to_sleep((u.ulevel | 0) * 5);
        exercise(A_DEX, true);
        break;
    case WOODEN_FLUTE: /* May charm snakes */
        do_spec &= (rn2(acurr(u, A_DEX)) + (u.ulevel | 0) > 25) ? 1 : 0;
        if (!Deaf())
            await pline(`${Tobjnam(instr, do_spec ? "trill" : "toot")}${
                same_old_song.value ? " a familiar tune" : ""}.`);
        else
            await pline(`You feel ${yname(instr)} ${do_spec ? "trill" : "toot"}.`);
        if (do_spec)
            await charm_snakes((u.ulevel | 0) * 3);
        exercise(A_DEX, true);
        break;
    case FIRE_HORN:  /* Idem wand of fire */
    case FROST_HORN: /* Idem wand of cold */
        /* C music.c:611-631.  Horn rays deliberately share zapyourself and
         * ubuzz with wands; this preserves their damage, inventory effects,
         * direction handling, and hallucination flash_str RNG. */
        consume_obj_charge(instr, true);
        if (!(await getdir(null))) {
            await pline(`${Tobjnam(instr, 'vibrate')}.`);
            break;
        }
        if (!(u.dx | 0) && !(u.dy | 0) && !(u.dz | 0)) {
            const damage = await zapyourself(instr, true);
            if (damage) {
                const pronoun = game.flags?.female ? 'her' : 'him';
                await losehp(damage, `using a magical horn on ${pronoun}self`, 1);
            }
        } else {
            const adtyp = (instr.otyp | 0) === FROST_HORN ? 3 : 2;
            if (!Blind())
                await pline(`A ${flash_str(adtyp - 1, false)} blasts out of the horn!`);
            await ubuzz(adtyp - 1, rn1(6, 6));
        }
        makeknown(instr.otyp);
        break;
    case TOOLED_HORN: /* Awaken or scare monsters */
        if (!Deaf())
            await pline(`You produce a frightful, grave${
                same_old_song.value ? ", yet familiar," : ""} sound.`);
        else
            await pline("You blow into the horn.");
        await awaken_monsters((u.ulevel | 0) * 30);
        exercise(A_WIS, false);
        break;
    case BUGLE: /* Awaken & attract soldiers */
        if (!Deaf())
            await pline(`You extract a loud${
                same_old_song.value ? ", familiar" : ""} noise from ${yname(instr)}.`);
        else
            await pline("You blow into the bugle.");
        await awaken_soldiers(game.youmonst);
        exercise(A_WIS, false);
        break;
    case MAGIC_HARP: /* Charm monsters */
        consume_obj_charge(instr, true);

        if (!Deaf())
            await pline(`${Tobjnam(instr, "produce")} very attractive${
                same_old_song.value ? " and familiar" : ""} music.`);
        else
            await pline("You feel very soothing vibrations.");
        await charm_monsters(Math.trunc(((u.ulevel | 0) - 1) / 3) + 1);
        exercise(A_DEX, true);
        break;
    case WOODEN_HARP: /* May calm Nymph */
        do_spec &= (rn2(acurr(u, A_DEX)) + (u.ulevel | 0) > 25) ? 1 : 0;
        if (!Deaf())
            await pline(`${Yname2(instr)} ${
                (do_spec && same_old_song.value)
                ? "produces a familiar, lilting melody"
                : (do_spec) ? "produces a lilting melody"
                  : (same_old_song.value) ? "twangs a familiar tune"
                    : "twangs"}.`);
        else
            await pline("You feel soothing vibrations.");
        if (do_spec)
            await calm_nymphs((u.ulevel | 0) * 3);
        exercise(A_DEX, true);
        break;
    case DRUM_OF_EARTHQUAKE: /* create several pits */
        /* a drum of earthquake does not cause deafness
           while still magically functional, nor afterwards
           when it invokes the LEATHER_DRUM case instead and
           mundane is flagged */
        consume_obj_charge(instr, true);

        await pline("You produce a heavy, thunderous rolling!");
        await pline(`The entire ${generic_lvl_desc()} is shaking around you!`);
        await do_earthquake(Math.trunc(((u.ulevel | 0) - 1) / 3) + 1);
        /* shake up monsters in a much larger radius... */
        await awaken_monsters(ROWNO * COLNO);
        makeknown(DRUM_OF_EARTHQUAKE);
        break;
    case LEATHER_DRUM: /* Awaken monsters */
        if (!mundane) {
            if (!Deaf()) {
                await pline(`You beat a ${
                    same_old_song.value ? "familiar " : ""}deafening row!`);
                incr_HDeaf(rn1(20, 30));
            } else {
                await pline("You pound on the drum.");
            }
            exercise(A_WIS, false);
        } else {
            /* TODO maybe: sound effects for these riffs */
            await pline(`You ${
                rn2(2) ? "butcher" : rn2(2) ? "manage" : "pull off"} ${
                an(ROLL_FROM(beats))}.`);
        }
        await awaken_monsters((u.ulevel | 0) * (mundane ? 5 : 40));
        if (game.disp) game.disp.botl = 1;
        break;
    default:
        impossible(`What a weird instrument (${instr.otyp | 0})!`);
        return 0;
    }
    return 2; /* That takes time */
}

/* ── C music.c:759-897  do_play_instrument ──────────────────────────────── */
/* So you want music... */
export async function do_play_instrument(instr) {
    const u = game.u || {};
    let c = 'y';

    if (u.uinwater) { /* youprop.h:279 Underwater = (u.uinwater) */
        await pline("You can't play music underwater!");
        return ECMD_OK;
    } else if (((instr.otyp | 0) === WOODEN_FLUTE || (instr.otyp | 0) === MAGIC_FLUTE
                || (instr.otyp | 0) === TOOLED_HORN || (instr.otyp | 0) === FROST_HORN
                || (instr.otyp | 0) === FIRE_HORN || (instr.otyp | 0) === BUGLE)
               && !can_blow(game.youmonst)) {
        await pline(`You are incapable of playing ${thesimpleoname(instr)}.`);
        return ECMD_OK;
    }
    if ((instr.otyp | 0) !== LEATHER_DRUM && (instr.otyp | 0) !== DRUM_OF_EARTHQUAKE
        && !(Stunned() || Confusion() || Hallucination())) {
        c = await yn_function("Improvise?", ynqchars, 'q');
        if (c === 'q') {
            /* C `goto nevermind;` — music.c:896 pline1(Never_mind) then
             * return ECMD_OK. */
            await pline("Never mind.");
            return ECMD_OK;
        }
    }

    if (c !== 'n')
        return (await do_improvisation(instr)) ? ECMD_TIME : ECMD_OK;

    /* C music.c:786-893 — play the castle passtune or enter a candidate. */
    if ((u.uheard_tune | 0) === 2)
        c = await yn_function("Play the passtune?", ynqchars, 'q');
    if (c === 'q') {
        await pline("Never mind.");
        return ECMD_OK;
    }
    let tune;
    if (c === 'y') tune = String(game._tune || '');
    else {
        tune = await getlin("What tune are you playing? [5 notes, A-G]");
        if (tune === '') return ECMD_OK;
        tune = tune.trim().replace(/\s+/g, '').toUpperCase().replace(/H/g, 'B');
    }
    await pline(!Deaf() ? `You extract a strange sound from ${yname(instr)}!`
                         : `You can feel ${yname(instr)} emitting vibrations.`);
    if (Is_stronghold(u.uz)) {
        exercise(A_WIS, true);
        const expected = String(game._tune || '');
        if (tune === expected) {
            const bx = { value: u.ux | 0 }, by = { value: u.uy | 0 };
            let found = false;
            for (let y = (u.uy | 0) - 1; y <= (u.uy | 0) + 1 && !found; y++)
                for (let x = (u.ux | 0) - 1; x <= (u.ux | 0) + 1 && !found; x++) {
                    if (!isok(x, y)) continue;
                    bx.value = x; by.value = y; found = find_drawbridge(bx, by);
                }
            if (found) {
                const bridge = game.level.at(bx.value, by.value);
                const dir = (bridge.drawbridgemask | 0) & DB_DIR;
                let wx = bx.value, wy = by.value;
                if (dir === DB_NORTH) wy--; else if (dir === DB_SOUTH) wy++;
                else if (dir === DB_EAST) wx++; else if (dir === DB_WEST) wx--;
                const wall = game.level.at(wx, wy);
                if ((bridge.typ | 0) === DRAWBRIDGE_DOWN) {
                    bridge.typ = DRAWBRIDGE_UP;
                    if (wall) { wall.typ = DBWALL; wall.wall_info = W_NONDIGGABLE; }
                } else {
                    bridge.typ = DRAWBRIDGE_DOWN;
                    if (wall) { wall.typ = DOOR; wall.doormask = D_NODOOR; }
                    u.uopened_dbridge = true;
                }
                u.uheard_tune = 2; record_achievement(ACH_TUNE);
                newsym(bx.value, by.value); newsym(wx, wy);
                return ECMD_TIME;
            }
        } else if (!Deaf()) {
            if ((u.uheard_tune | 0) < 1) u.uheard_tune = 1;
            let nearby = false;
            for (let y = (u.uy | 0) - 1; y <= (u.uy | 0) + 1; y++)
                for (let x = (u.ux | 0) - 1; x <= (u.ux | 0) + 1; x++) {
                    if (!isok(x, y)) continue;
                    const loc = game.level.at(x, y);
                    if (loc && IS_DRAWBRIDGE(loc.typ)) nearby = true;
                    else if (loc && find_drawbridge({ value: x }, { value: y })) nearby = true;
                }
            if (nearby) {
                let tumblers = 0, gears = 0; const matched = Array(5).fill(false);
                for (let i = 0; i < tune.length && i < 5; i++) {
                    if (tune[i] === expected[i]) { gears++; matched[i] = true; }
                    else for (let j = 0; j < 5; j++) if (!matched[j] && tune[i] === expected[j] && tune[j] !== expected[j]) { tumblers++; matched[j] = true; break; }
                }
                if (tumblers || gears) await pline(`${tumblers} tumbler${tumblers === 1 ? '' : 's'} and ${gears} gear${gears === 1 ? '' : 's'} turn.`);
                if (gears === 5) { u.uheard_tune = 2; record_achievement(ACH_TUNE); }
            }
        }
    }
    return ECMD_TIME;
}
