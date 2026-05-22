import { game } from './gstate.js';
import { makemon, set_malign } from './mklev.js';
import { newsym } from './display.js';
import {
    CORPSTAT_FEMALE, CORPSTAT_GENDER, CORPSTAT_MALE,
    IS_OBSTRUCTED, IS_TREE, MM_EDOG, MM_FEMALE, MM_IGNOREWATER,
    MM_MALE, MM_NOMSG, NO_MINVENT, isok,
} from './const.js';
import { rn2, rnd } from './rng.js';

const FIGURINE = 795;
const BOULDER = 465;

export function isFigurineObject(obj) {
    const kind = String(obj?.actualKind || obj?.kind || '').toLowerCase();
    return obj?.otyp === FIGURINE || kind === 'figurine';
}

export function attachFigurineTransformTimeout(figurine, delay = null) {
    if (!isFigurineObject(figurine) || !figurine.corpsenm) return false;
    const when = delay ?? (rnd(9000) + 200);
    figurine.figurineTransformTurn = (game.moves || 1) + when;
    figurine._figurine_transform_seq = game._fig_transform_timer_seq =
        (game._fig_transform_timer_seq || 0) + 1;
    return true;
}

export function stopFigurineTransformTimeout(figurine) {
    if (!figurine) return;
    delete figurine.figurineTransformTurn;
    delete figurine._figurine_transform_seq;
}

export function maybeAttachCarriedFigurineTimeout(figurine) {
    if (!isFigurineObject(figurine) || !figurine.cursed || !figurine.corpsenm) return false;
    if ((game._genocided_monsters || []).includes(figurine.corpsenm.name)) return false;
    return attachFigurineTransformTimeout(figurine);
}

export function syncCarriedFigurineTransformTimer(figurine) {
    if (!isFigurineObject(figurine)) return false;
    if (!figurine.cursed || figurine.blessed || !figurine.corpsenm
        || (game._genocided_monsters || []).includes(figurine.corpsenm.name)) {
        stopFigurineTransformTimeout(figurine);
        return false;
    }
    return attachFigurineTransformTimeout(figurine);
}

export function figurineLocationCheck(figurine, x, y) {
    if (!isok(x, y)) return { ok: false, message: 'You cannot put the figurine there.' };
    const loc = game.level?.at?.(x, y);
    const data = figurine?.corpsenm || {};
    const mayPassRock = !!data.passWalls;
    if (IS_OBSTRUCTED(loc?.typ) && !mayPassRock) {
        return {
            ok: false,
            message: `You cannot place a figurine in ${IS_TREE(loc?.typ) ? 'a tree' : 'solid rock'}!`,
        };
    }
    const boulder = (game.level?.objects || []).some(obj => obj.otyp === BOULDER && obj.ox === x && obj.oy === y);
    if (boulder && !data.passWalls && !data.throwsRocks)
        return { ok: false, message: 'You cannot fit the figurine on the boulder.' };
    return { ok: true };
}

function ensurePetExtension(mon) {
    mon.mextra ??= {};
    mon.mextra.edog ??= {
        apport: 3,
        hungrytime: Math.max(game.moves || 1, 1) + 1000,
        dropdist: 10000,
        whistletime: 0,
        ogoal: { x: 0, y: 0 },
    };
}

function figurineBaseTameness(mon) {
    const name = String(mon.data?.name || mon.name || '').toLowerCase();
    const mlet = mon.data?.mlet || mon.mlet;
    return mlet === 'dog' || mlet === 'feline' || mlet === 'unicorn'
        || ['little dog', 'dog', 'large dog', 'kitten', 'housecat', 'large cat', 'pony', 'horse', 'warhorse'].includes(name)
        ? 10 : 5;
}

function figurineGenderFlags(figurine) {
    const gender = (figurine?.spe || 0) & CORPSTAT_GENDER;
    if (gender === CORPSTAT_FEMALE) return MM_FEMALE;
    if (gender === CORPSTAT_MALE) return MM_MALE;
    return 0;
}

export async function makeFigurineFamiliar(figurine, x, y, { quietly = false } = {}) {
    const data = figurine?.corpsenm;
    if (!data || (game._genocided_monsters || []).includes(data.name))
        return { mon: null, message: quietly ? '' : 'The figurine writhes and then shatters into pieces!' };

    const mon = await makemon(data, x, y, MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG | figurineGenderFlags(figurine));
    if (!mon)
        return { mon: null, message: quietly ? '' : 'The figurine writhes and then shatters into pieces!' };

    if ((figurine?.spe || 0) & CORPSTAT_GENDER) {
        const gender = figurine.spe & CORPSTAT_GENDER;
        if (gender === CORPSTAT_FEMALE) mon.female = true;
        else if (gender === CORPSTAT_MALE) mon.female = false;
    }

    let chance = rn2(10);
    if (chance > 2) chance = figurine.blessed ? 0 : !figurine.cursed ? 1 : 2;
    const badFeeling = chance === 2;
    mon.msleeping = 0;
    if (chance === 0) {
        mon.pet = true;
        mon.mtame = Math.max(mon.mtame || 0, figurineBaseTameness(mon));
        mon.mpeaceful = 1;
        mon.mflee = 0;
        mon.mfleetim = 0;
        ensurePetExtension(mon);
    } else {
        mon.pet = false;
        mon.mtame = 0;
        if (chance === 2) mon.mpeaceful = 0;
    }
    if (figurine._wish_object_name) mon.givenName = figurine._wish_object_name;
    set_malign(mon);
    newsym(mon.mx, mon.my);
    return { mon, chance, badFeeling, message: badFeeling && !quietly ? 'You get a bad feeling about this.' : '' };
}
