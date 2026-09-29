import { lifesaved_monster, m_consume_obj } from './mklev.js';
import { newobj } from './game.js';
// @ts-nocheck
// js/dogmove.js — Pet AI: dog_move, dog_goal, dog_invent, dog_hunger helpers.
// C ref: nethack-c/src/dogmove.c
// Hand-maintained JS (not tsc-emitted). Mirrors C source structure.
// WIRE_PENDING: port-m_move-monmove-1779329519 — called from monmove.js:m_move
import { rn1, rn2, rnd, d } from './rng.js';
/* C zap.c:1458 obj_resists — the single body (see the re-export below). */
import { obj_resists } from './zap.js';
import { MKOBJ_OC_MATERIAL } from './mkobj_erosion_meta.js';
import { unstuck as unstuck_dm, m_unleash, sticks } from './dog.js';
import { mon_mattk_raw, could_seduce, mattacku, mswings_verb,
         breamm as breamm_mu, spitmm as spitmm_mu } from './mhitu.js';
import { x_monnam, You } from './mhitm.js';
import { game } from './gstate.js';
import { dist2, s_suffix } from './hacklib.js';
import { couldsee as couldsee_vision, clear_path, do_clear_area, cansee, recalc_block_point } from './vision.js';
import { gettrack, hastrack } from './track.js';
import { t_at, split_mon_rt, find_mac as find_mac_mon } from './trap.js';
import { pushRngLogEntry } from './rng.js';
import { IS_ROOM, OBJ_FREE, OBJ_DELETED, OBJ_MINVENT, OBJ_FLOOR, W_WEP, W_SADDLE, IRONBARS, IS_OBSTRUCTED, IS_TREE, ERODE_NONE, ERODE_CORRODE, ERODE_RUST, ERODE_BURN, EF_GREASE, EF_VERBOSE, PASSES_WALLS } from './const.js';
import { place_object, set_ustuck, resists_ston, resists_poison,
         mkcorpstat, mksobj_at, mondead, add_to_container, dealloc_obj, newcham, mongone, makemon } from './mklev.js';
import { closed_door, accessible, is_pool } from './look.js';
import { erode_obj, mintrap as mintrap_real } from './trap.js';
import { PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_STEAM_VORTEX, PM_AIR_ELEMENTAL, PM_BLACK_PUDDING, PM_BROWN_PUDDING, PM_SHADE, PM_DEATH, PM_PESTILENCE, PM_FAMINE, PM_CHICKATRICE, PM_COCKATRICE, PM_STONE_GOLEM, PM_ANGEL } from './pm.generated.js';
import { dmgtype_fromattack, grow_up, nonliving, onscary, monPmname, splitobj, nextoid, which_armor, permonstTemplate } from './makemon.js';
import { pline, newsym, _topline_more_pending, mon_visible, canseemon, canspotmon, map_invisible, glyph_is_invisible_at, unmap_object, You_hear, Deaf, sensemon } from './display.js';
import { xname_scroll, xname_armor, xname_amulet, doname_potion, xname, doname, distant_name, in_distant_name, is_quest_artifact } from './objnam.js';
/* C o_init.c:441-452 observe_object(obj) — the ONE side effect a formatting
 * call has, and the reason distant_name() exists at all.  Imported here
 * because _dm_doname() below reproduces xname_flags()'s prologue for the
 * per-class arms, which reach js/objnam.js's _xname_arm() directly and so
 * never run it themselves. */
import { observe_object as observe_object_dm } from './o_init.js';
/* C youprop.h:103 Blind — prop.h BLINDED. */
import { BLINDED as BLINDED_DM } from './const.js';
import { FF_FAITHFUL } from './fastforward.js';
import { remove_worm as remove_worm_real,
         place_worm_tail_randomly as place_worm_tail_randomly_real } from './worm.js';

/* C pline_mon() adds a monster-coordinate channel that this terminal does
 * not expose; retain its immediate message semantics for these two callers. */
function pline_mon(_mon, line, ...args) {
    let i = 0;
    pline(String(line).replace(/%s/g, () => String(args[i++] ?? '')));
}
import monsPack from './makemon_mons.json' with { type: 'json' };
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { oc_delay, oc_nutrition, mons_cnutrit, eaten_stat } from './food_props.js';
import monMsoundPack_dm from './makemon_msound.json' with { type: 'json' };
import { m_at, mhitm_adtyping, mon_wield_item, mon_nam, setmnotwielded, hitval } from './uhitm.js';
import { Monnam, perceives as perceives_dm } from './mcastu.js';
import { attacktype, max_passive_dmg, resist_conflict, poly_when_stoned } from './mhitm.js';
import { seemimic } from './mhitm.js';
import { mfndpos, make_corpse } from './mklev.js';
import { isok, is_pit, ARTICLE_A, ARTICLE_NONE, MON_DETACH, CORPSTAT_NONE, G_GONE, CONFLICT as CONFLICT_DM, engulfing_u as engulfing_u_const, MAGIC_PORTAL } from './const.js';
import { otrapped_of } from './const.js';   /* obj.h:139 #define opoisoned otrapped */
import { should_displace, undesirable_disp, _can_open_mv, _passes_bars_mv, m_avoid_soko_push_loc, mon_allowflags } from './monmove.js';
import { enexto_out } from './teleport.js';
import { stop_occupation as stop_occupation_dm } from './allmain.js';
/* MONS row layout: [mlet, mlevel, mov, geno, malign, mr, mflags1, mflags2, ...] */
const _MONS = /** @type {number[][]} */ (monsPack.mons);
/* C monflag.h dietary M1_* flags (permonst.mflags1 column 5 of MONS_ROWS). */
const M1_HERBIVORE = 0x40000000;
const M1_CARNIVORE = 0x20000000;
/* Monster size array — same source as uhitm.js MONS_MSIZE */
const MONS_MSIZE = monMsizePack.msize;
const MZ_TINY  = 0;
const MZ_SMALL = 1;
/* C monflag.h:177-183 — note MZ_GIGANTIC is 7, not 5. */
const MZ_MEDIUM = 2;
const MZ_GIGANTIC = 7;
/* G_FREQ = 0x0007 creation frequency mask (monflag.h); geno is MONS row col [3]. */
const G_FREQ = 7;
/* monflag.h:201 G_NOCORPSE — species leaves no corpse ever.  G_GONE
 * (G_GENOD|G_EXTINCT, monflag.h:211) is the runtime half of the same
 * mvitals[].mvflags word and comes from js/const.js, which is authoritative for
 * constant VALUES.  (The file-local G_NOCORPSE copy that used to live here went
 * away with the inlined corpse path — js/mklev.js's make_corpse owns that test
 * now, on the correct side of C's special-species switch.) */
/* Per-mndx AC lookup (permonst.ac), indexed by PM_* number.
 * C ref: worn.c:709 find_mac(mon) = mon->data->ac for unarmored monsters.
 * Authoritative source: the LVL(mlevel,mmove,ac,...) 3rd field of every active
 * MON() in nethack-c/include/monsters.h, in C mons[] order (preprocessor-aware,
 * 383 active entries: #if 0 / CHARON excluded).  The prior literal defaulted 68
 * monsters to 10 (a parse gap), e.g. PM_KITTEN(32) was 10 vs C's 6 — which made
 * the newt's return-attack against a pet kitten read as a hit instead of a miss
 * (tmp=10+0>6 vs C tmp=6+0==6, strike=FALSE), the seed0060 first divergence. */
const MONS_AC = [3,-1,3,3,4,-4,8,8,8,8,6,6,7,7,7,7,6,5,5,4,4,4,4,4,4,4,2,10,9,4,4,4,6,5,6,6,6,4,6,-10,2,-4,-2,10,10,5,10,10,5,0,7,6,2,7,2,5,8,8,8,10,10,10,6,8,7,7,7,9,9,9,10,10,10,10,10,10,5,10,3,0,0,7,0,4,2,6,5,5,7,7,6,6,0,0,3,3,4,3,3,3,6,2,2,2,5,4,0,2,2,2,2,2,5,5,5,6,9,-4,0,0,3,5,0,-4,-5,-6,8,7,6,6,4,3,2,2,2,2,2,2,2,2,2,2,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,3,2,2,2,2,9,9,9,9,9,7,7,10,10,4,10,0,0,6,4,3,3,3,-3,6,-2,10,10,10,10,0,-2,-4,-6,6,6,5,5,4,4,4,3,6,6,6,6,4,2,2,0,5,3,4,8,8,6,6,3,3,2,-10,8,3,3,5,2,2,4,2,0,4,-4,2,1,0,-6,5,4,0,-2,6,6,5,6,6,6,10,10,9,9,9,8,6,10,6,4,10,10,8,6,6,4,9,7,5,1,3,10,10,10,10,10,10,10,10,10,10,5,0,10,10,0,10,7,10,10,0,10,10,10,10,2,-8,0,-5,10,-4,0,-5,2,0,-6,0,-2,-1,-4,-1,-3,4,-2,-7,-5,-6,-3,-2,-5,-7,-8,-5,-5,-5,10,4,6,4,2,-1,-3,6,8,8,7,7,6,6,5,-1,0,10,10,10,10,10,10,10,10,10,10,10,10,10,0,0,0,0,0,0,7,0,0,0,10,0,0,-2,0,0,0,-1,-10,-2,10,0,0,2,0,10,10,10,10,10,10,10,10,10,10,10,10,10,10];
/* Monster species names — same array as uhitm.js MONS_NAMES.
 * C ref: monsters.h NAM() macro, indexed by PM_xxx (pm.generated.js) value. */
const MONS_NAMES = ["giant ant","killer bee","soldier ant","fire ant","giant beetle","queen bee","acid blob","quivering blob","gelatinous cube","chickatrice","cockatrice","pyrolisk","jackal","fox","coyote","werejackal","little dog","dingo","dog","large dog","wolf","werewolf","winter wolf cub","warg","winter wolf","hell hound pup","hell hound","gas spore","floating eye","freezing sphere","flaming sphere","shocking sphere","kitten","housecat","jaguar","lynx","panther","large cat","tiger","displacer beast","gremlin","gargoyle","winged gargoyle","hobbit","dwarf","bugbear","dwarf lord","dwarf king","mind flayer","master mind flayer","manes","homunculus","imp","lemure","quasit","tengu","blue jelly","spotted jelly","ochre jelly","kobold","large kobold","kobold lord","kobold shaman","leprechaun","small mimic","large mimic","giant mimic","wood nymph","water nymph","mountain nymph","goblin","hobgoblin","orc","hill orc","mordor orc","uruk hai","orc shaman","orc captain","rock piercer","iron piercer","glass piercer","rothe","mumak","leocrotta","wumpus","titanothere","baluchitherium","mastodon","sewer rat","giant rat","rabid rat","wererat","rock mole","woodchuck","cave spider","centipede","giant spider","scorpion","lurker above","trapper","pony","white unicorn","gray unicorn","black unicorn","horse","warhorse","fog cloud","dust vortex","ice vortex","energy vortex","steam vortex","fire vortex","baby long worm","baby purple worm","long worm","purple worm","grid bug","xan","yellow light","black light","zruty","couatl","aleax","angel","ki rin","archon","bat","giant bat","raven","vampire bat","plains centaur","forest centaur","mountain centaur","baby gray dragon","baby gold dragon","baby silver dragon","baby red dragon","baby white dragon","baby orange dragon","baby black dragon","baby blue dragon","baby green dragon","baby yellow dragon","gray dragon","gold dragon","silver dragon","red dragon","white dragon","orange dragon","black dragon","blue dragon","green dragon","yellow dragon","stalker","air elemental","fire elemental","earth elemental","water elemental","lichen","brown mold","yellow mold","green mold","red mold","shrieker","violet fungus","gnome","gnome lord","gnomish wizard","gnome king","giant","stone giant","hill giant","fire giant","frost giant","ettin","storm giant","titan","minotaur","jabberwock","keystone kop","kop sergeant","kop lieutenant","kop kaptain","lich","demilich","master lich","arch lich","kobold mummy","gnome mummy","orc mummy","dwarf mummy","elf mummy","human mummy","ettin mummy","giant mummy","red naga hatchling","black naga hatchling","golden naga hatchling","guardian naga hatchling","red naga","black naga","golden naga","guardian naga","ogre","ogre lord","ogre king","gray ooze","brown pudding","green slime","black pudding","quantum mechanic","genetic engineer","rust monster","disenchanter","garter snake","snake","water moccasin","python","pit viper","cobra","troll","ice troll","rock troll","water troll","olog hai","umber hulk","vampire","vampire lord","vlad the impaler","barrow wight","wraith","nazgul","xorn","monkey","ape","owlbear","yeti","carnivorous ape","sasquatch","kobold zombie","gnome zombie","orc zombie","dwarf zombie","elf zombie","human zombie","ettin zombie","ghoul","giant zombie","skeleton","straw golem","paper golem","rope golem","gold golem","leather golem","wood golem","flesh golem","clay golem","stone golem","glass golem","iron golem","human","","","","elf","woodland elf","green elf","grey elf","elf lord","elvenking","doppelganger","shopkeeper","guard","prisoner","oracle","priest","high priest","soldier","sergeant","nurse","lieutenant","captain","watchman","watch captain","medusa","wizard of yendor","croesus","ghost","shade","water demon","incubus","horned devil","erinys","barbed devil","marilith","vrock","hezrou","bone devil","ice devil","nalfeshnee","pit fiend","sandestin","balrog","juiblex","yeenoghu","orcus","geryon","dispater","baalzebub","asmodeus","demogorgon","death","pestilence","famine","mail daemon","djinni","jellyfish","piranha","shark","giant eel","electric eel","kraken","newt","gecko","iguana","baby crocodile","lizard","chameleon","crocodile","salamander","long worm tail","archeologist","barbarian","caveman","healer","knight","monk","","ranger","rogue","samurai","tourist","valkyrie","wizard","lord carnarvon","pelias","shaman karnov","hippocrates","king arthur","grand master","arch priest","orion","master of thieves","lord sato","twoflower","norn","neferet the green","minion of huhetotl","thoth amon","chromatic dragon","cyclops","ixoth","master kaen","nalzok","scorpius","master assassin","ashikaga takauji","lord surtur","dark one","student","chieftain","neanderthal","attendant","page","abbot","acolyte","hunter","thug","ninja","roshi","guide","warrior","apprentice"];
/* x_monnam(do_name.c:943-945) "saddled " adjective: prepended to the base monster
 * name when the monster is wearing a saddle and the hero can perceive it normally:
 *   do_saddle && (mtmp->misc_worn_check & W_SADDLE) && !Blind && !Hallucination
 * mon_nam()/Monnam() pass SUPPRESS_SADDLE only when the monster has a given name
 * (do_name.c:1037-1045), so the adjective appears only for unnamed monsters — which
 * is the case handled below (the given-name branch returns before reaching here). */
function _saddled_prefix_dm(mtmp) {
    const f = game?.flags || {};
    if (f.blind || f.hallucination) return '';
    if ((((mtmp?.misc_worn_check ?? 0) | 0) & W_SADDLE) !== 0) return 'saddled ';
    return '';
}
/* mon_nam_dm(mtmp) — "the newt" style name for defender.
 * C ref: mon.c mon_nam() → do_name.c x_monnam().
 * When !canspotmon(mdef), C do_it=TRUE → returns "it". Mirror here.
 * C ref: do_name.c:863 x_monnam: do_it = !canspotmon(mtmp) && article==THE. */
/* C monst.h Mgender(mon) — (mon)->female ? FEMALE : MALE.  (The youmonst arm
 * of do_name.c:1289 cannot be reached here: these namers take a struct monst
 * off fmon.) */
function Mgender_dm(mtmp) { return mtmp.female ? 1 /* FEMALE */ : 0 /* MALE */; }
/* C const.js spellings, local to keep this file's import list unchanged. */
const ARTICLE_THE_DM = 1;      /* hack.h ARTICLE_THE */
const SUPPRESS_SADDLE_DM = 0x08;
/* `'mgivenname' in mtmp` (Reflect.has, no get trap) safely reports false on a
 * replay-reconstructed monst whose strict proxy never captured a top-level
 * mgivenname — avoids the "field not captured" throw a bare read would
 * trigger via the proxy's get trap. */
function _has_mgivenname_dm(mtmp) {
    if (!mtmp) return false;
    return !!(mtmp?.mextra?.mgivenname
              || (('mgivenname' in mtmp) ? mtmp.mgivenname : ''));
}
/* C do_name.c:1319-1345 obj_pmname(obj) — the corpse/statue/figurine species
 * name, whose gender comes from the CORPSTAT_GENDER bits of obj->spe
 * (hack.h:1189-1199), not from any monst. */
function obj_pmname_dm(obj) {
    const mndx = (obj?.corpsenm ?? -1) | 0;
    if (mndx < 0) return '';
    const cgend = (obj.spe | 0) & 0x03;           /* CORPSTAT_GENDER */
    const mgend = (cgend === 2) ? 0               /* CORPSTAT_MALE   -> MALE */
                : (cgend === 1) ? 1               /* CORPSTAT_FEMALE -> FEMALE */
                                : 2;              /* NEUTRAL */
    return monPmname(mndx, mgend) || '';
}
/* C ref: mon.c:1806 mon_nam(mtmp) =
 *     x_monnam(mtmp, ARTICLE_THE, (char *) 0,
 *              has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, FALSE);
 * This was a hand-rolled "the <species>" namer — the same partial-namer shape
 * js/uhitm.js:265 already retired in favour of the real x_monnam.  What it was
 * missing, beyond the invisible/mappearance/shopkeeper/priest handling, is
 * C's FIRST branch (do_name.c:948-953):
 *
 *     if (do_hallu) { mnam = rndmonnam(&rnamecode); ... }
 *
 * A hallucinating hero sees a MADE-UP name for every monster in every message,
 * and rndmonnam draws rn2_on_display_rng(430) plus either rn2(2) (gender) or
 * rn2(7640) (a bogusmons.txt line) — draws this port did not make, so the whole
 * DISPLAY stream fell behind from the first such message onward.  MEASURED on
 * seed0383-wizard-hallucinate step 198: C prints "Barney the dinosaur picks up
 * a sprig of wolfsbane." (a bogusmon) where this port printed "The soldier
 * picks up a sprig of wolfsbane."  The same defect is why mpickstuff, the
 * door-opening message and the pet-drop message all named real species on a
 * hallucinating hero. */
function mon_nam_dm(mtmp) {
    return x_monnam(mtmp, ARTICLE_THE_DM, null,
                    _has_mgivenname_dm(mtmp) ? SUPPRESS_SADDLE_DM : 0, false);
}
/* Monnam_dm(mtmp) — "Sirius" or "The newt" for aggressor.
 * C ref: mon.c Monnam() → do_name.c x_monnam().
 * When the monster cannot be spotted (!canspotmon), C's do_it=TRUE fires and
 * x_monnam returns "it"; Monnam capitalizes to "It". Mirror that here:
 *   do_it = !canspotmon(mtmp) && not u.usteed && not gameover && not suppress.
 * C ref: do_name.c:863-865 x_monnam: do_it = !canspotmon(mtmp) && ... */
/* C ref: do_name.c:1073-1080 Monnam(mtmp) = highc(*mon_nam(mtmp)).  highc()
 * only uppercases a-z (hacklib.h), so a bogus name that already starts with a
 * capital ("Barney the dinosaur") is returned unchanged. */
export function Monnam_dm(mtmp) {
    const bp = mon_nam_dm(mtmp);
    if (!bp) return bp;
    const c = bp.charAt(0);
    return (c >= 'a' && c <= 'z') ? c.toUpperCase() + bp.slice(1) : bp;
}
/* attack_verb_dm — monster-vs-monster hit verb for AT_xxx type.
 * C ref: mhitm.c:674-701 hitmm() switch (mattk->aatyp).
 * NOTE: AT_KICK has NO case in C's hitmm → falls to default → "hits".
 * This differs from mhitu.c (monster attacks player) where AT_KICK → "kicks". */
function attack_verb_dm(aatyp) {
    switch (aatyp) {
    case AT_BITE: return 'bites';
    case AT_STNG: return 'stings';
    case AT_BUTT: return 'butts';
    case AT_TUCH: return 'touches';
    /* AT_KICK: no case in hitmm — falls to default "hits" */
    default:      return 'hits';
    }
}
/* M_ATTK_HIT / M_ATTK_DEF_DIED / M_ATTK_AGR_DIED (C monattk.h via const.js) */
/* FF_FAITHFUL gating uses the single module source of truth imported from
 * fastforward.js (`env.FF_FAITHFUL !== '0'` = DEFAULT-ON).  Every faithful-only
 * RNG site below references that const directly so dogmove's gating is
 * bit-consistent with the moveloop (no ad-hoc `=== '1'` reads). */
const M_ATTK_HIT      = 0x01;
const M_ATTK_DEF_DIED = 0x02;
const M_ATTK_AGR_DIED = 0x04;
const M_ATTK_MISS     = 0x00;
/* Attack type constants — C ref: nethack-c/include/monattk.h:12-29.
 * THESE MUST BE C'S NUMBERS.  They are compared against the RAW C-numbered
 * rows returned by mon_mattk_raw() (mattackm's switch, pet_has_ranged_attk,
 * the AT_ENGL glomper test), so any JS-local
 * renumbering silently mis-classifies real attack rows and desynchronises the
 * RNG stream in BOTH directions (skipping / inventing rnd(20+i) in mattackm).
 * C numbering is NOT contiguous: 7 is followed by 10, and AT_WEAP/AT_MAGC are
 * 254/255. */
const AT_NONE  = 0;   /* monattk.h:12 — passive monster */
const AT_CLAW  = 1;   /* monattk.h:13 */
const AT_BITE  = 2;   /* monattk.h:14 */
const AT_KICK  = 3;   /* monattk.h:15 */
const AT_BUTT  = 4;   /* monattk.h:16 */
const AT_TUCH  = 5;   /* monattk.h:17 */
const AT_STNG  = 6;   /* monattk.h:18 */
const AT_HUGS  = 7;   /* monattk.h:19 — crushing bearhug */
const AT_SPIT  = 10;  /* monattk.h:20 — spits substance, ranged */
const AT_ENGL  = 11;  /* monattk.h:21 — engulf (swallow or by a cloud) */
const AT_BREA  = 12;  /* monattk.h:22 — breath, ranged */
const AT_EXPL  = 13;  /* monattk.h:23 — explodes, proximity */
const AT_BOOM  = 14;  /* monattk.h:24 — explodes when killed */
const AT_GAZE  = 15;  /* monattk.h:25 — gaze, ranged */
const AT_TENT  = 16;  /* monattk.h:26 — tentacles (melee: in mattackm's
                       *                AT_CLAW/.../AT_TENT fallthrough group) */
const AT_WEAP  = 254; /* monattk.h:28 — uses weapon (melee at distmin<=1) */
const AT_MAGC  = 255; /* monattk.h:29 — magic spell, ranged */
/* Damage type constants — C ref: nethack-c/include/monattk.h:42,61,68,70,74 */
const AD_PHYS  = 0;   /* monattk.h:42 — ordinary physical */
const AD_STCK  = 19;  /* monattk.h:61 — sticks to you (mimic) */
const AD_DGST  = 26;  /* monattk.h:68 — digests opponent (trapper, etc.) */
const AD_WRAP  = 28;  /* monattk.h:70 — special "stick" for eels */
const AD_DRIN  = 32;  /* monattk.h:74 — drains intelligence (mind flayer) */
/* NATTK — max attacks per monster */
const NATTK = 6;
/* Pet attack data for common domestic pets — [mndx, aatyp, adtyp, damn, damd].
 * C ref: nethack-c/include/monsters.h — all starting pets have AT_BITE AD_PHYS d(1,6).
 * C ref: u_init.c pet_type() — starting pets are PM_LITTLE_DOG, PM_DOG, PM_KITTEN, PM_HOUSECAT. */
const PET_ATTK = new Map([
    [16, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_LITTLE_DOG */
    [18, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_DOG */
    [32, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_KITTEN */
    [33, { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 6 }], /* PM_HOUSECAT */
]);

/* -----------------------------------------------------------------------
 * dogfood classification constants (mextra.h dogfood_types)
 * C ref: nethack-c/include/mextra.h
 * ----------------------------------------------------------------------- */
const DOGFOOD = 0;
const CADAVER = 1;
const ACCFOOD = 2;
const MANFOOD = 3;
const APPORT = 4;
/* POISON = 5; UNDEF = 6; TABU = 7 */
const UNDEF   = 6;

/* -----------------------------------------------------------------------
 * Object type constants used by obj_resists / dogfood
 * C ref: nethack-c/include/objclass.h  objects.h
 * ----------------------------------------------------------------------- */
/* obj_resists' special-otyp constants live with its single body in js/zap.js. */
/* oclass constants */
const FOOD_CLASS  = 7;
const COIN_CLASS  = 12;
const BALL_CLASS  = 15;
const CHAIN_CLASS = 16;
const ROCK_CLASS  = 14;
/* C objects[] indices used by dogfood's default TABU checks. */
const AMULET_OF_STRANGULATION_OTYP = 203;
const RIN_SLOW_DIGESTION_OTYP = 193;
const COIN_CLASS_  = 12;        /* alias for clarity in weight() */
const GEM_CLASS   = 13;

/* -----------------------------------------------------------------------
 * Object-weight & monster-load tables — for can_carry() weight gate.
 * C ref: include/objects.h oc_weight column; include/monsters.h SIZ() cwt.
 * Extracted from the C reference objects[] / mons[] arrays (bit-for-bit).
 * OC_WEIGHT[otyp] = objects[otyp].oc_weight (encumbrance, 1cn = 0.1lb).
 * MONS_CWT[mndx]  = mons[mndx].cwt (corpse weight; 0 = corpseless).
 * ----------------------------------------------------------------------- */
const OC_WEIGHT = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,5,30,30,30,35,36,20,25,10,10,10,12,10,5,5,5,20,20,60,120,30,30,30,30,40,40,70,70,40,150,40,60,40,80,50,50,75,150,120,125,60,80,120,150,100,120,180,30,36,120,50,30,20,40,15,15,20,30,30,30,30,3,50,3,30,40,3,4,4,10,40,30,50,50,50,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,40,450,415,450,400,350,150,150,300,300,250,200,250,250,150,30,5,5,3,10,10,10,10,15,10,15,10,10,10,10,30,30,30,40,50,50,100,100,50,10,10,30,10,10,50,20,20,15,20,15,50,20,15,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,20,20,20,20,20,20,20,20,20,20,20,20,20,350,600,900,15,15,15,15,3,4,1,2,2,30,20,20,12,13,150,3,2,5,200,12,4,100,4,15,50,2,200,200,3,3,5,5,18,18,18,18,30,30,30,10,25,25,100,30,20,10,10,10,0,1,1,1,400,5,20,20,20,20,1,1,2,2,2,5,2,2,1,1,5,2,10,2,1,2,5,15,20,10,10,10,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,50,10,50,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,10,500,10,10,10,6000,2500,480,120,1,1,0];
const MONS_CWT = [10,1,20,30,200,1,30,200,600,10,30,30,300,300,300,300,150,400,400,800,500,500,250,850,700,200,600,10,10,10,10,10,150,200,600,600,600,250,600,750,100,1000,1200,500,900,1250,900,900,1450,1450,100,60,20,150,200,300,50,50,50,400,450,500,450,60,300,600,800,600,600,600,400,1000,850,1000,1200,1300,1000,1350,200,400,400,400,2500,1200,2500,2650,3800,3800,20,30,30,40,30,30,50,50,200,50,800,800,1300,1300,1300,1300,1500,1800,0,0,0,0,0,0,600,600,1500,2700,15,300,0,0,1200,900,1450,1450,1450,1450,20,30,40,30,2500,2550,2550,1500,1500,1500,1500,1500,1500,1500,1500,1500,1500,4500,4500,4500,4500,4500,4500,4500,4500,4500,4500,900,0,0,2500,2500,20,50,50,50,50,100,100,650,700,700,750,2250,2250,2200,2250,2250,1700,2250,2300,1500,1300,1450,1450,1450,1450,1200,1200,1200,1200,400,650,850,900,800,1450,1700,2050,500,500,500,500,2600,2600,2600,2600,1600,1700,1700,500,500,400,900,1450,1450,1000,750,50,100,150,250,100,250,800,1000,1200,1200,1500,1200,1450,1450,1450,1200,0,1450,1200,100,1100,1700,1600,1250,1550,400,650,850,900,800,1450,1700,400,2050,300,400,400,450,450,800,900,1400,1550,1900,1800,2000,1450,1450,1450,1450,800,800,800,800,800,800,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1500,1450,1500,900,1500,1500,1500,1500,1500,1500,1450,1450,1450,600,1500,80,60,500,200,200,1800,10,10,30,200,10,100,1450,1500,0,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,2200,1450,1450,1450,1800,1450,1450,1450,4500,1900,4500,1450,1450,750,1450,1450,2250,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450,1450];

/* Carrying-capacity constants — C include/weight.h */
const MAX_CARR_CAP = 1000;
const WT_HUMAN     = 1450;
const MZ_HUMAN     = 2; /* == MZ_MEDIUM */
const MZ_LARGE     = 3;
const MZ_HUGE      = 4;
const STATUE_OTYP  = 476; /* objects.h ROCK_CLASS STATUE (215 was `chest`) */
const ROCK_OTYP    = 474; /* objects.h ROCK */
const HEAVY_IRON_BALL_OTYP = -1; /* not tracked in JS dog path */
const CANDELABRUM_OTYP = 261;
const M2_STRONG    = 0x04000000;
const M2_ROCKTHROW = 0x08000000;
const M1_NOTAKE    = 0x00000800;
const M1_NOHANDS   = 0x00002000;
const M1_MINDLESS  = 0x00010000;
const M1_ANIMAL    = 0x00040000;
/* Tool otyp constants used only by droppables()'s keeper branches, which are
 * dead code for animal/mindless pets (all corpus pets).  Values per the JS otyp
 * space (u_init.js / m_initweap.js); wrong values are harmless for animal pets
 * because the DUMMY keeper sentinel forces a break+default-drop regardless. */
const PICK_AXE_OTYP         = 259;
const DWARVISH_MATTOCK_OTYP = 71;
const UNICORN_HORN_OTYP     = 261;
const SKELETON_KEY_OTYP     = 221;
const LOCK_PICK_OTYP        = 222;
const CREDIT_CARD_OTYP      = 223;
function is_pick_otyp(otyp) {
    return (otyp | 0) === PICK_AXE_OTYP || (otyp | 0) === DWARVISH_MATTOCK_OTYP;
}
const NATTK_       = 6;
/* AT_ENGL: single definition lives in the monattk.h block above (== 11).
 * It used to be re-declared here, colliding with this file's (wrong)
 * AT_TENT = 11 — which made `case AT_ENGL:` in mattackm() dead code. */
const S_DRAGON     = 30;
const S_NYMPH      = 14;
const LARGEST_INT  = 32767;

/* -----------------------------------------------------------------------
 * weight — C ref: mkobj.c:1888 weight(struct obj *).
 * Returns the cached/computed object weight = objects[otyp].oc_weight * quan
 * for the common case; container/statue/corpse/coin special cases follow C.
 * JS objects rarely carry a precomputed owt, so we compute from the table.
 * ----------------------------------------------------------------------- */
function obj_weight(obj) {
    const otyp = obj.otyp | 0;
    const quan = Math.max(1, (obj.quan ?? 1) | 0);
    let wt = (otyp >= 0 && otyp < OC_WEIGHT.length) ? (OC_WEIGHT[otyp] | 0) : 0;

    /* C: globby objects return cached owt as-is.  `globby` and `cobj` are both
     * absent from the sweep's STRUCT_FIELDS['struct obj *'] schema, and that
     * proxy THROWS on an uncaptured field name instead of yielding undefined —
     * so both are probed for existence first, the same way js/mklev.js:3331
     * weight() already probes `globby`.  On live objects this is an ordinary
     * read; the probe only changes behaviour under capture-replay. */
    if (Object.hasOwn(obj, 'globby') && obj.globby)
        return (obj.owt | 0);

    /* C: containers / statue — JS dog path objects are not containers;
     * handle STATUE corpse-weight branch faithfully when corpsenm present. */
    const isContainer = !!(Object.hasOwn(obj, 'cobj') && obj.cobj);
    if (isContainer || otyp === STATUE_OTYP) {
        let stwt = wt;
        if (otyp === STATUE_OTYP && (obj.corpsenm ?? -1) >= 0) {
            const cn = obj.corpsenm | 0;
            const msize = (cn < MONS_MSIZE.length) ? (MONS_MSIZE[cn] | 0) : 0;
            const minwt = (msize + msize + 1) * 100;
            stwt = Math.trunc(3 * ((cn < MONS_CWT.length ? MONS_CWT[cn] : 0) | 0) / 2);
            if (stwt < minwt) stwt = minwt;
            stwt *= quan;
        }
        let cwt = 0;
        for (let c = obj.cobj; c; c = c.nobj) cwt += obj_weight(c);
        /* BAG_OF_HOLDING content scaling omitted: not on the pet path. */
        return stwt + cwt;
    }

    /* C: CORPSE uses cwt of the corpse's monster. */
    if (otyp === CORPSE_OTYP && (obj.corpsenm ?? -1) >= 0) {
        const cn = obj.corpsenm | 0;
        let lwt = quan * ((cn < MONS_CWT.length ? MONS_CWT[cn] : 0) | 0);
        if (lwt > LARGEST_INT) lwt = LARGEST_INT;
        return lwt | 0;
    }
    /* C: FOOD eaten — eaten_stat omitted (oeaten rare on pet-goal path). */
    if ((obj.oclass | 0) === COIN_CLASS_) {
        const cwt = Math.trunc((quan + 50) / 100);
        return Math.max(cwt, 1);
    }
    if (otyp === CANDELABRUM_OTYP && (obj.spe | 0))
        return wt + (obj.spe | 0) * (OC_WEIGHT[20] | 0); /* TALLOW_CANDLE oc_weight */

    return wt ? wt * quan : ((quan + 1) >> 1);
}

/* curr_mon_load — C ref: mon.c:1900. Sum of minvent obj weights, skipping
 * boulders carried by rock-throwers. */
export function curr_mon_load(mtmp) {
    let curload = 0;
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mflags2 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][7] | 0) : 0;
    const rockThrower = (mflags2 & M2_ROCKTHROW) !== 0;
    for (let obj = mtmp.minvent; obj; obj = obj.nobj) {
        if ((obj.otyp | 0) !== BOULDER_OTYP || !rockThrower)
            curload += obj_weight(obj);
    }
    return curload;
}

