// js/mcastu.js — port of nethack-c/src/mcastu.c (scaffold: functions are added here

import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { nhlib_load_toplevel_rng } from './nhlib.js';
import { pline, canseemon, canspotmon, map_invisible, Norep, newsym, shieldeff } from './display.js';
import { You } from './eat.js';
import { mon_nam } from './uhitm.js';
import { nomul } from './allmain.js';
import { is_waterwall } from './dokick.js';
/* mcast_lightning's leaves.  destroy_items and flashburn are exported from
 * js/zap.js (their C home is zap.c); ureflects' one real body is js/makemon.js
 * (js/mhitu.js:217 and js/mhitm.js:235 are constant-FALSE stubs of it). */
import { destroy_items, flashburn } from './zap.js';
import { ureflects, lined_up } from './makemon.js';
import { couldsee, cansee } from './vision.js';
import { M_ATTK_MISS, M_ATTK_HIT, u_at, A_LAWFUL, EMIN, ismnum, MALE, FEMALE, NEUTRAL, NUM_MGENDERS, STRAT_WAITFORU, STRAT_APPEARMSG, SLIMED, MM_NOWAIT, HEADSTONE } from './const.js';
import { an } from './objnam.js';
import { the_unique_pm, permonstTemplate, mon_set_minvis } from './makemon.js';
import { mon_aligntyp } from './priest.js';
import { wake_nearto } from './mklev.js';
/* C mon.c:4596 healmon() — m_cure_self()'s heal. */
import { healmon } from './mklev.js';
import { mon_adjust_speed, burnarmor } from './trap.js';
/* mcast_stun_you's leaves: acurr (js/attrib.js:101), make_stunned
 * (js/mhitm.js:215 — still a no-op body), and the two prop ids. */
import { acurr as acurr_mc } from './attrib.js';
import { make_stunned as make_stunned_mc } from './potion.js';
import { FREE_ACTION as FREE_ACTION_MC, STUNNED as STUNNED_MC } from './const.js';
/* C wizard.c:591 nasty() — mcast_summon_mons()'s body. */
import { nasty } from './mklev.js';
/* mcast_death_touch's leaves: mhe/nonliving/is_demon (js/makemon.js, C
 * you.h:322 + mondata.h:110/is_undead), and touch_of_death's HP machinery —
 * minuhpmax/setuhpmax/adjuhploss (attrib.c:1152/1162/1182), losehp
 * (hack.c:4219, hosted in js/dokick.js), deadhero (js/end.js, this port's
 * deferral for C's non-returning done()) and rehumanize (polyself.c). */
import { mhe, nonliving, is_demon } from './makemon.js';
import { minuhpmax, setuhpmax, adjuhploss, losestr } from './attrib.js';
import { Upolyd } from './const.js';
import { losehp } from './dokick.js';
import { deadhero } from './end.js';
/* C mcastu.c:337-340 touch_of_death: done(DIED) is SYNCHRONOUS in C — it
 * resolves the whole Lifesaved/wizard-"Die?" interaction before returning.
 * This port's deadhero() only flags the death; js/mhitu.js (mdamageu's own
 * lethal-hit site, :3262-3278) and js/fastforward.js (movemon boundary,
 * ff_movemon_one_pass:761-762) already drain a freshly-flagged death in place
 * with this same before/after `_pendingDeath` identity-check pattern. */
import { drain_pending_death_in_place } from './fastforward.js';
import { rehumanize } from './polyself.js';
/* C polyself.c:2129 body_part(part) = mbodypart(&gy.youmonst, part). */
import { body_part } from './cmd.js';
import { make_slimed } from './potion.js';

// monattk.h attack-damage types used by castmu.
const AD_MAGM = 1, AD_FIRE = 2, AD_COLD = 3, AD_SLEE = 4, AD_DISN = 5,
    AD_ELEC = 6, AD_DRST = 7, AD_ACID = 8, AD_CLRC = 240, AD_SPEL = 241;

// worn.h monster speed values (mon->permspeed).
const MSLOW = 1, MFAST = 2;

// prop.h property indices for the hero-property macros used below.
const SHOCK_RES_MC = 5; /* prop.h SHOCK_RES (js/const.js:2316) */
/* monst.h:82/:85 seen_resistance bits (js/makemon.js:3464/3468). */
const M_SEEN_ELEC_MC = 0x0020, M_SEEN_REFL_MC = 0x0100, M_SEEN_FIRE_MC = 0x0002;
const FIRE_RES = 1, COLD_RES = 2, ANTIMAGIC = 12, BLINDED = 15, DEAF = 16,
    HALLUC = 23, SEE_INVIS = 29, INVIS = 40, DISPLACED = 41, HALF_SPDAM = 55;

// mcastu.h: magic and clerical spells share one enum + flags table.
const MCAST_PSI_BOLT = 0, MCAST_OPEN_WOUNDS = 1, MCAST_LIGHTNING = 2,
    MCAST_FIRE_PILLAR = 3, MCAST_GEYSER = 4, MCAST_DEATH_TOUCH = 5,
    MCAST_CURE_SELF = 6, MCAST_HASTE_SELF = 7, MCAST_DISAPPEAR = 8,
    MCAST_AGGRAVATION = 9, MCAST_STUN_YOU = 10, MCAST_WEAKEN_YOU = 11,
    MCAST_CONFUSE_YOU = 12, MCAST_PARALYZE = 13, MCAST_BLIND_YOU = 14,
    MCAST_DESTRY_ARMR = 15, MCAST_CURSE_ITEMS = 16, MCAST_INSECTS = 17,
    MCAST_SUMMON_MONS = 18, MCAST_CLONE_WIZ = 19;

const MCF_INDIRECT = 0x0001, MCF_SIGHT = 0x0002, MCF_HOSTILE = 0x0004;

// mcastu.h MONSPELL() flags table, same order as the enum above.
const mcast_flags = [
    MCF_HOSTILE | MCF_SIGHT,                  // PSI_BOLT
    MCF_HOSTILE | MCF_SIGHT,                  // OPEN_WOUNDS
    MCF_HOSTILE | MCF_SIGHT,                  // LIGHTNING
    MCF_HOSTILE | MCF_SIGHT,                  // FIRE_PILLAR
    MCF_HOSTILE | MCF_SIGHT,                  // GEYSER
    MCF_HOSTILE | MCF_SIGHT,                  // DEATH_TOUCH
    MCF_INDIRECT,                             // CURE_SELF
    MCF_INDIRECT,                             // HASTE_SELF
    MCF_INDIRECT,                             // DISAPPEAR
    MCF_INDIRECT | MCF_HOSTILE | MCF_SIGHT,   // AGGRAVATION
    MCF_HOSTILE | MCF_SIGHT,                  // STUN_YOU
    MCF_HOSTILE | MCF_SIGHT,                  // WEAKEN_YOU
    MCF_HOSTILE | MCF_SIGHT,                  // CONFUSE_YOU
    MCF_HOSTILE | MCF_SIGHT,                  // PARALYZE
    MCF_HOSTILE | MCF_SIGHT,                  // BLIND_YOU
    MCF_HOSTILE | MCF_SIGHT,                  // DESTRY_ARMR
    MCF_HOSTILE | MCF_SIGHT,                  // CURSE_ITEMS
    MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT,   // INSECTS
    MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT,   // SUMMON_MONS
    MCF_HOSTILE | MCF_INDIRECT | MCF_SIGHT,   // CLONE_WIZ
];

/* C ref: include/mcastu.h MONSPELL(def, lvl, flags) — the `lvl` column, in the
 * same order as mcast_flags above (i.e. this file's MCAST_ enum, not
 * mcastu.h's).  Read by choose_monster_spell(); 3.7 had no such table, which
 * is why it was absent. */
const mcast_level = [
    0,   // PSI_BOLT
    0,   // OPEN_WOUNDS
    11,  // LIGHTNING
    12,  // FIRE_PILLAR
    13,  // GEYSER
    20,  // DEATH_TOUCH
    1,   // CURE_SELF
    2,   // HASTE_SELF
    4,   // DISAPPEAR
    13,  // AGGRAVATION
    3,   // STUN_YOU
    6,   // WEAKEN_YOU
    2,   // CONFUSE_YOU
    4,   // PARALYZE
    6,   // BLIND_YOU
    8,   // DESTRY_ARMR
    10,  // CURSE_ITEMS
    8,   // INSECTS
    15,  // SUMMON_MONS
    18,  // CLONE_WIZ
];

