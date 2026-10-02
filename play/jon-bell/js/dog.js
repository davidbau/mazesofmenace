// @ts-nocheck
// dog.c — Starting pet and pet AI helpers.
// C ref: nethack-c/src/dog.c
// @ts-nocheck — js sibling imports.
import { pline } from './display.js'; /* was an undeclared global: every pline() call in this file threw ReferenceError when reached */
import { rn2, rnd, rn1, pushRngLogEntry } from './rng.js';
import { game } from './gstate.js';
import { NON_PM, MM_EDOG, NO_MINVENT, W_SADDLE, In_endgame, OBJ_FREE, OBJ_FLOOR, EDOG, MIGR_RANDOM, MIGR_APPROX_XY, MIGR_EXACT_XY, MIGR_STAIRS_UP, MIGR_STAIRS_DOWN, MIGR_LADDER_UP, MIGR_LADDER_DOWN, MIGR_SSTAIRS, MIGR_PORTAL, MIGR_WITH_HERO, MIGR_LEFTOVERS, MON_LIMBO, STRAT_ARRIVE, RLOC_NOMSG, COLNO, ROWNO, ROOMOFFSET, MAGIC_PORTAL,
         AGGRAVATE_MONSTER as AGGRAVATE_MONSTER_DOG, CONFLICT as CONFLICT_DOG,
         MM_IGNOREWATER, MM_NOMSG, MM_MALE, MM_FEMALE,
         CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE,
         G_EXTINCT, MAXMONNO, EYE, DISMOUNT_THROWN } from './const.js';
import { placebc } from './ball.js';                /* C ball.c:193 — unstuck()'s Punished arm */
import { PM_KITTEN, PM_LITTLE_DOG, PM_PONY, PM_MEDUSA, PM_LONG_WORM, PM_WATCHMAN, PM_WATCH_CAPTAIN } from './pm.generated.js';
import { LS_MONSTER } from './const.js';
import { Upolyd } from './const.js';
/* C light.c homes: del_light_source (light.c:98) and hack.c:97 monst_to_any.
 * Re-exported so this file's historical export surface is unchanged. */
export { del_light_source, monst_to_any } from './light.js';
import { del_light_source, monst_to_any } from './light.js';
import { set_ustuck as set_ustuck_dog, discard_minvent as discard_minvent_real, restore_cham,
         stairway_find_from, stairway_find_dir, somexy, mongone, monnear } from './mklev.js';
import { enexto_core, mnexto, mnearto, rloc_to, rloc } from './teleport.js';
import { put_saddle_on_mon, impossible } from './steed.js';
import { newMonHp, assignMakemonFemale, peaceMinded, permonstTemplate, newmextra, emits_light, humanoid } from './makemon.js';
import { acurr } from './attrib.js';
/* ── imports for the level-migration chain (mon_leaving_level / relmon /
 * mon_leave / migrate_to_level, below).  Each names its C home. ── */
import { isok, Has_contents, MON_MIGRATING, MAX_NUM_WORMS } from './const.js';
import { within_bounded_area } from './rect.js';   /* C rect.c */
import { newsym } from './display.js';             /* C display.c */
import { see_wsegs as see_wsegs_dog, remove_worm, wormgone, count_wsegs } from './worm.js';  /* C worm.c redraw_worm's stand-in */
import { yelp, growl, helpless, levl_follower, mon_has_amulet, seemimic } from './mhitm.js';
import { vision_recalc } from './vision.js';       /* C vision.c */
import { depth } from './hacklib.js';              /* C dungeon.c depth() */
import { fill_pit, mintrap } from './trap.js';              /* C trap.c:5391 */
import { on_level } from './dungeon.js';           /* C dungeon.c on_level() */
import { ESHK, EPRI, EGD } from './const.js';      /* C mextra.h accessors */
import { picked_container, deliver_obj_to_mon } from './dokick.js';    /* C shk.c:3084 */
/* C steal.c:851-871 mdrop_special_objs — canonical special-inventory drop
 * handling; this module's keepdogs() steed branch reaches it directly. */
import { mdrop_special_objs as mdrop_special_objs_real } from './steal.js';
import { obfree } from './dokick.js';
import { set_residency, in_rooms } from './shk.js';          /* C shk.c:1907 */
import { mon_track_clear } from './monmove.js';      /* C monmove.c:90 */
import { get_wormno, initworm } from './worm.js';    /* C worm.c:95/119 */
/* C monattk.h attack/damage-type constants, in C's numbering — they are
 * compared against the RAW C-numbered mattk rows (js/mhitu.js MON_MATTK via
 * mon_mattk_raw), so a JS-local renumbering selects the wrong branch. */
const AT_HUGS = 7;     /* C monattk.h:20 — crushing bearhug */
const AT_ENGL = 11;    /* C monattk.h:22 — engulf */
const AT_WEAP = 254;   /* C monattk.h:28 — uses weapon */
const AD_STCK = 19;    /* C monattk.h:60 — sticks to you */
const AD_WRAP = 28;    /* C monattk.h:69 — special "stick" for eels */
import { dmgtype as _dmgtype_real, finish_meating } from './dogmove.js';
/* mklev.js holds the real healmon (mon.c:1080); js/monmove.js and js/mhitm.js
 * each carry a stub of the same name — import the live one explicitly. */
import { healmon } from './mklev.js';
/* C dog.c:271-274 — makedog's own call, on the starting pet, before christening.
 * see_monster_closeup's real body is js/mklev.js:10320 (C mon.c:5971). */
import { see_monster_closeup } from './mklev.js';
import { carrying, body_part, dismount_steed as dismount_steed_real } from './cmd.js';
const EXPENSIVE_CAMERA = 229;
/* C spellbook object type SPE_CREATE_FAMILIAR = 401 (objects.h X-macro; not
 * greppable, matches the value already duplicated at js/spell.js:75,
 * js/u_init.js:1225, js/mkobj.js:85). Used by pick_familiar_pm's spell arm. */
const SPE_CREATE_FAMILIAR_DOG = 401;
import { attacktype as _attacktype_real } from './mhitm.js';
import { canseemon, canspotmon } from './display.js';   /* C display.c */
import { cansee } from './vision.js';                   /* C vision.c */
import { wake_nearto, place_object } from './mklev.js'; /* C sounds.c / mkobj.c */
import { ismnum, has_edog, HALLUC, HALLUC_RES } from './const.js'; /* monst.h/mextra.h/youprop.h */
import { the, xname, Tobjnam } from './objnam.js';      /* C objnam.c */
import { Monnam } from './mcastu.js';                   /* C do_name.c (js home) */
import { s_suffix } from './mhitm.js';                  /* C hacklib.c */
import { dogfood, dog_eat } from './dogmove.js';        /* C dog.c / dogmove.c */
import { night } from './allmain.js';                   /* C calendar.c:223 */
import { redraw_worm } from './worm.js';                /* C worm.c:989 */
/* ── make_familiar()'s callees (C dog.c:103-215).  makemon is the real,
 * async port (js/mklev.js:4914) — awaited below, not this module's own
 * makedog() which builds a monster inline without it.  set_malign and
 * christen_monst are aliased: this file still carries its own dormant
 * `set_malign`/`attacktype` stubs (js/dog.js, `sticks()`'s comment explains
 * why) that would otherwise shadow the real ones. ── */
import { makemon, minliquid } from './mklev.js';        /* C makemon.c / mon.c:1116 */
import { is_pool } from './look.js';                    /* C dbridge.c:46 */
import { christen_monst } from './mhitm.js';            /* C do_name.c:132 */
import { has_oname, ONAME } from './const.js';           /* C obj.h */
import { mbirth_limit, rndmonstAdj,
         set_malign as _set_malign_real } from './makemon.js'; /* C makemon.c */
import { spell_skilltype } from './spell.js';           /* C spell.c:855 */
import { P_SKILL } from './skills.js';                  /* C attrib.c-adjacent skill table */
/* C pline.c:132 pline_mon(mon, fmt, ...) — pline() preceded by set_msg_xy() for
 * the perm_invent/status highlight channel, which this port has no window for;
 * the same body js/mklev.js:14496 carries. */
function pline_mon(mtmp, fmt, ...args) {
    void mtmp;
    pline(fmt, ...args);
}
/* C youprop.h:116-120 — Hallucination is (HHallucination && !Halluc_resistance),
 * where HHallucination is u.uprops[HALLUC].intrinsic (INTRINSIC only; there is
 * no EHallucination in 5.0).  This is the live spelling — the one js/potion.js
 * and js/mhitm.js read and js/potion.js writes. */
