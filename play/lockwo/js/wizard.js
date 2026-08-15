// wizard.js — C ref: src/wizard.c.
//
// aggravate() (monmove.js/spell.js), cuss() (monmove.js), has_aggravatables()
// (mcastu.js), choose_stairs() (shkroom.js) and pick_nasty()/nasties[]
// (makemon.js) were already ported into the files that call them.  What was
// missing is the Wizard's own bookkeeping and, more importantly, nasty() —
// mcastu.c's "summon nasties" spell reached a `default:` that drew nothing.

import { game } from './gstate.js';
import { rn2, rnd, rn1 } from './rng.js';
import { update_topl } from './display.js';
import { AT_MAGC, attacktype } from './monattk_data.js';

const AMULET_OF_YENDOR = 213;           // js/mkobj.js OBJECT_DATA index
const MAGIC_PORTAL = 24;                // trap.h ttyp
const STRAT_WAITMASK = 0x03000000;
const MAXNASTIES = 10;
const S_ANGEL = 27, S_DEMON = 56;       // defsym.h MONSYM indices
const MM_NOMSG = 0x40;                  // makemon.h

function DEADMONSTER(m) { return !m || (m.mhp | 0) <= 0; }
function mdata(m) { return m?.data || m?.mdat || null; }
function monsterList() { return (game.level?.monsters || []); }
function sgn(n) { return n > 0 ? 1 : n < 0 ? -1 : 0; }
function distu(x, y) {
    const u = game.u;
    return (x - u.ux) * (x - u.ux) + (y - u.uy) * (y - u.uy);
}

// C ref: wizard.c:106 mon_has_amulet(mtmp).
export function mon_has_amulet(mtmp) {
    for (const otmp of (mtmp?.minvent || []))
        if (otmp.otyp === AMULET_OF_YENDOR) return true;
    return false;
}

// C ref: wizard.c:117 mon_has_special(mtmp) — the Amulet, the Book, a quest
// artifact or a piece of the invocation kit.
const CANDELABRUM_OF_INVOCATION = 262, BELL_OF_OPENING = 263,
      SPE_BOOK_OF_THE_DEAD = 409;
export function mon_has_special(mtmp) {
    for (const otmp of (mtmp?.minvent || [])) {
        if (otmp.otyp === AMULET_OF_YENDOR
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD
            || otmp.oartifact)
            return true;
    }
    return false;
}

// C ref: wizard.c:61 amulet() — runs EVERY turn once the hero carries the
// Amulet.  Two live draws: rn2(15) for the portal-warmth hint (only when the
// Amulet is worn or wielded) and rn2(40) per sleeping Wizard.
export async function amulet() {
    const u = game.u;
    let amu = null;
    if (u?.uamul && u.uamul.otyp === AMULET_OF_YENDOR) amu = u.uamul;
    else if (u?.uwep && u.uwep.otyp === AMULET_OF_YENDOR) amu = u.uwep;
    if (amu && !rn2(15)) {
        for (const ttmp of (game.level?.traps || [])) {
            if (ttmp.ttyp === MAGIC_PORTAL) {
                const du = distu(ttmp.tx, ttmp.ty);
                if (du <= 9) await update_topl('Your amulet feels hot!');
                else if (du <= 64) await update_topl('Your amulet feels very warm.');
                else if (du <= 144) await update_topl('Your amulet feels warm.');
                break;
            }
        }
    }
    if (!(game.context?.no_of_wizards | 0)) return;
    for (const mtmp of monsterList()) {
        if (DEADMONSTER(mtmp)) continue;
        if (mtmp.iswiz && mtmp.msleeping && !rn2(40)) {
            mtmp.msleeping = 0;
            if (!m_next2u(mtmp))
                await update_topl('You get the creepy feeling that somebody '
                                  + 'noticed your taking the Amulet.');
            return;
        }
    }
}

// C ref: mon.c m_next2u(mtmp) — adjacent to the hero.
function m_next2u(mtmp) {
    const u = game.u;
    return Math.abs(mtmp.mx - u.ux) <= 1 && Math.abs(mtmp.my - u.uy) <= 1;
}

