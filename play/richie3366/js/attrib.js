// attrib.js — Hero attributes.
// C ref: attrib.c — rnd_attr, init_attr, vary_init_attr, adjattrib,
//        poisoned / poisontell, adjabil / role_abil (partial).

import { game } from './gstate.js';
import { strstri, strncmpi } from './hacklib.js';
import { rn2, rnd, d, rn1 } from './rng.js';
/* invent.js (same SCC; hoisted function, call-time use only — imports.mjs SAFE). */
import { encumber_msg } from './invent.js';
import {
    FROMEXPER,
    FROMRACE,
    FROMFORM,
    FROMOUTSIDE,
    INTRINSIC,
    MAXULEV,
    STR18,
    STR19,
    Upolyd,
    POISON_RES,
    STEALTH,
    FAST,
    JUMPING,
    DRAIN_RES,
    BLINDED,
    BLND_RES,
    TELEPORT_CONTROL,
    SEARCHING,
    FIRE_RES,
    COLD_RES,
    SLEEP_RES,
    DISINT_RES,
    SHOCK_RES,
    ACID_RES,
    SICK_RES,
    STONE_RES,
    INFRAVISION,
    SEE_INVIS,
    INVIS,
    CLAIRVOYANT,
    WARNING,
    FUMBLING,
    TIMEOUT,
    STRANGLED,
    W_ARMF,
    W_ARMC,
    W_ARMH,
    KILLED_BY,
    KILLED_BY_AN,
    POISONING,
    DIED,
    LUCKADD,
    Is_astralevel,
    A_CG_CONVERT,
    A_CG_HELM_ON,
    A_CG_HELM_OFF,
    LL_ALIGNMENT,
    WEAK,
    ismnum,
} from './const.js';
import { objectNames } from './objects.js';
import { pline, pline_The, You_feel, impossible, Hallucination, see_monsters, shieldeff } from './display.js';
import { aligns } from './roles.js';
import { make_confused, Half_gas_damage } from './potion.js';
import { livelog_printf } from './pline.js';
import { ysimple_name, the } from './objnam.js';
import { carrying } from './hack.js';
import { what_gives, bare_artifactname, confers_luck, u_wield_art, is_art, retouch_equipment } from './artifact.js';
import { add_weapon_skill, lose_weapon_skill } from './weapon.js';
import {
    PM_ARCHEOLOGIST,
    PM_BARBARIAN,
    PM_CAVE_DWELLER,
    PM_HEALER,
    PM_KNIGHT,
    PM_MONK,
    PM_CLERIC,
    PM_RANGER,
    PM_ROGUE,
    PM_SAMURAI,
    PM_TOURIST,
    PM_VALKYRIE,
    PM_WIZARD,
    PM_ELF,
    PM_ORC,
    PM_DWARF,
    PM_GNOME,
    monsterNames,
} from './generated/monsters_data.js';
import { ART_OGRESMASHER, ART_EYES_OF_THE_OVERWORLD } from './generated/artifacts_data.js';
import { adj_erinys, G_UNIQ, mons, haseyes } from './monsters.js';
import { name_to_mon } from './mondata.js';
import { type_is_pname } from './do_name.js';
import { uasmon_maxStr } from './polyself.js';
import { summon_furies } from './makemon.js';

const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');

export const A_STR = 0;
export const A_INT = 1;
export const A_WIS = 2;
export const A_DEX = 3;
export const A_CON = 4;
export const A_CHA = 5;
export const A_MAX = 6;

function abase(i) {
    return game.u.acurr.a[i];
}
function setAbase(i, v) {
    game.u.acurr.a[i] = v;
}
function amax(i) {
    return game.u.amax.a[i];
}
function setAmax(i, v) {
    game.u.amax.a[i] = v;
}

const GAUNTLETS_OF_POWER = objectNames.indexOf('GAUNTLETS_OF_POWER');
const DUNCE_CAP = objectNames.indexOf('DUNCE_CAP');
const HELM_OF_OPPOSITE_ALIGNMENT = objectNames.indexOf('HELM_OF_OPPOSITE_ALIGNMENT');

// C ref: attrib.c acurr() — clamp non-STR to [3,25]; STR 3..125 encoding
export function acurr(i) {
    const u = game.u || {};
    const tmp = (u.abon?.a?.[i] || 0) + (u.atemp?.a?.[i] || 0) + (u.acurr?.a?.[i] || 0);
    let result = 0;
    // C: for Strength: 3 <= result <= 125; others: 3 <= result <= 25
    if (i === A_STR) {
        // C: tmp >= STR19(25) || (uarmg && uarmg->otyp == GAUNTLETS_OF_POWER)
        // → STR19(25) (125). Else max(tmp, 3) — 18/xx encoding preserved.
        if (tmp >= STR19(25)
            || (u.uarmg && (u.uarmg.otyp | 0) === GAUNTLETS_OF_POWER)) {
            result = STR19(25);
        } else {
            result = Math.max(tmp, 3);
        }
    } else if (i === A_CHA) {
        // C attrib.c:1205–1215 — nymph / amorous-demon floor CHA to 18
        if (tmp < 18
            && ((game.youmonst?.data?.mlet === 'S_NYMPH')
                || ((u.umonnum | 0) === PM_AMOROUS_DEMON))) {
            result = 18;
        }
    } else if (i === A_CON) {
        // C attrib.c:1225–1227 — wielding Ogresmasher sets CON to 25
        if (u_wield_art(ART_OGRESMASHER)) result = 25;
    } else if (i === A_INT || i === A_WIS) {
        // C: DUNCE_CAP → 6
        if (u.uarmh && (u.uarmh.otyp | 0) === DUNCE_CAP) {
            result = 6;
        }
    }
    if (result === 0) {
        if (tmp >= 25) result = 25;
        else if (tmp <= 3) result = 3;
        else result = tmp;
    }
    return result;
}

/**
 * C ref: attrib.c extremeattr — ACURR at min or max (ring +0 vs capped).
 * Named omit: Fixed_abil / racial MINATTR/MAXATTR (C also ignores those).
 */
export function extremeattr(attrindx) {
    const u = game.u || {};
    let lolimit = 3;
    let hilimit = 25;
    const curval = acurr(attrindx);
    if ((attrindx | 0) === A_STR) {
        hilimit = STR19(25); // 125
        if (u.uarmg && (u.uarmg.otyp | 0) === GAUNTLETS_OF_POWER) {
            lolimit = hilimit;
        }
    } else if ((attrindx | 0) === A_CON) {
        // C attrib.c:1280–1282 — wielding Ogresmasher pins CON at its limit
        if (u_wield_art(ART_OGRESMASHER)) lolimit = hilimit;
    } else if ((attrindx | 0) === A_INT || (attrindx | 0) === A_WIS) {
        if (u.uarmh && (u.uarmh.otyp | 0) === DUNCE_CAP) {
            hilimit = lolimit = 6;
        }
    }
    return curval === lolimit || curval === hilimit;
}

// C ref: attrib.c acurrstr() — map encoded STR to 3..25 for formulas
export function acurrstr() {
    const str = acurr(A_STR);
    if (str <= 18) return Math.max(str, 3);
    if (str <= 121) return 19 + Math.trunc(str / 50);
    return Math.min(str, 125) - 100;
}

