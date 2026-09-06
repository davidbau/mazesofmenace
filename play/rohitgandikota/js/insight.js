// insight.js — the ^X attributes window.
// C ref: src/insight.c
//
// enlightenment() builds a menu whose lines are all produced by enlght_line():
//
//     Sprintf(buf, " %s%s%s%s.", start, middle, end, ps);
//
// One leading space, one trailing period, then six two-word contractions are
// applied (" are not " -> " aren't " and friends). The menu layer adds a second
// leading space, which is why body lines are indented two and headings one.
//
// Only the branches a level-1 hero on dlvl 1 reaches are ported. Everything
// else records itself through note_unported() rather than guessing, because a
// spurious line shifts every row below it and costs the whole frame.

import { upstart } from './do_name.js';
import { monexplain } from './drawing_data.js';
import { is_rider } from './mondata.js';
import { NUMMONS, PMNAMES } from './monst_data.js';
import { VANQ_MLVL_MNDX, VANQ_MSTR_MNDX, VANQ_ALPHA_SEP, VANQ_ALPHA_MIX, VANQ_MCLS_HTOL, VANQ_MCLS_LTOH, VANQ_COUNT_H_L, VANQ_COUNT_L_H, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_SELECTED, MENU_ITEMFLAGS_NONE, PICK_ONE, ECMD_OK, LOW_PM, NEUTRAL, G_UNIQ, G_GENOD, G_GONE, G_EXTINCT, LL_ACHIEVE, LL_UMONST, LL_MINORAC, LL_SPOILER, LL_DUMP } from './const.js';
import { NO_COLOR } from './terminal.js';
import { docrt } from './display.js';
import { tty_yn_function } from './tty/topl.js';
import { xwaitforspace } from './tty/getline.js';
import { tty_create_nhwindow, tty_destroy_nhwindow, tty_putstr, tty_display_nhwindow, tty_next_page, tty_start_menu, tty_add_menu, tty_end_menu, tty_select_menu, NHW_MENU, ATR_NONE, ATR_INVERSE } from './tty/wintty.js';
import { MONSYMS } from './monst_data.js';
import { You, livelog_printf } from './pline.js';
import { ceiling, surface } from './dungeon.js';
import { hides_under, is_clinger } from './mondata.js';
import { waterbody_name } from './pager.js';
import { is_pool, t_at } from './mon.js';
import { simple_typename, ansimpleoname, OBJ_NAME } from './objnam.js';
import { M_AP_TYPE, M_AP_NOTHING, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, TT_PIT, SPIKED_PIT } from './const.js';
import { game } from './gstate.js';
import { P_NONE, P_UNSKILLED, P_SKILLED, P_ISRESTRICTED, FULL_MOON, NEW_MOON, WEAK,
         P_TWO_WEAPON_COMBAT, ROLE_GENDMASK, ROLE_MALE, ROLE_FEMALE,
         ARTICLE_YOUR, SUPPRESS_IT, SUPPRESS_INVISIBLE, STRAT_WAITMASK,
         MSLOW, MFAST, A_NONE, A_CURRENT, A_ORIGINAL, TIMEOUT,
         W_ARM, W_ARMC, W_ARMH, W_ARMS,
         W_ARMG, W_ARMF, W_ARMU, W_AMUL, W_RINGL, W_RINGR,
         W_WEP, W_TOOL, W_ARMOR, W_ACCESSORY, W_ART,
         LEFT_SIDE, RIGHT_SIDE, BOTH_SIDES, LEG, Upolyd,
         FROMFORM } from './const.js';
import { makeplural, minimal_xname, simpleonames,
         suit_simple_name } from './objnam.js';
import { weapon_descr, weapon_type, skill_name, skill_level_name, P_SKILL, can_advance } from './weapon.js';
import { empty_handed, is_ammo } from './wield.js';
import { magic_negation } from './mhitu.js';

function note_unported_insight(what) {
    (game.unported ||= new Set()).add('insight:' + what);
}
import { depth, dunlev, endgamelevelname } from './dungeon.js';
import { In_endgame, In_quest, Is_knox_level } from './const.js';
import { aligns } from './role_data.js';
import { A_MAX, ACURR } from './attrib.js';
import { hu_stat, rank_of, rank_to_xlev } from './botl.js';
import { carrying, money_cnt, stone_luck } from './invent.js';
import { costly_spot } from './shk.js';
import { newuexp } from './exper.js';
import { night, midnight } from './calendar.js';
import { type_is_pname, sticks } from './mondata.js';
import { MFLAGS } from './monst_data.js';
import { inv_weight, near_capacity } from './attrib.js';
import { ONAMES } from './objects_data.js';
import { pline } from './display.js';
import { a_monnam, x_monnam, pmname } from './do_name.js';
import { find_mac } from './worn.js';
import { Fast, Very_fast, from_what as innate_source } from './attrib.js';
import { Fire_resistance, Cold_resistance, Sleep_resistance,
         Disint_resistance, Shock_resistance, Poison_resistance,
         Acid_resistance, Drain_resistance, Sick_resistance,
         Stone_resistance, Antimagic, Stealth, Searching,
         Warning, Teleportation, Teleport_control, See_invisible,
         Infravision, Deaf, Blind, Hallucination, Halluc_resistance,
         Invis, Levitation, Flying, Swimming, Amphibious, Breathless,
         Passes_walls, Regeneration, Reflecting } from './youprop.js';
import { artifact_names } from './artilist_data.js';
import { carried_artifact_conveys } from './artifact.js';
import { body_part } from './polyself.js';
import { is_metallic } from './obj.js';

const EXTRINSIC_KEYS = {
    HFire_resistance: 'FIRE_RES',
    HCold_resistance: 'COLD_RES',
    HSleep_resistance: 'SLEEP_RES',
    HDisint_resistance: 'DISINT_RES',
    HShock_resistance: 'SHOCK_RES',
    HPoison_resistance: 'POISON_RES',
    HAcid_resistance: 'ACID_RES',
    HDrain_resistance: 'DRAIN_RES',
    HSick_resistance: 'SICK_RES',
    HStone_resistance: 'STONE_RES',
    HHalluc_resistance: 'HALLUC_RES',
    HBlnd_resistance: 'BLND_RES',
    HAntimagic: 'ANTIMAGIC',
    HSee_invisible: 'SEE_INVIS',
    HWarning: 'WARNING',
    HSearching: 'SEARCHING',
    HInfravision: 'INFRAVISION',
    HTelepat: 'TELEPAT',
    HStealth: 'STEALTH',
    HDisplaced: 'DISPLACED',
    HJumping: 'JUMPING',
    HTeleport_control: 'TELEPORT_CONTROL',
    HSlow_digestion: 'SLOW_DIGESTION',
    HRegeneration: 'REGENERATION',
    HHalf_physical_damage: 'HALF_PHDAM',
    HHalf_spell_damage: 'HALF_SPDAM',
    HFast: 'FAST',
    HReflecting: 'REFLECTING',
    HFree_action: 'FREE_ACTION',
};

// src/attrib.c:905 from_what(), equipment arm. The flat extrinsic value is a
// worn-slot mask, so it identifies the inventory object conveying the property.
function from_what(abilKey) {
    const innate = innate_source(abilKey);
    if (innate || !game.wizard)
        return innate;

    const mask = game.u.uprops?.[EXTRINSIC_KEYS[abilKey]] | 0;
    if (abilKey === 'HFast' && Very_fast()) {
        if ((game.u.intrinsic?.HFast | 0) & TIMEOUT)
            return ' because of a potion or spell';
        if ((mask & W_ARMF) && game.u.uarmf?.dknown
            && game.objects[game.u.uarmf.otyp]?.oc_name_known)
            return ` because of your ${minimal_xname(game.u.uarmf)
                .replace(/\bpair of /i, '')}`;
        if (mask)
            return ' because of worn equipment';
    }
    const propKey = EXTRINSIC_KEYS[abilKey];
    let obj = mask && (game.invent || []).find(
        (candidate) => ((candidate.owornmask | 0) & mask) !== 0);
    if (!obj && (mask & W_ART))
        obj = (game.invent || []).find(
            (candidate) => carried_artifact_conveys(candidate, propKey));
    if (!obj)
        return '';

    const name = obj.oartifact ? artifact_names[obj.oartifact].replace(/^The /, 'the ')
                               : minimal_xname(obj).replace(/\bpair of /i, '');
    return ` because of ${obj.oartifact ? '' : 'your '}${name}`;
}

function item_what(mask) {
    if (!game.wizard || !mask)
        return '';
    if ((mask & W_ARM) && game.u.uarm)
        return ` by your ${suit_simple_name(game.u.uarm)}`;
    const slots = [
        [W_ARMC, 'uarmc'], [W_ARMU, 'uarmu'], [W_ARMH, 'uarmh'],
        [W_ARMG, 'uarmg'], [W_ARMF, 'uarmf'], [W_ARMS, 'uarms'],
        [W_AMUL, 'uamul'], [W_TOOL, 'ublindf'], [W_RINGL, 'uleft'],
        [W_RINGR, 'uright'], [W_WEP, 'uwep'],
    ];
    for (const [slotmask, field] of slots) {
        const obj = game.u[field];
        if ((mask & slotmask) && obj)
            return ` by your ${minimal_xname(obj).replace(/\bpair of /i, '')}`;
    }
    return '';
}

function item_resistance_message(propKey, protMessage) {
    const mask = game.u.uprops?.[propKey] | 0;
    let protection = mask & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART) ? 99 : 0;
    if (!protection && game.u.uarmc?.otyp === ONAMES.DWARVISH_CLOAK
        && (propKey === 'FIRE_RES' || propKey === 'COLD_RES'))
        protection = 90;
    if (protection)
        enl_msg('Your items ', protection < 99 ? 'are somewhat' : 'are',
                protection < 99 ? 'were somewhat' : 'were',
                protMessage, item_what(mask));
}

// include/attrib.h
const A_STR = 0, A_INT = 1, A_WIS = 2, A_DEX = 3, A_CON = 4, A_CHA = 5;
const attrname = ['strength', 'intelligence', 'wisdom',
                  'dexterity', 'constitution', 'charisma'];
// include/attrib.h:36 — STR18(x) is 18 + x, so a human's 118 cap IS STR18(100)
// and therefore not "interesting" enough to print.
const STR18 = (x) => 18 + x;

// include/you.h:441
const RIGHT_HANDED = 0x00;

const lines = [];
const out = (buf) => lines.push(buf);

/* src/insight.c:383 — ENL_GAMEINPROGRESS:0, ENL_GAMEOVERALIVE:1,
   ENL_GAMEOVERDEAD:2; the whole window switches to past tense when set. */
export const ENL_GAMEINPROGRESS = 0, ENL_GAMEOVERALIVE = 1,
             ENL_GAMEOVERDEAD = 2;
export const BASICENLIGHTENMENT = 1, MAGICENLIGHTENMENT = 2;
export const ACH_HELL = 2, ACH_INVK = 5, ACH_ENDG = 7, ACH_ASTR = 8,
             ACH_UWIN = 9, ACH_MINE = 15, ACH_TOWN = 16,
             ACH_SHOP = 17, ACH_SOKO = 21, ACH_BGRM = 22,
             ACH_RNK1 = 23;
