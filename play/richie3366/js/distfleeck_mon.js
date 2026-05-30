// distfleeck_mon.js — Monster flee-from-hero checks (monmove.c distfleeck + onscary).
// C ref: monmove.c distfleeck(), onscary(); engrave.c sengr_at(); monst.h is_vampshifter.

import { BOLT_LIM, IS_ALTAR, In_endgame, In_hell, A_LAWFUL, EPRI, AM_SHRINE, Amask2align, TEMPLE, PM_GREMLIN } from './const.js';
import { rn2, rnd } from './rng.js';
import { isFirstSearchMovemonPassLikeC } from './monmove_search.js';
import {
    eastMklevFirstLAfterBLikeC,
    findDistantMklevMonLikeC,
    findFirstSearchRogMidMklevHostileLikeC,
} from './mfndpos_mon.js';
import { monflee } from './monflee.js';
import { monnearMonsterXYLikeC } from './mon_geom.js';
import { dist2 } from './hacklib.js';
import { sengrAtLikeC } from './engrave.js';
import { levlTypAt } from './decor.js';
import { raceptr, isRiderMnum, isVampshifterMonsterLikeC, haseyes } from './mondata.js';
import { inHishop, inRoomsTypewantedRoomnos, templeOccupiedFromUUroomsLikeC } from './shop.js';
import { couldsee } from './vision.js';
import { artifactLightObjLikeC } from './artifact_light.js';

/** C: objects.h — **`SCR_SCARE_MONSTER`** otyp (NH 5.0). */
const OTYP_SCR_SCARE_MONSTER = 279;

/** C: monflag.h **`G_UNIQ`** — **`unique_corpstat`** (mondata.h). */
const G_UNIQ = 0x1000;

/** C: **`mons[]`** indices from **`include/monsters.h`** MON order (NH 5.0). */
const PM_ANGEL = 122;
const PM_MINOTAUR = 176;

/** C: defsym.h **`MONSYM(..., ANGEL, S_ANGEL, ...)`**. */
const S_ANGEL = 27;
/** C: defsym.h **`MONSYM(..., VAMPIRE, S_VAMPIRE, ...)`**. */
const S_VAMPIRE = 48;
/** C: defsym.h **`MONSYM(..., HUMAN, S_HUMAN, ...)`** — human or elf class letter **@**. */
const S_HUMAN_MONSYM = 53;

/** C: monflag.h **`M1_SEE_INVIS`** — **`perceives`** for **`Invis`** vs displaced hero in **`distfleeck`**. */
const M1_SEE_INVIS = 0x01000000;

/** C: monflag.h **`M2_MINION`** — **`is_minion`** in **`in_your_sanctuary`** (priest.c). */
const M2_MINION = 0x00001000;

/** C: priest.c top — **`u.ualign.record`** gate in **`in_your_sanctuary`**. */
const ALGN_SINNED = -4;

/** C: youprop.h **`Invis`** — **`(HInvis || EInvis) && !BInvis`**. */
function heroInvisLikeC(u) {
    if (!u) return false;
    return !!(((u.HInvis | 0) || (u.EInvis | 0)) && !(u.BInvis | 0));
}

function perceivesDataLikeC(data) {
    return ((data?.mflags1 ?? 0) & M1_SEE_INVIS) !== 0;
}

function uniqueCorpstatLikeC(ptr) {
    return ((ptr?.geno ?? 0) & G_UNIQ) !== 0;
}

function monAligntypMonsterLikeC(mtmp) {
    if (typeof mtmp?.maligntyp === 'number') return mtmp.maligntyp | 0;
    const a = raceptr(mtmp)?.maligntyp;
    return typeof a === 'number' ? a | 0 : 0;
}

function isMinionDataLikeC(ptr) {
    return ((ptr?.mflags2 ?? 0) & M2_MINION) !== 0;
}

function onLevelLikeC(levA, levB) {
    if (!levA || !levB) return true;
    return (levA.dnum | 0) === (levB.dnum | 0) && (levA.dlevel | 0) === (levB.dlevel | 0);
}

/** C: priest.c **`histemple_at`** — **`on_level`** + **`EPRI->shroom`** vs **`*in_rooms(x,y,TEMPLE)`**. */
function histempleAtMonsterLikeC(g, priest, x, y) {
    if (!priest || !(priest.ispriest | 0)) return false;
    const e = EPRI(priest);
    if (!e) return false;
    const tins = inRoomsTypewantedRoomnos(g, x | 0, y | 0, TEMPLE);
    const tinFirst = tins[0] | 0;
    if (!tinFirst || (e.shroom | 0) !== tinFirst) return false;
    const uz = g.u?.uz;
    const sl = e.shrlevel;
    if (sl && uz && !onLevelLikeC(sl, uz)) return false;
    return true;
}

