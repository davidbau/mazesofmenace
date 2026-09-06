import { currentHeroAttribute } from './attrib.js';
// Player spell effects for the Z (cast) command.
//
// C refs:
//   src/spell.c:spelleffects() / spelleffects_check()
//   src/zap.c:weffects() / zapyourself() / zapnodir() / zap_updown()
//             / bhit() / bhitm() / dobuzz() / zhitm() / zap_hit() / bounce_dir()
//   src/read.c:seffects() + seffect_*()   (scroll-duplicate spells)
//   src/potion.c:peffects() + peffect_*() (potion-duplicate spells)
//   src/detect.c:monster_detect() / object_detect() / findit()
//   src/dog.c:make_familiar(), src/apply.c:jump(), src/trap.c:float_up()
//
// cmd.js keeps the menu, failure-roll, energy, exercise and pseudo-book
// (next_ident) steps; this module carries the per-spell effects that
// follow, in C's RNG-call order.  cmd.js hands over its internal helpers
// through the `D` (deps) argument so this module stays cycle-free.

import { game } from './gstate.js';
import { findAc } from './do_wear.js';
import { d, rn1, rn2, rnd } from './rng.js';
import {
    A_DEX, A_STR, A_WIS, BOLT_LIM, COLNO, ROWNO, CORR, DOOR, D_CLOSED,
    D_LOCKED, D_NODOOR, D_TRAPPED, D_ISOPEN, IS_OBSTRUCTED, IS_ROOM, IS_TREE, IS_WALL, IS_STWALL,
    Is_airlevel, Is_earthlevel, Is_waterlevel, MM_EDOG, MM_IGNOREWATER,
    MM_NOMSG, NO_MINVENT, P_SKILLED, ROOM, SCORR, SDOOR, STAIRS, STONE,
    STATUE_TRAP, STRAT_WAITMASK, W_NONDIGGABLE, ZAP_POS, xdir, ydir,
} from './const.js';
import { newsym } from './display.js';
import { cansee, couldsee } from './vision.js';
import { explodeSpell, resumeSpellExplosion } from './explode.js';
import { resumeChainLightning } from './chain_lightning.js';
import { lightDamageHero } from './flash.js';
import { fallAsleep } from './timeout.js';
import { findMac, resistsFire, resistsCold, sleepMonst } from './mhitm.js';
import { aggravate } from './wizard.js';
import { newWere, isWereData, isWereHumanForm } from './were.js';
import { makemon, monsterByRndName, rlocNoMsg } from './mklev.js';
import {
    MONS, MR_COLD, MR_FIRE, PM_BLACK_DRAGON, PM_DEATH,
    PM_GRAY_DRAGON, S_DRAGON, nonliving, perceives, is_demon, is_golem, is_undead, is_were,
} from './permonst.js';

const SPELL_MONSTERS_BY_NAME = new Map(MONS.flatMap(mon =>
    [mon.name, ...(mon.names || [])].map(name => [name.toLowerCase(), mon])));
// C makemon.c:golemhp(): fixed species HP, independent of current HP/level.
const GOLEM_HP = new Map([
    ['straw golem', 20], ['paper golem', 20], ['rope golem', 30], ['gold golem', 60],
    ['leather golem', 40], ['wood golem', 50], ['flesh golem', 40], ['clay golem', 70],
    ['stone golem', 100], ['glass golem', 80], ['iron golem', 120],
]);

// C objects.h SPELL(...) oc_dir for the spells routed through the
// wand-duplicate group in spelleffects().  NODIR spells never prompt.
const SPELL_DIR = {
    'force bolt': 'immediate',
    healing: 'immediate',
    'extra healing': 'immediate',
    knock: 'immediate',
    'slow monster': 'immediate',
    'wizard lock': 'immediate',
    'turn undead': 'immediate',
    polymorph: 'immediate',
    'teleport away': 'immediate',
    cancellation: 'immediate',
    'drain life': 'immediate',
    'stone to flesh': 'immediate',
    dig: 'ray',
    'magic missile': 'ray',
    fireball: 'ray',
    'cone of cold': 'ray',
    sleep: 'ray',
    'finger of death': 'ray',
};

// C ref: spell.c:spelleffects() — getdir() only happens when
// objects[otyp].oc_dir != NODIR for the wand-duplicate spell group.
export function spellCastNeedsDirection(spell) {
    return Object.prototype.hasOwnProperty.call(SPELL_DIR, String(spell?.name || '').toLowerCase());
}

function spellName(spell) {
    return String(spell?.name || '').toLowerCase();
}

// C ref: zap.c:spell_damage_bonus() — hero INT (and level) adjustment.
export function spellDamageBonus(dmg) {
    const u = game.u || {};
    const intell = currentHeroAttribute(1);
    const ulevel = u.ulevel || 1;
    if (intell <= 9) {
        if (dmg > 1) dmg = dmg <= 3 ? 1 : dmg - 3;
    } else if (intell <= 13 || ulevel < 5) {
        // no adjustment
    } else if (intell <= 18) dmg += 1;
    else if (intell <= 24 || ulevel < 14) dmg += 2;
    else dmg += 3;
    return dmg;
}

// C ref: zap.c:spell_hit_bonus() — skill + DEX adjustment (no RNG).
function spellHitBonus(spell, D) {
    const skill = D.spellRoleSkillLevel(spell);
    let hitBon = skill >= 4 ? 3 : skill === 3 ? 2 : skill === 2 ? 0 : -4;
    const dex = currentHeroAttribute(3);
    if (dex < 4) hitBon -= 3;
    else if (dex < 6) hitBon -= 2;
    else if (dex < 8) hitBon -= 1;
    else if (dex >= 14) hitBon += dex - 14;
    return hitBon;
}

// C ref: zap.c:zap_hit() — to-hit roll for rays.
function spellZapHit(ac, hitBon) {
    const chance = rn2(20);
    if (!chance) return rnd(10) < ac + hitBon;
    if (ac < 0) ac = -rnd(-ac);
    return 3 - chance < ac + hitBon;
}

function monsterAc(mon) {
    return mon?.mac ?? mon?.data?.mac ?? mon?.data?.ac ?? 10;
}

function monsterName(mon) {
    return String(mon?.data?.name || 'monster');
}

// mthrowu.c:hallublasts and zap.c:flash_str use a fresh core RNG draw
// for each displayed ray name, including successive messages from one ray.
const HALLUCINATED_BLASTS = [
    "asteroids",
    "beads",
    "bubbles",
    "butterflies",
    "champagne",
    "chaos",
    "coins",
    "cotton candy",
    "crumbs",
    "dark matter",
    "darkness",
    "data",
    "dust specks",
    "emoticons",
    "emotions",
    "entropy",
    "flowers",
    "foam",
    "fog",
    "gamma rays",
    "gelatin",
    "gemstones",
    "ghosts",
    "glass shards",
    "glitter",
    "good vibes",
    "gravel",
    "gravity",
    "gravy",
    "grawlixes",
    "holy light",
    "hornets",
    "hot air",
    "hyphens",
    "hypnosis",
    "infrared",
    "insects",
    "jargon",
    "laser beams",
    "leaves",
    "lightening",
    "logic gates",
    "magma",
    "marbles",
    "mathematics",
    "megabytes",
    "metal shavings",
    "metapatterns",
    "meteors",
    "mist",
    "mud",
    "music",
    "nanites",
    "needles",
    "noise",
    "nostalgia",
    "oil",
    "paint",
    "photons",
    "pixels",
    "plasma",
    "polarity",
    "powder",
    "powerups",
    "prismatic light",
    "pure logic",
    "purple",
    "radio waves",
    "rainbows",
    "rock music",
    "rocket fuel",
    "rope",
    "sadness",
    "salt",
    "sand",
    "scrolls",
    "sludge",
    "smileys",
    "snowflakes",
    "sparkles",
    "specularity",
    "spores",
    "stars",
    "steam",
    "tetrahedrons",
    "text",
    "the past",
    "tornadoes",
    "toxic waste",
    "ultraviolet light",
    "viruses",
    "water",
    "waveforms",
    "wind",
    "X-rays",
    "zorkmids"
];

function spellRayName(name, D) {
    return D.heroIsHallucinating() ? `blast of ${HALLUCINATED_BLASTS[rn2(HALLUCINATED_BLASTS.length)]}`
        : name === 'sleep' ? 'sleep ray' : name;
}

function beamGlyph(dx, dy) {
    return dy === 0 ? '─' : dx === 0 ? '│' : dx === dy ? '\\' : '/';
}

function heroOnStairs() {
    return game.level?.at(game.u?.ux || 0, game.u?.uy || 0)?.typ === STAIRS;
}

function heroSwallowedOrUnderwater() {
    return !!(game.u?.uswallow || game.u?.underwater || game.u?.uunderwater);
}

function heroIsUndeadForm() {
    const form = game.u?._polyself_form;
    return !!(form && (form.undead || form.isUndead
        || ['zombie', 'mummy', 'vampire', 'ghost', 'lich', 'skeleton', 'wraith', 'ghoul']
            .some(token => String(form.name || '').toLowerCase().includes(token))));
}

// C ref: zap.c:resist() with oclass == SPBOOK_CLASS (alev = u.ulevel):
// roll, halve damage when resisted, apply damage, report resisted.
async function spellResistDamage(mon, dmg, D, messages) {
    const resisted = D.monsterResistsEffect(mon, game.u?.ulevel || 1);
    const applied = resisted ? Math.trunc((dmg + 1) / 2) : dmg;
    if (applied) mon.mhp = (mon.mhp ?? 1) - applied;
    if ((mon.mhp ?? 1) <= 0)
        await D.killMonsterFromHeroProjectileHit(mon, messages, D.monsterTheName(mon));
    return resisted;
}

