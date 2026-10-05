// botl.js — the bottom status lines.
// C ref: src/botl.c
//
// Level descriptions, rank names, and status conditions.

import { game } from './gstate.js';

import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA, A_CHAOTIC, A_NEUTRAL, MAX_TYPE, ICE, TT_BURIEDBALL, BOTL_NSIZ, QBUFSZ, MAXVALWIDTH, BL_CHARACTERISTICS, BL_RESET, CONDITION_COUNT, Is_rogue_level } from './const.js';
import { ACURR } from './attrib.js';

import { Upolyd } from './const.js';

import { boolean_option, config_error_add } from './options.js';

import { suppress_map_output } from './display.js';

import { pmname } from './do_name.js';

import { money_cnt } from './invent.js';

import { status_version } from './version.js';

import { classify_terrain } from './hack.js';

import { sticks } from './mondata.js';

import { MONSYMS } from './monst_data.js';

import { Confusion, Hallucination, Stunned, Underwater, Glib, Wounded_legs } from './youprop.js';

import { unconscious } from './trap.js';

import { newuexp } from './exper.js';

import { critically_low_hp } from './pray.js';

import { fuzzymatch, trimspaces } from './hacklib.js';

import { match_str2attr, match_str2clr } from './coloratt.js';

import { def_oc_syms } from './drawing_data.js';

import { gs_showsyms } from './symbols.js';

import { status_update, status_enablefield } from './windows.js';

import { tty_status_init, wintty_wire_botl,
         ATR_BOLD, ATR_DIM, ATR_ITALIC, ATR_ULINE, ATR_BLINK, ATR_INVERSE } from './tty/wintty.js';

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
 * and HL_ATTCLR_*). The renderer that applies them to the status rows is
 * tty_status_update() in js/tty/wintty.js.
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