function Hallucination() {
    const up = game.u?.uprops;
    const h = up?.[HALLUC], r = up?.[HALLUC_RES];
    const res = ((r?.intrinsic | 0) !== 0) || ((r?.extrinsic | 0) !== 0);
    return ((h?.intrinsic | 0) !== 0) && !res;
}
/* C mondata.h:101/110/153 — plain mflags tests, no RNG. */
const M2_HUMAN_DOG = 0x00000008, M2_DEMON_DOG = 0x00000100;
const M3_COVETOUS_DOG = 0x001f; /* a multi-bit mask, not a single flag */
function is_human(ptr)    { return !!ptr && ((ptr.mflags2 >>> 0) & M2_HUMAN_DOG) !== 0; }
function is_demon(ptr)    { return !!ptr && ((ptr.mflags2 >>> 0) & M2_DEMON_DOG) !== 0; }
function is_covetous(ptr) { return !!ptr && ((ptr.mflags3 >>> 0) & M3_COVETOUS_DOG) !== 0; }
/* C ref: role.c roles[].petnum — indexed by roles[] order (Arc..Wiz) */
const ROLE_PETNUMS = [
    NON_PM, // 0 Archeologist
    NON_PM, // 1 Barbarian
    PM_LITTLE_DOG, // 2 Caveman
    NON_PM, // 3 Healer
    PM_PONY, // 4 Knight
    NON_PM, // 5 Monk
    NON_PM, // 6 Priest
    NON_PM, // 7 Rogue
    PM_LITTLE_DOG, // 8 Ranger
    PM_LITTLE_DOG, // 9 Samurai
    NON_PM, // 10 Tourist
    NON_PM, // 11 Valkyrie
    PM_KITTEN, // 12 Wizard
];
/* C ref: dog.c:91–101 pet_type — return PM_ index of hero's starting pet type */
function pet_type() {
    const ir = (game.flags?.initrole ?? -1) | 0;
    let petnum = (ir >= 0 && ir < ROLE_PETNUMS.length)
        ? ROLE_PETNUMS[ir] : NON_PM;
    if (petnum !== NON_PM)
        return petnum;
    else if (game.preferred_pet === 'c')
        return PM_KITTEN;
    else if (game.preferred_pet === 'd')
        return PM_LITTLE_DOG;
    else
        return rn2(2) ? PM_KITTEN : PM_LITTLE_DOG;
}
export function initedog(mtmp, everything) {
    /* C dog.c:49 — schar minimumtame = is_domestic(mtmp->data) ? 10 : 5;
     * is_domestic() is the M2_DOMESTIC flag (dogs, cats, horses of every size). */
    const _dptr = mtmp.data || permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? 0) | 0);
    const isDomestic = !!_dptr && ((_dptr.mflags2 >>> 0) & 0x00400000 /* M2_DOMESTIC */) !== 0;
    const minimumtame = isDomestic ? 10 : 5;
    /* C dog.c:51 — mtmp->mtame = max(minimumtame, mtmp->mtame); */
    mtmp.mtame = Math.max(minimumtame, (mtmp.mtame ?? 0) | 0);
    /* C dog.c:52 — mtmp->mpeaceful = 1; (unconditional — overrides peace_minded) */
    mtmp.mpeaceful = 1;
    /* C dog.c:53 — mtmp->mavenge = 0; */
    mtmp.mavenge = 0;
    /* C dog.c:54 — set_malign(mtmp) */
    _set_malign_real(mtmp);
    if (everything) {
        /* C dog.c:56–68 — clear mleashed, meating and edog struct fields */
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        /* C ref: dog.c:56-68 — allocate edog substruct on mtmp.mextra.edog.
         * The `mextra` slot mirrors C's EDOG(mtmp) accessor. */
        if (!mtmp.mextra)
            mtmp.mextra = {};
        /* C: EDOG(mtmp)->apport = ACURR(A_CHA). A_CHA = 5 per attrib.h enum.
         * acurr(u, 5) mirrors C's acurr(A_CHA): computes abon[di]+atemp[di]+abase[di]
         * clamped to [3,25].  At game-start (attrs not yet initialised, all zero),
         * this correctly returns 3 — matching C's behaviour because C's memset(&u,0)
         * zeroes u.acurr.a before makedog() runs, so C's ACURR(A_CHA)=3 there too.
         * For mid-game taming, it returns the hero's current effective CHA. */
        const acha = game.u ? acurr(game.u, 5) : 3; /* A_CHA=5; acurr clamps to [3,25]; 3=ATTRMIN when u absent */
        const moves = (game.moves ?? 0) | 0;
        mtmp.mextra.edog = {
            droptime: 0,
            dropdist: 10000,
            apport: acha, /* acurr already clamps to ≥3; C has no additional clamp here */
            whistletime: 0,
            hungrytime: moves + 1000, /* C: svm.moves + 1000L */
            ogoal: { x: -1, y: -1 }, /* C: force error if used before set */
            abuse: 0,
            revivals: 0,
            mhpmax_penalty: 0,
            killed_by_u: 0,
        };
    }
    const u = game.u || (game.u = {});
    if (!u.uconduct) u.uconduct = {};
    u.uconduct.pets = (u.uconduct.pets | 0) + 1;
}
/* C ref: dog.c:218–284 makedog — create hero's starting pet.
 * Mirrors C: pet_type(), then makemon(u.ux,u.uy) which calls enexto_core
 * → collect_coords(near, radius=3) to find placement position. */
export async function makedog() {
    if (game.preferred_pet === 'n') {
        game.context = game.context || {};
        game.context.startingpet_typ = NON_PM;
        return null; /* C: return (struct monst *) 0 */
    }
    const pettype = pet_type();
    game.context = game.context || {};
    game.context.startingpet_typ = pettype;
    if (pettype === NON_PM)
        return null;

    const f = game.flags || {};
    let petname = pettype === PM_LITTLE_DOG ? (f.dogname || '')
                : pettype === PM_KITTEN ? (f.catname || '')
                : pettype === PM_PONY ? (f.horsename || '')
                : '';
    if (!petname && pettype === PM_LITTLE_DOG) {
        /* All of these names were for dogs. */
        const initrole = (f.initrole ?? -1) | 0;
        const PM_RANGER = 8;    /* Orion's dog */
        const PM_SAMURAI = 9;   /* Shibuya Station */
        const PM_CAVEMAN = 2;   /* The Warrior */
        const PM_BARBARIAN = 1; /* Obelix */
        if (initrole === PM_CAVEMAN)        petname = 'Slasher';
        if (initrole === PM_SAMURAI)        petname = 'Hachi';
        if (initrole === PM_BARBARIAN)      petname = 'Idefix';
        if (initrole === PM_RANGER)         petname = 'Sirius';
    }
    /* C ref: makemon.c:1182 — byyou && !in_mklev: enexto_core(&cc, u.ux, u.uy, ptr, gpflags)
     * C ref: teleport.c:219-275 — enexto_core gathers candidates via collect_coords,
     * walks them with goodpos, returns the first valid position. */
    const ux = (game.u?.ux ?? 0) | 0;
    const uy = (game.u?.uy ?? 0) | 0;
    const petPos = enexto_core(ux, uy) ?? { x: ux, y: uy };
    /* C makemon.c:1253 — mtmp->m_id = next_ident() consumes rnd(2) */
    const g = game;
    if (g.context == null)
        g.context = {};
    if (g.context.ident == null)
        g.context.ident = 2; /* id 1 is reserved */
    const petMId = g.context.ident;
    g.context.ident += rnd(2);
    if (!g.context.ident)
        g.context.ident = rnd(2) + 1; /* id 1 is reserved */
    g.context.startingpet_mid = petMId;
    /* C makemon.c:1251-1252 — mtmp->nmon = fmon; fmon = mtmp (before m_id/newmonhp) */
    /* C makemon.c:1260 — newmonhp(mtmp, mndx) */
    /* C makemon.c:1237 — *mtmp = cg.zeromonst zero-inits all fields; cham then set
     * to NON_PM at makemon.c:1356; minvis/perminvis set 0 unless stalker/black_light
     * (makemon.c:1302/1319). makedog bypasses makemon in JS so explicitly init here
     * to mirror C. W20.2 / W21.8 audit follow-up — NON_PM = -1 per monst.h. */
    const petMon = { mx: petPos.x, my: petPos.y, mnum: pettype,
        data: permonstTemplate(pettype),
        m_id: petMId, m_lev: 0, mhp: 0, mhpmax: 0,
        msleeping: 0, mpeaceful: 0, mcansee: 1, mcanmove: 1, minvent: null, nmon: null,
        cham: -1, minvis: 0, perminvis: 0,
        movement: 0 };
    newMonHp(petMon, pettype);
    /* C makemon.c:1281 — femaleok ? rn2(2) : 0 */
    assignMakemonFemale(petMon, pettype, MM_EDOG | NO_MINVENT);
    /* C: u_init_misc() initialises u.ualign.type from flags.initalign before makedog()
     * is called.  Without it peaceMinded() sees ual=0 for every role and may call rn2
     * when C does not (e.g. Knight=lawful vs pony=neutral → C returns FALSE early, no rn2).
     * alignOptionToIndex in roles.js: 0=lawful 1=neutral 2=chaotic.
     * C A_* values: A_LAWFUL=1 A_NEUTRAL=0 A_CHAOTIC=-1. */
    if (g.u && g.u.ualign == null) {
        const ial = (g.flags?.initalign ?? -1) | 0;
        const ualignType = ial === 0 ? 1 : ial === 2 ? -1 : 0;
        g.u.ualign = { type: ualignType, record: 0, abuse: 0 };
    }
    /* C makemon.c:1300 — mtmp->mpeaceful = (mmflags & MM_ANGRY) ? FALSE : peace_minded(ptr) */
    /* MM_EDOG | NO_MINVENT does not include MM_ANGRY, so peace_minded is always called here */
    petMon.mpeaceful = peaceMinded(pettype) ? 1 : 0;
    /* C makemon.c:1251-1252 — link mtmp into fmon chain (mirrors mklev.js:makemon) */
    petMon.nmon = g.fmon;
    g.fmon = petMon;
    /* C dog.c:262-268 — a pauper's starting pony has no saddle. */
    if (!g.u.uroleplay?.pauper && pettype === PM_PONY) {
        await put_saddle_on_mon(null, petMon);
    }
    /* C dog.c:270-274 — still inside the `if (!svc.context.startingpet_mid)`
     * block, AFTER the saddle and BEFORE christening:
     *
     *     gb.bhitpos.x = mtmp->mx, gb.bhitpos.y = mtmp->my;
     *     gn.notonhead = FALSE;
     *     see_monster_closeup(mtmp, carrying(EXPENSIVE_CAMERA) ? TRUE : FALSE);
     *
     * "starting pet's type has been seen up close (unless PermaBlind) and for
     * tourist treat it as having already been photographed."  This call was
     * absent entirely, so svm.mvitals[pettype].seen_close and .photographed were
     * never set for the starting pet and context.lifelist.total_seen_upclose /
     * .total_photographed both started one short of C's.  It draws no RNG.
     *
     * The tourist EXP bonus inside see_monster_closeup is explicitly suppressed
     * for the starting pet (mon.c:6011-6013 checks m_id == startingpet_mid AND
     * mndx == startingpet_typ, both of which hold here), which is why
     * startingpet_mid/_typ must already be assigned above — they are. */
    if (!g.gb) g.gb = {};
    if (!g.gb.bhitpos) g.gb.bhitpos = {};
    g.gb.bhitpos.x = petMon.mx;
    g.gb.bhitpos.y = petMon.my;
    if (!g.gn) g.gn = {};
    g.gn.notonhead = false;
    see_monster_closeup(petMon, carrying(EXPENSIVE_CAMERA) ? true : false);
    /* C dog.c:279-280 — `if (!gp.petname_used++ && *petname)
     *                        mtmp = christen_monst(mtmp, petname);`
     * The counter is post-incremented unconditionally, so only the FIRST makedog
     * of a game may christen; it was missing, and the name was applied on the
     * pettype test alone.  christen_monst sets MGIVENNAME = mtmp.mextra.
     * mgivenname (do_name.c:133); js/const.js MGIVENNAME/has_mgivenname read
     * that spelling first, and dokick.js:1109 shows it is the mextra write that
     * flips has_mgivenname/mextra_present. */
    if (g.petname_used == null) g.petname_used = 0;
    const firstPet = (g.petname_used++ === 0);
    if (firstPet && petname) {
        if (!petMon.mextra) petMon.mextra = {};
        petMon.mextra.mgivenname = petname;
    }
    /* C dog.c:282 — initedog(mtmp, TRUE): forces mpeaceful=1, mtame=max(10,0)=10 for
     * domestic starters, mavenge=0; called AFTER saddle creation and christen_monst,
     * matching C dog.c line order. */
    initedog(petMon, true);
    /* C makemon.c:1393-1396 — byyou && !in_mklev: set_apparxy(mtmp) is called from
     * makemon() before returning.  For a starting hero (not invisible, not displaced,
     * not underwater) set_apparxy resolves to displ=0 → mux=u.ux, muy=u.uy
     * (monmove.c:2256-2257).  The tame-pet early-return at monmove.c:2235 does not
     * fire here because mtame is still 0 when makemon calls set_apparxy; initedog
     * runs after makemon returns in C.  Either way the normal-hero path always yields
     * mux=u.ux, muy=u.uy, so mirroring that result is C-faithful. */
    petMon.mux = ux;
    petMon.muy = uy;
    /* C dog.c:283 `return mtmp;`.  This function returned nothing at all, which
     * is why predicate-arm-replay classed dog.c:219 makedog as a NEVER-TRUE
     * pointer-returning stub against 41 non-NULL C returns in 44 calls.  The
     * one JS caller (js/allmain.js:287) discards it, exactly as C's newgame()
     * does, so this is structural faithfulness rather than a live fix — but a
     * caller that starts reading it must not get `undefined`. */
    return petMon;
}

