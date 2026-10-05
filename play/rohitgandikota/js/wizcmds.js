// wizcmds.js — the wizard-mode extended commands.
// C ref: src/wizcmds.c
//
// These matter to a port more than their name suggests. A session recorded with
// OPTIONS=playmode:debug (seed0360, seed0399, seed0108, seed2600 and others) can
// issue any of them, and each one that prompts spends keys. A '#' command whose
// body is skipped leaves its prompt's keystrokes to be read as commands.

import { POLY_CONTROLLED } from './const.js';
import { polyself } from './polyself.js';
import { game } from './gstate.js';
import { u_at, COULD_SEE, IN_SIGHT, TEMP_LIT, WM_MASK, IS_WALL, IS_ROOM, IS_DOOR, SDOOR, CORR, Never_mind, NEUTRAL, MIGR_EXACT_XY, MGIVENNAME, plur, Is_stronghold, Is_botlevel, ARM } from './const.js';
import { tty_yn_function } from './tty/topl.js';
import { flip_level, flip_level_rnd } from './sp_lev.js';
import { olfaction, mstrength } from './mondata.js';
import { usmellmon } from './mon.js';
import { glyph_at, map_invisible } from './display.js';
import { body_part } from './polyself.js';
import { minimal_monnam } from './do_name.js';
import { strsubst } from './hacklib.js';
import { get_level, depth } from './dungeon.js';
import { tty_putstr, tty_display_nhwindow, tty_next_page } from './tty/wintty.js';
import { xwaitforspace } from './tty/getline.js';
import { may_dig, notice_all_mons_flush } from './hack.js';
import { Is_special, Invocation_lev, On_W_tower_level, In_sokoban } from './dungeon.js';
import { NHW_TEXT, STONE, COLNO, ROWNO, In_endgame, Is_knox_level } from './const.js';
import { defsyms, cmap_names } from './drawing_data.js';
import { levltyp } from './cmd.js';
import { unavailcmd, ecname_from_fn } from './cmd.js';
import { makewish } from './zap.js';
import { encumber_msg } from './attrib.js';
import { ECMD_OK, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE, PICK_ANY,
         TIMEOUT, ARTICLE_THE, ARTICLE_A, ARTICLE_YOUR, XKILL_NOMSG,
         ECMD_CANCEL, UTOTYPE_NONE, SICK_VOMITABLE, SICK_NONVOMITABLE, PICK_NONE, PRIMARYSET,
         SUPPRESS_IT, SUPPRESS_HALLUCINATION, SUPPRESS_SADDLE,
         has_mgivenname }
    from './const.js';
import { rn2 } from './rng.js';
import { getdir, getlin, cmd_from_func } from './cmd.js';
import { display_pickinv } from './invent.js';
import { docrt, map_trap, pline, unmap_invisible, canspotmon, map_engraving }
    from './display.js';
import { pluslvl, losexp } from './exper.js';
import { level_tele } from './teleport.js';
import { do_mapping } from './detect.js';
import { NO_COLOR } from './terminal.js';
import {
    ATR_NONE, NHW_MENU, tty_add_menu, tty_add_menu_str,
    tty_create_nhwindow, tty_destroy_nhwindow, tty_end_menu,
    tty_select_menu, tty_start_menu,
} from './tty/wintty.js';
import { boolean_option } from './options.js';
import { getpos } from './getpos.js';
import { m_at, xkilled } from './mon.js';
import { DEADMONSTER } from './monst.js';
import { nonliving } from './mondata.js';
import { x_monnam } from './do_name.js';
import { You, impossible } from './pline.js';
import { monsndx, rndmonst, makemon } from './makemon.js';
import { G_UNIQ, G_EXTINCT, MON_OFFMAP, MON_MIGRATING, MON_LIMBO,
         MON_ENDGAME_MIGR, ESHK, EPRI, EGD, MAX_GLYPH, NUM_ZAP,
         EMIN, EDOG, EBONES, has_edog, has_oname, ONAME, MM_NOMSG, MIGR_RANDOM,
         has_omonst, OMONST,
         SIZEOF_STRUCT_OBJ, SIZEOF_STRUCT_OEXTRA, SIZEOF_STRUCT_MONST,
         SIZEOF_STRUCT_MEXTRA, SIZEOF_STRUCT_EGD, SIZEOF_STRUCT_EPRI,
         SIZEOF_STRUCT_ESHK, SIZEOF_STRUCT_EMIN, SIZEOF_STRUCT_EDOG,
         SIZEOF_STRUCT_EBONES, SIZEOF_STRUCT_CEMETERY, SIZEOF_STRUCT_TRAP,
         SIZEOF_STRUCT_DAMAGE, SIZEOF_STRUCT_KINFO } from './const.js';
import { size_wseg } from './worm.js';
import { engr_stats } from './engrave.js';
import { light_stats } from './light.js';
import { timer_stats } from './timeout.js';
import { region_stats } from './region.js';
import { overview_stats } from './dungeon.js';
import { on_level, In_W_tower, ledger_no } from './dungeon.js';
import { OBJ_NAME } from './objnam.js';
import { ONAMES } from './objects_data.js';
import { MAXOCLASSES } from './symbols.js';
import { gs_symset, gc_currentgraphics, known_handling, showsyms_at } from './symbols.js';
import { add_menu_heading } from './options.js';
import { glyphmap } from './display.js';
import { setpaid } from './shk.js';
import { mongone, dmonsfree } from './mon.js';
import { keepdogs, migrate_to_level } from './dog.js';
import { makemap_prepost } from './cmd.js';
import { NUMMONS } from './monst_data.js';
import { NUM_OBJECTS } from './objects_data.js';
import { notice_mon_off, notice_mon_on } from './hack.js';

function note_unported_wizcmds(what) {
    (game.unported ||= new Set()).add(what);
}

// src/wizcmds.c:446 wiz_level_change() — the #levelchange command.
//
// The parse is sscanf("%d%c"), which accepts a number with nothing after it;
// anything else, including an empty line or ESC, falls to "Never mind."
// src/wizcmds.c:32 wiz_wish() — unlimited wishes for debug mode.
export async function wiz_wish() {
    if (game.wizard) {
        const save_verbose = game.flags.verbose;
        game.flags.verbose = false;
        await makewish();
        game.flags.verbose = save_verbose;
        await encumber_msg();
    } else {
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizwish')));
    }
    return ECMD_OK;
}

// src/wizcmds.c:50 wiz_identify(). Revealing the menu doesn't identify items.
export async function wiz_identify() {
    if (game.wizard) {
        let key = cmd_from_func('wizidentify');
        if (!key || key === '\0')
            key = '\t';
        (game.iflags ||= {}).override_ID = key;
        try {
            await display_pickinv(null, null, null, false);
        } finally {
            game.iflags.override_ID = 0;
        }
    } else {
        await pline("Unavailable command '#wizidentify'.");
    }
    return ECMD_OK;
}

// src/wizcmds.c:73 makemap_unmakemon() — used when wiz_makemap() gets rid
// of monsters for the old incarnation of a level before creating a new
// incarnation of it
async function makemap_unmakemon(mtmp, migratory) {
    const ndx = monsndx(mtmp.data);

    /* uncreate any unique monster so that it is eligible to be remade
       on the new incarnation of the level; ignores DEADMONSTER() [why?] */
    if (mtmp.data.geno & G_UNIQ)
        game.mvitals[ndx].mvflags &= ~G_EXTINCT;
    if (game.mvitals[ndx].born)
        game.mvitals[ndx].born--;

    /* vault is going away; get rid of guard who might be in play or
       be parked at <0,0>; for the latter, might already be flagged as
       dead but is being kept around because of the 'isgd' flag */
    if (mtmp.isgd) {
        mtmp.isgd = 0; /* after this, fall through to mongone() */
    } else if (DEADMONSTER(mtmp)) {
        return; /* already set to be discarded */
    } else if (mtmp.isshk && on_level(game.u.uz, ESHK(mtmp).shoplevel)) {
        setpaid(mtmp);
    }
    if (migratory) {
        /* caller has removed 'mtmp' from migrating_mons; put it onto fmon
           so that dmonsfree() bookkeeping for number of dead or removed
           monsters won't get out of sync; it is not on the map but
           mongone() -> m_detach() -> mon_leaving_level() copes with that */
        mtmp.mstate = (mtmp.mstate | 0) | MON_OFFMAP;
        mtmp.mstate &= ~(MON_MIGRATING | MON_LIMBO | MON_ENDGAME_MIGR);
        (game.level.monsters ||= []).unshift(mtmp);
    }
    await mongone(mtmp);
}

