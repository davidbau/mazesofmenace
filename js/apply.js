// apply.js -- Applying items: tools, lamps, whips, traps, and more
// cf. apply.c — do_blinding_ray, use_camera, use_towel, its_dead,
//               use_stethoscope, use_whistle, use_magic_whistle, magic_whistled,
//               um_dist, number_leashed, o_unleash, m_unleash, unleash_all,
//               leashable, use_leash, use_leash_core, mleashed_next2u,
//               next_to_u, check_leash, use_mirror, use_bell, use_candelabrum,
//               use_candle, snuff_candle, snuff_lit, splash_lit, catch_lit,
//               use_lamp, light_cocktail, rub_ok, dorub, dojump, check_jump,
//               is_valid_jump_pos, get_valid_jump_position, display_jump_positions,
//               tinnable, use_tinning_kit, use_unicorn_horn, fig_transform,
//               figurine_location_checks, use_figurine, grease_ok, use_grease,
//               touchstone_ok, use_stone, reset_trapset, use_trap, set_trap,
//               use_whip, find_poleable_mon, get_valid_polearm_position,
//               display_polearm_positions, calc_pole_range, could_pole_mon,
//               snickersnee_used_dist_attk, use_pole, use_cream_pie, jelly_ok,
//               use_royal_jelly, grapple_range, can_grapple_location,
//               display_grapple_positions, use_grapple, discard_broken_wand,
//               broken_wand_explode, maybe_dunk_boulders, do_break_wand,
//               apply_ok, doapply, unfixable_trouble_count,
//               flip_through_book, flip_coin
//
// apply.c handles the #apply command and all tool-use mechanics:
//   doapply(): dispatches to specific use_* functions based on object type.
//   use_lamp/candle/candelabrum: light source management.
//   use_leash/check_leash/unleash_all: pet leash management.
//   use_pole/use_whip/use_grapple: range-weapon and mobility tools.
//   use_stethoscope/use_mirror/use_camera: diagnostic and utility tools.
//   use_whistle/use_magic_whistle: pet-summoning whistles.
//   do_break_wand: wand explosion from applied breaking.
//   dorub/dojump: rubbing and physical jumping commands.
//
// JS implementations:
//   doapply → handleApply() (PARTIAL)

import { objectData, WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, SPBOOK_CLASS,
         WAND_CLASS, COIN_CLASS, POTION_CLASS, LANCE, BULLWHIP, STETHOSCOPE,
         PICK_AXE, DWARVISH_MATTOCK, EXPENSIVE_CAMERA, MIRROR, FIGURINE,
         CREDIT_CARD, LOCK_PICK, SKELETON_KEY,
         CREAM_PIE, EUCALYPTUS_LEAF, LUMP_OF_ROYAL_JELLY,
         POT_OIL, TOUCHSTONE, LUCKSTONE, LOADSTONE } from './objects.js';
import { nhgetch, ynFunction } from './input.js';
import { doname } from './mkobj.js';
import { IS_DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, D_NODOOR, D_BROKEN,
         A_DEX, PM_ROGUE } from './config.js';
import { rn2 } from './rng.js';
import { exercise } from './attrib_exercise.js';

// cf. apply.c:61 — do_blinding_ray(obj): fire blinding ray
// Fires a blinding ray at targeted monster/location from camera or similar device.
// TODO: apply.c:61 — do_blinding_ray(): blinding ray effect

// cf. apply.c:79 [static] — use_camera(obj): use camera
// Takes picture with camera; blinds monsters; consumes charge.
// TODO: apply.c:79 — use_camera(): camera use

// cf. apply.c:112 [static] — use_towel(obj): use towel
// Dries hands/eyes or other functions; cursed towel has negative effects.
// TODO: apply.c:112 — use_towel(): towel use

// cf. apply.c:198 [static] — its_dead(rx, ry, resp): stethoscope corpse check
// Checks for corpses or statues at location for stethoscope use.
// TODO: apply.c:198 — its_dead(): corpse detection for stethoscope

// cf. apply.c:318 [static] — use_stethoscope(obj): use stethoscope
// Listens to monsters or objects at targeted location; free once per turn.
// TODO: apply.c:318 — use_stethoscope(): stethoscope use

