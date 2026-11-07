import { game } from './gstate.js';
import { canspotmon, map_invisible, GLYPHCLS_MON } from './display.js';
import { pline } from './pline.js';
import { helpless } from './mhitm.js';
import { Monnam } from './mcastu.js';
import { verbalize } from './cmd.js';
import { PM_GECKO, PM_LONG_WORM, PM_ORACLE } from './pm.generated.js';
import { body_part } from './cmd.js'; // relocate-fns
import { BEEHIVE, COURT, EPRI, HAIR, HEAD, MORGUE, NECK, ROOMOFFSET, S_ANT, ZOO } from './const.js'; // relocate-fns
import { canseemon as canseemon_ff } from './display.js'; // relocate-fns
import { Hallucination, dosounds } from './fastforward.js'; // relocate-fns
import { vtense } from './objnam.js'; // relocate-fns
import { You_hear } from './pline.js'; // relocate-fns
import { halu_gname } from './pray.js'; // relocate-fns
import { inhistemple, temple_occupied } from './priest.js'; // relocate-fns
import { rn2 } from './rng.js'; // relocate-fns
import { cansee as cansee_ff } from './vision.js'; // relocate-fns
import { nomul } from './allmain.js'; // relocate-fns
import { adjalign, exercise } from './attrib.js'; // relocate-fns
import { midnight, night } from './calendar.js'; // relocate-fns
import { ALGN_SINNED, MS_ANIMAL, MS_DJINNI, MS_GUARDIAN, MS_NEMESIS, MS_SILENT, OCLASS_WEAPON, SPE_NOVEL_OTYP, STATUE_OTYP, SetVoice, Your, _EDOG_local, _Role_if_PM_HEALER, _Underwater, _cmd_Hallucination, _fl_pmidx, _glyph_at, _haseyes, _helpless_mon, _hero_Deaf, _hero_youmonst, _quest_status, _um_mhis, _uprop_active, create_nhwindow, currency, destroy_nhwindow, display_nhwindow, freeinv, incr_itimeout_prop, inv_cnt, is_weptool, merge_choice, nothing_happens, pline_The, putstr, quest_chat, record_achievement, which_armor } from './cmd.js'; // relocate-fns
import { money_cnt } from './hack.js'; // relocate-fns
import { ACH_ORCL, A_WIS, BOLT_LIM, CLAIRVOYANT, ECMD_CANCEL, ECMD_OK, ECMD_TIME, FROMOUTSIDE, FULL_MOON, Has_contents, INTRINSIC, IRONBARS, IS_WALL, In_endgame, LL_CONDUCT, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, NHW_MENU, PROTECTION, SDOOR, STRAT_WAITMASK, TEMPLE, Upolyd, W_ARMH as W_ARMH_TO, isok } from './const.js'; // relocate-fns
import { GLYPHCLS_OBJ, canseemon, glyph_is_invisible_at } from './display.js'; // relocate-fns
import { dropy } from './do.js'; // relocate-fns
import { noveltitle } from './do_name.js';
import { read_tribute } from './files.js'; // relocate-fns
import { cursed_dw } from './do_wear.js'; // relocate-fns
import { obj_extract_self } from './dokick.js'; // relocate-fns
import { yn_function } from './cmd.js'; // relocate-fns
import { upstart } from './hacklib.js'; // relocate-fns
import { addinv } from './invent.js'; // relocate-fns
import { getdir } from './lock.js'; // relocate-fns
import { accessible } from './monmove.js'; // relocate-fns
import { humanoid as _th_humanoid, findgold, monPmname, permonstTemplate, poly_gender, splitobj } from './makemon.js'; // relocate-fns
import { is_lminion as _sn_is_lminion, perceives as _th_perceives } from './mcastu.js';
import { cuss as _sn_cuss, aggravate } from './wizard.js'; // relocate-fns
import { could_seduce as could_seduce_mu, doseduce as doseduce_mu, mhis_mon } from './mhitu.js'; // relocate-fns
import { demon_talk as _sn_demon_talk } from './minion.js'; // relocate-fns
import { BY_ORACLE, add_to_minv, in_rooms } from './mklev.js';
import { inside_shop } from './shk.js';
import { outoracle, outrumor } from './rumors.js'; // relocate-fns
import { MKOBJ_OC_MAGIC } from './mkobj_erosion_meta.js'; // relocate-fns
import { wake_nearto, Soundeffect } from './mon.js'; // relocate-fns
import { same_race } from './mondata.js'; // relocate-fns
import { an, doname, genus, helm_simple_name, quest_info } from './objnam.js'; // relocate-fns
import { livelog_printf } from './pline.js'; // relocate-fns
import { PM_BABY_SILVER_DRAGON, PM_DEATH, PM_HUMAN_WERERAT, PM_PRISONER, PM_RAVEN, PM_SILVER_DRAGON, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_WATER_DEMON, PM_WINTER_WOLF, PM_WINTER_WOLF_CUB, PM_WOLF } from './pm.generated.js'; // relocate-fns
import { has_shrine, p_coaligned } from './priest.js'; // relocate-fns
import { rn1 } from './rng.js'; // relocate-fns
import { shk_chat, contained_cost as shk_contained_cost, currency as shk_currency, get_cost as shk_get_cost, get_pricing_units as shk_get_pricing_units, inhishop as shk_inhishop, shop_keeper as shk_shop_keeper, shop_object } from './shk.js'; // relocate-fns
import { remove_worn_item as _remove_worn_item_thrown } from './steal.js'; // relocate-fns
import { t_at } from './trap.js'; // relocate-fns
import { m_at, mon_nam, more_experienced, newexplevel } from './uhitm.js'; // relocate-fns
import { couldsee } from './vision.js'; // relocate-fns
import { getlin } from './windows.js'; // relocate-fns
import { PLNMSG_GROWL } from './const.js'; // relocate-fns
import { Deaf } from './display.js'; // relocate-fns
import { Monnam_mm, xm_Hallucination } from './mhitm.js'; // relocate-fns

export { dosounds };

/* C monflag.h / mondata.h constants and helpers */
const M1_FLY = 0x00000001;
const M1_CARNIVORE = 0x20000000;
const M1_HERBIVORE = 0x40000000;
const S_EEL = 57;

const MS_BARK     =  1;
const MS_MEW      =  2;
const MS_ROAR     =  3;
const MS_BELLOW   =  4;
const MS_GROWL    =  5;
const MS_SQEEK    =  6;
const MS_SQAWK    =  7;
const MS_CHIRP    =  8;
const MS_HISS     =  9;
const MS_BUZZ     = 10;
const MS_GRUNT    = 11;
const MS_NEIGH    = 12;
const MS_MOO      = 13;
const MS_WAIL     = 14;
const MS_MUMBLE   = 21;
const MS_HUMANOID = 25;
const MS_GROAN    = 44;

const se_courtly_conversation = 'se_courtly_conversation';
const se_sceptor_pounding = 'se_sceptor_pounding';
const se_low_buzzing = 'se_low_buzzing';
const se_angry_drone = 'se_angry_drone';
const se_bees = 'se_bees';
const se_canine_whine = 'se_canine_whine', se_squeal = 'se_squeal';
const se_yelp = 'se_yelp', se_feline_yelp = 'se_feline_yelp', se_canine_yelp = 'se_canine_yelp';
const se_avian_screak = 'se_avian_screak', se_wail = 'se_wail';

function is_silent(ptr) { return (ptr?.msound | 0) === MS_SILENT; }
function carnivorous(ptr) { return Boolean((ptr?.mflags1 | 0) & M1_CARNIVORE); }
function herbivorous(ptr) { return Boolean((ptr?.mflags1 | 0) & M1_HERBIVORE); }
function is_flyer(ptr) { return Boolean((ptr?.mflags1 | 0) & M1_FLY); }

// C sounds.c:519-541 — pet hunger noises (dogmove.c:383).
export async function beg(mtmp) {
    const ptr = mtmp.data;
    if (helpless(mtmp) || !(carnivorous(ptr) || herbivorous(ptr)))
        return;

    /* presumably nearness and soundok checks have already been made */
    if (!is_silent(ptr) && (ptr.msound | 0) <= MS_ANIMAL) {
        await domonnoise(mtmp);
    } else if ((ptr.msound | 0) >= MS_HUMANOID) {
        if (!canspotmon(mtmp))
            map_invisible(mtmp.mx, mtmp.my);
        SetVoice(mtmp, 0, 80, 0);
        await verbalize("I'm hungry.");
    } else if (canspotmon(mtmp)) {
        await pline('%s seems famished.', Monnam(mtmp));
    }
}

// C sounds.c:617 cry_sound — cries used by egg hatchlings.
// Sound and monster class values follow monflag.h and defsym.h.
export function cry_sound(mon) {
    const data = mon.data;
    switch (data.msound) {
    case MS_HISS: return 'hiss';
    case MS_ROAR:
    case MS_GROWL: return 'growl';
    case MS_CHIRP: return 'chirp';
    case MS_BUZZ: return 'buzz';
    case MS_SQAWK: return 'screech';
    case MS_GRUNT: return 'grunt';
    case MS_MUMBLE: return 'mumble';
    default:
    case MS_SILENT:
        return data.mlet === S_EEL ? 'gurgle' : 'chitter';
    }
}

// C sounds.c:659-674 — consult the already displayed species, without a draw.
export function mon_is_gecko(mon) {
    if (mon.data.pmidx === PM_GECKO)
        return true;
    if (mon.data.pmidx === PM_LONG_WORM)
        return false;
    const loc = game.level.at(mon.mx, mon.my);
    return !!(loc && loc.disp_cls === GLYPHCLS_MON && !loc.disp_is_warning
              && loc.disp_mon_pm === PM_GECKO);
}

/* C sounds.c:19-26 mon_in_room(mon, rmtyp) —
 *     int rno = levl[mon->mx][mon->my].roomno;
 *     if (rno >= ROOMOFFSET)
 *         return svr.rooms[rno - ROOMOFFSET].rtype == rmtyp;
 *     return FALSE;
 * RNG-free. */
