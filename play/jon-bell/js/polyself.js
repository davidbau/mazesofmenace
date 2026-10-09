// @ts-nocheck
// polyself.c — hero polymorph (poly_self / polyself / polymon / newman / set_uasmon).
// C ref: nethack-c/src/polyself.c
// @ts-nocheck — sibling imports from hand-maintained js/*.js.
//
// Scope: the wand/spell-of-polymorph SELF-ZAP path — polyself(POLY_NOFLAGS) for a
// and the polymon(mntmp) it calls.  The controlled-poly (getlin name prompt),
// draconian/were/vampire special-shift branches, and newman() body are present in
// structure but route to a faithful-stub guard if reached off the wand path
//
// RNG order (the C poly_self/polymon leaf sequence this reproduces leaf-for-leaf):
//   rn2(20)              controllability   polyself.c:490   (>ACURR(A_CON)? shudder:proceed)
//   rn1(SPECIAL_PM,LOW)  random monster    polyself.c:702   (the form-pick loop)
//   rn2(2),rn2(19)       exercise CON,WIS  attrib.c:509     (inside polymon, pre-mtimedone)
//   rn2(10)              gender dochange   polyself.c:792
//   rn1(500,500)         poly timeout      polyself.c:813   (u.mtimedone)
//   d(mlvl,8)            new-form maxHP    polyself.c:868
import { rn2, rnd, rn1, d } from './rng.js';
import { game } from './gstate.js';
import { PM_COCKATRICE, PM_CHICKATRICE } from './pm.generated.js';
function pline_The(msg, ...args) { return pline('The ' + msg, ...args); }
function touch_petrifies(pd) { const i = pd?.pmidx | 0; return i === PM_COCKATRICE || i === PM_CHICKATRICE; }
import { pline, urgent_pline, newsym, see_monsters, flush_screen, _topl_stash_result, _topl_merge_result, _topl_joins_snapshot, canspotmon } from './display.js';
import { exercise, acurr, getAbase, getAmax, C_ATTR_TO_DISP, redist_attr, adjabil, setuhpmax } from './attrib.js';
import { the_unique_pm, permonstTemplate, monPmname, name_to_mon, name_to_monclass, mkclass, dmgtype_fromattack, sliparm, attacktype_fordmg, set_mon_data, is_home_elemental as is_home_elemental_real } from './makemon.js';
import { getlin } from './wizcmds.js';
import { mungspaces, valid_vampshiftform, set_ustuck, mksobj } from './mklev.js';
import * as cmdNS from './cmd.js';
import { mnexto } from './teleport.js';
import { rndexp } from './exper_pure.js';
import { newhp, newpw } from './exper.js';
import {
    find_ac, donning, encumber_msg, takeoff_slot_noac, Cloak_off, Gloves_off, Helmet_off, worn_invent_obj, cancel_don,
} from './do_wear.js';
import { dropx, useup, welded, setuwep, surface, ceiling, waterbody_name, yname, You_cant, youhiding as youhiding_enlightenment, instapetrify as instapetrify_real } from './cmd.js';
import { losehp } from './dokick.js';
import { end_burn } from './timeout.js';
import { make_sick, make_stoned, make_slimed } from './potion.js';
import { newuhs } from './eat.js';
import { artifact_light, arti_light_radius } from './light.js';
import { setworn } from './worn.js';
import { uwepgone as _uwepgone, uswapwepgone as _uswapwepgone } from './steal.js';
import { weapon_descr, MONS_NAMES } from './uhitm.js';
import { the, cloak_simple_name, helm_simple_name, cxname, vtense, makeplural, simple_typename, simpleonames, ansimpleoname, otense } from './objnam.js';
import { observe_object, discover_object } from './o_init.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL, MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import {
    W_ARM, W_ARMOR, W_ACCESSORY, W_SADDLE, W_ARMU, W_WEP, W_SWAPWEP,
    NOT_HUNGRY, SATIATED, HUNGRY, WEAK, FAINTING, TT_PIT, TT_WEB, TT_BEARTRAP,
    TT_LAVA, TT_INFLOOR, TT_BURIEDBALL, MAXULEV, FROMFORM,
    PROT_FROM_SHAPE_CHANGERS, FIRE_RES, COLD_RES, SLEEP_RES, DISINT_RES,
    SHOCK_RES, POISON_RES, ACID_RES, STONE_RES, DRAIN_RES, ANTIMAGIC,
    SICK_RES, SICK, STONED, SLIMED, STUNNED, HALLUC_RES, SEE_INVIS, TELEPAT, INFRAVISION, INVIS,
    TELEPORT, TELEPORT_CONTROL, POLYMORPH_CONTROL, LEVITATION, FLYING, SWIMMING, PASSES_WALLS,
    REGENERATION, REFLECTING, BLINDED, BLND_RES, STRANGLED,
    ECMD_OK, ECMD_TIME, ECMD_CANCEL, Is_airlevel, Is_waterlevel, KILLED_BY_AN,
    KILLED_BY, DIED,
    I_SPECIAL, G_GENOD,
    UNCHANGING as UNCHANGING_PS,
    MAGICAL_BREATHING,
    IS_FOUNTAIN,
} from './const.js';
import { getdir } from './lock.js';
import { ubuzz, ubreatheu, make_blinded, set_HBlinded } from './zap.js';
/* C hack.h Blind — the same reader the status line and vision_recalc use. */
import { Blind as Blind_vis } from './vision.js';
import { nomul, unmul } from './allmain.js';
import { deadhero, do_death_sequence, done, yn_function } from './end.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import { dmgtype } from './dogmove.js';
import { float_vs_flight, breakarm, num_horns, update_inventory, hliquid, defended, Some_Monnam } from './mhitm.js';
import { is_pool } from './look.js';
/* Shared trap timer/status bookkeeping (C trap.c:set_utrap). */
import { set_utrap, unpunish } from './dig.js';
import { buried_ball_to_freedom, reset_utrap, selftouch, t_at, deltrap, maketrap, dotrap, feeltrap } from './trap.js';
import { On_stairs } from './mklev.js';
import { is_pool_or_lava } from './look.js';
import { spoteffects } from './landing-effects.js';
import { mon_nam } from './uhitm.js';
import { expels_gu } from './mhitu.js';
import { Monnam } from "./mcastu.js";
import { bhp_bury_objs, dismount_steed as dismount_steed_real } from './cmd.js';
import { in_rooms, add_damage, pay_for_damage } from './shk.js';
import { may_dig as may_dig_look } from './look.js';
import { watch_dig } from './dig.js';
import { morehungry } from './eat.js';
import { recalc_block_point } from './vision.js';
import { IS_OBSTRUCTED, IS_TREE, IS_WALL, IS_DOOR, DOOR, SDOOR, D_BROKEN, D_NODOOR, D_TRAPPED, ROOM, CORR, SHOPBASE, SHOP_DOOR_COST, DISMOUNT_POLY } from './const.js';
import { set_mimic_blocking } from './sit.js';
import { sticks } from './dog.js';
import {
    PM_BABY_GRAY_DRAGON, PM_GHOUL, PM_STALKER, PM_BLACK_LIGHT, PM_SILVER_DRAGON,
    PM_FLOATING_EYE, PM_MIND_FLAYER, PM_MASTER_MIND_FLAYER, PM_DEATH, PM_VAMPIRE,
    PM_VLAD_THE_IMPALER, PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_PURPLE_WORM,
    PM_BABY_PURPLE_WORM, PM_SHRIEKER, PM_AIR_ELEMENTAL, PM_WINGED_GARGOYLE,
    PM_MARILITH, PM_CAVE_SPIDER, PM_GIANT_SPIDER, PM_GREMLIN,
    PM_GIANT_EEL, PM_ELECTRIC_EEL,
    PM_FOG_CLOUD, PM_FIRE_ELEMENTAL, PM_SALAMANDER,
    PM_HILL_ORC, PM_MORDOR_ORC, PM_GREEN_ELF, PM_GREY_ELF,
    PM_CLERIC, PM_PRIEST,
    PM_WERERAT, PM_WEREJACKAL, PM_WEREWOLF, PM_JACKAL, PM_FOX, PM_COYOTE,
    PM_WOLF, PM_WARG, PM_WINTER_WOLF, PM_WINTER_WOLF_CUB,
    PM_SEWER_RAT, PM_GIANT_RAT, PM_RABID_RAT,
    PM_HUMAN_WERERAT, PM_HUMAN_WEREJACKAL, PM_HUMAN_WEREWOLF,
    PM_STONE_GIANT, PM_HILL_GIANT,
} from './pm.generated.js';

// ── attrib indices (attrib.h) ────────────────────────────────────────────────
const A_STR = 0;
const A_WIS = 2;
const A_CON = 4;
// ── do_name gender constants (NUM_MGENDERS) ──────────────────────────────────
const MALE = 0;
const FEMALE = 1;
const NEUTRAL = 2;
// C role.c races[] noun/adj/individual, indexed by flags.initrace
// (0=human 1=elf 2=dwarf 3=gnome 4=orc).  individual.{m,f} is 0/NULL for all
// but human, in which case newman()/polyman() fall back to noun (see newman).
const RACE_NOUN = ['human', 'elf', 'dwarf', 'gnome', 'orc'];
const RACE_ADJ = ['human', 'elven', 'dwarven', 'gnomish', 'orcish'];
const RACE_INDIVIDUAL = [['man', 'woman'], [null, null], [null, null], [null, null], [null, null]];
// ── monsters.h / monflag.h indices + flag bits ───────────────────────────────
const NON_PM = -1;
const PM_HUMAN = 260;                    /* placeholder human (is_placeholder set) */
const G_UNIQ = 0x1000;                   /* mons[].geno G_UNIQ */
const LOW_PM = 0;
const SPECIAL_PM = /** @type {number} */ (monsPack.special_pm);
const S_GOLEM = 55;
const S_DRAGON = 30;
const PM_GIANT = 169;
const PM_GRAY_DRAGON = 143;   /* first adult dragon (mons[] "gray dragon"); the
                              * S_DRAGON adult-HP boundary in polymon (>= this idx) */
const M2_NOPOLY = 0x00000001;
const M2_MALE = 0x00010000;              /* monflag.h M2_MALE */
const M2_FEMALE = 0x00020000;            /* monflag.h M2_FEMALE */
const M2_NEUTER = 0x00040000;            /* monflag.h M2_NEUTER */
const M2_STRONG = 0x04000000;
const M2_GIANT = 0x00002000;
const M2_UNDEAD = 0x00000002;            /* monflag.h:124 M2_UNDEAD (mflags2!) */
const STR18_100 = 118;                   /* attrib.h STR18(100) = 18 + 100 */
const STR19_19 = 119;                    /* attrib.h STR19(19) = 100 + 19 */
// initrace index → M2_* selfmask (human/elf/dwarf/gnome/orc).
const RACE_SELFMASK = [0x00000008, 0x00000010, 0x00000020, 0x00000040, 0x00000080];
// race attrmax[A_STR] (matches js/attrib.js RACE_ATTRMAX[*][0]), same
// human/elf/dwarf/gnome/orc order as RACE_SELFMASK.
const RACE_ATTRMAX_STR = [118, 18, 118, 68, 68];
// C role.c races[].mnum, same human/elf/dwarf/gnome/orc order as the two
// tables above — used by uasmon_maxStr's character_race() lookup, which is
// keyed on the FORM being polymorphed into, not on the hero's own race.
const RACE_MNUM = [PM_HUMAN, 264 /* PM_ELF */, 44 /* PM_DWARF */, 165 /* PM_GNOME */, 72 /* PM_ORC */];
const PM_URUK_HAI = 75, PM_ORC_CAPTAIN = 77;
// C mondata.h is_elf/is_dwarf/is_gnome/is_orc — mflags2 bits, independent of
// the hero's own race (unlike your_race/selfmask() above).
function is_elf(ptr) { return (ptr.mflags2 & RACE_SELFMASK[1]) !== 0; }
function is_dwarf(ptr) { return (ptr.mflags2 & RACE_SELFMASK[2]) !== 0; }
function is_gnome(ptr) { return (ptr.mflags2 & RACE_SELFMASK[3]) !== 0; }
function is_orc(ptr) { return (ptr.mflags2 & RACE_SELFMASK[4]) !== 0; }
// C role.c:2163 character_race(pmindex) — races[] entry whose mnum matches
// pmindex, regardless of the hero's own selected race; NULL (here: -1) if
// pmindex isn't a player race at all. Returns the attrmax[A_STR] directly
// (the only field uasmon_maxStr needs) rather than the whole struct.
function character_race_attrmax_str(pmindex) {
    const idx = RACE_MNUM.indexOf(pmindex);
    return idx >= 0 ? RACE_ATTRMAX_STR[idx] : null;
}

// ── mondata.h predicate macros over a permonst template (pmidx-keyed) ─────────
function polyok(ptr) { return (ptr.mflags2 & M2_NOPOLY) === 0; }
function is_male(ptr) { return (ptr.mflags2 & M2_MALE) !== 0; }
function is_female(ptr) { return (ptr.mflags2 & M2_FEMALE) !== 0; }
function is_neuter(ptr) { return (ptr.mflags2 & M2_NEUTER) !== 0; }
function strongmonst(ptr) { return (ptr.mflags2 & M2_STRONG) !== 0; }
function is_giant(ptr) { return (ptr.mflags2 & M2_GIANT) !== 0; }
/* C mondata.h:95 is_undead(ptr) — mflags2 & M2_UNDEAD, NOT mflags1. */
function is_undead(ptr) { return (ptr.mflags2 & M2_UNDEAD) !== 0; }
function is_golem(ptr) { return ptr.mlet === S_GOLEM; }
// makemon.c is_home_elemental: an elemental whose form matches the dungeon's home
// home check reduces to FALSE off the home plane.  We mirror that conservative
// FALSE (the rn() arithmetic below would be wrong only on the elemental planes,
function is_home_elemental(pmidx) {
    return is_home_elemental_real({ pmidx: pmidx | 0 });
}

// C mondata.h is_placeholder — PM_ORC/PM_GIANT/PM_HUMAN/PM_ELF placeholders.
const PLACEHOLDER = new Set([72, 169, 260, 264]);
function is_placeholder(pmidx) { return PLACEHOLDER.has(pmidx); }

function selfmask() {
    const ir = (game.flags?.initrace ?? 0) | 0;
    return RACE_SELFMASK[ir] ?? RACE_SELFMASK[0];
}
function your_race(ptr) { return (ptr.mflags2 & selfmask()) !== 0; }

