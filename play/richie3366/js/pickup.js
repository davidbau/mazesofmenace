// pickup.js — Floor look / autopickup entry.
// C ref: pickup.c — check_here(), pickup(); hack.c — spoteffects().

import { game } from './gstate.js';
import { objects_at } from './mkobj.js';
import { look_here } from './invent.js';
import { nomul } from './hack.js';
import { flush_screen } from './display.js';

/**
 * C ref: pickup.c check_here — count floor objects and look_here / engr.
 * Named omissions: flags.mention_decor → describe_decor / LOOKHERE_SKIP_DFEATURE;
 * uchain skip.
 */
export async function check_here(picked_some) {
    const u = game.u;
    if (!u) return;

    let ct = 0;
    for (let obj = objects_at(u.ux, u.uy); obj; obj = obj.nexthere) {
        // C: if (obj != uchain) ct++;
        ct++;
    }

    let lhflags = picked_some ? 0x1 : 0; // LOOKHERE_PICKED_SOME
    // mention_decor / describe_decor → LOOKHERE_SKIP_DFEATURE deferred

    if (ct) {
        if (game.context?.run) nomul(0);
        await flush_screen(1);
        await look_here(ct, lhflags);
    } else {
        // C: read_engr_at(u.ux, u.uy) when no floor objects
        const { read_engr_at } = await import('./engrave.js');
        await read_engr_at(u.ux, u.uy);
    }
}

/**
 * C ref: pickup.c pickup(what).
 * Ported envelope: autopickup && !flags.pickup → check_here(FALSE).
 * Deferred: unconscious skip, pool/lava/reach, notake, run-stop before
 * autopick, autopick()/pickup_object, manual `,` menus, hideunder.
 */
export async function pickup(what) {
    const autopickup = what > 0;

    // C: autopickup && !flags.pickup → check_here(FALSE); return 0
    // (also multi&&!run / notake — notake deferred)
    if (autopickup && !game.flags?.pickup) {
        // C: if objects here and running (not travel 8), nomul(0) first
        const u = game.u;
        if (u && objects_at(u.ux, u.uy)
            && game.context?.run && game.context.run !== 8
            && !game.context?.nopick) {
            nomul(0);
        }
        await check_here(false);
        return 0;
    }

    // Autopick / interactive pickup body deferred
    return 0;
}

/**
 * C ref: hack.c spoteffects(pick).
 * Ported envelope: pick → pickup(1). Deferred: recursion guards, pool,
 * special room, sink fall, levitation timeout, pit/trap order, Warning ice,
 * hidden monster surprise.
 */
export async function spoteffects(pick) {
    if (pick) await pickup(1);
}