export function mon_in_room(mon, rmtyp) {
    const loc = game.level?.at?.(mon.mx | 0, mon.my | 0);
    const rno = (loc?.roomno) | 0;
    if (rno >= ROOMOFFSET) {
        const croom = (game.level?.rooms ?? [])[rno - ROOMOFFSET];
        return !!croom && (croom.rtype | 0) === (rmtyp | 0);
    }
    return false;
}

/* C sounds.c:29-57 throne_mon_sound(mtmp) — the get_iter_mons predicate behind
 * dosounds' has_court branch; one rn2(3) for the first qualifying monster. */
export async function throne_mon_sound(mtmp) {
    const f1 = (mtmp.data?.mflags1 | 0), f2 = (mtmp.data?.mflags2 | 0);
    if (((mtmp.msleeping | 0) || (f2 & 0x00000400) /* is_lord */
         || (f2 & 0x00000800) /* is_prince */)
        && !(f1 & 0x00040000) /* is_animal */
        && mon_in_room(mtmp, COURT)) {
        const throne_msg = [
            "the tones of courtly conversation.",
            "a sceptre pounded in judgment.",
            "Someone shouts \"Off with %s head!\"",
            "Queen Beruthiel's cats!",
        ];
        const which = rn2(3) + (Hallucination() ? 1 : 0);
        if (which !== 2) {
            if (which === 0) {
                Soundeffect(se_courtly_conversation, 30);
            } else if (which === 1) {
                Soundeffect(se_sceptor_pounding, 100);
            }
            await You_hear(throne_msg[which]);
        } else {
            await pline(throne_msg[2].replace('%s', game.flags?.female ? 'her' : 'his'));
        }
        return true;
    }
    return false;
}

/* C sounds.c:61-86 beehive_mon_sound(). */
export async function beehive_mon_sound(mtmp) {
    const data = mtmp.data;
    if ((data?.mlet | 0) !== S_ANT
        || !is_flyer(data)
        || !mon_in_room(mtmp, BEEHIVE))
        return false;
    const hallu = Hallucination() ? 1 : 0;
    switch (rn2(2) + hallu) {
    case 0:
        Soundeffect(se_low_buzzing, 30);
        await You_hear("a low buzzing.");
        break;
    case 1:
        Soundeffect(se_angry_drone, 100);
        await You_hear("an angry drone.");
        break;
    case 2:
        Soundeffect(se_bees, 100);
        await You_hear(`bees in your ${game.u?.uarmh ? '' : '(nonexistent) '}bonnet!`);
        break;
    }
    return true;
}

/* C mondata.h:66 is_animal(ptr) — `(ptr->mflags1 & M1_ANIMAL) != 0`.
 * Declared locally (monflag.h:103) the same way js/makemon.js:1341 and
 * js/trap.js:1953 declare it; it is not exported from anywhere. */
const M1_ANIMAL_FF = 0x00040000;

/* C sounds.c:113-127 zoo_mon_sound(mtmp) — the get_iter_mons predicate behind
 * dosounds' has_zoo branch.  It draws rn2(2) for EVERY qualifying monster it is
 * handed, and get_iter_mons stops at the first one that returns TRUE, so the
 * draw fires at most once per dosounds call.
 *     if ((mtmp->msleeping || is_animal(mtmp->data))
 *         && mon_in_room(mtmp, ZOO)) {
 *         int hallu = Hallucination ? 1 : 0, selection = rn2(2) + hallu;
 *         You_hear1(zoo_msg[selection]);
 *         return TRUE;
 *     }
 *     return FALSE;
 * The rn2(2) is INSIDE the guard, so a non-qualifying monster draws nothing. */
export async function zoo_mon_sound(mtmp) {
    if (((mtmp.msleeping | 0)
         || (((mtmp.data?.mflags1 | 0) & M1_ANIMAL_FF) !== 0))
        && mon_in_room(mtmp, ZOO)) {
        const hallu = Hallucination() ? 1 : 0;
        const selection = rn2(2) + hallu;
        const zoo_msg = [
            "a sound reminiscent of an elephant stepping on a peanut.",
            "a sound reminiscent of a seal barking.", "Doctor Dolittle!",
        ];
        await You_hear(zoo_msg[selection]);
        return true;
    }
    return false;
}

/* C sounds.c:83-107 morgue_mon_sound().  Keep this predicate local to the
 * ambient-sound replay module: the source helper is static and the needed
 * monster flags are already present on the reconstructed permonst records. */
const M2_UNDEAD_FF = 0x00000002;

const PM_VAMPIRE_FF = 226;

const PM_VAMPIRE_LORD_FF = 227;

const PM_VLAD_THE_IMPALER_FF = 228;

export async function morgue_mon_sound(mtmp) {
    const data = mtmp.data;
    const undead = ((data?.mflags2 | 0) & M2_UNDEAD_FF) !== 0;
    const vampshifter = (mtmp.cham | 0) === PM_VAMPIRE_FF
        || (mtmp.cham | 0) === PM_VAMPIRE_LORD_FF
        || (mtmp.cham | 0) === PM_VLAD_THE_IMPALER_FF;
    if ((undead || vampshifter) && mon_in_room(mtmp, MORGUE)) {
        const selection = rn2(2) + (Hallucination() ? 1 : 0);
        const hair = body_part(HAIR);
        if (selection === 0) {
            await pline("You suddenly realize it is unnaturally quiet.");
        } else if (selection === 1) {
            await pline(`The ${hair} on the back of your ${body_part(NECK)} ${vtense(hair, "stand")} up.`);
        } else {
            await pline(`The ${hair} on your ${body_part(HEAD)} ${vtense(hair, "seem")} to stand up.`);
        }
        return true;
    }
    return false;
}

export async function oracle_sound(mtmp) {
    const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if (mndx !== PM_ORACLE)
        return false;
    /* and don't produce silly effects when she's clearly visible */
    if (Hallucination() || !canseemon_ff(mtmp)) {
        const hallu = Hallucination() ? 1 : 0;
        const ora_msg = [
            "a strange wind.", "convulsive ravings.", "snoring snakes.",
            "someone say \"No more woodchucks!\"", "a loud ZOT!",
        ];
        await You_hear(ora_msg[rn2(3) + hallu * 2]);
    }
    return true;
}

/* C sounds.c:147-198 temple_priest_sound(mtmp) — get_iter_mons predicate. */
export async function temple_priest_sound(mtmp) {
    if (mtmp.ispriest && inhistemple(mtmp)
        && !helpless(mtmp)
        && temple_occupied(game.u?.urooms || "") !== EPRI(mtmp).shroom) {
        const temple_msg = [
            "*someone praising %s.", "*someone beseeching %s.",
            "#an animal carcass being offered in sacrifice.",
            "*a strident plea for donations.",
        ];
        const hallu = Hallucination() ? 1 : 0;
        let trycount = 0;
        const ax = EPRI(mtmp).shrpos.x, ay = EPRI(mtmp).shrpos.y;
        const speechless = ((mtmp.data?.msound | 0) <= MS_ANIMAL);
        const in_sight = canseemon_ff(mtmp) || cansee_ff(ax, ay);
        let msg;
        do {
            msg = temple_msg[rn2(temple_msg.length - 1 + hallu)];
            if (msg.includes('*') && speechless)
                continue;
            if (msg.includes('#') && in_sight)
                continue;
            break;
        } while (++trycount < 50);
        let i = 0;
        while (!/[A-Za-z]/.test(msg[i])) ++i; /* skip control flags */
        msg = msg.slice(i);
        if (msg.includes('%'))
            await You_hear(msg.replace('%s', halu_gname(EPRI(mtmp).shralign)));
        else
            await You_hear(msg);
        return true;
    }
    return false;
}