// C do_name.c an(s) — "a"/"an" article.  Minimal port (vowel start).
function an(s) {
    if (!s) return s;
    const c = s[0].toLowerCase();
    const vowel = (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u');
    return (vowel ? 'an ' : 'a ') + s;
}

// C polyself.c:1077 uasmon_maxStr() — the max-Str for the new form.
// R = character_race(form): NULL for ordinary (non-player-race) monsters, in
// which case strongmonst→ (live giant ? STR19(19) : STR18(100)), else 18.
export function uasmon_maxStr(pmidx, ptr) {
    // is_orc/elf/dwarf/gnome remap mndx, then R = character_race(mndx).
    // This is keyed on the FORM (mndx), never on the hero's own race — a
    // non-orc hero polymorphed into an orc mummy still gets the orc cap.
    let mndx = pmidx;
    if (is_orc(ptr)) {
        if (mndx !== PM_URUK_HAI && mndx !== PM_ORC_CAPTAIN) mndx = 72 /* PM_ORC */;
    } else if (is_elf(ptr)) {
        mndx = 264 /* PM_ELF */;
    } else if (is_dwarf(ptr)) {
        mndx = 44 /* PM_DWARF */;
    } else if (is_gnome(ptr)) {
        mndx = 165 /* PM_GNOME */;
    }
    const R_str = character_race_attrmax_str(mndx); // null for non-player-race forms
    if (strongmonst(ptr)) {
        const live_H = is_giant(ptr) && !is_undead(ptr);
        if (R_str !== null) return R_str;
        return live_H ? STR19_19 : STR18_100;
    }
    return R_str !== null ? R_str : 18;
}

// ── C mondata.h bit flags used only by set_uasmon (inlined macros, not
const MR_FIRE = 0x01, MR_COLD = 0x02, MR_SLEEP = 0x04, MR_DISINT = 0x08;
const MR_ELEC = 0x10, MR_POISON = 0x20, MR_ACID = 0x40, MR_STONE = 0x80;
const M1_FLY = 0x00000001, M1_SWIM = 0x00000002, M1_WALLWALK = 0x00000008;
const M1_NOEYES = 0x00001000, M1_REGEN = 0x00800000, M1_SEE_INVIS = 0x01000000;
const M1_TPORT = 0x02000000, M1_TPORT_CNTRL = 0x04000000;
const M2_WERE_BIT = 0x00000004, M2_DEMON_BIT = 0x00000100;  /* M2_UNDEAD is declared once, above */
const M3_INFRAVISION = 0x0100;
const AT_EXPL = 13, AT_GAZE = 15;
const AD_MAGM = 1, AD_RBRE = 242, AD_HALU = 36, AD_BLND = 11;
const AD_DRLI = 15;
const S_EYE = 5, S_LIGHT = 25, S_FUNGUS_LET = 32, S_VAMPIRE_LET = 48;
const PM_VAMPIRE_LEADER = 227;
/* PM_AMOROUS_DEMON is an alias for the incubus/succubus monster row in the
 * generated table (pm.h:290); it is not emitted as a named pm.generated.js
 * export, but change_sex() has a special C-only branch for this form. */
const PM_AMOROUS_DEMON = 290;
const NO_LONGER_PETRIFY_RESISTANT = 'No longer petrify-resistant, you';

// C polyself.c:2224 polysense() — sets context.warntype/HWarn_of_mon based on
// but it is unconditionally reached (unlike the file's other faithful-stub
// here rather than stubbed (it is short, self-contained, and has no further
// unported dependencies — same treatment set_mon_data's effect got below).
function polysense(mndx) {
    const g = game;
    g.context = g.context || {};
    const warntype = g.context.warntype = g.context.warntype || {};
    let warnidx = NON_PM;
    warntype.speciesidx = NON_PM;
    warntype.species = null;
    warntype.polyd = 0;
    const u = g.u;
    if (!u.uprops[32 /* WARN_OF_MON */]) u.uprops[32] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    u.uprops[32].intrinsic = (u.uprops[32].intrinsic | 0) & ~0x02000000; /* ~FROMRACE */
    if (mndx === PM_PURPLE_WORM || mndx === PM_BABY_PURPLE_WORM) {
        warnidx = PM_SHRIEKER;
    } else if (mndx === PM_VAMPIRE || mndx === PM_VAMPIRE_LEADER) {
        warntype.polyd = 0x00000008 /* M2_HUMAN */ | 0x00000010 /* M2_ELF */;
        u.uprops[32].intrinsic = (u.uprops[32].intrinsic | 0) | 0x02000000; /* FROMRACE */
        return;
    }
    if (warnidx >= LOW_PM) {
        warntype.speciesidx = warnidx;
        warntype.species = permonstTemplate(warnidx);
        u.uprops[32].intrinsic = (u.uprops[32].intrinsic | 0) | 0x02000000; /* FROMRACE */
    }
}

// ── C polyself.c:38 set_uasmon() — set youmonst.data to the new form. ─────────
// RNG-free (float_vs_flight/polysense draw none on this path).
export function set_uasmon() {
    const g = game;
    const u = g.u;
    const mndx = u.umonnum | 0;
    const mdat = permonstTemplate(mndx);
    const was_vampshifter = valid_vampshiftform((g.youmonst?.cham | 0), mndx);

    // C mondata.c:13 set_mon_data(&gy.youmonst, mdat).  This used to be a bare
    // `youmonst.data = mdat` under "movement (re)proration is the umovement
    // the hero's banked movement when the new form is SLOWER:
    //     short *movement_p = (mon == &gy.youmonst) ? &u.umovement : &mon->movement;
    //     if (*movement_p && ptr->mmove < old_speed) {
    //         *movement_p *= ptr->mmove; *movement_p /= old_speed;
    //     }
    // so that a shape change cannot carry the old form's leftover moves.
    //
    // step 109 and C prorates u.umovement 12 -> 9 there.  Without the proration
    // this port entered the #invoke at step 148 with umovement 18 where C had
    // 12, so C's `do { ... } while (u.umovement < NORMAL_SPEED)` ran TWO world
    // turns for that one command and this port ran ONE — the missing turn is
    // put every later keystroke one position early.
    //
    // js/makemon.js already exports the faithful set_mon_data (it keys the hero
    // off `mtmp === game.youmonst` and writes game.u.umovement), so this calls
    // it rather than re-deriving the proration.  RNG-free.
    if (!g.youmonst) g.youmonst = {};
    set_mon_data(g.youmonst, mdat);
    g.youmonst.data_mndx = mndx;
    g.youmonst.m_id = 1;

    if (!u.uprops) u.uprops = {};
    const protShapeChangers = !!(u.uprops[PROT_FROM_SHAPE_CHANGERS]?.intrinsic
                                  || u.uprops[PROT_FROM_SHAPE_CHANGERS]?.extrinsic);
    if (protShapeChangers) {
        g.youmonst.cham = NON_PM;
    } else if ((mdat.mlet | 0) === S_VAMPIRE_LET) {
        g.youmonst.cham = g.youmonst.mnum;
    } else if (!was_vampshifter) {
        g.youmonst.cham = NON_PM;
    }
    u.mcham = g.youmonst.cham;

    const PROPSET = (idx, on) => {
        if (!u.uprops[idx]) u.uprops[idx] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
        if (on)
            u.uprops[idx].intrinsic = (u.uprops[idx].intrinsic | 0) | FROMFORM;
        else
            u.uprops[idx].intrinsic = (u.uprops[idx].intrinsic | 0) & ~FROMFORM;
    };
    const resistFromForm = (mrtyp) => ((mdat.mresists | 0) & mrtyp) !== 0;

    PROPSET(FIRE_RES, resistFromForm(MR_FIRE));
    PROPSET(COLD_RES, resistFromForm(MR_COLD));
    PROPSET(SLEEP_RES, resistFromForm(MR_SLEEP));
    PROPSET(DISINT_RES, resistFromForm(MR_DISINT));
    PROPSET(SHOCK_RES, resistFromForm(MR_ELEC));
    PROPSET(POISON_RES, resistFromForm(MR_POISON));
    PROPSET(ACID_RES, resistFromForm(MR_ACID));
    PROPSET(STONE_RES, resistFromForm(MR_STONE));

    // C polyself.c:98-104 resists_drli(&gy.youmonst) with uwep suppressed.
    // Full C body: monster-only checks (inlined below) OR the equipment tail
    // defended(mon, AD_DRLI).  polyself.c temporarily suppresses uwep before
    // this call: a wielded artifact must not grant drain resistance merely
    // because the hero is changing form.  The shared defended() body already
    // implements adult-dragon scales and worn dragon armor, so preserve that
    // exact call while temporarily clearing the weapon slot.
    const defendedWithoutWeapon = (() => {
        const oldWeapon = u.uwep;
        u.uwep = null;
        try {
            return defended(g.youmonst, AD_DRLI);
        } finally {
            u.uwep = oldWeapon;
        }
    })();
    const isUndead = ((mdat.mflags2 | 0) & M2_UNDEAD) !== 0;
    const isDemon = ((mdat.mflags2 | 0) & M2_DEMON_BIT) !== 0;
    const isWere = ((mdat.mflags2 | 0) & M2_WERE_BIT) !== 0;
    const isVampshifter = (g.youmonst.cham === PM_VAMPIRE || g.youmonst.cham === PM_VAMPIRE_LEADER
                            || g.youmonst.cham === PM_VLAD_THE_IMPALER);
    const drainRes = isUndead || isDemon || isWere
        || ((u.ulycn ?? NON_PM) | 0) >= LOW_PM
        || mdat.pmidx === PM_DEATH || isVampshifter
        || defendedWithoutWeapon;
    PROPSET(DRAIN_RES, drainRes);

    PROPSET(ANTIMAGIC, (dmgtype(mdat, AD_MAGM) || mdat.pmidx === PM_BABY_GRAY_DRAGON
                        || dmgtype(mdat, AD_RBRE)));
    PROPSET(SICK_RES, ((mdat.mlet | 0) === S_FUNGUS_LET || mdat.pmidx === PM_GHOUL));

    PROPSET(STUNNED, (mdat.pmidx === PM_STALKER
                       || mdat.pmidx === PM_BAT || mdat.pmidx === PM_GIANT_BAT
                       || mdat.pmidx === PM_VAMPIRE_BAT));
    PROPSET(HALLUC_RES, dmgtype(mdat, AD_HALU));
    PROPSET(SEE_INVIS, ((mdat.mflags1 | 0) & M1_SEE_INVIS) !== 0);
    PROPSET(TELEPAT, (mdat.pmidx === PM_FLOATING_EYE || mdat.pmidx === PM_MIND_FLAYER
                       || mdat.pmidx === PM_MASTER_MIND_FLAYER));
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const infrForm = Upolyd ? mdat : permonstTemplate((g.urace?.mnum ?? 0) | 0);
    PROPSET(INFRAVISION, ((infrForm?.mflags3 | 0) & M3_INFRAVISION) !== 0);
    PROPSET(INVIS, (mdat.pmidx === PM_STALKER || mdat.pmidx === PM_BLACK_LIGHT));
    PROPSET(TELEPORT, ((mdat.mflags1 | 0) & M1_TPORT) !== 0);
    PROPSET(TELEPORT_CONTROL, ((mdat.mflags1 | 0) & M1_TPORT_CNTRL) !== 0);
    const isFloater = ((mdat.mlet | 0) === S_EYE || (mdat.mlet | 0) === S_LIGHT);
    PROPSET(LEVITATION, isFloater);
    const isFlyer = ((mdat.mflags1 | 0) & M1_FLY) !== 0;
    PROPSET(FLYING, (isFlyer && !isFloater));
    PROPSET(SWIMMING, ((mdat.mflags1 | 0) & M1_SWIM) !== 0);
    PROPSET(PASSES_WALLS, ((mdat.mflags1 | 0) & M1_WALLWALK) !== 0);
    PROPSET(REGENERATION, ((mdat.mflags1 | 0) & M1_REGEN) !== 0);
    PROPSET(REFLECTING, mdat.pmidx === PM_SILVER_DRAGON);
    PROPSET(BLINDED, ((mdat.mflags1 | 0) & M1_NOEYES) !== 0);
    PROPSET(BLND_RES, (!!dmgtype_fromattack(mdat, AD_BLND, AT_EXPL)
                        || !!dmgtype_fromattack(mdat, AD_BLND, AT_GAZE)));

    if (!g.program_state?.restoring)
        float_vs_flight();
    polysense(mndx);

    // STATUS_HILITES/VIA_WINDOWPORT status_initialize(REASSESS_ONLY): no JS
    // status-hilite subsystem exists to reassess; omitted (no observable
    // effect on any tracked state).

    g.gw = g.gw || {};
    g.gw.were_changes = 0;
}

// ── C polyself.c:735 polymon(mntmp) — make a mntmp monster of the player. ──────
// Returns 1 on success, 0 if the form is genocided.
const _sticks_poly = (ptr) => !!attacktype_fordmg(ptr, 7 /* AT_HUGS */, AD_ANY)
    || !!attacktype_fordmg(ptr, 0 /* any attack */, 19 /* AD_STCK */)
    || (!!attacktype_fordmg(ptr, 0 /* any attack */, 28 /* AD_WRAP */)
        && !attacktype_fordmg(ptr, 11 /* AT_ENGL */, AD_ANY));
function mon_nam_poly(mon) {
    const idx = (mon?.mndx ?? mon?.mnum ?? -1) | 0;
    return MONS_NAMES[idx] || 'the creature';
}
function _can_ride_poly(ptr, steed) {
    return !!steed?.mtame && ((ptr.mflags1 | 0) & M1_HUMANOID) !== 0
        && (ptr.msize | 0) >= MZ_SMALL && (ptr.msize | 0) < 3;
}

export async function polymon(mntmp) {
    const g = game;
    const u = g.u;
    const ptr = permonstTemplate(mntmp);

    // C: if (svm.mvitals[mntmp].mvflags & G_GENOD) { You_feel rather %s-ish; exercise(A_WIS,TRUE); return 0; }
    const mv = (g.mvitals && g.mvitals[mntmp]) ? (g.mvitals[mntmp].mvflags | 0) : 0;
    if (mv & 0x02 /* G_GENOD */) {
        await pline(`You feel rather ${monPmname(mntmp, g.flags?.female ? FEMALE : MALE)}-ish.`);
        exercise(A_WIS, true);
        return 0;
    }

    // C: conduct.polyselfs++ (livelog only — no RNG).
    if (u.uconduct) u.uconduct.polyselfs = (u.uconduct.polyselfs | 0) + 1;

    // C polyself.c:750-751 — exercise(A_CON,FALSE); exercise(A_WIS,TRUE).
    // Hero is NOT yet Upolyd here (u.mtimedone set later), so exercise(A_CON)
    // fires its rn2(2) and exercise(A_WIS) its rn2(19).
    exercise(A_CON, false);
    exercise(A_WIS, true);

    /* C you.h:554 (u.umonnum != u.umonster), not the u.mtimedone timer. */
    const wasUpolyd = (u.umonnum | 0) !== (u.umonster | 0);
    if (!wasUpolyd) {
        // Human to monster: save human stats (macurr/mamax/mfemale).
        u.macurr = u.acurr ? { a: (u.acurr.a || []).slice() } : { a: [0, 0, 0, 0, 0, 0] };
        u.mamax = u.amax ? { a: (u.amax.a || []).slice() } : { a: [0, 0, 0, 0, 0, 0] };
        u.mfemale = !!(g.flags?.female);
    } else {
        // Monster to monster: restore human stats.
        if (u.macurr) u.acurr = { a: u.macurr.a.slice() };
        if (u.mamax) u.amax = { a: u.mamax.a.slice() };
        if (g.flags) g.flags.female = !!u.mfemale;
    }

    /* C polyself.c:777-783 — if stuck mimicking gold, stop immediately; if
     * becoming a non-mimic, stop mimicking anything (as in polyman()). */
    if ((g.multi | 0) < 0 && (g.youmonst?.m_ap_type | 0) === M_AP_OBJECT_local
        && g.youmonst.data?.mlet !== S_MIMIC)
        await unmul("");
    if (ptr.mlet !== S_MIMIC) {
        g.youmonst.m_ap_type = M_AP_NOTHING_local;
        g.youmonst.mappearance = 0;
    }

    // C polyself.c:785-792 — gender dochange.  For a form that is neither
    // is_male/is_female/is_neuter and != u.ulycn, sex_change_ok && !rn2(10).
    // The form-genders flags (M2_MALE/M2_FEMALE/M2_NEUTER) aren't in the template;
    // warhorse is none of them, so the rn2(10) fires (matches leaf 5406).
    let dochange = false;
    // C mondata.h is_male/is_female/is_neuter(ptr) — from the form's mflags2.
    // (warhorse and red dragon both set none of these, so rn2(10) fires for both.)
    const isMale = (ptr.mflags2 & M2_MALE) !== 0;
    const isFemale = (ptr.mflags2 & M2_FEMALE) !== 0;
    const isNeuter = (ptr.mflags2 & M2_NEUTER) !== 0;
    const ulycn = (u.ulycn ?? -1) | 0;
    if (isMale) {
        if (g.flags?.female) dochange = true;
    } else if (isFemale) {
        if (!g.flags?.female) dochange = true;
    } else if (!isNeuter && mntmp !== ulycn) {
        if ((g.sex_change_ok | 0) && !rn2(10)) dochange = true;
    }

    if (dochange && g.flags) g.flags.female = !g.flags.female;

    // C polyself.c:793-798 — buf "new "/"" then, if dochange, a "female "/"male "
    // prefix (only for forms whose gender isn't fixed by is_male/is_female), then
    // pmname; You("turn into/feel like %s!").
    const verb = (u.umonnum !== mntmp) ? 'turn into' : 'feel like';
    let buf = (u.umonnum !== mntmp) ? '' : 'new ';
    if (dochange) {
        buf += (isMale || isFemale) ? '' : (g.flags?.female ? 'female ' : 'male ');
    }
    buf += monPmname(mntmp, g.flags?.female ? FEMALE : MALE);
    await pline(`You ${verb} ${an(buf)}!`);

    // C polyself.c:813 — u.mtimedone = rn1(500, 500).
    // Latch Blind before set_uasmon() changes the form's BLINDED intrinsic;
    // this is needed when an eyeless form reverts to one with eyes.
    const was_blind = !!Blind_vis();
    /* C polyself.c:796 — name saved before the change in case sight changes. */
    const ustuckNam = u.ustuck ? Some_Monnam(u.ustuck) : '';
    u.mtimedone = rn1(500, 500);
    u.umonnum = mntmp;
    set_uasmon();

    // C polyself.c:818-833 — newMaxStr; strongmonst sets ABASE=AMAX, else cap.
    const newMaxStr = uasmon_maxStr(mntmp, ptr);
    const abase = getAbase(u);
    const amax = getAmax(u);
    const dStr = C_ATTR_TO_DISP[A_STR];
    if (strongmonst(ptr)) {
        abase[dStr] = amax[dStr] = newMaxStr | 0;
    } else {
        amax[dStr] = newMaxStr | 0;
        if (abase[dStr] > amax[dStr]) abase[dStr] = amax[dStr];
    }

    // C polyself.c:855-870 — new-form max HP.
    const mlvl = ptr.mlevel | 0;
    let mhmax;
    if (ptr.mlet === S_DRAGON && mntmp >= PM_GRAY_DRAGON) {
        mhmax = 4 * mlvl + d(mlvl, 4);
    } else if (is_golem(ptr)) {
        mhmax = golemhp(mntmp);
    } else {
        if (!mlvl) mhmax = rnd(4);
        else mhmax = d(mlvl, 8);
        if (is_home_elemental(mntmp)) mhmax *= 3;
    }
    u.mhmax = mhmax;
    u.mh = u.mhmax;

    // C polyself.c:876-884 — low-level cap on poly timeout.
    if ((u.ulevel | 0) < mlvl) {
        u.mtimedone = Math.trunc(u.mtimedone * (u.ulevel | 0) / mlvl);
    }

    // C polyself.c:886-888 — restore embedded dragon scales when the new form
    // is not the dragon which owns the skin.  Armor types 101..120 are dragon
    // mail/scales; armor_to_dragon() maps both bands to the same dragon rows.
    if (u.uskin) {
        const skinOtyp = u.uskin.otyp | 0;
        const skinDragon = (skinOtyp >= 111 && skinOtyp <= 120)
            ? PM_GRAY_DRAGON + skinOtyp - 111
            : (skinOtyp >= 101 && skinOtyp <= 110)
                ? PM_GRAY_DRAGON + skinOtyp - 101 : NON_PM;
        if (skinDragon !== (mntmp | 0))
            await skinback_poly(false);
    }
    await break_armor();
    await drop_weapon(1);
    find_ac();
    // is never hiding under an object when polymorphing.

    // C polyself.c:896-898 — pit-trap escape timer reset (draws rn1(6,2)).
    if (u.utrap && (u.utraptype | 0) === TT_PIT) {
        // A new body gets a fresh escape timer; set_utrap also updates the
        // status line bookkeeping used by the normal trap path.
        set_utrap(rn1(6, 2), TT_PIT);
    }
    // C polyself.c:899-902 — was_blind && !Blind: set_itimeout(&HBlinded,1) +
    // make_blinded(0,TRUE).  Clear the one-turn transition blindness while
    // retaining the canonical message and vision bookkeeping.
    if (was_blind && !Blind_vis()) {
        set_HBlinded(1);
        make_blinded(0, true);
    }

    // C polyself.c:903 newsym(u.ux, u.uy) — change symbol.
    newsym(u.ux, u.uy);

    // C polyself.c:907-912 lays_eggs -> learn_egg_type: display-only egg
    // knowledge, RNG-free and not tracked in JS.

    /* C polyself.c:914-953 — changing shape can invalidate an engulfment or
     * hold.  Keep this synchronous state transition inside polymon: expels()
     * itself has no asynchronous game logic before its spoteffects tail, and
     * leaving the old throw here made a valid polymorph halt the replay. */
    if (u.uswallow && u.ustuck) {
        const swallower = u.ustuck;
        const oldData = swallower.data;
        const newUnsolid = (ptr.mflags1 & 0x00100000) !== 0; /* M1_UNSOLID */
        const newTooLarge = (ptr.msize | 0) >= MZ_HUGE;
        const oldCanContain = ((oldData.msize | 0) >= (ptr.msize | 0))
            || _is_whirly(oldData);
        if (newUnsolid || newTooLarge || !oldCanContain) {
            /* C polyself.c:921-933 — the special line precedes expels(), which
             * runs unstuck() (rnd(2) mspec_used, docrt), mnexto and spoteffects. */
            if (newUnsolid)
                await pline(`${canspotmon(swallower) ? Monnam(swallower) : Some_Monnam(swallower)} can no longer contain you.`);
            await expels_gu(swallower, swallower.data?.pmidx, !newUnsolid);
        }
    } else if (u.ustuck && !u.uswallow) {
        /* C releases a holder when the new body can itself stick or is
         * unsolid, preventing an automatic re-grab on the next monster turn. */
        if (_sticks_poly(ptr) || ((ptr.mflags1 & 0x00100000) !== 0)) {
            const holder = u.ustuck;
            /* C polyself.c:923-929 */
            const nam = canspotmon(holder) ? Monnam(holder) : ustuckNam;
            set_ustuck(null);
            await pline(`${nam} loses its grip on you.`);
        }
    }

    /* C polyself.c:955-965 — if (!can_ride(u.usteed)) dismount_steed(DISMOUNT_POLY);
     * the steed.c body prints the message, releases the steed and places it. */
    if (u.usteed && !_can_ride_poly(ptr, u.usteed))
        await dismount_steed_real(DISMOUNT_POLY);

    // C polyself.c:967 find_ac() (repeated).
    find_ac();
    const newUnsolid = (ptr.mflags1 & 0x00100000) !== 0; /* M1_UNSOLID */
    const newWhirly = _is_whirly(ptr);
    const newAmorphous = (ptr.mflags1 & 0x00000004) !== 0; /* M1_AMORPHOUS */
    const canSlip = newAmorphous || newWhirly || newUnsolid;
    const passesWalls = !!(u.uprops?.[PASSES_WALLS]
        && ((u.uprops[PASSES_WALLS].intrinsic | 0)
            || (u.uprops[PASSES_WALLS].extrinsic | 0))
        && !(u.uprops[PASSES_WALLS].blocked | 0));
    if (u.utrap && (u.utraptype | 0) === TT_INFLOOR && passesWalls) {
        await pline('The rock seems to no longer trap you.');
        await reset_utrap(true);
    } else if (u.utrap && (u.utraptype | 0) === TT_BURIEDBALL && passesWalls) {
        await pline('The buried ball is no longer bound to you.');
        await buried_ball_to_freedom();
        await reset_utrap(true);
    } else if (u.utrap && (u.utraptype | 0) === TT_LAVA
               && (mntmp === PM_FIRE_ELEMENTAL || mntmp === PM_SALAMANDER)) {
        await pline('The lava now feels soothing.');
        await reset_utrap(true);
    }
    if (canSlip && u.utrap && (u.utraptype | 0) === TT_BURIEDBALL) {
        await pline('You slip free of the buried ball and chain.');
        await buried_ball_to_freedom();
    }
    if (canSlip && u.uball) {
        await pline('You slip out of the iron chain.');
        await unpunish();
    }
    if (u.utrap && ((u.utraptype | 0) === TT_WEB
                    || (u.utraptype | 0) === TT_BEARTRAP)
        && (canSlip || ((ptr.msize | 0) <= MZ_SMALL
                        && (u.utraptype | 0) === TT_BEARTRAP))) {
        await pline(`You are no longer stuck in the ${
            (u.utraptype | 0) === TT_WEB ? 'web' : 'bear trap'}.`);
        await reset_utrap(true);
    }
    if (_webmaker(ptr) && u.utrap && (u.utraptype | 0) === TT_WEB) {
        await pline('You orient yourself on the web.');
        await reset_utrap(true);
    }
    // C polyself.c:1014 check_strangling(TRUE).
    check_strangling_poly(true);

    // C polyself.c:1016 SET_BOTL().
    if (g.disp) g.disp.botl = 1;
    g.vision_full_recalc = 1;
    // C polyself.c:1018-1019 see_monsters / encumber_msg.
    see_monsters();
    await encumber_msg();

    // C polyself.c:1021-1027 retouch_equipment(2) + selftouch().  The
    // equipment retouch is not yet a standalone JS body, but selftouch is
    // fully implemented in trap.js and must run after the form/status update:
    // losing stone resistance while wielding a cockatrice corpse can petrify
    // the hero (or life-saving can unwield it).
    if (!u.uarmg)
        await selftouch(NO_LONGER_PETRIFY_RESISTANT);

    // C polyself.c:1031-1074 — the flags.verbose "#monster" explanation block.
    if (g.flags?.verbose !== false) {
        const use_thec = (what) => `Use the command #monster to ${what}.`;
        const uptr = g.youmonst.data;
        // C mondata.h might_hide = is_hider(uptr) || hides_under(uptr).
        const might_hide = _is_hider(uptr) || _hides_under(uptr);

        if (_attacktype(uptr, AT_BREA))                 /* can_breathe */
            await pline(use_thec('use your breath weapon'));
        if (_attacktype(uptr, AT_SPIT))
            await pline(use_thec('spit venom'));
        if ((uptr.mlet | 0) === S_NYMPH)
            await pline(use_thec('remove an iron ball'));
        if (_attacktype(uptr, AT_GAZE))
            await pline(use_thec('gaze at monsters'));
        if (might_hide && _webmaker(uptr))
            await pline(use_thec('hide or to spin a web'));
        else if (might_hide)
            await pline(use_thec('hide'));
        else if (_webmaker(uptr))
            await pline(use_thec('spin a web'));
        if (((uptr.mflags2 | 0) & M2_WERE_BIT) !== 0)   /* is_were */
            await pline(use_thec('summon help'));
        if ((u.umonnum | 0) === PM_GREMLIN)
            await pline(use_thec('multiply in a fountain'));
        if (_is_unicorn(uptr))
            await pline(use_thec('use your horn'));
        if (_is_mind_flayer(uptr))
            await pline(use_thec('emit a mental blast'));
        if ((uptr.msound | 0) === MS_SHRIEK)
            await pline(use_thec('shriek'));
        // C polyself.c:1061-1062 — is_vampire || is_vampshifter(&youmonst).
        if (_is_vampire(uptr)
            || valid_vampshiftform((g.youmonst.cham | 0), (u.umonnum | 0)))
            await pline(use_thec('change shape'));
        // C polyself.c:1064-1068 — the "#sit to lay an egg" line uses "sit",
        // not "monster", as its command name.
        if (_lays_eggs(uptr) && g.flags?.female
            && !((uptr.pmidx | 0) === PM_GIANT_EEL
                 || (uptr.pmidx | 0) === PM_ELECTRIC_EEL))
            await pline(`Use the command #sit to ${_eggs_in_water(uptr)
                ? 'spawn in the water' : 'lay an egg'}.`);
    }

    return 1;
}

// ── C polyself.c:1122 dropp(obj) — dropx() jacket for break_armor(). ──────────
// Scans inventory for obj rather than trusting obj->where, because dropping
// worn armor while polymorphing can put the hero into water where
// emergency_disrobe() removes it from inventory first.  RNG-free.
async function dropp(obj) {
    const g = game;
    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        if (otmp === obj || (obj && otmp.o_id === obj.o_id)) {
            await dropx(obj);
            await encumber_msg();
            break;
        }
    }
}