// C ref: botl.c get_strength_str — 18/xx and 18/** for encoded STR
export function get_strength_str() {
    const st = acurr(A_STR);
    if (st > 18) {
        if (st > STR18(100)) {
            // C: Sprintf(buf, "%2d", st - 100)
            return String(st - 100).padStart(2, ' ');
        }
        if (st < STR18(100)) {
            return `18/${String(st - 18).padStart(2, '0')}`;
        }
        return '18/**';
    }
    // C: Sprintf(buf, "%-1d", st)
    return String(st);
}

/* C ref: attrib.c exercise `:489–518` — INT/CHA + poly guards, then
 * |AEXE| < AVAL (`:486`, 50) gates `(rn2(19) > ACURR) : -rn2(2)`, then
 * the `:516–517` encumber_msg() tail for STR/CON once moves > 0.
 * encumber_msg is async-only (pline can reach --More--) and this fan-out
 * is sync (~297 sites, incl. level-gen), so the call floats: state
 * (newcap compare, botl, oldcap commit) settles synchronously inside the
 * call — oldcap commits before the first await (invent.js) — and only
 * the message delivery floats. No RNG floats: the message builds
 * synchronously and only pline delivery awaits.
 * Named omissions: debugpline0/3 (`:491`, `:510–514`, `#ifdef DEBUG`
 * compiled out — D-2586 precedent). */
export function exercise(i, inc_or_dec) {
    if (i === A_INT || i === A_CHA) return;
    const u = game.u;
    // C `:496`: no physical exercise while polymorphed (WIS still allowed)
    if (Upolyd(u) && i !== A_WIS) return;
    if (!u.aexe) u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const ax = u.aexe.a[i] || 0;
    const AVAL = 50; // C attrib.c:486 tune value for exercise gains
    if (Math.abs(ax) < AVAL) {
        // C `:509`: AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2);
        if (inc_or_dec) {
            u.aexe.a[i] = ax + (rn2(19) > acurr(i) ? 1 : 0);
        } else {
            u.aexe.a[i] = ax - rn2(2);
        }
    }
    // C `:516–517` — STR/CON re-sync encumbrance feedback once play begins.
    if (((game.moves ?? 0) > 0) && (i === A_STR || i === A_CON)) {
        void encumber_msg();
    }
}

function attrMax(i) {
    // Race ceiling only. attrib.h ATTRMAX's Upolyd strength arm is applied
    // in redist_attr and in exerchk; adjattrib still calls this helper.
    return game.urace?.attrmax?.[i] ?? 18;
}
function attrMin(i) {
    return game.urace?.attrmin?.[i] ?? 3;
}

// C ref: attrib.c rnd_attr()
function rnd_attr() {
    let x = rn2(100);
    let i;
    for (i = 0; i < A_MAX; ++i) {
        if ((x -= game.urole.attrdist[i]) < 0) break;
    }
    return i;
}

// C ref: attrib.c init_attr_role_redist()
function init_attr_role_redist(np, addition) {
    let tryct = 0;
    const adj = addition ? 1 : -1;
    while ((addition ? np > 0 : np < 0) && tryct < 100) {
        const i = rnd_attr();
        if (
            i >= A_MAX
            || (addition ? abase(i) >= attrMax(i) : abase(i) <= attrMin(i))
        ) {
            tryct++;
            continue;
        }
        tryct = 0;
        setAbase(i, abase(i) + adj);
        setAmax(i, amax(i) + adj);
        np -= adj;
    }
    return np;
}

// C ref: attrib.c init_attr()
export function init_attr(np) {
    const u = game.u;
    if (!u.acurr) u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.amax) u.amax = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atemp) u.atemp = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.atime) u.atime = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };

    for (let i = 0; i < A_MAX; i++) {
        u.acurr.a[i] = u.amax.a[i] = game.urole.attrbase[i];
        u.atemp.a[i] = u.atime.a[i] = 0;
        np -= game.urole.attrbase[i];
    }
    np = init_attr_role_redist(np, true);
    np = init_attr_role_redist(np, false);
    return np;
}

// C ref: attrib.c plusattr[] / minusattr[]
const PLUSATTR = ['strong', 'smart', 'wise', 'agile', 'tough', 'charismatic'];
const MINUSATTR = ['weak', 'stupid', 'foolish', 'clumsy', 'fragile', 'repulsive'];
// C ref: attrib.c attrname[] `:20–21` — also used by enlightenment in insight.c
const ATTRNAME = ['strength', 'intelligence', 'wisdom', 'dexterity', 'constitution', 'charisma'];

/**
 * C ref: attrib.c poisontell — attribute-loss feedback after poisoned().
 * Gauntlets-of-power / Ogresmasher phrasing via ACURR==max.
 * @param {number} typ
 * @param {boolean} exclaim
 */
export async function poisontell(typ, exclaim = true) {
    // C: poiseff[] delivery + effect_msg
    const punct = exclaim ? '!' : '.';
    let msg = [
        'weaker',                 // A_STR — You_feel
        'brain is on fire',       // A_INT — Your
        'judgement is impaired',  // A_WIS — Your
        "muscles won't obey you", // A_DEX — Your
        'very sick',              // A_CON — You_feel
        'break out in hives',     // A_CHA — You
    ][typ | 0];
    if (msg == null) return;
    if ((typ | 0) === A_STR && acurr(A_STR) === STR19(25)) {
        msg = 'innately weaker';
    } else if ((typ | 0) === A_CON && acurr(A_CON) === 25) {
        msg = 'sick inside';
    }
    const body = `${msg}${punct}`;
    if ((typ | 0) === A_STR || (typ | 0) === A_CON) {
        await You_feel(body);
    } else if ((typ | 0) === A_CHA) {
        await pline(`You ${body}`);
    } else {
        await pline(`Your ${body}`);
    }
}

/**
 * C ref: attrib.c minuhpmax — max(ulevel, altmin).
 * @param {number} altmin
 */
export function minuhpmax(altmin) {
    const u = game.u || {};
    if ((altmin | 0) < 1) altmin = 1;
    return Math.max(u.ulevel | 0, altmin | 0);
}

/**
 * C ref: attrib.c adjuhploss — shrink pending loss if setuhpmax already cut HP.
 * @param {number} loss
 * @param {number} olduhp
 */
export function adjuhploss(loss, olduhp) {
    const u = game.u || {};
    if (!Upolyd(u)) {
        if ((u.uhp | 0) < (olduhp | 0)) loss -= (olduhp | 0) - (u.uhp | 0);
    } else if ((u.mh | 0) < (olduhp | 0)) {
        loss -= (olduhp | 0) - (u.mh | 0);
    }
    return Math.max(loss | 0, 1);
}

/**
 * C ref: attrib.c losestr — STR loss; may kill below ATTRMIN.
 * Caller mcastu.c mcast_weaken_you.
 */
