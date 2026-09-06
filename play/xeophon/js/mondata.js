// Source: polyself.c mbodypart(), mondata.c locomotion(), hack.c u_locomotion().
// NetHack may be freely redistributed. See nethack-c/upstream/dat/license.
import { game } from './gstate.js';
import * as pm from './permonst.js';

const MONSTER_BY_NAME = new Map(pm.MONS.flatMap(mon =>
    [mon.name, ...(mon.names || [])].map(name => [name.toLowerCase(), mon])));
const PARTS = ['arm', 'eye', 'face', 'finger', 'fingertip', 'foot', 'hand', 'handed',
    'head', 'leg', 'light headed', 'neck', 'spine', 'toe', 'hair', 'blood', 'lung', 'nose', 'stomach'];
const BODY_PARTS = {
    humanoid: ["arm","eye","face","finger","fingertip","foot","hand","handed","head","leg","light headed","neck","spine","toe","hair","blood","lung","nose","stomach"],
    jelly: ["pseudopod","dark spot","front","pseudopod extension","pseudopod extremity","pseudopod root","grasp","grasped","cerebral area","lower pseudopod","viscous","middle","surface","pseudopod extremity","ripples","juices","surface","sensor","stomach"],
    animal: ["forelimb","eye","face","foreclaw","claw tip","rear claw","foreclaw","clawed","head","rear limb","light headed","neck","spine","rear claw tip","fur","blood","lung","nose","stomach"],
    bird: ["wing","eye","face","wing","wing tip","foot","wing","winged","head","leg","light headed","neck","spine","toe","feathers","blood","lung","bill","stomach"],
    horse: ["foreleg","eye","face","forehoof","hoof tip","rear hoof","forehoof","hooved","head","rear leg","light headed","neck","backbone","rear hoof tip","mane","blood","lung","nose","stomach"],
    sphere: ["appendage","optic nerve","body","tentacle","tentacle tip","lower appendage","tentacle","tentacled","body","lower tentacle","rotational","equator","body","lower tentacle tip","cilia","life force","retina","olfactory nerve","interior"],
    fungus: ["mycelium","visual area","front","hypha","hypha","root","strand","stranded","cap area","rhizome","sporulated","stalk","root","rhizome tip","spores","juices","gill","gill","interior"],
    vortex: ["region","eye","front","minor current","minor current","lower current","swirl","swirled","central core","lower current","addled","center","currents","edge","currents","life force","center","leading edge","interior"],
    snake: ["vestigial limb","eye","face","large scale","large scale tip","rear region","scale gap","scale gapped","head","rear region","light headed","neck","length","rear scale","scales","blood","lung","forked tongue","stomach"],
    worm: ["anterior segment","light sensitive cell","clitellum","setae","setae","posterior segment","segment","segmented","anterior segment","posterior","over stretched","clitellum","length","posterior setae","setae","blood","skin","prostomium","stomach"],
    spider: ["pedipalp","eye","face","pedipalp","tarsus","claw","pedipalp","palped","cephalothorax","leg","spun out","cephalothorax","abdomen","claw","hair","hemolymph","book lung","labrum","digestive tract"],
    fish: ["fin","eye","premaxillary","pelvic axillary","pelvic fin","anal fin","pectoral fin","finned","head","peduncle","played out","gills","dorsal fin","caudal fin","scales","blood","gill","nostril","stomach"],
};
const NOT_CLAWS = new Set([pm.S_HUMAN, pm.S_MUMMY, pm.S_ZOMBIE, pm.S_ANGEL,
    pm.S_NYMPH, pm.S_LEPRECHAUN, pm.S_QUANTMECH, pm.S_VAMPIRE, pm.S_ORC, pm.S_GIANT]);

function monsterForm(form) {
    const data = form?.data || form;
    if (typeof data === 'number') return pm.MONS[data];
    if (data?.m1 != null) return typeof data.mlet === 'number' ? data
        : { ...data, mlet: MONSTER_BY_NAME.get(data.name?.toLowerCase())?.mlet };
    const name = typeof data === 'string' ? data : data?.name;
    return MONSTER_BY_NAME.get(String(name || '').toLowerCase()) || pm.MONS[pm.PM_HUMAN];
}

// steed.c:can_saddle uses species anatomy for applying, creating and retaining
// saddles; the centaur exception permits its otherwise humanoid anatomy.
export function canSaddle(form) {
    const mon = monsterForm(form);
    return [pm.S_QUADRUPED, pm.S_UNICORN, pm.S_ANGEL, pm.S_CENTAUR, pm.S_DRAGON, pm.S_JABBERWOCK].includes(mon.mlet)
        && mon.size >= pm.MZ_MEDIUM && (!pm.humanoid(mon) || mon.mlet === pm.S_CENTAUR)
        && !pm.amorphous(mon) && !pm.noncorporeal(mon) && !pm.is_whirly(mon) && !pm.unsolid(mon);
}