// ── C polyself.c:1156 break_armor() — shed armor the new form can't wear. ─────
// RNG-free in C (no rn2/rnd/d call site in the whole function body); the
// exercise(A_STR, FALSE) in the breakarm/uarm branch is the only RNG-adjacent
// call and exercise() itself draws.
async function break_armor() {
    const g = game;
    const u = g.u;
    const uptr = g.youmonst.data;

    if (breakarm(uptr)) {
        let otmp = u.uarm;
        if (otmp) {
            if (donning(otmp)) cancel_don();
            if (otmp.lamplit)
                end_burn(otmp, false);
            await pline('You break out of your armor!');
            exercise(A_STR, false);
            await Armor_gone();
            await useup(otmp);
        }
        otmp = u.uarmc;
        /* mummy wrapping adapts to small and very big sizes */
        if (otmp && ((otmp.otyp | 0) !== MUMMY_WRAPPING || !WrappingAllowed(uptr))) {
            /* C polyself.c:1178-1183 hands u.uarmc — one object — to both the
             * message and dropp().  Resolve the gi.invent half BEFORE
             * takeoff_slot_noac clears the mask; see do_wear.js worn_invent_obj. */
            const cloak = worn_invent_obj('uarmc');
            await pline(`The clasp on your ${cloak_simple_name(otmp)} breaks open!`);
            await Cloak_off();   /* C polyself.c:1186,1210 Cloak_off() — runs the otyp switch (toggle_displacement etc.) */
            await dropp(cloak);
        }
        if (u.uarmu) {
            await pline('Your shirt rips to shreds!');
            await useup(u.uarmu);
        }
    } else if (sliparm(uptr)) {
        let otmp = u.uarm;
        if (otmp) {
            if (donning(otmp)) cancel_don();
            await pline('Your armor falls around you!');
            await Armor_gone();
            await dropp(otmp);
        }
        otmp = u.uarmc;
        if (otmp && ((otmp.otyp | 0) !== MUMMY_WRAPPING || !WrappingAllowed(uptr))) {
            if (_is_whirly(uptr))
                await pline(`Your ${cloak_simple_name(otmp)} falls, unsupported!`);
            else
                await pline(`You shrink out of your ${cloak_simple_name(otmp)}!`);
            await Cloak_off();   /* C polyself.c:1186,1210 Cloak_off() — runs the otyp switch (toggle_displacement etc.) */
            await dropp(otmp);
        }
        otmp = u.uarmu;
        if (otmp) {
            if (_is_whirly(uptr))
                await pline('You seep right through your shirt!');
            else
                await pline('You become much too small for your shirt!');
            await setworn(null, (otmp.owornmask | 0) & W_ARMU);
            await dropp(otmp);
        }
    }
    if (_has_horns(uptr)) {
        const otmp = u.uarmh;
        if (otmp) {
            /* C polyself.c:1220-1237.  The comment that used to stand here said
             * "yname is a throwing stub, surface has no JS port" — both were
             * false: cmd.js re-exports do_wear.js's real yname (cmd.js:25041)
             * and carries a full dungeon.c:1750 surface().  Ported against C. */
            if (is_flimsy(otmp) && !donning(otmp)) {
                /* Future possibilities: This could damage/destroy helmet */
                const hornbuf = `horn${plur(num_horns(uptr))}`;
                await pline(`Your ${hornbuf} ${vtense(hornbuf, 'pierce')} through ${yname(otmp)}.`);
            } else {
                if (donning(otmp)) cancel_don();
                await pline(`Your ${helm_simple_name(otmp)} falls to the ${surface(u.ux, u.uy)}!`);
                await Helmet_off();   /* C polyself.c:1237,1269: Helmet_off() (fedora change_luck(-1), do_wear.c:523) */
                await dropp(otmp);
            }
        }
    }
    if (_nohands(uptr) || _verysmall(uptr)) {
        let otmp = u.uarmg;
        if (otmp) {
            if (donning(otmp)) cancel_don();
            /* Drop weapon along with gloves */
            await pline(`You drop your gloves${u.uwep ? ' and weapon' : ''}!`);
            await drop_weapon(0);
            await Gloves_off(); /* C polyself.c:1255; its encumber_msg (do_wear.c:675) fires while the gloves are still in invent */
            await dropp(otmp);
        }
        otmp = u.uarms;
        if (otmp) {
            await pline('You can no longer hold your shield!');
            await takeoff_slot_noac('uarms'); /* C: Shield_off() — no find_ac */
            await dropp(otmp);
        }
        otmp = u.uarmh;
        if (otmp) {
            /* C polyself.c:1256-1261 */
            if (donning(otmp)) cancel_don();
            await pline(`Your ${helm_simple_name(otmp)} falls to the ${surface(u.ux, u.uy)}!`);
            await Helmet_off();   /* C polyself.c:1237,1269: Helmet_off() (fedora change_luck(-1), do_wear.c:523) */
            await dropp(otmp);
        }
    }
    if (_nohands(uptr) || _verysmall(uptr) || _slithy(uptr) || (uptr.mlet | 0) === S_CENTAUR) {
        const otmp = u.uarmf;
        if (otmp) {
            if (donning(otmp)) cancel_don();
            if (_is_whirly(uptr))
                await pline('Your boots fall away!');
            else
                await pline(`Your boots ${_verysmall(uptr) ? 'slide' : 'are pushed'} off your feet!`);
            await takeoff_slot_noac('uarmf'); /* C: Boots_off() — no find_ac */
            await dropp(otmp);
        }
    }
    /* eyewear shouldn't stay worn without a head to wear it on */
    if (u.ublindf && !_has_head(uptr)) {
        const eyewearObj = u.ublindf;
        const eyewear = simpleonames(eyewearObj);
        await pline(`Your ${eyewear} fall off!`);
        await takeoff_slot_noac('ublindf');
        await dropp(eyewearObj);
    }
    /* rings stay worn even when no hands */
}