// C ref: sounds.c dotalk() → dochat() — #chat extended command.
// C call chain: doextcmd → dotalk → dochat → getdir → nhgetch (direction)
// dotalk(void) just calls dochat() and returns its result.
// C ref: sounds.c:1248-1254 dotalk(), sounds.c:1257-1408 dochat().
export async function dotalk() {
    const g = game;
    
    // ── Local helpers & constants ──
    const MS_SILENT = 0;
    const M1_HUMANOID = 0x00020000;
    const STATUE = 476;
    /* STRAT_WAITMASK is imported from const.js (monst.h:177 =
     * STRAT_CLOSE|STRAT_WAITFORU = 0x30000000); the local re-declaration that
     * used to shadow it here has been removed. */

    function is_silent_local(ptr) { return !!ptr && (ptr.msound | 0) === MS_SILENT; }
    function humanoid_local(ptr) { return !!ptr && ((ptr.mflags1 | 0) & M1_HUMANOID) !== 0; }
    function vobj_at(x, y) {
        for (let obj = g.fobj; obj; obj = obj.nobj) {
            if ((obj.ox | 0) === x && (obj.oy | 0) === y) return obj;
        }
        return null;
    }
    /* C do_name.c:1303 — use the canonical permonst role/form name table. */
    function pmname_local(mdat, gender) {
        return monPmname(mdat?.pmidx | 0, gender | 0);
    }
    // C ref: makemon.c:1298 — mcanmove=1, msleeping=0 are creation defaults.
    // Bridge monsters omit those fields; the live _helpless() is load-bearing
    // and must not be edited, so inline the macro locally.
    function helpless_local(mon) {
        return ((mon.msleeping ?? 0) || !((mon.mcanmove ?? 1) | 0));
    }
    
    const ymData = g.youmonst && g.youmonst.data;
    
    // ── Guard: is_silent ──
    if (ymData && is_silent_local(ymData)) {
        await pline("As %s, you cannot speak.",
            an(pmname_local(ymData, 0)));
        return ECMD_OK;
    }
    
    // ── Guard: Strangled ──
    if (_uprop_active('STRANGLED')) {
        await pline("You can't speak.  You're choking!");
        return ECMD_OK;
    }
    
    // ── Guard: uswallow ──
    if (g.u.uswallow) {
        await pline("They won't hear you out there.");
        return ECMD_OK;
    }
    
    // ── Guard: Underwater ──
    if (_Underwater()) {
        Your("speech is unintelligible underwater.");
        return ECMD_OK;
    }
    
    const Deaf = _hero_Deaf();
    const Blind = _uprop_active('BLINDED');
    
    // ── Shop check ──
    if (!Deaf && !Blind) {
        const otmp = shop_object(g.u.ux | 0, g.u.uy | 0);
        if (otmp) {
            await price_quote(otmp);
            return ECMD_TIME;
        }
    }
    
    // ── getdir: sounds.c:1290-1293 —
    //     if (!getdir("Talk to whom? (in what direction)")) {
    //         /* decided not to chat */
    //         return ECMD_CANCEL;
    //     }
    // This used to hand-roll its own nhgetch + a lowercase DIR_DX/DIR_DY
    // table: any key not in that table (ESC/^C aside) fell through as
    // dx=dy=0, which is indistinguishable from the self-target case C
    // reaches only via the dedicated NHKF_GETDIR_SELF keys ('.'/'s').  C's
    // real getdir() (cmd.c:3958) tests movecmd() first and returns 0 for any
    // other non-movement key (printing "What a strange direction!" or the
    // cmdassist help window), which dochat turns into ECMD_CANCEL — not the
    // not a direction key, so C's getdir returns 0 and dochat returns
    // ECMD_CANCEL(2); this body computed dx=dy=0 for the unrecognized key and
    // fell into the self-target arm, returning ECMD_OK(0).  Call the real
    // ported getdir (js/lock.js) instead of re-deriving movecmd/quitchars/
    // confdir/cmdassist a third time.
    if (!(await getdir('Talk to whom? (in what direction)'))) {
        return ECMD_CANCEL;
    }

    // ── Steed check ──
    if (g.u.usteed && g.u.dz > 0) {
        if (helpless_local(g.u.usteed)) {
            await pline("%s seems not to notice you.", Monnam(g.u.usteed));
            return ECMD_TIME;
        } else {
            return domonnoise(g.u.usteed);
        }
    }
    
    // ── dz check ──
    if (g.u.dz) {
        await pline("They won't hear you %s there.", g.u.dz < 0 ? "up" : "down");
        return ECMD_OK;
    }
    
    // ── Self-target check ──
    if (g.u.dx === 0 && g.u.dy === 0) {
        await pline("Talking to yourself is a bad habit for a dungeoneer.");
        return ECMD_OK;
    }
    
    // ── Compute target ──
    const tx = (g.u.ux | 0) + g.u.dx;
    const ty = (g.u.uy | 0) + g.u.dy;
    
    if (!isok(tx, ty))
        return ECMD_OK;
    
    let mtmp = m_at(tx, ty);
    
    // ── No monster or undetected ──
    if (!mtmp || mtmp.mundetected) {
        // Statue check
        const otmp2 = vobj_at(tx, ty);
        if (otmp2 && (otmp2.otyp | 0) === STATUE) {
            if (!Blind) {
                const Hallucination = _cmd_Hallucination();
                // rndmonnam(null) for hallucination, else "statue"
                let name;
                if (Hallucination) {
                    try { name = (await import('./priest.js')).rndmonnam(null); }
                    catch(e) { name = "monster"; }
                } else {
                    name = "statue";
                }
                await pline_The("%s seems not to notice you.", name);
            }
            return ECMD_OK;
        }
        // Wall check
        const loc = g.level && g.level.at(tx, ty);
        if (!Deaf && loc && (IS_WALL(loc.typ) || loc.typ === SDOOR)) {
            if (Blind && !IS_WALL(loc.lastseentyp | 0)) {
                ; // silent — blind and lastseentyp isn't a wall
            } else {
                const Hallucination = _cmd_Hallucination();
                if (!Hallucination) {
                    await pline("It's like talking to a wall.");
                } else {
                    const walltalk = [
                        "gripes about its job.",
                        "tells you a funny joke!",
                        "insults your heritage!",
                        "chuckles.",
                        "guffaws merrily!",
                        "deprecates your exploration efforts.",
                        "suggests a stint of rehab...",
                        "doesn't seem to be interested.",
                    ];
                    let idx = rn2(10);
                    if (idx >= walltalk.length) idx = walltalk.length - 1;
                    await pline_The("wall %s", walltalk[idx]);
                }
            }
            return ECMD_OK;
        }
    }
    
    // ── No monster / undetected / furniture / object appearance ──
    if (!mtmp || mtmp.mundetected
        || M_AP_TYPE(mtmp) === M_AP_FURNITURE
        || M_AP_TYPE(mtmp) === M_AP_OBJECT)
        return ECMD_OK;
    
    // ── Sleeping monsters (except priests) ──
    if (helpless_local(mtmp) && !mtmp.ispriest) {
        if (canspotmon(mtmp))
            await pline("%s seems not to notice you.", Monnam(mtmp));
        return ECMD_OK;
    }
    
    // ── Prod waiting monster into action ──
    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
    
    // ── Tame monster eating ──
    if (!Deaf && mtmp.mtame && mtmp.meating) {
        if (!canspotmon(mtmp)) {
            // map_invisible imported from display.js
            const { map_invisible } = await import('./display.js');
            map_invisible(mtmp.mx, mtmp.my);
        }
        await pline("%s is eating noisily.", Monnam(mtmp));
        return ECMD_OK;
    }
    
    // ── Deaf hero ──
    if (Deaf) {
        const xresponse = (ymData ? humanoid_local(ymData) : true)
            ? "falls on deaf ears"
            : "is inaudible";
        await pline("Any response%s%s %s.",
            canspotmon(mtmp) ? " from " : "",
            canspotmon(mtmp) ? mon_nam(mtmp) : "",
            xresponse);
        return ECMD_OK;
    }
    
    return domonnoise(mtmp);
}

function u_have_novel() {
    for (let o = game.invent; o; o = o.nobj)
        if (o.otyp === SPE_NOVEL_OTYP) return o;
    return null;
}

/* C mplayer.c:355-379; called by sounds.c:1028 for hostile endgame players. */
async function mplayer_talk(mtmp) {
    const same_class_msg = [
        "I can't win, and neither will you!",
        "You don't deserve to win!",
        'Mine should be the honor, not yours!',
    ];
    const other_class_msg = [
        'The low-life wants to talk, eh?',
        'Fight, scum!',
        'Here is what I have to say!',
    ];
    if (mtmp.mpeaceful)
        return;
    SetVoice(mtmp, 0, 80, 0);
    await verbalize('Talk? -- %s', _fl_pmidx(mtmp) === game.urole.mnum
        ? same_class_msg[rn2(3)] : other_class_msg[rn2(3)]);
}

/* C sounds.c:479-516 whimper(mtmp).  The leash check reaches this
 * synchronously, so keep the sound/message path synchronous like yelp(). */
const _WHIMPER_H_SOUNDS = [
    'beep','boing','sing','belche','creak','cough','rattle','ululate','pop',
    'jingle','sniffle','tinkle','eep','clatter','hum','sizzle','twitter',
    'wheeze','rustle','honk','lisp','yodel','coo','burp','moo','boom',
    'murmur','oink','quack','rumble','twang','toot','gargle','hoot','warble',
];

export function whimper(mtmp) {
    const data = mtmp?.data;
    const msound = data?.msound | 0;
    if ((mtmp?.msleeping | 0) || !(mtmp?.mcanmove | 0) || !msound)
        return;
    let verb = null;
    let se = se_canine_whine;
    if (_uprop_active('HALLUC')) {
        verb = _WHIMPER_H_SOUNDS[rn2(_WHIMPER_H_SOUNDS.length)];
    } else {
        switch (msound) {
        case MS_MEW:
        case MS_GROWL: verb = 'whimper'; break;
        case MS_BARK:  verb = 'whine'; break;
        case MS_SQEEK: se = se_squeal; verb = 'squeal'; break;
        default: break;
        }
    }
    if (verb) {
        if (!_uprop_active('HALLUC')) {
            Soundeffect(se, 50);
        }
        pline(`${Monnam(mtmp)} ${vtense(null, verb)}.`);
        if (game.context?.run)
            nomul(0);
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, (data.mlevel | 0) * 6);
    }
}

/* C ref: sounds.c:351 growl_sound() — map msound to a verb string.
 * ms_sounds values from monflag.h:10-59 (NOT invented numbers). */
export function growl_sound(mtmp) {
    let ret;
    switch (mtmp.data.msound) {
    case MS_MEW:
    case MS_HISS:
        ret = "hiss";
        break;
    case MS_BARK:
    case MS_GROWL:
        ret = "growl";
        break;
    case MS_ROAR:
        ret = "roar";
        break;
    case MS_BELLOW:
        ret = "bellow";
        break;
    case MS_BUZZ:
        ret = "buzz";
        break;
    case MS_SQEEK:
        ret = "squeal";
        break;
    case MS_SQAWK:
        ret = "screech";
        break;
    case MS_NEIGH:
        ret = "neigh";
        break;
    case MS_WAIL:
        ret = "wail";
        break;
    case MS_GROAN:
        ret = "groan";
        break;
    case MS_MOO:
        ret = "low";
        break;
    case MS_SILENT:
        ret = "commotion";
        break;
    default:
        ret = "scream";
    }
    return ret;
}

/* C ref: sounds.c:1457 responsive_mon_at(x, y) */
function _responsive_mon_at(x, y) {
    const u = game.u || {};
    let mtmp = isok(x, y) ? m_at(x, y) : null;
    if (mtmp && (helpless(mtmp)
                 || !(mtmp.mcansee ?? 1) || !_haseyes(mtmp.data)
                 || (_uprop_active('INVIS') && !_th_perceives(mtmp.data))
                 || (x !== (mtmp.mx | 0) || y !== (mtmp.my | 0))))
        mtmp = null;
    return mtmp;
}

/* C ref: sounds.c:1427-1536 tiphat() — player chose 'uarmh' for #tip.
 * Returns C's int (nonzero = a move was used). */
