// dozap.js — **`#zap`** / **`z`** ( **`zap.c`** **`dozap`** / **`weffects`** subset until full **`getobj`**).
// C ref: zap.c **`dozap`**, **`weffects`** (**`WAN_DIGGING`** → **`zap_dig()`**; ray block **`WAN_MAGIC_MISSILE`…`WAN_LIGHTNING`**
//        → **`ubuzz(BZ_U_WAND(BZ_OFS_WAN(otyp)), …)`**); **`zap_ok`** (**`WAND_CLASS`** only).

import { game } from './gstate.js';
import { pline, flush_screen } from './display.js';
import { readDirIntoU } from './dir_input.js';
import { nothing_happens } from './const.js';
import { rn2 } from './rng.js';
import {
    ubuzzOverFloor,
    wandUbuzzTypeFromOtyp,
    WAN_DIGGING,
    WAN_FIRE,
    WAN_MAGIC_MISSILE,
    WAN_LIGHTNING,
} from './buzz.js';
import { heroZapDigLikeC } from './zap_dig.js';
import { NH5_WAND_CLASS } from './nh5_objclass.js';
import { learnwandHeroLikeC } from './objnam.js';
import { moreExperiencedHeroLikeC } from './exper_pluslvl.js';

/** C: objects.h wand block — first otyp **409**; **RAY** digging then magic missile..lightning (**`weffects`**). */
const OTYP_NH5_WAN_FIRST = 409;
const OTYP_NH5_WAN_DIGGING = OTYP_NH5_WAN_FIRST + 18;
const OTYP_NH5_WAN_MAGIC_MISSILE = OTYP_NH5_WAN_FIRST + 19;
const OTYP_NH5_WAN_LIGHTNING = OTYP_NH5_WAN_FIRST + 24;

/** C: hack.h `WAND_WREST_CHANCE` */
const WAND_WREST_CHANCE = 121;

/**
 * C: zap.c **`zappable(wand)`** — decrement **`spe`**; wrest last charge (**`rn2(WAND_WREST_CHANCE)`**).
 * When **`wand.spe`** is omitted (**invent** stub), returns true without **`rn2`** (charges not modeled).
 * @param {import('./gstate.js').game} g
 * @param {{ spe?: number }} wand
 */
async function zappableWandLikeC(g, wand) {
    void g;
    if (wand == null || wand.spe === undefined) return true;
    const spe0 = wand.spe | 0;
    if (spe0 < 0 || (spe0 === 0 && rn2(WAND_WREST_CHANCE))) return false;
    if (spe0 === 0) {
        await pline('You wrest one last charge from the worn-out wand.');
    }
    wand.spe = spe0 - 1;
    return true;
}

/**
 * C: zap.c **`zap_ok`** — first carried wand (**`getobj`** not ported; order = invent chain).
 * @param {import('./gstate.js').game} g
 * @returns {{ otyp: number }|null}
 */
export function firstCarriedWandForZapLikeC(g) {
    for (let o = g.invent; o; o = o.nobj) {
        if ((o.oclass | 0) === NH5_WAND_CLASS) return o;
    }
    return null;
}

/**
 * C: zap.c **`weffects`** — **`nd`** for hero ray (**`2`** magic missile, else **`6`**).
 * @param {number} otyp
 */
export function wandUbuzzNdLikeC(otyp) {
    const t = otyp | 0;
    return t === WAN_MAGIC_MISSILE || t === OTYP_NH5_WAN_MAGIC_MISSILE ? 2 : 6;
}

/** C: zap.c **`weffects`** — directional digging + offensive ray wands only ( **`oc_dir`** **`RAY`**). */
function wandOtypUsesGetdirLikeC(otyp) {
    const t = otyp | 0;
    if (t === OTYP_NH5_WAN_DIGGING || (t >= OTYP_NH5_WAN_MAGIC_MISSILE && t <= OTYP_NH5_WAN_LIGHTNING)) return true;
    /* Legacy **`buzz.js`** scale (**`mklev.js`** digging **305**) until all callers use NH5 **`objects_nums`**. */
    if (t === WAN_DIGGING) return true;
    return t >= WAN_MAGIC_MISSILE && t <= WAN_LIGHTNING;
}

/** C: **`WAN_DIGGING`** — NH5 **427** or legacy **305**. */
function isWanDiggingOtyp(otyp) {
    const t = otyp | 0;
    return t === OTYP_NH5_WAN_DIGGING || t === WAN_DIGGING;
}

/**
 * C: zap.c **`dozap`** → **`weffects`** (**`zappable`** for directional wands; no cursed **`backfire`** yet).
 */
export async function doZapCmd() {
    const g = game;
    g.context.move = 0;
    const wand = firstCarriedWandForZapLikeC(g);

    if (!wand) {
        if (!g.flags?.wizard) {
            await pline('You do not have anything to zap yet.');
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }
        /* Harness until **`g.invent`** links real wands: same as historical wizard fire test. */
        await pline('In what direction?');
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        if (!(await readDirIntoU(g))) {
            await pline('Never mind.');
            await flush_screen(1);
            return;
        }
        await ubuzzOverFloor(g, wandUbuzzTypeFromOtyp(WAN_FIRE), 6);
        await flush_screen(1);
        return;
    }

    const otyp = wand.otyp | 0;
    const needDir = wandOtypUsesGetdirLikeC(otyp);
    if (needDir) {
        if (!(await zappableWandLikeC(g, wand))) {
            await pline(nothing_happens);
            game._retainMessageAfterCommand = true;
            await flush_screen(1);
            return;
        }
    }
    if (!needDir) {
        await pline(nothing_happens);
        game._retainMessageAfterCommand = true;
        await flush_screen(1);
        return;
    }

    await pline('In what direction?');
    game._retainMessageAfterCommand = true;
    await flush_screen(1);
    if (!(await readDirIntoU(g))) {
        /* C: **`getdir`** cancel — **`The <wand> glows and fades.`** when !Blind */
        await pline('The wand glows and fades.');
        await flush_screen(1);
        return;
    }

    const u = g.u;
    if (u && !(u.dx | 0) && !(u.dy | 0) && !(u.dz | 0)) {
        /* C: **`zapyourself`** — digging is a no-op; ray self-zap not ported */
        if (isWanDiggingOtyp(otyp)) {
            await flush_screen(1);
            return;
        }
        await pline(nothing_happens);
        await flush_screen(1);
        return;
    }

    /* C: zap.c **`weffects`** — **`was_unkn = !objects[otyp].oc_name_known`** before **`learnwand`**. */
    const wasUnkn = !(g.wandDiscovery instanceof Set && g.wandDiscovery.has(otyp));

    if (isWanDiggingOtyp(otyp)) {
        await heroZapDigLikeC(g);
    } else {
        await ubuzzOverFloor(g, wandUbuzzTypeFromOtyp(otyp), wandUbuzzNdLikeC(otyp));
    }
    /* C: **`if (disclose) { learnwand(obj); if (was_unkn) more_experienced(0, 10); }`** */
    learnwandHeroLikeC(g, wand);
    if (wasUnkn) moreExperiencedHeroLikeC(g, 0, 10);
    await flush_screen(1);
}