async function pick_familiar_pm(otmp, quietly) {
    if (otmp) { /* figurine; otherwise spell */
        const mndx = otmp.corpsenm | 0;
        /* C dog.c:111 `assert(ismnum(mndx));` — a precondition on a valid
         * figurine (corpsenm always names a real species); not reproduced as
         * a runtime check since C's assert() aborts the whole process on
         * failure rather than returning an error this port could mirror. */
        if (((game.mvitals?.[mndx]?.mvflags | 0) & G_EXTINCT) !== 0
                && mbirth_limit(mndx) !== MAXMONNO) {
            if (!quietly)
                /* C dog.c:118-121 — "have just been given "You <do something
                 * with> the figurine and it transforms."" message precedes
                 * this one at the call site. */
                await pline('... into a pile of dust.');
            return null;
        }
        return mndx;
    } else if (!rn2(3)) {
        return pet_type();
    } else {
        const skill = spell_skilltype(SPE_CREATE_FAMILIAR_DOG);
        const max = 3 * P_SKILL(skill);
        const mndx = rndmonstAdj(0, max);
        if (mndx === null && !quietly)
            await pline('There seems to be nothing available for a familiar.');
        return mndx;
    }
}

export async function make_familiar(otmp, x, y, quietly) {
    let mtmp = null;
    let trycnt = 100;
    let reallytame = true;

    do {
        const mndx = await pick_familiar_pm(otmp, quietly);
        if (mndx === null)
            break;

        let mmflags = MM_EDOG | MM_IGNOREWATER | NO_MINVENT | MM_NOMSG;
        const cgend = otmp ? (otmp.spe & CORPSTAT_GENDER) : 0;
        mmflags |= (cgend === CORPSTAT_FEMALE) ? MM_FEMALE
                 : (cgend === CORPSTAT_MALE) ? MM_MALE : 0;

        mtmp = await makemon(mndx, x, y, mmflags);
        if (otmp) { /* figurine */
            if (!mtmp) {
                /* monster has been genocided or target spot is occupied */
                if (!quietly)
                    await pline('The figurine writhes and then shatters into pieces!');
                break;
            } else if (mtmp.isminion) {
                /* Fixup for figurine of an Angel: makemon() is willing to
                 * create a random Angel as either an ordinary monster or as
                 * a minion of random allegiance. We don't want the latter
                 * here in case it successfully becomes a pet. */
                mtmp.isminion = 0;
                free_emin(mtmp);
            }
        }
    } while (!mtmp && --trycnt > 0);

    if (!mtmp)
        return null;

    if (is_pool(mtmp.mx, mtmp.my) && await minliquid(mtmp))
        return null;

    if (otmp) { /* figurine; resulting monster might not become a pet */
        let chance = rn2(10); /* 0==tame, 1==peaceful, 2==hostile */
        if (chance > 2)
            chance = otmp.blessed ? 0 : !otmp.cursed ? 1 : 2;
        /* 0,1,2: b=80%,10,10; nc=10%,80,10; c=10%,10,80 */
        if (chance > 0) {
            reallytame = false; /* not tame after all */
            if (chance === 2) { /* hostile (cursed figurine) */
                if (!quietly)
                    await pline('You get a bad feeling about this.');
                mtmp.mpeaceful = 0;
                _set_malign_real(mtmp);
            }
        }
        /* if figurine has been named, give same name to the monster */
        if (has_oname(otmp))
            mtmp = christen_monst(mtmp, ONAME(otmp));
    }
    if (reallytame)
        initedog(mtmp, true);
    mtmp.msleeping = 0;
    _set_malign_real(mtmp); /* more alignment changes */
    newsym(mtmp.mx, mtmp.my);

    /* must wield weapon immediately since pets will otherwise drop it */
    if (mtmp.mtame && _attacktype_real(mtmp.data, AT_WEAP)) {
        const NEED_HTH_WEAPON = 3; /* C monst.h:32 enum wpn_chk_flags */
        mtmp.weapon_check = NEED_HTH_WEAPON;
        await mon_wield_item(mtmp);
    }
    return mtmp;
}

/* C ref: nethack-c-v5/upstream/src/minion.c:27-34 free_emin — release a
 * monster's minion extension and clear isminion. Not exported in C
 * (top-level, non-static, but this port has no other caller yet); kept
 * private here since make_familiar is its only user. makemon()'s
 * angel/cleric minion branch (js/mklev.js:5622-5637) stores the emin data
 * flatly on the monster object rather than under mextra (unlike the
 * MM_EMIN-flag branch a few lines above it, which does use mextra.emin via
 * newemin()) — clear both representations so a later isminion/EMIN() reader
 * sees it gone regardless of which branch produced this monster. */
function free_emin(mtmp) {
    if (mtmp.mextra && mtmp.mextra.emin)
        mtmp.mextra.emin = null;
    if (mtmp.emin)
        mtmp.emin = null;
    mtmp.isminion = 0;
}


/* discard_migrations — C ref: dog.c:939-993 */
export async function discard_migrations() {
    let mtmp, otmp, dest;

    /* monsters */
    let prevMon = null;
    mtmp = game.migrating_mons;
    while (mtmp != null) {
        dest = { dnum: mtmp.mux, dlevel: mtmp.muy };
        if (mtmp.iswiz || In_endgame(dest)) {
            prevMon = mtmp;
            mtmp = mtmp.nmon;
        } else {
            let next = mtmp.nmon;
            /* remove from migrating_mons */
            if (prevMon == null) {
                game.migrating_mons = next;
            } else {
                prevMon.nmon = next;
            }
            mtmp.nmon = null;
            await discard_minvent_real(mtmp, false);
            if (emits_light(mtmp.data))
                del_light_source(LS_MONSTER, monst_to_any(mtmp));
            dealloc_monst(mtmp);
            mtmp = next;
        }
    }

    /* objects */
    let prevObj = null;
    otmp = game.migrating_objs;
    while (otmp != null) {
        dest = { dnum: otmp.ox, dlevel: otmp.oy };
        if (In_endgame(dest)) {
            prevObj = otmp;
            otmp = otmp.nobj;
        } else {
            let next = otmp.nobj;
            /* remove from migrating_objs */
            if (prevObj == null) {
                game.migrating_objs = next;
            } else {
                prevObj.nobj = next;
            }
            otmp.nobj = null;
            otmp.where = OBJ_FREE;
            otmp.owornmask = 0;
            await obfree(otmp, null);
            otmp = next;
        }
    }
}

/* C: static struct monst *failed_arrivals = 0; */
let failed_arrivals = null;

/* C enum arrival */
const Before_you = 0;
const With_you = 1;
const MON_STILL_ARRIVING = 0x100; /* C monst.h:67 */
const After_you = 2;