export async function tiphat() {
    const g = game;
    const u = g.u || {};
    const uarmh = u.uarmh;
    if (!uarmh)
        return 0;
    let res = uarmh.bknown ? 0 : 1;
    if (await cursed_dw(uarmh))
        return res;
    if (!(await getdir('At whom? (in what direction)')))
        return res;
    res = 1;
    await pline(`You briefly doff your ${helm_simple_name(uarmh)}.`);

    if (!(u.dx | 0) && !(u.dy | 0)) {
        if (u.usteed && (u.dz | 0) > 0) {
            if (helpless(u.usteed))
                await pline(`${Monnam(u.usteed)} doesn't notice.`);
            else
                await domonnoise(u.usteed);
        } else if (u.dz | 0) {
            await pline(`There's no one ${(u.dz | 0) < 0 ? 'up' : 'down'} there.`);
        } else {
            await pline_The("lout here doesn't acknowledge you...");
        }
        return res;
    }

    const Hallu = _cmd_Hallucination(); // youprop.h:120: honours Halluc_resistance
    const Deaf = _hero_Deaf();
    let mtmp = null, otmp;
    let vismon = false, unseen = false, statue = false;
    let x = u.ux | 0, y = u.uy | 0;
    for (let range = 1; range <= BOLT_LIM + 1; ++range) {
        x += u.dx | 0; y += u.dy | 0;
        if (!isok(x, y) || (range > 1 && !couldsee(x, y))) {
            x -= u.dx | 0; y -= u.dy | 0;
            break;
        }
        mtmp = m_at(x, y) || null;
        vismon = !!(mtmp && canseemon(mtmp));
        unseen = !!glyph_is_invisible_at(x, y);
        otmp = null;
        if (!vismon && !unseen)
            otmp = g.level?.levelObjects?.[x]?.[y] ?? null;
        const glyph = _glyph_at(x, y);
        statue = !!((glyph?.cls === GLYPHCLS_OBJ && glyph.otyp === STATUE_OTYP)
                    || (!vismon && !unseen && otmp && (otmp.otyp | 0) === STATUE_OTYP));
        if (vismon && (M_AP_TYPE(mtmp) === M_AP_FURNITURE
                       || M_AP_TYPE(mtmp) === M_AP_OBJECT)) {
            vismon = false; mtmp = null;
        }
        const loc = g.level?.at?.(x, y);
        if (vismon || unseen || (statue && Hallu)
            || (range === 1 && mtmp && _responsive_mon_at(x, y)
                && !is_silent(mtmp.data))
            || !(accessible(x, y) || (loc && loc.typ === IRONBARS)))
            break;
    }

    let nada = false;
    if (unseen || (statue && Hallu)) {
        await pline(`That ${unseen ? 'unseen ' : ''}creature is ignoring you!`);
    } else if (!mtmp || !_responsive_mon_at(x, y)) {
        if (vismon)
            await pline(`${Monnam(mtmp)} seems not to notice you.`);
        else
            nada = true;
    } else {
        mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
        const hum = _th_humanoid(mtmp.data);
        if (vismon && hum && mtmp.mpeaceful && !_uprop_active('CONFLICT')) {
            otmp = which_armor(mtmp, W_ARMH_TO);
            if (!otmp) {
                await pline(`${Monnam(mtmp)} waves.`);
            } else if (otmp.cursed) {
                await pline(`${Monnam(mtmp)} grasps ${_um_mhis(mtmp)} ${helm_simple_name(otmp)} but can't remove it.`);
                otmp.bknown = 1;
            } else {
                await pline(`${Monnam(mtmp)} tips ${_um_mhis(mtmp)} ${helm_simple_name(otmp)} in response.`);
            }
        } else if (vismon && hum) {
            const reaction = ["curses", "gestures rudely", "gestures offensively"];
            const which = !Deaf ? rn2(3) : rn1(2, 1);
            const twice = (Deaf || which > 0 || rn2(3)) ? 0 : rn1(2, 1);
            await pline(`${Monnam(mtmp)} ${reaction[which]}${twice ? ' and ' : ''}${twice ? reaction[twice] : ''} at you...`);
        } else if (Math.max(Math.abs(x - (u.ux | 0)), Math.abs(y - (u.uy | 0))) <= 1
                   && !Deaf && (await domonnoise(mtmp))) {
            if (!vismon)
                map_invisible(x, y);
        } else if (vismon) {
            await pline(`${Monnam(mtmp)} doesn't respond.`);
        } else {
            nada = true;
        }
    }
    if (nada)
        await pline(nothing_happens);
    return res;
}

const BLOOD = 15;

const MS_LEADER = 36;   /* monflag.h:51 */

// ── Stubs for unported helpers used by dotalk ───────────────────────────────
const _MSNOISE_MS_BARK = 1;      /* monflag.h:12 */

const _MSNOISE_MS_SQAWK = 7;     /* monflag.h:18 */

const _MSNOISE_MS_NEIGH = 12;    /* monflag.h:23 */

const _MSNOISE_MS_GROAN = 44;    /* monflag.h:59 */

const _MSNOISE_MS_SEDUCE = 31;   /* monflag.h:46 */

const _MSNOISE_S_NYMPH = 14;     /* defsym.h:310 MONSYM(14, 'n', NYMPH, S_NYMPH, "nymph") */

const _MSNOISE_PM_DINGO = 17;    /* js/pm.generated.js PM_DINGO */

const _MSNOISE_MS_HUMANOID = 25; /* monflag.h:40 "generic traveling companion" */

const _MSNOISE_MS_BOAST = 43;    /* monflag.h:58 giants */

const _MSNOISE_S_CENTAUR = 29;   /* defsym.h MONSYM S_CENTAUR */

/* monflag.h:126-154 */
const _MSNOISE_M2_ELF = 0x00000010, _MSNOISE_M2_DWARF = 0x00000020,
      _MSNOISE_M2_GNOME = 0x00000040, _MSNOISE_M2_MAGIC = 0x80000000;

/* mondata.h:157 is_mplayer(ptr) — `ptr` is inside the mons[] player-monster
 * block, i.e. PM_ARCHEOLOGIST(331)..PM_WIZARD(343).  A pointer-range test in C;
 * an index-range test here. */
const _MSNOISE_PM_ARCHEOLOGIST = 331, _MSNOISE_PM_WIZARD = 343;

const _MSNOISE_PM_HOBBIT = 43, _MSNOISE_PM_TOURIST = 341;

function _msnoise_mflags2(ptr) { return (ptr?.mflags2 | 0) >>> 0; }

function _msnoise_is_elf(ptr) { return (_msnoise_mflags2(ptr) & _MSNOISE_M2_ELF) !== 0; }

function _msnoise_is_dwarf(ptr) { return (_msnoise_mflags2(ptr) & _MSNOISE_M2_DWARF) !== 0; }

function _msnoise_is_gnome(ptr) { return (_msnoise_mflags2(ptr) & _MSNOISE_M2_GNOME) !== 0; }

function _msnoise_likes_magic(ptr) { return (_msnoise_mflags2(ptr) & _MSNOISE_M2_MAGIC) !== 0; }

function _msnoise_is_mplayer(ptr) {
    const n = (ptr?.pmidx ?? -1) | 0;
    return n >= _MSNOISE_PM_ARCHEOLOGIST && n <= _MSNOISE_PM_WIZARD;
}

async function _money2mon(mon, amount) {
    const ygold = findgold(game.invent);
    if (amount <= 0) return 0;
    if (!ygold || ygold.quan < amount) return 0;
    let paidgold = ygold;
    if (paidgold.quan > amount)
        paidgold = await splitobj(paidgold, amount);
    else if (paidgold.owornmask)
        await _remove_worn_item_thrown(paidgold, false);
    freeinv(paidgold);
    await add_to_minv(mon, paidgold);
    if (game.disp) game.disp.botl = true;
    return amount;
}

/* C ref: minion.c bribe(mtmp, prompt) — getlin the amount, sscanf "%ld",
 * then hand the gold over with money2mon().  Returns the amount paid. */
async function _bribe(mtmp, prompt) {
    const umoney = money_cnt(game.invent);
    const buf = await getlin(prompt);
    const m = /^\s*([+-]?\d+)/.exec(buf || '');
    let offer = m ? parseInt(m[1], 10) : 0;
    if (offer < 0) {
        await pline(`You try to shortchange ${mon_nam(mtmp)}, but fumble.`);
        return 0;
    } else if (offer === 0) {
        await pline('You refuse.');
        return 0;
    } else if (offer >= umoney) {
        await pline(`You give ${mon_nam(mtmp)} all your gold.`);
        offer = umoney;
    } else {
        await pline(`You give ${mon_nam(mtmp)} ${offer} ${currency(offer)}.`);
    }
    await _money2mon(mtmp, offer);
    if (game.disp) game.disp.botl = true;
    return offer;
}

/* C ref: shk.c money2u(mon, amount) — monster's gold to the hero (shk.js's copy
 * is module-private).  invlet_basic is 52. */
async function _money2u_priest(mon, amount) {
    let mongold = findgold(mon.minvent);
    if (amount <= 0 || !mongold || (mongold.quan | 0) < amount)
        return;
    if ((mongold.quan | 0) > amount)
        mongold = await splitobj(mongold, amount);
    obj_extract_self(mongold);
    if (!(await merge_choice(game.invent, mongold)) && inv_cnt(false) >= 52) {
        await pline('You have no room for the gold!');
        await dropy(mongold);
    } else {
        await addinv(mongold);
        if (game.disp) game.disp.botl = true;
    }
}

/* C ref: priest.c:561-745 priest_talk(priest) — domonnoise()'s MS_PRIEST arm.
 * Not exported from priest.js (which has no body for it), so it lives here. */
