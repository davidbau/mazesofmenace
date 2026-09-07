// engrave.js — engravings.
// C ref: src/engrave.c
//
// Only the level-generation entry points are ported so far: random_engraving()
// and wipeout_text(), which mklev.c calls when it decorates a room. Both are
// heavy PRNG consumers and were previously a single invented rn2(48).

import { ceiling } from './dungeon.js';
import { game } from './gstate.js';
import { is_ice, db_under_typ } from './dbridge.js';
import { rn1, rn2, rnd } from './rng.js';
import { can_reach_floor } from './pickup.js';
import { getrumor, get_rnd_text, MD_PAD_RUMORS, xcrypt } from './rumors.js';
import { COLNO, ROWNO, DUST, ENGRAVE, BURN, MARK, HEADSTONE, ENGR_BLOOD,
         N_ENGRAVE, ECMD_OK, ECMD_TIME, ECMD_CANCEL, IS_FOUNTAIN, IS_AIR, ACCESSIBLE, CLOUD, IS_ALTAR, FINGERTIP, HAND, ECMD_FAIL, WAND_BACKFIRE_CHANCE, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, BUFSZ, LL_CONDUCT } from './const.js';
import { getobj, GETOBJ_PROMPT, GETOBJ_SUGGEST, GETOBJ_DOWNPLAY, hands_obj, useup, obj_extract_self, hold_another_object, prinv, update_inventory } from './invent.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { is_pool, is_lava, is_blade } from './mon.js';
import { Norep, You, pline_The, set_msg_xy, You_cant, Your, There, livelog_printf } from './pline.js';
import { canspotmon, pline, newsym } from './display.js';
import { getlin } from './cmd.js';
import { set_occupation } from './allmain.js';
import { exercise } from './attrib.js';
import { A_WIS } from './const.js';
import { xname, doname, yname, Yname2, Yobjnam2, Tobjnam, otense, The } from './objnam.js';
import { more_experienced } from './exper.js';
import { surface } from './dungeon.js';
import { IS_GRAVE } from './const.js';
import { NO_MM_FLAGS } from './const.js';
import { makemon } from './makemon.js';
import { PMNAMES } from './monst_data.js';
import { welded } from './wield.js';
import { bimanual, is_boots } from './obj.js';
import { sanitize_name } from './bones.js';

// src/engrave.c:1551 save_engravings(). The three text strings
// replace the C allocation and its pointers into text storage.
export function save_engravings() {
    const saved = [];
    for (const ep of game.level.lev_engr || []) {
        if (!ep.engr_txt)
            continue;
        // C rewinds the text pointers to their allocation before writing,
        // including spaces skipped by wipe_engr_at or rest_engravings. It
        // leaves them rewound even for a checkpoint which keeps the level.
        ep.engr_txt = ' '.repeat(ep.engr_txt_offset || 0) + ep.engr_txt;
        ep.engr_txt_remembered = ' '.repeat(ep.engr_remembered_offset || 0)
            + (ep.engr_txt_remembered || '');
        ep.engr_txt_offset = ep.engr_remembered_offset = 0;
        saved.push({...ep});
    }
    return saved;
}

// src/engrave.c:1584 rest_engravings()
export function rest_engravings(saved) {
    game.level.lev_engr = [];
    for (const ep of saved || []) {
        const actual = ep.engr_txt.replace(/^ +/, '');
        const remembered = (ep.engr_txt_remembered || '').replace(/^ +/, '');
        game.level.lev_engr.unshift({...ep, engr_txt: actual,
            engr_txt_remembered: remembered,
            engr_txt_offset: ep.engr_txt.length - actual.length,
            engr_remembered_offset: (ep.engr_txt_remembered || '').length - remembered.length,
            engr_time: game.moves});
    }
}

// src/engrave.c:1509 forget_engravings()
export function forget_engravings() {
    for (const ep of game.level.lev_engr || [])
        ep.erevealed = ep.eread = 0;
}

// src/engrave.c:1498 sanitize_engravings()
export function sanitize_engravings() {
    for (const ep of game.level.lev_engr || [])
        ep.engr_txt = sanitize_name(ep.engr_txt);
}

// src/engrave.c:297 engr_can_be_felt()
export function engr_can_be_felt(ep) {
    switch (ep.engr_type) {
    case ENGRAVE:
    case HEADSTONE:
    case BURN:
        return true;
    default:
        return false;
    }
}
import { Amonnam, mon_nam } from './do_name.js';






import { is_animal, is_whirly, is_demon, is_vampire, cantwield, resists_blnd } from './mondata.js';
import { check_capacity } from './hack.js';
import { zapnodir, zappable, learnwand } from './zap.js';
import { check_unpaid } from './shk.js';
import { wand_explode } from './read.js';
import { is_art } from './artifact.js';
import { ART_FIRE_BRAND } from './artilist_data.js';
import { is_wet_towel, dry_a_towel } from './apply.js';
import { altar_wrath } from './pray.js';
import { Blind, Deaf, Confusion, Stunned, Hallucination } from './youprop.js';
import { body_part } from './polyself.js';
import { make_blinded } from './potion.js';
import { splitobj } from './mkobj.js';
import { mungspaces } from './hacklib.js';
import { tty_yn_function } from './tty/topl.js';
// src/engrave.c:65 rubouts[] — how each character degrades. Order matters:
// wipeout_text() scans linearly and the index it stops at decides whether the
// character becomes a substitute or a '?'.
const rubouts = [
    ['A', '^'], ['B', 'Pb['], ['C', '('], ['D', '|)['], ['E', '|FL[_'],
    ['F', '|-'], ['G', 'C('], ['H', '|-'], ['I', '|'], ['K', '|<'],
    ['L', '|_'], ['M', '|'], ['N', '|\\'], ['O', 'C('], ['P', 'F'],
    ['Q', 'C('], ['R', 'PF'], ['T', '|'], ['U', 'J'], ['V', '/\\'],
    ['W', 'V/\\'], ['Z', '/'], ['b', '|'], ['d', 'c|'], ['e', 'c'],
    ['g', 'c'], ['h', 'n'], ['j', 'i'], ['k', '|'], ['l', '|'],
    ['m', 'nr'], ['n', 'r'], ['o', 'c'], ['q', 'c'], ['w', 'v'],
    ['y', 'v'], [':', '.'], [';', ',:'], [',', '.'], ['=', '-'],
    ['+', '-|'], ['*', '+'], ['@', '0'], ['0', 'C('], ['1', '|'],
    ['6', 'o'], ['7', '/'], ['8', '3o'],
];