// ---------------------------------------------------------------------------
// Direction parsing shared by all directional spells.
// C ref: cmd.c:getdir() + confdir() — self, vertical, movement keys, and
// impaired (stunned/confused) redirection; cancel re-uses previous dir.
// ---------------------------------------------------------------------------
function spellDirectionFromKey(ch, D) {
    let dir = D.movementDirection(ch);
    let vertical = !dir && ch === '<' ? { dx: 0, dy: 0, dz: -1 }
        : !dir && ch === '>' ? { dx: 0, dy: 0, dz: 1 } : null;
    let self = !dir && !vertical && (ch === '.' || ch === 's');
    const canceled = !dir && !vertical && !self;
    if (canceled) {
        // C movecmd clears dz for an unrecognized key; getdir returns
        // before confdir, preserving only the previous horizontal vector.
        const prev = game._last_spell_dir || null;
        if (prev && (prev.dx || prev.dy)) dir = { dx: prev.dx, dy: prev.dy, dz: 0 };
        else self = true;
        game._last_spell_dir = { dx: dir?.dx || 0, dy: dir?.dy || 0, dz: 0 };
    }
    if (!vertical && !canceled) {
        // C cmd.c:getdir() tail: if (!u.dz) confdir(FALSE);
        if (D.heroIsStunned() || (D.heroIsConfused() && !rn2(5))) {
            const k = rn2(8); // C confdir(): dirs_ord[rn2(N_DIRS)]
            dir = { dx: xdir[k], dy: ydir[k] };
            self = false;
        }
    }
    return { dir, vertical, self, canceled };
}

// ---------------------------------------------------------------------------
// C ref: zap.c:zapyourself() — directional spell zapped at self (or released
// with no direction).
// ---------------------------------------------------------------------------
async function spellZapYourself(spell, D) {
    const name = spellName(spell);
    const u = game.u || {};
    const messages = [];
    const push = (...parts) => { for (const p of parts) if (p) messages.push(p); };
    switch (name) {
    case 'fireball':
    case 'cone of cold':
        return resumeSelfZap({ name, phase: 'init' }, D);
    case 'force bolt': {
        // C zap.c:zapyourself() case SPE_FORCE_BOLT (ordinary=TRUE)
        if (D.heroHasAntimagic()) {
            push('Boing!');
        } else {
            push('You bash yourself!');
            const damage = D.maybeHalfPhysicalDamage(d(2, 12));
            D.exerciseAttribute(A_STR, false);
            const result = D.damageHero(messages, damage,
                `zapped ${game.flags?.female ? 'herself' : 'himself'} with a spell`);
            return { messages, ...result };
        }
        return { messages };
    }
    case 'magic missile': {
        if (D.heroHasAntimagic()) push('The missiles bounce!');
        else {
            const damage = D.maybeHalfPhysicalDamage(d(4, 6));
            push('Idiot!  You\'ve shot yourself!');
            const result = D.damageHero(messages, damage,
                `zapped ${game.flags?.female ? 'herself' : 'himself'} with a spell`);
            return { messages, ...result };
        }
        return { messages };
    }
    case 'sleep':
        return resumeSelfZap({ name, phase: 'init' }, D);
    case 'slow monster': {
        // C zap.c:zapyourself() case SPE_SLOW_MONSTER: only acts when Fast.
        if (u.fast || u.veryfast || (u._veryfastTimeout || 0) > 0) {
            // C mhitu.c:u_slow_down()
            u._veryfastTimeout = 0;
            D.syncHeroSpeedState();
            push(u.fast ? 'Your quickness feels less natural.' : 'You slow down.');
            D.exerciseAttribute(A_DEX, false);
        }
        return { messages };
    }
    case 'knock': {
        // C zap.c:zapyourself() case SPE_KNOCK.
        D.releaseHeroHold();
        if (D.heroIsPunished()) D.unpunishHero();
        if (!D.openHeroHoldingTrap()) {
            push(...D.boxlockInventory(false));
            D.openHeroFallingTrap(true);
        }
        return { messages };
    }
    case 'wizard lock': {
        if (!D.closeHeroHoldingTrap()) push(...D.boxlockInventory(true));
        return { messages };
    }
    case 'healing':
    case 'extra healing': {
        // C zap.c:zapyourself() case SPE_HEALING/SPE_EXTRA_HEALING:
        // healup(d(6, extra ? 8 : 4), 0, FALSE, blessed || extra healing) —
        // the blessed pseudo only widens the blind cure, not the dice.
        const extra = name === 'extra healing';
        const skilled = D.spellRoleSkillLevel(spell) >= P_SKILLED;
        const amount = d(6, extra ? 8 : 4);
        const cure = D.healHero(amount, 0, { cureBlind: skilled || extra });
        push(`You feel ${extra ? 'much ' : ''}better.`, cure);
        return { messages };
    }
    case 'turn undead': {
        // C zap.c:unturn_you()
        const revived = await D.unturnDeadHeroInventory();
        push(...(revived || []));
        if (heroIsUndeadForm()) {
            push(`You feel frightened and ${D.heroIsStunned() ? 'even more ' : ''}stunned.`);
            D.addHeroStun(rnd(30));
        } else {
            push('You shudder in dread.');
        }
        return { messages };
    }
    case 'teleport away': {
        // C zap.c:zapyourself() case SPE_TELEPORT_AWAY -> tele(); cmd.js
        // drives the same teleport flow the teleportation scroll uses.
        return { messages, teleportSelf: true };
    }
    case 'polymorph': {
        const result = D.polymorphSelfZapResult(null);
        push(result.message);
        return { messages, polyResult: result, blankIfEmpty: !result.message };
    }
    case 'cancellation': {
        D.cancelHeroSelf();
        return { messages };
    }
    case 'dig':
        // C zap.c:zapyourself() case SPE_DIG: no effect, no message.
        return { messages, blankIfEmpty: true };
    case 'stone to flesh': {
        const result = await D.stoneToFleshInventoryEffect();
        push(...(result.messages || []));
        return { messages, blankIfEmpty: true };
    }
    case 'drain life': {
        if (!D.heroHasDrainResistance()) {
            D.loseExperienceLevel();
            push('You feel drained!');
        }
        return { messages };
    }
    default:
        return { messages: [], unhandled: true };
    }
}

// ---------------------------------------------------------------------------
// C ref: zap.c:zap_updown() + dig.c:zap_dig() vertical case.
// ---------------------------------------------------------------------------
async function spellZapUpDown(spell, dz, D) {
    const name = spellName(spell);
    const messages = [];
    const x = game.u?.ux || 0;
    const y = game.u?.uy || 0;
    // C weffects routes vertical rays through dobuzz; zap_updown only owns
    // IMMEDIATE effects. A ray still draws its range before reducing it to 1.
    if (SPELL_DIR[name] === 'ray' && name !== 'dig')
        return castSpellBeamDispatch(spell, { dx: 0, dy: 0, dz }, D);
    if (name === 'dig') {
        if (dz < 0 || heroOnStairs()) {
            // C dig.c:zap_dig(): rock falls from the ceiling.
            if (heroOnStairs())
                messages.push('The beam bounces off the stairs and hits the ceiling.');
            messages.push('You loosen a rock from the ceiling.');
            messages.push('It falls on your head!');
            const dmg = rnd(D.heroWearsHardHelmet() ? 2 : 6);
            const result = D.damageHero(messages, D.maybeHalfPhysicalDamage(dmg), 'falling rock');
            if (result.fatal || result.lifeSaving || result.genocideDeathArmed)
                return { messages, ...result, afterHeroDamage: { kind: 'fallingRock' } };
            D.dropRockAt(x, y); // C mksobj_at(ROCK, ...) consumes next_ident()
            newsym(x, y);
            return { messages, ...result };
        } else {
            const result = await D.zapDigDownwardResult();
            messages.push(result.message);
            return { messages, more: !!result.more };
        }
        return { messages };
    }
    if (name === 'force bolt' && dz < 0) {
        // C zap.c:zap_updown() SPE_FORCE_BOLT up: rn2(3) rockfall chance.
        if (rn2(3) && !Is_airlevel(game.u?.uz) && !Is_waterlevel(game.u?.uz)
            && !heroSwallowedOrUnderwater()) {
            messages.push('A rock is dislodged from the ceiling and falls on your head.');
            const dmg = rnd(D.heroWearsHardHelmet() ? 2 : 6);
            const result = D.damageHero(messages, D.maybeHalfPhysicalDamage(dmg), 'falling rock');
            if (result.fatal || result.lifeSaving || result.genocideDeathArmed)
                return { messages, ...result, afterHeroDamage: { kind: 'fallingRock', x, y } };
            D.dropRockAt(x, y);
            newsym(x, y);
            return { messages, ...result };
        }
        return { messages };
    }
    if (name === 'knock' && dz > 0) {
        if (!D.openHeroHoldingTrap()) D.openHeroFallingTrap(false);
        return { messages };
    }
    if (name === 'wizard lock' && dz > 0) {
        D.closeHeroHoldingTrap();
        return { messages };
    }
    if (name === 'stone to flesh' && dz > 0) {
        const result = await D.stoneToFleshFloorEffect();
        return { messages: result.messages || [], blankIfEmpty: true };
    }
    // C zap.c:zap_updown() default: bhitpile() floor-object effects only;
    // no floor objects react to these spells in the current model.
    return { messages };
}