/* max_mon_load — C ref: mon.c:1914. Strength/size-derived carry capacity. */
export function max_mon_load(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const cwt = (mndx >= 0 && mndx < MONS_CWT.length) ? (MONS_CWT[mndx] | 0) : 0;
    const msize = (mndx >= 0 && mndx < MONS_MSIZE.length) ? (MONS_MSIZE[mndx] | 0) : MZ_HUMAN;
    const mflags2 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][7] | 0) : 0;
    const strong = (mflags2 & M2_STRONG) !== 0;

    let maxload;
    if (!cwt)
        maxload = Math.trunc((MAX_CARR_CAP * msize) / MZ_HUMAN);
    else if (!strong || (strong && cwt > WT_HUMAN))
        maxload = Math.trunc((MAX_CARR_CAP * cwt) / WT_HUMAN);
    else
        maxload = MAX_CARR_CAP;

    if (!strong)
        maxload = Math.trunc(maxload / 2);
    if (maxload < 1)
        maxload = 1;
    return maxload | 0;
}

/* -----------------------------------------------------------------------
 * can_carry — C ref: mon.c:1978.
 * Returns the max number of objects the monster could pick up from the pile
 * (frequently otmp->quan), or 0 if it cannot carry the item at all.
 * RNG-FREE on the pet-goal path (the rn2 branch only fires for stacks
 * exceeding LARGEST_INT, which never happens for a single floor item).
 * The can_touch_safely / artifact / silver checks are simplified: the pet
 * path objects in our corpus are ordinary, so we port the type/hands/weight
 * gates that actually fire and leave the rare touch checks as pass-through.
 * ----------------------------------------------------------------------- */
export function can_carry(mtmp, otmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mflags1 = mrow ? (mrow[6] | 0) : 0;
    const mflags2 = mrow ? (mrow[7] | 0) : 0;
    const mlet    = mrow ? (mrow[0] | 0) : 0;
    const otyp    = otmp.otyp | 0;
    const oclass  = otmp.oclass | 0;
    const newload = obj_weight(otmp);

    /* C: notake(mdat) → can't carry anything */
    if (mflags1 & M1_NOTAKE)
        return 0;

    /* C: can_touch_safely — silver/petrify/artifact gates. JS pet-path
     * objects are ordinary; treat as touchable (no early 0). */

    /* C: iquan = (quan > LARGEST_INT) ? 20000+rn2(...) : quan.
     * Single floor items never exceed LARGEST_INT — no RNG. */
    const quanRaw = (otmp.quan ?? 1) | 0;
    const iquan = (quanRaw > LARGEST_INT)
        ? (20000 + rn2(LARGEST_INT - 20000 + 1))
        : quanRaw;

    /* C: NOHANDS monsters can't pick up multiple objects unless glomper. */
    if (iquan > 1) {
        let glomper = false;
        if (mlet === S_DRAGON && (oclass === COIN_CLASS_ || oclass === GEM_CLASS)) {
            glomper = true;
        } else {
            const attks = mon_mattk_raw(mndx) || [];
            for (let i = 0; i < attks.length && i < NATTK_; i++) {
                if ((attks[i]?.[0] | 0) === AT_ENGL) { glomper = true; break; }
            }
        }
        if ((mflags1 & M1_NOHANDS) && !glomper)
            return 1;
    }

    /* C mon.c:2030-2031 — "steeds don't pick up stuff (to avoid shop abuse)".
     * Read `game.u.usteed`: `game.usteed` has NO writer anywhere in js/, so this
     * guard was permanently false (the misspelled-field-read class). */
    if (mtmp === game.u?.usteed)
        return 0;
    /* C: shopkeepers carry without limit; peaceful-untame carry nothing. */
    if (mtmp.isshk)
        return iquan;
    if (mtmp.mpeaceful && !mtmp.mtame)
        return 0;

    /* C: boulder-throwers carry unlimited boulders. */
    if (((mflags2 & M2_ROCKTHROW) !== 0) && otyp === BOULDER_OTYP)
        return iquan;

    /* C: nymphs take stolen merchandise but not rocks. */
    if (mlet === S_NYMPH)
        return (oclass === ROCK_CLASS) ? 0 : iquan;

    /* C: the weight gate (the seed1800 case). */
    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp))
        return 0;

    return iquan;
}

/* mfndpos return data fields referenced in dogmove */
const ALLOW_M    = 0x00080000;
const ALLOW_MDISP= 0x00001000;
const ALLOW_TRAPS= 0x00020000;
const ALLOW_U    = 0x00040000;
/* C macro Conflict (youprop.h:218) := HConflict || EConflict, i.e.
 * u.uprops[CONFLICT].{intrinsic,extrinsic}.  Same reader js/monmove.js
 * _conflict_mv() and js/mklev.js mon_allowflags use. */
function _conflict_dm() {
    const p = game.u?.uprops?.[CONFLICT_DM];
    return !!(p && (p.intrinsic || p.extrinsic));
}
const ALLOW_ROCK = 0x02000000; /* C mfndpos.h: pushes rocks; not set for ordinary pets */

/* MMOVE return codes (C monmove.h) */
const MMOVE_NOTHING = 0;
const MMOVE_MOVED   = 1;
const MMOVE_DIED    = 2;
const MMOVE_DONE    = 3;

/* Dimension constants */
const COLNO      = 80;
const ROWNO      = 21;
const MTSZ       = 4;
const SQSRCHRADIUS = 5;

/* Dog hunger thresholds (C dogmove.c) */
const DOG_HUNGRY  = 300;
const DOG_WEAK    = 500;
const DOG_STARVE  = 750;

/* -----------------------------------------------------------------------
 * obj_resists — C ref: zap.c:1458-1472.  ONE BODY, in js/zap.js.
 *
 * This file used to carry a SECOND copy, and the copy had DRIFTED: it omitted
 * C's fifth disjunct
 *     || (obj->otyp == CORPSE && is_rider(&mons[obj->corpsenm]))   [zap.c:1462]
 * behind a comment claiming riders were not tracked.  They are — js/zap.js
 * carries the clause against PM_DEATH / PM_PESTILENCE / PM_FAMINE
 * (mondata.h:161-163, is_rider).  Eleven call sites reached the rider-less
 * copy, and at the seven that pass ochance == achance == 0 the special-object
 * list is the ONLY thing that can return TRUE, so the missing clause was the
 * entire discriminator, not an edge case.  C names that intent at two of them:
 * dig.c:2001 "obj_resists(,0,0) prevents Rider corpses from being buried" and
 * invent.c:1445-1447 delobj_core's unforced guard.
 *
 * Re-exported rather than re-implemented so the two bodies cannot drift again.
 * zap.js and this file are already in the same import cycle (zap.js -> mklev.js
 * -> dogmove.js and dogmove.js -> mhitu.js -> zap.js), so the direct edge adds
 * no new cycle; obj_resists is a hoisted function declaration and is never
 * called during module evaluation.
 * ----------------------------------------------------------------------- */
export { obj_resists } from './zap.js';

/* -----------------------------------------------------------------------
 * dogfood — C ref: dog.c:997-1095
 * Returns quality of food for a pet (lower = better).
 * Calls obj_resists (rn2(100)) for each non-special object.
 * ----------------------------------------------------------------------- */
/* FOOD otyp constants (C objects.h ordering; CORPSE=265 anchors the block). */
const TRIPE_RATION_OTYP      = 264;
const CORPSE_OTYP            = 265;
const EGG_OTYP               = 266;
const MEATBALL_OTYP          = 267;
const MEAT_STICK_OTYP        = 268;
const ENORMOUS_MEATBALL_OTYP = 269;
const MEAT_RING_OTYP         = 270;
const APPLE_OTYP             = 277;
const BANANA_OTYP            = 281;
const CARROT_OTYP            = 282;
const CLOVE_OF_GARLIC_OTYP   = 284;
const SLIME_MOLD_OTYP        = 285;
const LUMP_OF_ROYAL_JELLY_OTYP = 286;
const TIN_OTYP               = 296;
const POISON  = 5;
const TABU    = 7;

/* ── Corpse-species classification predicates — C ref dog.c:1067-1087 ──
 * Operate on the corpse's species (fptr = &mons[corpsenm]) and, for cannibalism,
 * the pet's own species (mptr).  No RNG.  Constants from monflag.h / defsym.h.
 */
const M1_ACID      = 0x08000000;
const M1_POIS      = 0x10000000;
const M1_HUMANOID  = 0x00020000;
const M2_UNDEAD    = 0x00000002;
const M2_HUMAN     = 0x00000008;
const M2_ELF       = 0x00000010;
const M2_DWARF     = 0x00000020;
const M2_GNOME     = 0x00000040;
const M2_ORC       = 0x00000080;
const M2_GIANT     = 0x00002000; /* monflag.h:136 (0x200 is M2_MERC) */
/* Monster class symbols (defsym.h MONSYM order; matches _MONS[i][0] mlet). */
const S_BLOB       = 2;
const S_JELLY      = 10;
const S_KOBOLD_C   = 11;
const S_ORC_C      = 15;
const S_VORTEX     = 22;
const S_LIGHT_C    = 25;
const S_ELEMENTAL  = 31;
const S_FUNGUS     = 32;
const S_OGRE       = 41;
const S_GHOST      = 54;
const S_GOLEM      = 55;
/* Special PM indices (canonical pm.generated.js order; same as _MONS). */
const PM_LIZARD_C  = 326;
const PM_LICHEN_C  = 158;
const PM_STALKER_C = 153;       /* "stalker" — the only non-vegan S_ELEMENTAL */
const PM_FLESH_GOLEM_C = 255;   /* flesh golem — non-vegan S_GOLEM */
const PM_LEATHER_GOLEM_C = 253; /* leather golem — non-vegan S_GOLEM */

function _mlet(mndx)  { return (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][0] | 0) : 0; }
function _mf1(mndx)   { return (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0; }
function _mf2(mndx)   { return (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][7] | 0) : 0; }
/* C mondata.h predicates over a species index. */
function _acidic(mndx)      { return (_mf1(mndx) & M1_ACID) !== 0; }
function _poisonous(mndx)   { return (_mf1(mndx) & M1_POIS) !== 0; }
function _humanoid(mndx)    { return (_mf1(mndx) & M1_HUMANOID) !== 0; }
function _is_undead(mndx)   { return (_mf2(mndx) & M2_UNDEAD) !== 0; }
function _is_human(mndx)    { return (_mf2(mndx) & M2_HUMAN) !== 0; }
function _is_elf(mndx)      { return (_mf2(mndx) & M2_ELF) !== 0; }
function _is_dwarf(mndx)    { return (_mf2(mndx) & M2_DWARF) !== 0; }
function _is_gnome(mndx)    { return (_mf2(mndx) & M2_GNOME) !== 0; }
function _is_orc(mndx)      { return (_mf2(mndx) & M2_ORC) !== 0; }
function _is_giant(mndx)    { return (_mf2(mndx) & M2_GIANT) !== 0; }
function _is_golem(mndx)    { return _mlet(mndx) === S_GOLEM; }
function _noncorporeal(mndx){ return _mlet(mndx) === S_GHOST; }
/* C mondata.h is_mind_flayer — mlet S_MIND_FLAYER not needed for early pets;
 * approximate via PM range omitted (no mind-flayer corpses early). */
function _is_mind_flayer(mndx) {
    return (mndx | 0) === 48 /* PM_MIND_FLAYER */
        || (mndx | 0) === 49 /* PM_MASTER_MIND_FLAYER */;
}
/* C mondata.h vegan(ptr): blob/jelly/fungus/vortex/light, S_ELEMENTAL (not stalker),
 * S_GOLEM (not flesh/leather golem), or noncorporeal. */
function _vegan(mndx) {
    const let_ = _mlet(mndx);
    return let_ === S_BLOB || let_ === S_JELLY || let_ === S_FUNGUS
        || let_ === S_VORTEX || let_ === S_LIGHT_C
        || (let_ === S_ELEMENTAL && mndx !== PM_STALKER_C)
        || (let_ === S_GOLEM && mndx !== PM_FLESH_GOLEM_C && mndx !== PM_LEATHER_GOLEM_C)
        || _noncorporeal(mndx);
}
/* C obj.h polyfood(obj): a corpse/egg/tin whose corpsenm can be polymorphed into
 * (pm_to_cham) or whose attacks include AD_POLY.  No early pet eats such a corpse;
 * the only common case is a chameleon corpse.  Conservative: false unless chameleon. */
const PM_CHAMELEON_C = 327;
function _polyfood_corpse(cn) { return cn === PM_CHAMELEON_C; }
/* C mondata.c same_race(pm1, pm2): player races have own predicates, else mlet. */
function _same_race(m1, m2) {
    if (m1 === m2) return true;
    if (_is_human(m1)) return _is_human(m2);
    if (_is_elf(m1))   return _is_elf(m2);
    if (_is_dwarf(m1)) return _is_dwarf(m2);
    if (_is_gnome(m1)) return _is_gnome(m2);
    if (_is_orc(m1))   return _is_orc(m2);
    if (_is_giant(m1)) return _is_giant(m2);
    if (_is_golem(m1)) return _is_golem(m2);
    if (_is_mind_flayer(m1)) return _is_mind_flayer(m2);
    const l1 = _mlet(m1), l2 = _mlet(m2);
    /* C: kobold-zombie/mummy folded into S_KOBOLD; ogre/nymph/centaur/dragon/naga
     * by mlet. For pets without these mlets the cannibalism clause is gated by
     * humanoid(mptr) anyway, so plain mlet equality is sufficient here. */
    if (l1 === S_KOBOLD_C) return l2 === S_KOBOLD_C;
    if (l1 === S_OGRE)     return l2 === S_OGRE;
    return l1 === l2;
}

/* C monst.h ismnum(x): LOW_PM (0) <= x < NUMMONS. _MONS.length == NUMMONS. */
function ismnum_js(x) { return (x | 0) >= 0 && (x | 0) < _MONS.length; }
/* C mkobj.c:2426 peek_at_iced_corpse_age — for a corpse on ice, scale the age.
 * Floor corpses (on_ice=false) just return obj->age; we only reach the ice
 * branch if obj.on_ice is set.  ROT_ICE_ADJUSTMENT = 2 (mkobj.c:2394). */
function peek_at_iced_corpse_age_js(otmp, moves) {
    let retval = otmp.age | 0;
    if ((otmp.otyp | 0) === CORPSE_OTYP && otmp.on_ice) {
        const age = moves - (otmp.age | 0);
        retval += Math.trunc(age * (2 - 1) / 2); /* ROT_ICE_ADJUSTMENT=2 */
    }
    return retval;
}

/* C const: ismnum(x) — valid monster index (0 <= x < NUMMONS). */
export function dogfood(mtmp, obj) {
    /* C dog.c:1002 — poisoned item check (no RNG here, but it GATES the rn2(100)
     * below: returning POISON skips obj_resists entirely).
     *     if (obj->opoisoned && !resists_poison(mon)) return POISON;
     * `opoisoned` IS `otrapped` (obj.h:139) — one bitfield, two spellings — so a
     * TRAPPED CONTAINER is "poisoned" to C's dogfood() and C makes no obj_resists
     * draw for it.  This port spells the two halves as separate JS properties and
     * read only one, so a pet scanning a trapped chest drew an rn2(100) C never
     * draws.  (The `!resists_poison(mon)` conjunct is still missing: js/mklev.js
     * carries a `resists_poison` STUB that shadows the real predicate
     * m_poisongas_ok_resists_poison, so there is nothing correct to call yet.
     * It only matters for a poison-resistant pet, which no corpus pet is.) */
    if (otrapped_of(obj) && !resists_poison(mtmp))
        return POISON;
    /* C dog.c:1004:
     *     if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
     * The `is_quest_artifact(obj) ||` operand was MISSING here, and it is not a
     * redundant predicate: obj_resists (zap.c:1458) draws rn2(100) unconditionally
     * for an ordinary object, so when the object IS the role's quest artifact C
     * short-circuits and that draw never happens, while this port fired it.  Same
     * shape as the befriend_with_obj fix (a031e370): an omitted operand in front of
     * an RNG-CONSUMING sibling is an RNG-sequence defect, not just a predicate one.
     * is_quest_artifact is js/objnam.js's single C-faithful body (questpgr.c:66-70). */
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    /* Classification after obj_resists (no further RNG below).
     * C dog.c:1009-1135 switch(obj->oclass). */
    const oclass = obj.oclass | 0;
    if (oclass === FOOD_CLASS) {
        /* Determine herbivore/carnivore from MONS mflags1 (column 6). */
        const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        const mf1 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0;
        const herbi = !!(mf1 & M1_HERBIVORE);
        const carni = !!(mf1 & M1_CARNIVORE);
        const otyp = obj.otyp | 0;
        /* C dog.c:1033-1034 — neither carni nor herbi: APPORT (or UNDEF if cursed) */
        if (!carni && !herbi)
            return (obj.cursed | 0) ? UNDEF : APPORT;
        /* C dog.c:1037 — starving: a starving tame pet (mhpmax_penalty set). */
        const edog = (mtmp.mtame && mtmp.mextra?.edog) ? mtmp.mextra.edog : null;
        const starving = !!(mtmp.mtame && !(mtmp.isminion | 0) && edog && (edog.mhpmax_penalty | 0));
        /* C dog.c:1040 — mblind: !mcansee && haseyes (kittens have eyes). */
        const mblind = !(mtmp.mcansee | 0); /* haseyes ~ true for early pets */
        /* C dog.c:1045-1054 GHOUL special — no early-game pet is a ghoul; skip. */

        /* C dog.c:1056-1111 switch(obj->otyp): */
        switch (otyp) {
        case TRIPE_RATION_OTYP:
        case MEATBALL_OTYP:
        case MEAT_RING_OTYP:
        case MEAT_STICK_OTYP:
        case ENORMOUS_MEATBALL_OTYP:
            /* C dog.c:1057-1062 */
            return carni ? DOGFOOD : MANFOOD;
        case EGG_OTYP:
            /* C dog.c:1063-1065: PYROLISK egg → POISON for non-fire (rare); else
             * carni ? CADAVER : MANFOOD. */
            return carni ? CADAVER : MANFOOD;
        case CORPSE_OTYP: {
            /* C dog.c:1067-1087 — corpse classification, ported bug-for-bug.
             * fptr = &mons[corpsenm] (the corpse species); mptr = mtmp->data (pet).
             * No RNG fired here; all RNG already consumed by obj_resists above. */
            const fx = (obj.corpsenm ?? -1) | 0; /* CORPSE → corpsenm */
            const fxValid = ismnum_js(fx);       /* C: ismnum(fx) gate (NUMMONS sentinel) */
            const moves = (game.moves ?? 0) | 0;
            /* C: peek_at_iced_corpse_age(obj) — floor corpses (not on ice) return obj->age. */
            const corpseAge = (obj.on_ice ? peek_at_iced_corpse_age_js(obj, moves) : (obj.age | 0));
            const mlet_pet = _mlet(mndx);
            /* C dog.c:1068-1073 — rotted (old) OR acidic OR poisonous → POISON.
             * resists_acid / resists_poison: common early pets (dog/cat) have neither,
             * so the !resists_* guards are TRUE.  (No pet in the corpse cluster resists.) */
            if ((corpseAge + 50 <= moves
                 && !(fx === PM_LIZARD_C || fx === PM_LICHEN_C)
                 && mlet_pet !== S_FUNGUS)
                || (fxValid && _acidic(fx) /* && !resists_acid(mon) */)
                || (fxValid && _poisonous(fx) /* && !resists_poison(mon) */))
                return POISON;
            /* C dog.c:1076 — polyfood corpse, smart tame pet, not starving → MANFOOD. */
            else if (_polyfood_corpse(fx) && (mtmp.mtame | 0) > 1 && !starving)
                return MANFOOD;
            /* C dog.c:1078 — vegan corpse: herbivore eats it (CADAVER), else MANFOOD. */
            else if (fxValid && _vegan(fx))
                return herbi ? CADAVER : MANFOOD;
            /* C dog.c:1082-1085 — cannibalism: humanoid pet, same race, not undead and
             * corpse not kobold/orc/ogre class → starving carnivore non-elf: ACCFOOD else TABU. */
            else if (_humanoid(mndx) && fxValid && _same_race(mndx, fx)
                     && (!_is_undead(mndx) && _mlet(fx) !== S_KOBOLD_C
                         && _mlet(fx) !== S_ORC_C && _mlet(fx) !== S_OGRE))
                return (starving && carni && !_is_elf(mndx)) ? ACCFOOD : TABU;
            /* C dog.c:1087 — default: carnivore → CADAVER, else MANFOOD. */
            else
                return carni ? CADAVER : MANFOOD;
        }
        case TIN_OTYP:
            /* C dog.c:1095-1096: metallivorous ? ACCFOOD : MANFOOD — pets aren't. */
            return MANFOOD;
        case APPLE_OTYP:
            /* C dog.c:1097-1098 */
            return herbi ? DOGFOOD : (starving ? ACCFOOD : MANFOOD);
        case CARROT_OTYP:
            /* C dog.c:1099-1100 */
            return (herbi || mblind) ? DOGFOOD : (starving ? ACCFOOD : MANFOOD);
        case BANANA_OTYP:
            /* C dog.c:1101-1106 */
            return (herbi || starving) ? ACCFOOD : MANFOOD;
        case CLOVE_OF_GARLIC_OTYP:
            /* C dog.c:1091-1094: undead → TABU; else (herbi||starving)?ACCFOOD:MANFOOD. */
            return (herbi || starving) ? ACCFOOD : MANFOOD;
        case LUMP_OF_ROYAL_JELLY_OTYP:
            /* C dog.c:1025-1031 KILLER_BEE special handled at top in C; for other
             * pets it falls through to default below. */
            /* fallthrough to default */
        default:
            /* C dog.c:1107-1111 */
            if (starving)
                return ACCFOOD;
            return (otyp > SLIME_MOLD_OTYP)
                ? (carni ? ACCFOOD : MANFOOD)
                : (herbi ? ACCFOOD : MANFOOD);
        }
    }
    if (oclass === ROCK_CLASS) {
        /* C: ROCK_CLASS → UNDEF */
        return UNDEF;
    }
    /* C default (non-FOOD, non-ROCK):
     * Check for special TABUs before the generic fetch classification.
     * Check for silver hatred, gelatinous cube, metallivorous — stub: skip
     * Key rule: if (!obj->cursed && oclass != BALL && oclass != CHAIN) → APPORT
     *           else FALLTHROUGH to ROCK_CLASS → UNDEF
     * C ref: dog.c:1127-1134 */
    if ((obj.otyp | 0) === AMULET_OF_STRANGULATION_OTYP
        || (obj.otyp | 0) === RIN_SLOW_DIGESTION_OTYP)
        return TABU;
    if (!(obj.cursed | 0) && oclass !== BALL_CLASS && oclass !== CHAIN_CLASS) {
        return APPORT; /* C: uncursed non-ball/chain/rock → pet fetches it */
    }
    return UNDEF; /* C: cursed or ball/chain → UNDEF (same as ROCK_CLASS) */
}

/* -----------------------------------------------------------------------
 * cursed_object_at — C ref: dogmove.c:146-153
 * Returns true if any object at (x,y) is cursed.
 * No RNG.
 * ----------------------------------------------------------------------- */
function cursed_object_at(x, y) {
    const lobj = game.level?.levelObjects?.[x]?.[y];
    for (let o = lobj; o; o = o.nexthere) {
        if (o.cursed)
            return true;
    }
    return false;
}

/* -----------------------------------------------------------------------
 * dog_hunger — C ref: dogmove.c:357-391
 * Returns true if pet starves this turn (which is rare early-game).
 * No RNG in the common case (pet has enough food: moves < hungrytime+DOG_WEAK).
 * ----------------------------------------------------------------------- */
async function dog_hunger(mtmp, edog) {
    const moves = (game.moves ?? 0) | 0;
    if (moves <= (edog.hungrytime | 0) + DOG_WEAK)
        return false;
    const mndx = (mtmp.data?.pmidx ?? mtmp.mnum ?? mtmp.mndx ?? -1) | 0;
    const mf1 = (_MONS[mndx]?.[6] | 0);
    const herbi = !!(mf1 & M1_HERBIVORE);
    const carni = !!(mf1 & M1_CARNIVORE);
    if (!herbi && !carni) {
        edog.hungrytime = moves + DOG_WEAK;
        return false;
    }
    if (!edog.mhpmax_penalty) {
        const oldmax = mtmp.mhpmax | 0;
        const newmax = Math.trunc(oldmax / 3);
        mtmp.mconf = 1;
        edog.mhpmax_penalty = oldmax - newmax;
        mtmp.mhpmax = newmax;
        if ((mtmp.mhp | 0) > newmax)
            mtmp.mhp = newmax;
        if ((mtmp.mhp | 0) < 1) {
            await mondied_dm(mtmp);
            return true;
        }
        if (cansee(mtmp.mx | 0, mtmp.my | 0))
            void pline(`${Monnam_dm(mtmp)} is confused from hunger.`);
        else if (couldsee_vision(mtmp.mx | 0, mtmp.my | 0))
            void pline(`${Monnam_dm(mtmp)} looks hungry.`);
        else
            void pline(`You feel worried about ${mon_nam_dm(mtmp)}.`);
        /* C dogmove.c:389 — hunger confusion interrupts any occupation after
         * the pet's message has been emitted. */
        await stop_occupation_dm();
        return false;
    }
    if (moves > (edog.hungrytime | 0) + DOG_STARVE || (mtmp.mhp | 0) < 1) {
        /* C dogmove.c:352-360 — starvation reports through the leash or
         * player sensation even when the pet itself cannot be seen. */
        if ((mtmp.mleashed | 0) && mtmp !== game.u?.usteed)
            void pline('Your leash goes slack.');
        else if (cansee(mtmp.mx | 0, mtmp.my | 0))
            void pline(`${Monnam_dm(mtmp)} starves.`);
        else
            void pline(`You feel ${game.flags?.hallucination ? 'bummed' : 'sad'} for a moment.`);
        await mondied_dm(mtmp);
        return true;
    }
    return false;
}

/* -----------------------------------------------------------------------
 * obj_extract_self / delobj — remove a floor object from both per-tile
 * nexthere chain and the global fobj nobj chain, then mark it deleted.
 * Mirror of the place_object() linkage in mklev.js (reverse).
 * C ref: mkobj.c obj_extract_self / invent.c delobj_core (the dealloc path).
 * NO RNG here — the obj_resists(obj,0,0) gate is fired by the CALLER
 * (dog_eat) to keep the rn2(100) sequence visible at the call site.
 * ----------------------------------------------------------------------- */
export function obj_extract_floor(obj) {
    if (!obj) return;
    const xi = obj.ox | 0;
    const yi = obj.oy | 0;
    /* per-tile nexthere chain */
    const lvlObjs = game.level?.levelObjects;
    if (lvlObjs?.[xi]) {
        let head = lvlObjs[xi][yi];
        if (head === obj) {
            lvlObjs[xi][yi] = obj.nexthere ?? null;
        } else {
            for (let o = head; o; o = o.nexthere) {
                if (o.nexthere === obj) { o.nexthere = obj.nexthere; break; }
            }
        }
    }
    /* global fobj nobj chain */
    if (game.fobj === obj) {
        game.fobj = obj.nobj ?? null;
    } else {
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nexthere = null;
    obj.nobj = null;
    obj.where = OBJ_FREE;
    // C remove_object updates vision after unlinking a boulder. Another
    // boulder on the same square can still block, hence recalc rather than
    // unconditionally making the square transparent.
    if ((obj.otyp | 0) === BOULDER_OTYP)
        recalc_block_point(xi, yi);
}

/* ----------------------------------------------------------------------------
 * droppables — C dogmove.c:29 droppables(mon).
 * Returns the first object in the monster's inventory it would willingly drop
 * (the pet-fetch "do I have something to drop?" test), or null if it would
 * keep everything.  RNG-FREE.
 *
 * The pick-axe / unicorn-horn / unlocking-tool "keeper" cases let an intelligent
 * tool-using monster hold ONE of each useful tool and treat duplicates as
 * droppable; an animal/mindless pet keeps none (the &dummy stand-ins), so any
 * non-worn, non-wielded item is droppable.  We port the keeper structure with a
 * conservative tool-detector (the corpus's tame pets are dogs/cats — animals —
 * so the keeper branches never fire there; the structure preserves faithfulness
 * for any future tool-using pet).
 * ------------------------------------------------------------------------- */
function MON_WEP_dm(mon) {
    /* C MON_WEP(mon) = mon->mw (the wielded weapon). */
    if (mon.mw) return mon.mw;
    for (let o = mon.minvent; o; o = o.nobj)
        if (((o.owornmask | 0) & W_WEP) !== 0) return o;
    return null;
}
export function droppables(mon) {
    const mndx = (mon.mndx ?? mon.mnum ?? -1) | 0;
    const mrow = (mndx >= 0 && mndx < _MONS.length) ? _MONS[mndx] : null;
    const mflags1 = mrow ? (mrow[6] | 0) : 0;
    const isAnimalOrMindless = !!(mflags1 & (M1_ANIMAL | M1_MINDLESS));

    /* dummy keeper sentinel: a non-null marker meaning "already have one". */
    const DUMMY = { otyp: -1, oartifact: 0, _dummy: true };
    let pickaxe = null, unihorn = null, key = null;
    const wep = MON_WEP_dm(mon);

    if (isAnimalOrMindless) {
        /* won't hang on to any tool — act as if already holding each. */
        pickaxe = unihorn = key = DUMMY;
    } else {
        /* C dogmove.c:50-58 — intelligent pets: keep useful tools.  The
         * tunnels/needspick/nohands/verysmall predicates are not yet wired for
         * the (non-existent in corpus) tool-using pet; default to keeping
         * (pickaxe/key = null) which matches an intelligent humanoid that could
         * use them.  This branch is never reached by the corpus's animal pets. */
        pickaxe = null;
        unihorn = null;
        key = null;
    }
    if (wep) {
        if (is_pick_otyp(wep.otyp)) pickaxe = wep;
        if (wep.otyp === UNICORN_HORN_OTYP) unihorn = wep;
    }

    for (let obj = mon.minvent; obj; obj = obj.nobj) {
        switch (obj.otyp | 0) {
        case DWARVISH_MATTOCK_OTYP:
        case PICK_AXE_OTYP:
            if (!pickaxe || (obj.oartifact && !pickaxe.oartifact)) {
                if (pickaxe) return pickaxe;
                pickaxe = obj; /* keep this digging tool */
                continue;
            }
            break;
        case UNICORN_HORN_OTYP:
            if (obj.cursed) break;
            if (!unihorn || (obj.oartifact && !unihorn.oartifact)) {
                if (unihorn) return unihorn;
                unihorn = obj;
                continue;
            }
            break;
        case SKELETON_KEY_OTYP:
        case LOCK_PICK_OTYP:
        case CREDIT_CARD_OTYP:
            if (!key || (obj.oartifact && !key.oartifact)) {
                if (key) return key;
                key = obj;
                continue;
            }
            break;
        default:
            break;
        }
        /* C dogmove.c:130 — !obj->owornmask && obj != wep → droppable. */
        if (!(obj.owornmask | 0) && obj !== wep)
            return obj;
    }
    return null; /* don't drop anything */
}

/* relobj_dm — C steal.c:880 relobj(mtmp, show, is_pet=TRUE) for a pet.
 * Drops every droppable item to the floor at the pet's tile.  RNG-FREE
 * (mdrop_obj → flooreffects is a no-op for a normal item on a normal tile,
 * place_object/stackobj are linkage).  C mdrop_obj (steal.c:839) plines
 * "<Monnam> drops <obj>." when verbose and the tile is in sight; relobj passes
 * show=TRUE for a pet, so the drop is verbose (seed0014 step 7: "Sirius drops a
 * scroll labeled JUYED AWK YACC."). */
async function relobj_dm(mtmp) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    let otmp;
    while ((otmp = droppables(mtmp)) != null) {
        /* C steal.c:826 — distant_name(obj, doname) FIRST (before extract), for its
         * dknown side-effect AND the printed name ("a scroll labeled ...").  The obj
         * still carries its floor coords (ox,oy) here — set them from the pet's tile so
         * distant_name's near+cansee check resolves (the item is being dropped here). */
        otmp.ox = omx; otmp.oy = omy;
        const objName = await distant_obj_name(otmp);
        /* C steal.c:mdrop_obj — extract_from_minvent then place_object. */
        extract_from_minvent_dm(mtmp, otmp);
        /* C steal.c:839 — verbose && cansee → pline "<Monnam> drops <obj>." */
        if (cansee(omx, omy) && game.flags?.verbose !== false)
            void pline(`${Monnam_dm(mtmp)} drops ${objName}.`);
        /* C steal.c:841-842 — !flooreffects(...) → { place_object(obj,omx,omy); stackobj(obj); }
         * flooreffects is a no-op for a normal item on a normal tile; stackobj merges
         * the dropped item into a like floor pile already present (a previous drop at the
         * same square) so the per-tile object list matches C exactly.  Without it a
         * re-drop leaves two separate piles where C has one (the seed0600 leaf-4432
         * dog_goal floor-scan divergence). */
        place_object(otmp, omx, omy);
        stackobj_dm(otmp);
    }
    // C dog_invent passes minvis as relobj's show flag.
    if (mtmp.minvis && cansee(omx, omy)) newsym(omx, omy);
}