/* include/you.h enum achivements */
const ACH_BELL = 1, ACH_CNDL = 3, ACH_BOOK = 4, ACH_AMUL = 6,
      ACH_MINE_PRIZE = 10, ACH_SOKO_PRIZE = 11, ACH_MEDU = 12, ACH_BLND = 13,
      ACH_NUDE = 14, ACH_TMPL = 18, ACH_ORCL = 19, ACH_NOVL = 20,
      ACH_RNK8 = 30, ACH_TUNE = 31, N_ACH = 32;
let en_final = 0;

// src/insight.c:50 achieve_msg[]; indexed by enum achievements in you.h.
const achieve_msg = [
    [0, ''],
    [LL_ACHIEVE, 'acquired the Bell of Opening'],
    [LL_ACHIEVE, 'entered Gehennom'],
    [LL_ACHIEVE, 'acquired the Candelabrum of Invocation'],
    [LL_ACHIEVE, 'acquired the Book of the Dead'],
    [LL_ACHIEVE, 'performed the invocation'],
    [LL_ACHIEVE, 'acquired The Amulet of Yendor'],
    [LL_ACHIEVE, 'entered the Elemental Planes'],
    [LL_ACHIEVE, 'entered the Astral Plane'],
    [LL_ACHIEVE, 'ascended'],
    [LL_ACHIEVE | LL_SPOILER, "acquired the Mines' End"],
    [LL_ACHIEVE | LL_SPOILER, 'acquired the Sokoban'],
    [LL_ACHIEVE | LL_UMONST, 'killed Medusa'],
    [0, 'hero was always blond, no, blind'],
    [0, 'hero never wore armor'],
    [LL_MINORAC | LL_DUMP, 'entered the Gnomish Mines'],
    [LL_ACHIEVE, 'reached Mine Town'],
    [LL_MINORAC, 'entered a shop'],
    [LL_MINORAC, 'entered a temple'],
    [LL_ACHIEVE, 'consulted the Oracle'],
    [LL_MINORAC | LL_DUMP, 'read a Discworld novel'],
    [LL_ACHIEVE, 'entered Sokoban'],
    [LL_ACHIEVE, 'entered the Bigroom'],
    [LL_MINORAC | LL_DUMP, ''],
    [LL_MINORAC | LL_DUMP, ''],
    [LL_MINORAC | LL_DUMP, ''],
    [LL_ACHIEVE, ''],
    [LL_ACHIEVE, ''],
    [LL_ACHIEVE, ''],
    [LL_ACHIEVE, ''],
    [LL_ACHIEVE, ''],
    [LL_MINORAC, "learned castle drawbridge's tune"],
    [0, ''],
];

// src/insight.c:2243 show_achievements() — appended to the conduct window
// (C's ge.en_win); 'put', 'cmsg' and 'have_X' are show_conduct()'s
// enlght_out(), enl_msg() and you_have_X()
function show_achievements_into(put, cmsg, have_X, final) {
    let i, achidx, absidx, acnt;
    let buf;

    /* unfortunately we can't show the achievements (at least not all of
       them) while the game is in progress because it would give away the
       ID of luckstone (at Mine's End) and of real Amulet of Yendor */
    if (!final && !game.wizard)
        return;

    /* first, figure whether any achievements have been accomplished
       so that we don't show the header for them if the resulting list
       below it would be empty */
    if ((acnt = count_achievements()) === 0)
        return;

    put(''); /* end of game disclosure window: putstr(awin, 0, "") */
    put(`Achievement${plur(acnt)}:`);

    /* display achievements in the order in which they were recorded;
       lone exception is to defer the Amulet if we just ascended;
       it warrants alternate wording when given away during ascension,
       but the Amulet achievement is always attained before entering
       endgame and the alternate wording looks strange if shown before
       "reached endgame" and "reached Astral" */
    if (remove_achievement(ACH_UWIN)) { /* UWIN == Ascended! */
        /* for ascension, force it to be last and Amulet next to last
           by taking them out and then adding them back */
        if (remove_achievement(ACH_AMUL)) /* should always be True here */
            record_achievement(ACH_AMUL);
        record_achievement(ACH_UWIN);
    }
    const uhave = game.u.uhave || {};
    for (i = 0; i < acnt; ++i) {
        achidx = game.u.uachieved[i];
        absidx = Math.abs(achidx);

        switch (absidx) {
        case ACH_BLND:
            cmsg('are exploring', 'explored', ' without being able to see');
            break;
        case ACH_NUDE:
            cmsg('have gone', 'went', ' without any armor');
            break;
        case ACH_MINE:
            have_X('entered the Gnomish Mines');
            break;
        case ACH_TOWN:
            have_X('entered Minetown');
            break;
        case ACH_SHOP:
            have_X('entered a shop');
            break;
        case ACH_TMPL:
            have_X('entered a temple');
            break;
        case ACH_ORCL:
            have_X('consulted the Oracle of Delphi');
            break;
        case ACH_NOVL:
            have_X('read from a Discworld novel');
            break;
        case ACH_SOKO:
            have_X('entered Sokoban');
            break;
        case ACH_SOKO_PRIZE: /* hard to reach guaranteed bag or amulet */
            have_X('completed Sokoban');
            break;
        case ACH_MINE_PRIZE: /* hidden guaranteed luckstone */
            have_X('completed the Gnomish Mines');
            break;
        case ACH_BGRM:
            have_X('entered the Big Room');
            break;
        case ACH_MEDU:
            have_X('defeated Medusa');
            break;
        case ACH_TUNE:
            have_X("learned the tune to open and close the Castle's drawbridge");
            break;
        case ACH_BELL:
            /* alternate phrasing for present vs past and also for
               possessing the item vs once held it */
            cmsg(uhave.bell ? 'have' : 'have handled',
                 uhave.bell ? 'had' : 'handled',
                 ' the Bell of Opening');
            break;
        case ACH_HELL:
            cmsg('have ', '', 'entered Gehennom');
            break;
        case ACH_CNDL:
            cmsg(uhave.menorah ? 'have' : 'have handled',
                 uhave.menorah ? 'had' : 'handled',
                 ' the Candelabrum of Invocation');
            break;
        case ACH_BOOK:
            cmsg(uhave.book ? 'have' : 'have handled',
                 uhave.book ? 'had' : 'handled',
                 ' the Book of the Dead');
            break;
        case ACH_INVK:
            have_X("gained access to Moloch's Sanctum");
            break;
        case ACH_AMUL:
            /* alternate wording for ascended (always past tense) since
               hero had it until #offer forced it to be relinquished */
            cmsg(uhave.amulet ? 'have' : 'have obtained',
                 game.u.uevent?.ascended ? 'delivered'
                  : uhave.amulet ? 'had' : 'had obtained',
                 ' the Amulet of Yendor');
            break;

        /* reaching Astral makes feedback about reaching the Planes
           be redundant and ascending makes both be redundant, but
           we display all that apply */
        case ACH_ENDG:
            have_X('reached the Elemental Planes');
            break;
        case ACH_ASTR:
            have_X('reached the Astral Plane');
            break;
        case ACH_UWIN:
            /* the ultimate achievement... */
            put(' You ascended!');
            break;

        /* rank 0 is the starting condition, not an achievement; 8 is Xp 30 */
        case ACH_RNK1: case ACH_RNK1 + 1: case ACH_RNK1 + 2: case ACH_RNK1 + 3:
        case ACH_RNK1 + 4: case ACH_RNK1 + 5: case ACH_RNK1 + 6: case ACH_RNK8:
            buf = `attained the rank of ${
                   rank_of(rank_to_xlev(absidx - (ACH_RNK1 - 1)),
                           game.urole, (achidx < 0) ? true : false)}`;
            have_X(buf);
            break;

        default:
            buf = ` [Unexpected achievement #${achidx}.]`;
            put(buf);
            break;
        } /* switch */
    } /* for */
}

// src/insight.c:2434 count_achievements()
export function count_achievements() {
    return (game.u.uachieved || []).length;
}

// src/insight.c:2444 remove_achievement()
export function remove_achievement(achidx) {
    const achieved = game.u.uachieved || [];
    let i;

    for (i = 0; i < achieved.length; ++i)
        if (Math.abs(achieved[i]) === Math.abs(achidx))
            break; /* stop when found */
    if (i >= achieved.length) /* not found */
        return false;
    /* list is 0 terminated so any beyond the removed one move up a slot */
    achieved.splice(i, 1);
    return true;
}

// src/insight.c:2405 record_achievement()
export function record_achievement(achidx) {
    const absidx = Math.abs(achidx);
    if ((achidx < 1 && (absidx < ACH_RNK1 || absidx > ACH_RNK8))
        || achidx >= N_ACH)
        return;

    const achieved = (game.u.uachieved ||= []);
    if (achieved.some((entry) => Math.abs(entry) === absidx))
        return;
    achieved.push(achidx);

    /* SoundAchievement is audio-only. C suppresses final-disclosure
       achievements here because end.c logs the end result separately. */
    if (game.program_state_gameover)
        return;

    if (absidx >= ACH_RNK1 && absidx <= ACH_RNK8) {
        const rank = absidx - (ACH_RNK1 - 1);
        livelog_printf(achieve_msg[absidx][0],
                       `attained the rank of ${rank_of(rank_to_xlev(rank),
                           game.urole, achidx < 0)} (level ${game.u.ulevel})`);
    } else if (achidx === ACH_SOKO_PRIZE || achidx === ACH_MINE_PRIZE) {
        const achieveo = game.context.achieveo;
        const otyp = achidx === ACH_SOKO_PRIZE
            ? achieveo.soko_prize_otyp : achieveo.mines_prize_otyp;
        livelog_printf(achieve_msg[achidx][0],
                       `${achieve_msg[achidx][1]} ${OBJ_NAME(game.objects[otyp])}`);
    } else {
        livelog_printf(achieve_msg[absidx][0], achieve_msg[absidx][1]);
    }
}

// src/insight.c:135 enlght_line()
const CONTRACTIONS = [
    [' are not ', " aren't "], [' were not ', " weren't "],
    [' have not ', " haven't "], [' had not ', " hadn't "],
    [' can not ', " can't "], [' could not ', " couldn't "],
];
function enlght_line(start, middle, end, ps) {
    let buf = ` ${start}${middle}${end}${ps}.`;
    if (buf.includes(' not '))
        for (const [two, one] of CONTRACTIONS)
            buf = buf.split(two).join(one);
    out(buf);
}

// src/insight.c:105-108 — the enl_msg family; en_final picks the tense.
const enl_msg = (prefix, present, past, suffix, ps) =>
    enlght_line(prefix, en_final ? past : present, suffix, ps);
const you_are = (attr, ps = '') => enl_msg('You ', 'are ', 'were ', attr, ps);
const you_have = (attr, ps = '') => enl_msg('You ', 'have ', 'had ', attr, ps);
const you_can = (attr, ps = '') => enl_msg('You ', 'can ', 'could ', attr, ps);

// src/hacklib.c an()
function an(s) {
    if (!s) return s;
    return ('aeiouAEIOU'.includes(s[0]) ? 'an ' : 'a ') + s;
}
const plur = (n) => (n === 1 ? '' : 's');
const highc = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;

// src/role.c align_str() / align_gname()
export const align_str = (a) => a === 1 ? 'lawful' : a === 0 ? 'neutral'
                       : a === -1 ? 'chaotic' : 'unaligned';