async function priest_talk(priest) {
    const g = game;
    const u = g.u;
    const coaligned = p_coaligned(priest);
    const strayed = (u.ualign.record | 0) < 0;
    const epri = EPRI(priest);

    /* KMH, conduct */
    u.uconduct = u.uconduct || {};
    const prevGnostic = u.uconduct.gnostic | 0;
    u.uconduct.gnostic = prevGnostic + 1;
    if (!prevGnostic)
        livelog_printf(LL_CONDUCT, 'rejected atheism by consulting with %s', mon_nam(priest));

    if (priest.mflee || (!priest.ispriest && coaligned && strayed)) {
        await pline(`${Monnam(priest)} doesn't want anything to do with you!`);
        priest.mpeaceful = 0;
        return;
    }

    /* priests don't chat unless peaceful and in their own temple */
    if (!inhistemple(priest) || !priest.mpeaceful || _helpless_mon(priest)) {
        const cranky_msg = [
            'Thou wouldst have words, eh?  I\'ll give thee a word or two!',
            'Talk?  Here is what I have to say!',
            'Pilgrim, I would speak no longer with thee.'
        ];
        if (_helpless_mon(priest)) {
            await pline(`${Monnam(priest)} breaks out of ${_um_mhis(priest)} reverie!`);
            priest.mfrozen = priest.msleeping = 0;
            priest.mcanmove = 1;
        }
        priest.mpeaceful = 0;
        SetVoice(priest, 0, 80, 0);
        await verbalize(cranky_msg[rn2(3)]);
        return;
    }

    /* you desecrated the temple and now you want to chat? */
    const troom = in_rooms(priest.mx | 0, priest.my | 0, TEMPLE);
    if (priest.mpeaceful && troom && troom.length && !has_shrine(priest)) {
        SetVoice(priest, 0, 80, 0);
        await verbalize('Begone!  Thou desecratest this holy place with thy presence.');
        priest.mpeaceful = 0;
        return;
    }
    if (!money_cnt(g.invent)) {
        if (coaligned && !strayed) {
            const pmoney = money_cnt(priest.minvent);
            if (pmoney > 0) {
                const bits = _uprop_active('HALLUC') ? currency(pmoney)
                           : (pmoney === 1) ? 'bit' : 'bits';
                await pline(`${Monnam(priest)} gives you ${pmoney === 1 ? 'one ' : 'two '}${bits} for an ale.`);
                await _money2u_priest(priest, pmoney > 1 ? 2 : 1);
            } else
                await pline(`${Monnam(priest)} preaches the virtues of poverty.`);
            exercise(A_WIS, true);
        } else
            await pline(`${Monnam(priest)} is not interested.`);
        return;
    } else {
        /* randomized donation base; more gold on hand raises it */
        const cheapskate = (epri ? (epri.cheapskate_count | 0) : 0);
        const suggested = ((u.ulevelpeak | 0) ? (u.ulevelpeak | 0) : 1)
                          * rn1(101, 150 + cheapskate * 40);
        let quan = Math.trunc(money_cnt(g.invent) / (suggested * 3));
        if (quan < 1)
            quan = 1;
        const buf = `How much will you offer (suggested: ${suggested * quan} or ${suggested * quan * 2})?`;
        if (g.flags && g.flags.debug)
            await pline(`${Monnam(priest)} asks you for a contribution for the temple (base ${suggested}).`);
        else
            await pline(`${Monnam(priest)} asks you for a contribution for the temple.`);
        let offer = await _bribe(priest, buf);
        if (offer === 0) {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Thou shalt regret thine action!');
            if (coaligned)
                adjalign(-1);
            if (epri) epri.cheapskate_count = (epri.cheapskate_count | 0) + 1;
        } else if (offer < suggested * quan) {
            if (money_cnt(g.invent) > offer * 2) {
                SetVoice(priest, 0, 80, 0);
                await verbalize('Cheapskate.');
                if (epri) epri.cheapskate_count = (epri.cheapskate_count | 0) + 1;
            } else {
                SetVoice(priest, 0, 80, 0);
                await verbalize('I thank thee for thy contribution.');
                /* give player some token */
                exercise(A_WIS, true);
            }
        } else if (offer < suggested * quan * 2) {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Thou art indeed a pious individual.');
            if (money_cnt(g.invent) < offer * 2) {
                if (coaligned && (u.ualign.record | 0) <= ALGN_SINNED)
                    adjalign(1);
            }
            await verbalize('I bestow upon thee a blessing.');
            const amt = Math.trunc(500 * offer / suggested);
            incr_itimeout_prop(u.uprops[CLAIRVOYANT], rn1(amt, amt));
        } else if (offer < suggested * quan * 3) {
            let orig_ublessed = u.ublessed | 0;
            const prot = u.uprops[PROTECTION];
            /* u.ublessed is only active when Protection is enabled via
               something other than worn gear */
            if (!((prot.intrinsic | 0) & INTRINSIC)) {
                prot.intrinsic = (prot.intrinsic | 0) | FROMOUTSIDE;
                orig_ublessed = -1; /* force "rewarded" message */
            }
            for (; offer >= (2 * suggested); offer -= (2 * suggested)) {
                if (!(u.ublessed | 0))
                    u.ublessed = rn1(3, 2);
                else if ((u.ublessed | 0) < 20
                         && ((u.ublessed | 0) < 9 || !rn2(u.ublessed | 0)))
                    u.ublessed = (u.ublessed | 0) + 1;
            }
            SetVoice(priest, 0, 80, 0);
            if ((u.ublessed | 0) > orig_ublessed)
                await verbalize('Thou hast been rewarded for thy devotion.');
            else
                await verbalize('Thy selfless generosity is deeply appreciated.');
        } else {
            SetVoice(priest, 0, 80, 0);
            await verbalize('Thy selfless generosity is deeply appreciated.');
            if (money_cnt(g.invent) < offer * 2 && coaligned) {
                if (strayed && ((g.moves | 0) - (u.ucleansed | 0)) > 5000) {
                    u.ualign.record = 0; /* cleanse thee */
                    u.ucleansed = g.moves | 0;
                } else {
                    adjalign(2);
                }
            }
        }
    }
}

async function doconsult(oracl) {
    const g = game;
    const u = g.u;
    const minor_cost = 50, major_cost = 500 + 50 * (u.ulevel | 0);
    let u_pay;
    g.multi = 0;
    const umoney = money_cnt(g.invent);
    if (!oracl) {
        await pline('There is no one here to consult.');
        return ECMD_OK;
    } else if (!oracl.mpeaceful) {
        await pline('%s is in no mood for consultations.', Monnam(oracl));
        return ECMD_OK;
    } else if (!umoney) {
        await pline('You have no gold.');
        return ECMD_OK;
    }
    let qbuf = `"Wilt thou settle for a minor consultation?" (${minor_cost} ${currency(minor_cost)})`;
    const ans = await yn_function(qbuf, 'ynq', 'q');
    if (ans === 'y') {
        if (umoney < minor_cost) {
            await pline("You don't even have enough gold for that!");
            return ECMD_OK;
        }
        u_pay = minor_cost;
    } else if (ans === 'n') {
        const oc = g.oracle_cnt;
        if (umoney <= minor_cost || oc === 1 || (g.oracle_flg | 0) < 0) {
            /* C rumors.c:731-733 returns without clearing WIN_MESSAGE;
             * tty_yn_function leaves this prompt painted (topl.c:544-548),
             * just as on the other consultation cancellation paths. */
            g._topl_sticky = `${qbuf} [ynq] (q)`;
            return ECMD_OK;
        }
        qbuf = `"Then dost thou desire a major one?" (${major_cost} ${currency(major_cost)})`;
        if ((await yn_function(qbuf, 'yn', 'n')) !== 'y') {
            /* C rumors.c:733-737 returns without clear_nhwindow, so the
             * answered prompt stays physically on the topline (tty leaves
             * TOPLINE_NON_EMPTY); keep it painted via the sticky fallback. */
            g._topl_sticky = `${qbuf} [yn] (n)`;
            return ECMD_OK;
        }
        u_pay = umoney < major_cost ? umoney : major_cost;
    } else {
        /* C rumors.c:719-721: 'q'/default returns with no clear_nhwindow, so
         * the answered prompt stays on the topline (as for the major prompt). */
        g._topl_sticky = `${qbuf} [ynq] (q)`;
        return ECMD_OK;
    }
    await _money2mon(oracl, u_pay);
    if (g.disp) g.disp.botl = true;
    u.uevent = u.uevent || {};
    if (!u.uevent.major_oracle && !u.uevent.minor_oracle)
        record_achievement(ACH_ORCL);
    let add_xpts = 0;
    if (u_pay === minor_cost) {
        await outrumor(1, BY_ORACLE); /* C rumors.c:746 */
        if (!u.uevent.minor_oracle)
            add_xpts = Math.trunc(u_pay / (u.uevent.major_oracle ? 25 : 10));
        u.uevent.minor_oracle = true;
    } else {
        const cheapskate = u_pay < major_cost;
        await outoracle(cheapskate, true); /* C rumors.c:755 */
        if (!cheapskate && !u.uevent.major_oracle)
            add_xpts = Math.trunc(u_pay / (u.uevent.minor_oracle ? 25 : 10));
        u.uevent.major_oracle = true;
        exercise(A_WIS, !cheapskate);
    }
    if (add_xpts) {
        more_experienced(add_xpts, Math.trunc(u_pay / 50));
        await newexplevel();
    }
    return ECMD_TIME;
}