// C ref: wizard.c:517 clonewiz() — the Wizard's double.  The clone carries no
// Amulet (a fake one instead) and cannot itself clone.
export async function clonewiz() {
    const { makemon, monster_by_pmidx, name_to_pmidx } = await import('./makemon.js');
    const pmidx = name_to_pmidx('Wizard of Yendor');
    const mtmp2 = makemon(monster_by_pmidx(pmidx), game.u.ux, game.u.uy, MM_NOMSG);
    if (mtmp2) {
        mtmp2.msleeping = 0;
        mtmp2.mtame = 0;
        mtmp2.mpeaceful = 0;
        // C: "won't be able to make more clones"; the fake Amulet keeps his
        // strategy code targeting the hero.
        mtmp2.iswiz = 1;
        game.context = game.context || {};
        game.context.no_of_wizards = (game.context.no_of_wizards | 0) + 1;
    }
    return mtmp2;
}

// C ref: mon.c monster_census(spotted) — how many monsters are on the level.
function monster_census() {
    let count = 0;
    for (const mtmp of monsterList()) if (!DEADMONSTER(mtmp)) count++;
    return count;
}

// C ref: wizard.c:591 nasty(summoner) — the "summon nasties" spell and the
// post-Wizard harassment.  Returns how many monsters were actually created.
//
// RNG order per outer iteration: rnd(tmp) picks the iteration count, then for
// each inner slot up to 10 pick_nasty(difcap) rolls (each an rn2(44), doubled
// on the rogue level), one enexto(), one makemon() and rnd(4) for mspec_used.
export async function nasty(summoner) {
    const M = await import('./makemon.js');
    const u = game.u;
    const mmflags = summoner ? MM_NOMSG : 0;
    const census = monster_census();
    let count = 0;

    // C: `if (!rn2(10) && Inhell) count = msummon(NULL)` — msummon (minion.c)
    // is unported, so the rn2(10) is still drawn but the Gehennom demon-summon
    // arm falls through to the ordinary loop rather than being guessed at.
    const hell_summon = (!rn2(10) && In_hell());
    if (hell_summon) return 0;

    const s_cls = summoner ? (mdata(summoner)?.mcls | 0) : 0;
    let difcap = summoner ? (mdata(summoner)?.difficulty | 0) : 0;
    const castalign = summoner ? sgn(mdata(summoner)?.maligntyp | 0) : 0;
    let tmp = ((u.ulevel | 0) > 3) ? Math.trunc((u.ulevel | 0) / 3) : 1;
    const bypos = { x: u.ux, y: u.uy };

    for (let i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
        for (let j = 0; j < 20; j++) {
            let makeindex, m_cls, trylimit = 10 + 1, gave_up = false;
            for (;;) {
                if (!--trylimit) { gave_up = true; break; }
                makeindex = M.pick_nasty(difcap);
                const mp = M.monster_by_pmidx(makeindex);
                m_cls = mp?.mcls | 0;
                if (!((difcap > 0 && (mp?.difficulty | 0) >= difcap
                       && attacktype(mp, AT_MAGC))
                      || (s_cls === S_DEMON && m_cls === S_ANGEL)
                      || (s_cls === S_ANGEL && m_cls === S_DEMON)))
                    break;
            }
            if (gave_up) continue;                     /* C: goto nextj */

            const mp = M.monster_by_pmidx(makeindex);
            if (summoner) {
                const spot = M.enexto_spawn(summoner.mux ?? summoner.mx,
                                            summoner.muy ?? summoner.my, mp);
                if (!spot) continue;
                bypos.x = spot.x; bypos.y = spot.y;
            }
            let mtmp = M.makemon(mp, bypos.x, bypos.y, mmflags);
            if (mtmp) {
                mtmp.msleeping = 0; mtmp.mpeaceful = 0; mtmp.mtame = 0;
                M.set_malign(mtmp);
            } else {
                // Random substitute for a genocided selection.
                mtmp = M.makemon(null, bypos.x, bypos.y, mmflags);
                if (mtmp) {
                    m_cls = mdata(mtmp)?.mcls | 0;
                    if ((difcap > 0 && (mdata(mtmp)?.difficulty | 0) >= difcap
                         && rn2(In_endgame() ? 3 : 7)
                         && attacktype(mdata(mtmp), AT_MAGC))
                        || (s_cls === S_DEMON && m_cls === S_ANGEL)
                        || (s_cls === S_ANGEL && m_cls === S_DEMON)) {
                        unmakemon(mtmp);
                        mtmp = null;
                    }
                }
            }

            if (mtmp) {
                const nm = mdata(mtmp)?.name;
                if (nm === 'arch-lich' || nm === 'Archon') {
                    // C: min(Archon difficulty 26, arch-lich difficulty 31).
                    const cap = 26;
                    if (!difcap || difcap > cap) difcap = cap;
                }
                mtmp.mspec_used = rnd(4);              /* delay first spell */
                if (++count >= MAXNASTIES
                    || (mdata(mtmp)?.maligntyp | 0) === 0
                    || sgn(mdata(mtmp)?.maligntyp | 0) === castalign)
                    break;
            }
        }
    }

    if (count) count = monster_census() - census;
    return count;
}