function align_gname(a) {
    const r = game.roles?.[game.pantheon] ?? game.urole;
    const gnam = a === 1 ? r.lgod : a === 0 ? r.ngod : r.cgod;
    /* src/pray.c align_gname(): a leading '_' marks a name that already has
       its article ("_The Lady") and is stripped before display. */
    return gnam && gnam[0] === '_' ? gnam.slice(1) : gnam;
}
const u_gname = () => align_gname(game.u.ualign.type);

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/insight.c:280 background_enlightenment()
function background_enlightenment() {
    const u = game.u;
    const polymorphed = Upolyd(u);
    const female = polymorphed ? !!u.mfemale : !!game.flags.female;
    const role_titl = (female && game.urole.name.f) ? game.urole.name.f
                                                    : game.urole.name.m;
    const rank_titl = rank_of(u.ulevel, game.urole, female);

    out('');
    out('Background:');

    if (polymorphed) {
        const mdat = game.youmonst.data;
        const fixedGender = mdat.mflags2
            & (MFLAGS.M2_MALE | MFLAGS.M2_FEMALE | MFLAGS.M2_NEUTER);
        const gender = fixedGender ? '' : `${game.flags.female ? 'female' : 'male'} `;
        you_are(`currently in ${gender}${pmname(mdat, game.flags.female ? 1 : 0)} form`);
    }

    /* "%s, a level %d %s%s %s" — an(rank), level, gender adj, race adj, role */
    /* src/insight.c:512 — the gender word only when the role name has no
       female variant AND the role allows both genders (or the current gender
       differs from chargen's); a Valkyrie gets neither. */
    let tmpbuf = '';
    if (!game.urole.name.f
        && ((game.urole.allow & ROLE_GENDMASK) === (ROLE_MALE | ROLE_FEMALE)
            || (female ? 1 : 0) !== (game.flags.initgend ?? (female ? 1 : 0))))
        tmpbuf = (female ? 'female' : 'male') + ' ';
    let buf = polymorphed ? 'actually ' : '';
    if (rank_titl.toLowerCase() === role_titl.toLowerCase())
        buf += `${an(rank_titl)}, level ${u.ulevel} ${tmpbuf}${game.urace.noun}`;
    else
        buf += `${an(rank_titl)}, a level ${u.ulevel} ${tmpbuf}`
            + `${game.urace.adj} ${role_titl}`;
    you_are(buf);

    /* bypasses you_are() so the sentence has no trailing period yet */
    const currentAlign = u.ualignbase?.[A_CURRENT] ?? u.ualign.type;
    const originalAlign = u.ualignbase?.[A_ORIGINAL] ?? u.ualign.type;
    const missionAdverb = (u.ualign.type !== currentAlign)
        ? (en_final ? 'temporarily ' : 'currently ')
        : (u.ualign.type !== originalAlign)
          ? (en_final ? 'belatedly ' : 'now ')
          : (!u.uconduct?.gnostic && game.moves > 1000)
            ? 'nominally '
            : '';
    out(` You ${en_final ? 'were' : 'are'} ${align_str(u.ualign.type)}, ${missionAdverb}on a mission for ${u_gname()}`);

    let opp = ` who ${en_final ? 'was' : 'is'} opposed by`;
    if (u.ualign.type !== 1)
        opp += ` ${align_gname(1)} (${align_str(1)}) and`;
    if (u.ualign.type !== 0)
        opp += ` ${align_gname(0)} (${align_str(0)})`
             + ((u.ualign.type !== -1) ? ' and' : '');
    if (u.ualign.type !== -1)
        opp += ` ${align_gname(-1)} (${align_str(-1)})`;
    out(opp + '.');

    you_are(`${polymorphed ? 'normally ' : ''}${
        (u.uhandedness === RIGHT_HANDED) ? 'right-handed' : 'left-handed'}`);

    /* src/insight.c:604 — dungeon level, so that ^X really has all status
       info as claimed */
    if (In_endgame(u.uz)) {
        /* observable_depth() is just depth() (topten.c:183, the
           randomized-planes arm is #if 0) */
        const tmpbuf = endgamelevelname(depth(u.uz));
        you_are(`in the endgame, on the ${
            tmpbuf.startsWith('Plane') ? 'Elemental ' : ''}${tmpbuf}`);
    } else if (Is_knox_level(u.uz)) {
        /* this gives away the fact that the knox branch is only 1 level */
        you_are(`on the ${game.dungeons[u.uz.dnum].dname} level`);
    } else {
        /* "in %s, on %s" — dungeon name with a leading "The " LOWERCASED,
           not stripped, so the sentence reads "in the Dungeons of Doom"
           (src/insight.c:152) */
        let dgnbuf = game.dungeons[u.uz.dnum].dname;
        if (/^the /i.test(dgnbuf))
            dgnbuf = dgnbuf[0].toLowerCase() + dgnbuf.slice(1);
        you_are(`in ${dgnbuf}, on level ${
            In_quest(u.uz) ? dunlev(u.uz) : depth(u.uz)}`);
    }

    if (game.moves === 1)
        you_have('just started your adventure');
    else
        enlght_line('You ', 'entered ',
                    `the dungeon ${game.moves} turn${plur(game.moves)} ago`, '');

    /* really_done() freezes these values before the disclosure prompts so
       waiting at a prompt cannot change the final report. */
    if (en_final ? game.iflags?.at_midnight : midnight())
        enl_msg('It ', 'is ', 'was ', 'the midnight hour', '');
    else if (en_final ? game.iflags?.at_night : night())
        enl_msg('It ', 'is ', 'was ', 'nighttime', '');

    /* src/insight.c:653 — "other environmental factors" */
    if (game.flags.moonphase === FULL_MOON
        || game.flags.moonphase === NEW_MOON) {
        enl_msg('There ', 'is ', 'was ',
                `a ${game.flags.moonphase === FULL_MOON ? 'full' : 'new'}`
                + ` moon in effect${en_final
                    ? ' when your adventure ended' : ''}`, '');
    }
    if (game.flags.friday13)
        out(` Bad things ${!en_final ? 'can happen'
            : (en_final === ENL_GAMEOVERALIVE) ? 'could have happened'
              : 'happened'} on Friday the 13th.`);

    if (!polymorphed) {
        let buf = `${u.uexp | 0} experience point${plur(u.uexp | 0)}`;
        /* src/insight.c:702 — wizard mode (or final disclosure) appends the
           delta to the next level; "to attain" below 18, "for" above */
        const ulvl = u.ulevel | 0;
        if (ulvl < 30 && (en_final || game.wizard)) {
            const nxtlvl = newuexp(ulvl), delta = nxtlvl - (u.uexp | 0);
            buf += `, ${delta} ${(u.uexp > 0) ? 'more ' : ''}${
                !en_final ? '' : (delta === 1) ? 'was ' : 'were '}needed ${
                (ulvl < 18) ? 'to attain' : 'for'} level ${ulvl + 1}`;
        }
        you_have(buf);
    }
}

// src/insight.c:600 basics_enlightenment()
function basics_enlightenment() {
    const u = game.u;
    const Power = 'energy points (spell power)';
    const polymorphed = Upolyd(u);

    out('');
    out('Basics:');

    const hp = Math.max(0, polymorphed ? u.mh : u.uhp);
    const hpmax = polymorphed ? u.mhmax : u.uhpmax;
    you_have(hp === hpmax && hpmax > 1
             ? `all ${hpmax} hit points`
             : `${hp} out of ${hpmax} hit point${plur(hpmax)}`);

    const pw = u.uen, pwmax = u.uenmax;
    you_have((pwmax === 0 || (pw === pwmax && pwmax === 2))
             ? `${!pwmax ? 'no' : 'both'} ${Power}`      /* not "all 2" */
             : (pw === pwmax && pwmax > 2)
               ? `all ${pwmax} ${Power}`
               : `${pw} out of ${pwmax} ${Power}`);

    if (polymorphed) {
        const hitDice = game.youmonst.data.mlevel;
        you_have(hitDice === 0 ? '0 hit dice (actually 1/2)'
                 : hitDice === 1 ? '1 hit die'
                   : `${hitDice} hit dice`);
    }

    enl_msg('Your armor class ', 'is ', 'was ', `${u.uac}`, '');

    /* src/insight.c:781 — money_cnt(gi.invent), the live count, not the
       starting umoney0 snapshot; hidden_gold (containers) is recorded. */
    const money = money_cnt(game.invent);
    out(money ? ` Your wallet contain${en_final ? 'ed' : 's'} ${money} zorkmid${plur(money)}`
              : ` Your wallet ${en_final ? 'was' : 'is'} empty`);
    /* C terminates that line here when nothing follows it */
    lines[lines.length - 1] += '.';

    /* src/insight.c:804 — the "on" arm reports scope: shop suspension, the
       pickup_types symbols (or "all types"), pickup_thrown, exceptions. */
    let buf;
    if (game.flags.autopickup) {
        buf = 'on';
        if (costly_spot(u.ux, u.uy)) {
            /* being in a shop inhibits autopickup, even 'pickup_thrown' */
            buf += ', but temporarily disabled while inside the shop';
        } else {
            const ocl = game.flags.pickup_types || '';
            buf += ` for ${ocl ? `'${ocl}'` : 'all types'}`;
            if (game.flags.pickup_thrown && ocl)
                buf += ' plus thrown'; /* show when not 'all types' */
            if (game.apelist?.length)
                buf += ', with exceptions';
        }
    } else {
        buf = 'off';
    }
    enl_msg('Autopickup ', 'is ', 'was ', buf, '');
}

// src/insight.c:770 one_characteristic()
/* src/insight.c:287 attrval() — strength between 18 and 18/100 renders in
   the exceptional "18/xx" notation; 19..25 shed the +100 encoding. */
function attrval(attrindx, attrvalue) {
    if (attrindx !== A_STR || attrvalue <= 18)
        return `${attrvalue}`;
    if (attrvalue > STR18(100)) /* 19 to 25 */
        return `${attrvalue - 100}`;
    return `18/${String(attrvalue - 18).padStart(2, '0')}`;
}

function one_characteristic(attrindx) {
    const acurrent = ACURR(attrindx);
    const abase = game.u.acurr.a[attrindx], apeak = game.u.amax.a[attrindx];
    const alimit = game.urace.attrmax[attrindx];
    let valubuf = attrval(attrindx, acurrent);

    /* src/insight.c:858: a polymorphed hero cannot reliably inspect the
       underlying base, peak, or innate-limit values. */
    if (Upolyd(game.u)) {
        enl_msg(`Your ${attrname[attrindx]} `, 'is ', 'was ', valubuf, '');
        return;
    }

    const interesting_alimit = en_final
        ? true /* was originally (abase != alimit) */
        : (alimit !== (attrindx !== A_STR ? 18 : STR18(100)));
    let paren_pfx = en_final ? ' (' : ' (current; ';
    if (acurrent !== abase) {
        valubuf += `${paren_pfx}base:${attrval(attrindx, abase)}`;
        paren_pfx = ', ';
    }
    if (abase !== apeak) {
        valubuf += `${paren_pfx}peak:${attrval(attrindx, apeak)}`;
        paren_pfx = ', ';
    }
    if (interesting_alimit) {
        valubuf += `${paren_pfx}${acurrent > alimit ? 'innate ' : ''}`
                 + `limit:${attrval(attrindx, alimit)}`;
    }
    if (acurrent !== abase || abase !== apeak || interesting_alimit)
        valubuf += ')';

    enl_msg(`Your ${attrname[attrindx]} `, 'is ', 'was ', valubuf, '');
}

