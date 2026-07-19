// polyself.js — Hero polymorph (partial).
// C ref: polyself.c / wizcmds.c wiz_polyself

import { game } from './gstate.js';
import { rn2, rn1, d, rnd } from './rng.js';
import { pline } from './display.js';
import { newsym } from './display.js';
import { getlin } from './getline.js';
import { an } from './objnam.js';
import { pmname } from './do_name.js';
import { name_to_mon } from './mondata.js';
import { exercise, A_STR, A_CON, A_WIS } from './attrib.js';
import { find_ac } from './u_init.js';
import { setworn } from './do_wear.js';
import { dropx, canletgo } from './do.js';
import { setuwep, setuswapwep } from './wield.js';
import { races } from './roles.js';
import {
    mons,
    polyok,
    is_male,
    is_female,
    is_neuter,
    is_placeholder,
    is_orc,
    is_elf,
    is_dwarf,
    is_gnome,
    is_golem,
    strongmonst,
    bigmonst,
    humanoid,
    is_whirly,
    noncorporeal,
    nohands,
    verysmall,
    MZ_SMALL,
} from './monsters.js';
import {
    POLY_CONTROLLED,
    POLY_LOW_CTRL,
    POLY_MONSTER,
    POLY_REVERT,
    NON_PM,
    LOW_PM,
    Upolyd,
    ECMD_OK,
    MALE,
    FEMALE,
    G_GENOD,
    W_ARM,
    W_ARMC,
    W_ARMU,
    In_endgame,
} from './const.js';
import {
    PM_HUMAN,
    PM_ORC,
    PM_ELF,
    PM_DWARF,
    PM_GNOME,
    monsterNames,
} from './generated/monsters_data.js';
import { TOOL_CLASS, objects } from './objects.js';

const PM_GRAY_DRAGON = monsterNames.indexOf('PM_GRAY_DRAGON');
const PM_URUK_HAI = monsterNames.indexOf('PM_URUK_HAI');
const PM_ORC_CAPTAIN = monsterNames.indexOf('PM_ORC_CAPTAIN');

function mungspaces(s) {
    return String(s || '').trim().replace(/\s+/g, ' ');
}

/** C ref: mondata.c sliparm — whirly / small / noncorporeal */
function sliparm(ptr) {
    return !!(is_whirly(ptr) || (ptr?.msize ?? 99) <= MZ_SMALL || noncorporeal(ptr));
}

/** C ref: mondata.c breakarm — large forms that shatter armor */
function breakarm(ptr) {
    if (sliparm(ptr)) return false;
    return !!(bigmonst(ptr) || ((ptr?.msize ?? 0) > MZ_SMALL && !humanoid(ptr)));
}

/**
 * C ref: role.c character_race — races[] entry whose mnum matches.
 * @param {number} mndx
 */
function character_race(mndx) {
    for (const r of races) {
        if ((r.mnum | 0) === (mndx | 0)) return r;
    }
    return null;
}

/**
 * C ref: polyself.c uasmon_maxStr — race attrmax STR for current umonnum.
 */
function uasmon_maxStr() {
    let mndx = game.u?.umonnum | 0;
    const ptr = mons(mndx);
    if (is_orc(ptr)) {
        if (mndx !== PM_URUK_HAI && mndx !== PM_ORC_CAPTAIN) mndx = PM_ORC;
    } else if (is_elf(ptr)) {
        mndx = PM_ELF;
    } else if (is_dwarf(ptr)) {
        mndx = PM_DWARF;
    } else if (is_gnome(ptr)) {
        mndx = PM_GNOME;
    }
    const R = character_race(mndx);
    if (strongmonst(ptr)) {
        return R ? (R.attrmax[A_STR] | 0) : 18 + 100; // STR18(100) fallback
    }
    return R ? (R.attrmax[A_STR] | 0) : 18;
}

/**
 * C ref: polyself.c set_uasmon — point youmonst.data at mons[umonnum].
 * Named omissions: FROMFORM resistance PROPSET catalogue; vamp cham;
 * polysense; light-source bookkeeping.
 */