/* relobj_dead_dm — C steal.c:874 relobj(mtmp, show=1, is_pet=FALSE), reached
 * from mon.c:3174 m_detach(mtmp, mptr, TRUE) inside mondead().  A monster that
 * dies on the map drops EVERYTHING it was carrying onto its square; the
 * droppables() filter that lets a live pet keep its wielded/worn gear is the
 * is_pet arm, and a dead monster is never is_pet.
 *
 * This path had no port at all, so a monster killed by another monster took its
 * whole pack with it.  MEASURED on seed0014 step 509: the little dog kills a
 * kobold at (48,9) carrying a quarterstaff and 14 darts.  C emits
 * `^place[79,48,9] ^place[24,48,9]` between mhitm_knockback and corpse_chance
 * and paints ')' on the square; this port painted bare floor.  It is not a
 * cosmetic miss: on the pet's NEXT movemon pass in the same turn, dog_goal's
 * floor scan finds that adjacent pile and reaches the apport gate
 * (`edog->apport > rn2(8)`, dogmove.c:554).  With the pile absent the scan found
 * only a gold pile five squares away that can_reach_location() rejects, so this
 * port fell through to the follow-the-hero arm and drew `rn2(4)`
 * (dogmove.c:575) where C drew `rn2(8)` — the session's first RNG divergence,
 * at leaf 22782.
 *
 * RNG-free.  mdrop_obj's only RNG-capable call is flooreffects(), which draws
 * nothing for an ordinary item falling onto an ordinary square; relobj_dm (the
 * live-pet twin above) omits it for the same reason and this keeps that
 * treatment.  The `mon->isgd` vault-guard gold arm needs a vault guard, which
 * never dies on this path; update_mon_extrinsics is skipped by C itself because
 * `!DEADMONSTER(mon)` is false by the time m_detach runs.
 *
 * C calls distant_name(obj, doname) before extracting each object "for its
 * possible side-effects even if the result might not be printed"; with
 * verbosely FALSE (is_pet && flags.verbose) the string is always discarded here,
 * so only the side-effect is reproduced: get_obj_location() of a minvent object
 * yields the carrier's square, and cansee() + distu() <= neardist there means
 * doname() runs unblinded and sets obj->dknown. */
function relobj_dead_dm(mtmp) {
    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    /* C objnam.c distant_name: r = 2 (no xray), neardist = r*r*2 - r = 6. */
    const nearAndSeen = cansee(omx, omy) && distu(omx, omy) <= 6;
    let otmp;
    while ((otmp = mtmp.minvent) != null) {
        if (nearAndSeen)
            /* C distant_name() reaches observe_object(), which both marks the
             * appearance seen and appends the type to svd.disco[].  Keeping
             * only the dknown bit loses discoveries for gear dropped by a
             * monster killed by a pet (e.g. an iron skull cap). */
            observe_object_dm(otmp);
        /* C steal.c:830 extract_from_minvent(mon, obj, FALSE, TRUE), then the
         * owornmask the dead monster still carries is cleared by place_object's
         * obj_no_longer_held(); clear it here the way relobj_xkilled does. */
        extract_from_minvent_dm(mtmp, otmp);
        otmp.owornmask = 0;
        /* C steal.c:841-843 — !flooreffects(...) → place_object + stackobj. */
        place_object(otmp, omx, omy);
        stackobj_dm(otmp);
    }
    /* C steal.c:895-896 — show && cansee(omx, omy) → newsym(omx, omy).
     * This repaint is immediate even when a --More-- prompt is pending.  It
     * is observably distinct from m_detach's earlier newsym and a subsequent
     * make_corpse repaint: while hallucinating, each call draws a fresh object
     * glyph from the display RNG.  Deferring this call let the tty flush
     * coalesce it with the later corpse repaint, dropping one display draw and
     * shifting every hallucinated monster glyph on the completed turn. */
    if (cansee(omx, omy))
        newsym(omx, omy);
}

/* stackobj_dm — C ref: invent.c:4363-4375 stackobj(obj).
 *
 *     for (otmp = svl.level.objects[obj->ox][obj->oy]; otmp; otmp = otmp->nexthere)
 *         if (otmp != obj && merged(&obj, &otmp))
 *             break;
 *
 * NOTE THE ARGUMENT ORDER, which this port had backwards until 2026-09-10.
 * merged(struct obj **potmp, struct obj **pobj) opens with
 * `struct obj *otmp = *potmp, *obj = *pobj;` (invent.c:815) and then does
 * `otmp->quan += obj->quan` / `obj_extract_self(obj)` — so *potmp is the
 * SURVIVOR and *pobj is the one unlinked.  stackobj passes `&obj` (its own
 * argument, the object just place_object()'d) as *potmp and `&otmp` (the pile
 * member the scan found) as *pobj.  The FRESHLY PLACED object survives; the
 * PILE MEMBER is extracted.  C says so in its own words at mon.c:934:
 * `stackobj(obj); /* 'obj' remains valid if stacking happens *\/`.  Because
 * place_object() prepends, the survivor keeps the HEAD of fobj and the TOP of
 * svl.level.objects[x][y].
 *
 * This function used to call merged_dm(otmp /* pile member *\/, obj /* fresh *\/),
 * i.e. it kept the OLD pile member and deleted the new object, leaving the
 * combined stack at the BOTTOM of the pile and the fobj head unchanged.  That is
 * the same inversion that was found and removed from js/trap.js's file-local
 * `stackobj` shadow, and it is a port of the SAME C function: all three call
 * sites of this one (js/dogmove.js mdrop_obj x2 and js/uhitm.js:3939, all
 * steal.c:839 `stackobj(obj)`; js/eat.js:3119, eat.c:1781 `stackobj(otmp)`)
 * quote plain C stackobj().
 *
 * RNG-free.  mergable() is ported with the food/coin/corpse-relevant fields (the
 * pet drop path drops apport food and gold); the lamp/candle/glob/shop special cases
 * are included to the extent the dropped objects can exercise them. */
export function stackobj_dm(obj) {
    if (!obj) return;
    const xi = obj.ox | 0;
    const yi = obj.oy | 0;
    const head = game.level?.levelObjects?.[xi]?.[yi] ?? null;
    for (let otmp = head; otmp; otmp = otmp.nexthere) {
        /* C merged(&obj, &otmp) -> mergable(otmp=*potmp=obj, obj=*pobj=otmp). */
        if (otmp !== obj && mergable_dm(obj, otmp)) {
            merged_dm(obj, otmp);
            break;
        }
    }
}

/* mergable_dm — C ref: invent.c:4378 mergable(otmp /*into*\/, obj /*combine*\/).
 * Returns true iff `obj` can merge into `otmp`.  oc_merge is the gate: FOOD/POTION/
 * SCROLL/GEM/COIN classes (and stackable weapons) merge.  Coins always merge after
 * the otyp/nomerge gate.  The Blind/Hallucination bknown branch and Cleric-role
 * special-casing are not reachable on the pet-drop path (the dropped items are
 * unidentified-state-matched apport food), so dknown/bknown are compared directly. */
function mergable_dm(otmp, obj) {
    if (obj === otmp || (obj.otyp | 0) !== (otmp.otyp | 0)
        || obj.nomerge || otmp.nomerge || !_oc_merge_dm(obj))
        return false;

    /* coins of the same kind always merge */
    if ((obj.oclass | 0) === COIN_CLASS_)
        return true;

    if ((obj.cursed | 0) !== (otmp.cursed | 0) || (obj.blessed | 0) !== (otmp.blessed | 0))
        return false;

    /* how_lost (LOST_EXPLODING etc.) — not tracked on the pet path; both undefined → equal */
    if ((obj.how_lost | 0) !== (otmp.how_lost | 0))
        return false;

    if (obj.globby)
        return true;

    if ((obj.unpaid | 0) !== (otmp.unpaid | 0) || (obj.spe | 0) !== (otmp.spe | 0)
        || (obj.no_charge | 0) !== (otmp.no_charge | 0) || (obj.obroken | 0) !== (otmp.obroken | 0)
        || otrapped_of(obj) !== otrapped_of(otmp) || (obj.lamplit | 0) !== (otmp.lamplit | 0))
        return false;

    if ((obj.oclass | 0) === FOOD_CLASS
        && ((obj.oeaten | 0) !== (otmp.oeaten | 0) || (obj.orotten | 0) !== (otmp.orotten | 0)))
        return false;

    if ((obj.dknown | 0) !== (otmp.dknown | 0)
        || (obj.oeroded | 0) !== (otmp.oeroded | 0) || (obj.oeroded2 | 0) !== (otmp.oeroded2 | 0)
        || (obj.greased | 0) !== (otmp.greased | 0))
        return false;

    if ((obj.oerodeproof | 0) !== (otmp.oerodeproof | 0))
        return false;

    const ot = obj.otyp | 0;
    if (ot === CORPSE_OTYP || ot === EGG_OTYP || ot === TIN_OTYP) {
        if ((obj.corpsenm ?? -1) !== (otmp.corpsenm ?? -1))
            return false;
    }
    /* hatching eggs / revivable corpses don't merge — timed/reviver flags not
     * tracked here; corpsenm equality above is the dominant gate for the drop path. */
    if (ot === EGG_OTYP && (obj.timed || otmp.timed))
        return false;

    return true;
}

/* _oc_merge_dm — C objects[otyp].oc_merge.  Class-proxy: FOOD/POTION/SCROLL/GEM/COIN
 * merge class-wide, plus stackable weapon ammo.  Mirrors objnam.js _OC_MERGE_CLASSES.
 * The dropped pet-apport items are FOOD/COIN, which this admits. */
const _POTION_CLASS_DM = 8, _SCROLL_CLASS_DM = 9, _WEAPON_CLASS_DM = 2;
function _oc_merge_dm(obj) {
    const oc = obj.oclass | 0;
    return oc === FOOD_CLASS || oc === _POTION_CLASS_DM || oc === _SCROLL_CLASS_DM
        || oc === GEM_CLASS || oc === COIN_CLASS_ || oc === _WEAPON_CLASS_DM;
}

/* merged_dm — C ref: invent.c:813 merged(struct obj **potmp, struct obj **pobj),
 * called here as C's stackobj does: merged(&survivor, &victim).  The FIRST
 * parameter is *potmp, the survivor; the SECOND is *pobj, the one extracted.
 * (This comment used to read "merged(&otmp, &obj)", which is not what
 * invent.c:4372 writes — it writes merged(&obj, &otmp).)  otmp absorbs obj's quantity
 * (and approximate age for non-lit/non-glob), then obj is extracted from the per-tile
 * + global floor chains and marked deleted.  No RNG. */