// src/insight.c:900 characteristics_enlightenment() — bottom-line order.
function characteristics_enlightenment() {
    out('');
    out(`${en_final ? 'Final ' : ''}Characteristics:`);
    for (const a of [A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA])
        one_characteristic(a);
}

// src/getpos.c:557 dxdy_to_dist_descr(), full-direction form.
function full_direction(dx, dy) {
    if (!dx && !dy)
        return 'here';
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) {
        const vertical = dy < 0 ? 'north' : dy > 0 ? 'south' : '';
        const horizontal = dx < 0 ? 'west' : dx > 0 ? 'east' : '';
        return vertical + horizontal;
    }
    const parts = [];
    if (dy)
        parts.push(`${Math.abs(dy)}${dy < 0 ? 'north' : 'south'}`);
    if (dx)
        parts.push(`${Math.abs(dx)}${dx < 0 ? 'west' : 'east'}`);
    return parts.join(',');
}

// src/insight.c:1180 status_enlightenment() — only the last-resort entries a
// fresh hero reaches.
function status_enlightenment() {
    const u = game.u;
    out('');
    out(`${en_final ? 'Final ' : ''}Status:`);

    if (Upolyd(u))
        you_are('transformed');
    if (Levitation())
        you_are('levitating', from_what('HLevitation'));
    else if (Flying())
        you_are('flying', from_what('HFlying'));

    /* src/insight.c:1181, restful sleep and other Sleepy sources. */
    if ((u.intrinsic?.HSleepy || u.uprops?.SLEEPY))
        enl_msg('You ', 'fall', 'fell', ' asleep uncontrollably', '');

    if (u.intrinsic?.HStun || u.uprops?.STUNNED)
        you_are('stunned');

    if (Hallucination())
        you_are('hallucinating');

    if (Blind()) {
        const innatelyBlind = !!(u.intrinsic?.HBlinded & FROMFORM);
        you_are(innatelyBlind ? 'innately blind' : 'temporarily blind');
    }

    if (Deaf())
        you_are('deaf');

    if (game.u.uprops?.PUNISHED) {
        const punishment = game.u.uball
            ? `chained to ${an(simpleonames(game.u.uball))}`
            : 'punished';
        you_are(punishment);
    }

    if (game.u.ustuck && !game.u.uswallow) {
        const holder = game.u.ustuck;
        let heldmon = a_monnam(holder);
        if (heldmon === 'it' && holder.mgivenname !== 'it')
            heldmon = 'an unseen creature';
        const relation = Upolyd(game.u) && sticks(game.youmonst.data)
            ? 'holding' : 'held by';
        const direction = full_direction(holder.mx - game.u.ux,
                                         holder.my - game.u.uy);
        you_are(`${relation} ${heldmon} (${direction})`);
    }

    if (((game.u.intrinsic?.HWounded_legs | 0) > 0
         || (game.u.EWounded_legs | 0)) && !game.u.usteed) {
        const side = (game.u.EWounded_legs | 0) & BOTH_SIDES;
        let part = body_part(LEG);
        let article = 'a ';
        let which = '';
        if (side === BOTH_SIDES) {
            part = makeplural(part);
            article = '';
        } else {
            which = side === LEFT_SIDE ? 'left '
                  : side === RIGHT_SIDE ? 'right ' : '';
        }
        you_have(`${article}wounded ${which}${part}`);
    }

    /* hunger: hu_stat[] is blank for the normal state. */
    let hunger = (hu_stat[game.u.uhs] || '').trim().toLowerCase();
    if (!hunger)
        hunger = 'not hungry';
    else if (hunger === 'weak')
        hunger += ' from severe hunger';
    else if (hunger.startsWith('faint'))
        hunger += ' due to starvation';
    you_are(hunger + (game.wizard ? ` <${game.u.uhunger}>` : ''));

    /* src/insight.c:1211 encumbrance. */
    const cap = near_capacity();
    if (cap > 0) {
        const enc = ['unencumbered', 'burdened', 'stressed', 'strained',
                     'overtaxed', 'overloaded'];
        const adj = ['?', 'slightly', 'moderately', 'very', 'extremely',
                     'not possible'];
        let state = enc[cap] + (game.wizard ? ` <${inv_weight()}>` : '');
        state += `; movement is ${adj[cap]}${cap < 5 ? ' slowed' : ''}`;
        you_are(state);
    } else {
        you_are('unencumbered' + (game.wizard ? ` <${inv_weight()}>` : ''));
    }

    /* src/insight.c:1270 weapon_insight() — the reachable arms: weaponless
       (empty_handed) or wielding a plain weapon described by its skill
       class. The twoweap arm and the shield-of-reflection / wet-towel
       overrides need state no recorded hero reaches yet. */
    if (!game.u.uwep) {
        you_are(empty_handed());
    } else if (game.u.twoweap) {
        you_are('wielding two weapons at once');
    } else {
        const what = weapon_descr(game.u.uwep);
        let buf;
        if (what === 'armor' || what === 'food' || what === 'venom')
            buf = `wielding some ${what}`;
        else
            buf = `wielding ${(game.u.uwep.quan === 1) ? an(what) : makeplural(what)}`;
        you_are(buf);
    }

    /*
     * Skill with current weapon (src/insight.c:1310).
     */
    {
        const wtype = weapon_type(game.u.uwep);
        if (wtype !== P_NONE && (!game.u.uwep || !is_ammo(game.u.uwep))) {
            const sklvl = P_SKILL(wtype);
            const hav = (sklvl !== P_UNSKILLED && sklvl !== P_SKILLED);
            const sklvlbuf = (sklvl === P_ISRESTRICTED)
                ? 'no' : skill_level_name(wtype).toLowerCase();
            /* "you have no/basic/expert skill with <skill>" or
               "you are unskilled/skilled in <skill>" */
            let buf = `${sklvlbuf} ${hav ? 'skill with' : 'in'} ${skill_name(wtype)}`;
            if (!game.u.twoweap) {
                if (can_advance(wtype, false))
                    buf += ' and can enhance that';
                if (hav)
                    you_have(buf);
                else
                    you_are(buf);
            } else {
                /* src/insight.c:1334 — the two-weapon comparisons: each of
                   primary and secondary against the two-weapon skill */
                const also_ = 'also ';
                const wtype2 = weapon_type(game.u.uswapwep);
                const sklvl2 = P_SKILL(wtype2);
                const hav2 = (sklvl2 !== P_UNSKILLED && sklvl2 !== P_SKILLED);
                let twoskl = P_SKILL(P_TWO_WEAPON_COMBAT);
                let twobuf;
                if (twoskl === P_ISRESTRICTED) {
                    twoskl = P_UNSKILLED;
                    twobuf = 'restricted';
                } else {
                    twobuf = skill_level_name(P_TWO_WEAPON_COMBAT)
                                 .toLowerCase();
                }

                let pfx = '', sfx = '', also = '', also2 = '', also3 = null;
                if (twoskl < sklvl) {
                    pfx = `Your skill in ${skill_name(wtype)} `;
                    sfx = ` limited by being ${twobuf} with two weapons`;
                    also = also_;
                } else if (twoskl > sklvl) {
                    pfx = 'Your two weapon skill ';
                    sfx = ' limited by '
                        + ((sklvl > P_ISRESTRICTED)
                           ? `being ${sklvlbuf}` : 'having no skill')
                        + ` with ${skill_name(wtype)}`;
                    also2 = also_;
                } else {
                    buf += ' and two weapons';
                    also3 = also_;
                }
                if (pfx)
                    enl_msg(pfx, 'is', 'was', sfx, '');
                else if (hav)
                    you_have(buf);
                else
                    you_are(buf);

                /* skip the secondary comparison if identical to primary's */
                if (wtype2 !== wtype) {
                    const sknambuf2 = skill_name(wtype2);
                    const sklvlbuf2 = skill_level_name(wtype2).toLowerCase();
                    let verb_present = 'is', verb_past = 'was';
                    pfx = ''; sfx = ''; buf = '';
                    if (twoskl < sklvl2) {
                        pfx = `Your skill in ${sknambuf2} `;
                        sfx = ` ${also}limited by being ${twobuf}`
                            + ' with two weapons';
                    } else if (twoskl > sklvl2) {
                        pfx = 'Your two weapon skill ';
                        sfx = ` ${also2}limited by `
                            + ((sklvl2 > P_ISRESTRICTED)
                               ? `being ${sklvlbuf2}` : 'having no skill')
                            + ` with ${sknambuf2}`;
                    } else {
                        buf = `${sklvlbuf2} ${hav2 ? 'skill with' : 'in'} `
                            + `${sknambuf2} and two weapons`;
                        if (also3) {
                            pfx = 'You also ';
                            sfx = ` ${buf}`; buf = '';
                            verb_present = hav2 ? 'have' : 'are';
                            verb_past = hav2 ? 'had' : 'were';
                        }
                    }
                    if (pfx)
                        enl_msg(pfx, verb_present, verb_past, sfx, '');
                    else if (hav2)
                        you_have(buf);
                    else
                        you_are(buf);
                }

                /* src/insight.c:1436 — the "You can enhance skill(s) with
                   ..." hint when any of the three is advanceable */
                const a1 = can_advance(wtype, false);
                const a2 = (wtype2 !== wtype) ? can_advance(wtype2, false)
                                              : false;
                const ab = can_advance(P_TWO_WEAPON_COMBAT, false);
                if (a1 || a2 || ab) {
                    const also_wik_ = ' and also with ';
                    const n = (a1 ? 1 : 0) + (a2 ? 1 : 0) + (ab ? 1 : 0);
                    const hint = ` skill${n > 1 ? 's' : ''} with `
                        + `${a1 ? skill_name(wtype) : ''}`
                        + `${(a1 && a2 && ab) ? ', '
                             : (a1 && (a2 || ab)) ? also_wik_ : ''}`
                        + `${a2 ? skill_name(wtype2) : ''}`
                        + `${(a1 && a2 && ab) ? ', and '
                             : (a2 && ab) ? also_wik_ : ''}`
                        + `${ab ? 'two weapons' : ''}`;
                    enl_msg('You ', 'can enhance', 'could have enhanced',
                            hint, '');
                }
            }
        }
    }

    /* C reports 'nudity' when no armour slot is filled. A Tourist wears the
       Hawaiian shirt, so this must NOT fire — emitting it would push every
       following row down one and lose the frame. */
    if (!wearing_any_armor()) {
        if (game.u.uroleplay?.nudist)
            enl_msg('You ', 'do', 'did', ' not wear any armor', '');
        else
            you_are('not wearing any armor');
    }
}

function wearing_any_armor() {
    const u = game.u;
    return !!(u.uarm || u.uarmu || u.uarmc || u.uarms
              || u.uarmg || u.uarmf || u.uarmh);
}