// ── C polyself.c:1293 drop_weapon(alone) — shed the wielded weapon. ───────────
// RNG-free (verified against the C leaf stream: the polyself.c:1321 pline is
// the only observable event before dropx's place_object).
async function drop_weapon(alone) {
    const g = game;
    const u = g.u;
    let updateinv = true;

    if (u.uwep) {
        if (!alone || _cantwield(g.youmonst.data)) {
            const candropwep = canletgo_quiet(u.uwep);
            const candropswapwep = !u.twoweap || canletgo_quiet(u.uswapwep);
            if (alone) {
                const what = (candropwep && candropswapwep) ? 'drop' : 'release';
                let which = is_sword(u.uwep) ? 'sword' : weapon_descr(u.uwep);
                if (u.twoweap) {
                    const whichtoo = is_sword(u.uswapwep) ? 'sword' : weapon_descr(u.uswapwep);
                    if (which !== whichtoo) which = 'weapon';
                }
                if ((u.uwep.quan | 0) !== 1 || u.twoweap)
                    which = makeplural(which);

                /* C: the_your[!!strncmp(which, "corpse", 6)] */
                const the_your = which.slice(0, 6) === 'corpse' ? 'the' : 'your';
                await pline(`You find you must ${what} ${the_your} ${which}!`);
            }
            if (u.twoweap) {
                const otmp2 = u.uswapwep;
                await _uswapwepgone();
                if (otmp2 && otmp2.in_use) updateinv = false;
                else if (candropswapwep && otmp2) { await dropx(otmp2); await encumber_msg(); }
            }
            const otmp = u.uwep;
            await _uwepgone();
            if (otmp.in_use) updateinv = false;
            else if (candropwep) { await dropx(otmp); await encumber_msg(); }

            if (updateinv) update_inventory();
        } else if (!(u.uwep.owornmask & W_WEP)) {
            /* C polyself.c:1348-1352 — setuwep(uwep) to re-establish the
             * W_WEP mask when a form that can still wield keeps the weapon. */
            await setuwep(u.uwep);
        }
    }
}

// ── mondata.h / obj.h predicates used by break_armor + drop_weapon ────────────
// (local consts per this file's convention; values from nethack-c/include).
const M1_CLING = 0x00000010;             /* monflag.h:89 — can cling to ceiling */
const M1_NOHANDS = 0x00002000;
const M1_NOHEAD = 0x00008000;
const M1_HUMANOID = 0x00020000;
const M1_SLITHY = 0x00080000;
const MZ_SMALL = 1;
const MZ_HUGE = 4;
const S_NYMPH = 14;
const S_UNICORN = 21;
const S_VORTEX = 22;
const S_CENTAUR = 29;
const S_GHOST = 54;                  /* defsym.h:358 MONSYM(54, ' ', GHOST, S_GHOST, ...) */
const S_EEL_LET = 57;
/* C nethack-c/include/monflag.h:32 — MS_SHRIEK = 18 (enum ms_sounds).
 * Was 6, which is really MS_SQEEK (monflag.h:17). */
const MS_SHRIEK = 18;
/* monflag.h — these two keep their _bit suffix for historical reasons; the
 * dohide() block further down used to carry wrong-valued M1_HIDE /
 * M1_HUMANOID_local / M1_CONCEAL_local copies of them, which have been deleted
 * so this file holds exactly one copy of each flag. */
const M1_CONCEAL_bit = 0x00000080;   /* monflag.h:92 M1_CONCEAL — hides under objects */
const M1_HIDE_bit = 0x00000100;      /* monflag.h:93 M1_HIDE — mimics / blends with ceiling */
const M1_OVIPAROUS = 0x00400000;
const M2_JEWELS = 0x20000000;
const AD_ANY = -1;
const AT_SPIT = 10;
const AT_BREA = 12;
const MUMMY_WRAPPING = 138;

const _nohands = (ptr) => ((ptr.mflags1 | 0) & M1_NOHANDS) !== 0;
const _verysmall = (ptr) => (ptr.msize | 0) < MZ_SMALL;
const _slithy = (ptr) => ((ptr.mflags1 | 0) & M1_SLITHY) !== 0;
const _has_head = (ptr) => ((ptr.mflags1 | 0) & M1_NOHEAD) === 0;
const _has_horns = (ptr) => num_horns(ptr.pmidx | 0) > 0;
const _humanoid = (ptr) => ((ptr.mflags1 | 0) & M1_HUMANOID) !== 0;
/* C mondata.h:31 noncorporeal(ptr) — mlet == S_GHOST, NOT mflags1 & M1_UNSOLID
 * (that is C's separate unsolid(); mondata.h:63).  Differs on 10/383 rows. */
const _noncorporeal = (ptr) => (ptr.mlet | 0) === S_GHOST;
const _is_whirly = (ptr) => (ptr.mlet | 0) === S_VORTEX || (ptr.pmidx | 0) === PM_AIR_ELEMENTAL;
const _cantwield = (ptr) => _nohands(ptr) || _verysmall(ptr);
/* C obj.h:444 WrappingAllowed(mptr) */
const WrappingAllowed = (ptr) =>
    _humanoid(ptr) && (ptr.msize | 0) >= MZ_SMALL && (ptr.msize | 0) <= MZ_HUGE
    && !_noncorporeal(ptr) && (ptr.mlet | 0) !== S_CENTAUR
    && (ptr.pmidx | 0) !== PM_WINGED_GARGOYLE && (ptr.pmidx | 0) !== PM_MARILITH;
const _attacktype = (ptr, atyp) => !!attacktype_fordmg(ptr, atyp, AD_ANY);
/* mondata.h predicates for the flags.verbose "#monster" explanation block. */
const _is_hider = (ptr) => ((ptr.mflags1 | 0) & M1_HIDE_bit) !== 0;
const _hides_under = (ptr) => ((ptr.mflags1 | 0) & M1_CONCEAL_bit) !== 0;
const _webmaker = (ptr) => (ptr.pmidx | 0) === PM_CAVE_SPIDER || (ptr.pmidx | 0) === PM_GIANT_SPIDER;
const _likes_gems = (ptr) => ((ptr.mflags2 | 0) & M2_JEWELS) !== 0;
const _is_unicorn = (ptr) => (ptr.mlet | 0) === S_UNICORN && _likes_gems(ptr);
const _is_mind_flayer = (ptr) => (ptr.pmidx | 0) === PM_MIND_FLAYER || (ptr.pmidx | 0) === PM_MASTER_MIND_FLAYER;
const _is_swimmer = (ptr) => ((ptr.mflags1 | 0) & M1_SWIM) !== 0;
const _lays_eggs = (ptr) => ((ptr.mflags1 | 0) & M1_OVIPAROUS) !== 0;
const _eggs_in_water = (ptr) => _lays_eggs(ptr) && (ptr.mlet | 0) === S_EEL_LET && _is_swimmer(ptr);
const _is_vampire = (ptr) => (ptr.mlet | 0) === S_VAMPIRE_LET;

/* C obj.h:418 is_flimsy(otmp) — oc_material <= LEATHER (== 5) or rubber hose. */
function is_flimsy(otmp) {
    const RUBBER_HOSE = 78;
    const LEATHER = 7;
    return (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) <= LEATHER || (otmp.otyp | 0) === RUBBER_HOSE;
}
/* C objects.h oc_skill range P_SHORT_SWORD(4)..P_SABER(10) within WEAPON_CLASS. */
function is_sword(otmp) {
    const WEAPON_CLASS = 2;
    const P_SHORT_SWORD = 5, P_SABER = 9;
    if ((otmp.oclass | 0) !== WEAPON_CLASS) return false;
    const sk = MKOBJ_OC_SKILL[otmp.otyp | 0] | 0;
    return sk >= P_SHORT_SWORD && sk <= P_SABER;
}
/* C do.c:665 canletgo(obj, word) with word == "" — every message branch is
 * suppressed, so only the predicate matters (this is exactly how break_armor's
 * two call sites use it). */
function canletgo_quiet(obj) {
    if (!obj) return true;
    if ((obj.owornmask | 0) & (W_ARMOR | W_ACCESSORY)) return false;
    if (obj === game.u.uwep && welded(obj)) return false;
    /* objects.h GEM() LOADSTONE (was 479 = BLINDING_VENOM) and TOOL() LEASH
     * (was 208 = a weapon); js/mklev.js, js/dig.js and js/cmd.js all already
     * had LEASH = 236. */
    const LOADSTONE = 471, LEASH = 236;
    if ((obj.otyp | 0) === LOADSTONE && obj.cursed) return false;
    if ((obj.otyp | 0) === LEASH && (obj.leashmon | 0) !== 0) return false;
    if ((obj.owornmask | 0) & W_SADDLE) return false;
    return true;
}
/* C do_wear.c:930 Armor_gone() — the take-off half of Armor_off without the
 * "you finish taking off" bookkeeping; same slot clear + AC recompute. */
function Armor_gone() {
    return takeoff_slot_noac('uarm');
}

/* C polyself.c:1942 skinback().  Dragon scale mail is temporarily stored in
 * uskin while the hero is in the matching dragon form.  Leaving that form
 * must put the object back into uarm and clear the I_SPECIAL marker which
 * distinguishes embedded scales from ordinary worn armor. */
async function skinback_poly(silently = false) {
    const g = game;
    const u = g.u;
    const skin = u.uskin;
    if (!skin) return false;

    const oldRadius = arti_light_radius(skin);
    if (!silently)
        await pline('Your skin returns to its original form.');
    u.uarm = skin;
    u.uskin = null;
    skin.owornmask = (skin.owornmask | 0) & ~I_SPECIAL;
    /* maybe_adjust_light() has no standalone JS body yet.  Its observable
     * effect here is a vision rebuild when an artifact light's radius changes
     * as the object leaves the embedded-skin state. */
    if (artifact_light(skin) && skin.lamplit
        && arti_light_radius(skin) !== oldRadius)
        g.vision_full_recalc = 1;
    update_inventory();
    return true;
}

const PM_STRAW_GOLEM_PS = 249, PM_PAPER_GOLEM_PS = 250, PM_ROPE_GOLEM_PS = 251;
const PM_GOLD_GOLEM_PS = 252, PM_LEATHER_GOLEM_PS = 253, PM_WOOD_GOLEM_PS = 254;
const PM_FLESH_GOLEM_PS = 255, PM_CLAY_GOLEM_PS = 256, PM_STONE_GOLEM_PS = 257;
const PM_GLASS_GOLEM_PS = 258, PM_IRON_GOLEM_PS = 259;
function golemhp(type) {
    switch (type | 0) {
    case PM_STRAW_GOLEM_PS:   return 20;
    case PM_PAPER_GOLEM_PS:   return 20;
    case PM_ROPE_GOLEM_PS:    return 30;
    case PM_LEATHER_GOLEM_PS: return 40;
    case PM_GOLD_GOLEM_PS:    return 60;
    case PM_WOOD_GOLEM_PS:    return 50;
    case PM_FLESH_GOLEM_PS:   return 40;
    case PM_CLAY_GOLEM_PS:    return 70;
    case PM_STONE_GOLEM_PS:   return 100;
    case PM_GLASS_GOLEM_PS:   return 80;
    case PM_IRON_GOLEM_PS:    return 120;
    default: return 0;
    }
}

// C hack.c:4515 rounddiv(long x, int y) — signed round-to-nearest division.
function rounddiv(x, y) {
    let divsgn = 1;
    if (y === 0) throw new Error('rounddiv: division by zero');
    if (y < 0) { divsgn = -divsgn; y = -y; }
    if (x < 0) { divsgn = -divsgn; x = -x; }
    let r = Math.trunc(x / y);
    const m = x % y;
    if (2 * m >= y) r++;
    return divsgn * r;
}

// C polyself.c:272 change_sex() — flip hero gender (RNG-free).  Called from
// newman when sex_change_ok && !rn2(10).  The is_male/is_female/is_neuter test
// is over the CURRENT (pre-revert) youmonst form; when Upolyd the saved human
// gender (u.mfemale) is what will be restored, so it is the one that flips.
function change_sex() {
    const g = game;
    const u = g.u;
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const ptr = g.youmonst?.data;
    if (!Upolyd
        || (ptr && !is_male(ptr) && !is_female(ptr) && !is_neuter(ptr))) {
        if (g.flags) g.flags.female = !g.flags.female;
    }
    if (Upolyd) u.mfemale = !u.mfemale;
    // max_rank_sz()/svp.pl_character bookkeeping: RNG-free, not tracked in JS.
    if (!Upolyd) {
        u.umonnum = u.umonster | 0;
    }
    /* C polyself.c:294-306 — the amorous demon row represents both
     * incubus and succubus, so changing the saved/player sex must also refresh
     * the monster form.  C deliberately flips flags.female a second time
     * (the first flip above is suppressed for a monster with a fixed sex),
     * leaves u.umonnum at PM_AMOROUS_DEMON, and lets set_uasmon() select the
     * correct sex-dependent name/attacks. */
    if (Upolyd && (u.umonnum | 0) === PM_AMOROUS_DEMON) {
        if (g.flags) g.flags.female = !g.flags.female;
        set_uasmon();
    }
}