// ---------------------------------------------------------------------------
// C ref: zap.c:bhitm() — monster effects for the IMMEDIATE directional beam.
// Returns true when the beam stops at the monster (C bhitm() return).
// ---------------------------------------------------------------------------
async function spellBeamHitMonster(spell, mon, D, messages) {
    const name = spellName(spell);
    const ulevel = game.u?.ulevel || 1;
    const skilled = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const seen = D.visibleMonsterForScroll(mon);
    let wake = true;
    let stopped = false;
    switch (name) {
    case 'force bolt': {
        // C zap.c:bhitm() case SPE_FORCE_BOLT
        if (D.monsterResistsMagm(mon)) {
            messages.push('Boing!');
        } else if (rnd(20) < 10 + monsterAc(mon)) {
            let dmg = d(2, 12);
            if (D.heroIsKnightWithQuestArtifact()) dmg *= 2;
            dmg = spellDamageBonus(dmg);
            messages.push(`The spell hits ${D.monsterTheName(mon)}${dmg > 4 ? '!' : '.'}`);
            await spellResistDamage(mon, dmg, D, messages);
        } else {
            messages.push(`The spell misses ${D.monsterTheName(mon)}.`);
        }
        break;
    }
    case 'drain life': {
        // C monhp_per_lvl() always draws d8 before species overrides,
        // even when innate life-drain resistance will prevent the effect.
        D.revealHeroProjectileHitMimicAppearance(mon);
        const data = SPELL_MONSTERS_BY_NAME.get(monsterName(mon).toLowerCase()) || mon.data;
        const baseLevel = data.lvl ?? data.mlevel ?? 0;
        const level = mon.m_lev ?? mon.mlevel ?? mon.data?.hpLevel ?? baseLevel;
        let dmg = rnd(8);
        if (is_golem(data)) dmg = Math.trunc(GOLEM_HP.get(data.name) / baseLevel);
        else if (baseLevel > 49) dmg = 4 + rnd(4);
        else if (data.mlet === S_DRAGON && data.pm >= PM_GRAY_DRAGON) dmg = 4 + rn2(5);
        else if (!level) dmg = rnd(4);
        if (D.heroIsKnightWithQuestArtifact()) dmg *= 2;
        dmg = spellDamageBonus(dmg);

        // C resists_drli()/defended(): intrinsic species protection,
        // vampire shifters, wielded artifacts, and worn dragon armor.
        const weapon = mon.mw;
        const artifact = String(weapon?.artifact || weapon?.oartifactName || '').toLowerCase();
        const protectedWeapon = (weapon?.artifact || weapon?.oartifact) && (D.drainItemProtectedByDrainResistance(weapon)
            || ['excalibur', 'stormbringer', 'the staff of aesculapius'].includes(artifact));
        const protectedArmor = (mon.minvent || []).some(item =>
            (item.worn || item.owornmask) && (item.otyp === D.BLACK_DRAGON_SCALES
                || item.otyp === D.BLACK_DRAGON_SCALE_MAIL
                || D.dragonArmorSpecForItem(item)?.colorName === 'black'));
        const immune = is_undead(data) || is_demon(data) || is_were(data)
            || data.pm === PM_DEATH || data.pm === PM_BLACK_DRAGON
            || D.monsterIsVampireShifterForLifeSaving(mon) || protectedWeapon || protectedArmor;
        if (!immune) {
            const resisted = await spellResistDamage(mon, dmg, D, messages);
            // resist() can kill, including a death reversed by life saving.
            // Only a surviving, unresisted target receives the second drain.
            if (!resisted && !mon.dead && (mon.mhp ?? 1) > 0) {
                mon.mhp -= dmg;
                mon.mhpmax -= dmg;
                if (mon.mhp <= 0 || mon.mhpmax <= 0 || level < 1) {
                    await D.killMonsterFromHeroProjectileHit(mon, messages, D.monsterTheName(mon));
                } else {
                    mon.m_lev = level - 1;
                    if (D.visibleMonsterForScroll(mon))
                        messages.push(`${D.monsterTheName(mon, true)} suddenly seems weaker!`);
                }
            }
        }
        break;
    }
    case 'slow monster': {
        if (!D.monsterResistsEffect(mon, ulevel)) {
            // C worn.c:mon_adjust_speed(-1)
            const oldSpeed = mon.mspeed ?? 0;
            if (mon.permspeed === 2) mon.permspeed = 0;
            else mon.permspeed = -1;
            mon.mspeed = mon.permspeed;
            if (mon.mspeed !== oldSpeed && (mon.data?.mmove ?? 1)
                && !mon.mfrozen && !mon.msleeping && seen)
                messages.push(`${D.monsterTheName(mon, true)} seems to be moving slower.`);
        }
        break;
    }
    case 'turn undead': {
        wake = false;
        if (D.monsterIsUndead(mon)) {
            wake = true;
            let dmg = rnd(8);
            if (D.heroIsKnightWithQuestArtifact()) dmg *= 2;
            dmg = spellDamageBonus(dmg);
            game.context.bypasses = true;
            const resisted = await spellResistDamage(mon, dmg, D, messages);
            if (!resisted && !mon.dead && (mon.mhp ?? 1) > 0) {
                // C mon.c:monflee(0, FALSE, TRUE)
                mon.mflee = 1;
                mon.mfleetim = 0;
                D.clearMonsterTrack(mon);
                if (seen) messages.push(`${D.monsterTheName(mon, true)} turns to flee.`);
            }
        }
        break;
    }
    case 'teleport away': {
        // C teleport.c:u_teleport_mon()
        if (D.monsterIsRider(mon) && rn2(13)) rlocNoMsg(mon);
        else rlocNoMsg(mon);
        break;
    }
    case 'cancellation': {
        D.revealHeroProjectileHitMimicAppearance(mon);
        if (!D.monsterResistsEffect(mon, ulevel)) {
            mon.mcan = 1;
            // C normal_shape() restores the base species and then removes
            // its shapechanging identity; newcham must not undo mcan.
            const rawBase = mon.cham ?? mon.chamName ?? mon.chamBase ?? mon.vampBase
                ?? mon.data?.cham ?? mon.data?.chamName ?? mon.data?.vampBase;
            const base = typeof rawBase === 'number' ? MONS[rawBase]
                : SPELL_MONSTERS_BY_NAME.get(String(rawBase || '').toLowerCase());
            if (base) {
                if (monsterName(mon).toLowerCase() !== base.name.toLowerCase())
                    D.applyMonsterPolymorphTarget(mon, monsterByRndName(base.name) || base, messages);
                mon.cham = -1;
                delete mon.chamName;
                delete mon.chamBase;
                delete mon.vampBase;
                mon.vampshifter = false;
                mon.mcan = 1;
            }
            if (isWereData(mon.data) && !isWereHumanForm(mon.data))
                newWere(mon, { g: game, canseemon: D.visibleMonsterForScroll,
                    addToplineMessage: message => messages.push(message), newsym });
            if (monsterName(mon).toLowerCase() === 'clay golem') {
                if (seen) messages.push(`Some writing vanishes from ${D.monsterPossessiveName(mon)} head!`);
                await D.killMonsterFromHeroProjectileHit(mon, messages, D.monsterTheName(mon));
            }
        }
        break;
    }
    case 'knock': {
        if (mon === game.u?.ustuck) {
            D.releaseHeroHold();
            return true;
        }
        if (D.openMonsterHoldingTrap(mon)) return true;
        // C zap.c:bhitm() SPE_KNOCK: small monsters are knocked back.
        const small = (mon.data?.msize ?? 3) < 3;
        if (small) {
            if (seen) messages.push(`${D.monsterTheName(mon, true)} is knocked back!`);
            D.monsterHurtle(mon, Math.sign(mon.mx - (game.u?.ux || 0)),
                Math.sign(mon.my - (game.u?.uy || 0)), rnd(2));
        } else if (seen) {
            messages.push(`${D.monsterTheName(mon, true)} doesn't budge.`);
        }
        if (!mon.dead && (mon.mhp ?? 1) > 0) {
            D.wakeupMonster(mon);
            D.abuseDog(mon);
        }
        stopped = true; // C bhitm() returns 1 for SPE_KNOCK
        break;
    }
    case 'wizard lock': {
        wake = D.closeMonsterHoldingTrap(mon);
        break;
    }
    case 'healing':
    case 'extra healing': {
        // C zap.c:bhitm() case SPE_HEALING/SPE_EXTRA_HEALING
        const extra = name === 'extra healing';
        const healamt = d(6, extra ? 8 : 4);
        if (monsterName(mon).toLowerCase() === 'pestilence') {
            await spellResistDamage(mon, Math.trunc(healamt / 2), D, messages);
            break;
        }
        wake = false;
        mon.mhp = Math.min(mon.mhpmax ?? mon.mhp ?? 1, (mon.mhp ?? 1) + healamt);
        if ((skilled || extra) && (mon.blinded || mon.mblinded)) {
            mon.blinded = false;
            mon.mblinded = 0;
            if (seen) messages.push(`${D.monsterTheName(mon, true)} can see again.`);
        }
        if (seen) messages.push(`${D.monsterTheName(mon, true)} looks${extra ? ' much' : ''} better.`);
        break;
    }
    case 'stone to flesh': {
        const data = SPELL_MONSTERS_BY_NAME.get(monsterName(mon).toLowerCase()) || mon.data;
        if (is_golem(data)) {
            const oldName = D.monsterTheName(mon, true);
            if (data.name === 'stone golem')
                D.applyMonsterPolymorphTarget(mon, monsterByRndName('flesh golem'), [], false);
            if (seen) messages.push(`${oldName} ${data.name === 'stone golem' && monsterName(mon) === 'flesh golem'
                ? 'turns to flesh!' : data.name === 'flesh golem' ? 'seems fleshier...'
                    : 'looks rather fleshy for a moment.'}`);
        } else {
            wake = false;
        }
        break;
    }
    default:
        wake = false;
    }
    if (wake && !mon.dead && (mon.mhp ?? 1) > 0) {
        D.directMeleeNonlethalWakeupTail(mon, messages, { ...mon }, { ordinaryMelee: true, visible: seen });
        // C bhitm() shares m_respond() across harmful immediate effects.
        const species = monsterName(mon).toLowerCase();
        if (species === 'shrieker' && Math.max(Math.abs(mon.mx - game.u.ux), Math.abs(mon.my - game.u.uy)) <= 1) {
            if (!D.heroIsDeaf()) {
                messages.push(`${D.monsterTheName(mon, true)} shrieks.`);
                game.occupation = null;
            }
            if (!rn2(10)) {
                const worm = SPELL_MONSTERS_BY_NAME.get('purple worm');
                const maxDifficulty = Math.trunc((D.levelDifficulty() + ulevel) / 2);
                const summoned = rn2(13) ? null : monsterByRndName(
                    worm.difficulty > maxDifficulty ? 'baby purple worm' : 'purple worm');
                await makemon(summoned, 0, 0, 0);
            }
            aggravate();
        }
        if (species === 'erinys' && !mon.mpeaceful && mon.mcansee !== false && mon.mcansee !== 0
            && !(mon.mblinded > 0) && couldsee(mon.mx, mon.my)
            && (!game.u.invisible || mon.data?.seeInvisible
                || perceives(SPELL_MONSTERS_BY_NAME.get(species)))) aggravate();
        if (species === 'medusa' && couldsee(mon.mx, mon.my)) {
            const visible = !D.heroIsBlind() && D.visibleMonsterForScroll(mon);
            const unaware = D.heroIsUnaware();
            const reflectable = !!game.u.reflecting;
            const hallucinating = D.heroIsHallucinating();
            const cancelled = mon.mcan || (hallucinating && rn2(4)) || (unaware && !reflectable);
            if (cancelled || mon.mcansee === false || mon.mcansee === 0 || mon.mblinded > 0) {
                if (visible) messages.push(unaware ? 'Medusa seems irritated.'
                    : hallucinating && !rn2(3) ? 'Someone seems overdue for a serpent cut.'
                        : 'Medusa gazes ineffectually.');
            } else if (reflectable) {
                if (visible) messages.push(`Medusa's gaze is reflected by your ${D.heroZapReflectSourceWord() || 'medallion'}.`);
                const reflection = D.monsterReflectionSource(mon);
                if (reflection) {
                    if (visible) messages.push(`The gaze is reflected away by ${D.monsterPossessiveName(mon)} ${reflection.source}!`);
                } else if (game.u.invisible && !mon.data.seeInvisible && !perceives(SPELL_MONSTERS_BY_NAME.get(species))) {
                    if (visible) messages.push("Medusa doesn't seem to notice that her gaze was reflected.");
                } else {
                    if (visible) messages.push('Medusa is turned to stone!');
                    mon.mhp = 0;
                    if (!D.applyHeroProjectileMonsterLifeSaving(mon, messages))
                        D.stoneMonster(mon, messages, { awardExperience: true });
                }
            } else if (visible && !unaware && !game.u.stoneResistance && !D.heroPolyselfResistsStoning()) {
                messages.push("You meet Medusa's gaze.");
                game.occupation = null;
                const transformed = D.maybeTurnPolyselfIntoStoneGolem();
                if (transformed) messages.push(transformed);
                else {
                    messages.push('You turn to stone...');
                    game.u.uhp = 0;
                    game._death_cause = 'Medusa';
                    game._death_bones_body = 'statue';
                    if (D.consumeLifeSavingAmulet({ clearStoning: true })) {
                        messages.push('You die...  But wait...  Your medallion begins to glow!');
                        messages.lifeSaving = true;
                    } else messages.fatal = true;
                    stopped = true;
                }
            }
        }
    }
    return stopped;
}