// src/botl.c:2321 reset_status_hilites() — called by options handling when
// 'statushilites' value is changed
export function reset_status_hilites() {
    if (game.iflags?.hilite_delta) {
        let i;

        if (game.blstats)
            for (i = 0; i < MAXBLSTATS; ++i)
                game.blstats[0][i].time = game.blstats[1][i].time = 0;
        game.update_all = true;
    }
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

/* ---------------------------------------------------------------------------
 * The status lines through the window port: src/botl.c bot() /
 * bot_via_windowport() and the STATUS_HILITES evaluation.  gb.blstats[2][]
 * is game.blstats, gv.valset is game.valset, gn.now_or_before_idx is
 * game.now_or_before_idx, gu.update_all is game.update_all and
 * gb.bl_hilite_moves is game.bl_hilite_moves.
 * ------------------------------------------------------------------------- */

// src/botl.c:130 get_strength_str() — "18/xx" for exceptional strength
export function get_strength_str() {
    const STR18 = (x) => 18 + x;
    const st = ACURR(A_STR);

    if (st > 18) {
        if (st > STR18(100))
            return String(st - 100);
        else if (st < STR18(100))
            return `18/${String(st - 18).padStart(2, '0')}`;
        else
            return '18/**';
    }
    return String(st);
}

// src/botl.c:253 bot() — the status lines; every tty build has both
// WC2_HILITE_STATUS and WC2_FLUSH_STATUS, so VIA_WINDOWPORT() is true
export async function bot() {
    if (game.bot_disabled)
        return;
    /* dosave() flags completion by setting u.uhp to -1; suppress_map_output()
       covers program_state.restoring and is used for status as well as map */
    if (game.u.uhp !== -1 && game.youmonst?.data
        && boolean_option('status_updates') && !suppress_map_output()) {
        bot_via_windowport();
    }
    const disp = (game.disp ||= {});
    disp.botl = disp.botlx = disp.time_botl = false;
}

// src/botl.c:275 timebot() — special purpose status update: move counter
// ('time' status) only
export function timebot() {
    if (game.bot_disabled)
        return;
    /* we're called when disp.time_botl is set and general disp.botl
       is clear; disp.time_botl gets set whenever svm.moves changes value
       so there's no benefit in tracking previous value to decide whether
       to skip update; suppress_map_output() handles program_state.restoring
       and program_state.done_hup (tty hangup => no further output at all)
       and we use it for maybe skipping status as well as for the map */
    if (game.flags?.time && boolean_option('status_updates')
        && !suppress_map_output()) {
        stat_update_time();
    }
    (game.disp ||= {}).time_botl = false;
}

/* src/botl.c:912 the caches for the unconscious/paralyzed condition tests */
function cond_cache_prepA(cache) {
    let clear_cache = false, refresh_cache = false;

    if (game.multi < 0) {
        if (game.nomovemsg || game.multi_reason) {
            if (cache.nomovemsg !== (game.nomovemsg || null))
                refresh_cache = true;
            if (cache.multi_reason !== (game.multi_reason || null))
                refresh_cache = true;
        } else {
            clear_cache = true;
        }
    } else {
        clear_cache = true;
    }
    if (clear_cache) {
        cache.nomovemsg = null;
        cache.multi_reason = null;
    }
    if (refresh_cache) {
        cache.nomovemsg = game.nomovemsg || null;
        cache.multi_reason = game.multi_reason || null;
    }
    if (clear_cache || refresh_cache) {
        cache.avail[0] = cache.avail[1] = false;
        cache.reslt[0] = cache.reslt[1] = false;
    }
}

/* the current gold symbol of the status line; the C passes
   encglyph(objnum_to_glyph(GOLD_PIECE)) and the tty decodes it through
   the current symset (the Rogue level shows the Rogue set's '*') */
function status_gold_symbol() {
    const u = game.u;
    let goldch;

    if (Is_rogue_level(u.uz))
        goldch = def_oc_syms[OCLASSES.GEM_CLASS];
    else
        goldch = gs_showsyms.O?.[OCLASSES.COIN_CLASS] ?? def_oc_syms[OCLASSES.COIN_CLASS];
    /* check_gold_symbol(): iflags.invis_goldsym = (goldch <= ' ') */
    return (game.iflags?.in_dumplog || !goldch || goldch <= ' ') ? '$' : goldch;
}

// src/botl.c:962 bot_via_windowport()
export function bot_via_windowport() {
    let buf, titl, nb;
    let i, idx, cap;
    let money;
    const u = game.u;
    const flags = game.flags || {};

    if (!game.blinit)
        status_initialize(false); /* C panics "bot before init." */

    /* toggle from previous iteration */
    idx = 1 - (game.now_or_before_idx | 0); /* 0 -> 1, 1 -> 0 */
    game.now_or_before_idx = idx;
    const bl = game.blstats[idx];

    /* clear the "value set" indicators */
    const valset = game.valset = new Array(MAXBLSTATS).fill(false);

    /*
     * Note: min(x,9999) - we enforce the same maximum on hp, maxhp,
     * pw, maxpw, and gold as basic status formatting so that the two
     * modes of status display don't produce different information.
     */

    /*
     *  Player name and title.
     */
    nb = buf = game.plname || '';
    nb = highc(nb[0] || '') + nb.slice(1);
    titl = !Upolyd(u) ? rank()
           : pmname(game.mons[u.umonnum], (Upolyd(u) ? u.mfemale : flags.female) ? 1 : 0);
    i = nb.length + ' the '.length + titl.length;
    /* if "Name the Rank/monster" is too long, we truncate the name but
       always keep at least BOTL_NSIZ characters of it; when hitpointbar is
       enabled, anything beyond 30 (long monster name) will be truncated */
    if (i > 30) {
        i = 30 - (' the '.length + titl.length);
        nb = nb.slice(0, Math.max(i, BOTL_NSIZ));
    }
    nb += ' the ';
    if (Upolyd(u)) { /* when poly'd, capitalize monster name */
        nb += titl.replace(/(^|\s)(\S)/g, (m, sp, ch) => sp + highc(ch));
    } else {
        nb += titl;
    }
    buf = nb;
    bl[BL_TITLE].val = buf.padEnd(30); /* "%-30s" */
    valset[BL_TITLE] = true; /* indicate val already set */

    /* Strength */
    bl[BL_STR].a = ACURR(A_STR);
    bl[BL_STR].val = get_strength_str();
    valset[BL_STR] = true; /* indicate val already set */

    /*  Dexterity, constitution, intelligence, wisdom, charisma. */
    bl[BL_DX].a = ACURR(A_DEX);
    bl[BL_CO].a = ACURR(A_CON);
    bl[BL_IN].a = ACURR(A_INT);
    bl[BL_WI].a = ACURR(A_WIS);
    bl[BL_CH].a = ACURR(A_CHA);

    /* Alignment */
    bl[BL_ALIGN].val = (u.ualign.type === A_CHAOTIC)
                       ? 'Chaotic'
                       : (u.ualign.type === A_NEUTRAL)
                          ? 'Neutral'
                          : 'Lawful';

    /* Score */
    bl[BL_SCORE].a = 0; /* SCORE_ON_BOTL is not defined */

    /*  Hit points  */
    i = (Upolyd(u) ? u.mh : u.uhp) | 0;
    if (i < 0) /* gameover sets u.uhp to -1 */
        i = 0;
    bl[BL_HP].rawval = i;
    bl[BL_HP].a = Math.min(i, 9999);
    i = (Upolyd(u) ? u.mhmax : u.uhpmax) | 0;
    bl[BL_HPMAX].rawval = i;
    bl[BL_HPMAX].a = Math.min(i, 9999);

    /*  Dungeon level. */
    bl[BL_LEVELDESC].val = describe_level(1).text;
    valset[BL_LEVELDESC] = true; /* indicate val already set */

    /* Gold */
    if ((money = money_cnt(game.invent)) < 0)
        money = 0; /* ought to issue impossible() and then discard gold */
    bl[BL_GOLD].rawval = money;
    bl[BL_GOLD].a = Math.min(money, 999999);
    /* the tty port needs to display the current symbol for gold as a
       field header; the C encodes it as \GXXXXNNNN and the tty decodes it */
    bl[BL_GOLD].val = `${status_gold_symbol()}:${bl[BL_GOLD].a}`;
    valset[BL_GOLD] = true; /* indicate val already set */

    /* Power (magical energy) */
    bl[BL_ENE].rawval = u.uen | 0;
    bl[BL_ENE].a = Math.min(u.uen | 0, 9999);
    bl[BL_ENEMAX].rawval = u.uenmax | 0;
    bl[BL_ENEMAX].a = Math.min(u.uenmax | 0, 9999);

    /* Armor class */
    bl[BL_AC].a = u.uac | 0;

    /* Monster level (if Upolyd) */
    bl[BL_HD].a = Upolyd(u) ? game.mons[u.umonnum].mlevel : 0;

    /* Experience */
    bl[BL_XP].a = u.ulevel | 0;
    bl[BL_EXP].a = u.uexp | 0;

    /* Time (moves) */
    bl[BL_TIME].a = game.moves | 0;

    /* Hunger */
    bl[BL_HUNGER].a = u.uhs | 0;
    bl[BL_HUNGER].val = (u.uhs !== NOT_HUNGRY) ? hu_stat[u.uhs] : '';
    valset[BL_HUNGER] = true;

    /* Carrying capacity */
    cap = near_capacity();
    bl[BL_CAP].a = cap;
    bl[BL_CAP].val = (cap > UNENCUMBERED) ? enc_stat[cap] : '';
    valset[BL_CAP] = true;

    /* Version; unchanging unless player toggles 'showvers' option or
       modifies 'versinfo' option; toggling showvers off will clear it */
    if (bl[BL_VERS].a !== (flags.versinfo ?? 1)) {
        bl[BL_VERS].a = (flags.versinfo ?? 1);
        valset[BL_VERS] = false;
    }
    if (!valset[BL_VERS]) {
        bl[BL_VERS].val = status_version(false);
        valset[BL_VERS] = true;
    }

    /* Conditions */

    bl[BL_CONDITION].a = 0;

    const ct = condtests;
    const test_if_enabled = (c, v) => { if (ct[c].enabled) ct[c].test = v; };
    const bl_ = (id) => condtests.findIndex((t) => t.id === id);
    const bl_bareh = bl_('bl_bareh'), bl_blind = bl_('bl_blind'),
          bl_busy = bl_('bl_busy'), bl_conf = bl_('bl_conf'),
          bl_deaf = bl_('bl_deaf'), bl_elf_iron = bl_('bl_elf_iron'),
          bl_fly = bl_('bl_fly'), bl_foodpois = bl_('bl_foodpois'),
          bl_glowhands = bl_('bl_glowhands'), bl_grab = bl_('bl_grab'),
          bl_hallu = bl_('bl_hallu'), bl_held = bl_('bl_held'),
          bl_icy = bl_('bl_icy'), bl_inlava = bl_('bl_inlava'),
          bl_lev = bl_('bl_lev'), bl_parlyz = bl_('bl_parlyz'),
          bl_ride = bl_('bl_ride'), bl_sleeping = bl_('bl_sleeping'),
          bl_slime = bl_('bl_slime'), bl_slippery = bl_('bl_slippery'),
          bl_stone = bl_('bl_stone'), bl_strngl = bl_('bl_strngl'),
          bl_stun = bl_('bl_stun'), bl_submerged = bl_('bl_submerged'),
          bl_termill = bl_('bl_termill'), bl_tethered = bl_('bl_tethered'),
          bl_trapped = bl_('bl_trapped'), bl_unconsc = bl_('bl_unconsc'),
          bl_woundedl = bl_('bl_woundedl'), bl_holding = bl_('bl_holding');

    ct[bl_foodpois].test = ct[bl_termill].test = false;
    if (u.uprops?.SICK) { /* Sick */
        test_if_enabled(bl_foodpois, (u.usick_type & SICK_VOMITABLE) !== 0);
        test_if_enabled(bl_termill, (u.usick_type & SICK_NONVOMITABLE) !== 0);
    }
    ct[bl_inlava].test = ct[bl_tethered].test = ct[bl_trapped].test = false;
    if (u.utrap) {
        test_if_enabled(bl_inlava, (u.utraptype === TT_LAVA));
        test_if_enabled(bl_tethered, (u.utraptype === TT_BURIEDBALL));
        /* if in-lava or tethered is disabled and the condition applies,
           lump it in with trapped */
        test_if_enabled(bl_trapped, (!ct[bl_inlava].test && !ct[bl_tethered].test));
    }
    ct[bl_grab].test = ct[bl_held].test = ct[bl_holding].test = false;
    if (u.ustuck) {
        /* it is possible for a hero in sticks() form to be swallowed,
           so swallowed needs to be checked first; it is not possible for
           a hero in sticks() form to be held--sticky hero does the holding
           even if u.ustuck is also a holder */
        if (u.uswallow) {
            /* engulfed/swallowed isn't currently a tracked status condition;
               "held" might look odd for it but seems better than blank */
            test_if_enabled(bl_held, true);
        } else if (Upolyd(u) && sticks(game.youmonst.data)) {
            test_if_enabled(bl_holding, true);
        } else {
            /* grab == hero is held by sea monster and about to be drowned;
               held == hero is held by something else and can't move away */
            test_if_enabled(bl_grab, (u.ustuck.data.mlet === MONSYMS.S_EEL));
            test_if_enabled(bl_held, !ct[bl_grab].test);
        }
    }
    ct[bl_blind].test     = Blind() ? true : false;
    ct[bl_conf].test      = Confusion() ? true : false;
    ct[bl_deaf].test      = Deaf() ? true : false;
    ct[bl_fly].test       = Flying() ? true : false;
    ct[bl_glowhands].test = (u.umconf) ? true : false;
    ct[bl_hallu].test     = Hallucination() ? true : false;
    ct[bl_lev].test       = Levitation() ? true : false;
    ct[bl_ride].test      = (u.usteed) ? true : false;
    ct[bl_slime].test     = (u.uprops?.SLIMED) ? true : false;   /* Slimed */
    ct[bl_stone].test     = (u.uprops?.STONED) ? true : false;   /* Stoned */
    ct[bl_strngl].test    = (u.intrinsic?.HStrangled) ? true : false; /* Strangled */
    ct[bl_stun].test      = Stunned() ? true : false;
    ct[bl_submerged].test = Underwater() ? true : false;
    test_if_enabled(bl_elf_iron, false);
    test_if_enabled(bl_bareh, (!u.uarmg && !u.uwep));
    test_if_enabled(bl_icy, (game.level.at(u.ux, u.uy).typ === ICE));
    test_if_enabled(bl_slippery, Glib() ? true : false);
    test_if_enabled(bl_woundedl, Wounded_legs() ? true : false);

    if (game.multi < 0) {
        const cache = (game._cond_cache ||= { nomovemsg: null, multi_reason: null,
                                              avail: [false, false],
                                              reslt: [false, false] });
        cond_cache_prepA(cache);
        if (ct[bl_unconsc].enabled
            && cache.nomovemsg && !cache.avail[0]) {
                cache.reslt[0] = (!u.usleep && unconscious());
                cache.avail[0] = true;
        }
        if (ct[bl_parlyz].enabled
            && cache.multi_reason && !cache.avail[1]) {
                cache.reslt[1] = (cache.multi_reason.startsWith('paralyzed')
                                 || cache.multi_reason.startsWith('frozen'));
                cache.avail[1] = true;
        }
        if (cache.avail[0] && cache.reslt[0]) {
            ct[bl_unconsc].test = cache.reslt[0];
        } else if (cache.avail[1] && cache.reslt[1]) {
            ct[bl_parlyz].test = cache.reslt[1];
        } else if (ct[bl_sleeping].enabled && u.usleep) {
            ct[bl_sleeping].test = true;
        } else if (ct[bl_busy].enabled) {
            ct[bl_busy].test = true;
        }
    } else {
        ct[bl_unconsc].test = ct[bl_parlyz].test =
            ct[bl_sleeping].test = ct[bl_busy].test = false;
    }

    for (i = 0; i < CONDITION_COUNT; ++i) {
        if (ct[i].enabled
             /* && i != bl_holding  */ /* uncomment to suppress UHold */
                && ct[i].test)
            bl[BL_CONDITION].a |= conditions[i].mask;
    }

    /*
     * Optionally displayed weapon(s), armor, and terrain.
     */
    if (flags.weaponstatus)
        bl[BL_WEAPON].val = weapon_status();
    else
        bl[BL_WEAPON].val = '';

    if (flags.armorstatus)
        bl[BL_ARMOR].val = armor_status();
    else
        bl[BL_ARMOR].val = '';

    if (flags.terrainstatus) {
        if ((game.iflags.terrain_typ ?? MAX_TYPE) === MAX_TYPE)
            classify_terrain();
        i = game.iflags.terrain_typ;
        if (bl[BL_TERRAIN].a !== i) {
            bl[BL_TERRAIN].val = terrain_descr[i];
            bl[BL_TERRAIN].a = i;
        }
    } else {
        bl[BL_TERRAIN].val = '';
        /* MAX_TYPE is "none of the above" for levl[][].typ */
        bl[BL_TERRAIN].a = MAX_TYPE;
    }
    valset[BL_TERRAIN] = true;

    /* now request rendering */
    evaluate_and_notify_windowport(valset, idx);
}

// src/botl.c:1285 stat_update_time() — update just the status lines'
// 'time' field
function stat_update_time() {
    const idx = game.now_or_before_idx | 0; /* no 0/1 toggle */
    const fld = BL_TIME;

    if (!game.blinit)
        return;
    /* Time (moves) */
    game.blstats[idx][fld].a = game.moves;
    (game.valset ||= new Array(MAXBLSTATS).fill(false))[fld] = false;

    eval_notify_windowport_field(fld, game.valset, idx);
    status_update(BL_FLUSH, null, 0, 0, NO_COLOR, null); /* WC2_FLUSH_STATUS */
    return;
}

// src/botl.c:1308 condopt() — deal with player's choice to change
// processing of a condition; addr == null re-initializes the choices
export function condopt(idx, addr, negated) {
    let i;

    /* sanity check */
    if ((idx < 0 || idx >= CONDITION_COUNT))
        return;

    if (!addr) {
        /* special: indicates a request to init so
           set the choice values to match the defaults */
        game.condmenu_sortorder = 0;
        const cond_idx = (game.cond_idx = []);
        for (i = 0; i < CONDITION_COUNT; ++i) {
            cond_idx[i] = i;
            condtests[i].choice = condtests[i].enabled;
        }
        cond_idx.sort(cond_cmp);
    } else {
        /* (addr == &condtests[idx].choice) */
        condtests[idx].enabled = negated ? false : true;
        condtests[idx].choice = condtests[idx].enabled;
        /* avoid lingering false positives if test is no longer run */
        condtests[idx].test = false;
    }
}

// src/botl.c:1333 cond_cmp() — qsort callback routine for sorting the
// condition index
function cond_cmp(indx1, indx2) {
    const c1 = conditions[indx1].ranking, c2 = conditions[indx2].ranking;

    if (c1 !== c2)
        return c1 - c2;
    /* tie-breaker - visible alpha by name */
    const a = condtests[indx1].useropt.toLowerCase(),
          b = condtests[indx2].useropt.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
}

/* the sorted condition index; the C fills it from condopt(0, NULL, 0)
   during option initialization */
export function cond_idx() {
    if (!game.cond_idx)
        condopt(0, null, false);
    return game.cond_idx;
}

// src/botl.c:1493 eval_notify_windowport_field()
function eval_notify_windowport_field(fld, valsetlist, idx) {
    let pc, chg, color = NO_COLOR;
    let anytype;
    let updated = false, reset;
    let curr, prev;
    let fldmax;

    /*
     *  Now pass the changed values to window port.
     */
    anytype = game.blstats[idx][fld].anytype;
    curr = game.blstats[idx][fld];
    prev = game.blstats[1 - idx][fld];
    color = NO_COLOR;

    chg = game.update_all ? 0 : compare_blstats(prev, curr);
    if (((chg || game.update_all || fld === BL_XP)
         && curr.percent_matters
         && blstats_thresholds(fld).length)
        /* when 'hitpointbar' is On, percent matters even if HP
           hasn't changed and has no percentage rules (in case HPmax
           has changed when HP hasn't, where we ordinarily wouldn't
           update HP so would miss an update of the hitpoint bar) */
        || (fld === BL_HP && game.flags?.hitpointbar)) {
        fldmax = curr.idxmax;
        pc = (fldmax === BL_EXP) ? exp_percentage()
              : (fldmax >= 0 && fldmax < MAXBLSTATS)
                 ? percentage(curr, game.blstats[idx][fldmax])
                 : 0; /* bullet proofing; can't get here */
        if (pc !== prev.percent_value)
            chg = (pc < prev.percent_value) ? -1 : 1;
        curr.percent_value = pc;
    } else {
        pc = 0;
    }

    /* Temporary? hack: moveloop()'s prolog for a new game sets
     * svc.context.rndencode after the status window has been init'd,
     * so $:0 has already been encoded and cached by the window
     * port.  Without this hack, gold's \G sequence won't be
     * recognized and ends up being displayed as-is for 'gu.update_all'.
     *
     * Also, even if svc.context.rndencode hasn't changed and the
     * gold amount itself hasn't changed, the glyph portion of the
     * encoding may have changed if a new symset was put into effect.
     */
    if (fld === BL_GOLD) {
        const goldsym = status_gold_symbol();
        if ((game.context?.rndencode | 0) !== (game._botl_oldrndencode | 0)
            || goldsym !== game._botl_oldgoldsym) {
            game.update_all = true; /* chg = 2; */
            game._botl_oldrndencode = game.context?.rndencode | 0;
            game._botl_oldgoldsym = goldsym;
        }
    }

    reset = false;
    if (game.update_all) {
        chg = 0;
        curr.time = prev.time = 0;
    } else if (!chg && curr.time) {
        reset = hilite_reset_needed(prev, game.bl_hilite_moves | 0);
        if (reset)
            curr.time = prev.time = 0;
    }

   if (game.update_all || chg || reset) {
        if (!valsetlist[fld]) {
            const sv = anything_to_s(curr.a, anytype); /* ANY_STR: do nothing */
            if (sv !== undefined)
                curr.val = sv;
        }

        if (anytype !== ANY_MASK32) {
            if (chg || curr.val) {
                /* if Xp percentage changed, we set 'chg' to 1 above;
                   reset that if the Xp value hasn't actually changed
                   or possibly went down rather than up (level loss) */
                if (chg === 1 && fld === BL_XP)
                    chg = compare_blstats(prev, curr);

                const got = get_hilite(idx, fld, curr.a, chg, pc);
                curr.hilite_rule = got.rule;
                color = got.color;
                prev.hilite_rule = curr.hilite_rule;
                if (chg === 2) {
                    color = NO_COLOR;
                    chg = 0;
                }
            }
            status_update(fld, curr.val, chg, pc, color, null);
        } else {
            /* Color for conditions is done through gc.cond_hilites[] */
            status_update(fld, curr.a, chg, pc, color, cond_hilites());
        }
        curr.chg = prev.chg = true;
        updated = true;
    }
    return updated;
}

// src/botl.c:1621 evaluate_and_notify_windowport()
function evaluate_and_notify_windowport(valsetlist, idx) {
    let i, fld, updated = 0;
    const flags = game.flags || {};
    const disp = (game.disp ||= {});

    /*
     *  Now pass the changed values to window port.
     */
    for (i = 0; i < MAXBLSTATS; i++) {
        fld = initblstats[i].fld;
        if (((fld === BL_SCORE) && !flags.showscore)
            || ((fld === BL_EXP) && !flags.showexp)
            || ((fld === BL_TIME) && !flags.time)
            || ((fld === BL_HD) && !Upolyd(game.u))
            || ((fld === BL_XP || fld === BL_EXP) && Upolyd(game.u))
            || ((fld === BL_VERS) && !flags.showvers)
            || ((fld === BL_TERRAIN) && !flags.terrainstatus)
            || ((fld === BL_WEAPON) && !flags.weaponstatus)
            || ((fld === BL_ARMOR) && !flags.armorstatus)
            ) {
            continue;
        }
        if (eval_notify_windowport_field(fld, valsetlist, idx))
            updated++;
    }
    /* the tty port has WC2_RESET_STATUS and WC2_FLUSH_STATUS */
    if (disp.botlx)
        status_update(BL_RESET, null, 0, 0, NO_COLOR, null);
    else if ((updated || disp.botlx))
        status_update(BL_FLUSH, null, 0, 0, NO_COLOR, null);

    disp.botl = disp.botlx = disp.time_botl = false;
    game.update_all = false;
}

// src/botl.c:1683 status_initialize()
export function status_initialize(reassessment /* True: just recheck fields without other init */) {
    let fld;
    let fldenabl;
    let i;
    let fieldfmt, fieldname;
    const flags = game.flags || {};

    if (!reassessment) {
        if (game.blinit)
            impossible('2nd status_initialize with full init.');
        init_blstats();
        tty_status_init(); /* (*windowprocs.win_status_init)() */
        game.blinit = true;
    } else if (!game.blinit) {
        throw new Error("status 'reassess' before init"); /* panic */
    }
    for (i = 0; i < MAXBLSTATS; ++i) {
        fld = initblstats[i].fld;
        fldenabl = (fld === BL_SCORE) ? !!flags.showscore
                   : (fld === BL_TIME) ? !!flags.time
                     : (fld === BL_EXP) ? !!(flags.showexp && !Upolyd(game.u))
                       : (fld === BL_XP) ? !Upolyd(game.u)
                         : (fld === BL_HD) ? !!Upolyd(game.u)
                           : (fld === BL_VERS) ? !!flags.showvers
                             : (fld === BL_WEAPON) ? !!flags.weaponstatus
                               : (fld === BL_ARMOR) ? !!flags.armorstatus
                                 : (fld === BL_TERRAIN) ? !!flags.terrainstatus
                                   : true;

        fieldname = initblstats[i].fldname;
        fieldfmt = (fld === BL_TITLE && flags.hitpointbar) ? '%-30.30s'
                   : initblstats[i].fldfmt;
        status_enablefield(fld, fieldname, fieldfmt, fldenabl);
    }
    game.update_all = true;
    (game.disp ||= {}).botlx = true;
}

// src/botl.c:1759 init_blstats()
function init_blstats() {
    let i, j;

    if (game._blstats_initalready) {
        impossible('init_blstats called more than once.');
        return;
    }
    game.blstats = [[], []];
    for (i = 0; i <= 1; ++i) {
        for (j = 0; j < MAXBLSTATS; ++j) {
            const t = initblstats[j];
            game.blstats[i][j] = {
                fldname: t.fldname, fldfmt: t.fldfmt, time: 0, chg: false,
                percent_matters: (t.idxmax !== -1), percent_value: 0,
                anytype: t.anytype, a: 0, rawval: 0, val: '',
                valwidth: 0, idxmax: t.idxmax, fld: t.fld,
                hilite_rule: null,
            };
        }
    }
    game._blstats_initalready = true;
}

// src/botl.c:1810 compare_blstats() — 1 up, -1 down, 0 same; for
// bitmasks and strings 0 = same, 1 = changed
function compare_blstats(bl1, bl2) {
    let use_rawval;
    let anytype, fld, result = 0;

    anytype = bl1.anytype;
    /* cheat; terrain is highlighted as a string but we have a handy int
       reflecting its value to use when checking for changes */
    if (bl1.fld === BL_TERRAIN)
        anytype = ANY_INT;

    fld = bl1.fld;
    use_rawval = (fld === BL_HP || fld === BL_HPMAX
                  || fld === BL_ENE || fld === BL_ENEMAX
                  || fld === BL_GOLD);
    const a1 = use_rawval ? bl1.rawval : bl1.a;
    const a2 = use_rawval ? bl2.rawval : bl2.a;

    switch (anytype) {
    case ANY_INT:
    case ANY_LONG:
        result = (a1 < a2) ? 1 : (a1 > a2) ? -1 : 0;
        break;
    case ANY_STR: {
        const c = (bl1.val < bl2.val) ? -1 : (bl1.val > bl2.val) ? 1 : 0;
        result = c; /* sgn(strcmp()) */
        break;
    }
    case ANY_MASK32:
        result = (a1 !== a2) ? 1 : 0;
        break;
    default:
        result = 1;
    }
    return result;
}

// src/botl.c:1884 anything_to_s()
function anything_to_s(a, anytype) {
    switch (anytype) {
    case ANY_MASK32:
        return (a >>> 0).toString(16); /* "%lx" */
    case ANY_LONG:
    case ANY_INT:
        return String(a);
    case ANY_STR: /* do nothing */
        return undefined;
    default:
        return '';
    }
}

// src/botl.c:1977 percentage() — integer percentage is 100 * bl->a / maxbl->a
function percentage(bl, maxbl) {
    let result = 0;
    let ival = 0, lval = 0;
    let fld;
    let use_rawval;

    if (!bl || !maxbl) {
        impossible('percentage: bad istat pointer');
        return 0;
    }

    fld = bl.fld;
    use_rawval = (fld === BL_HP || fld === BL_ENE);
    if (maxbl.a) { /* maxbl->a.a_void */
        switch (bl.anytype) {
        case ANY_INT: {
            /* HP and energy are int so this is the only case that cares
               about 'rawval'; for them, we use that rather than their
               potentially truncated (to 9999) display value */
            ival = use_rawval ? bl.rawval : bl.a;
            const mval = use_rawval ? maxbl.rawval : maxbl.a;
            result = Math.trunc((100 * ival) / mval);
            break;
        }
        case ANY_LONG:
            lval = bl.a;
            result = Math.trunc((100 * lval) / maxbl.a);
            break;
        }
    }
    /* don't let truncation from integer division produce a zero result
       from a non-zero input */
    if (result === 0 && (ival !== 0 || lval !== 0))
        result = 1;

    return result;
}

// src/botl.c:2052 exp_percentage() — percentage for both xp (level) and
// exp (points) is the percentage for (curr_exp - this_level_start) in
// (next_level_start - this_level_start)
function exp_percentage() {
    let res = 0;
    const u = game.u;

    if (u.ulevel < 30) {
        let exp_val, nxt_exp_val, curlvlstart;

        curlvlstart = newuexp(u.ulevel - 1);
        exp_val = u.uexp - curlvlstart;
        nxt_exp_val = newuexp(u.ulevel) - curlvlstart;
        if (exp_val === nxt_exp_val - 1) {
            /*
             * Full 100% is unattainable since hero gains a level
             * and the threshold for next level increases, but treat
             * (next_level_start - 1 point) as a special case.
             */
            res = 100;
        } else {
            const curval = { anytype: ANY_LONG, a: exp_val, rawval: 0, fld: BL_EXP },
                  maxval = { anytype: ANY_LONG, a: nxt_exp_val, rawval: 0, fld: BL_EXP };
            res = percentage(curval, maxval);
        }
    }
    return res;
}

// src/botl.c:2090 exp_percent_changing() — experience points have changed
// but experience level hasn't; decide whether botl update is needed for a
// different percentage highlight rule for Xp
export function exp_percent_changing() {
    let pc;

    /* if status update is already requested, skip this processing */
    if (!game.disp?.botl && game.blinit) {
        const idx = game.now_or_before_idx | 0;
        const curr = game.blstats[idx][BL_XP];
        if (curr.percent_matters
            && blstats_thresholds(BL_XP).length
            && (pc = exp_percentage()) !== curr.percent_value) {
            const rule = get_hilite(idx, BL_XP, game.u.ulevel, 0, pc).rule;
            if (rule !== curr.hilite_rule)
                return true; /* caller should set 'disp.botl' to True */
        }
    }
    return false;
}

// src/botl.c:2131 stat_cap_indx()
export function stat_cap_indx() {
    return game.blstats[game.now_or_before_idx | 0][BL_CAP].a;
}

// src/botl.c:2146 stat_hunger_indx()
export function stat_hunger_indx() {
    return game.blstats[game.now_or_before_idx | 0][BL_HUNGER].a;
}

// src/botl.c:2160 bl_idx_to_fldname()
export function bl_idx_to_fldname(idx) {
    if (idx >= 0 && idx < MAXBLSTATS)
        return initblstats[idx].fldname;
    return null;
}

// src/botl.c:2170 repad_with_dashes() — inoutbuf[] has been padded with
// trailing spaces; replace pairs of spaces with pairs of space+dash
export function repad_with_dashes(inoutbuf) {
    const arr = inoutbuf.split('');
    let p = arr.length;

    while (p >= 2 && arr[p - 1] === ' ' && arr[p - 2] === ' ') {
        arr[p - 1] = '-';
        p -= 2;
    }
    return arr.join('');
}

// src/botl.c:2197 fieldids_alias[]
const fieldids_alias = [
    { fieldname: 'characteristics',   fldid: BL_CHARACTERISTICS },
    { fieldname: 'encumbrance',       fldid: BL_CAP },
    { fieldname: 'experience-points', fldid: BL_EXP },
    { fieldname: 'dx',       fldid: BL_DX },
    { fieldname: 'co',       fldid: BL_CO },
    { fieldname: 'con',      fldid: BL_CO },
    { fieldname: 'points',   fldid: BL_SCORE },
    { fieldname: 'cap',      fldid: BL_CAP },
    { fieldname: 'pw',       fldid: BL_ENE },
    { fieldname: 'pw-max',   fldid: BL_ENEMAX },
    { fieldname: 'xl',       fldid: BL_XP },
    { fieldname: 'xplvl',    fldid: BL_XP },
    { fieldname: 'ac',       fldid: BL_AC },
    { fieldname: 'hit-dice', fldid: BL_HD },
    { fieldname: 'turns',    fldid: BL_TIME },
    { fieldname: 'hp',       fldid: BL_HP },
    { fieldname: 'hp-max',   fldid: BL_HPMAX },
    { fieldname: 'dgn',      fldid: BL_LEVELDESC },
    { fieldname: 'xp',       fldid: BL_EXP },
    { fieldname: 'exp',      fldid: BL_EXP },
    { fieldname: 'flags',    fldid: BL_CONDITION },
];

// src/botl.c:2221 fldname_to_bl_indx() — field name to bottom line index
function fldname_to_bl_indx(name) {
    let i, nmatches = 0, fld = 0;

    if (name) {
        /* check matches to canonical names */
        for (i = 0; i < initblstats.length; i++)
            if (fuzzymatch(initblstats[i].fldname, name, ' -_', true)) {
                fld = initblstats[i].fld;
                nmatches++;
            }
        if (!nmatches) {
            /* check aliases */
            for (i = 0; i < fieldids_alias.length; i++)
                if (fuzzymatch(fieldids_alias[i].fieldname, name,
                               ' -_', true)) {
                    fld = fieldids_alias[i].fldid;
                    nmatches++;
                }
        }
        if (!nmatches) {
            /* check partial matches to canonical names */
            const len = name.length;

            for (i = 0; i < initblstats.length; i++)
                if (initblstats[i].fldname.slice(0, len).toLowerCase()
                    === name.toLowerCase()) {
                    fld = initblstats[i].fld;
                    nmatches++;
                }
        }

    }
    return (nmatches === 1) ? fld : BL_FLUSH;
}

/* src/botl.c:2246 Is_Temp_Hilite() / has_hilite() */
const Is_Temp_Hilite = (rule) => !!(rule && rule.behavior === BL_TH_UPDOWN);
const has_hilite = (fldidx) => blstats_thresholds(fldidx).length > 0;

// src/botl.c:2257 hilite_reset_needed()
function hilite_reset_needed(bl_p, augmented_time) {
    /*
     * This 'multi' handling may need some tuning...
     */
    if (game.multi)
        return false;

    if (!Is_Temp_Hilite(bl_p.hilite_rule))
        return false;

    if (bl_p.time === 0 || bl_p.time >= augmented_time)
        return false;

    return true;
}

// src/botl.c:2279 status_eval_next_unhilite() — called from moveloop();
// sets context.botl if temp hilites have timed out
export function status_eval_next_unhilite() {
    let i;
    let curr;
    let next_unhilite, this_unhilite;
    const disp = (game.disp ||= {});

    if (!game.blinit)
        return;
    game.bl_hilite_moves = game.moves; /* simplified; at one point we used to
                                        * try to encode fractional amounts for
                                        * multiple moves within same turn */
    /* figure out whether an unhilight needs to be performed now */
    next_unhilite = 0;
    for (i = 0; i < MAXBLSTATS; ++i) {
        curr = game.blstats[0][i]; /* blstats[0][*].time==blstats[1][*].time */

        if (curr.chg) {
            const prev = game.blstats[1][i];

            if (Is_Temp_Hilite(curr.hilite_rule))
                curr.time = (game.bl_hilite_moves + (game.iflags?.hilite_delta | 0));
            else
                curr.time = 0;
            prev.time = curr.time;

            curr.chg = prev.chg = false;
            disp.botl = true;
        }
        if (disp.botl)
            continue; /* just process other gb.blstats[][].time and .chg */

        this_unhilite = curr.time;
        if (this_unhilite > 0
            && (next_unhilite === 0 || this_unhilite < next_unhilite)
            && hilite_reset_needed(curr, this_unhilite + 1)) {
            next_unhilite = this_unhilite;
            if (next_unhilite < game.bl_hilite_moves)
                disp.botl = true;
        }
    }
}

// src/botl.c:2336 noneoftheabove() — test whether the text from a title
// rule matches the string for title-while-polymorphed in the 'textmatch'
// menu
function noneoftheabove(hl_text) {
    if (fuzzymatch(hl_text, 'none of the above', '" -_', true)
        || fuzzymatch(hl_text, '(polymorphed)', '"()', true)
        || fuzzymatch(hl_text, 'none of the above (polymorphed)',
                      '" -_()', true))
        return true;
    return false;
}

// src/botl.c:2364 get_hilite() — returns, based on the value and the
// direction it is moving, the highlight rule that applies to the
// specified field, and the rule's color ({rule, color})
function get_hilite(idx, fldidx, value, chg, pc) {
    let rule = null;
    let txtstr;
    const LARGEST_INT = 32767, LONG_MAX = 9007199254740991;

    if (fldidx < 0 || fldidx >= MAXBLSTATS)
        return { rule: null, color: NO_COLOR };

    if (has_hilite(fldidx)) {
        let dt;
        /* there are hilites set here */
        let max_pc = -1, min_pc = 101;
        let max_ival = -LARGEST_INT, min_ival = LARGEST_INT;
        let max_lval = -LONG_MAX, min_lval = LONG_MAX;
        let exactmatch = false, updown = false, changed = false,
            perc_or_abs = false, crit_hp = false;

        /* min_/max_ are used to track best fit */
        for (const hl of blstats_thresholds(fldidx)) {
            dt = initblstats[fldidx].anytype; /* only needed for 'absolute' */
            /* for HP, if we already have a critical-hp rule then we ignore
               other HP rules unless we hit another critical-hp one (last
               one found wins) */
            if (crit_hp && hl.behavior !== BL_TH_CRITICALHP)
                continue;
            /* if we've already matched a temporary highlight, it takes
               precedence over all persistent ones; we still process
               updown rules to get the last one which qualifies */
            if ((updown || changed) && hl.behavior !== BL_TH_UPDOWN)
                continue;
            /* among persistent highlights, if a 'percentage' or 'absolute'
               rule has been matched, it takes precedence over 'always' */
            if (perc_or_abs && hl.behavior === BL_TH_ALWAYS_HILITE)
                continue;

            switch (hl.behavior) {
            case BL_TH_VAL_PERCENTAGE: /* percent values are always ANY_INT */
                if (hl.rel === EQ_VALUE && pc === hl.value) {
                    rule = hl;
                    min_pc = max_pc = hl.value;
                    exactmatch = perc_or_abs = true;
                } else if (exactmatch) {
                    ; /* already found best fit, skip lt,ge,&c */
                } else if (hl.rel === LT_VALUE
                           && (pc < hl.value)
                           && (hl.value <= min_pc)) {
                    rule = hl;
                    min_pc = hl.value;
                    perc_or_abs = true;
                } else if (hl.rel === LE_VALUE
                           && (pc <= hl.value)
                           && (hl.value <= min_pc)) {
                    rule = hl;
                    min_pc = hl.value;
                    perc_or_abs = true;
                } else if (hl.rel === GT_VALUE
                           && (pc > hl.value)
                           && (hl.value >= max_pc)) {
                    rule = hl;
                    max_pc = hl.value;
                    perc_or_abs = true;
                } else if (hl.rel === GE_VALUE
                           && (pc >= hl.value)
                           && (hl.value >= max_pc)) {
                    rule = hl;
                    max_pc = hl.value;
                    perc_or_abs = true;
                }
                break;
            case BL_TH_UPDOWN: /* uses 'chg' (set by caller), not 'dt' */
                /* specific 'up' or 'down' takes precedence over general
                   'changed' regardless of their order in the rule set */
                if (chg < 0 && hl.rel === LT_VALUE) {
                    rule = hl;
                    updown = true;
                } else if (chg > 0 && hl.rel === GT_VALUE) {
                    rule = hl;
                    updown = true;
                } else if (chg !== 0 && hl.rel === EQ_VALUE && !updown) {
                    rule = hl;
                    changed = true;
                }
                break;
            case BL_TH_VAL_ABSOLUTE: { /* either ANY_INT or ANY_LONG */
                /* the int and long variations of the C are identical aside
                   from union field and min_/max_ variable names */
                const isint = (dt === ANY_INT);
                if (hl.rel === EQ_VALUE && hl.value === value) {
                    rule = hl;
                    if (isint) min_ival = max_ival = hl.value;
                    else min_lval = max_lval = hl.value;
                    exactmatch = perc_or_abs = true;
                } else if (exactmatch) {
                    ; /* already found best fit, skip lt,ge,&c */
                } else if (hl.rel === LT_VALUE
                           && (value < hl.value)
                           && (hl.value <= (isint ? min_ival : min_lval))) {
                    rule = hl;
                    if (isint) min_ival = hl.value; else min_lval = hl.value;
                    perc_or_abs = true;
                } else if (hl.rel === LE_VALUE
                           && (value <= hl.value)
                           && (hl.value <= (isint ? min_ival : min_lval))) {
                    rule = hl;
                    if (isint) min_ival = hl.value; else min_lval = hl.value;
                    perc_or_abs = true;
                } else if (hl.rel === GT_VALUE
                           && (value > hl.value)
                           && (hl.value >= (isint ? max_ival : max_lval))) {
                    rule = hl;
                    if (isint) max_ival = hl.value; else max_lval = hl.value;
                    perc_or_abs = true;
                } else if (hl.rel === GE_VALUE
                           && (value >= hl.value)
                           && (hl.value >= (isint ? max_ival : max_lval))) {
                    rule = hl;
                    if (isint) max_ival = hl.value; else max_lval = hl.value;
                    perc_or_abs = true;
                }
                break;
            }
            case BL_TH_TEXTMATCH: /* ANY_STR */
                txtstr = game.blstats[idx][fldidx].val;
                if (fldidx === BL_TITLE)
                    /* "<name> the <rank-title>", skip past "<name> the " */
                    txtstr = txtstr.slice((game.plname || '').length + ' the '.length);
                if (hl.rel === TXT_VALUE && hl.textmatch) {
                    if (fuzzymatch(hl.textmatch, txtstr, '" -_', true)) {
                        rule = hl;
                        exactmatch = true;
                    } else if (exactmatch) {
                        ; /* already found best fit, skip "noneoftheabove" */
                    } else if (fldidx === BL_TITLE
                               && Upolyd(game.u) && noneoftheabove(hl.textmatch)) {
                        rule = hl;
                    }
                }
                break;
            case BL_TH_ALWAYS_HILITE:
                rule = hl;
                break;
            case BL_TH_CRITICALHP:
                if (fldidx === BL_HP && critically_low_hp(false)) {
                    rule = hl;
                    crit_hp = true;
                    updown = changed = perc_or_abs = false;
                }
                break;
            case BL_TH_NONE:
                break;
            default:
                break;
            }
        }
    }
    return { rule, color: rule ? rule.coloridx : NO_COLOR };
}

// src/botl.c:2593 parse_status_hl1() — separates each hilite entry into a
// set of field threshold/action component strings, then calls
// parse_status_hl2() to parse further and configure the hilite.
export function parse_status_hl1(op, from_configfile) {
    const MAX_THRESH = 21;
    let hsbuf;
    let rslt, badopt = false;
    let i, fldnum, ccount = 0;
    let c;

    fldnum = 0;
    hsbuf = new Array(MAX_THRESH).fill('');
    let k = 0;
    while (k < op.length && fldnum < MAX_THRESH && ccount < (QBUFSZ - 2)) {
        c = op[k].toLowerCase();
        if (c === ' ') {
            if (fldnum >= 1) {
                if (fldnum === 1 && hsbuf[0].toLowerCase() === 'title') {
                    /* spaces are allowed in title */
                    hsbuf[fldnum] += c;
                    ccount++;
                    k++;
                    continue;
                }
                rslt = parse_status_hl2(hsbuf, from_configfile);
                if (!rslt) {
                    badopt = true;
                    break;
                }
            }
            hsbuf = new Array(MAX_THRESH).fill('');
            fldnum = 0;
            ccount = 0;
        } else if (c === '/') {
            fldnum++;
            ccount = 0;
        } else {
            hsbuf[fldnum] += c;
            ccount++;
        }
        k++;
    }
    if (fldnum >= 1 && !badopt) {
        rslt = parse_status_hl2(hsbuf, from_configfile);
        if (!rslt)
            badopt = true;
    }
    if (badopt)
        return false;
    /* make sure highlighting is On; use short duration for temp highlights */
    if (!(game.iflags ||= {}).hilite_delta)
        game.iflags.hilite_delta = 3;
    return true;
}

// src/botl.c:2652 is_ltgt_percentnumber() — is str in the format of
// "[<>]?=?[-+]?[0-9]+%?" regex
function is_ltgt_percentnumber(str) {
    return /^[<>]?=?[-+]?[0-9]+%?$/.test(str);
}

// src/botl.c:2673 has_ltgt_percentnumber() — does str only contain
// "<>=-+0-9%" chars
function has_ltgt_percentnumber(str) {
    return /^[<>=\-+0-9%]*$/.test(str);
}

// src/botl.c:2688 splitsubfields() — splits str into '+' or '&' separated
// strings; returns the strings, or null if more than maxsf or MAX_SUBFIELDS
function splitsubfields(str, maxsf) {
    const MAX_SUBFIELDS = 16;
    const subfields = [];
    let sf = 0;

    if (!str)
        return [];

    maxsf = (maxsf === 0) ? MAX_SUBFIELDS : Math.min(maxsf, MAX_SUBFIELDS);

    if (str.includes('+') || str.includes('&')) {
        let st = 0;

        sf = 0;
        let c = 0;
        while (c < str.length && sf < maxsf) {
            if (str[c] === '&' || str[c] === '+') {
                subfields[sf] = str.slice(st, c);
                st = c + 1;
                sf++;
            }
            c++;
        }
        if (sf >= maxsf - 1)
            return null;
        if (c === str.length && c !== st)
            subfields[sf++] = str.slice(st, c);
    } else {
        sf = 1;
        subfields[0] = str;
    }
    return subfields.slice(0, sf);
}

// src/botl.c:2730 is_fld_arrayvalues()
function is_fld_arrayvalues(str, arr, arrmin, arrmax) {
    let i;

    for (i = arrmin; i < arrmax; i++)
        if (arr[i] !== undefined && arr[i] !== null
            && str.toLowerCase() === String(arr[i]).toLowerCase())
            return i;
    return -1;
}

// src/botl.c:2814 parse_status_hl2()
function parse_status_hl2(s, from_configfile) {
    const aligntxt = ['chaotic', 'neutral', 'lawful'];
    /* hu_stat[] from eat.c has trailing spaces which foul up comparisons;
       for the "not hungry" case, there's no text hence no way to highlight */
    const hutxt = ['Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'];
    let tmp, how;
    let sidx = 0, i = -1, dt = -1 /* ANY_INVALID */;
    let coloridx = -1, successes = 0;
    let disp_attrib = 0;
    let percent, changed, numeric, down, up,
        grt, lt, gte, le, eq, txtval, always, criticalhp;
    let txt;
    let fld = BL_FLUSH;
    let hilite;

    /* field name to statusfield */
    fld = fldname_to_bl_indx(s[sidx]);

    if (fld === BL_CHARACTERISTICS) {
        let res = false;

        /* recursively set each of strength, dexterity, constitution, &c */
        for (fld = BL_STR; fld <= BL_CH; fld++) {
            s[sidx] = initblstats[fld].fldname;
            res = parse_status_hl2(s, from_configfile);
            if (!res)
                return false;
        }
        return true;
    }
    if (fld === BL_FLUSH) {
        config_error_add(`Unknown status field '${s[sidx]}'`);
        return false;
    }
    if (fld === BL_CONDITION)
        return parse_condition(s, sidx);

    ++sidx;
    while (s[sidx]) {
        let subfields;
        let sf = 0;     /* subfield count */
        let kidx;

        txt = null;
        percent = numeric = always = false;
        down = up = changed = false;
        criticalhp = false;
        grt = gte = eq = le = lt = txtval = false;
        hilite = { fld, set: false, anytype: 0, value: 0, behavior: 0,
                   textmatch: '', rel: 0, coloridx: 0 };
        hilite.set = false; /* mark it "unset" */
        hilite.fld = fld;

        if (!s[sidx + 1] || s[sidx].toLowerCase() === 'always') {
            /* "field/always/color" OR "field/color" */
            always = true;
            if (!s[sidx + 1])
                sidx--;
        } else if (s[sidx].toLowerCase() === 'up' || s[sidx].toLowerCase() === 'down') {
            if (initblstats[fld].anytype === ANY_STR)
                /* ordered string comparison is supported but LT/GT for
                   the string fields (title, dungeon-level, alignment)
                   is pointless; treat 'up' or 'down' for string fields
                   as 'changed' rather than rejecting them outright */
                ;
            else if (s[sidx].toLowerCase() === 'down')
                down = true;
            else
                up = true;
            changed = true;
        } else if (fld === BL_CAP
                   && (kidx = is_fld_arrayvalues(s[sidx], enc_stat,
                                                 SLT_ENCUMBER, OVERLOADED + 1)) >= 0) {
            txt = enc_stat[kidx];
            txtval = true;
        } else if (fld === BL_ALIGN
                   && (kidx = is_fld_arrayvalues(s[sidx], aligntxt, 0, 3)) >= 0) {
            txt = aligntxt[kidx];
            txtval = true;
        } else if (fld === BL_HUNGER
                   && (kidx = is_fld_arrayvalues(s[sidx], hutxt,
                                                 SATIATED, STARVED + 1)) >= 0) {
            txt = hu_stat[kidx];   /* store hu_stat[] val, not hutxt[] */
            txtval = true;
        } else if (s[sidx].toLowerCase() === 'changed') {
            changed = true;
        } else if (fld === BL_HP && s[sidx].toLowerCase() === 'criticalhp') {
            criticalhp = true;
        } else if (is_ltgt_percentnumber(s[sidx])) {
            let op;

            tmp = s[sidx]; /* is_ltgt_() guarantees [<>]?=?[-+]?[0-9]+%? */
            if (tmp.includes('%'))
               percent = true;
            if (tmp[0] === '<') {
                if (tmp[1] === '=')
                    le = true;
                else
                    lt = true;
            } else if (tmp[0] === '>') {
                if (tmp[1] === '=')
                    gte = true;
                else
                    grt = true;
            }
            /* '%', '<', '>' have served their purpose, '=' is either
               part of '<' or '>' or optional for '=N', unary '+' is
               just decorative, so get rid of them, leaving -?[0-9]+ */
            tmp = tmp.replace(/[%<>=+]/g, ''); /* stripchars() */
            numeric = true;
            dt = percent ? ANY_INT : initblstats[fld].anytype;
            hilite.value = parseInt(tmp, 10) || 0; /* s_to_anything() */

            op = grt ? '>' : gte ? '>=' : lt ? '<' : le ? '<=' : '=';
            if (dt === ANY_INT
                /* AC is the only field where negative values make sense but
                   accept >-1 for other fields; reject <0 for non-AC */
                && (hilite.value
                    < ((fld === BL_AC) ? -128 : grt ? -1 : lt ? 1 : 0)
                /* percentages have another more comprehensive check below */
                    || hilite.value > (percent ? (lt ? 101 : 100)
                                                   : 32767 /* LARGEST_INT */))) {
                config_error_add(`${threshold_value}'${op}${hilite.value}${percent ? '%' : ''}'${is_out_of_range}`);
                return false;
            } else if (dt === ANY_LONG
                       && hilite.value < (grt ? -1 : lt ? 1 : 0)) {
                config_error_add(`${threshold_value}'${op}${hilite.value}'${is_out_of_range}`);
                return false;
            }
        } else if (initblstats[fld].anytype === ANY_STR) {
            txt = s[sidx];
            txtval = true;
        } else {
            config_error_add(has_ltgt_percentnumber(s[sidx])
                 ? `Wrong format '${s[sidx]}', expected a threshold number or percent`
                 : `Unknown behavior '${s[sidx]}'`);
            return false;
        }

        /* relationships {LT_VALUE, LE_VALUE, EQ_VALUE, GE_VALUE, GT_VALUE} */
        if (grt || up)
            hilite.rel = GT_VALUE;
        else if (lt || down)
            hilite.rel = LT_VALUE;
        else if (gte)
            hilite.rel = GE_VALUE;
        else if (le)
            hilite.rel = LE_VALUE;
        else if (eq  || percent || numeric || changed)
            hilite.rel = EQ_VALUE;
        else if (txtval)
            hilite.rel = TXT_VALUE;
        else
            hilite.rel = LT_VALUE;

        if (initblstats[fld].anytype === ANY_STR && (percent || numeric)) {
            config_error_add(`Field '${initblstats[fld].fldname}' does not support numeric values`);
            return false;
        }

        if (percent) {
            if (initblstats[fld].idxmax < 0) {
                config_error_add(`Cannot use percent with '${initblstats[fld].fldname}'`);
                return false;
            } else if ((hilite.value < -1)
                       || (hilite.value === -1
                           && hilite.value !== GT_VALUE)
                       || (hilite.value === 0
                           && hilite.rel === LT_VALUE)
                       || (hilite.value === 100
                           && hilite.rel === GT_VALUE)
                       || (hilite.value === 101
                           && hilite.value !== LT_VALUE)
                       || (hilite.value > 101)) {
                config_error_add(`hilite_status: invalid percentage value '${
                                 (hilite.rel === LT_VALUE) ? '<'
                                   : (hilite.rel === LE_VALUE) ? '<='
                                     : (hilite.rel === GT_VALUE) ? '>'
                                       : (hilite.rel === GE_VALUE) ? '>='
                                         : '='}${hilite.value}%'`);
                return false;
            }
        }

        /* actions */
        sidx++;
        how = s[sidx];
        if (!how) {
            if (!successes)
                return false;
        }
        coloridx = -1;
        subfields = splitsubfields(how || '', 0);
        sf = subfields ? subfields.length : -1;

        if (sf < 1)
            return false;

        disp_attrib = HL_UNDEF;

        for (i = 0; i < sf; ++i) {
            const a = match_str2attr(subfields[i], false);

            if (a === ATR_BOLD)
                disp_attrib |= HL_BOLD;
            else if (a === ATR_DIM)
                disp_attrib |= HL_DIM;
            else if (a === ATR_ITALIC)
                disp_attrib |= HL_ITALIC;
            else if (a === ATR_ULINE)
                disp_attrib |= HL_ULINE;
            else if (a === ATR_BLINK)
                disp_attrib |= HL_BLINK;
            else if (a === ATR_INVERSE)
                disp_attrib |= HL_INVERSE;
            else if (a === ATR_NONE)
                disp_attrib = HL_NONE;
            else {
                const c = match_str2clr(subfields[i], false);

                if (c >= CLR_MAX || coloridx !== -1) {
                    config_error_add(`bad color '${c} ${coloridx}'`);
                    return false;
                }
                coloridx = c;
            }
        }
        if (coloridx === -1)
            coloridx = NO_COLOR;

        /* Assign the values */
        hilite.coloridx = coloridx | (disp_attrib << 8);

        if (always)
            hilite.behavior = BL_TH_ALWAYS_HILITE;
        else if (percent)
            hilite.behavior = BL_TH_VAL_PERCENTAGE;
        else if (changed)
            hilite.behavior = BL_TH_UPDOWN;
        else if (numeric)
            hilite.behavior = BL_TH_VAL_ABSOLUTE;
        else if (txtval)
            hilite.behavior = BL_TH_TEXTMATCH;
        else if (hilite.value)
            hilite.behavior = BL_TH_VAL_ABSOLUTE;
        else if (criticalhp)
            hilite.behavior = BL_TH_CRITICALHP;
        else
            hilite.behavior = BL_TH_NONE;

        hilite.anytype = dt;

        if (hilite.behavior === BL_TH_TEXTMATCH && txt) {
            hilite.textmatch = trimspaces(txt.slice(0, MAXVALWIDTH - 1));
        }

        status_hilite_add_threshold(fld, hilite);

        successes++;
        sidx++;
    }

    return (successes > 0);
}

// src/botl.c:3178 match_str2conditionbitmask()
function match_str2conditionbitmask(str) {
    let i, nmatches = 0;
    let mask = 0;

    if (str) {
        /* check matches to canonical names */
        for (i = 0; i < conditions.length; i++)
            if (fuzzymatch(conditions[i].text[0], str, ' -_', true)) {
                mask |= conditions[i].mask;
                nmatches++;
            }

        if (!nmatches) {
            /* check aliases */
            for (i = 0; i < condition_aliases.length; i++)
                if (fuzzymatch(condition_aliases[i].id, str, ' -_', true)) {
                    mask |= condition_aliases[i].bitmask;
                    nmatches++;
                }
        }

        if (!nmatches) {
            /* check partial matches to aliases */
            const len = str.length;

            for (i = 0; i < condition_aliases.length; i++)
                if (str.toLowerCase() === condition_aliases[i].id.slice(0, len).toLowerCase()) {
                    mask |= condition_aliases[i].bitmask;
                    nmatches++;
                }
        }
    }

    return mask >>> 0;
}

// src/botl.c:3209 str2conditionbitmask()
function str2conditionbitmask(str) {
    let conditions_bitmask = 0;
    let i;

    const subfields = splitsubfields(str, conditions.length);
    const sf = subfields ? subfields.length : -1;

    if (sf < 1)
        return 0;

    for (i = 0; i < sf; ++i) {
        const bm = match_str2conditionbitmask(subfields[i]);

        if (!bm) {
            config_error_add(`Unknown condition '${subfields[i]}'`);
            return 0;
        }
        conditions_bitmask |= bm;
    }
    return conditions_bitmask >>> 0;
}

// src/botl.c:3233 parse_condition()
function parse_condition(s, sidx) {
    let i;
    let coloridx = NO_COLOR;
    let tmp, how;
    let conditions_bitmask = 0;
    let result = false;
    const ch = cond_hilites();

    if (!s)
        return false;

    sidx++;
    if (!s[sidx]) {
        config_error_add('Missing condition(s)');
        return false;
    }
    while (s[sidx]) {
        let subfields;

        tmp = s[sidx];
        conditions_bitmask = str2conditionbitmask(tmp);

        if (!conditions_bitmask)
            return false;

        /* actions */
        sidx++;
        how = s[sidx];
        if (!how) {
            config_error_add('Missing color+attribute');
            return false;
        }

        subfields = splitsubfields(how, 0) || [];

        /*
         * Only 1 colour is allowed, but potentially multiple
         * attributes are allowed.
         */
        for (i = 0; i < subfields.length; ++i) {
            const a = match_str2attr(subfields[i], false);

            if (a === ATR_BOLD)
                ch[HL_ATTCLR_BOLD] |= conditions_bitmask;
            else if (a === ATR_DIM)
                ch[HL_ATTCLR_DIM] |= conditions_bitmask;
            else if (a === ATR_ITALIC)
                ch[HL_ATTCLR_ITALIC] |= conditions_bitmask;
            else if (a === ATR_ULINE)
                ch[HL_ATTCLR_ULINE] |= conditions_bitmask;
            else if (a === ATR_BLINK)
                ch[HL_ATTCLR_BLINK] |= conditions_bitmask;
            else if (a === ATR_INVERSE)
                ch[HL_ATTCLR_INVERSE] |= conditions_bitmask;
            else if (a === ATR_NONE) {
                ch[HL_ATTCLR_BOLD] &= ~conditions_bitmask;
                ch[HL_ATTCLR_DIM] &= ~conditions_bitmask;
                ch[HL_ATTCLR_ITALIC] &= ~conditions_bitmask;
                ch[HL_ATTCLR_ULINE] &= ~conditions_bitmask;
                ch[HL_ATTCLR_BLINK] &= ~conditions_bitmask;
                ch[HL_ATTCLR_INVERSE] &= ~conditions_bitmask;
            } else {
                const k = match_str2clr(subfields[i], false);

                if (k >= CLR_MAX) {
                    config_error_add(`bad color ${k}`);
                    return false;
                }
                coloridx = k;
            }
        }
        /* set the bits in the appropriate member of the
           condition array according to color chosen as index */

        ch[coloridx] |= conditions_bitmask;
        result = true;
        sidx++;
    }
    return result;
}

// src/botl.c:3351 clear_status_hilites()
export function clear_status_hilites() {
    let i;

    for (i = 0; i < MAXBLSTATS; ++i) {
        blstats_thresholds(i).length = 0;
        /* pointer into thresholds list, now stale */
        if (game.blstats) {
            game.blstats[0][i].hilite_rule = null;
            game.blstats[1][i].hilite_rule = null;
        }
    }
}

wintty_wire_botl({ conditions, cond_idx, stat_cap_indx, repad_with_dashes, status_initialize });
