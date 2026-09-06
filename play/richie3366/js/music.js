// music.js — Musical instruments (apply → do_play_instrument).
// C ref: music.c do_play_instrument / do_improvisation / awaken_monsters /
//        awaken_soldiers / put_monsters_to_sleep / charm_snakes /
//        calm_nymphs / charm_monsters / do_pit / do_earthquake /
//        generic_lvl_desc (D-0972 / D-0974 / D-0977).
//
// Branch envelope: LEATHER_DRUM + DRUM_OF_EARTHQUAKE (D-0972) +
// MAGIC/WOODEN_FLUTE sleep/snake + MAGIC/WOODEN_HARP charm/nymph +
// FIRE/FROST_HORN ubuzz/zapyourself + BUGLE awaken_soldiers (D-0974) +
// passtune getlin / Castle drawbridge open/close + Mastermind hints
// (D-0977).
// Named omissions: Hero_playnotes audio; onscary wiz/angel/rider; can_blow poly;
// flooreffects full (boulder→pit thin); maketrap shop-hole named
// (D-1280 PIT/HOLE set_levltyp + D-1296 DRAWBRIDGE_UP ice in trap.js);
// Soundeffect; count_level_features on
// fountain/sink morph; sleep_monst defended(AD_SLEE)/shieldeff;
// tamedog givemsg pline; set_entity crush on open/close.

import { game } from './gstate.js';
import { rn2, rnd, rn1, rnl, d } from './rng.js';
import { pline, newsym, canseemon, Norep, You_feel } from './display.js';
import { yn_function, getlin } from './getline.js';
import { objectNames, TOOL_CLASS, objects } from './objects.js';
import {
    ECMD_OK, ECMD_TIME, TIMEOUT, STRAT_WAITMASK, NOTELL,
    M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER,
    FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, SCORR, CORR, ROOM, SDOOR, DOOR,
    D_NODOOR, PIT, TT_PIT, TT_BURIEDBALL, AM_SANCTUM, AM_MASK, Amask2align,
    is_pit, u_at, COLNO, ROWNO, SHOPBASE, ARTICLE_THE, ARTICLE_A, SUPPRESS_SADDLE,
    XKILL_NOMSG, NO_KILLER_PREFIX, Upolyd, has_mgivenname,
    Is_astralevel, In_endgame, In_sokoban, In_V_tower,
    BZ_OFS_AD, KILLED_BY, DRAWBRIDGE_DOWN, IS_DRAWBRIDGE, Never_mind,
    Is_stronghold, ACH_TUNE, isok,
} from './const.js';
import { A_WIS, A_DEX, acurr, exercise, Fumbling } from './attrib.js';
import { cxname, an, xname, The, the, otense } from './objnam.js';
import {
    mindless, G_UNIQ, is_flyer, is_clinger, humanoid, is_hider, nolimbs,
    M1_SLITHY, is_mercenary, MR_SLEEP,
} from './monsters.js';
import { dist2 } from './hacklib.js';
import { Monnam, mon_nam, x_monnam } from './do_name.js';
import { cansee, recalc_block_point } from './vision.js';
import { m_at, wakeup, seemimic } from './mon.js';
import { maketrap, t_at, set_utrap, reset_utrap, deltrap, selftouch, mselftouch } from './trap.js';
import {
    fillholetyp, liquid_flow,
} from './dig.js';
import { obj_extract_self, delobj, objects_at } from './mkobj.js';
import { losehp, maybe_half_phys, in_rooms } from './hack.js';
import { xkilled } from './uhitm.js';
import { makeknown, consume_obj_charge } from './invent.js';
import { align_str, uhim } from './roles.js';
import { cvt_sdoor_to_door } from './detect.js';
import { add_damage } from './shk.js';
import { PM_ARCHEOLOGIST, monsterNames } from './generated/monsters_data.js';
import { getdir } from './lock.js';
import { tamedog } from './dog.js';
import { zapyourself, ubuzz, flash_str } from './zap.js';
import {
    find_drawbridge, is_drawbridge_wall,
    open_drawbridge, close_drawbridge,
} from './dbridge.js';
import { record_achievement } from './insight.js';

