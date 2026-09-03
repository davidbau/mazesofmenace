// do_name.js — Object naming helpers (partial).
// C ref: do_name.c oname / artifact naming / docallcmd / namefloorobj
//        (D-1555); christen_orc / rndorcname / free_oname (D-1193);
//        new_oname (D-1363); name_from_player (D-1624, EDIT_GETLIN off);
//        do_mgivenname / alreadynamed (D-1638); docallcmd `'d'` →
//        o_init.c rename_disco; lookup_novel (D-1651); `'o'` getobj
//        `"call"` (D-1660); do_oname artifact_name slip (D-1670);
//        docallcmd cmdq_pop canned + lootabc + invent-gated i/o (D-1671);
//        docall sink-fluid OBJ_DESCR + safe_qbuf Call/:/thing (D-1672);
//        undiscover_object / gem_learned (D-1691);
//        distant_monnam astral high-cleric conceal (D-1673);
//        oname via_naming literate livelog (D-1680);
//        docallcmd `'i'` live getobj("name", name_ok, GETOBJ_PROMPT)
//        (D-1681);
//        docallcmd #if 0 EXCLUDE compiled out; getobj silly_thing
//        Call Amulet (D-1682).

import {
    artifact_exists, exist_artifact, artifact_name, restrict_name,
    bare_artifactname, set_artifact_intrinsic,
} from './artifact.js';
import { game } from './gstate.js';
import { livelog_printf } from './pline.js';
import { alter_cost } from './shk.js';
import { set_twoweap } from './wield.js';
import { cmdq_pop, cmdq_clear } from './cmd.js';
import { rn2, rn1, rn2_on_display_rng, rnd_on_display_rng } from './rng.js';
import { wipeout_text } from './engrave.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, docrt, canspotmon, pline,
    glyph_to_obj_at, glyph_is_swallow_at, see_with_infrared, sensemon,
    verbalize,
} from './display.js';
import {
    paint_corner_nhw_menu, discover_object,
    getobj, update_inventory,
} from './invent.js';
import { rename_disco, undiscover_object } from './o_init.js';
import {
    ONAME_VIA_NAMING, ONAME_KNOW_ARTI, ONAME_SKIP_INVUPD,
    LL_CONDUCT, LL_ARTIFACT, W_WEP,
    MGIVENNAME, has_mgivenname,
    W_SADDLE, engulfing_u, Upolyd, MD_PAD_BOGONS,
    ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
    SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION,
    SUPPRESS_SADDLE, SUPPRESS_NAME,
    GETOBJ_EXCLUDE, GETOBJ_DOWNPLAY, GETOBJ_SUGGEST, GETOBJ_NOFLAGS,
    GETOBJ_PROMPT,
    ECMD_OK, CMDQ_KEY, CQ_CANNED,
    has_oname, ONAME, CLR_MAX, BUFSZ, u_at, OBJ_FREE, OBJ_INVENT, HAND,
    isok, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPMASK, has_ebones,
    NON_PM, Is_astralevel,
} from './const.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import { shkname } from './shknam.js';
import { monsterNames } from './generated/monsters_data.js';
import {
    M2_PNAME, MALE, FEMALE, NEUTRAL, pmnames, G_NOGEN, G_UNIQ, mons,
    LOW_PM, SPECIAL_PM, hides_under, is_rider, MS_ANIMAL,
} from './monsters.js';
import { getlin } from './getline.js';
import { getpos } from './getpos.js';
import { object_from_map } from './pager.js';
import { objects_at, SIR_TERRY_NOVELS } from './mkobj.js';
import { rank_of, genders } from './roles.js';
import {
    an, xname, simpleonames, ansimpleoname, set_y_monnam, set_noit_mon_nam,
    The, is_plural, safe_qbuf, body_part_latebound, vtense, makeplural,
} from './objnam.js';
import {
    POTION_CLASS, COIN_CLASS, AMULET_CLASS, SCROLL_CLASS, WAND_CLASS,
    RING_CLASS, GEM_CLASS, SPBOOK_CLASS, ARMOR_CLASS, TOOL_CLASS,
    VENOM_CLASS, WEAPON_CLASS, FOOD_CLASS,
    objectNames, objectNameStrs, objectDescrs,
} from './objects.js';
import { get_rnd_text } from './rumors.js';
import { BOGUSMON_BUF } from './generated/bogusmon_data.js';
import { m_at } from './mon.js';
import { cansee } from './vision.js';
import { fuzzymatch, strstri, highc } from './hacklib.js';
import { pronoun_gender, PRONOUN_HALLU } from './mondata.js';
import { beautiful } from './apply.js';
import { mhe, mhis } from './fountain.js';

const PL_PSIZ = 32; // C: PL_PSIZ player-name / oname buffer
const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_SHOPKEEPER = monsterNames.indexOf('PM_SHOPKEEPER');
const PM_HIGH_CLERIC = monsterNames.indexOf('PM_HIGH_CLERIC');
const PM_JUIBLEX = monsterNames.indexOf('PM_JUIBLEX');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const STRANGE_OBJECT = objectNames.indexOf('STRANGE_OBJECT');
const TOWEL = objectNames.indexOf('TOWEL');
const STATUE = objectNames.indexOf('STATUE');
const TIN = objectNames.indexOf('TIN');
const FIGURINE = objectNames.indexOf('FIGURINE');
const HEAVY_IRON_BALL = objectNames.indexOf('HEAVY_IRON_BALL');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const FAKE_AMULET_OF_YENDOR = objectNames.indexOf('FAKE_AMULET_OF_YENDOR');
const BOGUSMONSIZE = 100; // C: do_name.c rndmonnam
const BOGON_CODES = '-_+|=';

/**
 * C ref: do_name.c name_ok `:466–476`.
 * EXCLUDE gold / hands; DOWNPLAY unseen, artifacts, novels.
 * Callers: docallcmd `'i'` getobj; iactions.c item_naming_classification.
 */