// src/wizcmds.c:110 makemap_remove_mons() — get rid of the all the
// monsters on--or intimately involved with--current level; used when
// #wizmakemap destroys the level before replacing it
export async function makemap_remove_mons() {
    /* keep steed and other adjacent pets after releasing them
       from traps, stopping eating, &c as if hero were ascending */
    await keepdogs(true); /* (pets-only; normally we'd be using 'FALSE') */
    /* get rid of all the monsters that didn't make it to 'mydogs' */
    for (const mtmp of [...(game.level.monsters || [])]) {
        /* if already dead, dmonsfree(below) will get rid of it */
        if (DEADMONSTER(mtmp))
            continue;
        await makemap_unmakemon(mtmp, false);
    }
    /* some monsters retain details of this level in mon->mextra; that
       data becomes invalid when the level is replaced by a new one;
       get rid of them now if migrating or already arrived elsewhere;
       [when on their 'home' level, the previous loop got rid of them;
       if they aren't actually migrating but have been placed on some
       'away' level, such monsters are treated like the Wizard:  kept
       on migrating monsters list, scheduled to migrate back to their
       present location instead of being saved with whatever level they
       happen to be on; see keepdogs() and keep_mon_accessible(dog.c)] */
    const migrating = (game.migrating_mons ||= []);
    for (let i = 0; i < migrating.length; ) {
        const mtmp = migrating[i];
        if (mtmp.mextra
            && ((mtmp.isshk && on_level(game.u.uz, ESHK(mtmp).shoplevel))
                || (mtmp.ispriest && on_level(game.u.uz, EPRI(mtmp).shrlevel))
                || (mtmp.isgd && on_level(game.u.uz, EGD(mtmp).gdlevel)))) {
            migrating.splice(i, 1);
            await makemap_unmakemon(mtmp, true);
        } else {
            ++i;
        }
    }
    /* release dead and 'unmade' monsters */
    dmonsfree();
    if ((game.level.monsters || []).length) {
        await impossible("makemap_remove_mons: 'fmon' did not get emptied?");
    }
    return;
}

// src/wizcmds.c:156 wiz_makemap() — #wizmakemap: discard current dungeon
// level and replace with a new one
export async function wiz_makemap() {
    if (game.wizard) {
        const was_in_W_tower = In_W_tower(game.u.ux, game.u.uy, game.u.uz);

        await makemap_prepost(true, was_in_W_tower);
        /* create a new level; various things like bestowing a guardian
           angel on Astral or setting off alarm on Ft.Ludios are handled
           by goto_level(do.c) so won't occur for replacement levels */
        const { mklev } = await import('./mklev.js');
        await mklev();
        await makemap_prepost(false, was_in_W_tower);
    } else {
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizmakemap')));
    }
    return ECMD_OK;
}

// src/wizcmds.c:243 wiz_kill() targets and slays monsters without spending a
// turn. The ordinary hero-credited path is the one exposed by #wizkill.
export async function wiz_kill() {
    if (!game.wizard) {
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizkill')));
        return ECMD_OK;
    }

    const cc = { x: game.u.ux, y: game.u.uy };
    let prompt = 'Pick first monster to slay';
    for (;;) {
        await pline(`${prompt}:`);
        prompt = 'Next monster';

        const saveVerbose = game.flags.verbose;
        const saveAutodescribe = game.iflags?.autodescribe;
        game.flags.verbose = false;
        (game.iflags ||= {}).autodescribe = true;
        const ans = await getpos(cc, true, 'a monster');
        game.flags.verbose = saveVerbose;
        game.iflags.autodescribe = saveAutodescribe;
        if (ans < 0 || cc.x < 1)
            break;

        const mtmp = m_at(cc.x, cc.y);
        unmap_invisible(cc.x, cc.y);
        if (!mtmp) {
            await pline('There is no monster there.');
            break;
        }

        const tame = !!mtmp.mtame;
        const seen = canspotmon(mtmp);
        const article = tame ? ARTICLE_YOUR : seen ? ARTICLE_THE : ARTICLE_A;
        const adjective = tame ? (seen ? 'poor' : 'poor, unseen')
                               : seen ? null : 'unseen';
        const suppress = SUPPRESS_IT | SUPPRESS_HALLUCINATION
            | (tame && has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0);
        const name = x_monnam(mtmp, article, adjective, suppress, false);
        await You(`${nonliving(mtmp.data) ? 'destroy' : 'kill'} ${name}!`);
        await xkilled(mtmp, XKILL_NOMSG);
    }
    return ECMD_OK;
}

// src/wizcmds.c:487 wiz_telekinesis(). Select a visible monster and hurtle
// it six squares in a chosen direction. The command repeats until cancelled.
export async function wiz_telekinesis() {
    if (!game.wizard) {
        await pline('Unavailable command.');
        return ECMD_OK;
    }

    const cc = { x: game.u.ux, y: game.u.uy };
    await pline('Pick a monster to hurtle.');
    do {
        const ans = await getpos(cc, true, 'a monster');
        if (ans < 0 || cc.x < 1)
            return ECMD_CANCEL;

        const mtmp = m_at(cc.x, cc.y);
        if (mtmp && canspotmon(mtmp)) {
            if (!await getdir('which direction?'))
                return ECMD_CANCEL;
            const { mhurtle } = await import('./uhitm.js');
            await mhurtle(mtmp, game.u.dx, game.u.dy, 6);
            if (!DEADMONSTER(mtmp) && canspotmon(mtmp)) {
                cc.x = mtmp.mx;
                cc.y = mtmp.my;
            }
        }
    } while ((game.u.utotype || 0) === UTOTYPE_NONE);
    return ECMD_OK;
}

// src/wizcmds.c:176 wiz_map(): reveal the level, traps, and engravings.
export async function wiz_map() {
    if (!game.wizard) {
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizmap')));
        return ECMD_OK;
    }

    const u = game.u;
    const intrinsic = (u.intrinsic ||= {});
    const uprops = (u.uprops ||= {});
    const saved = {
        hconf: intrinsic.HConfusion,
        hhallu: intrinsic.HHallucination,
        conf: uprops.CONFUSION,
        hallu: uprops.HALLUC,
    };
    notice_mon_off();
    delete intrinsic.HConfusion;
    delete intrinsic.HHallucination;
    delete uprops.CONFUSION;
    delete uprops.HALLUC;

    for (const trap of game.level?.traps || []) {
        trap.tseen = 1;
        map_trap(trap, true);
    }
    for (const ep of game.level?.lev_engr || [])
        map_engraving(ep, true);
    await do_mapping();
    notice_mon_on();

    if (saved.hconf !== undefined) intrinsic.HConfusion = saved.hconf;
    if (saved.hhallu !== undefined) intrinsic.HHallucination = saved.hhallu;
    if (saved.conf !== undefined) uprops.CONFUSION = saved.conf;
    if (saved.hallu !== undefined) uprops.HALLUC = saved.hallu;
    return ECMD_OK;
}

export async function wiz_level_change() {
    let newlevel = 0;
    let ret;

    const buf = mungspaces(
        await getlin('To what experience level do you want to be set?'));

    if (buf[0] === '\x1b' || buf === '') {
        ret = 0;
    } else {
        /* sscanf("%d%c", &newlevel, &dummy) returns 1 only when a number was
           read and NOTHING followed it; trailing junk gives 2. */
        const m = /^\s*([-+]?\d+)(.?)/.exec(buf);
        if (!m) {
            ret = 0;
        } else {
            newlevel = parseInt(m[1], 10);
            ret = m[2] === '' ? 1 : 2;
        }
    }

    if (ret !== 1) {
        await pline('Never mind.');   /* pline1(Never_mind) */
        return ECMD_OK;
    }

    if (newlevel === game.u.ulevel) {
        await pline('You are already that experienced.');
    } else if (newlevel < game.u.ulevel) {
        if (game.u.ulevel === 1) {
            await pline('You are already as inexperienced as you can get.');
            return ECMD_OK;
        }
        newlevel = Math.max(newlevel, 1);
        while (game.u.ulevel > newlevel)
            await losexp('#levelchange');
    } else {
        if (game.u.ulevel >= MAXULEV) {
            await pline('You are already as experienced as you can get.');
            return ECMD_OK;
        }
        newlevel = Math.min(newlevel, MAXULEV);
        while (game.u.ulevel < newlevel)
            await pluslvl(false);
    }

    /* blessed full healing or restore ability won't fix any lost levels */
    game.u.ulevelmax = game.u.ulevel;
    return ECMD_OK;
}

