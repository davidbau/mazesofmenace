// u_init_link_race_invent.js — C u_init.c u_init_race() invent tails after role pack (addinv prepend).
// C ref: u_init.c u_init_race PM_ELF `Instrument[]` / PM_ORC `ini_inv(Xtra_food)` — after u_init_role.

import { game } from './gstate.js';
import { races } from './roles.js';
import { NH5_FOOD_CLASS, NH5_TOOL_CLASS } from './nh5_objclass.js';
import { objectOcWeight } from './obj_oc_weight_data.js';

/**
 * C: u_init.c `u_init_race` PM_ELF — `Role_if(PM_CLERIC) || Role_if(PM_WIZARD)` →
 * `ROLL_FROM(trotyp)` then `ini_inv(Instrument[])` (fixed TOOL, `addinv` prepend).
 * Prepends **`g._elfIniInstrumentOtyp`** (from **`consumeUInitRaceElfInstrumentIniInvLikeC`**) onto **`g.invent`**.
 * @param {import('./gstate.js').game} [g]
 */
export function applyElfInstrumentInventTailLikeC(g = game) {
    const elfIdx = races.findIndex((r) => r.name === 'elf');
    if ((g.initrace | 0) !== elfIdx) return;
    const abbr = g.urole?.abbr ?? '';
    if (abbr !== 'Pri' && abbr !== 'Wiz') return;
    const otyp = g._elfIniInstrumentOtyp | 0;
    if (otyp <= 0) return;

    const q = 1;
    const w = objectOcWeight(otyp) || 1;
    const o = {
        otyp,
        oclass: NH5_TOOL_CLASS,
        quan: q,
        spe: 0,
        owt: Math.max(1, w * q),
        oartifact: 0,
        nobj: g.invent ?? null,
        cursed: 0,
        blessed: 0,
    };
    g.invent = o;
}

/**
 * C: u_init.c `u_init_race` PM_ORC — `if (!Role_if(PM_WIZARD)) ini_inv(Xtra_food)`.
 * Prepends **`g._orcXtraFoodOtyps`** (from **`consumeUInitRaceOrcXtraFoodIniInvLikeC`**) onto **`g.invent`**
 * in C **`addinv`** order (last generated food = chain head).
 * @param {import('./gstate.js').game} [g]
 */
export function applyOrcXtraFoodInventTailLikeC(g = game) {
    const orcIdx = races.findIndex((r) => r.name === 'orc');
    if ((g.initrace | 0) !== orcIdx) return;
    if (g.urole?.abbr === 'Wiz') return;
    const otyps = g._orcXtraFoodOtyps;
    if (!Array.isArray(otyps) || otyps.length !== 2) return;
    for (const ot of otyps) {
        if ((ot | 0) <= 0) return;
    }

    /** @param {number} otyp */
    function mkFood(otyp) {
        const q = 1;
        const w = objectOcWeight(otyp | 0) || 1;
        return {
            otyp: otyp | 0,
            oclass: NH5_FOOD_CLASS,
            quan: q,
            spe: 0,
            owt: Math.max(1, w * q),
            oartifact: 0,
            nobj: null,
            cursed: 0,
            blessed: 0,
        };
    }

    for (const otyp of otyps) {
        const o = mkFood(otyp | 0);
        o.nobj = g.invent ?? null;
        g.invent = o;
    }
}