// src/engrave.c:119 wipeout_text() — degrade `cnt` characters of `engr`.
//
// With seed == 0 (the level-generation case) each iteration draws rn2(lth) and
// rn2(4), and a character that has a rubout entry draws a third rn2(ln). A
// space or a small punctuation mark `continue`s *after* those first two draws,
// so the draw count is not simply 2 or 3 per character.
export function wipeout_text(engr, cnt, seed) {
    let s = engr.split('');
    let lth = s.length;

    if (lth && cnt > 0) {
        while (cnt--) {
            let nxt, use_rubout;
            if (!seed) {
                nxt = rn2(lth);
                use_rubout = rn2(4);
            } else {
                nxt = seed % lth;
                seed = (seed * 31) % (BUFSZ - 1);
                use_rubout = seed & 3;
            }
            if (s[nxt] === ' ')
                continue;

            /* rub out unreadable & small punctuation marks */
            if ('?.,\'`-|_'.includes(s[nxt])) {
                s[nxt] = ' ';
                continue;
            }

            let i;
            if (!use_rubout) {
                i = rubouts.length;
            } else {
                for (i = 0; i < rubouts.length; i++)
                    if (s[nxt] === rubouts[i][0]) {
                        const wipeto = rubouts[i][1];
                        let j;
                        if (!seed) {
                            j = rn2(wipeto.length);
                        } else {
                            seed = (seed * 31) % (BUFSZ - 1);
                            j = seed % wipeto.length;
                        }
                        s[nxt] = wipeto[j];
                        break;
                    }
            }

            /* didn't pick rubout; use '?' for unreadable character */
            if (i === rubouts.length)
                s[nxt] = '?';
        }
    }

    /* trim trailing spaces */
    let out = s.join('');
    while (out.length && out[out.length - 1] === ' ')
        out = out.slice(0, -1);
    return out;
}


// src/engrave.c:50 random_engraving()
//
// The text comes from dat/rumors, or from dat/engrave when the rn2(4) says so
// or the rumor lookup comes back empty. Then a quarter of the characters are
// rubbed out. Returns { text, pristine } — C's two output buffers.
export function random_engraving() {
    let pristine = '';
    let rumor = null;

    if (!rn2(4)) {
        pristine = get_rnd_text('engrave', rn2, MD_PAD_RUMORS);
    } else {
        rumor = getrumor(0, true);
        pristine = rumor;
        if (!rumor || rumor.length === 0)
            pristine = get_rnd_text('engrave', rn2, MD_PAD_RUMORS);
    }

    const text = wipeout_text(pristine, Math.trunc(pristine.length / 4), 0);
    return { text, pristine };
}

// ---------------------------------------------------------------------------
// The level's engraving list. src/engrave.c keeps it as svl.level.lev_engr, a
// linked list; a plain array is the same thing for our purposes because the
// only ordering that matters is "the one at these coordinates".
// ---------------------------------------------------------------------------

// src/engrave.c engr_at()
export function engr_at(x, y) {
    return (game.level?.lev_engr || []).find(e => e.x === x && e.y === y) || null;
}

// src/engrave.c:314 read_engr_at() — sense and read the engraving under a
// spot; the ':' look and every walk-onto-the-square path go through it.
// ENGRAVE/HEADSTONE/BURN/MARK/BLOOD arms use the same terrain-sensitive
// descriptions and reach checks as C.
export async function read_engr_at(x, y) {
    const ep = engr_at(x, y);
    const eloc = surface(x, y);
    let sensed = 0;

    if (ep && ep.engr_txt && ep.engr_txt[0]) {
        switch (ep.engr_type) {
        case DUST:
            if (!game.u.ublind) {
                sensed = 1;
                await pline(`Something is written here in the ${
                    is_ice(x, y) ? 'frost' : 'dust'}.`);
            }
            break;
        case ENGRAVE:
        case HEADSTONE:
            if (!game.u.ublind || can_reach_floor(true)) {
                sensed = 1;
                await pline(`Something is engraved here on the ${eloc}.`);
            }
            break;
        case BURN:
            if (!game.u.ublind || can_reach_floor(true)) {
                sensed = 1;
                await pline('Some text has been '
                    + `${is_ice(x, y) ? 'melted' : 'burned'} into the ${eloc} here.`);
            }
            break;
        case MARK:
            if (!game.u.ublind) {
                sensed = 1;
                await pline(`There's some graffiti on the ${eloc} here.`);
            }
            break;
        case ENGR_BLOOD:
            if (!game.u.ublind) {
                sensed = 1;
                await You('see a message scrawled in blood here.');
            }
            break;
        default:
            /* impossible("%s is written in a very strange way.") */
            sensed = 1;
            break;
        }

        if (sensed) {
            /* sizeof buf - sizeof "You feel the words: \"\"." (the literal's
               size counts its terminating NUL) */
            const maxelen = BUFSZ - ('You feel the words: "".'.length + 1);
            let et = ep.engr_txt;
            /* off: how far actual_text has been advanced past the leading
               spaces wipe_engr_at() trimmed (engr_text_space) */
            const off = ep.engr_txt_offset || 0;
            if (et.length > maxelen)
                et = et.slice(0, maxelen);
            const elen = et.length;
            /* only skip if punctuation is original, not degraded char */
            const last = et[elen - 1];
            const plast = (ep.engr_txt_pristine || '')[off + elen - 1];
            const endpunct = (elen < 2
                              || !(plast === last && '.!?'.includes(last)))
                ? '.' : '';
            await You(`${game.u.ublind ? 'feel the words' : 'read'}: `
                + `"${et}"${endpunct}`);
            ep.engr_txt_remembered = ep.engr_txt;
            ep.eread = 1;
            ep.erevealed = 1;
            if (game.context.run > 0) {
                const { nomul } = await import('./hack.js');
                nomul(0);
            }
        }
    }
}

// src/engrave.c del_engr()
export function del_engr(ep) {
    const list = game.level?.lev_engr;
    if (!list) return;
    const i = list.indexOf(ep);
    if (i >= 0) list.splice(i, 1);
}

// src/engrave.c del_engr_at()
export function del_engr_at(x, y) {
    const ep = engr_at(x, y);
    if (ep)
        del_engr(ep);
}

// src/engrave.c:1667 rloc_engr() - randomly relocate an engraving to a
// terrain square accepted by goodpos(). The destination draws are observable
// even when the relocated text is outside the current viewport.
export async function rloc_engr(ep) {
    const { goodpos } = await import('./makemon.js');
    let tryct = 200;

    do {
        if (--tryct < 0)
            return;
        const tx = rn1(COLNO - 3, 2);
        const ty = rn2(ROWNO);
        if (!engr_at(tx, ty) && goodpos(tx, ty, null, 0)) {
            ep.x = tx;
            ep.y = ty;
            newsym(tx, ty);
            return;
        }
    } while (true);
}

