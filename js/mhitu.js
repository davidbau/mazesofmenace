// mhitu.js -- Monster-vs-hero combat
// cf. mhitu.c — monster attacks hero (mattacku, hitmu, missmu, etc.)
// Hero-vs-monster combat has moved to uhitm.js.

import { rn2, rnd, c_d } from './rng.js';
import { A_CON } from './config.js';
import {
    G_UNIQ, M2_NEUTER, M2_MALE, M2_FEMALE, M2_PNAME,
    AT_CLAW, AT_BITE, AT_KICK, AT_BUTT, AT_TUCH, AT_STNG, AT_WEAP,
} from './monsters.js';
import { objectData, BULLWHIP } from './objects.js';
import { xname } from './mkobj.js';
import { monDisplayName, is_humanoid } from './mondata.js';
import { weaponEnchantment, weaponDamageSides } from './uhitm.js';

const PIERCE = 1;

// cf. mhitu.c hitmsg() (partial).
function monsterHitVerb(attackType) {
    switch (attackType) {
        case AT_BITE: return 'bites';
        case AT_CLAW: return 'claws';
        case AT_KICK: return 'kicks';
        case AT_BUTT: return 'butts';
        case AT_STNG: return 'stings';
        case AT_TUCH: return 'touches';
        case AT_WEAP: return 'hits';
        default: return 'hits';
    }
}

// cf. mhitu.c mswings_verb() / mswings().
function monsterWeaponSwingVerb(weapon, bash = false) {
    if (!weapon) return 'swings';
    const info = objectData[weapon.otyp] || {};
    const dir = Number.isInteger(info.dir) ? info.dir : 0;
    const lash = weapon.otyp === BULLWHIP;
    const thrust = (dir & PIERCE) !== 0 && (((dir & ~PIERCE) === 0) || !rn2(2));

    if (bash) return 'bashes with';
    if (lash) return 'lashes';
    return thrust ? 'thrusts' : 'swings';
}

// cf. mondata.c pronoun_gender() and mhis().
function monsterPossessive(monster) {
    const mdat = monster?.type || {};
    const flags2 = mdat.flags2 || 0;
    if (flags2 & M2_NEUTER) return 'its';

    const useGenderedPronoun = is_humanoid(mdat)
        || !!((mdat.geno || 0) & G_UNIQ)
        || !!(flags2 & M2_PNAME);
    if (!useGenderedPronoun) return 'its';

    if (flags2 & M2_FEMALE) return 'her';
    if (flags2 & M2_MALE) return 'his';
    return monster?.female ? 'her' : 'his';
}

// cf. mhitu.c AT_WEAP swing path (partial).
function maybeMonsterWeaponSwingMessage(monster, player, display, suppressHitMsg) {
    if (!monster?.weapon || suppressHitMsg) return;
    if (player?.blind) return;
    if (monster.minvis && !player?.seeInvisible) return;

    const bash = false;
    const swingVerb = monsterWeaponSwingVerb(monster.weapon, bash);
    const oneOf = ((monster.weapon.quan || 1) > 1) ? 'one of ' : '';
    display.putstr_message(
        `The ${monDisplayName(monster)} ${swingVerb} ${oneOf}${monsterPossessive(monster)} ${xname(monster.weapon)}.`
    );
}

// cf. monmove.c mon_track_clear().
function clearMonsterTrack(monster) {
    if (!Array.isArray(monster?.mtrack)) return;
    for (let i = 0; i < monster.mtrack.length; i++) {
        monster.mtrack[i] = { x: 0, y: 0 };
    }
}

// cf. monmove.c monflee() subset used by melee morale checks.
export function applyMonflee(monster, fleetime, first = false) {
    const oldFleetim = Number(monster?.fleetim || 0);
    if (!first || !monster.flee) {
        if (!fleetime) {
            monster.fleetim = 0;
        } else if (!monster.flee || oldFleetim > 0) {
            let nextFleetim = fleetime + oldFleetim;
            if (nextFleetim === 1) nextFleetim = 2;
            monster.fleetim = Math.min(nextFleetim, 127);
        }
        monster.flee = true;
    }
    clearMonsterTrack(monster);
}