// cf. apply.c:476 [static] — use_whistle(obj): use regular whistle
// Plays whistle; may wake nearby creatures.
// TODO: apply.c:476 — use_whistle(): regular whistle

// cf. apply.c:495 [static] — use_magic_whistle(obj): use magic whistle
// Summons pets or wakes nearby creatures depending on curse status.
// TODO: apply.c:495 — use_magic_whistle(): magic whistle

// cf. apply.c:518 [static] — magic_whistled(obj): magic whistle effects
// Handles teleporting and summoning pets after magic whistle use.
// TODO: apply.c:518 — magic_whistled(): magic whistle aftermath

// cf. apply.c:688 — um_dist(x, y, n): Chebyshev distance check
// Returns TRUE if position is more than n squares from player (Chebyshev).
// TODO: apply.c:688 — um_dist(): distance check

// cf. apply.c:694 — number_leashed(void): count leashed monsters
// Returns count of leashed monsters in player's inventory.
// TODO: apply.c:694 — number_leashed(): leash count

// cf. apply.c:707 — o_unleash(otmp): unleash specific leash
// Removes given leash and releases its attached monster.
// TODO: apply.c:707 — o_unleash(): specific leash removal

// cf. apply.c:722 — m_unleash(mtmp, feedback): unleash specific monster
// Removes leash from given monster; optionally prints feedback message.
// TODO: apply.c:722 — m_unleash(): monster leash removal

// cf. apply.c:742 — unleash_all(void): remove all leashes
// Removes all leashes from all leashed monsters.
// TODO: apply.c:742 — unleash_all(): all leash removal

// cf. apply.c:757 — leashable(mtmp): monster can be leashed?
// Returns TRUE if monster can have a leash attached.
// TODO: apply.c:757 — leashable(): leash eligibility

// cf. apply.c:765 [static] — use_leash(obj): use leash
// Handles using a leash to control a nearby monster.
// TODO: apply.c:765 — use_leash(): leash use

// cf. apply.c:817 [static] — use_leash_core(obj, mtmp, cc, spotmon): leash core
// Core logic for attaching a leash to a monster.
// TODO: apply.c:817 — use_leash_core(): leash attachment core

// cf. apply.c:887 [static] — mleashed_next2u(mtmp): leashed monster adjacent?
// Returns TRUE if leashed monster is adjacent to player.
// TODO: apply.c:887 — mleashed_next2u(): leashed monster adjacency

// cf. apply.c:915 — next_to_u(void): find adjacent leashed monster
// Returns pointer to a leashed monster adjacent to player.
// TODO: apply.c:915 — next_to_u(): adjacent leashed monster

// cf. apply.c:927 — check_leash(x, y): check leash constraint
// Verifies movement to (x,y) doesn't exceed leash range; applies damage if so.
// TODO: apply.c:927 — check_leash(): leash range enforcement

// cf. apply.c:1014 [static] — use_mirror(obj): use mirror
// Reflects gaze attacks; shows player's reflection; various mirror effects.
// TODO: apply.c:1014 — use_mirror(): mirror use

// cf. apply.c:1198 [static] — use_bell(optr): use bell
// Rings bell; may summon creatures or affect environment.
// TODO: apply.c:1198 — use_bell(): bell use

// cf. apply.c:1315 [static] — use_candelabrum(obj): use candelabrum
// Lights or extinguishes a candelabrum.
// TODO: apply.c:1315 — use_candelabrum(): candelabrum use

// cf. apply.c:1383 [static] — use_candle(optr): use candle
// Lights a candle or uses it for light; handles Candelabrum attachment.
// TODO: apply.c:1383 — use_candle(): candle use

// cf. apply.c:1468 — snuff_candle(otmp): extinguish candle
// Extinguishes a burning candle.
// TODO: apply.c:1468 — snuff_candle(): candle extinguishing

// cf. apply.c:1493 — snuff_lit(obj): extinguish lit object
// Extinguishes any lit object.
// TODO: apply.c:1493 — snuff_lit(): lit object extinguishing