// src/engrave.c:408 make_engr_at() — replaces any engraving already there.
//
// It DOES draw, on one branch: engr_type <= 0 means "pick one", and that costs
// rnd(N_ENGRAVE - 1). Every caller in the tree passes a real type, so the draw
// is unreachable today, but the branch is the whole reason the parameter is an
// int rather than an enum and it is one line to keep honest.
//
// The signature carries pristine_s, C's fourth parameter: an engraving keeps
// three copies of its text (what is there, what the hero remembers reading, and
// what it said before erosion), and pristine_s seeds the third with something
// other than s. Only mklev.c:1153's MARK engraving passes it.
export function make_engr_at(x, y, s, pristine_s, e_time, e_type) {
    const old = engr_at(x, y);
    if (old) del_engr(old);

    const txt = String(s);
    /* src/engrave.c:442 — engraving "Elbereth": at mklev it guards objects,
       from the player it exercises wisdom */
    if (txt === 'Elbereth' && !game.in_mklev)
        exercise(A_WIS, true);
    const ep = {
        x, y,
        engr_txt: txt,                          /* actual_text */
        engr_txt_remembered: txt,               /* remembered_text */
        engr_txt_pristine: pristine_s != null ? String(pristine_s) : txt,
        engr_time: e_time,
        engr_type: (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1),
        guardobjects: 0,
        nowipeout: false,
    };

    /* engraving "Elbereth" while the level is being made creates the old-style
       one that deters monsters whenever objects are present; the hero doing it
       exercises wisdom instead. */
    if (txt === 'Elbereth') {
        if (game.in_mklev)
            ep.guardobjects = 1;
    }

    (game.level.lev_engr ||= []).unshift(ep);
}

// src/engrave.c:250 u_wipe_engr() — rub out part of what is under the hero.
export function u_wipe_engr(cnt) {
    if (can_reach_floor(true))
        wipe_engr_at(game.u.ux, game.u.uy, cnt, false);
}

// src/engrave.c wipe_engr_at() — age an engraving by rubbing out `cnt` of its
// characters.
//
// A DUST or ENGR_BLOOD engraving erodes by the full count; anything else first
// rolls `cnt = rn2(1 + 50 / (cnt + 1)) ? 0 : 1`, so it usually erodes nothing
// and that roll is itself a draw. makeniche() only ever writes DUST, so the
// level generator takes the first path.
export function wipe_engr_at(x, y, cnt, magical) {
    const ep = engr_at(x, y);
    if (!ep || ep.engr_type === HEADSTONE || ep.nowipeout) return;
    /* engrave.c:278 — burned text resists wiping unless it sits on ice
       or the magical half-chance fires */
    if (ep.engr_type === BURN && !is_ice(x, y)
        && !(magical && !rn2(2))) return;

    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD)
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;

    ep.engr_txt = wipeout_text(ep.engr_txt, cnt, 0);
    const trimmed = ep.engr_txt.replace(/^ +/, '');
    ep.engr_txt_offset = (ep.engr_txt_offset || 0) + ep.engr_txt.length - trimmed.length;
    ep.engr_txt = trimmed;
    if (!ep.engr_txt) del_engr(ep);
}

// src/engrave.c sengr_at() — is `s` engraved at (x,y)?
//
// Three call sites are waiting on this: onscary's Elbereth arm,
// setmangry's hypocrite branch (whose rnd(5) is its ONLY draw), and
// goodpos_onscary.
//
// The engr_time test is not decoration: an engraving made THIS turn does not
// count until moves catches up, so a monster is not scared by Elbereth on the
// turn it is written. HEADSTONE is excluded because a grave's text is not an
// engraving for this purpose.
//
// `strict` picks exact match versus substring, both case-insensitive --
// strcmpi and strstri. Elbereth callers pass TRUE.
export function sengr_at(s, x, y, strict) {
    const ep = engr_at(x, y);

    if (ep && ep.engr_type !== HEADSTONE && ep.engr_time <= game.moves) {
        const txt = String(ep.engr_txt ?? '');
        if (strict ? txt.toLowerCase() === String(s).toLowerCase()
                   : txt.toLowerCase().includes(String(s).toLowerCase()))
            return ep;
    }
    return null;
}

function note_unported_engrave(what) {
    (game.unported ||= new Set()).add(what);
}

// src/engrave.c:473 freehand()
export function freehand() {
    return (!game.u.uwep || !welded(game.u.uwep)
            || (!bimanual(game.u.uwep) && (!game.u.uarms || !game.u.uarms.cursed)));
}

// src/engrave.c:481 stylus_ok() — getobj filter for 'E'.
export function stylus_ok(obj) {
    if (!obj)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.WEAPON_CLASS || obj.oclass === OCLASSES.WAND_CLASS
        || obj.oclass === OCLASSES.GEM_CLASS || obj.oclass === OCLASSES.RING_CLASS)
        return GETOBJ_SUGGEST;
    if (obj.oclass === OCLASSES.TOOL_CLASS
        && (obj.otyp === ONAMES.TOWEL || obj.otyp === ONAMES.MAGIC_MARKER))
        return GETOBJ_SUGGEST;
    return GETOBJ_DOWNPLAY;
}

// src/engrave.c:42 u_can_engrave() — can hero engrave at all (at their location)?
async function u_can_engrave() {
    const levtyp = SURFACE_AT(game.u.ux, game.u.uy);

    if (game.u.uswallow) {
        if (is_animal(game.mons[game.u.ustuck.mnum])) {
            await pline('What would you write?  "Jonah was here"?');
            return false;
        } else if (is_whirly(game.mons[game.u.ustuck.mnum])) {
            await cant_reach_floor(game.u.ux, game.u.uy, false, false, false);
            return false;
        }
        /* Note: for amorphous engulfers, writing attempt is allowed here
           but yields the 'jello' result in doengrave() */
    } else if (is_lava(game.u.ux, game.u.uy)) {
        await You_cant(`write on the ${surface(game.u.ux, game.u.uy)}!`);
        return false;
    } else if (is_pool(game.u.ux, game.u.uy) || IS_FOUNTAIN(levtyp)) {
        await You_cant(`write on the ${surface(game.u.ux, game.u.uy)}!`);
        return false;
    } else if (IS_AIR(levtyp)) {
        /* airlevel or inside bubble on waterlevel */
        await You_cant(`write in ${(levtyp === CLOUD) ? 'cloud vapor' : 'thin air'}!`);
        return false;
    } else if (!ACCESSIBLE(levtyp)) {
        /* stone, tree, wall, secret corridor, pool, lava, bars */
        await You_cant('write here.');
        return false;
    }

    if (cantwield(game.youmonst.data)) {
        await You_cant('even hold anything!');
        return false;
    }
    if (await check_capacity(null))
        return false;
    return true;
}

/* include/rm.h:146 SURFACE_AT(x,y) */
function SURFACE_AT(x, y) {
    const lev = game.level.at(x, y);
    return (lev.typ === DRAWBRIDGE_UP) ? db_under_typ(lev.drawbridgemask)
                                       : lev.typ;
}