function propOn(id) {
    const p = game.u?.uprops?.[id];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Antimagic() { return propOn(ANTIMAGIC); }
function Hallucination() { return propOn(HALLUC); }
function Blinded() { return propOn(BLINDED); }
function Deaf() { return propOn(DEAF) || !!game.u?.uroleplay?.deaf; }
function Invis() {
    const p = game.u?.uprops?.[INVIS];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}
function Displaced() { return propOn(DISPLACED); }
function SeeInvisible() { return propOn(SEE_INVIS); }
function HalfSpellDamage() { return propOn(HALF_SPDAM); }
function ShockResistance() { return propOn(SHOCK_RES_MC); }
function FireResistance() { return propOn(FIRE_RES); }
function ColdResistance() { return propOn(COLD_RES); }

// (all 15 records: thinks_it_foundyou=0, mpeaceful=1, adtyp in {AD_SPEL,
// AD_CLRC}) — thrown loudly rather than silently no-op'd, per charter. ──
export function cursetxt(mtmp, undirected) {
    const u = game.u || {};
    const mux_off = ((mtmp.mux | 0) !== (u.ux | 0) || (mtmp.muy | 0) !== (u.uy | 0));
    if (canseemon(mtmp) && couldsee(mtmp.mx, mtmp.my)) {
        let point_msg; /* C's comment: spellcasting monsters are impolite */

        if (undirected)
            point_msg = 'all around, then curses';
        else if ((Invis() && !perceives(mon_data_mc(mtmp)) && mux_off)
                 || is_obj_mappear_youmonst(STRANGE_OBJECT_MC)
                 || (u.uundetected | 0))
            point_msg = 'and curses in your general direction';
        else if (Displaced() && mux_off)
            point_msg = 'and curses at your displaced image';
        else
            point_msg = 'at you, then curses';

        pline_mon(mtmp, Monnam(mtmp) + ' points ' + point_msg + '.');
    } else if ((!((game.moves | 0) % 4) || !rn2(4))) {
        if (!Deaf())
            Norep('You hear a mumbled curse.');   /* Deaf-aware */
    }
}
/* C monst.h is_obj_mappear(mon, otyp) —
 *   ((mon)->m_ap_type == M_AP_OBJECT && (mon)->mappearance == (otyp))
 * applied to gy.youmonst (a hero mimicking an object).  js/monmove.js:1826
 * carries the same clause as a hardcoded `false` stub. */
function is_obj_mappear_youmonst(otyp) {
    const ym = game.youmonst;
    return !!ym && (ym.m_ap_type | 0) === M_AP_OBJECT_MC
        && (ym.mappearance | 0) === (otyp | 0);
}
const M_AP_OBJECT_MC = 2;        /* monst.h (js/const.js:1299) */
const STRANGE_OBJECT_MC = 0;     /* objects.h otyp 0 */
/* Live monsters built by makemon carry mnum and not always a permonst on
 * .data, so resolve the permonst the way js/dochug.js:82 does. */
function mon_data_mc(mtmp) {
    return mtmp.data || permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? 0) | 0);
}
// questpgr.c com_pager / com_pager_core — Lua quest-text lookup subsystem.
// FULL port is out of scope (nhl_init, quest.lua msg_fallbacks, %-arg
// convert_line, by_window delivery). But cuss() calls com_pager("angel_cuss")
// and com_pager("demon_cuss"), whose entries are plain string ARRAYS, and for
// an array-form entry com_pager_core consumes exactly ONE game rn2 to pick the
// line (questpgr.c:566 `nelems = rn2(nelems) + 1`).  Before that draw,
// com_pager_core creates a FRESH Lua state (questpgr.c:487) and nhl_init()
// loads nhlib.lua.  Its top-level `shuffle(align)` spends rn2(3), rn2(2) on
// the game RNG.  Model those two leaves before selecting the array entry. The
// tables are copied verbatim from nethack-c/dat/quest.lua so nelems is exact,
// and delivery is by pline. The two conversions used by angel_cuss (%D/%p)
// are expanded below; these are the exact questpgr.c convert_arg cases
// (lawful deity and player name). Any other msgid follows C's nonfatal
// impossible() path and does not terminate the replay.
const QUEST_CUSS_TEXT = {
    angel_cuss: [
        "\"Repent, and thou shalt be saved!\"",
        "\"Thou shalt pay for thine insolence!\"",
        "\"Very soon, my child, thou shalt meet thy maker.\"",
        "\"The great %D has sent me to make you pay for your sins!\"",
        "\"The wrath of %D is now upon you!\"",
        "\"Thy life belongs to %D now!\"",
        "\"Dost thou wish to receive thy final blessing?\"",
        "\"Thou art but a godless void.\"",
        "\"Thou art not worthy to seek the Amulet.\"",
        "\"No one expects the Spanish Inquisition!\"",
        "\"Judgment hath been passed upon thee, %p.\"",
        "\"Thy reckoning is at hand, %p.\"",
        "\"Thou shalt be brought before %D for thy crimes!\"",
        "\"With %D as my witness, I shall strike thee down.\"",
    ],
    demon_cuss: [
        "\"I first mistook thee for a statue, when I regarded thy head of stone.\"",
        "\"Come here often?\"",
        "\"Doth pain excite thee?  Wouldst thou prefer the whip?\"",
        "\"Thinkest thou it shall tickle as I rip out thy lungs?\"",
        "\"Eat slime and die!\"",
        "\"Go ahead, fetch thy mama!  I shall wait.\"",
        "\"Go play leapfrog with a herd of unicorns!\"",
        "\"Hast thou been drinking, or art thou always so clumsy?\"",
        "\"This time I shall let thee off with a spanking, but let it not happen again.\"",
        "\"I've met smarter (and prettier) acid blobs.\"",
        "\"Look!  Thy bootlace is undone!\"",
        "\"Mercy!  Dost thou wish me to die of laughter?\"",
        "\"Run away!  Live to flee another day!\"",
        "\"Thou hadst best fight better than thou canst dress!\"",
        "\"Twixt thy cousin and thee, Medusa is the prettier.\"",
        "\"Methinks thou wert unnaturally stirred by yon corpse back there, eh, varlet?\"",
        "\"Up thy nose with a rubber hose!\"",
        "\"Verily, thy corpse could not smell worse!\"",
        "\"Wait!  I shall polymorph into a grid bug to give thee a fighting chance!\"",
        "\"Why search for the Amulet?  Thou wouldst but lose it, cretin.\"",
        "\"Thou ought to be a comedian, thy skills are so laughable!\"",
        "\"Thy gaze is so vacant, I thought thee a floating eye!\"",
        "\"Thy head is unfit for a mind flayer to munch upon!\"",
        "\"Only thy reflection could love thee!\"",
        "\"Hast thou considered masking thine odour?\"",
        "\"Hold! Thy face is a most exquisite torture!\"",
        "\"I should fart in thy direction, but it might improve thy smell!\"",
    ],
};
function com_pager(msgid) {
    const table = QUEST_CUSS_TEXT[msgid];
    if (!table) {
        impossible('com_pager: questtext[common][' + msgid + '] not ported');
        return false;
    }
    /* C questpgr.c:487 `L = nhl_init(&sbi)`: nhlib.lua's top-level
     * shuffle(align), before the questtext lookup and its array roll. */
    nhlib_load_toplevel_rng();
    /* com_pager_core: pick a line — questpgr.c:566 nelems = rn2(nelems) + 1. */
    const nelems = rn2(table.length) + 1;
    /* questpgr.c:236-302 convert_arg(): %D is always A_LAWFUL, while %p is
       svp.plname.  Keep replacement positional and non-recursive, as C's
       convert_line does, so a player/deity name containing '%' is preserved. */
    const u = game.u || {};
    let lawful = u.lgod ?? game.urole?.lgod ?? 'someone';
    lawful = String(lawful);
    if (lawful[0] === '_') lawful = lawful.slice(1);
    const player = String(game.plname ?? game.u?.plname ?? u.plname ?? '');
    const raw = table[nelems - 1];
    let line = '';
    for (let i = 0; i < raw.length; i++) {
        if (raw[i] === '%' && i + 1 < raw.length) {
            if (raw[i + 1] === 'D') { line += lawful; i++; continue; }
            if (raw[i + 1] === 'p') { line += player; i++; continue; }
        }
        line += raw[i];
    }
    pline(line);
    return true;
}
export async function mon_spell_hits_spot(_mtmp, adtyp, _x, _y) {
    if (adtyp === AD_MAGM || adtyp === AD_ACID) {
        /* C zap.c:5509-5516 — engraving clobber. */
        const e = engr_at(_x, _y);
        if (e && e.engr_type !== HEADSTONE && e.text != null)
            wipe_engr_at(_x, _y, String(e.text || '').length + d(6, 6), true);
    }
    if (adtyp >= AD_MAGM && adtyp <= AD_ACID) {
        /* C zap.c:5528 — monster spells use the negative spell encoding. */
        await zap_over_floor(_x, _y, -(10 + ((adtyp | 0) - 1)),
            { v: false }, true, 0);
        return;
    }
    /* C zap.c:5530 — impossible("Unsupported damage type (%d) ...") */
    impossible('Unsupported damage type (%d) for mon_spell_hits_spot.', adtyp);
}
/* Preserve mcastu's historical public API while sharing display.c's body. */
export { shieldeff };
/* C mondata.c:1557-1568 monstseesu(seenres) — every monster that can SEE the
 * hero records that the hero resisted this damage type (m_setseenres), so it
 * stops choosing that attack.  RNG-free.
 * NOTE the m_canseeu() guard: it is in C for BOTH functions.  js/potion.js:2745
 * carries a monstseesu WITHOUT it (a separate defect, file-local there). */
export function monstseesu(seenres) {
    if (!seenres || game.u.uswallow)
        return;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1)
            continue; /* DEADMONSTER */
        if (!m_canseeu_mc(mtmp))
            continue;
        mtmp.seen_resistance = (mtmp.seen_resistance | 0) | seenres;
    }
}
/* C mondata.c:1571-1582 monstunseesu(seenres) — the mirror; monsters in line of
 * sight FORGET the hero's resistance. */
