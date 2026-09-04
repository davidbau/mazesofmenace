// apply.js — Apply / use tool command.
// C ref: apply.c doapply / apply_ok (LOCK_PICK / key / STETHOSCOPE body).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import {
    flush_screen, flush_topl_more, pline, pline_mon, canseemon, canspotmon, newsym,
    map_invisible, unmap_invisible, glyph_is_invisible, You_feel, sensemon,
    verbalize, mon_visible, tp_sensemon, see_with_infrared, tmp_at,
    set_msg_xy,
} from './display.js';
import { cansee, couldsee, howmonseen } from './vision.js';
import {
    TOOL_CLASS, WAND_CLASS, SPBOOK_CLASS, WEAPON_CLASS, POTION_CLASS,
    COIN_CLASS, GEM_CLASS, FOOD_CLASS, RING_CLASS, RANDOM_CLASS,
    objectNames, objectNameStrs, objectDescrs, is_axe,
} from './objects.js';
import {
    P_AXE, P_PICK_AXE, P_POLEARMS, P_LANCE, P_NONE, P_BASIC, P_SKILLED,
    P_TWO_WEAPON_COMBAT, NEED_WEAPON,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, ECMD_FAIL, nothing_happens, nothing_seems_to_happen,
    FACE, FOOT, FINGER, TIMEOUT, BLINDED, SICK, HALLUC, VOMITING, CONFUSION,
    STUNNED, DEAF, STRANGLED, SICK_NONVOMITABLE, SICK_ALL,
    OBJ_FREE, OBJ_INVENT, OBJ_FLOOR, isok, SDOOR, SCORR,
    COLNO, ROWNO, DOOR, D_CLOSED, D_LOCKED, D_ISOPEN, ZAP_POS, MAXULEV, WEAK,
    M_AP_TYPE, M_AP_OBJECT, M_AP_FURNITURE, M_AP_MONSTER, M_AP_NOTHING,
    ACCESSIBLE, IS_STWALL, IS_DOOR, IS_FURNITURE, IS_OBSTRUCTED, IS_WATERWALL,
    IS_AIR, AIR, CLOUD,
    TELEDS_NO_FLAGS, TELEDS_ALLOW_DRAG, INTRINSIC, STONE, LAVAWALL, TT_PIT,
    EXT_ENCUMBER, COST_DSTROY, COST_DEGRD, HEAD, HAND, NOSE, NON_PM,
    KILLED_BY, NO_KILLER_PREFIX, W_WEP, STATUE_TRAP,
    EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY, PARANOID_BREAKWAND,
    RLOC_NOMSG, RLOC_MSG, RLOC_NONE, XKILL_NOMSG, ARTICLE_NONE,
    SUPPRESS_SADDLE, has_mgivenname, has_mcorpsenm, MCORPSENM,
    PLNMSG_enum, NO_TRAP_FLAGS, Is_airlevel, Is_waterlevel,
    LANDMINE, BEAR_TRAP, FORCEBUNGLE, SHOPBASE, P_RIDING, NO_MM_FLAGS,
    MAX_SPELL_STUDY, HOMEMADE_TIN, G_GONE, NO_MINVENT, MM_NOMSG, TT_BURIEDBALL,
    IS_TREE, W_NONPASSWALL, FIG_TRANSFORM, TIMER_OBJECT, OBJ_MINVENT,
    EXACT_NAME, DISP_BEAM, DISP_END, HI_ZAP,
    MONSEEN_NORMAL, MONSEEN_SEEINVIS, MONSEEN_INFRAVIS,
    GETOBJ_PROMPT, GETOBJ_EXCLUDE as GETOBJ_EXCLUDE_C,
} from './const.js';
import { pick_lock, getdir } from './lock.js';
import { ustatusline, mstatusline } from './insight.js';
import {
    m_at, dist2, seemimic, see_monster_closeup, find_mid, mnexto, wake_nearby,
    wakeup, wake_nearto,
} from './mon.js';
import {
    compactify_invlets, makeknown, near_capacity, observe_object, prinv,
    hold_another_object, consume_obj_charge, update_inventory, getobj,
    getobj_from_cmdq, getobj_record_repeat, getobj_display_pickinv, useupall,
    useup, useupf,
} from './invent.js';
import { rn2, rn1, rnd, d, rnl, shuffle_int_array } from './rng.js';
import {
    nohands, haseyes, humanoid, is_demon, is_vampire, is_vampshifter,
    likes_gems, M1_SEE_INVIS, monsterNames, mons, throws_rocks, passes_walls,
    unsolid, nolimbs, has_head, breathless, is_floater, is_flyer, amorphous,
    hides_under, MZ_SMALL, M1_SLITHY,
    PM_ARCHEOLOGIST, PM_GNOME, bigmonst, verysmall, strongmonst,
    touch_petrifies, poly_when_stoned, is_rider,
} from './monsters.js';
import { can_blow, little_to_big, big_to_little, hero_conflict } from './mondata.js';
import { wield_tool, welded, is_pole, mwelded } from './wield.js';
import {
    splitobj, delobj, objects_at, unbless, attach_egg_hatch_timeout, kill_egg,
    obj_extract_self, place_object, stackobj, weight, mksobj, stop_timer,
    start_timer, hornoplenty,
} from './mkobj.js';
import { xname, the, The, makeplural, vtense, doname, an, singular, cxname, thesimpleoname, simpleonames, yname, shk_your, Tobjnam, gloves_simple_name } from './objnam.js';
import { obj_resists } from './dogmove.js';
import { acurr, A_CHA, A_STR, A_DEX, A_CON, change_luck, Fumbling } from './attrib.js';
import { Monnam, mon_nam, x_monnam, y_monnam, Hallucination, a_monnam, Amonnam, monverbself, l_monnam } from './do_name.js';
import { monflee } from './monmove.js';
import { nomul, confdir, losehp, maybe_half_phys, is_pool, is_lava, overexertion, in_rooms } from './hack.js';
import { getpos, getpos_sethilite } from './getpos.js';
import { walk_path, thitmonst, hurtle } from './dothrow.js';
import { uhim, uhis } from './roles.js';
import { is_art } from './artifact.js';
import { ART_SNICKERSNEE } from './generated/artifacts_data.js';
import { P_SKILL, weapon_type, dbon, MON_WEP, is_wet_towel, dry_a_towel, hands_obj, possibly_unwield, setmnotwielded } from './weapon.js';
import { pickup_object, spoteffects } from './pickup.js';
import { select_menu_pick_one } from './options.js';
import { teleds, tele_to_rnd_pet, noteleport_level, enexto, rloc_to } from './teleport.js';
import {
    morehungry, use_tin_opener, floorfood, set_tin_variety,
    carried, vomit,
} from './eat.js';
import { yn_function, paranoid_query } from './getline.js';
import {
    costly_alteration, costly_spot, add_damage, bill_dummy_object, shop_keeper,
    check_unpaid_usage,
} from './shk.js';
import { zappable, release_hold, revive } from './zap.js';
import { explode } from './explode.js';
import {
    flash_hits_mon, xkilled, attack_checks, check_caitiff,
    force_attack, stumble_onto_mimic,
} from './uhitm.js';
import { digests, set_ustuck } from './mhitu.js';
import { growl, yelp, whimper, mon_msound } from './sounds.js';
import { vault_summon_gd } from './vault.js';
import { fill_pit, buried_ball_to_freedom } from './dig.js';
import {
    mintrap, Trap_Killed_Mon, reset_utrap, instapetrify, t_at,
    activate_statue_trap, maketrap, feeltrap, dotrap, trapname,
} from './trap.js';
import { begin_burn, end_burn, Is_candle, obj_merge_light_sources,
    get_obj_location } from './timeout.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
import { set_occupation, u_wipe_engr } from './engrave.js';
import { makemon, mkclass } from './makemon.js';
import { make_familiar } from './dog.js';
import { addinv } from './u_init.js';
import { stairway_at, morguemon } from './mklev.js';
import {
    make_glib, Glib, make_sick, make_confused, make_stunned, make_vomiting,
    make_hallucinated, make_deaf, djinni_from_bottle,
} from './potion.js';
import { Blindf_on, Blindf_off, cursed_check } from './do_wear.js';
import {
    dropx, setnotworn, fire_damage, make_blinded, revive_corpse,
} from './do.js';
import { polymon, mbodypart, body_part } from './polyself.js';
import { unpunish } from './read.js';
import { findit, openit } from './detect.js';
import { level_difficulty } from './hacklib.js';
import { mon_adjust_speed } from './muse.js';

const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');
const STETHOSCOPE = objectNames.indexOf('STETHOSCOPE');
const MIRROR = objectNames.indexOf('MIRROR');
const EXPENSIVE_CAMERA = objectNames.indexOf('EXPENSIVE_CAMERA');
const BULLWHIP = objectNames.indexOf('BULLWHIP');
const GRAPPLING_HOOK = objectNames.indexOf('GRAPPLING_HOOK');
const CORPSE = objectNames.indexOf('CORPSE');
const STATUE = objectNames.indexOf('STATUE');
const CRYSKNIFE = objectNames.indexOf('CRYSKNIFE');
const WORM_TOOTH = objectNames.indexOf('WORM_TOOTH');
const POT_OIL = objectNames.indexOf('POT_OIL');
const CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const EUCALYPTUS_LEAF = objectNames.indexOf('EUCALYPTUS_LEAF');
const LUMP_OF_ROYAL_JELLY = objectNames.indexOf('LUMP_OF_ROYAL_JELLY');
const EGG = objectNames.indexOf('EGG');
const BANANA = objectNames.indexOf('BANANA');
const PM_KILLER_BEE = monsterNames.indexOf('PM_KILLER_BEE');
const PM_QUEEN_BEE = monsterNames.indexOf('PM_QUEEN_BEE');
const PM_HORSE = monsterNames.indexOf('PM_HORSE');
const PM_STONE_GOLEM = monsterNames.indexOf('PM_STONE_GOLEM');
const PM_WOOD_NYMPH = monsterNames.indexOf('PM_WOOD_NYMPH');
const PM_WATER_NYMPH = monsterNames.indexOf('PM_WATER_NYMPH');
const PM_MOUNTAIN_NYMPH = monsterNames.indexOf('PM_MOUNTAIN_NYMPH');
const TOUCHSTONE = objectNames.indexOf('TOUCHSTONE');
const LUCKSTONE = objectNames.indexOf('LUCKSTONE');
const LOADSTONE = objectNames.indexOf('LOADSTONE');
const FLINT = objectNames.indexOf('FLINT');
const RUBBER_HOSE = objectNames.indexOf('RUBBER_HOSE');
const SACK = objectNames.indexOf('SACK');
/* C objclass.h enum obj_material_types — use_stone material switch */
const MAT_LIQUID = 1;
const MAT_WAX = 2;
const MAT_CLOTH = 6;
const MAT_LEATHER = 7;
const MAT_WOOD = 8;
const MAT_SILVER = 14;
const MAT_GOLD = 15;
const MAT_GLASS = 19;
const MAT_GEMSTONE = 20;
const MAT_MINERAL = 21;
/** C decl.c c_obj_colors[] — streak color for use_stone. */
const C_OBJ_COLORS = [
    'black', 'red', 'green', 'brown', 'blue', 'magenta', 'cyan', 'gray',
    'transparent', 'orange', 'bright green', 'yellow', 'bright blue',
    'bright magenta', 'bright cyan', 'white',
];
const OILSKIN_SACK = objectNames.indexOf('OILSKIN_SACK');
const BAG_OF_HOLDING = objectNames.indexOf('BAG_OF_HOLDING');
const BAG_OF_TRICKS = objectNames.indexOf('BAG_OF_TRICKS');
const CAN_OF_GREASE = objectNames.indexOf('CAN_OF_GREASE');
const TINNING_KIT = objectNames.indexOf('TINNING_KIT');
const BELL = objectNames.indexOf('BELL');
const BELL_OF_OPENING = objectNames.indexOf('BELL_OF_OPENING');
const FIGURINE = objectNames.indexOf('FIGURINE');
const UNICORN_HORN = objectNames.indexOf('UNICORN_HORN');
const HORN_OF_PLENTY = objectNames.indexOf('HORN_OF_PLENTY');
const TIN = objectNames.indexOf('TIN');
const SLIME_MOLD = objectNames.indexOf('SLIME_MOLD');
const LARGE_BOX = objectNames.indexOf('LARGE_BOX');
const CHEST = objectNames.indexOf('CHEST');
const ICE_BOX = objectNames.indexOf('ICE_BOX');
const WOODEN_FLUTE = objectNames.indexOf('WOODEN_FLUTE');
const MAGIC_FLUTE = objectNames.indexOf('MAGIC_FLUTE');
const TOOLED_HORN = objectNames.indexOf('TOOLED_HORN');
const FROST_HORN = objectNames.indexOf('FROST_HORN');
const FIRE_HORN = objectNames.indexOf('FIRE_HORN');
const WOODEN_HARP = objectNames.indexOf('WOODEN_HARP');
const MAGIC_HARP = objectNames.indexOf('MAGIC_HARP');
const BUGLE = objectNames.indexOf('BUGLE');
const LEATHER_DRUM = objectNames.indexOf('LEATHER_DRUM');
const DRUM_OF_EARTHQUAKE = objectNames.indexOf('DRUM_OF_EARTHQUAKE');
const OIL_LAMP = objectNames.indexOf('OIL_LAMP');
const MAGIC_LAMP = objectNames.indexOf('MAGIC_LAMP');
const BRASS_LANTERN = objectNames.indexOf('BRASS_LANTERN');
const LAND_MINE = objectNames.indexOf('LAND_MINE');
const BEARTRAP = objectNames.indexOf('BEARTRAP');
const CANDELABRUM_OF_INVOCATION =
    objectNames.indexOf('CANDELABRUM_OF_INVOCATION');
const WAX_CANDLE = objectNames.indexOf('WAX_CANDLE');
const TALLOW_CANDLE = objectNames.indexOf('TALLOW_CANDLE');
const BLINDFOLD = objectNames.indexOf('BLINDFOLD');
const LENSES = objectNames.indexOf('LENSES');
const TIN_OPENER = objectNames.indexOf('TIN_OPENER');
const MAGIC_MARKER = objectNames.indexOf('MAGIC_MARKER');
const LEASH = objectNames.indexOf('LEASH');
const SADDLE = objectNames.indexOf('SADDLE');
const TIN_WHISTLE = objectNames.indexOf('TIN_WHISTLE');
const MAGIC_WHISTLE = objectNames.indexOf('MAGIC_WHISTLE');
const TOWEL = objectNames.indexOf('TOWEL');
const CRYSTAL_BALL = objectNames.indexOf('CRYSTAL_BALL');
const SPE_BLANK_PAPER = objectNames.indexOf('SPE_BLANK_PAPER');
const SPE_NOVEL = objectNames.indexOf('SPE_NOVEL');
const SPE_BOOK_OF_THE_DEAD = objectNames.indexOf('SPE_BOOK_OF_THE_DEAD');
const AMULET_OF_YENDOR = objectNames.indexOf('AMULET_OF_YENDOR');
const WAN_OPENING = objectNames.indexOf('WAN_OPENING');
const WAN_WISHING = objectNames.indexOf('WAN_WISHING');
const WAN_NOTHING = objectNames.indexOf('WAN_NOTHING');
const WAN_LOCKING = objectNames.indexOf('WAN_LOCKING');
const WAN_PROBING = objectNames.indexOf('WAN_PROBING');
const WAN_ENLIGHTENMENT = objectNames.indexOf('WAN_ENLIGHTENMENT');
const WAN_SECRET_DOOR_DETECTION =
    objectNames.indexOf('WAN_SECRET_DOOR_DETECTION');
const WAN_STASIS = objectNames.indexOf('WAN_STASIS');
const WAN_DEATH = objectNames.indexOf('WAN_DEATH');
const WAN_LIGHTNING = objectNames.indexOf('WAN_LIGHTNING');
const WAN_FIRE = objectNames.indexOf('WAN_FIRE');
const WAN_COLD = objectNames.indexOf('WAN_COLD');
const WAN_MAGIC_MISSILE = objectNames.indexOf('WAN_MAGIC_MISSILE');
const WAN_DIGGING = objectNames.indexOf('WAN_DIGGING');
const WAN_CREATE_MONSTER = objectNames.indexOf('WAN_CREATE_MONSTER');
const WAN_LIGHT = objectNames.indexOf('WAN_LIGHT');
const WAN_STRIKING = objectNames.indexOf('WAN_STRIKING');
const WAN_CANCELLATION = objectNames.indexOf('WAN_CANCELLATION');
const WAN_POLYMORPH = objectNames.indexOf('WAN_POLYMORPH');
const WAN_TELEPORTATION = objectNames.indexOf('WAN_TELEPORTATION');
const WAN_UNDEAD_TURNING = objectNames.indexOf('WAN_UNDEAD_TURNING');

const NOTHING_ELSE_HAPPENS = 'But nothing else happens...';

const PM_FLOATING_EYE = monsterNames.indexOf('PM_FLOATING_EYE');
const PM_UMBER_HULK = monsterNames.indexOf('PM_UMBER_HULK');
const PM_MEDUSA = monsterNames.indexOf('PM_MEDUSA');
const PM_AMOROUS_DEMON = monsterNames.indexOf('PM_AMOROUS_DEMON');
const PM_LONG_WORM = monsterNames.indexOf('PM_LONG_WORM');
/** C apply.c MAXLEASHED. */
const MAXLEASHED = 2;
/** C monflag.h MS_SILENT. */
const MS_SILENT = 0;
/** C apply.c use_mirror SEENMON — NORMAL|SEEINVIS|INFRAVIS. */
const SEENMON = MONSEEN_NORMAL | MONSEEN_SEEINVIS | MONSEEN_INFRAVIS;

/** C invent getobj callback ranks (hack.h getobj_callback_returns). */
const GETOBJ_EXCLUDE = -3;
const GETOBJ_EXCLUDE_SELECTABLE = 0;
const GETOBJ_DOWNPLAY = 1;
const GETOBJ_SUGGEST = 2;
const GETOBJ_EXCLUDE_INACCESS = -1;

/** C ref: obj.h is_pick — WEAPON/TOOL with P_PICK_AXE skill. */
function is_pick(obj) {
    if (!obj) return false;
    if (obj.oclass !== WEAPON_CLASS && obj.oclass !== TOOL_CLASS) return false;
    return (game.objects?.[obj.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/**
 * C ref: obj.h is_graystone.
 */
function is_graystone(obj) {
    if (!obj) return false;
    const o = obj.otyp;
    return o === LUCKSTONE || o === LOADSTONE || o === FLINT || o === TOUCHSTONE;
}

/**
 * C ref: apply.c apply_ok — SUGGEST tools/wands/spellbooks + applicable
 * weapons/oil/food/graystones; DOWNPLAY coins/unknown potions/hallu banana;
 * EXCLUDE_SELECTABLE for known non-touchstone graystones and unapplicable.
 * Snickersnee is included via obj.h is_pole (wield.js).
 */
function apply_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;

    if (obj.oclass === TOOL_CLASS || obj.oclass === WAND_CLASS
        || obj.oclass === SPBOOK_CLASS) {
        return GETOBJ_SUGGEST;
    }

    if (obj.oclass === COIN_CLASS) return GETOBJ_DOWNPLAY;

    if (obj.oclass === WEAPON_CLASS
        && (is_pick(obj) || is_axe(obj) || is_pole(obj)
            || obj.otyp === BULLWHIP)) {
        return GETOBJ_SUGGEST;
    }

    if (obj.oclass === POTION_CLASS) {
        const oc = game.objects?.[obj.otyp];
        if (!obj.dknown || !oc?.oc_name_known) return GETOBJ_DOWNPLAY;
        if (obj.otyp === POT_OIL) return GETOBJ_SUGGEST;
    }

    if (obj.otyp === CREAM_PIE || obj.otyp === EUCALYPTUS_LEAF
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return GETOBJ_SUGGEST;
    }

    if (obj.otyp === BANANA && game.u?.Hallucination) return GETOBJ_DOWNPLAY;

    if (is_graystone(obj)) {
        if (!obj.dknown) return GETOBJ_SUGGEST;
        const touchKnown = !!game.objects?.[TOUCHSTONE]?.oc_name_known;
        const selfKnown = !!game.objects?.[obj.otyp]?.oc_name_known;
        if (obj.otyp !== TOUCHSTONE && (touchKnown || selfKnown)) {
            return GETOBJ_EXCLUDE_SELECTABLE;
        }
        return GETOBJ_SUGGEST;
    }

    return GETOBJ_EXCLUDE_SELECTABLE;
}

/** Invent-order SUGGEST letters only (C getobj; DOWNPLAY stays off prompt). */
function apply_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && apply_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    return lets.join('');
}

/** C invent.c getobj: if (suggested > 5) compactify(bp) for prompt only. */
function apply_prompt_lets(raw) {
    if (!raw || raw.length <= 5) return raw;
    return compactify_invlets(raw);
}

/** True when invent has DOWNPLAY (forces prompt even if SUGGEST empty). */
function apply_has_downplay() {
    for (const o of game.invent || []) {
        if (apply_ok(o) === GETOBJ_DOWNPLAY) return true;
    }
    return false;
}

/**
 * C ref: invent.c getobj("use or apply", apply_ok) — loop on missing letter;
 * flush_topl_more before re-prompt so "don't have" gets --More--.
 * Empty SUGGEST with no DOWNPLAY/hands → early "don't have anything"
 * (C suggested==0 && !forceprompt && !allownone); do not prompt [*].
 * Canned CMDQ_KEY live; CMDQ_INT aborts (!ALLOWCNT).
 */
async function getobj_apply() {
    const cq = getobj_from_cmdq(apply_ok, false);
    if (!cq.skip) return cq.otmp;

    const lets0 = apply_lets();
    // C: apply_ok(NULL) is GETOBJ_EXCLUDE — no hands; DOWNPLAY sets forceprompt.
    if (!lets0 && !apply_has_downplay()) {
        await pline("You don't have anything to use or apply.");
        return null;
    }

    for (;;) {
        await flush_topl_more();
        const rawLets = apply_lets();
        if (!rawLets && !apply_has_downplay()) {
            await pline("You don't have anything to use or apply.");
            return null;
        }
        // C: Strcpy(lets, bp); if (suggested > 5) compactify(bp); prompt uses bp
        const lets = apply_prompt_lets(rawLets);
        const query = lets
            ? `What do you want to use or apply? [${lets} or ?*]`
            : 'What do you want to use or apply? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // C: display_pickinv uses non-compacted lets[]; redo_menu D-1578
            const counted = { cnt: 0, cntgiven: false };
            const ilet = await getobj_display_pickinv(
                ch, rawLets, false, counted,
                { word: 'use or apply', allownone: false, promptHasHands: false },
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) {
                if (game.iflags?.force_invmenu) return null;
                continue; // Space/Return → re-prompt getobj
            }
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            const rank = apply_ok(picked);
            if (rank === GETOBJ_EXCLUDE) {
                await pline('That is a silly thing to apply.');
                return null;
            }
            game._pending_message = '';
            getobj_record_repeat(picked, ilet);
            return picked;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        const rank = apply_ok(otmp);
        if (rank === GETOBJ_EXCLUDE) {
            await pline('That is a silly thing to apply.');
            return null;
        }
        // SUGGEST / DOWNPLAY / EXCLUDE_SELECTABLE → return; doapply default
        // prints "Sorry…" for EXCLUDE_SELECTABLE otyps.
        game._pending_message = '';
        getobj_record_repeat(otmp, ch);
        return otmp;
    }
}

/**
 * C ref: apply.c use_stethoscope — one free use per hero_seq; '.' → ustatusline.
 * Adjacent: isok / m_at (mundetected + mappearance seemimic + mstatusline) /
 * empty → "hear nothing special", return res (D-0735 / D-0738).
 * Deferred: swallow/steed/dz/cursed heartbeat rn2(2), confdir,
 * Deaf/nohands/freehand gates, SDOOR/SCORR hollow reveal, its_dead,
 * slime-mold fruit names, full defsyms furniture explanations,
 * mstatusline ailment/wizard-tame arms.
 * @returns {number} 1 = ECMD_TIME, 0 = ECMD_OK, -1 = ECMD_CANCEL
 */
async function use_stethoscope(_obj) {
    if (!(await getdir(null))) return -1; // ECMD_CANCEL

    // C: first use this hero_seq is free; another use costs the turn
    if (!game.context) game.context = {};
    if (game.hero_seq == null) game.hero_seq = ((game.moves || 1) | 0) << 3;
    const seq = game.hero_seq;
    // C: res = (hero_seq == stethoscope_seq) ? ECMD_TIME : ECMD_OK
    const res = seq === (game.context.stethoscope_seq ?? 0) ? ECMD_TIME : ECMD_OK;
    game.context.stethoscope_seq = seq;

    // confdir deferred (not Confused at starter)
    const dx = game.u.dx | 0;
    const dy = game.u.dy | 0;
    if (!dx && !dy) {
        await ustatusline();
        return res;
    }

    // C: rx = u.ux + u.dx; ry = u.uy + u.dy
    const rx = (game.u.ux | 0) + dx;
    const ry = (game.u.uy | 0) + dy;
    if (!isok(rx, ry)) {
        // C: You_hear("a faint typing noise."); return ECMD_OK
        await pline('You hear a faint typing noise.');
        return ECMD_OK;
    }

    // C: m_at(rx,ry) → mundetected / mappearance seemimic / mstatusline
    const mtmp = m_at(rx, ry);
    if (mtmp) {
        const mnm = a_monnam(mtmp);

        if (mtmp.mundetected) {
            if (!canspotmon(mtmp)) {
                await pline(`There is ${mnm} hidden there.`);
            }
            mtmp.mundetected = 0;
            if (mtmp.mx > 0) newsym(mtmp.mx, mtmp.my);
        } else if (mtmp.mappearance || M_AP_TYPE(mtmp)) {
            let what = 'thing';
            let use_plural = false;
            const ap = M_AP_TYPE(mtmp);
            if (ap === M_AP_OBJECT) {
                const otyp = mtmp.mappearance | 0;
                // C: SLIME_MOLD + has_mcorpsenm → dummy.spe = MCORPSENM
                // then simpleonames (fruit name, not "slime mold").
                if (otyp === SLIME_MOLD && has_mcorpsenm(mtmp)) {
                    what = simpleonames({
                        otyp,
                        spe: MCORPSENM(mtmp),
                        quan: 1,
                    });
                } else {
                    what = simple_typename_steth(otyp);
                }
                const on = objectNames[otyp] || '';
                use_plural = on.includes('BOOTS') || on.includes('GLOVES')
                    || otyp === LENSES;
            } else if (ap === M_AP_MONSTER) {
                const ptr = mons(mtmp.mappearance | 0);
                const raw = ptr?.name || 'monster';
                what = String(raw).replace(/^PM_/, '').replace(/_/g, ' ').toLowerCase();
            } else if (ap === M_AP_FURNITURE) {
                // defsyms[].explanation deferred
                what = 'thing';
            }
            seemimic(mtmp);
            await pline(
                `${use_plural ? 'Those' : 'That'} ${what} `
                + `${use_plural ? 'are' : 'is'} really ${mnm}.`,
            );
        } else if (game.flags?.verbose !== false && !canspotmon(mtmp)) {
            await pline(`There is ${mnm} there.`);
        }

        await mstatusline(mtmp);
        if (!canspotmon(mtmp)) {
            // map_invisible deferred — still return res
        }
        return res;
    }

    // C: SDOOR/SCORR reveal + its_dead deferred → "hear nothing special"
    const lev = game.level?.at(rx, ry);
    if (lev && (lev.typ === SDOOR || lev.typ === SCORR)) {
        // Named omission: hollow_str reveal + cvt_sdoor / unblock_point
        await pline('You hear nothing special.');
        return res;
    }

    // C: if (!its_dead(...)) You("hear nothing special."); return res
    await pline('You hear nothing special.');
    return res;
}

/** C ref: objnam.c simple_typename — otyp → lowercase name. */
function simple_typename_steth(otyp) {
    const s = objectNameStrs[otyp]
        || (objectNames[otyp] || 'object').toLowerCase().replace(/_/g, ' ');
    return s;
}

/** C mondata.h perceives — M1_SEE_INVIS. */
function perceives(ptr) {
    return !!((ptr?.mflags1 ?? 0) & M1_SEE_INVIS);
}

/** C mondata.h is_unicorn — S_UNICORN && likes_gems. */
function is_unicorn(ptr) {
    return ptr?.mlet === 'S_UNICORN' && likes_gems(ptr);
}

/** C hack.c closed_door — DOOR with CLOSED|LOCKED mask. */
function closed_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || loc.typ !== DOOR) return false;
    return !!((loc.doormask | 0) & (D_CLOSED | D_LOCKED));
}