// src/engrave.c:545 doengrave_ctx_init() — initialize the doengrave data
function doengrave_ctx_init(de) {
    de.dengr = false;
    de.doblind = false;
    de.doknown = false;
    de.eow = false;
    de.ptext = true;
    de.teleengr = false;
    de.zapwand = false;
    de.disprefresh = false;
    de.adding = false;

    de.ret = ECMD_OK;
    de.type = DUST;
    de.oetype = 0;

    de.otmp = null;
    de.oep = engr_at(game.u.ux, game.u.uy);

    de.buf = '';
    de.ebuf = '';
    de.fbuf = '';
    de.qbuf = '';
    de.post_engr_text = '';
    de.writer = null;

    if (de.oep)
        de.oetype = de.oep.engr_type;
    if (is_demon(game.youmonst.data) || is_vampire(game.youmonst.data))
        de.type = ENGR_BLOOD;

    de.jello = !!(game.u.uswallow
                  && !(is_animal(game.mons[game.u.ustuck.mnum])
                       || is_whirly(game.mons[game.u.ustuck.mnum])));
    de.frosted = !!is_ice(game.u.ux, game.u.uy);
}

// src/engrave.c:583 doengrave_sfx_item_WAN() — special engraving effects for WAND objects
async function doengrave_sfx_item_WAN(de) {
    const u = game.u;

    switch (de.otmp.otyp) {
        /* DUST wands */
    default:
        break;
        /* NODIR wands */
    case ONAMES.WAN_LIGHT:
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.WAN_STASIS:
    case ONAMES.WAN_CREATE_MONSTER:
    case ONAMES.WAN_WISHING:
    case ONAMES.WAN_ENLIGHTENMENT:
        await zapnodir(de.otmp);
        break;
        /* IMMEDIATE wands */
        /* If wand is "IMMEDIATE", remember to affect the
         * previous engraving even if turning to dust.
         */
    case ONAMES.WAN_STRIKING:
        de.post_engr_text = 'The wand unsuccessfully fights your attempt to write!';
        break;
    case ONAMES.WAN_SLOW_MONSTER:
        if (!Blind())
            de.post_engr_text = `The bugs on the ${surface(u.ux, u.uy)} slow down!`;
        break;
    case ONAMES.WAN_SPEED_MONSTER:
        if (!Blind())
            de.post_engr_text = `The bugs on the ${surface(u.ux, u.uy)} speed up!`;
        break;
    case ONAMES.WAN_POLYMORPH:
        if (de.oep) {
            if (!Blind()) {
                de.type = 0; /* random */
                const r = random_engraving();
                de.buf = r.text;
                de.ebuf = r.pristine;
            } else {
                /* keep the same type so that feels don't
                   change and only the text is altered,
                   but you won't know anyway because
                   you're a _blind writer_ */
                if (de.oetype)
                    de.type = de.oetype;
                de.buf = xcrypt(blengr());
            }
            de.dengr = true;
        }
        break;
    case ONAMES.WAN_NOTHING:
    case ONAMES.WAN_UNDEAD_TURNING:
    case ONAMES.WAN_OPENING:
    case ONAMES.WAN_LOCKING:
    case ONAMES.WAN_PROBING:
        break;
        /* RAY wands */
    case ONAMES.WAN_MAGIC_MISSILE:
        de.ptext = true;
        if (!Blind())
            de.post_engr_text = `The ${surface(u.ux, u.uy)} is riddled by bullet holes!`;
        break;
        /* can't tell sleep from death - Eric Backus */
    case ONAMES.WAN_SLEEP:
    case ONAMES.WAN_DEATH:
        if (!Blind())
            de.post_engr_text = `The bugs on the ${surface(u.ux, u.uy)} stop moving!`;
        break;
    case ONAMES.WAN_COLD:
        if (!Blind())
            de.post_engr_text = 'A few ice cubes drop from the wand.';
        if (!de.oep || (de.oep.engr_type !== BURN))
            break;
        /* FALLTHRU */
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.WAN_MAKE_INVISIBLE:
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!Blind())
                await pline_The(`engraving on the ${surface(u.ux, u.uy)} vanishes!`);
            de.dengr = true;
        }
        break;
    case ONAMES.WAN_TELEPORTATION:
        if (de.oep && de.oep.engr_type !== HEADSTONE) {
            if (!Blind())
                await pline_The(`engraving on the ${surface(u.ux, u.uy)} vanishes!`);
            de.teleengr = true;
        }
        break;
        /* type = ENGRAVE wands */
    case ONAMES.WAN_DIGGING:
        de.ptext = true;
        de.type = ENGRAVE;
        if (!game.objects[de.otmp.otyp].oc_name_known) {
            if (game.flags.verbose)
                await pline(`This ${xname(de.otmp)} is a wand of digging!`);
            de.doknown = true;
        }
        de.post_engr_text = (Blind() && !Deaf())
            ? 'You hear drilling!'    /* Deaf-aware */
            : Blind()
               ? 'You feel tremors.'
               : IS_GRAVE(game.level.at(u.ux, u.uy).typ)
                  ? 'Chips fly out from the headstone.'
                  : de.frosted
                     ? 'Ice chips fly up from the ice surface!'
                     : (game.level.at(u.ux, u.uy).typ === DRAWBRIDGE_DOWN)
                        ? 'Splinters fly up from the bridge.'
                        : 'Gravel flies up from the floor.';
        break;
        /* type = BURN wands */
    case ONAMES.WAN_FIRE:
        de.ptext = true;
        de.type = BURN;
        if (!game.objects[de.otmp.otyp].oc_name_known) {
            if (game.flags.verbose)
                await pline(`This ${xname(de.otmp)} is a wand of fire!`);
            de.doknown = true;
        }
        de.post_engr_text = Blind() ? 'You feel the wand heat up.'
                                    : 'Flames fly from the wand.';
        break;
    case ONAMES.WAN_LIGHTNING:
        de.ptext = true;
        de.type = BURN;
        if (!game.objects[de.otmp.otyp].oc_name_known) {
            if (game.flags.verbose)
                await pline(`This ${xname(de.otmp)} is a wand of lightning!`);
            de.doknown = true;
        }
        if (!Blind()) {
            de.post_engr_text = 'Lightning arcs from the wand.';
            de.doblind = true;
        } else {
            de.post_engr_text = !Deaf()
                ? 'You hear crackling!'     /* Deaf-aware */
                : 'Your hair stands up!';
        }
        break;
        /* type = MARK wands */
        /* type = ENGR_BLOOD wands */
    }
}

