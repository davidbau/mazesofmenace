// steed.js — riding a steed.
//
// C ref: steed.c.  Ports the #ride command (doride) and mount_steed() for the
// case the recorded knight sessions exercise: a level-1 Knight repeatedly
// trying to mount the saddled pony makedog() created at game start.
//
// RNG (steed.c:341/354), per #ride attempt against a tame saddled pony:
//   rnd(MAXULEV/2 + 5) == rnd(20)   — the "slip" check (steed.c:341).  The
//       hero slips when  u.ulevel + mtmp->mtame < rnd(20).  A level-1 Knight
//       with a domestic (mtame == 10) pony slips when rnd(20) >= 12.
//   On a slip: losehp(rn1(5, 10), ...) where rn1(5,10) == rn2(5) + 10
//       (steed.c:354).  Maybe_Half_Phys is the identity here (no intrinsic
//       half-physical-damage for a starting Knight), so it consumes no RNG.
//   On success: no further RNG; "You mount <steed>." and u.usteed is set.
//
// All the early sanity-check branches (already-riding, Hallucination,
// Wounded_legs, Upolyd, encumbrance, blindness, swallow/stuck/trapped,
// unsaddled, petrifying, untame, mtrapped, levitation, stiff armor, the
// other slip conditions) are false for the recorded pony, so they fall
// through to the slip roll.  They are kept as guards (matching C order) but
// consume no RNG, so leaving them un-modelled in detail is RNG-faithful.

import { game } from './gstate.js';
import { rnd, rn1 } from './rng.js';
import { nhgetch } from './input.js';
import { pline, flush_screen, newsym } from './display.js';
import { m_at } from './display.js';
import { x_monnam } from './uhitm.js';
import { isok, MAXULEV, W_SADDLE } from './const.js';

// C ref: cmd.c getdir() — read a direction.  Renders "In what direction?",
// reads one key; '.'/'s' = self.  Returns {dx,dy,dz} or null on cancel/ESC.
// No RNG (the fuzzer path is never taken).  Mirrors spell.js getdir.
async function getdir() {
    const prompt = 'In what direction?';
    game._pending_message = prompt;
    await flush_screen(1);
    game._modal_screen = 'topl';
    const disp = game.nhDisplay;
    // C tty yn_function parks the cursor one column past the prompt + space.
    if (disp?.setCursor) disp.setCursor(Math.min(prompt.length + 1, 79), 0);
    const key = await nhgetch();
    delete game._modal_screen;
    game._pending_message = '';
    const ch = String.fromCharCode(key);
    if (ch === '.' || ch === 's')
        return { dx: 0, dy: 0, dz: 0 };
    if (ch === '\x1b' || ch === ' ')
        return null;
    const DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1, '<': 0, '>': 0 };
    const DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1, '<': 0, '>': 0 };
    const DZ = { '<': -1, '>': 1 };
    if (ch in DX)
        return { dx: DX[ch], dy: DY[ch], dz: DZ[ch] || 0 };
    return null;
}

// C ref: do_name.c mon_nam() == x_monnam(ARTICLE_THE).  The JS x_monnam does
// not model the "saddled " adjective, but a mounted pony is described as
// "the saddled pony"; add the adjective when the monster wears a saddle and
// has no personal name (has_mgivenname would suppress it).
function mon_nam(mtmp) {
    const base = x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
    const given = mtmp?.mgivenname || mtmp?.mextra?.mgivenname;
    if (!given && ((mtmp?.misc_worn_check || 0) & W_SADDLE)) {
        // Insert "saddled " after the leading "the ".
        if (base.startsWith('the '))
            return 'the saddled ' + base.slice(4);
        return 'saddled ' + base;
    }
    return base;
}

// C ref: steed.c Monnam-style helper for "%s is not saddled." etc.  Not needed
// by the exercised paths but kept symmetric with mon_nam for completeness.
function Monnam_steed(mtmp) {
    const s = mon_nam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: hack.c losehp() — for a non-polymorphed hero this simply subtracts
// the damage from u.uhp (no RNG).  Death handling is not exercised here.
function losehp(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) u.uhpmax = u.uhp;
    if (u.uhp < 1) u.uhp = 0; // death not modelled for the ride sessions
}

