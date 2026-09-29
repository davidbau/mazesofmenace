// C dothrow.c:1220-1430 — upward throws and falling-object consequences.
import { game } from './gstate.js';
import { In_endgame, Is_earthlevel, HEAD, FACE, KILLED_BY, KILLED_BY_AN,
    STONING, WT_TO_DMG, POTHIT_HERO_THROW, Has_contents, ismnum,
    STONE_RES, Upolyd } from './const.js';
import { PM_SHADE, PM_STONE_GOLEM } from './pm.generated.js';
import { rn1, rnd } from './rng.js';
import { pline } from './display.js';
import { Blind } from './vision.js';
import { potionhit } from './potion.js';
import { breaktest, breakmsg, breakobj, dropy, body_part, ceiling, hitfloor } from './cmd.js';
import { dmgval, artifact_hit, touch_petrifies } from './uhitm.js';
import { hard_helmet } from './do_wear.js';
import { can_blnd, poly_when_stoned, mon_hates_blessings } from './mhitm.js';
import { BlindedTimeout, make_blinded, hit } from './zap.js';
import { polymon } from './polyself.js';
import { permonstTemplate, hates_silver } from './makemon.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { doname, helm_simple_name, thesimpleoname, an } from './objnam.js';
import { losehp } from './dokick.js';
import { done } from './end.js';

const CLOTH = 6, SILVER = 14, AT_WEAP = 254;
const EGG = 266, CORPSE = 265, CREAM_PIE = 287, BLINDING_VENOM = 479;
const HALF_PHDAM = 56;
const doname2 = async obj => { const s = await doname(obj); return s[0].toUpperCase() + s.slice(1); };
const stoneResistance = () => !!(game.u.uprops?.[STONE_RES]?.intrinsic
    || game.u.uprops?.[STONE_RES]?.extrinsic);
const hateSilver = () => ismnum(game.u.ulycn ?? -1) || hates_silver(game.youmonst.data);
const maybeHalfPhysical = dmg => {
    const p = game.u?.uprops?.[HALF_PHDAM];
    return p && (p.intrinsic || p.extrinsic) ? Math.trunc((dmg + 1) / 2) : dmg;
};
const passesRocks = ptr => !!ptr && !!((ptr.mflags1 | 0) & 0x00000008)
    && !((ptr.mflags1 | 0) & 0x00100000);
const stoneMissile = obj => {
    const material = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
    return (material === 20 || material === 21) && (obj.oclass | 0) !== 4;
};

export function has_ceiling(lev) {
    return !(In_endgame(lev) && !Is_earthlevel(lev));
}

export function harmless_missile(obj) {
    const t = obj.otyp | 0;
    /* SLING, EUCALYPTUS_LEAF, KELP_FROND, SPRIG_OF_WOLFSBANE,
     * FORTUNE_COOKIE, PANCAKE. */
    if ([87, 276, 275, 283, 289, 290].includes(t)) return true;
    /* RUBBER_HOSE, BAG_OF_TRICKS. */
    if (t === 78 || t === 220) return (obj.spe | 0) < 1;
    /* SACK, OILSKIN_SACK, BAG_OF_HOLDING. */
    if (t >= 217 && t <= 219) return !Has_contents(obj);
    return (obj.oclass | 0) === 9 || (MKOBJ_OC_MATERIAL[t] | 0) === CLOTH;
}

async function petrify(obj) {
    game.svk ||= {};
    game.svk.killer ||= {};
    game.svk.killer.format = KILLED_BY;
    game.svk.killer.name = 'elementary physics';
    await pline('You turn to stone.');
    if (obj) await dropy(obj);
    game.thrownobj = null;
    await done(STONING);
    return !!obj;
}