/**
 * C polyself.c poly_gender — 0 male / 1 female / 2 none.
 * Named omission: neuter poly forms always 2.
 */
function poly_gender() {
    return game.flags?.female ? 1 : 0;
}

/**
 * C apply.c beautiful — CHA adjective for mirror self-look
 * and do_name.c do_mgivenname hero-cell refuse.
 */
export function beautiful() {
    const cha = acurr(A_CHA);
    if (cha >= 25) return 'sublime';
    if (cha >= 19) return 'splendorous';
    if (cha >= 16) return poly_gender() === 1 ? 'beautiful' : 'handsome';
    if (cha >= 14) return poly_gender() === 1 ? 'winsome' : 'amiable';
    if (cha >= 11) return 'cute';
    if (cha >= 9) return 'plain';
    if (cha >= 6) return 'homely';
    if (cha >= 4) return 'ugly';
    return 'hideous';
}

/** C objnam.c simpleonames — known mirror → "mirror". */
function simpleonames_mirror(obj) {
    const oc = game.objects?.[obj?.otyp];
    return oc?.oc_name || 'mirror';
}

/**
 * C zap.c bhit INVIS_BEAM arm — walk until mon / !ZAP_POS / closed_door.
 * Continues through minvis unless perceives; returns first usable mon.
 * Named omissions: FLASHED_LIGHT tmp_at; throw/kick paths; fhito pile.
 */
function bhit_invis_beam(ddx, ddy, range) {
    const bhitpos = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    bhitpos.x = game.u?.ux | 0;
    bhitpos.y = game.u?.uy | 0;
    game.notonhead = false;
    let r = range | 0;
    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x | 0;
        const y = bhitpos.y | 0;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        const typ = game.level?.at(x, y)?.typ;
        const mtmp = m_at(x, y);
        if (mtmp) {
            game.notonhead = (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0));
            // C: if (!mtmp->minvis || perceives(mtmp->data)) return
            if (!mtmp.minvis || perceives(mtmp.data)) return mtmp;
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
    return null;
}

/**
 * C apply.c use_mirror — getdir then reflect self / beam mon reactions.
 * Named omissions: Hallucination hcolor self; mon_reflects Medusa;
 * nymph steal+rloc; monverbself polish; Underwater / swallow / dz
 * surface|ceiling wording; See_invisible / Invis edge cases.
 * howmonseen is D-1562.
 * @returns {number} ECMD_*
 */
async function use_mirror(obj) {
    if (!(await getdir(null))) return ECMD_CANCEL;

    const u = game.u || (game.u = {});
    const invis_mirror = !!(u.Invis || u.HInvis || u.EInvis);
    const See_invisible = !!(u.See_invisible || u.HSee_invisible
        || u.ESee_invisible);
    const useeit = !Blind() && (!invis_mirror || See_invisible);
    const uvisage = beautiful();
    const mirror = simpleonames_mirror(obj);

    // C: if (obj->cursed && !rn2(2))
    if (obj.cursed && !rn2(2)) {
        if (!Blind()) {
            await pline(`The ${mirror} fogs up and doesn't reflect!`);
        } else {
            await pline(nothing_seems_to_happen);
        }
        return ECMD_TIME;
    }

    const dx = u.dx | 0;
    const dy = u.dy | 0;
    const dz = u.dz | 0;

    // C: self (!dx && !dy && !dz)
    if (!dx && !dy && !dz) {
        if (!useeit) {
            await pline(`You can't see your ${uvisage} ${body_part(FACE)}.`);
        } else {
            const umonnum = u.umonnum | 0;
            const Free_action = !!(u.Free_action || u.HFree_action
                || u.EFree_action);
            if (umonnum === PM_FLOATING_EYE) {
                if (Free_action) {
                    await pline('You stiffen momentarily under your gaze.');
                } else {
                    if (u.Hallucination) {
                        await pline(`Yow!  The ${mirror} stares back!`);
                    } else {
                        await pline("Yikes!  You've frozen yourself!");
                    }
                    if (!u.Hallucination || !rn2(4)) {
                        nomul(-rnd(MAXULEV + 6 - (u.ulevel | 0)));
                        game.multi_reason = 'gazing into a mirror';
                    }
                    game.nomovemsg = null;
                }
            } else if (is_vampire(game.youmonst?.data)
                || is_vampshifter(game.youmonst)) {
                await pline("You don't have a reflection.");
            } else if (umonnum === PM_UMBER_HULK) {
                await pline("Huh?  That doesn't look like you!");
                const { make_confused } = await import('./potion.js');
                await make_confused((u.HConfusion | 0) + d(3, 4), false);
            } else if (u.Hallucination) {
                // hcolor deferred → generic
                await pline('You look scintillating.');
            } else if (u.Sick) {
                await pline('You look peaked.');
            } else if ((u.uhs | 0) >= WEAK) {
                await pline('You look undernourished.');
            } else if (u.Upolyd) {
                const nm = game.youmonst?.data?.mname || 'a monster';
                await pline(`You look like ${nm}.`);
            } else {
                await pline(`You look as ${uvisage} as ever.`);
            }
        }
        return ECMD_TIME;
    }

    if (u.uswallow) {
        if (useeit) {
            await pline(`You reflect ${mon_nam(u.ustuck)}'s stomach.`);
        }
        return ECMD_TIME;
    }
    if (u.Underwater) {
        if (useeit) {
            await pline(u.Hallucination
                ? 'You give the fish a chance to fix their makeup.'
                : 'You reflect the murky water.');
        }
        return ECMD_TIME;
    }
    if (dz) {
        if (useeit) {
            await pline(`You reflect the ${dz > 0 ? 'floor' : 'ceiling'}.`);
        }
        return ECMD_TIME;
    }

    // C: mtmp = bhit(..., INVIS_BEAM, ...)
    const mtmp = bhit_invis_beam(dx, dy, COLNO);
    if (!mtmp || !haseyes(mtmp.data) || game.notonhead) return ECMD_TIME;

    const vis = canseemon(mtmp);
    // C apply.c:1108 — vis ? howmonseen(mtmp) : 0 (D-1562)
    const how_seen = vis ? howmonseen(mtmp) : 0;
    const monable = !mtmp.mcan
        && (!mtmp.minvis || perceives(mtmp.data));
    const mlet = mtmp.data?.mlet;
    const mndx = mtmp.data?.mndx ?? mtmp.mnum;

    if (mtmp.msleeping) {
        if (vis) {
            await pline(`${Monnam(mtmp)} is too tired to look at your ${mirror}.`);
        }
    } else if (!mtmp.mcansee) {
        if (vis) {
            await pline(`${Monnam(mtmp)} can't see anything right now.`);
        }
    } else if (invis_mirror && !perceives(mtmp.data)) {
        if (vis) {
            await pline(`${Monnam(mtmp)} fails to notice your ${mirror}.`);
        }
    } else if ((how_seen & SEENMON) === MONSEEN_INFRAVIS) {
        if (vis) {
            // C apply.c `:1124–1127` — "<mon> is too far away to see
            // itself in the dark." (monverbself supplies the reflexive).
            await pline(`${monverbself(mtmp, Monnam(mtmp), 'are',
                'too far away to see')} in the dark.`);
        }
    } else if (mlet === 'S_VAMPIRE' || mlet === 'S_GHOST'
        || is_vampshifter(mtmp)) {
        if (vis) {
            await pline(`${Monnam(mtmp)} doesn't have a reflection.`);
        }
    } else if (monable && mndx === PM_MEDUSA) {
        // mon_reflects / stoned/killed deferred — still spend TIME
        if (vis) await pline(`${Monnam(mtmp)} is turned to stone!`);
    } else if (monable && mndx === PM_FLOATING_EYE) {
        let tmp = d(mtmp.m_lev | 0, mtmp.data?.mattk?.[0]?.damd | 0 || 1);
        if (!rn2(4)) tmp = 120;
        if (vis) {
            await pline(`${Monnam(mtmp)} is frozen by its reflection.`);
        } else {
            await pline('You hear something stop moving.');
        }
        mtmp.mfrozen = (mtmp.mfrozen | 0) + tmp;
        mtmp.mcanmove = 0;
    } else if (monable && mndx === PM_UMBER_HULK) {
        if (vis) await pline(`${Monnam(mtmp)} confuses itself!`);
        mtmp.mconf = 1;
    } else if (monable && (mlet === 'S_NYMPH' || mndx === PM_AMOROUS_DEMON)) {
        // steal + rloc deferred — pline only
        if (vis) {
            // C apply.c `:1156–1159` — "<mon> admires self in your mirror"
            await pline(`${monverbself(mtmp, Monnam(mtmp), 'admire', null)
                } in your ${mirror}.`);
        } else {
            await pline(`It steals your ${mirror}!`);
        }
    } else if (!is_unicorn(mtmp.data) && !humanoid(mtmp.data)
        && !is_demon(mtmp.data)
        && (!mtmp.minvis || perceives(mtmp.data)) && rn2(5)) {
        let do_react = true;
        if (mtmp.mfrozen) {
            if (vis) {
                await pline(`You discern no obvious reaction from ${mon_nam(mtmp)}.`);
            } else {
                await pline(
                    'You feel a bit silly gesturing the mirror in that direction.',
                );
            }
            do_react = false;
        }
        if (do_react) {
            if (vis) {
                await pline(`${Monnam(mtmp)} is frightened by its reflection.`);
            }
            await monflee(mtmp, d(2, 4), false, false);
        }
    } else if (!Blind()) {
        if (mtmp.minvis && !See_invisible) {
            // silent
        } else if ((mtmp.minvis && !perceives(mtmp.data))
            || !haseyes(mtmp.data) || game.notonhead || !mtmp.mcansee) {
            await pline(
                `${Monnam(mtmp)} doesn't seem to notice its reflection.`,
            );
        } else {
            await pline(`${Monnam(mtmp)} ignores its reflection.`);
        }
    }
    return ECMD_TIME;
}

/**
 * C zap.c bhit FLASHED_LIGHT — first non-minvis mon stops the beam;
 * minvis calls flash_hits_mon and continues (C zap.c bhit).
 * show_transient_light per cell when !Blind (D-1597).
 * Named omissions: tmp_at flash glyph; iron bars; M_AP_OBJECT skip.
 */
async function bhit_flashed_light(ddx, ddy, range, obj) {
    const bhitpos = game.bhitpos || (game.bhitpos = { x: 0, y: 0 });
    bhitpos.x = game.u?.ux | 0;
    bhitpos.y = game.u?.uy | 0;
    game.notonhead = false;
    let r = range | 0;
    while (r-- > 0) {
        bhitpos.x += ddx;
        bhitpos.y += ddy;
        const x = bhitpos.x | 0;
        const y = bhitpos.y | 0;
        if (!isok(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
        const typ = game.level?.at(x, y)?.typ;
        // C zap.c bhit :3914–3916 — FLASHED_LIGHT after waterwall
        if (!Blind()) await show_transient_light(null, x, y);
        const mtmp = m_at(x, y);
        if (mtmp) {
            game.notonhead = (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0));
            if (mtmp.minvis) {
                if (obj) {
                    obj.ox = game.u.ux | 0;
                    obj.oy = game.u.uy | 0;
                    await flash_hits_mon(mtmp, obj);
                }
            } else {
                return mtmp;
            }
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            bhitpos.x -= ddx;
            bhitpos.y -= ddy;
            break;
        }
    }
    return null;
}

/**
 * C apply.c do_blinding_ray — FLASHED_LIGHT bhit + flash_hits_mon.
 * Callers: use_camera; artifact.c invoke_blinding_ray (D-1377).
 */
export async function do_blinding_ray(obj) {
    const mtmp = await bhit_flashed_light(
        game.u.dx | 0, game.u.dy | 0, COLNO, obj,
    );
    obj.ox = game.u.ux | 0;
    obj.oy = game.u.uy | 0;
    if (mtmp) {
        await flash_hits_mon(mtmp, obj);
        // C: camera → see_monster_closeup(mtmp, TRUE) (D-0999)
        if ((obj.otyp | 0) === EXPENSIVE_CAMERA) {
            await see_monster_closeup(mtmp, true);
        }
    }
    /* C apply.c do_blinding_ray :73–75 — bhit skips cleanup for
     * FLASHED_LIGHT so flash_hits_mon runs first (D-1597). */
    await transient_light_cleanup();
}

/**
 * C apply.c use_camera — getdir; charge; cursed/self zapyourself; ray.
 * Named omissions: Underwater warranty polish; swallow/dz photos;
 * full zapyourself CAMERA; flash_hits_mon mimic/gremlin polish.
 * @returns {number} ECMD_*
 */
async function use_camera(obj) {
    if (game.u?.Underwater) {
        await pline('Using your camera underwater would void the warranty.');
        return ECMD_OK;
    }
    if (!(await getdir(null))) return ECMD_CANCEL;

    if ((obj.spe | 0) <= 0) {
        await pline(nothing_happens);
        return ECMD_TIME;
    }
    await consume_obj_charge(obj, true);

    const u = game.u || {};
    if (obj.cursed && !rn2(2)) {
        const { zapyourself } = await import('./zap.js');
        await zapyourself(obj, true);
    } else if (u.uswallow) {
        await pline(`You take a picture of ${mon_nam(u.ustuck)}'s stomach.`);
    } else if (u.dz) {
        await pline(
            `You take a picture of the ${u.dz > 0 ? 'floor' : 'ceiling'}.`,
        );
    } else if (!(u.dx | 0) && !(u.dy | 0)) {
        const { zapyourself } = await import('./zap.js');
        await zapyourself(obj, true);
    } else {
        await do_blinding_ray(obj);
    }
    return ECMD_TIME;
}

/** C youprop.h Blind ≡ (HBlinded || EBlinded) && !BBlinded (D-0716: no sticky). */
function Blind() {
    const u = game.u || {};
    if (u.uroleplay?.blind) return true;
    return !!(((u.HBlinded | 0) || (u.EBlinded | 0)) && !(u.BBlinded | 0));
}

/** C youprop.h BlindedTimeout — HBlinded & TIMEOUT. */
function BlindedTimeout() {
    return (game.u?.HBlinded | 0) & TIMEOUT;
}

/**
 * C ref: mondata.c can_blnd(NULL, &youmonst, AT_WEAP, cream_pie) subset.
 * Named omissions: visored helmet; mon_perma_blind; raven-vs-raven.
 */
function can_blnd_cream_self(obj) {
    const you = game.youmonst;
    if (!haseyes(you?.data)) return false;
    // C: Blindfolded ≡ EBlinded / ublindf blocks cream on hero
    if (game.u?.ublindf || (game.u?.EBlinded | 0)) return false;
    void obj;
    return true;
}

/** Remove obj from invent array (C freeinv / obj_extract_self OBJ_INVENT). */
function freeinv_pie(obj) {
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.where = OBJ_FREE;
}

/**
 * C ref: apply.c use_cream_pie — immerse face; blindinc rnd(25); splat+delobj.
 * Named omissions: costly_alteration COST_SPLAT shop bill; invent-array
 * wiring when splitobj child is not pushed (quan>1 rare for wish).
 * @returns {number} ECMD_OK (C never spends a turn)
 */
async function use_cream_pie(obj) {
    const u = game.u || (game.u = {});
    const wasblind = Blind();
    const wascreamed = !!(u.ucreamed | 0);
    let several = false;
    let pie = obj;

    if ((pie.quan || 1) > 1) {
        several = true;
        const child = splitobj(pie, 1);
        if (child) {
            // C invent split leaves child free of parent stack; splice child in
            const inv = game.invent || [];
            const pidx = inv.indexOf(pie);
            if (pidx >= 0) inv.splice(pidx + 1, 0, child);
            else inv.push(child);
            child.where = pie.where;
            pie = child;
        }
    }

    if (u.Hallucination) {
        await pline('You give yourself a facial.');
    } else {
        const xn = xname(pie);
        await pline(
            `You immerse your ${body_part(FACE)} in ${
                several ? 'one of ' : ''
            }${several ? makeplural(the(xn)) : the(xn)}.`,
        );
    }

    if (can_blnd_cream_self(pie)) {
        const blindinc = rnd(25);
        u.ucreamed = (u.ucreamed | 0) + blindinc;
        await make_blinded(BlindedTimeout() + blindinc, false);
        if (!Blind() || (Blind() && wasblind)) {
            await pline(
                `There's ${wascreamed ? 'more ' : ''}sticky goop all over your ${
                    body_part(FACE)}.`,
            );
        } else {
            await pline(
                `You can't see through all the sticky goop on your ${
                    body_part(FACE)}.`,
            );
        }
    }

    setnotworn(pie);
    // costly_alteration(COST_SPLAT) deferred — shop unpaid message only
    freeinv_pie(pie);
    delobj(pie); // obj_resists rn2(100) then extract+free
    return ECMD_OK;
}

/** C ref: o_init.c objdescr_is — appearance string match. */
function objdescr_is(obj, descr) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    if (!oc) return false;
    const dn = objectDescrs[oc.oc_descr_idx ?? obj.otyp];
    return dn != null && dn === descr;
}

/** C ref: invent.c freehand — either hand free. */
function freehand_break() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep) return true;
    const bimanual = !!(game.objects?.[uwep.otyp]?.oc_bimanual
        || game.objects?.[uwep.otyp]?.oc_big);
    if (!bimanual && (!u.uarms || !u.uarms.cursed)) return true;
    if (!uwep.cursed) return true;
    return false;
}

/**
 * C ref: apply.c discard_broken_wand — delobj current_wand + nomul(0).
 */
async function discard_broken_wand() {
    const obj = game.current_wand;
    game.current_wand = null;
    if (obj) delobj(obj);
    nomul(0);
}

/**
 * C ref: apply.c broken_wand_explode — explode + makeknown + discard.
 * explode() bills shopdamage via zap_over_floor (D-0949).
 */
async function broken_wand_explode(obj, dmg, expltype) {
    const u = game.u || {};
    await explode(u.ux | 0, u.uy | 0, -(obj.otyp | 0), dmg, WAND_CLASS, expltype);
    makeknown(obj.otyp);
    await discard_broken_wand();
}

/**
 * C ref: apply.c do_break_wand — apply a wand by breaking it.
 * Envelope: nohands/freehand/STR gates; paranoid_query confirm; unpaid
 * costly_alteration; freeinv; zappable restore charge; explode-type
 * wands (death/lightning/fire/cold/missile); nothing-else inert wands;
 * magical explode + WAN_DIGGING adjacent dig_check/digactualhole +
 * WAN_CREATE_MONSTER makemon + dig shop pay_for_damage (D-0950);
 * strike/cancel/poly/tele/undead adjacent bhitm/bhitpile/zapyourself
 * + WAN_LIGHT litroom (D-0952).
 * Named omit: check_unpaid bill polish; ICE spot_stop_timers;
 * HOLE goto_level; revive container/buried polish.
 * @returns {number} ECMD_*
 */
async function do_break_wand(obj) {
    if (!obj) return ECMD_OK;
    const is_fragile = objdescr_is(obj, 'balsa') || objdescr_is(obj, 'glass');

    if (nohands(game.youmonst?.data)) {
        await pline(`You can't break ${yname(obj)} without hands!`);
        return ECMD_OK;
    }
    if (!freehand_break()) {
        await pline(`Your ${makeplural(body_part(HAND))} are occupied!`);
        return ECMD_OK;
    }
    if (acurr(A_STR) < (is_fragile ? 5 : 10)) {
        await pline(`You don't have the strength to break ${yname(obj)}!`);
        return ECMD_OK;
    }

    // C: paranoid_query(ParanoidBreakwand, …) — getlin "yes" when bit set
    const bits = game.flags?.paranoia_bits | 0;
    const be_paranoid = (bits & PARANOID_BREAKWAND) !== 0;
    if (!(await paranoid_query(
        be_paranoid,
        `Are you really sure you want to break ${yname(obj)}?`,
    ))) {
        return ECMD_OK;
    }

    await pline(
        `Raising ${yname(obj)} high above your ${body_part(HEAD)}, you ${
            is_fragile ? 'snap' : 'break'
        } it in two!`,
    );

    if (obj.unpaid) {
        // check_unpaid deferred — costly_alteration bills destroy
        await costly_alteration(obj, COST_DSTROY);
    }

    game.current_wand = obj;
    freeinv_pie(obj);
    setnotworn(obj);

    if (!zappable(obj)) {
        await pline(NOTHING_ELSE_HAPPENS);
        await discard_broken_wand();
        return ECMD_TIME;
    }
    // zappable consumed a charge; put it back
    obj.spe = (obj.spe | 0) + 1;
    if (!(obj.spe | 0)) obj.spe = rnd(3);

    const u = game.u || {};
    obj.ox = u.ux | 0;
    obj.oy = u.uy | 0;
    let dmg = (obj.spe | 0) * 4;
    let affects_objects = false;

    switch (obj.otyp) {
    case WAN_OPENING:
        if (u.ustuck) {
            await release_hold();
            if (obj.dknown) makeknown(WAN_OPENING);
            await discard_broken_wand();
            return ECMD_TIME;
        }
        // FALLTHROUGH
    case WAN_WISHING:
    case WAN_NOTHING:
    case WAN_LOCKING:
    case WAN_PROBING:
    case WAN_ENLIGHTENMENT:
    case WAN_SECRET_DOOR_DETECTION:
    case WAN_STASIS:
        await pline(NOTHING_ELSE_HAPPENS);
        await discard_broken_wand();
        return ECMD_TIME;
    case WAN_DEATH:
    case WAN_LIGHTNING:
        await broken_wand_explode(obj, dmg * 4, EXPL_MAGICAL);
        return ECMD_TIME;
    case WAN_FIRE:
        await broken_wand_explode(obj, dmg * 2, EXPL_FIERY);
        return ECMD_TIME;
    case WAN_COLD:
        await broken_wand_explode(obj, dmg * 2, EXPL_FROSTY);
        return ECMD_TIME;
    case WAN_MAGIC_MISSILE:
        await broken_wand_explode(obj, dmg, EXPL_MAGICAL);
        return ECMD_TIME;
    case WAN_STRIKING:
        await pline('A wall of force smashes down around you!');
        dmg = d(1 + (obj.spe | 0), 6);
        // FALLTHROUGH
    case WAN_CANCELLATION:
    case WAN_POLYMORPH:
    case WAN_TELEPORTATION:
    case WAN_UNDEAD_TURNING:
        affects_objects = true;
        break;
    default:
        break;
    }

    // magical explosion before specific effects
    await explode(
        obj.ox | 0, obj.oy | 0, -(obj.otyp | 0), rnd(dmg),
        WAND_CLASS, EXPL_MAGICAL,
    );

    const {
        dig_check, fillholetyp, digactualhole, liquid_flow,
        fill_pit, maybe_dunk_boulders, watch_dig,
    } = await import('./dig.js');
    const {
        DIGCHECK_FAILED, DIGCHECK_FAIL_BOULDER, IS_WALL, IS_DOOR,
        Can_dig_down, PIT, HOLE, ROOM, ICE, N_DIRS, xdir, ydir, isok,
        SHOPBASE, NO_MM_FLAGS, NO_KILLER_PREFIX,
    } = await import('./const.js');
    const { in_rooms, losehp, maybe_half_phys } = await import('./hack.js');
    const { makemon } = await import('./makemon.js');
    const { pay_for_damage } = await import('./shk.js');
    const { recalc_block_point } = await import('./vision.js');
    const { t_at } = await import('./trap.js');
    const {
        bhitm, bhitpile, bhito, zapsetup, zapwrapup, zapyourself,
    } = await import('./zap.js');
    const { m_at } = await import('./mon.js');
    const { litroom } = await import('./read.js');
    const { finish_losehp_done } = await import('./end.js');

    zapsetup();

    let shop_damage = false;
    let fillmsg = false;
    const BY_OBJECT = null;

    for (let i = 0; i <= N_DIRS; i++) {
        const x = (obj.ox | 0) + (xdir[i] | 0);
        const y = (obj.oy | 0) + (ydir[i] | 0);
        if (!isok(x, y)) continue;

        if (!game._bhitpos) game._bhitpos = { x: 0, y: 0 };
        game._bhitpos.x = x;
        game._bhitpos.y = y;

        if (obj.otyp === WAN_DIGGING) {
            const dcres = dig_check(BY_OBJECT, x, y);
            if (dcres < DIGCHECK_FAILED || dcres === DIGCHECK_FAIL_BOULDER) {
                const lev = game.level?.at(x, y);
                if (lev && (IS_WALL(lev.typ) || IS_DOOR(lev.typ))) {
                    await watch_dig(null, x, y, true);
                    if (in_rooms(x, y, SHOPBASE)) shop_damage = true;
                }
                // ICE spot_stop_timers deferred
                void ICE;
                const typ = fillholetyp(x, y, false);
                if (typ !== ROOM) {
                    if (lev) {
                        lev.typ = typ;
                        lev.flags = 0;
                    }
                    await liquid_flow(
                        x, y, typ, t_at(x, y),
                        fillmsg
                            ? null
                            : 'Some holes are quickly filled with %s!',
                    );
                    fillmsg = true;
                } else {
                    const pitOnly = rn2(obj.spe | 0) < 3
                        || (!Can_dig_down(u.uz) && !lev?.candig);
                    await digactualhole(
                        x, y, BY_OBJECT, pitOnly ? PIT : HOLE,
                    );
                }
            }
            fill_pit(x, y);
            maybe_dunk_boulders(x, y);
            recalc_block_point(x, y);
            continue;
        }
        if (obj.otyp === WAN_CREATE_MONSTER) {
            // near hero — x,y might be rock
            makemon(null, u.ux | 0, u.uy | 0, NO_MM_FLAGS);
            continue;
        }
        if (x !== (u.ux | 0) || y !== (u.uy | 0)) {
            const mon = m_at(x, y);
            if (mon) await bhitm(mon, obj);
            if (affects_objects && objects_at(x, y)) {
                await bhitpile(obj, bhito, x, y, 0);
            }
        } else {
            if (affects_objects && objects_at(x, y)) {
                await bhitpile(obj, bhito, x, y, 0);
            }
            const damage = await zapyourself(obj, false);
            if (damage) {
                const him = game.flags?.female ? 'her' : 'him';
                const buf = `killed ${him}self by breaking a wand`;
                losehp(maybe_half_phys(damage), buf, NO_KILLER_PREFIX);
                if (game._losehp_needs_done || game.program_state?.gameover) {
                    await finish_losehp_done();
                }
            }
        }
    }

    await zapwrapup();

    if (shop_damage) {
        await pay_for_damage('dig into', false);
    }

    if (obj.otyp === WAN_LIGHT) {
        await litroom(true, obj);
    }

    await discard_broken_wand();
    return ECMD_TIME;
}