// src/timeout.c propertynames[], in its menu order. HALLUC_RES is omitted by
// wiz_intrinsic(), and the null entry is the separator before timed-only
// properties.
const WIZ_INTRINSICS = [
    ['INVULNERABLE', 'invulnerable'],
    ['STONED', 'petrifying'],
    ['SLIMED', 'becoming slime'],
    ['STRANGLED', 'strangling'],
    ['SICK', 'fatally sick'],
    ['STUNNED', 'stunned'],
    ['CONFUSION', 'confused'],
    ['HALLUC', 'hallucinating'],
    ['BLINDED', 'blinded'],
    ['DEAF', 'deafness'],
    ['VOMITING', 'vomiting'],
    ['GLIB', 'slippery fingers'],
    ['WOUNDED_LEGS', 'wounded legs'],
    ['SLEEPY', 'sleepy'],
    ['TELEPORT', 'teleporting'],
    ['POLYMORPH', 'polymorphing'],
    ['LEVITATION', 'levitating'],
    ['FAST', 'very fast'],
    ['CLAIRVOYANT', 'clairvoyant'],
    ['DETECT_MONSTERS', 'monster detection'],
    ['SEE_INVIS', 'see invisible'],
    ['INVIS', 'invisible'],
    ['ACID_RES', 'acid resistance'],
    ['STONE_RES', 'stoning resistance'],
    ['DISPLACED', 'displaced'],
    ['PASSES_WALLS', 'pass thru walls'],
    ['MAGICAL_BREATHING', 'magical breathing'],
    ['WWALKING', 'water walking'],
    null,
    ['FIRE_RES', 'fire resistance'],
    ['COLD_RES', 'cold resistance'],
    ['SLEEP_RES', 'sleep resistance'],
    ['DISINT_RES', 'disintegration resistance'],
    ['SHOCK_RES', 'shock resistance'],
    ['POISON_RES', 'poison resistance'],
    ['DRAIN_RES', 'drain resistance'],
    ['SICK_RES', 'sickness resistance'],
    ['ANTIMAGIC', 'magic resistance'],
    ['BLND_RES', 'light-induced blindness resistance'],
    ['FUMBLING', 'fumbling'],
    ['HUNGER', 'voracious hunger'],
    ['TELEPAT', 'telepathic'],
    ['WARNING', 'warning'],
    ['WARN_OF_MON', 'warn: monster type or class'],
    ['WARN_UNDEAD', 'warn: undead'],
    ['SEARCHING', 'searching'],
    ['INFRAVISION', 'infravision'],
    ['ADORNED', 'adorned (+/- Cha)'],
    ['STEALTH', 'stealthy'],
    ['AGGRAVATE_MONSTER', 'monster aggravation'],
    ['CONFLICT', 'conflict'],
    ['JUMPING', 'jumping'],
    ['TELEPORT_CONTROL', 'teleport control'],
    ['FLYING', 'flying'],
    ['SWIMMING', 'swimming'],
    ['SLOW_DIGESTION', 'slow digestion'],
    ['HALF_SPDAM', 'half spell damage'],
    ['HALF_PHDAM', 'half physical damage'],
    ['REGENERATION', 'HP regeneration'],
    ['ENERGY_REGENERATION', 'energy regeneration'],
    ['PROTECTION', 'extra protection'],
    ['PROT_FROM_SHAPE_CHANGERS', 'protection from shape changers'],
    ['POLYMORPH_CONTROL', 'polymorph control'],
    ['UNCHANGING', 'unchanging'],
    ['REFLECTING', 'reflecting'],
    ['FREE_ACTION', 'free action'],
    ['FIXED_ABIL', 'fixed abilities'],
    ['LIFESAVED', 'life will be saved'],
];

function wiz_intrinsic_timeout(key) {
    if (key === 'ACID_RES' || key === 'STONE_RES')
        return (game.u.intrinsic?.[key === 'ACID_RES'
            ? 'HAcid_resistance' : 'HStone_resistance'] || 0) & TIMEOUT;
    if (key === 'SICK' || key === 'STONED' || key === 'SLIMED' || key === 'VOMITING')
        return (game.u.uprops?.[key] || 0) & TIMEOUT;
    if (key === 'UNCHANGING')
        return (game.u.intrinsic?.HUnchanging || 0) & TIMEOUT;
    if (key === 'STRANGLED')
        return (game.u.intrinsic?.HStrangled || 0) & TIMEOUT;
    if (key === 'CONFUSION')
        return game.u.intrinsic?.HConfusion | 0;
    if (key === 'HALLUC')
        return (game.u.intrinsic?.HHallucination | 0) & TIMEOUT;
    if (key === 'BLINDED')
        return (game.u.intrinsic?.HBlinded | 0) & TIMEOUT;
    if (key === 'DEAF')
        return (game.u.intrinsic?.HDeaf | 0) & TIMEOUT;
    if (key === 'GLIB')
        return (game.u.intrinsic?.HGlib | 0) & TIMEOUT;
    if (key === 'SEE_INVIS')
        return (game.u.intrinsic?.HSee_invisible | 0) & TIMEOUT;
    if (key === 'FAST')
        return (game.u.intrinsic?.HFast | 0) & TIMEOUT;
    if (key === 'STUNNED')
        return (game.u.intrinsic?.HStun | 0) & TIMEOUT;
    if (key === 'FUMBLING')
        return (game.u.intrinsic?.HFumbling | 0) & TIMEOUT;
    if (key === 'DETECT_MONSTERS')
        return (game.u.intrinsic?.HDetect_monsters | 0) & TIMEOUT;
    return Number(game.u.wiz_intrinsic_timeouts?.[key]) || 0;
}