/* Returns false when the thrown object has been destroyed. */
export async function toss_up(obj, hitsroof) {
    const u = game.u, you = game.youmonst, otyp = obj.otyp | 0;
    const petrifier = (otyp === EGG || otyp === CORPSE) && ismnum(obj.corpsenm)
        && touch_petrifies(permonstTemplate(obj.corpsenm));
    let action;
    if (!has_ceiling(u.uz)) action = 'flies up into';
    else if (hitsroof) {
        if (breaktest(obj)) {
            await pline(`${(await doname2(obj))} hits the ${ceiling(u.ux, u.uy)}.`);
            await breakmsg(obj, !Blind());
            if (!await breakobj(obj, u.ux, u.uy, true, true)) {
                await hitfloor(obj, false);
                game.thrownobj = null;
                return true;
            }
            return false;
        }
        action = 'hits';
    } else action = 'almost hits';
    await pline(`${(await doname2(obj))} ${action} the ${ceiling(u.ux, u.uy)}, then falls back on top of your ${body_part(HEAD)}.`);

    if ((obj.oclass | 0) === 8) {
        await potionhit(you, obj, POTHIT_HERO_THROW);
    } else if (breaktest(obj)) {
        const blindinc = ((otyp === CREAM_PIE || otyp === BLINDING_VENOM)
            && can_blnd(you, you, AT_WEAP, obj)) ? rnd(25) : 0;
        await breakmsg(obj, !Blind());
        if (await breakobj(obj, u.ux, u.uy, true, true)) obj = null;
        if (otyp === EGG && petrifier && !stoneResistance()
            && !(poly_when_stoned(you.data) && await polymon(PM_STONE_GOLEM))) {
            if (u.uarmh)
                await pline(`Your ${helm_simple_name(u.uarmh)} fails to protect you.`);
            return await petrify(obj);
        }
        if (otyp === EGG || otyp === CREAM_PIE || otyp === BLINDING_VENOM) {
            await pline(`You've got it all over your ${body_part(FACE)}!`);
            if (blindinc) {
                if (otyp === BLINDING_VENOM && !Blind()) await pline('It blinds you!');
                u.ucreamed = (u.ucreamed | 0) + blindinc;
                await make_blinded(BlindedTimeout() + blindinc, false);
                if (!Blind()) await pline('Your vision quickly clears.');
            }
        }
        if (!obj) return false;
        await hitfloor(obj, false);
        game.thrownobj = null;
    } else if (harmless_missile(obj)) {
        await pline("It doesn't hurt.");
        await hitfloor(obj, false);
        game.thrownobj = null;
    } else {
        const silver = (MKOBJ_OC_MATERIAL[otyp] | 0) === SILVER;
        const less = hard_helmet(u.uarmh) && (!silver || !hateSilver());
        let harmless = stoneMissile(obj) && passesRocks(you.data);
        let dmg = dmgval(obj, you), artimsg = false;
        if (obj.oartifact && !harmless) {
            const result = await artifact_hit(null, null, obj, dmg, rn1(18, 2), u.umonnum);
            dmg = result.dmg;
            artimsg = result.special;
        }
        if (!dmg) {
            dmg = Math.trunc(((obj.owt | 0) + WT_TO_DMG - 1) / WT_TO_DMG);
            dmg = dmg <= 1 ? 1 : rnd(dmg);
            if (dmg > 6) dmg = 6;
            if ((you.data?.pmidx | 0) === PM_SHADE && !silver) dmg = 0;
            if (obj.blessed && mon_hates_blessings(you)) dmg += rnd(4);
            if (silver && hateSilver()) dmg += rnd(20);
        }
        if (dmg > 1 && less) dmg = 1;
        if (dmg > 0) dmg += u.udaminc | 0;
        if (dmg < 0) dmg = 0;
        dmg = maybeHalfPhysical(dmg);
        if (u.uarmh) {
            if ((less && dmg < (Upolyd(u) ? u.mh : u.uhp)) || harmless) {
                if (!artimsg) await pline(harmless
                    ? `Unfortunately, you are wearing ${an(helm_simple_name(u.uarmh))}.`
                    : 'Fortunately, you are wearing a hard helmet.');
            } else if (!petrifier && game.flags.verbose) {
                await pline(`Your ${helm_simple_name(u.uarmh)} does not protect you.`);
            }
            harmless = false;
        } else if (petrifier && !stoneResistance()
            && !(poly_when_stoned(you.data) && await polymon(PM_STONE_GOLEM))) {
            return await petrify(obj);
        }
        if (silver && hateSilver()) await pline('The silver sears you!');
        if (harmless) await hit(thesimpleoname(obj), you, " but doesn't hurt.");
        await hitfloor(obj, true);
        game.thrownobj = null;
        if (!harmless) await losehp(dmg, 'falling object', KILLED_BY_AN);
    }
    return true;
}
