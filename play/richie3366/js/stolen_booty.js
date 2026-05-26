// stolen_booty.js — C mkmaze.c stolen_booty / migrate_orc / shiny_orc_stuff / migr_booty_item.
// C ref: mkmaze.c (orctown minetn-1 after check_ransacked).

import {
    MIGR_LEFTOVERS,
    MIGR_RANDOM,
    MIGR_TO_SPECIES,
    MM_NONAME,
    has_mgivenname,
} from './const.js';
import { depth, dunlevsInDungeonLikeC } from './hacklib.js';
import { rnd, rn1, rn2 } from './rng.js';
import { makemon } from './makemon.js';
import { permonstFromMndxLikeC } from './mondata.js';
import { migrateMonToLevelLikeC } from './mon_limbo.js';
import { fmonListNewestFirstLikeC } from './fmon_iter.js';
import { upstartLikeC } from './objnam.js';
import { christenMonstLikeC, christenOrcLikeC, rndorcnameLikeC } from './do_name_orc.js';
import {
    mksobjInitMklevLikeC,
    mksobjPostInitStatueLikeC,
    mkobjOtypFromProbRowsLikeC,
} from './mkobj_mklev_like_c.js';
import { mkobjOtypFoodClassIniInvLikeC, FOOD_CLASS_MKOBJ_WALK } from './mkobj_food_class_rng_like_c.js';
import { GEM_CLASS_MKOBJ_OC_PROB_ROWS } from './mkobj_mklev_oc_prob_data.js';
import { RING_CLASS_MKOBJ_ROWS } from './mkobj_wizard_ini_inv_data.js';
import { nh5OclassFromOcSkillMapLikeC } from './obj_oc_skill_data.js';
import { NH5_FOOD_CLASS } from './nh5_objclass.js';

const M2_ORC = 0x80;
const ORC_LEADER = 1;
const STRANGE_OBJECT = 0;

const PM_ORC = 74;
const PM_ORC_SHAMAN = 78;
const PM_ORC_CAPTAIN = 79;

const OTYP_TALLOW_CANDLE = 225;
const OTYP_WAX_CANDLE = 226;
const OTYP_SKELETON_KEY = 222;
const OTYP_LEATHER_GLOVES = 160;
const OTYP_GAUNTLETS_OF_DEXTERITY = 163;
const OTYP_LONG_SWORD = 55;
const OTYP_SILVER_SABER = 57;
const OTYP_GOLD_PIECE = 466;
const OTYP_ROCK = 473;
const TRIPE_RATION = 173;
const TIN = 205;
const LEMBAS_WAFER = 146;
const C_RATION = 181;
const K_RATION = 182;
const CORPSE = 174;
const EGG = 175;
const SLIME_MOLD = 194;

const ORCFRUIT = ['paddle cactus', 'dwarven root'];

/** @type {Map<number, number>} */
const FOOD_OC_PROB = new Map(FOOD_CLASS_MKOBJ_WALK.map(([o, p]) => [o | 0, p | 0]));

/** Shiny ring row (C `RING(..., "shiny", ...)` → otyp **200**). */
const OTYP_SHINY_RING = RING_CLASS_MKOBJ_ROWS[27][0] | 0;

function isOrcPtrLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_ORC) !== 0;
}

function weightBooty(otmp) {
    return otmp?.owt || 1;
}

/**
 * C: mkobj.c `mksobj` — `next_ident` + optional `mksobj_init`.
 * @param {number} otyp
 * @param {boolean} init
 * @param {boolean} artif
 */
function mksobjBootyLikeC(otyp, init, artif) {
    const otmp = {
        otyp: otyp | 0,
        ox: -1,
        oy: -1,
        quan: 1,
        owt: 1,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
    };
    rnd(2);
    if (init) {
        const oclass = nh5OclassFromOcSkillMapLikeC(otyp | 0) || 0;
        if (oclass) {
            otmp.oclass = oclass;
            mksobjInitMklevLikeC(otyp | 0, oclass, artif, otmp);
            mksobjPostInitStatueLikeC(otyp | 0);
        }
    }
    return otmp;
}

/** C: objnam.c `shiny_obj(RING_CLASS)` — only `"shiny"` ring has **oc_prob 0** → no `rn2`. */
function shinyObjRingClassLikeC() {
    const prob = RING_CLASS_MKOBJ_ROWS.find((r) => (r[0] | 0) === OTYP_SHINY_RING)?.[1] ?? 0;
    if (prob > 0) {
        let p = rn2(prob);
        if (p < 0) return OTYP_SHINY_RING;
        return OTYP_SHINY_RING;
    }
    return STRANGE_OBJECT;
}

