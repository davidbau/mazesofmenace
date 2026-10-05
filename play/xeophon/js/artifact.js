// Artifact invocation, from src/artifact.c and include/artilist.h.
// Command prompts and shared terrain/combat operations are supplied by cmd.js.
import { game } from './gstate.js';
import { d, rnz, rnd, rn2 } from './rng.js';
import { artifactDefinitionForName, rlocNoMsg, enextoMonsterSpot } from './mklev.js';
import { CONFLICT, LEVITATION, INVIS, W_ARTI, I_SPECIAL, TIMEOUT, In_quest, In_endgame } from './const.js';
import { pmOf } from './mhitm.js';
import { is_demon, S_IMP, MS_NEMESIS, M2_LORD, M2_PRINCE } from './permonst.js';
import { couldsee, objectLightRadius } from './vision.js';
import { artifactLight, beginBurn, endBurn, lightObjectKind } from './burn.js';

export const INVOKED_PROPERTIES = { CONFLICT: [CONFLICT, 'conflict'], LEVITATION: [LEVITATION, 'levitating'], INVIS: [INVIS, 'invisible'] };

const INVOCATIONS = new Map([
    ['Grimtooth', 'FLING_POISON'], ['Frost Brand', 'SNOWSTORM'], ['Fire Brand', 'FIRESTORM'],
    ['Demonbane', 'BANISH'], ['Sunsword', 'BLINDING_RAY'],
    ['The Orb of Detection', 'INVIS'], ['The Heart of Ahriman', 'LEVITATION'],
    ['The Sceptre of Might', 'CONFLICT'], ['The Staff of Aesculapius', 'HEALING'],
    ['The Eyes of the Overworld', 'ENLIGHTENING'], ['The Mitre of Holiness', 'ENERGY_BOOST'],
    ['The Longbow of Diana', 'CREATE_AMMO'], ['The Master Key of Thievery', 'UNTRAP'],
    ['The Platinum Yendorian Express Card', 'CHARGE_OBJ'], ['The Orb of Fate', 'LEV_TELE'],
    ['The Eye of the Aethiopica', 'CREATE_PORTAL'],
]);

export function artifactInvocation(item) {
    const identity = item?.artifact || item?.oartifact;
    const definition = artifactDefinitionForName(identity);
    return { definition, power: INVOCATIONS.get(definition?.name) || null };
}

// C artifact.c:finesse_ahriman probes the state float_down will leave.
// do.c uses this to land the dropped artifact before bringing the hero down.
export function finesseAhriman(item, D) {
    if (artifactInvocation(item).power !== 'LEVITATION') return false;
    const u = game.u;
    const prop = u.uprops?.[LEVITATION];
    if (u.BLevitation || !(prop?.extrinsic & W_ARTI)) return false;
    return !((prop.intrinsic & ~(I_SPECIAL | TIMEOUT)) || (prop.extrinsic & ~W_ARTI)
        || u._artifactInvokeBaseline?.LEVITATION || D.propertySources('LEVITATION', { ignoreTimeout: true }));
}

// C: wield.c:setuwep/ready_weapon and do_wear.c:Armor_on/off/gone.
// The caller changes equipment first; gold armor must already be worn on entry.
export function setArtifactEquipmentLight(item, on) {
    if (!item) return '';
    const name = artifactDefinitionForName(item.artifact || item.oartifact)?.name;
    const kind = lightObjectKind(item);
    const goldArmor = kind === 'gold dragon scales' || kind === 'gold dragon scale mail';
    if (name !== 'Sunsword' && !goldArmor) return '';
    if (on ? item.lamplit || !artifactLight(item) : !item.lamplit) return '';
    if (on) beginBurn(item);
    else endBurn(item, false);
    if (game.u?.blind || (game.u?._statusSuffix || '').includes('Blind')) return '';
    const plural = kind === 'gold dragon scales';
    const subject = name === 'Sunsword' ? name : `${on ? 'Your' : 'The'} ${kind}`;
    if (!on) return `${subject} ${plural ? 'stop' : 'stops'} shining.`;
    const adverb = ['strangely', 'dimly', 'brightly', 'brilliantly', 'radiantly'][objectLightRadius(item)];
    return `${subject} ${plural ? 'begin' : 'begins'} to shine ${adverb}!`;
}

export function canInvokeItem(item) {
    if (!item) return false;
    if (item.artifact || item.oartifact) return true;
    const kind = String(item.actualKind || item.kind || '').toLowerCase();
    return item.unique || item.oc_unique || [
        'crystal ball', 'bell of opening', 'book of the dead',
        'candelabrum of invocation', 'amulet of yendor',
    ].includes(kind) || (kind === 'cheap plastic imitation of the amulet of yendor' && !item.known);
}

