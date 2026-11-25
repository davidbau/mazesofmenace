// u_init.js — hero initialization.
// C ref: u_init.c
//
// Ported so far: u_init_misc(), u_init_inventory_attrs() with
// u_init_role(), u_init_race(), ini_inv() and its helpers, trquan(),
// knows_object(), knows_class(), skills_for_role(),
// restricted_spell_discipline(), u_init_carry_attr_boost().
// u_init_skills_discoveries() and pauper_reinit() are not ported yet.

import { spell_skilltype } from './spell.js';
import { game } from './gstate.js';
import { rn2, rnd, rn1, rne, ROLL_FROM } from './rng.js';
import { getnow } from './calendar.js';
import {
    NON_PM, LAST_PROP, MAXULEV, A_MAX, A_CURRENT, A_ORIGINAL, NO_SPELL,
    FROMOUTSIDE, BLINDED, RIGHT_HANDED, LEFT_HANDED, JUMPING, A_CHAOTIC,
    A_STR, A_CON,
} from './const.js';
import * as K from './const.js';
import { MAXSPELL, objects, OBJ_DESCR } from './objects.js';
import * as O from './objects.js';
import * as M from './monsters.js';
import { mksobj, mkobj, weight } from './mkobj.js';
import { aligns } from './role.js';
import { set_uasmon } from './polyself.js';
import { newhp, adjabil, adjattrib, init_attr, vary_init_attr } from './attrib.js';
import { newpw } from './exper.js';
import { initialspell, num_spells } from './spell.js';
import { skill_init } from './weapon.js';
import { discover_object } from './o_init.js';
import { Role_if, Race_if } from './const.js';
import { init_uhunger } from './eat.js';
import { inv_weight } from './hack.js';
import { max_rank_sz } from './botl.js';
import { assigninvlet, reorder_invent, merged, addinv } from './invent.js';
import { Japanese_item_name } from './objnam.js';
import { setworn } from './worn.js';

/* C ref: spell.h SPELL_LEV_PW() */
function SPELL_LEV_PW(lvl) { return (lvl) * 5; }
export { addinv }; // C ref: invent.c addinv() (ported in invent.js)

// C ref: you.h struct you -- the JS equivalent of memset(&u, 0, sizeof u).
// Every numeric field reads as 0, nested structs are zero-filled objects.
function zero_you() {
    const attribs = () => ({ a: new Array(A_MAX).fill(0) });
    const d_level = () => ({ dnum: 0, dlevel: 0 });
    return {
        ux: 0, uy: 0, dx: 0, dy: 0, dz: 0, tx: 0, ty: 0, ux0: 0, uy0: 0,
        uz: d_level(), uz0: d_level(), utolev: d_level(), utotype: 0,
        ucamefrom: d_level(), umoved: false, last_str_turn: 0,
        ulevel: 0, ulevelmax: 0, ulevelpeak: 0, utrap: 0, utraptype: 0,
        urooms: '', urooms0: '', uentered: '', ushops: '', ushops0: '',
        ushops_entered: '', ushops_left: '',
        uhunger: 0, uhs: 0,
        uprops: Array.from({ length: LAST_PROP + 1 },
                           () => ({ extrinsic: 0, intrinsic: 0, blocked: 0 })),
        umconf: 0, usick_type: 0,
        nv_range: 0, xray_range: 0, unblind_telepat_range: 0,
        bglyph: 0, cglyph: 0, bc_order: 0, bc_felt: 0,
        umonster: 0, umonnum: 0, mh: 0, mhmax: 0, mtimedone: 0,
        macurr: attribs(), mamax: attribs(), ulycn: 0,
        ucreamed: 0, uswldtim: 0, uswallow: 0, uinwater: 0, uundetected: 0,
        mfemale: 0, uinvulnerable: 0, uburied: 0, uedibility: 0,
        uhandedness: 0, udg_cnt: 0,
        uevent: {}, uhave: {},
        /* C ref: you.h struct u_conduct -- zeroed like the rest of u */
        uconduct: {
            unvegetarian: 0, unvegan: 0, food: 0, gnostic: 0, weaphit: 0,
            killer: 0, literate: 0, polypiles: 0, polyselfs: 0, wishes: 0,
            wisharti: 0, hf_reserved1: 0, sokocheat: 0, pets: 0,
            reserved1: 0, reserved2: 0, reserved3: 0, reserved4: 0,
        },
        uroleplay: {},
        acurr: attribs(), aexe: attribs(), abon: attribs(), amax: attribs(),
        atemp: attribs(), atime: attribs(),
        ualign: { type: 0, record: 0 }, ualignbase: [0, 0],
        uluck: 0, moreluck: 0, uhitinc: 0, udaminc: 0, uac: 0,
        uspellprot: 0, usptime: 0, uspmtime: 0,
        uhp: 0, uhpmax: 0, uhppeak: 0, uen: 0, uenmax: 0, uenpeak: 0,
        uhpinc: new Array(MAXULEV).fill(0), ueninc: new Array(MAXULEV).fill(0),
        ugangr: 0, ugifts: 0, ublessed: 0, ublesscnt: 0, umoney0: 0,
        uexp: 0, urexp: 0, ucleansed: 0, usleep: 0, uinvault: 0,
        ustuck: null, usteed: null, ustuck_mid: 0,
        umortality: 0, ugrave_arise: 0, umovement: 0, mcham: 0,
    };
}

// C ref: u_init.c u_init_misc()
export function u_init_misc() {
    const g = game;
    const flags = g.flags;
    let i;
    const tmpuroleplay = g.u?.uroleplay || {}; /* set by rcfile options */

    flags.female = flags.initgend;
    flags.beginner = true;

    /* zero u, including pointer values --
     * necessary when aborting from a failed restore */
    g.u = zero_you();
    const u = g.u;
    u.ustuck = null;
    g.ubirthday = 0; /* memset(&ubirthday, 0, ...) */
    g.urealtime = { realtime: 0, start_timing: 0, finish_time: 0 };

    u.uroleplay = tmpuroleplay; /* restore options set via rcfile */

    u.uz.dlevel = 1;
    u.uz0.dlevel = 0;
    u.utolev = { ...u.uz };

    u.umoved = false;
    u.umortality = 0;
    u.ugrave_arise = NON_PM;

    u.umonnum = u.umonster = g.urole.mnum;
    u.ulycn = NON_PM;
    set_uasmon();

    u.ulevel = 0; /* set up some of the initial attributes */
    u.uhp = u.uhpmax = u.uhppeak = newhp();
    u.uen = u.uenmax = u.uenpeak = newpw();
    u.uspellprot = 0;
    adjabil(0, 1);
    u.ulevel = u.ulevelmax = 1;

    init_uhunger();
    g.spl_book = [];
    for (i = 0; i <= MAXSPELL; i++)
        g.spl_book[i] = { sp_id: NO_SPELL, sp_lev: 0, sp_know: 0 };
    u.ublesscnt = 300; /* no prayers just yet */
    u.ualignbase[A_CURRENT] = u.ualignbase[A_ORIGINAL] = u.ualign.type =
        aligns[flags.initalign].value;

    /* Route through getnow() so fixed datetime also controls ubirthday. */
    /* ubirthday = getnow(); -- not modelled yet: C's getnow() is mktime()
       of the fixed datetime in the recorder's time zone, with the DST flag
       of the real clock at recording time; ubirthday stays 0 (and
       yyyymmdd(0) gives the fixed datetime's date, as C's would) */
    void getnow;

    /*
     *  For now, everyone starts out with a night vision range of 1 and
     *  their xray_range disabled.
     */
    u.nv_range = 1;
    u.xray_range = -1;
    u.unblind_telepat_range = -1;

    /* OPTIONS:blind results in permanent blindness (unless overridden
       by the Eyes of the Overworld, which will clear 'u.uroleplay.blind'
       to void the conduct, but will leave the PermaBlind bit set so that
       blindness resumes when the Eyes are removed). */
    if (u.uroleplay.blind)
        u.uprops[BLINDED].intrinsic |= FROMOUTSIDE; /* set PermaBlind */

    /* roughly based on distribution in human population */
    u.uhandedness = rn2(10) ? RIGHT_HANDED : LEFT_HANDED;

    max_rank_sz(); /* set max str size for class ranks */

    return;
}