// src/wizcmds.c:949 wiz_intrinsic(). The menu and ordinary timeout updates
// are shared by every property. Hallucination has its source feedback and
// redraw because it changes every warning glyph immediately.
export async function wiz_intrinsic() {
    if (!game.wizard) {
        await pline('Unavailable command.');
        return ECMD_OK;
    }

    const win = tty_create_nhwindow(NHW_MENU);
    tty_start_menu(win, MENU_BEHAVE_STANDARD);
    if (boolean_option('cmdassist')) {
        tty_add_menu_str(win,
            '[Precede any selection with a count to increment by other than 30.]');
    }
    for (const prop of WIZ_INTRINSICS) {
        if (!prop) {
            tty_add_menu_str(win, '--');
            continue;
        }
        const [key, name] = prop;
        const oldtimeout = wiz_intrinsic_timeout(key);
        const text = oldtimeout ? `${name.padEnd(27)} [${oldtimeout}]` : name;
        tty_add_menu(win, null, key, 0, 0, ATR_NONE, NO_COLOR, text,
                     MENU_ITEMFLAGS_NONE);
    }
    tty_end_menu(win, 'Which intrinsics?');
    const picks = await tty_select_menu(win, PICK_ANY);
    tty_destroy_nhwindow(win);

    for (const key of picks) {
        const prop = WIZ_INTRINSICS.find(p => p?.[0] === key);
        if (!prop)
            continue;
        const name = prop[1];
        const oldtimeout = wiz_intrinsic_timeout(key);
        const picked_count = picks.counts?.get(key) ?? -1;
        const amount = picked_count === -1 ? 30 : picked_count;
        if (amount <= 0)
            continue;

        if (key === 'ACID_RES' || key === 'STONE_RES') {
            const { incr_itimeout } = await import('./potion.js');
            incr_itimeout(key === 'ACID_RES'
                ? 'HAcid_resistance' : 'HStone_resistance', amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'CONFUSION') {
            const { make_confused } = await import('./potion.js');
            await make_confused(Math.min(TIMEOUT, oldtimeout + amount), false);
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'BLINDED') {
            const { make_blinded } = await import('./potion.js');
            await make_blinded(oldtimeout + amount, true);
        } else if (key === 'DEAF') {
            const { make_deaf } = await import('./potion.js');
            await make_deaf(oldtimeout + amount, true);
        } else if (key === 'HALLUC') {
            const { make_hallucinated } = await import('./potion.js');
            await make_hallucinated(oldtimeout + amount, true);
        } else if (key === 'STUNNED') {
            const { make_stunned } = await import('./potion.js');
            await make_stunned(oldtimeout + amount, true);
        } else if (key === 'SICK') {
            const { make_sick } = await import('./potion.js');
            const type = !rn2(2) ? SICK_VOMITABLE : SICK_NONVOMITABLE;
            await make_sick(oldtimeout || amount, '#wizintrinsic', true, type);
        } else if (key === 'SLIMED') {
            const { make_slimed } = await import('./potion.js');
            await make_slimed(oldtimeout || amount,
                `You are${oldtimeout ? ' still' : ''} turning into slime.`);
        } else if (key === 'STONED') {
            const { make_stoned } = await import('./potion.js');
            const { KILLED_BY } = await import('./const.js');
            await make_stoned(oldtimeout || amount,
                `You are${oldtimeout ? ' still' : ''} turning into stone.`,
                KILLED_BY, '#wizintrinsic');
        } else if (key === 'VOMITING') {
            const { make_vomiting } = await import('./potion.js');
            await make_vomiting(oldtimeout + amount, false);
            await pline(`You are${oldtimeout ? ' still' : ''} vomiting.`);
        } else if (key === 'STRANGLED') {
            /* wizcmds.c:1071 default: incr_itimeout(&u.uprops[p].intrinsic);
               the port keeps the strangulation timer in intrinsic.HStrangled
               (timeout.js, botl.js) */
            const { incr_itimeout } = await import('./potion.js');
            incr_itimeout('HStrangled', amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'UNCHANGING') {
            const { incr_itimeout } = await import('./potion.js');
            incr_itimeout('HUnchanging', amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'GLIB') {
            const { make_glib } = await import('./potion.js');
            make_glib(oldtimeout + amount);
            (game.disp ||= {}).botl = true;
            await pline('Timeout for ' + name + ' '
                        + (oldtimeout ? 'increased by' : 'set to') + ' '
                        + amount + '.');
        } else if (key === 'SEE_INVIS') {
            const intr = (game.u.intrinsic ||= {});
            const word = intr.HSee_invisible | 0;
            intr.HSee_invisible = (word & ~TIMEOUT)
                | Math.min(TIMEOUT, oldtimeout + amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'FAST') {
            const intr = (game.u.intrinsic ||= {});
            const word = intr.HFast | 0;
            intr.HFast = (word & ~TIMEOUT)
                         | Math.min(TIMEOUT, oldtimeout + amount);
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'FUMBLING') {
            const intr = (game.u.intrinsic ||= {});
            const timeout = Math.min(TIMEOUT, oldtimeout + amount);
            intr.HFumbling = ((intr.HFumbling | 0) & ~TIMEOUT) | timeout;
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else if (key === 'DETECT_MONSTERS') {
            const intr = (game.u.intrinsic ||= {});
            const timeout = Math.min(TIMEOUT, oldtimeout + amount);
            intr.HDetect_monsters = ((intr.HDetect_monsters | 0) & ~TIMEOUT)
                                   | timeout;
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        } else {
            const timeout = oldtimeout + amount;
            const uprops = (game.u.uprops ||= {});
            const bases = (game.u.wiz_intrinsic_base_props ||= {});
            if (!oldtimeout && !Object.hasOwn(bases, key)) {
                bases[key] = {
                    had: Object.hasOwn(uprops, key),
                    value: uprops[key],
                };
            }
            (game.u.wiz_intrinsic_timeouts ||= {})[key] = timeout;
            /* C stores these timers in u.uprops[p].intrinsic, so direct
               property readers must see the timed value immediately. */
            uprops[key] = timeout;
            (game.disp ||= {}).botl = true;
            await pline(`Timeout for ${name} ${oldtimeout
                ? 'increased by' : 'set to'} ${amount}.`);
        }
        /* src/wizcmds.c:1080 — this has to be after incr_itimeout() */
        if (key === 'LEVITATION' || key === 'FLYING') {
            const { float_vs_flight } = await import('./polyself.js');
            float_vs_flight();
        } else if (key === 'PROT_FROM_SHAPE_CHANGERS') {
            const { rescham } = await import('./mon.js');
            await rescham();
        }
        if (key === 'WWALKING' || key === 'LEVITATION' || key === 'FLYING') {
            if (game.u.uinwater) {
                const { pooleffects } = await import('./hack.js');
                await pooleffects(false);
            }
        }
    }
    await docrt();
    return ECMD_OK;
}

// include/global.h:413 MAXULEV
const MAXULEV = 30;

// src/hacklib.c mungspaces() — squeeze internal runs of whitespace to one
// space and drop leading and trailing space.
function mungspaces(bp) {
    return bp.replace(/[ \t]+/g, ' ').replace(/^ | $/g, '');
}

// src/wizcmds.c:353 wiz_load_lua() — #wizloadlua: load and execute a lua
// script (nhlua.js load_lua() says what this port can run)
export async function wiz_load_lua() {
    if (game.wizard) {
        let buf = '';

        buf = await getlin('Load which lua file?');
        if (buf[0] === '\x1b' || buf === '')
            return ECMD_CANCEL;
        if (!buf.includes('.'))
            buf += '.lua';
        const { load_lua } = await import('./nhlua.js');
        await load_lua(buf);
    } else
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizloadlua')));
    return ECMD_OK;
}

// src/wizcmds.c:376 wiz_load_splua() — #wizloaddes: load and execute a
// special level description lua script in place of the current level
export async function wiz_load_splua() {
    if (game.wizard) {
        let buf = '';

        buf = await getlin('Load which des lua file?');
        if (buf[0] === '\x1b' || buf === '')
            return ECMD_CANCEL;
        if (!buf.includes('.'))
            buf += '.lua';

        const { lspo_reset_level, load_special, lspo_finalize_level }
            = await import('./sp_lev.js');
        await lspo_reset_level(null);
        await load_special(buf);
        await lspo_finalize_level(null);

    } else
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizloaddes')));
    return ECMD_OK;
}

// src/wizcmds.c wiz_level_tele() — the ^V command.
export async function wiz_level_tele() {
    if (game.wizard)
        await level_tele();
    else
        await pline('Unavailable command.');   /* unavailcmd */
    return ECMD_OK;
}

// src/wizcmds.c:568 wiz_polyself(); #polyself command - change hero's form
export async function wiz_polyself() {
    await polyself(POLY_CONTROLLED);
    return ECMD_OK;
}

/* include/hack.h — quitchars */
const quitchars = ' \r\n\x1b';

// src/wizcmds.c:693 wiz_map_levltyp() — the '#terrain' debug view: every
// levl[][].typ as a base-36 digit, then a line describing the level
export async function wiz_map_levltyp() {
    let x, y;
    let terrain;
    const istty = true; /* windowprocs.name is "tty" */

    const win = tty_create_nhwindow(NHW_TEXT);
    if (istty)
        tty_putstr(win, 0, ''); /* tty only: blank top line */
    for (y = 0; y < ROWNO; y++) {
        /* map column 0 is not used (it doesn't get saved/restored, and
           it should always have terrain type "undiggable stone") */
        let row = '';
        for (x = 1; x < COLNO; x++) {
            terrain = game.level.at(x, y).typ;
            row += (terrain === STONE && !may_dig(x, y))
                   ? '*'
                   : (terrain < 10)
                      ? String.fromCharCode(48 + terrain)
                      : (terrain < 36)
                         ? String.fromCharCode(97 + terrain - 10)
                         : String.fromCharCode(65 + terrain - 36);
        }
        if (game.level.at(0, y).typ !== STONE || may_dig(0, y))
            row += '!';
        tty_putstr(win, 0, row);
    }

    {
        const slev = Is_special(game.u.uz);
        const uz = game.u.uz;
        const lflags = game.level.flags || {};
        let dsc = `D:${uz.dnum},L:${uz.dlevel}`;

        if (slev) {
            dsc += ` "${slev.proto}"`;
            /* special level flags; not all of them are useful here
               (rogue_like level is always mazelike, hellish levels are
               always in Gehennom and a lot of them are mazelike too) */
            if (slev.flags.maze_like)
                dsc += ' mazelike';
            if (slev.flags.hellish)
                dsc += ' hellish';
            if (slev.flags.town)
                dsc += ' town';
            if (slev.flags.rogue_like)
                dsc += ' roguelike';
        }
        if (lflags.nfountains)
            dsc += ` ${defsyms[cmap_names.S_fountain].sym}:${lflags.nfountains | 0}`;
        if (lflags.nsinks)
            dsc += ` ${defsyms[cmap_names.S_sink].sym}:${lflags.nsinks | 0}`;
        if (lflags.has_vault)
            dsc += ' vault';
        if (lflags.has_shop)
            dsc += ' shop';
        if (lflags.has_temple)
            dsc += ' temple';
        if (lflags.has_court)
            dsc += ' throne';
        if (lflags.has_zoo)
            dsc += ' zoo';
        if (lflags.has_morgue)
            dsc += ' morgue';
        if (lflags.has_barracks)
            dsc += ' barracks';
        if (lflags.has_beehive)
            dsc += ' hive';
        if (lflags.has_swamp)
            dsc += ' swamp';
        if (lflags.noteleport)
            dsc += ' noTport';
        if (lflags.hardfloor)
            dsc += ' noDig';
        if (lflags.nommap)
            dsc += ' noMMap';
        if (!lflags.hero_memory)
            dsc += ' noMem';
        if (lflags.shortsighted)
            dsc += ' shortsight';
        if (lflags.graveyard)
            dsc += ' graveyard';
        if (lflags.is_maze_lev)
            dsc += ' maze';
        if (lflags.is_cavernous_lev)
            dsc += ' cave';
        if (lflags.arboreal)
            dsc += ' tree';
        if (In_sokoban(uz))
            dsc += ' sokoban-rules';
        /* non-flag info; not necessarily accurate (bones levels and the
           checks (extra stairs and magic portals) here */
        if (Invocation_lev(uz))
            dsc += ' invoke';
        if (On_W_tower_level(uz))
            dsc += ' tower';
        if (uz.dnum === 0)
            dsc += ' dungeon';
        else if (uz.dnum === game.mines_dnum)
            dsc += ' mines';
        else if (In_sokoban(uz))
            dsc += ' sokoban';
        else if (uz.dnum === game.quest_dnum)
            dsc += ' quest';
        else if (Is_knox_level(uz))
            dsc += ' ludios';
        else if (uz.dnum === 1)
            dsc += ' gehennom';
        else if (uz.dnum === game.tower_dnum)
            dsc += ' vlad';
        else if (In_endgame(uz))
            dsc += ' endgame';
        else {
            let brname = game.dungeons[uz.dnum]?.dname;

            if (!brname)
                brname = 'unknown';
            if (brname.slice(0, 4).toLowerCase() === 'the ')
                brname = brname.slice(4);
            dsc += ` ${brname}`;
        }
        if (dsc.length >= COLNO)
            dsc = dsc.slice(0, COLNO - 1); /* truncate */
        tty_putstr(win, 0, dsc);
    }

    /* display_nhwindow(win, TRUE): page through the text window, ESC
       cancelling the remaining pages; destroy_nhwindow(win) redraws the
       map through tty_dismiss_nhwindow() */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    await notice_all_mons_flush();
    return;
}

// src/wizcmds.c:841 wiz_levltyp_legend() — explanation of the base-36
// output from wiz_map_levltyp()
export async function wiz_levltyp_legend() {
    let i, j, last, c;
    let dsc;
    const fmt = ' %c - %-28s'; /* TODO: include tab-separated variant for win32 */
    let buf = '';

    const win = tty_create_nhwindow(NHW_TEXT);
    tty_putstr(win, 0, '#terrain encodings:');
    tty_putstr(win, 0, '');
    /* output in pairs, left hand column holds [0],[1],...,[N/2-1]
       and right hand column holds [N/2],[N/2+1],...,[N-1];
       N ('last') will always be even, and may or may not include
       the empty string entry to pad out the final pair, depending
       upon how many other entries are present in levltyp[] */
    last = levltyp.length & ~1;
    for (i = 0; i < last / 2; ++i)
        for (j = i; j < last; j += last / 2) {
            dsc = levltyp[j];
            c = !dsc ? ' '
                   : dsc.startsWith('unreachable') ? '*'
                      : (j < 10) ? String.fromCharCode(48 + j)
                         : (j < 36) ? String.fromCharCode(97 + j - 10)
                            : String.fromCharCode(65 + j - 36);
            buf += fmt.replace('%c', c).replace('%-28s', dsc.padEnd(28));
            if (j > i) {
                tty_putstr(win, 0, buf);
                buf = '';
            }
        }
    /* display_nhwindow(win, TRUE): page through the text window, ESC
       cancelling the remaining pages; destroy_nhwindow(win) redraws the
       map through tty_dismiss_nhwindow() */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    await notice_all_mons_flush();
    return;
}

// src/wizcmds.c:412 wiz_flip_level() — #wizfliplevel - transpose the
// current level
export async function wiz_flip_level() {
    const choices = '0123',
          prmpt = 'Flip 0=randomly, 1=vertically, 2=horizontally, 3=both:';

    /*
     * Does not handle
     *   levregions,
     *   monster mtrack,
     *   migrating monsters aimed at returning to specific coordinates
     *     on this level
     * as flipping is normally done only during level creation.
     */
    if (game.wizard) {
        let c = await tty_yn_function(prmpt, choices, '\0', true);

        if (c && choices.includes(c)) {
            c = c.charCodeAt(0) - '0'.charCodeAt(0);

            if (!c)
                await flip_level_rnd(3, true);
            else
                await flip_level(c, true);

            await docrt();
        } else {
            await pline(Never_mind);
        }
    }
    return ECMD_OK;
}

// src/wizcmds.c:576 wiz_show_seenv() — #seenv command
export async function wiz_show_seenv() {
    let win;
    let x, y, startx, stopx, curx;
    let v;
    let row;

    win = tty_create_nhwindow(NHW_TEXT);
    /*
     * Each seenv description takes up 2 characters, so center
     * the seenv display around the hero.
     */
    startx = Math.max(1, game.u.ux - Math.trunc(COLNO / 4));
    stopx = Math.min(startx + Math.trunc(COLNO / 2), COLNO);
    /* can't have a line exactly 80 chars long */
    if (stopx - startx === Math.trunc(COLNO / 2))
        startx++;

    for (y = 0; y < ROWNO; y++) {
        row = '';
        for (x = startx, curx = 0; x < stopx; x++, curx += 2) {
            if (u_at(x, y)) {
                row += '@@';
            } else {
                v = (game.level.at(x, y).seenv | 0) & 0xff;
                if (v === 0)
                    row += '  ';
                else
                    row += v.toString(16).padStart(2, '0');
            }
        }
        /* remove trailing spaces */
        row = row.replace(/ +$/, '');

        tty_putstr(win, 0, row);
    }
    /* display_nhwindow(win, TRUE): page through the text window, ESC
       cancelling the remaining pages */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    return ECMD_OK;
}

// src/wizcmds.c:621 wiz_show_vision() — #vision command
export async function wiz_show_vision() {
    let win;
    let x, y;
    let v;
    let row;

    win = tty_create_nhwindow(NHW_TEXT);
    row = `Flags: 0x${COULD_SEE.toString(16)} could see, 0x${IN_SIGHT.toString(16)} in sight, 0x${TEMP_LIT.toString(16)} temp lit`;
    tty_putstr(win, 0, row);
    tty_putstr(win, 0, '');
    for (y = 0; y < ROWNO; y++) {
        row = ' '; /* row[0] is never shown */
        for (x = 1; x < COLNO; x++) {
            if (u_at(x, y)) {
                row += '@';
            } else {
                v = game.viz_array?.[y]?.[x] | 0; /* data access should be hidden */
                row += (v === 0) ? ' ' : String.fromCharCode('0'.charCodeAt(0) + v);
            }
        }
        /* remove trailing spaces */
        row = row.replace(/ +$/, '');

        tty_putstr(win, 0, row.slice(1));
    }
    /* display_nhwindow(win, TRUE): page through the text window, ESC
       cancelling the remaining pages */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    return ECMD_OK;
}

// src/wizcmds.c:657 wiz_show_wmodes() — #wmode command
export async function wiz_show_wmodes() {
    let win;
    let x, y;
    let row;
    let lev;
    const istty = true; /* WINDOWPORT(tty) */

    win = tty_create_nhwindow(NHW_TEXT);
    if (istty)
        tty_putstr(win, 0, ''); /* tty only: blank top line */
    for (y = 0; y < ROWNO; y++) {
        row = '';
        for (x = 0; x < COLNO; x++) {
            lev = game.level.at(x, y) || {};
            if (u_at(x, y))
                row += '@';
            else if (IS_WALL(lev.typ) || lev.typ === SDOOR)
                row += String.fromCharCode('0'.charCodeAt(0) + ((lev.wall_info | 0) & WM_MASK));
            else if (lev.typ === CORR)
                row += '#';
            else if (IS_ROOM(lev.typ) || IS_DOOR(lev.typ))
                row += '.';
            else
                row += 'x';
        }
        /* map column 0, levl[0][], is off the left edge of the screen */
        tty_putstr(win, 0, row.slice(1));
    }
    /* display_nhwindow(win, TRUE): page through the text window, ESC
       cancelling the remaining pages */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    return ECMD_OK;
}

// src/wizcmds.c:885 wiz_smell() — #wizsmell command - test usmellmon().
export async function wiz_smell() {
    let mtmp; /* monster being smelled */
    let mptr;
    let ans, glyph;
    const cc = { x: game.u.ux, y: game.u.uy }; /* screen pos to sniff */
    let is_you;
    const glyph_is_monster = (g) => g?.kind === 'mon';
    const glyph_is_invisible = (g) => g?.kind === 'invis';

    if (!olfaction(game.youmonst.data)) {
        await You('are incapable of detecting odors in your present form.');
        return ECMD_OK;
    }

    await You('can move the cursor to a monster that you want to smell.');
    do {
        await pline('Pick a monster to smell.');
        ans = await getpos(cc, true, 'a monster');
        if (ans < 0 || cc.x < 0) {
            return ECMD_CANCEL; /* done */
        }
        is_you = false;
        if (u_at(cc.x, cc.y)) {
            if (game.u.usteed) {
                mptr = game.u.usteed.data;
            } else {
                mptr = game.youmonst.data;
                is_you = true;
            }
        } else if ((mtmp = m_at(cc.x, cc.y)) !== null && mtmp !== undefined) {
            mptr = mtmp.data;
        } else {
            mptr = null;
        }
        /* Buglet: mapping or unmapping "remembered, unseen monster" should
           cause time to elapse; since we're in wizmode, don't bother */
        glyph = glyph_at(cc.x, cc.y);
        /* Is it a monster? */
        if (mptr) {
            if (is_you)
                await You(`surreptitiously sniff under your ${body_part(ARM)}.`);
            if (!(await usmellmon(mptr)))
                await pline(`${is_you ? 'You seem' : 'That monster seems'} to not give off any smell.`);
            if (!glyph_is_monster(glyph))
                map_invisible(cc.x, cc.y);
        } else {
            await You("don't smell any monster there.");
            if (glyph_is_invisible(glyph))
                unmap_invisible(cc.x, cc.y);
        }
    } while (true);
    /* NOTREACHED */
}

// src/wizcmds.c:1102 wiz_rumor_check() — #wizrumorcheck
export async function wiz_rumor_check() {
    const { rumor_check } = await import('./rumors.js');
    await rumor_check();
    return ECMD_OK;
}

/*
 * wizard mode sanity_check code
 */

// src/wizcmds.c:1112 template / stats_hdr / stats_sep — "%-27s  %4ld  %6ld"
const template = (src, count, size) =>
    `${src.padEnd(27)}  ${String(count).padStart(4)}  ${String(size).padStart(6)}`;
const stats_hdr = '                             count  bytes';
const stats_sep = '---------------------------  ----- -------';

// src/wizcmds.c:1117 size_obj()
function size_obj(otmp) {
    let sz = SIZEOF_STRUCT_OBJ;

    /* oextra: this port keeps the name flat, so a named object has one */
    if (otmp.oextra || has_oname(otmp)) {
        sz += SIZEOF_STRUCT_OEXTRA;
        if (has_oname(otmp))
            sz += ONAME(otmp).length + 1;
        if (has_omonst(otmp))
            sz += size_monst(OMONST(otmp), false);
        if (otmp.oextra?.omailcmd)
            sz += otmp.oextra.omailcmd.length + 1;
        /* sz += (int) sizeof (unsigned); -- now part of oextra itself */
    }
    return sz;
}

// src/wizcmds.c:1135 count_obj() — tot is { count, size }
function count_obj(chain, tot, top, recurse) {
    let count = 0, size = 0;

    for (const obj of chain || []) {
        if (top) {
            count++;
            size += size_obj(obj);
        }
        if (recurse && obj.cobj?.length)
            count_obj(obj.cobj, tot, true, true);
    }
    tot.count += count;
    tot.size += size;
}

// src/wizcmds.c:1155 obj_chain()
function obj_chain(win, src, chain, force, tot) {
    const t = { count: 0, size: 0 };

    count_obj(chain, t, true, false);

    if (t.count || t.size || force) {
        tot.count += t.count;
        tot.size += t.size;
        tty_putstr(win, 0, template(src, t.count, t.size));
    }
}

// src/wizcmds.c:1175 mon_invent_chain()
function mon_invent_chain(win, src, chain, tot) {
    const t = { count: 0, size: 0 };

    for (const mon of chain || [])
        count_obj(mon.minvent, t, true, false);

    if (t.count || t.size) {
        tot.count += t.count;
        tot.size += t.size;
        tty_putstr(win, 0, template(src, t.count, t.size));
    }
}

// src/wizcmds.c:1196 contained_stats()
function contained_stats(win, src, tot) {
    const t = { count: 0, size: 0 };

    count_obj(game.invent, t, false, true);
    count_obj(game.level?.objects, t, false, true);
    count_obj(game.level?.buriedobjs, t, false, true);
    count_obj(game.migrating_objs, t, false, true);
    /* DEADMONSTER check not required in this loop since they have no
     * inventory */
    for (const mon of game.level?.monsters || [])
        count_obj(mon.minvent, t, false, true);
    for (const mon of game.migrating_mons || [])
        count_obj(mon.minvent, t, false, true);

    if (t.count || t.size) {
        tot.count += t.count;
        tot.size += t.size;
        tty_putstr(win, 0, template(src, t.count, t.size));
    }
}

// src/wizcmds.c:1224 size_monst()
function size_monst(mtmp, incl_wsegs) {
    let sz = SIZEOF_STRUCT_MONST;

    if (mtmp.wormno && incl_wsegs)
        sz += size_wseg(mtmp);

    /* mextra: this port keeps a pet's edog and a given name flat too */
    if (mtmp.mextra || has_mgivenname(mtmp) || has_edog(mtmp)) {
        sz += SIZEOF_STRUCT_MEXTRA;
        if (has_mgivenname(mtmp))
            sz += MGIVENNAME(mtmp).length + 1;
        if (EGD(mtmp))
            sz += SIZEOF_STRUCT_EGD;
        if (EPRI(mtmp))
            sz += SIZEOF_STRUCT_EPRI;
        if (ESHK(mtmp))
            sz += SIZEOF_STRUCT_ESHK;
        if (EMIN(mtmp))
            sz += SIZEOF_STRUCT_EMIN;
        if (EDOG(mtmp))
            sz += SIZEOF_STRUCT_EDOG;
        if (EBONES(mtmp))
            sz += SIZEOF_STRUCT_EBONES;
        /* mextra->mcorpsenm doesn't point to more memory */
    }
    return sz;
}

// src/wizcmds.c:1252 mon_chain()
function mon_chain(win, src, chain, force, tot) {
    let count, size;
    /* mon->wormno means something different for migrating_mons and mydogs */
    const incl_wsegs = src.toLowerCase() === 'fmon';

    count = size = 0;
    for (const mon of chain || []) {
        count++;
        size += size_monst(mon, incl_wsegs);
    }
    if (count || size || force) {
        tot.count += count;
        tot.size += size;
        tty_putstr(win, 0, template(src, count, size));
    }
}

// src/wizcmds.c:1277 misc_stats()
function misc_stats(win, tot) {
    let buf, hdrbuf;
    let count, size;
    let st;

    /* traps and engravings are output unconditionally;
     * others only if nonzero
     */
    count = size = 0;
    for (const tt of game.level?.traps || []) {
        ++count;
        size += SIZEOF_STRUCT_TRAP;
    }
    tot.count += count;
    tot.size += size;
    hdrbuf = `traps, size ${SIZEOF_STRUCT_TRAP}`;
    buf = template(hdrbuf, count, size);
    tty_putstr(win, 0, buf);

    st = engr_stats('engravings, size %ld+text');
    tot.count += st.count;
    tot.size += st.size;
    buf = template(st.hdrbuf, st.count, st.size);
    tty_putstr(win, 0, buf);

    st = light_stats('light sources, size %ld');
    if (st.count || st.size) {
        tot.count += st.count;
        tot.size += st.size;
        buf = template(st.hdrbuf, st.count, st.size);
        tty_putstr(win, 0, buf);
    }

    st = timer_stats('timers, size %ld');
    if (st.count || st.size) {
        tot.count += st.count;
        tot.size += st.size;
        buf = template(st.hdrbuf, st.count, st.size);
        tty_putstr(win, 0, buf);
    }

    count = size = 0;
    for (const sd of game.level?.damagelist || []) {
        ++count;
        size += SIZEOF_STRUCT_DAMAGE;
    }
    if (count || size) {
        tot.count += count;
        tot.size += size;
        hdrbuf = `shop damage, size ${SIZEOF_STRUCT_DAMAGE}`;
        buf = template(hdrbuf, count, size);
        tty_putstr(win, 0, buf);
    }

    st = region_stats('regions, size %ld+%ld*rect+N');
    if (st.count || st.size) {
        tot.count += st.count;
        tot.size += st.size;
        buf = template(st.hdrbuf, st.count, st.size);
        tty_putstr(win, 0, buf);
    }

    count = size = 0;
    for (let k = game.killer?.next || null; k; k = k.next) {
        ++count;
        size += SIZEOF_STRUCT_KINFO;
    }
    if (count || size) {
        tot.count += count;
        tot.size += size;
        hdrbuf = `delayed killer${plur(count)}, size ${SIZEOF_STRUCT_KINFO}`;
        buf = template(hdrbuf, count, size);
        tty_putstr(win, 0, buf);
    }

    count = size = 0;
    for (let bi = game.level?.bonesinfo || null; bi; bi = bi.next) {
        ++count;
        size += SIZEOF_STRUCT_CEMETERY;
    }
    if (count || size) {
        tot.count += count;
        tot.size += size;
        hdrbuf = `bones history, size ${SIZEOF_STRUCT_CEMETERY}`;
        buf = template(hdrbuf, count, size);
        tty_putstr(win, 0, buf);
    }

    count = size = 0;
    for (let idx = 0; idx < NUM_OBJECTS; ++idx)
        if (game.objects[idx]?.oc_uname) {
            ++count;
            size += game.objects[idx].oc_uname.length + 1;
        }
    if (count || size) {
        tot.count += count;
        tot.size += size;
        hdrbuf = 'object type names, text';
        buf = template(hdrbuf, count, size);
        tty_putstr(win, 0, buf);
    }
}

// src/wizcmds.c:1616 wiz_show_stats() — the #stats command: display memory
// usage of all monsters and objects on the level
export async function wiz_show_stats() {
    let buf;
    const total_obj = { count: 0, size: 0 },
          total_mon = { count: 0, size: 0 },
          total_ovr = { count: 0, size: 0 },
          total_misc = { count: 0, size: 0 };

    const win = tty_create_nhwindow(NHW_TEXT);
    tty_putstr(win, 0, 'Current memory statistics:');

    tty_putstr(win, 0, stats_hdr);
    buf = `  Objects, base size ${SIZEOF_STRUCT_OBJ}`;
    tty_putstr(win, 0, buf);
    obj_chain(win, 'invent', game.invent, true, total_obj);
    obj_chain(win, 'fobj', game.level?.objects, true, total_obj);
    obj_chain(win, 'buried', game.level?.buriedobjs, false, total_obj);
    obj_chain(win, 'migrating obj', game.migrating_objs, false, total_obj);
    obj_chain(win, 'billobjs', game.billobjs, false, total_obj);
    mon_invent_chain(win, 'minvent', game.level?.monsters, total_obj);
    mon_invent_chain(win, 'migrating minvent', game.migrating_mons, total_obj);
    contained_stats(win, 'contained', total_obj);
    tty_putstr(win, 0, stats_sep);
    buf = template('  Obj total', total_obj.count, total_obj.size);
    tty_putstr(win, 0, buf);

    tty_putstr(win, 0, '');
    buf = `  Monsters, base size ${SIZEOF_STRUCT_MONST}`;
    tty_putstr(win, 0, buf);
    mon_chain(win, 'fmon', game.level?.monsters, true, total_mon);
    mon_chain(win, 'migrating', game.migrating_mons, false, total_mon);
    /* 'gm.mydogs' is only valid during level change or end of game disclosure,
       but conceivably we've been called from within debugger at such time */
    if (game.mydogs?.length) /* monsters accompanying hero */
        mon_chain(win, 'mydogs', game.mydogs, false, total_mon);
    tty_putstr(win, 0, stats_sep);
    buf = template('  Mon total', total_mon.count, total_mon.size);
    tty_putstr(win, 0, buf);

    tty_putstr(win, 0, '');
    tty_putstr(win, 0, '  Overview');
    {
        const ov = overview_stats(win, template);
        total_ovr.count += ov.count;
        total_ovr.size += ov.size;
    }
    tty_putstr(win, 0, stats_sep);
    buf = template('  Over total', total_ovr.count, total_ovr.size);
    tty_putstr(win, 0, buf);

    tty_putstr(win, 0, '');
    tty_putstr(win, 0, '  Miscellaneous');
    misc_stats(win, total_misc);
    tty_putstr(win, 0, stats_sep);
    buf = template('  Misc total', total_misc.count, total_misc.size);
    tty_putstr(win, 0, buf);

    tty_putstr(win, 0, '');
    tty_putstr(win, 0, stats_sep);
    buf = template('  Grand total',
                   (total_obj.count + total_mon.count
                    + total_ovr.count + total_misc.count),
                   (total_obj.size + total_mon.size
                    + total_ovr.size + total_misc.size));
    tty_putstr(win, 0, buf);

    /* display_nhwindow(win, FALSE) */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    return ECMD_OK;
}

// src/wizcmds.c:1705 wiz_display_macros() — #wizdispmacros: verify that
// some display macros are returning sane values. The C walks the integer
// glyphs 0..MAX_GLYPH-1 and applies the macros to each; this port's glyphs
// are {kind, ...} records, so it walks every cmap, zap, monster and object
// glyph the port can make and applies the same bounds checks to each.
export async function wiz_display_macros() {
    const display_issues = 'Display macro issues:';
    let test, trouble = 0;
    const max_glyph = MAX_GLYPH;
    const S_vbeam = cmap_names.S_vbeam, S_rslant = cmap_names.S_rslant;

    const win = tty_create_nhwindow(NHW_TEXT);

    /* glyph_is_cmap / glyph_to_cmap(): the plain cmap glyphs, then the
       zap glyphs (a cmap S_vbeam..S_rslant per beam type and direction) */
    const cmap_glyphs = [];
    for (let cmap = 0; cmap < defsyms.length; ++cmap)
        cmap_glyphs.push({ glyph: cmap, kind: 'cmap', cmap });
    for (let beam_type = 0; beam_type < NUM_ZAP; ++beam_type)
        for (let dir = 0; dir < 4; ++dir)
            cmap_glyphs.push({ glyph: defsyms.length + (beam_type << 2) + dir,
                               kind: 'zap', cmap: S_vbeam + dir });
    for (const g of cmap_glyphs) {
        test = g.cmap;
        /* check for MAX_GLYPH return */
        if (test === undefined) {
            if (!trouble++)
                tty_putstr(win, 0, display_issues);
            tty_putstr(win, 0, `glyph_is_cmap() / glyph_to_cmap(glyph=${
                g.glyph}) sync failure, returned NO_GLYPH (${max_glyph})`);
        }
        if (g.kind === 'zap' && !(test >= S_vbeam && test <= S_rslant)) {
            if (!trouble++)
                tty_putstr(win, 0, display_issues);
            tty_putstr(win, 0, `glyph_is_cmap_zap(glyph=${
                g.glyph}) returned non-zap cmap ${test}`);
        }
        /* check against defsyms array subscripts */
        if (!(test >= 0 && test < defsyms.length)) {
            if (!trouble++)
                tty_putstr(win, 0, display_issues);
            tty_putstr(win, 0, `glyph_to_cmap(glyph=${g.glyph}) returns ${
                test} exceeds defsyms[${defsyms.length}] bounds (MAX_GLYPH = ${
                max_glyph})`);
        }
    }
    /* glyph_is_monster / glyph_to_mon */
    for (let mnum = 0; mnum < NUMMONS; ++mnum) {
        test = mnum; /* { kind: 'mon', mnum } */
        /* check against mons array subscripts */
        if (test < 0 || test >= NUMMONS) {
            if (!trouble++)
                tty_putstr(win, 0, display_issues);
            tty_putstr(win, 0, `glyph_to_mon(glyph=${mnum}) returns ${
                test} exceeds mons[${NUMMONS}] bounds`);
        }
    }
    /* glyph_is_object / glyph_to_obj */
    for (let otyp = 0; otyp < NUM_OBJECTS; ++otyp) {
        test = otyp; /* { kind: 'obj', otyp } */
        /* check against objects array subscripts */
        if (test < 0 || test > NUM_OBJECTS) {
            if (!trouble++)
                tty_putstr(win, 0, display_issues);
            tty_putstr(win, 0, `glyph_to_obj(glyph=${otyp}) returns ${
                test} exceeds objects[${NUM_OBJECTS}] bounds`);
        }
    }
    if (!trouble)
        tty_putstr(win, 0, 'No display macro issues detected.');
    /* display_nhwindow(win, FALSE) */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    return ECMD_OK;
}

// src/wizcmds.c:1790 wiz_mon_diff() — the #wizmondiff command
export async function wiz_mon_diff() {
    const window_title = 'Review of monster difficulty ratings'
                         + ' [index:level]:';
    let buf;
    let win;
    let mhardcoded = 0, mcalculated = 0, trouble = 0, cnt = 0, mdiff = 0;
    let mlev;
    let ptr;

    /*
     * Possible extension:  choose between showing discrepancies,
     * showing all monsters, or monsters within a particular class.
     */

    win = tty_create_nhwindow(NHW_TEXT);
    for (cnt = 0; cnt < game.mons.length && (ptr = game.mons[cnt]).mlet; cnt++) {
        mcalculated = mstrength(ptr);
        mhardcoded = ptr.difficulty | 0;
        mdiff = mhardcoded - mcalculated;
        if (mdiff) {
            if (!trouble++)
                tty_putstr(win, 0, window_title);
            mlev = ptr.mlevel | 0;
            if (mlev > 50) /* hack for named demons */
                mlev = 50;
            buf = `${ptr.pmnames[NEUTRAL].padEnd(18)} [${String(cnt).padStart(3)}:${
                  String(mlev).padStart(2)}]: calculated: ${String(mcalculated).padStart(2)}, hardcoded: ${
                  String(mhardcoded).padStart(2)} (${mdiff >= 0 ? '+' : ''}${mdiff})`;
            tty_putstr(win, 0, buf);
        }
    }
    if (!trouble)
        tty_putstr(win, 0, 'No monster difficulty discrepancies were detected.');
    /* display_nhwindow(win, FALSE): page through the text window, ESC
       cancelling the remaining pages */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);
    return ECMD_OK;
}

// src/wizcmds.c:1836 migrsort_cmp() — sort migrating monsters by
// destination dungeon, level, then m_id
function migrsort_cmp(m1, m2) {
    const d1 = m1.mux | 0, l1 = m1.muy | 0,
          d2 = m2.mux | 0, l2 = m2.muy | 0;

    /* if different branches, sort by dungeon number */
    if (d1 !== d2)
        return d1 - d2;
    /* within same branch, sort by level number */
    if (l1 !== l2)
        return l1 - l2;
    /* same destination level:  use a tie-breaker to force stable sort;
       monst->m_id is unsigned so we need more than just simple subtraction */
    return (m1.m_id < m2.m_id) ? -1 : (m1.m_id > m2.m_id) ? 1 : 0;
}

// src/wizcmds.c:1856 list_migrating_mons()
async function list_migrating_mons(nextlevl /* default destination for wiz_migrate_mons() */) {
    let win = null;
    let showit = false;
    let n;
    let xyloc;
    let x, y;
    let c, prmpt, xtra, buf;
    let mtmp, marray;
    let here = 0, nxtlv = 0, other = 0;
    const uz = game.u.uz;

    for (mtmp of (game.migrating_mons || [])) {
        if (mtmp.mux === uz.dnum && mtmp.muy === uz.dlevel)
            ++here;
        else if (mtmp.mux === nextlevl.dnum && mtmp.muy === nextlevl.dlevel)
            ++nxtlv;
        else
            ++other;
    }
    if (here + nxtlv + other === 0) {
        await pline('No monsters currently migrating.');
    } else {
        await pline(`${here} mon${plur(here)} pending for current level, ${
                    nxtlv} for next level, ${other} for others.`);
        prmpt = xtra = '';
        if (here) prmpt += 'c'; else xtra += 'c';
        if (nxtlv) prmpt += 'n'; else xtra += 'n';
        if (other) prmpt += 'o'; else xtra += 'o';
        prmpt += 'a q';
        if (xtra)
            prmpt += '\x1b' + xtra;
        c = await tty_yn_function('List which?', prmpt, 'q', true);
        n = (c === 'c') ? here
            : (c === 'n') ? nxtlv
              : (c === 'o') ? other
                : (c === 'a') ? here + nxtlv + other
                  : 0;
        if (n > 0) {
            win = tty_create_nhwindow(NHW_TEXT);
            switch (c) {
            case 'c':
            case 'n':
            case 'o':
                buf = `Monster${plur(n)} migrating to ${
                      (c === 'c') ? 'current level'
                      : (c === 'n') ? 'next level'
                        : "'other' levels"}:`;
                break;
            default:
                buf = 'All migrating monsters:';
                break;
            }
            tty_putstr(win, 0, buf);
            tty_putstr(win, 0, '');
            /* collect the migrating monsters into an array; for 'o' and 'a'
               where multiple destination levels might be present, sort by
               the destination; 'c' and 'n' don't need to be sorted but we
               do that anyway to get the same tie-breaker as 'o' and 'a' */
            marray = [];
            for (mtmp of (game.migrating_mons || [])) {
                if (c === 'a')
                    showit = true;
                else if (mtmp.mux === uz.dnum && mtmp.muy === uz.dlevel)
                    showit = (c === 'c');
                else if (mtmp.mux === nextlevl.dnum
                         && mtmp.muy === nextlevl.dlevel)
                    showit = (c === 'n');
                else
                    showit = (c === 'o');

                if (showit)
                    marray.push(mtmp);
            }
            if (marray.length > 1)
                marray.sort(migrsort_cmp); /* sort elements [0] through [n-1] */
            for (n = 0; n < marray.length; ++n) {
                mtmp = marray[n];
                buf = `  ${minimal_monnam(mtmp, false)}`;
                /* minimal_monnam() appends map coordinates; strip that */
                buf = strsubst(buf, ' <0,0>', '');
                if (has_mgivenname(mtmp)) /* if mtmp is named, include that */
                    buf += ` named ${MGIVENNAME(mtmp)}`;
                if (c === 'o' || c === 'a')
                    buf += ` to ${mtmp.mux}:${mtmp.muy}`;
                xyloc = mtmp.mtrack?.[0]?.x; /* (for legibility) */
                if (xyloc === MIGR_EXACT_XY) {
                    x = mtmp.mtrack[1].x;
                    y = mtmp.mtrack[1].y;
                    buf += ` at <${x},${y}>`;
                }
                tty_putstr(win, 0, buf);
            }
            /* display_nhwindow(win, FALSE): page through the text window, ESC
       cancelling the remaining pages */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
            tty_destroy_nhwindow(win);
        } else if (c !== 'q') {
            await pline('None.');
        }

    }
}

// src/wizcmds.c:1832 wiz_objprobs() — #wizobjprobs: the object generation
// probabilities, each as its share of its class
export async function wiz_objprobs() {
    let buf;
    const probsum = new Array(MAXOCLASSES).fill(0);
    let otyp;
    const FIRST_OBJECT = ONAMES.FIRST_OBJECT;
    let oclass = game.objects[FIRST_OBJECT].oc_class;

    for (otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        probsum[game.objects[otyp].oc_class] += game.objects[otyp].oc_prob;
    }

    const win = tty_create_nhwindow(NHW_TEXT);
    for (otyp = FIRST_OBJECT; otyp < NUM_OBJECTS; otyp++) {
        /* placeholders for extra descriptions aren't generatable objects */
        if (!OBJ_NAME(game.objects[otyp]))
            continue;

        if (game.objects[otyp].oc_class !== oclass) {
            tty_putstr(win, 0, '');
        }
        oclass = game.objects[otyp].oc_class;

        /* "%4d / %4d (%6.2f%%): %s" in float arithmetic */
        const pct = Math.fround(Math.fround(game.objects[otyp].oc_prob * 100)
                                / Math.fround(probsum[oclass]));
        buf = `${String(game.objects[otyp].oc_prob).padStart(4)} / ${
            String(probsum[oclass]).padStart(4)} (${pct.toFixed(2).padStart(6)}%): ${
            OBJ_NAME(game.objects[otyp])}`;
        tty_putstr(win, 0, buf);
    }
    /* display_nhwindow(win, FALSE) */
    await tty_display_nhwindow(win);
    for (;;) {
        await xwaitforspace(quitchars);
        if (game.morc === '\x1b')
            break; /* cancel remaining pages */
        if (!tty_next_page(win))
            break;
    }
    tty_destroy_nhwindow(win);

    return ECMD_OK;
}

// src/wizcmds.c:1873 wiz_migrate_mons() — #migratemons command
// (DEBUG_MIGRATING_MONS is not defined: the listing only)
export async function wiz_migrate_mons() {
    const tolevel = { dnum: 0, dlevel: 0 };

    if (Is_stronghold(game.u.uz)) {
        tolevel.dnum = game.valley_level.dnum; /* assign_level(&tolevel, &valley_level) */
        tolevel.dlevel = game.valley_level.dlevel;
    } else if (!Is_botlevel(game.u.uz))
        get_level(tolevel, depth(game.u.uz) + 1);
    else
        tolevel.dnum = 0, tolevel.dlevel = 0;

    await list_migrating_mons(tolevel);

    /* DEBUG_MIGRATING_MONS (include/config.h:620, on with DEBUG) */
    {
        let inbuf = '';
        let mcount, ptr, mtmp;
        let use_random_mon = true;
        const mongen_saved = game.iflags?.debug_mongen;

        if (tolevel.dnum || tolevel.dlevel)
            inbuf = await getlin('How many random monsters to migrate to next level? [0]');
        else
            await pline("Can't get there from here.");
        if (inbuf[0] === '\x1b' || inbuf === '')
            return ECMD_OK;

        mcount = parseInt(inbuf, 10) || 0; /* atoi() */
        if (mcount < 0) {
            use_random_mon = false;
            mcount *= -1;
        }
        if (mcount < 1)
            mcount = 0;
        else if (mcount > ((COLNO - 1) * ROWNO))
            mcount = (COLNO - 1) * ROWNO;

        (game.iflags ||= {}).debug_mongen = false;
        while (mcount > 0) {
            if (use_random_mon) {
                ptr = rndmonst();
                mtmp = makemon(ptr, 0, 0, MM_NOMSG);
            } else {
                mtmp = (game.level.monsters || [])[0] || null; /* fmon */
            }
            if (mtmp)
                await migrate_to_level(mtmp, ledger_no(tolevel), MIGR_RANDOM, null);
            mcount--;
        }
        game.iflags.debug_mongen = mongen_saved;
    }
    return ECMD_OK;
}

// src/wizcmds.c:1934 wiz_custom() — #wizcustom: the glyphs the active
// symset (or a SYMBOLS= line) customized, with their symbol, colour,
// custom colour and unicode representation
export async function wiz_custom() {
    if (game.wizard) {
        const wizcustom = '#wizcustom';
        let buf, bufa;
        let n;
        const { glyphid_cache_status, fill_glyphid_cache, free_glyphid_cache,
                wizcustom_glyphids } = await import('./glyphs.js');

        if (!glyphid_cache_status())
            fill_glyphid_cache();

        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        add_menu_heading(win,
                         '    glyph  glyph identifier                        '
                         + '     sym   clr customcolor unicode utf8');
        bufa = `${wizcustom}: colorcount=${game.iflags?.colorcount | 0} ${
            gs_symset[PRIMARYSET]?.name ? gs_symset[PRIMARYSET].name : 'default'}`;
        if (gc_currentgraphics.set === PRIMARYSET && gs_symset[PRIMARYSET]?.name)
            bufa += ', active';
        if (gs_symset[PRIMARYSET]?.handling) {
            bufa += `, handler=${known_handling[gs_symset[PRIMARYSET].handling]}`;
        }
        buf = bufa;
        await wizcustom_glyphids(win);
        tty_end_menu(win, bufa);
        n = (await tty_select_menu(win, PICK_NONE)).length;
        tty_destroy_nhwindow(win);
        if (glyphid_cache_status())
            free_glyphid_cache();
        await docrt();
    } else
        await pline(unavailcmd.replace('%s', ecname_from_fn('wizcustom')));
    return ECMD_OK;
}

// src/wizcmds.c:1979 wizcustom_callback() — one #wizcustom menu line
export function wizcustom_callback(win, glyphnum, id) {
    let buf, bufa, bufb, bufc, bufd, bufu;
    const clr = NO_COLOR;

    if (win && id) {
        const cgm = glyphmap()[glyphnum];
        if (cgm.u || cgm.customcolor !== 0) {
            bufa = `[${String(glyphnum).padStart(4, '0')}] ${id.padEnd(44)}`;
            bufb = `'\\${String(showsyms_at(cgm.sym.symidx)).padStart(3, '0')}' ${
                String(cgm.sym.color).padStart(2, '0')}`;
            bufc = (cgm.customcolor >>> 0).toString(16).padStart(11, '0');
            bufu = '';
            if (cgm.u && cgm.u.utf8str) {
                bufu = `U+${(cgm.u.utf32ch >>> 0).toString(16).padStart(4, '0')}`;
                for (const cp of cgm.u.utf8str) {
                    bufd = ` <${cp}>`;
                    bufu += bufd;
                }
            }
            buf = `${bufa} ${bufb} ${bufc} ${bufu}`;
            tty_add_menu(win, null, glyphnum + 1 /* avoid 0 */, 0, 0, ATR_NONE, clr, buf,
                         MENU_ITEMFLAGS_NONE);
        }
    }
    return;
}