export function monstunseesu(seenres) {
    if (!seenres || game.u.uswallow)
        return;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1)
            continue; /* DEADMONSTER */
        if (!m_canseeu_mc(mtmp))
            continue;
        mtmp.seen_resistance = (mtmp.seen_resistance | 0) & ~seenres;
    }
}
/* C vision.h:50-53 m_canseeu(m) —
 *   (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
 * The FOURTH copy of this body in js/ (js/mhitm.js:176, js/dochug.js:68,
 * js/priest.js:540 hold the others, and js/mhitu.js:199 holds an always-false
 * STUB of it).  Copied rather than imported to avoid adding a module cycle;
 * consolidating the five is fleet-feedback work, not this target's. */
function m_canseeu_mc(mtmp) {
    const u = game.u;
    if (!u)
        return false;
    const Invis_ = Invis();
    const ptr = permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? 0) | 0);
    const perceives = !!(((ptr && ptr.mflags1) || 0) & M1_SEE_INVIS_MC);
    return (!Invis_ || perceives) && !u.uinwater
        && !!couldsee(mtmp.mx | 0, mtmp.my | 0);
}
const M1_SEE_INVIS_MC = 0x01000000;   /* monflag.h */
const M_SEEN_MAGR_MC = 0x0001;        /* monst.h:76 */
const HEAD_MC = 8;                    /* hack.h body-part index (js/cmd.js:35893) */
/* C mhitu.c:1902 mdamageu(mtmp, n) — ONE body in C, and js/mhitu.js:298
 * already holds it.  This file's throwing stub shadowed it, so every castmu
 * spell that did damage halted the run the moment mattacku's AT_MAGC case was
 * wired.  Re-exported rather than re-derived (js/mhitm.js:170 holds a THIRD,
 * silent-no-op copy — fleet-feedback work, not this target's). */
import { mdamageu } from './mhitu.js';
import { helpless } from './mhitm.js';
export { mdamageu };
export async function burn_away_slime() {
    const p = game.u?.uprops?.[SLIMED];
    if ((p?.intrinsic | 0) || (p?.extrinsic | 0))
        await make_slimed(0, 'The slime that covers you is burned away!');
}
export function has_aggravatables(mon) {
    const u = game.u;
    const in_w_tower = In_W_tower(mon.mx, mon.my, u.uz);

    if (in_w_tower !== In_W_tower(u.ux, u.uy, u.uz))
        return false;

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz))
            continue;
        if (((mtmp.mstrategy | 0) & STRAT_WAITFORU) !== 0 || helpless(mtmp))
            return true;
    }
    return false;
}
/* C mondata.h:81 perceives(ptr) — ((ptr)->mflags1 & M1_SEE_INVIS) != 0L.
 * A one-line macro that was a throwing stub; cursetxt() above is a live caller. */
export function perceives(pmdata) {
    return (((pmdata && pmdata.mflags1) | 0) & M1_SEE_INVIS_MC) !== 0;
}

export function mon_has_special(mtmp) {
    const AMULET_OF_YENDOR = 213;
    const BELL_OF_OPENING = 263;
    const CANDELABRUM_OF_INVOCATION = 262;
    const SPE_BOOK_OF_THE_DEAD = 409; /* objects.h SPELL() BOOK_OF_THE_DEAD; was 264 = TRIPE_RATION */
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === AMULET_OF_YENDOR
            || otmp.oartifact
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD)
            return 1;
    return 0;
}

/* C mcastu.c:322-354 touch_of_death(struct monst *mtmp) — the monster spell
 * "touch of death", which (unlike the finger-of-death WAND effect) only ever
 * attacks the hero.  Draws d(8,6) UNCONDITIONALLY, before any branch.
 * C's done(DIED) never returns; this port flags the death through the same
 * deadhero() deferral js/dokick.js:212 losehp() uses, and then — exactly as C
 * does — clears svk.killer.name on the way out ("not killed if we get here"),
 * which is why the killer string has to be written BEFORE the flag. */
export async function touch_of_death(mtmp) {
    const u = game.u;
    let dmg = 50 + d(8, 6);
    const drain = Math.trunc(dmg / 2);

    /* C: "if we get here, we know that hero isn't magic resistant and isn't
       poly'd into an undead or demon" */
    You_feel_mc('drained...');
    const kbuf = death_inflicted_by('', 'the touch of death', mtmp);

    if (Upolyd(u)) {
        u.mh = 0;
        await rehumanize(); /* fatal iff Unchanging */
    } else if (drain >= (u.uhpmax | 0)) {
        if (!game.svk) game.svk = {};
        if (!game.svk.killer)
            game.svk.killer = { id: 0, format: 0, name: '', next: null };
        game.svk.killer.format = KILLED_BY_MC;
        game.svk.killer.name = kbuf;
        const _deathBeforeTouch = game._pendingDeath || null;
        deadhero(0 /* DIED */, { noDeathLine: true });
        /* C: done(DIED) never returns here — it resolves the death (or
         * Lifesaved reprieve) synchronously before touch_of_death's final
         * "not killed if we get here" line runs.  Drain it now, matching the
         * identical pattern at js/mhitu.js:3277-3278. */
        if (game._pendingDeath && game._pendingDeath !== _deathBeforeTouch)
            await drain_pending_death_in_place();
    } else {
        /* C's own comment: HP manipulation similar to poisoned(attrib.c) */
        const olduhp = u.uhp | 0;
        const uhpmin = minuhpmax(3);
        const newuhpmax = (u.uhpmax | 0) - drain;

        setuhpmax(Math.max(newuhpmax, uhpmin), false);
        dmg = adjuhploss(dmg, olduhp); /* reduce pending damage if uhp has
                                        * already been reduced due to drop
                                        * in uhpmax */
        await losehp(dmg, kbuf, KILLED_BY_MC);
    }
    if (game.svk && game.svk.killer)
        game.svk.killer.name = ''; /* not killed if we get here... */
}

export async function mcast_death_touch(mtmp) {
    const u = game.u;
    const ydata = mon_data_mc(game.youmonst);

    pline(`Oh no, ${mhe(mtmp)}'s using the touch of death!`);
    if (nonliving(ydata) || is_demon(ydata)) {
        You('seem no deader than before.');
    } else if (!Antimagic() && rn2(mtmp.m_lev | 0) > 12) {
        if (Hallucination()) {
            You('have an out of body experience.');
        } else {
            await touch_of_death(mtmp);
        }
        monstunseesu(M_SEEN_MAGR_MC);
    } else {
        if (Antimagic()) {
            shieldeff(u.ux, u.uy);
            monstseesu(M_SEEN_MAGR_MC);
        }
        pline("Lucky for you, it didn't work!");
    }
}
/* C pline.c:386-399 You_feel(line) — "You feel " + line (the Unaware variant
 * prefixes "You dream that you feel "; js/dig.js:902 spells the same body). */
function You_feel_mc(line) { pline('You feel ' + line); }
const KILLED_BY_MC = 1;               /* hack.h killer.format */
// other than MCAST_HASTE_SELF ever reaches mcast_spell in the 15 records).
export async function mcast_clone_wiz(mtmp) {
    const g = game, u = g.u || {};
    if (!mtmp?.iswiz || (g.context?.no_of_wizards | 0) !== 1)
        return;
    pline('Double Trouble...');
    const clone = await makemon(PM_WIZARD_OF_YENDOR_MC, u.ux | 0, u.uy | 0, MM_NOWAIT);
    if (!clone) return;
    clone.msleeping = clone.mtame = clone.mpeaceful = 0;
    if (!u.uhave?.amulet && rn2(2)) {
        const fake = await mksobj(212, true, false);
        if (fake) await add_to_minv(clone, fake);
    }
    /* C wizard.c:528-531 — unless protected from shape changers, the clone
     * is disguised as a random monster: ROLL_FROM(wizapp) is one rn2(12). */
    const _p = u.uprops?.[PROT_FROM_SHAPE_CHANGERS_MC];
    if (!(_p && ((_p.intrinsic | 0) || (_p.extrinsic | 0)))) {
        clone.m_ap_type = 3; /* M_AP_MONSTER */
        clone.mappearance = _WIZAPP[rn2(_WIZAPP.length)];
    }
    newsym(clone.mx | 0, clone.my | 0);
}
/* C wizard.c:52 wizapp[] */
const _WIZAPP = [PM_HUMAN_WA, PM_WATER_DEMON_WA, PM_VAMPIRE_WA, PM_RED_DRAGON_WA,
    PM_TROLL_WA, PM_UMBER_HULK_WA, PM_XORN_WA, PM_XAN_WA, PM_COCKATRICE_WA,
    PM_FLOATING_EYE_MC, PM_GUARDIAN_NAGA_WA, PM_TRAPPER_WA];