// C ref: u_init.c UNDEF_TYP, UNDEF_SPE, UNDEF_BLESS
const UNDEF_TYP = 0;
const UNDEF_SPE = 127; /* '\177' */
const UNDEF_BLESS = 2;

/*
 *      Initial inventory for the various roles.
 */
// C ref: u_init.c Archeologist[] .. Money[], inv_subs[], Skill_A[] .. Skill_W[]
const Archeologist = [
    /* if adventure has a name...  idea from tan@uvm-gen */
    { trotyp: O.BULLWHIP, trspe: 2, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.LEATHER_JACKET, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.FEDORA, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.FOOD_RATION, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 3, trquan_max: 3, trbless: 0 },
    { trotyp: O.PICK_AXE, trspe: UNDEF_SPE, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.TINNING_KIT, trspe: UNDEF_SPE, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.TOUCHSTONE, trspe: 0, trclass: O.GEM_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: O.SACK, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Barbarian_0 = [
    { trotyp: O.TWO_HANDED_SWORD, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.AXE, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.RING_MAIL, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.FOOD_RATION, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Barbarian_1 = [
    { trotyp: O.BATTLE_AXE, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.SHORT_SWORD, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.RING_MAIL, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.FOOD_RATION, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Cave_man = [
    { trotyp: O.CLUB, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.SLING, trspe: 2, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.FLINT, trspe: 0, trclass: O.GEM_CLASS, trquan_min: 10, trquan_max: 20, trbless: UNDEF_BLESS },
    { trotyp: O.ROCK, trspe: 0, trclass: O.GEM_CLASS, trquan_min: 3, trquan_max: 3, trbless: 0 }, /* yields 18..33 */
    { trotyp: O.LEATHER_ARMOR, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Healer = [
    { trotyp: O.SCALPEL, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.LEATHER_GLOVES, trspe: 1, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.STETHOSCOPE, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: O.POT_HEALING, trspe: 0, trclass: O.POTION_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: O.POT_EXTRA_HEALING, trspe: 0, trclass: O.POTION_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: O.WAN_SLEEP, trspe: UNDEF_SPE, trclass: O.WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    /* always blessed, so it's guaranteed readable */
    { trotyp: O.SPE_HEALING, trspe: 0, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: O.SPE_EXTRA_HEALING, trspe: 0, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: O.SPE_STONE_TO_FLESH, trspe: 0, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: O.APPLE, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 5, trquan_max: 5, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Knight = [
    { trotyp: O.LONG_SWORD, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.LANCE, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.RING_MAIL, trspe: 1, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.HELMET, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.SMALL_SHIELD, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.LEATHER_GLOVES, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.APPLE, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: O.CARROT, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Monk = [
    { trotyp: O.LEATHER_GLOVES, trspe: 2, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.ROBE, trspe: 1, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.SCROLL_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.POT_HEALING, trspe: 0, trclass: O.POTION_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: O.FOOD_RATION, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 3, trquan_max: 3, trbless: 0 },
    { trotyp: O.APPLE, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 5, trquan_max: 5, trbless: UNDEF_BLESS },
    { trotyp: O.ORANGE, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 5, trquan_max: 5, trbless: UNDEF_BLESS },
    { trotyp: O.FORTUNE_COOKIE, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Priest = [
    { trotyp: O.MACE, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: O.ROBE, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.SMALL_SHIELD, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.POT_WATER, trspe: 0, trclass: O.POTION_CLASS, trquan_min: 4, trquan_max: 4, trbless: 1 }, /* holy water */
    { trotyp: O.CLOVE_OF_GARLIC, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: O.SPRIG_OF_WOLFSBANE, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.SPBOOK_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Ranger = [
    { trotyp: O.DAGGER, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.BOW, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.ARROW, trspe: 2, trclass: O.WEAPON_CLASS, trquan_min: 50, trquan_max: 59, trbless: UNDEF_BLESS },
    { trotyp: O.ARROW, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 30, trquan_max: 39, trbless: UNDEF_BLESS },
    { trotyp: O.CLOAK_OF_DISPLACEMENT, trspe: 2, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.CRAM_RATION, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 4, trquan_max: 4, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Rogue = [
    { trotyp: O.SHORT_SWORD, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.DAGGER, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 6, trquan_max: 15, trbless: 0 },
    { trotyp: O.LEATHER_ARMOR, trspe: 1, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.POT_SICKNESS, trspe: 0, trclass: O.POTION_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: O.LOCK_PICK, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: O.SACK, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Samurai = [
    { trotyp: O.KATANA, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.SHORT_SWORD, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS }, /* wakizashi */
    { trotyp: O.YUMI, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.YA, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 26, trquan_max: 45, trbless: UNDEF_BLESS },
    { trotyp: O.SPLINT_MAIL, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Tourist = [
    { trotyp: O.DART, trspe: 2, trclass: O.WEAPON_CLASS, trquan_min: 21, trquan_max: 40, trbless: UNDEF_BLESS },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.FOOD_CLASS, trquan_min: 10, trquan_max: 10, trbless: 0 },
    { trotyp: O.POT_EXTRA_HEALING, trspe: 0, trclass: O.POTION_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: O.SCR_MAGIC_MAPPING, trspe: 0, trclass: O.SCROLL_CLASS, trquan_min: 4, trquan_max: 4, trbless: UNDEF_BLESS },
    { trotyp: O.HAWAIIAN_SHIRT, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.EXPENSIVE_CAMERA, trspe: UNDEF_SPE, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: O.CREDIT_CARD, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Valkyrie = [
    { trotyp: O.SPEAR, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.DAGGER, trspe: 0, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.SMALL_SHIELD, trspe: 3, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.FOOD_RATION, trspe: 0, trclass: O.FOOD_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Wizard = [
    { trotyp: O.QUARTERSTAFF, trspe: 1, trclass: O.WEAPON_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: O.CLOAK_OF_MAGIC_RESISTANCE, trspe: 0, trclass: O.ARMOR_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.RING_CLASS, trquan_min: 2, trquan_max: 2, trbless: UNDEF_BLESS },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.POTION_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.SCROLL_CLASS, trquan_min: 3, trquan_max: 3, trbless: UNDEF_BLESS },
    { trotyp: O.SPE_FORCE_BOLT, trspe: 0, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: UNDEF_BLESS },
    { trotyp: O.MAGIC_MARKER, trspe: 19, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 }, /* actually spe = 18 + d4 */
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
/*
 *      Optional extra inventory items.
 */
const Healing_book = [
    { trotyp: O.SPE_HEALING, trspe: UNDEF_SPE, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Protection_book = [
    { trotyp: O.SPE_PROTECTION, trspe: UNDEF_SPE, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Confuse_monster_book = [
    { trotyp: O.SPE_CONFUSE_MONSTER, trspe: UNDEF_SPE, trclass: O.SPBOOK_CLASS, trquan_min: 1, trquan_max: 1, trbless: 1 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Tinopener = [
    { trotyp: O.TIN_OPENER, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Magicmarker = [
    { trotyp: O.MAGIC_MARKER, trspe: 19, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Lamp = [
    { trotyp: O.OIL_LAMP, trspe: 1, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Blindfold = [
    { trotyp: O.BLINDFOLD, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Xtra_food = [
    { trotyp: UNDEF_TYP, trspe: UNDEF_SPE, trclass: O.FOOD_CLASS, trquan_min: 2, trquan_max: 2, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Leash = [
    { trotyp: O.LEASH, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Towel = [
    { trotyp: O.TOWEL, trspe: 0, trclass: O.TOOL_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Wishing = [
    { trotyp: O.WAN_WISHING, trspe: 3, trclass: O.WAND_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
const Money = [
    { trotyp: O.GOLD_PIECE, trspe: 0, trclass: O.COIN_CLASS, trquan_min: 1, trquan_max: 1, trbless: 0 },
    { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0, trquan_max: 0, trbless: 0 },
];
/* race-based substitutions for initial inventory;
   the weaker cloak for elven rangers is intentional--they shoot better */
const inv_subs = [
    { race_pm: M.PM_ELF, item_otyp: O.DAGGER, subs_otyp: O.ELVEN_DAGGER },
    { race_pm: M.PM_ELF, item_otyp: O.SPEAR, subs_otyp: O.ELVEN_SPEAR },
    { race_pm: M.PM_ELF, item_otyp: O.SHORT_SWORD, subs_otyp: O.ELVEN_SHORT_SWORD },
    { race_pm: M.PM_ELF, item_otyp: O.BOW, subs_otyp: O.ELVEN_BOW },
    { race_pm: M.PM_ELF, item_otyp: O.ARROW, subs_otyp: O.ELVEN_ARROW },
    { race_pm: M.PM_ELF, item_otyp: O.HELMET, subs_otyp: O.ELVEN_LEATHER_HELM },
    /* { PM_ELF, SMALL_SHIELD, ELVEN_SHIELD }, */
    { race_pm: M.PM_ELF, item_otyp: O.CLOAK_OF_DISPLACEMENT, subs_otyp: O.ELVEN_CLOAK },
    { race_pm: M.PM_ELF, item_otyp: O.CRAM_RATION, subs_otyp: O.LEMBAS_WAFER },
    { race_pm: M.PM_ORC, item_otyp: O.DAGGER, subs_otyp: O.ORCISH_DAGGER },
    { race_pm: M.PM_ORC, item_otyp: O.SPEAR, subs_otyp: O.ORCISH_SPEAR },
    { race_pm: M.PM_ORC, item_otyp: O.SHORT_SWORD, subs_otyp: O.ORCISH_SHORT_SWORD },
    { race_pm: M.PM_ORC, item_otyp: O.BOW, subs_otyp: O.ORCISH_BOW },
    { race_pm: M.PM_ORC, item_otyp: O.ARROW, subs_otyp: O.ORCISH_ARROW },
    { race_pm: M.PM_ORC, item_otyp: O.HELMET, subs_otyp: O.ORCISH_HELM },
    { race_pm: M.PM_ORC, item_otyp: O.SMALL_SHIELD, subs_otyp: O.ORCISH_SHIELD },
    { race_pm: M.PM_ORC, item_otyp: O.RING_MAIL, subs_otyp: O.ORCISH_RING_MAIL },
    { race_pm: M.PM_ORC, item_otyp: O.CHAIN_MAIL, subs_otyp: O.ORCISH_CHAIN_MAIL },
    { race_pm: M.PM_ORC, item_otyp: O.CRAM_RATION, subs_otyp: O.TRIPE_RATION },
    { race_pm: M.PM_ORC, item_otyp: O.LEMBAS_WAFER, subs_otyp: O.TRIPE_RATION },
    { race_pm: M.PM_DWARF, item_otyp: O.SPEAR, subs_otyp: O.DWARVISH_SPEAR },
    { race_pm: M.PM_DWARF, item_otyp: O.SHORT_SWORD, subs_otyp: O.DWARVISH_SHORT_SWORD },
    { race_pm: M.PM_DWARF, item_otyp: O.HELMET, subs_otyp: O.DWARVISH_IRON_HELM },
    /* { PM_DWARF, SMALL_SHIELD, DWARVISH_ROUNDSHIELD }, */
    /* { PM_DWARF, PICK_AXE, DWARVISH_MATTOCK }, */
    { race_pm: M.PM_DWARF, item_otyp: O.LEMBAS_WAFER, subs_otyp: O.CRAM_RATION },
    { race_pm: M.PM_GNOME, item_otyp: O.BOW, subs_otyp: O.CROSSBOW },
    { race_pm: M.PM_GNOME, item_otyp: O.ARROW, subs_otyp: O.CROSSBOW_BOLT },
    { race_pm: NON_PM, item_otyp: O.STRANGE_OBJECT, subs_otyp: O.STRANGE_OBJECT },
];
const Skill_A = [
    { skill: K.P_DAGGER, skmax: K.P_BASIC },
    { skill: K.P_KNIFE, skmax: K.P_BASIC },
    { skill: K.P_PICK_AXE, skmax: K.P_EXPERT },
    { skill: K.P_SHORT_SWORD, skmax: K.P_BASIC },
    { skill: K.P_SABER, skmax: K.P_EXPERT },
    { skill: K.P_CLUB, skmax: K.P_SKILLED },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_SKILLED },
    { skill: K.P_SLING, skmax: K.P_SKILLED },
    { skill: K.P_DART, skmax: K.P_BASIC },
    { skill: K.P_BOOMERANG, skmax: K.P_EXPERT },
    { skill: K.P_WHIP, skmax: K.P_EXPERT },
    { skill: K.P_UNICORN_HORN, skmax: K.P_SKILLED },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_BASIC },
    { skill: K.P_HEALING_SPELL, skmax: K.P_BASIC },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_MATTER_SPELL, skmax: K.P_BASIC },
    { skill: K.P_RIDING, skmax: K.P_BASIC },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_BASIC },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_EXPERT },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_B = [
    { skill: K.P_DAGGER, skmax: K.P_BASIC },
    { skill: K.P_AXE, skmax: K.P_EXPERT },
    { skill: K.P_PICK_AXE, skmax: K.P_SKILLED },
    { skill: K.P_SHORT_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_BROAD_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_LONG_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_TWO_HANDED_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_SABER, skmax: K.P_SKILLED },
    { skill: K.P_CLUB, skmax: K.P_SKILLED },
    { skill: K.P_MACE, skmax: K.P_SKILLED },
    { skill: K.P_MORNING_STAR, skmax: K.P_SKILLED },
    { skill: K.P_FLAIL, skmax: K.P_BASIC },
    { skill: K.P_HAMMER, skmax: K.P_EXPERT },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_BASIC },
    { skill: K.P_SPEAR, skmax: K.P_SKILLED },
    { skill: K.P_TRIDENT, skmax: K.P_SKILLED },
    { skill: K.P_BOW, skmax: K.P_BASIC },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_BASIC },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_BASIC }, /* special spell is haste self */
    { skill: K.P_RIDING, skmax: K.P_BASIC },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_BASIC },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_MASTER },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_C = [
    { skill: K.P_DAGGER, skmax: K.P_BASIC },
    { skill: K.P_KNIFE, skmax: K.P_SKILLED },
    { skill: K.P_AXE, skmax: K.P_SKILLED },
    { skill: K.P_PICK_AXE, skmax: K.P_BASIC },
    { skill: K.P_CLUB, skmax: K.P_EXPERT },
    { skill: K.P_MACE, skmax: K.P_EXPERT },
    { skill: K.P_MORNING_STAR, skmax: K.P_BASIC },
    { skill: K.P_FLAIL, skmax: K.P_SKILLED },
    { skill: K.P_HAMMER, skmax: K.P_SKILLED },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_EXPERT },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_EXPERT },
    { skill: K.P_TRIDENT, skmax: K.P_SKILLED },
    { skill: K.P_BOW, skmax: K.P_SKILLED },
    { skill: K.P_SLING, skmax: K.P_EXPERT },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_BASIC },
    { skill: K.P_MATTER_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_BOOMERANG, skmax: K.P_EXPERT },
    { skill: K.P_UNICORN_HORN, skmax: K.P_BASIC },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_MASTER },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_H = [
    { skill: K.P_DAGGER, skmax: K.P_SKILLED },
    { skill: K.P_KNIFE, skmax: K.P_EXPERT },
    { skill: K.P_SHORT_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_SABER, skmax: K.P_BASIC },
    { skill: K.P_CLUB, skmax: K.P_SKILLED },
    { skill: K.P_MACE, skmax: K.P_BASIC },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_EXPERT },
    { skill: K.P_POLEARMS, skmax: K.P_BASIC },
    { skill: K.P_SPEAR, skmax: K.P_BASIC },
    { skill: K.P_TRIDENT, skmax: K.P_BASIC },
    { skill: K.P_SLING, skmax: K.P_SKILLED },
    { skill: K.P_DART, skmax: K.P_EXPERT },
    { skill: K.P_SHURIKEN, skmax: K.P_SKILLED },
    { skill: K.P_UNICORN_HORN, skmax: K.P_EXPERT },
    { skill: K.P_HEALING_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_BASIC },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_K = [
    { skill: K.P_DAGGER, skmax: K.P_BASIC },
    { skill: K.P_KNIFE, skmax: K.P_BASIC },
    { skill: K.P_AXE, skmax: K.P_SKILLED },
    { skill: K.P_PICK_AXE, skmax: K.P_BASIC },
    { skill: K.P_SHORT_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_BROAD_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_LONG_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_TWO_HANDED_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_SABER, skmax: K.P_SKILLED },
    { skill: K.P_CLUB, skmax: K.P_BASIC },
    { skill: K.P_MACE, skmax: K.P_SKILLED },
    { skill: K.P_MORNING_STAR, skmax: K.P_SKILLED },
    { skill: K.P_FLAIL, skmax: K.P_BASIC },
    { skill: K.P_HAMMER, skmax: K.P_BASIC },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_SKILLED },
    { skill: K.P_TRIDENT, skmax: K.P_BASIC },
    { skill: K.P_LANCE, skmax: K.P_EXPERT },
    { skill: K.P_BOW, skmax: K.P_BASIC },
    { skill: K.P_CROSSBOW, skmax: K.P_SKILLED },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_HEALING_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_CLERIC_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_RIDING, skmax: K.P_EXPERT },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_SKILLED },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_EXPERT },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_Mon = [
    { skill: K.P_QUARTERSTAFF, skmax: K.P_BASIC },
    { skill: K.P_SPEAR, skmax: K.P_BASIC },
    { skill: K.P_CROSSBOW, skmax: K.P_BASIC },
    { skill: K.P_SHURIKEN, skmax: K.P_BASIC },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_BASIC },
    { skill: K.P_HEALING_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_BASIC },
    { skill: K.P_ENCHANTMENT_SPELL, skmax: K.P_BASIC },
    { skill: K.P_CLERIC_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_MATTER_SPELL, skmax: K.P_BASIC },
    { skill: K.P_MARTIAL_ARTS, skmax: K.P_GRAND_MASTER },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_P = [
    { skill: K.P_CLUB, skmax: K.P_EXPERT },
    { skill: K.P_MACE, skmax: K.P_EXPERT },
    { skill: K.P_MORNING_STAR, skmax: K.P_EXPERT },
    { skill: K.P_FLAIL, skmax: K.P_EXPERT },
    { skill: K.P_HAMMER, skmax: K.P_EXPERT },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_EXPERT },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_SKILLED },
    { skill: K.P_TRIDENT, skmax: K.P_SKILLED },
    { skill: K.P_LANCE, skmax: K.P_BASIC },
    { skill: K.P_BOW, skmax: K.P_BASIC },
    { skill: K.P_SLING, skmax: K.P_BASIC },
    { skill: K.P_CROSSBOW, skmax: K.P_BASIC },
    { skill: K.P_DART, skmax: K.P_BASIC },
    { skill: K.P_SHURIKEN, skmax: K.P_BASIC },
    { skill: K.P_BOOMERANG, skmax: K.P_BASIC },
    { skill: K.P_UNICORN_HORN, skmax: K.P_SKILLED },
    { skill: K.P_HEALING_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_CLERIC_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_BASIC },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_R = [
    { skill: K.P_DAGGER, skmax: K.P_EXPERT },
    { skill: K.P_KNIFE, skmax: K.P_EXPERT },
    { skill: K.P_SHORT_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_BROAD_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_LONG_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_TWO_HANDED_SWORD, skmax: K.P_BASIC },
    { skill: K.P_SABER, skmax: K.P_SKILLED },
    { skill: K.P_CLUB, skmax: K.P_SKILLED },
    { skill: K.P_MACE, skmax: K.P_SKILLED },
    { skill: K.P_MORNING_STAR, skmax: K.P_BASIC },
    { skill: K.P_FLAIL, skmax: K.P_BASIC },
    { skill: K.P_HAMMER, skmax: K.P_BASIC },
    { skill: K.P_POLEARMS, skmax: K.P_BASIC },
    { skill: K.P_SPEAR, skmax: K.P_BASIC },
    { skill: K.P_CROSSBOW, skmax: K.P_EXPERT },
    { skill: K.P_DART, skmax: K.P_EXPERT },
    { skill: K.P_SHURIKEN, skmax: K.P_SKILLED },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_MATTER_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_RIDING, skmax: K.P_BASIC },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_EXPERT },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_EXPERT },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_Ran = [
    { skill: K.P_DAGGER, skmax: K.P_EXPERT },
    { skill: K.P_KNIFE, skmax: K.P_SKILLED },
    { skill: K.P_AXE, skmax: K.P_SKILLED },
    { skill: K.P_PICK_AXE, skmax: K.P_BASIC },
    { skill: K.P_SHORT_SWORD, skmax: K.P_BASIC },
    { skill: K.P_MORNING_STAR, skmax: K.P_BASIC },
    { skill: K.P_FLAIL, skmax: K.P_SKILLED },
    { skill: K.P_HAMMER, skmax: K.P_BASIC },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_BASIC },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_EXPERT },
    { skill: K.P_TRIDENT, skmax: K.P_BASIC },
    { skill: K.P_BOW, skmax: K.P_EXPERT },
    { skill: K.P_SLING, skmax: K.P_EXPERT },
    { skill: K.P_CROSSBOW, skmax: K.P_EXPERT },
    { skill: K.P_DART, skmax: K.P_EXPERT },
    { skill: K.P_SHURIKEN, skmax: K.P_SKILLED },
    { skill: K.P_BOOMERANG, skmax: K.P_EXPERT },
    { skill: K.P_WHIP, skmax: K.P_BASIC },
    { skill: K.P_HEALING_SPELL, skmax: K.P_BASIC },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_BASIC },
    { skill: K.P_RIDING, skmax: K.P_BASIC },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_BASIC },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_S = [
    { skill: K.P_DAGGER, skmax: K.P_BASIC },
    { skill: K.P_KNIFE, skmax: K.P_SKILLED },
    { skill: K.P_SHORT_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_BROAD_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_LONG_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_TWO_HANDED_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_SABER, skmax: K.P_BASIC },
    { skill: K.P_FLAIL, skmax: K.P_SKILLED },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_BASIC },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_SKILLED },
    { skill: K.P_LANCE, skmax: K.P_SKILLED },
    { skill: K.P_BOW, skmax: K.P_EXPERT },
    { skill: K.P_SHURIKEN, skmax: K.P_EXPERT },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_BASIC },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_BASIC }, /* special spell is clairvoyance */
    { skill: K.P_CLERIC_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_RIDING, skmax: K.P_SKILLED },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_EXPERT },
    { skill: K.P_MARTIAL_ARTS, skmax: K.P_MASTER },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_T = [
    { skill: K.P_DAGGER, skmax: K.P_EXPERT },
    { skill: K.P_KNIFE, skmax: K.P_SKILLED },
    { skill: K.P_AXE, skmax: K.P_BASIC },
    { skill: K.P_PICK_AXE, skmax: K.P_BASIC },
    { skill: K.P_SHORT_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_BROAD_SWORD, skmax: K.P_BASIC },
    { skill: K.P_LONG_SWORD, skmax: K.P_BASIC },
    { skill: K.P_TWO_HANDED_SWORD, skmax: K.P_BASIC },
    { skill: K.P_SABER, skmax: K.P_SKILLED },
    { skill: K.P_MACE, skmax: K.P_BASIC },
    { skill: K.P_MORNING_STAR, skmax: K.P_BASIC },
    { skill: K.P_FLAIL, skmax: K.P_BASIC },
    { skill: K.P_HAMMER, skmax: K.P_BASIC },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_BASIC },
    { skill: K.P_POLEARMS, skmax: K.P_BASIC },
    { skill: K.P_SPEAR, skmax: K.P_BASIC },
    { skill: K.P_TRIDENT, skmax: K.P_BASIC },
    { skill: K.P_LANCE, skmax: K.P_BASIC },
    { skill: K.P_BOW, skmax: K.P_BASIC },
    { skill: K.P_SLING, skmax: K.P_BASIC },
    { skill: K.P_CROSSBOW, skmax: K.P_BASIC },
    { skill: K.P_DART, skmax: K.P_EXPERT },
    { skill: K.P_SHURIKEN, skmax: K.P_BASIC },
    { skill: K.P_BOOMERANG, skmax: K.P_BASIC },
    { skill: K.P_WHIP, skmax: K.P_BASIC },
    { skill: K.P_UNICORN_HORN, skmax: K.P_SKILLED },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_BASIC },
    { skill: K.P_ENCHANTMENT_SPELL, skmax: K.P_BASIC },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_RIDING, skmax: K.P_BASIC },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_SKILLED },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_SKILLED },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_V = [
    { skill: K.P_DAGGER, skmax: K.P_EXPERT },
    { skill: K.P_AXE, skmax: K.P_EXPERT },
    { skill: K.P_PICK_AXE, skmax: K.P_SKILLED },
    { skill: K.P_SHORT_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_BROAD_SWORD, skmax: K.P_SKILLED },
    { skill: K.P_LONG_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_TWO_HANDED_SWORD, skmax: K.P_EXPERT },
    { skill: K.P_SABER, skmax: K.P_BASIC },
    { skill: K.P_HAMMER, skmax: K.P_EXPERT },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_BASIC },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_EXPERT },
    { skill: K.P_TRIDENT, skmax: K.P_BASIC },
    { skill: K.P_LANCE, skmax: K.P_SKILLED },
    { skill: K.P_SLING, skmax: K.P_BASIC },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_BASIC },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_BASIC },
    { skill: K.P_RIDING, skmax: K.P_SKILLED },
    { skill: K.P_TWO_WEAPON_COMBAT, skmax: K.P_SKILLED },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_EXPERT },
    { skill: K.P_NONE, skmax: 0 },
];
const Skill_W = [
    { skill: K.P_DAGGER, skmax: K.P_EXPERT },
    { skill: K.P_KNIFE, skmax: K.P_SKILLED },
    { skill: K.P_AXE, skmax: K.P_SKILLED },
    { skill: K.P_SHORT_SWORD, skmax: K.P_BASIC },
    { skill: K.P_CLUB, skmax: K.P_SKILLED },
    { skill: K.P_MACE, skmax: K.P_BASIC },
    { skill: K.P_QUARTERSTAFF, skmax: K.P_EXPERT },
    { skill: K.P_POLEARMS, skmax: K.P_SKILLED },
    { skill: K.P_SPEAR, skmax: K.P_BASIC },
    { skill: K.P_TRIDENT, skmax: K.P_BASIC },
    { skill: K.P_SLING, skmax: K.P_SKILLED },
    { skill: K.P_DART, skmax: K.P_EXPERT },
    { skill: K.P_SHURIKEN, skmax: K.P_BASIC },
    { skill: K.P_ATTACK_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_HEALING_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_DIVINATION_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_ENCHANTMENT_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_CLERIC_SPELL, skmax: K.P_SKILLED },
    { skill: K.P_ESCAPE_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_MATTER_SPELL, skmax: K.P_EXPERT },
    { skill: K.P_RIDING, skmax: K.P_BASIC },
    { skill: K.P_BARE_HANDED_COMBAT, skmax: K.P_BASIC },
    { skill: K.P_NONE, skmax: 0 },
];

// C ref: role.c Role_if(), Race_if(); you.h Role_switch, Race_switch

// C ref: obj.h is_pole(), is_spear(), is_launcher(), is_ammo(),
// Is_container(), is_graystone()
function is_pole(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.TOOL_CLASS)
            && (objects[otmp.otyp].oc_skill === K.P_POLEARMS
                || objects[otmp.otyp].oc_skill === K.P_LANCE
                /* || is_art(otmp, ART_SNICKERSNEE): never for odummy */));
}
function is_spear(otmp) {
    return (otmp.oclass === O.WEAPON_CLASS
            && objects[otmp.otyp].oc_skill === K.P_SPEAR);
}
function is_launcher(otmp) {
    return (otmp.oclass === O.WEAPON_CLASS
            && objects[otmp.otyp].oc_skill >= K.P_BOW
            && objects[otmp.otyp].oc_skill <= K.P_CROSSBOW);
}
function is_ammo(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.GEM_CLASS)
            && objects[otmp.otyp].oc_skill >= -K.P_CROSSBOW
            && objects[otmp.otyp].oc_skill <= -K.P_BOW);
}
function Is_container(o) { return o.otyp >= O.LARGE_BOX && o.otyp <= O.BAG_OF_TRICKS; }
function is_graystone(obj) {
    return (obj.otyp === O.LUCKSTONE || obj.otyp === O.LOADSTONE
            || obj.otyp === O.FLINT || obj.otyp === O.TOUCHSTONE);
}

// C ref: invent.c useupall() -- inventory removal only
function useupall(obj) {
    let prev = null;
    for (let o = game.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj;
            else game.invent = o.nobj;
            break;
        }
    }
    obj.where = 'OBJ_FREE';
}


// C ref: mkobj.c dealloc_obj() -- nothing to free in JS
function dealloc_obj(obj) { /* garbage collected */ }

// C ref: u_init.c knows_object()
function knows_object(obj, override_pauper) {
    if (game.u.uroleplay.pauper && !override_pauper)
        return;
    /* mark as known, but not yet encountered */
    discover_object(obj, true, false, false);
}

// C ref: u_init.c knows_class()
/* Know ordinary (non-magical) objects of a certain class,
   like all gems except the loadstone and luckstone. */
function knows_class(sym) {
    let ct;

    if (game.u.uroleplay.pauper)
        return;

    const odummy = { oclass: sym, otyp: 0 }; /* cg.zeroobj */
    const o = odummy; /* for use in various obj.h macros */

    for (ct = game.bases[sym]; ct < game.bases[sym + 1]; ct++) {
        /* not flagged as magic but shouldn't be pre-discovered
           (small shields look the same as two types of magical shield;
           cornuthaum / dunce cap look the same as each other) */
        if (ct === O.CORNUTHAUM || ct === O.DUNCE_CAP || ct === O.SMALL_SHIELD)
            continue;
        if (sym === O.WEAPON_CLASS) {
            odummy.otyp = ct; /* update 'o' */
            /* arbitrary: only knights and samurai recognize polearms */
            if ((!Role_if(M.PM_KNIGHT) && !Role_if(M.PM_SAMURAI)) && is_pole(o))
                continue;
            /* rangers know all launchers (bows, &c), ammo (arrows, &c),
               and spears regardless of race/species, but not other weapons */
            if (Role_if(M.PM_RANGER)
                && (!is_launcher(o) && !is_ammo(o) && !is_spear(o)))
                continue;
            /* rogues know daggers, regardless of racial variations */
            if (Role_if(M.PM_ROGUE) && (objects[o.otyp].oc_skill !== K.P_DAGGER))
                continue;
        }

        if (objects[ct].oc_class === sym && !objects[ct].oc_magic)
            knows_object(ct, false);
    }
}

// C ref: u_init.c u_init_role()
/* role-specific initializations, mostly inventory */
async function u_init_role() {
    const g = game;
    const u = g.u;

    /* the program used to check moves<=1 && invent==NULL do decide whether
       a new game has started, but due to the 'pauper' option/conduct, can't
       rely on invent becoming non-Null anymore; instead, initialize moves
       to 0 instead of 1, then set it to 1 here, where invent init occurs */
    g.moves = 1;

    switch (g.urole.mnum) {
    /* rn2(100) > 50 necessary for some choices because some
     * random number generators are bad enough to seriously
     * skew the results if we use rn2(2)...  --KAA
     */
    case M.PM_ARCHEOLOGIST:
        await ini_inv(Archeologist);
        if (!rn2(10))
            await ini_inv(Tinopener);
        else if (!rn2(4))
            await ini_inv(Lamp);
        else if (!rn2(5))
            await ini_inv(Magicmarker);
        knows_object(O.SACK, false);
        knows_object(O.TOUCHSTONE, false); /* FALSE: don't override pauper
                                            * here, but TOUCHSTONE will be
                                            * made known in pauper_reinit() */
        break;
    case M.PM_BARBARIAN:
        if (rn2(100) >= 50) { /* see above comment */
            await ini_inv(Barbarian_0);
        } else {
            await ini_inv(Barbarian_1);
        }
        if (!rn2(6))
            await ini_inv(Lamp);
        knows_class(O.WEAPON_CLASS); /* excluding polearms */
        knows_class(O.ARMOR_CLASS);
        break;
    case M.PM_CAVE_DWELLER:
        await ini_inv(Cave_man);
        break;
    case M.PM_HEALER:
        u.umoney0 = rn1(1000, 1001);
        await ini_inv(Healer);
        if (!rn2(25))
            await ini_inv(Lamp);
        knows_object(O.POT_FULL_HEALING, false);
        break;
    case M.PM_KNIGHT:
        await ini_inv(Knight);
        knows_class(O.WEAPON_CLASS); /* all weapons */
        knows_class(O.ARMOR_CLASS);
        /* give knights chess-like mobility--idea from wooledge@..cwru.edu */
        u.uprops[JUMPING].intrinsic |= FROMOUTSIDE; /* HJumping */
        break;
    case M.PM_MONK: {
        const M_spell = [
            Healing_book, Protection_book, Confuse_monster_book
        ];

        await ini_inv(Monk);
        await ini_inv(M_spell[Math.trunc(rn2(90) / 30)]); /* [0..2] */
        if (!rn2(4))
            await ini_inv(Magicmarker);
        else if (!rn2(10))
            await ini_inv(Lamp);
        knows_class(O.ARMOR_CLASS);
        /* sufficiently martial-arts oriented item to ignore language issue */
        knows_object(O.SHURIKEN, false);
        break;
    }
    case M.PM_CLERIC: /* priest/priestess */
        await ini_inv(Priest);
        if (!rn2(5))
            await ini_inv(Magicmarker);
        else if (!rn2(10))
            await ini_inv(Lamp);
        knows_object(O.POT_WATER, true); /* override pauper */
        break;
    case M.PM_RANGER:
        await ini_inv(Ranger);
        knows_class(O.WEAPON_CLASS); /* bows, arrows, spears only */
        break;
    case M.PM_ROGUE:
        u.umoney0 = 0;
        await ini_inv(Rogue);
        if (!rn2(5))
            await ini_inv(Blindfold);
        knows_object(O.SACK, false); /* FALSE: don't override pauper here,
                                      * but sack will be made known in
                                      * pauper_reinit() */
        knows_class(O.WEAPON_CLASS); /* daggers only */
        break;
    case M.PM_SAMURAI:
        await ini_inv(Samurai);
        if (!rn2(5))
            await ini_inv(Blindfold);
        knows_class(O.WEAPON_CLASS); /* all weapons */
        knows_class(O.ARMOR_CLASS);
        /* in order to assist non-Japanese speakers, pre-discover items
           that switch to Japanese names when playing as a Samurai */
        for (let i = O.MAXOCLASSES; i < O.NUM_OBJECTS; ++i) {
            if (objects[i].oc_magic) /* skip "magic koto" */
                continue;
            if (Japanese_item_name(i, null))
                /* we don't override pauper here because that would give
                   samarai an advantage of knowing several items in advance */
                knows_object(i, false);
        }
        break;
    case M.PM_TOURIST:
        u.umoney0 = rnd(1000);
        await ini_inv(Tourist);
        if (!rn2(25))
            await ini_inv(Tinopener);
        else if (!rn2(25))
            await ini_inv(Leash);
        else if (!rn2(25))
            await ini_inv(Towel);
        else if (!rn2(20))
            await ini_inv(Magicmarker);
        break;
    case M.PM_VALKYRIE:
        await ini_inv(Valkyrie);
        if (!rn2(6))
            await ini_inv(Lamp);
        knows_class(O.WEAPON_CLASS); /* excludes polearms */
        knows_class(O.ARMOR_CLASS);
        break;
    case M.PM_WIZARD:
        await ini_inv(Wizard);
        if (!rn2(5))
            await ini_inv(Blindfold);
        break;

    default: /* impossible */
        break;
    }

    g.nocreate = O.STRANGE_OBJECT;
    g.nocreate2 = O.STRANGE_OBJECT;
    g.nocreate3 = O.STRANGE_OBJECT;
    g.nocreate4 = O.STRANGE_OBJECT;
}

// C ref: u_init.c u_init_race()
/* race-specific initializations, same restrictions as u_init_role */
async function u_init_race() {
    switch (game.urace.mnum) {
    case M.PM_HUMAN:
        /* Nothing special */
        break;

    case M.PM_ELF:
        /*
         * Elves are people of music and song, or they are warriors.
         * Non-warriors get an instrument.  We use a kludge to
         * get only non-magic instruments.
         */
        if (Role_if(M.PM_CLERIC) || Role_if(M.PM_WIZARD)) {
            const trotyp = [ O.WOODEN_FLUTE, O.TOOLED_HORN, O.WOODEN_HARP,
                             O.BELL,         O.BUGLE,       O.LEATHER_DRUM ];
            const Instrument = [
                { trotyp: ROLL_FROM(trotyp), trspe: 0, trclass: O.TOOL_CLASS,
                  trquan_min: 1, trquan_max: 1, trbless: 0 },
                { trotyp: 0, trspe: 0, trclass: 0, trquan_min: 0,
                  trquan_max: 0, trbless: 0 },
            ];
            await ini_inv(Instrument);
        }

        /* Elves can recognize all elvish objects */
        knows_object(O.ELVEN_SHORT_SWORD, false);
        knows_object(O.ELVEN_ARROW, false);
        knows_object(O.ELVEN_BOW, false);
        knows_object(O.ELVEN_SPEAR, false);
        knows_object(O.ELVEN_DAGGER, false);
        knows_object(O.ELVEN_BROADSWORD, false);
        knows_object(O.ELVEN_MITHRIL_COAT, false);
        knows_object(O.ELVEN_LEATHER_HELM, false);
        knows_object(O.ELVEN_SHIELD, false);
        knows_object(O.ELVEN_BOOTS, false);
        knows_object(O.ELVEN_CLOAK, false);
        break;

    case M.PM_DWARF:
        /* Dwarves can recognize all dwarvish objects */
        knows_object(O.DWARVISH_SPEAR, false);
        knows_object(O.DWARVISH_SHORT_SWORD, false);
        knows_object(O.DWARVISH_MATTOCK, false);
        knows_object(O.DWARVISH_IRON_HELM, false);
        knows_object(O.DWARVISH_MITHRIL_COAT, false);
        knows_object(O.DWARVISH_CLOAK, false);
        knows_object(O.DWARVISH_ROUNDSHIELD, false);
        break;

    case M.PM_GNOME:
        break;

    case M.PM_ORC:
        /* compensate for generally inferior equipment */
        if (!Role_if(M.PM_WIZARD))
            await ini_inv(Xtra_food);
        /* Orcs can recognize all orcish objects */
        knows_object(O.ORCISH_SHORT_SWORD, false);
        knows_object(O.ORCISH_ARROW, false);
        knows_object(O.ORCISH_BOW, false);
        knows_object(O.ORCISH_SPEAR, false);
        knows_object(O.ORCISH_DAGGER, false);
        knows_object(O.ORCISH_CHAIN_MAIL, false);
        knows_object(O.ORCISH_RING_MAIL, false);
        knows_object(O.ORCISH_HELM, false);
        knows_object(O.ORCISH_SHIELD, false);
        knows_object(O.URUK_HAI_SHIELD, false);
        knows_object(O.ORCISH_CLOAK, false);
        break;

    default: /* impossible */
        break;
    }
}

// C ref: u_init.c skills_for_role()
/* the appropriate set of skills for the role */
function skills_for_role() {
    let skills = null;

    switch (game.urole.mnum) {
    case M.PM_ARCHEOLOGIST: skills = Skill_A; break;
    case M.PM_BARBARIAN: skills = Skill_B; break;
    case M.PM_CAVE_DWELLER: skills = Skill_C; break;
    case M.PM_HEALER: skills = Skill_H; break;
    case M.PM_KNIGHT: skills = Skill_K; break;
    case M.PM_MONK: skills = Skill_Mon; break;
    case M.PM_CLERIC: skills = Skill_P; break;
    case M.PM_RANGER: skills = Skill_Ran; break;
    case M.PM_ROGUE: skills = Skill_R; break;
    case M.PM_SAMURAI: skills = Skill_S; break;
    case M.PM_TOURIST: skills = Skill_T; break;
    case M.PM_VALKYRIE: skills = Skill_V; break;
    case M.PM_WIZARD: skills = Skill_W; break;
    default:
        throw new Error("No skills found for role"); /* panic() */
    }

    return skills;
}

// C ref: u_init.c restricted_spell_discipline()
/* skills aren't initialized, so we use the role-specific skill lists */
function restricted_spell_discipline(otyp) {
    const skills = skills_for_role();
    const this_skill = spell_skilltype(otyp);

    for (let i = 0; skills && skills[i].skill !== K.P_NONE; ++i) {
        if (skills[i].skill === this_skill)
            return false;
    }
    return true;
}

// C ref: u_init.c trquan()
/* randomizes the quantity given a trobj description */
function trquan(trop) {
    if (!trop.trquan_min)
        return 1;
    return trop.trquan_min + rn2(trop.trquan_max - trop.trquan_min + 1);
}

// C ref: u_init.c ini_inv_mkobj_filter()
/* create random object of certain class, filtering out too powerful items */
function ini_inv_mkobj_filter(oclass, got_level1_spellbook) {
    const g = game;
    let obj;
    let otyp, trycnt = 0;

    /*
     * For random objects, do not create certain overly powerful
     * items: wand of wishing, ring of levitation, or the
     * polymorph/polymorph control combination.  Specific objects,
     * i.e. the discovery wishing, are still OK.
     * Also, don't get a couple of really useless items.  (Note:
     * punishment isn't "useless".  Some players who start out with
     * one will immediately read it and use the iron ball as a
     * weapon.)
     */
    obj = mkobj(oclass, false);
    otyp = obj.otyp;

    while (otyp === O.WAN_WISHING || otyp === g.nocreate
           || otyp === g.nocreate2 || otyp === g.nocreate3
           || otyp === g.nocreate4 || otyp === O.RIN_LEVITATION
           /* 'useless' items */
           || otyp === O.POT_HALLUCINATION
           || otyp === O.POT_ACID
           || otyp === O.SCR_AMNESIA
           || otyp === O.SCR_FIRE
           || otyp === O.SCR_BLANK_PAPER
           || otyp === O.SPE_BLANK_PAPER
           || otyp === O.RIN_AGGRAVATE_MONSTER
           || otyp === O.RIN_HUNGER
           || otyp === O.WAN_NOTHING
           /* orcs start with poison resistance */
           || (otyp === O.RIN_POISON_RESISTANCE && Race_if(M.PM_ORC))
           /* Monks don't use weapons */
           || (otyp === O.SCR_ENCHANT_WEAPON && Role_if(M.PM_MONK))
           /* wizard patch -- they already have one */
           || (otyp === O.SPE_FORCE_BOLT && Role_if(M.PM_WIZARD))
           /* powerful spells are either useless to
              low level players or unbalancing; also
              spells in restricted skill categories */
           || (obj.oclass === O.SPBOOK_CLASS
               && (objects[otyp].oc_level > (got_level1_spellbook ? 3 : 1)
                   || restricted_spell_discipline(otyp)))
           || otyp === O.SPE_NOVEL) {
        dealloc_obj(obj);
        if (++trycnt > 1000) {
            /* This lonely pancake's potential will never be realized. */
            obj = mksobj(O.PANCAKE, true, false);
            break;
        }
        obj = mkobj(oclass, false);
        otyp = obj.otyp;
    }
    return obj;
}

// C ref: u_init.c ini_inv_obj_substitution()
/* substitute object with something else based on race.
   only changes otyp, and returns it. */
function ini_inv_obj_substitution(trop, obj) {
    if (game.urace.mnum !== M.PM_HUMAN) {
        let i;

        /* substitute race-specific items; this used to be in
           the 'if (otyp != UNDEF_TYP) { }' block above, but then
           substitutions didn't occur for randomly generated items
           (particularly food) which have racial substitutes */
        for (i = 0; inv_subs[i].race_pm !== NON_PM; ++i)
            if (inv_subs[i].race_pm === game.urace.mnum
                && obj.otyp === inv_subs[i].item_otyp) {
                obj.otyp = inv_subs[i].subs_otyp;
                break;
            }
    }
    return obj.otyp;
}

// C ref: u_init.c ini_inv_adjust_obj()
/* returns: TRUE to stop generating items from this trobj,
   FALSE for normal behaviour */
function ini_inv_adjust_obj(trop, obj) {
    let stop = false;
    if (trop.trclass === O.COIN_CLASS) {
        /* no "blessed" or "identified" money */
        obj.quan = game.u.umoney0;
    } else {
        if (objects[obj.otyp].oc_uses_known)
            obj.known = 1;
        /* not observe_object during startup, that's handled later */
        obj.dknown = obj.bknown = obj.rknown = 1;
        if (Is_container(obj) || obj.otyp === O.STATUE) {
            obj.cknown = obj.lknown = 1;
            obj.otrapped = 0;
        }
        obj.cursed = 0;
        if (obj.otrapped /* opoisoned */ && game.u.ualign.type !== A_CHAOTIC)
            obj.otrapped /* opoisoned */ = 0;
        if (obj.oclass === O.WEAPON_CLASS || obj.oclass === O.TOOL_CLASS) {
            obj.quan = trquan(trop);
            stop = true;
        } else if (obj.oclass === O.GEM_CLASS && is_graystone(obj)
                   && obj.otyp !== O.FLINT) {
            obj.quan = 1;
        }
        if (trop.trspe !== UNDEF_SPE) {
            obj.spe = trop.trspe;
            if (trop.trotyp === O.MAGIC_MARKER && obj.spe < 96)
                obj.spe += rn2(4);
        } else {
            /* Don't start with +0 or negative rings */
            if (objects[obj.otyp].oc_class === O.RING_CLASS
                && objects[obj.otyp].oc_charged && obj.spe <= 0)
                obj.spe = rne(3);
        }
        if (trop.trbless !== UNDEF_BLESS)
            obj.blessed = trop.trbless;

    }
    /* defined after setting otyp+quan + blessedness */
    obj.owt = weight(obj);
    return stop;
}

// C ref: u_init.c ini_inv()
async function ini_inv(trops) {
    const g = game;
    let obj;
    let otyp;
    let got_sp1 = false; /* got a level 1 spellbook? */
    let quan;
    let t = 0; /* index of trop (C: pointer) */
    let trop = trops[t];

    if (g.u.uroleplay.pauper) /* pauper gets no items */
        return;

    quan = trquan(trop);
    while (trop.trclass) {
        otyp = trop.trotyp;
        if (otyp !== UNDEF_TYP) {
            obj = mksobj(otyp, true, false);
        } else { /* UNDEF_TYP */
            obj = ini_inv_mkobj_filter(trop.trclass, got_sp1);
            otyp = obj.otyp;
            /* Heavily relies on the facts that 1) we create wands
             * before rings, that 2) we create rings before
             * spellbooks, and that 3) not more than 1 object of a
             * particular symbol is to be prohibited.  (For more
             * objects, we need more nocreate variables...)
             */
            switch (otyp) {
            case O.WAN_POLYMORPH:
            case O.RIN_POLYMORPH:
            case O.POT_POLYMORPH:
                g.nocreate = O.RIN_POLYMORPH_CONTROL;
                break;
            case O.RIN_POLYMORPH_CONTROL:
                g.nocreate = O.RIN_POLYMORPH;
                g.nocreate2 = O.SPE_POLYMORPH;
                g.nocreate3 = O.POT_POLYMORPH;
            }
            /* Don't have 2 of the same ring or spellbook */
            if (obj.oclass === O.RING_CLASS || obj.oclass === O.SPBOOK_CLASS)
                g.nocreate4 = otyp;
        }
        /* Put post-creation object adjustments that don't depend on whether
         * it was UNDEF_TYP or not after this. */

        otyp = ini_inv_obj_substitution(trop, obj);

        /* nudist gets no armor */
        if (g.u.uroleplay.nudist && obj.oclass === O.ARMOR_CLASS) {
            dealloc_obj(obj);
            trop = trops[++t];
            continue;
        }

        if (ini_inv_adjust_obj(trop, obj))
            quan = 1;
        obj = await addinv(obj);

        /* First spellbook should be level 1 - did we get it? */
        if (obj.oclass === O.SPBOOK_CLASS && objects[obj.otyp].oc_level === 1)
            got_sp1 = true;

        if (--quan)
            continue; /* make a similar object */
        trop = trops[++t];
        quan = trquan(trop);
    }
}

// C ref: invent.c hidden_gold()
/* the hero's starting inventory never holds a container with gold */
function hidden_gold(even_if_unknown) {
    void even_if_unknown;
    return 0;
}


// C ref: u_init.c u_init_carry_attr_boost()
/* boost STR and CON until hero can carry inventory */
async function u_init_carry_attr_boost() {
    /* make sure you can carry all you have - especially for Tourists */
    while (inv_weight() > 0) {
        if (await adjattrib(A_STR, 1, true))
            continue;
        if (await adjattrib(A_CON, 1, true))
            continue;
        /* only get here when didn't boost strength or constitution */
        break;
    }
}

// C ref: u_init.c u_init_inventory_attrs()
/* initialise starting inventory and attributes

   this function can be run multiple times and will overwrite the effects of
   previous runs */
export async function u_init_inventory_attrs() {
    const g = game;
    const u = g.u;

    g.lastinvnr = 51;
    while (g.invent)
        useupall(g.invent);

    u.umoney0 = 0;
    await u_init_role();
    await u_init_race();

    if (g.flags.explore) /* discover */
        await ini_inv(Wishing);

    if (u.umoney0)
        await ini_inv(Money);
    u.umoney0 += hidden_gold(true); /* in case sack has gold in it */

    init_attr(75);    /* init attribute values */
    await vary_init_attr(); /* minor variation to attrs */
    await u_init_carry_attr_boost();
}

// C ref: invent.c money_cnt()
export function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj)
        if (otmp.oclass === O.COIN_CLASS)
            return otmp.quan;
    return 0;
}

// C ref: obj.h is_missile(), is_weptool(), bimanual(), is_shield() ..
// is_suit(); objclass.h OBJ_DESCR(), ARM_BONUS(); obj.h greatest_erosion()
function is_missile(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.TOOL_CLASS)
            && objects[otmp.otyp].oc_skill >= -K.P_BOOMERANG
            && objects[otmp.otyp].oc_skill <= -K.P_DART);
}
function is_weptool(o) {
    return (o.oclass === O.TOOL_CLASS && objects[o.otyp].oc_skill !== K.P_NONE);
}
function bimanual(otmp) {
    return ((otmp.oclass === O.WEAPON_CLASS || otmp.oclass === O.TOOL_CLASS)
            && objects[otmp.otyp].oc_bimanual);
}
function is_armcat(otmp, cat) {
    return (otmp.oclass === O.ARMOR_CLASS && objects[otmp.otyp].oc_armcat === cat);
}
/* objclass.h OBJ_DESCR(): imported from objects.js */
function greatest_erosion(otmp) {
    return Math.max(otmp.oeroded || 0, otmp.oeroded2 || 0);
}
function ARM_BONUS(obj) {
    return (objects[obj.otyp].a_ac + (obj.spe || 0)
            - Math.min(greatest_erosion(obj), objects[obj.otyp].a_ac));
}

// C ref: wield.c setuwep(), setuqwep(), setuswapwep() -- slot only
function setuwep(obj) { game.uwep = obj; obj.owornmask = (obj.owornmask || 0) | K.W_WEP; }
function setuqwep(obj) { game.uquiver = obj; obj.owornmask = (obj.owornmask || 0) | K.W_QUIVER; }
function setuswapwep(obj) { game.uswapwep = obj; obj.owornmask = (obj.owornmask || 0) | K.W_SWAPWEP; }

// C ref: u_init.c ini_inv_use_obj()
/* initial inventory: wear, wield, learn the spell/obj */
function ini_inv_use_obj(obj) {
    const g = game;
    /* Make the type known if necessary */
    if (OBJ_DESCR(objects[obj.otyp]) && obj.known)
        discover_object(obj.otyp, true, true, false);
    if (obj.otyp === O.OIL_LAMP)
        discover_object(O.POT_OIL, true, true, false);

    if (obj.oclass === O.ARMOR_CLASS) {
        if (is_armcat(obj, O.ARM_SHIELD) && !g.uarms
            && !(g.uwep && bimanual(g.uwep))) {
            g.u.twoweap = false; /* set_twoweap(FALSE) */
            setworn(obj, K.W_ARMS);
        } else if (is_armcat(obj, O.ARM_HELM) && !g.uarmh)
            setworn(obj, K.W_ARMH);
        else if (is_armcat(obj, O.ARM_GLOVES) && !g.uarmg)
            setworn(obj, K.W_ARMG);
        else if (is_armcat(obj, O.ARM_SHIRT) && !g.uarmu)
            setworn(obj, K.W_ARMU);
        else if (is_armcat(obj, O.ARM_CLOAK) && !g.uarmc)
            setworn(obj, K.W_ARMC);
        else if (is_armcat(obj, O.ARM_BOOTS) && !g.uarmf)
            setworn(obj, K.W_ARMF);
        else if (is_armcat(obj, O.ARM_SUIT) && !g.uarm)
            setworn(obj, K.W_ARM);
    }

    if (obj.oclass === O.WEAPON_CLASS || is_weptool(obj)
        || obj.otyp === O.TIN_OPENER
        || obj.otyp === O.FLINT || obj.otyp === O.ROCK) {
        if (is_ammo(obj) || is_missile(obj)) {
            if (!g.uquiver)
                setuqwep(obj);
        } else if (!g.uwep && (!g.uarms || !bimanual(obj))) {
            setuwep(obj);
        } else if (!g.uswapwep) {
            setuswapwep(obj);
        }
    }
    if (obj.oclass === O.SPBOOK_CLASS && obj.otyp !== O.SPE_BLANK_PAPER)
        initialspell(obj);
}

// C ref: do_wear.c find_ac()
export function find_ac() {
    const g = game;
    const u = g.u;
    let uac = M.mons[u.umonnum].ac; /* base armor class for current form */

    /* armor class from worn gear */
    if (g.uarm) uac -= ARM_BONUS(g.uarm);
    if (g.uarmc) uac -= ARM_BONUS(g.uarmc);
    if (g.uarmh) uac -= ARM_BONUS(g.uarmh);
    if (g.uarmf) uac -= ARM_BONUS(g.uarmf);
    if (g.uarms) uac -= ARM_BONUS(g.uarms);
    if (g.uarmg) uac -= ARM_BONUS(g.uarmg);
    if (g.uarmu) uac -= ARM_BONUS(g.uarmu);
    if (g.uleft && g.uleft.otyp === O.RIN_PROTECTION)
        uac -= g.uleft.spe;
    if (g.uright && g.uright.otyp === O.RIN_PROTECTION)
        uac -= g.uright.spe;
    if (g.uamul && g.uamul.otyp === O.AMULET_OF_GUARDING)
        uac -= 2; /* fixed amount; main benefit is to MC */

    /* armor class from other sources */
    if (u.uprops[K.PROTECTION].intrinsic & K.INTRINSIC)
        uac -= u.ublessed;
    uac -= u.uspellprot;

    /* put a cap on armor class [5.0: was +127,-128, now reduced to +/- 99 */
    if (Math.abs(uac) > 99 /* AC_MAX */)
        uac = Math.sign(uac) * 99;

    if (uac !== u.uac) {
        u.uac = uac;
        g.disp_botl = true;
    }
}

// C ref: u_init.c u_init_skills_discoveries()
/* side effects of starting inventory (e.g. discovering it) and skills (both
   those based on role and those based on starting inventory) */
export function u_init_skills_discoveries() {
    const u = game.u;
    let otmp;
    for (otmp = game.invent; otmp; otmp = otmp.nobj)
        ini_inv_use_obj(otmp);

    skill_init(skills_for_role());
    if (u.uroleplay?.pauper)
        throw new Error('u_init_skills_discoveries(): pauper_reinit() not ported yet');

    /* If we have at least one spell, force starting Pw to be enough,
       so hero can cast the level 1 spell they should have */
    if (num_spells() && (u.uenmax < SPELL_LEV_PW(1)))
        u.uen = u.uenmax = u.uenpeak = u.ueninc[u.ulevel] = SPELL_LEV_PW(1);

    find_ac(); /* get initial ac value */
}