// C polyself.c:199 polyman(fmt, arg) — make a (new) human out of the player.
// self-genocide).  Restores the saved human attribs/gender, clears the monster
// HP/timer, repaints the hero glyph, and emits the transform message.
async function polyman(msg) {
    const g = game;
    const u = g.u;
    /* C polyself.c:198 was_mimicking = (U_AP_TYPE != M_AP_NOTHING) */
    const was_mimicking = ((g.youmonst?.m_ap_type | 0) !== M_AP_NOTHING_local);
    const was_blind = !!Blind_vis();
    const had_see_invis = !!(u.uprops?.[SEE_INVIS]
        && ((u.uprops[SEE_INVIS].intrinsic | 0)
            || (u.uprops[SEE_INVIS].extrinsic | 0))
        && !(u.uprops[SEE_INVIS].blocked | 0));
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    if (Upolyd) {
        // C: restore old attribs / umonnum / gender saved by polymon.
        if (u.macurr) u.acurr = { a: u.macurr.a.slice() };
        if (u.mamax) u.amax = { a: u.mamax.a.slice() };
        u.umonnum = u.umonster | 0;
        if (g.flags) g.flags.female = !!u.mfemale;
    }
    set_uasmon();
    u.mh = u.mhmax = 0;
    u.mtimedone = 0;
    await skinback_poly(false);
    u.uundetected = 0;
    // sticking/uunstick: hero is not being held — skip.
    find_ac();
    /* C polyself.c:219-224 */
    if (was_mimicking) {
        if ((g.multi | 0) < 0) await unmul("");
        g.youmonst.m_ap_type = M_AP_NOTHING_local;
        g.youmonst.mappearance = 0;
    }
    newsym(u.ux, u.uy);
    await urgent_pline(msg);
    // C polyself.c:248-250 — refresh invisible-mimic light blocking when the
    // form transition changes See_invisible.  This is stateful display data,
    // so it must follow set_uasmon() and precede the later monster repaint.
    const see_invis = !!(u.uprops?.[SEE_INVIS]
        && ((u.uprops[SEE_INVIS].intrinsic | 0)
            || (u.uprops[SEE_INVIS].extrinsic | 0))
        && !(u.uprops[SEE_INVIS].blocked | 0));
    if (see_invis !== had_see_invis)
        set_mimic_blocking();
    if (u.utrap && (u.utraptype | 0) === TT_PIT) {
        // C: set_utrap(rn1(6, 2), TT_PIT), including its timer draw.
        set_utrap(rn1(6, 2), TT_PIT);
    }
    /* C polyself.c:258-261 — reverting from eyeless.
     *     if (was_blind && !Blind) {
     *         set_itimeout(&HBlinded, 1L);
     *         make_blinded(0L, TRUE);   / * remove blindness * /
     *     }
     * RNG-free; make_blinded's only pline on this arm is "You can see
     * again." (js/zap.js:472). */
    if (was_blind && !Blind_vis()) {
        set_HBlinded(1);
        make_blinded(0, true);
    }
    // C polyself.c:261 check_strangling(TRUE).  Reversion can expose a
    // strangulation amulet which was harmless in a breathless form.
    check_strangling_poly(true);
    /* C polyself.c:263-265 — if (!Levitation && !u.ustuck &&
     * is_pool_or_lava(u.ux, u.uy)) spoteffects(TRUE); */
    {
        const lev = u.uprops?.[LEVITATION];
        const Lev = !!((lev?.intrinsic | 0) || (lev?.extrinsic | 0)) && !(lev?.blocked | 0);
        if (!Lev && !u.ustuck && is_pool_or_lava(u.ux, u.uy))
            await spoteffects(true);
    }
    // see_monsters(): RNG-free display bookkeeping.
    // C polyself.c:267 see_monsters(): RNG-free display bookkeeping.
}

export async function rehumanize() {
    const g = game;
    const u = g.u;
    if (g.context?.mon_moving)
        g._rehumanizeDisplayPending = true;
    /* C polyself.c:1369 — latch Flying before polyman() replaces the form.
     * Flying is a property of the current monster form (and equipment/steed),
     * so reading it after set_uasmon() would lose the transition that controls
     * the gentle-return message below.  The property is maintained by
     * set_uasmon() through FROMFORM; a steed which supplies flight is included
     * here just as the youprop.h Flying macro includes it. */
    const flyingProp = u.uprops?.[FLYING];
    const steedWasFlying = !!(u.usteed?.data
        && ((u.usteed.data.mflags1 | 0) & M1_FLY));
    const was_flying = (!!((flyingProp?.intrinsic | 0)
        || (flyingProp?.extrinsic | 0)) && !(flyingProp?.blocked | 0))
        || steedWasFlying;

    /* C:1372-1386 — "You can't revert back while unchanging". */
    const p_unchg = u.uprops?.[UNCHANGING_PS];
    if (p_unchg && (((p_unchg.intrinsic | 0) !== 0) || ((p_unchg.extrinsic | 0) !== 0))) {
        /* C:1373-1380 — done(DIED) is deferred by deadhero(), but the
         * killer fields must be set before it.  An unchanging amulet cannot
         * coexist with life saving in this arm, so there is no continuation
         * which should fall through into rehumanization. */
        if ((u.mh | 0) < 1) {
            if (!g.svk) g.svk = {};
            if (!g.svk.killer)
                g.svk.killer = { id: 0, format: 0, name: '', next: null };
            g.svk.killer.format = 2; /* NO_KILLER_PREFIX */
            g.svk.killer.name = 'killed while stuck in creature form';
            deadhero(0 /* DIED */);
            await do_death_sequence({ inPlace: true });
            return;
        }
        /* C:1381-1385 — an amulet of unchanging announces that its power
         * failed, then observes and discovers the object.  The property can
         * also be intrinsic, in which case uamul is absent and this arm is
         * intentionally silent. */
        const uamul = u.uamul;
        if (uamul && (uamul.otyp | 0) === 207 /* AMULET_OF_UNCHANGING */) {
            await pline(`Your ${simpleonames(uamul)} ${otense(uamul, 'fail')}!`);
            observe_object(uamul);
            discover_object(207, true, true, true); /* makeknown */
        }
    }

    /* C:1393-1394 emits_light/del_light_source — light-source bookkeeping for
     * a glowing form; display-only and RNG-free. */
    await polyman(`You return to ${g.urace?.adj || 'human'} form!`);

    if ((u.uhp | 0) < 1) {
        await pline('Your old form was not healthy enough to survive.');
        if (!g.svk) g.svk = {};
        if (!g.svk.killer)
            g.svk.killer = { id: 0, format: 0, name: '', next: null };
        g.svk.killer.name = `reverting to unhealthy ${g.urace?.adj || 'human'} form`;
        g.svk.killer.format = KILLED_BY;
        deadhero(0 /* end.h DIED */);
        await do_death_sequence({ inPlace: true });
    }
    nomul(0);

    if (g.disp) g.disp.botl = true;              /* C:1408 */
    g.vision_full_recalc = 1;                    /* C:1409 */
    await encumber_msg();                        /* C:1410 */
    const nowFlyingProp = u.uprops?.[FLYING];
    const steedNowFlying = !!(u.usteed?.data
        && ((u.usteed.data.mflags1 | 0) & M1_FLY));
    const now_flying = (!!((nowFlyingProp?.intrinsic | 0)
        || (nowFlyingProp?.extrinsic | 0)) && !(nowFlyingProp?.blocked | 0))
        || steedNowFlying;
    if (was_flying && !now_flying && u.usteed)
        await pline(`And ${mon_nam_poly(u.usteed)} return gently to the ${surface(u.ux, u.uy)}.`);
    update_inventory();                          /* C:1411 */
    /* C polyself.c:1415-1417 retouch_equipment(2) / selftouch(). */
    if (!u.uarmg)
        await selftouch(NO_LONGER_PETRIFY_RESISTANT);
}

/* C youprop.h Polymorph_control (HPolymorph_control || EPolymorph_control),
 * prop.h id 62 (js/const.js:2389).  js/polyself.js:1237 spells the same read as
 * the NAMED key `u.uprops.POLYMORPH_CONTROL`; both spellings are checked here
 * because this port carries more than one (see the uprops spelling note in
 * js/attrib.js) and reading only the dead one would silently take the death
 * arm for a hero C keeps alive at 1 HP. */
const POLYMORPH_CONTROL_PS = 62;
/* C were.c:70-88 were_beastie() and :40-53 counter_were().  These
 * mappings are needed by polyself's special lycanthrope shift: a controlled
 * request for "wolf"/"warg" is a request for the hero's specific were form,
 * while an already-beast form can only revert through the human placeholder. */
function _counter_were_ps(pm) {
    switch (pm | 0) {
    case PM_WEREWOLF: return PM_HUMAN_WEREWOLF;
    case PM_HUMAN_WEREWOLF: return PM_WEREWOLF;
    case PM_WEREJACKAL: return PM_HUMAN_WEREJACKAL;
    case PM_HUMAN_WEREJACKAL: return PM_WEREJACKAL;
    case PM_WERERAT: return PM_HUMAN_WERERAT;
    case PM_HUMAN_WERERAT: return PM_WERERAT;
    default: return NON_PM;
    }
}
function _were_beastie_ps(pm) {
    switch (pm | 0) {
    case PM_WERERAT: case PM_SEWER_RAT: case PM_GIANT_RAT: case PM_RABID_RAT:
        return PM_WERERAT;
    case PM_WEREJACKAL: case PM_JACKAL: case PM_FOX: case PM_COYOTE:
        return PM_WEREJACKAL;
    case PM_WEREWOLF: case PM_WOLF: case PM_WARG:
    case PM_WINTER_WOLF: case PM_WINTER_WOLF_CUB:
        return PM_WEREWOLF;
    default: return NON_PM;
    }
}

function Polymorph_control_ps() {
    const up = game.u?.uprops;
    if (!up)
        return false;
    const byId = up[POLYMORPH_CONTROL_PS];
    const byName = up.POLYMORPH_CONTROL;
    return !!((byId && (byId.intrinsic || byId.extrinsic))
              || (byName && (byName.intrinsic || byName.extrinsic)));
}

/* C polyself.c:424-434 — shared `dead:` label. done() must run at this call
 * site: deferring it lets polyself and the world turn continue, consuming RNG
 * and clearing mvl_change before death. Only lifesaving or a debug/explore
 * refusal returns to the hunger/encumbrance tail. */
async function newman_dead() {
    const g = game;
    await urgent_pline("Your new form doesn't seem healthy enough to survive.");
    if (!g.svk) g.svk = {};
    if (!g.svk.killer)
        g.svk.killer = { id: 0, format: 0, name: '', next: null };
    g.svk.killer.format = KILLED_BY_AN;
    g.svk.killer.name = 'unsuccessful polymorph';
    await done(DIED);
    if ((game.multi | 0) < 0) {
        game.multi = 0;
        game.nomovemsg = null;
    }
    await newuhs(false);
    await encumber_msg();
}

// ── C polyself.c:336 newman() — revert to a "new" hero of your own race. ──────
// Reached from polyself() when the resolved form is illegal (PM_HUMAN etc.) and
// sex_change_ok is set (the wizard #polyself "human" revert on this human hero,
// whose u.umonster != PM_HUMAN so the wizard-mode direct rehumanize branch is
// skipped).  RNG order (leaf-for-leaf vs C):
//   rn1(5,-2)      new experience level (old + {-2..+2})
//   rn2(diff)      rndexp(FALSE) — random XP for the new level
//   rn2(5) x4      redist_attr() — Str/Dex/Con/Cha jitter (skips Int/Wis)
//   rn1(4,8)       hpmax scaling
//   newhp() xNL    per-level HP for the new level (u.ulevel 0..NL-1)
//   rn1(4,8)       enmax scaling
//   newpw() xNL    per-level spell power
//   rn1(500,500)   u.uhunger
export async function newman() {
    const g = game;
    const u = g.u;
    const oldlvl = u.ulevel | 0;
    let newlvl = oldlvl + rn1(5, -2);   /* old + {-2,-1,0,+1,+2} */
    if (newlvl > 127 || newlvl < 1) {
        /* C: goto dead — old level is still intact, in case of lifesaving. */
        await newman_dead();
        return;
    }
    if (newlvl > MAXULEV) newlvl = MAXULEV;
    if (newlvl < oldlvl) u.ulevelmax = (u.ulevelmax | 0) - (oldlvl - newlvl);
    if ((u.ulevelmax | 0) < newlvl) u.ulevelmax = newlvl;
    u.ulevel = newlvl;

    // oldgend = poly_gender() — livelog only (no RNG/screen); omitted.
    if ((g.sex_change_ok | 0) && !rn2(10))
        change_sex();

    await adjabil(oldlvl, u.ulevel | 0);

    // random experience points for the new experience level
    u.uexp = rndexp(false, u.ulevel | 0, u.uexp);

    // set up new attribute points (particularly Con)
    redist_attr();

    // New hit points: strip level-gain HP, scale the extra, re-add per-level HP.
    if (!u.uhpinc) u.uhpinc = new Array(MAXULEV).fill(0);
    let hpmax = u.uhpmax | 0;
    for (let i = 0; i < oldlvl; i++) hpmax -= (u.uhpinc[i] | 0);
    hpmax = rounddiv(hpmax * rn1(4, 8), 10);
    for (let i = 0; (u.ulevel = i) < newlvl; i++) hpmax += newhp();
    if (hpmax < (u.ulevel | 0)) hpmax = u.ulevel | 0;
    u.uhp = rounddiv((u.uhp | 0) * hpmax, (u.uhpmax | 0));
    setuhpmax(hpmax, true); /* might reduce u.uhp */

    // Same for spell power.
    if (!u.ueninc) u.ueninc = new Array(MAXULEV).fill(0);
    let enmax = u.uenmax | 0;
    for (let i = 0; i < oldlvl; i++) enmax -= (u.ueninc[i] | 0);
    enmax = rounddiv(enmax * rn1(4, 8), 10);
    for (let i = 0; (u.ulevel = i) < newlvl; i++) enmax += newpw();
    if (enmax < (u.ulevel | 0)) enmax = u.ulevel | 0;
    u.uen = rounddiv((u.uen | 0) * enmax, ((u.uenmax | 0) < 1 ? 1 : (u.uenmax | 0)));
    u.uenmax = enmax;

    u.uhunger = rn1(500, 500);
    /* C polyself.c:416-418.  Calling the shared bodies preserves delayed
     * killers and partial sickness types; direct property assignment would
     * silently discard that state. */
    if (u.uprops?.[SICK]?.intrinsic)
        await make_sick(0, null, false, 3 /* SICK_ALL */);
    if (u.uprops?.[STONED]?.intrinsic)
        await make_stoned(0, null, 0, null);
    if ((u.uhp | 0) <= 0) {
        /* C polyself.c:415-423: Polymorph_control keeps you alive at 1 HP,
         * otherwise this falls into the same `dead:` label as the fatal-level
         * arm above. */
        if (Polymorph_control_ps()) {
            if ((u.uhp | 0) <= 0)
                u.uhp = 1;
        } else {
            await newman_dead();
            return;
        }
    }
    /* C eat.c:newuhs(FALSE), including its fainting branch for callers that
     * arrive with an unusual hunger value. */
    await newuhs(false);

    // use saved gender we're about to revert to, not current
    /* C you.h:554 — #define Upolyd (u.umonnum != u.umonster).  Was
     * (u.mtimedone > 0), which is you.h:422, the poly TIMER, a different field. */
    const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
    const ir = (g.flags?.initrace ?? 0) | 0;
    const fem = Upolyd ? !!u.mfemale : !!(g.flags?.female);
    const indiv = RACE_INDIVIDUAL[ir] ?? RACE_INDIVIDUAL[0];
    const noun = RACE_NOUN[ir] ?? 'human';
    const newform = (fem && indiv[1]) ? indiv[1] : (indiv[0] ? indiv[0] : noun);
    await polyman(`You feel like a new ${newform}!`);

    // newgend/livelog: no screen output; omitted.
    if (u.uprops?.[SLIMED]?.intrinsic) {
        /* C prints this before starting the ten-turn slime countdown. */
        await pline('Your body transforms, but there is still slime on you.');
        await make_slimed(10, null);
    }
    if (g.disp) g.disp.botl = 1; /* SET_BOTL */
    await encumber_msg();
    // C polyself.c:461 retouch_equipment(2) / selftouch().  selftouch is
    // safe here even when the ordinary inventory has no petrifying corpse;
    // its guard is fully local and consumes no RNG in that case.
    if (!u.uarmg)
        await selftouch(NO_LONGER_PETRIFY_RESISTANT);
}