// cf. mhitu.c mattacku() / hitmu() (partial).
export function monsterAttackPlayer(monster, player, display, game = null) {
    if (!monster.attacks || monster.attacks.length === 0) return;
    if (monster.passive) return; // passive monsters don't initiate attacks

    for (let i = 0; i < monster.attacks.length; i++) {
        const attack = monster.attacks[i];
        const suppressHitMsg = !!(game && game._suppressMonsterHitMessagesThisTurn);
        // To-hit calculation for monster
        // cf. mhitu.c:707-708 — tmp = AC_VALUE(u.uac) + 10 + mtmp->m_lev
        // cf. mhitu.c:804 — rnd(20+i) where i is attack index
        // cf. AC_VALUE(ac) macro:
        //   ac >= 0 ? ac : -rnd(-ac)
        const playerAc = Number.isInteger(player.ac)
            ? player.ac
            : (Number.isInteger(player.effectiveAC) ? player.effectiveAC : 10);
        const acValue = (playerAc >= 0) ? playerAc : -rnd(-playerAc);
        const toHit = acValue + 10 + monster.mlevel;

        if (attack.type === AT_WEAP && monster.weapon) {
            maybeMonsterWeaponSwingMessage(monster, player, display, suppressHitMsg);
        }

        const dieRoll = rnd(20 + i);

        if (toHit <= dieRoll) {
            // Miss — cf. mhitu.c:86-98 missmu()
            // "just " prefix when nearmiss (toHit == dieRoll) and verbose.
            if (!suppressHitMsg) {
                const just = (toHit === dieRoll) ? 'just ' : '';
                display.putstr_message(`The ${monDisplayName(monster)} ${just}misses!`);
            }
            continue;
        }

        // Calculate damage
        // cf. mhitu.c:1182 — d(dice, sides) for attack damage
        let damage = 0;
        if (attack.dice && attack.sides) {
            damage = c_d(attack.dice, attack.sides);
        } else if (attack.dmg) {
            damage = c_d(attack.dmg[0], attack.dmg[1]);
        }
        // cf. mhitu.c hitmu() uses weapon.c dmgval() for AT_WEAP melee hits.
        if (attack.type === AT_WEAP && monster.weapon) {
            const wsdam = weaponDamageSides(monster.weapon, null);
            if (wsdam > 0) damage += rnd(wsdam);
            damage += weaponEnchantment(monster.weapon);
        }

        // Handle special attack effects
        if (attack.special) {
            handleSpecialAttack(attack.special, monster, player, display);
        }

        // cf. uhitm.c monster-vs-player electric attacks (AD_ELEC):
        // mhitm_mgc_atk_negated() then mhitm_ad_elec() consume rn2(10), rn2(20).
        // In monsters.js attack.damage stores adtyp numeric code (AD_ELEC=6).
        if (attack.damage === 6) {
            rn2(10);
            rn2(20);
        }

        if (damage > 0) {
            // Apply damage
            const died = player.takeDamage(damage, monDisplayName(monster));
            const wizardSaved = died && player.wizard;
            if (!wizardSaved && !suppressHitMsg) {
                const verb = monsterHitVerb(attack.type);
                display.putstr_message(`The ${monDisplayName(monster)} ${verb}!`);
                if (attack.damage === 6) {
                    display.putstr_message('You get zapped!');
                }
            }

            // cf. uhitm.c:5236-5247 knockback after monster hits hero
            // rn2(3) distance + rn2(6) chance, for physical attacks
            rn2(3);
            rn2(6);

            // cf. allmain.c stop_occupation() via mhitu.c attack flow.
            // A successful monster hit interrupts timed occupations/repeats.
            if (game && game.occupation) {
                if (game.occupation.occtxt === 'waiting' || game.occupation.occtxt === 'searching') {
                    display.putstr_message(`You stop ${game.occupation.occtxt}.`);
                }
                game.occupation = null;
                game.multi = 0;
            }

            if (died) {
                if (player.wizard) {
                    // cf. end.c savelife() for wizard/discover survival path.
                    // givehp = 50 + 10 * (CON / 2), then clamp to hpmax.
                    const con = Number.isInteger(player.attributes?.[A_CON])
                        ? player.attributes[A_CON]
                        : 10;
                    const givehp = 50 + 10 * Math.floor(con / 2);
                    player.hp = Math.min(player.hpmax || givehp, givehp);
                    // cf. end.c done() prints "OK, so you don't die." then
                    // savelife() sets nomovemsg = "You survived..." for NEXT turn.
                    // Whether both appear concatenated on the same screen depends
                    // on message line state:  if previous combat messages caused
                    // --More-- handling, "OK, so you don't die." is shown separately
                    // and only "You survived..." appears on the next screen capture.
                    // HeadlessDisplay: if topMessage has content, the --More--
                    // replacement simulates the clearing, leaving "OK, so you don't
                    // die." as topMessage.  The subsequent "You survived..." then
                    // concatenates with it.  When topMessage is empty (no prior
                    // messages this turn), both appear together.
                    const hadPriorMsg = !!(display.topMessage && display.messageNeedsMore);
                    if (hadPriorMsg) {
                        // C: --More-- would have been shown, harness clears it,
                        // "OK, so you don't die." replaces combat messages.
                        // Then on the NEXT screen capture, only "You survived..."
                        // appears (because the message was aged/cleared between
                        // captures in C).  Match that by not printing the prefix.
                        if (typeof display.clearRow === 'function') display.clearRow(0);
                        display.topMessage = null;
                        display.messageNeedsMore = false;
                    } else {
                        // C: no prior messages, so "OK, so you don't die." appears
                        // cleanly and concatenates with "You survived...".
                        display.putstr_message('OK, so you don\'t die.');
                    }
                    display.putstr_message('You survived that attempt on your life.');
                    if (game) game._suppressMonsterHitMessagesThisTurn = true;
                } else {
                    player.deathCause = `killed by a ${monDisplayName(monster)}`;
                    display.putstr_message('You die...');
                }
                break;
            }
        }
    }
}