export async function domonnoise(mtmp) {
    const g = game;
    const ptr = mtmp?.data;
    /* sounds.c:689-693 — Deaf, and is_silent(ptr) for a non-shopkeeper. */
    if (_hero_Deaf())
        return ECMD_OK;
    if (ptr && (ptr.msound | 0) === MS_SILENT && !mtmp.isshk)
        return ECMD_OK;

    let pline_msg = null, verbl_msg = null, verbl_msg_mcan = null;
    let msound = ptr ? (ptr.msound | 0) : -1;
    /* C sounds.c:695-697 — "leader might be poly'd; if he can still speak, give
     * leader speech."
     *     if (mtmp->m_id == svq.quest_status.leader_m_id && msound > MS_ANIMAL)
     *         msound = MS_LEADER;
     * Other-role guardians use the sound of their role (sounds.c:698-699). */
    if ((mtmp.m_id | 0) === (_quest_status().leader_m_id | 0) && msound > MS_ANIMAL)
        msound = MS_LEADER;
    else if (msound === MS_GUARDIAN && ptr.pmidx !== quest_info(MS_GUARDIAN))
        msound = permonstTemplate(genus(ptr.pmidx, 1)).msound;
    else if (mtmp.isshk) msound = 39; /* MS_SELL; sounds.c:702-703 */
    /* C sounds.c:705-709 — normally grunting monsters can speak to kin.
     * Shopkeepers take the earlier MS_SELL arm, even when polymorphed. */
    else if (msound === 24 /* MS_ORC */
             && (same_race(ptr, _hero_youmonst().data)
                 || same_race(ptr, permonstTemplate(g.urace.mnum))
                 || _cmd_Hallucination()))
        msound = _MSNOISE_MS_HUMANOID;
    else if (msound === 13 /* MS_MOO */ && !mtmp.mtame)
        msound = 4; /* MS_BELLOW */
    else if (_cmd_Hallucination() && mon_is_gecko(mtmp))
        msound = 39; /* MS_SELL: C sounds.c:713-714 */
    if (!canspotmon(mtmp)) // C sounds.c:720: before a speaker can teleport away.
        map_invisible(mtmp.mx, mtmp.my);
    /* C sounds.c:722-733 — the quest speakers.  quest_chat() is the ONLY writer
     * of Qstat(got_quest) in the whole game, so without this arm the leader was
     * mute and the quest could never be granted. */
    if (msound === MS_LEADER || msound === MS_NEMESIS || msound === MS_GUARDIAN) {
        await quest_chat(mtmp);
        return ECMD_TIME;
    }
    /* C sounds.c:702-703 — shopkeepers keep their minds: msound = MS_SELL,
     * then sounds.c:733-735 shk_chat() unless hallucinating. */
    if (msound === 39 /* MS_SELL */) {
        if (!_cmd_Hallucination() || ptr.msound === MS_SILENT || (mtmp.isshk && !rn2(2)))
            await shk_chat(mtmp);
        else
            await verbalize('15 minutes could save you 15 %s.', currency(15));
        return ECMD_TIME;
    }
    if (msound === 40)
        return doconsult(mtmp);
    /* C sounds.c:725-726 — case MS_PRIEST: priest_talk(mtmp). */
    if (msound === 41 /* MS_PRIEST */) {
        await priest_talk(mtmp);
        return ECMD_TIME;
    }
    if (msound === 23 /* MS_WERE; sounds.c:823-835 */) {
        if ((g.flags?.moonphase | 0) === FULL_MOON && (night() ^ !rn2(13))) {
            await pline('%s throws back %s head and lets out a blood curdling %s!',
                        Monnam(mtmp), mhis_mon(mtmp),
                        ptr.pmidx === PM_HUMAN_WERERAT ? 'shriek' : 'howl');
            wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
        } else pline_msg = 'whispers inaudibly.  All you can make out is "moon".';
    } else if (msound === 19 /* MS_BONES; sounds.c:968-975 */) {
        await pline('%s rattles noisily.', Monnam(mtmp));
        await pline('You freeze for a moment.');
        nomul(-2);
        g.multi_reason = 'scared by rattling';
        g.nomovemsg = null;
    } else if (msound === _MSNOISE_MS_BARK) {
        const moves = g.moves | 0;
        const edog = _EDOG_local(mtmp);
        if ((g.flags?.moonphase | 0) === FULL_MOON && night()) {
            pline_msg = 'howls.';
        } else if (mtmp.mpeaceful) {
            if (mtmp.mtame
                && (mtmp.mconf || mtmp.mflee || mtmp.mtrapped
                    || moves > (edog.hungrytime | 0) || (mtmp.mtame | 0) < 5)) {
                pline_msg = 'whines.';
            } else if (mtmp.mtame && (edog.hungrytime | 0) > moves + 1000) {
                pline_msg = 'yips.';
            } else if (((mtmp.mndx ?? mtmp.mnum) | 0) !== _MSNOISE_PM_DINGO) {
                pline_msg = 'barks.'; /* dingos do not actually bark */
            }
        } else {
            pline_msg = 'growls.';
        }
    }
    else if (msound === _MSNOISE_MS_NEIGH) {
        if ((mtmp.mtame | 0) < 5)
            pline_msg = 'neighs.';
        else if ((g.moves | 0) > (_EDOG_local(mtmp).hungrytime | 0))
            pline_msg = 'whinnies.';
        else
            pline_msg = 'whickers.';
    }
    /* C sounds.c:873-879 — ravens use their distinctive Poe quotation when
     * hostile; peaceful ravens take the ordinary squawk arm.  This is the
     * chat-only sound path (domonnoise), so it consumes no RNG. */
    else if (msound === _MSNOISE_MS_SQAWK) {
        if (((mtmp.mndx ?? mtmp.mnum ?? -1) | 0) === PM_RAVEN && !mtmp.mpeaceful)
            verbl_msg = 'Nevermore!';
        else
            pline_msg = 'squawks.';
    }
    /* C sounds.c:855-878 — MS_MEW (tame cats) and MS_GROWL; an untame MS_MEW
     * falls through to MS_GROWL. */
    else if (msound === 2 /* MS_MEW */ && mtmp.mtame) {
        const _ed = _EDOG_local(mtmp);
        const _mv = g.moves | 0;
        if (mtmp.mconf || mtmp.mflee || mtmp.mtrapped || (mtmp.mtame | 0) < 5)
            pline_msg = 'yowls.';
        else if (_mv > (_ed.hungrytime | 0))
            pline_msg = 'meows.';
        else if ((_ed.hungrytime | 0) > _mv + 1000)
            pline_msg = 'purrs.';
        else
            pline_msg = 'mews.';
    }
    else if (msound === 2 /* MS_MEW, untame */ || msound === 5 /* MS_GROWL */) {
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'growls!';
    }
    /* C sounds.c:880-902 — MS_ROAR, MS_SQEEK, MS_HISS (peaceful: no sound), MS_BUZZ. */
    else if (msound === 3 /* MS_ROAR */) {
        pline_msg = mtmp.mpeaceful ? 'snarls.' : 'roars!';
    }
    else if (msound === 6 /* MS_SQEEK */) {
        pline_msg = 'squeaks.';
    }
    else if (msound === 9 /* MS_HISS */) {
        if (!mtmp.mpeaceful) pline_msg = 'hisses!';
        else return ECMD_OK; /* no sound */
    }
    else if (msound === 10 /* MS_BUZZ */) {
        pline_msg = mtmp.mpeaceful ? 'drones.' : 'buzzes angrily.';
    }
    /* C sounds.c:907-957 — MS_GRUNT, MS_MOO, MS_BELLOW, MS_CHIRP, MS_WAIL,
     * MS_GURGLE, MS_BURBLE; sounds.c:975-984 MS_IMITATE, MS_LAUGH, MS_MUMBLE. */
    else if (msound === 11 /* MS_GRUNT */) pline_msg = 'grunts.';
    else if (msound === 13 /* MS_MOO */) pline_msg = 'moos.';
    else if (msound === 4 /* MS_BELLOW */) pline_msg = 'bellows!';
    else if (msound === 8 /* MS_CHIRP */) pline_msg = 'chirps.';
    else if (msound === 14 /* MS_WAIL */) pline_msg = 'wails mournfully.';
    else if (msound === 15 /* MS_GURGLE */) pline_msg = 'gurgles.';
    /* C sounds.c:995-1004 — MS_DJINNI. */
    else if (msound === MS_DJINNI) {
        const _pm = (mtmp.mndx ?? mtmp.mnum) | 0;
        if (mtmp.mtame) verbl_msg = "Sorry, I'm all out of wishes.";
        else if (mtmp.mpeaceful) {
            if (_pm === PM_WATER_DEMON) pline_msg = 'gurgles.';
            else verbl_msg = "I'm free!";
        } else if (_pm !== PM_PRISONER) verbl_msg = 'This will teach you not to disturb me!';
        else verbl_msg = 'Get me out of here.';
    }
    else if (msound === 16 /* MS_BURBLE */) pline_msg = 'burbles.';
    /* C sounds.c:951-956 — MS_TRUMPET: the elephant's noise, wakes everything within 11 squares. */
    else if (msound === 17 /* MS_TRUMPET */) {
        pline_msg = 'trumpets!';
        wake_nearto(mtmp.mx, mtmp.my, 11 * 11);
    }
    /* C sounds.c:960-964 — MS_SHRIEK: shrieks. then aggravate(). */
    else if (msound === 18 /* MS_SHRIEK */) {
        pline_msg = 'shrieks.';
        aggravate();
    }
    else if (msound === 22 /* MS_IMITATE */) pline_msg = 'imitates you.';
    else if (msound === 20 /* MS_LAUGH */)
        pline_msg = ['giggles.', 'chuckles.', 'snickers.', 'laughs.'][rn2(4)];
    else if (msound === 21 /* MS_MUMBLE */) pline_msg = 'mumbles incomprehensibly.';
    else if (msound === _MSNOISE_MS_GROAN) {
        if (!rn2(3))
            pline_msg = 'groans.';
    }
    /* C sounds.c:987-990 — MS_ORC (no longer an alias for MS_GRUNT). */
    else if (msound === 24 /* MS_ORC */) {
        pline_msg = 'grunts.';
    }
    else if (msound === _MSNOISE_MS_SEDUCE
             ) {
        /* C sounds.c:1108-1114 — non-nymph (succubus/incubus) that could
         * seduce the hero: doseduce() and done, no pline_msg. */
        const seduce = g.sysopt?.seduce ?? true; // C sounds.c:1108 SYSOPT_SEDUCE
        if (seduce && (ptr?.mlet | 0) !== _MSNOISE_S_NYMPH
            && could_seduce_mu(mtmp, game.youmonst ?? game.u, null) === 1) {
            await doseduce_mu(mtmp);
            return ECMD_TIME;
        }
        const swval = (seduce ? poly_gender() !== ((mtmp.female | 0) ? 1 : 0)
                             : poly_gender() === 0) ? rn2(3) : 0;
        if (swval === 2)
            verbl_msg = 'Hello, sailor.';
        else if (swval === 1)
            pline_msg = 'comes on to you.';
        else
            pline_msg = 'cajoles you.';
    }
    /* C sounds.c:1141-1156 — MS_BRIBE (peaceful non-tame: demon_talk) falls
     * through into MS_CUSS (hostile: cuss; else the peaceful remarks). */
    else if (msound === 33 /* MS_BRIBE */ || msound === 34 /* MS_CUSS */) {
        if (msound === 33 && mtmp.mpeaceful && !mtmp.mtame) {
            await _sn_demon_talk(mtmp);
            return ECMD_TIME;
        }
        if (!mtmp.mpeaceful)
            await _sn_cuss(mtmp);
        else if (_sn_is_lminion(mtmp))
            verbl_msg = "It's not too late.";
        else
            verbl_msg = "We're all doomed.";
    }
    /* C sounds.c:1160-1171 — MS_NURSE. */
    else if (msound === 30 /* MS_NURSE */) {
        verbl_msg_mcan = 'I hate this job!';
        const u = g.u;
        const _uw = u.uwep;
        if (_uw && ((_uw.oclass | 0) === OCLASS_WEAPON || is_weptool(_uw)))
            verbl_msg = 'Put that weapon away before you hurt someone!';
        else if (u.uarmc || u.uarm || u.uarmh || u.uarms || u.uarmg || u.uarmf)
            verbl_msg = _Role_if_PM_HEALER()
                ? "Doc, I can't help you unless you cooperate."
                : 'Please undress so I can examine you.';
        else if (u.uarmu)
            verbl_msg = 'Take off your shirt, please.';
        else
            verbl_msg = "Relax, this won't hurt a bit.";
    }
    /* C sounds.c:1156-1159 — MS_SPELL: deliberately vague, no spell is cast. */
    else if (msound === 42 /* MS_SPELL */) {
        pline_msg = 'seems to mutter a cantrip.';
    }
    else if (msound === _MSNOISE_MS_BOAST || msound === _MSNOISE_MS_HUMANOID) {
        let fellThrough = true;
        if (msound === _MSNOISE_MS_BOAST) {
            /* C sounds.c:1006-1022: the hostile giant arm; a peaceful giant
             * FALLTHRUs into MS_HUMANOID. */
            if (!mtmp.mpeaceful) {
                fellThrough = false;
                switch (rn2(4)) {
                case 0:
                    /* C evaluates Monnam(mtmp) and mhis(mtmp) as arguments to
                     * one pline(); both can draw rn2(4) under hallucination and
                     * C's argument evaluation order is unspecified.  Source
                     * order is used here — the only way to reach it is #chat at
                     * a hallucinating hero's hostile giant. */
                    await pline(`${Monnam(mtmp)} boasts about ${mhis_mon(mtmp)} gem collection.`);
                    break;
                case 1:
                    pline_msg = 'complains about a diet of mutton.';
                    break;
                default:
                    pline_msg = 'shouts "Fee Fie Foe Foo!" and guffaws.';
                    wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
                    break;
                }
            }
        }
        if (fellThrough) {
            const mhp = mtmp.mhp | 0, mhpmax = mtmp.mhpmax | 0;
            if (!mtmp.mpeaceful) {
                /* C sounds.c:1024-1030 */
                if (In_endgame(g.u?.uz) && _msnoise_is_mplayer(ptr)) {
                    await mplayer_talk(mtmp);
                } else {
                    pline_msg = 'threatens you.';
                }
            } else if (mtmp.mflee) {
                pline_msg = 'wants nothing to do with you.';
            } else if (mhp < Math.trunc(mhpmax / 4)) {
                pline_msg = 'moans.';
            } else if (mtmp.mconf || mtmp.mstun) {
                /* C: !rn2(3) ? "Huh?" : rn2(2) ? "What?" : "Eh?" — the rn2(2)
                 * is drawn only when the rn2(3) is non-zero. */
                verbl_msg = !rn2(3) ? 'Huh?' : rn2(2) ? 'What?' : 'Eh?';
            } else if (!mtmp.mcansee) {
                verbl_msg = "I can't see!";
            } else if (mtmp.mtrapped) {
                const t = t_at(mtmp.mx, mtmp.my);
                if (t)
                    t.tseen = 1;
                verbl_msg = "I'm trapped!";
            } else if (mhp < Math.trunc(mhpmax / 2)) {
                pline_msg = 'asks for a potion of healing.';
            } else if (mtmp.mtame && !mtmp.isminion
                       && (g.moves | 0) > (_EDOG_local(mtmp).hungrytime | 0)) {
                verbl_msg = "I'm hungry.";
            } else if (_msnoise_is_elf(ptr)) {
                pline_msg = 'curses orcs.';
            } else if (_msnoise_is_dwarf(ptr)) {
                pline_msg = 'talks about mining.';
            } else if (_msnoise_likes_magic(ptr)) {
                pline_msg = 'talks about spellcraft.';
            } else if ((ptr?.mlet | 0) === _MSNOISE_S_CENTAUR) {
                pline_msg = 'discusses hunting.';
            } else if (_msnoise_is_gnome(ptr)) {
                /* C sounds.c:1058-1078 — the rn2(4) fires only when
                 * hallucinating, and only an odd result speaks the gag. */
                let gnomeplan = 0;
                if (_cmd_Hallucination() && (gnomeplan = rn2(4)) % 2) {
                    verbl_msg = (gnomeplan === 1)
                        ? 'Phase one, collect underpants.'
                        : 'Phase three, profit!';
                } else {
                    verbl_msg = 'Many enter the dungeon,'
                        + ' and few return to the sunlit lands.';
                }
            } else {
                switch ((ptr?.pmidx ?? -1) | 0) {
                case _MSNOISE_PM_HOBBIT:
                    /* C sounds.c:1082-1092 — 5.0 rewrote this test; a hobbit's
                     * mhpmax is normally under 10, so the mhpmax<=10 disjunct
                     * is the live one. */
                    pline_msg = (mhp < mhpmax
                                 && (mhpmax <= 10 || mhp <= mhpmax - 10))
                        ? 'complains about unpleasant dungeon conditions.'
                        : 'asks you about the One Ring.';
                    break;
                case _MSNOISE_PM_ARCHEOLOGIST:
                    pline_msg = 'describes a recent article in "Spelunker Today" magazine.';
                    break;
                case _MSNOISE_PM_TOURIST:
                    verbl_msg = 'Aloha.';
                    break;
                default:
                    pline_msg = 'discusses dungeon exploration.';
                    break;
                }
            }
        }
    }
    /* C sounds.c:1170-1175 — MS_GUARD (vault guard). */
    else if (msound === 28 /* MS_GUARD */) {
        verbl_msg = money_cnt(g.invent ?? null)
            ? 'Please drop that gold and follow me.'
            : 'Please follow me.';
    }
    /* C sounds.c:1179-1189 — MS_SOLDIER (army and watchmen); one rn2(3) pick. */
    else if (msound === 27 /* MS_SOLDIER */) {
        const soldier_foe_msg = ['Resistance is useless!', "You're dog meat!", 'Surrender!'];
        const soldier_pax_msg = ["What lousy pay we're getting here!",
            "The food's not fit for Orcs!",
            "My feet hurt, I've been on them all day!"];
        verbl_msg = mtmp.mpeaceful ? soldier_pax_msg[rn2(3)] : soldier_foe_msg[rn2(3)];
    }
    /* C sounds.c:1170-1175 — MS_GUARD (vault guard). */
    else if (msound === 28 /* MS_GUARD */) {
        verbl_msg = money_cnt(g.invent ?? null)
            ? 'Please drop that gold and follow me.'
            : 'Please follow me.';
    }
    /* C sounds.c:1179-1189 — MS_SOLDIER (army and watchmen); one rn2(3) pick. */
    else if (msound === 27 /* MS_SOLDIER */) {
        const soldier_foe_msg = ['Resistance is useless!', "You're dog meat!", 'Surrender!'];
        const soldier_pax_msg = ["What lousy pay we're getting here!",
            "The food's not fit for Orcs!",
            "My feet hurt, I've been on them all day!"];
        verbl_msg = mtmp.mpeaceful ? soldier_pax_msg[rn2(3)] : soldier_foe_msg[rn2(3)];
    }
    /* C sounds.c:1130-1142 — MS_ARREST (Keystone Kops, watchmen). */
    else if (msound === 26 /* MS_ARREST */) {
        if (mtmp.mpeaceful) {
            verbl_msg = `Just the facts, ${g.flags?.female ? "Ma'am" : 'Sir'}.`;
        } else {
            const arrest_msg = ['Anything you say can be used against you.',
                "You're under arrest!", 'Stop in the name of the Law!'];
            verbl_msg = arrest_msg[rn2(3)];
        }
    }
    /* C sounds.c:744-830 — MS_VAMPIRE: varied by tameness, peacefulness and
     * time of night. */
    else if (msound === 32 /* MS_VAMPIRE */) {
        const u = g.u, isnight = night();
        const kindred = Upolyd(u)
            && (u.umonnum === PM_VAMPIRE || u.umonnum === PM_VAMPIRE_LORD);
        const nightchild = Upolyd(u)
            && (u.umonnum === PM_WOLF || u.umonnum === PM_WINTER_WOLF
                || u.umonnum === PM_WINTER_WOLF_CUB);
        /* role.c races[]: only humans carry individual m/f nouns. */
        const racenoun_base = g.urace?.noun
            ?? (typeof g.urace?.name === 'string' ? g.urace.name : g.urace?.name?.m) ?? 'human';
        const racenoun = racenoun_base === 'human'
            ? (g.flags?.female ? 'woman' : 'man') : racenoun_base;
        if (mtmp.mtame) {
            verbl_msg = kindred
                ? `Good ${isnight ? 'evening' : 'day'} to you Master${isnight ? '!' : '.  Why do we not rest?'}`
                : (nightchild ? 'Child of the night, ' : '')
                    + (midnight() ? 'I can stand this craving no longer!'
                       : isnight ? 'I beg you, help me satisfy this growing craving!'
                       : 'I find myself growing a little weary.');
        } else if (mtmp.mpeaceful) {
            if (kindred && isnight)
                verbl_msg = `Good feeding ${g.flags?.female ? 'sister' : 'brother'}!`;
            else if (nightchild && isnight)
                verbl_msg = 'How nice to hear you, child of the night!';
            else
                verbl_msg = 'I only drink... potions.';
        } else if (kindred) {
            verbl_msg = 'This is my hunting ground that you dare to prowl!';
        } else if (g.youmonst?.data?.pmidx === PM_SILVER_DRAGON
                   || g.youmonst?.data?.pmidx === PM_BABY_SILVER_DRAGON) {
            verbl_msg = `${g.youmonst.data.pmidx === PM_SILVER_DRAGON ? 'Fool' : 'Young Fool'}!  Your silver sheen does not frighten me!`;
        } else {
            const vampindex = rn2(2);
            if (vampindex === 0)
                verbl_msg = `I vant to suck your ${body_part(BLOOD)}!`;
            else
                verbl_msg = `I vill come after ${Upolyd(u)
                    ? an(monPmname(u.umonnum | 0, g.flags?.female ? 1 : 0))
                    : an(racenoun)} without regret!`;
        }
    }
    /* C sounds.c:1193-1223: Rider speech, including the first novel notice. */
    else if (msound === 35 /* MS_RIDER */) {
        const death = (ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum) === PM_DEATH;
        const tribute = g.context.tribute || (g.context.tribute = {});
        const book = death && !tribute.Deathnotice ? u_have_novel() : null;
        const quote = { value: '' };
        if (book) {
            const idx = { value: book.corpsenm | 0 };
            const title = noveltitle(idx);
            book.corpsenm = idx.value;
            if (title) {
                verbl_msg = `Ah, so you have a copy of /${title}/.`;
                if (!['snuff', 'the wee free men'].includes(title.toLowerCase()))
                    verbl_msg += '  I may have been misquoted there.';
            }
            tribute.Deathnotice = 1;
        } else if (death && rn2(3)
                   && await read_tribute('Death', 'Death Quotes', 0, quote, 1)) {
            verbl_msg = quote.value;
        } else if (death && !rn2(10)) {
            pline_msg = 'is busy reading a copy of Sandman #8.';
        } else {
            verbl_msg = 'Who do you think you are, War?';
        }
    }

    /* sounds.c:1232-1236 tail —
     *     if (pline_msg) pline("%s %s", Monnam(mtmp), pline_msg);
     *     else if (verbl_msg) { SetVoice(...); verbalize1(verbl_msg); } */
    if (pline_msg)
        await pline(`${Monnam(mtmp)} ${pline_msg}`);
    else if (mtmp.mcan && verbl_msg_mcan)
        await verbalize('%s', verbl_msg_mcan);
    else if (verbl_msg) {
        if ((ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum) === PM_DEATH)
            await pline(verbl_msg.toUpperCase());
        else
            await verbalize('%s', verbl_msg);
    }
    return ECMD_TIME;
}

