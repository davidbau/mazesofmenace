// hack.c:pooleffects and trap.c:drown. UI prompts suspend at the same
// points as C; the continuation contains data so it can survive saving.
import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { xdir, ydir } from './const.js';

// trap.c:water_damage_chain shares its acid feedback counters with nested
// chains, which clear them on return rather than restoring the outer values.
export function waterDamageChain(objects, messages, D, g = game) {
    if (!objects.length) return;
    g._water_acid_context = { known: 0, unknown: 0, valid: true };
    for (const obj of [...objects]) waterDamageObject(obj, messages, D, false, g);
    g._water_acid_context = { known: 0, unknown: 0, valid: false };
}

export function waterDamageObject(obj, messages, D, force = false, g = game) {
    if (!obj) return 0;
    if (D.splash(obj, messages)) return 2;
    const info = D.describe(obj);
    const carried = g.inventory.includes(obj);
    const verb = (singular, plural) => info.plural ? plural : singular;
    let acidDescribed = false;
    if (info.kind === 'can of grease' && obj.spe > 0) return 0;
    if (info.kind === 'towel' && (obj.spe || 0) < 7) {
        const old = obj.spe || 0;
        obj.spe = old + rnd(7 - old);
        obj.wetness = obj.spe;
        if (carried) messages.push(`Your ${info.name} gets ${obj.spe < 3 ? (old ? 'damper' : 'damp') : (old ? 'wetter' : 'wet')}.`);
        D.update(obj);
        return 0;
    }
    if (obj.greased) {
        if (rn2(2)) return 1;
        obj.greased = false;
        if (carried) {
            messages.push(`The grease on your ${info.name} washes off.`);
            acidDescribed = true;
            D.update(obj);
        }
        if (!info.acid) return 1;
    } else if (info.container && (!info.waterproof || (obj.cursed && !rn2(3)))) {
        if (carried) messages.push(`Some ${D.liquidName()} gets into your ${info.name}!`);
        waterDamageChain(D.contents(obj), messages, D, g);
        return 2;
    } else if (info.waterproof) {
        if (carried && !g.u.blind && !g.u.uinwater) {
            messages.push(`The ${D.liquidName()} cannot get into your ${info.name}.`);
            D.discoverContainer(obj);
        }
        return 2;
    } else if (!force && (g.u.uluck || 0) + (g.u.moreluck || 0) + 5 > rn2(20)) return 0;

    if (info.acid) {
        if (g.u.blind && !carried) obj.dknown = false;
        const context = g._water_acid_context;
        const key = obj.dknown ? 'known' : 'unknown';
        const repeated = context?.valid && context[key] > 0;
        if (acidDescribed) messages.push(`The potion${info.plural ? 's explode' : ' explodes'}!`);
        else messages.push(`${repeated ? (info.plural ? 'More' : 'Another') : (info.plural ? 'Some' : 'A')} ${D.acidName(obj)} ${verb('explodes', 'explode')}!`);
        if (context?.valid) context[key]++;
        D.destroy(obj);
        return 3;
    }
    if (info.cls === 'scroll' || info.cls === 'spellbook') {
        if (info.bookOfDead) {
            if (D.visible(obj)) messages.push(`Steam rises from the ${info.name}.`);
            return 0;
        }
        if (info.blank || info.mail) return 0;
        if (carried) messages.push(`Your ${info.name} ${verb('fades', 'fade')}.`);
        D.blank(obj, info.cls);
        obj.dknown = false;
        if (info.cls === 'scroll') obj.spe = 0;
        D.update(obj);
        return 2;
    }
    if (info.cls === 'potion') {
        if (obj.odiluted) {
            if (carried) messages.push(`Your ${info.name} ${verb('dilutes', 'dilute')} further.`);
            D.diluteToWater(obj);
        } else if (!info.water) {
            if (carried) messages.push(`Your ${info.name} ${verb('dilutes', 'dilute')}.`);
            obj.odiluted = 1;
        } else return 0;
        D.update(obj);
        return 2;
    }
    return D.rust(obj, messages) ? 2 : 0;
}

