// botl.js — the bottom status lines.
// C ref: src/botl.c
//
// Level descriptions, rank names, and status conditions.

import { game } from './gstate.js';
import { roles } from './role_data.js';
import { near_capacity } from './attrib.js';
import { NOT_HUNGRY, UNENCUMBERED, SICK_VOMITABLE, SICK_NONVOMITABLE,
         TT_LAVA } from './const.js';
import { Blind, Deaf, Levitation, Flying } from './youprop.js';
import { Is_knox_level, In_quest, In_endgame, In_tutorial } from './const.js';
import { depth, endgamelevelname } from './dungeon.js';
import { BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN,
         BL_SCORE, BL_CAP, BL_GOLD, BL_ENE, BL_ENEMAX, BL_XP, BL_AC, BL_HD,
         BL_TIME, BL_HUNGER, BL_HP, BL_HPMAX, BL_LEVELDESC, BL_EXP,
         BL_CONDITION, BL_VERS, BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_FLUSH,
         MAXBLSTATS, BL_TH_NONE, BL_TH_VAL_PERCENTAGE, BL_TH_UPDOWN,
         BL_TH_VAL_ABSOLUTE, BL_TH_TEXTMATCH, BL_TH_CONDITION,
         BL_TH_ALWAYS_HILITE, BL_TH_CRITICALHP, NO_LTEQGT, EQ_VALUE, LT_VALUE,
         LE_VALUE, GE_VALUE, GT_VALUE, TXT_VALUE, HL_UNDEF, HL_NONE, HL_BOLD,
         HL_DIM, HL_ITALIC, HL_ULINE, HL_BLINK, HL_INVERSE, HL_ATTCLR_BOLD,
         HL_ATTCLR_DIM, HL_ATTCLR_ITALIC, HL_ATTCLR_ULINE, HL_ATTCLR_BLINK,
         HL_ATTCLR_INVERSE, ANY_INT, ANY_LONG, ANY_STR, ANY_MASK32,
         BL_MASK_BAREH, BL_MASK_BLIND, BL_MASK_BUSY, BL_MASK_CONF,
         BL_MASK_DEAF, BL_MASK_ELF_IRON, BL_MASK_FLY, BL_MASK_FOODPOIS,
         BL_MASK_GLOWHANDS, BL_MASK_GRAB, BL_MASK_HALLU, BL_MASK_HELD,
         BL_MASK_ICY, BL_MASK_INLAVA, BL_MASK_LEV, BL_MASK_PARLYZ,
         BL_MASK_RIDE, BL_MASK_SLEEPING, BL_MASK_SLIME, BL_MASK_SLIPPERY,
         BL_MASK_STONE, BL_MASK_STRNGL, BL_MASK_STUN, BL_MASK_SUBMERGED,
         BL_MASK_TERMILL, BL_MASK_TETHERED, BL_MASK_TRAPPED, BL_MASK_UNCONSC,
         BL_MASK_WOUNDEDL, BL_MASK_HOLDING, SLT_ENCUMBER, OVERLOADED,
         SATIATED, STARVED, CLR_MAX, BUFSZ, MENU_BEHAVE_STANDARD,
         MENU_ITEMFLAGS_NONE, PICK_ONE, PICK_ANY, NHW_MENU,
         NHW_TEXT } from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
import { tty_create_nhwindow, tty_destroy_nhwindow, tty_start_menu,
         tty_add_menu, tty_add_menu_str, tty_end_menu, tty_select_menu,
         tty_display_nhwindow, tty_putstr } from './tty/wintty.js';
import { clr2colorname, query_color, query_attr } from './coloratt.js';
import { strNsubst } from './hacklib.js';
import { highc, strkitten } from './hacklib.js';
import { humanoid } from './mondata.js';
import { weapon_type, weapon_descr } from './weapon.js';
import { is_sword } from './wield.js';
import { bimanual } from './obj.js';
import { is_weptool } from './mkobj.js';
import { helm_simple_name } from './do_wear.js';
import { upstart } from './do_name.js';
import { OCLASSES, ONAMES } from './objects_data.js';
import { ART_MITRE_OF_HOLINESS, ART_TSURUGI_OF_MURAMASA } from './artilist_data.js';
import { P_LANCE, P_QUARTERSTAFF, P_MORNING_STAR, P_POLEARMS, P_UNICORN_HORN } from './const.js';
import { pline } from './display.js';
import { impossible } from './pline.js';

// src/botl.c describe_level(), return the output buffer and classification.
// The optional level replaces C callers' temporary assignment to u.uz.
export function describe_level(dflgs, lev = game.u.uz) {
    const addspace = !!(dflgs & 1);
    let addbranch = !!(dflgs & 2), text, special = 1;
    if (Is_knox_level(lev)) {
        text = game.dungeons[lev.dnum].dname;
        addbranch = false;
    } else if (In_quest(lev)) {
        text = `Home ${lev.dlevel}`;
    } else if (In_endgame(lev)) {
        text = endgamelevelname(depth(lev));
        if (!addbranch)
            text = text.replace('Plane of ', '');
        addbranch = false;
    } else {
        text = addbranch ? `level ${depth(lev)}`
            : `${In_tutorial(lev) ? 'Tutorial' : 'Dlvl'}:${String(depth(lev)).padEnd(2)}`;
        special = 0;
    }
    if (addbranch)
        text = `${text}, ${game.dungeons[lev.dnum].dname}`.replace('The ', 'the ');
    if (addspace)
        text += ' ';
    return { text, special };
}

/* src/botl.c:817 condtests[] — one row per status condition. `enabled`
   defaults to !opt_in and the 'status condition fields' option edits it; the
   options menu reports how many are on. Only id/useropt/optin/enabled are
   carried: the per-turn `test` fields belong to the status line, which is not
   driven from this table yet. */