const COIN_CLASS = 12; /* objclass.h */

/* C shk.c:5407 price_quote() and :5469 shk_embellish(). */
async function price_quote(first) {
    const g = game;
    /* C shk.c:5416 shkp = shop_keeper(inside_shop(u.ux, u.uy)). */
    const shkp = shk_shop_keeper(inside_shop(g.u.ux | 0, g.u.uy | 0));
    if (!shkp || !shk_inhishop(shkp)) return;
    const rows = [];
    let lastCost = 0, lastContents = false;
    for (let o = first; o; o = o.nexthere) {
        if ((o.oclass | 0) === COIN_CLASS) continue;
        let cost = (o.no_charge || o === game.u?.uball || o === game.u?.uchain)
            ? 0 : shk_get_cost(o, shkp);
        let contents = !cost;
        if (Has_contents(o)) cost += shk_contained_cost(o, shkp, 0, false, false);
        if (o.globby) cost *= shk_get_pricing_units(o);
        if (!cost) contents = false; /* C shk.c:5437: "no charge" resets contentsonly */
        lastCost = cost; lastContents = contents;
        const price = cost ? `${cost} ${shk_currency(cost)}${(o.quan | 0) > 1 ? ' each' : ''}` : 'no charge';
        rows.push(`${contents ? 'the contents of ' : ''}${(await doname(o))}, ${price}`);
    }
    if (rows.length > 1) {
        const win = create_nhwindow(NHW_MENU);
        putstr(win, 0, 'Fine goods for sale:'); putstr(win, 0, '');
        for (const row of rows) putstr(win, 0, row);
        await display_nhwindow(win, true); destroy_nhwindow(win);
        return;
    }
    if (rows.length === 1) {
        const o = first;
        if (!lastCost) {
            /* C shk.c:5449-5453: "<doname(obj)>, no charge" */
            SetVoice(shkp, 0, 80, 0);
            await verbalize('%s!', upstart(rows[0]));
        } else {
            /* C shk.c:5456: doname's tin_variety draw precedes the quote RNG. */
            const base = `${lastContents ? 'the contents of ' : ''}${(await doname(o))}`;
            /* C arg order (observed): currency(cost) is drawn before shk_embellish */
            const cur = shk_currency(lastCost);
            const embellish = lastContents ? '.' : shk_embellish(o, lastCost);
            /* C shk.c:5458 SetVoice(shkp, 0, 80, 0) */
            SetVoice(shkp, 0, 80, 0);
            await verbalize('%s, price %ld %s%s%s', upstart(base), lastCost, cur,
                (o.quan | 0) > 1 ? ' each' : '', embellish);
        }
    }
}