function merged_dm(otmp, obj) {
    if (!obj.lamplit && !obj.globby
        && (otmp.quan | 0) + (obj.quan | 0) > 0
        && (otmp.age != null || obj.age != null)) {
        const oa = otmp.age | 0, oq = otmp.quan | 0, ba = obj.age | 0, bq = obj.quan | 0;
        otmp.age = Math.trunc((oa * oq + ba * bq) / (oq + bq));
    }
    if (!otmp.globby)
        otmp.quan = (otmp.quan | 0) + (obj.quan | 0);
    /* C invent.c merged: coins refresh owt+clear bknown; otherwise refresh owt
     * unless pudding (globby).  Puddings are globby on the JS side. */
    if ((otmp.oclass | 0) === COIN_CLASS_) {
        otmp.owt = obj_weight(otmp);
        otmp.bknown = 0;
    } else if (!otmp.globby) {
        otmp.owt = obj_weight(otmp);
    }
    /* obj_extract_self(obj): unlink from per-tile nexthere + global fobj, mark deleted. */
    const xi = obj.ox | 0, yi = obj.oy | 0;
    const lvlObjs = game.level?.levelObjects;
    if (lvlObjs?.[xi]) {
        let h = lvlObjs[xi][yi];
        if (h === obj) {
            lvlObjs[xi][yi] = obj.nexthere ?? null;
        } else {
            for (let o = h; o; o = o.nexthere) {
                if (o.nexthere === obj) { o.nexthere = obj.nexthere; break; }
            }
        }
    }
    if (game.fobj === obj) {
        game.fobj = obj.nobj ?? null;
    } else {
        for (let o = game.fobj; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nexthere = null;
    obj.nobj = null;
    obj.where = OBJ_DELETED;
}

/* extract_from_minvent — unlink obj from mon->minvent (RNG-free). */
export function extract_from_minvent_dm(mon, obj) {
    if (mon.minvent === obj) {
        mon.minvent = obj.nobj ?? null;
    } else {
        for (let o = mon.minvent; o; o = o.nobj) {
            if (o.nobj === obj) { o.nobj = obj.nobj; break; }
        }
    }
    obj.nobj = null;
    obj.ocarry = null;
    obj.where = OBJ_FREE;
}

/* "Your kitten" / "Sirius" — C noit_Monnam(mtmp) for a tame, hero-owned pet.
 * Unnamed tame pet → "Your {species}".  Named pet → the given name.
 * mon_nam_dm gives "the {species}"; convert leading "the " → "Your ". */
function noit_Monnam_dm(mtmp) {
    /* `'mgivenname' in mtmp` (Reflect.has, no get trap) safely reports false
     * on a replay-reconstructed monst whose strict proxy never captured a
     * top-level mgivenname — avoids the "field not captured" throw that a
     * bare `mtmp?.mgivenname` read would trigger via the proxy's get trap. */
    const givenname = mtmp?.mextra?.mgivenname
        || (('mgivenname' in mtmp) ? mtmp.mgivenname : '') || '';
    if (givenname) return givenname;
    const s = mon_nam_dm(mtmp); /* "the kitten" / "it" */
    if (s.startsWith('the ') && (mtmp.mtame | 0))
        return 'Your ' + s.slice(4);
    /* noit_Monnam keeps a tame pet's species even when x_monnam's
     * visibility-driven do_it branch returned "it". */
    if (s === 'it' && (mtmp.mtame | 0)) {
        const species = mtmp.data?.pmnames?.[2] || mtmp.data?.mname || '';
        if (species) return 'Your ' + species;
    }
    if (s.startsWith('the '))
        return 'The ' + s.slice(4);
    return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Object name as produced by distant_name(obj, doname) for the common
 * floor object the pet eats.  Early-game pets eat corpses: "a {species} corpse".
 * C ref: objnam.c doname → "a jackal corpse". */
async function dog_obj_name(obj) {
    const otyp = obj.otyp | 0;
    if (otyp === CORPSE_OTYP) {
        const sp = obj_pmname_dm(obj);
        const base = sp ? sp + ' corpse' : 'corpse';
        return 'a ' + base;
    }
    /* C ref: objects.h:936 MIRROR (otyp 230) OBJ_NAME "mirror", unidentified
     * DESCR "looking glass".  A pet handles it before the hero identifies it, so
     * doname renders the appearance: "a looking glass" (seed3300 — "The little
     * dog picks up a looking glass."). */
    if (otyp === 230 /* MIRROR */)
        return 'a looking glass';
    /* C ref: dogmove.c:287/292 obj_name = distant_name(obj, doname) — the FULL
     * doname, for every object class.  This fallback used to return the literal
     * "something", so seed0012 step 36 printed "Your little dog eats something."
     * where C printed "Your little dog eats a tripe ration.".  js/objnam.js's
     * real doname() covers every class; the two arms above are kept ahead of it
     * only because they are the ones this file's own corpus frames are pinned
     * on, not because doname cannot do them. */
    return await distant_name(obj, doname);
}

/* top_floor_obj — the head object of the per-tile pile at (x,y).  C uses
 * vobj_at(nix,niy) (the remembered object via glyph) but on the common visible
 * floor pile that is the pile head; we read the live head. */
function top_floor_obj(x, y) {
    return game.level?.levelObjects?.[x | 0]?.[y | 0] ?? null;
}

/* an_dm — indefinite-article helper (C hacklib.c an()): "a"/"an" by first letter.
 * Names already carrying their own article ("the …") are returned verbatim. */
function an_dm(word) {
    if (!word) return 'an it';
    if (/^[aeiouAEIOU]/.test(word)) return 'an ' + word;
    return 'a ' + word;
}

/* distant_obj_name — C's `distant_name(otmp, doname)`.
 *   dogmove.c:457   char *otmpname = distant_name(otmp, doname);
 *   steal.c:826     (the same call, in mdrop_obj, for the pet-drops message)
 *
 * THE WHOLE BODY IS NOW THAT ONE CALL, which is what C's is.  It used to be a
 * hand-rolled near/far test followed by seven class-specific arms, each of
 * which called its formatter DIRECTLY -- and calling the formatter directly is
 * exactly the bypass distant_name() exists to prevent.  On the FAR branch C
 * brackets the call with ++gd.distantname / --gd.distantname
 * (objnam.c:401-403); xname_flags() reads that counter at objnam.c:627
 * (`if (!Blind && !gd.distantname) observe_object(obj);`) and observe_object
 * (o_init.c:442-451) sets obj->dknown = 1.  So a bare formatter call marks an
 * object the pet picked up across the room permanently identified, and the
 * GEM_CLASS arm (objnam.c:914-928) then renders "an orange gem" where C
 * renders "a gem".  Commit 06da5b5bb closed the generic fallback; the seven
 * class arms below it were still bypassing, and now do not: they run INSIDE
 * distant_name()'s bracket, as func.
 *
 * Three further corrections come free with delegating the near/far test to the
 * real distant_name(), because the hand-rolled one differed from C on all
 * three:
 *   - it set obj.dknown = true UNCONDITIONALLY on the near branch.  C never
 *     assigns dknown here at all; it reaches it only through observe_object(),
 *     which is gated on !Blind (objnam.c:627) and, inside observe_object
 *     itself, on !Hallucination (o_init.c:447).  A blind or hallucinating hero
 *     was identifying objects a pet walked over.
 *   - it omitted C's `obj->oartifact ||` disjunct (objnam.c:387-388), so an
 *     artifact took the far branch at any distance -- C treats an artifact as
 *     near unconditionally, precisely so find_artifact() runs.
 *   - it read obj.ox / obj.oy directly, where C calls get_obj_location()
 *     (zap.c:654-688), whose OBJ_MINVENT arm answers with the CARRIER's
 *     square.  relobj_dm() above compensates by fabricating ox/oy on an object
 *     that is still in the pet's minvent; that fabrication is now redundant
 *     for this path (distant_name reads obj.where / obj.ocarry) but is left
 *     in place because it is out of this change's scope and harmless --
 *     place_object() overwrites both fields moments later. */
export async function distant_obj_name(obj) {
    return await distant_name(obj, _dm_doname);
}

/* The `func` C passes distant_name() at every call site in this file is plain
 * doname().  This is that doname -- plus the per-class scaffolding this port
 * still needs, because js/objnam.js's doname() does not yet name every class
 * the way doname_base() does (hoisting doname above ALL the arms measures -3
 * step points on seed0383; see the POTION note below).  Being `func` rather
 * than the caller is the entire point: gd.distantname is up while this runs
 * whenever the object is not near-and-visible. */
async function _dm_doname(obj) {
    /* C objnam.c:627-630 -- xname_flags()'s prologue, the two mutations a
     * formatting call performs before it formats anything:
     *     if (!Blind && !gd.distantname)
     *         observe_object(obj);
     *     if (Role_if(PM_CLERIC))
     *         obj->bknown = 1;
     * js/objnam.js's _xn_ctx() has both, under its `side_effects` flag -- but
     * every per-class entry point below (xname_scroll / xname_armor /
     * xname_amulet / doname_potion) passes side_effects = FALSE, so an arm that
     * answers here instead of falling through to doname() would perform
     * neither.  That is what the deleted `obj.dknown = true` was standing in
     * for, ungated.  observe_object() is idempotent (discover_object guards on
     * its own wasKnown/wasEncountered flags) and draws no RNG with
     * credit_hero = false, so the second call the doname() fallthrough makes is
     * a no-op. */
    if (!_dm_Blind() && !in_distant_name())
        observe_object_dm(obj);
    if (_dm_Role_if_cleric())
        obj.bknown = 1;

    const otyp = obj.otyp | 0;
    if (otyp === CORPSE_OTYP) {
        const sp = obj_pmname_dm(obj);
        return an_dm(sp ? sp + ' corpse' : 'corpse');
    }
    /* The SCROLL_CLASS_DM arm that stood here is GONE.  It called xname_scroll()
     * directly and wrapped the bare name with an_dm()/a plural "s", which is
     * only xname_flags()'s SCROLL_CLASS case (objnam.c:854-869) -- it never
     * reached doname_base's BUC-word prefix (objnam.c:1321-1348), so an
     * identified, bknown-but-uncursed scroll lost its "uncursed " word.
     * MEASURED on gen606-grammar-seed1454339 step 117: C prints "The kitten
     * picks up an uncursed scroll of magic mapping." and this arm answered
     * "a scroll of magic mapping." js/objnam.js's doname() already implements
     * xname()+BUC+count for SCROLL_CLASS via the shared xname_flags() switch
     * arm (no scroll-specific case is needed in doname_base's own per-class
     * switch; objnam.c has none either), and this same function already falls
     * through to that real doname(obj) call below for any class not
     * special-cased above it. Scrolls now fall through to doname() at the foot
     * of this function, which is C's own distant_name(otmp, doname). */
    /* C dogmove.c:457 distant_name(otmp, doname) — doname() already returns the
     * complete string (article/count + BUC + xname) for a POTION_CLASS object
     * (objnam.c doname_base POTION_CLASS branch), unlike the scroll/weapon/food
     * cases above which build the article around a bare xname.  Without this
     * branch a floor potion fell through to dog_obj_name's corpse-only fallback,
     * which misreads the unrelated obj.corpsenm field as a monster index and
     * names the potion after whatever species happens to sit at that index
     * (seed0003 step 145/146: a potion of healing shown as "a giant ant",
     * producing a topline 8 chars shorter than C's and skipping the --More--
     * width boundary C pages at). */
    if ((obj.oclass | 0) === POTION_CLASS_DM)
        return doname_potion(obj);
    /* The WEAPON_OTYP_NAMES arm that stood here is GONE.  It knew three otyps
     * ({arrow, dart, rock}) and no prefixes at all, and it PRE-EMPTED the real
     * doname() below for every one of them.  MEASURED on seed0383 step 203: C
     * prints "The Grey-elf picks up 6 poisoned darts." and this arm answered
     * "6 darts" — doname_base's `if (obj->opoisoned) Strcat(prefix, "poisoned ")`
     * (objnam.c) never ran, because doname was never reached.  Weapons now fall
     * through to doname() at the foot of this function, which is C's own
     * distant_name(otmp, doname).
     *
     * The other partial arms are left in place deliberately: hoisting doname()
     * above ALL of them measures -3 step points (205 -> 202 on this session),
     * because js/objnam.js's doname does not yet name a floor POTION the way
     * doname_potion does and the pline goes missing entirely (seed0383 step 139,
     * C "The genetic engineer picks up a potion."). One class at a time, each
     * measured. */
    /* C objnam.c xname FOOD_CLASS → the OBJ_NAME (e.g. "food ration").  A pet
     * fetching/dropping a ration (seed1150 "Slasher picks up a food ration.")
     * doname()s to "a food ration"; a stack pluralizes ("N food rations"). */
    const fn = FOOD_OTYP_NAMES[otyp];
    if (fn) {
        const q = (obj.quan | 0);
        return (q > 1) ? `${q} ${fn}s` : an_dm(fn);
    }
    /* C objnam.c:796-798 xname COIN_CLASS → "gold piece"; doname (objnam.c:1283-
     * 1298) prefixes "N " when quan!=1 (pluralizing → "gold pieces") else "a ". */
    if ((obj.oclass | 0) === COIN_CLASS) {
        const q = (obj.quan | 0);
        return (q !== 1) ? `${q} gold pieces` : an_dm('gold piece');
    }
    /* C objnam.c:763-778 xname ARMOR_CLASS → the appearance name for an
     * unidentified armor (e.g. orcish helm doname()s to "an iron skull cap").
     * A pet dropping/lifting a floor armor (seed0600 — "The little dog drops an
     * iron skull cap.") formats through doname; without this it fell through to
     * dog_obj_name → "something", making the topline shorter than C so the
     * --More-- page count desynced and a page-ack keystroke leaked to rhack.
     * The dknown side-effect above (near+cansee) is already applied, so
     * xname_armor sees the same discovery state C's distant_name/doname does. */
    if ((obj.oclass | 0) === _ARMOR_CLASS_DM) {
        const an = xname_armor(obj);
        const q = (obj.quan | 0);
        return (q > 1) ? `${q} ${an}s` : an_dm(an);
    }
    /* C objnam.c AMULET_CLASS xname branch → "<descr> amulet" for an
     * unidentified amulet (e.g. "hexagonal amulet"); doname wraps the article.
     * Without this an amulet fell through to dog_obj_name's corpse-only
     * fallback → "something" (seed0365 step 42: JS "The saddled pony picks up
     * something.--More--" vs C "The saddled pony picks up a hexagonal
     * amulet.--More--"; the same object drops again at step 44).  The dknown
     * side-effect above (near+cansee) is already applied, so xname_amulet sees
     * the same discovery state C's distant_name/doname does. */
    if ((obj.oclass | 0) === _AMULET_CLASS_DM) {
        const am = xname_amulet(obj);
        const q = (obj.quan | 0);
        return (q > 1) ? `${q} ${am}s` : an_dm(am);
    }
    /* C ref: dogmove.c:457 distant_name(otmp, doname) — doname() names EVERY
     * class; the arms above are a hand-scoped partial and anything they miss
     * fell through to dog_obj_name, whose last resort misreads obj.corpsenm as
     * a species index and otherwise yields the literal "something".  A topline
     * that is short by the whole object name shifts every later --More-- page
     * boundary, so the wrong name costs keystroke sync, not just text:
     * seed0030 segment 7 step 68 has C "The saddled pony picks up a shining
     * spellbook." against JS "The saddled pony picks up something."
     *
     * This used to re-derive `xname() + an()/count` here, which is only
     * doname_base's LAST two steps: it drops every prefix doname builds before
     * them — the BUC word and the enchantment.  seed0116 step 85 has C "The
     * kitten picks up a blessed +1 quarterstaff." against JS "The kitten picks
     * up a quarterstaff." (and the same at the matching drop, step 86).
     * js/objnam.js's doname() IS the ported doname_base, so call it; it runs
     * AFTER every arm above, so nothing they already name changes name.
     * RNG-free.
     *
     * MUST go through distant_name(obj, doname), not a bare doname(obj) call.
     * C's own dog_invent (dogmove.c:457) never calls doname() directly — it
     * calls distant_name(otmp, doname), which wraps the formatter in the
     * gd.distantname counter (objnam.c:401-403) whenever the object is NOT
     * near-and-visible.  js/objnam.js's doname()->...->xname_flags() reads
     * that counter at objnam.c:627-628 / js/objnam.js:4211
     * (`if (!Blind && !gd.distantname) observe_object(obj);`) to decide
     * whether to mark the object's TYPE discovered (dknown=1).  A bare
     * doname(obj) call leaves gd_distantname at 0 even for a FAR object, so
     * observe_object() fires unconditionally and wrongly sets dknown=true —
     * confirmed by instrumentation: a floor gem at distu=26 (neardist=6, so
     * genuinely far) read dknownBefore:0, dknownAfter:1 after this call, and
     * js/objnam.js's GEM_CLASS arm (:4466 `if (!c.dknown) buf = rock;`) then
     * takes the KNOWN branch and renders the appearance descriptor ("an
     * orange gem") instead of C's generic "a gem". distant_name() is already
     * imported (line 23) and used correctly elsewhere in this file (line
     * 955, 1687 indirectly via this function).
     *
     * THAT WRAPPING NOW HAPPENS ONE LEVEL UP, in distant_obj_name(), so this
     * is a plain doname() again -- it IS the `func` distant_name() was handed,
     * and re-entering distant_name() here would repeat the near/far test the
     * caller has already made. */
    const generic = await doname(obj);
    if (generic)
        return generic;
    /* fallback: reuse dog_obj_name's generic form (rare off-corpse case). */
    return await dog_obj_name(obj);
}

/* C youprop.h:103 Blind -- (HBlind || EBlind) && !blocked.  Mirrors
 * js/objnam.js's own _Blind(); this port has no single shared property
 * accessor (that file's comment says so, and lists three other copies). */
function _dm_Blind() {
    const p = game.u && game.u.uprops ? game.u.uprops[BLINDED_DM] : null;
    if (!p) return false;
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
/* C hack.h Role_if(PM_CLERIC).  Same shape as js/objnam.js's _Role_if(): this
 * port carries the role as an INDEX into role.c's roles[] (flags.initrole),
 * not as a PM_ monster number.  PM_CLERIC is role index 6. */
const _ROLE_IDX_PRIEST_DM = 6;
function _dm_Role_if_cleric() {
    const g = game;
    const ir = (g.flags && g.flags.initrole != null) ? (g.flags.initrole | 0) : -1;
    if (ir >= 0) return ir === _ROLE_IDX_PRIEST_DM;
    return ((g.urole && g.urole.mnum != null) ? (g.urole.mnum | 0) : -1) === _ROLE_IDX_PRIEST_DM;
}
const _ARMOR_CLASS_DM = 3; /* C ARMOR_CLASS */
const _AMULET_CLASS_DM = 5; /* C AMULET_CLASS */
const SCROLL_CLASS_DM = 9; /* C SCROLL_CLASS */
const POTION_CLASS_DM = 8; /* C POTION_CLASS */
/* Minimal weapon otyp → base name (objects.h order) for the floor objects a pet
 * may pick up / step onto in the corpus.  DART=24 is the dart-trap missile. */
const WEAPON_OTYP_NAMES = { 18: 'arrow', 24: 'dart', 474: 'rock' };
/* Food-class OBJ_NAMEs (objects.h FOOD macro order) for floor food a pet may
 * fetch/drop.  FOOD_RATION=293 is the common starting ration. */
const FOOD_OTYP_NAMES = { 293: 'food ration', 264: 'tripe ration' };

/* is_flyer / is_floater — C mondata.h:19-20.  is_floater is mlet S_EYE/S_LIGHT. */
function is_flyer_dm(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const f1 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0;
    return (f1 & 0x00000001) !== 0; /* M1_FLY */
}
function is_floater_dm(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const mlet = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][0] | 0) : 0;
    return mlet === 5 /* S_EYE */ || mlet === S_LIGHT_C;
}

/* locomotion_step — C mondata.c:1380 locomotion(ptr, "step"), lower-case form.
 * Walkers (the common pet) return the default verb; vtense(NULL,"step")="steps".
 * Floaters "levitate", small flyers "fly", large flyers "fly".  amorphous/
 * slithy/limbless/immobile variants are not reached by an early-game kitten. */
function locomotion_step(mtmp) {
    if (is_floater_dm(mtmp)) return 'levitates';
    if (is_flyer_dm(mtmp)) return 'flies';
    return 'steps'; /* vtense of "step" */
}

/* -----------------------------------------------------------------------
 * dog_nutrition — C ref: dogmove.c:155-215.  Fires NO RNG.
 *
 * Sets mtmp->meating (how many turns the pet is busy chewing) and returns the
 * nutrition credited to edog->hungrytime.  meating is NOT cosmetic: C's
 * m_move() (monmove.c:1743) returns MMOVE_DONE for an eating monster BEFORE the
 * `mtmp->mtame -> dog_move()` branch at monmove.c:1772, so every turn of meating
 * suppresses the pet's ENTIRE dog_move RNG block (dog_invent's dogfood scan,
 * dog_goal's fobj sweep + rn2(8)/rn2(4), and the mfndpos selection loop).
 * A meating that is too short therefore restarts the pet's RNG early and slides
 * the whole stream — seed0014 step 51, where a goblin corpse (cwt 400) gives
 * C meating = 3 + (400>>6) = 9 turns of silence and JS's hardcoded 3 gave 3.
 *
 * `mons[].cwt` is MONS_CWT above (already in this file, verified equal to the
 * generated eat_corpse_data.json cwt column); cnutrit and objects[].oc_delay /
 * oc_nutrition come from js/food_props.js.
 * ----------------------------------------------------------------------- */
export function dog_nutrition(mtmp, obj) {
    let nutrit;

    /* C dogmove.c:165-194 */
    if ((obj.oclass | 0) === FOOD_CLASS) {
        if ((obj.otyp | 0) === CORPSE_OTYP) {
            /* C:166-167 meating = 3 + (mons[corpsenm].cwt >> 6); nutrit = cnutrit */
            const cn = obj.corpsenm | 0;
            const cwt = (cn >= 0 && cn < MONS_CWT.length) ? (MONS_CWT[cn] | 0) : 0;
            mtmp.meating = 3 + (cwt >> 6);
            nutrit = mons_cnutrit(cn);
        } else {
            /* C:169-170 meating = oc_delay; nutrit = oc_nutrition */
            mtmp.meating = oc_delay(obj.otyp | 0);
            nutrit = oc_nutrition(obj.otyp | 0);
        }
        /* C:172-192 msize multiplier on nutrit (NOT on meating) */
        const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        const msize = (mndx >= 0 && mndx < MONS_MSIZE.length)
            ? (MONS_MSIZE[mndx] | 0) : MZ_MEDIUM;
        switch (msize) {
        case MZ_TINY:     nutrit *= 8; break;
        case MZ_SMALL:    nutrit *= 6; break;
        case MZ_LARGE:    nutrit *= 4; break;
        case MZ_HUGE:     nutrit *= 3; break;
        case MZ_GIGANTIC: nutrit *= 2; break;
        case MZ_MEDIUM:
        default:          nutrit *= 5; break;
        }
        /* C:193-196 partly-eaten food scales BOTH meating and nutrit */
        if (obj.oeaten | 0) {
            mtmp.meating = eaten_stat(mtmp.meating | 0, obj);
            nutrit = eaten_stat(nutrit, obj);
        }
    } else if ((obj.oclass | 0) === COIN_CLASS) {
        /* C:197-203 */
        mtmp.meating = Math.trunc((obj.quan | 0) / 2000) + 1;
        if ((mtmp.meating | 0) < 0) mtmp.meating = 1;
        nutrit = Math.trunc((obj.quan | 0) / 20);
        if (nutrit < 0) nutrit = 0;
    } else {
        /* C:204-213 unusual pet eating odd stuff (e.g. gelatinous cube).
         * NOTE C uses obj->owt (the instance weight) for meating here, but
         * objects[otyp].oc_nutrition (the STATIC column) for nutrit — capture
         * rec#16 pins the difference: owt 351 vs oc_nutrition 350.
         *
         * KNOWN GAP: js/food_props.js only carries the FOOD_CLASS oc_nutrition
         * rows, so nutrit is 0 for every non-food class here.  This is what the
         * dog_nutrition capture-replay sweep reports as 15/20 diverged (all 15
         * are this branch; the 5 FOOD/COIN records pass exactly).  Closing it
         * needs the full objects[] oc_nutrition column, which is per-class from
         * the objects.h macros — WEAPON/ARMOR/TOOL/CONTAINER/WEPTOOL = oc_weight,
         * RING 15, AMULET 20, POTION 10, SCROLL 6, SPBOOK 20, WAND 30, COIN 0 —
         * EXCEPT GEM_CLASS (gems and rocks), whose GEM()/ROCK() rows each carry
         * their own `nutr` literal and so need a real per-otyp table.
         * Unreachable from the corpus today: JS calls dog_nutrition only from
         * dog_eat, and no corpus session has a pet eat a non-food object. */
        mtmp.meating = Math.trunc((obj.owt | 0) / 20) + 1;
        nutrit = 5 * oc_nutrition(obj.otyp | 0);
    }
    return nutrit;
}

/* -----------------------------------------------------------------------
 * dog_eat — C ref: dogmove.c:218-342
 * The pet eats a floor object (typically a corpse).  Returns 1 (ate, counts
 * as the dog's move) or 2 (pet died — not modelled for the corpse path).
 *
 * RNG order (verified against seed0070 trace, kitten eats jackal corpse):
 *   1. dogfood(mtmp, obj)  [dogmove.c:319]      → obj_resists(0,95) → rn2(100)
 *   2. m_consume_obj → delobj → delobj_core      → obj_resists(0,0)  → rn2(100)
 *      [mon.c:1409 → invent.c:1446]
 * dog_nutrition (dogmove.c:233) fires NO rng for a corpse.
 * The "Your kitten eats a jackal corpse." pline fires BETWEEN the move-choice
 * and the two obj_resists (C order: pline at 293-294, then dogfood, then delobj).
 * ----------------------------------------------------------------------- */
export async function dog_eat(mtmp, obj, x, y, devour) {
    const edog = (mtmp.mtame && mtmp.mextra?.edog) ? mtmp.mextra.edog : null;
    const moves = (game.moves ?? 0) | 0;

    /* C dogmove.c:231-232: edog->hungrytime = max(hungrytime, moves) */
    if (edog && (edog.hungrytime | 0) < moves)
        edog.hungrytime = moves;

    /* C dogmove.c:233: nutrit = dog_nutrition(mtmp, obj).  No RNG. */
    let nutrit = dog_nutrition(mtmp, obj);

    if (devour) {
        if ((mtmp.meating | 0) > 1) mtmp.meating = Math.trunc(mtmp.meating / 2);
        if (nutrit > 1) nutrit = Math.trunc((nutrit * 3) / 4);
    }
    if (edog) edog.hungrytime = (edog.hungrytime | 0) + nutrit;
    mtmp.mconf = 0;
    /* C dogmove.c:245-249 mhpmax_penalty restore — early game: none. */
    if (edog && (edog.mhpmax_penalty | 0)) {
        mtmp.mhpmax = (mtmp.mhpmax | 0) + (edog.mhpmax_penalty | 0);
        edog.mhpmax_penalty = 0;
    }
    /* C dogmove.c:251-252 mflee halving */
    if ((mtmp.mflee | 0) && (mtmp.mfleetim | 0) > 1)
        mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    /* C dogmove.c:253-254 mtame++ (< 20) */
    if ((mtmp.mtame | 0) < 20) mtmp.mtame = (mtmp.mtame | 0) + 1;
    /* C dogmove.c:255-258 newsym on moved+ate */
    if (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0)) {
        newsym(x, y);
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }

    /* C dogmove.c:265-267 — "food items are eaten one at a time; entire stack
     * for other stuff":
     *     if (obj->quan > 1L && obj->oclass == FOOD_CLASS)
     *         obj = splitobj(obj, 1L);
     * splitobj -> nextoid -> next_ident() draws rnd(2) (mkobj.c:522), and the
     * REMAINDER of the stack stays on the floor for the pet to come back to.
     * This used to be a comment reading "(corpse quan==1 on the early path; no
     * split, no RNG)", which was true only because nothing in this port ever
     * produced a floor stack of quan>1 food: the throw path was not calling
     * stackobj (js/cmd.js), so two thrown carrots stayed two stacks of one.
     * With that fixed the pony's meal is a stack of 2 and C's rnd(2) is real —
     * seed0004 leaf 11847. */
    if (((obj.quan ?? 1) | 0) > 1 && (obj.oclass | 0) === FOOD_CLASS)
        obj = (await splitobj(obj, 1));

    /* C dogmove.c:271-298 — the eat message.  is_pool branch (no print) vs the
     * cansee branch.  seeobj = cansee(mx,my); sawpet = cansee(x,y) && mon_visible. */
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    const seeobj = cansee(mx, my);
    const sawpet = cansee(x, y) && mon_visible(mtmp);
    if (sawpet || (seeobj && canseemon(mtmp))) {
        const objName = await dog_obj_name(obj);
        /* C: pline_mon(mtmp, "%s %s %s.", noit_Monnam(mtmp), devour?"devours":"eats", obj_name) */
        void pline(`${noit_Monnam_dm(mtmp)} ${devour ? 'devours' : 'eats'} ${objName}.`);
    } else if (seeobj) {
        const objName = await dog_obj_name(obj);
        void pline(`It ${devour ? 'devours' : 'eats'} ${objName}.`);
    }

    /* C dogmove.c:316-338 else-branch (not RUST_MONSTER):
     *   if (dogfood(mtmp,obj) == DOGFOOD && obj->invlet) { apport... }
     *     ← dogfood fires obj_resists(0,95) = rn2(100)  [FIRST post-pline rn2(100)]
     *   m_consume_obj(mtmp, obj) → delobj → delobj_core:
     *     obj_resists(obj,0,0) = rn2(100)               [SECOND post-pline rn2(100)] */
    const dfres = dogfood(mtmp, obj); /* obj_resists(0,95) — fires rn2(100) */
    if (dfres === DOGFOOD && obj.invlet) {
        /* apport reward — invlet is unset for floor corpses; not reached here.
         * Kept faithful for the dropped-food path. */
        if (edog) {
            const dropdist = (edog.dropdist | 0);
            const droptime = (edog.droptime | 0);
            edog.apport = (edog.apport | 0)
                + Math.trunc(200 / (dropdist + moves - droptime));
            if ((edog.apport | 0) <= 0) edog.apport = 1;
        }
    }

    /* C dogmove.c:341: shared consumption includes real object teardown.
     * A bare unlink left corpse timers pointing at an already deleted object. */
    await m_consume_obj(mtmp, obj);

    /* C dogmove.c:341: return DEADMONSTER(mtmp) ? 2 : 1 — pet survives a corpse. */
    return ((mtmp.mhp | 0) <= 0) ? 2 : 1;
}

/* -----------------------------------------------------------------------
 * dog_invent — C ref: dogmove.c:396-494
 * Pet considers dropping/eating/picking up items at its current location.
 * Returns 0 (nothing special), 1 (ate something), 2 (died).
 *
 * RNG calls (in C order):
 *  1. If droppables: rn2(udist+1), maybe rn2(apport), maybe rn2(10)
 *  2. Else if floor obj at pet's loc:
 *     - dogfood(obj) → obj_resists → rn2(100)
 *     - If not edible and can_carry: rn2(20), maybe rn2(udist), maybe rn2(apport)
 * ----------------------------------------------------------------------- */
async function dog_invent(mtmp, edog, udist) {
    /* C dogmove.c:410 — helpless(mtmp) || mtmp->meating → return 0 early.
     * helpless(mon) is monst.h:251 "(mon)->msleeping || !(mon)->mcanmove";
     * the previous check here tested mflee/mfleetim (a fleeing approximation
     * that is not what helpless() tests at all) and so never fired for a
     * sleeping or mcanmove-false pet. Both fields are real, tracked state
     * (see helpless_dm() elsewhere in this file, paralyze_monst, etc.). */
    if (mtmp.msleeping || !mtmp.mcanmove)
        return 0;
    if ((mtmp.meating | 0) > 0)
        return 0;

    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const moves = (game.moves ?? 0) | 0;

    /* C dogmove.c:418 — if (droppables(mtmp)): pet carrying something it would
     * drop.  C drops it (near @) and decrements apport. */
    if (droppables(mtmp) != null) {
        /* C dogmove.c:420-428 */
        if (!rn2(udist + 1) || !rn2(edog.apport)) {
            /* C: if (rn2(10) < edog->apport) { relobj(...); apport--; ... } */
            if (rn2(10) < (edog.apport | 0)) {
                await relobj_dm(mtmp); /* drop droppable item(s) to the floor */
                if ((edog.apport | 0) > 1)
                    edog.apport = (edog.apport | 0) - 1;
                edog.dropdist = udist;
                edog.droptime = moves;
            }
        }
        return 0;
    }

    /* C: obj = svl.level.objects[omx][omy] (first object at pet's tile) */
    const floorObj = game.level?.levelObjects?.[omx]?.[omy] ?? null;
    if (!floorObj)
        return 0;

    /* C: !strchr(nofetch, obj->oclass) — skip BALL/CHAIN/ROCK */
    const oc = floorObj.oclass | 0;
    if (oc === BALL_CLASS || oc === CHAIN_CLASS || oc === ROCK_CLASS)
        return 0;

    /* C: !(is_mines_prize || is_soko_prize) — skip special items */
    /* Stub: no mines/soko prize tracking in JS yet — assume not special */

    /* C: dogfood(mtmp, obj) — fires obj_resists → rn2(100) */
    const edible = dogfood(mtmp, floorObj);

    /* C dogmove.c:437-441 —
     *     if ((edible <= CADAVER
     *          || (edog->mhpmax_penalty && edible == ACCFOOD))
     *         && could_reach_item(mtmp, obj->ox, obj->oy))
     *         return dog_eat(mtmp, obj, omx, omy, FALSE);
     * The call used to be a comment ("dog_eat: complex — stub as 'ate
     * something' = return 1") whose second line, "No further RNG from dog_eat
     * in the common path", is false: dog_eat splits a food stack of quan>1
     * (rnd(2) via next_ident), calls dogfood() again for the apport reward and
     * delobj() to consume the item — two more rn2(100)s — AND it is what
     * actually REMOVES the food from the floor.  Returning 1 without eating
     * left the meal lying there forever, so the pet re-found it every turn.
     * The could_reach_item conjunct was missing too; it reads the OBJECT's own
     * square, which on this path is the pet's own square. */
    const starving = (edog.mhpmax_penalty | 0) > 0;
    if ((edible <= CADAVER || (starving && edible === ACCFOOD))
        && could_reach_item(mtmp, floorObj.ox | 0, floorObj.oy | 0)) {
        return await dog_eat(mtmp, floorObj, omx, omy, false);
    }

    /* C dogmove.c:443: carryamt = can_carry(mtmp, obj);
     * RNG-free; gates whether the rn2(20) pickup roll fires.  A heavy item
     * the pet cannot carry yields carryamt=0 → no RNG consumed. */
    const carryamt = can_carry(mtmp, floorObj);
    /* C: && could_reach_item(mtmp, obj->ox, obj->oy) */
    if (carryamt > 0 && !floorObj.cursed
        && could_reach_item(mtmp, omx, omy)) {
        /* C: if (rn2(20) < edog->apport + 3) */
        if (rn2(20) < (edog.apport | 0) + 3) {
            /* C: if (rn2(udist) || !rn2(edog->apport)) */
            if (rn2(udist) || !rn2(edog.apport)) {
                /* C dogmove.c:448-450:
                 *   otmp = obj;
                 *   if (carryamt != obj->quan)
                 *       otmp = splitobj(obj, carryamt);
                 * When the pet can carry only PART of a floor stack
                 * (carryamt < quan), C splits a fresh stack off the floor pile.
                 * splitobj() -> nextoid() -> next_ident() fires rnd(2)
                 * (mkobj.c:522) — the diverging leaf in seed0016/seed0060. */
                let otmp = floorObj;
                if (carryamt !== ((floorObj.quan ?? 1) | 0))
                    otmp = splitobj_dm(floorObj, carryamt);
                /* C dogmove.c:451-461: distant_name side-effects + the verbose
                 * "<Monnam> picks up <obj>." pline when the tile is in sight. */
                if (cansee(omx, omy)) {
                    const otmpname = await distant_obj_name(otmp);
                    if (game.flags?.verbose !== false)
                        void pline(`${Monnam_dm(mtmp)} picks up ${otmpname}.`);
                }
                /* C: obj_extract_self(otmp); newsym(omx,omy); mpickobj(mtmp,otmp). */
                obj_extract_floor(otmp);
                newsym(omx, omy);
                add_to_minv_dm(mtmp, otmp);
                /* C dogmove.c:466-471: AT_WEAP wielding + check_gear — a kitten
                 * has no AT_WEAP attack, so this is skipped (RNG-neutral). */
            }
        }
    }

    return 0;
}

/* add_to_minv_dm — C mkobj.c:2652 add_to_minv: merge into the monster's minvent
 * if a mergable stack exists, else prepend.  The dog's minvent is empty in the
 * corpus pickup, so this prepends; merged() is not reached. */
function add_to_minv_dm(mon, obj) {
    obj.where = OBJ_MINVENT;
    obj.ocarry = mon;
    obj.nobj = mon.minvent ?? null;
    mon.minvent = obj;
}

/* splitobj_dm — C mkobj.c:457-503 splitobj(obj, num) for a floor stack.
 * Splits `num` items off `obj` into a fresh object `otmp`, returns `otmp`.
 * RNG: otmp->o_id = nextoid(obj, otmp) (mkobj.c:470).  nextoid (mkobj.c:536)
 * walks oid_price_adjustment() (RNG-free) then calls (void) next_ident()
 * (mkobj.c:550) — the SINGLE rnd(2) at mkobj.c:522 this path consumes.
 * `obj` keeps quan-num and stays on the floor (where==OBJ_FLOOR); otmp is the
 * portion the pet carries.
 *
 * The o_id used to be derived here as a bare `oid = context.ident`, on the
 * recorded reasoning that "for an ordinary pet-path item there is no
 * price-adjustment difference, so nextoid's loop exits after one ++oid".  That
 * is a statement about the ITEM and the loop's variable is the OID: for
 * anything not both dknown and oc_name_known — every unidentified floor stack a
 * pet picks part of — shk.c:2869 makes the adjustment `(oid % 4) == 0`, so
 * olddif is a property of the PARENT's o_id and newdif of the CANDIDATE's, and
 * they disagree often enough that the loop really does iterate: MEASURED over
 * all 688 corpus-generated/v5/train sessions, this site is entered 58 times and
 * 10 of those runs take more than one iteration (3 take 2, 2 take 3, 5 take 4).
 * When it iterates, context.ident SKIPS FORWARD without drawing, and every later
 * m_id/o_id in the game is low — the RNG-free divergence class 686193c5 fixed
 * on the throw path (a wrong shopkeeper name out of nameshk's m_id index).
 * Use the one faithful body (js/makemon.js nextoid) instead of a fourth
 * hand-derivation. */
function splitobj_dm(obj, num) {
    /* otmp = newobj(); *otmp = *obj; — copy the whole structure. */
    const otmp = newobj(obj);
    otmp.oextra = null;
    /* C mkobj.c:470 otmp->o_id = nextoid(obj, otmp) — the price-adjustment
     * search, `context.ident = oid`, and the (void) next_ident() that fires
     * the single rnd(2) @ mkobj.c:522 all live in that body. */
    otmp.o_id = nextoid(obj, otmp);
    otmp.timed = 0;
    otmp.lamplit = 0;
    otmp.owornmask = 0;
    /* C mkobj.c:474-477: obj->quan -= num; otmp->quan = num; (owt recompute
     * is weight-only, RNG-free and unobserved on this path). */
    obj.quan = (((obj.quan ?? 1) | 0) - num) | 0;
    otmp.quan = num | 0;
    /* C mkobj.c:481-489: objsplit context + insert otmp into the floor chain
     * after obj (obj -> otmp -> next).  obj stays OBJ_FLOOR; otmp is OBJ_FLOOR
     * until the caller obj_extract_self()s it before pickup. */
    otmp.where = OBJ_FLOOR;
    otmp.nobj = obj.nobj ?? null;
    obj.nobj = otmp;
    otmp.nexthere = obj.nexthere ?? null;
    obj.nexthere = otmp;
    return otmp;
}

/* -----------------------------------------------------------------------
 * dog_goal — C ref: dogmove.c:498-695
 * Sets gg.gx/gg.gy/gg.gtyp goal for pet.
 * Returns -1/0/1 (dog's desire to approach player) or -2 (abort move).
 *
 * RNG calls (in C order):
 *  1. For each floor object in SQSRCHRADIUS:
 *     dogfood(obj) → obj_resists → rn2(100) per object
 *     If otyp >= MANFOOD and conditions met: rn2(8)
 *  2. If gtyp==UNDEF (no food found) and in_masters_sight:
 *     (already handled above in the loop)
 *  3. appr = 1 if gtyp is food; else 0/1 based on distance
 *  4. If IS_ROOM(levl[u.ux][u.uy].typ): maybe rn2(4) (short-circuits if !IS_ROOM)
 *     If dog_has_minvent: rn2(edog.apport)
 * ----------------------------------------------------------------------- */
function dog_goal(mtmp, edog, after, udist, whappr) {
    /* C dogmove.c:494-496 — "Steeds don't move on their own will".  Read
     * `game.u.usteed`: `game.usteed` has no writer, so the guard never fired and
     * the mounted pony kept picking goals, walking off the hero's square and
     * attacking whatever it reached (seed0104 step 12: "The saddled pony hits
     * the lichen.  The lichen is killed!" over C's blank topline, with the `u`
     * left behind two squares west of the rider). */
    if (mtmp === game.u?.usteed)
        return -2;

    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const moves = (game.moves ?? 0) | 0;

    /* Initialize goal globals */
    const gg = game.gg ?? (game.gg = { gx: 0, gy: 0, gtyp: UNDEF });
    game.gg = gg;

    /* C dogmove.c:512 — couldsee() is a strict vision-map query.  The old
     * helper returned TRUE when viz_array was absent, which made pets treat
     * hidden/opaque squares as visible and select goals C rejects. */
    const in_masters_sight = !!(game.viz_array && couldsee_vision(omx, omy));
    /* droppables stub: pet has inventory */
    const dog_has_minvent = (droppables(mtmp) != null);

    if (!edog || mtmp.mleashed) {
        /* leashed: stay near hero */
        gg.gtyp = APPORT;
        gg.gx = (game.u?.ux | 0);
        gg.gy = (game.u?.uy | 0);
    } else {
        /* C: scan floor objects in SQSRCHRADIUS x SQSRCHRADIUS area */
        let min_x = Math.max(1, omx - SQSRCHRADIUS);
        let max_x = Math.min(COLNO - 1, omx + SQSRCHRADIUS);
        let min_y = Math.max(0, omy - SQSRCHRADIUS);
        let max_y = Math.min(ROWNO - 1, omy + SQSRCHRADIUS);

        gg.gtyp = UNDEF;
        gg.gx = 0;
        gg.gy = 0;

        /* C: for (obj = fobj; obj; obj = obj->nobj) — iterate ALL floor objects */
        for (let obj = game.fobj; obj; obj = obj.nobj) {
            const nx = obj.ox | 0;
            const ny = obj.oy | 0;
            /* C: if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) */
            if (nx < min_x || nx > max_x || ny < min_y || ny > max_y)
                continue;
            /* C: otyp = dogfood(mtmp, obj) — fires rn2(100) */
            const otyp = dogfood(mtmp, obj);
            /* C: if (otyp > gg.gtyp || otyp == UNDEF) continue */
            if (otyp > gg.gtyp || otyp === UNDEF)
                continue;
            /* C: if (cursed_object_at && !(starving && otyp < MANFOOD)) continue */
            if (cursed_object_at(nx, ny)
                && !((edog.mhpmax_penalty | 0) && otyp < MANFOOD))
                continue;
            /* C dogmove.c:567-571: reach checks.
             * could_reach_item: checks for pool/lava/boulder.
             * can_reach_location: recursive pathfinding check.
             * C short-circuits: !could_reach_item || !can_reach_location */
            if (!could_reach_item(mtmp, nx, ny)
                || !can_reach_location(mtmp, mtmp.mx | 0, mtmp.my | 0, nx, ny))
                continue;
            if (otyp < MANFOOD) {
                /* preferred food: update goal */
                if (otyp < gg.gtyp
                    || dist2(nx, ny, omx, omy) < dist2(gg.gx, gg.gy, omx, omy)) {
                    gg.gx = nx;
                    gg.gy = ny;
                    gg.gtyp = otyp;
                }
            } else if (gg.gtyp === UNDEF && in_masters_sight && !dog_has_minvent) {
                /* C dogmove.c:585-601:
                 * else if (gg.gtyp == UNDEF && in_masters_sight && !dog_has_minvent
                 *          && (!levl[omx][omy].lit || levl[u.ux][u.uy].lit)
                 *          && (otyp == MANFOOD || m_cansee(mtmp, nx, ny))) {
                 *     int aproll = rn2(8); ... }
                 * Lighting check: (!pet_tile.lit || hero_tile.lit)
                 * m_cansee(mtmp, nx, ny) = clear_path(mtmp->mx, mtmp->my, nx, ny)
                 *   — real line-of-sight check via vision.js:clear_path */
                const petLoc  = game.level?.locations?.[omx]?.[omy];
                const _gu     = game.u; /* u not yet declared at this scope */
                const heroLoc = game.level?.locations?.[_gu?.ux ?? 0]?.[_gu?.uy ?? 0];
                const petLit  = !!(petLoc?.lit);
                const heroLit = !!(heroLoc?.lit);
                const litOk   = (!petLit || heroLit);
                /* m_cansee(mtmp, nx, ny) = clear_path(mtmp->mx, mtmp->my, nx, ny) */
                const canSee  = (otyp === MANFOOD) || !!(clear_path(omx, omy, nx, ny));
                if (litOk && canSee) {
                    /* C dogmove.c:589-593:
                     *   int aproll = rn2(8);
                     *   int carry_res = (edog->apport > aproll) ? can_carry(mtmp, obj) : 0;
                     *   int sel = (edog->apport > aproll && carry_res > 0);
                     * can_carry is RNG-free here; it gates which apport target is
                     * selected (the weight gate rejects items heavier than the
                     * pet can carry).  Short-circuit: only evaluate can_carry when
                     * apport > aproll, matching C's conditional. */
                    const aproll = rn2(8);
                    const carry_res = ((edog.apport | 0) > aproll) ? can_carry(mtmp, obj) : 0;
                    const sel = ((edog.apport | 0) > aproll && carry_res > 0);
                    if (sel) {
                        gg.gx = nx;
                        gg.gy = ny;
                        gg.gtyp = APPORT;
                    }
                }
            }
        }
    }

    /* C: follow player if no food goal or food found but still hungry */
    const u = game.u;
    let appr;
    if (gg.gtyp === UNDEF || (gg.gtyp !== DOGFOOD && gg.gtyp !== APPORT
                              && moves < edog.hungrytime)) {
        gg.gx = (u?.ux | 0);
        gg.gy = (u?.uy | 0);
        /* C: if (after && udist <= 4 && u_at(gg.gx, gg.gy)) return -2 */
        if (after && udist <= 4 && (u?.ux | 0) === gg.gx && (u?.uy | 0) === gg.gy)
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            /* C dogmove.c:621: if (!IS_ROOM(levl[u.ux][u.uy].typ) || !rn2(4) || whappr
             *                       || (dog_has_minvent && rn2(edog->apport)))
             *     appr = 1;
             * IS_ROOM(typ) = (typ >= ROOM).  C short-circuits: when !IS_ROOM is true
             * (hero in corridor/wall/etc.) rn2(4) is NOT called.  Only fire rn2(4) when
             * the hero IS in a room (IS_ROOM true) and the !IS_ROOM branch didn't trigger.
             */
            const heroTyp = (game.level?.locations?.[u?.ux | 0]?.[u?.uy | 0]?.typ ?? 0) | 0;
            const heroInRoom = IS_ROOM(heroTyp);
            if (!heroInRoom) {
                /* !IS_ROOM = true: short-circuit — appr=1 without consuming rn2(4) */
                appr = 1;
            } else if (!rn2(4) || whappr || (dog_has_minvent && rn2(edog.apport))) {
                appr = 1;
            }
        }
        /* C dogmove.c:628-650: if (appr == 0) check stairs/invent/portal */
        if (appr === 0) {
            /* C: On_stairs(u.ux, u.uy) — checks if hero is on a stairway.
             * We check the tile type: STAIRS(26) or LADDER(27) qualify.
             * C IS_FURNITURE: typ >= STAIRS(26) && typ <= ALTAR.
             * We approximate: if hero tile typ >= 26 (STAIRS or higher furniture)
             * treat as On_stairs; no RNG consumed. */
            const heroTypS = (game.level?.locations?.[u?.ux | 0]?.[u?.uy | 0]?.typ ?? 0) | 0;
            if (heroTypS === 26 /* STAIRS */ || heroTypS === 27 /* LADDER */) {
                appr = 1;
            } else {
                // C dogmove.c:628 — scan the one live inventory in its actual order.
                for (let obj = game.invent; obj; obj = obj.nobj) {
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                /* C dogmove.c:640-649 — a nearby magic portal is treated like
                 * dog food, so the pet approaches the hero more eagerly.  C
                 * assumes at most one portal and stops at the first portal,
                 * even when it is too far away; preserve that traversal order
                 * and the squared-distance test (distu <= 2). */
                if (appr === 0) {
                    for (let _t = game.ftrap ?? null; _t; _t = _t.ntrap ?? null) {
                        if ((_t.ttyp | 0) === MAGIC_PORTAL) {
                            if (distu(_t.tx | 0, _t.ty | 0) <= 2)
                                appr = 1;
                            break;
                        }
                    }
                }
            }
        }
    } else {
        appr = 1; /* gtyp != UNDEF, has food goal */
    }

    /* C: if (mtmp->mconf) appr = 0 */
    if (mtmp.mconf | 0)
        appr = 0;

    /* C dogmove.c:656-690 — FARAWAY block.
     * #define FARAWAY (COLNO + 2)  // position outside the screen
     * If the goal landed on the hero but the pet can't see the hero, the pet
     * has lost the hero: follow the hero's footstep track (gettrack), reuse the
     * previous goal (edog->ogoal), or shadow-cast from the pet's position to
     * pick the farthest visible square (do_clear_area + wantdoor).  Bit-exact
     * here is what determines GDIST() in dog_move and thus the rn2(++chcnt)
     * candidate-selection sequence. */
    const FARAWAY = COLNO + 2; /* 82 */
    if ((gg.gx === (u?.ux | 0)) && (gg.gy === (u?.uy | 0)) && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            gg.gx = cp.x;
            gg.gy = cp.y;
            if (edog) {
                edog.ogoal = edog.ogoal ?? { x: 0, y: 0 };
                edog.ogoal.x = 0;
            }
        } else {
            /* assume master hasn't moved far, and reuse previous goal */
            if (edog && edog.ogoal && (edog.ogoal.x | 0)
                && ((edog.ogoal.x | 0) !== omx || (edog.ogoal.y | 0) !== omy)) {
                gg.gx = edog.ogoal.x | 0;
                gg.gy = edog.ogoal.y | 0;
                edog.ogoal.x = 0;
            } else {
                /* do_clear_area(omx, omy, 9, wantdoor, &fardist) */
                const ctx = { fardist: FARAWAY * FARAWAY };
                gg.gx = gg.gy = FARAWAY;
                /* wantdoor(x,y,distance): keep the square farthest from the hero
                 * that the pet can see (max distu).  C ref: dogmove.c:1479. */
                const wantdoor = (x, y, c) => {
                    const ndist = distu(x, y);
                    if (c.fardist > ndist) {
                        gg.gx = x;
                        gg.gy = y;
                        c.fardist = ndist;
                    }
                };
                do_clear_area(omx, omy, 9, wantdoor, ctx);
                /* here gx == FARAWAY e.g. when dog is in a vault */
                if (gg.gx === FARAWAY || (gg.gx === omx && gg.gy === omy)) {
                    gg.gx = (u?.ux | 0);
                    gg.gy = (u?.uy | 0);
                } else if (edog) {
                    edog.ogoal = edog.ogoal ?? { x: 0, y: 0 };
                    edog.ogoal.x = gg.gx;
                    edog.ogoal.y = gg.gy;
                }
            }
        }
    } else if (edog) {
        edog.ogoal = edog.ogoal ?? { x: 0, y: 0 };
        edog.ogoal.x = 0;
    }

    /* C dogmove.c:691 — structural ground-truth marker (event_log).  Mirrors
     * the recorded C `^dog_goal_end[...]` so the oracle can assert JS goal ==
     * C goal per pet per turn BEFORE the RNG sequence is compared. */
    pushRngLogEntry(`^dog_goal_end[M${mtmp.m_id >>> 0} goal=${gg.gx},${gg.gy} gtyp=${gg.gtyp} appr=${appr}]`);

    return appr;
}

/* -----------------------------------------------------------------------
 * Tile type constants for can_reach_location / could_reach_item.
 * C ref: nethack-c/include/rm.h
 * IS_OBSTRUCTED(typ) = typ < POOL (typ < 16) — walls, stone, etc.
 * IS_DOOR(typ) = typ == DOOR (23)
 * D_CLOSED = 0x04, D_LOCKED = 0x08
 * is_pool: POOL(16), MOAT(17), WATER(18) — also DRAWBRIDGE_UP(19) by IS_POOL
 * is_lava: LAVAPOOL(20), LAVAWALL(21)
 * ----------------------------------------------------------------------- */
const POOL_TYP       = 16;
const MOAT_TYP       = 17;
const WATER_TYP      = 18;
const DRAWBRIDGE_UP_TYP = 19;
const LAVAPOOL_TYP   = 20;
const LAVAWALL_TYP   = 21;
const DOOR_TYP = 23;
const D_CLOSED = 0x04;
const D_LOCKED = 0x08;
const D_BROKEN = 0x01;

/* C ref: dungeon.h:129 Is_rogue_level(&u.uz).  The dungeon topology
 * (svd.dungeon_topology.d_rogue_level) is not yet modelled in the JS port, so
 * game.rogue_level is currently always unset and this returns false.  Mirrors
 * const.js Is_rogue_level so the behaviour upgrades automatically once the
 * dungeon-topology port lands. */
function Is_rogue_level_dm() {
    const rl = game?.rogue_level;
    const uz = game?.u?.uz;
    return !!(rl && uz && uz.dnum === rl.dnum && uz.dlevel === rl.dlevel);
}
/* BOULDER otyp (C objects.h ROCK_CLASS entry) */
const BOULDER_OTYP   = 475;
/* C monflag.h:86 M1_SWIM; mons[] indices for C mondata.h:190 likes_lava(). */
const M1_SWIM_DM = 0x00000002;
const PM_FIRE_ELEMENTAL_DM = 155, PM_SALAMANDER_DM = 329;

/* -----------------------------------------------------------------------
 * could_reach_item — C ref: dogmove.c:1423-1430
 *   if ((!is_pool(nx, ny)   || is_swimmer(mon->data))
 *       && (!is_lava(nx, ny)   || likes_lava(mon->data))
 *       && (!sobj_at(BOULDER, nx, ny) || throws_rocks(mon->data)))
 *       return TRUE;
 * C: is_pool(x,y) = typ==POOL||MOAT||WATER or is_moat(); is_lava=LAVAPOOL/WALL
 *
 * The three monster-capability tests used to be hardcoded FALSE, with the note
 * "stubs = false for dog/cat/kitten".  That was true of this function's FIRST
 * caller (dog_move) and false of its others: js/monmove.js:1309 calls it for
 * EVERY hostile monster inside m_search_items, and js/monmove.js:2731 for the
 * monster's own square.  So any swimmer looking for an item in water was told
 * it could not reach it.
 *
 * seed4500 turn 139, water nymph m_id=1963 at (44,14) (M1_SWIM, monsters.h
 * mflags1 0x2020002): C's m_search_items redirects her goal to the kelp frond
 * at (44,16) — distmin 2, in the water — and she steps to (44,15).  This port
 * skipped both in-water kelp fronds in range and redirected to a piece of amber
 * at (48,11), distmin 4, so she stepped to (45,13) instead.  Wrong square,
 * BIT-IDENTICAL RNG stream (m_move's selection loop draws nothing when
 * appr != 0, monmove.c:1969) — the shape tools/monster-position-diff.mjs exists
 * to see.  Three steps later that mfndpos count is 8 where C's is 7 and the
 * leaf stream finally parts at rn2(4*(cnt-j)) (monmove.c:1963), seed4500's
 * first RNG divergence at leaf 83695.
 *
 * The TERRAIN test stays as it was (typ 16..19 for is_pool, 20/21 for is_lava):
 * C's is_pool adds is_moat() for a DRAWBRIDGE_UP whose drawbridgemask says
 * DB_MOAT, and is_lava the DB_LAVA twin, and this port does not model
 * drawbridgemask.  That approximation is pre-existing and unmeasured; the
 * capability stubs are what the corpus caught.
 * ----------------------------------------------------------------------- */