/** C: options.c `fruitadd` for orctown slime mold — `ROLL_FROM(orcfruit)` → `rn2(2)`. */
function fruitaddOrcfruitLikeC() {
    return ORCFRUIT[rn2(ORCFRUIT.length)];
}

/** @param {object} mtmp */
function addToMinvLikeC(mtmp, otmp) {
    otmp.nobj = mtmp.minvent ?? null;
    mtmp.minvent = otmp;
}

/**
 * C: mkobj.c `mksobj_migr_to_species` + `add_to_migration`.
 * @param {import('./gstate.js').game} g
 */
function mksobjMigrToSpeciesLikeC(g, otyp, mflags2, init, artif, gang) {
    const otmp = mksobjBootyLikeC(otyp, init, artif);
    otmp.corpsenm = mflags2 | 0; /* C: migr_species alias */
    if (!g.migratingObjs) g.migratingObjs = [];
    g.migratingObjs.unshift({
        obj: otmp,
        targetDnum: 0,
        targetDlevel: 0,
        toloc: (MIGR_TO_SPECIES | MIGR_RANDOM) | 0,
        migrSpecies: mflags2 | 0,
        oname: gang || null,
    });
    if (gang) {
        otmp.oname = gang;
        const oc = nh5OclassFromOcSkillMapLikeC(otyp | 0);
        if (oc === NH5_FOOD_CLASS) {
            if ((otyp | 0) === SLIME_MOLD) {
                otmp.spe = fruitaddOrcfruitLikeC();
            }
            otmp.quan = (otmp.quan | 0) + (rn2(3) | 0);
            otmp.owt = weightBooty(otmp);
        }
    }
}

/** C: dungeon.c `get_level` — mines branch subset (same `dnum` as hero). */
function getLevelForDepthLikeC(g, levnum) {
    const uz = g.u?.uz;
    if (!uz) return { dnum: 0, dlevel: 1 };
    const dnum = uz.dnum | 0;
    const dun = g.dungeons?.[dnum];
    if (!dun) return { dnum, dlevel: uz.dlevel | 0 };
    let n = levnum | 0;
    if (n <= 0) n = uz.dlevel | 0;
    const depthStart = dun.depth_start | 0;
    const maxGlobal = depthStart + (dun.num_dunlevs | 0) - 1;
    if (n > maxGlobal) n = dun.num_dunlevs | 0;
    const dlevel = n - depthStart + 1;
    return { dnum, dlevel };
}

/**
 * C: mkmaze.c `migrate_orc` — depth RNG + `migrate_to_level(..., MIGR_RANDOM)`.
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 * @param {number} mflags — `ORC_LEADER` or 0
 */
function migrateOrcLikeC(g, mtmp, mflags) {
    const uz = g.u?.uz;
    if (!uz) return;
    const curDepth = depth(uz) | 0;
    const maxDepth = (dunlevsInDungeonLikeC(uz) | 0) + ((g.dungeons?.[uz.dnum | 0]?.depth_start | 0) - 1);
    let nlev;
    if ((mflags | 0) === ORC_LEADER) {
        nlev = maxDepth;
        if (!rn2(40)) nlev--;
        mtmp.migflags = (mtmp.migflags | 0) | MIGR_LEFTOVERS;
    } else {
        nlev = rn2((maxDepth - curDepth) + 1) + curDepth;
        if (nlev === curDepth) nlev++;
        if (nlev > maxDepth) nlev = maxDepth;
        mtmp.migflags = (mtmp.migflags | 0) & ~MIGR_LEFTOVERS;
    }
    const dest = getLevelForDepthLikeC(g, nlev);
    migrateMonToLevelLikeC(g, mtmp, dest, MIGR_RANDOM);
}

/** C: makemon.c `set_malign` — hostile orc captain (no extra RNG on typical orc). */
function setMalignBootyLikeC(mtmp) {
    mtmp.malign = 20;
}

/**
 * C: mkmaze.c `shiny_orc_stuff`.
 * @param {import('./gstate.js').game} g
 * @param {object} mtmp
 */