/* C shk.c:5469 shk_embellish(itm, cost) — draws rn2(3), then rn2(5) on the hit arm. */
function shk_embellish(itm, cost) {
    if (!rn2(3)) {
        let choice = rn2(5);
        if (choice === 0)
            choice = cost < 100 ? 1 : cost < 500 ? 2 : 3;
        switch (choice) {
        case 4: {
            if (cost < 10)
                break;
            const o = itm.oclass | 0;
            if (o === 7 /* FOOD_CLASS */)
                return ", gourmets' delight!";
            if (game._oc_name_known?.[itm.otyp | 0]
                ? MKOBJ_OC_MAGIC[itm.otyp | 0]
                : (o === 5 /* AMULET */ || o === 4 /* RING */ || o === 11 /* WAND */
                   || o === 8 /* POTION */ || o === 9 /* SCROLL */ || o === 10 /* SPBOOK */))
                return ", painstakingly developed!";
            return ", superb craftsmanship!";
        }
        case 3: return ', finest quality.';
        case 2: return ', an excellent choice.';
        case 1: return ', a real bargain.';
        default: break;
        }
    } else if (itm.oartifact) {
        return ', one of a kind!';
    }
    return '.';
}


/* C sounds.c:351-394: use cmd.js's shared growl_sound(mtmp) verb table. */
/* C sounds.c:397-423: growl is void; peacefuls_respond reads last_msg
 * afterwards (mon.c:4243), which wake_nearto's messages can also change. */
export function growl(mtmp) {
    const data = mtmp.data || permonstTemplate((mtmp.mndx ?? mtmp.mnum ?? -1) | 0);
    if (!data) return;
    /* C mondata.h helpless(mon) — msleeping || !mcanmove.  wakeup() clears
     * msleeping BEFORE calling growl, so this normally passes. */
    if ((mtmp.msleeping | 0) || !(mtmp.mcanmove | 0) || (data.msound | 0) === MS_SILENT)
        return;
    /* C sounds.c:410-413 — `if (Hallucination) growl_verb = ROLL_FROM(h_sounds);
     * else growl_verb = growl_sound(mtmp);`.  The hallucination arm was missing,
     * and it is an rn2(35) on the CORE stream, not just a different word. */
    const growl_verb = xm_Hallucination()
        ? H_SOUNDS_MM[rn2(H_SOUNDS_MM.length)]
        : growl_sound(mtmp);
    if (growl_verb) {
        /* C sounds.c:415 — if (canseemon(mtmp) || !Deaf) */
        if (canseemon(mtmp) || !Deaf()) {
            pline(Monnam_mm(mtmp) + ' ' + vtense(null, growl_verb) + '!');
            (game.iflags ||= {}).last_msg = PLNMSG_GROWL; // C sounds.c:416
            /* C sounds.c:418-419 — a growl interrupts a run/rush. */
            if (game.context?.run)
                nomul(0);
        }
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, (data.mlevel | 0) * 18);
    }
}

const H_SOUNDS_MM = [
    'beep',   'boing',   'sing',   'belche', 'creak',   'cough',
    'rattle', 'ululate', 'pop',    'jingle', 'sniffle', 'tinkle',
    'eep',    'clatter', 'hum',    'sizzle', 'twitter', 'wheeze',
    'rustle', 'honk',    'lisp',   'yodel',  'coo',     'burp',
    'moo',    'boom',    'murmur', 'oink',   'quack',   'rumble',
    'twang',  'toot',    'gargle', 'hoot',   'warble',
];


export function yelp(mtmp) {
    const data = mtmp.data || permonstTemplate((mtmp.mndx ?? mtmp.mnum ?? -1) | 0);
    if (!data) return;
    const msound = data.msound | 0;
    /* C mondata.h helpless(mon) = msleeping || !mcanmove. */
    if ((mtmp.msleeping | 0) || !(mtmp.mcanmove | 0) || !msound)
        return;
    let yelp_verb = null;
    let se = se_yelp;
    if (xm_Hallucination()) {
        yelp_verb = H_SOUNDS_MM[rn2(H_SOUNDS_MM.length)];
    } else {
        /* C sounds.c:440-470 — each arm picks a Deaf verb when the hero is
         * Deaf (the pet's sound is not heard, so the verb is a visible guess). */
        const deaf = Deaf();
        switch (msound) {
        case MS_MEW:   se = se_feline_yelp; yelp_verb = !deaf ? 'yowl' : 'arch'; break;
        case MS_BARK:
        case MS_GROWL: se = se_canine_yelp; yelp_verb = !deaf ? 'yelp' : 'recoil'; break;
        case MS_ROAR:  yelp_verb = !deaf ? 'snarl' : 'bluff'; break;
        case MS_SQEEK: se = se_squeal; yelp_verb = !deaf ? 'squeal' : 'quiver'; break;
        case MS_SQAWK: se = se_avian_screak; yelp_verb = !deaf ? 'screak' : 'thrash'; break;
        case MS_WAIL:  se = se_wail; yelp_verb = !deaf ? 'wail' : 'cringe'; break;
        default: break;
        }
    }
    if (yelp_verb) {
        Soundeffect(se, 70);
        pline(Monnam_mm(mtmp) + ' ' + vtense(null, yelp_verb) + '!');
        if (game.context?.run)
            nomul(0);
        wake_nearto(mtmp.mx | 0, mtmp.my | 0, (data.mlevel | 0) * 12);
    }
}