export async function mcast_summon_mons(mtmp) {
    const count = await nasty(mtmp);
    const u = game.u || {};
    const mux_off = ((mtmp.mux | 0) !== (u.ux | 0) || (mtmp.muy | 0) !== (u.uy | 0));

    if (!count) {
        ; /* nothing was created? */
    } else if (mtmp.iswiz) {
        /* C SetVoice/verbalize arm; the text channel has no voice metadata,
         * but preserve the observable command and pluralization. */
        pline(`"Destroy the thief, my pet${count === 1 ? '' : 's'}!"`);
    } else {
        const one = (count === 1);
        const mappear = one ? 'A monster appears' : 'Monsters appear';

        /* C's comment: messages not quite right if plural monsters created but
           only a single monster is seen */
        if (Invis() && !perceives(mon_data_mc(mtmp)) && mux_off)
            pline(`${mappear} ${one ? 'at' : 'around'} a spot near you!`);
        else if (Displaced() && mux_off)
            pline(`${mappear} ${one ? 'by' : 'around'} your displaced image!`);
        else
            pline(`${mappear} from nowhere!`);
    }
}
import { In_W_tower_wz as In_W_tower } from './dochug.js';

// DEADMONSTER macro: #define DEADMONSTER(mon) ((mon)->mhp < 1)
function DEADMONSTER(mon) {
    return (mon.mhp | 0) < 1;
}

export function aggravate() {
    const u = game.u;
    const in_w_tower = In_W_tower(u.ux, u.uy, u.uz);

    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (DEADMONSTER(mtmp))
            continue;
        if (in_w_tower !== In_W_tower(mtmp.mx, mtmp.my, u.uz))
            continue;
        mtmp.mstrategy &= ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        mtmp.msleeping = 0;
        if (mtmp.mcanmove === 0 && !rn2(5)) {
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
    }
}
/* C do_wear.c:3278 destroy_arm() — mcast_destroy_armor's body. */
import { destroy_arm } from './do_wear.js';
import { rndcurse } from './sit.js';
export { rndcurse };
/* C mcastu.c:449-462 mcast_destroy_armor(void) — the MCAST_DESTRY_ARMR arm.
 * Was a throwing stub; destroy_arm() (do_wear.c:3278) has had its real body in
 * js/do_wear.js:3882 all along, so this was a halt in front of a live callee.
 * RNG: destroy_arm's rn2(4) fires on the !Antimagic path ONLY — an antimagic
 * hero short-circuits into the shieldeff arm and consumes nothing.  Note
 * destroy_arm's rn2(4) is inside its DECLARATION, so it is drawn even when the
 * hero wears no armor at all and the function returns 0. */
export async function mcast_destroy_armor() {
    const u = game.u || {};
    if (Antimagic()) {
        shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        pline('A field of force surrounds you!');
    } else if (!(await destroy_arm())) {
        pline('Your skin itches.');
    } else {
        /* C's own comment: monsters only realize you aren't magic-protected
           if armor is actually destroyed */
        monstunseesu(M_SEEN_MAGR_MC);
    }
}
export async function mcast_weaken_you(mtmp, dmg) {
    const u = game.u || {};
    if (Antimagic()) {
        shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        You_feel_mc('momentarily weakened.');
    } else {
        pline('You suddenly feel weaker!');
        dmg = (mtmp.m_lev | 0) - 6;
        if (dmg < 1) /* C's own comment: paranoia since only chosen when
                      * m_lev is high */
            dmg = 1;
        if (HalfSpellDamage())
            dmg = Math.trunc((dmg + 1) / 2);
        await losestr(rnd(dmg),
                death_inflicted_by('', 'strength loss', mtmp),
                KILLED_BY_MC);
        if (game.svk && game.svk.killer)
            game.svk.killer.name = ''; /* not killed if we get here... */
        monstunseesu(M_SEEN_MAGR_MC);
    }
}
export function mcast_disappear(mtmp) {
    if (!mtmp.minvis && !mtmp.invis_blkd) {
        if (canseemon(mtmp)) {
            /* youprop.h:152 See_invisible = HSee_invisible || ESee_invisible */
            const si = game.u?.uprops?.[SEE_INVIS];
            const See_invisible = !!((si?.intrinsic | 0) || (si?.extrinsic | 0));
            pline_mon(mtmp, `${Monnam(mtmp)} suddenly `
                + `${!See_invisible ? 'disappears' : 'becomes transparent'}!`);
        }
        mon_set_minvis(mtmp, false);
        if (cansee(mtmp.mx, mtmp.my) && !canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
    } else {
        impossible('no reason for monster to cast disappear spell?');
    }
}
export function mcast_stun_you(dmg) {
    const u = game.u;
    if (Antimagic() || FreeAction_mc()) {
        shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        if (!Stunned_mc())
            pline('You feel momentarily disoriented.');
        make_stunned_mc(1, false);
    } else {
        pline(Stunned_mc() ? 'You struggle to keep your balance.' : 'You reel...');
        dmg = d(acurr_mc(u, A_DEX_MC) < 12 ? 6 : 4, 4);
        if (HalfSpellDamage())
            dmg = Math.trunc((dmg + 1) / 2);
        make_stunned_mc(HStun_timeout_mc() + dmg, false);
        monstunseesu(M_SEEN_MAGR_MC);
    }
}
/* C attrib.h A_DEX=3; C youprop.h Free_action / Stunned; C prop.h TIMEOUT. */
const A_DEX_MC = 3;
function FreeAction_mc() { return propOn(FREE_ACTION_MC); }
function Stunned_mc() { return propOn(STUNNED_MC); }
function HStun_timeout_mc() {
    const p = game.u?.uprops?.[STUNNED_MC];
    return (p?.intrinsic | 0) & 0x00FFFFFF; /* TIMEOUT */
}
export function m_cure_self(mtmp, dmg) {
    if (mtmp.mhp < mtmp.mhpmax) {
        if (canseemon(mtmp))
            pline_mon(mtmp, `${Monnam(mtmp)} looks better.`);
        /* C's own comment: player healing does 6d4; this used to do 1d8 */
        healmon(mtmp, d(3, 6), 0);
        dmg = 0;
    }
    return dmg;
}
export function mcast_psi_bolt(dmg) {
    /* C's own comment: prior to 3.4.0 Antimagic was setting the damage to 1 --
     * this made the spell virtually harmless to players with magic res. */
    if (Antimagic()) {
        shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        dmg = ((dmg + 1) / 2) | 0;
    } else {
        monstunseesu(M_SEEN_MAGR_MC);
    }
    if (dmg <= 5)
        pline('You get a slight ' + body_part(HEAD_MC) + 'ache.');
    else if (dmg <= 10)
        pline('Your brain is on fire!');
    else if (dmg <= 20)
        pline('Your ' + body_part(HEAD_MC) + ' suddenly aches painfully!');
    else
        pline('Your ' + body_part(HEAD_MC) + ' suddenly aches very painfully!');
    return dmg;
}
const HALF_PHDAM_MC = 56;             /* prop.h (js/const.js:2383) */
function HalfPhysicalDamage_mc() { return propOn(HALF_PHDAM_MC); }
export function mcast_geyser(dmg) {
    pline('A sudden geyser slams into you from nowhere!');
    dmg = d(8, 6);
    if (HalfPhysicalDamage_mc())
        dmg = ((dmg + 1) / 2) | 0;
    return dmg;
}
export async function mcast_fire_pillar(mtmp, dmg) {
    const u = game.u || {};
    pline('A pillar of fire strikes all around you!');
    const orig_dmg = dmg = d(8, 6);
    if (FireResistance()) {
        shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_FIRE_MC);
        dmg = 0;
    } else {
        monstunseesu(M_SEEN_FIRE_MC);
    }
    if (HalfSpellDamage()) dmg = ((dmg + 1) / 2) | 0;
    await burn_away_slime();
    await burnarmor(game.youmonst || u);
    await destroy_items(true, AD_FIRE, orig_dmg);
    await mon_spell_hits_spot(mtmp, AD_FIRE, u.ux, u.uy);
    return dmg;
}
export async function mcast_lightning(mtmp, dmg) {
    const u = game.u;
    let orig_dmg;
    let reflects;

    /* C:571 Soundeffect(se_bolt_of_lightning, 80) — audio only. */
    await pline('A bolt of lightning strikes down at you from above!');
    reflects = ureflects('It bounces off your %s%s.', '');      /* C:573 */
    orig_dmg = dmg = d(8, 6);                                   /* C:574 */
    if (reflects || ShockResistance()) {                        /* C:575 */
        shieldeff(u.ux, u.uy);
        dmg = 0;
        if (reflects) {
            monstseesu(M_SEEN_REFL_MC);
            return dmg;
        }
        monstunseesu(M_SEEN_REFL_MC);
        monstseesu(M_SEEN_ELEC_MC);
    } else {
        monstunseesu(M_SEEN_ELEC_MC | M_SEEN_REFL_MC);
    }
    if (HalfSpellDamage())                                      /* C:587-588 */
        dmg = Math.trunc((dmg + 1) / 2);
    /* C:589 (void) destroy_items(&gy.youmonst, AD_ELEC, orig_dmg);
     * js/zap.js's exported body takes `mon_is_hero` as its first argument
     * (js/zap.js:1233 already calls it this way for the wand-break arm). */
    await destroy_items(true, AD_ELEC, orig_dmg);
    /* C:594 — lightning might destroy iron bars if hero is on such a spot; done
     * BEFORE maybe blinding the hero via flashburn(). */
    await mon_spell_hits_spot(mtmp, AD_ELEC, u.ux, u.uy);
    /* C:596 — blind hero; no effect if already blind. */
    await flashburn(rnd(100), true);
    return dmg;
}
import { mkclass, set_malign } from './makemon.js';
import { makemon, upstart, mksobj, engr_at, wipe_engr_at } from './mklev.js';
import { add_to_minv } from './dokick.js';
import { monster_census } from './sit.js';
import { enexto_out } from './teleport.js';
import { tp_sensemon, You_hear } from './display.js';
import { makeplural, makesingular, vtense } from './objnam.js';
import { bogusmon } from './do_name.js';
import { make_confused } from './potion.js';
import { dobuzz, zap_over_floor } from './zap.js';
import { make_blinded } from './zap.js';
import { unconscious } from './pickup.js';
import { is_fainted } from './eat.js';
import { PM_CYCLOPS as PM_CYCLOPS_MC, PM_FLOATING_EYE as PM_FLOATING_EYE_MC } from './pm.generated.js';
import { PM_WIZARD_OF_YENDOR as PM_WIZARD_OF_YENDOR_MC, PM_HUMAN as PM_HUMAN_WA, PM_WATER_DEMON as PM_WATER_DEMON_WA, PM_VAMPIRE as PM_VAMPIRE_WA, PM_RED_DRAGON as PM_RED_DRAGON_WA, PM_TROLL as PM_TROLL_WA, PM_UMBER_HULK as PM_UMBER_HULK_WA, PM_XORN as PM_XORN_WA, PM_XAN as PM_XAN_WA, PM_COCKATRICE as PM_COCKATRICE_WA, PM_GUARDIAN_NAGA as PM_GUARDIAN_NAGA_WA, PM_TRAPPER as PM_TRAPPER_WA } from './pm.generated.js';
import { PROT_FROM_SHAPE_CHANGERS as PROT_FROM_SHAPE_CHANGERS_MC } from './const.js';