// cf. apply.c:1514 — splash_lit(obj): splash water on lit object
// Handles splashing water on a lit object; may extinguish it.
// TODO: apply.c:1514 — splash_lit(): water on lit object

// cf. apply.c:1573 — catch_lit(obj): catch fire from lit object
// Handles catching fire from contact with a lit object.
// TODO: apply.c:1573 — catch_lit(): fire catching

// cf. apply.c:1624 [static] — use_lamp(obj): use oil lamp
// Lights or extinguishes an oil lamp; tracks fuel.
// TODO: apply.c:1624 — use_lamp(): oil lamp use

// cf. apply.c:1699 [static] — light_cocktail(optr): light Molotov cocktail
// Lights a cocktail (burning oil) for throwing.
// TODO: apply.c:1699 — light_cocktail(): cocktail lighting

// cf. apply.c:1766 [static] — rub_ok(obj): can object be rubbed?
// Filter callback; returns GETOBJ_SUGGEST for lamps, graystones, royal jelly.
// TODO: apply.c:1766 — rub_ok(): rubbable object filter

// cf. apply.c:1781 — dorub(void): #rub command
// Command handler for rubbing action; selects lamps and graystones.
// TODO: apply.c:1781 — dorub(): rub command handler

// cf. apply.c:1843 — dojump(void): #jump command
// Command handler for physical jumping movement.
// TODO: apply.c:1843 — dojump(): jump command handler

// cf. apply.c:1858 [static] — check_jump(arg, x, y): jump destination validation
// Callback to validate if position is valid jump destination.
// TODO: apply.c:1858 — check_jump(): jump destination check

// cf. apply.c:1889 [static] — is_valid_jump_pos(x, y, magic, showmsg): jump position check
// Checks if position is valid for jumping with optional message.
// TODO: apply.c:1889 — is_valid_jump_pos(): jump validity

// cf. apply.c:1955 [static] — get_valid_jump_position(x, y): validate jump target
// Returns TRUE if position is a valid jump target.
// TODO: apply.c:1955 — get_valid_jump_position(): jump target validation

// cf. apply.c:1963 [static] — display_jump_positions(on_off): show jump highlights
// Shows or hides valid jump destination highlights on map.
// TODO: apply.c:1963 — display_jump_positions(): jump highlight display

// cf. apply.c:2163 — tinnable(corpse): corpse can be tinned?
// Returns TRUE if corpse can be processed by tinning kit.
// TODO: apply.c:2163 — tinnable(): corpse tinnability check

// cf. apply.c:2173 [static] — use_tinning_kit(obj): use tinning kit
// Processes corpse into canned food via tinning kit.
// TODO: apply.c:2173 — use_tinning_kit(): tinning kit use

// cf. apply.c:2255 — use_unicorn_horn(optr): use unicorn horn
// Heals and restores attributes via unicorn horn; cursed has reverse effects.
// TODO: apply.c:2255 — use_unicorn_horn(): unicorn horn use

// cf. apply.c:2394 — fig_transform(arg, timeout): figurine transform timer
// Timer callback when a figurine automatically transforms into a monster.
// TODO: apply.c:2394 — fig_transform(): figurine transform

// cf. apply.c:2507 [static] — figurine_location_checks(obj, cc, quietly): figurine placement
// Validates location safety for releasing a figurine.
// TODO: apply.c:2507 — figurine_location_checks(): figurine placement check

// cf. apply.c:2540 [static] — use_figurine(optr): use figurine
// Releases figurine to summon a creature at specified location.
// TODO: apply.c:2540 — use_figurine(): figurine use

// cf. apply.c:2581 [static] — grease_ok(obj): can object be greased?
// Filter callback for use_grease(); returns suitable objects.
// TODO: apply.c:2581 — grease_ok(): greaseable object filter

// cf. apply.c:2600 [static] — use_grease(obj): use grease
// Applies grease to reduce slippage on player or items.
// TODO: apply.c:2600 — use_grease(): grease use

// cf. apply.c:2654 [static] — touchstone_ok(obj): can object be tested with touchstone?
// Filter callback for use_stone(); identifies testable objects.
// TODO: apply.c:2654 — touchstone_ok(): touchstone test filter