export function set_uasmon() {
    const u = game.u || (game.u = {});
    const mndx = u.umonnum | 0;
    const mdat = mons(mndx);
    if (!game.youmonst) game.youmonst = {};
    game.youmonst.data = mdat;
    game.youmonst.mnum = mndx;
    game.youmonst.m_id = 1;
    // Protection_from_shape_changers / vampire cham deferred
    if (game.youmonst.cham == null) game.youmonst.cham = NON_PM;
    u.mcham = game.youmonst.cham;
}

function copyAttrBundle(src) {
    return { a: [...(src?.a || [0, 0, 0, 0, 0, 0])] };
}

/**
 * C ref: mondata.h cantwield — nohands || verysmall.
 * @param {object|null|undefined} ptr
 */
function cantwield(ptr) {
    return nohands(ptr) || verysmall(ptr);
}

/**
 * C ref: weapon.c weapon_descr subset for drop_weapon alone-message.
 * TOOL_CLASS → "tool" (magic lamp); else "weapon".
 * @param {object} obj
 */
function poly_weapon_descr(obj) {
    if (!obj) return 'weapon';
    if ((obj.oclass | 0) === TOOL_CLASS) return 'tool';
    const od = objects()?.[obj.otyp | 0];
    const nm = String(od?.oc_name || od?.name || '').toLowerCase();
    if (nm.includes('sword') || nm.includes('saber')) return 'sword';
    return 'weapon';
}

/**
 * C ref: polyself.c drop_weapon(alone) — cantwield forms must drop uwep.
 * Named omissions: twoweapon dual-drop detail; in_use defer; could_twoweap
 * untwoweapon arm; update_inventory side effects; Heart-of-Ahriman note.
 * @param {number} alone
 */
async function drop_weapon(alone) {
    const u = game.u || {};
    if (!u.uwep) return;
    const uptr = game.youmonst?.data;
    // C: if (!alone || cantwield(youmonst.data))
    if (alone && !cantwield(uptr)) {
        // could_twoweap untwoweapon deferred
        return;
    }
    const candropwep = await canletgo(u.uwep, '');
    let candropswapwep = true;
    if (u.twoweap && u.uswapwep) {
        candropswapwep = await canletgo(u.uswapwep, '');
    } else if (u.twoweap) {
        candropswapwep = false;
    }
    if (alone) {
        const what = (candropwep && candropswapwep) ? 'drop' : 'release';
        let which = poly_weapon_descr(u.uwep);
        if (u.twoweap && u.uswapwep) {
            const whichtoo = poly_weapon_descr(u.uswapwep);
            if (which !== whichtoo) which = 'weapon';
        }
        if ((u.uwep.quan || 1) !== 1 || u.twoweap) {
            // makeplural deferred — quan>1 uncommon for wielded tools
            if (!which.endsWith('s')) which += 's';
        }
        // C: the_your[!!strncmp(which,"corpse",6)] — "tool" → "your"
        const your = which.startsWith('corpse') ? 'the' : 'your';
        await pline(`You find you must ${what} ${your} ${which}!`);
    }
    if (u.twoweap && u.uswapwep) {
        const otmp = u.uswapwep;
        setuswapwep(null);
        if (!otmp.in_use && candropswapwep) dropx(otmp);
    }
    {
        const otmp = u.uwep;
        setuwep(null);
        if (!otmp.in_use && candropwep) dropx(otmp);
    }
}

/**
 * C ref: polyself.c break_armor — sliparm / breakarm gear shedding.
 * Named omissions: mummy wrapping / alchemy smock / horns / gloves /
 * boots / shield / racial_exception; donning cancel; end_burn DSM.
 */
async function break_armor() {
    const u = game.u || {};
    const uptr = game.youmonst?.data;
    if (!uptr) return;

    if (breakarm(uptr)) {
        const otmp = u.uarm;
        if (otmp) {
            await pline('You break out of your armor!');
            exercise(A_STR, false);
            setworn(null, W_ARM);
            // useup deferred — drop to floor like sliparm dropp
            dropx(otmp);
        }
        const cloak = u.uarmc;
        if (cloak) {
            await pline('The clasp on your cloak breaks open!');
            setworn(null, W_ARMC);
            dropx(cloak);
        }
        if (u.uarmu) {
            const shirt = u.uarmu;
            await pline('Your shirt rips to shreds!');
            setworn(null, W_ARMU);
            dropx(shirt);
        }
    } else if (sliparm(uptr)) {
        const otmp = u.uarm;
        if (otmp) {
            await pline('Your armor falls around you!');
            setworn(null, W_ARM);
            dropx(otmp);
        }
        const cloak = u.uarmc;
        if (cloak) {
            if (is_whirly(uptr)) {
                await pline('Your cloak falls, unsupported!');
            } else {
                await pline('You shrink out of your cloak!');
            }
            setworn(null, W_ARMC);
            dropx(cloak);
        }
        if (u.uarmu) {
            const shirt = u.uarmu;
            if (is_whirly(uptr)) {
                await pline('You seep right through your shirt!');
            } else {
                await pline('You become much too small for your shirt!');
            }
            setworn(null, W_ARMU);
            dropx(shirt);
        }
    }
}