/* defsym.h:295/:346 monster-class symbols. */
const S_ANT_MC = 1, S_SNAKE_MC = 45;
/* hack.h:1152/:1164 makemon flags. */
const MM_ANGRY_MC = 0x00000020, MM_NOMSG_MC = 0x00020000;
/* hack.h:130 bodypart_types. */
const EYE_MC = 1;
/* monflag.h:97 — mondata.h:46 haseyes(ptr). */
const M1_NOEYES_MC = 0x00001000;
/* prop.h property ids used only by this block (js/const.js:2341/:2364). */
const CONFUSION_MC = 14, DETECT_MONSTERS_MC = 37;

/* C youprop.h:190 Detect_monsters (HDetect_monsters || EDetect_monsters). */
function Detect_monsters_mc() { return propOn(DETECT_MONSTERS_MC); }
/* C youprop.h:383 Free_action — EXTRINSIC only, unlike every other property
 * macro in this file, so it does not go through propOn(). */
function Free_action_mc() {
    const p = game.u?.uprops?.[FREE_ACTION_MC];
    return !!(p && p.extrinsic);
}
/* C youprop.h:83 HConfusion = u.uprops[CONFUSION].intrinsic. */
function HConfusion_mc() {
    return (game.u?.uprops?.[CONFUSION_MC]?.intrinsic | 0);
}
/* C youprop.h:399 Unaware — gm.multi < 0 && (unconscious() || is_fainted()).
 * js/display.js:6532 _disp_Unaware is the same body; copied rather than
 * imported because it is module-private there, and the two leaves it needs
 * (unconscious/is_fainted) are already exported from js/pickup.js and
 * js/eat.js.  RNG-free. */
function Unaware_mc() {
    if ((game.multi | 0) >= 0)
        return false;
    return !!(unconscious() || is_fainted());
}
/* C mondata.h:48 eyecount(ptr) — used only to decide singular vs plural, so
 * "more than 2" does not need to be distinguished. */
function eyecount_mc(ptr) {
    const haseyes = (((ptr && ptr.mflags1) | 0) & M1_NOEYES_MC) === 0;
    if (!haseyes)
        return 0;
    const mndx = (ptr && (ptr.pmidx ?? ptr.mnum)) | 0;
    return (mndx === PM_CYCLOPS_MC || mndx === PM_FLOATING_EYE_MC) ? 1 : 2;
}
/* C teleport.c:196 enexto(cc, xx, yy, mdat) — the out-param spelling.
 * js/teleport.js holds the body (enexto_out is its returning form, already
 * the GP_CHECKSCARY-then-NO_MM_FLAGS pair C spells); this is the two-line
 * adapter, exactly as js/teleport.js:1429 spells it for its own callers. */
function enexto_mc(cc, xx, yy, mdat) {
    const mm = enexto_out(xx, yy, mdat);
    if (!mm)
        return false;
    cc.x = mm.x;
    cc.y = mm.y;
    return true;
}
/* C's pline(fmt, a, b) for the two-%s formats below.  Substitutes positionally
 * and does NOT rescan the substituted text, which a chained String.replace
 * would (a monster name containing '%s' would eat the second argument). */
function fmt2_mc(fmt, a, b) {
    const args = [a, b];
    let i = 0;
    let out = '';
    for (let k = 0; k < fmt.length; k++) {
        if (fmt[k] === '%' && fmt[k + 1] === 's') {
            out += String(args[i++] ?? '');
            k++;
        } else {
            out += fmt[k];
        }
    }
    return out;
}

/* C mcastu.c:644-724 mcast_insects(mtmp) — MCAST_INSECTS.
 * C's own comment: "Try for insects, and if there are none left, go for
 * (sticks to) snakes.  -3."
 *
 * C's local is named `let`, which is a JS keyword; spelled `sym` here.
 * The whatbuf/strcpy dance in C exists only so that `arg` may alias either
 * makeplural's static buffer or whatbuf; in JS `what` is a value, so `arg` is
 * simply an(makesingular(what)) or what, which is what C computes. */
export async function mcast_insects(mtmp) {
    const u = game.u;
    let pm = mkclass(S_ANT_MC, 0);
    let mtmp2 = null;
    const sym = pm ? S_ANT_MC : S_SNAKE_MC;
    let success = false;
    const bypos = { x: 0, y: 0 };

    const oldseen = monster_census(true);
    const mlev = mtmp.m_lev | 0;
    let quan = (mlev < 2) ? 1 : rnd((mlev / 2) | 0);
    if (quan < 3)
        quan = 3;
    for (let i = 0; i <= quan; i++) {
        if (!enexto_mc(bypos, mtmp.mux | 0, mtmp.muy | 0, mon_data_mc(mtmp)))
            return;
        if ((pm = mkclass(sym, 0)) != null
            && (mtmp2 = await makemon(pm, bypos.x, bypos.y,
                                      MM_ANGRY_MC | MM_NOMSG_MC)) != null) {
            success = true;
            mtmp2.msleeping = 0;
            mtmp2.mpeaceful = 0;
            mtmp2.mtame = 0;
            set_malign(mtmp2);
        }
    }
    const newseen = monster_census(true);

    /* C's comment: not canspotmon() which includes unseen things sensed via
       warning */
    const seecaster = !!canseemon(mtmp) || !!tp_sensemon(mtmp)
                      || Detect_monsters_mc();
    let what = (sym === S_SNAKE_MC) ? 'snakes' : 'insects';
    if (Hallucination())
        what = makeplural(bogusmon().name);

    const mux_off = ((mtmp.mux | 0) !== (u.ux | 0)
                     || (mtmp.muy | 0) !== (u.uy | 0));
    let fmt = null;
    if (!seecaster) {
        if (newseen <= oldseen || Unaware_mc()) {
            /* C's comment: unseen caster fails or summons unseen critters,
               or unconscious hero ("You dream that you hear...") */
            await You_hear(`someone summoning ${what}.`);
        } else {
            /* C: unseen caster summoned seen critter(s) */
            const arg = (newseen === oldseen + 1) ? an(makesingular(what))
                                                  : what;
            if (!Deaf()) {
                /* C: Soundeffect(se_someone_summoning, 100) — the sound
                   channel has no counterpart in this port and draws nothing. */
                await You_hear(`someone summoning something, and ${arg} `
                               + `${vtense(arg, 'appear')}.`);
            } else {
                pline(`${upstart(arg)} ${vtense(arg, 'appear')}.`);
            }
        }
        /* C's comment: seen caster, possibly producing unseen--or just
           one--critters; hero is told what the caster is doing and doesn't
           necessarily observe complete accuracy of that caster's results (in
           other words, no need to fuss with visibility or singularization;
           player is told what's happening even if hero is unconscious) */
    } else if (!success) {
        fmt = '%s casts at a clump of sticks, but nothing happens.%s';
        what = '';
    } else if (sym === S_SNAKE_MC) {
        fmt = '%s transforms a clump of sticks into %s!';
    } else if (Invis() && !perceives(mon_data_mc(mtmp)) && mux_off) {
        fmt = '%s summons %s around a spot near you!';
    } else if (Displaced() && mux_off) {
        fmt = '%s summons %s around your displaced image!';
    } else {
        fmt = '%s summons %s!';
    }
    if (fmt)
        pline_mon(mtmp, fmt2_mc(fmt, Monnam(mtmp), what));
}