// cf. apply.c:2676 [static] — use_stone(tstone): use touchstone/luckstone/loadstone
// Uses a stone for its specific effect (identification, luck, etc.).
// TODO: apply.c:2676 — use_stone(): stone use

// cf. apply.c:2809 — reset_trapset(void): reset trap occupation
// Resets the trap-setting occupation state variables.
// TODO: apply.c:2809 — reset_trapset(): trap occupation reset

// cf. apply.c:2817 [static] — use_trap(otmp): use trap as tool
// Uses a trap object to set it at a location.
// TODO: apply.c:2817 — use_trap(): trap use

// cf. apply.c:2912 [static] — set_trap(void): set trap occupation callback
// Occupation callback for the trap-setting process.
// TODO: apply.c:2912 — set_trap(): trap setting occupation

// cf. apply.c:2951 — use_whip(obj): use bullwhip
// Uses bullwhip as reaching weapon, steal items, or attack at range.
// TODO: apply.c:2951 — use_whip(): bullwhip use

// cf. apply.c:3279 [static] — find_poleable_mon(pos, min_range, max_range): find polearm target
// Finds a monster within polearm attack range.
// TODO: apply.c:3279 — find_poleable_mon(): polearm target search

// cf. apply.c:3317 [static] — get_valid_polearm_position(x, y): polearm position validation
// Validates a position as valid polearm attack target.
// TODO: apply.c:3317 — get_valid_polearm_position(): polearm position check

// cf. apply.c:3330 [static] — display_polearm_positions(on_off): show polearm range
// Shows or hides valid polearm attack positions on map.
// TODO: apply.c:3330 — display_polearm_positions(): polearm range display

// cf. apply.c:3367 [static] — calc_pole_range(min_range, max_range): polearm range
// Calculates minimum and maximum attack range for current polearm.
// TODO: apply.c:3367 — calc_pole_range(): polearm range calculation

// cf. apply.c:3387 — could_pole_mon(void): can polearm reach monsters?
// Returns TRUE if any monsters are in polearm range.
// TODO: apply.c:3387 — could_pole_mon(): polearm feasibility check

// cf. apply.c:3412 [static] — snickersnee_used_dist_attk(obj): snickersnee distance?
// Checks if snickersnee sword can perform distance attacks.
// TODO: apply.c:3412 — snickersnee_used_dist_attk(): snickersnee range check

// cf. apply.c:3422 — use_pole(obj, autohit): use polearm
// Attacks with polearm at range; handles direction selection and autohit.
// TODO: apply.c:3422 — use_pole(): polearm use

// cf. apply.c:3564 [static] — use_cream_pie(obj): throw cream pie
// Throws cream pie as weapon at targeted location or monster.
// TODO: apply.c:3564 — use_cream_pie(): cream pie throw

// cf. apply.c:3603 [static] — jelly_ok(obj): can object be treated with jelly?
// Filter callback for use_royal_jelly(); identifies treatable objects.
// TODO: apply.c:3603 — jelly_ok(): jelly treatment filter

// cf. apply.c:3612 [static] — use_royal_jelly(optr): use royal jelly
// Applies royal jelly to heal and restore attributes.
// TODO: apply.c:3612 — use_royal_jelly(): royal jelly use

// cf. apply.c:3682 [static] — grapple_range(void): grappling hook range
// Returns maximum range for grappling hook in current situation.
// TODO: apply.c:3682 — grapple_range(): grapple range

// cf. apply.c:3697 [static] — can_grapple_location(x, y): grapple target valid?
// Checks if given location can be reached with grappling hook.
// TODO: apply.c:3697 — can_grapple_location(): grapple location check

// cf. apply.c:3703 [static] — display_grapple_positions(on_off): show grapple targets
// Shows or hides valid grappling hook target locations.
// TODO: apply.c:3703 — display_grapple_positions(): grapple target display

// cf. apply.c:3725 [static] — use_grapple(obj): use grappling hook
// Fires grappling hook to move player to distant location.
// TODO: apply.c:3725 — use_grapple(): grappling hook use