export async function losestr(num, knam, k_format) {
    const u = game.u || (game.u = {});
    const uhpmin = minuhpmax(1);
    let ustr = (abase(A_STR) | 0) - (num | 0);
    const waspolyd = Upolyd(u);
    if ((num | 0) <= 0 || (abase(A_STR) | 0) < (attrMin(A_STR) | 0)) {
        await impossible(`losestr: ${abase(A_STR) | 0} - ${num | 0}`);
        return;
    }
    let dmg = 0;
    while (ustr < (attrMin(A_STR) | 0)) {
        ++ustr;
        --num;
        dmg += rn1(4, 3); // 3..6
    }
    if (dmg) {
        if (!knam) {
            knam = 'terminal frailty';
            k_format = KILLED_BY;
        }
        const { losehp } = await import('./hack.js');
        losehp(dmg, knam, k_format);
        if (game._losehp_needs_done || game.program_state?.gameover) {
            const { finish_losehp_done } = await import('./end.js');
            await finish_losehp_done();
            return;
        }
        const { setuhpmax } = await import('./exper.js');
        if (Upolyd(u)) {
            setuhpmax(Math.max((u.mhmax | 0) - dmg, 1), false);
        } else if (!waspolyd) {
            if ((u.uhpmax | 0) > uhpmin) {
                setuhpmax(Math.max((u.uhpmax | 0) - dmg, uhpmin), false);
            }
        }
        if (game.flags) game.flags.botl = true;
        if (game.disp) game.disp.botl = true;
    }
    if ((num | 0) > 0 && (Upolyd(u) || !waspolyd)) {
        await adjattrib(A_STR, -(num | 0), 1);
    }
}

/**
 * C ref: attrib.c poisoned() `:317-408` — attack/trap poison on hero.
 * Arms in C order: poisoned-message; resist early-out (blast shieldeff);
 * G_UNIQ / the() killer-prefix polish; rn2(fatal) gate; instant-kill /
 * HP (blast/cloud towel halving) / attrib-loss; done(POISONING|DIED)
 * when uhp<1; encumber_msg.
 * Named omissions: none — whole C body live.
 * @param {string} reason
 * @param {number} typ
 * @param {string} pkiller
 * @param {number} fatal
 * @param {boolean} thrown_weapon
 */
export async function poisoned(reason, typ, pkiller, fatal, thrown_weapon) {
    const u = game.u || (game.u = {});
    const blast = reason === 'blast';
    // C: inform unless reason already implies poison / blast
    if (!blast && !strstri(reason, 'poison')) {
        const r = String(reason || '');
        const plural = r.length > 0 && r[r.length - 1] === 's';
        const article = (r.charCodeAt(0) >= 65 && r.charCodeAt(0) <= 90)
            ? '' : 'The ';
        await pline(`${article}${r} ${plural ? 'were' : 'was'} poisoned!`);
    }
    const Poison_resistance = !!((u.HPoison_resistance | 0)
        || (u.EPoison_resistance | 0) || u.Poison_resistance);
    if (Poison_resistance) {
        // C attrib.c:339-340 — blast shield pyrotechnics even when resisted.
        if (blast)
            await shieldeff(u.ux, u.uy);
        await pline_The("poison doesn't seem to affect you.");
        return;
    }

    // C attrib.c:346-350 — suppress killer prefix if it already has one.
    let kprefix = KILLED_BY_AN;
    let killer = pkiller || 'poison';
    const kpmon = name_to_mon(killer, null);
    if (ismnum(kpmon) && (((mons(kpmon)?.geno | 0) & G_UNIQ) !== 0)) {
        kprefix = KILLED_BY;
        if (!type_is_pname(mons(kpmon)))
            killer = the(killer);
    } else if (!strncmpi(killer, 'the ', 4) || !strncmpi(killer, 'an ', 3)
               || !strncmpi(killer, 'a ', 2)) {
        /*[ does this need a plural check too? ]*/
        kprefix = KILLED_BY;
    }

    /*
     * FIXME:
     *  this operates on u.uhp[max] even when hero is polymorphed....
     */
    // C: i = !fatal ? 1 : rn2(fatal + (thrown_weapon ? 20 : 0));
    const i = !fatal ? 1 : rn2((fatal | 0) + (thrown_weapon ? 20 : 0));
    if (i === 0 && (typ | 0) !== A_CHA) {
        // sometimes survivable instant kill
        let loss = 6 + d(4, 6); // 6 + 4d6 => 10..34
        if ((u.uhp | 0) <= loss) {
            u.uhp = -1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
            await pline_The('poison was deadly...');
        } else {
            const { setuhpmax } = await import('./exper.js');
            const { losehp } = await import('./hack.js');
            const olduhp = u.uhp | 0;
            const newuhpmax = (u.uhpmax | 0) - Math.trunc(loss / 2);
            setuhpmax(Math.max(newuhpmax, minuhpmax(3)), true);
            loss = adjuhploss(loss, olduhp);
            losehp(loss, killer, kprefix);
            if (await adjattrib(A_CON, (typ | 0) !== A_CON ? -1 : -3, true)) {
                await poisontell(A_CON, true);
            }
            if ((typ | 0) !== A_CON && await adjattrib(typ, -3, 1)) {
                await poisontell(typ, true);
            }
        }
    } else if (i > 5) {
        const { losehp } = await import('./hack.js');
        const cloud = reason === 'gas cloud';

        // HP damage; more likely—but less severe—with missiles
        let loss = thrown_weapon ? rnd(6) : rn1(10, 6);
        if ((blast || cloud) && Half_gas_damage()) // worn towel
            loss = Math.trunc((loss + 1) / 2);
        losehp(loss, killer, kprefix);
        /* C attrib.c:391 losehp is noreturn when fatal (done(DIED) inside);
           drain the deferred death here so the trailing done() below —
           unreachable in C on this path — never reports death without
           "You die..." first (artifact.js touch_artifact idiom). */
        const { finish_maybe_wail } = await import('./hack.js');
        await finish_maybe_wail();
        if (game._losehp_needs_done) {
            const { finish_losehp_done } = await import('./end.js');
            await finish_losehp_done();
            return;
        }
    } else {
        // attribute loss; STR drop to 3 may reduce HP later via adjattrib path
        const loss = (thrown_weapon || !fatal) ? 1 : d(2, 2);
        if (await adjattrib(typ, -loss, 1)) {
            await poisontell(typ, true);
        }
    }

    if ((u.uhp | 0) < 1) {
        if (!game.killer) game.killer = { name: '', format: 0 };
        game.killer.format = kprefix;
        game.killer.name = killer;
        const { done } = await import('./end.js');
        // "Poisoned by a poisoned ___" is redundant
        await done(strstri(killer, 'poison') ? DIED : POISONING);
        return;
    }
    const { encumber_msg } = await import('./invent.js');
    await encumber_msg();
}

/** C youprop.h Fixed_abil — H || E FIXED_ABIL. */
function Fixed_abil() {
    const u = game.u || {};
    return !!((u.HFixed_abil | 0) || (u.EFixed_abil | 0) || u.Fixed_abil);
}