// C eat.c:3363 newuhs(FALSE) on the newman path — recompute hunger status from
// the freshly-rolled u.uhunger (500..999 → NOT_HUNGRY).  No occupation eating,
// so no RNG and no faint/starve branch is reachable here.
async function newuhs_after_poly() {
    /* C newman() calls newuhs(FALSE), rather than assigning the threshold
     * directly.  The shared implementation in eat.js includes the complete
     * fainting/starvation transition (and is safe for the impossible-looking
     * negative hunger values which can still be restored by life saving). */
    await newuhs(false);
}

// ── C polyself.c:468 polyself(psflags) — the wand/spell self-poly entry. ──────
const POLY_NOFLAGS = 0x00;
export const POLY_CONTROLLED = 0x01;
const POLY_MONSTER = 0x02;
const POLY_REVERT = 0x04;
const POLY_LOW_CTRL = 0x08;

export async function polyself(psflags) {
    const g = game;
    const u = g.u;
    psflags = psflags | 0;

    const forcecontrol = (psflags & POLY_CONTROLLED) !== 0;
    const monsterpoly = (psflags & POLY_MONSTER) !== 0;
    const formrevert = (psflags & POLY_REVERT) !== 0;
    // C polyself.c:477 — Is_dragon_armor(uarm).  Dragon mail and scales occupy
    // contiguous object-type bands (objects.h:507-508).  Keep this derived from
    // the worn suit: dragon armor is a special skin source even when the hero
    // has polymorph control or is already polymorphed.
    const armor = u.uarm || null;
    const armorOtyp = armor?.otyp | 0;
    const draconian = armorOtyp >= 101 && armorOtyp <= 120;
    const iswere = ((u.ulycn ?? NON_PM) | 0) >= LOW_PM;
    // C is_vampire() tests the current monster letter; is_vampshifter() tests
    // the true form kept in cham.  Vampire polymorph is a special path and
    const currentData = g.youmonst?.data || permonstTemplate(u.umonnum | 0);
    const isvamp = _is_vampire(currentData)
        || (g.youmonst?.cham === PM_VAMPIRE || g.youmonst?.cham === PM_VAMPIRE_LEADER
            || g.youmonst?.cham === PM_VLAD_THE_IMPALER);
    const low_control = (psflags & POLY_LOW_CTRL) !== 0;
    // Polymorph_control && !(Stunned || Unaware); the wizard has none of these.
    /* C youprop.h: Polymorph_control is the union of the intrinsic and
     * extrinsic property channels (HPolymorph_control || EPolymorph_control).
     * The old read only considered the named intrinsic slot, which made a
     * ring or other extrinsic source incorrectly take the uncontrolled roll
     * and could turn a survivable controlled request into system shock. */
    const polymorphControl = Polymorph_control_ps();
    const stunned = !!(u.uprops && u.uprops[STUNNED] && u.uprops[STUNNED].intrinsic);
    const unaware = !!(g.flags && g.flags.unaware);
    const controllable_poly = polymorphControl && !(stunned || unaware);
    /* C HUnchanging || EUnchanging: an extrinsic amulet/ring source blocks
     * the transform just as an intrinsic source does. */
    const unchangingProp = u.uprops?.[UNCHANGING_PS];
    const unchanging = !!(unchangingProp
        && ((unchangingProp.intrinsic | 0) || (unchangingProp.extrinsic | 0)));
    // C wizard (debug playmode) + gu.urole.mnum, used only by the controlled path's
    const wizardMode = !!(g.flags && g.flags.debug);
    const uroleMnum = (g.urole && g.urole.mnum) | 0;

    // C polyself.c:483 — Unchanging: fail to transform.
    if (unchanging) {
        await pline('You fail to transform!');
        return;
    }

    // C polyself.c:488-497 — controllability roll (uncontrolled, non-special poly).
    if (!polymorphControl && !forcecontrol && !draconian && !iswere && !isvamp) {
        const _roll = rn2(20);
        if (_roll > acurr(u, A_CON)) {
            await pline('You shudder for a moment.');
            await losehp_systemshock(rnd(30));
            exercise(A_CON, false);
            return;
        }
    }

    let mntmp = -1; /* NON_PM */
    // C's controlled-poly wizard-revert jumps directly to made_change after
    // rehumanize(); keep this separate from the normal target dispatch so we
    // don't consume the later random-form/sex-change rolls.
    let directRevert = false;
    let wereShift = false;

    // C polyself.c:621-666 — merge with the worn dragon armor.  This helper is
    // deliberately kept in polyself rather than do_wear: the operation changes
    // the hero's monster form and transfers the suit into `uskin` in the same
    // command.  It has no RNG; callers decide when the C branch is selected.
    const merge_dragon_armor = async () => {
        if (!draconian || !u.uarm)
            return false;
        const suit = u.uarm;
        const ot = suit.otyp | 0;
        const dragon = (ot >= 111 && ot <= 120)
            ? PM_GRAY_DRAGON + ot - 111
            : PM_GRAY_DRAGON + ot - 101;
        const mvflags = game.mvitals?.[dragon]?.mvflags | 0;
        if (mvflags & G_GENOD)
            return false; // C allows the normal polymon failure path.

        const wasLit = !!suit.lamplit;
        if (ot >= 111 && ot <= 120) {
            await pline('You merge with your scaly armor.');
        } else {
            // C simpleonames() is evaluated before the mail becomes scales.
            let name = simpleonames(suit);
            name = name.replace(/ dragon /, ' ');
            await pline(`Your ${name} reverts to scales as you merge with them.`);
            suit.otyp = ot + (111 - 101);
            observe_object(suit);
        }
        // setworn(NULL,W_ARM) clears the suit slot and its W_ARM bit; the
        // embedded scales retain the inventory node and receive I_SPECIAL.
        u.uarm = null;
        suit.owornmask = ((suit.owornmask | 0) & ~W_ARM) | I_SPECIAL;
        u.uskin = suit;
        if (wasLit) suit.lamplit = true;
        update_inventory();
        return dragon;
    };

    if (formrevert) {
        mntmp = (g.youmonst?.cham ?? -1) | 0;
        // C formrevert is a monster polymorph request and must enter the
        // vampire special dispatch when the current form is vampiric.
        // It also disables the controlled name prompt.
        // (monsterpoly is const below in the original C; retain the effective
        // behavior locally by handling this before target selection.)
    }

    // POLY_LOW_CTRL suppresses force-control for vampire/were/dragon special
    // forms, exactly as the C entry guard does.
    const effectiveMonsterpoly = monsterpoly || formrevert;
    const specialVampireRequest = effectiveMonsterpoly && isvamp;
    const effectiveForcecontrol = forcecontrol && !(low_control
        && (draconian || effectiveMonsterpoly || isvamp || iswere));

    // C polyself.c:513-625 — controlled-poly (getlin name prompt) + special
    // takes the getlin path: type a form name, resolve it, break.
    if (specialVampireRequest) {
        // C: if (monsterpoly && isvamp) goto do_vampyr;
        // The target from formrevert is retained when valid; otherwise the
        // vampire chooses wolf/fog cloud/bat using this exact short-circuit
        // RNG order.
        if (mntmp < LOW_PM || (permonstTemplate(mntmp).geno & G_UNIQ)) {
            if ((g.youmonst?.data?.pmidx | 0) === PM_VAMPIRE_LEADER && !rn2(10))
                mntmp = PM_WOLF;
            else if (!rn2(4))
                mntmp = PM_FOG_CLOUD;
            else
                mntmp = PM_VAMPIRE_BAT;
            if (g.youmonst?.cham >= LOW_PM
                && !_is_vampire(currentData) && !rn2(2))
                mntmp = g.youmonst.cham | 0;
        }
        await polymon(mntmp);
        return;
    }

    if (controllable_poly || effectiveForcecontrol) {
        // C polyself.c:514-516 — buf[0]='\0'; tryct = 5;
        let buf = '';
        let tryct = 5;
        /* C hooked_tty_getlin (getline.c:53) pages a standing topline with
         * more() before the prompt.  This port parks the previous command's
         * result line in _resultMessage until the next rhack, so a turn-start
         * polyself (allmain.c:325) reaches getlin with an empty
         * _pending_message and the thrown-aklys kill messages never page.
         * Move it back onto the live topline so getlin pages it. */
        if (game._resultMessage) {
            const _rm = game._resultMessage;
            const _rj = (game._resultMessageJoins?.src === _rm
                && Array.isArray(game._resultMessageJoins.joins))
                ? game._resultMessageJoins.joins.slice()
                : (_topl_joins_snapshot(_rm) || undefined);
            game._pending_message = game._pending_message
                ? _topl_merge_result(_rm, game._pending_message, _rj)
                : _rm;
            game._resultMessage = null;
        }
        do {
            mntmp = NON_PM;
            // C polyself.c:519 — getlin("Become what kind of monster? [type the name]").
            // RNG-free: the reads consume keystrokes only.
            buf = await getlin('Become what kind of monster? [type the name]');
            buf = mungspaces(buf);
            // C polyself.c:521-528 — ESC cancels (wizard #polyself → "Never mind.").
            if (buf.charCodeAt(0) === 27 /* '\033' */) {
                if (forcecontrol) { await pline('Never mind.'); return; }
                buf = '*';
            }
            // C polyself.c:529-533 — explicit random request.
            if (buf === '*' || buf === 'random') { tryct = 0; continue; }
            // C polyself.c:534-535 — class=0; mntmp = name_to_mon(buf, &gvariant).
            const nm = name_to_mon(buf, NEUTRAL);
            mntmp = (nm && typeof nm === 'object') ? (nm.mntmp | 0) : (nm | 0);
            /* C polyself.c:536-545: an unrecognised species name is also
             * accepted as a monster class ("dragon", "demon", or a class
             * letter).  name_to_monclass writes a specific mndx for aliases
             * such as "long worm tail"; otherwise mkclass() performs C's
             * class selection, including its RNG.  An unknown answer prints
             * the ordinary diagnostic and consumes another prompt rather than
             * aborting the command. */
            let monclass = 0;
            if (mntmp < LOW_PM) {
                const mbox = { value: NON_PM };
                monclass = name_to_monclass(buf, mbox) | 0;
                mntmp = mbox.value | 0;
                if (mntmp < LOW_PM && monclass > 0)
                    mntmp = mkclass(monclass);
                if (mntmp < LOW_PM) {
                    await pline('I\'ve never heard of such monsters.');
                    continue;
                }
            }
            let cptr = permonstTemplate(mntmp);
            // C polyself.c:547-563 — placeholder-form remap, but ONLY for a
            // placeholder that is NOT your_race and NOT PM_HUMAN (those fall through
            // "human" (PM_HUMAN) as a revert, which skips this block.
            if (is_placeholder(mntmp) && !your_race(cptr) && mntmp !== PM_HUMAN) {
                /* C has a suitable replacement for the three race
                 * placeholders.  The remaining placeholder forms have no
                 * replacement; leave the target untouched so the normal
                 * polyok/newman decision below handles PM_HUMAN-like forms. */
                if (mntmp === RACE_MNUM[4])
                    mntmp = rn2(3) ? PM_HILL_ORC : PM_MORDOR_ORC;
                else if (mntmp === RACE_MNUM[1])
                    mntmp = rn2(3) ? PM_GREEN_ELF : PM_GREY_ELF;
                else if (mntmp === PM_GIANT)
                    mntmp = rn2(3) ? PM_STONE_GIANT : PM_HILL_GIANT;
                cptr = permonstTemplate(mntmp);
            }
            // C polyself.c:565-615 — result dispatch on the resolved form.
            /* C you.h:554 (u.umonnum != u.umonster), not the u.mtimedone timer. */
            const Upolyd = (u.umonnum | 0) !== (u.umonster | 0);
            /* C polyself.c:570-582: the bare "priest" name resolves to the
             * aligned-cleric monster row, but a wizard who is currently
             * polymorphed as the Priest role must still return to the role's
             * normal form.  C only suppresses that revert when the user
             * explicitly typed "aligned"; without this exception the port
             * incorrectly polymon()s into the aligned cleric and leaves the
             * wizard in monster form. */
            const wizardRoleRevert = wizardMode && Upolyd
                && (mntmp === (u.umonster | 0)
                    || ((u.umonster | 0) === PM_CLERIC
                        && (mntmp | 0) === PM_PRIEST
                        && !buf.toLowerCase().includes('aligned')));
            if (wizardRoleRevert) {
                // C polyself.c:570-582 — wizard reverting to own role while poly'd.
                await rehumanize();
                directRevert = true;
                break;
            } else if (iswere
                       && (_were_beastie_ps(mntmp) === (u.ulycn | 0)
                           || _counter_were_ps(mntmp) === (u.ulycn | 0)
                           || (Upolyd && mntmp === PM_HUMAN))) {
                /* C polyself.c:583-586 — were-form requests bypass polyok().
                 * Defer the actual target adjustment until after the prompt,
                 * matching do_shift's shared path below. */
                wereShift = true;
                break;
            } else if (!polyok(cptr)
                       && !(mntmp === PM_HUMAN
                            || (your_race(cptr) && (cptr.geno & G_UNIQ) === 0)
                            || mntmp === (uroleMnum | 0))) {
                // C polyself.c:587-613 — a class pick can land on a
                // non-polymorphable monster.  Retry that class in-place (the
                // same answer is not requested from the player again).
                if (monclass) {
                    while (rn2(3) || --tryct > 0) {
                        mntmp = mkclass(monclass);
                        cptr = permonstTemplate(mntmp);
                        if (polyok(cptr) || is_placeholder(mntmp)) break;
                    }
                    if (polyok(cptr)) break;
                    // C increments before the diagnostic so the enclosing
                    // --tryct reaches zero and emits thats_enough_tries.
                    if (tryct <= 0) tryct++;
                }
                // C polyself.c:608-612 — the_unique_pm gets "the", non-pname gets an().
                let pm_name = monPmname(mntmp, g.flags?.female ? FEMALE : MALE);
                if (the_unique_pm(cptr)) pm_name = the(pm_name);
                else if (!((cptr.mflags2 & 0x00080000) !== 0)) /* type_is_pname: M2_PNAME */
                    pm_name = an(pm_name);
                await You_cant(`polymorph into ${pm_name}.`);
            } else {
                // C polyself.c:614 — else break; (a valid, polyok form was named).
                break;
            }
        } while (--tryct > 0);

        // C polyself.c:618-625 — thats_enough_tries / draconian & vamp skin merges.
        if (!tryct) await pline("That's enough tries!");
        // C polyself.c:621-625 — a were-creature may shift to its own
        // beast form even when the requested target is otherwise !polyok().
        if (wereShift) {
            if (u.umonnum !== u.umonster && _were_beastie_ps(mntmp) !== (u.ulycn | 0))
                mntmp = PM_HUMAN;
            else
                mntmp = u.ulycn | 0;
            // C goto do_shift bypasses the ordinary polyok/rn2(5) path.
            if (mntmp === PM_HUMAN)
                await newman();
            else
                await polymon(mntmp);
            return;
        }
        // C polyself.c:621-625 — controlled dragon requests still merge when
        // the requested form is the armor's own dragon (or all five tries were
        if (draconian && (tryct <= 0
                          || mntmp === (PM_GRAY_DRAGON + armorOtyp
                                        - (armorOtyp >= 111 ? 111 : 101)))) {
            mntmp = await merge_dragon_armor();
            if (mntmp === false)
                mntmp = PM_GRAY_DRAGON + armorOtyp
                    - (armorOtyp >= 111 ? 111 : 101);
            if (mntmp === PM_HUMAN)
                await newman();
            else
                await polymon(mntmp);
            return;
        }
        // C vampire control accepts only the special forms; other names fall
        // through to the normal selected target.  A controlled vampire still
        // asks for confirmation before shifting to its chosen shape.
        if (isvamp && (tryct <= 0 || mntmp === PM_WOLF || mntmp === PM_FOG_CLOUD
                       || mntmp === PM_VAMPIRE_BAT)) {
            if (mntmp < LOW_PM || (permonstTemplate(mntmp).geno & G_UNIQ)) {
                if ((g.youmonst?.data?.pmidx | 0) === PM_VAMPIRE_LEADER && !rn2(10))
                    mntmp = PM_WOLF;
                else if (!rn2(4)) mntmp = PM_FOG_CLOUD;
                else mntmp = PM_VAMPIRE_BAT;
                if (g.youmonst?.cham >= LOW_PM && !_is_vampire(currentData) && !rn2(2))
                    mntmp = g.youmonst.cham | 0;
            }
            if (controllable_poly) {
                const answer = await yn_function(`Become ${an(monPmname(mntmp, g.flags?.female ? FEMALE : MALE))}?`, 'yn', 'n');
                if (answer !== 'y') return;
            }
            await polymon(mntmp);
            return;
        }
    } else if (draconian || iswere || isvamp) {
        if (draconian) {
            // C do_merge has priority over lycanthropy and vampirism.
            mntmp = PM_GRAY_DRAGON + armorOtyp
                - (armorOtyp >= 111 ? 111 : 101);
            await merge_dragon_armor();
        } else if (iswere) {
            /* C do_shift:665-670 — uncontrolled were changes avoid the
             * ordinary random monster picker.  A beast form reverts through
             * newman(); a human form enters its canonical beast form. */
            if ((u.umonnum | 0) !== (u.umonster | 0)
                && _were_beastie_ps(mntmp) !== (u.ulycn | 0))
                mntmp = PM_HUMAN;
            else
                mntmp = u.ulycn | 0;
        } else if (isvamp) {
            // C do_vampyr: uncontrolled vampire changes use wolf (lord/Vlad,
            // 1/10), fog cloud (1/4), otherwise vampire bat.  A vampshifter
            // which is not currently in vampire form can occasionally return
            // to its true form with one additional rn2(2).
            if (mntmp < LOW_PM || (permonstTemplate(mntmp).geno & G_UNIQ)) {
                if ((g.youmonst?.data?.pmidx | 0) === PM_VAMPIRE_LEADER && !rn2(10))
                    mntmp = PM_WOLF;
                else if (!rn2(4)) mntmp = PM_FOG_CLOUD;
                else mntmp = PM_VAMPIRE_BAT;
                if (g.youmonst?.cham >= LOW_PM && !_is_vampire(currentData) && !rn2(2))
                    mntmp = g.youmonst.cham | 0;
            }
        }
        // C polyself.c:687-695: every special change skips polyok(), the
        // that does not make its own lycanthrope transformation illegal.
        if (mntmp === PM_HUMAN)
            await newman();
        else
            await polymon(mntmp);
        return;
    }

    // C's `goto made_change` after the direct wizard revert bypasses
    // sex_change_ok and all target selection.  The current JS rehumanize body
    // performs the state and display work itself; returning preserves that
    // control flow and, crucially, avoids drawing RNG for a second transform.
    if (directRevert)
        return;

    // C polyself.c:698-706 — random "ordinary" monster pick loop (only if no form yet).
    if (mntmp < LOW_PM) {
        let tryct = 200;
        do {
            mntmp = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
            const ptr = permonstTemplate(mntmp);
            if (polyok(ptr) && !is_placeholder(mntmp)) break;
        } while (--tryct > 0);
    }

    // C polyself.c:711-718 — polyok/!rn2(5)/your_race → newman else polymon.
    // NOTE the C short-circuit: rn2(5) is NOT drawn when forcecontrol is set
    // (wizard #polyself), so the controlled path must not consume it.
    if (g.sex_change_ok == null) g.sex_change_ok = 0;
    g.sex_change_ok++;
    const ptr = permonstTemplate(mntmp);
    let goNewman;
    if (!polyok(ptr)) goNewman = true;
    else if (!forcecontrol && !rn2(5)) goNewman = true; /* rn2(5) only when !forcecontrol */
    else if (your_race(ptr)) goNewman = true;
    else goNewman = false;
    if (goNewman) {
        await newman();
    } else {
        await polymon(mntmp);
    }
    g.sex_change_ok--;

}