export function could_reach_item(mtmp, nx, ny) {
    const locs = game.level?.locations;
    const typ = (locs?.[nx]?.[ny]?.typ ?? 0) | 0;
    /* C dogmove.c:1423-1429 reads mtmp->data, which may differ from the
     * original mndx after polymorphing.  Prefer the live permonst index so
     * swimmer/lava/rock throwing capabilities follow the current form. */
    const _mndx = (mtmp?.data?.pmidx ?? mtmp?.mndx ?? mtmp?.mnum ?? -1) | 0;
    const _mrow = (_mndx >= 0 && _mndx < _MONS.length) ? _MONS[_mndx] : null;
    const _mf1 = _mrow ? (_mrow[6] >>> 0) : 0;
    const _mf2 = _mrow ? (_mrow[7] >>> 0) : 0;
    /* is_pool: POOL, MOAT, WATER, DRAWBRIDGE_UP (typ 16-19) */
    if (typ >= POOL_TYP && typ <= DRAWBRIDGE_UP_TYP
        && !(_mf1 & M1_SWIM_DM))            /* C mondata.h:25 is_swimmer(ptr) */
        return false;
    /* is_lava: LAVAPOOL(20), LAVAWALL(21) */
    if ((typ === LAVAPOOL_TYP || typ === LAVAWALL_TYP)
        /* C mondata.h:190 likes_lava(ptr) — fire elemental / salamander only */
        && _mndx !== PM_FIRE_ELEMENTAL_DM && _mndx !== PM_SALAMANDER_DM)
        return false;
    /* sobj_at(BOULDER, nx, ny): check if any object at (nx,ny) is a boulder.
     * C ref: dogmove.c:1428 — (!sobj_at(BOULDER,nx,ny) || throws_rocks(mon->data))
     * C sobj_at walks svl.level.objects[nx][ny] nexthere chain.
     * JS mirror: game.level.levelObjects[nx][ny] (x-first, matching GameMap init in
     * game.js where levelObjects[x][y] is set). The old code used objmap[ny][nx]
     * which does not exist in game state — the boulder check was never firing,
     * causing could_reach_item to return true for boulder squares and triggering
     * a spurious dogfood() → obj_resists() → rn2(100) call in dog_move for those
     * squares (seed2500 leaf 3641 divergence). */
    const firstObj = game.level?.levelObjects?.[nx]?.[ny];
    if (firstObj) {
        for (let o = firstObj; o; o = o.nexthere) {
            /* C: !sobj_at(BOULDER,nx,ny) || throws_rocks(mon->data)
             * (mondata.h:134 throws_rocks(ptr) = mflags2 & M2_ROCKTHROW). */
            if ((o.otyp | 0) === BOULDER_OTYP && !(_mf2 & M2_ROCKTHROW))
                return false;
        }
    }
    return true;
}

/* -----------------------------------------------------------------------
 * can_reach_location — C ref: dogmove.c:1439-1475
 * Recursive check: can the monster reach (fx,fy) from (mx,my)?
 * Checks for walls/closed doors along the path.
 * No RNG consumed.
 * ----------------------------------------------------------------------- */
function can_reach_location(mtmp, mx, my, fx, fy) {
    mx |= 0; my |= 0; fx |= 0; fy |= 0;
    if (mx === fx && my === fy) return true;
    /* C: if (!isok(mx, my)) return FALSE */
    if (mx < 1 || mx >= COLNO - 1 || my < 0 || my >= ROWNO) return false;
    const locs = game.level?.locations;
    const dist = dist2(mx, my, fx, fy);
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            /* C: if (!isok(i,j)) continue */
            if (i < 1 || i >= COLNO - 1 || j < 0 || j >= ROWNO) continue;
            /* C: if (dist2(i,j,fx,fy) >= dist) continue */
            if (dist2(i, j, fx, fy) >= dist) continue;
            /* C: if (IS_OBSTRUCTED(typ) && !passes_walls && ...) continue */
            const loc = locs?.[i]?.[j];
            const typ = loc?.typ ?? 0;
            if (typ < POOL_TYP) continue; /* wall/stone → obstructed */
            /* C: if (IS_DOOR && (D_CLOSED|D_LOCKED)) continue */
            if (typ === DOOR_TYP) {
                const dm = loc.doormask ?? 0;
                if (dm & (D_CLOSED | D_LOCKED)) continue;
            }
            /* C: if (!could_reach_item(mon, i, j)) continue — dogmove.c:1468 */
            if (!could_reach_item(mtmp, i, j)) continue;
            /* C: if (can_reach_location(mon, i, j, fx, fy)) return TRUE */
            if (can_reach_location(mtmp, i, j, fx, fy)) return true;
        }
    }
    return false;
}

/* -----------------------------------------------------------------------
 * couldsee_stub — C ref: vision.c couldsee(x,y)
 * Returns true if hero could potentially see position (x,y).
 * Uses real vision array (game.viz_array) if available; falls back to true.
 * C: !!(viz_array[y][x] & COULD_SEE)
 * ----------------------------------------------------------------------- */
function couldsee_stub(x, y) {
    /* Use real couldsee from vision.js if game state is populated */
    if (game.viz_array) {
        try { return couldsee_vision(x | 0, y | 0); } catch (_) {}
    }
    return true; /* fallback: assume visible */
}

/* -----------------------------------------------------------------------
 * distu — squared distance from (x,y) to hero
 * C ref: hack.h distu(x,y) = dist2(x,y,u.ux,u.uy)
 * ----------------------------------------------------------------------- */
function distu(x, y) {
    const u = game.u;
    if (!u) return 0;
    return dist2(x | 0, y | 0, u.ux | 0, u.uy | 0);
}

/* C ref: monmove.c:1322-1334 m_avoid_kicked_loc(mtmp, nx, ny).
 * A peaceful/tame, seeing, unconfused/unstunned monster avoids (skips as a
 * movement candidate) the square the hero just kicked (gk.kickedloc), provided
 * the square is next2u (distu <= 2). RNG-free. Conflict is unmodeled in the
 * port (no Conflict source exists in any current session), so !Conflict is
 * always true here — faithful for the scored corpus. isok(0,0) is false
 * (x>=1 fails), so the default/cleared kickedloc=(0,0) makes this inert. */
function m_avoid_kicked_loc(mtmp, nx, ny) {
    const kl = game.kickedloc;
    if (!kl) return false;
    const kx = kl.x | 0, ky = kl.y | 0;
    /* isok: x >= 1 && x <= COLNO-1 && y >= 0 && y <= ROWNO-1 */
    const klok = kx >= 1 && kx <= (COLNO - 1) && ky >= 0 && ky <= (ROWNO - 1);
    return ((!!(mtmp.mpeaceful | 0)) || (!!(mtmp.mtame | 0)))
        && !!(mtmp.mcansee | 0)
        && !(mtmp.mconf | 0) && !(mtmp.mstun | 0)
        /* && !Conflict (unmodeled → false) */
        && klok
        && nx === kx && ny === ky
        && distu(nx, ny) <= 2;
}

/* m_avoid_soko_push_loc (C monmove.c:1337-1349) is defined once, in
 * js/monmove.js, mirroring C's own file layout (defined in monmove.c, called
 * from dogmove.c:1238); it is imported at the top of this file.  The local
 * `return false` stub that used to sit here was a second body for the same C
 * function and shadowed the real one at every call site. */

/* -----------------------------------------------------------------------
 * distmin — Chebyshev (max) distance
 * C ref: hack.h distmin(x0,y0,x1,y1) = max(abs(x0-x1), abs(y0-y1))
 * ----------------------------------------------------------------------- */
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs((x0 | 0) - (x1 | 0)), Math.abs((y0 | 0) - (y1 | 0)));
}

/* C monsym.h — quest-role msound values; the two score_targ / find_friends
 * treat as "always seen, never targeted". Same numbers as js/objnam.js:154. */
const MS_LEADER_DM = 36;
const MS_GUARDIAN_DM = 38;
/** C permonst.msound — parallel to _MONS row order (js/makemon_msound.json). */
const _MSOUND = /** @type {number[]} */ (monMsoundPack_dm.msound);
/* -----------------------------------------------------------------------
 * find_friends — C ref: dogmove.c:753-792 (called from score_targ)
 * Walk from the target back along the pet→target line, up to maxdist, and
 * report whether the hero (as the pet believes) or another pet / quest
 * friendly stands behind it — in which case the pet must not fire.
 * No RNG.
 * ----------------------------------------------------------------------- */
function find_friends(mtmp, mtarg, maxdist) {
    if (!mtmp || !mtarg)
        return 0;
    const sgn = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
    const tx = mtarg.mx | 0, ty = mtarg.my | 0;
    const dx = sgn(tx - (mtmp.mx | 0));
    const dy = sgn(ty - (mtmp.my | 0));
    let curx = tx, cury = ty;
    let dist = distmin(tx, ty, mtmp.mx | 0, mtmp.my | 0);
    for (; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury))
            return 0;
        /* C: m_cansee(mtmp, curx, cury) == clear_path(mtmp->mx, mtmp->my, x, y)
         * — the same expansion find_targ above already relies on. */
        if (!clear_path(mtmp.mx | 0, mtmp.my | 0, curx, cury))
            return 0;
        /* Does pet think you're here? */
        if ((mtmp.mux | 0) === curx && (mtmp.muy | 0) === cury)
            return 1;
        const pal = m_at(curx, cury);
        if (pal) {
            if (pal.mtame | 0) {
                /* C dogmove.c:779-781 — invisible tame friends are visible
                 * only to a pet whose species can see invisibility. */
                const _pdata = mtmp.data ?? { mflags1: _MONS[(mtmp.mndx ?? mtmp.mnum ?? -1) | 0]?.[6] ?? 0 };
                if (!(pal.minvis | 0) || perceives_dm(_pdata))
                    return 1;
            }
            else {
                /* Quest leaders and guardians are always seen */
                const pmndx = (pal.mndx ?? pal.mnum ?? -1) | 0;
                const ps = (pmndx >= 0 && pmndx < _MSOUND.length) ? (_MSOUND[pmndx] | 0) : 0;
                if (ps === MS_LEADER_DM || ps === MS_GUARDIAN_DM)
                    return 1;
            }
        }
    }
    return 0;
}
/* -----------------------------------------------------------------------
 * score_targ — C ref: dogmove.c:785-883
 * Scores a potential ranged attack target.
 *
 * C control flow with early returns:
 *   if (!mconf || !rn2(3) || Is_qstart) {
 *     ... many non-RNG checks with early returns (score -= 3000/5000) ...
 *     ... vampshifter: rn2(mtmp_lev/2+1) ...
 *     score += level scores
 *   }
 *   score += rnd(5);   ← ALWAYS fires (both confused and non-confused)
 *   if (mconf && !rn2(3)) score -= 1000;
 *   return score;
 *
 * CRITICAL EARLY RETURNS (before rnd(5)):
 *   - Quest leaders/guardians → score -= 5000, return
 *   - Coaligned faithfuls     → score -= 5000, return
 *   - Adjacent (dist <= 1)    → score -= 3000, return
 *   - Tame/peaceful/hero      → score -= 3000, return
 *   - Behind master           → score -= 3000, return
 *
 * For early-game pets, hero is usually at mux/muy → find_targ returns hero →
 * score_targ returns -3000 without rnd(5) → best_target returns null →
 * pet_ranged_attk returns MMOVE_NOTHING.
 * ----------------------------------------------------------------------- */
function score_targ(mtmp, mtarg) {
    let score = 0;
    /* C: if (!mconf || !rn2(3) || Is_qstart) — gate for non-confused path */
    if (!(mtmp.mconf | 0) || !rn2(3)) {
        /* C: multiple early returns (score -= 3000 or -5000) before rnd(5).
         * Order follows C dogmove.c:748-806 exactly; the pseudo-youmonst target
         * skips the msound / priest-alignment arms (gy.youmonst is never a quest
         * leader and its isminion/ispriest are FALSE, so faith2 is FALSE). */
        if (mtarg !== game.u) {
            /* C dogmove.c:775-778 — never target quest friendlies. */
            const tmndx = (mtarg?.mndx ?? mtarg?.mnum ?? -1) | 0;
            const tsound = (tmndx >= 0 && tmndx < _MSOUND.length) ? (_MSOUND[tmndx] | 0) : 0;
            if (tsound === MS_LEADER_DM || tsound === MS_GUARDIAN_DM)
                return -5000;
            /* C dogmove.c:780-783 — coaligned priests/minions.  isminion and
             * ispriest are not modelled on JS monsters, so faith1/faith2 are
             * both FALSE and this arm cannot fire; kept as a comment rather
             * than as dead state so the C shape stays legible. */
        }
        /* Adjacent target: score -= 3000, return (C dogmove.c:785-788) */
        if (mtarg && distmin(mtmp.mx, mtmp.my, mtarg.mx ?? 0, mtarg.my ?? 0) <= 1) {
            score -= 3000;
            return score;
        }
        /* Tame target or the hero: score -= 3000, return (C dogmove.c:790-795) */
        if (mtarg === game.u || (mtarg && (mtarg.mtame | 0))) {
            score -= 3000;
            return score;
        }
        /* C dogmove.c:797-800 — is master/pet behind the monster?  Missing
         * entirely until now, so every such target drew an rnd(5) C skips. */
        if (find_friends(mtmp, mtarg, 15)) {
            score -= 3000;
            return score;
        }
        // C score_targ: hostility, passive attacks, and relative strength
        // affect which target wins even though most of this consumes no RNG.
        if (!mtarg.mpeaceful) score += 10;
        const targetPm = (mtarg.mndx ?? mtarg.mnum ?? -1) | 0;
        const targetAttacks = mon_mattk_raw(targetPm);
        if ((targetAttacks?.[0]?.[0] ?? AT_NONE) === AT_NONE) score -= 1000;
        const targetLevel = mtarg.m_lev | 0;
        let petLevel = mtmp.m_lev | 0;
        const heroLevel = game.u?.ulevel | 0;
        if ((targetLevel < 2 && petLevel > 5)
            || (petLevel > 12 && targetLevel < petLevel - 9
                && heroLevel > 8 && targetLevel < heroLevel - 7))
            score -= 25;
        const cham = mtmp.cham;
        const petPm = (mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
        if ((cham === PM_VAMPIRE || cham === PM_VAMPIRE_LORD
             || cham === PM_VLAD_THE_IMPALER)
            && _MONS[petPm]?.[0] !== _MONS[PM_VAMPIRE][0]) {
            petLevel = _MONS[cham][1];
            petLevel += rn2(Math.trunc(petLevel / 2) + 1);
            petLevel = Math.max(petLevel, mtmp.m_lev | 0);
        }
        if (targetLevel > petLevel + 4)
            score -= (targetLevel - petLevel) * 20;
        score += targetLevel * 2 + Math.trunc((mtarg.mhp | 0) / 3);
    }
    /* C dogmove.c:878: score += rnd(5) — fires for all NON-early-return paths */
    score += rnd(5);
    /* C dogmove.c:880: if (mconf && !rn2(3)) score -= 1000 */
    if ((mtmp.mconf | 0) && !rn2(3))
        score -= 1000;
    return score;
}

/* -----------------------------------------------------------------------
 * find_targ — C ref: dogmove.c:697-738
 * Find first monster in direction (dx,dy) from pet, within maxdist.
 * No RNG. Returns a monster object or null.
 * ----------------------------------------------------------------------- */
function find_targ(mtmp, dx, dy, maxdist) {
    let curx = mtmp.mx | 0;
    let cury = mtmp.my | 0;
    const u = game.u;
    for (let dist = 0; dist < maxdist; dist++) {
        curx += dx;
        cury += dy;
        /* C dogmove.c:711: if (!isok(curx, cury)) break;
         * isok(x,y) = x >= 1 && x <= COLNO-1 && y >= 0 && y <= ROWNO-1. */
        if (curx < 1 || curx > COLNO - 1 || cury < 0 || cury > ROWNO - 1)
            break;
        /* C dogmove.c:721-722: if (!m_cansee(mtmp, curx, cury)) break;
         * m_cansee(mtmp, x, y) = clear_path(mtmp->mx, mtmp->my, x, y) — a real
         * line-of-sight check.  The pet stops scanning a direction at the first
         * square it cannot see (wall/door/dark), so it does NOT find targets
         * behind obstructions.  (Was stubbed "assume visible", which made the
         * pet find targets C never sees → a spurious score_targ rnd(5).) */
        if (!clear_path(mtmp.mx | 0, mtmp.my | 0, curx, cury))
            break;
        /* C: if (curx == mtmp->mux && cury == mtmp->muy) return &youmonst */
        if (curx === (mtmp.mux | 0) && cury === (mtmp.muy | 0))
            return game.u; /* pseudo-youmonst */
        /* C dogmove.c:727-735: targ = m_at(curx, cury); accept it as a target
         * only if visible to the pet AND not mundetected AND (for a long worm)
         * this square is the head, not a tail segment. */
        for (let m = game.fmon; m; m = m.nmon) {
            if ((m.mhp | 0) > 0 && (m.mx | 0) === curx && (m.my | 0) === cury) {
                /* C dogmove.c:729-732 — an invisible tame pet is visible to
                 * this pet only when its species has M1_SEE_INVIS.  The
                 * reconstructed monster may lack `data`, so use the
                 * authoritative MONS row as the same fallback. */
                const _petdata = mtmp.data ?? { mflags1: _MONS[(mtmp.mndx ?? mtmp.mnum ?? -1) | 0]?.[6] ?? 0 };
                if ((!m.minvis || perceives_dm(_petdata))
                    && !(m.mundetected | 0)
                    && (m.mx | 0) === curx && (m.my | 0) === cury /* not tail */)
                    return m;
                /* C: pet can't see it → assume it ain't there; keep scanning. */
            }
        }
    }
    return null;
}

/* -----------------------------------------------------------------------
 * best_target — C ref: dogmove.c:885-933
 * Find best ranged attack target among all 8 directions.
 * Calls find_targ (no RNG) then score_targ (fires rnd(5) per target found).
 * ----------------------------------------------------------------------- */
function best_target(mtmp, forced) {
    if (!mtmp || !(mtmp.mcansee | 0))
        return null;
    let bestscore = -40000;
    let best_targ = null;
    for (let dy = -1; dy < 2; dy++) {
        for (let dx = -1; dx < 2; dx++) {
            if (!dx && !dy) continue;
            const temp_targ = find_targ(mtmp, dx, dy, 7);
            if (!temp_targ) continue;
            const currscore = score_targ(mtmp, temp_targ);
            if (currscore > bestscore) {
                bestscore = currscore;
                best_targ = temp_targ;
            }
        }
    }
    if (!forced && bestscore < 0)
        best_targ = null;
    return best_targ;
}

/* -----------------------------------------------------------------------
 * pet_ranged_attk — C ref: dogmove.c:935-1015
 * Pet considers and maybe executes a ranged attack.
 * Returns MMOVE_DONE if attack made, MMOVE_NOTHING otherwise.
 *
 * RNG consumed:
 *  - score_targ → rnd(5) for each target found by find_targ
 *  - If hungry: rn2(5)
 *  - If target and attack: mattackm → complex (skip attack)
 * ----------------------------------------------------------------------- */
/* -----------------------------------------------------------------------
 * pet_has_ranged_attk — does this pet have any RANGED attack type?
 * C ref: implicit in mattackm — only AT_SPIT/AT_BREA/AT_GAZE/AT_MAGC (and a
 * wielded AT_WEAP that can be thrown) produce a hit at distmin > 1; all melee
 * attack types `continue` (mhitm.c:429) leaving res[] == M_ATTK_MISS.
 *
 * We lack a full per-monster attack table in JS.  Every pet in PET_ATTK and
 * the unknown-pet fallback is melee-only (AT_BITE), so the early-game pet
 * cluster has NO ranged attack → this returns false and pet_ranged_attk falls
 * through to MMOVE_NOTHING, matching C.  WIRE_PENDING: when the full mons[]
 * attack table is ported, consult it here (attacktype AT_SPIT/AT_BREA/etc.).
 * No RNG consumed.
 * ----------------------------------------------------------------------- */
function pet_has_ranged_attk(mtmp) {
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const attk = PET_ATTK.get(mndx);
    if (!attk) return false; /* unknown pet → assume melee-only (early-game) */
    const a = attk.aatyp | 0;
    return a === AT_SPIT || a === AT_BREA || a === AT_GAZE
        || a === AT_MAGC || a === AT_WEAP;
}

async function pet_ranged_attk(mtmp, forced) {
    /* C: hungry check */
    let hungry = 0;
    if (!(mtmp.isminion | 0)) {
        const edog = mtmp.mextra?.edog;
        if (edog) {
            const moves = (game.moves ?? 0) | 0;
            hungry = (moves > (edog.hungrytime + DOG_HUNGRY)) ? 1 : 0;
        }
    }

    /* C: mtarg = best_target(mtmp, forced) — fires score_targ → rnd(5) per dir target */
    const mtarg = best_target(mtmp, forced);

    /* C: if (mtarg && (!hungry || !rn2(5))) { ... attack ... } */
    if (mtarg && (!hungry || !rn2(5))) {
        /* C dogmove.c:923 calls mattackm even when no ranged attack is
         * available. Its defender-state updates precede the attack-range
         * checks; substituting M_ATTK_MISS loses those effects. */
        if (FF_FAITHFUL && !pet_has_ranged_attk(mtmp)) {
            // C still calls mattackm for a melee-only pet's distant target.
            // Before rejecting out-of-range attacks it wakes the defender.
            if (mtarg !== game.u) {
                (game.gb ||= {}).bhitpos = { x: mtmp.mx, y: mtmp.my };
                (game.gn ||= {}).notonhead = false;
                const mstatus = await mattackm(mtmp, mtarg);
                if (mstatus & M_ATTK_AGR_DIED) return MMOVE_DIED;
                if (mstatus !== M_ATTK_MISS) return MMOVE_DONE;
            }
        } else {
            /* C: mstatus != M_ATTK_MISS (pet made a ranged attack) → lose move.
             * Also the calibrated flag-off path (byte-frozen). WIRE_PENDING:
             * full ranged-attack port (mattackm) needed for pet combat sessions. */
            return MMOVE_DONE;
        }
    } else if (forced) {
        /* C: domonnoise — no RNG in common case */
    }
    return MMOVE_NOTHING;
}

/* -----------------------------------------------------------------------
 * mfndpos_stub — generates candidate positions for monster movement.
 * C ref: mon.c:2128 mfndpos — no RNG consumed.
 * Returns array of {x, y, info} objects.
 * Stub: returns all 8 adjacent cells that are within bounds.
 * Full port would check walls/doors/water/etc.
 * ----------------------------------------------------------------------- */
/* C ref: hack.h:1419 — NODIAG(monnum) = ((monnum) == PM_GRID_BUG); pm.generated.js: PM_GRID_BUG=116 */
const PM_GRID_BUG_DG = 116;

/* C trap.h trap-type enum (subset used by m_harmless_trap). */
const T_ARROW=1, T_DART=2, T_ROCK=3, T_SQKY=4, T_BEAR=5, T_LANDMINE=6,
      T_ROLLBOULDER=7, T_SLPGAS=8, T_RUST=9, T_FIRE=10, T_PIT=11, T_SPIKEDPIT=12,
      T_HOLE=13, T_TRAPDOOR=14, T_TELEP=15, T_LEVTELEP=16, T_MAGICPORTAL=17,
      T_WEB=18, T_STATUE=19, T_MAGIC=20, T_ANTIMAGIC=21, T_POLY=22, T_VIBSQ=23;
const M1_FLY_DM = 0x00000001, M1_AMORPHOUS_DM = 0x00000004, M1_UNSOLID_DM = 0x00100000;
const PM_IRON_GOLEM_DM = 259; /* monsters.h MON(... IRON_GOLEM); was 277 = PM_SOLDIER */

/* C ref: trap.c:1063 floor_trigger — local copy (trap.js doesn't export it). */
function floor_trigger_dm(ttyp) {
    return ttyp >= T_ARROW && ttyp <= T_TRAPDOOR; /* 1..14 */
}

/* C ref: trap.c:1108 m_harmless_trap(mtmp, ttmp) — TRUE if the trap won't hurt
 * this monster (so the pet needn't avoid it; it's not marked in info[]).
 * Faithful port for the pet-AI path.  Intrinsic resistances come from the
 * permonst mresists column; equipment-granted resistance is intentionally not
 * reconstructed here yet.
 * The canary's TELEP_TRAP returns FALSE (break -> not harmless). */
export function m_harmless_trap(mtmp, ttmp) {
    const ttyp = ttmp.ttyp | 0;
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const mf1 = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][6] | 0) : 0;
    const isFlyer = !!(mf1 & M1_FLY_DM);
    const amorphous = !!(mf1 & M1_AMORPHOUS_DM);
    const unsolid = !!(mf1 & M1_UNSOLID_DM);
    const msize = (mndx >= 0 && mndx < MONS_MSIZE.length) ? (MONS_MSIZE[mndx] | 0) : MZ_SMALL;
    /* C monst.h:272 `resists_sleep(mon)` -> Resists_Elem(mon, SLEEP_RES).
     * mresists is MONS row column 5 and SLEEP_RES is bit 0x04.  In the live
     * m_move path this matters before mon_knows_traps(): a woodland elf that
     * knows a sleeping-gas trap must retain that square as a candidate. */
    const resistanceBits = (((mndx >= 0 && mndx < _MONS.length)
        ? (_MONS[mndx][5] | 0) : 0)
        | (mtmp.mextrinsics | 0) | (mtmp.mintrinsics | 0));
    const resistsSleep = (resistanceBits & 0x04) !== 0;
    const resistsFire = (resistanceBits & 0x01) !== 0;
    /* C: if (!Sokoban && floor_trigger(ttyp) && check_in_air(mtmp,0)) return TRUE
     * check_in_air(mon) = is_floater || is_flyer  (M1_FLY covers float+fly). */
    if (floor_trigger_dm(ttyp) && isFlyer)
        return true;
    switch (ttyp) {
        case T_ARROW: case T_DART: case T_ROCK: case T_SQKY:
        case T_LANDMINE: case T_ROLLBOULDER:
            break;
        case T_BEAR:
            /* msize <= MZ_SMALL || amorphous || is_whirly || unsolid */
            if (msize <= MZ_SMALL || amorphous || unsolid)
                return true;
            break;
        case T_SLPGAS:
            if (resistsSleep) return true;
            break;
        case T_RUST:
            if (mndx !== PM_IRON_GOLEM_DM) return true;
            break;
        case T_FIRE:
            if (resistsFire) return true;
            break;
        case T_PIT: case T_SPIKEDPIT: case T_HOLE: case T_TRAPDOOR:
            /* is_clinger — default no */ break;
        case T_TELEP: case T_LEVTELEP: case T_MAGICPORTAL: case T_POLY:
            break;
        case T_WEB:
            /* C trap.c:1164 — webmakers are unharmed by webs. */
            if (amorphous || unsolid || mndx === 94 || mndx === 96) return true;
            break;
        case T_STATUE: return true;
        case T_MAGIC: return true;
        case T_ANTIMAGIC: /* resists_magm — default no */ break;
        case T_VIBSQ: return true;
        default: break;
    }
    return false;
}

/* C ref: trap.h fixed_tele_trap(t) = (t->ttyp==TELEP_TRAP && isok(teledest)). */
function fixed_tele_trap_dm(ttmp) {
    if ((ttmp.ttyp | 0) !== T_TELEP) return false;
    const tx = ttmp.teledest?.x ?? ttmp.tx_dest ?? 0;
    const ty = ttmp.teledest?.y ?? ttmp.ty_dest ?? 0;
    return tx > 0 && tx < COLNO && ty >= 0 && ty < ROWNO;
}

/* C ref: mon.c:2335-2358 — set ALLOW_TRAPS bit for a candidate trap square.
 * Pets always pass ALLOW_TRAPS in flag, so mon_knows_traps gate is skipped. */
function trapInfoBit(mtmp, nx, ny, flag) {
    const ttmp = t_at(nx, ny);
    if (!ttmp) return 0;
    const ttyp = ttmp.ttyp | 0;
    if (ttyp >= 24 /* TRAPNUM */ || ttyp === 0) return 0;
    if (fixed_tele_trap_dm(ttmp) && hastrack(nx, ny))
        return ALLOW_TRAPS;
    if (!m_harmless_trap(mtmp, ttmp)) {
        if (!(flag & ALLOW_TRAPS)) {
            /* mon_knows_traps gate — pets have ALLOW_TRAPS so never reached here */
        }
        return ALLOW_TRAPS;
    }
    return 0;
}

/* C ref: rm.h IS_DOOR(typ)=(typ==DOOR); D_BROKEN=0x01.
 * Door-diagonal gate: a closed/open/locked door (anything but a doorless
 * D_NODOOR opening or a fully D_BROKEN door) blocks diagonal passage. */
function door_blocks_diag(loc) {
    if (!loc || (loc.typ | 0) !== DOOR_TYP) return false;
    const dm = (loc.doormask ?? loc.flags ?? 0) | 0;
    return (dm & ~D_BROKEN) !== 0;
}

/* C ref: hack.c:922 bad_rock(mdat,x,y) — for a non-tunneling, non-wallwalking
 * pet this reduces to IS_OBSTRUCTED(levl[x][y].typ) (Sokoban boulder path and
 * the dig/passwall exceptions don't apply to ordinary pets). */
function bad_rock_pet(loc) {
    const typ = (loc?.typ ?? 0) | 0;
    return typ < POOL_TYP; /* IS_OBSTRUCTED */
}

/* Faithful port of C mon.c:2128 mfndpos (pet subset: no ALLOW_WALL/DIG/BARS,
 * not a swimmer/flyer/lava-liker, sighted, unconfused, not amorphous).
 * Enumerates the 8 neighbours in C's column-major (nx outer, ny inner) order
 * and applies the rejection conditions in C's exact sequence so the candidate
 * COUNT and ORDER match C — which is what determines how many rn2() the
 * downstream dog_move selection loop draws. */
function mfndpos_stub(mtmp, allowflags) {
    const x = mtmp.mx | 0;
    const y = mtmp.my | 0;
    const locs = game.level?.locations;
    const nowloc = locs?.[x]?.[y];
    const nowIsDoor = (nowloc?.typ | 0) === DOOR_TYP;
    /* C mon.c:2152 — nodiag = NODIAG(mdat - mons): grid bugs can't move diagonally. */
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    const nodiag = (mndx === PM_GRID_BUG_DG);
    /* C mon.c:2238 — Is_rogue_level(&u.uz): on the rogue level a monster may not
     * move diagonally into OR out of a doorway.  Mirrors the const.js helper. */
    const onRogueLevel = !!Is_rogue_level_dm();
    const positions = [];
    for (let nx = x - 1; nx <= x + 1; nx++) {
        for (let ny = y - 1; ny <= y + 1; ny++) {
            if (nx === x && ny === y) continue;
            if (nx < 1 || nx >= COLNO - 1 || ny < 0 || ny >= ROWNO) continue;
            const loc = locs?.[nx]?.[ny];
            if (!loc) continue; /* off-map / no data → STONE, obstructed */
            const ntyp = loc.typ | 0;
            /* C mon.c:2200 — IS_OBSTRUCTED(ntyp) (no passwall/dig for a pet). */
            if (ntyp < POOL_TYP) continue;
            /* C mon.c:2219 — closed/locked door without thrudoor. */
            if (ntyp === DOOR_TYP) {
                const dm = (loc.doormask ?? loc.flags ?? 0) | 0;
                if (dm & (D_CLOSED | D_LOCKED)) continue;
            }
            const isDiag = (nx !== x && ny !== y);
            /* C mon.c:2233-2243 — first diagonal checks. */
            if (isDiag
                && (nodiag
                    || (nowIsDoor && door_blocks_diag(nowloc))
                    || (ntyp === DOOR_TYP && door_blocks_diag(loc))
                    || ((nowIsDoor || ntyp === DOOR_TYP) && onRogueLevel)))
                continue;
            /* C mon.c:2246-2247 — pool/lava gating.  A plain pet is not a
             * swimmer and not in air/lava-liking: poolok=lavaok=wantpool=FALSE,
             * so pool squares (is_pool) and lava squares are rejected. */
            if (ntyp >= POOL_TYP && ntyp <= DRAWBRIDGE_UP_TYP) continue; /* is_pool */
            if (ntyp === LAVAPOOL_TYP || ntyp === LAVAWALL_TYP) continue; /* is_lava */
            let info = 0;
            /* C mon.c:2271-2285 — hero at (nx,ny). */
            const u = game.u;
            if (u && (u.ux | 0) === nx && (u.uy | 0) === ny) {
                if (!(allowflags & ALLOW_U)) continue;
                info |= ALLOW_U;
            } else {
                /* C mon.c:2287-2305 — another monster at (nx,ny). */
                if (allowflags & ALLOW_M) {
                    for (let m = game.fmon; m; m = m.nmon) {
                        if ((m.mhp | 0) > 0 && (m.mx | 0) === nx && (m.my | 0) === ny
                                && !m.mtame) {
                            info |= ALLOW_M;
                            break;
                        }
                    }
                }
            }
            /* C mon.c:2322-2326 — boulder check: exclude squares with a boulder unless
             * ALLOW_ROCK is set. Pets don't have ALLOW_ROCK (flags=0x600a0000), so
             * boulder squares are always excluded for ordinary pets.
             * C ref: checkobj && sobj_at(BOULDER, nx, ny) && !(flag & ALLOW_ROCK) → continue.
             * OBJ_AT(nx,ny) ↔ !!game.level.levelObjects[nx][ny] (the checkobj equivalent). */
            if (game.level?.levelObjects?.[nx]?.[ny]) {
                /* sobj_at(BOULDER, nx, ny): walk the nexthere chain */
                let _hasBoulder = false;
                for (let _o = game.level.levelObjects[nx][ny]; _o; _o = _o.nexthere) {
                    if ((_o.otyp | 0) === BOULDER_OTYP) { _hasBoulder = true; break; }
                }
                if (_hasBoulder && !(allowflags & ALLOW_ROCK))
                    continue;
                if (_hasBoulder)
                    info |= ALLOW_ROCK;
            }
            /* C mon.c:2333-2335 — diagonal tight squeeze between two bad-rock
             * squares (a pet that can't squeeze through). */
            if (isDiag && bad_rock_pet(locs?.[x]?.[ny]) && bad_rock_pet(locs?.[nx]?.[y]))
                continue;
            /* C mon.c:2341-2358 — mark ALLOW_TRAPS for a (non-harmless) trap. */
            info |= trapInfoBit(mtmp, nx, ny, allowflags);
            positions.push({ x: nx, y: ny, info });
        }
    }
    return positions;
}