/**
 * C ref: attrib.c adjattrib() `:117–199` — mutate ABASE/AMAX; You_feel when
 * msgflg <= 0; verbose-only feedback when ACURR unmoved; in_moveloop
 * STR/CON encumber_msg. Dunce cap INT/WIS abort (msgflg==0 constricts
 * pline) live for mhitu AD_DRIN (D-1329). Your()/You_feel() render via
 * pline with the prefix inline (no new Your clone; cf mhitu.js/artifact.js).
 * @param {number} ndx
 * @param {number} incr
 * @param {number|boolean} [msgflg=1] positive => silent; zero => message;
 * negative => conditional (msg if change made)
 */
export async function adjattrib(ndx, incr, msgflg = 1) {
    // C `:124` — Fixed_abil || !incr → FALSE
    if (Fixed_abil() || !incr) return false;
    const u = game.u || {};
    // C `:127–132` — dunce-cap INT/WIS abort; Your() constricts text when msgflg==0
    if (((ndx | 0) === A_INT || (ndx | 0) === A_WIS)
        && u.uarmh && (u.uarmh.otyp | 0) === DUNCE_CAP) {
        if ((msgflg | 0) === 0) {
            await pline('Your cap constricts briefly, then relaxes again.');
        }
        return false;
    }
    // C `:134–137` — snapshot current/base/peak before mutating base
    const old_acurr = acurr(ndx);
    const old_abase = abase(ndx);
    const old_amax = amax(ndx);
    // C `:138` — ABASE += incr (negative incr reduces)
    setAbase(ndx, old_abase + incr);
    let attrstr;
    let abonflg;
    if (incr > 0) {
        // C `:139–147` — base above peak raises peak, clamped to ATTRMAX
        if (abase(ndx) > amax(ndx)) {
            setAmax(ndx, abase(ndx));
            if (amax(ndx) > attrMax(ndx)) {
                setAbase(ndx, attrMax(ndx));
                setAmax(ndx, attrMax(ndx));
            }
        }
        attrstr = PLUSATTR[ndx];
        abonflg = (((u.abon?.a?.[ndx]) | 0) < 0);
    } else {
        // C `:148–171` — base below ATTRMIN: pin base, shave peak by an
        // rn2 share of the excess (so horn/restore cannot recover it all)
        if (abase(ndx) < attrMin(ndx)) {
            const decr = rn2(attrMin(ndx) - abase(ndx) + 1);
            setAbase(ndx, attrMin(ndx));
            setAmax(ndx, amax(ndx) - decr);
            if (amax(ndx) < attrMin(ndx)) setAmax(ndx, attrMin(ndx));
        }
        attrstr = MINUSATTR[ndx];
        abonflg = (((u.abon?.a?.[ndx]) | 0) > 0);
    }
    // C `:172–190` — current unmoved: verbose-only feedback, then FALSE.
    // msgflg==0 exact (not <=0); flags.verbose defaults on (jsmain init).
    if (acurr(ndx) === old_acurr) {
        if ((msgflg | 0) === 0 && game.flags?.verbose !== false) {
            if (abase(ndx) === old_abase && amax(ndx) === old_amax) {
                await pline(`You're ${abonflg ? 'currently' : 'already'} as ${attrstr} as you can get.`);
            } else {
                // C Your("innate %s has %s.") — prefix inline, no Your clone
                await pline(`Your innate ${ATTRNAME[ndx]} has ${(incr > 0) ? 'improved' : 'declined'}.`);
            }
        }
        return false;
    }

    /* C `:192` — any successful change resets abuse/exercise level */
    if (game.u.aexe?.a) game.u.aexe.a[ndx] = 0;

    // C `:194–197` — botl + You_feel("%s%s!") when msgflg <= 0
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    if ((msgflg | 0) <= 0) {
        const very = (incr > 1 || incr < -1) ? 'very ' : '';
        await You_feel(`${very}${attrstr}!`);
    }
    // C `:198–199` — in_moveloop STR/CON change re-reports encumbrance
    if (game.program_state?.in_moveloop
        && ((ndx | 0) === A_STR || (ndx | 0) === A_CON)) {
        const { encumber_msg } = await import('./invent.js');
        await encumber_msg();
    }
    return true;
}

/**
 * C ref: attrib.c gainstr — strength gain (spinach / corpse intrinsic).
 * @param {object|null} otmp cursed → lose strength instead
 * @param {number} incr 0 → roll amount from ABASE(A_STR)
 * @param {boolean} givemsg true → adjattrib You_feel (msgflg -1)
 */
export async function gainstr(otmp, incr, givemsg) {
    let num = incr | 0;
    if (!num) {
        const astr = abase(A_STR) | 0;
        if (astr < 18) {
            num = rn2(4) ? 1 : rnd(6);
        } else if (astr < STR18(85)) {
            num = rnd(10);
        } else {
            num = 1;
        }
    }
    const delta = (otmp && otmp.cursed) ? -num : num;
    await adjattrib(A_STR, delta, givemsg ? -1 : 1);
}

/**
 * C ref: attrib.c redist_attr `:740–760` — newman attribute shake.
 * Skips INT and WIS ("Polymorphing doesn't change your mind").
 * Each other attribute: AMAX += rn2(5)-2, clamp to ATTRMAX/ATTRMIN,
 * then ABASE = ABASE * new AMAX / old AMAX (C integer division).
 * ATTRMAX is attrib.h:43–44: polymorphed strength uses uasmon_maxStr().
 * encumber_msg() is the caller's job (polyself.c:432).
 */
export function redist_attr() {
    // C attrib.c:740–760
    const u = game.u;
    for (let i = 0; i < A_MAX; i++) {
        if (i === A_INT || i === A_WIS) continue;
        const tmp = amax(i) | 0;
        let mx = (tmp + (rn2(5) - 2)) | 0;
        // attrib.h:43–44 ATTRMAX — strength while polymorphed is the form's max
        const hi = (i === A_STR && Upolyd(u)) ? (uasmon_maxStr() | 0) : (attrMax(i) | 0);
        const lo = attrMin(i) | 0;
        if (mx > hi) mx = hi;
        if (mx < lo) mx = lo;
        setAmax(i, mx);
        // ABASE(i) = ABASE(i) * AMAX(i) / tmp; toward 0. tmp is the old peak.
        let nb = tmp ? Math.trunc(((abase(i) | 0) * mx) / tmp) : (abase(i) | 0);
        // ABASE(i) > ATTRMAX(i) is impossible
        if (nb < lo) nb = lo;
        setAbase(i, nb | 0);
    }
}

// C ref: attrib.c vary_init_attr()
export async function vary_init_attr() {
    for (let i = 0; i < A_MAX; i++) {
        if (!rn2(20)) {
            const xd = rn2(7) - 2; // biased variation
            await adjattrib(i, xd, true); // msgflg true → silent
            if (abase(i) < amax(i)) setAmax(i, abase(i));
        }
    }
}