function shinyOrcStuffLikeC(g, mtmp) {
    void g;
    const isCaptain = (mtmp.mnum | 0) === PM_ORC_CAPTAIN;
    const goldprob = isCaptain ? 600 : 300;
    const gemprob = Math.trunc(goldprob / 4);
    if (rn2(1000) < goldprob) {
        const otmp = mksobjBootyLikeC(OTYP_GOLD_PIECE, true, false);
        if (otmp) {
            otmp.quan = 1 + rnd(goldprob);
            otmp.owt = weightBooty(otmp);
            addToMinvLikeC(mtmp, otmp);
        }
    }
    if (rn2(1000) < gemprob) {
        const otyp = mkobjOtypFromProbRowsLikeC(GEM_CLASS_MKOBJ_OC_PROB_ROWS);
        const otmp = mksobjBootyLikeC(otyp, true, false);
        if (otmp) {
            if ((otyp | 0) === OTYP_ROCK) {
                /* dealloc_obj — drop object */
            } else {
                addToMinvLikeC(mtmp, otmp);
            }
        }
    }
    if (isCaptain || !rn2(8)) {
        const otyp = shinyObjRingClassLikeC();
        if (otyp !== STRANGE_OBJECT) {
            const otmp = mksobjBootyLikeC(otyp, true, false);
            if (otmp) addToMinvLikeC(mtmp, otmp);
        }
    }
}

/** C: food `objects[otyp].oc_prob` + exclusions in `stolen_booty` loop. */
function bootyFoodOkLikeC(otyp) {
    const t = otyp | 0;
    if (t === LEMBAS_WAFER || t === CORPSE || t === EGG || t === TIN) return false;
    const prob = FOOD_OC_PROB.get(t);
    if (prob != null && prob !== 0) return true;
    return t === C_RATION || t === K_RATION;
}

/**
 * C: mkmaze.c `stolen_booty`.
 * @param {import('./gstate.js').game} g
 */
export function stolenBootyLikeC(g) {
    const gang = rndorcnameLikeC(null);
    let cnt = rnd(4);
    for (let i = 0; i < cnt; ++i) {
        mksobjMigrToSpeciesLikeC(g, rn2(4) ? OTYP_TALLOW_CANDLE : OTYP_WAX_CANDLE, M2_ORC, true, false, gang);
    }
    cnt = rnd(3);
    for (let i = 0; i < cnt; ++i) {
        mksobjMigrToSpeciesLikeC(g, OTYP_SKELETON_KEY, M2_ORC, true, false, gang);
    }
    let otyp = rn1((OTYP_GAUNTLETS_OF_DEXTERITY - OTYP_LEATHER_GLOVES) + 1, OTYP_LEATHER_GLOVES);
    mksobjMigrToSpeciesLikeC(g, otyp, M2_ORC, true, false, gang);
    cnt = rnd(10);
    for (let i = 0; i < cnt; ++i) {
        otyp = rn1(TIN - TRIPE_RATION + 1, TRIPE_RATION);
        if (bootyFoodOkLikeC(otyp)) {
            mksobjMigrToSpeciesLikeC(g, otyp, M2_ORC, true, false, gang);
        }
    }
    mksobjMigrToSpeciesLikeC(g, rn2(2) ? OTYP_LONG_SWORD : OTYP_SILVER_SABER, M2_ORC, true, false, gang);

    let mtmp = makemon({ mnum: PM_ORC_CAPTAIN, data: permonstFromMndxLikeC(PM_ORC_CAPTAIN) }, 0, 0, MM_NONAME);
    if (mtmp) {
        christenMonstLikeC(mtmp, upstartLikeC(gang));
        mtmp.mpeaceful = 0;
        setMalignBootyLikeC(mtmp);
        shinyOrcStuffLikeC(g, mtmp);
        migrateOrcLikeC(g, mtmp, ORC_LEADER);
    }

    for (const mon of fmonListNewestFirstLikeC(g)) {
        if ((mon.mhp | 0) <= 0) continue;
        const ptr = mon.data || permonstFromMndxLikeC(mon.mnum | 0);
        if (isOrcPtrLikeC(ptr) && !has_mgivenname(mon) && rn2(10)) {
            if ((mon.mnum | 0) !== PM_ORC_CAPTAIN) {
                christenOrcLikeC(mon, upstartLikeC(gang), '');
            }
        }
    }

    cnt = rn2(10) + 5;
    for (let i = 0; i < cnt; ++i) {
        const mtyp = rn2((PM_ORC_SHAMAN - PM_ORC) + 1) + PM_ORC;
        mtmp = makemon({ mnum: mtyp, data: permonstFromMndxLikeC(mtyp) }, 0, 0, MM_NONAME);
        if (mtmp) {
            shinyOrcStuffLikeC(g, mtmp);
            migrateOrcLikeC(g, mtmp, 0);
        }
    }
    g.ransacked = false;
}