/** C apply.c um_dist — true if Chebyshev distance to hero > n. */
function um_dist(x, y, n) {
    const u = game.u || {};
    return Math.abs((u.ux | 0) - (x | 0)) > n
        || Math.abs((u.uy | 0) - (y | 0)) > n;
}

/** C you.h m_next2u — squared distu ≤ 2. */
function m_next2u(mtmp) {
    const u = game.u || {};
    const dx = (mtmp.mx | 0) - (u.ux | 0);
    const dy = (mtmp.my | 0) - (u.uy | 0);
    return dx * dx + dy * dy <= 2;
}

/** C hacklib.c s_suffix — possessive for leash snap pline. */
function s_suffix_leash(s) {
    const str = String(s || '');
    if (!str) return "'s";
    const last = str.charAt(str.length - 1);
    if (last === 's' || last === 'x' || last === 'z'
        || str.endsWith('ch') || str.endsWith('sh')) {
        return `${str}'`;
    }
    return `${str}'s`;
}

/** C you.h mhis — hallu rn2 deferred (leash pull-free msg). */
function mhis_leash(mtmp) {
    if (mtmp?.female) return 'her';
    return 'his';
}

/**
 * C ref: wizard.c mon_has_amulet — minvent holds AMULET_OF_YENDOR.
 */
export function mon_has_amulet(mtmp) {
    if (!mtmp || AMULET_OF_YENDOR < 0) return 0;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === AMULET_OF_YENDOR) return 1;
    }
    return 0;
}

/**
 * C ref: apply.c number_leashed — invent LEASH with leashmon set.
 */
export function number_leashed() {
    let i = 0;
    if (LEASH < 0) return 0;
    for (const obj of game.invent || []) {
        if ((obj.otyp | 0) === LEASH && (obj.leashmon | 0) !== 0) i++;
    }
    return i;
}

/**
 * C ref: apply.c get_mleash — invent LEASH attached to mtmp->m_id.
 */
export function get_mleash(mtmp) {
    if (!mtmp || LEASH < 0) return null;
    const mid = mtmp.m_id | 0;
    for (const otmp of game.invent || []) {
        if ((otmp.otyp | 0) === LEASH && (otmp.leashmon | 0) === mid) {
            return otmp;
        }
    }
    return null;
}

/**
 * C ref: apply.c o_unleash — clear mleashed on mon matching leashmon.
 * Always update_inventory (C `:721`); perm_invent no-op when !in_moveloop.
 */
export function o_unleash(otmp) {
    if (!otmp) return;
    const lid = otmp.leashmon | 0;
    if (lid) {
        for (const mtmp of game.fmon || []) {
            if ((mtmp.m_id | 0) === lid) {
                mtmp.mleashed = 0;
                break;
            }
        }
    }
    otmp.leashmon = 0;
    update_inventory();
}

/**
 * C ref: apply.c m_unleash `:725–742` — optional feedback, then
 * get_mleash leashmon=0 + update_inventory, then mleashed=0.
 * FALSE (m_detach / check_leash snap / dogmove ALLOW_U) has no pline so
 * sync callers may invoke without await. SetVoice is a no-op without
 * SND_LIB (pline_mon is set_msg_xy + pline).
 */
export async function m_unleash(mtmp, feedback) {
    if (!mtmp) return;
    if (feedback) {
        if (canseemon(mtmp)) {
            await pline_mon(
                mtmp,
                `${Monnam(mtmp)} pulls free of ${mhis_leash(mtmp)} leash!`,
            );
        } else {
            await pline('Your leash falls slack.');
        }
    }
    const otmp = get_mleash(mtmp);
    if (otmp) {
        otmp.leashmon = 0;
        update_inventory();
    }
    mtmp.mleashed = 0;
}

/**
 * C ref: apply.c unleash_all — bones / death clear.
 */
export function unleash_all() {
    if (LEASH >= 0) {
        for (const otmp of game.invent || []) {
            if ((otmp.otyp | 0) === LEASH) otmp.leashmon = 0;
        }
    }
    for (const mtmp of game.fmon || []) {
        mtmp.mleashed = 0;
    }
}

/**
 * C ref: apply.c leashable — not long worm / unsolid / headless blob.
 */
export function leashable(mtmp) {
    if (!mtmp?.data) return false;
    const mnum = mtmp.mnum ?? mtmp.data.mndx ?? -1;
    if (PM_LONG_WORM >= 0 && mnum === PM_LONG_WORM) return false;
    if (unsolid(mtmp.data)) return false;
    if (nolimbs(mtmp.data) && !has_head(mtmp.data)) return false;
    return true;
}

/**
 * C ref: apply.c mleashed_next2u — jerk pet adjacent or drop leash.
 * Returns true when cursed leash blocks next_to_u (get_iter_mons stop).
 */
async function mleashed_next2u(mtmp) {
    if (!mtmp?.mleashed) return false;
    if (!m_next2u(mtmp)) await mnexto(mtmp, RLOC_NOMSG);
    if (!m_next2u(mtmp)) {
        const otmp = get_mleash(mtmp);
        if (!otmp) {
            // C: impossible("leashed-unleashed mon?");
            return true;
        }
        if (otmp.cursed) return true;
        mtmp.mleashed = 0;
        otmp.leashmon = 0;
        update_inventory();
        await You_feel(
            `${number_leashed() > 1 ? 'a' : 'the'} leash go slack.`,
        );
    }
    return false;
}

/**
 * C ref: apply.c next_to_u — leashed pets must stay adjacent; steed+AoY ban.
 * @returns {Promise<boolean>}
 */
export async function next_to_u() {
    for (const mtmp of game.fmon || []) {
        if ((mtmp.mhp | 0) <= 0) continue;
        if (await mleashed_next2u(mtmp)) return false;
    }
    const steed = game.u?.usteed;
    if (steed && mon_has_amulet(steed)) return false;
    return true;
}

/**
 * C ref: apply.c check_leash — stretch/choke/snap after hero moved from (x,y).
 */
export async function check_leash(x, y) {
    if (LEASH < 0) return;
    const u = game.u || {};
    for (const otmp of game.invent || []) {
        if ((otmp.otyp | 0) !== LEASH || (otmp.leashmon | 0) === 0) continue;
        const mtmp = find_mid(otmp.leashmon | 0, 0);
        if (!mtmp) {
            otmp.leashmon = 0;
            continue;
        }
        if (dist2(u.ux | 0, u.uy | 0, mtmp.mx | 0, mtmp.my | 0)
            > dist2(x | 0, y | 0, mtmp.mx | 0, mtmp.my | 0)) {
            if (!um_dist(mtmp.mx | 0, mtmp.my | 0, 3)) {
                // still close enough
            } else if (otmp.cursed && !breathless(mtmp.data)) {
                if (um_dist(mtmp.mx | 0, mtmp.my | 0, 5)
                    || ((mtmp.mhp = (mtmp.mhp | 0) - rnd(2)) <= 0)) {
                    const save_pacifism = game.u?.uconduct?.killer | 0;
                    await pline(
                        `Your leash chokes ${mon_nam(mtmp)} to death!`,
                    );
                    await xkilled(mtmp, XKILL_NOMSG);
                    if ((mtmp.mhp | 0) > 0 && game.u?.uconduct) {
                        game.u.uconduct.killer = save_pacifism;
                    }
                } else {
                    await pline(
                        `${Monnam(mtmp)} is choked by the leash!`,
                    );
                    if (mtmp.mtame && rn2(mtmp.mtame | 0)) {
                        mtmp.mtame = (mtmp.mtame | 0) - 1;
                    }
                }
            } else if (um_dist(mtmp.mx | 0, mtmp.my | 0, 5)) {
                await pline(
                    `${s_suffix_leash(Monnam(mtmp))} leash snaps loose!`,
                );
                await m_unleash(mtmp, false);
            } else {
                await pline('You pull on the leash.');
                if (mon_msound(mtmp) !== MS_SILENT) {
                    switch (rn2(3)) {
                    case 0:
                        await growl(mtmp);
                        break;
                    case 1:
                        await yelp(mtmp);
                        break;
                    default:
                        await whimper(mtmp);
                        break;
                    }
                }
            }
        }
    }
}

/**
 * C ref: cmd.c get_adjacent_loc — getdir then adjacent/self cell for leash.
 */
async function get_adjacent_loc_leash() {
    if (!(await getdir(null))) {
        await pline('Never mind.');
        return null;
    }
    const u = game.u || {};
    const cc = {
        x: (u.ux | 0) + (u.dx | 0),
        y: (u.uy | 0) + (u.dy | 0),
    };
    if (!isok(cc.x, cc.y) && !(u.dx === 0 && u.dy === 0 && u.dz === 0)) {
        return null;
    }
    if (u.dx === 0 && u.dy === 0) {
        cc.x = u.ux | 0;
        cc.y = u.uy | 0;
    }
    return cc;
}

/**
 * C ref: apply.c use_leash_core — attach/detach leash at spotted mon.
 */
async function use_leash_core(obj, mtmp, cc, spotmon) {
    const loc = game.level?.at?.(cc.x, cc.y);
    if (!spotmon && !glyph_is_invisible(loc)) {
        await pline(
            `You fail to ${obj.leashmon ? 'un' : ''}leash something.`,
        );
        map_invisible(cc.x, cc.y);
    } else if (!mtmp.mtame) {
        await pline(
            `${Monnam(mtmp)} ${!obj.leashmon ? 'cannot be' : 'is not'} leashed!`,
        );
    } else if (!obj.leashmon) {
        if (mtmp.mleashed) {
            await pline(
                `This ${spotmon ? l_monnam(mtmp) : 'creature'} is already leashed.`,
            );
        } else if (unsolid(mtmp.data)) {
            await pline('The leash would just fall off.');
        } else if (nolimbs(mtmp.data) && !has_head(mtmp.data)) {
            await pline(
                `${Monnam(mtmp)} has no extremities the leash would fit.`,
            );
        } else if (!leashable(mtmp)) {
            let lmonnam = l_monnam(mtmp);
            if ((cc.x | 0) !== (mtmp.mx | 0) || (cc.y | 0) !== (mtmp.my | 0)) {
                lmonnam = `${s_suffix_leash(lmonnam)} tail`;
            }
            await pline(
                `The leash won't fit onto ${spotmon ? 'your ' : ''}${lmonnam}.`,
            );
        } else {
            await pline(
                `You slip the leash around ${spotmon ? 'your ' : ''}${l_monnam(mtmp)}.`,
            );
            mtmp.mleashed = 1;
            obj.leashmon = mtmp.m_id | 0;
            mtmp.msleeping = 0;
            update_inventory();
        }
    } else if ((obj.leashmon | 0) !== (mtmp.m_id | 0)) {
        await pline('This leash is not attached to that creature.');
    } else if (obj.cursed) {
        await pline('The leash would not come off!');
        obj.bknown = 1;
    } else {
        mtmp.mleashed = 0;
        obj.leashmon = 0;
        update_inventory();
        await pline(
            `You remove the leash from ${spotmon ? 'your ' : ''}${l_monnam(mtmp)}.`,
        );
    }
}

/**
 * C ref: apply.c use_leash — apply LEASH (getdir + attach/detach).
 * Named omit: engulfer You_cant phrasing polish beyond noit_mon_nam.
 */
async function use_leash(obj) {
    const u = game.u || {};
    if (u.uswallow) {
        const stuck = u.ustuck;
        const nam = stuck ? mon_nam(stuck) : 'it';
        if (!obj.leashmon) {
            await pline(`You can't leash ${nam} from inside.`);
        } else if (stuck && (obj.leashmon | 0) === (stuck.m_id | 0)) {
            await pline(`You can't unleash ${nam} from inside.`);
        } else {
            await pline(`You can't unleash anything from inside ${nam}.`);
        }
        return ECMD_OK;
    }
    if (!obj.leashmon && number_leashed() >= MAXLEASHED) {
        await pline('You cannot leash any more pets.');
        return ECMD_OK;
    }

    const cc = await get_adjacent_loc_leash();
    if (!cc) return ECMD_OK;

    if ((cc.x | 0) === (u.ux | 0) && (cc.y | 0) === (u.uy | 0)) {
        if (u.usteed && (u.dz | 0) > 0) {
            await use_leash_core(obj, u.usteed, cc, 1);
            return ECMD_TIME;
        }
        await pline('Leash yourself?  Very funny...');
        return ECMD_OK;
    }

    const mtmp = m_at(cc.x, cc.y);
    if (!mtmp) {
        await pline('There is no creature there.');
        unmap_invisible(cc.x, cc.y);
        return ECMD_TIME;
    }

    await use_leash_core(obj, mtmp, cc, canspotmon(mtmp) ? 1 : 0);
    return ECMD_TIME;
}

/** C youprop.h Deaf — TIMEOUT/extrinsic/intrinsic/roleplay. */
function Deaf_hero() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.Deaf || u.uroleplay?.deaf);
}

/** C youprop.h Underwater. */
function Underwater_hero() {
    return !!game.u?.Underwater;
}

/** C objnam.c Yobjnam2 thin. */
function Yobjnam2_apply(obj, verb) {
    const nam = xname(obj);
    // vtense deferred — glow/glows for singular tools
    const v = verb === 'glow' ? 'glows' : verb;
    return `Your ${nam} ${v}`;
}

/** C hacklib.c upstart. */
function upstart(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/** C apply.c HowMany for magic_whistled cumulative pline. */
function HowMany(n) {
    if ((n | 0) < 2) return 'sqrt(-1)';
    if ((n | 0) === 2) return 'two';
    if ((n | 0) === 3) return 'three';
    if ((n | 0) === 4) return 'four';
    if ((n | 0) <= 7) return 'several';
    return 'many';
}

/**
 * C ref: apply.c use_whistle — tin whistle (and uncursed eucalyptus).
 * Branch: !can_blow; Underwater bubbles; else Deaf/You + wake_nearby(TRUE);
 * cursed → vault_summon_gd.
 * Named omit: Soundeffect.
 */
async function use_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await pline('You are incapable of using the whistle.');
        return;
    }
    if (Underwater_hero()) {
        await pline(`You blow bubbles through ${yname(obj)}.`);
        return;
    }
    if (Deaf_hero()) {
        await You_feel(`rushing air tickle your ${body_part(NOSE)}.`);
    } else {
        const pitch = obj.cursed ? 'shrill' : 'high';
        await pline(`You produce a ${pitch} whistling sound.`);
    }
    await wake_nearby(true);
    if (obj.cursed) vault_summon_gd();
}

/**
 * C ref: apply.c magic_whistled — tame pets mnexto + mintrap; discover /
 * cumulative appear/shift/disappear pline when already known.
 * Named omit: disturb polish; full rloc vanish msgs when undiscovered.
 */
async function magic_whistled(obj) {
    const lf = game.level?.flags || {};
    if ((lf.stasis_until | 0) >= (game.moves | 0)) return;

    const already = !!game.objects?.[obj.otyp]?.oc_name_known;
    let shift = 0;
    let appear = 0;
    let disappear = 0;
    let trapped = 0;
    let shiftbuf = '';
    let appearbuf = '';
    let disappearbuf = '';
    let mnam = '';

    const pets = [...(game.fmon || [])];
    for (const mtmp of pets) {
        if (!mtmp || (mtmp.mhp | 0) <= 0) continue;
        if (!mtmp.mtame || mtmp === game.u?.usteed) continue;
        if (mtmp.mtrapped) {
            mtmp.mtrapped = 0;
            fill_pit(mtmp.mx | 0, mtmp.my | 0);
        }
        const oseen = canspotmon(mtmp);
        if (oseen) mnam = y_monnam(mtmp);
        if (M_AP_TYPE(mtmp)) seemimic(mtmp);
        const omx = mtmp.mx | 0;
        const omy = mtmp.my | 0;
        await mnexto(mtmp, already ? RLOC_NONE : RLOC_MSG);
        if ((mtmp.mx | 0) !== omx || (mtmp.my | 0) !== omy) {
            if (mtmp.mundetected) {
                mtmp.mundetected = 0;
                newsym(mtmp.mx | 0, mtmp.my | 0);
            }
            if (!game.iflags) game.iflags = {};
            game.iflags.last_msg = PLNMSG_enum;
            if ((await mintrap(mtmp, NO_TRAP_FLAGS)) === Trap_Killed_Mon) {
                change_luck(-1);
            }
            if ((game.iflags.last_msg | 0) !== PLNMSG_enum) {
                trapped++;
                continue;
            }
            const nseen = (mtmp.mhp | 0) <= 0 ? false : canspotmon(mtmp);
            if (nseen) {
                mnam = y_monnam(mtmp);
                if (oseen) {
                    if (++shift === 1) shiftbuf = `${mnam} shifts location`;
                } else if (++appear === 1) {
                    appearbuf = `${mnam} appears`;
                }
            } else if (oseen) {
                if (++disappear === 1) disappearbuf = `${mnam} disappears`;
            }
        }
    }

    let buf = '';
    if (!already) {
        if (shift + appear + trapped > 0) makeknown(obj.otyp);
    } else {
        if (shift > 0) {
            if (shift > 1) {
                shiftbuf = `${HowMany(shift)} creatures shift locations`;
            }
            buf = upstart(shiftbuf);
        }
        if (appear > 0) {
            if (appear > 1) {
                appearbuf = `${HowMany(appear)} ${
                    shift === 0 ? 'creatures'
                        : shift === 1 ? 'other creatures' : 'others'
                } appear`;
            }
            if (shift === 0) buf = upstart(appearbuf);
            else buf += `${disappear ? ',' : ' and'} ${appearbuf}`;
        }
        if (disappear > 0) {
            if (disappear > 1) {
                disappearbuf = `${HowMany(disappear)} ${
                    shift === 0 && appear === 0 ? 'creatures'
                        : shift < 2 && appear < 2 ? 'other creatures' : 'others'
                } disappear`;
            }
            if (shift + appear === 0) buf = upstart(disappearbuf);
            else buf += `${shift && appear ? ',' : ''} and ${disappearbuf}`;
        }
    }
    if (buf) await pline(`${buf}.`);
}

/**
 * C ref: apply.c use_magic_whistle — magic whistle / blessed eucalyptus.
 * Branch: !can_blow; cursed !rn2(2) wake + maybe tele_to_rnd_pet;
 * else magic_whistled. Named omit: Soundeffect.
 */
async function use_magic_whistle(obj) {
    if (!can_blow(game.youmonst)) {
        await pline('You are incapable of using the whistle.');
        return;
    }
    if (obj.cursed && !rn2(2)) {
        const uw = Underwater_hero() ? 'very ' : '';
        const tone = Deaf_hero()
            ? 'frequency vibration'
            : 'pitched humming noise';
        await pline(`You produce a ${uw}high-${tone}.`);
        await wake_nearby(true);
        if (!rn2(2) && !noteleport_level(game.youmonst)) {
            await tele_to_rnd_pet();
        }
        return;
    }
    const hallu = !!(game.u?.Hallucination || game.u?.HHallucination);
    const deaf = Deaf_hero();
    const uw = Underwater_hero();
    let adj;
    if (hallu) adj = 'normal';
    else if (uw && !deaf) adj = 'strange, high-pitched';
    else adj = 'strange';
    if (deaf) {
        await pline(`You produce a ${adj}, sharp vibration.`);
    } else {
        await pline(`You produce a ${adj} whistling sound.`);
    }
    await magic_whistled(obj);
}

/** C invent.c freehand — welded two-hand / cursed shield gate. */
function freehand_towel() {
    const u = game.u || {};
    const uwep = u.uwep;
    if (!uwep || !welded(uwep)) return true;
    const bimanual = !!(game.objects?.[uwep.otyp]?.oc_big);
    if (!bimanual && (!u.uarms || !u.uarms.cursed)) return true;
    return false;
}

/**
 * C ref: apply.c use_towel — wipe glib / cream / cursed slapstick.
 * dry_a_towel when wet (weapon.c). gulp_blnd_check swallow arm deferred.
 * @returns {number} ECMD_OK | ECMD_TIME
 */
async function use_towel(obj) {
    const u = game.u || (game.u = {});
    const drying_feedback = obj === u.uwep;

    if (!freehand_towel()) {
        await pline(`You have no free ${body_part(HAND)}!`);
        return ECMD_OK;
    }
    if (obj === u.ublindf) {
        await pline("You cannot use it while you're wearing it!");
        return ECMD_OK;
    }
    if (obj.cursed) {
        switch (rn2(3)) {
        case 2: {
            const old = Glib() & TIMEOUT;
            make_glib((old | 0) + rn1(10, 3));
            await pline(
                `Your ${makeplural(body_part(HAND))} ${
                    old ? 'are filthier than ever' : 'get slimy'
                }!`,
            );
            if (is_wet_towel(obj)) {
                await dry_a_towel(obj, -1, drying_feedback);
            }
            return ECMD_TIME;
        }
        case 1: {
            if (!u.ublindf) {
                const old = u.ucreamed | 0;
                u.ucreamed = old + rn1(10, 3);
                await pline(
                    `Yecch!  Your ${body_part(FACE)} ${
                        old ? 'has more' : 'now has'
                    } gunk on it!`,
                );
                await make_blinded(BlindedTimeout() + ((u.ucreamed | 0) - old), true);
            } else {
                const bf = u.ublindf;
                let what;
                if (bf.otyp === LENSES) what = 'lenses';
                else if (obj.otyp === bf.otyp) what = 'other towel';
                else what = 'blindfold';
                if (bf.cursed) {
                    await pline(
                        `You push your ${what} ${
                            rn2(2) ? 'cock-eyed' : 'crooked'
                        }.`,
                    );
                } else {
                    const saved = bf;
                    await pline(`You push your ${what} off.`);
                    await Blindf_off(bf);
                    await dropx(saved);
                }
            }
            if (is_wet_towel(obj)) {
                await dry_a_towel(obj, -1, drying_feedback);
            }
            return ECMD_TIME;
        }
        case 0:
            break;
        default:
            break;
        }
    }

    if (Glib()) {
        make_glib(0);
        await pline(
            `You wipe off your ${
                !u.uarmg
                    ? makeplural(body_part(HAND))
                    : gloves_simple_name(u.uarmg)
            }.`,
        );
        if (is_wet_towel(obj)) {
            await dry_a_towel(obj, -1, drying_feedback);
        }
        return ECMD_TIME;
    }
    if (u.ucreamed | 0) {
        const cream = u.ucreamed | 0;
        // C: incr_itimeout(&HBlinded, -ucreamed)
        await make_blinded(BlindedTimeout() - cream, false);
        u.ucreamed = 0;
        if (!Blind()) {
            await pline("You've got the glop off.");
            // gulp_blnd_check deferred → always false
            await make_blinded(1, false);
            await make_blinded(0, true);
        } else {
            await pline(`Your ${body_part(FACE)} feels clean now.`);
        }
        if (is_wet_towel(obj)) {
            await dry_a_towel(obj, -1, drying_feedback);
        }
        return ECMD_TIME;
    }

    await pline(
        `Your ${body_part(FACE)} and ${makeplural(body_part(HAND))} are already clean.`,
    );
    return ECMD_OK;
}

/** C apply.c flip_through_book fadeness[] — min(spestudied, MAX_SPELL_STUDY). */
const SPELLBOOK_FADENESS = [
    'fresh',
    'slightly faded',
    'very faded',
    'extremely faded',
    'barely visible',
];

/** C decl.h NH_RED — c_color_names.c_red. */
const NH_RED = 'red';

/**
 * C ref: pline.c You_hear — skip if Deaf; Unaware/Underwater barely /
 * flags.acoustics deferred.
 */
async function You_hear_apply(line) {
    if (Deaf_hero()) return;
    await pline(`You hear ${line}`);
}

/**
 * C ref: pline.c You_see — Blind → "You sense"; Unaware dream deferred.
 */
async function You_see_apply(line) {
    if (Blind()) await pline(`You sense ${line}`);
    else await pline(`You see ${line}`);
}

/**
 * C ref: do_name.c hcolor — identity when not hallucinating.
 * Hallucination display-rng hcolors[] synonyms deferred.
 */
function hcolor_apply(colorpref) {
    return colorpref || 'colorless';
}

/**
 * C ref: apply.c flip_through_book — apply a spellbook (including blank /
 * novel / Book of the Dead). Underwater is ECMD_OK (no time); else TIME.
 * Named omit: Soundeffect rustling; Unaware You_hear/You_see prefixes;
 * Hallucination hcolor display-rng.
 * @returns {Promise<number>} ECMD_OK or ECMD_TIME
 */
export async function flip_through_book(obj) {
    if (!obj) return ECMD_FAIL;
    if (Underwater_hero()) {
        await pline("You don't want to get the pages even more soggy, do you?");
        return ECMD_OK;
    }

    await pline(`You flip through the pages of ${thesimpleoname(obj)}.`);

    if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
        if (!Deaf_hero()) {
            // C: Soundeffect(se_rustling_paper, 50) when !Hallucination — omit
            const sound = Hallucination() ? 'chuckling' : 'rustling';
            await You_hear_apply(
                `the pages make an unpleasant ${sound} sound.`,
            );
        } else if (!Blind()) {
            await You_see_apply(
                `the pages glow faintly ${hcolor_apply(NH_RED)}.`,
            );
        } else {
            await You_feel('the pages tremble.');
        }
    } else if (Blind()) {
        await pline(`The pages feel ${Hallucination() ? 'freshly picked' : 'rough and dry'}.`);
    } else if (obj.otyp === SPE_BLANK_PAPER) {
        await pline(`This spellbook ${Hallucination()
            ? "doesn't have much of a plot"
            : 'has nothing written in it'}.`);
        makeknown(obj.otyp);
    } else if (Hallucination()) {
        await pline('You enjoy the animated initials.');
    } else if (obj.otyp === SPE_NOVEL) {
        await pline('This looks like it might be interesting to read.');
    } else {
        const findx = Math.min(obj.spestudied | 0, MAX_SPELL_STUDY);
        const magic = game.objects?.[obj.otyp]?.oc_magic ? ' magical' : '';
        await pline(
            `The${magic} ink in this spellbook is ${SPELLBOOK_FADENESS[findx]}.`,
        );
    }

    return ECMD_TIME;
}

