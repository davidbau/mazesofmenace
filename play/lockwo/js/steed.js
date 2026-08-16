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
import { rnd, rn1, rn2 } from './rng.js';
import { nhgetch } from './input.js';
import { pline, flush_screen, newsym, update_topl } from './display.js';
import { m_at } from './display.js';
import { vision_recalc } from './vision.js';
import { x_monnam } from './uhitm.js';
import { isok, MAXULEV, W_SADDLE, ACCESSIBLE, IS_DOOR, D_CLOSED, D_LOCKED } from './const.js';
import { pickup_after_move, getdir_confdir } from './cmd.js';

// C ref: cmd.c getdir() — read a direction.  Renders "In what direction?",
// reads one key; '.'/'s' = self.  Returns {dx,dy,dz} or null on cancel/ESC.
// Ends with confdir(FALSE) like C's (cmd.c:4116) — see cmd.js getdir_confdir.
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
        return getdir_confdir({ dx: 0, dy: 0, dz: 0 });
    if (ch === '\x1b' || ch === ' ')
        return null;
    const DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1, '<': 0, '>': 0 };
    const DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1, '<': 0, '>': 0 };
    const DZ = { '<': -1, '>': 1 };
    if (ch in DX)
        return getdir_confdir({ dx: DX[ch], dy: DY[ch], dz: DZ[ch] || 0 });
    return null;
}

// C ref: do_name.c mon_nam() == x_monnam(ARTICLE_THE).  x_monnam now models the
// "saddled " adjective for a saddle-wearing steed, so this is a thin wrapper.
function mon_nam(mtmp) {
    return x_monnam(mtmp, /*ARTICLE_THE*/ 1, null, 0, false);
}

// C ref: steed.c Monnam-style helper for "%s is not saddled." etc.  Not needed
// by the exercised paths but kept symmetric with mon_nam for completeness.
function Monnam_steed(mtmp) {
    const s = mon_nam(mtmp);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// C ref: hack.c losehp() — for a non-polymorphed hero this subtracts the damage
// from u.uhp (no RNG).  When the blow drops HP below 1 the hero dies: You("die...")
// is a pline that follows the still-unacknowledged "You slip..." top line, so the
// tty pages the slip message with --More-- (topl.c more()) before showing
// "You die...", then done(DIED) runs the end-of-game sequence.
async function losehp(n) {
    const u = game.u;
    if (!u) return;
    u.uhp -= n;
    if (u.uhp > u.uhpmax) {
        u.uhpmax = u.uhp;
        return;
    }
    if (u.uhp < 1) {
        u.uhp = 0;
        // C pline() marks the top line NEED_MORE; mirror it so update_topl pages
        // the "You slip..." line before printing "You die...".
        game._toplin = 1; // TOPLIN_NEED_MORE
        await update_topl('You die...');
        const { done, DIED } = await import('./end.js');
        await done(DIED);
    }
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
        await losehp(rn1(5, 10));
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

    // remove_monster(x,y) (rm.h) only NULLs the map grid pointer
    // (svl.level.monsters[x][y]); it does NOT unlink the steed from the `fmon`
    // chain.  So the steed stays a live level monster: it keeps receiving its
    // per-turn mcalcmove() ration (rn2(NORMAL_SPEED) rounding roll) and is
    // still driven by movemon()/dochug()/dog_move() each turn — those RNG rolls
    // MUST keep firing for parity (removing the steed from fmon, as we used to,
    // dropped a whole monster's mcalcmove + distfleeck + is_wanderer/dog_move
    // stream after mount and desynced every post-mount turn).  We therefore KEEP
    // it in game.level.monsters (our fmon) and instead flag it ridden; m_at()
    // and the renderer treat a ridden steed as "off the map grid" — it is
    // colocated with, and drawn as, the hero.
    mtmp.mridden = true;

    // u_on_newpos: hero (and steed) move onto the steed's square.
    u.ux = nux;
    u.uy = nuy;
    mtmp.mx = nux;
    mtmp.my = nuy;

    // Redraw the hero's old tile (now vacated) and the new tile (steed glyph
    // drawn via display.js's mounted-hero handling, which keys off u.usteed).
    // C ref: steed.c mount_steed -> teleds(steed->mx,my,ALLOW_DRAG), whose tail
    // (teleport.c) does newsym(old) + see_monsters() + vision_full_recalc=1 +
    // vision_recalc(0): moving the hero to the steed's square must recompute
    // line-of-sight from the new position (e.g. a doorway in the room wall that
    // only comes into view once the hero shifts over onto the steed).  Mirrors
    // the identical teleds tail already used by hack.js jump().
    newsym(ux0, uy0);
    newsym(nux, nuy);
    game.vision_full_recalc = 1;
    vision_recalc(0);
    return true;
}

// C ref: decl.c xdir/ydir — the 8 compass directions, j == 0..7 == W, NW, N,
// NE, E, SE, S, SW (the order landing_spot scans).
const XDIR = [-1, -1, 0, 1, 1, 1, 0, -1];
const YDIR = [0, -1, -1, -1, 0, 1, 1, 1];

// C ref: monmove.c accessible(x,y) = ACCESSIBLE(SURFACE_AT) && !closed_door.
function steed_accessible(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    if (!ACCESSIBLE(loc.typ)) return false;
    if (IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED))) return false;
    return true;
}