export function bodyPart(form, part) {
    const mon = monsterForm(form);
    const index = typeof part === 'number' ? part : PARTS.indexOf(String(part).toLowerCase().replaceAll('_', ' '));
    if (index < 0 || index >= PARTS.length) return 'mystery part';
    part = PARTS[index];
    const species = mon.pm;
    const family = mon.mlet;
    const human = pm.humanoid(mon);
    if ([pm.S_DOG, pm.S_FELINE, pm.S_RODENT].includes(family) || species === pm.PM_OWLBEAR) {
        if (part === 'hand') return 'paw';
        if (part === 'handed') return 'pawed';
        if (part === 'foot') return 'rear paw';
        if (part === 'arm' || part === 'leg') return BODY_PARTS.horse[index];
    } else if (family === pm.S_YETI) {
        return BODY_PARTS.humanoid[index];
    }
    if ((part === 'hand' || part === 'handed') && human
        && mon.attacks.some(attack => attack.aatyp === pm.AT_CLAW) && !NOT_CLAWS.has(family)
        && species !== pm.PM_STONE_GOLEM && species !== pm.PM_AMOROUS_DEMON)
        return part === 'hand' ? 'claw' : 'clawed';
    if ([pm.PM_MUMAK, pm.PM_MASTODON].includes(species) && part === 'nose') return 'trunk';
    if (species === pm.PM_SHARK && part === 'hair') return 'skin';
    if ([pm.PM_JELLYFISH, pm.PM_KRAKEN].includes(species)
        && ['arm', 'finger', 'hand', 'foot', 'toe'].includes(part)) return 'tentacle';
    if (species === pm.PM_FLOATING_EYE && part === 'eye') return 'cornea';
    if (human && ['arm', 'finger', 'fingertip', 'hand', 'handed'].includes(part))
        return BODY_PARTS.humanoid[index];
    if (family === pm.S_COCKATRICE) return BODY_PARTS[part === 'hair' ? 'snake' : 'bird'][index];
    if (species === pm.PM_RAVEN) return BODY_PARTS.bird[index];
    if ([pm.S_CENTAUR, pm.S_UNICORN].includes(family) || species === pm.PM_KI_RIN
        || (species === pm.PM_ROTHE && part !== 'hair')) return BODY_PARTS.horse[index];
    if (family === pm.S_LIGHT) {
        if (part === 'handed') return 'rayed';
        return ['arm', 'finger', 'fingertip', 'hand'].includes(part) ? 'ray' : 'beam';
    }
    if (species === pm.PM_STALKER && part === 'head') return 'head';
    if (family === pm.S_EEL && species !== pm.PM_JELLYFISH) return BODY_PARTS.fish[index];
    if (family === pm.S_WORM) return BODY_PARTS.worm[index];
    if (family === pm.S_SPIDER) return BODY_PARTS.spider[index];
    if (pm.slithy(mon) || (family === pm.S_DRAGON && part === 'hair')) return BODY_PARTS.snake[index];
    if (family === pm.S_EYE) return BODY_PARTS.sphere[index];
    if ([pm.S_JELLY, pm.S_PUDDING, pm.S_BLOB].includes(family) || species === pm.PM_JELLYFISH)
        return BODY_PARTS.jelly[index];
    if (family === pm.S_VORTEX || family === pm.S_ELEMENTAL) return BODY_PARTS.vortex[index];
    if (family === pm.S_FUNGUS) return BODY_PARTS.fungus[index];
    return BODY_PARTS[human ? 'humanoid' : 'animal'][index];
}

export function locomotion(form, defaultVerb) {
    const mon = monsterForm(form);
    let verb;
    if (pm.is_floater(mon)) verb = 'float';
    else if (pm.is_flyer(mon)) verb = 'fly';
    else if (pm.slithy(mon)) verb = 'slither';
    else if (pm.amorphous(mon)) verb = 'ooze';
    else if (!mon.mmove) verb = 'wiggle';
    else if (pm.nolimbs(mon)) verb = 'crawl';
    else return defaultVerb;
    return defaultVerb[0] === defaultVerb[0].toUpperCase() ? verb[0].toUpperCase() + verb.slice(1) : verb;
}

export function heroLocomotion(defaultVerb, g = game) {
    const u = g.u;
    const capitalized = defaultVerb[0] === defaultVerb[0].toUpperCase();
    if (u?.levitating) return capitalized ? 'Float' : 'float';
    if (u?.flying) return capitalized ? 'Fly' : 'fly';
    const form = monsterForm(u?._polyself_form || u?.youmonst?.data || u?.data);
    return locomotion(form, defaultVerb);
}