// cf. apply.c:3872 [static] — discard_broken_wand(void): remove broken wand
// Removes a broken wand from inventory after explosion.
// TODO: apply.c:3872 — discard_broken_wand(): broken wand removal

// cf. apply.c:3884 [static] — broken_wand_explode(obj, dmg, expltype): wand explosion
// Handles explosion damage when a wand is broken.
// TODO: apply.c:3884 — broken_wand_explode(): broken wand explosion

// cf. apply.c:3893 — maybe_dunk_boulders(x, y): dunk boulders on wand break
// Attempts to push boulders into adjacent water when breaking wand.
// TODO: apply.c:3893 — maybe_dunk_boulders(): boulder dunking

// cf. apply.c:3905 [static] — do_break_wand(obj): break wand
// Handles breaking a wand and its explosive effects.
// TODO: apply.c:3905 — do_break_wand(): wand breaking

// Direction key mappings (matching commands.js DIRECTION_KEYS)
const DIRECTION_KEYS = {
    'h': [-1,  0],  // west
    'j': [ 0,  1],  // south
    'k': [ 0, -1],  // north
    'l': [ 1,  0],  // east
    'y': [-1, -1],  // northwest
    'u': [ 1, -1],  // northeast
    'b': [-1,  1],  // southwest
    'n': [ 1,  1],  // southeast
};

// cf. apply.c:4146 [static] — apply_ok(obj): object can be applied?
// Filter callback for getobj(); rates objects applicable with #apply.
export function isApplyCandidate(obj) {
    if (!obj) return false;
    // C ref: apply.c apply_ok() — suggest all tools, wands, spellbooks.
    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS || obj.oclass === SPBOOK_CLASS) {
        return true;
    }
    // C ref: apply.c apply_ok() — suggest weapons that satisfy
    // is_pick/is_axe/is_pole plus bullwhip.
    if (obj.oclass === WEAPON_CLASS) {
        const skill = objectData[obj.otyp]?.sub;
        if (obj.otyp === BULLWHIP || obj.otyp === LANCE
            || skill === 3 /* P_AXE */
            || skill === 4 /* P_PICK_AXE */
            || skill === 18 /* P_POLEARMS */
            || skill === 19 /* P_LANCE */) {
            return true;
        }
    }
    // C ref: apply.c apply_ok() — suggest certain foods.
    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return true;
    }
    // C ref: apply.c apply_ok() — suggest touchstone/luckstone/loadstone.
    // FLINT is throwable ammo but should not appear as apply-eligible in
    // C prompt flows for normal play sessions.
    if (obj.otyp === TOUCHSTONE || obj.otyp === LUCKSTONE
        || obj.otyp === LOADSTONE) {
        return true;
    }
    // C ref: apply.c apply_ok() — suggest POT_OIL if discovered.
    if (obj.otyp === POT_OIL && obj.dknown) {
        return true;
    }
    return false;
}

export function isApplyChopWeapon(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const skill = objectData[obj.otyp]?.sub;
    return skill === 3 /* P_AXE */ || skill === 4 /* P_PICK_AXE */;
}

export function isApplyPolearm(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const skill = objectData[obj.otyp]?.sub;
    return skill === 18 /* P_POLEARMS */ || skill === 19 /* P_LANCE */;
}

export function isApplyDownplay(obj) {
    if (!obj) return false;
    // C ref: apply_ok() GETOBJ_DOWNPLAY cases include coins and unknown
    // potions; these force a prompt even when no suggested items exist.
    if (obj.oclass === COIN_CLASS) return true;
    if (obj.oclass === POTION_CLASS && !obj.dknown) return true;
    return false;
}