/**
 * C ref: polyself.c polymon — become mntmp.
 * Envelope: geno abort; conduct; CON/WIS exercise; sex_change_ok rn2(10);
 * turn-into pline; rn1(500,500) mtimedone; set_uasmon; STR clamp;
 * mhmax (dragon / golem / d(mlvl,8)); break_armor; find_ac; newsym.
 * Named omissions: Stoned/Sick/Slimed/strangle/glib; hideunder; utrap;
 * Blind restore; egg learn; swallow expel; light sources;
 * full skinback; livelog first-poly text; break_armor horns/gloves/
 * boots/shield; drop_weapon twoweapon/in_use arms.
 * @param {number} mntmp
 * @returns {Promise<number>} 1 on success, 0 on geno abort
 */
export async function polymon(mntmp) {
    const u = game.u || (game.u = {});
    const flags = game.flags || (game.flags = {});
    let dochange = false;

    const mv = game.mvitals?.[mntmp];
    if (mv && ((mv.mvflags | 0) & G_GENOD)) {
        const nm = pmname(mntmp, flags.female ? FEMALE : MALE);
        await pline(`You feel rather ${nm}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    if (!u.uconduct) u.uconduct = {};
    u.uconduct.polyselfs = (u.uconduct.polyselfs | 0) + 1;
    // first-poly livelog deferred

    exercise(A_CON, false);
    exercise(A_WIS, true);

    if (!Upolyd(u)) {
        u.macurr = copyAttrBundle(u.acurr);
        u.mamax = copyAttrBundle(u.amax);
        u.mfemale = !!flags.female;
    } else {
        u.acurr = copyAttrBundle(u.macurr);
        u.amax = copyAttrBundle(u.mamax);
        flags.female = !!u.mfemale;
    }

    const mdat = mons(mntmp);
    if (mdat && mdat.mlet !== 'S_MIMIC') {
        if (game.youmonst) {
            game.youmonst.m_ap_type = 0; // M_AP_NOTHING
            game.youmonst.mappearance = 0;
        }
    }

    if (is_male(mdat)) {
        if (flags.female) dochange = true;
    } else if (is_female(mdat)) {
        if (!flags.female) dochange = true;
    } else if (!is_neuter(mdat) && mntmp !== (u.ulycn | 0)) {
        if (game.sex_change_ok && !rn2(10)) dochange = true;
    }

    let buf = (u.umonnum | 0) !== mntmp ? '' : 'new ';
    if (dochange) {
        flags.female = !flags.female;
        if (!(is_male(mdat) || is_female(mdat))) {
            buf += flags.female ? 'female ' : 'male ';
        }
    }
    buf += pmname(mntmp, flags.female ? FEMALE : MALE);
    const verb = (u.umonnum | 0) !== mntmp ? 'turn into' : 'feel like';
    await pline(`You ${verb} ${an(buf)}!`);

    // Stoned → stone golem deferred

    u.mtimedone = rn1(500, 500);
    u.umonnum = mntmp;
    set_uasmon();

    const newMaxStr = uasmon_maxStr();
    if (strongmonst(mdat)) {
        u.acurr.a[A_STR] = newMaxStr;
        u.amax.a[A_STR] = newMaxStr;
    } else {
        u.amax.a[A_STR] = newMaxStr;
        if ((u.acurr.a[A_STR] | 0) > newMaxStr) u.acurr.a[A_STR] = newMaxStr;
    }

    const mlvl = mdat?.mlevel | 0;
    if (mdat?.mlet === 'S_DRAGON' && mntmp >= PM_GRAY_DRAGON) {
        u.mhmax = In_endgame(u.uz) ? (8 * mlvl) : (4 * mlvl + d(mlvl, 4));
    } else if (is_golem(mdat)) {
        // golemhp deferred — treat as ordinary d()
        u.mhmax = mlvl ? d(mlvl, 8) : rnd(4);
    } else {
        if (!mlvl) u.mhmax = rnd(4);
        else u.mhmax = d(mlvl, 8);
        // is_home_elemental ×3 deferred
    }
    u.mh = u.mhmax;

    if ((u.ulevel | 0) < mlvl) {
        u.mtimedone = Math.trunc((u.mtimedone | 0) * (u.ulevel | 0) / mlvl);
    }

    await break_armor();
    // C: drop_weapon(1) — cantwield (dragon/nohands) must drop uwep
    await drop_weapon(1);
    find_ac();
    newsym(u.ux, u.uy);
    flags.botl = true;
    return 1;
}

/**
 * C ref: polyself.c polyself — POLY_CONTROLLED getlin → polymon envelope.
 * Named omissions: Unchanging; system-shock !Poly_control path; newman;
 * random rn1(SPECIAL_PM) pick; were/vamp/dragon-merge; placeholder orc/elf/
 * giant substitutes; mkclass_poly; wizard rehumanize own-role; light sources.
 * @param {number} [psflags=POLY_NOFLAGS]
 */
export async function polyself(psflags = 0) {
    const u = game.u || (game.u = {});
    const forcecontrol = (psflags & POLY_CONTROLLED) !== 0;
    // low_control / monsterpoly / formrevert reserved for later arms
    void (psflags & POLY_LOW_CTRL);
    void (psflags & POLY_MONSTER);
    void (psflags & POLY_REVERT);

    if (u.Unchanging) {
        await pline('You fail to transform!');
        return;
    }

    // system-shock / Poly_control natural path deferred (!forcecontrol)

    let mntmp = NON_PM;
    if (forcecontrol) {
        let tryct = 5;
        do {
            mntmp = NON_PM;
            let buf = await getlin('Become what kind of monster? [type the name]');
            buf = mungspaces(buf);
            if (buf === '\x1b' || buf == null) {
                await pline('Never mind.');
                return;
            }
            if (buf === '*' || buf.toLowerCase() === 'random') {
                tryct = 0;
                continue;
            }
            mntmp = name_to_mon(buf);
            if (mntmp < LOW_PM) {
                await pline("I've never heard of such monsters.");
            } else if (is_placeholder(mons(mntmp))
                && mntmp !== PM_HUMAN
                /* your_race placeholder arm deferred */) {
                await pline(`You can't polymorph into ${an(pmname(mntmp, FEMALE))}.`);
                mntmp = NON_PM;
            } else if (!polyok(mons(mntmp))
                && !(mntmp === PM_HUMAN
                    || mntmp === (game.urole?.mnum | 0))) {
                await pline(`You can't polymorph into ${an(pmname(mntmp, game.flags?.female ? FEMALE : MALE))}.`);
                mntmp = NON_PM;
            } else {
                break;
            }
        } while (--tryct > 0);

        if (!tryct && mntmp < LOW_PM) {
            await pline("That's enough tries!");
            return;
        }
    }

    if (mntmp < LOW_PM) {
        // random ordinary monster pick deferred
        return;
    }

    game.sex_change_ok = (game.sex_change_ok | 0) + 1;
    try {
        const ptr = mons(mntmp);
        const yourRaceBit = game.urace?.selfmask | 0;
        const isYourRace = yourRaceBit !== 0
            && ((ptr?.mflags2 | 0) & yourRaceBit) !== 0;
        // C: !polyok || (!forcecontrol && !rn2(5)) || your_race → newman()
        if (!polyok(ptr) || (!forcecontrol && !rn2(5)) || isYourRace) {
            // newman() deferred
            return;
        }
        await polymon(mntmp);
    } finally {
        game.sex_change_ok = (game.sex_change_ok | 0) - 1;
    }
}

/**
 * C ref: wizcmds.c wiz_polyself — #polyself
 * @returns {Promise<number>} ECMD_OK
 */
export async function wiz_polyself() {
    if (!(game.flags?.debug || game.flags?.wizard)) {
        await pline("You can't do that.");
        return ECMD_OK;
    }
    await polyself(POLY_CONTROLLED);
    return ECMD_OK;
}