export async function openArtifactPortal(dnum, D) {
    const u = game.u;
    const dungeon = game.dungeons[dnum];
    const target = { dnum, dlevel: dungeon.depth_start >= D.depth(u.uz)
        ? dungeon.entry_lev : dungeon.dunlev_ureached };
    const messages = [];
    let blocked = D.hasAmulet() || In_endgame(u.uz) || In_endgame(target) || dnum === u.uz.dnum;
    if (!blocked) {
        for (const mon of game.level?.monsters || []) {
            if (!mon.mleashed || Math.max(Math.abs(mon.mx - u.ux), Math.abs(mon.my - u.uy)) <= 1) continue;
            const spot = enextoMonsterSpot(u.ux, u.uy, mon.data);
            if (spot) {
                const oldX = mon.mx;
                const oldY = mon.my;
                mon.mx = spot.x;
                mon.my = spot.y;
                D.newsym(oldX, oldY);
                D.newsym(mon.mx, mon.my);
            }
            if (Math.max(Math.abs(mon.mx - u.ux), Math.abs(mon.my - u.uy)) > 1) {
                const leash = (game.inventory || []).find(obj => obj.leashmon === mon.m_id);
                if (!leash || leash.cursed) { blocked = true; break; }
                mon.mleashed = false;
                leash.leashmon = 0;
                messages.push(`You feel ${(game.level.monsters.filter(other => other.mleashed).length > 1) ? 'a' : 'the'} leash go slack.`);
            }
        }
        if (u.usteed && D.monsterHasAmulet(u.usteed)) blocked = true;
    }
    if (blocked) messages.push('You feel very disoriented for a moment.');
    else {
        messages.push(D.heroIsBlind() ? 'You feel weightless for a moment.' : 'You are surrounded by a shimmering sphere!');
        D.gotoLevel(target);
    }
    return messages;
}

// C arti_invoke's property branch is synchronous until float_up/float_down.
// Returning that action lets an inventory owner await landing before transfer.
export function toggleArtifactProperty(item, D) {
    const { definition, power } = artifactInvocation(item);
    const u = game.u;
    const now = game.moves || 0;
    const messages = [];
    const result = { messages, power, time: true };
    const [id, field] = INVOKED_PROPERTIES[power];
    u.uprops ??= {};
    const prop = u.uprops[id] ??= { intrinsic: 0, extrinsic: 0 };
    const on = !(prop.extrinsic & W_ARTI);
    if (on && item.age > now) {
        messages.push(`You feel that ${definition.name.replace(/^The /, 'the ')} is ignoring you.`);
        item.age += d(3, 10);
        return result;
    }
    u._artifactInvokeBaseline ??= {};
    if (on) u._artifactInvokeBaseline[power] = !!u[field]
        && !(prop.intrinsic || (prop.extrinsic & ~W_ARTI) || D.propertySources(power));
    prop.extrinsic = (prop.extrinsic || 0) ^ W_ARTI;
    if (!on) item.age = now + rnz(100);
    const other = !!((prop.extrinsic & ~W_ARTI) || prop.intrinsic
        || u._artifactInvokeBaseline[power] || D.propertySources(power));
    u[field] = on || other;
    item._invokedProperty = on ? power : null;
    if (!on) delete u._artifactInvokeBaseline[power];
    if (other) messages.push('You feel a surge of power, but nothing seems to happen.');
    else if (power === 'CONFLICT') messages.push(on
        ? 'You feel like a rabble-rouser.' : 'You feel the tension decrease around you.');
    else if (power === 'INVIS') {
        if (u.BInvis || D.heroIsBlind()) messages.push('You feel a surge of power, but nothing seems to happen.');
        else messages.push(on ? `Your body takes on a ${D.heroIsHallucinating() ? 'normal' : 'strange'} transparency...`
            : 'Your body seems to unfade...');
        D.refreshHero();
    } else Object.assign(result, { action: 'FLOAT_ARTIFACT', on });
    return result;
}

export async function invokeArtifact(item, D) {
    const touch = await D.retouch(item, artifactInvocation(item).definition);
    if (!touch.ok || touch.skip) return { messages: touch.messages || [], time: true,
        fatal: touch.fatal, lifeSaving: touch.lifeSaving, pending: touch.pending, more: touch.more };
    const result = await invokeArtifactPower(item, D);
    result.messages.unshift(...(touch.messages || []));
    return result;
}