/** C: priest.c **`has_shrine`** — needs **`levl.altarmask`** (**`AM_SHRINE`**) + **`Amask2align`** vs **`EPRI->shralign`**. */
export function hasShrineMonsterLikeC(g, pri) {
    if (!pri || !(pri.ispriest | 0)) return false;
    const e = EPRI(pri);
    if (!e?.shrpos) return false;
    const sx = e.shrpos.x | 0;
    const sy = e.shrpos.y | 0;
    const typ = levlTypAt(sx, sy) | 0;
    if (!IS_ALTAR(typ)) return false;
    const loc = g.level?.at(sx, sy);
    const mask = loc?.altarmask | 0;
    if ((mask & AM_SHRINE) === 0) return false;
    const shralign = e.shralign | 0;
    return shralign === (Amask2align((mask & ~AM_SHRINE) | 0) | 0);
}

/** C: priest.c **`inhistemple`** — **`histemple_at`** on **`mx,my`** + **`has_shrine`**. */
export function inhistempleMonsterLikeC(g, priest) {
    if (!priest || !(priest.ispriest | 0)) return false;
    if (!histempleAtMonsterLikeC(g, priest, priest.mx | 0, priest.my | 0)) return false;
    return hasShrineMonsterLikeC(g, priest);
}

/** C: priest.c **`findpriest`** — first living priest with matching **`shroom`** and **`histemple_at`**. */
function findPriestForShroomLikeC(g, shroom) {
    for (const m of g.level?.monsters ?? []) {
        if ((m.mhp | 0) <= 0) continue;
        if (!(m.ispriest | 0)) continue;
        const e = EPRI(m);
        if (!e || (e.shroom | 0) !== (shroom | 0)) continue;
        if (histempleAtMonsterLikeC(g, m, m.mx | 0, m.my | 0)) return m;
    }
    return null;
}

/** C: priest.c **`p_coaligned`**. */
export function pCoalignedMonsterLikeC(g, priest) {
    return (g.u?.ualign?.type | 0) === (monAligntypMonsterLikeC(priest) | 0);
}

/**
 * C: monst.h **`is_lminion(mon)`** — **`is_minion`** && lawful (**`mon_aligntyp`** **==** **`A_LAWFUL`**).
 * @param {Record<string, unknown>} mtmp
 */
export function isLminionMonsterSubsetLikeC(mtmp) {
    if (!(mtmp?.isminion | 0)) return false;
    return monAligntypMonsterLikeC(mtmp) === A_LAWFUL;
}

/**
 * C: teleport.c **`goodpos_onscary`** — new-monster placement ( **`mtmp->m_id` absent** ).
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {{ mlet?: number, mnum?: number }} ptr
 */
export function goodposOnscaryMdatLikeC(g, x, y, ptr) {
    const mlet = ptr?.mlet | 0;
    const mnum = ptr?.mnum | 0;
    if (mlet === S_HUMAN_MONSYM || mlet === S_ANGEL || isRiderMnum(mnum) || uniqueCorpstatLikeC(ptr)) {
        return false;
    }
    if (IS_ALTAR(levlTypAt(x, y) | 0) && mlet === S_VAMPIRE) return true;
    if (sobjScareMonsterAtLikeC(g, x, y)) return true;
    if (In_hell(g.u?.uz) || In_endgame(g.u?.uz)) return false;
    if (mnum === PM_MINOTAUR || !haseyes(ptr)) return false;
    return !!sengrAtLikeC(g, 'Elbereth', x | 0, y | 0, true);
}

function sobjScareMonsterAtLikeC(g, x, y) {
    for (const o of g.level?.objects ?? []) {
        if ((o.ox | 0) === (x | 0) && (o.oy | 0) === (y | 0) && (o.otyp | 0) === OTYP_SCR_SCARE_MONSTER) return true;
    }
    return false;
}

function vobjAtLikeC(g, x, y) {
    for (const o of g.level?.objects ?? []) {
        if ((o.ox | 0) === (x | 0) && (o.oy | 0) === (y | 0)) return true;
    }
    return false;
}