/* MIGR_EXACT_XY now comes from ./const.js (=2, dungeon.h:152).  The local copy
 * here read 1, which is MIGR_APPROX_XY (dungeon.h:151) — so both losedogs()
 * xyloc tests below took the wrong branch and keepdogs() migrated accessible
 * monsters to an APPROXIMATE position where C places them exactly. */

/* C ref: dog.c:304-417 losedogs */
export async function losedogs() {
    let mtmp;
    let dismissKops = 0, xyloc;
    failed_arrivals = null;

    /* check for returning shk(s) */
    for (mtmp = game.migrating_mons; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mux !== game.u.uz.dnum || mtmp.muy !== game.u.uz.dlevel)
            continue;
        if (mtmp.isshk) {
            if (mtmp.mextra.eshk.dismiss_kops) {
                if (dismissKops === 0)
                    dismissKops = 1;
                mtmp.mextra.eshk.dismiss_kops = false;
            } else if (!mtmp.mpeaceful) {
                dismissKops = -1;
            }
        }
    }

    /* make the same check for game.mydogs */
    for (mtmp = game.mydogs; mtmp && dismissKops >= 0; mtmp = mtmp.nmon) {
        if (mtmp.isshk) {
            if (!mtmp.mpeaceful)
                dismissKops = -1;
        }
    }

    if (dismissKops > 0)
        await make_happy_shoppers(true);

    /* Before_you: monsters kept accessible */
    {
        let prev = null;
        mtmp = game.migrating_mons;
        while (mtmp) {
            xyloc = mtmp.mtrack[0].x;
            if (mtmp.mux === game.u.uz.dnum && mtmp.muy === game.u.uz.dlevel
                && xyloc === MIGR_EXACT_XY) {
                let next = mtmp.nmon;
                if (prev === null) {
                    game.migrating_mons = next;
                } else {
                    prev.nmon = next;
                }
                await mon_arrive(mtmp, Before_you);
                mtmp = next;
            } else {
                prev = mtmp;
                mtmp = mtmp.nmon;
            }
        }
    }
    /* With_you: mydogs */
    while ((mtmp = game.mydogs) != null) {
        game.mydogs = mtmp.nmon;
        await mon_arrive(mtmp, With_you);
    }

    /* After_you: regular migrating monsters */
    {
        let prev = null;
        mtmp = game.migrating_mons;
        while (mtmp) {
            xyloc = mtmp.mtrack[0].x;
            if (mtmp.mux === game.u.uz.dnum && mtmp.muy === game.u.uz.dlevel
                && xyloc !== MIGR_EXACT_XY) {
                let next = mtmp.nmon;
                if (prev === null) {
                    game.migrating_mons = next;
                } else {
                    prev.nmon = next;
                }
                await mon_arrive(mtmp, After_you);
                mtmp = next;
            } else {
                prev = mtmp;
                mtmp = mtmp.nmon;
            }
        }
    }

    /* failed_arrivals → m_into_limbo */
    while ((mtmp = failed_arrivals) != null) {
        failed_arrivals = mtmp.nmon;
        mtmp.nmon = game.fmon;
        game.fmon = mtmp;
        await m_into_limbo(mtmp);
    }
}

/* C monst.h:175 STRAT_WAITFORU 0x20000000L.  (Was 0x0004 with a "monflag.h"
 * comment — wrong header and wrong bit; every other JS site that SETS this
 * flag, e.g. js/mklev.js:5064 and js/sp_lev.js:3597, uses 0x20000000, so the
 * keepdogs test below never saw a waiting monster.) */
const STRAT_WAITFORU = 0x20000000;
/* NO_TRAP_FLAGS: trap.h */
const NO_TRAP_FLAGS = 0;
/* DISMOUNT_GENERIC: steed.h */
const DISMOUNT_GENERIC = 0;

/* C ref: dog.c:790–886 keepdogs */
export async function keepdogs(pets_only) {
    let mtmp2;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (DEADMONSTER(mtmp))
            continue;
        if (pets_only) {
            if (!mtmp.mtame)
                continue;
            mtmp.mtrapped = 0;
            finish_meating(mtmp);
            mtmp.msleeping = 0;
            mtmp.mfrozen = 0;
            mtmp.mcanmove = 1;
        }
        if (((monnear(mtmp, game.u.ux, game.u.uy) && levl_follower(mtmp))
             || (game.u.uhave.amulet && mtmp.iswiz))
            && (!helpless(mtmp)
                || (mtmp === game.u.usteed))
            && !((mtmp.mstrategy | 0) & STRAT_WAITFORU)) {
            let num_segs;
            let stay_behind = false;

            if (mtmp.mtrapped)
                await mintrap(mtmp, NO_TRAP_FLAGS);
            if (mtmp === game.u.usteed) {
                mtmp.mtrapped = 0;
                mtmp.meating = 0;
                await mdrop_special_objs(mtmp);
            } else if (mtmp.meating || mtmp.mtrapped) {
                if (canseemon(mtmp))
                    pline_mon(mtmp, "%s is still %s.", Monnam(mtmp),
                             mtmp.meating ? "eating" : "trapped");
                stay_behind = true;
            } else if (mon_has_amulet(mtmp)) {
                if (canseemon(mtmp))
                    pline("%s seems very disoriented for a moment.",
                          Monnam(mtmp));
                stay_behind = true;
            }
            if (stay_behind) {
                if (mtmp.mleashed) {
                    pline("%s leash suddenly comes loose.",
                          humanoid(mtmp.data)
                              ? (mtmp.female ? "Her" : "His")
                              : "Its");
                    m_unleash(mtmp, false);
                }
                if (mtmp === game.u.usteed) {
                    impossible("steed left behind?");
                    await dismount_steed(DISMOUNT_GENERIC);
                }
                continue;
            }

            num_segs = mon_leave(mtmp);
            await relmon(mtmp, 'mydogs'); /* C: relmon(mtmp, &gm.mydogs) — see relmon's header on the slot-name convention */
            mtmp.mx = 0;
            mtmp.my = 0;
            mtmp.wormno = num_segs;
            mtmp.mlstmv = game.moves;
        } else if (keep_mon_accessible(mtmp)) {
            await migrate_to_level(mtmp, ledger_no(game.u.uz), MIGR_EXACT_XY, null);
        } else if (mtmp.mleashed) {
            pline("%s leash goes slack.", s_suffix(Monnam(mtmp)));
            m_unleash(mtmp, false);
        }
    }
}

function DEADMONSTER(mtmp) {
    return (mtmp.mhp ?? 0) <= 0 || (mtmp.mhpmax ?? 0) <= 0;
}

/* C monflag.h:108/114/115 — read from the 5.0 header, not inherited from a
 * sibling file (js/eat.js and js/dogmove.js each keep private copies). */
const M1_REGEN = 0x00800000;
const M1_CARNIVORE = 0x20000000;
const M1_HERBIVORE = 0x40000000;

export function mon_catchup_elapsed_time(mtmp, nmv) {
    const LARGEST_INT = 32767; /* C global.h — sizeof(int) guard value */
    let imv = 0;

    if (nmv >= LARGEST_INT) /* paranoia */
        imv = LARGEST_INT - 1;
    else
        imv = nmv | 0;

    /* might stop being afraid, blind or frozen */
    if (mtmp.mblinded) {
        if (imv >= (mtmp.mblinded | 0))
            mtmp.mblinded = 1;
        else
            mtmp.mblinded -= imv;
    }
    if (mtmp.mfrozen) {
        if (imv >= (mtmp.mfrozen | 0))
            mtmp.mfrozen = 1;
        else
            mtmp.mfrozen -= imv;
    }
    if (mtmp.mfleetim) {
        if (imv >= (mtmp.mfleetim | 0))
            mtmp.mfleetim = 1;
        else
            mtmp.mfleetim -= imv;
    }

    /* might recover from temporary trouble */
    if (mtmp.mtrapped && rn2(imv + 1) > 40 / 2)
        mtmp.mtrapped = 0;
    if (mtmp.mconf && rn2(imv + 1) > 50 / 2)
        mtmp.mconf = 0;
    if (mtmp.mstun && rn2(imv + 1) > 10 / 2)
        mtmp.mstun = 0;

    /* might finish eating or be able to use special ability again */
    if (mtmp.meating) {
        if (imv > (mtmp.meating | 0))
            finish_meating(mtmp);
        else
            mtmp.meating -= imv;
    }
    if (imv > (mtmp.mspec_used | 0))
        mtmp.mspec_used = 0;
    else
        mtmp.mspec_used -= imv;

    /* reduce tameness for every 150 moves you are separated */
    if (mtmp.mtame) {
        const wilder = ((imv + 75) / 150) | 0;
        if (mtmp.mtame > wilder)
            mtmp.mtame -= wilder; /* less tame */
        else if (mtmp.mtame > rn2(wilder))
            mtmp.mtame = 0; /* untame */
        else
            mtmp.mtame = mtmp.mpeaceful = 0; /* hostile! */
    }
    /* check to see if it would have died as a pet; if so, go wild instead
     * of dying the next time we call dog_move() */
    if (mtmp.mtame && !mtmp.isminion
        && (((mtmp.data?.mflags1 | 0) & (M1_CARNIVORE | M1_HERBIVORE)) !== 0)) {
        const edog = mtmp.mextra?.edog;
        if (edog
            && (((game.moves | 0) > (edog.hungrytime | 0) + 500 && mtmp.mhp < 3)
                || ((game.moves | 0) > (edog.hungrytime | 0) + 750)))
            mtmp.mtame = mtmp.mpeaceful = 0;
    }

    /* C dog.c:713-716 — the !mtame && mleashed impossible()+m_unleash() arm is
     * unreachable for this port: nothing sets mleashed (no leash apply), and
     * m_unleash is still a throwing stub in this file.  UNPORTED-CALLEE. */

    /* recover lost hit points */
    if (((mtmp.data?.mflags1 | 0) & M1_REGEN) === 0)
        imv = (imv / 20) | 0;
    healmon(mtmp, imv, 0);

    /* C mon.c set_mon_lastmove(mtmp) — mtmp->mlstmv = svm.moves. */
    mtmp.mlstmv = game.moves | 0;
}