/* C mcastu.c:727-744 mcast_blind_you() — MCAST_BLIND_YOU.  RNG-free.
 * make_blinded's ONE body is js/zap.js:503; js/mhitu.js:333 is a silent no-op
 * stub of the same name (see the file-local-stub note on mdamageu above). */
export function mcast_blind_you() {
    /* C's comment: note: resists_blnd() doesn't apply here */
    if (!Blinded()) {
        const num_eyes = eyecount_mc(mon_data_mc(game.youmonst));

        pline('Scales cover your '
              + (num_eyes === 1 ? body_part(EYE_MC)
                                : makeplural(body_part(EYE_MC)))
              + '!');
        make_blinded(HalfSpellDamage() ? 100 : 200, false);
        if (!Blinded())
            /* C: Your1(vision_clears) — decl.c:48 "vision quickly clears." */
            pline('Your vision quickly clears.');
    } else {
        impossible('no reason for monster to cast blindness spell?');
    }
}

/* C mcastu.c:747-768 mcast_paralyze(mtmp) — MCAST_PARALYZE.  RNG-free.
 * The returned `dmg` is NOT damage on the Antimagic arm: C's own comment says
 * "to produce nomul(-1), not actual damage", and mcast_spell's caller does
 * `dmg = mcast_paralyze(mtmp)` and then mdamageu(mtmp, dmg) — so C really does
 * apply it as damage afterwards.  Ported as C has it (Cardinal Rule 1). */
export function mcast_paralyze(mtmp) {
    const u = game.u;
    let dmg = 0;

    if (Antimagic() || Free_action_mc()) {
        shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        if ((game.multi | 0) >= 0)
            pline('You stiffen briefly.');
        dmg = 1; /* C's comment: to produce nomul(-1), not actual damage */
    } else {
        if ((game.multi | 0) >= 0)
            pline('You are frozen in place!');
        dmg = 4 + (mtmp.m_lev | 0);
        if (HalfSpellDamage())
            dmg = ((dmg + 1) / 2) | 0;
        monstunseesu(M_SEEN_MAGR_MC);
    }
    nomul(-dmg);
    game.multi_reason = 'paralyzed by a monster';
    game.nomovemsg = 0;
    return dmg;
}

