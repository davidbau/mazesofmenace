// do_name.js — Object naming helpers (partial).
// C ref: do_name.c oname / artifact naming / docallcmd.

import { artifact_exists, exist_artifact } from './artifact.js';
import { game } from './gstate.js';
import { rn2, rn2_on_display_rng } from './rng.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, docrt, canspotmon } from './display.js';
import { paint_corner_nhw_menu, discover_object } from './invent.js';
import {
    ONAME_VIA_NAMING, MGIVENNAME, has_mgivenname, W_SADDLE, engulfing_u,
    Upolyd, MD_PAD_BOGONS,
    ARTICLE_NONE, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR,
    SUPPRESS_IT, SUPPRESS_INVISIBLE, SUPPRESS_HALLUCINATION,
    SUPPRESS_SADDLE, SUPPRESS_NAME,
} from './const.js';
import { ATR_INVERSE } from './terminal.js';
import { shkname } from './shknam.js';
import { monsterNames } from './generated/monsters_data.js';
import {
    M2_PNAME, MALE, FEMALE, NEUTRAL, pmnames, G_NOGEN, G_UNIQ, mons,
    LOW_PM, SPECIAL_PM,
} from './monsters.js';
import { getlin } from './getline.js';
import { an, xname } from './objnam.js';
import { POTION_CLASS } from './objects.js';
import { get_rnd_text } from './rumors.js';
import { BOGUSMON_BUF } from './generated/bogusmon_data.js';