// C ref: makemon.c unmakemon(mon, flags) — undo a just-made monster.
function unmakemon(mtmp) {
    const list = game.level?.monsters;
    if (list) {
        const i = list.indexOf(mtmp);
        if (i >= 0) list.splice(i, 1);
    }
}

// C ref: wizard.c:815 wizdeadorgone() — the Wizard leaves play for good.
export function wizdeadorgone() {
    game.context = game.context || {};
    game.context.no_of_wizards = (game.context.no_of_wizards | 0) - 1;
    const u = game.u;
    if (!u) return;
    u.uevent = u.uevent || {};
    if (!u.uevent.udemigod) {
        u.uevent.udemigod = true;
        u.udg_cnt = rn1(250, 50);
    }
}

// C ref: wizard.c:785 intervene() — divine harassment after the Wizard dies.
// rnd(4) on the Astral plane (cases 1-4 only), otherwise rn2(6).
export async function intervene() {
    const which = Is_astralevel() ? rnd(4) : rn2(6);
    switch (which) {
    case 0:
    case 1:
        await update_topl('You feel vaguely nervous.');
        break;
    case 2: {
        if (!Blind()) await update_topl('You notice a black glow surrounding you.');
        const { rndcurse } = await import('./zap.js').catch(() => ({ rndcurse: null }));
        if (rndcurse) await rndcurse();
        break;
    }
    case 3:
        // C ref: wizard.c:494 aggravate() — one rn2(5) per immobilised monster.
        // js/monmove.js and js/spell.js each keep a private copy; inlined here
        // rather than exporting a third caller into either of them.
        for (const mtmp of monsterList()) {
            if (DEADMONSTER(mtmp)) continue;
            mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
            mtmp.msleeping = 0;
            if (!mtmp.mcanmove && !rn2(5)) { mtmp.mfrozen = 0; mtmp.mcanmove = 1; }
        }
        break;
    case 4:
        await nasty(null);
        break;
    case 5:
        // resurrect(): brings the Wizard back.  The makemon half is faithful;
        // the migrating_mons half needs mon_catchup_elapsed_time/mon_arrive,
        // neither of which this port carries.
        await resurrect();
        break;
    }
}

// C ref: wizard.c:715 resurrect() — only the "make a new Wizard" arm; the
// migrating-Wizard arm draws rn2(elapsed + 1) which needs migrating_mons.
export async function resurrect() {
    if ((game.context?.no_of_wizards | 0)) return;
    const { makemon, monster_by_pmidx, name_to_pmidx, set_malign }
        = await import('./makemon.js');
    const MM_NOWAIT = 0x08;
    const mtmp = makemon(monster_by_pmidx(name_to_pmidx('Wizard of Yendor')),
                         game.u.ux, game.u.uy, MM_NOWAIT);
    if (!mtmp) return;
    mtmp.mrevived = 1;
    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
    mtmp.mtame = 0; mtmp.mpeaceful = 0;
    set_malign(mtmp);
    if (!Deaf()) {
        await update_topl('A voice booms out...');
        await update_topl('"So thou thought thou couldst kill me, fool."');
    }
}

function uprop(...names) {
    const p = game.u?.uprops || {};
    for (const n of names) if ((p[n] | 0) > 0 || p[n] === true) return true;
    return false;
}
function Deaf() { return uprop('Deaf', 'HDeaf', 'EDeaf'); }
function Blind() { return uprop('Blinded') || !!game.u?.Blinded; }
function In_hell() { return !!game.level?.flags?.hellish || !!game.u?.uz?.inhell; }
function Is_astralevel() { return !!game.level?.flags?.is_astral; }
// C ref: dungeon.c In_endgame(&u.uz) — the Planes (dnum == the endgame dnum).
function In_endgame() { return !!game.level?.flags?.is_astral || !!game.u?.uz?.in_endgame; }