// cf. apply.c:4209 — doapply(void): #apply command
// Handle apply/use command
// C ref: apply.c doapply()
export async function handleApply(player, map, display, game) {
    const inventory = player.inventory || [];
    if (inventory.length === 0) {
        display.putstr_message("You don't have anything to use or apply.");
        return { moved: false, tookTime: false };
    }

    const candidates = inventory.filter(isApplyCandidate);
    const hasDownplay = inventory.some(isApplyDownplay);
    if (candidates.length === 0 && !hasDownplay) {
        display.putstr_message("You don't have anything to use or apply.");
        return { moved: false, tookTime: false };
    }

    // C getobj() behavior: when no preferred apply candidates exist but
    // downplay items do, keep the prompt open as "[*]".
    const letters = candidates.map((item) => item.invlet).join('');
    const candidateByInvlet = new Map(
        candidates
            .filter((item) => item?.invlet)
            .map((item) => [String(item.invlet), item])
    );
    const prompt = letters.length > 0
        ? `What do you want to use or apply? [${letters} or ?*]`
        : 'What do you want to use or apply? [*]';
    display.putstr_message(prompt);
    const replacePromptMessage = () => {
        if (typeof display.clearRow === 'function') display.clearRow(0);
        display.topMessage = null;
        display.messageNeedsMore = false;
    };
    const resolveApplySelection = async (selected) => {
        replacePromptMessage();
        if (isApplyChopWeapon(selected)) {
            // C ref: apply.c use_axe() direction prompt text.
            display.putstr_message('In what direction do you want to chop? [>]');
            await nhgetch();
            // For unsupported chop targets, preserve no-op flow fidelity.
            replacePromptMessage();
            return { moved: false, tookTime: false };
        }

        // C ref: lock.c pick_lock() — credit card / lock pick / skeleton key
        // applied to a door: ask direction, find door, prompt, set picklock occupation.
        if (selected.otyp === CREDIT_CARD || selected.otyp === LOCK_PICK
            || selected.otyp === SKELETON_KEY) {
            display.putstr_message('In what direction?');
            const dirCh = await nhgetch();
            const dch = String.fromCharCode(dirCh);
            const dir = DIRECTION_KEYS[dch];
            if (!dir) {
                replacePromptMessage();
                if (!player?.wizard) {
                    display.putstr_message('What a strange direction!  Never mind.');
                }
                return { moved: false, tookTime: false };
            }
            replacePromptMessage();
            const nx = player.x + dir[0];
            const ny = player.y + dir[1];
            const loc = map.at(nx, ny);
            if (!loc || !IS_DOOR(loc.typ)) {
                display.putstr_message('You see no door there.');
                return { moved: false, tookTime: true };
            }
            if (loc.flags === D_NODOOR) {
                display.putstr_message('This doorway has no door.');
                return { moved: false, tookTime: true };
            }
            if (loc.flags & D_ISOPEN) {
                display.putstr_message('You cannot lock an open door.');
                return { moved: false, tookTime: true };
            }
            if (loc.flags & D_BROKEN) {
                display.putstr_message('This door is broken.');
                return { moved: false, tookTime: true };
            }
            // C ref: lock.c pick_lock() — credit card can only unlock, not lock
            if (selected.otyp === CREDIT_CARD && !(loc.flags & D_LOCKED)) {
                display.putstr_message("You can't lock a door with a credit card.");
                return { moved: false, tookTime: true };
            }
            const isLocked = !!(loc.flags & D_LOCKED);
            const ans = await ynFunction(`${isLocked ? 'Unlock' : 'Lock'} it?`, 'ynq',
                'n'.charCodeAt(0), display);
            if (String.fromCharCode(ans) !== 'y') {
                return { moved: false, tookTime: false };
            }
            // C ref: lock.c pick_lock() — chance per turn (rn2(100) < chance)
            const dex = player.attributes ? player.attributes[A_DEX] : 11;
            const isRogue = (player.roleIndex === PM_ROGUE) ? 1 : 0;
            let chance;
            if (selected.otyp === CREDIT_CARD) {
                chance = 2 * dex + 20 * isRogue;
            } else if (selected.otyp === LOCK_PICK) {
                chance = 3 * dex + 30 * isRogue;
            } else { // SKELETON_KEY
                chance = 70 + dex;
            }
            let usedtime = 0;
            game.occupation = {
                occtxt: isLocked ? 'unlocking the door' : 'locking the door',
                fn(g) {
                    if (usedtime++ >= 50) {
                        display.putstr_message(`You give up your attempt at ${isLocked ? 'unlocking' : 'locking'} the door.`);
                        exercise(player, A_DEX, true);
                        return false;
                    }
                    if (rn2(100) >= chance) return true; // still busy
                    display.putstr_message(`You succeed in ${isLocked ? 'unlocking' : 'locking'} the door.`);
                    loc.flags = isLocked ? D_CLOSED : D_LOCKED;
                    exercise(player, A_DEX, true);
                    return false;
                },
            };
            return { moved: false, tookTime: true };
        }

        // C ref: apply.c — tools that use getdir() "In what direction?" prompt:
        // use_pick_axe2() for pick-axe/mattock, use_whip() for bullwhip,
        // use_stethoscope() for stethoscope, use_pole() for polearms.
        if (selected.otyp === PICK_AXE || selected.otyp === DWARVISH_MATTOCK
            || selected.otyp === BULLWHIP || selected.otyp === STETHOSCOPE
            || selected.otyp === EXPENSIVE_CAMERA || selected.otyp === MIRROR
            || selected.otyp === FIGURINE
            || isApplyPolearm(selected)) {
            display.putstr_message('In what direction?');
            const dirCh = await nhgetch();
            const dch = String.fromCharCode(dirCh);
            const dir = DIRECTION_KEYS[dch];
            if (!dir) {
                replacePromptMessage();
                if (!player?.wizard) {
                    display.putstr_message('What a strange direction!  Never mind.');
                }
                return { moved: false, tookTime: false };
            }
            // TODO: implement actual effects (digging, whip, etc.) for full parity
            replacePromptMessage();
            return { moved: false, tookTime: false };
        }

        if (selected.oclass === SPBOOK_CLASS) {
            const fades = ['fresh', 'slightly faded', 'very faded', 'extremely faded', 'barely visible'];
            const studied = Math.max(0, Math.min(4, Number(selected.spestudied || 0)));
            const magical = !!objectData[selected.otyp]?.magic;
            display.putstr_message(`The${magical ? ' magical' : ''} ink in this spellbook is ${fades[studied]}.`);
            return { moved: false, tookTime: true };
        }

        display.putstr_message("Sorry, I don't know how to use that.");
        return { moved: false, tookTime: false };
    };

    while (true) {
        const ch = await nhgetch();
        const c = String.fromCharCode(ch);

        if (ch === 27 || ch === 10 || ch === 13 || c === ' ') {
            replacePromptMessage();
            display.putstr_message('Never mind.');
            return { moved: false, tookTime: false };
        }
        if (c === '?' || c === '*') {
            // C tty getobj() help/list mode: show each applicable item with
            // --More-- prompt, then return to selection prompt.
            // '?' shows preferred apply candidates; '*' shows all inventory items.
            const showList = c === '*'
                ? inventory.filter((item) => item?.invlet)
                : candidates;
            let picked = null;
            for (const item of showList) {
                replacePromptMessage();
                display.putstr_message(`${item.invlet} - ${doname(item, player)}  --More--`);
                const ack = await nhgetch();
                const ackC = String.fromCharCode(ack);
                if (ack === 27 || ack === 10 || ack === 13 || ackC === ' ') break;
                const sel = candidateByInvlet.get(ackC)
                    || (c === '*' ? inventory.find((o) => o?.invlet === ackC) : null);
                if (sel) { picked = sel; break; }
            }
            if (picked) return await resolveApplySelection(picked);
            continue;
        }

        const selected = inventory.find((obj) => obj.invlet === c);
        if (!selected) continue;
        return await resolveApplySelection(selected);
    }
}

// cf. apply.c:4426 — unfixable_trouble_count(is_horn): count unfixable problems
// Counts permanent troubles that unicorn horn cannot cure.
// TODO: apply.c:4426 — unfixable_trouble_count(): unfixable problem count

// cf. apply.c:4468 [static] — flip_through_book(obj): flip through spellbook
// Handles reading spellbooks by flipping through pages without learning.
// TODO: apply.c:4468 — flip_through_book(): spellbook page flipping

// cf. apply.c:4522 [static] — flip_coin(obj): flip a coin
// Handles flipping a coin; random heads/tails outcome.
// TODO: apply.c:4522 — flip_coin(): coin flip