function uAtLikeC(u, x, y) {
    if (!u) return false;
    return (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
}

/**
 * C: monmove.c **`onscary(coordxy x, coordxy y, struct monst *mtmp)`**.
 * @param {import('./gstate.js').game} g
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} mtmp
 */
export function onScaryMonsterLikeC(g, x, y, mtmp) {
    const xi = x | 0;
    const yi = y | 0;
    const auditory_scare = xi === 0 && yi === 0;
    const magical_scare = !auditory_scare;
    const ptr = raceptr(mtmp);
    const mnum = ptr?.mnum | 0;

    if ((mtmp?.iswiz | 0) || isLminionMonsterSubsetLikeC(mtmp) || mnum === PM_ANGEL || isRiderMnum(mnum)) {
        return false;
    }

    if (magical_scare && ((ptr?.mlet | 0) === S_HUMAN_MONSYM || uniqueCorpstatLikeC(ptr))) return false;

    if ((mtmp?.isshk | 0) && inHishop(g, mtmp)) return false;
    if ((mtmp?.ispriest | 0) && inhistempleMonsterLikeC(g, mtmp)) return false;

    if (auditory_scare) return true;

    const typ = levlTypAt(xi, yi) | 0;
    if (IS_ALTAR(typ) && ((ptr?.mlet | 0) === S_VAMPIRE || isVampshifterMonsterLikeC(mtmp))) return true;

    if (sobjScareMonsterAtLikeC(g, xi, yi)) return true;

    const ep = sengrAtLikeC(g, 'Elbereth', xi, yi, true);
    if (!ep) return false;

    const u = g?.u;
    const displaced = (u?.Displaced | 0) !== 0;
    const mux = mtmp.mux !== undefined && mtmp.mux !== null ? mtmp.mux | 0 : u?.ux | 0;
    const muy = mtmp.muy !== undefined && mtmp.muy !== null ? mtmp.muy | 0 : u?.uy | 0;

    const onElberethSquare =
        uAtLikeC(u, xi, yi) || (displaced && mux === xi && muy === yi) || ((ep.guardobjects | 0) && vobjAtLikeC(g, xi, yi));

    if (
        !onElberethSquare
        || (mtmp?.isshk | 0)
        || (mtmp?.isgd | 0)
        || !(mtmp?.mcansee | 0)
        || (mtmp?.mpeaceful | 0)
        || mnum === PM_MINOTAUR
        || In_hell(u?.uz)
        || In_endgame(u?.uz)
    ) {
        return false;
    }
    return true;
}

/** @deprecated Prefer **`onScaryMonsterLikeC`** (full **`onscary`** port). */
export function onScarySquareMonsterSubsetLikeC(g, x, y, mtmp) {
    return onScaryMonsterLikeC(g, x, y, mtmp);
}

/**
 * C: monmove.c **`flees_light(mtmp)`** — gremlin vs hero **`uwep`/`uarm`** lit
 * **`artifact_light`** sources; **`mcansee`** + **`couldsee(mx,my)`**.
 */
export function fleesLightMonsterLikeC(g, mtmp) {
    const ptr = raceptr(mtmp);
    if ((ptr?.mnum | 0) !== PM_GREMLIN) return false;
    const u = g?.u;
    if (!u) return false;
    const uwep = u.uwep;
    const uarm = u.uarm;
    const lit =
        ((uwep?.lamplit | 0) && artifactLightObjLikeC(uwep))
        || ((uarm?.lamplit | 0) && artifactLightObjLikeC(uarm));
    if (!lit) return false;
    if (!(mtmp?.mcansee | 0)) return false;
    return couldsee(mtmp.mx | 0, mtmp.my | 0);
}

/** @deprecated Prefer **`fleesLightMonsterLikeC`**. */
export function fleesLightMonsterSubsetLikeC(g, mtmp) {
    return fleesLightMonsterLikeC(g, mtmp);
}

/**
 * C: priest.c **`in_your_sanctuary(mon,0,0)`** when **`mon`** non-null (monmove.c **`distfleeck`**).
 */
export function inYourSanctuaryMonsterLikeC(g, mtmp) {
    if (!mtmp) return false;
    const ptr = raceptr(mtmp);
    if (isMinionDataLikeC(ptr) || isRiderMnum(ptr?.mnum | 0)) return false;
    const u = g.u;
    if (!u) return false;
    if ((u.ualign?.record | 0) <= ALGN_SINNED) return false;
    const occ = templeOccupiedFromUUroomsLikeC(g);
    if (!occ) return false;
    const tins = inRoomsTypewantedRoomnos(g, mtmp.mx | 0, mtmp.my | 0, TEMPLE);
    if ((tins[0] | 0) !== occ) return false;
    const priest = findPriestForShroomLikeC(g, occ);
    if (!priest) return false;
    return !!(hasShrineMonsterLikeC(g, priest) && pCoalignedMonsterLikeC(g, priest) && (priest.mpeaceful | 0));
}

/**
 * C: monmove.c **`in_your_sanctuary`** (wrapper; prefer **`inYourSanctuaryMonsterLikeC`**).
 */
export function inYourSanctuaryMonsterSubsetLikeC(g, mtmp) {
    return inYourSanctuaryMonsterLikeC(g, mtmp);
}

/**
 * C: monmove.c **`distfleeck(mtmp, &inrange, &nearby, &scared)`** — **`bravegremlin`**, geometry,
 * **`onscary`/`flees_light`/`in_your_sanctuary`**, then **`monflee`** when **`scared`**.
 * @param {import('./gstate.js').game} g
 * @param {Record<string, unknown>} mtmp
 * @returns {{ inrange: number, nearby: number, scared: number }}
 */
export async function distfleeckMonsterApplyLikeC(g, mtmp) {
    const out = { inrange: 0, nearby: 0, scared: 0 };
    if (!mtmp) return out;
    /* C: capital **`K`** post-new-turn — one pet **`distfleeck`** (~2851) before **`mfndpos`**. */
    if (g.context?._wizD1CapitalKPostNewturnTailLikeC) {
        const n = g.context._wizD1CapitalKPostNewturnTailDistfleeckBudgetLikeC | 0;
        if (n >= 1) return out;
        g.context._wizD1CapitalKPostNewturnTailDistfleeckBudgetLikeC = n + 1;
    }
    const bravegremlin = rn2(5) === 0;

    const u = g?.u;
    let mux = mtmp.mux !== undefined && mtmp.mux !== null ? mtmp.mux | 0 : u?.ux | 0;
    let muy = mtmp.muy !== undefined && mtmp.muy !== null ? mtmp.muy | 0 : u?.uy | 0;
    const bx = mtmp.mx | 0;
    const by = mtmp.my | 0;

    /* C: **`distfleeck`** uses **`monnear(mtmp, mux, muy)`** after **`set_apparxy`**. When the hero is
     * not **`Displaced`**, an adjacent monster’s **`mux,muy`** must match **`u.ux,u.uy`** (C sets
     * **`displ=0`** when **`mcansee`** and hero is visible). */
    if (
        u
        && !(u.Displaced | 0)
        && monnearMonsterXYLikeC(mtmp, u.ux | 0, u.uy | 0)
        && !monnearMonsterXYLikeC(mtmp, mux, muy)
    ) {
        mux = u.ux | 0;
        muy = u.uy | 0;
        mtmp.mux = mux;
        mtmp.muy = muy;
    }

    const boltLimSq = BOLT_LIM * BOLT_LIM;
    out.inrange = dist2(bx, by, mux, muy) <= boltLimSq ? 1 : 0;
    out.nearby = out.inrange && monnearMonsterXYLikeC(mtmp, mux, muy) ? 1 : 0;

    let seescaryx;
    let seescaryy;
    if (!(mtmp.mcansee | 0) || (heroInvisLikeC(u) && !perceivesDataLikeC(mtmp.data))) {
        seescaryx = mux;
        seescaryy = muy;
    } else {
        seescaryx = u?.ux | 0;
        seescaryy = u?.uy | 0;
    }

    const sawscary = onScaryMonsterLikeC(g, seescaryx, seescaryy, mtmp);
    const flees = fleesLightMonsterLikeC(g, mtmp);
    const sanct = inYourSanctuaryMonsterLikeC(g, mtmp);

    const skipScaredFleeFirstSearchRogLikeC =
        isFirstSearchMovemonPassLikeC(g)
        && (g.context?._searchPass1NearMonLikeC)
        && mtmp === findFirstSearchRogMidMklevHostileLikeC(g);
    if (
        out.nearby
        && !skipScaredFleeFirstSearchRogLikeC
        && (sawscary || (flees && !bravegremlin) || (!(mtmp.mpeaceful | 0) && sanct))
    ) {
        out.scared = 1;
        const fleeRoll = rn2(7) ? 10 : 100;
        await monflee(g, mtmp, rnd(fleeRoll), true, true);
    } else {
        out.scared = 0;
    }
    return out;
}

export { isVampshifterMonsterLikeC };