/* C mcastu.c:771-789 mcast_confuse_you(mtmp) — MCAST_CONFUSE_YOU.  RNG-free. */
export function mcast_confuse_you(mtmp) {
    const u = game.u;

    if (Antimagic()) {
        shieldeff(u.ux, u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        You_feel_mc('momentarily dizzy.');
    } else {
        const oldprop = !!HConfusion_mc();
        let dmg = mtmp.m_lev | 0;

        if (HalfSpellDamage())
            dmg = ((dmg + 1) / 2) | 0;
        make_confused(HConfusion_mc() + dmg, true);
        if (Hallucination())
            You_feel_mc(`${oldprop ? 'trippier' : 'trippy'}!`);
        else
            You_feel_mc(`${oldprop ? 'more ' : ''}confused!`);
        monstunseesu(M_SEEN_MAGR_MC);
    }
}

/* C mcastu.c:623-642 mcast_open_wounds(dmg) — MCAST_OPEN_WOUNDS.  RNG-free.
 * Structurally identical to mcast_psi_bolt above, which is why they share the
 * Antimagic prologue verbatim. */
export function mcast_open_wounds(dmg) {
    if (Antimagic()) {
        shieldeff(game.u.ux, game.u.uy);
        monstseesu(M_SEEN_MAGR_MC);
        dmg = ((dmg + 1) / 2) | 0;
    } else {
        monstunseesu(M_SEEN_MAGR_MC);
    }
    if (dmg <= 5)
        pline('Your skin itches badly for a moment.');
    else if (dmg <= 10)
        pline('Wounds appear on your body!');
    else if (dmg <= 20)
        pline('Severe wounds appear on your body!');
    else
        pline('Your body is covered with painful wounds!');
    return dmg;
}


// impossible() — C ref: pline.c debug-assertion logger; never alters game
// state. No-op mirrors the established convention for this helper elsewhere
// in the codebase (e.g. js/display.js's local impossible()).
function impossible(_msg, ..._args) { }

// pline_mon / pline_The — C ref: pline.c. set_msg_xy() (message-origin coord,
// used only for MSGTYPE color/mute rules) is not modeled; mirrors the
// established local convention in js/mhitu.js.
function pline_mon(_mtmp, msg) { pline(msg); }
function pline_The(msg) { pline('The ' + msg); }

export function Monnam(mtmp) {
    const s = mon_nam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: mondata.c cvt_adtyp_to_mseenres().
export function cvt_adtyp_to_mseenres(adtyp) {
    switch (adtyp) {
    case AD_MAGM: return 0x0001;
    case AD_FIRE: return 0x0002;
    case AD_COLD: return 0x0004;
    case AD_SLEE: return 0x0008;
    case AD_DISN: return 0x0010;
    case AD_ELEC: return 0x0020;
    case AD_DRST: return 0x0040;
    case AD_ACID: return 0x0080;
    default: return 0x0000;
    }
}
// C ref: monst.h m_seenres() = (mon->seen_resistance & mask) != 0.
function m_seenres(mtmp, mask) {
    // Algebraically 0 whenever mask is 0, regardless of seen_resistance —
    // castmu's only reachable case (cvt_adtyp_to_mseenres only returns
    // nonzero for AD_MAGM/FIRE/COLD/SLEE/DISN/ELEC/DRST/ACID, never for the
    // AD_SPEL/AD_CLRC attacks castmu is invoked with here); this avoids
    if (mask === 0) return false;
    return (mtmp.seen_resistance & mask) !== 0;
}

/* C ref: mcastu.c:26-36 — the per-caster spell lists.  "the spells in the list
 * should be in ascending level order".  Written with THIS FILE's MCAST_ enum
 * (mcastu.h's X-macro order is different; only the ids matter here, never the
 * numeric value). */
const mon_cleric_spells = [
    MCAST_OPEN_WOUNDS, MCAST_CURE_SELF, MCAST_CONFUSE_YOU, MCAST_PARALYZE,
    MCAST_BLIND_YOU, MCAST_INSECTS, MCAST_CURSE_ITEMS, MCAST_LIGHTNING,
    MCAST_FIRE_PILLAR, MCAST_GEYSER,
];
const mon_wizard_spells = [
    MCAST_PSI_BOLT, MCAST_CURE_SELF, MCAST_HASTE_SELF, MCAST_STUN_YOU,
    MCAST_DISAPPEAR, MCAST_WEAKEN_YOU, MCAST_DESTRY_ARMR, MCAST_CURSE_ITEMS,
    MCAST_AGGRAVATION, MCAST_SUMMON_MONS, MCAST_CLONE_WIZ, MCAST_DEATH_TOUCH,
];

function choose_monster_spell(mtmp, adtyp) {
    let list = null, len = 0;

    /* which spell list to use? */
    if (adtyp === AD_SPEL) {
        list = mon_wizard_spells;
        len = list.length;
    } else if (adtyp === AD_CLRC) {
        list = mon_cleric_spells;
        len = list.length;
    }

    if (!list || len < 1)
        return MCAST_PSI_BOLT;

    /* max spell level in this monster spell list */
    const maxlev = mcast_level[list[len - 1]];

    /* which level spell to cast? */
    let spellval = rn2(mtmp.m_lev | 0);
    if (spellval > maxlev && rn2(maxlev))
        spellval = rn2(maxlev);

    /* find the highest spell in the list we could cast */
    for (let i = len - 1; i >= 0; i--)
        if (mcast_level[list[i]] <= spellval
            && !spell_would_be_useless(mtmp, list[i]))
            return list[i];

    /* or return the first spell in the list */
    return list[0];
}

// C ref: mcastu.c is_undirected_spell().
function is_undirected_spell(spellnum) {
    return (mcast_flags[spellnum] & MCF_INDIRECT) !== 0;
}

// C ref: mcastu.c spell_would_be_useless().
function spell_would_be_useless(mtmp, spellnum) {
    if ((mcast_flags[spellnum] & MCF_HOSTILE) !== 0) {
        if (mtmp.mpeaceful) return true;
    }
    if ((mcast_flags[spellnum] & MCF_SIGHT) !== 0) {
        const mcouldseeu = couldsee(mtmp.mx, mtmp.my);
        if (!mcouldseeu) return true;
    }
    switch (spellnum) {
    /* C mcastu.c:934-939 — TWO arms 3.7 kept inside choose_*_spell() and 5.0
     * moved here, where the descending list walk can reach them repeatedly.
     * BOTH DRAW RNG, so omitting them is an RNG-shape error, not just a
     * behaviour one. */
    case MCAST_DEATH_TOUCH:
        if ((Antimagic() || Hallucination()) && !rn2(2))
            return true;
        break;
    case MCAST_GEYSER:
        if (!rn2(5))
            return true;
        break;
    case MCAST_CLONE_WIZ:
        if (!mtmp.iswiz || (game.context && game.context.no_of_wizards > 1))
            return true;
        break;
    case MCAST_AGGRAVATION:
        if (!has_aggravatables(mtmp))
            return rn2(100) !== 0;
        break;
    case MCAST_HASTE_SELF:
        if (mtmp.permspeed === MFAST)
            return true;
        break;
    case MCAST_DISAPPEAR:
        if (mtmp.minvis || mtmp.invis_blkd)
            return true;
        if (mtmp.mpeaceful && !SeeInvisible())
            return true;
        break;
    case MCAST_CURE_SELF:
        if (mtmp.mhp === mtmp.mhpmax)
            return true;
        break;
    case MCAST_BLIND_YOU:
        if (Blinded())
            return true;
        break;
    default:
        break;
    }
    return false;
}

// C ref: mcastu.c mcast_spell(). Only MCAST_HASTE_SELF's body (the sole
// port; the sibling spell effects are genuinely unreached, stubbed per the
async function mcast_spell(mtmp, dmg, spellnum) {
    if (dmg < 0) {
        impossible('monster cast spell (%d) with negative dmg (%d)?', spellnum, dmg);
        return;
    }
    if (dmg === 0 && !is_undirected_spell(spellnum)) {
        impossible('cast directed wizard spell (%d) with dmg=0?', spellnum);
        return;
    }
    switch (spellnum) {
    case MCAST_DEATH_TOUCH:
        await mcast_death_touch(mtmp);
        dmg = 0;
        break;
    case MCAST_CLONE_WIZ:
        await mcast_clone_wiz(mtmp);
        dmg = 0;
        break;
    case MCAST_SUMMON_MONS:
        await mcast_summon_mons(mtmp);
        dmg = 0;
        break;
    case MCAST_AGGRAVATION:
        /* C mcastu.c:aggravation arm announces the effect before waking
         * monsters.  This is observable even though aggravate() itself is
         * RNG-free. */
        You_feel_mc('that monsters are aware of your presence.');
        aggravate();
        dmg = 0;
        break;
    case MCAST_CURSE_ITEMS:
        /* C's rndcurse arm uses the same lead-in as the throne effect. */
        You_feel_mc('as if you need some help.');
        await rndcurse();
        dmg = 0;
        break;
    case MCAST_DESTRY_ARMR:
        await mcast_destroy_armor();
        dmg = 0;
        break;
    case MCAST_WEAKEN_YOU:
        await mcast_weaken_you(mtmp, dmg);
        dmg = 0;
        break;
    case MCAST_DISAPPEAR:
        mcast_disappear(mtmp);
        dmg = 0;
        break;
    case MCAST_STUN_YOU:
        mcast_stun_you(dmg);
        dmg = 0;
        break;
    case MCAST_HASTE_SELF:
        mon_adjust_speed(mtmp, 1, null);
        dmg = 0;
        break;
    case MCAST_CURE_SELF:
        dmg = m_cure_self(mtmp, dmg);
        break;
    case MCAST_PSI_BOLT:
        dmg = mcast_psi_bolt(dmg);
        break;
    case MCAST_GEYSER:
        dmg = mcast_geyser(dmg);
        break;
    case MCAST_FIRE_PILLAR:
        dmg = await mcast_fire_pillar(mtmp, dmg);
        break;
    case MCAST_LIGHTNING:
        dmg = await mcast_lightning(mtmp, dmg);
        break;
    case MCAST_INSECTS:
        await mcast_insects(mtmp);
        dmg = 0;
        break;
    case MCAST_BLIND_YOU:
        mcast_blind_you();
        dmg = 0;
        break;
    case MCAST_PARALYZE:
        dmg = mcast_paralyze(mtmp);
        break;
    case MCAST_CONFUSE_YOU:
        mcast_confuse_you(mtmp);
        dmg = 0;
        break;
    case MCAST_OPEN_WOUNDS:
        dmg = mcast_open_wounds(dmg);
        break;
    default:
        impossible('mcastu: invalid magic spell (%d)', spellnum);
        dmg = 0;
        break;
    }
    if (dmg) {
        /* C mcastu.c:896 mdamageu -> done(): in wizard/explore mode done()
         * opens its blocking "Die?" prompt right here and RETURNS, so the
         * caster's remaining attacks follow it.  Drain the deferred death in
         * place (same as js/mhitu.js:3699). */
        const _deathBefore = game._pendingDeath || null;
        await mdamageu(mtmp, dmg);
        if (game._pendingDeath && game._pendingDeath !== _deathBefore)
            await drain_pending_death_in_place();
    }
}

// C ref: nethack-c/src/mcastu.c:177 castmu()
export async function castmu(mtmp, mattk, thinks_it_foundyou, foundyou) {
    const ml = mtmp.m_lev;
    let dmg;
    let ret;
    let spellnum = 0;

    if ((mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC) && ml) {
        let cnt = 40;
        do {
            spellnum = choose_monster_spell(mtmp, mattk.adtyp);
            /* not trying to attack?  don't allow directed spells */
            if (!thinks_it_foundyou) {
                if (!is_undirected_spell(spellnum)
                    || spell_would_be_useless(mtmp, spellnum)) {
                    if (foundyou)
                        impossible("spellcasting monster found you and doesn't know it?");
                    return M_ATTK_MISS;
                }
                break;
            }
        } while (--cnt > 0 && spell_would_be_useless(mtmp, spellnum));
        if (cnt === 0)
            return M_ATTK_MISS;
    }

    /* monster unable to cast spells? */
    if (mtmp.mcan || mtmp.mspec_used || !ml
        || m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp))) {
        cursetxt(mtmp, is_undirected_spell(spellnum));
        return M_ATTK_MISS;
    }

    if (mattk.adtyp === AD_SPEL || mattk.adtyp === AD_CLRC) {
        /* monst->m_lev is unsigned (uchar), monst->mspec_used is int */
        mtmp.mspec_used = (mtmp.m_lev < 8) ? (10 - mtmp.m_lev) : 2;
    }

    /* Monster can cast spells, but is casting a directed spell at the
     * wrong place? */
    if (!foundyou && thinks_it_foundyou
        && !is_undirected_spell(spellnum)) {
        pline_mon(mtmp, (canseemon(mtmp) ? Monnam(mtmp) : 'Something')
            + ' casts a spell at '
            + (is_waterwall(mtmp.mux, mtmp.muy) ? 'empty water' : 'thin air') + '!');
        return M_ATTK_MISS;
    }

    nomul(0);
    if (rn2(ml * 10) < (mtmp.mconf ? 100 : 20)) { /* fumbled attack */
        if (canspotmon(mtmp) && !Deaf()) {
            pline_The('air crackles around ' + mon_nam(mtmp) + '.');
        }
        return M_ATTK_MISS;
    }
    if (canspotmon(mtmp) || !is_undirected_spell(spellnum)) {
        let suffix;
        if (is_undirected_spell(spellnum)) {
            suffix = '';
        } else if (Invis() && !perceives(mtmp.data) && !u_at(mtmp.mux, mtmp.muy)) {
            suffix = ' at a spot near you';
        } else if (Displaced() && !u_at(mtmp.mux, mtmp.muy)) {
            suffix = ' at your displaced image';
        } else {
            suffix = ' at you';
        }
        pline_mon(mtmp, (canspotmon(mtmp) ? Monnam(mtmp) : 'Something')
            + ' casts a spell' + suffix + '!');
    }

    /*
     * As these are spells, the damage is related to the level
     * of the monster casting the spell.
     */
    if (!foundyou) {
        dmg = 0;
        if (mattk.adtyp !== AD_SPEL && mattk.adtyp !== AD_CLRC) {
            impossible(
                '%s casting non-hand-to-hand version of hand-to-hand spell %d?',
                Monnam(mtmp), mattk.adtyp);
            return M_ATTK_MISS;
        }
    } else if (mattk.damd) {
        dmg = d(Math.trunc(ml / 2) + mattk.damn, mattk.damd);
    } else {
        dmg = d(Math.trunc(ml / 2) + 1, 6);
    }
    if (HalfSpellDamage())
        dmg = Math.trunc((dmg + 1) / 2);

    ret = M_ATTK_HIT;
    switch (mattk.adtyp) {
    case AD_FIRE:
        pline("You're enveloped in flames.");
        if (FireResistance()) {
            shieldeff(game.u.ux, game.u.uy);
            pline('But you resist the effects.');
            monstseesu(0x0002 /* M_SEEN_FIRE */);
            dmg = 0;
        } else {
            monstunseesu(0x0002 /* M_SEEN_FIRE */);
        }
        await burn_away_slime();
        await mon_spell_hits_spot(mtmp, AD_FIRE, game.u.ux, game.u.uy);
        break;
    case AD_COLD:
        pline("You're covered in frost.");
        if (ColdResistance()) {
            shieldeff(game.u.ux, game.u.uy);
            pline('But you resist the effects.');
            monstseesu(0x0004 /* M_SEEN_COLD */);
            dmg = 0;
        } else {
            monstunseesu(0x0004 /* M_SEEN_COLD */);
        }
        await mon_spell_hits_spot(mtmp, AD_COLD, game.u.ux, game.u.uy);
        break;
    case AD_MAGM:
        You('are hit by a shower of missiles!');
        if (Antimagic()) {
            shieldeff(game.u.ux, game.u.uy);
            pline_The('missiles bounce off!');
            monstseesu(0x0001 /* M_SEEN_MAGR */);
            dmg = 0;
        } else {
            dmg = d(Math.trunc(mtmp.m_lev / 2) + 1, 6);
            monstunseesu(0x0001 /* M_SEEN_MAGR */);
        }
        await mon_spell_hits_spot(mtmp, AD_MAGM, game.u.ux, game.u.uy);
        break;
    case AD_SPEL:
    case AD_CLRC:
        await mcast_spell(mtmp, dmg, spellnum);
        dmg = 0;
        break;
    }
    if (dmg)
        await mdamageu(mtmp, dmg);
    return ret;
}

