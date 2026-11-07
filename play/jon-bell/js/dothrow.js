// dothrow.js — C ref: dothrow.c.
import { nomul, stop_occupation } from './allmain.js';
import { acurr, change_luck, exercise } from './attrib.js';
import { drag_ball, drop_ball, move_bc } from './ball.js';
import { ARM, BOULDER, BOULDER_OTYP, DB_MOAT_WB, DEADMONSTER, EYE, FOOT, GETOBJ_DOWNPLAY, GETOBJ_EXCLUDE, GETOBJ_SUGGEST, HAND, HEAD, LOADSTONE, MAGIC_PORTAL, OCLASS_COIN, OCLASS_FOOD, OCLASS_GEM, OCLASS_TOOL, OCLASS_WEAPON, OTYP_AKLYS, OTYP_BOW, OTYP_ELVEN_ARROW, OTYP_ELVEN_BOW, OTYP_FLINT, OTYP_ORCISH_ARROW, OTYP_ORCISH_BOW, OTYP_WAR_HAMMER, OTYP_YA, OTYP_YUMI, Race_if, Role_if, THIT_BANANA, THIT_CORPSE, THIT_CREAM_PIE, THIT_EGG, THIT_M2_ELF, THIT_OBJ_MINVENT, THIT_POTION_CLASS, THIT_S_UNICORN, Underwater, W_QUIVER_C, W_SWAPWEP_C, W_WEP_C, Yname2, Your, _BULLWHIP_OTYP, _Blind_cmd, _FW_BOULDER, _Flying, _GEM_CLASS, _Levitation, _MAT_MINERAL, _MH_MZ_HUGE, _TOWEL_OTYP, _Underwater, _bldr_Sokoban, _cmd_Hallucination, _delobj_useupf, _digests, _doaltarobj_Doname2, _doswapweapon, _ensure_ranger_weapons, _eyecount, _glyph_at, _grapple_range, _hero_Deaf, _hero_notake, _hero_verysmall_or_nohands_nohands_only, _hero_youmonst, _hliquid, _invlet_constant, _is_animal_local, _is_whirly_ustuck, _ismnum_local, _levlAt, _mh_a_monnam, _mh_touch_petrifies, _oc_material, _oc_skill, _st_Punished, _st_throws_rocks, _topline_more, _u_on_newpos_nearby, _up_find_poleable_mon, _uprop_active, ammo_and_launcher, bad_rock, bigmonst_cmd, body_part, ceiling, check_capacity, check_special_room, cmdq_add_ec, cmdq_add_int, cmdq_add_key, compactify, costly_spot, drown, flooreffects_Maybe_Half_Phys, flooreffects_is_lava, flooreffects_is_pool, freeinv, fully_identify_obj, getobj_cmdq_drain, getobj_get_count, getobj_redo_menu, hit_bars_hero, impact_disturbs_zombies, instapetrify, is_ammo, is_blade, is_lava, is_missile, is_pole, is_pool, is_quest_artifact, is_sword, is_weptool, is_wet_towel, key2txt, matching_launcher, may_passwall, mime_action, nh_delay_output, pooleffects_Wwalking, prinv, set_cursor, snuff_candle, splittable, sr_touch_petrifies_ptr, surface, switch_terrain, test_move, thit_is_orc, thit_is_unicorn, u_on_newpos_cmd, use_pole, use_whip, verbalize, readchar } from './cmd.js';
import { dry_a_towel } from './weapon.js';
import { align_gname } from './pray.js';
import { doquiver_core, set_twoweap, setuqwep, setuswapwep, setuwep, welded, weldmsg } from './wield.js';
import { is_art } from './artifact.js';
import { EXACT_NAME, FIRE_TRAP, FORCEBUNGLE, HURTLING, OBJ_FREE, OBJ_INVENT, P_DAGGER, P_DART, P_SHURIKEN, P_SLING, P_SPEAR, SUPPRESS_NAME } from './const.js';
import { ARTICLE_A, ARTICLE_YOUR, AUGMENT_IT, A_CON, A_DEX, A_ORIGINAL, A_STR, BACKTRACK, BOLT_LIM, BRK_FROM_INV, BRK_KNOWN2BREAK, BRK_KNOWN2NOTBREAK, BRK_KNOWN_OUTCOME, BURNING_OIL, CONFUSION, CQ_CANNED, CQ_REPEAT, DB_UNDER, DRAWBRIDGE_UP, D_ISOPEN, ECMD_CANCEL, ECMD_OK, ECMD_TIME, EF_DESTROY, EF_VERBOSE, ERODE_CRACK, ER_DESTROYED, ESHK, EXPL_FIERY, GETOBJ_ALLOWCNT, GETOBJ_PROMPT, HMON_APPLIED, HMON_KICKED, HMON_THROWN, HOLE, Has_contents, IRONBARS, IS_ALTAR, IS_DOOR, IS_OBSTRUCTED, IS_SINK, IS_SOFT, IS_TREE, IS_WATERWALL, Is_airlevel, Is_juiblex_level, Is_waterlevel, KILLED_BY, LARGEST_INT, LAVAWALL, LOST_EXPLODING, LOST_THROWN, MM_IGNORELAVA, MM_IGNOREWATER, MM_NOMSG, MOAT, M_AP_MONSTER, M_AP_OBJECT, M_AP_TYPE, NEUTRAL, PIT, RLOC_MSG, SHOPBASE, SLT_ENCUMBER, SPIKED_PIT, STONE, STUNNED, SUPPRESS_SADDLE, TEST_MOVE, TRAPDOOR, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TT_WEB, Upolyd, VIBRATING_SQUARE, WEB, WT_SPLASH_THRESHOLD, WT_TOOMUCH_DIAGONAL, W_QUIVER as W_QUIVER_TO, engulfing_u, has_mgivenname, has_oname, is_hole, is_pit, isok, u_at } from './const.js';
import { is_pick } from './dig.js';
import { DISP_END, DISP_FLASH, DISP_TETHER, GLYPHCLS_MON, _topl_joins_snapshot, _topl_more_pages, await_topl_more_dismiss, canseemon, canspotmon, flush_screen, force_more, getobj_never_mind, glyph_is_invisible_at, glyph_is_warning_at, map_invisible, newsym, obj_to_glyph, pline_flush_point, putmsghistory, sensemon, tmp_at, unmap_object, Unaware as wizard_Unaware } from './display.js';
import { You_hear, Norep as _Norep, pline } from './pline.js';
import { doaltarobj, dropy, dropz, flooreffects, obj_no_longer_held } from './do.js';
import { rndmonnam as look_rndmonnam } from './do_name.js';
import { You, encumber_msg, xname, yname } from './do_wear.js';
import { tamedog } from './dog.js';
import { dogfood } from './dogmove.js';
import { acurrstr, container_impact_dmg, ghitm as dokick_ghitm, stolen_value as dokick_stolen_value, ship_object } from './dokick.js';
import { losehp } from './hack.js';
import { is_waterwall } from './dbridge.js';
import { FF_FAITHFUL } from './fastforward.js';
import { newobj } from './game.js';
import { game } from './gstate.js';
import { dist2, distmin, ordin } from './hacklib.js';
import { can_reach_floor } from './hold_another_object.js';
import { addinv, addinv_before } from './invent.js';
import { nhgetch } from './input.js';
import { reassign } from './inventory_refresh.js';
import { transient_light_cleanup as _transient_light_cleanup, obj_is_burning, show_transient_light } from './light.js';
import { getdir } from './lock.js';
import { closed_door } from './monmove.js';
import { canletgo, monPmname, permonstTemplate, set_malign, splitobj, trapname, unsplitobj } from './makemon.js';
import { which_armor } from './worn.js';
import { Monnam } from './mcastu.js';
import { Some_Monnam, hmon, passive_obj, s_suffix, seemimic, shade_miss, wakeup_attack, x_monnam } from './mhitm.js';
import { hits_bars_mu } from './mhitu.js';
import { add_to_minv, is_crackable as is_crackable_bo, is_flammable, makemon as mklev_makemon, place_object, wipe_engr_at } from './mklev.js';
import { mpickobj } from './steal.js';
import { inside_shop } from './shk.js';
import { sobj_at } from './invent.js';
import { u_on_newpos } from './dungeon.js';
import { MKOBJ_OC_MAGIC, MKOBJ_OC_MATERIAL, MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
import { minliquid, setmangry, wake_nearto } from './mon.js';
import { pronoun_gender } from './mondata.js';
import { set_apparxy } from './monmove.js';
import { An, The, distant_name as _fw_distant_name, xname as _fw_xname, Tobjnam as _objnam_Tobjnam, an, armor_simple_name, corpse_xname, helm_simple_name, killer_xname, makeplural as makeplural_objnam, mshot_xname, otense, singular, the, vtense } from './objnam.js';
import { impossible as real_impossible } from './pline.js';
import { PM_CYCLOPS, PM_FLOATING_EYE, PM_GRID_BUG, PM_HOMUNCULUS, PM_IMP } from './pm.generated.js';
import { PM_CAVEMAN as PM_CAVE_DWELLER, PM_MONK, PM_NINJA, PM_RANGER, PM_ROGUE, PM_SAMURAI } from './pm.generated.js';
import { potionbreathe, potionhit } from './potion.js';
import { finish_quest } from './quest.js';
import { in_out_region, m_in_out_region } from './region.js';
import { d, rn2, rnd, rnl } from './rng.js';
import { hot_pursuit, make_angry_shk, obfree, sellobj, contained_gold as shk_contained_gold, costly_spot as shk_costly_spot, donate_gold as shk_donate_gold, is_unpaid as shk_is_unpaid, shop_keeper as shk_shop_keeper, subfrombill as shk_subfrombill, shkcatch } from './shk.js';
import { in_rooms as shk_in_rooms } from './hack.js';
import { Tobjnam } from './sit.js';
import { skill_name } from './skills.js';
import { stackobj } from './sp_lev.js';
import { isqrt } from './hacklib.js';
import { remove_worn_item as _remove_worn_item_thrown } from './steal.js';
import { place_monster } from './steed.js';
import { rloc, tele_restrict } from './teleport.js';
import { toss_up } from './throw_vertical.js';
import { end_burn } from './timeout.js';
import { dotrap, erode_obj as erode_obj_bo, goodpos, mintrap, t_at } from './trap.js';
import { find_mac } from './worn.js';
import { artifact_hit, autoreturn_weapon, hitval, m_at, minstapetrify, mon_nam, spec_abon, weapon_descr, weapon_hit_bonus, weapon_type } from './uhitm.js';
import { Blind as _vision_Blind, cansee, vision_recalc } from './vision.js';
import { weight } from './weight.js';
import { calc_capacity, inv_weight, near_capacity, weight_cap } from './hack.js';
import { cutworm as cutworm_real } from './worm.js';
import { boomhit, miss, obj_resists } from './zap.js';
import { explode, explode_oil } from './explode.js';
import { _Blind_dk } from './dokick.js'; // relocate-fns

export async function dothrow() {
    const g = game;
    const u = g.u || {};
    g.multi = 0;
    const shotlimit = Math.max(0, Math.min(LARGEST_INT, Number(g.command_count) || 0)); /* LIMIT_TO_RANGE_INT(0, LARGEST_INT, gc.command_count) dothrow.c:298 */
    if (_hero_notake()) {
        await pline('You are physically incapable of throwing or shooting anything.');
        g.context = g.context || {};
        g.context.move = 0;   /* C ECMD_OK */
        return ECMD_OK;
    }
    if (_hero_verysmall_or_nohands_nohands_only()) {
        await pline("You can't throw or shoot without hands.");
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    if (check_capacity(null)) {
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    /* Ensure weapon slots initialized (Ranger lazy-init) */
    _ensure_ranger_weapons(u);
    /* ── Build throw getobj prompt (C ref: invent.c:1752 getobj, throw_ok filter) ──
     * throw_ok(null) = GETOBJ_EXCLUDE → no '-' (can't throw nothing).
     * Collect GETOBJ_SUGGEST invlets from inventory. */
    /* throw_ok per invent object (C ref: dothrow.c:317 throw_ok).
     * For live invent chain, uses object identity for uwep/uswapwep checks. */
    const _throw_ok_obj = (obj) => {
        /* C dothrow.c:322-328: returning weapons precede the ordinary
         * wielded-single downplay, unless already known to be welded. */
        if (obj.bknown && welded(obj)) return 'downplay';
        if (throw_auto_return(obj, obj.owornmask | 0)
            && (obj.oartifact !== 3 || acurr(u, A_STR) >= 125))
            return 'suggest';
        /* uwep (quan=1) → GETOBJ_DOWNPLAY (C ref: dothrow.c:330) */
        if (obj === u.uwep && (obj.quan ?? 1) === 1)
            return 'downplay';
        /* twoweap-uswapwep (quan=1) → GETOBJ_DOWNPLAY */
        if (obj === u.uswapwep && u.twoweap && (obj.quan ?? 1) === 1)
            return 'downplay';
        /* COIN_CLASS → GETOBJ_SUGGEST (C ref: dothrow.c:333) — gold is throwable;
         * its '$' invlet appears in the prompt before letter items (sortloot
         * invlet order: '$'^0o40=0x04 sorts before a..z). */
        if ((obj.oclass | 0) === OCLASS_COIN)
            return 'suggest';
        /* WEAPON_CLASS → GETOBJ_SUGGEST only when not uslinging.
         * C dothrow.c:335-336 deliberately hides weapons while the sling is
         * wielded, leaving the ammo/gem candidates visible. */
        if ((obj.oclass | 0) === OCLASS_WEAPON)
            return thit_uslinging(u) ? 'downplay' : 'suggest';
        /* C dothrow.c:338-339 — while slinging, gems (including flint and
         * rocks) are the suggested ammunition candidates. */
        if (thit_uslinging(u) && (obj.oclass | 0) === OCLASS_GEM)
            return 'suggest';
        /* C dothrow.c:344-345 — a rock-thrower may suggest a boulder. */
        if (_st_throws_rocks(_hero_youmonst().data) && obj.otyp === _FW_BOULDER)
            return 'suggest';
        return 'downplay';
    };
    // C invent.c:1779-1825: getobj drains the active queue before prompting.
    const queuedThrow = await getobj_cmdq_drain(obj => !obj ? GETOBJ_EXCLUDE
        : _throw_ok_obj(obj) === 'suggest' ? GETOBJ_SUGGEST : GETOBJ_DOWNPLAY,
        GETOBJ_PROMPT | GETOBJ_ALLOWCNT);
    if (queuedThrow.drained)
        return queuedThrow.obj ? await throw_obj(queuedThrow.obj, shotlimit) : ECMD_CANCEL;
    let tbuf = '';
    /* C getobj keeps THREE strings, not one (invent.c:1866-1894): `buf`/`lets`
     * hold the GETOBJ_SUGGEST invlets and `altlets` the GETOBJ_DOWNPLAY ones.
     * Only `buf` is shown in the prompt bracket; `lets`/`altlets` are what the
     * '?' menu is restricted to (invent.c:1964/1970), and they are built from the
     * raw `otmp->invlet` (invent.c:1872) — which is why they cannot reuse `tbuf`,
     * whose coin entry is rewritten to '$' below. */
    let tLets = '', tAltlets = '';
    /* C invent.c:1856-1857 — getobj re-letters the pack under !fixinv before
     * collecting the candidate letters. */
    if (!_invlet_constant()) reassign();
    if (g.invent) {
        const _invletValue = (c) => (c >= 97 && c <= 122) ? (c - 97 + 2)
            : (c >= 65 && c <= 90) ? (c - 65 + 2 + 26)
            : (c === 36 /* '$' */) ? 1
            : (c === 35 /* '#' */) ? 1 + 52 + 1
            : 1 + 52 + 1 + 1;
        const _sorted = [];
        for (let o = g.invent; o; o = o.nobj) {
            /* C assigns gold the invlet GOLD_SYM ('$'); a freshly created coin
             * stack in this port can still carry invlet 0, so key the sort (and
             * the printed letter) off the class, exactly as the display does. */
            const isCoin = ((o.oclass | 0) === OCLASS_COIN);
            const let_ = isCoin ? 36 : (o.invlet | 0);
            _sorted.push({ o, let_, key: _invletValue(let_) });
        }
        /* C qsort over the whole list; ties keep C's relative order, which for
         * distinct invlets cannot arise. */
        _sorted.sort((a, b) => a.key - b.key);
        for (const ent of _sorted) {
            const o = ent.o;
            if (_throw_ok_obj(o) !== 'suggest') {
                tAltlets += String.fromCharCode(o.invlet | 0);
                continue;
            }
            tLets += String.fromCharCode(o.invlet | 0);
            tbuf += String.fromCharCode(ent.let_);
        }
    }
    /* C invent.c:1908-1909 — `if (suggested > 5) compactify(bp);` */
    const throwQbuf = tbuf.length > 0
        ? `What do you want to throw? [${tbuf.length > 5 ? compactify(tbuf) : tbuf} or ?*]`
        : 'What do you want to throw? [*]';
    const _resolveThrownObj = (code) => {
        if (code === 36 /* '$' */ && g.invent) {
            for (let o = g.invent; o; o = o.nobj)
                if ((o.oclass | 0) === OCLASS_COIN) return o;
        }
        if (g.invent) {
            for (let o = g.invent; o; o = o.nobj)
                if ((o.invlet | 0) === code) return o;
            return null;
        }
        /* C invent.c getobj resolves invlet only against invent.  An empty
         * chain cannot supply an object, including weapon-slot remnants. */
        return null;
    };
    /* quitchars = " \033\n\r" (space, ESC, LF, CR) — invent.c:1950. */
    const _isThrowQuit = (k) => k === 27 || k === 32 || k === 13 || k === 10;
    let thrownObj = null;
    let itemKey = 0;
    let itemCh = '';
    /* C invent.c:1771-1772 getobj locals: `cnt`/`cntgiven` are reset at the TOP
     * of each for(;;) pass (invent.c:1917-1918), so a count typed before a
     * rejected letter does not survive into the re-prompt. */
    let throwCnt = 0, throwCntGiven = false;
    /* C ref: invent.c:1779-1825 — getobj FIRST drains the command queue.  A
     * CMDQ_KEY entry supplies the invlet with NO prompt and NO nhgetch; that is
     * how iactions.c:227's cmdq_add_ec(dothrow) + cmdq_add_key(invlet) re-runs
     * the throw against the item the item-action menu picked.  A queued key that
     * resolves to nothing discards the rest of the queue (invent.c:1817) and
     * getobj returns NULL, which dothrow.c:374 turns into ECMD_CANCEL.
     * getObjFromGetobj (cmd.js:11137) carries the same drain for the commands
     * that route through it; dothrow now calls the shared queue reader above
     * before building its interactive prompt. */
    /* ── Throw prompt display + item nhgetch ── */
    if (!thrownObj) {
    /* C invent.c:1922-1930 — iflags.force_invmenu: no yn_function prompt; the
     * first pass feeds '?' (or '*' when nothing is suggested or downplayed)
     * into redo_menu and sets oneloop. */
    const throwForce = !!(g.iflags?.force_invmenu && !g.gi?.in_doagain);
    let throwOneloop = false;
    if (!throwForce) {
    g._pending_message = throwQbuf;
    await flush_screen(1);
    set_cursor(throwQbuf.length + 1, 0);
    }
    for (;;) {
        /* C invent.c:1917-1918 — the first two statements of the getobj loop. */
        throwCnt = 0;
        throwCntGiven = false;
        let itemRaw;
        if (throwForce && !throwOneloop) {
            throwOneloop = true;
            /* invent.c:1925-1927 — force_invmenu files the bare qbuf once */
            putmsghistory('What do you want to throw?', false);
            itemRaw = (tLets || tAltlets) ? 63 /* '?' */ : 42 /* '*' */;
        } else if (throwForce) {
            // C invent.c:1924-1926 retains ilet after a rejected count.
            itemRaw = itemKey;
        } else {
            /* C topl.c:425-427,534-539: suppress the unanswered prompt, then
             * remember prompt + key2txt(answer), including '?' and '*'. */
            // topl.c:424-425 custompline of query + space also updates gp.prevmsg
            // (pline.c:282), independently of the suppressed history entry.
            g._prevmsg = throwQbuf + ' ';
            const savedSuppress = g._topl_suppress_history;
            g._topl_suppress_history = true;
            try { itemRaw = game.iflags?.debug_fuzzer ? await readchar() : await nhgetch(); }
            finally { g._topl_suppress_history = savedSuppress; }
            putmsghistory(throwQbuf + ' ' + key2txt((typeof itemRaw === 'number'
                ? itemRaw : (itemRaw?.charCodeAt(0) ?? 0)) & 0xff), false);
        }
        g._topl_sticky = throwQbuf;
        itemKey = typeof itemRaw === 'number' ? itemRaw : (itemRaw?.charCodeAt(0) ?? 0);
        itemCh = String.fromCharCode(itemKey);
        /* C invent.c:1937-1948 — the DIGIT arm, which runs BEFORE the quitchar
         * test.  dothrow.c:371 passes GETOBJ_PROMPT | GETOBJ_ALLOWCNT, so a
         * digit here is a COUNT, not an invlet: get_count() swallows the rest of
         * the digit run and hands back the first non-digit key as the ilet.
         * Without this arm the digit fell straight into the invlet walk and
         * plined "You don't have that object.", which pages a --More-- C never
         * raised and so ate the acknowledgement keystroke too. */
        if (itemKey >= 48 /* '0' */ && itemKey <= 57 /* '9' */) {
            const gc = await getobj_get_count(itemKey);
            itemKey = gc.key | 0;
            itemCh = String.fromCharCode(itemKey);
            /* get_count's own reads cleared the fallback set above; row 0 now
             * physically holds its "Count: N" echo if it made one, and the
             * caller's prompt otherwise. */
            g._topl_sticky = gc.echo || throwQbuf;
            if (gc.count) {
                throwCnt = gc.count;
                throwCntGiven = true;
            }
        }
        /* C invent.c:1950-1953 — a quitchar cancels getobj, and speaks
         * Never_mind only `if (flags.verbose)`.  dothrow(NULL) = ECMD_CANCEL:
         * no turn, no throw RNG. */
        if (_isThrowQuit(itemKey)) {
            await getobj_never_mind(throwQbuf);
            g.context = g.context || {};
            g.context.move = 0;
            return ECMD_CANCEL;
        }
        /* C invent.c:1955-1959: throw_ok(NULL) excludes hands, so '-' mimes
         * the action and returns NULL; dothrow.c:374 cancels without a turn. */
        if (itemKey === 45 /* HANDS_SYM '-' */) {
            await mime_action('throw');
            g.context = g.context || {};
            g.context.move = 0;
            return ECMD_CANCEL;
        }
        /* C invent.c:1960-1999 `redo_menu` — '?' and '*' are NOT invlets.  C pops
         * display_pickinv (restricted to `lets` for '?', the whole pack for '*')
         * and adopts its answer as ilet before the invent walk at invent.c:2002.
         * Without this arm both keys fell into the "don't have that object"
         * re-loop below, which then ate the NEXT keystroke as the --More--
         * acknowledgement and shifted the whole keystream. */
        if (itemKey === 63 /* '?' */ || itemKey === 42 /* '*' */) {
            const menuCount = { count: -1 };
            itemKey = await getobj_redo_menu(itemKey, tLets, tAltlets, menuCount,
                                             { word: 'throw', allownone: false, buf: tbuf });
            // C invent.c:1996-1998 adopts the count returned by the menu.
            if (menuCount.count >= 0) {
                throwCnt = menuCount.count;
                throwCntGiven = true;
            }
            /* invent.c:1989-1993 — ESC: "Never mind." (already plined) → NULL →
             * dothrow's `obj ? throw_obj(...) : ECMD_CANCEL` (dothrow.c:374).
             * invent.c:1982-1984 — under oneloop an empty pick is NULL too. */
            if (itemKey === 27 || (itemKey === 0 && throwOneloop)) {
                g.context = g.context || {};
                g.context.move = 0;
                return ECMD_CANCEL;
            }
            itemCh = String.fromCharCode(itemKey);
            if (itemKey === 0) { /* invent.c:1982-1986 — re-prompt */
                g._pending_message = throwQbuf;
                await flush_screen(1);
                set_cursor(throwQbuf.length + 1, 0);
                continue;
            }
        }
        /* ── Determine thrown object ── */
        thrownObj = _resolveThrownObj(itemKey);
        if (throwCntGiven) {
            if (throwCnt === 0 || !thrownObj) {
                g.context = g.context || {};
                g.context.move = 0;
                return ECMD_CANCEL;
            }
            /* invent.c:2036-2045 — counts are permitted for throwing gold but
             * not for anything else, since throw_obj splits one item off
             * anyway.  Both messages re-prompt (`continue`), RNG-free. */
            const _coins = ((thrownObj.oclass | 0) === OCLASS_COIN);
            const _quan = thrownObj.quan ?? 1;
            if (throwCnt > 1 && (!_coins || throwCnt > _quan)) {
                const only_one = 'can only throw one at a time';
                let message;
                if (throwCnt > _quan)
                    message = `You only have ${_quan}${(!_coins && _quan > 1) ? ' and ' : ''}${(!_coins && _quan > 1) ? only_one : ''}.`;
                else
                    message = `You ${only_one}.`;
                if (throwForce) {
                    // C resets cnt, reuses ilet, then getdir pages this pline.
                    await pline(message);
                    continue;
                }
                await force_more(message);
                g._pending_message = throwQbuf;
                await flush_screen(1);
                set_cursor(throwQbuf.length + 1, 0);
                thrownObj = null;
                continue;
            }
        }
        // C invent.c:2049-2053: record the selection before splitting it.
        if (!g.disp) g.disp = {};
        g.disp.botl = 1;
        if (thrownObj && !g.gi?.in_doagain) {
            if (throwCntGiven && throwCnt > 0) cmdq_add_int(CQ_REPEAT, throwCnt);
            cmdq_add_key(CQ_REPEAT, itemKey);
        }
        if (throwCntGiven) {
            /* C invent.c:2077-2090 split_otmp: select the counted stack
             * BEFORE throw_obj tests its quantity for multishot. */
            if (throwCnt !== thrownObj.quan) {
                if (splittable(thrownObj))
                    thrownObj = await splitobj(thrownObj, throwCnt);
                else if (thrownObj.otyp === LOADSTONE && thrownObj.cursed)
                    thrownObj.corpsenm = throwCnt | 0;
            }
        }
        if (thrownObj) break;
        /* C invent.c:2058-2062 — !otmp → "You don't have that object." → the
         * topline more() acks it (dismiss key space/CR/LF/ESC; any other key
         * rings the bell and re-shows --More--), then getobj re-prompts and
         * re-reads.  RNG-free (force_more drives nhgetch only). */
        /* invent.c:2059 You() reaches pline.c:273-274 before more(),
         * painting the status update getobj just requested at :2049. */
        pline_flush_point();
        await force_more('You don\'t have that object.');
        g._pending_message = throwQbuf;
        await flush_screen(1);
        set_cursor(throwQbuf.length + 1, 0);
    }
    }
    /* C dothrow.c:374 — `return obj ? throw_obj(obj, shotlimit) : ECMD_CANCEL;`.
     * The !obj arm is the getobj loop's own `return ECMD_CANCEL` above. */
    return await throw_obj(thrownObj, shotlimit);
}

/* C ref: dothrow.c:1510-1843 throwit(obj, wep_mask, twoweap, oldslot) — the
 * flight, landing and aftermath of ONE thrown object.  Factored out of
 * throw_obj() (which still owns the split/freeinv transaction and calls this
 * with the already-detached `obj`) so dospit() (polyself.c:1450) and any other
 * C caller can reach it by name.  `st` is throw_obj()'s private view of the
 * pre-split stack (thrownObj is the PARENT stack, which this port's inlined
 * tail reads in several places); a direct caller passes none and `obj` is both.
 * Returns { thrownObj, throwResultMsg, early } for throw_obj()'s loop state. */
export async function throwit(obj, wep_mask, twoweap, oldslot, st = null) {
    const g = game;
    const u = g.u || {};
    const _landedObj = obj;
    let thrownObj = st ? st.thrownObj : obj;
    const _thrownSplits = st ? !!st.thrownSplits : false;
    const _coinWholeThrow = st ? !!st.coinWholeThrow : false;
    const _wholeObjectLeft = st ? !!st.wholeObjectLeft : true;
    const _throwWepMask = wep_mask | 0;
    const _throwTwoweap = !!twoweap;
    const _throwOldslot = oldslot || null;
    let _throwDx = u.dx | 0;
    let _throwDy = u.dy | 0;
    let throwResultMsg = null;
    if (!_coinWholeThrow) g.notonhead = (g.gn ||= {}).notonhead = false; // C dothrow.c:1525

    if (_coinWholeThrow && !u.uswallow && u.dz && _landedObj) {
        const _bx = u.ux | 0, _by = u.uy | 0;
        if (u.dz < 0 && !Is_airlevel(u.uz) && !_Underwater() && !Is_waterlevel(u.uz)) {
            await pline(`The gold hits the ${ceiling(_bx, _by)}, then falls back on top of your ${body_part(HEAD)}.`);
            if (u.uarmh)
                await pline(`Fortunately, you are wearing ${an(helm_simple_name(u.uarmh))}!`);
        }
        g.bhitpos = { x: _bx, y: _by };
        if (await flooreffects(_landedObj, _bx, _by, 'fall'))
            return { thrownObj: null, throwResultMsg, early: true };
        if (u.dz > 0)
            await pline(`The gold hits the ${surface(_bx, _by)}.`);
        _landedObj.where = 0;
        place_object(_landedObj, _bx, _by);
        if (u.ushops && u.ushops.length)
            await sellobj(_landedObj, _bx, _by);
        await stackobj(_landedObj);
        newsym(_bx, _by);
        return { thrownObj: _wholeObjectLeft ? null : thrownObj, throwResultMsg, early: true };
    }
    let _throwImpaired = _Blind_cmd()
        || ['CONFUSION', 'STUNNED', 'FUMBLING'].some(_uprop_active)
        || (_uprop_active('HALLUC') && !_uprop_active('HALLUC_RES'));
    if (!_coinWholeThrow && (thrownObj?.cursed || thrownObj?.greased)
        && (_throwDx !== 0 || _throwDy !== 0) && !rn2(7)) {
        const _slipObj = _thrownSplits ? newobj(thrownObj, { quan: 1 }) : thrownObj;
        let _slipok = true;
        if (ammo_and_launcher(_slipObj, u.uwep)) {
            await pline(`${_objnam_Tobjnam(_slipObj, 'misfire')}!`);
        } else {
            /* only slip if it's greased or meant to be thrown */
            if (_slipObj.greased || throwing_weapon(_slipObj))
                await pline(`${_objnam_Tobjnam(_slipObj, 'slip')} as you throw it!`);
            else
                _slipok = false;
        }
        if (_slipok) {
            _throwDx = rn2(3) - 1;
            _throwDy = rn2(3) - 1;
            /* dothrow.c:1541-1542 writes u.dx/u.dy directly; keep game.u in
             * sync the same way the initial getdir resolution above does. */
            u.dx = _throwDx;
            u.dy = _throwDy;
            if (!_throwDx && !_throwDy) u.dz = 1;
            _throwImpaired = true;
        }
    }
    // C throwit: exhausted throws fall straight down before trajectory selection.
    if (!_coinWholeThrow && _landedObj && (_throwDx || _throwDy || u.dz < 1)
        && calc_capacity(_landedObj.owt | 0) > SLT_ENCUMBER
        && (Upolyd(u) ? (u.mh < 5 && u.mh !== u.mhmax)
                     : (u.uhp < 10 && u.uhp !== u.uhpmax))
        && _landedObj.owt > (Upolyd(u) ? u.mh : u.uhp) * 2
        && !Is_airlevel(u.uz)) {
        await pline('You have so little stamina, %s drops from your grasp.', the(xname(_landedObj)));
        exercise(A_CON, false);
        _throwDx = u.dx = _throwDy = u.dy = 0;
        u.dz = 1;
    }
    /* C dothrow.c:1563 — every throw marks the object LOST_THROWN (pickup_thrown
     * relies on it), not only the up/down and swallowed arms. */
    if (_landedObj && !_coinWholeThrow) {
        g.thrownobj = _landedObj;
        /* C dothrow.c:1562: includes quivered coins; whole-stack gold skips throwit. */
        _landedObj.how_lost = LOST_THROWN;
        /* C dothrow.c:1564 — set for every throw, not only up/down. */
        g.iflags.returning_missile = throw_auto_return(_landedObj, _throwWepMask) ? _landedObj : null;
    }
    if (!u.uswallow && u.dz && _landedObj) {
        g.thrownobj = _landedObj;
        const returning = throw_auto_return(_landedObj, _throwWepMask);
        g.iflags.returning_missile = returning ? _landedObj : null;
        if (u.dz < 0 && returning && !_throwImpaired) {
            await pline('%s the %s and returns to your hand!',
                _objnam_Tobjnam(_landedObj, 'hit'), ceiling(u.ux, u.uy));
            await return_throw_to_inv(_landedObj, _throwWepMask, _throwTwoweap, _throwOldslot);
        } else if (u.dz < 0) {
            await toss_up(_landedObj, !!rn2(5) && !_Underwater());
        } else if (u.usteed && _landedObj.oclass === 8 && rn2(6)) {
            await potionhit(u.usteed, _landedObj, THIT_POTHIT_HERO_THROW);
        } else {
            await hitfloor(_landedObj, true);
        }
        g.iflags.returning_missile = null;
        g.thrownobj = null;
        if (_wholeObjectLeft) thrownObj = null;
        return { thrownObj, throwResultMsg, early: true };
    }
    /* C dothrow.c:1519/1523 — a tethered aklys's range is limited by its cord. */
    const _arw = thrownObj ? autoreturn_weapon(thrownObj) : null;
    const _tethered_weapon = !!(_arw && (_arw.tethered | 0)
                                && ((_throwWepMask | 0) & W_WEP_C) !== 0);
    /* C dothrow.c:1612-1614 — crossbow range is independent of strength.
     * P_CROSSBOW is 22 (skills.h; js/const.js:2697). */
    const _crossbowing = !!(thrownObj && ammo_and_launcher(thrownObj, u.uwep)
                            && weapon_type(u.uwep) === 22 /* P_CROSSBOW */);
    let _urange = Math.trunc((_crossbowing ? 18 : (acurrstr(u) | 0)) / 2);
    /* C dothrow.c:1621-1624 — obj->owt is the SPLIT-OFF single's weight, which
     * is what splitobj() (mkobj.c:481) stores and what the quan == 1 arm keeps
     * from inventory.  Same expression the landed object uses below. */
    const _throwOwt = !thrownObj ? 0
        : (_thrownSplits ? (weight(newobj(thrownObj, { quan: 1 })) | 0)
                         : (thrownObj.owt | 0));
    const _HEAVY_IRON_BALL_OTYP = 477; /* objects.h; OC_WEIGHT[477] === 480 */
    const _BOULDER_OTYP = 475;         /* objects.h; OC_WEIGHT[475] === 6000 */
    const _ART_MJOLLNIR = 3;           /* artilist.h ARTI_ENUM index */
    let _range = ((thrownObj?.otyp | 0) === _HEAVY_IRON_BALL_OTYP)
        ? _urange - Math.trunc(_throwOwt / 100)
        : _urange - Math.trunc(_throwOwt / 40);
    /* C dothrow.c:1626-1631 — balls are easy to throw or at least roll. */
    if (thrownObj && thrownObj === u.uball) {
        if (u.ustuck)
            _range = 1;
        else if (_range >= 5)
            _range = 5;
    }
    if (_range < 1)
        _range = 1;
    throwResultMsg = null;
    /* C dothrow.c:1568 — the range/by-hand arm is the final else; u.uswallow takes the first branch */
    if (thrownObj && is_ammo(thrownObj) && !u.uswallow) {
        if (ammo_and_launcher(thrownObj, u.uwep)) {
            if (_crossbowing)
                _range = BOLT_LIM;
            else
                _range++;
        } else if ((thrownObj.oclass | 0) !== OCLASS_GEM) {
            _range = Math.trunc(_range / 2);
            throwResultMsg = `You aren't wielding ${an(skill_name(weapon_type(thrownObj)))}, so you throw your ${weapon_descr(thrownObj)} by ${body_part(HAND)}.`;
            await pline(throwResultMsg);
        }
    }
    /* C dothrow.c:1653-1661 — action, reaction: on the air level or while
     * levitating the hero recoils, and the object's range is reduced by the
     * recoil.  The hurtle() that consumes _urange (dothrow.c:1679) is NOT
     * ported here — hurtle has no js/ body on this path — so the recoil's
     * effect on the RANGE is modelled and its effect on the HERO is not.  That
     * is strictly closer to C than the previous state (neither), and it is
     * flagged rather than faked. */
    if (Is_airlevel(u.uz) || _Levitation()) {
        _urange -= _range;
        if (_urange < 1)
            _urange = 1;
        _range -= _urange;
        if (_range < 1)
            _range = 1;
    }
    /* C dothrow.c:1662-1675 */
    if ((thrownObj?.otyp | 0) === _BOULDER_OTYP)
        _range = 20; /* you must be giant */
    else if (is_art(thrownObj, _ART_MJOLLNIR))
        _range = Math.trunc((_range + 1) / 2); /* it's heavy */
    else if (_tethered_weapon)
        _range = Math.min(_range, isqrt(_arw.range | 0));
    else if (thrownObj && thrownObj === u.uball && (u.utrap | 0)
             && (u.utraptype | 0) === TT_INFLOOR)
        _range = 1;
    if (_Underwater())
        _range = 1;
    /* C dothrow.c:2690: gold has no minimum, recoil or underwater adjustment. */
    if (_coinWholeThrow) _range = Math.trunc(acurrstr(u) / 2) - Math.trunc(_landedObj.owt / 40);
    const _COLNO = 80, _ROWNO = 21, _POOL = 16; /* C ZAP_POS: passable iff typ >= POOL */
    const _ux = (u.ux | 0), _uy = (u.uy | 0);
    /* C ref: zap.c bhit — bhitpos starts at the hero; each step advances by
     * (dx,dy) until !ZAP_POS(typ) or a closed door, then stops.  The rest
     * position is the last passable square, which is the hero's OWN tile when
     * the adjacent square in that direction is a wall. */
    let _lx = _ux, _ly = _uy;
    let _hitMon = null;
    let _boomerangHandled = false;
    let _boomerangGone = false;
    let _barsGone = false;
    /* C dothrow.c:1602-1615 — boomerangs use the dedicated curved
     * trajectory and return to the inventory only when caught.  The
     * generic throw walk below is for every other horizontal projectile;
     * letting a boomerang fall through it loses the curve, self-catch,
     * and boomerang-specific hit handling. */
    if ((_landedObj?.otyp | 0) === 26 && !u.uswallow && !u.dz && !_Underwater()) {
        game.thrownobj = _landedObj;
        /* C dothrow.c:1602-1603 — the boomerang's recoil comes BEFORE its
         * flight, at range 1 (not the generic arm's post-bhit urange). */
        if (Is_airlevel(u.uz) || _Levitation())
            await hurtle(-_throwDx, -_throwDy, 1, true);
        const _boomMon = await boomhit(_landedObj, _throwDx, _throwDy);
        g.iflags.returning_missile = null;
        _boomerangHandled = true;
        if (_boomMon === g.youmonst) {
            exercise(A_DEX, true);
            await return_throw_to_inv(_landedObj, _throwWepMask,
                                      _throwTwoweap, _throwOldslot);
            game.thrownobj = null;
            _boomerangGone = true;
        } else if (!game.thrownobj) {
            _boomerangGone = true;
        } else if (_boomMon) {
            /* C dothrow.c:1695 — boomhit returned a monster (nhits spent);
               throwit_mon_hit(obj, mon) gives it one more thitmonst. */
            _hitMon = _boomMon;
        }
        _lx = game.bhitpos?.x | 0;
        _ly = game.bhitpos?.y | 0;
    }
    /* C zap.c:3868 — physical throws open a transient missile animation.
     * obj_to_glyph() is display-RNG backed under hallucination, so this
     * call must precede the bhit walk even though the animation is short. */
    const _throwAnim = !!(!_boomerangHandled && !u.uswallow && thrownObj
        && (thrownObj.oclass | 0) !== 0
        && !u.dz
        && !((thrownObj.oclass | 0) === OCLASS_COIN && _coinWholeThrow && (() => {
            const _ox = _ux + _throwDx, _oy = _uy + _throwDy;
            if (_ox < 1 || _ox >= _COLNO || _oy < 0 || _oy >= _ROWNO) return true;
            const _ol = g.level?.locations?.[_ox]?.[_oy];
            return ((_ol?.typ ?? 0) | 0) < _POOL
                || ((_ol?.typ | 0) === 23 && !!(_ol?.doormask & 0x0c));
        })()));
    if (u.uswallow && u.ustuck) {
        if (_tethered_weapon)
            tmp_at(DISP_TETHER, obj_to_glyph(_landedObj));
        if (_landedObj === u.uball) {
            u.uball.ox = u.uchain.ox = u.ux;
            u.uball.oy = u.uchain.oy = u.uy;
        }
        /* C dothrow.c:1569-1577 — a swallowed throw does not follow the
         * requested direction through the map.  It targets the engulfer
         * directly, making thitmonst()'s engulfing_u() test a guaranteed
         * hit, and uses the monster's square for gn.notonhead. */
        _hitMon = u.ustuck;
        _lx = u.ustuck.mx | 0;
        _ly = u.ustuck.my | 0;
        if (_landedObj && (_landedObj.oclass | 0) !== 12)
            _landedObj.how_lost = LOST_THROWN;
    } else if (_throwAnim) {
        /* C zap.c:3862-3867 — a tethered aklys animates as DISP_TETHER, not
         * DISP_FLASH; the glyph it leaves on the last square is the one the
         * player sees while the kill's --More-- is up (dothrow.c:1523). */
        tmp_at(_tethered_weapon ? DISP_TETHER : DISP_FLASH, obj_to_glyph(thrownObj));
    }
    /* C dothrow.c:1674 — even a zero-vector throw runs bhit (for example,
     * spitting at yourself); each iteration checks the same square. */
    if (!_boomerangHandled && !u.uswallow && !u.dz && (!_coinWholeThrow || _throwAnim)) {
        /* C ref: zap.c:3870 `while (range-- > 0)` — bhitpos starts on the
         * hero's own square and advances by (ddx,ddy) at the TOP of the loop,
         * so an unobstructed throw travels exactly `range` squares.  This
         * bound used to be a bare `_step < 40`: a hand-picked cap standing in
         * for a range that was never computed, which let every thrown object
         * fly until it met a wall or a monster.  `_range` above is throwit's
         * (dothrow.c:1616-1675). */
        /* C zap.c:3837-3840 — thrown rocks may skip across pools.  The
         * random skip window is established before the first square; it
         * is part of the thrown-rock RNG stream even when no pool is
         * ultimately crossed. */
        const _skipRock = (thrownObj?.otyp | 0) === 474 /* ROCK */;
        let _skipStart = 0, _skipEnd = 0, _skipCount = 0;
        let _inSkip = false;
        let _allowSkip = false;
        // C zap.c:3579-3588 skiprange(), also called after each bounce.
        function _skiprange(range) {
            const _tr = Math.trunc(range / 4);
            const _tmp = range - (_tr > 0 ? rnd(_tr) : 0);
            _skipStart = _tmp;
            _skipEnd = _tmp - Math.trunc(_tmp / 4) * rnd(3);
            if (_skipEnd >= _tmp) _skipEnd = _tmp - 1;
        }
        if (_skipRock) {
            _skiprange(_range);
            _allowSkip = !rn2(3);
        }
        for (let _step = 0; _step < _range; _step++) {
            const _nx = _lx + _throwDx, _ny = _ly + _throwDy;
            if (_nx < 1 || _nx >= _COLNO || _ny < 0 || _ny >= _ROWNO) break;
            // C zap.c:3885-3890: catch digging tools before terrain/monster collisions.
            const catcher = is_pick(_landedObj) && inside_shop(_nx, _ny) && await shkcatch(_landedObj, _nx, _ny);
            if (catcher) { _hitMon = catcher; _lx = _nx; _ly = _ny; break; }
            const _loc = g.level?.locations?.[_nx]?.[_ny];
            const _typ = (_loc?.typ ?? 0) | 0;
            /* C zap.c:3894-3897 — a wall of water/lava stops items before the
             * transient light is shown. */
            if (IS_WATERWALL(_typ) || _typ === LAVAWALL) {
                /* bhitpos was advanced onto the wall square (zap.c:3874-3877)
                 * before the break, so the object is treated as landing there. */
                _lx = _nx; _ly = _ny;
                break;
            }
            /* C zap.c:3902-3903 — shown BEFORE the !ZAP_POS/closed_door break
             * (zap.c:4076), so a lit missile stopped by a wall still lights
             * the wall square's neighbours (a corridor beyond a doorway). */
            /* C zap.c:3902-3903 — a lit thrown object shows its light at
             * every square it reaches, the wall that stops it included (the
             * ZAP_POS stop is at the loop's far end, after this call). */
            if (_landedObj?.lamplit && !_vision_Blind()) {
                game.bhitpos = { x: _nx, y: _ny };
                await show_transient_light(_landedObj, _nx, _ny);
            }
            /* C zap.c:3898-3911 — iron bars stop what they can hold; the
             * rn2(5) squeeze-through roll is skipped for point-blank throws. */
            if (_typ === IRONBARS && _landedObj) {
                const _always = _step === 0 ? 0 : (!rn2(5) ? 1 : 0);
                if (hits_bars_mu(_landedObj, _always)) {
                    _barsGone = await hit_bars_hero(_landedObj, _lx, _ly, _nx, _ny, acurrstr(u));
                    break;
                }
            }
            _lx = _nx; _ly = _ny;
            /* C zap.c:3969 mtmp = m_at(x, y), then :3977-3989 — a shade the
             * missile passes harmlessly through, or a mimic pretending to be an
             * object (when the hero has not spotted a monster there), is not a
             * target and the beam keeps going. */
            let _m = m_at(_nx, _ny);
            /* C zap.c:3927-3940 — an unoccupied web can catch a physical
             * missile before rock skipping or monster collision handling. */
            const _web = t_at(_nx, _ny);
            if (!_m && _web && _web.ttyp === WEB && !rn2(3)) {
                if (cansee(_nx, _ny)) {
                    await pline('%s gets stuck in a web!', Yname2(_landedObj));
                    _web.tseen = true;
                    newsym(_nx, _ny);
                }
                g.iflags.returning_missile = null;
                break;
            }
            if (_skipRock && _skipStart && (_range - _step - 1) === _skipStart
                && _allowSkip) {
                if (is_pool(_nx, _ny) && !_m) {
                    _inSkip = true;
                    /* C zap.c:3946-3951 — obj is the split-off single rock */
                    if (!_vision_Blind())
                        await pline(`${Yname2(_landedObj)} ${otense(_landedObj, 'skip')}${_skipCount ? ' again' : ''}.`);
                    else
                        await You_hear('%s skip.', yname(_landedObj));
                    _skipCount++;
                } else if (_skipStart > _skipEnd + 1) {
                    --_skipStart;
                }
            }
            if (_inSkip) {
                if ((_range - _step - 1) <= _skipEnd) {
                    _inSkip = false;
                    // C zap.c:3960-3963: range was decremented on loop entry.
                    if ((_range - _step - 1) > 3)
                        _skiprange(_range - _step - 1);
                } else if (_m && (((_m.data?.mlet | 0) === 57 /* S_EEL */)
                                  || ((_m.data?.mflags1 | 0) & 0x602) /* cant_drown */)) {
                    /* C zap.c:61 M_IN_WATER, :3964-3969 */
                    if (!_vision_Blind() && canspotmon(_m))
                        await pline('%s %s over %s.', Yname2(_landedObj),
                                    otense(_landedObj, 'pass'), mon_nam(_m));
                    _m = null;
                }
            }
            /* C zap.c:3983-3992: test the single missile after skipping;
             * throw_obj's remaining inventory stack is not the flying obj. */
            if (_m && (shade_miss(game.youmonst, _m, _landedObj, true, true)
                       || (M_AP_TYPE(_m) === M_AP_OBJECT
                           && !(_glyph_at(_nx, _ny)?.cls === GLYPHCLS_MON)
                           && !glyph_is_warning_at(_nx, _ny)
                           && !glyph_is_invisible_at(_nx, _ny))))
                _m = null;
            if (_m) {
                /* C zap.c:4021-4028 — THROWN_WEAPON stops here and reveals an
                 * unseen monster's square. */
                if (cansee(_nx, _ny) && !canspotmon(_m))
                    map_invisible(_nx, _ny);
                _hitMon = _m;
                break;
            }
            /* C zap.c:4076-4080 — the !ZAP_POS/closed_door stop comes AFTER
             * the monster check, so a wall-phaser inside rock is still hit;
             * bhitpos backs up one step. */
            if (_typ < _POOL
                || (_typ === 23 && (_loc?.doormask & 0x0c))) {
                _lx = _nx - _throwDx; _ly = _ny - _throwDy;
                break;
            }
            /* C zap.c:4087 — paint each traversed square after the
             * collision checks.  This is display state only; the glyph
             * draw above is the RNG-relevant part.
             * C zap.c:4082-4086 — 'I' present but no monster: erase; do this
             * before tmp_at(). */
            if (glyph_is_invisible_at(_lx, _ly) && cansee(_lx, _ly)) {
                unmap_object(_lx, _ly);
                newsym(_lx, _ly);
            }
            tmp_at(_lx, _ly);
            /* C zap.c:4092-4093 — `if (IS_SINK(typ) && weapon != FLASHED_LIGHT)
             * break;`: physical objects fall onto a sink and stop there. */
            if (IS_SINK(_typ))
                break;
            // C zap.c:4096-4120: stop a ball before it pulls the hero illegally.
            if (_step + 1 < _range && thrownObj?.otyp === _HEAVY_IRON_BALL_OTYP) {
                const boulder = sobj_at(_BOULDER_OTYP, _nx, _ny);
                if (boulder) {
                    if (cansee(_nx, _ny))
                        await pline('%s hits %s.', The(await _fw_distant_name(thrownObj, xname)), an(xname(boulder)));
                    break;
                } else if (thrownObj === u.uball) {
                    if (!test_move(_nx - _throwDx, _ny - _throwDy, _throwDx, _throwDy, TEST_MOVE)) {
                        if (cansee(_nx, _ny))
                            await pline('%s jerks to an abrupt halt.', The(await _fw_distant_name(thrownObj, xname)));
                        break;
                    } else if (g.level.flags.sokoban_rules) {
                        const trap = t_at(_nx, _ny);
                        if (trap && (is_pit(trap.ttyp) || is_hole(trap.ttyp)))
                            break;
                    }
                }
            }
        }
    }
    /* C zap.c:4023 and :4125 — a tethered weapon keeps its DISP_TETHER
     * animation up past the bhit walk; throwit ends it itself (dothrow.c:1700,
     * 1711, 1748). */
    game.bhitpos = (game.gb ||= {}).bhitpos = { x: _lx, y: _ly };
    if (_throwAnim && !_tethered_weapon)
        tmp_at(DISP_END, 0);
    await _transient_light_cleanup(); /* zap.c:4135-4136 */
    /* C dothrow.c:1678-1680 — after bhit() (so u.ux/u.uy are correct) the
     * hero recoils: action, reaction. */
    /* throw_gold() (dothrow.c:2656) never reaches throwit()'s recoil. */
    if (!_coinWholeThrow && !_boomerangHandled && !u.uswallow && (Is_airlevel(u.uz) || _Levitation()))
        await hurtle(-_throwDx, -_throwDy, _urange, true);

    let _objGone = _boomerangGone || _barsGone;
    if (_barsGone && _tethered_weapon) tmp_at(DISP_END, 0);
    if (_hitMon && _landedObj) {
        /* C zap.c:3874-3877: bhit leaves gb.bhitpos at the impact square.
         * passive_obj's erode_obj uses that position for visibility
         * (trap.c:199-201), so publish it to the shared C globals too. */
        game.bhitpos = (game.gb ||= {}).bhitpos = { x: _lx, y: _ly };
        if (u.uswallow && (_landedObj.oclass | 0) === OCLASS_COIN && _coinWholeThrow) {
            /* C dothrow.c:2671-2680 throw_gold() has its own swallowed
             * arm: no ghitm()/wakeup roll, and whirly monsters don't add
             * "currents" here (only digesters add "entrails").
             * Quivered coins use throwit/thitmonst instead (C:112). */
            let swallower = mon_nam(u.ustuck);
            if (_digests(u.ustuck.data))
                swallower = `${s_suffix(swallower)} entrails`;
            await pline(`The gold disappears into ${swallower}.`);
            await add_to_minv(u.ustuck, _landedObj);
            _objGone = true;
            game.thrownobj = null;
        } else if ((_landedObj.oclass | 0) === OCLASS_COIN && _coinWholeThrow) {
            /* C dothrow.c:112 `obj != uquiver` — a quivered coin is fired one at a
             * time through thitmonst's rnd(20), not throw_gold.
             * C dothrow.c:112/throw_gold -> ghitm: gold is handled by
             * the special gold path, so it never enters thitmonst's
             * rnd(20) to-hit roll.  A non-greedy monster wakes and the
             * coin misses; the target is named only when visible. */
            if (await dokick_ghitm(_hitMon, _landedObj)) {
                _objGone = true; /* caught: dothrow.c:2711 returns ECMD_TIME */
                game.thrownobj = null;
            }
        } else {
            game.thrownobj = _landedObj;
            if (await throwit_mon_hit(_landedObj, _hitMon)) {
                g.iflags.returning_missile = game.thrownobj = null;
                return { thrownObj, throwResultMsg, early: true };
            }
            _objGone = !game.thrownobj;
            /* C dothrow.c:1699-1700 — `if (!gt.thrownobj) { if (tethered_weapon)
             * tmp_at(DISP_END, 0); }` */
            if (_objGone && _tethered_weapon)
                tmp_at(DISP_END, 0);
            /* C keeps gt.thrownobj set when the missile survives the hit:
             * the returning-missile tail (dothrow.c:1708) keys on it. */
        }
    }
    if (_coinWholeThrow) {
        if (!_objGone && (_hitMon || !_throwAnim || !(await ship_object(_landedObj, _lx, _ly, false)))
            && !(await flooreffects(_landedObj, _lx, _ly, 'fall'))) {
            place_object(_landedObj, _lx, _ly);
            if (u.ushops?.length) await sellobj(_landedObj, _lx, _ly);
            await stackobj(_landedObj);
            newsym(_lx, _ly);
        }
        return { thrownObj: null, throwResultMsg, early: true };
    }
    /* C dothrow.c:1704-1706 — an ordinary projectile which remains after
     * hitting the engulfer is swallowed into its inventory rather than
     * tested for breakage or placed on the level.  mpickobj() performs the
     * same add_to_minv bookkeeping as C's swallowit(). */
    if (u.uswallow && u.ustuck && _landedObj && !_objGone
        && !g.iflags.returning_missile) {
        if (_landedObj !== u.uball)
            await mpickobj(u.ustuck, _landedObj);
        _objGone = true;
        game.thrownobj = null;
        g.iflags.returning_missile = null;
    }
    /* C ref: dothrow.c:1708-1771 — a returning missile (Mjollnir wielded by a
     * Valkyrie, aklys) that reached its target square: rn2(100) decides
     * whether it flies back at all, a second rn2(100) (skipped when impaired)
     * whether it is caught.  This tail only had the up/down arm of the
     * return (above), so every horizontal Mjollnir throw skipped both draws. */
    /* A swallowed hero keeps returning_missile for a thrown boomerang too (the
     * boomhit arm needs !uswallow): dothrow.c:1704 swallowit() only fires when
     * !returning_missile, so C falls into this tail (rn2(100) pair, :1711/:1717). */
    let _mjolnirDone = false;
    if (g.iflags.returning_missile && _landedObj && !_objGone && game.thrownobj
        && (!_boomerangHandled || u.uswallow)) {
        if (rn2(100)) {
            /* C dothrow.c:1711 — a tethered return backtracks its tether
             * animation; sho_obj_return_to_u is the untethered flight. */
            if (_tethered_weapon) tmp_at(DISP_END, BACKTRACK);
            else if ((_throwDx || _throwDy) && (_lx !== u.ux || _ly !== u.uy)) {
                tmp_at(DISP_FLASH, obj_to_glyph(_landedObj));
                for (let x = _lx - _throwDx, y = _ly - _throwDy;
                     isok(x, y) && (x !== u.ux || y !== u.uy); x -= _throwDx, y -= _throwDy) {
                    tmp_at(x, y);
                    nh_delay_output();
                }
                tmp_at(DISP_END, 0);
            }
            if (!_throwImpaired && rn2(100)) {
                await pline('%s to your hand!', _objnam_Tobjnam(_landedObj, 'return'));
                /* C dothrow.c:1718-1726 is NOT return_throw_to_inv: it always
                 * wields the caught missile (so a swallowed hero's quivered
                 * boomerang comes back as uwep). */
                const _caught = await addinv_before(_landedObj, _throwOldslot);
                await encumber_msg();
                if (_caught.owornmask & W_QUIVER_C) await setuqwep(null);
                await setuwep(_caught);
                set_twoweap(_throwTwoweap);
                if (cansee(_lx, _ly)) newsym(_lx, _ly);
                _mjolnirDone = true;
            } else {
                /* C dothrow.c:1731-1759 — the missile comes back but is not
                 * caught: it lands at the hero's feet or hits the hero's arm.
                 * (sho_obj_return_to_u's flight display is display-only.) */
                let dmg = rn2(2);
                const _blindNow = _Blind_cmd();
                if (!dmg) {
                    await pline(_blindNow ? '%s lands %s your %s.'
                                          : '%s back to you, landing %s your %s.',
                        _blindNow ? 'Something' : _objnam_Tobjnam(_landedObj, 'return'),
                        _Levitation() ? 'beneath' : 'at',
                        makeplural_objnam(body_part(FOOT)));
                } else {
                    dmg += rnd(3);
                    await pline(_blindNow ? '%s your %s!' : '%s back toward you, hitting your %s!',
                        _objnam_Tobjnam(_landedObj, _blindNow ? 'hit' : 'fly'),
                        body_part(ARM));
                    if (_landedObj.oartifact)
                        dmg = (await artifact_hit(null, null, _landedObj, dmg, 0)).dmg;
                    await losehp(flooreffects_Maybe_Half_Phys(dmg), killer_xname(_landedObj), KILLED_BY);
                }
                if (u.uswallow) {
                    if (_landedObj !== u.uball) await mpickobj(u.ustuck, _landedObj);
                } else if (!(await ship_object(_landedObj, u.ux, u.uy, false)))
                    await dropy(_landedObj);
                _mjolnirDone = true;
            }
        } else {
            /* C dothrow.c:1748 — a failed tethered return ends the tether. */
            if (_tethered_weapon) tmp_at(DISP_END, 0);
            await pline('%s to return!', _objnam_Tobjnam(_landedObj, 'fail'));
            if (u.uswallow) {
                if (_landedObj !== u.uball) await mpickobj(u.ustuck, _landedObj);
                _mjolnirDone = true;
            }
        }
        if (_mjolnirDone) {
            g.iflags.returning_missile = null;
            game.thrownobj = null;
            _objGone = true;
        }
    }
    const _restLoc = g.level?.locations?.[_lx]?.[_ly];
    const _restTyp = (_restLoc?.typ ?? 0) | 0;
    /* C rm.h:140 IS_SOFT(typ) = AIR || CLOUD || IS_POOL(typ), and rm.h:129
     * IS_POOL(typ) = POOL(16) <= typ <= DRAWBRIDGE_UP(19) — lava (20/21) is
     * NOT soft. */
    const _isSoftRest = (_restTyp === 35 /* AIR */ || _restTyp === 36 /* CLOUD */
                         || (_restTyp >= 16 /* POOL */ && _restTyp <= 19 /* DRAWBRIDGE_UP */));
    const _VENOM_CLASS = 17;  /* objclass.h VENOM_CLASS */
    const _isVenomRest = (_landedObj?.oclass | 0) === _VENOM_CLASS;
    let _broke = _landedObj && !_objGone && !_coinWholeThrow
        && ((!_isSoftRest && breaktest(_landedObj)) || _isVenomRest);
    if (_broke) {
        /* C dothrow.c:1784-1787 — the breakage flash: obj_to_glyph() draws
         * the display rng (random_object) while hallucinating. */
        tmp_at(DISP_FLASH, obj_to_glyph(_landedObj));
        tmp_at(_lx, _ly);
        nh_delay_output();
        tmp_at(DISP_END, 0);
        await _throwit_breakmsg(_landedObj, cansee(_lx, _ly));
        _broke = await _throwit_breakobj(_landedObj, _lx, _ly);
    }
    /* throw_gold (dothrow.c:2656-2729) has no Splash!/Plop! sound effect. */
    if (_landedObj && !_objGone && !_broke && !_hero_Deaf() && !Underwater()) {
        if (is_pool(_lx, _ly)
            || (is_lava(_lx, _ly) && !is_flammable(_landedObj))) {
            await pline((weight(_landedObj) > WT_SPLASH_THRESHOLD)
                ? 'Splash!' : 'Plop!');
        }
    }
    const _floorConsumed = (_landedObj && !_objGone && !_broke)
        ? await flooreffects(_landedObj, _lx, _ly, 'fall')
        : false;
    let _shipped = false;
    if (_landedObj && !_objGone && !_broke && !_floorConsumed) {
        await obj_no_longer_held(_landedObj); // C dothrow.c:1808
        if (_hitMon?.isshk && is_pick(_landedObj)) {
            if (cansee(_lx, _ly))
                await pline('%s snatches up %s.', Monnam(_hitMon), the(xname(_landedObj)));
            if ((u.ushops && u.ushops.length) || _landedObj.unpaid)
                await check_shop_obj_throw(_landedObj, _lx, _ly, false);
            await mpickobj(_hitMon, _landedObj);
            g.iflags.returning_missile = game.thrownobj = null;
            return { thrownObj, throwResultMsg, early: true };
        }
        await snuff_candle(_landedObj);
        /* C dothrow.c:1819 `if (!mon && ship_object(...))` — a missile that
         * met a monster (and missed) is never offered to ship_object. */
        _shipped = !_hitMon && !!(await ship_object(_landedObj, _lx, _ly, false));
    }
    if (_landedObj && !_objGone && !_broke && !_floorConsumed && !_shipped) {
        /* C ref: dothrow.c:1825-1843 place_object + stackobj + newsym.  C does
         * NOT skip a rest position equal to the hero's own tile. */
        game.thrownobj = null; // C dothrow.c:1823: after shopkeeper/ship handling.
        await obj_no_longer_held(_landedObj); // C mkobj.c:2333 place_object
        place_object(_landedObj, _lx, _ly);
        /* C dothrow.c:1826-1832 — container contents might break; <x,y> is
         * the spot where the throw was initiated (u.ux,u.uy), not bhitpos. */
        if (!_isSoftRest)
            await container_impact_dmg(_landedObj, u.ux | 0, u.uy | 0);
        if (!_isSoftRest)
            impact_disturbs_zombies(_landedObj, true);
        if (((game.u.ushops && game.u.ushops.length) || _landedObj.unpaid) && _landedObj !== u.uball)
            await check_shop_obj_throw(_landedObj, _lx, _ly, false);
        await stackobj(_landedObj);
        /* C dothrow.c:1839-1840 — a thrown ball lands: drop_ball() releases
         * the chain and drags the hero toward it ("The ball pulls you out of
         * the lava!"). */
        if (_landedObj === u.uball)
            await drop_ball(_lx, _ly);
        /* C dothrow.c:1841: quivered coins use throwit, including cansee.
         * Whole-stack throw_gold already returned through its own tail. */
        if (cansee(_lx, _ly))
            newsym(_lx, _ly);
        if (obj_is_burning(_landedObj)) g.vision_full_recalc = 1;
    }
    // C's consumed/shipped-object returns use throwit_return(TRUE).
    game.thrownobj = null;
    g.iflags.returning_missile = null;
    return { thrownObj, throwResultMsg, early: false };
}

/* C ref: dothrow.c:87-286 throw_obj(struct obj *obj, int shotlimit) — "Throw
 * the selected object, asking for direction".  THE ONE BODY BOTH COMMANDS
 * SHARE.  C has exactly one throw_obj(); dothrow() reaches it after getobj()
 * picks the object and dofire() after the quiver/fireassist ladder picks it
 * (dothrow.c:374 and :581 are the two call sites, and they differ only in how
 * `obj` was obtained).  This port had TWO bodies: dothrow()'s, hand-inlined
 * here, and dofire()'s private _fire_direction() — a second getdir, a second
 * trajectory walk and a second idea of what happens to the object.
 *
 * Everything from C's getdir() onward lives here, including the throwit()
 * (dothrow.c:1510) tail that this port inlines rather than splitting out,
 * because throwit's landing bookkeeping and throw_obj's split/freeinv are one
 * transaction in this port's object model.
 *
 * `opts` carries the DISPLAY-ONLY differences dofire() needs at the getdir
 * prompt and nothing else — `noPrompt` retains a committed frame across the
 * getdir read instead of repainting it; see _fire_throw_obj(). */
async function throw_obj(thrownObj, shotlimit, opts = {}) {
    const g = game;
    const u = g.u || {};
    const save_osplit = { ...g.context?.objsplit };
    try {
    if (!(await getdir(null, { noPrompt: !!opts.noPrompt }))) {
        /* C dothrow.c:98-100 — ECMD_CANCEL, no time passes.  The key is
         * CONSUMED here; it must not be re-dispatched to rhack. */
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_CANCEL;
    }
    /* getdir() has written u.dx/u.dy/u.dz (the GLOBAL hero struct C's throwit()
     * reads and writes throughout — dothrow.c:133, 1445-1453, 1526, 1541-1558,
     * 1603-1604, 1674, 1682, 2661, 2699-2706) and has already run its
     * confdir(FALSE) tail, so these mirrors are the POST-confdir direction.
     * `let`, not `const`: throwit()'s cursed/greased slip arm (dothrow.c:1540)
     * reassigns u.dx/u.dy after the direction has been resolved. */
    let _throwDx = u.dx | 0;
    let _throwDy = u.dy | 0;
    /* C dothrow.c:2661-2669: gold refusal; finally restores a split stack. */
    if ((thrownObj.oclass | 0) === OCLASS_COIN && thrownObj !== u.uquiver
        && !u.dx && !u.dy && !u.dz) {
        await You('cannot throw gold at yourself.');
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_CANCEL;
    }
    /* C dothrow.c:112-116: throw_gold returns before all weapon/volley
     * bookkeeping and owns its stack; only its self-throw can unsplit it.
     * throwit's whole-gold arm implements throw_gold's flight and landing. */
    if ((thrownObj.oclass | 0) === OCLASS_COIN && thrownObj !== u.uquiver) {
        const gold = thrownObj;
        thrownObj = null;
        await freeinv(gold);
        await throwit(gold, 0, false, null, {
            thrownObj: gold, coinWholeThrow: true, wholeObjectLeft: true,
        });
        return ECMD_TIME;
    }
    /* C ref: dothrow.c:118-121 — the SECOND non-empty-`word` canletgo() caller,
     * missing here for the same reason it was missing from drop():
     *     if (!canletgo(obj, "throw")) {
     *         res = ECMD_OK;
     *         goto unsplit_stack;
     *     }
     * ECMD_OK is a NO-TIME return, and it is reached AFTER getdir() (the
     * direction prompt above is C's getdir at dothrow.c:96) and after the
     * COIN_CLASS/throw_gold branch at :112 — canletgo is TRUE for coins, so
     * the unported throw_gold arm does not change what this test decides.
     * Without it, throwing a worn ring or a welded weapon threw it, spent a
     * turn, and drew the next_ident/breaktest leaves below. */
    if (!canletgo(thrownObj, 'throw')) {
        g.context = g.context || {};
        g.context.move = 0;   /* C ECMD_OK — no time passes */
        return ECMD_OK;
    }
    /* C dothrow.c:122-126 — Mjollnir must be wielded to be thrown (ART_MJOLLNIR
     * is artilist index 3); ECMD_OK, no time. */
    if ((thrownObj.oartifact | 0) === 3 && thrownObj !== u.uwep) {
        await pline(`${The(_fw_xname(thrownObj))} must be wielded before it can be thrown.`);
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    /* C dothrow.c:127-131 — Mjollnir without STR 18/** (STR19(25)), or any
     * boulder thrown by a non-rock-thrower: "It's too heavy." and the
     * attempt costs a turn (ECMD_TIME). */
    if (((thrownObj.oartifact | 0) === 3 && acurr(u, A_STR) < 125)
        || ((thrownObj.otyp | 0) === _FW_BOULDER
            && !_st_throws_rocks(_hero_youmonst().data))) {
        await pline("It's too heavy.");
        return ECMD_TIME;
    }
    if (!u.dx && !u.dy && !u.dz) {
        await pline('You cannot throw an object at yourself.');
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    /* C dothrow.c:138 — a successful throw attempt scuffs the engraving
     * under the hero before multishot setup or splitobj's next_ident draw. */
    /* A whole-stack coin throw returned through throw_gold() at dothrow.c:112,
     * before this u_wipe_engr(2), so it never scuffs the engraving. */
    if (!((thrownObj.oclass | 0) === 12 /* COIN_CLASS */ && thrownObj !== u.uquiver)
        && can_reach_floor(true))
        wipe_engr_at(u.ux | 0, u.uy | 0, 2, false);
    /* C dothrow.c:139-157: bare-handed petrification, then towel drying. */
    if (!u.uarmg && thrownObj.otyp === THIT_CORPSE
        && sr_touch_petrifies_ptr(permonstTemplate(thrownObj.corpsenm))
        && !_uprop_active('STONE_RES')) {
        await You('throw %s with your bare %s.', corpse_xname(thrownObj, null, 4 /* CXN_PFX_THE */), makeplural_objnam(body_part(HAND)));
        const killer = ((g.svk ||= {}).killer ||= {});
        killer.name = `throwing ${killer_xname(thrownObj)} bare-handed`;
        await instapetrify(killer.name);
    }
    if (!((thrownObj.oclass | 0) === OCLASS_COIN && thrownObj !== u.uquiver) && welded(thrownObj)) {
        await weldmsg(thrownObj);
        return ECMD_TIME;
    }
    if (is_wet_towel(thrownObj))
        await dry_a_towel(thrownObj, -1, false);
    u._oldcap = near_capacity();
    /* C ref: dothrow.c:240-274 — the multishot ROLL, the volley message and
     * THE LOOP.  `multishot` is C's local; _throw_obj_multishot() is
     * dothrow.c:161-238 factored out because both this body and (before this
     * commit) dofire()'s private copy needed it.
     *
     * THE LOOP IS THE POINT OF THIS COMMIT.  C runs the whole
     * split/freeinv/throwit/encumber_msg transaction `multishot` times
     * (dothrow.c:254-274); this body ran it exactly ONCE and named that as a
     * GAP in the comment it replaces, while dofire()'s _fire_direction ran a
     * loop over a much cruder per-shot body.  Unifying the two onto one
     * throw_obj means the loop and the good body finally meet. */
    const multishot = _throw_obj_multishot(thrownObj, u.uwep, shotlimit);
    /* C dothrow.c:240 `gm.m_shot.s = ammo_and_launcher(obj, uwep) ? TRUE : FALSE;`
     * — SHOOTING (launcher wielded) vs THROWING, read by endmultishot()
     * (dothrow.c:592, js/cmd.js) and by the message below.  m_shot is shared
     * state: js/objnam.js:4643 mshot_xname() turns the 2nd..Nth object of a
     * volley into "the second dagger", and js/cmd.js endmultishot() truncates
     * the volley when the target dies. */
    g.gm = g.gm || {};
    g.gm.m_shot = g.gm.m_shot || { i: 0, n: 0, o: 0, s: false };
    g.gm.m_shot.s = ammo_and_launcher(thrownObj, u.uwep) ? true : false;
    /* C dothrow.c:243-249 — "You shoot N arrows." / "You throw N daggers.".
     *     if (multishot > 1 || shotlimit > 0)
     *         You("%s %d %s.", gm.m_shot.s ? "shoot" : "throw", multishot,
     *             (multishot == 1) ? singular(obj, xname) : xname(obj));
     * dofire()'s copy of this line built the object name from a WEAPON_NAME
     * table plus a literal 's'; this one is C's own xname()/singular(). */
    if (!((thrownObj.oclass | 0) === OCLASS_COIN && thrownObj !== u.uquiver)
        && (multishot > 1 || shotlimit > 0)) {
        const _shotName = (multishot === 1)
            ? (await singular(thrownObj, _fw_xname)) : _fw_xname(thrownObj);
        await pline(`You ${g.gm.m_shot.s ? 'shoot' : 'throw'} ${multishot} ${_shotName}.`);
    }
    const _throwWepMask = (thrownObj?.owornmask | 0);
    let _throwOldslot = null;
    g.gm.m_shot.o = (thrownObj?.otyp | 0);
    g.gm.m_shot.n = multishot;
    /* throwit()'s pline needs `throwResultMsg` to outlive the loop. */
    let throwResultMsg = null;
    /* C dothrow.c:254 `for (gm.m_shot.i = 1; gm.m_shot.i <= gm.m_shot.n; gm.m_shot.i++)`.
     * The bound is re-read every iteration on purpose: endmultishot() sets
     * m_shot.n = m_shot.i to end the volley early when the target dies. */
    for (g.gm.m_shot.i = 1; g.gm.m_shot.i <= (g.gm.m_shot.n | 0); g.gm.m_shot.i++) {
        const _throwTwoweap = !!u.twoweap; // C dothrow.c:254, snapshot each shot.
        /* C dothrow.c:256 `assert(obj != NULL); /* m_shot.i <= m_shot.n guarantees this *\/`
         * — C's guarantee is multishot <= obj->quan (dothrow.c:234).  This port
         * treats an ABSENT quan as "multiple" (_throw_obj_multishot's synthetic
         * Ranger-arrow fallback), which C never has, so the guarantee can fail
         * here.  Stopping is the honest expression of C's assert; fabricating a
         * further shot out of an object that has left the pack is not. */
        if (!thrownObj)
            break;
        if (g.context == null)
            g.context = {};
        if (g.context.ident == null)
            g.context.ident = 2; /* id 1 reserved */
        const _thrownQuan = thrownObj ? thrownObj.quan : undefined;
        const _coinWholeThrow = ((thrownObj?.oclass | 0) === OCLASS_COIN && thrownObj !== u.uquiver);
        const _thrownSplits = !_coinWholeThrow && (_thrownQuan === undefined || (_thrownQuan | 0) > 1);
        let _thrownOid = g.context.ident;
        if (_thrownSplits) {
            _thrownOid = (await splitobj(thrownObj, 1)).o_id;
        }
        /* C dothrow.c:257-265 — which arm of the split the shot takes.  The
         * `else` arm is C's `otmp = obj; ...; obj = 0;`, so it is also the
         * signal to clear `thrownObj` at the bottom of this iteration. */
        const _wholeObjectLeft = !(thrownObj && _thrownSplits && (_thrownQuan | 0) > 1);
        if (thrownObj && _thrownSplits && (_thrownQuan | 0) > 1) {
            /* splitobj()'s effect on the PARENT stack (mkobj.c:478-480). */
            thrownObj.owt = weight(thrownObj);
            g.context.objsplit = { parent_oid: thrownObj.o_id, child_oid: _thrownOid };
        } else if (thrownObj) {
            /* C dothrow.c:260-269 — the whole object leaves the pack.
             * remove_worn_item() is imported from js/steal.js under an alias
             * because this file ALSO declares a local no-op `remove_worn_item`
             * stub (js/cmd.js:34618) that would shadow it; the real body is the
             * one C calls here. */
            if (thrownObj.owornmask)
                await _remove_worn_item_thrown(thrownObj, false);
            _throwOldslot = thrownObj.nobj || null;
        }
        const _landedObj = !thrownObj ? null
            : !_thrownSplits
            /* C dothrow.c:261 `otmp = obj` — the SAME object. No copy or overrides: it
             * keeps its o_id, its timers, its lamplit flag and every
             * identification field it carried in the pack. */
            ? thrownObj
            : thrownObj.nobj; /* splitobj links the new stack after its parent. */
        await freeinv(_landedObj); /* C dothrow.c:269, for either stack arm. */
        const _ti = await throwit(_landedObj, _throwWepMask, _throwTwoweap, _throwOldslot, {
            thrownObj, thrownSplits: _thrownSplits, coinWholeThrow: _coinWholeThrow,
            wholeObjectLeft: _wholeObjectLeft,
        });
        thrownObj = _ti.thrownObj;
        if (_ti.early) {
            if (!_coinWholeThrow) await encumber_msg();
            if (_wholeObjectLeft) thrownObj = null;
            continue;
        }
        throwResultMsg = _ti.throwResultMsg;
        await encumber_msg();
        /* C dothrow.c:260-265 — the non-split arm ends with `obj = 0;`: the
         * whole object has left the pack and there is nothing left to split
         * from on a later shot. */
        if (_wholeObjectLeft)
            thrownObj = null;
    }
    /* C dothrow.c:275-278 — reset the volley state. */
    g.gm.m_shot.n = g.gm.m_shot.i = 0;
    g.gm.m_shot.o = 0; /* STRANGE_OBJECT */
    g.gm.m_shot.s = false;
    if (throwResultMsg) {
        g._resultMessage = g._pending_message || throwResultMsg;
        /* Carry the join offsets with the text (as allmain.js/teleport.js do),
         * or the restored line is one atomic pline and never pages at C's
         * update_topl overflow points (topl.c:264). */
        const _thrJoins = _topl_joins_snapshot(g._resultMessage) || [];
        g._resultMessageJoins = { src: g._resultMessage, joins: _thrJoins.slice() };
        g._pending_message = '';
    }
    g.context.move = 1; /* throw consumes a turn */
    return ECMD_TIME;
    } finally {
        /* C dothrow.c:277-291 unsplit_stack, including cancelled directions. */
        if (thrownObj && thrownObj !== u.uquiver
            && (thrownObj.o_id === save_osplit.parent_oid
                || thrownObj.o_id === save_osplit.child_oid)) {
            g.context.objsplit = save_osplit;
            await unsplitobj(thrownObj);
        }
    }
}

/* C ref: dothrow.c:1913-1949 omon_adj(struct monst *mon, struct obj *obj,
 * boolean mon_notices) — to-hit adjustment for a thrown/kicked object
 * against a monster target. */
const MZ_MEDIUM = 2;            /* monflag.h */
const HEAVY_IRON_BALL = 477;    /* objects.h (js/oc_name_data.js index) */
export function omon_adj(mon, obj, mon_notices) {
    let tmp = 0;

    /* size of target affects the chance of hitting */
    tmp += (mon.data.msize | 0) - MZ_MEDIUM;
    /* sleeping target is more likely to be hit */
    if (mon.msleeping) {
        tmp += 2;
    }
    /* ditto for immobilized target */
    if (!mon.mcanmove || !mon.data.mmove) {
        tmp += 4;
        if (mon_notices && mon.data.mmove && !rn2(10)) {
            mon.mcanmove = 1;
            mon.mfrozen = 0;
        }
    }
    /* some objects are more likely to hit than others */
    switch (obj.otyp | 0) {
    case HEAVY_IRON_BALL:
        if (obj !== game.u.uball)
            tmp += 2;
        break;
    case BOULDER_OTYP:
        tmp += 6;
        break;
    default:
        if ((obj.oclass | 0) === OCLASS_WEAPON || is_weptool(obj)
            || (obj.oclass | 0) === OCLASS_GEM)
            tmp += hitval(obj, mon, (mon.mndx ?? mon.mnum) | 0);
        break;
    }
    return tmp;
}

/* C dothrow.c AutoReturn: Mjollnir returns only for a wielding Valkyrie. */
function throw_auto_return(obj, wornMask) {
    return obj.otyp === 26 /* BOOMERANG */
        || !!((wornMask & W_WEP_C) && (obj.otyp === 80 /* AKLYS */
            || (obj.oartifact === 3 && Role_if(342 /* PM_VALKYRIE */))));
}

/* C dothrow.c return_throw_to_inv; preserve the original stack and worn slot. */
export async function return_throw_to_inv(obj, wep_mask, twoweap, oldslot) {
    let restored = null;
    const split = game.context.objsplit;
    if (split && (obj.o_id === split.parent_oid || obj.o_id === split.child_oid)) {
        obj.nobj = game.invent;
        game.invent = obj;
        obj.where = OBJ_INVENT;
        restored = await unsplitobj(obj);
        if (restored) {
            obj = restored;
        } else {
            game.invent = obj.nobj;
            obj.nobj = null;
            obj.where = OBJ_FREE;
        }
    }
    if (!restored) {
        obj.nomerge = 1;
        obj = (await addinv_before(obj, oldslot));
        obj.nomerge = 0;
        if ((obj.owornmask & W_QUIVER_C)
            && ((obj.owornmask | wep_mask) & (W_WEP_C | W_SWAPWEP_C)))
            await setuqwep(null);
        if ((wep_mask & W_WEP_C) && !game.u.uwep) await setuwep(obj);
        else if ((wep_mask & W_SWAPWEP_C) && !game.u.uswapwep) await setuswapwep(obj);
        else if ((wep_mask & W_QUIVER_C) && !game.u.uquiver) await setuqwep(obj);
        if (twoweap && !game.u.twoweap) set_twoweap(true);
    }
    await encumber_msg();
    return obj;
}

const THIT_BOOMERANG = 26, THIT_HEAVY_IRON_BALL = 477;

const THIT_BLINDING_VENOM = 479, THIT_ACID_VENOM = 480;

/* monst.h STRAT_WAITMASK — js/dochug.js:120 (STRAT_CLOSE | STRAT_WAITFORU). */
const THIT_STRAT_WAITMASK = 0x10000000 | 0x20000000;

/* mextra.h enum dogfood_types — ACCFOOD is 2 (js/dog.js:1086). */
const THIT_ACCFOOD = 2;

/* pm.generated.js PM_ELF=264, PM_SAMURAI=340. */
const THIT_PM_ELF = 264, THIT_PM_SAMURAI = 340;

/* potion.c POTHIT_HERO_THROW — the first of the three how values. */
const THIT_POTHIT_HERO_THROW = 1;

function thit_is_elf(mdata) { return !!mdata && ((mdata.mflags2 | 0) & THIT_M2_ELF) !== 0; }

/* C ref: obj.h uslinging() = (uwep && objects[uwep->otyp].oc_skill == P_SLING).
 * objects.h gives SLING (otyp 87, already named in this file) the only
 * P_SLING oc_skill among wieldable weapons. */
function thit_uslinging(u) { return !!u.uwep && (u.uwep.otyp | 0) === OTYP_SLING_THIT; }

const OTYP_SLING_THIT = 87; /* objects.h SLING — js/cmd.js WEAPON_NAME[87]. */

/* C dothrow.c:2310-2370 gem_accept(mon, obj).  This is reached before the
 * ordinary thrown-object hit roll when a real gem is offered to a unicorn.
 * The shop-check hook has no JS body, but the inventory transfer, luck draws,
 * peacefulness, message, and relocation are all available here. */
async function thit_gem_accept(mon, obj) {
    const u = game.u || {};
    const known = !!(obj.dknown && game._oc_name_known?.[obj.otyp | 0]);
    const guessed = has_oname(obj)
        || !!(game._oc_uname && game._oc_uname[obj.otyp | 0]);
    const is_gem = (MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === 20 /* GEMSTONE */;
    const buddy = Math.sign(mon.data?.maligntyp | 0) === Math.sign(u.ualign?.type | 0);
    let suffix;
    if (known || guessed) {
        if (!is_gem) {
            suffix = ' is not interested in your junk.';
        } else if (buddy) {
            suffix = ' gratefully';
            change_luck(known ? 5 : 2);
        } else {
            suffix = ' hesitatingly';
            change_luck(known ? rn2(7) - 3 : rn2(3) - 1);
        }
    } else if (is_gem) {
        if (buddy) {
            suffix = ' gratefully';
            change_luck(1);
        } else {
            suffix = ' hesitatingly';
            change_luck(rn2(3) - 1);
        }
    } else {
        suffix = ' graciously';
    }
    mon.mpeaceful = 1;
    mon.mavenge = 0;
    const accepted = is_gem || (!known && !guessed);
    if (accepted)
        await mpickobj(mon, obj);
    const msg = `${Monnam(mon)}${suffix}${accepted ? ' accepts your gift.' : ''}`;
    if (!_Blind_cmd())
        await pline(msg);
    if (!tele_restrict(mon))
        await rloc(mon, RLOC_MSG);
    return accepted ? 1 : 0;
}

/* C ref: mondata.h:255-261 befriend_with_obj(ptr, obj).  Evaluated BEFORE the
 * mtame/dogfood disjunct at dothrow.c:2267-2268, and `||` short-circuits: when
 * this is TRUE, C never calls dogfood() and therefore never fires its
 * obj_resists() rn2(100).  Throwing a food ration at a tame little dog is
 * exactly that case, so a port that drops this test and leads with the mtame
 * arm consumes an RNG draw C does not.
 *   monkeys and apes are befriended by a banana and nothing else;
 *   otherwise a domestic monster is befriended by any FOOD_CLASS item, except
 *   that S_UNICORN forms (pony/horse/unicorns) need VEGGY material or a lichen
 *   corpse. */
const THIT_M2_DOMESTIC = 0x00400000; /* monflag.h:144 */

const THIT_MAT_VEGGY = 3;            /* objclass.h:16 VEGGY */

const THIT_PM_MONKEY = 233, THIT_PM_APE = 234; /* pm.generated.js */

const THIT_PM_LICHEN = 158;          /* pm.generated.js */

function thit_befriend_with_obj(ptr, obj) {
    if (!ptr || !obj) return false;
    const pmidx = (ptr.pmidx ?? -1) | 0;
    if (pmidx === THIT_PM_MONKEY || pmidx === THIT_PM_APE)
        return (obj.otyp | 0) === THIT_BANANA;
    return ((ptr.mflags2 >>> 0) & THIT_M2_DOMESTIC) !== 0
        && (obj.oclass | 0) === OCLASS_FOOD
        && ((ptr.mlet | 0) !== THIT_S_UNICORN
            || _oc_material(obj.otyp | 0) === THIT_MAT_VEGGY
            || ((obj.otyp | 0) === THIT_CORPSE
                && (obj.corpsenm | 0) === THIT_PM_LICHEN));
}

function thit_helpless(mon) {
    return !!(mon.msleeping || !mon.mcanmove || (mon.mfrozen | 0));
}

/* C ref: objects.h oc_skill == P_BOW.  The P_BOW rows are exactly BOW,
 * ELVEN_BOW, ORCISH_BOW and YUMI; CROSSBOW is P_CROSSBOW and is excluded, as
 * in C. */
function thit_is_bow(otyp) {
    return otyp === OTYP_BOW || otyp === OTYP_ELVEN_BOW
        || otyp === OTYP_ORCISH_BOW || otyp === OTYP_YUMI;
}

/* C ref: obj.h greatest_erosion(otmp) — max(oeroded, oeroded2), matching the
 * spelling js/cmd.js should_mulch_missile already uses. */
function thit_greatest_erosion(obj) {
    return Math.max(obj.oeroded | 0, obj.oeroded2 | 0);
}

/* C ref: dothrow.c:1950-1967 tmiss(obj, mon, maybe_wakeup) — a thrown, kicked
 * or applied object misses.  The rn2(3) at :1964 is a live RNG site. */
async function tmiss(obj, mon, maybe_wakeup) {
    const missile = mshot_xname(obj);

    /* C:1955-1961 — if the target can't be seen, or doesn't look like a valid
     * target, avoid "the arrow misses it" / "the arrow misses the mimic". */
    const apType = (mon.m_ap_type ?? 0) | 0;
    if (!canseemon(mon) || (apType && apType !== M_AP_MONSTER))
        pline(`${The(missile)} ${otense(obj, 'miss')}.`);
    else
        miss(missile, mon);
    if (maybe_wakeup && !rn2(3))
        await wakeup_attack(mon, true);
}

function thit_special_obj_hits_leader(obj, mon) {
    const leaderId = (game.quest_status?.leader_m_id ?? 0) | 0;
    return leaderId !== 0 && (mon.m_id | 0) === leaderId
        && !!(is_quest_artifact(obj) || game._oc_unique?.[obj.otyp]
              || ((obj.otyp | 0) === 212 /* FAKE_AMULET_OF_YENDOR */ && !obj.known));
}

/* C dothrow.c:1181 check_shop_obj — settle a projectile that breaks or
 * disappears at its landing square before obfree() drops the last reference.
 * The mulched-missile path reaches this with `broken` true, but keeping the
 * complete room test here preserves the same helper semantics for callers
 * added later.  C's is_unpaid() includes unpaid contents of owned containers. */
async function check_shop_obj_throw(obj, x, y, broken) {
    const u = game.u || {};
    const ushops = u.ushops;
    const currentShop = typeof ushops === 'string'
        ? (ushops.length ? ushops.charCodeAt(0) : 0)
        : Array.isArray(ushops) ? (ushops[0] | 0) : (ushops | 0);
    const shkp = currentShop ? shk_shop_keeper(currentShop) : null;
    if (!shkp) return;

    const rooms = shk_in_rooms(x | 0, y | 0, SHOPBASE) || [];
    const landingShop = rooms.length ? (rooms[0] | 0) : 0;
    const previous = typeof u.ushops0 === 'string'
        ? (u.ushops0.length ? u.ushops0.charCodeAt(0) : 0)
        : Array.isArray(u.ushops0) ? (u.ushops0[0] | 0) : (u.ushops0 | 0);
    const costly = shk_costly_spot(x | 0, y | 0);

    if (broken || !costly || (landingShop !== currentShop && landingShop !== previous)) {
        if (shk_is_unpaid(obj))
            await dokick_stolen_value(obj, u.ux | 0, u.uy | 0, !!shkp.mpeaceful, false);
        if (broken) obj.no_charge = 1;
        return;
    }

    if (shk_is_unpaid(obj)) {
        const contained = Has_contents(obj);
        const gold = contained ? shk_contained_gold(obj, true) : 0;
        await shk_subfrombill(obj, shkp);
        if (gold > 0) await shk_donate_gold(gold, shkp, true);
    } else if ((x | 0) !== (shkp.mx | 0) || (y | 0) !== (shkp.my | 0)) {
        await sellobj(obj, x | 0, y | 0);
    }
}

export async function thitmonst(mon, obj) {
    const u = game.u;
    const mdata = mon.data ?? mon;
    const otyp = obj.otyp | 0;
    const guaranteed_hit = !!engulfing_u(mon);
    let tmp, disttmp, dieroll;

    /* C:2020-2022 */
    const hmode = (obj === u.uwep) ? HMON_APPLIED
                : (obj === game.kickedobj) ? HMON_KICKED
                : HMON_THROWN;

    /* C:2036-2037 — dex still gives a bonus, strength does not; there is a base
     * -1 to hit.  `Luck` here is the raw u.uluck, NOT uhitm.c:378's melee
     * sgn(Luck)*((abs(Luck)+2)/3). */
    const polyLevel = Upolyd(u)
        ? ((game.youmonst?.data?.mlevel ?? 0) | 0) : (u.ulevel | 0);
    tmp = -1 + (u.uluck | 0) + find_mac(mon) + (u.uhitinc | 0) + polyLevel;

    /* C:2038-2046 */
    const dex = acurr(u, A_DEX);
    if (dex < 4) tmp -= 3;
    else if (dex < 6) tmp -= 2;
    else if (dex < 8) tmp -= 1;
    else if (dex >= 14) tmp += (dex - 14);

    disttmp = 3 - distmin(u.ux | 0, u.uy | 0, mon.mx | 0, mon.my | 0);
    if (disttmp < -4) disttmp = -4;
    tmp += disttmp;

    /* C:2057-2072 — gloves hinder proper use of bows.  C's default arm is an
     * impossible() paniclog line with no game effect and no RNG. */
    const uarmg = u.uarmg, uwep = u.uwep;
    if (uarmg && uwep && thit_is_bow(uwep.otyp | 0)) {
        switch (uarmg.otyp | 0) {
        case 161: tmp -= 2; break; /* GAUNTLETS_OF_POWER (metal) */
        case 160: tmp -= 3; break; /* GAUNTLETS_OF_FUMBLING */
        case 159: case 162: break; /* LEATHER_GLOVES, GAUNTLETS_OF_DEXTERITY */
        default: await real_impossible('Unknown type of gloves (%d)', uarmg.otyp); break;
        }
    }

    /* C:2074 — omon_adj is an RNG site (rn2(10) when the target is immobilised
     * and mon_notices is TRUE). */
    tmp += omon_adj(mon, obj, true);
    /* C:2075-2077 */
    if (thit_is_orc(mdata)
        && (Upolyd(u) ? thit_is_elf(game.youmonst?.data) : Race_if(THIT_PM_ELF)))
        tmp++;
    if (guaranteed_hit)
        tmp += 1000; /* C:2078-2080 */

    /* C:2082-2098 — real gems thrown to unicorns.  5.0 treats rocks and gray
     * stones as attacks rather than like glass, and gems or glass shot via a
     * sling as attacks (the MINERAL and uslinging() guards). */
    if ((obj.oclass | 0) === OCLASS_GEM && thit_is_unicorn(mdata)
        && (MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) !== _MAT_MINERAL
        && !thit_uslinging(u)) {
        if (thit_helpless(mon)) {
            await tmiss(obj, mon, false);
            return 0;
        } else if (mon.mtame) {
            await pline('%s catches and drops %s.', Monnam(mon), the(xname(obj)));
            return 0;
        } else {
            await pline('%s catches %s.', Monnam(mon), the(xname(obj)));
            return await thit_gem_accept(mon, obj);
        }
    }

    /* C:2100-2145 — a quest leader catches a thrown artifact or quest amulet,
     * keeping it when appropriate or acknowledging the quest and returning it. */
    if (hmode !== HMON_APPLIED && thit_special_obj_hits_leader(obj, mon)) {
        mon.msleeping = 0;
        mon.mstrategy = (mon.mstrategy | 0) & ~THIT_STRAT_WAITMASK;
        if (mon.mcanmove) {
            await pline('%s catches %s.', Some_Monnam(mon), the(xname(obj)));
            const uniqueInvocation = !!(u.uevent?.invoked
                && game._oc_unique?.[obj.otyp] && (obj.otyp | 0) !== 213);
            if (uniqueInvocation || !mon.mpeaceful) {
                if (mon.mpeaceful && !_hero_Deaf()) {
                    fully_identify_obj(obj);
                    await verbalize('%s part in this is finished.', s_suffix(The(xname(obj))));
                    await verbalize('We will guard it in case it is ever needed again, %s forbid.',
                                    align_gname(u.ualignbase[A_ORIGINAL]));
                }
                if (u.ushops || obj.unpaid)
                    await check_shop_obj_throw(obj, mon.mx | 0, mon.my | 0, false);
                await mpickobj(mon, obj);
            } else {
                const nearby = dist2(mon.mx | 0, mon.my | 0, u.ux | 0, u.uy | 0) < 3;
                await finish_quest(obj);
                await pline('%s %s %s back to you.', Some_Monnam(mon),
                            nearby ? 'hands' : 'tosses', the(xname(obj)));
                // C dothrow.c:2142 / sho_obj_return_to_u: display the flight.
                const bp = game.bhitpos;
                if (!nearby && (u.dx || u.dy) && (bp.x !== u.ux || bp.y !== u.uy)) {
                    tmp_at(DISP_FLASH, obj_to_glyph(obj));
                    for (let x = bp.x - u.dx, y = bp.y - u.dy;
                         isok(x, y) && (x !== u.ux || y !== u.uy); x -= u.dx, y -= u.dy) {
                        tmp_at(x, y);
                        nh_delay_output();
                    }
                    tmp_at(DISP_END, 0);
                }
                await addinv(obj);
                await encumber_msg();
            }
            return 1;
        }
        return 0;
    }

    /* C:2147 — THE to-hit roll. */
    dieroll = rnd(20);

    if ((obj.oclass | 0) === OCLASS_WEAPON || is_weptool(obj)
        || (obj.oclass | 0) === OCLASS_GEM) {
        /* C:2149-2196 */
        if (hmode === HMON_KICKED) {
            /* throwing adjustments and weapon skill bonus don't apply */
            tmp -= (is_ammo(obj) ? 5 : 3);
        } else if (is_ammo(obj)) {
            if (!ammo_and_launcher(obj, uwep)) {
                tmp -= 4;
            } else {
                tmp += (uwep.spe | 0) - thit_greatest_erosion(uwep);
                tmp += await weapon_hit_bonus(uwep);
                if (uwep.oartifact)
                    tmp += spec_abon(uwep, mon, mon.mnum ?? mon.data?.pmidx ?? -1);
                /* C:2174-2182 — elves and samurai are highly trained with bows,
                 * especially their own special types.  Polymorphing won't make
                 * you a bow expert. */
                if ((Race_if(THIT_PM_ELF) || Role_if(THIT_PM_SAMURAI))
                    && (!Upolyd(u) || ((game.youmonst?.data?.mflags2 | 0)
                                                      & (game.urace.selfmask | 0)))
                    && thit_is_bow(uwep.otyp | 0)) {
                    ++tmp;
                    if ((Race_if(THIT_PM_ELF) && (uwep.otyp | 0) === OTYP_ELVEN_BOW)
                        || (Role_if(THIT_PM_SAMURAI) && (uwep.otyp | 0) === OTYP_YUMI))
                        ++tmp;
                }
            }
        } else { /* thrown non-ammo or applied polearm/grapnel */
            if (otyp === THIT_BOOMERANG) tmp += 4;              /* arbitrary */
            else if (throwing_weapon(obj)) tmp += 2;            /* meant to be thrown */
            else if (obj === game.thrownobj) tmp -= 2;          /* not meant to be thrown */
            tmp += await weapon_hit_bonus(obj);
        }

        if (tmp >= dieroll) {
            /* C:2198-2226 — attack hits mon. */
            const wasthrown = !!game.thrownobj;
            // C dothrow.c:2199: hmon() may destroy the object.
            const chopper = (obj.oclass === OCLASS_WEAPON || obj.oclass === OCLASS_TOOL)
                && (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === 3;

            if (hmode === HMON_APPLIED) {
                u.uconduct = u.uconduct || {};
                u.uconduct.weaphit = (u.uconduct.weaphit | 0) + 1;
            }
            if (await hmon(mon, obj, hmode, dieroll)) { /* mon still alive */
                /* C:2209-2210 cutworm(mon, gb.bhitpos.x, gb.bhitpos.y,
                 * is_axe(obj)). */
                if (mon.wormno)
                    await cutworm_real(mon, game.bhitpos?.x ?? mon.mx, game.bhitpos?.y ?? mon.my, chopper);
            }
            exercise(A_DEX, true);
            /* C:2212-2217 — if the hero was swallowed and the projectile killed
             * the engulfer, obj is no longer safe to use; it escapes the chance
             * to be used up here. */
            if (wasthrown && !game.thrownobj)
                return 1;

            /* C:2219-2225 — projectiles other than magic stones sometimes
             * disappear when thrown.  should_mulch_missile() is the RNG site
             * and is already ported at js/cmd.js:30336. */
            if (should_mulch_missile(obj)) {
                if ((game.u.ushops && game.u.ushops[0]) || obj.unpaid)
                    await check_shop_obj_throw(obj, game.bhitpos?.x ?? mon.mx, game.bhitpos?.y ?? mon.my, true);
                await obfree(obj, null);
                return 1;
            }
            await passive_obj(mon, obj, null);
        } else {
            /* C:2227-2231 */
            await tmiss(obj, mon, true);
            if (hmode === HMON_APPLIED)
                await wakeup_attack(mon, true);
        }

    } else if (otyp === THIT_HEAVY_IRON_BALL) {
        /* C:2233-2245 */
        exercise(A_STR, true);
        if (tmp >= dieroll) {
            const was_swallowed = guaranteed_hit;

            exercise(A_DEX, true);
            if (!(await hmon(mon, obj, hmode, dieroll))) { /* mon killed */
                if (was_swallowed && !u.uswallow && obj === u.uball)
                    return 1; /* already did placebc() */
            }
        } else {
            await tmiss(obj, mon, true);
        }

    } else if (otyp === BOULDER_OTYP) {
        /* C:2247-2255 */
        exercise(A_STR, true);
        if (tmp >= dieroll) {
            exercise(A_DEX, true);
            await hmon(mon, obj, hmode, dieroll);
        } else {
            await tmiss(obj, mon, true);
        }

    } else if ((otyp === THIT_EGG || otyp === THIT_CREAM_PIE
                || otyp === THIT_BLINDING_VENOM || otyp === THIT_ACID_VENOM)
               && (guaranteed_hit || acurr(u, A_DEX) > rnd(25))) {
        await hmon(mon, obj, hmode, dieroll);
        return 1; /* hmon used it up */

    } else if ((obj.oclass | 0) === THIT_POTION_CLASS
               && (guaranteed_hit || acurr(u, A_DEX) > rnd(25))) {
        /* C:2262-2265 */
        await potionhit(mon, obj, THIT_POTHIT_HERO_THROW);
        return 1;

    } else if (thit_befriend_with_obj(mdata, obj)
               || (mon.mtame && dogfood(mon, obj) <= THIT_ACCFOOD)) {
        /* C:2267-2275.  The left disjunct short-circuits the dogfood() call —
         * see thit_befriend_with_obj above; it is NOT redundant with the mtame
         * arm, because it decides whether the rn2(100) inside dogfood fires. */
        if (await tamedog(mon, obj, true)) {
            return 1; /* obj is gone */
        } else {
            await tmiss(obj, mon, false);
            mon.msleeping = 0;
            mon.mstrategy = (mon.mstrategy | 0) & ~THIT_STRAT_WAITMASK;
        }
    } else if (guaranteed_hit) {
        /* C:2276-2301 — the hero is swallowed and the thrown object vanishes
         * into the engulfer.  wakeup() is the only RNG-bearing operation here;
         * it must precede the message and the caller's swallowit() tail. */
        await wakeup_attack(mon, true);
        /* C's cockatrice-corpse special case calls minstapetrify() only when
         * the engulfer is an animal; the async bridge preserves its xkilled /
         * polymorph ordering before the corpse is considered consumed. */
        if (otyp === THIT_CORPSE && sr_touch_petrifies_ptr(permonstTemplate(obj.corpsenm))
            && _is_animal_local(mon.data)) {
            await minstapetrify(mon, true);
            if (!u.uswallow) {
                await _delobj_useupf(obj);
                return 1;
            }
        }
        const trail = _digests(mon.data) ? ' entrails'
            : _is_whirly_ustuck() ? ' currents' : '';
        let monname = mon_nam(mon);
        if (trail)
            monname = s_suffix(monname);
        await pline('%s into %s%s.', Tobjnam(obj, 'vanish'), monname, trail);
    } else {
        /* C:2302-2303 */
        await tmiss(obj, mon, true);
    }

    return 0;
}

export async function throwit_mon_hit(obj, mon) {
    if (!mon)
        return false;
    if (mon.isshk && (obj.where | 0) === THIT_OBJ_MINVENT && obj.ocarry === mon)
        return true;
    await snuff_candle(obj);
    /* C:1491 gn.notonhead = (gb.bhitpos.x != mon->mx || gb.bhitpos.y != mon->my) */
    const bp = game.bhitpos || { x: mon.mx | 0, y: mon.my | 0 };
    game.notonhead = (game.gn ||= {}).notonhead = ((bp.x | 0) !== (mon.mx | 0) || (bp.y | 0) !== (mon.my | 0));
    const obj_gone = await thitmonst(mon, obj);
    /* C dothrow.c:1494-1501: re-read the target after thitmonst, then anger
     * a shopkeeper attacked from outside his shop (including its doorway). */
    const hitpos = game.bhitpos || bp;
    mon = m_at(hitpos.x | 0, hitpos.y | 0);
    if (mon && mon.isshk) {
        const u = game.u;
        const ushops = u.ushops;
        const currentShop = typeof ushops === 'string'
            ? (ushops.length ? ushops.charCodeAt(0) : 0)
            : Array.isArray(ushops) ? (ushops[0] | 0) : (ushops | 0);
        if (!inside_shop(u.ux, u.uy)
            || (currentShop && !shk_in_rooms(mon.mx, mon.my, SHOPBASE).includes(currentShop)))
            hot_pursuit(mon);
    }
    if (obj_gone)
        game.thrownobj = null;
    return false;
}

const WAN_STRIKING = 417;       /* objects.h (js/oc_name_data.js index) */
export async function hitfloor(obj, verbosely) {
    const u = game.u;
    const typ = game.level.at(u.ux, u.uy).typ;
    if (IS_SOFT(typ) || u.uinwater || u.uswallow) {
        await dropy(obj);
        return;
    }
    if (IS_ALTAR(typ)) {
        await doaltarobj(obj);
    } else if (verbosely) {
        const verb = obj.otyp === WAN_STRIKING ? 'strike' : 'hit';
        let surf = surface(u.ux, u.uy);
        const trap = t_at(u.ux, u.uy);
        if (trap?.tseen) {
            if (trap.ttyp === TRAPDOOR) surf = 'trap door';
            else if (trap.ttyp === HOLE) surf = 'edge of the hole';
            else if (trap.ttyp === PIT || trap.ttyp === SPIKED_PIT) surf = 'edge of the pit';
        }
        await pline('%s %s the %s.', (await _doaltarobj_Doname2(obj)), otense(obj, verb), surf);
    }
    if (await hero_breaks(obj, u.ux, u.uy, BRK_FROM_INV)) return;
    if (await ship_object(obj, u.ux, u.uy, false)) return;
    await dropz(obj, true);
}

/* C ref: dothrow.c:655-737 walk_path(src_cc, dest_cc, check_proc, arg) —
 * Bresenham from src to dest, calling check_proc for every location EXCEPT the
 * starting one.  On a FALSE callback it stops and rewrites dest_cc to the
 * location before the failed step.  Consumes no RNG of its own; whatever the
 * callback draws is the callback's.  The `dx < dy` / else split and the
 * `err > d?` tests are transcribed exactly — the algorithm's zig/zag choice is
 * observable through check_jump, so an "equivalent" line walk is not
 * equivalent. */
export async function walk_path(src_cc, dest_cc, check_proc, arg) {
    let dx = dest_cc.x - src_cc.x;
    let dy = dest_cc.y - src_cc.y;
    let x_change, y_change;
    let prev_x, prev_y, x, y;
    let keep_going = true;

    prev_x = x = src_cc.x;
    prev_y = y = src_cc.y;

    if (dx < 0) { x_change = -1; dx = -dx; } else { x_change = 1; }
    if (dy < 0) { y_change = -1; dy = -dy; } else { y_change = 1; }

    let i = 0, err = 0;
    if (dx < dy) {
        while (i++ < dy) {
            prev_x = x; prev_y = y;
            y += y_change;
            err += dx << 1;
            if (err > dy) { x += x_change; err -= dy << 1; }
            if (!(keep_going = await check_proc(arg, x, y)))
                break;
        }
    } else {
        while (i++ < dx) {
            prev_x = x; prev_y = y;
            x += x_change;
            err += dy << 1;
            if (err > dx) { y += y_change; err -= dx << 1; }
            if (!(keep_going = await check_proc(arg, x, y)))
                break;
        }
    }

    if (keep_going)
        return true;

    dest_cc.x = prev_x;
    dest_cc.y = prev_y;
    return false;
}

/* C ref: dothrow.c:741-752 hurtle_jump(arg, x, y) — "prevent jumping over
 * water from being placed in that water": sets EWwalking |= I_SPECIAL around
 * the hurtle_step call.  hurtle_step reads that bit back as `via_jumping`, so
 * the port passes it as an explicit flag rather than through a shared
 * extrinsic word the rest of js/ does not model. */
export async function hurtle_jump(arg, x, y) {
    return await hurtle_step(arg, x, y, true);
}

/* C ref: dothrow.c:772-971 hurtle_step(arg, x, y) — one step of the hero
 * flying through the air.  `arg` is C's `int *range`; the port passes a
 * {range} box so the decrement is visible to the caller the way C's pointer
 * is.  `via_jumping` is C's (EWwalking & I_SPECIAL) test at dothrow.c:790.
 */
async function hurtle_step(arg, x, y, via_jumping) {
    const g = game, u = g.u || {};
    let dmg = 0;

    if (!isok(x, y)) {                                  /* dothrow.c:784-786 */
        await pline('You feel the spirits holding you back.');
        return false;
    } else if (!in_out_region(x, y)) {                   /* dothrow.c:787-788 */
        return false;
    } else if (arg.range === 0) {                        /* dothrow.c:789-790 */
        return false; /* previous step wants to stop now */
    }
    const stopping_short = (via_jumping && arg.range < 2); /* dothrow.c:792 */
    const lev = _levlAt(x, y);
    const ltyp = lev ? (lev.typ | 0) : STONE;

    /* dothrow.c:796 — !Passes_walls || !(may_pass = may_passwall(x, y)) */
    let may_pass = true;
    if (!_uprop_active('PASSES_WALLS') || !(may_pass = may_passwall(x, y))) {
        let why = null;
        const diagonal = ((u.ux | 0) - x) !== 0 && ((u.uy | 0) - y) !== 0;
        const open_door = IS_DOOR(ltyp) && ((lev.doormask | 0) & D_ISOPEN) !== 0;
        const odoor_diag = open_door && diagonal;

        if (IS_OBSTRUCTED(ltyp) || closed_door(x, y) || odoor_diag) {
            why = IS_TREE(ltyp) ? 'bumping into a tree'
                : IS_OBSTRUCTED(ltyp) ? 'bumping into a wall'
                : odoor_diag ? 'bumping into a door frame'
                : 'bumping into a closed door';
            if (odoor_diag)
                await pline('You hit the door frame!');
            await pline('Ouch!');
        } else if (ltyp === IRONBARS) {
            why = 'crashing into iron bars';
            await pline('You crash into some iron bars.  Ouch!');
        } else if (sobj_at(BOULDER, x, y)) {
            why = 'bumping into a boulder';
            await pline(`You bump into a ${xname(sobj_at(BOULDER, x, y))}.  Ouch!`);
        } else if (!may_pass) {
            /* dothrow.c:817-820 — a no-dig non-wall position */
            why = 'touching the edge of the universe';
            await pline('You smack into something!');
        } else if (diagonal
                   && bad_rock(g.youmonst && g.youmonst.data, u.ux | 0, y)
                   && bad_rock(g.youmonst && g.youmonst.data, x, u.uy | 0)) {
            const too_much = !!g.invent
                && (inv_weight() + weight_cap() > WT_TOOMUCH_DIAGONAL);
            if (bigmonst_cmd(_hero_youmonst().data) || too_much) {
                why = 'wedging into a narrow crevice';
                await You('%sget forcefully wedged into a crevice.', too_much ? 'and all your belongings ' : '');
            }
        }
        if (why) {                                       /* dothrow.c:834-839 */
            dmg = rnd(2 + arg.range);
            /* dothrow.c:835 — losehp(Maybe_Half_Phys(dmg), why, KILLED_BY). */
            await losehp(flooreffects_Maybe_Half_Phys(dmg), why, KILLED_BY);
            wake_nearto(x, y, 10);
            return false;
        }
    }

    const mon = m_at(x, y);                              /* dothrow.c:841 */
    if (mon) {
        mon.mundetected = 0;
        /* dothrow.c:857-860 — ARTICLE_A (2; the old literal 1 was ARTICLE_THE). */
        const mnam = x_monnam(mon, ARTICLE_A, null,
            (has_mgivenname(mon) ? SUPPRESS_SADDLE : 0) | AUGMENT_IT, false);
        /* dothrow.c:861-865 — a square showing neither a monster nor a remembered
         * 'I' glyph; a monster glyph is on screen exactly when canspotmon(). */
        /* the test is glyph_is_monster(glyph_at(x, y)), not canspotmon(): a mimic
         * seen as an object/furniture is spotted but shows no monster glyph. */
        const _gl = _glyph_at(x, y);
        const _mglyph = !!(_gl && _gl.cls === GLYPHCLS_MON) && !glyph_is_warning_at(x, y); /* warning glyphs are not monster glyphs */
        if (!_mglyph && !glyph_is_invisible_at(x, y))
            await pline(`You find ${mnam} by bumping into ${['him','her','it','them'][pronoun_gender(mon, 3)]}.`);
        else
            await pline(`You bump into ${mnam}.`);
        await wakeup_attack(mon, false);
        if (!canspotmon(mon))
            map_invisible(mon.mx, mon.my); /* dothrow.c:868 */
        await setmangry(mon, false);
        /* C dothrow.c:871-882: bodily contact requires body armor, not gloves.
         * instapetrify handles resistance, stone-golem polymorph and survival. */
        if (_mh_touch_petrifies(mon.data) && !u.uarmu && !u.uarm && !u.uarmc)
            await instapetrify(`bumping into ${an(monPmname(mon.data.pmidx, NEUTRAL))}`);
        if (_mh_touch_petrifies(_hero_youmonst().data)
            && !which_armor(mon, _MH_W_ARMU_ARM_ARMC))
            await minstapetrify(mon, true);
        wake_nearto(x, y, 10);
        return false;
    }

    if ((u.ux - x) && (u.uy - y) && _bldr_Sokoban()
        && bad_rock(_hero_youmonst().data, u.ux, y) && bad_rock(_hero_youmonst().data, x, u.uy)) {
        await You('come to an abrupt halt!');
        return false;
    }

    const bc = {}, bx = {}, by = {}, cx = {}, cy = {}, delay = {};
    if (_st_Punished() && await drag_ball(x, y, bc, bx, by, cx, cy, delay, true))
        move_bc(0, bc.value, bx.value, by.value, cx.value, cy.value);

    const ox = u.ux | 0, oy = u.uy | 0;                  /* dothrow.c:916-923 */
    u_on_newpos_cmd(x, y);                               /* u_on_newpos: steed follows hero (dungeon.c:1576) */
    await _u_on_newpos_nearby();                         /* dungeon.c:1595-1599 same-level tail: see_nearby_objects(), earth_sense() */
    newsym(ox, oy);
    vision_recalc(1);
    await flush_screen(1);
    const oldlev = _levlAt(ox, oy);
    if (ltyp !== (oldlev ? (oldlev.typ | 0) : ltyp))     /* dothrow.c:927-928 */
        await switch_terrain();
    await check_special_room(false);                           /* dothrow.c:932 */

    /* dothrow.c:934-943 — pool/lava Norep messages.  is_pool_or_lava covers
     * both; a jump that lands short (stopping_short) stays silent. */
    if (flooreffects_is_pool(x, y) && !u.uinwater) {
        /* dothrow.c:924-935.  C's hurtle_jump sets EWwalking |= I_SPECIAL
           (dothrow.c:748); this port passes that bit as via_jumping instead,
           so Wwalking = ((HWwalking || EWwalking) && !Is_waterlevel) is
           spelled out here (youprop.h:260). */
        if (is_waterwall(x, y)
            || !(_Levitation() || _Flying()
                 || (via_jumping && !Is_waterlevel(u.uz))
                 || pooleffects_Wwalking())) {
            game.multi = 0;
            await drown();
            return false;
        } else if (!Is_waterlevel(u.uz) && !stopping_short) {
            const _lt = _levlAt(x, y);
            const _moat = _lt && !Is_juiblex_level(u.uz) && (((_lt.typ | 0) === MOAT)
                || ((_lt.typ | 0) === DRAWBRIDGE_UP
                    && ((_lt.drawbridgemask | 0) & DB_UNDER) === DB_MOAT_WB));
            await _Norep(`You move over ${_moat ? 'a moat' : 'a pool'}.`);
        }
    } else if (is_lava(x, y) && !stopping_short) {     /* dothrow.c:936 */
        await _Norep('You move over some lava.');
    }

    const ttmp = t_at(x, y);                             /* dothrow.c:952-965 */
    if (ttmp && !stopping_short) {
        if (ttmp.ttyp === MAGIC_PORTAL) {
            await dotrap(ttmp, 0);
            return false;
        } else if (ttmp.ttyp === VIBRATING_SQUARE) {
            await pline('The ground vibrates as you pass it.');
            await dotrap(ttmp, 0); /* doesn't print messages */
        } else if (ttmp.ttyp === FIRE_TRAP) {
            await dotrap(ttmp, 0);
        } else if ((is_pit(ttmp.ttyp) || is_hole(ttmp.ttyp)) && _bldr_Sokoban()) {
            if (!via_jumping) await dotrap(ttmp, 0);
            arg.range = 0;
            return true;
        } else if (ttmp.tseen)
        await pline(`You pass right over ${an(trapname(ttmp.ttyp, false))}.`);
    }

    if (--arg.range < 0)                                 /* dothrow.c:966-967 */
        arg.range = 0;
    if (arg.range !== 0)                                 /* dothrow.c:968-969 */
        nh_delay_output();
    return true;
}

// hurtle — C ref: dothrow.c:1079-1125
export async function hurtle(dx, dy, range, verbose) {
    const g = game;
    const u = g.u || {};

    // Find uball for Punished check (C: Punished = uball != null)
    let uball = u.uball || null;
    for (let o = uball ? null : g.invent; o; o = o.nobj) {
        if ((o.owornmask | 0) & 0x00200000) uball = o; // W_BALL
    }
    for (let o = uball ? null : g.fobj; o; o = o.nobj) {
        if ((o.owornmask | 0) & 0x00200000) uball = o;
    }

    // carried(o) — C ref: invent.c: return o.where == OBJ_INVENT
    const carried = (o) => o != null && (o.where | 0) === OBJ_INVENT;

    if (uball != null && !carried(uball)) {
        await pline((wizard_Unaware() ? 'You dream that you feel ' : 'You feel ') + 'a tug from the iron ball.');  // dothrow.c:1091
        nomul(0);
        return;
    } else if (u.utrap) {
        let trapName;
        if (u.utraptype === TT_WEB) trapName = "web";
        else if (u.utraptype === TT_LAVA) trapName = _hliquid("lava");
        else if (u.utraptype === TT_INFLOOR) trapName = surface(u.ux, u.uy);
        else if (u.utraptype === TT_BURIEDBALL) trapName = "buried ball";
        else trapName = "trap";

        await You(`are anchored by the ${trapName}.`);
        nomul(0);
        return;
    }

    // make sure dx and dy are [-1,0,1]
    dx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    dy = dy > 0 ? 1 : dy < 0 ? -1 : 0;

    if (!range || (!dx && !dy) || u.uswallow || u.ustuck)
        return; // paranoia

    // C dothrow.c:1112 nomul(-range): the real nomul, whose hack.c:4163
    // `if (gm.multi < nval) return;` leaves a longer countdown (e.g. a faint)
    // untouched; it also sets botl only when multi was >= 0.
    nomul(-range);
    g.multi_reason = "moving through the air";
    g.nomovemsg = "";
    if (verbose)
        await You(`${(range > 1) ? "hurtle" : "float"} in the opposite direction.`);
    endmultishot(true);
    /* dothrow.c:1103-1108 — walk the path; hurtle_step moves the hero. */
    const uc = { x: u.ux | 0, y: u.uy | 0 };
    const cc = { x: (u.ux | 0) + dx * range, y: (u.uy | 0) + dy * range };
    await walk_path(uc, cc, hurtle_step, { range });
}

/* C worn.h W_ARM|W_ARMC|W_ARMU (body armor | cloak | shirt) — const.js's own
 * W_ARM/W_ARMC/W_ARMU are imported into this file only under the aliases
 * W_ARM_FW/W_ARMC_FW/W_ARMU_FW (line ~228), so the bare names are unbound
 * here; composed locally from the same numeric values (const.js:2223-2229). */
const _MH_W_ARMU_ARM_ARMC = 0x00000001 /* W_ARM */ | 0x00000002 /* W_ARMC */
                             | 0x00000040 /* W_ARMU */;

export function will_hurtle(mon, x, y) {
    if (!isok(x, y))
        return false;
    if (((mon.data?.msize) | 0) >= _MH_MZ_HUGE
        || mon === (game.u ? game.u.ustuck : null)
        || mon.mtrapped)
        return false;
    return !!goodpos(x, y, mon, MM_IGNOREWATER | MM_IGNORELAVA);
}

/* C worn.c:1006-1035 which_armor — canonical port imported from worn.js */

/* C rm.h:526-534 #define remove_monster(x, y) svl.level.monsters[x][y] = 0.
 * JS has no separate monster grid, but m_at()/newsym() treat _mapRemoved as
 * that grid state.  Keep the monster on fmon while hiding the occupant until
 * place_monster() clears the marker.  This matters between dothrow.c's
 * remove_monster() and place_monster(): newsym(old) must see an empty square. */
function _mh_remove_monster(x, y) {
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (!mon._mapRemoved && !DEADMONSTER(mon) && mon.mx === x && mon.my === y) {
            mon._mapRemoved = true;
            return;
        }
    }
}

/* trap.h:99-103 mintrap() results */
const Trap_Caught_Mon = 1, Trap_Killed_Mon = 2, Trap_Moved_Mon = 3;
async function mhurtle_step(mon, x, y) {
    if (!isok(x, y))
        return false;

    if (will_hurtle(mon, x, y) && m_in_out_region(mon, x, y)) {
        const u = game.u || {};
        if (mon !== u.usteed) {
            _mh_remove_monster(mon.mx, mon.my);
            newsym(mon.mx, mon.my);
            place_monster(mon, x, y);
            newsym(mon.mx, mon.my);
        } else {
            /* steed is hurtling, move hero which will also move steed */
            u.ux0 = u.ux; u.uy0 = u.uy;
            await u_on_newpos(x, y);
            newsym(u.ux0, u.uy0); /* update old position */
            vision_recalc(0); /* new location => different lines of sight */
        }
        await flush_screen(1);
        nh_delay_output();
        set_apparxy(mon);
        if (is_waterwall(x, y))
            return false;
        const res = await mintrap(mon, HURTLING);
        if (res === Trap_Killed_Mon || res === Trap_Caught_Mon
            || res === Trap_Moved_Mon)
            return false;
        return true;
    }

    const mtmp = m_at(x, y);
    if (mtmp && mtmp !== mon) {
        if (canseemon(mon) || canseemon(mtmp))
            await pline(`${Monnam(mon)} bumps into ${_mh_a_monnam(mtmp)}.`);
        await wakeup_attack(mtmp, !(game.context && game.context.mon_moving));
        /* check whether 'mon' is turned to stone by touching 'mtmp' */
        if (_mh_touch_petrifies(mtmp.data)
            && !which_armor(mon, _MH_W_ARMU_ARM_ARMC)) {
            await minstapetrify(mon, !(game.context && game.context.mon_moving));
            newsym(mon.mx, mon.my);
        }
        /* and whether 'mtmp' is turned to stone by being touched by 'mon' */
        if (_mh_touch_petrifies(mon.data)
            && !which_armor(mtmp, _MH_W_ARMU_ARM_ARMC)) {
            await minstapetrify(mtmp, !(game.context && game.context.mon_moving));
            newsym(mtmp.mx, mtmp.my);
        }
    } else if (u_at(x, y)) {
        const u = game.u || {};
        /* a monster has caused 'mon' to hurtle against hero */
        await pline(`${Some_Monnam(mon)} bumps into you.`);
        await stop_occupation();
        /* check whether 'mon' is turned to stone by touching poly'd hero */
        if (Upolyd(u) && _mh_touch_petrifies(_hero_youmonst().data)
            && !which_armor(mon, _MH_W_ARMU_ARM_ARMC)) {
            /* give poly'd hero credit/blame despite a monster causing it */
            await minstapetrify(mon, true);
            newsym(mon.mx, mon.my);
        }
        /* and whether hero is turned to stone by being touched by 'mon' */
        if (_mh_touch_petrifies(mon.data) && !(u.uarmu || u.uarm || u.uarmc)) {
            const str = `being hit by ${x_monnam(mon,
                mon.mtame ? ARTICLE_YOUR : ARTICLE_A, 'hurtling',
                EXACT_NAME | SUPPRESS_NAME, false)}`;
            await instapetrify(str);
            newsym(u.ux, u.uy);
        }
    }

    return false;
}

export async function mhurtle(mon, dx, dy, range) {
    const u = game.u || {};

    await wakeup_attack(mon, !(game.context && game.context.mon_moving));
    /* At the very least, debilitate the monster */
    mon.movement = 0;
    mon.mstun = 1;

    /* Is the monster stuck or too heavy to push?
     * (very large monsters have too much inertia, even floaters and flyers) */
    if (((mon.data?.msize) | 0) >= _MH_MZ_HUGE || mon === u.ustuck || mon.mtrapped) {
        if (canseemon(mon))
            await pline(`${Monnam(mon)} doesn't budge!`);
        return;
    }

    /* Make sure dx and dy are [-1,0,1] */
    dx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    dy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    if (!range || (!dx && !dy))
        return; /* paranoia */
    /* don't let grid bugs be hurtled diagonally */
    if (dx && dy && (((mon.data?.pmidx) | 0) === PM_GRID_BUG /* NODIAG */))
        return;

    /* undetected monster can be moved by your strike */
    if (mon.mundetected) {
        mon.mundetected = 0;
        newsym(mon.mx, mon.my);
    }
    if (M_AP_TYPE(mon))
        seemimic(mon);

    /* Send the monster along the path */
    const mc = { x: mon.mx | 0, y: mon.my | 0 };
    const cc = { x: mc.x + (dx * range), y: mc.y + (dy * range) };
    await walk_path(mc, cc, mhurtle_step, mon);
    if (!DEADMONSTER(mon)) {
        if (t_at(mon.mx, mon.my))
            await mintrap(mon, FORCEBUNGLE);
        else
            await minliquid(mon);
    }
}

/* C obj.h:233 is_spear: WEAPON_CLASS && oc_skill == P_SPEAR */
function is_spear(obj) {
    return (obj.oclass | 0) === 2 && _oc_skill(obj) === 17;
}

/* C obj.h / objclass.h: check if weapon otyp has PIERCE mode (oc_dir & PIERCE).
 * Non-sword blades with PIERCE: dagger, knife, stiletto, worm tooth, crysknife.
 * Excludes: athame (P_DAGGER but has SLASH only), scalpel (P_KNIFE but has SLASH only).
 * C ref: dothrow.c:1435-1436 (is_blade && !is_sword && (objects[otyp].oc_dir & PIERCE)). */
function _has_pierce_mode(otyp) {
    const t = otyp | 0;
    /* DAGGER variants: 34=DAGGER, 35=ELVEN_DAGGER, 36=ORCISH_DAGGER, 37=SILVER_DAGGER */
    if (t === 34 || t === 35 || t === 36 || t === 37) return true;
    /* KNIFE family with PIERCE (objects.h oc_dir): 40=KNIFE(P|S), 41=STILETTO(P|S),
     * 43=CRYSKNIFE(P). Excludes: 38=ATHAME(S), 39=SCALPEL(S), 42=WORM_TOOTH(oc_dir=0). */
    if (t === 40 || t === 41 || t === 43) return true;
    return false;
}

/* C ref: dothrow.c:1430-1439 throwing_weapon() — return true for weapons meant to be thrown.
 * Excludes ammo (which are projectiles fired from launchers).
 * Includes: missiles, spears, piercing blades (non-swords), war hammer, aklys. */
export function throwing_weapon(obj) {
    if (!obj) return false;
    return (is_missile(obj) || is_spear(obj)
            || (is_blade(obj) && !is_sword(obj) && _has_pierce_mode(obj.otyp))
            || obj.otyp === OTYP_WAR_HAMMER || obj.otyp === OTYP_AKLYS);
}

// C ref: dothrow.c dofire() — fire from quiver or wielded launcher.
// fireassist defaults ON (iflags.fireassist = On in optlist.h).
/* C ref: dothrow.c:381-454 autoquiver() — fill an empty quiver from inventory
 * (reached only with flags.autoquiver, dothrow.c:529-538). */
const WEAPON_CLASS = 2;         /* objclass.h */
async function autoquiver() {
    const g = game, u = g.u;
    if (u.uquiver) return;
    const known = (t) => !!(g._oc_name_known && g._oc_name_known[t | 0]);
    let oammo = null, omissile = null, omisc = null, altammo = null;
    for (let otmp = g.invent; otmp; otmp = otmp.nobj) {
        const t = otmp.otyp | 0;
        if (otmp.owornmask || otmp.oartifact || !otmp.dknown) {
            /* skip it */
        } else if (t === 474 /* ROCK */
                   || (t === 473 /* FLINT */ && known(t))
                   || ((otmp.oclass | 0) === _GEM_CLASS
                       && (MKOBJ_OC_MATERIAL[t] | 0) === 19 /* GLASS */ && known(t))) {
            if (thit_uslinging(u)) oammo = otmp;
            else if (ammo_and_launcher(otmp, u.uswapwep)) altammo = otmp;
            else if (!omisc) omisc = otmp;
        } else if ((otmp.oclass | 0) === _GEM_CLASS) {
            /* skip non-rock gems */
        } else if (is_ammo(otmp)) {
            if (ammo_and_launcher(otmp, u.uwep)) oammo = otmp;
            else if (ammo_and_launcher(otmp, u.uswapwep)) altammo = otmp;
            else omisc = otmp;
        } else if (is_missile(otmp)) {
            omissile = otmp;
        } else if ((otmp.oclass | 0) === WEAPON_CLASS && throwing_weapon(otmp)) {
            if ((MKOBJ_OC_SKILL[t] | 0) === P_DAGGER && !omissile) omissile = otmp;
            else if (t === OTYP_AKLYS) continue;
            else omisc = otmp;
        }
    }
    if (oammo) await setuqwep(oammo);
    else if (omissile) await setuqwep(omissile);
    else if (altammo) await setuqwep(altammo);
    else if (omisc) await setuqwep(omisc);
}

export async function dofire() {
    game._fireSwapOwnerLine = null;
    const g = game;
    const u = g.u || {};
    g.multi = 0;
    /* Lazy-init Ranger weapon state when not yet set by u_init.
     * C ref: ini_inv_use_obj wield order: dagger→uwep, bow→uswapwep, arrows→uquiver. */
    _ensure_ranger_weapons(u);
    /* `uq` is C's local `obj`, which dothrow.c:552 REASSIGNS from uquiver after
     * doquiver_core() has refilled the slot — so it cannot be a const here. */
    let uq = u.uquiver;
    let uw = u.uwep, us = u.uswapwep;
    /* C ref: dothrow.c:478 `int altres, res = ECMD_OK;` — `res` is the
     * doquiver_core() result and outlives the throw: dothrow.c:583 returns
     * `(res == ECMD_TIME) ? res : altres`, so a quiver refill that unwielded a
     * weapon spends a turn even when the throw itself is cancelled. */
    let quiverRes = ECMD_OK, throwRes = ECMD_CANCEL;
    /* C dothrow.c:497 `if (!ok_to_throw(&shotlimit)) return ECMD_OK;` — the
     * SAME ok_to_throw() dothrow() calls, so the SAME shotlimit; see the note
     * at dothrow()'s copy for why it is 0 here rather than g.command_count.
     * It is threaded because throw_obj takes it, not because 'f' differs. */
    /* C dothrow.c:300 ok_to_throw(): `gm.multi = 0;` (reset; it's been used up)
     * — a counted `3f` fires ONCE (the count is shotlimit), it does not repeat. */
    g.multi = 0;
    const shotlimit = Math.max(0, Math.min(LARGEST_INT, Number(g.command_count) || 0)); /* LIMIT_TO_RANGE_INT(0, LARGEST_INT, gc.command_count) dothrow.c:298 */
    if (_hero_notake()) {
        await pline('You are physically incapable of throwing or shooting anything.');
        g.context = g.context || {};
        g.context.move = 0;   /* C ECMD_OK */
        return ECMD_OK;
    }
    if (_hero_verysmall_or_nohands_nohands_only()) {
        await pline("You can't throw or shoot without hands.");
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    if (check_capacity(null)) {
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_OK;
    }
    /* C ref: dothrow.c:475-478,506-509 — a wielded throw-and-return weapon
     * (AutoReturn(): aklys, boomerang, Mjollnir for a Valkyrie with STR 18/**)
     * is thrown when the quiver is empty or holds ammo, skipping both the
     * empty-quiver ladder and the fireassist ladder; control then reaches
     * throw_obj() (dothrow.c:581) and getdir()'s "In what direction?". */
    if (uw && throw_auto_return(uw, uw.owornmask | 0)
        && ((uw.oartifact | 0) !== 3 || acurr(u, A_STR) >= 125)
        && (!uq || is_ammo(uq))) {
        return await _fire_throw_obj(uw, shotlimit, true /* showPrompt */);
    }
    if (!uq) {
        const _fireassist = g.iflags?.fireassist !== false; /* iflags.fireassist = On (optlist.h default) */
        if (!g.flags?.autoquiver && uw && is_pole(uw)) {
            const _upRes = await use_pole(uw, true);
            g.context = g.context || {};
            g.context.move = (_upRes & ECMD_TIME) ? 1 : 0;
            return _upRes;
        }
        if (!g.flags?.autoquiver && uw && (uw.otyp | 0) === _BULLWHIP_OTYP) {
            /* C rung 2: `return use_whip(uwep)` (dothrow.c:515-517). */
            const _uwRes = await use_whip(uw);
            g.context = g.context || {};
            g.context.move = (_uwRes & ECMD_TIME) ? 1 : 0;
            return _uwRes;
        }
        if (!g.flags?.autoquiver
            && !(uw && (uw.otyp | 0) === _BULLWHIP_OTYP)
            && _fireassist && us && is_pole(us)
            && !(us.cursed && us.bknown)) {
            cmdq_add_ec(CQ_CANNED, 'doswapweapon');
            cmdq_add_ec(CQ_CANNED, 'dofire');
            /* C: return ECMD_OK — "haven't taken any time yet". */
            g.context = g.context || {};
            g.context.move = 0;
            return ECMD_OK;
        }
        /* C ref: dothrow.c:525-538 — the else rung, or the autoquiver arm. */
        if (g.flags?.autoquiver) {
            /* C ref: dothrow.c:529-538 — autoquiver arm */
            await autoquiver();
            uq = u.uquiver;
            if (uq) {
                uq.owornmask &= ~W_QUIVER_TO; /* less verbose */
                await prinv('You ready:', uq, 0);
                uq.owornmask |= W_QUIVER_TO;
            } else {
                await You('have nothing appropriate for your quiver.');
            }
        } else {
            await pline('You have no ammunition readied.');
        }
        if (!uq) (g.gi ||= {}).in_doagain = false; // C dothrow.c:545
        if (!uq) quiverRes = await doquiver_core('fire');
        if (quiverRes !== ECMD_OK && quiverRes !== ECMD_TIME) {
            /* C: `return res` — ECMD_CANCEL takes no time. */
            g.context.move = 0;
            return quiverRes;
        }
        uq = u.uquiver;
        // C dothrow.c:552-575: doquiver_core may unwield the readied ammo;
        // fireassist tests the current weapon slots after that transaction.
        uw = u.uwep;
        us = u.uswapwep;
        if (!uq) {
            /* C ref: dothrow.c:581 `altres = obj ? throw_obj(...) : ECMD_CANCEL`.
             * doquiver_core can return ECMD_OK without filling the slot (the
             * "You cannot fire that!" / "already have no ammunition readied!"
             * arms), and then nothing is thrown. */
            g.context.move = (quiverRes === ECMD_TIME) ? 1 : 0;
            return quiverRes === ECMD_TIME ? quiverRes : ECMD_CANCEL;
        }
        /* fall through to the fireassist ladder and throw_obj with the object
         * doquiver_core just readied */
    }
    /* C ref: dofire line 557-579 — fireassist: check if uquiver ammo fits a launcher */
    const fireassist = g.iflags?.fireassist !== false; /* iflags.fireassist = On default */
    if (is_ammo(uq) && fireassist) {
        // C dothrow.c:560-561, apply.c:3396-3419: prefer a reachable pole target.
        if (uw && is_pole(uw)) {
            const min = g._polearmRangeMin = 4;
            const max = g._polearmRangeMax = _grapple_range(); // same skill ranges as calc_pole_range
            const hitm = g.svc?.context?.polearm?.hitmon;
            if (_up_find_poleable_mon(min, max)
                || (hitm && !DEADMONSTER(hitm) && sensemon(hitm)
                    && dist2(hitm.mx, hitm.my, u.ux, u.uy) >= min
                    && dist2(hitm.mx, hitm.my, u.ux, u.uy) <= max))
                return await use_pole(uw, true);
        }
        if (ammo_and_launcher(uq, uw)) {
            const swapFrame = g._swapMoreFrame;
            g._swapMoreFrame = null;
            // Honor the retained swap frame ONLY for the cmdq fireassist re-fire
            // (this dofire was dequeued right after the swap), never for a fresh
            // where a stale frame from an earlier independent swap would otherwise
            // wrongly suppress the "In what direction?" prompt).
            const toplineHoldsSwap = !!g._dofireFromCmdq && !!swapFrame && !g._pending_message;
            throwRes = await _fire_throw_obj(uq, shotlimit, !toplineHoldsSwap /* showPrompt */, toplineHoldsSwap ? swapFrame : null);
        }
        else if (ammo_and_launcher(uq, us)) {
            if (FF_FAITHFUL) {
                cmdq_add_ec(CQ_CANNED, 'doswapweapon');
                cmdq_add_ec(CQ_CANNED, 'dofire');
                /* C ref: dothrow.c:570 return res (ECMD_OK) — no time taken yet.
                 * rhack's reset_cmd_vars leaves context.move=0; the moveloop runs
                 * NO world block for this keystroke and drains the queue next. */
                g.context.move = 0;
                return quiverRes;
            }
            await _doswapweapon(); /* nhgetch[11] fires here (More dismiss) */
            /* After swap, uwep is now the bow; arrows still in uquiver.
             * C: topline shows prior swap message → getdir uses addtopl, no fresh prompt. */
            if (ammo_and_launcher(u.uquiver, u.uwep)) {
                throwRes = await _fire_throw_obj(u.uquiver, shotlimit, false /* showPrompt — topline occupied by swap msg */);
            }
        }
        else {
            /* C ref: dothrow.c:571-579 — the THIRD fireassist rung,
             *     } else if ((olauncher = find_launcher(uquiver)) != 0) {
             *         if (uwep && !flags.pushweapon) cmdq_add_ec(doswapweapon);
             *         cmdq_add_ec(dowield); cmdq_add_key(olauncher->invlet);
             *         cmdq_add_ec(dofire); return res;
             * _find_launcher() is the find_launcher() port, used on the
             * FF_FAITHFUL (scored) path.
             *
             * FALLING THROUGH IS C's OWN BEHAVIOUR when no launcher exists:
             * dothrow.c:581 runs `altres = obj ? throw_obj(obj, shotlimit)
             * : ECMD_CANCEL` for EVERY path out of the assist ladder. */
            const olauncher = FF_FAITHFUL ? _find_launcher(uq) : null;
            if (olauncher) {
                /* C dothrow.c:571-577 — wield the launcher, then retry fire. */
                if (uw && !g.flags?.pushweapon)
                    cmdq_add_ec(CQ_CANNED, 'doswapweapon');
                cmdq_add_ec(CQ_CANNED, 'dowield');
                cmdq_add_key(CQ_CANNED, olauncher.invlet);
                cmdq_add_ec(CQ_CANNED, 'dofire');
                /* `return res` — no time taken by this pass itself unless
                 * doquiver_core spent it. */
                g.context = g.context || {};
                g.context.move = (quiverRes === ECMD_TIME) ? 1 : 0;
                return quiverRes; /* C dothrow.c:579 `return res`: rhack must see it to reset_cmd_vars */
            }
            throwRes = await _fire_throw_obj(uq, shotlimit, true /* showPrompt */);
        }
    }
    else {
        throwRes = await _fire_throw_obj(uq, shotlimit, true /* showPrompt */);
    }
    /* C ref: dothrow.c:583 `return (res == ECMD_TIME) ? res : altres;` — a
     * quiver refill that unwielded the primary/secondary weapon spends the turn
     * whatever the throw did. */
    if (quiverRes === ECMD_TIME) {
        g.context = g.context || {};
        g.context.move = 1;
    }
    return quiverRes === ECMD_TIME ? quiverRes : throwRes;
}

/* C dothrow.c:447-465 find_launcher() — look through the hero's inventory for
 * a launcher matching `ammo`, avoiding known-cursed items; prefer a known-BUC
 * one, else the first unknown-BUC match. */
function _find_launcher(ammo) {
    if (!ammo)
        return null;
    let oX = null;
    for (let otmp = game.invent; otmp; otmp = otmp.nobj) {
        if (otmp.cursed && otmp.bknown)
            continue;
        if (ammo_and_launcher(ammo, otmp)) {
            if (otmp.bknown)
                return otmp;
            if (!oX)
                oX = otmp;
        }
    }
    return oX;
}

function _throw_obj_multishot(obj, launcher, shotlimit) {
    const g = game;
    const u = g.u || {};
    let multishot = 1;
    if (!obj)
        return multishot;
    const initrole = (g.flags?.initrole ?? -1) | 0;
    const initrace = (g.flags?.initrace ?? -1) | 0;
    const objQuan = (obj.quan != null) ? (obj.quan | 0) : 50;
    if (!(objQuan > 1
          && (is_ammo(obj) ? matching_launcher(obj, launcher)
                           : (obj.oclass | 0) === OCLASS_WEAPON)
          && !_throw_confused_or_stunned()))
        return multishot;
    /* weakmultishot (dothrow.c:172-174): roles/conditions that inhibit bonus.
     * Fumbling and DEX <= 6 assumed false (no extrinsic tracking in JS yet). */
    const skill = _oc_skill(obj); /* objects[obj.otyp].oc_skill (faithful MKOBJ_OC_SKILL table) */
    const PM_WIZARD_R = 12, PM_CLERIC_R = 6, PM_HEALER_R = 3, PM_TOURIST_R = 10;
    const P_KNIFE_SKILL = 2, P_DART_SKILL = -23; /* C: P_KNIFE=2, -P_DART=-23 */
    const weakmultishot = (initrole === PM_WIZARD_R
        || initrole === PM_CLERIC_R
        || (initrole === PM_HEALER_R && skill !== P_KNIFE_SKILL)
        || (initrole === PM_TOURIST_R && skill !== P_DART_SKILL)
        /* poor dexterity also inhibits multishot */
        || _uprop_active('FUMBLING') || (acurr(u, A_DEX) | 0) <= 6);

    /* Skill bonus (dothrow.c:176-188): P_SKILL(weapon_type(obj)).
     * weapon_type(ammo) = abs(oc_skill) = P_BOW for arrows.
     * Starting hero has P_BASIC for bow skill (set by skill_init from inventory).
     * u.weapon_skills may be populated by a future skill-tracking port;
     * fall back to P_BASIC (2) when absent. */
    /* C ref: dothrow.c:177 `switch (P_SKILL(weapon_type(obj)))`, and
     * weapon.c weapon_type(): the skill index is abs(oc_skill) of the THROWN
     * object — P_DART for darts, P_BOW for arrows — not P_BOW unconditionally.
     * Hardcoding P_BOW read the wrong row of u.weapon_skills for every
     * hand-thrown missile. */
    const P_BASIC = 2, P_SKILLED = 3, P_EXPERT = 4;
    const _skillIdx = skill < 0 ? -skill : skill;
    const bowSkill = (u.weapon_skills && u.weapon_skills[_skillIdx] !== undefined)
        ? (u.weapon_skills[_skillIdx].skill ?? P_BASIC)
        : P_BASIC;
    if (bowSkill >= P_EXPERT) {
        multishot++;         /* P_EXPERT branch: multishot++ */
        /* FALLTHROUGH to P_SKILLED */
        if (!weakmultishot)
            multishot++;     /* P_SKILLED fallthrough: if (!weak) multishot++ */
    } else if (bowSkill >= P_SKILLED) {
        if (!weakmultishot)
            multishot++;     /* P_SKILLED only */
    }
    /* default (P_BASIC or lower): no bonus */

    /* Class bonus (dothrow.c:190): role-specific volley count */
    multishot += _multishot_class_bonus(initrole, obj, launcher);

    /* Race bonus (dothrow.c:193-222): racial launcher/ammo pairing */
    if (!weakmultishot) {
        const PM_ELF_RACE  = 1, PM_ORC_RACE = 4, PM_GNOME_RACE = 3;
        if (initrace === PM_ELF_RACE) {
            /* C ref: dothrow.c:196-198 — elven arrow + elven bow → +1 */
            if (obj.otyp === OTYP_ELVEN_ARROW
                    && launcher && launcher.otyp === OTYP_ELVEN_BOW)
                multishot++;
        } else if (initrace === PM_ORC_RACE) {
            /* C ref: dothrow.c:199-202 — orcish arrow + orcish bow → +1 */
            if (obj.otyp === OTYP_ORCISH_ARROW
                    && launcher && launcher.otyp === OTYP_ORCISH_BOW)
                multishot++;
        } else if (initrace === PM_GNOME_RACE) {
            /* C ref: dothrow.c:203-206 — gnome crossbow skill → +1 */
            const P_CROSSBOW_SKL = -22; /* oc_skill for crossbow bolts */
            if (skill === P_CROSSBOW_SKL)
                multishot++;
        }
        /* C ref: dothrow.c:216-222 — own quest-artifact launcher gives +1 with
         * any ammo appropriate for it. */
        if (launcher && is_quest_artifact(launcher)
                && ammo_and_launcher(obj, launcher))
            multishot++;
    }

    /* Crossbow slow-load (dothrow.c:228-231):
     * multishot > 1 && crossbow bolt + launcher && low STR → rnd(multishot).
     * Arrows are not crossbow bolts; skip for arrow path. */
    const P_CROSSBOW_BOLT_SKILL = -22;
    if (multishot > 1 && skill === P_CROSSBOW_BOLT_SKILL
            && ammo_and_launcher(obj, launcher)) {
        const str = acurr(u, A_STR) | 0;  /* acurrstr(), attrib.c:1235 */
        const acurrstr = str <= 18 ? str : (str <= 121 ? 19 + Math.trunc(str / 50) : str - 100);
        if (acurrstr < (initrace === 3 /* PM_GNOME */ ? 16 : 18))
            multishot = rnd(multishot);
    }

    /* Final multishot roll (dothrow.c:233) */
    multishot = rnd(multishot);

    /* Cap to available arrows (dothrow.c:234) */
    if (multishot > objQuan)
        multishot = objQuan;
    /* C dothrow.c:236-237 — apply the requested count after the roll. */
    if (shotlimit > 0 && multishot > shotlimit)
        multishot = shotlimit;
    return multishot;
}

function _throw_confused_or_stunned() {
    const up = game.u?.uprops;
    if (!up)
        return false;
    const conf = ((up[CONFUSION]?.intrinsic) | 0) || ((up[CONFUSION]?.extrinsic) | 0);
    const stun = ((up[STUNNED]?.intrinsic) | 0) || ((up[STUNNED]?.extrinsic) | 0);
    return !!(conf || stun);
}

// C ref: dothrow.c multishot_class_bonus() — role-specific volley bonus.
// Returns extra shots for the given role (pm = initrole index) + ammo + launcher.
// C ref: dothrow.c:39-83.  skill = objects[ammo.otyp].oc_skill (can be negative).
// P_DAGGER=1, P_SLING=21, P_SPEAR=17, P_SHURIKEN=24, P_BOW=20.
function _multishot_class_bonus(pm, ammo, launcher) {
    const roleMnum = (pm === 2 || pm === PM_CAVE_DWELLER) ? PM_CAVE_DWELLER :
        (pm === 5 || pm === PM_MONK) ? PM_MONK :
        (pm === 8 || pm === PM_RANGER) ? PM_RANGER :
        (pm === 7 || pm === PM_ROGUE) ? PM_ROGUE :
        (pm === 9 || pm === PM_SAMURAI) ? PM_SAMURAI : pm;
    return multishot_class_bonus(roleMnum, ammo, launcher);
}

// C ref: dothrow.c:38-83 multishot_class_bonus() — exact port.  pm is a
// MONSTER index (C passes Role_switch or monsndx()), not a role index.
export function multishot_class_bonus(pm, ammo, launcher) {
    let multishot = 0;
    const skill = _oc_skill(ammo);
    const YA = OTYP_YA, YUMI = OTYP_YUMI;

    switch (pm) {
    case PM_CAVE_DWELLER:
        if (skill === -P_SLING || skill === P_SPEAR)
            multishot++;
        break;
    case PM_MONK:
        if (skill === -P_SHURIKEN)
            multishot++;
        break;
    case PM_RANGER:
        if (skill !== P_DAGGER)
            multishot++;
        break;
    case PM_ROGUE:
        if (skill === P_DAGGER)
            multishot++;
        break;
    case PM_NINJA:
        if (skill === -P_SHURIKEN || skill === -P_DART)
            multishot++;
        /* FALLTHROUGH */
    case PM_SAMURAI:
        if (ammo.otyp === YA && launcher && launcher.otyp === YUMI)
            multishot++;
        break;
    default:
        break;
    }

    return multishot;
}

// C ref: dothrow.c throw_obj body after getdir() succeeds, multishot block
// (dothrow.c:161-238) and throwit loop (dothrow.c:254-273).
// Called from dofire() after launcher match is confirmed (ammo_and_launcher=true).
// This replaces the former stub that only consumed the direction nhgetch.
//
//   1. rnd(multishot)         @ throw_obj(dothrow.c:233)   — multishot roll
//   2. rnd(2) × multishot     @ next_ident(mkobj.c:522)    — per-arrow splitobj ident
//   3. rn2(100) × multishot   @ obj_resists(zap.c:1469)    — per-arrow breaktest
async function _fire_throw_obj(obj, shotlimit, showPrompt, committedFrame) {
    const g = game;
    /* getdir() paints the prompt for the 't' path and for a plain 'f'; the two
     * cmdq-drain shapes below either retain a committed frame in its place or
     * page a backlog and then let getdir paint.  DISPLAY-channel only. */
    let _noPrompt = !showPrompt;
    /* C ref: dothrow.c throw_obj → getdir(NULL,NULL,&dx,&dy) → tty_yn_function("In what direction?")
     * When called from the direct-fire path (bow already wielded, no doswapweapon):
     *   topline is clear → C shows "In what direction?" before reading the direction key.
     * When called after doswapweapon:
     *   topline already shows the swap message → C reads direction without fresh prompt.
     * showPrompt=true → direct path; showPrompt=false → post-swap path. */
    if (showPrompt) {
        let _standing = g._pending_message;
        /* A fireassist retry (dowield of the launcher, then the re-queued
         * dofire — dothrow.c:571-577) runs from the canned queue, so rhack never
         * restored the wield prinv from _resultMessage to the topline; it is
         * still standing there unacknowledged in C when getdir's yn_function
         * pages it. */
        if (!_standing && g._dofireFromCmdq && g._resultMessage)
            _standing = g._resultMessage;
        if (_standing && String(_standing).length > 0 && !g._topl_win_stop) {
            /* The fireassist wield's banked movemon moved the pet, but getdir's
             * yn_function pages with no flush_screen, so unless moveloop's
             * guarded bot()/timebot() + curs_on_u() (allmain.c:474-480) flushed
             * the map — js/allmain.js moveloop_status_paint drops the frame when
             * it does — the physical screen is still the pre-movemon frame. */
            const _pf = (g._dofireFromCmdq && g._fireSwapPending)
                ? g._fireSwapPreFrame : null;
            const _sSnap = g._paintedSnapshot;
            const _sMM = g._inMovemonMore;
            if (_pf) {
                g._paintedSnapshot = { cells: _pf.cells, moves: g.flags?.time ? (g.moves | 0) : (_pf.moves | 0) };
                g._inMovemonMore = true;
            }
            await force_more(String(_standing));
            if (_pf) {
                g._paintedSnapshot = _sSnap || null;
                g._inMovemonMore = _sMM || false;
            }
            if (g._dofireFromCmdq && g._fireSwapPending) {
                g._fireSwapPreFrame = null;
                g._fireSwapPending = false;
            }
            if (_standing === g._resultMessage)
                g._resultMessage = null;
        }
        /* Leave WIN_STOP for getdir's shared yn_function reader: topl.c:390-394
         * tests it before clearing it. Clearing here makes that reader page
         * the standing message again after an ESC-dismissed overflow.
         * That reader also paints the direction prompt inside throw_obj. */
    } else if (committedFrame) {
        if (g._movemonMsgTurn != null && g._resultMessage) {
            /* C ref: win/tty/topl.c update_topl:257-268 — the banked plines are ONE
             * topline: a later pline JOINS ("  ") when it fits the CO-8 reserve and
             * only otherwise raises more().  Page by that rule (the recorded join
             * offsets), not one --More-- per pline: C shows "q - a crossbow (weapon
             * in right hand).  You hear a door open.--More--" as a single page. */
            const _rm = String(g._resultMessage);
            const _rmj = g._resultMessageJoins?.src === _rm
                ? g._resultMessageJoins.joins : _topl_joins_snapshot(_rm);
            const segs = _topl_more_pages(_rm, _rmj || undefined).filter((s) => s.length > 0);
            const preSegSet = new Set(
                String(g._fireSwapPreSegs || '').split('  ').filter((s) => s.length > 0));
            const preFrame = g._fireSwapPreFrame;
            let _segEnd = 0;
            for (const seg of segs) {
                const full = seg + '--More--';
                /* C pline.c:273-274 / topl.c:274 — a page raised by a LATER movemon
                 * pline froze the screen that pline's flush_screen() synced, after
                 * the pet's earlier moves this turn; only the last page (raised by
                 * getdir's yn_function, no flush) keeps the pre-movemon frame.
                 * Locate the following message's recorded flush frame by offset. */
                const _segStart = _rm.indexOf(seg, _segEnd);
                _segEnd = (_segStart < 0 ? _segEnd : _segStart) + seg.length;
                const _ownPf = (g._plineFlushFrames || []).findLast((f) => f.cells
                    && f.off === _segEnd && f.off >= 0
                    && _rm.slice(f.off + 2, f.off + 2 + f.msg.length) === f.msg);
                const freezePre = !!(preFrame && seg.split('  ').every((x) => preSegSet.has(x)));
                /* C pline.c:273-274 + topl.c:389-391 — the LAST page is raised by
                 * getdir's yn_function more(), which flushes nothing, so it shows
                 * the screen as of the most recent flush: the flush_screen() of the
                 * last pline joined into this page (e.g. monkilled's "is
                 * destroyed!", taken BEFORE mondead's newsym and the pet's later
                 * moves).  A live preFrame proves moveloop's guarded curs_on_u()
                 * (allmain.c:474-480) did not flush after it. */
                const _lastPf = (!_ownPf && !freezePre && preFrame && _segStart >= 0
                    && seg === segs[segs.length - 1])
                    ? (g._plineFlushFrames || []).findLast((f) => f.cells
                        && f.off + 2 >= _segStart && f.off < _segEnd
                        && _rm.slice(f.off + 2, f.off + 2 + f.msg.length) === f.msg)
                    : null;
                const savedSnap = g._paintedSnapshot;
                const savedInMM = g._inMovemonMore;
                if (_ownPf || _lastPf) {
                    const _fpf = _ownPf || _lastPf;
                    g._paintedSnapshot = { cells: _fpf.cells, moves: _fpf.moves | 0,
                                           botl: _fpf.botl || null };
                    g._inMovemonMore = true;
                } else if (freezePre) {
                    /* Install the pre-movemon frozen frame and mark the paging window
                     * so render_map_row's _snapCellAt and _statusLine2 read the frozen
                     * map ("@d%#") + frozen T: (this seg is paged by a direct
                     * flush_screen, not _topl_more, so _inMovemonMore must be set
                     * here). */
                    g._paintedSnapshot = { cells: preFrame.cells, moves: preFrame.moves | 0 };
                    g._inMovemonMore = true;
                }
                /* C ref: getline.c:230 xwaitforspace("\033 ") via topl.c more() —
                 * only space/CR/LF/ESC page this; every other key is consumed with
                 * a bell and the page stays up.  Was a bare nhgetch(). */
                const _showSeg = async () => {
                    g._pending_message = full;
                    await flush_screen(1);
                    set_cursor(full.length, 0);
                };
                await _showSeg();
                const _segMorc = await await_topl_more_dismiss(_showSeg); /* dismiss key (a space) */
                if (_ownPf || _lastPf || freezePre) {
                    /* flush_screen's post-more cleanup already dropped the snapshot we
                     * installed; restore any pre-existing one we displaced. */
                    g._paintedSnapshot = savedSnap || null;
                    g._inMovemonMore = savedInMM || false;
                }
                /* topl.c more():232-235 + update_topl:257 — ESC at this page sets WIN_STOP,
                 * so every later pline of the turn is suppressed (the page-raising head is
                 * drawn, then getdir's yn_function, getline.c:53-55, sees WIN_STOP, raises
                 * no more() and wipes it with the prompt). */
                if (_segMorc === 27) break;
            }
            g._fireSwapPreFrame = null;
            g._fireSwapPreSegs = null;
            g._fireSwapPending = false;
            g._resultMessage = null;
            /* Now show the actual "In what direction?" getdir prompt and read the
             * genuine direction key (C ref: getdir → tty_yn_function).  The
             * prompt itself is painted by getdir() inside throw_obj — this
             * drain runs BEFORE it and only pages the backlog. */
            _noPrompt = false;
        } else {
            g._pending_message = committedFrame;
            await flush_screen(1);
            set_cursor(committedFrame.length, 0);
            /* With no movemon pline, C still flushes the displaced alternate
             * weapon prinv before getdir reads the real direction key.  The
             * swap page above is the wielded weapon; this second page is the
             * deferred old-primary line held in _resultMessage. */
            if (g._resultMessage) {
                const deferred = String(g._resultMessage).replace(/\.$/, '');
                /* C ref: win/tty/topl.c more(); display.c flush_screen(); allmain.c
                 * :261-263,476-478.  The page is raised by getdir's yn_function with
                 * no pline (and so no flush_screen, pline.c) after the swap's banked
                 * movemon, and the queued dofire has no readchar flush either: the
                 * moved pet sits unflushed in gbuf.  The only flush on this path is
                 * moveloop's guarded bot()/timebot() + curs_on_u(); when it runs
                 * (a new turn with `time` on, or a pending botl) js/allmain.js
                 * moveloop_status_paint drops g._fireSwapPreFrame and the page
                 * shows the live post-movemon map. */
                const _preFrame = g._fireSwapPreFrame;
                const _savedSnap = g._paintedSnapshot;
                const _savedInMM = g._inMovemonMore;
                if (_preFrame) {
                    g._paintedSnapshot = { cells: _preFrame.cells, moves: _preFrame.moves | 0 };
                    g._inMovemonMore = true;
                }
                await _topline_more(deferred);
                if (_preFrame) {
                    g._paintedSnapshot = _savedSnap || null;
                    g._inMovemonMore = _savedInMM || false;
                }
                g._fireSwapPreFrame = null;
                g._fireSwapPreSegs = null;
                g._fireSwapPending = false;
                g._resultMessage = null;
                /* The deferred page has now been dismissed.  C's next read is
                 * a fresh getdir prompt, so discard the parked page before
                 * asking getdir to paint that prompt. */
                g._pending_message = '';
                _noPrompt = false;
            }
        }
    }
    /* C dothrow.c:581 — ONE throw_obj, the same one dothrow() calls. */
    return await throw_obj(obj, shotlimit, { noPrompt: _noPrompt });
}

/* C ref: dothrow.c:1976-2003 should_mulch_missile(struct obj *obj)
 * Determine if a missile/ammo should be destroyed when it hits its target.
 * Returns TRUE if the object should break; FALSE if it survives.
 * C boolean is unsigned char; broken holds raw rn2/rnl values (0..N),
 * so we keep it as a plain number and return it directly. */
const OTYP_BOOMERANG = 26;  /* objects.h missile range (-P_BOOMERANG) */

const GEM_CLASS = 13;       /* objclass.h */

const OC_TOUGH_GEMS = new Set([
    440, /* DIAMOND */
    441, /* RUBY */
    442, /* JACINTH */
    443, /* SAPPHIRE */
    444, /* BLACK_OPAL */
    445, /* EMERALD */
    448, /* AQUAMARINE */
    450, /* TOPAZ */
]);

export function should_mulch_missile(obj) {
    if (!obj) return 0;

    /* only ammo (excluding magic stones) or missiles will break */
    if (!(is_ammo(obj) || is_missile(obj)))
        return 0;

    const otyp = obj.otyp | 0;
    if (otyp === OTYP_BOOMERANG)
        return 0;

    /* C dothrow.c:1984 — should_mulch_missile excludes every object whose
     * own oc_magic flag is set. */
    if (MKOBJ_OC_MAGIC[otyp])
        return 0;

    /* Calculate chance to break based on erosion and spe enhancement. */
    const spe = obj.spe | 0;
    const oeroded = obj.oeroded | 0;
    const oeroded2 = obj.oeroded2 | 0;
    const chance = 3 + Math.max(oeroded, oeroded2) - spe;

    let broken;
    if (chance > 1) {
        broken = rn2(chance);           /* raw int, like C */
    } else {
        broken = rn2(4) ? 0 : 1;        /* !rn2(4) → 0 or 1 */
    }

    /* Blessed objects have a chance to survive. */
    if (obj.blessed) {
        const mon_moving = game.context && game.context.mon_moving;
        if (mon_moving ? !rn2(3) : !rnl(4))
            broken = 0;
    }

    /* Flint and hard gems don't break easily */
    if (((obj.oclass === GEM_CLASS && OC_TOUGH_GEMS.has(otyp))
         || otyp === OTYP_FLINT)
        && !rn2(2))
        broken = 0;

    return broken;
}

/* C ref: dothrow.c:2582-2610 — breaktest(struct obj *obj) */
export function breaktest(obj) {
    const ARMOR_CLASS = 3;
    const GEM_CLASS = 13;
    const POTION_CLASS = 8;
    const _MAT_GLASS = 19;

    const POT_WATER = 322;
    const EXPENSIVE_CAMERA = 229;
    const EGG = 266;
    const CREAM_PIE = 287; /* objects.h FOOD() CREAM_PIE; was 286 = LUMP_OF_ROYAL_JELLY */
    const MELON = 280; /* objects.h FOOD() MELON; was 284 = CLOVE_OF_GARLIC */
    const ACID_VENOM = 480; /* objects.h VENOM() ACID_VENOM; was 244 = BEARTRAP */
    const BLINDING_VENOM = 479; /* objects.h VENOM() BLINDING_VENOM; was 247 = WOODEN_FLUTE */

    let nonbreakchance = 1; /* chance for non-artifacts to resist */

    /* this may need to be changed if actual glass armor gets added someday;
       for now, it affects crystal plate mail and helm of brilliance;
       either of them will have to be cracked 4 times before breaking */
    if ((obj.oclass | 0) === ARMOR_CLASS && (MKOBJ_OC_MATERIAL[obj.otyp] | 0) === _MAT_GLASS)
        nonbreakchance = 90;

    if (obj_resists(obj, nonbreakchance, 99))
        return false;
    if ((MKOBJ_OC_MATERIAL[obj.otyp] | 0) === _MAT_GLASS && !obj.oartifact
        && (obj.oclass | 0) !== GEM_CLASS)
        return true;
    switch ((obj.oclass | 0) === POTION_CLASS ? POT_WATER : obj.otyp) {
    case EXPENSIVE_CAMERA:
    case POT_WATER: /* really, all potions */
    case EGG:
    case CREAM_PIE:
    case MELON:
    case ACID_VENOM:
    case BLINDING_VENOM:
        return true;
    default:
        return false;
    }
}

/* C hack.h next2u(x,y) = (distu(x,y) < 3).  Local to the throwit landing-break
 * tail below (this file already has several other next2u-shaped locals under
 * other names — dogmove.js's distu, mhitu.js's m_next2u — none reusable here
 * without an import, so a small file-local copy is cheapest). */
function _throwit_next2u(x, y) {
    const u = game.u || {};
    return dist2(x, y, u.ux | 0, u.uy | 0) < 3;
}

/* mondata.h:37/46 breathless(ptr)/haseyes(ptr) — same bit layout js/potion.js's
 * file-local copies use (M1_BREATHLESS 0x400, M1_NOEYES 0x1000), reproduced
 * here rather than imported because both are file-local (unexported) there. */
function _throwit_breathless(mondata) {
    return (((mondata && mondata.mflags1) | 0) & 0x00000400) !== 0;
}

function _throwit_haseyes(mondata) {
    return (((mondata && mondata.mflags1) | 0) & 0x00001000) === 0;
}

async function _throwit_breakmsg(obj, in_view) {
    if ((obj.oclass | 0) === 3 && (MKOBJ_OC_MATERIAL[obj.otyp] | 0) === 19) return; // C dothrow.c:2618: erode_obj prints cracks
    const POTION_CLASS = 8, POT_WATER = 322;
    const EGG_OTYP = 266, MELON_OTYP = 280, CREAM_PIE_OTYP = 287;
    const ACID_VENOM_OTYP = 480, BLINDING_VENOM_OTYP = 479;
    const key = (obj.oclass | 0) === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    switch (key) {
    case POT_WATER: {
        if (!in_view) {
            await You_hear('%s shatter!', 'something');
        } else {
            const nm = await _doaltarobj_Doname2(obj);
            await pline(`${nm} shatter${(obj.quan | 0) === 1 ? 's' : ''}!`);
        }
        break;
    }
    case EGG_OTYP:
    case MELON_OTYP:
        await pline('Splat!');
        break;
    case CREAM_PIE_OTYP:
        if (in_view) await pline('What a mess!');
        break;
    case ACID_VENOM_OTYP:
    case BLINDING_VENOM_OTYP:
        await pline('Splash!');
        break;
    default: {
        /* C dothrow.c:2611-2632: wands, lenses, mirrors, crystal balls,
         * cameras, and other breakable glass objects use the same shatter
         * announcement.  Keep this throw-specific async copy aligned with
         * breakmsg(), whose awaited shared form serves hero_breaks(). */
        const WAND_CLASS = 11;
        const LENSES = 232, MIRROR = 230, CRYSTAL_BALL = 231,
            EXPENSIVE_CAMERA = 229;
        const t = obj.otyp | 0;
        if ((obj.oclass | 0) !== WAND_CLASS && t !== LENSES && t !== MIRROR
            && t !== CRYSTAL_BALL && t !== EXPENSIVE_CAMERA)
            await real_impossible('breaking odd object (%d)?', t);
        const pieces = ' into a thousand pieces';
        if (!in_view) {
            await You_hear('something shatter!');
        } else {
            const nm = await _doaltarobj_Doname2(obj);
            await pline(`${nm} shatter${(obj.quan | 0) === 1 ? 's' : ''}${pieces}!`);
        }
        break;
    }
    }
}

/* C dothrow.c:2457 release_camera_demon.  The monster constructor is
 * synchronous in this port; only the visibility message can suspend. */
export async function release_camera_demon(obj, x, y) {
    if (rn2(3) !== 0) return;
    const mtmp = await mklev_makemon(rn2(3) ? PM_HOMUNCULUS : PM_IMP,
                               x | 0, y | 0, MM_NOMSG);
    if (!mtmp) return;
    if (canspotmon(mtmp))
        await pline('%s is released!', _cmd_Hallucination()
                                    ? An(look_rndmonnam())
                                    : 'The picture-painting demon');
    mtmp.mpeaceful = !obj.cursed;
    set_malign(mtmp);
}

async function _throwit_breakobj(obj, x, y) {
    const ARMOR_CLASS = 3, _MAT_GLASS = 19;
    if ((obj.oclass | 0) === ARMOR_CLASS
        && (MKOBJ_OC_MATERIAL[obj.otyp] | 0) === _MAT_GLASS) {
        /* C breakobj() starts with is_crackable/erode_obj.  Keep the
         * throw-specific path on the same erosion implementation used by
         * hero_breaks(), including its protection and destruction result. */
        return await erode_obj_bo(obj, armor_simple_name(obj), ERODE_CRACK,
                            EF_DESTROY | EF_VERBOSE) === ER_DESTROYED;
    }
    const POTION_CLASS = 8, POT_WATER = 322, POT_OIL = 321;
    const MIRROR_OTYP = 230, EGG_OTYP = 266, EXPENSIVE_CAMERA_OTYP = 229;
    const BOULDER_OTYP = 475, STATUE_OTYP = 476, PM_PYROLISK = 11;
    let fracture = false;
    let explosion = false;
    const key = (obj.oclass | 0) === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    switch (key) {
    case MIRROR_OTYP:
        change_luck(-2); /* hero_caused is always TRUE at this call site */
        break;
    case POT_WATER: {
        obj.in_use = 1;
        if ((obj.otyp | 0) === POT_OIL && obj.lamplit) {
            await explode_oil(obj, x, y);
        } else if (_throwit_next2u(x, y)) {
            const mdata = game.youmonst && game.youmonst.data;
            if (!_throwit_breathless(mdata) || _throwit_haseyes(mdata)) {
                if ((obj.otyp | 0) !== POT_WATER && !(game.u.ublindf?.otyp === _TOWEL_OTYP && game.u.ublindf.spe > 0)) {
                    if (!_throwit_breathless(mdata)) {
                        await pline('You smell a peculiar odor...');
                    } else {
                        let eyes = body_part(EYE);
                        // C dothrow.c:2512-2513: plural unless the form has one eye.
                        if (_eyecount(mdata) !== 1)
                            eyes = makeplural_objnam(eyes);
                        await Your('%s %s.', eyes, vtense(eyes, 'water'));
                    }
                }
                await potionbreathe(obj);
            }
        }
        break;
    }
    case EXPENSIVE_CAMERA_OTYP:
        await release_camera_demon(obj, x, y);
        break;
    case EGG_OTYP:
        if (obj.spe && _ismnum_local(obj.corpsenm))
            change_luck(-Math.min(obj.quan | 0, 5));
        if ((obj.corpsenm | 0) === PM_PYROLISK)
            explosion = true;
        break;
    case BOULDER_OTYP:
    case STATUE_OTYP:
        fracture = true;
        break;
    default:
        break;
    }
    if ((game.u.ushops && game.u.ushops[0]) || obj.unpaid) {
        await check_shop_obj_throw(obj, x, y, true);
    }
    if (!fracture) await _delobj_useupf(obj);
    if (explosion) {
        await explode(x, y, -11, d(3, 6), 0, EXPL_FIERY);
    }
    return true;
}

/* C ref: dothrow.c:2417-2437 — hero_breaks(struct obj *, coordxy, coordxy, unsigned) */
export async function hero_breaks(obj, x, y, breakflags) {
    /* from_invent: thrown or dropped by player; maybe on shop bill;
       by-hero is implicit so callers don't need to specify BRK_BY_HERO */
    const from_invent = (breakflags & BRK_FROM_INV) !== 0;
    const in_view = _uprop_active('BLINDED') ? false : (from_invent || cansee(x, y));
    let brk = (breakflags & BRK_KNOWN_OUTCOME);

    /* only call breaktest if caller hasn't already specified the outcome */
    if (!brk)
        brk = breaktest(obj) ? BRK_KNOWN2BREAK : BRK_KNOWN2NOTBREAK;
    if (brk === BRK_KNOWN2NOTBREAK)
        return 0;

    await breakmsg(obj, in_view);
    return await breakobj(obj, x, y, true, from_invent);
}

export async function breakmsg(obj, in_view) {
    /* C dothrow.c:2611-2653.  Message-only phase; no RNG or object mutation. */
    if (is_crackable_bo(obj)) return;
    const POTION_CLASS = 8, WAND_CLASS = 11;
    const POT_WATER = 322, LENSES = 232, MIRROR = 230,
        CRYSTAL_BALL = 231, EXPENSIVE_CAMERA = 229,
        EGG = 266, MELON = 280, CREAM_PIE = 287,
        ACID_VENOM = 480, BLINDING_VENOM = 479;
    const type = (obj.oclass | 0) === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    if (![EGG, MELON, CREAM_PIE, ACID_VENOM, BLINDING_VENOM].includes(type)) {
        if ((obj.oclass | 0) !== WAND_CLASS && type !== POT_WATER
            && ![LENSES, MIRROR, CRYSTAL_BALL, EXPENSIVE_CAMERA].includes(type))
            await real_impossible('breaking odd object (%d)?', obj.otyp);
        const pieces = (type === POT_WATER ? '' : ' into a thousand pieces');
        if (!in_view) {
            await You_hear('something shatter!');
        } else {
            const name = await _doaltarobj_Doname2(obj);
            await pline(`${name} shatter${(obj.quan | 0) === 1 ? 's' : ''}${pieces}!`);
        }
    } else if (type === EGG || type === MELON) {
        await pline('Splat!');
    } else if (type === CREAM_PIE) {
        if (in_view) await pline('What a mess!');
    } else if (type === ACID_VENOM || type === BLINDING_VENOM) {
        await pline('Splash!');
    }
}

export async function breakobj(obj, x, y, hero_caused, from_invent) {
    if (is_crackable_bo(obj)) {
        return await erode_obj_bo(obj, armor_simple_name(obj), ERODE_CRACK,
                             EF_DESTROY | EF_VERBOSE) === ER_DESTROYED;
    }

    const POTION_CLASS = 8, POT_WATER = 322, POT_OIL = 321;
    const MIRROR_OTYP = 230, EGG_OTYP = 266, EXPENSIVE_CAMERA_OTYP = 229;
    const BOULDER_OTYP = 475, STATUE_OTYP = 476, PM_PYROLISK = 11;
    let fracture = false;
    let explosion = false;
    const key = (obj.oclass | 0) === POTION_CLASS ? POT_WATER : (obj.otyp | 0);
    switch (key) {
    case MIRROR_OTYP:
        if (hero_caused) change_luck(-2);
        break;
    case POT_WATER: {
        obj.in_use = 1; /* in case it's fatal */
        if ((obj.otyp | 0) === POT_OIL && obj.lamplit) {
            /* UNAWAITED, AND NOT FOR THE REASON THE OLD NOTE GAVE.  It
               used to say 'matching this function's own sync-context pline()
               calls just above'; pline() is async-but-VACUOUS (no await
               anywhere in its transitive body), so calling it unawaited is
               behaviourally a sync call.  explode_oil is NOT: it
               awaits explode(), which awaits drain_pending_death_in_place ->
               do_death_sequence -> really_done -> readKey.  It can suspend, so
               this call really does run C's dothrow.c:2503 AFTER breakobj()
               returns.
               THE BOUNDARY IS NOT HERE — see the async-boundary note above
               breakobj()'s header. */
            await explode_oil(obj, x, y);
        } else if (_throwit_next2u(x, y)) {
            const mdata = game.youmonst && game.youmonst.data;
            if (!_throwit_breathless(mdata) || _throwit_haseyes(mdata)) {
                if ((obj.otyp | 0) !== POT_WATER && !(game.u.ublindf?.otyp === _TOWEL_OTYP && game.u.ublindf.spe > 0)) {
                    if (!_throwit_breathless(mdata)) {
                        await pline('You smell a peculiar odor...');
                    } else {
                        let eyes = body_part(EYE);
                        if (_eyecount(mdata) !== 1) /* C dothrow.c:2512 */
                            eyes = makeplural_objnam(eyes);
                        await Your('%s %s.', eyes, vtense(eyes, 'water'));
                    }
                }
                await potionbreathe(obj);
            }
        }
        break;
    }
    case EXPENSIVE_CAMERA_OTYP:
        await release_camera_demon(obj, x, y);
        break;
    case EGG_OTYP:
        if (hero_caused && obj.spe && _ismnum_local(obj.corpsenm))
            change_luck(-Math.min(obj.quan | 0, 5));
        if ((obj.corpsenm | 0) === PM_PYROLISK)
            explosion = true;
        break;
    case BOULDER_OTYP:
    case STATUE_OTYP:
        /* caller will handle object disposition; we're just doing the shop
           theft handling */
        fracture = true;
        break;
    default:
        break;
    }

    if (hero_caused) {
        if (from_invent || obj.unpaid) {
            if ((game.u.ushops && game.u.ushops[0]) || obj.unpaid) {
                await check_shop_obj_throw(obj, x, y, true);
            }
        } else if (!obj.no_charge && costly_spot(x, y)) {
            const rooms = shk_in_rooms(x | 0, y | 0, SHOPBASE) || [];
            const shkp = rooms.length ? shk_shop_keeper(rooms[0] | 0) : null;
            if (shkp) {
                /* C dothrow.c:2552-2565: base shk actions on peacefulness at the
                   start of this hero move so "simultaneous" breakage isn't
                   drastically worse than single breakage. */
                const eshkp = ESHK(shkp);
                if ((game.hero_seq | 0) !== (eshkp.break_seq | 0))
                    eshkp.seq_peaceful = !!shkp.mpeaceful;
                if (((await dokick_stolen_value(obj, x | 0, y | 0, !!eshkp.seq_peaceful, false)) > 0)
                    && ((rooms[0] | 0) !== (game.u.ushops ? game.u.ushops.charCodeAt(0) : 0)
                        || !inside_shop(game.u.ux, game.u.uy))
                    && (game.hero_seq | 0) !== (eshkp.break_seq | 0))
                    await make_angry_shk(shkp, x, y);
                eshkp.break_seq = game.hero_seq | 0;
            }
        }
    }
    if (!fracture) await _delobj_useupf(obj);
    if (explosion) {
        /* UNAWAITED — same boundary as the POT_OIL arm above, same reason; see
           the async-boundary note above this function's header. */
        await explode(x, y, -11, d(3, 6), 0, EXPL_FIERY);
    }
    return true;
}

/* C ref: dothrow.c:589-602 */
export function endmultishot(verbose) {
    const g = game;
    g.gm = g.gm || {};
    g.gm.m_shot = g.gm.m_shot || { i: 0, n: 0, s: 0 };
    if (g.gm.m_shot.i < g.gm.m_shot.n) {
        if (verbose && !g.context.mon_moving) {
            You("stop " + (g.gm.m_shot.s ? "firing" : "throwing") +
                " after the " + g.gm.m_shot.i + ordin(g.gm.m_shot.i) + " " +
                (g.gm.m_shot.s ? "shot" : "toss") + ".");
        }
        g.gm.m_shot.n = g.gm.m_shot.i; /* make current shot be the last */
    }
}

/* Unported helper stubs for obj_delivery */
/* C dothrow.c:2445-2456 breaks(obj, x, y): announce and dispose of an object
 * that breaks for a non-hero reason.  The message and destruction bodies are
 * canonical cmd.js implementations; this wrapper supplies the missing
 * visibility/test sequencing. */
export async function breaks(otmp, nx, ny) {
    const blind = _Blind_dk();
    const inView = !blind && !!cansee(nx, ny);
    if (!breaktest(otmp)) return 0;
    await breakmsg(otmp, inView);
    return await breakobj(otmp, nx, ny, false, false) ? 1 : 0;
}