// src/insight.c:200 enlightenment() — returns the lines for the caller to put
// into a window.
export function enlightenment(mode, final) {
    /* the ^X caller passes nothing: BASIC (+MAGIC for wizard/discover),
       game in progress — src/insight.c:2009 doattributes() */
    if (mode === undefined)
        mode = BASICENLIGHTENMENT
               | ((game.wizard || game.discover) ? MAGICENLIGHTENMENT : 0);
    en_final = final | 0;
    lines.length = 0;

    const tmpbuf = highc(game.plname || '');
    const female = !!game.flags.female;
    out(`${tmpbuf} the ${(female && game.urole.name.f) ? game.urole.name.f
                                                       : game.urole.name.m}'s attributes:`);

    if (mode & BASICENLIGHTENMENT) {
        background_enlightenment();
        basics_enlightenment();
        characteristics_enlightenment();
    }
    status_enlightenment();

    /* src/insight.c:420 — the intrinsics section is shown for
       MAGICENLIGHTENMENT: wizard/discover ^X, and always at game end. */
    if (mode & MAGICENLIGHTENMENT)
        attributes_enlightenment();

    out('');
    out('Miscellaneous:');
    /* src/insight.c:428 — wizard/discover reminder plus the bones tally,
       which the end-of-game disclosure always shows */
    if ((mode & BASICENLIGHTENMENT)
        && (game.wizard || game.discover || en_final)) {
        if (game.wizard || game.discover)
            you_are(`running in ${game.wizard ? 'debug' : 'explore'} mode`);
        if (game.flags?.bones === false) {
            you_have(`disabled loading${
                en_final === ENL_GAMEOVERDEAD ? ' and storing' : ''
                } of bones levels`);
        } else if (!(game.u.uroleplay?.numbones)) {
            enl_msg('You ', "haven't encountered", "didn't encounter",
                    ' any bones levels', '');
        } else {
            note_unported_insight('enlightenment:bones_count');
        }
    }
    enl_msg('Total elapsed playing time ', 'is', 'was', ' none', '');

    const result = lines.slice();
    en_final = 0;
    return result;
}

// src/insight.c:1487 attributes_enlightenment() — the "Attributes:" section.
//
// For a fresh un-polymorphed hero with no intrinsics almost every arm is
// silent; the piousness line and the can-pray tail are what show. The long
// resistance and sense blocks read property state this tree tracks in
// u.uprops; any set property whose line is not written here records itself.
function attributes_enlightenment() {
    const u = game.u;

    out('');
    out(`${en_final ? 'Final ' : ''}Attributes:`);

    if (u.uevent?.uhand_of_elbereth)
        note_unported_insight('attributes:hand_of_elbereth');

    const pio = piousness(true, 'aligned');
    if ((u.ualign?.record ?? 0) >= 0)
        you_are(pio);
    else
        you_have(pio);

    if (game.wizard)
        enl_msg('Your alignment ', 'is', 'was', ` ${u.ualign?.record ?? 0}`, '');

    /* resistances, senses, movement intrinsics: every arm keys on a
       property; a hero with any of them set needs the C line ported */
    for (const k of Object.keys(u.uprops || {}))
        if (u.uprops[k] && (u.uprops[k].intrinsic || u.uprops[k].extrinsic))
            note_unported_insight(`attributes:prop:${k}`);

    /* src/insight.c:1524. Antimagic includes dragon mail and cloaks, and
       from_what() names the worn source in wizard mode. */
    if (Antimagic())
        you_are('magic-protected', from_what('HAntimagic'));

    /* src/insight.c:1526-1541 — resistances to troubles, each with
       from_what() naming the source in wizard mode */
    if (Fire_resistance())
        you_are('fire resistant', from_what('HFire_resistance'));
    item_resistance_message('FIRE_RES', ' protected from fire');
    if (Cold_resistance())
        you_are('cold resistant', from_what('HCold_resistance'));
    item_resistance_message('COLD_RES', ' protected from cold');
    if (Sleep_resistance())
        you_are('sleep resistant', from_what('HSleep_resistance'));
    if (Disint_resistance())
        you_are('disintegration resistant', from_what('HDisint_resistance'));
    item_resistance_message('DISINT_RES', ' protected from disintegration');
    if (Shock_resistance())
        you_are('shock resistant', from_what('HShock_resistance'));
    item_resistance_message('SHOCK_RES', ' protected from electric shocks');
    if (Poison_resistance())
        you_are('poison resistant', from_what('HPoison_resistance'));
    if (Acid_resistance())
        you_are('acid resistant', from_what('HAcid_resistance'));
    item_resistance_message('ACID_RES', ' protected from acid');
    if (Drain_resistance())
        you_are('level-drain resistant', from_what('HDrain_resistance'));
    if (Sick_resistance())
        you_are('immune to sickness', from_what('HSick_resistance'));
    if (Stone_resistance())
        you_are('petrification resistant', from_what('HStone_resistance'));
    if (Halluc_resistance())
        enl_msg('You ', 'resist', 'resisted', ' hallucinations',
                from_what('HHalluc_resistance'));

    /*** Vision and senses (insight.c:1566) ***/
    if ((u.intrinsic?.HBlnd_resistance || u.uprops?.BLND_RES) && !Blind())
        you_are('not subject to light-induced blindness',
                from_what('HBlnd_resistance'));
    if (See_invisible())
        enl_msg('You ', 'see ', 'saw ', 'invisible',
                from_what('HSee_invisible'));
    if (u.intrinsic?.HTelepat || u.uprops?.TELEPAT)
        you_are('telepathic', from_what('HTelepat'));
    if (Warning())
        you_are('warned', from_what('HWarning'));
    if (Searching())
        you_have('automatic searching', from_what('HSearching'));
    if (Infravision())
        you_have('infravision', from_what('HInfravision'));

    /*** Appearance and behavior (insight.c:1670) ***/
    if (Invis())
        you_are(See_invisible() ? 'invisible to others' : 'invisible',
                from_what('HInvis'));
    if (u.uprops?.DISPLACED)
        you_are('displaced', from_what('HDisplaced'));
    if (Stealth())
        you_are('stealthy', from_what('HStealth'));

    /*** Transportation (insight.c:1688) ***/
    if (u.intrinsic?.HJumping || u.uprops?.JUMPING)
        you_can('jump', from_what('HJumping'));
    if (Teleportation())
        you_can('teleport', from_what('HTeleportation'));
    if (Teleport_control())
        you_have('teleport control', from_what('HTeleport_control'));

    if (Swimming())
        you_can('swim', from_what('HSwimming'));
    if (Breathless())
        you_can('survive without air');
    else if (Amphibious())
        you_can('breathe water');
    if (Passes_walls())
        you_can('walk through walls', from_what('HPasses_walls'));

    if (Regeneration())
        enl_msg('You regenerate', '', 'd', '', from_what('HRegeneration'));
    if (u.uprops?.SLOW_DIGESTION)
        you_have('slower digestion', from_what('HSlow_digestion'));

    /* src/insight.c:1799 — the magic cancellation factor from worn armor:
       "warded" / "guarded" / "protected" for mc 1..3 */
    const armpro = magic_negation(null);
    if (armpro > 0) {
        const mc_types = ['', 'warded', 'guarded', 'protected'];
        you_are(mc_types[Math.min(armpro, 3)]);
    }
    if (u.uprops?.HALF_PHDAM)
        enl_msg('You ', 'take', 'took', ` ${en_final || game.wizard
            ? 'half' : 'reduced'} physical damage`,
            from_what('HHalf_physical_damage'));
    if (u.uprops?.HALF_SPDAM)
        enl_msg('You ', 'take', 'took', ` ${en_final || game.wizard
            ? 'half' : 'reduced'} spell damage`,
            from_what('HHalf_spell_damage'));
    if (game.spl_book?.[0]?.sp_id) {
        const suit = u.uarm && is_metallic(u.uarm);
        const robe = u.uarmc?.otyp === ONAMES.ROBE;
        let cast = '';
        if (suit)
            cast = ` impaired by metallic armor${robe
                ? ', mitigated by your robe' : ''}`;
        else if (robe)
            cast = ' enhanced by wearing a robe';
        if (cast)
            enl_msg('Your spell casting ', 'is', 'was', cast, '');
    }

    if (Upolyd(u)) {
        let form = `polymorphed into ${an(pmname(game.youmonst.data,
                                               game.flags.female ? 1 : 0))}`;
        if (game.wizard)
            form += ` (${u.mtimedone})`;
        you_are(form);
    }

    /* src/insight.c:1898 — Fast, between the mc line and Luck */
    if (Fast())
        you_are(Very_fast() ? 'very fast' : 'fast', from_what('HFast'));
    if (Reflecting())
        you_have('reflection', from_what('HReflecting'));
    if (u.uprops?.FREE_ACTION)
        you_have('free action', from_what('HFree_action'));
    if (u.uprops?.LIFESAVED)
        enl_msg('Your life ', 'will be', 'would have been', ' saved', '');

    /* src/insight.c:1909 — Luck; the zero line is wizard-mode only */
    const luck = (game.u.uluck ?? 0) + (game.u.moreluck ?? 0);
    if (luck) {
        const ltmp = Math.abs(luck);
        let lbuf = `${ltmp >= 10 ? 'extremely ' : ltmp >= 5 ? 'very ' : ''}${
            luck < 0 ? 'un' : ''}lucky`;
        if (game.wizard)
            lbuf += ` (${luck})`;
        you_are(lbuf);
    } else if (game.wizard) {
        enl_msg('Your luck ', 'is', 'was', ' zero', '');
    }
    if ((u.moreluck | 0) > 0)
        you_have('extra luck');
    else if ((u.moreluck | 0) < 0)
        you_have('reduced luck');
    if (carrying(ONAMES.LUCKSTONE) || stone_luck(true)) {
        const timeoutLuck = stone_luck(false);
        if (timeoutLuck <= 0)
            enl_msg('Bad luck ', 'does', 'did', ' not time out for you', '');
        if (timeoutLuck >= 0)
            enl_msg('Good luck ', 'does', 'did', ' not time out for you', '');
    }

    if (u.ugangr) {
        let anger = `${u.ugangr > 6 ? 'extremely '
                     : u.ugangr > 3 ? 'very ' : ''}angry with you`;
        if (game.wizard)
            anger += ` (${u.ugangr})`;
        enl_msg(u_gname(), ' is', ' was', ` ${anger}`, '');
    } else if (!en_final) {
        /* src/insight.c:1936 — suppressed when the game is over: death can
           change can_pray()'s answer */
        you_can(`${can_pray(false) ? '' : 'not '}safely pray`
                + (game.wizard ? ` (${u.ublesscnt})` : ''));
    }

    /* src/insight.c:1968 — mortality tally; at a death it is the plain
       " You are dead." line (the past-tense slot carries it) */
    {
        let buf = '';
        let p;
        if (en_final < ENL_GAMEOVERDEAD) {
            p = 'survived after being killed ';
            if (!(u.umortality | 0))
                p = !en_final ? null : 'survived';
            else {
                const n = u.umortality | 0;
                buf = n === 1 ? 'once' : n === 2 ? 'twice'
                    : n === 3 ? 'thrice' : `${n} times`;
            }
        } else {
            p = 'are dead';
            if ((u.umortality | 0) > 1) {
                const n = u.umortality | 0;
                const mod100 = n % 100;
                const ord = mod100 >= 11 && mod100 <= 13 ? 'th'
                    : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd'
                    : n % 10 === 3 ? 'rd' : 'th';
                buf = ` (${n}${ord} time!)`;
            }
        }
        if (p)
            enl_msg('You ', 'have been killed ', p, buf, '');
    }
}

// src/pray.c:2124 can_pray() — the enlightenment approximation: prayer is
// safe when the timeout has run out, luck and anger are clean, and we are
// not in Gehennom. The undead-polymorph rn2(10) arm and the altar alignment
// arms are gated on state that cannot occur yet.
function can_pray(praying) {
    const u = game.u;
    const p_aligntyp = u.ualign?.type ?? 0;   /* on_altar() has no altars yet */
    const p_trouble = in_trouble();
    const alignment = u.ualign?.record ?? 0;

    let p_type;
    if ((p_trouble > 0) ? (u.ublesscnt > 200)
        : (p_trouble < 0) ? (u.ublesscnt > 100)
          : (u.ublesscnt > 0))
        p_type = 0;                     /* too soon... */
    else if ((u.uluck ?? 0) < 0 || u.ugangr || alignment < 0)
        p_type = 1;                     /* too naughty... */
    else
        p_type = 3;

    return !praying ? (p_type === 3 /* && !Inhell */) : true;
}