// ── helpers needed by buzzmu (ported elsewhere but imported inline) ──
function flash_str(idx, _something) {
    const types = ["magic missile", "fire", "cold", "sleep",
                   "disintegration", "lightning", "poison gas", "acid"];
    return types[idx] || "energy";
}
function sgn(x) { return x > 0 ? 1 : x < 0 ? -1 : 0; }

// ── BZ_ macros from zap.h ──
function BZ_VALID_ADTYP(adtyp) { return adtyp >= 1 && adtyp <= 8; }
function BZ_OFS_AD(adtyp) { return adtyp - 1; }
function BZ_M_SPELL(ofs) { return ofs + 12; }

// ── unported helper ──
export async function buzz(type, dmg, x, y, dx, dy) {
    /* C buzz() is the monster-spell spelling of the same ray engine used by
     * dobuzz(); retain the monster origin/direction and serialize its async
     * display/effect work before the caller continues. */
    await dobuzz(type, dmg, x, y, dx, dy, true, false, false);
}

// C ref: mcastu.c buzzmu.
export async function buzzmu(mtmp, mattk) {
    /* don't print constant stream of curse messages for 'normal'
       spellcasting monsters at range */
    if (!BZ_VALID_ADTYP(mattk.adtyp))
        return M_ATTK_MISS;

    if (mtmp.mcan || m_seenres(mtmp, cvt_adtyp_to_mseenres(mattk.adtyp))) {
        cursetxt(mtmp, false);
        return M_ATTK_MISS;
    }
    if (lined_up(mtmp) && rn2(3)) {
        nomul(0);
        if (canseemon(mtmp))
            pline_mon(mtmp, "%s zaps you with a %s!", Monnam(mtmp),
                  flash_str(BZ_OFS_AD(mattk.adtyp), false));
        game.gb.buzzer = mtmp;
        await buzz(BZ_M_SPELL(BZ_OFS_AD(mattk.adtyp)), mattk.damn | 0,
                   mtmp.mx, mtmp.my, sgn(game.gt.tbx), sgn(game.gt.tby));
        game.gb.buzzer = 0;
        return M_ATTK_HIT;
    }
    return M_ATTK_MISS;
}

// wizard.c:824-833 — flavor-text tables rolled by cuss().
const random_insult = [
    'antic', 'blackguard', 'caitiff', 'chucklehead',
    'coistrel', 'craven', 'cretin', 'cur',
    'dastard', 'demon fodder', 'dimwit', 'dolt',
    'fool', 'footpad', 'imbecile', 'knave',
    'maledict', 'miscreant', 'niddering', 'poltroon',
    'rattlepate', 'reprobate', 'scapegrace', 'varlet',
    'villein',
    'wittol', 'worm', 'wretch',
];
const random_malediction = [
    'Hell shall soon claim thy remains,', 'I chortle at thee, thou pathetic',
    'Prepare to die, thou', 'Resistance is useless,',
    'Surrender or die, thou', 'There shall be no mercy, thou',
    'Thou shalt repent of thy cunning,', 'Thou art as a flea to me,',
    'Thou art doomed,', 'Thy fate is sealed,',
    'Verily, thou shalt be one dead',
];

// verbalize() — pline.c:479-494. Wraps line in quotes and sets/clears the
// transient PLINE_VERBALIZE flag around a plain pline call; no RNG, no
// persistent state (matches the established impossible()/pline_mon() inline
// convention above rather than a throwing stub).
function verbalize(line) {
    pline(`"${line}"`);
}

// mondata.h:142 is_minion(ptr) — (ptr->mflags2 & M2_MINION) != 0.
const M2_MINION = 0x00001000;
function is_minion(data) {
    return !!(data && (data.mflags2 & M2_MINION) !== 0);
}

// monst.h:279-280 is_lminion(mon) — is_minion(mon->data) && lawful.
function is_lminion(mtmp) {
    return is_minion(mtmp.data) && mon_aligntyp(mtmp) === A_LAWFUL;
}

// wizard.c:60 amulet()/mklev.c:982 precedent read u.uhave.amulet from a
// channel exists — see js/mapstate_game_bridge.js). The only ground truth
// the replay carries is the hero's actual invent chain, so derive the same
// boolean the cache would hold by scanning it for the unique amulet otyp.
const AMULET_OF_YENDOR = 213;
function uhaveAmulet() {
    for (let otmp = game.invent; otmp; otmp = otmp.nobj)
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR)
            return true;
    return false;
}

// C ref: wizard.c:845-883 cuss() — insult or intimidate the player.
export function cuss(mtmp) {
    if (Deaf())
        return;
    if (mtmp.iswiz) {
        if (!rn2(5)) {
            pline(`${Monnam(mtmp)} laughs fiendishly.`);
        } else if (uhaveAmulet() && !rn2(random_insult.length)) {
            verbalize(`Relinquish the amulet, ${random_insult[rn2(random_insult.length)]}!`);
        } else if (game.u.uhp < 5 && !rn2(2)) { /* Panic */
            // the format-selecting rn2(2) precedes the insult draw.
            const panicked = rn2(2);
            const insult = random_insult[rn2(random_insult.length)];
            verbalize(panicked
                ? `Even now thy life force ebbs, ${insult}!`
                : `Savor thy breath, ${insult}, it be thy last!`);
        } else if (mtmp.mhp < 5 && !rn2(2)) { /* Parthian shot */
            verbalize(rn2(2) ? 'I shall return.' : "I'll be back.");
        } else {
            const maledict = random_malediction[rn2(random_malediction.length)];
            const insult = random_insult[rn2(random_insult.length)];
            verbalize(`${maledict} ${insult}!`);
        }
    } else if (is_lminion(mtmp)
               && !(mtmp.isminion && EMIN(mtmp).renegade)) {
        com_pager('angel_cuss');
    } else {
        if (!rn2(is_minion(mtmp.data) ? 100 : 5))
            pline(`${Monnam(mtmp)} casts aspersions on your ancestry.`);
        else
            com_pager('demon_cuss');
    }
    wake_nearto(mtmp.mx, mtmp.my, 5 * 5);
}

// ── local helpers for death_inflicted_by (not exported from their modules) ──
const M2_PNAME = 0x00080000;

function Mgender(mtmp) {
    return mtmp.female ? FEMALE : MALE;
}

function type_is_pname(ptr) {
    return (ptr.mflags2 & M2_PNAME) !== 0;
}

/* C do_name.c:1302-1308 pmname(struct permonst *pm, int mgender):
 *   if (mgender < MALE || mgender >= NUM_MGENDERS || !pm->pmnames[mgender])
 *       mgender = NEUTRAL;
 *   return pm->pmnames[mgender];
 * `pm` here is a permonstTemplate()-shaped object carrying `.pmnames`
 * (js/makemon.js permonstTemplate / monPmname). */
function pmname(pm, mgender) {
    let g = mgender;
    if (g < MALE || g >= NUM_MGENDERS || !pm.pmnames[g])
        g = NEUTRAL;
    return pm.pmnames[g];
}

function Sprintf(fmt, ...args) {
    let ai = 0;
    return fmt.replace(/%s|%ld/g, function() { return String(args[ai++]); });
}

export function death_inflicted_by(outbuf, deathreason, mtmp) {
    let result = deathreason;
    if (mtmp) {
        let mptr = mtmp.data;
        /* C mcastu.c:417 — champtr = ismnum(mtmp->cham) ? &mons[mtmp->cham] : mptr.
         * permonstTemplate(mndx) is the JS stand-in for &mons[mndx] (js/makemon.js). */
        let champtr = (ismnum(mtmp.cham)) ? permonstTemplate(mtmp.cham) : mptr;
        let realnm = pmname(champtr, Mgender(mtmp));
        let fakenm = pmname(mptr, Mgender(mtmp));

        if (!type_is_pname(champtr) && !the_unique_pm(mptr))
            realnm = an(realnm);

        result += Sprintf(" inflicted by %s%s",
                the_unique_pm(mptr) ? "the " : "", realnm);

        /* C mcastu.c:429 `champtr != mptr` compares two mons[] row pointers, which
         * is an index comparison (distinct rows have distinct addresses).  A raw JS
         * `!==` here would be object identity and therefore ALWAYS true, since the
         * champtr branch above mints a fresh permonstTemplate object — printing a
         * spurious " imitating ..." for every unshifted caster.  Compare pmidx. */
        if (champtr.pmidx !== mptr.pmidx)
            result += Sprintf(" imitating %s", an(fakenm));
    }
    return result;
}
