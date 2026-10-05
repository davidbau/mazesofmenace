// js/wizard.js — Wizard of Yendor machinery.
// C ref: nethack-c/upstream/src/wizard.c (amulet, mon_has_amulet, mon_has_special,
// which_arti, mon_has_arti, other_mon_has_arti, on_ground, you_have, target_on,
// strategy, tactics, has_aggravatables, aggravate, clonewiz, pick_nasty, nasty,
// resurrect, intervene, wizdeadorgone, cuss) plus wiring refs in allmain.c,
// mcastu.c, mon.c, makemon.c, and pray.c/sit.c (rndcurse).
//
// Ported faithfully for RNG-call order; effects that depend on subsystems not
// yet present in the JS port (full Lua quest-artifact inventory tagging, real
// stairway lists for choose_stairs, monster spell energy rules) are modeled
// best-effort and annotated inline.

import { game } from './gstate.js';
import { monCatchupElapsedTime } from './dog.js';
import { rn2, rnd, rn1 } from './rng.js';
import { newsym } from './display.js';
import {
    M_AP_MONSTER, STRAT_WAITMASK, STRAT_WAITFORU, STRAT_APPEARMSG,
    STRAT_NONE, M3_WANTSAMUL, M3_WANTSBELL, M3_WANTSCAND, M3_WANTSBOOK,
    M3_WANTSARTI, MM_NOWAIT, MM_NOMSG, NO_MM_FLAGS, MAGIC_PORTAL, IN_SIGHT,
    Is_astralevel, Is_rogue_level, LARGEST_INT,
} from './const.js';
import {
    makemon, mksobj, monsterByRndName, set_malign, add_to_minv,
    enextoMonsterSpot, resurrectWizardOfYendor, NASTY_MONSTER_NAMES,
    pickNasty,
} from './mklev.js';

// ---------------------------------------------------------------------------
// Bookkeeping: svc.context.no_of_wizards (include/context.h:145) tracks the
// Wizard (and his Double Trouble clone) across the whole game.  Incremented
// in makemon() like makemon.c:1370-1372, decremented by wizdeadorgone()
// (mon.c:2762 via m_detach).
// ---------------------------------------------------------------------------

function wizardContext() {
    game.context ??= {};
    game.context.noOfWizards ??= 0;
    return game.context;
}

export function noOfWizards() {
    return wizardContext().noOfWizards || 0;
}

// C ref: makemon.c:1370-1375 (mndx == PM_WIZARD_OF_YENDOR branch of makemon).
export function noteWizardOfYendorCreated(mon) {
    if (mon) mon.iswiz = true;
    wizardContext().noOfWizards = (wizardContext().noOfWizards || 0) + 1;
    return mon;
}

// C ref: wizard.c:806-814 — the Wizard is leaving play (killed or escaped).
export function wizdeadorgone() {
    wizardContext().noOfWizards = (wizardContext().noOfWizards || 0) - 1;
    if (!game.u?.uevent?.udemigod) {
        if (!game.u) return;
        game.u.uevent ??= {};
        game.u.uevent.udemigod = 1;
        game.u.udg_cnt = rn1(250, 50); /* wizard.c:813 */
    }
}

// ---------------------------------------------------------------------------
// Amulet / invocation-relic detection (wizard.c:116-141).
// ---------------------------------------------------------------------------

function itemIsAmuletOfYendor(item) {
    return !!(item?.realAmuletOfYendor
        || String(item?.actualKind || item?.kind || '').toLowerCase() === 'amulet of yendor');
}

function itemIsAnyQuestArtifact(item) {
    if (!item) return false;
    const name = String(item?.artifact || item?.oartifact || item?.actualKind || item?.kind || '');
    return !!item.questArtifact || /^the\s+/i.test(name) && /(?:key|orb|eye|heart|bell|sceptre|mitre|cloak|pyxj| lantern|staff|artifact)/i.test(name);
}

// C ref: wizard.c:116-124 (mon_has_amulet).
export function monHasAmulet(mon) {
    return (mon?.minvent || []).some(itemIsAmuletOfYendor);
}

// C ref: wizard.c:126-141 (mon_has_special).
export function monHasSpecial(mon) {
    return (mon?.minvent || []).some(item =>
        itemIsAmuletOfYendor(item)
        || itemIsAnyQuestArtifact(item)
        || String(item?.actualKind || item?.kind || '') === 'Bell of Opening'
        || String(item?.actualKind || item?.kind || '') === 'Candelabrum of Invocation'
        || item?.kind === 'Book of the Dead' || item?.actualKind === 'Book of the Dead');
}

// ---------------------------------------------------------------------------
// Covetous strategy machinery (wizard.c:159-343).  Ported for parity; the
// monmove loop still drives covetous monsters through the pre-existing
// covetous teleport slice, so strategy()/tactics() remain library code.
// ---------------------------------------------------------------------------