// C ref: attrib.c newhp() — init + level-up (Con / MAXULEV throttle)
export function newhp() {
    const u = game.u;
    const roleAdv = game.urole?.hpadv || { infix: 8, inrnd: 0 };
    const raceAdv = game.urace?.hpadv || { infix: 2, inrnd: 0 };
    const xlev = game.urole?.xlev ?? 14;
    let hp;
    if ((u.ulevel | 0) === 0) {
        hp = (roleAdv.infix | 0) + (raceAdv.infix | 0);
        if ((roleAdv.inrnd | 0) > 0) hp += rnd(roleAdv.inrnd);
        if ((raceAdv.inrnd | 0) > 0) hp += rnd(raceAdv.inrnd);
        // Alignment init when moves==0 is done in u_init_misc (C newhp + u_init_misc).
    } else {
        let conplus;
        if ((u.ulevel | 0) < xlev) {
            hp = (roleAdv.lofix | 0) + (raceAdv.lofix | 0);
            if ((roleAdv.lornd | 0) > 0) hp += rnd(roleAdv.lornd);
            if ((raceAdv.lornd | 0) > 0) hp += rnd(raceAdv.lornd);
        } else {
            hp = (roleAdv.hifix | 0) + (raceAdv.hifix | 0);
            if ((roleAdv.hirnd | 0) > 0) hp += rnd(roleAdv.hirnd);
            if ((raceAdv.hirnd | 0) > 0) hp += rnd(raceAdv.hirnd);
        }
        const con = acurr(A_CON);
        if (con <= 3) conplus = -2;
        else if (con <= 6) conplus = -1;
        else if (con <= 14) conplus = 0;
        else if (con <= 16) conplus = 1;
        else if (con === 17) conplus = 2;
        else if (con === 18) conplus = 3;
        else conplus = 4;
        hp += conplus;
    }
    if (hp <= 0) hp = 1;
    if ((u.ulevel | 0) < MAXULEV) {
        if (!u.uhpinc) u.uhpinc = [];
        u.uhpinc[u.ulevel | 0] = hp;
    } else {
        let lim = 5 - Math.trunc((u.uhpmax || 0) / 300);
        if (lim < 1) lim = 1;
        if (hp > lim) hp = lim;
    }
    return hp;
}

// C ref: attrib.c change_luck() — clamp u.uluck; no RNG
export function change_luck(n) {
    const u = game.u || (game.u = {});
    let luck = (u.uluck || 0) + (n | 0);
    if (luck > 10) luck = 10;
    if (luck < -10) luck = -10;
    u.uluck = luck;
}

/**
 * C ref: attrib.c stone_luck `:421–437` — sign of luckstone/artifact
 * luck in invent. Cursed subtracts quan; blessed always adds; uncursed
 * adds only when `include_uncursed`. Caller nh_timeout luck timeout
 * uses FALSE then TRUE (carrying(LUCKSTONE) is a separate walk).
 * @param {boolean} include_uncursed
 * @returns {number} -1 / 0 / 1 (C sgn)
 */
export function stone_luck(include_uncursed) {
    let bonchance = 0;
    for (const otmp of game.invent || []) {
        if (!confers_luck(otmp)) continue;
        const q = (otmp.quan | 0) || 1;
        if (otmp.cursed) bonchance -= q;
        else if (otmp.blessed || include_uncursed) bonchance += q;
    }
    return bonchance < 0 ? -1 : (bonchance !== 0 ? 1 : 0);
}

/**
 * C ref: attrib.c set_moreluck `:439–451` — an inventory change hit a
 * luck-granting item: recompute u.moreluck from stone_luck(TRUE) —
 * nothing carried → 0, else ±LUCKADD by sign. C short-circuit order:
 * stone_luck first, carrying(LUCKSTONE) only when it is 0.
 * Callers: the mkobj bless/unbless/curse/uncurse luck arms (fountain-dip
 * bless/curse/uncurse reach them, D-2287); invent addinv/remove stay named.
 */
export function set_moreluck() {
    const u = game.u || (game.u = {});
    const luckbon = stone_luck(true);
    if (!luckbon && !carrying(objectNames.indexOf('LUCKSTONE'))) {
        u.moreluck = 0;
    } else if (luckbon >= 0) {
        u.moreluck = LUCKADD;
    } else {
        u.moreluck = -LUCKADD;
    }
}

/**
 * C ref: attrib.c restore_attrib `:455–484` — countdown for temporary
 * attribute losses/gains toward equilibrium (-1 while weak/wounded-legged,
 * else 0); expired timer steps ATEMP toward 0 and resets ATIME to
 * 100/ACURR(CON); encumber_msg when botl. C has no callers (the moveloop
 * call is long gone — see the C comment), so this ships called from
 * nowhere, like C.
 */
export async function restore_attrib() {
    const u = game.u || {};
    // C youprop.h Wounded_legs macro: u.Wounded_legs ||
    // HWounded_legs&TIMEOUT || EWounded_legs (allmain.js / apply.js precedent).
    const wounded = !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    for (let i = 0; i < A_MAX; i++) { /* all temporary losses/gains */
        // C :472–473
        const equilibrium = (((i === A_STR && (u.uhs | 0) >= WEAK)
            || (i === A_DEX && wounded)) ? -1 : 0);
        const atemp = u.atemp?.a?.[i] | 0;
        const atime = u.atime?.a?.[i] | 0;
        // C :474
        if (atemp !== equilibrium && atime !== 0) {
            // C :475 — --(ATIME(i)) countdown for change
            u.atime.a[i] = atime - 1;
            if (!(u.atime.a[i] | 0)) {
                // C :476–477
                const newtemp = atemp + (atemp > 0 ? -1 : 1);
                u.atemp.a[i] = newtemp;
                if (game.disp) game.disp.botl = true;
                // C :478–479 — reset timer
                if (newtemp) u.atime.a[i] = Math.trunc(100 / acurr(A_CON));
            }
        }
    }
    // C :483–484 — reads live disp.botl (may predate this call), like C
    if (game.disp?.botl) {
        const { encumber_msg } = await import('./invent.js');
        await encumber_msg();
    }
}

/** C ref: align.h ALIGNLIM — (10 + moves/200) */
export function ALIGNLIM() {
    return 10 + Math.trunc((game.moves ?? 0) / 200);
}

/**
 * C ref: attrib.c adjalign — clamp record; abuse/erinys on loss.
 */
export function adjalign(n) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0, abuse: 0 };
    const cur = u.ualign.record | 0;
    const newalign = cur + (n | 0);
    if (n < 0) {
        const newabuse = (u.ualign.abuse | 0) - (n | 0);
        if (newalign < cur) u.ualign.record = newalign;
        if (newabuse > (u.ualign.abuse | 0)) {
            u.ualign.abuse = newabuse;
            adj_erinys(newabuse);
        }
    } else if (newalign > cur) {
        u.ualign.record = newalign;
        const lim = ALIGNLIM();
        if (u.ualign.record > lim) u.ualign.record = lim | 0;
    }
}

/**
 * C ref: attrib.c uchangealign `:1319–1362` — altar conversion
 * (A_CG_CONVERT) + helm on/off arms.
 * Named omissions: retouch_equipment (C artifact.c:2639, align-change
 * tail); it has no live JS counterpart, so the arm names it instead of
 * stubbing. (summon_furies went live in the makemon.c breadth cluster.)
 */
