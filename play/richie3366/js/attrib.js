// attrib.js — Hero attributes.
// C ref: attrib.c — rnd_attr, init_attr, vary_init_attr, adjattrib,
//        poisoned / poisontell, adjabil / role_abil (partial).

import { game } from './gstate.js';
import { rn2, rnd, d, rn1 } from './rng.js';
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
    WARNING,
    FUMBLING,
    TIMEOUT,
    OBJ_INVENT,
    W_ARMF,
    KILLED_BY,
    KILLED_BY_AN,
    POISONING,
    DIED,
} from './const.js';
import { objectNames } from './objects.js';
import { pline, You_feel } from './display.js';
import { cxname } from './objnam.js';
import { what_gives, bare_artifactname } from './artifact.js';
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
} from './generated/monsters_data.js';
import { adj_erinys } from './monsters.js';

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
        // C: nymph / incubus-succubus floor CHA to 18 — deferred (need youmonst)
    } else if (i === A_CON) {
        // C: ART_OGRESMASHER → 25 — deferred
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

// C ref: attrib.c exercise()
export function exercise(i, inc_or_dec) {
    if (i === A_INT || i === A_CHA) return;
    const u = game.u;
    // C: no physical exercise while polymorphed (WIS still allowed)
    if (Upolyd(u) && i !== A_WIS) return;
    if (!u.aexe) u.aexe = { a: [0, 0, 0, 0, 0, 0] };
    const ax = u.aexe.a[i] || 0;
    const AVAL = 50; // attrib.h
    if (Math.abs(ax) < AVAL) {
        // C: AEXE(i) += (inc_or_dec) ? (rn2(19) > ACURR(i)) : -rn2(2);
        if (inc_or_dec) {
            u.aexe.a[i] = ax + (rn2(19) > acurr(i) ? 1 : 0);
        } else {
            u.aexe.a[i] = ax - rn2(2);
        }
    }
}

function attrMax(i) {
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
function minuhpmax(altmin) {
    const u = game.u || {};
    if ((altmin | 0) < 1) altmin = 1;
    return Math.max(u.ulevel | 0, altmin | 0);
}

/**
 * C ref: attrib.c adjuhploss — shrink pending loss if setuhpmax already cut HP.
 * @param {number} loss
 * @param {number} olduhp
 */
function adjuhploss(loss, olduhp) {
    const u = game.u || {};
    if (!Upolyd(u)) {
        if ((u.uhp | 0) < (olduhp | 0)) loss -= (olduhp | 0) - (u.uhp | 0);
    } else if ((u.mh | 0) < (olduhp | 0)) {
        loss -= (olduhp | 0) - (u.mh | 0);
    }
    return Math.max(loss | 0, 1);
}

/** C hacklib.c strstri — case-insensitive substring (poison reason gate). */
function strstri(hay, needle) {
    if (!hay || !needle) return false;
    return String(hay).toLowerCase().includes(String(needle).toLowerCase());
}

/**
 * C ref: attrib.c poisoned() — attack/trap poison on hero.
 * Arms: resist early-out; rn2(fatal) gate; instant-kill / HP / attrib-loss;
 * done(POISONING|DIED) when uhp<1; encumber_msg.
 * Named omissions: name_to_mon G_UNIQ / the() killer-prefix polish;
 * Half_gas_damage towel; Fixed_abil via adjattrib.
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
        // shieldeff for blast deferred
        await pline("The poison doesn't seem to affect you.");
        return;
    }

    // Killer prefix: G_UNIQ / the()/an()/a() polish deferred — keep C default
    let kprefix = KILLED_BY_AN;
    let killer = pkiller || 'poison';
    const kl = String(killer).toLowerCase();
    if (kl.startsWith('the ') || kl.startsWith('an ') || kl.startsWith('a ')) {
        kprefix = KILLED_BY;
    }

    // C: i = !fatal ? 1 : rn2(fatal + (thrown_weapon ? 20 : 0));
    const i = !fatal ? 1 : rn2((fatal | 0) + (thrown_weapon ? 20 : 0));
    if (i === 0 && (typ | 0) !== A_CHA) {
        // sometimes survivable instant kill
        let loss = 6 + d(4, 6); // 6 + 4d6 => 10..34
        if ((u.uhp | 0) <= loss) {
            u.uhp = -1;
            if (game.flags) game.flags.botl = true;
            if (game.disp) game.disp.botl = true;
            await pline('The poison was deadly...');
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
        // HP damage; more likely—but less severe—with missiles
        let loss = thrown_weapon ? rnd(6) : rn1(10, 6);
        // Half_gas_damage (worn towel) for blast/cloud deferred
        losehp(loss, killer, kprefix);
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

/**
 * C ref: attrib.c adjattrib() — mutate ABASE/AMAX; You_feel when msgflg <= 0.
 * Fixed_abil / Dunce cap / verbose "already" messages deferred.
 * @param {number} ndx
 * @param {number} incr
 * @param {number|boolean} [msgflg=1] positive => silent; <=0 => You_feel
 */
export async function adjattrib(ndx, incr, msgflg = 1) {
    if (!incr) return false;
    const old_acurr = acurr(ndx);
    const old = abase(ndx);
    setAbase(ndx, old + incr);
    let attrstr;
    if (incr > 0) {
        if (abase(ndx) > amax(ndx)) {
            setAmax(ndx, abase(ndx));
            if (amax(ndx) > attrMax(ndx)) {
                setAbase(ndx, attrMax(ndx));
                setAmax(ndx, attrMax(ndx));
            }
        }
        attrstr = PLUSATTR[ndx];
    } else {
        if (abase(ndx) < attrMin(ndx)) {
            // decrease-below-min path uses rn2; not hit by vary_init_attr on seed8000
            const decr = rn2(attrMin(ndx) - abase(ndx) + 1);
            setAbase(ndx, attrMin(ndx));
            setAmax(ndx, amax(ndx) - decr);
            if (amax(ndx) < attrMin(ndx)) setAmax(ndx, attrMin(ndx));
        }
        attrstr = MINUSATTR[ndx];
    }
    // C: if (ACURR(ndx) == old_acurr) return FALSE (verbose msgs deferred)
    if (acurr(ndx) === old_acurr) return false;
    if (game.u.aexe?.a) game.u.aexe.a[ndx] = 0;
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    if (game.disp) game.disp.botl = true;
    if ((msgflg | 0) <= 0) {
        const { You_feel } = await import('./display.js');
        const very = (incr > 1 || incr < -1) ? 'very ' : '';
        await You_feel(`${very}${attrstr}!`);
    }
    // C: if (program_state.in_moveloop && (ndx == A_STR || ndx == A_CON))
    //        encumber_msg();
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
 * C ref: attrib.c redist_attr — newman / poly attr shake.
 * Skips INT/WIS; each other attr gets AMAX += rn2(5)-2 clamped to
 * race ATTRMAX/ATTRMIN, then ABASE scaled by new/old max.
 * encumber_msg is caller's job.
 */
export function redist_attr() {
    for (let i = 0; i < A_MAX; i++) {
        if (i === A_INT || i === A_WIS) continue;
        const tmp = amax(i) | 0;
        let nm = tmp + (rn2(5) - 2);
        if (nm > attrMax(i)) nm = attrMax(i);
        if (nm < attrMin(i)) nm = attrMin(i);
        setAmax(i, nm);
        // C: ABASE(i) = ABASE(i) * AMAX(i) / tmp; trunc toward 0
        let nb = tmp ? Math.trunc((abase(i) | 0) * nm / tmp) : abase(i) | 0;
        if (nb < attrMin(i)) nb = attrMin(i);
        setAbase(i, nb);
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

/*
 * C ref: attrib.c innate tables + role_abil() / adjabil().
 * Prop names match the H* macros that C stores via long* ability.
 * Level-up add_weapon_skill / lose_weapon_skill deferred (oldlevel>0).
 * postadjabil see_monsters deferred (init path has u.ulevel==0 → no-op).
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
 * C ref: attrib.c adjabil(oldlevel, newlevel)
 * Grants/revokes role and (elf/orc) race intrinsics by level thresholds.
 * Gain You_feel for nonempty gainstr; lose/postadjabil/weapon-skill deferred.
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
                await pline(`You feel ${entry.gainstr}!`);
            }
        } else if (oldlevel >= entry.ulevel && newlevel < entry.ulevel) {
            u[prop] = prev & ~mask;
            // losestr pline deferred
        }
        // postadjabil deferred
    }
    // C: if (oldlevel > 0) add/lose_weapon_skill — deferred
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
    [WARNING]: 'HWarning',
};

/**
 * C ref: objnam.c ysimple_name — "your|the" + minimal_xname via cxname.
 * Named omissions: full minimal_xname bareobj suppress; shk ownership.
 */
function ysimple_name(obj) {
    if (!obj) return 'something';
    const carried = obj.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    return `${carried ? 'your' : 'the'} ${cxname(obj)}`;
}

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
        // dwa/gno/hum tables empty or unused for current seeds
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
 * C ref: attrib.c is_innate(propidx)
 * Named omissions: knight JUMPING extrinsic override; !haseyes BLINDED /
 * BLND_RES FROMFORM arms beyond H-field; lycanthrope DRAIN_RES only when
 * ulycn set.
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
    return FROM_NONE;
}

/**
 * C ref: attrib.c from_what — wizard-mode intrinsic source suffix.
 * Ported: innate reasons; FAST+Very_fast known speed-boots / worn-
 * equipment arms; what_gives extrinsic worn/artifact; " pair of " strip.
 * Named omissions: birth blind/deaf; Blindfolded_only / cream;
 * negative prop blocking; strangulation trim.
 */
export function from_what(propidx) {
    const wizard = !!(game.flags?.wizard || game.flags?.debug);
    if (!wizard || propidx < 0) return '';
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
        const obj = what_gives(extrinsic);
        if (obj) {
            // C: obj->oartifact ? bare_artifactname(obj) : ysimple_name(obj)
            const because = obj.oartifact
                ? bare_artifactname(obj)
                : ysimple_name(obj);
            buf = ` because of ${because}`;
        }
    }
    // C: strstri(buf, " pair of ") → collapse to single space
    const pair = buf.indexOf(' pair of ');
    if (pair >= 0) {
        buf = `${buf.slice(0, pair)} ${buf.slice(pair + ' pair of '.length)}`;
    }
    return buf;
}