// src/engrave.c:742 doengrave_sfx_item() — special engraving effects for all objects
async function doengrave_sfx_item(de) {
    const u = game.u;

    switch (de.otmp.oclass) {
    default:
    case OCLASSES.AMULET_CLASS:
    case OCLASSES.CHAIN_CLASS:
    case OCLASSES.POTION_CLASS:
    case OCLASSES.COIN_CLASS:
        break;
    case OCLASSES.RING_CLASS:
        /* "diamond" rings and others should work */
    case OCLASSES.GEM_CLASS:
        /* diamonds & other hard gems should work */
        if (game.objects[de.otmp.otyp].oc_tough) {
            de.type = ENGRAVE;
            break;
        }
        break;
    case OCLASSES.ARMOR_CLASS:
        if (is_boots(de.otmp)) {
            de.type = DUST;
            break;
        }
        /* FALLTHRU */
    /* Objects too large to engrave with */
    case OCLASSES.BALL_CLASS:
    case OCLASSES.ROCK_CLASS:
        await You_cant('engrave with such a large object!');
        de.ptext = false;
        break;
    /* Objects too silly to engrave with */
    case OCLASSES.FOOD_CLASS:
    case OCLASSES.SCROLL_CLASS:
    case OCLASSES.SPBOOK_CLASS:
        await pline(`${Yname2(de.otmp)} would get ${
                    de.frosted ? 'all frosty' : 'too dirty'}.`);
        de.ptext = false;
        break;
    case 0: /* RANDOM_CLASS: This should mean fingers */
        break;

    /* The charge is removed from the wand before prompting for
     * the engraving text, because all kinds of setup decisions
     * and pre-engraving messages are based upon knowing what type
     * of engraving the wand is going to do.  Also, the player
     * will have potentially seen "You wrest .." message, and
     * therefore will know they are using a charge.
     */
    case OCLASSES.WAND_CLASS:
        if (await zappable(de.otmp)) {
            await check_unpaid(de.otmp);
            if (de.otmp.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
                await wand_explode(de.otmp, 0);
                de.ret = ECMD_TIME;
                return false;
            }
            de.zapwand = true;
            if (!can_reach_floor(true))
                de.ptext = false;
            await doengrave_sfx_item_WAN(de);
        } else { /* end if zappable */
            /* failing to wrest one last charge takes time */
            de.ptext = false; /* use "early exit" below, return 1 */
            /* give feedback here if we won't be getting the
               "can't reach floor" message below */
            if (can_reach_floor(true)) {
                /* cancelled wand turns to dust */
                if (de.otmp.spe < 0)
                    de.zapwand = true;
                /* empty wand just doesn't write */
                else
                    await pline_The('wand is too worn out to engrave.');
            }
        }
        break;

    case OCLASSES.WEAPON_CLASS:
        if (is_art(de.otmp, ART_FIRE_BRAND)) {
            de.type = BURN; /* doesn't dull weapon */
        } else if (is_blade(de.otmp)) {
            /* if non-blade or welded or too dull, engraving type stays set
               to DUST; feedback for that is only given for bladed weapons */
            if (welded(de.otmp))
                await pline(`${Yname2(de.otmp)} can only scratch the ${
                            surface(u.ux, u.uy)}.`);
            else if (de.otmp.spe <= -3)
                await pline(`${Yobjnam2(de.otmp, 'are')} too dull for engraving.`);
            else
                de.type = ENGRAVE;
        }
        break;

    case OCLASSES.TOOL_CLASS:
        if (de.otmp === u.ublindf) {
            await pline("That is a bit difficult to engrave with, don't you think?");
            de.ret = ECMD_FAIL;
            return false;
        }
        switch (de.otmp.otyp) {
        case ONAMES.MAGIC_MARKER:
            if (de.otmp.spe <= 0)
                await Your('marker has dried out.');
            else
                de.type = MARK;
            break;
        case ONAMES.TOWEL:
            /* Can't really engrave with a towel */
            de.ptext = false;
            if (de.oep) {
                if (de.oep.engr_type === DUST
                    || de.oep.engr_type === ENGR_BLOOD
                    || de.oep.engr_type === MARK) {
                    if (is_wet_towel(de.otmp))
                        await dry_a_towel(de.otmp, -1, true);
                    if (!Blind())
                        await You('wipe out the message here.');
                    else
                        await pline(`${Yobjnam2(de.otmp, 'get')} ${
                                    de.frosted ? 'frosty' : 'dusty'}.`);
                    de.dengr = true;
                } else {
                    await pline(`${Yname2(de.otmp)} can't wipe out this engraving.`);
                }
            } else {
                await pline(`${Yobjnam2(de.otmp, 'get')} ${
                            de.frosted ? 'frosty' : 'dusty'}.`);
            }
            break;
        default:
            break;
        }
        break;

    case OCLASSES.VENOM_CLASS:
        /* this used to be ``if (wizard)'' and fall through to ILLOBJ_CLASS
           for normal play, but splash of venom isn't "illegal" because it
           could occur in normal play via wizard mode bones */
        await pline('Writing a poison pen letter?');
        break;

    case OCLASSES.ILLOBJ_CLASS:
        /* impossible("You're engraving with an illegal object!"); */
        break;
    }

    return true;
}

// src/engrave.c:896 doengrave_ctx_verb() — which verb phrasing to use for engraving
function doengrave_ctx_verb(de) {
    switch (de.type) {
    default:
        de.everb = de.adding ? 'add to the weird writing on'
                             : 'write strangely on';
        break;
    case DUST:
        de.everb = de.adding ? 'add to the writing in' : 'write in';
        de.eloc = de.frosted ? 'frost' : 'dust';
        break;
    case HEADSTONE:
        de.everb = de.adding ? 'add to the epitaph on' : 'engrave on';
        break;
    case ENGRAVE:
        de.everb = de.adding ? 'add to the engraving in' : 'engrave in';
        break;
    case BURN:
        de.everb = de.adding ? (de.frosted ? 'add to the text melted into'
                                : 'add to the text burned into')
                     : (de.frosted ? 'melt into' : 'burn into');
        break;
    case MARK:
        de.everb = de.adding ? 'add to the graffiti on' : 'scribble on';
        break;
    case ENGR_BLOOD:
        de.everb = de.adding ? 'add to the scrawl on' : 'scrawl on';
        break;
    }
}

/* src/engrave.c:1257 doengr_exit: — the label every early return of
   doengrave() jumps to */
function doengr_exit(de) {
    if (de.disprefresh)
        newsym(game.u.ux, game.u.uy);
    return de.ret;
}