// ---------------------------------------------------------------------------
// C ref: zap.c:weffects() IMMEDIATE case + bhit() — beam walk for the
// immediate directional spells.
// ---------------------------------------------------------------------------
async function spellImmediateBeam(spell, dir, D) {
    const name = spellName(spell);
    const messages = [];
    let range = rn1(8, 6); // C bhit() range for ZAPPED_WAND immediate beams
    let x = game.u?.ux || 0;
    let y = game.u?.uy || 0;
    const beamCells = [];
    while (range-- > 0) {
        x += dir.dx;
        y += dir.dy;
        if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) break;
        const loc = game.level?.at(x, y);
        if (!loc) break;
        const typ = loc.typ;

        // C bhit(): monster first (fhitm), then floor objects (bhitpile).
        const mon = (game.level?.monsters || []).find(candidate =>
            candidate && !candidate.dead && (candidate.mhp ?? 1) > 0
            && candidate.mx === x && candidate.my === y);
        if (mon) {
            const stopped = await spellBeamHitMonster(spell, mon, D, messages);
            if (stopped) break;
            range -= 3;
        }

        if (name === 'force bolt') {
            // C zap.c:bhito() WAN_STRIKING/SPE_FORCE_BOLT: shatters statues.
            const trap = (game.level?.traps || []).find(candidate =>
                candidate && candidate.ttyp === STATUE_TRAP && candidate.tx === x && candidate.ty === y);
            const statue = D.floorStatueAt(x, y);
            if (trap && statue) {
                const message = await D.activateStatueTrap(trap, x, y, { shatter: true }) || '';
                if (message) messages.push(message);
                else if (D.breakStatueObject(statue, x, y)) {
                    const result = D.statueStrikeBreakResult(x, y);
                    if (result.message) messages.push(result.message);
                }
                range--;
            } else if (statue) {
                if (D.breakStatueObject(statue, x, y)) {
                    const result = D.statueStrikeBreakResult(x, y);
                    if (result.message) messages.push(result.message);
                }
                range--;
            }
        }

        if (name === 'drain life') {
            // C bhitpile()/bhito(): visit the floor chain from its head,
            // after the monster; a nonempty affected pile costs one range
            // step even if no object can actually lose an enchantment.
            let hitPile = false;
            for (const item of [...(game.level?.objects || [])].reverse()) {
                if (!item || item.hidden || item.transientProjectile || item.ox !== x || item.oy !== y
                    || item === game.u?.uball || item === game.u?.uchain) continue;
                if (item.bypass && game.context?.bypasses) continue;
                if (item.bypass) item.bypass = 0;
                D.drainItem(item, { byYou: true, messages });
                hitPile = true;
            }
            if (hitPile) range--;
        }

        if (name === 'stone to flesh') {
            const result = await D.stoneToFleshFloorEffect(x, y);
            messages.push(...result.messages);
            if (result.transformed) range--;
        }

        // C bhit() door handling for opening/locking/striking spells.
        if ((typ === DOOR || typ === SDOOR)
            && (name === 'knock' || name === 'wizard lock' || name === 'force bolt')) {
            const doorMsg = D.spellDoorlock(name, x, y);
            if (doorMsg) messages.push(doorMsg);
        }

        if (!ZAP_POS(typ) || (typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)))) break;
        beamCells.push({ x, y, ch: beamGlyph(dir.dx, dir.dy) });
    }
    if (beamCells.length > 1 && !D.heroIsBlind()) game._transient_beam_cells = beamCells;
    return { messages, more: !!messages.more, fatal: !!messages.fatal, lifeSaving: !!messages.lifeSaving };
}

// ---------------------------------------------------------------------------
// C ref: zap.c:dobuzz() — reflected rays; fireball uses explosion targeting.
// ---------------------------------------------------------------------------
async function rayHitMonster(state, mon, D, messages, swallowed = false) {
    const { name, spell, nd } = state;
    const data = SPELL_MONSTERS_BY_NAME.get(monsterName(mon).toLowerCase()) || mon.data;
    let damage = 0;
    let absorbed = false;
    if (name === 'sleep') {
        if (sleepMonst(mon, d(nd, 25), spell ? 0 : 10) && !swallowed) state.slept = mon;
    } else if (name === 'finger of death') {
        if (data.pm === PM_DEATH) {
            mon.mhpmax = Math.min(999, mon.mhpmax + Math.trunc(mon.mhpmax / 2));
            mon.mhp = mon.mhpmax;
            absorbed = true;
        } else if (!nonliving(data) && !is_demon(data)
            && !D.monsterIsVampireShifterForLifeSaving(mon) && !D.monsterResistsMagm(mon)) damage = mon.mhp + 1;
    } else if (name === 'fireball' || name === 'cone of cold') {
        const fire = name === 'fireball';
        if (!(fire ? resistsFire(mon) || D.monsterResistsFire(mon) : resistsCold(mon) || D.monsterResistsCold(mon))) {
            const original = spell ? spellDamageBonus(d(nd, 6)) : d(nd, 6);
            damage = original;
            if (fire ? resistsCold(mon) || D.monsterResistsCold(mon) : resistsFire(mon) || D.monsterResistsFire(mon))
                damage += fire ? 7 : d(nd, 3);
            if (fire ? D.burnMonsterArmorFromFire(mon) && !rn2(3) : !rn2(3)) {
                damage += fire ? D.monsterFireInventoryDamage(mon, original, messages, D.visibleMonsterForScroll(mon))
                    : D.monsterColdInventoryDamage(mon, original, messages, D.visibleMonsterForScroll(mon));
                if (fire) D.igniteMonsterFireInventoryItems(mon, messages, D.visibleMonsterForScroll(mon));
            }
        }
    } else if (!D.monsterResistsMagm(mon)) damage = spell ? spellDamageBonus(d(nd, 6)) : d(nd, 6);
    if (name !== 'finger of death') {
        if (spell && D.heroIsKnightWithQuestArtifact()) damage *= 2;
        if (damage > 0 && D.monsterResistsEffect(mon, spell ? game.u?.ulevel || 1 : 12)) damage = Math.trunc(damage / 2);
    }
    mon.mhp -= damage;
    if (swallowed) messages.push(`The ${spellRayName(name, D)} rips into ${D.monsterTheName(mon)}${damage > 4 ? '!' : '.'}`);
    if (mon.mhp <= 0) {
        await D.killMonsterFromHeroProjectileHit(mon, messages, D.monsterTheName(mon));
    } else if (!swallowed) {
        if (D.visibleMonsterForScroll(mon)) {
            messages.push(`The ${spellRayName(name, D)} hits ${D.monsterTheName(mon)}${damage > 4 ? '!' : '.'}`);
            if (absorbed) messages.push(`${D.monsterTheName(mon, true)} absorbs the deadly ray!`, 'It seems even stronger than before.');
        }
        if (name !== 'sleep') D.directMeleeNonlethalWakeupTail(mon, messages, { ...mon },
            { ordinaryMelee: true, visible: D.visibleMonsterForScroll(mon) });
    }
    return absorbed;
}

export async function heroRay({ spell = null, item = null, name = spellName(spell) }, dir, D) {
    const u = game.u;
    const nd = spell ? Math.trunc((u.ulevel || 1) / 2) + 1 : name === 'magic missile' ? 2 : 6;
    const hitBon = spell ? spellHitBonus(spell, D) : 0;
    const displayed = D.heroIsHallucinating() ? rn2(6)
        : name === 'sleep' ? 3 : name === 'cone of cold' ? 2 : name === 'fireball' ? 1 : name === 'finger of death' ? 4 : 0;
    if (u.uswallow && u.ustuck) {
        const messages = [];
        await rayHitMonster({ spell, name, nd }, u.ustuck, D, messages, true);
        if (item) D.learnRayItem(item, name, { experience: true });
        return { messages, fatal: !!messages.fatal, lifeSaving: !!messages.lifeSaving };
    }
    const range = rn1(7, 7);
    return resumeHeroRay({ spell, item, name, nd, hitBon,
        rayName: name === 'sleep' ? 'sleep ray' : name,
        color: [12, 9, 15, 12, 8, 15][displayed],
        range: dir.dx || dir.dy ? range : 1, sx: u.ux, sy: u.uy, dx: dir.dx, dy: dir.dy,
        beamCells: [], phase: 'step', output: [], messages: [], savedBhitpos: game.bhitpos ? { ...game.bhitpos } : null }, D);
}