/* C shk.c:1440-1445.  Returning shopkeepers can dismiss the Kops after a
 * robbery has been settled.  The helper is deliberately synchronous and
 * RNG-free: retain the C ordering (angry shopkeeper check, then Kops removal
 * and watch pacification). */
export async function make_happy_shoppers(silentkops) {
    let angry = false;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) <= 0 || !mon.isshk)
            continue;
        if (!mon.mpeaceful) {
            angry = true;
            break;
        }
    }
    if (angry)
        return;

    let visibleKops = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) <= 0 || mon.data?.mlet !== 37) /* S_KOP */
            continue;
        if (canspotmon(mon))
            visibleKops++;
        await mongone(mon);
    }
    if (visibleKops && !silentkops)
        pline('The Kop%s (disappointed) vanish%s into thin air.',
              visibleKops === 1 ? '' : 's', visibleKops === 1 ? 'es' : '');

    /* C mon.c:5758 pacify_guards(): is_watch() monsters become peaceful. */
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        const pm = mon.mndx ?? mon.data?.pmidx ?? mon.data?.mndx;
        if ((mon.mhp | 0) > 0
            && (pm === PM_WATCHMAN || pm === PM_WATCH_CAPTAIN))
            mon.mpeaceful = 1;
    }
}

/* C stairs.c:50-61 stairway_find(fromdlev). */
function stairway_find_arrive(fromdlev) {
    for (let st = game.stairs; st; st = st.next) {
        if ((st.tolev?.dnum | 0) === (fromdlev.dnum | 0)
            && (st.tolev?.dlevel | 0) === (fromdlev.dlevel | 0))
            return st;
    }
    return null;
}

/* C dog.c:420-626 mon_arrive().  All called placement and catch-up routines
 * are synchronous; keeping this function synchronous is required by losedogs
 * and by the level restore path. */
export async function mon_arrive(mtmp, when) {
    if (typeof process !== 'undefined' && ENV?.FF_MIG_TRACE === '1') {
        pushRngLogEntry(`^migrate_trace[id=${mtmp?.m_id | 0} mndx=${mtmp?.mndx ?? mtmp?.data?.pmidx ?? -1}`
            + ` when=${when | 0} xy=${mtmp?.mx | 0},${mtmp?.my | 0} mig=${mtmp?.migflags | 0}]`);
    }
    const u = game.u;
    const Wiz_arrive = -1;
    let xlocale = 0, ylocale = 0;
    let wander = 0;

    mtmp.mstate = (mtmp.mstate | 0) | MON_STILL_ARRIVING;
    mtmp.nmon = game.fmon || null;
    game.fmon = mtmp;
    if (mtmp.isshk)
        set_residency(mtmp, false);

    const num_segs = mtmp.wormno | 0;
    const monnum = (mtmp.data?.pmidx ?? mtmp.mnum) | 0;
    if (monnum === PM_LONG_WORM) {
        mtmp.wormno = get_wormno();
        if (mtmp.wormno)
            initworm(mtmp, num_segs);
    } else {
        mtmp.wormno = 0;
    }

    mtmp.mstrategy = (mtmp.mstrategy | 0) | STRAT_ARRIVE;
    mtmp.mstate = (mtmp.mstate | 0) & ~(MON_MIGRATING | MON_LIMBO);
    mtmp.mux = u.ux | 0;
    mtmp.muy = u.uy | 0;

    const track0 = mtmp.mtrack?.[0] || { x: 0, y: 0 };
    const track1 = mtmp.mtrack?.[1] || { x: 0, y: 0 };
    const track2 = mtmp.mtrack?.[2] || { x: 0, y: 0 };
    let xyloc = track0.x | 0;
    const xyflags = track0.y | 0;
    xlocale = track1.x | 0;
    ylocale = track1.y | 0;
    const fromdlev = { dnum: track2.x | 0, dlevel: track2.y | 0 };
    mon_track_clear(mtmp);
    await restore_cham(mtmp);

    if (mtmp === u.usteed)
        return;

    if (when === With_you) {
        const odds = mtmp.mtame ? 10 : mtmp.mpeaceful ? 5 : 2;
        if (!m_at(u.ux, u.uy) && !rn2(odds))
            await rloc_to(mtmp, u.ux | 0, u.uy | 0);
        else
            await mnexto(mtmp, RLOC_NOMSG);
        mtmp.mstate &= ~MON_STILL_ARRIVING;
        return;
    } else if (when === Wiz_arrive) {
        xyloc = MIGR_WITH_HERO;
    }

    if ((mtmp.mlstmv | 0) < ((game.moves | 0) - 1)) {
        const nmv = (game.moves | 0) - 1 - (mtmp.mlstmv | 0);
        mon_catchup_elapsed_time(mtmp, nmv);
        wander = Math.min(nmv, 8) | 0;
    }

    switch (xyloc) {
    case MIGR_APPROX_XY:
        break;
    case MIGR_EXACT_XY:
        wander = 0;
        break;
    case MIGR_WITH_HERO:
        xlocale = u.ux | 0;
        ylocale = u.uy | 0;
        break;
    case MIGR_STAIRS_UP:
    case MIGR_STAIRS_DOWN: {
        const st = stairway_find_from(fromdlev, false);
        if (st) {
            xlocale = st.sx | 0;
            ylocale = st.sy | 0;
        }
        break;
    }
    case MIGR_LADDER_UP:
    case MIGR_LADDER_DOWN: {
        const st = stairway_find_from(fromdlev, true);
        if (st) {
            xlocale = st.sx | 0;
            ylocale = st.sy | 0;
        }
        break;
    }
    case MIGR_SSTAIRS: {
        const st = stairway_find_arrive(fromdlev);
        if (st) {
            xlocale = st.sx | 0;
            ylocale = st.sy | 0;
        }
        break;
    }
    case MIGR_PORTAL: {
        if (In_endgame(u.uz)) {
            const d = game.updest || {};
            if ((d.hx | 0) >= (d.lx | 0) && (d.hy | 0) >= (d.ly | 0)) {
                xlocale = rn1((d.hx | 0) - (d.lx | 0) + 1, d.lx | 0);
                ylocale = rn1((d.hy | 0) - (d.ly | 0) + 1, d.ly | 0);
            }
        } else {
            for (let t = game.ftrap; t; t = t.ntrap) {
                if ((t.ttyp | 0) === MAGIC_PORTAL) {
                    xlocale = t.tx | 0;
                    ylocale = t.ty | 0;
                    break;
                }
            }
        }
        break;
    }
    case MIGR_RANDOM:
    default:
        xlocale = ylocale = 0;
        break;
    }

    if ((mtmp.migflags | 0) & MIGR_LEFTOVERS) {
        if (game.migrating_objs)
            await deliver_obj_to_mon(mtmp, 0, 0x04 /* DF_ALL */);
    }

    if (xlocale && wander) {
        const rooms = in_rooms(xlocale, ylocale, 0);
        if (rooms && rooms.length) {
            const room = game.level?.rooms?.[(rooms[0] | 0) - ROOMOFFSET];
            const c = { x: 0, y: 0 };
            if (room && somexy(room, c)) {
                xlocale = c.x | 0;
                ylocale = c.y | 0;
            } else {
                xlocale = ylocale = 0;
            }
        } else {
            let i = Math.max(1, xlocale - wander);
            let j = Math.min(COLNO - 1, xlocale + wander);
            xlocale = rn1(j - i, i);
            i = Math.max(0, ylocale - wander);
            j = Math.min(ROWNO - 1, ylocale + wander);
            ylocale = rn1(j - i, i);
        }
    }

    mtmp.mx = 0;
    mtmp.my = xyflags;
    const placed = xlocale
        ? await mnearto(mtmp, xlocale, ylocale, false, RLOC_NOMSG)
        : await rloc(mtmp, RLOC_NOMSG);
    if (!placed) {
        if (when !== Wiz_arrive) {
            /* C: relmon(mtmp, &failed_arrivals).  losedogs handles retries
             * after both migrating-monster passes have finished. */
            await relmon(mtmp, 'failed_arrivals');
        } else {
            await m_into_limbo(mtmp);
        }
    }
    mtmp.mstate &= ~MON_STILL_ARRIVING;
}
/* C mon.c:3824-3832 m_into_limbo() — mark an overcrowded monster and migrate
 * it back to the current level using approximate coordinates. */
export async function m_into_limbo(mtmp) {
    mtmp.mstate = (mtmp.mstate | 0) | MON_LIMBO;
    await migrate_to_level(mtmp, ledger_no(game.u?.uz), MIGR_APPROX_XY, null);
}

/* C ref: nethack-c/src/mon.c:2634-2659 dealloc_mextra(struct monst *m)
 *
 *     if (x) {
 *         if (x->mgivenname) free(...), x->mgivenname = 0;
 *         ... egd / epri / eshk / emin / edog / ebones ...
 *         x->mcorpsenm = NON_PM;
 *         free(x);  m->mextra = 0;
 *     }
 *
 * JS has no free(); the C `free(p), p = 0` pairs become plain null-out writes
 * so a later read of a released sub-struct is `null` here exactly as it is
 * NULL in C.  mcorpsenm is set to NON_PM before the mextra itself is dropped
 * (C does it too, even though the struct is about to be released — port the
 * write, Cardinal Rule 1). */