// cf. mhitu.c AD_* damage-type handlers in hitmu() (partial).
function handleSpecialAttack(special, monster, player, display) {
    switch (special) {
        case 'poison':
            // cf. mhitu.c AD_DRST -- poison attack
            if (rn2(5) === 0) {
                display.putstr_message(`You feel very sick!`);
                player.attributes[3] = Math.max(1, player.attributes[3] - 1); // DEX loss
            }
            break;

        case 'paralyze':
            // cf. mhitu.c AD_PLYS -- floating eye paralysis
            display.putstr_message(`You are frozen by the ${monDisplayName(monster)}'s gaze!`);
            // In full implementation, this would set multi = -rnd(5)
            break;

        case 'blind':
            // cf. mhitu.c AD_BLND -- blinding attack
            if (!player.blind) {
                display.putstr_message(`You are blinded by the ${monDisplayName(monster)}!`);
                player.blind = true;
            }
            break;

        case 'stick':
            // cf. mhitu.c -- lichen sticking (holds you in place)
            display.putstr_message(`The ${monDisplayName(monster)} grabs you!`);
            break;
    }
}

// ============================================================================
// TODO stubs for remaining mhitu.c functions
// ============================================================================

// --- Group 1: Hit/miss messages (mhitu.c:30-145) ---

// TODO: cf. mhitu.c hitmsg() — full hit message dispatch
// function hitmsg() {}