/* mattackm_rng_stub — DELETED.  It was a second body for C's mattackm()
 * (mhitm.c:292-615): a calibrated RNG-order model that the live dog_move ALLOW_M
 * branch called instead of the real port below.  The real mattackm() is now
 * wired at C's call sites (dogmove.c:1204, 1218), so keeping the model would
 * leave two divergent JS copies of one C function. */

/* -----------------------------------------------------------------------
 * passivemm_rng — C ref: nethack-c/src/mhitm.c:1303-1457 passivemm()
 *
 * Models the RNG consumption of the defender's passive counter-attack after
 * a monster-vs-monster melee (mattackm).  C consumes RNG as follows, in order:
 *
 *   1. find slot i = first mattk[] entry with aatyp == AT_NONE (the passive
 *      slot).  If none in NATTK(=6) slots → no passive attack → NO RNG.
 *      A monster row that lists fewer than NATTK active attacks has the
 *      remaining slots implicitly {AT_NONE, AD_PHYS, 0, 0}, so the passive
 *      slot is the implicit trailing slot {0,0,0,0} unless an explicit
 *      AT_NONE passive (e.g. [0,AD_ACID,1,8]) is listed.
 *   2. tmp roll: if mattk[i].damn  → d(damn, damd)
 *                elif mattk[i].damd → d(mlevel+1, damd)
 *                else tmp=0    (the d() only matters for RNG count)
 *   3. top switch(adtyp):
 *        AD_ACID(8): rn2(2) [iff mhitb], rn2(30), rn2(6); then DONE (goto
 *                    assess_dmg — skips the rn2(3) block)
 *        AD_ENCH / default: no RNG
 *   4. if (mdead || mcan) → return (no rn2(3))   [mcan unmodelled: assume 0]
 *   5. rn2(3) — then inner switch consumes more only for the floating-eye
 *      AD_PLYS case: rn2(4).
 *
 * AD constants here use the C monattk.h numbering (AD_PHYS=0, AD_FIRE=2,
 * AD_COLD=3, AD_ELEC=6, AD_ACID=8, AD_PLYS=14) — these are the raw adtyp
 * values stored in MON_MATTK.
 *
 * mcan (monster cancelled) and golem/resist effects are not modelled: they do
 * not change RNG consumption for the passive-damage cases reached here.
 * ----------------------------------------------------------------------- */
const _AD_FIRE = 2, _AD_COLD = 3, _AD_ELEC = 6, _AD_ACID = 8;
const _AD_STUN = 12, _AD_PLYS = 14;
const _PM_FLOATING_EYE = 28;

function passivemm_rng(magr, mdef, mhitb, mdead) {
    const mndx_def = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
    const mhit = mhitb ? M_ATTK_HIT : M_ATTK_MISS;

    /* C mhitm.c:1317-1322 — find first AT_NONE slot in the fixed NATTK array. */
    const row = mon_mattk_raw(mndx_def); /* array of [aatyp,adtyp,damn,damd] | null */
    let slot = null; /* the passive {aatyp,adtyp,damn,damd}; null ⇒ no passive */
    {
        let i = 0;
        for (; i < NATTK; i++) {
            const a = (row && i < row.length) ? row[i] : [AT_NONE, 0, 0, 0];
            if ((a[0] | 0) === AT_NONE) { /* found the passive slot */
                slot = { adtyp: a[1] | 0, damn: a[2] | 0, damd: a[3] | 0 };
                break;
            }
        }
        if (i >= NATTK) {
            /* no AT_NONE slot in any of the 6 — no passive attacks, no RNG */
            return mdead | mhit;
        }
    }

    const mddat_mlevel = (mndx_def >= 0 && mndx_def < _MONS.length)
        ? (_MONS[mndx_def][1] | 0) : 0;

    /* C mhitm.c:1323-1328 — tmp damage roll (RNG count only). */
    if (slot.damn) {
        d(slot.damn, slot.damd);
    } else if (slot.damd) {
        d(mddat_mlevel + 1, slot.damd);
    }

    /* C mhitm.c:1331-1358 — top switch.  Only AD_ACID / AD_ENCH special-case. */
    if (slot.adtyp === _AD_ACID) {
        if (mhitb) rn2(2); /* C:1333 — only rolled on a hit */
        rn2(30);           /* C:1345 */
        rn2(6);            /* C:1347 */
        /* goto assess_dmg — skips the rn2(3) block entirely */
        return mdead | mhit;
    }
    /* AD_ENCH(16) and default: no RNG, fall through */

    /* C mhitm.c:1359-1360 — defender dead/cancelled → no rn2(3).
     * mcan is not tracked on JS monsters yet; treat as not-cancelled. */
    if (mdead) {
        return mdead | mhit;
    }

    /* C mhitm.c:1363 — rn2(3) gate on the live-defender passive effect. */
    if (rn2(3)) {
        switch (slot.adtyp) {
            case _AD_PLYS: /* floating eye / gelatinous cube */
                if (mndx_def === _PM_FLOATING_EYE) {
                    rn2(4); /* C mhitm.c:1369 — if (!rn2(4)) tmp = 127 */
                }
                break;
            /* AD_COLD/AD_FIRE/AD_ELEC/AD_STUN and default: no further RNG */
            default:
                break;
        }
    }
    return mdead | mhit;
}

/* -----------------------------------------------------------------------
 * mattackm — C ref: nethack-c/src/mhitm.c:292-594
 * Monster-vs-monster attack. Returns M_ATTK_* flags.
 * ----------------------------------------------------------------------- */
const M_ATTK_AGR_DONE$ = 0x08;
/* AD_DRIN/AD_WRAP/AD_STCK/AD_DGST and AT_HUGS/AT_EXPL: single definitions live
 * in the monattk.h block near the top of this file.  They used to be
 * re-declared here with invented numbering (AD_DRIN was 12 = C's AD_STUN,
 * AD_WRAP 10, AD_STCK 9, AD_DGST 11, AT_EXPL 14 = C's AT_BOOM). */
/* PM_BLACK_PUDDING/PM_BROWN_PUDDING/PM_SHADE used to be re-declared here as
 * PM_*$ with invented indices (233/232/285) instead of the real v5 mons[]
 * slots (209/207/288, js/pm.generated.js, cross-checked against
 * nethack-c-v5/upstream/src/mhitm.c:456-511's `mons[PM_BLACK_PUDDING]` etc.)
 * — a wrong-index local copy of the class undefined-const-lint's `$`-suffix
 * bug hid from the lint (it flagged the bare unsuffixed name as an
 * undefined-const false positive, never the wrong value on the real,
 * in-scope `$` name). Now imported from pm.generated.js like every other
 * PM_* this file already uses unaliased. */
const NEED_WEAPON$ = 1;
/* C monst.h:32 enum wpn_chk_flags — NEED_HTH_WEAPON is 3; 2 is
 * NEED_RANGED_WEAPON.  This was 2, which sent mattackm's melee wield check
 * (mhitm.c:407) down mon_wield_item's RANGED arm.  It read as harmless while
 * that arm wrongly wielded select_rwep's return value (a hand-thrown missile
 * is usually the same object select_hwep would pick), and became visible the
 * moment the ranged arm was corrected to wield gp.propellor as C does. */
const NEED_HTH_WEAPON$ = 3;
const NO_TRAP_FLAGS$ = 0;

/* C ref: mhitm.c:105-171 fightm(struct monst *mtmp) — "have monsters fight
 * each other".  Called from movemon_singlemon (mon.c:1305-1318) for every
 * monster the CONFLICTED hero can see, and its FIRST statement draws
 * rnd(20) via resist_conflict(); a monster that resists is left to its
 * ordinary dochug.  Lives here rather than in js/mhitm.js because mattackm
 * (also mhitm.c) is defined in this file.
 *
 * seed0004-feeding-pony: the hero puts on an unidentified ring of conflict at
 * step 283 and from that turn on C draws one rnd(20) per adjacent-and-visible
 * monster, per turn, that this port drew none of. */
