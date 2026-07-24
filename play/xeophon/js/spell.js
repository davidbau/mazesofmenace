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
import { d, rn1, rn2, rnd } from './rng.js';
import {
    A_DEX, A_STR, A_WIS, BOLT_LIM, COLNO, ROWNO, CORR, DOOR, D_CLOSED,
    D_LOCKED, D_NODOOR, D_TRAPPED, IS_OBSTRUCTED, IS_ROOM, IS_TREE, IS_WALL,
    Is_airlevel, Is_earthlevel, Is_waterlevel, MM_EDOG, MM_IGNOREWATER,
    MM_NOMSG, NO_MINVENT, P_SKILLED, ROOM, SCORR, SDOOR, STAIRS, STONE,
    STATUE_TRAP, W_NONDIGGABLE, ZAP_POS, xdir, ydir,
} from './const.js';
import { newsym } from './display.js';
import { couldsee } from './vision.js';
import { makemon, monsterByRndName, rlocNoMsg } from './mklev.js';

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
function spellDamageBonus(dmg) {
    const u = game.u || {};
    const intell = u.acurr?.a?.[1] ?? 10;
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
    const dex = game.u?.acurr?.a?.[2] ?? 10;
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
function spellResistDamage(mon, dmg, D) {
    const resisted = D.monsterResistsEffect(mon, game.u?.ulevel || 1);
    const applied = resisted ? Math.trunc((dmg + 1) / 2) : dmg;
    if (applied) mon.mhp = (mon.mhp ?? 1) - applied;
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
        // C: getdir cancelled, re-use previous direction (usually self).
        const prev = game._last_spell_dir || null;
        if (prev?.dz) vertical = { ...prev };
        else if (prev && (prev.dx || prev.dy)) dir = { ...prev };
        else self = true;
    }
    if (!vertical) {
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
    case 'force bolt': {
        // C zap.c:zapyourself() case SPE_FORCE_BOLT (ordinary=TRUE)
        if (D.heroHasAntimagic()) {
            push('Boing!');
        } else {
            push('You bash yourself!');
            const damage = D.maybeHalfPhysicalDamage(d(2, 12));
            D.exerciseAttribute(A_STR, false);
            const dead = D.loseHeroHp(damage,
                `zapped ${game.flags?.female ? 'herself' : 'himself'} with a spell`);
            if (dead) return { messages, fatal: true };
        }
        return { messages };
    }
    case 'magic missile': {
        if (D.heroHasAntimagic()) push('The missiles bounce!');
        else {
            const damage = D.maybeHalfPhysicalDamage(d(4, 6));
            push('Idiot!  You\'ve shot yourself!');
            const dead = D.loseHeroHp(damage,
                `zapped ${game.flags?.female ? 'herself' : 'himself'} with a spell`);
            if (dead) return { messages, fatal: true };
        }
        return { messages };
    }
    case 'sleep': {
        if (D.heroHasSleepResistance()) push('You don\'t feel sleepy!');
        else {
            push('The sleep ray hits you!');
            const sleepTime = rnd(50); // C fall_asleep(-rnd(50), TRUE)
            game._helpless_time = Math.max(game._helpless_time || 0, sleepTime);
            game._sleeping_time = Math.max(game._sleeping_time || 0, sleepTime + 1);
            game._wake_message = 'You wake up.';
            return { messages, sleepTurns: sleepTime };
        }
        return { messages };
    }
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
    if (name === 'dig') {
        if (dz < 0 || heroOnStairs()) {
            // C dig.c:zap_dig(): rock falls from the ceiling.
            if (heroOnStairs())
                messages.push('The beam bounces off the stairs and hits the ceiling.');
            messages.push('You loosen a rock from the ceiling.');
            messages.push('It falls on your head!');
            const dmg = rnd(D.heroWearsHardHelmet() ? 2 : 6);
            const dead = D.loseHeroHp(D.maybeHalfPhysicalDamage(dmg), 'falling rock');
            D.dropRockAt(x, y); // C mksobj_at(ROCK, ...) consumes next_ident()
            newsym(x, y);
            if (dead) return { messages, fatal: true };
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
            const dead = D.loseHeroHp(D.maybeHalfPhysicalDamage(dmg), 'falling rock');
            D.dropRockAt(x, y);
            newsym(x, y);
            if (dead) return { messages, fatal: true };
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
            spellResistDamage(mon, dmg, D);
        } else {
            messages.push(`The spell misses ${D.monsterTheName(mon)}.`);
        }
        return false;
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
        return false;
    }
    case 'turn undead': {
        if (D.monsterIsUndead(mon)) {
            let dmg = rnd(8);
            if (D.heroIsKnightWithQuestArtifact()) dmg *= 2;
            dmg = spellDamageBonus(dmg);
            const resisted = spellResistDamage(mon, dmg, D);
            if (!resisted && !mon.dead && (mon.mhp ?? 1) > 0) {
                // C mon.c:monflee(0, FALSE, TRUE)
                mon.mflee = 1;
                mon.mfleetim = 0;
                D.clearMonsterTrack(mon);
                if (seen) messages.push(`${D.monsterTheName(mon, true)} turns to flee.`);
            }
        }
        return false;
    }
    case 'teleport away': {
        // C teleport.c:u_teleport_mon()
        if (D.monsterIsRider(mon) && rn2(13)) rlocNoMsg(mon);
        else rlocNoMsg(mon);
        return false;
    }
    case 'cancellation': {
        D.cancelMonster(mon, seen, messages);
        return false;
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
        return true; // C bhitm() returns 1 for SPE_KNOCK
    }
    case 'wizard lock': {
        D.closeMonsterHoldingTrap(mon);
        return false;
    }
    case 'healing':
    case 'extra healing': {
        // C zap.c:bhitm() case SPE_HEALING/SPE_EXTRA_HEALING
        const extra = name === 'extra healing';
        const healamt = d(6, extra ? 8 : 4);
        if (monsterName(mon) === 'pestilence') {
            spellResistDamage(mon, Math.trunc(healamt / 2), D);
            return false;
        }
        mon.mhp = Math.min(mon.mhpmax ?? mon.mhp ?? 1, (mon.mhp ?? 1) + healamt);
        if ((skilled || extra) && (mon.blinded || mon.mblinded)) {
            mon.blinded = false;
            mon.mblinded = 0;
            if (seen) messages.push(`${D.monsterTheName(mon, true)} can see again.`);
        }
        if (seen) messages.push(`${D.monsterTheName(mon, true)} looks${extra ? ' much' : ''} better.`);
        return false;
    }
    default:
        return false;
    }
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
    return { messages };
}

