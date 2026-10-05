// @ts-nocheck
// C timeout.c:521-569, 813-888 — terrain/protection timeout dialogue and expiry.
import { game } from './gstate.js';
import { TIMEOUT, FIRE_RES, WWALKING, WARN_OF_MON, MAGICAL_BREATHING,
    PASSES_WALLS, POISON_RES, NON_PM, NEUTRAL, ACID_RES, STONE_RES, DISPLACED,
    Upolyd, Is_waterlevel } from './const.js';
import { pline, _topl_stash_result } from './display.js';
import { makeplural } from './objnam.js';
import { Breathless, region_danger, stuck_in_wall } from './cmd.js';
import { eating_dangerous_corpse, is_fainted } from './eat.js';
import { unconscious } from './pickup.js';
import { wielding_corpse } from './do_wear.js';
import { toggle_displacement } from './do_wear.js';
import { commit_command_result } from './allmain.js';

function active(prop) {
    const p = game.u?.uprops?.[prop];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}

export function decrement_property_timeout(prop) {
    const p = game.u?.uprops?.[prop];
    if (!p || !((p.intrinsic | 0) & TIMEOUT)) return false;
    p.intrinsic = (p.intrinsic | 0) - 1;
    return !((p.intrinsic | 0) & TIMEOUT);
}

function publish_command_result() {
    if (game._resultMessage) {
        _topl_stash_result();
        commit_command_result(game);
    }
}

export async function timeout_terrain_property(prop) {
    if (!decrement_property_timeout(prop)) return;
    switch (prop) {
    case ACID_RES:
    case STONE_RES:
        if (!active(prop)) {
            if (eating_dangerous_corpse(prop)) {
                const p = game.u.uprops[prop];
                p.intrinsic = ((p.intrinsic | 0) & ~TIMEOUT) | 1;
                break;
            }
            publish_command_result();
            const unaware = (game.multi | 0) < 0 && (unconscious() || is_fainted());
            if (!unaware)
                await pline(prop === ACID_RES
                    ? 'You no longer feel safe from acid.'
                    : 'You no longer feel secure from petrification.');
            if (prop === STONE_RES) {
                await wielding_corpse(game.u?.uwep, null, false);
                await wielding_corpse(game.u?.uswapwep, null, false);
            }
        }
        break;
    case FIRE_RES:
        if (!active(FIRE_RES)) {
            publish_command_result();
            await pline('Your temporary ability to survive burning has ended.');
        }
        break;
    case WWALKING:
        if (!(active(WWALKING) && !Is_waterlevel(game.u?.uz))) {
            publish_command_result();
            await pline('Your temporary ability to walk on liquid has ended.');
        }
        break;
    case DISPLACED:
        /* C timeout.c:858-861 — the shared wear callback owns the exact
         * self-visibility/sensing predicate; timed loss passes no object and
         * therefore cannot discover an item. */
        if (!active(DISPLACED))
            await toggle_displacement(null, 0, false);
        break;
    case WARN_OF_MON:
        if (!active(WARN_OF_MON)) {
            publish_command_result();
            const wt = (game.context ||= {}).warntype ||= {};
            const species = wt.species;
            wt.species = null;
            wt.speciesidx = NON_PM;
            if (species)
                await pline(`You are no longer warned about ${makeplural(species.pmnames?.[NEUTRAL])}.`);
        }
        break;
    case PASSES_WALLS:
        if (!active(PASSES_WALLS)) {
            publish_command_result();
            if (stuck_in_wall()) await pline('You feel hemmed in again.');
            else await pline(`You're back to your ${Upolyd(game.u) ? 'unusual' : 'normal'} self again.`);
        }
        break;
    case MAGICAL_BREATHING:
        if (!Breathless() && region_danger()) {
            publish_command_result();
            await pline(`You cough${active(POISON_RES) ? '.' : ' and spit blood!'}`);
        }
        break;
    }
}

export async function terrain_timeout_dialogues() {
    const walls = game.u?.uprops?.[PASSES_WALLS];
    const duration = (walls?.intrinsic | 0) & TIMEOUT;
    if (duration && !(walls?.extrinsic | 0) && !((walls?.intrinsic | 0) & ~TIMEOUT)) {
        const i = Math.trunc(duration / 2);
        if ((duration % 2) && i > 0 && i <= 2)
            await pline(['You start to feel bloated.', 'You are feeling rather flabby.'][2 - i]);
    }
    const breathing = game.u?.uprops?.[MAGICAL_BREATHING];
    const r = (breathing?.intrinsic | 0) & TIMEOUT;
    if (!r) return;
    breathing.intrinsic &= ~TIMEOUT;
    const noNeedToBreathe = Breathless();
    const inPoisonGas = region_danger();
    breathing.intrinsic |= r;
    if (noNeedToBreathe || !inPoisonGas) return;
    const i = Math.trunc(r / 2);
    if ((r % 2) && i > 0 && i <= 2)
        await pline(['You seem to have some trouble breathing.', 'The air here seems foul.'][2 - i]);
}