// C ref: wizard.c:159-174 (which_arti).
export function whichArti(mask) {
    switch (mask) {
    case M3_WANTSAMUL: return 'amulet-of-yendor';
    case M3_WANTSBELL: return 'bell-of-opening';
    case M3_WANTSCAND: return 'candelabrum-of-invocation';
    case M3_WANTSBOOK: return 'book-of-the-dead';
    default: return null; /* 0 signifies quest artifact */
    }
}

function itemMatchesArti(item, otyp) {
    if (!otype) return itemIsAnyQuestArtifact(item);
    const kind = String(item?.actualKind || item?.kind || '').toLowerCase();
    switch (otype) {
    case 'amulet-of-yendor': return itemIsAmuletOfYendor(item);
    case 'bell-of-opening': return kind === 'bell of opening';
    case 'candelabrum-of-invocation': return kind === 'candelabrum of invocation';
    case 'book-of-the-dead': return kind === 'book of the dead';
    default: return false;
    }
}

// C ref: wizard.c:177-190 (mon_has_arti).
export function monHasArti(mon, otyp) {
    return (mon?.minvent || []).some(item => itemMatchesArti(item, otyp));
}

// C ref: wizard.c:192-206 (other_mon_has_arti).
export function otherMonHasArti(mon, otyp) {
    for (const other of game.level?.monsters || []) {
        if (other === mon || other.dead || (other.mhp != null && other.mhp <= 0)) continue;
        if (monHasArti(other, otyp)) return other;
    }
    return null;
}

// C ref: wizard.c:208-222 (on_ground).
export function onGround(otyp) {
    for (const obj of game.level?.objects || []) {
        if (itemMatchesArti(obj, otyp)) return obj;
    }
    return null;
}

// C ref: wizard.c:225-244 (you_have).
export function youHave(mask) {
    switch (mask) {
    case M3_WANTSAMUL: return !!game.u?.uhave?.amulet;
    case M3_WANTSBELL: return !!game.u?.uhave?.bell;
    case M3_WANTSCAND: return !!game.u?.uhave?.menorah;
    case M3_WANTSBOOK: return !!game.u?.uhave?.book;
    case M3_WANTSARTI: return !!game.u?.uhave?.questart;
    default: return false;
    }
}

// C ref: wizard.c:247-287 (target_on).
export function targetOn(mask, mon) {
    const wantsMask = mon?.data?.mflags3 ?? mon?.data?.wants ?? 0;
    if (!(wantsMask & mask)) return STRAT_NONE;
    const otyp = whichArti(mask);
    if (!monHasArti(mon, otyp)) {
        if (youHave(mask)) {
            mon.mgoal = { x: game.u?.ux || 0, y: game.u?.uy || 0 };
            return 0x01000000 | mask; /* STRAT_PLAYER | mask */
        }
        const obj = onGround(otyp);
        if (obj) {
            mon.mgoal = { x: obj.ox, y: obj.oy };
            return 0x04000000 | mask; /* STRAT_GROUND | mask */
        }
        const holder = otherMonHasArti(mon, otyp);
        /* when seeking the Amulet, avoid targeting the Wizard or temple
           priests (wizard.c:270-272) */
        if (holder && (otyp !== 'amulet-of-yendor' || (!holder.iswiz && !holder.inHisTemple && !holder.shrine))) {
            mon.mgoal = { x: holder.mx, y: holder.my };
            return 0x02000000 | mask; /* STRAT_MONSTR | mask */
        }
    }
    mon.mgoal = { x: 0, y: 0 };
    return STRAT_NONE;
}

// C ref: wizard.c:290-343 (strategy).
export function strategy(mon) {
    if (!mon?.data?.covetous
        /* shopkeepers/priests stay in their shop/temple (wizard.c:292-296) */
        || (mon.isshk && mon.inHisShop)
        || (mon.ispriest && mon.inHisTemple))
        return STRAT_NONE;

    const hpRatio = Math.floor((mon.mhp * 3) / mon.mhpmax);
    let dstrat;
    if (hpRatio <= 0) return 0x08000000; /* STRAT_HEAL */
    if (hpRatio === 1) {
        if (mon.data.name !== 'Wizard of Yendor') return 0x08000000; /* STRAT_HEAL */
        dstrat = 0x08000000;
    } else if (hpRatio === 2) {
        dstrat = 0x08000000;
    } else {
        dstrat = STRAT_NONE;
    }

    if (game.context?.madeAmulet || game.u?.uevent?.amulet_made) {
        const strat = targetOn(M3_WANTSAMUL, mon);
        if (strat !== STRAT_NONE) return strat;
    }
    if (game.u?.uevent?.invoked) { /* priorities change once gate opened */
        for (const mask of [M3_WANTSARTI, M3_WANTSBOOK, M3_WANTSBELL, M3_WANTSCAND]) {
            const strat = targetOn(mask, mon);
            if (strat !== STRAT_NONE) return strat;
        }
    } else {
        for (const mask of [M3_WANTSBOOK, M3_WANTSBELL, M3_WANTSCAND, M3_WANTSARTI]) {
            const strat = targetOn(mask, mon);
            if (strat !== STRAT_NONE) return strat;
        }
    }
    return dstrat;
}