// src/engrave.c:956 doengrave() — the #engrave command
export async function doengrave() {
    const u = game.u;
    let initial_msg_given = false;

    /* Can the adventurer engrave at all? */
    if (!await u_can_engrave())
        return ECMD_FAIL;

    const de = {};
    doengrave_ctx_init(de);

    game.multi = 0;              /* moves consumed */
    game.nomovemsg = null;       /* occupation end message */

    /* One may write with finger, or weapon, or wand, or..., or...
     * Edited by GAN 10/20/86 so as not to change weapon wielded.
     */

    de.otmp = await getobj('write with', stylus_ok, GETOBJ_PROMPT);
    if (!de.otmp) { /* otmp == &hands_obj if fingers */
        de.ret = ECMD_CANCEL;
        return doengr_exit(de);
    }

    if (de.otmp === hands_obj) {
        de.fbuf = 'your ' + body_part(FINGERTIP);
        de.writer = de.fbuf;
    } else {
        de.writer = yname(de.otmp);
    }

    /* There's no reason you should be able to write with a wand
     * while both your hands are tied up.
     */
    if (!freehand() && de.otmp !== u.uwep && !de.otmp.owornmask) {
        await You(`have no free ${body_part(HAND)} to write with!`);
        return doengr_exit(de);
    }

    if (de.jello) {
        await You(`tickle ${mon_nam(u.ustuck)} with ${de.writer}.`);
        await Your('message dissolves...');
        return doengr_exit(de);
    }
    if (!can_reach_floor(true)) {
        if (de.otmp.oclass !== OCLASSES.WAND_CLASS) {
            await cant_reach_floor(u.ux, u.uy, false, true, false);
            return doengr_exit(de);
        } else {
            await You(`gesture, with your wand, towards the ${
                      surface(u.ux, u.uy)} below you.`);
            initial_msg_given = true;
        }
    }
    if (IS_ALTAR(game.level.at(u.ux, u.uy).typ)) {
        if (!initial_msg_given)
            await You(`make a motion towards the altar with ${de.writer}.`);
        await altar_wrath(u.ux, u.uy);
        return doengr_exit(de);
    }
    if (IS_GRAVE(game.level.at(u.ux, u.uy).typ)) {
        if (de.otmp === hands_obj) { /* using only finger */
            await You(`would only make a small smudge on the ${
                      surface(u.ux, u.uy)}.`);
            return doengr_exit(de);
        } else if (!game.level.at(u.ux, u.uy).disturbed) {
            /* disturb the grave: summon a ghoul, same as sometimes
               happens when kicking; sets levl[ux][uy]->disturbed so
               that it'll only happen once */
            await disturb_grave(u.ux, u.uy);
            return doengr_exit(de);
        }
    }

    /* SPFX for items */
    if (!await doengrave_sfx_item(de))
        return doengr_exit(de);

    if (IS_GRAVE(game.level.at(u.ux, u.uy).typ)) {
        if (de.type === ENGRAVE || de.type === 0) {
            de.type = HEADSTONE;
        } else {
            /* ensures the "cannot wipe out" case */
            de.type = DUST;
            de.dengr = false;
            de.teleengr = false;
            de.buf = '';
        }
    }

    /*
     * End of implement setup
     */

    /* Identify stylus */
    if (de.doknown) {
        learnwand(de.otmp);
        if (game.objects[de.otmp.otyp].oc_name_known)
            more_experienced(0, 10);
    }
    if (de.teleengr) {
        await rloc_engr(de.oep);
        de.oep.eread = 0;
        de.oep.erevealed = 0;
        de.disprefresh = true;
        de.oep = null;
    }
    if (de.dengr) {
        del_engr(de.oep);
        de.oep = null;
        de.disprefresh = true;
    }
    /* Something has changed the engraving here */
    if (de.buf) {
        make_engr_at(u.ux, u.uy, de.buf, de.ebuf, game.moves, de.type);
        const tmp_ep = engr_at(u.ux, u.uy);
        if (!Blind()) {
            if (tmp_ep) {
                await pline_The(`engraving now reads: "${de.buf}".`);
                tmp_ep.eread = 1;
                tmp_ep.erevealed = 1;
                de.disprefresh = true;
            }
        }
        de.ptext = false;
    }
    if (de.zapwand && (de.otmp.spe < 0)) {
        await pline(`${The(xname(de.otmp))} ${
                    Blind() ? '' : 'glows violently, then '}turns to dust.`);
        if (!IS_GRAVE(game.level.at(u.ux, u.uy).typ))
            await You(`are not going to get anywhere trying to write in the ${
                      de.frosted ? 'frost' : 'dust'} with your dust.`);
        useup(de.otmp);
        de.otmp = null; /* wand is now gone */
        de.ptext = false;
    }
    /* Early exit for some implements. */
    if (!de.ptext) {
        if (de.otmp && de.otmp.oclass === OCLASSES.WAND_CLASS
            && !can_reach_floor(true))
            await cant_reach_floor(u.ux, u.uy, false, true, true);
        de.ret = ECMD_TIME;
        return doengr_exit(de);
    }
    /*
     * Special effects should have deleted the current engraving (if
     * possible) by now.
     */
    if (de.oep) {
        let c = 'n';

        /* Give player the choice to add to engraving. */
        if (de.type === HEADSTONE) {
            /* no choice, only append */
            c = 'y';
        } else if (de.type === de.oep.engr_type
                   && (!Blind() || de.oep.engr_type === BURN
                       || de.oep.engr_type === ENGRAVE)) {
            c = await tty_yn_function('Do you want to add to the current engraving?',
                                      'ynq', 'y', true);
            if (c === 'q') {
                await pline('Never mind.');
                return doengr_exit(de);
            }
        }

        if (c === 'n' || Blind()) {
            if (de.oep.engr_type === DUST
                || de.oep.engr_type === ENGR_BLOOD
                || de.oep.engr_type === MARK) {
                if (!Blind()) {
                    await You(`wipe out the message that was ${
                        (de.oep.engr_type === DUST)
                            ? (de.frosted
                                ? 'written in the frost'
                                : 'written in the dust')
                            : (de.oep.engr_type === ENGR_BLOOD)
                                ? 'scrawled in blood'
                                : 'written'} here.`);
                    del_engr(de.oep);
                    de.oep = null;
                    de.disprefresh = true;
                } else {
                    /* defer deletion until after we *know* we're engraving */
                    de.eow = true;
                }
            } else if (de.type === DUST || de.type === MARK
                       || de.type === ENGR_BLOOD) {
                await You(`cannot wipe out the message that is ${
                    (de.oep.engr_type === BURN)
                        ? (de.frosted ? 'melted into' : 'burned into')
                        : 'engraved in'} the ${surface(u.ux, u.uy)} here.`);
                de.ret = ECMD_TIME;
                return doengr_exit(de);
            } else if (de.type !== de.oep.engr_type || c === 'n') {
                if (!Blind() || can_reach_floor(true))
                    await You('will overwrite the current message.');
                de.eow = true;
            }
        } else if (de.oep
                   && de.oep.engr_txt.length >= BUFSZ - 1) {
            await There('is no room to add anything else here.');
            de.ret = ECMD_TIME;
            return doengr_exit(de);
        }
    }

    de.eloc = surface(u.ux, u.uy);
    de.adding = !!(de.oep && !de.eow);
    doengrave_ctx_verb(de);

    /* Tell adventurer what is going on */
    if (de.otmp !== hands_obj)
        await You(`${de.everb} the ${de.eloc} with ${
            /* since doname() yields "N items" when quantity is more than
               one, match that by using "1 of" rather than "one of" when
               informing the player that the stack will be split */
            (de.type === ENGRAVE && de.otmp.quan > 1) ? '1 of ' : ''}${
            doname(de.otmp)}.`);
    else
        await You(`${de.everb} the ${de.eloc} with your ${
                  body_part(FINGERTIP)}.`);

    /* Prompt for engraving! */
    de.qbuf = `What do you want to ${de.everb} the ${de.eloc} here?`;
    de.ebuf = await getlin(de.qbuf);
    if (de.ebuf === null)
        de.ebuf = '\x1b'; /* getlin() stores "\033" on escape */
    /* convert tabs to spaces and condense consecutive spaces to one */
    de.ebuf = mungspaces(de.ebuf);

    /* Count the actual # of chars engraved not including spaces */
    de.len = de.ebuf.length;
    for (const sp of de.ebuf)
        if (sp === ' ')
            de.len -= 1;

    if (de.len === 0 || de.ebuf.includes('\x1b')) {
        if (de.zapwand) {
            if (!Blind())
                await pline(`${Tobjnam(de.otmp, 'glow')}, then ${
                            otense(de.otmp, 'fade')}.`);
            de.ret = ECMD_TIME;
            return doengr_exit(de);
        } else {
            await pline('Never mind.');
            return doengr_exit(de);
        }
    }

    /* A single `x' is the traditional signature of an illiterate person */
    if (de.len !== 1 || (!de.ebuf.includes('x') && !de.ebuf.includes('X'))) {
        game.u.uconduct = game.u.uconduct || {};
        if (!(game.u.uconduct.literate || 0))
            livelog_printf(LL_CONDUCT, `became literate by engraving "${de.ebuf}"`);
        game.u.uconduct.literate = (game.u.uconduct.literate || 0) + 1;
    }

    /* Mix up engraving if surface or state of mind is unsound.
       Note: this won't add or remove any spaces. */
    {
        let mixed = '';
        for (const sp of de.ebuf) {
            if (sp === ' ') {
                mixed += sp;
                continue;
            }
            if (((de.type === DUST || de.type === ENGR_BLOOD) && !rn2(25))
                || (Blind() && !rn2(11)) || (Confusion() && !rn2(7))
                || (Stunned() && !rn2(4)) || (Hallucination() && !rn2(2)))
                mixed += String.fromCharCode(32 + rnd(96 - 2)); /* ASCII '!' thru '~'
                                                                   (excludes ' ' and DEL) */
            else
                mixed += sp;
        }
        de.ebuf = mixed;
    }

    /* Previous engraving is overwritten */
    if (de.eow) {
        del_engr(de.oep);
        de.oep = null;
        de.disprefresh = true;
    }

    game.context.engraving = {
        text: de.ebuf,
        nextc: 0,
        stylus: de.otmp,
        type: de.type,
        pos: { x: u.ux, y: u.uy },
        actionct: 0,
    };
    set_occupation(engrave, 'engraving', 0);

    if (de.post_engr_text)
        await pline(de.post_engr_text);
    if (de.doblind && !resists_blnd(game.youmonst)) {
        await You('are blinded by the flash!');
        await make_blinded(rnd(50), false);
        if (!Blind())
            await Your('vision clears.');
    }

    /* Engraving will always take at least one action via being run as an
       occupation, so do not count this setup as taking time. */
    return doengr_exit(de);
}