export function dealloc_mextra(m) {
    const x = m.mextra;
    if (x) {
        if (x.mgivenname)
            x.mgivenname = null;
        if (x.egd)
            x.egd = null;
        if (x.epri)
            x.epri = null;
        if (x.eshk)
            x.eshk = null;
        if (x.emin)
            x.emin = null;
        if (x.edog)
            x.edog = null;
        if (x.ebones)
            x.ebones = null;
        x.mcorpsenm = NON_PM; /* C: no allocation to release */
        m.mextra = null;
    }
}

/* C ref: nethack-c/src/mon.c:2661-2677 dealloc_monst(struct monst *mon)
 *
 *     char buf[QBUFSZ];
 *     buf[0] = '\0';
 *     if (mon->nmon) { describe_level(buf, 2);
 *                      panic("dealloc_monst with nmon on %s", buf); }
 *     if (mon->mextra) dealloc_mextra(mon);
 *     *mon = cg.zeromonst;
 *     free((genericptr_t) mon);
 *
 * The local `buf` and describe_level() exist only to decorate the panic
 * message, so they are folded into the throw.  `*mon = cg.zeromonst` is the
 * documented "clear out of date information contained in the about-to-become
 * stale memory" write: cg.zeromonst is the file-scope all-zero struct monst
 * (nethack-c/src/decl.c), so every field becomes 0 / NULL.  JS cannot free(),
 * so the zeroing IS the whole observable effect — it is what stops a caller
 * that still holds the pointer (C: dangling; JS: live object) from reading
 * stale field values.  Zeroing is done in place on the caller's object rather
 * than by rebinding, mirroring the C struct assignment through the pointer. */
export function dealloc_monst(mon) {
    if (mon.mextra)
        dealloc_mextra(mon);
    /* C: *mon = cg.zeromonst */
    for (const k of Object.keys(mon)) {
        const v = mon[k];
        if (v === null || typeof v === 'object' || typeof v === 'function')
            mon[k] = null;   /* pointer / struct member → NULL */
        else if (typeof v === 'string')
            mon[k] = '';     /* char array member → all-NUL */
        else if (typeof v === 'boolean')
            mon[k] = false;
        else
            mon[k] = 0;      /* scalar / bitfield member → 0 */
    }
}
/* discard_minvent: LOCAL throwing stub DELETED — use mklev.js's canonical
 * mkobj.c:2527 implementation at the keepdogs() call site above. */

/* steed.c:573-822 — use cmd.js's canonical async implementation. */
export async function dismount_steed(how) { return await dismount_steed_real(how); }
export function keep_mon_accessible(mtmp) {
    if (mtmp.iswiz)
        return true;
    /* C dereferences ESHK/EPRI/EGD unguarded under `mon->mextra`, because in C
     * the flag and the mextra slot are set together.  This port creates the
     * slots piecemeal (js/mklev.js newegd() seeds gdlevel {0,0}; a shk built by
     * an unported path may have no shoplevel at all), and on_level() reads
     * .dnum off both arguments with no null test.  A missing slot is therefore
     * read as ON this level — i.e. NOT kept accessible, the behaviour before
     * this function existed — rather than as a migration this port cannot
     * complete. */
    const away = (lev) => !!lev && !on_level(game.u?.uz, lev);
    if (mtmp.mextra
        && ((mtmp.isshk && away(ESHK(mtmp)?.shoplevel))
            || (mtmp.ispriest && away(EPRI(mtmp)?.shrlevel))
            || (mtmp.isgd && away(EGD(mtmp)?.gdlevel))))
        return true;
    return false;
}
/* C apply.c:726-743 — release one monster from its inventory leash.  The
 * leash object stores the monster id; clear that link and the monster flag.
 * The feedback text is presentation-only and is intentionally omitted here,
 * matching other migration-only callers which pass FALSE. */
export function m_unleash(mtmp, force) {
    void force;
    if (!mtmp)
        return;
    const mid = mtmp.m_id | 0;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === 236 /* LEASH */ && (otmp.leashmon | 0) === mid) {
            otmp.leashmon = 0;
            break;
        }
    }
    mtmp.mleashed = 0;
}

/* C dog.c:1292-1359 — revive/life-save disposition for a tame monster.
 * `pline()` and dismount_steed() are async in this port, so retain C's state
 * and RNG order while awaiting only their presentation/action boundaries. */
export async function wary_dog(mtmp, was_dead) {
    const quietly = !!was_dead;
    finish_meating(mtmp);
    if (!mtmp.mtame)
        return;

    const edog = !mtmp.isminion ? mtmp.mextra?.edog : null;
    if (edog?.mhpmax_penalty) {
        mtmp.mhpmax += edog.mhpmax_penalty;
        mtmp.mhp += edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }

    if (edog && (edog.killed_by_u === 1 || edog.abuse > 2)) {
        mtmp.mpeaceful = mtmp.mtame = 0;
        if (edog.abuse >= 0 && edog.abuse < 10 && !rn2(edog.abuse + 1))
            mtmp.mpeaceful = 1;
        const heroHasEyes = !(game.youmonst?.data?.mflags1 & 0x00001000);
        const petHasEyes = !(mtmp.data?.mflags1 & 0x00001000);
        if (!quietly && cansee(mtmp.mx, mtmp.my) && heroHasEyes) {
            if (petHasEyes)
                await pline(`${Monnam(mtmp)} ${mtmp.mpeaceful ? 'seems unable' : 'refuses'} to look you in the ${body_part(EYE)}.`);
            else
                await pline(`${Monnam(mtmp)} avoids your gaze.`);
        }
    } else {
        /* C's Pet Sematary chance. */
        mtmp.mtame = rn2(mtmp.mtame + 1);
        if (!mtmp.mtame)
            mtmp.mpeaceful = rn2(2);
    }

    if (!mtmp.mtame) {
        if (!quietly && canspotmon(mtmp))
            await pline(`${Monnam(mtmp)} ${mtmp.mpeaceful ? 'is no longer tame' : 'has become feral'}.`);
        newsym(mtmp.mx, mtmp.my);
        if (mtmp.mleashed)
            m_unleash(mtmp, true);
        if (mtmp === game.u.usteed)
            await dismount_steed(DISMOUNT_THROWN);
    } else if (edog) {
        edog.revivals++;
        edog.killed_by_u = 0;
        edog.abuse = 0;
        edog.ogoal.x = edog.ogoal.y = -1;
        if (was_dead || edog.hungrytime < game.moves + 500)
            edog.hungrytime = game.moves + 500;
        if (was_dead) {
            edog.droptime = 0;
            edog.dropdist = 10000;
            edog.whistletime = 0;
            edog.apport = 5;
        }
    }
}

export function abuse_dog(mtmp) {
    if (!(mtmp.mtame | 0))
        return;

    if (_ad_prop_on(AGGRAVATE_MONSTER_DOG) || _ad_prop_on(CONFLICT_DOG))
        mtmp.mtame = ((mtmp.mtame | 0) / 2) | 0;
    else
        mtmp.mtame = (mtmp.mtame | 0) - 1;

    if ((mtmp.mtame | 0) && !(mtmp.isminion | 0)) {
        const edog = mtmp.mextra && mtmp.mextra.edog;
        if (edog)
            edog.abuse = (edog.abuse | 0) + 1;
    }

    if (!(mtmp.mtame | 0) && (mtmp.mleashed | 0))
        m_unleash(mtmp, true);   /* still a throwing stub; C's own arm */

    /* "don't make a sound if pet is in the middle of leaving the level" */
    if ((mtmp.mx | 0) !== 0) {
        if ((mtmp.mtame | 0) && rn2(mtmp.mtame | 0))
            yelp(mtmp);
        else
            growl(mtmp);

        if (!(mtmp.mtame | 0)) {
            newsym(mtmp.mx | 0, mtmp.my | 0);
            /* C dog.c:1396-1397 `if (mtmp->wormno) redraw_worm(mtmp);` —
             * js/worm.js has no redraw_worm; see_wsegs() is the repaint this
             * port uses for the same job. */
            if (mtmp.wormno)
                see_wsegs_dog(mtmp);
        }
    }
}
/* C youprop.h property triple, the same shape js/dog.js's other guards use.
 * The ordinals come from js/const.js (AGGRAVATE_MONSTER 43, CONFLICT 44) —
 * hand-typed values here would be exactly the pm-otyp-audit defect class. */
function _ad_prop_on(p) {
    const r = game.u?.uprops?.[p];
    return !!r && !!((r.intrinsic | 0) || (r.extrinsic | 0)) && !(r.blocked | 0);
}
/* mdrop_special_objs: LOCAL throwing stub DELETED — use steal.js's canonical
 * body at keepdogs(). */
export async function mdrop_special_objs(mtmp) {
    return await mdrop_special_objs_real(mtmp);
}

/* C dungeon.c:1376 ledger_no(lev) = lev->dlevel + svd.dungeons[lev->dnum].ledger_start
 * C dungeon.c:1402 ledger_to_dnum / :1422 ledger_to_dlev — the inverses.
 *
 * migrate_to_level() is handed a LEDGER number and must split it back into a
 * {dnum,dlevel}; keepdogs() (dog.c:212, js/dog.js above) builds one with
 * ledger_no().  Neither had a binding in this module — line 564's
 * `ledger_no(game.u.uz)` was an UNBOUND read that threw ReferenceError before
 * migrate_to_level's stub was even entered.  js/mklev.js:2485 and
 * js/cmd.js:5626 each keep the same one-liner file-locally; this is the third
 * copy of the C macro, not a stand-in. */
function ledger_no(lev) {
    return ((lev?.dlevel | 0) + (game.dungeons?.[lev?.dnum | 0]?.ledger_start | 0));
}
function ledger_to_dnum(ledgerno) {
    const dgns = game.dungeons || [];
    for (let i = 0; i < dgns.length; i++) {
        const start = dgns[i]?.ledger_start | 0;
        if (start < ledgerno && ledgerno <= start + (dgns[i]?.num_dunlevs | 0))
            return i;
    }
    /* C panics.  Returning 0 would silently migrate the monster into the main
     * dungeon; surface it instead. */
    throw new Error(`ledger_to_dnum(${ledgerno}): level number out of range`);
}
function ledger_to_dlev(ledgerno) {
    return ledgerno - (game.dungeons?.[ledger_to_dnum(ledgerno)]?.ledger_start | 0);
}