// zap.c:dobuzz/zhitu. Each phase resumes after the source operation that
// displayed a message; no range, hit or damage roll is repeated after input.
export async function resumeHeroRay(state, D) {
    const { spell, name, nd, rayName } = state;
    const pending = { published: true, pending: true, messages: state.messages,
        afterHeroDamage: { kind: 'heroRay', state } };
    while (!game.program_state?.gameover) {
        while (state.output.length) {
            const text = state.output.shift(); state.messages.push(text);
            if (!D.say(text)) return pending;
        }
        if (D.waiting()) return pending;
        if (state.releaseGrip) {
            D.releaseHeroHold();
            state.releaseGrip = null;
        }
        if (state.slept) {
            const mon = state.slept; state.slept = null;
            if (D.sleptMonster(mon, state.output, { deferRelease: true })) state.releaseGrip = mon;
            if (state.output.length) continue;
        }
        if (state.observation) {
            D.observeHeroRayResistance(state.observation.kind, state.observation.resisted);
            state.observation = null;
        }
        const u = game.u;
        if (state.phase === 'step') {
            if (state.range-- <= 0) { state.phase = 'end'; continue; }
            state.lsx = state.sx; state.lsy = state.sy;
            state.sx += state.dx; state.sy += state.dy;
            const { sx, sy } = state;
            const loc = sx >= 1 && sx < COLNO && sy >= 0 && sy < ROWNO ? game.level.at(sx, sy) : null;
            state.typ = loc?.typ ?? STONE;
            if (!loc || loc.typ === STONE) { state.phase = 'bounce'; continue; }
            game.bhitpos = { x: sx, y: sy };
            state.beamCells.push({ x: sx, y: sy, ch: !state.dx && !state.dy ? '\\' : beamGlyph(state.dx, state.dy), color: state.color });
            if (!D.heroIsBlind()) game._transient_beam_cells = state.beamCells;
            state.phase = 'target';
            if (name === 'cone of cold') {
                const terrain = D.applyColdRayTerrain(sx, sy);
                state.output.push(...terrain.messages); state.range += terrain.rangeMod;
                if (terrain.stopped || state.range < 0) state.phase = 'end';
            }
            continue;
        }
        if (state.phase === 'target') {
            state.phase = 'obstacle';
            const mon = (game.level.monsters || []).find(m => !m.dead && m.mhp > 0 && m.mx === state.sx && m.my === state.sy);
            if (mon) {
                state.mon = mon;
                if (name === 'fireball') { state.phase = 'end'; continue; }
                mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITMASK;
                if (spellZapHit(findMac(mon), state.hitBon)) {
                    state.range -= 2;
                    state.reflection = D.monsterReflectionSource(mon);
                    if (state.reflection) {
                        state.phase = 'monsterReflection';
                        if (D.visibleMonsterForScroll(mon)) state.output.push(`The ${spellRayName(name, D)} hits ${D.monsterTheName(mon)}.`);
                    } else {
                        const messages = [];
                        if (await rayHitMonster(state, mon, D, messages)) state.phase = 'end';
                        state.output.push(...messages);
                    }
                } else if (D.visibleMonsterForScroll(mon)) state.output.push(`The ${spellRayName(name, D)} misses ${D.monsterTheName(mon)}.`);
            } else if (name !== 'fireball' && state.sx === u.ux && state.sy === u.uy && state.range >= 0) {
                state.phase = 'afterHero';
                if (spellZapHit(u.uac ?? 10, 0)) {
                    state.range -= 2; state.phase = 'heroEffect';
                    state.output.push(`The ${spellRayName(name, D)} hits you!`);
                } else if (!D.heroIsBlind()) state.output.push(`The ${spellRayName(name, D)} whizzes by you!`);
            }
            continue;
        }
        if (state.phase === 'monsterReflection') {
            state.dx = -state.dx; state.dy = -state.dy; state.phase = 'obstacle';
            if (D.visibleMonsterForScroll(state.mon)) {
                D.recordMonsterReflectionDiscovery(state.reflection);
                state.output.push(`But it reflects from ${D.monsterPossessiveName(state.mon)} ${state.reflection.source}!`);
            }
            continue;
        }
        if (state.phase === 'heroEffect') {
            state.phase = 'heroInventory'; state.damage = 0; state.inventory = null;
            const reflection = D.heroRayReflection();
            if (reflection) {
                state.reflection = reflection; state.phase = 'heroReflection';
                state.output.push(D.heroIsBlind() ? 'For some reason you are not affected.'
                    : `But it reflects from your ${reflection}!`);
                continue;
            }
            if (name === 'sleep') {
                const resisted = D.heroHasSleepResistance();
                if (resisted) {
                    state.output.push("You don't feel sleepy.");
                    state.observation = { kind: 'sleep', resisted: true };
                } else {
                    D.observeHeroRayResistance('sleep', false);
                    fallAsleep(-d(nd, 25), true, D.stopHeroOccupation);
                }
            } else if (name === 'cone of cold') {
                state.original = d(nd, 6);
                const resisted = D.heroHasColdResistance();
                if (resisted) {
                    state.output.push("You don't feel cold.");
                    state.observation = { kind: 'cold', resisted: true };
                } else {
                    state.damage = state.original;
                    D.observeHeroRayResistance('cold', false);
                }
                state.phase = 'coldSelection';
            } else if (name === 'finger of death') {
                const form = SPELL_MONSTERS_BY_NAME.get(String(u._polyself_form?.name || '').toLowerCase());
                if (form && (nonliving(form) || is_demon(form))) state.output.push('You seem unaffected.');
                else if (D.heroHasAntimagic()) {
                    D.observeHeroRayResistance('magic', true); state.output.push("You aren't affected.");
                } else {
                    D.observeHeroRayResistance('magic', false); state.phase = 'afterZhitu';
                    const messages = [], result = D.killHero(messages, 'killed by a finger of death');
                    if (!D.publishDamageResult(messages, result)) return pending;
                }
            } else {
                const resisted = D.heroHasAntimagic();
                if (resisted) {
                    state.output.push('The missiles bounce off!');
                    state.observation = { kind: 'magic', resisted: true };
                } else {
                    state.damage = d(nd, 6); D.exerciseAttribute(A_STR, false);
                    D.observeHeroRayResistance('magic', false);
                }
            }
            continue;
        }
        if (state.phase === 'heroReflection') {
            if (!D.heroIsBlind()) D.discoverHeroRayReflection(state.reflection);
            D.observeHeroRayResistance('reflection', true);
            state.dx = -state.dx; state.dy = -state.dy; state.phase = 'afterHero';
        }
        if (state.phase === 'coldSelection') {
            state.inventory = !rn2(3) ? { original: state.original } : null;
            state.phase = 'heroInventory';
        }
        if (state.phase === 'heroInventory') {
            if (state.inventory && !D.heroColdInventoryDamage(state.inventory)) return pending;
            state.phase = 'afterZhitu';
            const messages = [], result = D.damageHero(messages, D.halfSpellDamage(state.damage),
                `killed by a ${rayName} ${spell ? 'cast' : 'zapped'} by ${game.flags?.female ? 'herself' : 'himself'}`);
            if (!D.publishDamageResult(messages, result)) return pending;
        }
        if (state.phase === 'afterZhitu') {
            D.observeHeroRayResistance('reflection', false);
            state.phase = 'afterHero';
        }
        if (state.phase === 'afterHero') {
            D.stopHeroOccupation();
            if (game.multi > 0) game.multi = 0;
            state.phase = 'obstacle';
        }
        if (state.phase === 'obstacle') {
            const loc = game.level.at(state.sx, state.sy);
            state.phase = !ZAP_POS(loc?.typ ?? STONE)
                || (loc?.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED)) && state.range >= 0) ? 'bounce' : 'step';
            continue;
        }
        if (state.phase === 'bounce') {
            const { sx, sy, lsx, lsy, typ } = state;
            const inBounds = sx >= 1 && sx < COLNO && sy >= 0 && sy < ROWNO;
            state.bchance = !inBounds || typ === STONE ? 10 : IS_WALL(typ) && u.uz.dnum === game.mines_dnum ? 20 : 75;
            state.phase = 'bounceDirection';
            if ((--state.range > 0 && lsx >= 1 && lsx < COLNO && lsy >= 0 && lsy < ROWNO && cansee(lsx, lsy)) || name === 'fireball') {
                if (Is_airlevel(u.uz)) {
                    state.output.push(`The ${spellRayName(name, D)} vanishes into the aether!`);
                    state.phase = 'end'; state.vanished = true;
                } else if (name === 'fireball') {
                    state.sx = lsx; state.sy = lsy; state.phase = 'end';
                } else state.output.push(`The ${spellRayName(name, D)} bounces!`);
            }
            continue;
        }
        if (state.phase === 'bounceDirection') {
            const { sx, sy, dx, dy, bchance } = state;
            state.phase = 'step';
            if (!dx || !dy || (bchance > 0 && !rn2(bchance))) {
                state.dx = -dx; state.dy = -dy; continue;
            }
            let bounce = 0;
            const lsx = sx - dx, lsy = sy - dy;
            const yloc = sx >= 1 && sx < COLNO && lsy >= 0 && lsy < ROWNO ? game.level.at(sx, lsy) : null;
            const ytyp = yloc?.typ ?? STONE;
            if (ZAP_POS(ytyp) && !(yloc?.typ === DOOR && (yloc.doormask & (D_CLOSED | D_LOCKED)))
                && (IS_ROOM(ytyp) || (sx + dx >= 1 && sx + dx < COLNO && ZAP_POS(game.level.at(sx + dx, lsy)?.typ ?? STONE)))) bounce = 1;
            const xloc = lsx >= 1 && lsx < COLNO && sy >= 0 && sy < ROWNO ? game.level.at(lsx, sy) : null;
            const xtyp = xloc?.typ ?? STONE;
            if (ZAP_POS(xtyp) && !(xloc?.typ === DOOR && (xloc.doormask & (D_CLOSED | D_LOCKED)))
                && (IS_ROOM(xtyp) || (sy + dy >= 0 && sy + dy < ROWNO && ZAP_POS(game.level.at(lsx, sy + dy)?.typ ?? STONE)))
                && (!bounce || rn2(2))) bounce = 2;
            if (!bounce) { state.dx = -dx; state.dy = -dy; }
            else if (bounce === 1) state.dy = -dy;
            else state.dx = -dx;
            continue;
        }
        if (state.phase === 'end') {
            game._transient_beam_cells = null;
            game.bhitpos = state.savedBhitpos;
            if (state.item) {
                D.learnRayItem(state.item, name, { experience: true });
                state.item = null;
            }
            if (name === 'fireball' && !state.vanished) {
                return explodeSpell(state.sx, state.sy, 'fire', d(12, 6), D);
            }
            return { published: true, messages: state.messages };
        }
    }
    return { published: true, messages: state.messages };
}