// src/engrave.c:42 engrave() — occupation callback for engraving some text
export async function engrave() {
    const u = game.u;
    const ctx = game.context.engraving; /* svc.context.engraving */
    let oep;
    let buf; /* holds the post-this-action engr text, including
              * anything already there */
    let finishverb; /* "You finish [foo]." */
    let stylus; /* shorthand for svc.context.engraving.stylus */
    const firsttime = (ctx.actionct === 0);
    let rate = 10; /* # characters that can be engraved in this action */
    let truncate = false;
    const neweng = (ctx.actionct === 0);

    const carving = (ctx.type === ENGRAVE || ctx.type === HEADSTONE);
    let endc; /* index 1 beyond the last character to engrave this action */
    let i, space_left;

    if (ctx.pos.x !== u.ux || ctx.pos.y !== u.uy) { /* teleported? */
        await You('are unable to continue engraving.');
        return 0;
    }
    /* Stylus might have been taken out of inventory and destroyed somehow.
     * Not safe to dereference stylus until after this. */
    if (ctx.stylus === hands_obj) { /* bare finger */
        stylus = null;
    } else {
        stylus = (game.invent || []).find((o) => o === ctx.stylus) || null;
        if (!stylus) {
            await You('are unable to continue engraving.');
            return 0;
        }
    }

    const dulling_wep = !!(carving && stylus
                           && stylus.oclass === OCLASSES.WEAPON_CLASS
                           && (stylus.otyp !== ONAMES.ATHAME || stylus.cursed));
    const marker = !!(stylus && stylus.otyp === ONAMES.MAGIC_MARKER
                      && ctx.type === MARK);

    ctx.actionct++;

    /* sanity checks: impossible("carving with non-bladed weapon"),
       impossible("making graffiti with non-marker stylus") */

    /* Step 1: Compute rate. */
    if (carving && stylus
        && (dulling_wep || stylus.oclass === OCLASSES.RING_CLASS
            || stylus.oclass === OCLASSES.GEM_CLASS)) {
        /* slow engraving methods */
        rate = 1;
    } else if (marker) {
        /* one charge / 2 letters */
        rate = Math.min(rate, stylus.spe * 2);
    }

    /* Step 2: Compute last character that can be engraved this action. */
    i = rate;
    for (endc = ctx.nextc; endc < ctx.text.length && i > 0; endc++) {
        if (ctx.text[endc] !== ' ') {
            i--;
        }
    }

    /* Step 3: affect stylus from engraving - it might wear out. */
    if (dulling_wep) {
        let splitstack = false, dulled = false;

        /* 'dulling_wep' guarantees that 'stylus' is a weapon which is
           not welded to the hero's hand(s) */
        if (stylus.quan > 1) {
            if (firsttime)
                await pline(`One of ${yname(stylus)} gets dull.`);
            stylus = ctx.stylus = splitobj(stylus, 1);
            /* if stack is wielded or quivered, the split-off one isn't */
            stylus.owornmask = 0;
            splitstack = true;
        } else {
            /* normal case: stylus->quan==1 */
            if (firsttime)
                await pline(`${Yname2(stylus)} gets dull.`);
        }
        /* Dull the weapon at a rate of -1 enchantment per 2 characters,
         * rounding down.
         * The number of characters obtainable given starting enchantment:
         * -2 => 3, -1 => 5, 0 => 7, +1 => 9, +2 => 11
         * Note: this does not allow a +0 anything (except an athame) to
         * engrave "Elbereth" all at once.
         * However, you can engrave "Elb", then "ere", then "th", by taking
         * advantage of the rounding down. */
        if (ctx.actionct % 2 === 1) { /* 1st,3rd,... action */
            /* deduct a point on 1st, 3rd, 5th, ... turns, unless this is the
             * last character being engraved (a rather convoluted way to round
             * down), but always deduct a point on the 1st turn to prevent
             * zero-cost engravings.
             * Check for truncation *before* deducting a point - otherwise,
             * attempting to e.g. engrave 3 characters with a -2 weapon will
             * stop at the 1st. */
            if (stylus.spe <= -3) {
                /* impossible("<= -3 weapon valid for engraving") */
                truncate = true;
            } else if (endc < ctx.text.length || ctx.actionct === 1) {
                stylus.spe -= 1;
                dulled = true;
            }
        }
        if (splitstack) {
            obj_extract_self(stylus);
            stylus = await hold_another_object(stylus, 'You drop one %s!',
                                               doname(stylus), null);
        } else if (dulled && stylus.known) {
            /* reflect change in stylus->spe; not needed for splitstack
               since hold_another_object() does this */
            await prinv(null, stylus, 1);
            update_inventory();
        }
    } else if (marker) {
        let ink_cost = Math.max(Math.trunc(rate / 2), 1); /* Prevent infinite graffiti */

        if (stylus.spe < ink_cost) {
            /* impossible("overly dry marker valid for graffiti?") */
            ink_cost = stylus.spe;
            truncate = true;
        }
        stylus.spe -= ink_cost;
        update_inventory();
        if (stylus.spe === 0) {
            /* can't engrave any further; truncate the string */
            await Your('marker dries out.');
            truncate = true;
        }
    }

    switch (ctx.type) {
    default:
        finishverb = 'your weird engraving';
        break;
    case DUST:
        finishverb = is_ice(u.ux, u.uy) ? 'writing in the frost'
                     : 'writing in the dust';
        break;
    case HEADSTONE:
    case ENGRAVE:
        finishverb = 'engraving';
        break;
    case BURN:
        finishverb = is_ice(u.ux, u.uy) ? 'melting your message into the ice'
                     : 'burning your message into the floor';
        break;
    case MARK:
        finishverb = 'defacing the dungeon';
        break;
    case ENGR_BLOOD:
        finishverb = 'scrawling';
    }

    /* actions that happen at the end of every engraving action go here */

    buf = '';
    oep = engr_at(u.ux, u.uy);
    if (oep) /* add to existing engraving */
        buf = oep.engr_txt;

    space_left = BUFSZ - buf.length - 1;
    if (endc - ctx.nextc > space_left) {
        await You('run out of room to write.');
        endc = ctx.nextc + space_left;
        truncate = true;
    }

    /* If the stylus did wear out mid-engraving, truncate the input so that we
     * can't go any further. */
    if (truncate && endc < ctx.text.length) {
        ctx.text = ctx.text.slice(0, endc);
        await You(`are only able to write "${ctx.text}".`);
    } else {
        /* input was not truncated; stylus may still have worn out on the last
         * character, though */
        truncate = false;
    }

    buf += ctx.text.slice(ctx.nextc,
                          ctx.nextc + Math.min(space_left, endc - ctx.nextc));
    make_engr_at(u.ux, u.uy, buf, null, game.moves - (game.multi || 0),
                 ctx.type);
    oep = engr_at(u.ux, u.uy);
    if (oep) {
        oep.eread = 1;
        oep.erevealed = 1;
    }

    if (endc < ctx.text.length) {
        ctx.nextc = endc;
        if (neweng) {
            newsym(ctx.pos.x, ctx.pos.y);
        }
        return 1; /* not yet finished this turn */
    } else { /* finished engraving */
        /* actions that happen after the engraving is finished go here */

        if (truncate) {
            /* Now that "You are only able to write 'foo'" also prints at the
             * end of engraving, this might be redundant. */
            await You('cannot write any more.');
        } else if (!firsttime) {
            /* only print this if engraving took multiple actions */
            await You(`finish ${finishverb}.`);
        }
        ctx.text = '';
        ctx.nextc = 0;
        ctx.stylus = null;
    }
    if (neweng)
        newsym(ctx.pos.x, ctx.pos.y);
    return 0;
}