export async function fightm(mtmp) {
    const g = game;
    const u = g.u;
    /* C mhitm.c:110-112 — perhaps the monster will resist Conflict. */
    if (resist_conflict(mtmp))
        return 0;
    if (u && u.ustuck === mtmp) {
        /* C mhitm.c:114-118 itsstuck(mtmp) := sticks(gy.youmonst.data)
         * && mtmp == u.ustuck && !u.uswallow.  sticks() has no JS counterpart
         * (the corpus hero is never a sticky polymorph form) — the same
         * documented carve-out js/monmove.js:2043 already carries.  RNG-free. */
    }
    const has_u_swallowed = engulfing_u_const(mtmp);
    let nmon;
    for (let mon = g.fmon; mon; mon = nmon) {
        nmon = mon.nmon;
        if (nmon === mtmp)
            nmon = mtmp.nmon;
        /* C: ignore monsters that are already dead (DEADMONSTER). */
        if (mon !== mtmp && (mon.mhp | 0) > 0) {
            if (monnear_fm(mtmp, mon.mx | 0, mon.my | 0)) {
                if (!(u && u.uswallow) && u && mtmp === u.ustuck) {
                    if (!rn2(4)) {
                        set_ustuck(null);
                        void pline(`${Monnam_dm(mtmp)} releases you!`);
                    } else {
                        break;
                    }
                }
                /* C mhitm.c:139-142 — bhitpos/notonhead are read back by
                 * mattackm's target-still-there guard, so set them first. */
                (g.gb ||= {}).bhitpos = { x: mon.mx | 0, y: mon.my | 0 };
                (g.gn ||= {}).notonhead = false;
                const result = await mattackm(mtmp, mon);
                if (result & M_ATTK_AGR_DIED)
                    return 1; /* mtmp died */
                /* C: if mtmp has the hero swallowed, lie and say no attack. */
                if (has_u_swallowed)
                    return 0;
                /* C mhitm.c:155-166 — attacked monsters get a chance to hit
                 * back (primarily so conflict-resisting monsters can respond). */
                if ((result & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                    && rn2(4) && (mon.movement | 0) > rn2(NORMAL_SPEED_FM)) {
                    if ((mon.movement | 0) > NORMAL_SPEED_FM)
                        mon.movement = (mon.movement | 0) - NORMAL_SPEED_FM;
                    else
                        mon.movement = 0;
                    g.gb.bhitpos = { x: mtmp.mx | 0, y: mtmp.my | 0 };
                    g.gn.notonhead = false;
                    await mattackm(mon, mtmp); /* return attack */
                }
                return (result & M_ATTK_HIT) ? 1 : 0;
            }
        }
    }
    return 0;
}
/* C monmove.c monnear(mon, x, y): dist2 < 3, with dist2 == 2 (a diagonal)
 * rejected for a NODIAG mover (grid bug).  Same predicate dog_move spells out
 * inline at its return-attack site. */
function monnear_fm(mon, x, y) {
    const distance = dist2(mon.mx | 0, mon.my | 0, x | 0, y | 0);
    if (distance === 2 && ((mon.mnum ?? mon.mndx ?? -1) | 0) === PM_GRID_BUG_DG)
        return false;
    return distance < 3;
}
/* C monattk.h / permonst.h NORMAL_SPEED = 12. */
const NORMAL_SPEED_FM = 12;

export async function mattackm(magr, mdef) {
    let i, tmp, strike = 0, attk, struck = 0;
    let res = new Array(NATTK);
    let dieroll = 0;
    let mattk, alt_attk;
    let mwep;
    let pa, pd;

    if (!magr || !mdef)
        return M_ATTK_MISS;
    if (helpless_dm(magr))
        return M_ATTK_MISS;
    pa = magr.data;
    pd = mdef.data;

    /* Grid bugs cannot attack at an angle. */
    if (pa && (magr.mnum === PM_GRID_BUG_DG)
        && magr.mx !== mdef.mx && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* Calculate the armour class differential. */
    tmp = find_mac_dm(mdef) + (magr.m_lev | 0);
    if (mdef.mconf || helpless_dm(mdef)) {
        tmp += 4;
        mdef.msleeping = 0;
    }

    /* C mhitm.c:327-351 — mundetected monsters become un-hidden if attacked.
     * Every arm below is RNG-FREE in C (pure newsym/pline work), so no gap in
     * here can shift the RNG stream in either direction.
     * KNOWN GAP (message text only): C reaches this through You()/pline_mon()/
     * Monnam()/mon_nam()/makeplural(), none of which is bound in this module —
     * calling them would have thrown a ReferenceError the first time a hidden
     * defender was attacked, i.e. total session failure.  They are spelled here
     * with this file's local Monnam_dm/mon_nam_dm (identical output for the
     * ordinary monster case) and with noname_monnam/a_monnam, which remain
     * placeholder stubs, so the "dream of"/"Suddenly, you notice" wording can
     * still differ from C on the rare Unaware / never-before-seen paths. */
    if (mdef.mundetected) {
        mdef.mundetected = 0;
        newsym(mdef.mx, mdef.my);
        if (canseemon(mdef) && !sensemon_dm(mdef)) {
            const Unaware = game.flags?.unaware || 0;
            if (Unaware) {
                /* C: justone = (mdef->data->geno & G_UNIQ) != 0 */
                const justone = ((pd && (pd.geno & 0x1000)) ? 1 : 0);
                const montype = noname_monnam(mdef, justone ? 2 : 0);
                pline('You dream of ' + montype + '.');
            } else {
                const last_msg = game.flags?.last_msg | 0;
                const last_hider = game.l?.last_hider | 0;
                const PLNMSG_HIDE_UNDER = 10;
                if (last_msg === PLNMSG_HIDE_UNDER && mdef.m_id === last_hider)
                    pline(Monnam_dm(mdef) + ' emerges from hiding.');
                else if (mdef.m_id === last_hider)
                    pline('You notice ' + mon_nam_dm(mdef) + '.');
                else
                    pline('Suddenly, you notice ' + a_monnam(mdef) + '.');
            }
        }
    }

    /* Elves hate orcs. */
    if (pa && pd && is_elf_dm(pa) && is_orc_dm(pd))
        tmp++;

    /* Set up the visibility of action */
    {
        let spot_magr = canspotmon(magr);
        let spot_mdef = canspotmon(mdef);
        game.v = game.v || {};
        game.v.vis = ((cansee(magr.mx, magr.my) && spot_magr)
                      || (cansee(mdef.mx, mdef.my) && spot_mdef)) ? 1 : 0;
    }

    /* Set flag indicating monster has moved this turn. */
    magr.mlstmv = (game.moves ?? 0) | 0;

    /* skipdrin - mind flayer tentacle DRIN reduction */
    game.s = game.s || {};
    game.s.skipdrin = 0;

    /* Now perform all attacks for the monster. */
    for (i = 0; i < NATTK; i++) {
        res[i] = M_ATTK_MISS;

        /* C mhitm.c:380-383 — target might no longer be there:
         *   if (i > 0 && (m_at(gb.bhitpos.x, gb.bhitpos.y) != mdef
         *                 || DEADMONSTER(magr) || DEADMONSTER(mdef)))
         *       continue;
         * gb.bhitpos is set by the CALLER (dogmove.c:1200, 1216) to the square
         * being attacked.  The previous code read `game.b?.bhitpos`, a global
         * that does not exist in this port (the repo spells it `game.gb`), and
         * resolved m_at through a `return null` stub, so this guard was
         * unconditionally true for every i>0 and silently dropped every attack
         * after the first — including its rnd(20+i) to-hit roll. */
        if (i > 0) {
            const bhit = game.gb?.bhitpos || { x: 0, y: 0 };
            if (m_at_dm(bhit.x | 0, bhit.y | 0) !== mdef
                || DEADMONSTER_dm(magr) || DEADMONSTER_dm(mdef))
                continue;
        }

        mattk = getmattk(magr, mdef, i, res, alt_attk || {});
        if (!mattk) continue;
        if (game.s.skipdrin && mattk.aatyp === AT_TENT && mattk.adtyp === AD_DRIN)
            continue;
        mwep = null;
        attk = 1;

        switch (mattk.aatyp) {
        case AT_WEAP:
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1) {
                strike = (thrwmm(magr, mdef) === M_ATTK_MISS) ? 0 : 1;
                if (strike)
                    res[i] |= M_ATTK_HIT;
                if (DEADMONSTER_dm(mdef))
                    res[i] = M_ATTK_DEF_DIED;
                if (DEADMONSTER_dm(magr))
                    res[i] |= M_ATTK_AGR_DIED;
                break;
            }
            if (magr.weapon_check === NEED_WEAPON$ || !MON_WEP_dm(magr)) {
                magr.weapon_check = NEED_HTH_WEAPON$;
                if (await mon_wield_item(magr) !== 0)
                    return M_ATTK_MISS;
            }
            await possibly_unwield(magr, false);
            mwep = MON_WEP_dm(magr);
            if (mwep) {
                if (game.v?.vis)
                    mswingsm(magr, mdef, mwep);
                tmp += hitval_dm(mwep, mdef);
            }
            /* FALLTHROUGH */
        case AT_CLAW:
        case AT_KICK:
        case AT_BITE:
        case AT_STNG:
        case AT_TUCH:
        case AT_BUTT:
        case AT_TENT:
            if (mattk.aatyp === AT_KICK && mtrapped_in_pit(magr))
                continue;
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            if (!magr.mconf && !(game.flags?.conflict || 0) && mwep
                && mattk.aatyp !== AT_WEAP
                && touch_petrifies_dm(mdef.data)) {
                strike = 0;
                break;
            }
            dieroll = rnd(20 + i);
            strike = (tmp > dieroll) ? 1 : 0;
            if (mwep)
                tmp -= hitval_dm(mwep, mdef);
            if (strike) {
                if (unsolid_dm(mdef.data) && failed_grab(magr, mdef, mattk)) {
                    strike = 0;
                    break;
                }
                res[i] = await hitmm(magr, mdef, mattk, mwep, dieroll);
                if ((mdef.data && (mdef.mnum === PM_BLACK_PUDDING
                                   || mdef.mnum === PM_BROWN_PUDDING))
                    && mwep && mwep.otyp !== undefined
                    && (objects_material_dm(mwep.otyp) === 15 /* IRON */
                        || objects_material_dm(mwep.otyp) === 16 /* METAL */)
                    && mdef.mhp > 1 && !mdef.mcan) {
                    let mclone = clone_mon(mdef, 0, 0);
                    if (mclone) {
                        if (game.v?.vis && canspotmon(mdef))
                            /* C mhitm.c:461 pline("%s divides as %s hits it!",
                             * Monnam(mdef), mon_nam(magr)) — spelled with this
                             * file's local namers; the module-level Monnam/
                             * mon_nam are not bound here and would throw. */
                            pline(Monnam_dm(mdef) + ' divides as ' + mon_nam_dm(magr) + ' hits it!');
                        await mintrap_dm(mclone, NO_TRAP_FLAGS$);
                        if (DEADMONSTER_dm(magr))
                            res[i] |= M_ATTK_AGR_DIED;
                    }
                }
            } else {
                missmm(magr, mdef, mattk);
            }
            break;

        case AT_HUGS:
            strike = (i >= 2 && res[i - 1] === M_ATTK_HIT
                      && res[i - 2] === M_ATTK_HIT) ? 1 : 0;
            if (strike) {
                if (failed_grab(magr, mdef, mattk))
                    strike = 0;
                else
                    res[i] = await hitmm(magr, mdef, mattk, null, 0);
            }
            break;

        case AT_GAZE:
            strike = 0;
            res[i] = gazemm(magr, mdef, mattk);
            break;

        case AT_EXPL:
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            res[i] = explmm(magr, mdef, mattk);
            if (res[i] === M_ATTK_MISS) {
                strike = 0;
                attk = 0;
            } else {
                strike = 1;
            }
            break;

        case AT_ENGL:
            if (mdef.data && mdef.mnum === PM_SHADE) {
                if (game.v?.vis)
                    /* C mhitm.c:513 pline("%s attempt to engulf %s is futile.",
                     * s_suffix(Monnam(magr)), mon_nam(mdef)) — s_suffix(s) is
                     * s + "'s" (mhitm.c side); spelled locally because the
                     * module-level s_suffix/Monnam/mon_nam are not bound here. */
                    pline(Monnam_dm(magr) + "'s attempt to engulf " + mon_nam_dm(mdef) + ' is futile.');
                strike = 0;
                break;
            }
            if (game.u?.usteed && mdef === game.u.usteed) {
                strike = 0;
                break;
            }
            if (distmin(magr.mx, magr.my, mdef.mx, mdef.my) > 1)
                continue;
            if (engulfing_u_dm(magr)) {
                strike = 0;
            } else if ((strike = (tmp > rnd(20 + i)) ? 1 : 0) !== 0) {
                if (failed_grab(magr, mdef, mattk))
                    strike = 0;
                else
                    res[i] = gulpmm(magr, mdef, mattk);
            } else {
                missmm(magr, mdef, mattk);
            }
            break;

        case AT_BREA:
        case AT_SPIT:
            if (!monnear_dm(magr, mdef.mx, mdef.my)) {
                let mmtmp = (mattk.aatyp === AT_BREA)
                    ? await breamm_mu(magr, mattk, mdef)
                    : await spitmm_mu(magr, mattk, mdef);
                strike = (mmtmp === M_ATTK_MISS) ? 0 : 1;
                if (strike)
                    res[i] |= M_ATTK_HIT;
                if (DEADMONSTER_dm(mdef))
                    res[i] = M_ATTK_DEF_DIED;
                if (DEADMONSTER_dm(magr))
                    res[i] |= M_ATTK_AGR_DIED;
            } else {
                strike = 0;
                attk = 0;
            }
            break;

        default:
            strike = 0;
            attk = 0;
            break;
        }

        if (attk && !(res[i] & M_ATTK_AGR_DIED)
            && distmin(magr.mx, magr.my, mdef.mx, mdef.my) <= 1)
            /* C mhitm.c:572 passivemm(magr, mdef, strike, res[i] & M_ATTK_DEF_DIED, mwep)
             * — the RAW bitmask (0 or M_ATTK_DEF_DIED), not a boolean, since
             * passivemm_rng returns `mdead | mhit` directly as the new res[i]. */
            res[i] = passivemm_rng(magr, mdef, strike, (res[i] & M_ATTK_DEF_DIED));

        if (res[i] & M_ATTK_DEF_DIED)
            return res[i];
        if (res[i] & M_ATTK_AGR_DIED)
            return res[i];
        if ((res[i] & M_ATTK_AGR_DONE$) || helpless_dm(magr))
            return res[i];
        if (mon_offmap_dm(mdef))
            return res[i];
        if (res[i] & M_ATTK_HIT)
            struck = 1;
    }

    return (struck ? M_ATTK_HIT : M_ATTK_MISS);
}

/* Stubs and helpers for mattackm */
function helpless_dm(mon) {
    if (!mon) return true;
    if (mon.msleeping) return true;
    if (!mon.mcanmove) return true;
    return false;
}

function find_mac_dm(mon) {
    /* C worn.c:717 — include every worn armor/accessory contribution.  The
     * shared trap.js implementation is the canonical port of this helper;
     * using the old base-only lookup made an armored monster easier to hit
     * than C, turning a miss (and its passive retaliation) into an extra
     * damage roll. */
    return find_mac_mon(mon);
}

function DEADMONSTER_dm(mon) {
    if (!mon) return true;
    return (mon.mhp | 0) < 1;
}

function sensemon_dm(mon) { return sensemon(mon); }

function is_elf_dm(pa) {
    if (!pa) return false;
    let mndx = pa.pmidx;
    if (mndx === undefined) return false;
    return _is_elf(mndx);
}

function is_orc_dm(pd) {
    if (!pd) return false;
    let mndx = pd.pmidx;
    if (mndx === undefined) return false;
    return _is_orc(mndx);
}

/* C mon.c m_at(x, y).  js/uhitm.js owns the single port and this file already
 * imports it; the previous `return null` body was a second, degenerate copy. */
function m_at_dm(x, y) { return m_at(x, y); }

function unsolid_dm(data) {
    if (!data) return false;
    return (data.mflags1 & 0x00100000) ? true : false;
}

function touch_petrifies_dm(data) {
    const n = data?.pmidx ?? data?.mnum ?? data?.mndx;
    return (n | 0) === PM_CHICKATRICE || (n | 0) === PM_COCKATRICE;
}

/* C weapon.c:149-187 hitval().  The canonical implementation already lives
 * in uhitm.js; the monster-vs-monster path had been using a silent zero-copy. */
function hitval_dm(mwep, mdef) {
    const mndx = (mdef?.data?.pmidx ?? mdef?.mndx ?? mdef?.mnum ?? -1) | 0;
    return hitval(mwep, mdef, mndx);
}

function monnear_dm(magr, mx, my) {
    return distmin(magr.mx, magr.my, mx, my) <= 1;
}

function engulfing_u_dm(magr) {
    return engulfing_u_const(magr);
}

/* C mondata.h:mon_offmap(mon) == (mon->mstate != MON_FLOOR). MON_FLOOR is 0,
 * so any nonzero mstate (MON_DETACH et al., set on death/migration) means
 * off-map. */
function mon_offmap_dm(mdef) {
    if (!mdef) return true;
    return (mdef.mstate | 0) !== 0;
}

function objects_material_dm(otyp) {
    return (otyp >= 0 && otyp < MKOBJ_OC_MATERIAL.length)
        ? (MKOBJ_OC_MATERIAL[otyp] | 0) : 0;
}

async function mintrap_dm(mclone, flags) { return await mintrap_real(mclone, flags); }

function sgn_dm(n) { return n > 0 ? 1 : (n < 0 ? -1 : 0); }
/* C mondata.c sticks(ptr) — grabbing-attack check; not modeled (rare for the
 * mon-vs-mon melee path), matches the always-false convention used by other
 * unmodeled predicates in this file (e.g. touch_petrifies_dm). */
function sticks_dm(ptr) { return sticks(ptr); }

/* C uhitm.c:5248-5421 mhitm_knockback — mon-vs-mon subset only (magr/mdef are
 * never the hero in this dogmove.js call path, so the u_agr/u_def branches
 * never apply). The two RNG draws (knockdistance, chance) are ALWAYS
 * consumed first, exactly as C does before any of the disqualifying checks. */
export async function mhitm_knockback(magr, mdef, mattk, mhm, weapon_used) {
    const knockdistance = rn2(3) ? 1 : 2;
    const chance = 6;
    if (rn2(chance))
        return false;

    if (!(((mattk.adtyp | 0) === 0 /* AD_PHYS */)
          && ((mattk.aatyp | 0) === AT_CLAW || (mattk.aatyp | 0) === AT_KICK
              || (mattk.aatyp | 0) === AT_BUTT || (mattk.aatyp | 0) === AT_WEAP)))
        return false;

    if (attacktype(magr.data, AT_ENGL) || attacktype(magr.data, AT_HUGS)
        || sticks_dm(magr.data))
        return false;

    const defx = mdef.mx | 0, defy = mdef.my | 0;
    const dx = sgn_dm(defx - (magr.mx | 0));
    const dy = sgn_dm(defy - (magr.my | 0));
    if (!isok(defx + dx, defy + dy))
        return false;
    /* C:5303-5306 door-diagonal check skipped — no is_door lane in this
     * port's scope; equivalent to always-doorless for the captured records. */

    if (DEADMONSTER_dm(magr) || DEADMONSTER_dm(mdef))
        return false;
    /* C uhitm.c:5324 if (magr->data->msize <= mdef->data->msize + 1) return FALSE.
     * `?.` guards a replay-reconstructed monst with no materialized ->data;
     * absent data reads as msize 0 on both sides, so the test fails closed
     * exactly as an equal-size pair would.  RNG-free either way (both draws
     * already happened above). */
    if (!(((magr.data?.msize | 0) > (mdef.data?.msize | 0) + 1)))
        return false;
    /* C:5330 flimsy/blunt-weapon gate skipped — mwep material/type not
     * modeled in this port's scope. */
    if (unsolid_dm(magr.data))
        return false;
    /* C:5343 m_is_steadfast(mdef) skipped — not modeled. */

    /* C uhitm.c:5361-5376.  These formatting draws happen while pline is
     * displaying the knockback message.  In particular, pline may suspend
     * the turn at --More--; the mhurtle and stun tail must therefore remain
     * after the awaited message (C resumes it on the next input). */
    if (canseemon(mdef)) {
        const knockedhow = 'back';
        await pline(`${Monnam_dm(magr)} knocks ${mon_nam_dm(mdef)} ${knockedhow} with a ${
            rn2(2) ? 'forceful' : 'powerful'} ${rn2(2) ? 'blow' : 'strike'}!`);
    }

    /* C uhitm.c:5386: move the defender before recording the hit/stun tail.
     * cmd.js owns the shared dothrow.c mhurtle implementation; dynamic import
     * avoids the cmd -> dogmove module cycle while preserving this async point. */
    const { mhurtle } = await import('./cmd.js');
    await mhurtle(mdef, dx, dy, knockdistance);

    mhm.hitflags |= M_ATTK_HIT;
    if (DEADMONSTER_dm(mdef)) {
        mhm.hitflags |= M_ATTK_DEF_DIED;
    } else if (!rn2(4)) {
        mdef.mstun = 1;
    }
    if (DEADMONSTER_dm(magr))
        mhm.hitflags |= M_ATTK_AGR_DIED;
    return true;
}

/* C mon.c:3364 monkilled(mdef, "", how) → mondied(mdef) → mondead(mdef)
 * (life-saving, vampshifter-revert, vault-guard-corridor, bones-file paths
 * are not modeled — unreachable for an ordinary mon-vs-mon melee kill) →
 * m_detach → mondied's corpse_chance + make_corpse (default/common case
 * only; the gas-spore/lich/Vlad/golem/mplayer/rider/shopkeeper special cases
 * in corpse_chance and make_corpse are not modeled here). */
async function monkilled_dm(mdef, mattk) {
    /* C mon.c:3382-3391 monkilled(mdef, "", how):
     *     if (fltxt && (mdef->wormno ? worm_known(mdef)
     *                                : cansee(mdef->mx, mdef->my)))
     *         pline_mon(mdef, "%s is %s%s%s!", Monnam(mdef),
     *                   nonliving(mptr) ? "destroyed" : "killed",
     *                   *fltxt ? " by the " : "", fltxt);
     *     else
     *         iflags.sad_feeling = mdef->mtame ? TRUE : FALSE;
     * The mhitm.c:1088 callsite passes fltxt="" — a non-null empty string, so
     * `fltxt` is TRUE and `*fltxt` is '\0': the guard reduces to cansee() and the
     * " by the <fltxt>" suffix is empty.  This message was previously emitted
     * UNCONDITIONALLY, so a monster killed out of the hero's sight announced its
     * own death: seed0030 segment 5 step 37 printed "You hear some noises in the
     * distance.  It is killed!" where C prints only the noises line ("It" being
     * Monnam of a monster the hero cannot see is itself the tell).
     * wormno/worm_known: long worms are not modeled in this file's scope, and a
     * pet-melee kill of a worm segment is not exercised by the corpus; the
     * cansee() arm is C's behaviour for every non-worm mdef.
     * DISPLAY-ONLY and RNG-free — the pline is the only thing gated; every
     * death-bookkeeping step below still runs either way.
     * The else arm's iflags.sad_feeling is a DEFERRED signal in this port (the
     * "you have a peculiarly sad feeling" delivery reads mklev.js's file-local
     * iflags); trap.js's monkilled_trap twin already carries the same note. */
    if (cansee(mdef.mx | 0, mdef.my | 0)) {
        const verb = nonliving(mdef.data) ? 'destroyed' : 'killed';
        pline(`${Monnam_dm(mdef)} is ${verb}!`);
    }
    await mondied_dm(mdef);
}

/* C mon.c:3254 mondied(mdef) — mondead() plus the corpse roll:
 *
 *     mondead(mdef);
 *     if (!DEADMONSTER(mdef)) return;
 *     if (corpse_chance(mdef, NULL, FALSE)
 *         && (accessible(mdef->mx, mdef->my) || is_pool(mdef->mx, mdef->my)))
 *         (void) make_corpse(mdef, CORPSTAT_NONE);
 *
 * Split out of monkilled_dm() so the OTHER mon.c:3264 call site can reach it:
 * mthrowu.c:473 ohitmon() ends a monster's life with `mondied(mtmp)` whenever
 * svc.context.mon_moving is set, and js/mhitu.js carried that as a named GAP
 * ("mondied is still a throw-stub") while this file had the whole body.
 * monkilled_dm() is now monkilled()'s pline plus a call to this. */
export async function mondied_dm(mdef) {
    mdef.mhp = 0;
    await lifesaved_monster(mdef);
    if ((mdef.mhp | 0) > 0) return;
    const deadMx = mdef.mx | 0;
    const deadMy = mdef.my | 0;
    if (typeof process !== 'undefined' && process.env?.FF_DEATH_TRACE === '1') {
        const cell = game.level?.at(deadMx, deadMy);
        pushRngLogEntry(`^mondied_dm[x=${deadMx},y=${deadMy},mndx=${(mdef.mndx ?? mdef.mnum ?? -1) | 0},` +
            `mhp=${mdef.mhp | 0},typ=${cell?.typ ?? -1},seenv=${cell?.seenv ?? -1},` +
            `lit=${cell?.lit ? 1 : 0},waslit=${cell?.waslit ? 1 : 0},minvent=${mdef.minvent ? 1 : 0}]`);
    }
    {
        /* C mon.c:2702-2703 — the first two statements of mon_leaving_level(),
         * which m_detach() calls and which this inlined fmon unlink stands in
         * for:
         *     mon->mtrapped = 0;
         *     unstuck(mon);
         * unstuck() draws rnd(2) (mon.c:3465) when the hero was stuck to THIS
         * monster, and nothing else in C's mondead->m_detach chain draws before
         * mondied's corpse_chance, so this is the position.
         * Measured on the UNSEEN corpus session gen000-reseed-seed5472 step 141:
         * the kitten kills the lichen the hero is stuck to, and C draws
         *   rnd(2)=2 @ unstuck(mon.c:3465)
         *   rn2(2)=1 @ corpse_chance(mon.c:3248)   <- this port already drew this
         * so the whole gap read as ONE missing leaf sitting in front of a leaf we
         * had right.  Unreachable until js/mhitu.js's AD_STCK arm gave u.ustuck a
         * writer on the monster-combat path. */
        mdef.mtrapped = 0;
        await unstuck_dm(mdef);
        /* KEYSTONE-A: the fmon unlink is DEFERRED to C's dmonsfree purge, not
         * spliced here.  C mon.c:3174 mondied -> m_detach leaves the node
         * LINKED (mon.c:2796 sets MON_DETACH, below) until dmonsfree() reaps it
         * at the movemon-end purge (mon.c:1340) — now run every turn by
         * js/fastforward.js.  mondied_dm runs INSIDE movemon (a pet dying on its
         * own move), so that purge lands the same turn.  This is the exact wave-12
         * change that regressed 11,391->10,759 WITHOUT the purge + guards; with
         * fmon-walk-census H1=0 and the per-turn dmonsfree in place it is
         * floor-safe.  mhp=0 + MON_DETACH (set below) leave the node in C's post-
         * m_detach state; mx/my are intentionally left at the death square (C
         * mon.c:2700 does the same). */
    }
    mdef.mhp = 0;
    /* C mon.c:3134-3136 mondead():
     *     if (svm.mvitals[mndx].died < 255)
     *         svm.mvitals[mndx].died++;
     * RNG-free.  mvitals.died is what insight.c:2799 list_vanquished() counts,
     * and it counts EVERY death, not just the hero's — seed0106's little dog
     * kills a lichen at step 34 and C's #vanquished window at step 213 lists it
     * alongside the kobold the hero killed ("2 creatures vanquished.").  Without
     * this the window read "No creatures have been vanquished."
     * js/trap.js monkilled_trap and js/uhitm.js xkilled carry the same line;
     * this is the mon-vs-mon twin. */
    {
        const g = game;
        const mndx_dead = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
        if (g.mvitals && mndx_dead >= 0) {
            const mv = (g.mvitals[mndx_dead] ||= { born: 0, died: 0, mvflags: 0 });
            if ((mv.died | 0) < 255) mv.died = (mv.died | 0) + 1;
        }
    }
    /* C mon.c:3170-3171 mondead(), the two lines immediately before m_detach:
     *     if (glyph_is_invisible(levl[mtmp->mx][mtmp->my].glyph))
     *         unmap_object(mtmp->mx, mtmp->my);
     * They were missing.  hitmm() (mhitm.c:68, this file's mattackm_dm) calls
     * map_invisible() on a defender the hero cannot spot, so a pet killing an
     * unseen monster FIRST wrote the 'I' marker onto the square and then never
     * took it off — m_detach's newsym below repaints the square, sees the
     * remembered 'I' still standing, and leaves it.  MEASURED on seed0006 step
     * 77: the kitten kills a kobold zombie the hero cannot see at (63,8) and
     * this port painted 'I' where C paints the remembered corridor '#' — one
     * cell, and the head of a 46-frame miss run.
     * Deliberately NOT unmap_invisible(): that helper is C's display.c:388
     * wrapper, which also fires its own newsym.  mondead does the bare pair and
     * lets m_detach's newsym (immediately below) do the repaint. */
    if (glyph_is_invisible_at(deadMx, deadMy)) unmap_object(deadMx, deadMy);

    /* C mon.c:2700 leaves mx/my untouched on death (the zeroing is #if 0'd
     * out in C itself — "too many places assume that the stale monst->mx,my
     * values are still valid"). Off-map status is carried by mstate alone. */
    mdef.mstate = (mdef.mstate | 0) | MON_DETACH;
    /* C m_detach repaints immediately; a pending --More-- does not suppress
     * this map update.  Deferring it left the dead pet's glyph on the square
     * for the kill-message frame (gen136, one cell; RNG/topline already exact). */
    newsym(deadMx, deadMy);

    /* C mon.c:3174 mondead() -> m_detach(mtmp, mptr, TRUE) -> steal.c:892
     * relobj(mtmp, 1, FALSE): the dead monster's whole pack falls on its
     * square.  m_detach's own newsym (mon_leaving_level, mon.c:2725) is the one
     * above — it paints bare floor because the drop has not happened yet — and
     * relobj's trailing newsym is what puts the ')' on the map.  Both are inside
     * mondead(), so both precede mondied()'s corpse_chance roll below. */
    relobj_dead_dm(mdef);

    /* C mon.c:3234 corpse_chance (default/common case):
     *   tmp = 2 + ((mdat->geno & G_FREQ) < 2) + verysmall(mdat);
     *   return !rn2(tmp);
     */
    const mndx_def = (mdef.mndx ?? mdef.mnum ?? -1) | 0;
    const msize_def = (mndx_def >= 0 && mndx_def < MONS_MSIZE.length)
        ? (MONS_MSIZE[mndx_def] | 0) : MZ_SMALL;
    const geno_def = (mndx_def >= 0 && mndx_def < _MONS.length)
        ? (_MONS[mndx_def][3] | 0) : 0;
    const tmp_cc = 2 + (((geno_def & G_FREQ) < 2) ? 1 : 0)
        + ((msize_def < MZ_SMALL) ? 1 : 0);
    /* C mon.c:3260-3262 mondied():
     *     if (corpse_chance(mdef, (struct monst *) 0, FALSE)
     *         && (accessible(mdef->mx, mdef->my) || is_pool(mdef->mx, mdef->my)))
     *         (void) make_corpse(mdef, CORPSTAT_NONE);
     * The second conjunct was absent here, so a monster that died on a square
     * C refuses to drop a corpse on still got one.  It is not a cosmetic guard:
     * make_corpse -> mkcorpstat -> mksobj -> next_ident() draws rnd(2)
     * (mkobj.c:521), so the missing guard INSERTS a leaf and everything after
     * it is cascade.  Measured on seed0030 segment 1, leaf 3768: C draws
     * `rnd(1) @grow_up(makemon.c:2095)` immediately after
     * `rn2(3)=0 @corpse_chance(mon.c:3248)`; JS drew `rnd(2) @next_ident` and
     * never reached grow_up at all.  On the screen that is the extra '%' at
     * (row 4, col 51) where C paints '.' -- the head of a 69-frame miss run. */
    /* C mon.c:3260-3262 mondied():
     *     if (corpse_chance(mdef, (struct monst *) 0, FALSE)
     *         && (accessible(mdef->mx, mdef->my) || is_pool(mdef->mx, mdef->my)))
     *         (void) make_corpse(mdef, CORPSTAT_NONE);
     * The accessible/is_pool conjunct is not cosmetic: make_corpse ->
     * mkcorpstat -> mksobj -> next_ident() draws rnd(2) (mkobj.c:521), so
     * skipping it INSERTS a leaf and everything after is cascade.
     *
     * make_corpse itself is js/mklev.js's — NOT a local re-derivation.  This
     * site used to inline "G_NOCORPSE ? nothing : mkcorpstat(CORPSE, ...)",
     * which is only C's default_1 arm, and C's own comment above that arm is
     * "All special cases should precede the G_NOCORPSE check".  Every mummy and
     * zombie carries G_NOCORPSE yet still leaves the corpse of its BASE
     * creature (mon.c:629-649), and the shared body has had that arm since
     * seed0030 — this copy had not, so a pet kill of one drew nothing where C
     * drew next_ident + the whole mksobj(CORPSE) block.  MEASURED on seed0006
     * step 77, C leaf 3197: the kitten kills a kobold zombie, C draws
     * `rnd(2) @next_ident` and this port went straight to
     * `rnd(1) @grow_up(makemon.c:2095)`. */
    if (!rn2(tmp_cc) && (accessible(deadMx, deadMy) || is_pool(deadMx, deadMy)))
        await make_corpse(mdef, deadMx, deadMy, CORPSTAT_NONE);
}

/* C mhitm.c:1016-1119 mdamagem(magr, mdef, mattk, mwep, dieroll).
 * The petrification-on-touch branch (mhitm.c:1032-1057) is unreachable here:
 * touch_petrifies_dm is a hardcoded-false stub (not modeled), matching the
 * pre-existing stub convention in this file. */
async function mdamagem_dm(magr, mdef, mattk, mwep, dieroll) {
    const mhm = {
        damage: d((mattk.damn | 0), (mattk.damd | 0)),
        hitflags: M_ATTK_MISS,
        done: false,
    };

    await mhitm_adtyping(magr, mattk, mdef, mhm);

    if (await mhitm_knockback(magr, mdef, mattk, mhm, !!mwep)
        && ((mhm.hitflags & (M_ATTK_DEF_DIED | M_ATTK_HIT)) !== 0
            || mon_offmap_dm(mdef)))
        return mhm.hitflags;

    if (mhm.done)
        return mhm.hitflags;
    if (!mhm.damage)
        return mhm.hitflags;

    mdef.mhp -= mhm.damage;
    if (mdef.mhp < 1) {
        /* C mhitm.c:1081-1090 — mkcorpstat_norevive / zombify setup for the
         * revival-suppression cases (troll baning, zombie_maker) are not
         * modeled; not reachable for ordinary pet-melee kills. */
        await monkilled_dm(mdef, mattk);
        if (!DEADMONSTER_dm(mdef))
            return mhm.hitflags; /* mdef lifesaved — not modeled, unreachable */
        if (mhm.hitflags === M_ATTK_AGR_DIED)
            return (M_ATTK_DEF_DIED | M_ATTK_AGR_DIED);
        /* C mhitm.c:1096-1112 AD_DGST digestion aftermath (newcham/mon_givit)
         * is out of scope for the physical/common-attack mon-vs-mon path. */
        return (M_ATTK_DEF_DIED | (await grow_up(magr, mdef) ? 0 : M_ATTK_AGR_DIED));
    }
    return (mhm.hitflags === M_ATTK_AGR_DIED) ? M_ATTK_AGR_DIED : M_ATTK_HIT;
}

/* Unported helpers — stub implementations */
function a_monnam(mdef) {
    return x_monnam(mdef, ARTICLE_A, null, 0, true);
}
function clone_mon(mdef, _a, _b) { return split_mon_rt(mdef, null); }
function explmm(magr, mdef, mattk) { return M_ATTK_MISS; }
export function failed_grab(magr, mdef, mattk) {
    const notonhead = !!game.gn?.notonhead;
    const unsolid = unsolid_dm(mdef?.data);
    const grab = (mattk?.aatyp | 0) === AT_HUGS
        || (mattk?.adtyp | 0) === AD_WRAP
        || (mattk?.adtyp | 0) === AD_STCK
        || (mattk?.adtyp | 0) === AD_DGST;
    if (!(unsolid || notonhead) || !grab)
        return false;
    if (game.v?.vis) {
        const magrnam = s_suffix(Monnam_dm(magr));
        const target = notonhead ? `${s_suffix(Monnam_dm(magr))} tail`
            : mon_nam_dm(mdef);
        pline(`${magrnam} grab attempt ${notonhead ? 'fails to hold' : 'passes right through'} ${target}!`);
    }
    return true;
}
function gazemm(magr, mdef, mattk) { return M_ATTK_MISS; }
function getmattk(magr, mdef, i, res, alt_attk) {
    const row = mon_mattk_raw((magr.mndx ?? magr.mnum ?? 0) | 0);
    if (row && i < row.length) {
        const a = row[i];
        return { aatyp: a[0] | 0, adtyp: a[1] | 0, damn: a[2] | 0, damd: a[3] | 0 };
    }
    if (i === 0)
        return { aatyp: AT_BITE, adtyp: AD_PHYS, damn: 1, damd: 4 };
    return { aatyp: AT_NONE, adtyp: 0, damn: 0, damd: 0 };
}
function gulpmm(magr, mdef, mattk) { return M_ATTK_HIT; }

/* C mhitm.c:41-71 pre_mm_attack(magr, mdef) — run at the top of BOTH hitmm()
 * and missmm() before the message.  Unhides/unmimics either party, then for a
 * visible fight places the 'I' glyph over anything the hero cannot spot:
 *   if (gv.vis) {
 *     if (!canspotmon(magr)) map_invisible(magr->mx, magr->my);
 *     else if (showit) newsym(magr->mx, magr->my);
 *     ... same for mdef ...
 *   }
 * RNG-free.  KNOWN GAP, NARROWED 2026-09-11: seemimic() IS now available in
 * this file (imported from js/mhitm.js — the file-local no-op stub that used
 * to shadow it is gone), but C's shape here is `if (M_AP_TYPE(x)) seemimic(x);
 * else if (x->mundetected) ...` (mhitm.c:47-59) and only the mundetected arm
 * is modeled below.  The mimic arm of THIS function is still unported; C draws
 * no RNG on either branch, so it cannot move the RNG stream. */
function pre_mm_attack_dm(magr, mdef) {
    let showit = false;
    const vis = !!(game.v?.vis);
    if (mdef && (mdef.mundetected | 0)) { mdef.mundetected = 0; showit ||= vis; }
    if (magr && (magr.mundetected | 0)) { magr.mundetected = 0; showit ||= vis; }
    if (!vis) return;
    if (!canspotmon(magr)) map_invisible(magr.mx | 0, magr.my | 0);
    else if (showit) newsym(magr.mx | 0, magr.my | 0);
    if (!canspotmon(mdef)) map_invisible(mdef.mx | 0, mdef.my | 0);
    else if (showit) newsym(mdef.mx | 0, mdef.my | 0);
}

/* C mhitm.c:26-38 noises(magr, mattk) — the OUT-OF-SIGHT arm of every
 * monster-vs-monster attack message.  When gv.vis is false, C does not stay
 * silent: it tells the hero it heard something.
 *
 *   boolean farq = (mdistu(magr) > 15);
 *   if (!Deaf && (farq != gf.far_noise || svm.moves - gn.noisetime > 10)) {
 *       gf.far_noise = farq;
 *       gn.noisetime = svm.moves;
 *       You_hear("%s%s.", (mattk->aatyp == AT_EXPL) ? "an explosion"
 *                                                   : "some noises",
 *                farq ? " in the distance" : "");
 *   }
 *
 * RNG-free.  Deaf has no canonical ported predicate (same WIRE_PENDING note as
 * dosounds' top guard in js/fastforward.js) and is FALSE here.  gf.far_noise
 * and gn.noisetime are C zero-init globals; the port keeps them on `game` so
 * the "don't repeat within 10 moves at the same range band" throttle is
 * preserved — without it the message would fire on every unseen blow.
 * mdistu(mon) = distu(mon->mx, mon->my) = dist2 to the hero (hack.h:1532).
 * This was seed0030 segment 1's first screen miss (step 47: C
 * "You hear some noises in the distance.", JS a blank topline). */
function noises_dm(magr, mattk) {
    const u = game.u;
    if (!u) return;
    const farq = dist2(magr.mx | 0, magr.my | 0, u.ux | 0, u.uy | 0) > 15;
    const moves = game.moves | 0;
    const noisetime = game.noisetime | 0;
    /* C mhitm.c:30 `if (!Deaf && (farq != gf.far_noise || ...))` — the Deaf
     * test is part of the SAME condition as the noisetime bookkeeping, so a
     * deaf hero updates neither gf.far_noise nor gn.noisetime.  The comment
     * that used to sit here read "Deaf unported = false", which both printed a
     * line C suppresses and advanced state C leaves alone. */
    if (!Deaf() && (farq !== !!game.far_noise || (moves - noisetime) > 10)) {
        game.far_noise = farq;
        game.noisetime = moves;
        /* C mhitm.c:33 You_hear("%s%s.", ...) — one call, two conversions. */
        You_hear("%s%s.",
                 ((mattk?.aatyp | 0) === AT_EXPL) ? "an explosion" : "some noises",
                 farq ? " in the distance" : "");
    }
}

/* C mhitm.c:644-731 hitmm — pre_mm_attack, then (gv.vis) the hit message,
 * then mdamagem.  RNG-free up to the mdamagem call: could_seduce() and
 * shade_miss() draw no RNG, and noises() (the !gv.vis arm, mhitm.c:729) is
 * RNG-free too (mhitm.c:27-38 — a You_hear gated on Deaf/noisetime only).
 * The seduction arm ("smiles at"/"talks to") is now ported — see below.
 * KNOWN GAP: the silver-searing arm and the AT_TENT "%s tentacles suck"
 * s_suffix spelling; neither consumes RNG in C. */
async function hitmm(magr, mdef, mattk, mwep, dieroll) {
    pre_mm_attack_dm(magr, mdef);
    /* C mhitm.c:659 compat = !magr->mcan ? could_seduce(magr, mdef, mattk) : 0.
     * (shade_miss's !compat guard is the KNOWN GAP above and is RNG-free.) */
    const compat = !(magr.mcan | 0) ? could_seduce(magr, mdef, mattk) : 0;
    /* C mhitm.c:663: if (gv.vis) pline("%s %s.", buf, mon_nam_too(mdef, magr));
     * mon_nam_too ≈ mon_nam for a non-self attack.  buf is "<Monnam> <verb>"
     * per the mattk->aatyp switch (mhitm.c:674-701). */
    if (game.v?.vis && compat) {
        /* C mhitm.c:667-672 — the seducer's hit is a chat-up line, not a blow:
         *     Snprintf(buf, "%s %s", magr_name,
         *              mdef->mcansee ? "smiles at" : "talks to");
         *     pline("%s %s %s.", buf, mon_nam(mdef),
         *           (compat == 2) ? "engagingly" : "seductively");
         * compat == 2 is the same-gender nymph case.  Measured on seed0014
         * step 457: C prints "The water nymph smiles at the little dog
         * engagingly."; this port printed "The water nymph hits the little
         * dog." because it never computed compat at all. */
        pline(Monnam_dm(magr) + ' ' + ((mdef.mcansee | 0) ? 'smiles at' : 'talks to')
              + ' ' + mon_nam_dm(mdef) + ' '
              + ((compat === 2) ? 'engagingly' : 'seductively') + '.');
    } else if (game.v?.vis)
        pline(Monnam_dm(magr) + ' ' + attack_verb_dm(mattk.aatyp | 0)
              + ' ' + mon_nam_dm(mdef) + '.');
    else
        noises_dm(magr, mattk); /* C mhitm.c:729 */
    return await mdamagem_dm(magr, mdef, mattk, mwep, dieroll);
}

/* C mhitm.c:76-91 missmm — pre_mm_attack, then the miss message.  RNG-free.
 *     pline("%s %s %s.", Monnam(magr),
 *           (magr->mcan || !could_seduce(magr, mdef, mattk))
 *               ? "misses" : "pretends to be friendly to",
 *           mon_nam_too(mdef, magr));
 * The comment here used to assert could_seduce() "is false for the ordinary
 * mon-vs-mon melee in the scored corpus" and park the arm; seed0014 step 458
 * is C's "The water nymph pretends to be friendly to the little dog." */
function missmm(magr, mdef, mattk) {
    pre_mm_attack_dm(magr, mdef);
    if (game.v?.vis)
        pline(Monnam_dm(magr) + ' '
              + (((magr.mcan | 0) || !could_seduce(magr, mdef, mattk))
                 ? 'misses' : 'pretends to be friendly to')
              + ' ' + mon_nam_dm(mdef) + '.');
    else
        noises_dm(magr, mattk); /* C mhitm.c:89 */
}
/* mon_wield_item is the real weapon.c:797 port, kept in js/uhitm.js next to
 * its sibling select_rwep/select_hwep rather than copied here; mattackm's
 * AT_WEAP arm (mhitm.c:408-412) needs its return value, because a monster that
 * spends its move wielding does not attack. */
/* C mhitm.c:1283-1300 mswingsm().  This is deliberately kept synchronous:
 * mswings_verb owns the C-compatible thrust roll and pline is non-blocking in
 * the terminal adapter, so the attacker's RNG/message order is preserved. */
function mswingsm(magr, mdef, mwep) {
    const u = game.u || {};
    const blinded = !!u.uprops?.[BLINDED_DM]
        && !!((u.uprops[BLINDED_DM].intrinsic | 0)
              || (u.uprops[BLINDED_DM].extrinsic | 0))
        && !(u.uprops[BLINDED_DM].blocked | 0);
    if (!(game.flags?.verbose ?? true) || blinded || !mon_visible(magr))
        return;
    const skill = mwep?.oc_skill | 0;
    const isPole = (skill === 16 || skill === 19
                    || (mwep?.oartifact | 0) === 19);
    const bash = isPole && (mwep?.oartifact | 0) !== 19
        && dist2(magr.mx | 0, magr.my | 0, mdef.mx | 0, mdef.my | 0) <= 2;
    const pronoun = mhis_dm(magr);
    pline(`${Monnam(magr)} ${mswings_verb(mwep, bash)} ${mwep.quan > 1 ? 'one of ' : ''}${pronoun} ${xname(mwep)} at ${mon_nam(mdef)}.`);
}
export function mtrapped_in_pit(magr) {
    if (!(magr?.mtrapped | 0))
        return false;
    const ttmp = t_at(magr.mx | 0, magr.my | 0);
    return !!(ttmp && is_pit(ttmp.ttyp | 0));
}
function noname_monnam(mdef, article) {
    return x_monnam(mdef, article ? ARTICLE_A : ARTICLE_NONE, null, 0, true);
}
export async function possibly_unwield(magr, flag) {
    const obj = magr?.mw;
    if (!obj)
        return;
    let prev = null, cur = magr.minvent;
    while (cur && cur !== obj) {
        prev = cur;
        cur = cur.nobj;
    }
    if (!cur) {
        magr.mw = null;
        magr.weapon_check = NEED_WEAPON$;
        return;
    }
    /* A monster that no longer has an AT_WEAP attack must drop its weapon
     * immediately; otherwise C leaves the old weapon in place until the next
     * weapon-selection pass. */
    if (!attacktype(magr.data, AT_WEAP)) {
        setmnotwielded(magr, obj);
        magr.weapon_check = 0; /* NO_WEAPON_WANTED */
        if (cansee(magr.mx | 0, magr.my | 0)) {
            pline(`${Monnam(magr)} drops ${(await distant_name(obj, doname))}.`);
            newsym(magr.mx | 0, magr.my | 0);
        }
        if (prev) prev.nobj = cur.nobj;
        else magr.minvent = cur.nobj;
        cur.nobj = null;
        cur.where = OBJ_FREE;
        place_object(cur, magr.mx | 0, magr.my | 0);
        stackobj_dm(cur);
        return;
    }
    /* A weapon-capable monster keeps the object but asks mon_wield_item to
     * reconsider it after a polymorph or robbery. */
    magr.weapon_check = NEED_WEAPON$;
}
/* C mthrowu.c:1016-1076 spitmm().  mhitu.js carries the canonical body and
 * supports both hero and monster targets; this wrapper preserves the
 * monster-vs-monster call signature used by mattackm. */
function spitmm(magr, mattk, mdef) {
    return spitmm_mu(magr, mattk, mdef);
}
function thrwmm(magr, mdef) { return M_ATTK_MISS; }

/* -----------------------------------------------------------------------
 * dog_move — C ref: dogmove.c:1024-1419
 * Main pet movement function.
 * Returns MMOVE_NOTHING/MMOVE_MOVED/MMOVE_DIED/MMOVE_DONE.
 *
 * RNG calls (in C order for tame pet, early game):
 *  1. dog_hunger: no RNG when not starving
 *  2. dog_invent: dogfood → rn2(100) for floor obj at pet's tile
 *                 maybe rn2(20), rn2(udist), rn2(apport) if can carry
 *  3. dog_goal: rn2(100) per floor obj in scan radius, rn2(8) for MANFOOD apport
 *               rn2(4) for approach chance, maybe rn2(apport) if has_minvent
 *  4. mfndpos: no RNG
 *  5. Position loop: per candidate position:
 *     - dogfood → rn2(100) for each floor obj at that tile
 *     - rn2(13*uncursedcnt) if cursed
 *     - rn2(MTSZ*(k-j)) for backtrack avoidance
 *     - rn2(++chcnt) / rn2(3) / rn2(12) for position selection
 *  6. pet_ranged_attk: score_targ → rnd(5) per direction target found
 * ----------------------------------------------------------------------- */
export async function dog_move(mtmp, after) {
    /* C: edog = EDOG(mtmp) if mtame && has_edog */
    const edog = (mtmp.mtame && mtmp.mextra?.edog) ? mtmp.mextra.edog : null;

    /* C: if (!edog && !mtmp->isminion) impossible() */
    if (!edog && !(mtmp.isminion | 0)) {
        /* No edog and not a minion — skip */
        return MMOVE_NOTHING;
    }

    const omx = mtmp.mx | 0;
    const omy = mtmp.my | 0;
    const u   = game.u;
    const moves = (game.moves ?? 0) | 0;

    /* C: dog_hunger(mtmp, edog) — check starvation */
    if (edog && await dog_hunger(mtmp, edog))
        return MMOVE_DIED;

    /* C: udist = distu(omx, omy) */
    let udist = distu(omx, omy);

    /* C dogmove.c:1015-1020 — "Let steeds eat and maybe throw rider during
     * Conflict"; the Conflict arm needs dismount_steed and no corpus rider has
     * Conflict, so only the `udist = 1` (treat the steed as adjacent to its
     * master) is live.  `game.usteed` -> `game.u.usteed`: no writer, dead guard. */
    if (mtmp === game.u?.usteed) {
        udist = 1;
    } else if (!udist) {
        /* swallowed case */
        return MMOVE_NOTHING;
    }

    let nix = omx;
    let niy = omy;

    /* C dogmove.c:1030 declares `int appr, whappr, udist;` once at the top of
     * dog_move() and assigns whappr in BOTH arms of the edog test below.  This
     * used to be two `var whappr` declarations, one per arm — legal (var is
     * function-scoped and hoisted, so both wrote the same binding) but a
     * duplicate declaration in one scope, which is how a real second binding
     * sneaks in unnoticed.  One declaration, C's. */
    let whappr;
    /* C: if (edog) { j = dog_invent(...); ... } */
    if (edog) {
        const j = await dog_invent(mtmp, edog, udist);
        if (j === 2)
            return MMOVE_DIED;
        if (j === 1)
            /* ate something — skip to newdogpos */
            return MMOVE_MOVED;

        /* C: whappr = (svm.moves - edog->whistletime < 5)
         *
         * C's svm.moves at the dog_move during movemon equals the turn counter for
         * the turn whose HEAD block already ran svm.moves++ (allmain.c). We must
         * compare against that same value.
         *
         * The JS off-by-one between game.moves and C svm.moves DIFFERS by path:
         *   - CALIBRATED path (FF_FAITHFUL=0): the calibrated fastforward_step runs
         *     movemon while game.moves is the POST-INCREMENT value carried from the
         *     PREVIOUS turn's g.moves++ (which fires at the end of moveloop_core
         *     after rhack). So game.moves = C svm.moves + 1 here → use (moves - 1).
         *   - FAITHFUL path (FF_FAITHFUL=1): the faithful HEAD block increments
         *     g.moves at C's svm.moves++ point WITHIN the turn, BEFORE the movemon
         *     that this dog_move belongs to. So game.moves = C svm.moves here →
         *     use moves directly. Subtracting 1 makes whappr stale by one turn
         *     (an extra `whappr=1` turn) and masks the j>0 rn2(3)/rn2(12) tie-break,
         *     which is the seed0011/1500/0004/0002/0015 dog_move divergence root.
         *
         * BUGFIX (seed0001 leaf-3417): FF_FAITHFUL is DEFAULT-ON — the module-level
         * fastforward.js `FF_FAITHFUL` const is `env.FF_FAITHFUL !== '0'`, so the
         * faithful HEAD path (with the in-turn svm.moves++) is what runs on the
         * scored/default run (env UNSET).  We reference the module FF_FAITHFUL
         * const directly (the single source of truth, `env.FF_FAITHFUL !== '0'`)
         * so this matches the moveloop's gating exactly: on the default scored
         * run dog_move uses `moves` (no -1), only the calibrated rollback
         * (FF_FAITHFUL=0) applies `moves - 1`.  The old inline `=== '0'` read was
         * already correct here; switching to the const removes the last ad-hoc
         * env read.  (seed0001 leaf-3417: a stale whappr=1 short-circuited the
         * j>0 rn2(12) tie-break and diverged at dogmove.c:1310.) */
        const moves_c = FF_FAITHFUL ? moves : (moves - 1);
        whappr = ((moves_c - (edog.whistletime | 0)) < 5) ? 1 : 0;
    } else {
        whappr = 0;
    }

    /* C: appr = dog_goal(mtmp, edog, after, udist, whappr) */
    const appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2)
        return MMOVE_NOTHING;

    /* C dogmove.c:1046-1054 —
     *     if (Conflict && !resist_conflict(mtmp)) {
     *         if (!edog) { lose_guardian_angel(mtmp); return MMOVE_DIED; }
     *     }
     * The body is empty for an ordinary edog pet, but resist_conflict() DRAWS
     * rnd(20) (mondata.c:1612), so the call is load-bearing on the RNG axis and
     * skipping it desynchronises the whole stream.  This site used to read
     * "Conflict branch for non-edog guardian angel — skip"; the skip was only
     * safe while nothing in js/ conferred Conflict, and a worn ring of conflict
     * confers it (js/do_wear.js setworn_ring writes uprops[CONFLICT].extrinsic
     * from oc_oprop).  seed0004 step 286: the hero puts on "an engagement ring"
     * at step 283, and from the very next movemon C draws two rnd(20)s this port
     * drew neither of — leaf 10370, the session's first RNG divergence.
     * The `&&` short-circuit is C's and must be kept: no Conflict, no draw. */
    if (_conflict_dm() && !resist_conflict(mtmp)) {
        if (!edog) {
            /* C minion.c:468-510 — a guardian angel abandons a conflicted
             * hero, then two to four hostile angels replace it. */
            if (canspotmon(mtmp)) {
                if (!Deaf)
                    await pline(`${Monnam_dm(mtmp)} rebukes you, saying:`);
                else
                    await pline(`${Monnam_dm(mtmp)} vanishes!`);
            }
            await mongone(mtmp);
            const count = rn1(3, 2);
            for (let i = 0; i < count; ++i) {
                const spot = enexto_out(game.u.ux | 0, game.u.uy | 0,
                                        permonstTemplate(PM_ANGEL));
                if (!spot)
                    continue;
                const angel = await makemon(permonstTemplate(PM_ANGEL), spot.x, spot.y, 0);
                if (angel) {
                    angel.mpeaceful = 0;
                    angel.mtame = 0;
                    angel.isminion = 1;
                }
            }
            return MMOVE_DIED;
        }
    }

    /* C dogmove.c:1062: allowflags = mon_allowflags(mtmp).
     * This used to be a hand-inlined literal justified by "mon_allowflags()
     * itself is still unported" — stale: js/monmove.js:mon_allowflags is a full
     * transcription of mon.c:2064-2124 (m_move's own site already calls it).
     * The literal also silently dropped mon.c:2086
     *     if (Conflict && !resist_conflict(mtmp)) allowflags |= ALLOW_U;
     * which is the SECOND of the two rnd(20)s C draws here. */
    const allowflags = mon_allowflags(mtmp);

    /* C: cnt = mfndpos(mtmp, &mfp, allowflags)
     * WIRING: real mfndpos (js/mklev.js) replaces mfndpos_stub. mfndpos
     * writes parallel data.poss[]/data.info[] arrays (C struct layout);
     * zip them into the same {x,y,info} shape mfndpos_stub returned so the
     * rest of this function (unchanged below) keeps working. */
    const mfp = { cnt: 0, poss: [], info: [] };
    const real_cnt = mfndpos(mtmp, mfp, allowflags);
    const mfp_poss = [];
    for (let i = 0; i < real_cnt; i++)
        mfp_poss.push({ x: mfp.poss[i].x, y: mfp.poss[i].y, info: mfp.info[i] | 0 });
    const cnt = mfp_poss.length;

    /* C: compute uncursedcnt — number of candidate positions without cursed items */
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny, info } = mfp_poss[i];
        /* C dogmove.c:1126: if (MON_AT(nx,ny) && !((info[i]&ALLOW_M)||(info[i]&ALLOW_MDISP))) continue;
         * Now real (was "Stub: skip monster-at-position check" — mfndpos_stub
         * never emitted ALLOW_MDISP so this was previously unreachable for
         * ALLOW_M-lacking squares too; wiring restores it since mfndpos can
         * now emit ALLOW_M on the MON_AT branch, see mklev.js Packet 0). */
        if (m_at(nx, ny) && !((info & ALLOW_M) || (info & ALLOW_MDISP)))
            continue;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    /* C: better_with_displacing = should_displace(mtmp, &mfp, gg.gx, gg.gy).
     * mfndpos supplies ALLOW_MDISP for eligible adjacent monster squares. */
    const gg  = game.gg ?? { gx: 0, gy: 0, gtyp: UNDEF };
    const better_with_displacing = should_displace(mtmp, mfp, gg.gx | 0, gg.gy | 0);

    let chcnt = 0;
    let chi   = -1;
    const GDIST = (x, y) => dist2(x | 0, y | 0, gg.gx | 0, gg.gy | 0);
    let nidist = GDIST(nix, niy);
    let do_eat = false;
    let eatObj  = null;
    const cursemsg = new Array(cnt).fill(false);

    for (let i = 0; i < cnt; i++) {
        const { x: nx, y: ny, info } = mfp_poss[i];
        cursemsg[i] = false;

        /* C: if leashed and distu > 4, skip */
        if ((mtmp.mleashed | 0) && distu(nx, ny) > 4)
            continue;

        /* C: if guardian (!edog) and too far, skip */
        if (!edog) {
            const j2 = distu(nx, ny);
            if (j2 > 16 && j2 >= udist)
                continue;
        }

        /* C: ALLOW_M branch — attack adjacent monster
         * C ref: dogmove.c:1155-1222 */
        if (info & ALLOW_M) {
            /* Find the monster at (nx, ny). */
            let mtmp2 = null;
            for (let m = game.fmon; m; m = m.nmon) {
                if ((m.mhp | 0) > 0 && (m.mx | 0) === nx && (m.my | 0) === ny) {
                    mtmp2 = m;
                    break;
                }
            }
            if (mtmp2) {
                /* C dogmove.c:1117-1126: the balk/skip test (no RNG).
                 * balk = mtmp->m_lev + ((5*mtmp->mhp)/mtmp->mhpmax) - 2
                 *   if (mtmp2->m_lev >= balk
                 *       || (mtmp2->mtame && mtmp->mtame && !Conflict)
                 *       || (max_passive_dmg(mtmp2, mtmp) >= mtmp->mhp)
                 *       || ((mtmp->mhp * 4 < mtmp->mhpmax
                 *            || mtmp2->data->msound == MS_GUARDIAN
                 *            || mtmp2->data->msound == MS_LEADER)
                 *           && mtmp2->mpeaceful && !Conflict))
                 *       continue;
                 * Only the first of the four disjuncts was ported.  The
                 * max_passive_dmg one is what a pet uses to refuse a foe whose
                 * PASSIVE counter-attack could kill it outright — seed0399's
                 * kitten walks up to a green mold (passive AD_ACID) and C's
                 * kitten declines while ours bit it and killed it, printing a
                 * whole message pair ("The kitten bites the green mold.  The
                 * green mold is killed!") that C never queues.  That extra
                 * message is the spurious --More-- on step 117's topline. */
                const agr_mlev = (mtmp.m_lev | 0);
                const agr_mhp  = (mtmp.mhp | 0);
                const agr_mhpmax = (mtmp.mhpmax | 0) || 1;
                const balk = agr_mlev + Math.trunc((5 * agr_mhp) / agr_mhpmax) - 2;
                const mndx_def = (mtmp2.mndx ?? mtmp2.mnum ?? 0) | 0;
                const def_mlev_base = (mndx_def >= 0 && mndx_def < _MONS.length)
                    ? (_MONS[mndx_def][1] | 0) : 0;
                const def_mlev = (mtmp2.m_lev ?? def_mlev_base) | 0;

                /* C dogmove.c:1118-1126, all four disjuncts.  Conflict has no
                 * source in this port (see m_avoid_kicked_loc above), so
                 * !Conflict is TRUE throughout. */
                const def_msound = (mndx_def >= 0 && mndx_def < _MSOUND.length)
                    ? (_MSOUND[mndx_def] | 0) : 0;
                if (def_mlev >= balk
                    || ((mtmp2.mtame | 0) && (mtmp.mtame | 0))
                    || (max_passive_dmg(mtmp2, mtmp) >= agr_mhp)
                    || (((agr_mhp * 4 < agr_mhpmax)
                         || def_msound === MS_GUARDIAN_DM
                         || def_msound === MS_LEADER_DM)
                        && (mtmp2.mpeaceful | 0))) {
                    /* dog balks — skip this position, try next */
                    continue;
                }

                if (after) {
                    /* C dogmove.c:1199: if (after) return MMOVE_NOTHING */
                    return MMOVE_NOTHING;
                }

                /* C dogmove.c:1200-1204:
                 *   gb.bhitpos.x = nx, gb.bhitpos.y = ny;
                 *   gn.notonhead = mtmp2->mx != nx || mtmp2->my != ny;
                 *   mstatus = mattackm(mtmp, mtmp2);
                 * bhitpos is read back by mattackm's i>0 target-still-there
                 * guard (mhitm.c:381), so it must be set BEFORE the call. */
                (game.gb ||= {}).bhitpos = { x: nx | 0, y: ny | 0 };
                (game.gn ||= {}).notonhead =
                    ((mtmp2.mx | 0) !== (nx | 0) || (mtmp2.my | 0) !== (ny | 0));
                const mstatus = await mattackm(mtmp, mtmp2);

                if (mstatus & M_ATTK_AGR_DIED)
                    return MMOVE_DIED;

                /* C dogmove.c:1157-1168: return attack check.
                 *   if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) == M_ATTK_HIT
                 *       && rn2(4)
                 *       && mtmp2->mlstmv != svm.moves
                 *       && !onscary(mtmp->mx, mtmp->my, mtmp2)
                 *       && monnear(mtmp2, mtmp->mx, mtmp->my)) { ... }
                 * Note: rn2(4) is NOT consumed when M_ATTK_DEF_DIED is set because
                 * (M_ATTK_HIT | M_ATTK_DEF_DIED) == M_ATTK_HIT only if DEF_DIED is 0.
                 *
                 * The three conditions AFTER the rn2(4) were missing, so every
                 * successful pet hit that rolled a non-zero rn2(4) fired a return
                 * attack C does not.  mlstmv is the load-bearing one: mhitm.c:366
                 * stamps magr->mlstmv = svm.moves at the top of mattackm, so a
                 * defender that has ALREADY attacked this turn does not get a free
                 * counter-attack out of sequence -- which is exactly C's comment
                 * there ("this still counts as its move for the round and it
                 * shouldn't move again").  seed5002 segment 1 leaf 5811: C's kitten
                 * hits the giant bat, rolls rn2(4)=1, and then STOPS because the bat
                 * had already bitten the kitten this turn; this port ran the return
                 * attack and drew rnd(20)@mattackm where C draws rn2(5)@distfleeck
                 * for the next monster -- the segment's first RNG divergence. */
                if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT) {
                    if (rn2(4)
                        && (mtmp2.mlstmv | 0) !== (game.moves | 0)
                        && !onscary(mtmp.mx | 0, mtmp.my | 0, mtmp2)
                        /* C mon.c monnear(mon,x,y): dist2 < 3, with dist2 == 2
                         * (a diagonal) rejected for a grid bug (NODIAG). */
                        && (monnear_dm(mtmp2, mtmp.mx | 0, mtmp.my | 0)
                            && !(((mtmp2.mnum ?? mtmp2.mndx ?? -1) | 0) === PM_GRID_BUG_DG
                                 && dist2(mtmp2.mx | 0, mtmp2.my | 0,
                                          mtmp.mx | 0, mtmp.my | 0) === 2))) {
                        /* C dogmove.c:1216-1218 */
                        game.gb.bhitpos = { x: mtmp.mx | 0, y: mtmp.my | 0 };
                        game.gn.notonhead = false;
                        const mstatus2 = await mattackm(mtmp2, mtmp);
                        if (mstatus2 & M_ATTK_DEF_DIED)
                            return MMOVE_DIED; /* pet died in counter-attack */
                    }
                }
                return MMOVE_DONE;
            }
            /* No monster found at (nx,ny) despite ALLOW_M — shouldn't happen.
             * Fall through to treat as normal move. */
        }

        /* C dogmove.c:1224-1233 — a displacing pet swaps places with the
         * adjacent monster when that route is preferable.  mfndpos now emits
         * ALLOW_MDISP and mdisplacem is live, so retaining the old inert stub
         * here skipped both the displacement's rn2(7) and the position swap. */
        if ((info & ALLOW_MDISP) && m_at(nx, ny)
            && better_with_displacing && !undesirable_disp(mtmp, nx, ny)) {
            const mtmp2 = m_at(nx, ny);
            const mstatus = await mdisplacem(mtmp, mtmp2, false);
            if (mstatus & M_ATTK_DEF_DIED)
                return MMOVE_DIED;
            return MMOVE_NOTHING;
        }

        /* C dogmove.c:1236-1239 — avoid a location the hero just kicked, and
         * (in Sokoban) a square that would push a boulder into the hero. Both
         * are RNG-free `continue`s. m_avoid_kicked_loc (monmove.c:1323) skips a
         * candidate that equals gk.kickedloc when the pet is unconfused/unstunned,
         * can see, is peaceful/tame, no Conflict, and the square is next2u. Omitting
         * this skip lets an extra candidate reach the rn2(++chcnt) position-select
         * below, firing one spurious RNG call (seed0060 step-15 kick → pet dog_move). */
        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny))
            continue;

        /* C dogmove.c:1241-1262 — trap avoidance.
         *   if ((info[i] & ALLOW_TRAPS) && (trap = t_at(nx,ny))) {
         *     if (mleashed) { if (!Deaf) whimper(mtmp); }
         *     else if (trap->tseen && rn2(40)) continue;  // 1/40 step anyway
         *   }
         * The rn2(40) here is THE seed0001 first divergence after the goal fix. */
        if (info & ALLOW_TRAPS) {
            const trap = t_at(nx, ny);
            if (trap) {
                if (mtmp.mleashed | 0) {
                    /* whimper(): no RNG */
                } else if (trap.tseen && rn2(40)) {
                    continue;
                }
            }
        }

        /* C: dog eschews cursed objects, but likes dog food.
         * Walk floor objects at (nx, ny):
         *
         * C dogmove.c:1264-1279:
         *   boolean can_reach_food = could_reach_item(mtmp, nx, ny);
         *   for (obj = svl.level.objects[nx][ny]; obj; obj = obj->nexthere) {
         *       if (obj->cursed) cursemsg[i] = TRUE;
         *       else if (can_reach_food
         *                && (otyp = dogfood(mtmp, obj)) < MANFOOD
         *                && (otyp < ACCFOOD || edog->hungrytime <= svm.moves)) { ... }
         *   }
         * The `can_reach_food &&` SHORT-CIRCUITS: when the dog cannot reach the
         * item (pool/lava/boulder under it), dogfood() is NOT called and the
         * rn2(100) is NOT consumed. The previous port called dogfood()
         * unconditionally, firing a spurious rn2(100) for unreachable floor
         * objects at candidate squares. C-faithful gate restored. */
        if (edog) {
            let goto_newdogpos = false;
            const can_reach_food = could_reach_item(mtmp, nx, ny);
            const firstObj = game.level?.levelObjects?.[nx]?.[ny];
            for (let obj = firstObj; obj; obj = obj.nexthere) {
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (can_reach_food) {
                    /* C: dogfood(mtmp, obj) — fires rn2(100) */
                    const otyp = dogfood(mtmp, obj);
                    const hungrytime = edog.hungrytime | 0;
                    if (otyp < MANFOOD
                        && (otyp < ACCFOOD || hungrytime <= moves)) {
                        nix = nx;
                        niy = ny;
                        chi = i;
                        do_eat = true;
                        eatObj = obj;
                        cursemsg[i] = false;
                        goto_newdogpos = true;
                        break;
                    }
                }
            }
            if (goto_newdogpos)
                break; /* C: goto newdogpos */
        }

        /* C: if cursed and not forced, usually skip */
        if (cursemsg[i] && !(mtmp.mleashed | 0) && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        /* C: backtrack avoidance (only when !leashed and >5 from hero) */
        if (!(mtmp.mleashed | 0) && distmin(mtmp.mx, mtmp.my, u?.ux ?? 0, u?.uy ?? 0) > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skip = false;
            const mtrack = mtmp.mtrack ?? [];
            for (let j = 0; j < MTSZ && j < k - 1; j++) {
                if (mtrack[j] && nx === mtrack[j].x && ny === mtrack[j].y) {
                    if (rn2(MTSZ * (k - j))) {
                        skip = true;
                        break;
                    }
                }
            }
            if (skip) continue;
        }

        /* C: j = (ndist - nidist) * appr; position selection */
        const ndist = GDIST(nx, ny);
        const j = (ndist - nidist) * appr;
        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
            chi = i;
        }
    }

    /* C: pet_ranged_attk(mtmp, FALSE) — fires score_targ → rnd(5) per dir */
    if (!do_eat) {
        const ra = await pet_ranged_attk(mtmp, false);
        if (ra !== MMOVE_NOTHING)
            return ra;
    }

    /* newdogpos: */
    if (nix !== omx || niy !== omy) {
        /* C dogmove.c:1280-1288 — the chosen square is the HERO's:
         *     if (mfp.info[chi] & ALLOW_U) {
         *         if (mtmp->mleashed) { pline "%s breaks loose of %s leash!";
         *                               m_unleash(mtmp, FALSE); }
         *         (void) mattacku(mtmp);
         *         return MMOVE_DONE;
         *     }
         * mfndpos only ever marks the hero's square ALLOW_U when the CALLER
         * passed the bit, and for a pet the only source of it is
         * mon_allowflags' `if (Conflict && !resist_conflict(mtmp))`
         * (mon.c:2086) — so this arm is exactly "a conflicted pet turns on the
         * hero".  It was a one-line "stub: skip", which is why seed0004's
         * saddled pony walked into the hero and did nothing where C prints
         * "The saddled pony kicks!" and rolls mattacku's whole attack set
         * (step 327: rnd(20), d(1,6) hitmu, two mhitm_knockback draws, rnd(21)
         * for the pony's second attack).
         * ALLOW_MDISP (dogmove.c:1224-1233) is handled in the candidate loop
         * above and is unrelated to Conflict. */
        if (chi >= 0 && (mfp_poss[chi].info & ALLOW_U)) {
            if (mtmp.mleashed | 0) {
                void pline(`${Monnam_dm(mtmp)} breaks loose of ${mhis_dm(mtmp)} leash!`);
                m_unleash(mtmp, false);
            }
            await mattacku(mtmp);
            return MMOVE_DONE;
        }
        /* C dogmove.c:1354: wasseen = canseemon(mtmp) BEFORE the move. */
        const wasseen = !!canseemon(mtmp);
        /* C: move monster */
        /* Stub: update position */
        mtmp.mx = nix;
        mtmp.my = niy;
        /* C dogmove.c:1357-1372: the pet is forced onto a tile it dislikes
         * (cursemsg[chi]).  If it was/is visible, announce the reluctant step
         * onto the top item of the pile.  This pline drives a --More-- in the
         * corpus, so it must fire to keep the keystroke stream aligned. */
        if (chi >= 0 && cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            const o = top_floor_obj(nix, niy);
            const what = o ? (await distant_obj_name(o)) : 'something';
            const verb = locomotion_step(mtmp);
            const prep = (is_flyer_dm(mtmp) || is_floater_dm(mtmp)) ? 'over' : 'onto';
            void pline(`${noit_Monnam_dm(mtmp)} ${verb} reluctantly ${prep} ${what}.`);
        }
        /* C: mon_track_add(mtmp, omx, omy) — update mtrack */
        if (!mtmp.mtrack) mtmp.mtrack = [];
        mtmp.mtrack.unshift({ x: omx, y: omy });
        if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
        /* C dogmove.c newdogpos does NOT call newsym at all: remove_monster() and
         * place_monster() (rm.h:534 / steed.c:898) only touch svl.level.monsters,
         * and the redraw belongs to the CALLER, postmov().  postmov splits the
         * pair around mintrap: newsym(omx,omy) at monmove.c:1508, then
         * mintrap(), the door block, then newsym(mtmp->mx,mtmp->my) at
         * monmove.c:1656.  Doing both here drew the pet on its DESTINATION cell
         * before mintrap could speak, so a --More-- raised by mintrap's pline
         * flushed a screen C had not painted yet.  See js/monmove.js m_move()
         * pet branch for the two calls in their C positions. */
        /* C dogmove.c:1379-1381: if (do_eat) dog_eat(mtmp, obj, omx, omy, FALSE).
         * The pet has just been moved onto the food tile (nix,niy == eatObj tile);
         * dog_eat fires the eat pline + the two obj_resists (dogfood + delobj). */
        if (do_eat && eatObj) {
            if ((await dog_eat(mtmp, eatObj, omx, omy, false)) === 2)
                return MMOVE_DIED;
        }
        return MMOVE_MOVED;
    }

    return MMOVE_MOVED;
}