// src/pray.c:76 in_trouble() — the reachable numeric slice: critically low
// hit points and starvation; the remaining trouble states key on properties
// and are recorded when set.
function in_trouble() {
    const u = game.u;

    /* TROUBLE_HIT (Stoned/Slimed/Strangled/lava/sick) — property-gated */
    if (u.uprops?.STONED?.intrinsic || u.uprops?.SLIMED?.intrinsic
        || u.uprops?.STRANGLED?.intrinsic || u.usick_type)
        note_unported_insight('in_trouble:major_prop');

    if (u.uhp <= 5 || u.uhp * 7 <= u.uhpmax)
        return 1;                       /* TROUBLE_HIT_POINTS */
    if (u.uhs >= WEAK)
        return 1;                       /* TROUBLE_HUNGRY */

    return 0;
}

// src/insight.c:3235 piousness() — the alignment-record adverb.
export function piousness(showneg, suffix) {
    const rec = game.u.ualign?.record ?? 0;
    let pio;

    /* note: piousness 20 matches MIN_QUEST_ALIGN (quest.h) */
    if (rec >= 20)      pio = "piously";
    else if (rec > 13)  pio = "devoutly";
    else if (rec > 8)   pio = "fervently";
    else if (rec > 3)   pio = "stridently";
    else if (rec === 3) pio = "";
    else if (rec > 0)   pio = "haltingly";
    else if (rec === 0) pio = "nominally";
    else if (!showneg)  pio = "insufficiently";
    else if (rec >= -3) pio = "strayed";
    else if (rec >= -8) pio = "sinned";
    else                pio = "transgressed";

    let buf = pio;
    if (suffix && (!showneg || rec >= 0)) {
        if (rec !== 3)
            buf += " ";
        buf += suffix;
    }
    return buf;
}

// src/insight.c:3275 mstatusline() gives stethoscope and probing feedback.
export async function mstatusline(mtmp) {
    const mdat = game.mons[mtmp.mnum];
    let info = '';

    if (mtmp.mtame)
        info += ', tame';
    else if (mtmp.mpeaceful)
        info += ', peaceful';
    if (mtmp.meating) info += ', eating';
    if (mtmp.mcan) info += ', cancelled';
    if (mtmp.mconf) info += ', confused';
    if (mtmp.mblinded || mtmp.mcansee === 0) info += ', blind';
    if (mtmp.mstun) info += ', stunned';
    if (mtmp.msleeping)
        info += ', asleep';
    else if (mtmp.mfrozen || (mtmp.mcanmove ?? 1) === 0)
        info += ", can't move";
    else if (((mtmp.mstrategy | 0) & STRAT_WAITMASK) !== 0)
        info += ', meditating';
    if (mtmp.mflee) info += ', scared';
    if (mtmp.mtrapped) info += ', trapped';
    if (mtmp.mspeed)
        info += mtmp.mspeed === MFAST ? ', fast'
              : mtmp.mspeed === MSLOW ? ', slow' : ', [? speed]';
    if (mtmp.minvis) info += ', invisible';
    if (mtmp === game.u.ustuck)
        info += game.u.uswallow ? ', engulfing you' : ', holding you';
    if (mtmp === game.u.usteed) info += ', carrying you';
    if (mtmp.mleashed) info += ', leashed';

    let alignment = mtmp.ispriest
        ? (mtmp.epri?.shralign ?? mtmp.mextra?.epri?.shralign ?? A_NONE)
        : mtmp.isminion
          ? (mtmp.emin?.min_align ?? mtmp.mextra?.emin?.min_align ?? A_NONE)
          : mdat.maligntyp;
    if (alignment !== A_NONE)
        alignment = Math.sign(alignment);
    const size = ['tiny', 'small', 'medium', 'large', 'huge', 'gigantic'][mdat.msize]
                 ?? `unknown size (${mdat.msize})`;
    const monname = x_monnam(mtmp, ARTICLE_YOUR, null,
                             SUPPRESS_IT | SUPPRESS_INVISIBLE, false);
    await pline(`Status of ${monname} (${align_str(alignment)}, ${size}):  `
                + `Level ${mtmp.m_lev}  HP ${mtmp.mhp}(${mtmp.mhpmax})  `
                + `AC ${find_mac(mtmp)}${info}.`);
}

// src/insight.c:3402 ustatusline() gives the hero's one-line status.
//
// The condition suffixes read state that is absent for most fresh heroes and
// simply contribute nothing; the swallow/engulf and gas-region arms are
// recorded when their state exists.
export async function ustatusline() {
    let info = '';
    if (game.u.usick_type)      info += ', dying from illness';   /* Sick */
    if (game.u.uprops?.STONED?.intrinsic)    info += ', solidifying';
    if (game.u.uprops?.SLIMED?.intrinsic)    info += ', becoming slimy';
    if (game.u.uprops?.STRANGLED?.intrinsic) info += ', being strangled';
    if (game.u.uprops?.CONFUSION?.intrinsic) info += ', confused';
    if (game.u?.ublind)          info += ', blind';
    if (game.u.uprops?.STUNNED?.intrinsic)   info += ', stunned';
    if (game.u.utrap)            info += ', trapped';
    if (Fast())                  info += Very_fast() ? ', very fast' : ', fast';
    if (game.u.uundetected)      info += ', concealed';
    if (game.u.ustuck)
        note_unported_insight('ustatusline:ustuck');

    await pline(`Status of ${game.plname} (${piousness(false, align_str(game.u.ualign?.type ?? 0))}):  Level ${game.u.ulevel}  HP ${game.u.uhp}(${game.u.uhpmax})  AC ${game.u.uac}${info}.`);
}


// src/insight.c:2022 youhiding(); the hero is hiding (or mimicking)
export async function youhiding(via_enlghtmt, msgflag) {
    /* via_enlghtmt: enlightenment line vs topl message;
       msgflag: for variant message phrasing */
    const u = game.u;
    const youmonst = game.youmonst;
    let buf = 'hiding';

    if (M_AP_TYPE(youmonst) !== M_AP_NOTHING) {
        /* mimic; hero is only able to mimic a strange object or gold
           or hallucinatory alternative to gold, so we skip the details
           for the hypothetical furniture and monster cases */
        buf = 'mimicking';
        if (M_AP_TYPE(youmonst) === M_AP_OBJECT) {
            buf += ` ${an(simple_typename(youmonst.mappearance))}`;
        } else if (M_AP_TYPE(youmonst) === M_AP_FURNITURE) {
            buf += ' something';
        } else if (M_AP_TYPE(youmonst) === M_AP_MONSTER) {
            buf += ' someone';
        } else {
            ; /* something unexpected; leave 'buf' as-is */
        }
    } else if (u.uundetected) {
        /* points past "hiding" */
        if (youmonst.data.mlet === MONSYMS.S_EEL) {
            if (is_pool(u.ux, u.uy))
                buf += ` in the ${waterbody_name(u.ux, u.uy)}`;
        } else if (hides_under(youmonst.data)) {
            const o = (game.level.objects || [])
                .find((obj) => obj.ox === u.ux && obj.oy === u.uy);

            if (o)
                buf += ` underneath ${ansimpleoname(o)}`;
        } else if (is_clinger(youmonst.data) || Flying()) {
            buf += ` on the ${ceiling(u.ux, u.uy)}`;
        } else {
            if (u.utrap && u.utraptype === TT_PIT) {
                const t = t_at(u.ux, u.uy);

                buf += ` in a ${(t && t.ttyp === SPIKED_PIT) ? 'spiked ' : ''}pit`;
            } else
                buf += ` on the ${surface(u.ux, u.uy)}`;
        }
    } else {
        ; /* shouldn't happen; will result in generic "you are hiding" */
    }

    if (via_enlghtmt) {
        const save_final = en_final;
        en_final = msgflag; /* 'final' is used by you_are() macro */
        you_are(buf, '');
        en_final = save_final;
    } else {
        /* #monster: "you are now hiding" */
        await You(`are ${msgflag ? 'already' : 'now'} ${buf}.`);
    }
}

// src/insight.c:2560 show_gamelog() / :2532 do_gamelog() — the #chronicle
// window.
export async function do_gamelog() {
    if ((game.gamelog || []).length) {
        const {
            tty_create_nhwindow, tty_destroy_nhwindow, tty_putstr,
            tty_display_nhwindow, tty_next_page, NHW_TEXT,
        } = await import('./tty/wintty.js');
        const { docrt } = await import('./display.js');
        const win = tty_create_nhwindow(NHW_TEXT);
        tty_putstr(win, 0, 'Logged events:');
        let eventcnt = 0;
        for (const e of game.gamelog) {
            if (!eventcnt++)
                tty_putstr(win, 0, ' Turn');
            tty_putstr(win, 0, `${String(e.turn).padStart(5)}: ${e.text}`);
        }
        await tty_display_nhwindow(win);
        await xwaitforspace(' \r\n\x1b');
        while (game.morc !== '\x1b' && tty_next_page(win))
            await xwaitforspace(' \r\n\x1b');
        tty_destroy_nhwindow(win);
        await docrt();
    } else {
        await pline('No chronicled events.');
    }
    return 0; /* ECMD_OK */
}