/**
 * C ref: apply.c flip_coin — apply gold. Lose if Underwater else Glib /
 * Fumbling / (DEX<10 && !rn2(DEX)); split 1 then dropx. Else hallu
 * rn2(100) double-header vs edge, or rn2(2) heads/tails.
 * @returns {Promise<number>} ECMD_TIME
 */
export async function flip_coin(obj) {
    if (!obj) return ECMD_FAIL;
    let otmp = obj;
    let lose_coin = false;

    await pline(`You flip ${an(singular(obj, xname))}.`);
    if (Underwater_hero()) {
        await pline('It tumbles away.');
        lose_coin = true;
    } else if (Glib_apply() || Fumbling()
        || (acurr(A_DEX) < 10 && !rn2(acurr(A_DEX)))) {
        await pline(
            `It slips between your ${fingers_or_gloves_apply(false)}.`,
        );
        lose_coin = true;
    }

    if (lose_coin) {
        if ((otmp.quan | 0) > 1) {
            const split = splitobj(otmp, 1);
            if (split) otmp = split;
        }
        await dropx(otmp);
        return ECMD_TIME;
    }
    if (Hallucination()) {
        await pline(rn2(100)
            ? 'Wow, a double header!'
            : 'The coin miraculously lands on its edge!');
    } else {
        await pline(`It comes up ${rn2(2) ? 'heads' : 'tails'}.`);
    }
    return ECMD_TIME;
}

/** C objnam.c Tobjnam — The(xname) + otense (use_grease). */
function Tobjnam_grease(obj, verb) {
    if ((obj?.quan | 0) !== 1) return `${The(xname(obj))} ${verb}`;
    return `${The(xname(obj))} ${vtense(null, verb)}`;
}

/**
 * C ref: do_wear.c inaccessible_equipment predicate (no messages).
 * Worn suit under cloak, shirt under suit/cloak, ring under gloves.
 */
export function equipment_is_inaccessible(obj, only_if_known_cursed) {
    if (!obj || !obj.owornmask) return false;
    const u = game.u || {};
    const anycovering = !only_if_known_cursed;
    const blocks = (x) => !!(x && (anycovering || (x.cursed && x.bknown)));
    if (obj === u.uarm && u.uarmc && blocks(u.uarmc)) return true;
    if (obj === u.uarmu
        && ((u.uarm && blocks(u.uarm)) || (u.uarmc && blocks(u.uarmc)))) {
        return true;
    }
    if ((obj === u.uleft || obj === u.uright) && u.uarmg && blocks(u.uarmg)) {
        return true;
    }
    return false;
}

/**
 * C ref: do_wear.c inaccessible_equipment — messages when verb is set.
 * Named omit: shk_owns shop prefix (unpaid / floor costly).
 */
export async function inaccessible_equipment(obj, verb, only_if_known_cursed) {
    if (!equipment_is_inaccessible(obj, only_if_known_cursed)) return false;
    if (!verb) return true;
    const u = game.u || {};
    const anycovering = !only_if_known_cursed;
    const blocks = (x) => !!(x && (anycovering || (x.cursed && x.bknown)));
    if (obj === u.uarm && u.uarmc && blocks(u.uarmc)) {
        await pline(
            `You need to take off ${yname(u.uarmc)} to ${verb} ${yname(obj)}.`,
        );
        return true;
    }
    if (obj === u.uarmu
        && ((u.uarm && blocks(u.uarm)) || (u.uarmc && blocks(u.uarmc)))) {
        const sameprefix = !!(u.uarm && u.uarmc
            && shk_your(u.uarmc) === shk_your(u.uarm));
        let buf = '';
        if (u.uarmc) buf += yname(u.uarmc);
        if (u.uarm && u.uarmc) buf += ' and ';
        if (u.uarm) buf += sameprefix ? xname(u.uarm) : yname(u.uarm);
        await pline(`You need to take off ${buf} to ${verb} ${yname(obj)}.`);
        return true;
    }
    if ((obj === u.uleft || obj === u.uright) && u.uarmg && blocks(u.uarmg)) {
        await pline(
            `You need to take off ${yname(u.uarmg)} to ${verb} ${yname(obj)}.`,
        );
        return true;
    }
    return true;
}

/**
 * C ref: apply.c grease_ok — null (hands '-') SUGGEST; COIN_CLASS EXCLUDE
 * (const.js GETOBJ_EXCLUDE = -3); inaccessible_equipment
 * EXCLUDE_INACCESS; else SUGGEST. sit.c special_throne_effect grease
 * spray uses the same COIN_CLASS skip (D-1033/D-1683).
 */
function grease_ok(obj) {
    if (!obj) return GETOBJ_SUGGEST;
    if (obj.oclass === COIN_CLASS) return GETOBJ_EXCLUDE_C;
    if (equipment_is_inaccessible(obj, false)) return GETOBJ_EXCLUDE_INACCESS;
    return GETOBJ_SUGGEST;
}

/**
 * C ref: apply.c use_grease `:2603–2654` — Glib / cursed|Fumbling slip
 * dropx; getobj("grease", grease_ok, GETOBJ_PROMPT); hands make_glib
 * rn1(11,5); object greased + cursed && !nohands glib rn1(6,10); empty
 * known/seem; trailing update_inventory (`:2652`). consume_obj_charge
 * known update_inventory is D-1615. sit.c grease spray is D-1683.
 * Named omit: shk_owns in inaccessible_equipment.
 * @returns {number} ECMD_*
 */
export async function use_grease(obj) {
    if (!obj) return ECMD_OK;

    if (Glib()) {
        await pline(
            `${Tobjnam(obj, 'slip')} from your ${fingers_or_gloves_apply(false)}.`,
        );
        await dropx(obj);
        return ECMD_TIME;
    }

    if ((obj.spe | 0) > 0) {
        if ((obj.cursed || Fumbling()) && !rn2(2)) {
            await consume_obj_charge(obj, true);
            await pline(
                `${Tobjnam(obj, 'slip')} from your ${fingers_or_gloves_apply(false)}.`,
            );
            await dropx(obj);
            return ECMD_TIME;
        }
        const otmp = await getobj('grease', grease_ok, GETOBJ_PROMPT);
        if (!otmp) return ECMD_CANCEL;
        if (await inaccessible_equipment(otmp, 'grease', false)) {
            return ECMD_OK;
        }
        await consume_obj_charge(obj, true);

        const oldglib = Glib() & TIMEOUT;
        if (otmp !== hands_obj) {
            await pline(
                `You cover ${yname(otmp)} with a thick layer of grease.`,
            );
            otmp.greased = 1;
            if (obj.cursed && !nohands(game.youmonst?.data)) {
                make_glib(oldglib + rn1(6, 10)); /* + 10..15 */
                await pline(
                    `Some of the grease gets all over your ${fingers_or_gloves_apply(true)}.`,
                );
            }
        } else {
            make_glib(oldglib + rn1(11, 5)); /* + 5..15 */
            await pline(
                `You coat your ${fingers_or_gloves_apply(true)} with grease.`,
            );
        }
    } else if (obj.known) {
        await pline(`${Tobjnam(obj, 'are')} empty.`);
    } else {
        await pline(`${Tobjnam(obj, 'seem')} to be empty.`);
    }
    update_inventory();
    return ECMD_TIME;
}

/**
 * C ref: apply.c use_tinning_kit — spe<=0; floorfood("tin",2); oeaten;
 * touch_petrifies instapetrify; rider revive_corpse; cnutrit 0;
 * consume_obj_charge; mksobj(TIN,FALSE,FALSE) homemade; shop verbalize;
 * useup/useupf; hold_another_object. doapply does not assign res
 * (stays ECMD_TIME). Named omit: SetVoice; will_feel_cockatrice
 * (in floorfood); arti_speak.
 */
export async function use_tinning_kit(obj) {
    if (!obj) return;
    if ((obj.spe | 0) <= 0) {
        await pline('You seem to be out of tins.');
        return;
    }
    const corpse = await floorfood('tin', 2);
    if (!corpse) return;
    if (corpse.oeaten) {
        await pline('You cannot tin something which is partly eaten.');
        return;
    }
    const mptr = mons(corpse.corpsenm);
    if (touch_petrifies(mptr) && !Stone_resistance_apply() && !game.u?.uarmg) {
        const corpse_name = an(cxname(corpse));
        let kbuf = '';
        if (poly_when_stoned(game.youmonst?.data)) {
            await pline(`You tin ${corpse_name} without wearing gloves.`);
            kbuf = '';
        } else {
            await pline(
                `Tinning ${corpse_name} without wearing gloves is a fatal mistake...`,
            );
            kbuf = `trying to tin ${corpse_name} without gloves`;
        }
        await instapetrify(kbuf);
    }
    if (is_rider(mptr)) {
        if (await revive_corpse(corpse)) {
            await verbalize(
                'Yes...  But War does not preserve its enemies...',
            );
        } else {
            await pline('The corpse evades your grasp.');
        }
        return;
    }
    if (!mptr || (mptr.cnutrit | 0) === 0) {
        await pline("That's too insubstantial to tin.");
        return;
    }
    await consume_obj_charge(obj, true);

    const can = mksobj(TIN, false, false);
    if (can) {
        const you_buy_it = 'You tin it, you bought it!';
        can.corpsenm = corpse.corpsenm;
        can.cursed = obj.cursed;
        can.blessed = obj.blessed;
        can.owt = weight(can);
        can.known = 1;
        set_tin_variety(can, HOMEMADE_TIN);
        if (carried(corpse)) {
            if (corpse.unpaid) {
                const rooms = in_rooms(game.u?.ux | 0, game.u?.uy | 0, SHOPBASE);
                shop_keeper(rooms.charCodeAt(0));
                await verbalize(you_buy_it);
            }
            useup(corpse);
        } else {
            if (costly_spot(corpse.ox | 0, corpse.oy | 0) && !corpse.no_charge) {
                const rooms = in_rooms(corpse.ox | 0, corpse.oy | 0, SHOPBASE);
                shop_keeper(rooms.charCodeAt(0));
                await verbalize(you_buy_it);
            }
            useupf(corpse, 1);
        }
        await hold_another_object(
            can, 'You make, but cannot pick up, %s.', doname(can), null,
        );
    }
}

/**
 * C ref: apply.c doapply() — nohands + check_capacity before getobj;
 * LOCK_PICK/key/STETHOSCOPE + MIRROR/CAMERA + sack/bag use_container +
 * musical instruments + cream pie + MAGIC_MARKER→dowrite + TIN_OPENER +
 * WAND_CLASS → do_break_wand (D-0949 explode-type / D-0950 dig+create /
 * D-0952 strike/cancel/poly/tele/undead bhit + WAN_LIGHT) +
 * SPBOOK_CLASS → flip_through_book / COIN_CLASS → flip_coin (D-1024) +
 * is_pick/is_axe → use_pick_axe (D-0951) + LEASH → use_leash (D-1005) +
 * SADDLE → use_saddle (D-1008) +
 * TIN_WHISTLE / MAGIC_WHISTLE / EUCALYPTUS_LEAF whistle arms (D-1007) +
 * TOWEL → use_towel (D-1009) +
 * CRYSTAL_BALL → use_crystal_ball (D-1010) +
 * BLINDFOLD / LENSES → Blindf_on/off (D-1013) +
 * graystone LUCKSTONE/LOADSTONE/TOUCHSTONE/FLINT → use_stone (D-1014) +
 * LUMP_OF_ROYAL_JELLY → use_royal_jelly (D-1021) +
 * BULLWHIP → use_whip / GRAPPLING_HOOK → use_grapple / is_pole → use_pole
 * (D-1022) + `u_wipe_engr` / pole·grapple·jump `tmp_at` S_goodpos (D-1051) +
 * OIL_LAMP/MAGIC_LAMP/BRASS_LANTERN → use_lamp / POT_OIL → light_cocktail +
 * LAND_MINE/BEARTRAP → use_trap / BAG_OF_TRICKS → bagotricks (D-1023) +
 * CANDELABRUM_OF_INVOCATION → use_candelabrum /
 * WAX_CANDLE/TALLOW_CANDLE → use_candle (D-1025) +
 * CAN_OF_GREASE → use_grease (D-1026) +
 * TINNING_KIT → use_tinning_kit (D-1027) +
 * BELL / BELL_OF_OPENING → use_bell (D-1028) +
 * FIGURINE → use_figurine (D-1029) + fig_transform / attach_fig_transform_timeout (D-1032) +
 * UNICORN_HORN → use_unicorn_horn (D-1030) +
 * HORN_OF_PLENTY → hornoplenty (D-1031).
 * Named omissions: retouch_object;
 * Medusa/nymph mirror arms;
 * shop check_unpaid / lamp-oil verbalize; pickup invent getobj tip;
 * break-wand release_hold / flash_hits (D-0979);
 * pickinv handsbuf;
 * getdir mouse.
 * @returns {boolean} true if the command took time (ECMD_TIME)
 */