const WOODEN_FLUTE = objectNames.indexOf('WOODEN_FLUTE');
const MAGIC_FLUTE = objectNames.indexOf('MAGIC_FLUTE');
const TOOLED_HORN = objectNames.indexOf('TOOLED_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const WOODEN_HARP = objectNames.indexOf('WOODEN_HARP');
const MAGIC_HARP = objectNames.indexOf('MAGIC_HARP');
const BUGLE = objectNames.indexOf('BUGLE');
const LEATHER_DRUM = objectNames.indexOf('LEATHER_DRUM');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');
const BOULDER = objectNames.indexOf('BOULDER');
const PM_GUARD = monsterNames.indexOf('PM_GUARD');

/** C monattk.h — AD_FIRE/AD_COLD for horn buzz. */
const AD_FIRE = 2;
const AD_COLD = 3;

const PLAY_NORMAL = 0x00;
const PLAY_STUNNED = 0x01;
const PLAY_CONFUSED = 0x02;
const PLAY_HALLU = 0x04;

const NOTES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
/** C music.c beats[] — mundane leather-drum riff nouns (ROLL_FROM). */
const BEATS = [
    'stepper', 'one drop', 'slow two', 'triple stroke roll',
    'double shuffle', 'half-time shuffle', 'second line', 'train',
];

const INTO_A_CHASM = ' into a chasm';

function Deaf() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

function Stunned() {
    const u = game.u || {};
    return !!((u.HStun | 0) || u.Stunned);
}

function Confusion() {
    const u = game.u || {};
    return !!((u.HConfusion | 0) || u.Confusion);
}

function Hallucination() {
    const u = game.u || {};
    return !!((u.HHallucination | 0) || u.Hallucination);
}

function Levitation() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

function Flying() {
    const u = game.u || {};
    if (u.Flying) return true;
    return !!(((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0));
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === (pm | 0);
}

/** C mondata.h slithy — M1_SLITHY. */
function slithy(ptr) {
    return !!((ptr?.mflags1 | 0) & M1_SLITHY);
}

/** C mondata.h ceiling_hider — hider that clings/flies (not mimic). */
function ceiling_hider(ptr) {
    if (!is_hider(ptr)) return false;
    return (is_clinger(ptr) && ptr.mlet !== 'S_MIMIC') || is_flyer(ptr);
}

/** C ref: objnam.c yname — invent → "your ", else "the ". */
function yname(obj) {
    const carried = (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

/** C potion.c incr_itimeout — TIMEOUT field only. */
function incr_itimeout_HDeaf(incr) {
    const u = game.u || (game.u = {});
    const cur = u.HDeaf | 0;
    const next = ((cur & TIMEOUT) + (incr | 0)) & TIMEOUT;
    u.HDeaf = (cur & ~TIMEOUT) | next;
}

/** C ref: pline.c You_hear — acoustics/Deaf; Unaware/Underwater deferred. */
async function You_hear(line) {
    if (Deaf()) return;
    await pline(`You hear ${line}`);
}

/** C ref: hacklib.c mungspaces — trim ends, compress internal spaces. */
function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/** C ref: do_name.c Amonnam — highc(a_monnam). */
function Amonnam(mtmp) {
    const s = x_monnam(mtmp, ARTICLE_A, null, 0, false) || 'it';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C ref: zap.c resist — TOOL_CLASS alev=10 (instrument); tell/HP deferred.
 */
function resist(mtmp, oclass, _damage, _tell) {
    let alev;
    if (oclass === TOOL_CLASS) alev = 10;
    else alev = game.u?.ulevel | 0;
    let dlev = mtmp.m_lev | 0;
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = 1;
    const mr = mtmp.data?.mr | 0;
    return rn2(100 + alev - dlev) < mr;
}

/** C ref: music.c unique_corpstat gate via G_UNIQ (long-worm-tail polish deferred). */
function unique_corpstat(ptr) {
    return !!((ptr?.geno ?? 0) & G_UNIQ);
}

/** C ref: monmove.c / muse.c mdistu — squared distance to hero. */
function mdistu(mtmp) {
    const u = game.u;
    return dist2(mtmp.mx | 0, mtmp.my | 0, u.ux | 0, u.uy | 0);
}

/**
 * C ref: monmove.c onscary — <0,0> is auditory (musical) scare → TRUE
 * after wiz/lminion/angel/rider gate. Magical Elbereth/scroll arms deferred.
 */
function onscary(x, y, mtmp) {
    const auditory_scare = (x === 0 && y === 0);
    // iswiz / is_lminion / PM_ANGEL / is_rider deferred → rare immunities
    if (mtmp.iswiz) return false;
    if (auditory_scare) return true;
    return false;
}

/**
 * C ref: monmove.c monflee(fleetime=0, first=FALSE, fleemsg) — set mflee;
 * flees_light rn2(10)/verbalize and Vrock gas deferred.
 */
async function monflee(mtmp, fleetime, first, fleemsg) {
    if (!mtmp || (mtmp.mhp | 0) <= 0) return;
    if (!first || !mtmp.mflee) {
        if (!fleetime) mtmp.mfleetim = 0;
        else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += mtmp.mfleetim | 0;
            if (fleetime === 1) fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        if (!mtmp.mflee && fleemsg) {
            const ap = mtmp.m_ap_type | 0;
            if (canseemon(mtmp) && ap !== M_AP_FURNITURE && ap !== M_AP_OBJECT) {
                // flees_light / immobile flinch deferred
                await pline(`${Monnam(mtmp)} turns to flee.`);
            }
        }
        mtmp.mflee = 1;
    }
    // C: monflee always mon_track_clear — local music copy
    if (mtmp.mtrack) {
        for (let j = 0; j < mtmp.mtrack.length; j++) {
            mtmp.mtrack[j] = { x: 0, y: 0 };
        }
    }
}

/**
 * C ref: music.c awaken_scare — wake; scary → resist(TOOL) then onscary/flee.
 */
async function awaken_scare(mtmp, scary) {
    mtmp.msleeping = 0;
    mtmp.mcanmove = 1;
    mtmp.mfrozen = 0;
    if (!unique_corpstat(mtmp.data)
        && ((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0) {
        mtmp.mstrategy &= ~STRAT_WAITMASK;
    } else if (scary
        && !mindless(mtmp.data)
        && !resist(mtmp, TOOL_CLASS, 0, NOTELL)
        && onscary(0, 0, mtmp)) {
        await monflee(mtmp, 0, false, true);
    }
}

/** C ref: music.c awaken_monsters */
async function awaken_monsters(distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || mtmp.mhp <= 0) continue;
        const distm = mdistu(mtmp);
        if (distm < distance) {
            await awaken_scare(mtmp, distm < Math.floor(distance / 3));
        }
    }
}

/** C ref: youprop.h Blind */
function Blind() {
    const u = game.u || {};
    return !!((u.HBlind | 0) || (u.EBlind | 0) || u.Blind);
}

function Tobjnam(obj, verb) {
    const bp = The(xname(obj));
    return verb ? `${bp} ${otense(obj, verb)}` : bp;
}

/** C ref: objnam.c Yname2 — highc(yname). */
function Yname2(obj) {
    const s = yname(obj);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C ref: do_name.c a_monnam */
function a_monnam(mtmp) {
    return x_monnam(mtmp, ARTICLE_A, null, 0, false) || 'it';
}

/**
 * C ref: mhitm.c sleep_monst — music TOOL_CLASS path (D-0974).
 * defended(AD_SLEE)/shieldeff deferred.
 */
function sleep_monst_music(mon, amt, how) {
    if (!mon) return 0;
    if (how >= 0 && !mon.msleeping && !(mon.mfrozen | 0)
        && mon.data?.mlet === 'S_MIMIC'
        && ((mon.m_ap_type | 0) === M_AP_FURNITURE
            || (mon.m_ap_type | 0) === M_AP_OBJECT)) {
        seemimic(mon);
    }
    const sleepBits = (mon.data?.mresists | 0)
        | (mon.mextrinsics | 0) | (mon.mintrinsics | 0);
    if ((sleepBits & MR_SLEEP)
        || (how >= 0 && resist(mon, how, 0, NOTELL))) {
        return 0;
    }
    if (mon.mcanmove) {
        mon.meating = 0;
        amt = (amt | 0) + (mon.mfrozen | 0);
        if (amt > 0) {
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else {
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

/**
 * C ref: mhitm.c slept_monst — grabber release; sticks/pline_mon thin.
 */
async function slept_monst(mon) {
    const u = game.u || {};
    const helpless = !!(mon?.msleeping || !mon?.mcanmove);
    if (helpless && mon === u.ustuck && !u.uswallow) {
        // sticks(youmonst) deferred → treat as non-sticking
        await pline(`${Monnam(mon)}'s grip relaxes.`);
        u.ustuck = null;
        if (game.youmonst) game.youmonst.ustuck = null;
    }
}

/** C ref: music.c put_monsters_to_sleep */
async function put_monsters_to_sleep(distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (mdistu(mtmp) < distance
            && sleep_monst_music(mtmp, d(10, 10), TOOL_CLASS)) {
            mtmp.msleeping = 1;
            await slept_monst(mtmp);
        }
    }
}

/** C ref: music.c charm_snakes — peaceful sway; NOT tamed. */
async function charm_snakes(distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (mtmp.data?.mlet === 'S_SNAKE' && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            const was_peaceful = mtmp.mpeaceful;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            const could_see_mon = canseemon(mtmp);
            mtmp.mundetected = 0;
            newsym(mtmp.mx, mtmp.my);
            if (canseemon(mtmp)) {
                if (!could_see_mon) {
                    await pline(
                        `You notice ${a_monnam(mtmp)}, swaying with the music.`,
                    );
                } else {
                    await pline(
                        `${Monnam(mtmp)} freezes, then sways with the music${
                            was_peaceful ? '' : ', and now seems quieter'
                        }.`,
                    );
                }
            }
        }
    }
}

/** C ref: music.c calm_nymphs */
async function calm_nymphs(distance) {
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (mtmp.data?.mlet === 'S_NYMPH' && mtmp.mcanmove
            && mdistu(mtmp) < distance) {
            mtmp.msleeping = 0;
            mtmp.mpeaceful = 1;
            mtmp.mavenge = 0;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp)) {
                await pline(
                    `${Monnam(mtmp)} listens cheerfully to the music, then seems quieter.`,
                );
            }
        }
    }
}

/**
 * C ref: music.c awaken_soldiers `:161` — bugler==&youmonst ? ulevel/mdistu
 * : bugler mlevel/dist2. Hero callers pass null (D-0974); the MUSE_BUGLE
 * use arm passes the monster bugler.
 */
export async function awaken_soldiers(bugler) {
    const u = game.u || {};
    const distance = (bugler
        ? (bugler.data?.mlevel | 0) : (u.ulevel | 0)) * 30;
    for (const mtmp of game.fmon || []) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (is_mercenary(mtmp.data)
            && (mtmp.data?.mndx | 0) !== (PM_GUARD | 0)) {
            if (!mtmp.mtame) mtmp.mpeaceful = 0;
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            if (canseemon(mtmp)) {
                await pline(`${Monnam(mtmp)} is now ready for battle!`);
            } else if (!Deaf()) {
                await Norep(
                    'You hear the rattle of battle gear being readied.',
                );
            }
        } else {
            const distm = bugler
                ? dist2(bugler.mx | 0, bugler.my | 0,
                    mtmp.mx | 0, mtmp.my | 0)
                : mdistu(mtmp);
            if (distm < distance) {
                await awaken_scare(mtmp, distm < Math.floor(distance / 3));
            }
        }
    }
}

/**
 * C ref: music.c charm_monsters — resist(TOOL) or isshk → tamedog.
 */
async function charm_monsters(distance) {
    const u = game.u || {};
    let dist = distance | 0;
    if (u.uswallow) dist = 0;
    const list = [...(game.fmon || [])];
    for (const mtmp of list) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (mdistu(mtmp) <= dist) {
            if (!resist(mtmp, TOOL_CLASS, 0, NOTELL) || mtmp.isshk) {
                await tamedog(mtmp, null, true);
            }
        }
    }
}

/**
 * C ref: music.c improvised_notes — rnd(SIZE(jingle)-1) notes via ROLL_FROM.
 * svc.context.jingle[6]; Unchanging keeps prior tune.
 */
function improvised_notes(sameRef) {
    if (!game.context) game.context = {};
    if (!game.context.jingle) game.context.jingle = '';
    const unchanging = !!(game.u?.Unchanging);
    if (!(unchanging && game.context.jingle.length > 0)) {
        const notecount = rnd(5); // SIZE(jingle)-1 == 5 → 1..5
        let s = '';
        for (let i = 0; i < notecount; ++i) {
            s += NOTES[rn2(NOTES.length)];
        }
        game.context.jingle = s;
        sameRef.v = false;
    } else {
        sameRef.v = true;
    }
    return game.context.jingle;
}

/** C ref: music.c Hero_playnotes — tty/sound deferred (no RNG). */
function Hero_playnotes(_instr, _notes, _vol) {
    /* no-op */
}

/** C ref: music.c generic_lvl_desc. */
function generic_lvl_desc() {
    const uz = game.u?.uz;
    if (Is_astralevel(uz)) return 'astral plane';
    if (In_endgame(uz)) return 'plane';
    // Is_sanctum deferred → rare sanctum wording
    if (In_sokoban(uz)) return 'puzzle';
    if (In_V_tower(uz)) return 'tower';
    return 'dungeon';
}

/** C mkobj.c sobj_at — first floor object of otyp at (x,y). */
function sobj_at(otyp, x, y) {
    for (let otmp = objects_at(x, y); otmp; otmp = otmp.nexthere) {
        if ((otmp.otyp | 0) === (otyp | 0)) return otmp;
    }
    return null;
}

/**
 * C ref: music.c do_pit — maketrap PIT + boulder/liquid/mon/hero fall.
 * @param {number} x
 * @param {number} y
 * @param {number} tu_pit nonzero if hero stood on a pit before quake
 */
async function do_pit(x, y, tu_pit) {
    const chasm0 = maketrap(x, y, PIT);
    if (!chasm0) return; // no pit if portal etc.
    chasm0.tseen = 1;

    const mtmp = m_at(x, y);
    const otmp = sobj_at(BOULDER, x, y);
    if (otmp) {
        if (cansee(x, y)) {
            await pline(
                `KADOOM!  The boulder falls into a chasm${
                    u_at(x, y) ? ' below you' : ''
                }!`,
            );
        }
        if (mtmp) mtmp.mtrapped = 0;
        obj_extract_self(otmp);
        // C flooreffects(otmp,x,y,"") thin: extracted boulder + pit → deltrap+delobj
        const t = t_at(x, y);
        if (t && is_pit(t.ttyp)) {
            deltrap(t);
        }
        delobj(otmp);
        newsym(x, y);
        return;
    }

    // Let liquid flow into the newly created chasm.
    const filltype = fillholetyp(x, y, false);
    if (filltype !== ROOM) {
        const lev = game.level?.at?.(x, y);
        if (lev) lev.typ = filltype; // C set_levltyp
        await liquid_flow(x, y, filltype, chasm0, null);
        if (!t_at(x, y)) return;
    }

    let chasm = t_at(x, y);
    if (!chasm) return;

    if (mtmp) {
        if (!is_flyer(mtmp.data) && !is_clinger(mtmp.data)) {
            const m_already_trapped = !!mtmp.mtrapped;
            mtmp.mtrapped = 1;
            if (!m_already_trapped) {
                if (cansee(x, y)) {
                    await pline(`${Monnam(mtmp)} falls into a chasm!`);
                } else if (humanoid(mtmp.data)) {
                    await You_hear('a scream!');
                }
            }
            await mselftouch(mtmp, 'Falling, ', true);
            if ((mtmp.mhp | 0) > 0) {
                mtmp.mhp -= rnd(m_already_trapped ? 4 : 6);
                if ((mtmp.mhp | 0) <= 0) {
                    if (!cansee(x, y)) {
                        await pline('It is destroyed!');
                    } else {
                        const nam = mtmp.mtame
                            ? x_monnam(
                                mtmp, ARTICLE_THE, 'poor',
                                has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
                                false,
                            )
                            : mon_nam(mtmp);
                        await pline(`You destroy ${nam}!`);
                    }
                    await xkilled(mtmp, XKILL_NOMSG);
                }
            }
        }
    } else if (u_at(x, y)) {
        const u = game.u || {};
        if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
            await pline('Your chain breaks!');
            reset_utrap(true);
        }
        if (Levitation() || Flying() || is_clinger(game.youmonst?.data)) {
            if (!tu_pit) {
                await pline('A chasm opens up under you!');
                await pline("You don't fall in!");
            }
        } else if (!tu_pit || !u.utrap || (u.utraptype | 0) !== TT_PIT) {
            await pline('You fall into a chasm!');
            set_utrap(rn1(6, 2), TT_PIT);
            losehp(
                maybe_half_phys(rnd(6)),
                'fell into a chasm',
                NO_KILLER_PREFIX,
            );
            await selftouch('Falling, you');
        } else if (u.utrap && (u.utraptype | 0) === TT_PIT) {
            const keepfooting = (!(Fumbling() && rn2(5))
                && (!(rnl(Role_if(PM_ARCHEOLOGIST) ? 3 : 9))
                    || ((acurr(A_DEX) > 7) && rn2(5))));
            await pline('You are jostled around violently!');
            set_utrap(rn1(6, 2), TT_PIT);
            losehp(
                maybe_half_phys(rnd(keepfooting ? 2 : 4)),
                'hurt in a chasm',
                NO_KILLER_PREFIX,
            );
            if (keepfooting) {
                exercise(A_DEX, true);
            } else {
                const poly = Upolyd(u);
                const msg = (poly && (slithy(game.youmonst?.data)
                    || nolimbs(game.youmonst?.data)))
                    ? 'Shaken, you'
                    : 'Falling down, you';
                await selftouch(msg);
            }
        }
    } else {
        newsym(x, y);
    }
}

/**
 * C ref: music.c do_earthquake — force-radius pit storm.
 * @param {number} force
 */
async function do_earthquake(force) {
    const u = game.u || {};
    const trap_at_u = t_at(u.ux | 0, u.uy | 0);
    let tu_pit = 0;
    if (trap_at_u) tu_pit = is_pit(trap_at_u.ttyp) ? 1 : 0;
    if (force > 13) force = 13;

    let start_x = (u.ux | 0) - (force * 2);
    let start_y = (u.uy | 0) - (force * 2);
    let end_x = (u.ux | 0) + (force * 2);
    let end_y = (u.uy | 0) + (force * 2);
    start_x = Math.max(start_x, 1);
    start_y = Math.max(start_y, 0);
    end_x = Math.min(end_x, COLNO - 1);
    end_y = Math.min(end_y, ROWNO - 1);

    for (let x = start_x; x <= end_x; x++) {
        for (let y = start_y; y <= end_y; y++) {
            const mtmp = m_at(x, y);
            if (mtmp) {
                await wakeup(mtmp, true);
                if (mtmp.mundetected) {
                    mtmp.mundetected = 0;
                    newsym(x, y);
                    if (ceiling_hider(mtmp.data)) {
                        if (cansee(x, y)) {
                            await pline(
                                `${Amonnam(mtmp)} is shaken loose from the ceiling!`,
                            );
                        } else if (!is_flyer(mtmp.data)) {
                            await You_hear('a thump.');
                        }
                    }
                }
                if (M_AP_TYPE(mtmp) !== M_AP_NOTHING
                    && M_AP_TYPE(mtmp) !== M_AP_MONSTER) {
                    seemimic(mtmp);
                }
            }
            if (rn2(14 - force)) continue;

            const lev = game.level?.at?.(x, y);
            if (!lev) continue;
            switch (lev.typ) {
            case FOUNTAIN:
                if (cansee(x, y)) {
                    await pline(`The fountain falls${INTO_A_CHASM}.`);
                }
                await do_pit(x, y, tu_pit);
                break;
            case SINK:
                if (cansee(x, y)) {
                    await pline(`The kitchen sink falls${INTO_A_CHASM}.`);
                }
                await do_pit(x, y, tu_pit);
                break;
            case ALTAR: {
                const amsk = lev.altarmask | 0;
                if ((amsk & AM_SANCTUM) !== 0) break;
                const algn = Amask2align(amsk & AM_MASK);
                if (cansee(x, y)) {
                    await pline(
                        `The ${align_str(algn)} altar falls${INTO_A_CHASM}.`,
                    );
                }
                {
                    const { desecrate_altar } = await import('./pray.js');
                    await desecrate_altar(false, algn);
                }
                await do_pit(x, y, tu_pit);
                break;
            }
            case GRAVE:
                if (cansee(x, y)) {
                    await pline(`The headstone topples${INTO_A_CHASM}.`);
                }
                await do_pit(x, y, tu_pit);
                break;
            case THRONE:
                if (cansee(x, y)) {
                    await pline(`The throne falls${INTO_A_CHASM}.`);
                }
                await do_pit(x, y, tu_pit);
                break;
            case SCORR:
                lev.typ = CORR;
                recalc_block_point(x, y); // C unblock_point
                if (cansee(x, y)) {
                    await pline('A secret corridor is revealed.');
                }
                // FALLTHRU
            case CORR:
            case ROOM:
                await do_pit(x, y, tu_pit);
                break;
            case SDOOR:
                cvt_sdoor_to_door(lev);
                if (cansee(x, y)) {
                    await pline('A secret door is revealed.');
                }
                // FALLTHRU
            case DOOR:
                if ((lev.doormask | 0) === D_NODOOR) {
                    await do_pit(x, y, tu_pit);
                    break;
                }
                lev.doormask = D_NODOOR;
                recalc_block_point(x, y);
                newsym(x, y);
                if (cansee(x, y)) await pline('The door collapses.');
                if (in_rooms(x, y, SHOPBASE)) add_damage(x, y, 0);
                break;
            default:
                break;
            }
        }
    }
}

/**
 * C ref: music.c do_improvisation.
 * @returns {number} 2 on success (truthy → ECMD_TIME), 0 on impossible
 */
async function do_improvisation(instr) {
    const u = game.u;
    let do_spec = !(Stunned() || Confusion());
    let mundane = false;
    // C: itmp = *instr with oextra cleared — only otyp mutated for mundane
    let itmp_otyp = instr.otyp;

    if (!do_spec || (instr.spe | 0) <= 0) {
        while (objects()[itmp_otyp]?.oc_magic) {
            itmp_otyp -= 1;
            mundane = true;
        }
    }

    let mode = PLAY_NORMAL;
    if (Stunned()) mode |= PLAY_STUNNED;
    if (Confusion()) mode |= PLAY_CONFUSED;
    if (Hallucination()) mode |= PLAY_HALLU;

    if (!rn2(2)) {
        if (mode === (PLAY_STUNNED | PLAY_CONFUSED)) {
            mode = !rn2(2) ? PLAY_STUNNED : PLAY_CONFUSED;
        }
        if (mode & PLAY_HALLU) mode = PLAY_HALLU;
    }

    switch (mode) {
    case PLAY_NORMAL:
        await pline(`You start playing ${yname(instr)}.`);
        break;
    case PLAY_STUNNED:
        if (!Deaf()) await pline('You radiate an obnoxious droning sound.');
        else await pline('You feel a monotonous vibration.');
        break;
    case PLAY_CONFUSED:
        if (!Deaf()) await pline('You generate a raucous noise.');
        else await pline('You feel a jarring vibration.');
        break;
    case PLAY_HALLU:
        await pline('You disseminate a kaleidoscopic display of floating butterflies.');
        break;
    default:
        await pline('What you perform is quite far from music...');
        break;
    }

    const same = { v: false };
    const improvisation = improvised_notes(same);
    const same_old_song = same.v;

    switch (itmp_otyp) {
    case LEATHER_DRUM:
        if (!mundane) {
            if (!Deaf()) {
                await pline(`You beat a ${same_old_song ? 'familiar ' : ''}deafening row!`);
                Hero_playnotes(itmp_otyp, 'CCC', 100);
                incr_itimeout_HDeaf(rn1(20, 30));
            } else {
                await pline('You pound on the drum.');
            }
            exercise(A_WIS, false);
        } else {
            // C: rn2(2) ? "butcher" : rn2(2) ? "manage" : "pull off"
            const verb = rn2(2) ? 'butcher' : rn2(2) ? 'manage' : 'pull off';
            await pline(`You ${verb} ${an(BEATS[rn2(BEATS.length)])}.`);
            Hero_playnotes(itmp_otyp, improvisation, 50);
        }
        await awaken_monsters((u.ulevel | 0) * (mundane ? 5 : 40));
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
        break;

    case TOOLED_HORN:
        if (!Deaf()) {
            await pline(`You produce a frightful, grave${same_old_song ? ', yet familiar,' : ''} sound.`);
        } else {
            await pline('You blow into the horn.');
        }
        Hero_playnotes(itmp_otyp, improvisation, 80);
        await awaken_monsters((u.ulevel | 0) * 30);
        exercise(A_WIS, false);
        break;

    case BUGLE:
        if (!Deaf()) {
            await pline(`You extract a loud${same_old_song ? ', familiar' : ''} noise from ${yname(instr)}.`);
        } else {
            await pline('You blow into the bugle.');
        }
        Hero_playnotes(itmp_otyp, improvisation, 80);
        await awaken_soldiers(null);
        exercise(A_WIS, false);
        break;

    case DRUM_OF_EARTHQUAKE:
        // C: no deafness while magically functional (mundane → LEATHER arm)
        await consume_obj_charge(instr, true);
        await pline('You produce a heavy, thunderous rolling!');
        Hero_playnotes(itmp_otyp, 'C', 100);
        await pline(`The entire ${generic_lvl_desc()} is shaking around you!`);
        await do_earthquake(Math.trunc(((u.ulevel | 0) - 1) / 3) + 1);
        await awaken_monsters(ROWNO * COLNO);
        makeknown(DRUM_OF_EARTHQUAKE);
        break;

    case MAGIC_FLUTE:
        await consume_obj_charge(instr, true);
        await pline(
            `You ${!Deaf() ? '' : 'seem to '}produce ${
                Hallucination() ? 'piped' : 'soft'
            }${same_old_song ? ', familiar' : ''} music.`,
        );
        Hero_playnotes(itmp_otyp, improvisation, 50);
        await put_monsters_to_sleep((u.ulevel | 0) * 5);
        exercise(A_DEX, true);
        break;

    case WOODEN_FLUTE: {
        // C: do_spec &= (rn2…) — RHS always evaluated (RNG)
        do_spec = !!(do_spec
            & (rn2(acurr(A_DEX)) + (u.ulevel | 0) > 25));
        if (!Deaf()) {
            await pline(
                `${Tobjnam(instr, do_spec ? 'trill' : 'toot')}${
                    same_old_song ? ' a familiar tune' : ''
                }.`,
            );
        } else {
            await You_feel(
                `${yname(instr)} ${do_spec ? 'trill' : 'toot'}.`,
            );
        }
        Hero_playnotes(itmp_otyp, improvisation, 50);
        if (do_spec) await charm_snakes((u.ulevel | 0) * 3);
        exercise(A_DEX, true);
        break;
    }

    case FIRE_HORN:
    case FROST_HORN: {
        await consume_obj_charge(instr, true);
        if (!(await getdir(null))) {
            await pline(`${Tobjnam(instr, 'vibrate')}.`);
            break;
        }
        if (!(u.dx | 0) && !(u.dy | 0) && !(u.dz | 0)) {
            const damage = await zapyourself(instr, true);
            if (damage) {
                const buf = `using a magical horn on ${uhim()}self`;
                Hero_playnotes(itmp_otyp, improvisation, 50);
                losehp(damage, buf, KILLED_BY);
            }
        } else {
            const type = BZ_OFS_AD(
                instr.otyp === FROST_HORN ? AD_COLD : AD_FIRE,
            );
            if (!Blind()) {
                await pline(`A ${flash_str(type)} blasts out of the horn!`);
            }
            Hero_playnotes(itmp_otyp, improvisation, 50);
            game.current_wand = instr;
            await ubuzz(type, rn1(6, 6));
            game.current_wand = null;
        }
        makeknown(instr.otyp);
        break;
    }

    case MAGIC_HARP:
        await consume_obj_charge(instr, true);
        if (!Deaf()) {
            await pline(
                `${Tobjnam(instr, 'produce')} very attractive${
                    same_old_song ? ' and familiar' : ''
                } music.`,
            );
        } else {
            await You_feel('very soothing vibrations.');
        }
        Hero_playnotes(itmp_otyp, improvisation, 50);
        await charm_monsters(Math.trunc(((u.ulevel | 0) - 1) / 3) + 1);
        exercise(A_DEX, true);
        break;

    case WOODEN_HARP: {
        // C: do_spec &= (rn2…) — RHS always evaluated (RNG)
        do_spec = !!(do_spec
            & (rn2(acurr(A_DEX)) + (u.ulevel | 0) > 25));
        if (!Deaf()) {
            let melody;
            if (do_spec && same_old_song) {
                melody = 'produces a familiar, lilting melody';
            } else if (do_spec) {
                melody = 'produces a lilting melody';
            } else if (same_old_song) {
                melody = 'twangs a familiar tune';
            } else {
                melody = 'twangs';
            }
            await pline(`${Yname2(instr)} ${melody}.`);
        } else {
            await You_feel('soothing vibrations.');
        }
        Hero_playnotes(itmp_otyp, improvisation, 50);
        if (do_spec) await calm_nymphs((u.ulevel | 0) * 3);
        exercise(A_DEX, true);
        break;
    }

    default:
        await pline(`What a weird instrument (${instr.otyp})!`);
        return 0;
    }
    void improvisation;
    return 2;
}

/**
 * C ref: music.c do_play_instrument.
 * @returns {number} ECMD_TIME | ECMD_OK
 */
export async function do_play_instrument(instr) {
    const u = game.u;
    if (u?.Underwater) {
        await pline("You can't play music underwater!");
        return ECMD_OK;
    }
    // can_blow gate for wind instruments deferred → allow

    let c = 'y';
    if (instr.otyp !== LEATHER_DRUM && instr.otyp !== DRUM_OF_EARTHQUAKE
        && !(Stunned() || Confusion() || Hallucination())) {
        c = await yn_function('Improvise?', 'ynq', 'y');
        if (c === 'q') {
            await pline(Never_mind);
            return ECMD_OK;
        }
    }

    if (c !== 'n') {
        const took = await do_improvisation(instr);
        return took ? ECMD_TIME : ECMD_OK;
    }

    // C: passtune / getlin tune / drawbridge (D-0977)
    let buf = '';
    if ((u.uevent?.uheard_tune | 0) === 2) {
        c = await yn_function('Play the passtune?', 'ynq', 'y');
    }
    if (c === 'q') {
        await pline(Never_mind);
        return ECMD_OK;
    } else if (c === 'y' && (u.uevent?.uheard_tune | 0) === 2) {
        buf = game.tune || '';
    } else {
        buf = await getlin('What tune are you playing? [5 notes, A-G]');
        buf = mungspaces(buf);
        if (buf.charCodeAt(0) === 0x1b || buf === '') {
            await pline(Never_mind);
            return ECMD_OK;
        }
        // uppercase + H→B
        let out = '';
        for (let i = 0; i < buf.length; i++) {
            let ch = buf.charAt(i).toUpperCase();
            if (ch === 'H') ch = 'B';
            out += ch;
        }
        buf = out;
    }

    await pline(
        !Deaf()
            ? `You extract a strange sound from ${the(xname(instr))}!`
            : `You can feel ${the(xname(instr))} emitting vibrations.`,
    );
    Hero_playnotes(instr.otyp, buf, 50);

    if (Is_stronghold(u.uz)) {
        exercise(A_WIS, true); // just for trying
        const tune = game.tune || '';
        if (buf === tune) {
            // Search for the drawbridge in 3×3 around hero
            const uy = u.uy | 0;
            const ux = u.ux | 0;
            for (let y = uy - 1; y <= uy + 1; y++) {
                for (let x = ux - 1; x <= ux + 1; x++) {
                    if (!isok(x, y)) continue;
                    const xy = { x, y };
                    if (find_drawbridge(xy)) {
                        if (!u.uevent) u.uevent = {};
                        u.uevent.uheard_tune = 2;
                        record_achievement(ACH_TUNE);
                        const lev = game.level?.at(xy.x, xy.y);
                        if (lev && lev.typ === DRAWBRIDGE_DOWN) {
                            await close_drawbridge(xy.x, xy.y);
                        } else {
                            await open_drawbridge(xy.x, xy.y);
                        }
                        return ECMD_TIME;
                    }
                }
            }
        } else if (!Deaf()) {
            if ((u.uevent?.uheard_tune | 0) < 1) {
                if (!u.uevent) u.uevent = {};
                u.uevent.uheard_tune = 1;
            }
            // Mastermind-style hints when a drawbridge is adjacent
            let ok = false;
            const uy = u.uy | 0;
            const ux = u.ux | 0;
            for (let y = uy - 1; y <= uy + 1 && !ok; y++) {
                for (let x = ux - 1; x <= ux + 1 && !ok; x++) {
                    if (!isok(x, y)) continue;
                    const lev = game.level?.at(x, y);
                    if ((lev && IS_DRAWBRIDGE(lev.typ))
                        || is_drawbridge_wall(x, y) >= 0) {
                        ok = true;
                    }
                }
            }
            if (ok) {
                let tumblers = 0;
                let gears = 0;
                const matched = [false, false, false, false, false];
                for (let xi = 0; xi < buf.length; xi++) {
                    if (xi < 5) {
                        if (buf.charAt(xi) === tune.charAt(xi)) {
                            gears++;
                            matched[xi] = true;
                        } else {
                            for (let yi = 0; yi < 5; yi++) {
                                if (!matched[yi]
                                    && buf.charAt(xi) === tune.charAt(yi)
                                    && buf.charAt(yi) !== tune.charAt(yi)) {
                                    tumblers++;
                                    matched[yi] = true;
                                    break;
                                }
                            }
                        }
                    }
                }
                const plur = (n) => (n === 1 ? '' : 's');
                if (tumblers) {
                    if (gears) {
                        await You_hear(
                            `${tumblers} tumbler${plur(tumblers)} click and ${
                                gears} gear${plur(gears)} turn.`,
                        );
                    } else {
                        await You_hear(
                            `${tumblers} tumbler${plur(tumblers)} click.`,
                        );
                    }
                } else if (gears) {
                    await You_hear(`${gears} gear${plur(gears)} turn.`);
                    if (gears === 5) {
                        if (!u.uevent) u.uevent = {};
                        u.uevent.uheard_tune = 2;
                        record_achievement(ACH_TUNE);
                    }
                }
            }
        }
    }
    return ECMD_TIME;
}
