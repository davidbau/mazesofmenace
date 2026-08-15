// explode.js — C ref: src/explode.c.  Only the MON_EXPLODE / AD_PHYS blast is
// modelled: that is the gas spore's AT_BOOM death (corpse_chance -> mon_explodes),
// the one explosion the covered sessions reach.  Every other adtyp needs
// zap_over_floor()/burnarmor()/ignite_items(), so those callers are refused
// rather than guessed at — a partial fire blast would desync harder than none.

import { game } from './gstate.js';
import { d } from './rng.js';
import { isok, A_STR } from './const.js';
import { m_at, newsym, update_topl } from './display.js';
import { cansee } from './vision.js';

// C ref: hack.h:1471 PHYS_EXPL_TYPE, objclass.h:155 MON_EXPLODE = MAXOCLASSES+2.
export const PHYS_EXPL_TYPE = -1;
export const MON_EXPLODE = 20;
const AD_PHYS = 0;
// C ref: explode.h — explmask values.  explosionmask() answers EXPL_NONE for
// AD_PHYS for both hero and monsters (nothing resists a physical blast), so
// EXPL_MON/EXPL_HERO never get set on this path.
const EXPL_NONE = 0, EXPL_SKIP = 2;

function DEADMONSTER(m) { return !m || (m.mhp | 0) <= 0; }

// C ref: explode.c:1026 mon_explodes(mon, mattk) — roll the blast damage, kill
// the exploder if it is not already dead, name the killer and detonate.
// mattk is a [aatyp, adtyp, damn, damd] row from js/monattk_data.js.
export async function mon_explodes(mon, mattk) {
    const damn = mattk?.[2] | 0, damd = mattk?.[3] | 0;
    let dmg;
    if (damn) dmg = d(damn, damd);
    else if (damd) dmg = d((mon.data?.mlevel | 0) + 1, damd);
    else dmg = 0;

    if (mattk?.[1] !== AD_PHYS) return; // see file header
    const type = PHYS_EXPL_TYPE;

    // C: "Kill it now so it won't appear to be caught in its own explosion."
    // The only caller is corpse_chance()'s AT_BOOM arm, which is reached from
    // xkilled()/mondied() with the exploder already at mhp 0 and off the level,
    // so C's `if (!DEADMONSTER(mon)) mondead(mon);` is a no-op here.

    // svk.killer.name = "<species>'s explosion"; explode() shows it as `str`.
    const { mon_pmname } = await import('./uhitm.js');
    const nm = mon_pmname(mon) || 'monster';
    await explode(mon.mx, mon.my, type, dmg, MON_EXPLODE,
                  `${/s$/.test(nm) ? `${nm}'` : `${nm}'s`} explosion`);
}

// C ref: explode.c explode(x, y, type, dam, olet, expltype).  The `expltype`
// parameter is only a glyph-colour selector in C; this port passes the killer
// string through it instead, since the blast animation (tmp_at DISP_BEAM ...
// DISP_END) is fully undone before the first pline and so never reaches a
// captured frame.
async function explode(x, y, type, dam, olet, str) {
    const u = game.u;
    const you_exploding = (olet === MON_EXPLODE && type >= 0);
    const explmask = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let visible = false, didmsg = false, uhurt = 0;

    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
            const xx = x + i - 1, yy = y + j - 1;
            if (!isok(xx, yy)) { explmask[i][j] = EXPL_SKIP; continue; }
            explmask[i][j] = EXPL_NONE; // explosionmask() is 0 for AD_PHYS
            if (cansee(xx, yy)) visible = true;
        }

    if (!visible && !u?.Deaf) {
        await update_topl('You hear a blast.');
        didmsg = true;
    }
    if (!u?.Deaf && !didmsg) await update_topl('Boom!');

    // C: "apply effects to monsters and floor objects first, in case the damage
    // to the hero is fatal and leaves bones".  Column-major, exactly as C loops.
    const { destroy_items, resist } = await import('./zap.js');
    const { Monnam, killed, setmangry } = await import('./uhitm.js');
    if (dam) {
        for (let i = 0; i < 3; i++)
            for (let j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP) continue;
                const xx = x + i - 1, yy = y + j - 1;
                if (u && xx === u.ux && yy === u.uy) {
                    uhurt = 2; // EXPL_HERO is never set for AD_PHYS
                    if (!game.context?.mon_moving && you_exploding) uhurt = 0;
                }
                // zap_over_floor() draws no RNG for a physical blast.
                const mtmp = m_at(xx, yy);
                if (!mtmp || DEADMONSTER(mtmp)) continue;
                if (cansee(xx, yy))
                    await update_topl(`${Monnam(mtmp)} is caught in the ${str}!`);
                const itemdmg = await destroy_items(mtmp, AD_PHYS, dam);
                let mdam = dam;
                // C: resist() is called with damage 0 so it only reports, and
                // the damage is applied here — that lets the message precede it.
                if (resist(mtmp, olet, 0, false)) {
                    if (cansee(xx, yy))
                        await update_topl(`${Monnam(mtmp)} resists the ${str}!`);
                    mdam = Math.floor((dam + 1) / 2);
                }
                mtmp.mhp = (mtmp.mhp | 0) - (mdam + itemdmg);
                if (DEADMONSTER(mtmp)) {
                    if (!game.context?.mon_moving) await killed(mtmp);
                    else {
                        // C: monkilled(mtmp, "", adtyp) -> mondied(): detach +
                        // relobj + (corpse_chance && accessible) make_corpse,
                        // with no hero kill credit.
                        const { mon_kill_leaving } = await import('./monmove.js');
                        await mon_kill_leaving(mtmp, false);
                    }
                } else if (!game.context?.mon_moving) {
                    setmangry(mtmp, true);
                }
            }
    }

    if (uhurt) {
        if (game.flags?.verbose !== false)
            await update_topl(`You are caught in the ${str}!`);
        // Maybe_Half_Phys() and ugolemeffects() draw no RNG.
        const damu = dam;
        await destroy_items(u, AD_PHYS, dam);
        if (uhurt === 2) {
            u.uhp = (u.uhp | 0) - damu;
            game.disp = game.disp || {};
            game.disp.botl = true;
        }
        if ((u.uhp | 0) <= 0) {
            // C sets svk.killer to "<species>'s explosion" and calls done(DIED);
            // the death sequence is the caller's (allmain) business here.
            u.uhp = 0;
            game.killer = { name: str, format: 2 /* KILLED_BY_AN */ };
        }
        // C ref: explode.c:678 — the blast strains the hero: exercise(A_STR,
        // FALSE) draws -rn2(2) at the very end of the uhurt block.
        const { exercise } = await import('./attrib.js');
        exercise(A_STR, false);
    }

    // C ref: explode.c:687-694 "explosions are noisy" — wake_nearto(x, y,
    // max(dam*dam, 50)).  RNG-free, but it wakes sleeping monsters, and a woken
    // monster picks different m_move moduli from here on.
    {
        const { wake_nearto } = await import('./cmd.js');
        let noise = dam * dam;
        if (noise < 50) noise = 50;
        await wake_nearto(x, y, noise);
    }
    newsym(x, y);
}