export async function emergencyDisrobe(D, g = game) {
    let count = g.inventory.length;
    let lost = false;
    while (D.nearCapacity() > (g.u.uball ? 0 : 1)) {
        let selected = null;
        if (count > 0) {
            let mark = rn2(count);
            for (const obj of g.inventory) {
                if (D.canEmergencyDrop(obj)) selected = obj;
                if (--mark < 0 && selected) break;
            }
        }
        if (!selected) return { success: false, lost };
        await D.dropObject(selected);
        lost = true;
        count--;
    }
    return { success: true, lost };
}

export async function waterLandingEffects(D, { newspot = true, resume = false, deferCrawl = false } = {}, g = game) {
    const messages = [];
    let props = D.properties();
    const u = g.u;
    const result = extra => ({ messages, relocated: false, ...extra });
    const continuation = resume ? g._water_continuation : null;
    let phase = continuation?.phase || 'enter';
    let deathAttempts = continuation?.deathAttempts || 0;

    if (phase === 'afterCrawlMessages') {
        messages.push(continuation.pages.shift());
        if (continuation.pages.length) return result({ pending: true });
        g._water_continuation = null;
        const landing = await D.relocate(continuation.x, continuation.y, messages, false);
        return result({ ...landing, relocated: true });
    }

    if (phase === 'afterDismountDamage') {
        g._water_continuation = null;
        const dismount = await D.dismount(messages, true);
        return result({ ...dismount, relocated: !dismount.pending });
    }

    if (phase === 'enter') {
        if (u.uinwater) {
            let leaving = true;
            if (!D.isPool(u.ux, u.uy)) {
                if (props.waterLevel) messages.push('You pop into an air bubble.');
                else messages.push(D.backOnGround(false));
            } else if (props.waterLevel) leaving = false;
            else if (props.levitating) messages.push(`You pop out of the ${D.liquidName()} like a cork!`);
            else if (props.flying) messages.push(`You fly out of the ${D.liquidName()}.`);
            else if (props.waterWalking) messages.push('You slowly rise above the surface.');
            else leaving = false;
            if (leaving) await D.setInWater(false);
        }
        if (u.ustuck || props.levitating || props.flying || !D.isPool(u.ux, u.uy))
            return result();
        if (u.usteed) {
            if (props.steedAboveWater) return result();
            const dismount = await D.dismount(messages, !!u.uinwater);
            if (dismount.pending || dismount.fatal) return result(dismount);
            if (!props.waterLevel && !props.airLevel) return result({ relocated: true });
            return result();
        }
        if (props.ceilingHider && u.uundetected) return result();
        if (props.waterWalking && !D.isWaterWall(u.ux, u.uy)) return result();
        if (!newspot && u.uinwater && props.aquatic) return result();

        D.feelWater();
        let inPoolOK = false;
        if (u.uinwater && D.isPool(u.ux - (u.dx || 0), u.uy - (u.dy || 0)) && props.aquatic) {
            if (rn2(5)) return result();
            inPoolOK = true;
        }
        if (!u.uinwater) {
            const wall = D.isWaterWall(u.ux, u.uy);
            messages.push(`You ${wall ? 'plunge' : 'fall'} into the ${D.waterbodyName()}${props.aquatic ? '.' : '!'}`);
            if (!props.swimming && !wall)
                messages.push(`You sink like ${props.hallucinating ? 'the Titanic' : 'a rock'}.`);
        }
        await D.damageInventory(messages);
        if (props.formName === 'gremlin' && rn2(3)) D.splitHero(messages);
        else if (props.formName === 'iron golem') {
            messages.push('You rust!');
            let amount = d(2, 6);
            if (props.halfPhysical) amount = Math.trunc((amount + 1) / 2);
            if (u.mhmax > amount) u.mhmax -= amount;
            const damage = await D.damageHero(amount, 'rusting away', messages);
            if (damage.fatal || damage.pending) return result(damage);
        }
        if (inPoolOK) return result();
        const leashes = (g.inventory || []).filter(obj => obj.leashmon);
        if (leashes.length) {
            messages.push(`The leash${leashes.length > 1 ? 'es slip' : ' slips'} loose.`);
            for (const leash of leashes) leash.leashmon = 0;
            for (const mon of g.level.monsters || []) mon.mleashed = false;
        }
        props = D.properties(); // rusting can rehumanize the hero.
        if (props.aquatic) {
            if (props.amphibious || props.breathless) {
                if (g.flags?.verbose !== false) messages.push("But you aren't drowning.");
                if (!props.waterLevel)
                    messages.push(props.hallucinating ? 'Your keel hits the bottom.' : 'You touch bottom.');
            }
            await D.setInWater(true);
            return result();
        }
        if (props.teleportation && !props.unaware && (props.teleportControl || rn2(3) < props.luck + 2)) {
            messages.push('You attempt a teleport spell.');
            if (props.noTeleport) messages.push('The attempted teleport spell fails.');
            else {
                g._water_continuation = { phase: 'afterTeleport', deathAttempts: 0 };
                const teleport = await D.teleport(messages);
                if (teleport.pending) return result(teleport);
                g._water_continuation = null;
                if (!D.isPool(u.ux, u.uy)) return result({ relocated: true });
            }
        }
        phase = 'afterTeleport';
    }

    if (phase === 'afterTeleport') {
        g._water_continuation = null;
        if (!D.isPool(u.ux, u.uy)) return result({ relocated: true });
        if (u.usteed) {
            const dismount = await D.dismount(messages, false);
            if (dismount.pending || dismount.fatal) return result(dismount);
            if (!D.isPool(u.ux, u.uy)) return result({ relocated: true });
        }
        D.wakeHero(messages);
        if ((g.multi || 0) >= 0 && props.moveSpeed) {
            const directions = [0, 1, 2, 3, 4, 5, 6, 7];
            for (let i = 8; i > 0; i--) {
                const j = rn2(i);
                [directions[j], directions[i - 1]] = [directions[i - 1], directions[j]];
            }
            const destination = directions.map(i => ({ x: u.ux + xdir[i], y: u.uy + ydir[i] }))
                .find(({ x, y }) => D.crawlDestination(x, y));
            if (destination) {
                const escape = props.waterLevel ? { success: true, lost: false } : await emergencyDisrobe(D, g);
                messages.push(`You try to crawl out of the ${D.liquidName()}.`);
                if (escape.lost) messages.push('You dump some of your gear to lose weight...');
                if (escape.success) {
                    messages.push('Pheew!  That was close.');
                    if (deferCrawl && D.pauseBeforeCrawl(messages, destination))
                        return result({ pending: true });
                    const landing = await D.relocate(destination.x, destination.y, messages, false);
                    return result({ ...landing, relocated: true });
                }
                messages.push('But in vain.');
            }
        }
        await D.setInWater(true);
        messages.push('You drown.');
    }

    if (phase === 'afterDeath') {
        const rescue = await D.safeTeleport(messages);
        if (rescue.ok) {
            g._water_continuation = null;
            if (u.uinwater) await D.setInWater(false);
            messages.push(D.backOnGround(true));
            return result({ ...rescue, relocated: true });
        }
        messages.push("You're still drowning.");
        if (deathAttempts >= 2) {
            g._water_continuation = null;
            await D.setInWater(false);
            messages.push(D.rescuedOnWater());
            return result({ relocated: true });
        }
    }
    g._water_continuation = { phase: 'afterDeath', deathAttempts: deathAttempts + 1 };
    const death = await D.die(messages, D.waterbodyName());
    return result({ ...death, pending: true });
}