// ---------------------------------------------------------------------------
// C ref: dig.c:zap_dig() — directional dig spell.
// ---------------------------------------------------------------------------
function spellDigBeam(spell, dir, D) {
    const messages = [];
    let digdepth = rn1(18, 8); // C zap_dig(): digdepth = rn1(18, 8)
    const mazeDig = !!game.level?.flags?.is_maze_lev && !Is_earthlevel(game.u?.uz);
    let x = (game.u?.ux || 0) + dir.dx;
    let y = (game.u?.uy || 0) + dir.dy;
    while (--digdepth >= 0) {
        if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) break;
        const loc = game.level?.at(x, y);
        if (!loc) break;
        const nondiggable = (IS_WALL(loc.typ) || loc.typ === STONE || IS_TREE(loc.typ))
            && (loc.wall_info & W_NONDIGGABLE);
        if ((loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) || loc.typ === SDOOR) {
            if (nondiggable) break;
            loc.typ = DOOR;
            loc.doormask = D_NODOOR;
            loc.flags = 0;
            digdepth -= 2;
            newsym(x, y);
            if (mazeDig) break;
        } else if (mazeDig) {
            if (IS_WALL(loc.typ) || IS_TREE(loc.typ)) {
                if (!nondiggable) {
                    loc.typ = ROOM;
                    loc.flags = 0;
                    newsym(x, y);
                }
                break;
            } else if (loc.typ === STONE || loc.typ === SCORR) {
                if (!nondiggable) {
                    loc.typ = CORR;
                    loc.flags = 0;
                    newsym(x, y);
                }
                break;
            }
        } else if (IS_OBSTRUCTED(loc.typ)) {
            if (nondiggable) break;
            if (IS_WALL(loc.typ) || loc.typ === SDOOR) {
                loc.typ = game.level?.flags?.is_cavernous_lev && !game.level?.flags?.has_town ? CORR : DOOR;
                loc.doormask = D_NODOOR;
                loc.flags = 0;
                digdepth -= 2;
            } else if (IS_TREE(loc.typ)) {
                loc.typ = ROOM;
                loc.flags = 0;
                digdepth -= 2;
            } else {
                loc.typ = CORR;
                loc.flags = 0;
                digdepth--;
            }
            newsym(x, y);
        }
        x += dir.dx;
        y += dir.dy;
    }
    return { messages, blankIfEmpty: true };
}

// ---------------------------------------------------------------------------
// Public entry: directional spell cast finished (key received at the
// "In what direction?" prompt).  C ref: spell.c:spelleffects() directional
// half — getdir, zapyourself vs weffects.
// ---------------------------------------------------------------------------
export async function castSpellDirectionalEffect(spell, ch, D) {
    const name = spellName(spell);
    if (name === 'polymorph') {
        // Kept on the existing session-validated polymorph helpers.
        const handled = await D.polymorphSpellDirection(ch);
        return handled ? { messages: [], blankIfEmpty: true } : { castFallback: true };
    }
    const { dir, vertical, self, canceled } = spellDirectionFromKey(ch, D);
    if (canceled) {
        return resumeReleasedSpell({ spell, dir, vertical, self }, D);
    }
    if (self) {
        game._last_spell_dir = { dx: 0, dy: 0, dz: 0 };
        return spellZapYourself(spell, D);
    }
    if (vertical) {
        game._last_spell_dir = { dx: 0, dy: 0, dz: vertical.dz };
        return spellZapUpDown(spell, vertical.dz, D);
    }
    if (!dir) {
        // Invalid direction key: C getdir() complains, then releases at self.
        const result = await spellZapYourself(spell, D);
        return { ...result, invalidDirection: true };
    }
    game._last_spell_dir = { dx: dir.dx, dy: dir.dy, dz: 0 };
    return castSpellBeamDispatch(spell, dir, D);
}

// The release pline precedes weffects and its first RNG call. Store the
// resolved direction so an acknowledgement never repeats getdir/confdir.
export async function resumeReleasedSpell(state, D) {
    if (!state.announced) {
        state.announced = true;
        if (!D.say('The magical energy is released!')) return {
            published: true, pending: true, messages: [],
            afterHeroDamage: { kind: 'releasedSpell', state },
        };
    }
    const { spell, dir, vertical, self } = state;
    const result = vertical ? await spellZapUpDown(spell, vertical.dz, D)
        : self || !dir ? await spellZapYourself(spell, D) : await castSpellBeamDispatch(spell, dir, D);
    return { ...result, released: !result.published };
}

export async function resumeSelfZap(state, D) {
    const pending = () => ({ published: true, pending: true, messages: [],
        afterHeroDamage: { kind: 'selfZap', state } });
    if (state.phase === 'init') {
        state.phase = 'effect';
        if (state.name === 'fireball') {
            if (!D.say('You explode a fireball on top of yourself!')) return pending();
        } else if (state.name === 'sleep') {
            state.resistant = D.heroHasSleepResistance();
            if (!D.say(state.resistant ? "You don't feel sleepy!" : 'The sleep ray hits you!')) return pending();
        } else {
            state.original = d(12, 6);
            state.resistant = D.heroHasColdResistance();
            if (!D.say(state.resistant ? 'You feel a little chill.' : 'You imitate a popsicle!')) return pending();
        }
    }
    if (state.phase === 'effect') {
        if (state.name === 'fireball') return explodeSpell(game.u.ux, game.u.uy, 'fire', d(6, 6), D, { wand: true });
        if (state.name === 'sleep') {
            D.observeHeroRayResistance('sleep', state.resistant);
            if (!state.resistant) fallAsleep(-rnd(50), true, D.stopHeroOccupation);
            state.phase = 'learn';
        } else {
            D.observeHeroElementResistance('cold', state.resistant);
            state.phase = 'inventory';
        }
    }
    if (state.phase === 'inventory') {
        if (!D.heroColdInventoryDamage(state.inventory ??= { original: state.original })) return pending();
        state.phase = 'learn';
    }
    if (state.phase === 'learn') {
        if (state.item) D.learnRayItem(state.item, state.name);
        state.phase = state.name === 'sleep' ? 'done' : 'damage';
    }
    if (state.phase === 'damage') {
        state.phase = 'done';
        if (!state.resistant) {
            const amount = state.item ? D.maybeHalfPhysicalDamage(state.original) : state.original;
            const messages = [], result = D.damageHero(messages, amount,
                `zapped ${game.flags?.female ? 'herself' : 'himself'} with a ${state.item ? `wand of ${state.name}` : 'spell'}`);
            if (!D.publishDamageResult(messages, result)) return pending();
        }
    }
    return { published: true, messages: [] };
}

async function castSpellBeamDispatch(spell, dir, D) {
    const name = spellName(spell);
    // C zap.c:weffects(): exercise(A_WIS, TRUE) precedes every beam effect.
    D.exerciseAttribute(A_WIS, true);
    if (SPELL_DIR[name] === 'ray') {
        if (name === 'dig') return spellDigBeam(spell, dir, D);
        return heroRay({ spell }, dir, D);
    }
    return spellImmediateBeam(spell, dir, D);
}

// ---------------------------------------------------------------------------
// NODIR and specially-cased spells.
// ---------------------------------------------------------------------------

// spell.c:throwspell/spelleffects. A selected location is an absolute map
// coordinate; only the swallowed case uses the all-zero self-zap direction.
export async function castSpellExplosionEffect(spell, target, D) {
    const u = game.u || {};
    const messages = [];
    if (!target) return { messages };
    let { x, y } = target;
    if (Math.max(Math.abs(x - u.ux), Math.abs(y - u.uy)) > 10)
        return { messages: ['The spell dissipates over the distance!'] };
    if (u.uswallow) {
        messages.push('The spell is cut short!');
        x = y = 0;
    } else {
        const mon = (game.level?.monsters || []).find(candidate => candidate.mx === x && candidate.my === y && !candidate.dead);
        if ((x !== u.ux || y !== u.uy) && !cansee(x, y) && !(mon && D.heroCanSpotMonster(mon))
            || IS_STWALL(game.level?.at(x, y)?.typ ?? STONE))
            return { messages: ['Your mind fails to lock onto that location!'] };
        // dothrow.c:walk_path uses strict > for its Bresenham tie break and
        // stops before the first blocked square, even if the target is seen.
        const dx = Math.abs(x - u.ux), dy = Math.abs(y - u.uy);
        const sx = x < u.ux ? -1 : 1, sy = y < u.uy ? -1 : 1;
        let px = u.ux, py = u.uy, error = 0;
        for (let step = 0; step < Math.max(dx, dy); step++) {
            let nx = px, ny = py;
            if (dx < dy) { ny += sy; error += 2 * dx; if (error > dy) { nx += sx; error -= 2 * dy; } }
            else { nx += sx; error += 2 * dy; if (error > dx) { ny += sy; error -= 2 * dx; } }
            const loc = game.level?.at(nx, ny);
            if (!loc || (!ZAP_POS(loc.typ) && !(loc.typ === DOOR && loc.doormask & D_ISOPEN))) break;
            px = nx; py = ny;
        }
        x = px; y = py;
    }
    return resumeSpellBursts({ spell, centerX: x, centerY: y, x, y,
        dz: game._last_spell_dir?.dz || 0, cutShort: !!u.uswallow, phase: 'count', output: messages }, D);
}