// ---------------------------------------------------------------------------
// Aggravation (wizard.c:496-540).
// ---------------------------------------------------------------------------

function inWizardTower(x, y) {
    const bounds = game.level?.wizardTowerBounds;
    return !!(game.level?.flags?.wizard_tower_level && bounds
        && x >= bounds.lx && x <= bounds.hx && y >= bounds.ly && y <= bounds.hy);
}

function monIsHelpless(mon) {
    /* C ref: mondata.h helpless(): mfrozen || !mcanmove */
    return !!(mon?.mfrozen || mon?.mcanmove === 0 || mon?.mcanmove === false);
}

// C ref: wizard.c:496-520 (has_aggravatables).
export function hasAggravatables(mon) {
    const inTower = inWizardTower(mon?.mx, mon?.my);
    if (inTower !== inWizardTower(game.u?.ux, game.u?.uy)) return false;
    for (const other of game.level?.monsters || []) {
        if (other.dead || (other.mhp != null && other.mhp <= 0)) continue;
        if (inTower !== inWizardTower(other.mx, other.my)) continue;
        if ((typeof other.mstrategy === 'number' && (other.mstrategy & STRAT_WAITFORU))
            || other.mstrategy === 'waitforu' || other.waiting
            || monIsHelpless(other))
            return true;
    }
    return false;
}

// C ref: wizard.c:522-540 (aggravate).
export function aggravate() {
    const inTower = inWizardTower(game.u?.ux, game.u?.uy);
    for (const mon of [...(game.level?.monsters || [])].reverse()) {
        if (mon.dead || (mon.mhp != null && mon.mhp <= 0)) continue;
        if (inTower !== inWizardTower(mon.mx, mon.my)) continue;
        if (typeof mon.mstrategy === 'number') mon.mstrategy &= ~(STRAT_WAITFORU | STRAT_APPEARMSG);
        else if (mon.mstrategy === 'waitforu') mon.mstrategy = 0;
        mon.waiting = false;
        mon.msleeping = 0;
        /* wizard.c:535-537: a stopped monster gets its full move back 1/5 */
        if ((mon.mcanmove === 0 || mon.mcanmove === false) && !rn2(5)) {
            mon.mfrozen = 0;
            mon.mcanmove = 1;
        }
    }
}

// ---------------------------------------------------------------------------
// Double Trouble (wizard.c:543-560).
// ---------------------------------------------------------------------------

// C ref: wizard.c:59-63 (wizapp) — the appearance pool for the clone.
export const WIZAPP = [
    'human', 'water demon', 'vampire', 'red dragon',
    'troll', 'umber hulk', 'xorn', 'xan',
    'cockatrice', 'floating eye', 'guardian naga', 'trapper',
];

function heroProtectionFromShapeChangers() {
    /* 5.0 grants the property from worn ring/amulet of protection from
       shape changers; JS tracks worn accessories via item.worn. */
    return !!(game.u?.protectionFromShapeChangers || game.u?.Protection_from_shape_changers
        || (game.inventory || []).some(item => item?.worn
            && String(item?.actualKind || item?.kind || '').toLowerCase() === 'protection from shape changers'));
}

function heroHasAmuletOfYendorLocal() {
    return !!(game.u?.uhave?.amulet
        || (game.inventory || []).some(itemIsAmuletOfYendor));
}

// C ref: mksobj(FAKE_AMULET_OF_YENDOR, TRUE, FALSE) — otyp-specific amulet
// creation uses the normal amulet blessing rolls in mkobj.c:1059-1068.
export function mkFakeAmuletOfYendor() {
    return {
        ...mksobj(15, true, false),
        cls: 'amulet',
        glyph: '"',
        kind: 'Amulet of Yendor',
        actualKind: 'cheap plastic imitation of the Amulet of Yendor',
        appearance: 'Amulet of Yendor',
        known: false,
        fakeAmuletOfYendor: true,
        unique: true,
    };
}

// C ref: wizard.c:543-560 (clonewiz) — caller mcast_clone_wiz (mcastu.c:413)
// prints "Double Trouble..." first; only cast when exactly one wizard exists.
export async function clonewiz() {
    const ux = game.u?.ux || 0, uy = game.u?.uy || 0;
    const clone = await makemon(monsterByRndName('Wizard of Yendor'), ux, uy, MM_NOWAIT);
    if (!clone) return null;
    clone.msleeping = 0;
    clone.mtame = 0;
    clone.mpeaceful = 0;
    if (!heroHasAmuletOfYendorLocal() && rn2(2)) { /* give clone a fake (wizard.c:552) */
        add_to_minv(clone, mkFakeAmuletOfYendor());
    }
    if (!heroProtectionFromShapeChangers()) {
        clone.m_ap_type = M_AP_MONSTER;
        clone.mappearance = WIZAPP[rn2(WIZAPP.length)]; /* ROLL_FROM(wizapp), wizard.c:557 */
    }
    newsym(clone.mx, clone.my);
    return clone;
}