// src/insight.c:2089 show_conduct() — the #conduct window. The arms whose
// state no session reaches (blind/deaf/pauper/nudist rolls, wish details)
// stay silent exactly as C's would with zeroed fields.
export async function show_conduct(final) {
    const {
        tty_create_nhwindow, tty_destroy_nhwindow, tty_putstr,
        tty_display_nhwindow, tty_next_page, NHW_MENU,
    } = await import('./tty/wintty.js');
    const { nhgetch } = await import('./input.js');
    const { docrt } = await import('./display.js');
    const { xwaitforspace } = await import('./tty/getline.js');
    const c = game.u.uconduct || {};
    const fin = final | 0;
    const win = tty_create_nhwindow(NHW_MENU);
    const put = (s) => tty_putstr(win, 0, s);
    /* the enl_msg tense pairs from src/insight.c:105-115, applied with the
       same one-space lead and contraction pass as enlght_line */
    const cmsg = (present, past, thing) => {
        let buf = ` You ${fin ? past : present}${thing}.`;
        if (buf.includes(' not '))
            buf = buf.split(' are not ').join(" aren't ")
                     .split(' have not ').join(" haven't ");
        put(buf);
    };
    const have_been = (g) => cmsg('have been ', 'were ', g);
    const have_never = (b) => cmsg('have never ', 'never ', b);
    const have_X = (x) => cmsg('have ', '', x);

    put('Voluntary challenges:');
    /* u.uroleplay.reroll is never enabled in a recorded rc; C phrases this
       one in past tense always */
    put(' Character rerolling was not enabled.');

    if (!c.food)
        cmsg('have gone ', 'went ', 'without food');
    else if (!c.unvegan)
        have_X('followed a strict vegan diet');
    else if (!c.unvegetarian)
        have_been('vegetarian');

    if (!c.gnostic)
        have_been('an atheist');

    if (!c.weaphit)
        have_never('hit with a wielded weapon');
    else if (game.wizard)
        have_X(`hit with a wielded weapon ${c.weaphit} time${
            c.weaphit === 1 ? '' : 's'}`);
    if (!c.killer)
        have_been('a pacifist');

    if (!c.literate)
        have_been('illiterate');
    else if (game.wizard)
        have_X(`read items or engraved ${c.literate} time${
            c.literate === 1 ? '' : 's'}`);

    if (!c.pets)
        have_never('had a pet');

    const ngenocided = num_genocides();
    if (ngenocided === 0) {
        have_never('genocided any monsters');
    } else {
        have_X(`genocided ${ngenocided} type${ngenocided === 1 ? '' : 's'
                } of monster${ngenocided === 1 ? '' : 's'}`);
    }

    if (!c.polypiles)
        have_never('polymorphed an object');
    else if (game.wizard)
        have_X(`polymorphed ${c.polypiles} item${
            c.polypiles === 1 ? '' : 's'}`);

    if (!c.polyselfs)
        have_never('changed form');
    else if (game.wizard)
        have_X(`changed form ${c.polyselfs} time${
            c.polyselfs === 1 ? '' : 's'}`);

    if (!c.wishes) {
        have_X('used no wishes');
    } else {
        let wishbuf = `used ${c.wishes} wish${c.wishes > 1 ? 'es' : ''}`;
        if (c.wisharti) {
            if (c.wisharti === c.wishes) {
                const qualifier = c.wisharti > 2 ? 'all '
                    : c.wisharti === 2 ? 'both ' : '';
                wishbuf += ` (${qualifier}for ${
                    c.wisharti === 1 ? 'an artifact' : 'artifacts'})`;
            } else {
                wishbuf += ` (${c.wisharti} for ${
                    c.wisharti === 1 ? 'an artifact' : 'artifacts'})`;
            }
        }
        have_X(wishbuf);
        if (!c.wisharti)
            cmsg('have not wished ', 'did not wish ', 'for any artifacts');
    }

    show_achievements_into(put, cmsg, have_X, fin);

    await tty_display_nhwindow(win);
    await xwaitforspace(' \r\n\x1b');
    while (tty_next_page(win))
        await xwaitforspace(' \r\n\x1b');
    tty_destroy_nhwindow(win);
    await docrt();
    return 0;
}


// src/insight.c:362 N_times()
function N_times(n) {
    switch (n) {
    case 0:
    default:
        return `${n} times`;
    case 1:
        return 'once';
    case 2:
        return 'twice';
    case 3:
        return 'thrice';
    }
}

// src/insight.c:2601 vanqorders[][3]; also used in options.c
export const vanqorders = [
    [ 't', 'traditional: by monster level',
           'traditional: by monster level, by internal monster index' ],
    [ 'd', 'by monster difficulty rating',
           'by monster difficulty rating, by internal monster index' ],
    [ 'a', 'alphabetically, unique monsters separate',
           'alphabetically, first unique monsters, then others' ],
    [ 'A', 'alphabetically, unique monsters intermixed',
           'alphabetically, unique monsters and others intermixed' ],
    [ 'C', 'by monster class, high to low level in class',
           'by monster class, high to low level within class' ],
    [ 'c', 'by monster class, low to high level in class',
           'by monster class, low to high level within class' ],
    [ 'n', 'by count, high to low',
           'by count, high to low, by internal index within tied count' ],
    [ 'z', 'by count, low to high',
           'by count, low to high, by internal index within tied count' ],
];

/* src/hacklib.c strcmpi(): caseblind byte comparison */
function strcmpi(a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    return a < b ? -1 : a > b ? 1 : 0;
}

// src/insight.c:2621 vanqsort_cmp(); qsort comparison routine for
// list_vanquished() and list_genocided()
function vanqsort_cmp(indx1, indx2) {
    let mlev1, mlev2, mstr1, mstr2, uniq1, uniq2, died1, died2, res;
    let name1, name2, punct;
    let mcls1, mcls2;
    const mons = game.mons;

    switch (game.flags.vanq_sortmode) {
    default:
    case VANQ_MLVL_MNDX:
        mlev1 = mons[indx1].mlevel;
        mlev2 = mons[indx2].mlevel;
        res = mlev2 - mlev1; /* mlevel high to low */
        break;
    case VANQ_MSTR_MNDX:
        mstr1 = mons[indx1].difficulty;
        mstr2 = mons[indx2].difficulty;
        res = mstr2 - mstr1; /* monstr high to low */
        break;
    case VANQ_ALPHA_SEP:
        uniq1 = ((mons[indx1].geno & G_UNIQ) && indx1 !== PMNAMES.PM_HIGH_CLERIC) ? 1 : 0;
        uniq2 = ((mons[indx2].geno & G_UNIQ) && indx2 !== PMNAMES.PM_HIGH_CLERIC) ? 1 : 0;
        if (uniq1 ^ uniq2) { /* one or other uniq, but not both */
            res = uniq2 - uniq1;
            break;
        } /* else both unique or neither unique */
        /* FALLTHROUGH */
    case VANQ_ALPHA_MIX:
        name1 = mons[indx1].pmnames[NEUTRAL];
        name2 = mons[indx2].pmnames[NEUTRAL];
        res = strcmpi(name1, name2); /* caseblind alpha, low to high */
        break;
    case VANQ_MCLS_HTOL:
    case VANQ_MCLS_LTOH:
        /* mons[].mlet values are small integers, not actual characters;
           if 'char' happens to be unsigned, (mlet1 - mlet2) would yield
           an inappropriate result when mlet2 is greater than mlet1,
           so force our copies (mcls1, mcls2) to be signed */
        mcls1 = mons[indx1].mlet;
        mcls2 = mons[indx2].mlet;
        /* S_ANT through S_ZRUTY correspond to lowercase monster classes,
           S_ANGEL through S_ZOMBIE correspond to uppercase, and various
           punctuation characters are used for classes beyond those */
        if (mcls1 > MONSYMS.S_ZOMBIE && mcls2 > MONSYMS.S_ZOMBIE) {
            /* force a specific order to the punctuation classes that's
               different from the internal order;
               internal order is ok if neither or just one is punctuation
               since letters have lower values so come out before punct */
            const punctclasses = [
                MONSYMS.S_LIZARD, MONSYMS.S_EEL, MONSYMS.S_GOLEM,
                MONSYMS.S_GHOST, MONSYMS.S_DEMON, MONSYMS.S_HUMAN,
            ];
            if ((punct = punctclasses.indexOf(mcls1)) >= 0)
                mcls1 = MONSYMS.S_ZOMBIE + 1 + punct;
            if ((punct = punctclasses.indexOf(mcls2)) >= 0)
                mcls2 = MONSYMS.S_ZOMBIE + 1 + punct;
        }
        res = mcls1 - mcls2; /* class */
        if (res === 0) {
            /* Riders and demons share S_DEMON so this test only matters
               above when both mcls1 and mcls2 are either Riders or demons or
               one of each; force Riders to be sorted before demons */
            res = (is_rider(mons[indx2]) ? 1 : 0) - (is_rider(mons[indx1]) ? 1 : 0);
            /* -1 => #1 is a Rider, #2 isn't;
                0 => both Riders or neither;
               +1 => #2 is a Rider, #1 isn't */
            if (res)
                break;
            mlev1 = mons[indx1].mlevel;
            mlev2 = mons[indx2].mlevel;
            res = mlev1 - mlev2; /* mlevel low to high */
            if (game.flags.vanq_sortmode === VANQ_MCLS_HTOL)
                res = -res; /* mlevel high to low */
        }
        break;
    case VANQ_COUNT_H_L:
    case VANQ_COUNT_L_H:
        died1 = game.mvitals[indx1].died | 0;
        died2 = game.mvitals[indx2].died | 0;
        res = died2 - died1; /* dead count high to low */
        if (game.flags.vanq_sortmode === VANQ_COUNT_L_H)
            res = -res; /* dead count low to high */
        break;
    }
    if (res === 0)
        res = indx1 - indx2; /* mndx low to high */
    return res;
}

// src/insight.c:2718 set_vanq_order(); returns -1 if cancelled via ESC,
// otherwise the new sort order
export async function set_vanq_order(for_vanq) {
    let desc;
    let n, choice;
    const clr = NO_COLOR;

    const tmpwin = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(tmpwin, MENU_BEHAVE_STANDARD);
    for (let i = 0; i < vanqorders.length; i++) {
        if (i === VANQ_ALPHA_MIX || i === VANQ_MCLS_HTOL) /* skip these */
            continue;
        if (!for_vanq && (i === VANQ_COUNT_H_L || i === VANQ_COUNT_L_H))
            continue;
        desc = vanqorders[i][2];
        /* the alphabetical choices, "alpha, unique separate"
           and "alpha, unique intermixed" are confusing descriptions when
           this menu is for #genocided rather than for #vanquished */
        if (!for_vanq && i === VANQ_ALPHA_SEP)
            desc = 'alphabetically';
        tty_add_menu(tmpwin, null, i + 1, vanqorders[i][0], 0,
                     ATR_NONE, clr, desc,
                     (i === game.flags.vanq_sortmode) ? MENU_ITEMFLAGS_SELECTED
                                                      : MENU_ITEMFLAGS_NONE);
    }
    const buf = `Sort order for ${
        for_vanq ? 'vanquished monster counts (also genocided types)'
                 : 'genocided monster types (also vanquished counts)'}`;
    tty_end_menu(tmpwin, buf);

    const selected = await tty_select_menu(tmpwin, PICK_ONE);
    n = selected.cancelled ? -1 : selected.length;
    tty_destroy_nhwindow(tmpwin);
    if (n > 0) {
        choice = selected[0] - 1;
        /* skip preselected entry if we have more than one item chosen */
        if (n > 1 && choice === game.flags.vanq_sortmode)
            choice = selected[1] - 1;
        game.flags.vanq_sortmode = choice;
    }
    return (n < 0) ? -1 : game.flags.vanq_sortmode;
}

// src/insight.c:2769 dovanquished(); #vanquished command
export async function dovanquished() {
    await list_vanquished(game.iflags?.menu_requested ? 'A' : 'y', false);
    (game.iflags ||= {}).menu_requested = false;
    return ECMD_OK;
}

// src/insight.c:2777 UniqCritterIndx()
const UniqCritterIndx = (mndx) =>
    (game.mons[mndx].geno & G_UNIQ) !== 0 && mndx !== PMNAMES.PM_HIGH_CLERIC;

// win/tty/wintty.c display_nhwindow(klwin, TRUE) for an NHW_MENU window
async function display_menu_window_blocking(win) {
    await tty_display_nhwindow(win);
    await xwaitforspace(' \r\n\x1b');
    while (tty_next_page(win))
        await xwaitforspace(' \r\n\x1b');
}