/* C polyself.c:dopoly() — the #monster ability for vampires and
 * vampshifters.  This wrapper is intentionally separate from polyself(): C
 * records the old form before asking polyself(POLY_MONSTER), then announces
 * the resulting form only when a transformation actually occurred.  Keeping
 * the comparison on pmidx also survives set_mon_data() replacing the data
 * object during polymon(). */
export async function dopoly() {
    const g = game;
    const u = g.u;
    const savedPmidx = (g.youmonst?.data?.pmidx ?? u.umonnum ?? NON_PM) | 0;
    await polyself(POLY_MONSTER);
    const newPmidx = (g.youmonst?.data?.pmidx ?? u.umonnum ?? NON_PM) | 0;
    if (savedPmidx !== newPmidx) {
        const gender = g.flags?.female ? FEMALE : MALE;
        await pline(`You transform into ${an(monPmname(newPmidx, gender))}.`);
        newsym(u.ux, u.uy);
    }
    return ECMD_TIME;
}

// C polyself.c:492 losehp(rnd(30), "system shock", KILLED_BY_AN) — the failed
// controllability roll.  This used to be a throwing guard on the claim that no
// forfeits every remaining frame of the segment).  js/dokick.js losehp() is the
// shared body and consumes no RNG on the hero's-own-action path; the rnd(30) is
// already drawn by the caller, matching C's argument-evaluation order.
async function losehp_systemshock(dmg) {
    await losehp(dmg, 'system shock', KILLED_BY_AN);
}

/* C polyself.c:166-193 check_strangling(TRUE).  A polymorphed hero can be
 * immune to an amulet of strangulation while in a headless or mindless,
 * breathless form.  On returning to a vulnerable form C starts (or resumes)
 * the six-turn timer; changing into another protected form clears it. */
function check_strangling_poly(on) {
    const g = game;
    const u = g.u;
    const ptr = g.youmonst?.data || permonstTemplate((u.umonnum | 0));
    const hasHead = ((ptr.mflags1 | 0) & M1_NOHEAD) === 0;
    const mindless = ((ptr.mflags1 | 0) & 0x00010000) !== 0; /* M1_MINDLESS */
    const formBreathless = ((ptr.mflags1 | 0) & 0x00000400) !== 0; /* M1_BREATHLESS */
    const magicalBreathing = !!(u.uprops?.[MAGICAL_BREATHING]
        && ((u.uprops[MAGICAL_BREATHING].intrinsic | 0)
            || (u.uprops[MAGICAL_BREATHING].extrinsic | 0)));
    const canBeStrangled = hasHead && (!mindless || !(formBreathless || magicalBreathing));
    const strangled = u.uprops?.[STRANGLED];
    if (!strangled) return;
    if (on) {
        const amulet = u.uamul;
        if (canBeStrangled && amulet && (amulet.otyp | 0) === 203 /* AMULET_OF_STRANGULATION */) {
            const wasStrangled = (strangled.intrinsic | 0) !== 0;
            strangled.intrinsic = 6;
            if (g.disp) g.disp.botl = 1;
            pline('Your %s %s your throat!', simpleonames(amulet),
                  wasStrangled ? 'still constricts' : 'begins constricting');
            discover_object(203, true, true, true);
        }
    } else if ((strangled.intrinsic | 0) !== 0 && !canBeStrangled) {
        strangled.intrinsic = 0;
        if (g.disp) g.disp.botl = 1;
        pline('You are no longer being strangled.');
    }
}

// ── C polyself.c:1408 dobreathe() — #monster for a form with AT_BREA. ─────────
// C ref: nethack-c/src/polyself.c:1409-1435
//
//   if (Strangled)      { You_cant("breathe.  Sorry."); return ECMD_OK; }
//   if (u.uen < 15)     { You("don't have enough energy to breathe!");
//                         return ECMD_OK; }
//   u.uen -= 15;  SET_BOTL();
//   if (!getdir((char *) 0)) return ECMD_CANCEL;
//   mattk = attacktype_fordmg(gy.youmonst.data, AT_BREA, AD_ANY);
//   if (!mattk) impossible("bad breath attack?");
//   else if (!u.dx && !u.dy && !u.dz) ubreatheu(mattk);
//   else ubuzz(BZ_U_BREATH(BZ_OFS_AD(mattk->adtyp)), (int) mattk->damn);
//   return ECMD_TIME;
//
// RNG-free itself; every leaf comes from ubuzz/dobuzz (rn1(7,7) range, zap_hit,
// zhitu).  NOTE the ORDER: the 15-point Pw charge and its SET_BOTL happen BEFORE
// getdir(), so the status line already shows the reduced Pw on the frame the
export async function dobreathe() {
    const g = game;
    const u = g.u;

    // C: Strangled == u.uprops[STRANGLED].intrinsic (youprop.h:110) — the
    // amulet-of-strangulation timer, not a resistance bit.
    if ((u.uprops?.[STRANGLED]?.intrinsic | 0)) {
        await pline("You can't breathe.  Sorry.");
        return ECMD_OK;
    }
    if ((u.uen | 0) < 15) {
        await pline("You don't have enough energy to breathe!");
        return ECMD_OK;
    }
    u.uen = (u.uen | 0) - 15;
    if (g.disp) g.disp.botl = 1; /* SET_BOTL */

    if (!(await getdir(null)))
        return ECMD_CANCEL;

    const mattk = attacktype_fordmg(g.youmonst.data, AT_BREA, AD_ANY);
    if (!mattk) {
        // C: impossible("bad breath attack?").  `impossible()` reports the
        // invariant violation and returns; it does not abort the command.
        // Keep the same fall-through to ECMD_TIME so a malformed/stale form
        // cannot turn a recoverable game state into a JS process failure.
    } else if (!(u.dx | 0) && !(u.dy | 0) && !(u.dz | 0)) {
        await ubreatheu(mattk);
    } else {
        // BZ_U_BREATH(BZ_OFS_AD(adtyp)) = 20 + abs(adtyp - AD_MAGM) % 10
        // (hack.h:1481/1489).  AD_FIRE=2 → 20 + 1 = 21 ("blast of fire").
        await ubuzz(20 + Math.abs((mattk.adtyp | 0) - AD_MAGM) % 10, mattk.damn | 0);
    }
    await flush_screen(1);
    if (g._pending_message) {
        _topl_stash_result();
    }
    return ECMD_TIME;
}

// ── C polyself.c:1450 dospit() — #monster for a form with AT_SPIT. ───────────
// C: if (!getdir(0)) return ECMD_CANCEL;
//    mattk = attacktype_fordmg(youmonst.data, AT_SPIT, AD_ANY);
//    AD_BLND/AD_DRST -> BLINDING_VENOM, default (impossible) / AD_ACID -> ACID_VENOM
//    otmp = mksobj(venom, TRUE, FALSE); otmp->spe = 1; throwit(otmp, 0L, FALSE, 0);
//    return ECMD_TIME;
// throwit() (dothrow.c:1510) has no standalone JS port: it is inlined in the
// private throw_obj() of js/cmd.js.  Resolve an export by name at call time and
// fail loudly rather than fake the throw.
const BLINDING_VENOM_PS = 479, ACID_VENOM_PS = 480;
const AD_DRST_PS = 7, AD_ACID_PS = 8;
export async function dospit() {
    const g = game;
    const u = g.u;

    if (!(await getdir(null)))
        return ECMD_CANCEL;

    const mattk = attacktype_fordmg(g.youmonst.data, AT_SPIT, AD_ANY);
    if (!mattk) {
        // C: impossible("bad spit attack?") — falls through to ECMD_TIME.
    } else {
        const adtyp = mattk.adtyp | 0;
        const otyp = (adtyp === AD_BLND || adtyp === AD_DRST_PS)
            ? BLINDING_VENOM_PS
            : ACID_VENOM_PS; /* default arm: impossible() then FALLTHRU to AD_ACID */
        const otmp = await mksobj(otyp, true, false);
        otmp.spe = 1; /* to indicate it's yours */
        const throwit = cmdNS.throwit;
        if (typeof throwit !== 'function')
            throw new Error('polyself: dospit() needs throwit() (dothrow.c:1510), not exported from js/cmd.js');
        await throwit(otmp, 0, false, null);
    }
    void u;
    return ECMD_TIME;
}

// ── C polyself.c:1497 dospinweb() — webmaker spins a web ─────────────────────
export async function dospinweb() {
    const g = game;
    const u = g.u;
    const x = u.ux, y = u.uy;
    const ttmp0 = t_at(x, y);
    const levtyp = g.level?.at?.(x, y)?.typ | 0;
    const reject_terrain = is_pool_or_lava(x, y) || IS_AIR_ps(levtyp);
    const lev = u.uprops?.[LEVITATION];
    const Lev = !!((lev?.intrinsic | 0) || (lev?.extrinsic | 0)) && !(lev?.blocked | 0);

    if (Lev || reject_terrain) {
        await pline(`You must be on ${reject_terrain ? 'solid' : 'the'} ground to spin a web.`);
        return ECMD_OK;
    }
    if (u.uswallow) {
        const sw = u.ustuck;
        await pline(`You release web fluid inside ${mon_nam(sw)}.`);
        if (((sw.data.mflags1 | 0) & 0x00040000) !== 0) { /* is_animal */
            await expels_gu(sw, sw.data?.pmidx, true);
            return ECMD_OK;
        }
        if ((sw.data.mlet | 0) === 22 /* S_VORTEX */ || (sw.data.pmidx | 0) === PM_AIR_ELEMENTAL) { /* is_whirly */
            const mattk = attacktype_fordmg(sw.data, 11 /* AT_ENGL */, AD_ANY);
            if (mattk) {
                let sweep = '';
                switch (mattk.adtyp | 0) {
                case 2: sweep = 'ignites and '; break;            /* AD_FIRE */
                case 6: sweep = 'fries and '; break;              /* AD_ELEC */
                case 3: sweep = 'freezes, shatters and '; break;  /* AD_COLD */
                }
                await pline(`The web ${sweep}is swept away!`);
            }
            return ECMD_OK;
        } /* default: a nasty jelly-like creature */
        await pline(`The web dissolves into ${mon_nam(sw)}.`);
        return ECMD_OK;
    }
    if (u.utrap) {
        await pline('You cannot spin webs while stuck in a trap.');
        return ECMD_OK;
    }
    exercise(1 /* A_DEX */, true);
    if (ttmp0) {
        switch (ttmp0.ttyp | 0) {
        case 11: case 12: /* PIT, SPIKED_PIT */
            await pline('You spin a web, covering up the pit.');
            deltrap(ttmp0);
            await bhp_bury_objs(x, y);
            newsym(x, y);
            return ECMD_TIME;
        case 4: /* SQKY_BOARD */
            await pline('The squeaky board is muffled.');
            deltrap(ttmp0);
            newsym(x, y);
            return ECMD_TIME;
        case 15: case 16: case 17: case 23: /* TELEP_TRAP LEVEL_TELEP MAGIC_PORTAL VIBRATING_SQUARE */
            await pline('Your webbing vanishes!');
            return ECMD_OK;
        case 18: /* WEB */
            await pline('You make the web thicker.');
            return ECMD_TIME;
        case 13: case 14: /* HOLE, TRAPDOOR */
            await pline(`You web over the ${(ttmp0.ttyp | 0) === 14 ? 'trap door' : 'hole'}.`);
            deltrap(ttmp0);
            newsym(x, y);
            return ECMD_TIME;
        case 7: /* ROLLING_BOULDER_TRAP */
            await pline('You spin a web, jamming the trigger.');
            deltrap(ttmp0);
            newsym(x, y);
            return ECMD_TIME;
        case 1: case 2: case 5: case 3: case 10: case 6: case 8: case 9:
        case 20: case 21: case 22:
            /* ARROW DART BEAR ROCK FIRE LANDMINE SLP_GAS RUST MAGIC ANTI_MAGIC POLY */
            await pline('You have triggered a trap!');
            await dotrap(ttmp0, 0);
            return ECMD_TIME;
        default:
            throw new Error(`Webbing over trap type ${ttmp0.ttyp}?`); /* impossible() */
        }
    } else if (On_stairs(x, y)) {
        /* cop out: don't let them hide the stairs */
        await pline(`Your web fails to impede access to the ${levtyp === 26 /* STAIRS */ ? 'stairs' : 'ladder'}.`);
        return ECMD_TIME;
    }
    const ttmp = await maketrap(x, y, 18 /* WEB */);
    if (ttmp) {
        await pline('You spin a web.');
        ttmp.madeby_u = 1;
        await feeltrap(ttmp);
        if (in_rooms(x, y, 14 /* SHOPBASE */).length)
            add_damage(x, y, 30 /* SHOP_WEB_COST */);
    }
    return ECMD_TIME;
}
const IS_AIR_ps = (typ) => typ === 35 || typ === 36; /* const.js AIR, CLOUD */