// C ref: steed.c mount_steed() — start riding the given monster.  Returns true
// (the mount succeeded) or false.  Only the RNG-bearing slip path and the
// success path are modelled in detail; every earlier guard is false for the
// recorded pony and consumes no RNG.
export async function mount_steed(mtmp, force) {
    const u = game.u;

    // Sanity: already riding.
    if (u.usteed) {
        await pline(`You are already riding ${mon_nam(u.usteed)}.`);
        return false;
    }

    // "Can the player reach and see the monster?" — no monster there.
    if (!mtmp) {
        await pline('I see nobody there.');
        return false;
    }

    // Is the monster saddled?  The recorded pony always is.
    const saddled = ((mtmp.misc_worn_check || 0) & W_SADDLE) !== 0;
    if (!saddled) {
        await pline(`${Monnam_steed(mtmp)} is not saddled.`);
        return false;
    }

    // C ref: steed.c:338-356 — the impaired/slip check.  For the recorded
    // Knight none of (Confusion, Fumbling, Glib, Wounded_legs, saddle cursed,
    // saddle greased) hold, so the only term that can fire is the level/tame
    // vs rnd(MAXULEV/2 + 5) comparison, which always rolls.
    if (!force
        && (u.ulevel + (mtmp.mtame || 0) < rnd(MAXULEV / 2 + 5))) {
        // (Levitation is false here, so the normal "slip" branch applies.)
        await pline(`You slip while trying to get on ${mon_nam(mtmp)}.`);
        // losehp(Maybe_Half_Phys(rn1(5, 10)), ...) — rn1(5,10) == rn2(5)+10.
        losehp(rn1(5, 10));
        return false;
    }

    // Success.  (maybewakesteed / Levitation / Flying messages don't apply.)
    await pline(`You mount ${mon_nam(mtmp)}.`);
    u.usteed = mtmp;

    // C ref: steed.c:379-381 — remove_monster(steed) then
    // teleds(steed->mx, steed->my, TELEDS_ALLOW_DRAG).  teleds -> u_on_newpos
    // moves the hero onto the steed's square and sets usteed->mx/my to match;
    // the steed is taken off the level map (it now rides with the hero and is
    // drawn at the hero's position by the renderer's mounted-hero handling).
    const nux = mtmp.mx, nuy = mtmp.my;
    const ux0 = u.ux, uy0 = u.uy;

    // remove_monster: drop the steed from the level monster list so it is no
    // longer drawn at its (old) tile; it survives as game.u.usteed.
    const mons = game.level?.monsters;
    if (mons) {
        const idx = mons.indexOf(mtmp);
        if (idx >= 0) mons.splice(idx, 1);
    }

    // u_on_newpos: hero (and steed) move onto the steed's square.
    u.ux = nux;
    u.uy = nuy;
    mtmp.mx = nux;
    mtmp.my = nuy;

    // Redraw the hero's old tile (now vacated) and the new tile (steed glyph
    // drawn via display.js's mounted-hero handling, which keys off u.usteed).
    newsym(ux0, uy0);
    newsym(nux, nuy);
    return true;
}

// C ref: steed.c doride() — the #ride command.  With no current steed, read a
// direction and try to mount the monster there.  Returns ECMD_TIME (1) when a
// mount succeeds (a turn passes), else ECMD_OK/ECMD_CANCEL (0, no turn).
export async function doride() {
    const u = game.u;

    if (u.usteed) {
        // dismount_steed(DISMOUNT_BYCHOICE) — NOT YET MODELLED.  The real
        // dismount runs landing_spot() (rn2(viable) tie-breaks among the 8
        // adjacent tiles, steed.c:543) and then a full monster-movement turn,
        // which is a sizable terrain-dependent port.  Returning ECMD_TIME keeps
        // the move loop advancing; the RNG diverges here (the next first-
        // divergence after a successful mount) until dismount is ported.
        return 1;
    }

    const dir = await getdir();
    if (dir && isok(u.ux + dir.dx, u.uy + dir.dy)) {
        u.dx = dir.dx;
        u.dy = dir.dy;
        // wizard force-mount prompt is skipped (not wizard mode here).
        const ok = await mount_steed(m_at(u.ux + dir.dx, u.uy + dir.dy), false);
        return ok ? 1 : 0;
    }
    return 0; // ECMD_CANCEL
}
