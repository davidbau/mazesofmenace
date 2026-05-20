// sounds.js — Sound events.
// C ref: sounds.c

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { append_pline } from './display.js';
import { Is_astralevel, Is_oracle_level, ROOMOFFSET, SHOPBASE, VAULT } from './const.js';

const GOLD_PIECE = 438;

async function sound_pline(msg) {
    const pending = game._pending_message || '';
    const cols = game.nhDisplay?.cols || 80;
    if (pending && pending.length + msg.length + 3 >= cols - 8) {
        // C ref: win/tty/topl.c:update_topl().  If a sound cannot be packed
        // onto the current topline, tty more() blocks before the sound is
        // printed and the rest of the turn tail resumes after dismissal.
        queue_sound_after_more(msg);
        return true;
    }
    await append_pline(msg);
    game._last_topline_can_force_more = true;
    if (game.context?.run) {
        // C ref: allmain.c:runmode_delay_output().  Messages emitted while
        // a run/rush is active block the repeated movement at the topline.
        game._more = true;
        game._more_dismissals_remaining = (game._more_dismissals_remaining || 0) + 1;
        game._run_sound_more_latched = true;
    }
    return false;
}

function queue_sound_after_more(msg) {
    game._after_more_message = game._after_more_message
        ? `${game._after_more_message}  ${msg}`
        : msg;
    game._resume_post_dosounds_turn_tail = true;
    game._last_topline_can_force_more = false;
    game._more = true;
    game._more_dismissals_remaining = (game._more_dismissals_remaining || 0) + 1;
}

export async function dosounds() {
    const g = game;
    // Deaf or acoustics disabled
    if (g.u?.uprops?.deaf || g.flags?.acoustics === false || g.u?.uswallow || g.u?.uprops?.underwater)
        return;

    const hallu = (g.u?.uprops?.hallucination) ? 1 : 0;
    const lvl = g.level;
    if (!lvl) return;

    if (lvl.flags.nfountains && !rn2(400)) {
        const msg = ["bubbling water.", "water falling on coins.", "the splashing of a naiad.", "a soda fountain!"];
        if (await sound_pline("You hear " + msg[rn2(3) + hallu])) return true;
    }
    if (lvl.flags.nsinks && !rn2(300)) {
        const msg = ["a slow drip.", "a gurgling noise.", "dishes being washed!"];
        if (await sound_pline("You hear " + msg[rn2(2) + hallu])) return true;
    }
    if (lvl.flags.has_court && !rn2(200)) {
        // Ambient special-room sounds are not rendered yet.  The gates belong
        // here so the turn tail keeps the same RNG ownership as sounds.c.
        return;
    }
    if (lvl.flags.has_swamp && !rn2(200)) {
        return;
    }
    if (lvl.flags.has_vault && !rn2(200)) {
        // C ref: sounds.c:dosounds().  Once the vault sound gate hits and no
        // guard suppresses it, C chooses among the vault sound variants.
        const sroom = (lvl.rooms || []).find((room) => room?.rtype === VAULT);
        if (!sroom) {
            lvl.flags.has_vault = false;
            return;
        }
        const choice = rn2(2) + hallu;
        if (choice === 1) {
            const goldInVault = (lvl.objects || []).some((obj) =>
                obj?.otyp === GOLD_PIECE
                && obj.ox >= sroom.lx && obj.ox <= sroom.hx
                && obj.oy >= sroom.ly && obj.oy <= sroom.hy);
            const occupied = (game.level?.at(game.u?.ux, game.u?.uy)?.roomno ?? 0)
                === (lvl.rooms.indexOf(sroom) + ROOMOFFSET);
            if (!occupied) {
                if (await sound_pline(goldInVault
                    ? 'You hear someone counting gold coins.'
                    : 'You hear someone searching.')) return true;
            }
        } else if (choice === 0) {
            if (await sound_pline('You hear the footsteps of a guard on patrol.')) return true;
        } else {
            if (await sound_pline('You hear Ebenezer Scrooge!')) return true;
        }
        return;
    }
    if (lvl.flags.has_beehive && !rn2(200)) {
        return;
    }
    if (lvl.flags.has_morgue && !rn2(200)) {
        return;
    }
    if (lvl.flags.has_barracks && !rn2(200)) {
        return;
    }
    if (lvl.flags.has_zoo && !rn2(200)) {
        return;
    }
    if (lvl.flags.has_shop && !rn2(200)) {
        const sroom = (lvl.rooms || []).find((room) => (room?.rtype ?? 0) >= SHOPBASE);
        if (!sroom) {
            lvl.flags.has_shop = false;
            return;
        }
        const roomno = lvl.rooms.indexOf(sroom) + ROOMOFFSET;
        const tended = (lvl.monsters || []).some((mon) =>
            mon?.isshk && (lvl.at(mon.mx, mon.my)?.roomno ?? 0) === roomno);
        const heroInShop = (lvl.at(game.u?.ux, game.u?.uy)?.roomno ?? 0) === roomno;
        if (tended && !heroInShop) {
            const msg = [
                'someone cursing shoplifters.',
                'the chime of a cash register.',
                'Neiman and Marcus arguing!',
            ];
            if (await sound_pline(`You hear ${msg[rn2(2) + hallu]}`)) return true;
        }
        return;
    }
    if (lvl.flags.has_temple && !rn2(200)) {
        const isSanctum = (g.specialLevels || []).some((lev) =>
            lev?.proto === 'sanctum'
            && lev?.dlevel?.dnum === g.u?.uz?.dnum
            && lev?.dlevel?.dlevel === g.u?.uz?.dlevel);
        if (!(Is_astralevel(g.u?.uz) || isSanctum)) return;
    }
    if (Is_oracle_level(g.u?.uz) && !rn2(400)) {
        // C ref: sounds.c:dosounds(); Oracle level has a final ambient
        // sound gate after ordinary feature/special-room sound gates.
        return;
    }
    // TODO: Implement more sounds (throne, swamp, vault, beehive, etc.)
}