// ---------------------------------------------------------------------------
// Nasty monster picker (wizard.c:578-630).  The shared name table lives in
// mklev.js (NASTY_MONSTER_NAMES, wizard.c:43-57); this is the full-fidelity
// selection logic.
// ---------------------------------------------------------------------------

// C ref: monsters.h G_HELL entries among nasties[] and its substitutes, and
// G_NOHELL for Aleax.  (The JS RNDMONST rows carry these as '!'/'O' flags but
// do not expose them on the resolved monster records.)
const NASTY_HELL_ONLY = new Set(['green slime', 'arch-lich', 'master lich', 'disenchanter']);
const NASTY_OUTSIDE_HELL_ONLY = new Set(['Aleax']);

// C ref: mondata.c:1228-1291 (grownups), restricted to rows reachable from
// nasties[].  big_to_little() picks the first grownups row whose adult matches.
const NASTY_BIG_TO_LITTLE = {
    'cockatrice': 'chickatrice',
    'purple worm': 'baby purple worm', /* blocked below by juvenile filter */
    'vampire leader': 'vampire',
    'master mind flayer': 'mind flayer',
    'arch-lich': 'master lich',
    'elf-noble': 'elf',
    'elven monarch': 'elf-noble',
    'ogre tyrant': 'ogre leader',
    'guardian naga': 'guardian naga hatchling', /* juvenile, filtered out */
    'captain': 'lieutenant',
    'black dragon': 'baby black dragon',
    'red dragon': 'baby red dragon',
    'silver dragon': 'baby silver dragon',
    'orange dragon': 'baby orange dragon',
    'green dragon': 'baby green dragon',
    'yellow dragon': 'baby yellow dragon',
};

// 'elf' is PM_ELF (NoGen in JS tables); C can still place it via makemon with
// an explicit permonst, so provide a minimal record for the substitution.
const ELF_PMONST = {
    name: 'elf', mlet: '@', glyph: '@', color: 15, mlevel: 6, mmove: 12,
    difficulty: 8, maligntyp: -3, noGen: true,
};

function inHell() {
    return !!(game.inhell || game.dungeons?.[game.u?.uz?.dnum]?.name === 'Gehennom');
}

function nastyGenocided(name) {
    return !!name && (game._genocided_monsters || []).includes(name);
}

function resolveNasty(name) {
    if (name === 'elf') return ELF_PMONST;
    return monsterByRndName(name);
}

// C ref: wizard.c:578-630 (pick_nasty); single shared implementation lives in
// mklev.js so the newcham() picks and nasty() picks stay identical.
export { pickNasty };

// ---------------------------------------------------------------------------
// Summon nasties (wizard.c:645-730).
// ---------------------------------------------------------------------------

function monsterCensus() {
    /* C ref: mon.c monster_census(FALSE) — living monsters on fmon. */
    return (game.level?.monsters || [])
        .filter(mon => !mon.dead && (mon.mhp == null || mon.mhp > 0)).length;
}

function removeMonsterBestEffort(mon) {
    /* C ref: unmakemon(mtmp, NO_MM_FLAGS) — destroy without inventory drop. */
    if (!mon) return;
    mon.dead = true;
    mon.mhp = 0;
    if (game.level?.monsters)
        game.level.monsters = game.level.monsters.filter(other => other !== mon);
}