// TODO: cf. mhitu.c missmu() — monster miss message
// function missmu() {}

// TODO: cf. mhitu.c mswings_verb() — weapon swing verb selection
// function mswings_verb() {}

// TODO: cf. mhitu.c mswings() — print swing message
// function mswings() {}

// --- Group 2: Poison/slow/wildmiss (mhitu.c:146-262) ---

// TODO: cf. mhitu.c mpoisons_subj() — poison subject message
// function mpoisons_subj() {}

// TODO: cf. mhitu.c u_slow_down() — hero slowdown from attack
// function u_slow_down() {}

// TODO: cf. mhitu.c wildmiss() — invisible/displaced miss message
// function wildmiss() {}

// --- Group 3: Engulf expulsion (mhitu.c:263-308) ---

// TODO: cf. mhitu.c expels() — expel hero from engulfer
// function expels() {}

// --- Group 4: Attack dispatch (mhitu.c:309-953) ---

// TODO: cf. mhitu.c getmattk() — get monster attack for index
// function getmattk() {}

// TODO: cf. mhitu.c calc_mattacku_vars() — calculate attack variables
// function calc_mattacku_vars() {}

// TODO: cf. mhitu.c mtrapped_in_pit() — monster trapped in pit check
// function mtrapped_in_pit() {}

// TODO: cf. mhitu.c mattacku() — main monster-attacks-hero dispatch
// function mattacku() {}

// --- Group 5: Summoning/disease/slip (mhitu.c:954-1084) ---

// TODO: cf. mhitu.c summonmu() — summon minions during attack
// function summonmu() {}

// TODO: cf. mhitu.c diseasemu() — disease attack
// function diseasemu() {}

// TODO: cf. mhitu.c u_slip_free() — hero slips free from grab
// function u_slip_free() {}

// --- Group 6: Magic negation/hit (mhitu.c:1085-1268) ---

// TODO: cf. mhitu.c magic_negation() — compute magic cancellation
// function magic_negation() {}

// TODO: cf. mhitu.c hitmu() — process single attack hit on hero
// function hitmu() {}

// --- Group 7: Engulf/explode/gaze (mhitu.c:1269-1894) ---

// TODO: cf. mhitu.c gulp_blnd_check() — blindness check during engulf
// function gulp_blnd_check() {}

// TODO: cf. mhitu.c gulpmu() — engulf attack
// function gulpmu() {}

// TODO: cf. mhitu.c explmu() — exploding monster attack
// function explmu() {}

// TODO: cf. mhitu.c gazemu() — gaze attack
// function gazemu() {}

// --- Group 8: Damage/seduction (mhitu.c:1895-2348) ---

// TODO: cf. mhitu.c mdamageu() — apply damage to hero
// function mdamageu() {}

// TODO: cf. mhitu.c could_seduce() — check if seduction possible
// function could_seduce() {}

// TODO: cf. mhitu.c doseduce() — seduction attack
// function doseduce() {}

// TODO: cf. mhitu.c mayberem() — maybe remove armor during seduction
// function mayberem() {}

// --- Group 9: Assessment/avoidance (mhitu.c:2349-2424) ---

// TODO: cf. mhitu.c assess_dmg() — assess damage for fleeing
// function assess_dmg() {}

// TODO: cf. mhitu.c ranged_attk_assessed() — check if ranged attack assessed
// function ranged_attk_assessed() {}

// TODO: cf. mhitu.c mon_avoiding_this_attack() — monster avoidance check
// function mon_avoiding_this_attack() {}

// TODO: cf. mhitu.c ranged_attk_available() — check for available ranged attack
// function ranged_attk_available() {}

// --- Group 10: Passive/clone (mhitu.c:2425-2640) ---

// TODO: cf. mhitu.c passiveum() — passive counterattack damage
// function passiveum() {}

// TODO: cf. mhitu.c cloneu() — clone hero attack
// function cloneu() {}