// spelleffects scatters after every completed blast, even the last. A nested
// done() must return before those draws or the next explosion can occur.
export async function resumeSpellBursts(state, D) {
    const pending = () => ({ published: true, pending: true, messages: [],
        afterHeroDamage: { kind: 'spellBursts', state } });
    while (!game.gameover) {
        while (state.output.length) if (!D.say(state.output.shift())) return pending();
        if (D.waiting()) return pending();
        if (state.phase === 'count') {
            if (state.cutShort) D.exerciseAttribute(A_WIS, false);
            state.count = rnd(8) + 1; state.index = 0; state.phase = 'blast';
        }
        if (state.phase === 'blast' || state.phase === 'child') {
            let result;
            if (state.phase === 'child') {
                result = state.child.kind === 'spellExplosion'
                    ? await resumeSpellExplosion(state.child.state, D)
                    : await resumeSelfZap(state.child.state, D);
            } else if (!state.x && !state.y && !state.dz) {
                result = await resumeSelfZap({ name: spellName(state.spell), phase: 'init' }, D);
            } else {
                result = await explodeSpell(state.x, state.y, spellName(state.spell) === 'fireball' ? 'fire' : 'cold',
                    spellDamageBonus(Math.trunc((game.u.ulevel || 1) / 2) + 1), D);
            }
            if (result.pending) {
                state.child = result.afterHeroDamage; state.phase = 'child'; return pending();
            }
            state.child = null; state.phase = 'scatter';
        }
        if (state.phase === 'scatter') {
            state.x = state.centerX + rnd(3) - 2;
            state.y = state.centerY + rnd(3) - 2;
            if (state.x < 1 || state.x >= COLNO || state.y < 0 || state.y >= ROWNO || !cansee(state.x, state.y)
                || IS_STWALL(game.level?.at(state.x, state.y)?.typ ?? STONE) || game.u.uswallow) {
                state.x = state.centerX; state.y = state.centerY;
            }
            game._last_spell_dir = { dx: state.x, dy: state.y, dz: state.dz };
            if (++state.index >= state.count) return { published: true, messages: [] };
            state.phase = 'blast';
        }
    }
    return { published: true, messages: [] };
}

// C ref: detect.c:findit() via zap.c:zapnodir() case SPE_DETECT_UNSEEN.
function spellDetectUnseenEffect(D) {
    const ux = game.u?.ux || 0;
    const uy = game.u?.uy || 0;
    let found = false;
    const messages = [];
    for (let r = 1; r < BOLT_LIM; r++) {
        for (let z = 0; z < 8; z++) {
            const x = ux + xdir[z] * r;
            const y = uy + ydir[z] * r;
            if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) continue;
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (loc.typ === SDOOR) {
                loc.typ = DOOR;
                loc.doormask = D_CLOSED | (loc.doormask & D_TRAPPED);
                newsym(x, y);
                found = true;
            } else if (loc.typ === SCORR) {
                loc.typ = CORR;
                newsym(x, y);
                found = true;
            }
        }
    }
    for (const trap of game.level?.traps || []) {
        if (!trap || trap.tseen) continue;
        const dist = Math.max(Math.abs(trap.tx - ux), Math.abs(trap.ty - uy));
        if (dist > 0 && dist < BOLT_LIM) {
            trap.tseen = true;
            newsym(trap.tx, trap.ty);
            found = true;
        }
    }
    messages.push(found ? 'You find a hidden passage.' : 'You don\'t find anything.');
    return { messages };
}

// C ref: potion.c:peffect_monster_detection() + detect.c:monster_detect().
function spellDetectMonstersEffect(spell, D) {
    const messages = [];
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const monsters = (game.level?.monsters || []).filter(mon =>
        mon && !mon.dead && (mon.mhp ?? 1) > 0 && mon.mx != null);
    if (blessed) {
        // C: spell path uses rn1(40, 21) for the detection timeout.
        const current = game.u?._detectMonstersTimeout || 0;
        const incr = current >= 300 ? 1 : rn1(40, 21);
        if (game.u) game.u._detectMonstersTimeout = current + incr;
        if (!monsters.length) {
            messages.push('You feel lonely.');
            return { messages };
        }
    }
    if (!monsters.length) {
        messages.push(D.heroIsHallucinating() ? 'You get the heebie jeebies.' : 'You feel threatened.');
        return { messages };
    }
    game._detect_monsters_display = 1;
    messages.push('You sense the presence of monsters.');
    D.exerciseAttribute(A_WIS, true); // C detect.c:monster_detect() tail
    if (blessed) {
        // C: blessed detection is persistent — plain map display, no browse_map.
        return { messages, more: true };
    }
    return { messages, detectMonstersMore: true };
}

// C ref: potion.c:peffect_object_detection() + detect.c:object_detect(cls=0).
function spellDetectTreasureEffect(spell, D) {
    const messages = [];
    const found = D.collectDetectedObjects(() => true);
    if (found.remote.length) {
        for (const entry of found.remote)
            if (entry.monster && D.isGoldObject(entry.target, false)) rnd(10);
        D.markDetectedObjects(found.remote);
        messages.push('You detect the presence of objects.');
        D.exerciseAttribute(A_WIS, true); // C detect.c:object_detect() tail
        return { messages, more: true };
    }
    if (found.here.length) {
        messages.push('You sense objects nearby.');
        D.exerciseAttribute(A_WIS, true);
        return { messages };
    }
    messages.push('You feel a lack of something.');
    return { messages };
}

// C ref: read.c:seffect_remove_curse() (spell branch: never confused/cursed).
function spellRemoveCurseEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const messages = [D.removeCurseFeelingMessage(false)];
    const paymentMessages = [];
    for (const obj of game.inventory || []) {
        if (!obj || obj.cls === 'coin' || obj.glyph === '$') continue;
        if (!blessed && !D.removeCurseActiveTarget(obj)) continue;
        if (obj.cursed) {
            const payment = D.costlyUncurseWater(obj);
            if (payment) paymentMessages.push(payment);
            obj.cursed = false;
            D.normalizeUncursedWaterPotion(obj);
            D.refreshInventoryLineAfterBucChange(obj);
        }
    }
    messages.push(...paymentMessages);
    if (D.heroIsPunished()) D.unpunishHero();
    D.breakBuriedBallChain();
    return { messages };
}

// C ref: read.c:seffect_identify() (spell branch: is_scroll=FALSE, already_known).
function spellIdentifyEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    if (!(game.inventory || []).length)
        return { messages: ["You're not carrying anything to be identified."] };
    let identifyLimit = 1;
    if (blessed || !rn2(5)) {
        identifyLimit = rn2(5);
        if (identifyLimit === 1 && blessed && (game.u?.uluck || 0) + (game.u?.moreluck || 0) > 0) identifyLimit++;
    }
    return { messages: [], identifyLimit };
}

// C ref: read.c:seffect_taming() (SPE_CHARM_MONSTER routes through seffects).
function spellCharmMonsterEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const pseudo = { blessed, cursed: false };
    let candidates = 0;
    let results = 0;
    let visibleResults = 0;
    const seen = new Set();
    for (const mon of game.level?.monsters || []) {
        if (!mon || mon.dead || (mon.mhp ?? 1) <= 0 || mon.mx == null || mon.my == null) continue;
        if (Math.max(Math.abs(mon.mx - (game.u?.ux || 0)), Math.abs(mon.my - (game.u?.uy || 0))) > 1) continue;
        if (seen.has(mon)) continue;
        seen.add(mon);
        candidates++;
        const res = D.tameMonsterWithScroll(mon, pseudo);
        results += res;
        if (D.visibleMonsterForScroll(mon)) visibleResults += res;
    }
    if (game.u?.usteed && !seen.has(game.u.usteed)) {
        candidates++;
        const res = D.tameMonsterWithScroll(game.u.usteed, pseudo);
        results += res;
        if (D.visibleMonsterForScroll(game.u.usteed)) visibleResults += res;
    }
    if (!results)
        return { messages: [`Nothing interesting ${candidates ? 'seems to happen' : 'happens'}.`] };
    return { messages: [`The neighborhood ${visibleResults ? 'is' : 'seems'} ${results < 0 ? 'un' : ''}friendlier.`] };
}

// C ref: read.c:seffect_confuse_monster() (spell: incr base 0 vs scroll 3).
function spellConfuseMonsterEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const nonHuman = !!game.u?._polyself_form && game.u._polyself_form.mlet !== 'human';
    if (nonHuman) {
        const wasConfused = D.heroIsConfused();
        D.addHeroConfusion(rnd(100));
        return { messages: [wasConfused ? '' : 'You feel confused.'].filter(Boolean) };
    }
    if (D.heroIsConfused()) {
        if (blessed) {
            D.clearHeroConfusion();
            return { messages: ['A red glow surrounds your head.'] };
        }
        D.addHeroConfusion(rnd(100));
        return { messages: ['Your hands begin to glow purple.'] };
    }
    let increment = 0; // C: 0 for spell, 3 for scroll
    const existing = game.u?.umconf || 0;
    let message;
    if (blessed) {
        message = `Your hands glow ${existing ? 'an even more' : 'a'} brilliant red.`;
        increment += rn1(8, 2);
    } else {
        message = existing
            ? 'The red glow of your hands intensifies.'
            : 'Your hands begin to glow red.';
        increment += rnd(2);
    }
    if (existing >= 40) increment = 1;
    if (game.u) {
        game.u.umconf = existing + increment;
        D.addHeroStatusSuffix('Glow');
    }
    return { messages: [message] };
}

// C ref: read.c:seffect_create_monster() (spell: never confused/cursed).
async function spellCreateMonsterEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const count = 1 + ((blessed || rn2(73)) ? 0 : rnd(4));
    for (let i = 0; i < count; i++) {
        const mon = await makemon(null, game.u?.ux || 0, game.u?.uy || 0, 0);
        if (!mon) continue;
        newsym(mon.mx, mon.my);
    }
    return { messages: [] };
}