export const condtests = [
    { id: 'bl_bareh',     useropt: 'barehanded',  rank: 20, optin: true,  enabled: false },
    { id: 'bl_blind',     useropt: 'blind',       rank: 10, optin: false, enabled: true },
    { id: 'bl_busy',      useropt: 'busy',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_conf',      useropt: 'conf',        rank: 10, optin: false, enabled: true },
    { id: 'bl_deaf',      useropt: 'deaf',        rank: 10, optin: false, enabled: true },
    { id: 'bl_elf_iron',  useropt: 'iron',        rank: 15, optin: false, enabled: true },
    { id: 'bl_fly',       useropt: 'fly',         rank: 10, optin: false, enabled: true },
    { id: 'bl_foodpois',  useropt: 'foodPois',    rank: 6,  optin: false, enabled: true },
    { id: 'bl_glowhands', useropt: 'glowhands',   rank: 20, optin: true,  enabled: false },
    { id: 'bl_grab',      useropt: 'grab',        rank: 2,  optin: false, enabled: true },
    { id: 'bl_hallu',     useropt: 'hallucinat',  rank: 10, optin: false, enabled: true },
    { id: 'bl_held',      useropt: 'held',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_icy',       useropt: 'ice',         rank: 20, optin: true,  enabled: false },
    { id: 'bl_inlava',    useropt: 'lava',        rank: 8,  optin: false, enabled: true },
    { id: 'bl_lev',       useropt: 'levitate',    rank: 10, optin: false, enabled: true },
    { id: 'bl_parlyz',    useropt: 'paralyzed',   rank: 20, optin: true,  enabled: false },
    { id: 'bl_ride',      useropt: 'ride',        rank: 10, optin: false, enabled: true },
    { id: 'bl_sleeping',  useropt: 'sleep',       rank: 20, optin: true,  enabled: false },
    { id: 'bl_slime',     useropt: 'slime',       rank: 6,  optin: false, enabled: true },
    { id: 'bl_slippery',  useropt: 'slip',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_stone',     useropt: 'stone',       rank: 6,  optin: false, enabled: true },
    { id: 'bl_strngl',    useropt: 'strngl',      rank: 4,  optin: false, enabled: true },
    { id: 'bl_stun',      useropt: 'stun',        rank: 10, optin: false, enabled: true },
    { id: 'bl_submerged', useropt: 'submerged',   rank: 15, optin: true,  enabled: false },
    { id: 'bl_termill',   useropt: 'termIll',     rank: 6,  optin: false, enabled: true },
    { id: 'bl_tethered',  useropt: 'tethered',    rank: 20, optin: true,  enabled: false },
    { id: 'bl_trapped',   useropt: 'trap',        rank: 20, optin: true,  enabled: false },
    { id: 'bl_unconsc',   useropt: 'unconscious', rank: 20, optin: true,  enabled: false },
    { id: 'bl_woundedl',  useropt: 'woundedlegs', rank: 20, optin: true,  enabled: false },
    { id: 'bl_holding',   useropt: 'holding',     rank: 20, optin: true,  enabled: false },
];

// src/botl.c:298 xlev_to_rank()
//
//   1..2 => 0,  3..5 => 1,  6..9 => 2,  10..13 => 3, ... 26..29 => 7, 30 => 8
// src/botl.c:478 weapon_status() — weapon description for status lines;
// started as a terser version of what ^X shows but has diverged to some extent
export function weapon_status() {
    const u = game.u;
    const uwep = u.uwep, uswapwep = u.uswapwep;
    let res = null;
    let outbuf = '';

    if (!uwep) {
        /* no weapon; gloves imply hands; humanoid also implies hands;
           otherwise make no assumptions */
        res = u.uarmg ? 'Empty-hnd' /* empty handed means "gloves only" */
              : humanoid(game.youmonst.data) ? 'Bare-hnds' /* bare hands */
                : 'No-weapon';
    } else if (u.twoweap) {
        /* two-weaponing implies hands and a weapon or wep-tool
           (not other odd stuff) in each hand */
        res = 'Dual-weps';
        /* note: dual wielding two lances doesn't produce double joust */
        if (u.usteed && (weapon_type(uwep) === P_LANCE
                         || weapon_type(uswapwep) === P_LANCE))
            res = 'Dual+joust'; /* lance behaves specially when mounted */
    } else {
        /* wielded weapon or wep-tool by its skill (an elven broadsword is
           described as a long sword, for instance; mattock and hook are
           exceptions), or wielded non-weapon item by its object class */
        const skill = weapon_type(uwep);

        if (u.usteed && skill === P_LANCE) {
            res = 'joust';
        } else if (uwep.otyp === ONAMES.AKLYS) {
            /* aklys has skill P_CLUB but in order to be able to throw it,
               give it a distinct name instead of skill name of "club";
               [maybe FIXME?] for the time being
               use real name even if 'obj' is undiscovered "thonged club" */
            res = 'aklys';
        } else if (is_sword(uwep)) {
            /* use "sword" for all swords rather than specific type
               (similar to messages when dropped due to slippery fingers) */
            res = 'sword';
        } else {
            switch (skill) {
            case P_QUARTERSTAFF:
                res = 'staff';
                break;
            case P_MORNING_STAR:
                res = 'mrng-star'; /* still pretty long */
                break;
            case P_POLEARMS:
                res = 'pole';
                break;
            case P_UNICORN_HORN:
                res = 'unihorn';
                break;
            default:
                res = weapon_descr(uwep);
                if (res.toLowerCase() === 'food'
                    && uwep.otyp === ONAMES.CREAM_PIE)
                    res = 'pie';
                break;
            }
        }

        if ((uwep.oclass === OCLASSES.WEAPON_CLASS
             || is_weptool(uwep, game.objects))
            && bimanual(uwep) && res[0] !== '2'
            && res.slice(0, 3).toLowerCase() !== 'two')
            outbuf += '2H-';
        /* Strcpy(p = eos(outbuf), res), res = outbuf; *p = highc(*p); */
        outbuf += highc(res[0]) + res.slice(1);
        /* replace any spaces with hyphens so that it's treated as one field
           of a space-separated status line */
        outbuf = strNsubst(outbuf, ' ', '-', 0);
        res = outbuf;
    }

    return res;
}

// src/botl.c:544 armor_status() — worn armor summary for status lines
export function armor_status() {
    const u = game.u;
    const n = !!u.uarmg + !!u.uarmc + !!u.uarm + !!u.uarmu + !!u.uarmh
              + !!u.uarmf + !!u.uarms;
    let armbuf;

    if (n === 0) { /* no armor */
        armbuf = 'naked';
    } else if (n === 1) { /* just one piece; spell it out */
        armbuf = u.uarmg ? 'gloves'
                 : u.uarmc ? 'cloak'
                   : u.uarm ? 'suit'
                     : u.uarmu ? 'shirt'
                       : u.uarmh ? helm_simple_name(u.uarmh) /* hat|helm */
                         : u.uarmf ? 'boots'
                           : u.uarms ? 'shield'
                             : ''; /* not possible */
    } else { /* more than one piece */
        armbuf = '';
        /* gloves first since they're the most likely to be cursed, cloak
           next since it tends to provide the most protection aside from
           raw AC */
        if (u.uarmg)
            armbuf += 'G'; /* gloves */
        if (u.uarmc)
            armbuf += 'C'; /* cloak */
        if (u.uarm)
            armbuf += 'A'; /* suit but 's' is for shield */
        if (u.uarmu)
            armbuf += 'U'; /* underwear? => shirt */
        if (u.uarmh)
            armbuf += 'H'; /* hat/helm */
        if (u.uarmf)
            armbuf += 'B'; /* footwear => boots */
        if (u.uarms)
            armbuf += 'S'; /* shield */
    }
    /* a hint about MC: a plus sign when it is augmented (the C notes that
       magical_negation() ought to answer this and that this is a shortcut
       to avoid scanning the inventory during status updates) */
    if ((u.uright && u.uright.otyp === ONAMES.RIN_PROTECTION)
        || (u.uleft && u.uleft.otyp === ONAMES.RIN_PROTECTION)
        || (u.uamul && u.uamul.otyp === ONAMES.AMULET_OF_GUARDING)
        || (u.uarmc && u.uarmc.otyp === ONAMES.CLOAK_OF_PROTECTION)
        || (u.uarmh && u.uarmh.oartifact === ART_MITRE_OF_HOLINESS)
        || (u.uwep && u.uwep.oartifact === ART_TSURUGI_OF_MURAMASA))
        armbuf = strkitten(armbuf, '+');

    return upstart(armbuf);
}

export function xlev_to_rank(xlev) {
    return (xlev <= 2) ? 0 : (xlev <= 30) ? Math.trunc((xlev + 2) / 4) : 8;
}

// src/botl.c:313 rank_to_xlev()
//
// Return the first experience level belonging to rank 0..8.
export function rank_to_xlev(rank) {
    return (rank < 1) ? 1 : (rank < 2) ? 3
           : (rank < 8) ? rank * 4 - 2 : 30;
}

// src/botl.c:332 rank_of()
export function rank_of(lev, role, female) {
    const r = role || game.urole;
    const tiers = Array.isArray(r?.rank) ? r.rank : [];

    for (let i = xlev_to_rank(lev); i >= 0; i--) {
        if (female && tiers[i]?.f) return tiers[i].f;
        if (tiers[i]?.m) return tiers[i].m;
    }
    if (female && r?.name?.f) return r.name.f;
    if (r?.name?.m) return r.name.m;
    return 'Player';
}

// src/botl.c:361 rank()
export function rank() {
    return rank_of(game.u.ulevel, game.urole, !!game.flags.female);
}

// src/botl.c:402 max_rank_sz()
export function max_rank_sz() {
    let r, maxr = 0;
    for (let i = 0; i < 9; i++) {
        if (game.urole.rank[i]?.m && (r = game.urole.rank[i].m.length) > maxr)
            maxr = r;
        if (game.urole.rank[i]?.f && (r = game.urole.rank[i].f.length) > maxr)
            maxr = r;
    }
    game.mrank_sz = maxr;
    return;
}

// src/eat.c hu_stat[] retains its legacy padding.  The tty status-field path
// trims that padding before it joins hunger to a following condition.
export const hu_stat = [
    "Satiated", "        ", "Hungry  ", "Weak    ",
    "Fainting", "Fainted ", "Starved "
];

// src/botl.c:11 enc_stat[]
export const enc_stat = [
    "",         "Burdened",  "Stressed",
    "Strained", "Overtaxed", "Overloaded"
];

// src/botl.c:781 conditions[]/:1333 cond_cmp(), tty/wintty.c:5150.
// Conditions follow hunger and capacity, sorted by rank then useroption.
export function bot_conditions(shrinklvl = 0) {
    const u = game.u;
    const intr = u.intrinsic || {};
    const props = u.uprops || {};
    let cond = '';
    if (u.uhs != null && u.uhs !== NOT_HUNGRY)
        cond += ' ' + hu_stat[u.uhs].trimEnd();
    const cap = near_capacity();
    if (cap > UNENCUMBERED) cond += ' ' + enc_stat[cap];
    /* src/botl.c:781 conditions[] — ranking, useroption (tie-break),
       and the three text widths the tty falls back through when the row
       does not fit (wintty.c cond_shrinklvl 0..2) */
    const sick_type = game._deferred_status_sick_type ?? u.usick_type;
    const blind = typeof game._deferred_status_blind === 'boolean'
        ? game._deferred_status_blind : Blind();
    const active = [];
    const add = (rank, useroption, texts) => active.push({ rank, useroption, texts });
    if (intr.HStrangled)
        add(4, 'strngl', ['Strngl', 'Stngl', 'Str']);
    if (sick_type & SICK_VOMITABLE)
        add(6, 'foodPois', ['FoodPois', 'Fpois', 'Poi']);
    if (props.SLIMED)
        add(6, 'slime', ['Slime', 'Slim', 'Slm']);
    if (props.STONED)
        add(6, 'stone', ['Stone', 'Ston', 'Sto']);
    if (sick_type & SICK_NONVOMITABLE)
        add(6, 'termIll', ['TermIll', 'Ill', 'Ill']);
    if (u.utrap && u.utraptype === TT_LAVA)
        add(8, 'lava', ['InLava', 'Lav', 'La']);
    if (blind)
        add(10, 'blind', ['Blind', 'Blnd', 'Bl']);
    if (intr.HConfusion || props.CONFUSION)
        add(10, 'conf', ['Conf', 'Cnf', 'Cf']);
    if (Deaf())
        add(10, 'deaf', ['Deaf', 'Def', 'Df']);
    if (Flying())
        add(10, 'fly', ['Fly', 'Fly', 'Fl']);
    if ((intr.HHallucination || props.HALLUC) && !props.HALLUC_RES)
        add(10, 'hallucinat', ['Hallu', 'Hal', 'Hl']);
    if (Levitation())
        add(10, 'levitate', ['Lev', 'Lev', 'Lv']);
    if (u.usteed)
        add(10, 'ride', ['Ride', 'Rid', 'Rd']);
    if (intr.HStun || props.STUNNED)
        add(10, 'stun', ['Stun', 'Stun', 'St']);
    /* src/botl.c:1333 cond_cmp(): ranking, then case-insensitive useroption */
    active.sort((a, b) => (a.rank - b.rank)
        || (a.useroption.toLowerCase() < b.useroption.toLowerCase() ? -1
            : a.useroption.toLowerCase() > b.useroption.toLowerCase() ? 1 : 0));
    for (const c of active)
        cond += ' ' + c.texts[shrinklvl];
    return cond;
}

/* src/botl.c:854 */
const c_Wall = 'Wall';

/*
 *  src/botl.c:863 terrain_descr[] — terrain feedback for the status line,
 *  indexed by iflags.terrain_typ; classify_terrain() supplies the extra
 *  pseudo-types past MAX_TYPE.
 */
export const terrain_descr = [
/* 0*/ 'Stone',         /* stone */
       c_Wall,          /* vwall */
       c_Wall,          /* hwall */
       c_Wall,          /* tlcorner */
       c_Wall,          /* trcorner */
       c_Wall,          /* blcorner */
       c_Wall,          /* brcorner */
       c_Wall,          /* crosswall */
       c_Wall,          /* tuwall */
       c_Wall,          /* tdwall */
/*10*/ c_Wall,          /* tlwall */
       c_Wall,          /* trwall */
       'Portcullis',    /* dbwall, closed drawbridge 'door' */
       'Tree',
       c_Wall,          /* sdoor: secret door */
       'Stone',         /* scorr: secret corridor */
       'Pool',          /* pool or non-moat water; can be boiled away */
       'Moat',          /* water that can't be boiled away */
       'Water',         /* water on Water level; can't be boiled or frozen */
       '(gap)',         /* drawbridge_up; replaced by whatever is under */
/*20*/ 'Lava',          /* lavapool */
       'LavaWall',      /* lava that extends to ceiling */
       'Bars',          /* ironbars */
       'Doorway',       /* doorless or broken door; diagonal movement is ok */
       'Corridor',      /* replaced by "Floor" */
       'Room',          /* also replaced by "Floor" */
       'Stairs',
       'Ladder',
       'Fountain',
       'Throne',
/*30*/ 'Sink',
       'Grave',
       'Altar',
       'Ice',
       'Bridge',        /* drawbridge_down, span across moat/ice/lava/floor */
       'Air',           /* open air on Air level or bubble on Water level */
       'Cloud',         /* [part of] a cloud or Air level */
/*37*/ '',              /* MAX_TYPE; skipped rather than overloaded */
/*38*/ c_Wall,          /* MATCH_WALL for special levels; shouldn't happen */
    /*
     * additional terrain names that aren't simple levl[][].typ values
     */
/*39*/ 'Floor',         /* substituted for room or corridor */
/*40*/ 'Ground',        /* 'room' on Earth level */
       'Open-door',     /* open (not broken or doorless) */
       'Shut-door',     /* closed or locked (or trapped) */
       'Swamp',         /* Juiblex level */
       'Submerged',     /* under water */
       'Sea',           /* moat terrain on Medusa's level: "shallow sea" */
       'WaterWall',     /* water that extends to the ceiling */
];

/* ---------------------------------------------------------------------------
 * Status hilite rules: the STATUS_HILITES half of src/botl.c.
 * C keeps each field's rules on gb.blstats[0][fld].thresholds and the
 * condition colorings in gc.cond_hilites[]; here game.blstats_thresholds[fld]
 * (an array in insertion order) and game.cond_hilites[] (indexed by color
 * and HL_ATTCLR_*). Applying the rules to the status rows (the renderer)
 * is not ported yet; see NOTES.
 * ------------------------------------------------------------------------- */

// src/botl.c:703 initblstats[] — name, format, value type, idxmax (the
// max-value field for percentage rules, -1 otherwise) and the BL id. Kept in
// C's table order and, like the C, looked up by position in initblstats[fld].
export const initblstats = [
    { fldname: 'title', fldfmt: '%s', anytype: ANY_STR, idxmax: -1, fld: BL_TITLE },
    { fldname: 'strength', fldfmt: ' St:%s', anytype: ANY_INT, idxmax: -1, fld: BL_STR },
    { fldname: 'dexterity', fldfmt: ' Dx:%s', anytype: ANY_INT, idxmax: -1, fld: BL_DX },
    { fldname: 'constitution', fldfmt: ' Co:%s', anytype: ANY_INT, idxmax: -1, fld: BL_CO },
    { fldname: 'intelligence', fldfmt: ' In:%s', anytype: ANY_INT, idxmax: -1, fld: BL_IN },
    { fldname: 'wisdom', fldfmt: ' Wi:%s', anytype: ANY_INT, idxmax: -1, fld: BL_WI },
    { fldname: 'charisma', fldfmt: ' Ch:%s', anytype: ANY_INT, idxmax: -1, fld: BL_CH },
    { fldname: 'alignment', fldfmt: ' %s', anytype: ANY_STR, idxmax: -1, fld: BL_ALIGN },
    { fldname: 'score', fldfmt: ' S:%s', anytype: ANY_LONG, idxmax: -1, fld: BL_SCORE },
    { fldname: 'carrying-capacity', fldfmt: ' %s', anytype: ANY_INT, idxmax: -1, fld: BL_CAP },
    { fldname: 'gold', fldfmt: ' %s', anytype: ANY_LONG, idxmax: -1, fld: BL_GOLD },
    { fldname: 'power', fldfmt: ' Pw:%s', anytype: ANY_INT, idxmax: BL_ENEMAX, fld: BL_ENE },
    { fldname: 'power-max', fldfmt: '(%s)', anytype: ANY_INT, idxmax: -1, fld: BL_ENEMAX },
    { fldname: 'experience-level', fldfmt: ' Xp:%s', anytype: ANY_INT, idxmax: BL_EXP, fld: BL_XP },
    { fldname: 'armor-class', fldfmt: ' AC:%s', anytype: ANY_INT, idxmax: -1, fld: BL_AC },
    { fldname: 'HD', fldfmt: ' HD:%s', anytype: ANY_INT, idxmax: -1, fld: BL_HD },
    { fldname: 'time', fldfmt: ' T:%s', anytype: ANY_LONG, idxmax: -1, fld: BL_TIME },
    /* hunger used to be 'ANY_UINT'; see note below in bot_via_windowport() */
    { fldname: 'hunger', fldfmt: ' %s', anytype: ANY_INT, idxmax: -1, fld: BL_HUNGER },
    { fldname: 'hitpoints', fldfmt: ' HP:%s', anytype: ANY_INT, idxmax: BL_HPMAX, fld: BL_HP },
    { fldname: 'hitpoints-max', fldfmt: '(%s)', anytype: ANY_INT, idxmax: -1, fld: BL_HPMAX },
    { fldname: 'dungeon-level', fldfmt: '%s', anytype: ANY_STR, idxmax: -1, fld: BL_LEVELDESC },
    { fldname: 'experience', fldfmt: '/%s', anytype: ANY_LONG, idxmax: BL_EXP, fld: BL_EXP },
    { fldname: 'condition', fldfmt: '%s', anytype: ANY_MASK32, idxmax: -1, fld: BL_CONDITION },
    { fldname: 'version', fldfmt: ' %s', anytype: ANY_STR, idxmax: -1, fld: BL_VERS },
    { fldname: 'weapon', fldfmt: ' %s', anytype: ANY_STR, idxmax: -1, fld: BL_WEAPON },
    { fldname: 'armor', fldfmt: ' %s', anytype: ANY_STR, idxmax: -1, fld: BL_ARMOR },
    { fldname: 'terrain', fldfmt: ' %s', anytype: ANY_STR, idxmax: -1, fld: BL_TERRAIN },
];

// src/botl.c:781 conditions[] — ranking, mask, identifier, txt1, txt2, txt3
export const conditions = [
    { ranking: 20, mask: BL_MASK_BAREH, id: 'bl_bareh', text: ['Bare', 'Bar', 'Bh'] },
    { ranking: 10, mask: BL_MASK_BLIND, id: 'bl_blind', text: ['Blind', 'Blnd', 'Bl'] },
    { ranking: 20, mask: BL_MASK_BUSY, id: 'bl_busy', text: ['Busy', 'Bsy', 'By'] },
    { ranking: 10, mask: BL_MASK_CONF, id: 'bl_conf', text: ['Conf', 'Cnf', 'Cf'] },
    { ranking: 10, mask: BL_MASK_DEAF, id: 'bl_deaf', text: ['Deaf', 'Def', 'Df'] },
    { ranking: 15, mask: BL_MASK_ELF_IRON, id: 'bl_elf_iron', text: ['Iron', 'Irn', 'Fe'] },
    { ranking: 10, mask: BL_MASK_FLY, id: 'bl_fly', text: ['Fly', 'Fly', 'Fl'] },
    { ranking: 6, mask: BL_MASK_FOODPOIS, id: 'bl_foodpois', text: ['FoodPois', 'Fpois', 'Poi'] },
    { ranking: 20, mask: BL_MASK_GLOWHANDS, id: 'bl_glowhands', text: ['Glow', 'Glo', 'Gl'] },
    { ranking: 2, mask: BL_MASK_GRAB, id: 'bl_grab', text: ['Grab', 'Grb', 'Gr'] },
    { ranking: 10, mask: BL_MASK_HALLU, id: 'bl_hallu', text: ['Hallu', 'Hal', 'Hl'] },
    { ranking: 20, mask: BL_MASK_HELD, id: 'bl_held', text: ['Held', 'Hld', 'Hd'] },
    { ranking: 20, mask: BL_MASK_ICY, id: 'bl_icy', text: ['Icy', 'Icy', 'Ic'] },
    { ranking: 8, mask: BL_MASK_INLAVA, id: 'bl_inlava', text: ['InLava', 'Lav', 'La'] },
    { ranking: 10, mask: BL_MASK_LEV, id: 'bl_lev', text: ['Lev', 'Lev', 'Lv'] },
    { ranking: 20, mask: BL_MASK_PARLYZ, id: 'bl_parlyz', text: ['Parlyz', 'Para', 'Par'] },
    { ranking: 10, mask: BL_MASK_RIDE, id: 'bl_ride', text: ['Ride', 'Rid', 'Rd'] },
    { ranking: 20, mask: BL_MASK_SLEEPING, id: 'bl_sleeping', text: ['Zzz', 'Zzz', 'Zz'] },
    { ranking: 6, mask: BL_MASK_SLIME, id: 'bl_slime', text: ['Slime', 'Slim', 'Slm'] },
    { ranking: 20, mask: BL_MASK_SLIPPERY, id: 'bl_slippery', text: ['Slip', 'Slp', 'Sl'] },
    { ranking: 6, mask: BL_MASK_STONE, id: 'bl_stone', text: ['Stone', 'Ston', 'Sto'] },
    { ranking: 4, mask: BL_MASK_STRNGL, id: 'bl_strngl', text: ['Strngl', 'Stngl', 'Str'] },
    { ranking: 10, mask: BL_MASK_STUN, id: 'bl_stun', text: ['Stun', 'Stun', 'St'] },
    { ranking: 15, mask: BL_MASK_SUBMERGED, id: 'bl_submerged', text: ['Submrg', 'Subm', 'Sm'] },
    { ranking: 6, mask: BL_MASK_TERMILL, id: 'bl_termill', text: ['TermIll', 'Ill', 'Ill'] },
    { ranking: 20, mask: BL_MASK_TETHERED, id: 'bl_tethered', text: ['Teth', 'Tth', 'Te'] },
    { ranking: 20, mask: BL_MASK_TRAPPED, id: 'bl_trapped', text: ['Trap', 'Trp', 'Tr'] },
    { ranking: 20, mask: BL_MASK_UNCONSC, id: 'bl_unconsc', text: ['Out', 'Out', 'KO'] },
    { ranking: 20, mask: BL_MASK_WOUNDEDL, id: 'bl_woundedl', text: ['WLegs', 'Leg', 'Lg'] },
    { ranking: 20, mask: BL_MASK_HOLDING, id: 'bl_holding', text: ['UHold', 'UHld', 'UHd'] },
];

// src/botl.c:749 condition_aliases[]
const condition_aliases = [
    { id: 'strangled', bitmask: BL_MASK_STRNGL },
    { id: 'all', bitmask: BL_MASK_BAREH | BL_MASK_BLIND | BL_MASK_BUSY
                          | BL_MASK_CONF | BL_MASK_DEAF | BL_MASK_ELF_IRON
                          | BL_MASK_FLY | BL_MASK_FOODPOIS | BL_MASK_GLOWHANDS
                          | BL_MASK_GRAB | BL_MASK_HALLU | BL_MASK_HELD
                          | BL_MASK_ICY | BL_MASK_INLAVA | BL_MASK_LEV
                          | BL_MASK_PARLYZ | BL_MASK_RIDE | BL_MASK_SLEEPING
                          | BL_MASK_SLIME | BL_MASK_SLIPPERY | BL_MASK_STONE
                          | BL_MASK_STRNGL | BL_MASK_STUN | BL_MASK_SUBMERGED
                          | BL_MASK_TERMILL | BL_MASK_TETHERED
                          | BL_MASK_TRAPPED | BL_MASK_UNCONSC
                          | BL_MASK_WOUNDEDL | BL_MASK_HOLDING },
    { id: 'major_troubles', bitmask: BL_MASK_FOODPOIS | BL_MASK_GRAB | BL_MASK_INLAVA
                                     | BL_MASK_SLIME | BL_MASK_STONE | BL_MASK_STRNGL
                                     | BL_MASK_TERMILL },
    { id: 'minor_troubles', bitmask: BL_MASK_BLIND | BL_MASK_CONF | BL_MASK_DEAF
                                     | BL_MASK_HALLU | BL_MASK_PARLYZ | BL_MASK_SUBMERGED
                                     | BL_MASK_STUN },
    { id: 'movement', bitmask: BL_MASK_LEV | BL_MASK_FLY | BL_MASK_RIDE },
    { id: 'opt_in', bitmask: BL_MASK_BAREH | BL_MASK_BUSY | BL_MASK_GLOWHANDS
                             | BL_MASK_HELD | BL_MASK_ICY | BL_MASK_PARLYZ
                             | BL_MASK_SLEEPING | BL_MASK_SLIPPERY
                             | BL_MASK_SUBMERGED | BL_MASK_TETHERED
                             | BL_MASK_TRAPPED
                             | BL_MASK_UNCONSC | BL_MASK_WOUNDEDL
                             | BL_MASK_HOLDING },
];

/* src/botl.c:2215 */
const threshold_value = 'hilite_status threshold ',
      is_out_of_range = ' is out of range';

/* C: gb.blstats[0][fld].thresholds; blstats[1] shares the same list */
function blstats_thresholds(fld) {
    const all = (game.blstats_thresholds ||= {});
    return (all[fld] ||= []);
}

/* C: gc.cond_hilites[], colors 0..CLR_MAX-1 then the HL_ATTCLR_* slots */
function cond_hilites() {
    return (game.cond_hilites ||= new Array(HL_ATTCLR_INVERSE + 1).fill(0));
}

// src/botl.c:1930 s_to_anything() — the ANY_INT and ANY_LONG arms used by
// the rule editor; C's atoi()/atol()
function s_to_anything(buf, anytype) {
    const n = parseInt(buf, 10);
    return Number.isNaN(n) ? 0 : n;
}

// src/botl.c:2321 reset_status_hilites() — the per-field hilite timers
// belong to the unported renderer; the status rows are redrawn
export function reset_status_hilites() {
    (game.disp ||= {}).botlx = true;
}

// src/botl.c:2576 split_clridx()
function split_clridx(idx) {
    return { coloridx: idx & 0x00ff, attrib: (idx >> 8) & 0x00ff };
}

// src/botl.c:2747 query_arrayvalue() — pick one entry of arr[arrmin..arrmax)
async function query_arrayvalue(querystr, arr, arrmin, arrmax) {
    let ret = arrmin - 1;
    const adj = (arrmin > 0) ? 1 : arrmax;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = arrmin; i < arrmax; i++) {
        if (!arr[i])  /* the array of hunger status values has a gap ...*/
            continue; /*... set to Null between Satiated and Hungry     */
        tty_add_menu(tmpwin, null, i + adj, 0, 0, ATR_NONE,
                     clr, arr[i], MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, querystr);
    const picks = await tty_select_menu(tmpwin, PICK_ONE);
    tty_destroy_nhwindow(tmpwin);
    if (picks.length > 0)
        ret = picks[0] - adj;
    return ret;
}

// src/botl.c:2784 status_hilite_add_threshold()
function status_hilite_add_threshold(fld, hilite) {
    if (!hilite)
        return;
    /* alloc and initialize a new hilite_s struct */
    const new_hilite = { ...hilite };
    new_hilite.set = true;
    new_hilite.fld = fld;
    /* insert new entry at the end of the list */
    blstats_thresholds(fld).push(new_hilite);
}

// src/botl.c:3109 query_conditions()
async function query_conditions() {
    let ret = 0;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < conditions.length; i++) {
        tty_add_menu(tmpwin, null, conditions[i].mask, 0, 0, ATR_NONE,
                     clr, conditions[i].text[0], MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Choose status conditions');
    const picks = await tty_select_menu(tmpwin, PICK_ANY);
    tty_destroy_nhwindow(tmpwin);
    if (picks.length > 0) {
        for (const mask of picks)
            ret |= mask;
    }
    return ret;
}

// src/botl.c:3141 conditionbitmask2str()
function conditionbitmask2str(ul) {
    let buf = '';
    let first = true;
    let alias = null;

    if (!ul)
        return buf;

    for (let i = 1; i < condition_aliases.length; i++)
        if (condition_aliases[i].bitmask === ul)
            alias = condition_aliases[i].id;

    for (let i = 0; i < conditions.length; i++)
        if ((conditions[i].mask & ul) !== 0) {
            buf += `${first ? '' : '+'}${conditions[i].text[0]}`;
            first = false;
        }

    if (!first && alias)
        buf = alias;

    return buf;
}

// src/botl.c:3369 hlattr2attrname() — "+"-joined attribute names, "normal"
// for HL_NONE, null when there is no attribute
function hlattr2attrname(attrib) {
    if (attrib) {
        let attbuf = '';
        let first = 0;

        if (attrib === HL_NONE)
            return 'normal';
        if (attrib & HL_BOLD)
            attbuf += first++ ? '+bold' : 'bold';
        if (attrib & HL_DIM)
            attbuf += first++ ? '+dim' : 'dim';
        if (attrib & HL_ITALIC)
            attbuf += first++ ? '+italic' : 'italic';
        if (attrib & HL_ULINE)
            attbuf += first++ ? '+underline' : 'underline';
        if (attrib & HL_BLINK)
            attbuf += first++ ? '+blink' : 'blink';
        if (attrib & HL_INVERSE)
            attbuf += first++ ? '+inverse' : 'inverse';
        return attbuf;
    }
    return null;
}

/* src/botl.c:3408 struct _status_hilite_line_str; these don't need to be
   in 'struct g' */
let status_hilite_str = [];
let status_hilite_str_id = 0;

// src/botl.c:3417 status_hilite_linestr_add()
function status_hilite_linestr_add(fld, hl, mask, str) {
    status_hilite_str.push({
        id: ++status_hilite_str_id,
        fld,
        hl,
        mask,
        str: (fld === BL_TITLE) ? str : str.replace(/ /g, ''), /* stripchars() */
    });
}

// src/botl.c:3448 status_hilite_linestr_done()
function status_hilite_linestr_done() {
    status_hilite_str = [];
    status_hilite_str_id = 0;
}

// src/botl.c:3462 status_hilite_linestr_countfield()
function status_hilite_linestr_countfield(fld) {
    const countall = (fld === BL_FLUSH);
    let count = 0;

    for (const tmp of status_hilite_str) {
        if (countall || tmp.fld === fld)
            count++;
    }
    return count;
}

// src/botl.c:3477 count_status_hilites()
export function count_status_hilites() {
    status_hilite_linestr_gather();
    const count = status_hilite_linestr_countfield(BL_FLUSH);
    status_hilite_linestr_done();
    return count;
}

// src/botl.c:3488 status_hilite_linestr_gather_conditions()
function status_hilite_linestr_gather_conditions() {
    const ch = cond_hilites();
    const cond_maps = conditions.map(() => ({ bm: 0, clratr: 0 }));

    for (let i = 0; i < conditions.length; i++) {
        let clr = NO_COLOR;
        let atr = HL_NONE;

        for (let j = 0; j < CLR_MAX; j++)
            if (ch[j] & conditions[i].mask) {
                clr = j;
                break;
            }
        if (ch[HL_ATTCLR_BOLD] & conditions[i].mask)
            atr |= HL_BOLD;
        if (ch[HL_ATTCLR_DIM] & conditions[i].mask)
            atr |= HL_DIM;
        if (ch[HL_ATTCLR_ITALIC] & conditions[i].mask)
            atr |= HL_ITALIC;
        if (ch[HL_ATTCLR_ULINE] & conditions[i].mask)
            atr |= HL_ULINE;
        if (ch[HL_ATTCLR_BLINK] & conditions[i].mask)
            atr |= HL_BLINK;
        if (ch[HL_ATTCLR_INVERSE] & conditions[i].mask)
            atr |= HL_INVERSE;
        if (atr !== HL_NONE)
            atr &= ~HL_NONE;

        if (clr !== NO_COLOR || atr !== HL_NONE) {
            const ca = clr | (atr << 8);
            let added_condmap = false;

            for (let j = 0; j < conditions.length; j++)
                if (cond_maps[j].clratr === ca) {
                    cond_maps[j].bm |= conditions[i].mask;
                    added_condmap = true;
                    break;
                }
            if (!added_condmap) {
                for (let j = 0; j < conditions.length; j++)
                    if (!cond_maps[j].bm) {
                        cond_maps[j].bm = conditions[i].mask;
                        cond_maps[j].clratr = ca;
                        break;
                    }
            }
        }
    }

    for (let i = 0; i < conditions.length; i++)
        if (cond_maps[i].bm) {
            const { coloridx: clr, attrib: atr } = split_clridx(cond_maps[i].clratr);
            if (clr !== NO_COLOR || atr !== HL_NONE) {
                let clrbuf = strNsubst(clr2colorname(clr), ' ', '-', 0);
                const tmpattr = hlattr2attrname(atr);
                if (tmpattr)
                    clrbuf += `&${tmpattr}`;
                const condbuf = `condition/${conditionbitmask2str(cond_maps[i].bm)}/${clrbuf}`;
                status_hilite_linestr_add(BL_CONDITION, null, cond_maps[i].bm, condbuf);
            }
        }
}

// src/botl.c:3570 status_hilite_linestr_gather()
function status_hilite_linestr_gather() {
    status_hilite_linestr_done();
    for (let i = 0; i < MAXBLSTATS; i++) {
        for (const hl of blstats_thresholds(i))
            status_hilite_linestr_add(i, hl, 0, status_hilite2str(hl));
    }
    status_hilite_linestr_gather_conditions();
}

// src/botl.c:3590 status_hilite2str() — "field/behavior/color[&attr]"
function status_hilite2str(hl) {
    if (!hl)
        return null;

    let behavebuf = '';
    const op = (hl.rel === LT_VALUE) ? '<'
               : (hl.rel === LE_VALUE) ? '<='
                 : (hl.rel === GT_VALUE) ? '>'
                   : (hl.rel === GE_VALUE) ? '>='
                     : (hl.rel === EQ_VALUE) ? '='
                       : null;

    switch (hl.behavior) {
    case BL_TH_VAL_PERCENTAGE:
        if (op)
            behavebuf = `${op}${hl.value}%`;
        else
            void impossible('hl->behavior=percentage, rel error');
        break;
    case BL_TH_UPDOWN:
        if (hl.rel === LT_VALUE)
            behavebuf = 'down';
        else if (hl.rel === GT_VALUE)
            behavebuf = 'up';
        else if (hl.rel === EQ_VALUE)
            behavebuf = 'changed';
        else
            void impossible('hl->behavior=updown, rel error');
        break;
    case BL_TH_VAL_ABSOLUTE:
        if (op)
            behavebuf = `${op}${hl.value}`;
        else
            void impossible('hl->behavior=absolute, rel error');
        break;
    case BL_TH_TEXTMATCH:
        if (hl.rel === TXT_VALUE && hl.textmatch)
            behavebuf = hl.textmatch;
        else
            void impossible('hl->behavior=textmatch, rel or textmatch error');
        break;
    case BL_TH_CONDITION:
        if (hl.rel === EQ_VALUE)
            behavebuf = conditionbitmask2str(hl.value);
        else
            void impossible('hl->behavior=condition, rel error');
        break;
    case BL_TH_ALWAYS_HILITE:
        behavebuf = 'always';
        break;
    case BL_TH_CRITICALHP:
        behavebuf = 'criticalhp';
        break;
    case BL_TH_NONE:
        break;
    default:
        break;
    }

    const { coloridx: clr, attrib: attr } = split_clridx(hl.coloridx);
    let clrbuf = strNsubst(clr2colorname(clr), ' ', '-', 0);
    if (attr !== HL_UNDEF) {
        const tmpattr = hlattr2attrname(attr);
        if (tmpattr)
            clrbuf += `&${tmpattr}`;
    }
    return `${initblstats[hl.fld].fldname}/${behavebuf}/${clrbuf}`;
}

// src/botl.c:3672 status_hilite_menu_choose_field()
async function status_hilite_menu_choose_field() {
    let fld = BL_FLUSH;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < MAXBLSTATS; i++) {
        if (initblstats[i].fld === BL_SCORE
            && !blstats_thresholds(BL_SCORE).length)
            continue;
        tty_add_menu(tmpwin, null, i + 1, 0, 0, ATR_NONE,
                     clr, initblstats[i].fldname, MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, 'Select a hilite field:');
    const picks = await tty_select_menu(tmpwin, PICK_ONE);
    tty_destroy_nhwindow(tmpwin);
    if (picks.length > 0)
        fld = picks[0] - 1;
    return fld;
}

// src/botl.c:3707 status_hilite_menu_choose_behavior()
async function status_hilite_menu_choose_behavior(fld) {
    let res = 0, beh = BL_TH_NONE - 1;
    let onlybeh = BL_TH_NONE, nopts = 0;
    const clr = NO_COLOR;

    if (fld < 0 || fld >= MAXBLSTATS)
        return BL_TH_NONE;

    const at = initblstats[fld].anytype;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    if (fld !== BL_CONDITION) {
        onlybeh = BL_TH_ALWAYS_HILITE;
        tty_add_menu(tmpwin, null, onlybeh, 'a', 0, ATR_NONE, clr,
                     `Always highlight ${initblstats[fld].fldname}`,
                     MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    if (fld === BL_CONDITION) {
        onlybeh = BL_TH_CONDITION;
        tty_add_menu(tmpwin, null, onlybeh, 'b', 0, ATR_NONE, clr,
                     'Bitmask of conditions', MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    if (fld !== BL_CONDITION && fld !== BL_VERS) {
        onlybeh = BL_TH_UPDOWN;
        tty_add_menu(tmpwin, null, onlybeh, 'c', 0, ATR_NONE, clr,
                     `${initblstats[fld].fldname} value changes`,
                     MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    if (fld !== BL_CAP && fld !== BL_HUNGER
        && (at === ANY_INT || at === ANY_LONG)) {
        onlybeh = BL_TH_VAL_ABSOLUTE;
        tty_add_menu(tmpwin, null, onlybeh, 'n', 0, ATR_NONE, clr,
                     'Number threshold', MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    if (initblstats[fld].idxmax >= 0) {
        onlybeh = BL_TH_VAL_PERCENTAGE;
        tty_add_menu(tmpwin, null, onlybeh, 'p', 0, ATR_NONE, clr,
                     'Percentage threshold', MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    if (fld === BL_HP) {
        onlybeh = BL_TH_CRITICALHP;
        tty_add_menu(tmpwin, null, onlybeh, 'C', 0, ATR_NONE, clr,
                     `Highlight critically low ${initblstats[fld].fldname}`,
                     MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    if (initblstats[fld].anytype === ANY_STR
        || fld === BL_CAP || fld === BL_HUNGER) {
        onlybeh = BL_TH_TEXTMATCH;
        tty_add_menu(tmpwin, null, onlybeh, 't', 0, ATR_NONE, clr,
                     `${initblstats[fld].fldname} text match`,
                     MENU_ITEMFLAGS_NONE);
        nopts++;
    }

    tty_end_menu(tmpwin, `Select ${initblstats[fld].fldname} field hilite behavior:`);
    let picks = [];
    if (nopts > 1) {
        picks = await tty_select_menu(tmpwin, PICK_ONE);
        res = picks.cancelled ? -1 : picks.length;
        if (res === 0) /* none chosen*/
            beh = BL_TH_NONE;
        else if (res === -1) /* menu cancelled */
            beh = (BL_TH_NONE - 1);
    } else if (onlybeh !== BL_TH_NONE) {
        beh = onlybeh;
    }
    tty_destroy_nhwindow(tmpwin);
    if (res > 0)
        beh = picks[0];
    return beh;
}

// src/botl.c:3811 status_hilite_menu_choose_updownboth()
async function status_hilite_menu_choose_updownboth(fld, str, ltok, gtok) {
    let ret = NO_LTEQGT;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    if (ltok) {
        tty_add_menu(tmpwin, null, 10 + LT_VALUE, 0, 0, ATR_NONE, clr,
                     str ? `${(fld === BL_AC) ? 'Better (lower)' : 'Less'} than ${str}`
                         : 'Value goes down',
                     MENU_ITEMFLAGS_NONE);
        if (str) {
            tty_add_menu(tmpwin, null, 10 + LE_VALUE, 0, 0, ATR_NONE, clr,
                         `${str} or ${(fld === BL_AC) ? 'better (lower)' : 'less'}`,
                         MENU_ITEMFLAGS_NONE);
        }
    }

    tty_add_menu(tmpwin, null, 10 + EQ_VALUE, 0, 0, ATR_NONE, clr,
                 str ? `Exactly ${str}` : 'Value changes', MENU_ITEMFLAGS_NONE);

    if (gtok) {
        if (str) {
            tty_add_menu(tmpwin, null, 10 + GE_VALUE, 0, 0, ATR_NONE, clr,
                         `${str} or ${(fld === BL_AC) ? 'worse (higher)' : 'more'}`,
                         MENU_ITEMFLAGS_NONE);
        }
        tty_add_menu(tmpwin, null, 10 + GT_VALUE, 0, 0, ATR_NONE, clr,
                     str ? `${(fld === BL_AC) ? 'Worse (higher)' : 'More'} than ${str}`
                         : 'Value goes up',
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(tmpwin, `Select field ${initblstats[fld].fldname} value:`);
    const picks = await tty_select_menu(tmpwin, PICK_ONE);
    tty_destroy_nhwindow(tmpwin);
    if (picks.length > 0)
        ret = picks[0] - 10;
    return ret;
}

// src/botl.c:3890 status_hilite_menu_add() — the C's gotos (choose_field,
// choose_behavior, choose_value, choose_color) are the states of one loop
async function status_hilite_menu_add(origfld) {
    let fld;
    let behavior;
    let lt_gt_eq = NO_LTEQGT;
    let clr = NO_COLOR, atr = HL_UNDEF;
    let hilite;
    let cond = 0;
    let colorqry = '';
    let attrqry = '';
    let retry = 0;
    let numstart = '';
    let state = 'choose_field';

    for (;;) {
        if (state === 'choose_field') {
            fld = origfld;
            if (fld === BL_FLUSH) {
                fld = await status_hilite_menu_choose_field();
                /* isn't this redundant given what follows? */
                if (fld === BL_FLUSH)
                    return false;
            }
            if (fld === BL_FLUSH)
                return false;

            colorqry = '';
            attrqry = '';
            hilite = { set: false, fld, behavior: BL_TH_NONE, rel: NO_LTEQGT,
                       value: 0, textmatch: '', coloridx: 0, anytype: 0 };
            state = 'choose_behavior';
        }
        if (state === 'choose_behavior') {
            behavior = await status_hilite_menu_choose_behavior(fld);
            if (behavior === (BL_TH_NONE - 1)) {
                return false;
            } else if (behavior === BL_TH_NONE) {
                if (origfld === BL_FLUSH) {
                    state = 'choose_field';
                    continue;
                }
                return false;
            }
            hilite.behavior = behavior;
            state = 'choose_value';
        }
        if (state === 'choose_value') {
            if (retry++ > 5) {
                await pline("That's enough tries.");
                return false;
            }

            if (behavior === BL_TH_VAL_PERCENTAGE
                || behavior === BL_TH_VAL_ABSOLUTE) {
                let val, dt;
                let gotnum = false;
                const percent = (behavior === BL_TH_VAL_PERCENTAGE);

                lt_gt_eq = NO_LTEQGT; /* not set up yet */
                const { getlin } = await import('./cmd.js');
                const inbuf = await getlin(`Enter ${percent ? 'percentage ' : ''}value for ${
                    initblstats[fld].fldname} threshold:`);
                if (inbuf === null || inbuf === '' || inbuf[0] === '\x1b') {
                    state = 'choose_behavior';
                    continue;
                }
                let inp = inbuf.trim(); /* trimspaces() */
                if (!inp) {
                    state = 'choose_behavior';
                    continue;
                }
                /* allow user to enter "<50%" or ">50" or just "50"
                   or <=50% or >=50 or =50 */
                let pos = 0;
                if (inp[0] === '>' || inp[0] === '<' || inp[0] === '=') {
                    lt_gt_eq = (inp[0] === '>') ? ((inp[1] === '=') ? GE_VALUE : GT_VALUE)
                             : (inp[0] === '<') ? ((inp[1] === '=') ? LE_VALUE : LT_VALUE)
                               : EQ_VALUE;
                    pos++;
                    if (lt_gt_eq === GE_VALUE || lt_gt_eq === LE_VALUE)
                        pos++;
                }
                numstart = inp.slice(pos);
                let p = 0;
                if (numstart[p] === '-') {
                    p++;
                } else if (numstart[p] === '+') {
                    numstart = numstart.slice(1);
                }
                while (numstart[p] !== undefined && numstart[p] >= '0' && numstart[p] <= '9') {
                    p++;
                    gotnum = true;
                }
                if (numstart[p] === '%') {
                    if (!percent) {
                        await pline('Not expecting a percentage.');
                        state = 'choose_behavior';
                        continue;
                    }
                    numstart = numstart.slice(0, p); /* strip '%' [this accepts trailing junk!] */
                } else if (numstart[p] !== undefined) {
                    /* some random characters */
                    await pline(`"${numstart.slice(p)}" is not a recognized number.`);
                    state = 'choose_value';
                    continue;
                }
                if (!gotnum) {
                    await pline('Is that an invisible number?');
                    state = 'choose_value';
                    continue;
                }
                const op = (lt_gt_eq === LT_VALUE) ? '<'
                           : (lt_gt_eq === LE_VALUE) ? '<='
                             : (lt_gt_eq === GT_VALUE) ? '>'
                               : (lt_gt_eq === GE_VALUE) ? '>='
                                 : (lt_gt_eq === EQ_VALUE) ? '='
                                   : ''; /* didn't specify lt_gt_eq with number */
                dt = percent ? ANY_INT : initblstats[fld].anytype;
                const aval = s_to_anything(numstart, dt);
                if (percent) {
                    val = aval;
                    if (initblstats[fld].idxmax === -1) {
                        await pline(`Field '${initblstats[fld].fldname
                            }' does not support percentage values.`);
                        behavior = BL_TH_VAL_ABSOLUTE;
                        state = 'choose_value';
                        continue;
                    }
                    /* if player only specified a number then lt_gt_eq isn't set
                       up yet and the >-1 and <101 exceptions can't be honored;
                       deliberate use of those should be uncommon enough for
                       that to be palatable; for 0 and 100, choose_updown_both()
                       will prevent useless operations */
                    if ((val < 0 && (val !== -1 || lt_gt_eq !== GT_VALUE))
                        || (val === 0 && lt_gt_eq === LT_VALUE)
                        || (val === 100 && lt_gt_eq === GT_VALUE)
                        || (val > 100 && (val !== 101 || lt_gt_eq !== LT_VALUE))) {
                        await pline(`'${op}${val}%' is not a valid percent value.`);
                        state = 'choose_value';
                        continue;
                    }
                    /* restore suffix for use in color and attribute prompts */
                    if (!numstart.includes('%'))
                        numstart += '%';
                /* reject negative values except for AC and >-1; reject 0 for < */
                } else if (dt === ANY_INT
                           && (aval < ((fld === BL_AC) ? -128
                                       : (lt_gt_eq === GT_VALUE) ? -1
                                         : (lt_gt_eq === LT_VALUE) ? 1 : 0))) {
                    await pline(`${threshold_value}'${op}${aval}'${is_out_of_range}`);
                    state = 'choose_value';
                    continue;
                } else if (dt === ANY_LONG
                           && (aval < ((lt_gt_eq === GT_VALUE) ? -1
                                       : (lt_gt_eq === LT_VALUE) ? 1 : 0))) {
                    await pline(`${threshold_value}'${op}${aval}'${is_out_of_range}`);
                    state = 'choose_value';
                    continue;
                }

                if (lt_gt_eq === NO_LTEQGT) {
                    const ltok = ((dt === ANY_INT)
                                  ? (aval > 0 || fld === BL_AC)
                                  : (aval > 0)),
                          gtok = (!percent || aval < 100);

                    lt_gt_eq = await status_hilite_menu_choose_updownboth(fld, inbuf,
                                                                          ltok, gtok);
                    if (lt_gt_eq === NO_LTEQGT) {
                        state = 'choose_value';
                        continue;
                    }
                }

                const relword = (lt_gt_eq === LT_VALUE) ? 'less than '
                                : (lt_gt_eq === GT_VALUE) ? 'more than '
                                  : '';
                const relsuffix = (lt_gt_eq === LE_VALUE) ? ' or less'
                                  : (lt_gt_eq === GE_VALUE) ? ' or more'
                                    : '';
                colorqry = `Choose a color for when ${initblstats[fld].fldname} is ${
                    relword}${numstart}${relsuffix}:`;
                attrqry = `Choose attribute for when ${initblstats[fld].fldname} is ${
                    relword}${numstart}${relsuffix}:`;

                hilite.rel = lt_gt_eq;
                hilite.value = aval;
            } else if (behavior === BL_TH_UPDOWN) {
                if (initblstats[fld].anytype !== ANY_STR) {
                    const ltok = (fld !== BL_TIME), gtok = true;

                    lt_gt_eq = await status_hilite_menu_choose_updownboth(fld, null,
                                                                          ltok, gtok);
                    if (lt_gt_eq === NO_LTEQGT) {
                        state = 'choose_behavior';
                        continue;
                    }
                } else { /* ANY_STR */
                    /* player picked '<field> value changes' in outer menu;
                       ordered string comparison is supported but LT/GT for the
                       string status fields (title, dungeon level, alignment)
                       is pointless; rather than calling ..._choose_updownboth()
                       with ltok==False plus gtok=False and having a menu with a
                       single choice, skip it altogether and just use 'changed' */
                    lt_gt_eq = EQ_VALUE;
                }
                const chg = (lt_gt_eq === EQ_VALUE) ? 'changes'
                            : (lt_gt_eq === LT_VALUE) ? 'decreases'
                              : 'increases';
                colorqry = `Choose a color for when ${initblstats[fld].fldname} ${chg}:`;
                attrqry = `Choose attribute for when ${initblstats[fld].fldname} ${chg}:`;
                hilite.rel = lt_gt_eq;
            } else if (behavior === BL_TH_CONDITION) {
                cond = await query_conditions();
                if (!cond) {
                    if (origfld === BL_FLUSH) {
                        state = 'choose_field';
                        continue;
                    }
                    return false;
                }
                colorqry = `Choose a color for conditions ${conditionbitmask2str(cond)}:`;
                attrqry = `Choose attribute for conditions ${conditionbitmask2str(cond)}:`;
            } else if (behavior === BL_TH_TEXTMATCH) {
                const qry_buf = `${(fld === BL_CAP
                                    || fld === BL_ALIGN
                                    || fld === BL_HUNGER
                                    || fld === BL_TITLE) ? 'Choose' : 'Enter'} ${
                    initblstats[fld].fldname} text value to match:`;

                if (fld === BL_CAP) {
                    const rv = await query_arrayvalue(qry_buf, enc_stat,
                                                      SLT_ENCUMBER, OVERLOADED + 1);
                    if (rv < SLT_ENCUMBER) {
                        state = 'choose_behavior';
                        continue;
                    }
                    hilite.rel = TXT_VALUE;
                    hilite.textmatch = enc_stat[rv];
                } else if (fld === BL_ALIGN) {
                    const aligntxt = ['chaotic', 'neutral', 'lawful'];
                    const rv = await query_arrayvalue(qry_buf, aligntxt, 0, 2 + 1);
                    if (rv < 0) {
                        state = 'choose_behavior';
                        continue;
                    }
                    hilite.rel = TXT_VALUE;
                    hilite.textmatch = aligntxt[rv];
                } else if (fld === BL_HUNGER) {
                    const hutxt = ['Satiated', null, 'Hungry', 'Weak',
                                   'Fainting', 'Fainted', 'Starved'];
                    const rv = await query_arrayvalue(qry_buf, hutxt, SATIATED, STARVED + 1);
                    if (rv < SATIATED) {
                        state = 'choose_behavior';
                        continue;
                    }
                    hilite.rel = TXT_VALUE;
                    hilite.textmatch = hutxt[rv];
                } else if (fld === BL_TITLE) {
                    const rolelist = [];
                    for (let i = 0; i < 9; i++) {
                        const rank = game.urole.rank[i] || {};
                        const mbuf = `"${rank.m}"`;
                        let fbuf = '', obuf = '';
                        if (rank.f) {
                            fbuf = `"${rank.f}"`;
                            obuf = `${game.flags.female ? fbuf : mbuf} or ${
                                game.flags.female ? mbuf : fbuf}`;
                        }
                        if (game.flags.female) {
                            if (fbuf)
                                rolelist.push(fbuf);
                            rolelist.push(mbuf);
                            if (obuf)
                                rolelist.push(obuf);
                        } else {
                            rolelist.push(mbuf);
                            if (fbuf)
                                rolelist.push(fbuf);
                            if (obuf)
                                rolelist.push(obuf);
                        }
                    }
                    rolelist.push('"none of the above (polymorphed)"');
                    const rv = await query_arrayvalue(qry_buf, rolelist, 0, rolelist.length);
                    if (rv >= 0) {
                        hilite.rel = TXT_VALUE;
                        hilite.textmatch = rolelist[rv];
                    }
                    if (rv < 0) {
                        state = 'choose_behavior';
                        continue;
                    }
                } else {
                    const { getlin } = await import('./cmd.js');
                    const inbuf = await getlin(qry_buf);
                    if (inbuf === null || inbuf === '' || inbuf[0] === '\x1b') {
                        state = 'choose_behavior';
                        continue;
                    }
                    hilite.rel = TXT_VALUE;
                    if (inbuf.length < BUFSZ)
                        hilite.textmatch = inbuf;
                    else
                        return false;
                }
                colorqry = `Choose a color for when ${initblstats[fld].fldname} is '${
                    hilite.textmatch}':`;
                attrqry = `Choose attribute for when ${initblstats[fld].fldname} is '${
                    hilite.textmatch}':`;
            } else if (behavior === BL_TH_ALWAYS_HILITE) {
                colorqry = `Choose a color to always hilite ${initblstats[fld].fldname}:`;
                attrqry = `Choose attribute to always hilite ${initblstats[fld].fldname}:`;
            }
            state = 'choose_color';
        }
        if (state === 'choose_color') {
            clr = await query_color(colorqry, NO_COLOR);
            if (clr === -1) {
                state = (behavior !== BL_TH_ALWAYS_HILITE) ? 'choose_value'
                                                            : 'choose_behavior';
                continue;
            }
            atr = await query_attr(attrqry, ATR_NONE);
            if (atr === -1) {
                state = 'choose_color';
                continue;
            }
            break;
        }
    }

    if (behavior === BL_TH_CONDITION) {
        const ch = cond_hilites();

        if (atr & HL_BOLD)
            ch[HL_ATTCLR_BOLD] |= cond;
        if (atr & HL_DIM)
            ch[HL_ATTCLR_DIM] |= cond;
        if (atr & HL_ITALIC)
            ch[HL_ATTCLR_ITALIC] |= cond;
        if (atr & HL_ULINE)
            ch[HL_ATTCLR_ULINE] |= cond;
        if (atr & HL_BLINK)
            ch[HL_ATTCLR_BLINK] |= cond;
        if (atr & HL_INVERSE)
            ch[HL_ATTCLR_INVERSE] |= cond;
        if (atr === HL_NONE) {
            ch[HL_ATTCLR_BOLD] &= ~cond;
            ch[HL_ATTCLR_DIM] &= ~cond;
            ch[HL_ATTCLR_ITALIC] &= ~cond;
            ch[HL_ATTCLR_ULINE] &= ~cond;
            ch[HL_ATTCLR_BLINK] &= ~cond;
            ch[HL_ATTCLR_INVERSE] &= ~cond;
        }
        ch[clr] |= cond;
        let clrbuf = strNsubst(clr2colorname(clr), ' ', '-', 0);
        const tmpattr = hlattr2attrname(atr);
        if (tmpattr)
            clrbuf += `&${tmpattr}`;
        await pline(`Added hilite condition/${conditionbitmask2str(cond)}/${clrbuf}`);
    } else {
        hilite.coloridx = clr | (atr << 8);
        hilite.anytype = initblstats[fld].anytype;

        let p;
        if (fld === BL_TITLE && (p = hilite.textmatch.toLowerCase().indexOf(' or ')) >= 0) {
            /* split menu choice "male-rank or female-rank" into two distinct
               but otherwise identical rules, "male-rank" and "female-rank" */
            const female_rank = hilite.textmatch.slice(p + ' or '.length);
            hilite.textmatch = hilite.textmatch.slice(0, p); /* chop off " or female-rank" */
            /* new rule for male-rank */
            status_hilite_add_threshold(fld, hilite);
            await pline(`Added hilite ${status_hilite2str(hilite)}`);
            /* transfer female-rank to start of hilite.textmatch buffer */
            hilite.textmatch = female_rank;
            /* proceed with normal addition of new rule */
        }
        status_hilite_add_threshold(fld, hilite);
        await pline(`Added hilite ${status_hilite2str(hilite)}`);
    }
    reset_status_hilites();
    return true;
}

// src/botl.c:4305 status_hilite_remove()
function status_hilite_remove(id) {
    const hlstr = status_hilite_str.find(h => h.id === id);

    if (!hlstr)
        return false;

    if (hlstr.fld === BL_CONDITION) {
        const ch = cond_hilites();
        for (let i = 0; i < CLR_MAX; i++)
            ch[i] &= ~hlstr.mask;
        ch[HL_ATTCLR_BOLD] &= ~hlstr.mask;
        ch[HL_ATTCLR_DIM] &= ~hlstr.mask;
        ch[HL_ATTCLR_ITALIC] &= ~hlstr.mask;
        ch[HL_ATTCLR_ULINE] &= ~hlstr.mask;
        ch[HL_ATTCLR_BLINK] &= ~hlstr.mask;
        ch[HL_ATTCLR_INVERSE] &= ~hlstr.mask;
        return true;
    } else {
        const list = blstats_thresholds(hlstr.fld);
        const idx = list.indexOf(hlstr.hl);
        if (idx >= 0) {
            list.splice(idx, 1);
            return true;
        }
    }
    return false;
}

// src/botl.c:4357 status_hilite_menu_fld()
async function status_hilite_menu_fld(fld) {
    let count = status_hilite_linestr_countfield(fld);
    let acted;
    const clr = NO_COLOR;

    if (!count) {
        if (await status_hilite_menu_add(fld)) {
            status_hilite_linestr_done();
            status_hilite_linestr_gather();
            count = status_hilite_linestr_countfield(fld);
        } else
            return false;
    }

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

    if (count) {
        for (const hlstr of status_hilite_str) {
            if (hlstr.fld === fld) {
                tty_add_menu(tmpwin, null, hlstr.id, 0, 0, ATR_NONE,
                             clr, hlstr.str, MENU_ITEMFLAGS_NONE);
            }
        }
    } else {
        tty_add_menu_str(tmpwin, `No current hilites for ${initblstats[fld].fldname}`);
    }

    /* separator line */
    tty_add_menu_str(tmpwin, '');

    if (count) {
        tty_add_menu(tmpwin, null, -1, 'X', 0, ATR_NONE, clr,
                     'Remove selected hilites', MENU_ITEMFLAGS_NONE);
    }

    if (fld === BL_SCORE) {
        /* suppress 'Z - Add a new hilite' for 'score' when SCORE_ON_BOTL
           is disabled; we wouldn't be called for 'score' unless it has
           hilite rules from the config file, so count must be positive
           (hence there's no risk that we're putting up an empty menu) */
        ;
    } else {
        tty_add_menu(tmpwin, null, -2, 'Z', 0, ATR_NONE,
                     clr, 'Add new hilites', MENU_ITEMFLAGS_NONE);
    }

    tty_end_menu(tmpwin, `Current ${initblstats[fld].fldname} hilites:`);
    acted = false;
    const picks = await tty_select_menu(tmpwin, PICK_ANY);
    const res = picks.cancelled ? -1 : picks.length;
    if (res > 0) {
        let mode = 0;

        for (const idx of picks) {
            if (idx === -1)
                mode |= 1; /* delete selected hilites */
            else if (idx === -2)
                mode |= 2; /* create new hilites */
        }
        if (mode & 1) { /* delete selected hilites */
            for (const idx of picks) {
                if (idx > 0 && status_hilite_remove(idx))
                    acted = true;
            }
        }
        if (mode & 2) { /* create new hilites */
            while (await status_hilite_menu_add(fld))
                acted = true;
        }
    }
    tty_destroy_nhwindow(tmpwin);
    return acted;
}

// src/botl.c:4499 status_hilites_viewall()
async function status_hilites_viewall() {
    const datawin = tty_create_nhwindow(NHW_TEXT);

    for (const hlstr of status_hilite_str)
        tty_putstr(datawin, 0, `OPTIONS=hilite_status: ${hlstr.str}`);
    await tty_display_nhwindow(datawin);
    tty_destroy_nhwindow(datawin);
}

// src/botl.c:4498 status_hilite_menu()
export async function status_hilite_menu() {
    let redo;
    let countall;
    const clr = NO_COLOR;

    do {
        redo = false;

        const tmpwin = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);

        status_hilite_linestr_gather();
        countall = status_hilite_linestr_countfield(BL_FLUSH);

        if (countall) {
            tty_add_menu(tmpwin, null, -1, 0, 0, ATR_NONE,
                         clr, 'View all hilites in config format',
                         MENU_ITEMFLAGS_NONE);
            tty_add_menu_str(tmpwin, '');
        }

        for (let i = 0; i < MAXBLSTATS; i++) {
            const fld = initblstats[i].fld;
            const count = status_hilite_linestr_countfield(fld);

            /* config file might contain rules for highlighting 'score'
               even when SCORE_ON_BOTL is disabled; if so, 'O' command
               menus will show them and allow deletions but not additions,
               otherwise, it won't show 'score' at all */
            if (fld === BL_SCORE && !count)
                continue;
            let buf = initblstats[i].fldname.padEnd(18);
            if (count)
                buf += ` (${count} defined)`;
            tty_add_menu(tmpwin, null, fld + 1, 0, 0, ATR_NONE,
                         clr, buf, MENU_ITEMFLAGS_NONE);
        }
        tty_end_menu(tmpwin, 'Status hilites:');
        const picks = await tty_select_menu(tmpwin, PICK_ONE);
        if (picks.length > 0) {
            const fld = picks[0] - 1;

            if (fld < 0) {
                await status_hilites_viewall();
            } else {
                if (await status_hilite_menu_fld(fld))
                    reset_status_hilites();
            }
            redo = true;
        }
        tty_destroy_nhwindow(tmpwin);

        countall = status_hilite_linestr_countfield(BL_FLUSH);
        status_hilite_linestr_done();

        /* fuzzer is unlikely to pick something useful within nested menus;
           limit it to one try */
    } while (redo && !game.iflags?.debug_fuzzer);

    /* hilite_delta=='statushilites' does double duty:  it is the
       number of turns for temporary highlights to remain visible
       and also when non-zero it is the flag to enable highlighting */
    if (countall > 0 && !(game.iflags?.hilite_delta))
        (game.iflags ||= {}).hilite_delta = 3;

    return true;
}