export async function doapply() {
    // C ref: apply.c doapply — nohands + check_capacity((char *)0) before getobj
    if (nohands(game.youmonst?.data)) {
        await pline("You aren't able to use or apply tools in your current form.");
        return false; // ECMD_OK
    }
    // C ref: hack.c check_capacity — near_capacity >= EXT_ENCUMBER
    if (near_capacity() >= EXT_ENCUMBER) {
        await pline("You can't do that while carrying so much stuff.");
        return false; // ECMD_OK
    }

    // C doapply: struct obj *obj is mutated via &obj (light_cocktail, …)
    let obj = await getobj_apply();
    if (!obj) return false;

    // C: WAND_CLASS → do_break_wand (before tool cases in C after getobj)
    if (obj.oclass === WAND_CLASS) {
        const res = await do_break_wand(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c: SPBOOK_CLASS → flip_through_book (D-1024)
    if (obj.oclass === SPBOOK_CLASS) {
        const res = await flip_through_book(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c: COIN_CLASS → flip_coin (D-1024)
    if (obj.oclass === COIN_CLASS) {
        const res = await flip_coin(obj);
        return (res & ECMD_TIME) !== 0;
    }

    if (obj.otyp === LOCK_PICK || obj.otyp === SKELETON_KEY
        || obj.otyp === CREDIT_CARD) {
        // C: res = (pick_lock(...) != 0) ? ECMD_TIME : ECMD_OK
        const pl = await pick_lock(obj);
        return pl !== 0;
    }

    if (obj.otyp === STETHOSCOPE) {
        const res = await use_stethoscope(obj);
        return res > 0; // ECMD_TIME only
    }

    // C apply.c case MIRROR → use_mirror (D-0736)
    if (obj.otyp === MIRROR) {
        const res = await use_mirror(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case EXPENSIVE_CAMERA → use_camera (D-0736 partial)
    if (obj.otyp === EXPENSIVE_CAMERA) {
        const res = await use_camera(obj);
        return res === ECMD_TIME;
    }

    // C: SACK / BAG_OF_HOLDING / OILSKIN_SACK → use_container(&obj, TRUE, FALSE)
    if (obj.otyp === SACK || obj.otyp === OILSKIN_SACK
        || obj.otyp === BAG_OF_HOLDING
        || obj.otyp === LARGE_BOX || obj.otyp === CHEST
        || obj.otyp === ICE_BOX) {
        const { use_container } = await import('./pickup.js');
        const { ECMD_TIME } = await import('./const.js');
        const res = await use_container(obj, true, false);
        return res === ECMD_TIME;
    }
    if (obj.otyp === BAG_OF_TRICKS) {
        // C apply.c case BAG_OF_TRICKS → bagotricks(obj, FALSE, NULL)
        await bagotricks(obj, false, null);
        return true; // ECMD_TIME
    }

    // C apply.c case CAN_OF_GREASE → use_grease (D-1026)
    if (CAN_OF_GREASE >= 0 && obj.otyp === CAN_OF_GREASE) {
        const res = await use_grease(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c: WOODEN_FLUTE..DRUM_OF_EARTHQUAKE → do_play_instrument
    if (obj.otyp === WOODEN_FLUTE || obj.otyp === MAGIC_FLUTE
        || obj.otyp === TOOLED_HORN || obj.otyp === FROST_HORN
        || obj.otyp === FIRE_HORN || obj.otyp === WOODEN_HARP
        || obj.otyp === MAGIC_HARP || obj.otyp === BUGLE
        || obj.otyp === LEATHER_DRUM || obj.otyp === DRUM_OF_EARTHQUAKE) {
        const { do_play_instrument } = await import('./music.js');
        const { ECMD_TIME } = await import('./const.js');
        const res = await do_play_instrument(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case CREAM_PIE → use_cream_pie (D-0711)
    if (obj.otyp === CREAM_PIE) {
        const res = await use_cream_pie(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case MAGIC_MARKER → dowrite (D-0742)
    if (obj.otyp === MAGIC_MARKER) {
        const { dowrite } = await import('./write.js');
        const res = await dowrite(obj);
        return res === ECMD_TIME;
    }

    // C apply.c case TIN_OPENER → use_tin_opener (D-0940)
    if (obj.otyp === TIN_OPENER) {
        const res = await use_tin_opener(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c PICK_AXE/DWARVISH_MATTOCK + default is_pick|is_axe (D-0951)
    if (is_pick(obj) || is_axe(obj)) {
        const { use_pick_axe } = await import('./dig.js');
        const res = await use_pick_axe(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case TINNING_KIT → use_tinning_kit (D-1027); res stays TIME
    if (TINNING_KIT >= 0 && obj.otyp === TINNING_KIT) {
        await use_tinning_kit(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case LEASH → use_leash (D-1005)
    if (LEASH >= 0 && obj.otyp === LEASH) {
        const res = await use_leash(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case SADDLE → use_saddle (D-1008)
    if (SADDLE >= 0 && obj.otyp === SADDLE) {
        const { use_saddle } = await import('./steed.js');
        const res = await use_saddle(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case MAGIC_WHISTLE / TIN_WHISTLE (D-1007)
    if (MAGIC_WHISTLE >= 0 && obj.otyp === MAGIC_WHISTLE) {
        await use_magic_whistle(obj);
        return true; // ECMD_TIME
    }
    if (TIN_WHISTLE >= 0 && obj.otyp === TIN_WHISTLE) {
        await use_whistle(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case EUCALYPTUS_LEAF → blessed magic / else tin whistle
    if (obj.otyp === EUCALYPTUS_LEAF) {
        if (obj.blessed) {
            await use_magic_whistle(obj);
            if (!rn2(49)) {
                const Blind = !!(game.u?.Blind || game.u?.ublind
                    || ((game.u?.HBlinded | 0) & TIMEOUT));
                if (!Blind) {
                    await pline(
                        `${Yobjnam2_apply(obj, 'glow')} brown.`,
                    );
                    obj.bknown = 1;
                }
                unbless(obj);
            }
        } else {
            await use_whistle(obj);
        }
        return true; // ECMD_TIME
    }

    // C apply.c case TOWEL → use_towel (D-1009)
    if (TOWEL >= 0 && obj.otyp === TOWEL) {
        const res = await use_towel(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case CRYSTAL_BALL → use_crystal_ball (D-1010)
    if (CRYSTAL_BALL >= 0 && obj.otyp === CRYSTAL_BALL) {
        const { use_crystal_ball } = await import('./detect.js');
        await use_crystal_ball(obj);
        return true; // ECMD_TIME (doapply res defaults to TIME)
    }

    // C apply.c case BLINDFOLD / LENSES → Blindf_on / Blindf_off (D-1013)
    // res stays ECMD_TIME even when cursed / already-wearing (C default).
    if ((BLINDFOLD >= 0 && obj.otyp === BLINDFOLD)
        || (LENSES >= 0 && obj.otyp === LENSES)) {
        const u = game.u || (game.u = {});
        if (obj === u.ublindf) {
            if (!cursed_check(obj)) {
                await Blindf_off(obj);
            } else {
                await pline(
                    game._cursed_takeoff_msg || "You can't.  It is cursed.",
                );
            }
        } else if (!u.ublindf) {
            await Blindf_on(obj);
        } else {
            const worn = u.ublindf;
            const already = (TOWEL >= 0 && worn.otyp === TOWEL)
                ? 'covered by a towel'
                : (BLINDFOLD >= 0 && worn.otyp === BLINDFOLD)
                    ? 'wearing a blindfold'
                    : 'wearing lenses';
            await pline(`You are already ${already}.`);
        }
        return true; // ECMD_TIME
    }

    // C apply.c case LUCKSTONE/LOADSTONE/TOUCHSTONE/FLINT → use_stone (D-1014)
    if (is_graystone(obj)) {
        const res = await use_stone(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case LUMP_OF_ROYAL_JELLY → use_royal_jelly (D-1021)
    if (obj.otyp === LUMP_OF_ROYAL_JELLY) {
        const res = await use_royal_jelly(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case BULLWHIP → use_whip (D-1022)
    if (obj.otyp === BULLWHIP) {
        const res = await use_whip(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case GRAPPLING_HOOK → use_grapple (D-1022)
    if (GRAPPLING_HOOK >= 0 && obj.otyp === GRAPPLING_HOOK) {
        const res = await use_grapple(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case BELL / BELL_OF_OPENING → use_bell (D-1028); res stays TIME
    if ((BELL >= 0 && obj.otyp === BELL)
        || (BELL_OF_OPENING >= 0 && obj.otyp === BELL_OF_OPENING)) {
        await use_bell(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case FIGURINE → use_figurine (D-1029)
    if (FIGURINE >= 0 && obj.otyp === FIGURINE) {
        const res = await use_figurine(obj);
        return (res & ECMD_TIME) !== 0;
    }

    // C apply.c case UNICORN_HORN → use_unicorn_horn (D-1030); res stays TIME
    if (UNICORN_HORN >= 0 && obj.otyp === UNICORN_HORN) {
        await use_unicorn_horn(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case HORN_OF_PLENTY → hornoplenty(obj, FALSE, NULL) (D-1031)
    if (HORN_OF_PLENTY >= 0 && obj.otyp === HORN_OF_PLENTY) {
        await hornoplenty(obj, false, null);
        return true; // ECMD_TIME
    }

    // C apply.c case CANDELABRUM_OF_INVOCATION → use_candelabrum (D-1025)
    if (CANDELABRUM_OF_INVOCATION >= 0
        && obj.otyp === CANDELABRUM_OF_INVOCATION) {
        await use_candelabrum(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case WAX_CANDLE / TALLOW_CANDLE → use_candle (D-1025)
    if ((WAX_CANDLE >= 0 && obj.otyp === WAX_CANDLE)
        || (TALLOW_CANDLE >= 0 && obj.otyp === TALLOW_CANDLE)) {
        await use_candle(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case OIL_LAMP / MAGIC_LAMP / BRASS_LANTERN → use_lamp (D-1023)
    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN) {
        await use_lamp(obj);
        return true; // ECMD_TIME
    }

    // C apply.c case POT_OIL → light_cocktail(&obj) (D-1023 / D-1046)
    if (obj.otyp === POT_OIL) {
        const optr = { obj };
        await light_cocktail(optr);
        obj = optr.obj;
        return true; // ECMD_TIME
    }

    // C apply.c case LAND_MINE / BEARTRAP → use_trap (D-1023)
    if ((LAND_MINE >= 0 && obj.otyp === LAND_MINE)
        || (BEARTRAP >= 0 && obj.otyp === BEARTRAP)) {
        await use_trap(obj);
        return true; // ECMD_TIME
    }

    // C apply.c default is_pole → use_pole(obj, FALSE) (D-1022)
    if (is_pole(obj)) {
        const res = await use_pole(obj, false);
        return (res & ECMD_TIME) !== 0;
    }

    // Other apply otyps deferred
    await pline("Sorry, I don't know how to use that.");
    return false;
}

/** C invent.c plur — quan!=1 → "s". */
function plur_quan(quan) {
    return (quan | 0) !== 1 ? 's' : '';
}

/** C obj.h is_flimsy — material ≤ LEATHER or rubber hose. */
function is_flimsy_stone(otmp) {
    if (!otmp) return false;
    const mat = game.objects?.[otmp.otyp]?.oc_material ?? 0;
    return mat <= MAT_LEATHER || otmp.otyp === RUBBER_HOSE;
}

/** C objnam.c otense / Tobjnam — for use_stone polish/wet msgs. */
function otense_stone(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}
function Tobjnam_stone(obj, verb) {
    const bp = The(xname(obj));
    return verb ? `${bp} ${otense_stone(obj, verb)}` : bp;
}

/** C role.h Role_if / Race_if — touchstone identify gate. */
function Role_if_stone(pm) {
    return (game.urole?.mnum | 0) === pm;
}
function Race_if_stone(pm) {
    return (game.urace?.mnum | 0) === pm;
}

/**
 * C ref: invent.c useup — invent consume one (no obj_resists).
 * Used when cursed touchstone shatters a gem.
 */
function useup_stone(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        return;
    }
    const u = game.u || {};
    if (u.uwep === otmp) u.uwep = null;
    if (u.uswapwep === otmp) u.uswapwep = null;
    if (u.uqwep === otmp) u.uqwep = null;
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    otmp.quan = 0;
    otmp.where = OBJ_FREE;
}

/**
 * C ref: apply.c touchstone_ok — coins + unidentified gems SUGGEST;
 * else DOWNPLAY (identified gems still selectable).
 */
function touchstone_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.oclass === COIN_CLASS) return GETOBJ_SUGGEST;
    if (obj.oclass === GEM_CLASS
        && !(obj.dknown && game.objects?.[obj.otyp]?.oc_name_known)) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_DOWNPLAY;
}

/** C invent.c any_obj_ok — every invent item SUGGEST. */
function any_obj_ok_stone(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    return GETOBJ_SUGGEST;
}

/**
 * C ref: invent.c getobj(stonebuf, touchstone_ok|any_obj_ok, GETOBJ_PROMPT)
 * for use_stone second-object pick. DOWNPLAY letters accepted; EXCLUDE not.
 */
async function getobj_rub_on_stone(stonebuf, okfn) {
    const cq = getobj_from_cmdq(okfn, false);
    if (!cq.skip) return cq.otmp;

    const suggest_lets = () => {
        const lets = [];
        for (const o of game.invent || []) {
            if (o?.invlet && okfn(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
        }
        return lets.join('');
    };
    const has_downplay = () => {
        for (const o of game.invent || []) {
            if (okfn(o) === GETOBJ_DOWNPLAY) return true;
        }
        return false;
    };

    for (;;) {
        await flush_topl_more();
        const rawLets = suggest_lets();
        if (!rawLets && !has_downplay()) {
            await pline("You don't have anything to use.");
            return null;
        }
        const lets = rawLets.length > 5 ? compactify_invlets(rawLets) : rawLets;
        const query = lets
            ? `What do you want to ${stonebuf}? [${lets} or ?*]`
            : `What do you want to ${stonebuf}? [*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            const counted = { cnt: 0, cntgiven: false };
            const ilet = await getobj_display_pickinv(
                ch, rawLets, false, counted,
                { word: stonebuf, allownone: false, promptHasHands: false },
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) {
                if (game.iflags?.force_invmenu) return null;
                continue;
            }
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            const rank = okfn(picked);
            if (rank === GETOBJ_EXCLUDE) {
                await pline('That is a silly thing to rub.');
                return null;
            }
            game._pending_message = '';
            getobj_record_repeat(picked, ilet);
            return picked;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        const rank = okfn(otmp);
        if (rank === GETOBJ_EXCLUDE) {
            await pline('That is a silly thing to rub.');
            return null;
        }
        game._pending_message = '';
        getobj_record_repeat(otmp, ch);
        return otmp;
    }
}

/**
 * C ref: apply.c use_stone — graystone / touchstone rub.
 * Branch envelope: observe_object; getobj touchstone_ok|any_obj_ok;
 * self-rub refuse; cursed touchstone shatter gem via obj_resists(80,100);
 * Blind scritch / Hallu fractals; GEM/RING identify for Arc/Gnome/blessed;
 * cloth/liquid/wax/wood/gold/silver/flimsy streak msgs.
 * Named omissions: none for ordinary streak path; shop costly_alteration N/A.
 * @returns {number} ECMD_*
 */
async function use_stone(tstone) {
    const scritch = '"scritch, scritch"';
    const Blind_now = Blind();
    if (!Blind_now) observe_object(tstone);

    const known = tstone.otyp === TOUCHSTONE && tstone.dknown
        && !!game.objects?.[TOUCHSTONE]?.oc_name_known;
    const stonebuf = `rub on the stone${plur_quan(tstone.quan)}`;
    const obj = await getobj_rub_on_stone(
        stonebuf,
        known ? touchstone_ok : any_obj_ok_stone,
    );
    if (!obj) return ECMD_CANCEL;

    if (obj === tstone && (obj.quan || 1) === 1) {
        await pline(`You can't rub ${the(xname(obj))} on itself.`);
        return ECMD_OK;
    }

    if (tstone.otyp === TOUCHSTONE && tstone.cursed
        && obj.oclass === GEM_CLASS && !is_graystone(obj)
        && !obj_resists(obj, 80, 100)) {
        if (Blind()) {
            await You_feel('something shatter.');
        } else if (game.u?.Hallucination) {
            await pline('Oh, wow, look at the pretty shards.');
        } else {
            await pline(
                `A sharp crack shatters ${(obj.quan || 1) > 1 ? 'one of ' : ''}`
                + `${the(xname(obj))}.`,
            );
        }
        useup_stone(obj);
        return ECMD_TIME;
    }

    if (Blind()) {
        await pline(scritch);
        return ECMD_TIME;
    }
    if (game.u?.Hallucination) {
        await pline('Oh wow, man: Fractals!');
        return ECMD_TIME;
    }

    let do_scratch = false;
    let streak_color = null;
    let oclass = obj.oclass;
    const oc = game.objects?.[obj.otyp];
    const mat = oc?.oc_material ?? 0;

    // prevent non-gemstone rings from being treated like gems
    if (oclass === RING_CLASS
        && mat !== MAT_GEMSTONE && mat !== MAT_MINERAL) {
        oclass = RANDOM_CLASS;
    }

    switch (oclass) {
    case GEM_CLASS:
    case RING_CLASS:
        if (tstone.otyp !== TOUCHSTONE) {
            do_scratch = true;
        } else if (obj.oclass === GEM_CLASS
            && (tstone.blessed
                || (!tstone.cursed
                    && (Role_if_stone(PM_ARCHEOLOGIST)
                        || Race_if_stone(PM_GNOME))))) {
            makeknown(TOUCHSTONE);
            makeknown(obj.otyp);
            await prinv(null, obj, 0);
            return ECMD_TIME;
        } else {
            if (mat === MAT_GLASS) {
                do_scratch = true;
                break;
            }
        }
        streak_color = C_OBJ_COLORS[oc?.oc_color ?? 0] || null;
        break;

    default:
        switch (mat) {
        case MAT_CLOTH:
            await pline(`${Tobjnam_stone(tstone, 'look')} a little more polished now.`);
            return ECMD_TIME;
        case MAT_LIQUID:
            if (!obj.known) {
                await pline('You must think this is a wetstone, do you?');
            } else {
                await pline(`${Tobjnam_stone(tstone, 'are')} a little wetter now.`);
            }
            return ECMD_TIME;
        case MAT_WAX:
            streak_color = 'waxy';
            break;
        case MAT_WOOD:
            streak_color = 'wooden';
            break;
        case MAT_GOLD:
            do_scratch = true;
            streak_color = 'golden';
            break;
        case MAT_SILVER:
            do_scratch = true;
            streak_color = 'silvery';
            break;
        default:
            if (is_flimsy_stone(obj)) {
                streak_color = C_OBJ_COLORS[oc?.oc_color ?? 0] || null;
            } else {
                do_scratch = tstone.otyp !== TOUCHSTONE;
            }
            break;
        }
        break;
    }

    const stones = `stone${plur_quan(tstone.quan)}`;
    if (do_scratch) {
        await pline(
            `You make ${streak_color ? streak_color : ''}`
            + `${streak_color ? ' ' : ''}scratch marks on the ${stones}.`,
        );
    } else if (streak_color) {
        await pline(`You see ${streak_color} streaks on the ${stones}.`);
    } else {
        await pline(scritch);
    }
    return ECMD_TIME;
}

/** C ref: apply.c jelly_ok — eggs SUGGEST; else EXCLUDE. */
function jelly_ok(obj) {
    if (obj && obj.otyp === EGG) return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

/**
 * C ref: invent.c getobj("rub the royal jelly on", jelly_ok, GETOBJ_PROMPT).
 * Prompt even with no eggs. Canned KEY live; CMDQ_INT aborts (!ALLOWCNT).
 */
async function getobj_jelly() {
    const word = 'rub the royal jelly on';
    const cq = getobj_from_cmdq(jelly_ok, false);
    if (!cq.skip) return cq.otmp;

    const suggest_lets = () => {
        const lets = [];
        for (const o of game.invent || []) {
            if (o?.invlet && jelly_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
        }
        return lets.join('');
    };

    for (;;) {
        await flush_topl_more();
        const rawLets = suggest_lets();
        // C GETOBJ_PROMPT: still ask when suggested==0
        const lets = rawLets.length > 5 ? compactify_invlets(rawLets) : rawLets;
        const query = lets
            ? `What do you want to ${word}? [${lets} or ?*]`
            : `What do you want to ${word}? [*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            const counted = { cnt: 0, cntgiven: false };
            const ilet = await getobj_display_pickinv(
                ch, rawLets, false, counted,
                { word, allownone: false, promptHasHands: false },
            );
            if (ilet === '\x1b') {
                if (game.flags?.verbose !== false) await pline('Never mind.');
                return null;
            }
            if (!ilet) {
                if (game.iflags?.force_invmenu) return null;
                continue;
            }
            const picked = (game.invent || []).find((o) => o.invlet === ilet);
            if (!picked) {
                await pline("You don't have that object.");
                continue;
            }
            const rank = jelly_ok(picked);
            if (rank === GETOBJ_EXCLUDE) {
                await pline(`That is a silly thing to ${word}.`);
                return null;
            }
            game._pending_message = '';
            getobj_record_repeat(picked, ilet);
            return picked;
        }
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            await pline("You don't have that object.");
            continue;
        }
        const rank = jelly_ok(otmp);
        if (rank === GETOBJ_EXCLUDE) {
            await pline(`That is a silly thing to ${word}.`);
            return null;
        }
        game._pending_message = '';
        getobj_record_repeat(otmp, ch);
        return otmp;
    }
}

/** C ref: invent.c freeinv — drop from invent[]; where=OBJ_FREE. */
function freeinv_jelly(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.where = OBJ_FREE;
    obj.pickup_prev = 0;
}

/**
 * C ref: mkobj.c unsplitobj — OBJ_FREE/FLOOR return null. After
 * use_royal_jelly freeinv the lump is OBJ_FREE so cancel is a no-op
 * (C same: stack quan already reduced).
 */
function unsplitobj_jelly(obj) {
    if (!obj || obj.where !== OBJ_INVENT) return null;
    const split = game.context?.objsplit;
    if (!split) return null;
    let parent = null;
    let child = null;
    if (obj.o_id === split.child_oid) {
        child = obj;
        parent = (game.invent || []).find((o) => o.o_id === split.parent_oid);
    } else if (obj.o_id === split.parent_oid) {
        parent = obj;
        child = (game.invent || []).find((o) => o.o_id === split.child_oid);
    }
    if (!parent || !child || parent === child) return null;
    parent.quan = (parent.quan | 0) + (child.quan | 0);
    const inv = game.invent || [];
    const idx = inv.indexOf(child);
    if (idx >= 0) inv.splice(idx, 1);
    child.where = OBJ_FREE;
    child.quan = 0;
    return parent;
}

/**
 * C ref: apply.c use_royal_jelly — split/freeinv; getobj egg; killer→queen;
 * cursed kill_egg; else attach_egg_hatch_timeout + blessed spe=2; obfree lump.
 * Named omit: update_inventory redraw.
 * @returns {number} ECMD_CANCEL | ECMD_TIME
 */
async function use_royal_jelly(obj) {
    const splitit = (obj.quan || 1) > 1;
    let lump = obj;
    if (splitit) {
        const child = splitobj(obj, 1);
        if (child) lump = child;
    }
    // C: freeinv so the lump is not offered as a self-rub choice
    freeinv_jelly(lump);

    const eobj = await getobj_jelly();
    if (!eobj) {
        if (splitit) {
            unsplitobj_jelly(lump);
        } else {
            const { addinv_nomerge } = await import('./u_init.js');
            await addinv_nomerge(lump);
        }
        return ECMD_CANCEL;
    }

    await pline(`You smear royal jelly all over ${yname(eobj)}.`);
    if (eobj.otyp !== EGG) {
        await pline(nothing_happens);
        setnotworn(lump);
        lump.quan = 0;
        lump.where = OBJ_FREE;
        return ECMD_TIME;
    }

    const oldcorpsenm = eobj.corpsenm ?? NON_PM;
    if ((eobj.corpsenm ?? NON_PM) === PM_KILLER_BEE) {
        eobj.corpsenm = PM_QUEEN_BEE;
    }

    if (lump.cursed) {
        if ((eobj.timed | 0) || (eobj.corpsenm ?? NON_PM) !== oldcorpsenm) {
            await pline(
                `The ${xname(eobj)} ${otense_stone(eobj, 'quiver')} feebly.`,
            );
        } else {
            await pline(nothing_seems_to_happen);
        }
        kill_egg(eobj);
        setnotworn(lump);
        lump.quan = 0;
        lump.where = OBJ_FREE;
        return ECMD_TIME;
    }

    const was_timed = eobj.timed | 0;
    if ((eobj.corpsenm ?? NON_PM) !== NON_PM) {
        if (!(eobj.timed | 0)) attach_egg_hatch_timeout(eobj, 0);
        // C: blessed jelly → hatched creature thinks you're the parent
        if (lump.blessed && !(eobj.spe | 0)) eobj.spe = 2;
    }

    if (((eobj.timed | 0) && !was_timed)
        || (eobj.spe | 0) === 2
        || (eobj.corpsenm ?? NON_PM) !== oldcorpsenm) {
        await pline(
            `The ${xname(eobj)} ${otense_stone(eobj, 'quiver')} briefly.`,
        );
    } else {
        await pline(nothing_seems_to_happen);
    }

    setnotworn(lump);
    lump.quan = 0;
    lump.where = OBJ_FREE;
    return ECMD_TIME;
}

/** C apply.c shared strings for pole/grapple. */
const not_enough_room = "There's not enough room here to use that.";
const where_to_hit = 'Where do you want to hit?';
const cant_see_spot = "won't hit anything if you can't see that spot.";
const cant_reach = "can't reach that spot from here.";
const msg_slipsfree = 'The bullwhip slips free.';
const msg_snap = 'Snap!';

/** C hacklib.c isqrt — integer square root (odd-subtraction). */
function isqrt_pole(val) {
    let rt = 0;
    let odd = 1;
    let v = val | 0;
    while (v >= odd) {
        v -= odd;
        odd += 2;
        rt++;
    }
    return rt;
}

function distu_apply(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x | 0, y | 0);
}

function u_at_xy(x, y) {
    const u = game.u || {};
    return (u.ux | 0) === (x | 0) && (u.uy | 0) === (y | 0);
}

function sgn_apply(n) {
    n = n | 0;
    return n < 0 ? -1 : n > 0 ? 1 : 0;
}

function Role_if(pm) {
    return (game.urole?.mnum | 0) === pm;
}

function s_suffix_apply(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

function mhis_apply(mtmp) {
    if (!mtmp) return 'its';
    if (mtmp.female) return 'her';
    return 'his';
}

function Levitation_apply() {
    const u = game.u || {};
    if (u.Levitation) return true;
    return !!(((u.HLevitation | 0) || (u.ELevitation | 0))
        && !(u.BLevitation | 0));
}

function Flying_apply() {
    const u = game.u || {};
    if (u.Flying) return true;
    return !!(((u.HFlying | 0) || (u.EFlying | 0)) && !(u.BFlying | 0));
}

function Glib_apply() {
    // C youprop.h Glib — (HGlib|EGlib); Glib is intrinsic-only in C.
    return !!Glib();
}

function Stone_resistance_apply() {
    const u = game.u || {};
    return !!(u.Stone_resistance || u.HStone_resistance || u.EStone_resistance);
}

function Protection_from_shape_changers_apply() {
    const u = game.u || {};
    return !!(u.HProtection_from_shape_changers
        || u.EProtection_from_shape_changers
        || u.Protection_from_shape_changers);
}

function Deaf_apply() {
    const u = game.u || {};
    return !!((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf);
}

function is_pool_or_lava_apply(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}

function surface_apply(x, y) {
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ ?? 0;
    if (IS_FURNITURE(typ)) return 'furniture';
    if (IS_AIR(typ) || is_pool(x, y)) return 'water';
    if (is_lava(x, y)) return 'lava';
    return 'floor';
}

function ceiling_apply(_x, _y) {
    return 'ceiling';
}

function accessible_apply(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    if (!ACCESSIBLE(loc.typ)) return false;
    if (IS_DOOR(loc.typ)) {
        const m = loc.doormask | 0;
        if (m & (D_CLOSED | D_LOCKED)) return false;
    }
    return true;
}

function sobj_at_nexthere(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

function bimanual_apply(obj) {
    if (!obj) return false;
    const oc = game.objects?.[obj.otyp];
    return !!(oc?.oc_bimanual || oc?.oc_big);
}

/** C ref: do.c obj_no_longer_held — recurse contents; CRYSKNIFE → worm tooth. */
async function obj_no_longer_held_apply(obj) {
    if (!obj) return;
    for (let contents = obj.cobj; contents; contents = contents.nobj) {
        await obj_no_longer_held_apply(contents);
    }
    if ((obj.otyp | 0) === CRYSKNIFE) {
        if (!obj.oerodeproof || !rn2(10)) {
            if (!game.context?.mon_moving && !game.program_state?.gameover) {
                await costly_alteration(obj, COST_DEGRD);
            }
            obj.otyp = WORM_TOOTH;
            obj.oerodeproof = 0;
        }
    }
}

/** C ref: weapon.c uwep_skill_type. */
function uwep_skill_type() {
    if (game.u?.twoweap) return P_TWO_WEAPON_COMBAT;
    return weapon_type(game.u?.uwep);
}

function u_wield_art(art) {
    return is_art(game.u?.uwep, art);
}

/**
 * C ref: steed.c kick_steed — whip/kick riding (shared with dokick D-1362).
 */
async function kick_steed_apply() {
    const { kick_steed } = await import('./steed.js');
    await kick_steed();
}

/**
 * C ref: apply.c use_whip — lash, pit yank, disarm, force_attack.
 * Named omit: #if 0 snatch-to-face thitu; wipe_engr_at body.
 */
async function use_whip(obj) {
    const u = game.u || (game.u = {});
    const res = ECMD_OK;

    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'lash')) {
            cmdq_add_ec(doapply);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }
    if (!(await getdir(null))) return res | ECMD_CANCEL;

    let rx;
    let ry;
    let mtmp;
    if (u.uswallow) {
        mtmp = u.ustuck;
        rx = mtmp?.mx | 0;
        ry = mtmp?.my | 0;
    } else {
        confdir(false);
        rx = (u.ux | 0) + (u.dx | 0);
        ry = (u.uy | 0) + (u.dy | 0);
        if (!isok(rx, ry)) {
            await pline('You miss.');
            return res;
        }
        mtmp = m_at(rx, ry);
    }

    let proficient = 0;
    if (Role_if(PM_ARCHEOLOGIST)) proficient++;
    const dex = acurr(A_DEX);
    if (dex < 6) proficient--;
    else if (dex >= 14) proficient += (dex - 14);
    if (Fumbling()) proficient--;
    if (proficient > 3) proficient = 3;
    if (proficient < 0) proficient = 0;

    if (u.uswallow) {
        await pline('There is not enough room to flick your bullwhip.');
    } else if (Underwater_hero()) {
        await pline('There is too much resistance to flick your bullwhip.');
    } else if ((u.dz | 0) < 0) {
        await pline(`You flick a bug off of the ${ceiling_apply(u.ux, u.uy)}.`);
    } else if (!(u.dz | 0) && (IS_WATERWALL(game.level?.at?.(rx, ry)?.typ)
            || (game.level?.at?.(rx, ry)?.typ | 0) === LAVAWALL)) {
        await pline('You cause a small splash.');
        if ((game.level?.at?.(rx, ry)?.typ | 0) === LAVAWALL) {
            await fire_damage(u.uwep, false, rx, ry);
        }
        return ECMD_TIME;
    } else if ((!(u.dx | 0) && !(u.dy | 0)) || (u.dz | 0) > 0) {
        if (u.usteed && !rn2(proficient + 2)) {
            await pline(`You whip ${mon_nam(u.usteed)}!`);
            await kick_steed_apply();
            return ECMD_TIME;
        }
        if (is_pool_or_lava_apply(u.ux, u.uy)
            || IS_WATERWALL(game.level?.at?.(rx, ry)?.typ)
            || (game.level?.at?.(rx, ry)?.typ | 0) === LAVAWALL) {
            await pline('You cause a small splash.');
            if (is_lava(u.ux, u.uy)) {
                await fire_damage(u.uwep, false, u.ux, u.uy);
            }
            return ECMD_TIME;
        }
        if (Levitation_apply() || u.usteed || Flying_apply()) {
            const otmp = objects_at(u.ux, u.uy);
            if (otmp && (otmp.otyp | 0) === CORPSE
                && ((otmp.corpsenm | 0) === PM_HORSE
                    || (otmp.corpsenm | 0) === little_to_big(PM_HORSE)
                    || (otmp.corpsenm | 0) === big_to_little(PM_HORSE))) {
                await pline('Why beat a dead horse?');
                return ECMD_TIME;
            }
            if (otmp && proficient) {
                await pline(
                    `You wrap your bullwhip around ${an(singular(otmp, xname))} on the ${surface_apply(u.ux, u.uy)}.`,
                );
                if (rnl(6) || (await pickup_object(otmp, 1, true)) < 1) {
                    await pline(msg_slipsfree);
                }
                return ECMD_TIME;
            }
        }
        let dam = rnd(2) + dbon() + (obj.spe | 0);
        if (dam <= 0) dam = 1;
        await pline(`You hit your ${body_part(FOOT)} with your bullwhip.`);
        const buf = `killed ${uhim()}self with ${uhis()} bullwhip`;
        losehp(maybe_half_phys(dam), buf, NO_KILLER_PREFIX);
        return ECMD_TIME;
    } else if ((Fumbling() || Glib_apply()) && !rn2(5)) {
        await pline(`The bullwhip slips out of your ${body_part(HAND)}.`);
        await dropx(obj);
    } else if (u.utrap && (u.utraptype | 0) === TT_PIT) {
        let wrapped_what = sobj_at_nexthere(BOULDER, rx, ry)
            ? 'a boulder'
            : (IS_FURNITURE(game.level?.at?.(rx, ry)?.typ) ? 'something' : null);
        let did_attack = false;
        if (mtmp) {
            if (bigmonst(mtmp.data) && canspotmon(mtmp)) {
                wrapped_what = mon_nam(mtmp);
            }
            if (!wrapped_what) {
                await whip_attack(obj, mtmp, rx, ry, proficient);
                did_attack = true;
            }
        }
        if (wrapped_what) {
            const cc = { x: rx, y: ry };
            await pline(`You wrap your bullwhip around ${wrapped_what}.`);
            if (proficient && rn2(proficient + 2)) {
                if (!mtmp || enexto(cc, rx, ry, game.youmonst?.data)) {
                    await pline('You yank yourself out of the pit!');
                    reset_utrap(true);
                    await teleds(cc.x, cc.y, TELEDS_ALLOW_DRAG);
                    game.vision_full_recalc = 1;
                }
            } else {
                await pline(msg_slipsfree);
            }
            if (mtmp) await wakeup(mtmp, true);
        } else if (!did_attack) {
            await pline(msg_snap);
        }
    } else if (mtmp) {
        await whip_attack(obj, mtmp, rx, ry, proficient);
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        await pline('You snap your whip through thin air.');
    } else {
        await pline(msg_snap);
    }
    return ECMD_TIME;
}

/**
 * C ref: apply.c use_whip whipattack label — reveal, disarm, or force_attack.
 */
async function whip_attack(obj, mtmp, rx, ry, proficient) {
    const u = game.u || {};
    let otmp = null;
    if (!canspotmon(mtmp)) {
        mtmp.mundetected = 0;
        const spotitnow = canspotmon(mtmp);
        const loc = game.level?.at?.(rx, ry);
        if (spotitnow || !glyph_is_invisible(loc)) {
            await pline(
                `${!spotitnow ? 'A monster' : Amonnam(mtmp)} is there that you ${
                    !Blind() ? "couldn't see" : "hadn't noticed"
                }.`,
            );
            if (!spotitnow) map_invisible(rx, ry);
            else newsym(rx, ry);
        }
    } else {
        otmp = MON_WEP(mtmp);
    }

    if (otmp) {
        const onambuf = cxname(otmp);
        let gotit = proficient && (!Fumbling() || !rn2(10));
        let mon_hand = null;
        if (gotit) {
            mon_hand = mbodypart(mtmp, HAND);
            if (bimanual_apply(otmp)) mon_hand = makeplural(mon_hand);
        }
        await pline(`You wrap your bullwhip around ${yname(otmp)}.`);
        if (gotit && mwelded(otmp)) {
            await pline(
                `${(otmp.quan | 0) === 1 ? 'It is' : 'They are'} welded to ${mhis_apply(mtmp)} ${mon_hand}${
                    !otmp.bknown ? '!' : '.'
                }`,
            );
            otmp.bknown = 1;
            gotit = false;
        }
        if (gotit) {
            obj_extract_self(otmp);
            await possibly_unwield(mtmp, false);
            await setmnotwielded(mtmp, otmp);
            switch (rn2(proficient + 1)) {
            case 2:
                await pline(
                    `You yank ${yname(otmp)} to the ${surface_apply(u.ux, u.uy)}!`,
                );
                place_object(otmp, u.ux, u.uy);
                stackobj(otmp);
                break;
            case 3: {
                await pline(`You snatch ${yname(otmp)}!`);
                const mdat = mons(otmp.corpsenm);
                if ((otmp.otyp | 0) === CORPSE
                    && touch_petrifies(mdat)
                    && !u.uarmg
                    && !Stone_resistance_apply()
                    && !(poly_when_stoned(game.youmonst?.data)
                        && (await polymon(PM_STONE_GOLEM)))) {
                    const kbuf = (otmp.quan | 0) === 1 ? an(onambuf) : onambuf;
                    await pline(`Snatching ${kbuf} is a fatal mistake.`);
                    place_object(otmp, u.ux, u.uy);
                    await instapetrify(kbuf);
                    obj_extract_self(otmp);
                }
                await hold_another_object(
                    otmp, 'You drop %s!', doname(otmp), null,
                );
                break;
            }
            default:
                await pline(
                    `You yank ${the(onambuf)} from ${s_suffix_apply(mon_nam(mtmp))} ${mon_hand}!`,
                );
                await obj_no_longer_held_apply(otmp);
                place_object(otmp, mtmp.mx, mtmp.my);
                stackobj(otmp);
                break;
            }
        } else {
            await pline(msg_slipsfree);
        }
    } else {
        let do_snap = true;
        if (M_AP_TYPE(mtmp) && !Protection_from_shape_changers_apply()
            && !sensemon(mtmp)) {
            await stumble_onto_mimic(mtmp);
            do_snap = false;
        } else {
            await pline(`You flick your bullwhip towards ${mon_nam(mtmp)}.`);
        }
        if (proficient && (await force_attack(mtmp, false))) return;
        if (do_snap) await pline(msg_snap);
    }
    await wakeup(mtmp, true);
}

function Detect_monsters_apply() {
    const u = game.u || {};
    return !!(u.Detect_monsters
        || (u.HDetect_monsters | 0) || (u.EDetect_monsters | 0));
}

/** C display.c display_monster: unsensed mimic object/furniture is not a monster glyph. */
function pole_mimic_unsensed_object(mtmp) {
    if (!mtmp) return false;
    if (sensemon(mtmp)) return false;
    const ap = M_AP_TYPE(mtmp);
    return ap === M_AP_OBJECT || ap === M_AP_FURNITURE;
}

function covers_objects_pole(x, y) {
    // C display.h covers_objects — is_pool && !Underwater, or lava
    return (is_pool(x, y) && !game.u?.Underwater) || is_lava(x, y);
}

function shown_floor_obj_pole(x, y) {
    if (covers_objects_pole(x, y)) return null;
    return objects_at(x, y);
}

/**
 * C ref: display.c glyph_at + display.h glyph_is_monster.
 * JS has no integer glyphs; classify the gbuf layer newsym would paint.
 * Hidden live m_at is not a monster glyph (D-1040).
 */
function glyph_is_monster_at(x, y) {
    const mtmp = m_at(x, y);
    if (!mtmp) return false;
    if (cansee(x, y)) {
        const see_it = mon_visible(mtmp) || tp_sensemon(mtmp);
        if (!see_it && !Detect_monsters_apply()) return false;
        // C: mimic appearance only when PHYSICALLY_SEEN
        if (see_it && pole_mimic_unsensed_object(mtmp)) return false;
        return true;
    }
    if (tp_sensemon(mtmp) || (mon_visible(mtmp) && see_with_infrared(mtmp))) {
        return true;
    }
    return Detect_monsters_apply();
}

/** C display.h glyph_is_invisible(glyph_at) — gbuf I, not live m_at. */
function glyph_is_invisible_glyph_at(x, y) {
    if (glyph_is_monster_at(x, y)) return false;
    return glyph_is_invisible(game.level?.at?.(x, y));
}

/**
 * C ref: display.h glyph_is_statue(glyph_at).
 * Live sobj_at(STATUE) alone is not enough (covered / under a monster glyph).
 */
function glyph_is_statue_glyph_at(x, y) {
    if (glyph_is_monster_at(x, y) || glyph_is_invisible_glyph_at(x, y)) {
        return false;
    }
    if (cansee(x, y)) {
        const mtmp = m_at(x, y);
        if (mtmp && pole_mimic_unsensed_object(mtmp)
            && M_AP_TYPE(mtmp) === M_AP_OBJECT
            && (mtmp.mappearance | 0) === STATUE) {
            return true;
        }
        const obj = shown_floor_obj_pole(x, y);
        return !!(obj && (obj.otyp | 0) === STATUE);
    }
    const rg = game.level?.at?.(x, y)?.remembered_glyph;
    if (rg?.statue) return true;
    return false;
}

/** C display.h glyph_to_obj(glyph_at) == BOULDER. */
function glyph_to_obj_boulder_at(x, y) {
    if (glyph_is_monster_at(x, y) || glyph_is_invisible_glyph_at(x, y)) {
        return false;
    }
    if (cansee(x, y)) {
        const mtmp = m_at(x, y);
        if (mtmp && pole_mimic_unsensed_object(mtmp)
            && M_AP_TYPE(mtmp) === M_AP_OBJECT
            && (mtmp.mappearance | 0) === BOULDER) {
            return true;
        }
        const obj = shown_floor_obj_pole(x, y);
        return !!(obj && (obj.otyp | 0) === BOULDER);
    }
    const rg = game.level?.at?.(x, y)?.remembered_glyph;
    if (rg?.boulder) return true;
    return false;
}

/**
 * C ref: apply.c glyph_is_poleable(glyph_at) —
 * monster glyph || invisible glyph || statue glyph (not live m_at / sobj).
 */
export function glyph_is_poleable_at(x, y) {
    return glyph_is_monster_at(x, y)
        || glyph_is_invisible_glyph_at(x, y)
        || glyph_is_statue_glyph_at(x, y);
}

function calc_pole_range() {
    const typ = uwep_skill_type();
    const min_range = 4;
    let max_range;
    if (typ === P_NONE || P_SKILL(typ) <= P_BASIC) max_range = 4;
    else if (P_SKILL(typ) === P_SKILLED) max_range = 5;
    else max_range = 8;
    if (!game.gp) game.gp = {};
    game.gp.polearm_range_min = min_range;
    game.gp.polearm_range_max = max_range;
    return { min_range, max_range };
}

function get_valid_polearm_position(x, y) {
    if (!isok(x, y)) return false;
    const min_range = game.gp?.polearm_range_min | 0;
    const max_range = game.gp?.polearm_range_max | 0;
    const du = distu_apply(x, y);
    if (du < min_range || du > max_range) return false;
    return !!(cansee(x, y) || (couldsee(x, y) && glyph_is_poleable_at(x, y)));
}

/**
 * C ref: apply.c find_poleable_mon — unique poleable glyph in range.
 * Skip tame/peaceful only when glyph_is_monster(glyph_at) && m_at (D-1040).
 */
export function find_poleable_mon(pos) {
    const impaired = !!(game.u?.Confusion || game.u?.HConfusion
        || game.u?.Stunned || game.u?.HStun || game.u?.Hallucination);
    const rt = isqrt_pole(game.gp?.polearm_range_max | 0);
    const u = game.u || {};
    const lo_x = Math.max((u.ux | 0) - rt, 1);
    const hi_x = Math.min((u.ux | 0) + rt, COLNO - 1);
    const lo_y = Math.max((u.uy | 0) - rt, 0);
    const hi_y = Math.min((u.uy | 0) + rt, ROWNO - 1);
    const mpos = { x: 0, y: 0 };
    for (let x = lo_x; x <= hi_x; ++x) {
        for (let y = lo_y; y <= hi_y; ++y) {
            if (!get_valid_polearm_position(x, y)) continue;
            const mtmp = m_at(x, y);
            // C: !impaired && glyph_is_monster(glyph) && m_at && (mtame || (mpeaceful && flags.confirm))
            if (!impaired
                && glyph_is_monster_at(x, y)
                && mtmp
                && (mtmp.mtame || (mtmp.mpeaceful && (game.flags?.confirm ?? true)))) {
                continue;
            }
            if (glyph_is_poleable_at(x, y)
                && (!glyph_is_statue_glyph_at(x, y) || impaired)) {
                if (mpos.x) return false;
                mpos.x = x;
                mpos.y = y;
            }
        }
    }
    if (!mpos.x) return false;
    pos.x = mpos.x;
    pos.y = mpos.y;
    return true;
}

/**
 * C ref: defsym.h PCHAR S_goodpos — '$' / HI_ZAP (cmap_to_glyph).
 */
function cmap_to_glyph_goodpos() {
    return { ch: '$', color: HI_ZAP, dec: false };
}

function display_polearm_positions(on_off) {
    // C apply.c display_polearm_positions — tmp_at DISP_BEAM S_goodpos
    if (on_off) {
        tmp_at(DISP_BEAM, cmap_to_glyph_goodpos());
        const u = game.u || {};
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                const x = dx + (u.ux | 0);
                const y = dy + (u.uy | 0);
                if (get_valid_polearm_position(x, y)) tmp_at(x, y);
            }
        }
    } else {
        tmp_at(DISP_END, 0);
    }
}

function snickersnee_used_dist_attk(obj) {
    const u = game.u || {};
    if (obj && obj === u.uwep && u_wield_art(ART_SNICKERSNEE)
        && (game.context?.snickersnee_turn | 0) === (game.moves | 0)) {
        return true;
    }
    return false;
}

/**
 * C ref: apply.c could_pole_mon — wielded pole and a reachable target.
 */
export function could_pole_mon() {
    const u = game.u || {};
    if (!u.uwep || !is_pole(u.uwep)) return false;
    const { min_range, max_range } = calc_pole_range();
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    if (!find_poleable_mon(cc)) {
        const hitm = game.context?.polearm?.hitmon;
        if (hitm && (hitm.mhp | 0) > 0 && sensemon(hitm)) {
            const d = distu_apply(hitm.mx, hitm.my);
            if (d <= max_range && d >= min_range) return true;
        }
        return false;
    }
    return true;
}

/**
 * C ref: apply.c use_pole — getpos range + thitmonst / statue / furniture.
 * Named omit: defsyms furniture explanation; integer glyph IDs.
 * thitmonst weapon hit-vs-miss: D-1041. S_goodpos tmp_at: D-1051.
 */
async function use_pole(obj, autohit) {
    const thump = 'Thump!  Your blow bounces harmlessly off the %s.';
    const res = ECMD_OK;
    const u = game.u || (game.u = {});
    let freehit = false;

    if (u.uswallow) {
        await pline(not_enough_room);
        return ECMD_OK;
    }
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'swing')) {
            cmdq_add_ec(doapply);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    const { min_range, max_range } = calc_pole_range();
    if (!autohit) await pline(where_to_hit);
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    const hitm = game.context?.polearm?.hitmon;
    if (!find_poleable_mon(cc) && hitm && (hitm.mhp | 0) > 0 && sensemon(hitm)) {
        const d = distu_apply(hitm.mx, hitm.my);
        if (d <= max_range && d >= min_range) {
            cc.x = hitm.mx;
            cc.y = hitm.my;
        }
    }
    if (!autohit) {
        getpos_sethilite(display_polearm_positions, get_valid_polearm_position);
        if ((await getpos(cc, true, 'the spot to hit')) < 0) {
            return res | ECMD_CANCEL;
        }
    }

    const du = distu_apply(cc.x, cc.y);
    if (du > max_range) {
        await pline('Too far!');
        return ECMD_FAIL;
    } else if (du < min_range) {
        if (autohit && u_at_xy(cc.x, cc.y)) {
            await pline("Don't know what to hit.");
        } else {
            await pline('Too close!');
        }
        return ECMD_FAIL;
    } else if (!cansee(cc.x, cc.y) && !glyph_is_poleable_at(cc.x, cc.y)) {
        await pline(`You ${cant_see_spot}`);
        return ECMD_FAIL;
    } else if (!couldsee(cc.x, cc.y)) {
        await pline(`You ${cant_reach}`);
        return ECMD_FAIL;
    }

    if (!game.context) game.context = {};
    if (!game.context.polearm) game.context.polearm = {};
    game.context.polearm.hitmon = null;
    game.context.polearm.m_id = 0;
    game.bhitpos = { x: cc.x, y: cc.y };
    const mtmp = m_at(cc.x, cc.y);
    if (mtmp) {
        if (await attack_checks(mtmp, u.uwep)) {
            return res | (game.context.move ? ECMD_TIME : ECMD_OK);
        }
        if (await overexertion()) return ECMD_TIME;
        game.context.polearm.hitmon = mtmp;
        // C save.c savemonchn stamps m_id from hitmon at FREEING;
        // JSON keeps the id at use time (Sfo_context_info is before invent).
        game.context.polearm.m_id = mtmp.m_id | 0;
        if (snickersnee_used_dist_attk(obj)) {
            await pline("The blade doesn't reach there!");
            return ECMD_FAIL;
        }
        check_caitiff(mtmp);
        game.notonhead = (cc.x !== mtmp.mx || cc.y !== mtmp.my);
        if (obj === u.uwep && u_wield_art(ART_SNICKERSNEE)) {
            freehit = (game.moves | 0) !== (game.context.snickersnee_turn | 0);
            game.context.snickersnee_turn = game.moves | 0;
            if (freehit && !Deaf_apply()) {
                await pline('Shkinng!');
            }
        }
        await thitmonst(mtmp, u.uwep);
    } else if (glyph_is_statue_glyph_at(cc.x, cc.y)
        && sobj_at_nexthere(STATUE, cc.x, cc.y)) {
        const t = t_at(cc.x, cc.y);
        if (t && (t.ttyp | 0) === STATUE_TRAP
            && (await activate_statue_trap(t, t.tx, t.ty, false))) {
            /* feedback from animate_statue */
        } else {
            await pline(thump.replace('%s', 'statue'));
            await wake_nearto(cc.x, cc.y, 25);
        }
    } else {
        unmap_invisible(cc.x, cc.y);
        if (glyph_to_obj_boulder_at(cc.x, cc.y)
            && sobj_at_nexthere(BOULDER, cc.x, cc.y)) {
            await pline(thump.replace('%s', 'boulder'));
            await wake_nearto(cc.x, cc.y, 25);
        } else if (!accessible_apply(cc.x, cc.y)
            || IS_FURNITURE(game.level?.at?.(cc.x, cc.y)?.typ)) {
            const typ = game.level?.at?.(cc.x, cc.y)?.typ | 0;
            const what = (typ === STONE || typ === SCORR)
                ? 'stone'
                : 'an unknown obstacle';
            await pline(`You uselessly attack ${what}.`);
        } else {
            await pline('You miss; there is no one there to hit.');
        }
    }
    u_wipe_engr(2);
    return freehit ? ECMD_OK : ECMD_TIME;
}

function grapple_range() {
    const typ = uwep_skill_type();
    if (typ === P_NONE || P_SKILL(typ) <= P_BASIC) return 4;
    if (P_SKILL(typ) === P_SKILLED) return 5;
    return 8;
}

function can_grapple_location(x, y) {
    return isok(x, y) && cansee(x, y) && distu_apply(x, y) <= grapple_range();
}

function display_grapple_positions(on_off) {
    // C apply.c display_grapple_positions — tmp_at DISP_BEAM S_goodpos
    if (on_off) {
        tmp_at(DISP_BEAM, cmap_to_glyph_goodpos());
        const u = game.u || {};
        for (let dx = -3; dx <= 3; dx++) {
            for (let dy = -3; dy <= 3; dy++) {
                const x = dx + (u.ux | 0);
                const y = dy + (u.uy | 0);
                if (can_grapple_location(x, y) && !u_at_xy(x, y)) {
                    tmp_at(x, y);
                }
            }
        }
    } else {
        tmp_at(DISP_END, 0);
    }
}

/**
 * C ref: apply.c use_grapple — getpos, skill menu, snag/hit/hurtle.
 * Named omit: untrap non-adjacent (C FIXME). S_goodpos tmp_at: D-1051.
 */
async function use_grapple(obj) {
    const res = ECMD_OK;
    const u = game.u || (game.u = {});

    if (u.uswallow) {
        await pline(not_enough_room);
        return ECMD_OK;
    }
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'cast')) {
            cmdq_add_ec(doapply);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    await pline(where_to_hit);
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    getpos_sethilite(display_grapple_positions, can_grapple_location);
    if ((await getpos(cc, true, 'the spot to hit')) < 0) {
        return res | ECMD_CANCEL;
    }

    const typ = uwep_skill_type();
    if (distu_apply(cc.x, cc.y) > grapple_range()) {
        await pline('Too far!');
        return res;
    } else if (!cansee(cc.x, cc.y)) {
        await pline(`You ${cant_see_spot}`);
        return res;
    } else if (!couldsee(cc.x, cc.y)) {
        await pline(`You ${cant_reach}`);
        return res;
    }

    let tohit = rn2(5);
    if (typ !== P_NONE && P_SKILL(typ) >= P_SKILLED) {
        const items = [
            {
                text: `an object on the ${surface_apply(cc.x, cc.y)}`,
                selectable: true,
                tohit: 1,
            },
            { text: 'a monster', selectable: true, tohit: 2 },
            {
                text: `the ${surface_apply(cc.x, cc.y)}`,
                selectable: true,
                tohit: 3,
            },
        ];
        tohit = rn2(4);
        const picked = await select_menu_pick_one(items);
        if (picked?.kind === 'pick' && picked.item
            && rn2(P_SKILL(typ) > P_SKILLED ? 20 : 2)) {
            tohit = picked.item.tohit | 0;
        }
    }

    if (tohit === 2 || !rn2(2)) u_wipe_engr(rnd(2));

    switch (tohit) {
    case 0:
        break;
    case 1: {
        const otmp = objects_at(cc.x, cc.y);
        if (otmp) {
            await pline(
                `You snag an object from the ${surface_apply(cc.x, cc.y)}!`,
            );
            await pickup_object(otmp, 1, false);
            newsym(cc.x, cc.y);
            return ECMD_TIME;
        }
        break;
    }
    case 2: {
        game.bhitpos = { x: cc.x, y: cc.y };
        const mtmp = m_at(cc.x, cc.y);
        if (!mtmp) break;
        game.notonhead = (cc.x !== mtmp.mx || cc.y !== mtmp.my);
        const save_confirm = game.flags?.confirm;
        const pullcc = { x: cc.x, y: cc.y };
        if (verysmall(mtmp.data) && !rn2(4)
            && enexto(pullcc, u.ux, u.uy, null)) {
            if (game.flags) game.flags.confirm = false;
            await attack_checks(mtmp, u.uwep);
            if (game.flags) game.flags.confirm = save_confirm;
            check_caitiff(mtmp);
            await pline(`You pull in ${mon_nam(mtmp)}!`);
            mtmp.mundetected = 0;
            await rloc_to(mtmp, pullcc.x, pullcc.y);
            return ECMD_TIME;
        } else if ((!bigmonst(mtmp.data) && !strongmonst(mtmp.data))
            || rn2(4)) {
            if (game.flags) game.flags.confirm = false;
            await attack_checks(mtmp, u.uwep);
            if (game.flags) game.flags.confirm = save_confirm;
            check_caitiff(mtmp);
            await thitmonst(mtmp, u.uwep);
            return ECMD_TIME;
        }
        // FALLTHROUGH to surface
    }
    /* fallthrough */
    case 3: {
        const loc = game.level?.at?.(cc.x, cc.y);
        if (IS_AIR(loc?.typ) || is_pool(cc.x, cc.y)) {
            await pline(
                `The hook slices through the ${surface_apply(cc.x, cc.y)}.`,
            );
        } else {
            await pline(`You are yanked toward the ${surface_apply(cc.x, cc.y)}!`);
            await hurtle(
                sgn_apply(cc.x - u.ux), sgn_apply(cc.y - u.uy), 1, false,
            );
            await spoteffects(true);
        }
        return ECMD_TIME;
    }
    default:
        if (P_SKILL(typ) <= P_BASIC) {
            await pline('You hook yourself!');
            losehp(maybe_half_phys(rn1(10, 10)), 'a grappling hook', KILLED_BY);
            return ECMD_TIME;
        }
        break;
    }
    await pline(nothing_happens);
    return ECMD_TIME;
}

/** C invent.c carried — where==OBJ_INVENT or invent[] membership. */
function carried_apply(obj) {
    return !!(obj && (obj.where === OBJ_INVENT
        || (game.invent || []).includes(obj)));
}

/** C shk.c shk_your / Shk_Your — trailing space; shop/mon prefix deferred. */
function shk_your_apply(obj) {
    return carried_apply(obj) ? 'your ' : 'the ';
}
function Shk_Your_apply(obj) {
    const s = shk_your_apply(obj);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/** C objnam.c Yname2 / otense / Tobjnam thin. */
function Yname2_oil(obj) {
    const s = `${shk_your_apply(obj)}${xname(obj)}`;
    return s.charAt(0).toUpperCase() + s.slice(1);
}
function otense_oil(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}
function Tobjnam_oil(obj, verb) {
    return `${The(xname(obj))} ${otense_oil(obj, verb)}`;
}

/** C do_wear.c fingers_or_gloves — gloves vs makeplural(FINGER). */
function fingers_or_gloves_apply(check_gloves) {
    if (check_gloves && game.u?.uarmg) {
        return gloves_simple_name(game.u.uarmg);
    }
    return makeplural(body_part(FINGER));
}

function Stunned_apply() {
    const u = game.u || {};
    return !!(u.Stunned || ((u.HStun | 0) && !(u.BStun | 0)));
}

function freeinv_apply(obj) {
    if (!obj) return;
    const inv = game.invent || [];
    const idx = inv.indexOf(obj);
    if (idx >= 0) inv.splice(idx, 1);
    obj.where = OBJ_FREE;
}

/** C invent.c useup — consume one; quan==1 is useupall. */
function useup_apply(obj) {
    if (!obj) return;
    if ((obj.quan || 1) > 1) {
        obj.in_use = false;
        obj.quan--;
        obj.owt = weight(obj);
        return;
    }
    useupall(obj);
}

/** C invent.c carrying — first matching otyp in hero invent[]. */
function carrying_apply(otyp) {
    if (otyp < 0) return null;
    for (const otmp of game.invent || []) {
        if (otmp.otyp === otyp) return otmp;
    }
    return null;
}

/** C dungeon.c Invocation_lev — In_hell && dlevel == num_dunlevs-1. */
function Invocation_lev_apply(lev) {
    const uz = lev || game.u?.uz;
    if (!uz) return false;
    const dun = game.dungeons?.[uz.dnum | 0];
    if (!dun?.flags?.hellish) return false;
    return (uz.dlevel | 0) === ((dun.num_dunlevs | 0) - 1);
}

/** C hack.c invocation_pos — Invocation_lev && (x,y)==inv_pos. */
function invocation_pos_apply(x, y) {
    if (!Invocation_lev_apply()) return false;
    const ip = game.inv_pos || game.svi?.inv_pos;
    if (!ip) return false;
    return (x | 0) === (ip.x | 0) && (y | 0) === (ip.y | 0);
}

/** C stairs.c On_stairs — stairway_at != NULL. */
function On_stairs_apply(x, y) {
    return !!stairway_at(x, y);
}

/** C music.c Hero_playnotes — tty/sound deferred (no RNG). */
function Hero_playnotes_bell(_instr, _notes, _vol) {}

/**
 * C ref: mkroom.c mkundead — (level_difficulty+1)/10 + rnd(5) undead
 * around mm; optional corpse revive then makemon; graveyard flag.
 * Named omit: spell.c caller (same helper); revive visual polish.
 */
async function mkundead(mm, revive_corpses, mm_flags) {
    let cnt = Math.trunc(((level_difficulty(game.u?.uz) || 1) + 1) / 10) + rnd(5);
    while (cnt--) {
        const mdat = morguemon();
        const cc = { x: 0, y: 0 };
        if (mdat && enexto(cc, mm.x, mm.y, mdat)) {
            let skipMakemon = false;
            if (revive_corpses) {
                const otmp = sobj_at_nexthere(CORPSE, cc.x, cc.y);
                if (otmp && await revive(otmp, false)) skipMakemon = true;
            }
            if (!skipMakemon) makemon(mdat, cc.x, cc.y, mm_flags);
        }
    }
    if (game.level) {
        if (!game.level.flags) game.level.flags = {};
        game.level.flags.graveyard = true;
    }
}

/**
 * C ref: apply.c use_bell — ordinary ring (Underwater/swallow muffled;
 * invocation empty BofO silent+learno; cursed nymph summon + shatter/
 * speed/nomul) else charged BofO consume_obj_charge then swallow openit /
 * cursed mkundead / invocation age=moves / blessed unpunish+openit /
 * uncursed findit. doapply does not assign res (stays ECMD_TIME).
 * Named omit: Hero_playnotes audio; detecting() vision;
 * open_drawbridge crush/entity.
 */
export async function use_bell(obj) {
    if (!obj) return;
    let wakem = false;
    let learno = false;
    const ordinary = obj.otyp !== BELL_OF_OPENING || !(obj.spe | 0);
    const u = game.u || {};
    const invoking = obj.otyp === BELL_OF_OPENING
        && invocation_pos_apply(u.ux, u.uy)
        && !On_stairs_apply(u.ux, u.uy);

    Hero_playnotes_bell(obj.otyp, 'C', 100);
    await pline(`You ring ${the(xname(obj))}.`);

    if (Underwater_hero() || (u.uswallow && ordinary)) {
        await pline('But the sound is muffled.');
    } else if (invoking && ordinary) {
        await pline('But it makes no sound.');
        learno = true;
    } else if (ordinary) {
        const woodGone = !!((game.mvitals?.[PM_WOOD_NYMPH]?.mvflags ?? 0) & G_GONE);
        const waterGone = !!((game.mvitals?.[PM_WATER_NYMPH]?.mvflags ?? 0) & G_GONE);
        const mtnGone = !!((game.mvitals?.[PM_MOUNTAIN_NYMPH]?.mvflags ?? 0) & G_GONE);
        if (obj.cursed && !rn2(4)
            && !woodGone && !waterGone && !mtnGone) {
            const mtmp = makemon(
                mkclass('S_NYMPH', 0), u.ux | 0, u.uy | 0,
                NO_MINVENT | MM_NOMSG,
            );
            if (mtmp) {
                await pline(`You summon ${a_monnam(mtmp)}!`);
                if (!obj_resists(obj, 93, 100)) {
                    await pline(`${Tobjnam_grease(obj, 'have')} shattered!`);
                    useup(obj);
                    obj = null;
                } else {
                    switch (rn2(3)) {
                    default:
                        break;
                    case 1:
                        await mon_adjust_speed(mtmp, 2, null);
                        break;
                    case 2:
                        game.nomovemsg = '';
                        game.multi_reason = null;
                        nomul(-rnd(2));
                        break;
                    }
                }
            }
        }
        wakem = true;
    } else {
        await consume_obj_charge(obj, true);

        if (u.uswallow) {
            if (!obj.cursed) await openit();
            else await pline(nothing_happens);
        } else if (obj.cursed) {
            await mkundead(
                { x: u.ux | 0, y: u.uy | 0 }, false, NO_MINVENT,
            );
            wakem = true;
        } else if (invoking) {
            await pline(
                `${Tobjnam_grease(obj, 'issue')} an unsettling shrill sound...`,
            );
            obj.age = game.moves | 0;
            learno = true;
            wakem = true;
        } else if (obj.blessed) {
            let res = 0;
            if (u.uchain) {
                unpunish();
                res = 1;
            } else if ((u.utrap | 0) && (u.utraptype | 0) === TT_BURIEDBALL) {
                buried_ball_to_freedom();
                res = 1;
            }
            res += await openit();
            switch (res) {
            case 0:
                await pline(nothing_happens);
                break;
            case 1:
                await pline('Something opens...');
                learno = true;
                break;
            default:
                await pline('Things open around you...');
                learno = true;
                break;
            }
        } else {
            if (await findit() !== 0) learno = true;
            else await pline(nothing_happens);
        }
    }

    if (learno) {
        makeknown(BELL_OF_OPENING);
        if (obj) obj.known = 1;
    }
    if (wakem) await wake_nearby(true);
}

/** C ref: hack.c may_passwall — STWALL + W_NONPASSWALL blocks. */
function may_passwall_fig(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    const wi = (loc.wall_info | 0) | (loc.flags | 0);
    return !(IS_STWALL(loc.typ) && (wi & W_NONPASSWALL));
}

/**
 * C ref: apply.c figurine_location_checks — swallow+carried no room;
 * !isok; obstructed unless passes_walls+may_passwall; boulder unless
 * passes_walls|throws_rocks.
 */
async function figurine_location_checks(obj, cc, quietly) {
    const u = game.u || {};
    if (carried(obj) && u.uswallow) {
        if (!quietly) await pline("You don't have enough room in here.");
        return false;
    }
    const x = cc ? (cc.x | 0) : (u.ux | 0);
    const y = cc ? (cc.y | 0) : (u.uy | 0);
    if (!isok(x, y)) {
        if (!quietly) await pline('You cannot put the figurine there.');
        return false;
    }
    const loc = game.level?.at?.(x, y);
    const typ = loc?.typ | 0;
    const ptr = mons(obj.corpsenm);
    if (IS_OBSTRUCTED(typ)
        && !(passes_walls(ptr) && may_passwall_fig(x, y))) {
        if (!quietly) {
            await pline(
                `You cannot place a figurine in ${IS_TREE(typ) ? 'a tree' : 'solid rock'}!`,
            );
        }
        return false;
    }
    if (sobj_at_nexthere(BOULDER, x, y) && !passes_walls(ptr)
        && !throws_rocks(ptr)) {
        if (!quietly) {
            await pline('You cannot fit the figurine on the boulder.');
        }
        return false;
    }
    return true;
}

/** C ref: hacklib.c s_suffix — it→its, you→your, *s→*', else *'s. */
function s_suffix_fig(s) {
    const buf = String(s ?? '');
    const low = buf.toLowerCase();
    if (low === 'it') return `${buf}s`;
    if (low === 'you') return `${buf}r`;
    if (buf.endsWith('s') || buf.endsWith('S')) return `${buf}'`;
    return `${buf}'s`;
}

/**
 * C ref: mondata.c locomotion — verb for how a monster moves.
 */
function locomotion_fig(ptr, def) {
    const cap = !!(def && def[0] === def[0].toUpperCase()
        && def[0] !== def[0].toLowerCase());
    const pick = (lo, hi) => (cap ? hi : lo);
    if (is_floater(ptr)) return pick('float', 'Float');
    if (is_flyer(ptr) && (ptr.msize ?? 2) <= MZ_SMALL) {
        return pick('fly', 'Fly');
    }
    if (is_flyer(ptr)) return pick('fly', 'Fly');
    if (((ptr?.mflags1 ?? 0) & M1_SLITHY) !== 0) {
        return pick('slither', 'Slither');
    }
    if (amorphous(ptr)) return pick('ooze', 'Ooze');
    if (!(ptr?.mmove | 0)) return pick('wiggle', 'Wiggle');
    if (nolimbs(ptr)) return pick('crawl', 'Crawl');
    return def;
}

function m_monnam_fig(mtmp) {
    return x_monnam(mtmp, ARTICLE_NONE, null, EXACT_NAME, false);
}

function See_invisible_fig() {
    const u = game.u || {};
    return !!(u.See_invisible || u.HSee_invisible || u.ESee_invisible);
}

function obfree_fig(obj) {
    if (!obj) return;
    obj.quan = 0;
    obj.where = OBJ_FREE;
    obj.timed = 0;
}

/**
 * C ref: apply.c fig_transform — timer callback; turn figurine into
 * monster. Bad loc retries rnd(5000). Named omit: set_msg_xy; migrating
 * OBJ_MIGRATING; impossible() null/unknown where.
 */
export async function fig_transform(figurine, timeout) {
    if (!figurine) return;
    const silent = (timeout | 0) !== (game.moves | 0);
    const loc = get_obj_location(figurine, 0);
    const cc = { x: loc ? (loc.x | 0) : 0, y: loc ? (loc.y | 0) : 0 };
    let okay_spot = !!loc;
    const where = figurine.where | 0;
    if (where === OBJ_INVENT || where === OBJ_MINVENT) {
        okay_spot = enexto(cc, cc.x, cc.y, mons(figurine.corpsenm | 0));
    }
    if (!okay_spot || !(await figurine_location_checks(figurine, cc, true))) {
        start_timer(rnd(5000), TIMER_OBJECT, FIG_TRANSFORM, figurine);
        return;
    }

    const cansee_spot = cansee(cc.x, cc.y);
    const mtmp = await make_familiar(figurine, cc.x, cc.y, true);
    let redraw = false;
    if (mtmp) {
        const monnambuf = an(m_monnam_fig(mtmp));
        let and_vanish = '';
        let suppress_see = false;
        const mshelter = objects_at(mtmp.mx | 0, mtmp.my | 0);
        if ((mtmp.minvis && !See_invisible_fig())
            || (mtmp.data?.mlet === 'S_MIMIC'
                && M_AP_TYPE(mtmp) !== M_AP_NOTHING)) {
            suppress_see = true;
        }
        if (mtmp.mundetected) {
            if (hides_under(mtmp.data) && mshelter) {
                and_vanish = ` and ${locomotion_fig(mtmp.data, 'crawl')} under ${doname(mshelter)}`;
            } else if (mtmp.data?.mlet === 'S_MIMIC'
                || mtmp.data?.mlet === 'S_EEL') {
                suppress_see = true;
            } else {
                and_vanish = ' and vanish';
            }
        }

        switch (figurine.where | 0) {
        case OBJ_INVENT: {
            const loco = locomotion_fig(mtmp.data, 'drop');
            if (Blind() || suppress_see) {
                await You_feel(`something ${loco} from your pack!`);
            } else {
                await You_see_apply(
                    `${monnambuf} ${loco} out of your pack${and_vanish}!`,
                );
            }
            break;
        }
        case OBJ_FLOOR:
            if (cansee_spot && !silent) {
                // C set_msg_xy(cc) deferred
                if (suppress_see) {
                    await pline(`${an(xname(figurine))} suddenly vanishes!`);
                } else {
                    await You_see_apply(
                        `a figurine transform into ${monnambuf}${and_vanish}!`,
                    );
                }
                redraw = true;
            }
            break;
        case OBJ_MINVENT:
            if (cansee_spot && !silent && !suppress_see) {
                const mon = figurine.ocarry;
                let carriedby;
                if (mon && canseemon(mon)
                    && (!(mon.wormno | 0) || cansee(mon.mx | 0, mon.my | 0))) {
                    carriedby = `${s_suffix_fig(a_monnam(mon))} pack`;
                } else if (mon && is_pool(mon.mx | 0, mon.my | 0)) {
                    carriedby = 'empty water';
                } else {
                    carriedby = 'thin air';
                }
                await You_see_apply(
                    `${monnambuf} ${locomotion_fig(mtmp.data, 'drop')} out of ${carriedby}${and_vanish}!`,
                );
            }
            break;
        default:
            break;
        }
    }
    if (carried(figurine)) {
        useup(figurine);
    } else {
        obj_extract_self(figurine);
        obfree_fig(figurine);
    }
    if (redraw) newsym(cc.x, cc.y);
}

/**
 * C ref: apply.c use_figurine — swallow location fail ECMD_OK; getdir
 * cancel clears context.move/multi; failed loc after getdir is TIME;
 * You set/release/toss then make_familiar; stop FIG_TRANSFORM; useup;
 * Blind map_invisible. Named omit: getdir mouse.
 */
export async function use_figurine(obj) {
    if (!obj) return ECMD_OK;
    const u = game.u || (game.u = {});

    if (u.uswallow) {
        if (!(await figurine_location_checks(obj, null, false))) {
            return ECMD_OK;
        }
    }
    if (!(await getdir(null))) {
        if (!game.context) game.context = {};
        game.context.move = 0;
        game.multi = 0;
        return ECMD_CANCEL;
    }
    const x = (u.ux | 0) + (u.dx | 0);
    const y = (u.uy | 0) + (u.dy | 0);
    const cc = { x, y };
    if (!(await figurine_location_checks(obj, cc, false))) {
        return ECMD_TIME;
    }
    const act = (u.dx || u.dy)
        ? 'set the figurine beside you'
        : (Is_airlevel(u.uz) || Is_waterlevel(u.uz) || is_pool(cc.x, cc.y))
            ? 'release the figurine'
            : ((u.dz | 0) < 0
                ? 'toss the figurine into the air'
                : 'set the figurine on the ground');
    await pline(
        `You ${act} and it ${Blind() ? 'supposedly ' : ''}transforms.`,
    );
    await make_familiar(obj, cc.x, cc.y, false);
    stop_timer(FIG_TRANSFORM, obj);
    useup(obj);
    if (Blind()) map_invisible(cc.x, cc.y);
    return ECMD_TIME;
}

/** C monattk.h AT_ENGL / AD_BLND — swallow-blind gate in use_unicorn_horn. */
const AT_ENGL_UNI = 11;
const AD_BLND_UNI = 11;

/**
 * C ref: mondata.c attacktype_fordmg — first mattk with aatyp and adtyp
 * (AD_ANY==-1 wildcard). Local copy to avoid makemon/mhitu import cycles.
 */
function attacktype_fordmg(ptr, atyp, dtyp) {
    const slots = ptr?.mattk;
    if (!slots) return null;
    for (let i = 0; i < slots.length; i++) {
        const a = slots[i];
        if ((a?.aatyp | 0) === atyp
            && (dtyp === -1 || (a?.adtyp | 0) === dtyp)) {
            return a;
        }
    }
    return null;
}

/**
 * C youprop.h TimedTrouble — timeout-only intrinsic (no I_SPECIAL/extrinsic
 * high bits): ((P) && !((P) & ~TIMEOUT)) ? (P & TIMEOUT) : 0.
 */
function TimedTrouble(P) {
    const p = P | 0;
    if (p && !(p & ~TIMEOUT)) return p & TIMEOUT;
    return 0;
}

/**
 * C ref: apply.c unfixable_trouble_count :4431–4469.
 * Potion/spell restore-ability (is_horn FALSE) counts timed Sick/Stun/
 * Confusion/Hallucination/Vomiting/Deaf as unfixable; unihorn only
 * counts them when non-TIMEOUT bits remain. Caller: potion.c
 * peffect_restore_ability (D-1420).
 */
export function unfixable_trouble_count(is_horn) {
    const u = game.u || {};
    let unfixable_trbl = 0;

    if (u.Stoned) unfixable_trbl++;
    if (u.Slimed) unfixable_trbl++;
    const strangled = (u.Strangled | 0)
        || (u.HStrangled | 0)
        || (u.uprops?.[STRANGLED]?.intrinsic | 0);
    if (strangled) unfixable_trbl++;
    const wounded = !!(u.Wounded_legs
        || ((u.HWounded_legs | 0) & TIMEOUT)
        || (u.EWounded_legs | 0));
    if (((u.atemp?.a?.[A_DEX] | 0) < 0) && wounded) unfixable_trbl++;
    if (((u.atemp?.a?.[A_STR] | 0) < 0) && ((u.uhs | 0) >= WEAK)) {
        unfixable_trbl++;
    }

    const sick = u.Sick | 0;
    if (sick && (!is_horn || (sick & ~TIMEOUT) !== 0)) unfixable_trbl++;
    const hstun = u.HStun | 0;
    if (hstun && (!is_horn || (hstun & ~TIMEOUT) !== 0)) unfixable_trbl++;
    const hconf = u.HConfusion | 0;
    if (hconf && (!is_horn || (hconf & ~TIMEOUT) !== 0)) unfixable_trbl++;
    if (Hallucination()
        && (!is_horn || ((u.HHallucination | 0) & ~TIMEOUT) !== 0)) {
        unfixable_trbl++;
    }
    const vom = u.Vomiting | 0;
    if (vom && (!is_horn || (vom & ~TIMEOUT) !== 0)) unfixable_trbl++;
    if (Deaf_hero() && (!is_horn || ((u.HDeaf | 0) & ~TIMEOUT) !== 0)) {
        unfixable_trbl++;
    }
    return unfixable_trbl;
}

/**
 * C ref: apply.c use_unicorn_horn — cursed rn1(90,10)+rn2(13)/2 afflict;
 * else collect up to 7 TimedTrouble props, shuffle if >1, fix
 * rn2(d(2, blessed?4:2)) of them (null obj ≡ uncursed, poly #monster).
 * Named omit: impossible() on unknown idx; unfixable_trbl leftover.
 * @param {object|null} obj unicorn horn or null (poly ability)
 */
export async function use_unicorn_horn(obj) {
    const u = game.u || (game.u = {});

    if (obj && obj.cursed) {
        const lcount = rn1(90, 10);
        switch (Math.trunc(rn2(13) / 2)) { // case 6 half as likely
        case 0:
            await make_sick(
                ((u.Sick | 0) & TIMEOUT)
                    ? Math.trunc(((u.Sick | 0) & TIMEOUT) / 3) + 1
                    : rn1(acurr(A_CON), 20),
                xname(obj),
                true,
                SICK_NONVOMITABLE,
            );
            break;
        case 1:
            await make_blinded(BlindedTimeout() + lcount, true);
            break;
        case 2:
            if (!(u.HConfusion | 0)) {
                await pline(
                    `You suddenly feel ${Hallucination() ? 'trippy' : 'confused'}.`,
                );
            }
            await make_confused(((u.HConfusion | 0) & TIMEOUT) + lcount, true);
            break;
        case 3:
            await make_stunned(((u.HStun | 0) & TIMEOUT) + lcount, true);
            break;
        case 4:
            if (u.Vomiting) await vomit();
            else await make_vomiting(14, false);
            break;
        case 5:
            await make_hallucinated(
                ((u.HHallucination | 0) & TIMEOUT) + lcount,
                true,
                0,
            );
            break;
        case 6:
            if (Deaf_hero()) await pline(nothing_seems_to_happen);
            await make_deaf(((u.HDeaf | 0) & TIMEOUT) + lcount, true);
            break;
        }
        return;
    }

    const trouble_list = [];
    if (TimedTrouble(u.Sick)) trouble_list.push(SICK);
    if (TimedTrouble(u.HBlinded) > (u.ucreamed | 0)
        && !(u.uswallow
            && attacktype_fordmg(u.ustuck?.data, AT_ENGL_UNI, AD_BLND_UNI))) {
        trouble_list.push(BLINDED);
    }
    if (TimedTrouble(u.HHallucination)) trouble_list.push(HALLUC);
    if (TimedTrouble(u.Vomiting)) trouble_list.push(VOMITING);
    if (TimedTrouble(u.HConfusion)) trouble_list.push(CONFUSION);
    if (TimedTrouble(u.HStun)) trouble_list.push(STUNNED);
    if (TimedTrouble(u.HDeaf)) trouble_list.push(DEAF);

    const trouble_count = trouble_list.length;
    if (trouble_count === 0) {
        await pline(nothing_happens);
        return;
    }
    if (trouble_count > 1) shuffle_int_array(trouble_list, trouble_count);

    let val_limit = rn2(d(2, (obj && obj.blessed) ? 4 : 2));
    if (val_limit > trouble_count) val_limit = trouble_count;

    let did_prop = 0;
    for (let val = 0; val < val_limit; val++) {
        const idx = trouble_list[val];
        switch (idx) {
        case SICK:
            await make_sick(0, '', true, SICK_ALL);
            did_prop++;
            break;
        case BLINDED:
            await make_blinded(u.ucreamed | 0, true);
            did_prop++;
            break;
        case HALLUC:
            await make_hallucinated(0, true, 0);
            did_prop++;
            break;
        case VOMITING:
            await make_vomiting(0, true);
            did_prop++;
            break;
        case CONFUSION:
            await make_confused(0, true);
            did_prop++;
            break;
        case STUNNED:
            await make_stunned(0, true);
            did_prop++;
            break;
        case DEAF:
            await make_deaf(0, true);
            did_prop++;
            break;
        default:
            break;
        }
    }

    if (did_prop) {
        if (game.disp) game.disp.botl = true;
        if (game.flags) game.flags.botl = true;
    } else {
        await pline(nothing_seems_to_happen);
    }
}

/**
 * C ref: apply.c use_candelabrum — snuff if lit; else light attached
 * candles (Underwater / swallow / cursed fail; non-invocation age/=2).
 * Named omit: update_inventory redraw; impossible() log on age 0.
 */
export async function use_candelabrum(obj) {
    if (!obj) return;
    const s = ((obj.spe | 0) !== 1) ? 'candles' : 'candle';
    const u = game.u || {};

    if (obj.lamplit) {
        await pline(`You snuff the ${s}.`);
        end_burn(obj, true);
        return;
    }
    if ((obj.spe | 0) <= 0) {
        await pline(`This ${xname(obj)} has no ${s}.`);
        let hasCandle = false;
        for (const o of game.invent || []) {
            if (Is_candle(o)) {
                hasCandle = true;
                break;
            }
        }
        if (hasCandle) {
            await pline(
                `To attach candles, apply them instead of the ${xname(obj)}.`,
            );
        }
        return;
    }
    if (Underwater_hero()) {
        await pline('You cannot make fire under water.');
        return;
    }
    if (u.uswallow || obj.cursed) {
        if (!Blind()) {
            await pline(
                `The ${s} ${vtense(s, 'flicker')} for a moment, then ${vtense(s, 'die')}.`,
            );
        }
        return;
    }
    if ((obj.spe | 0) < 7) {
        await pline(
            `There ${vtense(s, 'are')} only ${obj.spe | 0} ${s} in ${the(xname(obj))}.`,
        );
        if (!Blind()) {
            await pline(
                `${(obj.spe | 0) === 1 ? 'It is' : 'They are'} lit.  ${Tobjnam_oil(obj, 'shine')} dimly.`,
            );
        }
    } else {
        await pline(
            `${The(xname(obj))}'s ${s} burn${Blind() ? '.' : ' brightly!'}`,
        );
    }
    if (!invocation_pos_apply(u.ux | 0, u.uy | 0)
        || On_stairs_apply(u.ux | 0, u.uy | 0)) {
        await pline(
            `The ${s} ${vtense(s, 'are')} being rapidly consumed!`,
        );
        // C: (age + 1L) / 2L — round up so age 1 does not become 0
        obj.age = Math.trunc(((obj.age | 0) + 1) / 2);
        if ((obj.age | 0) === 0) {
            obj.age = 1;
        }
    } else {
        if ((obj.spe | 0) === 7) {
            if (Blind()) {
                await pline(`${Tobjnam_oil(obj, 'radiate')} a strange warmth!`);
            } else {
                await pline(`${Tobjnam_oil(obj, 'glow')} with a strange light!`);
            }
        }
        obj.known = 1;
    }
    begin_burn(obj, false);
}

/**
 * C ref: apply.c use_candle — attach to carried candelabrum (spe<7) or
 * use_lamp. Swallow → no_elbow_room. Named omit: safe_qbuf truncation;
 * SetVoice; update_inventory; obj_split_light_source on lit split;
 * obfree oextra.
 */
export async function use_candle(optr) {
    let obj = optr;
    if (!obj) return;
    const u = game.u || {};
    let s = ((obj.quan | 0) !== 1) ? 'candles' : 'candle';

    if (u.uswallow) {
        await pline("You don't have enough elbow-room to maneuver.");
        return;
    }

    const otmp = carrying_apply(CANDELABRUM_OF_INVOCATION);
    if (!otmp || (otmp.spe | 0) === 7) {
        await use_lamp(obj);
        return;
    }

    // C: y_n(safe_qbuf attach …) — typical (non-truncated) yname path
    const qbuf = `Attach ${yname(obj)} to ${yname(otmp)}?`;
    if ((await yn_function(qbuf, 'yn', 'n')) === 'n') {
        await use_lamp(obj);
        return;
    }

    if ((otmp.spe | 0) + (obj.quan | 0) > 7) {
        const child = splitobj(obj, 7 - (otmp.spe | 0));
        if (child) obj = child;
        s = ((obj.quan | 0) !== 1) ? 'candles' : 'candle';
    }

    const was_lamplit = !!obj.lamplit;
    if (was_lamplit) end_burn(obj, true);

    await pline(
        `You attach ${obj.quan | 0}${!(otmp.spe | 0) ? '' : ' more'} ${s} to ${the(xname(otmp))}.`,
    );
    if (!(otmp.spe | 0) || (otmp.age | 0) > (obj.age | 0)) {
        otmp.age = obj.age | 0;
    }
    otmp.spe = (otmp.spe | 0) + (obj.quan | 0);
    if (otmp.lamplit && !was_lamplit) {
        await pline(`The new ${s} magically ${vtense(s, 'ignite')}!`);
    } else if (!otmp.lamplit && was_lamplit) {
        await pline(`${(obj.quan | 0) > 1 ? 'They go' : 'It goes'} out.`);
    }
    if (obj.unpaid) {
        // C SetVoice(shop_keeper(*in_rooms(..., SHOPBASE))) omitted
        const them = (obj.quan | 0) > 1 ? 'them' : 'it';
        await verbalize(
            `You ${otmp.lamplit ? 'burn' : 'use'} ${them}, you bought ${them}!`,
        );
    }
    if ((obj.quan | 0) < 7 && (otmp.spe | 0) === 7) {
        await pline(
            `${The(xname(otmp))} now has seven${otmp.lamplit ? ' lit' : ''} candles attached.`,
        );
    }
    if (otmp.lamplit) obj_merge_light_sources(otmp, otmp);
    useupall(obj);
    otmp.owt = weight(otmp);
    // update_inventory deferred
}

/**
 * C ref: apply.c reset_trapset — clear gt.trapinfo tobj / force_bungle.
 * Called from use_trap, set_trap, and do.c goto_level.
 */
export function reset_trapset() {
    const ti = game.trapinfo || (game.trapinfo = {});
    ti.tobj = null;
    ti.force_bungle = 0;
}

function trapinfo() {
    return game.trapinfo || (game.trapinfo = {
        tobj: null, tx: 0, ty: 0, time_needed: 0, force_bungle: 0,
    });
}

/**
 * C ref: shk.c use_unpaid_trapobj — bill dummy if unpaid.
 * Named omit: Deaf / find_objowner / SetVoice "You set it, you buy it!".
 */
async function use_unpaid_trapobj(otmp, _x, _y) {
    if (otmp?.unpaid) await bill_dummy_object(otmp);
}

/**
 * C ref: apply.c use_lamp — light or snuff oil lamp / magic lamp / lantern
 * (candle arms included; doapply candles dispatch use_candle, D-1025).
 * Cursed spill: make_glib((Glib&TIMEOUT)+d(2,10)) — Glib is
 * (HGlib|EGlib) remaining timeout, not a flat `u.Glib` boolean (D-1052).
 * Named omit: shop check_unpaid; candle unpaid SetVoice / bill_dummy.
 */
export async function use_lamp(obj) {
    if (!obj) return;
    const lamp = (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP)
        ? 'lamp'
        : (obj.otyp === BRASS_LANTERN) ? 'lantern' : null;

    if (obj.lamplit) {
        if (lamp) {
            await pline(`${Shk_Your_apply(obj)}${lamp} is now off.`);
        } else {
            await pline(`You snuff out ${yname(obj)}.`);
        }
        end_burn(obj, true);
        return;
    }
    if (Underwater_hero()) {
        await pline(`${!Is_candle(obj)
            ? 'This is not a diving lamp'
            : "Sorry, fire and water don't mix"}.`);
        return;
    }
    if ((!Is_candle(obj) && (obj.age | 0) === 0)
        || (obj.otyp === MAGIC_LAMP && (obj.spe | 0) === 0)) {
        if (obj.otyp === BRASS_LANTERN) {
            if (!Blind()) await pline('Your lantern is out of power.');
            else await pline(nothing_seems_to_happen);
        } else {
            await pline(`This ${xname(obj)} has no oil.`);
        }
        return;
    }
    if (obj.cursed && !rn2(2)) {
        if ((obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP) && !rn2(3)) {
            await pline(
                `The lamp spills and covers your ${fingers_or_gloves_apply(true)} with oil.`,
            );
            make_glib((Glib() & TIMEOUT) + d(2, 10));
        } else if (!Blind()) {
            await pline(
                `${Tobjnam_oil(obj, 'flicker')} for a moment, then ${otense_oil(obj, 'die')}.`,
            );
        } else {
            await pline(nothing_seems_to_happen);
        }
        return;
    }
    if (lamp) {
        // check_unpaid deferred
        await pline(`${Shk_Your_apply(obj)}${lamp} is now on.`);
    } else {
        await pline(
            `${s_suffix_apply(Yname2_oil(obj))} flame${plur_quan(obj.quan)} ${otense_oil(obj, 'burn')}${Blind() ? '.' : ' brightly!'}`,
        );
        // candle unpaid verbalize / bill_dummy deferred
    }
    begin_burn(obj, false);
}

/**
 * C ref: apply.c light_cocktail(struct obj **optr) — apply POT_OIL as a
 * lit flask. Writes *optr after snuff-merge (addinv) and after
 * split/hold; swallow / underwater / worn-snuff leave *optr unchanged.
 * Named omit: shop check_unpaid + SetVoice "in addition to the cost".
 * @param {{ obj: object|null }} optr
 */
export async function light_cocktail(optr) {
    // C: struct obj *obj = *optr
    let obj = optr?.obj;
    if (!obj) return;
    const u = game.u || {};

    if (u.uswallow) {
        await pline("You don't have enough elbow-room to maneuver.");
        return;
    }
    if (obj.lamplit) {
        await pline('You snuff the lit potion.');
        end_burn(obj, true);
        if (!obj.owornmask) {
            freeinv_apply(obj);
            optr.obj = await addinv(obj);
        }
        return;
    }
    if (Underwater_hero()) {
        await pline('There is not enough oxygen to sustain a fire.');
        return;
    }

    const split1off = (obj.quan || 1) > 1;
    if (split1off) {
        const child = splitobj(obj, 1);
        if (child) obj = child;
    }

    await pline(
        `You light ${shk_your_apply(obj)}potion.${Blind() ? '' : '  It gives off a dim light.'}`,
    );

    if (obj.unpaid && costly_spot(u.ux | 0, u.uy | 0)) {
        await bill_dummy_object(obj);
    }
    makeknown(obj.otyp);

    begin_burn(obj, false);
    if (split1off) {
        obj_extract_self(obj);
        obj.nomerge = 1;
        obj = await hold_another_object(obj, 'You drop %s!', doname(obj), null);
        if (obj) obj.nomerge = 0;
    }
    optr.obj = obj;
}

/**
 * C ref: apply.c set_trap — occupation while arming landmine / beartrap.
 * @returns {Promise<number>} 1 still busy, 0 done
 */
async function set_trap() {
    const ti = trapinfo();
    const otmp = ti.tobj;
    const u = game.u || {};

    if (!otmp || !carried_apply(otmp) || !u_at_xy(ti.tx, ti.ty)) {
        reset_trapset();
        return 0;
    }
    if (--ti.time_needed > 0) return 1;

    const ttyp = (otmp.otyp === LAND_MINE) ? LANDMINE : BEAR_TRAP;
    const ttmp = maketrap(u.ux | 0, u.uy | 0, ttyp);
    if (ttmp) {
        ttmp.madeby_u = 1;
        feeltrap(ttmp);
        if (in_rooms(u.ux | 0, u.uy | 0, SHOPBASE)) {
            add_damage(u.ux | 0, u.uy | 0, 0);
        }
        if (!ti.force_bungle) {
            await pline(`You finish arming ${the(trapname(ttyp, false))}.`);
        }
        if (((otmp.cursed || Fumbling()) && (rnl(10) > 5)) || ti.force_bungle) {
            await dotrap(ttmp, ti.force_bungle ? FORCEBUNGLE : 0);
        }
    } else {
        await pline('Your trap setting attempt fails.');
    }
    useup_apply(otmp);
    reset_trapset();
    return 0;
}

/**
 * C ref: apply.c use_trap — start/resume arming LAND_MINE / BEARTRAP.
 * Named omit: cmd.c reset_occupations caller (goto_level is wired).
 */
export async function use_trap(otmp) {
    if (!otmp) return;
    const u = game.u || {};
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const levtyp = game.level?.at?.(ux, uy)?.typ | 0;
    const occutext = 'setting the trap';
    let what = null;

    if (nohands(game.youmonst?.data)) what = 'without hands';
    else if (Stunned_apply()) what = 'while stunned';
    else if (u.uswallow) {
        what = digests(u.ustuck?.data) ? 'while swallowed' : 'while engulfed';
    } else if (Underwater_hero()) what = 'underwater';
    else if (Levitation_apply()) what = 'while levitating';
    else if (is_pool(ux, uy)) what = 'in water';
    else if (is_lava(ux, uy)) what = 'in lava';
    else if (stairway_at(ux, uy)) {
        const stway = stairway_at(ux, uy);
        what = stway?.isladder ? 'on the ladder' : 'on the stairs';
    } else if (IS_FURNITURE(levtyp) || IS_OBSTRUCTED(levtyp)
        || closed_door(ux, uy) || t_at(ux, uy)) {
        what = 'here';
    } else if (Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        what = (levtyp === AIR) ? 'in midair'
            : (levtyp === CLOUD) ? 'in a cloud'
                : 'in this place';
    }
    if (what) {
        await pline(`You can't set a trap ${what}!`);
        reset_trapset();
        return;
    }

    const ttyp = (otmp.otyp === LAND_MINE) ? LANDMINE : BEAR_TRAP;
    const ti = trapinfo();
    if (otmp === ti.tobj && u_at_xy(ti.tx, ti.ty)) {
        await pline(
            `You resume setting ${shk_your_apply(otmp)}${trapname(ttyp, false)}.`,
        );
        set_occupation(set_trap, occutext, 0);
        return;
    }
    ti.tobj = otmp;
    ti.tx = ux;
    ti.ty = uy;
    let tmp = acurr(A_DEX);
    ti.time_needed = (tmp > 17) ? 2 : (tmp > 12) ? 3 : (tmp > 7) ? 4 : 5;
    if (Blind()) ti.time_needed *= 2;
    tmp = acurr(A_STR);
    if (ttyp === BEAR_TRAP && tmp < 18) {
        ti.time_needed += (tmp > 12) ? 1 : (tmp > 7) ? 2 : 4;
    }
    if (u.usteed && P_SKILL(P_RIDING) < P_BASIC) {
        let chance;
        if (Fumbling() || otmp.cursed) chance = (rnl(10) > 3);
        else chance = (rnl(10) > 5);
        await pline(
            `You aren't very skilled at reaching from ${mon_nam(u.usteed)}.`,
        );
        const buf = `Continue your attempt to set ${the(trapname(ttyp, false))}?`;
        if ((await yn_function(buf, 'yn', 'n')) === 'y') {
            if (chance) {
                if (ttyp === LANDMINE) {
                    ti.time_needed = 0;
                    ti.force_bungle = 1;
                } else if (ttyp === BEAR_TRAP) {
                    reset_trapset();
                    await pline(`You drop ${the(trapname(ttyp, false))}!`);
                    await dropx(otmp);
                    return;
                }
            }
        } else {
            reset_trapset();
            return;
        }
    }
    await pline(
        `You begin setting ${shk_your_apply(otmp)}${trapname(ttyp, false)}.`,
    );
    await use_unpaid_trapobj(otmp, ux, uy);
    set_occupation(set_trap, occutext, 0);
}

/**
 * C ref: makemon.c bagotricks — apply / tip BAG_OF_TRICKS.
 * Named omit: pickup invent getobj tip.
 * @returns {Promise<number>} monsters created
 */
export async function bagotricks(bag, tipping = false, seencount = null) {
    let moncount = 0;
    if (!bag || bag.otyp !== BAG_OF_TRICKS) return 0;
    if ((bag.spe | 0) < 1) {
        await pline((tipping && bag.cknown) ? "It's empty." : nothing_happens);
        if (bag.dknown && game.objects?.[bag.otyp]?.oc_name_known) {
            bag.cknown = 1;
        }
        return 0;
    }
    await consume_obj_charge(bag, !tipping);
    let creatcnt = 1;
    let seecount = 0;
    if (!rn2(23)) creatcnt += rnd(7);
    do {
        const mtmp = makemon(null, game.u?.ux | 0, game.u?.uy | 0, NO_MM_FLAGS);
        if (mtmp) {
            moncount++;
            const ap = M_AP_TYPE(mtmp);
            if ((canseemon(mtmp) && (ap === M_AP_NOTHING || ap === M_AP_MONSTER))
                || sensemon(mtmp)) {
                seecount++;
            }
        }
    } while (--creatcnt > 0);
    if (seecount) {
        if (seencount && typeof seencount === 'object') {
            seencount.n = (seencount.n | 0) + seecount;
        }
        if (bag.dknown) makeknown(BAG_OF_TRICKS);
    } else if (!tipping) {
        await pline(!moncount ? nothing_happens : nothing_seems_to_happen);
    }
    return moncount;
}

/** C ref: apply.c rub_ok */
function rub_ok(obj) {
    if (!obj) return GETOBJ_EXCLUDE;
    if (obj.otyp === OIL_LAMP || obj.otyp === MAGIC_LAMP
        || obj.otyp === BRASS_LANTERN || is_graystone(obj)
        || obj.otyp === LUMP_OF_ROYAL_JELLY) {
        return GETOBJ_SUGGEST;
    }
    return GETOBJ_EXCLUDE;
}

function rub_suggest_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (o?.invlet && rub_ok(o) === GETOBJ_SUGGEST) lets.push(o.invlet);
    }
    lets.sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));
    return lets.join('');
}

/**
 * C ref: invent.c getobj("rub", rub_ok).
 * Canned KEY live (dorub re-queue); CMDQ_INT aborts (!ALLOWCNT).
 */
async function getobj_rub() {
    const cq = getobj_from_cmdq(rub_ok, false);
    if (!cq.skip) return cq.otmp;

    const raw = rub_suggest_lets();
    if (!raw) {
        await pline("You don't have anything to rub.");
        return null;
    }
    for (;;) {
        await flush_topl_more();
        const lets = raw.length > 5 ? compactify_invlets(raw) : raw;
        const query = `What do you want to rub? [${lets} or ?*]`;
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        if (key === 27) return null;
        const ch = String.fromCharCode(key);
        if (ch === '?' || ch === '*') {
            // menu listing deferred — re-prompt
            continue;
        }
        for (const o of game.invent || []) {
            if (o.invlet === ch && rub_ok(o) === GETOBJ_SUGGEST) {
                getobj_record_repeat(o, ch);
                return o;
            }
        }
        await pline(`You don't have that object.`);
    }
}

/** C ref: cmd.c cmdq_add_ec / cmdq_add_key for dorub re-queue after wield. */
function cmdq_add_ec(fn) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    game._cmdq_canned.push(fn);
}
function cmdq_add_key(ch) {
    if (!game._cmdq_canned) game._cmdq_canned = [];
    const key = typeof ch === 'string' ? ch.charCodeAt(0) : ch;
    game._cmdq_canned.push({ typ: 'key', key });
}

/**
 * C ref: apply.c dorub — #rub lamp/stone/jelly.
 * MAGIC_LAMP spe>0 !rn2(3) → transform then djinni_from_bottle (D-1144).
 * Named omissions: SetVoice; royal jelly already via use_royal_jelly.
 * @returns {number} ECMD_*
 */
export async function dorub() {
    const youdata = game.youmonst?.data;
    if (youdata && nohands(youdata)) {
        await pline("You aren't able to rub anything without hands.");
        return ECMD_OK;
    }
    const obj = await getobj_rub();
    if (!obj) return ECMD_CANCEL;

    if (obj.oclass === GEM_CLASS || obj.oclass === FOOD_CLASS) {
        // C: is_graystone → use_stone; LUMP_OF_ROYAL_JELLY → use_royal_jelly
        if (is_graystone(obj)) {
            return use_stone(obj);
        }
        if (obj.otyp === LUMP_OF_ROYAL_JELLY) {
            return use_royal_jelly(obj);
        }
        await pline("Sorry, I don't know how to use that.");
        return ECMD_OK;
    }

    const u = game.u || {};
    if (obj !== u.uwep) {
        if (await wield_tool(obj, 'rub')) {
            cmdq_add_ec(dorub);
            cmdq_add_key(obj.invlet);
            return ECMD_TIME;
        }
        return ECMD_OK;
    }

    // now uwep is obj
    if (obj.otyp === MAGIC_LAMP) {
        if ((obj.spe | 0) > 0 && !rn2(3)) {
            // C apply.c:1818–1831 — bones: transform before djinni
            await check_unpaid_usage(obj, true);
            obj.otyp = OIL_LAMP;
            obj.spe = 0;
            obj.age = rn1(500, 1000);
            if (obj.lamplit) begin_burn(obj, true);
            await djinni_from_bottle(obj);
            makeknown(MAGIC_LAMP);
            update_inventory();
        } else if (rn2(2)) {
            const Blind = !!(u.Blind);
            await pline(`You ${Blind ? 'smell' : 'see a puff of'} smoke.`);
        } else {
            await pline(nothing_happens);
        }
    } else if (obj.otyp === BRASS_LANTERN) {
        await pline('Rubbing the electric lamp is not particularly rewarding.');
        await pline('Anyway, nothing exciting happens.');
    } else {
        await pline(nothing_happens);
    }
    return ECMD_TIME;
}

// --- #jump (apply.c dojump / jump) -----------------------------------------

const BOULDER = objectNames.indexOf('BOULDER');

/** C ref: apply.c enum jump_trajectory */
const J_ANY = 0;
const J_HORZ = 1;
const J_VERT = 2;
const J_DIAG = 3;

/** C: Jumping (HJumping || EJumping). */
function Jumping() {
    const u = game.u || {};
    return !!(u.HJumping || u.EJumping);
}

/** C: Passes_walls — not needed for knight physical jump; stub false. */
function Passes_walls() {
    const u = game.u || {};
    return !!(u.HPasses_walls || u.EPasses_walls);
}

function closed_door_xy(x, y) {
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const m = loc.doormask | 0;
    return (m & (D_CLOSED | D_LOCKED)) !== 0;
}

function sobj_at_otyp(otyp, x, y) {
    if (otyp < 0) return null;
    for (const obj of objects_at(x, y) || []) {
        if ((obj.otyp | 0) === otyp) return obj;
    }
    return null;
}

function distu_xy(x, y) {
    const u = game.u || {};
    return dist2(u.ux | 0, u.uy | 0, x, y);
}

/**
 * C ref: apply.c check_jump — walk_path callback for jump clearance.
 * @param {number} traj
 */
function check_jump(traj, x, y) {
    if (Passes_walls()) return true;
    const loc = game.level?.locations?.[x]?.[y];
    if (!loc) return false;
    if (IS_STWALL(loc.typ)) return false;
    if (IS_DOOR(loc.typ)) {
        if (closed_door_xy(x, y)) return false;
        if ((loc.doormask & D_ISOPEN) !== 0 && traj !== J_ANY) {
            if (traj === J_DIAG
                || (((traj & J_HORZ) !== 0) === !!(loc.horizontal))) {
                return false;
            }
        }
    }
    if (sobj_at_otyp(BOULDER, x, y)
        && !throws_rocks(game.youmonst?.data)) {
        return false;
    }
    return true;
}

/**
 * C ref: apply.c is_valid_jump_pos
 * Named omissions: full doorway horizontal bit edge cases already mirrored.
 */
async function is_valid_jump_pos(x, y, magic, showmsg) {
    const u = game.u || {};
    const HJumping = u.HJumping | 0;
    const EJumping = u.EJumping | 0;
    // C: !magic && !(HJumping & ~INTRINSIC) && !EJumping && distu != 5
    // Knight FROMOUTSIDE is inside INTRINSIC → chess-only unless extrinsic.
    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping && distu_xy(x, y) !== 5) {
        if (showmsg) await pline('Illegal move!');
        return false;
    } else if (distu_xy(x, y) > (magic ? 6 + magic * 3 : 9)) {
        if (showmsg) await pline('Too far!');
        return false;
    } else if (!isok(x, y)) {
        if (showmsg) await pline('You cannot jump there!');
        return false;
    } else if (!cansee(x, y)) {
        if (showmsg) await pline('You cannot see where to land!');
        return false;
    } else {
        const lev = game.level?.locations?.[u.ux]?.[u.uy];
        const dx = (x | 0) - (u.ux | 0);
        const dy = (y | 0) - (u.uy | 0);
        let ax = Math.abs(dx);
        let ay = Math.abs(dy);
        const diag = (magic || Passes_walls() || (!dx && !dy))
            ? J_ANY
            : !dy ? J_HORZ : !dx ? J_VERT : J_DIAG;
        if (ax >= 2 * ay) ay = 0;
        else if (ay >= 2 * ax) ax = 0;
        const traj = (magic || Passes_walls() || (!ax && !ay))
            ? J_ANY
            : !ay ? J_HORZ : !ax ? J_VERT : J_DIAG;
        if (diag === J_DIAG && lev && IS_DOOR(lev.typ)
            && (lev.doormask & D_ISOPEN) !== 0
            && (traj === J_DIAG
                || (((traj & J_HORZ) !== 0) === !!(lev.horizontal)))) {
            if (showmsg) await pline("You can't jump diagonally out of a doorway.");
            return false;
        }
        const uc = { x: u.ux | 0, y: u.uy | 0 };
        const tc = { x: x | 0, y: y | 0 };
        if (!walk_path(uc, tc, (arg, nx, ny) => check_jump(arg, nx, ny), traj)) {
            if (showmsg) {
                await pline('There is an obstacle preventing that jump.');
            }
            return false;
        }
    }
    return true;
}

/** C ref: apply.c get_valid_jump_position */
function get_valid_jump_position(x, y) {
    const loc = game.level?.locations?.[x]?.[y];
    if (!isok(x, y)) return false;
    if (!(ACCESSIBLE(loc?.typ) || Passes_walls())) return false;
    // sync validation without messages — use a sync subset
    return is_valid_jump_pos_sync(x, y, game.jumping_is_magic | 0);
}

/**
 * Sync mirror of is_valid_jump_pos for getpos_getvalid (no pline).
 */
function is_valid_jump_pos_sync(x, y, magic) {
    const u = game.u || {};
    const HJumping = u.HJumping | 0;
    const EJumping = u.EJumping | 0;
    if (!magic && !(HJumping & ~INTRINSIC) && !EJumping && distu_xy(x, y) !== 5) {
        return false;
    }
    if (distu_xy(x, y) > (magic ? 6 + magic * 3 : 9)) return false;
    if (!isok(x, y)) return false;
    if (!cansee(x, y)) return false;
    const lev = game.level?.locations?.[u.ux]?.[u.uy];
    const dx = (x | 0) - (u.ux | 0);
    const dy = (y | 0) - (u.uy | 0);
    let ax = Math.abs(dx);
    let ay = Math.abs(dy);
    const diag = (magic || Passes_walls() || (!dx && !dy))
        ? J_ANY
        : !dy ? J_HORZ : !dx ? J_VERT : J_DIAG;
    if (ax >= 2 * ay) ay = 0;
    else if (ay >= 2 * ax) ax = 0;
    const traj = (magic || Passes_walls() || (!ax && !ay))
        ? J_ANY
        : !ay ? J_HORZ : !ax ? J_VERT : J_DIAG;
    if (diag === J_DIAG && lev && IS_DOOR(lev.typ)
        && (lev.doormask & D_ISOPEN) !== 0
        && (traj === J_DIAG
            || (((traj & J_HORZ) !== 0) === !!(lev.horizontal)))) {
        return false;
    }
    const uc = { x: u.ux | 0, y: u.uy | 0 };
    const tc = { x: x | 0, y: y | 0 };
    return walk_path(uc, tc, (arg, nx, ny) => check_jump(arg, nx, ny), traj);
}

/**
 * C ref: apply.c display_jump_positions — tmp_at goodpos hilite.
 * getpos_sethilite still force-newsyms valid cells so flush_screen(0)
 * cursor matches C; paint is live when SHOWVALID toggles HiliteGoodpos.
 */
function display_jump_positions(on_off) {
    // C apply.c display_jump_positions — tmp_at DISP_BEAM S_goodpos
    if (on_off) {
        tmp_at(DISP_BEAM, cmap_to_glyph_goodpos());
        const u = game.u || {};
        for (let dx = -4; dx <= 4; dx++) {
            for (let dy = -4; dy <= 4; dy++) {
                const x = dx + (u.ux | 0);
                const y = dy + (u.uy | 0);
                if (get_valid_jump_position(x, y) && !u_at_xy(x, y)) {
                    tmp_at(x, y);
                }
            }
        }
    } else {
        tmp_at(DISP_END, 0);
    }
}

/**
 * C ref: apply.c dojump — physical jump.
 */
export async function dojump() {
    return jump(0);
}

/**
 * C ref: apply.c jump(magic) — 0=physical, else spell skill (D-0899 /
 * D-1397). Named omissions: #jump known_spell fallback; nolimbs/slithy;
 * stucksteed; encumbrance/hunger/wounded-legs; steed utrap; trap-escape
 * arms; hurtle_jump body (success still teleds after walk_path always-true
 * stub).
 */
export async function jump(magic) {
    const u = game.u || {};

    if (!magic && !Jumping()) {
        await pline("You can't jump very far.");
        return ECMD_OK;
    }
    if (u.uswallow) {
        if (magic) {
            await pline('You bounce around a little.');
            return ECMD_TIME;
        }
        await pline("You've got to be kidding!");
        return ECMD_OK;
    }
    if (u.uinwater) {
        if (magic) {
            await pline('You swish around a little.');
            return ECMD_TIME;
        }
        await pline('This calls for swimming, not jumping!');
        return ECMD_OK;
    }
    if (u.ustuck) {
        /* C apply.c :2023–2036 — tame pull-free then magic writhe. */
        if (u.ustuck.mtame && !hero_conflict() && !u.ustuck.mconf) {
            const mtmp = u.ustuck;
            set_ustuck(null);
            await pline(`You pull free from ${mon_nam(mtmp)}.`);
            return ECMD_TIME;
        }
        if (magic) {
            await pline(
                `You writhe a little in the grasp of ${mon_nam(u.ustuck)}!`,
            );
            return ECMD_TIME;
        }
        await pline(`You cannot escape from ${mon_nam(u.ustuck)}!`);
        return ECMD_OK;
    }
    if (u.Levitation || u.HLevitation || u.ELevitation
        || Is_airlevel(u.uz) || Is_waterlevel(u.uz)) {
        if (magic) {
            await pline('You flail around a little.');
            return ECMD_TIME;
        }
        await pline("You don't have enough traction to jump.");
        return ECMD_OK;
    }

    await pline('Where do you want to jump?');
    const cc = { x: u.ux | 0, y: u.uy | 0 };
    game.jumping_is_magic = magic | 0;
    getpos_sethilite(display_jump_positions, get_valid_jump_position);
    if ((await getpos(cc, true, 'the desired position')) < 0) {
        return ECMD_CANCEL;
    }
    if (!(await is_valid_jump_pos(cc.x, cc.y, magic, true))) {
        return ECMD_FAIL;
    }
    if (u.usteed && (u.ux | 0) === (cc.x | 0) && (u.uy | 0) === (cc.y | 0)) {
        await pline(`${Monnam(u.usteed)} isn't capable of jumping in place.`);
        return ECMD_FAIL;
    }

    // Same-spot / trap-escape arms deferred — seed path jumps elsewhere.
    if ((u.ux | 0) === (cc.x | 0) && (u.uy | 0) === (cc.y | 0)) {
        await pline('You decide not to jump after all.');
        return ECMD_OK;
    }

    const uc = { x: u.ux | 0, y: u.uy | 0 };
    let range = Math.abs((cc.x | 0) - (uc.x | 0));
    const temp = Math.abs((cc.y | 0) - (uc.y | 0));
    if (range < temp) range = temp;
    // C: walk_path(..., hurtle_jump, &range) — hurtle body deferred;
    // always-true keeps dest so teleds lands on the chosen cell.
    walk_path(uc, cc, () => true, range);
    await teleds(cc.x, cc.y, TELEDS_NO_FLAGS);
    nomul(-1);
    if (!game.multi_reason) game.multi_reason = 'jumping around';
    game.nomovemsg = '';
    await morehungry(rnd(25));
    return ECMD_TIME;
}

/** C objnam.c Yname2 — capitalized yname (minvent uses shk_your mon_owns). */
function Yname2_snuff(obj) {
    const s = yname(obj);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** C shk.c Shk_Your — capitalized shk_your (trailing space). */
function Shk_Your_snuff(obj) {
    const s = shk_your(obj);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** C objnam.c otense — plural verb if quan!=1, else vtense(NULL, verb). */
function otense_snuff(obj, verb) {
    if ((obj?.quan | 0) !== 1) return verb;
    return vtense(null, verb);
}

/**
 * C ref: apply.c snuff_candle — lit candles / candelabrum; end_burn TRUE.
 * Callers: snuff_lit; throwit_mon_hit (D-1313); really_kick_object (D-1325);
 * throwit land `:1818` (D-1333); mthrowu return_from_mtoss `:942` (D-1334).
 * @returns {Promise<boolean>}
 */
export async function snuff_candle(otmp) {
    if (!otmp) return false;
    const candle = Is_candle(otmp);
    if ((candle || (otmp.otyp | 0) === CANDELABRUM_OF_INVOCATION)
        && otmp.lamplit) {
        const loc = get_obj_location(otmp, 0) || { x: 0, y: 0 };
        const many = candle ? ((otmp.quan | 0) > 1) : ((otmp.spe | 0) > 1);
        if (otmp.where === OBJ_MINVENT ? cansee(loc.x, loc.y) : !Blind()) {
            await pline(
                `${Shk_Your_snuff(otmp)}${candle ? '' : "candelabrum's "}candle${
                    many ? "s'" : "'s"
                } flame${many ? 's are' : ' is'} extinguished.`,
            );
        }
        end_burn(otmp, true);
        return true;
    }
    return false;
}

/**
 * C ref: apply.c snuff_lit — lamps / lantern / POT_OIL, else snuff_candle.
 * gulpmm minvent (D-1242). splash_lit is D-1337. Named omit: gulpmu invent;
 * gulpum; litroom artifact_light; pickup obj_is_burning.
 * throwit_mon_hit / really_kick_object / throwit land / mthrowu notcaught
 * use snuff_candle, not this (D-1313 / D-1325 / D-1333 / D-1334).
 * @returns {Promise<boolean>}
 */
export async function snuff_lit(obj) {
    if (!obj?.lamplit) return false;
    const t = obj.otyp | 0;
    if (t === OIL_LAMP || t === MAGIC_LAMP
        || t === BRASS_LANTERN || t === POT_OIL) {
        const loc = get_obj_location(obj, 0) || { x: 0, y: 0 };
        if (obj.where === OBJ_MINVENT ? cansee(loc.x, loc.y) : !Blind()) {
            await pline(
                `${Yname2_snuff(obj)} ${otense_snuff(obj, 'go')} out!`,
            );
        }
        end_burn(obj, true);
        return true;
    }
    if (await snuff_candle(obj)) return true;
    return false;
}

/**
 * C ref: apply.c splash_lit — water hits a lit object (`:1518–1572`).
 * Callers: trap.c `water_damage` `:4722`; rust-trap invent walk `:1632–1636`
 * and minvent walk `:1697–1701`. Brass lantern on rust trap / nymph carry
 * stays lit (crackle/flicker); dunk/submerge/container/swallow snuffs then
 * drains age. Live `snuff_lit`/`end_burn` (D-1242). Named omit: gulpmu
 * invent / gulpum / litroom / pickup (those call `snuff_lit`, not this).
 * @returns {Promise<boolean>}
 */
export async function splash_lit(obj) {
    if (!obj) return false;
    let dunk = false;

    /* C: lantern won't be extinguished by a rust trap or rust monster
       attack but will be if submerged or placed into a container or
       swallowed. */
    if (obj.lamplit && (obj.otyp | 0) === BRASS_LANTERN) {
        let useeit = false;
        let uhearit = false;
        let snuff = true;
        const u = game.u || {};

        if (obj.where === OBJ_INVENT) {
            useeit = !Blind();
            uhearit = !((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf);
            const lev = !!(((u.HLevitation | 0) || (u.ELevitation | 0))
                && !(u.BLevitation | 0));
            const fly = !!(((u.HFlying | 0) || (u.EFlying | 0)
                || (u.usteed && is_flyer(u.usteed.data)))
                && !(u.BFlying | 0));
            const wwalk = !Is_waterlevel(u.uz)
                && !!((u.HWwalking | 0) || (u.EWwalking | 0));
            dunk = is_pool(u.ux | 0, u.uy | 0)
                && ((!lev && !fly && !wwalk) || Is_waterlevel(u.uz));
            snuff = false;
        } else if (obj.where === OBJ_MINVENT && obj.ocarry
                   && humanoid(obj.ocarry.data)) {
            const mtmp = obj.ocarry;
            const loc = get_obj_location(obj, 0);
            const x = loc ? loc.x | 0 : 0;
            const y = loc ? loc.y | 0 : 0;
            useeit = !!(loc && cansee(x, y));
            uhearit = couldsee(x, y) && distu_apply(x, y) < 5 * 5;
            dunk = is_pool(mtmp.mx | 0, mtmp.my | 0)
                && ((!is_flyer(mtmp.data) && !is_floater(mtmp.data))
                    || Is_waterlevel(u.uz));
            snuff = false;
            if (useeit) set_msg_xy(x, y);
        }

        if (useeit || uhearit) {
            await pline(
                `${Yname2_snuff(obj)} ${uhearit ? 'crackles' : ''}${
                    (uhearit && useeit) ? ' and ' : ''
                }${useeit ? 'flickers' : ''}.`,
            );
        }
        if (!dunk && !snuff) return false;
    }

    const result = await snuff_lit(obj);

    if (dunk) {
        const age = obj.age | 0;
        obj.age = age - (age > 200 ? 100 : ((age / 2) | 0));
    }
    return result;
}

/**
 * C ref: apply.c catch_lit — fire-damage ignition of light sources.
 * Named omissions: shop check_unpaid / SetVoice verbalize / bill_dummy;
 * set_msg_xy floor msg cursor.
 * @returns {Promise<boolean>}
 */
export async function catch_lit(obj) {
    if (!obj || obj.lamplit) return false;
    const {
        ignitable, age_is_relative, get_obj_location, begin_burn,
    } = await import('./timeout.js');
    if (!ignitable(obj)) return false;
    const loc = get_obj_location(obj, 0);
    if (!loc) return false;

    const t = obj.otyp | 0;
    if (((t === MAGIC_LAMP || t === CANDELABRUM_OF_INVOCATION)
            && (obj.spe | 0) === 0)
        || (age_is_relative(obj) && (obj.age | 0) === 0)
        || t === BRASS_LANTERN) {
        return false;
    }
    if (t === CANDELABRUM_OF_INVOCATION && obj.cursed) return false;
    if ((t === OIL_LAMP || t === MAGIC_LAMP) && obj.cursed && !rn2(2)) {
        return false;
    }

    const u = game.u || {};
    const Blind = !!((u.HBlind | 0) || (u.EBlind | 0) || u.Blind
        || ((u.HBlinded | 0) & TIMEOUT) || (u.EBlinded | 0));
    const invent = obj.where === OBJ_INVENT
        || (game.invent || []).includes(obj);
    if (invent || cansee(loc.x, loc.y)) {
        // set_msg_xy deferred
        const nm = invent
            ? (() => {
                const s = `your ${xname(obj)}`;
                return s.charAt(0).toUpperCase() + s.slice(1);
            })()
            : (() => {
                const s = xname(obj);
                return s.charAt(0).toUpperCase() + s.slice(1);
            })();
        const verb = Blind ? 'feel' : 'catch';
        const tensed = ((obj.quan | 0) !== 1)
            ? verb
            : (/[sxz]$/.test(verb) || /(?:ch|sh)$/.test(verb)
                ? `${verb}es`
                : `${verb}s`);
        await pline(`${nm} ${tensed} ${Blind ? 'warm.' : 'light!'}`);
    }
    if (t === POT_OIL) makeknown(obj.otyp);
    // shop unpaid bill deferred (check_unpaid / verbalize / bill_dummy)
    begin_burn(obj, false);
    return true;
}