// C ref: hack.c bad_rock(mdat,x,y) — for a humanoid hero, a square is "bad
// rock" when it is not accessible (a wall / closed door / stone).  Used only
// for the diagonal-squeeze test below.
function bad_rock(x, y) { return !steed_accessible(x, y); }

// C ref: hack.c test_move(ux,uy,dx,dy,TEST_MOVE) — the subset that matters for
// dismount landing-spot selection in the open rooms these sessions use: a
// diagonal step is rejected only when squeezing between two walls, and the
// destination itself must be accessible (checked by the caller).
function steed_test_move(ux, uy, dx, dy) {
    if (dx && dy) {
        if (bad_rock(ux, uy + dy) && bad_rock(ux + dx, uy))
            return false; // can't squeeze diagonally between two walls
    }
    return true;
}

// MON_AT excluding the ridden steed itself (which is colocated with the hero
// and flagged mridden, i.e. off the map grid in C terms).
function steed_mon_at(x, y) {
    const mons = game.level?.monsters;
    if (!mons) return null;
    for (const m of mons) {
        if (m.mridden) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

// C ref: steed.c landing_spot(spot, reason, forceit) — pick the square the
// dismounting hero lands on.  Only the DISMOUNT_BYCHOICE (voluntary, unimpaired)
// path is needed: best_j/clockwise_j/counterclk_j are all -1, so the candidate
// list is simply the 8 adjacent squares in xdir/ydir order.  Each viable
// candidate increments `viable`; among equal-distance candidates the choice is
// the rn2(viable) tie-break (steed.c:543).  Returns the spot, or null.
function landing_spot() {
    const u = game.u;
    const tryArr = [];
    for (let j = 0; j < 8; j++) tryArr.push({ x: XDIR[j], y: YDIR[j] });

    let viable = 0, min_distance = -1, found = false;
    const spot = { x: 0, y: 0 };
    // i==0 pass only (voluntary, unimpaired) avoids known traps/boulders; the
    // ride sessions land on bare floor, so the single pass suffices.
    for (let j = 0; j < tryArr.length; j++) {
        const x = u.ux + tryArr[j].x;
        const y = u.uy + tryArr[j].y;
        if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
        if (steed_accessible(x, y) && !steed_mon_at(x, y)
            && steed_test_move(u.ux, u.uy, x - u.ux, y - u.uy)) {
            ++viable;
            const distance = (x - u.ux) * (x - u.ux) + (y - u.uy) * (y - u.uy);
            if (min_distance < 0
                || (distance < min_distance)
                || (distance === min_distance && !rn2(viable))) {
                // (no known-trap / boulder on these floor tiles)
                spot.x = x; spot.y = y;
                min_distance = distance;
                found = true;
            }
        }
    }
    return found ? spot : null;
}

// C ref: steed.c dismount_steed(DISMOUNT_BYCHOICE) — voluntary #ride dismount.
// landing_spot() chooses cc; the steed is placed back on the map grid at the
// hero's current square and the hero relocates to cc (C: place_monster(steed,
// u.ux,u.uy) then teleds(cc)).  The now-grounded pony resumes normal pet
// movement this turn (handled by the standard movemon/dochug path; here we just
// run the steed's own dochug to reproduce its post-dismount move, matching the
// recorded obj_resists/dog_move stream).
async function dismount_steed_bychoice() {
    const u = game.u;
    const mtmp = u.usteed;
    if (!mtmp) return;

    const cc = landing_spot(); // RNG: rn2(viable) tie-breaks
    if (!cc) {
        await pline("You can't.  There isn't anywhere for you to stand.");
        return;
    }

    // C ref: steed.c dismount_steed() — when the steed has no given name,
    //   pline("You've been through the dungeon on %s with no name.",
    //         an(pmname(mtmp->data, Mgender(mtmp))));
    // pmname is the bare species name (no "saddled" adjective, no article),
    // and an() prepends a/an.  x_monnam(.,ARTICLE_A) yields "a <species>" from
    // mtmp.data.name (the species), which for the recorded steed is "pony".
    // Route through update_topl so a following pet-combat message (the grounded
    // steed attacking an adjacent hostile on the same turn) pages this line with
    // a --More-- exactly as C's topl buffer does.
    {
        const given = mtmp?.mgivenname || mtmp?.mextra?.mgivenname;
        if (!given) {
            const species = (mtmp?.data?.name || 'monster');
            const an = (/^[aeiou]/i.test(species) ? 'an ' : 'a ') + species;
            await update_topl(`You've been through the dungeon on ${an} with no name.`);
        } else {
            // C: You("dismount %s.", mon_nam(mtmp));
            await update_topl(`You dismount ${mon_nam(mtmp)}.`);
        }
    }

    // Release the steed.
    u.usteed = null;
    u.ugallop = 0;

    // place_monster(steed, u.ux, u.uy): steed grounds at the hero's square and
    // rejoins the map grid (clear the ridden flag).
    mtmp.mridden = false;
    mtmp.mx = u.ux;
    mtmp.my = u.uy;
    const ux0 = u.ux, uy0 = u.uy;

    // teleds(cc): the hero steps off onto the landing square.
    u.ux0 = ux0; u.uy0 = uy0;
    u.ux = cc.x; u.uy = cc.y;

    // The now-grounded pony (mridden cleared) is a normal pet again; the move
    // loop's movemon()/dochug() pass for this hero command drives its move (and
    // its dog_move obj_resists / choice rolls), so we do NOT step it here.

    // Redraw the squares involved.
    newsym(ux0, uy0);
    newsym(u.ux, u.uy);
    newsym(mtmp.mx, mtmp.my);
    // C ref: dismount_steed -> teleds(cc, ALLOW_DRAG) tail sets
    // vision_full_recalc=1 + vision_recalc(0): relocating the hero to the
    // landing square recomputes line-of-sight (e.g. the west wall of the room
    // the hero steps into).
    game.vision_full_recalc = 1;
    vision_recalc(0);

    // C ref: steed.c dismount_steed() -> float_down(0L, W_SADDLE) -> its tail
    // "if (!Is_airlevel && !Is_waterlevel && !u.uswallow && on_level(...))
    // pickup(1)": once grounded, the hero's landing square is examined exactly
    // like the tail of any other move.  Any objects there that autopickup
    // leaves behind (or, with it off, all of them) are announced via
    // look_here() -- "Things that are here:" for a pile -- chaining onto the
    // still-pending dismount pline with a --More-- the same way update_topl()
    // pages any two same-turn messages that don't fit on one line.
    await pickup_after_move(u.ux, u.uy);
}

// C ref: steed.c doride() — the #ride command.  With no current steed, read a
// direction and try to mount the monster there.  Returns ECMD_TIME (1) when a
// mount succeeds (a turn passes), else ECMD_OK/ECMD_CANCEL (0, no turn).
export async function doride() {
    const u = game.u;

    if (u.usteed) {
        // C ref: steed.c doride() -> dismount_steed(DISMOUNT_BYCHOICE).  A
        // voluntary dismount: pick a landing spot, ground the steed at the
        // hero's square, step the hero off, and let the steed take its turn.
        await dismount_steed_bychoice();
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