// Constants needed locally (not yet in module scope)
const S_MIMIC = 13;                  /* defsym.h:309 MONSYM(13, 'm', MIMIC, ...) */
const S_EEL = 57;                    /* defsym.h:362 MONSYM(57, ';', EEL, ...) */
const M_AP_NOTHING_local = 0;        /* monst.h:52 */
const M_AP_FURNITURE_local = 1;      /* monst.h:53 */
const M_AP_OBJECT_local = 2;         /* monst.h:54 */
const M_AP_MONSTER_local = 3;        /* monst.h:55 */
const STRANGE_OBJECT = 0;            /* objects.h:78 — the dummy object[0] */
const CORPSE_local = 265;
const ECMD_OK_local = 0x00;
const ECMD_TIME_local = 0x01;
const AD_DGST = 26;                  /* monattk.h:70 — digests opponent; was 51, not any AD_ value */

export async function dohide() {
    const g = game;
    const u = g.u;
    const pd = permonstTemplate((u.umonnum) | 0);

    // Local helpers
    const _Flying = () => {
        const p = u.uprops?.[FLYING];
        const base = !!((p?.intrinsic | 0) || (p?.extrinsic | 0)) || !!(u.usteed);
        return base && !(p?.blocked | 0);
    };
    /* C mondata.h:22 is_clinger(ptr) — mflags1 & M1_CLING.  Was hardcoded FALSE
     * here with no justification; 6/383 rows set the bit (piercers, mimics,
     * wumpus, trapper), and dohide's on_ceiling reads it. */
    const is_clinger_fn = (ptr) => ((ptr.mflags1 | 0) & M1_CLING) !== 0;
    const humanoid_fn = (ptr) => ((ptr.mflags1 | 0) & M1_HUMANOID) !== 0;   /* mondata.h:65 */
    const hides_under_fn = (ptr) => !!(ptr && (ptr.mflags1 & M1_CONCEAL_bit) !== 0);  /* mondata.h:35 */
    const is_hider_fn = (ptr) => ((ptr.mflags1 | 0) & M1_HIDE_bit) !== 0;
    const digests_fn = (ptr) => dmgtype(ptr, AD_DGST);
    const has_ceiling_fn = (lev) => {
        const al = g.astral_level;
        const el = g.earth_level;
        const inEndgame = !!(lev && al && lev.dnum === al.dnum);
        const isEarth = !!(lev && el && lev.dnum === el.dnum && lev.dlevel === el.dlevel);
        return !(inEndgame && !isEarth);
    };
    const stoneProp = u.uprops?.[STONE_RES];
    const Stone_resistance = !!stoneProp
        && !!((stoneProp.intrinsic | 0) || (stoneProp.extrinsic | 0))
        && !(stoneProp.blocked | 0);

    const ismimic = pd.mlet === S_MIMIC;
    const on_ceiling = is_clinger_fn(pd) || _Flying();

    if (u.ustuck || (u.utrap && (u.utraptype !== TT_PIT || on_ceiling))) {
        let reason;
        if (!u.ustuck) {
            reason = "trapped";
        } else if (u.uswallow) {
            reason = digests_fn(u.ustuck.data) ? "swallowed" : "engulfed";
        } else if (!sticks(pd)) {
            reason = "being held";
        } else if (humanoid_fn(u.ustuck.data)) {
            reason = "holding someone";
        } else {
            reason = "holding that creature";
        }
        You_cant("hide while you're %s.", reason);
        if (u.uundetected || (ismimic && (g.youmonst.m_ap_type | 0) !== M_AP_NOTHING_local)) {
            u.uundetected = 0;
            g.youmonst.m_ap_type = M_AP_NOTHING_local;
            newsym(u.ux, u.uy);
        }
        return ECMD_OK_local;
    }

    /* note: hero-as-eel handling is incomplete but unnecessary;
       such critters aren't offered the option of hiding via #monster */
    if (pd.mlet === S_EEL && !is_pool(u.ux, u.uy)) {
        /* `g.levl` likewise has no writer (js/cmd.js:13140 and js/zap.js:1482
         * both guard on it and fall through); locations live on g.level. */
        const levtyp = g.level?.locations?.[u.ux]?.[u.uy]?.typ | 0;
        if (IS_FOUNTAIN(levtyp)) {
            pline_The("fountain is not deep enough to hide in.");
        } else {
            There("is no %s to hide in here.", hliquid("water"));
        }
        u.uundetected = 0;
        return ECMD_OK_local;
    }

    if (hides_under_fn(pd)) {
        let ct = 0;
        /* C polyself.c dohide: `otop = svl.level.objects[u.ux][u.uy]`.  The
         * per-tile nexthere chain head lives on `g.level.levelObjects` in this
         * port (js/game.js:70); `g.level.objects` has no writer anywhere, so
         * this read threw the moment dohide became reachable. */
        const otop = g.level?.levelObjects?.[u.ux]?.[u.uy] ?? null;

        if (!otop) {
            There("is nothing to hide under here.");
            u.uundetected = 0;
            return ECMD_OK_local;
        }
        let otmp = otop;
        while (otmp && otmp.otyp === CORPSE_local
               && touch_petrifies(permonstTemplate(otmp.corpsenm))) {
            ct += otmp.quan;
            otmp = otmp.nexthere;
        }
        /* otmp will be null iff the entire pile consists of 'trice corpses */
        if (!otmp && !Stone_resistance) {
            let corpse_name = cxname(otop);

            /* for the plural case, we'll say "cockatrice corpses" or
               "chickatrice corpses" depending on the top of the pile
               even if both types are present */
            if (ct === 1)
                corpse_name = an(corpse_name);
            /* no need to check poly_when_stoned(); no hide-underers can
               turn into stone golems instead of becoming petrified */
            pline("Hiding under %s%s is a fatal mistake...",
                  corpse_name, plur(ct));
            const kbuf = "hiding under " + corpse_name + plur(ct);
            await instapetrify(kbuf);
            /* only reach here if life-saved */
            u.uundetected = 0;
            return ECMD_TIME_local;
        }
    }

    /* Planes of Air and Water */
    if (on_ceiling && !has_ceiling_fn(u.uz)) {
        There("is nowhere to hide above you.");
        u.uundetected = 0;
        return ECMD_OK_local;
    }

    if ((is_hider_fn(pd) && !_Flying())
        && (Is_airlevel(u.uz) || Is_waterlevel(u.uz))) {
        There("is nowhere to hide beneath you.");
        u.uundetected = 0;
        return ECMD_OK_local;
    }

    if (u.uundetected || (ismimic && (g.youmonst.m_ap_type | 0) !== M_AP_NOTHING_local)) {
        youhiding(false, 1); /* "you are already hiding" */
        return ECMD_OK_local;
    }

    if (ismimic) {
        /* should bring up a dialog "what would you like to imitate?" */
        g.youmonst.m_ap_type = M_AP_OBJECT_local;
        g.youmonst.mappearance = STRANGE_OBJECT;
    } else {
        u.uundetected = 1;
    }
    newsym(u.ux, u.uy);
    youhiding(false, 0); /* "you are now hiding" */
    return ECMD_TIME_local;
}

// ── stubs for unported dohide helpers ──
function There(msg, ...args) {
    /* C pline.c:429 prefixes the formatted message with "There ". */
    return pline('There ' + msg, ...args);
}
async function instapetrify(kbuf) { return instapetrify_real(kbuf); }
// ── C insight.c:2027 youhiding(via_enlghtmt, msgflag) — the dohide() topline. ──
// C ref: nethack-c/src/insight.c:2027-2082.  RNG-free.
//
//   Strcpy(buf, "hiding");
//   if (U_AP_TYPE != M_AP_NOTHING) {          /* mimic */
//       bp = eos(strcpy(buf, "mimicking"));
//       if (U_AP_TYPE == M_AP_OBJECT)    Sprintf(bp, " %s",
//                          an(simple_typename(gy.youmonst.mappearance)));
//       else if (U_AP_TYPE == M_AP_FURNITURE) Strcpy(bp, " something");
//       else if (U_AP_TYPE == M_AP_MONSTER)   Strcpy(bp, " someone");
//   if (via_enlghtmt) you_are(buf, "");
//   else You("are %s %s.", msgflag ? "already" : "now", buf);
//
// mappearance == STRANGE_OBJECT: "You are now mimicking a strange object."
function youhiding(via_enlghtmt, msgflag) {
    const g = game;
    const u = g.u;
    let buf = 'hiding';
    const apType = (g.youmonst?.m_ap_type | 0);
    if (apType !== M_AP_NOTHING_local) {
        buf = 'mimicking';
        if (apType === M_AP_OBJECT_local)
            buf += ' ' + an(simple_typename(g.youmonst.mappearance | 0));
        else if (apType === M_AP_FURNITURE_local)
            buf += ' something';
        else if (apType === M_AP_MONSTER_local)
            buf += ' someone';
        /* else: something unexpected — C leaves 'buf' as "mimicking" */
    } else if (u.uundetected) {
        const data = g.youmonst?.data;
        if (data && (data.mlet | 0) === S_EEL) {
            if (is_pool(u.ux, u.uy))
                buf += ' in the ' + waterbody_name(u.ux, u.uy);
        } else if (data && _hides_under(data)) {
            const otmp = g.level?.levelObjects?.[u.ux]?.[u.uy] ?? null;
            if (otmp)
                buf += ' underneath ' + ansimpleoname(otmp);
        } else if (data && (((data.mflags1 | 0) & M1_CLING) !== 0
                            || (((u.uprops?.[FLYING]?.intrinsic | 0)
                                 || (u.uprops?.[FLYING]?.extrinsic | 0))
                                && !(u.uprops?.[FLYING]?.blocked | 0)))) {
            /* Flying forms hide on the ceiling even when they do not cling. */
            buf += ' on the ' + ceiling(u.ux, u.uy);
        } else if (u.utrap && (u.utraptype | 0) === TT_PIT) {
            const traps = g.level?.traps;
            const trap = Array.isArray(traps)
                ? traps.find(t => (t.tx | 0) === (u.ux | 0)
                              && (t.ty | 0) === (u.uy | 0)) : null;
            buf += ' in a ' + (trap && (trap.ttyp | 0) === 12 /* SPIKED_PIT */
                ? 'spiked ' : '') + 'pit';
        } else {
            buf += ' on the ' + surface(u.ux, u.uy);
        }
    }
    if (via_enlghtmt) {
        youhiding_enlightenment(true, msgflag);
        return;
    }
    /* js/display.js pline() commits the topline synchronously.  dohide() is
     * async only because its fatal corpse arm must await instapetrify(); the
     * ordinary hide message still lands before the command returns. */
    pline(`You are ${msgflag ? 'already' : 'now'} ${buf}.`);
}
function plur(x) { return (x === 1) ? "" : "s"; }

// ── C hack.c:624-742 still_chewing() — rock / wall / tree / door / secret door
// (the boulder arm lives in cmd.js _still_chewing_boulder; iron bars are not
// handled here).  Returns true while still eating, false when done.
export async function still_chewing(x, y) {
    const g = game;
    const u = g.u;
    const lev = g.level.at(x, y);
    const resetDig = () => {
        g.context.digging = { pos: { x: 0, y: 0 }, level: null, down: false,
            chew: false, warned: false, effort: 0 };
    };
    g.context = g.context || {};
    if (!g.context.digging) resetDig();
    const d = g.context.digging;
    if (d.down) { resetDig(); }
    const dg = g.context.digging;
    const obstructed = IS_OBSTRUCTED(lev.typ);
    if (obstructed && !may_dig_look(x, y)) {
        await pline('You hurt your teeth on the %s.'.replace('%s',
            IS_TREE(lev.typ) ? 'tree' : 'hard stone'));
        nomul(0);
        return true;
    }
    const what = IS_TREE(lev.typ) ? 'tree' : obstructed ? 'rock' : 'door';
    const udaminc = u.udaminc | 0;
    if (!dg.chew || dg.pos.x !== x || dg.pos.y !== y
        || !dg.level || dg.level.dnum !== u.uz.dnum || dg.level.dlevel !== u.uz.dlevel) {
        dg.down = false;
        dg.chew = true;
        dg.warned = false;
        dg.pos = { x, y };
        dg.level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
        dg.effort = (obstructed && !IS_TREE(lev.typ) ? 30 : 60) + udaminc;
        await pline(`You start chewing ${IS_TREE(lev.typ) ? 'on a' : 'a hole in the'} ${what}.`
            .replace('a hole in the tree', 'on a tree'));
        await watch_dig(null, x, y, false);
        return true;
    }
    dg.effort = (dg.effort | 0) + 30 + udaminc;
    if (dg.effort <= 100) {
        if (g.flags?.verbose !== false)
            await pline(`You ${dg.chew ? 'continue' : 'begin'} chewing on the ${what}.`);
        dg.chew = true;
        await watch_dig(null, x, y, false);
        return true;
    }
    // Okay, you've chewed through something
    if (!(u.uconduct.food | 0)) { /* livelog only */ }
    u.uconduct.food = (u.uconduct.food | 0) + 1;
    await morehungry(rnd(20));
    let digtxt = null, dmgtxt = null;
    if (IS_WALL(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE).length) {
            add_damage(x, y, 10 * Math.min(acurr(0), 125));
            dmgtxt = 'damage';
        }
        digtxt = 'chew a hole in the wall.';
        if (g.level.flags.is_maze_lev) {
            lev.typ = ROOM;
        } else if (g.level.flags.is_cavernous_lev && !cmdNS.in_town(x, y)) {
            lev.typ = CORR;
        } else {
            lev.typ = DOOR;
            lev.doormask = D_NODOOR;
        }
    } else if (IS_TREE(lev.typ)) {
        digtxt = 'chew through the tree.';
        lev.typ = ROOM;
    } else if (lev.typ === SDOOR) {
        if ((lev.doormask | 0) & D_TRAPPED) {
            lev.doormask = D_NODOOR;
            // b_trapped() (trap.c) is not exported by any js/ module yet.
        } else {
            digtxt = 'chew through the secret door.';
            lev.doormask = D_BROKEN;
        }
        lev.typ = DOOR;
    } else if (IS_DOOR(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE).length) {
            add_damage(x, y, SHOP_DOOR_COST);
            dmgtxt = 'break';
        }
        if ((lev.doormask | 0) & D_TRAPPED) {
            lev.doormask = D_NODOOR;
            // b_trapped() (trap.c) is not exported by any js/ module yet.
        } else {
            digtxt = 'chew through the door.';
            lev.doormask = D_BROKEN;
        }
    } else { /* STONE or SCORR */
        digtxt = 'chew a passage through the rock.';
        lev.typ = CORR;
    }
    recalc_block_point(x, y);
    newsym(x, y);
    if (digtxt) await pline(`You ${digtxt}`);
    if (dmgtxt) await pay_for_damage(dmgtxt, false);
    resetDig();
    return false;
}