/* C dungeon.c:1923 In_W_tower(x, y, lev) — is (x,y) inside the Wizard's tower
 * proper on a tower level?  On_W_tower_level(lev) (dungeon.h) is
 * `Is_wiz1_level || Is_wiz2_level || Is_wiz3_level`; js/dungeon_rng.js:643-650
 * already publishes game.wiz1_level/wiz2_level/wiz3_level from the sp_levchn,
 * and svd.dndest is game.dndest (js/save.js:113).  js/mcastu.js:187 keeps a
 * `return false` stub of this same macro; this one reads the real state.
 * Its only consumer here is migrate_to_level's xyflags bit 1. */
function In_W_tower_dog(x, y, lev) {
    const same = (a, b) => !!a && !!b && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
    if (!(same(lev, game.wiz1_level) || same(lev, game.wiz2_level)
          || same(lev, game.wiz3_level)))
        return false;
    const dn = game.dndest;
    if (!dn || !(dn.nlx | 0))
        return false; /* C: impossible("No boundary for Wizard's Tower?") */
    return within_bounded_area(x, y, dn.nlx | 0, dn.nly | 0,
                               dn.nhx | 0, dn.nhy | 0);
}

/* C mon_leaving_level removes map occupancy before repainting, while leaving
 * fmon linkage and mx/my intact for its callers. _mapRemoved represents that
 * distinction in this port's chain-based map lookups; placement clears it. */
export async function mon_leaving_level(mon) {
    const mx = mon.mx | 0, my = mon.my | 0;
    const onmap = isok(mx, my) && m_at(mx, my) === mon;

    mon.mtrapped = 0;
    await unstuck(mon); /* mon is not swallowing or holding you nor held by you */

    if (onmap || (mon.isgd && mx === 0 && my === 0)) {
        mon._mapRemoved = true;
        if (mon.wormno)
            remove_worm(mon);
    }

    if (onmap) {
        mon.mundetected = 0; /* for migration */
        // C unhides departing mimics before pit effects and the final redraw.
        const appearance = (mon.m_ap_type | 0) & 0x7;
        if (appearance !== 0 && appearance !== 3)
            seemimic(mon);
        /* C mon.c:2720 — "if mon is pinned by a boulder, removing mon lets
         * boulder drop". */
        await fill_pit(mx, my);
        newsym(mx, my);
    }
    /* C mon.c:2724 — forget a remembered polearm target. */
    if (game.context?.polearm && game.context.polearm.hitmon === mon)
        game.context.polearm.hitmon = null;
}

/* C ref: mon.c:2561-2592 relmon(mon, monst_list).
 *
 * Take `mon` off the map and out of fmon, then (optionally) push it onto
 * another monster list. C passes `struct monst **monst_list`; JS callers
 * name the destination slot ('mydogs', 'migrating_mons', or the private
 * 'failed_arrivals') or pass null for an orphan. The private slot remains
 * module-owned; it is not an alias of game.migrating_mons. */
async function relmon(mon, monst_list) {
    if (!game.fmon)
        throw new Error('relmon: no fmon available.'); /* C: panic() */

    /* take 'mon' off the map */
    await mon_leaving_level(mon);

    /* remove 'mon' from the 'fmon' list */
    if (mon === game.fmon) {
        game.fmon = mon.nmon;
    } else {
        let mtmp = null;
        for (mtmp = game.fmon; mtmp; mtmp = mtmp.nmon)
            if (mtmp.nmon === mon) {
                mtmp.nmon = mon.nmon;
                break;
            }
        if (!mtmp)
            throw new Error('relmon: mon not in list.'); /* C: panic() */
    }

    if (monst_list === 'failed_arrivals') {
        mon.nmon = failed_arrivals;
        failed_arrivals = mon;
    } else if (monst_list) {
        /* insert into gm.mydogs or gm.migrating_mons */
        mon.nmon = game[monst_list] ?? null;
        game[monst_list] = mon;
    } else {
        mon.nmon = null; /* orphan has no next monster */
    }
}

/* C ref: dog.c:728-763 mon_leave(struct monst *mtmp) — returns the worm
 * segment count, which migrate_to_level stashes in the overloaded wormno
 * field.  RNG-free. */
function mon_leave(mtmp) {
    let num_segs = 0; /* return value */

    /* set minvent's obj->no_charge to 0 */
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if (Has_contents(obj))
            picked_container(obj); /* does the right thing */
        obj.no_charge = 0;
    }

    /* if this is a shopkeeper, clear the 'resident' field of her shop;
       if/when she returns, it will be set back by mon_arrive() */
    if (mtmp.isshk)
        set_residency(mtmp, true);

    /* if this is a long worm, handle its tail segments before mtmp itself */
    if (mtmp.wormno) {
        /* C dog.c:748-760.  This threw 'UNPORTED CALLEE: mon_leave long-worm
         * tail (worm.c wormgone)' until wormgone() was ported; the throw was
         * the honest outcome then and it is a live halt now that it is not.
         *
         * C's comment on the truncation is load-bearing: "since monst->wormno
         * is overloaded to hold the number of tail segments during migration, a
         * very long worm with more segments than can fit in that field gets
         * truncated" — which is why the count is clamped to MAX_NUM_WORMS - 1
         * and why migrate_to_level() below writes num_segs back into wormno.
         *
         * place_monster(mtmp, mx, my) puts the head back after wormgone() has
         * taken it off; C guards it with `if (mx)` for "mtmp might not be on
         * the map if this is happening during a failed attempt to migrate to
         * this level".  place_monster is the fmon chain here and mon_leave does
         * not unlink (relmon does, after), so the head is still on it — the
         * call is the identity for everything except the coordinates it would
         * re-assert, which have not changed.  Left as the comment rather than a
         * fabricated re-link. */
        const cnt = count_wsegs(mtmp);
        num_segs = Math.min(cnt, MAX_NUM_WORMS - 1);
        wormgone(mtmp);
        /* C: if (mx) place_monster(mtmp, mx, my) — see above. */
    }

    return num_segs;
}

const MTSZ_DOG = 4;                   /* monst.h MTSZ (js/const.js:435) */
/* C ref: dog.c:886-932 migrate_to_level(mtmp, tolev, xyloc, cc).
 *
 *   tolev — destination LEDGER number
 *   xyloc — MIGR_xxx destination-xy code
 *   cc    — optional destination coordinates (may be null)
 *
 * Overloads mtmp->[mx,my], [mux,muy] and mtrack[] as destination codes, exactly
 * as C does, because mon_arrive() reads them back out of those same fields
 * (js/dog.js losedogs() above already reads mtrack[0].x / mux / muy that way).
 * RNG-free. */
export async function migrate_to_level(mtmp, tolev, xyloc, cc) {
    const mx = mtmp.mx | 0, my = mtmp.my | 0; /* <mx,my> needed below */

    if (mtmp.mleashed) {
        mtmp.mtame = (mtmp.mtame | 0) - 1;
        m_unleash(mtmp, true);
    }

    /* prepare to take mtmp off the map */
    const num_segs = mon_leave(mtmp);
    /* take off map and move mtmp from fmon list to migrating_mons */
    await relmon(mtmp, 'migrating_mons'); /* mtmp->mx,my retain their value */
    mtmp.mstate = (mtmp.mstate | 0) | MON_MIGRATING;

    const new_lev = {
        dnum: ledger_to_dnum(tolev | 0),
        dlevel: ledger_to_dlev(tolev | 0),
    };
    /* overload mtmp->[mx,my], mtmp->[mux,muy], and mtmp->mtrack[] as
       destination codes */
    let xyflags = (depth(new_lev) < depth(game.u.uz)) ? 1 : 0; /* 1 => up */
    if (In_W_tower_dog(mx, my, game.u.uz))
        xyflags |= 2;
    mtmp.wormno = num_segs;
    mtmp.mlstmv = game.moves;
    if (!Array.isArray(mtmp.mtrack))
        mtmp.mtrack = [];
    while (mtmp.mtrack.length < MTSZ_DOG)
        mtmp.mtrack.push({ x: 0, y: 0 });
    mtmp.mtrack[2].x = game.u.uz.dnum; /* migrating from this dungeon */
    mtmp.mtrack[2].y = game.u.uz.dlevel; /* migrating from this dungeon level */
    mtmp.mtrack[1].x = cc ? cc.x : mx;
    mtmp.mtrack[1].y = cc ? cc.y : my;
    mtmp.mtrack[0].x = xyloc;
    mtmp.mtrack[0].y = xyflags;
    mtmp.mux = new_lev.dnum;
    mtmp.muy = new_lev.dlevel;
    mtmp.mx = mtmp.my = 0; /* mx==0 implies migrating */

    /* don't extinguish a mobile light; it still exists but has changed
       from local (monst->mx > 0) to global (mx==0, not on this level) */
    if (emits_light(mtmp.data))
        vision_recalc(0);
}
export { mon_leave, relmon };
/* mondata.c:53 attacktype — expose the canonical mhitm predicate rather than
 * retaining a false-returning shadow for external callers. */
export function attacktype(data, attk) { return _attacktype_real(data, attk); }
function expels(mtmp, data, flag) { /* stub */ }
function make_happy_shk(mtmp, flag) { /* stub */ }
/* weapon.c:797 mon_wield_item — was an empty-body stub here (returning
 * undefined, so every `if (mon_wield_item(mtmp))` caller read it as "did not
 * take time").  The real port lives in js/uhitm.js beside its siblings
 * select_hwep/select_rwep; re-export it so this module's callers (dog.c:212
 * keepdogs, monmove.c:1131 m_digweapon_check, vault.c:539 gd_move) reach the
 * real one instead of the stub. */