const PL_PSIZ = 32; // C: PL_PSIZ player-name / oname buffer
const PM_GHOST = monsterNames.indexOf('PM_GHOST');
const PM_WIZARD_OF_YENDOR = monsterNames.indexOf('PM_WIZARD_OF_YENDOR');
const PM_SHOPKEEPER = monsterNames.indexOf('PM_SHOPKEEPER');
const BOGUSMONSIZE = 100; // C: do_name.c rndmonnam
const BOGON_CODES = '-_+|=';

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
function s_suffix(s) {
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
function mon_pmname(mtmp) {
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
 * C ref: do_name.c distant_monnam(ARTICLE_NONE) → x_monnam.
 * Shopkeeper → shkname (same arm as mon_nam / D-0307). Astral high-cleric
 * conceal deferred; hallu / mappear / invis+non-PM_SHOPKEEPER suffix deferred.
 */
export function distant_monnam_none(mtmp) {
    if (!mtmp) return 'it';
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
 * C ref: do_name.c Monnam — highc(mon_nam()).
 */
export function Monnam(mtmp) {
    return highc_name(mon_nam(mtmp));
}

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

/**
 * C ref: do_name.c oname — assign name; may create artifact via artifact_exists.
 */
export function oname(obj, name, oflgs = 0) {
    if (!obj) return obj;
    let n = name || '';
    if (n.length >= PL_PSIZ) n = n.slice(0, PL_PSIZ - 1);

    // If already artifact or named artifact exists, keep current
    if (obj.oartifact || (n && exist_artifact(obj.otyp, n))) {
        return obj;
    }

    if (!obj.oextra) obj.oextra = {};
    if (n) obj.oextra.oname = n;
    else delete obj.oextra.oname;

    if (n) artifact_exists(obj, n, true, oflgs | 0);

    // Dual-wield / intrinsic / shop / literate paths deferred
    void (oflgs & ONAME_VIA_NAMING);
    return obj;
}

export function safe_oname(obj) {
    return obj?.oextra?.oname || '';
}

/**
 * C ref: do_name.c docallcmd — "What do you want to name?" menu.
 * Cancel and floor getpos-cancel paths; other branches named deferred.
 */
export async function docallcmd() {
    await flush_topl_more();
    const entries = [
        { text: 'What do you want to name?', attr: ATR_INVERSE },
        { text: '', attr: 0 },
        { text: 'm - a monster', attr: 0 },
        { text: 'i - a particular object in inventory', attr: 0 },
        { text: 'o - the type of an object in inventory', attr: 0 },
        { text: 'f - the type of an object upon the floor', attr: 0 },
        { text: 'd - the type of an object on discoveries list', attr: 0 },
        { text: 'a - record an annotation for the current level', attr: 0 },
    ];
    for (;;) {
        await paint_corner_nhw_menu(entries, '(end) ');
        const key = await nhgetch();
        game._menu_overlay = false;
        await docrt();
        await flush_screen(1);
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === 'q') return;
        // C select_menu: Enter/space with no pick → re-prompt (n==0)
        if (ch === '\r' || ch === '\n' || ch === ' ') continue;
        if (ch === 'f' || ch === ',') {
            await namefloorobj_stub();
            return;
        }
        if (ch === 'i' || ch === 'y') {
            await name_invent_obj_stub();
            return;
        }
        if (ch === 'a' || ch === 'l') {
            const { donamelevel } = await import('./dungeon.js');
            await donamelevel();
            return;
        }
        if (ch === 'm' || ch === 'C' || ch === 'o' || ch === 'n'
            || ch === 'd' || ch === '\\') {
            return;
        }
    }
}

/** C ref: docallcmd case 'i' → getobj("name") — cancel via Esc. */
async function name_invent_obj_stub() {
    game._pending_message = 'What do you want to name? [?] ';
    await flush_screen(1);
    for (;;) {
        const key = await nhgetch();
        if (key === 27 || key === 13 || key === 10) {
            game._pending_message = '';
            return;
        }
    }
}

/**
 * C ref: do_name.c namefloorobj — getpos subset; Esc cancels.
 * hjkl move a targeting cursor, not the hero.
 */
async function namefloorobj_stub() {
    game._pending_message = "object on map (or '.' for one under you)";
    await flush_screen(1);
    for (;;) {
        const key = await nhgetch();
        if (key === 27) {
            game._pending_message = '';
            return;
        }
    }
}

/**
 * C ref: do_name.c docall_xname — quan=1, clear b/c/odiluted for potions.
 */
function docall_xname(obj) {
    const otemp = {
        ...obj,
        quan: 1,
        blessed: 0,
        cursed: 0,
        odiluted: 0,
        oextra: null,
    };
    return an(xname(otemp));
}

export async function trycall(obj) {
    if (!obj) return;
    const ocl = game.objects?.[obj.otyp];
    if (!ocl) return;
    if (!ocl.oc_name_known && !ocl.oc_uname) await docall(obj);
}

/**
 * C ref: do_name.c docall — prompt "Call <xname>:" then getlin → oc_uname.
 * Sink-fluid prompt and safe_qbuf fallbacks deferred.
 */
export async function docall(obj) {
    if (!obj?.dknown) return;
    await flush_screen(1);
    let qbuf;
    if (obj.oclass === POTION_CLASS && obj.fromsink) {
        const descr = game.objects?.[obj.otyp]?.oc_descr
            || game.objects?.[obj.otyp]?.descr
            || 'clear';
        qbuf = `Call a stream of ${descr} fluid:`;
    } else {
        qbuf = `Call ${docall_xname(obj)}:`;
    }
    const buf = await getlin(qbuf);
    if (!buf || buf === '\x1b') return;

    const ocl = game.objects?.[obj.otyp];
    if (!ocl) return;
    const hadName = !!ocl.oc_uname;
    ocl.oc_uname = null;

    const name = buf.trim().replace(/\s+/g, ' ');
    if (!name) {
        // undiscover_object deferred when clearing a prior call name
        void hadName;
    } else {
        ocl.oc_uname = name.length >= PL_PSIZ ? name.slice(0, PL_PSIZ - 1) : name;
        // C: discover_object(otyp, FALSE, TRUE, TRUE)
        discover_object(obj.otyp, false, true, true);
    }
    // update_inventory deferred
}