// C arti_invoke is also called directly when losing an invoked property;
// those calls must not perform touch_artifact or retouch_object again.
export async function invokeArtifactPower(item, D) {
    const { definition, power } = artifactInvocation(item);
    const messages = [];
    const result = { messages, power, time: true };
    if (!power) {
        if (D.isCrystalBallObject(item)) result.action = 'CRYSTAL_BALL';
        else messages.push('Nothing happens.');
        return result;
    }
    const u = game.u;
    const property = ['CONFLICT', 'LEVITATION', 'INVIS'].includes(power);
    const now = game.moves || 0;
    if (property) {
        const toggle = toggleArtifactProperty(item, D);
        if (toggle.action === 'FLOAT_ARTIFACT') {
            delete toggle.action;
            Object.assign(toggle, await D.floatArtifact(toggle.on, toggle.messages));
        }
        return toggle;
    }
    if (!property) {
        if (item.age > now) {
            const cost = power === 'FLING_POISON' || power === 'BLINDING_RAY' ? 25 : -1;
            if (cost < 0 || (u.uen || 0) < cost) {
                messages.push(`You feel that ${definition.name.replace(/^The /, 'the ')} is ignoring you.`);
                item.age += d(3, 10);
                return result;
            }
            messages.push('You feel drained...');
            u.uen -= cost;
        } else item.age = now + rnz(100);
    }
    switch (power) {
    case 'HEALING': {
        const polymorphed = !!(u._polyself_base || u.Upolyd || u.upolyd);
        const hp = polymorphed ? 'mh' : 'uhp';
        const max = polymorphed ? 'mhmax' : 'uhpmax';
        const amount = Math.trunc(((u[max] || 0) + 1 - (u[hp] || 0)) / 2);
        const sick = u.sick || u._sickTimeout || u._sicknessTimeout;
        const slime = u.slimed || u._slimingTimeout;
        const blind = (u._blindTimeout || 0) > (u.ucreamed || 0);
        // Both messages are present in this C revision's invoke_healing.
        if (amount || sick || slime || blind) messages.push('You feel better.');
        if (amount || sick || slime || blind) {
            messages.push(`You feel ${!amount && !sick && !slime && u.permanentlyBlind ? 'slightly ' : ''}better.`);
        } else {
            messages.push('You feel a surge of power, but nothing seems to happen.');
            break;
        }
        if (amount > 0) u[hp] += amount;
        if (sick) D.clearHeroSickness();
        if (slime) {
            u.slimed = false;
            u._slimingTimeout = 0;
            D.removeHeroStatusSuffix('Slime');
        }
        if (blind) {
            u._blindTimeout = u.ucreamed || 0;
            u.blind = !!(u._blindTimeout || u.permanentlyBlind || u._polyself_form_blinded || D.heroHasBlindfold());
            if (!u.blind) D.removeHeroStatusSuffix('Blind');
            D.refreshVision();
        }
        break;
    }
    case 'ENERGY_BOOST': {
        let amount = Math.trunc(((u.uenmax || 0) + 1 - (u.uen || 0)) / 2);
        if (amount > 120) amount = 120;
        else if (amount < 12) amount = (u.uenmax || 0) - (u.uen || 0);
        if (amount) {
            u.uen += amount;
            messages.push('You feel re-energized.');
        } else messages.push('You feel a surge of power, but nothing seems to happen.');
        break;
    }
    case 'CREATE_AMMO': {
        const arrows = D.createArrows();
        arrows.blessed = !!item.blessed;
        arrows.cursed = !!item.cursed;
        arrows.bknown = item.bknown;
        arrows.oeroded = arrows.oeroded2 = 0;
        if (item.blessed) {
            arrows.spe = Math.max(0, arrows.spe || 0);
            arrows.quan += rnd(10);
        } else if (item.cursed) arrows.spe = Math.min(0, arrows.spe || 0);
        else arrows.quan += rnd(5);
        D.holdArrows(arrows, messages);
        break;
    }
    case 'BANISH': {
        const hell = (game.dungeons || []).findIndex(dungeon => dungeon.dname === 'Gehennom' || dungeon.name === 'Gehennom');
        const inHell = !!game.dungeons?.[u.uz?.dnum]?.flags?.hellish
            || game.dungeons?.[u.uz?.dnum]?.hellish || u.uz?.dnum === hell;
        let vanished = 0;
        let stayed = 0;
        for (const mon of [...(game.level?.monsters || [])]) {
            if (mon.dead || mon.mhp <= 0 || !mon.mx || !couldsee(mon.mx, mon.my)) continue;
            const species = pmOf(mon) || mon.data || {};
            if (!is_demon(species) && species.mlet !== S_IMP) continue;
            if (species.sound === MS_NEMESIS) continue;
            let chance = 1;
            if (In_quest(u.uz) && !game.quest_status?.killed_nemesis) chance += 10;
            if (species.m2 & M2_PRINCE) chance += 2;
            if (species.m2 & M2_LORD) chance++;
            mon.msleeping = mon.mtame = mon.mpeaceful = 0;
            mon.pet = false;
            if (chance <= 1 || !rn2(chance)) {
                if (inHell) rlocNoMsg(mon);
                else {
                    vanished++;
                    const target = { dnum: hell, dlevel: rn2(game.dungeons?.[hell]?.num_dunlevs || 1) };
                    D.migrateMonster(mon, target, mon.mx, mon.my);
                }
            } else stayed++;
        }
        if (vanished) messages.push(`${stayed ? vanished > stayed ? 'Most of the' : 'Some of the' : 'The'} demon${vanished > 1 ? 's disappear' : ' disappears'} in a cloud of brimstone!`);
        break;
    }
    default:
        result.action = power;
        break;
    }
    return result;
}