// src/insight.c:2784 list_vanquished() — the #vanquished window; default
// sort is by monster level high-to-low with index tiebreak (VANQ_MLVL_MNDX).
export async function list_vanquished(defquery, ask) {
    let i;
    let pfx, nkilled;
    let ntypes, ni;
    let total_killed = 0;
    let klwin;
    const mindx = [];
    let c, buf, buftoo;
    /* 'd' is for dumplog; 'A' is for forced sort order choice */
    const force_sort = (defquery === 'A'),
          dumping = (defquery === 'd');
    const mons = game.mons;

    /* if player asked for vanquished monsters, allow choice of sort order if
       it contains at least two entries; however, if player has used explicit
       'm #vanquished', choose order no matter what it contains so far */
    if (force_sort) { /* iflags.menu_requested via dovanquished() */
        /* choose value for vanq_sortmode; cancelling the menu leaves it
           unchanged but continues with vanquished monsters display */
        await set_vanq_order(true);
    }
    if (dumping || force_sort) {
        /* explicit 'y' for the main loop; 'a' would be superfluous for the
           cases that might supply 'A' or 'd' */
        defquery = 'y';
        ask = false; /* redundant */
    }

    /* count the number of different types of monsters killed */
    ntypes = 0;
    for (i = LOW_PM; i < NUMMONS; i++) {
        if ((nkilled = (game.mvitals[i]?.died | 0)) === 0)
            continue;
        mindx[ntypes++] = i;
        total_killed += nkilled;
    }

    if (ntypes !== 0) {
        let mlet, prev_mlet = 0; /* used as small integer, not character */
        let class_header, uniq_header, Rider,
            was_uniq = false, special_hdr = false;

        if (ask) {
            let allow_yn;

            if (ntypes > 1) {
                allow_yn = 'ynaq';
            } else {
                allow_yn = 'ynq';   /* don't include 'a', but */
                allow_yn += '\x1ba'; /* allow user to answer 'a' */
                if (defquery === 'a') /* potential default from 'disclose' */
                    defquery = 'y';
            }
            c = await tty_yn_function('Do you want an account of creatures vanquished?',
                                      allow_yn, defquery, true);
        } else {
            c = defquery;
        }
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
        if (c === 'y' || c === 'a') {
            if (c === 'a' && ntypes > 1) { /* ask user to choose sort order */
                /* if choosing order is cancelled, this skips displaying list
                   of vanquished monsters but does not set 'done_stopprint' */
                if (await set_vanq_order(true) < 0)
                    return;
            }
            uniq_header = (game.flags.vanq_sortmode === VANQ_ALPHA_SEP);
            class_header = ((game.flags.vanq_sortmode === VANQ_MCLS_LTOH
                             || game.flags.vanq_sortmode === VANQ_MCLS_HTOL)
                            && ntypes > 1);

            klwin = tty_create_nhwindow(NHW_MENU);
            tty_putstr(klwin, 0, 'Vanquished creatures:');
            if (!dumping)
                tty_putstr(klwin, 0, '');

            mindx.sort(vanqsort_cmp);
            for (ni = 0; ni < ntypes; ni++) {
                i = mindx[ni];
                nkilled = game.mvitals[i].died | 0;
                Rider = is_rider(mons[i]);
                mlet = mons[i].mlet;
                if (class_header
                    && (mlet !== prev_mlet || (special_hdr && !Rider))) {
                    if (!Rider) {
                        buf = monexplain[mlet];
                        special_hdr = false;
                    } else {
                        buf = 'Rider';
                        special_hdr = true;
                    }
                    /* when 'ask' is True, the attribute (highlighting)
                       of various header lines is suppressed */
                    tty_putstr(klwin, ask ? ATR_NONE
                                          : (game.iflags?.menu_headings?.attr
                                             ?? ATR_INVERSE),
                               upstart(buf));
                    prev_mlet = mlet;
                }
                if (UniqCritterIndx(i)) {
                    buf = `${!type_is_pname(mons[i]) ? 'the ' : ''}${
                        mons[i].pmnames[NEUTRAL]}`;
                    if (nkilled > 1)
                        buf += ` (${N_times(nkilled)})`;
                    was_uniq = true;
                } else {
                    if (uniq_header && was_uniq) {
                        tty_putstr(klwin, 0, '');
                        was_uniq = false;
                    }
                    /* trolls or undead might have come back,
                       but we don't keep track of that */
                    if (nkilled === 1)
                        buf = an(mons[i].pmnames[NEUTRAL]);
                    else
                        buf = `${String(nkilled).padStart(3)} ${
                            makeplural(mons[i].pmnames[NEUTRAL])}`;
                }
                /* number of leading spaces to match 3 digit prefix */
                pfx = buf.slice(0, 4).toLowerCase() === 'the ' ? 0
                      : buf.slice(0, 3).toLowerCase() === 'an ' ? 1
                        : buf.slice(0, 2).toLowerCase() === 'a ' ? 2
                          : !/[0-9]/.test(buf[2] ?? '') ? 4 : 0;
                if (class_header)
                    ++pfx;
                buftoo = `${' '.repeat(pfx)}${buf}`;
                tty_putstr(klwin, 0, buftoo);
            }
            if (ntypes > 1) {
                if (!dumping)
                    tty_putstr(klwin, 0, '');
                buf = `${total_killed} creatures vanquished.`;
                tty_putstr(klwin, 0, buf);
            }
            await display_menu_window_blocking(klwin);
            tty_destroy_nhwindow(klwin);
            await docrt();
        }
    } else if (!game.program_state_gameover) {
        await pline('No creatures have been vanquished.');
    } else if (dumping) {
        /* DUMPLOG: putstr(0, 0, "No creatures were vanquished."); not pline() */
        tty_putstr(0, 0, 'No creatures were vanquished.');
    }
}

// src/insight.c:2953 num_genocides(); number of monster species which have
// been genocided
export function num_genocides() {
    let n = 0;

    for (let i = LOW_PM; i < NUMMONS; ++i) {
        if (game.mvitals[i]?.mvflags & G_GENOD) {
            ++n;
            /* if (UniqCritterIndx(i))
                   impossible("unique creature '%d: %s' genocided?", ...) */
        }
    }
    return n;
}

// src/insight.c:2970 num_extinct()
function num_extinct() {
    let n = 0;

    for (let i = LOW_PM; i < NUMMONS; ++i) {
        if (UniqCritterIndx(i))
            continue;
        if (((game.mvitals[i]?.mvflags | 0) & G_GONE) === G_EXTINCT)
            ++n;
    }
    return n;
}

// src/insight.c:2985 num_gone(); fills mindx[] with the genocided and/or
// extinct species
function num_gone(mvflags, mindx) {
    const mflg = mvflags & 0xff;
    let n = 0;

    mindx.length = 0;
    for (let i = LOW_PM; i < NUMMONS; ++i) {
        /* uniques can't be genocided but can become extinct;
           however, they're never reported as extinct, so skip them */
        if (UniqCritterIndx(i))
            continue;
        if (((game.mvitals[i]?.mvflags | 0) & mflg) !== 0)
            mindx[n++] = i;
    }
    return n;
}

// src/insight.c:3007 list_genocided(); list of genocided and extinct species
export async function list_genocided(defquery, ask) {
    let i, mndx;
    let ngenocided, nextinct, ngone, mvflags;
    const mindx = [];
    let c;
    let klwin;
    let buf;
    let genoing, /* prompting for genocide or class genocide */
        dumping; /* for DUMPLOG; doesn't need to be conditional */
    let both = (game.program_state_gameover || game.wizard || game.discover);
    const mons = game.mons;

    dumping = (defquery === 'd');
    genoing = (defquery === 'g');
    if (dumping || genoing)
        defquery = 'y';
    if (genoing)
        both = false; /* genocides only, not extinctions */

    /* count the number of extinct and genocided species; performing both
       counts before counting the number of genocided species will only
       happen rarely and is simpler than a more general single pass check;
       extinctions are only revealed during end of game disclosure or when
       running in wizard or explore mode */
    ngenocided = num_genocides();
    nextinct = both ? num_extinct() : 0;
    mvflags = G_GENOD | (both ? G_EXTINCT : 0);
    ngone = num_gone(mvflags, mindx);

    /* genocided or extinct species list */
    if (ngone > 0) {
        buf = `Do you want a list of ${
            (nextinct && !ngenocided) ? 'extinct ' : ''}species${
            (ngenocided) ? ' genocided' : ''}${
            (nextinct && ngenocided) ? ' and extinct' : ''}?`;
        c = ask ? await tty_yn_function(buf, (ngone > 1) ? 'ynaq' : 'ynq\x1ba',
                                        defquery, true)
                : defquery;
        if (c === 'q')
            game.done_stopprint = (game.done_stopprint | 0) + 1;
        if (c === 'y' || c === 'a') {
            let save_sortmode;
            let mlet, prev_mlet = 0;
            let class_header = false;

            if (ngone > 1) {
                if (c === 'a') { /* ask player to choose sort order */
                    if (await set_vanq_order(false) < 0)
                        return;
                }
                /* sorting by count high to low or low to high
                   don't make sense for genocides; if the preferred order
                   to set to either of those, use alphabetical instead;
                   note: the tie breaker for by-class is level-high-to-low
                   or level-low-to-high rather than count so is ok as-is */
                save_sortmode = game.flags.vanq_sortmode;
                if (game.flags.vanq_sortmode === VANQ_COUNT_H_L
                    || game.flags.vanq_sortmode === VANQ_COUNT_L_H)
                    game.flags.vanq_sortmode = VANQ_ALPHA_MIX;
                mindx.sort(vanqsort_cmp);
                class_header = (game.flags.vanq_sortmode === VANQ_MCLS_LTOH
                                || game.flags.vanq_sortmode === VANQ_MCLS_HTOL);
                game.flags.vanq_sortmode = save_sortmode;
            }

            klwin = tty_create_nhwindow(NHW_MENU);
            buf = `${(ngenocided) ? 'Genocided' : 'Extinct'}${
                (nextinct && ngenocided) ? ' or extinct' : ''} species:`;
            tty_putstr(klwin, 0, buf);
            if (!dumping)
                tty_putstr(klwin, 0, '');

            for (i = 0; i < ngone; ++i) {
                mndx = mindx[i];
                mlet = mons[mndx].mlet;
                if (class_header && mlet !== prev_mlet) {
                    buf = monexplain[mlet];
                    /* when 'ask' is True, the attribute (highlighting)
                       of various header lines is suppressed */
                    tty_putstr(klwin, ask ? ATR_NONE
                                          : (game.iflags?.menu_headings?.attr
                                             ?? ATR_INVERSE),
                               upstart(buf));
                    prev_mlet = mlet;
                }
                buf = ` ${makeplural(mons[mndx].pmnames[NEUTRAL])}`;
                if (((game.mvitals[mndx]?.mvflags | 0) & G_GONE) === G_EXTINCT)
                    buf += ' (extinct)';
                tty_putstr(klwin, 0, buf);
            }
            if (!dumping)
                tty_putstr(klwin, 0, '');
            if (ngenocided > 0) {
                buf = `${ngenocided} species genocided.`;
                tty_putstr(klwin, 0, buf);
            }
            if (nextinct > 0) {
                buf = `${nextinct} species extinct.`;
                tty_putstr(klwin, 0, buf);
            }

            await display_menu_window_blocking(klwin);
            tty_destroy_nhwindow(klwin);
            await docrt();
        }
    } else if (!game.program_state_gameover) {
        /* #genocided or #polyself prompt; if 'both', the (unlikely)
           extinction has been ignored */
        await pline(`No creatures have been genocided${genoing ? ' yet' : ''}.`);
    } else if (dumping) { /* 'gameover' is True if we make it here */
        tty_putstr(0, 0, 'No species were genocided or became extinct.');
    }
}

// src/insight.c:3138 dogenocided(); #genocided command
export async function dogenocided() {
    await list_genocided(game.iflags?.menu_requested ? 'a' : 'y', false);
    return ECMD_OK;
}