/* `export { x } from 'm'` is an INDIRECT export: it re-exports the name but
 * declares nothing in this module's scope, so tamedog()'s own call below still
 * read an undeclared global.  Import it, then export the local binding. */
import { mon_wield_item, m_at } from './uhitm.js';
import { ENV } from './hostenv.js';
export { mon_wield_item };
/* C ref: nethack-c/src/dog.c:22-30 newedog
 *     if (!mtmp->mextra) mtmp->mextra = newmextra();
 *     if (!EDOG(mtmp)) {
 *         EDOG(mtmp) = alloc(sizeof(struct edog));
 *         memset(EDOG(mtmp), 0, sizeof(struct edog));
 *         EDOG(mtmp)->parentmid = mtmp->m_id;
 *     }
 * Mirrors newegd() (js/vault.js:420) — allocate mextra, then a zeroed
 * edog substruct with parentmid set, only if one isn't already present. */
export function newedog(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!EDOG(mtmp)) {
        mtmp.mextra.edog = {};
        for (const k of Object.keys(mtmp.mextra.edog))
            delete mtmp.mextra.edog[k];
        mtmp.mextra.edog.parentmid = mtmp.m_id;
    }
}
export function sticks(ptr) {
    return (_dmgtype_real(ptr, AD_STCK)
            || (_dmgtype_real(ptr, AD_WRAP) && !_attacktype_real(ptr, AT_ENGL))
            || _attacktype_real(ptr, AT_HUGS)) ? true : false;
}
export async function unstuck(mtmp) {
    const u = game.u;
    const stuck = u && u.ustuck;
    const same = !!(stuck && mtmp
        && (stuck === mtmp
            || (stuck.m_id != null && mtmp.m_id != null
                && (stuck.m_id | 0) === (mtmp.m_id | 0))));
    if (!same) {
        return;
    }
    const ptr = mtmp.data;
    const swallowed = u.uswallow | 0;
    set_ustuck_dog(null);
    if (swallowed) {
        game.mswallower = null;
        u.ux = mtmp.mx;
        u.uy = mtmp.my;
        if (u.uball && u.uchain && ((u.uchain.where | 0) !== OBJ_FLOOR))
            await placebc();
        /* GAP: docrt() repaint — see the note above. */
        game.vision_full_recalc = 1;
    }
    const hold = _dmgtype_real(ptr, AD_STCK)
        || _attacktype_real(ptr, AT_ENGL)
        || _attacktype_real(ptr, AT_HUGS);
    if (!(mtmp.mspec_used | 0) && hold)
        mtmp.mspec_used = rnd(2);
}

export function update_mlstmv() {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER — C iter_mons(set_mon_lastmove) skips dead */
        mtmp.mlstmv = game.moves;
    }
}

/* C ref: dog.c:1144-1285 tamedog */
export async function tamedog(mtmp, obj, givemsg) {
    const SCROLL_CLASS = 9;
    const SPBOOK_CLASS = 10;
    const FULL_MOON = 4;
    const S_DOG = 4;               /* defsym.h:298 MONSYM(4, 'd', DOG, S_DOG) */
    const M3_WANTSARTI = 0x0010;   /* monflag.h:163 (0x0080 is M3_CLOSE) */
    /* C mextra.h enum dogfood_types — DOGFOOD 0, CADAVER 1, ACCFOOD 2,
     * MANFOOD 3, APPORT 4, POISON 5, UNDEF 6, TABU 7.  These compare against
     * the return of dogmove.js's dogfood(), which yields the C values; the
     * CADAVER-less renumbering here made `tasty <= ACCFOOD` mean "<= CADAVER"
     * and `>= MANFOOD` mean ">= ACCFOOD". */
    const DOGFOOD = 0;
    const ACCFOOD = 2;
    const MANFOOD = 3;
    const NEED_HTH_WEAPON = 3;   /* C monst.h:32 enum wpn_chk_flags (1 is NEED_WEAPON) */
    const CORPSE = 265;

    let blessed_scroll = false;

    if (obj && (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS)) {
        blessed_scroll = ('blessed' in obj && obj.blessed) ? true : false;
        obj = null;
    }

    if ('mfrozen' in mtmp && mtmp.mfrozen)
        mtmp.mfrozen = (mtmp.mfrozen + 1) / 2;
    if ('msleeping' in mtmp && mtmp.msleeping)
        wake_nearto(mtmp.mx, mtmp.my, 1);

    if (('iswiz' in mtmp && mtmp.iswiz)
        || ('data' in mtmp && mtmp.data && mtmp.data.pmidx === PM_MEDUSA)
        || ('data' in mtmp && mtmp.data && ('mflags3' in mtmp.data && (mtmp.data.mflags3 & M3_WANTSARTI))))
        return false;

    if (givemsg && !('mpeaceful' in mtmp && mtmp.mpeaceful) && canspotmon(mtmp)) {
        pline_mon(mtmp, "%s seems %s.", Monnam(mtmp),
              Hallucination() ? "really chill" : "more amiable");
        givemsg = false;
    }
    mtmp.mpeaceful = 1;
    _set_malign_real(mtmp);
    if ((game.flags?.moonphase ?? 0) === FULL_MOON && night() && rn2(6) && obj
        && mtmp.data && ('mlet' in mtmp.data && mtmp.data.mlet === S_DOG))
        return false;

    mtmp.mflee = 0;
    mtmp.mfleetim = 0;

    if (mtmp === (game.u?.ustuck ?? null)) {
        if (game.u?.uswallow ?? 0)
            expels(mtmp, mtmp.data, true);
        /* C dog.c:1188 -- !(Upolyd && sticks(gy.youmonst.data)).  This read
         * game.Upolyd, a property nothing in js/ ever writes, so the guard was
         * unconditionally true. */
        else if (!(Upolyd(game.u) && sticks(game.youmonst?.data)))
            await unstuck(mtmp);
    }

    if (('mtame' in mtmp && mtmp.mtame) && obj) {
        let tasty;

        if (('mcanmove' in mtmp && mtmp.mcanmove)
            && !('mconf' in mtmp && mtmp.mconf)
            && !('meating' in mtmp && mtmp.meating)
            && ((tasty = dogfood(mtmp, obj)) === DOGFOOD
                || (tasty <= ACCFOOD
                    && EDOG(mtmp).hungrytime <= (game.moves ?? 0)))) {
            if (canseemon(mtmp)) {
                /* C: mons[obj->corpsenm].msize — the permonst row, not the
                 * monster; permonstTemplate() is this port's mons[] accessor. */
                let big_corpse =
                    (obj.otyp === CORPSE && ismnum(obj.corpsenm)
                     && (permonstTemplate(obj.corpsenm)?.msize | 0)
                        > (mtmp.data?.msize | 0));
                pline_mon(mtmp, "%s catches %s%s",
                          Monnam(mtmp), the(xname(obj)),
                         !big_corpse ? "." : ", or vice versa!");
            } else if (cansee(mtmp.mx, mtmp.my))
                pline("%s.", Tobjnam(obj, "stop"));
            place_object(obj, mtmp.mx, mtmp.my);
            await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, false);
            return true;
        } else
            return false;
    }

    if (('mtame' in mtmp && mtmp.mtame) && mtmp.mtame < 10) {
        if (mtmp.mtame < rnd(10))
            mtmp.mtame++;
        if (blessed_scroll) {
            mtmp.mtame += 2;
            if (mtmp.mtame > 10)
                mtmp.mtame = 10;
        }
        return false;
    }
    if ('isshk' in mtmp && mtmp.isshk) {
        make_happy_shk(mtmp, false);
        return false;
    }

    if (!('mcanmove' in mtmp && mtmp.mcanmove)
        || ('isshk' in mtmp && mtmp.isshk)
        || ('isgd' in mtmp && mtmp.isgd)
        || ('ispriest' in mtmp && mtmp.ispriest)
        || ('isminion' in mtmp && mtmp.isminion)
        || is_covetous(mtmp.data) || is_human(mtmp.data)
        || (is_demon(mtmp.data) && !is_demon(game.youmonst?.data))
        || (obj && dogfood(mtmp, obj) >= MANFOOD))
        return false;

    if (('m_id' in mtmp ? mtmp.m_id : 0) === (game.svq?.quest_status?.leader_m_id ?? -1))
        return false;

    if (!has_edog(mtmp)) {
        newedog(mtmp);
        initedog(mtmp, true);
    } else {
        initedog(mtmp, false);
    }

    if (obj) {
        place_object(obj, mtmp.mx, mtmp.my);
        if ((await dog_eat(mtmp, obj, mtmp.mx, mtmp.my, true)) === 2)
            return true;
    }

    if (givemsg && canspotmon(mtmp))
        pline_mon(mtmp, "%s seems quite %s.", Monnam(mtmp),
              Hallucination() ? "approachable" : "friendly");

    newsym(mtmp.mx, mtmp.my);
    if ('wormno' in mtmp && mtmp.wormno)
        redraw_worm(mtmp);
    /* C dog.c:1279 attacktype(mtmp->data, AT_WEAP) — the REAL one (js/mhitm.js),
     * not this module's dormant `return false` stub of the same name, which is
     * what the bare spelling resolved to.  mon_wield_item is RNG-free in C and
     * here (js/uhitm.js:4200); its effect on a replay is the "%s wields %s!"
     * topline. */
    if (_attacktype_real(mtmp.data, AT_WEAP)) {
        mtmp.weapon_check = NEED_HTH_WEAPON;
        await mon_wield_item(mtmp);
    }
    return true;
}