export function name_ok(obj) {
    if (!obj || obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE;
    if (!obj.dknown || obj.oartifact || obj.otyp === SPE_NOVEL) {
        return GETOBJ_DOWNPLAY;
    }
    return GETOBJ_SUGGEST;
}

/**
 * C ref: do_name.c objtyp_is_callable `:428–463`.
 * oc_uname or (class with OBJ_DESCR); Yendor amulets excluded.
 */
export function objtyp_is_callable(i) {
    const ocl = game.objects?.[i];
    if (!ocl) return false;
    if (ocl.oc_uname) return true;
    const oc = ocl.oc_class;
    if (oc === AMULET_CLASS) {
        if (i === AMULET_OF_YENDOR || i === FAKE_AMULET_OF_YENDOR) {
            return false;
        }
    }
    if (
        oc === AMULET_CLASS || oc === SCROLL_CLASS || oc === POTION_CLASS
        || oc === WAND_CLASS || oc === RING_CLASS || oc === GEM_CLASS
        || oc === SPBOOK_CLASS || oc === ARMOR_CLASS || oc === TOOL_CLASS
        || oc === VENOM_CLASS
    ) {
        const di = ocl.oc_descr_idx ?? i;
        return !!(objectDescrs[di] || ocl.oc_descr);
    }
    return false;
}

/**
 * C ref: do_name.c call_ok `:479–495`.
 * EXCLUDE if not callable; DOWNPLAY if unseen or discovered without uname.
 */
export function call_ok(obj) {
    if (!obj || !objtyp_is_callable(obj.otyp)) return GETOBJ_EXCLUDE;
    const ocl = game.objects?.[obj.otyp];
    if (!obj.dknown || (ocl?.oc_name_known && !ocl?.oc_uname)) {
        return GETOBJ_DOWNPLAY;
    }
    return GETOBJ_SUGGEST;
}

/** C ref: objnam.c Ysimple_name2 — capitalize simpleonames. */
function Ysimple_name2(obj) {
    const s = simpleonames(obj) || 'item';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * C do_name.c name_from_player `:105–128`.
 * `defres` is copied into the getlin buffer only when EDIT_GETLIN
 * (`config.h:655` is commented out — C `nhUse(defres)`). Truncate
 * at PL_PSIZ after mungspaces. ESC or empty getlin → null.
 * @param {string} prompt
 * @param {string|null|undefined} defres
 * @returns {Promise<string|null>}
 */
async function name_from_player(prompt, defres) {
    /* C #else nhUse(defres); EDIT_GETLIN would Strcpy(outbuf, defres). */
    void defres;
    const outbuf = await getlin(prompt);
    if (!outbuf || outbuf === '\x1b') return null;
    let s = outbuf.trim().replace(/\s+/g, ' ');
    if (s.length >= PL_PSIZ) s = s.slice(0, PL_PSIZ - 1);
    return s;
}

/**
 * C ref: do_name.c do_oname `:289–369`.
 * getlin then artifact_name + restrict_name / exist_artifact slip
 * (wipeout_text + rnd_on_display_rng) or canonical Sting/Orcrist.
 * oname via_naming literate livelog is D-1680.
 */
async function do_oname(obj) {
    if (!obj) return;
    if (obj.otyp === SPE_NOVEL) {
        await pline(`${Ysimple_name2(obj)} already has a published name.`);
        return;
    }
    const qprefix = `What do you want to name ${is_plural(obj) ? 'these' : 'this'} `;
    const qbuf = safe_qbuf(qprefix, qprefix, '?', obj, xname, simpleonames, 'item');
    let buf = await name_from_player(qbuf, safe_oname(obj));
    if (buf == null) return;

    if (obj.oartifact) {
        await pline(
            `${has_oname(obj) ? ONAME(obj) : 'The artifact'} resists the attempt.`,
        );
        return;
    }

    const typOut = { otyp: STRANGE_OBJECT };
    const aname = artifact_name(buf, typOut, true);
    const objtyp = typOut.otyp;
    if (aname
        && (restrict_name(obj, aname) || exist_artifact(obj.otyp, aname))) {
        buf = aname;
        const bufcpy = buf;
        do {
            const prefix = buf.length >= 4
                && buf.slice(0, 4).toLowerCase() === 'the ' ? 4 : 0;
            buf = buf.slice(0, prefix)
                + wipeout_text(buf.slice(prefix), rnd_on_display_rng(2), 0);
        } while (buf === bufcpy);
        await pline(`While engraving, your ${body_part_latebound(HAND)} slips.`);
        await flush_topl_more();
        await pline(`You engrave: "${buf}".`);
        const u = game.u || (game.u = {});
        if (!u.uconduct) u.uconduct = {};
        u.uconduct.literate = (u.uconduct.literate | 0) + 1;
    } else if (obj.otyp === objtyp) {
        /* artifact_name() always returns non-Null when it sets objtyp */
        buf = aname;
    }

    oname(obj, buf, ONAME_VIA_NAMING | ONAME_KNOW_ARTI);
}

/** C ref: youprop.h Hallucination — HHallucination && !Halluc_resistance. */
export function Hallucination() {
    const u = game.u || {};
    if (u.Hallucination) return true;
    const resist = !!(
        (u.Halluc_resistance | 0)
        || (u.HHalluc_resistance | 0)
        || (u.EHalluc_resistance | 0)
    );
    return !!((u.HHallucination | 0) && !resist);
}

/**
 * C ref: do_name.c bogusmon — get_rnd_text(BOGUSMONFILE) + strip prefix.
 * @param {{ c?: string }|null} codeOut
 */
export function bogusmon(codeOut = null) {
    if (codeOut) codeOut.c = '';
    let mnam = get_rnd_text(BOGUSMON_BUF, rn2_on_display_rng, MD_PAD_BOGONS) || '';
    if (!mnam) mnam = 'bogon';
    else if (BOGON_CODES.includes(mnam[0])) {
        if (codeOut) codeOut.c = mnam[0];
        mnam = mnam.slice(1);
    }
    return mnam;
}

/** C ref: do_name.c bogon_is_pname */
function bogon_is_pname(code) {
    return !!code && '-+='.includes(code);
}

/**
 * C ref: do_name.c rndmonnam — display-rng hallu monster name.
 * @param {{ c?: string }|null} codeOut
 */
export function rndmonnam(codeOut = null) {
    if (codeOut) codeOut.c = '';
    let name;
    do {
        name = rn2_on_display_rng(SPECIAL_PM + BOGUSMONSIZE - LOW_PM) + LOW_PM;
    } while (
        name < SPECIAL_PM
        && (type_is_pname(mons(name)) || ((mons(name)?.geno | 0) & G_NOGEN))
    );
    if (name >= SPECIAL_PM) return bogusmon(codeOut);
    const g = rn2_on_display_rng(2);
    return pmname(name, g === 0 ? MALE : FEMALE);
}

// C ref: do_name.c hcolors[] — Hallu substitutes for hcolor().
const HCOLORS = [
    'ultraviolet', 'infrared', 'bluish-orange', 'reddish-green', 'dark white',
    'light black', 'sky blue-pink', 'pinkish-cyan', 'indigo-chartreuse',
    'salty', 'sweet', 'sour', 'bitter', 'umami', // basic tastes
    'striped', 'spiral', 'swirly', 'plaid', 'checkered', 'argyle', 'paisley',
    'blotchy', 'guernsey-spotted', 'polka-dotted', 'square', 'round',
    'triangular', 'cabernet', 'sangria', 'fuchsia', 'wisteria', 'lemon-lime',
    'strawberry-banana', 'peppermint', 'romantic', 'incandescent',
    'octarine', // Discworld: the Colour of Magic
    'excitingly dull', 'mauve', 'electric',
    'neon', 'fluorescent', 'phosphorescent', 'translucent', 'opaque',
    'psychedelic', 'iridescent', 'rainbow-colored', 'polychromatic',
    'colorless', 'colorless green',
    'dancing', 'singing', 'loving', 'loudy', 'noisy', 'clattery', 'silent',
    'apocyan', 'infra-pink', 'opalescent', 'violant', 'tuneless',
    'viridian', 'aureolin', 'cinnabar', 'purpurin', 'gamboge', 'madder',
    'bistre', 'ecru', 'fulvous', 'tekhelet', 'selective yellow',
];

/**
 * C ref: do_name.c hcolor — Hallu or NULL pref → rn2_on_display_rng
 * over hcolors[] (SIZE only). Pref is not a last choice. Unlike
 * hliquid, program_state.gameover does not skip the Hallu arm.
 * Empty string is a live pref (C pointer), not NULL.
 */
export function hcolor(colorpref) {
    if (Hallucination() || colorpref == null) {
        return HCOLORS[rn2_on_display_rng(HCOLORS.length)];
    }
    return colorpref;
}

// C ref: decl.c c_obj_colors[] — rndcolor uses this; NO_COLOR (8) is
// "transparent" in the table but rndcolor maps that k to "colorless".
const C_OBJ_COLORS = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'transparent', 'orange', 'bright green', 'yellow', 'bright blue',
    'bright magenta', 'bright cyan', 'white',
];

/**
 * C ref: do_name.c rndcolor — always rn2(CLR_MAX) on the core stream
 * (even when Hallu). Hallu then hcolor(NULL) display-rng; else
 * k==NO_COLOR → "colorless", else c_obj_colors[k].
 */
export function rndcolor() {
    const k = rn2(CLR_MAX);
    return Hallucination() ? hcolor(null)
        : (k === NO_COLOR) ? 'colorless'
            : C_OBJ_COLORS[k];
}

// C ref: do_name.c hliquids[] — Hallu substitutes for hliquid().
const HLIQUIDS = [
    'yoghurt', 'oobleck', 'clotted blood', 'diluted water', 'purified water',
    'instant coffee', 'tea', 'herbal infusion', 'liquid rainbow',
    'creamy foam', 'mulled wine', 'bouillon', 'nectar', 'grog', 'flubber',
    'ketchup', 'slow light', 'oil', 'vinaigrette', 'liquid crystal', 'honey',
    'caramel sauce', 'ink', 'aqueous humour', 'milk substitute',
    'fruit juice', 'glowing lava', 'gastric acid', 'mineral water',
    'cough syrup', 'quicksilver', 'sweet vitriol', 'grey goo', 'pink slime',
    'cosmic latte', 'bone oil', 'custard', 'lard', 'vinegar', 'creosote',
];

/**
 * C ref: do_name.c hliquid — Hallu → rn2_on_display_rng over hliquids[]
 * (+ liquidpref as last choice when non-empty). gameover skips Hallu arm.
 */
export function hliquid(liquidpref) {
    const hallucinate = Hallucination() && !game.program_state?.gameover;
    const pref = liquidpref == null ? '' : String(liquidpref);
    if (hallucinate || !pref) {
        let count = HLIQUIDS.length;
        if (pref) count += 1;
        const indx = rn2_on_display_rng(count);
        if (indx >= 0 && indx < HLIQUIDS.length) return HLIQUIDS[indx];
    }
    return pref;
}

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
export function s_suffix(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/**
 * C ref: do_name.c x_monnam — named PM_GHOST → "<name>'s ghost" (ARTICLE_NONE).
 * name_at_start clears article for mon_nam / Monnam / y_monnam callers.
 */
function named_ghost_monnam(mtmp) {
    if (!mtmp || (mtmp.mnum | 0) !== PM_GHOST) return null;
    if (!has_mgivenname(mtmp)) return null;
    return `${s_suffix(MGIVENNAME(mtmp))} ghost`;
}

/**
 * C ref: do_name.c christen_monst — assign MGIVENNAME (pet / #name).
 */
export function christen_monst(mtmp, name) {
    if (!mtmp) return mtmp;
    let n = name || '';
    if (n.length >= PL_PSIZ) n = n.slice(0, PL_PSIZ - 1);
    if (!mtmp.mextra) mtmp.mextra = {};
    if (n) mtmp.mextra.mgivenname = n;
    else delete mtmp.mextra.mgivenname;
    // C: leash → update_inventory deferred
    return mtmp;
}

/**
 * C ref: do_name.c alreadynamed `:155–195`. Empty usrbuf refuses erase;
 * fuzzymatch vs monnambuf / "the " / "invisible " / " of "; Juiblex vs
 * "Jubilex". Caller: do_mgivenname reject arms.
 * @returns {Promise<boolean>}
 */
async function alreadynamed(mtmp, monnambuf, usrbuf) {
    const name = String(usrbuf ?? '');
    const shown = String(monnambuf ?? '');
    const ptr = mtmp?.data || mons(mtmp?.mnum);
    if (!name) {
        const name_not_title = !!(has_mgivenname(mtmp)
            || type_is_pname(ptr)
            || mtmp?.isshk);
        await pline(
            `${upstart(shown)} would rather keep ${
                is_rider(ptr) ? 'its' : mhis(mtmp)
            } existing ${name_not_title ? 'name' : 'title'}.`,
        );
        return true;
    }
    const pInv = strstri(shown, 'invisible ');
    const pOf = strstri(shown, ' of ');
    const thePref = shown.length >= 4
        && shown.slice(0, 4).toLowerCase() === 'the ';
    if (fuzzymatch(name, shown, ' -_', true)
        || (thePref && fuzzymatch(name, shown.slice(4), ' -_', true))
        || (pInv && fuzzymatch(name, pInv.slice(10), ' -_', true))
        || (pOf && fuzzymatch(name, pOf.slice(4), ' -_', true))) {
        if (is_rider(ptr)) {
            await pline(`${upstart(shown)} is already called that.`);
        } else {
            await pline(
                `${upstart(mhe(mtmp))} is already called ${shown}.`,
            );
        }
        return true;
    }
    const mndx = mtmp?.mnum ?? ptr?.mndx;
    if ((mndx | 0) === PM_JUIBLEX
        && strstri(shown, 'Juiblex')
        && name.toLowerCase() === 'jubilex') {
        await pline(
            `${upstart(shown)} doesn't like being called ${name}.`,
        );
        return true;
    }
    return false;
}

/**
 * C ref: do_name.c do_mgivenname `:198–282`. Caller: docallcmd `'m'`.
 * Hallu refuse; getpos; self/steed; m_at; swallow glyph_at; visibility;
 * name_from_player; G_UNIQ/shk/priest/ghost/ebones reject; else christen.
 * Named: SetVoice SND_LIB (empty macro); christen leash
 * update_inventory. Astral high-cleric conceal is D-1673.
 */
async function do_mgivenname() {
    if (Hallucination()) {
        await pline('You would never recognize it anyway.');
        return;
    }
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    if (await getpos(cc, false, 'the monster you want to name') < 0
        || !isok(cc.x, cc.y)) {
        return;
    }
    const cx = cc.x | 0;
    const cy = cc.y | 0;
    let mtmp = null;
    let do_swallow = false;

    if (u_at(cx, cy)) {
        if (u.usteed && canspotmon(u.usteed)) {
            mtmp = u.usteed;
        } else {
            await pline(
                `This ${beautiful()} creature is called ${
                    game.plname || 'Hero'
                } and cannot be renamed.`,
            );
            return;
        }
    } else {
        mtmp = m_at(cx, cy);
    }

    /* Allow you to name the monster that has swallowed you */
    if (!mtmp && u.uswallow) {
        if (glyph_is_swallow_at(cx, cy)) {
            mtmp = u.ustuck;
            do_swallow = true;
        }
    }

    const See_invisible = !!((u.HSee_invisible | 0)
        || (u.ESee_invisible | 0)
        || u.See_invisible);
    const ap = (mtmp?.m_ap_type | 0) & M_AP_TYPMASK;
    if (!do_swallow && (!mtmp
        || (!sensemon(mtmp)
            && (!(cansee(cx, cy) || see_with_infrared(mtmp))
                || mtmp.mundetected
                || ap === M_AP_FURNITURE
                || ap === M_AP_OBJECT
                || (mtmp.minvis && !See_invisible))))) {
        await pline('I see no monster there.');
        return;
    }

    const monnambuf = distant_monnam(mtmp, ARTICLE_THE);
    const qbuf = `What do you want to call ${monnambuf}?`;
    const buf = await name_from_player(
        qbuf,
        has_mgivenname(mtmp) ? MGIVENNAME(mtmp) : null,
    );
    if (buf == null) return;

    const ptr = mtmp.data || mons(mtmp.mnum);
    const mndx = mtmp.mnum ?? ptr?.mndx;
    const Deaf = !!((u.HDeaf | 0) || (u.EDeaf | 0)
        || u.uroleplay?.deaf || u.Deaf);
    const helpless = !!(mtmp.msleeping || !mtmp.mcanmove);
    const msound = ptr?.msound | 0;

    if (((ptr?.geno | 0) & G_UNIQ) && !mtmp.ispriest) {
        if (!await alreadynamed(mtmp, monnambuf, buf)) {
            await pline(
                `${upstart(monnambuf)} doesn't like being called names!`,
            );
        }
    } else if (mtmp.isshk
        && !(Deaf || helpless || msound <= MS_ANIMAL)) {
        if (!await alreadynamed(mtmp, monnambuf, buf)) {
            /* C SetVoice empty without SND_LIB */
            await verbalize(`I'm ${shkname(mtmp)}, not ${buf}.`);
        }
    } else if (mtmp.ispriest || mtmp.isminion || mtmp.isshk
        || (mndx | 0) === PM_GHOST || has_ebones(mtmp)) {
        if (!await alreadynamed(mtmp, monnambuf, buf)) {
            await pline(
                `${upstart(monnambuf)} will not accept the name ${buf}.`,
            );
        }
    } else {
        christen_monst(mtmp, buf);
    }
}

/**
 * C ref: do_name.c roguename — Rogue designer name for makerogueghost.
 * ROGUEOPTS env deferred (no Node env in scored js/).
 */
export function roguename() {
    return rn2(3)
        ? (rn2(2) ? 'Michael Toy' : 'Kenneth Arnold')
        : 'Glenn Wichman';
}

/** C ref: mondata.h type_is_pname — M2_PNAME proper-name monsters. */
export function type_is_pname(ptr) {
    return !!((ptr?.mflags2 ?? 0) & M2_PNAME);
}

/**
 * C ref: you.h Ugender — (Upolyd ? u.mfemale : flags.female) ? FEMALE : MALE.
 */
export function Ugender() {
    const u = game.u || {};
    const female = Upolyd(u) ? !!u.mfemale : !!game.flags?.female;
    return female ? FEMALE : MALE;
}

/**
 * C ref: do_name.c pmname / mondata.h pmname macro — gender-aware pmnames[].
 * `pm` is mndx or { mndx|mnum }. Preserves table casing.
 */
export function pmname(pm, mgender) {
    const mndx = typeof pm === 'number' ? pm : (pm?.mndx ?? pm?.mnum);
    if (mndx == null || mndx < 0 || !pmnames[mndx]) return 'monster';
    const names = pmnames[mndx];
    let g = mgender | 0;
    if (g < MALE || g >= 3 || !names[g]) g = NEUTRAL;
    return names[g] || names[NEUTRAL] || names[MALE] || names[FEMALE] || 'monster';
}

/**
 * C ref: do_name.c Mgender / mon_pmname — gender-aware pmnames[].
 * Preserves table casing (e.g. "Wizard of Yendor", not lowercased PM_).
 */
export function mon_pmname(mtmp) {
    const mndx = mtmp?.mnum ?? mtmp?.data?.mndx;
    if (mndx != null && mndx >= 0 && pmnames[mndx]) {
        const g = mtmp?.female ? FEMALE : MALE;
        return pmname(mndx, g);
    }
    const raw = mtmp?.data?.name || 'monster';
    return String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
}

function mon_plain_name(mtmp) {
    return mon_pmname(mtmp);
}

function highc_name(name) {
    if (!name) return 'It';
    return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * C ref: do_name.c x_monnam — M2_PNAME + !adjectives → ARTICLE_NONE.
 * Wizard of Yendor is not M2_PNAME, so mon_nam stays "the Wizard of Yendor".
 */
function article_the_prefix(mtmp, has_adjectives) {
    if (type_is_pname(mtmp?.data) && !has_adjectives) return '';
    return 'the ';
}

/**
 * C ref: do_name.c x_monnam — "saddled " when W_SADDLE && !Blind && !Hallu.
 * Hallu / Blind checked; SUPPRESS_SADDLE callers pass suppress (hack.h 0x08).
 */
function saddle_adj(mtmp, suppress = 0) {
    if (suppress & SUPPRESS_SADDLE) return '';
    if (game.u?.Blind || game.u?.ublind) return '';
    if (game.u?.Hallucination || Hallucination()) return '';
    if ((mtmp?.misc_worn_check || 0) & W_SADDLE) return 'saddled ';
    return '';
}

/**
 * C ref: do_name.c x_monnam — tame/name subset for displace and pet plines.
 * ARTICLE_YOUR + named pet → bare given name (name_at_start clears article).
 */
export function x_monnam_tame(mtmp) {
    if (!mtmp) return 'it';
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    const plain = mon_plain_name(mtmp);
    const sad = saddle_adj(mtmp);
    if (mtmp.mtame) return `your ${sad}${plain}`;
    // ARTICLE_YOUR demotes to ARTICLE_THE for non-tame; pname → no article
    return `${article_the_prefix(mtmp, !!sad)}${sad}${plain}`;
}

/**
 * C ref: do_name.c distant_monnam `:1178–1182` — high priest(ess)
 * identity concealed on the Astral Plane unless adjacent (hallu does
 * its own obfuscation). C `mon->data == &mons[PM_HIGH_CLERIC]`; JS
 * `mons()` is a fresh object so compare `data.mndx`. C `m_next2u` is
 * a you.h macro (`distu(mx,my) <= 2`); expand here, do not add clone
 * #6 of the named JS helper.
 * @returns {string|null}
 */
function astral_high_cleric_distant_nam(mon, article) {
    if (!mon || PM_HIGH_CLERIC < 0) return null;
    if ((mon.data?.mndx | 0) !== PM_HIGH_CLERIC) return null;
    if (Hallucination() || !Is_astralevel(game.u?.uz)) return null;
    const u = game.u || {};
    const dx = (mon.mx | 0) - (u.ux | 0);
    const dy = (mon.my | 0) - (u.uy | 0);
    if (dx * dx + dy * dy <= 2) return null;
    return (article === ARTICLE_THE ? 'the ' : '')
        + (mon.female ? 'high priestess' : 'high priest');
}

/**
 * C ref: do_name.c distant_monnam(ARTICLE_NONE) → x_monnam.
 * Shopkeeper → shkname (same arm as mon_nam / D-0307). C pager.c
 * `look_at_monster` uses distant_monnam ARTICLE_NONE (astral conceal
 * first). hallu / mappear / invis+non-PM_SHOPKEEPER suffix deferred.
 */
export function distant_monnam_none(mtmp) {
    if (!mtmp) return 'it';
    const hid = astral_high_cleric_distant_nam(mtmp, ARTICLE_NONE);
    if (hid != null) return hid;
    // C x_monnam: isshk && !hallu && !mappear → shkname
    if (mtmp.isshk) {
        const nam = shkname(mtmp);
        if (nam) return nam;
    }
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    return `${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`;
}

/**
 * C ref: do_name.c distant_monnam `:1168–1186` — ARTICLE_THE/NONE;
 * astral PM_HIGH_CLERIC conceal else x_monnam(..., TRUE).
 */
export function distant_monnam(mtmp, article = ARTICLE_THE) {
    const hid = astral_high_cleric_distant_nam(mtmp, article);
    if (hid != null) return hid;
    return x_monnam(mtmp, article, null, 0, true);
}

/**
 * C ref: do_name.c x_monnam — generic monster naming.
 * Covers: do_it, hallu/rndmonnam, isshk, given-name/ghost, adjective,
 * saddle, ARTICLE_*, M2_PNAME / Wizard article. Named omissions:
 * priest/minion priestname, M_AP_MONSTER mappear, invis adjective,
 * is_mplayer rank_of / "the " split, AUGMENT_IT someone/something,
 * youmonst.
 *
 * @param {object} mtmp
 * @param {number} article ARTICLE_NONE|THE|A|YOUR
 * @param {string|null|undefined} adjective e.g. "poor"
 * @param {number} suppress bitmask
 * @param {boolean} called
 */
export function x_monnam(mtmp, article, adjective, suppress = 0, called = false) {
    if (!mtmp) return 'it';

    let art = article | 0;
    let supp = suppress | 0;
    const adj = adjective || '';

    if (game.program_state?.gameover) supp |= SUPPRESS_HALLUCINATION;
    if (art === ARTICLE_YOUR && !mtmp.mtame) art = ARTICLE_THE;

    // C: uswallow && mtmp == u.ustuck → ARTICLE_THE + SUPPRESS_INVISIBLE
    if (game.u?.uswallow && mtmp === game.u?.ustuck) {
        art = ARTICLE_THE;
        supp |= SUPPRESS_INVISIBLE;
    }

    const do_hallu = Hallucination() && !(supp & SUPPRESS_HALLUCINATION);
    const do_invis = !!(mtmp.minvis) && !(supp & SUPPRESS_INVISIBLE);
    const do_it = !canspotmon(mtmp) && art !== ARTICLE_YOUR
        && !game.program_state?.gameover
        && mtmp !== game.u?.usteed
        && !engulfing_u(mtmp)
        && !(supp & SUPPRESS_IT);
    const do_saddle = !(supp & SUPPRESS_SADDLE);
    const do_name = !(supp & SUPPRESS_NAME) || type_is_pname(mtmp.data);
    // priest/minion / mappear deferred — fall through to ordinary arms

    if (do_it) {
        // AUGMENT_IT someone/something deferred
        return 'it';
    }

    // Shopkeepers: shkname (+ adjective ARTICLE_THE arm)
    if (mtmp.isshk && !do_hallu /* && !do_mappear deferred */) {
        const nam = shkname(mtmp) || '';
        if (adj && art === ARTICLE_THE) {
            return `the ${adj} ${nam}`;
        }
        const mndx = mtmp.mnum ?? mtmp.data?.mndx;
        if (mndx !== PM_SHOPKEEPER || do_invis) {
            let buf = nam;
            buf += ' the ';
            if (do_invis) buf += 'invisible ';
            buf += mon_pmname(mtmp);
            return buf;
        }
        return nam;
    }

    let buf = '';
    if (adj) buf += `${adj} `;
    // invis adjective deferred (do_invis) — prior mon_nam omitted it too
    void do_invis;
    if (do_saddle) buf += saddle_adj(mtmp, 0);
    const has_adjectives = buf.length > 0;

    let name_at_start = false;
    if (do_hallu) {
        const codeOut = { c: '' };
        const rname = rndmonnam(codeOut);
        buf += rname;
        name_at_start = bogon_is_pname(codeOut.c);
    } else if (do_name && has_mgivenname(mtmp)) {
        const name = MGIVENNAME(mtmp);
        if ((mtmp.mnum | 0) === PM_GHOST) {
            buf += `${s_suffix(name)} ghost`;
            name_at_start = true;
        } else if (called) {
            buf += `${mon_pmname(mtmp)} called ${name}`;
            name_at_start = type_is_pname(mtmp.data);
        } else {
            // is_mplayer " the " split deferred
            buf += name;
            name_at_start = true;
        }
    } else {
        // is_mplayer rank_of deferred — use type name
        buf += mon_pmname(mtmp);
        name_at_start = type_is_pname(mtmp.data);
    }

    if (name_at_start && (art === ARTICLE_YOUR || !has_adjectives)) {
        if ((mtmp.mnum | 0) === PM_WIZARD_OF_YENDOR) art = ARTICLE_THE;
        else art = ARTICLE_NONE;
    } else if (((mtmp.data?.geno | 0) & G_UNIQ) !== 0 && art === ARTICLE_A) {
        art = ARTICLE_THE;
    }

    switch (art) {
    case ARTICLE_YOUR:
        return `your ${buf}`;
    case ARTICLE_THE:
        return `the ${buf}`;
    case ARTICLE_A:
        return an(buf);
    case ARTICLE_NONE:
    default:
        return buf;
    }
}

/**
 * C ref: do_name.c noname_monnam `:1101–1105` — x_monnam with SUPPRESS_NAME
 * so a named monster still yields "a <type>" (newcham NC_SHOW_MSG).
 */
export function noname_monnam(mtmp, article) {
    return x_monnam(mtmp, article, null, SUPPRESS_NAME, false);
}

/**
 * C ref: do_name.c mon_nam — ARTICLE_THE; unseen → "it"; named → bare name.
 * Shopkeeper → shkname (D-0307). Hallu → rndmonnam (D-0838).
 * Invis adj / priest / AUGMENT_IT deferred (via x_monnam omissions).
 */
export function mon_nam(mtmp) {
    return x_monnam(
        mtmp,
        ARTICLE_THE,
        null,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
        false,
    );
}

/**
 * C ref: do_name.c mon_nam_too `:1189–1216` — `mon_nam` for anyone but
 * the monster itself; when the two are the same, the reflexive pronoun
 * that `pronoun_gender(mon, PRONOUN_HALLU)` picks. That call draws
 * `rn2(4)` **first** while hallucinating (D-1776), so this is an
 * RNG-visible helper, and index 3 ("group") is reachable only then —
 * which is where "themselves" comes from.
 */
export function mon_nam_too(mon, other_mon) {
    if (mon !== other_mon) return mon_nam(mon);
    switch (pronoun_gender(mon, PRONOUN_HALLU)) {
    case 0:
        return 'himself';
    case 1:
        return 'herself';
    case 3: /* could happen when hallucinating */
        return 'themselves';
    default:
    case 2:
        return 'itself';
    }
}

/**
 * C ref: do_name.c monverbself `:1219–1249` — build
 * "<monnamtext> <verb> <othertext> {him|her|it}self", with the verb and
 * the subject dragged into the plural when Hallucination made the
 * reflexive "themselves".
 *
 * `verb` arrives plural, so `vtense(selfbuf, verb)` normally returns the
 * singular; getting the verb back unchanged is C's test for "the
 * reflexive stayed plural", and only then is the subject pluralised.
 *
 * The genders[3] fixup is ported exactly as C **writes** it, not as C's
 * comment describes it: the comment says makeplural turns "it" into
 * "them" and wants "they", but `makeplural` matches `genders[2].he`
 * first and yields "they", and this arm then rewrites that to
 * `genders[3].him` — "them". So C prints "Them rouse themselves!" for a
 * hallucinated steed, and "Theys …" when the subject was already "They"
 * (makeplural's default `s`). Do not "correct" this to "they"; the
 * scored comparison is against the C build.
 */
export function monverbself(mon, monnamtext, verb, othertext) {
    /* "himself"/"herself"/"itself", maybe "themselves" if hallucinating */
    const selfbuf = mon_nam_too(mon, mon);
    /* verb starts plural; this yields singular except for "themselves" */
    const verbs = vtense(selfbuf, verb);
    let text = String(monnamtext ?? '');

    if (verb === verbs) { /* a match indicates that it stayed plural */
        text = makeplural(text);
        /* C `:1236–1244` — see the note above on he-vs-him here */
        if (text.toLowerCase() === genders[3].he) {
            const capitaliz = text.charAt(0) === highc(text.charAt(0));
            text = genders[3].him;
            if (capitaliz) text = highc(text.charAt(0)) + text.slice(1);
        }
    }
    let out = `${text} ${verbs}`;
    if (othertext) out += ` ${othertext}`;
    return `${out} ${selfbuf}`;
}

/**
 * C ref: do_name.c a_monnam — ARTICLE_A; SUPPRESS_SADDLE when named.
 */
export function a_monnam(mtmp) {
    return x_monnam(
        mtmp,
        ARTICLE_A,
        null,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
        false,
    );
}

/**
 * C ref: do_name.c Amonnam — highc(a_monnam()).
 */
export function Amonnam(mtmp) {
    return highc_name(a_monnam(mtmp));
}

/**
 * C ref: do_name.c Adjmonnam — ARTICLE_THE + adjective, then highc.
 * Unseen still "It" (x_monnam do_it). Named: invis adj / priest polish.
 */
export function Adjmonnam(mtmp, adj) {
    return highc_name(x_monnam(
        mtmp,
        ARTICLE_THE,
        adj,
        has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0,
        false,
    ));
}

/**
 * C ref: do_name.c Monnam — highc(mon_nam()).
 */
export function Monnam(mtmp) {
    return highc_name(mon_nam(mtmp));
}

/**
 * C ref: do_name.c y_monnam — ARTICLE_YOUR for pets, ARTICLE_THE else.
 * SUPPRESS_SADDLE when named or usteed.
 */
export function y_monnam(mtmp) {
    if (!mtmp) return 'it';
    const prefix = mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE;
    const suppression = (has_mgivenname(mtmp) || mtmp === game.u?.usteed)
        ? SUPPRESS_SADDLE
        : 0;
    return x_monnam(mtmp, prefix, null, suppression, false);
}

set_y_monnam(y_monnam);

/**
 * C ref: do_name.c noit_mon_nam / noit_Monnam — ARTICLE_YOUR + SUPPRESS_IT.
 * Never "it"; named → bare; hallu deferred.
 */
export function noit_Monnam(mtmp) {
    if (!mtmp) return 'It';
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return highc_name(ghost);
    if (has_mgivenname(mtmp)) return highc_name(MGIVENNAME(mtmp));
    if (mtmp.mtame) {
        return highc_name(`your ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`);
    }
    // SUPPRESS_IT — type name even when !canspotmon
    const sad = saddle_adj(mtmp);
    return highc_name(
        `${article_the_prefix(mtmp, !!sad)}${sad}${mon_plain_name(mtmp)}`,
    );
}

/** C ref: do_name.c noit_mon_nam — lowercase noit_Monnam. */
export function noit_mon_nam(mtmp) {
    if (!mtmp) return 'it';
    const ghost = named_ghost_monnam(mtmp);
    if (ghost) return ghost;
    if (has_mgivenname(mtmp)) return MGIVENNAME(mtmp);
    if (mtmp.mtame) {
        return `your ${saddle_adj(mtmp)}${mon_plain_name(mtmp)}`;
    }
    const sad = saddle_adj(mtmp);
    return `${article_the_prefix(mtmp, !!sad)}${sad}${mon_plain_name(mtmp)}`;
}

set_noit_mon_nam(noit_mon_nam);

/**
 * C ref: do_name.c oname `:371–426` — assign name; may create an
 * artifact via artifact_exists. via_naming literate++ livelog when
 * naming produces Sting/Orcrist (D-1680).
 * Named: `untwoweapon` You() (pline is async; oname stays sync).
 */
export function oname(obj, name, oflgs = 0) {
    if (!obj) return obj;
    const via_naming = (oflgs & ONAME_VIA_NAMING) !== 0;
    const skip_inv_update = (oflgs & ONAME_SKIP_INVUPD) !== 0;
    let n = name || '';
    if (n.length >= PL_PSIZ) n = n.slice(0, PL_PSIZ - 1);

    /* If named artifact exists in the game, do not create another.
       Also trying to create an artifact shouldn't de-artifact it. */
    if (obj.oartifact || (n && exist_artifact(obj.otyp, n))) {
        return obj;
    }

    const lth = n ? n.length + 1 : 0;
    new_oname(obj, lth);
    if (lth) obj.oextra.oname = n;

    if (lth) artifact_exists(obj, n, true, oflgs | 0);
    if (obj.oartifact) {
        const u = game.u || (game.u = {});
        /* can't dual-wield with artifact as secondary weapon */
        if (obj === u.uswapwep && u.twoweap) {
            set_twoweap(false);
            update_inventory();
        }
        /* activate warning if you've just named your weapon "Sting" */
        if (obj === u.uwep) set_artifact_intrinsic(obj, true, W_WEP);
        /* if obj is owned by a shop, increase your bill */
        if (obj.unpaid) alter_cost(obj, 0);
        if (via_naming) {
            /* violate illiteracy since successfully wrote arti-name */
            if (!u.uconduct) u.uconduct = {};
            const first = !(u.uconduct.literate | 0);
            u.uconduct.literate = (u.uconduct.literate | 0) + 1;
            if (first) {
                livelog_printf(
                    LL_CONDUCT | LL_ARTIFACT,
                    'became literate by naming %s',
                    bare_artifactname(obj),
                );
            } else {
                livelog_printf(
                    LL_ARTIFACT,
                    'chose %s to be named "%s"',
                    ansimpleoname(obj),
                    bare_artifactname(obj),
                );
            }
        }
    }
    if ((obj.where | 0) === OBJ_INVENT && !skip_inv_update) {
        update_inventory();
    }
    return obj;
}

export function safe_oname(obj) {
    return obj?.oextra?.oname || '';
}

/** C ref: do_name.c free_oname — drop oname; keep oextra. */
export function free_oname(obj) {
    if (has_oname(obj)) delete obj.oextra.oname;
}

/* C ref: do_name.c NVL_* — indices into sir_Terry_novels[] for aliases. */
const NVL_COLOUR_OF_MAGIC = 0;
const NVL_SOURCERY = 4;
const NVL_MASKERADE = 17;
const NVL_AMAZING_MAURICE = 27;
const NVL_THUD = 33;

/**
 * C ref: do_name.c lookup_novel `:1626–1661` — canonical Discworld title
 * from a player/level name. Alias spellings first, then strcmpi vs the
 * table or The(lookname). Stores k in *idx (JS otmp.novelidx). Miss
 * with IndexOk(*idx) returns the already-chosen title (wish after
 * mksobj SPE_NOVEL). Inline fold, not strcmpi clone #3 (vault/write).
 * @param {string} lookname
 * @param {object|null} [otmp] C int *idx; omit skips store / miss fallback
 * @returns {string|null}
 */
export function lookup_novel(lookname, otmp) {
    let name = lookname == null ? '' : String(lookname);
    const novels = SIR_TERRY_NOVELS;
    const eq = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

    if (eq(The(name), 'The Color of Magic')) {
        name = novels[NVL_COLOUR_OF_MAGIC];
    } else if (eq(name, 'Sorcery')) {
        name = novels[NVL_SOURCERY];
    } else if (eq(name, 'Masquerade')) {
        name = novels[NVL_MASKERADE];
    } else if (eq(The(name), 'The Amazing Maurice')) {
        name = novels[NVL_AMAZING_MAURICE];
    } else if (eq(name, 'Thud')) {
        name = novels[NVL_THUD];
    }

    for (let k = 0; k < novels.length; ++k) {
        if (eq(name, novels[k]) || eq(The(name), novels[k])) {
            if (otmp) otmp.novelidx = k;
            return novels[k];
        }
    }
    /* name not found; if novelidx is already set, override the name */
    if (otmp) {
        const idx = otmp.novelidx | 0;
        if (idx >= 0 && idx < novels.length) return novels[idx];
    }
    return null;
}

/**
 * C ref: do_name.c new_oname — alloc oname (lth includes NUL in C);
 * removes the old name if present. Caller strcpy's into ONAME.
 */
export function new_oname(obj, lth) {
    if (!obj) return;
    if (lth) {
        if (!obj.oextra) obj.oextra = {};
        else free_oname(obj);
        obj.oextra.oname = '';
    } else if (has_oname(obj)) {
        free_oname(obj);
    }
}

/** C ref: hacklib.c upstart — capitalize first letter. */
function upstart(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/* C do_name.c rndorcname syllable tables */
const ORC_V = ['a', 'ai', 'og', 'u'];
const ORC_SND = [
    'gor', 'gris', 'un', 'bane', 'ruk', 'oth', 'ul', 'z', 'thos', 'akh', 'hai',
];

/**
 * C ref: do_name.c rndorcname — rn1(2,3) syllables; v/snd flip;
 * rare '-' via !rn2(30). Callers always pass a buffer.
 */
export function rndorcname() {
    const iend = rn1(2, 3);
    let vstart = rn2(2);
    let s = '';
    for (let i = 0; i < iend; ++i) {
        vstart = 1 - vstart;
        const dash = (i > 0 && !rn2(30)) ? '-' : '';
        s += dash + (vstart ? ORC_V[rn2(ORC_V.length)] : ORC_SND[rn2(ORC_SND.length)]);
    }
    return s;
}

/**
 * C ref: do_name.c christen_orc — rndorcname + " of gang" or other
 * suffix when sz < BUFSZ. Caller: dokick.c deliver_obj_to_mon.
 */
export function christen_orc(mtmp, gang, other) {
    const orcname = rndorcname();
    let sz = orcname.length;
    if (gang) sz += String(gang).length + 4; /* sizeof " of " - 1 */
    else if (other) sz += String(other).length;
    if (sz < BUFSZ) {
        let buf = '';
        let nameit = false;
        if (gang) {
            buf = `${upstart(orcname)} of ${upstart(gang)}`;
            nameit = true;
        } else if (other) {
            buf = `${upstart(orcname)}${other}`;
            nameit = true;
        }
        if (nameit) mtmp = christen_monst(mtmp, buf);
    }
    return mtmp;
}

/**
 * C cmd.c `_cmd_queue.key` — invent `cmdq_add_key` stores a string;
 * iactions/apply canned clones store a char code.
 * @param {{ key?: string|number }} cq
 */
function cmdq_key_ch(cq) {
    if (typeof cq.key === 'string') return cq.key.charAt(0);
    if (typeof cq.key === 'number') return String.fromCharCode(cq.key);
    return '';
}

/**
 * C do_name.c docallcmd add_menu `:520–550` + select_menu.
 * acc = lootabc ? 0 : a_char; gacc C/y/n/,/\/l. i/o only when gi.invent.
 * Interactive analogue keeps the nhgetch loop (C select_menu inner);
 * Space/Return with no pick re-prompts (existing JS; C n==0 → 'q').
 * @returns {Promise<string>} item a_char, or 'q'
 */
async function docallcmd_menu() {
    const abc = !!(game.flags && game.flags.lootabc);
    const hasInvent = !!(game.invent && game.invent.length);
    const rows = [
        { acc: 'm', gacc: 'C', text: 'a monster' },
        ...(hasInvent ? [
            { acc: 'i', gacc: 'y', text: 'a particular object in inventory' },
            { acc: 'o', gacc: 'n', text: 'the type of an object in inventory' },
        ] : []),
        { acc: 'f', gacc: ',', text: 'the type of an object upon the floor' },
        { acc: 'd', gacc: '\\', text: 'the type of an object on discoveries list' },
        { acc: 'a', gacc: 'l', text: 'record an annotation for the current level' },
    ];
    const entries = [
        { text: 'What do you want to name?', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        ...rows.map((it) => ({
            text: `${abc ? it.gacc : it.acc} - ${it.text}`,
            attr: 0,
        })),
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        const raw = String.fromCharCode(key);
        if (key === 27 || raw === 'q') return 'q';
        if (raw === '\r' || raw === '\n' || raw === ' ') continue;
        for (const it of rows) {
            if (raw === it.gacc) return it.acc;
            if (!abc && raw === it.acc) return it.acc;
        }
    }
}

/**
 * C ref: do_name.c docallcmd `:498–601` — cmdq_pop canned then
 * "What do you want to name?" menu (D-1671).
 * `m` → do_mgivenname; `i` → getobj("name", name_ok, GETOBJ_PROMPT)
 * then do_oname (D-1681); `o` → getobj("call", call_ok, GETOBJ_NOFLAGS)
 * then xname + dknown/docall (D-1660); `f` → namefloorobj; `d`/`\\` →
 * o_init.c rename_disco.
 * C `:581–585` #if 0 `call_ok==GETOBJ_EXCLUDE` You("know those as
 * well") is compiled out (D-1682). Live EXCLUDE is getobj →
 * silly_thing (Call Amulet / unknown fake).
 */
export async function docallcmd() {
    await flush_topl_more();
    let ch = '';
    const cmdq = cmdq_pop();
    if (cmdq) {
        // C `:511–518` KEY → ch; else cmdq_clear(CQ_CANNED); goto switch
        if (cmdq.typ === CMDQ_KEY || cmdq.typ === 'key') {
            ch = cmdq_key_ch(cmdq);
        } else {
            cmdq_clear(CQ_CANNED);
        }
    } else {
        ch = await docallcmd_menu();
    }
    switch (ch) {
    default:
    case 'q':
        break;
    case 'm':
        await do_mgivenname();
        break;
    case 'i':
        {
            const obj = await getobj('name', name_ok, GETOBJ_PROMPT);
            if (obj) await do_oname(obj);
        }
        break;
    case 'o':
        {
            const obj = await getobj('call', call_ok, GETOBJ_NOFLAGS);
            if (obj) {
                /* behave as if examining it in inventory;
                   this might set dknown if it was picked up
                   while blind and the hero can now see */
                xname(obj);
                if (!obj.dknown) {
                    await pline('You would never recognize another one.');
                } else {
                    /* C `:581–585` #if 0 GETOBJ_EXCLUDE arm compiled out. */
                    await docall(obj);
                }
            }
        }
        break;
    case 'f':
        await namefloorobj();
        break;
    case 'd':
        await rename_disco();
        break;
    case 'a':
        {
            const { donamelevel } = await import('./dungeon.js');
            await donamelevel();
        }
        break;
    }
    return ECMD_OK;
}

/**
 * C ref: do_name.c namefloorobj `:678–757`.
 * Caller: docallcmd `'f'`. getpos then vobj_at (hero cell) or
 * glyph_is_object + object_from_map; Hallu display-rng names; else
 * call_ok / dknown / docall. Fakeobj: OBJ_FREE (GC; no dealloc_obj clone).
 */
async function namefloorobj() {
    const u = game.u || {};
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    // C: gy.youmonst.data — current form (hide-under vs over)
    const youdata = game.youmonst?.data || u.data;
    const overunder = (u.uundetected && hides_under(youdata))
        ? 'over' : 'under';
    const goal = `object on map (or '.' for one ${overunder} you)`;
    if (await getpos(cc, false, goal) < 0 || (cc.x | 0) <= 0) return;

    let obj = null;
    let fakeobj = false;
    if (u_at(cc.x, cc.y)) {
        // C: vobj_at(u.ux, u.uy) — display.h level.objects[x][y]
        obj = objects_at(u.ux, u.uy);
    } else {
        const glyphotyp = glyph_to_obj_at(cc.x, cc.y);
        if (glyphotyp >= 0) {
            const frommap = object_from_map(glyphotyp, cc.x, cc.y);
            fakeobj = !!frommap.fakeobj;
            obj = frommap.otmp;
        }
    }
    if (!obj) {
        await pline(`There doesn't seem to be any object ${
            u_at(cc.x, cc.y) ? 'under you' : 'there'}.`);
        return;
    }
    /* C: STRANGE_OBJECT (mimic) skips simpleonames → "glorkum" */
    const buf = ((obj.otyp | 0) !== STRANGE_OBJECT)
        ? simpleonames(obj)
        : (objectNameStrs[STRANGE_OBJECT] || 'strange object');
    const use_plural = (obj.quan | 0) > 1;
    if (Hallucination()) {
        const unames = new Array(6);
        // C: Upolyd ? u.mfemale : flags.female
        const female = Upolyd(u) ? u.mfemale : game.flags?.female;
        const urole = game.urole || {};
        unames[0] = (female && urole.name?.f) ? urole.name.f
            : (urole.name?.m || 'Player');
        /* C: 30 is hardcoded in xlev_to_rank */
        unames[1] = rank_of(
            rn2_on_display_rng(30) + 1,
            urole.mnum | 0, // C Role_switch
            !!game.flags?.female,
        );
        unames[2] = bogusmon(null);
        unames[3] = unames[2];
        unames[4] = roguename();
        unames[5] = 'Wibbly Wobbly';
        await pline(`${The(buf)} ${use_plural ? 'decide' : 'decides'} to call you "${
            unames[rn2_on_display_rng(unames.length)]}."`);
    } else if (call_ok(obj) === GETOBJ_EXCLUDE) {
        await pline(`${use_plural ? 'Those' : 'That'} ${buf} can't be assigned a type name.`);
    } else if (!obj.dknown) {
        await pline(`You don't know ${use_plural ? 'those' : 'that'} ${buf} well enough to name ${
            use_plural ? 'them' : 'it'}.`);
    } else {
        await docall(obj);
    }
    if (fakeobj) {
        obj.where = OBJ_FREE; /* object_from_map set OBJ_FLOOR */
    }
}

/**
 * C do_name.c docall_xname `:604–633` — copy, quan=1, drop oextra, clear
 * BUC; then class/otyp fixups so xname is callable-type caliber (not
 * doname). C odiluted overlays oeroded; JS keeps a separate field.
 */
function docall_xname(obj) {
    const otemp = {
        ...obj,
        oextra: null,
        quan: 1,
        blessed: 0,
        cursed: 0,
    };
    if (otemp.oclass === WEAPON_CLASS) {
        otemp.opoisoned = 0; /* not poisoned */
    } else if (otemp.oclass === POTION_CLASS) {
        otemp.odiluted = 0; /* not diluted */
    } else if (otemp.otyp === TOWEL || otemp.otyp === STATUE) {
        otemp.spe = 0; /* not wet or historic */
    } else if (otemp.otyp === TIN) {
        otemp.known = 0; /* suppress tin type (homemade, &c) and mon type */
    } else if (otemp.otyp === FIGURINE) {
        otemp.corpsenm = NON_PM; /* suppress mon type */
    } else if (otemp.otyp === HEAVY_IRON_BALL) {
        otemp.owt = game.objects?.[HEAVY_IRON_BALL]?.oc_weight | 0;
    } else if (otemp.oclass === FOOD_CLASS && otemp.globby) {
        otemp.owt = 120; /* 6*20, neither a small glob nor a large one */
    }
    return an(xname(otemp));
}

export async function trycall(obj) {
    if (!obj) return;
    const ocl = game.objects?.[obj.otyp];
    if (!ocl) return;
    if (!ocl.oc_name_known && !ocl.oc_uname) await docall(obj);
}

/**
 * C do_name.c docall `:635–676` — dknown then flush_screen(1); sink
 * potion uses OBJ_DESCR fluid prompt, else safe_qbuf Call/:/thing.
 * C fromsink overlays corpsenm; fountain.js also sets .fromsink.
 */
export async function docall(obj) {
    if (!obj?.dknown) return; /* probably blind; Blind || Hallucination for 'fromsink' */
    await flush_screen(1); /* buffered updates might matter to player's response */

    let qbuf;
    const fromsink = !!(obj.fromsink || (obj.corpsenm | 0) === 1);
    if (obj.oclass === POTION_CLASS && fromsink) {
        /* fromsink: kludge, meaning it's sink water */
        const oclObj = game.objects?.[obj.otyp];
        const descr = objectDescrs[oclObj?.oc_descr_idx ?? obj.otyp] || '';
        qbuf = `Call a stream of ${descr} fluid:`;
    } else {
        qbuf = safe_qbuf(
            null, 'Call ', ':', obj,
            docall_xname, simpleonames, 'thing',
        );
    }
    const ocl = game.objects?.[obj.otyp];
    if (!ocl) return;
    /* pointer to old name */
    const buf = await name_from_player(qbuf, ocl.oc_uname);
    if (buf == null) return;

    const hadName = !!ocl.oc_uname;
    ocl.oc_uname = null; /* clear oc_uname */

    /* name_from_player already mungspaces; empty uncalls */
    if (!buf) {
        if (hadName) /* possibly remove from disco[]; old *uname_p is gone */
            undiscover_object(obj.otyp);
    } else {
        ocl.oc_uname = buf;
        discover_object(obj.otyp, false, true, true); /* possibly add to disco[] */
    }
    /* C: obj->where == OBJ_INVENT || carrying(obj->otyp). invent.c
       carrying stays the 4 existing clones — inline the || walk. */
    let same = obj.where === OBJ_INVENT;
    if (!same) {
        const inv = game.gi?.invent ?? game.invent;
        if (Array.isArray(inv)) {
            for (const otmp of inv) {
                if (otmp && otmp.otyp === obj.otyp) {
                    same = true;
                    break;
                }
            }
        } else {
            for (let otmp = inv; otmp; otmp = otmp.nobj) {
                if (otmp.otyp === obj.otyp) {
                    same = true;
                    break;
                }
            }
        }
    }
    if (same) update_inventory();
}