export async function uchangealign(newalign, reason) {
    const u = game.u || (game.u = {});
    if (!u.ualign) u.ualign = { type: 0, record: 0, abuse: 0 };
    const oldalign = u.ualign.type | 0;

    u.ublessed = 0; /* lose divine protection */
    /* You/Your/pline message with call flush_screen(), triggering bot(),
       so the actual data change needs to come before the message */
    if (game.flags) game.flags.botl = true; /* status line needs updating */
    if (reason === A_CG_CONVERT) {
        /* conversion via altar */
        livelog_printf(
            LL_ALIGNMENT,
            `permanently converted to ${aligns[1 - newalign]?.adj}`,
        );
        if (!u.ualignbase) u.ualignbase = {};
        u.ualignbase.current = newalign;
        /* worn helm of opposite alignment might block change */
        if (!u.uarmh || (u.uarmh.otyp | 0) !== HELM_OF_OPPOSITE_ALIGNMENT) {
            u.ualign.type = u.ualignbase.current;
        }
        await pline(
            `You have a ${
                (u.ualign.type | 0) !== oldalign ? 'sudden ' : ''
            }sense of a new direction.`,
        );
    } else {
        /* putting on or taking off a helm of opposite alignment */
        u.ualign.type = newalign;
        if (reason === A_CG_HELM_ON) {
            adjalign(-7); /* for abuse -- record will be cleared shortly */
            await pline(
                `Your mind oscillates ${
                    Hallucination() ? 'wildly' : 'briefly'
                }.`,
            );
            await make_confused(rn1(2, 3), false);
            if (Is_astralevel(u.uz) || rn2(50) < (u.ualign.abuse | 0)) {
                await summon_furies(Is_astralevel(u.uz) ? 0 : 1); // C `:1348`
            }
            /* don't livelog taking it back off */
            livelog_printf(
                LL_ALIGNMENT,
                `used a helm to turn ${aligns[1 - newalign]?.adj}`,
            );
        } else if (reason === A_CG_HELM_OFF) {
            await pline(
                `Your mind is ${
                    Hallucination()
                        ? 'much of a muchness'
                        : 'back in sync with your body'
                }.`,
            );
        }
    }
    if ((u.ualign.type | 0) !== oldalign) {
        u.ualign.record = 0; /* slate is wiped clean */
        /* C attrib.c:1360 — alignment change retests worn/carried artifacts.
           dropflag 0 keeps them; only the touch test runs. */
        await retouch_equipment(0);
    }
}

/*
 * C ref: attrib.c innate tables + role_abil() / adjabil().
 * Prop names match the H* macros that C stores via long* ability.
 * Level-up add_weapon_skill / lose_weapon_skill via the adjabil tail (oldlevel>0).
 * postadjabil wired behind the C :1063 changed-gate (init path u.ulevel==0
 * returns early inside postadjabil itself).
 */