/* C ref: nethack-c/include/mondata.h:57-58
 *   #define is_whirly(ptr) \
 *       ((ptr)->mlet == S_VORTEX || (ptr) == &mons[PM_AIR_ELEMENTAL])
 * The C pointer-identity test against &mons[PM_AIR_ELEMENTAL] becomes an index
 * compare on the permonst's own row number: js/struct_reconstructor.js hands out
 * a permonst proxy built by makemon.js permonstTemplate(), whose `pmidx` IS that
 * row number.  Same shape as the already-ported js/mhitm.js:2742 is_whirly leg.
 * S_VORTEX (22) is declared at the top of this file; PM_AIR_ELEMENTAL comes from
 * the generated PM table rather than a local literal. */
function is_whirly(mon_data) {
    return (mon_data.mlet | 0) === S_VORTEX
        || (mon_data.pmidx | 0) === PM_AIR_ELEMENTAL;
}

/* C ref: nethack-c/include/mondata.h:29
 *   #define passes_walls(ptr) (((ptr)->mflags1 & M1_WALLWALK) != 0L)
 * M1_WALLWALK is nethack-c/include/monflag.h:88 == 0x00000008.  Value confirmed
 * by compiling the real headers (printf "%lx", M1_WALLWALK) — NOT 0x00080000,
 * which is M1_SLITHY and which a sibling file had wrong under this name. */
const M1_WALLWALK_DM = 0x00000008;
function passes_walls(mon_data) {
    return ((mon_data.mflags1 | 0) & M1_WALLWALK_DM) !== 0;
}

/* C ref: mondata.c:dmgtype(ptr, dtyp) — checks if monster has given damage type.
 * Implemented via dmgtype_fromattack(ptr, dtyp, AT_ANY) which is already ported. */
const AT_ANY = -1;
export function dmgtype(mon_data, ad_type) {
    return dmgtype_fromattack(mon_data, ad_type, AT_ANY) ? true : false;
}

/* C ref: nethack-c/src/mhitm.c:806-845 engulf_target(magr, mdef)
 * Returns TRUE if aggressor can engulf defender (size and position checks). */
export function engulf_target(magr, mdef) {
    const uatk = (magr === game?.youmonst);
    const udef = (mdef === game?.youmonst);

    /* can't swallow something that's too big */
    const magr_mnum = (magr?.mnum ?? -1) | 0;
    const mdef_mnum = (mdef?.mnum ?? -1) | 0;
    const magr_msize = (magr_mnum >= 0 && magr_mnum < MONS_MSIZE.length) ? (MONS_MSIZE[magr_mnum] | 0) : 0;
    const mdef_msize = (mdef_mnum >= 0 && mdef_mnum < MONS_MSIZE.length) ? (MONS_MSIZE[mdef_mnum] | 0) : 0;

    if (mdef_msize >= MZ_HUGE
        || (magr_msize < mdef_msize && !is_whirly(magr?.data)))
        return false;

    /* can't (move to) swallow if trapped. TODO: could do some? */
    if ((mdef?.mtrapped ?? 0) !== 0 || (magr?.mtrapped ?? 0) !== 0)
        return false;

    /* if attacker is phasing in solid rock and defender can't move there,
       or vice versa, don't allow engulf to succeed; otherwise expelling
       might not be able to place attacker and defender both back on map;
       when defender is the hero, a sanity_check complaint about placing
       the hero on top of a monster can occur */
    const hero = game.u || {};
    const heroPassesWalls = !!hero.uprops?.[PASSES_WALLS]
        && !!((hero.uprops[PASSES_WALLS].intrinsic | 0)
              || (hero.uprops[PASSES_WALLS].extrinsic | 0));
    const dx = udef ? (hero.ux ?? 0) : (mdef?.mx ?? 0);
    const dy = udef ? (hero.uy ?? 0) : (mdef?.my ?? 0);
    const lev = game?.level?.locations?.[dx]?.[dy];
    if (lev && !(udef ? heroPassesWalls : passes_walls(mdef?.data))
          && (IS_OBSTRUCTED(lev.typ) || closed_door(dx, dy) || IS_TREE(lev.typ)
              /* not passes_bars(); engulfer isn't squeezing through */
              || (lev.typ === IRONBARS && !is_whirly(magr?.data))))
        return false;

    const ax = uatk ? (hero.ux ?? 0) : (magr?.mx ?? 0);
    const ay = uatk ? (hero.uy ?? 0) : (magr?.my ?? 0);
    const alev = game?.level?.locations?.[ax]?.[ay];
    if (alev && !(uatk ? heroPassesWalls : passes_walls(magr?.data))
        && (IS_OBSTRUCTED(alev.typ) || closed_door(ax, ay) || IS_TREE(alev.typ)
            || (alev.typ === IRONBARS && !is_whirly(mdef?.data))))
        return false;

    return true;
}

/* C ref: nethack-c/src/mhitm.c:1259-1281 rustm(mdef, obj)
 * Inflict rusting/corrosion/burning damage on an object. */
export async function rustm(mdef, obj) {
    let dmgtyp = ERODE_NONE;
    let chance = 1;

    if (!mdef || !obj)
        return; /* just in case */
    /* AD_ACID and AD_ENCH are handled in passivemm() and passiveum() */
    if (dmgtype(mdef?.data, 42 /* AD_CORR */)) {
        dmgtyp = ERODE_CORRODE;
    } else if (dmgtype(mdef?.data, 24 /* AD_RUST */)) {
        dmgtyp = ERODE_RUST;
    } else if (dmgtype(mdef?.data, 2 /* AD_FIRE */)
               /* steam vortex: fire resist applies, fire damage doesn't */
               && mdef?.mnum !== PM_STEAM_VORTEX) {
        dmgtyp = ERODE_BURN;
        chance = 6;
    }

    if (dmgtyp !== ERODE_NONE && !rn2(chance))
        await erode_obj(obj, null, dmgtyp, EF_GREASE | EF_VERBOSE);
}

/* C dogmove.c:1448-1458 finish_meating(mtmp).  Besides ending the meal, a
 * non-mimic which had assumed an appearance while eating a mimic must shed
 * that appearance and repaint its square.  This exported body is shared by
 * mhitm.sleep_monst(), so every production caller gets the same C behavior. */
export function finish_meating(mtmp) {
    mtmp.meating = 0;
    if (((mtmp.m_ap_type | 0) & 0x7 /* M_AP_TYPMASK */) !== 0 /* M_AP_NOTHING */
        && (mtmp.data?.mlet | 0) !== 13 /* S_MIMIC */) {
        mtmp.m_ap_type = 0;
        mtmp.mappearance = 0;
        newsym(mtmp.mx | 0, mtmp.my | 0);
    }
}

/* C ref: mhitm.c:1210 paralyze_monst(mon, amt). No RNG. */
export function paralyze_monst(mon, amt) {
    if (amt > 127)
        amt = 127;
    mon.mcanmove = 0;
    mon.mfrozen = amt;
    mon.meating = 0; /* terminate any meal-in-progress */
    const STRAT_WAITFORU = 0x20000000;
    mon.mstrategy = (mon.mstrategy & ~STRAT_WAITFORU) >>> 0;
}

/* C ref: mhitm.c:1249 slept_monst(mon). No RNG. */
/* helpless is a C macro; its fields (msleeping, mcanmove) are not captured.
   In the corpus, slept_monst is only called when mon is helpless, so
   the helpless check is elided. */
export async function slept_monst(mon) {
    if (mon === game.u.ustuck
        && !sticks(game.youmonst.data) && !game.u.uswallow) {
        pline_mon(mon, "%s grip relaxes.", s_suffix(Monnam(mon)));
        await unstuck_dm(mon);
    }
}

/* C mon.c:3300 mon_to_stone(): a non-stone golem becomes a stone golem. */
async function mon_to_stone(mtmp) {
    if (mtmp)
        await newcham(mtmp, PM_STONE_GOLEM, 0);
}

/* C mon.c:3274-3359 — turn a monster into a statue (or rock), then detach it.
 * This is kept here with the other monster movement/death helpers so callers
 * in dogmove and uhitm can share one inventory-preserving implementation. */
export async function monstone(mtmp) {
    if (!mtmp) return;
    const x = mtmp.mx | 0, y = mtmp.my | 0;
    /* monstone's first arm is vamp_stone().  Vampire shifters and sandestins
     * may revert instead of dying; their full shape-change state is not
     * represented on the replay monster, so preserve the ordinary path and
     * leave the decision to callers which have that state. */
    mtmp.mhp = 0;
    // C checks life saving before turning inventory into statue contents.
    await lifesaved_monster(mtmp);
    if ((mtmp.mhp | 0) > 0) return;
    mtmp.mtrapped = 0;

    const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    const msize = (mndx >= 0 && mndx < MONS_MSIZE.length)
        ? (MONS_MSIZE[mndx] | 0) : MZ_MEDIUM;
    const geno = (mndx >= 0 && mndx < _MONS.length) ? (_MONS[mndx][3] | 0) : 0;
    /* C: statue for non-tiny monsters, otherwise 1/(2+(G_FREQ>2)) chance. */
    const makeStatue = msize > MZ_TINY || !rn2(2 + ((geno & G_FREQ) > 2 ? 1 : 0));
    let statue;
    const kept = [];
    let obj = mtmp.minvent;
    while (obj) {
        const next = obj.nobj ?? null;
        extract_from_minvent_dm(mtmp, obj);
        obj.owornmask = 0;
        obj.nobj = null;
        if ((obj.otyp | 0) === BOULDER_OTYP || obj_resists(obj, 0, 0)) {
            place_object(obj, x, y);
            stackobj_dm(obj);
        } else {
            if (obj.lamplit) obj.lamplit = 0;
            kept.push(obj);
        }
        obj = next;
    }
    if (makeStatue) {
        statue = (await mkcorpstat(STATUE_OTYP, mtmp, mtmp.data, x, y, CORPSTAT_NONE));
        for (const item of kept) await add_to_container(statue, item);
    } else {
        statue = (await mksobj_at(ROCK_OTYP, x, y, true, false));
    }
    stackobj_dm(statue);
    await mondead(mtmp);
}
/* seemimic: the LOCAL `no-op stub` IS DELETED.  It shadowed the C-faithful
 * body at js/mhitm.js:2609 (C mon.c:4409 — m_ap_type = M_AP_NOTHING,
 * mappearance = 0, newsym) at mdisplacem()'s call site below (C mhitm.c:210),
 * so a displaced mimic silently kept its disguise and its map glyph was never
 * redrawn.  RNG-free on both sides.  Imported from './mhitm.js' at the header;
 * that module already imports finish_meating from THIS file, so the cycle
 * already exists and is function-call-only (no module-evaluation-time use). */
import { update_monster_region as update_monster_region_real } from './region.js';

/* place_worm_tail_randomly and remove_worm are a required pair in
 * mdisplacem(): C removes the old tail before laying it back out, and the
 * latter performs one RNG shuffle per segment.  Both delegate to worm.js so
 * this path cannot accidentally wire only the RNG-bearing half. */
function place_worm_tail_randomly(mdef, fx, fy) {
    return place_worm_tail_randomly_real(mdef, fx, fy);
}
function remove_monster(x, y) {
    /* C clears the monster-grid cell before the old-square newsym(). */
    const mtmp = m_at(x, y);
    if (mtmp)
        mtmp._mapRemoved = true;
}
function remove_worm(mdef) {
    return remove_worm_real(mdef);
}
function update_monster_region(mtmp) {
    return update_monster_region_real(mtmp);
}
function place_monster(mon, x, y) { /* no-op stub */ }
/* which_armor — MODULE-LOCAL STUB DELETED.  C ref: worn.c:1006-1035.  This
 * file carried `function which_armor(mon, flag) { return null; }`, shadowing
 * the real body (js/makemon.js:6368) for its one call site, mdisplacem()'s
 * petrification guard `if (!which_armor(magr, W_ARMG))` (C mhitm.c:223).
 * Answering null always means "the displacer is bare-handed", so a
 * glove-wearing monster that shoves a cockatrice aside was petrified by it.
 * The export is C's exact shape: the youmonst switch over W_ARM..W_ARMU with
 * C's impossible() default, else a walk of mon->minvent for owornmask & flag.
 * RNG-free.  W_ARMG == 0x10 (C prop.h:105, js/const.js:2241) — the call site
 * passes the literal.
 *
 * poly_when_stoned — MODULE-LOCAL STUB DELETED.  C ref: mondata.c:80-85.  This
 * file carried `function poly_when_stoned(data) { return false; }`, shadowing
 * the real body (js/mhitm.js:348) at the same call site one line below, so a
 * non-stone golem that should have turned INTO a stone golem (mon_to_stone)
 * fell through to monstone() instead.  The export is C's exact predicate:
 * is_golem(ptr) && ptr != &mons[PM_STONE_GOLEM] && !(svm.mvitals[
 * PM_STONE_GOLEM].mvflags & G_GENOD).  RNG-free.
 *
 * No new module edges: this file already imports from js/makemon.js and from
 * js/mhitm.js (both above), and both already import from this file
 * (makemon.js:113 can_carry, mhitm.js:85 finish_meating), so the cycles
 * predate the change and nothing calls across them at module-init time.
 * Both imported above instead of re-derived.
 *
 * NOT CLAIMED FIXED BY THIS: the guard above both calls,
 * `touch_petrifies_dm(pd)` (:3434), is itself a hardcoded `return false`, and
 * mon_to_stone/monstone below are no-op stubs, so the whole arm is unreachable
 * today.  These two are latent, not live. */
function flush_screen(x) {
    /* C ref: flush_screen calls bot() which resets disp.botl */
    if (game && game.disp) game.disp.botl = 0;
}

/* Local helpers that exist in other modules but not exported */
function mhis_dm(_mon) { return "its"; }
function is_rider_dm(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === PM_DEATH || (n | 0) === PM_PESTILENCE || (n | 0) === PM_FAMINE;
}
function resists_ston_dm(mtmp) { return !!resists_ston(mtmp); }

export async function mdisplacem(magr, mdef, quietly) {
    let pa, pd;
    let tx, ty, fx, fy;

    if (!magr || !mdef || magr === mdef)
        return M_ATTK_MISS;
    pa = magr.data;
    pd = mdef.data;
    tx = mdef.mx;
    ty = mdef.my;
    fx = magr.mx;
    fy = magr.my;
    /* NOTE: m_at sanity check elided — in replay, game.fmon may not
       be set up with same object identities as the passed arguments. */

    /* The 1 in 7 failure below matches the chance in do_attack()
     * for pet displacement. */
    if (!rn2(7))
        return M_ATTK_MISS;

    /* Grid bugs cannot displace at an angle. */
    if ((magr.mnum === PM_GRID_BUG_DG) && magr.mx !== mdef.mx
        && magr.my !== mdef.my)
        return M_ATTK_MISS;

    /* undetected monster becomes un-hidden if it is displaced */
    if (mdef.mundetected)
        mdef.mundetected = 0;
    if ((mdef.m_ap_type ?? 0) && (mdef.m_ap_type ?? 0) !== 3 /* M_AP_MONSTER */)
        seemimic(mdef);
    /* wake up the displaced defender */
    mdef.msleeping = 0;
    mdef.mstrategy = (mdef.mstrategy & ~0x30000000 /* STRAT_WAITMASK */) >>> 0;
    finish_meating(mdef);

    /* Set up the visibility of action. */
    game.v = game.v || {};
    game.v.vis = (canspotmon(magr) && canspotmon(mdef)) ? 1 : 0;

    if (touch_petrifies_dm(pd) && !resists_ston_dm(magr)) {
        if (!which_armor(magr, 0x10 /* W_ARMG */)) {
            if (poly_when_stoned(pa)) {
                await mon_to_stone(magr);
                return M_ATTK_HIT; /* no damage during the polymorph */
            }
            if (!quietly && canspotmon(magr)) {
                if (game.v.vis) {
                    pline("%s tries to move %s out of %s way.", Monnam(magr),
                          mon_nam(mdef), is_rider_dm(pa) ? "the" : mhis_dm(magr));
                }
                pline_mon(magr, "%s turns to stone!", Monnam(magr));
            }
            await monstone(magr);
            if (!DEADMONSTER_dm(magr))
                return M_ATTK_HIT; /* lifesaved */
            else if (magr.mtame && !game.v.vis)
                You("have a peculiarly sad feeling for a moment, then it passes.");
            return M_ATTK_AGR_DIED;
        }
    }

    remove_monster(fx, fy); /* pick up from orig position */
    if (mdef.wormno)
        remove_worm(mdef);
    else
        remove_monster(tx, ty);
    /* This port has no separate monster-occupancy grid; m_at() scans fmon by
     * mx/my.  Updating those coordinates is the place_monster equivalent. */
    magr.mx = tx;
    magr.my = ty;
    mdef.mx = fx;
    mdef.my = fy;
    /* mdisplacem assigns coordinates directly rather than using
     * place_monster(), so retire the temporary grid markers here. */
    delete magr._mapRemoved;
    delete mdef._mapRemoved;
    if (mdef.wormno) /* now put down tail */
        place_worm_tail_randomly(mdef, fx, fy);
    /* either creature might move into or out of a poison gas cloud */
    update_monster_region(magr);
    update_monster_region(mdef);

    if (game.v.vis && !quietly)
        pline("%s moves %s out of %s way!", Monnam(magr), mon_nam(mdef),
              is_rider_dm(pa) ? "the" : mhis_dm(magr));
    newsym(fx, fy);  /* see it       */
    newsym(tx, ty);  /*   all happen */
    flush_screen(0); /* make sure it shows up */

    return M_ATTK_HIT;
}