// ---------------------------------------------------------------------------
// C ref: zap.c:dobuzz() — ray walk for magic missile and sleep spells.
// ---------------------------------------------------------------------------
async function spellRay(spell, dir, D) {
    const name = spellName(spell);
    const u = game.u || {};
    const messages = [];
    const ulevel = u.ulevel || 1;
    const nd = Math.trunc(ulevel / 2) + 1; // C ubuzz(BZ_U_SPELL(...), u.ulevel / 2 + 1)
    const hitBon = spellHitBonus(spell, D);
    const rayColor = name === 'sleep' ? 'bright blue' : 'white';
    const rayName = name === 'sleep' ? 'sleep ray' : 'magic missile';
    if (D.heroIsHallucinating()) rn2(6); // C dobuzz(): Hallucination ? rn2(6) : damgtype
    let range = rn1(7, 7); // C dobuzz() range
    let sx = u.ux || 0;
    let sy = u.uy || 0;
    let dx = dir.dx;
    let dy = dir.dy;
    const beamCells = [];
    let hitHero = null;

    while (range-- > 0) {
        const lsx = sx;
        const lsy = sy;
        sx += dx;
        sy += dy;
        const inBounds = sx >= 1 && sx < COLNO && sy >= 0 && sy < ROWNO;
        const loc = inBounds ? game.level?.at(sx, sy) : null;
        const typ = loc?.typ ?? STONE;
        let bounceNow = !inBounds || typ === STONE;

        if (!bounceNow) {
            beamCells.push({ x: sx, y: sy, ch: beamGlyph(dx, dy), color: rayColor });
            const mon = (game.level?.monsters || []).find(candidate =>
                candidate && !candidate.dead && (candidate.mhp ?? 1) > 0
                && candidate.mx === sx && candidate.my === sy);
            if (mon) {
                if (spellZapHit(monsterAc(mon), hitBon)) {
                    const reflection = D.monsterReflectionSource(mon);
                    if (reflection) {
                        if (D.visibleMonsterForScroll(mon)) {
                            messages.push(`The ${rayName} hits ${D.monsterTheName(mon)}.`);
                            D.recordMonsterReflectionDiscovery(reflection);
                            messages.push(`But it reflects from ${D.monsterPossessiveName(mon)} ${reflection.source}!`);
                        }
                        dx = -dx;
                        dy = -dy;
                    } else {
                        range -= 2;
                        if (name === 'sleep') {
                            // C zap.c:zhitm() ZT_SLEEP -> sleep_monst(d(nd,25))
                            const amt = d(nd, 25);
                            const resisted = D.monsterResistsSleepEffect(mon)
                                || D.monsterResistsEffect(mon, ulevel);
                            if (!resisted && mon.mcanmove !== false) {
                                mon.mcanmove = false;
                                mon.mfrozen = Math.min(127, Math.max(0, amt) + (mon.mfrozen || 0));
                                D.sleptMonster(mon);
                            }
                            if (D.visibleMonsterForScroll(mon))
                                messages.push(`The ${rayName} hits ${D.monsterTheName(mon)}.`);
                        } else {
                            const dmg = spellDamageBonus(d(nd, 6));
                            if (D.visibleMonsterForScroll(mon))
                                messages.push(`The ${rayName} hits ${D.monsterTheName(mon)}${dmg > 4 ? '!' : '.'}`);
                            spellResistDamage(mon, dmg, D);
                            if (mon.dead || (mon.mhp ?? 1) <= 0) {
                                D.killSpellBeamMonster(mon, messages);
                                break;
                            }
                            D.wakeupMonster(mon);
                        }
                    }
                } else if (D.visibleMonsterForScroll(mon)) {
                    messages.push(`The ${rayName} misses ${D.monsterTheName(mon)}.`);
                }
            } else if (sx === (u.ux || 0) && sy === (u.uy || 0) && range >= 0) {
                // C dobuzz(): beam returns to hero square.
                if (spellZapHit(u.uac ?? 10, 0)) {
                    range -= 2;
                    messages.push(`The ${rayName} hits you!`);
                    if (u.reflecting) {
                        messages.push('But it reflects from your shield!');
                        dx = -dx;
                        dy = -dy;
                    } else if (name === 'sleep') {
                        if (D.heroHasSleepResistance()) messages.push('You don\'t feel sleepy!');
                        else hitHero = { sleepTime: rnd(50) };
                    } else {
                        const dmg = D.maybeHalfPhysicalDamage(d(nd, 6));
                        const dead = D.loseHeroHp(dmg, 'killed by a magic missile');
                        if (dead) hitHero = { dead: true };
                    }
                } else {
                    messages.push(`The ${rayName} whizzes by you!`);
                }
            }
            bounceNow = !ZAP_POS(typ)
                || ((loc?.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) && range >= 0);
        }

        if (!bounceNow) continue;
        // C zap.c:make_bounce + bounce_dir()
        const bchance = (!inBounds || typ === STONE) ? 10
            : (IS_WALL(typ) && game.u?.uz?.dnum === game.mines_dnum) ? 20 : 75;
        if (--range > 0 && lsx >= 1 && lsx < COLNO && lsy >= 0 && lsy < ROWNO && couldsee(lsx, lsy))
            messages.push(`The ${rayName} bounces!`);
        if (!dx || !dy || (bchance > 0 && !rn2(bchance))) {
            dx = -dx;
            dy = -dy;
            continue;
        }
        let bounce = 0;
        const bounceLsx = sx - dx;
        const bounceLsy = sy - dy;
        const sideYLoc = sx >= 1 && sx < COLNO && bounceLsy >= 0 && bounceLsy < ROWNO
            ? game.level?.at(sx, bounceLsy) : null;
        const sideYTyp = sideYLoc?.typ ?? STONE;
        const sideYClosed = sideYLoc?.typ === DOOR && (sideYLoc.doormask & (D_CLOSED | D_LOCKED));
        if (ZAP_POS(sideYTyp) && !sideYClosed
            && (IS_ROOM(sideYTyp)
                || (sx + dx >= 1 && sx + dx < COLNO
                    && ZAP_POS(game.level?.at(sx + dx, bounceLsy)?.typ ?? STONE))))
            bounce = 1;
        const sideXLoc = bounceLsx >= 1 && bounceLsx < COLNO && sy >= 0 && sy < ROWNO
            ? game.level?.at(bounceLsx, sy) : null;
        const sideXTyp = sideXLoc?.typ ?? STONE;
        const sideXClosed = sideXLoc?.typ === DOOR && (sideXLoc.doormask & (D_CLOSED | D_LOCKED));
        if (ZAP_POS(sideXTyp) && !sideXClosed
            && (IS_ROOM(sideXTyp)
                || (sy + dy >= 0 && sy + dy < ROWNO
                    && ZAP_POS(game.level?.at(bounceLsx, sy + dy)?.typ ?? STONE)))
            && (!bounce || rn2(2)))
            bounce = 2;
        if (!bounce) {
            dx = -dx;
            dy = -dy;
        } else if (bounce === 1) {
            dy = -dy;
        } else {
            dx = -dx;
        }
    }
    if (beamCells.length && !D.heroIsBlind()) game._transient_beam_cells = beamCells;
    const result = { messages };
    if (hitHero?.sleepTime) {
        game._helpless_time = Math.max(game._helpless_time || 0, hitHero.sleepTime);
        game._sleeping_time = Math.max(game._sleeping_time || 0, hitHero.sleepTime + 1);
        game._wake_message = 'You wake up.';
        result.sleepTurns = hitHero.sleepTime;
    }
    if (hitHero?.dead) result.fatal = true;
    return result;
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
        // C: getdir cancelled — "The magical energy is released!" and the
        // previous direction is reused (usually self).
        const result = vertical
            ? await spellZapUpDown(spell, vertical.dz, D)
            : self || !dir
                ? await spellZapYourself(spell, D)
                : await castSpellBeamDispatch(spell, dir, D);
        return { ...result, released: true };
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

async function castSpellBeamDispatch(spell, dir, D) {
    const name = spellName(spell);
    // C zap.c:weffects(): exercise(A_WIS, TRUE) precedes every beam effect.
    D.exerciseAttribute(A_WIS, true);
    if (SPELL_DIR[name] === 'ray') {
        if (name === 'dig') return spellDigBeam(spell, dir, D);
        if (name === 'fireball' || name === 'cone of cold' || name === 'finger of death')
            return { castFallback: true }; // outside the covered subset
        return spellRay(spell, dir, D);
    }
    if (name === 'stone to flesh') return { castFallback: true }; // kept message-only
    if (name === 'drain life') return { castFallback: true }; // outside the covered subset
    return spellImmediateBeam(spell, dir, D);
}

// ---------------------------------------------------------------------------
// NODIR and specially-cased spells.
// ---------------------------------------------------------------------------

// C ref: zap.c:zapnodir() case SPE_LIGHT + read.c:litroom(on=TRUE).
function spellLightEffect(spell, D) {
    const messages = [];
    D.lightScrollLitroom(true, { blessed: false, cursed: false }, messages);
    // C zap.c:lightdamage(obj, TRUE, 5): only harms gremlin polyself.
    if (String(game.u?._polyself_form?.name || '').toLowerCase() === 'gremlin') {
        let dmg = rnd(5);
        if (dmg > 10) dmg = 10 + rnd(dmg - 10);
        if (dmg > 20) dmg = 20;
        messages.push(`Ow, that light hurts${dmg > 2 || (game.u?.umh || 100) <= 5 ? '!' : '.'}`);
        const dead = D.loseHeroHp(D.maybeHalfPhysicalDamage(dmg),
            `blasted ${game.flags?.female ? 'herself' : 'himself'} with a spell of light`);
        if (dead) return { messages, fatal: true };
    }
    return { messages };
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
        if (identifyLimit === 1 && blessed && (game.u?.uluck || 0) > 0) identifyLimit++;
    }
    const unidentified = D.unidentifiedInventoryItems();
    const identified = identifyLimit ? unidentified.slice(0, identifyLimit) : unidentified;
    for (const invItem of identified) D.identifyInventoryItem(invItem);
    return { messages: [], identifiedItems: identified };
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
    const cure = D.cureHeroBlindness();
    return { messages: cure ? [cure] : [] };
}

// C ref: spell.c:spelleffects() case SPE_CURE_SICKNESS.
function spellCureSicknessEffect(D) {
    const wasSick = D.heroIsSick();
    const wasSlimed = D.heroIsSlimed();
    D.clearHeroVomiting();
    D.clearHeroSickness();
    const messages = [];
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
        u.uac = (u.uac ?? 10) - gain; // C find_ac() factors spell protection in
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
    case 'light': return spellLightEffect(spell, D);
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