// C ref: potion.c:peffect_speed() — spell path skips heal_legs/intrinsic.
function spellHasteSelfEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const duration = rn1(10, 100 + 60 * (blessed ? 1 : 0));
    // C potion.c:speed_up()
    const fast = !!game.u?.fast;
    const veryFast = !!(game.u?.veryfast || (game.u?._veryfastTimeout || 0) > 0);
    const messages = [!veryFast
        ? `You are suddenly moving ${fast ? '' : 'much '}faster.`
        : 'Your legs get new energy.'];
    D.exerciseAttribute(A_DEX, true);
    if (game.u) {
        game.u._veryfastTimeout = (game.u._veryfastTimeout || 0) + duration;
        D.syncHeroSpeedState();
    }
    return { messages };
}

// C ref: potion.c:peffect_levitation() + trap.c:float_up().
function spellLevitationEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const messages = [];
    const already = !!(game.u?.levitating || game.u?.levitation
        || (game.u?._levitationTimeout || 0) > 0);
    if (!already) {
        if (game.u) {
            game.u._levitationTimeout = 1; // C float_up() kludge: timeout 1 first
            game.u.levitation = true;
            game.u.levitating = true;
        }
        messages.push('You start to float up.');
    }
    if (blessed) {
        if (game.u) {
            game.u._levitationTimeout = (game.u._levitationTimeout || 0) + rn1(50, 250);
            game.u._levitationAtWill = 1; // C HLevitation |= I_SPECIAL
        }
    } else if (game.u) {
        game.u._levitationTimeout = (game.u._levitationTimeout || 0) + rn1(140, 10);
    }
    return { messages };
}

// C ref: potion.c:peffect_restore_ability() (spell: no level restoration).
function spellRestoreAbilityEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const u = game.u || {};
    const messages = [`Wow!  This makes you feel ${!blessed ? 'good' : D.unfixableTroubleCount() ? 'better' : 'great'}!`];
    let i = rn2(6); // C: start at a random attribute
    const base = u.abase?.a || [];
    const max = u.amax?.a || [];
    for (let ii = 0; ii < 6; ii++) {
        const lim = max[i] ?? base[i] ?? 10;
        if ((base[i] ?? 10) < lim) {
            base[i] = lim;
            if (u.acurr?.a && (u.acurr.a[i] ?? 0) < lim) u.acurr.a[i] = lim;
            if (!blessed) break;
        }
        if (++i >= 6) i = 0;
    }
    return { messages };
}

// C ref: potion.c:peffect_invisibility() (is_spell branch).
function spellInvisibilityEffect(spell, D) {
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    const u = game.u || {};
    const messages = [];
    if (D.heroBlockedInvisByMummyWrapping()) {
        messages.push(`You feel rather itchy under your ${D.mummyWrappingName()}.`);
        return { messages };
    }
    const alreadyInvis = u.invisible || D.heroIsBlind() || D.heroBlocksInvis();
    if (!alreadyInvis) {
        messages.push(D.heroIsHallucinating()
            ? `Far out, man!  You ${u.seeInvisible ? 'can see right through yourself' : 'can\'t see yourself'}.`
            : `Gee!  All of a sudden, you ${u.seeInvisible ? 'can see right through yourself' : 'can\'t see yourself'}.`);
    }
    if (blessed && !rn2(u.invisible ? 15 : 30)) {
        if (game.u) {
            game.u.invisible = true; // C HInvis |= FROMOUTSIDE (permanent)
            game.u._invisPermanent = 1;
        }
    } else if (game.u) {
        game.u.invisible = true;
        game.u._invisTimeout = (game.u._invisTimeout || 0) + d(6 - 3 * (blessed ? 1 : 0), 100) + 100;
    }
    newsym(u.ux || 0, u.uy || 0);
    return { messages };
}

// C ref: spell.c:spelleffects() case SPE_CURE_BLINDNESS: healup(0,0,FALSE,TRUE).
function spellCureBlindnessEffect(D) {
    const cure = D.healHero(0, 0, { cureBlind: true });
    return { messages: cure ? [cure] : [] };
}

// C ref: spell.c:spelleffects() case SPE_CURE_SICKNESS.
function spellCureSicknessEffect(D) {
    const wasSick = D.heroIsSick();
    const wasSlimed = D.heroIsSlimed();
    const cure = D.healHero(0, 0, { cureSick: true });
    const messages = cure ? [cure] : [];
    if (wasSick || !wasSlimed) messages.push(`You are ${wasSick ? 'no longer' : 'not'} ill.`);
    if (wasSlimed) {
        D.clearHeroSlime();
        messages.push('The slime disappears!');
    }
    return { messages };
}

// C ref: dog.c:make_familiar((struct obj *) 0, u.ux, u.uy, FALSE).
async function spellCreateFamiliarEffect(spell, D) {
    let data = null;
    if (!rn2(3)) {
        data = monsterByRndName(D.rolePetTypeName()); // C pet_type()
    } else {
        const skill = D.spellRoleSkillLevel(spell);
        const max = 3 * Math.max(skill, 1);
        data = D.rndmonstAdj(0, max); // C rndmonst_adj(0, 3 * P_SKILL(skill))
        if (!data) return { messages: ['There seems to be nothing available for a familiar.'] };
    }
    if (!data) return { messages: ['There seems to be nothing available for a familiar.'] };
    const mon = await makemon(data, game.u?.ux || 0, game.u?.uy || 0,
        MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG);
    if (!mon) return { messages: [] };
    newsym(mon.mx, mon.my);
    return { messages: [] };
}

// C ref: detect.c:do_vicinity_map() — clairvoyance maps a 19x11 area.
function spellClairvoyanceEffect(spell, D) {
    if (D.heroBlocksClairvoyance())
        return { messages: ['You sense a pointy hat on top of your head.'] };
    const blessed = D.spellRoleSkillLevel(spell) >= P_SKILLED;
    D.clairvoyanceMapEffect(blessed);
    return { messages: [] };
}

// C ref: spell.c:cast_protection().
function spellProtectionEffect(spell, D) {
    const u = game.u || {};
    const messages = [];
    let l = u.ulevel || 1;
    let loglev = 0;
    while (l) {
        loglev++;
        l = Math.trunc(l / 2);
    }
    let natac = (u.uac ?? 10) + (u.uspellprot || 0);
    natac = Math.trunc((10 - natac) / 10);
    const gain = loglev - Math.trunc((u.uspellprot || 0) / (4 - Math.min(3, natac)));
    if (gain > 0) {
        if (!D.heroIsBlind()) {
            if (u.uspellprot) {
                messages.push('The golden haze around you becomes more dense.');
            } else {
                messages.push(`The ${D.heroProtectionAtmosphere()} around you begins to shimmer with a golden haze.`);
            }
        }
        u.uspellprot = (u.uspellprot || 0) + gain;
        findAc();
        u.uspmtime = D.spellRoleSkillLevel(spell) >= 4 ? 20 : 10;
        if (!u.usptime) u.usptime = u.uspmtime;
    } else {
        messages.push('Your skin feels warm for a moment.');
    }
    return { messages };
}

// C read.c:seffects(): if (objects[otyp].oc_magic) exercise(A_WIS, TRUE) —
// scroll-like spells; zap.c:weffects(): exercise(A_WIS, TRUE) — the NODIR
// wand-like spells reach zapnodir() through weffects().  peffects() has no
// entry exercise.
const SEFFECTS_SPELLS = new Set([
    'remove curse', 'confuse monster', 'detect food', 'cause fear',
    'identify', 'charm monster', 'magic mapping', 'create monster',
]);
const WEFFECTS_NODIR_SPELLS = new Set(['light', 'detect unseen']);

// ---------------------------------------------------------------------------
// Public entry: spell that does not ask for a direction.
// ---------------------------------------------------------------------------
export async function castSpellNodirEffect(spell, D) {
    const name = spellName(spell);
    if (SEFFECTS_SPELLS.has(name) || WEFFECTS_NODIR_SPELLS.has(name))
        D.exerciseAttribute(A_WIS, true);
    switch (name) {
    case 'light': {
        // C zapnodir lights the room before lightdamage harms a gremlin.
        const messages = [];
        D.lightScrollLitroom(true, { blessed: false, cursed: false }, messages);
        await lightDamageHero(spell, 5, messages, { damageHero: D.damageHero, halfPhysical: D.maybeHalfPhysicalDamage });
        return { messages, fatal: !!messages.fatal, lifeSaving: !!messages.lifeSaving,
            genocideDeathArmed: !!messages.genocideDeathArmed };
    }
    case 'chain lightning': return resumeChainLightning({}, D);
    case 'detect unseen': return spellDetectUnseenEffect(D);
    case 'detect monsters': return spellDetectMonstersEffect(spell, D);
    case 'detect treasure': return spellDetectTreasureEffect(spell, D);
    case 'detect food': {
        const result = D.foodDetectionScrollEffect({
            blessed: D.spellRoleSkillLevel(spell) >= P_SKILLED,
            cursed: false,
        });
        return { messages: [result.message], more: !!result.more };
    }
    case 'remove curse': return spellRemoveCurseEffect(spell, D);
    case 'identify': return spellIdentifyEffect(spell, D);
    case 'charm monster': return spellCharmMonsterEffect(spell, D);
    case 'confuse monster': return spellConfuseMonsterEffect(spell, D);
    case 'create monster': return spellCreateMonsterEffect(spell, D);
    case 'haste self': return spellHasteSelfEffect(spell, D);
    case 'levitation': return spellLevitationEffect(spell, D);
    case 'restore ability': return spellRestoreAbilityEffect(spell, D);
    case 'invisibility': return spellInvisibilityEffect(spell, D);
    case 'cure blindness': return spellCureBlindnessEffect(D);
    case 'cure sickness': return spellCureSicknessEffect(D);
    case 'create familiar': return spellCreateFamiliarEffect(spell, D);
    case 'clairvoyance': return spellClairvoyanceEffect(spell, D);
    case 'protection': return spellProtectionEffect(spell, D);
    case 'magic mapping': return D.magicMappingSpellEffect(spell);
    case 'jumping':
        // C apply.c:jump() prompts for a position; cmd.js drives the cursor.
        return { startJump: Math.max(D.spellRoleSkillLevel(spell), 1) };
    default:
        return { castFallback: true };
    }
}