const arc_abil = [
    { ulevel: 1, prop: 'HSearching', gainstr: '', losestr: '' },
    { ulevel: 5, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 10, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
];
const bar_abil = [
    { ulevel: 1, prop: 'HPoison_resistance', gainstr: '', losestr: '' },
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
    { ulevel: 15, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
];
const cav_abil = [
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
];
const hea_abil = [
    { ulevel: 1, prop: 'HPoison_resistance', gainstr: '', losestr: '' },
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
];
const kni_abil = [
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
];
const mon_abil = [
    { ulevel: 1, prop: 'HFast', gainstr: '', losestr: '' },
    { ulevel: 1, prop: 'HSleep_resistance', gainstr: '', losestr: '' },
    { ulevel: 1, prop: 'HSee_invisible', gainstr: '', losestr: '' },
    { ulevel: 3, prop: 'HPoison_resistance', gainstr: 'healthy', losestr: '' },
    { ulevel: 5, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 7, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
    { ulevel: 9, prop: 'HSearching', gainstr: 'perceptive', losestr: 'unaware' },
    { ulevel: 11, prop: 'HFire_resistance', gainstr: 'cool', losestr: 'warmer' },
    { ulevel: 13, prop: 'HCold_resistance', gainstr: 'warm', losestr: 'cooler' },
    { ulevel: 15, prop: 'HShock_resistance', gainstr: 'insulated', losestr: 'conductive' },
    { ulevel: 17, prop: 'HTeleport_control', gainstr: 'controlled', losestr: 'uncontrolled' },
];
const pri_abil = [
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
    { ulevel: 20, prop: 'HFire_resistance', gainstr: 'cool', losestr: 'warmer' },
];
const ran_abil = [
    { ulevel: 1, prop: 'HSearching', gainstr: '', losestr: '' },
    { ulevel: 7, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 15, prop: 'HSee_invisible', gainstr: '', losestr: '' },
];
const rog_abil = [
    { ulevel: 1, prop: 'HStealth', gainstr: '', losestr: '' },
    { ulevel: 10, prop: 'HSearching', gainstr: 'perceptive', losestr: '' },
];
const sam_abil = [
    { ulevel: 1, prop: 'HFast', gainstr: '', losestr: '' },
    { ulevel: 15, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
];
const tou_abil = [
    { ulevel: 10, prop: 'HSearching', gainstr: 'perceptive', losestr: '' },
    { ulevel: 20, prop: 'HPoison_resistance', gainstr: 'hardy', losestr: '' },
];
const val_abil = [
    { ulevel: 1, prop: 'HCold_resistance', gainstr: '', losestr: '' },
    { ulevel: 3, prop: 'HStealth', gainstr: 'stealthy', losestr: '' },
    { ulevel: 7, prop: 'HFast', gainstr: 'quick', losestr: 'slow' },
];
const wiz_abil = [
    { ulevel: 15, prop: 'HWarning', gainstr: 'sensitive', losestr: '' },
    { ulevel: 17, prop: 'HTeleport_control', gainstr: 'controlled', losestr: 'uncontrolled' },
];
const elf_abil = [
    { ulevel: 1, prop: 'HInfravision', gainstr: '', losestr: '' },
    { ulevel: 4, prop: 'HSleep_resistance', gainstr: 'awake', losestr: 'tired' },
];
const orc_abil = [
    { ulevel: 1, prop: 'HInfravision', gainstr: '', losestr: '' },
    { ulevel: 1, prop: 'HPoison_resistance', gainstr: '', losestr: '' },
];
// C ref: attrib.c dwa_abil[] / gno_abil[] — infravision@1 (hum_abil empty).
// Lookup-only (adjabil grants dwarf/gnome infra via set_uasmon, unchanged).
const dwa_abil = [
    { ulevel: 1, prop: 'HInfravision', gainstr: '', losestr: '' },
];
const gno_abil = [
    { ulevel: 1, prop: 'HInfravision', gainstr: '', losestr: '' },
];

// C ref: attrib.c role_abil()
function role_abil(rolePm) {
    switch (rolePm) {
        case PM_ARCHEOLOGIST: return arc_abil;
        case PM_BARBARIAN: return bar_abil;
        case PM_CAVE_DWELLER: return cav_abil;
        case PM_HEALER: return hea_abil;
        case PM_KNIGHT: return kni_abil;
        case PM_MONK: return mon_abil;
        case PM_CLERIC: return pri_abil;
        case PM_RANGER: return ran_abil;
        case PM_ROGUE: return rog_abil;
        case PM_SAMURAI: return sam_abil;
        case PM_TOURIST: return tou_abil;
        case PM_VALKYRIE: return val_abil;
        case PM_WIZARD: return wiz_abil;
        default: return null;
    }
}

/**
 * C ref: attrib.c postadjabil `:780–786` (staticfn) — after an ability's
 * bits change, Warning/See_invisible need a monster-glyph refresh.
 * @param {string} prop H* field name (C long* identity on &HWarning/&HSee_invisible)
 */
function postadjabil(prop) {
    // C :782–783 — initializing hero; don't attempt screen update yet
    if (!(game.u?.ulevel | 0)) return;
    // C :784–785
    if (prop === 'HWarning' || prop === 'HSee_invisible') see_monsters();
}

/**
 * C ref: attrib.c adjabil(oldlevel, newlevel)
 * Grants/revokes role and (elf/orc) race intrinsics by level thresholds.
 * Gain You_feel for nonempty gainstr; weapon-skill tail and postadjabil live.
 */
export async function adjabil(oldlevel, newlevel) {
    const u = game.u || (game.u = {});
    let abil = role_abil(game.urole?.mnum);
    let rabil = null;
    let mask = FROMEXPER;
    const racePm = game.urace?.mnum;
    // C: only ELF and ORC use rabil here; dwarf/gnome infra via set_uasmon.
    if (racePm === PM_ELF) rabil = elf_abil;
    else if (racePm === PM_ORC) rabil = orc_abil;

    let abilIdx = 0;
    let rabilIdx = 0;
    let usingRace = false;

    while (true) {
        let entry = null;
        if (!usingRace) {
            if (abil && abilIdx < abil.length) {
                entry = abil[abilIdx++];
            } else if (rabil && rabilIdx < rabil.length) {
                usingRace = true;
                mask = FROMRACE;
                entry = rabil[rabilIdx++];
            } else {
                break;
            }
        } else if (rabil && rabilIdx < rabil.length) {
            entry = rabil[rabilIdx++];
        } else {
            break;
        }

        const prop = entry.prop;
        const prev = u[prop] || 0;
        if (oldlevel < entry.ulevel && newlevel >= entry.ulevel) {
            // Level-1 abilities also set FROMOUTSIDE so outside sources
            // cannot "gain" a meaningless duplicate (C adjabil).
            if (entry.ulevel === 1) u[prop] = prev | (mask | FROMOUTSIDE);
            else u[prop] = prev | mask;
            // C: if (!(*(abil->ability) & INTRINSIC & ~mask)) You_feel(gainstr)
            if (!((u[prop] || 0) & INTRINSIC & ~mask) && entry.gainstr) {
                await You_feel('%s!', entry.gainstr);
            }
        } else if (oldlevel >= entry.ulevel && newlevel < entry.ulevel) {
            u[prop] = prev & ~mask;
            // C attrib.c:1056–1060 — losestr, else "less %s!"
            if (!((u[prop] || 0) & INTRINSIC)) {
                if (entry.losestr) await You_feel('%s!', entry.losestr);
                else if (entry.gainstr) await You_feel('less %s!', entry.gainstr);
            }
        }
        // C :1063–1064 — it changed
        if (prev !== (u[prop] || 0)) postadjabil(prop);
    }
    // C attrib.c:1068–1073 — a level change grants or drains skill slots
    // (add_weapon_skill is async: give_may_advance_msg can reach nhgetch).
    if (oldlevel > 0) {
        if (newlevel > oldlevel) {
            await add_weapon_skill(newlevel - oldlevel);
        } else {
            lose_weapon_skill(oldlevel - newlevel);
        }
    }
}

/** C ref: youprop.h Fast — HFast||EFast ≡ uprops[FAST].intrinsic||extrinsic */
export function Fast() {
    const u = game.u || {};
    const prop = u.uprops?.[FAST];
    return !!((u.HFast | 0) || (u.EFast | 0)
        || (prop?.intrinsic | 0) || (prop?.extrinsic | 0));
}

/** C ref: youprop.h Searching */
export function Searching() {
    const u = game.u || {};
    return !!(u.HSearching || u.ESearching);
}

/**
 * C ref: youprop.h Fumbling — HFumbling || EFumbling
 * (uprops[FUMBLING].intrinsic || .extrinsic; flat H/E mirrors).
 */
export function Fumbling() {
    const u = game.u || {};
    const prop = u.uprops?.[FUMBLING];
    const h = (u.HFumbling | 0) | (prop?.intrinsic | 0);
    const e = (u.EFumbling | 0) | (prop?.extrinsic | 0);
    return !!(h || e);
}

/**
 * C ref: youprop.h Very_fast — (HFast & ~INTRINSIC) || EFast
 * Timeout/potion bits and worn extrinsic (speed boots / blue DSM).
 */
export function Very_fast() {
    const u = game.u || {};
    const prop = u.uprops?.[FAST];
    const h = (u.HFast | 0) | (prop?.intrinsic | 0);
    const e = (u.EFast | 0) | (prop?.extrinsic | 0);
    return !!((h & ~INTRINSIC) || e);
}

/* C ref: attrib.c innately() reason codes */
const FROM_NONE = 0;
const FROM_ROLE_REASON = 1; /* experience at level 1 */
const FROM_RACE_REASON = 2;
const FROM_INTR = 3;
const FROM_EXP = 4;
const FROM_FORM_REASON = 5;
const FROM_LYCN = 6;

/** Map enlightenment prop index → H* field used by adjabil. */
const PROP_HFIELD = {
    [POISON_RES]: 'HPoison_resistance',
    [STEALTH]: 'HStealth',
    [FAST]: 'HFast',
    [JUMPING]: 'HJumping',
    [DRAIN_RES]: 'HDrain_resistance',
    [BLINDED]: 'HBlinded',
    [BLND_RES]: 'HBlnd_resist',
    [TELEPORT_CONTROL]: 'HTeleport_control',
    [SEARCHING]: 'HSearching',
    [FIRE_RES]: 'HFire_resistance',
    // C attrib.c is_innate — every prop with a role/race table row needs
    // its H-field here or from_what stays silent (D-1995: elven Priest
    // "sleep resistant innately" / "infravision innately", elf_abil).
    [SLEEP_RES]: 'HSleep_resistance',
    [INFRAVISION]: 'HInfravision',
    [SEE_INVIS]: 'HSee_invisible',
    [WARNING]: 'HWarning',
    // C insight.c attributes_enlightenment resistance catalogue (D-1997):
    // Cold/Disint/Shock/Acid/Sick/Stone arms need their H-fields here or
    // from_what stays silent (human Valkyrie "cold resistant innately").
    [COLD_RES]: 'HCold_resistance',
    [SHOCK_RES]: 'HShock_resistance',
    [DISINT_RES]: 'HDisint_resistance',
    [ACID_RES]: 'HAcid_resistance',
    [SICK_RES]: 'HSick_resistance',
    [STONE_RES]: 'HStone_resistance',
};

/**
 * C ref: attrib.c check_innate_abil — role/race table entry if active.
 * @param {string} propField
 * @param {number} frommask FROMEXPER | FROMRACE
 */
function check_innate_abil(propField, frommask) {
    let abil = null;
    if (frommask === FROMEXPER) {
        abil = role_abil(game.urole?.mnum);
    } else if (frommask === FROMRACE) {
        const racePm = game.urace?.mnum;
        if (racePm === PM_ELF) abil = elf_abil;
        else if (racePm === PM_ORC) abil = orc_abil;
        else if (racePm === PM_DWARF) abil = dwa_abil;
        else if (racePm === PM_GNOME) abil = gno_abil;
        // hum_abil is empty in C as well
    }
    if (!abil) return null;
    const ulevel = game.u?.ulevel | 0;
    for (const entry of abil) {
        if (entry.prop === propField && ulevel >= entry.ulevel) return entry;
    }
    return null;
}

/**
 * C ref: attrib.c innately(long *ability)
 * @param {string} propField
 */
function innately(propField) {
    const ability = game.u?.[propField] | 0;
    let iptr = check_innate_abil(propField, FROMEXPER);
    if (iptr) return iptr.ulevel === 1 ? FROM_ROLE_REASON : FROM_EXP;
    iptr = check_innate_abil(propField, FROMRACE);
    if (iptr) return FROM_RACE_REASON;
    if ((ability & FROMOUTSIDE) !== 0) return FROM_INTR;
    if ((ability & FROMFORM) !== 0) return FROM_FORM_REASON;
    return FROM_NONE;
}

/**
 * C ref: attrib.c is_innate(propidx) `:880-900` — whole C body in C order:
 * DRAIN_RES lycn / FAST / innately / knight-JUMPING / eyeless-BLIND +
 * BLND_RES-FROMFORM arms.
 * Named omissions: none.
 */
export function is_innate(propidx) {
    if (propidx === DRAIN_RES && (game.u?.ulycn | 0) > 0) return FROM_LYCN;
    if (propidx === FAST && Very_fast()) return FROM_NONE;
    const field = PROP_HFIELD[propidx];
    if (!field) return FROM_NONE;
    const innateness = innately(field);
    if (innateness !== FROM_NONE) return innateness;
    if (
        propidx === JUMPING
        && game.urole?.mnum === PM_KNIGHT
        && !(game.u?.EJumping | 0)
    ) {
        return FROM_ROLE_REASON;
    }
    // C attrib.c:896-898 — eyeless form is innately blind; BLND_RES with
    // FROMFORM (dead in C: innately() above already returned FROM_FORM).
    if ((propidx === BLINDED && !haseyes(game.youmonst?.data))
        || (propidx === BLND_RES && (((game.u?.HBlnd_resist | 0) & FROMFORM) !== 0)))
        return FROM_FORM_REASON;
    return FROM_NONE;
}

/**
 * C ref: attrib.c from_what — wizard-mode intrinsic source suffix.
 * Ported: innate reasons; FAST+Very_fast known speed-boots / worn-
 * equipment arms; what_gives extrinsic worn/artifact; " pair of " strip;
 * negative BLINDED Eyes-of-the-Overworld / INVIS mummy-wrapping /
 * CLAIRVOYANT cornuthaum arms (D-3208).
 * Named omissions: birth blind/deaf; Blindfolded_only / cream.
 */
export function from_what(propidx) {
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    if (!wizard) return '';
    if (propidx < 0) {
        // C attrib.c:977–997 switch (-propidx), in C order. Blocked masks
        // read the JS dual store (flat B-mirror OR uprops[].blocked —
        // apply_w_blocks writes both; readers in do_wear.js/invent.js OR
        // them too); the tested slot bit is C-exact.
        if (-propidx === BLINDED && (game.u?.BBlinded | 0)
            && is_art(game.u?.ublindf, ART_EYES_OF_THE_OVERWORLD)) {
            // Eyes of the Overworld override blindness
            // (insight.c:1564–1566 you_can arm).
            return ` because of ${bare_artifactname(game.u.ublindf)}`;
        }
        if (-propidx === INVIS
            && ((((game.u?.BInvis | 0)
                | (game.u?.uprops?.[INVIS]?.blocked | 0)) & W_ARMC) !== 0)) {
            // Mummy wrapping blocks invisibility
            // (insight.c:1666 "visible" arm).
            return ` because of ${ysimple_name(game.u.uarmc)}`;
        }
        if (-propidx === CLAIRVOYANT && wizard
            && ((((game.u?.BClairvoyant | 0)
                | (game.u?.uprops?.[CLAIRVOYANT]?.blocked | 0)) & W_ARMH) !== 0)) {
            // Cornuthaum blocks clairvoyance
            // (insight.c:1617 "if not for" arm).
            return ` because of ${ysimple_name(game.u.uarmh)}`;
        }
        return '';
    }
    let buf = '';
    const innateness = is_innate(propidx);
    if (innateness === FROM_ROLE_REASON || innateness === FROM_RACE_REASON) {
        buf = ' innately';
    } else if (innateness === FROM_INTR) {
        buf = ' intrinsically';
    } else if (innateness === FROM_EXP) {
        buf = ' because of your experience';
    } else if (innateness === FROM_LYCN) {
        buf = ' due to your lycanthropy';
    } else if (innateness === FROM_FORM_REASON) {
        buf = ' from your creature form';
    } else if (propidx === FAST && Very_fast()) {
        // C attrib.c: propidx == FAST && Very_fast — before what_gives.
        // Known speed boots (W_ARMF + dknown + oc_name_known) →
        // ysimple_name(uarmf); blue DSM EFast|W_ARM → "worn equipment".
        const u = game.u || {};
        const h = (u.HFast | 0) | (u.uprops?.[FAST]?.intrinsic | 0);
        const e = (u.EFast | 0) | (u.uprops?.[FAST]?.extrinsic | 0);
        if ((h & TIMEOUT) !== 0) {
            buf = ' because of a potion or spell';
        } else if (
            (e & W_ARMF) !== 0
            && u.uarmf?.dknown
            && game.objects?.[u.uarmf.otyp]?.oc_name_known
        ) {
            buf = ` because of ${ysimple_name(u.uarmf)}`;
        } else if (e) {
            buf = ' because of worn equipment';
        } else {
            buf = ' because of something';
        }
    } else {
        // C: wizard && (obj = what_gives(&u.uprops[propidx].extrinsic))
        const extrinsic = game.u?.uprops?.[propidx]?.extrinsic | 0;
        const obj = what_gives(extrinsic, propidx);
        if (obj) {
            // C: obj->oartifact ? bare_artifactname(obj) : ysimple_name(obj)
            const because = obj.oartifact
                ? bare_artifactname(obj)
                : ysimple_name(obj);
            buf = ` because of ${because}`;
        }
    }
    // C attrib.c:971–975 — copynchars(p+1, p+9) keeps the match's first
    // char and the tail after " pair of "; STRANGLED truncates at the match.
    const pairTail = strstri(buf, ' pair of ');
    if (pairTail != null) {
        const at = buf.length - pairTail.length;
        let tail = pairTail.slice(' pair of '.length);
        const nl = tail.indexOf('\n');
        if (nl >= 0) tail = tail.slice(0, nl);
        buf = buf.slice(0, at + 1) + tail;
    } else if (propidx === STRANGLED) {
        const choke = strstri(buf, ' of strangulation');
        if (choke != null) buf = buf.slice(0, buf.length - choke.length);
    }
    return buf;
}