function sgn(v) {
    return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function nastyHasMagicAttack(ptr) {
    /* attacktype(ptr, AT_MAGC) equivalents among nasties/substitutes. */
    return !!(ptr?.spellcaster || ptr?.magic || ptr?.priest
        || ptr?.mlet === 'L'
        || ptr?.name === 'gnomish wizard'
        || ptr?.name === 'mind flayer' || ptr?.name === 'master mind flayer'
        || ptr?.name === 'guardian naga');
}

// Random non-lord/prince demon for msummon's WoY (NULL-monster) branch
// (minion.c:59 ndemon(A_NONE)); WoY's maligntyp is A_NONE so dprince() and
// dlord() both yield NON_PM — only the ndemon fallback can succeed.
const NDEMON_NAMES = ['water demon', 'horned devil', 'barbed devil', 'bone devil',
    'ice devil', 'succubus', 'incubus', 'marilith', 'vrock', 'hezrou', 'nalfeshnee',
    'pit fiend', 'balrog', 'sandestin'];

function ndemonNone() {
    for (let tries = 0; tries < NDEMON_NAMES.length; tries++) {
        const ptr = monsterByRndName(NDEMON_NAMES[rn2(NDEMON_NAMES.length)]);
        if (ptr?.demon && !ptr.demonLord && !ptr.demonPrince) return ptr;
    }
    return null;
}

// C ref: wizard.c:645-730 (nasty); NULL summoner = late-game harassment.
export async function nasty(summoner) {
    const MAXNASTIES = 10;
    const census = monsterCensus();
    let count = 0;
    const nastyMessages = [];

    if (!rn2(10) && inHell()) {
        /* wizard.c:668-670: this might summon a demon prince or lord.
           msummon(NULL) uses the WoY branch (minion.c:81-96): WoY's A_NONE
           alignment rules out dprince/dlord; only ndemon may fire. */
        let dtype = null;
        if (rn2(20)) dtype = null; /* dprince blocked */
        if (!dtype && rn2(4)) dtype = null; /* dlord blocked */
        if (!dtype) dtype = ndemonNone();
        if (dtype) {
            /* cnt: 2 only for ordinary minor demons 1-in-4 (and not unique) */
            let cnt = 1;
            if (!rn2(4) && dtype.demon && !dtype.demonLord && !dtype.demonPrince && !dtype.unique) cnt = 2;
            while (cnt-- > 0) {
                const mon = await makemon(dtype, game.u?.ux || 0, game.u?.uy || 0, MM_NOWAIT);
                if (mon) {
                    mon.msleeping = 0;
                    count++;
                }
            }
            if (count) count = monsterCensus() - census;
            return { count, messages: [] };
        }
        return { count: 0, messages: [] };
    }

    const sCls = summoner ? (summoner.data?.mlet || '') : '';
    let difcap = summoner ? (summoner.data?.difficulty || 0) : 0;
    const castalign = summoner ? sgn(summoner.data?.maligntyp || 0) : 0;
    let tmp = (game.u?.ulevel || 1) > 3 ? Math.trunc((game.u?.ulevel || 1) / 3) : 1;
    /* wizard.c:682-684: without a casting monster, nasties appear around the
       hero; otherwise around the spot the summoner thinks she is at. */
    const targetX = summoner ? (summoner.mux ?? game.u?.ux ?? summoner.mx) : (game.u?.ux || 0);
    const targetY = summoner ? (summoner.muy ?? game.u?.uy ?? summoner.my) : (game.u?.uy || 0);

    const outer = rnd(tmp);
    for (let i = outer; i > 0 && count < MAXNASTIES; --i) {
        for (let j = 0; j < 20; j++) {
            let mtmp = null;
            let trylimit = 11;
            let makeData = null;
            do {
                if (!--trylimit) break; /* goto nextj */
                makeData = pickNasty(difcap);
                if (!makeData) continue;
                var mCls = makeData.mlet;
            } while ((difcap > 0 && (makeData.difficulty || 0) >= difcap && nastyHasMagicAttack(makeData))
                || (sCls === '&' && mCls === 'A')
                || (sCls === 'A' && mCls === '&'));
            if (!trylimit || !makeData) continue; /* nextj */

            /* do this after picking the monster to place (wizard.c:701) */
            const spot = enextoMonsterSpot(targetX, targetY, makeData);
            if (!spot) continue;
            /* MM_NOMSG when a monster cast the spell; plain flags for
               harassment (wizard.c:655-656). */
            const nastyFlags = summoner ? MM_NOMSG : NO_MM_FLAGS;
            mtmp = await makemon(makeData, spot.x, spot.y, nastyFlags);
            if (mtmp) {
                mtmp.msleeping = 0;
                mtmp.mpeaceful = 0;
                mtmp.mtame = 0;
                set_malign(mtmp);
                /* C ref: makemon.c:1474-1500 — a mid-game (!in_mklev) spawn
                 * without MM_NOMSG announces itself when visible:
                 * "A leocrotta suddenly appears next to you!" (" close by"
                 * within BOLT_LIM*2 distance, plain "appears!" beyond). */
                /* makemon.c:1472-1473 — non-mklev spawns are newsym'd unconditionally,
                 * including summons with a caster (summoner) present. */
                newsym(mtmp.mx ?? spot.x, mtmp.my ?? spot.y);
                if (!summoner && !game.in_mklev && !mtmp.mundetected && !mtmp.minvis
                    && !game.u?.blind
                    && !!(game.viz_array?.[spot.y]?.[spot.x] & IN_SIGHT)) {
                    const du = ((spot.x ?? 0) - (game.u?.ux ?? 0)) ** 2
                        + ((spot.y ?? 0) - (game.u?.uy ?? 0)) ** 2;
                    const where = du <= 2 ? ' next to you' : du <= 64 ? ' close by' : '';
                    nastyMessages.push(`A ${mtmp.data?.name || makeData.name || 'creature'} suddenly appears${where}!`);
                }
                /* C ref: makemon.c:1497-1500 — makemon_common's in-game
                 * (!in_mklev) tail runs dochugw(mtmp, FALSE) (monmove.c:
                 * 204-238): a freshly appeared, visible, hostile, mobile monster
                 * close enough to be a threat stops the hero's occupation via
                 * stop_occupation() (allmain.c:684-697: "You stop searching.",
                 * nomul(0)).  Unlike the moveloop occupation gate (allmain.c:
                 * 502-512, fired after a tick when a monster was already
                 * adjacent), this fires mid-once-per-turn inside makemon, so a
                 * counted-search batch loses its remaining ticks WITHOUT
                 * charging another turn — the pass loop ends right after the
                 * current turn's tail (no extra take/phase pair). */
                if (!summoner && !game.in_mklev
                    && (game._search_pending_count || 0) > 0
                    && !mtmp.mpeaceful && !(mtmp.data?.noattacks)
                    && (((mtmp.mx ?? spot.x) - (game.u?.ux ?? 0)) ** 2
                        + ((mtmp.my ?? spot.y) - (game.u?.uy ?? 0)) ** 2) <= (7 + 1) * (7 + 1)
                    && !game.u?.blind && !mtmp.mundetected
                    && (game.u?.seeInvisible || !mtmp.minvis)
                    && !!(game.viz_array?.[mtmp.my]?.[mtmp.mx] & IN_SIGHT)
                    && (mtmp.mcanmove ?? 1) > 0 && !mtmp.mfrozen) {
                    nastyMessages.push('You stop searching.');
                    game._search_pending_count = 0;
                    game._counted_repeat_interruptible = 0;
                    /* nomul(0) — drop the batch's remaining charged time so the
                     * pending-time loop exits after the current phase. */
                    game._pending_time_passed = 0;
                    game._skip_pending_time_decrement = 1;
                    game._stop_search_extra_pass = 0;
                }
            } else {
                /* wizard.c:716-727: random substitute for a genocided pick. */
                const sub = await makemon(null, spot.x, spot.y, 0);
                if (sub) {
                    const subCls = sub.data?.mlet || '';
                    if ((difcap > 0 && (sub.data?.difficulty || 0) >= difcap
                            && rn2(IsEndgameLocal() ? 3 : 7)
                            && nastyHasMagicAttack(sub.data || {}))
                        || (sCls === '&' && subCls === 'A')
                        || (sCls === 'A' && subCls === '&')) {
                        removeMonsterBestEffort(sub);
                    } else mtmp = sub;
                }
            }

            if (mtmp) {
                /* wizard.c:730-737: arch-lich/Archon clamp difcap */
                if (mtmp.data?.name === 'arch-lich' || mtmp.data?.name === 'Archon') {
                    tmp = Math.min(26 /* PM_ARCHON */, 31 /* PM_ARCH_LICH, wizard.c:733 */);
                    if (!difcap || difcap > tmp) difcap = tmp;
                }
                /* delay first use of spell or breath attack (wizard.c:738) */
                mtmp.mspec_used = rnd(4);
                count = monsterCensus() - census;
                if (count >= MAXNASTIES
                    || (mtmp.data?.maligntyp || 0) === 0
                    || sgn(mtmp.data?.maligntyp || 0) === castalign)
                    break;
            }
        }
    }

    if (count) count = monsterCensus() - census;
    return { count, messages: nastyMessages };
}

function IsEndgameLocal() {
    const uz = game.u?.uz;
    return !!(game.dungeons?.[uz?.dnum]?.flags?.endgame
        || (uz && typeof uz.dlevel === 'number' && uz.dlevel <= -5));
}

// ---------------------------------------------------------------------------
// Per-turn amulet effects (wizard.c:66-113); called from the move loop exactly
// like allmain.c:358-368 (before the engraving-wipe roll).
// ---------------------------------------------------------------------------

function heroWornOrWieldedAmulet() {
    return (game.inventory || []).find(item => itemIsAmuletOfYendor(item)
        && (item.worn || /\(being worn\)/.test(String(item.line || ''))))
        || (game.inventory || []).find(item => itemIsAmuletOfYendor(item)
            && (item.wielded || String(item.line || '').includes('(wielded)')));
}

// C ref: wizard.c:70-113 (amulet).
export function amulet() {
    const messages = [];
    const amu = heroWornOrWieldedAmulet();
    if (amu && !rn2(15)) {
        const portal = (game.level?.traps || []).find(trap => trap.ttyp === MAGIC_PORTAL);
        if (portal) {
            const dx = (portal.tx || 0) - (game.u?.ux || 0);
            const dy = (portal.ty || 0) - (game.u?.uy || 0);
            const du = dx * dx + dy * dy;
            if (du <= 9) messages.push('The Amulet of Yendor feels hot!');
            else if (du <= 64) messages.push('The Amulet of Yendor feels very warm.');
            else if (du <= 144) messages.push('The Amulet of Yendor feels warm.');
            /* else, the amulet feels normal */
        }
    }

    if (!noOfWizards()) return messages;
    /* find Wizard, and wake him if necessary (wizard.c:96-107) */
    for (const mon of game.level?.monsters || []) {
        if (mon.dead || (mon.mhp != null && mon.mhp <= 0)) continue;
        if (mon.iswiz && mon.msleeping && !rn2(40)) {
            mon.msleeping = 0;
            const near = Math.max(Math.abs((mon.mx || 0) - (game.u?.ux || 0)),
                Math.abs((mon.my || 0) - (game.u?.uy || 0))) <= 1;
            if (!near)
                messages.push('You get the creepy feeling that somebody noticed your taking the Amulet.');
            return messages;
        }
    }
    return messages;
}

// ---------------------------------------------------------------------------
// resurrect() (wizard.c:733-777) and intervene() (wizard.c:780-803).
// ---------------------------------------------------------------------------

function heroIsDeafLocal() {
    return !!(game.u?.deaf || game.u?.Deaf
        || (game.u?._statusSuffix || '').includes('Deaf') || (game.u?._deafTimeout || 0) > 0);
}

// C ref: wizard.c:733-777 (resurrect).
export async function resurrect() {
    let mon, verb;
    if (!noOfWizards()) {
        /* make a new Wizard (wizard.c:737-742).  resurrectWizardOfYendor()
           already performs the makemon()+mrevived bookkeeping. */
        verb = 'kill';
        mon = await resurrectWizardOfYendor();
    } else {
        /* look for a migrating Wizard (wizard.c:744-769) */
        verb = 'elude';
        const queue = game.migrating_mons || [];
        mon = null;
        for (let i = 0; i < queue.length; i++) {
            const cand = queue[i];
            if (!cand?.iswiz || monHasAmulet(cand)) continue;
            let elapsed = (game.moves || 1) - (cand.mlstmv || 0);
            if (!(elapsed > 0)) continue;
            monCatchupElapsedTime(cand, elapsed);
            elapsed = Math.trunc(Math.min(elapsed, LARGEST_INT - 1) / 50);
            if (cand.msleeping && rn2(elapsed + 1)) cand.msleeping = 0;
            if (cand.mfrozen === 1) { cand.mfrozen = 0; cand.mcanmove = 1; }
            if (cand.msleeping || cand.mfrozen || cand.mcanmove === 0 || cand.mcanmove === false) continue;
            queue.splice(i, 1);
            /* mon_arrive(mtmp, -1) — Wiz_arrive: place near the hero. */
            const spot = enextoMonsterSpot(game.u?.ux || 0, game.u?.uy || 0, cand.data || {});
            if (!spot) { mon = null; break; }
            cand.mx = spot.x;
            cand.my = spot.y;
            game.level?.monsters?.push(cand);
            mon = cand;
            newsym(cand.mx, cand.my);
            break;
        }
    }

    if (mon) {
        if (typeof mon.mstrategy === 'number') mon.mstrategy &= ~STRAT_WAITMASK;
        else if (mon.mstrategy === 'waitforu') mon.mstrategy = 0;
        mon.waiting = false;
        mon.mtame = 0;
        mon.mpeaceful = 0;
        set_malign(mon);
        if (!heroIsDeafLocal()) {
            return {
                mon,
                messages: [
                    'A voice booms out...',
                    `"So thou thought thou couldst ${verb} me, fool."`,
                ],
            };
        }
    }
    return { mon, messages: [] };
}

// C ref: sit.c:567-617 (rndcurse), invoked through intervene().
export function rndcurse() {
    const messages = [];
    const wieldedMagicbane = (game.inventory || []).some(item =>
        (item.wielded || String(item.line || '').includes('(wielded)'))
        && String(item.artifact || item.oartifact || item.actualKind || '').toLowerCase() === 'magicbane');
    if (wieldedMagicbane && rn2(20)) { /* sit.c:577 */
        messages.push('You feel a malignant aura surround the magic-absorbing blade.');
        return messages;
    }
    /* sit.c:582-584: shieldeff() under Antimagic shows no topline text. */
    const antiMagic = !!game.u?.antimagic || !!game.u?.Antimagic
        || (game.u?._statusSuffix || '').includes('Shell');
    const halfSpell = !!(game.u?.halfSpellDamage || game.u?.Half_spell_damage);
    messages.push('You feel a malignant aura surround you.');
    const candidates = (game.inventory || [])
        .filter(item => item.cls !== 'coin' && item.cls !== 'gold' && !item.gold);
    const cnt = rnd(Math.trunc(6 / ((antiMagic ? 1 : 0) + (halfSpell ? 1 : 0) + 1)));
    for (let i = cnt; i > 0 && candidates.length; --i) {
        const item = candidates[rnd(candidates.length) - 1]; /* sit.c:593 */
        if (!item || item.cursed) continue;
        /* intelligent artifacts usually resist (sit.c:602-606) */
        if (item.artifact && rn2(10) < 8) {
            messages.push('An artifact resists!');
            continue;
        }
        if (item.blessed) item.blessed = false;
        else item.cursed = true;
        item.bknown = true;
    }
    return messages;
}

// C ref: wizard.c:780-803 (intervene).  Returns topline messages.
export async function intervene() {
    /* cases 0 and 5 don't apply on the Astral level (wizard.c:784) */
    const which = Is_astralevel(game.u?.uz) ? rnd(4) : rn2(6);
    const messages = [];
    switch (which) {
    case 0:
    case 1:
        messages.push('You feel vaguely nervous.');
        break;
    case 2:
        if (!game.u?.blind) messages.push('You notice a black glow surrounding you.');
        messages.push(...rndcurse());
        break;
    case 3:
        aggravate();
        break;
    case 4: {
        const nastyResult = await nasty(null);
        messages.push(...(nastyResult?.messages || []));
        break;
    }
    case 5: {
        const result = await resurrect();
        messages.push(...result.messages);
        break;
    }
    default:
        break;
    }
    return messages;
}

// C ref: allmain.c:359-368 — the per-turn demigod harassment driver.  Called
// from js/allmain.js immediately after the amulet() call, in C order.
export async function demigodTurnHook() {
    if (!game.u?.uevent?.udemigod || game.u?.uinvulnerable) return [];
    if (game.u.udg_cnt) game.u.udg_cnt--;
    if (!game.u.udg_cnt) {
        const messages = await intervene();
        game.u.udg_cnt = rn1(200, 50); /* allmain.c:367 */
        return messages;
    }
    return [];
}

// ---------------------------------------------------------------------------
// cuss() (wizard.c:819-860).  Insults/taunts for the Wizard of Yendor; the
// angel/demon pager branches (com_pager) stay with the message-store owner.
// ---------------------------------------------------------------------------

// C ref: wizard.c:819-827 (random_insult).
export const RANDOM_INSULT = [
    'antic', 'blackguard', 'caitiff', 'chucklehead',
    'coistrel', 'craven', 'cretin', 'cur',
    'dastard', 'demon fodder', 'dimwit', 'dolt',
    'fool', 'footpad', 'imbecile', 'knave',
    'maledict', 'miscreant', 'niddering', 'poltroon',
    'rattlepate', 'reprobate', 'scapegrace', 'varlet',
    'villein', /* (sic.) */
    'wittol', 'worm', 'wretch',
];

// C ref: wizard.c:829-838 (random_malediction).
export const RANDOM_MALEDICTION = [
    'Hell shall soon claim thy remains,', 'I chortle at thee, thou pathetic',
    'Prepare to die, thou', 'Resistance is useless,',
    'Surrender or die, thou', 'There shall be no mercy, thou',
    'Thou shalt repent of thy cunning,', 'Thou art as a flea to me,',
    'Thou art doomed,', 'Thy fate is sealed,',
    'Verily, thou shalt be one dead',
];

// C ref: wizard.c:842-860, iswiz branch only.  Returns the topline text, or
// null when mon is not the Wizard (caller falls through to minion branches).
// The C `Deaf` early return (wizard.c:844) is enforced by the caller before
// invoking cuss at all, matching monmove.c:985 / the JS hostile-cuss gate.
export function wizardCussMessage(mon, name) {
    const monName = String(mon?.data?.name || mon?.name || '').toLowerCase();
    if (!(mon?.iswiz || mon?.data?.iswiz || monName === 'wizard of yendor')) return null;
    if (!rn2(5)) { /* typical bad guy action (wizard.c:846) */
        return `${name} laughs fiendishly.`;
    } else if (game.u?.uhave?.amulet && !rn2(RANDOM_INSULT.length)) {
        return `"Relinquish the amulet, ${RANDOM_INSULT[rn2(RANDOM_INSULT.length)]}!"`;
    } else if ((game.u?.uhp || 0) < 5 && !rn2(2)) { /* Panic (wizard.c:851) */
        return rn2(2)
            ? `"Even now thy life force ebbs, ${RANDOM_INSULT[rn2(RANDOM_INSULT.length)]}!"`
            : `"Savor thy breath, ${RANDOM_INSULT[rn2(RANDOM_INSULT.length)]}, it be thy last!"`;
    } else if ((mon?.mhp ?? 0) < 5 && !rn2(2)) { /* Parthian shot (wizard.c:854) */
        return rn2(2) ? '"I shall return."' : '"I\'ll be back."';
    }
    return `"${RANDOM_MALEDICTION[rn2(RANDOM_MALEDICTION.length)]} ${RANDOM_INSULT[rn2(RANDOM_INSULT.length)]}!"`;
}