// src/engrave.c:1743 blind_writing[] — xcrypt()ed texts a blind writer's
// wand of polymorph substitutes
const blind_writing = [
    "Dfmibe\"E{qemr",
    "Qg`z\u007f!@qkqogc",
    "Imsibe\"La|mg$B\u007filwg~",
    "Kmlf0Lkh|\u007fo",
    "Qgpz\u007foghdq!Okm~r",
    "Lcvaq!Hk{ugc$Eekke",
    "Lghkxhmvzu!Oqzuow",
    "Dfm|x!Pefel",
    "Dfsibe\"V}civkf",
];

// src/engrave.c:48 blengr()
function blengr() {
    return blind_writing[rn2(blind_writing.length)];
}

// src/engrave.c:218 cant_reach_floor()
export async function cant_reach_floor(x, y, up, check_pit, wand_engraving) {
    await pline(`${
        wand_engraving
            ? 'The wand does nothing more, and the tip of the wand'
            : 'You'} can't reach the ${
        up  ? ceiling(x, y)
            : (check_pit && can_reach_floor(false)) ? 'bottom of the pit'
                                                    : surface(x, y)}.`);
}

// src/engrave.c disturb_grave(); summon a ghoul from a disturbed grave (once)
export async function disturb_grave(x, y) {
    const lev = game.level.at(x, y);

    if (!IS_GRAVE(lev.typ)) {
        /* impossible("Disturbing grave that isn't a grave? (%d)", lev->typ) */
    } else if (lev.disturbed) {
        /* impossible("Disturbing already disturbed grave?") */
    } else {
        await You('disturb the undead!');
        lev.disturbed = 1;
        const ghoul = await makemon(game.mons[PMNAMES.PM_GHOUL], x, y, NO_MM_FLAGS);
        if (ghoul && canspotmon(ghoul)) {
            set_msg_xy(ghoul.mx, ghoul.my);
            await Norep(`${Amonnam(ghoul)} suddenly appears next to you!`);
        }
        exercise(A_WIS, false);
    }
}
